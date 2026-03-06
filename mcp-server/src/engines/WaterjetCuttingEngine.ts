/**
 * WaterjetCuttingEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Waterjet cutting parameter calculator: pure water & abrasive modes,
 * Q1-Q5 quality levels, taper compensation, consumable tracking,
 * and cost analysis. 18 material database.
 */

// ---------------------------------------------------------------------------
// Material Database (18 materials from monolith)
// ---------------------------------------------------------------------------

interface WaterjetMaterial {
  name: string;
  machinability: number;    // Relative cutting ease (1.0 = mild steel)
  pierceTimeFactor: number;
  qualityFactor: number;    // Surface quality modifier
  pureWater?: boolean;      // Can cut with pure water only
}

const WATERJET_MATERIALS: Record<string, WaterjetMaterial> = {
  mild_steel:   { name: "Mild Steel",        machinability: 1.0,  pierceTimeFactor: 1.0,  qualityFactor: 1.0 },
  stainless:    { name: "Stainless Steel",   machinability: 0.85, pierceTimeFactor: 1.2,  qualityFactor: 0.95 },
  aluminum:     { name: "Aluminum",          machinability: 1.8,  pierceTimeFactor: 0.7,  qualityFactor: 1.1 },
  copper:       { name: "Copper",            machinability: 1.5,  pierceTimeFactor: 0.8,  qualityFactor: 1.05 },
  brass:        { name: "Brass",             machinability: 1.6,  pierceTimeFactor: 0.75, qualityFactor: 1.05 },
  titanium:     { name: "Titanium",          machinability: 0.6,  pierceTimeFactor: 1.5,  qualityFactor: 0.85 },
  inconel:      { name: "Inconel",           machinability: 0.4,  pierceTimeFactor: 1.8,  qualityFactor: 0.8 },
  tool_steel:   { name: "Tool Steel",        machinability: 0.7,  pierceTimeFactor: 1.3,  qualityFactor: 0.9 },
  hardened_steel: { name: "Hardened Steel",  machinability: 0.5,  pierceTimeFactor: 1.5,  qualityFactor: 0.85 },
  tungsten_carbide: { name: "Tungsten Carbide", machinability: 0.3, pierceTimeFactor: 2.0, qualityFactor: 0.75 },
  glass:        { name: "Glass",             machinability: 1.2,  pierceTimeFactor: 2.5,  qualityFactor: 0.9 },
  ceramic:      { name: "Ceramic",           machinability: 0.8,  pierceTimeFactor: 2.0,  qualityFactor: 0.85 },
  marble:       { name: "Marble/Granite",    machinability: 1.5,  pierceTimeFactor: 1.0,  qualityFactor: 1.0 },
  carbon_fiber: { name: "Carbon Fiber",      machinability: 1.4,  pierceTimeFactor: 0.8,  qualityFactor: 1.0 },
  rubber:       { name: "Rubber",            machinability: 3.0,  pierceTimeFactor: 0.3,  qualityFactor: 1.5, pureWater: true },
  foam:         { name: "Foam",              machinability: 5.0,  pierceTimeFactor: 0.2,  qualityFactor: 2.0, pureWater: true },
  plastic:      { name: "Plastic/Acrylic",   machinability: 2.5,  pierceTimeFactor: 0.4,  qualityFactor: 1.3, pureWater: true },
  wood:         { name: "Wood",              machinability: 3.5,  pierceTimeFactor: 0.3,  qualityFactor: 1.5, pureWater: true },
};

// ---------------------------------------------------------------------------
// Abrasive Database
// ---------------------------------------------------------------------------

interface WaterjetAbrasive {
  name: string;
  mesh: number;
  cuttingSpeed: number;   // Relative speed factor
  surfaceFinish: number;  // Quality factor (higher = better)
  costPerKg: number;
}

const WATERJET_ABRASIVES: Record<string, WaterjetAbrasive> = {
  garnet_50:  { name: "Garnet #50",  mesh: 50,  cuttingSpeed: 1.2,  surfaceFinish: 0.8,  costPerKg: 0.35 },
  garnet_80:  { name: "Garnet #80",  mesh: 80,  cuttingSpeed: 1.0,  surfaceFinish: 1.0,  costPerKg: 0.40 },
  garnet_120: { name: "Garnet #120", mesh: 120, cuttingSpeed: 0.8,  surfaceFinish: 1.3,  costPerKg: 0.55 },
  garnet_220: { name: "Garnet #220", mesh: 220, cuttingSpeed: 0.5,  surfaceFinish: 1.6,  costPerKg: 0.80 },
  alumina:    { name: "Aluminum Oxide", mesh: 80, cuttingSpeed: 1.1, surfaceFinish: 0.9, costPerKg: 0.60 },
  olivine:    { name: "Olivine",     mesh: 80,  cuttingSpeed: 0.9,  surfaceFinish: 1.1,  costPerKg: 0.30 },
};

