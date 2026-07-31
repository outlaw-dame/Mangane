import 'fake-indexeddb/auto';

import { webcrypto } from 'node:crypto';
import {
  CompressionStream,
  DecompressionStream,
  ReadableStream,
  TransformStream,
} from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';

import Dexie from 'dexie';

import { decodeLocalEnvelope } from 'soapbox/utils/compression';

import { CompressedCacheRepository } from '../compressed-cache';
import { createAccountScope, QuotaExceededRepositoryError } from '../repository';
import { ManganeDatabase } from '../schema';

const installNativeStreams = () => {
  Object.defineProperties(global, {
    CompressionStream: { configurable: true, value: CompressionStream },
    DecompressionStream: { configurable: true, value: DecompressionStream },
    ReadableStream: { configurable: true, value: ReadableStream },
    TransformStream: { configurable: true, value: TransformStream },
    TextEncoder: { configurable: true, value: TextEncoder },
    TextDecoder: { configurable: true, value: TextDecoder },
    crypto: { configurable: true, value: webcrypto },
  });
};

const isSnapshot = (candidate: unknown): candidate is { ids: string[] } => (
  typeof candidate === 'object'
  && candidate !== null
  && Array.isArray((candidate as { ids?: unknown }).ids)
  && (candidate as { ids: unknown[] }).ids.every(id => typeof id === 'string')
);

describe('compressed cache repository', () => {
  let database: ManganeDatabase;
  let repository: CompressedCacheRepository;
  const alice = createAccountScope('https://social.example/@alice');
  const bob = createAccountScope('https://social.example/@bob');

  beforeAll(installNativeStreams);
  beforeEach(async() => {
    database = new ManganeDatabase(`compressed-cache-${Date.now()}-${Math.random()}`);
    await database.open();
    repository = new CompressedCacheRepository(database);
  });
  afterEach(async() => {
    database.close();
    await Dexie.delete(database.name);
  });

  it('reads mixed identity and compressed formats within the owning account only', async() => {
    const small = { ids: ['one'] };
    const large = { ids: Array.from({ length: 500 }, (_, index) => `status-${index}`) };
    await repository.put(alice, 'small', small, isSnapshot, {
      context: 'public-cache',
      disableCompression: true,
    });
    await repository.put(alice, 'large', large, isSnapshot, { context: 'public-cache' });

    const stored = await database.settings.get([alice.accountUrl, 'compressed-cache:large']);
    const storedEnvelope = stored?.value as Record<string, unknown>;
    expect(storedEnvelope.kind).toBe('compressed');
    expect(storedEnvelope.schemaVersion).toBe(1);
    expect(storedEnvelope.algorithm).toBe('gzip');
    expect(Number.isSafeInteger(storedEnvelope.uncompressedBytes)).toBe(true);
    expect(Number.isSafeInteger(storedEnvelope.compressedBytes)).toBe(true);
    expect(storedEnvelope.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(Number.isFinite(Date.parse(storedEnvelope.createdAt as string))).toBe(true);
    await expect(decodeLocalEnvelope(stored?.value as never, {
      scopeKey: alice.accountUrl,
      validate: isSnapshot,
    })).resolves.toEqual(large);

    await expect(repository.get(alice, 'small', isSnapshot)).resolves.toEqual(small);
    await expect(repository.get(alice, 'large', isSnapshot)).resolves.toEqual(large);
    await expect(repository.get(bob, 'large', isSnapshot)).resolves.toBeUndefined();
  });

  it('keeps the prior representation intact when a quota write cannot commit', async() => {
    const original = { ids: ['original'] };
    await repository.put(alice, 'timeline', original, isSnapshot, {
      context: 'public-cache',
      disableCompression: true,
    });

    const put = jest.spyOn(database.settings, 'put').mockRejectedValue(
      new DOMException('quota', 'QuotaExceededError'),
    );
    await expect(repository.put(
      alice,
      'timeline',
      { ids: ['replacement'] },
      isSnapshot,
      { context: 'public-cache', disableCompression: true },
    )).rejects.toBeInstanceOf(QuotaExceededRepositoryError);
    put.mockRestore();

    await expect(repository.get(alice, 'timeline', isSnapshot)).resolves.toEqual(original);
  });

  it('self-heals corrupt rebuildable entries without touching another account', async() => {
    const snapshot = { ids: Array.from({ length: 500 }, (_, index) => `status-${index}`) };
    await repository.put(alice, 'timeline', snapshot, isSnapshot, { context: 'public-cache' });
    await repository.put(bob, 'timeline', snapshot, isSnapshot, { context: 'public-cache' });

    const aliceRecord = await database.settings.get([alice.accountUrl, 'compressed-cache:timeline']);
    const envelope = aliceRecord?.value as { checksum: string };
    await database.settings.update([alice.accountUrl, 'compressed-cache:timeline'], {
      value: { ...envelope, checksum: '0'.repeat(64) },
    });

    await expect(repository.get(alice, 'timeline', isSnapshot)).resolves.toBeUndefined();
    await expect(repository.get(bob, 'timeline', isSnapshot)).resolves.toEqual(snapshot);
    expect(await database.settings.get([alice.accountUrl, 'compressed-cache:timeline'])).toBeUndefined();
  });
});
