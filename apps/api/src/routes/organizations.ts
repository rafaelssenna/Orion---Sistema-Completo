import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

export const organizationRouter = Router();

const createOrgSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
});

const addMemberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'DEV']).default('DEV'),
});

// POST /api/organizations - Head creates their organization
organizationRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createOrgSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if user already has an organization
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (existingUser?.organizationId) {
      res.status(400).json({ error: 'Você já pertence a uma organização' });
      return;
    }

    // Check slug availability
    const existingOrg = await prisma.organization.findUnique({ where: { slug: data.slug } });
    if (existingOrg) {
      res.status(400).json({ error: 'Este identificador já está em uso' });
      return;
    }

    // Create organization and link the head user
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        users: { connect: { id: userId } },
      },
    });

    // Make sure the creator is HEAD
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'HEAD' },
    });

    res.status(201).json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create org error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/organizations/mine - Get my organization
organizationRouter.get('/mine', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        organization: {
          include: {
            users: {
              select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });

    if (!user?.organization) {
      res.json(null);
      return;
    }

    // Never expose the raw token to the frontend
    const { githubToken, ...orgData } = user.organization as any;
    res.json({
      ...orgData,
      hasGithubToken: !!githubToken,
    });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/organizations/mine - Update organization (HEAD only)
organizationRouter.put('/mine', authenticate, authorize('HEAD'), async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Você não pertence a uma organização' });
      return;
    }

    const { name, logoUrl } = req.body;
    const updated = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(name && { name }),
        ...(logoUrl !== undefined && { logoUrl }),
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/organizations/members - Add member to organization (HEAD only)
organizationRouter.post('/members', authenticate, authorize('HEAD'), async (req: AuthRequest, res) => {
  try {
    const data = addMemberSchema.parse(req.body);

    const headUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!headUser?.organizationId) {
      res.status(400).json({ error: 'Você não pertence a uma organização' });
      return;
    }

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(400).json({ error: 'Email já cadastrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        organizationId: headUser.organizationId,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/organizations/github-token - Save GitHub token (HEAD only)
organizationRouter.put('/github-token', authenticate, authorize('HEAD'), async (req: AuthRequest, res) => {
  try {
    const { githubToken } = req.body;
    if (typeof githubToken !== 'string' || !githubToken.trim()) {
      res.status(400).json({ error: 'Token inválido' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Você não pertence a uma organização' });
      return;
    }

    // Validate token against GitHub
    try {
      const ghRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (!ghRes.ok) {
        res.status(400).json({ error: 'Token GitHub inválido ou sem permissões' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Não foi possível validar o token no GitHub' });
      return;
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { githubToken },
    });

    res.json({ message: 'Token GitHub salvo com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao salvar token GitHub' });
  }
});

// DELETE /api/organizations/members/:userId - Remove member (HEAD only)
organizationRouter.delete('/members/:userId', authenticate, authorize('HEAD'), async (req: AuthRequest, res) => {
  try {
    const headUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!headUser?.organizationId) {
      res.status(400).json({ error: 'Você não pertence a uma organização' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!targetUser || targetUser.organizationId !== headUser.organizationId) {
      res.status(404).json({ error: 'Membro não encontrado na organização' });
      return;
    }

    if (targetUser.id === headUser.id) {
      res.status(400).json({ error: 'Você não pode remover a si mesmo' });
      return;
    }

    await prisma.user.update({
      where: { id: req.params.userId },
      data: { organizationId: null },
    });

    res.json({ message: 'Membro removido da organização' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover membro' });
  }
});
