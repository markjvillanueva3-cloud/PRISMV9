// scripts/lib/speed-feed-approach-knowledge.mjs
//
// SPEED-FEED (SFC) auto-firing "approach knowledge" -- slot:zulu 2026-07-01 (for oscar).
//
// The seventh clone of the proven task auto-firing pattern (cad / lathe / mill / post /
// wedm / cam siblings in scripts/lib/*-approach-knowledge.mjs). When the Speed-Feed
// Calculator decides HOW to compute/compare/optimize a cutting recommendation, this
// surfaces the SPECIFIC verified law/gate(s) for the sfc operation(s) named.
//
// SOURCING (R12 -- no fabrication): every gate was mined by the oscar-speed-feed
// domain-soul agent from the real SFC engine code + constants + tests, then
// INDEPENDENTLY re-verified (waved-mining verify arm PASS, 2026-07-01) against the
// cited file:line. Kienzle/Taylor NUMBERS are NEVER inlined -- the gate NAMES the law +
// the enforcing engine + points at src/physics/constants.ts (canonical single source).
// A greenfield domain (no prior speed-feed-approach lib); op->gate map, no machine axis.
//
// Karpathy 5-step: CLASSIFY pure data+select lib; TECHNIQUE frozen maps + set
// membership; EDGE null/empty/non-array ctx; FAILURE never throws; WRITE from line 1.
// ASCII-only (ascii-guard). No em-dashes.

// ---- operation taxonomy (the SFC operations the calculator encounters) ----
export const SPEED_FEED_OPERATIONS = Object.freeze([
  "sfc_calculate",     // single speed/feed recommendation
  "sfc_compare",       // PRISM-vs-vendor / mode comparison
  "sfc_optimize",      // cost/tool-life optimization
  "sfc_nine_axis_run", // the 9-axis orchestrator (strategy-aware)
]);

