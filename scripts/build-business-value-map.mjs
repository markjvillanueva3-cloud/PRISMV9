#!/usr/bin/env node
// Classify every PRISM system-viz node by business-value type so the viewer
// can show which nodes save cost, generate revenue, or are safety-critical.
//
// Reads:  state/shared/system-viz/system-graph.json
// Writes: state/shared/system-viz/business-value-map.json

import { writeFileSync, mkdirSync } from "node:fs";
import { readGraphStreaming } from "./lib/graph-io.mjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const SRC = resolve(ROOT, "state/shared/system-viz/system-graph.json");
const OUT = resolve(ROOT, "state/shared/system-viz/business-value-map.json");

// ---------------------------------------------------------------------------
// Tag heuristics
// ---------------------------------------------------------------------------

// Saleable / revenue-bearing surfaces. PRISM's two products (SFC + Master
// Post), the customer-facing pages they wrap, and the ERP integrations sold
// alongside them.
const REVENUE_KEYWORDS = [
  // Speed/Feed Calculator
  "speed", "feed", "speedfeed", "speed-feed", "sfc", "chip", "chip-thinning",
  "kienzle", "cutting-force", "tool-life", "taylor", "chipload",
  // Master Post / post-processor product
  "post", "postproc", "post-processor", "masterpost", "master-post", "ppg",
  "post-generate", "post-validate", "post-harden", "post-register",
  "controller", "fanuc", "siemens", "haas", "okuma", "mazak", "heidenhain",
  // Quote / customer / portal / RFQ / ERP
  "quote", "rfq", "customer", "portal", "erp", "invoice", "billing",
  "subscription", "pricing", "checkout",
];

// Cost-saving features — anything that reduces cycle time, tool wear, scrap,
// energy, labor on the shop floor.
const COST_SAVING_KEYWORDS = [
  "cycle-time", "cycle_time", "cycletime", "crush",
  "tool-life", "tool_life", "toollife", "toolwear", "tool-wear", "wear",
  "waste", "scrap", "chip-control", "chipcontrol",
  "magazine", "magazine-optimize", "tool-magazine",
  "calibrate", "calibration",
  "predictive", "maintenance", "downtime",
  "energy", "spindle-load", "spindleload",
  "optimize", "optim", "optimal",
  "yield", "throughput", "utilization", "utilisation",
  "first-part", "firstpart", "first-article",
  "stock-optimize", "nesting",
];

// Safety-critical — Omega gate, S(x) score, collision, validation, drift.
const SAFETY_KEYWORDS = [
  "omega", "s-score", "sscore", "s_x", "safety", "collision",
  "validate", "validation", "validator",
  "drift", "anomaly", "guard", "envelope", "limit", "lockout",
  "emergency", "estop", "e-stop", "alarm",
  "risk", "audit", "scrutin",
];

// Customer-facing — UI nodes the customer (or end user) actually sees.
const CUSTOMER_FACING_KEYWORDS = [
  "portal", "customer", "rfq", "quotebuilder", "quote-builder",
  "checkout", "billing", "invoice", "ui", "page", "frontend", "fe.",
  "cqask", "cadquery",
];

// Learning / knowledge surfaces.
const LEARNING_KEYWORDS = [
  "wiki", "tribal", "knowledge", "video-learn", "videolearn",
  "pdf-learn", "pdflearn", "lessons", "learn", "trajectory",
  "concept", "decision-log", "playbook",
];

// Internal infrastructure — state, hooks, scripts, build, registries, fs,
// memory plumbing. (Personas land here too — they describe *who* uses PRISM
// but aren't sold.)
const INFRA_KEYWORDS = [
  "hook", "script", "registry", "state", "memory", "build",
  "ci", "cd", "ollama", "transport", "mcp", "rpc",
  "scheduler", "cron", "log", "persona",
];

// Subgroup → default tag heuristics.
const SUBGROUP_TAGS = {
  personas: ["infrastructure"],
  pages: ["customer-facing"],
  variants: ["customer-facing"],
  transport: ["infrastructure"],
  ollama: ["infrastructure"],
  state: ["infrastructure"],
  fs: ["infrastructure"],
  registry: ["infrastructure"],
  catalog: ["infrastructure"],
  corpus: ["learning"],
  wiki: ["learning"],
  memory: ["infrastructure"],
  knowledge: ["learning"],
  business: ["revenue"],
  manufacturing: ["cost-saving"],
  ai_intel: ["cost-saving"],
  system: ["infrastructure"],
  wired: [],
  unwired: [],
  core: ["infrastructure"],
  tier1: ["safety-critical"],
  tier2: ["safety-critical"],
  tier3: [],
  other: [],
};

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

