let _globalId = 0;

export class CancellationToken {
  private _abortController: AbortController;
  public readonly id: number;

  constructor() {
    this._abortController = new AbortController();
    this.id = ++_globalId;
  }

  get signal(): AbortSignal {
    return this._abortController.signal;
  }

  get isCancelled(): boolean {
    return this._abortController.signal.aborted;
  }

  cancel(): void {
    if (!this._abortController.signal.aborted) {
      this._abortController.abort();
    }
  }

  throwIfCancelled(): void {
    if (this._abortController.signal.aborted) {
      throw new CancelledError(this.id);
    }
  }

  static race(tokens: CancellationToken[]): CancellationToken {
    const combined = new CancellationToken();
    for (const token of tokens) {
      if (token.isCancelled) {
        combined.cancel();
        return combined;
      }
      token.signal.addEventListener('abort', () => combined.cancel(), { once: true });
    }
    return combined;
  }
}

export class CancelledError extends Error {
  public readonly tokenId: number;
  constructor(tokenId: number) {
    super(`Operation cancelled (token: ${tokenId})`);
    this.tokenId = tokenId;
    this.name = 'CancelledError';
  }
}

export class TaskManager {
  private _tokens = new Map<string, CancellationToken>();

  createScope(name: string): CancellationToken {
    this.cancelScope(name);
    const token = new CancellationToken();
    this._tokens.set(name, token);
    return token;
  }

  cancelScope(name: string): void {
    const existing = this._tokens.get(name);
    if (existing && !existing.isCancelled) {
      existing.cancel();
    }
    this._tokens.delete(name);
  }

  cancelAll(): void {
    for (const [, token] of this._tokens) {
      if (!token.isCancelled) token.cancel();
    }
    this._tokens.clear();
  }

  isScopeActive(name: string): boolean {
    const token = this._tokens.get(name);
    return !!token && !token.isCancelled;
  }

  getToken(name: string): CancellationToken | undefined {
    return this._tokens.get(name);
  }
}

export const taskManager = new TaskManager();

export function isCancelled(error: unknown): boolean {
  return error instanceof CancelledError;
}

export function cancellableSleep(ms: number, token: CancellationToken): Promise<void> {
  return new Promise((resolve, reject) => {
    if (token.isCancelled) {
      reject(new CancelledError(token.id));
      return;
    }
    const timer = setTimeout(resolve, ms);
    token.signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new CancelledError(token.id));
      },
      { once: true }
    );
  });
}
