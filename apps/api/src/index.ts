import 'dotenv/config';
import { createApp } from './app.js';
import { syncAllInstanceStatuses } from './routes/instances.js';

/**
 * Start the FasterClaw API server
 */
async function start() {
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    const app = await createApp();

    await app.listen({
      port,
      host,
    });

    console.log(`
🚀 FasterClaw API is running!

  Local:            http://localhost:${port}
  Network:          http://${host}:${port}
  Health check:     http://localhost:${port}/health
  API docs:         http://localhost:${port}/docs

Environment: ${process.env.NODE_ENV || 'development'}
`);

    // Start background status sync every 60 seconds
    const SYNC_INTERVAL_MS = 60_000;
    const syncInterval = setInterval(() => {
      syncAllInstanceStatuses(app.log).catch((err) => {
        app.log.error(err, 'Background status sync failed');
      });
    }, SYNC_INTERVAL_MS);

    // Graceful shutdown
    const shutdown = async () => {
      clearInterval(syncInterval);
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
