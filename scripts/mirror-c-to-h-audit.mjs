#!/usr/bin/env node
/**
 * mirror-c-to-h-audit.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01
 *
 * Walks the C:\Users\<user>\.claude\ profile directory and reports every
 * file that has no H:\.claude\ counterpart (or whose counterpart is out of
 * sync). Output is human-readable by default; pass --json for machine.
 *
 * Path translation + exclusion rules come from the live hook so the audit
 * NEVER drifts from runtime behavior.
 *
 * Exits 0 always (advisory). Exit code is for the SHELL, not for the
 * audit verdict — verdict is in the output. `--strict` flips exit code 1
 * when any miss is found (useful for CI / cron alerting).
 *
 * Flags:
 *   --root <path>   Override C: profile root (default: C:\Users\<USER>\.claude)
 *   --json          Emit JSON only (no human banner)
 *   --strict        Exit 1 if any miss is found
 *   --limit N       Cap walked file count (default: unlimited)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { translateCToH } from "../.claude/hooks/mirror-c-to-h.mjs";

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const val = process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : true;
    args.set(key, val);
  }
}

// Resolve C: profile root via os.homedir() — robust across shells. Operator
// can override with --root.
const C_ROOT = args.get("root") ?? join(homedir(), ".claude");
const JSON_ONLY = args.get("json") === true;
const STRICT = args.get("strict") === true;
const LIMIT = Number(args.get("limit") ?? 0) || Infinity;

function sha256File(path) {
  try { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
  catch { return null; }
}

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

function classify(srcPath) {
  const target = translateCToH(srcPath);
  if (!target) return { status: "out-of-scope", target: null };

  if (!existsSync(target)) return { status: "missing-on-h", target };

  let srcSt, tgtSt;
  try { srcSt = statSync(srcPath); tgtSt = statSync(target); }
  catch { return { status: "stat-error", target }; }

  if (srcSt.size !== tgtSt.size) return { status: "size-mismatch", target, srcSize: srcSt.size, tgtSize: tgtSt.size };

  const srcHash = sha256File(srcPath);
  const tgtHash = sha256File(target);
  if (srcHash && tgtHash && srcHash !== tgtHash) {
    return { status: "content-drift", target, srcHash, tgtHash };
  }
  return { status: "in-sync", target };
}

function main() {
  if (!existsSync(C_ROOT)) {
    const out = { error: "c-root-missing", cRoot: C_ROOT };
    process.stdout.write(JSON_ONLY ? JSON.stringify(out) + "\n" : `C: root not found: ${C_ROOT}\n`);
    process.exit(STRICT ? 1 : 0);
  }

  const buckets = {
    "missing-on-h": [],
    "content-drift": [],
    "size-mismatch": [],
    "in-sync": [],
    "out-of-scope": [],
    "stat-error": [],
  };
  let walked = 0;
  for (const f of walk(C_ROOT)) {
    if (walked >= LIMIT) break;
    walked++;
    const c = classify(f);
    buckets[c.status].push({ src: f, ...c });
  }

  const summary = {
    cRoot: C_ROOT,
    hRoot: "H:/.claude",
    walked,
    counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
    misses: [
      ...buckets["missing-on-h"],
      ...buckets["content-drift"],
      ...buckets["size-mismatch"],
    ],
  };

  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(
      `C-to-H mirror audit — walked ${walked} file(s) under ${C_ROOT}\n` +
      `  missing-on-h:   ${summary.counts["missing-on-h"]}\n` +
      `  content-drift:  ${summary.counts["content-drift"]}\n` +
      `  size-mismatch:  ${summary.counts["size-mismatch"]}\n` +
      `  in-sync:        ${summary.counts["in-sync"]}\n` +
      `  out-of-scope:   ${summary.counts["out-of-scope"]} (cache/locks/credentials/etc.)\n` +
      `  stat-error:     ${summary.counts["stat-error"]}\n`
    );
    const showMisses = summary.misses.slice(0, 30);
    if (showMisses.length) {
      process.stdout.write(`\nFirst ${showMisses.length} miss(es):\n`);
      for (const m of showMisses) {
        process.stdout.write(`  [${m.status}] ${m.src}\n`);
      }
      if (summary.misses.length > showMisses.length) {
        process.stdout.write(`  ... and ${summary.misses.length - showMisses.length} more (use --json for full list)\n`);
      }
    }
  }

  const hasMiss = summary.misses.length > 0;
  process.exit(STRICT && hasMiss ? 1 : 0);
}

// ESM entry detection that tolerates Windows path / URL differences.
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(process.argv[1]).toLowerCase() === resolve(new URL(import.meta.url).pathname.replace(/^\//, "")).toLowerCase();

if (isMain) main();

export { classify, walk };
