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

  // ---- mike corpus-mined gates (slot:zulu 2026-07-01, cited+spot-verified) ----
  gap_voltage_open_vs_working: {
    id: "gap_voltage_open_vs_working",
    rule: "Servo the WORKING gap voltage (V_gap = V_arc + k_gap*(g - g_min)) toward the stable-gap target, never toward open-circuit voltage; open-circuit probability P_open = exp(-g/lambda). g < g_min shorts, g > g_max extinguishes the arc; thick sections need higher servo voltage (longer dielectric path). Bands live in EDM_PHYSICS.gap_voltage -- never inline",
    enforcedBy: "WEDMGapVoltageControlEngine",
    cite: "WEDMGapVoltageControlEngine.ts:11-18,150 + constants.ts EDM_PHYSICS.gap_voltage (open_circuit/arc_voltage/stable_gap/min_gap_um/max_gap_um) -- DiBitonto&Eubank 1989, Rajurkar 1991",
    ops: ["rough_cut", "skim_pass", "thick_section"],
    confidence: "verified",
  },
  offset_cascade_monotone: {
    id: "offset_cascade_monotone",
    rule: "Wire-offset must strictly DECREASE rough->final skim: H[n+1] < H[n] every pass, with a minimum inter-pass step (WEDM_MULTI_PASS.min_offset_step_mm); an offset that equals/exceeds the prior pass re-cuts or leaves stock -- neural analyzer anti-pattern AP003. Per-pass offsets + step live in WEDM_MULTI_PASS; never inline",
    enforcedBy: "WEDMProgramNeuralAnalysisEngine (AP003) + WEDMMultiPassStrategyEngine",
    cite: "WEDMProgramNeuralAnalysisEngine.ts:131 (offset_increase),363-407 (offset_must_decrease),578 (AP003) + wedm-constants.ts:706 (WEDM_MULTI_PASS)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "thick_section"],
    confidence: "verified",
  },
  slug_tab_retention_factor: {
    id: "slug_tab_retention_factor",
    rule: "Closed-contour slugs drop on cut completion: tab retention F_retain = tau_allow*A_tab (A_tab = n*w_tab*t, tau_allow = sigma_y/sqrt(3) Von Mises) must exceed dynamic demand F_demand = W*k_dyn (W = rho*A*t*g); SF = F_retain/F_demand must clear the gate. Heavy slugs -> more/wider tabs or adhesive + glue-stop (M01) before close. Density from MATERIAL_DB; k_dyn from engine constants -- never inline",
    enforcedBy: "WEDMSlugTabRetentionEngine + WEDMTabStrategyEngine",
    cite: "WEDMSlugTabRetentionEngine.ts:15-18,28,39 (Von Mises 1/sqrt3; Sommer Non-Traditional Machining Handbook Ch4.3) + wedm-knowledge-tips.ts (wedm-jmd-004 glue-stop M01)",
    ops: ["rough_cut", "thick_section"],
    confidence: "verified",
  },
  jm_double_m78_tank_fill: {
    id: "jm_double_m78_tank_fill",
    rule: "On JM's Mitsubishi FA-10S emit tank-fill M78 TWICE (M78 M78) before every cut restart -- a single M78 starts the pump but the FA-10S needs the second to hold fill during AWT re-thread; a single M78 causes intermittent 'insufficient fluid' AWT alarms (jmd-002)",
    enforcedBy: "WEDMPostMitsubishiEngine (tribal wedm-jmd-002)",
    cite: "wedm-knowledge-tips.ts:417-418 (wedm-jmd-002)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "wire_break_recovery", "start_hole_setup"],
    controllerCap: "mitsubishi",
    confidence: "verified",
  },
  adaptive_control_rough_only: {
    id: "adaptive_control_rough_only",
    rule: "On Mitsubishi FA-10S/20S keep adaptive servo control M90 ON for the rough cut but switch to M91 (AC OFF) for the FINAL finish skim -- low-power finish discharge reads as a near-short to the AC algo -> servo hunting -> Ra degradation + dimensional scatter (jmd-003, jm-die-014)",
    enforcedBy: "WEDMPostMitsubishiEngine (tribal wedm-jmd-003)",
    cite: "wedm-knowledge-tips.ts:432-433 (wedm-jmd-003) + :884 (jm-die M90/M91)",
    ops: ["rough_cut", "skim_pass", "thermal_release"],
    controllerCap: "mitsubishi",
    confidence: "verified",
  },

  // ---- mike pass-2 corpus-mined gates (slot:zulu 2026-07-01, cited+spot-verified) ----
  taper_error_budget_it_class: {
    id: "taper_error_budget_it_class",
    rule: "For programmed taper theta on part height h (UV=h*tan(theta)), achievable mid-plane wall-straightness is an RSS budget eps_total=sqrt(eps_guide^2+eps_uv^2+eps_bow^2+eps_cal^2); the achievable ISO 286-1 IT class (IT6..IT12/out_of_spec) is the first band containing eps_total, and the requested angle must not exceed the guide-style max programmable taper (extended/H-head guides raise it). Predict the IT class + guide-limit BEFORE cutting; bands live in WEDM_TAPER_SPEC -- never inline",
    enforcedBy: "WEDMTaperErrorBudgetEngine",
    cite: "WEDMTaperErrorBudgetEngine.ts:37 (imports WEDM_TAPER_SPEC),103-205 (calculate),176,246-247 (classifyIT+it_tolerance_um) + wedm-constants.ts:170-189 (WEDM_TAPER_SPEC) -- Mitsubishi MV Programming Manual sec.5, ISO 286-1:2010",
    ops: ["taper_cut", "thick_section"],
    confidence: "verified",
  },
  thin_wire_parameter_derate: {
    id: "thin_wire_parameter_derate",
    rule: "Wire below the reference diameter (EDM_PHYSICS.thin_wire_derate.reference_diameter_mm) has lower thermal mass (~d^2) vs heat input (I^2*t): DERATE current I'=I*(d/d_ref)^current_exp and on-time t_on'=t_on*(d/d_ref)^ton_exp (then floor at engine minimums), with a wire-material thermal-capacity adjustment (moly/tungsten/coated derate less) and a tabulated speed_factor. DOWNWARD-only advisory (never raises a limit); the hard current-density BLOCK stays with WEDMCurrentDensityGuardEngine. Exponents/reference/speed-factors live in EDM_PHYSICS.thin_wire_derate -- never inline",
    enforcedBy: "WEDMThinWireDerateEngine",
    cite: "WEDMThinWireDerateEngine.ts:5,19,42-54 (derate fields) + constants.ts:506-522 (EDM_PHYSICS.thin_wire_derate: reference_diameter_mm/current_exponent/ton_exponent/speed_factor; src GF Machining Solutions thin wire guide)",
    ops: ["rough_cut", "skim_pass"],
    confidence: "verified",
  },
  start_hole_positioning_geometry: {
    id: "start_hole_positioning_geometry",
    rule: "Place the threading/start hole a small standoff OFF the contour (never on it, never inside a tight radius), joined by a straight lead-in: the pilot bore clears the wire by only a fraction of a mm, so an on-contour or in-radius start leaves no room for the wire GUIDE to find the hole at the entry angle -> AWT re-thread FAILS after a break. Require pilot radial clearance c=(d_hole-d_wire)/2 above the engine minimum, and avoid starting at a sharp corner (stress concentration). Standoff + clearance floor are tribal/engine-config -- never inline",
    enforcedBy: "tribal (wedm-kb-024) + WEDMWireThreadingMinEngine.validatePilotHole + WEDMStartPointOptimizationEngine",
    cite: "wedm-knowledge-tips.ts:309-320 (wedm-kb-024 start-hole standoff, src mitsubishi_fa_app_notes conf 90) + WEDMWireThreadingMinEngine.ts:114-132 (validatePilotHole radial-clearance) + WEDMStartPointOptimizationEngine.ts:135-143,167-172 (sharp-corner start penalty + pilot preference)",
    ops: ["start_hole_setup"],
    confidence: "verified",
  },

  // ---- mike pass-3 corpus-mined gates (slot:zulu 2026-07-01, cited+verify-arm PASS) ----
  kerf_overcut_powerlaw_offset: {
    id: "kerf_overcut_powerlaw_offset",
    rule: "Wire-offset compensation uses overcut = C*Ip^a*ton^b (empirical power-law in peak current + pulse-on-time), floored at a minimum overcut regardless of how low power is set; kerf = wire_diameter + 2*overcut. A flat/linear overcut assumption under-compensates at high Ip and over-compensates at low Ip. C/a/b/floor live in EDM_PHYSICS.kerf_overcut -- never inline",
    enforcedBy: "WEDMKerfWidthEngine",
    cite: "WEDMKerfWidthEngine.ts:11-13,20,79-84 (imports EDM_PHYSICS.kerf_overcut) + constants.ts:491-497 (Klocke EDM in Mold Making 2017 / Rajurkar&Wang 1991)",
    ops: ["rough_cut", "skim_pass", "taper_cut"],
    confidence: "verified",
  },
  wire_life_weibull_wearout: {
    id: "wire_life_weibull_wearout",
    rule: "Wire failure-time is 2-parameter Weibull(beta,eta): F(t)=1-exp(-(t/eta)^beta), hazard h(t)=(beta/eta)*(t/eta)^(beta-1); EDM wire is wear-out-dominated (beta>1, increasing hazard) NOT random (beta=1). Classify the fitted beta before trusting an MTTF, and report MTTF=eta*Gamma(1+1/beta) WITH its 95% CI, never a bare mean. Fit by MLE handling right-censored in-service wire",
    enforcedBy: "WEDMWeibullWireLifeEngine",
    cite: "WEDMWeibullWireLifeEngine.ts:5-33 (Weibull CDF/PDF/hazard, MTTF=eta*Gamma(1+1/beta), Fisher-info delta-method CI) -- Weibull 1951, Meeker&Escobar 1998, IEC 61649:2008",
    ops: ["rough_cut", "skim_pass", "thick_section", "wire_break_recovery"],
    confidence: "verified",
  },
  wire_combined_stress_fatigue: {
    id: "wire_combined_stress_fatigue",
    rule: "Wire combined stress sigma_eq = sqrt(sigma_t^2 + sigma_th^2) (mechanical tensile sigma_t=F_tension/A plus thermal sigma_th=E*alpha*deltaT); fatigue life follows Basquin N_f=(sigma_f'/sigma_a)^(1/b) with cumulative Miner damage D=sum(n_i/N_fi) -- damage is ADDITIVE across duty cycles, so life prediction must accumulate D across the whole program, not evaluate peak stress alone. sigma_f'/b/E/alpha live in WIRE_MECHANICAL_PROPERTIES -- never inline",
    enforcedBy: "WEDMWireStressAnalysisEngine",
    cite: "WEDMWireStressAnalysisEngine.ts:7-16,41-52 (sigma_eq/Basquin/Miner + WIRE_MECHANICAL_PROPERTIES) -- Basquin 1910, Rajurkar&Wang 1993, Kunieda 2005",
    ops: ["rough_cut", "skim_pass", "thick_section", "wire_break_recovery"],
    confidence: "verified",
  },
  corner_min_radius_wire_geometry: {
    id: "corner_min_radius_wire_geometry",
    rule: "Minimum achievable inside-corner radius is a HARD geometric floor: r_min = wire_diameter/2 + spark_gap (wire radius plus the discharge gap traced) -- a programmed corner radius below this is not a parameter-tuning problem, it is geometrically uncuttable at that wire/gap and must be flagged BEFORE emit, not discovered by a runtime alarm. Wire lag at direction changes further reduces effective sharpness via EDM_PHYSICS.wire_corner.lag_coefficient -- never inline",
    enforcedBy: "WEDMCornerPhysicsEngine.calculateMinCornerRadius",
    cite: "WEDMCornerPhysicsEngine.ts:64-90,87-90 (wireDiameter/2 + sparkGap) + constants.ts:454-462 (wire_corner.lag_coefficient/inside_overcut_factor; Ho&Newman 2003)",
    ops: ["corner_engagement"],
    confidence: "verified",
  },

  // ---- corroborated-promotion gate (soul-verified mike arm, wf_0524c0db-eaa 2026-07-02) ----
  current_density_thermal_runaway: {
    id: "current_density_thermal_runaway",
    rule: "Hold discharge current density J = I/(pi*(d/2)^2) at or below the wire material's canonical max current-density limit minus a production safety margin; exceeding it drives thermal runaway and wire break -- BLOCK the discharge, never warn-only. Limits and margin live in EDM_PHYSICS.wire_safety -- never inline",
    enforcedBy: "WEDMCurrentDensityGuardEngine.validate (hard block_reason, not warn-only)",
    cite: "WEDMCurrentDensityGuardEngine.ts:17-18,79,84,90-92,236,257-262 + constants.ts:398-403,422 (EDM_PHYSICS.wire_safety; Bedra wire catalog + Thermocompact guide + Mitsubishi MV/MX manual) (soul-verified mike wf_0524c0db-eaa 2026-07-02)",
    ops: ["rough_cut", "skim_pass", "taper_cut", "thick_section", "corner_engagement"],
    confidence: "verified",
  },
});

