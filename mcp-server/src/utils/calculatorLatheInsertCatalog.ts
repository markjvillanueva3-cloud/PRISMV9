/**
 * PRISM Calculator -- Turning (Lathe) Insert Catalog Accessor
 * ==========================================================
 * Normalizes the consolidated insert reference database
 * (`mcp-server/data/prism-reference-db/inserts.json`, store
 * `LATHE_INSERT_DATABASE.turningInserts`) into frontend-ready select-option lists
 * for the SFC calculator's TURNING insert input. Backs
 * `GET /api/v1/data/turning-insert/catalog`.
 *
 * This is the lathe analogue of the milling indexable-insert catalog
 * (calculatorInsertCatalog.ts, which reads `INSERT_DATABASE`). `turningInserts` is
 * keyed by ISO/ANSI designation (cnmg_432, wnmg_432, ...), each carrying the ISO +
 * ANSI codes, shape (C/D/V/W/...), nose radius, edge count, negative/positive type,
 * chipbreaker, application, and recommended DOC/feed ranges. The `insertShapes`
 * sibling store maps the single-letter shape code to a human shape name (Diamond
 * 80deg, Square, Round, ...) which is attached to each option for readability.
 *
 * Scope: this exposes the indexable TURNING inserts only. The same
 * `LATHE_INSERT_DATABASE` store also holds `groovingInserts`, `carbideGrades`, and
 * `coatings`; grooving/parting inserts are a distinct operation and are a future
 * separate facet, intentionally not merged into this turning-insert select.
 *
 * Fail-soft: a missing or malformed DB degrades to a small curated turning-insert
 * set (source = "curated", liveCount = 0) so the select is never empty -- the
 * source/liveCount fields report the degradation honestly (no silent empty).
 *
 * @version 1.0.0 -- SFC-DB-WIRING U-OSC-SFC-TURNING-INSERT-CATALOG
 */
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";

/** A single turning-insert option ready for a frontend `<select>`. */
export interface TurningInsertOption {
  id: string;
  label: string;
  detail: string;
  iso: string;
  ansi: string;
  /** Single-letter ISO 1832 shape code (C/D/K/R/S/T/V/W). */
  shapeCode: string;
  /** Human shape name resolved from `insertShapes` (e.g. "Diamond 80"). */
  shapeName: string;
  noseRadius: number;
  edges: number;
  /** "negative" | "positive" insert geometry, or "" if unspecified. */
  type: string;
  application: string;
}

