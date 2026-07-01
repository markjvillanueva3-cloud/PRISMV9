/**
 * tool-library-partition.ts
 * [CATALOG-APP-WIRING-MS0]/U-TOOLDB-MAT-TYPE-BRAND (slot:romeo)
 *
 * Pure, deterministic helpers that organize a tool library by the operator's
 * requested axis: MATERIAL category -> tool TYPE -> BRAND. Used by
 * generate-jm-fusion-tool-libraries.ts to emit the material->type->brand tree
 * on top of the existing per-ISO-group (material-only) libraries.
 *
 * INJECTIVE by construction: the tree is keyed by the RAW (distinct) type/brand
 * strings, never by their slug, so two distinct types/brands that slug to the
 * same string (e.g. "YG-1" vs "YG 1") are NEVER silently merged into one leaf.
 * The filesystem-safe slug is assigned per-parent at flatten time, with a
 * deterministic numeric suffix on any slug collision so every distinct raw value
 * gets its own unique, safe filename.
 *
 * No I/O, no engine deps -> unit-testable against real reference values.
 *
 * @module scripts/lib/tool-library-partition
 */

const UNKNOWN_TYPE = "(unknown type)";
const UNSPECIFIED_BRAND = "(unspecified)";

/** Filesystem-safe slug: lowercase, non-alphanumeric runs -> "-", trimmed. */
export function slugify(s: string): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Tool-type slug for the directory level. Empty/blank -> "unknown-type". */
export function toolTypeSlug(toolType: string): string {
  return slugify(toolType) || "unknown-type";
}

/**
 * Brand slug for the leaf level. A blank vendor is a real catalog state (not an
 * error) -> "unspecified" so the tool is still filed, never dropped.
 */
export function brandSlug(vendor: string): string {
  return slugify(vendor) || "unspecified";
}

/**
 * Sanitize the ISO material segment to a bare [A-Z0-9] path token (no traversal).
 * NOTE: not injective -- intended for a CONTROLLED material-group enum (P/M/K/N/S/H).
 * A caller passing free-text iso values must pre-disambiguate (as flattenTree does for
 * the free-text type/brand axes). The generator guards its fixed GROUPS are
 * collision-free under this function at startup (fail-loud).
 */
export function isoSegment(iso: string): string {
  return ((iso ?? "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "")) || "X";
}

/** One filed tool row, already tagged with its material group + raw type/brand. */
export interface PartitionInput {
  /** ISO machinability group: P|M|K|N|S|H. */
  iso: string;
  /** Raw tool type (Fusion `Type (tool_type)` value). */
  toolType: string;
  /** Raw vendor/brand (Fusion `Vendor (tool_vendor)` value). */
  vendor: string;
  /** The serialized CSV data row to file. */
  row: string;
}

/** Nested ISO -> rawType -> rawBrand -> rows[] tree (keyed by RAW values). */
export type MaterialTypeBrandTree = Record<string, Record<string, Record<string, string[]>>>;

/**
 * Build the material->type->brand tree keyed by RAW (distinct) type/brand
 * strings. Deterministic: insertion order within a leaf is preserved; every
 * input row lands in exactly one leaf; distinct raw values are never merged.
 */
export function nestByMaterialTypeBrand(inputs: PartitionInput[]): MaterialTypeBrandTree {
  const tree: MaterialTypeBrandTree = {};
  for (const it of inputs) {
    const iso = isoSegment(it.iso);
    const rawType = (it.toolType ?? "").trim() || UNKNOWN_TYPE;
    const rawBrand = (it.vendor ?? "").trim() || UNSPECIFIED_BRAND;
    (((tree[iso] ??= {})[rawType] ??= {})[rawBrand] ??= []).push(it.row);
  }
  return tree;
}

/**
 * Assign a UNIQUE filesystem-safe slug to each raw value, processing in sorted
 * order. On a slug collision (two distinct raws -> same base slug) the later one
 * gets a deterministic "-2", "-3", ... suffix, so distinct raws never share a
 * file. `blankSlug` is the fallback used when a raw value slugs to empty.
 *
 * Exported so the sibling holder library generator (generate-jm-holder-libraries.ts)
 * reuses the SAME injective-slug primitive for its type -> brand tree -- one
 * collision-safe filename rule across both the tooling and holder databases.
 */
export function injectiveSlugs(rawsSorted: string[], blankSlug: string): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const raw of rawsSorted) {
    const base = slugify(raw) || blankSlug;
    let s = base;
    let n = 1;
    while (used.has(s)) {
      n++;
      s = `${base}-${n}`;
    }
    used.add(s);
    out.set(raw, s);
  }
  return out;
}

/** One leaf cell flattened for emission, carrying both the raw values and unique slugs. */
export interface PartitionLeaf {
  iso: string;
  rawType: string;
  rawBrand: string;
  typeSlug: string;
  brandSlug: string;
  rows: string[];
}

/**
 * Flatten the tree to leaves in stable (iso, type, brand) sorted order, assigning
 * per-parent INJECTIVE slugs so two distinct raw types/brands can never collide
 * onto the same directory/file name.
 */
export function flattenTree(tree: MaterialTypeBrandTree): PartitionLeaf[] {
  const leaves: PartitionLeaf[] = [];
  for (const iso of Object.keys(tree).sort()) {
    const rawTypes = Object.keys(tree[iso]).sort();
    const typeSlugMap = injectiveSlugs(rawTypes, "unknown-type");
    for (const rawType of rawTypes) {
      const rawBrands = Object.keys(tree[iso][rawType]).sort();
      const brandSlugMap = injectiveSlugs(rawBrands, "unspecified");
      for (const rawBrand of rawBrands) {
        leaves.push({
          iso,
          rawType,
          rawBrand,
          typeSlug: typeSlugMap.get(rawType)!,
          brandSlug: brandSlugMap.get(rawBrand)!,
          rows: tree[iso][rawType][rawBrand],
        });
      }
    }
  }
  return leaves;
}
