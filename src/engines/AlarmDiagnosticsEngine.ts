/**
 * PRISM Manufacturing Intelligence - Alarm Diagnostics Engine
 * CNC alarm code lookup and fix procedure recommendations from real manufacturer data.
 *
 * Data Sources:
 * - controller-alarm-database.json: 337 alarm codes across 6 controller families
 * - alarm-fix-procedures.json: 337 step-by-step fix procedures
 *
 * Controllers: FANUC, SIEMENS, HEIDENHAIN, HAAS, OKUMA, MAZAK
 * Difficulty Levels: OPERATOR, MAINTENANCE, SERVICE
 * Categories: PROGRAM, MACRO, SERVO, OVERTRAVEL, SPINDLE, ATC, POWER, SYSTEM, etc.
 *
 * @version 1.0.0
 * @module AlarmDiagnosticsEngine
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AlarmSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AlarmCategory =
  | "PROGRAM" | "MACRO" | "SERVO" | "OVERTRAVEL"
  | "SPINDLE" | "ATC" | "POWER" | "SYSTEM"
  | "CYCLE" | "FILE" | "MOTION" | "TOOL"
  | "PROBE" | "5AXIS" | "PLC";

export type FixDifficulty = "OPERATOR" | "MAINTENANCE" | "SERVICE";

export interface AlarmEntry {
  alarm_id: string;
  controller_family: string;
  controller_models: string[];
  alarm_code: string;
  alarm_name: string;
  category: AlarmCategory;
  severity: AlarmSeverity;
  message_text: string;
  description: string;
  causes: string[];
  fix_procedure_id: string;
  related_parameters: string[];
  requires_power_cycle: boolean;
  requires_service: boolean;
  common_parts: string[];
}

export interface FixStep {
  step_number: number;
  instruction: string;
  expected_result: string;
  if_fails: string;
}

export interface FixProcedure {
  fix_id: string;
  alarm_ids: string[];
  title: string;
  difficulty: FixDifficulty;
  estimated_time_min: number;
  tools_required: string[];
  safety_warnings: string[];
  steps: FixStep[];
  verification_steps: string[];
  prevention_tips: string[];
  related_fixes: string[];
  source: string;
}

export interface AlarmDatabase {
  version: string;
  created: string;
  totalAlarms: number;
  byController: Record<string, number>;
  alarms: AlarmEntry[];
}

export interface FixDatabase {
  version: string;
  created: string;
  totalFixes: number;
  fixes: FixProcedure[];
}

export interface AlarmLookupResult {
  alarm: AlarmEntry;
  fix: FixProcedure | null;
  tribal_tips?: KnowledgeTip[];
}

export interface AlarmSummary {
  totalAlarms: number;
  totalFixes: number;
  controllers: Record<string, number>;
  categoryCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class AlarmDiagnosticsEngineImpl {
  private alarmDb: AlarmDatabase | null = null;
  private fixDb: FixDatabase | null = null;
  private loaded = false;

  /** Index maps built on first load for O(1) lookups */
  private alarmById: Map<string, AlarmEntry> = new Map();
  private alarmsByController: Map<string, AlarmEntry[]> = new Map();
  private alarmByControllerAndCode: Map<string, AlarmEntry> = new Map();
  private fixById: Map<string, FixProcedure> = new Map();

  // --------------------------------------------------------------------------
  // DATA LOADING
  // --------------------------------------------------------------------------

  private ensureLoaded(): void {
    if (this.loaded) return;

    const alarmPath = join(import.meta.dirname, "../data/controller-alarm-database.json");
    const fixPath = join(import.meta.dirname, "../data/alarm-fix-procedures.json");

    if (!existsSync(alarmPath)) {
      throw new Error(`AlarmDiagnosticsEngine: controller-alarm-database.json not found at ${alarmPath}`);
    }
    if (!existsSync(fixPath)) {
      throw new Error(`AlarmDiagnosticsEngine: alarm-fix-procedures.json not found at ${fixPath}`);
    }

    this.alarmDb = JSON.parse(readFileSync(alarmPath, "utf-8")) as AlarmDatabase;
    this.fixDb = JSON.parse(readFileSync(fixPath, "utf-8")) as FixDatabase;

    this.buildIndexes();
    this.loaded = true;
  }

  private buildIndexes(): void {
    if (!this.alarmDb || !this.fixDb) return;

    // Index alarms
    for (const alarm of this.alarmDb.alarms) {
      this.alarmById.set(alarm.alarm_id, alarm);

      // By controller family
      const existing = this.alarmsByController.get(alarm.controller_family) || [];
      existing.push(alarm);
      this.alarmsByController.set(alarm.controller_family, existing);

      // By controller+code composite key (case-insensitive controller)
      const key = `${alarm.controller_family.toUpperCase()}:${alarm.alarm_code}`;
      this.alarmByControllerAndCode.set(key, alarm);
    }

    // Index fixes
    for (const fix of this.fixDb.fixes) {
      this.fixById.set(fix.fix_id, fix);
    }
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Look up an alarm by controller family and alarm code.
   * Controller matching is case-insensitive.
   *
   * @param controller - Controller family name (e.g., "FANUC", "SIEMENS")
   * @param code - Alarm code string (e.g., "000", "2010", "SV0401")
   * @returns The alarm entry with its associated fix procedure, or null if not found
   */
  lookupAlarm(controller: string, code: string): AlarmLookupResult | null {
    this.ensureLoaded();

    const key = `${controller.toUpperCase()}:${code}`;
    const alarm = this.alarmByControllerAndCode.get(key);
    if (!alarm) return null;

    const fix = this.fixById.get(alarm.fix_procedure_id) || null;

    // ── TK-2: Tribal knowledge consumer wiring ──
    let tribal_tips: KnowledgeTip[] | undefined;
    try {
      tribal_tips = tribalKnowledgeEngine.search({
        category: "troubleshooting",
        min_confidence: 70,
        limit: 5,
        query: alarm.category || alarm.alarm_code,
      });
    } catch { /* tribal tips are advisory — never block alarm lookup */ }

    return { alarm, fix, tribal_tips };
  }

  /**
   * Get the fix procedure for a given alarm ID or fix ID.
   *
   * @param alarmId - Either an alarm_id (e.g., "FANUC-000") or fix_id (e.g., "FIX-FANUC-000")
   * @returns The fix procedure, or null if not found
   */
  getFixProcedure(alarmId: string): FixProcedure | null {
    this.ensureLoaded();

    // Direct fix ID lookup
    const directFix = this.fixById.get(alarmId);
    if (directFix) return directFix;

    // Try as alarm ID -> get its fix_procedure_id
    const alarm = this.alarmById.get(alarmId);
    if (alarm) {
      return this.fixById.get(alarm.fix_procedure_id) || null;
    }

    // Try prepending "FIX-" in case user passed alarm ID format
    const asFix = this.fixById.get(`FIX-${alarmId}`);
    if (asFix) return asFix;

    return null;
  }

  /**
   * Full-text search across alarm descriptions, names, causes, and message text.
   * Case-insensitive. Returns all matching alarms with their fix procedures.
   *
   * @param query - Search string (matched against name, description, causes, message_text)
   * @returns Array of matching alarm+fix results, sorted by relevance (exact name match first)
   */
  searchAlarms(query: string): AlarmLookupResult[] {
    this.ensureLoaded();
    if (!this.alarmDb) return [];

    const q = query.toLowerCase();
    const results: { result: AlarmLookupResult; score: number }[] = [];

    for (const alarm of this.alarmDb.alarms) {
      let score = 0;

      // Score based on where the match occurs (higher = more relevant)
      if (alarm.alarm_name.toLowerCase().includes(q)) score += 10;
      if (alarm.alarm_code.toLowerCase().includes(q)) score += 8;
      if (alarm.message_text.toLowerCase().includes(q)) score += 6;
      if (alarm.description.toLowerCase().includes(q)) score += 4;
      if (alarm.category.toLowerCase().includes(q)) score += 3;
      if (alarm.causes.some(c => c.toLowerCase().includes(q))) score += 2;
      if (alarm.controller_family.toLowerCase().includes(q)) score += 1;

      if (score > 0) {
        const fix = this.fixById.get(alarm.fix_procedure_id) || null;
        results.push({ result: { alarm, fix }, score });
      }
    }

    // Sort by score descending, then by alarm_id for stability
    results.sort((a, b) => b.score - a.score || a.result.alarm.alarm_id.localeCompare(b.result.alarm.alarm_id));

    return results.map(r => r.result);
  }

  /**
   * List all controller families present in the alarm database.
   *
   * @returns Array of controller family names with their alarm counts
   */
  listControllers(): Array<{ controller: string; alarmCount: number }> {
    this.ensureLoaded();
    if (!this.alarmDb) return [];

    return Object.entries(this.alarmDb.byController).map(([controller, count]) => ({
      controller,
      alarmCount: count,
    }));
  }

  /**
   * Get all alarms for a specific controller family (case-insensitive).
   *
   * @param controller - Controller family name
   * @returns Array of alarm entries for that controller, or empty array if none found
   */
  getAlarmsByController(controller: string): AlarmEntry[] {
    this.ensureLoaded();
    return this.alarmsByController.get(controller.toUpperCase()) || [];
  }

  /**
   * Get the fix difficulty level for an alarm.
   *
   * @param alarmId - Alarm ID (e.g., "FANUC-000") or fix ID (e.g., "FIX-FANUC-000")
   * @returns The difficulty level and associated metadata, or null if not found
   */
  getDifficulty(alarmId: string): {
    difficulty: FixDifficulty;
    estimated_time_min: number;
    tools_required: string[];
    requires_service: boolean;
    requires_power_cycle: boolean;
  } | null {
    this.ensureLoaded();

    const fix = this.getFixProcedure(alarmId);
    const alarm = this.alarmById.get(alarmId);

    if (!fix) return null;

    return {
      difficulty: fix.difficulty,
      estimated_time_min: fix.estimated_time_min,
      tools_required: fix.tools_required,
      requires_service: alarm?.requires_service ?? false,
      requires_power_cycle: alarm?.requires_power_cycle ?? false,
    };
  }

  /**
   * Get summary statistics for the alarm database.
   *
   * @returns Aggregate stats: total alarms/fixes, controller distribution,
   *          category/severity/difficulty breakdowns
   */
  getSummary(): AlarmSummary {
    this.ensureLoaded();

    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = {};

    if (this.alarmDb) {
      for (const alarm of this.alarmDb.alarms) {
        categoryCounts[alarm.category] = (categoryCounts[alarm.category] || 0) + 1;
        severityCounts[alarm.severity] = (severityCounts[alarm.severity] || 0) + 1;
      }
    }

    if (this.fixDb) {
      for (const fix of this.fixDb.fixes) {
        difficultyCounts[fix.difficulty] = (difficultyCounts[fix.difficulty] || 0) + 1;
      }
    }

    return {
      totalAlarms: this.alarmDb?.totalAlarms ?? 0,
      totalFixes: this.fixDb?.totalFixes ?? 0,
      controllers: this.alarmDb?.byController ?? {},
      categoryCounts,
      severityCounts,
      difficultyCounts,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const alarmDiagnosticsEngine = new AlarmDiagnosticsEngineImpl();
