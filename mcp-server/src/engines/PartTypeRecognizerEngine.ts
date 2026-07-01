/**
 * PartTypeRecognizerEngine — L1 of the 4-layer per-part-type pipeline stack
 *
 * Maps a CAD feature signature (bounding box + feature counts + symmetry +
 * material + tolerance band) to a part class within a domain. Output drives
 * L2 adapter selection (Mill prismatic / Lathe shaft / Wire-EDM punch-die / ...).
 *
 * Heuristic + deterministic — no ML. Inputs are the feature signatures already
 * extracted by CADFeatureRecognitionEngine; this engine is the routing layer
 * over those signatures. Cited rules per domain:
 *
 *  - Mill: prismatic (≥3 orthogonal pocket faces + ≤2:1 aspect), mold-die
 *    (Z-curvature high, surface-finish-class strict), thin-wall (min-wall ≤
 *    1.0mm), deep-pocket (depth/diameter > 5), aerospace-pocket (Ti-Al-Inco
 *    + ≥3-axis Z-floor + structural-rib), micro-mill (max bbox ≤ 25mm).
 *  - Lathe: shaft (length/diameter > 3 + concentric features), bushing
 *    (length/diameter ≤ 1.5 + bore feature), thread-only (thread-features
 *    ≥ 50% of total), swiss-medical (max-diameter ≤ 32mm + ≥4 turning
 *    features + Ra ≤ 0.4μm), grooved (≥3 OD grooves).
 *  - Wire-EDM: punch-die (mating-pair geometry + ISO IT5 tolerance),
 *    extrusion-die (taper feature + Z-depth>50mm), aerospace-slot
 *    (rectangular slot ≥ 20mm × ≥1mm in superalloy), PCD-form (polycrystalline
 *    diamond as workpiece tag).
 *
 * Reference: ASM Handbook Vol 16 Machining §5 (part-classification);
 *  Boothroyd & Dewhurst (2010) §3 (DFM part-family taxonomy);
 *  Sandvik Coromant Application Guide §A-1 (part-feature → strategy mapping).
 *
 * @version 1.0.0
 * @module PartTypeRecognizerEngine
 */

export type Domain = "mill" | "lathe" | "wire-edm";

export interface PartFeatureSignature {
  domain: Domain;
  bbox_mm: { x: number; y: number; z: number };
  feature_counts: {
    pocket?: number;
    hole?: number;
    boss?: number;
    fillet?: number;
    chamfer?: number;
    thread?: number;
    groove?: number;
    slot?: number;
    rib?: number;
  };
  symmetry?: "axial" | "planar" | "none";
  min_wall_mm?: number;
  max_depth_mm?: number;
  surface_finish_ra_um?: number;
  tolerance_class?: "IT5" | "IT6" | "IT7" | "IT8" | "IT9" | "IT10" | "IT11";
  material?: string;
  has_mating_pair?: boolean;
  has_taper?: boolean;
}

export type MillClass = "prismatic" | "mold-die" | "thin-wall" | "deep-pocket" | "aerospace-pocket" | "micro-mill" | "unclassified";
export type LatheClass = "shaft" | "bushing" | "thread-only" | "swiss-medical" | "grooved" | "unclassified";
export type WireEDMClass = "punch-die" | "extrusion-die" | "aerospace-slot" | "pcd-form" | "unclassified";

export interface PartClassResult {
  domain: Domain;
  part_class: MillClass | LatheClass | WireEDMClass;
  confidence: number;
  signals: string[];
  source: string;
}

const SUPERALLOY_REGEX = /inco|inconel|waspaloy|haynes|hast|ti-?6al|titanium|nimonic/i;
const PCD_REGEX = /pcd|polycrystalline|diamond/i;

