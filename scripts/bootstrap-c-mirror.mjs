#!/usr/bin/env node
/**
 * bootstrap-c-mirror.mjs — REVERSE bootstrap of mirror-c-to-h.mjs.
 *
 * The C→H hook only captures FUTURE writes done from C:. When a fresh PC
 * (or a long-disconnected PC) needs to be brought into sync with what H:
 * already holds, this script walks H:\.claude\ and copies every file that
 * is MISSING or DRIFTED on C:\Users\<user>\.claude\.
 *
 * Mirrors `bootstrap-h-mirror.mjs` symmetry; reuses the EXACT exclusion
 * list from `mirror-c-to-h.mjs` so a file the C→H hook would never push
 * up is also a file this script will never push down. SHA-256 byte-equal
 * short-circuit; symlinked C: entries (e.g. `commands -> /h/.claude/commands`)
 * are detected via lstat and skipped — they already point at H: directly.
 *
 * Default mode is --dry-run. Pass --apply to actually copy.
 *
 * Flags:
 *   --root <path>   Override C: profile root (default: ~/.claude)
 *   --apply         Actually copy (default is dry-run)
 *   --json          Emit JSON only (no human banner)
 *   --limit N       Cap copies; safety for huge initial runs (default Infinity)
 *
 * Exit codes: 0 success · 1 fatal (H or C root missing)
 */
