# Product Requirements Document: Linting Strategy for TypeScript Monorepos

## 1. Overview

### Purpose

This document defines a comprehensive, production-ready linting strategy designed for TypeScript monorepos. The strategy enforces code quality, consistency, and type safety across multiple packages while maintaining developer productivity through automated formatting and pre-commit hooks.

### Goals

1. **Type Safety**: Enforce strict TypeScript rules to catch potential runtime errors at compile time
2. **Code Consistency**: Maintain uniform code style across all packages in the monorepo
3. **Developer Experience**: Provide fast feedback through IDE integration and pre-commit hooks
4. **Scalability**: Support package-specific configurations while maintaining root-level consistency
5. **Automation**: Automatically fix issues when possible, reducing manual intervention

### Target Projects

- TypeScript monorepos using pnpm workspaces or npm/yarn workspaces
- Projects with Next.js applications
- Projects with Node.js APIs (Express, Fastify, etc.)
- Shared packages and libraries
- Database packages (Prisma, Drizzle, etc.)

## 2. Tech Stack

### Core Technologies

- **ESLint 9.18+** with flat config system (`eslint.config.js`)
- **TypeScript ESLint 8.20+** for TypeScript-specific linting
- **Prettier 3.4+** for code formatting
- **Husky 9.1+** for Git hooks
- **lint-staged 15.3+** for running linters on staged files
- **Turbo** (optional) for monorepo task orchestration

### Why These Tools?

#### ESLint 9 Flat Config

- Modern configuration system that replaces `.eslintrc.json`
- Better performance with simplified config resolution
- Type-safe configuration with TypeScript support
- Easier to compose and extend configurations

#### TypeScript ESLint

- Type-aware linting rules that understand TypeScript's type system
- Strict and stylistic rule presets
- Essential for catching type-related bugs

#### Prettier

- Opinionated formatter that eliminates style debates
- Integrates with ESLint to avoid conflicts
- Fast and reliable

#### Husky + lint-staged

- Prevents bad code from being committed
- Only lints changed files for speed
- Provides instant feedback to developers

## 3. ESLint Configuration

### 3.1 Root Configuration (`eslint.config.js`)

The root configuration provides base rules that apply to all packages:

```javascript
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
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Prettier compatibility
  eslintConfigPrettier,

  // TypeScript files configuration
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
      // TypeScript rules (explained below)
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

  // JavaScript files configuration
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
```

### 3.2 ESLint Rules Explained

#### TypeScript Strict Rules

##### `@typescript-eslint/no-unused-vars`

**Why**: Prevents dead code and catches typos in variable names.
**Configuration**: Allow unused variables/args prefixed with `_` for required but unused parameters (e.g., middleware).

```typescript
// ✅ Good
function middleware(_req: Request, res: Response) {}
// ❌ Bad
function handler(req: Request, res: Response) {} // req is unused
```

##### `@typescript-eslint/no-explicit-any`

**Why**: The `any` type defeats the purpose of TypeScript by disabling type checking.
**Alternative**: Use `unknown` for truly dynamic types and narrow with type guards.

```typescript
// ✅ Good
function parse(data: unknown) {
  if (typeof data === "string") {
    return data.toUpperCase();
  }
}
// ❌ Bad
function parse(data: any) {
  return data.toUpperCase();
}
```

##### `@typescript-eslint/no-non-null-assertion`

**Why**: Non-null assertions (`!`) bypass type safety and can cause runtime errors.
**Alternative**: Use optional chaining, nullish coalescing, or type guards.

```typescript
// ✅ Good
const name = user?.name ?? "Guest";
// ❌ Bad
const name = user!.name;
```

##### `@typescript-eslint/no-unsafe-*` Rules

**Why**: These rules prevent operations on `any` typed values that could fail at runtime.
**Rules**:

- `no-unsafe-assignment`: Prevents assigning `any` to typed variables
- `no-unsafe-call`: Prevents calling `any` as a function
- `no-unsafe-member-access`: Prevents accessing properties on `any`
- `no-unsafe-return`: Prevents returning `any` from typed functions
- `no-unsafe-argument`: Prevents passing `any` to typed parameters

```typescript
// ✅ Good
function getUser(id: string): User {
  const data = JSON.parse(response) as User;
  return data;
}
// ❌ Bad
function getUser(id: string): User {
  const data = JSON.parse(response); // data is any
  return data; // unsafe return
}
```

##### `@typescript-eslint/strict-boolean-expressions`

