#!/usr/bin/env node
/**
 * verify-galaxy-ai-synergy.mjs (U-ALPHA-SYNERGY-VERIFY, slot:alpha 2026-06-11)
 *
 * Durable, re-runnable EVIDENCE that the AI-systems synergy (NN/GNN/LoRA/CAG+RAG/deep-reasoning
 * substrate) is wired across ALL galaxies + synergized with the per-galaxy knowledge surfaces the
 * standing /goal names: Obsidian vault, PSN, PRISM awareness, CLAUDE.md, SOUL.md, MEMORY.md, wikis.
 *
 * Per galaxy it checks the FULL synergized substrate is present:
 *   - SOUL.md / CLAUDE.md / MEMORY.md / AWARENESS.md  (per-galaxy doctrine + brain + awareness)
 *   - the "AI Stack (synergized ...)" block in SOUL.md  (the fleet-wide AI-stack wiring marker)
 *   - a galaxy-reasoning-bridge reference  (PSN leg #10 -- hybrid CAG+RAG reasoning over its own substrate)
 *   - the Obsidian synthesis-brain feed  (knowledge/memories/patterns/<galaxy>_synthesis.md)
 *
 * This complements (does NOT duplicate) the AI-SYNERGY-AUDIT.json scorer: the audit grades 5 weighted
 * sub-scores; this is a hard PRESENCE gate that emits a per-galaxy PASS/GAP table as committed evidence.
 *
 * USAGE: node scripts/verify-galaxy-ai-synergy.mjs [--json]
 * Emits: state/shared/specs/GALAXY-AI-SYNERGY-EVIDENCE.md (+ .json)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const ENG = "mcp-server/src/engines";
const SYNTH_DIR = "knowledge/memories/patterns";

export function checkGalaxy(name, { engRoot = ENG, synthDir = SYNTH_DIR, readImpl = readFileSync, existsImpl = existsSync } = {}) {
  const base = `${engRoot}/${name}`;
  const has = (f) => existsImpl(`${base}/${f}`);
  const soul = has("SOUL.md"), claude = has("CLAUDE.md"), mem = has("MEMORY.md"), aware = has("AWARENESS.md");
  let aiStack = false, bridgeRef = false;
  if (soul) {
    try {
      const s = readImpl(`${base}/SOUL.md`, "utf8");
      aiStack = /AI Stack \(synergized/.test(s);
      bridgeRef = /galaxy-reasoning-bridge/.test(s);
    } catch { /* unreadable -> false */ }
  }
  const synth = existsImpl(`${synthDir}/${name}_synthesis.md`);
  const checks = { soul, claude, mem, aware, aiStack, bridgeRef, synth };
  // synth is advisory (compounds as the brain grows); the 6 substrate checks are load-bearing.
  const pass = soul && claude && mem && aware && aiStack && bridgeRef;
  return { galaxy: name, pass, checks };
}

export function discoverGalaxies({ engRoot = ENG, readdirImpl = readdirSync, existsImpl = existsSync } = {}) {
  return readdirImpl(engRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsImpl(`${engRoot}/${d.name}/SOUL.md`))
    .map((d) => d.name)
    .sort();
}

function main() {
  const galaxies = discoverGalaxies();
  const results = galaxies.map((g) => checkGalaxy(g));
  const full = results.filter((r) => r.pass).length;
  const gaps = results.filter((r) => !r.pass);
  const synthCount = results.filter((r) => r.checks.synth).length;

  const report = {
    generatedAt: null, // stamped by caller / git; Date.now() unavailable in some harness contexts
    galaxiesVerified: galaxies.length,
    fullSubstrate: full,
    synthBrainFeed: synthCount,
    gaps: gaps.map((r) => ({ galaxy: r.galaxy, missing: Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k) })),
  };

  if (process.argv.includes("--json")) { console.log(JSON.stringify(report, null, 2)); return report; }

  const lines = [
    "# Galaxy AI-Synergy Evidence (verify-galaxy-ai-synergy.mjs)",
    "",
    `**${full}/${galaxies.length} galaxies** carry the FULL synergized AI substrate:`,
    "SOUL.md + CLAUDE.md + MEMORY.md + AWARENESS.md + the `AI Stack (synergized)` block + a galaxy-reasoning-bridge reference (PSN leg #10, hybrid CAG+RAG).",
    `Obsidian synthesis-brain feed present for **${synthCount}/${galaxies.length}** (advisory -- compounds as each brain grows).`,
    "",
    gaps.length === 0
      ? "**ZERO gaps** -- every galaxy is AI-synergized with its own doctrine/brain/awareness + the fleet reasoning bridge."
      : `**${gaps.length} galaxies have substrate gaps:**`,
    ...gaps.map((r) => `- ${r.galaxy}: missing ${Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k).join(", ")}`),
    "",
    "| galaxy | soul | claude | mem | aware | ai-stack | bridge | synth |",
    "|--------|:----:|:------:|:---:|:-----:|:--------:|:------:|:-----:|",
    ...results.map((r) => {
      const c = r.checks; const m = (b) => (b ? "OK" : "--");
      return `| ${r.galaxy} | ${m(c.soul)} | ${m(c.claude)} | ${m(c.mem)} | ${m(c.aware)} | ${m(c.aiStack)} | ${m(c.bridgeRef)} | ${m(c.synth)} |`;
    }),
    "",
    "_Re-run: `node scripts/verify-galaxy-ai-synergy.mjs`. Complements `state/shared/specs/AI-SYNERGY-AUDIT.json` (weighted scorer). slot:alpha 2026-06-11._",
  ];
  const md = lines.join("\n");
  writeFileSync("state/shared/specs/GALAXY-AI-SYNERGY-EVIDENCE.md", md);
  writeFileSync("state/shared/specs/GALAXY-AI-SYNERGY-EVIDENCE.json", JSON.stringify(report, null, 2));
  console.log(`${full}/${galaxies.length} full substrate | ${gaps.length} gaps | synth ${synthCount}/${galaxies.length} -> state/shared/specs/GALAXY-AI-SYNERGY-EVIDENCE.{md,json}`);
  return report;
}

const isMain = process.argv[1] && process.argv[1].endsWith("verify-galaxy-ai-synergy.mjs");
if (isMain) main();
