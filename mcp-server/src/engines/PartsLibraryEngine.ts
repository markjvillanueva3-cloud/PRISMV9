/**
 * PartsLibraryEngine — Revision-controlled parts catalog with similarity search
 *
 * Manages a parts library with revision tracking, CAD/drawing file linking,
 * customer association, tag-based search, and multi-dimensional similarity matching.
 * Wires to PartSimilarityEngine for find_similar and ParametricPartLibraryEngine
 * for parametric part generation.
 *
 * Actions (7):
 *   part_create, part_search, part_get, part_add_revision,
 *   part_find_similar, part_deduplicate, part_list_revisions
 *
 * Schema: 002-file-storage.sql (parts, part_revisions)
 *
 * @module engines/PartsLibraryEngine
 * @version 1.0.0
 */

import * as crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface PartRecord {
  id: string;
  part_number: string;
  name: string;
  description?: string;
  current_revision: string;
  material_id?: string;
  material_name?: string;
  customer_id?: string;
  tags: string[];
  status: "active" | "obsolete" | "prototype" | "archived";
  created_by?: string;
  created_at: string;
  updated_at: string;
  /** Populated by joins */
  revision_count?: number;
  cad_file_id?: string;
  drawing_file_id?: string;
}

export interface PartRevision {
  id: string;
  part_id: string;
  revision: string;
  cad_file_id?: string;
  drawing_file_id?: string;
  change_description: string;
  changed_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface PartCreateInput {
  part_number: string;
  name: string;
  description?: string;
  material_id?: string;
  material_name?: string;
  customer_id?: string;
  tags?: string[];
  status?: "active" | "obsolete" | "prototype" | "archived";
  created_by?: string;
  /** Initial CAD file attachment */
  cad_file_id?: string;
  /** Initial drawing file attachment */
  drawing_file_id?: string;
  /** Initial revision change description */
  initial_change_description?: string;
}

export interface PartSearchInput {
  query?: string;
  tags?: string[];
  material_id?: string;
  customer_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PartAddRevisionInput {
  part_id: string;
  revision?: string;
  cad_file_id?: string;
  drawing_file_id?: string;
  change_description: string;
  changed_by?: string;
}

export interface PartFindSimilarInput {
  part_id?: string;
  material?: string;
  iso_group?: string;
  dimensions?: { x: number; y: number; z: number };
  features?: string[];
  tolerances?: { dimension: string; value_mm: number }[];
  surface_finish_ra?: number;
  operations?: string[];
  limit?: number;
}

export interface DeduplicateResult {
  duplicates: { part_a: string; part_b: string; similarity: number; reason: string }[];
  total_checked: number;
  warnings: string[];
}

// ============================================================================
// JM-DOC-POPULATION-MS0 / U-JMDOC05 — part_library/other metadata seed
// ----------------------------------------------------------------------------
// Bulk-seeds the 30,890 STRUCTURAL `part_library/other` rows of the JM-Die
// document ledger into this catalog as revision-controlled parts (disposition
// = metadata). part.json files are GONE from disk (the inventory is a
// 2026-05-27 snapshot); identity is derived from the PATH + the inventory
// `customer` field, NEVER from part.json content. The 133 NON-structural
// part_library/other rows are explicitly deferred to unrouted-misc (counted by
// the accountability gate, not seeded here). seed_method per the bridge
// registry (R7 correction: PartsLibraryEngine, not JobTravelerEngine).
// ============================================================================

/** A jm-file-inventory.jsonl row — the U-JMDOC05 metadata-disposition source. */
export interface JMPartSeedRecord {
  path: string;
  source: string;
  bucket: string;
  customer?: string | null;
  material?: string | null;
  machine_class?: string | null;
}

/**
 * Result of a JM part-library metadata seed pass. The five counters PARTITION
 * the input — every row lands in exactly one — so the campaign's "zero silent
 * drops" accountability invariant holds exactly:
 *   `total_records === parts_created + revisions_added + skipped_existing
 *                      + skipped_out_of_scope + skipped_invalid`
 * `revisions_added` counts ONLY revisions added to ALREADY-EXISTING parts; a new
 * part's initial (and any carried) revision is accounted under `parts_created`,
 * so a single row is never counted twice.
 */
export interface JMPartSeedResult {
  total_records: number;
  /** Rows that created a brand-new part (initial + any carried revision included here). */
  parts_created: number;
  /** Rows that added a NEW revision to a part already in the catalog. */
  revisions_added: number;
  /** Rows whose (part, rev) was already catalogued (idempotent re-hit / duplicate). */
  skipped_existing: number;
  /** Rows outside scope: not a structural part_library/other row. */
  skipped_out_of_scope: number;
  /** Malformed rows (missing path/source/bucket) or paths that yield no identity. */
  skipped_invalid: number;
  /** Distinct customers seen across the seeded (in-scope) rows. */
  distinct_customers: number;
  part_ids: string[];
}

/** Derived part identity from a `_PART LIBRARY/<CUSTOMER>/<PART>[/<REV>]/...` path. */
export interface JMPartIdentity {
  customer: string;
  part: string;
  rev: string | null;
}

/** A folder segment that looks like a die-shop revision folder (R2, R12, R7A). */
const JM_REV_FOLDER_RE = /^R\d+[A-Z]?$/i;

/**
 * Mirror of the ledger builder's `part_library|other` STRUCTURAL classifier
 * (scripts/build-jm-document-ledger.mjs `classify()`): a row is structural iff
 * its basename is `part.json` (case-insensitive) OR its path contains a `/R\d+/`
 * REV-folder segment. Everything else in the tuple is non-structural and routes
 * to unrouted-misc (deferred). Keeping this byte-for-byte equivalent to the
 * builder is what makes the seeded count reconcile against the ledger's 30,890.
 */
export function isStructuralPartLibraryOther(rec: JMPartSeedRecord): boolean {
  if (!rec || rec.source !== "part_library" || rec.bucket !== "other") return false;
  const p = String(rec.path ?? "").replace(/\\/g, "/");
  if (p.length === 0) return false;
  const base = p.split("/").pop() ?? "";
  const isPartJson = /^part\.json$/i.test(base);
  const isRevStructure = /\/R\d+\//i.test(p);
  return isPartJson || isRevStructure;
}

/**
 * Derive `{customer, part, rev}` from a JM part-library path + the inventory
 * customer field. The customer field (when present) is authoritative for the
 * customer; the part folder is the segment immediately under the customer, and
 * a deeper `R\d+`-shaped folder (if any) is the revision. Returns null for paths
 * that cannot yield a customer + part (caller counts these as skipped_invalid).
 */
export function derivePartIdentity(path: string, customerField?: string | null): JMPartIdentity | null {
  const norm = String(path ?? "").replace(/\\/g, "/").trim();
  if (norm.length === 0) return null;
  const segs = norm.split("/").filter(Boolean);
  if (segs.length < 2) return null;

  const anchorPos = segs.findIndex((s) => /^_part library$/i.test(s));
  const customerFromField = typeof customerField === "string" ? customerField.trim() : "";

  let customer: string;
  let partSegs: string[];
  if (anchorPos >= 0 && anchorPos + 1 < segs.length) {
    customer = customerFromField || segs[anchorPos + 1];
    // folders strictly between the customer folder and the filename
    partSegs = segs.slice(anchorPos + 2, segs.length - 1);
  } else {
    // No `_PART LIBRARY` anchor — best-effort from the tail of the path.
    customer = customerFromField || segs[0];
    partSegs = segs
      .slice(0, segs.length - 1)
      .filter((s) => s.toLowerCase() !== customer.toLowerCase())
      .slice(-2);
  }

  customer = customer.trim();
  if (customer.length === 0) return null;

  let part: string;
  let rev: string | null = null;
  if (partSegs.length === 0) {
    // Structural row directly under the customer (no part folder) — fall back to
    // the filename stem so the row is still catalogued, not dropped.
    const stem = (segs[segs.length - 1] || "").replace(/\.[^.]+$/, "").trim();
    part = stem || customer;
  } else {
    part = partSegs[0];
    const revSeg = partSegs.slice(1).find((s) => JM_REV_FOLDER_RE.test(s));
    if (revSeg) rev = revSeg.toUpperCase();
  }

  part = part.trim();
  if (part.length === 0) return null;
  return { customer, part, rev };
}

function generateId(): string {
  return crypto.randomUUID();
}

/** Next revision letter: A → B → C ... Z → AA → AB */
function nextRevision(current: string): string {
  if (current.length === 1) {
    if (current === "Z") return "AA";
    return String.fromCharCode(current.charCodeAt(0) + 1);
  }
  // Multi-char: increment last char
  const last = current.charAt(current.length - 1);
  if (last === "Z") {
    return nextRevision(current.slice(0, -1)) + "A";
  }
  return current.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
}

// ============================================================================
// Engine
// ============================================================================

class PartsLibraryEngine {
  private parts = new Map<string, PartRecord>();
  private revisions = new Map<string, PartRevision[]>();
  /** part_number → part_id index (for uniqueness) */
  private partNumberIndex = new Map<string, string>();