**Why**: Prevents unexpected falsy values in conditions (0, "", etc.).
**Alternative**: Explicitly check for the condition you care about.

```typescript
// ✅ Good
if (count > 0) {
}
if (name !== "") {
}
if (user !== null) {
}
// ❌ Bad
if (count) {
} // 0 is falsy
if (name) {
} // "" is falsy
if (user) {
} // could be null, undefined, 0, ""
```

##### `@typescript-eslint/no-floating-promises`

**Why**: Unhandled promise rejections can crash Node.js applications.
**Alternative**: Always `await` promises or use `.catch()`.

```typescript
// ✅ Good
await fetchData();
fetchData().catch(console.error);
void fetchData(); // explicitly ignore
// ❌ Bad
fetchData(); // promise is floating
```

##### `@typescript-eslint/require-await`

**Why**: Functions declared as `async` should use `await`, otherwise `async` is unnecessary.

```typescript
// ✅ Good
async function fetchUser() {
  return await fetch("/user");
}
// ❌ Bad
async function getUser() {
  return { id: 1 }; // no await, no need for async
}
```

##### `@typescript-eslint/explicit-function-return-type` (OFF)

**Why Disabled**: TypeScript's inference is excellent. Requiring explicit return types adds noise without significant benefit in most cases. Enable in specific packages if needed.

##### `@typescript-eslint/explicit-module-boundary-types` (OFF)

**Why Disabled**: Similar to above. Internal functions don't need explicit types. Public API functions should have them, but this can be enforced through code review.

#### JavaScript Rules

##### `no-console` (warn, allow warn/error)

**Why**: Prevents accidental `console.log` in production code while allowing intentional logging.
**Override**: Disable in API packages where console logging is appropriate.

```typescript
// ✅ Good
console.warn("Deprecation warning");
console.error("Failed to connect");
logger.info("User logged in"); // use proper logger
// ⚠️ Warning
console.log("debug"); // use debugger or remove
```

##### `curly` (error)

**Why**: Enforces braces for all control statements, preventing bugs from accidental semicolons or ASI.

```typescript
// ✅ Good
if (condition) {
  doSomething();
}
// ❌ Bad
if (condition) doSomething();
```

##### `eqeqeq` (error, allow null comparison)

**Why**: `==` causes type coercion bugs. Always use `===` except for null/undefined checks.

```typescript
// ✅ Good
if (value === 0) {
}
if (value == null) {
} // checks both null and undefined
// ❌ Bad
if (value == 0) {
} // "0" == 0 is true
```

##### `no-var` (error)

**Why**: `var` has confusing function-scope. Use `let` or `const`.

```typescript
// ✅ Good
const name = "John";
let count = 0;
// ❌ Bad
var name = "John";
```

##### `prefer-const` (error)

**Why**: Variables that never change should be `const` for clarity and safety.

```typescript
// ✅ Good
const maxRetries = 3;
// ❌ Bad
let maxRetries = 3; // never reassigned
```

##### `default-case` (error)

**Why**: Ensures all switch statements handle unexpected values.

```typescript
// ✅ Good
switch (status) {
  case "pending":
    return "yellow";
  case "complete":
    return "green";
  default:
    return "gray";
}
// ❌ Bad
switch (status) {
  case "pending":
    return "yellow";
  case "complete":
    return "green";
  // what if status is 'error'?
}
```

##### `consistent-return` (error)

**Why**: Functions should either always return a value or never return a value.

```typescript
// ✅ Good
function getStatus(code: number): string {
  if (code === 200) return "OK";
  return "ERROR";
}
// ❌ Bad
function getStatus(code: number): string {
  if (code === 200) return "OK";
  // implicitly returns undefined
}
```

## 4. Prettier Configuration

### 4.1 Settings (`.prettierrc.json`)

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 4.2 Settings Explained

##### `semi: true`

**Why**: Semicolons prevent ASI (Automatic Semicolon Insertion) bugs and make code more explicit.

##### `singleQuote: false`

**Why**: Double quotes are the JSON standard and avoid escaping in HTML/JSX attributes.

##### `tabWidth: 2`

**Why**: Balances readability with horizontal space. Standard in the JS ecosystem.

##### `trailingComma: "es5"`

**Why**: Trailing commas in arrays/objects make diffs cleaner when adding items. ES5 support is universal.

##### `printWidth: 100`

**Why**: Modern screens are wider than 80 chars. 100 is a good balance for readability on wide monitors.

