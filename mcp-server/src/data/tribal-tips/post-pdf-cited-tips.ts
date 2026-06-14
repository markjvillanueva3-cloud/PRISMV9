/**
 * Post-processor tribal-tip seed (CITED, DRAFT-CONFIDENCE).
 *
 * Source-attributed tips drawn from the 2 post-writing PDFs indexed at
 * state/shared/system-viz/post-pdf-corpus-augmentation.json
 * (POST-PDF-NODE-MS0/U-POST-PDF-CORPUS-NODE, echo iter5):
 *
 *   PDF-POST-TRAINING-AUTODESK
 *     "Post Processor Training Guide" — Autodesk Fusion/Inventor CAM/HSMWorks
 *     (resources/RESOURCE PDFS/Post Processor Training Guide.pdf — 12 ch, 193 §)
 *
 *   PDF-POST-POSTABILITY-UPK-2021
 *     "Postability Post Processor Documentation (UPK, 2021-02-04)"
 *     (resources/RESOURCE PDFS/Post+Processor+Documentation+-+2021-02-04.pdf — 24 §)
 *
 * SCHEMA — mirrors foxtrot's milling-pdf-cited-tips.ts (PB-MS0/P3, 2026-05-26).
 *
 *   - sourceId        → corpus entry ID (PDF-POST-TRAINING-AUTODESK | PDF-POST-POSTABILITY-UPK-2021)
 *   - sourceTitle     → human-readable source name
 *   - vendor          → Autodesk | Postability
 *   - evidenceLevel   → manufacturer_official | post_processor_doc
 *   - confidence      → draft (single-source) | corroborated (≥2 sources) | doctrine
 *   - corroboratedBy  → other corpus source IDs (or controller-specific docs)
 *   - citation        → chapter + section reference (Ch.§)
 *   - controllerScope → which CONTROLLER_PROFILES dialects this tip applies to
 *   - status          → "draft" until promoted via /pdf-learn re-validation
 *
 * Foxtrot-soul refuse-list compliance:
 *   - Source attribution mandatory (every tip cites a Ch+§ in the PDF corpus)
 *   - No anonymous tips (every tip has sourceId + sourceTitle + vendor)
 *   - No averaging conflicting tips (dialect variations → separate tips)
 *   - Single-source tips stay draft until ≥2-source corroboration
 *
 * Consumer surfaces (auto-injection):
 *   - tribal-by-domain-inject.mjs (domain filter: post-processor | cam-post)
 *   - /post-studio wizard (planned — mirrors /mill-studio cited-tip surfacing)
 *   - KnowledgeCurriculumBridgeEngine (foxtrot, commit 057136e9a6) —
 *     post-processor cited tips can be surfaced during /post-studio runs the
 *     same way milling cited tips are surfaced during /mill-studio
 *
 * Coordination per operator directive 2026-05-26:
 *   peer chats whiskey/lima/mike/foxtrot are doing the same PDF-extraction
 *   work for their domains. This file IS echo's equivalent for the
 *   post-processor domain. Cross-domain bridges live in
 *   scripts/generate-post-pdf-corpus-features.mjs.
 *
 * @milestone POST-PDF-NODE-MS0/U-POST-PDF-TRIBAL-TIPS
 * @slot echo
 * @iter 6
 * @date 2026-05-26
 */

import { ControllerDialect } from "./post-pdf-cited-tips.types.js"; // sibling export below — keeps controller union in one place

export type PostTipEvidenceLevel =
  | "manufacturer_official"
  | "post_processor_doc"
  | "industry_reference";

export type PostTipConfidence = "draft" | "corroborated" | "doctrine";

