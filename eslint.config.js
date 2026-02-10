// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

/** @type {import("typescript-eslint").Config} */
export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/prisma/generated/**",
      "**/assets/**",
      "**/vendor/**",
      "**/Swabble/**",
      "**/extensions/**",
      "**/skills/**",
      "**/patches/**",
      // Test files - vitest patterns conflict with strict type-checking
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/test/**",
      // Config files not in tsconfig
      "**/vitest.config.ts",
      "**/vitest.*.ts",
      // Generated files
      "**/generated/**",
    ],
  },

  // Base ESLint recommended rules (for all files)
  eslint.configs.recommended,

  // Prettier compatibility - disables conflicting rules
  eslintConfigPrettier,

  // TypeScript files configuration with type-checked rules
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // JavaScript rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      curly: "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      "default-case": "error",
      "consistent-return": "error",
    },
  },

  // JavaScript files configuration (no type-checking)
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      curly: "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      "default-case": "error",
      "consistent-return": "error",
    },
  }
);
