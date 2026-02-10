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

  // Database package specific configuration
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

  // Ignore Prisma generated files and build output
  {
    ignores: ["dist/**", "prisma/generated/**"],
  },
];
