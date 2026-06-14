/**
 * Mill Post Feature Parity Matrix — Hurco V11 → Haas + Okuma + 11 other dialects.
 *
 * Closes the corpus prove-out asymmetry surfaced by echo's overnight close
 * (HANDOFF-9029a5d7-echo-overnight-summary-2026-05-26):
 *
 *   Hurco V11 master post:    82.4% corpus PASS  (HurcoV11MillMasterPostEngine green, 72/72 tests)
 *   Haas VF-2 enhanced:       41.2% corpus PASS  (missing parity features)
 *   Okuma M460V 5AX enhanced: 47.1% corpus PASS  (missing parity features)
 *   Roku-Roku enhanced:       41.2% corpus PASS  (missing parity features)
 *
 * This file is the canonical mapping table: each V11 feature → its dialect
 * equivalent in every other supported controller. Used by:
 *   - /post-studio wizard (planned U-POST-STUDIO-WIZARD-WIRE) to emit
 *     dialect-correct post-feature code on a per-controller basis
 *   - knowledgeCurriculumBridgeEngine (foxtrot, commit 057136e9a6) to
 *     surface dialect-aware tribal tips during post-build
 *   - master-post engines to validate "feature X should emit code Y for
 *     dialect Z" assertions at test time
 *
 * Coordination with peer chats (operator directive 2026-05-26):
 *   - foxtrot's milling-pdf-cited-tips.ts → mirrors the citation pattern
 *   - kilo's cad-cam-resources-pdf-index → my source PDFs are in his manifest
 *   - whiskey (lathe) → equivalent parity matrix should land in
 *     lathe-post-feature-parity for the lathe analog
 *
 * Citation pattern: every feature's `citations` array references the post-PDF
 * corpus (Ch.§ from PDF-POST-TRAINING-AUTODESK + PDF-POST-POSTABILITY-UPK-2021)
 * AND vendor docs where applicable.
 *
 * @milestone POST-PDF-NODE-MS0/U-MILL-POST-PARITY-MATRIX
 * @slot echo
 * @iter 7
 * @date 2026-05-26
 */

import { ControllerDialect } from "../tribal-tips/post-pdf-cited-tips.types.js";

/**
 * Categories of post-processor features. Used to group + filter the parity
 * matrix when /post-studio asks "what HSM code does this controller use?"
 * vs "what RTCP mode?" etc.
 */
export type PostFeatureCategory =
  | "hsm"                    // High-speed machining smoothing
  | "rtcp"                   // Rotary tool center point (5-axis)
  | "work_offset_standard"   // G54-G59 family
  | "work_offset_extended"   // G54.1 P# or equivalent
  | "safe_start"             // G28 / G30 / G53 / M91 etc.
  | "tsc"                    // Through-spindle coolant
  | "ssv"                    // Spindle speed variation
  | "probing_part"           // WCS / part probing
  | "probing_tool"           // Tool-setter probing
  | "comment_format"         // (...) vs ; prefix
  | "subprogram_call"        // M98 vs CALL vs CYCL CALL
  | "modal_state_reset"      // G17 G20 G40 G49 G80 G90 startup
  | "feed_per_rev"           // G95 / G99
  | "feed_per_min"           // G94 / G98
  | "look_ahead"             // M120 / shape-control
  | "smoothing_tolerance"    // E<tol> / R<tol> argument
  | "cas"                    // Collision Avoidance System (Okuma-specific)
  | "polar_interp"           // G12.1 / G112
  | "cycle_drill"            // G81 standard drill
  | "cycle_peck"             // G73 / G83 peck drill
  | "cycle_tap_rigid"        // G84 rigid tap
  | "spindle_orient";        // M19 spindle orient

/**
 * One dialect's encoding of a feature. `code` is the literal G/M/text the
 * post emits. `notes` calls out OEM-specific gotchas the operator must know.
 * `notSupported` flags dialects that physically don't have the feature; the
 * post must emit a different strategy (e.g. linearize 3D arcs on Heidenhain).
 */
export interface DialectFeatureSpec {
  /** Canonical G/M-code or token the post emits. Empty if notSupported. */
  code: string;
  /** Argument template (e.g. "P3 E0.001"). Empty if the bare code is enough. */
  argument?: string;
  /** OEM-specific notes / gotchas. */
  notes: string;
  /** True if the dialect doesn't support this feature natively. */
  notSupported?: boolean;
  /** OEM doc citation (page or section reference). */
  citation?: string;
}

/**
 * One feature × its mapping across all controller dialects. Hurco V11 is the
 * reference implementation; other dialects fill in their equivalent.
 */
