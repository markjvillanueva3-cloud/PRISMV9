// scripts/lib/lathe-approach-knowledge.mjs
//
// LATHE-APPROACH-KNOWLEDGE-FIRING (slot:zulu for whiskey, 2026-06-29)
//
// PURPOSE -- the operator's directive: "auto firing wikis and auto firing tribal
// knowledge depending on lathe task that the lathe wizard will come across during the
// print reading process and deciding how to approach the part depending on user
// availability for machines and tooling." This is the CONTEXT-AWARE firing layer:
// given the lathe OPERATIONS detected on a print + the MACHINES + TOOLING the shop
// actually has, fire the relevant VERIFIED lathe knowledge (safety gotchas, formulas,
// machine-dialect notes, tooling constraints) so the Lathe Wizard surfaces the right
// approach knowledge at the right moment -- not the whole domain dump, only what THIS
// task on THESE machines with THIS tooling needs.
//
// SOURCING DISCIPLINE (R12 -- NO FABRICATION): every knowledge item below is sourced
// from an ENGINE-ENFORCED, cited lathe safety rail or a VERIFIED tribal candidate in
// reference_lathe_vault_enrichment_2026_06_29.md (which cites lathe/CLAUDE.md S4-7 +
// constants.ts). The `enforcedBy` field names the engine that hard-blocks the gotcha,
// so this is a re-organization of EXISTING verified knowledge by operation+machine+
// tooling, NOT new physics. Numeric cutting constants are NOT inlined here -- this fires
// the RULE + points at src/physics/constants.ts (hook-enforced canonical source).
// Anything not engine-enforced is tagged confidence:"unverified" for whiskey to refine
// (the lathe gotchas are alpha-authored hypotheses per gap G11 until whiskey refines).
//
// ASCII-only (ascii-guard). No em-dashes.

// ---- the lathe operation taxonomy the wizard encounters during print-reading ----
export const LATHE_OPERATIONS = Object.freeze([
  "od_turn", "face", "od_groove", "id_groove", "od_thread", "id_thread",
  "drill", "bore", "part_off", "chamfer", "taper", "knurl",
  "sub_spindle_transfer", "live_tooling",
]);

// Canonical machine families (JM Die runs 7 Okuma OSP lathes, LTH-01..07, + Multus B250).
// Source: reference_lathe_vault_enrichment_2026_06_29 (CLAUDE.md S6-7).
export const KNOWN_OKUMA_OSP = Object.freeze([
  "LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07", "MULTUS-B250",
]);

