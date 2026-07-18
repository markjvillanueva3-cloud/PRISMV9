/**
 * tool-material-categorization.ts — the canonical, CAM-AGNOSTIC material axis for the
 * tool + tool-holder databases.
 * =============================================================================
 * Operator directive (2026-06-01): romeo is building the Fusion tool-holder + tooling
 * database, broken down BY MATERIAL TYPE. This module is the single organizing layer so
 * that categorization is IDENTICAL across every CAD/CAM software (Fusion 360, Mastercam,
 * hyperMILL, NX, SolidWorks, Esprit, Inventor HSM). They all classify by ISO 513 —
 * so PRISM classifies by ISO 513, once, here.
 *
 * Why this is the right key: ISO 513 (P/M/K/N/S/H) is THE international workpiece-material
 * classification every cutting-tool vendor + CAM system maps onto. Free-text material names
 * ("1018", "AISI 1018", "carbon steel", "Steel") are unportable; the ISO group is canonical.
 *
 * Reuses the authoritative ISOGroup type + group physics from physics/constants.ts
 * (CANONICAL_KIENZLE) — this module adds NO new physics constants, only the taxonomy +
 * the free-text → group normalization + the per-tool/holder material-applicability record.
 *
 * Consumers: FusionToolLibraryEngine, CAMToolLibraryEngine, ToolHolderDatabaseEngine,
 * ToolCatalogEngine + romeo's Fusion builder. Bridge to MaterialDB (also ISO 513).
 */
import { z } from "zod";
import type { ISOGroup } from "../physics/constants.js";

/** The 6 ISO 513 main groups in canonical order. Single source for iteration/validation. */
export const ISO_513_GROUP_ORDER: readonly ISOGroup[] = ["P", "M", "K", "N", "S", "H"] as const;

/** ISO 513 group definition: standard name, color (the universal lathe/insert colour code),
 *  description, and the material SUBDIVISIONS used industry-wide (Sandvik/ISO material map).
 *  Subgroups are descriptive material classes (accurate) — NOT invented numeric codes. */
export interface ISO513GroupDef {
  group: ISOGroup;
  name: string;
  /** ISO 513 / insert colour-code convention. */
  color: string;
  description: string;
  /** Industry-standard material subdivisions within the group (the breakdown romeo categorizes by). */
  subgroups: { code: string; name: string }[];
}

export const ISO_513_GROUPS: Record<ISOGroup, ISO513GroupDef> = {
  P: {
    group: "P", name: "Steel", color: "blue",
    description: "Unalloyed, low-alloy and high-alloy steel, cast steel. The largest workpiece group.",
    subgroups: [
      { code: "P-unalloyed", name: "Unalloyed / carbon steel (e.g. 1018, 1045)" },
      { code: "P-low-alloy", name: "Low-alloy steel (e.g. 4140, 4340, 8620)" },
      { code: "P-high-alloy", name: "High-alloy / tool steel annealed (e.g. P20, A2 soft)" },
      { code: "P-cast-steel", name: "Cast steel" },
      { code: "P-free-machining", name: "Free-machining steel (e.g. 12L14, leaded)" },
    ],
  },
  M: {
    group: "M", name: "Stainless steel", color: "yellow",
    description: "Ferritic, martensitic, austenitic and duplex/precipitation-hardening stainless steels.",
    subgroups: [
      { code: "M-ferritic-martensitic", name: "Ferritic / martensitic (e.g. 410, 430)" },
      { code: "M-austenitic", name: "Austenitic (e.g. 304, 316)" },
      { code: "M-super-austenitic", name: "Super-austenitic" },
      { code: "M-duplex", name: "Duplex (e.g. 2205)" },
      { code: "M-ph", name: "Precipitation-hardening (e.g. 17-4PH, 15-5PH)" },
    ],
  },
  K: {
    group: "K", name: "Cast iron", color: "red",
    description: "Gray, nodular (ductile), malleable and compacted-graphite cast iron.",
    subgroups: [
      { code: "K-gray", name: "Gray cast iron (GG / GJL)" },
      { code: "K-nodular", name: "Nodular / ductile iron (GGG / GJS)" },
      { code: "K-malleable", name: "Malleable cast iron" },
      { code: "K-cgi", name: "Compacted-graphite iron (CGI)" },
    ],
  },
  N: {
    group: "N", name: "Non-ferrous", color: "green",
    description: "Aluminum (wrought + cast), copper, brass, bronze, magnesium, and non-metallics.",
    subgroups: [
      { code: "N-aluminum-wrought", name: "Wrought aluminum (e.g. 6061, 7075, 2024)" },
      { code: "N-aluminum-cast", name: "Cast aluminum (Si content low/high)" },
      { code: "N-copper-alloys", name: "Copper / brass / bronze" },
      { code: "N-magnesium", name: "Magnesium alloys" },
      { code: "N-non-metallic", name: "Plastics / composites / graphite" },
    ],
  },
  S: {
    group: "S", name: "Superalloys & titanium", color: "brown",
    description: "Heat-resistant super alloys (Fe/Ni/Co-based) and titanium alloys (HRSA + Ti).",
    subgroups: [
      { code: "S-ni-based", name: "Nickel-based HRSA (e.g. Inconel 718, Waspaloy)" },
      { code: "S-fe-based", name: "Iron-based HRSA" },
      { code: "S-co-based", name: "Cobalt-based HRSA (e.g. Stellite)" },
      { code: "S-titanium", name: "Titanium alloys (e.g. Ti-6Al-4V)" },
      { code: "S-refractory", name: "Refractory (tungsten, molybdenum)" },
    ],
  },
  H: {
    group: "H", name: "Hardened materials", color: "grey",
    description: "Hardened steel (≈45-65 HRC), chilled and hardened cast iron.",
    subgroups: [
      { code: "H-hardened-48-58", name: "Hardened steel 48-58 HRC" },
      { code: "H-hardened-58-65", name: "Hardened steel 58-65 HRC" },
      { code: "H-chilled-iron", name: "Chilled / hardened cast iron" },
    ],
  },
};

/**
 * Free-text material name → ISO 513 group. Ordered MOST-SPECIFIC FIRST (superalloys before
 * "steel", stainless before "steel") so a substring like "stainless steel" resolves to M, not P.
 * Reused + expanded from scripts/enrich-catalog-cutting-data.mjs MAT_ISO (single canonical copy now).
 */
export const MATERIAL_ISO_PATTERNS: { re: RegExp; group: ISOGroup }[] = [
  // S — superalloys + titanium + refractory (material identity; beats everything ferrous).
  { re: /inconel|hastelloy|waspaloy|\brene\b|superalloy|nimonic|udimet|haynes|stellite|monel/i, group: "S" },
  { re: /titanium|\bti-?6|ti6al|\bti\b/i, group: "S" },
  { re: /tungsten|molybdenum|tantalum|niobium|refractory/i, group: "S" },
  // H — hardness CONDITION overrides base ferrous material (ISO 513). Requires an EXPLICIT
  // hardness cue (hardened/chilled/HRC/≥45) — OR a tool-steel grade WITH a hardness qualifier.
  // A BARE grade name (D2/A2/H13/M2 — an annealed blank machined before heat-treat) deliberately
  // falls through to P (matches the P-high-alloy "A2 soft" subgroup; reconciles the two surfaces).
  { re: /hardened|chilled|\bhrc\b|\d\d\s*hrc|\b5210[0-9]\b|tool.?steel.*hard|hard.*tool.?steel|>\s*4[5-9]|>\s*[56]\d/i, group: "H" },
  { re: /(\bd2\b|\ba2\b|\bh13\b|\bm2\b|\bo1\b|\bs7\b|\ba6\b)[\s\S]{0,24}(hard|hrc)|(hard|hrc)[\s\S]{0,24}(\bd2\b|\ba2\b|\bh13\b|\bm2\b|\bo1\b|\bs7\b|\ba6\b)/i, group: "H" },
  // M — stainless by KEYWORD (high priority).
  { re: /stainless|17-?4|15-?5|\bss\b|duplex|austenit|ferritic|martensit|\b2205\b|\bph\b|nitronic|\ba286\b/i, group: "M" },
  // N — non-ferrous by KEYWORD, checked BEFORE the bare-number stainless fallback so that
  // "356 aluminum" / "360 brass" / "319 aluminum" resolve to N, not M (the \b3\d\d\b P0).
  { re: /alum(in(ium|um)|)|\b6061\b|\b7075\b|\b2024\b|\b5052\b|\ba?356\b|\ba?380\b|\ba?319\b|\balu\b|\bal\b/i, group: "N" },
  { re: /brass|bronze|copper|\bcu\b|magnesium|\bmg\b|\baz31\b|plastic|composite|delrin|graphite|nylon|peek|\bg10\b|\bfr4\b/i, group: "N" },
  // K — cast iron (incl. GG/GGG German grades with attached or dash-separated digits: GG25, GGG-50).
  { re: /cast.?iron|gray.?iron|grey.?iron|ductile|nodular|malleable|\bcgi\b|\bggg?-?\d|\bgg\b|\bgjl\b|\bgjs\b/i, group: "K" },
  // M-NUMERIC — bare common stainless designations (LOW priority: only when no non-ferrous
  // keyword matched). Explicit 3xx austenitic + 4xx martensitic/ferritic series (not a blanket
  // \b3\d\d\b — that swallowed 356/380 aluminum + 360/377 brass).
  { re: /\b30[1-9]\b|\b31[0-9]l?\b|\b32[01]\b|\b347\b|\b4(10|16|20|30|40)[a-c]?\b/i, group: "M" },
  // P — steel (broadest; checked LAST). Includes annealed tool-steel grades by name.
  { re: /steel|carbon|alloy.?steel|\b41\d0\b|\b43\d0\b|\b10\d5\b|\b10\d8\b|\b86\d0\b|\bp20\b|mild|\b12l14\b|\b121[45]\b|\bd2\b|\ba2\b|\bh13\b|\bm2\b|\bo1\b|\bs7\b|\ba6\b|maraging/i, group: "P" },
];

