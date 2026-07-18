/**
 * OperationSequenceMinerEngine — Mine operation ordering patterns from CNC programs
 *
 * Extracts the most common operation sequences and builds optimal templates.
 * Detects deviations from standard shop practice and identifies risky orderings
 * (e.g., threading before finishing, grooving without prior rough).
 *
 * Common lathe sequence:
 *   face → OD rough → OD finish → center drill → drill → bore rough →
 *   bore finish → groove → thread → cutoff
 *
 * @module OperationSequenceMinerEngine
 */

import { log } from "../utils/Logger.js";
import type { ProgramRecord } from "./ProgramDatabaseEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SequencePattern {
  sequence: string[];
  frequency: number;
  machine_types: string[];
  example_programs: string[];
  avg_tool_count: number;
}

export interface SequenceDeviation {
  program_id: string;
  filename: string;
  expected_position: number;
  actual_position: number;
  operation: string;
  reason: string;
  severity: "info" | "warning" | "error";
}

export interface SequenceTemplate {
  name: string;
  machine_type: string;
  operations: string[];
  frequency: number;
  is_standard: boolean;
}

export interface SequenceMineResult {
  patterns: SequencePattern[];
  deviations: SequenceDeviation[];
  templates: SequenceTemplate[];
  bigrams: Array<{ from: string; to: string; count: number; pct: number }>;
  stats: {
    total_programs: number;
    unique_sequences: number;
    most_common_sequence: string[];
    most_common_frequency: number;
    avg_operations_per_program: number;
    deviation_count: number;
  };
}

// ============================================================================
// STANDARD SEQUENCES (canonical shop practice)
// ============================================================================

/** Standard lathe operation order — used for deviation detection */
const LATHE_STANDARD_ORDER: Record<string, number> = {
  face: 1,
  od_rough: 2,
  od_finish: 3,
  center_drill: 4,
  drill: 5,
  peck_drill: 5,
  id_rough: 6,
  id_finish: 7,
  bore: 6,
  bore_rough: 6,
  bore_finish: 7,
  groove: 8,
  thread: 9,
  cutoff: 10,
};

/** Risky sequences that should be flagged */
const RISKY_SEQUENCES: Array<{ before: string; after: string; reason: string }> = [
  { before: "thread", after: "od_finish", reason: "Threading before finishing may damage thread surface" },
  { before: "cutoff", after: "od_rough", reason: "Operations after cutoff — part already separated" },
  { before: "cutoff", after: "thread", reason: "Threading after cutoff — part detached" },
  { before: "groove", after: "od_rough", reason: "Grooving before roughing may cause chatter on thin section" },
  { before: "drill", after: "face", reason: "Drilling before facing — no clean reference surface" },
];

// ============================================================================
// ENGINE
// ============================================================================

