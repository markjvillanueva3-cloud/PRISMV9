#!/usr/bin/env node
/**
 * index-quoting-data-files.mjs — catalog every quoting-domain DATA file (corpora, ledgers, state,
 * databases, calibration, LoRA dataset) into a fast-search index wired to the galaxy (slot:charlie).
 *
 * GOAL (operator 2026-05-29): "wire all relevant file and data files to your domain galaxy for
 * quicker searches and easier utilization of the data." Produces:
 *   - state/shared/quoting/QUOTING-DATA-INDEX.md          (human/Claude-readable data atlas)
 *   - state/shared/quoting/quoting-data-index.json        (entries in the SAME schema as the
 *       knowledge index so charlie-quoting-knowledge-inject.mjs surfaces data files too)
 *
 * Each entry: {id, source:"data", title, summary(purpose + shape), keywords, path, kind, sizeKb,
 * records}. Shape is peeked (first 64KB) — large files (>2MB) are NOT fully parsed (degraded-env +
 * V8 safety); small JSON gets accurate top-keys + array length.
 *
 * Self-discovering, pure-core + injected reader, defensive-default (gotcha #6). No top-level Date.now.
 *
 * CLI:  node scripts/index-quoting-data-files.mjs [--json] [--root H:/prism]
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SYNTH_VERSION = "1.0.0";
const PEEK_BYTES = 65536;
const FULL_PARSE_MAX_KB = 2048;

const DATA_RX = /quot|quote|pricing|\bcost\b|estimat|margin|freight|import-cost|docustrata|fair.?market|jm-(customer|vendor)|baseline.*record|calibration|quoting.?lora/i;

/** Curated purposes for known quoting data files (basename/suffix → purpose). Pure lookup. */
export const KNOWN_PURPOSES = {
  "baseline-records-corpus-with-synth.json": "iter56 training baseline — 47,905 (customer,part_id) revenue records (synth+real overlay); the quote-vs-actual training source",
  "quoting-knowledge-index.json": "compiled wiki+tribal+memory retrieval index (113 curated entries) — feeds the knowledge auto-invoke hook",
  "QUOTING-AWARENESS.md": "live domain awareness digest (engine/hook/algo/frontend counts + drift + next unit)",
  "quoting-training-corpus-manifest.json": "declared training inputs for india's LoRA/GNN/RAG (outcome-pairs+baseline+calibration+RAG+lora-dataset)",
  "latest-drift-alert.json": "canonical drift surface — pre-flight this before any baseline regen (freshness gate)",
  "quoting-calibration-active.json": "active multiplicative correction factors (per-customer+global) — read at quote-time by QuotingActiveFactorLoaderEngine",
  "jm-customers.jsonl": "JM Die customer database (473 customers) — customer-name filter + per-customer factor key",
  "jm-vendors.jsonl": "JM Die vendor database (12 vendors)",
  "jm-vendor-ap-ledger.jsonl": "JM accounts-payable ledger — 20,736 real vendor bill line-items (2014-2026), categorized; the cost-basis half of the data ceiling (should_cost + secondary-ops priors)",
  "jm-vendor-cost-index.json": "vendor cost rollup — per-category unit-cost priors (outside-process/material/tooling/overhead) + top-vendor spend; consumed by should_cost + quoting_secondary_ops_price + DocustrataAccountingBridgeEngine",
  "vendor-directory.jsonl": "VDN vendor/distributor directory (VENDOR-NETWORK-MS0) — 204 vendors: 174 JM-AP-seeded + curated supplier catalog, JOIN-keyed for hotel ERP master + DistributorSearchEngine; website/category/pricing-access/region per vendor",
  "vendor-directory-index.json": "vendor-directory rollup — counts by source/category/pricing-access; regen: node scripts/build-vendor-directory.mjs",
  "cost-alarm-config.json": "CostAlarmEngine thresholds",
  "cost-telemetry.jsonl": "cost-alarm telemetry stream",
  "quoting_lora_train.jsonl": "LoRA instruction-tuning train split (charlie produces; india trains)",
  "quoting_lora_val.jsonl": "LoRA val split",
  "quoting_lora_test.jsonl": "LoRA test split",
};

