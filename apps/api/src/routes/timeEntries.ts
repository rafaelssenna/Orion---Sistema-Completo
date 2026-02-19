import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const timeEntryRouter = Router();

const createTimeEntrySchema = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  duration: z.number().min(0).optional(), // minutes
  description: z.string().optional(),
});

// GET /api/time-entries?projectId=xxx&userId=xxx&from=xxx&to=xxx
timeEntryRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId, userId, from, to } = req.query;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from as string);
      if (to) where.startTime.lte = new Date(to as string);
    }

    // DEVs only see their own entries
    if (req.user!.role === 'DEV') {
      where.userId = req.user!.id;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/time-entries
timeEntryRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createTimeEntrySchema.parse(req.body);

    let duration = data.duration;
    if (!duration && data.endTime) {
      duration = Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000);
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.user!.id,
        projectId: data.projectId,
        taskId: data.taskId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        duration,
        description: data.description,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/time-entries/:id (stop timer / update)
timeEntryRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.userId !== req.user!.id) {
      res.status(404).json({ error: 'Entrada não encontrada' });
      return;
    }

    const { endTime, description } = req.body;
    let duration = entry.duration;
    if (endTime) {
      duration = Math.round((new Date(endTime).getTime() - entry.startTime.getTime()) / 60000);
    }

    const updated = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: {
        endTime: endTime ? new Date(endTime) : undefined,
        duration,
        description: description ?? undefined,
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/time-entries/:id
timeEntryRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) {
      res.status(404).json({ error: 'Entrada não encontrada' });
      return;
    }
    if (req.user!.role === 'DEV' && entry.userId !== req.user!.id) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }

    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Entrada removida' });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
