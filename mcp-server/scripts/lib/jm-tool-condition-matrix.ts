/**
 * jm-tool-condition-matrix.ts
 * [JM-FUSION-TOOLS-MS0] (slot:romeo)
 *
 * SINGLE SOURCE OF TRUTH for JM's per-(material-grade x toolpath) cutting matrix.
 *
 * Extracted FAITHFULLY from `scripts/generate-jm-fusion-tool-libraries.ts` (the
 * recovered Fusion CSV generator), which already inlines this logic. THREE CAM
 * emitters consume it:
 *   1. the Fusion CSV generator (still inlines its own copy -- this lib is the
 *      canonical re-export so the hyperMILL + Mastercam drivers stay in lockstep),
 *   2. the hyperMILL driver (imports THIS lib),
 *   3. the Mastercam driver (imports THIS lib).
 *
 * UNITS: this lib is CANONICAL-UNITS ONLY -- millimetres for length, m/min for
 * surface speed. It NEVER converts to inches and NEVER formats CSV. Each emitter
 * owns its own unit conversion + serialization. The Fusion generator's
 * `condOverride()` is the inch/CSV view of the SAME math `computeCondition()`
 * computes in raw numbers (see `faithful_to_generator` in the build record).
 *
 * NO top-level side effects: no main(), no writeFileSync, no readFileSync. Pure
 * functions over the two canonical engines.
 *
 * All cutting data flows through `ultimateSpeedFeedEngine.lookupCuttingData()`
 * (Kienzle/Taylor CUTTING_PARAMS) + `getMaterialProfile()` (MATERIAL_DB
 * machinability + hardness). NO inline physics constants beyond the unit factors
 * the generator itself uses (IN_PER_MM / MM_PER_IN / MPM_TO_SFM).
 */

import { ultimateSpeedFeedEngine } from "../../src/engines/UltimateSpeedFeedEngine.js";
import { coatingSelectionAdapter } from "../../src/engines/CoatingSelectionAdapter.js";

// ── ISO machinability group (ISO 513 P/M/K/N/S/H) ──────────────────────────
export type Iso = "P" | "M" | "K" | "N" | "S" | "H";

// ── Constants (faithful copy of the generator's lines ~61-63) ──────────────
export const IN_PER_MM = 1 / 25.4;
export const MM_PER_IN = 25.4;
export const MPM_TO_SFM = 3.28084; // 1 m/min surface speed = 3.28084 SFM

// Table coolant strategy -> emitter-neutral coolant enum (generator lines ~162-165).
// (Fusion maps `dry`->`disabled`, `air_blast`->`air`, `through_tool`->`through tool`;
// hyperMILL / Mastercam drivers map from these same canonical tokens.)
export const COOLANT_MAP: Record<string, string> = {
  flood: "flood",
  mist: "mist",
  dry: "disabled",
  air_blast: "air",
  through_tool: "through tool",
};

// ── Op + cut classes (generator lines ~167, ~231) ──────────────────────────
export type OpClass =
  | "milling"
  | "drilling"
  | "reaming"
  | "tapping"
  | "turning"
  | "thread_milling";
export type CutType = "roughing" | "semi_finishing" | "finishing";

// ── GRADES (14 entries -- generator lines ~100-115, copied VERBATIM) ───────
// Each ISO group expands into the specific JM stock grades it contains. `key` is
// the exact MATERIAL_DB key resolvable via getMaterialProfile (all 14 verified).
export const GRADES: { iso: Iso; key: string; name: string; category: string }[] = [
  { iso: "P", key: "steel",           name: "1018 Steel (P)",          category: "steel" },
  { iso: "P", key: "aisi_1045",       name: "1045 Steel (P)",          category: "steel" },
  { iso: "P", key: "alloy_steel",     name: "4140/4340 Alloy (P)",     category: "steel" },
  { iso: "M", key: "stainless_steel", name: "304/316 SS (M)",          category: "stainless steel" },
  { iso: "M", key: "17_4ph",          name: "17-4 PH (M)",             category: "stainless steel" },
  { iso: "M", key: "duplex",          name: "2205 Duplex (M)",         category: "stainless steel" },
  { iso: "K", key: "cast_iron",       name: "Gray Iron (K)",           category: "cast iron" },
  { iso: "K", key: "ductile_iron",    name: "Ductile Iron (K)",        category: "cast iron" },
  { iso: "N", key: "aluminum",        name: "6061/7075 Alum (N)",      category: "aluminum" },
  { iso: "N", key: "brass",           name: "Brass (N)",               category: "brass" },
  { iso: "N", key: "copper",          name: "Copper (N)",              category: "copper" },
  { iso: "S", key: "titanium",        name: "Ti-6Al-4V (S)",           category: "titanium" },
  { iso: "S", key: "inconel",         name: "Inconel/Nickel (S)",      category: "titanium" },
  { iso: "H", key: "hardened_steel",  name: "Hardened Tool Steel (H)", category: "steel" },
];