##### `bracketSpacing: true`

**Why**: `{ foo: bar }` is more readable than `{foo: bar}`.

##### `arrowParens: "always"`

**Why**: Consistent style. `(x) => x` vs `x => x`. Also required when adding types: `(x: number) => x`.

##### `endOfLine: "lf"`

**Why**: Unix line endings work everywhere. Prevents Windows CRLF issues in repos.

### 4.3 Prettier Ignore (`.prettierignore`)

```
node_modules
dist
.next
.turbo
coverage
pnpm-lock.yaml
*.min.js
*.min.css
packages/db/prisma/generated
```

**Why**: Don't format generated files, dependencies, or build output. It's wasteful and can break generated code.

## 5. EditorConfig

### 5.1 Configuration (`.editorconfig`)

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2

[Makefile]
indent_style = tab
```

### 5.2 Purpose

EditorConfig ensures consistent file formatting across different editors and IDEs before Prettier runs. It's especially useful for developers using editors without Prettier plugins.

## 6. Pre-commit Hooks (Husky + lint-staged)

### 6.1 Husky Setup

**File**: `.husky/pre-commit`

```bash
pnpm exec lint-staged
```

**Purpose**: Runs lint-staged on every commit to ensure only properly formatted and linted code is committed.

### 6.2 lint-staged Configuration

**File**: `package.json`

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css,scss}": ["prettier --write"]
  }
}
```

**How it works**:

1. Developer commits files
2. Husky triggers pre-commit hook
3. lint-staged identifies staged files
4. For JS/TS files: ESLint fixes issues, then Prettier formats
5. For other files: Prettier formats
6. Fixed files are automatically added to the commit
7. Commit proceeds if no unfixable errors

**Benefits**:

- Only changed files are linted (fast)
- Automatic fixes reduce manual work
- Bad code never enters the repository
- Enforces consistency across team

## 7. Package-Specific Configurations

### 7.1 Next.js Application (`apps/web/eslint.config.js`)

```javascript
// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import rootConfig from "../../eslint.config.js";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...rootConfig,

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
      // Next.js Server Actions don't always need await
      "@typescript-eslint/require-await": "off",
    },
  },

  {
    ignores: [".next/**", "out/**"],
  },
];
```

**Key Points**:

- Inherits root config with `...rootConfig`
- Adds browser globals
- Enables JSX support
- Disables `require-await` for Next.js Server Actions
- Ignores Next.js build output

### 7.2 Node.js API (`apps/api/eslint.config.js`)

```javascript
// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import rootConfig from "../../eslint.config.js";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...rootConfig,

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
      // Servers use console for logging
      "no-console": "off",
    },
  },

  {
    ignores: ["dist/**"],
  },
];
```

**Key Points**:

- Inherits root config
- Node.js globals only (no browser)
- Allows console logging (servers need it)
- Ignores build output

### 7.3 Database Package (`packages/db/eslint.config.js`)

```javascript
// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import rootConfig from "../../eslint.config.js";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...rootConfig,

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

  {
    ignores: ["dist/**", "prisma/generated/**"],
  },
];
```

**Key Points**:

- Inherits root config
- Ignores Prisma generated files
- No special rule overrides needed

### 7.4 Shared Package (`packages/shared/eslint.config.js`)

```javascript
// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import rootConfig from "../../eslint.config.js";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...rootConfig,

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

  {
    ignores: ["dist/**"],
  },
];
```

**Key Points**:

- Pure TypeScript configuration
- No framework-specific overrides
- Suitable for shared utilities and types

## 8. Dependencies

### 8.1 Root Package (`package.json`)

```json
{
  "devDependencies": {
    "@eslint/js": "^9.18.0",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "globals": "^15.14.0",
    "husky": "^9.1.7",
    "lint-staged": "^15.3.0",
    "prettier": "^3.4.2",
    "turbo": "^2.3.0",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.20.0"
  }
}
```

### 8.2 Package-Level Dependencies

Each package needs:

```json
{
  "devDependencies": {
    "eslint": "^9",
    "globals": "^15.14.0",
    "typescript": "^5.7.2"
  }
}
```

**Why**: ESLint needs to be available in each package for IDE integration and package-specific linting.

### 8.3 Complete Dependency List with Explanations

