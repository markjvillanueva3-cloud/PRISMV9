// scripts/lib/wedm-approach-knowledge.mjs
//
// WIRE-EDM (WEDM) auto-firing "approach knowledge" -- slot:zulu 2026-06-29 (for mike).
//
// The fourth clone of the proven task x machine x tooling auto-firing pattern
// (lathe / mill / post-processor siblings in scripts/lib/*-approach-knowledge.mjs).
// When the Wire Wizard reads a print and decides HOW to approach a WEDM job, this
// surfaces the SPECIFIC verified safety/quality gate(s) for the cut operation(s)
// named -- conditioned on the available WEDM controller(s) and machine capability.
//
// SOURCING (R12 -- no fabrication): gates were mined by a hermes Explore agent from
// the real WEDM engine code + constants + tribal tips, and the load-bearing
// citations were then spot-verified by hand (slot:zulu): WEDMProgramSafetyGateEngine.ts
// lines 11-17 carry exactly these 7 S(x) component gates (collision 0.20 + unit_tag
// 0.10 MANDATORY); wedm-constants.ts exports WEDM_TAPER_SPEC:170 / WEDM_FLUSH_ADEQUACY:496
// / WEDM_RECAST_MODEL:655 / WEDM_HEAD_CLEARANCE:784; wedm-knowledge-tips.ts carries
// wedm-kb-001.. at the cited lines. Each gate NAMES its rule + the enforcing engine
// + the canonical constant source -- it NEVER inlines the numeric thresholds (flush
// m/s bands, clearance mm, recast um, tension gf live in wedm-constants.ts /
// WEDMSafetyEnvelopeEngine.ts; restating them here would violate constants discipline
// AND risk drift).
//
// Karpathy 5-step: CLASSIFY pure data+select lib; TECHNIQUE frozen maps + set
// membership; EDGE null/empty/non-array ctx; FAILURE never throws; WRITE from line 1.

// ---- operation taxonomy (the cut operations the Wire Wizard encounters) ----
export const WEDM_OPERATIONS = Object.freeze([
  "rough_cut",          // pass 1 main cut
  "skim_pass",          // passes 2+ skim/finish
  "taper_cut",          // 4-axis UV taper
  "corner_engagement",  // sharp inside/outside corners
  "thick_section",      // >50mm / >75mm thickness bands
  "wire_break_recovery",// re-thread after a break
  "start_hole_setup",   // initial pierce / entry
  "thermal_release",    // recast / HAZ management (post-cut quality)
]);

// ---- WEDM controller fleet (conditioning axis = which post/dialect to emit for) ----
// JM's wire machine is a Mitsubishi FA-10S (wedm domain atlas + jm-die-wedm-tech-tables).
export const WEDM_CONTROLLERS = Object.freeze([
  Object.freeze({ id: "mitsubishi", aliases: ["mitsubishi", "fa-10s", "fa10s", "mv1200", "mv2400", "fa-", " fa "] }),
  Object.freeze({ id: "sodick",     aliases: ["sodick", "aq", "vl400", "alc"] }),
  Object.freeze({ id: "makino",     aliases: ["makino", "u6", "u3", "edge"] }),
  Object.freeze({ id: "agie",       aliases: ["agie", "agiecut", "charmilles", "cut "] }),
  Object.freeze({ id: "fanuc",      aliases: ["fanuc", "robocut", "alpha-c"] }),
]);

const CONTROLLER_IDS = Object.freeze(WEDM_CONTROLLERS.map((c) => c.id));

