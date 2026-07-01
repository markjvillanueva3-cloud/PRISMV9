#!/usr/bin/env node
// tier: T3
// U-HFR04 wire — fleet-wide soul-rule graduation Stop driver.
//
// Reads every <slot>.md under state/shared/slot-souls/. Calls
// findFleetGraduatedRules. Surfaces rules present in ≥3 souls as candidates
// for promotion to CLAUDE.md doctrine. Advisory only.
//
// Knobs: PRISM_HFR04_DISABLE=1, PRISM_HFR04_MIN_SLOTS=N

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findFleetGraduatedRules } from "../../scripts/lib/hermes-frontier-utils.mjs";

const SOULS_DIR = "H:/prism/state/shared/slot-souls";

function parseSoul(path, slotName) {
  if (!existsSync(path)) return null;
  let raw;
  try { raw = readFileSync(path, "utf8"); } catch { return null; }
  const m = raw.match(/^refuse_list:\s*\n((?:\s*-\s*.+\n)+)/m);
  const refuse_list = m
    ? m[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean)
    : [];
  return { slot: slotName, refuse_list };
}

function readAllSouls() {
  if (!existsSync(SOULS_DIR)) return [];
  const out = [];
  let entries;
  try { entries = readdirSync(SOULS_DIR, { withFileTypes: true }); }
  catch { return []; }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    if (e.name.endsWith(".draft.md")) continue;  // skip evolution-draft companions
    const slotName = e.name.replace(/\.md$/, "");
    const soul = parseSoul(join(SOULS_DIR, e.name), slotName);
    if (soul) out.push(soul);
  }
  return out;
}

async function main() {
  if (process.env.PRISM_HFR04_DISABLE === "1") process.exit(0);
  const minSlots = Number(process.env.PRISM_HFR04_MIN_SLOTS) || 3;
  const souls = readAllSouls();
  if (souls.length < minSlots) process.exit(0);
  const graduated = findFleetGraduatedRules(souls, { minSlots });
  if (graduated.length === 0) process.exit(0);
  const lines = [
    `💡 Fleet-wide soul-rule graduation — ${graduated.length} refuse-rule(s) appear in ≥${minSlots} slot souls:`,
  ];
  for (const g of graduated.slice(0, 5)) {
    lines.push(`  • \`${g.rule}\` (in ${g.slotCount} slots: ${g.slots.slice(0, 5).join(", ")})`);
  }
  lines.push(`  Operator: consider promoting to CLAUDE.md doctrine (under §SAFETY RAILS or similar).`);
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: lines.join("\n") } }));
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith("stop-fleet-soul-graduation.mjs")) {
  main().catch(() => process.exit(0));
}
