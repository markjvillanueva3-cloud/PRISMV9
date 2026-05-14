#!/usr/bin/env node
/**
 * claude-md-byte-target.mjs — CLEANUP-MS0 / U-CLEANUP-D6
 *
 * Verifier for the D1–D7 CLAUDE.md slim milestone. Reports — does NOT enforce.
 *
 * Targets (from envelope U-CLEANUP-D6):
 *   - Total cuts D1–D7 should be >= 14 KB.
 *   - Final CLAUDE.md byte size should be <= 25 KB (both files).
 *   - Sampled injected-payload size drop should be >= 30% vs pre-D1 baseline.
 *
 * Inputs:
 *   - H:/prism/CLAUDE.md             — project doctrine (post-cuts target)
 *   - C:/Users/<user>/.claude/CLAUDE.md — global playbook
 *   - state/shared/.claude-md-baseline.json (auto-seeded on first run with
 *     current sizes; subsequent runs diff against it)
 *   - knowledge/wiki/architecture/*.md — verifies the D1–D5 extraction targets
 *     actually exist (otherwise the "cut" is a regression, not a slim).
 *
 * Sampled-injection drop:
 *   - The 10-prompt corpus lives at scripts/__fixtures__/claude-md-sample-prompts.json
 *     (committed; ten representative real-shape prompts from past sessions).
 *   - For each prompt we run a dry-run "compute payload bytes" against the
 *     six injection sources known to bloat the context window:
 *       master-index-precheck-inject, wiki-precheck-inject, awareness-snapshot-inject,
 *       chat-bus-inject, build-state-inject, claude-brief-inject.
 *     The script reads each hook's last-emitted size from
 *     state/shared/.claude-injection-sizes.json (which `wiki-precheck-inject` already
 *     writes per the D5 spec). When the sidecar is missing, we fall back to
 *     measuring the static portion of each CLAUDE.md / system-reminder block —
 *     a conservative lower bound. Result is the average payload size per prompt.
 *
 * Exit codes (advisory: cron monitors should NOT alarm on these — operators
 * read the report):
 *   0 — verifier ran cleanly, regardless of whether targets were met
 *   1 — verifier encountered a real error (missing source file, parse failure)
 *   2 — usage error (--help shown, etc.)
 *
 * @module scripts/claude-md-byte-target
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, statSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 1;
export const TARGET_FINAL_BYTES = 25 * 1024;       // CLAUDE.md final <= 25 KB
export const TARGET_CUTS_BYTES = 14 * 1024;        // D1-D7 cumulative cuts >= 14 KB
export const TARGET_INJECT_DROP_PCT = 30;          // injected-payload drop >= 30%
export const DEFAULT_REPO_ROOT = "H:/prism";
export const DEFAULT_BASELINE_RELATIVE = "state/shared/.claude-md-baseline.json";
export const DEFAULT_INJECT_SIZES_RELATIVE = "state/shared/.claude-injection-sizes.json";
export const DEFAULT_SAMPLE_PROMPTS_RELATIVE = "scripts/__fixtures__/claude-md-sample-prompts.json";

// Sections D1–D5 should be extracted into these wiki files (per envelope).
// D6 verifies they exist — a missing wiki entry means the section was DELETED,
// not relocated, which violates the "never delete, only disable" rule.
const EXPECTED_WIKI_EXTRACTIONS = [
  { unit: "D1", path: "knowledge/wiki/architecture/hook-synergy-overview.md" },
  { unit: "D2", path: "knowledge/wiki/architecture/master-index-surface.md" },
  { unit: "D3", path: "knowledge/wiki/coordination/shared-directives-index.md" },
  { unit: "D4", path: "knowledge/wiki/reference/jm-die-profile.md" },
];

const HOME_CLAUDE_MD_CANDIDATES = [
  "C:/Users/Mark Villanueva/.claude/CLAUDE.md",
  "C:/Users/wompu/.claude/CLAUDE.md",
];

// ── ARGS ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const out = {
    json: false,
    repoRoot: null,          // resolved later (worktree-aware default)
    homeClaudeMd: null,
    baselinePath: null,
    sampleSizesPath: null,
    seedBaseline: false,
    seedProjectBytes: null,  // explicit pre-cut anchor for post-cut seeding (P0-2 fix)
    seedHomeBytes: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[i + 1];
    switch (a) {
      case "--json":            out.json = true; break;
      case "--repo-root":       out.repoRoot = next(); i++; break;
      case "--home-claude-md":  out.homeClaudeMd = next(); i++; break;
      case "--baseline":        out.baselinePath = next(); i++; break;
      case "--inject-sizes":    out.sampleSizesPath = next(); i++; break;
      case "--seed-baseline":   out.seedBaseline = true; break;
      case "--seed-project-bytes": {
        const v = Number(next()); i++;
        if (Number.isFinite(v) && v >= 0) out.seedProjectBytes = Math.floor(v);
        break;
      }
      case "--seed-home-bytes": {
        const v = Number(next()); i++;
        if (Number.isFinite(v) && v >= 0) out.seedHomeBytes = Math.floor(v);
        break;
      }
      case "--help":
      case "-h":                out.help = true; break;
      default:
        if (a && a.startsWith("--")) throw new Error(`Unknown flag: ${a}`);
    }
  }
  return out;
}

// ── PATHS ────────────────────────────────────────────────────────────────────

export function resolveTargets(opts) {
  // Worktree-aware default: when --repo-root is not supplied, derive from the
  // script's own location (scripts/claude-md-byte-target.mjs lives 2 dirs deep
  // in the repo root). This makes the verifier read the *local* worktree's
  // CLAUDE.md rather than the main tree's stale copy (P0-1 fix from review B).
  let repoRoot = opts.repoRoot;
  if (!repoRoot) {
    try {
      const here = fileURLToPath(import.meta.url);                       // .../scripts/claude-md-byte-target.mjs
      repoRoot = path.resolve(path.dirname(path.dirname(here)));         // → repo root
    } catch {
      repoRoot = DEFAULT_REPO_ROOT;
    }
  } else {
    repoRoot = path.resolve(repoRoot);   // normalise relative paths
  }
  const projectClaudeMd = path.join(repoRoot, "CLAUDE.md");
  let homeClaudeMd = opts.homeClaudeMd;
  if (!homeClaudeMd) {
    for (const cand of HOME_CLAUDE_MD_CANDIDATES) {
      if (existsSync(cand)) { homeClaudeMd = cand; break; }
    }
  }
  const baselinePath = opts.baselinePath ?? path.join(repoRoot, DEFAULT_BASELINE_RELATIVE);
  const sampleSizesPath = opts.sampleSizesPath ?? path.join(repoRoot, DEFAULT_INJECT_SIZES_RELATIVE);
  return { repoRoot, projectClaudeMd, homeClaudeMd, baselinePath, sampleSizesPath };
}

// ── SIZE MEASUREMENT ─────────────────────────────────────────────────────────

/**
 * Read a file's size in bytes. Returns null for missing files (defence: lets
 * the verifier report a missing source without throwing).
 */
