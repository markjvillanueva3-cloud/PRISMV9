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

  // ---- kilo corpus-mined engagement gates (slot:zulu 2026-07-01, cited+spot-verified) ----
  engagement_window_validate: {
    id: "engagement_window_validate",
    rule: "Before committing an adaptive/HSM or constant-engagement strategy, VALIDATE the radial engagement angle against the published iMachining operating window (validateEngagement returns TOO_LOW/OPTIMAL/TOO_HIGH) -- do not auto-accept an out-of-window strategy; below the low bound rubs, above the high bound overloads. MIN/MAX/OPTIMAL degrees live in ENGAGEMENT_LIMITS (never inline)",
    enforcedBy: "EngagementGeometryEngine.validateEngagement -> prism_calc:engagement_validate",
    cite: "EngagementGeometryEngine.ts:29,380-385 (ENGAGEMENT_LIMITS + validateEngagement) + calcDispatcher engagement_validate (US Pat 8000834B2, Altintas 2012)",
    ops: ["adaptive_rough", "finish_3d"],
    confidence: "verified",
  },
  chip_thinning_compensation: {
    id: "chip_thinning_compensation",
    rule: "Light-radial milling (radial immersion ae/D below ~50%) MUST apply radial chip-thinning feed compensation -- run the programmed fz raw at light immersion and the edge under-loads (rubbing/heat/wear). Compute the compensated feed via the chip-thinning engine; the immersion trigger + effective-chip formula live in code, never inline (the exact formula form has a codebase divergence -- see the CAM_UNVERIFIED_GAPS reconcile note)",
    enforcedBy: "ChipThinningCompensation.ts / TrochoidalMillingEngine.chipThinning -> prism_calc:chip_thinning_compensation (NB: prism_cam:engage_chip_thinning is the SEPARATE EngagementAdaptiveFeedEngine path)",
    cite: "ChipThinningCompensation.ts:4-5,67 (h_ex + ae/D<50% trigger) + TrochoidalMillingEngine.chipThinning + calcDispatcher chip_thinning_compensation (Sandvik Milling Guide, Altintas 2012 sec3.4)",
    ops: ["adaptive_rough", "finish_3d"],
    confidence: "verified",
  },

  // ---- kilo pass-2 corpus-mined gate (slot:zulu 2026-07-01, cited+spot-verified) ----
  entry_exit_strategy_select: {
    id: "entry_exit_strategy_select",
    rule: "Do not hardcode tool entry/exit motion -- route the choice through the orchestrated entry/exit selector. It enforces two invariants a naive default breaks: (a) a HARD center-cut filter removes the axial-plunge candidate whenever the tool is non-center-cutting (plunging a non-center-cutting endmill snaps it); (b) for a FINISH phase it scores the tangential arc-on / arc-off (lead-in / lead-out) candidates highest on surface-mark, so the tool enters+leaves on a tangent arc leaving NO dwell/witness mark, vs a direct linear lead-in/retract that marks the wall. Geometric bounds (helix r <= (D-2ae)/2, arc r >= corner r) live in the engine, never inline; the winner is chosen by the decision orchestrator. This is strategy SELECTION + a safety FILTER, not a numeric engagement threshold -- the emitted ramp-angle magnitude is NOT asserted here (see the ramp-angle CAM_UNVERIFIED_GAP)",
    enforcedBy: "EntryExitStrategyAdapter.selectEntryExitOrchestrated -> camDispatcher:entryexit_select_orchestrated (base sibling EntryExitStrategyEngine.selectEntryStrategy -> l2EngineDispatcher cam_toolpath/entry_strategy)",
    cite: "EntryExitStrategyAdapter.ts:63 (requires_center_cut),132 (plunge center-cut candidate),153-193 (arc_on finish / arc_off no-dwell-mark),415-467 (selectEntryExitOrchestrated + center-cut plunge filter) + camDispatcher.ts:1316,2790-2793 + l2EngineDispatcher.ts:181",
    ops: ["finish_3d", "contour_2d", "multi_axis", "toolpath_export"],
    confidence: "verified",
  },

  // ---- kilo pass-3 corpus-mined gates (slot:zulu 2026-07-01, cited+verify-arm PASS) ----
  cam_optimization_never_trades_safety: {
    id: "cam_optimization_never_trades_safety",
    rule: "Auto-generated cycle_time / tool_life / surface_finish parameter suggestions MUST be filtered by isSafe() before being offered -- a candidate is rejected if ANY of the 5 physics predictors (chatter / deflection / thermal / tool_overload / surface_finish) would cross PRIORITY_HIGH; safety is never traded for cycle time. PRIORITY_HIGH is a named export, never inlined",
    enforcedBy: "CAMOptimizationSuggestionEngine.isSafe + PRIORITY_HIGH (CAMMachiningErrorPredictionEngine)",
    cite: "CAMOptimizationSuggestionEngine.ts:186-188,205,225,245 + CAMMachiningErrorPredictionEngine.ts:130",
    ops: ["adaptive_rough", "finish_3d", "contour_2d"],
    confidence: "verified",
  },
  cross_vendor_translate_loss_accounting: {
    id: "cross_vendor_translate_loss_accounting",
    rule: "Cross-CAM parameter/operation translation (8-vendor PARAMETER_EQUIVALENTS / OPERATION_ALIASES tables) is LOSSY-BY-CONSTRUCTION -- the translator MUST return unmapped_parameters + catalog_coverage_pct + loss_summary rather than assume 1:1 parity across CAM systems; never treat a cross-vendor translate result as complete without reading unmapped_parameters",
    enforcedBy: "CAMCrossSystemTranslatorEngine.translate",
    cite: "CAMCrossSystemTranslatorEngine.ts:270-344 (unmapped_parameters :306-318 + loss_summary :328 + stub:false,mode:production :54-55)",
    ops: ["toolpath_export", "multi_axis"],
    confidence: "verified",
  },

  // ---- corroborated-promotion gates (soul-verified kilo arm, wf_0524c0db-eaa 2026-07-02) ----
  cross_vendor_holder_clearance_revalidate: {
    id: "cross_vendor_holder_clearance_revalidate",
    rule: "After a Mastercam-to-hyperMILL (or any cross-vendor) transfer via CAMCrossSystemTranslatorEngine, strategy parameters map but holder geometry does NOT -- always re-validate holder/tool assembly clearance before toolpath commit; never assume clearance carries over",
    enforcedBy: "CAMCrossSystemTranslatorEngine.translate (parameter path) + cam/CLAUDE.md doctrine (holder-geometry re-validation)",
    cite: "cam/CLAUDE.md:123-124 + CAMCrossSystemTranslatorEngine.ts:270-344 (soul-verified kilo wf_0524c0db-eaa 2026-07-02)",
    ops: ["toolpath_export", "multi_axis"],
    confidence: "verified",
  },
  fusion_rest_stock_source_explicit: {
    id: "fusion_rest_stock_source_explicit",
    rule: "Fusion 360 rest-machining MUST select an explicit remaining-stock source (From previous operations, From bodies, or From setup stock) -- never assume a default; the rest pass must reference actual in-process stock, not raw stock",
    enforcedBy: "knowledge/wiki/cam/cam-foundations.md (Rest machining, WebFetch-verified) + cam/CLAUDE.md workflow contract",
    cite: "Autodesk Fusion CAM 'Machine remaining stock' doc (WebFetch-confirmed 2026-06-09) + knowledge/wiki/cam/cam-foundations.md:74-82 + cam/CLAUDE.md:129-131 (soul-verified kilo wf_0524c0db-eaa 2026-07-02)",
    ops: ["rest_machining"],
    camSystemCap: "fusion",
    confidence: "verified",
  },
  hypermill_blade_roughing_kb_required: {
    id: "hypermill_blade_roughing_kb_required",
    rule: "Never substitute cam_multiaxis_recommend output directly into a hyperMILL blade-roughing job -- proprietary blade tilt-angle optimization differs from generic 5-axis swarf; run cam_hypermill_strategy_kb_for_geometry first",
    enforcedBy: "camDispatcher case cam_hypermill_strategy_kb_for_geometry -> HyperMillStrategyKnowledgeEngine",
    cite: "cam/CLAUDE.md:118-121 + camDispatcher.ts:2157,14001 + HyperMillStrategyKnowledgeEngine.test.ts:377,475 (soul-verified kilo wf_0524c0db-eaa 2026-07-02)",
    ops: ["multi_axis"],
    camSystemCap: "hypermill",
    confidence: "verified",
  },
  corner_engagement_spike_route: {
    id: "corner_engagement_spike_route",
    rule: "Before finishing/roughing near an internal corner, run corner_engagement_analyze -- it flags feed_reduction_required and trochoidal_required when the spike factor crosses the named engagement thresholds (ENGAGEMENT_LIMITS, never inlined); apply the recommended feed factor or reroute to trochoidal, never ignore the flags",
    enforcedBy: "EngagementGeometryEngine.internalCornerSpike -> calcDispatcher:corner_engagement_analyze",
    cite: "US Patent 8000834B2 + Altintas Manufacturing Automation 2012 (EngagementGeometryEngine.ts:17,20) + EngagementGeometryEngine.ts:29,33-34,170-207 + calcDispatcher.ts:3097-3106 (soul-verified kilo wf_0524c0db-eaa 2026-07-02)",
    ops: ["adaptive_rough", "finish_3d", "contour_2d"],
    confidence: "verified",
  },
  stepover_engagement_derived: {
    id: "stepover_engagement_derived",
    rule: "Derive adaptive/HSM stepover from a target engagement angle via optimal_stepover, not a raw percent-of-diameter guess -- select MRR, tool-life, or default engagement mode explicitly; mode fractions and bounds live in ENGAGEMENT_LIMITS, never inline",
    enforcedBy: "EngagementGeometryEngine.findOptimalStepover -> calcDispatcher:optimal_stepover",
    cite: "US Patent 8000834B2 + Altintas Manufacturing Automation 2012 (EngagementGeometryEngine.ts:17,20) + EngagementGeometryEngine.ts:29-32,402-424 + calcDispatcher.ts:3166-3177 (soul-verified kilo wf_0524c0db-eaa 2026-07-02)",
    ops: ["adaptive_rough", "finish_3d"],
    confidence: "verified",
  },
});

