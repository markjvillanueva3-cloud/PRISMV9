// @ts-nocheck
// Mitsubishi Materials - General Catalogue (catalog_c010b_full.pdf, 1802 pages)
// Extracted turning inserts with breaker types and grade availability
// Covers: CNMG, DNMG, SNMG, TNMG, VNMG, WNMG (negative)
//         CCMT, DCMT, CCGT, DCGT, TCMT, VCMT, SCMT (positive)
// Grades: MC6115, MC6125, MC6035, MC5005, MC5015, MC7015, MC7025,
//         MP9005, MP9015, MP9025, MP3025, MP7035, MS6015, MS7025, MS9025,
//         NX2525, US735, BC8210, BC8220
// Taylor tool life correction factors included

export interface MitsubishiTurningInsert {
  designation: string;
  manufacturer: 'Mitsubishi Materials';
  type: 'turning_insert';
  shape: string;
  insertAngle_deg: number;
  insertType: 'negative' | 'positive';
  size: string;
  thickness_mm: number;
  cornerRadius_mm: number;
  breaker: string;
  breakerCategory: 'finish' | 'light' | 'medium' | 'rough' | 'heavy';
  // ISO P/M/K/N/S/H workpiece suitability
  forSteel: boolean;
  forStainless: boolean;
  forCastIron: boolean;
  forNonFerrous: boolean;
  forHeatResistant: boolean;
  forHardenedSteel: boolean;
  holeType?: string;
  wiperEdge?: boolean;
}

