import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import {
  CommitForMetrics,
  estimateMinutesFromCommits,
  groupCommitsByDay,
  groupCommitsByProject,
  groupCommitsByAuthor,
} from '../services/commit-metrics.js';

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

    // Check for inactive projects (no activity or commits in 3 days)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    for (const project of projectSummaries) {
      const lastActivityDate = project.lastActivity ? new Date(project.lastActivity.createdAt) : null;
      const lastCommitDate = project.recentCommits?.[0]?.committedAt ? new Date(project.recentCommits[0].committedAt) : null;
      const lastSignal = [lastActivityDate, lastCommitDate].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];

      if (!lastSignal || lastSignal < threeDaysAgo) {
        const daysSince = lastSignal ? Math.floor((now.getTime() - lastSignal.getTime()) / (1000 * 60 * 60 * 24)) : null;
        alerts.push({
          type: 'INACTIVE_PROJECT',
          message: `Projeto "${project.name}" sem atividade${daysSince ? ` há ${daysSince} dias` : ''}`,
          severity: daysSince && daysSince >= 5 ? 'critical' : 'warning',
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
        // Get projects where this user is a member
        const userProjects = await prisma.projectMember.findMany({
          where: { userId: user.id },
          select: { projectId: true },
        });
        const userProjectIds = userProjects.map(p => p.projectId);

        // ALL commits from projects where this user is a member
        const allCommits = await prisma.gitCommit.findMany({
          where: {
            projectId: { in: userProjectIds },
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

// GET /api/dashboard/strategic-metrics - Strategic metrics for HEAD/ADMIN
dashboardRouter.get('/strategic-metrics', authenticate, authorize('HEAD', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const orgFilter = currentUser?.organizationId ? { organizationId: currentUser.organizationId } : {};

    // Parse period
    const period = (req.query.period as string) || 'week';
    const now = new Date();
    let fromDate: Date;
    let label: string;

    if (period === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      label = 'Hoje';
    } else if (period === 'month') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      label = 'Último mês';
    } else {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = 'Última semana';
    }

    // Previous period for trend comparison
    const periodLength = now.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodLength);
    const prevTo = fromDate;

    // Fetch all active projects
    const projects = await prisma.project.findMany({
      where: { ...orgFilter, status: 'ACTIVE' },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } } },
      },
    });

    // Fetch ALL commits in period for org projects
    const projectIds = projects.map(p => p.id);
    const commitsRaw = await prisma.gitCommit.findMany({
      where: {
        projectId: { in: projectIds },
        committedAt: { gte: fromDate, lte: now },
      },
      select: {
        sha: true, committedAt: true, projectId: true, authorId: true,
        additions: true, deletions: true, filesChanged: true,
        message: true, aiSummary: true,
      },
      orderBy: { committedAt: 'asc' },
    });
    const commits: CommitForMetrics[] = commitsRaw;

    // Previous period commits (for trends)
    const prevCommitsRaw = await prisma.gitCommit.findMany({
      where: {
        projectId: { in: projectIds },
        committedAt: { gte: prevFrom, lte: prevTo },
      },
      select: { projectId: true, sha: true, committedAt: true, authorId: true, additions: true, deletions: true, filesChanged: true, message: true, aiSummary: true },
    });

    // All-time commits for stalled projects
    const allTimeLastCommits = await prisma.gitCommit.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds } },
      _max: { committedAt: true },
      _count: { sha: true },
    });
    const allTimeMap = new Map(allTimeLastCommits.map(c => [c.projectId, { lastCommit: c._max.committedAt, total: c._count.sha }]));

    // Group commits
    const commitsByProject = groupCommitsByProject(commits);
    const prevCommitsByProject = groupCommitsByProject(prevCommitsRaw);
    const totalEstimatedMinutes = estimateMinutesFromCommits(commits);

    // ---- SECTION 1: Project Effort ----
    const projectEffort = projects.map(project => {
      const pCommits = commitsByProject.get(project.id) || [];
      const estimatedMinutes = estimateMinutesFromCommits(pCommits);
      const totalAdditions = pCommits.reduce((s, c) => s + c.additions, 0);
      const totalDeletions = pCommits.reduce((s, c) => s + c.deletions, 0);
      const totalFilesChanged = pCommits.reduce((s, c) => s + c.filesChanged, 0);

      const byDay = groupCommitsByDay(pCommits);
      const dailyBreakdown = Array.from(byDay.entries())
        .map(([date, dayCommits]) => ({
          date,
          commits: dayCommits.length,
          estimatedMinutes: estimateMinutesFromCommits(dayCommits),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const allTimeInfo = allTimeMap.get(project.id);
      const lastCommitAt = allTimeInfo?.lastCommit || null;
      const daysSinceLastCommit = lastCommitAt
        ? Math.floor((now.getTime() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      return {
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
        projectPriority: project.priority,
        members: project.members.map(m => ({ id: m.user.id, name: m.user.name })),
        totalCommits: pCommits.length,
        totalAdditions,
        totalDeletions,
        totalFilesChanged,
        estimatedMinutes,
        estimatedHours: Math.round((estimatedMinutes / 60) * 10) / 10,
        percentageOfTotal: totalEstimatedMinutes > 0
          ? Math.round((estimatedMinutes / totalEstimatedMinutes) * 100)
          : 0,
        dailyBreakdown,
        lastCommitAt: lastCommitAt?.toISOString() || null,
        daysSinceLastCommit,
      };
    }).sort((a, b) => b.totalCommits - a.totalCommits);

    // ---- SECTION 2: Dev Time Distribution ----
    const devs = await prisma.user.findMany({
      where: { ...orgFilter, role: { in: ['DEV', 'ADMIN'] } },
      select: { id: true, name: true, role: true, avatarUrl: true },
    });

    const devTimeDistribution = devs.map(dev => {
      // Get projects where this dev is a member
      const devProjectIds = projects
        .filter(p => p.members.some(m => m.user.id === dev.id))
        .map(p => p.id);

      const devCommits = commits.filter(c => devProjectIds.includes(c.projectId));
      const totalMinutes = estimateMinutesFromCommits(devCommits);

      // Per-project breakdown
      const devByProject = groupCommitsByProject(devCommits);
      const projectBreakdown = Array.from(devByProject.entries())
        .map(([pid, pCommits]) => {
          const project = projects.find(p => p.id === pid);
          const mins = estimateMinutesFromCommits(pCommits);
          return {
            projectId: pid,
            projectName: project?.name || 'Desconhecido',
            commits: pCommits.length,
            estimatedMinutes: mins,
            percentage: totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0,
          };
        })
        .sort((a, b) => b.commits - a.commits);

      // Daily breakdown
      const devByDay = groupCommitsByDay(devCommits);
      const dailyBreakdown = Array.from(devByDay.entries())
        .map(([date, dayCommits]) => {
          const dayByProject = groupCommitsByProject(dayCommits);
          return {
            date,
            commits: dayCommits.length,
            estimatedMinutes: estimateMinutesFromCommits(dayCommits),
            projects: Array.from(dayByProject.entries()).map(([pid, pc]) => ({
              projectName: projects.find(p => p.id === pid)?.name || 'Desconhecido',
              commits: pc.length,
            })),
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        user: { id: dev.id, name: dev.name, role: dev.role, avatarUrl: dev.avatarUrl },
        totalCommits: devCommits.length,
        totalEstimatedMinutes: totalMinutes,
        totalEstimatedHours: Math.round((totalMinutes / 60) * 10) / 10,
        projectBreakdown,
        dailyBreakdown,
      };
    });

    // ---- SECTION 3: Stalled Projects ----
    const stalledProjects = [];
    for (const project of projects) {
      const allTimeInfo = allTimeMap.get(project.id);
      const lastCommitDate = allTimeInfo?.lastCommit;
      const daysSince = lastCommitDate
        ? Math.floor((now.getTime() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSince < 3) continue;

      // Get last commit details
      const lastCommit = await prisma.gitCommit.findFirst({
        where: { projectId: project.id },
        orderBy: { committedAt: 'desc' },
        select: { sha: true, message: true, aiSummary: true, committedAt: true, authorName: true },
      });

      // Get last activity
      const lastActivity = await prisma.activityLog.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      });

      // Trend: compare current vs previous period commits
      const currCount = (commitsByProject.get(project.id) || []).length;
      const prevCount = (prevCommitsByProject.get(project.id) || []).length;
      let commitTrend: 'declining' | 'stable' | 'none' = 'none';
      if (prevCount > 0 && currCount < prevCount * 0.5) commitTrend = 'declining';
      else if (prevCount > 0) commitTrend = 'stable';

      stalledProjects.push({
        projectId: project.id,
        projectName: project.name,
        projectPriority: project.priority,
        daysSinceLastCommit: daysSince,
        lastCommit: lastCommit ? {
          sha: lastCommit.sha,
          message: lastCommit.message,
          aiSummary: lastCommit.aiSummary,
          committedAt: lastCommit.committedAt.toISOString(),
          authorName: lastCommit.authorName,
        } : null,
        lastActivity: lastActivity ? {
          description: lastActivity.description,
          type: lastActivity.type,
          createdAt: lastActivity.createdAt.toISOString(),
          userName: lastActivity.user.name,
        } : null,
        assignedDevs: project.members
          .filter(m => m.user.role === 'DEV')
          .map(m => ({ id: m.user.id, name: m.user.name })),
        totalCommitsAllTime: allTimeInfo?.total || 0,
        commitTrend,
        severity: (daysSince >= 5 ? 'critical' : 'warning') as 'critical' | 'warning',
      });
    }
    stalledProjects.sort((a, b) => b.daysSinceLastCommit - a.daysSinceLastCommit);

    // ---- SECTION 4: Insights ----
    const insights: { type: string; message: string; severity: 'info' | 'warning' | 'critical'; relatedProjectId?: string; relatedUserId?: string }[] = [];

    // Low activity per project (today vs daily average)
    const totalDays = Math.max(1, Math.ceil((now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
    for (const pe of projectEffort) {
      if (pe.totalCommits === 0 && pe.daysSinceLastCommit > 0 && pe.daysSinceLastCommit < 999) continue; // handled by stalled
      const avgPerDay = pe.totalCommits / totalDays;
      const todayStr = now.toISOString().split('T')[0];
      const todayCommits = pe.dailyBreakdown.find(d => d.date === todayStr)?.commits || 0;
      if (avgPerDay > 1 && todayCommits < avgPerDay * 0.3 && period !== 'today') {
        insights.push({
          type: 'low_activity',
          message: `Projeto "${pe.projectName}" teve pouca atividade hoje (${todayCommits} commits vs. média de ${Math.round(avgPerDay)}/dia)`,
          severity: 'warning',
          relatedProjectId: pe.projectId,
        });
      }
    }

    // Concentration: dev >80% on 1 project when assigned to multiple
    for (const dev of devTimeDistribution) {
      if (dev.projectBreakdown.length > 1) {
        const top = dev.projectBreakdown[0];
        if (top && top.percentage >= 80) {
          insights.push({
            type: 'concentration',
            message: `${dev.user.name} concentrou ${top.percentage}% do esforço em "${top.projectName}"`,
            severity: 'info',
            relatedUserId: dev.user.id,
          });
        }
      }
    }

    // Imbalance between devs
    const devHours = devTimeDistribution.filter(d => d.totalEstimatedHours > 0);
    if (devHours.length >= 2) {
      const maxDev = devHours.reduce((a, b) => a.totalEstimatedHours > b.totalEstimatedHours ? a : b);
      const minDev = devHours.reduce((a, b) => a.totalEstimatedHours < b.totalEstimatedHours ? a : b);
      if (minDev.totalEstimatedHours > 0) {
        const ratio = maxDev.totalEstimatedHours / minDev.totalEstimatedHours;
        if (ratio >= 2) {
          insights.push({
            type: 'imbalance',
            message: `${maxDev.user.name} tem ~${maxDev.totalEstimatedHours}h estimadas vs. ${minDev.user.name} com ~${minDev.totalEstimatedHours}h`,
            severity: ratio >= 3 ? 'critical' : 'warning',
          });
        }
      }
    }

    // Trending up/down per project
    for (const project of projects) {
      const curr = (commitsByProject.get(project.id) || []).length;
      const prev = (prevCommitsByProject.get(project.id) || []).length;
      if (prev >= 3 && curr < prev * 0.5) {
        insights.push({
          type: 'trending_down',
          message: `Projeto "${project.name}" caiu de ${prev} para ${curr} commits comparado ao período anterior`,
          severity: 'warning',
          relatedProjectId: project.id,
        });
      } else if (prev >= 2 && curr > prev * 1.5) {
        insights.push({
          type: 'trending_up',
          message: `Projeto "${project.name}" subiu de ${prev} para ${curr} commits comparado ao período anterior`,
          severity: 'info',
          relatedProjectId: project.id,
        });
      }
    }

    // ---- SECTION 5: Totals ----
    const avgCommitsPerDay = totalDays > 0 ? Math.round((commits.length / totalDays) * 10) / 10 : 0;
    const mostActive = projectEffort.length > 0 ? projectEffort[0] : null;
    const leastActive = projectEffort.length > 0 ? projectEffort[projectEffort.length - 1] : null;

    res.json({
      period: { from: fromDate.toISOString(), to: now.toISOString(), label },
      projectEffort,
      devTimeDistribution,
      stalledProjects,
      insights,
      totals: {
        totalCommits: commits.length,
        totalEstimatedHours: Math.round((totalEstimatedMinutes / 60) * 10) / 10,
        totalProjects: projects.length,
        averageCommitsPerDay: avgCommitsPerDay,
        mostActiveProject: mostActive ? { name: mostActive.projectName, commits: mostActive.totalCommits } : null,
        leastActiveProject: leastActive ? { name: leastActive.projectName, commits: leastActive.totalCommits, daysSinceLastCommit: leastActive.daysSinceLastCommit } : null,
      },
    });
  } catch (error) {
    console.error('Strategic metrics error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
