#!/usr/bin/env node
/**
 * build-mcp-manifest.mjs
 * PSN Unit: U-PSN-MCP-MANIFEST-2026-05-24
 *
 * Generates mcp-server/MANIFEST.json from canonical digest files:
 *   - mcp-server/data/docs/DISPATCHER_DIGEST.md (dispatcher index)
 *   - mcp-server/data/docs/ENGINE_DIGEST.md      (engine list)
 *
 * Flags:
 *   --dry-run   Parse + classify but do NOT write MANIFEST.json (print to stdout)
 *   --json      Always emit raw JSON to stdout (in addition to file write)
 *
 * Karpathy discipline: CLASSIFY→TECHNIQUE→EDGE CASES→FAILURE MODES→WRITE
 *   - Problem type: parse + transform + classify + emit
 *   - Edge cases: missing file, malformed table row, zero actions, UTF-8 mojibake
 *   - Failure modes: source file absent → warn + partial manifest; never hard-crash
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// ── Paths ──────────────────────────────────────────────────────────────────
const DISPATCHER_DIGEST_PATH = resolve(
  REPO_ROOT,
  "mcp-server/data/docs/DISPATCHER_DIGEST.md"
);
const ENGINE_DIGEST_PATH = resolve(
  REPO_ROOT,
  "mcp-server/data/docs/ENGINE_DIGEST.md"
);
const MANIFEST_OUT_PATH = resolve(REPO_ROOT, "mcp-server/MANIFEST.json");

// ── Constants ──────────────────────────────────────────────────────────────
const MANIFEST_VERSION = "1.0.0";
const SERVER_NAME = "PRISM Manufacturing Intelligence MCP Server";
const SERVER_DESCRIPTION =
  "Safety-critical CNC manufacturing platform: print-to-program across mill/lathe/wire-EDM. " +
  "103+ dispatchers, 12 000+ MCP actions covering physics calculations, CAD/CAM toolpaths, " +
  "quality, quoting, scheduling, AI reasoning, and shop-floor intelligence.";
const SERVER_URL = "http://localhost:3100/mcp";
const EXAMPLE_CLIENTS = [
  "Cline",
  "Continue.dev",
  "Aider",
  "Gemini CLI",
  "Goose",
  "Codex",
  "Claude Code",
];

// ── PSN leg → dispatcher keyword patterns ─────────────────────────────────
// 11-leg PSN taxonomy (feedback_psn_definition.md)
const PSN_LEG_PATTERNS = {
  leg1_obsidian_brain: ["memory", "session", "context", "handoff", "state"],
  leg2_prism_os: [
    "operatingsystem",
    "operating_system",
    "atcs",
    "autopilot",
    "autonomous",
    "orchestrat",
    "agent",
  ],
  leg3_wiki: ["knowledge", "doc", "skill", "gsd", "spDispatcher"],
  leg4_memories: ["memory", "inbox", "resourceharv"],
  leg5_tribal: ["shopPractice", "machiningKnowledge", "tribal"],
  leg6_system_viz: ["monitoring", "telemetry", "infra", "guard"],
  leg7_engines: [
    "calc",
    "safety",
    "validation",
    "physics",
    "vibration",
    "fluid",
    "grinding",
    "thread",
    "forming",
    "welding",
    "material",
    "mechanical",
  ],
  leg8_algorithms: ["algorithm", "scientificMath", "scientific_math"],
  leg9_formulas: ["calc", "formula", "kienzle", "taylor"],
  leg10_nn_gnn: ["ml", "intelligence", "ai", "l2", "adapt"],
  leg11_prism_ai: [
    "aiReasoning",
    "intelligence",
    "prism_ai",
    "reasoning",
    "omega",
    "manus",
    "ralph",
  ],
};

// ── Use-case classification keyword map ───────────────────────────────────
const USE_CASE_MAP = [
  { keywords: ["cam", "toolpath", "milling", "mill", "5axis", "multiaxis"], label: "CAM & Toolpath Generation" },
  { keywords: ["cad", "geometry", "drawing", "fusion", "solidworks"], label: "CAD & Geometry" },
  { keywords: ["turning", "lathe", "chuck"], label: "Turning / Lathe Programming" },
  { keywords: ["edm", "wedm", "wire"], label: "Wire EDM & EDM" },
  { keywords: ["calc", "force", "kienzle", "taylor", "speed", "feed", "physics", "vibration", "fluid", "thermal", "grinding"], label: "Manufacturing Physics & Calculations" },
  { keywords: ["safety", "validation", "collision", "guard"], label: "Safety Validation & Collision Detection" },
  { keywords: ["quality", "spc", "metrology", "inspection", "cmm"], label: "Quality & Metrology" },
  { keywords: ["quoting", "business", "erp", "scheduling", "cost", "invoice"], label: "Quoting, Scheduling & ERP" },
  { keywords: ["knowledge", "skill", "tribal", "shopPractice", "machiningKnowledge", "doc"], label: "Manufacturing Knowledge Base" },
  { keywords: ["session", "context", "memory", "state", "handoff"], label: "Session & Memory Management" },
  { keywords: ["agent", "orchestrat", "atcs", "autopilot", "swarm"], label: "AI Agent Orchestration" },
  { keywords: ["intelligence", "reasoning", "ai", "ml", "l2", "adapt"], label: "AI Reasoning & Machine Learning" },
  { keywords: ["integration", "bridge", "export", "resource"], label: "External System Integration" },
  { keywords: ["security", "auth", "tenant", "compliance"], label: "Security, Auth & Compliance" },
  { keywords: ["monitoring", "telemetry", "infra", "process"], label: "Monitoring & Observability" },
  { keywords: ["pp", "post", "cnc", "gcode"], label: "Post-Processing & G-code" },
  { keywords: ["dev", "hook", "generator", "nlHook", "skillScript"], label: "Developer Tooling" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Safely read a file; return null + warn if missing.
 */
