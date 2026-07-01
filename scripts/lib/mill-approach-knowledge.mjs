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
