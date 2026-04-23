import {
  EXTENDED_MACHINE_CATALOG,
  type ExtendedMachineProfile,
} from "../data/machine-profiles-catalog.js";
import { EXTENDED_MACHINE_CATALOG_EXT } from "../data/machine-profiles-catalog-ext.js";
import { EXTENDED_MACHINE_CATALOG_EXT2 } from "../data/machine-profiles-catalog-ext2.js";

type CalculatorMachineCatalogRow = Record<string, unknown>;

export interface CalculatorMachineCatalogResult {
  machines: CalculatorMachineCatalogRow[];
  total: number;
  hasMore: boolean;
  source: "aggregated";
}

let sourceMachineCatalogRowsCache: CalculatorMachineCatalogRow[] | null = null;

function slugifyToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sourceMachineProfiles(): ExtendedMachineProfile[] {
  return [
    ...EXTENDED_MACHINE_CATALOG,
    ...EXTENDED_MACHINE_CATALOG_EXT,
    ...EXTENDED_MACHINE_CATALOG_EXT2,
  ];
}

function controllerBrand(controller: string): string {
  const trimmed = controller.trim();
  if (!trimmed) return "Controller";

  const knownBrands = [
    "Fanuc",
    "Haas",
    "Heidenhain",
    "Mazatrol",
    "Mazak",
    "Okuma",
    "Siemens",
    "Mitsubishi",
    "Mori",
    "Smooth",
    "Hyper",
    "WinMax",
    "OSP",
  ];
  const match = knownBrands.find((brand) => trimmed.toLowerCase().startsWith(brand.toLowerCase()));
  if (match) return match;

  return trimmed.split(/\s+/)[0] ?? "Controller";
}

function canonicalSourceType(type: ExtendedMachineProfile["type"]): string {
  switch (type) {
    case "VMC":
      return "vertical_machining_center";
    case "HMC":
      return "horizontal_machining_center";
    case "5axis":
      return "5axis_machining_center";
    case "lathe":
      return "turning_center";
    case "mill_turn":
      return "mill_turn_center";
    case "swiss":
      return "swiss_lathe";
    case "bridge":
      return "double_column_machining_center";
    case "router":
      return "gantry_router";
    case "edm_wire":
      return "wire_edm";
    case "edm_sinker":
      return "sinker_edm";
    case "vtl":
      return "vertical_turning_lathe";
    default:
      return String(type);
  }
}

function buildTravels(profile: ExtendedMachineProfile): Record<string, number> {
  const travels: Record<string, number> = {};

  for (const axis of profile.linear_axes) {
    const axisName = axis.name.trim().toUpperCase();
    if (axisName === "X") travels.x = axis.travel_mm;
    if (axisName === "Y") travels.y = axis.travel_mm;
    if (axisName === "Z") travels.z = axis.travel_mm;
  }

  return travels;
}

function inferToolInterface(profile: ExtendedMachineProfile): string | undefined {
  const signature = `${profile.spindle.taper} ${profile.tool_changer.type}`.toUpperCase();
  const captoMatch = signature.match(/CAPTO\s*C(\d+)/i);
  if (captoMatch) return `Capto C${captoMatch[1]}`;

  const bmtMatch = signature.match(/BMT[\s-]?(\d+)/i);
  if (bmtMatch) return `BMT${bmtMatch[1]}`;

  const vdiMatch = signature.match(/VDI[\s-]?(\d+)/i);
  if (vdiMatch) return `VDI${vdiMatch[1]}`;

  if (profile.type === "swiss") return "Gang tooling";
  return undefined;
}

function buildLatheTopology(profile: ExtendedMachineProfile): Record<string, unknown> {
  const turretType = inferToolInterface(profile) ?? profile.tool_changer.type;
  const topology: Record<string, unknown> = {
    turret: {
      stations: profile.tool_changer.capacity,
      type: turretType,
    },
  };

  const liveTooling = profile.type === "mill_turn";
  if (liveTooling) {
    topology.live_tooling = true;
    topology.liveTools = true;
    topology.millingSpindle = {
      max_rpm: profile.spindle.max_rpm,
      taper: profile.spindle.taper,
      power_continuous: profile.spindle.power_kw,
      torque_max: profile.spindle.torque_nm,
    };
  }

  if (profile.type === "swiss") {
    topology.guide_bushing = true;
    topology.toolInterface = "Gang tooling";
  } else if (typeof turretType === "string" && turretType.trim()) {
    topology.toolInterface = turretType;
  }

  return topology;
}

