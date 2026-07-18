/**
 * machine-enricher.ts (U-MACHDB-03 / Phase 3, slot:oscar 2026-06-26)
 *
 * The PHYSICS/CLASS GAP-FILL layer for the machine database. The normalizer (U-MACHDB-02,
 * `machine-normalizer.ts`) STRUCTURALLY relocates whatever each raw record already states into one
 * canonical `NormalizedMachine`, but it deliberately leaves the GAP-band attributes undefined (R12:
 * never fabricate a number that isn't in the raw data). The audit (U-MACHDB-01) measured those gaps:
 * way_type 6.7%, accel/g-force 3.5%, jerk 0.5%, balance 0.1%, FRF-rigidity 0%, surface-finish 0%,
 * build-quality 0%, robustness 0%, accuracy 10%, repeatability 5%, spindle-bore 7%, thermal-comp ~1%,
 * corner-rounding 1.3%, kinematics 21%, look-ahead 27%, rapid 15%, weight 36%.
 *
 * This module DERIVES those fields deterministically from each machine's own normalized data plus a
 * machine-CLASS model (kind / build-tier / rpm-class / way-type / mass-class) and first-principles
 * physics (S-curve jerk, ISO 1940 balance grade, spring-mass natural frequency, taper->bore interface
 * map, accel->g). It fills MISSING fields ONLY -- OEM-sourced values are never overwritten. Every fill
 * carries provenance `inferred:<basis>` recorded in `_provenance`, so a downstream consumer
 * (sf_orchestrate, the SFC page -- wired in P5) can distinguish a datasheet value (raw key) from a
 * class estimate (inferred:*) and weight its confidence accordingly.
 *
 * oscar-soul: this does NOT publish OEM-precision; it publishes BOUNDED, physically-grounded class
 * estimates that are honestly tagged as inferred. Every force/stability formula here is unit-checked
 * (physics-reviewer) and clamped to a physically-plausible range. Cutting/material constants are NOT
 * inlined -- this module touches only kinematic/structural/controller capability, not Kienzle/Taylor.
 */

import { normalizeMachine } from "./machine-normalizer.js";
import type {
  NormalizedMachine,
  NormalizedAxis,
  NormalizedSpindle,
} from "./machine-normalizer.js";

// ── unit constants (conversion factors, not cutting/material constants) ──────────
/** CGPM standard gravity (m/s^2); used only to convert an acceleration to a g-force multiple. */
const STANDARD_GRAVITY = 9.80665;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lower = (s?: string) => (s || "").toLowerCase();

// ── class model ──────────────────────────────────────────────────────────────
export type MachineKind =
  | "vmc" | "hmc" | "5axis" | "lathe" | "millturn" | "swiss" | "grinder" | "edm" | "router" | "unknown";
export type BuildTier = "precision" | "premium" | "production" | "economy" | "heavy_duty";
export type RpmClass = "ultra_hs" | "high" | "medium" | "low";
export type WayType = "box_way" | "linear_guide" | "hydrostatic" | "roller";

export interface MachineClass {
  kind: MachineKind;
  tier: BuildTier;
  rpmClass: RpmClass;
  wayType: WayType;
  /** effective modal mass (kg) of the dominant compliance loop (spindle/ram), for the FRF estimate */
  effectiveModalMassKg: number;
  /** largest single linear travel (mm), used for "large machine" tests */
  maxTravelMm: number;
}

// Brand build-tier table (lower-cased substrings). Precision > premium > production > economy.
// Heavy-duty is assigned by kind/envelope, not brand alone.
const PRECISION_BRANDS = ["kern", "yasda", "willemin", "roeders", "röders", "mikron", "kitamura", "sodick", "moore", "hardinge"];
const PREMIUM_BRANDS = ["dmg mori", "dmg", "mori", "okuma", "mazak", "matsuura", "makino", "grob", "hermle", "brother", "citizen", "star", "tsugami", "index", "nakamura", "emag", "toyoda", "okk"];
const PRODUCTION_BRANDS = ["haas", "hurco", "doosan", "dn solutions", "hyundai-wia", "hyundai", "wia", "fanuc", "hwacheon", "goodway", "victor", "johnford", "you-ji", "tongtai", "litz", "feeler", "akira", "traub"];
const HEAVY_BRANDS = ["toshiba", "niigata", "breton", "zimmermann", "fpt", "correa", "nicolas-correa", "soraluce", "shibaura", "ingersoll", "waldrich"];

function brandTier(manufacturer?: string): BuildTier | undefined {
  const m = lower(manufacturer);
  if (!m) return undefined;
  if (HEAVY_BRANDS.some((b) => m.includes(b))) return "heavy_duty";
  if (PRECISION_BRANDS.some((b) => m.includes(b))) return "precision";
  if (PREMIUM_BRANDS.some((b) => m.includes(b))) return "premium";
  if (PRODUCTION_BRANDS.some((b) => m.includes(b))) return "production";
  return undefined;
}