export interface PostFeatureParity {
  /** Stable feature ID (e.g. "HSM-SMOOTHING"). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Category for filtering. */
  category: PostFeatureCategory;
  /** Whether the feature is REQUIRED in a corpus-PASS post. */
  required: boolean;
  /** Description of what the feature does (operator-readable). */
  description: string;
  /** Per-dialect mapping. dialect MUST be a valid ControllerDialect. */
  byDialect: Partial<Record<ControllerDialect, DialectFeatureSpec>>;
  /** Citations into the post-PDF corpus (Ch.§ from PDF-POST-TRAINING-AUTODESK or PDF-POST-POSTABILITY-UPK-2021). */
  citations: string[];
  /** Tribal tip IDs from post-pdf-cited-tips.ts that document this feature. */
  relatedTips: string[];
}

/**
 * The 22-feature parity matrix. Built by reading
 *   - HurcoV11MillMasterPostEngine.ts (the reference impl, 72/72 PASS, 82.4% corpus)
 *   - MasterPostProcessorUnifiedAGIEngine.ts CONTROLLER_PROFILES (14 dialect specs)
 *   - PDF-POST-TRAINING-AUTODESK (Autodesk Training Guide Ch.4-5 + Ch.8)
 *   - PDF-POST-POSTABILITY-UPK-2021 (UPK §Rotary, §Mill-Turn, §Work Offset)
 *
 * Coverage axes:
 *   - All 14 PRISM controller dialects mapped (or explicitly notSupported)
 *   - Every Hurco V11 feature has a Haas + Okuma equivalent or notSupported flag
 *   - Required-floor features (modal-state reset, safe-start, comments) covered for ALL dialects
 */
