/**
 * generate-sfc-extended-material-db.ts
 * -------------------------------------------------------------------------
 * Option C: bridge the async MaterialRegistry (6,000+ materials) into the
 * SYNCHRONOUS SFC physics path (constants.ts resolveMaterial / _resolveISO).
 *
 * The SFC per-cut path (ProductEngine.productSFC, UltimateSpeedFeedEngine,
 * constants.ts) is fully synchronous and resolves materials only from the
 * 16-entry CANONICAL_MATERIAL_DB. Any material outside those 16 + the keyword
 * map silently defaults to ISO "P" steel (kc1.1=1800) -- e.g. "17-4PH" (a
 * precipitation-hardening stainless, really ISO M, kc1.1=2100) was being
 * priced as plain carbon steel. That is a real silent-wrong fallback reaching
 * customer speed/feed recommendations.
 *
 * This generator flattens every MaterialRegistry entry into a sync,
 * committed-and-reviewable `EXTENDED_RAW_MATERIAL_DB` (pure data, ZERO imports
 * so constants.ts can import it without a circular dependency). constants.ts
 * then builds EXTENDED_MATERIAL_DB from it via the SAME buildMaterialPhysics()
 * pipeline as CANONICAL_MATERIAL_DB -- so kc1.1/mc derivation stays
 * single-sourced (canonical per-ISO + any AISI override), NOT inlined.
 *
 * Why generate, not live-load: keeps the per-cut path sync (no async refactor /
 * no blast radius), makes the consolidated physics auditable + physics-
 * reviewable + committed, and preserves the curated 16-entry core as the
 * authoritative layer (the EXTENDED layer is consulted AFTER canonical, only
 * for materials that would otherwise default to P).
 *
 * Run:
 *   cd H:/prism/mcp-server
 *   node_modules/.bin/tsx scripts/generate-sfc-extended-material-db.ts            # writes the .ts
 *   node_modules/.bin/tsx scripts/generate-sfc-extended-material-db.ts --dry-run  # stats only, no write
 *
 * Regen cadence: rebuild whenever MaterialRegistry data changes; commit the
 * generated artifact so the SFC stays sync + reviewable.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { MaterialRegistry } from "../src/registries/MaterialRegistry.js";
import {
  buildMaterialPhysics,
  CANONICAL_MATERIAL_DB,
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../src/physics/constants.js";
import type { Material, MaterialStrengthRange } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "src", "physics", "material-db-extended.generated.ts");

const ISO_SET = new Set<ISOGroup>(["P", "M", "K", "N", "S", "H"]);

/**
 * Canonical kc1.1 sanity bounds per ISO group [N/mm^2] (physics/CLAUDE.md +
 * MATERIAL_REGISTRY_AUDIT). Any derived kc1.1 outside its group band is dropped
 * (R12 -- never ship an out-of-range cutting coefficient).
 */
const KC_BOUNDS: Record<ISOGroup, [number, number]> = {
  P: [1400, 2200],
  M: [1800, 2800],
  K: [800, 1400],
  N: [500, 1200],
  S: [2200, 3500],
  H: [2800, 4500],
};

/**
 * Taylor C sanity band per ISO group: a registry taylor_C outside ~[0.5x, 1.6x]
 * the canonical per-ISO C is dropped so buildMaterialPhysics falls back to the
 * canonical value. Unlike kc1.1 (force-conservative when high), an over-large
 * taylor_C OVER-predicts tool life -- the UNSAFE direction -- and the registry
 * C/n are otherwise unguarded. Bounds derive from CANONICAL_TAYLOR (sourced, not
 * inlined). (physics-reviewer P1-2, 2026-06-30.)
 */
function taylorCInBand(iso: ISOGroup, C: number): boolean {
  const base = CANONICAL_TAYLOR[iso].C;
  return C >= 0.5 * base && C <= 1.6 * base;
}

interface ExtendedRawEntry {
  name: string;
  iso_group: ISOGroup;
  density_kg_m3: number;
  thermal_conductivity_W_mK: number;
  specific_heat_J_kgK?: number;
  melting_point_C?: number;
  taylor_C?: number;
  taylor_n?: number;
  hardness_HRC?: number;
  hardness_HB?: number;
  tensile_strength_MPa?: number;
  aisiKey?: string;
}