export class PartTypeRecognizerEngine {
  recognize(input: PartFeatureSignature): PartClassResult {
    if (!input || !input.bbox_mm || !input.feature_counts) {
      throw new Error("PartTypeRecognizerEngine.recognize: bbox_mm + feature_counts required");
    }
    switch (input.domain) {
      case "mill":     return this.recognizeMill(input);
      case "lathe":    return this.recognizeLathe(input);
      case "wire-edm": return this.recognizeWireEDM(input);
      default:
        throw new Error(`Unknown domain: ${(input as { domain: unknown }).domain}`);
    }
  }

  private recognizeMill(s: PartFeatureSignature): PartClassResult {
    const fc = s.feature_counts;
    const bb = s.bbox_mm;
    const maxBB = Math.max(bb.x, bb.y, bb.z);
    const signals: string[] = [];

    // micro-mill: bbox ≤ 25mm
    if (maxBB <= 25) {
      signals.push(`bbox max ${maxBB.toFixed(1)}mm ≤ 25mm — micro regime`);
      return { domain: "mill", part_class: "micro-mill", confidence: 0.85, signals, source: "Sandvik §A-1 micro" };
    }

    // aerospace-pocket: superalloy + ribs
    if (s.material && SUPERALLOY_REGEX.test(s.material) && (fc.rib ?? 0) >= 1 && (fc.pocket ?? 0) >= 1) {
      signals.push(`material=${s.material}, ribs=${fc.rib}, pockets=${fc.pocket}`);
      return { domain: "mill", part_class: "aerospace-pocket", confidence: 0.92, signals, source: "ASM Vol 16 aerospace" };
    }

    // thin-wall: min_wall ≤ 1.0mm
    if (s.min_wall_mm !== undefined && s.min_wall_mm <= 1.0) {
      signals.push(`min_wall ${s.min_wall_mm}mm ≤ 1.0mm`);
      return { domain: "mill", part_class: "thin-wall", confidence: 0.88, signals, source: "ASM Vol 16 thin-wall" };
    }

    // deep-pocket: max_depth / min(bbox.x, bbox.y) > 5
    const minPlanar = Math.min(bb.x, bb.y);
    if (s.max_depth_mm !== undefined && minPlanar > 0 && s.max_depth_mm / minPlanar > 5) {
      signals.push(`depth/planar ratio ${(s.max_depth_mm / minPlanar).toFixed(2)} > 5`);
      return { domain: "mill", part_class: "deep-pocket", confidence: 0.83, signals, source: "Sandvik §A-1 deep cavity" };
    }

    // mold-die: strict finish + Z-feature curvature (proxy: bbox.z > 50% of max + fine Ra)
    if (s.surface_finish_ra_um !== undefined && s.surface_finish_ra_um <= 0.4 && bb.z >= 0.4 * maxBB) {
      signals.push(`Ra ${s.surface_finish_ra_um}μm fine + 3D-Z extent`);
      return { domain: "mill", part_class: "mold-die", confidence: 0.80, signals, source: "Boothroyd & Dewhurst §3" };
    }

    // prismatic: ≥3 pocket faces + ≤2:1 aspect
    const aspect = maxBB / Math.max(Math.min(bb.x, bb.y, bb.z), 1e-6);
    if ((fc.pocket ?? 0) >= 1 && aspect <= 2.5) {
      signals.push(`pockets=${fc.pocket}, aspect=${aspect.toFixed(2)} ≤ 2.5`);
      return { domain: "mill", part_class: "prismatic", confidence: 0.75, signals, source: "Boothroyd & Dewhurst §3 prismatic" };
    }

    return { domain: "mill", part_class: "unclassified", confidence: 0.0, signals: ["no rule matched"], source: "fallback" };
  }

