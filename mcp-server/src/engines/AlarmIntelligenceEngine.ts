/**
 * AlarmIntelligenceEngine — HBK-MS3
 * ===================================
 * Enhances alarm diagnostics with handbook-sourced alarm codes, severity
 * classifications, probable causes, and remediation steps. Cross-references
 * handbook alarm data with existing tribal remediation history to produce
 * ranked troubleshooting guides per alarm code per machine.
 *
 * Three-tier alarm resolution:
 * 1. Machine-specific handbook alarm data (OEM, highest authority)
 * 2. Controller-generic alarm database (337 alarms across 6 families)
 * 3. Tribal knowledge tips (shop-proven troubleshooting)
 *
 * @module AlarmIntelligenceEngine
 * @version 1.0.0
 */

import { z } from "zod";
import {
  machineHandbookRegistry,
  type HandbookAlarmCode,
  type MachineHandbook,
} from "./MachineHandbookRegistryEngine.js";
import {
  alarmDiagnosticsEngine,
  type AlarmEntry,
  type FixProcedure,
  type AlarmLookupResult,
} from "./AlarmDiagnosticsEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Provenance tag indicating where a remediation step came from. */
export type RemediationProvenance = "handbook" | "oem_database" | "tribal";

/** A single remediation step with provenance and ranking metadata. */
export interface RankedRemediationStep {
  rank: number;
  action: string;
  provenance: RemediationProvenance;
  confidence: number;
  source_detail: string;
}

/** Probable cause with provenance. */
export interface ProvenanceCause {
  cause: string;
  provenance: RemediationProvenance;
}

/** Mapped severity levels including EMERGENCY (distinct from CRITICAL per IEC 62682). */
export type GuideSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "EMERGENCY" | "UNKNOWN";

/** Complete troubleshooting guide for a specific alarm on a specific machine. */
export interface TroubleshootingGuide {
  alarm_code: string;
  machine_id?: string;
  controller?: string;
  manufacturer?: string;
  model?: string;
  summary: string;
  severity: GuideSeverity;
  original_severity?: string;
  category: string;
  sources_consulted: RemediationProvenance[];
  probable_causes: ProvenanceCause[];
  ranked_steps: RankedRemediationStep[];
  parts_needed: Array<{ part_number: string; description: string; quantity: number }>;
  estimated_downtime_min?: number;
  requires_service_tech: boolean;
  related_alarms: string[];
  prevention_tips: string[];
  tribal_tips: Array<{
    tip_id: string;
    title: string;
    body: string;
    confidence: number;
    usage_count: number;
  }>;
}

/** Indexed alarm code from a handbook, enriched with machine context. */
export interface IndexedHandbookAlarm {
  code: string;
  severity: string;
  category: string;
  description: string;
  probable_causes: string[];
  corrective_actions: string[];
  parts_needed: Array<{ part_number: string; description: string; quantity: number }>;
  estimated_downtime_min?: number;
  requires_service_tech: boolean;
  related_alarms: string[];
  handbook_confidence: number;
  handbook_title: string;
  machine_id: string;
  manufacturer: string;
  model: string;
}

/** Cross-referenced alarm combining handbook + database + tribal sources. */
export interface CrossReferencedAlarm {
  code: string;
  machine_id: string;
  handbook_alarm?: IndexedHandbookAlarm;
  database_alarm?: AlarmEntry;
  database_fix?: FixProcedure | null;
  tribal_tips: KnowledgeTip[];
  match_quality: "exact" | "code_match" | "category_match" | "none";
}

/** Input schema for lookupAlarmEnhanced. */
export const AlarmLookupEnhancedSchema = z.object({
  alarm_code: z.string().min(1),
  machine_id: z.string().optional(),
  controller: z.string().optional(),
  include_tribal: z.boolean().default(true),
  max_tribal_tips: z.number().min(0).max(20).default(5),
});
export type AlarmLookupEnhancedInput = z.input<typeof AlarmLookupEnhancedSchema>;