// ---- the verified gate map (each gate cites its mined+spot-verified source) ----
// controllerCap : fires only when that controller is in the resolved set.
// neither       : fires for its ops regardless of controller.
const GATES = Object.freeze({
  // ---- S(x) component gates (WEDMProgramSafetyGateEngine.ts:11-17, hand-verified) ----
  collision_path_check: {
    id: "collision_path_check",
    rule: "Wire path must not contact fixture/jaw/clamp/upper head during cut or rapid (MANDATORY -- collision is never acceptable regardless of S(x))",
    enforcedBy: "WEDMWirePathCollisionEngine",
    cite: "WEDMProgramSafetyGateEngine.ts:11,24 (collision weight 0.20, mandatory)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "corner_engagement", "thick_section", "start_hole_setup", "thermal_release"],
    confidence: "verified",
  },
  unit_system_consistency: {
    id: "unit_system_consistency",
    rule: "Program header MUST declare G20 (inch) / G21 (mm) matching the print; a unit mismatch is a 25.4x scale error (MANDATORY)",
    enforcedBy: "WEDMUnitTagGateEngine",
    cite: "WEDMProgramSafetyGateEngine.ts:16,24 (unit_tag weight 0.10, mandatory)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "corner_engagement", "thick_section", "start_hole_setup", "thermal_release"],
    confidence: "verified",
  },
  flush_velocity_kerf: {
    id: "flush_velocity_kerf",
    rule: "Kerf flush velocity v_f = Q/(pi*g*L) must exceed the thickness-band minimum (WEDM_FLUSH_ADEQUACY); side-flush raises the threshold; below the hard floor blocks (no override)",
    enforcedBy: "WEDMFlushAdequacyGateEngine.evaluate",
    cite: "WEDMFlushAdequacyGateEngine.ts + wedm-constants.ts:496 (WEDM_FLUSH_ADEQUACY)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "thick_section", "corner_engagement"],
    confidence: "verified",
  },
  head_clearance_band: {
    id: "head_clearance_band",
    rule: "Upper head clearance from the workpiece top by thickness band (WEDM_HEAD_CLEARANCE); taper swings the head via UV -- account for max taper angle",
    enforcedBy: "WEDMHeadClearanceEngine",
    cite: "wedm-constants.ts:784 (WEDM_HEAD_CLEARANCE) + WEDMProgramSafetyGateEngine.ts:12 (head_clearance 0.15)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "thick_section"],
    confidence: "verified",
  },
  recast_depth_release: {
    id: "recast_depth_release",
    rule: "Recast depth d ~ C_recast*sqrt(alpha*t_on)*eta must meet the application spec after all passes; each skim removes ~part of prior recast (WEDM_RECAST_MODEL)",
    enforcedBy: "WEDMThermalReleaseGateEngine",
    cite: "wedm-constants.ts:655 (WEDM_RECAST_MODEL) + WEDMProgramSafetyGateEngine.ts:14",
    ops: ["rough_cut", "skim_pass", "thermal_release"],
    confidence: "verified",
  },
  wire_deflection_taper: {
    id: "wire_deflection_taper",
    rule: "Wire bows under discharge force: deflection delta = F*L^2/(8*T); taper offset MUST be corrected by the computed bow -- programmed angle != desired angle (WEDM_TAPER_SPEC)",
    enforcedBy: "WEDMWireDeflectionEngine + WEDMTaperErrorBudgetEngine",
    cite: "wedm-constants.ts:170 (WEDM_TAPER_SPEC wire_bow_per_deg_taper_um scalar) + wedm-knowledge-tips.ts wedm-kb-015 (delta=F*L^2/8T formula) + WEDMProgramSafetyGateEngine.ts:17",
    ops: ["taper_cut", "thick_section"],
    confidence: "verified",
  },
  controller_dialect_verify: {
    id: "controller_dialect_verify",
    rule: "Post output must target the declared controller (Mitsubishi/Sodick/Makino/Agie/Fanuc) -- E-codes + M-codes are controller-specific; a cross-emit alarms/mis-cuts",
    enforcedBy: "WEDMControllerDialectVerifierEngine",
    cite: "WEDMProgramSafetyGateEngine.ts:15 (dialect weight 0.10)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "corner_engagement", "thick_section", "start_hole_setup", "thermal_release"],
    confidence: "verified",
  },
  jm_mitsubishi_mcode_sequence: {
    id: "jm_mitsubishi_mcode_sequence",
    rule: "JM's wire machine is the Mitsubishi FA-10S -- emit JM's verified Mitsubishi M-code sequence (e.g. M78 tank fill, M90 adaptive control), not a generic dialect",
    enforcedBy: "WEDMPostDialectRouterEngine -> WEDMPostMitsubishiEngine",
    cite: "jm-die-wedm-tech-tables.ts:289 (JM_DIE_MCODE_SEQUENCE)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "thermal_release"],
    controllerCap: "mitsubishi",
    confidence: "verified",
  },
  live_envelope_monitor: {
    id: "live_envelope_monitor",
    rule: "Hold the live safety envelope (WEDMSafetyEnvelopeEngine): wire tension gf, gap voltage V, dielectric resistivity MOhm-cm, tank level %, wire-break count in window -- exceedance halts the cut",
    enforcedBy: "WEDMSafetyEnvelopeEngine",
    cite: "WEDMSafetyEnvelopeEngine.ts:67-77 (live envelope limits)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "corner_engagement", "thick_section", "thermal_release"],
    confidence: "verified",
  },

  // ---- tribal gates (wedm-knowledge-tips.ts kb-001.., hand-verified to exist) ----
  wire_break_on_time_first: {
    id: "wire_break_on_time_first",
    rule: "On wire breaks during roughing, REDUCE ON-time (discharge pulse) ~10-15% BEFORE raising tension -- high tension on thermally weakened wire accelerates fatigue (kb-001, Klocke)",
    enforcedBy: "tribal (wedm-kb-001)",
    cite: "wedm-knowledge-tips.ts:21 (wedm-kb-001)",
    ops: ["rough_cut", "skim_pass", "corner_engagement", "thick_section"],
    confidence: "verified",
  },
  corner_slowdown_offtime: {
    id: "corner_slowdown_offtime",
    rule: "Sharp inside corners (R < ~2x wire dia) trap wire + concentrate energy: feed-slowdown at the corner, increase OFF-time, consider a smaller-dia wire; Mitsubishi FA has auto corner-control (kb-002)",
    enforcedBy: "tribal (wedm-kb-002) + Mitsubishi CC",
    cite: "wedm-knowledge-tips.ts:33 (wedm-kb-002)",
    ops: ["corner_engagement"],
    confidence: "verified",
  },
  rethread_backup_distance: {
    id: "rethread_backup_distance",
    rule: "After a break, re-thread a few mm BEHIND the break point (debris + recast at the exact point cause immediate re-break); AWT machines set the backup in controller params (kb-003)",
    enforcedBy: "tribal (wedm-kb-003) + AWT",
    cite: "wedm-knowledge-tips.ts:45 (wedm-kb-003)",
    ops: ["wire_break_recovery"],
    confidence: "verified",
  },
  thick_section_flush_pressure: {
    id: "thick_section_flush_pressure",
    rule: "For cuts >50mm, inadequate flushing is the #1 wire-break cause: raise flush pressure, prefer coaxial (upper+lower) over side jets, slow the cut for blind/restricted flush (kb-004, Kunieda)",
    enforcedBy: "WEDMFlushAdequacyGateEngine + shop procedure (wedm-kb-004)",
    cite: "wedm-knowledge-tips.ts:57 (wedm-kb-004) + wedm-constants.ts:496",
    ops: ["thick_section"],
    confidence: "verified",
  },
  coated_wire_hard_material: {
    id: "coated_wire_hard_material",
    rule: "For carbide (WC) / PCD, use zinc-coated brass wire (sacrificial layer improves flushing, ~30-50% fewer breaks); gamma-phase coated for thick WC (kb-005)",
    enforcedBy: "tribal wire-selection (wedm-kb-005)",
    cite: "wedm-knowledge-tips.ts:69 (wedm-kb-005)",
    ops: ["rough_cut", "skim_pass"],
    confidence: "verified",
  },
  skim_count_ra_plateau: {
    id: "skim_count_ra_plateau",
    rule: "Each skim improves Ra ~60-70% (Toenshoff cascade) but plateaus after ~4 skims (<~0.05um further) -- below ~0.2um Ra switch to lapping, do not add skims (kb-008)",
    enforcedBy: "WEDMMultiPassStrategyEngine (wedm-kb-008)",
    cite: "wedm-knowledge-tips.ts (wedm-kb-008) + wedm-constants.ts:706 (WEDM_MULTI_PASS)",
    ops: ["skim_pass", "thermal_release"],
    confidence: "verified",
  },
  resistivity_first_on_ra: {
    id: "resistivity_first_on_ra",
    rule: "If Ra is 20-50% worse than predicted, check deionized-water resistivity FIRST (finishing optimum band) before touching E-pack params; replace resin when it drops under load (kb-007)",
    enforcedBy: "tribal dielectric monitoring (wedm-kb-007)",
    cite: "wedm-knowledge-tips.ts (wedm-kb-007) + wedm-constants.ts:343 (WEDM_DIELECTRIC_SPEC)",
    ops: ["skim_pass", "thermal_release"],
    confidence: "verified",
  },
  recast_aero_medical_spec: {
    id: "recast_aero_medical_spec",
    rule: "WEDM always leaves a recast (white) layer; for aerospace/medical (AMS 2628) it must meet the max-recast spec after skims, else mechanical/chemical removal is required (kb-011)",
    enforcedBy: "WEDMThermalReleaseGateEngine (wedm-kb-011)",
    cite: "wedm-knowledge-tips.ts (wedm-kb-011) + wedm-constants.ts:655",
    ops: ["thermal_release"],
    confidence: "verified",
  },
});

