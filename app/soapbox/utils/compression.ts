/**
 * Provider-neutral, bounded compression authority.
 *
 * This module is only for explicitly approved local/export payloads. Browsers
 * own HTTP Accept-Encoding negotiation and transparently decode fetch responses.
 */

export type CompressionAlgorithm = 'gzip' | 'zstd';
export type SafeCompressionContext = 'public-cache' | 'diagnostic-redacted' | 'user-export';

export type CompressionErrorCode =
  | 'ABORTED'
  | 'CHECKSUM_MISMATCH'
  | 'CODEC_FAILURE'
  | 'EXPANSION_LIMIT'
  | 'INPUT_LIMIT'
  | 'INVALID_ENVELOPE'
  | 'INVALID_PAYLOAD'
  | 'MALFORMED_FRAME'
  | 'OUTPUT_LIMIT'
  | 'SCOPE_MISMATCH'
  | 'UNSAFE_CONTEXT'
  | 'UNSUPPORTED_ALGORITHM'
  | 'ZSTD_WINDOW_LIMIT';

export class CompressionError extends Error {

  readonly code: CompressionErrorCode;

  constructor(code: CompressionErrorCode, message: string) {
    super(message);
    this.name = 'CompressionError';
    this.code = code;
  }

}

export interface IdentityEnvelope<T> {
  kind: 'identity';
  schemaVersion: 1;
  scopeKey: string;
  value: T;
}

export interface CompressedEnvelope {
  kind: 'compressed';
  schemaVersion: 1;
  algorithm: CompressionAlgorithm;
  scopeKey: string;
  uncompressedBytes: number;
  compressedBytes: number;
  checksum: string;
  createdAt: string;
  payload: Uint8Array;
}

export type LocalEnvelope<T> = IdentityEnvelope<T> | CompressedEnvelope;

interface NativeStreamConstructor {
  new(format: string): TransformStream<Uint8Array, Uint8Array>;
}

interface CodecSupport {
  compress: boolean;
  decompress: boolean;
}

interface CompressionLimits {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxExpansionRatio: number;
  maxZstdWindowBytes: number;
}

const DEFAULT_LIMITS: CompressionLimits = {
  maxInputBytes: 4 * 1024 * 1024,
  maxOutputBytes: 16 * 1024 * 1024,
  maxExpansionRatio: 64,
  // RFC 9659 recommends limiting resource use. Native zstd is accepted only
  // for frames at or below this explicit application budget.
  maxZstdWindowBytes: 8 * 1024 * 1024,
};

const MIN_COMPRESSION_BYTES = 1024;
const MAX_SCOPE_KEY_BYTES = 2048;
const SAFE_CONTEXTS = new Set<SafeCompressionContext>([
  'public-cache',
  'diagnostic-redacted',
  'user-export',
]);

const compressionConstructor = (): NativeStreamConstructor | undefined => (
  globalThis.CompressionStream as unknown as NativeStreamConstructor | undefined
);

const decompressionConstructor = (): NativeStreamConstructor | undefined => (
  globalThis.DecompressionStream as unknown as NativeStreamConstructor | undefined
);

const canConstruct = (
  Constructor: NativeStreamConstructor | undefined,
  algorithm: CompressionAlgorithm,
): boolean => {
  if (!Constructor) return false;
  try {
    // Capability is operation-specific. Construction is the web-platform probe.
    new Constructor(algorithm);
    return true;
  } catch {
    return false;
  }
};

export function probeNativeCodec(algorithm: CompressionAlgorithm): CodecSupport {
  return {
    compress: canConstruct(compressionConstructor(), algorithm),
    decompress: canConstruct(decompressionConstructor(), algorithm),
  };
}

export function selectNativeAlgorithm(
  preferZstd = true,
  probe: (algorithm: CompressionAlgorithm) => CodecSupport = probeNativeCodec,
): CompressionAlgorithm | null {
  if (preferZstd) {
    const zstd = probe('zstd');
    if (zstd.compress && zstd.decompress) return 'zstd';
  }

  const gzip = probe('gzip');
  return gzip.compress && gzip.decompress ? 'gzip' : null;
}

const assertNotAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new CompressionError('ABORTED', 'Compression operation was cancelled');
};

const resolvePositiveLimit = (
  value: number | undefined,
  fallback: number,
  code: CompressionErrorCode,
): number => {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new CompressionError(code, 'Compression limit must be a positive safe integer');
  }
  return resolved;
};

