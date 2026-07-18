#!/usr/bin/env node
// scripts/galaxy-xdedup.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XDEDUP.
//
//   node scripts/galaxy-xdedup.mjs build              # scan galaxy memories for cross-galaxy dup facts → DEDUP-REPORT.json
//   node scripts/galaxy-xdedup.mjs build --cards       # scan the ≤1KB cards instead (inject-token surface)
//   node scripts/galaxy-xdedup.mjs show                # list the dup clusters + canonical recommendation
//   node scripts/galaxy-xdedup.mjs build --json
//
// FAIL-SOFT — always exits 0. ADVISORY: emits a report; never edits a galaxy MEMORY.md. Writes only DEDUP-REPORT.json.

import fs from "node:fs";
import { xdedup, DEFAULT_REPORT_PATH } from "./lib/galaxy-xdedup.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const source = args.includes("--cards") ? "cards" : "memories";
const cmd = args.find((a) => !a.startsWith("--")) || "build";

function loadReport() { try { return JSON.parse(fs.readFileSync(DEFAULT_REPORT_PATH, "utf8")); } catch { return null; } }
function out(o) { console.log(json ? JSON.stringify(o, null, 2) : o); }

try {
  if (cmd === "show") {
    const j = loadReport();
    if (!j) { out(json ? { ok: false, reason: "no-report" } : "(no DEDUP-REPORT.json — run `build` first)"); process.exit(0); }
    if (json) out(j);
    else {
      out(`DEDUP-REPORT: ${j.clusterCount} cross-galaxy dup clusters · ${j.factCount} facts scanned · ~${j.totalEstTokensSaved} tok saveable (jaccard≥${j.jaccardThreshold})`);
      for (const c of (j.clusters || []).slice(0, 15)) console.log(`  [${c.galaxies.length}gx ~${c.estTokensSaved}tok] keep ${c.canonical}, point ${c.duplicateGalaxies.join(",")} → "${String(c.fact).replace(/[*`]/g, "").slice(0, 64)}"`);
    }
  } else {
    const res = xdedup({ source });
    if (json) out(res);
    else if (res.disabled) out("xdedup disabled (PRISM_GCF_XDEDUP_DISABLE=1)");
    else if (!res.written) out(`xdedup: not written — ${res.reason}${res.error ? " (" + res.error + ")" : ""}`);
    else out(`✓ DEDUP-REPORT (${source}): ${res.clusterCount} cross-galaxy dup clusters in ${res.factCount} facts · ~${res.totalEstTokensSaved} tok saveable\n  ${res.reportPath}\n  ADVISORY — keep canonical + replace dups with [[pointers]] (never auto-edits a peer MEMORY.md)`);
  }
} catch (e) {
  out(json ? { ok: false, reason: "cli-error", error: String((e && e.message) || e) } : `xdedup CLI error (non-fatal): ${String((e && e.message) || e)}`);
}
process.exit(0);
