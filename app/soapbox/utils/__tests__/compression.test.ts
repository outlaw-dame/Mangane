import { webcrypto } from 'node:crypto';
import {
  CompressionStream,
  DecompressionStream,
  ReadableStream,
  TransformStream,
} from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';

import {
  CompressionError,
  createLocalEnvelope,
  decodeLocalEnvelope,
  inspectZstdWindowSize,
  probeNativeCodec,
  selectNativeAlgorithm,
} from '../compression';

const originalCompressionStream = globalThis.CompressionStream;
const originalDecompressionStream = globalThis.DecompressionStream;
const originalCrypto = globalThis.crypto;
const originalTextEncoder = globalThis.TextEncoder;
const originalTextDecoder = globalThis.TextDecoder;
const originalReadableStream = globalThis.ReadableStream;
const originalTransformStream = globalThis.TransformStream;

const installNativeGzip = () => {
  Object.defineProperty(globalThis, 'CompressionStream', {
    configurable: true,
    value: CompressionStream,
  });
  Object.defineProperty(globalThis, 'DecompressionStream', {
    configurable: true,
    value: DecompressionStream,
  });
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  });
  Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder });
  Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder });
  Object.defineProperty(globalThis, 'ReadableStream', { configurable: true, value: ReadableStream });
  Object.defineProperty(globalThis, 'TransformStream', { configurable: true, value: TransformStream });
};