/** Category from path. Pure. */
export function categoryOf(relPath) {
  const p = (relPath || "").replace(/\\/g, "/").toLowerCase();
  if (/lora/.test(p)) return "lora-dataset";
  if (/calibration/.test(p)) return "calibration";
  // charlie's accounts-payable cost-basis priors (jm-vendor-ap ledger + cost index) — checked BEFORE
  // the database rule so "jm-vendor-ap" doesn't collide with the juliett-owned "jm-vendors" DB pattern.
  if (/vendor-ap|vendor-cost|cost-basis/.test(p)) return "cost-basis";
  // the VDN vendor/distributor directory (VENDOR-NETWORK-MS0) — charlie-owned, before the DB rule.
  if (/vendor-directory/.test(p)) return "vendor-directory";
  if (/databases\/|jm-(customers|vendors)\b/.test(p)) return "database";
  if (/drift|alert/.test(p)) return "drift";
  if (/baseline|corpus|synth/.test(p)) return "corpus";
  if (/knowledge|awareness|manifest|data-index/.test(p)) return "index";
  // "state" matches the real state dir / telemetry — NOT the "state/shared" path prefix
  if (/telemetry|alarm|\/data\/state\//.test(p)) return "state";
  return "data";
}

/** Is this a quoting-relevant data file we should index? Pure. */
export function isQuotingData(relPath) {
  if (typeof relPath !== "string") return false;
  const p = relPath.replace(/\\/g, "/");
  if (!/\.(json|jsonl|csv|md)$/.test(p)) return false;
  if (/\.test\.|\.tmp|\.corrupt|\.bak/.test(p)) return false;
  return DATA_RX.test(p);
}

/** Purpose for a path: curated → inferred-from-category. Pure. */
export function purposeFor(relPath) {
  const base = (relPath || "").replace(/\\/g, "/").split("/").pop() || "";
  if (KNOWN_PURPOSES[base]) return KNOWN_PURPOSES[base];
  return `quoting ${categoryOf(relPath)} file`;
}

/** Peek shape from head text + size. Pure. Returns {topKeys, recordEstimate, kind}. */
export function peekShape(headText, kind, sizeBytes, fullParse) {
  const safe = typeof headText === "string" ? headText : "";
  if (kind === "jsonl") {
    let firstKeys = [];
    const nl = safe.indexOf("\n");
    const firstLine = nl > 0 ? safe.slice(0, nl) : safe;
    try { firstKeys = Object.keys(JSON.parse(firstLine)); } catch { /* head truncated */ }
    const avgLen = firstLine.length > 0 ? firstLine.length + 1 : 0;
    const recordEstimate = avgLen > 0 && Number.isFinite(sizeBytes) ? Math.round(sizeBytes / avgLen) : null;
    return { topKeys: firstKeys.slice(0, 10), recordEstimate, exact: false };
  }
  // json
  if (fullParse) {
    try {
      const j = JSON.parse(safe);
      if (Array.isArray(j)) return { topKeys: j[0] && typeof j[0] === "object" ? Object.keys(j[0]).slice(0, 10) : [], recordEstimate: j.length, exact: true };
      const keys = Object.keys(j);
      const arrKey = keys.find((k) => Array.isArray(j[k]));
      return { topKeys: keys.slice(0, 10), recordEstimate: arrKey ? j[arrKey].length : null, exact: true };
    } catch { /* fall through to head scan */ }
  }
  // head-scan top-level keys (large file)
  const keys = [...safe.matchAll(/"([a-zA-Z0-9_]+)"\s*:/g)].map((m) => m[1]);
  return { topKeys: [...new Set(keys)].slice(0, 10), recordEstimate: null, exact: false };
}

/** Build the data index from a list of file descriptors. Pure. */
export function buildDataIndex(files) {
  const safe = Array.isArray(files) ? files : [];
  const entries = [];
  const counts = { total: 0, byCategory: {} };
  for (const f of safe) {
    if (!f || typeof f.relPath !== "string" || !isQuotingData(f.relPath)) continue;
    const cat = categoryOf(f.relPath);
    // Cross-galaxy ownership: the database files (jm-customers/jm-vendors) are juliett's domain
    // (Database expansion) — charlie CONSUMES them. All other quoting data is charlie-owned.
    const owner = cat === "database" ? "juliett" : "charlie";
    const kind = f.relPath.endsWith(".jsonl") ? "jsonl" : f.relPath.endsWith(".json") ? "json" : f.relPath.split(".").pop();
    const shape = peekShape(f.head || "", kind, f.sizeBytes, (f.sizeBytes || 0) <= FULL_PARSE_MAX_KB * 1024 && kind === "json");
    const base = f.relPath.replace(/\\/g, "/").split("/").pop();
    const purpose = purposeFor(f.relPath);
    const recPart = shape.recordEstimate != null ? ` · ${shape.exact ? "" : "~"}${shape.recordEstimate} records` : "";
    const keyPart = shape.topKeys.length ? ` · keys: ${shape.topKeys.slice(0, 6).join(",")}` : "";
    entries.push({
      id: "data:" + f.relPath.replace(/\\/g, "/"),
      source: "data",
      title: base,
      summary: `${purpose} (${kind}, ${Math.round((f.sizeBytes || 0) / 1024)}KB${recPart}${keyPart})`,
      keywords: [...new Set([cat, kind, ...base.replace(/\.[^.]+$/, "").split(/[-_.]/).filter((t) => t.length >= 4).map((t) => t.toLowerCase())])],
      path: f.relPath.replace(/\\/g, "/"),
      kind, category: cat, owner, sizeKb: Math.round((f.sizeBytes || 0) / 1024), records: shape.recordEstimate,
    });
    counts.total++;
    counts.byCategory[cat] = (counts.byCategory[cat] || 0) + 1;
  }
  entries.sort((a, b) => (a.category + a.title).localeCompare(b.category + b.title));
  return { entries, counts };
}

/** Render the data atlas markdown. Pure. */
export function renderDataIndexMd(index, generatedAt, root) {
  const { entries, counts } = index;
  const cats = [...new Set(entries.map((e) => e.category))].sort();
  const lines = [
    "# QUOTING-DATA-INDEX — quoting data files wired to the galaxy (auto-generated)",
    "",
    `> Fast-search atlas of every quoting data file (corpora/ledgers/state/databases/calibration/LoRA). Built by \`scripts/index-quoting-data-files.mjs\`; surfaced on-demand by \`charlie-quoting-knowledge-inject.mjs\`. Generated ${generatedAt}.`,
    "",
    `**${counts.total} data files indexed** (${Object.entries(counts.byCategory).map(([c, n]) => `${c}:${n}`).join(", ")}).`,
    "",
  ];
  for (const c of cats) {
    const owner = entries.find((x) => x.category === c)?.owner;
    lines.push(`## ${c}${owner && owner !== "charlie" ? ` — owned by **${owner}** galaxy (charlie consumes; wire DB changes through ${owner})` : ""}`);
    for (const e of entries.filter((x) => x.category === c)) lines.push(`- **${e.title}** — ${e.summary}  \`${e.path}\``);
    lines.push("");
  }
  lines.push(`_indexer v${SYNTH_VERSION} · root ${root}_`);
  return lines.join("\n");
}

// ---- impure shell ---------------------------------------------------------

function readHead(fp, n) {
  try {
    const fd = openSync(fp, "r");
    const buf = Buffer.alloc(n);
    const bytes = readSync(fd, buf, 0, n, 0);
    closeSync(fd);
    return buf.slice(0, bytes).toString("utf8");
  } catch { return ""; }
}

/** Discover quoting data files under the known roots. Impure, defensive. */
export function gatherDataFiles(root) {
  const r = root.replace(/\\/g, "/");
  const roots = [
    "state/shared/quoting", "state/shared/databases", "state/shared/calibration",
    "mcp-server/data/state", "mcp-server/data/quoting-lora-smoke-out",
  ];
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 2) return;
    let e;
    try { e = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const d of e) {
      const fp = join(dir, d.name);
      if (d.isDirectory()) { walk(fp, depth + 1); continue; }
      const rel = fp.replace(/\\/g, "/").startsWith(r) ? fp.replace(/\\/g, "/").slice(r.length + 1) : fp.replace(/\\/g, "/");
      if (!isQuotingData(rel)) continue;
      let sizeBytes = 0;
      try { sizeBytes = statSync(fp).size; } catch { /* skip */ }
      out.push({ relPath: rel, sizeBytes, head: readHead(fp, PEEK_BYTES) });
    }
  };
  for (const sub of roots) walk(join(r, sub), 0);
  return out;
}