| Package                  | Version  | Purpose                                                    |
| ------------------------ | -------- | ---------------------------------------------------------- |
| `eslint`                 | ^9.18.0  | Core linting engine                                        |
| `@eslint/js`             | ^9.18.0  | Official ESLint JavaScript rules                           |
| `typescript-eslint`      | ^8.20.0  | TypeScript parser and rules for ESLint                     |
| `eslint-config-prettier` | ^10.0.1  | Disables ESLint rules that conflict with Prettier          |
| `prettier`               | ^3.4.2   | Code formatter                                             |
| `globals`                | ^15.14.0 | Provides global variable definitions (browser, node, etc.) |
| `husky`                  | ^9.1.7   | Git hooks manager                                          |
| `lint-staged`            | ^15.3.0  | Runs linters on staged files                               |
| `typescript`             | ^5.7.2   | TypeScript compiler (needed for type-aware linting)        |
| `turbo`                  | ^2.3.0   | Monorepo task runner (optional but recommended)            |

## 9. npm Scripts

### 9.1 Root Package Scripts

```json
{
  "scripts": {
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "prepare": "husky"
  }
}
```

**Scripts Explained**:

- `lint`: Check all packages for lint errors (fails CI on errors)
- `lint:fix`: Automatically fix lint errors across all packages
- `format`: Check if files are formatted correctly (for CI)
- `format:fix`: Format all files with Prettier
- `prepare`: Install Husky hooks after `npm install`

### 9.2 Package-Level Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

## 10. Turbo Integration (Optional)

### 10.1 Configuration (`turbo.json`)

```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^build"],
      "inputs": [
        "**/*.ts",
        "**/*.tsx",
        "**/*.js",
        "**/*.jsx",
        "**/*.mjs",
        "**/*.cjs",
        "eslint.config.js",
        "../../eslint.config.js"
      ],
      "outputs": []
    },
    "lint:fix": {
      "dependsOn": ["^build"],
      "cache": false
    }
  }
}
```

**Benefits**:

- Parallel linting across packages
- Caches lint results (only re-lint changed files)
- Ensures dependencies are built before linting
- Faster CI/CD pipelines

## 11. Implementation Steps

### Step 1: Initialize Project (if new)

```bash
pnpm init
pnpm add -D typescript
```

### Step 2: Install Root Dependencies

```bash
pnpm add -D \
  eslint@^9.18.0 \
  @eslint/js@^9.18.0 \
  typescript-eslint@^8.20.0 \
  eslint-config-prettier@^10.0.1 \
  prettier@^3.4.2 \
  globals@^15.14.0 \
  husky@^9.1.7 \
  lint-staged@^15.3.0 \
  turbo@^2.3.0
```

### Step 3: Create Configuration Files

#### Create `eslint.config.js`

Copy the root configuration from Section 3.1.

#### Create `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

#### Create `.prettierignore`

```
node_modules
dist
.next
.turbo
coverage
pnpm-lock.yaml
*.min.js
*.min.css
```

#### Create `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### Step 4: Setup Husky

```bash
# Initialize Husky
pnpm exec husky init

# Create pre-commit hook
echo "pnpm exec lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Step 5: Add lint-staged to package.json

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css,scss}": ["prettier --write"]
  }
}
```

### Step 6: Add Scripts to Root package.json

```json
{
  "scripts": {
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "prepare": "husky"
  }
}
```

### Step 7: Setup Package-Specific Configs

For each package, create an `eslint.config.js`:

**Next.js apps**:

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import rootConfig from "../../eslint.config.js";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...rootConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: { ...globals.browser, React: "readonly", JSX: "readonly" },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },
  { ignores: [".next/**", "out/**"] },
];
```

**Node.js APIs**:

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import rootConfig from "../../eslint.config.js";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...rootConfig,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  { ignores: ["dist/**"] },
];
```

### Step 8: Add Package Scripts

In each package's `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "eslint": "^9",
    "globals": "^15.14.0",
    "typescript": "^5.7.2"
  }
}
```

### Step 9: Configure Turbo (Optional)

Create `turbo.json`:

```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^build"],
      "inputs": [
        "**/*.ts",
        "**/*.tsx",
        "**/*.js",
        "**/*.jsx",
        "**/*.mjs",
        "**/*.cjs",
        "eslint.config.js",
        "../../eslint.config.js"
      ],
      "outputs": []
    },
    "lint:fix": {
      "dependsOn": ["^build"],
      "cache": false
    }
  }
}
```

### Step 10: Run Initial Format

```bash
# Format all existing code
pnpm format:fix