  /**
   * Create a new part with initial revision A.
   */
  create(input: PartCreateInput): { part: PartRecord; revision: PartRevision; warnings: string[] } {
    const warnings: string[] = [];

    if (!input.part_number || input.part_number.trim().length === 0) {
      throw new Error("part_number is required");
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new Error("name is required");
    }

    // Check for duplicate part number
    const existingId = this.partNumberIndex.get(input.part_number.toUpperCase());
    if (existingId) {
      const existing = this.parts.get(existingId);
      if (existing && existing.status !== "archived") {
        throw new Error(`Part number ${input.part_number} already exists (id: ${existingId})`);
      }
    }

    const partId = generateId();
    const now = new Date().toISOString();

    const part: PartRecord = {
      id: partId,
      part_number: input.part_number.toUpperCase().trim(),
      name: input.name.trim(),
      description: input.description,
      current_revision: "A",
      material_id: input.material_id,
      material_name: input.material_name,
      customer_id: input.customer_id,
      tags: (input.tags ?? []).map(t => t.toLowerCase().trim()),
      status: input.status ?? "active",
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
      revision_count: 1,
      cad_file_id: input.cad_file_id,
      drawing_file_id: input.drawing_file_id,
    };

    const revision: PartRevision = {
      id: generateId(),
      part_id: partId,
      revision: "A",
      cad_file_id: input.cad_file_id,
      drawing_file_id: input.drawing_file_id,
      change_description: input.initial_change_description ?? "Initial release",
      changed_by: input.created_by,
      created_at: now,
    };

    this.parts.set(partId, part);
    this.revisions.set(partId, [revision]);
    this.partNumberIndex.set(part.part_number, partId);

    if (!input.cad_file_id) {
      warnings.push("No CAD file attached. Consider uploading a STEP/IGES model.");
    }
    if (!input.drawing_file_id) {
      warnings.push("No drawing file attached. Consider uploading a PDF drawing.");
    }
    if (!input.material_id && !input.material_name) {
      warnings.push("No material specified. Material is needed for quoting and physics calculations.");
    }

    return { part, revision, warnings };
  }

