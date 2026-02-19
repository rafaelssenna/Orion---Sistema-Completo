import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

// GET /api/dashboard/overview - Main dashboard for HEAD
dashboardRouter.get('/overview', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const orgFilter = currentUser?.organizationId ? { organizationId: currentUser.organizationId } : {};

    // Get all devs from same organization
    const devs = await prisma.user.findMany({
      where: { role: 'DEV', ...orgFilter },
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

    // Projects summary (same organization)
    const projects = await prisma.project.findMany({
      where: { status: 'ACTIVE', ...orgFilter },
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

// GET /api/dashboard/dev-productivity - Dev work analysis based on commits
dashboardRouter.get('/dev-productivity', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const orgFilter = currentUser?.organizationId ? { organizationId: currentUser.organizationId } : {};

    // Get all users from the org (DEV + ADMIN)
    const users = await prisma.user.findMany({
      where: { ...orgFilter, role: { in: ['DEV', 'ADMIN'] } },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const devStats = await Promise.all(
      users.map(async (user) => {
        // ALL commits ever by this user (matched by authorId or email)
        const allCommits = await prisma.gitCommit.findMany({
          where: {
            OR: [
              { authorId: user.id },
              { authorEmail: user.email },
            ],
          },
          select: {
            sha: true,
            committedAt: true,
            filesChanged: true,
            additions: true,
            deletions: true,
            projectId: true,
            message: true,
          },
          orderBy: { committedAt: 'asc' },
        });

        // Commits this week
        const commitsThisWeek = allCommits.filter(c => c.committedAt >= weekAgo);
        // Commits this month
        const commitsThisMonth = allCommits.filter(c => c.committedAt >= monthAgo);

        // Total lines changed
        const totalAdditions = allCommits.reduce((s, c) => s + c.additions, 0);
        const totalDeletions = allCommits.reduce((s, c) => s + c.deletions, 0);
        const totalFilesChanged = allCommits.reduce((s, c) => s + c.filesChanged, 0);

        // Commits per project
        const projectMap = new Map<string, number>();
        for (const c of allCommits) {
          projectMap.set(c.projectId, (projectMap.get(c.projectId) || 0) + 1);
        }

        const projectIds = Array.from(projectMap.keys());
        const projectNames = await prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true },
        });
        const nameMap = new Map(projectNames.map(p => [p.id, p.name]));

        const commitsByProject = Array.from(projectMap.entries())
          .map(([pid, count]) => ({ projectName: nameMap.get(pid) || 'Desconhecido', commits: count }))
          .sort((a, b) => b.commits - a.commits);

        // Work hours analysis (based on commit timestamps)
        const hourDistribution = new Array(24).fill(0);
        const dayDistribution = new Array(7).fill(0); // 0=Sun, 6=Sat
        const activeDays = new Set<string>();

        for (const c of allCommits) {
          const d = new Date(c.committedAt);
          hourDistribution[d.getUTCHours()]++;
          dayDistribution[d.getUTCDay()]++;
          activeDays.add(d.toISOString().split('T')[0]);
        }

        // Weekly commit history (last 12 weeks)
        const weeklyHistory: { week: string; commits: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const count = allCommits.filter(c => c.committedAt >= weekStart && c.committedAt < weekEnd).length;
          weeklyHistory.push({
            week: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            commits: count,
          });
        }

        // First and last commit timestamps
        const firstCommit = allCommits.length > 0 ? allCommits[0].committedAt : null;
        const lastCommit = allCommits.length > 0 ? allCommits[allCommits.length - 1].committedAt : null;

        return {
          user: { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
          totalCommits: allCommits.length,
          commitsThisWeek: commitsThisWeek.length,
          commitsThisMonth: commitsThisMonth.length,
          totalAdditions,
          totalDeletions,
          totalFilesChanged,
          activeDays: activeDays.size,
          commitsByProject,
          hourDistribution,
          dayDistribution,
          weeklyHistory,
          firstCommit,
          lastCommit,
        };
      })
    );

    // Sort by total commits desc
    devStats.sort((a, b) => b.totalCommits - a.totalCommits);

    res.json(devStats);
  } catch (error) {
    console.error('Dev productivity error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/dashboard/hours-comparison?from=xxx&to=xxx
dashboardRouter.get('/hours-comparison', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to as string) : new Date();

    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const orgFilter = currentUser?.organizationId ? { organizationId: currentUser.organizationId } : {};

    const devs = await prisma.user.findMany({
      where: { role: 'DEV', ...orgFilter },
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
