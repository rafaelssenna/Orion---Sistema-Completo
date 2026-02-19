import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

// GET /api/dashboard/overview - Main dashboard for HEAD
dashboardRouter.get('/overview', authenticate, authorize('HEAD', 'ADMIN'), async (_req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all devs
    const devs = await prisma.user.findMany({
      where: { role: 'DEV' },
      select: { id: true, name: true, avatarUrl: true },
    });

    // Hours per dev this week (from activity logs)
    const hoursPerDev = await Promise.all(
      devs.map(async (dev) => {
        const logs = await prisma.activityLog.aggregate({
          where: { userId: dev.id, date: { gte: weekAgo } },
          _sum: { hoursSpent: true },
        });

        const commitCount = await prisma.gitCommit.count({
          where: {
            project: { members: { some: { userId: dev.id } } },
            committedAt: { gte: weekAgo },
          },
        });

        return {
          ...dev,
          hoursThisWeek: logs._sum.hoursSpent || 0,
          commitsThisWeek: commitCount,
        };
      })
    );

    // Projects summary
    const projects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { tasks: true, gitCommits: true } },
      },
    });

    const projectSummaries = await Promise.all(
      projects.map(async (project) => {
        const tasksTotal = await prisma.task.count({ where: { projectId: project.id } });
        const tasksDone = await prisma.task.count({ where: { projectId: project.id, status: 'DONE' } });

        const recentCommits = await prisma.gitCommit.findMany({
          where: { projectId: project.id },
          orderBy: { committedAt: 'desc' },
          take: 3,
          select: { sha: true, message: true, aiSummary: true, committedAt: true },
        });

        const lastActivity = await prisma.activityLog.findFirst({
          where: { projectId: project.id },
          orderBy: { createdAt: 'desc' },
          select: { description: true, createdAt: true, type: true },
        });

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          members: project.members.map(m => m.user),
          tasksTotal,
          tasksDone,
          progress: tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0,
          recentCommits,
          lastActivity,
        };
      })
    );

    // Recent activity feed
    const recentActivities = await prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Imbalance detection
    const maxHours = Math.max(...hoursPerDev.map(d => d.hoursThisWeek));
    const minHours = Math.min(...hoursPerDev.map(d => d.hoursThisWeek));
    const imbalanceRatio = minHours > 0 ? maxHours / minHours : maxHours > 0 ? Infinity : 1;

    const alerts: { type: string; message: string; severity: 'info' | 'warning' | 'critical' }[] = [];

    if (imbalanceRatio >= 2 && devs.length > 1) {
      const overloaded = hoursPerDev.find(d => d.hoursThisWeek === maxHours);
      const underloaded = hoursPerDev.find(d => d.hoursThisWeek === minHours);
      alerts.push({
        type: 'IMBALANCE',
        message: `${overloaded?.name} tem ${maxHours}h esta semana, ${underloaded?.name} tem ${minHours}h`,
        severity: imbalanceRatio >= 3 ? 'critical' : 'warning',
      });
    }

    // Check for inactive projects (no activity in 3 days)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    for (const project of projectSummaries) {
      if (!project.lastActivity || new Date(project.lastActivity.createdAt) < threeDaysAgo) {
        alerts.push({
          type: 'INACTIVE_PROJECT',
          message: `Projeto "${project.name}" sem atividade há mais de 3 dias`,
          severity: 'warning',
        });
      }
    }

    res.json({
      hoursPerDev,
      projects: projectSummaries,
      recentActivities,
      alerts,
      summary: {
        totalActiveProjects: projects.length,
        totalDevs: devs.length,
        totalHoursThisWeek: hoursPerDev.reduce((sum, d) => sum + d.hoursThisWeek, 0),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/dashboard/personal - Personal dashboard for any user
dashboardRouter.get('/personal', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // My projects
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId } }, status: 'ACTIVE' },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    // My tasks
    const myTasks = await prisma.task.findMany({
      where: { assigneeId: userId, status: { not: 'DONE' } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { priority: 'desc' },
    });

    // My hours this week
    const weeklyHours = await prisma.activityLog.aggregate({
      where: { userId, date: { gte: weekAgo } },
      _sum: { hoursSpent: true },
    });

    // My recent activities
    const recentActivities = await prisma.activityLog.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // My commits this week
    const myCommits = await prisma.gitCommit.findMany({
      where: {
        project: { members: { some: { userId } } },
        committedAt: { gte: weekAgo },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { committedAt: 'desc' },
      take: 10,
    });

    res.json({
      projects,
      tasks: myTasks,
      hoursThisWeek: weeklyHours._sum.hoursSpent || 0,
      recentActivities,
      recentCommits: myCommits,
    });
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/dashboard/hours-comparison?from=xxx&to=xxx
dashboardRouter.get('/hours-comparison', authenticate, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to as string) : new Date();

    const devs = await prisma.user.findMany({
      where: { role: 'DEV' },
      select: { id: true, name: true },
    });

    const comparison = await Promise.all(
      devs.map(async (dev) => {
        const hours = await prisma.activityLog.aggregate({
          where: { userId: dev.id, date: { gte: startDate, lte: endDate } },
          _sum: { hoursSpent: true },
        });

        // Hours per project
        const projectHours = await prisma.activityLog.groupBy({
          by: ['projectId'],
          where: { userId: dev.id, date: { gte: startDate, lte: endDate } },
          _sum: { hoursSpent: true },
        });

        const projectDetails = await Promise.all(
          projectHours.map(async (ph) => {
            const project = await prisma.project.findUnique({
              where: { id: ph.projectId },
              select: { name: true },
            });
            return { projectName: project?.name, hours: ph._sum.hoursSpent || 0 };
          })
        );

        return {
          dev,
          totalHours: hours._sum.hoursSpent || 0,
          projectBreakdown: projectDetails,
        };
      })
    );

    res.json(comparison);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
