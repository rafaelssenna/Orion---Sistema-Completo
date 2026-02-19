import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateClient, generateClientToken, ClientRequest } from '../middleware/client-auth.js';

export const portalRouter = Router();

// Keywords for categorizing AI summaries
const FEATURE_KEYWORDS = ['implementa', 'adicion', 'cri', 'novo', 'nova', 'desenvolv', 'integr', 'funcionalidade', 'módulo', 'tela', 'página', 'sistema', 'add', 'implement', 'creat', 'feature', 'built'];
const FIX_KEYWORDS = ['correc', 'corrig', 'fix', 'bug', 'erro', 'resolv', 'ajust', 'repara'];
const IMPROVEMENT_KEYWORDS = ['refator', 'melhor', 'otimiz', 'atualiz', 'reorganiz', 'limpeza', 'simplific', 'refactor', 'improv', 'optim', 'updat', 'upgrad', 'migra'];

function categorize(summary: string): 'feature' | 'improvement' | 'fix' {
  const lower = summary.toLowerCase();
  if (FIX_KEYWORDS.some(k => lower.includes(k))) return 'fix';
  if (IMPROVEMENT_KEYWORDS.some(k => lower.includes(k))) return 'improvement';
  return 'feature'; // default: treat as feature (favors the company)
}

// GET /api/portal/access/:token - Validate magic link and return session JWT
portalRouter.get('/access/:token', async (req, res) => {
  try {
    const access = await prisma.clientProjectAccess.findUnique({
      where: { accessToken: req.params.token },
      include: {
        client: true,
        project: { select: { id: true, name: true, description: true, status: true, organization: { select: { name: true } } } },
      },
    });

    if (!access || !access.isActive) {
      res.status(404).json({ error: 'Link inválido ou expirado' });
      return;
    }

    const token = generateClientToken(access.clientId, access.projectId);

    res.json({
      token,
      project: {
        name: access.project.name,
        description: access.project.description,
        status: access.project.status,
      },
      client: {
        name: access.client.name,
      },
      orgName: access.project.organization?.name || 'Helsen Service',
    });
  } catch (error) {
    console.error('Portal access error:', error);
    res.status(500).json({ error: 'Erro ao acessar portal' });
  }
});

// GET /api/portal/project - Get project data for client portal
portalRouter.get('/project', authenticateClient, async (req: ClientRequest, res) => {
  try {
    const { projectId } = req.client!;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        description: true,
        status: true,
        organization: { select: { name: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Projeto não encontrado' });
      return;
    }

    // Get all commits with AI summaries (ordered by date, but we DON'T expose dates)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const commits = await prisma.gitCommit.findMany({
      where: {
        projectId,
        aiSummary: { not: null },
      },
      select: {
        aiSummary: true,
        committedAt: true, // only for ordering, NOT returned to client
      },
      orderBy: { committedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCommits = await prisma.gitCommit.count({
      where: { projectId, aiSummary: { not: null } },
    });

    // Categorize each summary
    const activities = commits.map(c => {
      const description = c.aiSummary!;
      return {
        description,
        category: categorize(description),
      };
    });

    // Count stats from ALL commits (not just paginated)
    const allSummaries = await prisma.gitCommit.findMany({
      where: { projectId, aiSummary: { not: null } },
      select: { aiSummary: true },
    });

    let features = 0;
    let improvements = 0;
    let fixes = 0;
    for (const s of allSummaries) {
      const cat = categorize(s.aiSummary!);
      if (cat === 'feature') features++;
      else if (cat === 'improvement') improvements++;
      else fixes++;
    }

    // Status label
    const statusLabels: Record<string, string> = {
      ACTIVE: 'Em Desenvolvimento Ativo',
      PAUSED: 'Em Planejamento',
      COMPLETED: 'Finalizado',
    };

    res.json({
      project: {
        name: project.name,
        description: project.description,
        status: project.status,
      },
      statusLabel: statusLabels[project.status] || 'Em Desenvolvimento',
      stats: { features, improvements, fixes },
      activities,
      totalActivities: totalCommits,
      page,
      totalPages: Math.ceil(totalCommits / limit),
      orgName: project.organization?.name || 'Helsen Service',
    });
  } catch (error) {
    console.error('Portal project error:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do projeto' });
  }
});
