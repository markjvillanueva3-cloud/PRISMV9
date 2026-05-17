#!/usr/bin/env node
// scripts/audit-hook-wiring.mjs
//
// SYSTEM-VIZ-BRAIN-MS0 / U-P0-HOOK-ORPHAN-RECONCILE
//
// Composes two already-shipped detectors and emits a per-orphan ACTION PLAN:
//   - scripts/hook-orphan-scan.mjs --json     → orphan pool + tier frontmatter
//   - scripts/hook-fire-rank.mjs   --json     → empirical fire data (8709-event ledger)
//
// Per orphan, classifies into one of four operator-friendly buckets:
//   WIRE     — non-test, non-helper, has tier frontmatter, has doc/wiki evidence
//              or has empirical firings (likely real, just unregistered in settings.json)
//   ARCHIVE  — test/helper/disabled pattern; recommend move to `_archived/`
//              per [[feedback_never_delete_only_disable]] — NEVER deletes
//   REVIEW   — uncertain (missing tier, or has tier but zero evidence + zero fires)
//   KEEP-AS-IS — currently firing AND wired (filtered out of output unless --include-keep)
//
// Outputs:
//   - state/shared/HOOK-ORPHAN-CLASSIFICATION.md   (operator dashboard)
//   - state/shared/HOOK-ORPHAN-CLASSIFICATION.json (machine sidecar)
//
// Exit codes (cron-friendly):
//   0 — clean (no WIRE candidates above MIN_SCORE)
//   1 — at least one high-confidence WIRE candidate surfaced
//   2 — input failure (upstream script crashed, missing files, parse error)
//
// Pure-core + injected readers per RGS-MS1 lesson:
//   classifyOrphan() / rankAll() are pure exports for unit tests.
//   readUpstream() is the only thing that touches the filesystem / spawns.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPO = resolve(__dirname, "..");

const TIER_SCORE = Object.freeze({ T0: 5, T1: 4, T2: 3, T3: 2, T4: 1 });
const ACTION_RANK = Object.freeze({ WIRE: 4, REVIEW: 3, ARCHIVE: 2, "KEEP-AS-IS": 1 });
export const ACTIONS = Object.freeze(["WIRE", "REVIEW", "ARCHIVE", "KEEP-AS-IS"]);

// score model: tierScore × WIRE_SCORE_MULTIPLIER + docCount + (fires ? FIRES_BONUS : 0)
const WIRE_SCORE_MULTIPLIER = 10;
const FIRES_BONUS = 5;
const REVIEW_BASE_SCORE = 5;
const MIN_HOOK_ID_LEN = 4;

// Doc surfaces grepped for hook-name evidence. Kept narrow on purpose:
// only sources that load-bear on session behavior count as "real" evidence.
const DOC_SOURCES_REL = Object.freeze([
  "CLAUDE.md",
  "state/shared/CLAUDE-BRIEF.md",
  "state/shared/PRISM-BUILD-CONTEXT.md",
  "state/shared/PRISM-BUILD-VISION.md",
  "knowledge/wiki/architecture/index.md",
  "knowledge/wiki/architecture/_skill-triggers.jsonl",
]);

export function parseArgs(argv) {
  const opts = {
    json: false,
    top: 25,
    frozenTime: null,
    includeKeep: false,
    outMd: "state/shared/HOOK-ORPHAN-CLASSIFICATION.md",
    outJson: "state/shared/HOOK-ORPHAN-CLASSIFICATION.json",
    repoRoot: DEFAULT_REPO,
    help: false,
    minScore: 10,
    skipWrite: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--include-keep") opts.includeKeep = true;
    else if (a === "--skip-write") opts.skipWrite = true;
    else if (a === "--top") opts.top = clampInt(argv[++i], 1, 1000, 25);
    else if (a === "--min-score") opts.minScore = clampInt(argv[++i], 0, 100, 10);
    else if (a === "--frozen-time") opts.frozenTime = String(argv[++i] || "");
    else if (a === "--out-md") opts.outMd = String(argv[++i] || opts.outMd);
    else if (a === "--out-json") opts.outJson = String(argv[++i] || opts.outJson);
    else if (a === "--repo-root") opts.repoRoot = String(argv[++i] || opts.repoRoot);
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (a.startsWith("--")) {
      const e = new Error(`unknown flag: ${a}`);
      e.code = "BAD_ARG";
      throw e;
    }
  }
  return opts;
}

function clampInt(raw, lo, hi, fallback) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

// --- pure classifier (no I/O) ------------------------------------------------

/**
 * @param {{
 *   orphan: {id:string,file:string,wired:boolean,tier:string|null,issues:string[],firings?:number},
 *   firings: number,
 *   docRefs: string[],
 * }} input
 * @returns {{action:string,score:number,reasons:string[],evidence:{tier:string|null,docRefs:number,firings:number}}}
 */
