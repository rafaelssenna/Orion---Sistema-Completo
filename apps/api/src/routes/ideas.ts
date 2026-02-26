import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const ideaRouter = Router();

const createIdeaSchema = z.object({
  title: z.string().min(3, 'Título precisa ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição precisa ter pelo menos 10 caracteres'),
  category: z.enum(['saas', 'feature', 'improvement', 'other']).default('saas'),
});

// GET /api/ideas - List all ideas from the organization
ideaRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Usuário sem organização' });
      return;
    }

    const sort = (req.query.sort as string) || 'recent';

    const ideas = await prisma.idea.findMany({
      where: { organizationId: user.organizationId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        ideaVotes: { select: { userId: true } },
        _count: { select: { ideaVotes: true } },
      },
      orderBy: sort === 'votes' ? { votes: 'desc' } : { createdAt: 'desc' },
    });

    const result = ideas.map(idea => ({
      ...idea,
      votes: idea._count.ideaVotes,
      hasVoted: idea.ideaVotes.some(v => v.userId === req.user!.id),
      ideaVotes: undefined,
      _count: undefined,
    }));

    res.json(result);
  } catch (error) {
    console.error('List ideas error:', error);
    res.status(500).json({ error: 'Erro ao listar ideias' });
  }
});

// POST /api/ideas - Create a new idea
ideaRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createIdeaSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Usuário sem organização' });
      return;
    }

    const idea = await prisma.idea.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        authorId: req.user!.id,
        organizationId: user.organizationId,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json({ ...idea, votes: 0, hasVoted: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create idea error:', error);
    res.status(500).json({ error: 'Erro ao criar ideia' });
  }
});

// POST /api/ideas/:id/vote - Toggle vote on an idea
ideaRouter.post('/:id/vote', authenticate, async (req: AuthRequest, res) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user!.id;

    const existing = await prisma.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId, userId } },
    });

    if (existing) {
      // Remove vote
      await prisma.ideaVote.delete({ where: { id: existing.id } });
      await prisma.idea.update({ where: { id: ideaId }, data: { votes: { decrement: 1 } } });
      res.json({ voted: false });
    } else {
      // Add vote
      await prisma.ideaVote.create({ data: { ideaId, userId } });
      await prisma.idea.update({ where: { id: ideaId }, data: { votes: { increment: 1 } } });
      res.json({ voted: true });
    }
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Erro ao votar' });
  }
});

// DELETE /api/ideas/:id - Delete an idea (author or HEAD/ADMIN)
ideaRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const idea = await prisma.idea.findUnique({ where: { id: req.params.id } });
    if (!idea) {
      res.status(404).json({ error: 'Ideia não encontrada' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isAuthor = idea.authorId === req.user!.id;
    const isAdmin = user?.role === 'HEAD' || user?.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      res.status(403).json({ error: 'Sem permissão para deletar esta ideia' });
      return;
    }

    await prisma.idea.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ideia removida' });
  } catch (error) {
    console.error('Delete idea error:', error);
    res.status(500).json({ error: 'Erro ao deletar ideia' });
  }
});