/** Normalize one free-text material name to its ISO 513 group. Returns null when unknown
 *  (loud — caller must decide; never silently coerce to P). */
export function normalizeMaterialToISO(text: string): { group: ISOGroup; matched: string } | null {
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (!t) return null;
  for (const { re, group } of MATERIAL_ISO_PATTERNS) {
    const m = t.match(re);
    if (m) return { group, matched: m[0] };
  }
  return null;
}

/** Normalize a list of free-text materials to the DISTINCT set of ISO groups (canonical order).
 *  Unmatched names are returned separately so the caller can surface them (R12 — no silent drop). */
export function normalizeMaterialsToISOGroups(materials: string[]): { groups: ISOGroup[]; unmatched: string[] } {
  const set = new Set<ISOGroup>();
  const unmatched: string[] = [];
  for (const m of materials || []) {
    const r = normalizeMaterialToISO(m);
    if (r) set.add(r.group);
    else if (typeof m === "string" && m.trim()) unmatched.push(m.trim());
  }
  return { groups: ISO_513_GROUP_ORDER.filter((g) => set.has(g)), unmatched };
}

/** Canonical per-tool / per-holder MATERIAL-APPLICABILITY record — the cross-CAM material axis.
 *  Attach this to every tool/holder so any CAM system can filter "tools for this workpiece material". */
export const ToolMaterialCategorySchema = z.object({
  /** ISO 513 groups this tool/holder is rated to cut (≥1). The portable key. */
  isoGroups: z.array(z.enum(["P", "M", "K", "N", "S", "H"])).min(1),
  /** The primary / best-fit group (for default sorting + single-group catalogs). */
  primaryGroup: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  /** Optional finer material subgroup codes (see ISO_513_GROUPS[g].subgroups). */
  subgroups: z.array(z.string()).optional(),
  /** Optional workpiece-hardness window (HRC) the tool is rated for. */
  hardnessHRC: z.object({ min: z.number(), max: z.number() }).optional(),
  /** Free-text source material names this categorization was derived from (provenance). */
  sourceMaterials: z.array(z.string()).optional(),
  /** Material names that could not be mapped to an ISO group (surfaced, not dropped). */
  unmatchedMaterials: z.array(z.string()).optional(),
});

export type ToolMaterialCategory = z.infer<typeof ToolMaterialCategorySchema>;

/** Build the canonical material-category record for a tool/holder from its free-text material list.
 *  primaryGroup = the first group in canonical order (override explicitly if a tool is optimized
 *  for a non-first group). Throws via schema only on an empty result — callers should pre-check. */
export function categorizeToolMaterials(materials: string[], opts?: { primaryGroup?: ISOGroup }): ToolMaterialCategory | null {
  const { groups, unmatched } = normalizeMaterialsToISOGroups(materials);
  if (groups.length === 0) return null; // unknown → caller decides (do NOT fabricate a group)
  return ToolMaterialCategorySchema.parse({
    isoGroups: groups,
    primaryGroup: opts?.primaryGroup && groups.includes(opts.primaryGroup) ? opts.primaryGroup : groups[0],
    sourceMaterials: (materials || []).filter((m) => typeof m === "string" && m.trim()),
    unmatchedMaterials: unmatched.length ? unmatched : undefined,
  });
}