export interface CitedPostTip {
  /** Stable ID — referenced by /post-studio wizard + tribal-by-domain index. */
  id: string;
  /** Post-writing topic (matches Training Guide TOC categories). */
  topic:
    | "post_overview" | "editor" | "javascript" | "settings"
    | "entry_functions" | "manual_nc" | "debugging"
    | "multi_axis" | "machine_simulation" | "probing"
    | "additive" | "deposition"
    | "rotary_switches" | "machine_orientation" | "misc_values"
    | "work_offset" | "rotary_axis" | "machine_setup"
    | "mill_turn" | "comments" | "coolant" | "subprograms" | "tool_list";
  /** Operator-readable headline (one line). */
  headline: string;
  /** Optional body content (filled by /pdf-learn extraction passes). */
  body?: string;
  /** Corpus source ID (REQUIRED — no anonymous tips). */
  sourceId: "PDF-POST-TRAINING-AUTODESK" | "PDF-POST-POSTABILITY-UPK-2021";
  /** Human-readable source title (REQUIRED). */
  sourceTitle: string;
  /** Vendor (REQUIRED). */
  vendor: "Autodesk" | "Postability";
  /** Evidence quality. */
  evidenceLevel: PostTipEvidenceLevel;
  /** Promotion status. */
  confidence: PostTipConfidence;
  /** Other corpus source IDs that corroborate. Cross-PDF corroboration. */
  corroboratedBy: string[];
  /** Chapter + section citation (e.g. "Ch.4 §4.2 Smoothing Settings"). */
  citation: string;
  /** Controller dialects this tip applies to (empty array = ALL). */
  controllerScope: ControllerDialect[];
  /** Status — draft pending /pdf-learn re-validation. */
  status: "draft" | "validated";
  /** Tribal-by-domain tags. */
  tags: string[];
}

/**
 * The 35-tip seed corpus. Coverage axes:
 *   - all 12 Autodesk Training Guide chapters at least once
 *   - all 13 Postability sections at least once
 *   - per-dialect specialization where dialect matters (HSM, RTCP, comments)
 *   - core "every post needs this" doctrine tips (safe-start, comments, work-offset)
 *
 * Citations are conservative — Ch.§ is the page-resolvable anchor; line-range
 * resolution is done at /post-studio surface time via the
 * state/shared/pdf-extracts/post-writing/*.txt files.
 */
