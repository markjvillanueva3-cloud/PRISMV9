/**
 * CADIntentDecomposerEngine — U-CADC-AI02 / CAD-COMPLETE-MS0 PHASE-30
 *
 * Parses free-form natural language CAD intents into a structured payload
 * that MasterCADControlBrainEngine (U-CADC-AI01) can orchestrate:
 *
 *   "draw a flange with 6 M8 bolt holes on a 100mm BCD in solidworks"
 *        ↓
 *   {
 *     cadSystem: "solidworks",
 *     tier: "op",
 *     operationType: "circular_pattern+hole",
 *     parameters: { diameter: 100, count: 6, threadSize: "M8", bcd: 100, units: "mm" },
 *     constraints: [],
 *     preferredBridge: "solidworks",
 *     features: [ CADFeatureIntent[] ],   // planner-ready feature tree
 *     ambiguities: [ { field, candidates, question } ],
 *     confidence: 0.82,
 *   }
 *
 * Backbone: IntentRouterEngine classification (`classifyIntent`) + CAD-
 * specific vocabulary (14 CAD systems, 14 PlannerFeatureKinds, metric+
 * imperial unit resolver, thread standard resolver).
 *
 * Unit convention:
 *   - NL may say "50mm", "2 inches", "2in", "1/4""; engine normalizes
 *     to millimetres inside `parameters` but preserves `originalUnit`
 *     + `inchView` so inch-native shops can render the inch form.
 *   - Imperial fractions (1/4, 3/8, 1/2) resolve to decimal inches
 *     before conversion.
 *
 * Ambiguity protocol:
 *   - Missing required parameter → `ambiguities[]` entry with
 *     suggested clarification question, no throw.
 *   - Multiple candidate CAD systems → rank by keyword count, tie-break
 *     with PRISM priority list (mastercam → hypercad_s → fusion360 →
 *     inventor → solidworks → freecad → others).
 *
 * Non-goals:
 *   - Actually executing the plan — that's MasterCADControlBrainEngine.
 *   - Neural-net refinement — that's the future U-CADC-NN01..06 track.
 *   - Semantic deep-parse — this is deterministic pattern+keyword; the
 *     tier above can consult MLC07 for better routing.
 *
 * @module engines/CADIntentDecomposerEngine
 */

import {
  IntentRouterEngine,
  type IntentClassification,
} from "./IntentRouterEngine.js";
import type {
  CADFeatureIntent,
  PlannerFeatureKind,
  CADIntent,
} from "./CADOperationPlannerEngine.js";
import type { CADSystemId } from "../interfaces/ICADCodeGenerator.js";

// ── Types ────────────────────────────────────────────────────────────────

/** Mapping table from NL phrase → registered CAD system id. */
const CAD_SYSTEM_KEYWORDS: ReadonlyArray<[RegExp, CADSystemId]> = [
  [/\b(solidworks|sldprt|sldasm|sw)\b/i, "solidworks"],
  [/\b(inventor\s*hsm|hsm)\b/i, "inventor_hsm"],
  [/\b(inventor|ipt|iam)\b/i, "inventor"],
  [/\b(fusion\s*360|fusion|f3d)\b/i, "fusion360"],
  [/\b(mastercam|mcam|mcx|mcx-8)\b/i, "mastercam"],
  [/\bhypermill\b/i, "hypermill"],
  [/\b(hypercad\s*-?\s*s|hypercad)\b/i, "hypercad_s"],
  [/\b(catia\s*v5|catia)\b/i, "catia_v5"],
  [/\b(freecad|fcstd)\b/i, "freecad"],
  [/\bcadquery\b/i, "cadquery"],
  [/\bcreo\b/i, "creo"],
  [/\b(siemens\s*nx|nx\s*cam|\bnx\b)\b/i, "nx"],
  [/\bonshape\b/i, "onshape"],
  [/\brhino(ceros)?\b/i, "rhino"],
];

