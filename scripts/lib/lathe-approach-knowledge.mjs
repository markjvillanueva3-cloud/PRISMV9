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