function deriveKind(m: NormalizedMachine): MachineKind {
  const t = lower(m.type) + " " + lower(m.name) + " " + lower(m.model);
  const axisLetters = new Set(m.axes.map((a) => a.name.toUpperCase()));
  const taper = lower(m.spindle.taper);
  const rotaryCount = ["A", "B", "C"].filter((r) => axisLetters.has(r)).length;
  if (/wire|sinker|\bedm\b/.test(t)) return "edm";
  if (/grind/.test(t)) return "grinder";
  if (/router|nest/.test(t)) return "router";
  if (/swiss|sliding.?head/.test(t)) return "swiss";
  if (/mill.?turn|turn.?mill|multi.?task|integrex|multus/.test(t)) return "millturn";
  // lathe signal: type text OR a lathe spindle nose (A2-x / D1-x) OR a chuck taper
  if (/lathe|turn|turning/.test(t) || /\ba2-\d|d1-\d|asa-/.test(taper)) return "lathe";
  if (/5.?axis|five.?axis|trunnion|universal/.test(t) || rotaryCount >= 2) return "5axis";
  if (/\bhmc\b|horizontal/.test(t)) return "hmc";
  if (/\bvmc\b|vertical|machining.?cent|\bvf\b|drill.?tap/.test(t)) return "vmc";
  // fallback by axis structure: a mill taper present -> default vmc; else unknown
  if (taper && /cat|bt|hsk|capto|iso|din/.test(taper)) return "vmc";
  return "unknown";
}

function deriveRpmClass(maxRpm?: number): RpmClass {
  const r = maxRpm ?? 0;
  if (r >= 24000) return "ultra_hs";
  if (r >= 12000) return "high";
  if (r >= 6000) return "medium";
  return "low";
}

/** envelope bounding-box volume in m^3 (0 if any dim missing). */
function envelopeVolumeM3(m: NormalizedMachine): number {
  const { x_mm, y_mm, z_mm } = m.envelope;
  if (x_mm == null || y_mm == null || z_mm == null) return 0;
  return (x_mm / 1000) * (y_mm / 1000) * (z_mm / 1000);
}

function maxTravel(m: NormalizedMachine): number {
  const dims = [m.envelope.x_mm, m.envelope.y_mm, m.envelope.z_mm].filter((v): v is number => v != null);
  const axTravels = m.axes.map((a) => a.travel_mm).filter((v): v is number => v != null);
  return Math.max(0, ...dims, ...axTravels);
}

// effective modal mass (kg) of the dominant structural loop, by kind + size, for f_n = (1/2pi)sqrt(k/m).
// This is a fraction of total machine mass concentrated in the spindle/ram loop (not the full casting).
function effectiveModalMass(kind: MachineKind, weightKg: number | undefined, maxTravelMm: number): number {
  if (weightKg != null && Number.isFinite(weightKg) && weightKg > 0) {
    // ~8-15% of total mass participates in the dominant spindle-nose compliance mode
    return clamp(weightKg * 0.10, 80, 4000);
  }
  // no weight: size-class default
  const big = maxTravelMm >= 1500, mid = maxTravelMm >= 700;
  switch (kind) {
    case "hmc": return big ? 900 : mid ? 450 : 280;
    case "5axis": return big ? 700 : mid ? 350 : 200;
    case "lathe": case "millturn": case "swiss": return big ? 600 : mid ? 300 : 160;
    case "router": return big ? 250 : 150;
    default: return big ? 650 : mid ? 250 : 130; // vmc/grinder/edm/unknown
  }
}

