export interface CommitForMetrics {
  sha: string;
  committedAt: Date;
  projectId: string;
  authorId: string | null;
  additions: number;
  deletions: number;
  filesChanged: number;
  message: string;
  aiSummary: string | null;
}

export interface WorkSession {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  commits: CommitForMetrics[];
  effortScore: number;
}

// ---- Session detection constants ----
const SESSION_GAP_MINUTES = 90;
const LEAD_TIME_MINUTES = 30;
const MAX_SESSION_MINUTES = 240;

// ---- Effort weight constants ----
// Base time for a solo commit with zero changes (e.g. merge commit, config tweak)
const SOLO_BASE_MINUTES = 15;
// How many lines of code change equal ~1 extra minute of work
const LINES_PER_MINUTE = 12;
// Extra minutes per file touched (context switching, finding the file, understanding it)
const MINUTES_PER_FILE = 3;
// Maximum estimate for a single solo commit (prevent outliers from giant refactors)
const MAX_SOLO_MINUTES = 120;
// Minimum estimate for any commit with real changes
const MIN_COMMIT_WITH_CHANGES_MINUTES = 20;

/**
 * Calculates the "effort weight" of a commit based on its actual changes.
 *
 * A commit that changes 300 lines across 8 files has WAY more effort
 * than a commit that fixes a typo in 1 file. This function quantifies that.
 *
 * Returns an effort score (in abstract "effort minutes"):
 * - Typo fix (2 lines, 1 file): ~18 min
 * - Small feature (50 lines, 3 files): ~28 min
 * - Medium feature (200 lines, 8 files): ~55 min
 * - Large feature (500 lines, 15 files): ~101 min
 */
export function commitEffortWeight(commit: CommitForMetrics): number {
  const totalLines = commit.additions + commit.deletions;
  const files = commit.filesChanged;

  // Base time + time for lines changed + time for files touched
  const rawMinutes = SOLO_BASE_MINUTES
    + (totalLines / LINES_PER_MINUTE)
    + (files * MINUTES_PER_FILE);

  // If the commit has real changes, ensure a minimum
  const hasChanges = totalLines > 0 || files > 0;
  const withMin = hasChanges
    ? Math.max(rawMinutes, MIN_COMMIT_WITH_CHANGES_MINUTES)
    : SOLO_BASE_MINUTES;

  return Math.min(Math.round(withMin), MAX_SOLO_MINUTES);
}

/**
 * Total effort score for a set of commits (sum of individual weights).
 * This is the PRIMARY metric for comparing effort across projects.
 */
export function totalEffortScore(commits: CommitForMetrics[]): number {
  return commits.reduce((sum, c) => sum + commitEffortWeight(c), 0);
}

// ---- Session detection (for timeline/session display) ----

export function detectWorkSessions(commits: CommitForMetrics[]): WorkSession[] {
  if (commits.length === 0) return [];

  const sorted = [...commits].sort(
    (a, b) => new Date(a.committedAt).getTime() - new Date(b.committedAt).getTime()
  );

  const sessions: WorkSession[] = [];
  let currentSession: CommitForMetrics[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].committedAt).getTime();
    const curr = new Date(sorted[i].committedAt).getTime();
    const gapMinutes = (curr - prev) / (1000 * 60);

    if (gapMinutes <= SESSION_GAP_MINUTES) {
      currentSession.push(sorted[i]);
    } else {
      sessions.push(buildSession(currentSession));
      currentSession = [sorted[i]];
    }
  }

  sessions.push(buildSession(currentSession));
  return sessions;
}

function buildSession(commits: CommitForMetrics[]): WorkSession {
  const effort = totalEffortScore(commits);

  if (commits.length === 1) {
    const soloMinutes = commitEffortWeight(commits[0]);
    return {
      startTime: new Date(new Date(commits[0].committedAt).getTime() - soloMinutes * 60 * 1000),
      endTime: new Date(commits[0].committedAt),
      durationMinutes: soloMinutes,
      commits,
      effortScore: effort,
    };
  }

  const first = new Date(commits[0].committedAt).getTime();
  const last = new Date(commits[commits.length - 1].committedAt).getTime();
  const spanMinutes = (last - first) / (1000 * 60) + LEAD_TIME_MINUTES;

  // Session duration: at least the time span, but boosted by effort if commits are heavy
  // (heavy commits imply more thinking/coding time between them)
  const effortBoost = Math.max(0, (effort - commits.length * SOLO_BASE_MINUTES) / commits.length);
  const duration = Math.min(spanMinutes + effortBoost * 0.3, MAX_SESSION_MINUTES);

  return {
    startTime: new Date(first - LEAD_TIME_MINUTES * 60 * 1000),
    endTime: new Date(last),
    durationMinutes: Math.round(duration),
    commits,
    effortScore: effort,
  };
}

/**
 * Estimate working minutes from commits using session detection.
 * Sessions with heavier commits get more time allocated.
 */
export function estimateMinutesFromCommits(commits: CommitForMetrics[]): number {
  const sessions = detectWorkSessions(commits);
  return sessions.reduce((total, s) => total + s.durationMinutes, 0);
}

// ---- Grouping utilities ----

export function groupCommitsByDay(commits: CommitForMetrics[]): Map<string, CommitForMetrics[]> {
  const map = new Map<string, CommitForMetrics[]>();
  for (const c of commits) {
    const day = new Date(c.committedAt).toISOString().split('T')[0];
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(c);
  }
  return map;
}

export function groupCommitsByProject(commits: CommitForMetrics[]): Map<string, CommitForMetrics[]> {
  const map = new Map<string, CommitForMetrics[]>();
  for (const c of commits) {
    if (!map.has(c.projectId)) map.set(c.projectId, []);
    map.get(c.projectId)!.push(c);
  }
  return map;
}

export function groupCommitsByAuthor(commits: CommitForMetrics[]): Map<string, CommitForMetrics[]> {
  const map = new Map<string, CommitForMetrics[]>();
  for (const c of commits) {
    const key = c.authorId || 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return map;
}
