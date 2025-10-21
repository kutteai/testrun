class EventEmitter {
  constructor() {
    this._events = {};
    this._maxListeners = 10;
    this._captureRejections = true;
  }

  setMaxListeners(n) {
    this._maxListeners = n;
    return this;
  }

  getMaxListeners() {
    return this._maxListeners;
  }

  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }

    if (this._events[event].length >= this._maxListeners) {
      // eslint-disable-next-line no-console
      console.warn('MaxListenersExceededWarning: Possible EventEmitter memory leak detected.');
    }

    this._events[event].push(listener);
    return this;
  }

  addListener(event, listener) {
    return this.on(event, listener);
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      this.removeListener(event, onceWrapper);
      listener.apply(this, args);
    };
    onceWrapper.listener = listener;
    return this.on(event, onceWrapper);
  }

  prependListener(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].unshift(listener);
    return this;
  }

  prependOnceListener(event, listener) {
    const onceWrapper = (...args) => {
      this.removeListener(event, onceWrapper);
      listener.apply(this, args);
    };
    onceWrapper.listener = listener;
    return this.prependListener(event, onceWrapper);
  }

  removeListener(event, listener) {
    if (!this._events[event]) return this;

    const index = this._events[event].findIndex((l) => l === listener || l.listener === listener);
    if (index > -1) {
      this._events[event].splice(index, 1);
    }

    if (this._events[event].length === 0) {
      delete this._events[event];
    }

    return this;
  }

  off(event, listener) {
    return this.removeListener(event, listener);
  }

  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }

  listeners(event) {
    return this._events[event] ? [...this._events[event]] : [];
  }

  rawListeners(event) {
    return this.listeners(event);
  }

  listenerCount(event) {
    return this._events[event] ? this._events[event].length : 0;
  }

  eventNames() {
    return Object.keys(this._events);
  }

  emit(event, ...args) {
    if (!this._events[event]) return false;

    const listeners = [...this._events[event]];

    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        if (this._captureRejections && event !== 'error') {
          this.emit('error', error);
        } else {
          // eslint-disable-next-line no-console
          console.error('Error in event listener:', error);
        }
      }
    }

    return listeners.length > 0;
  }
}

export { EventEmitter };
