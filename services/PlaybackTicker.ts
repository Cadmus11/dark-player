export interface ThrottledPosition {
  position: number;
  duration: number;
  progress: number;
  timestamp: number;
}

let _rafId: number | null = null;
let _lastPosition = 0;
let _lastDuration = 0;
let _listeners = new Set<(pos: ThrottledPosition) => void>();
let _enabled = false;

function _tick() {
  if (!_enabled) return;
  _rafId = requestAnimationFrame(_tick);
  const now = Date.now();
  _listeners.forEach((cb) =>
    cb({
      position: _lastPosition,
      duration: _lastDuration,
      progress: _lastDuration > 0 ? _lastPosition / _lastDuration : 0,
      timestamp: now,
    })
  );
}

export const PlaybackTicker = {
  start(listener: (pos: ThrottledPosition) => void): () => void {
    _listeners.add(listener);
    if (!_enabled) {
      _enabled = true;
      _tick();
    }
    return () => {
      _listeners.delete(listener);
      if (_listeners.size === 0) {
        _enabled = false;
        if (_rafId !== null) {
          cancelAnimationFrame(_rafId);
          _rafId = null;
        }
      }
    };
  },

  updatePosition(position: number, duration: number): void {
    _lastPosition = position;
    _lastDuration = duration;
  },

  reset(): void {
    _lastPosition = 0;
    _lastDuration = 0;
  },

  getCurrent(): ThrottledPosition {
    return {
      position: _lastPosition,
      duration: _lastDuration,
      progress: _lastDuration > 0 ? _lastPosition / _lastDuration : 0,
      timestamp: Date.now(),
    };
  },
};
