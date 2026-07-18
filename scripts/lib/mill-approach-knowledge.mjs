// scripts/lib/mill-approach-knowledge.mjs
//
// MILL-APPROACH-KNOWLEDGE-FIRING (slot:zulu for foxtrot, 2026-06-29)
//
// The mill sibling of scripts/lib/lathe-approach-knowledge.mjs: fire the SPECIFIC
// verified mill gotchas for the milling operation(s) the wizard encounters during
// print-reading, conditioned on the available MACHINES (5-axis? Hurco? Haas?) + TOOLING.
//
// SOURCING DISCIPLINE (R12 -- NO FABRICATION): every gate below is sourced from the
// VERIFIED, production foxtrot-mill-awareness-inject.mjs buildContext() "6 PHYSICS GATES"
// + landmines + JM mill fleet -- each already cited to a feedback_foxtrot_* memory + an
// enforcing engine. This is a re-organization of EXISTING verified mill doctrine by
// operation+machine+tooling, NOT new physics. Numeric Kienzle/Taylor constants are NOT
// inlined -- the rule names the gate + points at src/physics/constants.ts (hook-enforced).
// The deeper mill enrichment note (reference_mill_vault_enrichment_2026_06_29) is mostly
// UNVERIFIED (5 V / 10 U per the rollup), so it is NOT sourced here -- only the verified
// production gates are. foxtrot refines/extends.
//
// ASCII-only (ascii-guard). No em-dashes.

// ---- the mill operation taxonomy the wizard encounters during print-reading ----
export const MILL_OPERATIONS = Object.freeze([
  "face_mill", "slot_mill", "pocket_mill", "profile_mill", "trochoidal_rough",
  "finish_pass", "drill", "bore", "tap", "ream", "chamfer_mill", "thread_mill",
  "helical_bore", "ramp_entry", "five_axis_position",
]);

// JM Die mill fleet (5 machines) with capability tags. Source: foxtrot hook JM MILL FLEET.
export const JM_MILL_FLEET = Object.freeze([
  { id: "VMC-01", desc: "Hurco VM30i WinMAX v10", caps: ["hurco", "3axis"] },
  { id: "VMC-02", desc: "Okuma M460V-5AX OSP-P300MA-H", caps: ["okuma", "5axis"] },
  { id: "VMC-03", desc: "Haas VF-2 PRE-NGC", caps: ["haas", "3axis"] },
  { id: "VMC-04", desc: "Haas OM-2 PRE-NGC", caps: ["haas", "3axis"] },
  { id: "VMC-05", desc: "Roku-Roku Fanuc-31i (no registered post -- verify)", caps: ["roku-roku", "3axis"] },
]);

