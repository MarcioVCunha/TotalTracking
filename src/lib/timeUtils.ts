import { PlaySession } from '../types';

/**
 * Format total seconds into HH:MM:SS
 */
export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

/**
 * Format seconds into a human friendly string like "14h 22m" or "45m 12s"
 */
export function formatDurationHuman(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${sec}s`;
  }
  return `${sec}s`;
}

/**
 * Extract UTC Date key YYYY-MM-DD to avoid timezone skews (such as -03:00)
 */
export function toUtcDateKey(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate Unique Days Played from an array of sessions (in UTC)
 */
export function calculateUniqueDays(sessions: PlaySession[]): number {
  if (!sessions || sessions.length === 0) return 0;
  const uniqueKeys = new Set<string>();
  for (const s of sessions) {
    if (s.startedAt) {
      uniqueKeys.add(toUtcDateKey(s.startedAt));
    }
  }
  return uniqueKeys.size;
}

/**
 * Calculate Calendar Elapsed Days between start date and end date treating dates in UTC
 */
export function calculateCalendarDays(startDate: string | number, endDate?: string | number): number {
  if (!startDate) return 1;
  const startD = new Date(startDate);
  const endD = endDate ? new Date(endDate) : new Date();

  // Create UTC midnights
  const utcStart = Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth(), startD.getUTCDate());
  const utcEnd = Date.UTC(endD.getUTCFullYear(), endD.getUTCMonth(), endD.getUTCDate());

  const diffMs = Math.max(0, utcEnd - utcStart);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Calculate minutes per turn
 */
export function calculateMinutesPerTurn(totalSeconds: number, turns: number): number {
  if (!turns || turns <= 0) return 0;
  return Number(((totalSeconds / 60) / turns).toFixed(1));
}

/**
 * Determine the start date of the current active or unallocated campaign for a lord
 */
export function getCampaignStartDate(
  lordId: number,
  runs: { lordId: number; status: string; startDate?: string; endDate?: string; createdAt?: number }[],
  sessions: PlaySession[],
  activeSession: { lordId: number; startedAt: number } | null
): string {
  const targetId = Number(lordId);

  // 1. If an in_progress run exists, use its startDate
  const inProg = runs.find(r => Number(r.lordId) === targetId && r.status === 'in_progress');
  if (inProg?.startDate) {
    return inProg.startDate;
  }

  // 2. Find the last completed run for this lord
  const completedRuns = runs
    .filter(r => Number(r.lordId) === targetId && (r.status === 'victory' || r.status === 'defeat'))
    .sort((a, b) => {
      const timeA = new Date(a.endDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.endDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  const lastCutoffTime = completedRuns.length > 0
    ? new Date(completedRuns[0].endDate || completedRuns[0].createdAt || 0).getTime()
    : 0;

  // 3. Sessions strictly after the last completed run belong to this current campaign
  const currentSessions = sessions.filter(s => Number(s.lordId) === targetId && s.startedAt > lastCutoffTime);

  if (currentSessions.length > 0) {
    const earliestSessionStart = Math.min(...currentSessions.map(s => s.startedAt));
    return new Date(earliestSessionStart).toISOString();
  }

  // 4. Fallback to active session startedAt or now
  if (activeSession && Number(activeSession.lordId) === targetId) {
    return new Date(activeSession.startedAt).toISOString();
  }

  return new Date().toISOString();
}
