#!/usr/bin/env node
// Round-5 critical fixes — 4 issues found by round-5 scrutiny
import { promises as fs } from "node:fs";
import path from "node:path";
const MS_DIR = "H:/prism/mcp-server/data/milestones";
const NOW = new Date().toISOString();
const TAG = "ppg-round5-fixes-2026-04-29";
const changes = [];

async function load(id) {
  const p = path.join(MS_DIR, `${id}.json`);
  return { p, json: JSON.parse(await fs.readFile(p, "utf8")) };
}
async function save(p, j) { j.last_updated = NOW; await fs.writeFile(p, JSON.stringify(j, null, 2) + "\n"); }
function patched(j) { return Array.isArray(j._patches) && j._patches.includes(TAG); }
function mark(j) { j._patches = [...new Set([...(j._patches || []), TAG])]; }

// ============================================================
// FIX 1 — Break cycles MS12→MS27→MS35/37→MS12
// MS35 and MS37 mistakenly listed MS27 in depends_on (created cycle through MS27→MS35/37→MS12)
// Correct upstream is MS16 (online tuning telemetry — analytics conversion data lives there)
// ============================================================
{
  for (const id of ["PPG-MS35", "PPG-MS37"]) {
    let { p, json } = await load(id);
    if (patched(json)) continue;
    let edited = false;
    if (Array.isArray(json.depends_on)) {
      const before = [...json.depends_on];
      json.depends_on = json.depends_on.filter(d => d !== "PPG-MS27");
      if (!json.depends_on.includes("PPG-MS16")) json.depends_on.push("PPG-MS16");
      if (JSON.stringify(before) !== JSON.stringify(json.depends_on)) edited = true;
    }
    if (edited) {
      mark(json);
      await save(p, json);
      changes.push(`${id}: cycle-break — depends_on retargeted from PPG-MS27 → PPG-MS16 (analytics/telemetry upstream is MS16, not demo/ROI MS27)`);
    }
  }
  // Now MS27 should NOT be blocked by MS35/37; clean MS27.blocks of MS35/37 (they shouldn't be there since MS35/37 don't depend on MS27 anymore)
  let { p, json } = await load("PPG-MS27");
  if (Array.isArray(json.blocks)) {
    const before = [...json.blocks];
    json.blocks = json.blocks.filter(b => b !== "PPG-MS35" && b !== "PPG-MS37");
    if (JSON.stringify(before) !== JSON.stringify(json.blocks)) {
      mark(json);
      await save(p, json);
      changes.push(`PPG-MS27: blocks[] cleaned of MS35/MS37 stale entries (no longer downstream)`);
    }
  }
  // MS16 should reciprocate — add MS35, MS37 to MS16.blocks
  let r = await load("PPG-MS16").catch(() => null);
  if (r) {
    if (!Array.isArray(r.json.blocks)) r.json.blocks = [];
    let added = 0;
    for (const target of ["PPG-MS35", "PPG-MS37"]) {
      if (!r.json.blocks.includes(target)) { r.json.blocks.push(target); added++; }
    }
    if (added > 0) {
      mark(r.json);
      await save(r.p, r.json);
      changes.push(`PPG-MS16: blocks[] += [MS35, MS37] for forward reciprocity`);
    }
  }
}

// ============================================================
// FIX 2 — MS2 line 57 SolidCAM regression
// completion_criteria still has "SolidCAMiMachiningEngine reachable via cam_prism_path_generate"
// Round-4 deepReplace missed this exact phrase variant
// ============================================================
{
  let { p, json } = await load("PPG-MS2");
  if (!patched(json)) {
    let regressionFixed = false;
    if (Array.isArray(json.completion_criteria)) {
      json.completion_criteria = json.completion_criteria.map(c => {
        if (typeof c === "string" && c.includes("SolidCAMiMachiningEngine reachable")) {
          regressionFixed = true;
          return c.replace(
            "SolidCAMiMachiningEngine reachable via",
            "PrismPathConstantEngagementEngine (renamed in MS18/U-PPGM111 from internal SolidCAMiMachiningEngine class) reachable via"
          );
        }
        return c;
      });
    }
    // Also do a defensive sweep for any other raw "SolidCAMiMachiningEngine" not in historical-rename context
    const text = JSON.stringify(json);
    const remainingRawCount = (text.match(/SolidCAMiMachiningEngine(?!\.ts|; renamed| from internal)/g) || []).length;
    if (regressionFixed) {
      mark(json);
      await save(p, json);
      changes.push(`PPG-MS2: line 57 SolidCAM regression fixed in completion_criteria (R5-S08 finding); remaining raw refs: ${remainingRawCount}`);
    }
  }
}

// ============================================================
// FIX 3 — 6 missing forward reciprocals (MS18 blocks MS33/34/36/38 but those don't depend on MS18)
// ============================================================
{
  for (const id of ["PPG-MS33", "PPG-MS34", "PPG-MS36", "PPG-MS38"]) {
    let { p, json } = await load(id);
    if (patched(json)) continue;
    if (!Array.isArray(json.depends_on)) json.depends_on = [];
    if (!json.depends_on.includes("PPG-MS18")) {
      json.depends_on.push("PPG-MS18");
      mark(json);
      await save(p, json);
      changes.push(`${id}: depends_on += [PPG-MS18] for forward reciprocity (MS18 cluster gates already in blocks)`);
    }
  }
}

// ============================================================
// FIX 4 — R5-S02 antitrust whitelist gaps
// ============================================================
{
  let { p, json } = await load("PPG-MS37");
  if (!patched(json)) {
    let edited = false;
    const u221 = json.units.find(u => u.id === "U-PPGM221");
    if (u221 && !u221.scope.includes("dimensional_accuracy")) {
      // Expand the explicit physics whitelist enum
      u221.scope = u221.scope.replace(
        "physics outcomes (wear, cycle, surface, force, recast)",
        "physics outcomes (wear_rate, cycle_time, surface_finish_Ra, cutting_force, recast_depth, dimensional_accuracy_Cpk, chatter_stability_margin)"
      );
      // Strengthen metadata-smuggling test as named separate test file
      if (!u221.tests_to_add.includes("src/__tests__/FederatedMetadataSmugglingRedTeam.test.ts")) {
        u221.tests_to_add.push("src/__tests__/FederatedMetadataSmugglingRedTeam.test.ts");
      }
      edited = true;
    }
    // Strengthen Sherman gate linkage
    if (!json.completion_criteria.some(c => c.includes("Cluster-7 antitrust review on file"))) {
      json.completion_criteria.push("Cluster-7 (Sherman §1) antitrust outside-counsel review (PPG-MS18/U-PPGM109 cluster-7) on file BEFORE U-PPGM221 federation activation; pilot status:active gated on Cluster-7 sign-off");
      edited = true;
    }
    if (edited) {
      mark(json);
      await save(p, json);
      changes.push(`PPG-MS37: antitrust whitelist enum expanded to 7 physics outcomes; +metadata-smuggling red-team test; Cluster-7 hard-gate explicit`);
    }
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log(JSON.stringify({ patched_at: NOW, tag: TAG, changes }, null, 2));
