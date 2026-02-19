import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

export const clientRouter = Router();

// GET /api/clients - List all clients for the organization
clientRouter.get('/', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Sem organização' });
      return;
    }

    const clients = await prisma.client.findMany({
      where: { organizationId: user.organizationId },
      include: {
        projectAccess: {
          include: { project: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(clients);
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// POST /api/clients - Create a new client
const createClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email().optional().or(z.literal('')),
  companyName: z.string().optional(),
});

clientRouter.post('/', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const data = createClientSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Sem organização' });
      return;
    }

    const client = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email || null,
        companyName: data.companyName || null,
        organizationId: user.organizationId,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// DELETE /api/clients/:id - Delete a client
clientRouter.delete('/:id', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Cliente removido' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Erro ao remover cliente' });
  }
});

// POST /api/clients/:id/access - Generate access link for a project
const accessSchema = z.object({
  projectId: z.string().min(1, 'Projeto é obrigatório'),
});

clientRouter.post('/:id/access', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { projectId } = accessSchema.parse(req.body);

    // Check if access already exists
    const existing = await prisma.clientProjectAccess.findUnique({
      where: { clientId_projectId: { clientId: req.params.id, projectId } },
    });

    if (existing) {
      // Regenerate token
      const updated = await prisma.clientProjectAccess.update({
        where: { id: existing.id },
        data: { accessToken: randomUUID(), isActive: true },
      });
      res.json(updated);
      return;
    }

    const access = await prisma.clientProjectAccess.create({
      data: {
        clientId: req.params.id,
        projectId,
        accessToken: randomUUID(),
      },
    });

    res.status(201).json(access);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create access error:', error);
    res.status(500).json({ error: 'Erro ao gerar acesso' });
  }
});

// DELETE /api/clients/access/:accessId - Revoke access
clientRouter.delete('/access/:accessId', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.clientProjectAccess.update({
      where: { id: req.params.accessId },
      data: { isActive: false },
    });
    res.json({ message: 'Acesso revogado' });
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({ error: 'Erro ao revogar acesso' });
  }
});
