import { statusesRepo } from './repository';
import { timelineRepo } from './timelines';

import type { AccountScope } from './repository';
import type { StoredStatus } from './schema';
import type { TimelineCursor, TimelineGap, TimelineMember } from './timelines';

const DEFAULT_WINDOW_BEFORE = 20;
const DEFAULT_WINDOW_AFTER = 20;
const MAX_WINDOW_SIDE = 100;

export interface TimelineWindowRequest {
  readonly anchorStatusId?: string;
  readonly anchorPosition?: number;
  readonly before?: number;
  readonly after?: number;
}

export interface TimelineWindow {
  readonly members: TimelineMember[];
  readonly statuses: Array<StoredStatus | undefined>;
  readonly missingStatusIds: string[];
  readonly anchorIndex: number | null;
  readonly cursor?: TimelineCursor;
  readonly gaps: TimelineGap[];
}

function clampWindowSide(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Timeline window sizes must be non-negative safe integers');
  }
  return Math.min(value, MAX_WINDOW_SIDE);
}

function locateAnchor(
  members: TimelineMember[],
  request: TimelineWindowRequest,
): number {
  if (request.anchorStatusId) {
    const byStatusId = members.findIndex(member => member.statusId === request.anchorStatusId);
    if (byStatusId >= 0) return byStatusId;
  }

  if (request.anchorPosition !== undefined) {
    const exact = members.findIndex(member => member.position === request.anchorPosition);
    if (exact >= 0) return exact;

    const nextOlder = members.findIndex(member => member.position < request.anchorPosition!);
    if (nextOlder >= 0) return nextOlder;
  }

  return 0;
}

/**
 * Hydrates a bounded, account-scoped timeline window in canonical membership
 * order. This is the storage boundary required by timeline-position
 * continuity; it never reconstructs feed order from status timestamps.
 *
 * The current Phase 5E membership repository still performs an in-memory sort.
 * A later schema slice will replace that implementation with an indexed order
 * key without changing this API.
 */
export async function loadTimelineWindow(
  scope: AccountScope,
  timelineId: string,
  request: TimelineWindowRequest = {},
): Promise<TimelineWindow> {
  const before = clampWindowSide(request.before, DEFAULT_WINDOW_BEFORE);
  const after = clampWindowSide(request.after, DEFAULT_WINDOW_AFTER);
  const maximumNeeded = before + after + 1;

  // Fetch a bounded candidate set. The multiplier allows an anchor near the
  // middle without turning this API into an unbounded hydration path.
  const candidateLimit = Math.min((maximumNeeded * 3) + 1, (MAX_WINDOW_SIDE * 2) + 1);
  const members = await timelineRepo.getMembers(scope, timelineId, {
    limit: candidateLimit,
    afterPosition: request.anchorPosition === undefined ? undefined : request.anchorPosition + before + 1,
  });

  if (members.length === 0) {
    const [cursor, gaps] = await Promise.all([
      timelineRepo.getCursor(scope, timelineId),
      timelineRepo.getUnfilledGaps(scope, timelineId),
    ]);
    return {
      members: [],
      statuses: [],
      missingStatusIds: [],
      anchorIndex: null,
      cursor,
      gaps,
    };
  }

  const anchorCandidateIndex = locateAnchor(members, request);
  const start = Math.max(0, anchorCandidateIndex - before);
  const end = Math.min(members.length, anchorCandidateIndex + after + 1);
  const windowMembers = members.slice(start, end);
  const anchorIndex = Math.min(anchorCandidateIndex - start, windowMembers.length - 1);

  const [statuses, cursor, gaps] = await Promise.all([
    statusesRepo.getMany(scope, windowMembers.map(member => member.statusId)),
    timelineRepo.getCursor(scope, timelineId),
    timelineRepo.getUnfilledGaps(scope, timelineId),
  ]);

  const missingStatusIds = windowMembers
    .filter((_, index) => statuses[index] === undefined)
    .map(member => member.statusId);

  return {
    members: windowMembers,
    statuses,
    missingStatusIds,
    anchorIndex,
    cursor,
    gaps,
  };
}
