/**
 * PRISM MCP Server - Alarm Registry
 * Complete access to 2,500+ alarms across 12 controller families
 */

import * as fs from "fs/promises";
import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, writeJsonFile, listDirectory } from "../utils/files.js";
import {
  normalizeControllerFamily, normalizeAlarmCategory, normalizeSeverity, resolveControllerFamilyRaw,
} from "../data/alarm-categorization.js";

// ============================================================================
// ALARM TYPES
// ============================================================================

/** Alarm Fix configuration/data structure.
 */
export interface AlarmFix {
  step: number;
  action: string;
  details?: string;
  safety_warning?: string;
  tools_required?: string[];
  estimated_time?: number;  // minutes
  skill_level?: "operator" | "maintenance" | "engineer" | "factory";
}

/** Alarm configuration/data structure.
 */
export interface Alarm {
  // Identification
  alarm_id: string;
  code: string;
  name: string;
  controller_family: string;
  controller_models?: string[];
  
  // Classification
  category: string;           // SERVO, SPINDLE, ATC, PROGRAM, SAFETY, SYSTEM, etc.
  severity: string;           // CRITICAL, HIGH, MEDIUM, LOW, INFO
  
  // Description
  description: string;
  causes: string[];
  quick_fix: string;
  requires_power_cycle: boolean;
  
  // Fix procedures (Wave 6 data)
  fix_procedures?: AlarmFix[];
  
  // Related information
  related_alarms?: string[];
  prerequisite_checks?: string[];
  
  // Machine-specific variations
  variations?: Record<string, {
    description?: string;
    causes?: string[];
    fix_notes?: string;
  }>;
  
  // Metadata
  source?: string;
  last_updated?: string;
  verified?: boolean;
}

// ============================================================================
// ALARM REGISTRY CLASS
// ============================================================================

/** Alarm Registry engine/manager.
 */
export class AlarmRegistry extends BaseRegistry<Alarm> {
  private indexByController: Map<string, string[]> = new Map();
  private indexByCategory: Map<string, string[]> = new Map();
  private indexBySeverity: Map<string, string[]> = new Map();
  private indexByCode: Map<string, Map<string, string>> = new Map(); // controller -> code -> id
  
  constructor() {
    super(
      "AlarmRegistry",
      path.join(PATHS.STATE_DIR, "alarm-registry.json"),
      "1.0.0"
    );
  }

