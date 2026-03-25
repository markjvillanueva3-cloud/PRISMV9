export interface TaperType {
  id: string;
  label: string;
  modes: string[];
}

export const TAPER_TYPES: TaperType[] = [
  { id: "cat40", label: "CAT 40", modes: ["mill"] },
  { id: "cat50", label: "CAT 50", modes: ["mill"] },
  { id: "bt30", label: "BT 30", modes: ["mill"] },
  { id: "bt40", label: "BT 40", modes: ["mill"] },
  { id: "bt50", label: "BT 50", modes: ["mill"] },
  { id: "hsk_a63", label: "HSK-A63", modes: ["mill"] },
  { id: "hsk_e40", label: "HSK-E40", modes: ["mill"] },
  { id: "vdi25", label: "VDI 25", modes: ["lathe"] },
  { id: "vdi40", label: "VDI 40", modes: ["lathe"] },
  { id: "vdi50", label: "VDI 50", modes: ["lathe"] },
  { id: "bmt55", label: "BMT 55", modes: ["lathe"] },
  { id: "bmt65", label: "BMT 65", modes: ["lathe"] },
  { id: "morse_2", label: "Morse #2", modes: ["mill", "lathe"] },
  { id: "morse_3", label: "Morse #3", modes: ["mill", "lathe"] },
];

export function getTapersForMode(mode: string): TaperType[] {
  return TAPER_TYPES.filter((t) => t.modes.includes(mode));
}

export interface HolderType {
  id: string;
  label: string;
  category: "endmill" | "collet" | "shell" | "boring" | "drill" | "lathe_od" | "lathe_id";
}

export const HOLDER_TYPES: HolderType[] = [
  { id: "er_collet", label: "ER Collet Chuck", category: "collet" },
  { id: "milling_chuck", label: "Milling Chuck", category: "endmill" },
  { id: "shrink_fit", label: "Shrink Fit", category: "endmill" },
  { id: "hydraulic", label: "Hydraulic Chuck", category: "endmill" },
  { id: "side_lock", label: "Side Lock (Weldon)", category: "endmill" },
  { id: "shell_arbor", label: "Shell Mill Arbor", category: "shell" },
  { id: "boring_head", label: "Boring Head", category: "boring" },
  { id: "drill_chuck", label: "Drill Chuck", category: "drill" },
  { id: "od_holder", label: "OD Turning Holder", category: "lathe_od" },
  { id: "id_holder", label: "ID Boring Bar Holder", category: "lathe_id" },
  { id: "grooving_holder", label: "Grooving/Parting Holder", category: "lathe_od" },
  { id: "threading_holder", label: "Threading Holder", category: "lathe_od" },
];

export const SHANK_DIAMETERS_MM = [6, 8, 10, 12, 16, 20, 25, 32];
export const SHANK_DIAMETERS_IN = [0.25, 0.375, 0.5, 0.625, 0.75, 1.0, 1.25];

export type OverhangClass = "short" | "standard" | "long" | "extra_long";
export const OVERHANG_OPTIONS: { id: OverhangClass; label: string; ratio: string }[] = [
  { id: "short", label: "Short", ratio: "≤2×D" },
  { id: "standard", label: "Standard", ratio: "3×D" },
  { id: "long", label: "Long", ratio: "4-5×D" },
  { id: "extra_long", label: "Extra Long", ratio: "6×D+" },
];

export interface InsertGrade {
  id: string;
  label: string;
  use: string;
}

export const INSERT_GRADES: InsertGrade[] = [
  { id: "roughing", label: "Roughing", use: "High feed, stock removal" },
  { id: "medium", label: "Medium", use: "General purpose" },
  { id: "finishing", label: "Finishing", use: "Fine finish, tight tolerance" },
  { id: "super_finishing", label: "Super Finishing", use: "Mirror finish, minimal depth" },
];

export interface CoatingType {
  id: string;
  label: string;
  color: string;
  maxTemp: number;
}

export const COATING_TYPES: CoatingType[] = [
  { id: "uncoated", label: "Uncoated", color: "gray", maxTemp: 400 },
  { id: "tin", label: "TiN", color: "gold", maxTemp: 600 },
  { id: "ticn", label: "TiCN", color: "purple", maxTemp: 500 },
  { id: "altin", label: "AlTiN", color: "silver", maxTemp: 900 },
  { id: "tialn", label: "TiAlN", color: "bronze", maxTemp: 800 },
  { id: "diamond", label: "Diamond (CVD)", color: "white", maxTemp: 700 },
  { id: "cbn", label: "CBN", color: "dark", maxTemp: 1200 },
];

export interface InsertGeometry {
  id: string;
  label: string;
  noseRadius: number;
  description: string;
}

export const INSERT_GEOMETRIES: InsertGeometry[] = [
  { id: "cnmg", label: "CNMG", noseRadius: 0.8, description: "80° rhombic, neg. rake — general turning" },
  { id: "wnmg", label: "WNMG", noseRadius: 0.8, description: "80° trigon, neg. rake — finishing" },
  { id: "dnmg", label: "DNMG", noseRadius: 0.4, description: "55° rhombic, neg. rake — profiling" },
  { id: "tnmg", label: "TNMG", noseRadius: 0.4, description: "60° triangle, neg. rake — versatile" },
  { id: "vnmg", label: "VNMG", noseRadius: 0.4, description: "35° rhombic, neg. rake — copy turning" },
  { id: "ccmt", label: "CCMT", noseRadius: 0.4, description: "80° rhombic, pos. rake — light cuts" },
  { id: "dcmt", label: "DCMT", noseRadius: 0.2, description: "55° rhombic, pos. rake — finishing" },
  { id: "apkt", label: "APKT", noseRadius: 0.8, description: "Square, pos. rake — milling insert" },
  { id: "rpmt", label: "RPMT", noseRadius: 3.0, description: "Round — button milling" },
  { id: "spmt", label: "SPMT", noseRadius: 0.8, description: "Square — high-feed milling" },
];