// ---- VERIFIED safety gotchas (engine-enforced) keyed by id ----
// Each: rule text + enforcedBy engine + cite + the operations it fires for.
const GOTCHAS = Object.freeze({
  css_g50_cap: {
    rule: "CSS (G96) MUST pair with a G50 max-RPM cap; as diameter shrinks RPM approaches infinity at center (over-speed hazard).",
    enforcedBy: "LatheAdvancedOperationsEngine.validateCSSCap (hard block)",
    cite: "lathe/CLAUDE.md S5 gotcha 1", confidence: "verified",
    ops: ["od_turn", "face", "od_groove", "id_groove", "bore", "taper", "chamfer"],
  },
  feed_ipr_not_ipm: {
    rule: "Lathe feed is ALWAYS per-rev (IPR / mm-rev), never per-minute (IPM); a value pasted from a mill program is a 25.4x chip-load surge. Resolve the feed UNIT from the source before emitting.",
    enforcedBy: "units-guard + LatheAdvancedOperationsEngine",
    cite: "lathe/CLAUDE.md S6", confidence: "verified",
    ops: LATHE_OPERATIONS.filter((o) => o !== "sub_spindle_transfer"),
  },
  nose_radius_feed: {
    rule: "Surface finish and feed are coupled: Ra ~= f^2 / (8 * Rnose). Halving feed quarters roughness; tune feed against the nose radius, not in isolation.",
    enforcedBy: "LatheSurfaceFinish path (formula h=f^2/8r in lathe-foundations.md)",
    cite: "lathe/CLAUDE.md S5 gotcha 3", confidence: "verified",
    ops: ["od_turn", "face", "bore", "taper"],
  },
  thread_position_lock: {
    rule: "Threading needs a position-locked entry (G92/G76, or Okuma G78/G176); a feed-mode entry is a hard error -- the lead will be wrong on the first pass.",
    enforcedBy: "LatheAdvancedOperationsEngine.validateThreadEntry (hard error)",
    cite: "lathe/CLAUDE.md S5 gotcha 4", confidence: "verified",
    ops: ["od_thread", "id_thread"],
  },
  thread_infeed_angle: {
    rule: "G76 infeed angle MUST match the insert geometry: 29 deg Acme / 30 deg metric / 60 deg UN. A mismatch loads the wrong flank and breaks the insert.",
    enforcedBy: "threadingPipelineDispatcher (multi-pass G76)",
    cite: "lathe/CLAUDE.md S5 gotcha 8", confidence: "verified",
    ops: ["od_thread", "id_thread"],
  },
  boring_bar_deflection: {
    rule: "Boring-bar deflection scales as L^3/D^4 (cantilever delta=FL^3/3EI, I prop D^4); keep L/D <= 4 (steel) / <= 6 (carbide). A small reach increase is a large finish/chatter penalty -- prefer carbide or a steady rest before exceeding the limit.",
    enforcedBy: "BoringBarDeflectionEngine + SteadyRestPlacement",
    cite: "lathe/CLAUDE.md S5 gotcha 2", confidence: "verified",
    ops: ["bore", "id_groove", "id_thread"],
  },
  parting_chip_clearance: {
    rule: "Parting/grooving deeper than 3x tool width traps chips and binds; switch to G75 peck-grooving above that ratio. A straight plunge at depth is a tool-break / spindle-stall risk.",
    enforcedBy: "LathePartingChipClearanceEngine",
    cite: "lathe/CLAUDE.md S5 gotcha 5", confidence: "verified",
    ops: ["part_off", "od_groove", "id_groove"],
  },
  chuck_centrifugal_grip: {
    rule: "Chuck grip is RPM-dependent: ~30% centrifugal grip loss at 3000 RPM on a 6 in chuck. A part safe at load-speed can throw at cutting-speed -- derate grip force by RPM before approving the cut.",
    enforcedBy: "ChuckJawForceEngine (centrifugal reduction)",
    cite: "lathe/CLAUDE.md S5 gotcha 9", confidence: "verified",
    ops: LATHE_OPERATIONS, // workholding applies to every op
  },
  bar_remnant_min: {
    rule: "Bar-fed parts must keep a minimum bar remnant; insufficient bar at part-off => turret crash. Optimize pitch against the remnant minimum.",
    enforcedBy: "BarFeedPitchOptimizerEngine",
    cite: "lathe/CLAUDE.md S5 gotcha 10", confidence: "verified",
    ops: ["part_off"],
  },
  sub_spindle_phase: {
    rule: "Sub-spindle handoff must align within 0.5 deg spindle phase, and the sub clamps BEFORE the main unclamps (no-drop). A phase/clamp-order error drops or marks the part.",
    enforcedBy: "Fusion360MillTurnBridgeEngine + OkumaB250 sub-spindle codes",
    cite: "lathe/CLAUDE.md S5 gotcha 6 (0.5deg phase) + reference_multus_b250_subspindle_verified_codes_2026_06_28 (no-drop clamp-order/M-codes)", confidence: "verified",
    ops: ["sub_spindle_transfer"],
  },
  live_tooling_polar: {
    rule: "Off-center / cross features use the Cartesian Y-axis; polar interpolation needs G7.1/G12.1. Treating a polar feature as Cartesian (or vice-versa) mis-positions the cut.",
    enforcedBy: "lathe live-tooling path",
    cite: "lathe/CLAUDE.md S5 gotcha 7", confidence: "verified",
    ops: ["live_tooling"],
  },
  kienzle_taylor_canonical: {
    rule: "Kienzle kc1.1 + Taylor C,n come EXCLUSIVELY from src/physics/constants.ts (the per-ISO-group set in CANONICAL_KIENZLE / CANONICAL_TAYLOR), hook-enforced -- never inline a cutting constant.",
    enforcedBy: "physics-constants hook",
    cite: "src/physics/constants.ts CANONICAL_KIENZLE/CANONICAL_TAYLOR + lathe/CLAUDE.md S4", confidence: "verified",
    ops: LATHE_OPERATIONS,
  },
  // ---- whiskey corpus-mined gotchas (slot:zulu 2026-07-01, cited+spot-verified) ----
  runout_rss_budget: {
    rule: "A called-out circular/total-runout, coaxiality, or concentricity FCF is feasibility-gated at print-read: achievable TIR = RSS(spindle, chuck/collet, tool-setup, part-deflection), deflect = F*L^3/(3*E*I), I = pi*d^4/64, Cpk ~= (tol/2)/(3*TIR). If predicted TIR does not fit the tolerance at target Cpk, change the approach (precision collet / steady rest / add a grind pass) BEFORE turning -- do not promise a runout the error stack cannot hold.",
    enforcedBy: "LatheCoaxialityRunoutValidatorEngine.validate (RSS budget + Cpk verdict)",
    cite: "LatheCoaxialityRunoutValidatorEngine.ts:5-19,35 + ASME Y14.5-2018 S13 + Slocum Precision Machine Design 1992 S5", confidence: "verified",
    ops: ["od_turn", "face", "bore", "taper"],
  },
  recht_segmented_chip: {
    rule: "On low-conductivity alloys (Ti, Inconel/superalloys ISO S, hardened steel ISO H) the chip goes SEGMENTED (saw-tooth) when thermal softening beats strain hardening: Recht chi = thermal_softening_rate / strain_hardening_rate > 1. Saw-tooth chips are NORMAL on S-group (not a defect), but the segmentation is periodic and drives a cyclic force ripple (f_seg = Vs/band_spacing) -- a finish/vibration signature distinct from regenerative chatter. J-C A,B,n,m + rho,cp from constants.ts, never inlined.",
    enforcedBy: "LatheChipMechanicsEngine.analyzeAdiabaticShearBands (Recht chi) + predictChipType",
    cite: "LatheChipMechanicsEngine.ts:16,984-1096 (Recht 1964 Catastrophic Thermoplastic Shear) + constants.ts CANONICAL_MATERIAL_DB J-C params", confidence: "verified",
    ops: ["od_turn", "face", "bore", "taper"],
  },
  // ---- whiskey pass-2 corpus-mined gotchas (slot:zulu 2026-07-01, cited+spot-verified) ----
  thread_pass_depth_progression: {
    rule: "A multi-pass single-point thread must use CONSTANT CHIP-AREA infeed, NOT equal-depth. Equal radial infeed grows the chip cross-section pass over pass (later passes engage the widening flank V) and overloads/breaks the insert on the finish passes. Correct schedule: infeed_n = total_depth * (sqrt(n) - sqrt(n-1)) / sqrt(N) -- big first bite, progressively finer -- then 1-2 zero-infeed spring passes. total_depth = depth_factor*pitch (0.6134 UN/metric, 0.500 Acme, 0.6403 BSP-55, from the thread-form table); pass count rises with pitch and ISO S/H/M. This is the depth SCHEDULE, distinct from the infeed ANGLE and the entry-mode lock.",
    enforcedBy: "ThreadingPipelineEngine.generatePassSchedule (constant-chip-area sqrt-pass) + LatheScienceHardeningEngine.generateThreadPassSchedule",
    cite: "ThreadingPipelineEngine.ts:10,187,221-223 (Sandvik GC 2023 + Machinery's Handbook 31e) + LatheScienceHardeningEngine.ts:290-322 (constant_chip_area)", confidence: "verified",
    ops: ["od_thread", "id_thread"],
  },
  peck_cycle_ld_selection: {
    rule: "On-centerline deep drilling: SELECT the peck cycle by L/D and coolant, and DECREASE the peck depth with depth. A chip-break cycle (G73, small retract) is fine when shallow, but a FULL-retract cycle (G83, back to R-plane to clear chips + re-admit coolant) is required once L/D exceeds the flute-packing threshold OR coolant is none/MQL. Peck depth decreases (peck_n = first_peck * decay^(n-1) floored at min_peck) because friction/heat rise deeper in the bore. L/D also gates tool class (twist < carbide/indexable < gun drill); feed drops at breakthrough. Decay/min-peck are named engine constants, not inlined. Distinct from the Okuma G74-dialect note (meaning-of-G74; this is Fanuc cycle choice + schedule).",
    enforcedBy: "PeckDrillingEngine.calculate (G83/G73 select + decreasing schedule) + LatheScienceHardeningEngine.generateDecreasingPeckSchedule (turningDispatcher lathe_peck_schedule)",
    cite: "PeckDrillingEngine.ts:6,88,110,129-161 (Machinery's Handbook Ch.27 + Sandvik Deep Hole Drilling Guide) + LatheScienceHardeningEngine.ts:423-444 + turningDispatcher.ts:867-875", confidence: "verified",
    ops: ["drill"],
  },
  workpiece_beam_deflection_support: {
    rule: "A long slender PART deflects AWAY from the tool under the radial force and rings/tapers -- distinct from boring-bar (TOOL) deflection. Model the workpiece as a beam: chuck-only is a CANTILEVER (delta = F*L^3/(3*E*I), k=3EI/L^3); a tailstock makes it SIMPLY-SUPPORTED (delta = F*L^3/(48*E*I), k=48EI/L^3, ~16x stiffer), with I = pi*D^4/64. Halving part diameter is a 16x deflection penalty -- the lever is a tailstock/steady rest, not feed. At print-read, if predicted deflection at the tool Z exceeds tolerance/2, change the APPROACH (add tailstock/steady rest, split the cut, or cut radial force) BEFORE turning. E from the material set, never inlined.",
    enforcedBy: "LatheScienceHardeningEngine.calculateBeamDeflection (cantilever/simply-supported + tolerance/2 verdict, turningDispatcher lathe_beam_deflection)",
    cite: "LatheScienceHardeningEngine.ts:190-191,365-386 (I=pi*D^4/64; 3EI/L^3 vs 48EI/L^3) + turningDispatcher.ts:857-860; corrob TailstockForceEngine.ts:80-86,152-153", confidence: "verified",
    ops: ["od_turn", "face", "taper", "chamfer", "od_groove", "od_thread", "knurl"],
  },
  groove_peck_plunge_schedule: {
    rule: "Once a groove/part-off crosses the chip-clearance boundary the plunge is BROKEN into pecks: recommend peck when groove_depth > 1.5*tool_width and set peck_depth = min(0.8*tool_width, groove_depth/3) -- tie the peck to blade WIDTH, since a narrow blade jams sooner than depth alone predicts. A groove WIDER than the blade is cut in num_plunges = ceil(groove_width/tool_width) side-by-side plunges, and grooving feed is derated to ~80% of parting feed. Blade width tracks bar diameter; a blade > ~15% of diameter is excessive kerf. This is the emitted G75 peck SCHEDULE + multi-plunge stepover, distinct from the >3x-width chip-clearance DECISION boundary.",
    enforcedBy: "PartingGroovingEngine.groove (peck-depth schedule + multi-plunge stepover, cncOpsDispatcher parting_grooving_calculate)",
    cite: "PartingGroovingEngine.ts:188-205 (Sandvik C-2920 + ISCAR grooving manual + Machinery's Handbook Ch.29) + cncOpsDispatcher.ts:248-255", confidence: "verified",
    ops: ["od_groove", "id_groove", "part_off"],
  },
  // ---- whiskey pass-3 corpus-mined gotchas (slot:zulu 2026-07-01, cited+verify-arm PASS) ----
  lathe_min_chip_thickness_rubbing: {
    rule: "Cutting only occurs when chip thickness exceeds the insert edge radius by a margin: h_chip = f*sin(kr) (f=feed/rev, kr=approach angle); below a fraction of edge_radius the edge RUBS instead of cutting (no chip, heat + work-hardening). A cut/no-cut BOUNDARY predicate, distinct from the nose-radius Ra finish law (that is a finish coupling, this is feasibility). RUBBING_FACTOR is a named engine const, never inlined here.",
    enforcedBy: "LatheCollisionZoneEngine.checkMinChipThickness (turningDispatcher lathe_chip_thickness)",
    cite: "LatheCollisionZoneEngine.ts:493-511 (RUBBING_FACTOR :46-47; Machinery's Handbook Ch.27-29 + Sandvik Turning Application Guide)", confidence: "verified",
    ops: ["od_turn", "face", "bore", "taper", "chamfer"],
  },
  lathe_g71_type_monotonicity: {
    rule: "G71 roughing-cycle validity is a TOPOLOGY predicate, not depth: Type I requires the X-coordinate sequence strictly monotonic (increasing OD / decreasing ID) along Z; ANY reversal in X makes Type I unsafe and Type II (R-parameter) mandatory -- Type I on a non-monotonic (undercut/necked) profile drives the roughing pass INTO the finished contour on retract. Gate G71 emission on this check before selecting the cycle type.",
    enforcedBy: "LatheCollisionZoneEngine.detectG71Type (turningDispatcher lathe_g71_type)",
    cite: "LatheCollisionZoneEngine.ts:644-684 (reversal-detection loop :657-671; header S14)", confidence: "verified",
    ops: ["od_turn", "taper", "od_groove"],
  },
  lathe_trilobe_thinwall_clamp: {
    rule: "A thin-walled part in a 3-jaw chuck deforms into a 3-lobed (trilobe) shape: delta = F*R^3/(E*I) with I = b*t^3/12 (thin-ring section, b=jaw contact width, t=wall, R=mean radius) -- a clamp force safe for a solid part can distort a thin ring past tolerance/2 even at ZERO RPM, then the part springs OUT-OF-ROUND after release/boring. Distinct from RPM-driven centrifugal grip loss and from boring-bar (tool) cantilever deflection. E from material set, never inlined.",
    enforcedBy: "LatheWorkholdingEngine.calculateTrilobe (turningDispatcher lathe_workholding_trilobe)",
    cite: "LatheWorkholdingEngine.ts:351-403 (delta=F*R^3/EI, I=b*t^3/12, per-jaw force; Nee & Tao thin-walled deformation) + turningDispatcher.ts:247,2895,2906", confidence: "verified",
    ops: ["od_turn", "bore", "face", "id_groove"],
  },
  // ---- corroborated-promotion gates (soul-verified whiskey arm, wf_0524c0db-eaa 2026-07-02) ----
  lathe_doc_below_nose_colwell: {
    rule: "When DOC falls below the insert nose radius the whole cut rides the nose arc: chip flow rotates per Colwell scaled by DOC over nose radius (eta_eff = eta_stabler*min(1,DOC/r_nose)) and the chip thins -- re-evaluate finish-pass feed and chip control before emitting. The DOC/r_nose boundary is the engine's structural ratio, never inlined.",
    enforcedBy: "LatheChipMechanicsEngine.analyzeChipFlow (Colwell nose-radius modification)",
    cite: "Stabler 1951 + Colwell chip-flow modification -- LatheChipMechanicsEngine.ts:17,1160,1183-1191,1276-1281 (soul-verified whiskey wf_0524c0db-eaa 2026-07-02)", confidence: "verified",
    ops: ["od_turn", "face", "bore", "taper", "chamfer"],
  },
  lathe_mandrel_lame_grip: {
    rule: "Gate mandrel-held cuts on the Lame expanding-mandrel check: contact pressure from diametral interference times friction over the contact area sets torque capacity; require the engine's safety-factor adequacy verdict before approving the setup. Interference/mu/SF values stay engine-side, never inlined.",
    enforcedBy: "LatheWorkholdingEngine.calculateExpandingMandrel (safety-factor adequacy verdict)",
    cite: "DIN 6350 + Machinery's Handbook 31e -- LatheWorkholdingEngine.ts:18-24,459-497 (SF const :226) (soul-verified whiskey wf_0524c0db-eaa 2026-07-02)", confidence: "verified",
    ops: ["od_turn", "face", "od_groove", "od_thread", "taper", "chamfer"],
  },
  lathe_thread_pd_class_gate: {
    rule: "Gate single-point threading on the invoked pitch-diameter tolerance class (UN 2A/3A external, 2B/3B internal per ASME B1.1; metric 6g/6H per ISO 965-1): block emission when the manufactured pitch diameter escapes the class band, and name the class in the thread plan.",
    enforcedBy: "ThreadClassGateHook.validate -> TurningThreadOptimizerEngine.checkPitchDiameter (hard block on out-of-band PD)",
    cite: "ASME B1.1 + ISO 965-1 -- ThreadClassGateHook.ts:5-7,41-47,79,158-159,214-233,269 + TurningThreadOptimizerEngine.ts:106,287 (soul-verified whiskey wf_0524c0db-eaa 2026-07-02)", confidence: "verified",
    ops: ["od_thread", "id_thread"],
  },
});

