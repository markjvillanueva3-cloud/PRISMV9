/**
 * Machine Catalog Inferred Enrichment
 *
 * Fills gaps in the 910-machine catalog using physics-based inference:
 * 1. Torque curves: T = P×9549/RPM with constant-torque/constant-power knee
 * 2. Table load: proportional to table area and machine class
 * 3. Accuracy: from machine class and manufacturer tier
 * 4. Collision zones: from machine type templates
 * 5. Weight: from machine envelope scaling
 *
 * Reference: Siemens Technical Guide — Spindle Drive Fundamentals
 */

export interface TorqueCurve {
  base_rpm: number;
  max_rpm: number;
  max_torque_Nm: number;
  power_kw: number;
  points: Array<{ rpm: number; torque_Nm: number }>;
}

export interface InferredCollisionZone {
  id: string;
  type: "cylinder" | "box";
  position: { x: number; y: number; z: number };
  dimensions: Record<string, number>;
  description: string;
}

export interface MachineEnrichment {
  torque_curve?: TorqueCurve;
  table_max_load_kg?: number;
  positioning_accuracy_mm?: number;
  repeatability_mm?: number;
  collision_zones?: InferredCollisionZone[];
  weight_kg?: number;
}

/**
 * Infer torque curve from power and RPM.
 * Spindle motor: constant torque below base RPM, constant power above.
 * Base RPM depends on taper type (determines motor design point).
 */
export function inferTorqueCurve(
  power_kw: number,
  max_rpm: number,
  taper?: string,
): TorqueCurve {
  // Base RPM (constant-torque/constant-power knee) varies by spindle design
  const taperRatios: Record<string, number> = {
    "BT30": 0.60, "CAT30": 0.60, "HSK-E32": 0.65, "HSK-E40": 0.60,
    "BT40": 0.50, "CAT40": 0.50, "HSK-A63": 0.45, "HSK-F63": 0.45,
    "BT50": 0.35, "CAT50": 0.35, "HSK-A100": 0.30, "HSK-A80": 0.35,
    "Capto C6": 0.40, "Capto C8": 0.35,
  };

  const ratio = taperRatios[taper ?? ""] ?? 0.45;
  const base_rpm = Math.round(max_rpm * ratio);
  const max_torque_Nm = Math.round((power_kw * 9549) / base_rpm * 10) / 10;

  // Generate 5-point curve
  const points = [
    { rpm: 0, torque_Nm: max_torque_Nm },
    { rpm: base_rpm * 0.5, torque_Nm: max_torque_Nm },
    { rpm: base_rpm, torque_Nm: max_torque_Nm }, // knee point
    { rpm: Math.round((base_rpm + max_rpm) / 2), torque_Nm: Math.round(power_kw * 9549 / ((base_rpm + max_rpm) / 2) * 10) / 10 },
    { rpm: max_rpm, torque_Nm: Math.round(power_kw * 9549 / max_rpm * 10) / 10 },
  ];

  return { base_rpm, max_rpm, max_torque_Nm, power_kw, points };
}

/**
 * Infer table max load from machine type and table dimensions.
 */
export function inferTableLoad(
  machine_type: string,
  table_length_mm?: number,
  table_width_mm?: number,
  taper?: string,
): number {
  const type = (machine_type || "").toLowerCase();

  // Base load by machine class
  let baseLoad = 500; // kg default
  if (type.includes("5") || type.includes("five")) baseLoad = 300;
  else if (type.includes("hmc") || type.includes("horizontal")) baseLoad = 800;
  else if (type.includes("vmc") || type.includes("vertical")) baseLoad = 500;
  else if (type.includes("gantry") || type.includes("bridge")) baseLoad = 2000;
  else if (type.includes("lathe") || type.includes("turn")) baseLoad = 200;

  // Scale by taper (bigger spindle = bigger machine = more load capacity)
  const taperScale: Record<string, number> = {
    "BT30": 0.5, "CAT30": 0.5, "HSK-E32": 0.4, "HSK-E40": 0.5,
    "BT40": 1.0, "CAT40": 1.0, "HSK-A63": 1.2, "HSK-F63": 1.0,
    "BT50": 2.0, "CAT50": 2.0, "HSK-A100": 2.5, "HSK-A80": 1.8,
  };
  const scale = taperScale[taper ?? ""] ?? 1.0;

  // Scale by table area if available
  let areaScale = 1.0;
  if (table_length_mm && table_width_mm) {
    const area_m2 = (table_length_mm * table_width_mm) / 1e6;
    areaScale = Math.max(0.5, Math.min(3.0, area_m2 / 0.5)); // normalize to 500x1000mm table
  }

  return Math.round(baseLoad * scale * areaScale);
}

/**
 * Infer positioning accuracy from machine class and manufacturer.
 */
export function inferAccuracy(
  machine_type: string,
  manufacturer?: string,
): { positioning_mm: number; repeatability_mm: number } {
  const type = (machine_type || "").toLowerCase();
  const mfr = (manufacturer || "").toLowerCase();

  // Ultra-precision brands
  const ultraPrecision = ["kern", "yasda", "roku-roku", "datron", "makino"];
  const highPrecision = ["hermle", "dmg mori", "gf machining", "mikron", "mori seiki"];

  if (ultraPrecision.some(b => mfr.includes(b))) {
    return { positioning_mm: 0.002, repeatability_mm: 0.001 };
  }
  if (highPrecision.some(b => mfr.includes(b))) {
    return { positioning_mm: 0.003, repeatability_mm: 0.002 };
  }

  // Standard accuracy by type
  if (type.includes("hmc") || type.includes("horizontal")) {
    return { positioning_mm: 0.004, repeatability_mm: 0.002 };
  }
  if (type.includes("5") || type.includes("five")) {
    return { positioning_mm: 0.005, repeatability_mm: 0.003 };
  }
  if (type.includes("lathe") || type.includes("turn")) {
    return { positioning_mm: 0.005, repeatability_mm: 0.003 };
  }
  // Default VMC
  return { positioning_mm: 0.005, repeatability_mm: 0.003 };
}