// gates flagged by the mining agent as NOT verified against a cited rule -> NOT fired.
// Surfaced for the mike specialist to author (R12: never present these as verified).
export const WEDM_UNVERIFIED_GAPS = Object.freeze([
  "taper wire-deflection compensation ALGORITHM (constant wire_bow_per_deg_taper_um exists; full correction algo not located -- verify WEDMTaperErrorBudgetEngine source + FA-10S UV telemetry)",
  "no-core cut SEQUENCING (skims must return to rough entry/exit; out-of-sequence leaves micro-tabs -- WEDMNoCoreCutSequencerEngine not found by glob)",
  "working gap-voltage != open-circuit-voltage correction formula (WEDMGapVoltageControlEngine not read -- verify model + FA-10S param map)",
]);

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of WEDM_OPERATIONS) m[op] = [];
  for (const g of Object.values(GATES)) {
    for (const op of g.ops) if (m[op]) m[op].push(g.id);
  }
  return Object.freeze(m);
})();

// ---- helpers ----
function isStr(s) { return typeof s === "string" && s.length > 0; }

// Resolve controller ids from a free-form machine/controller list.
export function resolveCaps(machines) {
  const caps = new Set();
  if (!Array.isArray(machines)) return caps;
  for (const raw of machines) {
    if (!isStr(raw)) continue;
    const s = raw.toLowerCase();
    for (const c of WEDM_CONTROLLERS) {
      if (c.aliases.some((a) => s.includes(a))) caps.add(c.id);
    }
  }
  return caps;
}