export function classifyOrphan({ orphan, firings, docRefs }) {
  const reasons = [];
  const tier = orphan.tier || null;
  const name = orphan.id || basename(orphan.file || "");
  const docCount = Array.isArray(docRefs) ? docRefs.length : 0;
  const fires = Number.isFinite(firings) ? firings : (orphan.firings || 0);

  // Archive class — name patterns alone (don't need evidence)
  if (/\.test\.mjs$/i.test(orphan.file || "") || /\.test$/i.test(name)) {
    reasons.push("test-file-pattern");
    return {
      action: "ARCHIVE",
      score: 1,
      reasons,
      evidence: { tier, docRefs: docCount, firings: fires },
    };
  }
  if (/^_/.test(name) || /^_/.test(basename(orphan.file || ""))) {
    reasons.push("helper-prefix-_");
    return {
      action: "ARCHIVE",
      score: 1,
      reasons,
      evidence: { tier, docRefs: docCount, firings: fires },
    };
  }
  if (/\.(bak|disabled|archive)(\b|[.-])/i.test(orphan.file || "")) {
    reasons.push("backup-or-disabled-suffix");
    return {
      action: "ARCHIVE",
      score: 1,
      reasons,
      evidence: { tier, docRefs: docCount, firings: fires },
    };
  }

  // KEEP-AS-IS — wired AND firing (orphan upstream should not have surfaced this,
  // but defend against shape drift)
  if (orphan.wired && fires > 0) {
    reasons.push("already-wired-and-firing");
    return {
      action: "KEEP-AS-IS",
      score: 0,
      reasons,
      evidence: { tier, docRefs: docCount, firings: fires },
    };
  }

  const tierScore = TIER_SCORE[tier] || 0;

  // WIRE — tiered AND (doc evidence OR empirical fires through some other path)
  if (tier && (docCount > 0 || fires > 0)) {
    if (docCount > 0) reasons.push(`doc-refs-${docCount}`);
    if (fires > 0) reasons.push(`fires-${fires}-via-bundle-or-async`);
    reasons.push(`tier-${tier}`);
    const score = tierScore * WIRE_SCORE_MULTIPLIER + docCount + (fires > 0 ? FIRES_BONUS : 0);
    return {
      action: "WIRE",
      score,
      reasons,
      evidence: { tier, docRefs: docCount, firings: fires },
    };
  }

  // REVIEW — has tier but zero evidence, OR missing tier
  if (!tier) reasons.push("missing-tier-frontmatter");
  else reasons.push("tiered-but-no-doc-or-fire-evidence");
  const score = REVIEW_BASE_SCORE + tierScore;
  return {
    action: "REVIEW",
    score,
    reasons,
    evidence: { tier, docRefs: docCount, firings: fires },
  };
}

/**
 * @param {Array<ReturnType<typeof classifyOrphan> & {id:string,file:string}>} items
 * @returns {Array<typeof items[number]>}
 */
export function rankAll(items) {
  return [...items].sort((a, b) => {
    const ar = ACTION_RANK[a.action] || 0;
    const br = ACTION_RANK[b.action] || 0;
    if (ar !== br) return br - ar; // higher action rank first (WIRE > REVIEW > ARCHIVE > KEEP)
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return String(a.id).localeCompare(String(b.id));
  });
}

// --- doc evidence aggregation (pure given file contents) --------------------

/**
 * @param {string[]} hookIds
 * @param {Record<string,string>} docTexts  rel-path → full text
 * @returns {Map<string,string[]>}  hook-id → list of doc-source rel paths where it appears
 */
export function collectDocRefs(hookIds, docTexts) {
  const map = new Map();
  for (const id of hookIds) map.set(id, []);
  if (!docTexts || typeof docTexts !== "object") return map;
  // Word-boundary substring match. Names like "wiki-precheck-inject" are
  // distinctive enough that bare-substring won't false-positive on prose.
  for (const [rel, text] of Object.entries(docTexts)) {
    if (typeof text !== "string" || text.length === 0) continue;
    for (const id of hookIds) {
      if (!id || id.length < MIN_HOOK_ID_LEN) continue; // avoid match on short names
      if (text.includes(id)) {
        map.get(id).push(rel);
      }
    }
  }
  return map;
}

// --- upstream I/O (the only impure part) ------------------------------------

function spawnJson(scriptRel, args, opts) {
  const repoRoot = opts.repoRoot;
  const scriptAbs = resolve(repoRoot, scriptRel);
  const r = spawnSync(
    process.execPath,
    [scriptAbs, "--json", ...args],
    { encoding: "utf8", timeout: 60_000, cwd: repoRoot },
  );
  if (r.status !== 0) {
    const e = new Error(
      `upstream ${scriptRel} failed: status=${r.status}, stderr=${(r.stderr || "").slice(0, 400)}`,
    );
    e.code = "UPSTREAM_FAIL";
    throw e;
  }
  try {
    return JSON.parse(r.stdout || "{}");
  } catch (err) {
    const e = new Error(`upstream ${scriptRel} stdout not JSON: ${err.message}`);
    e.code = "UPSTREAM_PARSE";
    throw e;
  }
}

