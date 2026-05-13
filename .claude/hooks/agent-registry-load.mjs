#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — surfaces Task-tool agent registry (AGENT_REGISTRY.json)
 * freshness in boot context so prism_ai { action: "ai_agr_match" } is
 * known to be available for routing prompts to appropriate subagents.
 *
 * Phase 0.17 U-PLG1 runtime seed.
 *
 * Exits 0 on any failure (continueOnError: true contract).
 */

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REGISTRY_PATH = resolve("H:/prism/mcp-server/data/state/AGENT_REGISTRY.json");

function main() {
  try {
    const raw = readFileSync(REGISTRY_PATH, "utf8");
    const doc = JSON.parse(raw);
    const count = Array.isArray(doc.entries) ? doc.entries.length : 0;
    const categories = new Set();
    for (const e of doc.entries || []) categories.add(e.category);
    const generatedAt = doc.generatedAt || "unknown";
    const mtime = statSync(REGISTRY_PATH).mtimeMs;
    const ageHours = ((Date.now() - mtime) / 3600_000).toFixed(1);

    process.stdout.write(
      `agent-registry: ${count} Task-tool agents across ${categories.size} categories (${generatedAt}, ${ageHours}h old) — use prism_ai ai_agr_match to route prompts to agents\n`
    );
    process.exit(0);
  } catch (err) {
    process.stdout.write(
      `agent-registry: unavailable (${err && err.message ? err.message : "unknown"}) — data/state/AGENT_REGISTRY.json missing\n`
    );
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