// Per-group reference grade whose machinability anchors the group base Vc
// (generator lines ~119-121, copied VERBATIM).
const REFERENCE_KEY: Record<Iso, string> = {
  P: "steel",
  M: "stainless_steel",
  K: "cast_iron",
  N: "aluminum",
  S: "titanium",
  H: "hardened_steel",
};

const _refMachCache = new Map<string, number | undefined>();
/**
 * Machinability of the group's reference grade (cached). Vc scale = grade.mach /
 * this. Faithful copy of the generator's refMachinability() (lines ~123-131).
 */
export function refMachinability(iso: Iso): number | undefined {
  if (!_refMachCache.has(iso)) {
    const p = ultimateSpeedFeedEngine.getMaterialProfile(REFERENCE_KEY[iso]);
    _refMachCache.set(iso, p ? p.machinability_factor : undefined);
  }
  return _refMachCache.get(iso);
}

// ── STRATEGY_FACTORS (generator lines ~222-229, copied VERBATIM) ───────────
// Strategy modifiers mirror UltimateSpeedFeedEngine STRATEGY_MODS (vc/fz/ap
// factors + ae override %) -- applied on top of the looked-up base so each
// toolpath gets its OWN numbers.
// `axialDx` = the DIAMETER-RELATIVE axial-depth baseline per toolpath (operator
// 2026-06-17: "1xD LOC ... so the tooling has accurate baseline parameters to adjust
// from"). The effective ap is min(axialDx*D, lk.ap*ap) -- diameter-scaled baseline
// CLAMPED to the SFC material/op/strategy physics ceiling, so small tools get a
// snap-safe scaled axial and large tools stay power/deflection-clamped (see apEff).
export const STRATEGY_FACTORS: Record<
  string,
  { vc: number; fz: number; ap: number; aePct?: number; axialDx: number }
> = {
  conventional: { vc: 1.0, fz: 1.0, ap: 1.0, axialDx: 1.0 },             // general roughing -- 1xD LOC baseline
  adaptive:     { vc: 1.4, fz: 1.2, ap: 2.0, aePct: 10, axialDx: 2.0 },  // HEM -- constant-engagement, DEEP ap, light ae
  trochoidal:   { vc: 1.5, fz: 1.3, ap: 2.5, aePct: 8,  axialDx: 2.5 },  // deepest axial, lightest radial
  hsm:          { vc: 1.3, fz: 1.0, ap: 0.5, aePct: 50, axialDx: 0.15 }, // light DOC, high speed -- ~0.15xD
  plunge:       { vc: 0.7, fz: 0.5, ap: 1.0, axialDx: 1.0 },             // ramp / peck -- axial dominant
  slot:         { vc: 0.8, fz: 0.9, ap: 0.7, aePct: 100, axialDx: 0.5 }, // full radial -> shallow axial (<=1xD)
};

// ── Toolpath matrix (generator interface + TOOLPATHS, lines ~233-293) ──────
export interface Toolpath {
  op: OpClass;
  cut: CutType;
  strat: string;
  label: string;
}