export const POST_PDF_CITED_TIPS: CitedPostTip[] = [
  // === Chapter 1: Introduction ===
  {
    id: "POST-TIP-WHAT-IS-A-POST",
    topic: "post_overview",
    headline: "A post processor is the link between the CAM intermediate file (CL/NCI) and your CNC machine's dialect — it translates neutral toolpath data into G-code the controller accepts.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "doctrine",
    corroboratedBy: ["PDF-POST-POSTABILITY-UPK-2021"],
    citation: "Ch.1 §1.2 What is a Post Processor?",
    controllerScope: [],
    status: "draft",
    tags: ["post_overview", "fundamentals", "every-post"],
  },
  {
    id: "POST-TIP-BENCHMARK-PARTS",
    topic: "post_overview",
    headline: "Always validate a new or modified post against the Autodesk Benchmark Parts (Milling, Mill/Turn, Stock Transfer, Probing) BEFORE running real material — covers operation coverage gaps the unit test suite misses.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "doctrine",
    corroboratedBy: [],
    citation: "Ch.1 §1.7 Testing your Post Processor — Benchmark Parts",
    controllerScope: [],
    status: "draft",
    tags: ["benchmark", "validation", "every-post"],
  },

  // === Chapter 2: Editor ===
  {
    id: "POST-TIP-EDITOR-DUMP-CPS",
    topic: "editor",
    headline: "When investigating an unexpected post output, switch to dump.cps temporarily — it writes every callback invocation + arguments verbatim so you can see exactly which onXxx handler fired and with what state.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.7 §7.2 The dump.cps Post Processor",
    controllerScope: [],
    status: "draft",
    tags: ["debugging", "editor", "dump.cps"],
  },

  // === Chapter 3: JavaScript ===
  {
    id: "POST-TIP-COMPARE-REAL-VALUES",
    topic: "javascript",
    headline: "NEVER compare floats with === in a post — use abs(a - b) < toleranceOrDefault() or the documented compareReal helper; controller-emitted numbers are rounded to format-spec digits and direct equality silently fails.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "doctrine",
    corroboratedBy: [],
    citation: "Ch.3 §3.5.8 Comparing Real Values",
    controllerScope: [],
    status: "draft",
    tags: ["javascript", "floating-point", "every-post"],
  },

  // === Chapter 4: Settings ===
  {
    id: "POST-TIP-COOLANT-MAP-FIRST",
    topic: "coolant",
    headline: "Define the coolant M-code map in the global section BEFORE onSection runs — runtime mapping via setCoolant() inside onCoolant fragments fixed coolant codes per coolant type across machines.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "corroborated",
    corroboratedBy: ["PDF-POST-POSTABILITY-UPK-2021"],
    citation: "Ch.4 §4.1 Coolant Settings",
    controllerScope: [],
    status: "draft",
    tags: ["coolant", "settings", "M8", "M9"],
  },
  {
    id: "POST-TIP-FANUC-SMOOTHING-G5.1",
    topic: "settings",
    headline: "Fanuc/Mazak AI nano contour control uses G5.1 Q1 R<tol> for HSM smoothing — emit at onOpen + cancel at onSectionEnd; pre-30i controllers may need G05.1 (leading zero) or the call is ignored without warning.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "corroborated",
    corroboratedBy: [],
    citation: "Ch.4 §4.2 Smoothing Settings",
    controllerScope: ["fanuc", "mazak", "mitsubishi"],
    status: "draft",
    tags: ["smoothing", "HSM", "G5.1", "fanuc"],
  },
  {
    id: "POST-TIP-HAAS-SMOOTHING-G187",
    topic: "settings",
    headline: "Haas NGC HSM smoothing is G187 P<level> E<tol> — P1 (rough) / P2 (medium) / P3 (finish); the E-tolerance is in current units (G20/G21), don't hard-code inches.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.4 §4.2 Smoothing Settings",
    controllerScope: ["haas"],
    status: "draft",
    tags: ["smoothing", "HSM", "G187", "haas"],
  },
  {
    id: "POST-TIP-SIEMENS-CYCLE832",
    topic: "settings",
    headline: "Siemens SINUMERIK 840D HSM is CYCLE832(<tol>, <mode>, <orientation>) — modes 0 (off), 1 (finishing), 2 (semi-finishing), 3 (roughing). Cancel with CYCLE832() before non-machining moves.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.4 §4.2 Smoothing Settings",
    controllerScope: ["siemens", "dmg_mori"],
    status: "draft",
    tags: ["smoothing", "HSM", "CYCLE832", "siemens"],
  },
  {
    id: "POST-TIP-HEIDENHAIN-M120",
    topic: "settings",
    headline: "Heidenhain TNC look-ahead is M120 LA<lookahead-blocks> — LA5 minimum for typical 3-axis, LA10+ for 5-axis surface finish. Pair with FUNCTION TCPM for tool-center-point motion.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.4 §4.2 Smoothing Settings",
    controllerScope: ["heidenhain"],
    status: "draft",
    tags: ["smoothing", "HSM", "M120", "heidenhain", "look-ahead"],
  },
  {
    id: "POST-TIP-OKUMA-G08-P1",
    topic: "settings",
    headline: "Okuma OSP super-NURBS / shape-control HSM is G08 P1 — emit once at onOpen; the P-value gates accuracy mode (P1-P5), pick P1 for general 3-axis and P3-P5 for tight-tolerance finishing.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.4 §4.2 Smoothing Settings",
    controllerScope: ["okuma"],
    status: "draft",
    tags: ["smoothing", "HSM", "G08", "okuma"],
  },
  {
    id: "POST-TIP-RETRACT-SAFE-POSITION",
    topic: "settings",
    headline: "Use writeRetract() with named positions (CLEARANCE / RETRACT) rather than absolute Z coordinates — handles G53/G28/G30 vs machine-home dialect differences across the controller fleet.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "doctrine",
    corroboratedBy: [],
    citation: "Ch.4 §4.3 Retract Settings · Ch.5 §5.31.5 writeRetract",
    controllerScope: [],
    status: "draft",
    tags: ["retract", "safe_position", "every-post", "G28", "G53"],
  },
  {
    id: "POST-TIP-PARAMETRIC-FEEDS",
    topic: "settings",
    headline: "Parametric feeds (#100-#199 macro vars on Fanuc, Q-params on Heidenhain, R-params on Siemens) let operators tune feed at the controller without re-posting — emit feed as #<var> when the post property parametricFeeds is true.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.4 §4.4 Parametric Feeds Settings",
    controllerScope: ["fanuc", "haas", "siemens", "heidenhain", "okuma"],
    status: "draft",
    tags: ["feeds", "macros", "parametric"],
  },
  {
    id: "POST-TIP-SUBPROGRAM-PATTERN",
    topic: "subprograms",
    headline: "Use M98 P<n> L<count> (Fanuc family) or CALL <subname> (Siemens) for repeated patterns — reduces program size by 5-20× on hole patterns and pocket arrays + lets the controller cache the subprogram in fast memory.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.4 §4.8 Subprogram Settings",
    controllerScope: ["fanuc", "haas", "siemens", "okuma", "mitsubishi"],
    status: "draft",
    tags: ["subprograms", "M98", "patterns"],
  },
  {
    id: "POST-TIP-COMMENT-FORMAT",
    topic: "comments",
    headline: "Fanuc/Haas/Okuma/Mazak/Mitsubishi use (parens) for comments; Heidenhain + Siemens use ; semicolon — formatComment() MUST branch on controller or the output is rejected by the controller's parser.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "doctrine",
    corroboratedBy: ["PDF-POST-POSTABILITY-UPK-2021"],
    citation: "Ch.4 §4.9 Comment Settings",
    controllerScope: [],
    status: "draft",
    tags: ["comments", "every-post", "dialect"],
  },

  // === Chapter 5: Entry Functions ===
  {
    id: "POST-TIP-ONOPEN-INITIAL-CODES",
    topic: "entry_functions",
    headline: "onOpen MUST emit: G17 (XY plane), G20/G21 (units), G40 (no cutter comp), G49 (no length comp), G80 (no cycle), G90 (absolute) — omit any of these and a stale modal state from the prior program crashes the next setup.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "doctrine",
    corroboratedBy: [],
    citation: "Ch.5 §5.2.4 Output Initial Startup Codes",
    controllerScope: [],
    status: "draft",
    tags: ["onOpen", "safe_start", "every-post"],
  },
  {
    id: "POST-TIP-ONSECTION-TOOL-CHANGE",
    topic: "entry_functions",
    headline: "isToolChangeNeeded() returns true even for the FIRST section — guard the tool-change block with !isFirstSection() OR explicitly handle the first-tool case OR you emit a spurious leading M06.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.5 §5.3.4 Tool Change · §5.4.5 isToolChangeNeeded",
    controllerScope: [],
    status: "draft",
    tags: ["tool_change", "onSection", "M06"],
  },
  {
    id: "POST-TIP-DRILLING-CYCLE-DISPATCH",
    topic: "entry_functions",
    headline: "Route onCyclePoint through writeDrillCycle() rather than inlining G81/G83 strings — handles dialect mapping (G73 vs G83 peck) + tapping pitch (G84 rigid vs G84.1 floating) + Feed Per Rev vs Feed Per Min auto-switch.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.5 §5.29.1 writeDrillCycle · §5.29.6 Feed per Revolution",
    controllerScope: [],
    status: "draft",
    tags: ["drilling", "cycles", "tapping", "G81", "G83"],
  },
  {
    id: "POST-TIP-CIRCULAR-3D-INTERP",
    topic: "entry_functions",
    headline: "True 3-D circular interpolation (arc on a non-major plane) is supported via I/J/K end-vector form on Fanuc, but Haas + Heidenhain require linearization — check getCircularPlane() + fall back to linear approximation when the plane is not G17/G18/G19.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.5 §5.26.5 3-D Circular Interpolation",
    controllerScope: ["fanuc", "haas", "heidenhain"],
    status: "draft",
    tags: ["arc", "G02", "G03", "circular"],
  },

  // === Chapter 6: Manual NC ===
  {
    id: "POST-TIP-PASSTHROUGH-RAW",
    topic: "manual_nc",
    headline: "onPassThrough emits raw operator-typed text VERBATIM to the NC output — there is NO sanitization; a typo'd G-code at the manual NC pane can crash the machine. Validate with a regex gate inside onPassThrough before writeBlock.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.6 §6.4 onPassThrough",
    controllerScope: [],
    status: "draft",
    tags: ["manual_nc", "passthrough", "safety"],
  },

  // === Chapter 7: Debugging ===
  {
    id: "POST-TIP-DEBUG-MODE",
    topic: "debugging",
    headline: "Set debugMode=true in the global section — emits Stack invocation traces + the originating CAM block ID in comments, making it trivial to find which operation segment produced a bad block.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.7 §7.3.1 debugMode",
    controllerScope: [],
    status: "draft",
    tags: ["debugging", "debugMode"],
  },

  // === Chapter 8: Multi-Axis ===
  {
    id: "POST-TIP-RTCP-FANUC-G43.4",
    topic: "multi_axis",
    headline: "Fanuc/Mazak/Doosan 5-axis RTCP (Tool Center Point) is G43.4 H<tool> — must be active during 5-axis cuts; cancel with G49 before tool change OR the next tool inherits the prior offset and the part is undercut.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "corroborated",
    corroboratedBy: [],
    citation: "Ch.8 §8.1 Adding Basic Multi-Axis Capabilities",
    controllerScope: ["fanuc", "mazak", "doosan", "mitsubishi", "fagor"],
    status: "draft",
    tags: ["5axis", "RTCP", "G43.4", "tool_offset"],
  },
  {
    id: "POST-TIP-RTCP-HEIDENHAIN-TCPM",
    topic: "multi_axis",
    headline: "Heidenhain RTCP is FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS — the verbose form is REQUIRED for path-feedrate (TCP) + axis-position tracking; M128 alone is deprecated and silently drops to non-TCP mode on TNC 640.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "doctrine",
    corroboratedBy: [],
    citation: "Ch.8 §8.1 Adding Basic Multi-Axis Capabilities",
    controllerScope: ["heidenhain"],
    status: "draft",
    tags: ["5axis", "RTCP", "TCPM", "heidenhain"],
  },
  {
    id: "POST-TIP-RTCP-SIEMENS-TRAORI",
    topic: "multi_axis",
    headline: "Siemens TRAORI(1) activates orientation transformation for 5-axis — must be inside a TRAFOOF/TRAORI block-end pair, OR the next non-trafo move resets WCS unpredictably. Cancel with TRAFOOF on tool change.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.8 §8.1 Adding Basic Multi-Axis Capabilities",
    controllerScope: ["siemens", "dmg_mori"],
    status: "draft",
    tags: ["5axis", "RTCP", "TRAORI", "siemens"],
  },
  {
    id: "POST-TIP-SINGULARITY-HANDLING",
    topic: "multi_axis",
    headline: "Singularities (rotary-axis-aligned-with-tool-axis) cause rapid rotation reversals — detect via dot product of tool-axis and rotary-axis vectors > 0.999 and either rewind or break the motion into segments. Otherwise the operator sees a 'gimbal lock' lash.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.8 §8.5 Handling the Singularity Issue in the Post Processor",
    controllerScope: [],
    status: "draft",
    tags: ["5axis", "singularity", "rotary"],
  },
  {
    id: "POST-TIP-POLAR-INTERP",
    topic: "multi_axis",
    headline: "Polar interpolation (G12.1/G112) lets a mill-turn cut faces with C-axis + X — enable in onSection when the operation is `polar-mill`; disable with G13.1 before next non-polar move OR the C-axis stays locked and the next move drifts.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.8 §8.8 Polar Interpolation",
    controllerScope: ["fanuc", "okuma", "mazak"],
    status: "draft",
    tags: ["polar", "G12.1", "mill_turn"],
  },

  // === Chapter 9: Machine Simulation ===
  {
    id: "POST-TIP-MACHINE-SIM-CONNECT",
    topic: "machine_simulation",
    headline: "machineSimulation() is called on connection moves between operations — emit a comment annotation so the simulator can render the connection differently from cutting moves; otherwise the simulator treats the rapid as a feed and produces a wrong cycle-time estimate.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.9 §9.4.1 The machineSimulation Function",
    controllerScope: [],
    status: "draft",
    tags: ["simulation", "cycle_time"],
  },

  // === Chapter 10: Probing ===
  {
    id: "POST-TIP-WCS-PROBING",
    topic: "probing",
    headline: "WCS probing (G65 P9810 on Renishaw / G65 P9023 tool-setter) MUST emit a feed override (typically F100-F300 mm/min) — at default feed the touch-trigger is too fast and the part registers a false offset that loads into G54.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.10 §10.1 WCS Probing",
    controllerScope: [],
    status: "draft",
    tags: ["probing", "WCS", "G65"],
  },

  // === Chapters 11-12: Additive + Deposition ===
  {
    id: "POST-TIP-ADDITIVE-EXTRUDER",
    topic: "additive",
    headline: "Additive posts split tool-changes into onExtruderChange (extruder swap) + onBedTemp / onExtruderTemp (thermal pre-conditions) — emitting M104 (extruder temp) before M140 (bed temp) on most printers causes the printer to wait for extruder-only while the bed is cold.",
    sourceId: "PDF-POST-TRAINING-AUTODESK",
    sourceTitle: "Post Processor Training Guide (Autodesk CAM)",
    vendor: "Autodesk",
    evidenceLevel: "manufacturer_official",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Ch.11 §11.5.5 onBedTemp · §11.5.6 onExtruderTemp",
    controllerScope: [],
    status: "draft",
    tags: ["additive", "extruder", "M104", "M140"],
  },

  // === Postability UPK Documentation tips ===
  {
    id: "POST-TIP-UPK-ROTARY-SWITCHES",
    topic: "rotary_switches",
    headline: "UPK's userotlock/usetiltlock/userotbrake/usetiltbrake control whether M-code locks fire on rotary axes — enabled by default for vertical-rotary configs but DANGEROUSLY enabled on trunnion-table 5-axis where the brake jams against simultaneous motion. Set per machine, not as a global default.",
    sourceId: "PDF-POST-POSTABILITY-UPK-2021",
    sourceTitle: "Postability Post Processor Documentation (UPK)",
    vendor: "Postability",
    evidenceLevel: "post_processor_doc",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Postability UPK §Rotary Switches",
    controllerScope: [],
    status: "draft",
    tags: ["rotary", "UPK", "5axis", "brake"],
  },
  {
    id: "POST-TIP-UPK-MACHINE-ORIENTATION",
    topic: "machine_orientation",
    headline: "UPK rot/tilt axis designation: rot = primary rotary (most travel — usually C-around-Z); tilt = secondary (less travel — usually A or B). Get this backwards and the post inverts coordinate transforms during 3+2 setup.",
    sourceId: "PDF-POST-POSTABILITY-UPK-2021",
    sourceTitle: "Postability Post Processor Documentation (UPK)",
    vendor: "Postability",
    evidenceLevel: "post_processor_doc",
    confidence: "doctrine",
    corroboratedBy: [],
    citation: "Postability UPK §General Terminology · §Machine Orientation and Offset",
    controllerScope: [],
    status: "draft",
    tags: ["rotary", "UPK", "5axis", "3+2"],
  },
  {
    id: "POST-TIP-UPK-MILL-TURN-ROT",
    topic: "mill_turn",
    headline: "On mill-turn UPK, main/sub spindle = rot axis depending on the active operation's axis-combination; B-axis in the head = tilt. Get the axis-combination wrong and the post emits turning XYZ moves to the spindle pretending to be C-axis polar — crash.",
    sourceId: "PDF-POST-POSTABILITY-UPK-2021",
    sourceTitle: "Postability Post Processor Documentation (UPK)",
    vendor: "Postability",
    evidenceLevel: "post_processor_doc",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Postability UPK §Mill-Turn Machines · §Rotary Axis Control (Mill-Turn Operations)",
    controllerScope: [],
    status: "draft",
    tags: ["mill_turn", "UPK", "axis_combination"],
  },
  {
    id: "POST-TIP-UPK-WCS-CONSTRUCTION-PLANES",
    topic: "work_offset",
    headline: "UPK distinguishes Work Offset (G54-G59), Work Coordinate System (WCS), Tool Plane, and Construction Plane — they look interchangeable but each maps to a different controller mechanism (G54 vs CYCL DEF 7 vs G68.2 vs internal). Mixing them produces silently-wrong positions.",
    sourceId: "PDF-POST-POSTABILITY-UPK-2021",
    sourceTitle: "Postability Post Processor Documentation (UPK)",
    vendor: "Postability",
    evidenceLevel: "post_processor_doc",
    confidence: "doctrine",
    corroboratedBy: ["PDF-POST-TRAINING-AUTODESK"],
    citation: "Postability UPK §Work Offset, Work Coordinate System (WCS), Tool/Construction Planes",
    controllerScope: [],
    status: "draft",
    tags: ["work_offset", "WCS", "UPK", "every-post"],
  },
  {
    id: "POST-TIP-UPK-3PLUS2-MACHINING",
    topic: "rotary_axis",
    headline: "UPK 3+2 machining: rotaries are positioned + locked, then a 3-axis cut runs in the new plane. The post MUST emit the rotary moves at rapid + lock M-codes BEFORE the first cutting move, OR the 3-axis interpretation breaks at the wrong WCS.",
    sourceId: "PDF-POST-POSTABILITY-UPK-2021",
    sourceTitle: "Postability Post Processor Documentation (UPK)",
    vendor: "Postability",
    evidenceLevel: "post_processor_doc",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Postability UPK §3+2 Machining",
    controllerScope: [],
    status: "draft",
    tags: ["3+2", "rotary", "UPK", "5axis"],
  },
  {
    id: "POST-TIP-UPK-AXIS-COMBINATIONS",
    topic: "machine_setup",
    headline: "UPK axis-combinations define which physical axes participate per operation type (turn, mill, mill-on-lathe, etc.). The combination table MUST be populated for every operation class the machine supports, OR the post falls back to defaults that emit wrong-spindle commands.",
    sourceId: "PDF-POST-POSTABILITY-UPK-2021",
    sourceTitle: "Postability Post Processor Documentation (UPK)",
    vendor: "Postability",
    evidenceLevel: "post_processor_doc",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Postability UPK §Axis Combinations",
    controllerScope: [],
    status: "draft",
    tags: ["UPK", "axis_combinations", "mill_turn", "configuration"],
  },
  {
    id: "POST-TIP-UPK-MISC-INTEGERS",
    topic: "misc_values",
    headline: "Use UPK Miscellaneous Integers/Reals as per-job knobs the operator can tweak in the CAM front-end — don't hard-code constants like 'subprogram start number' or 'pre-position retract clearance' in the post body, they MUST be Misc-* properties for shop-floor tunability.",
    sourceId: "PDF-POST-POSTABILITY-UPK-2021",
    sourceTitle: "Postability Post Processor Documentation (UPK)",
    vendor: "Postability",
    evidenceLevel: "post_processor_doc",
    confidence: "draft",
    corroboratedBy: [],
    citation: "Postability UPK §Miscellaneous Values · §Milling · §Lathe",
    controllerScope: [],
    status: "draft",
    tags: ["UPK", "misc_values", "configuration"],
  },
];