export function readDocTexts(repoRoot, sourcesRel = DOC_SOURCES_REL) {
  const out = {};
  for (const rel of sourcesRel) {
    const abs = resolve(repoRoot, rel);
    if (!existsSync(abs)) {
      out[rel] = "";
      continue;
    }
    try {
      out[rel] = readFileSync(abs, "utf8");
    } catch {
      out[rel] = "";
    }
  }
  return out;
}

export function readUpstream(opts, injected = {}) {
  // Injected readers (for tests) win over real spawns.
  const orphanScan = injected.orphanScan
    ?? spawnJson("scripts/hook-orphan-scan.mjs", [], opts);
  const fireArgs = opts.frozenTime
    ? ["--include-zero", "--frozen-time", opts.frozenTime]
    : ["--include-zero"];
  const fireRank = injected.fireRank
    ?? spawnJson("scripts/hook-fire-rank.mjs", fireArgs, opts);
  const docTexts = injected.docTexts
    ?? readDocTexts(opts.repoRoot);
  return { orphanScan, fireRank, docTexts };
}

// --- top-level compose ------------------------------------------------------

/**
 * Pure given (orphanScan, fireRank, docTexts). Returns the full report.
 * @param {{orphanScan:any, fireRank:any, docTexts:Record<string,string>}} inputs
 * @param {{minScore:number, includeKeep:boolean, generatedAt:string}} opts
 */
export function buildReport(inputs, opts) {
  const orphans = Array.isArray(inputs.orphanScan?.orphans)
    ? inputs.orphanScan.orphans
    : [];
  const fireRanked = Array.isArray(inputs.fireRank?.ranked)
    ? inputs.fireRank.ranked
    : [];
  const fireByName = new Map();
  for (const f of fireRanked) {
    if (f && typeof f.hook === "string") fireByName.set(f.hook, f.count || 0);
  }

  const hookIds = orphans.map((o) => o.id).filter(Boolean);
  const docRefs = collectDocRefs(hookIds, inputs.docTexts || {});

  const items = orphans.map((o) => {
    const fires = fireByName.get(o.id) || 0;
    const refs = docRefs.get(o.id) || [];
    const c = classifyOrphan({ orphan: o, firings: fires, docRefs: refs });
    return {
      id: o.id,
      file: o.file,
      tier: o.tier || null,
      wired: !!o.wired,
      action: c.action,
      score: c.score,
      reasons: c.reasons,
      evidence: c.evidence,
      docSources: refs,
    };
  });

  const ranked = rankAll(items);
  const filtered = opts.includeKeep
    ? ranked
    : ranked.filter((it) => it.action !== "KEEP-AS-IS");

  const counts = filtered.reduce((acc, it) => {
    acc[it.action] = (acc[it.action] || 0) + 1;
    return acc;
  }, {});

  const wireHigh = filtered
    .filter((it) => it.action === "WIRE" && it.score >= (opts.minScore || 10));

  // Fail-loud on upstream-drift (Karpathy R12). If BOTH upstreams produced
  // zero rows, the most likely cause is a shape rename in hook-orphan-scan or
  // hook-fire-rank — silent empty reports mask the regression class that
  // already bit META-tool calc bugs (CLAUDE.md §Recent regressions 2026-05-16).
  const upstreamEmpty = orphans.length === 0 && fireRanked.length === 0;

  return {
    schemaVersion: 1,
    generatedAt: opts.generatedAt || new Date().toISOString(),
    upstreamEmpty,
    totals: {
      orphans_in: orphans.length,
      classified_out: filtered.length,
      wire_high_confidence: wireHigh.length,
    },
    counts,
    items: filtered,
  };
}

