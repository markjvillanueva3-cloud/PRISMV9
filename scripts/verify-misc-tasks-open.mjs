#!/usr/bin/env node
/**
 * verify-misc-tasks-open.mjs -- deterministic open-status re-verifier for the
 * MISC-TASKS-INVENTORY (the "orphaned incomplete work" list).
 *
 * THE GAP (verified 2026-06-20, slot:zulu). `extract-misc-tasks.mjs` merges a
 * one-time 10-agent scan (2026-05-16) and NEVER re-checks an item against the
 * LIVE repo. The productive fleet closes these faster than the inventory tracks,
 * so a chat "picking up leftover work in high-ROI order" routes at phantom-
 * already-done items -- 14 of 14 spot-checked top-ROI items were already built.
 * This is the MISC analog of `reconcile-zulu-ledger.mjs`: a deterministic
 * ($0, no agents, no 429) probe that flags items the live repo shows are
 * LIKELY-CLOSED, so the fleet routes at REAL open work.
 *
 * CONSERVATIVE BY DESIGN (R12): only a high-precision signal yields
 * `likely-closed`; everything else is `needs-review` -- it NEVER false-claims an
 * item closed.
 *   - looks_completed: the extractor already marked it shipped.
 *   - now-wired: a "wire/activate/register <asset> into settings.json" item whose
 *     live settings.json now references that asset -> the wiring is done.
 * Signals that only NARROW (still needs-review, but with a reason):
 *   - stale-reference: the item's primary code asset is absent from every known
 *     code dir (renamed / removed / never-made -- ambiguous, not auto-closed).
 *   - no-deterministic-signal: narrative item with no machine-checkable hook.
 *
 * Usage: node scripts/verify-misc-tasks-open.mjs [--json] [--inventory <path>]
 * Exit:  0 ok | 1 inventory missing / arg error | 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
const DEFAULT_INVENTORY = path.join(ROOT, "state/shared/specs/MISC-TASKS-INVENTORY.json");
const SETTINGS_CANDIDATES = [
  "C:/Users/wompu/.claude/settings.json",
  path.join(ROOT, ".claude/settings.json"),
  "H:/.claude/settings.json",
];
// Bounded set of dirs where a buildable code asset would live (NOT a full repo walk).
const CODE_DIRS = [".claude/hooks", ".claude/scripts", ".claude/helpers", "scripts", "mcp-server/src"];

// Allow internal dots so COMPOUND basenames resolve whole: `scrutiny-ledger.test.mjs`
// must extract as itself, not `test.mjs` (the latter misses the basename index -> a
// false "ABSENT" -> a false-close, the 2026-06-22 Ollama-sweep MISC-124 bug). The
// `(?:\.[\w-]+)*` greedily takes interior segments, backtracking so a trailing
// required extension still anchors (`a.mjs b.mjs` -> two matches, not one run).
const CODE_ASSET_RE = /\b[\w-]+(?:\.[\w-]+)*\.(?:mjs|ts|js)\b/g;
// Files that appear in evidence as the WIRE TARGET, never the asset being wired.
const TARGET_BASENAMES = new Set([
  "settings.json", "package.json", "tsconfig.json", "vitest.config.ts", "vitest.config.mjs", "vitest.config.js",
]);
const WIRE_HINT_RE = /\b(wire|wired|activation requires|integration pending|register(?:ed)?|unwired|not (?:yet )?(?:wired|registered|hooked)|hook is not|requires adding)\b/i;

/** Escape a string for literal use inside a RegExp. */
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
/** True iff `name` appears in `text` as a WHOLE TOKEN (not a substring of a longer id). */
function tokenIn(text, name) { return new RegExp(`(?:^|[^\\w-])${escapeRe(name)}(?:[^\\w-]|$)`).test(text); }

/** Distinctive unit/milestone id tokens (U-XXX, FOO-MS#/U-XXX) -- greppable in git history. */
const UNIT_ID_RE = /\b[A-Z][A-Z0-9]{2,}(?:-[A-Z0-9]+)*-MS\d+(?:\/U-[A-Z0-9-]+)?|U-[A-Z0-9-]{3,}\b/g;

