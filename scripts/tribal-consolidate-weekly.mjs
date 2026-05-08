#!/usr/bin/env node
/**
 * tribal-consolidate-weekly.mjs
 *
 * OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
 *
 * Weekly cron that promotes high-confidence tribal tips into
 * `knowledge/memories/reference/tribal-<topic>-YYYY-WW.md`. The
 * `/weekly-synthesis` ritual then surfaces these reference files as
 * normal vault material.
 *
 * Promotion contract (envelope cluster_threshold + aggregate_confidence_floor)
 * ---------------------------------------------------------------------------
 *   - Tips must have confidence >= 60 (engine uses 0-100 scale; envelope
 *     specified 0.6 on 0-1 scale → 60 here).
 *   - Cluster size >= 3 distinct tips per topic to qualify for promotion.
 *   - Aggregate cluster confidence (mean) must be >= 60.
 *   - One reference file per (topic, ISO-week) — idempotent: re-running
 *     in the same week skips already-promoted topics.
 *
 * Determinism
 * -----------
 * The synthesis is template-driven (NOT LLM-routed): given identical
 * tribal corpus + ISO-week, output is byte-stable. Trades absolute
 * synthesis quality for reproducibility + zero-dep cron operation.
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const DEFAULT_REFERENCE_DIR = join(REPO_ROOT, "knowledge", "memories", "reference");
const DEFAULT_CONFIDENCE_FLOOR = 60;
const DEFAULT_MIN_CLUSTER_SIZE = 3;
const DEFAULT_MAX_TIPS_PER_TOPIC = 10;
const DEFAULT_MAX_TOPICS_PER_RUN = 100;
const SUMMARY_BODY_CHAR_CAP = 240;
const MARKER_KEY = "_consolidatedAt";

// ─────────────────────────────────────────────────────────────────────────────
// ISO week helper (returns "YYYY-WW")
// ─────────────────────────────────────────────────────────────────────────────
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday in current week determines the year.
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tip-loader contract
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Load tribal tips. Default uses the live TribalKnowledgeEngine via dist
 * (with tsx fallback for dev). Tests can inject `loader` to bypass the
 * engine and feed a synthetic corpus.
 */
async function loadTipsFromEngine() {
  const distPath = join(REPO_ROOT, "mcp-server", "dist", "engines", "TribalKnowledgeEngine.js");
  let mod;
  if (existsSync(distPath)) {
    mod = await import(pathToFileURL(distPath).href);
  } else {
    try {
      const tsx = await import("tsx/esm/api");
      mod = await tsx.tsImport(
        join(REPO_ROOT, "mcp-server", "src", "engines", "TribalKnowledgeEngine.ts"),
        import.meta.url,
      );
    } catch (err) {
      throw new Error(`Could not load TribalKnowledgeEngine: ${err?.message ?? err}`);
    }
  }
  return mod.tribalKnowledgeEngine.search({ limit: 100_000 });
}

function slugifyTopic(s) {
  return String(s || "uncategorized")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function atomicWrite(filePath, content) {
  const tmp = `${filePath}.consol.tmp`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, filePath); }
  catch (err) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clustering + filtering
// ─────────────────────────────────────────────────────────────────────────────

