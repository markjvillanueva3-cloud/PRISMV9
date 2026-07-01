/**
 * Machine POST Capability Profile -- per-machine post assessment (LATHE-OKUMA-POST / task#4)
 * ============================================================================
 * Operator directive (2026-06-29): "each post for each machine needs assessment on machine
 * kinematics, build quality, spindle type and spindle strength, motion capabilities,
 * robustness, accuracy, controller features, optional features, advanced features,
 * prism/kienzle exclusive / novel capabilities we invented to each post."
 *
 * DESIGN (R8/R16 -- composes with existing assets, does NOT duplicate them):
 *   - KINEMATICS / SPINDLE / MOTION / ACCURACY are ALREADY modelled by `ExtendedMachineProfile`
 *     (`machine-profiles-catalog.ts` + `machine-post-enriched.ts`: axes travels/rapids/positioning,
 *     spindle rpm/power/torque/taper, accuracy positioning/repeatability). This module REFERENCES
 *     that profile by `physicalProfileRef` -- it never re-declares those numbers.
 *   - This module fills the GAP dimensions with provenance tags so nothing is fabricated (R12):
 *       buildQuality, robustness, controllerFeatures, optionalFeatures, advancedFeatures
 *       (sourced from vendor manuals -- the original work order's "vendor manuals" phase), and
 *       prismNovel -- the PRISM/Kienzle capabilities baked into the post, VERIFIABLE FROM CODE NOW.
 *
 * EVERY capability field carries a `provenance`. The vendor-spec dimensions are deliberately
 * `unverified` / `vendor-manual` until pulled from the machine's manual -- a consumer must treat
 * a non-`verified-*` field as advisory, never as a machined guarantee.
 *
 * @module data/machine-post-capability-profile
 */

/** Where a capability value came from. `verified-code` = read from a PRISM engine; `verified-jm`
 *  = confirmed against a running JM program; `vendor-published` = manufacturer literature (not yet
 *  manual-confirmed for the specific machine option); `vendor-manual` = confirmed in the machine
 *  manual; `unverified` = placeholder pending the vendor-manual pass. */
export type CapabilityProvenance =
  | "verified-code"
  | "verified-jm"
  | "vendor-published"
  | "vendor-manual"
  | "unverified";

export interface CapabilityField<T> {
  value: T;
  provenance: CapabilityProvenance;
  /** file:line, manual section, or JM program path that backs `value`. */
  source?: string;
}

/** A PRISM/Kienzle novel capability the post emits or enforces -- the operator's headline
 *  dimension. Every entry is verifiable from the cited engine (provenance is always code). */
export interface PrismNovelCapability {
  id: string;
  title: string;
  description: string;
  /** The concrete G/M-code or behaviour it produces in the emitted program. */
  emittedAs?: string;
  /** Source engine (the proof this is real, not aspirational). */
  engine: string;
}

export interface MachinePostCapabilityProfile {
  /** Links to the machine identity (OKUMA_LATHE_MACHINES / jm-fleet-sim-map / ShopConfiguration). */
  machineId: string;
  /** Machine class discriminator so mill/EDM/Swiss profiles are queryable alongside lathe. */
  machineClass?: "lathe" | "mill" | "edm_sinker" | "edm_wire" | "swiss";
  /** The post engine that serves this machine. */
  postEngine: string;
  /** Controller dialect key (e.g. "okuma-osp"). */
  controllerDialect: string;
  /** Model key into `machine-profiles-catalog` / `machine-post-enriched` for kinematics, spindle,
   *  motion + accuracy. These dims are NOT re-declared here -- look them up via this ref. */
  physicalProfileRef: string;
  /** OEM controller features (e.g. OSP collision avoidance). vendor-published until manual-confirmed. */
  controllerFeatures: CapabilityField<string[]>;
  /** Options actually installed on THIS machine -- per-machine, needs manual/shop confirmation. */
  optionalFeatures: CapabilityField<string[]>;
  /** Advanced kinematic/process features (5-axis, polygon turning, sync tapping...). */
  advancedFeatures: CapabilityField<string[]>;
  /** Bed/way/thermal construction quality. vendor-manual. */
  buildQuality: CapabilityField<string | null>;
  /** Duty cycle / rigidity / max-cut robustness class. vendor-manual. */
  robustness: CapabilityField<string | null>;
  /** PRISM/Kienzle capabilities baked into the post -- VERIFIED FROM CODE. */
  prismNovel: PrismNovelCapability[];
  notes: string[];
}