// ---- VERIFIED mill gates (engine-enforced / cited), keyed by id ----
// Each: rule + enforcedBy + cite + ops it fires for. Some are machine-conditioned (see
// machineCap) -- they fire only when the fleet has that capability.
const GATES = Object.freeze({
  chip_thinning: {
    rule: "Radial engagement below ~50% of tool dia (ae < D/2) thins the chip -- you MUST compensate with the effective chip-load (raise programmed fz) or the tool rubs and work-hardens. Mandatory for light radial cuts.",
    enforcedBy: "SpeedFeedOrchestrator chip-thinning compensation",
    cite: "feedback_foxtrot_chip_thinning_mandatory (mill/CLAUDE.md gate 1)", confidence: "verified",
    ops: ["profile_mill", "finish_pass", "trochoidal_rough", "slot_mill"],
  },
  tool_deflection: {
    rule: "End-mill deflection scales L^3/D^4 (cantilever delta=FL^3/3EI, I prop D^4) -- evaluate stickout x radial force x modulus BEFORE the cut; a long thin tool walks and leaves taper/chatter.",
    enforcedBy: "ToolDeflectionModel",
    cite: "mill/CLAUDE.md gate 2", confidence: "verified",
    ops: ["pocket_mill", "profile_mill", "bore", "helical_bore", "finish_pass", "thread_mill"],
  },
  spindle_power_headroom: {
    rule: "Keep spindle power demand <= installed HP minus 20% headroom -- a cut at the rated limit stalls under the real drivetrain + transient load. Check before heavy MRR.",
    enforcedBy: "prism_safety:validate_physics",
    cite: "feedback_foxtrot_spindle_power_headroom (mill/CLAUDE.md gate 3)", confidence: "verified",
    ops: ["face_mill", "slot_mill", "pocket_mill", "trochoidal_rough"],
  },
  trochoidal_entry_angle: {
    rule: "A trochoidal entry arc under 90 deg air-cuts (the tool enters before the material); default to a 90 deg flat entry. Validate the entry angle.",
    enforcedBy: "TrochoidalMillingEngine.ts",
    cite: "mill/CLAUDE.md gate 5", confidence: "verified",
    ops: ["trochoidal_rough", "slot_mill"],
  },
  kienzle_taylor_canonical: {
    rule: "Kienzle kc1.1 + Taylor C,n come EXCLUSIVELY from src/physics/constants.ts (hook-enforced) -- never inline a cutting constant in a mill calc.",
    enforcedBy: "physics-constants hook",
    cite: "feedback_foxtrot_canonical_constants_import (mill/CLAUDE.md)", confidence: "verified",
    ops: MILL_OPERATIONS,
  },
  // ---- machine-conditioned gates (fire only when the fleet has machineCap) ----
  five_axis_singularity: {
    rule: "5-axis RTCP develops a singularity when the tool axis A approaches 0 (parallel to Z) -- run MillKinematicsCollisionEngine.detectSingularity() before any move with A < 0.5 deg, or the rotary slews wildly.",
    enforcedBy: "MillKinematicsCollisionEngine.detectSingularity()",
    cite: "feedback_foxtrot_five_axis_singularity_gate (mill/CLAUDE.md gate 6)", confidence: "verified",
    ops: ["five_axis_position", "profile_mill", "finish_pass"], machineCap: "5axis",
  },
  hypermill_coolant_hurco: {
    rule: "A HyperMILL 4-char coolant block breaks the Hurco V11/WinMAX control -- do NOT emit it raw; route through the post-specific bridge for any Hurco-targeted program.",
    enforcedBy: "post-processor bridge (Hurco WinMAX)",
    cite: "feedback_foxtrot_hypermill_coolant_block_hurco (mill/CLAUDE.md gate 4)", confidence: "verified",
    ops: MILL_OPERATIONS, machineCap: "hurco",
  },
  // ---- foxtrot corpus-mined gates (slot:zulu 2026-07-01, cited+spot-verified) ----
  axial_chip_thinning: {
    rule: "A lead/approach angle kappa below 90 deg thins the chip by sin(kappa) -- programmed fz must rise to hit the target chip (fz = target_hex / sin(kappa); hex = fz*sin(kappa); for high-feed geometry kappa = arcsin(ap/R), R = nose radius). DISTINCT from radial chip-thinning: it also swings the force axial (axial ratio = cos(kappa)), which is why high-feed/face cutters tolerate long tools. Compensate fz for the lead angle on face + high-feed cuts (pure geometry, no material constant).",
    enforcedBy: "HighFeedMillingEngine.ts",
    cite: "HighFeedMillingEngine.ts:99-101,123 (kappa=arcsin(ap/R), hex=fz*sin(kappa), axialRatio=cos(kappa))", confidence: "verified",
    ops: ["face_mill", "finish_pass"],
  },
  spindle_drive_efficiency: {
    rule: "Compare the MOTOR draw, not raw cutting power, to the spindle rating: cutting power Pc is delivered at the tool, so the motor must supply P_motor = Pc / eta_drive (drivetrain losses). Skipping this division is ~1/eta_drive too lenient (a cut at 95% of cutting-power draws ~112% of spindle) and under-protects against stall. Divide by drive-efficiency FIRST, THEN apply the 20% headroom -- they stack. eta_drive is canonical in src/physics/constants.ts -- never inline it.",
    enforcedBy: "ProductEngine.ts spindle-draw check (SPINDLE_DRIVE_EFFICIENCY, constants.ts)",
    cite: "constants.ts:135 (SPINDLE_DRIVE_EFFICIENCY) + ProductEngine.ts:756,761,764", confidence: "verified",
    ops: ["face_mill", "slot_mill", "pocket_mill", "trochoidal_rough"],
  },
  machine_rigidity_vc_backoff: {
    rule: "A low-rigidity setup (worn ways, long overhang, light/benchtop machine, tall vise/tombstone stack) must back the cutting speed off to stay under chatter; a rigid box-way machine tolerates a modest premium. Apply the canonical rigidity->Vc factor multiplicatively (low<1, high>1). This is the OPERATIONAL Vc backoff (G-Wizard/HSMAdvisor rigidity slider), SEPARATE from the stability-lobe critical-depth effect -- do not double-count. The factor lives ONLY in src/physics/constants.ts -- never inline it.",
    enforcedBy: "UltimateSpeedFeedEngine.ts rigidity path (CANONICAL_MACHINE_RIGIDITY_VC_FACTOR, constants.ts)",
    cite: "constants.ts:889-905 (CANONICAL_MACHINE_RIGIDITY_VC_FACTOR) + UltimateSpeedFeedEngine.ts:3083", confidence: "verified",
    ops: ["face_mill", "slot_mill", "pocket_mill", "profile_mill", "trochoidal_rough"],
  },
  tool_material_speed_factor: {
    rule: "SFC base cutting speeds are CARBIDE-anchored. If the tool is HSS (common on taps, some drills, older shops) running it at the carbide base OVER-speeds it ~3x -- the dominant safety-relevant tool-material trap (burnt edge / catastrophic wear). Scale the base Vc by the canonical tool-material factor (carbide=1.0, HSS~1/3), clamped to a safe band. Check the tool material before trusting a returned speed regime. The factor lives ONLY in src/physics/constants.ts -- never inline it.",
    enforcedBy: "UltimateSpeedFeedEngine.ts Vc path (CANONICAL_TOOL_MATERIAL_SPEED_FACTOR, constants.ts)",
    cite: "constants.ts:841-865 (CANONICAL_TOOL_MATERIAL_SPEED_FACTOR) + UltimateSpeedFeedEngine.ts:52", confidence: "verified",
    ops: ["drill", "tap", "ream"],
  },
  // ---- foxtrot pass-2 corpus-mined gates (slot:zulu 2026-07-01, cited+spot-verified) ----
  ball_nose_scallop_stepover: {
    rule: "On a ball-nose FINISH pass the stepover ae + ball radius R set the residual cusp (scallop) height by pure circular geometry: scallop = R - sqrt(R^2 - (ae/2)^2); invert for a target cusp h to get the allowable stepover ae = 2*sqrt(2*R*h - h*h). Theoretical finish tracks the cusp (predicted Ra scales with scallop height). Size a ball-nose finish pass from the target-scallop inversion, NOT a flat percent-of-D default. DISTINCT from radial chip_thinning (chip load) and axial_chip_thinning (lead-angle chip): this is surface-finish cusp geometry. Pure geometry, no material constant.",
    enforcedBy: "BallEndMillEngine.ts scallop path",
    cite: "BallEndMillEngine.ts:141 (ae=2*sqrt(2Rh-h^2)),150-157 (scallop=R-sqrt(R^2-(ae/2)^2), Ra~scallop); ref Sandvik C-2920 + Machinery's Handbook Ch.24 + Altintas Ch.2", confidence: "verified",
    ops: ["finish_pass", "profile_mill"],
  },
  ramp_entry_flute_center_cutting: {
    rule: "A closed-pocket entry MUST be ramped (or helical-ramped), never a straight full-diameter plunge -- a non-center-cutting end mill has no edge at the axis. The max safe ramp angle is bounded by flute count (fewer flutes -> more center clearance -> steeper ramp tolerated; more flutes -> shallower), and feed must be REDUCED through the ramp because the tool center cuts at near-zero surface speed. Steep ramp on a low-flute tool is flagged; a deep ramp is redirected to a helical ramp. DISTINCT from trochoidal_entry_angle (lateral air-cut arc): this is axial closed-pocket entry feasibility. The flute->max-angle table lives in RampingEngine (no inlined threshold here).",
    enforcedBy: "RampingEngine.ts linearRamp / helical ramp path",
    cite: "RampingEngine.ts:91-97 (defaultMaxAngle by flute count),129-132 (center-cutting feed reduction),148-163 (steep/deep -> helical); ref Sandvik C-2920 + Kennametal ramping tables", confidence: "verified",
    ops: ["ramp_entry", "helical_bore", "pocket_mill", "slot_mill"],
  },
  coolant_strategy_material_hazard: {
    rule: "Coolant method (flood / through-tool-TSC / MQL / dry) is a material+operation decision with HARD categorical safety rules, not a free choice. Magnesium: fire + hydrogen-with-water hazard -> never water-based, straight oil or dry with spark containment (grinding Mg = extreme fire risk). Titanium at elevated speed: dry fire risk -> ensure flood or through-tool delivery. Some materials must NOT see water-based fluid; MQL only for MQL-friendly materials and NEVER on deep-hole ops (chip evac dominates). Through-tool needs a minimum effective pressure to work; deep-hole drilling needs the highest. Orthogonal to hypermill_coolant_hurco (a post emission bug): this is coolant-METHOD physics/safety by material. Pressure/flow numbers live in CoolantStrategyEngine (no inlined threshold here).",
    enforcedBy: "CoolantStrategyEngine.ts calculate (material/op safety + method select)",
    cite: "CoolantStrategyEngine.ts:111-127 (DRY_HAZARD/NO_WATER/MQL_FRIENDLY sets),193-209 (Mg/Ti fire-risk safety),235-236 (through-tool min pressure)", confidence: "verified",
    ops: ["face_mill", "slot_mill", "pocket_mill", "profile_mill", "trochoidal_rough", "drill", "tap", "ream", "thread_mill", "bore"],
  },
  thread_method_selection: {
    rule: "Threading method is a SCORED decision (single-point / thread-mill / rigid-tap / form-tap / roll / grind) driven by internal-vs-external, diameter, pitch, hardness, blind-vs-through, volume, and machine capability. Directional rules: thread-milling favors blind holes (no chip-evac trap), fine pitch, larger internal bores, hardened material -- but needs milling/live-tooling. Rigid tapping is fastest for standard mid-size internal threads at volume -- needs a rigid-tap spindle, loses life on hard material. Form/roll tapping is chipless, ideal for blind holes in ductile material (aluminum), unsuitable for superalloys/hardened steel. Single-point suits external or large/coarse-pitch internal, slow at volume. The engine flags rigid-tapping a hardened part and redirects. Directional thresholds live in the scoring engine (no inlined number here).",
    enforcedBy: "ThreadMethodSelectorEngine.ts select/scoreMethod",
    cite: "ThreadMethodSelectorEngine.ts:73,92-98 (thread_mill),100-106 (rigid_tap),108-114 (form_tap),164-166 (hardened-tap redirect); ref Sandvik Threading Guide + ISO 261 + ASME B1.1", confidence: "verified",
    ops: ["tap", "thread_mill"],
  },
  // ---- foxtrot pass-3 corpus-mined gates (slot:zulu 2026-07-01, cited+verify-arm PASS) ----
  micro_milling_size_effect_regime: {
    rule: "Below ~1mm tool dia or when uncut chip thickness h approaches the cutting-edge radius r_edge, classical Kienzle breaks down: minimum chip thickness h_min ~ 0.2*r_edge (below it the cut PLOUGHS, no chip forms). Classify the REGIME (cutting / transition / ploughing) before trusting a force/finish number -- DISTINCT from all radial/lead/helical chip-thinning gates (those assume continuous-cutting Kienzle validity; this flags when that assumption itself fails: sub-mm tooling, micro-features, medical/watch/electronics). The categorical regime is the gate; the numeric kc correction is a GAP.",
    enforcedBy: "MicroMillingSizeEffectEngine.calculateSizeEffect (prism_calc:micro_milling_size_effect_calc)",
    cite: "MicroMillingSizeEffectEngine.ts:111-186 (MIN_CHIP_THICKNESS_FACTOR / PLOUGHING_TRANSITION_FACTOR / regime classify); ref Aramcharoen & Mativenga 2009, Camara 2012", confidence: "verified",
    ops: ["drill", "pocket_mill", "profile_mill", "finish_pass"],
  },
  helical_bore_curvature_chip_thinning: {
    rule: "In helical-interpolation bore milling the center-path feed differs from the peripheral cutting speed by (Dh+Dt)/Dh (Dh=helix dia=bore_dia-tool_dia, Dt=tool dia): the tool sweeps a CURVED path so effective chip load fz_eff = fz*Dt/(Dt+Dh). A THIRD independent chip-thinning mechanism (curvature-induced), distinct from radial ae<D/2 chip_thinning and axial lead-angle axial_chip_thinning -- do not conflate or double-apply. Pure geometry, no material constant.",
    enforcedBy: "HelicalMillingEngine.calculate (prism_calc:helical_milling_calc)",
    cite: "HelicalMillingEngine.ts:126-137 (chipThinFactor=Dt/(Dt+Dh), feedRatio=(Dh+Dt)/Dh); ref Sandvik Helical Milling Guide + Machinery's Handbook Ch.28", confidence: "verified",
    ops: ["helical_bore", "thread_mill"],
  },
});

