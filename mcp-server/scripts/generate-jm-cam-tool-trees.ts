/**
 * generate-jm-cam-tool-trees.ts
 * [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-TREES (slot:romeo) -- R15 step 2 of #23.
 *
 * Replicates the Fusion material->type->brand TOOLING tree (generate-jm-fusion-tool-libraries.ts)
 * to the other two tier-1 CAM apps, using the per-leaf subset entrypoints shipped in step 1:
 *   - hyperMILL: hyperMillToolExportEngine.exportToHMT(leafTools, opts) -> one .hmt per (type,brand)
 *   - Mastercam: mastercamToolExportEngine.exportFromTools(leafTools, stem, "mcam-tools", [iso])
 *                -> one .mcam-tools per (ISO, type, brand)
 *
 * PER-APP ORGANIZATION (resolved design decision, see task #23 / commit body):
 *   - Mastercam .mcam-tools = ISO -> TYPE -> BRAND. Each leaf carries that ISO's material-specific
 *     SFM (materials=[iso]) -- mirrors the Fusion CSV tree, honoring the operator's "by material
 *     type, then type, then brand" top axis.
 *   - hyperMILL .hmt = TYPE -> BRAND only. The .hmt Materials table already encodes all 6 ISO
 *     milling_factor_vc/fz PLUS the per-tool max_spindle_speed/max_feedrate ceiling
 *     (U-HMT-CUTTING-DATA), so a per-ISO .hmt would be redundant -- one .hmt per (type,brand)
 *     carries all-material scaling natively.
 *
 * Source: toolCatalogEngine (the PRISM tooling DATABASE -- SGS/BIG DAISHOWA/Orange Vise/ToolRegistry),
 * BOUNDED for a manageable artifact (caps logged, never silently truncated -- R12).
 *
 * Pure core (buildToolLeaves) is I/O-free -> unit-testable against the live catalog.
 * Run: cd mcp-server && npx tsx scripts/generate-jm-cam-tool-trees.ts
 *
 * @module scripts/generate-jm-cam-tool-trees
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";
import { mastercamToolExportEngine } from "../src/engines/MastercamToolExportEngine.js";
import { hyperMillToolExportEngine } from "../src/engines/HyperMillToolExportEngine.js";
import { injectiveSlugs } from "./lib/tool-library-partition.js";

const OUT_DIR = "H:/prism/state/shared/jm-cam-tool-trees";
const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;
type Iso = (typeof ISO_GROUPS)[number];

/** Source bound: partition the FULL tooling catalog so EVERY (type,brand) combo gets a leaf
 *  (a smaller cap samples a non-diverse slice -- the first 1200 were Tungaloy/Standard only). */
const MAX_TOOLS = 50_000;
/** Per-(type,brand)-leaf tool cap. Default is effectively unbounded so the FULL tooling database
 *  is materialized ("all tooling databases added" -- operator directive); any trim is reported in
 *  INDEX.md (never a silent drop -- R12). The bulk .hmt/.mcam-tools are gitignored (regenerable);
 *  only the generator + INDEX + manifest are committed. Lower this for a smaller sampled tree. */
const MAX_PER_LEAF = 100_000;

/** Tool type for the directory level (defensive across catalog object shapes). */
function toolTypeOf(t: any): string {
  return String(t?.type ?? t?.tool_type ?? "").trim() || "(unknown type)";
}
/** Brand for the file level; a blank vendor is filed under (unspecified), never dropped. */
function brandOf(t: any): string {
  return String(t?.manufacturer ?? t?.brand ?? t?.vendor ?? "").trim() || "(unspecified)";
}

/** One (type,brand) leaf with injective filesystem slugs + the tools it holds. */
export interface ToolLeaf {
  rawType: string;
  rawBrand: string;
  typeSlug: string;
  brandSlug: string;
  tools: any[];
}

