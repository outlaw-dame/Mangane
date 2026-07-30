import { statusesRepo } from './repository';
import { timelineRepo } from './timelines';

import type { AccountScope } from './repository';
import type { StoredStatus } from './schema';
import type { TimelineCursor, TimelineGap, TimelineMember } from './timelines';

const DEFAULT_WINDOW_BEFORE = 20;
const DEFAULT_WINDOW_AFTER = 20;
const MAX_WINDOW_SIDE = 100;
const MAX_TIMELINE_ID_LENGTH = 512;

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

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some(character => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
}

function validateIdentifier(value: string, label: string, maxLength = MAX_TIMELINE_ID_LENGTH): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || containsControlCharacter(normalized)) {
    throw new RangeError(`${label} must be a non-empty bounded identifier without control characters`);
  }
  return normalized;
}

function clampWindowSide(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Timeline window sizes must be non-negative safe integers');
  }
  return Math.min(value, MAX_WINDOW_SIDE);
}

function validateAnchorPosition(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Timeline anchor position must be a safe integer');
  }
  return value;
}

function locateAnchor(members: TimelineMember[], anchorPosition: number | undefined): number {
  if (anchorPosition === undefined) return 0;

  const exact = members.findIndex(member => member.position === anchorPosition);
  if (exact >= 0) return exact;

  const nextOlder = members.findIndex(member => member.position < anchorPosition);
  return nextOlder >= 0 ? nextOlder : 0;
}

/**
 * Hydrates a bounded, account-scoped timeline window in canonical membership
 * order. Feed order is never reconstructed from status timestamps.
 *
 * Anchor status IDs are resolved through the account-scoped membership key
 * before the bounded candidate query. This prevents a deep anchor from
 * silently falling back to the newest item merely because it was outside the
 * first candidate batch.
 */
export async function loadTimelineWindow(
  scope: AccountScope,
  timelineIdInput: string,
  request: TimelineWindowRequest = {},
): Promise<TimelineWindow> {
  const timelineId = validateIdentifier(timelineIdInput, 'Timeline ID');
  const anchorStatusId = request.anchorStatusId === undefined
    ? undefined
    : validateIdentifier(request.anchorStatusId, 'Anchor status ID');
  const requestedAnchorPosition = validateAnchorPosition(request.anchorPosition);
  const before = clampWindowSide(request.before, DEFAULT_WINDOW_BEFORE);
  const after = clampWindowSide(request.after, DEFAULT_WINDOW_AFTER);
  const maximumNeeded = before + after + 1;

  const anchorMember = anchorStatusId === undefined
    ? undefined
    : await timelineRepo.getMember(scope, timelineId, anchorStatusId);
  const effectiveAnchorPosition = anchorMember?.position ?? requestedAnchorPosition;

  const candidateLimit = Math.min(maximumNeeded + before, (MAX_WINDOW_SIDE * 2) + 1);
  const members = await timelineRepo.getMembers(scope, timelineId, {
    limit: candidateLimit,
    afterPosition: effectiveAnchorPosition === undefined ? undefined : effectiveAnchorPosition + before + 1,
  });

  const [cursor, gaps] = await Promise.all([
    timelineRepo.getCursor(scope, timelineId),
    timelineRepo.getUnfilledGaps(scope, timelineId),
  ]);

  if (members.length === 0) {
    return {
      members: [],
      statuses: [],
      missingStatusIds: [],
      anchorIndex: null,
      cursor,
      gaps,
    };
  }

  const anchorCandidateIndex = locateAnchor(members, effectiveAnchorPosition);
  const start = Math.max(0, anchorCandidateIndex - before);
  const end = Math.min(members.length, anchorCandidateIndex + after + 1);
  const windowMembers = members.slice(start, end);
  const anchorIndex = Math.min(anchorCandidateIndex - start, windowMembers.length - 1);
  const statuses = await statusesRepo.getMany(scope, windowMembers.map(member => member.statusId));

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