export function classifyMachine(m: NormalizedMachine): MachineClass {
  const kind = deriveKind(m);
  const rpmClass = deriveRpmClass(m.spindle.max_rpm);
  const maxTravelMm = maxTravel(m);
  const large = maxTravelMm >= 1500;

  // tier: a KNOWN brand is authoritative (strongest, most reliable signal). A measured positioning-
  // accuracy reading only sets the tier when the brand is UNKNOWN -- raw accuracy is unit-fragile (mm
  // mis-stored as um, or a mislabeled repeatability value) and a single number must NOT override a
  // known production brand into "precision" and cascade false-precision physics (e.g. Haas VF -> 0.1um
  // Ra / 210 N/um). Sanity-gate to a plausible positioning-accuracy band [1, 50] um.
  let tier = brandTier(m.manufacturer);
  if (tier == null) {
    const measuredAcc = m.axes
      .map((a) => a.accuracy_um)
      .filter((v): v is number => v != null && v >= 1 && v <= 50)
      .sort((a, b) => a - b)[0];
    if (measuredAcc != null) tier = measuredAcc <= 3 ? "precision" : measuredAcc <= 6 ? "premium" : "production";
  }
  if (!tier) {
    if (kind === "edm" || kind === "grinder" || kind === "swiss") tier = "premium"; // precision-leaning kinds
    else if (large || kind === "hmc") tier = "heavy_duty";
    else tier = "production";
  }
  // a very large gantry/HMC of any brand behaves heavy-duty structurally
  if (large && (kind === "hmc" || kind === "vmc")) tier = tier === "precision" ? "precision" : "heavy_duty";

  // way type: explicit -> map; else derive from tier/kind/rpm/size
  let wayType: WayType;
  const rawWay = lower(m.way_type) || lower(m.axes.find((a) => a.way_type)?.way_type);
  if (rawWay) {
    if (/hydrostat/.test(rawWay)) wayType = "hydrostatic";
    else if (/box/.test(rawWay)) wayType = "box_way";
    else if (/roller/.test(rawWay)) wayType = "roller";
    else wayType = "linear_guide"; // "linear", "lm", "guide", "rolling", "ball"
  } else if (tier === "heavy_duty" || large || (kind === "lathe" && (m.spindle.max_rpm ?? 9999) < 4000)) {
    wayType = "box_way"; // rigidity-first: heavy/large/low-rpm
  } else if (kind === "grinder" || (tier === "precision" && rpmClass !== "ultra_hs")) {
    wayType = "hydrostatic"; // precision grinders / ultra-precision use hydrostatic/aerostatic
  } else {
    wayType = "linear_guide"; // modern default
  }

  const weightKg = m.weight_kg;
  return {
    kind,
    tier,
    rpmClass,
    wayType,
    effectiveModalMassKg: effectiveModalMass(kind, weightKg, maxTravelMm),
    maxTravelMm,
  };
}

// ── per-field derivations (all return a value + a provenance basis string) ───────

// Rapid traverse (mm/min) typical by way + tier.
function deriveRapid(cls: MachineClass): number {
  const { wayType, tier } = cls;
  if (wayType === "box_way") return tier === "heavy_duty" ? 20000 : 24000;
  if (wayType === "hydrostatic") return 15000;
  // linear_guide
  if (tier === "precision" || tier === "premium") return 48000;
  if (tier === "economy") return 30000;
  return 36000; // production
}

// Peak axis acceleration (m/s^2) typical by way + tier (g = accel / 9.80665).
function deriveAccel(cls: MachineClass): number {
  const { wayType, tier } = cls;
  if (wayType === "box_way") return tier === "heavy_duty" ? 2.5 : 4.0;        // 0.25-0.4 g
  if (wayType === "hydrostatic") return 3.0;                                   // ~0.3 g
  // linear_guide
  if (tier === "precision" || tier === "premium") return 9.81;                // ~1.0 g
  if (tier === "economy") return 5.0;                                          // ~0.5 g
  return 6.9;                                                                  // ~0.7 g production
}

// Jerk (m/s^3) from accel via the S-curve jerk-limited ramp time t_jerk: jerk = accel / t_jerk.
// HS/look-ahead controllers ramp faster (smaller t_jerk -> higher jerk).
function deriveJerk(cls: MachineClass, accel: number): number {
  const tJerk = cls.rpmClass === "ultra_hs" || cls.rpmClass === "high" ? 0.02 : cls.wayType === "box_way" ? 0.05 : 0.04;
  return Math.round(accel / tJerk);
}

// Positioning accuracy & repeatability (um, ISO 230-2 ballpark) by build tier.
const ACCURACY_BY_TIER: Record<BuildTier, { acc: number; rep: number }> = {
  precision: { acc: 3, rep: 1.5 },
  premium: { acc: 5, rep: 2.5 },
  production: { acc: 8, rep: 4 },
  economy: { acc: 12, rep: 6 },
  heavy_duty: { acc: 12, rep: 6 }, // large travels -> looser absolute
};

// Spindle front-bearing bore (mm) by taper interface. Mill tapers + lathe spindle noses.
function deriveBoreFromTaper(taper?: string): number | undefined {
  const t = lower(taper).replace(/[\s_]/g, "");
  if (!t) return undefined;
  // lathe spindle noses A2-n / D1-n (camlock) -> bar/through bore by size number
  const a2 = t.match(/a2-?(\d+)/);
  if (a2) return ({ "5": 52, "6": 65, "8": 90, "11": 130, "15": 180 } as Record<string, number>)[a2[1]] ?? 65;
  const d1 = t.match(/d1-?(\d+)/);
  if (d1) return ({ "4": 39, "5": 52, "6": 65, "8": 90, "11": 130 } as Record<string, number>)[d1[1]] ?? 65;
  const hsk = t.match(/hsk-?([a-f])(\d+)/);
  if (hsk) return Number(hsk[2]) >= 100 ? 100 : Number(hsk[2]) >= 80 ? 85 : Number(hsk[2]) >= 63 ? 70 : Number(hsk[2]) >= 50 ? 55 : 40;
  const capto = t.match(/capto-?c?(\d+)/);
  if (capto) return ({ "3": 32, "4": 40, "5": 50, "6": 63, "8": 80, "10": 100 } as Record<string, number>)[capto[1]] ?? 63;
  if (/(cat|bt|iso|din|sk|bbt)50/.test(t)) return 100;
  if (/(cat|bt|iso|din|sk|bbt)40/.test(t)) return 70;
  if (/(cat|bt|iso|din|sk|bbt)30/.test(t)) return 50;
  return undefined;
}

