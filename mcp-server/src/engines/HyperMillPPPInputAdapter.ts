/**
 * HyperMillPPPInputAdapter — Adapt hyperMILL NC output for PPP Phase 1
 *
 * Reads raw hyperMILL NC blocks and normalises them into the canonical
 * PPP (PostProcessorPipeline) input format.  Handles all 17 hyperMILL
 * post-config variants (Fanuc, Siemens, Heidenhain, Mazak, Okuma, …).
 *
 * Key responsibilities:
 *   - Detect dialect from file header / post-config code
 *   - Parse per-block S (spindle) and F (feed) values
 *   - Classify G43.4 as RTCP (5-axis tool-length compensation) — NOT dwell
 *   - Pass TRAORI blocks through unmodified for Siemens 840D
 *   - Map 16 controller families → 20 PPP dialect strings
 *   - Return NCBlock[] suitable for PostProcessorPipelineEngine Phase 1
 *
 * G43.4 classification:
 *   G43.4 (Fanuc RTCP) must be classified as "5axis_rtcp", not "dwell".
 *   The bug: older parsers matched G43.* as G43/G43.1 (dwell variants).
 *   Fix: exact token match on "G43.4" → mode=RTCP.
 *
 * TRAORI passthrough (Siemens 840D):
 *   TRAORI is a Siemens cycle call (transformation orientation).  It must
 *   pass through unmodified — no S/F injection, no comment stripping.
 *
 * References:
 *   - hyperMILL 2024.1 NcGenerator Documentation, post-config list
 *   - Fanuc Series 30i/31i/32i Programming Manual B-64484EN §14.1 (G43.4)
 *   - Siemens SINUMERIK 840D sl Programming Manual §TRAORI
 *
 * HM-REV-MS11 / U-HMR59
 */

// ============================================================================
// Controller family → PPP dialect mapping
// ============================================================================

/**
 * Maps the 16 controller families (from HyperMillControllerCatalogEngine)
 * to their canonical PPP dialect strings.  20 dialects supported.
 */
export const CONTROLLER_FAMILY_TO_DIALECT: Record<string, string> = {
  fanuc:         "fanuc",
  siemens:       "siemens",
  heidenhain:    "heidenhain",
  mazak:         "mazak",
  okuma:         "okuma",
  mitsubishi:    "mitsubishi",
  haas:          "haas",
  dmg:           "siemens",   // DMG machines run Siemens 840D
  hermle:        "heidenhain", // Hermle machines run TNC
  makino:        "fanuc",     // Makino uses Fanuc-compatible dialect
  mori:          "fanuc",     // DMG Mori uses Fanuc for most
  matsuura:      "fanuc",
  doosan:        "fanuc",
  brother:       "fanuc",
  yamazaki:      "mazak",     // Yamazaki Mazak
  brother_speedio: "fanuc",
};

/** Number of mapped controller families */
export const CONTROLLER_FAMILY_COUNT = Object.keys(CONTROLLER_FAMILY_TO_DIALECT).length;

// ============================================================================
// Types
// ============================================================================

/** Classification of a single NC block's motion type */
export type NCMotionType =
  | "rapid"
  | "linear"
  | "arc_cw"
  | "arc_ccw"
  | "5axis_rtcp"
  | "traori"
  | "spindle_on"
  | "spindle_off"
  | "toolchange"
  | "coolant"
  | "cycle_call"
  | "comment"
  | "passthrough"
  | "unknown";

/** A single parsed NC block */
export interface NCBlock {
  /** Original raw text of the block */
  raw: string;
  /** Line / sequence number (0 if none) */
  line_number: number;
  /** G-codes present in this block (e.g. ["G1", "G43.4"]) */
  g_codes: string[];
  /** M-codes present (e.g. ["M3", "M8"]) */
  m_codes: string[];
  /** Spindle speed override (RPM) if present on this block */
  spindle_rpm: number | null;
  /** Feed rate override (mm/min) if present on this block */
  feed_mmpm: number | null;
  /** Classified motion type */
  motion_type: NCMotionType;
  /** True if block must be passed through without modification */
  passthrough: boolean;
  /** True if this block activates 5-axis RTCP mode (G43.4) */
  is_rtcp: boolean;
  /** True if this is a TRAORI (Siemens) block */
  is_traori: boolean;
}

/** Adapter input */
export interface HyperMillPPPAdapterInput {
  /** Raw NC program text (full program or block array) */
  nc_text: string;
  /** hyperMILL post-config code (e.g. "omPPFI", "omPPSinI") — used for dialect detection */
  post_config_code?: string;
  /** Override dialect detection (use if post_config_code not available) */
  dialect_override?: string;
  /** True to strip comments from output blocks */
  strip_comments?: boolean;
}