/** Distinct code-asset basenames named in title+evidence, minus known wire-targets. */
export function extractCodeAssets(item) {
  const text = `${item?.title || ""} ${item?.evidence || ""}`;
  const raw = text.match(CODE_ASSET_RE) || [];
  const seen = new Set();
  const out = [];
  for (const r of raw) {
    if (TARGET_BASENAMES.has(r) || seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out;
}

/** Distinct unit/milestone id tokens named in an item's title+evidence+milestone_or_unit_id. */
export function extractUnitIds(item) {
  const text = `${item?.title || ""} ${item?.evidence || ""} ${item?.milestone_or_unit_id || ""}`;
  return [...new Set(text.match(UNIT_ID_RE) || [])];
}

/**
 * Classify ONE item's current open-status. Pure: `settingsText` (concatenated live
 * settings.json bodies), `basenameExists(name)`, and `gitLogText` (commit subjects
 * since the scan) are injected so tests need no fs/git.
 */
export function classifyItem(item, { settingsText = "", basenameExists = () => true, gitLogText = "" } = {}) {
  const id = item?.misc_id ?? null;
  if (item?.looks_completed === true) {
    return { misc_id: id, status: "likely-closed", signal: "looks_completed", asset: null };
  }
  // SHIPPED-IN-GIT: a unit-id this item references now appears in a commit SINCE the scan.
  // The extractor cross-referenced the roadmap at scan time but NOT git history; a commit
  // landing the work afterwards is a high-precision closure signal (covers narrative items
  // with no code-file ref too). Conservative: the id must match as a WHOLE TOKEN, never a
  // substring of a longer id (the same charter as `now-wired` -- a bare `includes(u)` would
  // false-close a short open id like `U-PPL` against an unrelated commit `U-PPL-B2`).
  if (gitLogText) {
    const shipped = extractUnitIds(item).find((u) => tokenIn(gitLogText, u));
    if (shipped) return { misc_id: id, status: "likely-closed", signal: "shipped-in-git", asset: shipped };
  }
  const assets = extractCodeAssets(item);
  const evidence = `${item?.title || ""} ${item?.evidence || ""}`;
  // HIGH-PRECISION: a wiring item whose target settings.json now references the asset.
  if (WIRE_HINT_RE.test(evidence) && assets.length) {
    const stem = (a) => a.replace(/\.(?:mjs|ts|js)$/, "");
    // Full-filename match is exact; the stem must match as a WHOLE TOKEN, never a raw
    // substring (review P2: bare includes(stem) lets `cam` false-close vs `camDispatcher`,
    // violating the never-false-close charter).
    const wired = assets.find((a) => settingsText.includes(a) || tokenIn(settingsText, stem(a)));
    if (wired) return { misc_id: id, status: "likely-closed", signal: "now-wired", asset: wired };
  }
  // NARROWING ONLY (still needs-review): primary asset missing from every code dir.
  const primary = assets[0];
  if (primary && !basenameExists(primary)) {
    return { misc_id: id, status: "needs-review", signal: "stale-reference", asset: primary };
  }
  return { misc_id: id, status: "needs-review", signal: "no-deterministic-signal", asset: primary || null };
}

/** Index every basename under the bounded CODE_DIRS into a Set (fail-soft per dir). */
export function buildBasenameIndex(root = ROOT, io = fs) {
  const set = new Set();
  const walk = (d) => {
    let ents;
    try { ents = io.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && e.name !== ".git") walk(p);
      } else {
        set.add(e.name);
      }
    }
  };
  for (const d of CODE_DIRS) walk(path.join(root, d));
  return set;
}

/** Concatenate the live settings.json bodies that exist (fail-soft). */
export function readSettingsText(candidates = SETTINGS_CANDIDATES, io = fs) {
  let text = "";
  for (const p of candidates) {
    try { text += io.readFileSync(p, "utf8") + "\n"; } catch { /* absent host -> skip */ }
  }
  return text;
}

/** git commit subjects+bodies SINCE an ISO date (fail-soft -> "" so the signal no-ops). */
export function readGitLogSince(sinceISO, root = ROOT, run = execFileSync) {
  if (!sinceISO) return "";
  try {
    return run("git", ["-C", root, "log", `--since=${sinceISO}`, "--pretty=%s%n%b"], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 60000,
    });
  } catch { return ""; }
}

/** Classify the whole inventory. Pure (io injected via opts). */
export function verifyAll(inventory, { settingsText = "", basenames = new Set(), gitLogText = "" } = {}) {
  const items = Array.isArray(inventory?.items) ? inventory.items : [];
  const exists = (b) => basenames.has(b);
  const results = items.map((it) => classifyItem(it, { settingsText, basenameExists: exists, gitLogText }));
  const bySignal = {};
  for (const r of results) bySignal[r.signal] = (bySignal[r.signal] || 0) + 1;
  return {
    total: items.length,
    inventoryGeneratedAt: inventory?.generatedAt ?? null,
    counts: {
      likelyClosed: results.filter((r) => r.status === "likely-closed").length,
      needsReview: results.filter((r) => r.status === "needs-review").length,
    },
    bySignal,
    results,
  };
}

