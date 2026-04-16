/**
 * MachinePostCrossRefEngine — Machine-to-Post Cross-Reference Engine
 *
 * Consolidates POST-ULT-MS3 U01-U04:
 * - U01 MachinePostMatcher: Find best matching CPS post for each machine
 * - U02 CoverageGapAnalyzer: Identify machines with no matching CPS post
 * - U03 PostFeatureEnricher: Map CPS post properties to machine profiles
 * - U04 PostCoverageMatrix: Generate manufacturer x feature coverage matrix
 *
 * Cross-references PRISM's 910+ machine catalog with 180 parsed CPS post
 * profiles to produce match scoring, gap analysis, enrichment, and coverage
 * matrices for the entire fleet.
 *
 * @engine MachinePostCrossRefEngine
 * @module MachinePostCrossRefEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import {
  EXTENDED_MACHINE_CATALOG,
  type ExtendedMachineProfile,
} from "../data/machine-profiles-catalog.js";
import {
  type CpsFullProfile,
  type CpsProperty,
} from "./CpsPostParserEngine.js";

// ─── Interfaces ──────────────────────────────────────────────────────

export interface MachinePostMatch {
  machine_brand: string;
  machine_model: string;
  controller: string;
  machine_type: string;
  matched_cps: string | null;
  confidence: number;
  match_reasons: string[];
  available_properties: string[];
  gaps: string[];
}

export interface CoverageGap {
  manufacturer: string;
  controller: string;
  machine_count: number;
  machine_models: string[];
  reason: string;
  suggested_base_post: string;
}

export interface CoverageMatrix {
  manufacturers: string[];
  features: string[];
  matrix: Record<string, Record<string, number>>;
  total_machines: number;
  matched_machines: number;
  unmatched_machines: number;
  coverage_percent: number;
}

export interface EnrichedMachineProfile {
  machine_brand: string;
  machine_model: string;
  controller: string;
  machine_type: string;
  matched_cps: string;
  confidence: number;
  post_features: Record<string, boolean>;
  post_properties: CpsProperty[];
  capability_fingerprint: string;
  supports_probing: boolean;
  supports_inspection: boolean;
  supports_5axis: boolean;
  supports_turning: boolean;
  supports_mill_turn: boolean;
}

export interface CrossRefInput {
  action: "match_all" | "match_single" | "coverage_gaps" | "coverage_matrix";
  machine_brand?: string;
  machine_model?: string;
  cps_directory?: string;
  min_confidence?: number;
  include_enrichment?: boolean;
}

export interface CrossRefResult {
  action: string;
  matches?: MachinePostMatch[];
  enriched?: EnrichedMachineProfile[];
  gaps?: CoverageGap[];
  matrix?: CoverageMatrix;
  summary: {
    total_machines: number;
    total_cps_files: number;
    matched: number;
    unmatched: number;
    coverage_percent: number;
    avg_confidence: number;
  };
}

// ─── Manufacturer Name Normalization ─────────────────────────────────

/**
 * Maps brand names (case-insensitive) from the machine catalog to their
 * canonical CPS filename prefix. Many CPS files use abbreviated or
 * alternate spellings.
 */
const BRAND_TO_CPS_PREFIX: Record<string, string[]> = {
  haas:            ["haas"],
  "dmg mori":      ["dmg mori", "mori-apt", "dmg"],
  mazak:           ["mazak"],
  okuma:           ["okuma"],
  makino:          ["makino"],
  hermle:          ["hermle"],
  doosan:          ["doosan"],
  "dn solutions":  ["doosan"],       // DN Solutions = rebranded Doosan
  brother:         ["brother"],
  fanuc:           ["fanuc", "robodrill"],
  datron:          ["datron"],
  siemens:         ["siemens"],
  heidenhain:      ["heidenhain"],
  hurco:           ["hurco", "hurco3d"],
  fadal:           ["fadal"],
  fidia:           ["fidia"],
  kitamura:        ["kitamura"],
  "nakamura-tome": ["nakamura"],
  tormach:         ["tormach"],
  citizen:         ["citizen"],
  chiron:          ["chiron"],
  cincinnati:      ["cincinnati"],
  feeler:          ["feeler"],
  awea:            ["awea"],
  grob:            ["grob"],
  hardinge:        ["hardinge"],
  "hyundai wia":   ["hyundai", "hwacheon"],
  "hyundai-wia":   ["hyundai", "hwacheon"],
  index:           ["index"],
  kern:            ["kern"],
  matsuura:        ["matsuura"],
  mikron:          ["mikron"],
  "mitsui seiki":  ["mitsui"],
  star:            ["star"],
  traub:           ["traub"],
  tsugami:         ["tsugami"],
  spinner:         ["spinner"],
  leadwell:        ["leadwell"],
  emag:            ["emag"],
  "giddings & lewis": ["giddings"],
  hartford:        ["hartford"],
  heller:          ["heller"],
  mhi:             ["mitsubishi"],
  okk:             ["okk"],
  quaser:          ["quaser"],
  "roku-roku":     ["roku"],
  sodick:          ["sodick"],
  soraluce:        ["soraluce"],
  takumi:          ["takumi"],
  toyoda:          ["toyoda"],
  ycm:             ["ycm"],
  yasda:           ["yasda"],
  milltronics:     ["milltronics"],
  toshiba:         ["toshiba"],
  deckel:          ["deckel"],
  amada:           ["amada"],
};

