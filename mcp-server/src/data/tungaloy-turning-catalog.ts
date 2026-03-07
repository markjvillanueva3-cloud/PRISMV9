/**
 * Tungaloy Turning & Grooving Catalog Data
 * Source: GC_2023-2024 US Turning-Grooving (1036pp)
 * Extracted: 2026-03-06
 *
 * 23 insert shapes, 14 chipbreakers, 64 grades
 * Grade-to-ISO material mapping with suitability ratings
 */

// ── ISO Insert Shape Codes ──────────────────────────────────────────
export interface TungaloyInsertShape {
  code: string;           // 4-char ISO code (e.g., CNMG)
  shape: string;          // Human name
  included_angle_deg: number;
  inscribed_circle_mm: number[];  // Available IC sizes
  clearance_angle: string;        // N=0°, G=positive, A=3°, etc.
  fixing: string;                 // M=with hole, A=without hole
}

export const TUNGALOY_INSERT_SHAPES: TungaloyInsertShape[] = [
  // Negative inserts (clearance angle 0°)
  { code: 'CNMG', shape: 'Diamond 80°', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'M(hole)+G(chipbreaker)' },
  { code: 'CNMA', shape: 'Diamond 80°', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'M(hole)+A(plain)' },
  { code: 'DNMG', shape: 'Diamond 55°', included_angle_deg: 55, inscribed_circle_mm: [9.525, 12.7, 15.875], clearance_angle: 'N(0°)', fixing: 'M(hole)+G(chipbreaker)' },
  { code: 'DNMA', shape: 'Diamond 55°', included_angle_deg: 55, inscribed_circle_mm: [9.525, 12.7, 15.875], clearance_angle: 'N(0°)', fixing: 'M(hole)+A(plain)' },
  { code: 'SNMG', shape: 'Square 90°', included_angle_deg: 90, inscribed_circle_mm: [9.525, 12.7, 19.05], clearance_angle: 'N(0°)', fixing: 'M(hole)+G(chipbreaker)' },
  { code: 'SNMA', shape: 'Square 90°', included_angle_deg: 90, inscribed_circle_mm: [9.525, 12.7, 19.05], clearance_angle: 'N(0°)', fixing: 'M(hole)+A(plain)' },
  { code: 'TNMG', shape: 'Triangle 60°', included_angle_deg: 60, inscribed_circle_mm: [9.525, 12.7, 16.5], clearance_angle: 'N(0°)', fixing: 'M(hole)+G(chipbreaker)' },
  { code: 'TNMA', shape: 'Triangle 60°', included_angle_deg: 60, inscribed_circle_mm: [9.525, 12.7, 16.5], clearance_angle: 'N(0°)', fixing: 'M(hole)+A(plain)' },
  { code: 'WNMG', shape: 'Trigon 80°', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'M(hole)+G(chipbreaker)' },
  { code: 'WNMA', shape: 'Trigon 80°', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'M(hole)+A(plain)' },
  { code: 'RNMG', shape: 'Round', included_angle_deg: 360, inscribed_circle_mm: [9.525, 12.7, 15.875, 19.05], clearance_angle: 'N(0°)', fixing: 'M(hole)+G(chipbreaker)' },
  // Positive inserts (clearance angle 7° or more)
  { code: 'CNGG', shape: 'Diamond 80° positive', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'G(chipbreaker)' },
  { code: 'CNGP', shape: 'Diamond 80° positive', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'G(chipbreaker)+P(precision)' },
  { code: 'DNGG', shape: 'Diamond 55° positive', included_angle_deg: 55, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'G(chipbreaker)' },
  { code: 'SNGG', shape: 'Square 90° positive', included_angle_deg: 90, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'G(chipbreaker)' },
  { code: 'TNGG', shape: 'Triangle 60° positive', included_angle_deg: 60, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'G(chipbreaker)' },
  { code: 'WNGG', shape: 'Trigon 80° positive', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'G(chipbreaker)' },
  // CBN/PCD inserts
  { code: 'CNGA', shape: 'Diamond 80° CBN/PCD', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'A(plain)' },
  { code: 'DNGA', shape: 'Diamond 55° CBN/PCD', included_angle_deg: 55, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'A(plain)' },
  { code: 'SNGA', shape: 'Square 90° CBN/PCD', included_angle_deg: 90, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'A(plain)' },
  { code: 'TNGA', shape: 'Triangle 60° CBN/PCD', included_angle_deg: 60, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'A(plain)' },
  { code: 'WNGA', shape: 'Trigon 80° CBN/PCD', included_angle_deg: 80, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'A(plain)' },
  { code: 'RNGA', shape: 'Round CBN/PCD', included_angle_deg: 360, inscribed_circle_mm: [9.525, 12.7], clearance_angle: 'N(0°)', fixing: 'A(plain)' },
];