/** Input schema for batch alarm indexing. */
export const AlarmIndexQuerySchema = z.object({
  machine_id: z.string().optional(),
  manufacturer: z.string().optional(),
  severity: z.enum(["info", "warning", "error", "critical", "emergency"]).optional(),
  category: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().min(1).max(500).default(50),
});
export type AlarmIndexQuery = z.infer<typeof AlarmIndexQuerySchema>;

/** Input schema for alarm intelligence search (R2-F01/F02 fix). */
export const AlarmSearchSchema = z.object({
  query: z.string().default(""),
  machine_id: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
});
export type AlarmSearchInput = z.input<typeof AlarmSearchSchema>;

/** Summary stats for the alarm intelligence index. */
export interface AlarmIntelligenceStats {
  total_indexed_alarms: number;
  machines_with_alarms: number;
  by_severity: Record<string, number>;
  by_manufacturer: Record<string, number>;
  database_alarms: number;
  tribal_troubleshooting_tips: number;
}

// ============================================================================
// U01: ALARM CODE EXTRACTION AND INDEXING
// ============================================================================

/** Cache for alarm index — invalidated when handbooks change. */
let _indexCache: IndexedHandbookAlarm[] | null = null;
let _indexCacheSize = -1;

/** Invalidate the alarm index cache (call after handbook upsert/delete). */
function invalidateAlarmIndexCache(): void {
  _indexCache = null;
  _indexCacheSize = -1;
}

/**
 * Build an in-memory index of all handbook alarm codes across all machines.
 * Queries MachineHandbookRegistry for handbooks with alarm_codes sections
 * and builds a flat, searchable index. Cached until handbook count changes.
 */
function buildAlarmIndex(): IndexedHandbookAlarm[] {
  const currentSize = machineHandbookRegistry.size;
  if (_indexCache && _indexCacheSize === currentSize) return _indexCache;

  const index: IndexedHandbookAlarm[] = [];
  const handbooks = machineHandbookRegistry.search({ has_section: "alarm_codes" });

  for (const hbk of handbooks) {
    for (const alarm of hbk.alarm_codes) {
      index.push({
        code: alarm.code,
        severity: alarm.severity,
        category: alarm.category ?? "UNKNOWN",
        description: alarm.description,
        probable_causes: alarm.probable_causes,
        corrective_actions: alarm.corrective_actions,
        parts_needed: alarm.parts_needed,
        estimated_downtime_min: alarm.estimated_downtime_min,
        requires_service_tech: alarm.requires_service_tech ?? false,
        related_alarms: alarm.related_alarms,
        handbook_confidence: alarm.source.confidence,
        handbook_title: alarm.source.handbook_title,
        machine_id: hbk.machine_id,
        manufacturer: hbk.manufacturer,
        model: hbk.model,
      });
    }
  }

  _indexCache = index;
  _indexCacheSize = currentSize;
  return index;
}

/**
 * Query the handbook alarm index with optional filters.
 *
 * @param query - Filter criteria (machine_id, manufacturer, severity, category, text query)
 * @returns Matching indexed alarm codes sorted by severity then code
 */
function queryAlarmIndex(query: AlarmIndexQuery): IndexedHandbookAlarm[] {
  const index = buildAlarmIndex();
  let results = index;

  if (query.machine_id) {
    const mid = query.machine_id.toLowerCase();
    results = results.filter(a => a.machine_id.toLowerCase() === mid);
  }
  if (query.manufacturer) {
    const mfr = query.manufacturer.toLowerCase();
    results = results.filter(a => a.manufacturer.toLowerCase().includes(mfr));
  }
  if (query.severity) {
    results = results.filter(a => a.severity === query.severity);
  }
  if (query.category) {
    const cat = query.category.toLowerCase();
    results = results.filter(a => a.category.toLowerCase().includes(cat));
  }
  if (query.query) {
    const q = query.query.toLowerCase();
    results = results.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.probable_causes.some(c => c.toLowerCase().includes(q)) ||
      a.corrective_actions.some(c => c.toLowerCase().includes(q))
    );
  }

  // Sort: emergency > critical > error > warning > info (IEC 62682 order)
  const severityOrder: Record<string, number> = {
    emergency: 0, critical: 1, error: 2, warning: 3, info: 4,
  };
  results.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 5;
    const sb = severityOrder[b.severity] ?? 5;
    if (sa !== sb) return sa - sb;
    return a.code.localeCompare(b.code);
  });

  return results.slice(0, query.limit ?? 50);
}

