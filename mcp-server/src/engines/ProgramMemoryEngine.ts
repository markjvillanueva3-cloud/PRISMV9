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
  /**
   * Optional pointer to the linked blueprint (back-annotated via U-PPL-D1's
   * ProgramPrintLinkIndexEngine). Absent when no print could be matched.
   * Populated by the dispatcher's auto-link orchestration on save, or
   * explicitly via `linkPrint()`.
   */
  linked_blueprint_path?: string;
  /**
   * Match confidence (v6 union: "exact" | "loose" | "ambiguous" |
   * "filename_exact" | "filename_loose") — kept as string for forward-compat
   * with future enum extensions, validated only at the dispatcher layer.
   */
  linked_blueprint_confidence?: string;
  /** Optional 1-indexed PDF page when the print is multi-page (Docustrata containers). */
  linked_blueprint_page?: number;
}

/**
 * Print-pointer payload — the shape `linkPrint()` and the dispatcher's
 * auto-link orchestration both produce.
 */
export interface BlueprintLinkInfo {
  path: string;
  confidence: string;
  page?: number;
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
   *
   * Backwards-compatible: the optional `linkInfo` 6th arg attaches a
   * blueprint pointer if the caller (typically the dispatcher's auto-link
   * orchestration around `ProgramPrintLinkIndexEngine.lookupPrintForProgram`)
   * has already resolved one. Older 5-arg calls keep working unchanged.
   *
   * If `linkInfo` is omitted on re-save AND the existing record already had
   * a link, the prior link is preserved (re-save without a new resolution
   * must not silently strip a known-good pointer).
   */
  save(
    customer: string,
    partNumber: string,
    filename: string,
    dialect: string,
    assignments: ToolAssignment[],
    linkInfo?: BlueprintLinkInfo | null,
  ): ProgramRecord {
    const key = this._makeKey(customer, partNumber);
    const existing = this.records.get(key);

    const validated = linkInfo ? this._validateLinkInfo(linkInfo) : null;
    const preserved =
      validated === null && existing?.linked_blueprint_path
        ? {
            path: existing.linked_blueprint_path,
            confidence: existing.linked_blueprint_confidence ?? "unknown",
            page: existing.linked_blueprint_page,
          }
        : validated;

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
      ...(preserved
        ? {
            linked_blueprint_path: preserved.path,
            linked_blueprint_confidence: preserved.confidence,
            ...(preserved.page !== undefined ? { linked_blueprint_page: preserved.page } : {}),
          }
        : {}),
    };

    this.records.set(key, record);
    log.debug(`[ProgramMemory] Saved ${assignments.length} assignments for ${customer}/${partNumber}`);
    return record;
  }

  /**
   * Attach a blueprint pointer to an EXISTING record (post-hoc / operator-
   * invoked path). Returns the updated record or null if no record exists
   * for the customer/part. To ATTACH-OR-MISS without silent creation, this
   * is the surface — `save()` is the auto-create-on-link surface.
   *
   * Setting `linkInfo` to `null` explicitly CLEARS the pointer (e.g. after
   * a v6 join confidence drops to "miss"). The clear path is the only way
   * to remove an attached link — `save()` always preserves a prior link.
   */
  linkPrint(
    customer: string,
    partNumber: string,
    linkInfo: BlueprintLinkInfo | null,
  ): ProgramRecord | null {
    const key = this._makeKey(customer, partNumber);
    const record = this.records.get(key);
    if (!record) return null;

    if (linkInfo === null) {
      delete record.linked_blueprint_path;
      delete record.linked_blueprint_confidence;
      delete record.linked_blueprint_page;
      return record;
    }

    const validated = this._validateLinkInfo(linkInfo);
    if (!validated) {
      // FAIL-LOUD: caller passed a malformed link → throw so the operator sees
      // the bug rather than getting a silently-untouched record back.
      throw new Error(
        `[ProgramMemory.linkPrint] invalid linkInfo for ${customer}/${partNumber}: ` +
          `path must be non-empty string, confidence must be non-empty string, ` +
          `page (if present) must be finite positive integer`,
      );
    }

    record.linked_blueprint_path = validated.path;
    record.linked_blueprint_confidence = validated.confidence;
    if (validated.page !== undefined) {
      record.linked_blueprint_page = validated.page;
    } else {
      delete record.linked_blueprint_page;
    }
    return record;
  }

  /**
   * Validate a BlueprintLinkInfo payload. Returns the canonicalized form
   * (with `page` dropped if not a finite positive integer) or null if the
   * payload is structurally unusable. Used by both `save()` (which prefers
   * to drop silent) and `linkPrint()` (which throws on miss).
   */
  private _validateLinkInfo(
    info: BlueprintLinkInfo,
  ): BlueprintLinkInfo | null {
    if (!info || typeof info !== "object") return null;
    const path = typeof info.path === "string" ? info.path.trim() : "";
    const confidence =
      typeof info.confidence === "string" ? info.confidence.trim() : "";
    if (path.length === 0 || confidence.length === 0) return null;
    let page: number | undefined;
    if (info.page !== undefined && info.page !== null) {
      if (
        typeof info.page === "number" &&
        Number.isFinite(info.page) &&
        Number.isInteger(info.page) &&
        info.page >= 1
      ) {
        page = info.page;
      }
      // Silently drop a malformed page on save (don't throw — the path +
      // confidence are still useful). linkPrint() wraps this validator with
      // its own throw on whole-payload miss.
    }
    return page === undefined ? { path, confidence } : { path, confidence, page };
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
