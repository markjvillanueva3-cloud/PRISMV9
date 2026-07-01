#!/usr/bin/env node
/**
 * audit-cross-file-hooks.mjs — find hooks registered in BOTH H:/.claude/settings.json
 * AND H:/prism/.claude/settings.json (which double-fire because Claude merges them).
 */
import fs from "node:fs";

const A = JSON.parse(fs.readFileSync("H:/.claude/settings.json", "utf8"));
const B = JSON.parse(fs.readFileSync("H:/PRISM/.claude/settings.json", "utf8"));

function flatten(json, label) {
  const out = [];
  for (const ev of Object.keys(json.hooks || {})) {
    for (const block of json.hooks[ev] || []) {
      const matcher = block.matcher ?? "*";
      for (const h of block.hooks || []) {
        const scriptMatch = (h.command || "").match(/[A-Za-z]:[\\/][^\s"']+\.m?js/);
        const script = scriptMatch ? scriptMatch[0].replace(/\\/g, "/").toLowerCase() : (h.command || "").slice(0, 60);
        out.push({ src: label, event: ev, matcher, script, fullCmd: h.command });
      }
    }
  }
  return out;
}

const aRows = flatten(A, "H:");
const bRows = flatten(B, "PRISM:");

const aKey = new Map();
for (const r of aRows) aKey.set(`${r.event}|${r.matcher}|${r.script}`, r);

const dupes = [];
for (const r of bRows) {
  const k = `${r.event}|${r.matcher}|${r.script}`;
  if (aKey.has(k)) dupes.push({ ...r, alsoIn: aKey.get(k) });
}

console.log(`H:/.claude hooks: ${aRows.length}`);
console.log(`H:/PRISM hooks: ${bRows.length}`);
console.log(`Cross-file duplicates (same script in same event+matcher): ${dupes.length}`);
const byEvent = {};
for (const d of dupes) byEvent[d.event] = (byEvent[d.event] || 0) + 1;
for (const [ev, n] of Object.entries(byEvent).sort((a, b) => b[1] - a[1])) console.log(`  ${ev.padEnd(20)} ${n}`);

if (process.argv.includes("--detail")) {
  for (const d of dupes.slice(0, 30)) {
    console.log(`\n[${d.event}/${d.matcher}] ${d.script}`);
    console.log(`  H:/.claude: ${d.alsoIn.fullCmd?.slice(0, 100)}`);
    console.log(`  H:/PRISM:   ${d.fullCmd?.slice(0, 100)}`);
  }
}