// Per-tool-type toolpath list (copied VERBATIM from the generator).
export const TOOLPATHS: Record<string, Toolpath[]> = {
  end_mill: [ // flat + bull-nose: the full milling toolpath spread
    { op: "milling", cut: "roughing",       strat: "conventional", label: "Rough" },
    { op: "milling", cut: "roughing",       strat: "adaptive",     label: "HEM Adaptive" },
    { op: "milling", cut: "roughing",       strat: "trochoidal",   label: "Trochoidal" },
    { op: "milling", cut: "roughing",       strat: "slot",         label: "Slot" },
    { op: "milling", cut: "roughing",       strat: "plunge",       label: "Ramp" },
    { op: "milling", cut: "semi_finishing", strat: "conventional", label: "Semi" },
    { op: "milling", cut: "finishing",      strat: "conventional", label: "Finish" },
    { op: "milling", cut: "finishing",      strat: "hsm",          label: "HSM" },
  ],
  ball_end_mill: [
    { op: "milling", cut: "semi_finishing", strat: "conventional", label: "Semi" },
    { op: "milling", cut: "semi_finishing", strat: "trochoidal",   label: "Trochoidal" },
    { op: "milling", cut: "finishing",      strat: "conventional", label: "Finish" },
    { op: "milling", cut: "finishing",      strat: "hsm",          label: "HSM" },
  ],
  chamfer_mill: [
    { op: "milling", cut: "finishing", strat: "conventional", label: "Chamfer" },
  ],
  face_mill: [
    { op: "milling", cut: "roughing",       strat: "conventional", label: "Rough" },
    { op: "milling", cut: "semi_finishing", strat: "conventional", label: "Semi" },
    { op: "milling", cut: "finishing",      strat: "conventional", label: "Finish" },
    { op: "milling", cut: "finishing",      strat: "hsm",          label: "HSM" },
  ],
  spot_drill: [
    { op: "drilling", cut: "roughing", strat: "conventional", label: "Spot" },
  ],
  drill: [ // twist + insert drills
    { op: "drilling", cut: "roughing", strat: "conventional", label: "Drill" },
    { op: "drilling", cut: "roughing", strat: "plunge",       label: "Peck" },
  ],
  reamer: [
    { op: "reaming", cut: "finishing", strat: "conventional", label: "Ream" },
  ],
  tap: [
    { op: "tapping", cut: "roughing", strat: "conventional", label: "Tap" },
  ],
  boring_bar: [
    { op: "turning", cut: "roughing",  strat: "conventional", label: "Bore Rough" },
    { op: "turning", cut: "finishing", strat: "conventional", label: "Bore Finish" },
  ],
  turning_tool: [
    { op: "turning", cut: "roughing",  strat: "conventional", label: "Turn Rough" },
    { op: "turning", cut: "finishing", strat: "conventional", label: "Turn Finish" },
  ],
  grooving_tool: [
    { op: "turning", cut: "roughing",  strat: "conventional", label: "Groove Rough" },
    { op: "turning", cut: "finishing", strat: "conventional", label: "Groove Finish" },
  ],
  threading_tool: [
    // JM's "turning threading" are LATHE thread inserts -> turning op (CSS mode
    // at the control), NOT a rotary thread mill.
    { op: "turning", cut: "finishing", strat: "conventional", label: "Thread" },
  ],
};

// ── classifyOp (generator lines ~205-213, copied VERBATIM) ─────────────────
export function classifyOp(toolType: string): OpClass {
  const t = toolType.toLowerCase();
  if (/thread.*mill/.test(t)) return "thread_milling";
  if (/tap/.test(t)) return "tapping";
  if (/ream/.test(t)) return "reaming";
  if (/drill/.test(t)) return "drilling";
  if (/turn|boring|groov|part/.test(t)) return "turning";
  return "milling"; // end mill / face mill / chamfer / bull nose / ball
}

// ── isHss (generator lines ~215-217, copied VERBATIM) ──────────────────────
export function isHss(material: string): boolean {
  return /hss|high\s*speed\s*steel/i.test(material || "");
}

// ── classifyToolType (generator lines ~295-315, copied VERBATIM) ───────────
/** Map a raw JM tool_type to a TOOLPATHS key (order matters: specific before generic). */
export function classifyToolType(toolType: string): string {
  const s = toolType.toLowerCase();
  if (/spot/.test(s)) return "spot_drill";
  if (/cent(er|re).{0,3}drill/.test(s)) return "spot_drill"; // center drills behave like spots
  if (/ream/.test(s)) return "reamer";
  if (/\btap\b|tapping/.test(s)) return "tap";
  if (/drill/.test(s)) return "drill";                       // twist + insert drills
  if (/ball/.test(s)) return "ball_end_mill";
  if (/chamfer/.test(s)) return "chamfer_mill";
  if (/face.{0,3}mill/.test(s)) return "face_mill";
  if (/end.{0,3}mill|bull|flat/.test(s)) return "end_mill";
  if (/bor/.test(s)) return "boring_bar";
  if (/groov|part/.test(s)) return "grooving_tool";
  if (/thread/.test(s)) return "threading_tool";
  if (/turn/.test(s)) return "turning_tool";
  const op = classifyOp(toolType); // fall back by op class
  if (op === "drilling") return "drill";
  if (op === "turning") return "turning_tool";
  return "end_mill";
}

