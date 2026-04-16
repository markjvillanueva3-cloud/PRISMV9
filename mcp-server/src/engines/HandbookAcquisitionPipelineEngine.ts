/**
 * HandbookAcquisitionPipelineEngine — HBK-MS2
 * ==============================================
 * Orchestrates bulk handbook ingestion: file intake → extraction dispatch →
 * deduplication → confidence-aware merge → registry commit with rollback.
 *
 * Pipeline stages:
 * 1. Intake: validate raw text, assign batch ID, record provenance
 * 2. Extract: dispatch to HandbookExtractionEngine for structured parsing
 * 3. Deduplicate: detect existing handbook entries for same machine
 * 4. Merge: confidence-aware merge — never overwrite higher-confidence data
 * 5. Commit: validate via MachineHandbookSchema, upsert to registry
 * 6. Rollback: on validation failure, log error and skip commit
 *
 * References:
 * - HandbookExtractionEngine (HBK-MS1) — extraction pipeline
 * - MachineHandbookRegistryEngine (HBK-MS0) — storage registry
 * - ISO 841:2001 (CNC axis designation)
 */

import { z } from "zod";
import { log } from "../utils/Logger.js";
import {
  machineHandbookRegistry,
  MachineHandbookSchema,
  type MachineHandbook,
  type HandbookSectionKey,
  type SourceProvenance,
} from "./MachineHandbookRegistryEngine.js";
import {
  extractHandbook,
  type ExtractionResult,
  type SuggestedSections,
} from "./HandbookExtractionEngine.js";
import * as crypto from "crypto";

// ════════════════════════════════════════════════════════════════════
// SECTION 1: INPUT SCHEMAS (P0-U01)
// ════════════════════════════════════════════════════════════════════

/** Single handbook intake request. */
export const HandbookIntakeSchema = z.object({
  rawText: z.string().min(10).max(5_000_000).describe("Raw handbook text (PDF text, OCR output)"),
  machineId: z.string().describe("Machine ID to associate extracted data with"),
  manufacturer: z.string().describe("Machine manufacturer name"),
  model: z.string().describe("Machine model name"),
  extractionMethod: z.enum(["manual", "ocr", "table_parse", "api", "web_scrape"]).default("table_parse"),
  handbookTitle: z.string().optional().describe("Title of the source handbook"),
  firmwareVersion: z.string().optional().describe("Controller firmware version if known"),
  pageRange: z.string().optional().describe("Page range from source document (e.g. '15-42')"),
  sourceDocumentHash: z.string().optional().describe("SHA-256 hash of source document for dedup"),
});
export type HandbookIntake = z.infer<typeof HandbookIntakeSchema>;

/** Batch acquisition request. */
export const BatchAcquisitionSchema = z.object({
  intakes: z.array(HandbookIntakeSchema).min(1).max(50),
  dryRun: z.boolean().default(false).describe("If true, extract but do not commit to registry"),
  forceOverwrite: z.boolean().default(false).describe("If true, overwrite even higher-confidence data"),
});
export type BatchAcquisition = z.infer<typeof BatchAcquisitionSchema>;

// ════════════════════════════════════════════════════════════════════
// SECTION 2: RESULT TYPES
// ════════════════════════════════════════════════════════════════════

/** Result of a single acquisition. */
export interface AcquisitionResult {
  machineId: string;
  manufacturer: string;
  model: string;
  batchId: string;
  status: "committed" | "merged" | "skipped" | "failed" | "dry_run";
  handbookId: string | null;
  sectionsExtracted: string[];
  sectionsMerged: string[];
  sectionsSkipped: string[];
  quality: {
    avgConfidence: number;
    parsedLinesPct: number;
    warnings: string[];
  };
  provenance: AcquisitionProvenance;
  error?: string;
}

/** Provenance tracking for acquisition (P0-U03). */
export interface AcquisitionProvenance {
  sourceDocumentHash: string;
  extractionDate: string;
  batchId: string;
  pageRange?: string;
  firmwareVersion?: string;
  extractionMethod: string;
  revisionNumber: number;
  previousRevisionDate?: string;
}

/** Batch result. */
export interface BatchAcquisitionResult {
  batchId: string;
  startedAt: string;
  completedAt: string;
  totalIntakes: number;
  committed: number;
  merged: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  results: AcquisitionResult[];
}

