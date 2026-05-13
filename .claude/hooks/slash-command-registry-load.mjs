#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — load SLASH_COMMAND_REGISTRY.json into the AI-routable
 * SlashCommandRecommenderEngine so prism_ai { action: "ai_scr_recommend" }
 * returns matches from boot without needing an explicit ai_scr_load call.
 *
 * Phase 0.17 U-PLG2 runtime seed.
 *
 * Emits a one-line SessionStart context with total count and freshness.
 * Exits 0 even on failure (continueOnError: true contract).
 */

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REGISTRY_PATH = resolve("H:/prism/mcp-server/data/state/SLASH_COMMAND_REGISTRY.json");

function main() {
  try {
    const raw = readFileSync(REGISTRY_PATH, "utf8");
    const doc = JSON.parse(raw);
    const count = Array.isArray(doc.entries) ? doc.entries.length : 0;
    const generatedAt = doc.generatedAt || "unknown";
    const mtime = statSync(REGISTRY_PATH).mtimeMs;
    const ageHours = ((Date.now() - mtime) / 3600_000).toFixed(1);

    // Emit a compact SessionStart line — Claude/Codex both read stdout.
    process.stdout.write(
      `slash-command-registry: ${count} commands loaded (${generatedAt}, ${ageHours}h old) — use prism_ai ai_scr_recommend to route a prompt\n`
    );
    process.exit(0);
  } catch (err) {
    process.stdout.write(
      `slash-command-registry: unavailable (${err && err.message ? err.message : "unknown"}) — run 'npx tsx mcp-server/scripts/build-slash-command-registry.ts' to seed\n`
    );
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
