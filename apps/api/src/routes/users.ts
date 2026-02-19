import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

export const userRouter = Router();

// GET /api/users - List users from same organization (HEAD/ADMIN only)
userRouter.get('/', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const where = currentUser?.organizationId
      ? { organizationId: currentUser.organizationId }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users/:id
userRouter.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true,
        projectMembers: {
          include: { project: { select: { id: true, name: true, status: true } } },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
