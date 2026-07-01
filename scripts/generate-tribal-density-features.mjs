#!/usr/bin/env node
/**
 * generate-tribal-density-features.mjs — system-viz augmentation: tribal-tip
 * DENSITY heatmap roost.
 *
 * G5 of SYSTEM-VIZ-HIGH-ROI-MS0 (sierra, 2026-05-21). Complements iter-9
 * echo's `generate-wiki-tribal-features.mjs` which surfaces gap-finding
 * (which wiki entries LACK a tribal companion). This generator surfaces
 * the inverse: where tribal knowledge already accumulates — the heat map
 * of the manufacturing brain.
 *
 * Scans `knowledge/wiki/code-tribal/**​/*.md` (~829 files at ship time,
 * ~278 with curated frontmatter — the rest are raw canonical/ extraction
 * snippets counted as tipsMalformed, not dropped). Parses the frontmatter
 * `domain:` field, buckets counts by domain, and emits:
 *   - one parent ghost roost `ghost.tribal_density` under
 *     `ghost.planned_features`
 *   - one L9 child per domain bucket, sized by tip count + tagged with a
 *     density band (hot ≥10 / warm 5-9 / cold 1-4)
 *   - meta.tribalDensity with the full per-domain breakdown
 *
 * Pure-core `generate({tipFiles, readTip, now, topN, hotThreshold,
 * warmThreshold})` is injectable for testing. CLI wraps with real fs.
 *
 * Output: state/shared/system-viz/tribal-density-augmentation.json
 *
 * Wired into:
 *   - scripts/merge-augmentations.mjs (loadOptional + version-stamp + miscTasks-pattern newNodes splice)
 *   - scripts/regen-viz.mjs FAST[]
 *
 * Spec: state/shared/specs/SYSTEM-VIZ-HIGH-ROI-AUDIT*.md G5
 *
 * Authored 2026-05-21 sierra (claude-e6145e8b) — SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-TRIBAL-DENSITY.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.tribal_density";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const DOMAIN_LAYER = "L9";
export const HOT_THRESHOLD = 10;
export const WARM_THRESHOLD = 5;
export const MAX_LABEL = 80;
export const MAX_INFO = 120;
export const DEFAULT_TOPN = 50;
export const HARD_TOPN_CAP = 100;

/**
 * Parse YAML-ish frontmatter from a tribal-tip markdown file. Only the
 * `domain:` field is load-bearing here; we tolerate everything else.
 * Returns null on missing/malformed frontmatter — caller treats as
 * "no domain" (bucketed under "_unscoped" rather than dropped, R12).
 */
export function parseTipFrontmatter(text) {
  if (typeof text !== "string") return null;
  // Frontmatter block must start at offset 0 with `---\n` and close with `\n---`.
  if (!text.startsWith("---")) return null;
  const closeIdx = text.indexOf("\n---", 4);
  if (closeIdx < 0) return null;
  const block = text.slice(4, closeIdx);
  const out = {};
  for (const line of block.split(/\r?\n/)) {
    // Match `key: value` with non-bracket scalar values only. Tags arrays
    // are skipped — we don't need them for density.
    const m = /^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim();
    // Skip array values for now (e.g. `tags: [foo, bar]`).
    if (value.startsWith("[") || value.startsWith("{")) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Pure: walk a directory tree and yield every *.md file path. Skips dot
 * directories. Injectable `readdir` + `stat` for tests.
 */
export function listMarkdownFiles(rootDir, opts = {}) {
  const _readdir = opts.readdir ?? ((d) => readdirSync(d));
  const _stat = opts.stat ?? ((p) => statSync(p));
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try { entries = _readdir(dir); } catch { continue; }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      let s;
      try { s = _stat(full); } catch { continue; }
      if (s.isDirectory && s.isDirectory()) stack.push(full);
      else if (name.endsWith(".md")) out.push(full);
    }
  }
  return out;
}

/**
 * Pure: classify a tip count into a density band. Names + thresholds
 * are intentionally hoisted to module constants so the legend in
 * /system-viz can track from a single source of truth.
 */
export function classifyDensity(count, hotThreshold = HOT_THRESHOLD, warmThreshold = WARM_THRESHOLD) {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 1) return "desert";
  if (count >= hotThreshold) return "hot";
  if (count >= warmThreshold) return "warm";
  return "cold";
}

/**
 * Pure: deterministic node id for a domain bucket. Encoded so two
 * domain strings that lowercase-normalize to the same slug still
 * disambiguate via FNV-1a hash of the original.
 */
export function densityNodeId(domain) {
  const orig = String(domain || "_unscoped");
  const linkPart = orig
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "x";
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < orig.length; i++) {
    h ^= orig.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const tag = h.toString(16).padStart(8, "0");
  return `ghost.tribal_density.${linkPart}.${tag}`;
}