// LIVE LANDMINES (advisory, fleet-verified) -- surfaced when relevant, R12 do-not-repeat.
const LANDMINES = Object.freeze([
  { rule: "ChatterStabilityLobeEngine has returned 0 lobes (a known regression) -- VERIFY the SLD output before trusting a stability-limited depth.", cite: "reference_chatter_engine_regression_2026_05_24", ops: ["face_mill", "slot_mill", "pocket_mill", "profile_mill"] },
  { rule: "JM runs hyperMILL v31, NOT v33 -- generate posts/macros for v31.", cite: "reference_hypermill_use_v31_not_v33_2026_05_27", ops: MILL_OPERATIONS },
]);

// ---- tooling-availability requirements per operation ----
const TOOLING_REQUIREMENTS = Object.freeze({
  face_mill: { needs: "face_mill", note: "Face mill / shell mill sized to the stock width; multiple passes if width > ~0.75 x cutter dia." },
  slot_mill: { needs: "end_mill", note: "End mill at full slot (ae=D) -- highest radial force; consider trochoidal to cut ae and clear chips." },
  pocket_mill: { needs: "end_mill", note: "End mill with length for the pocket depth within L/D deflection limits; rougher + finisher." },
  profile_mill: { needs: "end_mill", note: "End mill; light radial -> apply chip-thinning fz compensation." },
  trochoidal_rough: { needs: "end_mill", note: "Solid carbide end mill rated for high feed / full flute engagement; 90 deg entry." },
  drill: { needs: "drill", note: "Center-supported or spot-then-drill; peck for depth > ~3x dia." },
  bore: { needs: "boring_head", note: "Boring head / bar within L/D deflection limits for the bore depth." },
  tap: { needs: "tap", note: "Tap (or thread-mill alt); rigid-tapping needs spindle sync support." },
  ream: { needs: "reamer", note: "Reamer at the correct pre-drill; light feed, flood coolant." },
  chamfer_mill: { needs: "chamfer_tool", note: "Chamfer / spot tool at the edge-break angle." },
  thread_mill: { needs: "thread_mill", note: "Thread mill (single or multi-form) -- mind deflection on small-bore internal threads." },
  helical_bore: { needs: "end_mill", note: "Helical interpolation with an end mill able to plunge-ramp; pitch within the tool's helix capacity." },
  ramp_entry: { needs: "end_mill", note: "Ramping end mill (center-cutting) for closed-pocket entry." },
  five_axis_position: { needs: "end_mill", note: "Requires a 5-axis machine (JM: VMC-02 Okuma M460V-5AX); 3-axis machines cannot orient the tool axis." },
});

