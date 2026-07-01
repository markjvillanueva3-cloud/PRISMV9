// scripts/lib/cam-approach-knowledge.mjs
//
// CAM auto-firing "approach knowledge" -- slot:zulu 2026-06-29 (for kilo).
//
// The fifth clone of the proven task x machine x tooling auto-firing pattern
// (lathe / mill / post-processor / wedm siblings). When the CAM wizard reads a part
// and decides HOW to approach the toolpath, this surfaces the SPECIFIC verified
// gate(s) for the operation(s)/strategy named -- conditioned on which CAM SYSTEM is
// in use (the vendor-safety axis).
//
// SOURCING (R12 -- no fabrication): gates were mined by a hermes Explore agent from
// the real CAM engine code + dispatcher + soul, and the load-bearing citations were
// then spot-verified by hand (slot:zulu): BatchCAMSafetyEngines.ts carries the NX /
// PowerMill / CATIA safety-hook engines (10 rules each; tool_axis_gouge:238,
// block_clearance:104); AdaptiveToolpathRouterEngine.ts ROUTING_RULES:108 references
// TGAR:47 / HRAF:48 / PTDC:51 / VCER:54 / PARETO:56; CollisionDetectionEngine +
// camDispatcher + the cam SOUL.md refuse list carry the always-on gates. Each gate
// NAMES its rule + the enforcing engine + cite -- it NEVER inlines a numeric
// threshold (scallop trigger, singularity angle, clearance mm live in the engines /
// constants; restating them would violate constants discipline AND the agent flagged
// several as not-yet-quantified -> see CAM_UNVERIFIED_GAPS).
//
// Karpathy 5-step: CLASSIFY pure data+select lib; TECHNIQUE frozen maps + set
// membership; EDGE null/empty/non-array ctx; FAILURE never throws; WRITE from line 1.

// ---- operation taxonomy (the CAM operations/strategies the wizard encounters) ----
export const CAM_OPERATIONS = Object.freeze([
  "toolpath_export",  // any NC/post output (always-on collision + safety + refuse)
  "adaptive_rough",   // adaptive/HSM roughing
  "rest_machining",   // rest/leftover machining (IPW-aware)
  "finish_3d",        // 3D surface finishing
  "contour_2d",       // 2D/2.5D profile/contour
  "drill_cycle",      // drilling / hole-making
  "multi_axis",       // 5-axis / 3+2 / simultaneous
]);

// ---- CAM-system fleet (conditioning axis = which CAM system's vendor gates apply) ----
// Tier-1 bridges (Fusion/hyperMILL/Mastercam/Esprit) + the batch-safety vendors (NX/PowerMill/CATIA).
export const CAM_SYSTEMS = Object.freeze([
  Object.freeze({ id: "nx",        aliases: ["nx cam", "siemens nx", " nx ", "nxcam", "unigraphics"] }),
  Object.freeze({ id: "powermill", aliases: ["powermill", "power mill", "autodesk powermill", "delcam"] }),
  Object.freeze({ id: "catia",     aliases: ["catia", "v5", "v6", "dassault"] }),
  Object.freeze({ id: "fusion",    aliases: ["fusion", "fusion 360", "f360"] }),
  Object.freeze({ id: "hypermill", aliases: ["hypermill", "hyper mill", "open mind", "openmind"] }),
  Object.freeze({ id: "mastercam", aliases: ["mastercam", "master cam", "mcam"] }),
  Object.freeze({ id: "esprit",    aliases: ["esprit", "dp technology"] }),
]);

const SYSTEM_IDS = Object.freeze(CAM_SYSTEMS.map((c) => c.id));