/**
 * Partition tools into (type,brand) leaves with INJECTIVE per-parent slugs so two distinct
 * raw types/brands that slug the same are never merged onto one path. Deterministic (sorted),
 * every tool lands in exactly one leaf. Per-leaf tool list capped at MAX_PER_LEAF (the surplus
 * is reported in `droppedByLeaf` so truncation is never silent -- R12).
 *
 * @returns { leaves, droppedByLeaf } -- leaves in stable (type,brand) order
 */
export function buildToolLeaves(
  tools: any[],
  maxPerLeaf = MAX_PER_LEAF,
): { leaves: ToolLeaf[]; droppedByLeaf: Record<string, number> } {
  // Nest by RAW type -> RAW brand (keys are raw strings, never slugs -> no silent merge).
  const tree: Record<string, Record<string, any[]>> = {};
  for (const t of tools ?? []) {
    const rt = toolTypeOf(t);
    const rb = brandOf(t);
    (((tree[rt] ??= {})[rb] ??= []).push(t));
  }
  const leaves: ToolLeaf[] = [];
  const droppedByLeaf: Record<string, number> = {};
  const types = Object.keys(tree).sort();
  const typeSlugMap = injectiveSlugs(types, "unknown-type");
  for (const rawType of types) {
    const brands = Object.keys(tree[rawType]).sort();
    const brandSlugMap = injectiveSlugs(brands, "unspecified");
    for (const rawBrand of brands) {
      const full = tree[rawType][rawBrand];
      const kept = full.slice(0, maxPerLeaf);
      if (full.length > kept.length) {
        droppedByLeaf[`${typeSlugMap.get(rawType)}/${brandSlugMap.get(rawBrand)}`] = full.length - kept.length;
      }
      leaves.push({
        rawType,
        rawBrand,
        typeSlug: typeSlugMap.get(rawType)!,
        brandSlug: brandSlugMap.get(rawBrand)!,
        tools: kept,
      });
    }
  }
  return { leaves, droppedByLeaf };
}