/**
 * Get all alarm codes for a specific machine from its handbook.
 *
 * @param machineId - Machine identifier
 * @returns Array of indexed alarm codes, or empty if no handbook found
 */
function getAlarmsByMachine(machineId: string): IndexedHandbookAlarm[] {
  return queryAlarmIndex({ machine_id: machineId, limit: 500 });
}

/**
 * Get alarm intelligence stats across all indexed handbooks.
 */
function getAlarmIntelligenceStats(): AlarmIntelligenceStats {
  const index = buildAlarmIndex();
  const bySeverity: Record<string, number> = {};
  const byManufacturer: Record<string, number> = {};
  const machines = new Set<string>();

  for (const alarm of index) {
    bySeverity[alarm.severity] = (bySeverity[alarm.severity] ?? 0) + 1;
    byManufacturer[alarm.manufacturer] = (byManufacturer[alarm.manufacturer] ?? 0) + 1;
    machines.add(alarm.machine_id);
  }

  // Count tribal troubleshooting tips
  let tribalCount = 0;
  try {
    const stats = tribalKnowledgeEngine.stats();
    tribalCount = stats.by_category?.troubleshooting ?? 0;
  } catch { /* non-critical */ }

  // Count database alarms
  let dbCount = 0;
  try {
    const summary = alarmDiagnosticsEngine.getSummary();
    dbCount = summary.totalAlarms;
  } catch { /* non-critical */ }

  return {
    total_indexed_alarms: index.length,
    machines_with_alarms: machines.size,
    by_severity: bySeverity,
    by_manufacturer: byManufacturer,
    database_alarms: dbCount,
    tribal_troubleshooting_tips: tribalCount,
  };
}

// ============================================================================
// U02: CROSS-REFERENCE HANDBOOK ALARMS WITH TRIBAL REMEDIATION
// ============================================================================

/**
 * Map handbook severity to database severity for comparison.
 * Handbook uses: info, warning, error, critical, emergency
 * Database uses: LOW, MEDIUM, HIGH, CRITICAL
 */
function mapSeverity(handbookSeverity: string): GuideSeverity {
  switch (handbookSeverity) {
    case "info": return "LOW";
    case "warning": return "MEDIUM";
    case "error": return "HIGH";
    case "critical": return "CRITICAL";
    case "emergency": return "EMERGENCY";
    default: return "MEDIUM";
  }
}

/**
 * Cross-reference a handbook alarm with the alarm database and tribal knowledge.
 * Finds matching entries across all three sources for a given alarm code on a machine.
 *
 * @param code - Alarm code string
 * @param machineId - Machine identifier (used for handbook lookup)
 * @param controller - Controller family name (used for database lookup)
 * @returns Cross-referenced alarm with all available sources
 */
