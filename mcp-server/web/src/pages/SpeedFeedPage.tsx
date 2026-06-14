import { useState, useCallback, useMemo, useEffect } from "react";
import { Button, Card, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useSpeedFeedOrchestrate, useSpeedFeedOptimize } from "../hooks/useSpeedFeed";
import type { OrchestratorInput, OrchestratorResult, OptimizeResult } from "../types/speedfeed";

type Mode = "quick" | "full" | "optimize";
type CalibrationOverrides = NonNullable<OrchestratorInput["calibration_overrides"]>;

type SelectOption = {
  value: string;
  label: string;
};

type MachinePreset = {
  id: string;
  label: string;
  note: string;
  values: Partial<OrchestratorInput>;
};

const inputClass = "w-full px-2 py-1.5 text-sm border rounded bg-white";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";
const sectionClass = "rounded border border-slate-200 bg-slate-50/60 p-3";

const JM_DIE_MACHINES: MachinePreset[] = [
  {
    id: "jm-haas-vf2",
    label: "JM Die - Haas VF-2",
    note: "CAT40 vertical mill baseline for steel roughing and general die work.",
    values: {
      machine_name: "Haas VF-2",
      machine_power_kw: 22.4,
      machine_max_rpm: 8100,
      machine_max_torque_nm: 122,
      machine_rigidity: "medium",
      machine_guideway: "linear",
      machine_type: "vertical_mill",
      spindle_taper: "CAT40",
      spindle_bearing_preload: "medium",
      machine_age_years: 8,
      machine_axis_accel_m_s2: 5.5,
      machine_axis_jerk_m_s3: 70,
      natural_frequency_hz: 155,
      system_stiffness_n_m: 11000000,
      damping_ratio: 0.045,
    },
  },
  {
    id: "jm-hurco-vm10i",
    label: "JM Die - Hurco VM10i",
    note: "Compact CAT40 mill profile for smaller blocks and fixture work.",
    values: {
      machine_name: "Hurco VM10i",
      machine_power_kw: 11,
      machine_max_rpm: 12000,
      machine_max_torque_nm: 70,
      machine_rigidity: "medium",
      machine_guideway: "linear",
      machine_type: "vertical_mill",
      spindle_taper: "CAT40",
      spindle_bearing_preload: "medium",
      machine_age_years: 6,
      machine_axis_accel_m_s2: 4.5,
      machine_axis_jerk_m_s3: 55,
      natural_frequency_hz: 145,
      system_stiffness_n_m: 9000000,
      damping_ratio: 0.05,
    },
  },
  {
    id: "jm-hurco-vmx30i",
    label: "JM Die - Hurco VMX30i",
    note: "Larger Hurco envelope for medium die plates and production milling.",
    values: {
      machine_name: "Hurco VMX30i",
      machine_power_kw: 18,
      machine_max_rpm: 12000,
      machine_max_torque_nm: 95,
      machine_rigidity: "medium",
      machine_guideway: "linear",
      machine_type: "vertical_mill",
      spindle_taper: "CAT40",
      spindle_bearing_preload: "medium",
      machine_age_years: 6,
      machine_axis_accel_m_s2: 4.8,
      machine_axis_jerk_m_s3: 60,
      natural_frequency_hz: 135,
      system_stiffness_n_m: 10000000,
      damping_ratio: 0.05,
    },
  },
  {
    id: "jm-rokuroku-hsm5",
    label: "JM Die - Roku-Roku HSM-5",
    note: "High-speed finishing profile for small tools, hard material, and tight finish targets.",
    values: {
      machine_name: "Roku-Roku HSM-5",
      machine_power_kw: 15,
      machine_max_rpm: 30000,
      machine_max_torque_nm: 48,
      machine_rigidity: "high",
      machine_guideway: "linear",
      machine_type: "vertical_mill",
      spindle_taper: "HSK-E40",
      spindle_bearing_preload: "light",
      machine_age_years: 7,
      machine_axis_accel_m_s2: 8,
      machine_axis_jerk_m_s3: 120,
      natural_frequency_hz: 240,
      system_stiffness_n_m: 13000000,
      damping_ratio: 0.035,
    },
  },
  {
    id: "jm-okuma-mu4000v",
    label: "JM Die - Okuma MU-4000V",
    note: "5-axis HSK profile for contoured die features and simultaneous finishing.",
    values: {
      machine_name: "Okuma MU-4000V",
      machine_power_kw: 22,
      machine_max_rpm: 20000,
      machine_max_torque_nm: 85,
      machine_rigidity: "high",
      machine_guideway: "linear",
      machine_type: "5axis",
      spindle_taper: "HSK-A63",
      spindle_bearing_preload: "medium",
      machine_age_years: 5,
      machine_axis_accel_m_s2: 6.5,
      machine_axis_jerk_m_s3: 90,
      natural_frequency_hz: 185,
      system_stiffness_n_m: 15000000,
      damping_ratio: 0.04,
    },
  },
];

