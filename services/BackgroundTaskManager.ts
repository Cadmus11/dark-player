type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

interface Task {
  id: string;
  priority: TaskPriority;
  fn: () => Promise<void>;
  cancel: () => void;
  enqueuedAt: number;
  startedAt?: number;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

class BackgroundTaskManagerClass {
  private static instance: BackgroundTaskManagerClass;
  private _queue: Task[] = [];
  private _running = new Map<string, Task>();
  private _maxConcurrent = 2;
  private _processing = false;
  private _paused = false;
  private _taskIdCounter = 0;

  static getInstance(): BackgroundTaskManagerClass {
    if (!BackgroundTaskManagerClass.instance) {
      BackgroundTaskManagerClass.instance = new BackgroundTaskManagerClass();
    }
    return BackgroundTaskManagerClass.instance;
  }

  enqueue(
    fn: () => Promise<void>,
    options: { priority?: TaskPriority; cancel?: () => void } = {}
  ): string {
    const id = `task_${++this._taskIdCounter}`;
    const task: Task = {
      id,
      priority: options.priority || 'normal',
      fn,
      cancel: options.cancel || (() => {}),
      enqueuedAt: Date.now(),
    };
    this._queue.push(task);
    this._queue.sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.enqueuedAt - b.enqueuedAt
    );
    this._processNext();
    return id;
  }

  cancel(taskId: string): boolean {
    const idx = this._queue.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      this._queue[idx].cancel();
      this._queue.splice(idx, 1);
      return true;
    }
    const running = this._running.get(taskId);
    if (running) {
      running.cancel();
      this._running.delete(taskId);
      return true;
    }
    return false;
  }

  cancelAll(): void {
    for (const task of this._queue) task.cancel();
    for (const task of this._running.values()) task.cancel();
    this._queue = [];
    this._running.clear();
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    this._paused = false;
    this._processNext();
  }

  setMaxConcurrent(max: number): void {
    this._maxConcurrent = max;
    this._processNext();
  }

  get queueLength(): number {
    return this._queue.length;
  }

  get runningCount(): number {
    return this._running.size;
  }

  get isIdle(): boolean {
    return this._queue.length === 0 && this._running.size === 0;
  }

  private async _processNext(): Promise<void> {
    if (this._paused) return;
    if (this._running.size >= this._maxConcurrent) return;
    if (this._queue.length === 0) return;

    const task = this._queue.shift()!;
    task.startedAt = Date.now();
    this._running.set(task.id, task);

    try {
      await task.fn();
    } catch (e) {
      console.warn(`[BackgroundTaskManager] Task ${task.id} failed:`, e);
    } finally {
      this._running.delete(task.id);
      this._processNext();
    }
  }
}

export const backgroundTaskManager = BackgroundTaskManagerClass.getInstance();