function main(): void {
  catalogCorpusLoaderEngine.ensureLoaded();
  const all = toolCatalogEngine.search({ max_results: MAX_TOOLS }) || [];
  const sourceTotal = (toolCatalogEngine.search({ max_results: 200_000 }) || []).length;
  const { leaves, droppedByLeaf } = buildToolLeaves(all);

  const mcamDir = join(OUT_DIR, "mastercam", "by-type-brand");
  const hmDir = join(OUT_DIR, "hypermill", "by-type-brand");
  mkdirSync(mcamDir, { recursive: true });
  mkdirSync(hmDir, { recursive: true });

  // ── hyperMILL: TYPE -> BRAND (one .hmt per leaf; Materials table carries all-ISO scaling) ──
  let hmFiles = 0;
  let hmTools = 0;
  for (const leaf of leaves) {
    const dir = join(hmDir, leaf.typeSlug);
    mkdirSync(dir, { recursive: true });
    const res = hyperMillToolExportEngine.exportToHMT(leaf.tools, {});
    const content = `${res.sqlite_schema}\n${res.insert_statements.join("\n")}\n`;
    writeFileSync(join(dir, `${leaf.brandSlug}.hmt`), content, "utf-8");
    hmFiles++;
    hmTools += leaf.tools.length;
  }

  // ── Mastercam: ISO -> TYPE -> BRAND (one .mcam-tools per (iso,leaf), material-specific SFM) ──
  let mcamFiles = 0;
  for (const iso of ISO_GROUPS) {
    for (const leaf of leaves) {
      const dir = join(mcamDir, iso, leaf.typeSlug);
      mkdirSync(dir, { recursive: true });
      const stem = `${iso}_${leaf.typeSlug}_${leaf.brandSlug}`;
      const res = mastercamToolExportEngine.exportFromTools(leaf.tools, stem, "mcam-tools", [iso as Iso]);
      writeFileSync(join(dir, `${leaf.brandSlug}.mcam-tools`), res.library_data, "utf-8");
      mcamFiles++;
    }
  }

  // Fail-loud (R12): every partitioned tool must land in exactly one hyperMILL leaf.
  const partitionedTotal = leaves.reduce((n, l) => n + l.tools.length, 0);
  if (hmTools !== partitionedTotal) {
    throw new Error(
      `hyperMILL leaf tool-count mismatch: emitted ${hmTools} but partitioned ${partitionedTotal} -- a leaf was dropped`,
    );
  }
  const expectedMcam = ISO_GROUPS.length * leaves.length;
  if (mcamFiles !== expectedMcam) {
    throw new Error(`Mastercam file-count mismatch: wrote ${mcamFiles}, expected ${expectedMcam} (6 ISO x ${leaves.length} leaves)`);
  }

  const droppedTotal = Object.values(droppedByLeaf).reduce((a, b) => a + b, 0);
  const index: string[] = [
    "# JM CAM Tool Trees -- material->type->brand for Mastercam + hyperMILL",
    "",
    `> R15 replication of the Fusion tooling tree to the other tier-1 CAM apps. Source: the PRISM`,
    `> tooling database (toolCatalogEngine), bounded to ${all.length} of ${sourceTotal} catalog tools`,
    `> (cap MAX_TOOLS=${MAX_TOOLS}); ${droppedTotal} tool(s) trimmed by the per-leaf cap MAX_PER_LEAF=${MAX_PER_LEAF}.`,
    "",
    "## Organization (per-app, by FORMAT-native material handling)",
    "- **Mastercam** `mastercam/by-type-brand/<ISO>/<type>/<brand>.mcam-tools` -- ISO->TYPE->BRAND;",
    "  each leaf carries that ISO's material-specific SFM (mirrors the Fusion CSV tree).",
    "- **hyperMILL** `hypermill/by-type-brand/<type>/<brand>.hmt` -- TYPE->BRAND; the .hmt Materials",
    "  table already encodes all 6 ISO factors + the per-tool spindle/feed ceiling, so per-ISO is redundant.",
    "",
    `## Leaves: ${leaves.length} (type,brand) -> ${hmFiles} .hmt + ${mcamFiles} .mcam-tools`,
    "",
    "| Type | Brand | Tools | hyperMILL | Mastercam (x6 ISO) |",
    "|------|-------|------:|-----------|--------------------|",
  ];
  for (const leaf of leaves) {
    index.push(
      `| ${leaf.rawType} | ${leaf.rawBrand} | ${leaf.tools.length} | hypermill/by-type-brand/${leaf.typeSlug}/${leaf.brandSlug}.hmt | mastercam/by-type-brand/<ISO>/${leaf.typeSlug}/${leaf.brandSlug}.mcam-tools |`,
    );
  }
  if (droppedTotal > 0) {
    index.push("", "### Per-leaf cap trims (MAX_PER_LEAF)", "");
    for (const [path, n] of Object.entries(droppedByLeaf).sort()) {
      index.push(`- ${path}: ${n} tool(s) over the ${MAX_PER_LEAF} cap (not in the leaf file)`);
    }
  }
  writeFileSync(join(OUT_DIR, "INDEX.md"), index.join("\n") + "\n", "utf-8");

  const rollup = {
    schemaVersion: "1.0.0",
    generatedBy: "generate-jm-cam-tool-trees.ts (CATALOG-APP-WIRING-MS0/U-CAM-TOOL-TREES)",
    sourceTotal,
    partitioned: all.length,
    cap: { MAX_TOOLS, MAX_PER_LEAF, droppedByLeaf, droppedTotal },
    leafCount: leaves.length,
    hyperMillFiles: hmFiles,
    mastercamFiles: mcamFiles,
    leaves: leaves.map((l) => ({ type: l.rawType, brand: l.rawBrand, tools: l.tools.length, typeSlug: l.typeSlug, brandSlug: l.brandSlug })),
  };
  writeFileSync(join(OUT_DIR, "cam-tool-trees.json"), JSON.stringify(rollup, null, 2) + "\n", "utf-8");

  console.log(
    `[cam-tool-trees] ${all.length}/${sourceTotal} tools -> ${leaves.length} (type,brand) leaves -> ` +
    `${hmFiles} hyperMILL .hmt + ${mcamFiles} Mastercam .mcam-tools (${droppedTotal} trimmed by per-leaf cap)`,
  );
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
