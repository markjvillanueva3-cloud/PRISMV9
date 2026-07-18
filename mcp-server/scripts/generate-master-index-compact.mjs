#!/usr/bin/env node
/**
 * generate-master-index-compact.mjs — Compact pointer-sheet index for Tier-1
 *
 * Scans src/ and emits data/docs/MASTER_INDEX_COMPACT.md: a tight catalog
 * designed for always-on injection inside the 80K tier-1 budget.
 *
 * Content:
 *   1. Counts table (for fast scanning)
 *   2. Dispatchers (one line each with action count from source)
 *   3. Algorithms (one line each)
 *   4. Registries (one line each)
 *   5. Hook catalog
 *   6. Engines grouped by semantic category (name-only)
 *   7. Physics constants pointer
 *   8. Schema catalog
 *
 * Target: 20-30k tokens (70-100K chars). Engines get name-only treatment
 * to keep the budget honest — detailed engine info lives in MASTER_INDEX.md.
 *
 * Usage: node mcp-server/scripts/generate-master-index-compact.mjs
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const MCP_ROOT = resolve(dirname(__filename), "..");
const SRC = join(MCP_ROOT, "src");
const OUT = join(MCP_ROOT, "data", "docs", "MASTER_INDEX_COMPACT.md");

function listTs(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"))
      .filter((f) => { try { return statSync(join(dir, f)).isFile(); } catch { return false; } })
      .sort();
  } catch { return []; }
}

function stripExt(fileName) { return fileName.replace(/\.ts$/, ""); }

// ── Engine category detection (keyword-based) ───────────────────────────

const CATEGORIES = {
  "Force & Physics":        ["force", "kienzle", "stress", "constitutive", "johnson.?cook", "mechanics"],
  "Thermal":                ["thermal", "temperature", "cryo", "heat", "cooling"],
  "Tool Life & Wear":       ["wear", "taylor", "tool.?life", "flank", "crater"],
  "Stability & Chatter":    ["chatter", "stabilit", "regenerat", "damping"],
  "Deflection":             ["deflection", "bending", "whirl"],
  "Speed & Feed":           ["speed.?feed", "auto.?speed", "ultimate.?speed", "orchestrator"],
  "Surface":                ["surface", "roughness", "finish", "integrity", "ra"],
  "Materials & Registry":   ["material", "alloy", "coating", "carbide", "insert"],
  "5-Axis & Multi-Axis":    ["five.?axis", "multi.?axis", "rtcp", "kinematic"],
  "Mill-Turn & Lathe":      ["lathe", "turning", "mill.?turn", "threading"],
  "EDM & Wire EDM":         ["edm", "wedm", "wire.?edm", "sinker"],
  "Grinding":               ["grind", "dress"],
  "Waterjet & Laser":       ["waterjet", "laser", "additive"],
  "CAM & Strategy":         ["cam", "strategy", "toolpath", "hypermill", "mastercam"],
  "Post-Processing":        ["post.?processor", "gcode", "g.?code", "controller"],
  "Safety & Compliance":    ["safety", "collision", "compliance", "guard", "breakage"],
  "Quality & SPC":          ["spc", "quality", "metrology", "fai", "cpk"],
  "AI & ML":                ["bayesian", "kalman", "genetic", "neural", "fuzzy", "inference", "prediction", "learning", "federated"],
  "Reasoning & AGI":        ["reason", "cognitive", "autonomous", "curiosity", "world.?sim", "causal", "goal.?synth"],
  "Session & Lifecycle":    ["session", "handoff", "compact", "lifecycle", "checkpoint"],
  "Memory & Context":       ["memory", "context", "awareness", "embedding", "qdrant", "vector"],
  "Orchestration":          ["orchestrator", "pipeline", "swarm", "coordinator", "workflow"],
  "Inventory & ERP":        ["inventory", "erp", "tool.?crib", "stock", "purchase"],
  "Business & Quote":       ["quote", "cost", "estimat", "billing", "invoic", "invoice", "job"],
  "Self-Awareness":         ["self.?awareness", "duplication.?guard", "capability"],
};

function categorize(name) {
  const lower = name.toLowerCase();
  for (const [cat, patterns] of Object.entries(CATEGORIES)) {
    for (const p of patterns) {
      if (new RegExp(p).test(lower)) return cat;
    }
  }
  return "Other";
}

// ── Action count sniffer ───────────────────────────────────────────────

function countActions(filePath) {
  try {
    const src = readFileSync(filePath, "utf8");
    const match = src.match(/z\.enum\s*\(\s*\[([\s\S]*?)\]\s*\)/);
    if (!match) return null;
    const list = match[1];
    const items = list.match(/["'][^"']+["']/g);
    return items ? items.length : null;
  } catch { return null; }
}

// ── Builders ────────────────────────────────────────────────────────────

function buildDispatchers() {
  const dir = join(SRC, "tools", "dispatchers");
  const files = listTs(dir);
  const rows = files.map((f) => {
    const n = stripExt(f);
    const actions = countActions(join(dir, f));
    return `- ${n}${actions != null ? ` (${actions} actions)` : ""}`;
  });
  return { count: files.length, body: rows.join("\n") };
}

function buildList(subdir, labelTransform = (n) => n) {
  const dir = join(SRC, subdir);
  const files = listTs(dir);
  return { count: files.length, body: files.map((f) => `- ${labelTransform(stripExt(f))}`).join("\n") };
}

function buildEnginesCategorized() {
  const dir = join(SRC, "engines");
  const files = listTs(dir);
  const buckets = new Map();
  for (const f of files) {
    const name = stripExt(f);
    const cat = categorize(name);
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat).push(name);
  }
  const total = files.length;
  const sectionOrder = [...Object.keys(CATEGORIES), "Other"];
  const sections = [];
  for (const cat of sectionOrder) {
    const names = buckets.get(cat);
    if (!names || names.length === 0) continue;
    names.sort();
    sections.push(`### ${cat} (${names.length})\n${names.map((n) => `- ${n}`).join("\n")}`);
  }
  return { count: total, body: sections.join("\n\n") };
}

function buildPhysics() {
  const dir = join(SRC, "physics");
  const files = listTs(dir);
  return { count: files.length, body: files.map((f) => `- ${stripExt(f)}`).join("\n") };
}

function buildSchemas() {
  const dir = join(SRC, "schemas");
  const files = listTs(dir);
  const summary = `${files.length} schema files`;
  return { count: files.length, body: summary };
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  const dispatchers = buildDispatchers();
  const algorithms  = buildList("algorithms");
  const registries  = buildList("registries");
  const hooks       = buildList("hooks");
  const engines     = buildEnginesCategorized();
  const physics     = buildPhysics();
  const schemas     = buildSchemas();

  const totalDispatcherActions = (() => {
    const dir = join(SRC, "tools", "dispatchers");
    let total = 0;
    for (const f of listTs(dir)) {
      const n = countActions(join(dir, f));
      if (n) total += n;
    }
    return total;
  })();

  const now = new Date().toISOString();
  const parts = [];
  parts.push(`# PRISM MASTER INDEX (COMPACT)\n\nGenerated: ${now}\nPurpose: Tier-1 always-on pointer sheet. Full detail → MASTER_INDEX.md.\n`);
  parts.push(`## 1. Counts\n| Asset | Count |\n|---|---|\n| Engines | ${engines.count} |\n| Dispatchers | ${dispatchers.count} |\n| Actions (dispatcher z.enum) | ${totalDispatcherActions} |\n| Algorithms | ${algorithms.count} |\n| Registries | ${registries.count} |\n| Hooks | ${hooks.count} |\n| Physics modules | ${physics.count} |\n| Schemas | ${schemas.count} |\n`);
  parts.push(`## 2. Dispatchers (${dispatchers.count})\n\n${dispatchers.body}`);
  parts.push(`## 3. Algorithms (${algorithms.count})\n\n${algorithms.body}`);
  parts.push(`## 4. Registries (${registries.count})\n\n${registries.body}`);
  parts.push(`## 5. Hooks (${hooks.count})\n\n${hooks.body}`);
  parts.push(`## 6. Physics Modules (${physics.count})\n\n${physics.body}`);
  parts.push(`## 7. Schemas\n\n${schemas.body}. See src/schemas/ for details.`);
  parts.push(`## 8. Engines (${engines.count}) — By Category\n\n${engines.body}`);

  parts.push(`\n---\n\n_Regenerate: \`node mcp-server/scripts/generate-master-index-compact.mjs\`_`);

  const output = parts.join("\n\n");
  writeFileSync(OUT, output, "utf8");
  process.stdout.write(
    `MASTER_INDEX_COMPACT.md: ${output.length} chars (~${Math.round(output.length / 3.5)} tokens), ` +
    `${engines.count} engines / ${dispatchers.count} dispatchers / ${totalDispatcherActions} actions / ` +
    `${algorithms.count} algos / ${registries.count} registries / ${hooks.count} hooks\n`
  );
}

main();
