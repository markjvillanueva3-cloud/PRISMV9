#!/usr/bin/env node
/**
 * feature-gap-dedup-win-reconciler.mjs — META audit reconciler CLI
 * =================================================================
 *
 * Unit: FEATURE-GAP-AUDIT-MS0::U-FEATURE-GAP-DEDUP-WIN-RECONCILER
 *       (slot india, 2026-05-19, claude-82514795)
 *
 * Reads state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json, runs each unit
 * through the pure classifier (scripts/lib/feature-gap-classifier.mjs) against
 * actual disk reality (engine file + dispatcher refs + test files +
 * WIRE-EXEMPT tag), and emits:
 *   - state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.json
 *   - state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.md
 *
 * Both outputs are ADVISORY ONLY (advisoryOnly:true, mustHumanVerify:true).
 * A DEDUP-WIN verdict means "the engine code is on disk, wired, and tested"
 * — the operator still has to verify the spec correctness before flipping
 * the audit unit's status.
 *
 * CLI:
 *   node scripts/feature-gap-dedup-win-reconciler.mjs                  (writes ledger)
 *   node scripts/feature-gap-dedup-win-reconciler.mjs --dry-run        (no writes)
 *   node scripts/feature-gap-dedup-win-reconciler.mjs --json           (stdout JSON, no writes)
 *   node scripts/feature-gap-dedup-win-reconciler.mjs --input <path>   (override input)
 *
 * Designed to be idempotent + deterministic given the same {input, repo state}.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildLedger, renderLedgerMarkdown } from "./lib/feature-gap-classifier.mjs";

/** Escape a string for use as a literal in a RegExp. */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PRISM_ROOT = process.env.PRISM_ROOT ?? "H:/prism";
const DEFAULT_INPUT = path.join(PRISM_ROOT, "state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json");
const DEFAULT_OUT_JSON = path.join(PRISM_ROOT, "state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.json");
const DEFAULT_OUT_MD = path.join(PRISM_ROOT, "state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.md");
const ENGINES_DIR = path.join(PRISM_ROOT, "mcp-server/src/engines");
const DISPATCHERS_DIR = path.join(PRISM_ROOT, "mcp-server/src/tools/dispatchers");
const TESTS_DIR = path.join(PRISM_ROOT, "mcp-server/src/__tests__");