// ISO 1940/1 balance grade by spindle rpm class (finer grade at higher rpm).
function deriveBalanceGrade(rpmClass: RpmClass): string {
  switch (rpmClass) {
    case "ultra_hs": return "G0.4";
    case "high": return "G1.0";
    case "medium": return "G2.5";
    default: return "G6.3";
  }
}

// Spindle-nose static stiffness (N/um) by way + tier + taper, then natural frequency from a
// spring-mass model f_n = (1/2pi)sqrt(k/m_eff), with k = stiffness[N/um] * 1e6 [N/m].
const WAY_STIFFNESS_BASE: Record<WayType, number> = { box_way: 150, linear_guide: 80, hydrostatic: 200, roller: 100 };
const TIER_STIFF_FACTOR: Record<BuildTier, number> = { precision: 1.4, premium: 1.2, production: 1.0, economy: 0.8, heavy_duty: 1.6 };
const WAY_DAMPING: Record<WayType, number> = { box_way: 0.06, linear_guide: 0.03, hydrostatic: 0.10, roller: 0.04 };

function taperStiffFactor(taper?: string): number {
  const t = lower(taper);
  if (/hsk/.test(t)) return 1.15;     // face+taper dual contact
  if (/capto/.test(t)) return 1.20;   // polygon taper, very stiff
  if (/(cat|bt|iso|din|sk)50/.test(t)) return 1.30;
  return 1.0;                          // CAT40/BT40 baseline
}

function deriveFrf(cls: MachineClass, spindle: NormalizedSpindle): NonNullable<NormalizedMachine["frf"]> {
  const stiffness = clamp(
    WAY_STIFFNESS_BASE[cls.wayType] * TIER_STIFF_FACTOR[cls.tier] * taperStiffFactor(spindle.taper),
    30,
    400,
  );
  const damping = clamp(WAY_DAMPING[cls.wayType] * (cls.tier === "heavy_duty" ? 1.15 : 1.0), 0.02, 0.15);
  const kNm = stiffness * 1e6; // N/um -> N/m
  const fn = (1 / (2 * Math.PI)) * Math.sqrt(kNm / cls.effectiveModalMassKg);
  return {
    natural_frequency_hz: Math.round(clamp(fn, 20, 300)),
    damping_ratio: Math.round(damping * 1000) / 1000,
    stiffness_n_um: Math.round(stiffness),
  };
}

// Surface finish best-achievable Ra (um) by tier, refined finer for ultra-HS precision.
function deriveBestRa(cls: MachineClass): number {
  const base: Record<BuildTier, number> = { precision: 0.1, premium: 0.2, production: 0.4, economy: 0.8, heavy_duty: 0.8 };
  let ra = base[cls.tier];
  if (cls.rpmClass === "ultra_hs" && (cls.tier === "precision" || cls.tier === "premium")) ra = Math.min(ra, 0.05);
  return ra;
}

function deriveRobustness(cls: MachineClass): string {
  if (cls.tier === "heavy_duty" || cls.wayType === "box_way") return "high (continuous production / heavy roughing)";
  if (cls.tier === "production") return "medium-high (production duty)";
  if (cls.tier === "precision") return "medium (precision-oriented, light-moderate cuts)";
  if (cls.tier === "economy") return "light-medium";
  return "medium";
}

