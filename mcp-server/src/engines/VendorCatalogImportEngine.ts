/**
 * VendorCatalogImportEngine.ts — ingests charlie's VENDOR-NETWORK-MS0 vendor-source corpus into the
 * PRISM ERP (galaxy:business, slot:hotel).
 *
 * WHAT IT DOES
 *   Charlie (quoting galaxy) pulled 199 vendors across three unified-schema jsonl files under
 *   `state/shared/quoting/vendor-sources/`. This engine lifts those raw records into ERP-consumable
 *   shape and ROUTES each to the subsystem that should own it (see {@link vendor-catalog-policy}):
 *     - tool resellers/makers   → purchasing-vendor  (procurement directory + item master)
 *     - machine-tool builders   → equipment-vendor   (asset / capex vendor list)
 *     - machining job shops     → marketplace-supplier → a {@link SupplierCapabilityHint} that maps
 *       1:1 onto SupplierCapabilityProfileEngine.registerSupplier, seeding the networking marketplace
 *       (RFQ matching) directly from charlie's ThomasNet roster.
 *
 * DESIGN
 *   - PURE core: parse / classify / extract / bridge all take data in, return data out (fs-free, so the
 *     suite tests real records inline). `loadFromDir` is the thin disk adapter the dispatcher uses.
 *   - FAIL LOUD (R12): a malformed jsonl line throws with its source + line number — a silently-skipped
 *     vendor is a silently-missing supplier in the marketplace.
 *   - REUSE the canonical capability vocabulary from supplier-capability-schema.ts (R8) — process,
 *     material-group and certification enums are never re-listed here.
 */

import { z } from "zod";
import type { SupplierProcess, Certification } from "../data/supplier-capability-schema.js";
import {
  VENDOR_CATALOG_POLICY_SCHEMA_VERSION,
  VENDOR_SOURCE_FILES,
  VENDOR_TYPE_TO_ERP_ROLE,
  DEFAULT_ERP_VENDOR_ROLE,
  PROCESS_KEYWORD_TO_ENUM,
  CERT_KEYWORD_TO_CODE,
  type ErpVendorRole,
} from "../data/vendor-catalog-policy.js";

export const VENDOR_CATALOG_IMPORT_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// SCHEMA — the unified vendor-source record (catalog-vendors / imts / thomasnet share this shape)
// ============================================================================

const VendorRecordSchema = z.object({
  name: z.string().min(1, "vendor.name is required"),
  website: z.string().optional(),
  vendor_type: z.string().min(1, "vendor.vendor_type is required"),
  categories: z.array(z.string()).default([]),
  reach: z.string().optional(),
  regions: z.array(z.string()).default([]),
  pricing_access: z.string().optional(),
  has_api: z.boolean().optional(),
  verified: z.boolean().optional(),
  source_tag: z.string().optional(),
  notes: z.string().optional(),
});

/** A normalized vendor record (post-parse: categories/regions always present). */
export type VendorRecord = z.infer<typeof VendorRecordSchema>;

/**
 * A machining job-shop lifted into marketplace capability shape — maps 1:1 onto
 * SupplierCapabilityProfileEngine.registerSupplier. `processes`/`certifications` use the canonical
 * marketplace enums; `materialGroups` is left empty here (the jsonl carries no material axis — a shop
 * fills it during onboarding) so RFQ matching treats it as "material-agnostic pending verification".
 */
export interface SupplierCapabilityHint {
  supplierId: string;
  name: string;
  website: string | null;
  processes: SupplierProcess[];
  certifications: Certification[];
  region: string;
  sourceTag: string;
}

/** Counts that summarize an ingested corpus. */
export interface VendorCorpusSummary {
  total: number;
  byRole: Record<ErpVendorRole, number>;
  byVendorType: Record<string, number>;
  byRegion: Record<string, number>;
  bySource: Record<string, number>;
  verified: number;
  marketplaceCandidates: number;
  schemaVersion: string;
}

/** The full result of ingesting one or more vendor sources. */
export interface VendorImportResult {
  records: VendorRecord[];
  purchasingVendors: VendorRecord[];
  equipmentVendors: VendorRecord[];
  marketplaceSuppliers: VendorRecord[];
  capabilityHints: SupplierCapabilityHint[];
  summary: VendorCorpusSummary;
}

/** A filter for {@link VendorCatalogImportEngine.query}. */
export interface VendorQuery {
  role?: ErpVendorRole;
  vendorType?: string;
  region?: string;
  category?: string;
  verifiedOnly?: boolean;
  hasApi?: boolean;
}

export class VendorCatalogImportEngine {
  // --------------------------------------------------------------------------
  // PARSE
  // --------------------------------------------------------------------------

