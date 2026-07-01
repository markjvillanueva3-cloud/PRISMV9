// scripts/lib/post-approach-knowledge.mjs
//
// POST-PROCESSOR auto-firing "approach knowledge" -- slot:zulu 2026-06-29 (for echo).
//
// The third clone of the proven task x machine x tooling auto-firing pattern
// (lathe = scripts/lib/lathe-approach-knowledge.mjs, mill =
// scripts/lib/mill-approach-knowledge.mjs). When the post-processor wizard reads a
// CAM intermediate / job and decides HOW to EMIT G-code, this surfaces the SPECIFIC
// verified dialect gate(s) for the emit operation(s) named -- conditioned on which
// CONTROLLER(s) the shop must post for (the machine-availability axis) and the
// machine TYPE (mill/lathe/5axis).
//
// SOURCING (R12 -- no fabrication): every gate is cloned VERBATIM from a VERIFIED
// source and cites it:
//   - echo-post-domain-inject.mjs DIGEST -- echo's own curated dialect gotchas.
//   - H:/prism/CLAUDE.md "## Recent regressions" -- the Okuma OSP dialect
//     corrections, each cited to a commit + verified against Mark's real .MIN
//     programs (G170 TCP-off, G71 threading, G4 F dwell, T010101 6-digit,
//     LAP G85/G81 roughing). These are commit-proven, not synthesized.
// A "VERIFIED" tag elsewhere is NOT physics-proof; G-codes here are DIALECT TOKENS
// (controller command identifiers -- the whole point of the gate), not physics
// constants, so naming them is correct and matches the cited source. No kc1.1 /
// Taylor / material constant is ever inlined.
//
// Karpathy 5-step: CLASSIFY pure data+select lib; TECHNIQUE frozen maps + set
// membership; EDGE null/empty/non-array ctx, unknown op/controller; FAILURE never
// throws (defensive ctx guard); WRITE handles all from line 1.

// ---- operation taxonomy (the emit operations the post wizard encounters) ----
export const POST_OPERATIONS = Object.freeze([
  "program_emit",     // any program output (always-on safety + constants gates)
  "coolant_on",       // M8/M9 coolant sequencing
  "feed_mode",        // G93 inverse-time / G94 ipm / G95 ipr selection
  "canned_cycle",     // drill/peck/bore canned cycles (G8x)
  "tap",              // tapping / rigid-tap cycle
  "threading",        // thread turning / thread milling cycle
  "five_axis_tcp",    // RTCP/TCPC tool-center-point control
  "part_off",         // cut-off / parting + dwell
  "tool_call",        // tool change / tool-call format
  "roughing_cycle",   // turning roughing cycle (G71-family)
  "work_offset",      // work-coordinate / fixture-offset selection
]);

// ---- controller fleet (the conditioning axis = which post/dialect to emit for) ----
// Each entry: id + match aliases + the machine TYPES it appears on at JM.
// JM .cps fleet (echo DIGEST): 12 posts across Haas/Hurco/Okuma/Fanuc.
export const JM_POST_FLEET = Object.freeze([
  Object.freeze({ id: "haas",       aliases: ["haas", "vf-2", "vf2", "om-2", "om2", "ngc"],            types: Object.freeze(["mill"]) }),
  Object.freeze({ id: "hurco",      aliases: ["hurco", "winmax", "vm30i", "vm30"],                     types: Object.freeze(["mill"]) }),
  Object.freeze({ id: "okuma",      aliases: ["okuma", "osp", "osp-p300", "p300", "genos", "m460v", "lb", "multus", "b250"], types: Object.freeze(["mill", "lathe", "5axis"]) }),
  Object.freeze({ id: "fanuc",      aliases: ["fanuc", "31i", "0i", "roku"],                           types: Object.freeze(["mill", "lathe"]) }),
  Object.freeze({ id: "siemens",    aliases: ["siemens", "sinumerik", "840d", "828d"],                 types: Object.freeze(["mill"]) }),
  Object.freeze({ id: "mitsubishi", aliases: ["mitsubishi", "meldas", "m700", "m80"],                  types: Object.freeze(["wedm", "mill"]) }),
]);

const CONTROLLER_IDS = Object.freeze(JM_POST_FLEET.map((c) => c.id));

