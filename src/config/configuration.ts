export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/vitrina-check',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },
  playwright: {
    userAgent:
      process.env.PLAYWRIGHT_USER_AGENT ??
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    retryCountDefault:
      parseInt(process.env.PLAYWRIGHT_RETRY_COUNT_DEFAULT || '1', 10) || 1,
    navigationTimeoutMs:
      parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS || '60000', 10) ||
      60000,
    networkIdleTimeoutMs:
      parseInt(process.env.PLAYWRIGHT_NETWORK_IDLE_TIMEOUT_MS || '10000', 10) ||
      10000,
    stabilizeDelayMs:
      parseInt(process.env.PLAYWRIGHT_STABILIZE_DELAY_MS || '1200', 10) || 1200,
    restartEvery:
      parseInt(process.env.PLAYWRIGHT_RESTART_EVERY || '100', 10) || 100,
    maxConcurrency:
      parseInt(process.env.PLAYWRIGHT_MAX_CONCURRENCY || '2', 10) || 2,
  },
  dispatchScheduler: {
    pollIntervalMinutes:
      // parseInt(process.env.DISPATCH_SCHEDULER_POLL_INTERVAL_MINUTES || '10', 10) ||
      1,
  },
});
