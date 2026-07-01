/**
 * Shared esbuild configuration for PRISM MCP Server.
 *
 * All build scripts (`build`, `build:fast`, `build:incremental`, `build:cli`)
 * import from here so externals and flags live in ONE place.
 *
 * Usage:
 *   node esbuild.config.mjs                  # default: split build → dist/
 *   node esbuild.config.mjs --no-splitting   # single-file build → dist/index.js
 *   node esbuild.config.mjs --entry=src/cli/index.ts --out=dist/cli.js
 *   node esbuild.config.mjs --analyze        # print size breakdown
 */

import esbuild from "esbuild";
import { fileUrlExternalPlugin } from "./scripts/lib/esbuild-file-url-external.plugin.mjs";

// ── Banner ─────────────────────────────────────────────────────────────────
// ESM compat shims: provides require(), __filename, __dirname in every chunk.
// MUST be `var` not `const`: esbuild auto-emits its own `var __filename` into any
// chunk that bundles a transitive CJS dep — `var`+`var` merges to one binding,
// but `const`+`var` throws "Identifier '__filename' has already been declared"
// at module load (U-PTR02 / prism_dev:auto_wiring_scan runtime crash).
const banner = [
  `import { createRequire as __esmCreateRequire } from 'module';`,
  `import { fileURLToPath as __esmFileURLToPath } from 'url';`,
  `import { dirname as __esmDirname } from 'path';`,
  `var require = __esmCreateRequire(import.meta.url);`,
  `var __filename = __esmFileURLToPath(import.meta.url);`,
  `var __dirname = __esmDirname(__filename);`,
].join(" ");

// ── Externals ──────────────────────────────────────────────────────────────
// Layer 0: native/binary/protocol deps.
// Layer 1: npm deps that exist in node_modules — no reason to inline them.
const external = [
  // Layer 0 (original)
  "@modelcontextprotocol/sdk",
  "zod",
  "better-sqlite3",
  "cpu-features",
  "ssh2",
  "playwright",
  "bufferutil",
  "utf-8-validate",
  "node:module",
  "node:url",
  "node:path",
  "ws",
  "node-opcua",
  "occt-import-js",

  // Layer 1 (npm deps)
  "express",
  "winston",
  "winston/*",
  "dotenv",
  "bullmq",
  "ioredis",
  "pg",
  "multer",
  "jose",
  "commander",
  "@anthropic-ai/sdk",
  "pdf-parse",
  "proper-lockfile",
  "zod-to-json-schema",

  // External-infra clients (PP-INFRA-*): keep native/onnx bindings outside
  // the bundle so .node binaries stay on disk and WASM loads at runtime.
  "z3-solver",
  "@qdrant/js-client-rest",
  "ollama",
  "@xenova/transformers",
  "onnxruntime-node",
  "onnxruntime-common",
  "sharp",
];

// ── Parse CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const entryArg = args.find((a) => a.startsWith("--entry="));
const outArg = args.find((a) => a.startsWith("--out="));
const analyzeFlag = args.includes("--analyze");
const noSplitting = args.includes("--no-splitting");

const entryPoint = entryArg ? entryArg.split("=")[1] : "src/index.ts";

// ── Decide single-file vs code-splitting ──────────────────────────────────
// --no-splitting or custom --out: single file (for CLI builds, compat)
// Default: code splitting → dist/ directory
const useSplitting = !noSplitting && !outArg;

const buildOpts = {
  entryPoints: [entryPoint],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  banner: { js: banner },
  external,
  plugins: [fileUrlExternalPlugin],
  metafile: analyzeFlag,
  logLevel: "info",
};

if (useSplitting) {
  // Layer 3: Code splitting — dynamic imports become separate chunks.
  // Entry point is dist/index.js, shared code goes to dist/chunk-*.js.
  Object.assign(buildOpts, {
    outdir: "dist",
    splitting: true,
    chunkNames: "chunks/[name]-[hash]",
    entryNames: "[name]",
  });
} else {
  // Single-file mode
  const outfile = outArg ? outArg.split("=")[1] : "dist/index.js";
  Object.assign(buildOpts, { outfile });
}

// ── Build ──────────────────────────────────────────────────────────────────
const result = await esbuild.build(buildOpts);

if (analyzeFlag && result.metafile) {
  const text = await esbuild.analyzeMetafile(result.metafile);
  console.log(text);
}
