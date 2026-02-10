// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import rootConfig from "../../eslint.config.js";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Inherit root configuration
  ...rootConfig,

  // Node.js/API specific configuration
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // API-specific overrides
      "no-console": "off", // Servers use console for logging
    },
  },

  // Test files - relaxed rules for mocking patterns
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
    rules: {
      // Allow unbound methods in tests (vi.mocked patterns)
      "@typescript-eslint/unbound-method": "off",
      // Allow unsafe type operations in test mocks
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      // Allow explicit any in test mocks
      "@typescript-eslint/no-explicit-any": "off",
      // Allow non-null assertions in tests
      "@typescript-eslint/no-non-null-assertion": "off",
      // Allow async functions without await in mock implementations
      "@typescript-eslint/require-await": "off",
    },
  },

  // Ignore build output and config files
  {
    ignores: ["dist/**", "vitest.config.ts"],
  },
];
