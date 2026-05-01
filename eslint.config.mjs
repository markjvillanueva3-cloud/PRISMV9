import eslintJs from "@eslint/js";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
      "web/**",
      "scripts/**",
    ],
  },
  eslintJs.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        performance: "readonly",
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        ReadableStream: "readonly",
        WritableStream: "readonly",
        // Test globals (vitest)
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    rules: {
      // Errors — catch real bugs
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],

      // Warnings — improve over time
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      "no-undef": "off", // TypeScript handles this via tsc --noEmit
      "no-redeclare": "off", // TypeScript handles via tsc
      "no-unused-vars": "off", // Handled by @typescript-eslint/no-unused-vars
      "no-dupe-class-members": "off", // TypeScript overloads trigger this falsely

      // Downgrade to warnings — pre-existing, fix over time
      "no-useless-assignment": "warn",
      "no-constant-binary-expression": "warn",
      "preserve-caught-error": "off",

      // Off — too noisy for 1,300+ engine codebase
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "no-case-declarations": "off",
      "no-fallthrough": "off",
      "no-constant-condition": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-useless-escape": "off",
      "no-control-regex": "off",
      "no-prototype-builtins": "off",
    },
  },
];