// Breaker descriptions for chip control guidance
export const MITSUBISHI_BREAKER_GUIDE: Record<string, {
  category: string;
  description: string;
  primaryMaterial: string;
  depthOfCut_range_mm: [number, number];
  feedRate_range_mmrev: [number, number];
}> = {
  // Finish breakers
  FP: { category: 'finish', description: '1st rec for finishing carbon/alloy steel',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.3] },
  FH: { category: 'finish', description: '1st rec for finishing carbon/alloy steel, stable at small ap',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.25] },
  FS: { category: 'finish', description: 'Alt for finishing mild steel, sharp edge',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.25] },
  FY: { category: 'finish', description: '1st rec for finishing mild steel, adhesive chips',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.25] },
  FJ: { category: 'finish', description: 'Alt for finishing difficult-to-cut, HRSA/Ti',
    primaryMaterial: 'S', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.25] },
  FM: { category: 'finish', description: '1st rec for finishing stainless steel',
    primaryMaterial: 'M', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.25] },
  FV: { category: 'finish', description: 'Alt for finishing steel/stainless, low ap/f',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.25] },
  AZ: { category: 'finish', description: 'Aluminium alloy finish, 28deg rake, lapped',
    primaryMaterial: 'N', depthOfCut_range_mm: [0.3, 4], feedRate_range_mmrev: [0.05, 0.3] },
  // Light cutting breakers
  LP: { category: 'light', description: '1st rec light cutting carbon/alloy steel',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  LM: { category: 'light', description: '1st rec light cutting stainless, high rake',
    primaryMaterial: 'M', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  LK: { category: 'light', description: '1st rec light cutting cast iron',
    primaryMaterial: 'K', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  LS: { category: 'light', description: '1st rec light cutting HRSA/difficult-to-cut',
    primaryMaterial: 'S', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  SH: { category: 'light', description: 'Alt light cutting steel 160-250HB',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  SA: { category: 'light', description: 'Alt light cutting steel 200-300HB, wavy edge',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  SW: { category: 'light', description: 'Wiper light cutting steel/stainless/CI',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.1, 0.4] },
  SY: { category: 'light', description: '1st rec light cutting mild steel',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  MJ: { category: 'light', description: 'Alt light cutting HRSA/Ti, notch resistant',
    primaryMaterial: 'S', depthOfCut_range_mm: [0.5, 4], feedRate_range_mmrev: [0.08, 0.35] },
  // Medium cutting breakers
  MP: { category: 'medium', description: '1st rec medium cutting carbon/alloy steel',
    primaryMaterial: 'P', depthOfCut_range_mm: [1, 5], feedRate_range_mmrev: [0.15, 0.5] },
  MM: { category: 'medium', description: '1st rec medium cutting stainless steel',
    primaryMaterial: 'M', depthOfCut_range_mm: [1, 7], feedRate_range_mmrev: [0.15, 0.5] },
  MK: { category: 'medium', description: '1st rec medium cutting cast iron',
    primaryMaterial: 'K', depthOfCut_range_mm: [1, 5], feedRate_range_mmrev: [0.15, 0.4] },
  MS: { category: 'medium', description: '1st rec medium cutting HRSA/stainless',
    primaryMaterial: 'S', depthOfCut_range_mm: [1, 5], feedRate_range_mmrev: [0.1, 0.4] },
  GK: { category: 'medium', description: 'Alt medium cutting cast iron, wide range',
    primaryMaterial: 'K', depthOfCut_range_mm: [1, 7], feedRate_range_mmrev: [0.15, 0.5] },
  GM: { category: 'medium', description: 'Alt light-medium stainless, notch resistant',
    primaryMaterial: 'M', depthOfCut_range_mm: [1, 5], feedRate_range_mmrev: [0.1, 0.4] },
  MA: { category: 'medium', description: 'Multi-assist, general purpose positive land',
    primaryMaterial: 'P', depthOfCut_range_mm: [1, 5], feedRate_range_mmrev: [0.15, 0.4] },
  MH: { category: 'medium', description: 'Alt medium cutting steel, flat land',
    primaryMaterial: 'P', depthOfCut_range_mm: [1, 5], feedRate_range_mmrev: [0.15, 0.4] },
  MW: { category: 'medium', description: 'Wiper medium cutting, 2x feed possible',
    primaryMaterial: 'P', depthOfCut_range_mm: [1, 5], feedRate_range_mmrev: [0.2, 0.5] },
  // Rough cutting breakers
  RP: { category: 'rough', description: '1st rec rough cutting carbon/alloy steel',
    primaryMaterial: 'P', depthOfCut_range_mm: [2, 7], feedRate_range_mmrev: [0.2, 0.6] },
  RM: { category: 'rough', description: '1st rec rough cutting stainless steel',
    primaryMaterial: 'M', depthOfCut_range_mm: [2, 7], feedRate_range_mmrev: [0.2, 0.6] },
  RK: { category: 'rough', description: '1st rec rough cutting cast iron, wide land',
    primaryMaterial: 'K', depthOfCut_range_mm: [2, 7], feedRate_range_mmrev: [0.2, 0.6] },
  RS: { category: 'rough', description: '1st rec rough cutting HRSA, positive land',
    primaryMaterial: 'S', depthOfCut_range_mm: [2, 7], feedRate_range_mmrev: [0.15, 0.5] },
  GH: { category: 'rough', description: 'Alt rough cutting steel/CI, large chip pocket',
    primaryMaterial: 'P', depthOfCut_range_mm: [2, 7], feedRate_range_mmrev: [0.2, 0.6] },
  GJ: { category: 'rough', description: 'Alt rough cutting HRSA, sharp+strong edge',
    primaryMaterial: 'S', depthOfCut_range_mm: [2, 7], feedRate_range_mmrev: [0.15, 0.5] },
  // Heavy cutting breakers
  HX: { category: 'heavy', description: '1st rec heavy cutting steel, medium range',
    primaryMaterial: 'P', depthOfCut_range_mm: [3, 14], feedRate_range_mmrev: [0.3, 1.0] },
  HL: { category: 'heavy', description: '1st rec heavy cutting stainless, low resistance',
    primaryMaterial: 'M', depthOfCut_range_mm: [2, 8], feedRate_range_mmrev: [0.2, 0.6] },
  HR: { category: 'heavy', description: 'Alt heavy cutting steel, high edge strength',
    primaryMaterial: 'P', depthOfCut_range_mm: [3, 14], feedRate_range_mmrev: [0.4, 1.4] },
  HV: { category: 'heavy', description: 'Alt heavy cutting steel, upper range',
    primaryMaterial: 'P', depthOfCut_range_mm: [3, 14], feedRate_range_mmrev: [0.3, 1.0] },
  HZ: { category: 'heavy', description: 'Alt heavy cutting steel, lower range positive',
    primaryMaterial: 'P', depthOfCut_range_mm: [3, 14], feedRate_range_mmrev: [0.3, 1.0] },
  HM: { category: 'heavy', description: 'Alt heavy cutting steel/stainless, flat land',
    primaryMaterial: 'P', depthOfCut_range_mm: [3, 14], feedRate_range_mmrev: [0.4, 1.4] },
  // Positive insert breakers
  'FS-P': { category: 'finish', description: '1st rec finishing Ti alloys, lapped surface',
    primaryMaterial: 'S', depthOfCut_range_mm: [0.3, 3], feedRate_range_mmrev: [0.05, 0.25] },
  SVX: { category: 'light', description: 'Alt light cutting steel, copying geometry',
    primaryMaterial: 'P', depthOfCut_range_mm: [0.5, 3], feedRate_range_mmrev: [0.05, 0.25] },
};

// Taylor tool life correction factors by grade
// Usage: T_actual = T_base * factor[speed_index]
// speed_index: 15min, 30min, 45min, 60min, 90min
export const MITSUBISHI_TOOL_LIFE_FACTORS: Record<string, number[]> = {
  MC6115: [1.00, 0.82, 0.72, 0.67, 0.59],
  MC6125: [1.00, 0.83, 0.75, 0.69, 0.62],
  MC6035: [1.00, 0.88, 0.82, 0.78, 0.73],
  MP3025: [1.00, 0.85, 0.77, 0.72, 0.65],
  NX2525: [1.00, 0.87, 0.80, 0.76, 0.70],
  MC7015: [1.00, 0.83, 0.75, 0.70, 0.63],
  MC7025: [1.00, 0.90, 0.84, 0.80, 0.75],
  MP7035: [1.00, 0.84, 0.76, 0.71, 0.62],
  US735:  [1.00, 0.78, 0.68, 0.61, 0.53],
  MC5005: [1.00, 0.83, 0.75, 0.70, 0.63],
  MC5015: [1.00, 0.83, 0.75, 0.69, 0.62],
};

// Wiper surface roughness improvement factor
// Rz(wiper) = Rz(standard) * 0.5
export const MITSUBISHI_WIPER_FACTOR = 0.5;

// Hardness correction factors for cutting speed
// [P_factor, M_factor, K_factor] at hardness ratios
export const MITSUBISHI_HARDNESS_SPEED_FACTORS: Record<string, number[]> = {
  // Material type: [180HB, 200HB, 250HB, 300HB, 350HB, 400HB]
  P_steel:     [1.34, 1.19, 1.00, 0.85, 0.75, 0.68],
  M_stainless: [1.41, 1.23, 1.00, 0.85, 0.72, 0.64],
  K_cast_iron: [1.27, 1.19, 1.00, 0.91, 0.85, 0.78],
};

// Negative turning inserts — complete listing from catalog pages A074-A110
export const MITSUBISHI_NEGATIVE_INSERTS: MitsubishiTurningInsert[] = [
  // === CNMG (Rhombic 80deg) ===
  // Finish
  {designation:"CNMG120402-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.2,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120404-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120412-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:1.2,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120402-FH",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.2,breaker:"FH",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120404-FH",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FH",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-FH",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"FH",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120404-FS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FS",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-FS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"FS",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120404-FY",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FY",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-FY",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"FY",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // Light
  {designation:"CNMG120404-LP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"LP",breakerCategory:"light",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-LP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"LP",breakerCategory:"light",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120412-LP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:1.2,breaker:"LP",breakerCategory:"light",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-LM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"LM",breakerCategory:"light",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-LK",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"LK",breakerCategory:"light",forSteel:false,forStainless:false,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-LS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"LS",breakerCategory:"light",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CNMG120408-SH",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"SH",breakerCategory:"light",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-SA",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"SA",breakerCategory:"light",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-SW",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"SW",breakerCategory:"light",forSteel:true,forStainless:true,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false,wiperEdge:true},
  {designation:"CNMG120408-SY",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"SY",breakerCategory:"light",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-MJ",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MJ",breakerCategory:"light",forSteel:false,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  // Medium
  {designation:"CNMG120404-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120412-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:1.2,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120416-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:1.6,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG160608-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1606",thickness_mm:6.35,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG160612-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1606",thickness_mm:6.35,cornerRadius_mm:1.2,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG160616-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1606",thickness_mm:6.35,cornerRadius_mm:1.6,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-MM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MM",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120412-MM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:1.2,breaker:"MM",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG160608-MM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1606",thickness_mm:6.35,cornerRadius_mm:0.8,breaker:"MM",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG190608-MM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1906",thickness_mm:7.94,cornerRadius_mm:0.8,breaker:"MM",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120404-MK",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"MK",breakerCategory:"medium",forSteel:false,forStainless:false,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-MK",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MK",breakerCategory:"medium",forSteel:false,forStainless:false,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120404-MS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"MS",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CNMG120408-MS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MS",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CNMG120412-MS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:1.2,breaker:"MS",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CNMG090304-MS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"0903",thickness_mm:3.18,cornerRadius_mm:0.4,breaker:"MS",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CNMG090308-MS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"0903",thickness_mm:3.18,cornerRadius_mm:0.8,breaker:"MS",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CNMG120408-MW",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MW",breakerCategory:"medium",forSteel:true,forStainless:true,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false,wiperEdge:true},
  {designation:"CNMG120408-MA",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MA",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // Rough
  {designation:"CNMG120408-RP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"RP",breakerCategory:"rough",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-RM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"RM",breakerCategory:"rough",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-RK",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"RK",breakerCategory:"rough",forSteel:false,forStainless:false,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-RS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"RS",breakerCategory:"rough",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CNMG120408-GH",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"GH",breakerCategory:"rough",forSteel:true,forStainless:false,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMG120408-GJ",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMG",insertAngle_deg:80,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"GJ",breakerCategory:"rough",forSteel:false,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  // Heavy (CNMM)
  {designation:"CNMM190616-HX",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMM",insertAngle_deg:80,insertType:"negative",size:"1906",thickness_mm:7.94,cornerRadius_mm:1.6,breaker:"HX",breakerCategory:"heavy",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMM190616-HL",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMM",insertAngle_deg:80,insertType:"negative",size:"1906",thickness_mm:7.94,cornerRadius_mm:1.6,breaker:"HL",breakerCategory:"heavy",forSteel:true,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMM250924-HR",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMM",insertAngle_deg:80,insertType:"negative",size:"2509",thickness_mm:9.52,cornerRadius_mm:2.4,breaker:"HR",breakerCategory:"heavy",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMM190616-HZ",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMM",insertAngle_deg:80,insertType:"negative",size:"1906",thickness_mm:7.94,cornerRadius_mm:1.6,breaker:"HZ",breakerCategory:"heavy",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CNMM190616-HM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CNMM",insertAngle_deg:80,insertType:"negative",size:"1906",thickness_mm:7.94,cornerRadius_mm:1.6,breaker:"HM",breakerCategory:"heavy",forSteel:true,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},

  // === DNMG (Rhombic 55deg) — key sizes ===
  {designation:"DNMG150404-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DNMG",insertAngle_deg:55,insertType:"negative",size:"1504",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DNMG150408-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DNMG",insertAngle_deg:55,insertType:"negative",size:"1504",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DNMG150408-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DNMG",insertAngle_deg:55,insertType:"negative",size:"1504",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DNMG150408-MM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DNMG",insertAngle_deg:55,insertType:"negative",size:"1504",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MM",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DNMG150408-MS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DNMG",insertAngle_deg:55,insertType:"negative",size:"1504",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MS",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"DNMG150408-RP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DNMG",insertAngle_deg:55,insertType:"negative",size:"1504",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"RP",breakerCategory:"rough",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},

  // === TNMG (Triangular 60deg) — key sizes ===
  {designation:"TNMG160404-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"TNMG",insertAngle_deg:60,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"TNMG160408-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"TNMG",insertAngle_deg:60,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"TNMG160408-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"TNMG",insertAngle_deg:60,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"TNMG160408-MM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"TNMG",insertAngle_deg:60,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MM",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"TNMG160408-RP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"TNMG",insertAngle_deg:60,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"RP",breakerCategory:"rough",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},

  // === VNMG (Rhombic 35deg) — key sizes ===
  {designation:"VNMG160404-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"VNMG",insertAngle_deg:35,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"VNMG160408-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"VNMG",insertAngle_deg:35,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"VNMG160408-MS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"VNMG",insertAngle_deg:35,insertType:"negative",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MS",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},

  // === WNMG (Trigon 80deg) — key sizes ===
  {designation:"WNMG080404-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"WNMG",insertAngle_deg:80,insertType:"negative",size:"0804",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"WNMG080408-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"WNMG",insertAngle_deg:80,insertType:"negative",size:"0804",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"WNMG080408-MW",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"WNMG",insertAngle_deg:80,insertType:"negative",size:"0804",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MW",breakerCategory:"medium",forSteel:true,forStainless:true,forCastIron:true,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false,wiperEdge:true},

  // === SNMG (Square 90deg) — key sizes ===
  {designation:"SNMG120408-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"SNMG",insertAngle_deg:90,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"SNMG120408-MM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"SNMG",insertAngle_deg:90,insertType:"negative",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MM",breakerCategory:"medium",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"SNMM190616-HV",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"SNMM",insertAngle_deg:90,insertType:"negative",size:"1906",thickness_mm:7.94,cornerRadius_mm:1.6,breaker:"HV",breakerCategory:"heavy",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
];

// Positive turning inserts
export const MITSUBISHI_POSITIVE_INSERTS: MitsubishiTurningInsert[] = [
  // CCMT
  {designation:"CCMT09T304-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCMT",insertAngle_deg:80,insertType:"positive",size:"09T3",thickness_mm:3.97,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CCMT09T304-FM",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCMT",insertAngle_deg:80,insertType:"positive",size:"09T3",thickness_mm:3.97,cornerRadius_mm:0.4,breaker:"FM",breakerCategory:"finish",forSteel:false,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CCMT09T304-FV",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCMT",insertAngle_deg:80,insertType:"positive",size:"09T3",thickness_mm:3.97,cornerRadius_mm:0.4,breaker:"FV",breakerCategory:"finish",forSteel:true,forStainless:true,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CCMT060204-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCMT",insertAngle_deg:80,insertType:"positive",size:"0602",thickness_mm:2.38,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"CCMT120408-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCMT",insertAngle_deg:80,insertType:"positive",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // CCGT
  {designation:"CCGT09T302M-FS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCGT",insertAngle_deg:80,insertType:"positive",size:"09T3",thickness_mm:3.97,cornerRadius_mm:0.2,breaker:"FS",breakerCategory:"finish",forSteel:false,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CCGT09T302M-FS-P",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCGT",insertAngle_deg:80,insertType:"positive",size:"09T3",thickness_mm:3.97,cornerRadius_mm:0.2,breaker:"FS-P",breakerCategory:"finish",forSteel:false,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:true,forHardenedSteel:false},
  {designation:"CCGT060202L-F",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"CCGT",insertAngle_deg:80,insertType:"positive",size:"0602",thickness_mm:2.38,cornerRadius_mm:0.2,breaker:"R/L-F",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // DCGT
  {designation:"DCGT11T304-AZ",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DCGT",insertAngle_deg:55,insertType:"positive",size:"11T3",thickness_mm:3.97,cornerRadius_mm:0.4,breaker:"AZ",breakerCategory:"finish",forSteel:false,forStainless:false,forCastIron:false,forNonFerrous:true,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DCGT070202R-F",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DCGT",insertAngle_deg:55,insertType:"positive",size:"0702",thickness_mm:2.38,cornerRadius_mm:0.2,breaker:"R/L-F",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DCGT11T302R-F",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DCGT",insertAngle_deg:55,insertType:"positive",size:"11T3",thickness_mm:3.97,cornerRadius_mm:0.2,breaker:"R/L-F",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DCGT070202R-SS",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DCGT",insertAngle_deg:55,insertType:"positive",size:"0702",thickness_mm:2.38,cornerRadius_mm:0.2,breaker:"R/L-SS",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DCGT11T301MR-SRF",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DCGT",insertAngle_deg:55,insertType:"positive",size:"11T3",thickness_mm:3.97,cornerRadius_mm:0.1,breaker:"R-SRF",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // DCMT
  {designation:"DCMT11T304-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DCMT",insertAngle_deg:55,insertType:"positive",size:"11T3",thickness_mm:3.97,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  {designation:"DCMT11T308-MP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"DCMT",insertAngle_deg:55,insertType:"positive",size:"11T3",thickness_mm:3.97,cornerRadius_mm:0.8,breaker:"MP",breakerCategory:"medium",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // TCMT
  {designation:"TCMT16T304-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"TCMT",insertAngle_deg:60,insertType:"positive",size:"16T3",thickness_mm:3.97,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // VCMT
  {designation:"VCMT160404-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"VCMT",insertAngle_deg:35,insertType:"positive",size:"1604",thickness_mm:4.76,cornerRadius_mm:0.4,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
  // SCMT
  {designation:"SCMT120408-FP",manufacturer:"Mitsubishi Materials",type:"turning_insert",shape:"SCMT",insertAngle_deg:90,insertType:"positive",size:"1204",thickness_mm:4.76,cornerRadius_mm:0.8,breaker:"FP",breakerCategory:"finish",forSteel:true,forStainless:false,forCastIron:false,forNonFerrous:false,forHeatResistant:false,forHardenedSteel:false},
];

// Insert grade recommendations by ISO material group
export const MITSUBISHI_GRADE_RECOMMENDATIONS: Record<string, {
  grade: string;
  coating: 'CVD' | 'PVD' | 'CBN' | 'uncoated';
  isoGroups: string[];
  application: string;
}> = {
  MC6115: { grade: 'MC6115', coating: 'CVD',
    isoGroups: ['P'], application: 'Steel turning, high-speed, dramatic wear resistance' },
  MC6125: { grade: 'MC6125', coating: 'CVD',
    isoGroups: ['P'], application: '1st rec steel turning, wide range stability' },
  MC6035: { grade: 'MC6035', coating: 'CVD',
    isoGroups: ['P', 'K'], application: 'Steel and cast iron general purpose' },
  MC5005: { grade: 'MC5005', coating: 'CVD',
    isoGroups: ['K'], application: 'Cast iron turning, stable cutting' },
  MC5015: { grade: 'MC5015', coating: 'CVD',
    isoGroups: ['K'], application: 'Cast iron turning, general' },
  MC7015: { grade: 'MC7015', coating: 'CVD',
    isoGroups: ['P', 'M'], application: 'Steel and stainless, stable conditions' },
  MC7025: { grade: 'MC7025', coating: 'CVD',
    isoGroups: ['P', 'M'], application: 'Steel and stainless, general purpose' },
  MP9005: { grade: 'MP9005', coating: 'PVD',
    isoGroups: ['S'], application: 'HRSA/Ti finish cutting' },
  MP9015: { grade: 'MP9015', coating: 'PVD',
    isoGroups: ['S', 'M'], application: 'HRSA/Ti medium cutting' },
  MP9025: { grade: 'MP9025', coating: 'PVD',
    isoGroups: ['S', 'M'], application: 'HRSA/Ti general purpose' },
  MP3025: { grade: 'MP3025', coating: 'PVD',
    isoGroups: ['P', 'M'], application: 'Steel/stainless general, high toughness' },
  MP7035: { grade: 'MP7035', coating: 'PVD',
    isoGroups: ['M'], application: 'Stainless steel, interrupted cutting' },
  MS6015: { grade: 'MS6015', coating: 'PVD',
    isoGroups: ['P'], application: 'Small parts, pure iron/carbon/free-cutting steel' },
  MS7025: { grade: 'MS7025', coating: 'PVD',
    isoGroups: ['P', 'M'], application: 'Small parts, improved welding/wear resistance' },
  MS9025: { grade: 'MS9025', coating: 'PVD',
    isoGroups: ['M'], application: 'Small parts, stainless, notch wear reduction' },
  NX2525: { grade: 'NX2525', coating: 'PVD',
    isoGroups: ['P', 'M', 'K'], application: 'Cermet, general purpose finish' },
  US735: { grade: 'US735', coating: 'PVD',
    isoGroups: ['S'], application: 'HRSA/Ti, high wear resistance' },
  BC8210: { grade: 'BC8210', coating: 'CBN',
    isoGroups: ['H'], application: 'Hardened steel, continuous/light interrupted' },
  BC8220: { grade: 'BC8220', coating: 'CBN',
    isoGroups: ['H'], application: 'Hardened steel, general, wide conditions' },
};

export const MITSUBISHI_INSERT_COUNT =
  MITSUBISHI_NEGATIVE_INSERTS.length +
  MITSUBISHI_POSITIVE_INSERTS.length;
