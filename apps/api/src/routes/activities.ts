import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const activityRouter = Router();

const createActivitySchema = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  type: z.enum(['UPDATE', 'NOTE', 'BLOCKER', 'DELIVERY', 'AI_SUMMARY']).optional().default('UPDATE'),
  hoursSpent: z.number().min(0).optional(),
  date: z.string().datetime().optional(),
});

// GET /api/activities?projectId=xxx&userId=xxx
activityRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId, userId, limit } = req.query;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;

    // DEVs only see activities from their projects
    if (req.user!.role === 'DEV') {
      where.project = { members: { some: { userId: req.user!.id } } };
    }

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
    });

    res.json(activities);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/activities
activityRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createActivitySchema.parse(req.body);

    const activity = await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: data.projectId,
        taskId: data.taskId,
        description: data.description,
        type: data.type,
        hoursSpent: data.hoursSpent,
        date: data.date ? new Date(data.date) : new Date(),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/activities/:id
activityRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const activity = await prisma.activityLog.findUnique({ where: { id: req.params.id } });

    if (!activity) {
      res.status(404).json({ error: 'Atividade não encontrada' });
      return;
    }

    // DEVs can only delete their own activities
    if (req.user!.role === 'DEV' && activity.userId !== req.user!.id) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }

    await prisma.activityLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Atividade removida' });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
