#!/usr/bin/env node
// scripts/galaxy-context-card.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD (alpha, 2026-05-31).
//
//   node scripts/galaxy-context-card.mjs build [--max-bytes N] [--top-n N]   # (re)build every galaxy card + INDEX.json
//   node scripts/galaxy-context-card.mjs list                                # list built cards (from INDEX.json)
//   node scripts/galaxy-context-card.mjs show <galaxy>                       # print one built card
//   node scripts/galaxy-context-card.mjs build --json                        # machine-readable index
//
// Cards land in state/shared/galaxy-cards/<galaxy>.card.md + INDEX.json (consumed by U-GCF-CAG-CARDS).
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { buildAllCards, readCard, DEFAULT_ROOTS } from "./lib/galaxy-context-card.mjs";

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const has = (flag) => process.argv.includes(flag);

function main() {
  const verb = process.argv[2] || "build";
  const json = has("--json");

  if (verb === "build") {
    const res = buildAllCards({
      maxBytes: Number(arg("--max-bytes", "")) || undefined,
      topN: Number(arg("--top-n", "")) || undefined,
    });
    if (json) { process.stdout.write(JSON.stringify(res, null, 2) + "\n"); return; }
    if (res.disabled) { console.log("galaxy-context-card: DISABLED via PRISM_GCF_CARD_DISABLE=1"); return; }
    if (res.count === 0 && res.skipped === 0) {
      // 0 galaxies enumerated AND 0 skipped → the engines dir was empty/unreadable, not a real "nothing to do".
      // Fail-VISIBLE (R12) so a wrong PRISM_ROOT/enginesDir doesn't masquerade as success. Still exit 0 (fail-soft for callers).
      console.warn(`⚠ galaxy-context-card: found 0 galaxies under ${DEFAULT_ROOTS.enginesDir} — check PRISM_ROOT / enginesDir. NO cards built (this is NOT a normal success).`);
      return;
    }
    const totalBytes = res.cards.reduce((a, c) => a + c.bytes, 0);
    const truncated = res.cards.filter((c) => c.truncated).length;
    console.log(`galaxy-context-card: built ${res.count} card(s), skipped ${res.skipped}.`);
    console.log(`  total ${totalBytes} B (~${(totalBytes / Math.max(1, res.count)).toFixed(0)} B/card avg), ${truncated} truncated.`);
    console.log(`  → ${DEFAULT_ROOTS.cardsDir}/<galaxy>.card.md + INDEX.json`);
    return;
  }

  if (verb === "list") {
    let idx;
    try { idx = JSON.parse(fs.readFileSync(`${DEFAULT_ROOTS.cardsDir}/INDEX.json`, "utf8")); }
    catch { console.log("no INDEX.json — run `build` first."); return; }
    if (json) { process.stdout.write(JSON.stringify(idx, null, 2) + "\n"); return; }
    console.log(`${idx.count} card(s) (built ${idx.generatedAt}):`);
    for (const c of idx.cards) console.log(`  ${c.galaxy.padEnd(22)} ${String(c.bytes).padStart(5)} B  ${c.factCount} facts${c.truncated ? "  [truncated]" : ""}`);
    return;
  }

  if (verb === "show") {
    const g = process.argv[3];
    if (!g) { console.error("usage: show <galaxy>"); process.exit(2); }
    const card = readCard(g);
    if (card == null) { console.error(`no card for "${g}" — run \`build\` first.`); process.exit(1); }
    process.stdout.write(card.endsWith("\n") ? card : card + "\n");
    return;
  }

  console.error(`unknown verb "${verb}" — use build | list | show <galaxy>`);
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
