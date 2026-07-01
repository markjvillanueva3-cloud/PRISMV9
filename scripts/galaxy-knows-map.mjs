#!/usr/bin/env node
// scripts/galaxy-knows-map.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-KNOWS-MAP.
//
//   node scripts/galaxy-knows-map.mjs build              # build KNOWS-MAP.json from the galaxy cards
//   node scripts/galaxy-knows-map.mjs who <query...>     # which galaxy holds context on <query>? (1-lookup)
//   node scripts/galaxy-knows-map.mjs build --json       # machine-readable build() result
//   node scripts/galaxy-knows-map.mjs who cutting force --json
//
// FAIL-SOFT — always exits 0. `build` reads the galaxy cards (INDEX.json) and writes only KNOWS-MAP.json.

import { build, loadKnowsMap, whoKnows } from "./lib/galaxy-knows-map.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const positional = args.filter((a) => !a.startsWith("--"));
const cmd = positional[0] || "build";

function out(obj) { console.log(json ? JSON.stringify(obj, null, 2) : obj); }

try {
  if (cmd === "who") {
    const query = positional.slice(1).join(" ").trim();
    if (!query) { out(json ? { ok: false, reason: "no-query" } : "usage: galaxy-knows-map.mjs who <query...>"); process.exit(0); }
    const km = loadKnowsMap({});
    if (!km) { out(json ? { ok: false, reason: "no-map", hint: "run: node scripts/galaxy-knows-map.mjs build" } : "(no KNOWS-MAP.json — run `build` first)"); process.exit(0); }
    const ranked = whoKnows(query, km, { k: 8 });
    if (json) { out({ ok: true, query, ranked }); }
    else if (!ranked.length) { out(`no galaxy holds context on "${query}"`); }
    else {
      out(`Who knows "${query}"? (top ${ranked.length})`);
      for (const r of ranked) console.log(`  • ${r.galaxy}  (${r.score})  ←  ${r.matchedTopics.join(", ")}`);
    }
  } else {
    // default verb = build
    const res = build();
    if (json) out(res);
    else if (res.disabled) out("knows-map disabled (PRISM_GCF_KNOWS_DISABLE=1)");
    else if (!res.written) out(`knows-map: not written — ${res.reason}${res.error ? " (" + res.error + ")" : ""}`);
    else out(`✓ KNOWS-MAP: ${res.totalGalaxies} galaxies · ${res.tokenCount} capability tokens indexed\n  ${res.knowsPath}\n  query it: node scripts/galaxy-knows-map.mjs who <topic>`);
  }
} catch (e) {
  out(json ? { ok: false, reason: "cli-error", error: String((e && e.message) || e) } : `knows-map CLI error (non-fatal): ${String((e && e.message) || e)}`);
}
process.exit(0);