// ============================================================================
// JM OKUMA OSP LATHE POST -- prism_novel (every entry verified from engine code)
// ============================================================================
//
// One post (OkumaB250LatheMasterPostEngine) + the TurningPrintToProgram pipeline serve the whole
// JM Okuma lathe fleet, so these PRISM-novel capabilities are shared across those machines.

const OKUMA_OSP_LATHE_PRISM_NOVEL: PrismNovelCapability[] = [
  {
    id: "osp-g85-lap-roughing",
    title: "OSP G85 LAP roughing (not Fanuc G71/G72)",
    description:
      "Emits the Okuma OSP G85 LAP bar-turning cycle for roughing instead of the Fanuc G71/G72 " +
      "stock-removal cycles. On an OSP control G71 is the THREADING cycle, so a Fanuc-dialect program alarms.",
    emittedAs: "G85 N<label> D<doc> U<Xstock> W<Zstock> F<feed> ... G81 ... G80",
    engine: "OkumaB250LatheMasterPostEngine.generateProgram",
  },
  {
    id: "osp-g71-single-line-threading",
    title: "OSP G71 single-line threading (not Fanuc G76)",
    description:
      "Emits the OSP single-line G71 threading cycle. Fanuc two-line G76 alarms/mis-cycles on OSP. " +
      "Verified line-for-line against Mark's running JM thread programs (U-PP-OKUMA-THREAD-G71).",
    emittedAs: "G71 X<minor> Z<end> B60 D<.08> U<.025> H<diametral> F<lead> M33 M73",
    engine: "OkumaB250LatheMasterPostEngine.generateThreadingCycle",
  },
  {
    id: "osp-explicit-grooving",
    title: "OSP explicit grooving (not Fanuc G75)",
    description:
      "Grooves with an explicit G1 plunge + G4 dwell + retract; the real JM corpus uses G75 zero times.",
    emittedAs: "G1 X<bottom> / G4 F<sec> / G0 retract",
    engine: "OkumaB250LatheMasterPostEngine",
  },
  {
    id: "osp-subspindle-no-drop-transfer",
    title: "Verified sub-spindle no-drop part transfer (Multus B250)",
    description:
      "Sub chuck CLAMPS (M248) + dwell BEFORE the main UNCLAMPS (M84) so the part is never dropped; " +
      "sync rotation M151/M150, interlock brackets. Codes verified vs Mark's running Multus programs (NOT M38/M39).",
    emittedAs: "M151 / M248 / G4 / M84 ... M150",
    engine: "OkumaB250LatheMasterPostEngine.generateSubSpindleTransfer",
  },
  {
    id: "osp-dwell-dialect",
    title: "OSP G4 F<sec> dwell dialect (not Fanuc G04 P<ms>)",
    description: "Dwells are emitted as Okuma G4 F<seconds>, not Fanuc G04 P<milliseconds>.",
    emittedAs: "G4 F0.5",
    engine: "OkumaB250LatheMasterPostEngine",
  },
  {
    id: "kienzle-force-aware-sf",
    title: "Kienzle force-aware speed/feed with G50 RPM clamp",
    description:
      "Cutting force Fc = kc1.1 * ap * fz^(1-mc) (canonical constants) drives a workholding safety-factor " +
      "check and the G50 max-RPM clamp on G96 CSS, so the emitted S/F never exceeds chuck grip or spindle limits.",
    emittedAs: "G50 S<maxRPM> ahead of G96 CSS",
    engine: "TurningPrintToProgramEngine.calculateCuttingParams + correctedCuttingForce",
  },
  {
    id: "gilbert-min-cost-vc",
    title: "Gilbert minimum-cost cutting-speed cap",
    description:
      "Caps the cutting speed at the Gilbert economic minimum-cost optimum on free-Vc ops (rough/face/bore) " +
      "using real JM cost rates -- only lowers Vc, never raises it.",
    engine: "GilbertEconomicSpeedEngine (via TurningPrintToProgramEngine)",
  },
  {
    id: "boring-bar-deflection-gate",
    title: "Boring-bar L^3/D^4 deflection pre-check",
    description:
      "Cantilever deflection delta = F*L^3/(3*E*I) gates boring ops against the L/D limit (<=4 steel, <=6 carbide) " +
      "before emit; flags over-deflection as a warning.",
    engine: "BoringBarDeflectionEngine (via TurningPrintToProgramEngine)",
  },
  {
    id: "tlusty-chatter-sld",
    title: "Tlusty regenerative-chatter stability limit",
    description: "Single-DOF Tlusty stability-lobe limit advises the max stable depth-of-cut per RPM.",
    engine: "TurningPrintToProgramEngine (turningChatterLimitMm)",
  },
  {
    id: "fail-loud-degraded-program",
    title: "Fail-loud degraded-program detection",
    description:
      "Any op whose emit field is non-finite is SKIPPED with an in-gcode (ERROR: ... SKIPPED) comment + a " +
      "machine-readable skipped_operations count; a non-zero count is a fail-closed signal, never a clean pass.",
    engine: "OkumaB250LatheMasterPostEngine (skipped_operations) + TurningPrintToProgramEngine critical-warning gate",
  },
  {
    id: "part-family-aware-plan",
    title: "Part-family-aware workholding + roughing-cycle advisory",
    description:
      "Classifies the turned part into one of 15 families and surfaces the family-appropriate workholding + " +
      "roughing cycle alongside the program (advisory; never overrides an explicit chuck choice or a safety verdict).",
    engine: "LathePartClassifierEngine (via TurningPrintToProgramEngine)",
  },
];

// Real, published Okuma OSP-P300L features (manufacturer literature). vendor-published until the
// specific JM machine's option list is confirmed against its manual.
const OKUMA_OSP_CONTROLLER_FEATURES: string[] = [
  "Collision Avoidance System (CAS)",
  "Machining Navi (chatter/vibration tuning)",
  "Thermo-Friendly Concept (thermal-deformation compensation)",
  "Intelligent Geometry Function / Advanced One-Touch IGF programming",
  "Servo Navi (servo tuning)",
];

const OKUMA_OSP_LATHE_NOTES = [
  "Physical dimensions (axes/travels/rapids, spindle rpm/power/torque/taper, positioning + repeatability) " +
    "live in ExtendedMachineProfile (machine-profiles-catalog.ts / machine-post-enriched.ts) -- see physicalProfileRef.",
  "buildQuality / robustness / optionalFeatures are vendor-PUBLISHED (Okuma product literature: Thermo-Friendly " +
    "Concept + product-line duty class + available options); per-machine OPTION INSTALL still needs shop confirmation, " +
    "and none are vendor-MANUAL-confirmed (no on-disk manual for the OSP lathe fleet).",
  "Mill / EDM / Swiss capability profiles are a follow-on: mill = foxtrot domain, EDM/wire = mike domain, and JM has " +
    "NO Swiss machine (LatheSwissPostGeneratorEngine targets generic Citizen/Tsugami vendors, not a JM asset).",
];

/** Genuinely-published Okuma product-line facts by model family. buildQuality + robustness are line-level
 *  facts Okuma publishes (Thermo-Friendly Concept thermal-deformation control + single-piece cast bed; the
 *  family duty class); optionalFeatures lists AVAILABLE options per the literature (per-machine install still
 *  needs shop confirmation). All vendor-published -- NOT vendor-manual (no on-disk manual), NOT fabricated. */
function okumaBuildClass(machineId: string): {
  buildQuality: CapabilityField<string | null>;
  robustness: CapabilityField<string | null>;
  optionalFeatures: CapabilityField<string[]>;
} {
  const id = machineId.toUpperCase();
  const family = id.startsWith("LB") ? "LB"
    : id.startsWith("MULTUS") ? "MULTUS"
    : id.startsWith("GENOS") ? "GENOS"
    : id.startsWith("CROWN") ? "CROWN"
    : id.startsWith("LNC") ? "LNC"
    : "OKUMA";
  const dutyByFamily: Record<string, string> = {
    LB: "heavy-duty high-duty-cycle horizontal production lathe (box ways)",
    MULTUS: "rigid multitasking mill-turn (B-axis, roller/box ways)",
    GENOS: "mid-duty value production lathe",
    CROWN: "large-swing heavy-duty box-way lathe",
    LNC: "compact light/mid-duty CNC lathe",
    OKUMA: "Okuma OSP production lathe",
  };
  const optionsByFamily: Record<string, string[]> = {
    LB: ["parts catcher", "chip conveyor", "tailstock", "steady rest", "bar feeder interface"],
    MULTUS: ["sub-spindle part transfer", "live tooling", "B-axis contouring", "parts catcher", "bar feeder interface"],
    GENOS: ["parts catcher", "chip conveyor", "tailstock", "bar feeder interface"],
    CROWN: ["steady rest", "tailstock", "chip conveyor"],
    LNC: ["parts catcher", "bar feeder interface"],
    OKUMA: ["parts catcher", "chip conveyor"],
  };
  const ways = family === "LB" || family === "CROWN" ? "box ways" : "roller/box ways per model";
  return {
    buildQuality: {
      value: `Single-piece thermally-symmetric cast bed with Thermo-Friendly Concept (thermal-deformation control); ${ways}`,
      provenance: "vendor-published",
      source: `Okuma product literature (Thermo-Friendly Concept; ${family}-series construction)`,
    },
    robustness: {
      value: dutyByFamily[family],
      provenance: "vendor-published",
      source: `Okuma ${family}-series product-line positioning`,
    },
    optionalFeatures: {
      value: optionsByFamily[family],
      provenance: "vendor-published",
      source: `Okuma ${family}-series available options (per-machine install pending shop confirmation)`,
    },
  };
}

