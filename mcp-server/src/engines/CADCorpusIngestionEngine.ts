// WIRE-EXEMPT: corpus-learning surface used by scripts/ingest-cad-corpus.ts;
// dispatcher integration deferred until the BlueprintVisionOCREngine hook is
// restored after the peer-chat revert resolves.
/**
 * CADCorpusIngestionEngine — Local-file CAD corpus learning surface.
 *
 * Walks a directory tree, classifies each CAD file (STEP / IGES / SLDPRT /
 * IPT / DXF / STL / F3D) by part class using the same taxonomy as
 * BlueprintVisionOCREngine, and surfaces the resulting corpus so the OCR
 * pipeline can match new prints against historical parts the shop has
 * already machined.
 *
 * The classifier is filename-driven (no model loader, no triangulation) and
 * therefore deterministic, reproducible, and cheap to re-run when files are
 * added or moved. Each entry records the file's mtime, byte size, and part-
 * class confidence so consumers can filter by recency or classifier strength.
 *
 * Persistence: the manifest serialises to JSON at
 * `data/state/cad-corpus-manifest.json` so the corpus survives across sessions.
 *
 * @engine CADCorpusIngestionEngine
 * @milestone CAD-FUSION-LIVE-MS0
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PartClass } from "./BlueprintVisionOCREngine.js";

// ── Constants ──────────────────────────────────────────────────────

const MANIFEST_SCHEMA_VERSION = "1.0.0";

const SUPPORTED_EXTENSIONS = new Set<string>([
  ".step", ".stp", ".iges", ".igs",
  ".sldprt", ".slddrw",
  ".ipt", ".idw", ".iam",
  ".f3d", ".f3z",
  ".x_t", ".x_b",
  ".prt", ".asm", ".drw",  // Creo/NX
  ".catpart", ".catproduct", ".catdrawing",  // CATIA
  ".stl", ".dxf", ".dwg",
]);

const SHAFT_ASPECT_RATIO_THRESHOLD = 4;
const DEFAULT_MAX_DEPTH = 12;
const DEFAULT_MAX_FILES = 50_000;

// ── Public Types ───────────────────────────────────────────────────

export interface CADCorpusEntry {
  /** Absolute path to the file. */
  abs_path: string;
  /** Path relative to the ingestion root. */
  rel_path: string;
  /** File extension, lower-case, with leading dot. */
  ext: string;
  /** Byte size on disk. */
  size_bytes: number;
  /** Modification time (epoch ms). */
  mtime_ms: number;
  /** Inferred part class from filename + path. */
  part_class: PartClass;
  /** [0,1] confidence in the part_class assignment. */
  classifier_confidence: number;
  /** Token that matched the classifier (regex hit) — empty if fell through to "general". */
  classifier_match?: string;
  /** Path-segment hint (e.g. "BATCH 1", "TRAINING", "PRODUCTION"). */
  source_bucket?: string;
}

export interface CorpusManifest {
  schema_version: string;
  generated_at: string;
  root: string;
  total_entries: number;
  by_class: Partial<Record<PartClass, number>>;
  by_format: Record<string, number>;
  entries: CADCorpusEntry[];
}

export interface IngestionOptions {
  /** Maximum directory recursion depth (default 12). */
  max_depth?: number;
  /** Maximum total files to ingest (default 50_000). */
  max_files?: number;
  /** Path segments to skip entirely (case-insensitive substring match). */
  skip_segments?: string[];
  /** Override extensions; default uses SUPPORTED_EXTENSIONS. */
  extensions?: string[];
}

// ── Filename-driven classifier ─────────────────────────────────────