// ---- Okuma OSP machine-dialect notes (VERIFIED, fire when an Okuma is in the fleet) ----
const OKUMA_OSP_DIALECT = Object.freeze([
  { rule: "On Okuma OSP, CSS is the VCSS macro (NOT G96/G97).", cite: "lathe/CLAUDE.md S6-7", ops: ["od_turn", "face", "bore", "taper"] },
  { rule: "On Okuma OSP, threading is G78 (single-pass) + G176 (multi-pass), NOT G76 -- a Fanuc G76 alarms or mis-cuts on an OSP control.", cite: "lathe/CLAUDE.md S6-7", ops: ["od_thread", "id_thread"] },
  { rule: "On Okuma OSP, G74 is peck-DRILL, NOT face-grooving -- assuming the Fanuc meaning is a collision risk.", cite: "lathe/CLAUDE.md S6-7", ops: ["drill", "od_groove", "id_groove"] },
  { rule: "On Okuma OSP, sub-spindle sync uses VWAIT/VSYNCH macros; CSS clear is G1100.", cite: "lathe/CLAUDE.md S6-7", ops: ["sub_spindle_transfer"] },
]);

// ---- tooling-availability constraints per operation (what tool the op REQUIRES) ----
const TOOLING_REQUIREMENTS = Object.freeze({
  od_thread: { needs: "threading", note: "OD threading insert whose included angle matches the thread form (60 UN / 30 metric / 29 Acme)." },
  id_thread: { needs: "threading", note: "ID/internal threading bar; mind boring-bar L/D for the bore depth." },
  bore: { needs: "boring_bar", note: "Boring bar sized so L/D <= 4 steel / 6 carbide for the bore depth; else a steady rest or carbide bar." },
  id_groove: { needs: "grooving", note: "Internal grooving tool reaching the bore depth within L/D limits." },
  od_groove: { needs: "grooving", note: "OD grooving/parting blade; depth > 3x width => G75 peck." },
  part_off: { needs: "parting", note: "Cut-off blade; verify blade width vs part dia (depth > 3x width => G75 peck) and bar remnant." },
  drill: { needs: "drill", note: "Center-supported drilling; on Okuma the cycle is G74 peck-drill." },
  knurl: { needs: "knurl", note: "Knurling tool; not a cutting op -- forming pressure, derate spindle/workholding." },
  live_tooling: { needs: "live_tool", note: "Driven tooling head; needs Y-axis or polar (G7.1/G12.1) per feature." },
  sub_spindle_transfer: { needs: "sub_spindle", note: "Requires a sub-spindle / second chuck machine (e.g. Multus B250); single-spindle lathes cannot transfer." },
});