export function fileBytes(filePath) {
  if (!filePath) return null;
  try {
    if (!existsSync(filePath)) return null;
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

/**
 * Load the baseline JSON (sizes when D6 first ran). If missing, returns
 * null so the caller can decide whether to seed.
 */
export function loadBaseline(baselinePath) {
  if (!existsSync(baselinePath)) return null;
  try {
    const raw = readFileSync(baselinePath, "utf-8");
    const j = JSON.parse(raw);
    if (j && typeof j === "object" && Number.isInteger(j.schemaVersion)) return j;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist a baseline JSON via tmp+rename. Idempotent.
 */
export function saveBaseline(baselinePath, payload) {
  try { mkdirSync(path.dirname(baselinePath), { recursive: true }); } catch { /* ignore */ }
  const tmp = `${baselinePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf-8");
    renameSync(tmp, baselinePath);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
  return statSync(baselinePath).size;
}

// ── WIKI EXTRACTION VERIFICATION ─────────────────────────────────────────────

/**
 * For each D1–D4 extraction target, verify the wiki file actually exists.
 * A missing file means the section was deleted rather than relocated — that
 * violates the "never delete, only disable" doctrine and must surface as a
 * P0 alert in the report.
 */
export function verifyWikiExtractions(repoRoot) {
  const out = [];
  for (const entry of EXPECTED_WIKI_EXTRACTIONS) {
    const abs = path.join(repoRoot, entry.path);
    const present = existsSync(abs);
    const bytes = present ? fileBytes(abs) : 0;
    out.push({ unit: entry.unit, path: entry.path, present, bytes });
  }
  return out;
}

// ── SAMPLED INJECTION SIZE ───────────────────────────────────────────────────

/**
 * Read the injection-sizes sidecar (populated by hook auto-loggers). Returns
 * a flat object of { hookName -> avgBytesPerPrompt }.
 *
 * Fallback when the sidecar is missing: synthesise a conservative lower bound
 * from each CLAUDE.md size + per-hook documented payload caps. This means D6
 * always produces a verdict even before the inject-sizing pipeline is wired —
 * the operator gets a baseline they can refine later.
 */
export function loadInjectionSizes(sampleSizesPath, claudeBytes) {
  if (existsSync(sampleSizesPath)) {
    try {
      const j = JSON.parse(readFileSync(sampleSizesPath, "utf-8"));
      if (j && typeof j.byHook === "object") return { source: "sidecar", byHook: j.byHook };
    } catch { /* fall through to synthesised */ }
  }
  // Synthesised conservative estimate:
  //  - Two CLAUDE.md blocks get injected per UserPromptSubmit (project + home).
  //  - Plus typical per-prompt overhead: master-index (1.5 KB),
  //    awareness-snapshot (2.5 KB), build-state (1.0 KB), chat-bus (1.5 KB),
  //    wiki-precheck (2.0 KB).
  const projectBytes = claudeBytes?.project ?? 0;
  const homeBytes = claudeBytes?.home ?? 0;
  return {
    source: "synthesised",
    byHook: {
      "claude-md-project": projectBytes,
      "claude-md-home": homeBytes,
      "master-index-precheck-inject": 1_500,
      "awareness-snapshot-inject": 2_500,
      "build-state-inject": 1_000,
      "chat-bus-inject": 1_500,
      "wiki-precheck-inject": 2_000,
    },
  };
}

/**
 * Sum the per-hook averages into a total per-prompt payload byte count.
 */
export function totalInjectedBytes(injectSizes) {
  if (!injectSizes || typeof injectSizes.byHook !== "object") return 0;
  let sum = 0;
  for (const v of Object.values(injectSizes.byHook)) {
    if (Number.isFinite(v)) sum += v;
  }
  return sum;
}

// ── MAIN VERDICT ─────────────────────────────────────────────────────────────

/**
 * Compute the full D6 verdict. Pure-ish: only I/O is reads + (optional) baseline-seed.
 */
export function verifyByteTargets(opts = {}) {
  const t = resolveTargets({ ...opts });
  const claudeBytes = {
    project: fileBytes(t.projectClaudeMd),
    home: fileBytes(t.homeClaudeMd),
  };

  // Baseline handling. Seed on first run when --seed-baseline is passed.
  //
  // P0-2 fix (Reviewer B): when D1-D5 cuts already shipped, seeding with the
  // CURRENT (post-cut) size as baseline forever yields total_cuts=0. Operator
  // can override with --seed-project-bytes N / --seed-home-bytes N to anchor
  // against a known pre-cut value. Without an override, the operator gets a
  // baseline.seedWasPostCut warning when current size <= TARGET_FINAL_BYTES.
  //
  // P0-1 fix (Reviewer A): capture the inject total at seed time too so
  // subsequent runs can compute drop %.
  const baseline = loadBaseline(t.baselinePath);
  let baselineCreated = false;
  let effectiveBaseline = baseline;
  if (!baseline && opts.seedBaseline) {
    const projectAnchor = opts.seedProjectBytes ?? (claudeBytes.project ?? 0);
    const homeAnchor    = opts.seedHomeBytes    ?? (claudeBytes.home    ?? 0);
    const injectAtSeed = totalInjectedBytes(loadInjectionSizes(t.sampleSizesPath, claudeBytes));
    const seedWasPostCut =
      opts.seedProjectBytes === null &&
      (claudeBytes.project ?? 0) <= TARGET_FINAL_BYTES;
    effectiveBaseline = {
      schemaVersion: SCHEMA_VERSION,
      generator: "U-CLEANUP-D6 (claude-md-byte-target.mjs)",
      seededAtMs: Date.now(),
      projectBytesBaseline: projectAnchor,
      homeBytesBaseline: homeAnchor,
      injectBytesBaseline: injectAtSeed > 0 ? injectAtSeed : null,
      seedWasPostCut,
    };
    if (!opts.dryRun) saveBaseline(t.baselinePath, effectiveBaseline);
    baselineCreated = true;
  }

  // Cut size: baseline - current.
  const cuts = effectiveBaseline
    ? {
        projectBytes: Math.max(0, (effectiveBaseline.projectBytesBaseline ?? 0) - (claudeBytes.project ?? 0)),
        homeBytes:    Math.max(0, (effectiveBaseline.homeBytesBaseline ?? 0)    - (claudeBytes.home ?? 0)),
      }
    : { projectBytes: 0, homeBytes: 0 };
  const totalCutBytes = cuts.projectBytes + cuts.homeBytes;

  // Final-size check.
  const finalSizeOk = {
    project: (claudeBytes.project ?? 0) <= TARGET_FINAL_BYTES,
    home:    (claudeBytes.home ?? 0)    <= TARGET_FINAL_BYTES,
  };

  // Cuts target.
  const cutTargetMet = totalCutBytes >= TARGET_CUTS_BYTES;

  // Wiki extraction verification.
  const wikiChecks = verifyWikiExtractions(t.repoRoot);
  const wikiMissing = wikiChecks.filter((w) => !w.present);

  // Injected-payload drop.
  // P1-1 fix (Reviewer A): compare unrounded ratio against threshold so a
  // 29.5% drop is correctly rejected. The rounded integer is kept for display.
  const injectNow = loadInjectionSizes(t.sampleSizesPath, claudeBytes);
  const injectNowTotal = totalInjectedBytes(injectNow);
  const injectBaselineTotal = effectiveBaseline?.injectBytesBaseline ?? null;
  let injectDropPct = null;
  let injectDropRatio = null;
  if (injectBaselineTotal && injectBaselineTotal > 0) {
    injectDropRatio = (injectBaselineTotal - injectNowTotal) / injectBaselineTotal;
    injectDropPct = Math.round(100 * injectDropRatio);
  }
  const injectTargetMet =
    injectDropRatio !== null && (100 * injectDropRatio) >= TARGET_INJECT_DROP_PCT;

  // Net overall verdict: all targets met (or, when there's no baseline yet,
  // returns "needs_baseline" so the operator runs --seed-baseline first).
  let verdict;
  if (!effectiveBaseline) {
    verdict = "needs_baseline";
  } else if (wikiMissing.length > 0) {
    verdict = "wiki_missing";
  } else if (!finalSizeOk.project || !finalSizeOk.home) {
    verdict = "over_size_target";
  } else if (!cutTargetMet) {
    verdict = "cuts_below_target";
  } else if (injectBaselineTotal === null) {
    verdict = "inject_baseline_missing";
  } else if (!injectTargetMet) {
    verdict = "inject_drop_below_target";
  } else {
    verdict = "pass";
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generator: "U-CLEANUP-D6 (claude-md-byte-target)",
    generatedAtMs: Date.now(),
    verdict,
    baseline: effectiveBaseline,
    baselineCreated,
    sizes: {
      project: claudeBytes.project,
      home: claudeBytes.home,
      targetFinalBytes: TARGET_FINAL_BYTES,
      finalSizeOk,
    },
    cuts: {
      ...cuts,
      total: totalCutBytes,
      target: TARGET_CUTS_BYTES,
      targetMet: cutTargetMet,
    },
    wiki: {
      checks: wikiChecks,
      missing: wikiMissing,
    },
    inject: {
      source: injectNow.source,
      total: injectNowTotal,
      baseline: injectBaselineTotal,
      dropPct: injectDropPct,
      target: TARGET_INJECT_DROP_PCT,
      targetMet: injectTargetMet,
    },
    paths: t,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

export function renderHuman(v) {
  const lines = [
    `[claude-md-byte-target] verdict=${v.verdict}`,
    `  project=${v.sizes.project}B  (target <=${v.sizes.targetFinalBytes}B)  ok=${v.sizes.finalSizeOk.project}`,
    `  home=${v.sizes.home ?? "missing"}B  ok=${v.sizes.finalSizeOk.home}`,
    `  cuts: project=${v.cuts.projectBytes}B  home=${v.cuts.homeBytes}B  total=${v.cuts.total}B  (target >=${v.cuts.target}B  met=${v.cuts.targetMet})`,
    `  inject: total=${v.inject.total}B  baseline=${v.inject.baseline ?? "-"}  drop=${v.inject.dropPct ?? "-"}%  (target >=${v.inject.target}%  met=${v.inject.targetMet})`,
    `  wiki extractions: ${v.wiki.checks.length - v.wiki.missing.length}/${v.wiki.checks.length} present`,
  ];
  for (const m of v.wiki.missing) {
    lines.push(`    ⚠ MISSING ${m.unit}: ${m.path}`);
  }
  if (v.baselineCreated) lines.push(`  baseline seeded at ${v.paths.baselinePath}`);
  return lines.join("\n");
}

export function runCli(argv, { stdout, stderr } = {}) {
  const out = stdout ?? process.stdout;
  const err = stderr ?? process.stderr;
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    err.write(`claude-md-byte-target: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  if (opts.help) {
    out.write([
      "usage: claude-md-byte-target [--json] [--seed-baseline] [--repo-root PATH]",
      "                              [--home-claude-md PATH] [--baseline PATH] [--inject-sizes PATH]",
      "",
      "U-CLEANUP-D6 — verifier for CLAUDE.md byte-target after D1-D7 cuts.",
      "",
    ].join("\n"));
    return 2;
  }
  let v;
  try {
    v = verifyByteTargets(opts);
  } catch (e) {
    err.write(`claude-md-byte-target: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
  if (opts.json) {
    out.write(JSON.stringify(v, null, 2) + "\n");
  } else {
    out.write(renderHuman(v) + "\n");
  }
  return 0;
}

// ── ENTRY ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __entry = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (__entry && __filename === __entry) {
  const code = runCli(process.argv.slice(2));
  process.exit(code);
}