// keyword -> operation map for detecting mill ops in print-reading / prompt text.
const OP_PATTERNS = Object.freeze([
  [/\bface[\s-]?mill(?:ing)?\b/i, "face_mill"],
  [/\b(?:slot|slott(?:ing)?)\b|\bkeyway\b/i, "slot_mill"],
  [/\bpocket(?:ing)?\b/i, "pocket_mill"],
  [/\btrochoidal|peel[\s-]?mill|adaptive[\s-]?(?:rough|clear)/i, "trochoidal_rough"],
  [/\b(?:profile|contour|peripheral)[\s-]?mill(?:ing)?\b|\bside[\s-]?mill\b/i, "profile_mill"],
  [/\bfinish(?:ing)?[\s-]?(?:pass|cut)?\b/i, "finish_pass"],
  [/\bthread[\s-]?mill(?:ing)?\b/i, "thread_mill"],
  [/\bhelical[\s-]?(?:bore|interp)|\bcircular[\s-]?ramp\b/i, "helical_bore"],
  [/\bramp(?:ing)?[\s-]?entry|\bplunge[\s-]?ramp\b/i, "ramp_entry"],
  [/\b5[\s-]?axis|\bfive[\s-]?axis|\brtcp\b|\btool[\s-]?axis\b/i, "five_axis_position"],
  [/\bbor(?:e|ing)\b/i, "bore"],
  [/\bream(?:ing)?\b/i, "ream"],
  [/\btap(?:ping)?\b/i, "tap"],
  [/\bchamfer/i, "chamfer_mill"],
  [/\bdrill(?:ing)?\b/i, "drill"],
]);