/** Priority tie-break order when several CADs match equally. */
const CAD_PRIORITY: ReadonlyArray<CADSystemId> = [
  "mastercam",
  "hypercad_s",
  "fusion360",
  "inventor",
  "solidworks",
  "freecad",
  "cadquery",
  "hypermill",
  "inventor_hsm",
  "catia_v5",
  "creo",
  "nx",
  "onshape",
  "rhino",
];

/** Vocabulary for each planner feature kind. */
const FEATURE_KEYWORDS: ReadonlyArray<[RegExp, PlannerFeatureKind]> = [
  [/\b(rect(angular|angle)?\s*(extrude|boss|pad)|box\s*extrude)\b/i, "rectangle_extrude"],
  [/\b(circle\s*extrude|circular\s*boss|cylinder|cyl\.? extrude|round\s*pad)\b/i, "circle_extrude"],
  [/\b(rect(angular|angle)?\s*pocket|slot\s*pocket|rect\s*cut)\b/i, "rectangle_pocket"],
  [/\b(circle\s*pocket|circular\s*pocket|round\s*pocket|cbore)\b/i, "circle_pocket"],
  [/\b(drill(ed)?|thr(u|ough)\s*holes?|holes?|bores?|bolt\s*holes?)\b/i, "hole"],
  [/\b(fillet|round(\s*edges?)?)\b/i, "fillet_edges"],
  [/\b(chamfer|break\s*edge)\b/i, "chamfer_edges"],
  [/\b(revolve|rotation[- ]extrude|lathe)\b/i, "revolve_rectangle"],
  [/\b(shell|hollow|thinwall)\b/i, "shell"],
  [/\b(linear\s*pattern|array|linear\s*array|row\s*of)\b/i, "linear_pattern"],
  [/\b(circular\s*pattern|bolt\s*circle|bcd|circular\s*array|around\s*a\s*circle)\b/i, "circular_pattern"],
  [/\b(union|combine|add\s*bodies)\b/i, "boolean_union"],
  [/\b(subtract|cut\s*bodies|remove\s*body)\b/i, "boolean_subtract"],
  [/\bexport\s*(step|stp|ap242)\b/i, "export_step"],
];

/** Tier-level NL hints. */
const TIER_KEYWORDS: ReadonlyArray<[RegExp, "op" | "part" | "assembly"]> = [
  [/\b(assembly|asm|bom|mate|mating|assemble|subassembly)\b/i, "assembly"],
  [/\b(multi[- ]?body|multi[- ]?config(uration)?|complex\s*part|variant)\b/i, "part"],
];

/** Material name patterns (canonical → normalized key). */
const MATERIAL_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\b6061[- ]?t?6?\b/i, "AL6061"],
  [/\b7075[- ]?t?6?\b/i, "AL7075"],
  [/\b4140\b/i, "4140"],
  [/\b1018\b/i, "1018"],
  [/\b303\s*(stainless)?\b/i, "SS303"],
  [/\b304\s*(stainless)?\b/i, "SS304"],
  [/\b316\s*(stainless)?\b/i, "SS316"],
  [/\b17[-\s]?4\s*ph\b/i, "17-4PH"],
  [/\b(d2\s*tool\s*steel|d2)\b/i, "D2"],
  [/\b(m2\s*tool\s*steel|m2)\b/i, "M2"],
  [/\b(a2\s*tool\s*steel|a2)\b/i, "A2"],
  [/\b(s7\s*tool\s*steel|s7)\b/i, "S7"],
  [/\b(h13)\b/i, "H13"],
  [/\b(ti[- ]?6al[- ]?4v|grade\s*5\s*ti|titanium)\b/i, "Ti6Al4V"],
  [/\b(inconel\s*718|in718)\b/i, "IN718"],
  [/\b(brass|c360)\b/i, "C360"],
  [/\b(copper|c110)\b/i, "C110"],
  [/\b(graphite)\b/i, "GRAPHITE"],
];

/** Thread size patterns — metric + imperial. */
const THREAD_PATTERNS: ReadonlyArray<RegExp> = [
  /\bM(\d+(?:\.\d+)?)\b/, // M8, M8.5
  /\b(\d+\/\d+)\s*-\s*(\d+)\b/, // 1/4-20, 3/8-16
  /\b#(\d+)\s*-\s*(\d+)\b/, // #10-32
];