/**
 * Controller keyword to CPS filename token mapping.
 * CPS files often encode the controller in their filename or description.
 */
const CONTROLLER_TO_CPS_KEYWORDS: Record<string, string[]> = {
  fanuc:       ["fanuc", "0i", "31i", "30i", "16i", "fanuc compact", "fanuc incremental"],
  siemens:     ["siemens", "sinumerik", "840d", "828d", "810d", "808d", "802d", "840c", "sinumerik one"],
  heidenhain:  ["heidenhain", "tnc", "itnc", "145", "155", "407", "426", "530", "640"],
  haas:        ["haas", "ngc", "next generation"],
  mazatrol:    ["mazak", "mazatrol", "smooth", "integrex", "qtu", "ez"],
  osp:         ["okuma", "osp"],
  mapps:       ["mori", "mapps"],
  mitsubishi:  ["mitsubishi", "m80", "m70", "m800"],
  brother:     ["brother", "cnc-c00"],
  hurco:       ["hurco", "winmax"],
  datron:      ["datron", "mcr"],
  pathpilot:   ["tormach", "pathpilot"],
  grbl:        ["grbl"],
};

/**
 * Machine type to CPS filename keywords.
 */
const TYPE_TO_CPS_KEYWORDS: Record<string, string[]> = {
  lathe:       ["turning", "lathe", "st-", "qtu", "quick turn", "ez"],
  vmc:         ["mill", "vmc"],
  hmc:         ["hmc", "ec-", "nhx"],
  "5axis":     ["5ax", "5-axis", "five axis", "umc", "integrex", "a500", "d200", "d300", "d500", "vr-"],
  mill_turn:   ["mill-turn", "multi-tasking", "integrex", "nlx", "msy", "ly"],
  swiss:       ["swiss"],
  router:      ["router"],
  edm_wire:    ["edm", "wire"],
  edm_sinker:  ["edm", "sinker"],
};

/**
 * Post features we track in the coverage matrix.
 * Derived from common CPS property names and capability flags.
 */
const TRACKED_FEATURES = [
  "probing",
  "inspection",
  "5axis",
  "turning",
  "mill_turn",
  "tsc",              // through-spindle coolant
  "ssv",              // spindle speed variation
  "rigid_tapping",
  "high_speed",
  "tool_breakage",
  "chip_transport",
  "safe_retract",
  "work_plane_tilting",
  "sub_spindle",
  "live_tooling",
  "c_axis",
  "y_axis",
  "bar_feeder",
  "part_catcher",
  "coolant_through_tool",
] as const;

type TrackedFeature = (typeof TRACKED_FEATURES)[number];

/**
 * Maps CPS property names/groups to our tracked features.
 * A property is mapped if its name or group contains one of the match tokens.
 */
const PROPERTY_FEATURE_MAP: Record<TrackedFeature, string[]> = {
  probing:              ["probe", "probing", "inspection"],
  inspection:           ["inspect", "probe", "measurementPath"],
  "5axis":              ["5axis", "fiveAxis", "useTCP", "useMultiAxis", "tcp", "TCPM", "preloadCompensation", "workPlane"],
  turning:              ["turning", "useTurning", "gotTurning", "turret"],
  mill_turn:            ["millTurn", "multiTasking", "useLiveTooling"],
  tsc:                  ["coolant", "throughSpindle", "TSC", "highPressure"],
  ssv:                  ["SSV", "spindleSpeedVariation", "ssvSpindle"],
  rigid_tapping:        ["rigidTap", "tapping", "syncTap"],
  high_speed:           ["highSpeed", "HSM", "highFeed", "smoothing"],
  tool_breakage:        ["toolBreak", "toolLife", "macroB", "toolMeasure"],
  chip_transport:       ["chip", "chipConveyor"],
  safe_retract:         ["safeRetract", "retract", "safeStart"],
  work_plane_tilting:   ["tiltedWorkPlane", "workPlane", "useMultiAxis"],
  sub_spindle:          ["subSpindle", "secondarySpindle", "transferType"],
  live_tooling:         ["liveTool", "liveTooling", "useLiveTool"],
  c_axis:               ["useCAxis", "cAxis", "c_axis", "gotCAxis"],
  y_axis:               ["useYAxis", "yAxis", "gotYAxisCommands"],
  bar_feeder:           ["barFeeder", "barFeed", "useBarFeeder"],
  part_catcher:         ["partCatcher", "gotPartCatcher"],
  coolant_through_tool: ["coolantThroughTool", "throughTool", "tsc"],
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Normalize a string for fuzzy comparison */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Check if any of the tokens appear in the target string */
function hasAnyToken(target: string, tokens: string[]): boolean {
  const t = target.toLowerCase();
  return tokens.some(tok => t.includes(tok.toLowerCase()));
}

/** Extract the manufacturer prefix from a CPS filename */
function cpsFilePrefix(filename: string): string {
  // "haas next generation.cps" → "haas"
  // "siemens-840d.cps" → "siemens"
  const base = filename.replace(/\.cps$/i, "").toLowerCase();
  // Split on space or hyphen and return first token
  return base.split(/[\s-]/)[0];
}

/** Get all CPS filenames from directory */
function listCpsFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(".cps"))
      .sort();
  } catch {
    return [];
  }
}

// ─── Engine Class ────────────────────────────────────────────────────