function safeRead(filePath, label) {
  if (!existsSync(filePath)) {
    process.stderr.write(
      `[build-mcp-manifest] WARNING: ${label} not found at ${filePath}\n`
    );
    return null;
  }
  return readFileSync(filePath, "utf8");
}

/**
 * Parse DISPATCHER_DIGEST.md table rows.
 * Expected format: `| dispatcherName | description | actionCount |`
 * Returns array of { name, description, actionCount }.
 */
function parseDispatcherDigest(md) {
  const dispatchers = [];
  const lines = md.split("\n");
  // Skip header rows (lines that start with | Dispatcher | or | --- |)
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    // Skip header separator rows
    if (/^\|[-| ]+\|$/.test(trimmed)) continue;
    // Skip header label rows
    if (/\|\s*Dispatcher\s*\|/i.test(trimmed)) continue;

    // Split on | and strip whitespace
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length < 3) continue;

    const [name, descRaw, actionsRaw] = cells;
    if (!name || !descRaw) continue;

    // Action count: parse integer, default 0 if malformed
    const actionCount = parseInt(actionsRaw, 10);
    if (isNaN(actionCount)) continue;

    // Clean up UTF-8 mojibake (e.g. â€" → —)
    const description = descRaw
      .replace(/â€"/g, "—")
      .replace(/â€˜/g, "‘")
      .replace(/â€™/g, "’")
      .trim();

    dispatchers.push({ name, description, actionCount });
  }
  return dispatchers;
}

/**
 * Parse ENGINE_DIGEST.md for total engine count from the header line.
 * Falls back to counting bullet entries if header is absent.
 */
function parseEngineCount(md) {
  // First try: "## N engines indexed"
  const headerMatch = md.match(/##\s+([\d,]+)\s+engines?\s+indexed/i);
  if (headerMatch) {
    return parseInt(headerMatch[1].replace(/,/g, ""), 10);
  }
  // Fallback: count "- **EngineName**:" lines
  const bullets = (md.match(/^- \*\*\w+\*\*:/gm) || []).length;
  return bullets;
}

/**
 * Classify a dispatcher into use-case labels based on name + description.
 * Returns array of matching label strings (up to 3).
 */
function classifyUseCases(name, description) {
  const haystack = (name + " " + description).toLowerCase();
  const matched = [];
  for (const { keywords, label } of USE_CASE_MAP) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      matched.push(label);
      if (matched.length >= 3) break;
    }
  }
  // Ensure at least one generic label
  if (matched.length === 0) {
    matched.push("Manufacturing Intelligence");
  }
  return matched;
}

/**
 * Map a dispatcher to PSN legs it supports.
 * Returns array of leg keys.
 */
