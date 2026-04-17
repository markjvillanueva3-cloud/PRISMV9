/**
 * MachineLogHarvesterEngine — CNC Machine Log Extraction
 *
 * Harvests operational data from CNC machine logs including:
 * cycle times, alarms, tool usage, and production metrics.
 *
 * U-AWR30: Machine Log Harvester
 *
 * @module engines/MachineLogHarvesterEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type MachineType = "lathe" | "mill" | "edm" | "grinder" | "other";
export type ControllerType = "fanuc" | "okuma" | "haas" | "siemens" | "mazak" | "mitsubishi" | "other";

export type LogEntryType =
  | "cycle_start"
  | "cycle_end"
  | "alarm"
  | "warning"
  | "tool_change"
  | "program_start"
  | "program_end"
  | "mode_change"
  | "parameter_change"
  | "maintenance"
  | "operator_action"
  | "unknown";

export type AlarmSeverity = "critical" | "warning" | "info";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogEntryType;
  machineId: string;
  programName?: string;
  message: string;
  rawLine: string;
  metadata: Record<string, unknown>;
}

export interface CycleData {
  id: string;
  machineId: string;
  programName: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  partCount: number;
  toolChanges: number;
  alarms: number;
  status: "completed" | "aborted" | "unknown";
}

export interface AlarmRecord {
  id: string;
  timestamp: string;
  machineId: string;
  alarmCode: string;
  message: string;
  severity: AlarmSeverity;
  programName?: string;
  toolNumber?: number;
  resolution?: string;
}

export interface ToolUsageRecord {
  toolNumber: number;
  machineId: string;
  usageCount: number;
  totalCuttingTime: number;
  lastUsed: string;
  programs: string[];
}

export interface HarvestResult {
  filePath: string;
  machineId: string;
  machineType: MachineType;
  controllerType: ControllerType;
  entries: LogEntry[];
  cycles: CycleData[];
  alarms: AlarmRecord[];
  toolUsage: ToolUsageRecord[];
  dateRange: { start: string; end: string };
  statistics: HarvestStatistics;
  harvestedAt: string;
}

export interface HarvestStatistics {
  totalEntries: number;
  totalCycles: number;
  totalAlarms: number;
  avgCycleTime: number;
  uptime: number;
  partCount: number;
  mostUsedTools: number[];
  commonAlarms: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALARM_PATTERNS = [
  { pattern: /ALARM\s*(\d+)/i, severity: "critical" as const },
  { pattern: /ERROR\s*(\d+)/i, severity: "critical" as const },
  { pattern: /WARNING\s*(\d+)/i, severity: "warning" as const },
  { pattern: /CAUTION/i, severity: "info" as const },
  { pattern: /AL\s*(\d+)/i, severity: "critical" as const },
];

const CYCLE_PATTERNS = {
  start: /CYCLE\s*START|M30|BEGIN\s*CYCLE/i,
  end: /CYCLE\s*END|M02|M30|END\s*CYCLE/i,
};

const TOOL_CHANGE_PATTERN = /T(\d+)\s*M0?6|TOOL\s*CHANGE\s*T?(\d+)/i;
const PROGRAM_PATTERN = /O(\d+)|%\s*O(\d+)|PROGRAM\s*(\w+)/i;

const CONTROLLER_SIGNATURES: Record<string, ControllerType> = {
  "FANUC": "fanuc",
  "OSP": "okuma",
  "HAAS": "haas",
  "SINUMERIK": "siemens",
  "MAZATROL": "mazak",
  "MELDAS": "mitsubishi",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

function detectController(logContent: string): ControllerType {
  const upper = logContent.toUpperCase();
  for (const [signature, controller] of Object.entries(CONTROLLER_SIGNATURES)) {
    if (upper.includes(signature)) {
      return controller;
    }
  }
  return "other";
}

function parseTimestamp(line: string): string | null {
  // Common timestamp formats
  const patterns = [
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/,
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,
    /(\d{2}:\d{2}:\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function classifyLogEntry(line: string): LogEntryType {
  const upper = line.toUpperCase();

  if (ALARM_PATTERNS.some((p) => p.pattern.test(line))) return "alarm";
  if (upper.includes("WARNING")) return "warning";
  if (CYCLE_PATTERNS.start.test(line)) return "cycle_start";
  if (CYCLE_PATTERNS.end.test(line)) return "cycle_end";
  if (TOOL_CHANGE_PATTERN.test(line)) return "tool_change";
  if (PROGRAM_PATTERN.test(line)) return "program_start";
  if (upper.includes("MAINTENANCE") || upper.includes("MAINT")) return "maintenance";
  if (upper.includes("OPERATOR") || upper.includes("MANUAL")) return "operator_action";
  if (upper.includes("MODE")) return "mode_change";
  if (upper.includes("PARAMETER") || upper.includes("PARAM")) return "parameter_change";

  return "unknown";
}

function extractAlarmInfo(
  line: string,
  machineId: string
): AlarmRecord | null {
  for (const { pattern, severity } of ALARM_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      const toolMatch = line.match(/T(\d+)/);
      return {
        id: generateId(),
        timestamp: parseTimestamp(line) || new Date().toISOString(),
        machineId,
        alarmCode: match[1] || "UNKNOWN",
        message: line.trim(),
        severity,
        toolNumber: toolMatch ? parseInt(toolMatch[1], 10) : undefined,
      };
    }
  }
  return null;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachineLogHarvesterEngine {
  private static harvests: Map<string, HarvestResult> = new Map();

  /**
   * Harvests data from a machine log file.
   * In production, this would read actual log files.
   */
  static harvestLog(
    filePath: string,
    options: {
      machineId?: string;
      machineType?: MachineType;
      simulatedLines?: string[];
    } = {}
  ): HarvestResult {
    const machineId = options.machineId || "MACHINE-001";
    const machineType = options.machineType || "mill";
    const lines = options.simulatedLines || [];

    const content = lines.join("\n");
    const controllerType = detectController(content);

    const entries: LogEntry[] = [];
    const alarms: AlarmRecord[] = [];
    const toolUsageMap = new Map<number, ToolUsageRecord>();

    let currentProgram: string | undefined;

    for (const line of lines) {
      const type = classifyLogEntry(line);
      const timestamp = parseTimestamp(line) || new Date().toISOString();

      // Extract program name
      const progMatch = line.match(PROGRAM_PATTERN);
      if (progMatch) {
        currentProgram = progMatch[1] || progMatch[2] || progMatch[3];
      }

      // Create log entry
      const entry: LogEntry = {
        id: generateId(),
        timestamp,
        type,
        machineId,
        programName: currentProgram,
        message: line.trim(),
        rawLine: line,
        metadata: {},
      };
      entries.push(entry);

      // Extract alarms
      if (type === "alarm") {
        const alarm = extractAlarmInfo(line, machineId);
        if (alarm) {
          alarm.programName = currentProgram;
          alarms.push(alarm);
        }
      }

      // Track tool usage
      if (type === "tool_change") {
        const toolMatch = line.match(TOOL_CHANGE_PATTERN);
        if (toolMatch) {
          const toolNum = parseInt(toolMatch[1] || toolMatch[2], 10);
          const existing = toolUsageMap.get(toolNum);
          if (existing) {
            existing.usageCount++;
            existing.lastUsed = timestamp;
            if (currentProgram && !existing.programs.includes(currentProgram)) {
              existing.programs.push(currentProgram);
            }
          } else {
            toolUsageMap.set(toolNum, {
              toolNumber: toolNum,
              machineId,
              usageCount: 1,
              totalCuttingTime: 0,
              lastUsed: timestamp,
              programs: currentProgram ? [currentProgram] : [],
            });
          }
        }
      }
    }

    // Compute cycles from start/end pairs
    const cycles: CycleData[] = this.computeCycles(entries, machineId);

    // Compute statistics
    const statistics = this.computeStatistics(entries, cycles, alarms, toolUsageMap);

    // Determine date range
    const timestamps = entries.map((e) => e.timestamp).filter(Boolean);
    const dateRange = {
      start: timestamps.length > 0 ? timestamps[0] : new Date().toISOString(),
      end: timestamps.length > 0 ? timestamps[timestamps.length - 1] : new Date().toISOString(),
    };

    const result: HarvestResult = {
      filePath,
      machineId,
      machineType,
      controllerType,
      entries,
      cycles,
      alarms,
      toolUsage: [...toolUsageMap.values()],
      dateRange,
      statistics,
      harvestedAt: new Date().toISOString(),
    };

    this.harvests.set(filePath, result);
    log.info(`[MachineLogHarvester] Harvested ${filePath}: ${entries.length} entries`);

    return result;
  }

  /**
   * Computes cycle data from log entries.
   */
  private static computeCycles(entries: LogEntry[], machineId: string): CycleData[] {
    const cycles: CycleData[] = [];
    let cycleStart: LogEntry | null = null;

    for (const entry of entries) {
      if (entry.type === "cycle_start") {
        cycleStart = entry;
      } else if (entry.type === "cycle_end" && cycleStart) {
        const startTime = new Date(cycleStart.timestamp).getTime();
        const endTime = new Date(entry.timestamp).getTime();
        const durationSeconds = Math.max(0, (endTime - startTime) / 1000);

        cycles.push({
          id: generateId(),
          machineId,
          programName: entry.programName || cycleStart.programName || "UNKNOWN",
          startTime: cycleStart.timestamp,
          endTime: entry.timestamp,
          durationSeconds,
          partCount: 1,
          toolChanges: 0,
          alarms: 0,
          status: "completed",
        });
        cycleStart = null;
      }
    }

    return cycles;
  }

  /**
   * Computes statistics from harvested data.
   */
  private static computeStatistics(
    entries: LogEntry[],
    cycles: CycleData[],
    alarms: AlarmRecord[],
    toolUsage: Map<number, ToolUsageRecord>
  ): HarvestStatistics {
    const totalCycleTime = cycles.reduce((sum, c) => sum + c.durationSeconds, 0);
    const avgCycleTime = cycles.length > 0 ? totalCycleTime / cycles.length : 0;

    // Find most used tools
    const toolsByUsage = [...toolUsage.values()].sort(
      (a, b) => b.usageCount - a.usageCount
    );
    const mostUsedTools = toolsByUsage.slice(0, 5).map((t) => t.toolNumber);

    // Find common alarms
    const alarmCounts = new Map<string, number>();
    for (const alarm of alarms) {
      alarmCounts.set(alarm.alarmCode, (alarmCounts.get(alarm.alarmCode) || 0) + 1);
    }
    const commonAlarms = [...alarmCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    // Estimate uptime (crude: non-alarm entries / total)
    const alarmEntries = entries.filter((e) => e.type === "alarm").length;
    const uptime = entries.length > 0 ? 1 - alarmEntries / entries.length : 1;

    return {
      totalEntries: entries.length,
      totalCycles: cycles.length,
      totalAlarms: alarms.length,
      avgCycleTime,
      uptime,
      partCount: cycles.reduce((sum, c) => sum + c.partCount, 0),
      mostUsedTools,
      commonAlarms,
    };
  }

  /**
   * Gets harvest result for a file.
   */
  static getHarvest(filePath: string): HarvestResult | null {
    return this.harvests.get(filePath) || null;
  }

  /**
   * Gets all harvests.
   */
  static getAllHarvests(): HarvestResult[] {
    return [...this.harvests.values()];
  }

  /**
   * Gets harvests by machine type.
   */
  static getByMachineType(type: MachineType): HarvestResult[] {
    return [...this.harvests.values()].filter((h) => h.machineType === type);
  }

  /**
   * Gets harvests by controller type.
   */
  static getByControllerType(type: ControllerType): HarvestResult[] {
    return [...this.harvests.values()].filter((h) => h.controllerType === type);
  }

  /**
   * Gets all alarms across all harvests.
   */
  static getAllAlarms(): AlarmRecord[] {
    return [...this.harvests.values()].flatMap((h) => h.alarms);
  }

  /**
   * Gets alarms by severity.
   */
  static getAlarmsBySeverity(severity: AlarmSeverity): AlarmRecord[] {
    return this.getAllAlarms().filter((a) => a.severity === severity);
  }

  /**
   * Gets tool usage across all machines.
   */
  static getAggregatedToolUsage(): Map<number, { count: number; machines: string[] }> {
    const aggregated = new Map<number, { count: number; machines: string[] }>();

    for (const harvest of this.harvests.values()) {
      for (const tool of harvest.toolUsage) {
        const existing = aggregated.get(tool.toolNumber);
        if (existing) {
          existing.count += tool.usageCount;
          if (!existing.machines.includes(harvest.machineId)) {
            existing.machines.push(harvest.machineId);
          }
        } else {
          aggregated.set(tool.toolNumber, {
            count: tool.usageCount,
            machines: [harvest.machineId],
          });
        }
      }
    }

    return aggregated;
  }

  /**
   * Searches entries by message content.
   */
  static searchEntries(keyword: string): LogEntry[] {
    const lower = keyword.toLowerCase();
    return [...this.harvests.values()]
      .flatMap((h) => h.entries)
      .filter((e) => e.message.toLowerCase().includes(lower));
  }

  /**
   * Gets aggregate statistics across all harvests.
   */
  static getAggregateStatistics(): {
    totalHarvests: number;
    totalEntries: number;
    totalCycles: number;
    totalAlarms: number;
    totalParts: number;
    byMachineType: Record<MachineType, number>;
    byControllerType: Record<ControllerType, number>;
  } {
    const harvests = [...this.harvests.values()];

    const byMachineType: Record<MachineType, number> = {
      lathe: 0,
      mill: 0,
      edm: 0,
      grinder: 0,
      other: 0,
    };

    const byControllerType: Record<ControllerType, number> = {
      fanuc: 0,
      okuma: 0,
      haas: 0,
      siemens: 0,
      mazak: 0,
      mitsubishi: 0,
      other: 0,
    };

    let totalEntries = 0;
    let totalCycles = 0;
    let totalAlarms = 0;
    let totalParts = 0;

    for (const h of harvests) {
      byMachineType[h.machineType]++;
      byControllerType[h.controllerType]++;
      totalEntries += h.statistics.totalEntries;
      totalCycles += h.statistics.totalCycles;
      totalAlarms += h.statistics.totalAlarms;
      totalParts += h.statistics.partCount;
    }

    return {
      totalHarvests: harvests.length,
      totalEntries,
      totalCycles,
      totalAlarms,
      totalParts,
      byMachineType,
      byControllerType,
    };
  }

  /**
   * Clears all harvests.
   */
  static reset(): void {
    this.harvests.clear();
    log.info("[MachineLogHarvester] Reset complete");
  }
}

export const machineLogHarvesterEngine = MachineLogHarvesterEngine;
export default MachineLogHarvesterEngine;
