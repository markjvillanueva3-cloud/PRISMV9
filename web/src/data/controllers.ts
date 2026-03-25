export interface ControllerEntry {
  id: string;
  brand: string;
  model: string;
  /** Which machine modes this controller supports */
  modes: string[];
}

export const CONTROLLERS: ControllerEntry[] = [
  { id: "fanuc_0i", brand: "Fanuc", model: "0i-TF Plus", modes: ["mill", "lathe"] },
  { id: "fanuc_31i", brand: "Fanuc", model: "31i-B5", modes: ["mill", "lathe"] },
  { id: "fanuc_18i", brand: "Fanuc", model: "18i-T", modes: ["lathe"] },
  { id: "siemens_840d", brand: "Siemens", model: "840D sl", modes: ["mill", "lathe"] },
  { id: "siemens_828d", brand: "Siemens", model: "828D", modes: ["mill", "lathe"] },
  { id: "haas_ngc", brand: "Haas", model: "NGC (Next Gen)", modes: ["mill", "lathe"] },
  { id: "mazak_smooth", brand: "Mazak", model: "SmoothAi", modes: ["mill", "lathe"] },
  { id: "mazak_matrix", brand: "Mazak", model: "MAZATROL Matrix", modes: ["mill", "lathe"] },
  { id: "okuma_osp", brand: "Okuma", model: "OSP-P300A", modes: ["mill", "lathe"] },
  { id: "heidenhain_tnc", brand: "Heidenhain", model: "TNC 640", modes: ["mill"] },
  { id: "mitsubishi_m80", brand: "Mitsubishi", model: "M80", modes: ["mill", "lathe"] },
  { id: "brother_c00", brand: "Brother", model: "C00", modes: ["mill"] },
  { id: "sodick_lq", brand: "Sodick", model: "LQ Series", modes: ["wire_edm"] },
  { id: "makino_hyper", brand: "Makino", model: "HYPER-i", modes: ["wire_edm", "sinker_edm"] },
  { id: "charmilles_robofil", brand: "AgieCharmilles", model: "CUT P Series", modes: ["wire_edm"] },
  { id: "mitsubishi_edm", brand: "Mitsubishi", model: "D-CUBES", modes: ["wire_edm", "sinker_edm"] },
  { id: "trumpf_trulaser", brand: "TRUMPF", model: "TruLaser", modes: ["laser"] },
  { id: "mazak_optiplex", brand: "Mazak", model: "OPTIPLEX", modes: ["laser"] },
  { id: "amada_ensis", brand: "Amada", model: "ENSIS", modes: ["laser"] },
  { id: "omax_intelli", brand: "OMAX", model: "IntelliMAX", modes: ["waterjet"] },
  { id: "flow_mach", brand: "Flow", model: "Mach Series", modes: ["waterjet"] },
  { id: "wardjet", brand: "WARDJet", model: "Z-Series", modes: ["waterjet"] },
];

export function getControllersForMode(mode: string): ControllerEntry[] {
  return CONTROLLERS.filter((c) => c.modes.includes(mode));
}

export interface SpindleSpec {
  id: string;
  label: string;
  maxRpm: number;
  powerKw: number;
  taper: string;
  type: "belt" | "direct" | "gear" | "built_in";
}

export const SPINDLE_PRESETS: SpindleSpec[] = [
  { id: "belt_8k", label: "Belt Drive 8,100 RPM", maxRpm: 8100, powerKw: 11.2, taper: "CAT40", type: "belt" },
  { id: "belt_10k", label: "Belt Drive 10,000 RPM", maxRpm: 10000, powerKw: 14.9, taper: "CAT40", type: "belt" },
  { id: "direct_12k", label: "Direct Drive 12,000 RPM", maxRpm: 12000, powerKw: 22.4, taper: "CAT40", type: "direct" },
  { id: "direct_15k", label: "Direct Drive 15,000 RPM", maxRpm: 15000, powerKw: 26, taper: "BT40", type: "direct" },
  { id: "gear_6k", label: "Gear Head 6,000 RPM", maxRpm: 6000, powerKw: 30, taper: "CAT50", type: "gear" },
  { id: "builtin_20k", label: "Built-In 20,000 RPM", maxRpm: 20000, powerKw: 26, taper: "HSK-A63", type: "built_in" },
  { id: "builtin_30k", label: "Built-In 30,000 RPM", maxRpm: 30000, powerKw: 18, taper: "HSK-E40", type: "built_in" },
  { id: "lathe_4k", label: "Lathe Spindle 4,000 RPM", maxRpm: 4000, powerKw: 18.5, taper: "A2-6", type: "belt" },
  { id: "lathe_6k", label: "Lathe Spindle 6,000 RPM", maxRpm: 6000, powerKw: 22, taper: "A2-6", type: "direct" },
];

export interface AtcSpec {
  id: string;
  label: string;
  capacity: number;
  type: "carousel" | "arm" | "rack" | "turret";
}

export const ATC_PRESETS: AtcSpec[] = [
  { id: "carousel_20", label: "20-Pocket Carousel", capacity: 20, type: "carousel" },
  { id: "carousel_24", label: "24-Pocket Carousel", capacity: 24, type: "carousel" },
  { id: "arm_30", label: "30-Pocket Side Mount", capacity: 30, type: "arm" },
  { id: "arm_40", label: "40-Pocket Side Mount", capacity: 40, type: "arm" },
  { id: "rack_60", label: "60-Pocket Rack", capacity: 60, type: "rack" },
  { id: "rack_120", label: "120-Pocket Matrix", capacity: 120, type: "rack" },
  { id: "turret_8", label: "8-Station Turret", capacity: 8, type: "turret" },
  { id: "turret_12", label: "12-Station VDI40 Turret", capacity: 12, type: "turret" },
  { id: "turret_16", label: "16-Station BMT55 Turret", capacity: 16, type: "turret" },
];
