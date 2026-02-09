import { createApp } from './app.js';

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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

start();