const CATALOG_MACHINES = [
  "Haas VF-4", "Haas VF-6", "Haas MiniMill", "Haas DM-2",
  "DMG Mori DMU 50", "DMG Mori DMC 850 V", "DMG Mori DMF 260",
  "Mazak Variaxis i-300", "Mazak Variaxis i-700",
  "Okuma Genos M560-V", "Okuma MU-5000V",
  "Fanuc Robodrill", "Makino A51NX", "Makino D500",
  "Brother Speedio R650X2", "Hermle C 400", "Hermle C 650",
  "Doosan DNM 500", "Matsuura MX-520", "Grob G350", "Kern Micro HD",
];

const MACHINE_PRESETS: MachinePreset[] = [
  ...JM_DIE_MACHINES,
  ...CATALOG_MACHINES.map(machine => ({
    id: `catalog-${machine}`,
    label: machine,
    note: "Catalog resolver lookup",
    values: { machine_name: machine },
  })),
];

const CAM_SYSTEMS = [
  "Mastercam", "Fusion360", "hyperMILL", "SolidCAM", "NX CAM",
  "ESPRIT", "GibbsCAM", "Edgecam", "PowerMill", "CATIA",
  "BobCAD", "CAMWorks", "TopSolid", "WorkNC", "Cimatron",
  "Tebis", "SprutCAM",
];

const STRATEGIES: SelectOption[] = [
  { value: "conventional", label: "Conventional" },
  { value: "adaptive", label: "Adaptive / Dynamic" },
  { value: "trochoidal", label: "Trochoidal" },
  { value: "hsm", label: "High Speed Machining" },
  { value: "hpc", label: "High Performance Cutting" },
  { value: "plunge", label: "Plunge Roughing" },
  { value: "slot", label: "Full Slot" },
];

const ISO_GROUPS: SelectOption[] = [
  { value: "P", label: "P - Steel" },
  { value: "M", label: "M - Stainless" },
  { value: "K", label: "K - Cast Iron" },
  { value: "N", label: "N - Non-ferrous" },
  { value: "S", label: "S - Superalloy/Titanium" },
  { value: "H", label: "H - Hardened" },
];

const TOOL_MATERIALS: SelectOption[] = [
  { value: "carbide", label: "Carbide" },
  { value: "hss", label: "HSS" },
  { value: "cermet", label: "Cermet" },
  { value: "ceramic", label: "Ceramic" },
  { value: "cbn", label: "CBN" },
  { value: "pcd", label: "PCD" },
];

const COATINGS = [
  "TiAlN", "AlTiN", "TiN", "AlCrN", "DLC", "ZrN", "diamond", "uncoated",
];

const HOLDER_TYPES: SelectOption[] = [
  { value: "shrink_fit", label: "Shrink Fit" },
  { value: "hydraulic", label: "Hydraulic" },
  { value: "ER_collet", label: "ER Collet" },
  { value: "Weldon", label: "Weldon" },
  { value: "milling_chuck", label: "Milling Chuck" },
];

