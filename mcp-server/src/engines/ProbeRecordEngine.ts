/**
 * ProbeRecordEngine — Probe Measurement Records
 * ==============================================
 *
 * Records and manages in-machine probing data from
 * touch probes and tool setters.
 *
 * L2-P4-MS1/P0-U02 — Batch 4: Measurement & QC Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ProbeTypeSchema = z.enum(["touch_probe", "tool_setter", "laser_probe", "radio_probe"]);

export const ProbeCycleSchema = z.enum([
  "single_surface", "bore", "boss", "web", "pocket",
  "corner", "angle", "tool_length", "tool_diameter", "tool_breakage"
]);

export const ProbeRecordSchema = z.object({
  id: z.string(),
  machineId: z.string(),
  probeId: z.string(),
  probeType: ProbeTypeSchema,
  cycleType: ProbeCycleSchema,
  workOrderNumber: z.string().optional(),
  partNumber: z.string().optional(),
  operationNumber: z.number().optional(),
  featureName: z.string(),
  nominal: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    diameter: z.number().optional(),
    length: z.number().optional(),
  }),
  actual: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    diameter: z.number().optional(),
    length: z.number().optional(),
  }),
  deviation: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    diameter: z.number().optional(),
    length: z.number().optional(),
  }),
  tolerance: z.number(),
  inTolerance: z.boolean(),
  compensationApplied: z.boolean().default(false),
  compensationType: z.enum(["work_offset", "tool_offset", "none"]).default("none"),
  offsetNumber: z.number().optional(),
  offsetValue: z.number().optional(),
  timestamp: z.string(),
  programLine: z.number().optional(),
  feedrate: z.number().optional(),
});

export const ToolSetterRecordSchema = z.object({
  id: z.string(),
  machineId: z.string(),
  toolNumber: z.number(),
  toolDescription: z.string().optional(),
  measuredLength: z.number(),
  measuredDiameter: z.number().optional(),
  lengthOffset: z.number(),
  diameterOffset: z.number().optional(),
  breakageDetected: z.boolean().default(false),
  wearAmount: z.number().optional(),
  timestamp: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProbeType = z.infer<typeof ProbeTypeSchema>;
export type ProbeCycle = z.infer<typeof ProbeCycleSchema>;
export type ProbeRecord = z.infer<typeof ProbeRecordSchema>;
export type ToolSetterRecord = z.infer<typeof ToolSetterRecordSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const probeRecords: Map<string, ProbeRecord> = new Map();
const toolSetterRecords: Map<string, ToolSetterRecord[]> = new Map();
let probeCounter = 1;
let toolSetterCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ProbeRecordEngine {
  /**
   * Record a probe measurement
   */
  static recordProbe(data: Omit<ProbeRecord, "id" | "timestamp" | "deviation" | "inTolerance">): ProbeRecord {
    const deviation: ProbeRecord["deviation"] = {};

    if (data.nominal.x !== undefined && data.actual.x !== undefined) {
      deviation.x = Math.round((data.actual.x - data.nominal.x) * 10000) / 10000;
    }
    if (data.nominal.y !== undefined && data.actual.y !== undefined) {
      deviation.y = Math.round((data.actual.y - data.nominal.y) * 10000) / 10000;
    }
    if (data.nominal.z !== undefined && data.actual.z !== undefined) {
      deviation.z = Math.round((data.actual.z - data.nominal.z) * 10000) / 10000;
    }
    if (data.nominal.diameter !== undefined && data.actual.diameter !== undefined) {
      deviation.diameter = Math.round((data.actual.diameter - data.nominal.diameter) * 10000) / 10000;
    }
    if (data.nominal.length !== undefined && data.actual.length !== undefined) {
      deviation.length = Math.round((data.actual.length - data.nominal.length) * 10000) / 10000;
    }

    const maxDeviation = Math.max(
      Math.abs(deviation.x || 0),
      Math.abs(deviation.y || 0),
      Math.abs(deviation.z || 0),
      Math.abs(deviation.diameter || 0),
      Math.abs(deviation.length || 0)
    );

    const record: ProbeRecord = {
      ...data,
      id: `PRB-${++probeCounter}`,
      deviation,
      inTolerance: maxDeviation <= data.tolerance,
      timestamp: new Date().toISOString(),
    };

    probeRecords.set(record.id, record);
    return record;
  }

  /**
   * Record a tool setter measurement
   */
  static recordToolSetter(data: Omit<ToolSetterRecord, "id" | "timestamp">): ToolSetterRecord {
    const record: ToolSetterRecord = {
      ...data,
      id: `TS-${++toolSetterCounter}`,
      timestamp: new Date().toISOString(),
    };

    const key = `${data.machineId}:T${data.toolNumber}`;
    const records = toolSetterRecords.get(key) || [];
    records.push(record);
    toolSetterRecords.set(key, records);

    return record;
  }

  /**
   * Get probe record by ID
   */
  static getProbeRecord(id: string): ProbeRecord | undefined {
    return probeRecords.get(id);
  }

  /**
   * List probe records for a machine/part
   */
  static listProbeRecords(filter: { machineId?: string; partNumber?: string; workOrderNumber?: string }): ProbeRecord[] {
    let results = Array.from(probeRecords.values());

    if (filter.machineId) {
      results = results.filter(r => r.machineId === filter.machineId);
    }
    if (filter.partNumber) {
      results = results.filter(r => r.partNumber === filter.partNumber);
    }
    if (filter.workOrderNumber) {
      results = results.filter(r => r.workOrderNumber === filter.workOrderNumber);
    }

    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get tool setter history
   */
  static getToolSetterHistory(machineId: string, toolNumber: number, limit?: number): ToolSetterRecord[] {
    const key = `${machineId}:T${toolNumber}`;
    const records = toolSetterRecords.get(key) || [];
    const sorted = records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Detect tool wear trend
   */
  static analyzeToolWear(machineId: string, toolNumber: number): {
    tool: string;
    measurements: number;
    initialLength: number;
    currentLength: number;
    totalWear: number;
    wearRate: number;
    estimatedLife: number;
  } | undefined {
    const history = this.getToolSetterHistory(machineId, toolNumber);
    if (history.length < 2) return undefined;

    const oldest = history[history.length - 1];
    const newest = history[0];
    const totalWear = oldest.measuredLength - newest.measuredLength;

    const oldestTime = new Date(oldest.timestamp).getTime();
    const newestTime = new Date(newest.timestamp).getTime();
    const hoursElapsed = (newestTime - oldestTime) / (1000 * 60 * 60);

    const wearRate = hoursElapsed > 0 ? totalWear / hoursElapsed : 0;
    const remainingWear = 1.0; // Assume 1mm max wear before replacement
    const estimatedLife = wearRate > 0 ? (remainingWear - totalWear) / wearRate : Infinity;

    return {
      tool: `T${toolNumber}`,
      measurements: history.length,
      initialLength: oldest.measuredLength,
      currentLength: newest.measuredLength,
      totalWear: Math.round(totalWear * 10000) / 10000,
      wearRate: Math.round(wearRate * 10000) / 10000,
      estimatedLife: Math.round(estimatedLife * 10) / 10,
    };
  }

  /**
   * Get out-of-tolerance probe records
   */
  static getOutOfTolerance(machineId?: string): ProbeRecord[] {
    let results = Array.from(probeRecords.values()).filter(r => !r.inTolerance);
    if (machineId) {
      results = results.filter(r => r.machineId === machineId);
    }
    return results;
  }

  /**
   * Get broken tool alerts
   */
  static getBrokenToolAlerts(): ToolSetterRecord[] {
    const alerts: ToolSetterRecord[] = [];
    for (const records of toolSetterRecords.values()) {
      const broken = records.filter(r => r.breakageDetected);
      alerts.push(...broken);
    }
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static getSelfAwareness() {
    return {
      name: "ProbeRecordEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["recordProbe", "recordToolSetter", "getProbeRecord", "listProbeRecords", "getToolSetterHistory", "analyzeToolWear", "getOutOfTolerance", "getBrokenToolAlerts"],
      probeTypes: ["touch_probe", "tool_setter", "laser_probe", "radio_probe"],
      cycleTypes: ["single_surface", "bore", "boss", "web", "pocket", "corner", "angle", "tool_length", "tool_diameter", "tool_breakage"],
      dependencies: [],
    };
  }
}

export const probeRecordEngine = new ProbeRecordEngine();
