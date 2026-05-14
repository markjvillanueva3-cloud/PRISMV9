export interface ToolCoating {
  name: string;
  maxTemp: number;
  hardness: number;
  suitedFor: string[];
  avoidFor: string[];
}

export interface CuttingToolEntry {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  substrate: string;
  coating: string;
  diameter: number;
  fluteCount: number;
  helixAngle: number;
  maxDoc: number;
  suitedOperations: string[];
  suitedMaterials: string[];
  avoidMaterials: string[];
  maxRpm: number;
}

export const COATINGS: Record<string, ToolCoating> = {
  TiAlN: { name: "TiAlN", maxTemp: 800, hardness: 3300, suitedFor: ["P", "M", "K", "H"], avoidFor: ["N"] },
  AlTiN: { name: "AlTiN", maxTemp: 900, hardness: 3400, suitedFor: ["P", "M", "H", "S"], avoidFor: ["N"] },
  TiN: { name: "TiN", maxTemp: 600, hardness: 2300, suitedFor: ["P", "K", "N"], avoidFor: ["S", "H"] },
  AlCrN: { name: "AlCrN", maxTemp: 1100, hardness: 3200, suitedFor: ["S", "H", "M"], avoidFor: [] },
  DLC: { name: "DLC", maxTemp: 350, hardness: 5000, suitedFor: ["N"], avoidFor: ["P", "M", "S", "H"] },
  Uncoated: { name: "Uncoated", maxTemp: 400, hardness: 1600, suitedFor: ["N", "P"], avoidFor: ["S", "H"] },
  CVD: { name: "CVD (TiCN+Al2O3)", maxTemp: 1000, hardness: 2800, suitedFor: ["P", "K"], avoidFor: ["N", "S"] },
  PCD: { name: "PCD", maxTemp: 700, hardness: 8000, suitedFor: ["N"], avoidFor: ["P", "M", "S", "H", "K"] },
  CBN: { name: "CBN", maxTemp: 1200, hardness: 4500, suitedFor: ["H", "K"], avoidFor: ["N"] },
};