// ── Public types ─────────────────────────────────────────────────────────

export type DecomposerTier = "op" | "part" | "assembly";

/** One unresolved question the caller should ask the user. */
export interface Ambiguity {
  /** Field that's missing or under-specified. */
  field: string;
  /** Candidate values the decomposer considered, if any. */
  candidates?: ReadonlyArray<string>;
  /** A plain-English clarification prompt. */
  question: string;
  /** Severity — "blocker" means we cannot plan without it. */
  severity: "blocker" | "soft";
}

/** Parameters extracted from the NL input. */
export interface DecomposedParameters {
  /** Quantity hint — "6 holes" → 6. */
  count?: number;
  /** Primary diameter (hole Ø, BCD, etc.) in mm. */
  diameter_mm?: number;
  /** Primary length/width (rectangle extrude) in mm. */
  length_mm?: number;
  width_mm?: number;
  /** Height / depth / thickness in mm. */
  height_mm?: number;
  /** Bolt-circle diameter in mm. */
  bcd_mm?: number;
  /** Thread designation as written (M8, 1/4-20). */
  threadSize?: string;
  /** Material key (AL6061, D2, ...). */
  material?: string;
  /** Any dimensional tolerance like "±0.01mm" / "±0.001in". */
  tolerance?: string;
  /** "mm" or "in" — what the user originally wrote. */
  originalUnit: "mm" | "in";
  /** Inch mirror of the mm values, for inch-native display. */
  inchView?: {
    diameter_in?: number;
    length_in?: number;
    width_in?: number;
    height_in?: number;
    bcd_in?: number;
  };
  /** Catch-all for downstream consumers (raw NL tokens). */
  extras?: Record<string, unknown>;
}

/** The full decomposer output. */
export interface DecomposedCADIntent {
  /** Echo of the raw NL. */
  rawInput: string;
  /** The tier the planner should use. */
  tier: DecomposerTier;
  /** Target CAD system (or "auto" when no keyword resolved). */
  cadSystem: CADSystemId | "auto";
  /** Operation type label (planner feature kind or compound). */
  operationType: string;
  /** Structured parameters (canonical mm). */
  parameters: DecomposedParameters;
  /** Non-dimensional constraints ("material D2", "tolerance ±0.001in"). */
  constraints: ReadonlyArray<string>;
  /** Preferred adapter bridge (mirrors cadSystem unless overridden). */
  preferredBridge: CADSystemId | "auto";
  /** Planner-ready feature tree (may be empty for assembly tier). */
  features: ReadonlyArray<CADFeatureIntent>;
  /** A ready-to-feed CADIntent when tier = "op". null otherwise. */
  opIntent: CADIntent | null;
  /** Remaining ambiguities — non-empty means ask the user. */
  ambiguities: ReadonlyArray<Ambiguity>;
  /** Overall confidence 0..1. */
  confidence: number;
  /** Intent classification from IntentRouterEngine. */
  classification: IntentClassification;
}

// ── Engine ───────────────────────────────────────────────────────────────

/**
 * CAD-specific NL intent parser. Deterministic pattern-based — feeds the
 * master AI brain (U-CADC-AI01) so it knows what CAD to target, what
 * feature to build, and which bits the user left blank.
 */
export class CADIntentDecomposerEngine {
  private readonly router: IntentRouterEngine;

  constructor(router?: IntentRouterEngine) {
    this.router = router ?? new IntentRouterEngine();
  }