export class OperationSequenceMinerEngine {
  /**
   * Mine operation sequences from program records.
   */
  mine(records: ProgramRecord[]): SequenceMineResult {
    // Extract sequences
    const seqMap = new Map<string, { records: ProgramRecord[]; machines: Set<string> }>();

    for (const rec of records) {
      if (rec.operations.length === 0) continue;
      const key = rec.operations.join("→");

      if (!seqMap.has(key)) seqMap.set(key, { records: [], machines: new Set() });
      const entry = seqMap.get(key)!;
      entry.records.push(rec);
      entry.machines.add(rec.machine_type);
    }

    // Build patterns
    const patterns: SequencePattern[] = [...seqMap.entries()]
      .map(([, data]) => ({
        sequence: data.records[0].operations,
        frequency: data.records.length,
        machine_types: [...data.machines],
        example_programs: data.records.slice(0, 3).map(r => r.filename),
        avg_tool_count: Math.round(
          data.records.reduce((sum, r) => sum + r.tools.length, 0) / data.records.length * 10,
        ) / 10,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Detect deviations from standard order
    const deviations = this._detectDeviations(records);

    // Build templates
    const templates = this._buildTemplates(patterns);

    // Compute bigrams (operation transitions)
    const bigrams = this._computeBigrams(records);

    // Stats
    const allOps = records.flatMap(r => r.operations);
    const mostCommon = patterns[0];

    return {
      patterns: patterns.slice(0, 20), // Top 20
      deviations,
      templates,
      bigrams: bigrams.slice(0, 30), // Top 30
      stats: {
        total_programs: records.length,
        unique_sequences: seqMap.size,
        most_common_sequence: mostCommon?.sequence ?? [],
        most_common_frequency: mostCommon?.frequency ?? 0,
        avg_operations_per_program: records.length > 0
          ? Math.round(allOps.length / records.length * 10) / 10
          : 0,
        deviation_count: deviations.length,
      },
    };
  }

  /**
   * Check a single program's operation order against standard practice.
   */
  checkOrder(operations: string[]): SequenceDeviation[] {
    const deviations: SequenceDeviation[] = [];

    for (let i = 0; i < operations.length - 1; i++) {
      const current = operations[i];
      const next = operations[i + 1];

      const currentPos = LATHE_STANDARD_ORDER[current];
      const nextPos = LATHE_STANDARD_ORDER[next];

      if (currentPos !== undefined && nextPos !== undefined && currentPos > nextPos) {
        deviations.push({
          program_id: "",
          filename: "",
          expected_position: nextPos,
          actual_position: i + 1,
          operation: next,
          reason: `${next} (standard pos ${nextPos}) appears after ${current} (standard pos ${currentPos})`,
          severity: "warning",
        });
      }

      // Check risky sequences
      for (const risky of RISKY_SEQUENCES) {
        if (current === risky.before && next === risky.after) {
          deviations.push({
            program_id: "",
            filename: "",
            expected_position: -1,
            actual_position: i + 1,
            operation: `${current}→${next}`,
            reason: risky.reason,
            severity: "error",
          });
        }
      }
    }

    return deviations;
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _detectDeviations(records: ProgramRecord[]): SequenceDeviation[] {
    const deviations: SequenceDeviation[] = [];

    for (const rec of records) {
      const devs = this.checkOrder(rec.operations);
      for (const d of devs) {
        d.program_id = rec.id;
        d.filename = rec.filename;
        deviations.push(d);
      }
    }

    return deviations;
  }

  private _buildTemplates(patterns: SequencePattern[]): SequenceTemplate[] {
    const templates: SequenceTemplate[] = [];

    for (const p of patterns) {
      if (p.frequency < 2) continue;

      const ops = p.sequence;
      let name = "Custom Sequence";
      let isStandard = false;

      // Classify
      if (this._isSubset(ops, ["face", "od_rough", "od_finish"])) {
        name = "Simple OD Turning";
        isStandard = true;
      } else if (this._isSubset(ops, ["od_rough", "od_finish", "drill", "id_rough", "id_finish"])) {
        name = "OD + ID Complete";
        isStandard = true;
      } else if (ops.includes("thread")) {
        name = ops.includes("id_rough") ? "OD + ID + Threading" : "OD + Threading";
        isStandard = true;
      } else if (ops.includes("cutoff")) {
        name = "Bar Work + Cutoff";
        isStandard = true;
      } else if (ops.includes("pocket") || ops.includes("contour")) {
        name = "Milling Operations";
      }

      for (const mt of p.machine_types) {
        templates.push({
          name,
          machine_type: mt,
          operations: ops,
          frequency: p.frequency,
          is_standard: isStandard,
        });
      }
    }

    return templates;
  }

  private _computeBigrams(records: ProgramRecord[]): Array<{ from: string; to: string; count: number; pct: number }> {
    const bigramCounts = new Map<string, number>();
    let totalBigrams = 0;

    for (const rec of records) {
      for (let i = 0; i < rec.operations.length - 1; i++) {
        const key = `${rec.operations[i]}→${rec.operations[i + 1]}`;
        bigramCounts.set(key, (bigramCounts.get(key) ?? 0) + 1);
        totalBigrams++;
      }
    }

    return [...bigramCounts.entries()]
      .map(([key, count]) => {
        const [from, to] = key.split("→");
        return { from, to, count, pct: Math.round(count / totalBigrams * 1000) / 10 };
      })
      .sort((a, b) => b.count - a.count);
  }

  private _isSubset(ops: string[], required: string[]): boolean {
    return required.every(r => ops.includes(r));
  }
}

export const operationSequenceMinerEngine = new OperationSequenceMinerEngine();