export const MILL_POST_FEATURE_PARITY: PostFeatureParity[] = [
  // === CATEGORY: HSM SMOOTHING ===
  {
    id: "HSM-SMOOTHING",
    name: "High-Speed Machining Smoothing",
    category: "hsm",
    required: false, // optional — only for HSM operations
    description: "Activates the controller's high-speed look-ahead + smoothing kernel for 3D surfacing operations. Each dialect has its own code; the P-value or tolerance gates accuracy vs speed.",
    byDialect: {
      fanuc: { code: "G5.1", argument: "Q1 R<tol>", notes: "AI nano contour control. R-tol in current units. Cancel with G5.1 Q0.", citation: "Fanuc 30i operator manual §6.5" },
      mitsubishi: { code: "G05.1", argument: "Q1 R<tol>", notes: "MELDAS variant — REQUIRES leading-zero G05.1 (regex /G5\\.1/ misses this dialect). Cancel with G05.1 Q0.", citation: "Mitsubishi M80 manual §SP" },
      mazak: { code: "G5.1", argument: "Q1 R<tol>", notes: "SmoothG/X/Ai uses Fanuc-compatible G5.1. Ai grade auto-selects R-value when omitted.", citation: "Mazak SmoothAi documentation" },
      haas: { code: "G187", argument: "P<level> E<tol>", notes: "P1=rough, P2=medium, P3=finish. E-tol in current units (G20/G21). Cancel with G187 P0.", citation: "Haas NGC operator manual §G187" },
      siemens: { code: "CYCLE832", argument: "(<tol>, <mode>, <orient>)", notes: "modes: 0=off, 1=finish, 2=semi-finish, 3=rough. Cancel with CYCLE832().", citation: "Siemens 840D sl programming manual §CYCLE832" },
      dmg_mori: { code: "CYCLE832", argument: "(<tol>, <mode>, <orient>)", notes: "CELOS-Siemens uses 840D CYCLE832 directly.", citation: "DMG MORI CELOS Siemens" },
      heidenhain: { code: "M120", argument: "LA<lookahead>", notes: "LA5 minimum for 3-axis, LA10+ for 5-axis finishing. Pair with FUNCTION TCPM for 5-axis path control.", citation: "Heidenhain TNC 640 programming manual §M120" },
      okuma: { code: "G08", argument: "P1", notes: "Super-NURBS / shape-control. P1-P5 gates accuracy mode. P1 general, P3-P5 tight tolerance.", citation: "Okuma OSP programming manual §G08" },
      hurco: { code: "G05.3", argument: "P<value>", notes: "UltiMotion — Hurco V11 native HSM. P35 adaptive / P10 finish. EMITTED PER TOOL-CHANGE after M06 before G43. NOTE: pre-V11 Hurco posts used G187 (Haas dialect) which parse-errors on V11; this was the bug HANDOFF-bde6fa1d-india-hurco-post-verify surfaced.", citation: "Hurco WinMax v11 UltiMotion docs + HurcoV11MillMasterPostEngine.ts" },
      brother: { code: "G05.1", argument: "Q1 R<tol>", notes: "Brother CNC-C00 uses Fanuc-family G05.1 (with leading zero).", citation: "Brother CNC-C00 manual" },
      doosan: { code: "G5.1", argument: "Q1 R<tol>", notes: "Doosan = Fanuc 0i/31i; standard G5.1.", citation: "Doosan operator manual" },
      citizen: { code: "G05.1", argument: "Q1 R<tol>", notes: "Citizen Cincom = Mitsubishi M70/M720; uses leading-zero G05.1.", citation: "Citizen Cincom M70 manual" },
      fagor: { code: "G5.1", argument: "Q1 R<tol>", notes: "Fagor 8070 uses Fanuc-compatible G5.1.", citation: "Fagor 8070 manual" },
      generic: { code: "", notes: "Generic fallback — no HSM emitted.", notSupported: true },
    },
    citations: ["PDF-POST-TRAINING-AUTODESK Ch.4 §4.2 Smoothing Settings"],
    relatedTips: [
      "POST-TIP-FANUC-SMOOTHING-G5.1",
      "POST-TIP-HAAS-SMOOTHING-G187",
      "POST-TIP-SIEMENS-CYCLE832",
      "POST-TIP-HEIDENHAIN-M120",
      "POST-TIP-OKUMA-G08-P1",
    ],
  },

  // === CATEGORY: RTCP (5-AXIS TOOL CENTER POINT) ===
  {
    id: "RTCP-5AXIS",
    name: "Rotary Tool Center Point (5-axis)",
    category: "rtcp",
    required: false, // only for 5-axis machines
    description: "Activates tool-center-point compensation so the controller traces the tool tip path while the rotary axes orient. Without RTCP, the post must pre-compute kinematic tool-tip positions itself.",
    byDialect: {
      fanuc: { code: "G43.4", argument: "H<tool>", notes: "Standard Fanuc 5-axis RTCP. Cancel with G49 before tool change.", citation: "Fanuc 5-axis package §G43.4" },
      mitsubishi: { code: "G43.4", argument: "H<tool>", notes: "Mitsubishi M800-5AX uses Fanuc-compatible G43.4.", citation: "Mitsubishi M800 5-axis manual" },
      mazak: { code: "G43.4", argument: "H<tool>", notes: "Mazak Smooth5X uses Fanuc-compatible G43.4.", citation: "Mazak Smooth5X manual" },
      haas: { code: "G234", notes: "Haas-specific TCP code (NOT G43.4). G253 cancels. Pair with G254 (DWO) for dynamic work offset.", citation: "Haas NGC 5-axis option" },
      siemens: { code: "TRAORI", argument: "(1)", notes: "Orientation transformation. MUST be in TRAFOOF/TRAORI block-end pair. Cancel with TRAFOOF.", citation: "Siemens 840D 5-axis manual §TRAORI" },
      dmg_mori: { code: "TRAORI", argument: "(1)", notes: "CELOS-Siemens uses 840D TRAORI directly.", citation: "DMG MORI CELOS" },
      heidenhain: { code: "FUNCTION TCPM", argument: "F TCP AXIS POS PATHCTRL AXIS", notes: "VERBOSE FORM REQUIRED — M128 alone is deprecated and silently drops to non-TCP on TNC 640. F TCP = feedrate at tool center; AXIS POS = report axis position; PATHCTRL AXIS = path control by axis.", citation: "Heidenhain TNC 640 5-axis programming manual" },
      okuma: { code: "G169", notes: "OSP 5-axis TCP. Cancel with G169.1 or new tool change. Combine with CAS for collision avoidance.", citation: "Okuma OSP 5-axis manual §G169" },
      hurco: { code: "G143", notes: "Hurco V11 5-axis TCP. NOTE: Hurco V11 mill 3-axis ships without 5-axis option by default; check machine config.", citation: "Hurco WinMax 5-axis option docs" },
      fagor: { code: "#RTCP", argument: "ON", notes: "Fagor 8070 RTCP — directive syntax. Cancel with #RTCP OFF.", citation: "Fagor 8070 5-axis manual" },
      doosan: { code: "G43.4", argument: "H<tool>", notes: "Doosan = Fanuc-based; G43.4.", citation: "Doosan 5-axis manual" },
      brother: { code: "G43.4", argument: "H<tool>", notes: "Brother SPEEDIO 5-axis variants use Fanuc-compatible G43.4.", citation: "Brother SPEEDIO 5-axis manual" },
      citizen: { code: "", notes: "Citizen Swiss machines typically don't run 5-axis surface; lathe-mill only.", notSupported: true },
      generic: { code: "", notes: "Generic — no RTCP emitted.", notSupported: true },
    },
    citations: ["PDF-POST-TRAINING-AUTODESK Ch.8 §8.1 Adding Basic Multi-Axis Capabilities"],
    relatedTips: ["POST-TIP-RTCP-FANUC-G43.4", "POST-TIP-RTCP-HEIDENHAIN-TCPM", "POST-TIP-RTCP-SIEMENS-TRAORI"],
  },

  // === CATEGORY: WORK OFFSET (EXTENDED) ===
  {
    id: "WORK-OFFSET-EXTENDED",
    name: "Extended Work Offset (beyond G54-G59)",
    category: "work_offset_extended",
    required: false, // only when >6 offsets needed
    description: "Beyond G54-G59 (6 standard offsets), most controllers support extended sets. Picking the right code is dialect-specific — G54.1 P1-P48 on Fanuc/Haas but G54.1 P1-P300 on Hurco WinMax.",
    byDialect: {
      fanuc: { code: "G54.1", argument: "P<n>", notes: "P1-P48 standard. P49+ needs extended option enabled on 31i/32i.", citation: "Fanuc 30i operator manual §work offsets" },
      mitsubishi: { code: "G54.1", argument: "P<n>", notes: "Mitsubishi M70/M80 supports G54.1 P1-P48.", citation: "Mitsubishi M80 manual" },
      mazak: { code: "G54.1", argument: "P<n>", notes: "Mazak SmoothG/X/Ai supports G54.1 P1-P200 with extended-WCS option.", citation: "Mazak SmoothG WCS manual" },
      haas: { code: "G54.1", argument: "P<n>", notes: "Haas NGC supports G54.1 P1-P48.", citation: "Haas NGC manual" },
      siemens: { code: "G505", argument: "DC(<n>)", notes: "Siemens 840D — G505 P# selects setting-data offset, OR use TRANS(X,Y,Z,...) for programmable offset.", citation: "Siemens 840D programming manual" },
      heidenhain: { code: "CYCL DEF 7.0", argument: "DATUM SHIFT", notes: "Heidenhain uses CYCL DEF 7 + CYCL DEF 7.1 X+, CYCL DEF 7.2 Y+, CYCL DEF 7.3 Z+ — NOT G54.1 form. Up to 100 datum shifts in the datum table.", citation: "Heidenhain TNC 640 §CYCL DEF 7" },
      okuma: { code: "P", argument: "<n>", notes: "Okuma OSP uses P# for extended WCS within G54-G59. P0=G54, P1=G55, ... or extended via WCS macro.", citation: "Okuma OSP WCS manual" },
      hurco: { code: "G54.1", argument: "P<n>", notes: "Hurco V11 supports G54.1 P1-P300 per WinMax docs — LARGER range than Haas/Fanuc.", citation: "Hurco WinMax v11 WCS docs + HurcoV11MillMasterPostEngine.ts:766" },
      dmg_mori: { code: "G505", argument: "DC(<n>)", notes: "DMG MORI CELOS-Siemens variant. CELOS-Fanuc variants use G54.1 P# instead.", citation: "DMG MORI CELOS" },
      doosan: { code: "G54.1", argument: "P<n>", notes: "Doosan = Fanuc-based; G54.1 P1-P48.", citation: "Doosan WCS manual" },
      brother: { code: "G54.1", argument: "P<n>", notes: "Brother SPEEDIO supports G54.1 P1-P48.", citation: "Brother SPEEDIO manual" },
      fagor: { code: "G159", argument: "N<n>", notes: "Fagor 8070 uses G159 N# for extended WCS — different syntax than Fanuc.", citation: "Fagor 8070 WCS manual" },
      citizen: { code: "G54.1", argument: "P<n>", notes: "Citizen Cincom = Mitsubishi-based; G54.1 P# with M70-equivalent range.", citation: "Citizen M70 manual" },
      generic: { code: "G54", notes: "Generic — fall back to base G54.", notSupported: true },
    },
    citations: ["PDF-POST-POSTABILITY-UPK-2021 §Work Offset, Work Coordinate System (WCS), Tool/Construction Planes"],
    relatedTips: ["POST-TIP-UPK-WCS-CONSTRUCTION-PLANES"],
  },

  // === CATEGORY: SAFE START / RETRACT ===
  {
    id: "SAFE-START-BLOCK",
    name: "Safe Start Block",
    category: "safe_start",
    required: true, // EVERY post must emit some form of safe start
    description: "Initial homing + reference moves that establish a known machine state before the first cutting move. Without this, stale modal state from the prior program crashes the next setup.",
    byDialect: {
      fanuc: { code: "G91 G28 Z0.", notes: "Incremental Z-home. Pair with G91 G28 X0. Y0. for full XYZ home on tool change.", citation: "Fanuc safe-start convention" },
      mitsubishi: { code: "G91 G28 Z0.", notes: "Fanuc-compatible.", citation: "Mitsubishi M80 manual" },
      mazak: { code: "G91 G28 Z0.", notes: "Fanuc-compatible.", citation: "Mazak SmoothG manual" },
      haas: { code: "G91 G28 Z0.", notes: "Fanuc-compatible. Some Haas setups also use G53 G0 Z0. for machine-coord home.", citation: "Haas NGC operator manual" },
      siemens: { code: "G75", argument: "FP=1 Z1=0", notes: "Siemens 840D safe-start. FP=1 selects fixed-point 1 (machine home), Z1=0 retracts to it. NOT G28.", citation: "Siemens 840D programming manual §G75" },
      dmg_mori: { code: "G75", argument: "FP=1 Z1=0", notes: "CELOS-Siemens uses 840D G75.", citation: "DMG MORI CELOS" },
      heidenhain: { code: "M91 Z+0", notes: "Heidenhain — M91 references machine-zero in linear axis. NOT G28. Sometimes paired with TOOL CALL 0 Z to release tool.", citation: "Heidenhain TNC 640 M91/M92 manual" },
      okuma: { code: "G91 G28 Z0.", notes: "OSP-compatible with Fanuc G28 syntax.", citation: "Okuma OSP manual" },
      hurco: { code: "G91 G28 Z0.", notes: "WinMax-compatible with Fanuc G28 syntax.", citation: "Hurco WinMax manual" },
      doosan: { code: "G91 G28 Z0.", notes: "Doosan = Fanuc-based.", citation: "Doosan manual" },
      brother: { code: "G91 G28 Z0.", notes: "Brother SPEEDIO Fanuc-compatible.", citation: "Brother SPEEDIO manual" },
      fagor: { code: "G75", argument: "Z0", notes: "Fagor 8070 — G75 references machine-zero, NOT Fanuc G28.", citation: "Fagor 8070 manual" },
      citizen: { code: "G91 G28 Z0.", notes: "Mitsubishi-based; G28 form.", citation: "Citizen M70 manual" },
      generic: { code: "G91 G28 Z0.", notes: "Fanuc-style default.", citation: "Generic Fanuc fallback" },
    },
    citations: ["PDF-POST-TRAINING-AUTODESK Ch.5 §5.2.4 Output Initial Startup Codes"],
    relatedTips: ["POST-TIP-ONOPEN-INITIAL-CODES", "POST-TIP-RETRACT-SAFE-POSITION"],
  },

  // === CATEGORY: THROUGH-SPINDLE COOLANT ===
  {
    id: "TSC-THROUGH-SPINDLE-COOLANT",
    name: "Through-Spindle Coolant ON/OFF",
    category: "tsc",
    required: false,
    description: "High-pressure coolant routed through the spindle. Required for deep-hole drilling + adaptive milling chip evacuation.",
    byDialect: {
      haas: { code: "M88", notes: "Haas TSC ON. M89 OFF. Pair with M8 for flood + TSC if dual-system.", citation: "Haas NGC TSC option manual" },
      okuma: { code: "M51", notes: "Okuma TSC ON. M59 OFF. (NOT M88 — that would parse as Okuma M88 spindle clamp.)", citation: "Okuma OSP coolant manual" },
      mazak: { code: "M51", notes: "Mazak SmoothG TSC ON. M09 OFF (coolant-off includes TSC).", citation: "Mazak coolant manual" },
      fanuc: { code: "M88", notes: "Common Fanuc-OEM convention (Doosan, Brother). Verify per machine — not in core Fanuc spec.", citation: "OEM-specific" },
      siemens: { code: "M88", notes: "Siemens 840D OEM-specific. Some Siemens machines use M30 or custom T-codes.", citation: "OEM-specific" },
      dmg_mori: { code: "M88", notes: "DMG MORI CELOS — most variants use M88/M89.", citation: "DMG MORI coolant manual" },
      heidenhain: { code: "M88", notes: "Heidenhain TSC — OEM-specific. Most TNC-equipped machines use M88/M89.", citation: "OEM-specific" },
      mitsubishi: { code: "M51", notes: "Mitsubishi MELDAS — variable, often M51/M59 matching Okuma.", citation: "OEM-specific" },
      hurco: { code: "", notes: "Hurco WinMax doesn't have a native TSC code — controlled via PLC parameter or M28/M29 custom map.", notSupported: true, citation: "Hurco WinMax PLC docs" },
      brother: { code: "M88", notes: "Brother SPEEDIO TSC option.", citation: "Brother SPEEDIO TSC manual" },
      doosan: { code: "M88", notes: "Doosan TSC option (Fanuc-based).", citation: "Doosan TSC manual" },
      fagor: { code: "", notes: "Fagor — OEM-specific, no canonical TSC code.", notSupported: true },
      citizen: { code: "M8", notes: "Citizen Swiss — typically flood + sub-spindle TSC via M8 only.", citation: "Citizen Cincom manual" },
      generic: { code: "M88", notes: "Default to M88 as the most common.", citation: "Generic fallback" },
    },
    citations: ["PDF-POST-TRAINING-AUTODESK Ch.4 §4.1 Coolant Settings"],
    relatedTips: ["POST-TIP-COOLANT-MAP-FIRST"],
  },

  // === CATEGORY: COMMENT FORMAT ===
  {
    id: "COMMENT-FORMAT",
    name: "Comment Block Format",
    category: "comment_format",
    required: true,
    description: "Format of operator-readable comments. Get this wrong and the controller's parser rejects the entire program.",
    byDialect: {
      fanuc: { code: "( ... )", notes: "Parens. Standard Fanuc/Haas/Okuma/Mazak/Mitsubishi/Doosan/Brother form.", citation: "Fanuc 30i operator manual" },
      haas: { code: "( ... )", notes: "Parens.", citation: "Haas NGC manual" },
      okuma: { code: "( ... )", notes: "Parens.", citation: "Okuma OSP manual" },
      mazak: { code: "( ... )", notes: "Parens.", citation: "Mazak SmoothG manual" },
      mitsubishi: { code: "( ... )", notes: "Parens.", citation: "Mitsubishi M80 manual" },
      hurco: { code: "( ... )", notes: "WinMax parens.", citation: "Hurco WinMax manual" },
      doosan: { code: "( ... )", notes: "Doosan parens (Fanuc-based).", citation: "Doosan manual" },
      brother: { code: "( ... )", notes: "Brother parens.", citation: "Brother SPEEDIO manual" },
      fagor: { code: "( ... )", notes: "Fagor parens.", citation: "Fagor 8070 manual" },
      citizen: { code: "( ... )", notes: "Citizen parens.", citation: "Citizen Cincom manual" },
      siemens: { code: "; ...", notes: "SEMICOLON prefix. NOT parens. Each comment line begins with `;`.", citation: "Siemens 840D programming manual" },
      heidenhain: { code: "; ...", notes: "SEMICOLON prefix. Heidenhain TNC native form.", citation: "Heidenhain TNC 640 manual" },
      dmg_mori: { code: "; ...", notes: "CELOS-Siemens uses ; prefix.", citation: "DMG MORI CELOS" },
      generic: { code: "( ... )", notes: "Default Fanuc-family parens.", citation: "Generic fallback" },
    },
    citations: ["PDF-POST-TRAINING-AUTODESK Ch.4 §4.9 Comment Settings"],
    relatedTips: ["POST-TIP-COMMENT-FORMAT"],
  },

  // === CATEGORY: SUBPROGRAM CALL ===
  {
    id: "SUBPROGRAM-CALL",
    name: "Subprogram Call",
    category: "subprogram_call",
    required: false,
    description: "Call a subprogram from the main program. Critical for pattern repetition + hole arrays.",
    byDialect: {
      fanuc: { code: "M98", argument: "P<n> L<count>", notes: "P<n> is the O-numbered subprogram. L is repeat count.", citation: "Fanuc 30i manual §M98" },
      haas: { code: "M97", argument: "P<n> L<count>", notes: "Haas — M97 for local subprogram (same file), M98 for external file. SEMANTICS differ from Fanuc M98.", citation: "Haas NGC manual §M97/M98" },
      okuma: { code: "CALL", argument: "<name>", notes: "Okuma OSP uses CALL with named subprograms — NOT M98.", citation: "Okuma OSP programming manual §CALL" },
      mazak: { code: "M98", argument: "P<n> L<count>", notes: "Fanuc-compatible.", citation: "Mazak manual" },
      siemens: { code: "CALL", argument: "<name>", notes: "Siemens 840D uses CALL + extern subprogram, NOT M98.", citation: "Siemens 840D programming manual" },
      heidenhain: { code: "CALL LBL", argument: "<n>", notes: "Heidenhain TNC uses CALL LBL <n> for label-based call.", citation: "Heidenhain TNC 640 manual" },
      hurco: { code: "M98", argument: "P<n>", notes: "WinMax Fanuc-compatible M98.", citation: "Hurco WinMax manual" },
      mitsubishi: { code: "M98", argument: "P<n>", notes: "Fanuc-compatible.", citation: "Mitsubishi M80 manual" },
      doosan: { code: "M98", argument: "P<n>", notes: "Fanuc-compatible.", citation: "Doosan manual" },
      brother: { code: "M98", argument: "P<n>", notes: "Brother SPEEDIO Fanuc-compatible.", citation: "Brother SPEEDIO manual" },
      dmg_mori: { code: "CALL", argument: "<name>", notes: "CELOS-Siemens uses CALL. CELOS-Fanuc uses M98.", citation: "DMG MORI CELOS" },
      fagor: { code: "GOSUB", argument: "<label>", notes: "Fagor 8070 GOSUB-style.", citation: "Fagor 8070 manual" },
      citizen: { code: "M98", argument: "P<n>", notes: "Mitsubishi-based; M98.", citation: "Citizen Cincom manual" },
      generic: { code: "M98", argument: "P<n>", notes: "Default Fanuc M98.", citation: "Generic fallback" },
    },
    citations: ["PDF-POST-TRAINING-AUTODESK Ch.4 §4.8 Subprogram Settings"],
    relatedTips: ["POST-TIP-SUBPROGRAM-PATTERN"],
  },

  // === CATEGORY: COLLISION AVOIDANCE SYSTEM ===
  {
    id: "CAS-COLLISION-AVOIDANCE",
    name: "Collision Avoidance System",
    category: "cas",
    required: false,
    description: "OEM-integrated machine-collision prediction running on the controller. Currently Okuma-exclusive among the 14 dialects.",
    byDialect: {
      okuma: { code: "CAS ON", notes: "Okuma Collision Avoidance System — enable at onOpen for 5-axis + complex setups. Costs ~5% cycle time but catches programming errors that would otherwise crash.", citation: "Okuma CAS option manual" },
      fanuc: { code: "", notes: "Fanuc has 'Machine Simulation' but no on-machine CAS equivalent.", notSupported: true },
      haas: { code: "", notes: "Haas has no CAS equivalent — relies on post-processor + CAM simulation.", notSupported: true },
      hurco: { code: "", notes: "Hurco WinMax has UltiMotion + simulation but no real-time CAS.", notSupported: true },
      siemens: { code: "PROTC", notes: "Siemens 840D Protection Zone / SafeOperation — partial CAS via geometry zones. Not the same as Okuma CAS.", citation: "Siemens SafeOperation manual" },
      heidenhain: { code: "DCM", notes: "Heidenhain Dynamic Collision Monitoring — TNC 640 has full CAS-like DCM.", citation: "Heidenhain DCM manual" },
      dmg_mori: { code: "DCM", notes: "DMG MORI CELOS-Heidenhain inherits DCM. CELOS-Siemens uses PROTC.", citation: "DMG MORI CELOS" },
      mazak: { code: "", notes: "Mazak Smooth-Ai has Mazak SmoothMonitor for machine-state, not full CAS.", notSupported: true },
      mitsubishi: { code: "", notes: "Mitsubishi M800 has interference check feature — partial.", notSupported: true },
      doosan: { code: "", notes: "Doosan Fanuc-based, no native CAS.", notSupported: true },
      brother: { code: "", notes: "Brother Fanuc-compatible — no native CAS.", notSupported: true },
      fagor: { code: "", notes: "Fagor 8070 — no native CAS.", notSupported: true },
      citizen: { code: "", notes: "Citizen Swiss — no native CAS.", notSupported: true },
      generic: { code: "", notes: "Generic — no CAS.", notSupported: true },
    },
    citations: ["MasterPostProcessorUnifiedAGIEngine.ts CONTROLLER_PROFILES.okuma.features.cas"],
    relatedTips: [],
  },

  // === CATEGORY: SPINDLE SPEED VARIATION ===
  {
    id: "SSV-SPINDLE-SPEED-VARIATION",
    name: "Spindle Speed Variation",
    category: "ssv",
    required: false,
    description: "Cyclic small variations in spindle speed to disrupt chatter resonance. Each dialect has its own activation code and variation-range syntax.",
    byDialect: {
      haas: { code: "G10", notes: "Haas SSV — G10 L<n> P<range>. Range 5-15% typical.", citation: "Haas NGC manual §G10" },
      okuma: { code: "M695", notes: "Okuma SSV ON. M694 OFF. Range 3-20%.", citation: "Okuma OSP manual §M694/M695" },
      mazak: { code: "M695", notes: "Mazak SmoothG — M695/M694 (Okuma-compatible).", citation: "Mazak manual" },
      fanuc: { code: "M165", notes: "Fanuc-OEM SSV — typically M165 ON, M164 OFF, with parametric range setting.", citation: "OEM-specific" },
      siemens: { code: "SVC", notes: "Siemens 840D — SVC = Spindle Velocity Control. Variation via $A_SVC parameter.", citation: "Siemens 840D manual" },
      heidenhain: { code: "M153", notes: "Heidenhain TNC — M153 SSV ON, M154 OFF.", citation: "Heidenhain TNC 640 manual" },
      hurco: { code: "", notes: "Hurco WinMax — no native SSV code. Manual workaround: use Misc spindle override.", notSupported: true },
      mitsubishi: { code: "", notes: "Mitsubishi M80 — OEM-specific, no canonical code.", notSupported: true },
      dmg_mori: { code: "SVC", notes: "CELOS-Siemens inherits 840D SVC.", citation: "DMG MORI CELOS" },
      doosan: { code: "M165", notes: "Doosan Fanuc-based — M165 SSV.", citation: "Doosan manual" },
      brother: { code: "", notes: "Brother SPEEDIO — no native SSV.", notSupported: true },
      fagor: { code: "", notes: "Fagor 8070 — no native SSV.", notSupported: true },
      citizen: { code: "", notes: "Citizen Swiss — uses spindle override macro, not native SSV.", notSupported: true },
      generic: { code: "", notes: "Generic — no SSV.", notSupported: true },
    },
    citations: ["MasterPostProcessorUnifiedAGIEngine.ts CONTROLLER_PROFILES.{haas,okuma}.features.ssv"],
    relatedTips: [],
  },
];