// Controller-derived capabilities (look-ahead blocks, corner-control feature, HSM, thermal comp).
function controllerProfile(m: NormalizedMachine, cls: MachineClass): {
  lookAhead: number; cornerControl: string; cornerToleranceMm: number; hsm: boolean; thermalComp: boolean; lookAheadBasis: string;
} {
  const brand = lower(m.controller.brand) + " " + lower(m.controller.model) + " " + lower(m.manufacturer);
  let lookAhead = 200, cornerControl = "smooth-tolerance contour control", lookAheadBasis = "default-modern";
  if (/30i|31i|32i/.test(brand)) { lookAhead = 600; cornerControl = "AICC II (AI contour control)"; lookAheadBasis = "fanuc-30i"; }
  else if (/0i|0-?model/.test(brand)) { lookAhead = 200; cornerControl = "AICC"; lookAheadBasis = "fanuc-0i"; }
  else if (/okuma|osp/.test(brand)) { lookAhead = 600; cornerControl = "Hi-Cut Pro / Super-NURBS"; lookAheadBasis = "okuma-osp"; }
  else if (/heidenhain|tnc/.test(brand)) { lookAhead = 1000; cornerControl = "Cycle 32 tolerance (TA/TT)"; lookAheadBasis = "heidenhain-tnc"; }
  else if (/mazak|mazatrol|smooth/.test(brand)) { lookAhead = 1000; cornerControl = "Smooth corner / AI"; lookAheadBasis = "mazak-smooth"; }
  else if (/siemens|840d|828d|sinumerik/.test(brand)) { lookAhead = 600; cornerControl = "Advanced Surface (COMPCAD)"; lookAheadBasis = "siemens-840d"; }
  else if (/haas|ngc/.test(brand)) { lookAhead = 1000; cornerControl = "G187 smoothness control"; lookAheadBasis = "haas-ngc"; }
  else if (/mitsubishi|m8|m7/.test(brand)) { lookAhead = 750; cornerControl = "SSS (super smooth surface)"; lookAheadBasis = "mitsubishi-m8"; }
  else if (/brother|cnc-?c/.test(brand)) { lookAhead = 400; cornerControl = "high-precision mode"; lookAheadBasis = "brother"; }
  // existing OEM look-ahead wins if present (handled by caller); here we just propose.
  const hsm = (m.spindle.max_rpm ?? 0) >= 12000 || cls.rpmClass === "ultra_hs" || cls.rpmClass === "high";
  const cornerToleranceMm = cls.tier === "precision" ? 0.005 : cls.tier === "premium" ? 0.01 : cls.tier === "economy" ? 0.05 : 0.02;
  const thermalComp = cls.tier === "precision" || cls.tier === "premium" || cls.rpmClass === "high" || cls.rpmClass === "ultra_hs"
    || /30i|31i|osp|tnc|smooth|840d|m8/.test(brand);
  return { lookAhead, cornerControl, cornerToleranceMm, hsm, thermalComp, lookAheadBasis };
}

// Kinematics structure by kind + axis letters.
function deriveKinematics(m: NormalizedMachine, cls: MachineClass): NonNullable<NormalizedMachine["kinematics"]> {
  const letters = m.axes.map((a) => a.name.toUpperCase());
  const chain = letters.join("");
  const rot = ["A", "B", "C"].filter((r) => letters.includes(r));
  switch (cls.kind) {
    case "hmc":
      return { type: "horizontal-spindle", structure: `cartesian XYZ + B-axis rotary/index table (${chain || "XYZB"})`, chain };
    case "5axis":
      return { type: "5-axis", structure: rot.length >= 2 ? `simultaneous 5-axis, rotary pair ${rot.join("/")} (config by model: trunnion table-table or swivel head-table)` : "5-axis (rotary config by model)", chain };
    case "lathe":
      return { type: "turning", structure: `slant-bed XZ${letters.includes("C") ? "+C" : ""}${letters.includes("Y") ? "+Y (live tooling)" : ""}`, chain: chain || "XZ" };
    case "millturn":
      return { type: "mill-turn", structure: `turning XZC + milling spindle (B/Y)`, chain };
    case "swiss":
      return { type: "swiss-turning", structure: "sliding-headstock with guide bushing", chain };
    case "router":
      return { type: "gantry-router", structure: `gantry cartesian (${chain || "XYZ"})`, chain };
    case "grinder":
      return { type: "grinding", structure: "precision grinder (wheel/work spindles)", chain };
    case "edm":
      return { type: "edm", structure: "electro-discharge (wire or sinker) cartesian", chain };
    case "vmc":
    default:
      return { type: `${rot.length ? 3 + rot.length : 3}-axis`, structure: `C-frame vertical, cartesian ${chain || "XYZ"}${rot.length ? " + rotary " + rot.join("/") : ""}`, chain: chain || "XYZ" };
  }
}

// Machine weight (kg) regression by kind + work-envelope volume: w = base + k * vol_m3.
const WEIGHT_REGRESSION: Record<MachineKind, { base: number; k: number }> = {
  vmc: { base: 3500, k: 1400 },
  hmc: { base: 8000, k: 1800 },
  "5axis": { base: 4500, k: 1700 },
  lathe: { base: 4000, k: 2000 },
  millturn: { base: 6000, k: 2200 },
  swiss: { base: 2500, k: 1500 },
  grinder: { base: 4000, k: 1600 },
  edm: { base: 2500, k: 1200 },
  router: { base: 2000, k: 900 },
  unknown: { base: 3500, k: 1400 },
};

function deriveWeight(m: NormalizedMachine, cls: MachineClass): number | undefined {
  const vol = envelopeVolumeM3(m);
  if (vol <= 0) return undefined; // no envelope -> cannot estimate honestly
  const r = WEIGHT_REGRESSION[cls.kind];
  return Math.round(clamp(r.base + r.k * vol, 1200, 80000));
}

