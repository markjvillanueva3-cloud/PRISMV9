/**
 * PrismAddinArchitectureEngine — Defines the PRISM Add-in ↔ CPS post processor
 * communication architecture.
 *
 * The Fusion 360 CPS runtime is sandboxed: no HTTPClient, no network calls,
 * getGlobalParameter() cannot read custom add-in attributes.
 *
 * CORRECT mechanism:
 * 1. Add-in modifies operation S/F directly via adsk.cam.Operation.parameters
 * 2. Extra physics data (force, power, confidence, tool life, stability)
 *    embedded as JSON in operation:comment
 * 3. Post reads normal spindleSpeed/feed + parses comment JSON
 *
 * Reference: data/docs/PRISM_ADDIN_DIRECT_CAM_API_SPEC.md
 */
import { z } from "zod";
import { log } from "../utils/Logger.js";

// ── Comment JSON Schema ────────────────────────────────────────────

/** Schema for PRISM physics data embedded in operation comments. */
export const PrismCommentDataSchema = z.object({
  prism: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    force_N: z.number().nonnegative().optional(),
    power_kW: z.number().nonnegative().optional(),
    confidence: z.number().min(0).max(1).optional(),
    tool_life_min: z.number().positive().optional(),
    stable_rpm_min: z.number().positive().optional(),
    stable_rpm_max: z.number().positive().optional(),
    wear_VB_mm: z.number().nonnegative().optional(),
    thermal_index: z.number().nonnegative().optional(),
    safety_score: z.number().min(0).max(1).optional(),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    kc1_1: z.number().positive().optional(),
    chip_thickness_mm: z.number().positive().optional(),
  }),
});

export type PrismCommentData = z.infer<typeof PrismCommentDataSchema>;

// ── Direct CAM Parameter Schema ─────────────────────────────────────

/** Schema for S/F values the add-in writes to operation parameters. */
export const PrismDirectParamsSchema = z.object({
  rpm: z.number().positive().describe("Spindle speed, RPM"),
  surface_speed: z.number().positive().optional().describe("Surface speed, m/min or SFM"),
  feed_per_tooth: z.number().positive().optional().describe("Feed per tooth, mm or inch"),
  feedrate: z.number().positive().describe("Cutting feedrate, mm/min or IPM"),
  plunge_feedrate: z.number().positive().optional().describe("Plunge feedrate for drilling"),
});

export type PrismDirectParams = z.infer<typeof PrismDirectParamsSchema>;

// ── Sidecar JSON Schema ─────────────────────────────────────────────

/** Schema for the sidecar JSON file exported alongside G-code. */
export const PrismSidecarSchema = z.object({
  prism_version: z.string(),
  machine: z.object({
    id: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    controller: z.string().optional(),
    max_rpm: z.number().positive().optional(),
    max_power_kW: z.number().positive().optional(),
  }).optional(),
  material: z.object({
    name: z.string().optional(),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    kc1_1: z.number().positive().optional(),
    mc: z.number().optional(),
    hardness_HRC: z.number().optional(),
  }).optional(),
  tools: z.array(z.object({
    number: z.number().int().positive(),
    diameter_mm: z.number().positive().optional(),
    flute_count: z.number().int().positive().optional(),
    type: z.string().optional(),
    material: z.string().optional(),
  })).optional(),
  operations: z.array(z.object({
    id: z.string(),
    type: z.string(),
    tool_number: z.number().int().positive(),
    prism_params: PrismDirectParamsSchema.optional(),
    prism_physics: PrismCommentDataSchema.shape.prism.optional(),
  })).optional(),
});

export type PrismSidecar = z.infer<typeof PrismSidecarSchema>;

// ── Constants ───────────────────────────────────────────────────────

const CURRENT_VERSION = "1.0.0";
const COMMENT_PREFIX = "PRISM:";
const SUPPORTED_MAJOR = 1;

// ── Engine ──────────────────────────────────────────────────────────

export class PrismAddinArchitectureEngine {

  /**
   * Serialize PRISM physics data into the comment JSON format.
   *
   * @param data - Physics data to embed
   * @returns Serialized string suitable for operation:comment field
   */
  static serializeCommentData(data: Partial<PrismCommentData["prism"]>): string {
    const payload: PrismCommentData = {
      prism: {
        version: CURRENT_VERSION,
        ...data,
      },
    };
    // Validate before serializing
    PrismCommentDataSchema.parse(payload);
    return COMMENT_PREFIX + JSON.stringify(payload);
  }

  /**
   * Parse PRISM physics data from an operation comment string.
   * Returns null if no PRISM data found or data is invalid.
   *
   * @param comment - Raw operation:comment string from CPS
   * @returns Parsed PrismCommentData or null
   */
  static parseCommentData(comment: string): PrismCommentData | null {
    if (!comment) return null;

    const prismIdx = comment.indexOf(COMMENT_PREFIX);
    if (prismIdx < 0) return null;

    try {
      const jsonStr = comment.substring(prismIdx + COMMENT_PREFIX.length);
      const parsed = JSON.parse(jsonStr);
      const validated = PrismCommentDataSchema.parse(parsed);
      return validated;
    } catch (e) {
      log.warn("Failed to parse PRISM comment data", { error: String(e), comment });
      return null;
    }
  }