function loadInventory(p, io = fs) {
  const raw = io.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function renderMd(report, invPath, stampISO) {
  const c = report.counts;
  const pct = report.total ? ((c.likelyClosed / report.total) * 100).toFixed(0) : "0";
  const lines = [
    `# MISC-TASKS open-status verification -- ${stampISO}`,
    "",
    `> Deterministic re-probe of \`${path.relative(ROOT, invPath).replace(/\\/g, "/")}\` (generated ${report.inventoryGeneratedAt}) against the LIVE repo. Conservative: only \`now-wired\`/\`looks_completed\` -> likely-closed; everything else stays needs-review. Re-run: \`node scripts/verify-misc-tasks-open.mjs\`.`,
    "",
    `- total items: **${report.total}**`,
    `- **likely-closed: ${c.likelyClosed}** (${pct}%) -- do NOT pick these up without re-checking`,
    `- needs-review: ${c.needsReview}`,
    `- by signal: ${Object.entries(report.bySignal).map(([k, v]) => `${k}=${v}`).join(" · ")}`,
    "",
    "## Likely-closed (deterministic high-precision)",
    "| misc_id | signal | asset |",
    "|---|---|---|",
    ...report.results.filter((r) => r.status === "likely-closed").map((r) => `| ${r.misc_id} | ${r.signal} | ${r.asset || ""} |`),
  ];
  return lines.join("\n") + "\n";
}

/**
 * Output artifact paths: a dated HISTORY file + a stable LATEST alias (pure, testable).
 * The LATEST alias lets an automated consumer (the scheduled weekly refresh, a
 * leftover-picker) read ONE known path instead of "find the newest dated file".
 */
export function outputPaths(root = ROOT, dateTag = "") {
  const dir = path.join(root, "state/shared/specs");
  return {
    datedJson: path.join(dir, `MISC-TASKS-VERIFIED-${dateTag}.json`),
    datedMd: path.join(dir, `MISC-TASKS-VERIFIED-${dateTag}.md`),
    latestJson: path.join(dir, "MISC-TASKS-VERIFIED-LATEST.json"),
    latestMd: path.join(dir, "MISC-TASKS-VERIFIED-LATEST.md"),
  };
}

function main() {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes("--json");
  const invIdx = argv.indexOf("--inventory");
  const invPath = invIdx >= 0 && argv[invIdx + 1] ? argv[invIdx + 1] : DEFAULT_INVENTORY;
  let inventory;
  try {
    inventory = loadInventory(invPath);
  } catch (e) {
    process.stderr.write(`verify-misc-tasks-open: cannot read inventory ${invPath}: ${e.message}\n`);
    process.exit(1);
  }
  let report;
  try {
    const settingsText = readSettingsText();
    const basenames = buildBasenameIndex();
    const gitLogText = readGitLogSince(inventory?.generatedAt);
    report = verifyAll(inventory, { settingsText, basenames, gitLogText });
  } catch (e) {
    process.stderr.write(`verify-misc-tasks-open: runtime error: ${e.message}\n`);
    process.exit(2);
  }
  const stampISO = new Date().toISOString();
  const dateTag = stampISO.slice(0, 10);
  const { datedJson: outJson, datedMd: outMd, latestJson, latestMd } = outputPaths(ROOT, dateTag);
  try {
    const jsonBody = JSON.stringify({ generatedAt: stampISO, ...report }, null, 2);
    const mdBody = renderMd(report, invPath, stampISO);
    fs.writeFileSync(outJson, jsonBody);   // dated history
    fs.writeFileSync(outMd, mdBody);
    fs.writeFileSync(latestJson, jsonBody); // stable alias for the auto-refresh + consumers
    fs.writeFileSync(latestMd, mdBody);
  } catch (e) {
    process.stderr.write(`verify-misc-tasks-open: write failed (non-fatal): ${e.message}\n`);
  }
  if (jsonOut) {
    process.stdout.write(JSON.stringify({ ...report, outJson, outMd }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `[verify-misc-tasks-open] ${report.total} items: ${report.counts.likelyClosed} likely-closed, ${report.counts.needsReview} needs-review -> ${path.relative(ROOT, outMd).replace(/\\/g, "/")}\n`
    );
  }
  process.exit(0);
}

const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("verify-misc-tasks-open.mjs");
if (isDirect) main();