export function indexDataFiles(opts = {}) {
  const root = (opts.root || DEFAULT_ROOT).replace(/\\/g, "/");
  const files = opts.files || gatherDataFiles(root);
  const index = buildDataIndex(files);
  const generatedAt = opts.generatedAtIso || new Date().toISOString().slice(0, 10);
  return { index, md: renderDataIndexMd(index, generatedAt, root), json: { schemaVersion: SYNTH_VERSION, generatedAt, root, counts: index.counts, entries: index.entries } };
}

// ---- CLI ------------------------------------------------------------------

function main(argv) {
  const root = (argv.find((a) => a.startsWith("--root=")) || "").split("=")[1] || DEFAULT_ROOT;
  const { md, json } = indexDataFiles({ root });
  if (argv.includes("--json")) { process.stdout.write(JSON.stringify(json, null, 2) + "\n"); return 0; }
  const outMd = join(root, "state/shared/quoting/QUOTING-DATA-INDEX.md");
  const outJson = join(root, "state/shared/quoting/quoting-data-index.json");
  try {
    mkdirSync(join(root, "state/shared/quoting"), { recursive: true });
    writeFileSync(outMd, md, "utf8");
    writeFileSync(outJson, JSON.stringify(json), "utf8");
    process.stdout.write(`[quoting-data-index] ${json.counts.total} files (${Object.entries(json.counts.byCategory).map(([c, n]) => `${c}:${n}`).join(", ")}) → ${outMd}\n`);
  } catch (e) { process.stderr.write(`[quoting-data-index] FAILED: ${e && e.message}\n`); return 1; }
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && process.argv[1].replace(/\\/g, "/").endsWith("index-quoting-data-files.mjs"); } catch { return false; }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