class MachinePostCrossRefEngine {
  private readonly defaultCpsDir = "H:/prism/BOX/FUSION BASIC POSTS";

  // Cache parsed CPS profiles keyed by filename
  private profileCache: Map<string, CpsFullProfile> | null = null;

  /**
   * Main entry point — dispatches to the appropriate action handler.
   */
  execute(input: CrossRefInput): CrossRefResult {
    const action = input.action;
    log.info(`MachinePostCrossRefEngine: action=${action}`);

    switch (action) {
      case "match_all":
        return this.matchAll(input);
      case "match_single":
        return this.matchSingle(input);
      case "coverage_gaps":
        return this.coverageGaps(input);
      case "coverage_matrix":
        return this.coverageMatrixAction(input);
      default:
        throw new Error(`Unknown action: ${action}. Use: match_all, match_single, coverage_gaps, coverage_matrix`);
    }
  }

  // ─── U01: Machine-Post Matcher ───────────────────────────────────

  /**
   * For each machine in the catalog, find the best matching CPS post.
   * Scoring: manufacturer match (0.4), controller match (0.3), type match (0.3).
   */
  private matchAll(input: CrossRefInput): CrossRefResult {
    const cpsDir = input.cps_directory || this.defaultCpsDir;
    const cpsFiles = listCpsFiles(cpsDir);
    const profiles = this.loadCpsProfiles(cpsDir);
    const machines = EXTENDED_MACHINE_CATALOG;
    const minConf = input.min_confidence ?? 0;

    const matches: MachinePostMatch[] = [];
    const enriched: EnrichedMachineProfile[] = [];

    for (const machine of machines) {
      const match = this.scoreMachine(machine, cpsFiles, profiles);
      if (match.confidence >= minConf) {
        matches.push(match);
      }

      if (input.include_enrichment && match.matched_cps && match.confidence > 0) {
        const profile = profiles.get(match.matched_cps);
        if (profile) {
          enriched.push(this.enrichMachine(machine, match, profile));
        }
      }
    }

    const matched = matches.filter(m => m.matched_cps !== null).length;

    return {
      action: "match_all",
      matches,
      enriched: input.include_enrichment ? enriched : undefined,
      summary: this.buildSummary(machines.length, cpsFiles.length, matches),
    };
  }

  /**
   * Match a single machine by brand + model.
   */
  private matchSingle(input: CrossRefInput): CrossRefResult {
    if (!input.machine_brand || !input.machine_model) {
      throw new Error("match_single requires machine_brand and machine_model");
    }

    const cpsDir = input.cps_directory || this.defaultCpsDir;
    const cpsFiles = listCpsFiles(cpsDir);
    const profiles = this.loadCpsProfiles(cpsDir);
    const machines = EXTENDED_MACHINE_CATALOG;

    const brandNorm = norm(input.machine_brand);
    const modelNorm = norm(input.machine_model);

    const machine = machines.find(m =>
      norm(m.brand) === brandNorm &&
      (norm(m.model) === modelNorm || norm(m.model).includes(modelNorm) || modelNorm.includes(norm(m.model)))
    );

    if (!machine) {
      return {
        action: "match_single",
        matches: [],
        summary: {
          total_machines: machines.length,
          total_cps_files: cpsFiles.length,
          matched: 0,
          unmatched: 1,
          coverage_percent: 0,
          avg_confidence: 0,
        },
      };
    }

    const match = this.scoreMachine(machine, cpsFiles, profiles);
    const enrichedArr: EnrichedMachineProfile[] = [];

    if (input.include_enrichment && match.matched_cps) {
      const profile = profiles.get(match.matched_cps);
      if (profile) {
        enrichedArr.push(this.enrichMachine(machine, match, profile));
      }
    }

    return {
      action: "match_single",
      matches: [match],
      enriched: enrichedArr.length > 0 ? enrichedArr : undefined,
      summary: {
        total_machines: machines.length,
        total_cps_files: cpsFiles.length,
        matched: match.matched_cps ? 1 : 0,
        unmatched: match.matched_cps ? 0 : 1,
        coverage_percent: match.matched_cps ? 100 : 0,
        avg_confidence: match.confidence,
      },
    };
  }

