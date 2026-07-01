/**
 * SDSLibraryEngine — Safety Data Sheet library per OSHA HazCom 29 CFR 1910.1200.
 *
 * OSHA HazCom (the Hazard Communication Standard, aligned to GHS) mandates:
 *   §1910.1200(g)(1)   — SDS for every hazardous chemical in the workplace
 *   §1910.1200(g)(2)   — 16-section GHS-format SDS (Section 1..16)
 *   §1910.1200(g)(8)   — SDSs accessible to employees during every work shift
 *   §1910.1200(g)(11)  — Maintain copies for at least 30 years after last use (per §1910.1020)
 *
 * Engine responsibilities:
 *   - Per-chemical SDS record (by CAS number + product name + manufacturer)
 *   - Revision tracking (every SDS revision creates a new immutable row;
 *     previous version archived per §1910.1020 30-year retention)
 *   - Search by CAS / product name / hazard class
 *   - Expiration alerting: SDS older than 3 years gets review-due flag
 *   - Hazard class index per GHS 16 categories
 *
 * GHS hazard classes (§1910.1200 Appendix A):
 *   - Physical: explosive, flammable, oxidizing, gas-under-pressure, self-reactive,
 *     pyrophoric, self-heating, water-reactive, organic-peroxide, corrosive-metal
 *   - Health: acute-toxicity, skin-corrosion, eye-damage, respiratory-sensitizer,
 *     skin-sensitizer, germ-cell-mutagen, carcinogen, reproductive-toxin,
 *     STOT-single, STOT-repeat, aspiration-hazard
 *   - Environmental: aquatic-acute, aquatic-chronic, ozone-depleter
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: missing CAS / non-GHS hazard class / past revision dates throw
 *   - PII-free: chemical data only, no employee identifiers
 *   - Object.frozen on every return
 *   - Immutable revision history (§1910.1020 retention)
 *
 * @module SDSLibraryEngine
 * @milestone HOTEL/U-SDS-LIBRARY (2026-05-25, slot:hotel iter13)
 */

// ─── Constants ────────────────────────────────────────────────
/** SDS review-due threshold per OSHA guidance — sheets > 3 years old need review. */
const SDS_REVIEW_THRESHOLD_DAYS = 365 * 3;
const DAY_MS = 86_400_000;

/** GHS hazard classes per §1910.1200 Appendix A (canonical list). */
const GHS_HAZARD_CLASSES = new Set([
  // Physical
  "explosive",
  "flammable",
  "oxidizing",
  "gas_under_pressure",
  "self_reactive",
  "pyrophoric",
  "self_heating",
  "water_reactive",
  "organic_peroxide",
  "corrosive_metal",
  // Health
  "acute_toxicity",
  "skin_corrosion",
  "eye_damage",
  "respiratory_sensitizer",
  "skin_sensitizer",
  "germ_cell_mutagen",
  "carcinogen",
  "reproductive_toxin",
  "stot_single",
  "stot_repeat",
  "aspiration_hazard",
  // Environmental
  "aquatic_acute",
  "aquatic_chronic",
  "ozone_depleter",
]);

// ─── Types ────────────────────────────────────────────────────

export interface SDSRecord {
  id: string;
  product_name: string;
  /** CAS Registry Number (e.g. "7732-18-5" for water). */
  cas_number: string;
  manufacturer: string;
  /** GHS hazard classes (snake_case subset of GHS_HAZARD_CLASSES). */
  hazard_classes: ReadonlyArray<string>;
  /** Signal word — "Danger" | "Warning" | null (no hazard). */
  signal_word: "Danger" | "Warning" | null;
  /** ISO date the SDS was issued/revised by manufacturer. */
  revision_date: string;
  /** ISO date the SDS was loaded into the library. */
  loaded_at: string;
  /** Sheet URL or file path. */
  document_ref?: string;
  /** Versioning — incremented on every revision. */
  revision_number: number;
  /** ISO date when this version was superseded (null for current). */
  superseded_at: string | null;
  notes?: string;
}