function normalizeOps(operations) {
  if (!Array.isArray(operations)) return [];
  const set = new Set(MILL_OPERATIONS);
  return [...new Set(operations.map((o) => String(o).toLowerCase().trim()).filter((o) => set.has(o)))];
}

// resolve the capability set the available machines provide.
function fleetCaps(machines) {
  const caps = new Set();
  if (!Array.isArray(machines)) return caps;
  const byId = new Map(JM_MILL_FLEET.map((m) => [m.id.toLowerCase(), m]));
  for (const m of machines) {
    const s = String(m).toLowerCase();
    const known = byId.get(s);
    if (known) { for (const c of known.caps) caps.add(c); continue; }
    if (s.includes("5") && s.includes("ax")) caps.add("5axis");
    if (s.includes("okuma")) { caps.add("okuma"); }
    if (s.includes("hurco")) caps.add("hurco");
    if (s.includes("haas")) caps.add("haas");
    if (s.includes("roku")) caps.add("roku-roku");
  }
  return caps;
}

// UNVERIFIED gaps -- the mill verify-backlog: real, CITED items the foxtrot specialist
// must confirm before any becomes a fired gate. Sourced from the mill enrichment note
// reference_mill_vault_enrichment_2026_06_29 (its "5 V / 10 U per the rollup"). These are
// NOT fired; the six-domain autofire coverage worklist surfaces them so the backlog is
// visible + trackable (parity with CAM_UNVERIFIED_GAPS / WEDM_UNVERIFIED_GAPS). Safety rail:
// nothing here drives a gate until the specialist verifies the numeric threshold vs source.
export const MILL_UNVERIFIED_GAPS = Object.freeze([
  "Altintas-Budak ZOA stability-lobe a_lim + tooth-passing spindle-speed numbers UNVERIFIED -- do not quote stability-pocket numbers until the Altintas PDFs are read (reference_mill_vault_enrichment_2026_06_29 gap#1/tip12; wiki/mill/_staging/deep-domain-research-2026-06-09.md)",
  "5-axis TCP/RTCP + C/B-axis sync has no RTCP-math / tilted-plane-transform gate -- kinematics page exists but C/B sync are open threads (reference_mill_vault_enrichment_2026_06_29 gap#2)",
  "Trochoidal/adaptive radial-engagement math (MRR-invariant feed + ramp logic) not bound to a gate -- HSM shipped in synthesis, no dedicated page (reference_mill_vault_enrichment_2026_06_29 gap#3)",
  "Harvey end-mill deflection L^3/d^4: structure verified but numeric core-diameter constants owner-gated + no worked example -- the L/d limit is not a quantified gate (reference_mill_vault_enrichment_2026_06_29 gap#4/tip10; knowledge/wiki/mill/mill-foundations.md)",
  "SFC material-name normalization mismatch between the speed-feed engine and the dispatcher -- normalize the material key before trusting a returned regime; root cause unconfirmed (reference_mill_vault_enrichment_2026_06_29 gap#5/tip13; mill_synthesis.md open threads)",
  "Sandvik entering-angle rule governs cutting-force DIRECTION but numeric constants owner-gated -- entering-angle -> radial/axial force split is not a quantified gate (reference_mill_vault_enrichment_2026_06_29 tip9; knowledge/wiki/mill/mill-foundations.md)",
  "5 mill algorithm-primitive mappings (DTW force-signature align, Viterbi/BeamSearch wear-state decode, Savitzky-Golay load smoothing, GMM/KNN regime cluster, RANSAC probe-plane fit) wired but NOT exercised -- no worked example (reference_mill_vault_enrichment_2026_06_29 tips4-8)",
  "Climb-vs-conventional: climb is the cited default but the conventional-milling exception list is not enumerated in source (reference_mill_vault_enrichment_2026_06_29 tip15; mill_synthesis.md)",
  "Mill finish-pass thermal-growth compensation (dD = alpha*D*dT: a part cut hot is oversize and shrinks to nominal on cooling) is NOT bound to the canonical CTE_LINEAR_BY_ISO -- the only live getCTEByISO consumer is TurningPrintToProgramEngine, no mill engine is wired, and ThermalGrowthCompensationEngine uses a local non-canonical CTE table. Thermal-adjacent -> specialist confirms the sizing vs source + wires an enforcing mill engine before this fires (constants.ts:87-99 CTE_LINEAR_BY_ISO + ThermalGrowthCompensationEngine.ts:136-139)",
  "Plunge-vs-ramp center-cutting feasibility is unenforced: a straight axial plunge needs a center-cutting (through-center) end mill; a non-center-cutting fluted/insert cutter must ramp or helix instead. PlungeMillingEngine.ts exists + is dispatcher-wired but has NO center-cutting / plunge-feasibility check (grep centerCutting|non.center|cannotPlunge -> 0), and there is no canonical center-cutting-capability flag. The ramp SIDE is enforced (RampingEngine, ramp_entry_flute_center_cutting gate) but the plunge-feasibility guard is open -- specialist confirms a source + wires an enforcing check before this fires",
  "micro-milling dispatcher SILENT NO-OP (live wiring bug): calcDispatcher.ts actions micro_milling_analyze (:10909) + micro_milling_size_effect_calc (:10916) both probe (eng as any).analyze?/.calculate?/.run? against MicroMillingEngine/MicroMillingSizeEffectEngine, whose only public methods are static calculateSizeEffect/analyzeChipFormation/recommend -- none match, so every live call falls through to the {note:'method not callable'} stub. The micro_milling_size_effect_regime gate is doctrine-correct but NOT reachable via prism_calc until foxtrot fixes the dispatcher case to call calculateSizeEffect directly. cite=calcDispatcher.ts:10916-10920 + MicroMillingSizeEffectEngine.ts:132,280,350 (slot:zulu pass-3 2026-07-01, verify PASS)",
  "micro-milling kc-correction constants un-canonical: MIN_CHIP_THICKNESS_FACTOR=0.2 / PLOUGHING_TRANSITION_FACTOR=0.35 / ELASTIC_RECOVERY_FACTOR=0.1 / SIZE_EFFECT_EXPONENT=-0.25 (+ edge/grain coeffs) are LOCAL engine constants, not from constants.ts, not cross-checked vs the cited papers this session -- specialist verifies each numeric vs its named paper (Aramcharoen 2009 / Liu&Melkote 2006 / Vogler 2004 / Camara 2012) + decides whether to promote into constants.ts before any live force output trusts kc_eff. cite=MicroMillingSizeEffectEngine.ts:111-117 (slot:zulu pass-3 2026-07-01)",
  "PlungeMillingEngine kc1.1 table DIVERGES from canonical: KC1_VALUES={P:2000,M:2400,K:1200,N:700,S:2800,H:3500} in PlungeMillingEngine.ts:69-71 does NOT match canonical KIENZLE_KC (P=1800,M=2100,K=1100,N=700,S=2800,H=3200) -- P/M/K/H diverge (N/S match). Real numeric drift, violates never-inline-cutting-constant (kienzle_taylor_canonical gate). Specialist confirms which is correct + whether PlungeMillingEngine should import canonical kc1.1. cite=PlungeMillingEngine.ts:69-71 vs mill/CLAUDE.md canonical table (slot:zulu pass-3 2026-07-01, verify PASS)",
  "Mechanistic milling force coefficients Ktc/Krc (cutting) + Kte/Kre (edge/ploughing) are identified from calibration cuts (slot + half-immersion for Ktc/Krc, zero-immersion extrapolation for the edge terms), giving per-tooth Ft/Fr directly -- a mechanistic milling-force model distinct from PRISM's Kienzle-only entry AND from the Sandvik entering-angle force-DIRECTION rule. external-source candidate: Altintas Manufacturing Automation 2e Ch5 sec5.3-5.4; class=numeric-threshold (calibrated coefficients, tool/material-dependent); foxtrot confirms a calibration source + whether to add a mechanistic-force surface before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Up-milling (conventional) vs down-milling (climb) entry/exit force reversal: up-milling starts at ~zero chip thickness with a compressive-then-tensile transient, down-milling starts at max chip thickness (tensile-then-compressive at exit) -- the direction of the entry/exit shock changes tool deflection + chatter onset. EXTENDS the existing climb-vs-conventional gap (which flags the exception list but not the force-reversal mechanism). external-source candidate: Tlusty Manufacturing Processes & Equipment Ch7 sec7.3.2; class=categorical (direction-dependent dynamics); foxtrot confirms before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Minimum simultaneous tooth engagement (z_eng >= 2, radial-immersion-derived) as a chatter-avoidance prerequisite is not bound to any enforcing engine -- distinct from the existing Altintas-Budak ZOA a_lim/tooth-passing-RPM gap (that is depth/RPM prediction; this is an engagement-CONTINUITY count) and no MIN_TEETH_ENGAGED/z_eng check exists in the codebase (grep-confirmed by the soul-verify arm); foxtrot confirms the Altintas Manufacturing Automation 2e Ch5 sec5.3.2 citation + immersion-angle formula before wiring a gate (soul-verified foxtrot-mill wf_fab1690e-410, external staging ledger, 2026-07-01)",
  "Minimum cutter-diameter-to-radial-engagement ratio (Dc >= ~1.5x ae slot / ~2x ae shoulder, rule-of-thumb) as a radial-force/rigidity feasibility check -- distinct from chip-thinning fz compensation (which corrects feed for a GIVEN ae/D) and from the L/D axial-overhang deflection gate (axial stickout, not diameter-vs-ae); the 1.5x/2x multipliers are UNSOURCED-PRECISE (broad handbook section, no page/table pin) so foxtrot confirms the exact Machinery's Handbook 31e table/page cite + whether the figures are precise or approximate before wiring a gate (soul-verified foxtrot-mill wf_fab1690e-410, 2026-07-01)",
]);