  /**
   * Score a single machine against all available CPS files.
   * Returns the best match with confidence score and reasons.
   */
  private scoreMachine(
    machine: ExtendedMachineProfile,
    cpsFiles: string[],
    profiles: Map<string, CpsFullProfile>,
  ): MachinePostMatch {
    const brandLower = machine.brand.toLowerCase();
    const controllerLower = machine.controller.toLowerCase();
    const machineType = machine.type.toLowerCase();
    const modelLower = machine.model.toLowerCase();

    // Find CPS prefixes for this brand
    const brandPrefixes = BRAND_TO_CPS_PREFIX[brandLower] || [];

    let bestScore = 0;
    let bestFile: string | null = null;
    let bestReasons: string[] = [];

    for (const cpsFile of cpsFiles) {
      const cpsLower = cpsFile.toLowerCase().replace(/\.cps$/, "");
      let score = 0;
      const reasons: string[] = [];

      // ── Manufacturer match (max 0.4) ──
      const mfrScore = this.scoreMfr(brandLower, brandPrefixes, cpsLower, modelLower);
      if (mfrScore > 0) {
        score += mfrScore * 0.4;
        if (mfrScore >= 0.9) reasons.push(`manufacturer exact: ${machine.brand}`);
        else reasons.push(`manufacturer partial: ${machine.brand} → ${cpsFile}`);
      }

      // ── Controller match (max 0.3) ──
      const ctrlScore = this.scoreController(controllerLower, cpsLower, profiles.get(cpsFile));
      if (ctrlScore > 0) {
        score += ctrlScore * 0.3;
        if (ctrlScore >= 0.9) reasons.push(`controller exact: ${machine.controller}`);
        else reasons.push(`controller partial: ${machine.controller}`);
      }

      // ── Type match (max 0.3) ──
      const typeScore = this.scoreType(machineType, cpsLower, profiles.get(cpsFile));
      if (typeScore > 0) {
        score += typeScore * 0.3;
        reasons.push(`type match: ${machine.type}`);
      }

      // ── Exact model match bonus ──
      if (this.hasExactModelMatch(modelLower, cpsLower)) {
        score = Math.min(score + 0.15, 1.0);
        reasons.push(`model exact: ${machine.model}`);
      }

      if (score > bestScore) {
        bestScore = score;
        bestFile = cpsFile;
        bestReasons = reasons;
      }
    }

    // Round confidence to 2 decimal places
    const confidence = Math.round(bestScore * 100) / 100;

    // Build available properties list from matched CPS
    const availableProps: string[] = [];
    const gaps: string[] = [];

    if (bestFile && confidence > 0) {
      const profile = profiles.get(bestFile);
      if (profile) {
        availableProps.push(...profile.properties.map(p => p.name));
        // Identify feature gaps
        for (const feature of TRACKED_FEATURES) {
          if (!this.profileHasFeature(profile, feature)) {
            gaps.push(feature);
          }
        }
      }
    } else {
      gaps.push("no_matching_post");
    }

    return {
      machine_brand: machine.brand,
      machine_model: machine.model,
      controller: machine.controller,
      machine_type: machine.type,
      matched_cps: confidence > 0 ? bestFile : null,
      confidence,
      match_reasons: bestReasons,
      available_properties: availableProps,
      gaps,
    };
  }

  /**
   * Manufacturer scoring — how well does the CPS filename match the machine brand?
   */
  private scoreMfr(
    brandLower: string,
    brandPrefixes: string[],
    cpsLower: string,
    modelLower: string,
  ): number {
    // Direct prefix match: "haas" in "haas next generation"
    for (const prefix of brandPrefixes) {
      if (cpsLower.startsWith(prefix)) {
        return 1.0;
      }
    }

    // Normalized brand appears anywhere in CPS filename
    const brandNormed = norm(brandLower);
    const cpsNormed = norm(cpsLower);
    if (cpsNormed.includes(brandNormed) && brandNormed.length >= 3) {
      return 0.85;
    }

    // Check if CPS filename is a generic controller post that covers this brand
    // e.g., "fanuc.cps" covers any Fanuc-controlled machine
    const controllerGenericPosts = ["fanuc", "siemens-840d", "siemens-828d",
      "siemens-810d", "siemens-808d", "siemens-802d", "siemens-840c",
      "heidenhain", "grbl"];
    for (const gp of controllerGenericPosts) {
      if (cpsLower === gp || cpsLower.startsWith(gp + " ")) {
        return 0; // Controller-generic posts scored separately via controller match
      }
    }

    return 0;
  }

  /**
   * Controller scoring — how well does the CPS match the machine's controller?
   */
  private scoreController(
    controllerLower: string,
    cpsLower: string,
    profile?: CpsFullProfile,
  ): number {
    // Find controller family
    for (const [family, keywords] of Object.entries(CONTROLLER_TO_CPS_KEYWORDS)) {
      const machineHasCtrl = keywords.some(kw => controllerLower.includes(kw.toLowerCase()));
      if (!machineHasCtrl) continue;

      // CPS filename contains controller keywords
      const cpsHasCtrl = keywords.some(kw => cpsLower.includes(kw.toLowerCase()));
      if (cpsHasCtrl) {
        // Exact controller model in filename
        // e.g., controller="Siemens SINUMERIK 840D sl" and CPS="siemens-840d"
        if (controllerLower.includes("840d") && cpsLower.includes("840d")) return 1.0;
        if (controllerLower.includes("828d") && cpsLower.includes("828d")) return 1.0;
        if (controllerLower.includes("810d") && cpsLower.includes("810d")) return 1.0;
        if (controllerLower.includes("808d") && cpsLower.includes("808d")) return 1.0;
        if (controllerLower.includes("802d") && cpsLower.includes("802d")) return 1.0;
        if (controllerLower.includes("840c") && cpsLower.includes("840c")) return 1.0;

        // Generic family match
        return 0.7;
      }

      // Check CPS profile description for controller hints
      if (profile) {
        const desc = (profile.metadata.description + " " + (profile.metadata.longDescription || "")).toLowerCase();
        if (keywords.some(kw => desc.includes(kw.toLowerCase()))) {
          return 0.5;
        }
      }
    }

    // Haas machines always use Haas NGC — Haas CPS files are the match
    if (controllerLower.includes("haas") && cpsLower.startsWith("haas")) {
      return 0.8;
    }

    return 0;
  }