function gateAllowed(gate, caps) {
  if (gate.controllerCap && !caps.has(gate.controllerCap)) return false;
  return true;
}

// ---- the firing entry point ----
// ctx: { operations: string[], machines?: string[] (controllers/machine descriptors) }
// Returns { operations:[{operation, gates:[...]}], controllers:[...], summary }.
// Defensive: never throws on null/non-object/garbage ctx (lathe-sibling lesson).
export function fireForApproach(ctx) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const rawOps = Array.isArray(c.operations) ? c.operations : [];
  const caps = resolveCaps(c.machines);
  const controllers = CONTROLLER_IDS.filter((id) => caps.has(id));

  const ops = [];
  for (const op of rawOps) {
    if (!isStr(op) || !OPS_TO_GATES[op]) continue;
    const gates = OPS_TO_GATES[op]
      .map((id) => GATES[id])
      .filter((g) => gateAllowed(g, caps))
      .map((g) => ({ id: g.id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite }));
    ops.push({ operation: op, gates });
  }

  let summary = `${ops.length} WEDM operation(s); controllers: ${controllers.join("/") || "unspecified"}`;
  if (rawOps.length && c.machines && !controllers.length) {
    summary += " -- NOTE: no WEDM controller resolved; confirm the machine before applying the dialect gate (default JM = Mitsubishi FA-10S)";
  }
  return { operations: ops, controllers, caps: [...caps], summary };
}

// ---- detect WEDM operations from a print-reading prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  if (/\brough(?:ing)?\b|first[\s-]?cut|main[\s-]?cut|pass[\s-]?1\b/.test(t)) found.add("rough_cut");
  if (/\bskim\b|trim[\s-]?pass|finish[\s-]?pass|multi[\s-]?pass|second[\s-]?pass/.test(t)) found.add("skim_pass");
  if (/\btaper\b|uv[\s-]?axis|4[\s-]?axis|angle[\s-]?cut/.test(t)) found.add("taper_cut");
  if (/\bcorner\b|sharp[\s-]?(?:inside|radius|corner)|tight[\s-]?radius/.test(t)) found.add("corner_engagement");
  if (/\bthick\b|thick[\s-]?section|deep[\s-]?cut|tall[\s-]?part/.test(t)) found.add("thick_section");
  if (/wire[\s-]?break|re[\s-]?thread|rethread|wire[\s-]?broke|\bawt\b/.test(t)) found.add("wire_break_recovery");
  if (/start[\s-]?hole|\bpierce\b|pilot[\s-]?hole|entry[\s-]?point|thread[\s-]?up/.test(t)) found.add("start_hole_setup");
  if (/\brecast\b|\bhaz\b|heat[\s-]?affected|white[\s-]?layer|thermal[\s-]?release/.test(t)) found.add("thermal_release");
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES, CONTROLLER_IDS };