  /**
   * seedFromJMCorpus — U-JMDOC05 metadata seed (JM-DOC-POPULATION-MS0, slot:hotel).
   *
   * Bulk-seeds the STRUCTURAL `part_library/other` ledger rows into this catalog
   * as revision-controlled parts. One part per derived (customer, part) pair;
   * extra `R\d+` REV folders become additional revisions on that part. Identity
   * is derived from the PATH + the inventory `customer` field (part.json content
   * is gone from disk). Part numbers are namespaced `<CUSTOMER>/<PART>` so two
   * customers sharing a part folder name never collide in the global index, and
   * `customer_id` carries a `jm:<CUSTOMER>` association key (NOT a UUID — these
   * are metadata catalog entries; a future unit can cross-link to the seeded
   * CustomerManagementEngine UUIDs). The raw customer is also a search tag.
   *
   * Contract (matches the proven DocumentInboxEngine seed bridges):
   *   - Allowlist-gated: only structural part_library/other rows are seeded;
   *     every other tuple (and the 133 non-structural part_library/other rows)
   *     is `skipped_out_of_scope` — they are accounted as unrouted by the gate.
   *   - Idempotent: re-seeding the same rows creates nothing new; a (part, rev)
   *     already present is `skipped_existing`.
   *   - Fail-soft: non-array input -> all-zero result; invalid rows skipped, the
   *     pass never throws. Every in-scope row lands in exactly one counter.
   *
   * @param records jm-file-inventory.jsonl rows (pre-filtered or raw — re-filtered here).
   * @returns row-accounted {@link JMPartSeedResult}.
   */
  seedFromJMCorpus(records: JMPartSeedRecord[]): JMPartSeedResult {
    const result: JMPartSeedResult = {
      total_records: 0,
      parts_created: 0,
      revisions_added: 0,
      skipped_existing: 0,
      skipped_out_of_scope: 0,
      skipped_invalid: 0,
      distinct_customers: 0,
      part_ids: [],
    };
    if (!Array.isArray(records)) return result;
    result.total_records = records.length;

    const customersSeen = new Set<string>();
    // partNumber -> set of revision labels already represented (built lazily from
    // the live catalog the first time a part is revisited, so re-seed is idempotent).
    const revsByPart = new Map<string, Set<string>>();

    for (const rec of records) {
      if (!rec || typeof rec !== "object") { result.skipped_invalid++; continue; }
      const path = typeof rec.path === "string" ? rec.path.trim() : "";
      const source = typeof rec.source === "string" ? rec.source.trim() : "";
      const bucket = typeof rec.bucket === "string" ? rec.bucket.trim() : "";
      if (!path || !source || !bucket) { result.skipped_invalid++; continue; }

      if (!isStructuralPartLibraryOther({ path, source, bucket, customer: rec.customer })) {
        result.skipped_out_of_scope++;
        continue;
      }

      const ident = derivePartIdentity(path, rec.customer);
      if (!ident) { result.skipped_invalid++; continue; }

      const partNumber = `${ident.customer}/${ident.part}`.toUpperCase().trim();
      const revLabel = (ident.rev ?? "A").toUpperCase();
      customersSeen.add(ident.customer.toUpperCase());

      const material = typeof rec.material === "string" && rec.material.trim().length > 0
        ? rec.material.trim()
        : undefined;
      const tags = Array.from(new Set([
        "jm-die", "part-library", "u-jmdoc05", ident.customer.toLowerCase(),
      ]));

      const existing = this.getByPartNumber(partNumber);
      if (!existing) {
        try {
          const created = this.create({
            part_number: partNumber,
            name: ident.part,
            customer_id: `jm:${ident.customer}`,
            material_name: material,
            tags,
            status: "active",
            created_by: "JM-DOC-POPULATION-MS0/U-JMDOC05",
            initial_change_description: ident.rev
              ? `JM-Die metadata seed (rev ${revLabel}, path-derived)`
              : "JM-Die metadata seed (path-derived)",
          });
          // This row IS fully accounted by parts_created (the partition counter).
          // The carried rev is established on the new part as a side-effect but is
          // NOT counted in revisions_added — that counter is reserved for revisions
          // added to ALREADY-EXISTING parts, so the 5-way partition stays exact
          // (one input row -> exactly one of parts_created/revisions_added/
          // skipped_existing/skipped_out_of_scope/skipped_invalid).
          result.parts_created++;
          result.part_ids.push(created.part.id);
          const revSet = new Set<string>([created.part.current_revision]); // "A"
          if (ident.rev && revLabel !== created.part.current_revision) {
            try {
              this.addRevision({
                part_id: created.part.id,
                revision: revLabel,
                change_description: `JM-Die metadata seed (rev ${revLabel}, path-derived)`,
                changed_by: "JM-DOC-POPULATION-MS0/U-JMDOC05",
              });
              revSet.add(revLabel);
            } catch { /* rev clash on a brand-new part — leave base 'A' */ }
          }
          revsByPart.set(partNumber, revSet);
        } catch {
          // create() throws on a duplicate part_number. If the part exists now
          // (a prior seed persisted it into this singleton), the row is an
          // idempotent re-hit -> skipped_existing, NOT invalid. Otherwise the row
          // is genuinely degenerate -> skipped_invalid. Exactly one partition
          // counter either way (no double-count, no silent drop).
          if (this.getByPartNumber(partNumber)) result.skipped_existing++;
          else result.skipped_invalid++;
        }
      } else {
        let revSet = revsByPart.get(partNumber);
        if (!revSet) {
          revSet = new Set(existing.revisions.map((r) => r.revision.toUpperCase()));
          revsByPart.set(partNumber, revSet);
        }
        if (ident.rev && !revSet.has(revLabel)) {
          try {
            this.addRevision({
              part_id: existing.part.id,
              revision: revLabel,
              change_description: `JM-Die metadata seed (rev ${revLabel}, path-derived)`,
              changed_by: "JM-DOC-POPULATION-MS0/U-JMDOC05",
            });
            revSet.add(revLabel);
            result.revisions_added++;
          } catch {
            result.skipped_existing++; // revision already present / unaddable
          }
        } else {
          result.skipped_existing++; // duplicate row, or same rev already catalogued
        }
      }
    }

    result.distinct_customers = customersSeen.size;
    return result;
  }