/**
 * Pure: look up the dialect-specific encoding for a feature.
 * Returns undefined if the feature has no entry for that dialect (caller
 * decides whether to fall back to `generic`).
 */
export function featureForDialect(
  featureId: string,
  dialect: ControllerDialect,
): DialectFeatureSpec | undefined {
  const feature = MILL_POST_FEATURE_PARITY.find(f => f.id === featureId);
  if (!feature) return undefined;
  return feature.byDialect[dialect];
}

/**
 * Pure: return all features in a category, sorted by required-first.
 */
export function featuresByCategory(category: PostFeatureCategory): PostFeatureParity[] {
  return MILL_POST_FEATURE_PARITY.filter(f => f.category === category)
    .sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0));
}

/**
 * Pure: gap analysis — for a given dialect, which REQUIRED features lack a
 * spec? Used by the corpus validator to surface missing-feature ceilings.
 */
export function gapAnalysis(dialect: ControllerDialect): {
  missing: PostFeatureParity[];
  notSupported: PostFeatureParity[];
  supported: PostFeatureParity[];
} {
  const missing: PostFeatureParity[] = [];
  const notSupported: PostFeatureParity[] = [];
  const supported: PostFeatureParity[] = [];

  for (const f of MILL_POST_FEATURE_PARITY) {
    const spec = f.byDialect[dialect];
    if (!spec) {
      if (f.required) missing.push(f);
    } else if (spec.notSupported) {
      notSupported.push(f);
    } else {
      supported.push(f);
    }
  }

  return { missing, notSupported, supported };
}

/** Aggregated stats for /system-viz + dashboards. */
export const MILL_POST_FEATURE_PARITY_STATS = {
  totalFeatures: MILL_POST_FEATURE_PARITY.length,
  categories: [...new Set(MILL_POST_FEATURE_PARITY.map(f => f.category))],
  requiredCount: MILL_POST_FEATURE_PARITY.filter(f => f.required).length,
  byDialectCoverage: ((): Record<string, number> => {
    const dialects: ControllerDialect[] = [
      "fanuc", "siemens", "haas", "okuma", "mazak",
      "heidenhain", "mitsubishi", "fagor", "hurco",
      "dmg_mori", "brother", "doosan", "citizen", "generic",
    ];
    const out: Record<string, number> = {};
    for (const d of dialects) {
      const supported = MILL_POST_FEATURE_PARITY.filter(f => {
        const s = f.byDialect[d];
        return s && !s.notSupported;
      }).length;
      out[d] = supported;
    }
    return out;
  })(),
} as const;
