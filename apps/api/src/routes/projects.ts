import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { syncRepoCommits } from '../services/github-sync.js';
import { analyzeProjectState } from '../services/gemini.js';

export const projectRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  clientName: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  memberIds: z.array(z.string()).optional().default([]),
  repoFullName: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  clientName: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
});

// GET /api/projects
projectRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const orgFilter = currentUser?.organizationId ? { organizationId: currentUser.organizationId } : {};

    const where = req.user!.role === 'DEV'
      ? { ...orgFilter, members: { some: { userId: req.user!.id } } }
      : orgFilter;

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        },
        githubRepos: { select: { id: true, repoFullName: true, lastSyncAt: true } },
        _count: { select: { tasks: true, activityLogs: true, gitCommits: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/projects/:id
projectRouter.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        },
        tasks: { orderBy: { order: 'asc' } },
        githubRepos: true,
        _count: { select: { activityLogs: true, gitCommits: true, timeEntries: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Projeto não encontrado' });
      return;
    }

    res.json(project);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/projects (HEAD, ADMIN only)
projectRouter.post('/', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientName: data.clientName,
        priority: data.priority,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        organizationId: currentUser?.organizationId || undefined,
        members: {
          create: data.memberIds.map(userId => ({ userId, role: 'MEMBER' })),
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    // Auto-link GitHub repo if provided
    if (data.repoFullName) {
      try {
        const repo = await prisma.gitHubRepo.create({
          data: {
            projectId: project.id,
            repoFullName: data.repoFullName,
          },
        });
        // Trigger initial sync (fire-and-forget)
        syncRepoCommits(repo.id).catch(err => {
          console.error('Initial sync failed:', err);
        });
      } catch (err) {
        console.error('Failed to link repo:', err);
      }
    }

    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/projects/:id (HEAD, ADMIN only)
projectRouter.put('/:id', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    const data = updateProjectSchema.parse(req.body);

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
        deadline: data.deadline ? new Date(data.deadline) : data.deadline === null ? null : undefined,
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/projects/:id/members (HEAD, ADMIN only)
projectRouter.post('/:id/members', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { userId, role } = req.body;

    const member = await prisma.projectMember.create({
      data: { projectId: req.params.id, userId, role: role || 'MEMBER' },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    res.status(201).json(member);
  } catch {
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

// DELETE /api/projects/:id/members/:userId (HEAD, ADMIN only)
projectRouter.delete('/:id/members/:userId', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    await prisma.projectMember.deleteMany({
      where: { projectId: req.params.id, userId: req.params.userId },
    });

    res.json({ message: 'Membro removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover membro' });
  }
});

// GET /api/projects/:id/ai-summary - AI-powered project state analysis
projectRouter.get('/:id/ai-summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Projeto não encontrado' });
      return;
    }

    // Get ALL commits for this project (oldest first)
    const commits = await prisma.gitCommit.findMany({
      where: { projectId: project.id },
      orderBy: { committedAt: 'asc' },
      select: { message: true, authorName: true, aiSummary: true, committedAt: true },
    });

    // Get ALL activities for this project (oldest first)
    const activities = await prisma.activityLog.findMany({
      where: { projectId: project.id },
      include: { user: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });

    // Task counts
    const [tasksTotal, tasksDone, tasksInProgress] = await Promise.all([
      prisma.task.count({ where: { projectId: project.id } }),
      prisma.task.count({ where: { projectId: project.id, status: 'DONE' } }),
      prisma.task.count({ where: { projectId: project.id, status: 'IN_PROGRESS' } }),
    ]);

    const summary = await analyzeProjectState({
      projectName: project.name,
      commits: commits.map(c => ({
        message: c.message,
        authorName: c.authorName || 'Desconhecido',
        date: c.committedAt.toLocaleDateString('pt-BR'),
        aiSummary: c.aiSummary,
      })),
      activities: activities.map(a => ({
        description: a.description,
        type: a.type,
        userName: a.user?.name || 'Desconhecido',
        date: a.date.toLocaleDateString('pt-BR'),
      })),
      members: project.members.map(m => ({
        name: m.user.name,
        role: m.user.role,
      })),
      tasksTotal,
      tasksDone,
      tasksInProgress,
    });

    res.json({ summary, stats: { commits: commits.length, activities: activities.length, tasksTotal, tasksDone, tasksInProgress } });
  } catch (error) {
    console.error('AI summary error:', error);
    res.status(500).json({ error: 'Erro ao gerar análise do projeto' });
  }
});

// DELETE /api/projects/:id (HEAD only)
projectRouter.delete('/:id', authenticate, authorize('HEAD'), async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Projeto removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover projeto' });
  }
});