function normalizeOps(operations) {
  if (!Array.isArray(operations)) return [];
  const set = new Set(LATHE_OPERATIONS);
  return [...new Set(operations.map((o) => String(o).toLowerCase().trim()).filter((o) => set.has(o)))];
}

function fleetHasOkuma(machines) {
  if (!Array.isArray(machines) || machines.length === 0) return false;
  const okuma = new Set(KNOWN_OKUMA_OSP.map((m) => m.toLowerCase()));
  return machines.some((m) => {
    const s = String(m).toLowerCase();
    return okuma.has(s) || s.includes("okuma") || s.includes("osp") || s.includes("multus") || s.startsWith("lth-");
  });
}

/**
 * Fire the task-relevant lathe knowledge for an approach decision.
 * @param {{operations:string[], machines?:string[], tooling?:string[]}} ctx
 *   operations: lathe ops detected on the print (subset of LATHE_OPERATIONS)
 *   machines:   available machine ids/names (Okuma OSP fleet conditions the dialect)
 *   tooling:    available tooling categories (e.g. ["boring_bar","threading","parting"])
 * @returns {{operations:object[], fleetHasOkuma:boolean, summary:string}}
 */
export function fireForApproach(ctx = {}) {
  const c = ctx && typeof ctx === "object" ? ctx : {}; // guard null / non-object (not just undefined)
  const ops = normalizeOps(c.operations);
  const machines = Array.isArray(c.machines) ? c.machines : [];
  const haveOkuma = fleetHasOkuma(machines);
  const toolingHave = new Set((Array.isArray(c.tooling) ? c.tooling : []).map((t) => String(t).toLowerCase().trim()));

  const out = ops.map((op) => {
    // gotchas that fire for this op
    const gotchas = Object.entries(GOTCHAS)
      .filter(([, g]) => g.ops.includes(op))
      .map(([id, g]) => ({ id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite, confidence: g.confidence }));

    // Okuma dialect notes for this op (only if an Okuma is in the fleet)
    const dialect = haveOkuma ? OKUMA_OSP_DIALECT.filter((d) => d.ops.includes(op)) : [];

    // tooling: what this op requires + whether the shop has it
    const req = TOOLING_REQUIREMENTS[op] || null;
    let toolingConstraint = null;
    if (req) {
      const have = toolingHave.size === 0 ? null : toolingHave.has(req.needs);
      toolingConstraint = {
        needs: req.needs,
        note: req.note,
        available: have, // true | false | null(unknown -- no tooling list supplied)
        ...(have === false ? { blocker: `Required tooling "${req.needs}" not in the available set -- cannot approach ${op} as-is; substitute or flag to operator.` } : {}),
      };
    }

    return { operation: op, gotchas, okumaDialect: dialect, tooling: toolingConstraint };
  });

  const blockers = out.filter((o) => o.tooling && o.tooling.available === false).map((o) => o.operation);
  const summary =
    `lathe approach: ${ops.length} op(s) [${ops.join(", ") || "none recognized"}]` +
    `${haveOkuma ? "; Okuma OSP dialect fired" : ""}` +
    `${blockers.length ? `; tooling BLOCKERS: ${blockers.join(", ")}` : ""}`;

  return { operations: out, fleetHasOkuma: haveOkuma, summary };
}