describe('bounded compression authority', () => {
  beforeEach(installNativeGzip);

  afterAll(() => {
    Object.defineProperty(globalThis, 'CompressionStream', { configurable: true, value: originalCompressionStream });
    Object.defineProperty(globalThis, 'DecompressionStream', { configurable: true, value: originalDecompressionStream });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
    Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: originalTextEncoder });
    Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: originalTextDecoder });
    Object.defineProperty(globalThis, 'ReadableStream', { configurable: true, value: originalReadableStream });
    Object.defineProperty(globalThis, 'TransformStream', { configurable: true, value: originalTransformStream });
  });

  it('capability-probes each operation and falls back from zstd to gzip', () => {
    expect(probeNativeCodec('gzip')).toEqual({ compress: true, decompress: true });
    expect(probeNativeCodec('zstd')).toEqual({ compress: false, decompress: false });
    expect(selectNativeAlgorithm()).toBe('gzip');

    expect(selectNativeAlgorithm(true, () => ({ compress: false, decompress: false }))).toBeNull();
  });

  it('round-trips a scoped, checksummed gzip envelope', async() => {
    const value = { ids: Array.from({ length: 500 }, (_, index) => `status-${index}`) };
    const envelope = await createLocalEnvelope(value, {
      scopeKey: 'https://social.example/@alice',
      context: 'public-cache',
    });

    expect(envelope.kind).toBe('compressed');
    if (envelope.kind !== 'compressed') throw new Error('expected compression');
    expect(envelope.algorithm).toBe('gzip');
    expect(envelope.compressedBytes).toBe(envelope.payload.byteLength);
    expect(envelope.checksum).toMatch(/^[a-f0-9]{64}$/);

    await expect(decodeLocalEnvelope(
      envelope,
      {
        scopeKey: 'https://social.example/@alice',
        validate: (candidate): candidate is typeof value => (
          typeof candidate === 'object' && candidate !== null && Array.isArray((candidate as typeof value).ids)
        ),
      },
    )).resolves.toEqual(value);
  });

  it('preserves canonical data through identity fallback when compression is disabled', async() => {
    const value = { ids: ['one', 'two'] };
    const envelope = await createLocalEnvelope(value, {
      scopeKey: 'account-a',
      context: 'public-cache',
      disableCompression: true,
    });
    expect(envelope).toEqual({
      kind: 'identity',
      schemaVersion: 1,
      scopeKey: 'account-a',
      value,
    });
    await expect(decodeLocalEnvelope(envelope, {
      scopeKey: 'account-a',
      validate: (candidate): candidate is typeof value => typeof candidate === 'object' && candidate !== null,
    })).resolves.toEqual(value);
  });

  it('rejects unsafe compression contexts and cross-account reads', async() => {
    await expect(createLocalEnvelope({ value: 'private' }, {
      scopeKey: 'account-a',
      context: 'mixed-trust-private' as 'public-cache',
    })).rejects.toMatchObject({ code: 'UNSAFE_CONTEXT' });

    const envelope = await createLocalEnvelope({
      ids: Array.from({ length: 500 }, (_, index) => `status-${index}`),
    }, {
      scopeKey: 'account-a',
      context: 'public-cache',
    });
    await expect(decodeLocalEnvelope(envelope, {
      scopeKey: 'account-b',
      validate: (_candidate): _candidate is { ids: string[] } => true,
    })).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' });
  });

  it('fails closed on corruption, truncation, and invalid inner schemas', async() => {
    const envelope = await createLocalEnvelope({
      ids: Array.from({ length: 500 }, (_, index) => `status-${index}`),
    }, {
      scopeKey: 'account-a',
      context: 'public-cache',
    });
    if (envelope.kind !== 'compressed') throw new Error('expected compression');

    const corrupted = {
      ...envelope,
      checksum: '0'.repeat(64),
    };
    await expect(decodeLocalEnvelope(corrupted, {
      scopeKey: 'account-a',
      validate: (_candidate): _candidate is { ids: string[] } => true,
    })).rejects.toMatchObject({ code: 'CHECKSUM_MISMATCH' });

    const truncated = {
      ...envelope,
      payload: envelope.payload.slice(0, -4),
      compressedBytes: envelope.payload.byteLength - 4,
    };
    await expect(decodeLocalEnvelope(truncated, {
      scopeKey: 'account-a',
      validate: (_candidate): _candidate is { ids: string[] } => true,
    })).rejects.toBeInstanceOf(CompressionError);

    await expect(decodeLocalEnvelope({
      ...envelope,
      compressedBytes: envelope.payload.byteLength - 1,
    }, {
      scopeKey: 'account-a',
      validate: (_candidate): _candidate is { ids: string[] } => true,
    })).rejects.toMatchObject({ code: 'INVALID_ENVELOPE' });

    await expect(decodeLocalEnvelope(envelope, {
      scopeKey: 'account-a',
      validate: (_candidate): _candidate is { required: number } => false,
    })).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });
  });

  it('enforces expansion limits and cancellation before canonical data is returned', async() => {
    const envelope = await createLocalEnvelope({
      ids: Array.from({ length: 2000 }, (_, index) => `status-${index}`),
    }, {
      scopeKey: 'account-a',
      context: 'public-cache',
    });
    if (envelope.kind !== 'compressed') throw new Error('expected compression');

    await expect(decodeLocalEnvelope(envelope, {
      scopeKey: 'account-a',
      maxExpansionRatio: 2,
      validate: (_candidate): _candidate is { ids: string[] } => true,
    })).rejects.toMatchObject({ code: 'EXPANSION_LIMIT' });

    await expect(decodeLocalEnvelope(envelope, {
      scopeKey: 'account-a',
      maxOutputBytes: Number.NaN,
      validate: (_candidate): _candidate is { ids: string[] } => true,
    })).rejects.toMatchObject({ code: 'OUTPUT_LIMIT' });

    const controller = new AbortController();
    controller.abort();
    await expect(decodeLocalEnvelope(envelope, {
      scopeKey: 'account-a',
      signal: controller.signal,
      validate: (_candidate): _candidate is { ids: string[] } => true,
    })).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('parses bounded zstd window descriptors and rejects malformed frames', () => {
    // Standard zstd magic, non-single-segment frame, 1 KiB window descriptor.
    expect(inspectZstdWindowSize(new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x00]))).toBe(1024);
    expect(() => inspectZstdWindowSize(new Uint8Array([0x00, 0x00]))).toThrow(CompressionError);
    expect(() => inspectZstdWindowSize(new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0x08, 0x00]))).toThrow(CompressionError);
  });
});