function assertScopeKey(scopeKey: unknown): asserts scopeKey is string {
  const hasControlCharacters = typeof scopeKey === 'string' && Array.from(scopeKey).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
  if (
    typeof scopeKey !== 'string'
    || scopeKey.length === 0
    || new TextEncoder().encode(scopeKey).byteLength > MAX_SCOPE_KEY_BYTES
    || hasControlCharacters
  ) {
    throw new CompressionError('INVALID_ENVELOPE', 'Compression scope is invalid');
  }
}

const concatBytes = (chunks: Uint8Array[], length: number): Uint8Array => {
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
};

const transformBytes = async(
  input: Uint8Array,
  algorithm: CompressionAlgorithm,
  operation: 'compress' | 'decompress',
  maxOutputBytes: number,
  signal?: AbortSignal,
): Promise<Uint8Array> => {
  assertNotAborted(signal);
  const Constructor = operation === 'compress'
    ? compressionConstructor()
    : decompressionConstructor();
  if (!Constructor || !canConstruct(Constructor, algorithm)) {
    throw new CompressionError('UNSUPPORTED_ALGORITHM', `${algorithm} ${operation} is unavailable`);
  }

  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const abort = () => {
    void reader?.cancel().catch(() => undefined);
  };
  signal?.addEventListener('abort', abort, { once: true });

  try {
    reader = source.pipeThrough(new Constructor(algorithm)).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    for (;;) {
      assertNotAborted(signal);
      const { done, value } = await reader.read();
      assertNotAborted(signal);
      if (done) break;
      if (!ArrayBuffer.isView(value)) {
        throw new CompressionError('CODEC_FAILURE', 'Compression codec returned an invalid chunk');
      }
      const chunk = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      total += chunk.byteLength;
      if (total > maxOutputBytes) {
        throw new CompressionError(
          operation === 'decompress' ? 'OUTPUT_LIMIT' : 'INPUT_LIMIT',
          'Compression byte budget exceeded',
        );
      }
      chunks.push(chunk);
    }
    return concatBytes(chunks, total);
  } catch (error) {
    if (error instanceof CompressionError) throw error;
    if (signal?.aborted) throw new CompressionError('ABORTED', 'Compression operation was cancelled');
    throw new CompressionError(
      operation === 'decompress' ? 'MALFORMED_FRAME' : 'CODEC_FAILURE',
      operation === 'decompress' ? 'Compressed frame is malformed or truncated' : 'Compression failed',
    );
  } finally {
    signal?.removeEventListener('abort', abort);
    reader?.releaseLock();
  }
};

const compressBytes = async(
  input: Uint8Array,
  algorithm: CompressionAlgorithm,
  limits: CompressionLimits,
  signal?: AbortSignal,
): Promise<Uint8Array> => {
  if (input.byteLength > limits.maxInputBytes) {
    throw new CompressionError('INPUT_LIMIT', 'Compression input exceeds the byte budget');
  }
  return transformBytes(input, algorithm, 'compress', limits.maxInputBytes + 64 * 1024, signal);
};

const decompressBytes = async(
  input: Uint8Array,
  algorithm: CompressionAlgorithm,
  expectedBytes: number,
  limits: CompressionLimits,
  signal?: AbortSignal,
): Promise<Uint8Array> => {
  if (input.byteLength === 0 || input.byteLength > limits.maxInputBytes) {
    throw new CompressionError('INPUT_LIMIT', 'Compressed input exceeds the byte budget');
  }
  if (expectedBytes < 0 || expectedBytes > limits.maxOutputBytes) {
    throw new CompressionError('OUTPUT_LIMIT', 'Declared output exceeds the byte budget');
  }
  if (expectedBytes / input.byteLength > limits.maxExpansionRatio) {
    throw new CompressionError('EXPANSION_LIMIT', 'Declared compression ratio exceeds the safety budget');
  }
  if (algorithm === 'zstd') {
    const windowBytes = inspectZstdWindowSize(input);
    if (windowBytes > limits.maxZstdWindowBytes) {
      throw new CompressionError('ZSTD_WINDOW_LIMIT', 'Zstd window exceeds the RFC 9659 application budget');
    }
  }

  const ratioBound = Math.ceil(input.byteLength * limits.maxExpansionRatio);
  const output = await transformBytes(
    input,
    algorithm,
    'decompress',
    Math.min(limits.maxOutputBytes, ratioBound),
    signal,
  );
  if (output.byteLength !== expectedBytes) {
    throw new CompressionError('MALFORMED_FRAME', 'Decoded size does not match the envelope');
  }
  return output;
};