/**
 * Detect the mill operations referenced in free text (print-reading / prompt).
 * @param {string} text @returns {string[]}
 */
export function detectOperations(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const found = new Set();
  for (const [re, op] of OP_PATTERNS) if (re.test(text)) found.add(op);
  return MILL_OPERATIONS.filter((o) => found.has(o));
}

/**
 * Fire the task-relevant mill knowledge for an approach decision.
 * @param {{operations:string[], machines?:string[], tooling?:string[]}} ctx
 * @returns {{operations:object[], fleetCaps:string[], summary:string}}
 */
export function fireForApproach(ctx = {}) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const ops = normalizeOps(c.operations);
  const caps = fleetCaps(Array.isArray(c.machines) ? c.machines : []);
  const toolingHave = new Set((Array.isArray(c.tooling) ? c.tooling : []).map((t) => String(t).toLowerCase().trim()));

  const out = ops.map((op) => {
    const gates = Object.entries(GATES)
      .filter(([, g]) => g.ops.includes(op) && (!g.machineCap || caps.has(g.machineCap)))
      .map(([id, g]) => ({ id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite, confidence: g.confidence }));
    const landmines = LANDMINES.filter((l) => l.ops.includes(op)).map((l) => ({ rule: l.rule, cite: l.cite }));

    const req = TOOLING_REQUIREMENTS[op] || null;
    let toolingConstraint = null;
    if (req) {
      const have = toolingHave.size === 0 ? null : toolingHave.has(req.needs);
      toolingConstraint = {
        needs: req.needs, note: req.note, available: have,
        ...(have === false ? { blocker: `Required tooling "${req.needs}" not in the available set -- cannot approach ${op} as-is.` } : {}),
      };
    }
    return { operation: op, gates, landmines, tooling: toolingConstraint };
  });

  // 5-axis requested but no 5-axis machine = a hard feasibility blocker.
  const needs5 = ops.includes("five_axis_position");
  const blocked5 = needs5 && !caps.has("5axis");
  const toolBlockers = out.filter((o) => o.tooling && o.tooling.available === false).map((o) => o.operation);
  const summary =
    `mill approach: ${ops.length} op(s) [${ops.join(", ") || "none recognized"}]` +
    `${caps.size ? `; fleet caps [${[...caps].join(", ")}]` : ""}` +
    `${blocked5 ? "; BLOCKER: 5-axis op needs a 5-axis machine (none available)" : ""}` +
    `${toolBlockers.length ? `; tooling BLOCKERS: ${toolBlockers.join(", ")}` : ""}`;

  return { operations: out, fleetCaps: [...caps], summary };
}

export const _internals = Object.freeze({ GATES, LANDMINES, TOOLING_REQUIREMENTS, OP_PATTERNS });