// keyword -> operation map for detecting lathe ops in a print-reading / prompt context.
// Ordered most-specific-first so "internal thread" -> id_thread before the generic thread.
// NB: id_thread / id_groove are detected EXPLICITLY in detectOperations (before these
// generic patterns run against internal-phrase-stripped text), so the generic thread/
// groove patterns below never double-count an "internal thread" as od_thread.
const OP_PATTERNS = Object.freeze([
  [/\bthread(?:ing)?\b/i, "od_thread"],
  [/\bgroov(?:e|ing)\b/i, "od_groove"],
  [/\b(?:part[-\s]?off|parting|cut[-\s]?off)\b/i, "part_off"],
  [/\bbor(?:e|ing)\b/i, "bore"],
  [/\bdrill(?:ing)?\b/i, "drill"],
  [/\bfac(?:e|ing)\b/i, "face"], // matches "face" and "facing" (fac+ing); not "surface"/"facet"
  [/\bsub-?spindle|pick-?off|back-?work\b/i, "sub_spindle_transfer"],
  [/\bknurl/i, "knurl"],
  [/\btaper(?:ed|ing)?\b/i, "taper"],
  [/\bchamfer/i, "chamfer"],
  [/\b(?:live|driven)\s*tool|cross[-\s]?drill|c-?axis\b/i, "live_tooling"],
  [/\b(?:od|outer\s*diameter)?\s*turn(?:ing)?\b/i, "od_turn"],
]);