# Fix all auto-fixable lint errors
pnpm lint:fix
```

### Step 11: Commit Configuration

```bash
git add .
git commit -m "Add linting strategy with ESLint 9, Prettier, and Husky"
```

### Step 12: Configure IDE (VS Code)

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"]
}
```

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig"
  ]
}
```

## 12. Troubleshooting

### Issue 1: ESLint can't find tsconfig.json

**Error**:

```
Parsing error: Cannot read file 'tsconfig.json'
```

**Solution**:
Ensure each package with TypeScript has a `tsconfig.json` and that `tsconfigRootDir` is correctly set:

```javascript
parserOptions: {
  projectService: true,
  tsconfigRootDir: __dirname,
}
```

### Issue 2: ESLint is slow

**Cause**: Type-aware linting requires TypeScript compilation.

**Solutions**:

1. Use Turbo to cache results
2. Exclude large directories in `ignores`
3. For very large monorepos, consider disabling type-aware rules in some packages
4. Use `projectService: true` instead of `project: ["./tsconfig.json"]` for better performance

### Issue 3: Prettier and ESLint conflicts

**Error**:

```
Delete `␍` prettier/prettier
```

**Solution**:
Ensure `eslint-config-prettier` is included AFTER other configs:

```javascript
export default tseslint.config(
  eslint.configs.recommended,
  eslintConfigPrettier // Must be last
);
```

### Issue 4: Pre-commit hook not running

**Solutions**:

1. Ensure Husky is installed: `pnpm prepare`
2. Check hook is executable: `chmod +x .husky/pre-commit`
3. Verify Git hooks path: `git config core.hooksPath`
4. Try manual installation: `pnpm exec husky install`

### Issue 5: lint-staged not finding files

**Cause**: Wrong package manager or glob patterns.

**Solution**:
Use `pnpm exec lint-staged` (not `npx`) in Husky hook if using pnpm.

### Issue 6: "Unsafe" errors everywhere in existing code

**Issue**: Strict TypeScript rules flag existing code with `any` types.

**Solutions**:

1. **Gradual adoption**: Disable unsafe rules initially, enable package-by-package
2. **Add type assertions**: Use `as` to add types to untyped data
3. **Add JSDoc types**: Temporary solution while migrating to full TypeScript
4. **Enable per-package**: Strict rules in new code, relaxed in legacy code

Example gradual config:

```javascript
// packages/legacy/eslint.config.js
export default [
  ...rootConfig,
  {
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
];
```

### Issue 7: Monorepo performance issues

**Symptoms**: `turbo lint` is slow or times out.

**Solutions**:

1. Add more specific `inputs` to Turbo config
2. Increase parallel tasks: `turbo lint --concurrency=10`
3. Use `--filter` for specific packages: `turbo lint --filter=@myapp/api`
4. Cache Turbo results in CI

### Issue 8: ESLint can't resolve imports

**Error**:

```
Unable to resolve path to module '@/lib/utils'
```

**Solution**:
This is a parsing issue, not a linting one. TypeScript handles imports. If needed, add `import/resolver` plugin, but it's usually unnecessary with TypeScript.

### Issue 9: Different line endings (Windows)

**Error**:

```
Expected linebreaks to be 'LF' but found 'CRLF'
```

**Solution**:
Configure Git to use LF:

```bash
git config --global core.autocrlf input
```

Then reconvert files:

```bash
git rm --cached -r .
git reset --hard
```

### Issue 10: Husky hooks not working in GUI Git clients

**Cause**: GUI clients may not respect Git hooks or use different Node versions.

**Solution**:

1. Use command-line Git for commits
2. Or configure GUI to use system Node: Depends on the GUI client
3. Or add CI checks as backup enforcement

## 13. CI/CD Integration

### GitHub Actions Example

```yaml
name: Lint

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run type checking
        run: pnpm typecheck

      - name: Run linting
        run: pnpm lint

      - name: Check formatting
        run: pnpm format
```

## 14. Benefits Summary

### For Developers

- Automatic code formatting (no debates)
- Instant feedback via IDE
- Catch bugs before runtime
- Consistent code style across team

### For Teams

- Easier code reviews (focus on logic, not style)
- Onboarding: new devs follow existing patterns
- Reduced bugs in production
- Self-documenting code (strict types = documentation)

### For Projects

- Maintainability: consistent code is easier to understand
- Scalability: works for any size monorepo
- Type safety: catch errors at compile time
- Automation: less manual work, more building

## 15. Customization Guide

### When to Relax Rules

#### Development Speed vs. Safety Tradeoff

- **Prototypes**: Disable strict rules for rapid development
- **Legacy code**: Gradually enable strict rules
- **Test files**: Consider relaxing some rules in `*.test.ts` files

#### Per-Package Customization

```javascript
// packages/experimental/eslint.config.js
export default [
  ...rootConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // downgrade to warning
    },
  },
];
```

#### Per-File Overrides

```javascript
export default [
  ...rootConfig,
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off", // mocks use any types
    },
  },
];
```

### Adding New Rules

#### Research First

1. Check if rule is already in `strictTypeChecked`
2. Read rule documentation on typescript-eslint.io
3. Test on existing code: `eslint . --rule "new-rule: error"`

#### Add Incrementally

1. Start with "warn" level
2. Fix existing violations
3. Upgrade to "error"

#### Example: Adding import sorting

```bash
pnpm add -D eslint-plugin-import
```

```javascript
import importPlugin from "eslint-plugin-import";