  /** Main entry point. */
  decompose(input: string, nameHint?: string): DecomposedCADIntent {
    if (typeof input !== "string" || input.trim().length === 0) {
      throw new Error("CADIntentDecomposerEngine.decompose: non-empty input required");
    }
    const raw = input.trim();

    const classification = this.router.classifyIntent(raw);
    const cadSystem = this.detectCADSystem(raw);
    const tier = this.detectTier(raw);
    const originalUnit = this.detectUnit(raw);
    const parameters = this.extractParameters(raw, originalUnit);
    const featureKinds = this.detectFeatureKinds(raw);
    const material = this.detectMaterial(raw);
    if (material) parameters.material = material;
    const threadSize = this.detectThread(raw);
    if (threadSize) parameters.threadSize = threadSize;
    const tolerance = this.detectTolerance(raw);
    if (tolerance) parameters.tolerance = tolerance;

    const constraints = this.buildConstraints(parameters);
    const operationType = this.summarizeOperation(featureKinds);
    const features = this.buildFeatures(featureKinds, parameters, nameHint);
    const ambiguities = this.detectAmbiguities(raw, {
      cadSystem,
      tier,
      featureKinds,
      parameters,
    });

    const opIntent: CADIntent | null =
      tier === "op" && cadSystem !== "auto" && features.length > 0
        ? {
            name: nameHint ?? this.deriveName(operationType, parameters),
            cadSystem,
            units: originalUnit === "in" ? "in" : "mm",
            features,
          }
        : null;

    const confidence = this.scoreConfidence({
      cadSystem,
      tier,
      featureKinds,
      ambiguities,
      classification,
    });

    return {
      rawInput: raw,
      tier,
      cadSystem,
      operationType,
      parameters,
      constraints,
      preferredBridge: cadSystem,
      features,
      opIntent,
      ambiguities,
      confidence,
      classification,
    };
  }

  /** Exposed for tests — single-shot CAD system detection. */
  detectCADSystem(input: string): CADSystemId | "auto" {
    const hits: CADSystemId[] = [];
    for (const [rx, id] of CAD_SYSTEM_KEYWORDS) {
      if (rx.test(input) && !hits.includes(id)) hits.push(id);
    }
    if (hits.length === 0) return "auto";
    // Specificity promotion — a more specialized variant should not lose
    // to its generic sibling just because the priority list happens to
    // rank the generic one higher (e.g. "inventor" vs "inventor_hsm").
    if (hits.includes("inventor_hsm")) {
      const idx = hits.indexOf("inventor");
      if (idx >= 0) hits.splice(idx, 1);
    }
    if (hits.length === 1) return hits[0]!;
    // Tie-break by PRISM priority.
    for (const id of CAD_PRIORITY) {
      if (hits.includes(id)) return id;
    }
    return hits[0]!;
  }

  /** Exposed for tests — detect tier from NL. */
  detectTier(input: string): DecomposerTier {
    for (const [rx, tier] of TIER_KEYWORDS) {
      if (rx.test(input)) return tier;
    }
    return "op";
  }

