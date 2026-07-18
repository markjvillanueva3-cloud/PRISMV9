/**
 * MachineLogHarvesterEngine � Machine Log & Config Parser
 * U-AWR30: Machine Log Harvester (3,350 text/log/ini files)
 */

import { log } from "../utils/Logger.js";

export type LogFileType = "log" | "txt" | "ini" | "cfg" | "conf" | "csv" | "dat";
export type PatternCategory = "alarm" | "error" | "warning" | "cycle_time" | "tool_change" | "parameter" | "speed_feed" | "temperature" | "unknown";

export interface LogPattern {
  id: string;
  category: PatternCategory;
  pattern: string;
  value: string;
  context: string;
  frequency: number;
}

export interface ConfigParameter {
  key: string;
  value: string;
  section?: string;
  type: "string" | "number" | "boolean";
}

export interface LogFileMetadata {
  path: string;
  name: string;
  type: LogFileType;
  sizeBytes: number;
  lineCount: number;
}

export interface HarvestResult {
  metadata: LogFileMetadata;
  patterns: LogPattern[];
  parameters: ConfigParameter[];
  alarms: string[];
  errors: string[];
  insights: string[];
  success: boolean;
  warnings: string[];
  processingTimeMs: number;
}

export interface BatchHarvestResult {
  totalFiles: number;
  successful: number;
  failed: number;
  byType: Record<LogFileType, number>;
  totalPatterns: number;
  totalAlarms: number;
  totalParameters: number;
  results: HarvestResult[];
  insights: string[];
  processingTimeMs: number;
}

function detectFileType(filename: string): LogFileType {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const types: LogFileType[] = ["log", "txt", "ini", "cfg", "conf", "csv", "dat"];
  return types.includes(ext as LogFileType) ? (ext as LogFileType) : "txt";
}

function generatePatternId(): string {
  return "pat-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
}

export class MachineLogHarvesterEngine {
  private static results: Map<string, HarvestResult> = new Map();
  private static queue: string[] = [];
  private static globalPatterns: Map<string, LogPattern> = new Map();

  static registerFile(path: string): void {
    this.queue.push(path);
    log.info("[MachineLogHarvester] Registered: " + path);
  }

  static registerBatch(paths: string[]): void {
    paths.forEach((p) => this.registerFile(p));
  }

  static harvestFile(path: string, content: string = ""): HarvestResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    const name = path.split(/[\/\\]/).pop() || path;
    const type = detectFileType(name);

    const patterns: LogPattern[] = [];
    const parameters: ConfigParameter[] = [];
    const alarms: string[] = [];
    const errors: string[] = [];
    const insights: string[] = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Simple pattern matching for alarms
      const alarmMatch = trimmed.match(/ALARM[\s#:]*(\d+)/i);
      if (alarmMatch) {
        alarms.push(alarmMatch[1]);
        patterns.push({
          id: generatePatternId(),
          category: "alarm",
          pattern: "alarm",
          value: alarmMatch[1],
          context: trimmed.substring(0, 100),
          frequency: 1,
        });
      }
      
      // INI-style parameters
      const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
      if (kvMatch && ["ini", "cfg", "conf"].includes(type)) {
        parameters.push({
          key: kvMatch[1].trim(),
          value: kvMatch[2].trim(),
          type: "string",
        });
      }
    }

    if (alarms.length > 5) insights.push("High alarm count (" + alarms.length + ")");
    if (parameters.length > 20) insights.push("Rich config (" + parameters.length + " params)");

    // Populate global patterns
    for (const p of patterns) {
      const existing = this.globalPatterns.get(p.pattern + p.value);
      if (existing) {
        existing.frequency++;
      } else {
        this.globalPatterns.set(p.pattern + p.value, { ...p });
      }
    }

    const metadata: LogFileMetadata = { path, name, type, sizeBytes: content.length, lineCount: lines.length };

    const result: HarvestResult = {
      metadata, patterns, parameters,
      alarms: [...new Set(alarms)],
      errors: [...new Set(errors)],
      insights, success: true, warnings,
      processingTimeMs: Date.now() - startTime,
    };

    this.results.set(path, result);
    log.info("[MachineLogHarvester] Harvested " + name);
    return result;
  }

  static harvestBatch(contentMap?: Map<string, string>): BatchHarvestResult {
    const startTime = Date.now();
    const results: HarvestResult[] = [];
    const byType: Record<LogFileType, number> = { log: 0, txt: 0, ini: 0, cfg: 0, conf: 0, csv: 0, dat: 0 };
    let totalPatterns = 0, totalAlarms = 0, totalParameters = 0, successful = 0;

    for (const path of this.queue) {
      const content = contentMap?.get(path) || "";
      const result = this.harvestFile(path, content);
      results.push(result);
      byType[result.metadata.type]++;
      totalPatterns += result.patterns.length;
      totalAlarms += result.alarms.length;
      totalParameters += result.parameters.length;
      if (result.success) successful++;
    }

    return {
      totalFiles: this.queue.length, successful, failed: this.queue.length - successful,
      byType, totalPatterns, totalAlarms, totalParameters, results, insights: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  static getResult(path: string): HarvestResult | null { return this.results.get(path) || null; }
  static getAllResults(): HarvestResult[] { return [...this.results.values()]; }
  static findByAlarm(alarmCode: string): HarvestResult[] {
    return [...this.results.values()].filter((r) => r.alarms.some((a) => a.includes(alarmCode)));
  }
  /** Flat list of every harvested alarm code, tagged with its source file. */
  static getAllAlarms(): { total: number; alarms: Array<{ code: string; file: string }> } {
    const alarms: Array<{ code: string; file: string }> = [];
    for (const r of this.results.values()) {
      for (const code of r.alarms) alarms.push({ code, file: r.metadata.path });
    }
    return { total: alarms.length, alarms };
  }
  static getGlobalPatternStats(): { total: number; byCategory: Record<PatternCategory, number>; topPatterns: LogPattern[] } {
    const byCategory: Record<PatternCategory, number> = {
      alarm: 0, error: 0, warning: 0, cycle_time: 0, tool_change: 0, parameter: 0, speed_feed: 0, temperature: 0, unknown: 0,
    };
    for (const pattern of this.globalPatterns.values()) byCategory[pattern.category] += pattern.frequency;
    return { total: this.globalPatterns.size, byCategory, topPatterns: [...this.globalPatterns.values()].slice(0, 10) };
  }
  static getQueueStats(): { queued: number; processed: number; pending: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const path of this.queue) { const type = detectFileType(path); byType[type] = (byType[type] || 0) + 1; }
    return { queued: this.queue.length, processed: this.results.size, pending: this.queue.length - this.results.size, byType };
  }
  static reset(): void {
    this.results.clear();
    this.queue = [];
    this.globalPatterns.clear();
    log.info("[MachineLogHarvester] State reset");
  }
}

export const machineLogHarvesterEngine = MachineLogHarvesterEngine;
export default MachineLogHarvesterEngine;