// ---- the verified gate map (each gate cites its mined+verify-arm-PASS source) ----
const GATES = Object.freeze({
  kienzle_force_law: {
    id: "kienzle_force_law",
    rule: "Cutting force Fc = kc1.1 * ap * fz^(1-mc), with kc1.1/mc keyed by ISO group P/M/K/N/S/H -- the material coefficients come EXCLUSIVELY from the canonical CANONICAL_KIENZLE map, never inline elsewhere",
    enforcedBy: "src/physics/constants.ts CANONICAL_KIENZLE (consumed by the SFC force path)",
    cite: "mcp-server/src/physics/constants.ts:30-47",
    ops: ["sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_nine_axis_run"],
    confidence: "verified",
  },
  taylor_tool_life_law: {
    id: "taylor_tool_life_law",
    rule: "Tool life T = (C/Vc)^(1/n) with C/n keyed by ISO group from the single canonical CANONICAL_TAYLOR map -- never inline the Taylor constants",
    enforcedBy: "src/physics/constants.ts CANONICAL_TAYLOR",
    cite: "mcp-server/src/physics/constants.ts:53-70",
    ops: ["sfc_calculate", "sfc_optimize", "sfc_compare"],
    confidence: "verified",
  },
  rpm_from_vc_diameter: {
    id: "rpm_from_vc_diameter",
    rule: "Every SFC path deriving RPM from cutting speed MUST use the closed form n(rpm) = (1000*Vc)/(pi*D), not an approximation",
    enforcedBy: "ProductEngine.clampVcToMachineRpm (mirrored in LatheSpeedFeedCalculatorFacadeEngine.calculateRPM)",
    cite: "mcp-server/src/engines/ProductEngine.ts:888-893 (mirror LatheSpeedFeedCalculatorFacadeEngine.ts:454-463)",
    ops: ["sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_nine_axis_run"],
    confidence: "verified",
  },
  mrr_scales_with_radial_engagement: {
    id: "mrr_scales_with_radial_engagement",
    rule: "MRR = ap*ae*Vf must scale with ACTUAL radial engagement (ae/D): the nine-axis orchestrator MUST read the SFC engine's resolved sfc.radial_depth.value, never re-derive ae from a static balanced-mode lookup (that made MRR invariant to a 5%-100% ae sweep -- a proven regression)",
    enforcedBy: "SpeedFeedNineAxisOrchestratorEngine.buildModeRecommendation (prism_optimized branch)",
    cite: "mcp-server/src/__tests__/sfc-nine-axis-radial-engagement.test.ts:1-25 (U-OSC-RADIAL-ENGAGEMENT regression)",
    ops: ["sfc_nine_axis_run"],
    confidence: "verified",
  },
  tool_rated_clamp_derate_only: {
    id: "tool_rated_clamp_derate_only",
    rule: "Vc/RPM/ap recommendation is clamped to the TIGHTER of machine-rated and tool-rated ceilings (chained clampVcToMachineRpm(machine) then (tool), then ap := min(ap, tool_max_doc)); DERATE-ONLY (can only lower published values) and applied IDENTICALLY across sfc_calculate/sfc_compare/sfc_optimize (parity, not a single-endpoint patch)",
    enforcedBy: "ProductEngine.clampVcToMachineRpm + tool_max_doc clamp (mirrored at 3 call sites for parity)",
    cite: "mcp-server/src/engines/ProductEngine.ts:888-893,1009-1010,1207-1209,1234-1235,1315-1317,1338-1339 (commit 7d7d19a027)",
    ops: ["sfc_calculate", "sfc_compare", "sfc_optimize"],
    confidence: "verified",
  },
  material_alias_normalize_before_iso: {
    id: "material_alias_normalize_before_iso",
    rule: "Material-name resolution MUST normalize BOTH underscore and space separators before ISO-group lookup, and groupToISO MUST accept a bare ISO letter (P/M/K/N/S/H) directly -- skipping either silently collapses distinct groups to the P(steel) default, producing a wrong-but-plausible Vc (proven +50% over-speed on 'stainless_steel' defaulting to P)",
    enforcedBy: "ProductEngine.resolveMaterial + groupToISO",
    cite: "mcp-server/src/engines/ProductEngine.ts:606-609,696 (commit 3acb650933, 19/19 tests)",
    ops: ["sfc_calculate", "sfc_compare", "sfc_optimize"],
    confidence: "verified",
  },
  round_at_display_not_in_calc: {
    id: "round_at_display_not_in_calc",
    rule: "Math.round/Math.floor belongs at the DISPLAY/terminal-output boundary, never applied to an intermediate physics quantity a downstream step will consume as a fraction -- rounding mid-calculation silently truncates fz/vc precision and compounds error. Treat any NEW intermediate-value rounding as the violation, not terminal output formatting",
    enforcedBy: "speed-feed galaxy doctrine (AutoSpeedFeed regression class 1b87f98f2)",
    cite: "mcp-server/src/engines/AutoSpeedFeedEngine.ts:332-333,345-346,358,362 (terminal fields; see the intermediate-rounding gap)",
    ops: ["sfc_calculate", "sfc_optimize", "sfc_nine_axis_run"],
    confidence: "verified",
  },
  outcome_bus_capture_must_report_real_result: {
    id: "outcome_bus_capture_must_report_real_result",
    rule: "An outcome/telemetry capture bridge must return the REAL success flag from the underlying bus call, never a hardwired true -- a fabricated 100% capture-rate metric is an R12 violation",
    enforcedBy: "SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture (returns emission.ok)",
    cite: "mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts:191-220 (fixed 2026-06-22, U-SFC-OUTCOME-BUS-REAL)",
    ops: ["sfc_nine_axis_run"],
    confidence: "verified",
  },
  chip_thinning_strategy_factor: {
    id: "chip_thinning_strategy_factor",
    rule: "Toolpath engagement strategy scales the effective chip-thinning factor (1.0 conventional down to 0.50 trochoidal); the factor is strategy-keyed, not a free-form multiplier, and must trace to the cited vendor source",
    enforcedBy: "SpeedFeedNineAxisOrchestratorEngine strategy-factor table",
    cite: "mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts:190,245,419,424 (HSMWorks adaptive clearing whitepaper, Sandvik trochoidal guide)",
    ops: ["sfc_nine_axis_run", "sfc_calculate"],
    confidence: "verified",
  },
  spindle_power_knee_curve: {
    id: "spindle_power_knee_curve",
    rule: "Available spindle power below the knee RPM scales LINEARLY with RPM (constant-torque region); above the knee it is constant power -- an MRR/power check must use this piecewise model, not a single flat power ceiling",
    enforcedBy: "SpindlePowerCheckEngine.powerCheck",
    cite: "mcp-server/src/engines/SpindlePowerCheckEngine.ts:105-122",
    ops: ["sfc_calculate", "sfc_nine_axis_run"],
    confidence: "verified",
  },

  // ---- corroborated-promotion gates (soul-verified oscar arm, wf_0524c0db-eaa 2026-07-02) ----
  merchant_shear_angle_force_decomposition: {
    id: "merchant_shear_angle_force_decomposition",
    rule: "Merchant's circle: shear angle phi = pi/4 + alpha/2 - beta/2 (alpha=rake, beta=friction angle=atan(mu)) drives force decomposition (Fc, Ft, chip ratio) as a first-principles cross-check alongside Kienzle Fc -- use MerchantShearForceModel via the SFC engine (surfaced as shear_angle_deg), never re-derive inline",
    enforcedBy: "UltimateSpeedFeedEngine.merchantShearAngle/merchantForce (delegates to MerchantShearForceModel)",
    cite: "Merchant M.E. (1945) orthogonal-cutting relation + MerchantShearForceModel.ts:67-105 + UltimateSpeedFeedEngine.ts:1300-1309,2898-2902,3395 (soul-verified oscar wf_0524c0db-eaa 2026-07-02)",
    ops: ["sfc_calculate"],
    confidence: "verified",
  },
  gilbert_economic_optimum_velocity: {
    id: "gilbert_economic_optimum_velocity",
    rule: "Gilbert (1950) minimum-cost velocity Vc_opt = K_T*[n/(1-n)*M/(M*t_ct+C_tool)]^n differs from pure Taylor tool-life-max Vc; K_T/n = Taylor constants, M = cost rate, t_ct = tool-change time, C_tool = edge cost. Do not conflate with Vc_min_time (which excludes tool cost)",
    enforcedBy: "GilbertEconomicSpeedEngine.compute (Vc_min_cost)",
    cite: "Gilbert W.W. 'Economics of Machining' (1950) ASME + speed-feed/CLAUDE.md:61 (confirmed galaxy asset) + GilbertEconomicSpeedEngine.ts:96-115 (soul-verified oscar wf_0524c0db-eaa 2026-07-02; the staged ^(1/n) exponent form did NOT survive verification -- this is the engine's verified reciprocal-bracket form)",
    ops: ["sfc_optimize"],
    confidence: "verified",
  },
});

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of SPEED_FEED_OPERATIONS) m[op] = [];
  for (const g of Object.values(GATES)) {
    for (const op of g.ops) if (m[op]) m[op].push(g.id);
  }
  return Object.freeze(m);
})();