// ── Chipbreaker Codes ──────────────────────────────────────────────
export interface TungaloyChipbreaker {
  code: string;
  name: string;
  application: 'finishing' | 'medium' | 'roughing' | 'heavy_roughing';
  feed_range_ipr: [number, number];  // inch per rev
  doc_range_in: [number, number];    // depth of cut in inches
}

export const TUNGALOY_CHIPBREAKERS: TungaloyChipbreaker[] = [
  // Finishing chipbreakers
  { code: 'TF', name: 'TungFlex Finish', application: 'finishing', feed_range_ipr: [0.002, 0.012], doc_range_in: [0.004, 0.079] },
  { code: 'TSF', name: 'TungSteel Finish', application: 'finishing', feed_range_ipr: [0.002, 0.016], doc_range_in: [0.004, 0.118] },
  { code: 'SF', name: 'Super Finish', application: 'finishing', feed_range_ipr: [0.003, 0.018], doc_range_in: [0.020, 0.098] },
  { code: 'CF', name: 'CBN Finish', application: 'finishing', feed_range_ipr: [0.002, 0.008], doc_range_in: [0.004, 0.039] },
  // Medium chipbreakers
  { code: 'PS', name: 'Positive Sharpedge', application: 'medium', feed_range_ipr: [0.004, 0.020], doc_range_in: [0.020, 0.157] },
  { code: 'PM', name: 'Positive Medium', application: 'medium', feed_range_ipr: [0.008, 0.024], doc_range_in: [0.039, 0.197] },
  { code: 'SM', name: 'Stainless Medium', application: 'medium', feed_range_ipr: [0.006, 0.020], doc_range_in: [0.039, 0.157] },
  { code: 'NM', name: 'Normal Medium', application: 'medium', feed_range_ipr: [0.006, 0.024], doc_range_in: [0.039, 0.197] },
  { code: 'CM', name: 'CBN Medium', application: 'medium', feed_range_ipr: [0.002, 0.020], doc_range_in: [0.020, 0.118] },
  { code: 'SDM', name: 'Stainless Deep Medium', application: 'medium', feed_range_ipr: [0.008, 0.020], doc_range_in: [0.079, 0.236] },
  // Roughing chipbreakers
  { code: 'NS', name: 'Normal Semi-rough', application: 'roughing', feed_range_ipr: [0.012, 0.028], doc_range_in: [0.079, 0.276] },
  { code: 'SH', name: 'Stainless Heavy', application: 'roughing', feed_range_ipr: [0.012, 0.028], doc_range_in: [0.079, 0.276] },
  { code: 'TH', name: 'TungHeavy', application: 'heavy_roughing', feed_range_ipr: [0.016, 0.032], doc_range_in: [0.118, 0.276] },
  { code: 'CH', name: 'CBN Heavy', application: 'roughing', feed_range_ipr: [0.008, 0.020], doc_range_in: [0.039, 0.157] },
  { code: 'GH', name: 'Groove Heavy', application: 'roughing', feed_range_ipr: [0.006, 0.016], doc_range_in: [0.039, 0.197] },
];

// ── Grade Definitions with ISO Material Suitability ─────────────────
export type IsoGroup = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
export type Suitability = 'first_choice' | 'second_choice' | 'usable' | 'not_recommended';

