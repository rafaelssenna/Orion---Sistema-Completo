import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

export const projectRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  clientName: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  memberIds: z.array(z.string()).optional().default([]),
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
    const where = req.user!.role === 'DEV'
      ? { members: { some: { userId: req.user!.id } } }
      : {};

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        },
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

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientName: data.clientName,
        priority: data.priority,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
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

// DELETE /api/projects/:id (HEAD only)
projectRouter.delete('/:id', authenticate, authorize('HEAD'), async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Projeto removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover projeto' });
  }
});
