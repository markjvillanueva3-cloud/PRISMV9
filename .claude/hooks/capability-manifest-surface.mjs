#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — CAPABILITY_MANIFEST.json freshness + surface.
 *
 * Phase 0.17 U-PLG10 from MASTER-AI-SYSTEM-ROADMAP. Reads the composed
 * manifest so `/aware` and any downstream boot-context filter knows the
 * top-line capability totals (agents, slash commands, MCPs) alongside
 * engine/dispatcher counts from SELF_AWARENESS_MANIFEST.
 *
 * Exits 0 on any failure (continueOnError: true contract).
 */

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const MANIFEST = resolve("H:/prism/mcp-server/data/state/CAPABILITY_MANIFEST.json");

function main() {
  try {
    const raw = readFileSync(MANIFEST, "utf8");
    const doc = JSON.parse(raw);
    const mtime = statSync(MANIFEST).mtimeMs;
    const ageHours = ((Date.now() - mtime) / 3600_000).toFixed(1);
    const a = doc.agents?.total ?? 0;
    const c = doc.slashCommands?.total ?? 0;
    const m = doc.mcps?.total ?? 0;
    const engines = doc.selfAwareness?.counts?.engines ?? "?";
    process.stdout.write(
      `capability-manifest: ${a} agents × ${c} commands × ${m} plugins × ${engines} engines (${ageHours}h old) — use prism_ai ai_cap_manifest\n`
    );
    process.exit(0);
  } catch (err) {
    process.stdout.write(
      `capability-manifest: unavailable (${err && err.message ? err.message : "unknown"}) — run 'npx tsx mcp-server/scripts/build-capability-manifest.ts'\n`
    );
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
