import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { analyzeCommitDiff } from '../services/gemini.js';

export const githubRouter = Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

async function githubFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// POST /api/github/connect-repo - Connect a GitHub repo to a project
const connectRepoSchema = z.object({
  projectId: z.string(),
  repoFullName: z.string().min(1, 'Nome do repositório é obrigatório (ex: org/repo)'),
});

githubRouter.post('/connect-repo', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    const data = connectRepoSchema.parse(req.body);

    // Verify repo exists on GitHub
    try {
      await githubFetch(`https://api.github.com/repos/${data.repoFullName}`);
    } catch {
      res.status(400).json({ error: 'Repositório não encontrado no GitHub' });
      return;
    }

    const repo = await prisma.gitHubRepo.create({
      data: {
        projectId: data.projectId,
        repoFullName: data.repoFullName,
      },
    });

    res.status(201).json(repo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao conectar repositório' });
  }
});

// POST /api/github/sync/:repoId - Sync commits from a repo
githubRouter.post('/sync/:repoId', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    const repo = await prisma.gitHubRepo.findUnique({
      where: { id: req.params.repoId },
      include: { project: true },
    });

    if (!repo) {
      res.status(404).json({ error: 'Repositório não encontrado' });
      return;
    }

    // Fetch recent commits
    const since = repo.lastSyncAt?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const commits: any[] = await githubFetch(
      `https://api.github.com/repos/${repo.repoFullName}/commits?since=${since}&per_page=100`
    );

    let newCommits = 0;

    for (const commit of commits) {
      // Check if commit already exists
      const existing = await prisma.gitCommit.findUnique({ where: { sha: commit.sha } });
      if (existing) continue;

      // Fetch commit details (diff)
      let diff = '';
      try {
        const detail: any = await githubFetch(
          `https://api.github.com/repos/${repo.repoFullName}/commits/${commit.sha}`
        );
        diff = (detail.files || [])
          .map((f: any) => `${f.filename}: +${f.additions} -${f.deletions}\n${f.patch || ''}`)
          .join('\n\n');
      } catch {
        // Ignore diff fetch errors
      }

      // Analyze with Gemini AI
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

      // Create an activity log entry with the AI summary
      if (aiSummary) {
        const projectMembers = await prisma.projectMember.findMany({
          where: { projectId: repo.projectId },
          select: { userId: true },
        });

        // Attribute to the first dev member of the project
        const devMember = projectMembers[0];
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

    // Update last sync timestamp
    await prisma.gitHubRepo.update({
      where: { id: repo.id },
      data: { lastSyncAt: new Date() },
    });

    res.json({ message: `${newCommits} novos commits sincronizados`, newCommits });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar commits' });
  }
});

// GET /api/github/commits/:projectId - Get commits for a project
githubRouter.get('/commits/:projectId', authenticate, async (req, res) => {
  try {
    const commits = await prisma.gitCommit.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { committedAt: 'desc' },
      take: 50,
    });

    res.json(commits);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/github/repos/:projectId - Get repos for a project
githubRouter.get('/repos/:projectId', authenticate, async (req, res) => {
  try {
    const repos = await prisma.gitHubRepo.findMany({
      where: { projectId: req.params.projectId },
    });

    res.json(repos);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/github/webhook - GitHub webhook endpoint
githubRouter.post('/webhook', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];

    if (event === 'push') {
      const { repository, commits } = req.body;
      const repoFullName = repository.full_name;

      const repo = await prisma.gitHubRepo.findUnique({
        where: { repoFullName },
      });

      if (!repo) {
        res.status(200).json({ message: 'Repo not tracked' });
        return;
      }

      for (const commit of commits || []) {
        const existing = await prisma.gitCommit.findUnique({ where: { sha: commit.id } });
        if (existing) continue;

        // Fetch full commit details for diff
        let diff = '';
        try {
          const detail: any = await githubFetch(
            `https://api.github.com/repos/${repoFullName}/commits/${commit.id}`
          );
          diff = (detail.files || [])
            .map((f: any) => `${f.filename}: +${f.additions} -${f.deletions}\n${f.patch || ''}`)
            .join('\n\n');
        } catch {
          // Ignore
        }

        const aiSummary = diff
          ? await analyzeCommitDiff(commit.message, diff)
          : null;

        await prisma.gitCommit.create({
          data: {
            repoId: repo.id,
            projectId: repo.projectId,
            sha: commit.id,
            message: commit.message,
            aiSummary,
            filesChanged: (commit.added?.length || 0) + (commit.modified?.length || 0) + (commit.removed?.length || 0),
            additions: 0,
            deletions: 0,
            committedAt: new Date(commit.timestamp),
          },
        });

        // Create AI activity log
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
                date: new Date(commit.timestamp),
              },
            });
          }
        }
      }

      await prisma.gitHubRepo.update({
        where: { id: repo.id },
        data: { lastSyncAt: new Date() },
      });
    }

    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});
