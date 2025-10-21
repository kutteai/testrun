export const performanceMonitor = {
  startTime: Date.now(),
  messageCount: 0,
  errorCount: 0,

  logMessage() {
    this.messageCount++;
  },

  logError() {
    this.errorCount++;
  },

  getStats() {
    const uptime = Date.now() - this.startTime;
    return {
      uptime,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      errorRate: this.errorCount / Math.max(this.messageCount, 1),
      messagesPerMinute: (this.messageCount / uptime) * 60000,
    };
  },
};