function filterAndCluster(tips, opts) {
  const {
    confidenceFloor = DEFAULT_CONFIDENCE_FLOOR,
    minClusterSize = DEFAULT_MIN_CLUSTER_SIZE,
  } = opts;

  // Filter by confidence floor.
  const eligible = tips.filter((t) => (t.confidence ?? 0) >= confidenceFloor);

  // Group by category as the topic dimension.
  const byTopic = new Map();
  for (const t of eligible) {
    const topic = t.category || "general";
    let bucket = byTopic.get(topic);
    if (!bucket) {
      bucket = [];
      byTopic.set(topic, bucket);
    }
    bucket.push(t);
  }

  // Filter clusters by min size + aggregate confidence.
  const clusters = [];
  for (const [topic, group] of byTopic) {
    if (group.length < minClusterSize) continue;
    const aggMean = group.reduce((s, t) => s + (t.confidence ?? 0), 0) / group.length;
    if (aggMean < confidenceFloor) continue;
    // Sort within cluster by usage_count desc → confidence desc → id asc.
    group.sort((a, b) => {
      if ((b.usage_count ?? 0) !== (a.usage_count ?? 0)) return (b.usage_count ?? 0) - (a.usage_count ?? 0);
      if ((b.confidence ?? 0) !== (a.confidence ?? 0)) return (b.confidence ?? 0) - (a.confidence ?? 0);
      return (a.id ?? "").localeCompare(b.id ?? "");
    });
    clusters.push({ topic, tips: group, aggMean });
  }
  // Sort clusters: bigger + higher-confidence first.
  clusters.sort((a, b) => {
    if (b.tips.length !== a.tips.length) return b.tips.length - a.tips.length;
    if (b.aggMean !== a.aggMean) return b.aggMean - a.aggMean;
    return a.topic.localeCompare(b.topic);
  });
  return clusters;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown synthesis (deterministic template)
// ─────────────────────────────────────────────────────────────────────────────

function synthesizeCluster(cluster, isoWeekStr, generatedAtIso, opts) {
  const { maxTipsPerTopic = DEFAULT_MAX_TIPS_PER_TOPIC } = opts;
  const top = cluster.tips.slice(0, maxTipsPerTopic);

  // Aggregate signals.
  const tagCounts = new Map();
  const sourceCounts = new Map();
  const materials = new Set();
  const operations = new Set();
  for (const t of top) {
    for (const tag of t.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    if (t.source) sourceCounts.set(t.source, (sourceCounts.get(t.source) ?? 0) + 1);
    for (const m of t.material_groups ?? []) materials.add(m);
    for (const o of t.operation_types ?? []) operations.add(o);
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
  const topSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k} (${c})`);

  const fm = [
    "---",
    "type: tribal-consolidation",
    `topic: ${cluster.topic}`,
    `iso_week: ${isoWeekStr}`,
    `cluster_size: ${cluster.tips.length}`,
    `cluster_size_synthesized: ${top.length}`,
    `aggregate_confidence: ${cluster.aggMean.toFixed(1)}`,
    `tags: [${topTags.map((t) => JSON.stringify(t)).join(", ")}]`,
    `materials: [${[...materials].slice(0, 8).map((m) => JSON.stringify(m)).join(", ")}]`,
    `operations: [${[...operations].slice(0, 8).map((o) => JSON.stringify(o)).join(", ")}]`,
    `${MARKER_KEY}: ${generatedAtIso}`,
    "epistemic_only: true",
    "consumed_by_machining: false",
    "milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE",
    "---",
    "",
  ].join("\n");

  let body = `# Tribal: ${cluster.topic} — ${isoWeekStr}\n\n`;
  body += `_${cluster.tips.length} tips clustered on '${cluster.topic}' with mean confidence ${cluster.aggMean.toFixed(1)}/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._\n\n`;

  body += `## Top Tips (${top.length})\n\n`;
  for (let i = 0; i < top.length; i++) {
    const t = top[i];
    const trimmed = (t.body ?? "").replace(/\s+/g, " ").trim();
    const summary = trimmed.length > SUMMARY_BODY_CHAR_CAP
      ? trimmed.slice(0, SUMMARY_BODY_CHAR_CAP) + "…"
      : trimmed;
    body += `### ${i + 1}. ${t.title || t.id}\n\n`;
    body += `- **id:** \`${t.id}\` · **confidence:** ${t.confidence ?? 0}/100 · **usage:** ${t.usage_count ?? 0}\n`;
    if (t.source) body += `- **source:** ${t.source}\n`;
    if (t.tags?.length) body += `- **tags:** ${t.tags.slice(0, 6).join(", ")}\n`;
    body += `\n${summary}\n\n`;
  }

  if (topTags.length > 0) {
    body += `## Common Threads\n\n`;
    body += `Top tags across the cluster: ${topTags.map((t) => `\`${t}\``).join(", ")}.\n\n`;
  }

  if (topSources.length > 0) {
    body += `## Sources Cited\n\n`;
    for (const s of topSources) body += `- ${s}\n`;
    body += "\n";
  }

  body += `## Citations\n\n`;
  for (const t of top) body += `- [[${t.id}]]\n`;
  body += "\n";

  return fm + body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main run
// ─────────────────────────────────────────────────────────────────────────────

export async function runConsolidate(opts = {}) {
  const referenceDir = resolve(opts.referenceDir ?? DEFAULT_REFERENCE_DIR);
  const apply = !!opts.apply;
  const now = opts.now ?? new Date();
  const generatedAtIso = (now instanceof Date ? now : new Date(now)).toISOString();
  const week = isoWeek(now instanceof Date ? now : new Date(now));
  const confidenceFloor = opts.confidenceFloor ?? DEFAULT_CONFIDENCE_FLOOR;
  const minClusterSize = opts.minClusterSize ?? DEFAULT_MIN_CLUSTER_SIZE;
  const maxTopicsPerRun = opts.maxTopicsPerRun ?? DEFAULT_MAX_TOPICS_PER_RUN;
  const maxTipsPerTopic = opts.maxTipsPerTopic ?? DEFAULT_MAX_TIPS_PER_TOPIC;

  // Load tips: either from caller-provided fixture (test) or from engine.
  let tips;
  if (opts.tips) tips = opts.tips;
  else if (typeof opts.loader === "function") tips = await opts.loader();
  else tips = await loadTipsFromEngine();

  const clusters = filterAndCluster(tips, { confidenceFloor, minClusterSize });
  const counters = {
    total_tips: tips.length,
    eligible_topics: clusters.length,
    promoted: 0,
    skipped_existing: 0,
    skipped_topic_cap: 0,
    errored: 0,
  };
  const writes = [];

  let topicCount = 0;
  for (const cluster of clusters) {
    if (topicCount >= maxTopicsPerRun) {
      counters.skipped_topic_cap++;
      continue;
    }
    topicCount++;
    const slug = slugifyTopic(cluster.topic);
    const filename = `tribal-${slug}-${week}.md`;
    const filePath = join(referenceDir, filename);

    if (existsSync(filePath)) {
      counters.skipped_existing++;
      continue;
    }

    const md = synthesizeCluster(cluster, week, generatedAtIso, { maxTipsPerTopic });
    writes.push({ filePath, topic: cluster.topic, clusterSize: cluster.tips.length });

    if (apply) {
      try {
        if (!existsSync(referenceDir)) mkdirSync(referenceDir, { recursive: true });
        atomicWrite(filePath, md);
        counters.promoted++;
      } catch {
        counters.errored++;
      }
    } else {
      counters.promoted++; // dry-run reports "would promote"
    }
  }

  return { apply, week, referenceDir, counters, writes };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { apply: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--json") out.json = true;
    else if (a === "--reference-dir") out.referenceDir = argv[++i];
    else if (a === "--confidence-floor") out.confidenceFloor = Number(argv[++i]);
    else if (a === "--min-cluster") out.minClusterSize = Number(argv[++i]);
    else if (a === "--max-topics") out.maxTopicsPerRun = Number(argv[++i]);
    else if (a === "--help" || a === "-h") { console.log("tribal-consolidate-weekly.mjs — promote high-confidence tribal tip clusters into knowledge/memories/reference/"); process.exit(0); }
  }
  return out;
}

const isMain = (() => {
  try { return resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (isMain) {
  const args = parseArgs(process.argv);
  runConsolidate(args).then((r) => {
    if (args.json) {
      console.log(JSON.stringify(r, null, 2));
    } else {
      console.log(`tribal-consolidate-weekly: apply=${r.apply} week=${r.week}`);
      console.log(`  total tips:         ${r.counters.total_tips}`);
      console.log(`  eligible topics:    ${r.counters.eligible_topics}`);
      console.log(`  promoted:           ${r.counters.promoted}`);
      console.log(`  skipped (exists):   ${r.counters.skipped_existing}`);
      console.log(`  skipped (topic cap):${r.counters.skipped_topic_cap}`);
      console.log(`  errored:            ${r.counters.errored}`);
      if (!r.apply && r.counters.promoted > 0) console.log(`  (DRY-RUN — pass --apply to write)`);
    }
    process.exit(r.counters.errored > 0 ? 1 : 0);
  }).catch((err) => {
    console.error("tribal-consolidate error:", err?.stack ?? err);
    process.exit(1);
  });
}
