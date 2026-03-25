export interface OperationType {
  id: string;
  label: string;
  category: string;
  icon: string;
  defaults: {
    tool_diameter: number;
    number_of_teeth: number;
    depth: number;
    width: number;
    tool_material: string;
    coolant: string;
  };
}

export interface OperationCategory {
  id: string;
  label: string;
  operations: OperationType[];
}

export const OPERATION_CATEGORIES: OperationCategory[] = [
  {
    id: "milling",
    label: "Milling",
    operations: [
      { id: "face_milling", label: "Face Milling", category: "milling", icon: "M", defaults: { tool_diameter: 50, number_of_teeth: 6, depth: 2, width: 40, tool_material: "Carbide", coolant: "flood" } },
      { id: "slot_milling", label: "Slot Milling", category: "milling", icon: "M", defaults: { tool_diameter: 12, number_of_teeth: 4, depth: 6, width: 12, tool_material: "Carbide", coolant: "flood" } },
      { id: "pocket_milling", label: "Pocket Milling", category: "milling", icon: "M", defaults: { tool_diameter: 16, number_of_teeth: 4, depth: 4, width: 8, tool_material: "Carbide", coolant: "flood" } },
      { id: "profile_milling", label: "Profile / Contour", category: "milling", icon: "M", defaults: { tool_diameter: 12, number_of_teeth: 4, depth: 8, width: 1, tool_material: "Carbide", coolant: "flood" } },
      { id: "semi-finishing", label: "Semi-Finishing", category: "milling", icon: "M", defaults: { tool_diameter: 10, number_of_teeth: 4, depth: 1.5, width: 3, tool_material: "Carbide", coolant: "flood" } },
      { id: "finishing", label: "Finishing", category: "milling", icon: "M", defaults: { tool_diameter: 8, number_of_teeth: 4, depth: 0.5, width: 2, tool_material: "Carbide", coolant: "flood" } },
    ],
  },
  {
    id: "turning",
    label: "Turning",
    operations: [
      { id: "rough_turning", label: "Rough Turning", category: "turning", icon: "T", defaults: { tool_diameter: 12, number_of_teeth: 1, depth: 3, width: 3, tool_material: "Carbide", coolant: "flood" } },
      { id: "finish_turning", label: "Finish Turning", category: "turning", icon: "T", defaults: { tool_diameter: 8, number_of_teeth: 1, depth: 0.5, width: 0.5, tool_material: "Carbide", coolant: "flood" } },
      { id: "boring_turn", label: "Boring", category: "turning", icon: "T", defaults: { tool_diameter: 25, number_of_teeth: 1, depth: 1.5, width: 1.5, tool_material: "Carbide", coolant: "flood" } },
      { id: "parting", label: "Parting / Grooving", category: "turning", icon: "T", defaults: { tool_diameter: 3, number_of_teeth: 1, depth: 20, width: 3, tool_material: "Carbide", coolant: "flood" } },
      { id: "facing", label: "Facing", category: "turning", icon: "T", defaults: { tool_diameter: 12, number_of_teeth: 1, depth: 1.5, width: 2, tool_material: "Carbide", coolant: "flood" } },
    ],
  },
  {
    id: "drilling",
    label: "Drilling",
    operations: [
      { id: "drilling", label: "Twist Drill", category: "drilling", icon: "D", defaults: { tool_diameter: 10, number_of_teeth: 2, depth: 30, width: 10, tool_material: "Carbide", coolant: "flood" } },
      { id: "reaming", label: "Reaming", category: "drilling", icon: "D", defaults: { tool_diameter: 10, number_of_teeth: 6, depth: 25, width: 10, tool_material: "Carbide", coolant: "flood" } },
      { id: "tapping", label: "Tapping", category: "drilling", icon: "D", defaults: { tool_diameter: 10, number_of_teeth: 1, depth: 15, width: 10, tool_material: "HSS", coolant: "flood" } },
      { id: "center_drill", label: "Center Drill", category: "drilling", icon: "D", defaults: { tool_diameter: 3.15, number_of_teeth: 2, depth: 4, width: 3.15, tool_material: "HSS", coolant: "flood" } },
      { id: "peck_drill", label: "Peck Drill", category: "drilling", icon: "D", defaults: { tool_diameter: 10, number_of_teeth: 2, depth: 50, width: 10, tool_material: "Carbide", coolant: "flood" } },
      { id: "gun_drill", label: "Gun Drill", category: "drilling", icon: "D", defaults: { tool_diameter: 8, number_of_teeth: 1, depth: 200, width: 8, tool_material: "Carbide", coolant: "through_tool" } },
    ],
  },
  {
    id: "grinding",
    label: "Grinding",
    operations: [
      { id: "surface_grinding", label: "Surface Grinding", category: "grinding", icon: "G", defaults: { tool_diameter: 200, number_of_teeth: 1, depth: 0.02, width: 20, tool_material: "CBN", coolant: "flood" } },
      { id: "cylindrical_grinding", label: "Cylindrical Grinding", category: "grinding", icon: "G", defaults: { tool_diameter: 300, number_of_teeth: 1, depth: 0.01, width: 30, tool_material: "CBN", coolant: "flood" } },
      { id: "internal_grinding", label: "Internal Grinding", category: "grinding", icon: "G", defaults: { tool_diameter: 25, number_of_teeth: 1, depth: 0.005, width: 10, tool_material: "CBN", coolant: "flood" } },
      { id: "centerless_grinding", label: "Centerless Grinding", category: "grinding", icon: "G", defaults: { tool_diameter: 350, number_of_teeth: 1, depth: 0.015, width: 25, tool_material: "Aluminum Oxide", coolant: "flood" } },
      { id: "creep_feed", label: "Creep Feed", category: "grinding", icon: "G", defaults: { tool_diameter: 200, number_of_teeth: 1, depth: 3, width: 10, tool_material: "CBN", coolant: "flood" } },
    ],
  },
  {
    id: "threading",
    label: "Threading",
    operations: [
      { id: "thread_milling", label: "Thread Milling", category: "threading", icon: "Th", defaults: { tool_diameter: 8, number_of_teeth: 3, depth: 12, width: 8, tool_material: "Carbide", coolant: "flood" } },
      { id: "single_point_thread", label: "Single-Point Threading", category: "threading", icon: "Th", defaults: { tool_diameter: 12, number_of_teeth: 1, depth: 1, width: 1, tool_material: "Carbide", coolant: "flood" } },
      { id: "thread_tapping", label: "Thread Tapping", category: "threading", icon: "Th", defaults: { tool_diameter: 10, number_of_teeth: 1, depth: 15, width: 10, tool_material: "HSS", coolant: "flood" } },
      { id: "thread_rolling", label: "Thread Rolling", category: "threading", icon: "Th", defaults: { tool_diameter: 10, number_of_teeth: 1, depth: 0, width: 10, tool_material: "HSS", coolant: "none" } },
    ],
  },
  {
    id: "honing",
    label: "Honing",
    operations: [
      { id: "bore_honing", label: "Bore Honing", category: "honing", icon: "H", defaults: { tool_diameter: 50, number_of_teeth: 1, depth: 0.02, width: 50, tool_material: "CBN", coolant: "flood" } },
      { id: "plateau_honing", label: "Plateau Honing", category: "honing", icon: "H", defaults: { tool_diameter: 80, number_of_teeth: 1, depth: 0.005, width: 80, tool_material: "Diamond", coolant: "flood" } },
      { id: "cross_hatch", label: "Cross-Hatch", category: "honing", icon: "H", defaults: { tool_diameter: 50, number_of_teeth: 1, depth: 0.01, width: 50, tool_material: "CBN", coolant: "flood" } },
    ],
  },
  {
    id: "boring",
    label: "Boring",
    operations: [
      { id: "line_boring", label: "Line Boring", category: "boring", icon: "B", defaults: { tool_diameter: 40, number_of_teeth: 1, depth: 1.5, width: 1.5, tool_material: "Carbide", coolant: "flood" } },
      { id: "jig_boring", label: "Jig Boring", category: "boring", icon: "B", defaults: { tool_diameter: 20, number_of_teeth: 1, depth: 0.5, width: 0.5, tool_material: "Carbide", coolant: "flood" } },
      { id: "back_boring", label: "Back Boring", category: "boring", icon: "B", defaults: { tool_diameter: 30, number_of_teeth: 1, depth: 1, width: 1, tool_material: "Carbide", coolant: "flood" } },
      { id: "fine_boring", label: "Fine Boring", category: "boring", icon: "B", defaults: { tool_diameter: 25, number_of_teeth: 1, depth: 0.1, width: 0.1, tool_material: "Carbide", coolant: "flood" } },
    ],
  },
  {
    id: "broaching",
    label: "Broaching",
    operations: [
      { id: "internal_broaching", label: "Internal Broaching", category: "broaching", icon: "Br", defaults: { tool_diameter: 20, number_of_teeth: 30, depth: 0.06, width: 20, tool_material: "HSS", coolant: "flood" } },
      { id: "surface_broaching", label: "Surface Broaching", category: "broaching", icon: "Br", defaults: { tool_diameter: 25, number_of_teeth: 40, depth: 0.05, width: 50, tool_material: "HSS", coolant: "flood" } },
      { id: "pot_broaching", label: "Pot Broaching", category: "broaching", icon: "Br", defaults: { tool_diameter: 30, number_of_teeth: 20, depth: 0.08, width: 30, tool_material: "Carbide", coolant: "flood" } },
    ],
  },
  {
    id: "plasma",
    label: "Plasma",
    operations: [
      { id: "hidef_plasma", label: "HiDef Plasma", category: "plasma", icon: "P", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 25, width: 1.2, tool_material: "N/A", coolant: "none" } },
      { id: "conventional_plasma", label: "Conventional Plasma", category: "plasma", icon: "P", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 50, width: 2.5, tool_material: "N/A", coolant: "none" } },
      { id: "fine_plasma", label: "Fine Plasma", category: "plasma", icon: "P", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 12, width: 0.8, tool_material: "N/A", coolant: "none" } },
    ],
  },
  {
    id: "wire_edm",
    label: "Wire EDM",
    operations: [
      { id: "first_cut", label: "First Cut", category: "wire_edm", icon: "W", defaults: { tool_diameter: 0.25, number_of_teeth: 0, depth: 50, width: 0.3, tool_material: "Brass Wire", coolant: "deionized_water" } },
      { id: "skim_cut", label: "Skim Cut", category: "wire_edm", icon: "W", defaults: { tool_diameter: 0.25, number_of_teeth: 0, depth: 50, width: 0.02, tool_material: "Brass Wire", coolant: "deionized_water" } },
      { id: "taper_cut", label: "Taper Cut", category: "wire_edm", icon: "W", defaults: { tool_diameter: 0.25, number_of_teeth: 0, depth: 30, width: 0.3, tool_material: "Brass Wire", coolant: "deionized_water" } },
    ],
  },
  {
    id: "sinker_edm",
    label: "Sinker EDM",
    operations: [
      { id: "rough_burn", label: "Rough Burn", category: "sinker_edm", icon: "E", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 5, width: 0.3, tool_material: "Copper", coolant: "dielectric" } },
      { id: "finish_burn", label: "Finish Burn", category: "sinker_edm", icon: "E", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 2, width: 0.05, tool_material: "Graphite", coolant: "dielectric" } },
      { id: "micro_edm", label: "Micro EDM", category: "sinker_edm", icon: "E", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 0.5, width: 0.01, tool_material: "Tungsten", coolant: "dielectric" } },
      { id: "orbiting", label: "Orbiting", category: "sinker_edm", icon: "E", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 3, width: 0.15, tool_material: "Copper", coolant: "dielectric" } },
    ],
  },
  {
    id: "laser",
    label: "Laser",
    operations: [
      { id: "fiber_laser", label: "Fiber Laser", category: "laser", icon: "L", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 20, width: 0.15, tool_material: "N/A", coolant: "assist_gas" } },
      { id: "co2_laser", label: "CO\u2082 Laser", category: "laser", icon: "L", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 25, width: 0.2, tool_material: "N/A", coolant: "assist_gas" } },
      { id: "disk_laser", label: "Disk Laser", category: "laser", icon: "L", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 15, width: 0.12, tool_material: "N/A", coolant: "assist_gas" } },
      { id: "laser_engraving", label: "Laser Engraving", category: "laser", icon: "L", defaults: { tool_diameter: 0, number_of_teeth: 0, depth: 0.1, width: 0.05, tool_material: "N/A", coolant: "none" } },
    ],
  },
  {
    id: "waterjet",
    label: "Waterjet",
    operations: [
      { id: "abrasive_waterjet", label: "Abrasive Waterjet", category: "waterjet", icon: "Wj", defaults: { tool_diameter: 0.76, number_of_teeth: 0, depth: 100, width: 1.0, tool_material: "Garnet", coolant: "none" } },
      { id: "pure_waterjet", label: "Pure Waterjet", category: "waterjet", icon: "Wj", defaults: { tool_diameter: 0.1, number_of_teeth: 0, depth: 25, width: 0.15, tool_material: "N/A", coolant: "none" } },
      { id: "dynamic_waterjet", label: "Dynamic Waterjet", category: "waterjet", icon: "Wj", defaults: { tool_diameter: 0.76, number_of_teeth: 0, depth: 75, width: 0.9, tool_material: "Garnet", coolant: "none" } },
    ],
  },
];

/** Flat list of all operations */
export const ALL_OPERATIONS = OPERATION_CATEGORIES.flatMap((c) => c.operations);

export function getOperationById(id: string): OperationType | undefined {
  return ALL_OPERATIONS.find((o) => o.id === id);
}

/** Get operations for a given category */
export function getOperationsByCategory(categoryId: string): OperationType[] {
  const cat = OPERATION_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.operations ?? [];
}