import {
  copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const H_ROOT = "H:/.claude";

// EXCLUSION LIST — kept in lockstep with mirror-c-to-h.mjs::translateCToH.
// If you change one, change the other. The shapes are slightly different
// (relative paths use forward slashes here because we walk via Node's
// readdirSync; the hook normalizes to backslashes).
function shouldSkipRel(rel) {
  const r = rel.replace(/\\/g, "/");
  if (r.startsWith("cache/")) return true;
  if (r.startsWith("locks/")) return true;
  if (r.startsWith("statsig/")) return true;
  if (r.startsWith("shell-snapshots/")) return true;
  if (r.startsWith("ide/")) return true;
  if (r.startsWith("projects/") && r.endsWith(".jsonl")) return true; // session transcripts
  if (r.endsWith(".lock")) return true;
  if (/\.credentials\.json/i.test(r)) return true;
  if (/\.bak[-.0-9a-zA-Z_]*$/i.test(r)) return true;
  if (/\.pre-[-.0-9a-zA-Z_]+$/i.test(r)) return true;
  // Defense-in-depth — H: shouldn't carry these, but if it does, don't propagate.
  if (r.includes(".pre-junction-")) return true;
  if (r.includes(".pre-mirror-")) return true;
  // Dormant/archived dirs — same SPIRIT as the .bak-*/.pre-* excludes above.
  // These are checkpoint snapshots, not active surfaces; propagating them to a
  // fresh PC just bloats it. The active equivalents (commands/, hooks/) are
  // already symlinked-through.
  if (r.startsWith("archived-commands/")) return true;
  if (r.startsWith("commands-archive/")) return true;
  if (r.startsWith("_backups/")) return true;
  if (r.startsWith("backups/")) return true;
  // Top-level checkpoint/backup files (settings.json.backup-*, .checkpoint-*).
  if (/^settings\.json\.(backup|checkpoint)-/i.test(r)) return true;
  if (/^tmp[-_]/i.test(r)) return true;
  return false;
}

function sha256File(path) {
  try { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
  catch { return null; }
}

function* walk(dir, base = dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name);
    // Skip symlinks at the source side too — H: dirs that symlink elsewhere
    // (uncommon but possible) shouldn't double-traverse.
    let st;
    try { st = lstatSync(full); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) yield* walk(full, base);
    else if (st.isFile()) yield { full, rel: full.slice(base.length + 1) };
  }
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

const C_ROOT = args.get("root") ?? join(homedir(), ".claude");
const APPLY = args.get("apply") === true;
const JSON_ONLY = args.get("json") === true;
const LIMIT = Number(args.get("limit") ?? 0) || Infinity;

function bootstrap() {
  // Pre-flight: both roots must be reachable. A disconnected H: would yield
  // an empty walk; a missing C: profile would silently create a stub. Refuse
  // either rather than guessing.
  try { statSync(H_ROOT); }
  catch {
    const out = { error: "h-root-missing", hRoot: H_ROOT };
    process.stdout.write(JSON_ONLY ? JSON.stringify(out) + "\n" : `H: root not found: ${H_ROOT} (drive disconnected?)\n`);
    return { ok: false, ...out };
  }
  if (!existsSync(C_ROOT)) {
    const out = { error: "c-root-missing", cRoot: C_ROOT };
    process.stdout.write(JSON_ONLY ? JSON.stringify(out) + "\n" : `C: root not found: ${C_ROOT}\n`);
    return { ok: false, ...out };
  }

  const results = {
    walked: 0,
    copied: 0,
    unchanged: 0,
    skipped: 0,
    "skipped-symlink": 0, // C: entry is already a symlink — points at H: directly
    "dry-would-copy": 0,
    error: 0,
  };
  const wouldCopy = [];

  for (const { full: src, rel } of walk(H_ROOT)) {
    results.walked++;
    if ((results.copied + results["dry-would-copy"]) >= LIMIT) break;

    if (shouldSkipRel(rel)) { results.skipped++; continue; }

    const target = join(C_ROOT, rel);

    // If the C: parent path of `target` resolves through a symlink, then the
    // file *already* lives on H: by virtue of that symlink — copying would
    // be a no-op write to the same H: file (worst case: corrupts a live
    // file). Detect by checking every ancestor up to C_ROOT for symlink-ness.
    // This is intentionally O(depth) — depth is shallow (3-5 dirs).
    let isUnderSymlink = false;
    {
      let probe = dirname(target);
      while (probe.length > C_ROOT.length) {
        try {
          if (lstatSync(probe).isSymbolicLink()) { isUnderSymlink = true; break; }
        } catch { /* probe missing — keep walking up */ }
        const parent = dirname(probe);
        if (parent === probe) break;
        probe = parent;
      }
    }
    if (isUnderSymlink) { results["skipped-symlink"]++; continue; }

    const targetExists = existsSync(target);
    if (targetExists) {
      const srcHash = sha256File(src);
      const tgtHash = sha256File(target);
      if (srcHash && tgtHash && srcHash === tgtHash) {
        results.unchanged++;
        continue;
      }
    }

    if (APPLY) {
      try {
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(src, target);
        results.copied++;
      } catch (err) {
        results.error++;
        if (wouldCopy.length < 30) wouldCopy.push({ src, target, error: String(err.message ?? err) });
      }
    } else {
      results["dry-would-copy"]++;
      if (wouldCopy.length < 30) {
        wouldCopy.push({ src, target, reason: targetExists ? "content-drift" : "missing-on-c" });
      }
    }
  }

  const summary = {
    ok: true,
    hRoot: H_ROOT,
    cRoot: C_ROOT,
    apply: APPLY,
    counts: results,
    sample: APPLY ? wouldCopy : (wouldCopy.length ? wouldCopy : undefined),
  };

  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(
      `H-to-C bootstrap mirror — ${APPLY ? "APPLY" : "DRY-RUN"}\n` +
      `  H: root:          ${H_ROOT}\n` +
      `  C: root:          ${C_ROOT}\n` +
      `  walked:           ${results.walked}\n` +
      (APPLY
        ? `  copied:           ${results.copied}\n` +
          `  unchanged:        ${results.unchanged}\n` +
          `  skipped:          ${results.skipped} (cache/locks/credentials/transcripts/etc.)\n` +
          `  skipped-symlink:  ${results["skipped-symlink"]} (C: path already symlinked into H:)\n` +
          `  error:            ${results.error}\n`
        : `  would-copy:       ${results["dry-would-copy"]} (missing OR drifted, full SHA-256 compare)\n` +
          `  unchanged:        ${results.unchanged}\n` +
          `  skipped:          ${results.skipped} (cache/locks/credentials/transcripts/etc.)\n` +
          `  skipped-symlink:  ${results["skipped-symlink"]} (C: path already symlinked into H:)\n` +
          `\nDry-run is exact (SHA-256). Run with --apply to perform the copies.\n`)
    );
    if (wouldCopy.length) {
      process.stdout.write(`\nFirst ${wouldCopy.length} sample(s):\n`);
      for (const w of wouldCopy) {
        process.stdout.write(`  ${w.src}\n    → ${w.target}  [${w.reason ?? w.error ?? "ok"}]\n`);
      }
    }
  }
  return summary;
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(process.argv[1]).toLowerCase() === resolve(new URL(import.meta.url).pathname.replace(/^\//, "")).toLowerCase();

if (isMain) {
  const r = bootstrap();
  process.exit(r.ok ? 0 : 1);
}

export { bootstrap, walk, shouldSkipRel };