// ---- the verified gate map (each gate cites its mined+spot-verified source) ----
// camSystemCap : fires only when that CAM system is in the resolved set.
// neither      : fires for its ops regardless of CAM system.
const GATES = Object.freeze({
  // ---- always-on toolpath-export gates (CollisionDetectionEngine / camDispatcher / SOUL) ----
  collision_check_full: {
    id: "collision_check_full",
    rule: "Run collision_check_full before any toolpath commit -- it returns a CollisionResult struct (has_collision boolean + minimum_clearance_mm number), not a bare boolean (MANDATORY)",
    enforcedBy: "CollisionDetectionEngine.checkFull -> camDispatcher:collision_check_full",
    cite: "CollisionDetectionEngine.ts:100 (checkFull) + cam/CLAUDE.md:109",
    ops: ["toolpath_export", "multi_axis", "finish_3d", "adaptive_rough"],
    confidence: "verified",
  },
  cam_safety_validate: {
    id: "cam_safety_validate",
    rule: "Run the cam_safety_validate Omega/S(x) shop-floor gate before any toolpath commit",
    enforcedBy: "camDispatcher:cam_safety_validate",
    cite: "cam/CLAUDE.md:57 + cam/SOUL.md:33",
    ops: ["toolpath_export", "adaptive_rough", "rest_machining", "finish_3d", "contour_2d", "drill_cycle", "multi_axis"],
    confidence: "verified",
  },
  refuse_emit_without_collision: {
    id: "refuse_emit_without_collision",
    rule: "REFUSE to emit any toolpath without collision_check_full passing (cam SOUL.md refuse declared; Stop-hook wiring UNVERIFIED per cam/CLAUDE.md:238 -- confirm wired before relying)",
    enforcedBy: "cam/SOUL.md refuse + Stop hook",
    cite: "cam/SOUL.md:33 + cam/CLAUDE.md:238",
    ops: ["toolpath_export"],
    confidence: "verified",
  },
  units_first: {
    id: "units_first",
    rule: "Resolve inch vs mm from the SOURCE (NC G20/G21, STEP unit, CAM setup) before any toolpath -- a units mismatch is a 25.4x scale error (Fusion API unit is cm: the 2.54 trap)",
    enforcedBy: "scripts/lib/units-guard.mjs (requireUnits/assertUnitsMatch/scaleAnomaly)",
    cite: "CLAUDE.md SAFETY RAILS (UNITS FIRST)",
    ops: ["toolpath_export", "adaptive_rough", "finish_3d", "contour_2d", "drill_cycle", "multi_axis"],
    confidence: "verified",
  },

  // ---- strategy/material (must precede strategy selection) ----
  cam_material_map: {
    id: "cam_material_map",
    rule: "ISO-group material mapping MUST precede every strategy_recommend call (kc1.1 / Taylor pulled from physics/constants.ts, never inline)",
    enforcedBy: "camDispatcher:cam_material_map + CAMKernelEngine",
    cite: "cam/CLAUDE.md:113",
    ops: ["adaptive_rough", "rest_machining", "finish_3d", "contour_2d", "multi_axis"],
    confidence: "verified",
  },

  // ---- roughing strategy gates (AdaptiveToolpathRouterEngine ROUTING_RULES) ----
  thermal_gradient_rough: {
    id: "thermal_gradient_rough",
    rule: "Roughing a heat-sensitive material (ISO S/H/M, thermal concern) -> route to TGAR (Thermal-Gradient Adaptive Roughing), not a generic adaptive",
    enforcedBy: "AdaptiveToolpathRouterEngine.ROUTING_RULES (TGAR)",
    cite: "AdaptiveToolpathRouterEngine.ts:47,111",
    ops: ["adaptive_rough"],
    confidence: "verified",
  },
  chip_evacuation_rough: {
    id: "chip_evacuation_rough",
    rule: "Deep-pocket / blind-slot roughing with a chip-evacuation concern -> route to VCER (Vortex Chip Evacuation Roughing)",
    enforcedBy: "AdaptiveToolpathRouterEngine.ROUTING_RULES (VCER)",
    cite: "AdaptiveToolpathRouterEngine.ts:54",
    ops: ["adaptive_rough"],
    confidence: "verified",
  },

  // ---- finishing strategy gates ----
  vibration_avoidant_finish: {
    id: "vibration_avoidant_finish",
    rule: "Finishing a thin wall / vibration-prone feature -> route to HRAF (Harmonic-Resonance Avoidant Finishing)",
    enforcedBy: "AdaptiveToolpathRouterEngine.ROUTING_RULES (HRAF)",
    cite: "AdaptiveToolpathRouterEngine.ts:48,125",
    ops: ["finish_3d"],
    confidence: "verified",
  },
  deflection_comp_finish: {
    id: "deflection_comp_finish",
    rule: "Finishing a deep cavity / long-reach (high tool L/D) -> route to PTDC (Predictive Tool Deflection Compensation)",
    enforcedBy: "AdaptiveToolpathRouterEngine.ROUTING_RULES (PTDC)",
    cite: "AdaptiveToolpathRouterEngine.ts:51,127",
    ops: ["finish_3d"],
    confidence: "verified",
  },
  tolerance_pareto_finish: {
    id: "tolerance_pareto_finish",
    rule: "Tight-tolerance finishing -> route to PARETO (Pareto multi-objective path) for the quality-speed trade-off",
    enforcedBy: "AdaptiveToolpathRouterEngine.ROUTING_RULES (PARETO)",
    cite: "AdaptiveToolpathRouterEngine.ts:56,133",
    ops: ["finish_3d"],
    confidence: "verified",
  },

  // ---- multi-axis ----
  multiaxis_defer_recommend: {
    id: "multiaxis_defer_recommend",
    rule: "NEVER hand-compute tilt/lean angles for simultaneous 5-axis -- defer to cam_multiaxis_recommend (singularity detection required before simultaneous motion)",
    enforcedBy: "camDispatcher:cam_multiaxis_recommend + CAMKernelEngine",
    cite: "cam/CLAUDE.md:115-116",
    ops: ["multi_axis"],
    confidence: "verified",
  },

  // ---- CAM-system vendor safety hooks (BatchCAMSafetyEngines.ts, camSystem-conditioned) ----
  nx_tool_axis_gouge: {
    id: "nx_tool_axis_gouge",
    rule: "NX CAM: tool axis must not drive the tool into the part surface or undercut geometry; the gouge check must run + IPW must be regenerated/current before each op",
    enforcedBy: "NXCAMSafetyHooksEngine",
    cite: "BatchCAMSafetyEngines.ts:238 (tool_axis_gouge) + :226 (IPW)",
    ops: ["toolpath_export", "multi_axis", "finish_3d"],
    camSystemCap: "nx",
    confidence: "verified",
  },
  nx_fbm_validate: {
    id: "nx_fbm_validate",
    rule: "NX CAM: Feature-Based Machining auto-mapped strategies MUST be manually validated before NC output",
    enforcedBy: "NXCAMSafetyHooksEngine",
    cite: "BatchCAMSafetyEngines.ts:254",
    ops: ["toolpath_export"],
    camSystemCap: "nx",
    confidence: "verified",
  },
  powermill_collision_gouge: {
    id: "powermill_collision_gouge",
    rule: "PowerMill: explicit collision detection (critical) + automatic gouge protection MUST stay active (disabling it removes the safeguard)",
    enforcedBy: "PowerMillSafetyHooksEngine",
    cite: "BatchCAMSafetyEngines.ts:461 (collision) + :485 (gouge protection)",
    ops: ["toolpath_export", "adaptive_rough", "finish_3d"],
    camSystemCap: "powermill",
    confidence: "verified",
  },
  powermill_block_clearance_5ax: {
    id: "powermill_block_clearance_5ax",
    rule: "PowerMill 5-axis: tool assembly + holder + block clearance checked at ALL tilt positions (critical)",
    enforcedBy: "PowerMillSafetyHooksEngine",
    cite: "BatchCAMSafetyEngines.ts:517",
    ops: ["multi_axis"],
    camSystemCap: "powermill",
    confidence: "verified",
  },
  catia_part_op_validate: {
    id: "catia_part_op_validate",
    rule: "CATIA V5/V6: part operations validated (status MUST be true) before NC output; tool compensation offsets validated against the actual measured tool",
    enforcedBy: "CATIASafetyHooksEngine",
    cite: "BatchCAMSafetyEngines.ts:761 (part op) + :836 (offset safety)",
    ops: ["toolpath_export"],
    camSystemCap: "catia",
    confidence: "verified",
  },
});

