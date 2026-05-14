/** ISO 513 material groups with common alloys for the selector */
export interface MaterialEntry {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  hardness: number;
  tensileStrength: number;
  machinability: number;
}

export const ISO_GROUPS: { code: string; label: string; color: string }[] = [
  { code: "P", label: "Steel", color: "#3b82f6" },
  { code: "M", label: "Stainless Steel", color: "#eab308" },
  { code: "K", label: "Cast Iron", color: "#ef4444" },
  { code: "N", label: "Non-Ferrous", color: "#22c55e" },
  { code: "S", label: "Superalloys", color: "#f97316" },
  { code: "H", label: "Hardened Steel", color: "#8b5cf6" },
];

export const MATERIALS: MaterialEntry[] = [
  // P — Steels
  { id: "1045", name: "AISI 1045 Carbon Steel", group: "P", groupLabel: "Steel", hardness: 200, tensileStrength: 630, machinability: 65 },
  { id: "4140", name: "AISI 4140 Alloy Steel", group: "P", groupLabel: "Steel", hardness: 280, tensileStrength: 950, machinability: 55 },
  { id: "4340", name: "AISI 4340 Alloy Steel", group: "P", groupLabel: "Steel", hardness: 300, tensileStrength: 1080, machinability: 50 },
  { id: "1018", name: "AISI 1018 Low Carbon", group: "P", groupLabel: "Steel", hardness: 130, tensileStrength: 440, machinability: 78 },
  { id: "1215", name: "AISI 1215 Free Machining", group: "P", groupLabel: "Steel", hardness: 150, tensileStrength: 520, machinability: 100 },
  { id: "D2", name: "AISI D2 Tool Steel", group: "P", groupLabel: "Steel", hardness: 220, tensileStrength: 760, machinability: 35 },
  { id: "H13", name: "AISI H13 Hot Work Tool Steel", group: "P", groupLabel: "Steel", hardness: 210, tensileStrength: 720, machinability: 40 },
  { id: "A2", name: "AISI A2 Tool Steel", group: "P", groupLabel: "Steel", hardness: 210, tensileStrength: 700, machinability: 42 },
  // M — Stainless Steel
  { id: "304", name: "304 Austenitic Stainless", group: "M", groupLabel: "Stainless Steel", hardness: 170, tensileStrength: 520, machinability: 45 },
  { id: "316", name: "316 Austenitic Stainless", group: "M", groupLabel: "Stainless Steel", hardness: 175, tensileStrength: 550, machinability: 40 },
  { id: "430", name: "430 Ferritic Stainless", group: "M", groupLabel: "Stainless Steel", hardness: 160, tensileStrength: 480, machinability: 55 },
  { id: "17-4PH", name: "17-4 PH Stainless", group: "M", groupLabel: "Stainless Steel", hardness: 350, tensileStrength: 1100, machinability: 35 },
  { id: "2205", name: "2205 Duplex Stainless", group: "M", groupLabel: "Stainless Steel", hardness: 270, tensileStrength: 680, machinability: 30 },
  // K — Cast Iron
  { id: "GG25", name: "GG25 Gray Cast Iron", group: "K", groupLabel: "Cast Iron", hardness: 200, tensileStrength: 250, machinability: 70 },
  { id: "GGG50", name: "GGG50 Ductile Iron", group: "K", groupLabel: "Cast Iron", hardness: 190, tensileStrength: 500, machinability: 60 },
  { id: "GGG70", name: "GGG70 Ductile Iron", group: "K", groupLabel: "Cast Iron", hardness: 250, tensileStrength: 700, machinability: 45 },
  // N — Non-Ferrous
  { id: "6061", name: "6061-T6 Aluminum", group: "N", groupLabel: "Non-Ferrous", hardness: 95, tensileStrength: 310, machinability: 90 },
  { id: "7075", name: "7075-T6 Aluminum", group: "N", groupLabel: "Non-Ferrous", hardness: 150, tensileStrength: 570, machinability: 85 },
  { id: "2024", name: "2024-T3 Aluminum", group: "N", groupLabel: "Non-Ferrous", hardness: 120, tensileStrength: 480, machinability: 80 },
  { id: "C360", name: "C360 Free Machining Brass", group: "N", groupLabel: "Non-Ferrous", hardness: 80, tensileStrength: 340, machinability: 100 },
  { id: "C110", name: "C110 Copper", group: "N", groupLabel: "Non-Ferrous", hardness: 50, tensileStrength: 220, machinability: 60 },
  // S — Superalloys
  { id: "IN718", name: "Inconel 718", group: "S", groupLabel: "Superalloys", hardness: 380, tensileStrength: 1240, machinability: 12 },
  { id: "IN625", name: "Inconel 625", group: "S", groupLabel: "Superalloys", hardness: 290, tensileStrength: 930, machinability: 15 },
  { id: "Ti6Al4V", name: "Ti-6Al-4V Grade 5", group: "S", groupLabel: "Superalloys", hardness: 340, tensileStrength: 950, machinability: 22 },
  { id: "Ti-CP2", name: "CP Titanium Grade 2", group: "S", groupLabel: "Superalloys", hardness: 200, tensileStrength: 345, machinability: 35 },
  { id: "Waspaloy", name: "Waspaloy", group: "S", groupLabel: "Superalloys", hardness: 380, tensileStrength: 1280, machinability: 10 },
  // H — Hardened Steel
  { id: "4140HRC50", name: "4140 @ 50 HRC", group: "H", groupLabel: "Hardened Steel", hardness: 500, tensileStrength: 1700, machinability: 15 },
  { id: "D2HRC60", name: "D2 @ 60 HRC", group: "H", groupLabel: "Hardened Steel", hardness: 620, tensileStrength: 2100, machinability: 8 },
  { id: "H13HRC48", name: "H13 @ 48 HRC", group: "H", groupLabel: "Hardened Steel", hardness: 480, tensileStrength: 1600, machinability: 18 },
];

/** Fuzzy search across name, id, and group label */
export function searchMaterials(query: string): MaterialEntry[] {
  if (!query.trim()) return MATERIALS;
  const q = query.toLowerCase();
  return MATERIALS.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.groupLabel.toLowerCase().includes(q),
  );
}
