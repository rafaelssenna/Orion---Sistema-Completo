import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

export const taskRouter = Router();

const createTaskSchema = z.object({
  projectId: z.string(),
  assigneeId: z.string().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional().default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  order: z.number().optional(),
});

// GET /api/tasks?projectId=xxx
taskRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId, status, assigneeId } = req.query;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    // DEVs only see tasks from their projects
    if (req.user!.role === 'DEV') {
      where.project = { members: { some: { userId: req.user!.id } } };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tasks
taskRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/tasks/:id
taskRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = updateTaskSchema.parse(req.body);

    // DEVs can only update their own tasks
    if (req.user!.role === 'DEV') {
      const task = await prisma.task.findUnique({ where: { id: req.params.id } });
      if (task && task.assigneeId !== req.user!.id) {
        res.status(403).json({ error: 'Você só pode editar suas próprias tarefas' });
        return;
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/tasks/reorder - Reorder tasks (for Kanban drag & drop)
taskRouter.put('/reorder/batch', authenticate, async (req, res) => {
  try {
    const { tasks } = req.body as { tasks: { id: string; status: string; order: number }[] };

    await prisma.$transaction(
      tasks.map(t =>
        prisma.task.update({
          where: { id: t.id },
          data: { status: t.status as any, order: t.order },
        })
      )
    );

    res.json({ message: 'Tarefas reordenadas' });
  } catch {
    res.status(500).json({ error: 'Erro ao reordenar tarefas' });
  }
});

// DELETE /api/tasks/:id
taskRouter.delete('/:id', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tarefa removida' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover tarefa' });
  }
});