// ---- the verified gate map (each gate cites its source) ----
// controllerCap : fires only when that controller is in the resolved set.
// machineCap    : fires only when that machine TYPE is in the resolved set.
// neither       : fires for its ops regardless of controller/machine.
const GATES = Object.freeze({
  // ---- always-on emit safety + constants discipline (echo DIGEST) ----
  pipeline_safety_nonnegotiable: {
    id: "pipeline_safety_nonnegotiable",
    rule: "Emit through PostProcessorPipelineEngine 7-phase (P1 physics + P5 safety NON-NEGOTIABLE); never string-concat G-code; run pre-emit cam_post_emit_safety_gate",
    enforcedBy: "PostProcessorPipelineEngine",
    cite: ".claude/hooks/echo-post-domain-inject.mjs DIGEST (emit)",
    ops: ["program_emit"],
    confidence: "verified",
  },
  constants_discipline: {
    id: "constants_discipline",
    rule: "dialect tokens from src/data/controller-dialects/<vendor>.ts; feed/speed from cam_speedfeed_compute; physics from src/physics/constants.ts -- NEVER inline a dialect/physics value",
    enforcedBy: "controller-dialects/<vendor>.ts",
    cite: ".claude/hooks/echo-post-domain-inject.mjs DIGEST (constants)",
    ops: ["program_emit"],
    confidence: "verified",
  },

  // ---- coolant sequencing (echo DIGEST dialect gotchas) ----
  coolant_after_spindle_mill: {
    id: "coolant_after_spindle_mill",
    rule: "M8 (coolant) AFTER M3-at-speed on MILL; lathe may emit M8 before M3",
    enforcedBy: "PostProcessorPipelineEngine P5",
    cite: ".claude/hooks/echo-post-domain-inject.mjs DIGEST (dialect gotchas)",
    ops: ["coolant_on"],
    machineCap: "mill",
    confidence: "verified",
  },
  aux_mcode_not_coolant: {
    id: "aux_mcode_not_coolant",
    rule: "M50/M51 are AUX m-codes, NOT coolant -- never map them to coolant on/off",
    enforcedBy: "controller-dialects/<vendor>.ts",
    cite: ".claude/hooks/echo-post-domain-inject.mjs DIGEST (dialect gotchas)",
    ops: ["coolant_on"],
    confidence: "verified",
  },

  // ---- feed-mode dialect (echo DIGEST) ----
  feed_mode_dialect: {
    id: "feed_mode_dialect",
    rule: "G93 inverse-time (required for 5-axis simultaneous) vs G94 ipm vs G95 ipr -- pick per operation + control; do not leave the prior modal feed-mode active across a 5-axis transition",
    enforcedBy: "controller-dialects/<vendor>.ts",
    cite: ".claude/hooks/echo-post-domain-inject.mjs DIGEST (dialect gotchas)",
    ops: ["feed_mode", "five_axis_tcp"],
    confidence: "verified",
  },

  // ---- comment / bracket dialect (echo DIGEST) ----
  okuma_bracket_comment: {
    id: "okuma_bracket_comment",
    rule: "Okuma OSP uses [] for comments and macro variables; Fanuc uses () -- emitting Fanuc-() comments to an OSP control mis-parses",
    enforcedBy: "controller-dialects/okuma.ts",
    cite: ".claude/hooks/echo-post-domain-inject.mjs DIGEST (dialect gotchas)",
    ops: ["program_emit"],
    controllerCap: "okuma",
    confidence: "verified",
  },

  // ---- canned-cycle / tapping dialect (echo DIGEST) ----
  siemens_mcall_vs_fanuc_g84: {
    id: "siemens_mcall_vs_fanuc_g84",
    rule: "Siemens uses MCALL modal sub-call for cycles; Fanuc uses G84 (tapping) / G8x canned cycles -- they are not interchangeable codes",
    enforcedBy: "controller-dialects/siemens.ts",
    cite: ".claude/hooks/echo-post-domain-inject.mjs DIGEST (dialect gotchas)",
    ops: ["canned_cycle", "tap"],
    controllerCap: "siemens",
    confidence: "verified",
  },

  // ---- Okuma OSP cited regression corrections (CLAUDE.md Recent regressions) ----
  okuma_tcp_g170_off: {
    id: "okuma_tcp_g170_off",
    rule: "Okuma OSP 5-axis TCPC: G169 = TCP ON, G170 = TCP OFF (G168 is WRONG -- leaving TCP active crashes the next positioning move)",
    enforcedBy: "OkumaOSPMillMasterPostEngine.resolveTcpCodes",
    cite: "CLAUDE.md Recent regressions 2026-06-29 / commit b6b863d268 (U-PP-OKUMA-5AXIS-G170-CORRECTION)",
    ops: ["five_axis_tcp"],
    controllerCap: "okuma",
    machineCap: "5axis",
    confidence: "verified",
  },
  okuma_thread_g71_single_line: {
    id: "okuma_thread_g71_single_line",
    rule: "Okuma OSP threading = single-line G71 cycle (NOT Fanuc two-line G76 -- a Fanuc G76 alarms / mis-cycles on an OSP control)",
    enforcedBy: "OkumaB250LatheMasterPostEngine.generateThreadingCycle",
    cite: "CLAUDE.md Recent regressions 2026-06-29 / commit 35a5f267e2 (U-PP-OKUMA-THREAD-G71)",
    ops: ["threading"],
    controllerCap: "okuma",
    machineCap: "lathe",
    confidence: "verified",
  },
  okuma_dwell_g4_f_seconds: {
    id: "okuma_dwell_g4_f_seconds",
    rule: "Okuma OSP dwell = G4 F<seconds> (NOT Fanuc G04 P<milliseconds>) -- emitting Fanuc ms-dwell to OSP dwells 1000x wrong",
    enforcedBy: "OkumaB250LatheMasterPostEngine (part-off dwell)",
    cite: "CLAUDE.md Recent regressions 2026-06-28 / commit 4878fee401",
    ops: ["part_off"],
    controllerCap: "okuma",
    confidence: "verified",
  },
  okuma_tool_call_6digit: {
    id: "okuma_tool_call_6digit",
    rule: "Okuma 6-digit tool call T010101 (tool/offset/group), NOT Fanuc 4-digit T0101",
    enforcedBy: "Okuma master-post tool-call emitter",
    cite: "CLAUDE.md commit f187caf610 (U-PP-OKUMA-TOOL-6DIGIT)",
    ops: ["tool_call"],
    controllerCap: "okuma",
    confidence: "verified",
  },
  okuma_roughing_lap_not_g71: {
    id: "okuma_roughing_lap_not_g71",
    rule: "Okuma OSP turning roughing = LAP G85/G81 family (Fanuc G71 is the THREADING cycle on OSP -- assuming Fanuc points roughing the wrong way)",
    enforcedBy: "OkumaB250LatheMasterPostEngine (roughing)",
    cite: "CLAUDE.md Recent regressions 2026-06-28 / reference_echo_okuma_cycle_dialect_2026_06_28",
    ops: ["roughing_cycle"],
    controllerCap: "okuma",
    machineCap: "lathe",
    confidence: "verified",
  },
});

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of POST_OPERATIONS) m[op] = [];
  for (const g of Object.values(GATES)) {
    for (const op of g.ops) if (m[op]) m[op].push(g.id);
  }
  return Object.freeze(m);
})();

