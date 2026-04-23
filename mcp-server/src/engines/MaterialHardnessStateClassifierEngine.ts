/**
 * MaterialHardnessStateClassifierEngine — LATHE-PROD-READY-MS0 U-LPR-HARDNESS
 *
 * Classifies materials into 5-band hardness regimes and provides
 * Sandvik-cited kc1.1 coefficients for Kienzle force calculations.
 *
 * Hardness bands:
 * - soft: <20 HRC (annealed steels, aluminum, brass)
 * - medium: 20-35 HRC (normalized/tempered steels)
 * - pre-hard: 35-45 HRC (pre-hardened tool steels)
 * - hard: 45-58 HRC (hardened tool steels, CBN territory)
 * - ultra-hard: >58 HRC (fully hardened D2/M2, ceramic required)
 *
 * Sources:
 * - Sandvik Coromant Technical Guide 2023
 * - VDI 3321 (Kienzle coefficients)
 * - Kronenberg: Machining Science and Application
 *
 * JM Die materials covered: M2, D2, S7, A2, H13, WC-Co, 4140, 4340, 8620
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR-HARDNESS
 * @physics Sandvik, VDI 3321, Kronenberg
 */

import { z } from "zod";

export const HardnessBandSchema = z.enum(["soft", "medium", "pre_hard", "hard", "ultra_hard"]);

export const HardnessClassificationInputSchema = z.object({
  material_name: z.string(),
  hardness_hrc: z.number().optional(),
  hardness_hb: z.number().optional(),
  heat_treatment: z.enum(["annealed", "normalized", "quench_tempered", "case_hardened", "nitrided", "unknown"]).optional(),
});

