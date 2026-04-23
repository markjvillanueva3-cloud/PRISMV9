/**
 * Multi-Manufacturer Cutting Tool Grade Catalog
 * Sources: ISCAR, Korloy, Mitsubishi catalogs (C:/PRISM/CATALOGS/)
 * Extracted: 2026-03-06
 *
 * Grade-to-ISO material suitability mapping for non-Tungaloy manufacturers.
 * Enables ToolCatalogEngine to recommend inserts across multiple brands.
 */

export type IsoGroup = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
export type Suitability = 'first_choice' | 'second_choice' | 'usable' | 'not_recommended';

export interface ManufacturerGrade {
  code: string;
  manufacturer: string;
  substrate: 'carbide' | 'cermet' | 'cbn' | 'pcd' | 'ceramic';
  coating: 'CVD' | 'PVD' | 'uncoated';
  description: string;
  application: string;
  iso_suitability: Record<IsoGroup, Suitability>;
}

// ── ISCAR Grades (IC-series) ────────────────────────────────────────
// Source: ISCAR PART 1 (538pp) — IC = ISCAR Carbide
export const ISCAR_GRADES: ManufacturerGrade[] = [
  // Steel turning (P)
  { code: 'IC8150', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'CVD',
    description: 'SUMO TEC CVD for steel turning. First choice continuous.',
    application: 'turning_steel',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'IC8250', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'CVD',
    description: 'SUMO TEC CVD tough grade for steel. Interrupted cuts.',
    application: 'turning_steel_interrupted',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // Stainless (M)
  { code: 'IC6015', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for stainless steel turning. High adhesion resistance.',
    application: 'turning_stainless',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'second_choice', H: 'not_recommended' } },
  // Cast iron (K)
  { code: 'IC5005', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for cast iron high-speed turning.',
    application: 'turning_cast_iron',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // Milling grades
  { code: 'IC908', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'PVD',
    description: 'PVD grade for milling steel and stainless. High toughness.',
    application: 'milling_general',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'usable', N: 'not_recommended', S: 'second_choice', H: 'not_recommended' } },
  { code: 'IC928', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for milling superalloys and stainless.',
    application: 'milling_superalloy',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' } },
  { code: 'IC528', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for milling non-ferrous. Sharp edge.',
    application: 'milling_non_ferrous',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'IC903', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for milling cast iron.',
    application: 'milling_cast_iron',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'IC608', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for milling steel/cast iron at high speeds.',
    application: 'milling_high_speed',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // Solid carbide endmill grades
  { code: 'IC900', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'PVD',
    description: 'Micro-grain carbide for solid end mills. General purpose.',
    application: 'endmill_general',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'second_choice', N: 'usable', S: 'second_choice', H: 'not_recommended' } },
  { code: 'IC902', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'PVD',
    description: 'Fine-grain for finishing end mills.',
    application: 'endmill_finishing',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'second_choice', N: 'usable', S: 'usable', H: 'not_recommended' } },
  { code: 'IC1508', manufacturer: 'ISCAR', substrate: 'carbide', coating: 'uncoated',
    description: 'Uncoated ultra-fine grain for aluminum end mills.',
    application: 'endmill_aluminum',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' } },
  // CBN
  { code: 'IB50', manufacturer: 'ISCAR', substrate: 'cbn', coating: 'uncoated',
    description: 'CBN for continuous hardened steel turning.',
    application: 'turning_hardened',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' } },
  { code: 'IB55', manufacturer: 'ISCAR', substrate: 'cbn', coating: 'uncoated',
    description: 'CBN for interrupted hardened steel.',
    application: 'turning_hardened_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'second_choice', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' } },
  // PCD
  { code: 'ID5', manufacturer: 'ISCAR', substrate: 'pcd', coating: 'uncoated',
    description: 'PCD for non-ferrous and composites.',
    application: 'turning_non_ferrous_pcd',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' } },
];

// ── Korloy Grades (NC/CC/PC-series) ────────────────────────────────
// Source: korloy turning.pdf (466pp)
export const KORLOY_GRADES: ManufacturerGrade[] = [
  // Steel (P) — NC3xxx series
  { code: 'NC3120', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD finishing grade for steel. High speed continuous.',
    application: 'turning_steel_finishing',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'NC3200', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD general purpose steel turning.',
    application: 'turning_steel_general',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'NC3225', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD medium-duty steel turning. Light interrupts.',
    application: 'turning_steel_medium',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'NC3030', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD tough grade for steel heavy interrupted.',
    application: 'turning_steel_interrupted',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // Stainless (M)
  { code: 'NC3205', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for stainless steel continuous turning.',
    application: 'turning_stainless',
    iso_suitability: { P: 'second_choice', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'usable', H: 'not_recommended' } },
  { code: 'NC3215', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for stainless interrupted cutting.',
    application: 'turning_stainless_interrupted',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'second_choice', H: 'not_recommended' } },
  // Cast iron (K)
  { code: 'NC3005', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for cast iron high-speed turning.',
    application: 'turning_cast_iron',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // PVD versatile
  { code: 'PC5300', manufacturer: 'Korloy', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for general purpose turning. Good toughness.',
    application: 'turning_general_pvd',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'second_choice', N: 'usable', S: 'second_choice', H: 'not_recommended' } },
  { code: 'PC9030', manufacturer: 'Korloy', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for superalloy turning.',
    application: 'turning_superalloy',
    iso_suitability: { P: 'not_recommended', M: 'second_choice', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' } },
  // Cermet
  { code: 'CN1500', manufacturer: 'Korloy', substrate: 'cermet', coating: 'PVD',
    description: 'Cermet for steel/stainless finishing.',
    application: 'turning_finish_cermet',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'CN2500', manufacturer: 'Korloy', substrate: 'cermet', coating: 'PVD',
    description: 'Cermet for medium cutting.',
    application: 'turning_medium_cermet',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // CBN
  { code: 'DB1000', manufacturer: 'Korloy', substrate: 'cbn', coating: 'uncoated',
    description: 'CBN for hardened steel continuous turning.',
    application: 'turning_hardened',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' } },
  { code: 'DB2000', manufacturer: 'Korloy', substrate: 'cbn', coating: 'uncoated',
    description: 'CBN for hardened steel light interrupted.',
    application: 'turning_hardened_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'second_choice', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' } },
  { code: 'DB7000', manufacturer: 'Korloy', substrate: 'cbn', coating: 'uncoated',
    description: 'CBN for cast iron high-speed.',
    application: 'turning_cast_iron_cbn',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'second_choice' } },
  // Milling grades
  { code: 'CC1015', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for milling steel.',
    application: 'milling_steel',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'CC1025', manufacturer: 'Korloy', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for milling steel/stainless. Tough.',
    application: 'milling_general',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'usable', N: 'not_recommended', S: 'usable', H: 'not_recommended' } },
  { code: 'DP150', manufacturer: 'Korloy', substrate: 'pcd', coating: 'uncoated',
    description: 'PCD for non-ferrous turning.',
    application: 'turning_non_ferrous',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'DP200', manufacturer: 'Korloy', substrate: 'pcd', coating: 'uncoated',
    description: 'PCD tough for abrasive non-ferrous.',
    application: 'turning_non_ferrous_abrasive',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' } },
];

// ── Mitsubishi Materials Grades (MC/UC/MP-series) ───────────────────
// Source: catalog_c010b_full.pdf (1802pp)
export const MITSUBISHI_GRADES: ManufacturerGrade[] = [
  // Steel (P) — MC7xxx series
  { code: 'MC7015', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for steel finishing. Miracle coating.',
    application: 'turning_steel_finishing',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'MC7025', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD general purpose steel turning. Best seller.',
    application: 'turning_steel_general',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // Stainless (M) — MC6xxx
  { code: 'MC6015', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for stainless steel continuous.',
    application: 'turning_stainless_continuous',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'usable', H: 'not_recommended' } },
  { code: 'MC6025', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for stainless general purpose.',
    application: 'turning_stainless_general',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'second_choice', H: 'not_recommended' } },
  { code: 'MC6035', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD tough for stainless interrupted.',
    application: 'turning_stainless_interrupted',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'usable', N: 'not_recommended', S: 'second_choice', H: 'not_recommended' } },
  // Cast iron (K) — MC5xxx
  { code: 'MC5005', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for cast iron high-speed finishing.',
    application: 'turning_cast_iron_finishing',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'MC5015', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for cast iron general purpose.',
    application: 'turning_cast_iron_general',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'MC5100', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'CVD',
    description: 'CVD for cast iron medium/interrupted.',
    application: 'turning_cast_iron_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // Superalloy (S)
  { code: 'MC6100', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for heat-resistant alloys.',
    application: 'turning_superalloy',
    iso_suitability: { P: 'not_recommended', M: 'second_choice', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' } },
  { code: 'MC6115', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'PVD',
    description: 'PVD tough for superalloy interrupted.',
    application: 'turning_superalloy_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' } },
  { code: 'MC6125', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for superalloy heavy interrupted.',
    application: 'turning_superalloy_heavy',
    iso_suitability: { P: 'not_recommended', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' } },
  // Cermet — MP series
  { code: 'MP3025', manufacturer: 'Mitsubishi', substrate: 'cermet', coating: 'PVD',
    description: 'Cermet for steel/stainless finishing.',
    application: 'turning_finish_cermet',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  { code: 'MP7035', manufacturer: 'Mitsubishi', substrate: 'cermet', coating: 'CVD',
    description: 'CVD-coated cermet for steel.',
    application: 'turning_steel_cermet',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' } },
  // CBN — MB series
  { code: 'MB710', manufacturer: 'Mitsubishi', substrate: 'cbn', coating: 'uncoated',
    description: 'CBN for hardened steel continuous.',
    application: 'turning_hardened',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' } },
  { code: 'MB730', manufacturer: 'Mitsubishi', substrate: 'cbn', coating: 'uncoated',
    description: 'CBN for hardened steel interrupted.',
    application: 'turning_hardened_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'second_choice', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' } },
  { code: 'MB8025', manufacturer: 'Mitsubishi', substrate: 'cbn', coating: 'PVD',
    description: 'Coated CBN for hardened steel high-speed.',
    application: 'turning_hardened_coated',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' } },
  // Milling — MP71xx
  { code: 'MP7130', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'PVD',
    description: 'PVD for milling steel/stainless.',
    application: 'milling_general',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'usable', N: 'not_recommended', S: 'second_choice', H: 'not_recommended' } },
  { code: 'MP7140', manufacturer: 'Mitsubishi', substrate: 'carbide', coating: 'PVD',
    description: 'PVD tough for milling interrupted.',
    application: 'milling_interrupted',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'second_choice', N: 'not_recommended', S: 'usable', H: 'not_recommended' } },
];

// ── All grades combined ─────────────────────────────────────────────
export const ALL_MANUFACTURER_GRADES: ManufacturerGrade[] = [
  ...ISCAR_GRADES,
  ...KORLOY_GRADES,
  ...MITSUBISHI_GRADES,
];

export const MULTI_MANUFACTURER_SUMMARY = {
  manufacturers: ['ISCAR', 'Korloy', 'Mitsubishi'] as const,
  iscar_grades: ISCAR_GRADES.length,
  korloy_grades: KORLOY_GRADES.length,
  mitsubishi_grades: MITSUBISHI_GRADES.length,
  total_grades: ALL_MANUFACTURER_GRADES.length,
};
