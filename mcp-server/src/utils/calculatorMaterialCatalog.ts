/**
 * PRISM Calculator -- Workpiece-Material Catalog Accessor
 * ======================================================
 * Normalizes loaded `MaterialRegistry` rows (245+ ISO-classified alloys with
 * Kienzle/Taylor coefficients + hardness) into frontend-ready select-option
 * lists for the SFC calculator's MATERIAL input. Backs
 * `GET /api/v1/data/material/catalog`.
 *
 * The SFC material input is an OPEN-ENDED free-text field (the orchestrator
 * resolves any alloy string by name), so this catalog SEEDS a `<datalist>` of
 * the full material database rather than a closed `<select>` -- off-catalog
 * alloys are still accepted, and a matched alloy cascade-fills ISO group +
 * Brinell hardness. Previously the datalist was a hardcoded 28-entry array in
 * `web/src/data/materials.ts`; this surfaces the whole registry instead.
 *
 * Mirrors the `getCalculatorMachineCatalogRows` pattern (data.ts:84-94): the
 * route loads the registry and passes the rows in; THIS module is a PURE
 * normalizer (no registry import, no filesystem IO) so it is R9-testable in
 * isolation. Reads only the cut-selection fields the orchestrator consumes
 * (name / ISO group / hardness HB+HRC / has-Kienzle) -- physics coefficients
 * stay sourced from `src/physics/constants.ts` + the registry, never surfaced
 * to the client for inlining.
 *
 * Fail-soft: an empty/malformed row set degrades to a small curated material
 * set spanning all six ISO groups (source = "curated", liveCount = 0) so the
 * datalist is never silently empty -- the source/liveCount fields report the
 * degradation honestly.
 *
 * @version 1.0.0 -- SFC-DB-WIRING U-OSC-SFC-MATERIAL-CATALOG
 */

/** ISO 513 group code -> human label (matches web/src/data/materials.ts ISO_GROUPS). */
const ISO_GROUP_LABELS: Record<string, string> = {
  P: "Steel",
  M: "Stainless Steel",
  K: "Cast Iron",
  N: "Non-Ferrous",
  S: "Superalloys",
  H: "Hardened Steel",
};

/** A single workpiece-material option ready for a frontend datalist/select. */
export interface MaterialOption {
  id: string;
  /** Display + the value typed into the free-text material field (the alloy name). */
  label: string;
  detail: string;
  /** ISO machining group (P/M/K/N/S/H) or "" if unclassified. */
  isoGroup: string;
  /** Human ISO group label ("Steel", "Superalloys", ...) or "". */
  isoLabel: string;
  /** Brinell hardness (HB) or null when only HRC / no hardness is known. */
  hardnessHb: number | null;
  /** Rockwell-C hardness (HRC) or null. */
  hardnessHrc: number | null;
  /** True when the registry row carries usable Kienzle kc1.1 + mc (force-modelable). */
  hasKienzle: boolean;
}