function matchAny(haystack, needles) {
  const lower = haystack.toLowerCase();
  for (const n of needles) {
    if (lower.includes(n)) return n;
  }
  return null;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function classify(node) {
  const tags = [];
  const reasons = [];

  const idLower = (node.id || "").toLowerCase();
  const labelLower = (node.label || "").toLowerCase();
  const infoLower = (node.info || "").toLowerCase();
  const haystack = `${idLower} ${labelLower} ${infoLower}`;

  // Subgroup-default tags
  const sg = SUBGROUP_TAGS[node.subgroup];
  if (sg && sg.length) {
    for (const t of sg) tags.push(t);
    reasons.push(`subgroup=${node.subgroup}`);
  }

  // Revenue
  const revHit = matchAny(haystack, REVENUE_KEYWORDS);
  if (revHit) {
    tags.push("revenue");
    reasons.push(`revenue-kw=${revHit}`);
  }

  // Cost saving
  const costHit = matchAny(haystack, COST_SAVING_KEYWORDS);
  if (costHit) {
    tags.push("cost-saving");
    reasons.push(`cost-kw=${costHit}`);
  }

  // Safety critical
  const safetyHit = matchAny(haystack, SAFETY_KEYWORDS);
  if (safetyHit) {
    tags.push("safety-critical");
    reasons.push(`safety-kw=${safetyHit}`);
  }

  // Customer facing
  const cfHit = matchAny(haystack, CUSTOMER_FACING_KEYWORDS);
  if (cfHit || node.layer === "L1") {
    tags.push("customer-facing");
    if (cfHit) reasons.push(`customer-kw=${cfHit}`);
    else reasons.push(`layer=L1`);
  }

  // Learning
  const learnHit = matchAny(haystack, LEARNING_KEYWORDS);
  if (learnHit) {
    tags.push("learning");
    reasons.push(`learning-kw=${learnHit}`);
  }

  // Infrastructure (only if nothing else stuck OR explicit infra keyword in id)
  const infraHit = matchAny(idLower, INFRA_KEYWORDS);
  if (infraHit) {
    tags.push("infrastructure");
    reasons.push(`infra-kw=${infraHit}`);
  }

  // Backstop: every node must have at least one tag.
  if (tags.length === 0) {
    tags.push("infrastructure");
    reasons.push("default-fallback");
  }

  // ROI bucket
  let roi = "low";
  if (tags.includes("revenue") || tags.includes("safety-critical")) {
    roi = "high";
  } else if (tags.includes("cost-saving") || tags.includes("customer-facing")) {
    // Customer-facing pages are revenue-adjacent; cost-saving is shop-floor critical.
    roi = tags.includes("cost-saving") ? "high" : "medium";
  } else if (tags.includes("learning")) {
    roi = "medium";
  }

  // Build one-line rationale
  const rationale =
    `${node.layer}/${node.subgroup} :: ${reasons.slice(0, 4).join("; ")}` +
    (reasons.length > 4 ? `; +${reasons.length - 4} more` : "");

  return {
    tags: uniq(tags),
    roi,
    rationale,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // system-graph.json is >512MiB; JSON.parse(readFileSync(SRC,"utf8")) hits V8's max string length
  // ("Cannot create a string longer than 0x1fffffe8", exit 1). readGraphStreaming reads it as a Buffer
  // + parses incrementally -- the established bypass (scripts/lib/graph-io.mjs, same reader
  // merge-augmentations uses). U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (sierra 2026-06-22).
  const graph = readGraphStreaming(SRC);

  if (!Array.isArray(graph.nodes)) {
    throw new Error("system-graph.json missing nodes[] array");
  }

  const augmentations = {};
  const totals = {
    revenue: 0,
    costSaving: 0,
    safetyCritical: 0,
    customerFacing: 0,
    infrastructure: 0,
    learning: 0,
  };

  const roiHistogram = { high: 0, medium: 0, low: 0 };

  for (const node of graph.nodes) {
    const c = classify(node);
    augmentations[node.id] = c;

    if (c.tags.includes("revenue")) totals.revenue++;
    if (c.tags.includes("cost-saving")) totals.costSaving++;
    if (c.tags.includes("safety-critical")) totals.safetyCritical++;
    if (c.tags.includes("customer-facing")) totals.customerFacing++;
    if (c.tags.includes("infrastructure")) totals.infrastructure++;
    if (c.tags.includes("learning")) totals.learning++;

    roiHistogram[c.roi]++;
  }

  const output = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "state/shared/system-viz/system-graph.json",
    nodeCount: graph.nodes.length,
    totals,
    roiHistogram,
    augmentations,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(output, null, 2), "utf8");

  // Console report
  console.log(`[business-value-map] wrote ${OUT}`);
  console.log(`  nodes        : ${graph.nodes.length}`);
  console.log(`  revenue      : ${totals.revenue}`);
  console.log(`  cost-saving  : ${totals.costSaving}`);
  console.log(`  safety-crit  : ${totals.safetyCritical}`);
  console.log(`  customer     : ${totals.customerFacing}`);
  console.log(`  infrastructure: ${totals.infrastructure}`);
  console.log(`  learning     : ${totals.learning}`);
  console.log(`  ROI high/med/low: ${roiHistogram.high}/${roiHistogram.medium}/${roiHistogram.low}`);
}

main();
