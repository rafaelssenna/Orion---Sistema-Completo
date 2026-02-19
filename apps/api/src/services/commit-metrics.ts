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
}

const SESSION_GAP_MINUTES = 90;
const LEAD_TIME_MINUTES = 30;
const SOLO_COMMIT_MINUTES = 45;
const MAX_SESSION_MINUTES = 240;

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
  if (commits.length === 1) {
    return {
      startTime: new Date(new Date(commits[0].committedAt).getTime() - SOLO_COMMIT_MINUTES * 60 * 1000),
      endTime: new Date(commits[0].committedAt),
      durationMinutes: SOLO_COMMIT_MINUTES,
      commits,
    };
  }

  const first = new Date(commits[0].committedAt).getTime();
  const last = new Date(commits[commits.length - 1].committedAt).getTime();
  const spanMinutes = (last - first) / (1000 * 60) + LEAD_TIME_MINUTES;
  const duration = Math.min(spanMinutes, MAX_SESSION_MINUTES);

  return {
    startTime: new Date(first - LEAD_TIME_MINUTES * 60 * 1000),
    endTime: new Date(last),
    durationMinutes: Math.round(duration),
    commits,
  };
}

export function estimateMinutesFromCommits(commits: CommitForMetrics[]): number {
  const sessions = detectWorkSessions(commits);
  return sessions.reduce((total, s) => total + s.durationMinutes, 0);
}

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