// ─────────────────────────────────────────────────────────────────────
// CLI arg parsing
// ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { input: DEFAULT_INPUT, outJson: DEFAULT_OUT_JSON, outMd: DEFAULT_OUT_MD, dryRun: false, json: false };
  /** Take the next argv slot as a path; bomb cleanly if it's missing or another flag. */
  const takePath = (flag, i) => {
    const v = argv[i + 1];
    if (typeof v !== "string" || v.startsWith("--")) {
      console.error(`${flag} requires a path argument`);
      process.exit(2);
    }
    return v;
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") { out.input = takePath("--input", i); i++; }
    else if (a === "--out-json") { out.outJson = takePath("--out-json", i); i++; }
    else if (a === "--out-md") { out.outMd = takePath("--out-md", i); i++; }
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function printHelp() {
  console.error(`Usage: node scripts/feature-gap-dedup-win-reconciler.mjs [opts]
  --input <path>     audit units JSON (default: state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json)
  --out-json <path>  output ledger JSON (default: state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.json)
  --out-md <path>    output ledger markdown (default: state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.md)
  --dry-run          do not write outputs (still prints summary to stderr)
  --json             print ledger JSON to stdout (implies --dry-run)
  --help, -h         this message`);
}

// ─────────────────────────────────────────────────────────────────────
// Real-fs reader bag — replaces the hermetic fakeFs from the test suite
// ─────────────────────────────────────────────────────────────────────

/**
 * Build the fs reader bag that the pure classifier consumes. Caches each
 * directory listing once per CLI run so the 68-unit × ~6-candidate sweep is
 * a single disk read per directory, not 408 reads.
 *
 * @returns {{
 *   findEngineFile: (candidate:string) => string|null,
 *   countDispatcherRefs: (fileBase:string) => number,
 *   findTestFiles: (fileBase:string) => string[],
 *   hasWireExempt: (fileBase:string) => boolean,
 * }}
 */
function makeRealFs() {
  // ── engine file index ─────────────────────────────────────────────
  /** @type {Map<string, string>} candidate → engine file path */
  const engineIndex = new Map();
  if (fs.existsSync(ENGINES_DIR)) {
    for (const name of fs.readdirSync(ENGINES_DIR)) {
      if (!name.endsWith(".ts") || name.endsWith(".d.ts") || name.endsWith(".test.ts")) continue;
      const base = name.replace(/\.ts$/, "");
      engineIndex.set(base, path.join(ENGINES_DIR, name));
    }
  }

  // ── dispatcher file contents (concatenated for one-pass grep) ─────
  /** @type {string[]} dispatcher file contents */
  const dispatcherTexts = [];
  /** @type {string[]} dispatcher file basenames, parallel index to dispatcherTexts */
  const dispatcherNames = [];
  if (fs.existsSync(DISPATCHERS_DIR)) {
    for (const name of fs.readdirSync(DISPATCHERS_DIR)) {
      if (!name.endsWith(".ts") || name.endsWith(".d.ts")) continue;
      try {
        const txt = fs.readFileSync(path.join(DISPATCHERS_DIR, name), "utf8");
        dispatcherTexts.push(txt);
        dispatcherNames.push(name);
      } catch { /* skip unreadable */ }
    }
  }

  // ── test file index (basename list — small enough to scan) ───────
  /** @type {string[]} all .test.ts files (relative to tests dir) */
  const testFileList = [];
  if (fs.existsSync(TESTS_DIR)) {
    walkTests(TESTS_DIR, testFileList);
  }

  // ── WIRE-EXEMPT cache (read first line of each engine once) ───────
  /** @type {Map<string, boolean>} */
  const exemptCache = new Map();

  return {
    /** @internal — diagnostics used by main() for fail-loud empty-bag check. */
    _diagnostics: {
      engineCount: engineIndex.size,
      dispatcherCount: dispatcherTexts.length,
      testCount: testFileList.length,
    },
    findEngineFile(candidate) {
      return engineIndex.get(candidate) ?? null;
    },
    countDispatcherRefs(fileBase) {
      // Word-boundary match — `BackplotEngine` does NOT count `BackplotEngineV2`
      // and the lookbehind/lookahead reject the substring class entirely. The
      // PRISM convention uses the engine name as an identifier, so `\b` is the
      // right boundary. P0 fix per Arm-A/B: a comment-only mention would still
      // count as a wire (substring + dispatcher text), but the bare engine name
      // appearing in a comment AND a real wire are nearly always co-located —
      // accepting that false-positive is acceptable; the test-file P0 is the
      // load-bearing risk.
      const re = new RegExp(`\\b${escapeRegex(fileBase)}\\b`);
      let count = 0;
      for (const txt of dispatcherTexts) {
        if (re.test(txt)) count++;
      }
      return count;
    },
    findTestFiles(fileBase) {
      // P0 fix per Arm-A/B: anchor at filename boundaries. `Foo` MUST NOT match
      // `FooBar.test.ts`; `MillEngine` MUST NOT match `mill-strategy.test.ts`.
      // The match is on the basename only (not the full path) and the boundary
      // is one of `^`, end-of-name, or a separator char `[._-/\\]`.
      const stem = fileBase.replace(/Engine$/, "");
      const baseRe = new RegExp(`(^|[._\\-\\\\/])${escapeRegex(fileBase)}([._\\-]|$)`, "i");
      // Only fall back to the engineless stem when it's long enough to be a
      // specific identifier (≥ STEM_MIN_LEN). Short stems like "NC", "AI",
      // "Mill", "Tool" sweep in dozens of unrelated test files.
      const STEM_MIN_LEN = 8;
      const stemRe = stem.length >= STEM_MIN_LEN
        ? new RegExp(`(^|[._\\-\\\\/])${escapeRegex(stem)}([._\\-]|$)`, "i")
        : null;
      const out = [];
      for (const f of testFileList) {
        const basename = path.basename(f);
        if (baseRe.test(basename) || (stemRe && stemRe.test(basename))) {
          out.push(f);
        }
      }
      return out;
    },
    hasWireExempt(fileBase) {
      if (exemptCache.has(fileBase)) return exemptCache.get(fileBase);
      const filePath = engineIndex.get(fileBase);
      if (!filePath) {
        exemptCache.set(fileBase, false);
        return false;
      }
      try {
        // Read only enough to catch a top-of-file WIRE-EXEMPT marker.
        const fd = fs.openSync(filePath, "r");
        const buf = Buffer.alloc(512);
        const n = fs.readSync(fd, buf, 0, 512, 0);
        fs.closeSync(fd);
        const head = buf.toString("utf8", 0, n);
        const exempt = /WIRE-EXEMPT/.test(head);
        exemptCache.set(fileBase, exempt);
        return exempt;
      } catch {
        exemptCache.set(fileBase, false);
        return false;
      }
    },
  };
}

/**
 * Recursive walker for .test.ts files with a hard depth cap + symlink skip.
 * P2 fix: a contributor adding a symlink to a shared fixtures dir would
 * otherwise infinite-recurse the walker.
 */
const MAX_WALK_DEPTH = 8;
function walkTests(dir, out, depth = 0) {
  if (depth > MAX_WALK_DEPTH) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  // Sort entries lexicographically — keeps the test-file order deterministic
  // across filesystems (NTFS happens to lex-order, ext4 doesn't).
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const ent of entries) {
    if (ent.isSymbolicLink()) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTests(full, out, depth + 1);
    } else if (ent.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.json) opts.dryRun = true;

  // Read input audit units.
  if (!fs.existsSync(opts.input)) {
    console.error(`input not found: ${opts.input}`);
    process.exit(2);
  }
  const inputRaw = fs.readFileSync(opts.input, "utf8");
  let input;
  try {
    input = JSON.parse(inputRaw);
  } catch (e) {
    console.error(`input is not valid JSON: ${opts.input} (${e.message})`);
    process.exit(2);
  }
  if (!Array.isArray(input.units)) {
    console.error(`input.units is not an array: ${opts.input}`);
    process.exit(2);
  }

  // Build the real-fs reader bag, run the pure classifier.
  const realFs = makeRealFs();
  // P1 fix per Arm-A: fail loud when the reader bag is empty. The only way
  // every unit classifies as GENUINE-GAP is either (a) the audit caught every
  // single engine as truly missing, OR (b) the reader's directory paths point
  // at empty/missing dirs. (b) is the silent-failure mode the milestone
  // narrative warns against — exit with a clear message rather than a ledger
  // full of false GENUINE-GAPs.
  if (realFs._diagnostics.engineCount === 0) {
    console.error(`fatal: engines directory is empty or unreadable: ${ENGINES_DIR}`);
    console.error(`hint: PRISM_ROOT=${PRISM_ROOT} (set via env var if your repo lives elsewhere)`);
    process.exit(3);
  }
  if (realFs._diagnostics.dispatcherCount === 0) {
    console.error(`fatal: dispatchers directory is empty or unreadable: ${DISPATCHERS_DIR}`);
    process.exit(3);
  }
  if (realFs._diagnostics.testCount === 0) {
    console.error(`fatal: tests directory is empty or unreadable: ${TESTS_DIR}`);
    process.exit(3);
  }
  const ledger = buildLedger(input.units, realFs);

  // Annotate the source of truth + carry forward any metadata the audit had.
  ledger.source = {
    auditInput: path.relative(PRISM_ROOT, opts.input).replace(/\\/g, "/"),
    auditGeneratedAt: input.generatedAt,
    auditGeneratedBy: input.generatedBy,
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(ledger, null, 2));
    return;
  }

  // Print summary to stderr regardless of write status.
  console.error(`feature-gap-dedup-win-reconciler — ${ledger.units.length} units scanned`);
  for (const [verdict, n] of Object.entries(ledger.summary)) {
    if (n > 0) console.error(`  ${verdict.padEnd(20)} ${n}`);
  }

  if (opts.dryRun) {
    console.error("(--dry-run: no files written)");
    return;
  }

  // Atomic write: tmp + rename.
  writeAtomic(opts.outJson, JSON.stringify(ledger, null, 2) + "\n");
  writeAtomic(opts.outMd, renderLedgerMarkdown(ledger));
  console.error(`wrote ${opts.outJson}`);
  console.error(`wrote ${opts.outMd}`);
}

/** Atomic write — temp + rename so a reader never sees a half-written file. */
function writeAtomic(targetPath, content) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Per-PID temp suffix so concurrent runs of this script don't clobber each
  // other's tmp file (same pattern as scripts/lib/atomic-json.mjs).
  const tmp = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, targetPath);
}

// Run only when invoked as a CLI (not when imported by tests).
// P1 fix per Arm-A: use Node's canonical fileURLToPath idiom — robust on
// Windows (drive letters), Posix, and UNC paths.
const isCli = (() => {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
})();
if (isCli) {
  main(process.argv);
}

// Exports for the CLI integration test (real-data E2E).
export { makeRealFs, parseArgs, main, writeAtomic };