// gates the mining agent could NOT bind to a quantified rule -> NOT fired.
// Surfaced for the kilo specialist to author (R12: never present these as verified).
export const CAM_UNVERIFIED_GAPS = Object.freeze([
  "rest_machining TRIGGER partially IN CODE (corrects prior 'formulas exist but trigger not in code'): RestMachiningEngine has scallop h=D/2-sqrt((D/2)^2-(ae/2)^2) (ts:389,649), cusp h=ae^2/(8R) (ts:404,650), deflection tool-swap trigger delta=F*L^3/(3EI) (ts:358,421), zone-classify (ts:290). STILL MISSING: the MIN residual scallop/cusp height that triggers a rest pass at all + confirming the deflection tool-swap limit -- kilo sets those thresholds (SAFETY: changes tool selection)",
  "5-axis singularity ANGLE threshold (cam/CLAUDE.md:115 says defer to cam_multiaxis_recommend; the numeric tilt/lean limit was not located)",
  "chip-thinning formula divergence (kilo reconcile): three implementations disagree on the exact effective-chip form -- ChipThinningCompensation.ts:5 + TrochoidalMillingEngine.chipThinning use the exact 2*fz*sqrt(ae/D*(1-ae/D)) (== fz*sqrt(1-(1-2*ae/D)^2)); ChipThinningCompensationEngine.ts uses the cruder fz*sqrt(ae/D) approximation (only accurate at small ae/D). The fired chip_thinning_compensation gate asserts the PRINCIPLE only; kilo must pick the canonical form + which engine/dispatcher the wizard trusts before any exact-value promise (scrutiny arm A P1, 2026-07-01)",
  "ramp-angle limit sets a CUTTING-ENGAGEMENT threshold (do NOT auto-fire): RampingEngine.linearRamp/helicalRamp derives the ramp angle from defaultMaxAngle(z) (flute-count dependent) then hard-caps at 10 deg (rampAngle = Math.min(maxAngle,10), ts:114-118) and cuts feed during ramp via feedReduction = 0.5 + (1 - rampAngle/15)*0.2 (ts:131), maxDepthPerPass = D*0.5 (ts:137). The ramp angle IS the axial-engagement-rate of the entry (center-cutting); an over-steep ramp overloads the tool center. Dispatcher-wired (calcDispatcher.ts:6666-6669 + cncOpsDispatcher.ts:62). kilo confirms the defaultMaxAngle(z) table + the 10-deg/15-feed-reduction inline constants (not imported from physics/constants) before promoting to a fired gate (SAFETY: sets the axial engagement rate of the cut); refs Sandvik C-2920:28, Machinery's Handbook Ch.24. Companion to the fired entry_exit_strategy_select gate (which selects the strategy but does NOT assert the ramp magnitude)",
  "rest-machining INLINED kc/E constants (SAFETY drift): RestMachiningEngine.ts:142,145 defines KC_STEEL=2500 + E_CARBIDE=600e9 as module constants used in toolDeflection() instead of importing from constants.ts; canonical P-group kc1_1 is 1800 (constants.ts:41), so KC_STEEL=2500 is a live numeric DRIFT from canonical, not just style -- feeds the tool-swap deflection decision (RestMachiningEngine.ts:364). kilo decides import CANONICAL_KIENZLE/material E or confirm a deliberate rest-machining override. Usage sites :435,438 not re-opened this session (drift claim from :142,145 vs constants.ts:41 is verified). cite=RestMachiningEngine.ts:142,145 + constants.ts:41 (slot:zulu pass-3 2026-07-01, verify PASS)",
  "5-axis lead/lag + tilt is useless unless the POST + machine KINEMATICS + TCP/RTCP are synchronized: a lead/tilt strategy whose post does not emit the matching TCP mode (or whose kinematic model disagrees) produces gouges that PASS CAM simulation but crash/gouge on the real machine -- the simulator uses the ideal tool axis, the machine uses the post-resolved one. DISTINCT from the existing 5-axis-singularity ANGLE gap above (that is the tilt/lean magnitude; this is the post<->kinematics<->TCP CHAIN consistency). Candidate to strengthen multiaxis_defer_recommend (external-source: HERMES-EXTERNAL-KNOWLEDGE-INGESTION-ROADMAP-2026-06-29 sec CAM; Smid CNC Programming Handbook 3e Ch11 + OPEN MIND multi-axis notes) -- verify whether the post/TCP-sync check belongs in the CAM wizard vs echo's 5-axis TCP emit gate before firing (slot:zulu phase-2 2026-07-01)",
  "Jerk-limited corner deceleration: at a direction change the feed must drop to satisfy the machine's max jerk J_max via an S-curve accel profile -- a MACHINE-DYNAMICS feed limit distinct from the existing internal-corner engagement-spike gap (which reduces feed for CUTTING engagement, not for kinematic jerk). external-source candidate: Altintas Manufacturing Automation 2e Ch9; class=numeric-threshold (jerk-limited corner feed); kilo confirms whether the CAM wizard owns the jerk cap vs the post/control before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Chord-tolerance curve linearization: the max linear-segment length for a chord error delta on a radius-R curve is Ds <= sqrt(8*R*delta); exceeding it facets the surface / violates tolerance -- PRISM has no chord-tolerance stepover rule. external-source candidate: Zeid Mastering CAD/CAM Ch7 + ISO 14649-1; class=numeric-threshold (chord error, tolerance-dependent); kilo confirms the linearization consumer before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Servo-bandwidth feed cap: the achievable feed on fine geometry is bounded by the drive's servo bandwidth + velocity-loop gain (too-high commanded feed on small features -> following error / corner rounding) -- FORMULA-FORM UNVERIFIED: the roadmap draft gave F_max <= (2pi*f_servo*Kv)^-1 which is dimensionally suspect; a real machine-dynamics limit but kilo MUST confirm the correct closed form vs the source before any use. external-source candidate: Altintas Manufacturing Automation 2e Ch2; class=numeric-threshold (servo-bandwidth feed limit, machine-dependent); kilo verifies the formula before firing (slot:zulu phase-2-2B 2026-07-01)",
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