  /**
   * Machine type scoring — does the CPS handle this type of machining?
   */
  private scoreType(
    machineType: string,
    cpsLower: string,
    profile?: CpsFullProfile,
  ): number {
    // Determine if this is a turning, milling, or mill-turn machine
    const isTurning = ["lathe", "swiss", "vtl"].includes(machineType);
    const isMilling = ["vmc", "hmc", "5axis", "router", "bridge"].includes(machineType);
    const isMillTurn = machineType === "mill_turn";

    // Check CPS filename for type indicators
    const cpsHasTurning = hasAnyToken(cpsLower, ["turning", "lathe", "st-", "qtu", "quick turn", "ez "]);
    const cpsHasMilling = !cpsHasTurning && !hasAnyToken(cpsLower, ["turning"]);
    const cpsHasMillTurn = hasAnyToken(cpsLower, ["mill-turn", "multi-tasking", "integrex", "msy", "nlx"]);
    const cpsHas5Axis = hasAnyToken(cpsLower, ["5ax", "5-ax", "umc", "a500", "d200", "d300", "d500", "vr-"]);
    const cpsHasInspection = hasAnyToken(cpsLower, ["inspection"]);

    // Check CPS profile capabilities
    if (profile) {
      const caps = profile.metadata.capabilities;
      if (isMillTurn && caps.milling && caps.turning) return 1.0;
      if (isTurning && caps.turning && !caps.milling) return 0.9;
      if (isTurning && caps.turning) return 0.7;
      if (isMilling && caps.milling && !caps.turning) return 0.8;
      if (machineType === "5axis" && caps.milling) return 0.7;
    }

    // Filename-based matching
    if (isMillTurn && cpsHasMillTurn) return 1.0;
    if (isMillTurn && (cpsHasTurning || cpsHasMilling)) return 0.5;
    if (isTurning && cpsHasTurning) return 0.9;
    if (machineType === "5axis" && cpsHas5Axis) return 1.0;
    if (isMilling && cpsHasMilling && !cpsHasTurning) return 0.7;
    if (isMilling && cpsHas5Axis) return 0.6;
    if (cpsHasInspection) return 0.3; // Inspection posts partially match any machine

    return 0;
  }

  /**
   * Check if the CPS filename contains an exact model match.
   * e.g., machine model "UMC-750" and CPS "haas umc-750.cps"
   */
  private hasExactModelMatch(modelLower: string, cpsLower: string): boolean {
    // Normalize model: "VF-2" → "vf-2", "ST-20Y" → "st-20y"
    const modelClean = modelLower.replace(/\s+/g, "-");
    if (cpsLower.includes(modelClean)) return true;

    // Also check without hyphens
    const modelNoHyphen = modelLower.replace(/-/g, "");
    const cpsNoHyphen = cpsLower.replace(/-/g, "");
    if (cpsNoHyphen.includes(modelNoHyphen) && modelNoHyphen.length >= 3) return true;

    // Check partial model match for series
    // e.g., "Integrex i-400S" should match "mazak integrex i-400s.cps"
    const parts = modelLower.split(/[\s-]+/);
    for (const part of parts) {
      if (part.length >= 4 && cpsLower.includes(part)) return true;
    }

    return false;
  }

  // ─── U02: Coverage Gap Analyzer ──────────────────────────────────

  /**
   * Identify machines with no matching CPS post.
   * Groups gaps by manufacturer and controller type.
   */
  private coverageGaps(input: CrossRefInput): CrossRefResult {
    const cpsDir = input.cps_directory || this.defaultCpsDir;
    const cpsFiles = listCpsFiles(cpsDir);
    const profiles = this.loadCpsProfiles(cpsDir);
    const machines = EXTENDED_MACHINE_CATALOG;
    const minConf = input.min_confidence ?? 0.3;

    // Match all machines
    const allMatches: MachinePostMatch[] = [];
    for (const machine of machines) {
      allMatches.push(this.scoreMachine(machine, cpsFiles, profiles));
    }

    // Find unmatched or low-confidence machines
    const unmatched = allMatches.filter(m => m.matched_cps === null || m.confidence < minConf);

    // Group by manufacturer + controller
    const gapGroups = new Map<string, {
      manufacturer: string;
      controller: string;
      models: string[];
    }>();

    for (const m of unmatched) {
      const key = `${m.machine_brand}::${m.controller}`;
      if (!gapGroups.has(key)) {
        gapGroups.set(key, {
          manufacturer: m.machine_brand,
          controller: m.controller,
          models: [],
        });
      }
      gapGroups.get(key)!.models.push(m.machine_model);
    }

    // Build gap reports with suggested base posts
    const gaps: CoverageGap[] = [];
    for (const [, group] of gapGroups) {
      const suggested = this.suggestBasePost(group.manufacturer, group.controller, cpsFiles, profiles);
      gaps.push({
        manufacturer: group.manufacturer,
        controller: group.controller,
        machine_count: group.models.length,
        machine_models: group.models.sort(),
        reason: this.gapReason(group.manufacturer, group.controller, cpsFiles),
        suggested_base_post: suggested,
      });
    }

    // Sort by machine count descending
    gaps.sort((a, b) => b.machine_count - a.machine_count);

    return {
      action: "coverage_gaps",
      gaps,
      summary: this.buildSummary(machines.length, cpsFiles.length, allMatches),
    };
  }