  /**
   * Load alarms from database
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading AlarmRegistry...");
    
    // Load alarms from each controller family
    const alarmBasePath = path.join(PATHS.EXTRACTED_DIR, "controllers", "alarms");
    
    if (await fileExists(alarmBasePath)) {
      const files = await listDirectory(alarmBasePath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json"));
      
      /** For.
       * @param const - const
       * @returns void
       */
      for (const file of jsonFiles) {
        await this.loadAlarmFile(file.path);
      }
    }
    
    // Try consolidated master file
    const masterPath = path.join(alarmBasePath, "MASTER_ALARM_DATABASE.json");
    if (await fileExists(masterPath)) {
      await this.loadMasterFile(masterPath);
    }
    
    // Load verified/accurate alarm data (higher quality, override existing)
    /** For.
     * @param const - const
     * @param "alarms_accurate"] - "alarms_accurate"]
     * @returns void
     */
    for (const subdir of ["alarms_verified", "alarms_accurate"]) {
      const verifiedPath = path.join(PATHS.EXTRACTED_DIR, "controllers", subdir);
      if (await fileExists(verifiedPath)) {
        const vFiles = await listDirectory(verifiedPath);
        const vJsonFiles = vFiles.filter(f => f.name.endsWith(".json"));
        const beforeCount = this.entries.size;
        /** For.
         * @param const - const
         * @returns void
         */
        for (const file of vJsonFiles) {
          await this.loadAlarmFile(file.path);
        }
        const added = this.entries.size - beforeCount;
        if (added > 0) log.info(`  ${subdir}: +${added} alarms`);
      }
    }
    
    // Build indexes
    this.buildIndexes();
    
    // W5: Only mark loaded if we actually got data
    /** If.
     * @param this.entries.size - this.entries.size
     * @returns void
     */
    if (this.entries.size > 0) {
      this.loaded = true;
      log.info(`AlarmRegistry loaded: ${this.entries.size} alarms across ${this.indexByController.size} controllers`);
    } else {
      log.warn(`AlarmRegistry: 0 alarms loaded — will retry on next call`);
    }
  }

  /**
   * Load alarms from a single file
   */
  private async loadAlarmFile(filePath: string): Promise<void> {
    try {
      const data = await readJsonFile<Alarm[] | { metadata?: { controller_family?: string }; alarms: Alarm[] }>(filePath);
      const alarms = Array.isArray(data) ? data : data.alarms || [];
      
      // Extract controller_family from metadata, filename, or alarm_id
      let controllerFamily: string | undefined;
      if (!Array.isArray(data) && data.metadata?.controller_family) {
        controllerFamily = data.metadata.controller_family;
      } else {
        // Parse from filename: FANUC_ALARMS.json -> FANUC
        const filename = path.basename(filePath, '.json');
        const match = filename.match(/^([A-Z_]+?)(?:_ALARMS)?(?:_COMPLETE|_EXPANDED)?$/i);
        /** If.
         * @param match - match
         * @returns void
         */
        if (match) {
          controllerFamily = match[1].replace(/_/g, ' ').trim().toUpperCase();
          if (controllerFamily.includes(' ')) {
            controllerFamily = controllerFamily.replace(' ', '_');
          }
        }
      }
      
      /** For.
       * @param const - const
       * @returns void
       */
      for (const alarm of alarms) {
        /** If.
         * @param alarm.alarm_id - alarm.alarm_id
         * @returns void
         */
        if (alarm.alarm_id) {
          // Ensure controller_family is set
          /** If.
           * @param !alarm.controller_family - !alarm.controller_family
           * @returns void
           */
          if (!alarm.controller_family && controllerFamily) {
            alarm.controller_family = controllerFamily;
          }
          // Fallback: extract from alarm_id (ALM-FANUC-0000 -> FANUC)
          /** If.
           * @param !alarm.controller_family - !alarm.controller_family
           * @returns void
           */
          if (!alarm.controller_family && alarm.alarm_id) {
            const idMatch = alarm.alarm_id.match(/^ALM-([A-Z_]+)-/i);
            /** If.
             * @param idMatch - id match
             * @returns void
             */
            if (idMatch) {
              alarm.controller_family = idMatch[1].toUpperCase();
            }
          }
          
          this.entries.set(alarm.alarm_id, {
            id: alarm.alarm_id,
            data: alarm,
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              version: 1,
              source: path.basename(filePath)
            }
          });
        }
      }
      
      log.debug(`Loaded ${alarms.length} alarms from ${path.basename(filePath)}`);
    } catch (error) {
      log.warn(`Failed to load alarm file ${filePath}: ${error}`);
    }
  }

  /**
   * Load from master consolidated file
   */
  private async loadMasterFile(filePath: string): Promise<void> {
    try {
      const data = await readJsonFile<{
        metadata?: any;
        families: Record<string, Alarm[]>;
      }>(filePath);
      
      for (const [family, alarms] of Object.entries(data.families || {})) {
        /** For.
         * @param const - const
         * @returns void
         */
        for (const alarm of alarms) {
          /** If.
           * @param alarm.alarm_id - alarm.alarm_id
           * @returns void
           */
          if (alarm.alarm_id || alarm.code) {
            const id = alarm.alarm_id || `ALM-${family}-${alarm.code}`;
            alarm.alarm_id = id;
            alarm.controller_family = alarm.controller_family || family;
            
            this.entries.set(id, {
              id,
              data: alarm,
              metadata: {
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                version: 1,
                source: "MASTER"
              }
            });
          }
        }
      }
      
      log.debug(`Loaded alarms from master file: ${this.entries.size} total`);
    } catch (error) {
      log.warn(`Failed to load master alarm file: ${error}`);
    }
  }

  /** Canonical controller-family index key — recovers `family`/alarm_id and folds aliases
   *  (DMG MORI → DMG_MORI). Falls back to raw-uppercase for an unrecognized brand (never drops it). */
  private canonController(raw: string | undefined | null): string | null {
    if (!raw || raw === "undefined") return null;
    return normalizeControllerFamily(raw) ?? raw.toUpperCase();
  }
  /** Canonical alarm-category index key (OVERHEAT → THERMAL), raw-upper fallback for unknown. */
  private canonCategory(raw: string | undefined | null): string | null {
    if (!raw || raw === "undefined") return null;
    return normalizeAlarmCategory(raw) ?? raw.toUpperCase();
  }
  /** Canonical severity index key, raw-upper fallback for unknown. */
  private canonSeverity(raw: string | undefined | null): string | null {
    if (!raw || raw === "undefined") return null;
    return normalizeSeverity(raw) ?? raw.toUpperCase();
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByController.clear();
    this.indexByCategory.clear();
    this.indexBySeverity.clear();
    this.indexByCode.clear();
    
    /** For.
     * @param const - const
     * @param entry] - entry]
     * @returns void
     */
    for (const [id, entry] of this.entries) {
      const alarm = entry.data;
      
      // Index by controller family (canonical — recovers `family`/alarm_id when controller_family
      // is missing or the literal "undefined" string; folds DMG MORI/Mazatrol/etc. aliases)
      const controller = this.canonController(resolveControllerFamilyRaw(alarm));
      /** If.
       * @param controller - canonical controller-family key
       * @returns void
       */
      if (controller) {
        if (!this.indexByController.has(controller)) {
          this.indexByController.set(controller, []);
        }
        this.indexByController.get(controller)!.push(id);
        
        // Index by code within controller
        if (!this.indexByCode.has(controller)) {
          this.indexByCode.set(controller, new Map());
        }
        const alarmCodeVal = (alarm as any).alarm_code || alarm.code || ((alarm as any).alarm_number != null ? String((alarm as any).alarm_number) : null);
        /** If.
         * @param alarmCodeVal - alarm code val
         * @returns void
         */
        if (alarmCodeVal) {
          this.indexByCode.get(controller)!.set(String(alarmCodeVal).toUpperCase(), id);
        }
      }
      
      // Index by category (canonical — folds OVERHEAT→THERMAL, PMC→PLC, etc.)
      const category = this.canonCategory(alarm.category);
      /** If.
       * @param category - canonical alarm-category key
       * @returns void
       */
      if (category) {
        if (!this.indexByCategory.has(category)) {
          this.indexByCategory.set(category, []);
        }
        this.indexByCategory.get(category)!.push(id);
      }
      
      // Index by severity (canonical — folds FATAL→CRITICAL, WARNING→MEDIUM, etc.)
      const severity = this.canonSeverity(alarm.severity);
      /** If.
       * @param severity - canonical severity key
       * @returns void
       */
      if (severity) {
        if (!this.indexBySeverity.has(severity)) {
          this.indexBySeverity.set(severity, []);
        }
        this.indexBySeverity.get(severity)!.push(id);
      }
    }
    
    log.debug(`Built indexes: ${this.indexByController.size} controllers, ${this.indexByCategory.size} categories`);
  }

  /**
   * Decode alarm code for a specific controller
   */
  async decode(controller: string, code: string): Promise<Alarm | undefined> {
    await this.load();
    
    const controllerUpper = this.canonController(controller) ?? controller.toUpperCase();
    const codeUpper = code.toUpperCase().replace(/^(ALM|ALARM|ERR|ERROR)[\s\-_:]*/i, "");
    
    // Try direct code lookup
    const codeIndex = this.indexByCode.get(controllerUpper);
    /** If.
     * @param codeIndex - code index
     * @returns void
     */
    if (codeIndex) {
      const id = codeIndex.get(codeUpper);
      if (id) return this.get(id);
      
      // Try without leading zeros
      const codeNoZeros = codeUpper.replace(/^0+/, "");
      const idNoZeros = codeIndex.get(codeNoZeros);
      if (idNoZeros) return this.get(idNoZeros);
      
      // Try with leading zeros (pad to 4 digits)
      const codePadded = codeUpper.padStart(4, "0");
      const idPadded = codeIndex.get(codePadded);
      if (idPadded) return this.get(idPadded);
    }
    
    // Fallback: search through all alarms for this controller
    const controllerAlarms = this.indexByController.get(controllerUpper) || [];
    /** For.
     * @param const - const
     * @returns void
     */
    for (const id of controllerAlarms) {
      const alarm = this.get(id);
      if (alarm?.code?.toUpperCase().includes(codeUpper)) {
        return alarm;
      }
    }
    
    return undefined;
  }

  /**
   * Search alarms with filters
   */
  async search(options: {
    query?: string;
    controller?: string;
    category?: string;
    severity?: string;
    has_fix?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ alarms: Alarm[]; total: number; hasMore: boolean }> {
    await this.load();
    
    let results: Alarm[] = [];
    
    // Start with most selective filter
    /** If.
     * @param options.controller - options.controller
     * @returns void
     */
    if (options.controller) {
      const ids = this.indexByController.get(this.canonController(options.controller) ?? options.controller.toUpperCase()) || [];
      results = ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
    } else if (options.category) {
      const ids = this.indexByCategory.get(this.canonCategory(options.category) ?? options.category.toUpperCase()) || [];
      results = ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
    } else if (options.severity) {
      const ids = this.indexBySeverity.get(this.canonSeverity(options.severity) ?? options.severity.toUpperCase()) || [];
      results = ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
    } else {
      results = this.all();
    }
    
    // Apply additional filters — treat "*" or empty as "return all"
    /** If.
     * @param options.query - options.query
     * @returns void
     */
    if (options.query && options.query !== "*") {
      const query = options.query.toLowerCase();
      results = results.filter(a =>
        a.name?.toLowerCase().includes(query) ||
        a.code?.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.causes?.some(c => c.toLowerCase().includes(query))
      );
    }
    
    if (options.controller && !this.indexByController.has(this.canonController(options.controller) ?? "")) {
      const want = this.canonController(options.controller);
      results = results.filter(a => this.canonController(resolveControllerFamilyRaw(a)) === want);
    }

    if (options.category && !this.indexByCategory.has(this.canonCategory(options.category) ?? "")) {
      const want = this.canonCategory(options.category);
      results = results.filter(a => this.canonCategory(a.category) === want);
    }

    if (options.severity && !this.indexBySeverity.has(this.canonSeverity(options.severity) ?? "")) {
      const want = this.canonSeverity(options.severity);
      results = results.filter(a => this.canonSeverity(a.severity) === want);
    }
    
    /** If.
     * @param options.has_fix - options.has_fix
     * @returns void
     */
    if (options.has_fix) {
      results = results.filter(a => 
        a.fix_procedures && a.fix_procedures.length > 0
      );
    }
    
    // Pagination
    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return {
      alarms: paged,
      total,
      hasMore: offset + paged.length < total
    };
  }

  /**
   * Get alarms by controller family
   */
  async getByController(controller: string): Promise<Alarm[]> {
    await this.load();
    
    const ids = this.indexByController.get(this.canonController(controller) ?? controller.toUpperCase()) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
  }

  /**
   * Get alarms by category
   */
  async getByCategory(category: string): Promise<Alarm[]> {
    await this.load();
    
    const ids = this.indexByCategory.get(this.canonCategory(category) ?? category.toUpperCase()) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
  }

  /**
   * Get alarms by severity
   */
  async getBySeverity(severity: string): Promise<Alarm[]> {
    await this.load();
    
    const ids = this.indexBySeverity.get(this.canonSeverity(severity) ?? severity.toUpperCase()) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
  }

  /**
   * Add fix procedure to alarm
   */
  async addFixProcedure(
    alarmId: string,
    procedures: AlarmFix[]
  ): Promise<Alarm> {
    await this.load();
    
    const alarm = this.get(alarmId);
    /** If.
     * @param !alarm - !alarm
     * @returns void
     */
    if (!alarm) {
      throw new Error(`Alarm ${alarmId} not found`);
    }
    
    // Update alarm with fix procedures
    alarm.fix_procedures = procedures;
    alarm.last_updated = new Date().toISOString();
    
    // Update registry
    this.set(alarmId, alarm);
    
    // Persist
    await this.persistAlarm(alarm);
    
    log.info(`Added ${procedures.length} fix procedures to alarm ${alarmId}`);
    return alarm;
  }

  /**
   * Persist alarm to file
   */
  private async persistAlarm(alarm: Alarm): Promise<void> {
    const alarmPath = path.join(
      PATHS.EXTRACTED_DIR, 
      "controllers", 
      "alarms", 
      (alarm.controller_family || 'UNKNOWN').toUpperCase()
    );
    
    try {
      await fs.mkdir(alarmPath, { recursive: true });
      
      const filePath = path.join(alarmPath, `${alarm.alarm_id}.json`);
      await writeJsonFile(filePath, alarm);
      
      log.debug(`Persisted alarm ${alarm.alarm_id}`);
    } catch (error) {
      log.error(`Failed to persist alarm ${alarm.alarm_id}: ${error}`);
    }
  }

  /**
   * Get related alarms
   */
  async getRelated(alarmId: string): Promise<Alarm[]> {
    await this.load();
    
    const alarm = this.get(alarmId);
    if (!alarm) return [];
    
    const related: Alarm[] = [];
    
    // Add explicitly related alarms
    /** If.
     * @param alarm.related_alarms - alarm.related_alarms
     * @returns void
     */
    if (alarm.related_alarms) {
      /** For.
       * @param const - const
       * @returns void
       */
      for (const relId of alarm.related_alarms) {
        const rel = this.get(relId);
        if (rel) related.push(rel);
      }
    }
    
    // Find alarms in same category and controller
    const sameCategory = await this.search({
      controller: alarm.controller_family,
      category: alarm.category,
      limit: 10
    });
    
    /** For.
     * @param const - const
     * @returns void
     */
    for (const rel of sameCategory.alarms) {
      if (rel.alarm_id !== alarmId && !related.find(r => r.alarm_id === rel.alarm_id)) {
        related.push(rel);
      }
    }
    
    return related.slice(0, 10);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    byController: Record<string, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    withFix: number;
    verified: number;
  }> {
    await this.load();
    
    const stats = {
      total: this.entries.size,
      byController: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      withFix: 0,
      verified: 0
    };
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [controller, ids] of this.indexByController) {
      stats.byController[controller] = ids.length;
    }
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.length;
    }
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [severity, ids] of this.indexBySeverity) {
      stats.bySeverity[severity] = ids.length;
    }
    
    for (const entry of this.entries.values()) {
      const alarm = entry.data;
      if (alarm.fix_procedures && alarm.fix_procedures.length > 0) stats.withFix++;
      if (alarm.verified) stats.verified++;
    }
    
    return stats;
  }

  /**
   * Format alarm for display
   */
  formatAlarm(alarm: Alarm): string {
    let output = `## ${alarm.controller_family} Alarm ${alarm.code}: ${alarm.name}\n\n`;
    output += `**Severity:** ${alarm.severity}\n`;
    output += `**Category:** ${alarm.category}\n\n`;
    output += `### Description\n${alarm.description}\n\n`;
    
    /** If.
     * @param alarm.causes - alarm.causes
     * @returns void
     */
    if (alarm.causes && alarm.causes.length > 0) {
      output += `### Possible Causes\n`;
      /** For.
       * @param const - const
       * @returns void
       */
      for (const cause of alarm.causes) {
        output += `- ${cause}\n`;
      }
      output += "\n";
    }
    
    output += `### Quick Fix\n${alarm.quick_fix}\n\n`;
    
    /** If.
     * @param alarm.requires_power_cycle - alarm.requires_power_cycle
     * @returns void
     */
    if (alarm.requires_power_cycle) {
      output += `⚠️ **Requires Power Cycle**\n\n`;
    }
    
    /** If.
     * @param alarm.fix_procedures - alarm.fix_procedures
     * @returns void
     */
    if (alarm.fix_procedures && alarm.fix_procedures.length > 0) {
      output += `### Detailed Fix Procedure\n`;
      /** For.
       * @param const - const
       * @returns void
       */
      for (const step of alarm.fix_procedures) {
        output += `${step.step}. ${step.action}\n`;
        if (step.details) output += `   ${step.details}\n`;
        if (step.safety_warning) output += `   ⚠️ ${step.safety_warning}\n`;
      }
    }
    
    return output;
  }
}

// Export singleton instance
/** Alarm Registry constant.
 */
export const alarmRegistry = new AlarmRegistry();