const checksum = async(scopeKey: string, bytes: Uint8Array): Promise<string> => {
  const scope = new TextEncoder().encode(scopeKey);
  const bound = new Uint8Array(scope.byteLength + 1 + bytes.byteLength);
  bound.set(scope);
  bound[scope.byteLength] = 0;
  bound.set(bytes, scope.byteLength + 1);
  const digest = await crypto.subtle.digest('SHA-256', bound);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const readLittleEndian = (input: Uint8Array, offset: number, bytes: number): number => {
  if (offset + bytes > input.byteLength) {
    throw new CompressionError('MALFORMED_FRAME', 'Zstd frame header is truncated');
  }
  let result = 0;
  for (let index = 0; index < bytes; index += 1) {
    result += input[offset + index] * (2 ** (index * 8));
    if (!Number.isSafeInteger(result)) {
      throw new CompressionError('ZSTD_WINDOW_LIMIT', 'Zstd window is not safely representable');
    }
  }
  return result;
};

/** Read the declared zstd window without decoding attacker-controlled data. */
export function inspectZstdWindowSize(input: Uint8Array): number {
  if (
    input.byteLength < 6
    || input[0] !== 0x28
    || input[1] !== 0xb5
    || input[2] !== 0x2f
    || input[3] !== 0xfd
  ) {
    throw new CompressionError('MALFORMED_FRAME', 'Zstd frame magic is invalid');
  }

  const descriptor = input[4];
  if ((descriptor & 0x08) !== 0) {
    throw new CompressionError('MALFORMED_FRAME', 'Zstd reserved frame-header bit is set');
  }
  const singleSegment = (descriptor & 0x20) !== 0;
  const contentSizeFlag = descriptor >> 6;
  let offset = 5;

  if (!singleSegment) {
    const windowDescriptor = input[offset];
    offset += 1;
    const exponent = windowDescriptor >> 3;
    const mantissa = windowDescriptor & 0x07;
    const windowBase = 2 ** (10 + exponent);
    return windowBase + (windowBase / 8) * mantissa;
  }

  const dictionarySize = [0, 1, 2, 4][descriptor & 0x03];
  offset += dictionarySize;
  const contentSizeBytes = contentSizeFlag === 0 ? 1 : 2 ** contentSizeFlag;
  const encodedSize = readLittleEndian(input, offset, contentSizeBytes);
  return contentSizeFlag === 1 ? encodedSize + 256 : encodedSize;
}

interface CreateEnvelopeOptions {
  scopeKey: string;
  context: SafeCompressionContext;
  disableCompression?: boolean;
  preferZstd?: boolean;
  signal?: AbortSignal;
  maxInputBytes?: number;
}

export async function createLocalEnvelope<T>(
  value: T,
  options: CreateEnvelopeOptions,
): Promise<LocalEnvelope<T>> {
  assertScopeKey(options.scopeKey);
  if (!SAFE_CONTEXTS.has(options.context)) {
    throw new CompressionError('UNSAFE_CONTEXT', 'This data class is not approved for compression');
  }
  assertNotAborted(options.signal);

  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new CompressionError('INVALID_PAYLOAD', 'Payload is not serializable');
  }
  if (serialized === undefined) {
    throw new CompressionError('INVALID_PAYLOAD', 'Payload is not serializable');
  }

  const bytes = new TextEncoder().encode(serialized);
  const limits = {
    ...DEFAULT_LIMITS,
    maxInputBytes: resolvePositiveLimit(
      options.maxInputBytes,
      DEFAULT_LIMITS.maxInputBytes,
      'INPUT_LIMIT',
    ),
  };
  if (bytes.byteLength > limits.maxInputBytes) {
    throw new CompressionError('INPUT_LIMIT', 'Compression input exceeds the byte budget');
  }

  const identity: IdentityEnvelope<T> = {
    kind: 'identity',
    schemaVersion: 1,
    scopeKey: options.scopeKey,
    value,
  };
  if (options.disableCompression || bytes.byteLength < MIN_COMPRESSION_BYTES) return identity;

  const algorithm = selectNativeAlgorithm(options.preferZstd ?? true);
  if (!algorithm) return identity;
  const payload = await compressBytes(bytes, algorithm, limits, options.signal);
  // Store identity if framing/CPU complexity does not produce at least 10% savings.
  if (
    payload.byteLength === 0
    || payload.byteLength >= bytes.byteLength * 0.9
    || bytes.byteLength / payload.byteLength > limits.maxExpansionRatio
  ) return identity;

  return {
    kind: 'compressed',
    schemaVersion: 1,
    algorithm,
    scopeKey: options.scopeKey,
    uncompressedBytes: bytes.byteLength,
    compressedBytes: payload.byteLength,
    checksum: await checksum(options.scopeKey, bytes),
    createdAt: new Date().toISOString(),
    payload,
  };
}

