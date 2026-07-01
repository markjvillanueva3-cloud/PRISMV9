#!/usr/bin/env node
// Amendment A7: Backfill tests_required + coverage_target on MS0 and MS4 units.
// Source of truth: CADCAM-DEEPAGI-SCRUTINY-AMENDMENTS.json A7.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd(), "mcp-server/data/milestones");
const FILES = ["CADCAM-DAGI-MS0.json", "CADCAM-DAGI-MS4.json"];

// Extract "N" from strings like "25+ unit tests passing ..." when present.
function extractTestCount(criteria) {
  if (!Array.isArray(criteria)) return null;
  for (const line of criteria) {
    const m = /\b(\d{1,3})\s*\+?\s*(?:unit\s+)?tests?\b/i.exec(line);
    if (m) return Number(m[1]);
  }
  return null;
}

// Per-unit sensible default when no hint is present.
function defaultTestCount(unitId) {
  if (/^U-DAGI(0[12]|03|04)$/.test(unitId)) return 25; // foundation units
  if (/^U-DAGI(07|13|14)$/.test(unitId)) return 30;    // integration/orchestrators
  if (/^U-CAMAGI0?2$/.test(unitId)) return 30;         // RL policy
  if (/^U-CAMAGI16$/.test(unitId)) return 25;          // dispatcher wiring
  return 20;
}

function defaultCoverage(unitId) {
  if (/14$/.test(unitId) || /16$/.test(unitId)) return "95%"; // wiring units
  if (/^U-CAMAGI09$/.test(unitId)) return "97%"; // safety-critical
  return "92%";
}

let totalPatched = 0;
for (const rel of FILES) {
  const path = resolve(ROOT, rel);
  const data = JSON.parse(readFileSync(path, "utf8"));
  const units = Array.isArray(data.units) ? data.units : [];
  let patched = 0;
  for (const unit of units) {
    const id = unit.id || unit.unit_id;
    if (!id) continue;
    unit.exit_gate = unit.exit_gate || {};
    const gate = unit.exit_gate;
    if (gate.tests_required == null) {
      gate.tests_required =
        extractTestCount(gate.measurable_criteria) ?? defaultTestCount(id);
      patched++;
    }
    if (gate.coverage_target == null) {
      gate.coverage_target = defaultCoverage(id);
      patched++;
    }
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  console.log(`${rel}: patched ${patched} fields`);
  totalPatched += patched;
}
console.log(`TOTAL fields added: ${totalPatched}`);
