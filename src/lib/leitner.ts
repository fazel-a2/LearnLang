export type Word = { word: string; meaning: string; roman: string };

export type CardState = { box: number; due: number };

export type DeckState = Record<string, CardState>;

export const BOXES = [
  { short: '1m', label: '1 min', ms: 60_000 },
  { short: '3m', label: '3 min', ms: 3 * 60_000 },
  { short: '10m', label: '10 min', ms: 10 * 60_000 },
  { short: '1h', label: '1 hour', ms: 60 * 60_000 },
  { short: '1d', label: '1 day', ms: 24 * 60 * 60_000 },
  { short: '1w', label: '1 week', ms: 7 * 24 * 60 * 60_000 },
  { short: '1mo', label: '1 month', ms: 30 * 24 * 60 * 60_000 },
] as const;

export const NEW_PER_SESSION = 20;
export const MASTERED_BOX = BOXES.length - 1;

export function dueIndices(deck: DeckState, now: number, inQueue: Set<number> = new Set()): number[] {
  return Object.keys(deck)
    .map(Number)
    .filter((i) => deck[i].due <= now && !inQueue.has(i))
    .sort((a, b) => deck[a].due - deck[b].due);
}

export function buildSession(deck: DeckState, totalWords: number, now: number): number[] {
  const session = dueIndices(deck, now);
  const seen = new Set(session);
  let added = 0;
  for (let i = 0; i < totalWords && added < NEW_PER_SESSION; i++) {
    if (deck[i] || seen.has(i)) continue;
    session.push(i);
    seen.add(i);
    added += 1;
  }
  return session;
}

export function nextReviewAt(deck: DeckState, now: number): number | null {
  let nearest: number | null = null;
  for (const key of Object.keys(deck)) {
    const due = deck[key].due;
    if (due > now && (nearest === null || due < nearest)) nearest = due;
  }
  return nearest;
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'now';
  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  if (minutes >= 1) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