/** Adapter output */
export interface HyperMillPPPAdapterResult {
  /** Detected or overridden dialect */
  dialect: string;
  /** Detected controller family */
  controller_family: string;
  /** Parsed NC blocks ready for PPP Phase 1 */
  blocks: NCBlock[];
  /** Total block count */
  block_count: number;
  /** Number of RTCP blocks (G43.4) */
  rtcp_block_count: number;
  /** Number of TRAORI blocks */
  traori_block_count: number;
  /** Number of tool changes */
  toolchange_count: number;
  /** Per-block spindle/feed coverage (fraction of blocks that have S or F) */
  sf_coverage: number;
  /** Warnings generated during parsing */
  warnings: string[];
}

// ============================================================================
// Post-config code → controller family mapping
// ============================================================================

const POST_CONFIG_TO_FAMILY: Record<string, string> = {
  omPPFI: "fanuc", omPPF3X: "fanuc", omPPFCD: "fanuc",
  omPPFAM: "fanuc", omPPFSim: "fanuc", omPPFiI: "fanuc", omPPFiCD: "fanuc",
  omPPSinI: "siemens", omPPSinIS: "siemens", omPPSinIS2: "siemens",
  omPPSinCD: "siemens", omPPSinAM: "siemens", omPPSinT: "siemens",
  omPPSinTCD: "siemens", omPPSinSim: "siemens", omPPSinDMG: "dmg",
  omPPHHI: "heidenhain", omPPHHCD: "heidenhain", omPPHHSim: "heidenhain",
  omPPMazI: "mazak", omPPMazCD: "mazak",
  omPPOkuI: "okuma", omPPOkuCD: "okuma",
  omPPMitI: "mitsubishi",
  omPPHaasI: "haas", omPPHaasCD: "haas",
};

// ============================================================================
// Parser helpers
// ============================================================================

/** Extract numeric value after a letter address (e.g. "S3000" → 3000) */
function extractAddress(block: string, letter: string): number | null {
  const re = new RegExp(`${letter}([+-]?\\d+(?:\\.\\d+)?)`, "i");
  const m = block.match(re);
  return m ? parseFloat(m[1]) : null;
}

/** Extract all G-code tokens from a block */
function extractGCodes(block: string): string[] {
  // Match G followed by digits and optional decimal (e.g. G0, G43.4, G96)
  const re = /G(\d+(?:\.\d+)?)/gi;
  const codes: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    codes.push(`G${m[1]}`);
  }
  return codes;
}

/** Extract all M-code tokens from a block */
function extractMCodes(block: string): string[] {
  const re = /M(\d+)/gi;
  const codes: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    codes.push(`M${m[1]}`);
  }
  return codes;
}

