import { createApp } from "./app.js";

/**
 * Start the FasterClaw API server
 */
async function start(): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    const app = await createApp();

    await app.listen({
      port,
      host,
    });

    // eslint-disable-next-line no-console -- Server startup message
    console.log(`
🚀 FasterClaw API is running!

  Local:            http://localhost:${String(port)}
  Network:          http://${host}:${String(port)}
  Health check:     http://localhost:${String(port)}/health
  API docs:         http://localhost:${String(port)}/docs

Environment: ${process.env.NODE_ENV ?? "development"}
`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  // eslint-disable-next-line no-console -- Shutdown signal logging
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  // eslint-disable-next-line no-console -- Shutdown signal logging
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

void start();