// ── Canonical condition preset (raw numbers, mm + m/min) ───────────────────
export interface ConditionPreset {
  iso: Iso;
  gradeKey: string;
  gradeName: string;
  gradeCategory: string;
  hbMin: number;
  hbMax: number;
  op: OpClass;
  cut: CutType;
  strategy: string;
  label: string;
  vc_mpm: number;          // surface speed, m/min
  sfm: number;             // surface speed, SFM (vc_mpm * MPM_TO_SFM, rounded)
  rpm: number | null;      // null for turning/CSS (workpiece-diameter driven)
  fz_mm: number;           // chip load per tooth (mm)
  fnRev_mm: number;        // feed per revolution (mm/rev)
  feed_mmpm: number | null;// table feed (mm/min); null for turning/CSS + tapping (pitch-locked)
  ap_mm: number;           // axial depth of cut (mm)
  ae_mm: number;           // radial depth of cut / stepover (mm)
  coolant: string;         // emitter-neutral coolant token
  css: boolean;            // true for turning (constant surface speed mode)
}

// ── computeCondition: CANONICAL-UNITS port of condOverride ──────────────────
/**
 * Canonical-units (mm + m/min) version of the generator's condOverride(). SAME
 * math, but NO inch conversion and NO CSV formatting -- returns raw numbers.
 *
 * Mapping from condOverride() (generator lines ~326-401):
 *   vc_mpm  = lk.vc * (vcScale>0?vcScale:1) * sm.vc
 *   sfm     = round(vc_mpm * MPM_TO_SFM)
 *   coolant = COOLANT_MAP[lk.coolant] ?? lk.coolant ?? "flood"
 *   turning : css=true, rpm=null, feed_mmpm=null, fz=lk.fz, fnRev=lk.fz,
 *             ap=lk.ap, ae=lk.ae
 *   else    : rpm = round(vc_mpm*1000/(PI*dMm))
 *     drilling/reaming: fnRev=lk.fz*sm.fz; feed=fnRev*rpm;
 *                       fz=flutes>0?fnRev/flutes:fnRev
 *     tapping         : keep rpm; feed_mmpm=null (pitch-locked); fz=lk.fz
 *     milling/thread  : fz=lk.fz*sm.fz; fnRev=fz*(flutes>0?flutes:1); feed=fnRev*rpm;
 *                       ap=lk.ap*sm.ap; ae = sm.aePct!=null ? (aePct/100)*dMm : lk.ae
 *
 * Returns null whenever condOverride() returns null:
 *   - no lk, or lk.vc <= 0
 *   - non-turning op with dMm <= 0
 *   - rpm <= 0
 */
type ComputedCondition = Omit<
  ConditionPreset,
  "iso" | "gradeKey" | "gradeName" | "gradeCategory" | "hbMin" | "hbMax" | "op" | "cut" | "strategy" | "label"
> | null;

// Deterministic memo: computeCondition is a pure function of its args, so the
// same (iso,op,cut,strategy,dMm,flutes,toolMaterial,vcScale) tuple always yields
// the same result. Corpus-scale runs (118K tools, ~13M calls) share many
// identical tuples (same diameter+type+grade); memoizing turns the inner
// engine lookups O(distinct-tuples) instead of O(calls). Transparent to every
// caller (Fusion/hyperMILL/Mastercam) -- same numbers, fewer lookups.
const _condCache = new Map<string, ComputedCondition>();

export function computeCondition(
  iso: Iso,
  op: OpClass,
  cut: CutType,
  strategy: string,
  dMm: number,
  flutes: number,
  toolMaterial: "carbide" | "hss",
  vcScale: number = 1,
): ComputedCondition {
  const cacheKey = `${iso}|${op}|${cut}|${strategy}|${dMm}|${flutes}|${toolMaterial}|${vcScale}`;
  const cached = _condCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const result = _computeConditionUncached(iso, op, cut, strategy, dMm, flutes, toolMaterial, vcScale);
  _condCache.set(cacheKey, result);
  return result;
}

