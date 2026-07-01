/**
 * ProgramMemoryEngine — U-BOX66
 *
 * Remembers tool selections per customer/part number. Auto-populates
 * previous selections on re-upload. Tracks which assignments produced
 * good results. Builds shop-standard tool assignments per operation type.
 *
 * Persistence: in-memory with JSON serialization for session persistence.
 *
 * @module engines/ProgramMemoryEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolAssignment {
  station: number;
  tool_id: string;
  tool_description: string;
  operation_type: string;
  speed_rpm: number | null;
  feed_rate: number | null;
  notes: string | null;
}

export interface ProgramRecord {
  key: string;
  customer: string;
  part_number: string;
  filename: string;
  dialect: string;
  assignments: ToolAssignment[];
  last_used: string;
  use_count: number;
  rated_good: boolean;
}

export interface ToolDefault {
  operation_type: string;
  tool_id: string;
  tool_description: string;
  frequency: number;
  avg_rpm: number | null;
  avg_feed: number | null;
  programs_used: string[];
}

export interface MemoryStats {
  total_records: number;
  total_assignments: number;
  unique_customers: number;
  unique_parts: number;
  defaults_count: number;
  good_rated_count: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ProgramMemoryEngine {
  private records = new Map<string, ProgramRecord>();

  /**
   * Save tool assignments for a program.
   */
  save(
    customer: string,
    partNumber: string,
    filename: string,
    dialect: string,
    assignments: ToolAssignment[],
  ): ProgramRecord {
    const key = this._makeKey(customer, partNumber);
    const existing = this.records.get(key);

    const record: ProgramRecord = {
      key,
      customer,
      part_number: partNumber,
      filename,
      dialect,
      assignments,
      last_used: new Date().toISOString(),
      use_count: existing ? existing.use_count + 1 : 1,
      rated_good: existing?.rated_good ?? false,
    };

    this.records.set(key, record);
    log.debug(`[ProgramMemory] Saved ${assignments.length} assignments for ${customer}/${partNumber}`);
    return record;
  }

  /**
   * Look up previous tool assignments for a customer/part.
   */
  recall(customer: string, partNumber: string): ProgramRecord | null {
    const key = this._makeKey(customer, partNumber);
    return this.records.get(key) ?? null;
  }

  /**
   * Mark a program's assignments as producing good results.
   */
  rateGood(customer: string, partNumber: string): boolean {
    const key = this._makeKey(customer, partNumber);
    const record = this.records.get(key);
    if (!record) return false;
    record.rated_good = true;
    return true;
  }

  /**
   * Get shop-standard tool defaults by operation type.
   * Derived from all saved records, weighted by good ratings.
   */
  getDefaults(): ToolDefault[] {
    const opMap = new Map<string, {
      tool_id: string;
      tool_desc: string;
      count: number;
      rpms: number[];
      feeds: number[];
      programs: Set<string>;
    }>();

    for (const record of this.records.values()) {
      const weight = record.rated_good ? 2 : 1;
      for (const assign of record.assignments) {
        const opKey = `${assign.operation_type}||${assign.tool_id}`;
        const existing = opMap.get(opKey);
        if (existing) {
          existing.count += weight;
          if (assign.speed_rpm) existing.rpms.push(assign.speed_rpm);
          if (assign.feed_rate) existing.feeds.push(assign.feed_rate);
          existing.programs.add(record.filename);
        } else {
          opMap.set(opKey, {
            tool_id: assign.tool_id,
            tool_desc: assign.tool_description,
            count: weight,
            rpms: assign.speed_rpm ? [assign.speed_rpm] : [],
            feeds: assign.feed_rate ? [assign.feed_rate] : [],
            programs: new Set([record.filename]),
          });
        }
      }
    }

    const defaults: ToolDefault[] = [];
    for (const [key, data] of opMap) {
      const opType = key.split("||")[0];
      defaults.push({
        operation_type: opType,
        tool_id: data.tool_id,
        tool_description: data.tool_desc,
        frequency: data.count,
        avg_rpm: data.rpms.length > 0
          ? Math.round(data.rpms.reduce((a, b) => a + b, 0) / data.rpms.length)
          : null,
        avg_feed: data.feeds.length > 0
          ? Math.round((data.feeds.reduce((a, b) => a + b, 0) / data.feeds.length) * 1000) / 1000
          : null,
        programs_used: Array.from(data.programs),
      });
    }

    // Sort by frequency descending
    defaults.sort((a, b) => b.frequency - a.frequency);
    return defaults;
  }

  /**
   * Search for programs by customer name.
   */
  searchByCustomer(customer: string): ProgramRecord[] {
    const results: ProgramRecord[] = [];
    const lowerQuery = customer.toLowerCase();
    for (const record of this.records.values()) {
      if (record.customer.toLowerCase().includes(lowerQuery)) {
        results.push(record);
      }
    }
    return results;
  }

  /**
   * Get usage statistics.
   */
  getStats(): MemoryStats {
    const customers = new Set<string>();
    const parts = new Set<string>();
    let totalAssign = 0;
    let goodCount = 0;

    for (const record of this.records.values()) {
      customers.add(record.customer);
      parts.add(record.part_number);
      totalAssign += record.assignments.length;
      if (record.rated_good) goodCount++;
    }

    return {
      total_records: this.records.size,
      total_assignments: totalAssign,
      unique_customers: customers.size,
      unique_parts: parts.size,
      defaults_count: this.getDefaults().length,
      good_rated_count: goodCount,
    };
  }

  /**
   * Export all records as JSON for persistence.
   */
  exportJSON(): string {
    return JSON.stringify(Array.from(this.records.values()), null, 2);
  }

  /**
   * Import records from JSON.
   */
  importJSON(json: string): number {
    const records = JSON.parse(json) as ProgramRecord[];
    let count = 0;
    for (const record of records) {
      this.records.set(record.key, record);
      count++;
    }
    return count;
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.records.clear();
  }

  private _makeKey(customer: string, partNumber: string): string {
    return `${customer.toLowerCase().trim()}::${partNumber.toLowerCase().trim()}`;
  }
}

export const programMemoryEngine = new ProgramMemoryEngine();
