const slowRouteThresholdMs = 5_000;

export async function observeRoute<T>(route: string, action: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    return await action();
  } finally {
    const durationMs = Date.now() - startedAt;
    if (durationMs >= slowRouteThresholdMs) {
      console.info(JSON.stringify({
        event: "browser.route.slow",
        route,
        durationMs,
        workerIndex: process.env.TEST_WORKER_INDEX ?? "unknown",
      }));
    }
  }
}