// Table type by kind.
function deriveTableType(cls: MachineClass): string {
  switch (cls.kind) {
    case "hmc": return "pallet (APC) on B-axis rotary";
    case "5axis": return "trunnion tilt-rotary table";
    case "lathe": case "millturn": case "swiss": return "chuck (n-jaw) / collet";
    case "grinder": return "magnetic chuck";
    case "router": return "vacuum / T-slot bed";
    case "edm": return "submerged worktank table";
    default: return "fixed T-slot table";
  }
}

// ── main enrich ──────────────────────────────────────────────────────────────

/**
 * Returns a NEW NormalizedMachine with every GAP-band field filled from class/physics derivation.
 * Fills MISSING fields only -- any OEM-sourced value (present in the input) is preserved untouched.
 * Each derived field's basis is recorded in `_provenance[field] = "inferred:<basis>"`.
 */
export function enrichMachine(input: NormalizedMachine): NormalizedMachine {
  const cls = classifyMachine(input);
  // deep-ish clone (axes/spindle/etc. get fresh objects so we never mutate the caller's record)
  const prov: Record<string, string> = { ...input._provenance };
  const setProv = (field: string, basis: string) => { prov[field] = `inferred:${basis}`; };

  const spindle: NormalizedSpindle = { ...input.spindle };
  const axes: NormalizedAxis[] = input.axes.map((a) => ({ ...a }));
  const table = { ...input.table };
  const controller = { ...input.controller };
  const capabilities = { ...input.capabilities };

  // --- linear-axis dynamics: rapid, accel (+g), jerk, accuracy, repeatability, way_type ---
  const isLinear = (n: string) => ["X", "Y", "Z", "U", "V", "W"].includes(n.toUpperCase());
  const linearAxes = axes.filter((a) => isLinear(a.name));
  const targetAxes = linearAxes.length ? linearAxes : axes; // some lathes label axes oddly
  const rapid = deriveRapid(cls);
  const accel = deriveAccel(cls);
  const jerk = deriveJerk(cls, accel);
  const accTier = ACCURACY_BY_TIER[cls.tier];
  let filledRapid = false, filledAccel = false, filledJerk = false, filledAcc = false, filledRep = false, filledAxisWay = false;
  for (const a of targetAxes) {
    if (a.rapid_mm_min == null) { a.rapid_mm_min = rapid; filledRapid = true; }
    if (a.acceleration_m_s2 == null) { a.acceleration_m_s2 = accel; filledAccel = true; }
    if (a.jerk_m_s3 == null) { a.jerk_m_s3 = jerk; filledJerk = true; }
    if (a.accuracy_um == null) { a.accuracy_um = accTier.acc; filledAcc = true; }
    if (a.repeatability_um == null) { a.repeatability_um = accTier.rep; filledRep = true; }
    if (a.way_type == null) { a.way_type = cls.wayType; filledAxisWay = true; }
  }
  if (filledRapid) setProv("axes.*.rapid_mm_min", "rapid-by-waytype-tier");
  if (filledAccel) setProv("axes.*.acceleration_m_s2", "accel-by-waytype-tier");
  if (filledJerk) setProv("axes.*.jerk_m_s3", "jerk-from-accel-scurve");
  if (filledAcc) setProv("axes.*.accuracy_um", "accuracy-by-tier-iso230");
  if (filledRep) setProv("axes.*.repeatability_um", "repeatability-by-tier-iso230");
  if (filledAxisWay) setProv("axes.*.way_type", "waytype-by-class");

  // g-force (machine-level, derived from the linear-axis acceleration)
  const peakAccel = Math.max(...targetAxes.map((a) => a.acceleration_m_s2 ?? 0), 0) || accel;

  // --- way_type (machine roll-up) ---
  let way_type = input.way_type;
  if (way_type == null) { way_type = cls.wayType; setProv("way_type", "waytype-by-class"); }

  // --- spindle: bore, balance, thermal growth comp ---
  if (spindle.bore_mm == null) {
    const bore = deriveBoreFromTaper(spindle.taper);
    if (bore != null) { spindle.bore_mm = bore; setProv("spindle.bore_mm", "bore-by-taper"); }
  }
  if (spindle.balance_grade == null) { spindle.balance_grade = deriveBalanceGrade(cls.rpmClass); setProv("spindle.balance_grade", "balance-by-rpm-iso1940"); }

  const ctlProfile = controllerProfile(input, cls);
  if (spindle.thermal_growth_comp == null) { spindle.thermal_growth_comp = ctlProfile.thermalComp; setProv("spindle.thermal_growth_comp", "thermal-by-controller-class"); }

  // --- FRF / rigidity (clone+merge: preserve any OEM sibling field, fill only the missing ones) ---
  let frf = input.frf ? { ...input.frf } : undefined;
  if (input.frf == null || input.frf.natural_frequency_hz == null) {
    const d = deriveFrf(cls, spindle);
    frf = {
      natural_frequency_hz: input.frf?.natural_frequency_hz ?? d.natural_frequency_hz,
      damping_ratio: input.frf?.damping_ratio ?? d.damping_ratio,
      stiffness_n_um: input.frf?.stiffness_n_um ?? d.stiffness_n_um,
    };
    setProv("frf", "frf-by-way-tier-mass-springmass");
  }
  // interface (taper) stiffness: fill independently whenever missing + an FRF stiffness exists
  if (spindle.interface_stiffness_n_um == null && frf?.stiffness_n_um != null) {
    spindle.interface_stiffness_n_um = frf.stiffness_n_um;
    setProv("spindle.interface_stiffness_n_um", "frf-stiffness");
  }

  // --- controller: look-ahead, corner control, HSM ---
  if (controller.look_ahead_blocks == null) { controller.look_ahead_blocks = ctlProfile.lookAhead; setProv("controller.look_ahead_blocks", `lookahead-by-controller:${ctlProfile.lookAheadBasis}`); }
  if (controller.corner_control == null) { controller.corner_control = ctlProfile.cornerControl; setProv("controller.corner_control", "corner-by-controller"); }
  if (controller.high_speed_machining == null) { controller.high_speed_machining = ctlProfile.hsm; setProv("controller.high_speed_machining", "hsm-by-rpm-controller"); }
  if (capabilities.high_speed_machining == null) { capabilities.high_speed_machining = ctlProfile.hsm; setProv("capabilities.high_speed_machining", "hsm-by-rpm-controller"); }

  // --- table ---
  if (table.type == null) { table.type = deriveTableType(cls); setProv("table.type", "table-by-kind"); }

  // --- kinematics (clone+merge: keep present sub-fields) ---
  let kinematics = input.kinematics ? { ...input.kinematics } : undefined;
  if (input.kinematics == null || input.kinematics.type == null) {
    const dk = deriveKinematics(input, cls);
    kinematics = {
      type: input.kinematics?.type ?? dk.type,
      structure: input.kinematics?.structure ?? dk.structure,
      chain: input.kinematics?.chain ?? dk.chain,
    };
    setProv("kinematics", "kinematics-by-kind-axes");
  }

  // --- weight ---
  let weight_kg = input.weight_kg;
  if (weight_kg == null) {
    const w = deriveWeight(input, cls);
    if (w != null) { weight_kg = w; setProv("weight_kg", "weight-by-envelope-regression"); }
  }

  // --- surface finish, build quality, robustness ---
  let surface_finish_capability = input.surface_finish_capability ? { ...input.surface_finish_capability } : undefined;
  if (input.surface_finish_capability == null || input.surface_finish_capability.best_ra_um == null) {
    surface_finish_capability = {
      best_ra_um: input.surface_finish_capability?.best_ra_um ?? deriveBestRa(cls),
      source: input.surface_finish_capability?.source ?? `inferred:ra-by-tier-${cls.tier}`,
    };
    setProv("surface_finish_capability", "ra-by-tier-class");
  }
  let build_quality = input.build_quality;
  if (build_quality == null) { build_quality = cls.tier; setProv("build_quality", "tier-by-brand-class"); }
  let robustness = input.robustness;
  if (robustness == null) { robustness = deriveRobustness(cls); setProv("robustness", "robustness-by-tier-way"); }

  // record the derived class + g-force as a structured capability extension via provenance note
  prov["_class"] = `kind=${cls.kind};tier=${cls.tier};rpmClass=${cls.rpmClass};way=${cls.wayType}`;
  prov["_gforce_g"] = `inferred:accel/${STANDARD_GRAVITY}=${(peakAccel / STANDARD_GRAVITY).toFixed(2)}g`;

  return {
    ...input,
    spindle,
    axes,
    way_type,
    table,
    controller,
    weight_kg,
    kinematics,
    frf,
    capabilities,
    surface_finish_capability,
    build_quality,
    robustness,
    _provenance: prov,
  };
}