// ---- helpers ----
function isStr(s) { return typeof s === "string" && s.length > 0; }

// ---- the firing entry point ----
// ctx: { operations: string[] }
// Returns { operations:[{operation, gates:[...]}], summary }.
// Defensive: never throws on null/non-object/garbage ctx (lathe-sibling lesson).
export function fireForApproach(ctx) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const rawOps = Array.isArray(c.operations) ? c.operations : [];
  const ops = [];
  for (const op of rawOps) {
    if (!isStr(op) || !OPS_TO_GATES[op]) continue;
    const gates = OPS_TO_GATES[op]
      .map((id) => GATES[id])
      .map((g) => ({ id: g.id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite }));
    ops.push({ operation: op, gates });
  }
  const summary = `${ops.length} SFC operation(s)`;
  return { operations: ops, summary };
}

// UNVERIFIED gaps -- the speed-feed verify-backlog: real, CITED items the oscar specialist
// must confirm before any becomes a fired gate. NOT fired; surfaced by the autofire coverage
// worklist. Safety rail: nothing here drives a gate until the specialist verifies vs source.
export const SPEED_FEED_UNVERIFIED_GAPS = Object.freeze([
  "SLD chatter fallback formula needs specialist confirm (SAFETY-adjacent): SpeedFeedChatterStabilityAdapterEngine.fallbackSLD implements ap_abs_lim_mm = (4*pi*zeta*k*1000)/(N*kc*1e6) with peak ap = 2x, cited 'Altintas eq 6.41-6.46', but the engine header says the canonical ChatterStabilityLobeEngine is preferred and this is best-effort; a physics reviewer must confirm the eq-6.46 peak~=2x approximation + the 1000/1e6 unit factors before it fires (stability THRESHOLD). cite=SpeedFeedChatterStabilityAdapterEngine.ts:242-269 (verify PASS)",
  "vendor-parity variance envelope is a NUMERIC threshold: VARIANCE_ENVELOPE_PCT=15 (Vc/fz) with MRR at 2x (30%) gates PASS/FAIL in the PRISM-vs-vendor comparator; per the safety carveout it must be specialist-confirmed (is 15%/30% right, or material/operation-dependent) before deviation-flagging is settled doctrine. cite=SpeedFeedBaselineComparatorEngine.ts:358,513-515,535 (verify PASS)",
  "SFC math-accuracy audit worst-case error bounds: scripts/sfc-accuracy-audit.mjs measured feed 2.69% / vc 0.51% worst-case over an 11.2M-row corpus per TOOLBELT.md -- a live-measured accuracy BOUND, not a law; needs periodic re-validation as engines change, and the PASS threshold is a numeric policy call. cite=mcp-server/src/engines/speed-feed/TOOLBELT.md:24 (unread source script, R12)",
  "AutoSpeedFeed intermediate-rounding audit incomplete: AutoSpeedFeedEngine rounds rpm/feed at :332-333/345-346, then :356-362 recomputes toolOptimal.feed = Math.round(fz*flutes*rounded_rpm) reusing the already-rounded rpm -- reintroduces compounding truncation into a re-consumed value; specialist confirms whether this is the 1b87f98f2 regression class or acceptable terminal rounding. cite=AutoSpeedFeedEngine.ts:332-333,356-362 (verify PASS)",
  "feed-units mill IPM vs lathe IPR is TRUE categorical doctrine (mill feed=in/min, lathe feed=in/rev; conflating is a scale error not rounding) BUT the miner's cite speed-feed/CLAUDE.md:104-106 is WRONG (that is the safety-gates section, NOT feed-units doctrine -- verify arm flagged the mismatch). DEMOTED to gap 2026-07-01: oscar re-locates the actual IPM/IPR doctrine line before this fires as a gate (the fact is separately live in whiskey lathe context feed_ipr_not_ipm). cite=needs-relocation (was speed-feed/CLAUDE.md:104-106, wrong)",
  "Built-up-edge (BUE) disappearance speed regime: for carbon steels BUE largely vanishes above Vc ~1 m/s (~300 ft/min); below that regime BUE alters effective rake + the specific-force coefficient and degrades finish -- a speed/feed calculator should flag the low-Vc BUE regime. external-source candidate: Shaw Metal Cutting Principles 2e Ch4; class=numeric-threshold (critical Vc, material-dependent); oscar confirms the per-material Vc cut-in vs the source before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Regenerative-chatter absolute stability limit a_lim = -1/(2*Ks*Re[Lambda(omega_c)]) (Ks=specific cutting force, Lambda=oriented FRF at chatter frequency) sets the max stable axial depth for a given spindle speed -- distinct from the existing SLD-damping-ratio gap (that is the zeta INPUT; this is the depth-LIMIT closed form). external-source candidate: Altintas Manufacturing Automation 2e Ch5; class=numeric-threshold (critical depth); oscar/physics-reviewer confirms the FRF form vs ChatterStabilityLobeEngine before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Primary shear-zone shear strain gamma = cot(phi) + tan(phi - alpha) feeds material flow-stress -> force + cutting-temperature prediction; a net-new orthogonal-cutting invariant not in the speed-feed gates. external-source candidate: Stephenson & Agapiou Metal Cutting Theory & Practice 1e Ch2; class=categorical (shear-strain identity); oscar confirms the flow-stress consumer before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Theoretical surface roughness from feed + nose radius for single-point finishing: Rmax(peak-to-valley) ~= f^2/(8*r_eps), with Ra ~= f^2/(31.2*r_eps) as the derived average -- a real, currently-absent finish-pass feed constraint; CITE CORRECTION (soul-caught): the staged ISO 4287/ASME B46.1 cites are surface-texture MEASUREMENT/definition standards, NOT the source of this kinematic formula -- the correct authority is classical machining theory (Boothroyd & Knight Fundamentals of Machining / Shaw Metal Cutting Principles). oscar/physics-reviewer pins the textbook cite + confirms units (f, r_eps same length units) + the Rmax-vs-Ra distinction before this fires (soul-verified oscar-speed-feed wf_fab1690e-410, 2026-07-01)",
]);

// ---- detect SFC operations from a speed/feed prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  const sfcish = /speed|feed|\bsfm\b|\bvc\b|\brpm\b|chip[\s-]?load|\bfz\b|\bipm\b|\bipr\b|\bmrr\b|\bsfc\b|cutting[\s-]?param/.test(t);
  if (/compare|vs\b|versus|baseline|vendor|parity|g-?wizard|hsm[\s-]?advisor/.test(t) && sfcish) found.add("sfc_compare");
  if (/optim|cost[\s-]?optim|tool[\s-]?life[\s-]?max|economic/.test(t) && sfcish) found.add("sfc_optimize");
  if (/nine[\s-]?axis|9[\s-]?axis|orchestrat|strategy[\s-]?aware|mode[\s-]?recommend/.test(t)) found.add("sfc_nine_axis_run");
  if (sfcish) found.add("sfc_calculate"); // base op fires whenever the prompt is speed/feed-ish
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES };
