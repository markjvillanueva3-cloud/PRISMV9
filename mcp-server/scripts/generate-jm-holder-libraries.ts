/**
 * generate-jm-holder-libraries.ts
 * [CATALOG-APP-WIRING-MS0]/U-HOLDER-TYPE-BRAND-DISK (slot:romeo)
 *
 * Materializes the real branded tool-holder database (HolderSelectionEngine, 643 holders
 * across HAIMER / GUHRING / BIG DAISHOWA) to disk organized the way the operator asked:
 * **by TYPE, then BRAND** (operator directive 2026-06-09: "tool holders by type then brand").
 *
 * The engine already exposes the in-memory view (`holderSelectionEngine.byTypeBrand()`); this
 * generator is the on-disk consumer of it -- a sibling of generate-jm-fusion-tool-libraries.ts
 * (which materializes TOOLING as material->type->brand). It reuses the SAME collision-safe
 * filename primitive (`injectiveSlugs` from scripts/lib/tool-library-partition.ts) so two
 * distinct holder types/brands that slug identically (e.g. "shrink fit" vs "shrink_fit") are
 * NEVER silently merged into one file.
 *
 * Output (under state/shared/holder-libraries/):
 *   by-type-brand/<holder-type>/<brand>.csv   -- one CSV per (type, brand) leaf
 *   by-type-brand/INDEX.md                    -- type | brand | count | path table
 *   holder-database.json                      -- machine-readable roll-up (stats + leaves)
 *
 * Pure core (`buildHolderLeaves`, `holderCsvRow`) has no I/O -> unit-testable against the live
 * engine. Run: `npx tsx scripts/generate-jm-holder-libraries.ts`
 *
 * @module scripts/generate-jm-holder-libraries
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { holderSelectionEngine, type HolderRecord } from "../src/engines/HolderSelectionEngine.js";
import { injectiveSlugs } from "./lib/tool-library-partition.js";

const OUT_DIR = "H:/prism/state/shared/holder-libraries";
const TB_DIR = join(OUT_DIR, "by-type-brand");

/** CSV header for a holder leaf file (the holder-database column schema). */
export const HOLDER_CSV_HEADER =
  "brand,type,designation,taper,bore_min_mm,bore_max_mm,body_dia_mm,gauge_mm,overall_mm,source";

/** One (type, brand) leaf with its injective filesystem slugs and the holders it holds. */
export interface HolderLeaf {
  /** Raw holder type (the directory level), e.g. "shrink_fit". */
  rawType: string;
  /** Raw brand (the file level), e.g. "HAIMER". */
  rawBrand: string;
  /** Collision-safe directory slug for rawType. */
  typeSlug: string;
  /** Collision-safe file slug for rawBrand. */
  brandSlug: string;
  /** The holder records filed in this leaf (never empty -- a leaf only exists if it has rows). */
  records: HolderRecord[];
}

/** A number-or-null cell: null/NaN -> empty (an unknown dimension is left blank, never "0"). */
function num(n: number | null): string {
  return n == null || !Number.isFinite(n) ? "" : String(n);
}

/** CSV-quote a text cell only when it carries a comma/quote/newline (RFC-4180 minimal quoting). */
function csvText(s: string): string {
  const v = String(s ?? "");
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Serialize one holder to a CSV row aligned to HOLDER_CSV_HEADER. */
export function holderCsvRow(r: HolderRecord): string {
  return [
    csvText(r.brand),
    csvText(r.type),
    csvText(r.designation),
    csvText(r.taper),
    num(r.boreMinMm),
    num(r.boreMaxMm),
    num(r.bodyDiaMm),
    num(r.gaugeMm),
    num(r.overallMm),
    csvText(r.source),
  ].join(",");
}

/**
 * Flatten the type->brand->holders tree into leaves with INJECTIVE per-parent slugs.
 * Deterministic (types + brands processed in sorted order); every input holder lands in
 * exactly one leaf; two distinct raw types/brands never collide onto the same path.
 *
 * @param tree holderSelectionEngine.byTypeBrand() output
 * @returns leaves in stable (type, brand) order, each carrying its unique slugs + records
 */
export function buildHolderLeaves(
  tree: Record<string, Record<string, HolderRecord[]>>,
): HolderLeaf[] {
  const leaves: HolderLeaf[] = [];
  const types = Object.keys(tree).sort();
  const typeSlugMap = injectiveSlugs(types, "unknown-type");
  for (const rawType of types) {
    const brands = Object.keys(tree[rawType]).sort();
    const brandSlugMap = injectiveSlugs(brands, "unspecified");
    for (const rawBrand of brands) {
      leaves.push({
        rawType,
        rawBrand,
        typeSlug: typeSlugMap.get(rawType)!,
        brandSlug: brandSlugMap.get(rawBrand)!,
        records: tree[rawType][rawBrand],
      });
    }
  }
  return leaves;
}

function main(): void {
  const tree = holderSelectionEngine.byTypeBrand();
  const stats = holderSelectionEngine.stats();
  const leaves = buildHolderLeaves(tree);

  mkdirSync(TB_DIR, { recursive: true });

  const index: string[] = [
    "# JM Holder Database -- by TYPE then BRAND",
    "",
    `> Real branded tool holders (${stats.total}) organized as the operator requested: holder TYPE`,
    "> first, then BRAND. Source: HolderSelectionEngine (HAIMER / GUHRING / BIG DAISHOWA catalogs).",
    "> Path layout: `by-type-brand/<holder-type>/<brand>.csv`. Columns: " + HOLDER_CSV_HEADER + ".",
    "",
    "| Type | Brand | Holders | Path |",
    "|------|-------|--------:|------|",
  ];

  let emitted = 0;
  for (const leaf of leaves) {
    const dir = join(TB_DIR, leaf.typeSlug);
    mkdirSync(dir, { recursive: true });
    const file = `${leaf.brandSlug}.csv`;
    const rows = leaf.records.map(holderCsvRow);
    writeFileSync(join(dir, file), [HOLDER_CSV_HEADER, ...rows].join("\n") + "\n", "utf-8");
    emitted += leaf.records.length;
    index.push(
      `| ${leaf.rawType} | ${leaf.rawBrand} | ${leaf.records.length} | by-type-brand/${leaf.typeSlug}/${file} |`,
    );
  }

  // Fail-loud (R12): every holder in the corpus must land in exactly one leaf file. A drop or a
  // silent merge (two distinct types/brands sharing a path) would make emitted != stats.total.
  if (emitted !== stats.total) {
    throw new Error(
      `holder library row-count mismatch: emitted ${emitted} rows but corpus has ${stats.total} holders -- a leaf was dropped or merged`,
    );
  }

  writeFileSync(join(TB_DIR, "INDEX.md"), index.join("\n") + "\n", "utf-8");

  const rollup = {
    schemaVersion: "1.0.0",
    generatedBy: "generate-jm-holder-libraries.ts (CATALOG-APP-WIRING-MS0/U-HOLDER-TYPE-BRAND-DISK)",
    stats,
    leafCount: leaves.length,
    leaves: leaves.map((l) => ({
      type: l.rawType,
      brand: l.rawBrand,
      path: `by-type-brand/${l.typeSlug}/${l.brandSlug}.csv`,
      count: l.records.length,
    })),
  };
  writeFileSync(join(OUT_DIR, "holder-database.json"), JSON.stringify(rollup, null, 2) + "\n", "utf-8");

  console.log(
    `[holder-libraries] ${stats.total} holders -> ${leaves.length} (type,brand) leaf CSVs under ${TB_DIR}`,
  );
}

// Run only when invoked directly (not when imported by the test).
const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