// gates the mining agent could NOT bind to a quantified rule -> NOT fired.
// Surfaced for the kilo specialist to author (R12: never present these as verified).
export const CAM_UNVERIFIED_GAPS = Object.freeze([
  "rest_machining scallop/cusp-height TRIGGER threshold (formulas exist in RestMachiningEngine.ts:19-20; the MIN scallop-mm that triggers rest is not in code)",
  "5-axis singularity ANGLE threshold (cam/CLAUDE.md:115 says defer to cam_multiaxis_recommend; the numeric tilt/lean limit was not located)",
  "cross-vendor holder-clearance minimum (mm) after Mastercam->hyperMILL transfer (CLAUDE.md:124 says re-validate; no quantified gate)",
  "Fusion 360 rest-machining explicit stock-source rule (CLAUDE.md:131 references knowledge/wiki/cam/cam-foundations.md; rule not read)",
  "hyperMILL blade-roughing tilt-angle optimization (CLAUDE.md:118-120 defers to cam_hypermill_strategy_kb_for_geometry; no numeric gate)",
]);

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of CAM_OPERATIONS) m[op] = [];
  for (const g of Object.values(GATES)) {
    for (const op of g.ops) if (m[op]) m[op].push(g.id);
  }
  return Object.freeze(m);
})();