  /**
   * Parse a jsonl vendor-source into validated records. Blank lines are skipped; a malformed line
   * (bad JSON or failing the schema) THROWS with its source label + 1-based line number (fail-loud).
   *
   * @param jsonlText raw file contents (one JSON object per line).
   * @param opts.sourceTag label used in throw messages + to backfill a record's `source_tag` when absent.
   */
  static parseSource(jsonlText: string, opts: { sourceTag?: string } = {}): VendorRecord[] {
    const label = opts.sourceTag ?? "vendor-source";
    const out: VendorRecord[] = [];
    const lines = jsonlText.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;
      let raw: unknown;
      try {
        raw = JSON.parse(line);
      } catch (e) {
        throw new Error(`[vendor-catalog] ${label} line ${i + 1}: invalid JSON — ${(e as Error).message}`);
      }
      const parsed = VendorRecordSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `[vendor-catalog] ${label} line ${i + 1}: schema violation — ${parsed.error.issues
            .map((iss) => `${iss.path.join(".") || "<root>"}: ${iss.message}`)
            .join("; ")}`,
        );
      }
      const rec = parsed.data;
      if (!rec.source_tag && opts.sourceTag) rec.source_tag = opts.sourceTag;
      out.push(rec);
    }
    return out;
  }

  // --------------------------------------------------------------------------
  // CLASSIFY + EXTRACT
  // --------------------------------------------------------------------------

  /** Route a vendor to its owning ERP subsystem by `vendor_type` (unknown → purchasing-vendor). */
  static classifyRole(record: VendorRecord): ErpVendorRole {
    return VENDOR_TYPE_TO_ERP_ROLE[record.vendor_type] ?? DEFAULT_ERP_VENDOR_ROLE;
  }

  /** A stable lowercase slug id for a vendor name (`United CNC Machining` → `united-cnc-machining`). */
  static slugify(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (slug === "") throw new Error(`[vendor-catalog] cannot slugify empty/symbol-only name '${name}'`);
    return slug;
  }

  /**
   * Pull the comma-list that follows a `<key>:` token in a record's `notes`, stopping at the next
   * `·`/`|` segment separator. Returns lower-cased, trimmed, non-empty tokens.
   */
  static #notesField(notes: string | undefined, key: string): string[] {
    if (!notes) return [];
    const re = new RegExp(`${key}\\s*:\\s*([^·|]+)`, "i");
    const m = notes.match(re);
    if (!m) return [];
    return m[1]
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
  }

  /** Canonical {@link SupplierProcess} list extracted from a shop's `notes` "processes: …" (deduped). */
  static extractProcesses(record: VendorRecord): SupplierProcess[] {
    const seen = new Set<SupplierProcess>();
    for (const tok of VendorCatalogImportEngine.#notesField(record.notes, "processes")) {
      const proc = PROCESS_KEYWORD_TO_ENUM[tok];
      if (proc) seen.add(proc);
    }
    return [...seen];
  }

  /** Canonical {@link Certification} list extracted from a shop's `notes` "certs: …" (deduped). */
  static extractCerts(record: VendorRecord): Certification[] {
    const seen = new Set<Certification>();
    for (const tok of VendorCatalogImportEngine.#notesField(record.notes, "certs")) {
      const code = CERT_KEYWORD_TO_CODE[tok];
      if (code) seen.add(code);
    }
    return [...seen];
  }

  /** The vendor's primary region (first declared region, else "US" as the corpus default). */
  static extractRegion(record: VendorRecord): string {
    return record.regions[0] ?? "US";
  }

  /**
   * Lift a machining job-shop into a {@link SupplierCapabilityHint} (marketplace-ready). Returns null
   * for any vendor that does NOT classify as a marketplace-supplier — a tool reseller is not a shop.
   */
  static toCapabilityHint(record: VendorRecord): SupplierCapabilityHint | null {
    if (VendorCatalogImportEngine.classifyRole(record) !== "marketplace-supplier") return null;
    return {
      supplierId: VendorCatalogImportEngine.slugify(record.name),
      name: record.name,
      website: record.website ?? null,
      processes: VendorCatalogImportEngine.extractProcesses(record),
      certifications: VendorCatalogImportEngine.extractCerts(record),
      region: VendorCatalogImportEngine.extractRegion(record),
      sourceTag: record.source_tag ?? "unknown",
    };
  }

  // --------------------------------------------------------------------------
  // AGGREGATE
  // --------------------------------------------------------------------------

  /** Ingest already-parsed records: route by ERP role, build marketplace hints, and summarize. */
  static importRecords(records: VendorRecord[]): VendorImportResult {
    const purchasingVendors: VendorRecord[] = [];
    const equipmentVendors: VendorRecord[] = [];
    const marketplaceSuppliers: VendorRecord[] = [];
    const capabilityHints: SupplierCapabilityHint[] = [];

    for (const rec of records) {
      const role = VendorCatalogImportEngine.classifyRole(rec);
      if (role === "purchasing-vendor") purchasingVendors.push(rec);
      else if (role === "equipment-vendor") equipmentVendors.push(rec);
      else {
        marketplaceSuppliers.push(rec);
        const hint = VendorCatalogImportEngine.toCapabilityHint(rec);
        if (hint) capabilityHints.push(hint);
      }
    }

    return {
      records,
      purchasingVendors,
      equipmentVendors,
      marketplaceSuppliers,
      capabilityHints,
      summary: VendorCatalogImportEngine.summary(records),
    };
  }

  /** Parse + ingest multiple jsonl sources in one call. */
  static importSources(sources: Array<{ text: string; sourceTag: string }>): VendorImportResult {
    const records: VendorRecord[] = [];
    for (const s of sources) {
      records.push(...VendorCatalogImportEngine.parseSource(s.text, { sourceTag: s.sourceTag }));
    }
    return VendorCatalogImportEngine.importRecords(records);
  }

  /** Counts by ERP role, vendor_type, region, source + verified/marketplace tallies. */
  static summary(records: VendorRecord[]): VendorCorpusSummary {
    const byRole: Record<ErpVendorRole, number> = {
      "purchasing-vendor": 0,
      "marketplace-supplier": 0,
      "equipment-vendor": 0,
    };
    const byVendorType: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let verified = 0;

    for (const rec of records) {
      byRole[VendorCatalogImportEngine.classifyRole(rec)]++;
      byVendorType[rec.vendor_type] = (byVendorType[rec.vendor_type] ?? 0) + 1;
      const region = VendorCatalogImportEngine.extractRegion(rec);
      byRegion[region] = (byRegion[region] ?? 0) + 1;
      const src = rec.source_tag ?? "unknown";
      bySource[src] = (bySource[src] ?? 0) + 1;
      if (rec.verified) verified++;
    }

    return {
      total: records.length,
      byRole,
      byVendorType,
      byRegion,
      bySource,
      verified,
      marketplaceCandidates: byRole["marketplace-supplier"],
      schemaVersion: VENDOR_CATALOG_IMPORT_SCHEMA_VERSION,
    };
  }

  /** Filter records by role / type / region / category / verified / api. All clauses AND together. */
  static query(records: VendorRecord[], filter: VendorQuery = {}): VendorRecord[] {
    return records.filter((rec) => {
      if (filter.role && VendorCatalogImportEngine.classifyRole(rec) !== filter.role) return false;
      if (filter.vendorType && rec.vendor_type !== filter.vendorType) return false;
      if (filter.region && !rec.regions.includes(filter.region)) return false;
      if (filter.category && !rec.categories.includes(filter.category)) return false;
      if (filter.verifiedOnly && !rec.verified) return false;
      if (filter.hasApi !== undefined && (rec.has_api ?? false) !== filter.hasApi) return false;
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // DISK ADAPTER (thin; the dispatcher calls this)
  // --------------------------------------------------------------------------

  /**
   * Read the three canonical {@link VENDOR_SOURCE_FILES} from disk (resolved against `repoRoot`) and
   * ingest them. Uses node:fs at call time so the pure core stays fs-free for tests. A missing file is
   * SKIPPED with a recorded warning rather than throwing — a partial corpus is still useful, and the
   * absence is surfaced in `warnings` (never silently swallowed).
   */
  static async loadFromDir(repoRoot: string): Promise<VendorImportResult & { warnings: string[] }> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const warnings: string[] = [];
    const sources: Array<{ text: string; sourceTag: string }> = [];
    for (const rel of VENDOR_SOURCE_FILES) {
      const abs = path.resolve(repoRoot, rel);
      const sourceTag = path.basename(rel, ".jsonl");
      try {
        const text = await fs.readFile(abs, "utf8");
        sources.push({ text, sourceTag });
      } catch (e) {
        warnings.push(`[vendor-catalog] could not read ${rel}: ${(e as Error).message}`);
      }
    }
    const result = VendorCatalogImportEngine.importSources(sources);
    return { ...result, warnings };
  }

  static schemaVersion(): string {
    return `${VENDOR_CATALOG_IMPORT_SCHEMA_VERSION} (policy ${VENDOR_CATALOG_POLICY_SCHEMA_VERSION})`;
  }
}

export const vendorCatalogImportEngine = VendorCatalogImportEngine;