// ════════════════════════════════════════════════════════════════════
// SECTION 3: ACQUISITION PIPELINE (P0-U01)
// ════════════════════════════════════════════════════════════════════

/**
 * Generate a handbook ID from manufacturer + model.
 * Deterministic: same machine always gets same ID.
 */
function generateHandbookId(manufacturer: string, model: string): string {
  const slug = `${manufacturer}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `hbk-${slug}`;
}

/**
 * Compute SHA-256 hash of raw text for deduplication.
 */
function computeDocHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Acquire a single handbook: extract → deduplicate → merge → commit.
 *
 * @param intake - Raw handbook text with metadata
 * @param batchId - Batch identifier for provenance tracking
 * @param dryRun - If true, extract but do not commit
 * @param forceOverwrite - If true, overwrite higher-confidence data
 */
export function acquireHandbook(
  intake: HandbookIntake,
  batchId: string,
  dryRun = false,
  forceOverwrite = false,
): AcquisitionResult {
  const now = new Date().toISOString();
  const docHash = intake.sourceDocumentHash ?? computeDocHash(intake.rawText);

  const provenance: AcquisitionProvenance = {
    sourceDocumentHash: docHash,
    extractionDate: now,
    batchId,
    pageRange: intake.pageRange,
    firmwareVersion: intake.firmwareVersion,
    extractionMethod: intake.extractionMethod,
    revisionNumber: 1,
  };

  // Stage 1: Extract
  let extraction: ExtractionResult;
  try {
    extraction = extractHandbook({
      rawText: intake.rawText,
      machineId: intake.machineId,
      manufacturer: intake.manufacturer,
      model: intake.model,
      extractionMethod: intake.extractionMethod,
      handbookTitle: intake.handbookTitle,
    });
  } catch (err) {
    return {
      machineId: intake.machineId,
      manufacturer: intake.manufacturer,
      model: intake.model,
      batchId,
      status: "failed",
      handbookId: null,
      sectionsExtracted: [],
      sectionsMerged: [],
      sectionsSkipped: [],
      quality: { avgConfidence: 0, parsedLinesPct: 0, warnings: [(err as Error).message] },
      provenance,
      error: `Extraction failed: ${(err as Error).message}`,
    };
  }

  const sectionsExtracted = extraction.quality.sectionsCovered;

  if (sectionsExtracted.length === 0) {
    return {
      machineId: intake.machineId,
      manufacturer: intake.manufacturer,
      model: intake.model,
      batchId,
      status: "skipped",
      handbookId: null,
      sectionsExtracted: [],
      sectionsMerged: [],
      sectionsSkipped: [],
      quality: {
        avgConfidence: extraction.quality.avgConfidence,
        parsedLinesPct: extraction.quality.totalLines > 0
          ? (extraction.quality.parsedLines / extraction.quality.totalLines) * 100
          : 0,
        warnings: ["No sections detected in input text"],
      },
      provenance,
    };
  }

  // Stage 2: Deduplicate — check if handbook already exists for this machine
  const handbookId = generateHandbookId(intake.manufacturer, intake.model);
  const existing = machineHandbookRegistry.get(handbookId)
    ?? machineHandbookRegistry.getByMachineId(intake.machineId);

  // Stage 3: Merge or create
  const sectionsMerged: string[] = [];
  const sectionsSkipped: string[] = [];
  let handbook: MachineHandbook;

  if (existing) {
    // Merge with existing — confidence-aware
    provenance.revisionNumber = detectRevisionNumber(existing) + 1;
    provenance.previousRevisionDate = existing.updated_at;

    const merged = mergeHandbookSections(
      existing,
      extraction.suggestedSections,
      extraction.provenance,
      forceOverwrite,
    );
    handbook = merged.handbook;
    sectionsMerged.push(...merged.merged);
    sectionsSkipped.push(...merged.skipped);
  } else {
    // Create new handbook from extraction
    handbook = buildNewHandbook(
      handbookId,
      intake,
      extraction.suggestedSections,
      extraction.provenance,
    );
    sectionsMerged.push(...sectionsExtracted);
  }

  // Stage 4: Validate and commit
  if (dryRun) {
    return {
      machineId: intake.machineId,
      manufacturer: intake.manufacturer,
      model: intake.model,
      batchId,
      status: "dry_run",
      handbookId,
      sectionsExtracted,
      sectionsMerged,
      sectionsSkipped,
      quality: {
        avgConfidence: extraction.quality.avgConfidence,
        parsedLinesPct: extraction.quality.totalLines > 0
          ? (extraction.quality.parsedLines / extraction.quality.totalLines) * 100
          : 0,
        warnings: extraction.quality.warnings,
      },
      provenance,
    };
  }

  try {
    const validated = MachineHandbookSchema.parse(handbook);
    machineHandbookRegistry.upsert(validated);
    log.info(`[AcquisitionPipeline] Committed handbook ${handbookId} for ${intake.manufacturer} ${intake.model}`);

    return {
      machineId: intake.machineId,
      manufacturer: intake.manufacturer,
      model: intake.model,
      batchId,
      status: existing ? "merged" : "committed",
      handbookId,
      sectionsExtracted,
      sectionsMerged,
      sectionsSkipped,
      quality: {
        avgConfidence: extraction.quality.avgConfidence,
        parsedLinesPct: extraction.quality.totalLines > 0
          ? (extraction.quality.parsedLines / extraction.quality.totalLines) * 100
          : 0,
        warnings: extraction.quality.warnings,
      },
      provenance,
    };
  } catch (err) {
    // Rollback: validation failed, do not commit
    log.warn(`[AcquisitionPipeline] Validation failed for ${handbookId}: ${(err as Error).message}`);
    return {
      machineId: intake.machineId,
      manufacturer: intake.manufacturer,
      model: intake.model,
      batchId,
      status: "failed",
      handbookId,
      sectionsExtracted,
      sectionsMerged: [],
      sectionsSkipped: [],
      quality: {
        avgConfidence: extraction.quality.avgConfidence,
        parsedLinesPct: extraction.quality.totalLines > 0
          ? (extraction.quality.parsedLines / extraction.quality.totalLines) * 100
          : 0,
        warnings: [...extraction.quality.warnings, `Validation rollback: ${(err as Error).message}`],
      },
      provenance,
      error: `Validation rollback: ${(err as Error).message}`,
    };
  }
}

/**
 * Batch acquire multiple handbooks.
 *
 * @param batch - Array of handbook intakes with batch options
 * @returns Batch result with per-intake outcomes
 */
export function batchAcquire(batch: BatchAcquisition): BatchAcquisitionResult {
  const validated = BatchAcquisitionSchema.parse(batch);
  const batchId = `batch-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const startedAt = new Date().toISOString();

  const results: AcquisitionResult[] = [];
  let committed = 0, merged = 0, skipped = 0, failed = 0;

  for (const intake of validated.intakes) {
    const result = acquireHandbook(intake, batchId, validated.dryRun, validated.forceOverwrite);
    results.push(result);

    switch (result.status) {
      case "committed": committed++; break;
      case "merged": merged++; break;
      case "skipped": skipped++; break;
      case "failed": failed++; break;
      case "dry_run": committed++; break; // count dry-run as would-commit
    }
  }

  return {
    batchId,
    startedAt,
    completedAt: new Date().toISOString(),
    totalIntakes: validated.intakes.length,
    committed,
    merged,
    skipped,
    failed,
    dryRun: validated.dryRun,
    results,
  };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 4: DEDUPLICATION + MERGE (P0-U02)
// ════════════════════════════════════════════════════════════════════

/**
 * Confidence-aware merge of extracted sections into existing handbook.
 * Rules:
 * - Object sections (spindle_specs, axis_kinematics, etc.): replace only if new confidence > existing
 * - Array sections (alarm_codes, safety_limits, etc.): append new entries, deduplicate by key
 * - forceOverwrite=true bypasses confidence check
 */
function mergeHandbookSections(
  existing: MachineHandbook,
  suggested: SuggestedSections,
  newProvenance: SourceProvenance,
  forceOverwrite: boolean,
): { handbook: MachineHandbook; merged: string[]; skipped: string[] } {
  const handbook = structuredClone(existing);
  handbook.updated_at = new Date().toISOString();
  // Defensive defaults — structuredClone may produce undefined arrays (C1 fix)
  handbook.alarm_codes = handbook.alarm_codes ?? [];
  handbook.safety_limits = handbook.safety_limits ?? [];
  const merged: string[] = [];
  const skipped: string[] = [];

  // Merge spindle_specs (object — confidence-aware)
  if (suggested.spindle_specs) {
    const existingConf = existing.spindle_specs?.source?.confidence ?? 0;
    const newConf = newProvenance.confidence;
    if (forceOverwrite || newConf >= existingConf || !existing.spindle_specs) {
      handbook.spindle_specs = mergeObjectSection(existing.spindle_specs, suggested.spindle_specs);
      merged.push("spindle_specs");
    } else {
      skipped.push("spindle_specs");
    }
  }

  // Merge axis_kinematics (object — confidence-aware)
  if (suggested.axis_kinematics) {
    const existingConf = existing.axis_kinematics?.source?.confidence ?? 0;
    const newConf = newProvenance.confidence;
    if (forceOverwrite || newConf >= existingConf || !existing.axis_kinematics) {
      handbook.axis_kinematics = mergeAxisKinematics(existing.axis_kinematics, suggested.axis_kinematics);
      merged.push("axis_kinematics");
    } else {
      skipped.push("axis_kinematics");
    }
  }

  // Merge tooling_constraints (object — confidence-aware)
  if (suggested.tooling_constraints) {
    const existingConf = existing.tooling_constraints?.source?.confidence ?? 0;
    const newConf = newProvenance.confidence;
    if (forceOverwrite || newConf >= existingConf || !existing.tooling_constraints) {
      handbook.tooling_constraints = mergeObjectSection(existing.tooling_constraints, suggested.tooling_constraints);
      merged.push("tooling_constraints");
    } else {
      skipped.push("tooling_constraints");
    }
  }

  // Merge coolant_specs (object — confidence-aware, with typed coolant_types)
  if (suggested.coolant_specs) {
    const existingConf = existing.coolant_specs?.source?.confidence ?? 0;
    const newConf = newProvenance.confidence;
    if (forceOverwrite || newConf >= existingConf || !existing.coolant_specs) {
      const typedCoolant = {
        ...suggested.coolant_specs,
        coolant_types: (suggested.coolant_specs.coolant_types ?? []).map(ct => {
          if (typeof ct === "object" && ct !== null && "type" in ct) {
            return ct as { type: string; concentration_pct_min?: number; concentration_pct_max?: number; recommended_brand?: string };
          }
          return { type: String(ct) };
        }),
        through_spindle: !!(suggested.coolant_specs.through_spindle_pressure_bar),
        mql_capable: false,
        source: newProvenance,
      };
      handbook.coolant_specs = existing.coolant_specs
        ? mergeObjectSection(existing.coolant_specs, typedCoolant)
        : typedCoolant;
      merged.push("coolant_specs");
    } else {
      skipped.push("coolant_specs");
    }
  }

  // Merge alarm_codes (array — append + deduplicate by code)
  if (suggested.alarm_codes && suggested.alarm_codes.length > 0) {
    const existingCodes = new Set(existing.alarm_codes.map(a => a.code));
    const newAlarms = suggested.alarm_codes.filter(a => a.code && !existingCodes.has(a.code));
    if (newAlarms.length > 0) {
      // Build full alarm objects from partials for the array
      for (const alarm of newAlarms) {
        handbook.alarm_codes.push({
          code: alarm.code ?? "UNKNOWN",
          severity: alarm.severity ?? "info",
          description: alarm.description ?? "",
          probable_causes: alarm.probable_causes ?? [],
          corrective_actions: alarm.corrective_actions ?? [],
          parts_needed: [],
          related_alarms: [],
          source: alarm.source ?? newProvenance,
        });
      }
      merged.push("alarm_codes");
    } else {
      skipped.push("alarm_codes");
    }
  }

  // Merge safety_limits (array — append + deduplicate by parameter)
  if (suggested.safety_limits && suggested.safety_limits.length > 0) {
    const existingParams = new Set(existing.safety_limits.map(s => s.parameter));
    const newLimits = suggested.safety_limits.filter(s => s.parameter && !existingParams.has(s.parameter));
    if (newLimits.length > 0) {
      for (const limit of newLimits) {
        handbook.safety_limits.push({
          parameter: limit.parameter ?? "unknown",
          min_value: limit.min_value,
          max_value: limit.max_value,
          unit: limit.unit ?? inferSafetyUnit(limit.parameter ?? "unknown"),
          consequence_of_violation: limit.consequence_of_violation ?? "See handbook for details",
          requires_override_key: false,
          source: limit.source ?? newProvenance,
        });
      }
      merged.push("safety_limits");
    } else {
      skipped.push("safety_limits");
    }
  }

  return { handbook, merged, skipped };
}

/**
 * Merge two object sections, preferring new non-undefined values.
 * Preserves existing values where new extraction returned undefined.
 */
function mergeObjectSection<T extends Record<string, unknown>>(
  existing: T | undefined,
  incoming: Partial<T>,
): T {
  if (!existing) return incoming as T;
  const result = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined && value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Merge axis kinematics — match by axis name, merge per-axis fields.
 */
function mergeAxisKinematics(
  existing: MachineHandbook["axis_kinematics"] | undefined,
  incoming: NonNullable<SuggestedSections["axis_kinematics"]>,
): MachineHandbook["axis_kinematics"] {
  if (!existing) {
    return {
      axes: incoming.axes.map(a => ({
        name: a.name,
        travel_mm: a.travel_mm ?? 0,
        rapid_mm_min: a.rapid_mm_min ?? 0,
        repeatability_um: a.repeatability_um,
        accuracy_um: a.accuracy_um,
      })),
      source: incoming.source,
    };
  }

  const merged = structuredClone(existing);
  for (const newAxis of incoming.axes) {
    const existingAxis = merged.axes.find(a => a.name === newAxis.name);
    if (existingAxis) {
      // Merge fields — explicit undefined check, not truthiness (H4 fix: zero is valid)
      if (newAxis.travel_mm !== undefined) existingAxis.travel_mm = newAxis.travel_mm;
      if (newAxis.rapid_mm_min !== undefined) existingAxis.rapid_mm_min = newAxis.rapid_mm_min;
      if (newAxis.repeatability_um !== undefined) existingAxis.repeatability_um = newAxis.repeatability_um;
      if (newAxis.accuracy_um !== undefined) existingAxis.accuracy_um = newAxis.accuracy_um;
    } else {
      merged.axes.push({
        name: newAxis.name,
        travel_mm: newAxis.travel_mm ?? 0,
        rapid_mm_min: newAxis.rapid_mm_min ?? 0,
        repeatability_um: newAxis.repeatability_um,
        accuracy_um: newAxis.accuracy_um,
      });
    }
  }
  return merged;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 5: PROVENANCE + REVISION TRACKING (P0-U03)
// ════════════════════════════════════════════════════════════════════

/** PRISM_UNITS enum values for reference. */
type PrismUnit = "RPM" | "mm" | "mm_min" | "m_s2" | "kW" | "Nm" | "bar" | "deg" | "deg_s"
  | "um" | "kg" | "N" | "L_min" | "dBA" | "C" | "kVA" | "psi" | "HP";

/**
 * Infer the most likely PRISM unit from a safety parameter name.
 * Avoids the dangerous default of "mm" for non-length parameters (C2 fix).
 */
function inferSafetyUnit(paramName: string): PrismUnit {
  const lower = paramName.toLowerCase();
  if (/rpm|speed|spindle/.test(lower)) return "RPM";
  if (/rapid|traverse|feed/.test(lower)) return "mm_min";
  if (/torque/.test(lower)) return "Nm";
  if (/power|kw/.test(lower)) return "kW";
  if (/force/.test(lower)) return "N";
  if (/pressure|bar|psi/.test(lower)) return "bar";
  if (/temp/.test(lower)) return "C";
  if (/weight|mass/.test(lower)) return "kg";
  if (/noise|sound|db/.test(lower)) return "dBA";
  if (/accel/.test(lower)) return "m_s2";
  if (/angle|deg/.test(lower)) return "deg";
  return "mm"; // genuinely length-related parameters
}

/**
 * Detect the current revision number of an existing handbook.
 * Uses the version field format "N.0.0" where N is the revision.
 */
function detectRevisionNumber(handbook: MachineHandbook): number {
  const major = parseInt(handbook.version.split(".")[0], 10);
  return isNaN(major) ? 1 : major;
}

/**
 * Build a new MachineHandbook from extraction results.
 * Sets all array fields to defaults, populates available object sections.
 */
function buildNewHandbook(
  handbookId: string,
  intake: HandbookIntake,
  suggested: SuggestedSections,
  provenance: SourceProvenance,
): MachineHandbook {
  const now = new Date().toISOString();

  return {
    id: handbookId,
    machine_id: intake.machineId,
    manufacturer: intake.manufacturer,
    model: intake.model,
    version: "1.0.0",
    created_at: now,
    updated_at: now,

    cover_info: {
      manufacturer: intake.manufacturer,
      model_family: intake.model,
      models_covered: [intake.model],
      publication_date: now,
      revision: intake.firmwareVersion ?? "1.0",
      language: "en",
      source: provenance,
    },

    spindle_specs: suggested.spindle_specs ? {
      max_rpm: suggested.spindle_specs.max_rpm ?? 0,
      min_rpm: suggested.spindle_specs.min_rpm ?? 0,
      power_continuous_kw: suggested.spindle_specs.power_continuous_kw ?? 0,
      torque_max_nm: suggested.spindle_specs.torque_max_nm ?? 0,
      taper_type: suggested.spindle_specs.taper_type ?? "BT40",
      bearing_type: suggested.spindle_specs.bearing_type,
      source: provenance,
    } : undefined,

    axis_kinematics: suggested.axis_kinematics ? {
      axes: suggested.axis_kinematics.axes.map(a => ({
        name: a.name,
        travel_mm: a.travel_mm || 1, // Schema requires positive; 0 from extraction means undetected
        rapid_mm_min: a.rapid_mm_min || 1, // Schema requires positive; 0 from extraction means undetected
        repeatability_um: a.repeatability_um,
        accuracy_um: a.accuracy_um,
      })),
      source: provenance,
    } : undefined,

    controller_features: undefined,

    alarm_codes: suggested.alarm_codes?.map(a => ({
      code: a.code ?? "UNKNOWN",
      severity: a.severity ?? "info",
      description: a.description ?? "",
      probable_causes: a.probable_causes ?? [],
      corrective_actions: a.corrective_actions ?? [],
      parts_needed: [],
      related_alarms: [],
      source: a.source ?? provenance,
    })) ?? [],

    maintenance_schedule: [],
    parts_book: [],
    programming_tips: [],

    safety_limits: suggested.safety_limits?.map(s => ({
      parameter: s.parameter ?? "unknown",
      min_value: s.min_value,
      max_value: s.max_value,
      unit: s.unit ?? inferSafetyUnit(s.parameter ?? "unknown"),
      consequence_of_violation: s.consequence_of_violation ?? "See handbook for details",
      requires_override_key: false,
      source: s.source ?? provenance,
    })) ?? [],

    coolant_specs: suggested.coolant_specs ? {
      coolant_types: (suggested.coolant_specs.coolant_types ?? []).map(ct => {
        if (typeof ct === "object" && ct !== null && "type" in ct) {
          return ct as { type: string; concentration_pct_min?: number; concentration_pct_max?: number; recommended_brand?: string };
        }
        return { type: String(ct) };
      }),
      tank_capacity_liters: suggested.coolant_specs.tank_capacity_liters,
      pump_pressure_bar: suggested.coolant_specs.pump_pressure_bar,
      flow_rate_lpm: suggested.coolant_specs.flow_rate_lpm,
      through_spindle: !!(suggested.coolant_specs.through_spindle_pressure_bar),
      through_spindle_pressure_bar: suggested.coolant_specs.through_spindle_pressure_bar,
      filtration_um: suggested.coolant_specs.filtration_um,
      mql_capable: false,
      source: provenance,
    } : undefined,

    tooling_constraints: suggested.tooling_constraints ? {
      magazine_capacity: suggested.tooling_constraints.magazine_capacity,
      tool_change_time_sec: suggested.tooling_constraints.tool_change_time_sec,
      max_tool_diameter_mm: suggested.tooling_constraints.max_tool_diameter_mm,
      max_tool_length_mm: suggested.tooling_constraints.max_tool_length_mm,
      max_tool_weight_kg: suggested.tooling_constraints.max_tool_weight_kg,
      taper_type: "BT40", // Default — will be overwritten by extraction if detected
      source: provenance,
    } : undefined,
  };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 6: SINGLETON EXPORT
// ════════════════════════════════════════════════════════════════════

/** Engine export — all methods as named functions. */
export const handbookAcquisitionPipelineEngine = {
  acquireHandbook,
  batchAcquire,
  generateHandbookId,
};