/** Peak g-force multiple (accel / standard gravity) for an enriched machine. */
export function peakGForce(m: NormalizedMachine): number {
  const peak = Math.max(0, ...m.axes.map((a) => a.acceleration_m_s2 ?? 0));
  return peak > 0 ? peak / STANDARD_GRAVITY : 0;
}

/**
 * Enrich a batch + report per-field coverage (covered = present, booleans only when TRUE) so
 * U-MACHDB-03's verify script can prove the GAP->~100% jump on the live 1015. Mirrors the audit's
 * coverage predicates.
 */
export function enrichAll(machines: NormalizedMachine[]): {
  machines: NormalizedMachine[];
  coverage: Record<string, { count: number; pct: number }>;
} {
  const enriched = machines.map(enrichMachine);
  const N = enriched.length || 1;
  const cov = (fn: (m: NormalizedMachine) => unknown) => {
    const c = enriched.filter((m) => { const v = fn(m); return v != null && v !== false; }).length;
    return { count: c, pct: Math.round((c / N) * 1000) / 10 };
  };
  const anyAxis = (fn: (a: NormalizedAxis) => unknown) => (m: NormalizedMachine) => m.axes.some((a) => { const v = fn(a); return v != null && v !== false; });
  const coverage = {
    way_type: cov((m) => m.way_type),
    kinematics: cov((m) => m.kinematics?.type),
    axis_accuracy: cov(anyAxis((a) => a.accuracy_um)),
    axis_repeatability: cov(anyAxis((a) => a.repeatability_um)),
    rapid_rate: cov(anyAxis((a) => a.rapid_mm_min)),
    acceleration_gforce: cov(anyAxis((a) => a.acceleration_m_s2)),
    jerk: cov(anyAxis((a) => a.jerk_m_s3)),
    spindle_diameter: cov((m) => m.spindle.bore_mm),
    spindle_balance: cov((m) => m.spindle.balance_grade),
    spindle_thermal: cov((m) => m.spindle.thermal_growth_comp),
    rigidity_frf: cov((m) => m.frf?.natural_frequency_hz),
    thermal_comp: cov((m) => m.spindle.thermal_growth_comp),
    corner_rounding: cov((m) => m.controller.corner_control),
    look_ahead: cov((m) => m.controller.look_ahead_blocks),
    high_speed: cov((m) => m.capabilities.high_speed_machining),
    table_type: cov((m) => m.table.type),
    machine_weight: cov((m) => m.weight_kg),
    surface_finish: cov((m) => m.surface_finish_capability?.best_ra_um),
    build_quality: cov((m) => m.build_quality),
    robustness: cov((m) => m.robustness),
  };
  return { machines: enriched, coverage };
}