  /**
   * Suggest the closest existing CPS post that could be adapted for a gap.
   */
  private suggestBasePost(
    manufacturer: string,
    controller: string,
    cpsFiles: string[],
    profiles: Map<string, CpsFullProfile>,
  ): string {
    const controllerLower = controller.toLowerCase();

    // Priority 1: Same controller family generic post
    for (const [, keywords] of Object.entries(CONTROLLER_TO_CPS_KEYWORDS)) {
      if (keywords.some(kw => controllerLower.includes(kw.toLowerCase()))) {
        // Find a generic post for this controller family
        for (const cps of cpsFiles) {
          const cpsLower = cps.toLowerCase();
          if (keywords.some(kw => cpsLower.includes(kw.toLowerCase()))) {
            // Prefer non-turning, non-inspection generic posts
            if (!cpsLower.includes("turning") && !cpsLower.includes("inspection")) {
              return cps;
            }
          }
        }
        // Fall back to any matching controller post
        for (const cps of cpsFiles) {
          if (keywords.some(kw => cps.toLowerCase().includes(kw.toLowerCase()))) {
            return cps;
          }
        }
      }
    }

    // Priority 2: Generic fanuc or siemens post (most common controllers)
    if (controllerLower.includes("fanuc") || controllerLower.includes("0i") || controllerLower.includes("31i")) {
      return "fanuc.cps";
    }
    if (controllerLower.includes("siemens") || controllerLower.includes("sinumerik")) {
      return "siemens-840d.cps";
    }

    // Priority 3: Fallback to fanuc as most universal post
    return "fanuc.cps";
  }

  /**
   * Generate a human-readable gap reason.
   */
  private gapReason(manufacturer: string, controller: string, cpsFiles: string[]): string {
    const brandLower = manufacturer.toLowerCase();
    const prefixes = BRAND_TO_CPS_PREFIX[brandLower];

    if (!prefixes || prefixes.length === 0) {
      return `No CPS filename prefix mapping for manufacturer "${manufacturer}"`;
    }

    const hasBrandPost = cpsFiles.some(f => {
      const fl = f.toLowerCase();
      return prefixes.some(p => fl.startsWith(p));
    });

    if (!hasBrandPost) {
      return `No dedicated CPS post exists for ${manufacturer}; requires generic controller post adaptation`;
    }

    return `CPS posts exist for ${manufacturer} but no match for controller "${controller}" or machine type`;
  }

  // ─── U03: Post Feature Enricher ──────────────────────────────────

  /**
   * For a matched machine-post pair, map the CPS post's properties to
   * create an enriched machine profile with feature flags.
   */
  private enrichMachine(
    machine: ExtendedMachineProfile,
    match: MachinePostMatch,
    profile: CpsFullProfile,
  ): EnrichedMachineProfile {
    const features: Record<string, boolean> = {};

    for (const feature of TRACKED_FEATURES) {
      features[feature] = this.profileHasFeature(profile, feature);
    }

    // Also infer features from the machine itself
    if (machine.rotary_axes && machine.rotary_axes.length >= 2) {
      features["5axis"] = true;
    }
    if (machine.type === "mill_turn") {
      features.mill_turn = true;
      features.turning = true;
    }
    if (machine.type === "lathe" || machine.type === "swiss" || machine.type === "vtl") {
      features.turning = true;
    }

    return {
      machine_brand: machine.brand,
      machine_model: machine.model,
      controller: machine.controller,
      machine_type: machine.type,
      matched_cps: match.matched_cps!,
      confidence: match.confidence,
      post_features: features,
      post_properties: profile.properties,
      capability_fingerprint: profile.metadata.capabilities.fingerprint,
      supports_probing: features.probing || profile.metadata.capabilities.inspection,
      supports_inspection: features.inspection || profile.metadata.capabilities.inspection,
      supports_5axis: features["5axis"],
      supports_turning: features.turning || profile.metadata.capabilities.turning,
      supports_mill_turn: features.mill_turn,
    };
  }

  /**
   * Check if a CPS profile has a specific tracked feature based on
   * its property names, groups, and capability flags.
   */
  private profileHasFeature(profile: CpsFullProfile, feature: TrackedFeature): boolean {
    const matchTokens = PROPERTY_FEATURE_MAP[feature];
    if (!matchTokens) return false;

    // Check properties
    for (const prop of profile.properties) {
      const searchText = `${prop.name} ${prop.group} ${prop.title}`.toLowerCase();
      if (matchTokens.some(tok => searchText.includes(tok.toLowerCase()))) {
        return true;
      }
    }

    // Check capabilities
    const caps = profile.metadata.capabilities;
    if (feature === "probing" && caps.inspection) return true;
    if (feature === "inspection" && caps.inspection) return true;
    if (feature === "turning" && caps.turning) return true;
    if (feature === "5axis" && caps.machineSimulation) return true;

    // Check cycle support
    if (feature === "probing" && profile.cycleSupport.hasProbing) return true;
    if (feature === "rigid_tapping" && profile.cycleSupport.hasTapping) return true;

    return false;
  }

  // ─── U04: Post Coverage Matrix ───────────────────────────────────