// ---- helpers ----
function isStr(s) { return typeof s === "string" && s.length > 0; }

// Resolve controller + machine-type capabilities from a free-form machine/controller list.
// Returns a Set containing controller ids (okuma/fanuc/...) AND machine types (mill/lathe/5axis/wedm).
export function resolveCaps(machines) {
  const caps = new Set();
  if (!Array.isArray(machines)) return caps;
  for (const raw of machines) {
    if (!isStr(raw)) continue;
    const s = raw.toLowerCase();
    // controller ids from aliases
    for (const c of JM_POST_FLEET) {
      if (c.aliases.some((a) => s.includes(a))) caps.add(c.id);
    }
    // machine-TYPE caps from explicit markers only (incl JM model names) -- a bare
    // controller name (e.g. "okuma") does NOT assert a machine type, so a machine-
    // conditioned gate fires only when the descriptor actually names the type.
    if (/\bmill|vmc|machining[\s-]?center|genos|m460v|vm30|winmax/.test(s)) caps.add("mill");
    if (/\blathe|\bturn|\blb\b|multus|b250/.test(s)) caps.add("lathe");
    if (/5[\s-]?ax|rtcp|tcpc|trunnion|genos|m460v/.test(s)) caps.add("5axis");
    if (/wedm|wire[\s-]?edm/.test(s)) caps.add("wedm");
  }
  return caps;
}

// Does a gate's conditioning permit it to fire under the resolved caps?
function gateAllowed(gate, caps) {
  if (gate.controllerCap && !caps.has(gate.controllerCap)) return false;
  if (gate.machineCap && !caps.has(gate.machineCap)) return false;
  return true;
}

// ---- the firing entry point ----
// ctx: { operations: string[], machines?: string[] (controllers/machine descriptors) }
// Returns { operations:[{operation, gates:[...]}], controllers:[...], caps:[...], summary }.
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

  let summary = `${ops.length} post operation(s); controllers: ${controllers.join("/") || "unspecified"}`;
  const okumaOps = rawOps.filter((o) => ["threading", "five_axis_tcp", "part_off", "tool_call", "roughing_cycle"].includes(o));
  if (okumaOps.length && c.machines && !caps.has("okuma")) {
    summary += " -- NOTE: dialect-sensitive op(s) present but no Okuma OSP target resolved; confirm the controller before applying Okuma gates";
  }
  return { operations: ops, controllers, caps: [...caps], summary };
}

