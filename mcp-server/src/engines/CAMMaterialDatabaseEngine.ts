/**
 * CAMMaterialDatabaseEngine — CAM-AI-TRAINING-MS0/U-CAMT-MATERIAL
 *
 * Canonical machining-material registry — ISO 513 P/M/K/N/S/H groups +
 * key properties: density (g/cm^3), hardness (HB / HRC), machinability
 * index (AISI 1212 = 100), tensile (MPa), melting point (°C), Kienzle
 * kc1.1 (N/mm^2) for force-model wiring.
 *
 * Pure data + lookup. Values come from public ISO group references —
 * canonical ones (kc1.1 P=1800, M=2100, K=1100, N=700, S=2800, H=3200)
 * match the PRISM canonical constants table.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { Material } from "./CAMToolLibrarySelectionEngine.js";

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface MaterialProps {
  /** Canonical PRISM Material enum identifier. */
  id: Material;
  /** Common display name. */
  displayName: string;
  /** ISO 513 group. */
  isoGroup: ISOGroup;
  densityGCm3: number;
  /** Hardness — store HB for soft groups, HRC for hardened steels. */
  hardnessHB?: number;
  hardnessHRC?: number;
  /** Machinability index — AISI 1212 = 100; higher = easier to cut. */
  machinabilityIndex: number;
  /** Ultimate tensile strength, MPa. */
  tensileMPa: number;
  meltingC: number;
  /** Kienzle specific cutting force, N/mm^2 (group canonical). */
  kc11NMm2: number;
  /** mc (Kienzle exponent), unitless. */
  kienzleMc: number;
}

/** Canonical kc1.1 per ISO group (PRISM constants table). */
const ISO_KC11: Record<ISOGroup, number> = {
  P: 1800,
  M: 2100,
  K: 1100,
  N: 700,
  S: 2800,
  H: 3200,
};

/** Canonical mc per ISO group — Kienzle exponent. */
const ISO_MC: Record<ISOGroup, number> = {
  P: 0.25,
  M: 0.25,
  K: 0.28,
  N: 0.25,
  S: 0.20,
  H: 0.20,
};

