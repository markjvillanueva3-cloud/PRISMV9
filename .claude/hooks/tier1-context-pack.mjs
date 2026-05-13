#!/usr/bin/env node
// tier: T4
/**
 * tier1-context-pack.mjs — U-CTX01 Tier-1 Always-On Context Pack
 *
 * Injects ~80K tokens of high-value context at SessionStart.
 * Carefully curated for maximum utility per token.
 *
 * Budget breakdown:
 * - MASTER_INDEX_COMPACT.md (~30k)
 * - BASELINE_INVENTORY summary (~2k)
 * - Capability manifests (~15k combined)
 * - SVI breakdown (~1k)
 * - Thompson posterior snapshot (~2k)
 * - Active work registry (~4k)
 * - Recent reasoning traces (~8k)
 */

import * as fs from "fs";
import * as path from "path";

const TIER1_BUDGET_TOKENS = 80000;
const CHARS_PER_TOKEN = 4;
const TIER1_BUDGET_CHARS = TIER1_BUDGET_TOKENS * CHARS_PER_TOKEN;

const STATE_DIR = "H:/prism/mcp-server/data/state";
const DOCS_DIR = "H:/prism/mcp-server/data/docs";

const TIER1_SOURCES = [
  {
    id: "master-index",
    path: `${DOCS_DIR}/MASTER_INDEX_COMPACT.md`,
    maxChars: 120000,
    priority: 1,
    description: "Master index of all PRISM assets",
  },
  {
    id: "baseline-inventory",
    path: `${STATE_DIR}/BASELINE_INVENTORY.json`,
    maxChars: 8000,
    priority: 2,
    transform: "deltaify",
    description: "Current asset counts",
  },
  {
    id: "svi-state",
    path: `${STATE_DIR}/SVI_WATCH_STATE.json`,
    maxChars: 4000,
    priority: 3,
    transform: "summary",
    description: "System Variability Index status",
  },
  {
    id: "thompson-posterior",
    path: `${STATE_DIR}/BANDIT_POSTERIOR.json`,
    maxChars: 8000,
    priority: 4,
    transform: "summary",
    description: "Thompson sampling state",
  },
  {
    id: "active-work",
    path: "H:/prism/state/shared/AGENT_WORKBOARD.md",
    maxChars: 16000,
    priority: 5,
    description: "Active work registry",
  },
  {
    id: "reasoning-traces",
    path: `${STATE_DIR}/REASONING_TRACE_LEDGER.jsonl`,
    maxChars: 32000,
    priority: 6,
    transform: "last100",
    description: "Recent reasoning chains",
  },
  {
    id: "causal-graph",
    path: `${STATE_DIR}/CAUSAL_GRAPH.json`,
    maxChars: 8000,
    priority: 7,
    transform: "summary",
    description: "Causal relationships",
  },
  {
    id: "synthesized-goals",
    path: `${STATE_DIR}/SYNTHESIZED_GOALS.json`,
    maxChars: 4000,
    priority: 8,
    description: "Goals from last session",
  },
];

function loadSource(source) {
  try {
    if (!fs.existsSync(source.path)) return null;

    let content = fs.readFileSync(source.path, "utf-8");

    if (source.transform === "deltaify") {
      content = deltaifyInventory(content);
    } else if (source.transform === "summary") {
      content = summarizeJson(content, source.id);
    } else if (source.transform === "last100") {
      content = extractLast100Lines(content);
    }

    if (content.length > source.maxChars) {
      content = content.slice(0, source.maxChars) + "\n... [truncated]";
    }

    return {
      id: source.id,
      description: source.description,
      content,
      chars: content.length,
      tokens: Math.ceil(content.length / CHARS_PER_TOKEN),
    };
  } catch {
    return null;
  }
}