export function renderMarkdown(report, opts = {}) {
  const top = clampInt(opts.top, 1, 1000, 25);
  const lines = [];
  lines.push(`# HOOK-ORPHAN-CLASSIFICATION`);
  lines.push("");
  lines.push(`_Generated: ${report.generatedAt}_`);
  lines.push("");
  lines.push(`_Source: SYSTEM-VIZ-BRAIN-MS0 / U-P0-HOOK-ORPHAN-RECONCILE — composes \`hook-orphan-scan.mjs\` + \`hook-fire-rank.mjs\`. Advisory; never deletes (per \`feedback_never_delete_only_disable\`)._`);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- orphan pool in: **${report.totals.orphans_in}**`);
  lines.push(`- classified out: **${report.totals.classified_out}**`);
  lines.push(`- WIRE high-confidence (score ≥ min): **${report.totals.wire_high_confidence}**`);
  lines.push("");
  lines.push("## Action distribution");
  lines.push("");
  const c = report.counts || {};
  for (const a of ACTIONS) lines.push(`- **${a}**: ${c[a] || 0}`);
  lines.push("");
  const byAction = {};
  for (const a of ACTIONS) byAction[a] = [];
  for (const it of report.items) {
    (byAction[it.action] || (byAction[it.action] = [])).push(it);
  }
  for (const a of ACTIONS) {
    const arr = byAction[a];
    if (!arr || arr.length === 0) continue;
    lines.push(`## ${a} — top ${Math.min(top, arr.length)} / ${arr.length}`);
    lines.push("");
    lines.push("| Score | Tier | Hook | Evidence |");
    lines.push("|-------|------|------|----------|");
    for (const it of arr.slice(0, top)) {
      const ev = it.evidence || {};
      const evParts = [];
      if (ev.docRefs) evParts.push(`docs:${ev.docRefs}`);
      if (ev.firings) evParts.push(`fires:${ev.firings}`);
      if (it.reasons?.length) evParts.push(it.reasons.join(","));
      lines.push(`| ${it.score} | ${it.tier || "—"} | \`${it.id}\` | ${evParts.join(" · ")} |`);
    }
    lines.push("");
  }
  lines.push("## Operator next steps");
  lines.push("");
  lines.push("1. Review top **WIRE** rows; for each, decide event matcher + tier + bundle vs individual entry (CLAUDE.md doctrine: individual entries, NOT bundle, for high-contention slots).");
  lines.push("2. **ARCHIVE** rows: move to `.claude/hooks/_archived/` — never `rm`.");
  lines.push("3. **REVIEW** rows: read the hook header, add tier frontmatter if real, otherwise downgrade to ARCHIVE.");
  lines.push("4. Re-run: `node scripts/audit-hook-wiring.mjs --json` after settings.json changes to confirm reconcile.");
  return lines.join("\n") + "\n";
}

export function determineExitCode(report) {
  if (!report) return 2;
  if ((report.totals?.wire_high_confidence || 0) > 0) return 1;
  return 0;
}

export function writeArtifacts(report, opts) {
  if (opts.skipWrite) return { md: null, json: null };
  const repoRoot = opts.repoRoot;
  const mdAbs = resolve(repoRoot, opts.outMd);
  const jsonAbs = resolve(repoRoot, opts.outJson);
  mkdirSync(dirname(mdAbs), { recursive: true });
  mkdirSync(dirname(jsonAbs), { recursive: true });
  writeFileSync(mdAbs, renderMarkdown(report, { top: opts.top }));
  writeFileSync(jsonAbs, JSON.stringify(report, null, 2) + "\n");
  return { md: mdAbs, json: jsonAbs };
}

export async function main(argv = process.argv.slice(2), injected = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`audit-hook-wiring: ${e.message}\n`);
    return 2;
  }
  if (opts.help) {
    process.stdout.write(
      "audit-hook-wiring.mjs — reconcile orphan hooks into action plan\n" +
      "Usage: node audit-hook-wiring.mjs [--json] [--top N] [--min-score N] [--include-keep] [--frozen-time ISO] [--out-md PATH] [--out-json PATH] [--skip-write]\n" +
      "Exit codes: 0 clean, 1 has WIRE candidates, 2 input failure\n",
    );
    return 0;
  }
  let inputs;
  try {
    inputs = readUpstream(opts, injected);
  } catch (e) {
    process.stderr.write(`audit-hook-wiring: ${e.message}\n`);
    return 2;
  }
  const report = buildReport(inputs, {
    minScore: opts.minScore,
    includeKeep: opts.includeKeep,
    generatedAt: opts.frozenTime || undefined,
  });
  if (report.upstreamEmpty) {
    process.stderr.write(
      "audit-hook-wiring: UPSTREAM-DRIFT — hook-orphan-scan returned 0 orphans AND hook-fire-rank returned 0 ranked hooks. Likely shape rename in an upstream script. Refusing to write empty artifacts.\n",
    );
    return 2;
  }
  const written = writeArtifacts(report, opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(renderMarkdown(report, { top: opts.top }));
    if (written.md) {
      process.stdout.write(`\n→ wrote ${written.md}\n→ wrote ${written.json}\n`);
    }
  }
  return determineExitCode(report);
}

const isCli = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === __filename; }
  catch { return false; }
})();
if (isCli) {
  void main()
    .then((code) => process.exit(code))
    .catch((e) => {
      process.stderr.write(`audit-hook-wiring: fatal: ${e?.message || e}\n`);
      process.exit(2);
    });
}