interface DecodeEnvelopeOptions<T> {
  scopeKey: string;
  validate: (candidate: unknown) => candidate is T;
  signal?: AbortSignal;
  maxInputBytes?: number;
  maxOutputBytes?: number;
  maxExpansionRatio?: number;
  maxZstdWindowBytes?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeStoredBytes = (value: unknown, expectedBytes: number): Uint8Array => {
  if (ArrayBuffer.isView(value)) {
    if (value.byteLength !== expectedBytes) {
      throw new CompressionError('INVALID_ENVELOPE', 'Compressed payload length is invalid');
    }
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  // Some IndexedDB test/polyfill or legacy structured-clone implementations
  // materialize typed arrays as strict numeric-key objects.
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length !== expectedBytes) {
      throw new CompressionError('INVALID_ENVELOPE', 'Compressed payload length is invalid');
    }
    const bytes = new Uint8Array(expectedBytes);
    for (let index = 0; index < expectedBytes; index += 1) {
      const byte = value[String(index)];
      if (!Number.isInteger(byte) || (byte as number) < 0 || (byte as number) > 255) {
        throw new CompressionError('INVALID_ENVELOPE', 'Compressed payload contains invalid bytes');
      }
      bytes[index] = byte as number;
    }
    return bytes;
  }
  throw new CompressionError('INVALID_ENVELOPE', 'Compressed payload is invalid');
};

export async function decodeLocalEnvelope<T>(
  untrustedEnvelope: LocalEnvelope<T>,
  options: DecodeEnvelopeOptions<T>,
): Promise<T> {
  assertScopeKey(options.scopeKey);
  assertNotAborted(options.signal);
  const envelope: unknown = untrustedEnvelope;
  if (!isRecord(envelope) || envelope.schemaVersion !== 1) {
    throw new CompressionError('INVALID_ENVELOPE', 'Compressed envelope schema is invalid');
  }
  if (envelope.scopeKey !== options.scopeKey) {
    throw new CompressionError('SCOPE_MISMATCH', 'Compressed record belongs to another account scope');
  }

  if (envelope.kind === 'identity') {
    if (!options.validate(envelope.value)) {
      throw new CompressionError('INVALID_PAYLOAD', 'Identity payload failed schema validation');
    }
    return envelope.value;
  }
  if (
    envelope.kind !== 'compressed'
    || (envelope.algorithm !== 'gzip' && envelope.algorithm !== 'zstd')
    || typeof envelope.uncompressedBytes !== 'number'
    || !Number.isSafeInteger(envelope.uncompressedBytes)
    || typeof envelope.compressedBytes !== 'number'
    || !Number.isSafeInteger(envelope.compressedBytes)
    || typeof envelope.checksum !== 'string'
    || !/^[a-f0-9]{64}$/.test(envelope.checksum)
    || typeof envelope.createdAt !== 'string'
    || !Number.isFinite(Date.parse(envelope.createdAt))
    || envelope.compressedBytes <= 0
    || envelope.compressedBytes > (options.maxInputBytes ?? DEFAULT_LIMITS.maxInputBytes)
  ) {
    throw new CompressionError('INVALID_ENVELOPE', 'Compressed envelope fields are invalid');
  }

  const limits: CompressionLimits = {
    maxInputBytes: resolvePositiveLimit(options.maxInputBytes, DEFAULT_LIMITS.maxInputBytes, 'INPUT_LIMIT'),
    maxOutputBytes: resolvePositiveLimit(options.maxOutputBytes, DEFAULT_LIMITS.maxOutputBytes, 'OUTPUT_LIMIT'),
    maxExpansionRatio: resolvePositiveLimit(
      options.maxExpansionRatio,
      DEFAULT_LIMITS.maxExpansionRatio,
      'EXPANSION_LIMIT',
    ),
    maxZstdWindowBytes: resolvePositiveLimit(
      options.maxZstdWindowBytes,
      DEFAULT_LIMITS.maxZstdWindowBytes,
      'ZSTD_WINDOW_LIMIT',
    ),
  };
  const payload = normalizeStoredBytes(envelope.payload, envelope.compressedBytes);
  const bytes = await decompressBytes(
    payload,
    envelope.algorithm,
    envelope.uncompressedBytes,
    limits,
    options.signal,
  );
  if (await checksum(options.scopeKey, bytes) !== envelope.checksum) {
    throw new CompressionError('CHECKSUM_MISMATCH', 'Compressed record integrity check failed');
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new CompressionError('INVALID_PAYLOAD', 'Decoded payload is not valid UTF-8 JSON');
  }
  if (!options.validate(candidate)) {
    throw new CompressionError('INVALID_PAYLOAD', 'Decoded payload failed schema validation');
  }
  return candidate;
}
