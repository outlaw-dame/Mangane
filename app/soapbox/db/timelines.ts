/**
 * Phase 5E — Timeline membership, ordering, and feed identity.
 *
 * Timelines (feeds) are separate from status records. A timeline is an ordered
 * list of status IDs with provenance metadata — who owns the feed, where the
 * cursor is, what gaps exist, and what source produced each entry.
 *
 * Design principles:
 * - Feed identity is explicit: "home", "notifications", "local:instance.tld",
 *   "list:123", "hashtag:fediverse" — each is a distinct timeline
 * - Ordering is preserved as received from the server, not reconstructed
 *   from status timestamps
 * - Gaps are first-class: a gap means "the server has items here we haven't
 *   fetched" and carries the cursor needed to fill it
 * - Source provenance: each entry knows whether it came from streaming,
 *   pagination, or cache hydration
 * - Account-scoped: compound key [accountUrl+timelineId+statusId]
 */


import db from './instance';

import type { AccountScope } from './repository';

export type TimelineId =
  | 'home'
  | 'notifications'
  | `local:${string}`
  | `federated:${string}`
  | `bubble:${string}`
  | `list:${string}`
  | `hashtag:${string}`
  | `account:${string}`
  | 'bookmarks'
  | 'favourites';

export interface TimelineMember {
  readonly accountUrl: string;
  readonly timelineId: string;
  readonly statusId: string;
  readonly position: number;
  readonly source: 'pagination' | 'streaming' | 'hydration' | 'backfill';
  readonly insertedAt: number;
}

export interface TimelineCursor {
  readonly accountUrl: string;
  readonly timelineId: string;
  maxId: string | null;
  minId: string | null;
  hasOlder: boolean;
  hasNewer: boolean;
  updatedAt: number;
}

export interface TimelineGap {
  readonly accountUrl: string;
  readonly timelineId: string;
  readonly gapId: string;
  readonly aboveStatusId: string;
  readonly belowStatusId: string | null;
  readonly fillCursor: string;
  readonly detectedAt: number;
  filled: boolean;
}

export const TIMELINE_SCHEMA = {
  timelineMembers: '[accountUrl+timelineId+statusId], [accountUrl+timelineId], accountUrl, insertedAt',
  timelineCursors: '[accountUrl+timelineId], accountUrl, updatedAt',
  timelineGaps: '[accountUrl+timelineId+gapId], [accountUrl+timelineId], accountUrl, detectedAt',
};

export class TimelineRepository {

  async addMembers(
    scope: AccountScope,
    timelineId: string,
    entries: Array<{ statusId: string; position: number; source: TimelineMember['source'] }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    const now = Date.now();
    const records: TimelineMember[] = entries.map(e => ({
      accountUrl: scope.accountUrl,
      timelineId,
      statusId: e.statusId,
      position: e.position,
      source: e.source,
      insertedAt: now,
    }));
    await db.table('timelineMembers').bulkPut(records);
  }

  async getMember(
    scope: AccountScope,
    timelineId: string,
    statusId: string,
  ): Promise<TimelineMember | undefined> {
    const record = await db.table('timelineMembers').get([scope.accountUrl, timelineId, statusId]);
    if (!record || record.accountUrl !== scope.accountUrl) return undefined;
    return record as TimelineMember;
  }

  async getMembers(
    scope: AccountScope,
    timelineId: string,
    options: { limit?: number; afterPosition?: number } = {},
  ): Promise<TimelineMember[]> {
    const { limit = 40, afterPosition } = options;

    const collection = db.table('timelineMembers')
      .where('[accountUrl+timelineId]')
      .equals([scope.accountUrl, timelineId]);

    const all = await collection.toArray();
    const filtered = afterPosition !== undefined
      ? all.filter(m => m.position < afterPosition)
      : all;

    filtered.sort((a: TimelineMember, b: TimelineMember) => b.position - a.position);
    return filtered.slice(0, limit);
  }

  async saveCursor(scope: AccountScope, cursor: Omit<TimelineCursor, 'accountUrl'>): Promise<void> {
    await db.table('timelineCursors').put({ ...cursor, accountUrl: scope.accountUrl });
  }

  async getCursor(scope: AccountScope, timelineId: string): Promise<TimelineCursor | undefined> {
    const record = await db.table('timelineCursors').get([scope.accountUrl, timelineId]);
    if (!record) return undefined;
    if (record.accountUrl !== scope.accountUrl) return undefined;
    return record;
  }

  async addGap(scope: AccountScope, gap: Omit<TimelineGap, 'accountUrl'>): Promise<void> {
    await db.table('timelineGaps').put({ ...gap, accountUrl: scope.accountUrl });
  }

  async getUnfilledGaps(scope: AccountScope, timelineId: string): Promise<TimelineGap[]> {
    const all = await db.table('timelineGaps')
      .where('[accountUrl+timelineId]')
      .equals([scope.accountUrl, timelineId])
      .toArray();
    return all.filter((g: TimelineGap) => !g.filled && g.accountUrl === scope.accountUrl);
  }

  async markGapFilled(scope: AccountScope, timelineId: string, gapId: string): Promise<void> {
    await db.table('timelineGaps')
      .where('[accountUrl+timelineId+gapId]')
      .equals([scope.accountUrl, timelineId, gapId])
      .modify({ filled: true });
  }

  async purgeAccount(scope: AccountScope): Promise<number> {
    let total = 0;
    total += await db.table('timelineMembers').where('accountUrl').equals(scope.accountUrl).delete();
    total += await db.table('timelineCursors').where('accountUrl').equals(scope.accountUrl).delete();
    total += await db.table('timelineGaps').where('accountUrl').equals(scope.accountUrl).delete();
    return total;
  }

}

export const timelineRepo = new TimelineRepository();
