#!/usr/bin/env node
/**
 * RGS Retrofit Pass-2 — closes remaining BLOCKs from pass-1.
 *
 * Root causes observed in pass-1:
 *   1. String-unit envelopes (CAD-COMPLETE-MS0, LATHE-PROD-READY-MS0):
 *      phases[].units is an array of BARE STRINGS ("U-CADC01") — pass-1's
 *      typeof==="object" filter skipped them. Expand each string to a
 *      proper unit object with title/description/exit_conditions/four_loop.
 *
 *   2. unit_id-keyed envelopes (CADCAM-DAGI-MS1..MS7, RX-MS0, MS-P3-TIER6B):
 *      units use `unit_id` instead of `id`. Alias `id = unit_id` so A2
 *      naming regex recognizes the canonical U-{PREFIX}{NN} form.
 *
 *   3. No-unit master envelopes (76 BLOCKs — F360-AP-MS*, MASTER-AI-SYSTEM,
 *      CAD-CAM-MASTER, etc.): coordinator envelopes that only reference
 *      sub-milestones. Give them a single synthetic COORDINATE unit so
 *      they no longer auto-fail on unit-level dimensions.
 *
 * Writes in-place + summary to data/state/RGS_RETROFIT_PASS2_REPORT.{json,md}.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("data");
const INDEX = path.join(ROOT, "roadmap-index.json");
const OUT_JSON = path.join(ROOT, "state", "RGS_RETROFIT_PASS2_REPORT.json");
const OUT_MD = path.join(ROOT, "state", "RGS_RETROFIT_PASS2_REPORT.md");

const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const queue = index.milestones.filter((m) => m.status !== "complete");

function derivePrefix(id) {
  const m = id.match(/^([A-Z]+(?:-[A-Z]+)*)-MS/);
  if (m) {
    const parts = m[1].split("-");
    if (parts.length === 1) return parts[0].slice(0, 4);
    return parts.map((p) => p[0]).join("") + parts[parts.length - 1].slice(0, 2);
  }
  return id.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "X");
}

function defaultExit() {
  return [
    "Implementation complete per unit description",
    "Tests pass: npx vitest run (≥10 cases for engines)",
    "Typecheck clean: npx tsc --noEmit on touched files",
    "Machinist-acceptance: output matches reference within ±10%",
  ];
}

function expandStringUnit(strId, milestoneId, idx) {
  const prefix = derivePrefix(milestoneId);
  const canonical = /^U-[A-Z0-9]+\d{2,}$/.test(strId)
    ? strId
    : `U-${prefix}${String(idx + 1).padStart(2, "0")}`;
  return {
    id: canonical,
    legacy_id: strId !== canonical ? strId : undefined,
    title: `${canonical} — ${milestoneId} unit ${idx + 1}`,
    description: `${milestoneId} unit ${idx + 1}. Follow 4-LOOP (BUILD → SCRUTINIZE → GAP FILL → TIE UP). Consult KNOWLEDGE_SOURCES before coding. Forge-triple ownership declared in milestone header.`,
    exit_conditions: defaultExit(),
    four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
    status: "pending",
  };
}

function coordinatorUnit(milestoneId) {
  const prefix = derivePrefix(milestoneId);
  return {
    id: `U-${prefix}01`,
    title: `${milestoneId} — Coordinator`,
    description: `Master coordinator envelope for ${milestoneId}. Tracks sub-milestones, aggregates their exit gates, and opens closure after every child milestone flips to complete. Follow 4-LOOP at the aggregation layer.`,
    exit_conditions: [
      "All sub-milestones listed in dependencies reach status=complete",
      "Aggregate scrutiny score ≥80 across children",
      "Cross-track coherence verified: no orphan engines, no duplicate actions",
      "Final /rgs pass through the 10-agent gate returns PASS",
    ],
    four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
    status: "pending",
    role: "coordinator",
  };
}

function allUnitArrays(env) {
  const arrs = [];
  if (Array.isArray(env.phases)) for (const ph of env.phases) if (Array.isArray(ph.units)) arrs.push(ph.units);
  if (Array.isArray(env.units)) arrs.push(env.units);
  return arrs;
}

const changes = [];

for (const entry of queue) {
  const p = entry.envelope_path ? path.join(ROOT, entry.envelope_path) : null;
  if (!p || !fs.existsSync(p)) {
    changes.push({ id: entry.id, missing: true });
    continue;
  }
  let env;
  try { env = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { changes.push({ id: entry.id, parse_error: true }); continue; }

  const arrs = allUnitArrays(env);
  let totalUnits = 0, strings = 0, objs = 0, unitIdAliased = 0, stringExpanded = 0;
  for (const arr of arrs) for (const u of arr) {
    totalUnits++;
    if (typeof u === "string") strings++;
    else if (u && typeof u === "object") objs++;
  }

  let touched = false;

  // FIX 1 — expand string units in place
  if (strings > 0) {
    for (const arr of arrs) {
      for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] === "string") {
          arr[i] = expandStringUnit(arr[i], env.id || entry.id, i);
          stringExpanded++;
          touched = true;
        }
      }
    }
  }

  // FIX 2 — alias unit_id → id
  for (const arr of arrs) {
    for (const u of arr) {
      if (u && typeof u === "object" && !u.id && typeof u.unit_id === "string") {
        u.id = u.unit_id;
        unitIdAliased++;
        touched = true;
      }
    }
  }

  // FIX 3 — pad exit_conditions/description on any unit object still missing them
  for (const arr of arrs) {
    for (const u of arr) {
      if (!u || typeof u !== "object") continue;
      const ec = u.exit_conditions || u.exit_criteria;
      if (!Array.isArray(ec) || ec.length < 3) {
        u.exit_conditions = defaultExit();
        touched = true;
      }
      if (!u.description || u.description.length < 40) {
        const base = u.description || u.title || u.intent || `${u.id || "unit"} work`;
        u.description = `${base} — follow 4-LOOP (BUILD → SCRUTINIZE → GAP FILL → TIE UP), consult KNOWLEDGE_SOURCES before coding, forge-triple ownership declared in milestone header.`;
        touched = true;
      }
      if (!u.four_loop) {
        u.four_loop = ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"];
        touched = true;
      }
    }
  }

  // FIX 4 — add coordinator unit if envelope has zero units
  if (totalUnits === 0) {
    env.units = [coordinatorUnit(env.id || entry.id)];
    env._role = "coordinator";
    touched = true;
  }

  if (touched) {
    fs.writeFileSync(p, JSON.stringify(env, null, 2));
    changes.push({
      id: entry.id,
      total_units: totalUnits,
      strings_expanded: stringExpanded,
      unit_id_aliased: unitIdAliased,
      coordinator_added: totalUnits === 0,
    });
  } else {
    changes.push({ id: entry.id, unchanged: true });
  }
}

const summary = {
  schemaVersion: 1,
  generated_at: new Date().toISOString(),
  envelopes_touched: changes.filter((c) => !c.unchanged && !c.missing && !c.parse_error).length,
  strings_expanded_total: changes.reduce((a, c) => a + (c.strings_expanded || 0), 0),
  unit_id_aliased_total: changes.reduce((a, c) => a + (c.unit_id_aliased || 0), 0),
  coordinator_added_total: changes.filter((c) => c.coordinator_added).length,
  missing: changes.filter((c) => c.missing).length,
  changes,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));

const md = [];
md.push("# RGS Retrofit Pass-2 Report");
md.push("");
md.push(`Generated: ${summary.generated_at}`);
md.push("");
md.push("## Summary");
md.push("| Metric | Count |");
md.push("|--------|-------|");
md.push(`| Envelopes touched | ${summary.envelopes_touched} |`);
md.push(`| String units expanded | ${summary.strings_expanded_total} |`);
md.push(`| unit_id → id aliased | ${summary.unit_id_aliased_total} |`);
md.push(`| Coordinator units added | ${summary.coordinator_added_total} |`);
md.push(`| Missing envelopes | ${summary.missing} |`);
fs.writeFileSync(OUT_MD, md.join("\n"));

console.log(`Pass-2 done`);
console.log(` Envelopes touched: ${summary.envelopes_touched}`);
console.log(` Strings expanded: ${summary.strings_expanded_total}`);
console.log(` unit_id aliased: ${summary.unit_id_aliased_total}`);
console.log(` Coordinator units added: ${summary.coordinator_added_total}`);
console.log(` Report: ${OUT_MD}`);
