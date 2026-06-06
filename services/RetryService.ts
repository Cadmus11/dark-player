export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryOn?: (err: unknown) => boolean;
  onAttempt?: (attempt: number, error: unknown) => void;
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onAttempt' | 'retryOn' | 'signal'>> & {
  onAttempt: RetryOptions['onAttempt'];
  retryOn: RetryOptions['retryOn'];
  signal: AbortSignal | undefined;
} = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 4000,
  backoffMultiplier: 2,
  jitter: true,
  retryOn: undefined as unknown as RetryOptions['retryOn'],
  onAttempt: undefined as unknown as RetryOptions['onAttempt'],
  signal: undefined,
};

function defaultShouldRetry(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) {
    const name = err.name;
    if (name === 'AbortError' || name === 'CancelledError') return false;
    const msg = err.message.toLowerCase();
    if (msg.includes('cancel')) return false;
    if (msg.includes('aborted')) return false;
    if (msg.includes('permission')) return false;
    if (msg.includes('denied')) return false;
  }
  return true;
}

function computeDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  const raw = Math.min(maxDelayMs, baseDelayMs * Math.pow(backoffMultiplier, attempt));
  if (!jitter) return raw;
  const noise = raw * 0.3 * Math.random();
  return Math.round(raw - noise);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const shouldRetry = opts.retryOn ?? defaultShouldRetry;
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    if (opts.signal?.aborted) {
      throw new Error('Aborted');
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      opts.onAttempt?.(attempt + 1, err);
      const isLast = attempt === opts.maxAttempts - 1;
      if (isLast || !shouldRetry(err)) {
        throw err;
      }
      const delay = computeDelay(
        attempt,
        opts.baseDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier,
        opts.jitter
      );
      await sleep(delay, opts.signal);
    }
  }
  throw lastError;
}
