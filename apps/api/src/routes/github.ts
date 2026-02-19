import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { githubFetch, getOrgGitHubToken, syncRepoCommits } from '../services/github-sync.js';
import { analyzeCommitDiff } from '../services/gemini.js';

export const githubRouter = Router();

// GET /api/github/available-repos - List all repos from the org's GitHub account
githubRouter.get('/available-repos', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const token = await getOrgGitHubToken(req.user!.id);

    // Fetch all repos accessible to the token (paginated)
    let allRepos: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const repos: any[] = await githubFetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
        token
      );
      allRepos = allRepos.concat(repos);
      hasMore = repos.length === 100;
      page++;
    }

    // Get already connected repos to mark them
    const connectedRepos = await prisma.gitHubRepo.findMany({
      select: { repoFullName: true, projectId: true },
    });
    const connectedMap = new Map(connectedRepos.map(r => [r.repoFullName, r.projectId]));

    const result = allRepos.map((repo: any) => ({
      fullName: repo.full_name,
      name: repo.name,
      description: repo.description,
      private: repo.private,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
      language: repo.language,
      connectedProjectId: connectedMap.get(repo.full_name) || null,
    }));

    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('Token GitHub não configurado')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Available repos error:', error);
    res.status(500).json({ error: 'Erro ao buscar repositórios do GitHub' });
  }
});

// POST /api/github/connect-repo - Connect a GitHub repo to a project
const connectRepoSchema = z.object({
  projectId: z.string(),
  repoFullName: z.string().min(1, 'Nome do repositório é obrigatório (ex: org/repo)'),
});

githubRouter.post('/connect-repo', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = connectRepoSchema.parse(req.body);
    const token = await getOrgGitHubToken(req.user!.id);

    // Verify repo exists on GitHub
    try {
      await githubFetch(`https://api.github.com/repos/${data.repoFullName}`, token);
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

    // Trigger initial sync (fire-and-forget)
    syncRepoCommits(repo.id).catch(err => {
      console.error('Initial sync failed:', err);
    });

    res.status(201).json(repo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    if ((error as any).message?.includes('Token GitHub')) {
      res.status(400).json({ error: (error as any).message });
      return;
    }
    res.status(500).json({ error: 'Erro ao conectar repositório' });
  }
});

// POST /api/github/sync/:repoId - Sync commits from a repo
githubRouter.post('/sync/:repoId', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    const newCommits = await syncRepoCommits(req.params.repoId);
    res.json({ message: `${newCommits} novos commits sincronizados`, newCommits });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message || 'Erro ao sincronizar commits' });
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
        include: { project: { include: { organization: { select: { githubToken: true } } } } },
      });

      if (!repo) {
        res.status(200).json({ message: 'Repo not tracked' });
        return;
      }

      const token = repo.project.organization?.githubToken || '';

      // Pre-load project members for author matching
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId: repo.projectId },
        include: { user: { select: { id: true, email: true } } },
      });

      for (const commit of commits || []) {
        const existing = await prisma.gitCommit.findUnique({ where: { sha: commit.id } });
        if (existing) continue;

        // Fetch full commit details for diff
        let diff = '';
        if (token) {
          try {
            const detail: any = await githubFetch(
              `https://api.github.com/repos/${repoFullName}/commits/${commit.id}`,
              token
            );
            diff = (detail.files || [])
              .map((f: any) => `${f.filename}: +${f.additions} -${f.deletions}\n${f.patch || ''}`)
              .join('\n\n');
          } catch {
            // Ignore
          }
        }

        const aiSummary = diff
          ? await analyzeCommitDiff(commit.message, diff)
          : null;

        // Match commit author to Orion user
        const commitEmail = commit.author?.email || '';
        const commitName = commit.author?.name || '';
        const matchedMember = projectMembers.find(
          m => m.user.email.toLowerCase() === commitEmail.toLowerCase()
        );

        await prisma.gitCommit.create({
          data: {
            repoId: repo.id,
            projectId: repo.projectId,
            authorId: matchedMember?.user.id || null,
            sha: commit.id,
            message: commit.message,
            authorEmail: commitEmail || null,
            authorName: commitName || null,
            aiSummary,
            filesChanged: (commit.added?.length || 0) + (commit.modified?.length || 0) + (commit.removed?.length || 0),
            additions: 0,
            deletions: 0,
            committedAt: new Date(commit.timestamp),
          },
        });

        const activityUserId = matchedMember?.user.id || projectMembers[0]?.userId;
        if (aiSummary && activityUserId) {
          await prisma.activityLog.create({
            data: {
              userId: activityUserId,
              projectId: repo.projectId,
              description: aiSummary,
              type: 'AI_SUMMARY',
              date: new Date(commit.timestamp),
            },
          });
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
