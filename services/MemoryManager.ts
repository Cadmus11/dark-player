import { eventBus, AppEvents } from './EventBus';
import { lifecycleManager } from './LifecycleManager';

interface MemoryBudget {
  name: string;
  maxBytes: number;
  currentBytes: number;
  items: Map<string, { bytes: number; timestamp: number }>;
}

type EvictionStrategy = 'lru' | 'fifo' | 'largest-first';

class MemoryManagerClass {
  private static instance: MemoryManagerClass;
  private _budgets = new Map<string, MemoryBudget>();
  private _totalBytes = 0;
  private _maxTotalBytes = 200 * 1024 * 1024;
  private _cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private _initialized = false;

  static getInstance(): MemoryManagerClass {
    if (!MemoryManagerClass.instance) {
      MemoryManagerClass.instance = new MemoryManagerClass();
    }
    return MemoryManagerClass.instance;
  }

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;

    lifecycleManager.subscribe((state) => {
      if (state === 'background') {
        this.releaseAll('background');
      }
    });

    this._cleanupInterval = setInterval(() => this._enforceBudgets(), 60_000);
  }

  registerBudget(name: string, maxBytes: number): void {
    if (!this._budgets.has(name)) {
      this._budgets.set(name, {
        name,
        maxBytes,
        currentBytes: 0,
        items: new Map(),
      });
    }
  }

  allocate(name: string, key: string, bytes: number): boolean {
    let budget = this._budgets.get(name);
    if (!budget) {
      this.registerBudget(name, 10 * 1024 * 1024);
      budget = this._budgets.get(name)!;
    }

    if (this._totalBytes + bytes > this._maxTotalBytes) {
      this._evict(this._evictionTarget(bytes), 'lru');
    }

    if (budget.currentBytes + bytes > budget.maxBytes) {
      this._evictBudget(budget, bytes, 'lru');
    }

    if (budget.currentBytes + bytes > budget.maxBytes) {
      return false;
    }

    const existing = budget.items.get(key);
    if (existing) {
      budget.currentBytes -= existing.bytes;
    }

    budget.items.set(key, { bytes, timestamp: Date.now() });
    budget.currentBytes += bytes;
    this._totalBytes += bytes;
    return true;
  }

  release(name: string, key: string): void {
    const budget = this._budgets.get(name);
    if (!budget) return;
    const item = budget.items.get(key);
    if (!item) return;
    budget.currentBytes -= item.bytes;
    budget.items.delete(key);
    this._totalBytes -= item.bytes;
    if (this._totalBytes < 0) this._totalBytes = 0;
  }

  releaseBudget(name: string): void {
    const budget = this._budgets.get(name);
    if (!budget) return;
    this._totalBytes -= budget.currentBytes;
    budget.currentBytes = 0;
    budget.items.clear();
  }

  releaseAll(reason?: string): void {
    for (const [name] of this._budgets) {
      this.releaseBudget(name);
    }
    eventBus.emit(AppEvents.STORAGE_PRESSURE, { action: 'released', reason });
  }

  private _evictionTarget(neededBytes: number): { budget: string; key: string } | null {
    for (const [name, budget] of this._budgets) {
      if (budget.currentBytes > 0) {
        const oldest = [...budget.items.entries()].sort(
          ([, a], [, b]) => a.timestamp - b.timestamp
        )[0];
        if (oldest) return { budget: name, key: oldest[0] };
      }
    }
    return null;
  }

  private _evict(
    target: { budget: string; key: string } | null,
    _strategy: EvictionStrategy
  ): void {
    if (!target) return;
    this.release(target.budget, target.key);
  }

  private _evictBudget(
    budget: MemoryBudget,
    neededBytes: number,
    _strategy: EvictionStrategy
  ): void {
    const sorted = [...budget.items.entries()].sort(([, a], [, b]) => a.timestamp - b.timestamp);
    for (const [key] of sorted) {
      if (budget.currentBytes <= budget.maxBytes - neededBytes) break;
      this.release(budget.name, key);
    }
  }

  private _enforceBudgets(): void {
    for (const [, budget] of this._budgets) {
      if (budget.currentBytes > budget.maxBytes) {
        this._evictBudget(budget, 0, 'lru');
      }
    }
    if (this._totalBytes > this._maxTotalBytes) {
      this._evict(this._evictionTarget(this._totalBytes - this._maxTotalBytes), 'lru');
    }
  }

  getStats(): {
    totalBytes: number;
    maxBytes: number;
    budgets: { name: string; bytes: number; max: number; items: number }[];
  } {
    return {
      totalBytes: this._totalBytes,
      maxBytes: this._maxTotalBytes,
      budgets: [...this._budgets.values()].map((b) => ({
        name: b.name,
        bytes: b.currentBytes,
        max: b.maxBytes,
        items: b.items.size,
      })),
    };
  }

  cleanup(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
    this.releaseAll('cleanup');
    this._budgets.clear();
    this._totalBytes = 0;
    this._initialized = false;
  }
}

export const memoryManager = MemoryManagerClass.getInstance();