// UNVERIFIED gaps -- the lathe verify-backlog: real, CITED items the whiskey specialist
// must confirm before any becomes a fired gate. Sourced from reference_lathe_vault_enrichment_2026_06_29
// (its cited G1-G11 gap table + UNVERIFIED tribal tips). NOT fired; surfaced by the six-domain
// autofire coverage worklist (parity with CAM/WEDM/MILL_UNVERIFIED_GAPS). Safety rail: nothing
// here drives a gate until the specialist verifies the numeric threshold vs the cited source.
export const LATHE_UNVERIFIED_GAPS = Object.freeze([
  "Material-specific quantitative infeed/heat/chatter thresholds beyond the <=16 TPI rule not bound (reference_lathe_vault_enrichment_2026_06_29 G1; lathe_synthesis.md open threads) -- drain Sandvik/Kennametal/Iscar turning catalogs for per-ISO infeed/Vc/feed tables",
  "Cost-optimal Vc optimizer not physics-backed; 220 vs 209 m/min Gilbert-target discrepancy unconfirmed (reference_lathe_vault_enrichment_2026_06_29 G2; GilbertEconomicSpeedEngine)",
  "Okuma real collision geometry (turret/chuck/swing) for LTH-01..07 is PLACEHOLDER; U-W-COLLISION-GEOM open (reference_lathe_vault_enrichment_2026_06_29 G3; JM DIE/CNC OKUMA MULTUS running programs)",
  "G76 threading validator misses specific defects (reference_lathe_vault_enrichment_2026_06_29 G4; node_formula g76_thread_validator_design) -- source Haas/Fanuc threading manuals + JM ACME/THREAD .MIN ground truth",
  "LatheSurfaceFinishEngine cited but existence UNCONFIRMED (reference_lathe_vault_enrichment_2026_06_29 G8; CLAUDE.md S12) -- duplication-guard + ENGINE_DIGEST before any build",
  "S5 lathe gotchas are alpha-authored hypotheses, NOT whiskey-refined; no canonical lathe-soul; U-GALAXY-MS1-D3 open (reference_lathe_vault_enrichment_2026_06_29 G11)",
  "Per-op cost attribution A/B: accurate cycle_time_sec did NOT move the uneconomical count -- attribution alone is not the lever (reference_lathe_vault_enrichment_2026_06_29 tip5; _SYNTHESIS.md)",
  "Algorithm-to-turning primitive map (SavGol/DTW/Viterbi/GMM-KNN/RANSAC) wired-vs-proposed unconfirmed (reference_lathe_vault_enrichment_2026_06_29 tip15; MEMORY.md algo-primitives)",
  "Nose-radius surface-finish Ra ~= f^2/(32*r): larger nose radius at equal feed cuts theoretical Ra (0.8->1.6mm ~= -75%) -- candidate finish-pass advisory on od_turn/face; verify vs SFC + LatheSurfaceFinishEngine before firing (external-source candidate: HERMES-EXTERNAL-KNOWLEDGE-INGESTION-ROADMAP-2026-06-29 sec LATHE; Kalpakjian Mfg Eng & Tech 8e Ch23)",
  "Minimum feed-per-rev for chip self-breaking not fired: below f_min a ductile continuous chip lacks bending strain to break and runs stringy -> wraps part/tool/chuck (chip-whip + tool-break). Predicate f < f_min AND high-elongation ISO P/M/N AND no chipbreaker; complements the existing >3x-width parting UPPER bound. Constant LatheChipMechanicsEngine.ts:47 (MIN_FEED_CHIP_BREAKING), enforcement :754 + LatheBirdNestPredictorEngine. Cite Nakayama 1962/72 + Jawahir/van Luttervelt CIRP Annals 42(2) 1993 + ISO 3685. Whiskey: confirm f_min + per-ISO scaling before firing a feed-floor gate.",
  "Bird's-nest chip-wrap risk not fired as an approach gate: continuous chips wrap when unbroken length > part clearance AND geometry promotes it. Weighted model R = w1*chipLen/clearance + w2*ductility + w3*(L/D)*sin(lead) + w4*noChipbreaker - w5*coolantFlush (stainless ISO M worst; HPC/through-tool reduces). Uniquely needs PART clearance + the SHOP's insert/coolant availability -> fits the print-read + available-tooling approach decision. Engine LatheBirdNestPredictorEngine.ts:5-78; cite Astakhov Metal Cutting Mechanics 1998 Ch6 + Jawahir/van Luttervelt CIRP Annals 42(2) 1993 + Sandvik Coromant Turning Handbook. Whiskey: confirm w1..w5 weights + severe threshold before firing a hazard gate.",
  "Drill-thrust-vs-tailstock axial-capacity gate not fired (SAFETY): on-centerline drilling thrust Ff = 0.5*kc1.1*(D/2)*f^(1-mc)*sin(point_angle/2) pushes the part off-center/into workholding; engine flags unsafe at thrust > 0.8*tailstock_force. Couples drilling to workholding capacity but rests on an engine-local 0.8 margin + a thrust model whose kc1.1/mc must import from constants.ts. Engine LatheScienceHardeningEngine.ts:327-348 (checkDrillThrust), wired turningDispatcher.ts:840-850 (lathe_drill_thrust). Whiskey: confirm the 0.8 margin + validate Ff vs a published drilling-thrust reference (Machinery's Handbook Ch.27 / Shaw Metal Cutting Principles) before firing a thrust gate.",
  "parting/grooving overhang stickout-ratio (SAFETY numeric): LatheCollisionZoneEngine.checkGroovingOverhang gates tool STICKOUT/blade-WIDTH at MAX_PARTING_OVERHANG_RATIO=6x / MAX_GROOVING_OVERHANG_RATIO=8x (tool-steel) -- a DIFFERENT mechanism than the lib'd parting_chip_clearance (chip-packing depth/width=3x): this is blade cantilever rigidity. Sets a numeric safety ratio -> GAP per carveout until whiskey confirms 6x/8x vs a published source (engine cites Sandvik generically, no page/table). cite=LatheCollisionZoneEngine.ts:41,43-44,472-488 (slot:zulu pass-3 2026-07-01, verify PASS)",
  "Single-point thread infeed schedule: passes use radial (straight-in), flank (modified/angular ~29-30deg), or incremental infeed to hold ~constant chip AREA per pass; pass count grows with pitch (coarser pitch => more passes, per-pass depth decreasing roughly ~1/sqrt(pass_index) for constant-area) -- distinct from the fired G71 roughing-monotonicity gotcha + the existing G76 threading-validator gap. external-source candidate: Machinery's Handbook (Screw Threads / Thread Cutting) + insert-maker threading pass tables; class=numeric-threshold (infeed schedule, pitch/material-dependent); PROVENANCE: expert-stated canonical (Hermes lane rate-limited this pass, R12); whiskey verifies the schedule vs the cited source before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Slenderness deflection limit for turning: a slender workpiece deflects under radial cutting force ~ F*L^3/(c*E*I) (c~3 chucked-unsupported cantilever, ~48 simply-supported between centers); shops flag L/D above ~3-4 (chucked, unsupported) or ~8-10 (between centers / steady-rest) for deflection + chatter -- couples the print L/D to a support-strategy decision, adjacent to the fired trilobe thin-wall clamp + the drill-thrust gap. external-source candidate: Machinery's Handbook (Machining/Deflection) + Shaw Metal Cutting Principles; class=numeric-threshold (L/D limit, support-dependent); PROVENANCE: expert-stated canonical (Hermes lane rate-limited, R12); whiskey verifies the L/D thresholds vs the cited source before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Carbide grade selection by ISO 513 workpiece application group (P/M/K/N/S/H) with per-group Vc ranges: ISO 513:2012 is the canonical hard-cutting-material classification for insert-grade selection -- NOT covered by kienzle_taylor_canonical (that governs force/tool-life CONSTANTS by ISO group, not GRADE selection) and absent from GOTCHAS+gaps; a turning insert-selection surface should key grade recommendations off the ISO 513 group. cite=ISO 513:2012 Clause 5-10; class=categorical (grade taxonomy); whiskey confirms the grade-selection consumer before firing (soul-verified whiskey-lathe wf_fab1690e-410, 2026-07-01)",
]);

