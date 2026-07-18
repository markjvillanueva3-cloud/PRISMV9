#!/usr/bin/env node
// scripts/galaxy-rollup.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-ROLLUP.
//
//   node scripts/galaxy-rollup.mjs build          # roll up galaxy cards → MASTER-DIGEST.{md,json}
//   node scripts/galaxy-rollup.mjs show            # print the current MASTER-DIGEST.md
//   node scripts/galaxy-rollup.mjs build --json    # machine-readable rollup() result
//
// FAIL-SOFT — always exits 0 (this is an optimization aid, never a build gate). Reads INDEX.json
// (the salience source, produced by `galaxy-context-card build`); writes only its own digest sidecars.

import fs from "node:fs";
import { rollup, DEFAULT_DIGEST_PATH } from "./lib/galaxy-rollup.mjs";

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith("--")) || "build";
const json = args.includes("--json");

function out(obj) { console.log(json ? JSON.stringify(obj, null, 2) : obj); }

try {
  if (cmd === "show") {
    let text = null;
    try { text = fs.readFileSync(DEFAULT_DIGEST_PATH, "utf8"); } catch { /* missing */ }
    if (text == null) {
      out(json ? { ok: false, reason: "no-digest", path: DEFAULT_DIGEST_PATH }
               : `(no digest yet at ${DEFAULT_DIGEST_PATH} — run: node scripts/galaxy-rollup.mjs build)`);
    } else {
      console.log(text);
    }
  } else {
    // default verb = build
    const res = rollup();
    if (json) {
      out(res);
    } else if (res.disabled) {
      out("rollup disabled (PRISM_GCF_ROLLUP_DISABLE=1)");
    } else if (!res.written) {
      out(`rollup: not written — ${res.reason}${res.error ? " (" + res.error + ")" : ""}`);
    } else {
      const top = (res.top || []).map((t) => `${t.galaxy} ${t.salience == null ? "—" : t.salience.toFixed(2)}`).join(" · ");
      out(`✓ MASTER-DIGEST: ${res.galaxyCount} galaxies · ${res.bytes} B${res.truncated ? " (truncated)" : ""}\n  top: ${top}\n  ${res.digestPath}\n  ${res.jsonPath}`);
    }
  }
} catch (e) {
  // never throw out of the CLI
  out(json ? { ok: false, reason: "cli-error", error: String((e && e.message) || e) }
           : `rollup CLI error (non-fatal): ${String((e && e.message) || e)}`);
}
process.exit(0);