// ── SFC-catalog adapter (P5 wire into SpeedFeedOrchestrator.resolveMachine) ──────

/** The SpeedFeedOrchestrator MACHINE_CATALOG_QUICK entry shape (per-machine SFC capability row). */
export interface SfcCatalogEntry {
  power_kw: number;
  max_rpm: number;
  torque_Nm: number;
  taper: string;
  rigidity: "low" | "medium" | "high";
  type: string;
  guideway: "box" | "linear" | "hydrostatic";
  nat_freq_hz: number;
  accel_m_s2?: number;
  jerk_m_s3?: number;
}

/**
 * Map a RAW registry machine to the SFC catalog entry shape, sourcing every field from the normalized
 * + enriched canonical data. This is the P5 wire: it lets `resolveMachine()` consume the full
 * 1015-machine registry with gap-filled capabilities instead of (a) reading spindle power from ONE of
 * its 7 key variants (`power_continuous` only -> silently dropped every variant-keyed machine to the
 * default 15 kW) and (b) hard-coding `guideway="linear"` / `nat_freq_hz=800` (the latter physically
 * wrong -- real dominant structural modes are ~40-250 Hz; the enricher derives them from the FRF
 * spring-mass model). Returns undefined when the record has no spindle (nothing to resolve).
 */
export function registryMachineToCatalog(rawMachine: Record<string, unknown>): SfcCatalogEntry | undefined {
  if (!rawMachine || typeof rawMachine !== "object" || rawMachine.spindle == null) return undefined;
  const e = enrichMachine(normalizeMachine(rawMachine));
  const peakAccel = Math.max(0, ...e.axes.map((a) => a.acceleration_m_s2 ?? 0)) || undefined;
  const peakJerk = Math.max(0, ...e.axes.map((a) => a.jerk_m_s3 ?? 0)) || undefined;
  // e.way_type may be the canonical enum (box_way/linear_guide/hydrostatic/roller) OR a raw OEM string
  // ("box"/"linear"/...) preserved by the never-overwrite-OEM guard -- match by substring so both work.
  const wayStr = String(e.way_type || "").toLowerCase();
  const isBoxLike = /box|hydrostat/.test(wayStr);
  const isLinearLike = /linear|guide|roller|\blm\b|ball|rolling/.test(wayStr);
  const guideway: SfcCatalogEntry["guideway"] = /hydrostat/.test(wayStr) ? "hydrostatic" : /box/.test(wayStr) ? "box" : "linear";
  const w = e.weight_kg ?? 0;
  // box/hydrostatic ways + heavy-duty builds are the rigid ones; linear-guide is the medium baseline.
  const rigidity: SfcCatalogEntry["rigidity"] =
    e.build_quality === "heavy_duty" || isBoxLike || w > 10000
      ? "high"
      : w > 4000 || isLinearLike
        ? "medium"
        : "low";
  return {
    power_kw: e.spindle.power_kw ?? 15,
    max_rpm: e.spindle.max_rpm ?? 12000,
    torque_Nm: e.spindle.torque_nm ?? 120,
    taper: e.spindle.taper ?? "BT40",
    rigidity,
    type: e.type ?? "vertical_mill",
    guideway,
    nat_freq_hz: e.frf?.natural_frequency_hz ?? 800,
    accel_m_s2: peakAccel,
    jerk_m_s3: peakJerk,
  };
}
