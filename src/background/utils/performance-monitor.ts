class PerformanceMonitor {
  private metrics = new Map<string, { count: number; totalTime: number; lastCall: number }>();
  public logBuffer: string[] = [];
  private maxLogBufferSize = 500;

  recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { count: 0, totalTime: 0, lastCall: 0 });
    }
    const metric = this.metrics.get(name)!;
    metric.count++;
    metric.totalTime += duration;
    metric.lastCall = Date.now();
  }

  getMetrics(): any {
    const stats: any = {};
    this.metrics.forEach((value, key) => {
      stats[key] = {
        count: value.count,
        avgTime: value.count > 0 ? value.totalTime / value.count : 0,
        totalTime: value.totalTime,
        lastCall: value.lastCall,
      };
    });
    return stats;
  }

  log(message: string, level = 'info', context?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${context ? JSON.stringify(context) : ''}`;
    if (this.logBuffer.length >= this.maxLogBufferSize) {
      this.logBuffer.shift();
    }
    this.logBuffer.push(logEntry);
  }

  getRecentLogs(limit = 100): string[] {
    return this.logBuffer.slice(-limit);
  }
}

export { PerformanceMonitor };