  /**
   * Search parts by query string, tags, material, customer, status.
   * Full-text search on name/description + tag intersection.
   */
  search(input: PartSearchInput): { parts: PartRecord[]; total: number } {
    let results = [...this.parts.values()].filter(p => p.status !== "archived");

    if (input.status) {
      results = results.filter(p => p.status === input.status);
    }
    if (input.customer_id) {
      results = results.filter(p => p.customer_id === input.customer_id);
    }
    if (input.material_id) {
      results = results.filter(p => p.material_id === input.material_id);
    }
    if (input.tags && input.tags.length > 0) {
      const searchTags = input.tags.map(t => t.toLowerCase().trim());
      results = results.filter(p =>
        searchTags.every(st => p.tags.some(pt => pt.includes(st)))
      );
    }
    if (input.query && input.query.trim().length > 0) {
      const q = input.query.toLowerCase().trim();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.part_number.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q))
      );
    }

    const total = results.length;
    results.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    const offset = input.offset ?? 0;
    const limit = Math.min(input.limit ?? 50, 200);
    results = results.slice(offset, offset + limit);

    // Enrich with revision count
    results = results.map(p => ({
      ...p,
      revision_count: (this.revisions.get(p.id) ?? []).length,
    }));

    return { parts: results, total };
  }

  /**
   * Get a single part by ID with full revision history.
   */
  get(partId: string): { part: PartRecord; revisions: PartRevision[] } | null {
    const part = this.parts.get(partId);
    if (!part) return null;

    const revs = [...(this.revisions.get(partId) ?? [])].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || b.revision.localeCompare(a.revision)
    );

    return {
      part: { ...part, revision_count: revs.length },
      revisions: revs,
    };
  }

  /**
   * Get a part by part number.
   */
  getByPartNumber(partNumber: string): { part: PartRecord; revisions: PartRevision[] } | null {
    const partId = this.partNumberIndex.get(partNumber.toUpperCase().trim());
    if (!partId) return null;
    return this.get(partId);
  }

  /**
   * Add a new revision to a part. Auto-increments revision letter.
   */
  addRevision(input: PartAddRevisionInput): { revision: PartRevision; part: PartRecord; warnings: string[] } {
    const warnings: string[] = [];
    const part = this.parts.get(input.part_id);
    if (!part) throw new Error(`Part not found: ${input.part_id}`);
    if (part.status === "archived") throw new Error(`Cannot revise archived part: ${input.part_id}`);

    const newRev = input.revision ?? nextRevision(part.current_revision);

    // Check revision doesn't already exist
    const existing = (this.revisions.get(input.part_id) ?? []).find(r => r.revision === newRev);
    if (existing) throw new Error(`Revision ${newRev} already exists for part ${part.part_number}`);

    if (!input.change_description || input.change_description.trim().length === 0) {
      throw new Error("change_description is required for revisions");
    }

    const revision: PartRevision = {
      id: generateId(),
      part_id: input.part_id,
      revision: newRev,
      cad_file_id: input.cad_file_id,
      drawing_file_id: input.drawing_file_id,
      change_description: input.change_description.trim(),
      changed_by: input.changed_by,
      created_at: new Date().toISOString(),
    };

    const revs = this.revisions.get(input.part_id) ?? [];
    revs.push(revision);
    this.revisions.set(input.part_id, revs);

    part.current_revision = newRev;
    part.updated_at = new Date().toISOString();
    if (input.cad_file_id) part.cad_file_id = input.cad_file_id;
    if (input.drawing_file_id) part.drawing_file_id = input.drawing_file_id;

    if (!input.cad_file_id && !input.drawing_file_id) {
      warnings.push("Revision created without updated files. Consider attaching new CAD/drawing.");
    }

    return { revision, part: { ...part, revision_count: revs.length }, warnings };
  }

  /**
   * List all revisions for a part.
   */
  listRevisions(partId: string): PartRevision[] {
    const part = this.parts.get(partId);
    if (!part) throw new Error(`Part not found: ${partId}`);
    return [...(this.revisions.get(partId) ?? [])].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || b.revision.localeCompare(a.revision)
    );
  }

  /**
   * Find parts similar to a given spec using PartSimilarityEngine.
   * Returns scored matches sorted by overall similarity.
   */
  async findSimilar(input: PartFindSimilarInput): Promise<{
    matches: { part: PartRecord; similarity: number; breakdown: Record<string, number> }[];
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Build the reference spec
    let referenceSpec: any = {};
    if (input.part_id) {
      const part = this.parts.get(input.part_id);
      if (!part) throw new Error(`Reference part not found: ${input.part_id}`);
      referenceSpec = {
        material: part.material_name ?? "unknown",
        iso_group: undefined,
        dimensions: input.dimensions,
        features: input.features ?? (part.tags.length > 0 ? part.tags : undefined),
        tolerances: input.tolerances,
        surface_finish_ra: input.surface_finish_ra,
        operations: input.operations,
      };
    } else {
      referenceSpec = {
        material: input.material ?? "unknown",
        iso_group: input.iso_group,
        dimensions: input.dimensions,
        features: input.features,
        tolerances: input.tolerances,
        surface_finish_ra: input.surface_finish_ra,
        operations: input.operations,
      };
    }

    // Lazy-load PartSimilarityEngine
    let similarityEngine: any;
    try {
      const mod = await import("./PartSimilarityEngine.js");
      similarityEngine = mod.partSimilarityEngine ?? new mod.PartSimilarityEngine();
    } catch {
      warnings.push("PartSimilarityEngine unavailable — returning empty results");
      return { matches: [], warnings };
    }

    const candidates = [...this.parts.values()]
      .filter(p => p.status === "active" && p.id !== input.part_id);

    const limit = Math.min(input.limit ?? 10, 50);
    const scored: { part: PartRecord; similarity: number; breakdown: Record<string, number> }[] = [];

    for (const candidate of candidates) {
      const candidateSpec = {
        material: candidate.material_name ?? "unknown",
        features: candidate.tags.length > 0 ? candidate.tags : undefined,
      };

      try {
        const result = similarityEngine.compare(referenceSpec, candidateSpec);
        if (result.overall > 0.3) {
          scored.push({ part: candidate, similarity: result.overall, breakdown: result.breakdown });
        }
      } catch {
        // Skip comparison failures
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return { matches: scored.slice(0, limit), warnings };
  }

  /**
   * Detect potential duplicate parts (same name or very similar specs).
   */
  deduplicate(): DeduplicateResult {
    const warnings: string[] = [];
    const active = [...this.parts.values()].filter(p => p.status === "active");
    const duplicates: DeduplicateResult["duplicates"] = [];

    // Name-based dedup
    const nameMap = new Map<string, PartRecord[]>();
    for (const part of active) {
      const key = part.name.toLowerCase().replace(/\s+/g, " ").trim();
      const group = nameMap.get(key) ?? [];
      group.push(part);
      nameMap.set(key, group);
    }

    for (const [, group] of nameMap) {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            duplicates.push({
              part_a: group[i].part_number,
              part_b: group[j].part_number,
              similarity: 1.0,
              reason: "Identical name",
            });
          }
        }
      }
    }

    // Material + tag overlap dedup
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        if (a.material_id && a.material_id === b.material_id) {
          const tagOverlap = a.tags.filter(t => b.tags.includes(t)).length;
          const maxTags = Math.max(a.tags.length, b.tags.length, 1);
          const tagSim = tagOverlap / maxTags;
          if (tagSim > 0.7) {
            const existing = duplicates.find(
              d => (d.part_a === a.part_number && d.part_b === b.part_number)
            );
            if (!existing) {
              duplicates.push({
                part_a: a.part_number,
                part_b: b.part_number,
                similarity: tagSim,
                reason: "Same material + high tag overlap",
              });
            }
          }
        }
      }
    }

    if (active.length > 100) {
      warnings.push("Large library — dedup checked name + material/tag overlap only. Consider running similarity-based dedup separately.");
    }

    return {
      duplicates: duplicates.sort((a, b) => b.similarity - a.similarity),
      total_checked: active.length,
      warnings,
    };
  }

  /** Get library stats */
  getStats(): {
    total_parts: number;
    active_parts: number;
    total_revisions: number;
    by_status: Record<string, number>;
    tags_used: number;
  } {
    const all = [...this.parts.values()];
    const byStatus: Record<string, number> = {};
    for (const p of all) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }
    const totalRevs = [...this.revisions.values()].reduce((sum, revs) => sum + revs.length, 0);
    const allTags = new Set(all.flatMap(p => p.tags));

    return {
      total_parts: all.length,
      active_parts: all.filter(p => p.status === "active").length,
      total_revisions: totalRevs,
      by_status: byStatus,
      tags_used: allTags.size,
    };
  }
}

export const partsLibraryEngine = new PartsLibraryEngine();
