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
