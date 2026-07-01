#!/usr/bin/env node
// tier: T3
/**
 * stop-cross-pc-handoff-verify.mjs -- Stop hook (advisory): lightweight cross-PC handoff
 * portability guard (U-CROSS-PC-VERIFY-WIRE, slot:bravo 2026-06-14). Wires the previously
 * UNWIRED scripts/cross-pc-handoff-verify.mjs audit into Stop -- but SCOPED to the newest
 * handoffs (cheap per-Stop) rather than the full-repo scan (too heavy for every Stop). Reuses
 * the script's exported PURE helpers (no audit-logic duplication, R8). Guards the operator's
 * "H: is the master drive -- must work after swapping the SSD into another machine" invariant:
 * a handoff that hardcodes a C: path would break session resume on a different machine.
 * Advisory only (result: warn|pass) + fail-soft (never throws -> degrades to pass).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyPath, extractPathRefs, severityFor, aggregateFindings } from "../../scripts/cross-pc-handoff-verify.mjs";

const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";
const SCAN_NEWEST = Number(process.env.PRISM_CROSS_PC_VERIFY_NEWEST) || 5;

/**
 * PURE: scan handoff {name, text} records -> aggregated cross-PC findings.
 * Only C: (critical) and $USERPROFILE (warning) refs are noteworthy; H:/relative/other are
 * portable and skipped. Reuses the canonical helpers so severity stays consistent with the CLI.
 * @returns {{critical:object[], warning:object[], info:object[]}}
 */
export function scanHandoffs(records) {
  const findings = [];
  for (const r of records ?? []) {
    if (!r || typeof r.text !== "string") continue;
    for (const p of extractPathRefs(r.text)) {
      const kind = classifyPath(p);
      if (kind !== "c" && kind !== "userprofile") continue; // h / relative / other are portable
      findings.push({ file: r.name, path: p, kind, severity: severityFor({ kind, fileType: "handoff-md" }) });
    }
  }
  return aggregateFindings(findings);
}

/** Read the newest N HANDOFF-*.md from a dir. Fail-soft -> []. */
export function newestHandoffs(dir, n) {
  let entries;
  try { entries = fs.readdirSync(dir).filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md")); }
  catch { return []; }
  const withMtime = [];
  for (const f of entries) {
    try { withMtime.push({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }); } catch { /* skip */ }
  }
  withMtime.sort((a, b) => b.mtime - a.mtime);
  const out = [];
  for (const { name } of withMtime.slice(0, Math.max(1, n))) {
    try { out.push({ name, text: fs.readFileSync(path.join(dir, name), "utf-8") }); } catch { /* skip */ }
  }
  return out;
}

async function main() {
  await new Promise((r) => { let d = ""; process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", () => r(d)); });
  try {
    const agg = scanHandoffs(newestHandoffs(HANDOFFS_DIR, SCAN_NEWEST));
    if (agg.critical.length > 0) {
      const sample = agg.critical.slice(0, 2).map((f) => `${f.file}: ${f.path}`).join("; ");
      console.log(JSON.stringify({
        result: "warn",
        message: `${agg.critical.length} cross-PC handoff portability risk(s) -- a C: path in a recent handoff breaks resume after an SSD swap (H: is master): ${sample}`,
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main().catch(() => console.log(JSON.stringify({ result: "pass" })));