export interface SDSSearchResult {
  total: number;
  matches: ReadonlyArray<SDSRecord>;
}

export interface SDSReviewReport {
  as_of: string;
  total_active_sds: number;
  due_for_review: number;
  by_hazard_class: ReadonlyArray<{ hazard_class: string; count: number }>;
  records_due: ReadonlyArray<{ id: string; product_name: string; revision_date: string; age_days: number }>;
}

// ─── Engine ───────────────────────────────────────────────────

class SDSLibraryEngine {
  private records: Map<string, SDSRecord> = new Map();
  private nextId = 1;

  /**
   * Load a new SDS into the library. If a prior version exists for the same
   * (CAS + manufacturer), it is auto-superseded (revision_number incremented).
   */
  loadSDS(input: {
    product_name: string;
    cas_number: string;
    manufacturer: string;
    hazard_classes: string[];
    signal_word?: "Danger" | "Warning" | null;
    revision_date: string;
    document_ref?: string;
    notes?: string;
  }): SDSRecord {
    this.validateLoad(input);
    const ts = new Date().toISOString();
    const tsDate = ts.slice(0, 10);

    // Auto-supersede prior active version for same (cas, manufacturer).
    let priorRevisionNumber = 0;
    for (const [k, r] of this.records) {
      if (r.cas_number === input.cas_number && r.manufacturer === input.manufacturer && r.superseded_at === null) {
        priorRevisionNumber = Math.max(priorRevisionNumber, r.revision_number);
        const superseded = Object.freeze({ ...r, superseded_at: tsDate });
        this.records.set(k, superseded);
      }
    }

    const id = `SDS-${String(this.nextId++).padStart(6, "0")}`;
    const record: SDSRecord = Object.freeze({
      id,
      product_name: input.product_name,
      cas_number: input.cas_number,
      manufacturer: input.manufacturer,
      hazard_classes: Object.freeze([...input.hazard_classes.map((h) => h.toLowerCase())]),
      signal_word: input.signal_word ?? null,
      revision_date: input.revision_date,
      loaded_at: ts,
      ...(input.document_ref !== undefined && { document_ref: input.document_ref }),
      revision_number: priorRevisionNumber + 1,
      superseded_at: null,
      ...(input.notes !== undefined && { notes: input.notes }),
    });
    this.records.set(id, record);
    return record;
  }

  /**
   * Find SDS by CAS number — returns the ACTIVE (non-superseded) record.
   */
  findByCAS(cas_number: string): SDSRecord | null {
    if (!cas_number) return null;
    for (const r of this.records.values()) {
      if (r.cas_number === cas_number && r.superseded_at === null) return Object.freeze({ ...r });
    }
    return null;
  }

  /**
   * Find SDS by product name (case-insensitive partial match) — returns all matches.
   */
  findByProductName(query: string, opts?: { active_only?: boolean }): SDSSearchResult {
    if (!query) return Object.freeze({ total: 0, matches: Object.freeze([]) });
    const q = query.toLowerCase();
    const activeOnly = opts?.active_only ?? true;
    const matches = [...this.records.values()].filter(
      (r) => r.product_name.toLowerCase().includes(q) && (!activeOnly || r.superseded_at === null),
    );
    return Object.freeze({
      total: matches.length,
      matches: Object.freeze(matches.map((m) => Object.freeze({ ...m }))),
    });
  }

  /**
   * Find SDS by hazard class — returns all ACTIVE sheets carrying the class.
   */
  findByHazardClass(hazard_class: string): SDSSearchResult {
    const hc = hazard_class.toLowerCase();
    if (!GHS_HAZARD_CLASSES.has(hc)) {
      throw new Error(`SDSLibraryEngine.findByHazardClass: unknown GHS hazard class "${hazard_class}"`);
    }
    const matches = [...this.records.values()].filter(
      (r) => r.superseded_at === null && r.hazard_classes.includes(hc),
    );
    return Object.freeze({
      total: matches.length,
      matches: Object.freeze(matches.map((m) => Object.freeze({ ...m }))),
    });
  }

