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

  // Pre-load project members - commits belong to the DEV member of the project
  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: repo.projectId },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });

  // Find the DEV member of this project (primary owner of commits)
  const devMember = projectMembers.find(m => m.user.role === 'DEV');
  const projectOwnerId = devMember?.user.id || projectMembers[0]?.userId || null;

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

    const commitEmail = commit.commit.author?.email || commit.commit.committer?.email || '';
    const commitName = commit.commit.author?.name || commit.commit.committer?.name || '';

    await prisma.gitCommit.create({
      data: {
        repoId: repo.id,
        projectId: repo.projectId,
        authorId: projectOwnerId,
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

    if (aiSummary && projectOwnerId) {
      await prisma.activityLog.create({
        data: {
          userId: projectOwnerId,
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