/** Ordered classification rules. First match wins — order matters. */
const CLASSIFICATION_RULES: Array<{ class: PartClass; pattern: RegExp; confidence: number }> = [
  // Turbomachinery
  { class: "blisk", pattern: /\bBLISK\b|BLADED\s*DISK|INTEGRAL\s*BLADED/i, confidence: 0.95 },
  { class: "impeller", pattern: /\bIMPELLER\b|COMPRESSOR\s*WHEEL|PUMP\s*WHEEL/i, confidence: 0.9 },
  { class: "turbine_blade", pattern: /TURBINE\s*BLADE|HPT\s*BLADE|LPT\s*BLADE|FAN\s*BLADE/i, confidence: 0.9 },
  { class: "turbine_vane", pattern: /STATOR\s*VANE|NGV|NOZZLE\s*GUIDE\s*VANE/i, confidence: 0.9 },
  { class: "turbine_disk", pattern: /TURBINE\s*DISK|ROTOR\s*DISK/i, confidence: 0.9 },

  // Medical
  { class: "medical_implant", pattern: /HIP\s*STEM|KNEE\s*COMPONENT|DENTAL\s*ABUTMENT|SPINAL\s*CAGE|BONE\s*PLATE|IMPLANT/i, confidence: 0.85 },
  { class: "surgical_instrument", pattern: /FORCEP|RETRACTOR|OSTEOTOME|RONGEUR|SCALPEL\s*HANDLE/i, confidence: 0.85 },
  { class: "bone_screw", pattern: /BONE\s*SCREW|CORTICAL\s*SCREW|CANNULATED\s*SCREW|PEDICLE\s*SCREW/i, confidence: 0.85 },

  // Automotive
  { class: "engine_block", pattern: /ENGINE\s*BLOCK|CYLINDER\s*BLOCK/i, confidence: 0.85 },
  { class: "transmission_housing", pattern: /TRANSMISSION\s*HOUSING|GEARBOX\s*HOUSING|BELL\s*HOUSING/i, confidence: 0.85 },
  { class: "valve_body", pattern: /VALVE\s*BODY/i, confidence: 0.85 },
  { class: "brake_caliper", pattern: /BRAKE\s*CALIPER|CALIPER\s*BODY/i, confidence: 0.85 },
  { class: "connecting_rod", pattern: /CONNECTING\s*ROD|CONROD/i, confidence: 0.85 },

  // Aerospace
  { class: "pylon", pattern: /\bPYLON\b|ENGINE\s*MOUNT|NACELLE/i, confidence: 0.85 },
  { class: "bulkhead", pattern: /\bBULKHEAD\b/i, confidence: 0.85 },
  { class: "structural_frame", pattern: /WING\s*RIB|FUSELAGE\s*FRAME|LONGERON|STRUCTURAL\s*FRAME/i, confidence: 0.85 },
  { class: "lug", pattern: /CLEVIS\s*LUG|SHEAR\s*LUG|ATTACH\s*LUG/i, confidence: 0.8 },
  { class: "fitting", pattern: /\bAN\s*FITTING|MS\s*FITTING|HYDRAULIC\s*FITTING/i, confidence: 0.8 },
  { class: "bracket", pattern: /\bBRACKET\b/i, confidence: 0.7 },

  // Tooling (existing)
  { class: "extrude_punch", pattern: /EXTRUDE\s*PUNCH|PIERCE\s*PUNCH|FORM\s*PUNCH|\bPUNCH\b/i, confidence: 0.9 },
  { class: "die", pattern: /\bDIE\b|DIE\s*PLATE|DIE\s*BLOCK|DIE\s*CASE/i, confidence: 0.85 },
  { class: "shaft", pattern: /\bSHAFT\b|SPINDLE\s*SHAFT|DRIVE\s*SHAFT|\bPIN\b/i, confidence: 0.7 },
  { class: "bushing", pattern: /BUSHING|\bBUSH\b/i, confidence: 0.85 },
  { class: "casing", pattern: /\bCASING\b|HOUSING\s*ASSY|HOUSING\b/i, confidence: 0.7 },
  { class: "plate", pattern: /\bPLATE\b/i, confidence: 0.6 },
];

// ── Engine ──────────────────────────────────────────────────────────

export class CADCorpusIngestionEngine {
  /**
   * Classify a single file by name + path components alone.
   *
   * The matched regex token is recorded in `classifier_match` so consumers
   * can audit why a file landed in a particular class. Returns "general"
   * with confidence 0 if no rule matches.
   */
  classifyFile(absPath: string, relPath: string): {
    part_class: PartClass;
    confidence: number;
    match?: string;
  } {
    const blob = `${relPath} ${path.basename(absPath)}`.toUpperCase();
    for (const rule of CLASSIFICATION_RULES) {
      const m = blob.match(rule.pattern);
      if (m) {
        return { part_class: rule.class, confidence: rule.confidence, match: m[0] };
      }
    }
    return { part_class: "general", confidence: 0 };
  }

