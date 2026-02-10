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
    },
  },

  // Ignore Next.js build output
  {
    ignores: [".next/**", "out/**"],
  },
];
