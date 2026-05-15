#!/usr/bin/env node
/**
 * bootstrap-h-mirror.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01
 *
 * One-shot bootstrap: walk C:\Users\<user>\.claude\ and mirror every file
 * to H:\.claude\ that is not already in sync. The PostToolUse hook
 * `mirror-c-to-h.mjs` only catches FUTURE writes; this script catches the
 * backlog of files that landed on C: before the hook was wired.
 *
 * Default mode is --dry-run (preview only). Pass --apply to actually copy.
 * Uses `mirrorOne` from the hook so behavior — throttle, byte-equal
 * short-circuit, exclusion list — stays identical between bootstrap and
 * incremental mirroring.
 *
 * Flags:
 *   --root <path>   Override C: profile root (default: C:\Users\<USER>\.claude)
 *   --apply         Actually copy (default is dry-run)
 *   --json          Emit JSON only (no human banner)
 *   --limit N       Cap copies (safety for large initial runs; default Infinity)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { mirrorOne, translateCToH } from "../.claude/hooks/mirror-c-to-h.mjs";

const H_ROOT = "H:/.claude";

/** SHA-256 of a file's bytes, or null on read error. Mirrors hook's hash logic. */
function sha256File(path) {
  try { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
  catch { return null; }
}

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const val = process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : true;
    args.set(key, val);
  }
}

// Resolve C: profile root via os.homedir() — robust across shells (MinGW bash
// truncates USERNAME on spaces; PowerShell preserves it; LSA tokens vary).
// Operator can override with --root.
const C_ROOT = args.get("root") ?? join(homedir(), ".claude");
const APPLY = args.get("apply") === true;
const JSON_ONLY = args.get("json") === true;
const LIMIT = Number(args.get("limit") ?? 0) || Infinity;

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

function bootstrap() {
  if (!existsSync(C_ROOT)) {
    const out = { error: "c-root-missing", cRoot: C_ROOT };
    process.stdout.write(JSON_ONLY ? JSON.stringify(out) + "\n" : `C: root not found: ${C_ROOT}\n`);
    return { ok: false, ...out };
  }

  // Pre-flight: H: must be reachable. If running over a disconnected network
  // drive, mirrorOne would silently log "error" for every file and yield a
  // partial mirror — worse than no mirror. Exit loudly instead.
  try { statSync(H_ROOT); }
  catch {
    const out = { error: "h-root-missing", hRoot: H_ROOT };
    process.stdout.write(JSON_ONLY ? JSON.stringify(out) + "\n" : `H: root not found: ${H_ROOT} (drive disconnected?)\n`);
    return { ok: false, ...out };
  }

  // Shared throttle map across this run — passing opts.skipPersist:true
  // keeps mirrorOne from writing the throttle file on every call. The
  // throttle is intentionally NOT persisted to disk after the bootstrap
  // (one-shot semantics): subsequent PostToolUse hook fires read the
  // empty throttle file and gate purely on the SHA-256 byte-equal check,
  // which is the correct behavior — bootstrap copies and incremental
  // mirrors are idempotent.
  const throttle = {};
  const results = {
    walked: 0,
    "mirrored": 0,
    "unchanged": 0,
    "source-missing": 0,
    "throttled": 0,
    "skipped": 0,
    "error": 0,
    "dry-would-mirror": 0,
  };
  const wouldCopy = [];

  for (const src of walk(C_ROOT)) {
    results.walked++;
    // Cap on actual work (mirrored OR would-mirror). In dry-run the cap is
    // on would-mirror; in apply on mirrored. Either way an operator's
    // --limit 100 stops after 100 candidates, not after walking 100K files
    // that all classify as unchanged.
    if ((results.mirrored + results["dry-would-mirror"]) >= LIMIT) break;
    if (APPLY) {
      const r = mirrorOne(src, { throttle, skipPersist: true });
      results[r] = (results[r] ?? 0) + 1;
    } else {
      // Dry-run: classify the same way mirrorOne would — exclusion via
      // translateCToH, then EITHER missing on H: OR content drift counts
      // as would-mirror. Skipping the hash check produced false-negative
      // previews (drifted-but-present files reported as unchanged) which
      // could lull an operator into believing the trees were in sync.
      const target = translateCToH(src);
      if (!target) { results["skipped"]++; continue; }
      if (!existsSync(target)) {
        results["dry-would-mirror"]++;
        if (wouldCopy.length < 30) wouldCopy.push({ src, target, reason: "missing-on-h" });
        continue;
      }
      const srcHash = sha256File(src);
      const tgtHash = sha256File(target);
      if (srcHash && tgtHash && srcHash !== tgtHash) {
        results["dry-would-mirror"]++;
        if (wouldCopy.length < 30) wouldCopy.push({ src, target, reason: "content-drift" });
      } else if (!srcHash || !tgtHash) {
        // Read error on one side; safer to treat as a candidate for mirroring.
        results["dry-would-mirror"]++;
        if (wouldCopy.length < 30) wouldCopy.push({ src, target, reason: "read-error" });
      } else {
        results["unchanged"]++;
      }
    }
  }

  const summary = {
    ok: true,
    cRoot: C_ROOT,
    apply: APPLY,
    counts: results,
    sampleWouldCopy: APPLY ? undefined : wouldCopy,
  };

  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(
      `C-to-H bootstrap mirror — ${APPLY ? "APPLY" : "DRY-RUN"} — root: ${C_ROOT}\n` +
      `  walked:           ${results.walked}\n` +
      (APPLY
        ? `  mirrored:         ${results.mirrored}\n` +
          `  unchanged:        ${results.unchanged}\n` +
          `  source-missing:   ${results["source-missing"]}\n` +
          `  throttled:        ${results.throttled}\n` +
          `  skipped:          ${results.skipped} (cache/locks/credentials/etc.)\n` +
          `  error:            ${results.error}\n`
        : `  would-mirror:     ${results["dry-would-mirror"]} (missing-on-h OR content-drift, full SHA-256 compare)\n` +
          `  unchanged:        ${results.unchanged}\n` +
          `  skipped:          ${results.skipped} (cache/locks/credentials/etc.)\n` +
          `\n` +
          `Dry-run uses the same hash check apply-mode does — counts are exact.\n` +
          `Run with --apply to perform the copies.\n`)
    );
    if (!APPLY && wouldCopy.length) {
      process.stdout.write(`\nFirst ${wouldCopy.length} would-mirror sample(s):\n`);
      for (const w of wouldCopy) process.stdout.write(`  ${w.src}\n    → ${w.target}\n`);
    }
  }
  return summary;
}

// ESM entry detection that tolerates Windows path / URL differences.
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(process.argv[1]).toLowerCase() === resolve(new URL(import.meta.url).pathname.replace(/^\//, "")).toLowerCase();

if (isMain) {
  const r = bootstrap();
  process.exit(r.ok ? 0 : 1);
}

export { bootstrap, walk };