function crossReferenceAlarm(
  code: string,
  machineId?: string,
  controller?: string,
): CrossReferencedAlarm {
  // Normalize alarm code for case-insensitive comparison (R1-F03 fix)
  const normalizedCode = code.trim().toUpperCase();

  // 1. Handbook lookup (machine-specific)
  let handbookAlarm: IndexedHandbookAlarm | undefined;
  if (machineId) {
    const machineAlarms = getAlarmsByMachine(machineId);
    handbookAlarm = machineAlarms.find(a => a.code.trim().toUpperCase() === normalizedCode);
  }
  // If no machine specified, search all handbooks for this code
  if (!handbookAlarm) {
    const allAlarms = buildAlarmIndex();
    handbookAlarm = allAlarms.find(a => a.code.trim().toUpperCase() === normalizedCode);
  }

  // 2. Database lookup (controller-generic)
  let databaseAlarm: AlarmEntry | undefined;
  let databaseFix: FixProcedure | null = null;
  if (controller) {
    const lookup = alarmDiagnosticsEngine.lookupAlarm(controller, code);
    if (lookup) {
      databaseAlarm = lookup.alarm;
      databaseFix = lookup.fix;
    }
  }
  // If no controller specified but we have handbook, try to infer controller
  if (!databaseAlarm && handbookAlarm) {
    const controllers = alarmDiagnosticsEngine.listControllers();
    for (const { controller: ctrl } of controllers) {
      const lookup = alarmDiagnosticsEngine.lookupAlarm(ctrl, code);
      if (lookup) {
        databaseAlarm = lookup.alarm;
        databaseFix = lookup.fix;
        break;
      }
    }
  }

  // 3. Tribal knowledge lookup
  let tribalTips: KnowledgeTip[] = [];
  try {
    // Search using alarm code and category for best matching
    const searchTerms = [code];
    if (handbookAlarm?.category) searchTerms.push(handbookAlarm.category);
    if (databaseAlarm?.category) searchTerms.push(databaseAlarm.category);
    if (handbookAlarm?.description) searchTerms.push(handbookAlarm.description.split(" ").slice(0, 3).join(" "));

    tribalTips = tribalKnowledgeEngine.search({
      category: "troubleshooting",
      min_confidence: 50,
      limit: 10,
      query: searchTerms.join(" "),
    });
  } catch { /* tribal tips are advisory */ }

  // Determine match quality
  let matchQuality: CrossReferencedAlarm["match_quality"] = "none";
  if (handbookAlarm && databaseAlarm) matchQuality = "exact";
  else if (handbookAlarm || databaseAlarm) matchQuality = "code_match";
  else if (tribalTips.length > 0) matchQuality = "category_match";

  return {
    code,
    machine_id: machineId ?? handbookAlarm?.machine_id ?? "",
    handbook_alarm: handbookAlarm,
    database_alarm: databaseAlarm,
    database_fix: databaseFix,
    tribal_tips: tribalTips,
    match_quality: matchQuality,
  };
}

/**
 * Merge remediation steps from all sources into a ranked list.
 * Priority: handbook (OEM authority) > database fix procedures > tribal tips.
 * Within each tier, steps maintain original ordering.
 *
 * @param xref - Cross-referenced alarm result
 * @returns Ranked remediation steps with provenance
 */
function rankRemediationSteps(xref: CrossReferencedAlarm): RankedRemediationStep[] {
  const steps: RankedRemediationStep[] = [];
  let rank = 1;

  // Tier 1: Handbook corrective actions (highest authority — machine-specific OEM data)
  if (xref.handbook_alarm) {
    for (const action of xref.handbook_alarm.corrective_actions) {
      steps.push({
        rank: rank++,
        action,
        provenance: "handbook",
        confidence: xref.handbook_alarm.handbook_confidence,
        source_detail: `${xref.handbook_alarm.handbook_title} (${xref.handbook_alarm.manufacturer} ${xref.handbook_alarm.model})`,
      });
    }
  }

  // Tier 2: Database fix procedure steps (controller-generic, curated)
  if (xref.database_fix) {
    for (const step of xref.database_fix.steps) {
      // Deduplicate: skip if substantially similar to a handbook step (60-char threshold, R1-F02 fix)
      const instrLower = step.instruction.toLowerCase();
      const isDuplicate = steps.some(s => {
        const sLower = s.action.toLowerCase();
        return sLower.includes(instrLower.slice(0, 60)) || instrLower.includes(sLower.slice(0, 60));
      });
      if (!isDuplicate) {
        steps.push({
          rank: rank++,
          action: step.instruction,
          provenance: "oem_database",
          confidence: 0.85,
          source_detail: `${xref.database_alarm?.controller_family ?? "unknown"} alarm database`,
        });
      }
    }
  }

  // Tier 3: Tribal tips (shop-proven, experience-based)
  for (const tip of xref.tribal_tips) {
    const tipLower = tip.body.toLowerCase();
    const isDuplicate = steps.some(s => {
      const sLower = s.action.toLowerCase();
      return sLower.includes(tipLower.slice(0, 60)) || tipLower.includes(sLower.slice(0, 60));
    });
    if (!isDuplicate) {
      steps.push({
        rank: rank++,
        action: tip.body,
        provenance: "tribal",
        confidence: tip.confidence / 100,
        source_detail: `Tribal tip: ${tip.source} (used ${tip.usage_count}x)`,
      });
    }
  }

  // R1-F08: Fallback when no remediation steps found from any source
  if (steps.length === 0) {
    steps.push({
      rank: 1,
      action: "No automated remediation steps available. Contact maintenance or refer to OEM manual.",
      provenance: "handbook",
      confidence: 0,
      source_detail: "fallback — no steps found in handbook, database, or tribal knowledge",
    });
  }

  return steps;
}