export const HardnessClassificationResultSchema = z.object({
  material_name: z.string(),
  hardness_hrc: z.number(),
  hardness_hb: z.number(),
  band: HardnessBandSchema,
  kc1_1_MPa: z.number(),
  mc: z.number(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  recommended_insert_material: z.string(),
  max_cutting_speed_m_min: z.number(),
  source: z.string(),
  confidence: z.number(),
  warnings: z.array(z.string()),
});

export type HardnessBand = z.infer<typeof HardnessBandSchema>;
export type HardnessClassificationInput = z.infer<typeof HardnessClassificationInputSchema>;
export type HardnessClassificationResult = z.infer<typeof HardnessClassificationResultSchema>;

interface MaterialHardnessEntry {
  name: string;
  aliases: string[];
  annealed_hrc: number;
  annealed_kc1_1: number;
  qt_32_hrc?: number;
  qt_32_kc1_1?: number;
  hard_hrc?: number;
  hard_kc1_1?: number;
  ultra_hard_hrc?: number;
  ultra_hard_kc1_1?: number;
  mc: number;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  source: string;
}

const MATERIAL_DATABASE: MaterialHardnessEntry[] = [
  {
    name: "4140",
    aliases: ["AISI 4140", "4140 steel", "SAE 4140"],
    annealed_hrc: 18,
    annealed_kc1_1: 1990,
    qt_32_hrc: 32,
    qt_32_kc1_1: 2260,
    hard_hrc: 58,
    hard_kc1_1: 2800,
    mc: 0.25,
    iso_group: "P",
    source: "Sandvik Coromant Technical Guide 2023",
  },
  {
    name: "4340",
    aliases: ["AISI 4340", "4340 steel", "SAE 4340"],
    annealed_hrc: 20,
    annealed_kc1_1: 2050,
    qt_32_hrc: 35,
    qt_32_kc1_1: 2350,
    hard_hrc: 55,
    hard_kc1_1: 2900,
    mc: 0.25,
    iso_group: "P",
    source: "Sandvik Coromant Technical Guide 2023",
  },
  {
    name: "8620",
    aliases: ["AISI 8620", "8620 steel", "SAE 8620"],
    annealed_hrc: 15,
    annealed_kc1_1: 1850,
    qt_32_hrc: 28,
    qt_32_kc1_1: 2100,
    hard_hrc: 60,
    hard_kc1_1: 2950,
    mc: 0.25,
    iso_group: "P",
    source: "Sandvik Coromant Technical Guide 2023",
  },
  {
    name: "D2",
    aliases: ["AISI D2", "D2 tool steel", "1.2379", "X155CrVMo12-1"],
    annealed_hrc: 22,
    annealed_kc1_1: 2100,
    qt_32_hrc: 45,
    qt_32_kc1_1: 2600,
    hard_hrc: 60,
    hard_kc1_1: 3400,
    ultra_hard_hrc: 64,
    ultra_hard_kc1_1: 3800,
    mc: 0.22,
    iso_group: "H",
    source: "Sandvik Coromant Technical Guide 2023 + VDI 3321",
  },
  {
    name: "M2",
    aliases: ["AISI M2", "M2 HSS", "1.3343", "HS6-5-2"],
    annealed_hrc: 24,
    annealed_kc1_1: 2200,
    qt_32_hrc: 48,
    qt_32_kc1_1: 2750,
    hard_hrc: 62,
    hard_kc1_1: 3600,
    ultra_hard_hrc: 66,
    ultra_hard_kc1_1: 4000,
    mc: 0.21,
    iso_group: "H",
    source: "Sandvik Coromant Technical Guide 2023 + VDI 3321",
  },
  {
    name: "S7",
    aliases: ["AISI S7", "S7 tool steel", "shock-resistant"],
    annealed_hrc: 20,
    annealed_kc1_1: 2000,
    qt_32_hrc: 45,
    qt_32_kc1_1: 2500,
    hard_hrc: 58,
    hard_kc1_1: 3200,
    mc: 0.24,
    iso_group: "H",
    source: "Sandvik Coromant Technical Guide 2023",
  },
  {
    name: "A2",
    aliases: ["AISI A2", "A2 tool steel", "1.2363", "X100CrMoV5"],
    annealed_hrc: 20,
    annealed_kc1_1: 2050,
    qt_32_hrc: 42,
    qt_32_kc1_1: 2450,
    hard_hrc: 60,
    hard_kc1_1: 3300,
    mc: 0.23,
    iso_group: "H",
    source: "Sandvik Coromant Technical Guide 2023",
  },
  {
    name: "H13",
    aliases: ["AISI H13", "H13 tool steel", "1.2344", "X40CrMoV5-1"],
    annealed_hrc: 18,
    annealed_kc1_1: 1950,
    qt_32_hrc: 40,
    qt_32_kc1_1: 2400,
    hard_hrc: 52,
    hard_kc1_1: 3000,
    mc: 0.24,
    iso_group: "H",
    source: "Sandvik Coromant Technical Guide 2023",
  },
  {
    name: "WC-Co",
    aliases: ["tungsten carbide", "cemented carbide", "carbide"],
    annealed_hrc: 75,
    annealed_kc1_1: 5500,
    mc: 0.18,
    iso_group: "H",
    source: "Kronenberg + EDM grinding data",
  },
];

export class MaterialHardnessStateClassifierEngine {

  static hbToHrc(hb: number): number {
    if (hb < 100) return 0;
    if (hb > 739) return 68;
    if (hb < 240) return (hb - 100) * 20 / 140;
    if (hb < 450) return 20 + (hb - 240) * 35 / 210;
    return 55 + (hb - 450) * 13 / 289;
  }

  static hrcToHb(hrc: number): number {
    if (hrc < 20) return 100 + hrc * 140 / 20;
    if (hrc < 55) return 240 + (hrc - 20) * 210 / 35;
    return 450 + (hrc - 55) * 289 / 13;
  }

  static classifyBand(hrc: number): HardnessBand {
    if (hrc < 20) return "soft";
    if (hrc < 35) return "medium";
    if (hrc < 45) return "pre_hard";
    if (hrc < 58) return "hard";
    return "ultra_hard";
  }

  static findMaterial(name: string): MaterialHardnessEntry | null {
    const normalized = name.toLowerCase().trim();
    for (const entry of MATERIAL_DATABASE) {
      if (entry.name.toLowerCase() === normalized) return entry;
      for (const alias of entry.aliases) {
        if (alias.toLowerCase() === normalized) return entry;
      }
    }
    for (const entry of MATERIAL_DATABASE) {
      if (normalized.includes(entry.name.toLowerCase())) return entry;
      for (const alias of entry.aliases) {
        if (normalized.includes(alias.toLowerCase())) return entry;
      }
    }
    return null;
  }

  static interpolateKc1_1(entry: MaterialHardnessEntry, hrc: number): number {
    if (hrc <= entry.annealed_hrc) {
      return entry.annealed_kc1_1;
    }

    if (entry.qt_32_hrc && hrc <= entry.qt_32_hrc) {
      const ratio = (hrc - entry.annealed_hrc) / (entry.qt_32_hrc - entry.annealed_hrc);
      return entry.annealed_kc1_1 + ratio * (entry.qt_32_kc1_1! - entry.annealed_kc1_1);
    }

    if (entry.hard_hrc && hrc <= entry.hard_hrc) {
      const baseHrc = entry.qt_32_hrc ?? entry.annealed_hrc;
      const baseKc = entry.qt_32_kc1_1 ?? entry.annealed_kc1_1;
      const ratio = (hrc - baseHrc) / (entry.hard_hrc - baseHrc);
      return baseKc + ratio * (entry.hard_kc1_1! - baseKc);
    }

    if (entry.ultra_hard_hrc && hrc <= entry.ultra_hard_hrc) {
      const ratio = (hrc - (entry.hard_hrc ?? 58)) / (entry.ultra_hard_hrc - (entry.hard_hrc ?? 58));
      return (entry.hard_kc1_1 ?? 3200) + ratio * (entry.ultra_hard_kc1_1! - (entry.hard_kc1_1 ?? 3200));
    }

    return entry.ultra_hard_kc1_1 ?? entry.hard_kc1_1 ?? entry.qt_32_kc1_1 ?? entry.annealed_kc1_1;
  }

  static getRecommendedInsert(band: HardnessBand, iso_group: string): string {
    switch (band) {
      case "soft":
      case "medium":
        return iso_group === "H" ? "Coated carbide (CVD TiCN-Al2O3)" : "Coated carbide (CVD)";
      case "pre_hard":
        return "Coated carbide (PVD TiAlN) or ceramic";
      case "hard":
        return "CBN (low content 50%) for continuous, ceramic for interrupted";
      case "ultra_hard":
        return "CBN (high content 90%) or PCBN";
    }
  }

  static getMaxCuttingSpeed(band: HardnessBand, iso_group: string): number {
    const speeds: Record<HardnessBand, number> = {
      soft: 350,
      medium: 280,
      pre_hard: 180,
      hard: 120,
      ultra_hard: 80,
    };
    let base = speeds[band];
    if (iso_group === "M") base *= 0.5;
    if (iso_group === "S") base *= 0.3;
    if (iso_group === "N") base *= 2.5;
    return Math.round(base);
  }

  static classify(input: HardnessClassificationInput): HardnessClassificationResult {
    const parsed = HardnessClassificationInputSchema.parse(input);
    const warnings: string[] = [];

    let hrc: number;
    let hb: number;

    if (parsed.hardness_hrc !== undefined) {
      hrc = parsed.hardness_hrc;
      hb = this.hrcToHb(hrc);
    } else if (parsed.hardness_hb !== undefined) {
      hb = parsed.hardness_hb;
      hrc = this.hbToHrc(hb);
    } else {
      hrc = 25;
      hb = this.hrcToHb(hrc);
      warnings.push("No hardness provided — assuming 25 HRC (medium)");
    }

    const material = this.findMaterial(parsed.material_name);
    let kc1_1: number;
    let mc: number;
    let iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    let source: string;
    let confidence: number;

    if (material) {
      kc1_1 = this.interpolateKc1_1(material, hrc);
      mc = material.mc;
      iso_group = material.iso_group;
      source = material.source;
      confidence = 0.95;
    } else {
      const band = this.classifyBand(hrc);
      const defaults: Record<HardnessBand, { kc: number; mc: number }> = {
        soft: { kc: 1800, mc: 0.26 },
        medium: { kc: 2100, mc: 0.25 },
        pre_hard: { kc: 2500, mc: 0.24 },
        hard: { kc: 3000, mc: 0.23 },
        ultra_hard: { kc: 3500, mc: 0.22 },
      };
      kc1_1 = defaults[band].kc;
      mc = defaults[band].mc;
      iso_group = band === "soft" || band === "medium" ? "P" : "H";
      source = "Generic estimate (material not in database)";
      confidence = 0.6;
      warnings.push(`Material "${parsed.material_name}" not found — using generic ${band} band defaults`);
    }

    const band = this.classifyBand(hrc);
    const recommended_insert = this.getRecommendedInsert(band, iso_group);
    const max_speed = this.getMaxCuttingSpeed(band, iso_group);

    if (band === "ultra_hard") {
      warnings.push("Ultra-hard material: CBN or PCBN required, minimal stock removal recommended");
    }
    if (band === "hard" && parsed.heat_treatment === "case_hardened") {
      warnings.push("Case-hardened: surface harder than core — expect variable cutting forces");
    }

    return {
      material_name: parsed.material_name,
      hardness_hrc: Math.round(hrc * 10) / 10,
      hardness_hb: Math.round(hb),
      band,
      kc1_1_MPa: Math.round(kc1_1),
      mc: Math.round(mc * 1000) / 1000,
      iso_group,
      recommended_insert_material: recommended_insert,
      max_cutting_speed_m_min: max_speed,
      source,
      confidence,
      warnings,
    };
  }

  static getJMDieMaterials(): string[] {
    return MATERIAL_DATABASE.map(m => m.name);
  }

  static getAllMaterialsWithAliases(): Array<{ name: string; aliases: string[] }> {
    return MATERIAL_DATABASE.map(m => ({ name: m.name, aliases: m.aliases }));
  }
}

export const materialHardnessStateClassifierEngine = MaterialHardnessStateClassifierEngine;
