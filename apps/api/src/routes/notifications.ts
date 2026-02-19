import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const notificationRouter = Router();

// GET /api/notifications
notificationRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/notifications/unread-count
notificationRouter.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });

    res.json({ count });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/notifications/:id/read
notificationRouter.put('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ message: 'Notificação marcada como lida' });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/notifications/read-all
notificationRouter.put('/read-all/batch', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'Todas notificações marcadas como lidas' });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
