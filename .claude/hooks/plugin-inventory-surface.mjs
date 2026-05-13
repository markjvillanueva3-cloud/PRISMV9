#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — surfaces PLUGIN_INVENTORY.json (MCP servers +
 * agent plugins + skill packs) freshness in boot context so sessions
 * know what they can reach via prism_ai ai_pin_* actions.
 *
 * Phase 0.17 U-PLG3 runtime seed.
 *
 * Exits 0 on any failure (continueOnError: true contract).
 */

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const INV = resolve("H:/prism/mcp-server/data/state/PLUGIN_INVENTORY.json");

function main() {
  try {
    const raw = readFileSync(INV, "utf8");
    const doc = JSON.parse(raw);
    const count = Array.isArray(doc.entries) ? doc.entries.length : 0;
    const bk = doc.byKind || {};
    const kinds = Object.entries(bk).map(([k, v]) => `${k}=${v}`).join(",");
    const mtime = statSync(INV).mtimeMs;
    const ageHours = ((Date.now() - mtime) / 3600_000).toFixed(1);
    process.stdout.write(
      `plugin-inventory: ${count} plugins (${kinds}) ${ageHours}h old — use prism_ai ai_pin_summary or ai_pin_list\n`
    );
    process.exit(0);
  } catch (err) {
    process.stdout.write(
      `plugin-inventory: unavailable (${err && err.message ? err.message : "unknown"}) — run 'npx tsx mcp-server/scripts/build-plugin-inventory.ts'\n`
    );
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
