export interface FixtureType {
  id: string;
  label: string;
  category: "vise" | "chuck" | "collet" | "plate" | "vacuum" | "magnetic";
  modes: string[];
  maxForceN: number;
}

export const FIXTURE_TYPES: FixtureType[] = [
  // Vises (mill)
  { id: "vise_4", label: "4\" Machine Vise", category: "vise", modes: ["mill"], maxForceN: 22000 },
  { id: "vise_6", label: "6\" Kurt Vise", category: "vise", modes: ["mill"], maxForceN: 35000 },
  { id: "vise_8", label: "8\" Precision Vise", category: "vise", modes: ["mill"], maxForceN: 44000 },
  { id: "vise_dbl", label: "Double Station Vise", category: "vise", modes: ["mill"], maxForceN: 35000 },
  { id: "vise_soft", label: "Soft-Jaw Vise", category: "vise", modes: ["mill"], maxForceN: 30000 },

  // Chucks (lathe)
  { id: "chuck_3jaw_6", label: "6\" 3-Jaw Chuck", category: "chuck", modes: ["lathe"], maxForceN: 40000 },
  { id: "chuck_3jaw_8", label: "8\" 3-Jaw Chuck", category: "chuck", modes: ["lathe"], maxForceN: 55000 },
  { id: "chuck_3jaw_10", label: "10\" 3-Jaw Chuck", category: "chuck", modes: ["lathe"], maxForceN: 70000 },
  { id: "chuck_4jaw_8", label: "8\" 4-Jaw Independent", category: "chuck", modes: ["lathe"], maxForceN: 55000 },
  { id: "chuck_4jaw_12", label: "12\" 4-Jaw Independent", category: "chuck", modes: ["lathe"], maxForceN: 85000 },
  { id: "chuck_pneu", label: "Pneumatic Power Chuck", category: "chuck", modes: ["lathe"], maxForceN: 60000 },
  { id: "chuck_hydra", label: "Hydraulic Power Chuck", category: "chuck", modes: ["lathe"], maxForceN: 80000 },

  // Collets
  { id: "collet_er16", label: "ER16 Collet Chuck", category: "collet", modes: ["mill", "lathe"], maxForceN: 15000 },
  { id: "collet_er20", label: "ER20 Collet Chuck", category: "collet", modes: ["mill", "lathe"], maxForceN: 20000 },
  { id: "collet_er32", label: "ER32 Collet Chuck", category: "collet", modes: ["mill", "lathe"], maxForceN: 30000 },
  { id: "collet_5c", label: "5C Collet Chuck", category: "collet", modes: ["lathe"], maxForceN: 25000 },

  // Fixture plates
  { id: "plate_123", label: "Fixture Plate + 1-2-3 Blocks", category: "plate", modes: ["mill"], maxForceN: 25000 },
  { id: "plate_grid", label: "Modular Grid Plate", category: "plate", modes: ["mill"], maxForceN: 30000 },
  { id: "plate_custom", label: "Custom Clamp Setup", category: "plate", modes: ["mill"], maxForceN: 20000 },

  // Vacuum & Magnetic
  { id: "vacuum", label: "Vacuum Fixture", category: "vacuum", modes: ["mill"], maxForceN: 8000 },
  { id: "magnetic", label: "Magnetic Chuck", category: "magnetic", modes: ["mill", "lathe"], maxForceN: 12000 },
];

export function getFixturesForMode(mode: string): FixtureType[] {
  return FIXTURE_TYPES.filter((f) => f.modes.includes(mode));
}
