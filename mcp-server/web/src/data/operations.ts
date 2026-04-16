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
      { id: "boring", label: "Boring", category: "turning", icon: "T", defaults: { tool_diameter: 25, number_of_teeth: 1, depth: 1.5, width: 1.5, tool_material: "Carbide", coolant: "flood" } },
      { id: "parting", label: "Parting / Grooving", category: "turning", icon: "T", defaults: { tool_diameter: 3, number_of_teeth: 1, depth: 20, width: 3, tool_material: "Carbide", coolant: "flood" } },
    ],
  },
  {
    id: "drilling",
    label: "Drilling",
    operations: [
      { id: "drilling", label: "Twist Drill", category: "drilling", icon: "D", defaults: { tool_diameter: 10, number_of_teeth: 2, depth: 30, width: 10, tool_material: "Carbide", coolant: "flood" } },
      { id: "reaming", label: "Reaming", category: "drilling", icon: "D", defaults: { tool_diameter: 10, number_of_teeth: 6, depth: 25, width: 10, tool_material: "Carbide", coolant: "flood" } },
      { id: "tapping", label: "Tapping", category: "drilling", icon: "D", defaults: { tool_diameter: 10, number_of_teeth: 1, depth: 15, width: 10, tool_material: "HSS", coolant: "flood" } },
    ],
  },
  {
    id: "grinding",
    label: "Grinding",
    operations: [
      { id: "surface_grinding", label: "Surface Grinding", category: "grinding", icon: "G", defaults: { tool_diameter: 200, number_of_teeth: 1, depth: 0.02, width: 20, tool_material: "CBN", coolant: "flood" } },
      { id: "cylindrical_grinding", label: "Cylindrical Grinding", category: "grinding", icon: "G", defaults: { tool_diameter: 300, number_of_teeth: 1, depth: 0.01, width: 30, tool_material: "CBN", coolant: "flood" } },
    ],
  },
  {
    id: "threading",
    label: "Threading",
    operations: [
      { id: "thread_milling", label: "Thread Milling", category: "threading", icon: "Th", defaults: { tool_diameter: 8, number_of_teeth: 3, depth: 12, width: 8, tool_material: "Carbide", coolant: "flood" } },
      { id: "single_point_thread", label: "Single-Point Threading", category: "threading", icon: "Th", defaults: { tool_diameter: 12, number_of_teeth: 1, depth: 1, width: 1, tool_material: "Carbide", coolant: "flood" } },
    ],
  },
];

/** Flat list of all operations */
export const ALL_OPERATIONS = OPERATION_CATEGORIES.flatMap((c) => c.operations);

export function getOperationById(id: string): OperationType | undefined {
  return ALL_OPERATIONS.find((o) => o.id === id);
}