const WORKHOLDING_TYPES: SelectOption[] = [
  { value: "vise", label: "Vise" },
  { value: "fixture", label: "Fixture" },
  { value: "vacuum", label: "Vacuum" },
  { value: "magnetic", label: "Magnetic" },
  { value: "collet", label: "Collet" },
  { value: "chuck", label: "Chuck" },
  { value: "tombstone", label: "Tombstone" },
];

const COOLANT_TYPES: SelectOption[] = [
  { value: "flood", label: "Flood" },
  { value: "mist", label: "Mist" },
  { value: "MQL", label: "MQL" },
  { value: "dry", label: "Dry" },
  { value: "cryogenic", label: "Cryogenic" },
  { value: "through_tool", label: "Through Tool" },
];

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function presetValue(machineName?: string): string {
  if (!machineName) return "";
  return MACHINE_PRESETS.find(machine => machine.values.machine_name === machineName)?.id ?? "";
}

export default function SpeedFeedPage() {
  const [input, setInput] = useState<OrchestratorInput>({
    material: "4140 prehard",
    iso_group: "P",
    hardness_hb: 300,
    machine_name: "Haas VF-2",
    machine_power_kw: 22.4,
    machine_max_rpm: 8100,
    machine_max_torque_nm: 122,
    machine_rigidity: "medium",
    machine_guideway: "linear",
    machine_type: "vertical_mill",
    spindle_taper: "CAT40",
    spindle_bearing_preload: "medium",
    tool_diameter_mm: 12,
    flutes: 4,
    tool_material: "carbide",
    tool_coating: "TiAlN",
    helix_angle_deg: 38,
    corner_radius_mm: 0.5,
    tool_stickout_mm: 36,
    holder_type: "ER_collet",
    operation: "milling",
    cut_type: "roughing",
    strategy: "adaptive",
    cam_system: "Mastercam",
    cam_strategy: "Dynamic Milling",
    axial_depth_mm: 12,
    radial_depth_mm: 1.8,
    radial_depth_pct: 15,
    workholding_type: "vise",
    workholding_stiffness: "medium",
    coolant_type: "flood",
    coolant_pressure_bar: 5,
    coolant_concentration_pct: 8,
    wall_thickness_mm: 8,
    overhang_ratio: 3,
    feature_tolerance_mm: 0.05,
    optimize_for: "balanced",
  });
  const [mode, setMode] = useState<Mode>("quick");
  const calc = useSpeedFeedOrchestrate();
  const opt = useSpeedFeedOptimize();

  // SF Studio compact density (2026-05-21, slot:juliett) — this orchestrator
  // page packs 46 spinbuttons across 6 sections; the -15% page zoom
  // (index.css body[data-sf-density="compact"]) brings measurably more
  // controls above-fold (3/46 -> 5/46 at 1920x1080). Opt in on mount, clear
  // on unmount so other routes keep the default density.
  useEffect(() => {
    document.body.setAttribute("data-sf-density", "compact");
    return () => document.body.removeAttribute("data-sf-density");
  }, []);

  const result = calc.data as { result: { value: OrchestratorResult } } | null;
  const optResult = opt.data as { result: { value: OptimizeResult } } | null;

  const update = useCallback((field: keyof OrchestratorInput, value: unknown) => {
    setInput(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateNumber = useCallback((field: keyof OrchestratorInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: parseOptionalNumber(value) }));
  }, []);

  const updateCalibration = useCallback((field: keyof CalibrationOverrides, value: string) => {
    setInput(prev => {
      const parsed = parseOptionalNumber(value);
      const next = { ...(prev.calibration_overrides ?? {}), [field]: parsed };
      if (parsed === undefined) delete next[field];
      const hasAny = Object.values(next).some(current => current !== undefined && current !== "");
      return { ...prev, calibration_overrides: hasAny ? next : undefined };
    });
  }, []);

  const applyMachinePreset = useCallback((presetId: string) => {
    const preset = MACHINE_PRESETS.find(machine => machine.id === presetId);
    if (!preset) {
      update("machine_name", undefined);
      return;
    }
    setInput(prev => ({ ...prev, ...preset.values }));
  }, [update]);

  const selectedMachineNote = useMemo(() => {
    return MACHINE_PRESETS.find(machine => machine.values.machine_name === input.machine_name)?.note;
  }, [input.machine_name]);

  const numberField = (
    field: keyof OrchestratorInput,
    label: string,
    options: { step?: number | string; min?: number; max?: number; placeholder?: string } = {},
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        data-field={String(field)}
        value={(input[field] as number | undefined) ?? ""}
        onChange={event => updateNumber(field, event.target.value)}
        className={inputClass}
        step={options.step ?? "any"}
        min={options.min}
        max={options.max}
        placeholder={options.placeholder}
      />
    </div>
  );

  const stringField = (
    field: keyof OrchestratorInput,
    label: string,
    placeholder?: string,
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="text"
        data-field={String(field)}
        value={(input[field] as string | undefined) ?? ""}
        onChange={event => update(field, event.target.value || undefined)}
        className={inputClass}
        placeholder={placeholder}
      />
    </div>
  );

  const selectField = (
    field: keyof OrchestratorInput,
    label: string,
    options: SelectOption[],
    emptyLabel?: string,
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        data-field={String(field)}
        value={(input[field] as string | undefined) ?? ""}
        onChange={event => update(field, event.target.value || undefined)}
        className={inputClass}
      >
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );

  const calibrationField = (
    field: keyof CalibrationOverrides,
    label: string,
    placeholder?: string,
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        data-calibration={String(field)}
        value={(input.calibration_overrides?.[field] as number | undefined) ?? ""}
        onChange={event => updateCalibration(field, event.target.value)}
        className={inputClass}
        step="any"
        placeholder={placeholder}
      />
    </div>
  );

  const handleCalculate = useCallback(() => {
    const payload = {
      ...input,
      material: input.material?.trim() || "4140 prehard",
    };
    if (mode === "optimize") {
      opt.execute(payload);
    } else {
      calc.execute({ ...payload, output_detail: mode === "full" ? "full" : "minimal" });
    }
  }, [input, mode, calc, opt]);

  const r = result?.result?.value;
  const o = optResult?.result?.value;
  const loading = calc.loading || opt.loading;
  const error = calc.error || opt.error;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold">JM Die Milling Speeds/Feeds</h2>
              <p className="text-xs text-slate-500">/speed-feed orchestrator</p>
            </div>
            <Badge color="blue">Milling</Badge>
          </div>

          <div className="flex gap-1 mb-3">
            {(["quick", "full", "optimize"] as Mode[]).map(currentMode => (
              <button
                key={currentMode}
                onClick={() => setMode(currentMode)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  mode === currentMode ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {currentMode === "quick" ? "Quick" : currentMode === "full" ? "Full Analysis" : "Pareto Optimize"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Setup</h3>
                {selectedMachineNote && <span className="text-[11px] text-slate-500">{selectedMachineNote}</span>}
              </div>

              <div className="space-y-2">
                <div>
                  <label className={labelClass}>JM Die / Catalog Machine</label>
                  <select
                    data-testid="machine-preset"
                    value={presetValue(input.machine_name)}
                    onChange={event => applyMachinePreset(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Manual / unresolved</option>
                    <optgroup label="JM Die machines">
                      {JM_DIE_MACHINES.map(machine => <option key={machine.id} value={machine.id}>{machine.label}</option>)}
                    </optgroup>
                    <optgroup label="Catalog machines">
                      {MACHINE_PRESETS.filter(machine => machine.id.startsWith("catalog-")).map(machine => (
                        <option key={machine.id} value={machine.id}>{machine.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {stringField("machine_name", "Machine lookup name", "Haas VF-2")}
                {stringField("material", "Material", "4140 prehard, H13, D2, 6061, Ti-6Al-4V")}

                <div className="grid grid-cols-3 gap-2">
                  {selectField("iso_group", "ISO", ISO_GROUPS, "Auto")}
                  {numberField("hardness_hb", "HB", { min: 0 })}
                  {numberField("hardness_hrc", "HRC", { min: 0 })}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {numberField("sigma_y_MPa", "Yield MPa", { min: 0 })}
                  {selectField("optimize_for", "Optimize", [
                    { value: "balanced", label: "Balanced" },
                    { value: "tool_life", label: "Tool Life" },
                    { value: "productivity", label: "Productivity" },
                    { value: "surface_finish", label: "Surface Finish" },
                    { value: "cost", label: "Cost" },
                  ])}
                  {selectField("cam_system", "CAM", CAM_SYSTEMS.map(cam => ({ value: cam, label: cam })), "Generic")}
                </div>

                {stringField("cam_strategy", "CAM strategy / vendor note", "Dynamic Milling, Adaptive Clearing, CoroMill 390")}
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Tool And Catalog Details</h3>
              <div className="grid grid-cols-2 gap-2">
                {numberField("tool_diameter_mm", "Diameter mm", { min: 0.1 })}
                {numberField("flutes", "Flutes", { min: 1, step: 1 })}
                {selectField("tool_material", "Tool material", TOOL_MATERIALS)}
                <div>
                  <label className={labelClass}>Coating</label>
                  <select value={input.tool_coating ?? ""} onChange={event => update("tool_coating", event.target.value || undefined)} className={inputClass}>
                    <option value="">Catalog default</option>
                    {COATINGS.map(coating => <option key={coating} value={coating}>{coating}</option>)}
                  </select>
                </div>
                {numberField("helix_angle_deg", "Helix deg", { min: 0, max: 60 })}
                {numberField("corner_radius_mm", "Corner R mm", { min: 0 })}
                {numberField("flute_length_mm", "Flute length mm", { min: 0 })}
                {numberField("overall_length_mm", "Overall length mm", { min: 0 })}
                {numberField("tool_stickout_mm", "Stickout mm", { min: 0 })}
                {numberField("edge_radius_mm", "Edge radius mm", { min: 0 })}
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {stringField("tool_series", "Tool series", "CoroMill 390, HARVI, Chatterfree")}
                <div className="grid grid-cols-2 gap-2">
                  {stringField("tool_grade", "Tool grade", "GC4325, IC928")}
                  {stringField("insert_grade", "Insert grade", "GC1130, KC725M")}
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Cut Geometry</h3>
              <div className="grid grid-cols-2 gap-2">
                {selectField("operation", "Operation", [
                  { value: "milling", label: "Milling" },
                  { value: "drilling", label: "Drilling" },
                  { value: "tapping", label: "Tapping" },
                  { value: "reaming", label: "Reaming" },
                  { value: "boring", label: "Boring" },
                  { value: "thread_milling", label: "Thread Milling" },
                  { value: "turning", label: "Turning" },
                ])}
                {selectField("cut_type", "Cut type", [
                  { value: "roughing", label: "Roughing" },
                  { value: "semi_finishing", label: "Semi-Finish" },
                  { value: "finishing", label: "Finishing" },
                ])}
                {selectField("strategy", "Toolpath", STRATEGIES)}
                {numberField("radial_depth_pct", "Radial %D", { min: 0, max: 100 })}
                {numberField("axial_depth_mm", "ap mm", { min: 0 })}
                {numberField("radial_depth_mm", "ae mm", { min: 0 })}
                {numberField("wall_thickness_mm", "Wall mm", { min: 0 })}
                {numberField("overhang_ratio", "L/D", { min: 0 })}
                {numberField("feature_tolerance_mm", "Tolerance mm", { min: 0 })}
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Machine Envelope</h3>
              <div className="grid grid-cols-2 gap-2">
                {numberField("machine_power_kw", "Power kW", { min: 0 })}
                {numberField("machine_max_rpm", "Max RPM", { min: 0, step: 1 })}
                {numberField("machine_max_torque_nm", "Torque Nm", { min: 0 })}
                {selectField("machine_rigidity", "Rigidity", [
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ])}
                {selectField("machine_guideway", "Guideway", [
                  { value: "linear", label: "Linear" },
                  { value: "box", label: "Box" },
                  { value: "hydrostatic", label: "Hydrostatic" },
                ])}
                {selectField("machine_type", "Machine type", [
                  { value: "vertical_mill", label: "Vertical mill" },
                  { value: "horizontal_mill", label: "Horizontal mill" },
                  { value: "5axis", label: "5-axis" },
                  { value: "lathe", label: "Lathe" },
                  { value: "router", label: "Router" },
                  { value: "swiss", label: "Swiss" },
                ])}
                {selectField("spindle_taper", "Taper", [
                  { value: "BT30", label: "BT30" },
                  { value: "BT40", label: "BT40" },
                  { value: "BT50", label: "BT50" },
                  { value: "CAT40", label: "CAT40" },
                  { value: "CAT50", label: "CAT50" },
                  { value: "HSK-A63", label: "HSK-A63" },
                  { value: "HSK-A100", label: "HSK-A100" },
                  { value: "HSK-E40", label: "HSK-E40" },
                ])}
                {selectField("spindle_bearing_preload", "Preload", [
                  { value: "light", label: "Light" },
                  { value: "medium", label: "Medium" },
                  { value: "heavy", label: "Heavy" },
                ])}
                {numberField("machine_age_years", "Age years", { min: 0 })}
                {numberField("natural_frequency_hz", "Natural Hz", { min: 0 })}
                {numberField("system_stiffness_n_m", "Stiffness N/m", { min: 0 })}
                {numberField("damping_ratio", "Damping", { min: 0, step: 0.001 })}
                {numberField("machine_axis_accel_m_s2", "Axis accel", { min: 0 })}
                {numberField("machine_axis_jerk_m_s3", "Axis jerk", { min: 0 })}
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Holder, Workholding, Coolant</h3>
              <div className="grid grid-cols-2 gap-2">
                {selectField("holder_type", "Holder", HOLDER_TYPES)}
                {numberField("holder_gauge_length_mm", "Gauge length mm", { min: 0 })}
                {numberField("holder_tir_mm", "TIR mm", { min: 0, step: 0.001 })}
                {numberField("holder_balanced_g", "Balance G", { min: 0 })}
                {selectField("workholding_type", "Workholding", WORKHOLDING_TYPES)}
                {selectField("workholding_stiffness", "Hold stiffness", [
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ])}
                {numberField("clamping_force_kN", "Clamp kN", { min: 0 })}
                {selectField("coolant_type", "Coolant", COOLANT_TYPES)}
                {numberField("coolant_pressure_bar", "Coolant bar", { min: 0 })}
                {numberField("coolant_concentration_pct", "Coolant %", { min: 0, max: 100 })}
                {numberField("workpiece_length_mm", "Part L mm", { min: 0 })}
                {numberField("workpiece_width_mm", "Part W mm", { min: 0 })}
                {numberField("workpiece_height_mm", "Part H mm", { min: 0 })}
                {numberField("workpiece_diameter_mm", "Part dia mm", { min: 0 })}
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Economics And Calibration</h3>
              <div className="grid grid-cols-2 gap-2">
                {numberField("tool_cost_usd", "Tool cost $", { min: 0 })}
                {numberField("machine_cost_per_min", "$ / min", { min: 0 })}
                {numberField("tool_change_time_min", "Tool change min", { min: 0 })}
                {calibrationField("confidence", "Cal confidence", "0.8")}
                {calibrationField("vc_factor", "Vc factor", "1.0")}
                {calibrationField("power_factor", "Power factor", "1.0")}
                {calibrationField("kc1_1_factor", "Kienzle factor", "1.0")}
                {calibrationField("ra_factor", "Ra factor", "1.0")}
                {calibrationField("taylor_c_factor", "Taylor C factor", "1.0")}
                {calibrationField("taylor_n_factor", "Taylor n factor", "1.0")}
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-200 pt-3">
            <Button onClick={handleCalculate} disabled={loading} className="w-full" data-testid="calculate-speed-feed">
              {loading ? <><Spinner size="sm" /> Calculating...</> : mode === "optimize" ? "Run MOPSO Optimization" : "Calculate"}
            </Button>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-3">
        {r && mode !== "optimize" && (
          <>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Results</h3>
                <div className="flex items-center gap-2">
                  <Badge color={r.overall_confidence > 0.6 ? "green" : r.overall_confidence > 0.3 ? "yellow" : "red"}>
                    Confidence: {(r.overall_confidence * 100).toFixed(0)}%
                  </Badge>
                  <Badge color={r.stability_assessment.zone === "stable" ? "green" : r.stability_assessment.zone === "marginal" ? "yellow" : "red"}>
                    {r.stability_assessment.zone}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-blue-50 rounded p-2">
                  <div className="text-2xl font-bold text-blue-700">{r.spindle_rpm}</div>
                  <div className="text-xs text-slate-500">RPM</div>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <div className="text-2xl font-bold text-green-700">{r.feed_rate_mmmin.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">Feed (mm/min)</div>
                </div>
                <div className="bg-purple-50 rounded p-2">
                  <div className="text-2xl font-bold text-purple-700">{r.cutting_speed_mpm.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">Vc (m/min)</div>
                </div>
                <div className="bg-amber-50 rounded p-2">
                  <div className="text-2xl font-bold text-amber-700">{r.mrr_cm3min.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">MRR (cm3/min)</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mt-2">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.feed_per_tooth_mm.toFixed(4)}</div>
                  <div className="text-xs text-slate-500">fz (mm)</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.power_kw.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">Power (kW)</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.tool_life_min.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">Tool Life (min)</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-lg font-semibold">{r.surface_finish_Ra_um.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Ra (um)</div>
                </div>
              </div>
            </Card>

            <Card>
              <Tabs defaultValue="stability">
                <TabList>
                  <Tab value="stability">Stability</Tab>
                  <Tab value="safety">Safety ({r.safety_checks.length})</Tab>
                  <Tab value="playbook">Playbook ({r.playbook_warnings.length})</Tab>
                  <Tab value="uncertainty">Uncertainty</Tab>
                  <Tab value="alternatives">Alternatives</Tab>
                </TabList>

                <TabPanel value="stability">
                  <div className="p-3 text-sm">
                    <p className="font-medium mb-2">{r.stability_assessment.message}</p>
                    <div className="text-xs text-slate-500">
                      P(chatter) = {(r.stability_assessment.p_chatter * 100).toFixed(1)}%
                      {r.stability_assessment.suggested_rpm_pocket && (
                        <span className="ml-2 text-blue-600">
                          Suggested stable pocket: {r.stability_assessment.suggested_rpm_pocket} RPM (lobe {r.stability_assessment.lobe_index})
                        </span>
                      )}
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="safety">
                  <div className="p-3 space-y-1">
                    {r.safety_checks.map((check, index) => (
                      <div key={index} className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${check.passed ? "bg-green-50" : "bg-red-50"}`}>
                        <span>{check.passed ? "OK" : "FAIL"}</span>
                        <span className="font-medium">{check.name}</span>
                        <span className="text-slate-500">{check.message}</span>
                      </div>
                    ))}
                  </div>
                </TabPanel>

                <TabPanel value="playbook">
                  <div className="p-3 space-y-1">
                    {r.playbook_warnings.map((warning, index) => (
                      <div key={index} className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-800">{warning}</div>
                    ))}
                    {r.playbook_warnings.length === 0 && <p className="text-xs text-slate-400">No warnings for this setup.</p>}
                  </div>
                </TabPanel>

                <TabPanel value="uncertainty">
                  <div className="p-3 text-xs space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>Force CI95: [{r.uncertainty.force_ci95[0].toFixed(0)}, {r.uncertainty.force_ci95[1].toFixed(0)}] N</div>
                      <div>Life CI95: [{r.uncertainty.life_ci95[0].toFixed(1)}, {r.uncertainty.life_ci95[1].toFixed(1)}] min</div>
                      <div>Ra CI95: [{r.uncertainty.ra_ci95[0].toFixed(3)}, {r.uncertainty.ra_ci95[1].toFixed(3)}] um</div>
                      <div>Ra Cpk: {r.uncertainty.ra_cpk?.toFixed(2) ?? "N/A"}</div>
                    </div>
                    {r.uncertainty.weibull && (
                      <div className="mt-2 bg-slate-50 rounded p-2">
                        <span className="font-medium">Weibull: </span>
                        beta={r.uncertainty.weibull.beta}, eta={r.uncertainty.weibull.eta_min} min,
                        P(survive 30min)={(r.uncertainty.weibull.p_survive_30min * 100).toFixed(1)}%
                      </div>
                    )}
                    <div className="mt-2">
                      <span className="font-medium">Sobol: </span>
                      kc={r.uncertainty.sobol_contributions.kc_pct}%,
                      life={r.uncertainty.sobol_contributions.life_pct}%,
                      Ra={r.uncertainty.sobol_contributions.ra_pct}%
                    </div>
                    <div className="mt-1 text-blue-600">{r.uncertainty.suggested_measurement}</div>
                  </div>
                </TabPanel>

                <TabPanel value="alternatives">
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="pb-1">Mode</th>
                          <th>Vc</th>
                          <th>Feed</th>
                          <th>MRR</th>
                          <th>Life</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.alternatives.map((alternative, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-1 font-medium">{alternative.label}</td>
                            <td>{alternative.cutting_speed_mpm.toFixed(1)}</td>
                            <td>{alternative.feed_rate_mmmin.toFixed(0)}</td>
                            <td>{alternative.mrr_cm3min.toFixed(1)}</td>
                            <td>{alternative.tool_life_min.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPanel>
              </Tabs>
            </Card>

            <Card>
              <h4 className="text-sm font-bold mb-2">Limiting Factors</h4>
              <div className="space-y-1">
                {r.limiting_factors.map((factor, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <Badge color={factor.severity === "critical" ? "red" : factor.severity === "warning" ? "yellow" : "slate"}>
                      {factor.utilization_pct.toFixed(0)}%
                    </Badge>
                    <span className="font-medium">{factor.parameter}</span>
                    <span className="text-slate-500">{factor.constraint}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Formulas: {r.formulas_used.join(", ")}
              </div>
            </Card>
          </>
        )}

        {o && mode === "optimize" && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">MOPSO Pareto Front</h3>
              <Badge color="slate">{o.method} | {o.particles}p x {o.iterations}iter | {o.archive_size} solutions</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="pb-1 pr-2">Solution</th>
                    <th>Vc (m/min)</th>
                    <th>fz (mm)</th>
                    <th>ap (mm)</th>
                    <th>MRR</th>
                    <th>Life (min)</th>
                    <th>Ra (um)</th>
                  </tr>
                </thead>
                <tbody>
                  {o.pareto_front.map((solution, index) => (
                    <tr key={index} className={`border-t ${solution.label === o.recommended ? "bg-blue-50 font-medium" : ""}`}>
                      <td className="py-1">
                        <span className="mr-1">{solution.label}</span>
                        {solution.label === o.best_mrr && <Badge color="green">MRR</Badge>}
                        {solution.label === o.best_tool_life && <Badge color="yellow">Life</Badge>}
                        {solution.label === o.best_finish && <Badge color="slate">Ra</Badge>}
                      </td>
                      <td>{solution.vc_mpm}</td>
                      <td>{solution.fz_mm}</td>
                      <td>{solution.ap_mm}</td>
                      <td>{solution.mrr_cm3min}</td>
                      <td>{solution.tool_life_min}</td>
                      <td>{solution.ra_um}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-blue-600">Recommended: {o.recommended}</p>
          </Card>
        )}

        {!r && !o && !loading && (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Select a JM Die machine and milling setup</p>
              <p className="text-sm max-w-xl mx-auto">
                The orchestrator resolves machine, tool, material, holder, coolant, workholding, CAM strategy, and geometry context before running the speed/feed physics stack.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