// ---- helpers ----
function isStr(s) { return typeof s === "string" && s.length > 0; }

// Resolve CAM-system ids from a free-form CAM-system list.
export function resolveCaps(camSystems) {
  const caps = new Set();
  if (!Array.isArray(camSystems)) return caps;
  for (const raw of camSystems) {
    if (!isStr(raw)) continue;
    const s = " " + raw.toLowerCase() + " ";
    for (const c of CAM_SYSTEMS) {
      if (c.aliases.some((a) => s.includes(a))) caps.add(c.id);
    }
  }
  return caps;
}

function gateAllowed(gate, caps) {
  if (gate.camSystemCap && !caps.has(gate.camSystemCap)) return false;
  return true;
}

// ---- the firing entry point ----
// ctx: { operations: string[], camSystems?: string[] }
// Returns { operations:[{operation, gates:[...]}], camSystems:[...], summary }.
// Defensive: never throws on null/non-object/garbage ctx (lathe-sibling lesson).
export function fireForApproach(ctx) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const rawOps = Array.isArray(c.operations) ? c.operations : [];
  const caps = resolveCaps(c.camSystems);
  const camSystems = SYSTEM_IDS.filter((id) => caps.has(id));

  const ops = [];
  for (const op of rawOps) {
    if (!isStr(op) || !OPS_TO_GATES[op]) continue;
    const gates = OPS_TO_GATES[op]
      .map((id) => GATES[id])
      .filter((g) => gateAllowed(g, caps))
      .map((g) => ({ id: g.id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite }));
    ops.push({ operation: op, gates });
  }

  let summary = `${ops.length} CAM operation(s); systems: ${camSystems.join("/") || "unspecified"}`;
  if (rawOps.length && c.camSystems && !camSystems.length) {
    summary += " -- NOTE: no CAM system resolved; the vendor safety hooks (NX/PowerMill/CATIA) only fire once the CAM system is named";
  }
  return { operations: ops, camSystems, caps: [...caps], summary };
}

// ---- detect CAM operations from a print/CAM-planning prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  if (/tool[\s-]?path|post|nc[\s-]?(?:output|program)|export|emit|generate.*(?:program|g[\s-]?code)/.test(t)) found.add("toolpath_export");
  if (/adaptive|rough(?:ing)?|\bhsm\b|pocket(?:ing)?|stock[\s-]?removal/.test(t)) found.add("adaptive_rough");
  if (/rest[\s-]?machin|rest[\s-]?rough|re-?machin|leftover|ipw/.test(t)) found.add("rest_machining");
  if (/finish(?:ing)?|scallop|surface[\s-]?finish|3d[\s-]?finish|contour[\s-]?finish/.test(t)) found.add("finish_3d");
  if (/\bcontour\b|2[\s.]?5?d|profile[\s-]?(?:mill|machin)/.test(t)) found.add("contour_2d");
  if (/\bdrill\b|hole[\s-]?mak|\bpeck\b|\bbore\b|tap[\s-]?cycle/.test(t)) found.add("drill_cycle");
  if (/5[\s-]?axis|multi[\s-]?axis|simultaneous|3\s?\+\s?2|\btilt\b|swarf/.test(t)) found.add("multi_axis");
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES, SYSTEM_IDS };