export interface TungaloyGrade {
  code: string;
  substrate: 'carbide' | 'cermet' | 'cbn' | 'pcd' | 'ceramic';
  coating: 'CVD' | 'PVD' | 'uncoated' | 'CVD+PVD';
  description: string;
  application: string;  // turning, grooving, threading, etc.
  iso_suitability: Record<IsoGroup, Suitability>;
}

export const TUNGALOY_TURNING_GRADES: TungaloyGrade[] = [
  // ── Steel grades (P) ──
  {
    code: 'T9225',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Suitable for steel machining at high speeds. New CVD coating and substrate deliver outstanding balance of wear and chipping resistance.',
    application: 'turning_continuous',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T9215',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'High-speed finishing grade for steel. Superior wear resistance for continuous cutting.',
    application: 'turning_finishing',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T9205',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Ultra-high-speed grade for steel. Maximum wear resistance.',
    application: 'turning_high_speed',
    iso_suitability: { P: 'first_choice', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T9235',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Tough grade for steel. Heavy interrupted cuts, parting, and facing.',
    application: 'turning_interrupted',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T9115',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'General purpose steel turning grade.',
    application: 'turning_general',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T9125',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Medium-duty steel turning grade.',
    application: 'turning_medium',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Stainless steel grades (M) ──
  {
    code: 'AH6225',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'First choice for stainless steel continuous turning.',
    application: 'turning_stainless_continuous',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'usable', H: 'not_recommended' },
  },
  {
    code: 'AH6235',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'First choice for stainless steel interrupted turning. Excellent toughness.',
    application: 'turning_stainless_interrupted',
    iso_suitability: { P: 'usable', M: 'first_choice', K: 'usable', N: 'not_recommended', S: 'second_choice', H: 'not_recommended' },
  },
  {
    code: 'AH6215',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'High-speed finishing grade for stainless steel.',
    application: 'turning_stainless_finishing',
    iso_suitability: { P: 'not_recommended', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T6215',
    substrate: 'cermet',
    coating: 'PVD',
    description: 'Advanced cermet for finish cutting of stainless steel.',
    application: 'turning_stainless_finish_cermet',
    iso_suitability: { P: 'second_choice', M: 'first_choice', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Superalloy grades (S) ──
  {
    code: 'AH8005',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'Remarkable for heat resistant alloys. Exclusive coating layer improves adhesion strength and wear resistance.',
    application: 'turning_superalloy',
    iso_suitability: { P: 'not_recommended', M: 'second_choice', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' },
  },
  {
    code: 'AH8015',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'Tough grade for superalloy interrupted machining.',
    application: 'turning_superalloy_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' },
  },
  {
    code: 'AH905',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'General purpose PVD grade for high fracture resistance. Recommended for superalloys.',
    application: 'turning_superalloy_general',
    iso_suitability: { P: 'usable', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' },
  },
  // ── PVD All-rounder grades ──
  {
    code: 'AH7025',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'First choice for light interrupted cuts or mix of continuous and interrupted. New PVD coating with high Al content provides excellent adhesion strength.',
    application: 'turning_light_interrupted',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'second_choice', N: 'usable', S: 'second_choice', H: 'not_recommended' },
  },
  {
    code: 'AH725',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'First choice for heavy interrupted cuts, parting, and facing.',
    application: 'turning_heavy_interrupted',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'second_choice', N: 'usable', S: 'second_choice', H: 'not_recommended' },
  },
  {
    code: 'AH730',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'Extra tough PVD grade for severe interrupted cuts.',
    application: 'turning_severe_interrupted',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'usable', H: 'not_recommended' },
  },
  {
    code: 'AH710',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'High hardness PVD grade for wear resistance.',
    application: 'turning_wear_resistant',
    iso_suitability: { P: 'second_choice', M: 'usable', K: 'first_choice', N: 'not_recommended', S: 'usable', H: 'not_recommended' },
  },
  // ── Cast iron grades (K) ──
  {
    code: 'GH130',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'First recommended grade for cast iron. Excellent wear resistance in high speed machining.',
    application: 'turning_cast_iron',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'GH110',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'High-speed cast iron finishing grade.',
    application: 'turning_cast_iron_finishing',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'GH330',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Tough cast iron grade for interrupted cuts.',
    application: 'turning_cast_iron_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'GH730',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'PVD grade for ductile cast iron.',
    application: 'turning_ductile_iron',
    iso_suitability: { P: 'not_recommended', M: 'usable', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Non-ferrous grades (N) ──
  {
    code: 'KS05F',
    substrate: 'carbide',
    coating: 'uncoated',
    description: 'Recommended for non-ferrous materials. Sharp edge, uncoated polished.',
    application: 'turning_non_ferrous',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'KS15F',
    substrate: 'carbide',
    coating: 'uncoated',
    description: 'Tough uncoated grade for non-ferrous. Higher toughness than KS05F.',
    application: 'turning_non_ferrous_tough',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'NS9530',
    substrate: 'cermet',
    coating: 'PVD',
    description: 'Advanced cermet for finish cutting of steel. TiCNO PVD coating with high wear resistance.',
    application: 'turning_finish_cermet',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Cermet grades ──
  {
    code: 'GT9530',
    substrate: 'cermet',
    coating: 'uncoated',
    description: 'Uncoated cermet for steel finishing.',
    application: 'turning_finish_cermet_uncoated',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'GT9215',
    substrate: 'cermet',
    coating: 'uncoated',
    description: 'High-speed cermet for steel finishing.',
    application: 'turning_finish_cermet_highspeed',
    iso_suitability: { P: 'first_choice', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'AT9530',
    substrate: 'cermet',
    coating: 'PVD',
    description: 'PVD-coated cermet for steel/stainless finishing.',
    application: 'turning_finish_cermet_pvd',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Hard material grades (H) — CBN ──
  {
    code: 'BXA10',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'Coated CBN grade for turning hardened steel parts. Continuous cutting, first choice.',
    application: 'turning_hardened_continuous',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BXA20',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN grade for hardened steel, light interrupted.',
    application: 'turning_hardened_light_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BXA30',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN grade for hardened steel, medium interrupted.',
    application: 'turning_hardened_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BXA40',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN grade for hardened steel, heavy interrupted.',
    application: 'turning_hardened_heavy_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BX930',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN general purpose for hardened steel.',
    application: 'turning_hardened_general',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'second_choice', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BX950',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN tough grade for hardened steel heavy cutting.',
    application: 'turning_hardened_heavy',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BX480',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN high hardness for finishing hardened steel.',
    application: 'turning_hardened_finishing',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BX360',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'Developed for grooving applications of hardened steel parts.',
    application: 'grooving_hardened',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'first_choice' },
  },
  {
    code: 'BXC90',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN for cast iron high-speed finishing.',
    application: 'turning_cast_iron_cbn',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'second_choice' },
  },
  {
    code: 'BXC50',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN for cast iron medium cutting.',
    application: 'turning_cast_iron_cbn_medium',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'usable' },
  },
  {
    code: 'BXM10',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN for sintered metals and heat-resistant alloys.',
    application: 'turning_sintered_cbn',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'not_recommended', S: 'second_choice', H: 'first_choice' },
  },
  {
    code: 'BXM20',
    substrate: 'cbn',
    coating: 'uncoated',
    description: 'CBN tough for sintered metals.',
    application: 'turning_sintered_cbn_tough',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'not_recommended', S: 'second_choice', H: 'first_choice' },
  },
  // ── PCD grades ──
  {
    code: 'FX105',
    substrate: 'pcd',
    coating: 'uncoated',
    description: 'PCD grade for non-ferrous and abrasive materials.',
    application: 'turning_non_ferrous_pcd',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'FX510',
    substrate: 'pcd',
    coating: 'uncoated',
    description: 'PCD grade for aluminum and composites.',
    application: 'turning_aluminum_pcd',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Cast iron dedicated (T5xx series) ──
  {
    code: 'T505',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'High-speed cast iron grade. Wear resistant.',
    application: 'turning_cast_iron_high_speed',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T515',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'General cast iron grade.',
    application: 'turning_cast_iron_general',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T5105',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Cast iron medium duty grade.',
    application: 'turning_cast_iron_medium',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T5115',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Cast iron interrupted cutting grade.',
    application: 'turning_cast_iron_interrupted',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'T5125',
    substrate: 'carbide',
    coating: 'CVD',
    description: 'Cast iron heavy interrupted cutting grade.',
    application: 'turning_cast_iron_heavy',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Threading grades ──
  {
    code: 'TH10',
    substrate: 'cermet',
    coating: 'PVD',
    description: 'TiCNO PVD coating with high wear resistance. Threading-focused cermet.',
    application: 'threading',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  {
    code: 'TH03',
    substrate: 'cermet',
    coating: 'uncoated',
    description: 'Uncoated cermet for precision threading.',
    application: 'threading_precision',
    iso_suitability: { P: 'first_choice', M: 'usable', K: 'not_recommended', N: 'not_recommended', S: 'not_recommended', H: 'not_recommended' },
  },
  // ── Ceramic grades ──
  {
    code: 'AH110',
    substrate: 'ceramic',
    coating: 'uncoated',
    description: 'Silicon nitride ceramic for cast iron high-speed.',
    application: 'turning_cast_iron_ceramic',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'first_choice', N: 'not_recommended', S: 'usable', H: 'not_recommended' },
  },
  {
    code: 'AH120',
    substrate: 'ceramic',
    coating: 'uncoated',
    description: 'SiAlON ceramic for superalloy machining.',
    application: 'turning_superalloy_ceramic',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'usable', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' },
  },
  {
    code: 'AH130',
    substrate: 'ceramic',
    coating: 'uncoated',
    description: 'Whisker-reinforced ceramic for heat-resistant alloys.',
    application: 'turning_superalloy_whisker',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' },
  },
  {
    code: 'AH140',
    substrate: 'ceramic',
    coating: 'uncoated',
    description: 'Tough ceramic for interrupted superalloy cutting.',
    application: 'turning_superalloy_ceramic_tough',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'not_recommended', S: 'first_choice', H: 'not_recommended' },
  },
  // ── Special application grades ──
  {
    code: 'AH330',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'Micro-grain carbide for small part turning.',
    application: 'turning_miniature',
    iso_suitability: { P: 'first_choice', M: 'second_choice', K: 'usable', N: 'usable', S: 'usable', H: 'not_recommended' },
  },
  {
    code: 'AH3135',
    substrate: 'carbide',
    coating: 'PVD',
    description: 'PVD grade for general purpose small part turning.',
    application: 'turning_miniature_general',
    iso_suitability: { P: 'first_choice', M: 'first_choice', K: 'second_choice', N: 'usable', S: 'second_choice', H: 'not_recommended' },
  },
  {
    code: 'KS20',
    substrate: 'carbide',
    coating: 'uncoated',
    description: 'Uncoated carbide for non-ferrous turning.',
    application: 'turning_non_ferrous_carbide',
    iso_suitability: { P: 'not_recommended', M: 'not_recommended', K: 'not_recommended', N: 'first_choice', S: 'not_recommended', H: 'not_recommended' },
  },
];

// ── Grooving Insert Designations ────────────────────────────────────
export interface TungaloyGroovingInsert {
  series: string;
  description: string;
  cut_width_mm: number[];
  max_doc_mm: number;
  application: string;
  iso_groups: IsoGroup[];
  grades: string[];
}

export const TUNGALOY_GROOVING_INSERTS: TungaloyGroovingInsert[] = [
  { series: 'DGM', description: 'External/internal grooving and parting', cut_width_mm: [2, 3, 4, 5, 6, 8], max_doc_mm: 6.7, application: 'grooving_parting', iso_groups: ['P', 'M', 'K', 'N', 'S', 'H'], grades: ['T9225', 'AH7025', 'AH725', 'AH8005', 'AH905', 'GH130', 'AH6235', 'NS9530', 'KS05F'] },
  { series: 'DGS', description: 'External/internal grooving (shallow)', cut_width_mm: [2, 3, 4, 5, 6], max_doc_mm: 5.0, application: 'grooving_shallow', iso_groups: ['P', 'M', 'K'], grades: ['T9225', 'AH7025', 'AH725', 'GH130', 'NS9530'] },
  { series: 'DTX', description: 'External/internal/face grooving and turning', cut_width_mm: [2, 3, 4, 5, 6, 8], max_doc_mm: 6.7, application: 'grooving_turning', iso_groups: ['P', 'M', 'K', 'N', 'S', 'H'], grades: ['T9225', 'AH7025', 'AH725', 'AH8005', 'GH130', 'AH6235', 'NS9530', 'KS05F'] },
  { series: 'DTI', description: 'Internal grooving and turning (high precision)', cut_width_mm: [3, 4, 5, 6, 8], max_doc_mm: 6.7, application: 'internal_grooving', iso_groups: ['P', 'M', 'K'], grades: ['T9225', 'AH7025', 'AH725', 'GH130', 'NS9530'] },
  { series: 'DTF', description: 'Face grooving', cut_width_mm: [2, 3, 4, 5, 6], max_doc_mm: 5.0, application: 'face_grooving', iso_groups: ['P', 'M', 'K'], grades: ['T9225', 'AH7025', 'AH725', 'GH130', 'NS9530'] },
  { series: 'DTM', description: 'External/internal grooving and turning (multi-purpose)', cut_width_mm: [2, 3, 4, 5, 6, 8], max_doc_mm: 6.7, application: 'multi_grooving', iso_groups: ['P', 'M', 'K'], grades: ['AH7025', 'AH8005', 'AH6235'] },
  { series: 'DTE', description: 'External/internal grooving (economy)', cut_width_mm: [2, 3, 4, 5, 6, 8], max_doc_mm: 6.7, application: 'grooving_economy', iso_groups: ['P', 'M', 'K', 'S'], grades: ['T9225', 'T515', 'AH7025', 'AH725', 'AH8005', 'GH130', 'AH6235'] },
  { series: 'DGIM', description: 'Internal grooving (miniature)', cut_width_mm: [2], max_doc_mm: 2.0, application: 'internal_grooving_mini', iso_groups: ['P', 'M', 'K'], grades: ['T9225', 'AH7025', 'AH725', 'GH130', 'NS9530'] },
  { series: 'DGIS', description: 'Internal grooving (standard)', cut_width_mm: [2], max_doc_mm: 2.0, application: 'internal_grooving_std', iso_groups: ['P', 'M', 'K'], grades: ['T9225', 'AH7025', 'AH725', 'GH130', 'NS9530'] },
];

// ── Catalog summary ─────────────────────────────────────────────────
export const TUNGALOY_TURNING_CATALOG_SUMMARY = {
  source: 'Tungaloy GC_2023-2024 US Turning-Grooving',
  pages: 1036,
  insert_shapes: TUNGALOY_INSERT_SHAPES.length,
  chipbreakers: TUNGALOY_CHIPBREAKERS.length,
  grades: TUNGALOY_TURNING_GRADES.length,
  grooving_series: TUNGALOY_GROOVING_INSERTS.length,
  iso_groups_covered: ['P', 'M', 'K', 'N', 'S', 'H'] as IsoGroup[],
  grade_substrates: {
    carbide: TUNGALOY_TURNING_GRADES.filter(g => g.substrate === 'carbide').length,
    cermet: TUNGALOY_TURNING_GRADES.filter(g => g.substrate === 'cermet').length,
    cbn: TUNGALOY_TURNING_GRADES.filter(g => g.substrate === 'cbn').length,
    pcd: TUNGALOY_TURNING_GRADES.filter(g => g.substrate === 'pcd').length,
    ceramic: TUNGALOY_TURNING_GRADES.filter(g => g.substrate === 'ceramic').length,
  },
};
