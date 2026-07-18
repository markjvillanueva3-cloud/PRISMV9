/**
 * ToolPatternMinerEngine — Mine tool usage patterns from CNC programs
 *
 * Extracts common tool station assignments, insert types, holder types,
 * and builds turret layout templates by part family. Feeds into
 * SmartToolSelectorEngine for auto-tool suggestions.
 *
 * Key patterns mined:
 *   - Station assignments: T01=OD rough, T02=OD finish, T03=center drill, etc.
 *   - Insert types from comments: R.015, R.032, R.004 (nose radius)
 *   - Tool holder styles: right-hand, left-hand, boring bar, grooving
 *   - Part family templates: simple OD → boring → thread → cutoff
 *   - Common tool counts per part complexity
 *
 * @module ToolPatternMinerEngine
 */

import { log } from "../utils/Logger.js";
import type { ProgramRecord, ProgramToolRecord } from "./ProgramDatabaseEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolStationPattern {
  station: number;
  most_common_operation: string;
  operation_frequency: Record<string, number>;
  common_descriptions: string[];
  usage_count: number;
  css_pct: number;
  typical_speed_range: [number, number];
}

export interface InsertPattern {
  nose_radius: number;
  operations: string[];
  frequency: number;
  typical_stations: number[];
}

export interface TurretTemplate {
  name: string;
  complexity: "simple" | "medium" | "complex" | "advanced";
  typical_tool_count: number;
  stations: Array<{
    station: number;
    operation: string;
    description: string;
  }>;
  frequency: number;
  example_programs: string[];
}

