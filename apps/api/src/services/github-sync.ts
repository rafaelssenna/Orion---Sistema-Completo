import { prisma } from '../lib/prisma.js';
import { analyzeCommitDiff } from './gemini.js';

export async function githubFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function getOrgGitHubToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: { select: { githubToken: true } } },
  });

  const token = user?.organization?.githubToken;
  if (!token) {
    throw new Error('Token GitHub não configurado na organização');
  }
  return token;
}

export async function syncRepoCommits(repoId: string, fullSync = false): Promise<number> {
  const repo = await prisma.gitHubRepo.findUnique({
    where: { id: repoId },
    include: { project: { include: { organization: { select: { githubToken: true } } } } },
  });

  if (!repo) throw new Error('Repositório não encontrado');

  const token = repo.project.organization?.githubToken;
  if (!token) throw new Error('Token GitHub não configurado na organização');

  // Full sync: fetch ALL commits from the beginning. Normal sync: only since last sync.
  const sinceParam = fullSync
    ? ''
    : `since=${repo.lastSyncAt?.toISOString() || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()}&`;

  // Paginate through all commits
  let allCommits: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const commits: any[] = await githubFetch(
      `https://api.github.com/repos/${repo.repoFullName}/commits?${sinceParam}per_page=100&page=${page}`,
      token
    );
    allCommits = allCommits.concat(commits);
    hasMore = commits.length === 100;
    page++;
  }

  const commits = allCommits;

  // Pre-load project members with emails for author matching
  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: repo.projectId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  let newCommits = 0;

  for (const commit of commits) {
    const existing = await prisma.gitCommit.findUnique({ where: { sha: commit.sha } });
    if (existing) continue;

    let diff = '';
    try {
      const detail: any = await githubFetch(
        `https://api.github.com/repos/${repo.repoFullName}/commits/${commit.sha}`,
        token
      );
      diff = (detail.files || [])
        .map((f: any) => `${f.filename}: +${f.additions} -${f.deletions}\n${f.patch || ''}`)
        .join('\n\n');
    } catch {
      // Ignore diff fetch errors
    }

    const aiSummary = diff
      ? await analyzeCommitDiff(commit.commit.message, diff)
      : null;

    // Match commit author to Orion user by email
    const commitEmail = commit.commit.author?.email || commit.commit.committer?.email || '';
    const commitName = commit.commit.author?.name || commit.commit.committer?.name || '';
    const matchedMember = projectMembers.find(
      m => m.user.email.toLowerCase() === commitEmail.toLowerCase()
    );

    await prisma.gitCommit.create({
      data: {
        repoId: repo.id,
        projectId: repo.projectId,
        authorId: matchedMember?.user.id || null,
        sha: commit.sha,
        message: commit.commit.message,
        authorEmail: commitEmail || null,
        authorName: commitName || null,
        aiSummary,
        filesChanged: commit.files?.length || 0,
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
        committedAt: new Date(commit.commit.committer.date),
      },
    });

    // Attribute activity to matched dev, or fallback to first member
    const activityUserId = matchedMember?.user.id || projectMembers[0]?.userId;
    if (aiSummary && activityUserId) {
      await prisma.activityLog.create({
        data: {
          userId: activityUserId,
          projectId: repo.projectId,
          description: aiSummary,
          type: 'AI_SUMMARY',
          date: new Date(commit.commit.committer.date),
        },
      });
    }

    newCommits++;
  }

  await prisma.gitHubRepo.update({
    where: { id: repo.id },
    data: { lastSyncAt: new Date() },
  });

  return newCommits;
}