  /**
   * Walk a directory recursively, classifying every supported CAD file.
   *
   * Synchronous fs walk — caller controls when to invoke (e.g. boot, on-
   * demand re-scan). Returns a manifest summarising the corpus.
   */
  ingestDirectory(rootPath: string, options: IngestionOptions = {}): CorpusManifest {
    if (!fs.existsSync(rootPath)) {
      throw new Error(`ingestDirectory: root does not exist: ${rootPath}`);
    }
    const stat = fs.statSync(rootPath);
    if (!stat.isDirectory()) {
      throw new Error(`ingestDirectory: root is not a directory: ${rootPath}`);
    }
    const maxDepth = options.max_depth ?? DEFAULT_MAX_DEPTH;
    const maxFiles = options.max_files ?? DEFAULT_MAX_FILES;
    const skipSegs = (options.skip_segments ?? []).map((s) => s.toLowerCase());
    const exts = options.extensions
      ? new Set(options.extensions.map((e) => e.toLowerCase()))
      : SUPPORTED_EXTENSIONS;

    const entries: CADCorpusEntry[] = [];
    const byClass: Partial<Record<PartClass, number>> = {};
    const byFormat: Record<string, number> = {};

    const walk = (dir: string, depth: number): void => {
      if (depth > maxDepth) return;
      if (entries.length >= maxFiles) return;
      let kids: string[] = [];
      try {
        kids = fs.readdirSync(dir);
      } catch {
        return; // permission denied or disappeared mid-walk
      }
      for (const name of kids) {
        if (entries.length >= maxFiles) return;
        const full = path.join(dir, name);
        const lower = name.toLowerCase();
        if (skipSegs.some((s) => lower.includes(s))) continue;
        let st: fs.Stats;
        try {
          st = fs.statSync(full);
        } catch {
          continue;
        }
        if (st.isDirectory()) {
          walk(full, depth + 1);
          continue;
        }
        const ext = path.extname(name).toLowerCase();
        if (!exts.has(ext)) continue;
        const rel = path.relative(rootPath, full).replace(/\\/g, "/");
        const cls = this.classifyFile(full, rel);
        const sourceBucket = this.deriveBucket(rel);
        entries.push({
          abs_path: full.replace(/\\/g, "/"),
          rel_path: rel,
          ext,
          size_bytes: st.size,
          mtime_ms: st.mtimeMs,
          part_class: cls.part_class,
          classifier_confidence: cls.confidence,
          classifier_match: cls.match,
          source_bucket: sourceBucket,
        });
        byClass[cls.part_class] = (byClass[cls.part_class] ?? 0) + 1;
        byFormat[ext] = (byFormat[ext] ?? 0) + 1;
      }
    };
    walk(rootPath, 0);

    return {
      schema_version: MANIFEST_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      root: rootPath.replace(/\\/g, "/"),
      total_entries: entries.length,
      by_class: byClass,
      by_format: byFormat,
      entries,
    };
  }

  /**
   * Find corpus entries matching a given part class. Useful for "show me
   * historical impellers we've machined" lookups during DfM review or
   * proposal generation.
   */
  findByClass(manifest: CorpusManifest, partClass: PartClass, limit = 50): CADCorpusEntry[] {
    const matches = manifest.entries.filter((e) => e.part_class === partClass);
    matches.sort((a, b) => b.mtime_ms - a.mtime_ms);
    return matches.slice(0, limit);
  }

  /**
   * Aggregate stats across the manifest — counts by class, format, and
   * source bucket. Caller-side report helper.
   */
  summarize(manifest: CorpusManifest): {
    total: number;
    classified: number;
    unclassified: number;
    by_class: Array<{ class: PartClass; count: number }>;
    by_format: Array<{ ext: string; count: number }>;
    by_bucket: Array<{ bucket: string; count: number }>;
  } {
    const buckets = new Map<string, number>();
    let unclassified = 0;
    for (const e of manifest.entries) {
      if (e.part_class === "general") unclassified++;
      const b = e.source_bucket ?? "(uncategorized)";
      buckets.set(b, (buckets.get(b) ?? 0) + 1);
    }
    const byClass = Object.entries(manifest.by_class)
      .map(([k, v]) => ({ class: k as PartClass, count: v as number }))
      .sort((a, b) => b.count - a.count);
    const byFormat = Object.entries(manifest.by_format)
      .map(([k, v]) => ({ ext: k, count: v }))
      .sort((a, b) => b.count - a.count);
    const byBucket = Array.from(buckets.entries())
      .map(([k, v]) => ({ bucket: k, count: v }))
      .sort((a, b) => b.count - a.count);
    return {
      total: manifest.total_entries,
      classified: manifest.total_entries - unclassified,
      unclassified,
      by_class: byClass,
      by_format: byFormat,
      by_bucket: byBucket,
    };
  }

  /** Persist a manifest to disk (atomic write via temp + rename). */
  saveManifest(manifest: CorpusManifest, filePath: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2), "utf8");
    fs.renameSync(tmp, filePath);
  }

  /** Load a manifest from disk (returns null if absent or unparseable). */
  loadManifest(filePath: string): CorpusManifest | null {
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const obj = JSON.parse(raw) as CorpusManifest;
      if (obj.schema_version !== MANIFEST_SCHEMA_VERSION) return null;
      return obj;
    } catch {
      return null;
    }
  }

  // ── Internal helpers ──

  private deriveBucket(relPath: string): string | undefined {
    const segs = relPath.split("/").filter(Boolean);
    if (segs.length < 2) return undefined;
    // First non-trivial parent directory tends to be the meaningful bucket.
    const candidates = segs.slice(0, segs.length - 1);
    return candidates.find((s) => s.length >= 3 && !/^[0-9._-]+$/.test(s));
  }
}

export const cadCorpusIngestionEngine = new CADCorpusIngestionEngine();
