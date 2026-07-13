import type { CommentaryLine, CommentaryPriority } from './CommentaryEngine';

const PRIORITY_RANK: Record<CommentaryPriority, number> = {
  critical: 100,
  high: 80,
  medium: 60,
  low: 40,
  ambient: 20,
};

export type QueuedCommentaryLine = CommentaryLine;

export function sortQueue(queue: CommentaryLine[]): CommentaryLine[] {
  return [...queue].sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
}

export function enqueueWithCap(queue: CommentaryLine[], line: CommentaryLine, max: number): CommentaryLine[] {
  const merged = [...queue, line];
  if (merged.length <= max) return merged;

  const lowestIdx = merged.reduce(
    (minIdx, item, idx, arr) =>
      PRIORITY_RANK[item.priority] < PRIORITY_RANK[arr[minIdx]!.priority] ? idx : minIdx,
    0,
  );

  if (lowestIdx === merged.length - 1) {
    return queue;
  }

  merged.splice(lowestIdx, 1);
  return merged;
}

export function shouldDropIncoming(
  current: CommentaryPriority | null,
  incoming: CommentaryPriority,
): boolean {
  if (!current) return false;
  return PRIORITY_RANK[incoming] < PRIORITY_RANK[current];
}

export function shouldInterrupt(
  current: CommentaryPriority | null,
  incoming: CommentaryPriority,
): boolean {
  if (!current) return false;
  return PRIORITY_RANK[incoming] > PRIORITY_RANK[current];
}
