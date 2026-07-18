#!/usr/bin/env node
// scripts/recall-first.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-RECALL-FIRST.
//
//   node scripts/recall-first.mjs check <file>     # would re-reading this be better as a recall? (+est savings)
//   node scripts/recall-first.mjs summary           # cumulative recall-vs-reread savings estimate
//   node scripts/recall-first.mjs check <file> --json
//
// FAIL-SOFT — always exits 0. The golf-patched PreToolUse:Read hook calls recallFirst() directly; this CLI
// is for manual inspection + the savings dashboard.

import { recallFirst, recallSavingsSummary } from "./lib/recall-first.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const positional = args.filter((a) => !a.startsWith("--"));
const cmd = positional[0] || "summary";

function out(o) { console.log(json ? JSON.stringify(o, null, 2) : o); }

try {
  if (cmd === "check") {
    const file = positional[1];
    if (!file) { out(json ? { ok: false, reason: "no-file" } : "usage: recall-first.mjs check <file>"); process.exit(0); }
    const r = recallFirst(file);
    if (json) { out(r); }
    else if (r.nudge) { out(r.text + `\n  (surface=${r.surface}, read≈${r.readTokens} tok, recall≈${r.recallTokens} tok, est savings ${r.savings})`); }
    else { out(`no recall nudge for ${file} — ${r.reason}${r.bytes != null ? ` (${r.bytes}B)` : ""}`); }
  } else {
    // default verb = summary
    const s = recallSavingsSummary({});
    if (json) out(s);
    else {
      out(`♻ recall-first savings (estimated): ${s.totalNudges} nudges · ~${s.totalEstSavingsTokens} tok saved`);
      for (const [surface, v] of Object.entries(s.bySurface || {})) console.log(`  ${surface}: ${v.nudges} nudges · ~${v.estSavingsTokens} tok`);
      if (!s.totalNudges) console.log("  (no nudges recorded yet — wire the PreToolUse:Read hook via the golf patch)");
    }
  }
} catch (e) {
  out(json ? { ok: false, reason: "cli-error", error: String((e && e.message) || e) } : `recall-first CLI error (non-fatal): ${String((e && e.message) || e)}`);
}
process.exit(0);