export default [
  ...rootConfig,
  importPlugin.flatConfigs.recommended,
  {
    rules: {
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],
    },
  },
];
```

## 16. Migration from ESLint 8

### Breaking Changes

1. `.eslintrc.json` → `eslint.config.js` (flat config)
2. Different plugin import syntax
3. Different extend syntax (now spreads)
4. `env` removed (use `globals` instead)

### Migration Steps

#### 1. Install new packages

```bash
pnpm remove eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add -D eslint@^9 typescript-eslint@^8 globals@^15
```

#### 2. Convert config

**Old** (`.eslintrc.json`):

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "env": {
    "node": true
  }
}
```

**New** (`eslint.config.js`):

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  languageOptions: {
    globals: { ...globals.node },
    parserOptions: {
      projectService: true,
    },
  },
});
```

#### 3. Test incrementally

```bash
# Test on one package first
cd packages/example
pnpm lint

# Then test monorepo
cd ../..
pnpm lint
```

## 17. Best Practices

### 1. Commit hooks are mandatory

Never allow bypassing with `--no-verify`. If you need to commit quickly, the code should still be formatted.

### 2. Fix warnings in CI

Configure CI to fail on warnings:

```bash
eslint --max-warnings 0 .
```

### 3. Review rules quarterly

ESLint and TypeScript evolve. Review new rules and update accordingly.

### 4. Document exceptions

If disabling a rule, add a comment explaining why:

```typescript
// Prisma uses unsafe member access in generated code
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const users = await prisma.user.findMany();
```

### 5. Educate the team

Have team members understand WHY rules exist, not just following them blindly.

### 6. Use consistent configs

Don't create snowflake configs per package unless necessary. Consistency is more valuable than perfection.

## 18. Conclusion

This linting strategy provides:

- **Type safety** through strict TypeScript rules
- **Consistency** through Prettier and ESLint
- **Automation** through Husky and lint-staged
- **Scalability** through monorepo-friendly architecture
- **Maintainability** through clear documentation and rationale

By following this strategy, teams can write better code with less effort, catch bugs earlier, and maintain high code quality across large TypeScript projects.

## Appendix A: Quick Reference

### Commands

```bash
# Lint all packages
pnpm lint

# Fix all auto-fixable issues
pnpm lint:fix

# Format all files
pnpm format:fix

# Check formatting (CI)
pnpm format

# Lint specific package
pnpm --filter @myapp/api lint
```

### File Structure

```
.
├── .editorconfig
├── .prettierrc.json
├── .prettierignore
├── eslint.config.js          # Root config
├── .husky/
│   └── pre-commit
├── package.json               # Root package with lint-staged
├── turbo.json
├── apps/
│   ├── web/
│   │   ├── eslint.config.js   # Next.js config
│   │   └── package.json
│   └── api/
│       ├── eslint.config.js   # Node.js config
│       └── package.json
└── packages/
    ├── db/
    │   ├── eslint.config.js
    │   └── package.json
    └── shared/
        ├── eslint.config.js
        └── package.json
```

### Key Dependencies

```json
{
  "devDependencies": {
    "@eslint/js": "^9.18.0",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "globals": "^15.14.0",
    "husky": "^9.1.7",
    "lint-staged": "^15.3.0",
    "prettier": "^3.4.2",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.20.0"
  }
}
```

## Appendix B: Resources

- [ESLint 9 Documentation](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [EditorConfig](https://editorconfig.org/)