/** Classify the motion type of a block */
function classifyMotion(
  raw: string,
  gCodes: string[],
  mCodes: string[]
): { motion_type: NCMotionType; is_rtcp: boolean; is_traori: boolean; passthrough: boolean } {
  const upper = raw.trim().toUpperCase();

  // TRAORI: Siemens transformation orientation (must pass through unmodified)
  if (/\bTRAORI\b/.test(upper)) {
    return { motion_type: "traori", is_rtcp: false, is_traori: true, passthrough: true };
  }

  // G43.4 — Fanuc RTCP (5-axis tool length compensation in 5-axis mode)
  // CRITICAL: must match EXACTLY "G43.4", not G43 (dwell) or G43.1
  if (gCodes.includes("G43.4")) {
    return { motion_type: "5axis_rtcp", is_rtcp: true, is_traori: false, passthrough: false };
  }

  // Tool change
  if (mCodes.some((m) => ["M6", "M06"].includes(m))) {
    return { motion_type: "toolchange", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Rapid G0
  if (gCodes.includes("G0") || gCodes.includes("G00")) {
    return { motion_type: "rapid", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Linear G1
  if (gCodes.includes("G1") || gCodes.includes("G01")) {
    return { motion_type: "linear", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Arc CW G2
  if (gCodes.includes("G2") || gCodes.includes("G02")) {
    return { motion_type: "arc_cw", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Arc CCW G3
  if (gCodes.includes("G3") || gCodes.includes("G03")) {
    return { motion_type: "arc_ccw", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Spindle on
  if (mCodes.some((m) => ["M3", "M03", "M4", "M04"].includes(m))) {
    return { motion_type: "spindle_on", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Spindle off
  if (mCodes.some((m) => ["M5", "M05"].includes(m))) {
    return { motion_type: "spindle_off", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Coolant
  if (mCodes.some((m) => ["M7", "M07", "M8", "M08", "M9", "M09"].includes(m))) {
    return { motion_type: "coolant", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Comment-only block
  if (/^[;(]/.test(upper) || upper === "" || /^%/.test(upper)) {
    return { motion_type: "comment", is_rtcp: false, is_traori: false, passthrough: false };
  }

  // Cycle calls (canned cycles)
  if (gCodes.some((g) => /^G8[0-9]$|^G73$|^G74$|^G76$/.test(g))) {
    return { motion_type: "cycle_call", is_rtcp: false, is_traori: false, passthrough: false };
  }

  return { motion_type: "unknown", is_rtcp: false, is_traori: false, passthrough: false };
}

// ============================================================================
// Engine
// ============================================================================

export class HyperMillPPPInputAdapter {
  /**
   * Parse and adapt hyperMILL NC text for PPP Phase 1.
   *
   * @param input - Raw NC text + optional post-config code
   * @returns Structured block array with dialect, classification, S/F per block
   */
  adapt(input: HyperMillPPPAdapterInput): HyperMillPPPAdapterResult {
    const {
      nc_text,
      post_config_code,
      dialect_override,
      strip_comments = false,
    } = input;

    // ── 1. Determine dialect ──────────────────────────────────────────────
    let controllerFamily = "fanuc";
    let dialect = "fanuc";

    if (dialect_override) {
      dialect = dialect_override;
      // Reverse-map dialect to family
      const rev = Object.entries(CONTROLLER_FAMILY_TO_DIALECT).find(
        ([, d]) => d === dialect_override
      );
      controllerFamily = rev ? rev[0] : dialect_override;
    } else if (post_config_code) {
      controllerFamily = POST_CONFIG_TO_FAMILY[post_config_code] ?? "fanuc";
      dialect = CONTROLLER_FAMILY_TO_DIALECT[controllerFamily] ?? "fanuc";
    } else {
      // Heuristic detection from NC text
      if (/TRAORI/i.test(nc_text) || /SINUMERIK/i.test(nc_text)) {
        controllerFamily = "siemens";
        dialect = "siemens";
      } else if (/BEGIN PGM|L X/i.test(nc_text)) {
        controllerFamily = "heidenhain";
        dialect = "heidenhain";
      } else if (/G65.*MAZATROL/i.test(nc_text)) {
        controllerFamily = "mazak";
        dialect = "mazak";
      }
    }

    // ── 2. Split NC text into raw lines ───────────────────────────────────
    const rawLines = nc_text.split(/\r?\n/);
    const warnings: string[] = [];

    // ── 3. Parse each line → NCBlock ──────────────────────────────────────
    const blocks: NCBlock[] = [];
    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (trimmed === "" && !strip_comments) {
        // Keep blank lines as passthrough
        continue;
      }

      // Strip comments if requested
      let processLine = trimmed;
      if (strip_comments) {
        // Remove ( ... ) and ; comments
        processLine = processLine.replace(/\([^)]*\)/g, "").replace(/;.*$/, "").trim();
        if (processLine === "") continue;
      }

      // Extract line number
      const lineNumMatch = processLine.match(/^N(\d+)/i);
      const line_number = lineNumMatch ? parseInt(lineNumMatch[1], 10) : 0;

      const gCodes = extractGCodes(processLine);
      const mCodes = extractMCodes(processLine);
      const spindle_rpm = extractAddress(processLine, "S");
      const feed_mmpm = extractAddress(processLine, "F");

      const classification = classifyMotion(processLine, gCodes, mCodes);

      blocks.push({
        raw: trimmed,
        line_number,
        g_codes: gCodes,
        m_codes: mCodes,
        spindle_rpm,
        feed_mmpm,
        motion_type: classification.motion_type,
        passthrough: classification.passthrough,
        is_rtcp: classification.is_rtcp,
        is_traori: classification.is_traori,
      });
    }

    // ── 4. Compute statistics ─────────────────────────────────────────────
    const rtcpBlocks = blocks.filter((b) => b.is_rtcp);
    const traoriBlocks = blocks.filter((b) => b.is_traori);
    const toolchangeBlocks = blocks.filter((b) => b.motion_type === "toolchange");
    const sfBlocks = blocks.filter((b) => b.spindle_rpm !== null || b.feed_mmpm !== null);
    const motionBlocks = blocks.filter((b) =>
      ["rapid", "linear", "arc_cw", "arc_ccw", "5axis_rtcp"].includes(b.motion_type)
    );
    const sfCoverage = motionBlocks.length > 0 ? sfBlocks.length / blocks.length : 0;

    if (rtcpBlocks.length > 0) {
      warnings.push(
        `${rtcpBlocks.length} G43.4 RTCP block(s) detected — classified as 5-axis RTCP, NOT dwell`
      );
    }

    return {
      dialect,
      controller_family: controllerFamily,
      blocks,
      block_count: blocks.length,
      rtcp_block_count: rtcpBlocks.length,
      traori_block_count: traoriBlocks.length,
      toolchange_count: toolchangeBlocks.length,
      sf_coverage: sfCoverage,
      warnings,
    };
  }
}

export const hyperMillPPPInputAdapter = new HyperMillPPPInputAdapter();