  /**
   * Generate a coverage matrix: rows=manufacturers, cols=features,
   * cells=count of machines covered by that feature.
   */
  private coverageMatrixAction(input: CrossRefInput): CrossRefResult {
    const cpsDir = input.cps_directory || this.defaultCpsDir;
    const cpsFiles = listCpsFiles(cpsDir);
    const profiles = this.loadCpsProfiles(cpsDir);
    const machines = EXTENDED_MACHINE_CATALOG;

    // Match all machines and collect enriched data
    const allMatches: MachinePostMatch[] = [];
    const enrichments: EnrichedMachineProfile[] = [];

    for (const machine of machines) {
      const match = this.scoreMachine(machine, cpsFiles, profiles);
      allMatches.push(match);

      if (match.matched_cps && match.confidence > 0) {
        const profile = profiles.get(match.matched_cps);
        if (profile) {
          enrichments.push(this.enrichMachine(machine, match, profile));
        }
      }
    }

    // Collect unique manufacturers from matched machines
    const mfrSet = new Set<string>();
    for (const e of enrichments) {
      mfrSet.add(e.machine_brand);
    }
    // Also include unmatched manufacturers
    for (const m of allMatches) {
      mfrSet.add(m.machine_brand);
    }
    const manufacturers = [...mfrSet].sort();

    // Build matrix
    const features = [...TRACKED_FEATURES];
    const matrix: Record<string, Record<string, number>> = {};

    for (const mfr of manufacturers) {
      matrix[mfr] = {};
      for (const feat of features) {
        matrix[mfr][feat] = 0;
      }
    }

    // Fill matrix from enriched profiles
    for (const e of enrichments) {
      for (const feat of features) {
        if (e.post_features[feat]) {
          matrix[e.machine_brand][feat] = (matrix[e.machine_brand][feat] || 0) + 1;
        }
      }
    }

    const matched = allMatches.filter(m => m.matched_cps !== null).length;
    const unmatchedCount = machines.length - matched;

    const coverageMatrix: CoverageMatrix = {
      manufacturers,
      features,
      matrix,
      total_machines: machines.length,
      matched_machines: matched,
      unmatched_machines: unmatchedCount,
      coverage_percent: machines.length > 0
        ? Math.round((matched / machines.length) * 10000) / 100
        : 0,
    };

    return {
      action: "coverage_matrix",
      matrix: coverageMatrix,
      summary: this.buildSummary(machines.length, cpsFiles.length, allMatches),
    };
  }

  // ─── CPS Profile Loader ──────────────────────────────────────────

  /**
   * Load all CPS profiles from disk using the CpsPostParserEngine's
   * parsing logic. We do a lightweight parse: read each file and extract
   * the minimal metadata + properties needed for matching.
   *
   * Caches results to avoid re-parsing on repeated calls.
   */
  private loadCpsProfiles(cpsDir: string): Map<string, CpsFullProfile> {
    if (this.profileCache) return this.profileCache;

    const cache = new Map<string, CpsFullProfile>();
    const files = listCpsFiles(cpsDir);

    for (const filename of files) {
      try {
        const filePath = path.join(cpsDir, filename);
        const content = fs.readFileSync(filePath, "utf-8");
        const profile = this.parseCpsLightweight(filename, content);
        cache.set(filename, profile);
      } catch (e) {
        log.warn(`MachinePostCrossRefEngine: Failed to parse ${filename}: ${e}`);
      }
    }

    this.profileCache = cache;
    log.info(`MachinePostCrossRefEngine: Loaded ${cache.size} CPS profiles`);
    return cache;
  }