// ============================================================================
// U03: ENHANCED ALARM DIAGNOSTICS WITH HANDBOOK-FIRST QUERY
// ============================================================================

/**
 * Enhanced alarm lookup that queries handbook first, then database, then tribal.
 * Returns a comprehensive troubleshooting guide with provenance for every step.
 *
 * @param input - Alarm code, optional machine_id and controller
 * @returns Complete troubleshooting guide with ranked remediation steps
 */
function lookupAlarmEnhanced(input: AlarmLookupEnhancedInput): TroubleshootingGuide {
  const validated = AlarmLookupEnhancedSchema.parse(input);
  const { alarm_code, machine_id, controller, include_tribal, max_tribal_tips } = validated;

  // Cross-reference across all three sources
  const xref = crossReferenceAlarm(alarm_code, machine_id, controller);

  // Build ranked remediation
  const rankedSteps = rankRemediationSteps(xref);

  // Collect probable causes with provenance
  const causes: ProvenanceCause[] = [];
  if (xref.handbook_alarm) {
    for (const cause of xref.handbook_alarm.probable_causes) {
      causes.push({ cause, provenance: "handbook" });
    }
  }
  if (xref.database_alarm) {
    for (const cause of xref.database_alarm.causes) {
      const isDupe = causes.some(c => c.cause.toLowerCase() === cause.toLowerCase());
      if (!isDupe) causes.push({ cause, provenance: "oem_database" });
    }
  }

  // Determine best severity and category (R1-F05: preserve original)
  const originalSeverity = xref.handbook_alarm?.severity;
  const severity: GuideSeverity = xref.handbook_alarm?.severity
    ? mapSeverity(xref.handbook_alarm.severity)
    : (xref.database_alarm?.severity as GuideSeverity) ?? "UNKNOWN";

  const category = xref.handbook_alarm?.category
    ?? xref.database_alarm?.category
    ?? "UNKNOWN";

  // Build summary
  const summary = xref.handbook_alarm?.description
    ?? xref.database_alarm?.description
    ?? `Alarm ${alarm_code} — no detailed description available`;

  // Collect sources consulted
  const sourcesConsulted: RemediationProvenance[] = [];
  if (xref.handbook_alarm) sourcesConsulted.push("handbook");
  if (xref.database_alarm) sourcesConsulted.push("oem_database");
  if (xref.tribal_tips.length > 0) sourcesConsulted.push("tribal");

  // Collect parts needed (handbook takes priority, merge database parts)
  const partsNeeded = [...(xref.handbook_alarm?.parts_needed ?? [])];
  if (xref.database_alarm?.common_parts) {
    for (const part of xref.database_alarm.common_parts) {
      const exists = partsNeeded.some(p => p.part_number === part || p.description === part);
      if (!exists) {
        partsNeeded.push({ part_number: part, description: part, quantity: 1 });
      }
    }
  }

  // Related alarms
  const relatedAlarms = [
    ...(xref.handbook_alarm?.related_alarms ?? []),
    ...(xref.database_fix?.related_fixes ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Prevention tips (from database fix procedures)
  const preventionTips = xref.database_fix?.prevention_tips ?? [];

  // Tribal tips (limited)
  const tribalTips = (include_tribal ? xref.tribal_tips : [])
    .slice(0, max_tribal_tips)
    .map(t => ({
      tip_id: t.id,
      title: t.title,
      body: t.body,
      confidence: t.confidence,
      usage_count: t.usage_count,
    }));

  return {
    alarm_code,
    machine_id: xref.machine_id || undefined,
    controller: controller ?? xref.database_alarm?.controller_family,
    manufacturer: xref.handbook_alarm?.manufacturer,
    model: xref.handbook_alarm?.model,
    summary,
    severity,
    original_severity: originalSeverity,
    category,
    sources_consulted: sourcesConsulted,
    probable_causes: causes,
    ranked_steps: rankedSteps,
    parts_needed: partsNeeded,
    estimated_downtime_min: xref.handbook_alarm?.estimated_downtime_min
      ?? xref.database_fix?.estimated_time_min,
    // R1-F15: OR logic — if either source says service tech needed, answer is yes
    requires_service_tech: (xref.handbook_alarm?.requires_service_tech ?? false)
      || (xref.database_alarm?.requires_service ?? false),
    related_alarms: relatedAlarms,
    prevention_tips: preventionTips,
    tribal_tips: tribalTips,
  };
}

/**
 * Batch lookup: get troubleshooting guides for multiple alarm codes on a machine.
 *
 * @param machineId - Machine identifier
 * @param codes - Array of alarm codes to look up
 * @param controller - Optional controller family override
 * @returns Array of troubleshooting guides, one per code
 */
function batchLookup(
  machineId: string,
  codes: string[],
  controller?: string,
): TroubleshootingGuide[] {
  return codes.map(code => lookupAlarmEnhanced({
    alarm_code: code,
    machine_id: machineId,
    controller,
  }));
}

/**
 * Search across all handbook alarms and database alarms for a query string.
 * Returns troubleshooting guides for matching alarms.
 *
 * @param query - Free-text search query
 * @param machineId - Optional machine filter
 * @param limit - Max results (default 10)
 * @returns Matching troubleshooting guides
 */
function searchAlarmIntelligence(
  query: string,
  machineId?: string,
  limit = 10,
): TroubleshootingGuide[] {
  // Search handbook alarms
  const handbookMatches = queryAlarmIndex({
    machine_id: machineId,
    query,
    limit,
  });

  // Search database alarms
  const dbMatches = alarmDiagnosticsEngine.searchAlarms(query).slice(0, limit);

  // Collect unique alarm codes
  const seen = new Set<string>();
  const codes: Array<{ code: string; machineId?: string; controller?: string }> = [];

  for (const ha of handbookMatches) {
    if (!seen.has(ha.code)) {
      seen.add(ha.code);
      codes.push({ code: ha.code, machineId: ha.machine_id });
    }
  }
  for (const db of dbMatches) {
    if (!seen.has(db.alarm.alarm_code)) {
      seen.add(db.alarm.alarm_code);
      codes.push({ code: db.alarm.alarm_code, controller: db.alarm.controller_family });
    }
  }

  return codes.slice(0, limit).map(c => lookupAlarmEnhanced({
    alarm_code: c.code,
    machine_id: c.machineId ?? machineId,
    controller: c.controller,
  }));
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const alarmIntelligenceEngine = {
  // U01: Indexing
  buildAlarmIndex,
  queryAlarmIndex,
  getAlarmsByMachine,
  getAlarmIntelligenceStats,

  // U02: Cross-referencing
  crossReferenceAlarm,
  rankRemediationSteps,

  // U03: Enhanced lookup
  lookupAlarmEnhanced,
  batchLookup,
  searchAlarmIntelligence,
};