function mapPsnLegs(name) {
  const lower = name.toLowerCase();
  const matched = [];
  for (const [leg, patterns] of Object.entries(PSN_LEG_PATTERNS)) {
    if (patterns.some((p) => lower.includes(p.toLowerCase()))) {
      matched.push(leg);
    }
  }
  return matched.length > 0 ? matched : ["leg7_engines"];
}

/**
 * Build the PSN leg mapping: { leg_key: [dispatcherName, ...] }
 */
function buildLegMapping(dispatchers) {
  const map = {};
  for (const key of Object.keys(PSN_LEG_PATTERNS)) {
    map[key] = [];
  }
  for (const d of dispatchers) {
    const legs = mapPsnLegs(d.name);
    for (const leg of legs) {
      if (!map[leg]) map[leg] = [];
      map[leg].push(d.name);
    }
  }
  return map;
}

// ── Main ───────────────────────────────────────────────────────────────────

function buildManifest() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const jsonOut = args.includes("--json");

  // 1. Read source files defensively
  const dispatcherMd = safeRead(DISPATCHER_DIGEST_PATH, "DISPATCHER_DIGEST.md");
  const engineMd = safeRead(ENGINE_DIGEST_PATH, "ENGINE_DIGEST.md");

  // 2. Parse
  const dispatchers = dispatcherMd ? parseDispatcherDigest(dispatcherMd) : [];
  const engineCount = engineMd ? parseEngineCount(engineMd) : 0;

  // 3. Enrich each dispatcher
  const enrichedDispatchers = dispatchers.map((d) => ({
    name: d.name,
    description: d.description,
    actionCount: d.actionCount,
    useCases: classifyUseCases(d.name, d.description),
    exampleClients: EXAMPLE_CLIENTS,
    psnLegs: mapPsnLegs(d.name),
  }));

  // 4. Totals
  const totalActions = dispatchers.reduce((s, d) => s + d.actionCount, 0);

  // 5. PSN leg mapping
  const psnLegMapping = buildLegMapping(dispatchers);

  // 6. Assemble manifest
  const manifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    server: {
      name: SERVER_NAME,
      description: SERVER_DESCRIPTION,
      transport: ["stdio", "http"],
      url: SERVER_URL,
      stdioCommand: "node",
      stdioArgs: ["H:/prism/mcp-server/dist/index.js"],
    },
    stats: {
      dispatcherCount: enrichedDispatchers.length,
      totalActions,
      engineCount,
      externalAgentsSupported: EXAMPLE_CLIENTS.length,
    },
    dispatchers: enrichedDispatchers,
    psn_leg_mapping: psnLegMapping,
    integration: {
      protocols: ["MCP 1.0", "stdio", "HTTP/SSE"],
      authentication: "none (localhost) / token (HTTP)",
      safetyNote:
        "Safety-critical system. S(x) >= 0.70 hard gate enforced. " +
        "All physics calculations must be verified against machine capabilities before use.",
      externalAgentGuide: "See mcp-server/README.md §External AI Agent Integration",
    },
  };

  // 7. Output
  const json = JSON.stringify(manifest, null, 2);

  if (dryRun || jsonOut) {
    process.stdout.write(json + "\n");
  }

  if (!dryRun) {
    writeFileSync(MANIFEST_OUT_PATH, json, "utf8");
    process.stderr.write(
      `[build-mcp-manifest] Written: ${MANIFEST_OUT_PATH}\n` +
        `  dispatchers: ${enrichedDispatchers.length}\n` +
        `  total actions: ${totalActions}\n` +
        `  engines: ${engineCount}\n`
    );
  } else {
    process.stderr.write(
      `[build-mcp-manifest] DRY RUN — manifest NOT written.\n` +
        `  dispatchers: ${enrichedDispatchers.length}\n` +
        `  total actions: ${totalActions}\n` +
        `  engines: ${engineCount}\n`
    );
  }

  return manifest;
}

// Run if invoked directly
buildManifest();

// Named export for tests
export {
  parseDispatcherDigest,
  parseEngineCount,
  classifyUseCases,
  mapPsnLegs,
  buildLegMapping,
  buildManifest,
  PSN_LEG_PATTERNS,
  USE_CASE_MAP,
  EXAMPLE_CLIENTS,
};