function _computeConditionUncached(
  iso: Iso,
  op: OpClass,
  cut: CutType,
  strategy: string,
  dMm: number,
  flutes: number,
  toolMaterial: "carbide" | "hss",
  vcScale: number = 1,
): ComputedCondition {
  // turning/boring surface speed lives on a turning row; the rest are mill/hole ops.
  const lookupOp = op === "turning" ? "turning" : op;
  const lk = ultimateSpeedFeedEngine.lookupCuttingData({
    iso_group: iso,
    operation: lookupOp, // OpClass subset of Operation -- assignable, no cast
    cut_type: cut,
    tool_diameter_mm: dMm,
    tool_material: toolMaterial,
  });
  if (!lk || !(lk.vc > 0)) return null;

  const sm = STRATEGY_FACTORS[strategy] ?? STRATEGY_FACTORS.conventional;
  const vc = lk.vc * (vcScale > 0 ? vcScale : 1) * sm.vc;
  const sfm = Math.round(vc * MPM_TO_SFM);
  const coolant = COOLANT_MAP[lk.coolant as string] ?? (lk.coolant as string) ?? "flood";

  if (op === "turning") {
    // Surface speed is workpiece-diameter driven at the control: CSS mode, no RPM,
    // no table feed (the driver keeps its proven feed/rev). Mirror condOverride's
    // turning branch -- only surfaceSpeed + coolant + CSS flag are set there; the
    // raw fz/ap/ae are surfaced here as the looked-up values for the driver.
    return {
      vc_mpm: vc,
      sfm,
      rpm: null,
      fz_mm: lk.fz,
      fnRev_mm: lk.fz,
      feed_mmpm: null,
      ap_mm: lk.ap,
      ae_mm: lk.ae,
      coolant,
      css: true,
    };
  }

  if (!(dMm > 0)) return null; // milling/hole ops need a real tool diameter for RPM
  const rpm = Math.round((vc * 1000) / (Math.PI * dMm));
  if (!(rpm > 0)) return null;

  if (op === "tapping") {
    // Tap feed = thread pitch (geometry-locked): keep the driver's proven feed.
    // Only surface speed + RPM vary by material group; feed_mmpm is null here.
    return {
      vc_mpm: vc,
      sfm,
      rpm,
      fz_mm: lk.fz,
      fnRev_mm: lk.fz,
      feed_mmpm: null,
      ap_mm: lk.ap,
      ae_mm: lk.ae,
      coolant,
      css: false,
    };
  }

  if (op === "drilling" || op === "reaming") {
    // CUTTING_PARAMS drilling/reaming fz is feed-PER-REV; hole-making feeds per rev.
    const fnRev = lk.fz * sm.fz;                  // mm/rev, strategy-scaled
    const feed = fnRev * rpm;                     // mm/min
    const fzTooth = flutes > 0 ? fnRev / flutes : fnRev;
    return {
      vc_mpm: vc,
      sfm,
      rpm,
      fz_mm: fzTooth,
      fnRev_mm: fnRev,
      feed_mmpm: feed,
      ap_mm: lk.ap,
      ae_mm: lk.ae,
      coolant,
      css: false,
    };
  }

  // milling / thread_milling: fz is per-tooth, strategy-scaled.
  const fzTooth = lk.fz * sm.fz;
  const fnRev = fzTooth * (flutes > 0 ? flutes : 1);
  const feed = fnRev * rpm;
  // ap: 1xD-LOC baseline (operator 2026-06-17). The axial depth is a DIAMETER-RELATIVE
  // baseline per toolpath (axialDx*D -- roughing 1xD, HEM/trochoidal deep, HSM/slot light)
  // CLAMPED to the SFC material/op/strategy physics ceiling (lk.ap*sm.ap, deflection/power
  // bounded). min() => small tools get a snap-safe diameter-scaled axial (was a fixed mm =
  // too deep on micro tools); large tools + finishing/hard-material stay physics-clamped
  // (the SFC ceiling wins). Never exceeds either bound -- a safe baseline to adjust UP from.
  const apCeiling = lk.ap * sm.ap;
  const apEff = Math.min(sm.axialDx * dMm, apCeiling);
  // ae: strategy override (% of Dc) wins, else the looked-up radial.
  const aeEff = sm.aePct != null ? (sm.aePct / 100) * dMm : lk.ae;
  return {
    vc_mpm: vc,
    sfm,
    rpm,
    fz_mm: fzTooth,
    fnRev_mm: fnRev,
    feed_mmpm: feed,
    ap_mm: apEff,
    ae_mm: aeEff,
    coolant,
    css: false,
  };
}

// ── compatibleGradesForTool: compat-gate + per-grade machinability ──────────
export interface ResolvedGrade {
  grade: (typeof GRADES)[number];
  vcScale: number;
  hbMin: number;
  hbMax: number;
}

