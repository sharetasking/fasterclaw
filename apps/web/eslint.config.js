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

  // React/Browser specific configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        React: "readonly",
        JSX: "readonly",
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Disable rules that conflict with Next.js patterns
      "@typescript-eslint/require-await": "off", // Server actions don't always need await

      // =================================================================
      // ARCHITECTURAL RULES - Enforce zod-first, server-action patterns
      // =================================================================

      // Ban direct fetch() in client components - use server actions instead
      // Allowed in: src/actions/*, src/lib/api-client.ts, src/lib/uploads.ts
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "Don't use fetch() directly in components. Use server actions from src/actions/ or the API client from src/lib/api-client.ts instead.",
        },
      ],

      // Enforce importing types/schemas from @fasterclaw/shared or @fasterclaw/api-client
      // Ban local type definitions that should be centralized (but allow Next.js generated types)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Ban relative imports from types folders in our codebase
              group: [
                "./types",
                "./types/*",
                "../types",
                "../types/*",
                "../../types",
                "../../types/*",
              ],
              message:
                "Import types from @fasterclaw/shared or @fasterclaw/api-client instead of local type files.",
            },
            {
              // Ban importing from @/types if we ever create such a folder
              group: ["@/types", "@/types/*"],
              message:
                "Import types from @fasterclaw/shared or @fasterclaw/api-client instead of local type files.",
            },
          ],
        },
      ],
    },
  },

  // Server actions and API utilities - allow fetch()
  {
    files: ["src/actions/**/*.ts", "src/lib/api-client.ts", "src/lib/api.ts", "src/lib/uploads.ts"],
    rules: {
      "no-restricted-globals": "off", // Allow fetch in server actions and API utilities
    },
  },

  // Ignore Next.js build output
  {
    ignores: [".next/**", "out/**"],
  },
];
