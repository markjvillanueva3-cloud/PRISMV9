/**
 * ProgramDatabaseEngine — In-memory program database for parsed CNC programs
 *
 * Stores parsed program metadata from all parsers (Okuma, Haas, Hurco,
 * Roku-Roku). Provides fast queries by machine, customer, operation type,
 * date range, and tool. Used by pattern mining and optimization pipelines.
 *
 * Uses a simple in-memory store with JSON persistence (no SQLite dependency
 * needed — the dataset fits in memory and persistence is via JSON snapshots).
 *
 * @module ProgramDatabaseEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface ProgramRecord {
  id: string;
  file_path: string;
  filename: string;
  machine_type: string;
  controller: string;
  material_hint: string | null;
  customer: string;
  last_modified: string;
  line_count: number;
  file_size: number;
  tools: ProgramToolRecord[];
  operations: string[];
  speeds: number[];
  feeds: number[];
  cycle_time_est_sec: number | null;
  has_macros: boolean;
  has_bar_feeder: boolean;
  has_live_tooling: boolean;
  has_threading: boolean;
  has_c_axis: boolean;
  has_probing: boolean;
  has_high_speed: boolean;
  safety_warnings: string[];
  parser_used: string;
  parsed_at: string;
}

export interface ProgramToolRecord {
  tool_number: number;
  description: string | null;
  operation_types: string[];
  speed_rpm: number | null;
  feed: number | null;
  css_mode: boolean;
}

export interface ProgramQuery {
  machine_type?: string;
  customer?: string;
  operation_type?: string;
  has_threading?: boolean;
  has_bar_feeder?: boolean;
  has_c_axis?: boolean;
  has_probing?: boolean;
  has_high_speed?: boolean;
  min_date?: string;
  max_date?: string;
  min_tools?: number;
  max_tools?: number;
  filename_contains?: string;
  limit?: number;
  offset?: number;
}

export interface DatabaseStats {
  total_programs: number;
  by_machine: Record<string, number>;
  by_customer: Record<string, number>;
  by_year: Record<string, number>;
  by_operation: Record<string, number>;
  total_tools_extracted: number;
  total_speeds_extracted: number;
  programs_with_threading: number;
  programs_with_bar_feeder: number;
  programs_with_c_axis: number;
  programs_with_probing: number;
  programs_with_high_speed: number;
  average_line_count: number;
  average_tool_count: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ProgramDatabaseEngine {
  private records: Map<string, ProgramRecord> = new Map();
  private persistPath: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath ?? path.join(
      process.cwd(), "data", "program-database.json",
    );
  }

  /**
   * Add a parsed program record.
   */
  addRecord(record: ProgramRecord): void {
    this.records.set(record.id, record);
  }

  /**
   * Add multiple records in batch.
   */
  addBatch(records: ProgramRecord[]): number {
    for (const r of records) {
      this.records.set(r.id, r);
    }
    return records.length;
  }

  /**
   * Get a record by ID.
   */
  getRecord(id: string): ProgramRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Query programs with filters.
   */
  query(q: ProgramQuery): ProgramRecord[] {
    let results = Array.from(this.records.values());

    if (q.machine_type) {
      results = results.filter(r => r.machine_type === q.machine_type);
    }
    if (q.customer) {
      const cust = q.customer.toUpperCase();
      results = results.filter(r => r.customer.toUpperCase().includes(cust));
    }
    if (q.operation_type) {
      const op = q.operation_type;
      results = results.filter(r => r.operations.includes(op));
    }
    if (q.has_threading !== undefined) {
      results = results.filter(r => r.has_threading === q.has_threading);
    }
    if (q.has_bar_feeder !== undefined) {
      results = results.filter(r => r.has_bar_feeder === q.has_bar_feeder);
    }
    if (q.has_c_axis !== undefined) {
      results = results.filter(r => r.has_c_axis === q.has_c_axis);
    }
    if (q.has_probing !== undefined) {
      results = results.filter(r => r.has_probing === q.has_probing);
    }
    if (q.has_high_speed !== undefined) {
      results = results.filter(r => r.has_high_speed === q.has_high_speed);
    }
    if (q.min_date) {
      results = results.filter(r => r.last_modified >= q.min_date!);
    }
    if (q.max_date) {
      results = results.filter(r => r.last_modified <= q.max_date!);
    }
    if (q.min_tools !== undefined) {
      results = results.filter(r => r.tools.length >= q.min_tools!);
    }
    if (q.max_tools !== undefined) {
      results = results.filter(r => r.tools.length <= q.max_tools!);
    }
    if (q.filename_contains) {
      const search = q.filename_contains.toUpperCase();
      results = results.filter(r => r.filename.toUpperCase().includes(search));
    }

    // Sort by date descending (newest first)
    results.sort((a, b) => b.last_modified.localeCompare(a.last_modified));

    // Pagination
    const offset = q.offset ?? 0;
    const limit = q.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get database statistics.
   */
  getStats(): DatabaseStats {
    const records = Array.from(this.records.values());

    const byMachine: Record<string, number> = {};
    const byCustomer: Record<string, number> = {};
    const byYear: Record<string, number> = {};
    const byOperation: Record<string, number> = {};

    let totalTools = 0;
    let totalSpeeds = 0;
    let totalLines = 0;

    for (const r of records) {
      byMachine[r.machine_type] = (byMachine[r.machine_type] ?? 0) + 1;
      byCustomer[r.customer] = (byCustomer[r.customer] ?? 0) + 1;

      const year = r.last_modified.substring(0, 4);
      byYear[year] = (byYear[year] ?? 0) + 1;

      for (const op of r.operations) {
        byOperation[op] = (byOperation[op] ?? 0) + 1;
      }

      totalTools += r.tools.length;
      totalSpeeds += r.speeds.length;
      totalLines += r.line_count;
    }

    return {
      total_programs: records.length,
      by_machine: byMachine,
      by_customer: byCustomer,
      by_year: byYear,
      by_operation: byOperation,
      total_tools_extracted: totalTools,
      total_speeds_extracted: totalSpeeds,
      programs_with_threading: records.filter(r => r.has_threading).length,
      programs_with_bar_feeder: records.filter(r => r.has_bar_feeder).length,
      programs_with_c_axis: records.filter(r => r.has_c_axis).length,
      programs_with_probing: records.filter(r => r.has_probing).length,
      programs_with_high_speed: records.filter(r => r.has_high_speed).length,
      average_line_count: records.length > 0 ? Math.round(totalLines / records.length) : 0,
      average_tool_count: records.length > 0 ? Math.round(totalTools / records.length * 10) / 10 : 0,
    };
  }

  /**
   * Get all unique speed/feed pairs grouped by machine and operation type.
   * Used by pattern mining to build calibration tables.
   */
  getSpeedFeedPatterns(): Record<string, Record<string, Array<{ speed: number; feed: number; count: number }>>> {
    const patterns: Record<string, Record<string, Map<string, { speed: number; feed: number; count: number }>>> = {};

    for (const r of this.records.values()) {
      if (!patterns[r.machine_type]) patterns[r.machine_type] = {};

      for (const tool of r.tools) {
        for (const opType of tool.operation_types) {
          if (!patterns[r.machine_type][opType]) {
            patterns[r.machine_type][opType] = new Map();
          }

          if (tool.speed_rpm !== null && tool.feed !== null) {
            const key = `${tool.speed_rpm}:${tool.feed}`;
            const existing = patterns[r.machine_type][opType].get(key);
            if (existing) {
              existing.count++;
            } else {
              patterns[r.machine_type][opType].set(key, {
                speed: tool.speed_rpm,
                feed: tool.feed,
                count: 1,
              });
            }
          }
        }
      }
    }

    // Convert maps to arrays
    const result: Record<string, Record<string, Array<{ speed: number; feed: number; count: number }>>> = {};
    for (const [machine, ops] of Object.entries(patterns)) {
      result[machine] = {};
      for (const [op, sfMap] of Object.entries(ops)) {
        result[machine][op] = Array.from(sfMap.values()).sort((a, b) => b.count - a.count);
      }
    }

    return result;
  }

  /**
   * Persist database to JSON file.
   */
  save(): void {
    const dir = path.dirname(this.persistPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = {
      version: "1.0.0",
      saved_at: new Date().toISOString(),
      record_count: this.records.size,
      records: Array.from(this.records.values()),
    };

    fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
    log.info(`ProgramDatabase: Saved ${this.records.size} records to ${this.persistPath}`);
  }

  /**
   * Load database from JSON file.
   */
  load(): number {
    if (!fs.existsSync(this.persistPath)) return 0;

    try {
      const raw = fs.readFileSync(this.persistPath, "utf8");
      const data = JSON.parse(raw);

      if (Array.isArray(data.records)) {
        for (const r of data.records) {
          this.records.set(r.id, r);
        }
        log.info(`ProgramDatabase: Loaded ${this.records.size} records from ${this.persistPath}`);
        return this.records.size;
      }
    } catch (err) {
      log.warn(`ProgramDatabase: Load error: ${(err as Error).message}`);
    }

    return 0;
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Get total record count.
   */
  get size(): number {
    return this.records.size;
  }
}

export const programDatabaseEngine = new ProgramDatabaseEngine();
