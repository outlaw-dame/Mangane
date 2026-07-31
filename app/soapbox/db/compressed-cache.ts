/**
 * Account-scoped storage for approved rebuildable cache documents.
 *
 * Compression happens before the Dexie transaction. The verified envelope then
 * replaces the prior settings-row value atomically, so quota/interruption keeps
 * the last readable representation intact.
 */
import {
  CompressionError,
  createLocalEnvelope,
  decodeLocalEnvelope,
} from 'soapbox/utils/compression';

import db from './instance';
import { RepositoryError, writeWithBackoff } from './repository';

import type { AccountScope } from './repository';
import type { ManganeDatabase, StoredSetting } from './schema';
import type {
  LocalEnvelope,
  SafeCompressionContext,
} from 'soapbox/utils/compression';

const KEY_PREFIX = 'compressed-cache:';

const storageKey = (key: unknown): string => {
  if (
    typeof key !== 'string'
    || key.length === 0
    || key.length > 256
    || !/^[a-zA-Z0-9:_-]+$/.test(key)
  ) {
    throw new RepositoryError('Invalid compressed cache key', 'INVALID_ID');
  }
  return `${KEY_PREFIX}${key}`;
};

interface PutOptions {
  context: SafeCompressionContext;
  disableCompression?: boolean;
  signal?: AbortSignal;
}

/**
 * This repository is restricted to rebuildable, caller-validated cache data.
 * Drafts, credentials, private messages, and mixed-trust private data are not
 * valid callers.
 */
export class CompressedCacheRepository {

  constructor(private readonly database: ManganeDatabase = db) {}

  async get<T>(
    scope: AccountScope,
    key: string,
    validate: (candidate: unknown) => candidate is T,
    signal?: AbortSignal,
  ): Promise<T | undefined> {
    const resolvedKey = storageKey(key);
    const record = await this.database.settings.get([scope.accountUrl, resolvedKey]);
    if (!record) return undefined;
    if (record.accountUrl !== scope.accountUrl) {
      throw new RepositoryError('Compressed cache scope mismatch (potential IDOR)', 'SCOPE_MISMATCH');
    }

    try {
      return await decodeLocalEnvelope(
        record.value as LocalEnvelope<T>,
        { scopeKey: scope.accountUrl, signal, validate },
      );
    } catch (error) {
      if (!(error instanceof CompressionError) || error.code === 'ABORTED') throw error;
      // A rebuildable corrupt cache entry is safer to evict than repeatedly
      // decode. The compound key prevents deleting another account's record.
      await this.database.settings.delete([scope.accountUrl, resolvedKey]);
      return undefined;
    }
  }

  async put<T>(
    scope: AccountScope,
    key: string,
    value: T,
    validate: (candidate: unknown) => candidate is T,
    options: PutOptions,
  ): Promise<void> {
    const resolvedKey = storageKey(key);
    const envelope = await createLocalEnvelope(value, {
      scopeKey: scope.accountUrl,
      context: options.context,
      disableCompression: options.disableCompression,
      signal: options.signal,
    });

    // Decode before opening the transaction. No unverified compressed bytes can
    // replace the prior canonical cache representation.
    await decodeLocalEnvelope(envelope, {
      scopeKey: scope.accountUrl,
      signal: options.signal,
      validate,
    });

    const record: StoredSetting = {
      accountUrl: scope.accountUrl,
      key: resolvedKey,
      value: envelope,
      updatedAt: Date.now(),
      localUpdatedAt: Date.now(),
    };
    await writeWithBackoff(() => this.database.transaction(
      'rw',
      this.database.settings,
      () => this.database.settings.put(record),
    ));
  }

  async delete(scope: AccountScope, key: string): Promise<void> {
    await this.database.settings.delete([scope.accountUrl, storageKey(key)]);
  }

}

export const compressedCacheRepo = new CompressedCacheRepository();