  /** Exposed for tests — unit convention. */
  detectUnit(input: string): "mm" | "in" {
    // "in" patterns beat "mm" if inch tokens are present anywhere.
    if (/\b\d+(?:\.\d+)?\s*(inch(es)?|in\b|")/i.test(input)) return "in";
    if (/\b\d+\/\d+\s*(inch(es)?|in\b|")/i.test(input)) return "in";
    if (/\b\d+(?:\.\d+)?\s*(mm|millimet(er|re)s?)/i.test(input)) return "mm";
    return "mm"; // default
  }

  /** Exposed for tests — feature kind list in parse order. */
  detectFeatureKinds(input: string): PlannerFeatureKind[] {
    const hits: PlannerFeatureKind[] = [];
    for (const [rx, kind] of FEATURE_KEYWORDS) {
      if (rx.test(input) && !hits.includes(kind)) hits.push(kind);
    }
    return hits;
  }

  /** Exposed for tests — material normalization. */
  detectMaterial(input: string): string | undefined {
    for (const [rx, key] of MATERIAL_PATTERNS) {
      if (rx.test(input)) return key;
    }
    return undefined;
  }

  /** Exposed for tests — thread resolver. */
  detectThread(input: string): string | undefined {
    // Metric first: \bM(\d+) ... avoid matching "Mastercam".
    const metric = input.match(/\bM(\d+(?:\.\d+)?)(?:\s*x\s*(\d+(?:\.\d+)?))?\b/);
    if (metric) {
      // Guard: "Mastercam" would match M+digits? No — \d required; still sanity check.
      const around = input.slice(Math.max(0, metric.index! - 1), metric.index! + metric[0].length + 1);
      if (!/masterca/i.test(around)) {
        return metric[2] ? `M${metric[1]}x${metric[2]}` : `M${metric[1]}`;
      }
    }
    const imp = input.match(/\b(\d+\/\d+)\s*-\s*(\d+)\b/);
    if (imp) return `${imp[1]}-${imp[2]}`;
    const num = input.match(/(?:^|[^\w#])#(\d+)\s*-\s*(\d+)\b/);
    if (num) return `#${num[1]}-${num[2]}`;
    return undefined;
  }

  /** Exposed for tests — tolerance strings like "±0.01mm" or "+/- .005". */
  detectTolerance(input: string): string | undefined {
    const tol = input.match(
      /(?:±|\+\/?-|plus\s*or\s*minus)\s*(\d*\.?\d+)\s*(mm|in|inch(?:es)?|")?/i,
    );
    if (tol) {
      const unit = tol[2] ? tol[2].replace(/inch(es)?|"/i, "in") : "mm";
      return `±${tol[1]}${unit}`;
    }
    return undefined;
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  /** Extract dimensional params from NL, all normalized to mm. */
  private extractParameters(input: string, unit: "mm" | "in"): DecomposedParameters {
    const params: DecomposedParameters = { originalUnit: unit };

    // Quantity: "6 holes", "4 pockets", "12x", "6 M8 bolt holes", "8 copies"
    const qty = input.match(
      /\b(\d+)\s+(?:\w+\s+){0,4}?(holes|pockets|slots|bolts|bosses|cuts|copies|parts|mates|variants)\b/i,
    );
    if (qty) params.count = parseInt(qty[1]!, 10);
    const qtyAlt = input.match(/\b(\d+)\s*(?:of|×|x)\b/i);
    if (!params.count && qtyAlt) params.count = parseInt(qtyAlt[1]!, 10);

    // BCD — "100mm BCD", "bolt circle of 3.5 inches", "BCD 4.0"
    const bcd1 = input.match(/\b(\d+(?:\.\d+)?)\s*(mm|in|inch(?:es)?|")\s*(?:BCD|bolt\s*circle)/i);
    const bcd2 = input.match(/\b(?:BCD|bolt\s*circle)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(mm|in|inch(?:es)?|")?/i);
    const bcdMatch = bcd1 ?? bcd2;
    if (bcdMatch) {
      const val = parseFloat(bcdMatch[1]!);
      const u = (bcdMatch[2] ?? unit).toLowerCase();
      params.bcd_mm = this.toMM(val, u);
    }

    // Diameter: "Ø50mm", "50mm dia", "diameter 2in", "50mm hole", "1/4" hole"
    const dia = input.match(
      /(?:Ø|diameter|dia\.?)\s*(\d+(?:\.\d+)?(?:\/\d+)?)\s*(mm|in|inch(?:es)?|")?/i,
    );
    const diaAlt = input.match(/\b(\d+(?:\.\d+)?)\s*(mm|in|inch(?:es)?|")\s*(?:dia|Ø|diameter)/i);
    // "drill a <N><unit> hole|bore" — dimension directly before the noun.
    const diaHole = input.match(
      /\b(\d+(?:\.\d+)?)\s*(mm|in|inch(?:es)?|")\s*(?:hole|bore|pocket|diameter|dia)\b/i,
    );
    // Fraction-inch form: 1/4" hole, 3/8in hole
    const diaFrac = input.match(
      /\b(\d+\/\d+)\s*(in|inch(?:es)?|")\s*(?:hole|bore|pocket|diameter|dia)\b/i,
    );
    // Fraction match must come first so "1/4\"" doesn't degrade to "4\"".
    const diaMatch = diaFrac ?? dia ?? diaAlt ?? diaHole;
    if (diaMatch && params.diameter_mm === undefined) {
      const val = this.parseNumeric(diaMatch[1]!);
      const u = (diaMatch[2] ?? unit).toLowerCase();
      params.diameter_mm = this.toMM(val, u);
    }

    // Rectangle L x W x H — "100x50x10mm"
    const lwh = input.match(
      /\b(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)(?:\s*(?:x|×)\s*(\d+(?:\.\d+)?))?\s*(mm|in|inch(?:es)?|")?/i,
    );
    if (lwh) {
      const u = (lwh[4] ?? unit).toLowerCase();
      params.length_mm = this.toMM(parseFloat(lwh[1]!), u);
      params.width_mm = this.toMM(parseFloat(lwh[2]!), u);
      if (lwh[3]) params.height_mm = this.toMM(parseFloat(lwh[3]!), u);
    }

    // Height / depth / thickness keyword
    const depth = input.match(
      /\b(?:depth|deep|height|tall|thick|thickness)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(mm|in|inch(?:es)?|")?/i,
    );
    if (depth && params.height_mm === undefined) {
      const u = (depth[2] ?? unit).toLowerCase();
      params.height_mm = this.toMM(parseFloat(depth[1]!), u);
    }

    // Build inch mirror when any mm value is set.
    if (
      params.diameter_mm !== undefined ||
      params.length_mm !== undefined ||
      params.width_mm !== undefined ||
      params.height_mm !== undefined ||
      params.bcd_mm !== undefined
    ) {
      params.inchView = {
        diameter_in: toInchRound(params.diameter_mm),
        length_in: toInchRound(params.length_mm),
        width_in: toInchRound(params.width_mm),
        height_in: toInchRound(params.height_mm),
        bcd_in: toInchRound(params.bcd_mm),
      };
      // Drop undefined keys so the view is tidy.
      for (const k of Object.keys(params.inchView) as (keyof typeof params.inchView)[]) {
        if (params.inchView![k] === undefined) delete params.inchView![k];
      }
    }

    return params;
  }

  private parseNumeric(raw: string): number {
    if (raw.includes("/")) {
      const [n, d] = raw.split("/").map((s) => parseFloat(s));
      if (Number.isFinite(n) && Number.isFinite(d) && d !== 0) return n! / d!;
    }
    return parseFloat(raw);
  }

  private toMM(value: number, unit: string): number {
    const u = unit.toLowerCase().replace(/inch(es)?|"/, "in");
    if (u === "in") return round3(value * 25.4);
    return round3(value);
  }

  private buildConstraints(p: DecomposedParameters): string[] {
    const c: string[] = [];
    if (p.material) c.push(`material ${p.material}`);
    if (p.tolerance) c.push(`tolerance ${p.tolerance}`);
    if (p.threadSize) c.push(`thread ${p.threadSize}`);
    return c;
  }

  private summarizeOperation(kinds: ReadonlyArray<PlannerFeatureKind>): string {
    if (kinds.length === 0) return "unknown";
    if (kinds.length === 1) return kinds[0]!;
    return kinds.join("+");
  }

  private buildFeatures(
    kinds: ReadonlyArray<PlannerFeatureKind>,
    p: DecomposedParameters,
    _nameHint: string | undefined,
  ): CADFeatureIntent[] {
    const out: CADFeatureIntent[] = [];
    let i = 0;
    for (const kind of kinds) {
      const id = `f${++i}_${kind}`;
      const params: Record<string, unknown> = {};
      switch (kind) {
        case "rectangle_extrude":
        case "rectangle_pocket":
          if (p.length_mm !== undefined) params["length"] = p.length_mm;
          if (p.width_mm !== undefined) params["width"] = p.width_mm;
          if (p.height_mm !== undefined) params["height"] = p.height_mm;
          break;
        case "circle_extrude":
        case "circle_pocket":
        case "hole":
          if (p.diameter_mm !== undefined) params["diameter"] = p.diameter_mm;
          if (p.height_mm !== undefined) params["depth"] = p.height_mm;
          if (p.threadSize) params["thread"] = p.threadSize;
          break;
        case "circular_pattern":
          if (p.count !== undefined) params["count"] = p.count;
          if (p.bcd_mm !== undefined) params["bcd"] = p.bcd_mm;
          break;
        case "linear_pattern":
          if (p.count !== undefined) params["count"] = p.count;
          if (p.length_mm !== undefined) params["pitch"] = p.length_mm;
          break;
        case "revolve_rectangle":
          if (p.length_mm !== undefined) params["length"] = p.length_mm;
          if (p.width_mm !== undefined) params["width"] = p.width_mm;
          break;
        case "fillet_edges":
        case "chamfer_edges":
          // Radius/size not separately tracked yet — pass a reasonable hint.
          if (p.height_mm !== undefined) params["size"] = p.height_mm;
          break;
        case "shell":
          if (p.height_mm !== undefined) params["thickness"] = p.height_mm;
          break;
        case "boolean_union":
        case "boolean_subtract":
        case "export_step":
          break;
      }
      out.push({ id, kind, params });
    }
    return out;
  }

  private detectAmbiguities(
    _raw: string,
    ctx: {
      cadSystem: CADSystemId | "auto";
      tier: DecomposerTier;
      featureKinds: ReadonlyArray<PlannerFeatureKind>;
      parameters: DecomposedParameters;
    },
  ): Ambiguity[] {
    const a: Ambiguity[] = [];

    if (ctx.cadSystem === "auto") {
      a.push({
        field: "cadSystem",
        candidates: ["mastercam", "fusion360", "solidworks", "freecad"],
        question:
          "Which CAD system should we target? (mastercam, fusion360, solidworks, freecad, ...)",
        severity: "soft", // masterCAD can auto-resolve
      });
    }

    if (ctx.featureKinds.length === 0) {
      a.push({
        field: "operationType",
        question:
          "What feature should we build? (hole, extrude, pocket, fillet, pattern, ...)",
        severity: "blocker",
      });
    }

    // Feature-specific dim requirements
    for (const k of ctx.featureKinds) {
      if (k === "hole" && ctx.parameters.diameter_mm === undefined) {
        a.push({
          field: "diameter",
          question: "What hole diameter?",
          severity: "blocker",
        });
      }
      if (
        (k === "rectangle_extrude" || k === "rectangle_pocket") &&
        (ctx.parameters.length_mm === undefined ||
          ctx.parameters.width_mm === undefined)
      ) {
        a.push({
          field: "dimensions",
          question: "What length × width for the rectangle?",
          severity: "blocker",
        });
      }
      if (k === "circular_pattern" && ctx.parameters.count === undefined) {
        a.push({
          field: "count",
          question: "How many copies in the pattern?",
          severity: "blocker",
        });
      }
    }

    return a;
  }

  private scoreConfidence(ctx: {
    cadSystem: CADSystemId | "auto";
    tier: DecomposerTier;
    featureKinds: ReadonlyArray<PlannerFeatureKind>;
    ambiguities: ReadonlyArray<Ambiguity>;
    classification: IntentClassification;
  }): number {
    let s = 0.4;
    if (ctx.cadSystem !== "auto") s += 0.15;
    if (ctx.featureKinds.length > 0) s += 0.2;
    if (ctx.featureKinds.length > 1) s += 0.05;
    if (ctx.tier !== "op") s += 0.05;
    const blockers = ctx.ambiguities.filter((x) => x.severity === "blocker").length;
    s -= blockers * 0.1;
    s += Math.min(0.15, ctx.classification.confidence * 0.15);
    return Math.max(0, Math.min(1, Number(s.toFixed(3))));
  }

  private deriveName(op: string, p: DecomposedParameters): string {
    const parts: string[] = ["part", op.replace(/[^a-z0-9]+/gi, "_")];
    if (p.material) parts.push(p.material);
    if (p.diameter_mm !== undefined) parts.push(`d${p.diameter_mm}`);
    if (p.count !== undefined) parts.push(`n${p.count}`);
    return parts.join("_").toLowerCase();
  }
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function toInchRound(mm: number | undefined): number | undefined {
  if (mm === undefined) return undefined;
  return Math.round((mm / 25.4) * 10000) / 10000;
}

export const cadIntentDecomposerEngine = new CADIntentDecomposerEngine();
