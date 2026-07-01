#!/usr/bin/env node
/**
 * hurco-jmdie-roundtrip-tsx.mjs — Thin wrapper that delegates to the sidecar TS.
 *
 * U-HURCO-ROUNDTRIP-TSX-SIDECAR (echo iter11 2026-05-24).
 *
 * Iter10 attempted to ship the entire TSX payload as an inline string to
 * `npx tsx -e "..."` via child_process spawn with `shell: true`. On Windows
 * the cmd.exe shell ate the embedded quotes / newlines, producing exit 255
 * with zero stdout/stderr. Replaced with a sidecar `.ts` file invoked via
 * `npx tsx scripts/hurco-jmdie-roundtrip.ts` — no inline payload, no shell
 * escape trap. Operator can ALSO run the .ts file directly:
 *
 *   npx tsx H:/prism/scripts/hurco-jmdie-roundtrip.ts
 *
 * Either entry point produces the same report at
 *   state/shared/hurco-jmdie-roundtrip-tsx-report.{json,md}
 *   state/shared/hurco-jmdie-roundtrip-tsx/reemit/*.reemit.hnc
 */

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SIDECAR = resolve(ROOT, "scripts", "hurco-jmdie-roundtrip.ts");

// Forward all CLI args after argv[1] verbatim so `--files=...` still works.
const forwardArgs = process.argv.slice(2);

// Windows needs shell:true to resolve `npx.cmd` cleanly. The shell-quoting
// trap from iter10 doesn't bite here because there's no `-e <payload>` —
// we're just running a file path.
const child = spawn(
  "npx",
  ["--yes", "tsx", SIDECAR, ...forwardArgs],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=16384" },
  },
);

child.on("exit", code => process.exit(code ?? 1));
child.on("error", err => {
  console.error("[tsx-wrapper] spawn error:", err);
  process.exit(1);
});
