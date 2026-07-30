import type { APIEntity } from 'soapbox/types/entities';

const MAX_ANCESTOR_REPAIR_DEPTH = 40;

type ContextStatus = APIEntity & {
  id: string,
  in_reply_to_id?: string | null,
};

type FetchStatusById = (id: string) => Promise<ContextStatus>;

export interface AncestorContextRepair {
  ancestors: ContextStatus[];
  fetched: ContextStatus[];
}

const isUsableStatusId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 512;

/**
 * Reconstructs the connected ancestor chain for a status.
 *
 * Mastodon-compatible servers can return incomplete or failed context payloads
 * even while the focused status still exposes `in_reply_to_id`. This helper
 * follows that authoritative parent pointer with strict depth and cycle bounds,
 * reusing known ancestors before requesting missing ones.
 */
export const repairAncestorContext = async(
  status: ContextStatus,
  knownAncestors: ContextStatus[],
  fetchStatusById: FetchStatusById,
): Promise<AncestorContextRepair> => {
  const knownById = new Map<string, ContextStatus>();
  knownAncestors.forEach(ancestor => {
    if (isUsableStatusId(ancestor.id)) knownById.set(ancestor.id, ancestor);
  });

  const visited = new Set<string>();
  if (isUsableStatusId(status.id)) visited.add(status.id);

  const nearestFirst: ContextStatus[] = [];
  const fetched: ContextStatus[] = [];
  let parentId = status.in_reply_to_id;

  for (let depth = 0; depth < MAX_ANCESTOR_REPAIR_DEPTH; depth += 1) {
    if (!isUsableStatusId(parentId) || visited.has(parentId)) break;
    visited.add(parentId);

    let parent = knownById.get(parentId);
    if (!parent) {
      try {
        const candidate = await fetchStatusById(parentId);
        if (!candidate || candidate.id !== parentId) break;
        parent = candidate;
        fetched.push(candidate);
      } catch (_error) {
        break;
      }
    }

    nearestFirst.push(parent);
    parentId = parent.in_reply_to_id;
  }

  return {
    ancestors: nearestFirst.reverse(),
    fetched,
  };
};