// ---------------------------------------------------------------------------
// Quality Levels (Q1-Q5)
// ---------------------------------------------------------------------------

interface QualityLevel {
  name: string;
  speedFactor: number;
  ra: number;         // µm typical
  taper: number;      // degrees per 25mm
  description: string;
}

const QUALITY_LEVELS: Record<number, QualityLevel> = {
  1: { name: "Q1 - Separation",   speedFactor: 2.0,  ra: 25,  taper: 0.5,  description: "Rough separation cut, max speed" },
  2: { name: "Q2 - Through Cut",  speedFactor: 1.5,  ra: 12.5, taper: 0.3, description: "Standard through cut" },
  3: { name: "Q3 - Production",   speedFactor: 1.0,  ra: 6.3, taper: 0.15, description: "Good production quality" },
  4: { name: "Q4 - Fine",         speedFactor: 0.6,  ra: 3.2, taper: 0.08, description: "Fine cut quality" },
  5: { name: "Q5 - Precision",    speedFactor: 0.35, ra: 1.6, taper: 0.04, description: "Best finish, slowest speed" },
};

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export interface WaterjetCutResult {
  cuttingSpeed: number;        // mm/min
  kerf: number;                // mm
  mrr: number;                 // mm³/min
  pierceTime: number;          // seconds
  surfaceRoughness: number;    // Ra µm
  taperAngle: number;          // degrees
  edgeQuality: string;
  mode: "pure_water" | "abrasive";
  timeBreakdown: {
    cutting: number;           // minutes
    piercing: number;
    rapid: number;
    total: number;
  };
  consumables: {
    abrasive: number;          // kg
    water: number;             // liters
    power: number;             // kWh
  };
  cost: {
    abrasive: number;
    water: number;
    power: number;
    total: number;
  };
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class WaterjetCuttingEngineImpl {

  calculateParams(params: {
    material: string;
    thickness: number;
    pressure?: number;         // PSI (default 60000)
    quality?: number;          // 1-5
    orificeDiameter?: number;  // mm (default 0.356)
    mixingTubeDiameter?: number; // mm (default 1.016)
    abrasiveType?: string;
    abrasiveRate?: number;     // kg/min
    cutLength?: number;        // mm
    pierces?: number;
    taperCompensation?: boolean;
    forceAbrasive?: boolean;   // Override pure water for soft materials
  }): WaterjetCutResult {
    const material = WATERJET_MATERIALS[params.material] ?? WATERJET_MATERIALS.mild_steel;
    const thickness = params.thickness;
    const pressure = params.pressure ?? 60000;
    const quality = params.quality ?? 3;
    const orificeDia = params.orificeDiameter ?? 0.356;
    const mixingTubeDia = params.mixingTubeDiameter ?? 1.016;
    const abrasiveType = params.abrasiveType ?? "garnet_80";
    const abrasiveRate = params.abrasiveRate ?? 0.45;
    const cutLength = params.cutLength ?? 1000;
    const pierces = params.pierces ?? 5;
    const taperComp = params.taperCompensation ?? false;
    const warnings: string[] = [];

    const abrasive = WATERJET_ABRASIVES[abrasiveType] ?? WATERJET_ABRASIVES.garnet_80;
    const qualityData = QUALITY_LEVELS[quality] ?? QUALITY_LEVELS[3];
    const usePureWater = (material.pureWater && !params.forceAbrasive);

    // Pressure factor normalized to 60k PSI
    const pressureFactor = Math.pow(pressure / 60000, 0.7);
    const orificeArea = Math.PI * Math.pow(orificeDia / 2, 2);
    const flowFactor = orificeArea / (Math.PI * Math.pow(0.356 / 2, 2));

    // Cutting speed
    let baseSpeed: number;
    if (usePureWater) {
      baseSpeed = 500 * material.machinability * pressureFactor * flowFactor * qualityData.speedFactor / Math.pow(thickness, 0.4);
    } else {
      baseSpeed = 100 * material.machinability * pressureFactor * flowFactor * abrasive.cuttingSpeed * qualityData.speedFactor / Math.pow(thickness, 0.6);
    }
    const cuttingSpeed = Math.max(5, Math.min(5000, baseSpeed));

    // Kerf width
    const baseKerf = usePureWater ? orificeDia * 1.2 : mixingTubeDia * 1.1;
    const kerf = baseKerf + 0.05 * thickness / 25;

    // MRR
    const mrr = cuttingSpeed * thickness * kerf;

    // Pierce time
    const basePierceTime = usePureWater ? 0.5 : (2 + thickness * 0.15);
    const pierceTime = basePierceTime * material.pierceTimeFactor * (60000 / pressure);

    // Surface roughness
    const baseRa = qualityData.ra;
    const surfaceRoughness = baseRa * material.qualityFactor * (usePureWater ? 0.8 : (1 / abrasive.surfaceFinish));

    // Taper angle
    let taperAngle = qualityData.taper * (thickness / 25);
    if (taperComp) {
      taperAngle *= 0.1; // Dynamic taper comp reduces ~90%
    }

    // Time breakdown
    const cuttingTime = cutLength / cuttingSpeed;
    const piercingTime = (pierces * pierceTime) / 60;
    const rapidTime = (pierces * 0.3) / 60;
    const totalTime = cuttingTime + piercingTime + rapidTime;

    // Consumables
    const abrasiveUsed = usePureWater ? 0 : abrasiveRate * totalTime;
    const waterFlowRate = 3.8 * Math.pow(orificeDia / 0.356, 2) * Math.pow(pressure / 60000, 0.5);
    const waterUsed = waterFlowRate * totalTime;
    const powerDraw = 30 + pressure / 1000;
    const powerUsed = powerDraw * (totalTime / 60);

    // Cost
    const abrasiveCost = abrasiveUsed * abrasive.costPerKg;
    const waterCost = waterUsed * 0.005;
    const powerCost = powerUsed * 0.12;

    // Edge quality label
    let edgeQuality: string;
    if (quality <= 1) edgeQuality = "Separation";
    else if (quality <= 2) edgeQuality = "Rough";
    else if (quality <= 3) edgeQuality = "Good";
    else if (quality <= 4) edgeQuality = "Very Good";
    else edgeQuality = "Excellent";

    // Warnings
    if (thickness > 150) {
      warnings.push("Extreme thickness — expect reduced accuracy and increased taper");
    }
    if (pressure > 87000) {
      warnings.push("Ultra-high pressure — verify pump and plumbing ratings");
    }
    if (usePureWater && thickness > 25) {
      warnings.push("Pure water mode on thick material — consider abrasive for better results");
    }

    return {
      cuttingSpeed: Math.round(cuttingSpeed),
      kerf: Math.round(kerf * 100) / 100,
      mrr: Math.round(mrr),
      pierceTime: Math.round(pierceTime * 10) / 10,
      surfaceRoughness: Math.round(surfaceRoughness * 10) / 10,
      taperAngle: Math.round(taperAngle * 100) / 100,
      edgeQuality,
      mode: usePureWater ? "pure_water" : "abrasive",
      timeBreakdown: {
        cutting: Math.round(cuttingTime * 10) / 10,
        piercing: Math.round(piercingTime * 10) / 10,
        rapid: Math.round(rapidTime * 10) / 10,
        total: Math.round(totalTime * 10) / 10,
      },
      consumables: {
        abrasive: Math.round(abrasiveUsed * 100) / 100,
        water: Math.round(waterUsed * 10) / 10,
        power: Math.round(powerUsed * 100) / 100,
      },
      cost: {
        abrasive: Math.round(abrasiveCost * 100) / 100,
        water: Math.round(waterCost * 100) / 100,
        power: Math.round(powerCost * 100) / 100,
        total: Math.round((abrasiveCost + waterCost + powerCost) * 100) / 100,
      },
      warnings,
    };
  }

  listMaterials(): Array<{ id: string; name: string; machinability: number; pureWater: boolean }> {
    return Object.entries(WATERJET_MATERIALS).map(([id, m]) => ({
      id, name: m.name, machinability: m.machinability, pureWater: !!m.pureWater,
    }));
  }

  listAbrasives(): Array<{ id: string; name: string; mesh: number; speedFactor: number; costPerKg: number }> {
    return Object.entries(WATERJET_ABRASIVES).map(([id, a]) => ({
      id, name: a.name, mesh: a.mesh, speedFactor: a.cuttingSpeed, costPerKg: a.costPerKg,
    }));
  }

  listQualityLevels(): Array<{ level: number; name: string; ra: number; description: string }> {
    return Object.entries(QUALITY_LEVELS).map(([level, q]) => ({
      level: parseInt(level), name: q.name, ra: q.ra, description: q.description,
    }));
  }
}

export const waterjetCuttingEngine = new WaterjetCuttingEngineImpl();