function buildSourceMachineRow(profile: ExtendedMachineProfile, index: number): CalculatorMachineCatalogRow {
  const travels = buildTravels(profile);
  const simultaneousAxes =
    profile.linear_axes.length + (profile.rotary_axes?.length ?? 0);
  const baseRow: CalculatorMachineCatalogRow = {
    id: `source_${slugifyToken(profile.brand)}_${slugifyToken(profile.model)}_${slugifyToken(profile.type)}_${index + 1}`,
    manufacturer: profile.brand,
    model: profile.model,
    name: `${profile.brand} ${profile.model}`,
    type: canonicalSourceType(profile.type),
    layer: "SOURCE_PROFILE",
    source_catalog: "extended_machine_profiles",
    source_profile: true,
    controller: {
      brand: controllerBrand(profile.controller),
      model: profile.controller,
      type: profile.controller,
    },
    spindle: {
      max_rpm: profile.spindle.max_rpm,
      power_continuous: profile.spindle.power_kw,
      torque_max: profile.spindle.torque_nm,
      taper: profile.spindle.taper,
      base_rpm: profile.spindle.base_rpm,
    },
    travels,
    linear_axes: profile.linear_axes.map((axis) => ({
      name: axis.name,
      travel_mm: axis.travel_mm,
      rapid_m_min: axis.rapid_m_min,
      positioning_accuracy_mm: axis.positioning_accuracy_mm,
      repeatability_mm: axis.repeatability_mm,
    })),
    simultaneous_axes: Math.max(simultaneousAxes, profile.type === "lathe" ? 2 : 3),
    weight: profile.weight_kg,
    tool_changer: {
      type: profile.tool_changer.type,
      capacity: profile.tool_changer.capacity,
      change_time_sec: profile.tool_changer.change_time_sec,
      max_tool_diameter_mm: profile.tool_changer.max_tool_diameter_mm,
      max_tool_length_mm: profile.tool_changer.max_tool_length_mm,
      max_tool_weight_kg: profile.tool_changer.max_tool_weight_kg,
    },
  };

  if (Object.keys(travels).length > 0) {
    baseRow.envelope = travels;
  }

  if (profile.rotary_axes?.length) {
    baseRow.rotary_axes = profile.rotary_axes.map((axis) => ({
      name: axis.name,
      min_deg: axis.min_deg,
      max_deg: axis.max_deg,
      continuous: axis.continuous,
      rapid_rpm: axis.rapid_rpm,
      max_torque_nm: axis.max_torque_nm,
      clamping_torque_nm: axis.clamping_torque_nm,
      drive_type: axis.drive_type,
    }));
  }

  if (profile.table) {
    baseRow.table = {
      length_mm: profile.table.length_mm,
      width_mm: profile.table.width_mm,
      max_load_kg: profile.table.max_load_kg,
    };
  }

  if (profile.rotary_table) {
    baseRow.rotary_table = {
      diameter_mm: profile.rotary_table.diameter_mm,
      max_load_kg: profile.rotary_table.max_load_kg,
    };
  }

  if (profile.type === "edm_wire" || profile.type === "edm_sinker") {
    baseRow.coolant = { dielectric: true };
  } else if (profile.type !== "lathe" && profile.type !== "swiss") {
    baseRow.coolant = { flood: true };
    baseRow.atc = { capacity: profile.tool_changer.capacity };
  }

  if (profile.type === "lathe" || profile.type === "mill_turn" || profile.type === "swiss" || profile.type === "vtl") {
    Object.assign(baseRow, buildLatheTopology(profile));
  }

  return baseRow;
}

function sourceMachineCatalogRows(): CalculatorMachineCatalogRow[] {
  if (!sourceMachineCatalogRowsCache) {
    sourceMachineCatalogRowsCache = sourceMachineProfiles().map(buildSourceMachineRow);
  }
  return sourceMachineCatalogRowsCache;
}

export function getCalculatorMachineCatalogRows(args: {
  registryRows?: CalculatorMachineCatalogRow[];
  limit?: number;
  offset?: number;
} = {}): CalculatorMachineCatalogResult {
  const registryRows = args.registryRows ?? [];
  const offset = Math.max(0, Math.trunc(args.offset ?? 0));
  const limit = Math.max(1, Math.trunc(args.limit ?? registryRows.length + sourceMachineCatalogRows().length));
  const combined = [...registryRows, ...sourceMachineCatalogRows()];
  const machines = combined.slice(offset, offset + limit);

  return {
    machines,
    total: combined.length,
    hasMore: offset + machines.length < combined.length,
    source: "aggregated",
  };
}