// UNVERIFIED gaps -- the post-processor verify-backlog: real, CITED items the echo specialist
// must confirm before any becomes a fired gate. Sourced from reference_post-processor_vault_enrichment_2026_06_29
// (its cited gap list + the "Echo verification queue"). NOT fired; surfaced by the six-domain
// autofire coverage worklist (parity with CAM/WEDM/MILL/LATHE/CAD_UNVERIFIED_GAPS). Safety rail:
// nothing here drives a gate until the specialist verifies the dialect/threshold vs the cited source.
export const POST_UNVERIFIED_GAPS = Object.freeze([
  "5-axis TCP/RTCP per-vendor mechanics (G68.2/RTCP) only on M460V-5AX; general 5-axis TCP + C-axis lathe engine open (reference_post-processor_vault_enrichment_2026_06_29 gap#2; Fanuc G68.2 + Heidenhain PLANE + Okuma OSP-P300 5-axis manuals)",
  "Canned-cycle cross-controller equivalence matrix (G81-G89/G98/G99 vs Heidenhain CYCLE DEF vs Okuma OSP) NOT synthesized (reference_post-processor_vault_enrichment_2026_06_29 gap#3; ISO 6983 + Smid CNC Programming Handbook)",
  "Golden-NC byte-equivalence CI stated as policy but tooling NOT confirmed complete for all 15 controllers (reference_post-processor_vault_enrichment_2026_06_29 gap#4; feedback_echo_cps_byte_equivalence)",
  "Wire-EDM post dialect: 5 WEDMPost* engines stub-wired/collision-locked; mike(physics)->echo(emit) cut-condition->NC boundary protocol underspecified (reference_post-processor_vault_enrichment_2026_06_29 gap#5/tip15)",
  "Stage 5.1b alarm-check reachability: whether all 2,588 controller-alarm-database.json entries are reachable vs only MASTER_ALARM_DATABASE.json is UNMEASURED -- do not claim full alarm coverage (reference_post-processor_vault_enrichment_2026_06_29 gap+tip9)",
  "Post-coverage ~40% P0 machine: 4 named gaps Haas PRE-NGC, Roku-Roku, EA sinker EDM, FA10S mis-route (reference_post-processor_vault_enrichment_2026_06_29 gap#8; CLAUDE.md sec8)",
  "deep-domain-research-2026-06-09.md dialect research (Haas G187/Settings 191/22/85, Fanuc G05.1 Q1 look-ahead, Siemens CYCLE8x) all UNVERIFIED -- verify vs public manuals before any emit relies on them (reference_post-processor_vault_enrichment_2026_06_29 tip10)",
  "Numeric G/M constants from autodesk-2014-gcode-language.md are METHOD/STRUCTURE-confirmed only; every promoted numeric remains UNVERIFIED-in-staging (reference_post-processor_vault_enrichment_2026_06_29 tip12)",
]);

// ---- detect emit operations from a post-processor prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  if (/\bcoolant\b|\bm0?8\b|\bm0?9\b|flood|mist|through[\s-]?spindle/.test(t)) found.add("coolant_on");
  if (/inverse[\s-]?time|\bg93\b|\bg94\b|\bg95\b|feed[\s-]?mode|\bipr\b|\bipm\b/.test(t)) found.add("feed_mode");
  if (/canned[\s-]?cycle|drill[\s-]?cycle|\bg8[0-9]\b|peck|bore[\s-]?cycle/.test(t)) found.add("canned_cycle");
  if (/\btap(?:ping)?\b|\bg84\b|rigid[\s-]?tap|mcall/.test(t)) found.add("tap");
  if (/\bthread(?:ing)?\b|\bg76\b|thread[\s-]?(?:turn|mill)/.test(t)) found.add("threading");
  if (/5[\s-]?axis|\brtcp\b|\btcpc\b|\btcp\b|\bg43\.4\b|\bg169\b|\bg170\b|tool[\s-]?center[\s-]?point/.test(t)) found.add("five_axis_tcp");
  if (/part[\s-]?off|cut[\s-]?off|parting|\bdwell\b|\bg0?4\b/.test(t)) found.add("part_off");
  if (/tool[\s-]?call|tool[\s-]?change|\bt0\d{2,}\b|\btool\b.*\boffset\b/.test(t)) found.add("tool_call");
  if (/rough(?:ing)?|\bg71\b|\blap\b|\bg85\b|\bg81\b/.test(t)) found.add("roughing_cycle");
  if (/work[\s-]?offset|\bg5[4-9]\b|\bwcs\b|fixture[\s-]?offset/.test(t)) found.add("work_offset");
  if (/\bemit\b|post[\s-]?process|generate.*g[\s-]?code|output.*\bnc\b|\.cps\b|\.min\b/.test(t)) found.add("program_emit");
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES, CONTROLLER_IDS };
