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

export async function syncRepoCommits(repoId: string): Promise<number> {
  const repo = await prisma.gitHubRepo.findUnique({
    where: { id: repoId },
    include: { project: { include: { organization: { select: { githubToken: true } } } } },
  });

  if (!repo) throw new Error('Repositório não encontrado');

  const token = repo.project.organization?.githubToken;
  if (!token) throw new Error('Token GitHub não configurado na organização');

  const since = repo.lastSyncAt?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const commits: any[] = await githubFetch(
    `https://api.github.com/repos/${repo.repoFullName}/commits?since=${since}&per_page=100`,
    token
  );

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

    await prisma.gitCommit.create({
      data: {
        repoId: repo.id,
        projectId: repo.projectId,
        sha: commit.sha,
        message: commit.commit.message,
        aiSummary,
        filesChanged: commit.files?.length || 0,
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
        committedAt: new Date(commit.commit.committer.date),
      },
    });

    if (aiSummary) {
      const devMember = await prisma.projectMember.findFirst({
        where: { projectId: repo.projectId },
      });
      if (devMember) {
        await prisma.activityLog.create({
          data: {
            userId: devMember.userId,
            projectId: repo.projectId,
            description: aiSummary,
            type: 'AI_SUMMARY',
            date: new Date(commit.commit.committer.date),
          },
        });
      }
    }

    newCommits++;
  }

  await prisma.gitHubRepo.update({
    where: { id: repo.id },
    data: { lastSyncAt: new Date() },
  });

  return newCommits;
}