/**
 * Replicate the generator's material-domain gate (lines ~479-496):
 *   1. coatingHint = material, OR "uncoated for aluminum" when the description
 *      reads non-ferrous (alum|non-ferrous|brass|copper|graphite|plastic) AND
 *      NOT ferrous (steel|stainless|inconel|titanium|hardened|tool steel).
 *   2. compatible = coatingSelectionAdapter.compatibleIsoGroups(coatingHint, toolMaterial).
 *   3. For each GRADE whose iso is compatible, resolve its machinability profile;
 *      vcScale = prof.machinability_factor / refMachinability(g.iso). Skip a grade
 *      whose profile or its group reference does not resolve, or whose
 *      machinability_factor <= 0 (fail-loud, never emit unscaled).
 *
 * Returns the compatible + resolvable grades with their vcScale + HB range.
 */
export function compatibleGradesForTool(args: {
  toolType: string;
  material: string;
  description: string;
  toolMaterial: "carbide" | "hss";
}, isoAllow?: Iso[]): ResolvedGrade[] {
  const { material, description, toolMaterial } = args;

  // `isoAllow` (when non-empty) is the AUTHORITATIVE ISO applicability -- e.g. a
  // corpus tool's vendor-declared `iso_groups`. It REPLACES the coating-compat
  // heuristic, which under-covers general-purpose carbide tools (a tool the
  // vendor rates for all of P/M/K/N/S/H must get presets for all of them, not
  // just the substrate-implied subset). When absent/empty, the original
  // coating-adapter gate runs unchanged (back-compat for Fusion/hyperMILL/
  // Mastercam callers that pass no isoAllow).
  let compatible: Iso[];
  if (isoAllow && isoAllow.length) {
    compatible = isoAllow;
  } else {
    let coatingHint = material;
    const desc = (description || "").toLowerCase();
    if (
      /alum|non[- ]?ferrous|brass|copper|graphite|plastic/.test(desc) &&
      !/steel|stainless|inconel|titanium|hardened|tool steel/.test(desc)
    ) {
      coatingHint = "uncoated for aluminum"; // explicit non-ferrous intent in description
    }
    compatible = coatingSelectionAdapter.compatibleIsoGroups(coatingHint, toolMaterial);
  }

  const out: ResolvedGrade[] = [];
  for (const g of GRADES) {
    if (!compatible.includes(g.iso)) continue;
    const prof = ultimateSpeedFeedEngine.getMaterialProfile(g.key);
    const refMach = refMachinability(g.iso);
    if (!prof || !refMach || !(prof.machinability_factor > 0)) continue;
    const vcScale = prof.machinability_factor / refMach;
    const [hbMin, hbMax] = prof.hardness_hb_range;
    out.push({ grade: g, vcScale, hbMin, hbMax });
  }
  return out;
}

// ── conditionMatrix: the TOP-LEVEL fn the drivers call ─────────────────────
/**
 * The single entry point the hyperMILL + Mastercam drivers (and the Fusion CSV
 * generator) call. For a tool, returns every (compatible grade x applicable
 * toolpath) cutting preset in canonical units (mm + m/min).
 *
 * Mirrors the generator's emission loop (lines ~467-530):
 *   toolMaterial = isHss(material) ? "hss" : "carbide"
 *   grades       = compatibleGradesForTool(...)
 *   toolpaths    = TOOLPATHS[classifyToolType(toolType)] ?? TOOLPATHS.end_mill
 *   for each grade x toolpath: computeCondition(...); skip null; emit a preset.
 */
export function conditionMatrix(tool: {
  toolType: string;
  dMm: number;
  flutes: number;
  material: string;
  description: string;
}, isoAllow?: Iso[]): ConditionPreset[] {
  const { toolType, dMm, flutes, material, description } = tool;
  const toolMaterial: "carbide" | "hss" = isHss(material) ? "hss" : "carbide";
  const grades = compatibleGradesForTool({ toolType, material, description, toolMaterial }, isoAllow);
  const toolpaths = TOOLPATHS[classifyToolType(toolType)] ?? TOOLPATHS.end_mill;

  const presets: ConditionPreset[] = [];
  for (const g of grades) {
    for (const tp of toolpaths) {
      const c = computeCondition(
        g.grade.iso,
        tp.op,
        tp.cut,
        tp.strat,
        dMm,
        flutes,
        toolMaterial,
        g.vcScale,
      );
      if (!c) continue;
      presets.push({
        iso: g.grade.iso,
        gradeKey: g.grade.key,
        gradeName: g.grade.name,
        gradeCategory: g.grade.category,
        hbMin: g.hbMin,
        hbMax: g.hbMax,
        op: tp.op,
        cut: tp.cut,
        strategy: tp.strat,
        label: tp.label,
        ...c,
      });
    }
  }
  return presets;
}
