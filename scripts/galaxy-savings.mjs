#!/usr/bin/env node
// scripts/galaxy-savings.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SAVINGS-TELEMETRY (capstone).
//
//   node scripts/galaxy-savings.mjs build      # roll up federation token savings → SAVINGS-REPORT.{json,md}
//   node scripts/galaxy-savings.mjs show        # print the savings report
//   node scripts/galaxy-savings.mjs build --json
//
// FAIL-SOFT — always exits 0. Reads the federation sidecars (INDEX/MEMORY-WATCH/MASTER-DIGEST/recall-first/
// DEDUP-REPORT); writes only SAVINGS-REPORT.{json,md}. Missing inputs contribute 0 (honest, never asserted).

import fs from "node:fs";
import { savingsBuild, DEFAULT_REPORT_MD_PATH } from "./lib/galaxy-savings.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const cmd = args.find((a) => !a.startsWith("--")) || "build";

function out(o) { console.log(json ? JSON.stringify(o, null, 2) : o); }

try {
  if (cmd === "show") {
    let md = null; try { md = fs.readFileSync(DEFAULT_REPORT_MD_PATH, "utf8"); } catch { /* missing */ }
    if (md == null) out(json ? { ok: false, reason: "no-report" } : "(no SAVINGS-REPORT.md — run `build` first)");
    else console.log(md);
  } else {
    const res = savingsBuild();
    if (json) out(res);
    else if (res.disabled) out("savings disabled (PRISM_GCF_SAVINGS_DISABLE=1)");
    else if (!res.written) out(`savings: not written — ${res.reason}${res.error ? " (" + res.error + ")" : ""}`);
    else {
      const miss = Object.entries(res.sources || {}).filter(([, v]) => !v).map(([k]) => k);
      out(`✓ SAVINGS-REPORT: per-inject ceiling ~${res.perInjectCeiling} tok/inject (unrealized until wired) · realized ~${res.cumulativeRealized} tok · saveable ~${res.oneTimeSaveable} tok`
        + (miss.length ? `\n  missing sidecars (counted 0): ${miss.join(", ")}` : "")
        + `\n  ${res.mdPath}`);
    }
  }
} catch (e) {
  out(json ? { ok: false, reason: "cli-error", error: String((e && e.message) || e) } : `savings CLI error (non-fatal): ${String((e && e.message) || e)}`);
}
process.exit(0);