const MATERIAL_REGISTRY: Record<Material, MaterialProps> = {
  steel: {
    id: "steel",
    displayName: "Steel (carbon, AISI 1045 baseline)",
    isoGroup: "P",
    densityGCm3: 7.85,
    hardnessHB: 180,
    machinabilityIndex: 65,
    tensileMPa: 625,
    meltingC: 1450,
    kc11NMm2: ISO_KC11.P,
    kienzleMc: ISO_MC.P,
  },
  tool_steel: {
    id: "tool_steel",
    displayName: "Tool steel (A2 / D2 annealed)",
    isoGroup: "P",
    densityGCm3: 7.85,
    hardnessHB: 250,
    machinabilityIndex: 45,
    tensileMPa: 950,
    meltingC: 1450,
    kc11NMm2: 2200, // higher than baseline P
    kienzleMc: ISO_MC.P,
  },
  hardened_steel: {
    id: "hardened_steel",
    displayName: "Hardened steel (>45 HRC, A2/D2 hardened)",
    isoGroup: "H",
    densityGCm3: 7.85,
    hardnessHRC: 55,
    machinabilityIndex: 20,
    tensileMPa: 1800,
    meltingC: 1450,
    kc11NMm2: ISO_KC11.H,
    kienzleMc: ISO_MC.H,
  },
  stainless: {
    id: "stainless",
    displayName: "Stainless steel (304 / 316 austenitic)",
    isoGroup: "M",
    densityGCm3: 8.00,
    hardnessHB: 200,
    machinabilityIndex: 35,
    tensileMPa: 580,
    meltingC: 1400,
    kc11NMm2: ISO_KC11.M,
    kienzleMc: ISO_MC.M,
  },
  titanium: {
    id: "titanium",
    displayName: "Titanium (Ti-6Al-4V Grade 5)",
    isoGroup: "S",
    densityGCm3: 4.43,
    hardnessHB: 350,
    machinabilityIndex: 22,
    tensileMPa: 950,
    meltingC: 1660,
    kc11NMm2: ISO_KC11.S,
    kienzleMc: ISO_MC.S,
  },
  inconel: {
    id: "inconel",
    displayName: "Inconel 718 (Ni-Cr superalloy)",
    isoGroup: "S",
    densityGCm3: 8.19,
    hardnessHB: 350,
    machinabilityIndex: 18,
    tensileMPa: 1240,
    meltingC: 1336,
    kc11NMm2: 3000, // higher than S baseline due to work-hardening
    kienzleMc: ISO_MC.S,
  },
  aluminum: {
    id: "aluminum",
    displayName: "Aluminum (6061-T6 baseline)",
    isoGroup: "N",
    densityGCm3: 2.70,
    hardnessHB: 95,
    machinabilityIndex: 200, // very easy
    tensileMPa: 310,
    meltingC: 660,
    kc11NMm2: ISO_KC11.N,
    kienzleMc: ISO_MC.N,
  },
  copper: {
    id: "copper",
    displayName: "Copper (C110 electrolytic)",
    isoGroup: "N",
    densityGCm3: 8.96,
    hardnessHB: 70,
    machinabilityIndex: 70, // copper is gummy
    tensileMPa: 220,
    meltingC: 1085,
    kc11NMm2: 800,
    kienzleMc: ISO_MC.N,
  },
  brass: {
    id: "brass",
    displayName: "Brass (360 free-machining)",
    isoGroup: "N",
    densityGCm3: 8.50,
    hardnessHB: 80,
    machinabilityIndex: 180,
    tensileMPa: 350,
    meltingC: 900,
    kc11NMm2: 600,
    kienzleMc: ISO_MC.N,
  },
  plastic: {
    id: "plastic",
    displayName: "Plastic (acetal / nylon baseline)",
    isoGroup: "N",
    densityGCm3: 1.40,
    hardnessHB: 30,
    machinabilityIndex: 250,
    tensileMPa: 70,
    meltingC: 170,
    kc11NMm2: 200,
    kienzleMc: 0.30,
  },
  composite: {
    id: "composite",
    displayName: "Composite (CFRP / GFRP baseline)",
    isoGroup: "N",
    densityGCm3: 1.60,
    hardnessHB: 0, // not applicable
    machinabilityIndex: 60,
    tensileMPa: 1500,
    meltingC: 0,
    kc11NMm2: 500,
    kienzleMc: 0.30,
  },
};

export class CAMMaterialDatabaseEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMMaterialDatabaseEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Canonical machining-material registry with ISO P/M/K/N/S/H grouping + Kienzle kc1.1.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "get",                description: "Lookup MaterialProps by id",         actions: ["cam_material_get"] },
      { name: "list",               description: "List all material ids",              actions: ["cam_material_list"] },
      { name: "list_by_iso_group",  description: "Filter materials by ISO group",      actions: ["cam_material_list_by_iso_group"] },
      { name: "iso_kc11",           description: "Canonical kc1.1 per ISO group",      actions: ["cam_material_iso_kc11"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMMaterialDatabaseEngine", note: "use typed methods" };
  }

  /** Lookup by id. Returns null when not found (no fabrication). */
  get(id: Material): MaterialProps | null {
    return MATERIAL_REGISTRY[id] ?? null;
  }

  /** List all 11 material ids. */
  list(): ReadonlyArray<Material> {
    return Object.keys(MATERIAL_REGISTRY) as Material[];
  }

  /** Filter by ISO group. */
  list_by_iso_group(group: ISOGroup): ReadonlyArray<Material> {
    return (Object.keys(MATERIAL_REGISTRY) as Material[]).filter(
      (id) => MATERIAL_REGISTRY[id].isoGroup === group,
    );
  }

  /** Canonical kc1.1 per ISO group — for direct Kienzle lookups. */
  iso_kc11(group: ISOGroup): number {
    return ISO_KC11[group];
  }

  /** All 6 ISO groups. */
  iso_groups(): ReadonlyArray<ISOGroup> {
    return ["P", "M", "K", "N", "S", "H"];
  }
}

export const camMaterialDatabaseEngine = new CAMMaterialDatabaseEngine();
