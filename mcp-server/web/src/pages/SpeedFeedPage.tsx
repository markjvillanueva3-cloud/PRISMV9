import { useState, useCallback, useMemo, useEffect } from "react";
import { Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useSpeedFeedOrchestrate, useSpeedFeedOptimize } from "../hooks/useSpeedFeed";
import type { OrchestratorInput, OrchestratorResult, OptimizeResult } from "../types/speedfeed";
import UncertaintyAdvisoryBanner from "../components/sfc/UncertaintyAdvisoryBanner";
import { formatCvBreakdown } from "../components/sfc/formatCvBreakdown";
import { DbBackedSelect } from "../components/DbBackedSelect";
import { fetchMachineCatalog, fetchProgrammingCatalog, fetchMaterialCatalog } from "../api/sfcReferenceCatalogs";
import type {
  StockOption,
  HolderCatalogOption,
  WorkholdingCatalogOption,
  CoolantProductOption,
  CoolantOption,
  TurningInsertOption,
  InsertOption,
  ToolSearchOption,
} from "../api/sfcReferenceCatalogs";
import ToolSearchSelect from "../components/sfc/ToolSearchSelect";
import { RadarChart } from "../components/charts";
import { MATERIALS } from "../data/materials";

type Mode = "quick" | "full" | "optimize";
type CalibrationOverrides = NonNullable<OrchestratorInput["calibration_overrides"]>;

// SOLVE-FOR intent modes (from the Kienzle design) map 1:1 onto the REAL orchestrator
// `optimize_for` enum (types/speedfeed.ts) -- no fabricated objective. The design's four
// customer-facing intents translate to the physics-stack's optimization target directly.
// Glyphs are unicode-escaped (shield / bolt / target / triangle) so the source stays ASCII.
type SolveMode = "tool_life" | "productivity" | "balanced" | "cost";
const SOLVE_MODES: Array<{ id: SolveMode; label: string; glyph: string; optimizeFor: NonNullable<OrchestratorInput["optimize_for"]> }> = [
  { id: "tool_life", label: "Tool-Saving", glyph: "\u{1F6E1}", optimizeFor: "tool_life" },
  { id: "productivity", label: "Rush Job", glyph: "⚡", optimizeFor: "productivity" },
  { id: "balanced", label: "Optimal", glyph: "◎", optimizeFor: "balanced" },
  { id: "cost", label: "Upgrade", glyph: "▲", optimizeFor: "cost" },
];

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

// Kienzle dark studio chrome (design tokens from index.css `--kz-*`, active under
// body[data-brand='kienzle'] -- set globally in main.tsx). Never inline the design's raw
// hex (web/CLAUDE.md token-source-of-truth): every color routes through a --kz-* var or a
// white/N alpha, so a brand swap re-themes the whole page with zero edits here.
const inputClass = "w-full min-h-[40px] px-3 py-2 text-sm rounded-[9px] border border-white/10 bg-[var(--kz-panel-2)] text-[var(--kz-text)] placeholder:text-[var(--kz-text-mute)] focus:outline-none focus:border-[var(--kz-orange)]/60";
const labelClass = "block text-[11px] font-medium text-[var(--kz-text-dim)] mb-1";
// A numbered input panel (01/02/03/04) -- the design's left-column section container.
const panelClass = "rounded-[13px] border border-white/[0.07] bg-[var(--kz-panel)] p-4";
// The orange section eyebrow above each numbered panel (JetBrains Mono, tracked out).
const eyebrowClass = "[font-family:var(--font-mono)] text-[10.5px] tracking-[0.18em] text-[var(--kz-orange)] mb-3";
// A small read-only stat chip (SPINDLE/CONTROL/RIGIDITY, ISO/kc1.1/HRC).
const chipClass = "rounded-[8px] border border-white/[0.07] bg-[var(--kz-panel)] px-[9px] py-[7px]";
const chipCapClass = "[font-family:var(--font-mono)] text-[9px] tracking-[0.05em] text-[var(--kz-text-mute)]";
const chipValClass = "[font-family:var(--font-mono)] text-[12px] text-[#C7CCD4] mt-0.5";
// A numeric result value (JetBrains Mono, the fleet numeric face).
const numClass = "[font-family:var(--font-mono)]";

// A result value that has NO backend source renders this glyph (an em dash, unicode-escaped
// so the source stays ASCII), never a fabricated number (R12). Used for cut-temp (no
// orchestrator temperature field) and the entry-move outputs (ramp / plunge / helix).
const NO_SOURCE = "—";

// Material suggestions unify the curated MATERIALS module (fail-soft default) with the
// live DB-backed /material/catalog (full MaterialRegistry, 245+ ISO-classified alloys).
// The material field stays an OPEN-ENDED <datalist> -- any off-catalog alloy is still
// typeable; a recognized name cascade-fills ISO group + hardness (HB or HRC).
type MaterialSuggestion = {
  id: string;
  name: string;
  group: string;
  hardnessHb: number | null;
  hardnessHrc: number | null;
  display: string;
};

const LOCAL_MATERIAL_SUGGESTIONS: MaterialSuggestion[] = MATERIALS.map(material => ({
  id: material.id,
  name: material.name,
  group: material.group,
  hardnessHb: material.hardness,
  hardnessHrc: null,
  display: `${material.group} - ${material.groupLabel} - ${material.hardness} HB`,
}));

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

// Valid ISO 513 codes a catalog material may cascade into iso_group -- single-sourced
// from ISO_GROUPS so a future malformed materials-module `group` fails soft (the cascade
// skips the ISO fill) instead of leaking an out-of-enum value into the orchestrator.
const ISO_GROUP_CODES = new Set(ISO_GROUPS.map(option => option.value));