/** Catalog response envelope -- mirrors the insert/coating catalog contract. */
export interface TurningInsertCatalogResponse {
  options: TurningInsertOption[];
  /** Distinct shape names present (for a facet filter). */
  shapes: string[];
  total: number;
  source: "database" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

const INSERTS_DB_PATH = path.join(PATHS.MCP_SERVER, "data", "prism-reference-db", "inserts.json");

/**
 * Curated fallback -- used only when the reference DB is missing/unreadable so the
 * SFC turning-insert select is never empty; `source` is reported as "curated" when used.
 */
const CURATED_FALLBACK: TurningInsertOption[] = [
  { id: "cnmg-120408", label: "CNMG 120408", detail: "CNMG 432 - Diamond 80 - General roughing - 4 edges", iso: "CNMG 120408", ansi: "CNMG 432", shapeCode: "C", shapeName: "Diamond 80", noseRadius: 0.031, edges: 4, type: "negative", application: "General roughing" },
  { id: "dnmg-150408", label: "DNMG 150408", detail: "DNMG 432 - Diamond 55 - Finishing - 4 edges", iso: "DNMG 150408", ansi: "DNMG 432", shapeCode: "D", shapeName: "Diamond 55", noseRadius: 0.031, edges: 4, type: "negative", application: "Finishing, light roughing" },
  { id: "wnmg-080408", label: "WNMG 080408", detail: "WNMG 432 - Trigon 80 - Contouring - 6 edges", iso: "WNMG 080408", ansi: "WNMG 432", shapeCode: "W", shapeName: "Trigon 80", noseRadius: 0.031, edges: 6, type: "negative", application: "Copy turning, contouring" },
  { id: "tcmt-110204", label: "TCMT 110204", detail: "TCMT 21.51 - Triangle - Small boring - 3 edges", iso: "TCMT 110204", ansi: "TCMT 21.51", shapeCode: "T", shapeName: "Triangle", noseRadius: 0.016, edges: 3, type: "positive", application: "Small boring, finishing" },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function safeNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Slugify an insert designation into a stable, select-safe option id. */
export function turningInsertOptionId(value: string, fallback: string): string {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

/**
 * Build the shape-code -> human-name map from `insertShapes`. Names are passed
 * through verbatim from the DB (they may carry a degree sign, e.g. "Diamond 80deg"
 * in the data), which is valid in the JSON/HTTP response -- only this source file
 * must stay ASCII, so this comment uses "deg" where the data uses the degree sign.
 */
function buildShapeNameMap(latheDb: Record<string, unknown> | null): Record<string, string> {
  const shapes = latheDb ? asRecord(latheDb.insertShapes) : null;
  if (!shapes) return {};
  const out: Record<string, string> = {};
  for (const [code, raw] of Object.entries(shapes)) {
    const entry = asRecord(raw);
    const name = entry ? readText(entry.name) : "";
    if (name) out[code] = name;
  }
  return out;
}

function buildDetail(ansi: string, shapeName: string, application: string, edges: number): string {
  const parts: string[] = [];
  if (ansi) parts.push(ansi);
  if (shapeName) parts.push(shapeName);
  if (application) parts.push(application);
  if (edges > 0) parts.push(`${edges} edges`);
  return parts.join(" - ");
}

/**
 * PURE: normalize the `stores` object of inserts.json into turning-insert options
 * from `LATHE_INSERT_DATABASE.turningInserts`. Exported for direct R9 testing of
 * malformed/empty inputs without filesystem IO.
 */
export function buildTurningInsertOptionsFromStores(stores: unknown): TurningInsertOption[] {
  const root = asRecord(stores);
  const latheDb = root ? asRecord(root.LATHE_INSERT_DATABASE) : null;
  const turning = latheDb ? asRecord(latheDb.turningInserts) : null;
  if (!turning) return [];

  const shapeNames = buildShapeNameMap(latheDb);
  const seen = new Set<string>();
  const options: TurningInsertOption[] = [];
  for (const [key, rawEntry] of Object.entries(turning)) {
    const entry = asRecord(rawEntry);
    if (!entry) continue;
    const iso = readText(entry.iso);
    const ansi = readText(entry.ansi);
    const baseId = iso || ansi || key;
    if (!baseId) continue;
    const id = turningInsertOptionId(baseId, `turning-insert-${options.length}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const shapeCode = readText(entry.shape);
    const shapeName = shapeNames[shapeCode] || "";
    const noseRadius = safeNum(entry.noseRadius);
    const edges = safeNum(entry.edges);
    const type = readText(entry.type);
    const application = readText(entry.application);
    const label = iso || ansi || id;
    options.push({
      id,
      label,
      detail: buildDetail(ansi, shapeName, application, edges) || label,
      iso,
      ansi,
      shapeCode,
      shapeName,
      noseRadius,
      edges,
      type,
      application,
    });
  }
  return options;
}

/** Distinct, sorted, non-empty shape names across the option set. */
function distinctShapes(options: TurningInsertOption[]): string[] {
  const set = new Set<string>();
  for (const o of options) {
    if (o.shapeName) set.add(o.shapeName);
  }
  return [...set].sort();
}

let cachedDb: Record<string, unknown> | null = null;
let cachedDbAttempted = false;

function loadInsertDb(): Record<string, unknown> | null {
  if (cachedDbAttempted) return cachedDb;
  try {
    if (!fs.existsSync(INSERTS_DB_PATH)) {
      // File genuinely absent -- a deterministic outcome; latch it.
      cachedDb = null;
      cachedDbAttempted = true;
      return null;
    }
    cachedDb = JSON.parse(fs.readFileSync(INSERTS_DB_PATH, "utf8")) as Record<string, unknown>;
    cachedDbAttempted = true;
  } catch {
    // Transient/partial-write read or parse failure -- do NOT latch; retry next call.
    cachedDb = null;
  }
  return cachedDb;
}

/** Test hook -- clears the module-level DB cache. */
export function resetTurningInsertCatalogCacheForTest(): void {
  cachedDb = null;
  cachedDbAttempted = false;
}

/**
 * PURE: assemble the catalog response from an already-loaded DB object (or null).
 * Exported so the curated fail-soft branch is directly testable without filesystem IO.
 */
export function buildTurningInsertCatalog(db: Record<string, unknown> | null): TurningInsertCatalogResponse {
  const stores = db ? db.stores : null;
  const liveOptions = buildTurningInsertOptionsFromStores(stores);

  if (liveOptions.length === 0) {
    return {
      options: CURATED_FALLBACK,
      shapes: distinctShapes(CURATED_FALLBACK),
      total: CURATED_FALLBACK.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: CURATED_FALLBACK.length,
      note: "Curated turning-insert set active -- the consolidated insert reference database was unavailable or empty.",
    };
  }

  return {
    options: liveOptions,
    shapes: distinctShapes(liveOptions),
    total: liveOptions.length,
    source: "database",
    liveCount: liveOptions.length,
    fallbackCount: 0,
    note: "Live turning-insert catalog from the PRISM consolidated reference database (LATHE_INSERT_DATABASE.turningInserts).",
  };
}

/**
 * Build the SFC turning-insert select catalog from the consolidated reference DB
 * (cached read). Thin wrapper over the pure `buildTurningInsertCatalog`.
 */
export function getCalculatorTurningInsertCatalog(): TurningInsertCatalogResponse {
  return buildTurningInsertCatalog(loadInsertDb());
}