  /**
   * Get the full revision history of an SDS (active + all superseded).
   * Returns chronological list per §1910.1020 retention.
   */
  getRevisionHistory(args: { cas_number: string; manufacturer: string }): ReadonlyArray<SDSRecord> {
    const out = [...this.records.values()]
      .filter((r) => r.cas_number === args.cas_number && r.manufacturer === args.manufacturer)
      .sort((a, b) => a.revision_number - b.revision_number);
    return Object.freeze(out.map((r) => Object.freeze({ ...r })));
  }

  /**
   * Review report — every active sheet over the threshold age + breakdown by class.
   */
  reviewReport(args?: { as_of?: string }): SDSReviewReport {
    const as_of = args?.as_of ?? new Date().toISOString().slice(0, 10);
    const asOfMs = Date.parse(as_of);
    const classCounts = new Map<string, number>();
    const dueList: { id: string; product_name: string; revision_date: string; age_days: number }[] = [];
    let active = 0;
    for (const r of this.records.values()) {
      if (r.superseded_at !== null) continue;
      active++;
      for (const hc of r.hazard_classes) classCounts.set(hc, (classCounts.get(hc) ?? 0) + 1);
      const age = Math.floor((asOfMs - Date.parse(r.revision_date)) / DAY_MS);
      if (age > SDS_REVIEW_THRESHOLD_DAYS) {
        dueList.push({ id: r.id, product_name: r.product_name, revision_date: r.revision_date, age_days: age });
      }
    }
    const byClass = [...classCounts.entries()]
      .map(([h, c]) => Object.freeze({ hazard_class: h, count: c }))
      .sort((a, b) => b.count - a.count);
    return Object.freeze({
      as_of,
      total_active_sds: active,
      due_for_review: dueList.length,
      by_hazard_class: Object.freeze(byClass),
      records_due: Object.freeze(dueList.map((d) => Object.freeze({ ...d }))),
    });
  }

  /** Return the canonical GHS hazard-class catalog. */
  listHazardClasses(): ReadonlyArray<string> {
    return Object.freeze([...GHS_HAZARD_CLASSES].sort());
  }

  /** Reset state — test-only. */
  reset(): void {
    this.records.clear();
    this.nextId = 1;
  }

  // ─── Internals ──────────────────────────────────────────────

  private validateLoad(input: {
    product_name: string;
    cas_number: string;
    manufacturer: string;
    hazard_classes: string[];
    revision_date: string;
  }): void {
    if (!input.product_name || !input.cas_number || !input.manufacturer) {
      throw new Error("SDSLibraryEngine.loadSDS: product_name + cas_number + manufacturer required");
    }
    // CAS format: <up to 7 digits>-<2 digits>-<1 check digit>
    if (!/^\d{1,7}-\d{2}-\d$/.test(input.cas_number)) {
      throw new Error(
        `SDSLibraryEngine.loadSDS: cas_number must be CAS format NNNNNNN-NN-N (got "${input.cas_number}")`,
      );
    }
    if (!Array.isArray(input.hazard_classes)) {
      throw new Error("SDSLibraryEngine.loadSDS: hazard_classes must be array");
    }
    for (const h of input.hazard_classes) {
      const hc = String(h).toLowerCase();
      if (!GHS_HAZARD_CLASSES.has(hc)) {
        throw new Error(
          `SDSLibraryEngine.loadSDS: unknown GHS hazard class "${h}" — see listHazardClasses()`,
        );
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.revision_date)) {
      throw new Error(`SDSLibraryEngine.loadSDS: revision_date must be ISO YYYY-MM-DD (got "${input.revision_date}")`);
    }
    if (Date.parse(input.revision_date) > Date.now() + DAY_MS) {
      throw new Error("SDSLibraryEngine.loadSDS: revision_date cannot be in the future");
    }
  }
}

export const sdsLibraryEngine = new SDSLibraryEngine();