/**
 * Pure: read every tip, bucket by `domain`, classify density band,
 * emit roost + L9 child nodes. Injectable `readTip` for tests.
 *
 * Returned shape mirrors generate-misc-tasks-features.mjs convention:
 * `{newNodes, newEdges, stats}` — merge-augmentations.mjs splices via
 * the same miscTasks-style block.
 */
export function generate({ tipFiles, readTip, existingNodeIds = [], topN = DEFAULT_TOPN, hotThreshold = HOT_THRESHOLD, warmThreshold = WARM_THRESHOLD }) {
  if (!Array.isArray(tipFiles)) throw new TypeError("generate: tipFiles must be an array");
  if (typeof readTip !== "function") throw new TypeError("generate: readTip must be a function");

  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const byDomain = new Map();
  let parsedCount = 0, malformedCount = 0;

  for (const file of tipFiles) {
    let text;
    try { text = readTip(file); }
    catch { malformedCount++; continue; }
    const fm = parseTipFrontmatter(text);
    if (!fm) { malformedCount++; continue; }
    parsedCount++;
    const domain = (fm.domain && fm.domain.length > 0) ? fm.domain : "_unscoped";
    byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
  }

  // Sort by descending count for top-N slice (children are limited so the
  // graph doesn't explode if some future migration creates 200 domains).
  const ranked = [...byDomain.entries()].sort((a, b) => b[1] - a[1]);
  const cap = Number.isFinite(topN) && topN >= 0 ? Math.min(Math.floor(topN), HARD_TOPN_CAP) : 0;
  const sample = ranked.slice(0, cap);

  const newNodes = [];
  let roostEmitted = 0;
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `Tribal Density (${parsedCount} tips, ${byDomain.size} domains)`.slice(0, MAX_LABEL),
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${parsedCount} tribal tips parsed across ${byDomain.size} domains; top ${sample.length} surfaced as children (hot ≥${hotThreshold}, warm ≥${warmThreshold}, cold ≥1). Heatmap of where tribal knowledge accumulates vs deserts.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  const bandTally = { hot: 0, warm: 0, cold: 0, desert: 0 };
  let childrenEmitted = 0, childrenSkipped = 0;
  for (const [domain, count] of sample) {
    const nodeId = densityNodeId(domain);
    if (ids.has(nodeId)) { childrenSkipped++; continue; }
    const band = classifyDensity(count, hotThreshold, warmThreshold);
    bandTally[band] = (bandTally[band] ?? 0) + 1;
    newNodes.push({
      id: nodeId,
      label: `${domain}: ${count}`.slice(0, MAX_LABEL),
      layer: DOMAIN_LAYER,
      ghost: true,
      status: "ghost",
      kind: "tribal-density-bucket",
      parent: ROOST_ID,
      density_band: band,
      tip_count: count,
      info: `${count} tribal tip(s) tagged domain="${domain}". Band: ${band} (≥${band === "hot" ? hotThreshold : band === "warm" ? warmThreshold : 1}).`.slice(0, MAX_INFO),
    });
    ids.add(nodeId);
    childrenEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      tipsParsed: parsedCount,
      tipsMalformed: malformedCount,
      domainsTotal: byDomain.size,
      topN: cap,
      childrenEmitted,
      childrenSkipped,
      bandTally,
    },
  };
}

// ---------- CLI ----------

function runCli() {
  const tribalRoot = join(REPO_ROOT, "knowledge", "wiki", "code-tribal");
  const augPath = join(REPO_ROOT, "state", "shared", "system-viz", "tribal-density-augmentation.json");

  if (!existsSync(tribalRoot)) {
    process.stderr.write(`generate-tribal-density-features: corpus missing at ${tribalRoot}\n`);
    process.exit(1);
  }

  const envStr = process.env.PRISM_TRIBAL_DENSITY_TOPN;
  const envTopN = envStr !== undefined && envStr !== "" ? Number(envStr) : NaN;
  const topN = Number.isFinite(envTopN) ? envTopN : DEFAULT_TOPN;

  const tipFiles = listMarkdownFiles(tribalRoot);
  const readTip = (p) => readFileSync(p, "utf8");
  const now = new Date().toISOString();

  let result;
  try {
    const { newNodes, newEdges, stats } = generate({ tipFiles, readTip, topN });
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: now,
      source: "knowledge/wiki/code-tribal/**/*.md",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    process.stderr.write(`FATAL: generate failed — ${e.message}\n`);
    process.exit(2);
  }

  mkdirSync(dirname(augPath), { recursive: true });
  writeFileSync(augPath, JSON.stringify(result, null, 2));

  process.stdout.write(JSON.stringify({
    ok: true,
    tipsScanned: tipFiles.length,
    tipsParsed: result.stats.tipsParsed,
    domainsTotal: result.stats.domainsTotal,
    childrenEmitted: result.stats.childrenEmitted,
    bandTally: result.stats.bandTally,
    augPath,
  }, null, 2) + "\n");
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1] === __filename) {
  runCli();
}