  /**
   * Lightweight CPS parser — extracts only the fields needed for
   * cross-referencing without the full parse overhead.
   */
  private parseCpsLightweight(filename: string, content: string): CpsFullProfile {
    // Metadata extraction
    const description = this.extractString(content, /^description\s*=\s*"([^"]+)"/m) || filename;
    const vendor = this.extractString(content, /^vendor\s*=\s*"([^"]+)"/m) || "";
    const vendorUrl = this.extractString(content, /^vendorUrl\s*=\s*"([^"]+)"/m) || "";
    const legal = this.extractString(content, /^legal\s*=\s*"([^"]+)"/m) || "";
    const certLevel = this.extractNumber(content, /^certificationLevel\s*=\s*(\d+)/m) || 0;
    const ext = this.extractString(content, /^extension\s*=\s*"([^"]+)"/m) || "nc";
    const longDesc = this.extractString(content, /^longDescription\s*=\s*"([^"]+)"/m);

    // Capabilities
    const capLine = this.extractString(content, /^capabilities\s*=\s*(.+?);/m) || "";
    const hasMilling = capLine.includes("CAPABILITY_MILLING");
    const hasTurning = capLine.includes("CAPABILITY_TURNING");
    const hasSim = capLine.includes("CAPABILITY_MACHINE_SIMULATION");
    const hasInspect = capLine.includes("CAPABILITY_INSPECTION");

    // Build capability fingerprint
    const fingerParts: string[] = [];
    if (hasMilling) fingerParts.push("MILL");
    if (hasTurning) fingerParts.push("TURN");
    if (hasSim) fingerParts.push("SIM");
    if (hasInspect) fingerParts.push("INSP");

    // Properties extraction
    const properties = this.extractProperties(content);

    // Cycle support detection
    const hasDrilling = /onDrilling|CYCLE_DRILLING|cycle8[12345]/i.test(content);
    const hasTapping = /onTapping|CYCLE_TAPPING|rigidTap|syncTap/i.test(content);
    const hasBoring = /onBoring|CYCLE_BORING/i.test(content);
    const hasProbing = /onProbing|CYCLE_PROBING|measurementPath|probingType/i.test(content);
    const hasThreadMilling = /onThreadMilling|threadMill/i.test(content);

    // Detected cycles
    const detectedCycles: string[] = [];
    const cycleMatches = content.match(/(?:CYCLE|onC(?:ircular|yclePoint|annedCycle))\w*/g);
    if (cycleMatches) {
      for (const c of new Set(cycleMatches)) detectedCycles.push(c);
    }

    // G/M code extraction
    const gCodes: Record<string, string> = {};
    const gMatches = content.matchAll(/gFormat\.format\(\s*(\d+)\s*\)/g);
    for (const m of gMatches) gCodes[`G${m[1]}`] = `G${m[1]}`;

    const mCodes: Record<string, string> = {};
    const mMatches = content.matchAll(/mFormat\.format\(\s*(\d+)\s*\)/g);
    for (const m of mMatches) mCodes[`M${m[1]}`] = `M${m[1]}`;

    // High feedrate
    const hfMatch = content.match(/^highFeedrate\s*=\s*\(unit\s*==\s*MM\)\s*\?\s*([\d.]+)\s*:\s*([\d.]+)/m);
    const hfSimple = content.match(/^highFeedrate\s*=\s*([\d.]+)/m);
    const highFeedrate = hfMatch
      ? { mm: parseFloat(hfMatch[1]), inch: parseFloat(hfMatch[2]) }
      : (hfSimple ? parseFloat(hfSimple[1]) : 1000);

    return {
      metadata: {
        filename,
        description,
        vendor,
        vendorUrl,
        legal,
        certificationLevel: certLevel,
        extension: ext,
        longDescription: longDesc || undefined,
        capabilities: {
          milling: hasMilling,
          turning: hasTurning,
          machineSimulation: hasSim,
          inspection: hasInspect,
          fingerprint: fingerParts.join("+") || "UNKNOWN",
        },
        tolerances: {},
        circularLimits: {},
        helicalMoves: /allowHelicalMoves\s*=\s*true/m.test(content),
        spiralMoves: /allowSpiralMoves\s*=\s*true/m.test(content),
        highFeedrate,
        probeMultipleFeatures: /probeMultipleFeatures\s*=\s*true/m.test(content),
        programNameIsInteger: /programNameIsInteger\s*=\s*true/m.test(content) || undefined,
      },
      properties,
      formats: [],   // Not needed for cross-ref
      cycleSupport: {
        hasDrilling,
        hasTapping,
        hasBoring,
        hasProbing,
        hasThreadMilling,
        detectedCycles,
      },
      gCodes,
      mCodes,
      rawPropertyCount: properties.length,
      rawFormatCount: 0,
    };
  }

  /**
   * Extract properties from CPS content.
   * Handles the properties = { ... } block format.
   */
  private extractProperties(content: string): CpsProperty[] {
    const properties: CpsProperty[] = [];

    // Match property definitions in the properties block
    const propsBlockMatch = content.match(/properties\s*=\s*\{([\s\S]*?)\n\};/);
    if (!propsBlockMatch) return properties;

    const block = propsBlockMatch[1];

    // Each property: propertyName: { title, description, group, type, ... }
    const propRegex = /(\w+)\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = propRegex.exec(block)) !== null) {
      const name = match[1];
      const body = match[2];

      const title = this.extractString(body, /title\s*:\s*"([^"]+)"/) || name;
      const description = this.extractString(body, /description\s*:\s*"([^"]+)"/) || "";
      const group = this.extractString(body, /group\s*:\s*"([^"]+)"/) || "general";
      const typeStr = this.extractString(body, /type\s*:\s*"([^"]+)"/) || "boolean";

      // Default value detection
      let defaultValue: any = false;
      const dvMatch = body.match(/value\s*:\s*([^,\n}]+)/);
      if (dvMatch) {
        const dv = dvMatch[1].trim();
        if (dv === "true") defaultValue = true;
        else if (dv === "false") defaultValue = false;
        else if (/^\d+$/.test(dv)) defaultValue = parseInt(dv, 10);
        else if (/^[\d.]+$/.test(dv)) defaultValue = parseFloat(dv);
        else defaultValue = dv.replace(/"/g, "");
      }

      properties.push({
        name,
        title,
        description,
        group,
        type: typeStr as CpsProperty["type"],
        defaultValue,
        scope: "post",
      });
    }

    return properties;
  }

  private extractString(content: string, regex: RegExp): string | null {
    const m = content.match(regex);
    return m ? m[1] : null;
  }

  private extractNumber(content: string, regex: RegExp): number | null {
    const m = content.match(regex);
    return m ? parseInt(m[1], 10) : null;
  }

  // ─── Summary Builder ─────────────────────────────────────────────

  private buildSummary(
    totalMachines: number,
    totalCps: number,
    matches: MachinePostMatch[],
  ): CrossRefResult["summary"] {
    const matched = matches.filter(m => m.matched_cps !== null).length;
    const unmatched = totalMachines - matched;
    const confidences = matches.filter(m => m.confidence > 0).map(m => m.confidence);
    const avgConf = confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
      : 0;

    return {
      total_machines: totalMachines,
      total_cps_files: totalCps,
      matched,
      unmatched,
      coverage_percent: totalMachines > 0
        ? Math.round((matched / totalMachines) * 10000) / 100
        : 0,
      avg_confidence: avgConf,
    };
  }

  /**
   * Clear the CPS profile cache (useful when CPS files change).
   */
  clearCache(): void {
    this.profileCache = null;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────

export const machinePostCrossRefEngine = new MachinePostCrossRefEngine();
export { MachinePostCrossRefEngine };
