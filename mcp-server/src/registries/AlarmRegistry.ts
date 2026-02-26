/**
 * PRISM MCP Server - Alarm Registry
 * Complete access to 2,500+ alarms across 12 controller families
 */

import * as fs from "fs/promises";
import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS, CONTROLLER_FAMILIES, ALARM_CATEGORIES, ALARM_SEVERITIES } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, writeJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// ALARM TYPES
// ============================================================================

export interface AlarmFix {
  step: number;
  action: string;
  details?: string;
  safety_warning?: string;
  tools_required?: string[];
  estimated_time?: number;  // minutes
  skill_level?: "operator" | "maintenance" | "engineer" | "factory";
}

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
    for (const subdir of ["alarms_verified", "alarms_accurate"]) {
      const verifiedPath = path.join(PATHS.EXTRACTED_DIR, "controllers", subdir);
      if (await fileExists(verifiedPath)) {
        const vFiles = await listDirectory(verifiedPath);
        const vJsonFiles = vFiles.filter(f => f.name.endsWith(".json"));
        const beforeCount = this.entries.size;
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
        if (match) {
          controllerFamily = match[1].replace(/_/g, ' ').trim().toUpperCase();
          if (controllerFamily.includes(' ')) {
            controllerFamily = controllerFamily.replace(' ', '_');
          }
        }
      }
      
      for (const alarm of alarms) {
        if (alarm.alarm_id) {
          // Ensure controller_family is set
          if (!alarm.controller_family && controllerFamily) {
            alarm.controller_family = controllerFamily;
          }
          // Fallback: extract from alarm_id (ALM-FANUC-0000 -> FANUC)
          if (!alarm.controller_family && alarm.alarm_id) {
            const idMatch = alarm.alarm_id.match(/^ALM-([A-Z_]+)-/i);
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
        for (const alarm of alarms) {
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

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByController.clear();
    this.indexByCategory.clear();
    this.indexBySeverity.clear();
    this.indexByCode.clear();
    
    for (const [id, entry] of this.entries) {
      const alarm = entry.data;
      
      // Index by controller family
      if (alarm.controller_family) {
        const controller = alarm.controller_family.toUpperCase();
        if (!this.indexByController.has(controller)) {
          this.indexByController.set(controller, []);
        }
        this.indexByController.get(controller)!.push(id);
        
        // Index by code within controller
        if (!this.indexByCode.has(controller)) {
          this.indexByCode.set(controller, new Map());
        }
        const alarmCodeVal = (alarm as any).alarm_code || alarm.code || ((alarm as any).alarm_number != null ? String((alarm as any).alarm_number) : null);
        if (alarmCodeVal) {
          this.indexByCode.get(controller)!.set(String(alarmCodeVal).toUpperCase(), id);
        }
      }
      
      // Index by category
      if (alarm.category) {
        const category = alarm.category.toUpperCase();
        if (!this.indexByCategory.has(category)) {
          this.indexByCategory.set(category, []);
        }
        this.indexByCategory.get(category)!.push(id);
      }
      
      // Index by severity
      if (alarm.severity) {
        const severity = alarm.severity.toUpperCase();
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
    
    const controllerUpper = controller.toUpperCase();
    const codeUpper = code.toUpperCase().replace(/^(ALM|ALARM|ERR|ERROR)[\s\-_:]*/i, "");
    
    // Try direct code lookup
    const codeIndex = this.indexByCode.get(controllerUpper);
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
    if (options.controller) {
      const ids = this.indexByController.get(options.controller.toUpperCase()) || [];
      results = ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
    } else if (options.category) {
      const ids = this.indexByCategory.get(options.category.toUpperCase()) || [];
      results = ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
    } else if (options.severity) {
      const ids = this.indexBySeverity.get(options.severity.toUpperCase()) || [];
      results = ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
    } else {
      results = this.all();
    }
    
    // Apply additional filters — treat "*" or empty as "return all"
    if (options.query && options.query !== "*") {
      const query = options.query.toLowerCase();
      results = results.filter(a =>
        a.name?.toLowerCase().includes(query) ||
        a.code?.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.causes?.some(c => c.toLowerCase().includes(query))
      );
    }
    
    if (options.controller && !this.indexByController.has(options.controller.toUpperCase())) {
      results = results.filter(a => 
        a.controller_family?.toUpperCase() === options.controller!.toUpperCase()
      );
    }
    
    if (options.category && !this.indexByCategory.has(options.category.toUpperCase())) {
      results = results.filter(a => 
        a.category?.toUpperCase() === options.category!.toUpperCase()
      );
    }
    
    if (options.severity && !this.indexBySeverity.has(options.severity.toUpperCase())) {
      results = results.filter(a => 
        a.severity?.toUpperCase() === options.severity!.toUpperCase()
      );
    }
    
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
    
    const ids = this.indexByController.get(controller.toUpperCase()) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
  }

  /**
   * Get alarms by category
   */
  async getByCategory(category: string): Promise<Alarm[]> {
    await this.load();
    
    const ids = this.indexByCategory.get(category.toUpperCase()) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Alarm[];
  }

  /**
   * Get alarms by severity
   */
  async getBySeverity(severity: string): Promise<Alarm[]> {
    await this.load();
    
    const ids = this.indexBySeverity.get(severity.toUpperCase()) || [];
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
      alarm.controller_family.toUpperCase()
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
    if (alarm.related_alarms) {
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
    
    for (const [controller, ids] of this.indexByController) {
      stats.byController[controller] = ids.length;
    }
    
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.length;
    }
    
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
    
    if (alarm.causes && alarm.causes.length > 0) {
      output += `### Possible Causes\n`;
      for (const cause of alarm.causes) {
        output += `- ${cause}\n`;
      }
      output += "\n";
    }
    
    output += `### Quick Fix\n${alarm.quick_fix}\n\n`;
    
    if (alarm.requires_power_cycle) {
      output += `⚠️ **Requires Power Cycle**\n\n`;
    }
    
    if (alarm.fix_procedures && alarm.fix_procedures.length > 0) {
      output += `### Detailed Fix Procedure\n`;
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
export const alarmRegistry = new AlarmRegistry();
