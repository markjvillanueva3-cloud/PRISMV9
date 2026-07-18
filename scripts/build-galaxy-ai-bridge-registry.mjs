#!/usr/bin/env node
/**
 * build-galaxy-ai-bridge-registry.mjs -- live-validate the generic galaxy reasoning
 * bridge across galaxies and write the registry of galaxies it genuinely serves
 * (AI-SYNERGY-AUDIT-MS0/U-AISYN-BRIDGE, slot:charlie).
 *
 * For each target galaxy, calls reasonForGalaxy() (scripts/lib/galaxy-reasoning-
 * bridge.mjs) with a probe query through local Ollama and records whether the bridge
 * assembled real context AND returned a grounded, non-degraded answer. Only such
 * galaxies are marked validated -- the audit credits ownsOrWiresAi ONLY for validated
 * galaxies (R12: credit a proven capability, never a hypothetical).
 *
 * Output: state/shared/specs/GALAXY-AI-BRIDGE-REGISTRY.json
 *
 * Usage:
 *   node scripts/build-galaxy-ai-bridge-registry.mjs                 # all engine galaxies
 *   node scripts/build-galaxy-ai-bridge-registry.mjs g1 g2 ...        # explicit list
 *   PRISM_GALAXY_BRIDGE_MODEL=qwen2.5-coder:1.5b node ...             # faster model
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reasonForGalaxy } from "./lib/galaxy-reasoning-bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");
const OUT = path.join(ROOT, "state/shared/specs/GALAXY-AI-BRIDGE-REGISTRY.json");
const MODEL = process.env.PRISM_GALAXY_BRIDGE_MODEL || "qwen2.5-coder:1.5b";
const MIN_GROUNDED_CHARS = 40;

function enumerateGalaxies() {
  const out = [];
  try {
    for (const e of fs.readdirSync(ENGINES_DIR, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith(".") && fs.existsSync(path.join(ENGINES_DIR, e.name, "CLAUDE.md"))) {
        out.push(e.name);
      }
    }
  } catch {
    /* none */
  }
  return out.sort();
}

async function main() {
  const explicit = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const galaxies = explicit.length ? explicit : enumerateGalaxies();
  const reg = {};
  let validated = 0;
  for (const g of galaxies) {
    let r;
    try {
      r = await reasonForGalaxy(g, `In one sentence, what is the ${g} galaxy responsible for?`, { model: MODEL });
    } catch (e) {
      r = { ok: false, degraded: true, answer: "", sources: [], error: String(e && e.message) };
    }
    const answer = typeof r.answer === "string" ? r.answer : "";
    const isValid =
      r.ok === true && r.degraded === false && Array.isArray(r.sources) && r.sources.length > 0 && answer.trim().length >= MIN_GROUNDED_CHARS;
    reg[g] = {
      validated: isValid,
      degraded: !!r.degraded,
      sources: Array.isArray(r.sources) ? r.sources.length : 0,
      answerChars: answer.trim().length,
    };
    if (isValid) validated += 1;
    process.stdout.write(`  ${g.padEnd(22)} ${isValid ? "VALIDATED" : "skip"} (sources ${reg[g].sources}, ${reg[g].answerChars} chars)\n`);
  }

  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    generator: "scripts/build-galaxy-ai-bridge-registry.mjs",
    bridge: "scripts/lib/galaxy-reasoning-bridge.mjs",
    model: MODEL,
    note: "Each validated galaxy was live-probed: the generic reasoning bridge assembled real context (CLAUDE + synthesis + audit posture) and Ollama returned a grounded, non-degraded answer. The audit credits ownsOrWiresAi ONLY for validated galaxies.",
    counts: { galaxies: galaxies.length, validated },
    galaxies: reg,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  process.stdout.write(`wrote ${path.relative(ROOT, OUT)} -- ${validated}/${galaxies.length} galaxies validated (model ${MODEL})\n`);
}

main().catch((e) => {
  process.stderr.write(`registry build failed: ${e && e.message}\n`);
  process.exit(1);
});