const TOOL_MATERIALS: SelectOption[] = [
  { value: "carbide", label: "Carbide" },
  { value: "hss", label: "HSS" },
  { value: "cermet", label: "Cermet" },
  { value: "ceramic", label: "Ceramic" },
  { value: "cbn", label: "CBN" },
  { value: "pcd", label: "PCD" },
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

// Maps a DB coolant-METHOD option id (from /coolant/catalog) onto the orchestrator's
// coolant_type enum. The consolidated reference DB carries finer methods (air,
// high-pressure, through-spindle) than the 6-value enum; each maps onto its nearest
// enum member, erring toward LESS cooling when ambiguous (air -> dry) so the thermal
// model never over-claims a cooling benefit it cannot guarantee (conservative direction).
const COOLANT_METHOD_TO_TYPE: Record<string, NonNullable<OrchestratorInput["coolant_type"]>> = {
  // "none" (a no-coolant cut, effectiveness 0) MUST map to "dry" -- the live /coolant/catalog DB
  // emits a `none` method, and the consumed coolant_type DEFAULTS to "flood" (70% cooling). Leaving
  // `none` unmapped would silently keep the default flood for a genuinely dry cut -> the calc would
  // over-claim cooling and recommend a too-aggressive Vc AND suppress the dry-cut fire warning for
  // Ti/Inconel (the exact unsafe over-cooling direction this map exists to prevent).
  none: "dry",
  dry: "dry",
  air: "dry",
  mist: "mist",
  mql: "MQL",
  flood: "flood",
  "high-pressure": "flood",
  "through-spindle": "through_tool",
  "through-tool": "through_tool",
  through_tool: "through_tool",
  cryogenic: "cryogenic",
};

// Maps a tool-holder catalog record's raw `holderType` token (uppercase, e.g.
// "SHRINK_FIT") onto the orchestrator's closed `holder_type` enum so a holder PICK
// cascades into the existing physics field (no orphan, no contract change). Unknown
// tokens leave holder_type untouched (fail-soft).
const HOLDER_TYPE_MAP: Record<string, NonNullable<OrchestratorInput["holder_type"]>> = {
  SHRINK_FIT: "shrink_fit",
  POWRGRIP: "shrink_fit",
  HYDRAULIC: "hydraulic",
  ER_COLLET_CHUCK: "ER_collet",
  ER_COLLET: "ER_collet",
  COLLET_CHUCK: "ER_collet",
  MILLING_CHUCK: "milling_chuck",
  WELDON_SIDE_LOCK: "Weldon",
  WELDON: "Weldon",
  SIDE_LOCK: "Weldon",
};

// The orchestrator's closed `workholding_type` enum; a workholding catalog pick whose
// categoryId is one of these cascades into the field (else leaves it untouched).
const WORKHOLDING_TYPE_SET = new Set<NonNullable<OrchestratorInput["workholding_type"]>>([
  "vise",
  "fixture",
  "vacuum",
  "magnetic",
  "collet",
  "chuck",
  "tombstone",
]);

// The orchestrator's closed `spindle_taper` enum. A tool-holder pick's spindle interface
// (CAT40/BT40/HSK-A63...) cascades into spindle_taper when it matches this set -- the
// holder catalog carries 80+ interfaces, only these map to the calc's taper field.
const SPINDLE_TAPER_SET = new Set<NonNullable<OrchestratorInput["spindle_taper"]>>([
  "BT30",
  "BT40",
  "BT50",
  "CAT40",
  "CAT50",
  "HSK-A63",
  "HSK-A100",
  "HSK-E40",
]);

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// AGGRO (0..100) scales the REAL radial engagement the orchestrator already consumes -- 50
// is neutral (unscaled), >50 deepens toward slot, <50 backs off. Returns the multiplier on
// radial_depth_pct / radial_depth_mm. Bounded so a full-slot pick never exceeds the tool Ø.
function aggroEngagementFactor(aggro: number): number {
  const clamped = Math.max(0, Math.min(100, aggro));
  return 0.62 + (clamped / 100) * 0.76; // 0.62x at 0, 1.0x at 50, 1.38x at 100
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
  // SOLVE-FOR intent (design) drives OrchestratorInput.optimize_for; default "balanced"
  // (Optimal) mirrors the seeded input above. Picking a mode updates optimize_for so BOTH
  // the quick/full calc and the MOPSO optimize honor the same customer intent.
  const [solveMode, setSolveMode] = useState<SolveMode>("balanced");
  // AGGRO (0..100) is a client-side ENGAGEMENT scale, NOT a fabricated backend param: it
  // scales the REAL radial_depth_pct/radial_depth_mm the orchestrator already consumes. 50
  // = neutral (the typed depths pass through unscaled); >50 deepens the radial engagement
  // toward slot, <50 backs it off. Surfaced honestly as "engagement" in the UI (R12).
  const [aggro, setAggro] = useState<number>(50);
  const calc = useSpeedFeedOrchestrate();
  const opt = useSpeedFeedOptimize();

  // Kienzle brand shell is set globally in main.tsx (body[data-brand='kienzle']), so the
  // --kz-* tokens already resolve on this page. The prior "compact density" opt-in
  // (data-sf-density) is retained -- this orchestrator still packs many controls and the
  // -15% page zoom brings measurably more above-fold (juliett 2026-05-21 audit).
  useEffect(() => {
    document.body.setAttribute("data-sf-density", "compact");
    return () => document.body.removeAttribute("data-sf-density");
  }, []);

  // Live machine + CAM catalogs replace the hardcoded lists (fail-soft to the curated
  // fallbacks below). A machine pick sets machine_name; the orchestrator resolves the
  // full envelope server-side, exactly like the curated presets it replaces.
  const [catalogMachines, setCatalogMachines] = useState<MachinePreset[]>(
    () => MACHINE_PRESETS.filter(machine => machine.id.startsWith("catalog-")),
  );
  const [camSystems, setCamSystems] = useState<string[]>(CAM_SYSTEMS);
  // Material datalist suggestions: curated MATERIALS by default, replaced by the live
  // /material/catalog (full MaterialRegistry) when it returns rows (fail-soft to curated).
  const [materialSuggestions, setMaterialSuggestions] = useState<MaterialSuggestion[]>(LOCAL_MATERIAL_SUGGESTIONS);

  useEffect(() => {
    let cancelled = false;
    fetchMaterialCatalog()
      .then(res => {
        if (cancelled || res.options.length === 0) return; // keep the curated MATERIALS fallback
        setMaterialSuggestions(res.options.map(option => ({
          id: option.id,
          name: option.label,
          group: option.isoGroup,
          hardnessHb: option.hardnessHb,
          hardnessHrc: option.hardnessHrc,
          display: option.detail,
        })));
      })
      .catch(() => { /* keep the curated MATERIALS fallback */ });
    fetchMachineCatalog()
      .then(res => {
        if (cancelled || res.options.length === 0) return;
        const jmNames = new Set(JM_DIE_MACHINES.map(machine => machine.values.machine_name));
        const seen = new Set<string>();
        const live: MachinePreset[] = [];
        for (const option of res.options) {
          const name = option.label;
          if (!name || jmNames.has(name) || seen.has(name)) continue;
          seen.add(name);
          live.push({ id: `catalog-${name}`, label: name, note: option.detail || "Catalog resolver lookup", values: { machine_name: name } });
        }
        if (live.length) setCatalogMachines(live);
      })
      .catch(() => { /* keep the curated machine fallback */ });
    fetchProgrammingCatalog()
      .then(res => { if (!cancelled && res.vendors.length) setCamSystems(res.vendors); })
      .catch(() => { /* keep the curated CAM fallback */ });
    return () => { cancelled = true; };
  }, []);

  const machinePresets = useMemo(() => [...JM_DIE_MACHINES, ...catalogMachines], [catalogMachines]);
  const resolvePresetId = useCallback(
    (name?: string) => machinePresets.find(machine => machine.values.machine_name === name)?.id ?? "",
    [machinePresets],
  );

  const result = calc.data as { result: { value: OrchestratorResult } } | null;
  const optResult = opt.data as { result: { value: OptimizeResult } } | null;

  const update = useCallback((field: keyof OrchestratorInput, value: unknown) => {
    setInput(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateNumber = useCallback((field: keyof OrchestratorInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: parseOptionalNumber(value) }));
  }, []);

  // Material is an OPEN-ENDED field (any alloy string the orchestrator resolves by
  // name), so it is DB-backed via a native <datalist> of common materials rather than
  // a closed <select> -- free-text entry of an off-catalog alloy is fully preserved.
  // When the typed/selected value EXACTLY matches a catalog material, auto-fill the
  // ISO group + hardness the orchestrator reads as separate fields (a custom alloy
  // leaves them untouched). Contract-preserving: the orchestrator still receives the
  // material NAME string -- only iso_group/hardness_hb are cascaded for known materials.
  const handleMaterialInput = useCallback((value: string) => {
    setInput(prev => {
      const trimmed = value.trim().toLowerCase();
      const match = materialSuggestions.find(material => material.name.toLowerCase() === trimmed);
      const next: OrchestratorInput = { ...prev, material: value || undefined };
      if (match) {
        // A recognized catalog material cascades its ISO group + hardness; drop the
        // complementary hardness scale so the orchestrator never receives a conflicting
        // HB/HRC pair. HB is authoritative when present (most alloys); HRC-only catalog
        // materials (hardened tool steels) cascade HRC instead.
        if (ISO_GROUP_CODES.has(match.group)) {
          next.iso_group = match.group as OrchestratorInput["iso_group"];
        }
        if (match.hardnessHb != null) {
          next.hardness_hb = match.hardnessHb;
          next.hardness_hrc = undefined;
        } else if (match.hardnessHrc != null) {
          next.hardness_hrc = match.hardnessHrc;
          next.hardness_hb = undefined;
        }
      }
      return next;
    });
  }, [materialSuggestions]);

  // ---- Catalog-pick cascade companions --------------------------------------
  // Each companion <select> is DB-backed and, on pick, fills an EXISTING orchestrator
  // field (so it is wired to the consumer, never an orphan): stock -> material + iso +
  // hardness; holder -> holder_type; workholding -> workholding_type; coolant product ->
  // coolant_type. The pick id is held locally only so the select shows the selection.
  const [stockPick, setStockPick] = useState("");
  const [holderPick, setHolderPick] = useState("");
  const [workholdingPick, setWorkholdingPick] = useState("");
  const [coolantProductPick, setCoolantProductPick] = useState("");

  const applyStockSelection = useCallback((opt: StockOption | undefined) => {
    if (!opt) return;
    setInput(prev => {
      const next: OrchestratorInput = { ...prev };
      if (opt.materialSpec) next.material = opt.materialSpec;
      if (opt.isoGroup && ISO_GROUP_CODES.has(opt.isoGroup)) {
        next.iso_group = opt.isoGroup as OrchestratorInput["iso_group"];
      }
      if (typeof opt.hardnessHrc === "number" && opt.hardnessHrc > 0) {
        next.hardness_hrc = opt.hardnessHrc;
      }
      return next;
    });
  }, []);

  // Tool search-pick cascade: a picked catalog tool (from the ~86K toolRegistry corpus)
  // fills the EXISTING orchestrator tool-geometry fields. Only fields the catalog row
  // actually carries are set, so a sparse row never wipes a value the user already typed.
  const applyToolSelection = useCallback((opt: ToolSearchOption) => {
    setInput(prev => {
      const next: OrchestratorInput = { ...prev };
      if (opt.diameterMm != null) next.tool_diameter_mm = opt.diameterMm;
      if (opt.flutes != null) next.flutes = opt.flutes;
      if (opt.coating) next.tool_coating = opt.coating;
      if (opt.helixDeg != null) next.helix_angle_deg = opt.helixDeg;
      if (opt.fluteLengthMm != null) next.flute_length_mm = opt.fluteLengthMm;
      return next;
    });
  }, []);

  const applyHolderSelection = useCallback((opt: HolderCatalogOption | undefined) => {
    if (!opt) return;
    // Clamping type -> holder_type (fires for ER collets / shrink-fit / hydraulic).
    const mapped = HOLDER_TYPE_MAP[(opt.holderType || "").toUpperCase()];
    if (mapped) update("holder_type", mapped);
    // Spindle interface -> spindle_taper (fires for CAT40/BT40/HSK-A63... in the enum).
    const taper = (opt.spindleInterface || "").toUpperCase() as NonNullable<OrchestratorInput["spindle_taper"]>;
    if (SPINDLE_TAPER_SET.has(taper)) update("spindle_taper", taper);
  }, [update]);

  const applyWorkholdingSelection = useCallback((opt: WorkholdingCatalogOption | undefined) => {
    if (!opt) return;
    const category = (opt.categoryId || "").toLowerCase();
    // The coarse categoryId tags vacuum/magnetic/tombstone all as "fixture"; refine to
    // the finer workholding_type enum off the workholdingId/label token when present.
    if (category === "fixture") {
      const token = `${opt.workholdingId || ""} ${opt.label || ""}`.toLowerCase();
      if (token.includes("vacuum")) return update("workholding_type", "vacuum");
      if (token.includes("magnetic")) return update("workholding_type", "magnetic");
      if (token.includes("tombstone")) return update("workholding_type", "tombstone");
    }
    if (WORKHOLDING_TYPE_SET.has(category as NonNullable<OrchestratorInput["workholding_type"]>)) {
      update("workholding_type", category as NonNullable<OrchestratorInput["workholding_type"]>);
    }
  }, [update]);

  const applyCoolantProductSelection = useCallback((opt: CoolantProductOption | undefined) => {
    if (!opt) return;
    if (opt.coolingType === "mql") update("coolant_type", "MQL");
    else if (opt.coolingType === "flood") update("coolant_type", "flood");
  }, [update]);

  const [coolantMethodPick, setCoolantMethodPick] = useState("");
  const applyCoolantMethodSelection = useCallback((opt: CoolantOption | undefined) => {
    if (!opt) return;
    // A coolant-METHOD pick fills the orchestrator's coolant_type (the thermal-model input),
    // mapping the DB method id onto the nearest enum member. The option's effectiveness/factor
    // are surfaced in its detail for the operator; coolant_type is the consumed field.
    const mapped = COOLANT_METHOD_TO_TYPE[opt.id];
    if (mapped) update("coolant_type", mapped);
  }, [update]);

  const [insertPick, setInsertPick] = useState("");
  const applyInsertSelection = useCallback((opt: InsertOption | undefined) => {
    if (!opt) return;
    // An indexable-insert pick fills the free-text grade/series fields the orchestrator
    // already reads (insert_grade / tool_grade / tool_series) from the catalog record.
    setInput(prev => {
      const next: OrchestratorInput = { ...prev };
      if (opt.grade) {
        next.insert_grade = opt.grade;
        next.tool_grade = opt.grade;
      }
      if (opt.family) next.tool_series = opt.family;
      return next;
    });
  }, []);

  const [turningInsertPick, setTurningInsertPick] = useState("");
  const applyTurningInsertSelection = useCallback((opt: TurningInsertOption | undefined) => {
    if (!opt) return;
    // A turning (lathe) insert pick fills the EXISTING orchestrator fields it can populate:
    // the insert NOSE RADIUS is the cutting corner radius (drives surface finish Ra = fz^2/(32*r)
    // and chip thinning), and the ISO designation tags the tool series. Only fields the row
    // actually carries are set, so a sparse row never wipes a value the user already typed.
    setInput(prev => {
      const next: OrchestratorInput = { ...prev };
      if (typeof opt.noseRadius === "number" && opt.noseRadius > 0) next.corner_radius_mm = opt.noseRadius;
      if (opt.iso) next.tool_series = opt.iso;
      return next;
    });
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
    const preset = machinePresets.find(machine => machine.id === presetId);
    if (!preset) {
      update("machine_name", undefined);
      return;
    }
    setInput(prev => ({ ...prev, ...preset.values }));
  }, [update, machinePresets]);

  const selectedMachineNote = useMemo(() => {
    return machinePresets.find(machine => machine.values.machine_name === input.machine_name)?.note;
  }, [input.machine_name, machinePresets]);

  // A SOLVE-FOR pick sets both the local mode chip AND the real optimize_for field.
  const applySolveMode = useCallback((next: SolveMode) => {
    setSolveMode(next);
    const found = SOLVE_MODES.find(entry => entry.id === next);
    if (found) update("optimize_for", found.optimizeFor);
  }, [update]);

  const numberField = (
    field: keyof OrchestratorInput,
    label: string,
    options: { step?: number | string; min?: number; max?: number; placeholder?: string } = {},
  ) => (
    <div>
      <label htmlFor={`sf-${String(field)}`} className={labelClass}>{label}</label>
      <input
        id={`sf-${String(field)}`}
        type="number"
        // Integer-step fields (flutes, RPM) get the plain numeric pad; everything else
        // gets the decimal pad so the Capacitor mobile app surfaces the right OS keyboard
        // (web/CLAUDE.md: the lowest-effort highest-impact mobile UX win for numeric input).
        inputMode={options.step === 1 || options.step === "1" ? "numeric" : "decimal"}
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
      <label htmlFor={`sf-${String(field)}`} className={labelClass}>{label}</label>
      <input
        id={`sf-${String(field)}`}
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
      <label htmlFor={`sf-${String(field)}`} className={labelClass}>{label}</label>
      <select
        id={`sf-${String(field)}`}
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
      <label htmlFor={`sf-cal-${String(field)}`} className={labelClass}>{label}</label>
      <input
        id={`sf-cal-${String(field)}`}
        type="number"
        inputMode="decimal"
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
    // AGGRO scales the REAL radial engagement (not a fabricated param): 50 = unscaled, so a
    // customer who never touches the slider sends exactly the typed depths. Only radial is
    // scaled (the engagement axis); axial ap and the RPM ceiling are untouched. Bounded so a
    // scaled radial never exceeds the tool diameter (full-slot is the physical ceiling).
    const factor = aggroEngagementFactor(aggro);
    const dia = input.tool_diameter_mm ?? 0;
    const scaledPct = input.radial_depth_pct != null
      ? Math.max(1, Math.min(100, input.radial_depth_pct * factor))
      : input.radial_depth_pct;
    const scaledRadial = input.radial_depth_mm != null
      ? (dia > 0 ? Math.min(dia, input.radial_depth_mm * factor) : input.radial_depth_mm * factor)
      : input.radial_depth_mm;
    // No explicit `: OrchestratorInput` annotation: the inferred literal keeps `material`
    // as a REQUIRED string (from the `|| "4140 prehard"` fallback), which the execute()
    // param type SpeedFeedParams demands (material is non-optional there). Annotating would
    // widen material back to optional and break assignability -- match the original literal.
    // optimize_for precedence: the SOLVE-FOR chips cover 4 of the 5 enum values
    // (tool_life/productivity/balanced/cost). The advanced "Optimize target" <select> also
    // offers `surface_finish`, which has NO chip -- honor that select value verbatim so the
    // 5th target is reachable (a chip only overrides when the select is one of the 4 it maps).
    const chipTarget = SOLVE_MODES.find(entry => entry.id === solveMode)?.optimizeFor;
    const selectIsChipTarget = SOLVE_MODES.some(entry => entry.optimizeFor === input.optimize_for);
    const payload = {
      ...input,
      material: input.material?.trim() || "4140 prehard",
      optimize_for: selectIsChipTarget ? (chipTarget ?? input.optimize_for) : input.optimize_for,
      radial_depth_pct: scaledPct,
      radial_depth_mm: scaledRadial,
    };
    if (mode === "optimize") {
      opt.execute(payload);
    } else {
      calc.execute({ ...payload, output_detail: mode === "full" ? "full" : "minimal" });
    }
  }, [input, mode, aggro, solveMode, calc, opt]);

  const r = result?.result?.value;
  // The backend can return a GATE BLOCK instead of a physics result: { result: { blocked: true,
  // reason, blocker } } (e.g. the pre-machine-completeness-gate). That shape has no `.value`, so `r`
  // is undefined -- without this the page rendered NOTHING (no error, no reason) on a blocked calc, a
  // fail-silent UX bug (oscar soul: a safety/completeness block must be surfaced, never swallowed; R12).
  const blockedResult = result?.result as { blocked?: boolean; reason?: string; blocker?: string } | undefined;
  const isBlocked = !r && blockedResult?.blocked === true;
  const o = optResult?.result?.value;
  const loading = calc.loading || opt.loading;
  const error = calc.error || opt.error;

  // ---- Derived result presentation (all bound to REAL fields; NO_SOURCE where none) ----
  // Null-safe numeric render: the LIVE orchestrator (esp. output_detail:"minimal") can return
  // an alternative row whose numeric fields are null/undefined, so a bare `.toFixed()` crashes
  // the whole page to the error boundary (found via live sim, R12/R16). `num()` renders the
  // em-dash for a non-finite value instead of throwing, exactly like every other absent source.
  const numOr = (v: number | null | undefined, digits = 0): string =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : NO_SOURCE;
  // The active SOLVE-FOR label for the "vs optimal" caption.
  const solveLabel = SOLVE_MODES.find(entry => entry.id === solveMode)?.label ?? "Optimal";
  // Deflection thou (design shows thousandths of an inch) from the real deflection_um.
  const deflThou = r && Number.isFinite(r.deflection_um) ? (r.deflection_um / 25.4).toFixed(2) : NO_SOURCE;
  // "Vs. the old way": the conventional baseline the orchestrator carries in alternatives[]
  // (labelled "Conservative"/"Conventional"/"Baseline"), compared against the recommended
  // (current) result. Improvement = MRR gain of current over baseline. The card renders ONLY
  // when the baseline carries a finite positive MRR (else no valid ratio, no card).
  const baseline = r?.alternatives?.find(alt =>
    /conserv|baseline|conventional|traditional|book/i.test(alt.label));
  const baseMrr = typeof baseline?.mrr_cm3min === "number" && Number.isFinite(baseline.mrr_cm3min) ? baseline.mrr_cm3min : null;
  const improvePct = r && baseMrr != null && baseMrr > 0 && Number.isFinite(r.mrr_cm3min)
    ? (((r.mrr_cm3min - baseMrr) / baseMrr) * 100)
    : null;
  // Radar "vs optimal": the current result's five axes normalized against the best
  // alternative on each axis. Non-finite alternative values are filtered so a null row never
  // poisons Math.max into NaN.
  const finite = (arr: Array<number | null | undefined>): number[] =>
    arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  const radarData = r ? (() => {
    const alts = r.alternatives ?? [];
    const maxMrr = Math.max(...finite([r.mrr_cm3min, ...alts.map(a => a.mrr_cm3min)]), 1);
    const maxLife = Math.max(...finite([r.tool_life_min, ...alts.map(a => a.tool_life_min)]), 1);
    const maxVc = Math.max(...finite([r.cutting_speed_mpm, ...alts.map(a => a.cutting_speed_mpm)]), 1);
    return [
      { label: "MRR", value: (Number(r.mrr_cm3min) / maxMrr) * 100 || 0, max: 100 },
      { label: "Life", value: (Number(r.tool_life_min) / maxLife) * 100 || 0, max: 100 },
      { label: "Vc", value: (Number(r.cutting_speed_mpm) / maxVc) * 100 || 0, max: 100 },
      { label: "Conf", value: (Number(r.overall_confidence) || 0) * 100, max: 100 },
      { label: "Stable", value: (1 - (Number(r.stability_assessment?.p_chatter) || 0)) * 100, max: 100 },
    ];
  })() : null;

  const machineLabel = input.machine_name ?? "No machine";
  // Engagement % for the viewport heat + caption: the AGGRO-scaled radial/diameter ratio
  // (0..100) so the on-screen preview matches the radial actually sent to the backend (the
  // caption would otherwise show the unscaled depth while the payload carries the scaled one).
  const engagementPct = (() => {
    const dia = input.tool_diameter_mm ?? 0;
    const rawAe = input.radial_depth_mm ?? 0;
    if (dia <= 0) return 0;
    const ae = Math.min(dia, rawAe * aggroEngagementFactor(aggro)); // same scale as handleCalculate
    return Math.max(0, Math.min(100, (ae / dia) * 100));
  })();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-3 sm:px-4 [font-family:var(--font-sans)] text-[var(--kz-text)]">
      {/* ── Header band (design: title, JM DIE job, LEARNED runs, machine, inch/mm) ── */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-white/[0.06] bg-[var(--kz-panel-2)] px-5 py-3">
        <div>
          <div className="text-[19px] font-semibold tracking-tight [font-family:var(--font-display)]">Speed &amp; Feed</div>
          <div className={`${numClass} text-[10.5px] tracking-[0.04em] text-[var(--kz-text-mute)] mt-0.5`}>JM DIE {"·"} Milling &amp; turning studio</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--kz-orange)]/30 bg-[var(--kz-orange)]/[0.08] px-[11px] py-1.5 ${numClass} text-[10.5px] text-[var(--kz-orange-soft)]`}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--kz-orange)]" />
            LEARNED {"·"} JM RUNS
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-white/10 px-[11px] py-1.5 text-[12px] text-[var(--kz-text-dim)]" data-testid="sf-machine-label">{machineLabel}</span>
        </div>
      </header>

      {/* ── 3-column studio: 368px inputs | fluid center | 366px results.
             Collapses to one column below lg (web/CLAUDE.md mobile: card-stack <600px). ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[368px_minmax(0,1fr)_366px]">

        {/* ───────── LEFT: INPUT COLUMN ───────── */}
        <section className="min-w-0 space-y-3">

          {/* Mode chips (quick / full / optimize) -- preserved from the wired page. */}
          <div className="flex gap-1.5" role="tablist" aria-label="Calculation mode">
            {(["quick", "full", "optimize"] as Mode[]).map(currentMode => (
              <button
                key={currentMode}
                onClick={() => setMode(currentMode)}
                aria-pressed={mode === currentMode}
                className={`min-h-[36px] flex-1 rounded-[9px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === currentMode
                    ? "bg-[var(--kz-orange)] text-black"
                    : "border border-white/10 bg-[var(--kz-panel)] text-[var(--kz-text-dim)] hover:border-white/20"
                }`}
              >
                {currentMode === "quick" ? "Quick" : currentMode === "full" ? "Full" : "Pareto"}
              </button>
            ))}
          </div>

          {/* 01 · MACHINE */}
          <div className={panelClass}>
            <div className="flex items-center justify-between">
              <div className={eyebrowClass}>01 {"·"} MACHINE</div>
              {selectedMachineNote && <span className="text-[10px] text-[var(--kz-text-mute)] max-w-[55%] text-right truncate">{selectedMachineNote}</span>}
            </div>
            <div>
              <label htmlFor="sf-machine-preset" className={labelClass}>JM Die / Catalog Machine</label>
              <select
                id="sf-machine-preset"
                data-testid="machine-preset"
                value={resolvePresetId(input.machine_name)}
                onChange={event => applyMachinePreset(event.target.value)}
                className={inputClass}
              >
                <option value="">Manual / unresolved</option>
                <optgroup label="JM Die machines">
                  {JM_DIE_MACHINES.map(machine => <option key={machine.id} value={machine.id}>{machine.label}</option>)}
                </optgroup>
                <optgroup label="Catalog machines">
                  {catalogMachines.map(machine => (
                    <option key={machine.id} value={machine.id}>{machine.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="mt-2">
              {stringField("machine_name", "Machine lookup name", "Haas VF-2")}
            </div>
            {/* SPINDLE / CONTROL / RIGIDITY read-only chips from the resolved envelope. */}
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              <div className={chipClass}><div className={chipCapClass}>SPINDLE</div><div className={chipValClass}>{input.machine_max_rpm ? `${(input.machine_max_rpm / 1000).toFixed(input.machine_max_rpm % 1000 ? 1 : 0)}k` : NO_SOURCE}{input.machine_power_kw ? `${"·"}${input.machine_power_kw}kW` : ""}</div></div>
              <div className={chipClass}><div className={chipCapClass}>TAPER</div><div className={chipValClass}>{input.spindle_taper ?? NO_SOURCE}</div></div>
              <div className={chipClass}><div className={chipCapClass}>RIGIDITY</div><div className={`${chipCapClass.replace("text-[9px]", "text-[12px]")} mt-0.5 text-[var(--kz-orange-soft)]`}>{input.machine_rigidity ?? NO_SOURCE}</div></div>
            </div>
            {/* Thru-spindle / HP / probing option toggles (design) -> real coolant + pressure. */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => update("coolant_type", input.coolant_type === "through_tool" ? "flood" : "through_tool")}
                aria-pressed={input.coolant_type === "through_tool"}
                className={`min-h-[32px] rounded-[8px] px-2.5 py-1 text-[11px] ${input.coolant_type === "through_tool" ? "border border-[var(--kz-orange)]/40 bg-[var(--kz-orange)]/10 text-[var(--kz-orange-soft)]" : "border border-white/10 text-[var(--kz-text-dim)]"}`}
              >Thru-spindle</button>
              <button
                type="button"
                onClick={() => update("coolant_pressure_bar", (input.coolant_pressure_bar ?? 0) >= 70 ? 5 : 70)}
                aria-pressed={(input.coolant_pressure_bar ?? 0) >= 70}
                className={`min-h-[32px] rounded-[8px] px-2.5 py-1 text-[11px] ${(input.coolant_pressure_bar ?? 0) >= 70 ? "border border-[var(--kz-orange)]/40 bg-[var(--kz-orange)]/10 text-[var(--kz-orange-soft)]" : "border border-white/10 text-[var(--kz-text-dim)]"}`}
              >HP 70bar</button>
            </div>
          </div>

          {/* 02 · MATERIAL & STOCK */}
          <div className={panelClass}>
            <div className={eyebrowClass}>02 {"·"} MATERIAL &amp; STOCK</div>
            <div>
              <label htmlFor="sf-material" className={labelClass}>Material</label>
              <input
                id="sf-material"
                type="text"
                list="sfc-material-suggestions"
                data-field="material"
                value={(input.material as string | undefined) ?? ""}
                onChange={event => handleMaterialInput(event.target.value)}
                className={inputClass}
                placeholder="4140 prehard, H13, D2, 6061, Ti-6Al-4V"
              />
              <datalist id="sfc-material-suggestions">
                {materialSuggestions.map(material => (
                  <option key={material.id} value={material.name}>{material.display}</option>
                ))}
              </datalist>
            </div>
            {/* ISO / HB / HRC chips (design's ISO/kc1.1/HRC ribbon, from real fields). */}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <div className={chipClass}><div className={chipCapClass}>ISO</div><div className={`${numClass} mt-0.5 text-[13px] font-bold text-[var(--kz-orange-soft)]`}>{input.iso_group ?? NO_SOURCE}</div></div>
              <div className={chipClass}><div className={chipCapClass}>HB</div><div className={chipValClass}>{input.hardness_hb ?? NO_SOURCE}</div></div>
              <div className={chipClass}><div className={chipCapClass}>HRC</div><div className={chipValClass}>{input.hardness_hrc ?? NO_SOURCE}</div></div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {selectField("iso_group", "ISO", ISO_GROUPS, "Auto")}
              {numberField("hardness_hb", "HB", { min: 0 })}
              {numberField("hardness_hrc", "HRC", { min: 0 })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {numberField("sigma_y_MPa", "Yield MPa", { min: 0 })}
              {selectField("optimize_for", "Optimize target", [
                { value: "balanced", label: "Balanced" },
                { value: "tool_life", label: "Tool Life" },
                { value: "productivity", label: "Productivity" },
                { value: "surface_finish", label: "Surface Finish" },
                { value: "cost", label: "Cost" },
              ])}
            </div>
            <div className="mt-2">
              <DbBackedSelect
                catalog="stock"
                value={stockPick}
                onChange={setStockPick}
                onSelectOption={(opt) => applyStockSelection(opt as StockOption | undefined)}
                label="Raw stock (fills material + ISO + hardness)"
                placeholder="Pick from the stock database..."
                labelClassName={labelClass}
                selectClassName={inputClass}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {numberField("workpiece_length_mm", "Stock L mm", { min: 0 })}
              {numberField("workpiece_width_mm", "Stock W mm", { min: 0 })}
              {numberField("workpiece_height_mm", "Stock H mm", { min: 0 })}
            </div>
          </div>

          {/* 03 · TOOL & HOLDER */}
          <div className={panelClass}>
            <div className={eyebrowClass}>03 {"·"} TOOL &amp; HOLDER</div>
            <div className="mb-2">
              <ToolSearchSelect
                label="Search tool catalog (fills diameter / flutes / coating / helix)"
                onSelect={applyToolSelection}
                labelClassName={labelClass}
                inputClassName={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {numberField("tool_diameter_mm", "Diameter mm", { min: 0.1 })}
              {numberField("flutes", "Flutes", { min: 1, step: 1 })}
              {selectField("tool_material", "Tool material", TOOL_MATERIALS)}
              <DbBackedSelect
                catalog="coating"
                valueField="label"
                value={input.tool_coating ?? ""}
                onChange={value => update("tool_coating", value || undefined)}
                label="Coating"
                placeholder="Catalog default"
                labelClassName={labelClass}
                selectClassName={inputClass}
              />
              {selectField("holder_type", "Holder", HOLDER_TYPES)}
              {numberField("helix_angle_deg", "Helix deg", { min: 0, max: 60 })}
              {numberField("corner_radius_mm", "Corner R mm", { min: 0 })}
              {numberField("tool_stickout_mm", "Stickout mm", { min: 0 })}
              {numberField("flute_length_mm", "Flute length mm", { min: 0 })}
              {numberField("overall_length_mm", "Overall length mm", { min: 0 })}
              {numberField("edge_radius_mm", "Edge radius mm", { min: 0 })}
            </div>
            <div className="mt-2 space-y-2">
              <DbBackedSelect
                catalog="holder"
                value={holderPick}
                onChange={setHolderPick}
                onSelectOption={(opt) => applyHolderSelection(opt as HolderCatalogOption | undefined)}
                label="Holder catalog (fills holder type)"
                placeholder="Pick a holder from the catalog..."
                labelClassName={labelClass}
                selectClassName={inputClass}
              />
              <DbBackedSelect
                catalog="insert"
                value={insertPick}
                onChange={setInsertPick}
                onSelectOption={(opt) => applyInsertSelection(opt as InsertOption | undefined)}
                label="Indexable insert (fills grade + series)"
                placeholder="Pick an insert from the catalog..."
                labelClassName={labelClass}
                selectClassName={inputClass}
              />
              <DbBackedSelect
                catalog="turning-insert"
                value={turningInsertPick}
                onChange={setTurningInsertPick}
                onSelectOption={(opt) => applyTurningInsertSelection(opt as TurningInsertOption | undefined)}
                label="Turning insert (fills nose radius + ISO series)"
                placeholder="Pick a lathe insert from the catalog..."
                labelClassName={labelClass}
                selectClassName={inputClass}
              />
              <div className="grid grid-cols-2 gap-1.5">
                {stringField("tool_grade", "Tool grade", "GC4325, IC928")}
                {stringField("insert_grade", "Insert grade", "GC1130")}
              </div>
              {stringField("tool_series", "Tool series", "CoroMill 390, HARVI")}
            </div>
          </div>

          {/* 04 · CUT */}
          <div className={panelClass}>
            <div className={eyebrowClass}>04 {"·"} CUT</div>
            <div className="grid grid-cols-2 gap-1.5">
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
              {selectField("cam_system", "CAM seat", camSystems.map(cam => ({ value: cam, label: cam })), "Generic")}
              {numberField("axial_depth_mm", "Axial ap mm", { min: 0 })}
              {numberField("radial_depth_mm", "Radial ae mm", { min: 0 })}
              {numberField("radial_depth_pct", "Radial %D", { min: 0, max: 100 })}
              {selectField("coolant_type", "Coolant", COOLANT_TYPES)}
              {selectField("workholding_type", "Workholding", WORKHOLDING_TYPES)}
              {numberField("wall_thickness_mm", "Wall mm", { min: 0 })}
              {numberField("overhang_ratio", "L/D", { min: 0 })}
              {numberField("feature_tolerance_mm", "Tolerance mm", { min: 0 })}
            </div>
            <div className="mt-2">
              {stringField("cam_strategy", "CAM strategy note", "Dynamic Milling, Adaptive Clearing")}
            </div>
          </div>

          {/* Machine envelope + economics/calibration -- preserved, collapsed under details. */}
          <details className={panelClass}>
            <summary className="cursor-pointer text-[11px] font-medium text-[var(--kz-text-dim)]">Machine envelope, coolant detail, economics &amp; calibration</summary>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
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
              {numberField("natural_frequency_hz", "Natural Hz", { min: 0 })}
              {numberField("system_stiffness_n_m", "Stiffness N/m", { min: 0 })}
              {numberField("damping_ratio", "Damping", { min: 0, step: 0.001 })}
              {numberField("holder_gauge_length_mm", "Gauge length mm", { min: 0 })}
              {numberField("holder_tir_mm", "TIR mm", { min: 0, step: 0.001 })}
              {numberField("clamping_force_kN", "Clamp kN", { min: 0 })}
              {numberField("coolant_pressure_bar", "Coolant bar", { min: 0 })}
              {numberField("coolant_concentration_pct", "Coolant %", { min: 0, max: 100 })}
              {numberField("tool_cost_usd", "Tool cost $", { min: 0 })}
              {numberField("machine_cost_per_min", "$ / min", { min: 0 })}
              {calibrationField("confidence", "Cal confidence", "0.8")}
              {calibrationField("vc_factor", "Vc factor", "1.0")}
              {calibrationField("kc1_1_factor", "Kienzle factor", "1.0")}
              {calibrationField("ra_factor", "Ra factor", "1.0")}
              {calibrationField("power_factor", "Power factor", "1.0")}
              {calibrationField("taylor_c_factor", "Taylor C", "1.0")}
              {calibrationField("taylor_n_factor", "Taylor n", "1.0")}
            </div>
            <div className="mt-2">
              <DbBackedSelect
                catalog="coolant"
                value={coolantMethodPick}
                onChange={setCoolantMethodPick}
                onSelectOption={(opt) => applyCoolantMethodSelection(opt as CoolantOption | undefined)}
                label="Coolant method (fills coolant type; rates effectiveness)"
                placeholder="Pick a coolant method..."
                labelClassName={labelClass}
                selectClassName={inputClass}
              />
              <div className="mt-2">
                <DbBackedSelect
                  catalog="workholding"
                  value={workholdingPick}
                  onChange={setWorkholdingPick}
                  onSelectOption={(opt) => applyWorkholdingSelection(opt as WorkholdingCatalogOption | undefined)}
                  label="Workholding / fixture catalog (fills workholding type)"
                  placeholder="Pick a fixture from the catalog..."
                  labelClassName={labelClass}
                  selectClassName={inputClass}
                />
              </div>
              <div className="mt-2">
                <DbBackedSelect
                  catalog="coolant-product"
                  value={coolantProductPick}
                  onChange={setCoolantProductPick}
                  onSelectOption={(opt) => applyCoolantProductSelection(opt as CoolantProductOption | undefined)}
                  label="Coolant product (fills coolant type)"
                  placeholder="Pick a coolant product..."
                  labelClassName={labelClass}
                  selectClassName={inputClass}
                />
              </div>
            </div>
          </details>
        </section>

        {/* ───────── CENTER: VIEWPORT + CHART ───────── */}
        <section className="min-w-0 space-y-3">
          {/* Engagement viewport: real engagement heat + toolpath overlay driven by inputs. */}
          <div className="rounded-[15px] border border-white/[0.08] bg-[var(--kz-panel)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[14px] font-semibold [font-family:var(--font-display)]">Cut viewport</span>
              <span className={`${numClass} text-[10px] text-[var(--kz-text-mute)]`}>
                {(input.tool_diameter_mm ?? 0).toFixed(1)}mm {input.flutes ?? 0}FL {"·"} {input.strategy ?? "adaptive"}
              </span>
            </div>
            <svg viewBox="0 0 740 300" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" className="block" role="img" aria-label="Cut engagement viewport">
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`v${i}`} x1={20 + i * 88} y1={20} x2={20 + i * 88} y2={280} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              ))}
              {Array.from({ length: 4 }).map((_, i) => (
                <line key={`h${i}`} x1={20} y1={40 + i * 70} x2={720} y2={40 + i * 70} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              ))}
              {/* Stock block */}
              <rect x={120} y={70} width={500} height={160} rx={4} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              {/* Engaged band: width scales with the REAL engagement % (radial/dia). */}
              <rect x={120} y={70} width={Math.max(6, (engagementPct / 100) * 500)} height={160} rx={4}
                fill={`rgb(var(--kz-orange-rgb) / ${(0.1 + (engagementPct / 100) * 0.35).toFixed(2)})`}
                stroke="var(--kz-orange)" strokeWidth={1} />
              {/* Toolpath overlay (dashed) */}
              <polyline points="120,150 250,110 380,180 510,120 620,150" fill="none" stroke="var(--kz-orange-soft)" strokeWidth={1.4} strokeDasharray="4 3" opacity={0.85} strokeLinejoin="round" />
              <circle cx={620} cy={150} r={5} fill="var(--kz-orange)" />
            </svg>
            <div className="mt-1 flex flex-wrap gap-4">
              <span className={`inline-flex items-center gap-1.5 ${numClass} text-[10px] text-[var(--kz-text-dim)]`}><span className="h-2 w-2 rounded-sm bg-[var(--kz-orange)]" />engagement {engagementPct.toFixed(0)}%</span>
              <span className={`inline-flex items-center gap-1.5 ${numClass} text-[10px] text-[var(--kz-text-dim)]`}>MRR {r ? numOr(r.mrr_cm3min, 1) : NO_SOURCE} cm3/min</span>
            </div>
          </div>

          {/* Tool-life / stability alternatives chart -- real alternatives[] MRR-vs-life. */}
          <div className="rounded-[15px] border border-white/[0.08] bg-[var(--kz-panel)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[14px] font-semibold [font-family:var(--font-display)]">Tool life vs MRR</span>
              <span className={`${numClass} text-[10px] text-[var(--kz-text-mute)]`}>alternatives {"·"} real physics</span>
            </div>
            {r && r.alternatives && r.alternatives.length > 0 ? (
              <svg viewBox="0 0 740 200" preserveAspectRatio="xMidYMid meet" width="100%" height="160" className="block" role="img" aria-label="Tool life versus MRR across alternatives">
                <line x1={44} y1={14} x2={44} y2={168} stroke="var(--kz-line)" strokeWidth={1} />
                <line x1={44} y1={168} x2={726} y2={168} stroke="var(--kz-line)" strokeWidth={1} />
                {(() => {
                  const alts = r.alternatives;
                  const maxLife = Math.max(...finite([r.tool_life_min, ...alts.map(a => a.tool_life_min)]), 1);
                  const barW = Math.min(90, (682 / (alts.length + 1)) - 8);
                  return [{ label: "Current", tool_life_min: r.tool_life_min, mrr_cm3min: r.mrr_cm3min }, ...alts].map((a, i) => {
                    const x = 60 + i * (barW + 12);
                    const life = Number.isFinite(a.tool_life_min) ? a.tool_life_min : 0;
                    const h = (life / maxLife) * 150;
                    return (
                      <g key={i}>
                        <rect x={x} y={168 - h} width={barW} height={h} rx={3} fill={i === 0 ? "var(--kz-orange)" : "rgba(255,255,255,0.16)"} />
                        <text x={x + barW / 2} y={183} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={8} fill="var(--kz-text-mute)">{a.label.slice(0, 8)}</text>
                        <text x={x + barW / 2} y={168 - h - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="var(--kz-text-dim)">{numOr(a.tool_life_min, 0)}</text>
                      </g>
                    );
                  });
                })()}
              </svg>
            ) : (
              <div className="flex h-[160px] items-center justify-center text-[12px] text-[var(--kz-text-mute)]">{NO_SOURCE} run a calculation to plot alternatives</div>
            )}
          </div>

          {/* Full-analysis detail (uncertainty banner + tabs + limiting factors), preserved. */}
          {r && mode !== "optimize" && (
            <>
              <UncertaintyAdvisoryBanner result={r} />
              <div className="rounded-[15px] border border-white/[0.08] bg-[var(--kz-panel)] p-4">
                <Tabs defaultValue="stability">
                  <TabList>
                    <Tab value="stability">Stability</Tab>
                    <Tab value="safety">Safety ({r.safety_checks.length})</Tab>
                    <Tab value="playbook">Playbook ({r.playbook_warnings.length})</Tab>
                    <Tab value="uncertainty">Uncertainty</Tab>
                    <Tab value="alternatives">Alternatives</Tab>
                  </TabList>

                  <TabPanel value="stability">
                    <div className="p-3 text-sm text-[var(--kz-text-dim)]">
                      <p className="mb-2 font-medium text-[var(--kz-text)]">{r.stability_assessment.message}</p>
                      <div className="text-xs">
                        P(chatter) = {Number.isFinite(r.stability_assessment?.p_chatter) ? (r.stability_assessment.p_chatter * 100).toFixed(1) : NO_SOURCE}%
                        {r.stability_assessment.suggested_rpm_pocket && (
                          <span className="ml-2 text-[var(--kz-orange-soft)]">
                            Suggested stable pocket: {r.stability_assessment.suggested_rpm_pocket} RPM (lobe {r.stability_assessment.lobe_index})
                          </span>
                        )}
                      </div>
                    </div>
                  </TabPanel>

                  <TabPanel value="safety">
                    <div className="space-y-1 p-3">
                      {r.safety_checks.map((check, index) => (
                        <div
                          key={index}
                          data-testid={check.passed ? "sfc-safety-row-pass" : "sfc-safety-row-fail"}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                            check.passed
                              ? "bg-accent/[0.08] text-accent"
                              : "bg-[var(--kz-red)]/10 font-semibold text-[var(--kz-red)] ring-1 ring-[var(--kz-red)]/40"
                          }`}
                        >
                          <span>{check.passed ? "OK" : "FAIL"}</span>
                          <span className="font-medium">{check.name}</span>
                          <span className="text-[var(--kz-text-mute)]">{check.message}</span>
                        </div>
                      ))}
                    </div>
                  </TabPanel>

                  <TabPanel value="playbook">
                    <div className="space-y-1 p-3">
                      {r.playbook_warnings.map((warning, index) => (
                        <div key={index} className="rounded bg-[var(--kz-gold)]/10 px-2 py-1 text-xs text-[var(--kz-gold)]">{warning}</div>
                      ))}
                      {r.playbook_warnings.length === 0 && <p className="text-xs text-[var(--kz-text-mute)]">No warnings for this setup.</p>}
                    </div>
                  </TabPanel>

                  <TabPanel value="uncertainty">
                    <div className="space-y-2 p-3 text-xs text-[var(--kz-text-dim)]">
                      {/* CI95 tuples can arrive [null, null] on a marginal/low-confidence result
                          (found via live sim) -- numOr renders the em-dash per element, never crashes. */}
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div>Force CI95: [{numOr(r.uncertainty.force_ci95?.[0], 0)}, {numOr(r.uncertainty.force_ci95?.[1], 0)}] N</div>
                        <div>Life CI95: [{numOr(r.uncertainty.life_ci95?.[0], 1)}, {numOr(r.uncertainty.life_ci95?.[1], 1)}] min</div>
                        <div>Ra CI95: [{numOr(r.uncertainty.ra_ci95?.[0], 3)}, {numOr(r.uncertainty.ra_ci95?.[1], 3)}] um</div>
                        <div>Ra Cpk: {r.uncertainty.ra_cpk?.toFixed(2) ?? "N/A"}</div>
                      </div>
                      {(() => {
                        const cv = formatCvBreakdown(r.uncertainty);
                        return cv ? (
                          <div className="mt-2 rounded bg-[var(--kz-panel-2)] p-2" data-testid="sfc-cv-breakdown">
                            <span className="font-medium">Coefficient of variation (CV%): </span>{cv}
                          </div>
                        ) : null;
                      })()}
                      {r.uncertainty.weibull && (
                        <div className="mt-2 rounded bg-[var(--kz-panel-2)] p-2">
                          <span className="font-medium">Weibull: </span>
                          beta={r.uncertainty.weibull.beta}, eta={r.uncertainty.weibull.eta_min} min,
                          P(survive 30min)={Number.isFinite(r.uncertainty.weibull.p_survive_30min) ? (r.uncertainty.weibull.p_survive_30min * 100).toFixed(1) : NO_SOURCE}%
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="font-medium">Sobol: </span>
                        kc={r.uncertainty.sobol_contributions.kc_pct}%,
                        life={r.uncertainty.sobol_contributions.life_pct}%,
                        Ra={r.uncertainty.sobol_contributions.ra_pct}%
                      </div>
                      <div className="mt-1 text-[var(--kz-orange-soft)]">{r.uncertainty.suggested_measurement}</div>
                    </div>
                  </TabPanel>

                  <TabPanel value="alternatives">
                    <div className="overflow-x-auto p-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[var(--kz-text-mute)]">
                            <th className="pb-1">Mode</th><th>Vc</th><th>Feed</th><th>MRR</th><th>Life</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.alternatives.map((alternative, index) => (
                            <tr key={index} className="border-t border-white/5">
                              <td className="py-1 font-medium">{alternative.label}</td>
                              <td>{numOr(alternative.cutting_speed_mpm, 1)}</td>
                              <td>{numOr(alternative.feed_rate_mmmin, 0)}</td>
                              <td>{numOr(alternative.mrr_cm3min, 1)}</td>
                              <td>{numOr(alternative.tool_life_min, 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabPanel>
                </Tabs>
              </div>

              <div className="rounded-[15px] border border-white/[0.08] bg-[var(--kz-panel)] p-4">
                <h4 className="mb-2 text-sm font-bold">Limiting Factors</h4>
                <div className="space-y-1">
                  {r.limiting_factors.map((factor, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <Badge color={factor.severity === "critical" ? "red" : factor.severity === "warning" ? "yellow" : "slate"}>
                        {numOr(factor.utilization_pct, 0)}%
                      </Badge>
                      <span className="font-medium">{factor.parameter}</span>
                      <span className="text-[var(--kz-text-mute)]">{factor.constraint}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-[var(--kz-text-mute)]">Formulas: {r.formulas_used.join(", ")}</div>
              </div>
            </>
          )}

          {/* MOPSO Pareto (optimize mode) -- preserved. */}
          {o && mode === "optimize" && (
            <div className="rounded-[15px] border border-white/[0.08] bg-[var(--kz-panel)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">MOPSO Pareto Front</h3>
                <Badge color="slate">{o.method} | {o.particles}p x {o.iterations}iter | {o.archive_size} solutions</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[var(--kz-text-mute)]">
                      <th className="pb-1 pr-2">Solution</th><th>Vc</th><th>fz</th><th>ap</th><th>MRR</th><th>Life</th><th>Ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.pareto_front.map((solution, index) => (
                      <tr key={index} className={`border-t border-white/5 ${solution.label === o.recommended ? "bg-[var(--kz-orange)]/10 font-medium" : ""}`}>
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
              <p className="mt-2 text-xs text-[var(--kz-orange-soft)]">Recommended: {o.recommended}</p>
            </div>
          )}
        </section>

        {/* ───────── RIGHT: SOLVE-FOR + RESULT CARDS ───────── */}
        <section className="min-w-0 space-y-3">
          {/* SOLVE FOR intent modes -> real optimize_for. */}
          <div className="rounded-[13px] border border-white/[0.07] bg-[var(--kz-panel)] p-4">
            <div className={`${numClass} mb-2 text-[10.5px] tracking-[0.16em] text-[var(--kz-text-mute)]`}>SOLVE FOR</div>
            <div className="grid grid-cols-2 gap-2">
              {SOLVE_MODES.map(sm => (
                <button
                  key={sm.id}
                  onClick={() => applySolveMode(sm.id)}
                  aria-pressed={solveMode === sm.id}
                  data-testid={`solve-mode-${sm.id}`}
                  className={`flex min-h-[44px] items-center gap-2 rounded-[11px] px-3 py-2 text-left transition-colors ${
                    solveMode === sm.id
                      ? "border border-[var(--kz-orange)]/50 bg-[var(--kz-orange)]/10"
                      : "border border-white/[0.07] bg-[var(--kz-panel-2)] hover:border-white/20"
                  }`}
                >
                  <span className="text-[15px]">{sm.glyph}</span>
                  <span className="text-[12.5px] font-semibold [font-family:var(--font-display)]">{sm.label}</span>
                </button>
              ))}
            </div>
            {/* AGGRO engagement slider -> scales the real radial depth. */}
            <div className="mt-3 flex items-center gap-3 rounded-[11px] border border-white/[0.07] bg-[var(--kz-panel-2)] px-3.5 py-2.5">
              <div className="flex-none">
                <div className={`${numClass} text-[9px] tracking-[0.1em] text-[var(--kz-text-mute)]`}>AGGRO</div>
                <div className="text-[14px] font-bold [font-family:var(--font-display)] text-[var(--kz-orange-soft)]">{aggro}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={aggro}
                onChange={event => setAggro(Number(event.target.value))}
                aria-label="Aggressiveness (radial engagement scale)"
                data-testid="aggro-slider"
                className="flex-1 accent-[var(--kz-orange)]"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--kz-text-mute)]">Scales radial engagement; 50% = your typed depths.</p>
          </div>

          {/* Calculate CTA. */}
          <Button onClick={handleCalculate} disabled={loading} className="min-h-[44px] w-full" data-testid="calculate-speed-feed">
            {loading ? <><Spinner size="sm" /> Calculating...</> : mode === "optimize" ? "Run MOPSO Optimization" : "Calculate"}
          </Button>
          {error && <p className="text-xs text-[var(--kz-red)]">{error}</p>}

          {/* SPINDLE + FEED result cards. */}
          {r && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[13px] border border-[var(--kz-orange)]/28 bg-[linear-gradient(180deg,rgb(var(--kz-orange-rgb)/0.10),var(--kz-panel))] p-3.5">
                  <div className={`${numClass} text-[10px] tracking-[0.08em] text-[var(--kz-orange-soft)]`}>SPINDLE</div>
                  <div className={`${numClass} mt-1.5 text-[30px] font-bold leading-none`} data-testid="sf-rpm">{Number.isFinite(r.spindle_rpm) ? r.spindle_rpm : NO_SOURCE}</div>
                  <div className="mt-1.5 text-[11px] text-[var(--kz-text-dim)]">RPM {"·"} {numOr(r.cutting_speed_mpm, 0)} m/min</div>
                </div>
                <div className="rounded-[13px] border border-[var(--kz-orange)]/28 bg-[linear-gradient(180deg,rgb(var(--kz-orange-rgb)/0.10),var(--kz-panel))] p-3.5">
                  <div className={`${numClass} text-[10px] tracking-[0.08em] text-[var(--kz-orange-soft)]`}>FEED</div>
                  <div className={`${numClass} mt-1.5 text-[30px] font-bold leading-none`} data-testid="sf-feed">{numOr(r.feed_rate_mmmin, 0)}</div>
                  <div className="mt-1.5 text-[11px] text-[var(--kz-text-dim)]">mm/min {"·"} {numOr(r.feed_per_tooth_mm, 4)}/t</div>
                </div>
              </div>

              {/* SAFETY donut cluster + rows (force / deflection / tool-life / edge-wear /
                  cut-temp / confidence). Real fields; cut-temp + edge-wear = NO_SOURCE. Every
                  numeric is null-safe (numOr) -- a live gate-partial result must never crash. */}
              <div className="rounded-[13px] border border-white/[0.08] bg-[var(--kz-panel)] p-4">
                <div className="flex items-center gap-3.5">
                  <ProgressRingLite pct={Math.min(1, engagementPct / 100)} label="LOAD" color="var(--kz-orange)" />
                  <ProgressRingLite pct={Number(r.overall_confidence) || 0} label="CONF" color="var(--kz-orange)" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <SafetyRow k="Force Fc" v={`${numOr(r.tangential_force_N, 0)} N`} />
                    <SafetyRow k="Deflection" v={`${deflThou} th`} />
                    <SafetyRow k="Tool life" v={`${numOr(r.tool_life_min, 0)} min`} />
                    <SafetyRow k="Cut temp" v={NO_SOURCE} muted />
                    <SafetyRow k="Ra" v={`${numOr(r.surface_finish_Ra_um, 2)} um`} />
                    <SafetyRow k="Confidence" v={`${Number.isFinite(r.overall_confidence) ? (r.overall_confidence * 100).toFixed(0) : NO_SOURCE}%`} />
                  </div>
                </div>
              </div>

              {/* Entry move -- NO backend source yet -> all NO_SOURCE (R12), honestly labeled. */}
              <div className="rounded-[13px] border border-white/[0.08] bg-[var(--kz-panel)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold [font-family:var(--font-display)]">Entry move</span>
                  <span className={`${numClass} text-[9.5px] text-[var(--kz-text-mute)]`}>not yet computed</span>
                </div>
                <div className="flex gap-3.5">
                  {[["RAMP", NO_SOURCE], ["PLUNGE", NO_SOURCE], ["HELIX", NO_SOURCE], ["PER REV", NO_SOURCE]].map(([cap, val]) => (
                    <div key={cap} className="flex-1">
                      <div className={`${numClass} text-[9px] text-[var(--kz-text-mute)]`}>{cap}</div>
                      <div className={`${numClass} mt-0.5 text-[15px] text-[var(--kz-text-mute)]`}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar "vs optimal" (real axes normalized across alternatives). */}
              {radarData && (
                <div className="rounded-[13px] border border-white/[0.08] bg-[var(--kz-panel)] p-3">
                  <div className={`${numClass} mb-1 text-[9.5px] text-[var(--kz-text-mute)]`}>{solveLabel} vs alternatives</div>
                  <div className="flex justify-center">
                    <RadarChart data={radarData} size={200} color="#ff5a2b" />
                  </div>
                </div>
              )}

              {/* Vs. the old way (real baseline from alternatives[]). */}
              {improvePct != null && (
                <div className="rounded-[13px] border border-white/[0.08] bg-[linear-gradient(90deg,rgb(var(--accent-rgb)/0.05),transparent)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-semibold [font-family:var(--font-display)]">Vs. the old way</span>
                    <span className="text-[16px] font-bold text-accent [font-family:var(--font-display)]">{improvePct >= 0 ? "+" : ""}{improvePct.toFixed(0)}%</span>
                  </div>
                  {baseline && (
                    <div className={`flex items-center gap-2 ${numClass} text-[11.5px]`}>
                      <span className="text-[var(--kz-text-mute)] line-through">{numOr(baseline.spindle_rpm, 0)}/{numOr(baseline.feed_rate_mmmin, 0)}</span>
                      <span className="text-[var(--kz-orange-soft)]">-&gt;</span>
                      <span>{numOr(r.spindle_rpm, 0)}/{numOr(r.feed_rate_mmmin, 0)}</span>
                    </div>
                  )}
                  <p className="mt-2 text-[11.5px] leading-snug text-[var(--kz-text-dim)]">
                    {improvePct >= 0
                      ? `${improvePct.toFixed(0)}% more MRR than the ${baseline?.label ?? "conservative"} baseline at the current safety envelope.`
                      : `Current setup trades ${Math.abs(improvePct).toFixed(0)}% MRR for the ${solveLabel.toLowerCase()} objective.`}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Blocked-gate surfacing (safety/completeness), preserved. */}
          {isBlocked && !loading && (
            <div className="rounded-[13px] border border-[var(--kz-red)]/40 bg-[var(--kz-red)]/10 p-4" role="alert" data-testid="sfc-blocked">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="red">Blocked</Badge>
                <span className="font-semibold text-[var(--kz-red)]">Calculation blocked before the physics ran</span>
              </div>
              <p className="mt-2 text-sm text-[var(--kz-red)]">{blockedResult?.reason ?? "The request was blocked by a safety/completeness gate."}</p>
              {blockedResult?.blocker && <p className="mt-1 text-xs text-[var(--kz-text-mute)]">Gate: {blockedResult.blocker}</p>}
            </div>
          )}

          {/* Empty state. */}
          {!r && !o && !loading && !isBlocked && (
            <div className="rounded-[13px] border border-white/[0.08] bg-[var(--kz-panel)] p-6 text-center text-[var(--kz-text-mute)]">
              <p className="mb-2 text-[15px]">Pick a machine, material &amp; cut</p>
              <p className="text-sm">Choose a SOLVE-FOR intent, set aggression, and Calculate. The orchestrator resolves the full envelope before running the Kienzle physics stack.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// A compact dark-theme progress ring for the SAFETY donut cluster. The shared
// components/charts ProgressRing hardcodes a light track (#e5e7eb) invisible on the Kienzle
// near-black panel, so this small variant uses --kz tokens. pct is 0..1 (already normalized).
function ProgressRingLite({ pct, label, color }: { pct: number; label: string; color: string }) {
  const size = 66, stroke = 7, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div className="flex-none text-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${Math.round(clamped * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--kz-line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - clamped)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2 - 1} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={14} fontWeight={700} fill="var(--kz-text)">{Math.round(clamped * 100)}</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={7} fill="var(--kz-text-mute)">{label}</text>
      </svg>
    </div>
  );
}

// A key/value safety row for the donut-cluster card.
function SafetyRow({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-[3px] text-[11px] text-[var(--kz-text-dim)]">
      <span>{k}</span>
      <span className={`[font-family:var(--font-mono)] ${muted ? "text-[var(--kz-text-mute)]" : "text-[#C7CCD4]"}`}>{v}</span>
    </div>
  );
}
