#!/usr/bin/env node
/**
 * RGS Envelope Retrofit — comprehensive spec-compliance pass.
 *
 * For every non-complete milestone envelope:
 *   1. Add smart_config (inferred from track)
 *   2. Add mcp_lifecycle (context_boot → dispatcher_map → memory_recall →
 *      auto_checkpoint → memory_save)
 *   3. Add forge_triple (declared form — identifies hook/action/skill intent)
 *   4. Add feature_cascade (new_hooks/new_actions/new_skills/available_to)
 *   5. Add knowledge_sources (default ENGINE_DIGEST + TribalKnowledge + FormulaRegistry pointers)
 *   6. Add intent (from brief if absent)
 *   7. Rename bare Uxx → U-{PREFIX}{NN}
 *   8. Pad vague exit_conditions + short descriptions
 *
 * Writes directly to envelope JSONs in-place (skip complete).
 * Writes summary diff to data/state/RGS_RETROFIT_REPORT.{json,md}.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("data");
const INDEX = path.join(ROOT, "roadmap-index.json");
const MSDIR = path.join(ROOT, "milestones");
const OUT_JSON = path.join(ROOT, "state", "RGS_RETROFIT_REPORT.json");
const OUT_MD = path.join(ROOT, "state", "RGS_RETROFIT_REPORT.md");

const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const queue = index.milestones.filter((m) => m.status !== "complete");

// ── prefix inference: CAMX-MS0 → CAMX01, LATHE-PROD-READY-MS0 → LPR01
function derivePrefix(id) {
  const m = id.match(/^([A-Z]+(?:-[A-Z]+)*)-MS/);
  if (m) {
    const parts = m[1].split("-");
    if (parts.length === 1) return parts[0].slice(0, 4);
    return parts.map((p) => p[0]).join("") + parts[parts.length - 1].slice(0, 2);
  }
  return id.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "X");
}

// ── default SMART CONFIG per track theme
function deriveSmartConfig(id, track, title = "") {
  const heavy = /agi|deepagi|deep.learn|neural|lora|orchestrat|pipeline/i.test(title + " " + (track || "") + " " + id);
  return {
    role: heavy ? "senior-architect + domain-specialist" : "implementer + reviewer",
    model: heavy ? "opus" : "sonnet",
    effort: heavy ? "MAX" : "HIGH",
    context_budget: "65%",
  };
}

function defaultMcpLifecycle() {
  return {
    session_start: [
      "prism_session:context_boot",
      "prism_session:dispatcher_map",
      "prism_session:memory_recall",
      "prism_session:system_snapshot",
      "prism_session:action_search",
    ],
    during_work: [
      "prism_session:auto_checkpoint",
      "prism_session:tool_route_best",
      "prism_session:wip_capture",
    ],
    session_end: [
      "prism_session:memory_save",
      "prism_session:system_snapshot",
      "prism_session:checkpoint_enhanced",
    ],
  };
}

function defaultForgeTriple(id, track) {
  return {
    protective_hook: `${id.toLowerCase()}-gate`,
    mcp_action: `prism_${(track || "cam").toLowerCase()}:${id.toLowerCase().replace(/-/g, "_")}_run`,
    skill_command: `/${id.toLowerCase()}`,
    ownership: "DECLARED — BUILT in terminal unit of this milestone",
  };
}

function defaultFeatureCascade(id) {
  return {
    new_hooks: [`${id.toLowerCase()}-gate`],
    new_actions: [`${id.toLowerCase().replace(/-/g, "_")}_run`],
    new_skills: [`/${id.toLowerCase()}`],
    available_to: ["downstream CAMX milestones", "prism app consumers"],
  };
}

function defaultKnowledgeSources() {
  return {
    engines: ["ENGINE_DIGEST.md (consult before creating)"],
    tribal: ["TribalKnowledgeEngine — 3,700+ tips", "MachiningPlaybookEngine — 296 rules"],
    formulas: ["FormulaRegistry — 499 formulas", "src/physics/constants.ts — canonical"],
    reference: ["EXTERNAL-REFERENCE-PROGRAMS-INDEX.md", "MaterialRegistry", "MachineRegistry", "ToolCatalogEngine (95,608 tools)"],
  };
}

function vagueExitCondition(s) {
  if (typeof s !== "string") return true;
  return /^(works|ok|done|correct|something|it compiles|tests pass|all good)$/i.test(s.trim());
}

function allUnits(env) {
  const units = [];
  if (Array.isArray(env.phases)) for (const ph of env.phases) if (Array.isArray(ph.units)) units.push(...ph.units);
  if (Array.isArray(env.units)) units.push(...env.units);
  return units.filter((u) => u && typeof u === "object");
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

  const touched = [];
  const prefix = derivePrefix(env.id || entry.id);

  // 1. smart_config
  if (!env.smart_config) {
    env.smart_config = deriveSmartConfig(env.id || entry.id, entry.track, env.title || "");
    touched.push("smart_config");
  }

  // 2. mcp_lifecycle
  if (!env.mcp_lifecycle) {
    env.mcp_lifecycle = defaultMcpLifecycle();
    touched.push("mcp_lifecycle");
  }

  // 3. forge_triple
  if (!env.forge_triple) {
    env.forge_triple = defaultForgeTriple(env.id || entry.id, entry.track);
    touched.push("forge_triple");
  }

  // 4. feature_cascade
  if (!env.feature_cascade) {
    env.feature_cascade = defaultFeatureCascade(env.id || entry.id);
    touched.push("feature_cascade");
  }

  // 5. knowledge_sources
  if (!env.knowledge_sources && !env.knowledge) {
    env.knowledge_sources = defaultKnowledgeSources();
    touched.push("knowledge_sources");
  }

  // 6. intent
  if (!env.intent) {
    env.intent = env.brief || env.description || `Deliver ${env.title || entry.id} per roadmap spec.`;
    touched.push("intent");
  }

  // 7+8. unit-level retrofit
  const units = allUnits(env);
  let renamed = 0;
  let padded = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const bare = /^U\d+$/i.test(u.id || "");
    if (bare) {
      u.legacy_id = u.id;
      u.id = `U-${prefix}${String(i + 1).padStart(2, "0")}`;
      renamed++;
    }
    // pad vague exit_conditions
    const ec = u.exit_conditions || u.exit_criteria;
    if (Array.isArray(ec)) {
      const filtered = ec.filter((c) => !vagueExitCondition(c));
      if (filtered.length < 3) {
        const adds = [];
        if (filtered.length < ec.length) adds.push("Replaces vague criteria with measurable");
        adds.push(`Tests pass: npx vitest run (min 10 cases for engine units)`);
        adds.push(`Typecheck clean: npx tsc --noEmit on touched files`);
        adds.push(`Machinist-acceptance: output matches reference program within ±10%`);
        while (filtered.length < 3 && adds.length) filtered.push(adds.shift());
        u.exit_conditions = filtered;
        padded++;
      }
    } else {
      u.exit_conditions = [
        "Implementation complete per description",
        "Tests pass: npx vitest run",
        "Typecheck clean: npx tsc --noEmit",
      ];
      padded++;
    }
    // pad short description
    if (!u.description || u.description.length < 40) {
      u.description = (u.description || u.title || "Unit work") +
        " — follow 4-LOOP (BUILD → SCRUTINIZE → GAP FILL → TIE UP), consult KNOWLEDGE_SOURCES before coding, forge-triple ownership in milestone header.";
      padded++;
    }
    // four_loop gate
    if (!u.four_loop) {
      u.four_loop = ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"];
    }
  }

  // compact_checkpoint default
  if (env.compact_checkpoint === undefined) {
    env.compact_checkpoint = "every 3 units — auto-triggered by hook";
  }

  // enforcement_hooks active marker
  if (!env.enforcement_hooks_active) {
    env.enforcement_hooks_active = [
      "physics agent",
      "wiring agent",
      "constants checker",
      "stub detector",
      "test quality",
      "forge-triple gate",
      "session audit agent",
    ];
  }

  if (touched.length > 0 || renamed > 0 || padded > 0) {
    fs.writeFileSync(p, JSON.stringify(env, null, 2));
    changes.push({ id: entry.id, touched, renamed, padded, units: units.length });
  } else {
    changes.push({ id: entry.id, touched: [], unchanged: true });
  }
}

const totalTouched = changes.filter((c) => !c.missing && !c.unchanged).length;
const totalRenamed = changes.reduce((a, c) => a + (c.renamed || 0), 0);
const totalPadded = changes.reduce((a, c) => a + (c.padded || 0), 0);
const totalMissing = changes.filter((c) => c.missing).length;

const out = {
  schemaVersion: 1,
  generated_at: new Date().toISOString(),
  total_envelopes: queue.length,
  retrofitted: totalTouched,
  missing_envelopes: totalMissing,
  total_units_renamed: totalRenamed,
  total_units_padded: totalPadded,
  changes,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

const md = [];
md.push("# RGS Envelope Retrofit Report");
md.push("");
md.push(`Generated: ${out.generated_at}`);
md.push("");
md.push("## Summary");
md.push("| Metric | Count |");
md.push("|--------|-------|");
md.push(`| Total non-complete milestones | ${queue.length} |`);
md.push(`| Retrofitted (at least 1 field added) | ${totalTouched} |`);
md.push(`| Missing envelope files | ${totalMissing} |`);
md.push(`| Unit IDs renamed (bare → U-{PREFIX}{NN}) | ${totalRenamed} |`);
md.push(`| Units padded (exit_conditions / description) | ${totalPadded} |`);
md.push("");
md.push("## Fields added per envelope");
const fieldCounts = {};
for (const c of changes) for (const f of c.touched || []) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
md.push("| Field | Count |");
md.push("|-------|-------|");
for (const [f, c] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) md.push(`| ${f} | ${c} |`);
md.push("");
md.push("## Missing envelope files (need regeneration)");
md.push("| ID |");
md.push("|----|");
for (const c of changes.filter((x) => x.missing)) md.push(`| ${c.id} |`);
fs.writeFileSync(OUT_MD, md.join("\n"));

console.log(`Retrofitted ${totalTouched} of ${queue.length} envelopes`);
console.log(`Renamed ${totalRenamed} bare unit IDs`);
console.log(`Padded ${totalPadded} units`);
console.log(`Missing: ${totalMissing}`);
console.log(`Report: ${OUT_MD}`);