/**
 * Infer collision zones from machine type template.
 */
export function inferCollisionZones(
  machine_type: string,
  work_volume: { x: number; y: number; z: number },
): InferredCollisionZone[] {
  const type = (machine_type || "").toLowerCase();
  const zones: InferredCollisionZone[] = [];

  // Spindle nose — all machines
  zones.push({
    id: "spindle_nose",
    type: "cylinder",
    position: { x: 0, y: 0, z: work_volume.z + 50 },
    dimensions: { radius: 75, height: 150 },
    description: "Spindle nose and bearing housing",
  });

  if (type.includes("vmc") || type.includes("vertical") || type.includes("5")) {
    // Column
    zones.push({
      id: "column",
      type: "box",
      position: { x: 0, y: work_volume.y / 2 + 200, z: work_volume.z / 2 },
      dimensions: { width: work_volume.x + 200, depth: 400, height: work_volume.z + 500 },
      description: "Machine column",
    });

    // Tool changer
    zones.push({
      id: "tool_changer",
      type: "cylinder",
      position: { x: work_volume.x / 2 + 300, y: 0, z: work_volume.z + 200 },
      dimensions: { radius: 250, height: 400 },
      description: "ATC carousel/drum",
    });
  }

  if (type.includes("hmc") || type.includes("horizontal")) {
    // Pallet changer
    zones.push({
      id: "pallet_changer",
      type: "box",
      position: { x: -work_volume.x / 2 - 300, y: 0, z: 0 },
      dimensions: { width: 600, depth: work_volume.y + 200, height: 300 },
      description: "Pallet changer mechanism",
    });
  }

  if (type.includes("lathe") || type.includes("turn")) {
    // Tailstock
    zones.push({
      id: "tailstock",
      type: "cylinder",
      position: { x: work_volume.x + 100, y: 0, z: 0 },
      dimensions: { radius: 80, height: 200 },
      description: "Tailstock assembly",
    });

    // Chuck
    zones.push({
      id: "chuck",
      type: "cylinder",
      position: { x: -100, y: 0, z: 0 },
      dimensions: { radius: 150, height: 100 },
      description: "Workholding chuck",
    });
  }

  return zones;
}

/**
 * Infer machine weight from envelope and type.
 * Based on empirical data: weight scales with cube root of work volume × class factor.
 */
export function inferWeight(
  machine_type: string,
  work_volume: { x: number; y: number; z: number },
): number {
  const type = (machine_type || "").toLowerCase();
  const vol_m3 = (work_volume.x * work_volume.y * work_volume.z) / 1e9;

  // Class factors (kg per m³ of work volume — empirical)
  let factor = 50000; // default VMC
  if (type.includes("hmc") || type.includes("horizontal")) factor = 80000;
  else if (type.includes("gantry") || type.includes("bridge")) factor = 30000;
  else if (type.includes("5") || type.includes("five")) factor = 60000;
  else if (type.includes("lathe") || type.includes("turn")) factor = 40000;
  else if (type.includes("swiss") || type.includes("sliding")) factor = 15000;
  else if (type.includes("edm")) factor = 20000;

  const weight = Math.round(factor * Math.pow(vol_m3, 0.7)); // sub-linear scaling
  return Math.max(500, Math.min(100000, weight)); // clamp to reasonable range
}

/**
 * Master enrichment function — fills all gaps for a machine.
 */
export function enrichMachine(machine: {
  power_kw: number;
  max_rpm: number;
  taper?: string;
  machine_type?: string;
  manufacturer?: string;
  table_length_mm?: number;
  table_width_mm?: number;
  table_max_load_kg?: number;
  work_volume?: { x: number; y: number; z: number };
  positioning_accuracy_mm?: number;
  repeatability_mm?: number;
  weight_kg?: number;
  has_collision_zones?: boolean;
}): MachineEnrichment {
  const enrichment: MachineEnrichment = {};

  // 1. Torque curve (always generate — adds value even if torque_nm exists)
  enrichment.torque_curve = inferTorqueCurve(machine.power_kw, machine.max_rpm, machine.taper);

  // 2. Table load (only if missing/zero)
  if (!machine.table_max_load_kg || machine.table_max_load_kg === 0) {
    enrichment.table_max_load_kg = inferTableLoad(
      machine.machine_type ?? "", machine.table_length_mm, machine.table_width_mm, machine.taper
    );
  }

  // 3. Accuracy (only if missing)
  if (!machine.positioning_accuracy_mm) {
    const acc = inferAccuracy(machine.machine_type ?? "", machine.manufacturer);
    enrichment.positioning_accuracy_mm = acc.positioning_mm;
    enrichment.repeatability_mm = acc.repeatability_mm;
  }

  // 4. Collision zones (only if missing)
  if (!machine.has_collision_zones && machine.work_volume) {
    enrichment.collision_zones = inferCollisionZones(machine.machine_type ?? "", machine.work_volume);
  }

  // 5. Weight (only if missing)
  if (!machine.weight_kg && machine.work_volume) {
    enrichment.weight_kg = inferWeight(machine.machine_type ?? "", machine.work_volume);
  }

  return enrichment;
}
