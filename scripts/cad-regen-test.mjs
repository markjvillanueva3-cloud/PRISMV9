#!/usr/bin/env node
/**
 * cad-regen-test.mjs — CAD-COMPLETE-MS0/U-CADC22
 *
 * Batch regeneration test harness. Walks a CAD-file corpus, runs a regen
 * check on each file (default: file-existence + size sanity; injectable
 * for real BRep-regen via CADKernelEngine), collects per-file pass/fail,
 * reports overall pass rate against a gate.
 *
 * Spec (from CAD-COMPLETE-MS0/U-CADC22):
 *   - Script to run regeneration test on N files, collect pass/fail stats,
 *     generate report.
 *   - Target: 10% of corpus (979 files) for initial validation.
 *   - Exit conditions: harness works, can process 100 files.
 *
 * Pure injectable architecture:
 *   - `regenCheck` is an injectable contract — default impl does a cheap
 *     file-readability + size > 0 check; real impl would invoke
 *     CADKernelEngine.regenerate(brep) and assert geometry parity.
 *   - `fs` is injectable for hermetic tests.
 *
 * CLI:
 *   node scripts/cad-regen-test.mjs --root H:/PRISM/JM\ DIE/ --limit 100 [--gate 0.7] [--json]
 *
 * Exit codes: 0 = passed gate, 1 = failed gate, 2 = invalid args.
 */

import { readdirSync, statSync } from "node:fs";
import { extname } from "node:path";

// POSIX-style join so tests with forward-slash mock paths work cross-platform.
function joinPosix(dir, entry) {
  if (!dir) return entry;
  return dir.endsWith("/") || dir.endsWith("\\") ? `${dir}${entry}` : `${dir}/${entry}`;
}

export const DEFAULT_EXTENSIONS = Object.freeze([
  ".step", ".stp", ".iges", ".igs", ".ipt", ".iam", ".sldprt", ".sldasm",
  ".x_t", ".x_b", ".dwg", ".dxf", ".f3d", ".3dm", ".stl",
]);

export const DEFAULT_GATE = 0.7;
export const MAX_REASONABLE_LIMIT = 100_000;

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function clampLimit(v, def = Infinity) {
  if (v === null || v === undefined) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  if (n < 0) return 0;
  if (n > MAX_REASONABLE_LIMIT) return MAX_REASONABLE_LIMIT;
  return Math.floor(n);
}

export function clampGate(v, def = DEFAULT_GATE) {
  if (v === null || v === undefined) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.min(1, n));
}

/**
 * Walk a directory tree collecting files with one of the given extensions.
 * `fsLike` is injectable for tests (must expose readdir + stat).
 */
export function walkCadFiles(root, extensions, limit, fsLike = { readdir: readdirSync, stat: statSync }) {
  const out = [];
  const exts = new Set(extensions.map(e => e.toLowerCase()));
  const stack = [root];
  while (stack.length > 0 && out.length < limit) {
    const dir = stack.pop();
    let entries;
    try { entries = fsLike.readdir(dir); } catch { continue; }
    for (const entry of entries) {
      if (out.length >= limit) break;
      const p = joinPosix(dir, entry);
      let s;
      try { s = fsLike.stat(p); } catch { continue; }
      if (s.isDirectory()) {
        stack.push(p);
        continue;
      }
      if (s.isFile()) {
        const ext = extname(p).toLowerCase();
        if (exts.has(ext)) out.push({ path: p, ext, size: s.size });
      }
    }
  }
  return out;
}

/**
 * Pure aggregator: combine per-file results → batch report.
 */
export function aggregateBatchReport(root, totalChecked, files, gate, ranAtIso) {
  const passed = files.filter(f => f.passed).length;
  const passRate = files.length === 0 ? 0 : passed / files.length;
  const passedGate = files.length > 0 && passRate >= gate;
  return {
    schemaVersion: 1,
    root,
    totalChecked,
    files,
    passedCount: passed,
    failedCount: files.length - passed,
    passRate,
    gate,
    passedGate,
    ranAtIso,
  };
}

/**
 * Default regen-check: cheap file-readability + size sanity. Real impl would
 * deserialize the CAD file via CADKernelEngine and assert regen-stable geometry.
 */
export const defaultRegenCheck = {
  check(path) {
    const start = Date.now();
    try {
      const s = statSync(path);
      if (s.size <= 0) return { passed: false, reason: "empty file (size=0)", durationMs: Date.now() - start };
      return { passed: true, reason: `readable, size=${s.size}`, durationMs: Date.now() - start };
    } catch (err) {
      return { passed: false, reason: `stat failed: ${err && err.message ? err.message : String(err)}`, durationMs: Date.now() - start };
    }
  },
};

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADRegenTestHarness {
  async runBatch(opts) {
    const root = opts?.root;
    if (typeof root !== "string" || root.length === 0) {
      throw new TypeError("runBatch: root must be non-empty string");
    }
    const limit = clampLimit(opts?.limit);
    const gate = clampGate(opts?.gate);
    const extensions = Array.isArray(opts?.extensions) ? opts.extensions : DEFAULT_EXTENSIONS;
    const regenCheck = opts?.regenCheck ?? defaultRegenCheck;
    const fsLike = opts?.fsLike;
    const now = opts?.now ?? (() => new Date());

    const walked = walkCadFiles(root, extensions, limit, fsLike);
    const files = [];
    for (const w of walked) {
      let res;
      try {
        const raw = regenCheck.check(w.path);
        res = raw instanceof Promise ? await raw : raw;
      } catch (err) {
        res = { passed: false, reason: `regenCheck threw: ${err && err.message ? err.message : String(err)}`, durationMs: 0 };
      }
      files.push({ path: w.path, ext: w.ext, size: w.size, passed: !!res.passed, reason: String(res.reason ?? ""), durationMs: Number(res.durationMs) || 0 });
    }
    return aggregateBatchReport(root, walked.length, files, gate, now().toISOString());
  }

  renderSummary(report) {
    const rate = (report.passRate * 100).toFixed(1);
    const verdict = report.passedGate ? "PASS" : "FAIL";
    return `[cad-regen-test] root=${report.root} total=${report.totalChecked} pass=${report.passedCount} fail=${report.failedCount} rate=${rate}% gate=${(report.gate * 100).toFixed(1)}% verdict=${verdict}`;
  }
}

export const cadRegenTestHarness = new CADRegenTestHarness();

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { root: "", limit: 100, gate: DEFAULT_GATE, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = argv[++i] ?? "";
    else if (a === "--limit") out.limit = parseInt(argv[++i] ?? "100", 10);
    else if (a === "--gate") out.gate = parseFloat(argv[++i] ?? "0.7");
    else if (a === "--json") out.json = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.root) {
    process.stderr.write("usage: node scripts/cad-regen-test.mjs --root <dir> [--limit N] [--gate G] [--json]\n");
    process.exit(2);
  }
  const report = await cadRegenTestHarness.runBatch({ root: args.root, limit: args.limit, gate: args.gate });
  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(cadRegenTestHarness.renderSummary(report) + "\n");
  }
  process.exit(report.passedGate ? 0 : 1);
}

const invokedAsCli = (() => {
  try {
    return process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
  } catch { return false; }
})();
if (invokedAsCli) main();