/** Catalog response envelope -- mirrors the stock/coating/insert catalog contract. */
export interface MaterialCatalogResponse {
  options: MaterialOption[];
  /** Distinct ISO groups present (for a facet filter). */
  isoGroups: string[];
  total: number;
  source: "database" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

/**
 * Curated fail-soft material set (one+ per ISO group) -- used only when the
 * registry is empty/unreadable so the SFC material datalist is never empty.
 * `source` is reported as "curated" when this is used. Names + HB mirror the
 * canonical entries in `web/src/data/materials.ts` so the cascade is identical
 * whether live or degraded.
 */
const CURATED_FALLBACK: MaterialOption[] = [
  { id: "aisi-1045", label: "AISI 1045 Carbon Steel", detail: "P - Steel - 200 HB", isoGroup: "P", isoLabel: "Steel", hardnessHb: 200, hardnessHrc: null, hasKienzle: true },
  { id: "aisi-4140", label: "AISI 4140 Alloy Steel", detail: "P - Steel - 280 HB", isoGroup: "P", isoLabel: "Steel", hardnessHb: 280, hardnessHrc: null, hasKienzle: true },
  { id: "ss-304", label: "304 Austenitic Stainless", detail: "M - Stainless Steel - 170 HB", isoGroup: "M", isoLabel: "Stainless Steel", hardnessHb: 170, hardnessHrc: null, hasKienzle: true },
  { id: "ggg50", label: "GGG50 Ductile Iron", detail: "K - Cast Iron - 190 HB", isoGroup: "K", isoLabel: "Cast Iron", hardnessHb: 190, hardnessHrc: null, hasKienzle: true },
  { id: "al-6061", label: "6061-T6 Aluminum", detail: "N - Non-Ferrous - 95 HB", isoGroup: "N", isoLabel: "Non-Ferrous", hardnessHb: 95, hardnessHrc: null, hasKienzle: true },
  { id: "in718", label: "Inconel 718", detail: "S - Superalloys - 380 HB", isoGroup: "S", isoLabel: "Superalloys", hardnessHb: 380, hardnessHrc: null, hasKienzle: true },
  { id: "d2-hrc60", label: "D2 @ 60 HRC", detail: "H - Hardened Steel - 60 HRC", isoGroup: "H", isoLabel: "Hardened Steel", hardnessHb: null, hardnessHrc: 60, hasKienzle: true },
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

/**
 * Finite-number coercion that preserves a real 0 but maps null/undefined/non-finite
 * to null. The explicit null guard matters: registry rows DO carry `"brinell": null` /
 * `"rockwell_c": null`, and `Number(null) === 0` would otherwise surface a bogus 0-hardness
 * (which the page cascade would push as `hardness_hb: 0`, discarding a real HRC).
 */
function finiteOrNull(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Slugify a material id/name into a stable, select-safe option id. */
export function materialOptionId(value: string, fallback: string): string {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

/** Safely read a nested field by a dotted path, returning the raw value or undefined. */
function readNested(root: Record<string, unknown>, dotted: string): unknown {
  let cur: unknown = root;
  for (const key of dotted.split(".")) {
    const rec = asRecord(cur);
    if (!rec) return undefined;
    cur = rec[key];
  }
  return cur;
}

function buildDetail(isoGroup: string, isoLabel: string, hardnessHb: number | null, hardnessHrc: number | null): string {
  const parts: string[] = [];
  if (isoGroup) parts.push(isoGroup);
  if (isoLabel) parts.push(isoLabel);
  if (hardnessHb !== null && hardnessHb > 0) parts.push(`${hardnessHb} HB`);
  else if (hardnessHrc !== null && hardnessHrc > 0) parts.push(`${hardnessHrc} HRC`);
  return parts.join(" - ");
}

/**
 * PURE: normalize an array of registry material rows into datalist options.
 * Accepts the loose `Material` registry shape (nested classification / mechanical
 * / kienzle objects). Exported for direct R9 testing without the registry.
 */
export function buildMaterialOptionsFromRows(rows: unknown): MaterialOption[] {
  if (!Array.isArray(rows)) return [];

  const seen = new Set<string>();
  const options: MaterialOption[] = [];
  for (const rawRow of rows) {
    const row = asRecord(rawRow);
    if (!row) continue;

    const name = readText(row.name) || readText(row.material_id) || readText(row.id);
    if (!name) continue;

    const rawId = readText(row.material_id) || readText(row.id) || name;
    const id = materialOptionId(rawId, `material-${options.length}`);
    if (seen.has(id)) continue;
    seen.add(id);

    // ISO group: classification.iso_group wins, else top-level iso_group (registry dual-path).
    const isoGroupRaw =
      readText(readNested(row, "classification.iso_group")) || readText(row.iso_group);
    const isoGroup = isoGroupRaw ? isoGroupRaw.toUpperCase().charAt(0) : "";
    const isoLabel = ISO_GROUP_LABELS[isoGroup] ?? "";

    const hardnessHb = finiteOrNull(readNested(row, "mechanical.hardness.brinell"));
    const hardnessHrc = finiteOrNull(readNested(row, "mechanical.hardness.rockwell_c"));

    const kc11 = finiteOrNull(readNested(row, "kienzle.kc1_1"));
    const mc = finiteOrNull(readNested(row, "kienzle.mc"));
    const hasKienzle = kc11 !== null && mc !== null;

    options.push({
      id,
      label: name,
      detail: buildDetail(isoGroup, isoLabel, hardnessHb, hardnessHrc) || name,
      isoGroup,
      isoLabel,
      hardnessHb,
      hardnessHrc,
      hasKienzle,
    });
  }
  // Stable display order: ISO group, then alloy name.
  options.sort((a, b) =>
    a.isoGroup === b.isoGroup ? a.label.localeCompare(b.label) : a.isoGroup.localeCompare(b.isoGroup),
  );
  return options;
}

/** Distinct, sorted, non-empty ISO groups across the option set. */
function distinctIsoGroups(options: MaterialOption[]): string[] {
  const set = new Set<string>();
  for (const o of options) {
    if (o.isoGroup) set.add(o.isoGroup);
  }
  return [...set].sort();
}

/**
 * PURE: assemble the catalog response from already-loaded registry rows.
 * Exported so the curated fail-soft branch is directly testable without the registry.
 */
export function getCalculatorMaterialCatalog(args: { registryRows: unknown }): MaterialCatalogResponse {
  const liveOptions = buildMaterialOptionsFromRows(args.registryRows);

  if (liveOptions.length === 0) {
    return {
      options: CURATED_FALLBACK,
      isoGroups: distinctIsoGroups(CURATED_FALLBACK),
      total: CURATED_FALLBACK.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: CURATED_FALLBACK.length,
      note: "Curated material set active -- the material registry was unavailable or empty.",
    };
  }

  return {
    options: liveOptions,
    isoGroups: distinctIsoGroups(liveOptions),
    total: liveOptions.length,
    source: "database",
    liveCount: liveOptions.length,
    fallbackCount: 0,
    note: "Live workpiece-material catalog from the MaterialRegistry (ISO-classified alloys with Kienzle coefficients).",
  };
}