  /**
   * Check if the PRISM comment data version is compatible with the current post.
   *
   * @param data - Parsed PRISM comment data
   * @returns true if compatible (same major version)
   */
  static isVersionCompatible(data: PrismCommentData): boolean {
    if (!data?.prism?.version) return false;
    const parts = data.prism.version.split(".");
    const major = parseInt(parts[0], 10);
    return major === SUPPORTED_MAJOR;
  }

  /**
   * Build the operation:comment string, appending PRISM data to existing comment.
   *
   * @param existingComment - Any existing operation comment
   * @param physicsData - PRISM physics data to append
   * @returns Combined comment string
   */
  static buildOperationComment(
    existingComment: string,
    physicsData: Partial<PrismCommentData["prism"]>,
  ): string {
    const prismStr = PrismAddinArchitectureEngine.serializeCommentData(physicsData);
    if (!existingComment) return prismStr;
    return existingComment + " | " + prismStr;
  }

  /**
   * Extract PRISM data from a combined comment string that may have
   * user text before the PRISM: prefix.
   *
   * @param comment - Combined operation comment
   * @returns Object with user comment and parsed PRISM data
   */
  static extractFromComment(comment: string): {
    userComment: string;
    prismData: PrismCommentData | null;
  } {
    if (!comment) return { userComment: "", prismData: null };

    const prismIdx = comment.indexOf(COMMENT_PREFIX);
    if (prismIdx < 0) return { userComment: comment, prismData: null };

    const userPart = comment.substring(0, prismIdx).replace(/\s*\|\s*$/, "").trim();
    const prismData = PrismAddinArchitectureEngine.parseCommentData(comment);

    return { userComment: userPart, prismData };
  }

  /**
   * Generate the CPS JavaScript code block for parsing PRISM comment data.
   * This code is embedded in generated CPS post processors.
   *
   * @returns CPS-compatible JavaScript function string
   */
  static generateCpsParserCode(): string {
    return `
// ═══ PRISM Comment Data Parser ═══
// Parses physics data from operation:comment JSON.
// Returns null when PRISM add-in is not active (fallback to normal S/F).
function parsePrismComment(section) {
  var comment = "";
  try {
    comment = getParameter("operation:comment");
  } catch (e) {
    return null;
  }
  var idx = comment.indexOf("PRISM:");
  if (idx < 0) return null;
  try {
    var jsonStr = comment.substring(idx + 6);
    var data = JSON.parse(jsonStr);
    if (!data || !data.prism || !data.prism.version) return null;
    var major = parseInt(data.prism.version.split(".")[0], 10);
    if (major !== ${SUPPORTED_MAJOR}) {
      writeComment("PRISM: version mismatch (post expects v${SUPPORTED_MAJOR}.x, got v" + major + ".x)");
      return null;
    }
    return data.prism;
  } catch (e) {
    return null;
  }
}`.trim();
  }

  /**
   * Validate that a set of direct CAM parameters are within safe ranges.
   *
   * @param params - Direct CAM parameters to validate
   * @param machineContext - Optional machine limits for clamping
   * @returns Validated and optionally clamped parameters with warnings
   */
  static validateDirectParams(
    params: PrismDirectParams,
    machineContext?: { max_rpm?: number; max_feed?: number; max_power_kW?: number },
  ): { params: PrismDirectParams; warnings: string[]; clamped: boolean } {
    const warnings: string[] = [];
    let clamped = false;
    const result = { ...params };

    // Validate against Zod schema
    PrismDirectParamsSchema.parse(params);

    // Clamp to machine limits if provided
    if (machineContext) {
      if (machineContext.max_rpm && result.rpm > machineContext.max_rpm) {
        warnings.push(`RPM ${result.rpm} exceeds machine max ${machineContext.max_rpm}, clamped`);
        result.rpm = machineContext.max_rpm;
        clamped = true;
      }
      if (machineContext.max_feed && result.feedrate > machineContext.max_feed) {
        warnings.push(`Feed ${result.feedrate} exceeds machine max ${machineContext.max_feed}, clamped`);
        result.feedrate = machineContext.max_feed;
        clamped = true;
      }
    }

    return { params: result, warnings, clamped };
  }

  /**
   * Build a sidecar JSON object for a posting session.
   *
   * @param machine - Machine context
   * @param material - Material context
   * @param tools - Tool list
   * @param operations - Operation list with physics results
   * @returns Validated PrismSidecar object
   */
  static buildSidecar(
    machine?: PrismSidecar["machine"],
    material?: PrismSidecar["material"],
    tools?: PrismSidecar["tools"],
    operations?: PrismSidecar["operations"],
  ): PrismSidecar {
    const sidecar: PrismSidecar = {
      prism_version: CURRENT_VERSION,
      machine,
      material,
      tools,
      operations,
    };
    return PrismSidecarSchema.parse(sidecar);
  }
}

export const prismAddinArchitectureEngine = new PrismAddinArchitectureEngine();