export interface ToolMineResult {
  station_patterns: ToolStationPattern[];
  insert_patterns: InsertPattern[];
  turret_templates: TurretTemplate[];
  stats: {
    total_programs: number;
    total_tools: number;
    avg_tools_per_program: number;
    max_tools_per_program: number;
    most_common_tool_count: number;
    stations_used: number[];
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class ToolPatternMinerEngine {
  /**
   * Mine tool patterns from parsed program records.
   */
  mine(records: ProgramRecord[]): ToolMineResult {
    const stationOps = new Map<number, Map<string, number>>();
    const stationDescs = new Map<number, string[]>();
    const stationSpeeds = new Map<number, number[]>();
    const stationCSS = new Map<number, { total: number; css: number }>();
    const toolCounts: number[] = [];
    const programsByToolCount = new Map<number, string[]>();

    for (const rec of records) {
      const toolCount = rec.tools.length;
      toolCounts.push(toolCount);
      if (!programsByToolCount.has(toolCount)) programsByToolCount.set(toolCount, []);
      programsByToolCount.get(toolCount)!.push(rec.id);

      for (const tool of rec.tools) {
        const stn = tool.tool_number;

        // Track operations per station
        if (!stationOps.has(stn)) stationOps.set(stn, new Map());
        for (const op of tool.operation_types) {
          const ops = stationOps.get(stn)!;
          ops.set(op, (ops.get(op) ?? 0) + 1);
        }

        // Track descriptions
        if (tool.description) {
          if (!stationDescs.has(stn)) stationDescs.set(stn, []);
          stationDescs.get(stn)!.push(tool.description);
        }

        // Track speeds
        if (tool.speed_rpm) {
          if (!stationSpeeds.has(stn)) stationSpeeds.set(stn, []);
          stationSpeeds.get(stn)!.push(tool.speed_rpm);
        }

        // Track CSS usage
        if (!stationCSS.has(stn)) stationCSS.set(stn, { total: 0, css: 0 });
        const cssTrack = stationCSS.get(stn)!;
        cssTrack.total++;
        if (tool.css_mode) cssTrack.css++;
      }
    }

    // Build station patterns
    const stationPatterns: ToolStationPattern[] = [];
    for (const [stn, ops] of stationOps) {
      const sorted = [...ops.entries()].sort((a, b) => b[1] - a[1]);
      const speeds = stationSpeeds.get(stn) ?? [];
      const cssInfo = stationCSS.get(stn) ?? { total: 1, css: 0 };

      stationPatterns.push({
        station: stn,
        most_common_operation: sorted[0]?.[0] ?? "unknown",
        operation_frequency: Object.fromEntries(ops),
        common_descriptions: this._topN(stationDescs.get(stn) ?? [], 3),
        usage_count: sorted.reduce((sum, [, count]) => sum + count, 0),
        css_pct: Math.round(cssInfo.css / cssInfo.total * 100),
        typical_speed_range: speeds.length > 0
          ? [Math.min(...speeds), Math.max(...speeds)]
          : [0, 0],
      });
    }

    stationPatterns.sort((a, b) => b.usage_count - a.usage_count);

    // Extract insert patterns from descriptions
    const insertPatterns = this._mineInsertPatterns(records);

    // Build turret templates
    const turretTemplates = this._buildTurretTemplates(records, stationPatterns);

    // Tool count mode
    const countFreq = new Map<number, number>();
    for (const c of toolCounts) countFreq.set(c, (countFreq.get(c) ?? 0) + 1);
    const mostCommonCount = [...countFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

    return {
      station_patterns: stationPatterns,
      insert_patterns: insertPatterns,
      turret_templates: turretTemplates,
      stats: {
        total_programs: records.length,
        total_tools: toolCounts.reduce((a, b) => a + b, 0),
        avg_tools_per_program: records.length > 0
          ? Math.round(toolCounts.reduce((a, b) => a + b, 0) / records.length * 10) / 10
          : 0,
        max_tools_per_program: toolCounts.length > 0 ? Math.max(...toolCounts) : 0,
        most_common_tool_count: mostCommonCount,
        stations_used: [...stationOps.keys()].sort((a, b) => a - b),
      },
    };
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _mineInsertPatterns(records: ProgramRecord[]): InsertPattern[] {
    const radiusMap = new Map<number, { ops: Set<string>; stations: Set<number>; count: number }>();

    for (const rec of records) {
      for (const tool of rec.tools) {
        if (!tool.description) continue;

        // Match nose radius patterns: R.015, R0.032, R.004, R 0.015, etc.
        const radiusMatch = tool.description.match(/R\s*(\.?\d+\.?\d*)/i);
        if (radiusMatch) {
          const radius = parseFloat(radiusMatch[1]);
          if (radius > 0 && radius < 1) { // Valid insert nose radius
            if (!radiusMap.has(radius)) {
              radiusMap.set(radius, { ops: new Set(), stations: new Set(), count: 0 });
            }
            const entry = radiusMap.get(radius)!;
            entry.count++;
            entry.stations.add(tool.tool_number);
            for (const op of tool.operation_types) entry.ops.add(op);
          }
        }
      }
    }

    return [...radiusMap.entries()]
      .map(([radius, data]) => ({
        nose_radius: radius,
        operations: [...data.ops],
        frequency: data.count,
        typical_stations: [...data.stations].sort((a, b) => a - b),
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private _buildTurretTemplates(
    records: ProgramRecord[],
    stationPatterns: ToolStationPattern[],
  ): TurretTemplate[] {
    // Group programs by operation set (their "signature")
    const sigMap = new Map<string, ProgramRecord[]>();

    for (const rec of records) {
      const ops = [...new Set(rec.operations)].sort().join(",");
      if (!sigMap.has(ops)) sigMap.set(ops, []);
      sigMap.get(ops)!.push(rec);
    }

    const templates: TurretTemplate[] = [];

    for (const [sig, programs] of sigMap) {
      if (programs.length < 2) continue; // Need at least 2 programs for a pattern

      const ops = sig.split(",");
      const toolCount = Math.round(
        programs.reduce((sum, p) => sum + p.tools.length, 0) / programs.length,
      );

      let complexity: "simple" | "medium" | "complex" | "advanced" = "simple";
      if (toolCount >= 8) complexity = "advanced";
      else if (toolCount >= 5) complexity = "complex";
      else if (toolCount >= 3) complexity = "medium";

      // Build station list from most common pattern
      const stations: Array<{ station: number; operation: string; description: string }> = [];
      const example = programs[0];
      for (const tool of example.tools) {
        stations.push({
          station: tool.tool_number,
          operation: tool.operation_types[0] ?? "unknown",
          description: tool.description ?? `T${tool.tool_number}`,
        });
      }

      templates.push({
        name: this._templateName(ops, complexity),
        complexity,
        typical_tool_count: toolCount,
        stations,
        frequency: programs.length,
        example_programs: programs.slice(0, 3).map(p => p.filename),
      });
    }

    return templates.sort((a, b) => b.frequency - a.frequency);
  }

  private _templateName(ops: string[], complexity: string): string {
    if (ops.includes("thread") && ops.includes("od_rough")) return "OD + Threading";
    if (ops.includes("id_rough") && ops.includes("od_rough")) return "OD + ID Complete";
    if (ops.includes("cutoff") && ops.includes("od_rough")) return "Bar Work + Cutoff";
    if (ops.includes("od_rough") && !ops.includes("id_rough")) return "Simple OD";
    if (ops.includes("pocket") || ops.includes("contour")) return "Milling Contour";
    if (ops.includes("drill") && ops.length <= 2) return "Drilling Only";
    return `${complexity} (${ops.length} ops)`;
  }

  private _topN(arr: string[], n: number): string[] {
    const freq = new Map<string, number>();
    for (const item of arr) {
      const upper = item.toUpperCase().trim();
      freq.set(upper, (freq.get(upper) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([val]) => val);
  }
}

export const toolPatternMinerEngine = new ToolPatternMinerEngine();
