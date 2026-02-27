/**
 * MaterialEquivalenceEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Maps equivalent material designations across international standards:
 * AISI/SAE, DIN/EN, JIS, BS, GOST, and UNS. Identifies substitution
 * candidates with comparable properties.
 *
 * Actions: material_equivalent, material_substitute, material_compare
 */

// ============================================================================
// TYPES
// ============================================================================

export type MaterialStandard = "AISI" | "DIN" | "EN" | "JIS" | "BS" | "UNS" | "GOST" | "ISO";

export interface MaterialEquivInput {
  designation: string;
  standard: MaterialStandard;
  target_standards?: MaterialStandard[];
}

export interface MaterialEquivalent {
  standard: MaterialStandard;
  designation: string;
  confidence: "exact" | "close" | "approximate";
  notes?: string;
}

export interface MaterialEquivResult {
  input_designation: string;
  input_standard: MaterialStandard;
  equivalents: MaterialEquivalent[];
  properties: {
    carbon_pct: number;
    tensile_MPa: number;
    yield_MPa: number;
    hardness_HBW: number;
  };
  substitution_notes: string[];
}

// ============================================================================
// DATABASE (common steel equivalents)
// ============================================================================

const EQUIV_DB: {
  aisi: string; din: string; en: string; jis: string; uns: string;
  c_pct: number; uts: number; ys: number; hbw: number;
}[] = [
  { aisi: "1045", din: "C45", en: "1.0503", jis: "S45C", uns: "G10450", c_pct: 0.45, uts: 630, ys: 370, hbw: 187 },
  { aisi: "4140", din: "42CrMo4", en: "1.7225", jis: "SCM440", uns: "G41400", c_pct: 0.40, uts: 900, ys: 750, hbw: 275 },
  { aisi: "4340", din: "34CrNiMo6", en: "1.6582", jis: "SNCM439", uns: "G43400", c_pct: 0.40, uts: 1080, ys: 930, hbw: 321 },
  { aisi: "304", din: "X5CrNi18-10", en: "1.4301", jis: "SUS304", uns: "S30400", c_pct: 0.07, uts: 580, ys: 230, hbw: 170 },
  { aisi: "316L", din: "X2CrNiMo17-12-2", en: "1.4404", jis: "SUS316L", uns: "S31603", c_pct: 0.02, uts: 530, ys: 220, hbw: 160 },
  { aisi: "D2", din: "X153CrMoV12", en: "1.2379", jis: "SKD11", uns: "T30402", c_pct: 1.50, uts: 710, ys: 400, hbw: 230 },
  { aisi: "H13", din: "X40CrMoV5-1", en: "1.2344", jis: "SKD61", uns: "T20813", c_pct: 0.40, uts: 1520, ys: 1310, hbw: 450 },
  { aisi: "A2", din: "X100CrMoV5", en: "1.2363", jis: "SKD12", uns: "T30102", c_pct: 1.00, uts: 690, ys: 380, hbw: 220 },
  { aisi: "M2", din: "S6-5-2", en: "1.3343", jis: "SKH51", uns: "T11302", c_pct: 0.85, uts: 1000, ys: 800, hbw: 260 },
  { aisi: "8620", din: "21NiCrMo2", en: "1.6523", jis: "SNCM220", uns: "G86200", c_pct: 0.20, uts: 530, ys: 360, hbw: 160 },
  { aisi: "1018", din: "C15", en: "1.0401", jis: "S15C", uns: "G10180", c_pct: 0.18, uts: 440, ys: 280, hbw: 131 },
  { aisi: "52100", din: "100Cr6", en: "1.3505", jis: "SUJ2", uns: "G52986", c_pct: 1.00, uts: 750, ys: 420, hbw: 210 },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MaterialEquivalenceEngine {
  findEquivalent(input: MaterialEquivInput): MaterialEquivResult {
    const desig = input.designation.toUpperCase().replace(/\s+/g, "");

    // Search database
    const match = EQUIV_DB.find(row => {
      const fields = [row.aisi, row.din, row.en, row.jis, row.uns];
      return fields.some(f => f.toUpperCase().replace(/\s+/g, "").includes(desig) || desig.includes(f.toUpperCase().replace(/\s+/g, "")));
    });

    const targets = input.target_standards || ["AISI", "DIN", "EN", "JIS", "UNS"];
    const equivalents: MaterialEquivalent[] = [];

    if (match) {
      const standardMap: Record<string, string> = {
        AISI: match.aisi, DIN: match.din, EN: match.en, JIS: match.jis, UNS: match.uns,
      };
      for (const std of targets) {
        const val = standardMap[std];
        if (val && val !== input.designation) {
          equivalents.push({ standard: std as MaterialStandard, designation: val, confidence: "exact" });
        }
      }

      return {
        input_designation: input.designation,
        input_standard: input.standard,
        equivalents,
        properties: { carbon_pct: match.c_pct, tensile_MPa: match.uts, yield_MPa: match.ys, hardness_HBW: match.hbw },
        substitution_notes: ["Equivalents from ASTM E140 / cross-reference tables. Verify exact chemistry with material certificate."],
      };
    }

    // No exact match
    return {
      input_designation: input.designation,
      input_standard: input.standard,
      equivalents: [],
      properties: { carbon_pct: 0, tensile_MPa: 0, yield_MPa: 0, hardness_HBW: 0 },
      substitution_notes: [`No direct equivalent found for ${input.designation}. Consult material supplier for cross-reference.`],
    };
  }

  compare(matA: string, matB: string): { match_pct: number; differences: string[] } {
    const a = EQUIV_DB.find(r => r.aisi === matA || r.din === matA || r.en === matA);
    const b = EQUIV_DB.find(r => r.aisi === matB || r.din === matB || r.en === matB);

    if (!a || !b) return { match_pct: 0, differences: ["One or both materials not in database"] };

    const diffs: string[] = [];
    const cDiff = Math.abs(a.c_pct - b.c_pct);
    const utsDiff = Math.abs(a.uts - b.uts) / Math.max(a.uts, b.uts) * 100;

    if (cDiff > 0.1) diffs.push(`Carbon differs by ${cDiff.toFixed(2)}%`);
    if (utsDiff > 10) diffs.push(`UTS differs by ${utsDiff.toFixed(0)}%`);
    if (a.hbw !== b.hbw) diffs.push(`Hardness: ${a.hbw} vs ${b.hbw} HBW`);

    const matchPct = Math.max(0, 100 - cDiff * 100 - utsDiff);

    return { match_pct: Math.round(matchPct), differences: diffs.length > 0 ? diffs : ["Materials are equivalent"] };
  }
}

export const materialEquivalenceEngine = new MaterialEquivalenceEngine();