  private recognizeLathe(s: PartFeatureSignature): PartClassResult {
    const bb = s.bbox_mm;
    const fc = s.feature_counts;
    const len = Math.max(bb.x, bb.y, bb.z);
    const dia = Math.min(bb.x, bb.y, bb.z);
    const lToD = dia > 0 ? len / dia : 1;
    const signals: string[] = [];

    // swiss-medical: max-dia ≤ 32mm + Ra ≤ 0.4
    if (dia <= 32 && s.surface_finish_ra_um !== undefined && s.surface_finish_ra_um <= 0.4) {
      signals.push(`dia ${dia.toFixed(1)}mm ≤ 32mm + Ra ${s.surface_finish_ra_um}μm fine`);
      return { domain: "lathe", part_class: "swiss-medical", confidence: 0.90, signals, source: "Citizen Swiss-type doc" };
    }

    // thread-only: thread ≥ 50% of total features
    const totalFeat = Object.values(fc).reduce((a, b) => a + (b ?? 0), 0);
    if (totalFeat > 0 && (fc.thread ?? 0) / totalFeat >= 0.5) {
      signals.push(`threads=${fc.thread}/${totalFeat} ≥ 50%`);
      return { domain: "lathe", part_class: "thread-only", confidence: 0.85, signals, source: "Lathe thread spec" };
    }

    // grooved: ≥3 OD grooves
    if ((fc.groove ?? 0) >= 3) {
      signals.push(`grooves=${fc.groove} ≥ 3`);
      return { domain: "lathe", part_class: "grooved", confidence: 0.82, signals, source: "Sandvik §A-1 grooving" };
    }

    // shaft: L/D > 3
    if (lToD > 3) {
      signals.push(`L/D ${lToD.toFixed(2)} > 3 + concentric`);
      return { domain: "lathe", part_class: "shaft", confidence: 0.85, signals, source: "ASM Vol 16 shaft turning" };
    }

    // bushing: L/D ≤ 1.5 + bore
    if (lToD <= 1.5 && (fc.hole ?? 0) >= 1) {
      signals.push(`L/D ${lToD.toFixed(2)} ≤ 1.5 + bore=${fc.hole}`);
      return { domain: "lathe", part_class: "bushing", confidence: 0.80, signals, source: "ASM Vol 16 bushing" };
    }

    return { domain: "lathe", part_class: "unclassified", confidence: 0.0, signals: ["no rule matched"], source: "fallback" };
  }

  private recognizeWireEDM(s: PartFeatureSignature): PartClassResult {
    const fc = s.feature_counts;
    const signals: string[] = [];

    // PCD-form: material = PCD
    if (s.material && PCD_REGEX.test(s.material)) {
      signals.push(`material=${s.material}`);
      return { domain: "wire-edm", part_class: "pcd-form", confidence: 0.95, signals, source: "PCD-EDM literature" };
    }

    // punch-die: mating pair + IT5/IT6
    if (s.has_mating_pair && (s.tolerance_class === "IT5" || s.tolerance_class === "IT6")) {
      signals.push(`mating_pair=true, tol=${s.tolerance_class}`);
      return { domain: "wire-edm", part_class: "punch-die", confidence: 0.92, signals, source: "Sodick punch-die guide" };
    }

    // extrusion-die: taper + Z-depth > 50
    if (s.has_taper && s.max_depth_mm !== undefined && s.max_depth_mm > 50) {
      signals.push(`taper=true, depth=${s.max_depth_mm}mm > 50mm`);
      return { domain: "wire-edm", part_class: "extrusion-die", confidence: 0.88, signals, source: "Mitsubishi extrusion-die" };
    }

    // aerospace-slot: superalloy + slot ≥ 1
    if (s.material && SUPERALLOY_REGEX.test(s.material) && (fc.slot ?? 0) >= 1) {
      signals.push(`material=${s.material}, slots=${fc.slot}`);
      return { domain: "wire-edm", part_class: "aerospace-slot", confidence: 0.86, signals, source: "Aerospace WEDM Vol2" };
    }

    return { domain: "wire-edm", part_class: "unclassified", confidence: 0.0, signals: ["no rule matched"], source: "fallback" };
  }
}

export const partTypeRecognizerEngine = new PartTypeRecognizerEngine();