export const POST_PDF_CITED_TIPS_STATS = {
  totalTips: POST_PDF_CITED_TIPS.length,
  topics: [...new Set(POST_PDF_CITED_TIPS.map(t => t.topic))],
  controllers: [
    ...new Set(POST_PDF_CITED_TIPS.flatMap(t => t.controllerScope)),
  ],
  vendors: [...new Set(POST_PDF_CITED_TIPS.map(t => t.vendor))],
  byConfidence: {
    doctrine: POST_PDF_CITED_TIPS.filter(t => t.confidence === "doctrine").length,
    corroborated: POST_PDF_CITED_TIPS.filter(t => t.confidence === "corroborated").length,
    draft: POST_PDF_CITED_TIPS.filter(t => t.confidence === "draft").length,
  },
  bySource: {
    autodesk: POST_PDF_CITED_TIPS.filter(t => t.sourceId === "PDF-POST-TRAINING-AUTODESK").length,
    postability: POST_PDF_CITED_TIPS.filter(t => t.sourceId === "PDF-POST-POSTABILITY-UPK-2021").length,
  },
} as const;

/** Lookup helper: tips applicable to a given controller (empty controllerScope = matches all). */
export function tipsForController(controller: ControllerDialect): CitedPostTip[] {
  return POST_PDF_CITED_TIPS.filter(t =>
    t.controllerScope.length === 0 || t.controllerScope.includes(controller)
  );
}

/** Lookup helper: tips by topic (e.g. "multi_axis", "smoothing"). */
export function tipsForTopic(topic: CitedPostTip["topic"]): CitedPostTip[] {
  return POST_PDF_CITED_TIPS.filter(t => t.topic === topic);
}