/** Coerce a strength field (number | {typical,min,max}) to MPa or undefined. */
function toStrengthMPa(v: number | MaterialStrengthRange | undefined): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : undefined;
  const r = v as MaterialStrengthRange;
  if (typeof r.typical === "number" && r.typical > 0) return r.typical;
  if (typeof r.min === "number" && typeof r.max === "number") return (r.min + r.max) / 2;
  return undefined;
}

function finite(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * Build the exact (fully-typed) partial buildMaterialPhysics() expects from an
 * ExtendedRawEntry -- aisiKey is dropped here because it is passed as the
 * separate 3rd argument (the AISI override key), not a MaterialEntry field.
 */
function toPhysInput(e: ExtendedRawEntry): Parameters<typeof buildMaterialPhysics>[0] {
  return {
    name: e.name,
    iso_group: e.iso_group,
    density_kg_m3: e.density_kg_m3,
    thermal_conductivity_W_mK: e.thermal_conductivity_W_mK,
    specific_heat_J_kgK: e.specific_heat_J_kgK,
    melting_point_C: e.melting_point_C,
    taylor_C: e.taylor_C,
    taylor_n: e.taylor_n,
    hardness_HRC: e.hardness_HRC,
    hardness_HB: e.hardness_HB,
    tensile_strength_MPa: e.tensile_strength_MPa,
  };
}

/** Normalize a registry ISO group label to a canonical single-letter ISOGroup. */
function coerceISO(m: Material): ISOGroup | undefined {
  const raw =
    (typeof m.iso_group === "string" && m.iso_group) ||
    (m.classification && typeof m.classification.iso_group === "string" && m.classification.iso_group) ||
    "";
  const c = String(raw).trim().toUpperCase().charAt(0) as ISOGroup;
  return ISO_SET.has(c) ? c : undefined;
}

/** Lowercase + whitespace-normalize a candidate lookup key. */
function normKey(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const reg = new MaterialRegistry();
  const { materials, total } = await reg.search({ limit: 10_000_000 });
  if (!total || materials.length === 0) {
    throw new Error(
      `MaterialRegistry loaded 0 materials -- cannot generate the extended DB. ` +
        `Check PATHS.MATERIALS_DB resolves and the ISO group dirs (P_STEELS, ...) exist.`,
    );
  }

  const skips = {
    no_iso: 0,
    no_density: 0,
    no_thermal: 0,
    kc_out_of_range: 0,
    taylor_c_out_of_band: 0, // registry taylor_C dropped -> canonical per-ISO C used
    key_collision_canonical: 0,
    key_collision_kept: 0, // same-ISO collision, challenger <= incumbent kc -> incumbent kept
    key_collision_override: 0, // same-ISO collision, challenger higher kc -> replaced (conservative)
    key_dropped_ambiguous: 0, // cross-ISO-group collision -> key dropped (fail-loud)
  };
  const out: Record<string, ExtendedRawEntry> = {};
  const keyKc: Record<string, number> = {}; // winning entry's derived kc1.1 per key
  const keyIso: Record<string, ISOGroup> = {}; // winning entry's ISO group per key
  const ambiguousKeys = new Set<string>(); // keys proven cross-ISO-ambiguous (permanently dropped)

  for (const m of materials) {
    const iso = coerceISO(m);
    if (!iso) {
      skips.no_iso++;
      continue;
    }

    // density: accept kg/m^3 directly; auto-scale a g/cm^3 value (every solid
    // metal is < 30 g/cm^3 but >= 30 in kg/m^3, so the threshold is unambiguous).
    let density = finite(m.physical?.density);
    if (density !== undefined && density > 0 && density < 30) density = density * 1000;
    if (density === undefined || density <= 0) {
      skips.no_density++;
      continue;
    }

    const thermal = finite(m.thermal?.thermal_conductivity) ?? finite(m.physical?.thermal_conductivity);
    if (thermal === undefined || thermal <= 0) {
      skips.no_thermal++;
      continue;
    }

    const aisiKey =
      (m.designation && typeof m.designation.aisi_sae === "string" && m.designation.aisi_sae.trim()) || undefined;

    const tC = finite(m.taylor?.C);
    const tN = finite(m.taylor?.n);
    // Keep Taylor C/n only when BOTH positive AND C is in the canonical per-ISO band;
    // else buildMaterialPhysics falls back to CANONICAL_TAYLOR[iso] (P1-2 guard).
    const taylorOk = tC !== undefined && tC > 0 && tN !== undefined && tN > 0 && taylorCInBand(iso, tC);
    if (tC !== undefined && tC > 0 && !taylorCInBand(iso, tC)) skips.taylor_c_out_of_band++;
    const meltMin = finite(m.physical?.melting_range_min);
    const meltMax = finite(m.physical?.melting_range_max);
    const meltRaw =
      finite(m.physical?.melting_point) ??
      (meltMin !== undefined && meltMax !== undefined ? (meltMin + meltMax) / 2 : undefined);

    const entry: ExtendedRawEntry = {
      name: m.name,
      iso_group: iso,
      density_kg_m3: Math.round(density),
      thermal_conductivity_W_mK: thermal,
      specific_heat_J_kgK: finite(m.physical?.specific_heat),
      melting_point_C: meltRaw !== undefined ? Math.round(meltRaw) : undefined,
      taylor_C: taylorOk ? tC : undefined,
      taylor_n: taylorOk ? tN : undefined,
      hardness_HRC: finite(m.mechanical?.hardness?.rockwell_c),
      hardness_HB: finite(m.mechanical?.hardness?.brinell),
      tensile_strength_MPa: toStrengthMPa(m.mechanical?.tensile_strength),
      aisiKey,
    };

    // Derive kc the SAME way constants.ts will (canonical per-ISO + AISI
    // override) and drop the material if the result is out of the ISO band.
    const phys = buildMaterialPhysics(toPhysInput(entry), iso, aisiKey);
    const [lo, hi] = KC_BOUNDS[iso];
    if (!(phys.kc1_1 >= lo && phys.kc1_1 <= hi)) {
      skips.kc_out_of_range++;
      continue;
    }

    // Build candidate lookup keys: name + every designation + common names.
    const candidates = new Set<string>();
    if (m.name) candidates.add(normKey(m.name));
    if (m.designation?.aisi_sae) candidates.add(normKey(m.designation.aisi_sae));
    if (m.designation?.uns) candidates.add(normKey(m.designation.uns));
    if (m.designation?.din) candidates.add(normKey(m.designation.din));
    if (m.designation?.en) candidates.add(normKey(m.designation.en));
    if (m.designation?.jis) candidates.add(normKey(m.designation.jis));
    for (const cn of m.common_names ?? []) if (cn) candidates.add(normKey(cn));

    const challengerKc = phys.kc1_1;
    for (const key of candidates) {
      if (!key) continue;
      // Never shadow a curated canonical entry (own-property check).
      if (Object.prototype.hasOwnProperty.call(CANONICAL_MATERIAL_DB, key)) {
        skips.key_collision_canonical++;
        continue;
      }
      // A key already proven cross-ISO-ambiguous stays permanently dropped.
      if (ambiguousKeys.has(key)) {
        skips.key_dropped_ambiguous++;
        continue;
      }
      const incumbentKc = keyKc[key];
      if (incumbentKc === undefined) {
        out[key] = entry;
        keyKc[key] = challengerKc;
        keyIso[key] = iso;
        continue;
      }
      if (iso !== keyIso[key]) {
        // CROSS-ISO-GROUP collision: the SAME designation key (UNS/EN/DIN/JIS) maps to
        // materials in DIFFERENT ISO groups -- e.g. "S235JR"/"A36"/"S355J2" each collide a
        // soft P structural steel with a 45-HRC quench&temper (ISO H) row sharing the
        // designation. "Higher kc wins" would mis-pick the hardest unrelated variant ->
        // a NEW silent-wrong classification (soft structural steel priced as ISO H tool
        // steel). The key is genuinely AMBIGUOUS: DROP it (fail-loud) so the resolver
        // falls through to its keyword/default fallback (which lands these on P, correct).
        // Each variant keeps its OWN unambiguous full-name key. (physics-reviewer P0, 2026-06-30.)
        delete out[key];
        ambiguousKeys.add(key);
        skips.key_dropped_ambiguous++;
        continue;
      }
      // Same ISO group: a true temper/condition variant of one material. Keep the MORE
      // CONSERVATIVE (higher kc1.1) variant -- higher cutting force -> slower (safe) feed.
      if (challengerKc > incumbentKc) {
        out[key] = entry;
        keyKc[key] = challengerKc;
        skips.key_collision_override++;
      } else {
        skips.key_collision_kept++;
      }
    }
  }

  // Final ISO distribution + material count from the RESOLVED map (unique entries
  // after conservative collision resolution), NOT the pre-resolution running tally.
  const uniqueEntries = new Set(Object.values(out));
  const isoDist: Record<string, number> = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
  for (const e of uniqueEntries) isoDist[e.iso_group] += 1;
  const emittedMaterials = uniqueEntries.size;

  const keyCount = Object.keys(out).length;
  const stats = {
    registry_total: total,
    emitted_materials: emittedMaterials,
    emitted_keys: keyCount,
    iso_distribution: isoDist,
    skipped: skips,
  };

  // ---- validation probes (R12: prove real materials resolve correctly) ----
  const probes = ["17-4PH", "17-4 PH", "4340", "Ti-6Al-4V", "Inconel 625", "A286", "Hastelloy C-276", "Nitronic 60"];
  const probeResults: Record<string, { iso: string; kc1_1: number } | null> = {};
  for (const p of probes) {
    const hit = out[normKey(p)];
    probeResults[p] = hit
      ? { iso: hit.iso_group, kc1_1: buildMaterialPhysics(toPhysInput(hit), hit.iso_group, hit.aisiKey).kc1_1 }
      : null;
  }

  console.log(JSON.stringify({ stats, probeResults }, null, 2));

  if (dryRun) {
    console.log("\n[dry-run] no file written.");
    return;
  }

  // ---- emit the generated .ts (pure data, zero imports) ----
  const header = `/**
 * material-db-extended.generated.ts -- AUTO-GENERATED. DO NOT EDIT BY HAND.
 *
 * Source: MaterialRegistry (${total} materials) flattened for the SYNCHRONOUS
 * SFC physics path. Consumed by constants.ts (EXTENDED_MATERIAL_DB) AFTER the
 * 16-entry curated CANONICAL_MATERIAL_DB and BEFORE the ISO keyword/default
 * fallback. kc1.1/mc are NOT stored here -- they are derived in constants.ts
 * via buildMaterialPhysics() (canonical per-ISO + AISI override), single-sourced.
 *
 * Regenerate: cd mcp-server && node_modules/.bin/tsx scripts/generate-sfc-extended-material-db.ts
 * Emitted: ${emittedMaterials} materials / ${keyCount} lookup keys.
 * ISO distribution: ${JSON.stringify(isoDist)}
 */

/* eslint-disable -- AUTO-GENERATED data file; do not lint hand-style rules over generated rows. */
export interface ExtendedRawMaterialEntry {
  name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  density_kg_m3: number;
  thermal_conductivity_W_mK: number;
  specific_heat_J_kgK?: number;
  melting_point_C?: number;
  taylor_C?: number;
  taylor_n?: number;
  hardness_HRC?: number;
  hardness_HB?: number;
  tensile_strength_MPa?: number;
  /** AISI short-code (e.g. "4340") passed to buildMaterialPhysics for per-material kc1.1 override. */
  aisiKey?: string;
}

export const EXTENDED_RAW_MATERIAL_DB: Record<string, ExtendedRawMaterialEntry> = {
`;

  // Stable key order for a clean, review-friendly, deterministic diff.
  const lines: string[] = [];
  for (const key of Object.keys(out).sort()) {
    const e = out[key];
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(e)) if (v !== undefined) clean[k] = v;
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(clean)},`);
  }
  const body = lines.join("\n");
  const footer = `\n};\n\nexport const EXTENDED_MATERIAL_DB_KEY_COUNT = ${keyCount};\n`;

  fs.writeFileSync(OUT_PATH, header + body + footer, "utf8");
  console.log(`\n[written] ${OUT_PATH} (${keyCount} keys, ${emittedMaterials} materials).`);
}

main().catch((err) => {
  console.error("generate-sfc-extended-material-db FAILED:", err);
  process.exit(1);
});