// gates flagged by the mining agent as NOT verified against a cited rule -> NOT fired.
// Surfaced for the mike specialist to author (R12: never present these as verified).
export const WEDM_UNVERIFIED_GAPS = Object.freeze([
  "taper wire-deflection ALGORITHM now LOCATED + gated (pass-2 taper_error_budget_it_class fires WEDMTaperErrorBudgetEngine RSS IT-class budget); RESIDUAL = live FA-10S UV-telemetry validation of predicted vs actual taper wall-straightness before trusting the IT-class on the shop floor (WEDMTaperErrorBudgetEngine.ts + FA-10S UV encoder feed)",
  "no-core cut SEQUENCING (skims must return to rough entry/exit; out-of-sequence leaves micro-tabs -- WEDMNoCoreCutSequencerEngine not found by glob)",
  "power-density threshold NOT canonical: WEDMPowerDensityGuardEngine imports EDM_PHYSICS but its enforced limits (max_power_density_roughing/finishing, default_overcut_mm) are DEFAULT_CONFIG module-local literals, never read from EDM_PHYSICS -- a numeric safety threshold defined outside the canonical constants file (constants-discipline gap); mike confirms whether to migrate into EDM_PHYSICS or the engine config is intentionally shop-tunable. cite=WEDMPowerDensityGuardEngine.ts:18,83-89 (slot:zulu pass-3 2026-07-01, verify PASS)",
  "dielectric gap-correction model UNVERIFIED-source: WEDMDielectricCorrectionEngine states Gap=k*(Ip*ton)^0.5*dielectric_factor with a DI-water-vs-oil 10-15% delta, citing Kunieda 2005 in the header but with no page/section pin -- mike confirms the sqrt(Ip*ton) form + the 10-15% delta are the actual cited values (not a paraphrase) + whether the dielectric gap_factor/conductivity thresholds belong in EDM_PHYSICS. cite=WEDMDielectricCorrectionEngine.ts:12-18 (slot:zulu pass-3 2026-07-01)",
  "Crater volume per single discharge scales as V_c ~ (I_p*t_on)^1.5 (DiBitonto/Eubank cathode-erosion model) -- a quantitative single-spark material-removal law underlying MRR, distinct from the qualitative discharge gotchas + the kerf/overcut geometry gate. external-source candidate: DiBitonto & Eubank Ann.CIRP 1989 + Guitrau EDM Handbook Ch4; class=numeric-threshold (energy law, param-dependent); mike confirms the exponent + coefficient vs the cited paper before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Recast (white-layer) thickness scales roughly delta_r ~ 0.8*(I_p*t_on)^0.5 um for steel (Benedict energy-partition) -- a metallurgical-damage metric distinct from the skim-count Ra plateau (surface topography only); higher energy => thicker recast + micro-cracks a finish skim must remove. external-source candidate: Benedict Nontraditional Manufacturing sec7.3 + Guitrau Ch6; class=numeric-threshold (recast thickness, material/energy-dependent); mike confirms the coefficient/exponent + the acceptance limit before firing (slot:zulu phase-2-2B 2026-07-01)",
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
