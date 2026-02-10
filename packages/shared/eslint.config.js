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

  // Shared package specific configuration
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
  },

  // Ignore build output and config files
  {
    ignores: ["dist/**", "vitest.config.ts"],
  },
];
