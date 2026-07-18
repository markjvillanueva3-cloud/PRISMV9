#!/usr/bin/env node
// haas-post-proof.ts — prove HaasNGCMillMasterPostEngine meets the SAME conformance bar the
// post-training harness applies (post-nc-dialect-lint --dialect haas == 0 ERRORs + structural-100%),
// directly against the engine (no :3100 round-trip — non-disruptive to the shared MCP daemon).
// slot:echo, U-PT-HAAS-ENGINE. Run: npx tsx scripts/haas-post-proof.ts
import { haasNGCMillMasterPostEngine } from "../mcp-server/src/engines/HaasNGCMillMasterPostEngine.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = JSON.parse(readFileSync(join(REPO, "state/shared/post-training/post-training-corpus.json"), "utf8"));
const dir = join(REPO, "state/shared/post-training/nc-haas-proof");
mkdirSync(dir, { recursive: true });

function jsonOut(stdout: string): any { try { return JSON.parse(stdout.trim()); } catch { const i = stdout.indexOf("{"); return i >= 0 ? JSON.parse(stdout.slice(i)) : null; } }

let allClean = true;
for (const job of corpus.jobs) {
  const cfg = job.config || {};
  const out = haasNGCMillMasterPostEngine.generateProgram(job.operations, { units: cfg.units, work_offset: cfg.work_offset, program_number: cfg.program_number });
  if (!out.success) { console.log(`✗ ${job.id}: engine error — ${out.error}`); allClean = false; continue; }
  const f = join(dir, `haas-${job.id}.nc`);
  writeFileSync(f, out.gcode.join("\n"), "utf8");

  const lintR = spawnSync(process.execPath, [join(REPO, "scripts/post-nc-dialect-lint.mjs"), f, "--dialect", "haas", "--json"], { encoding: "utf8" });
  const lintJ = jsonOut(lintR.stdout || "");
  const res = lintJ && Array.isArray(lintJ.results) ? lintJ.results[0] : lintJ;
  const errors = res?.counts?.ERROR ?? 0;
  const warns = res?.counts?.WARN ?? 0;

  const confR = spawnSync(process.execPath, [join(REPO, "scripts/post-nc-conformance.mjs"), f, "--structural", "--json"], { encoding: "utf8" });
  const confJ = jsonOut(confR.stdout || "");
  const passed = confJ?.passed ?? 0, total = confJ?.total ?? 0;
  const structPct = total ? Math.round((passed / total) * 100) : 0;
  const failedChecks = (confJ?.checks || []).filter((c: any) => !c.pass).map((c: any) => c.name);

  const ok = errors === 0 && structPct === 100;
  allClean = allClean && ok;
  console.log(`${ok ? "✓ PERFECT" : "✗"} ${job.id}: dialect ${errors}E/${warns}W · structural ${passed}/${total} (${structPct}%)${failedChecks.length ? " · FAIL[" + failedChecks.join(",") + "]" : ""}`);
}
console.log(`\nHAAS FULL POST: ${allClean ? "ALL JOBS PERFECT (0 dialect ERRORs + structural-100%) — meets the proven bar" : "DEVIATIONS REMAIN"}`);
process.exit(allClean ? 0 : 3);