/**
 * Detect the lathe operations referenced in free text (print-reading / prompt).
 * Pure, deterministic; returns a deduped subset of LATHE_OPERATIONS in taxonomy order.
 * @param {string} text
 * @returns {string[]}
 */
export function detectOperations(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const found = new Set();
  // internal variants first (explicit) so "internal thread" -> id_thread, not od_thread
  if (/\b(?:id|internal)\s*thread/i.test(text)) found.add("id_thread");
  if (/\b(?:id|internal)\s*groov/i.test(text)) found.add("id_groove");
  // strip the internal thread/groove phrases so the generic OD patterns do not re-count
  // them; a prompt with BOTH ("OD thread and internal thread") still yields both ops.
  const generic = text
    .replace(/\b(?:id|internal)\s*thread(?:ing)?\b/gi, " ")
    .replace(/\b(?:id|internal)\s*groov(?:e|ing)?\b/gi, " ");
  for (const [re, op] of OP_PATTERNS) if (re.test(generic)) found.add(op);
  return LATHE_OPERATIONS.filter((o) => found.has(o));
}

// expose the raw tables for tests + the inject hook (read-only)
export const _internals = Object.freeze({ GOTCHAS, OKUMA_OSP_DIALECT, TOOLING_REQUIREMENTS, OP_PATTERNS });
