import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts", // Entry point
        "src/app.ts", // App bootstrap - integration tested
        "src/plugins/**", // Plugin configuration - integration tested
        "src/routes/google-auth.ts", // OAuth plugin - integration tested
        "src/types/**", // Type definitions only
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    setupFiles: ["./src/test/setup.ts"],
  },
});