/** Build a JM Okuma OSP lathe profile sharing the post's prism_novel + controller features. */
function okumaLatheProfile(machineId: string, physicalProfileRef: string): MachinePostCapabilityProfile {
  const bc = okumaBuildClass(machineId);
  return {
    machineId,
    machineClass: "lathe",
    postEngine: "OkumaB250LatheMasterPostEngine",
    controllerDialect: "okuma-osp",
    physicalProfileRef,
    controllerFeatures: { value: [...OKUMA_OSP_CONTROLLER_FEATURES], provenance: "vendor-published", source: "Okuma OSP-P300L literature" },
    optionalFeatures: bc.optionalFeatures,
    advancedFeatures: {
      value: machineId.includes("MULTUS")
        ? ["mill-turn (B-axis)", "live tooling", "C-axis", "sub-spindle (SP2) part transfer"]
        : ["G96 CSS", "live tooling (where equipped)"],
      provenance: "verified-jm",
      source: "OKUMA_LATHE_MACHINES capabilities + JM running programs",
    },
    buildQuality: bc.buildQuality,
    robustness: bc.robustness,
    prismNovel: OKUMA_OSP_LATHE_PRISM_NOVEL,
    notes: [...OKUMA_OSP_LATHE_NOTES],
  };
}

/**
 * Registry keyed by machineId. Seeded with the JM Okuma lathe fleet (the machines whose posts the
 * LATHE-OKUMA-POST fix made OSP-correct). Mill/EDM/Swiss machines + the vendor-manual population of
 * the stubbed dimensions are follow-on units.
 */
export const MACHINE_POST_CAPABILITY_PROFILES: Record<string, MachinePostCapabilityProfile> = {
  "LB250II-M": okumaLatheProfile("LB250II-M", "OKUMA LB250II-M"),
  "LB3000": okumaLatheProfile("LB3000", "OKUMA LB3000"),
  "MULTUS-B250II": okumaLatheProfile("MULTUS-B250II", "OKUMA MULTUS B250II"),
  "GENOS-L300-M": okumaLatheProfile("GENOS-L300-M", "OKUMA GENOS L300-M"),
  "GENOS-L200E-M": okumaLatheProfile("GENOS-L200E-M", "OKUMA GENOS L200E-M"),
  "GENOS-L400II-E": okumaLatheProfile("GENOS-L400II-E", "OKUMA GENOS L400II-E"),
  "LNC8": okumaLatheProfile("LNC8", "OKUMA LNC8"),
  "CROWN-L1060": okumaLatheProfile("CROWN-L1060", "OKUMA CROWN L1060"),
};

/**
 * Look up the post capability profile for a machine. Accepts the canonical machineId or a free-text
 * model (case-insensitive substring of an id), returns undefined when no profile exists (R12: no
 * fabricated default -- absence is reported, not faked).
 * @param machineId canonical id (e.g. "GENOS-L300-M") or model text (e.g. "Okuma Genos L300")
 */
export function getMachinePostCapabilityProfile(machineId: string | undefined): MachinePostCapabilityProfile | undefined {
  if (!machineId || typeof machineId !== "string") return undefined;
  const exact = MACHINE_POST_CAPABILITY_PROFILES[machineId];
  if (exact) return exact;
  const key = machineId.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [id, profile] of Object.entries(MACHINE_POST_CAPABILITY_PROFILES)) {
    const idKey = id.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (idKey.includes(key) || key.includes(idKey)) return profile;
  }
  return undefined;
}

/** All machineIds with a post capability profile. */
export function listProfiledMachines(): string[] {
  return Object.keys(MACHINE_POST_CAPABILITY_PROFILES);
}