function deltaifyInventory(content) {
  try {
    const inv = JSON.parse(content);
    const summary = [];
    summary.push(`# PRISM Inventory (${inv.generatedAt || "unknown"})`);
    summary.push(`- Engines: ${inv.engines?.total || "?"}`);
    summary.push(`- Dispatchers: ${inv.dispatchers?.total || "?"}`);
    summary.push(`- Actions: ${inv.actions?.total || "?"}`);
    summary.push(`- Tests: ${inv.tests?.passing || "?"}/${inv.tests?.total || "?"}`);
    summary.push(`- Build: ${inv.build?.status || "?"}`);
    if (inv.deltas?.length > 0) {
      summary.push(`\n## Recent Changes`);
      for (const delta of inv.deltas.slice(0, 5)) {
        summary.push(`- ${delta.type}: ${delta.change}`);
      }
    }
    return summary.join("\n");
  } catch {
    return content.slice(0, 2000);
  }
}

function summarizeJson(content, sourceId) {
  try {
    const obj = JSON.parse(content);

    if (sourceId === "svi-state") {
      return `SVI: ${obj.currentSVI || "?"}, Psi: ${obj.reachability || "?"}, Trend: ${obj.trend || "stable"}`;
    }

    if (sourceId === "thompson-posterior") {
      const arms = Object.keys(obj.arms || {}).length;
      return `Thompson: ${arms} arms, ${obj.calibration?.totalPredictions || 0} predictions, ${((1 - (obj.calibration?.calibrationError || 0)) * 100).toFixed(0)}% accuracy`;
    }

    if (sourceId === "causal-graph") {
      return `Causal: ${obj.nodeCount || 0} nodes, ${obj.edgeCount || 0} edges. ${obj.summary || ""}`;
    }

    return JSON.stringify(obj, null, 2).slice(0, 2000);
  } catch {
    return content.slice(0, 1000);
  }
}

function extractLast100Lines(content) {
  const lines = content.trim().split("\n").filter(Boolean);
  const last100 = lines.slice(-100);
  return last100.map((line) => {
    try {
      const entry = JSON.parse(line);
      return `[${entry.at || "?"}] ${entry.dispatcher || "?"}:${entry.action || "?"} - ${entry.outcome || "?"}`;
    } catch {
      return line.slice(0, 200);
    }
  }).join("\n");
}

function assembleTier1Pack() {
  const pack = {
    schemaVersion: 1,
    assembledAt: new Date().toISOString(),
    budgetTokens: TIER1_BUDGET_TOKENS,
    sources: [],
    totalChars: 0,
    totalTokens: 0,
  };

  let remainingChars = TIER1_BUDGET_CHARS;

  for (const source of TIER1_SOURCES) {
    if (remainingChars <= 0) break;

    const loaded = loadSource(source);
    if (!loaded) continue;

    if (loaded.chars <= remainingChars) {
      pack.sources.push(loaded);
      pack.totalChars += loaded.chars;
      pack.totalTokens += loaded.tokens;
      remainingChars -= loaded.chars;
    }
  }

  return pack;
}

function formatForInjection(pack) {
  const sections = [];

  sections.push(`# Tier-1 Context Pack (${pack.totalTokens} tokens)`);
  sections.push(`Assembled: ${pack.assembledAt}\n`);

  for (const source of pack.sources) {
    sections.push(`## ${source.description}`);
    sections.push(source.content);
    sections.push("");
  }

  return sections.join("\n");
}

function saveTier1State(pack) {
  try {
    const statePath = `${STATE_DIR}/TIER1_CONTEXT_PACK.json`;
    const dir = path.dirname(statePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(statePath, JSON.stringify({
      schemaVersion: 1,
      assembledAt: pack.assembledAt,
      totalTokens: pack.totalTokens,
      sourceCount: pack.sources.length,
      sources: pack.sources.map((s) => ({
        id: s.id,
        tokens: s.tokens,
        description: s.description,
      })),
    }, null, 2));
  } catch {
    // Ignore
  }
}

async function main() {
  // Assemble Tier-1 pack
  const pack = assembleTier1Pack();

  // Save state for diagnostics
  saveTier1State(pack);

  // Only inject if we have meaningful content
  if (pack.sources.length >= 2 && pack.totalTokens >= 1000) {
    const formatted = formatForInjection(pack);

    // Truncate for system message (just summary)
    const summary = `[Tier1] ${pack.sources.length} sources loaded (${pack.totalTokens} tokens): ${pack.sources.map((s) => s.id).join(", ")}`;

    console.log(JSON.stringify({
      continue: true,
      systemMessage: summary,
    }));
  }
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