export const TOOLS: CuttingToolEntry[] = [
  // Endmills
  { id: "EM-C-12-4-TiAlN", name: "12mm 4-Flute Carbide Endmill", type: "endmill", manufacturer: "Sandvik", substrate: "Carbide", coating: "TiAlN", diameter: 12, fluteCount: 4, helixAngle: 35, maxDoc: 36, suitedOperations: ["slot_milling", "pocket_milling", "profile_milling", "semi-finishing"], suitedMaterials: ["P", "M", "K"], avoidMaterials: [], maxRpm: 20000 },
  { id: "EM-C-10-4-AlTiN", name: "10mm 4-Flute AlTiN Endmill", type: "endmill", manufacturer: "Kennametal", substrate: "Carbide", coating: "AlTiN", diameter: 10, fluteCount: 4, helixAngle: 40, maxDoc: 30, suitedOperations: ["pocket_milling", "profile_milling", "semi-finishing", "finishing"], suitedMaterials: ["P", "M", "S", "H"], avoidMaterials: [], maxRpm: 25000 },
  { id: "EM-C-8-3-DLC", name: "8mm 3-Flute DLC Endmill", type: "endmill", manufacturer: "OSG", substrate: "Carbide", coating: "DLC", diameter: 8, fluteCount: 3, helixAngle: 45, maxDoc: 24, suitedOperations: ["pocket_milling", "profile_milling", "finishing"], suitedMaterials: ["N"], avoidMaterials: ["P", "M", "S", "H"], maxRpm: 30000 },
  { id: "EM-C-16-5-AlCrN", name: "16mm 5-Flute AlCrN Endmill", type: "endmill", manufacturer: "Walter", substrate: "Carbide", coating: "AlCrN", diameter: 16, fluteCount: 5, helixAngle: 38, maxDoc: 48, suitedOperations: ["pocket_milling", "profile_milling", "semi-finishing"], suitedMaterials: ["S", "H", "M"], avoidMaterials: [], maxRpm: 15000 },
  { id: "EM-C-6-4-TiAlN", name: "6mm 4-Flute Carbide Endmill", type: "endmill", manufacturer: "Mitsubishi", substrate: "Carbide", coating: "TiAlN", diameter: 6, fluteCount: 4, helixAngle: 35, maxDoc: 18, suitedOperations: ["finishing", "semi-finishing", "profile_milling"], suitedMaterials: ["P", "M", "K"], avoidMaterials: [], maxRpm: 30000 },
  // Face mills
  { id: "FM-C-50-6-CVD", name: "50mm 6-Insert Face Mill", type: "face_mill", manufacturer: "Sandvik", substrate: "Carbide", coating: "CVD", diameter: 50, fluteCount: 6, helixAngle: 0, maxDoc: 4, suitedOperations: ["face_milling"], suitedMaterials: ["P", "K"], avoidMaterials: ["S"], maxRpm: 8000 },
  { id: "FM-C-63-8-TiAlN", name: "63mm 8-Insert Face Mill", type: "face_mill", manufacturer: "Kennametal", substrate: "Carbide", coating: "TiAlN", diameter: 63, fluteCount: 8, helixAngle: 0, maxDoc: 5, suitedOperations: ["face_milling"], suitedMaterials: ["P", "M", "K", "N"], avoidMaterials: [], maxRpm: 6000 },
  // Drills
  { id: "DR-C-10-2-TiAlN", name: "10mm Carbide Twist Drill", type: "drill", manufacturer: "Guhring", substrate: "Carbide", coating: "TiAlN", diameter: 10, fluteCount: 2, helixAngle: 30, maxDoc: 50, suitedOperations: ["drilling"], suitedMaterials: ["P", "M", "K", "N"], avoidMaterials: [], maxRpm: 12000 },
  { id: "DR-C-8-2-AlTiN", name: "8mm AlTiN Carbide Drill", type: "drill", manufacturer: "OSG", substrate: "Carbide", coating: "AlTiN", diameter: 8, fluteCount: 2, helixAngle: 30, maxDoc: 40, suitedOperations: ["drilling"], suitedMaterials: ["P", "M", "S", "H"], avoidMaterials: [], maxRpm: 15000 },
  // Turning inserts
  { id: "TI-C-CNMG-CVD", name: "CNMG 120408 Turning Insert", type: "insert", manufacturer: "Sandvik", substrate: "Carbide", coating: "CVD", diameter: 12, fluteCount: 1, helixAngle: 0, maxDoc: 4, suitedOperations: ["rough_turning", "finish_turning"], suitedMaterials: ["P", "K"], avoidMaterials: ["S", "H"], maxRpm: 5000 },
  { id: "TI-CBN-CNGA", name: "CNGA 120408 CBN Insert", type: "insert", manufacturer: "Sumitomo", substrate: "CBN", coating: "CBN", diameter: 12, fluteCount: 1, helixAngle: 0, maxDoc: 1, suitedOperations: ["finish_turning"], suitedMaterials: ["H", "K"], avoidMaterials: ["N"], maxRpm: 8000 },
  // Thread mills
  { id: "TM-C-M10-3-TiN", name: "M10 Thread Mill 3-Flute", type: "thread_mill", manufacturer: "Emuge", substrate: "Carbide", coating: "TiN", diameter: 8, fluteCount: 3, helixAngle: 0, maxDoc: 15, suitedOperations: ["thread_milling"], suitedMaterials: ["P", "M", "K", "N"], avoidMaterials: ["H"], maxRpm: 12000 },
];

export function getCompatibleTools(
  materialGroup: string,
  operationId: string,
): { compatible: CuttingToolEntry[]; incompatible: { tool: CuttingToolEntry; reason: string }[] } {
  const compatible: CuttingToolEntry[] = [];
  const incompatible: { tool: CuttingToolEntry; reason: string }[] = [];

  for (const tool of TOOLS) {
    const reasons: string[] = [];
    if (!tool.suitedOperations.includes(operationId)) {
      reasons.push(`Not designed for ${operationId.replace(/_/g, " ")}`);
    }
    if (tool.avoidMaterials.includes(materialGroup)) {
      reasons.push(`${tool.substrate} substrate not suited for ISO ${materialGroup}`);
    }
    if (COATINGS[tool.coating]?.avoidFor.includes(materialGroup)) {
      reasons.push(`${tool.coating} coating not recommended for ISO ${materialGroup}`);
    }

    if (reasons.length > 0) {
      incompatible.push({ tool, reason: reasons.join("; ") });
    } else {
      compatible.push(tool);
    }
  }

  return { compatible, incompatible };
}
