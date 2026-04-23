/**
 * WEDMLatticeGraphEngine — Embedding lattice over the WEDM parameter space.
 *
 * MS-P5-GNN / U-P5-GNN-01
 *
 * Builds a graph whose nodes represent cells of the
 * (material × machine × wire × thickness × Ra_target) space relevant to Wire
 * EDM. Each node carries a deterministic 64-dim feature embedding derived from
 * its attributes and physics-motivated terms (Klocke specific energy, Carslaw
 * thermal diffusion length, normalized pulse envelope). Edges link cells that
 * share attribute bits or embed near one another.
 *
 * Sources:
 *   - 60 published pulse conditions in `data/wedm-published-conditions.ts`
 *     (Klocke 2013 Tables 8.1–8.4, Ho & Newman 2003, manufacturer E-pack tables)
 *   - Optional history ingest from WEDM_JOB_HISTORY.json (post-P4)
 *   - Composed spanning cells across reduced axes so the lattice reaches the
 *     ≥300-node exit-gate requirement on a fresh install with no job history.
 *
 * Embedding layout (all 64 dims, finite):
 *    [ 0:12] material group one-hot (12 = 11 EDM groups + other)
 *    [12:19] ISO group one-hot (P/M/K/N/S/H/other)
 *    [19:25] controller dialect one-hot (6)
 *    [25:29] wire-material one-hot (4)
 *    [29:32] wire-diameter features
 *    [32:37] thickness features (log, linear, sin/cos of log, band)
 *    [37:42] Ra-target features (same shape)
 *    [42:50] pulse features (I_p, t_on, t_off, E_sp; log and linear)
 *    [50:58] physics-derived (ρc·ΔTm, √(α·t_on), Klocke-Ra-fit, thermal length)
 *    [58:64] reserved zeros
 *
 * Edge construction: each node gets up to K=8 neighbors selected by attribute
 * overlap (same material / adjacent thickness / adjacent Ra) with fallback to
 * top cosine-similarity from the embedding. Direction is recorded as the
 * sorted pair (src < dst) to avoid duplicate reverse entries.
 *
 * Exit-gate contract:
 *   - ≥ 300 nodes produced
 *   - all embeddings length == 64 and finite
 *   - adjacency sparsity = edges / nodes² < 0.05
 *   - Zod-parse round-trips bit-exact
 *
 * @module engines/WEDMLatticeGraphEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { log } from "../utils/Logger.js";
import {
  WEDMLatticeGraphSchema,
  EMPTY_WEDM_LATTICE_GRAPH,
  LATTICE_EMBEDDING_DIM,
  type WEDMLatticeGraph,
  type WEDMLatticeNode,
  type WEDMLatticeEdge,
  type LatticeMaterial,
  type LatticeISOGroup,
  type LatticeController,
  type LatticeWire,
  type LatticeNodeEvidence,
  type LatticeEdgeEvidence,
} from "../schemas/wedmLatticeGraphSchema.js";
import {
  PUBLISHED_PULSE_CONDITIONS,
  type PublishedPulseCondition,
  type EDMMaterialGroup,
  type WireType,
} from "../data/wedm-published-conditions.js";

const DATA_ROOT = path.resolve(process.cwd(), "data/state");
const GRAPH_PATH = path.join(DATA_ROOT, "WEDM_LATTICE_GRAPH.json");

// ============================================================================
// CONSTANTS — attribute universes + physics tables
// ============================================================================

export const LATTICE_MATERIALS: LatticeMaterial[] = [
  "low_carbon_steel",
  "tool_steel",
  "stainless_steel",
  "hardened_steel",
  "aluminum",
  "copper",
  "brass",
  "tungsten_carbide",
  "titanium",
  "inconel",
  "graphite",
  "other",
];

export const LATTICE_CONTROLLERS: LatticeController[] = [
  "fanuc",
  "sodick",
  "makino",
  "mitsubishi",
  "agiecharmilles",
  "accutex",
];

export const LATTICE_WIRES: LatticeWire[] = [
  "brass",
  "zinc_coated",
  "molybdenum",
  "tungsten",
];

/** Canonical ISO-group map used in both node build and embedding. */
export const MATERIAL_TO_ISO: Record<LatticeMaterial, LatticeISOGroup> = {
  low_carbon_steel: "P",
  tool_steel: "P",
  stainless_steel: "M",
  hardened_steel: "H",
  aluminum: "N",
  copper: "N",
  brass: "N",
  tungsten_carbide: "K",
  titanium: "S",
  inconel: "S",
  graphite: "other",
  other: "other",
};

/**
 * Thermal/electrical properties per EDM material group — used for the
 * physics-derived feature block of the embedding. Values are representative
 * from ASM Handbook Vol 1/2/16 and Klocke (2013).
 *   rhoCp   : kg/m³ · J/(kg·K)  (volumetric heat capacity)
 *   deltaTm : K                   (melting rise above 293 K)
 *   alpha   : m²/s                (thermal diffusivity at room T)
 */
export interface MaterialThermalProps {
  rhoCp: number;
  deltaTm: number;
  alpha: number;
}

export const MATERIAL_THERMAL: Record<LatticeMaterial, MaterialThermalProps> = {
  low_carbon_steel: { rhoCp: 3.76e6, deltaTm: 1500, alpha: 1.2e-5 },
  tool_steel:       { rhoCp: 3.70e6, deltaTm: 1500, alpha: 1.1e-5 },
  stainless_steel:  { rhoCp: 4.00e6, deltaTm: 1400, alpha: 4.0e-6 },
  hardened_steel:   { rhoCp: 3.75e6, deltaTm: 1450, alpha: 1.0e-5 },
  aluminum:         { rhoCp: 2.43e6, deltaTm: 660,  alpha: 9.8e-5 },
  copper:           { rhoCp: 3.45e6, deltaTm: 1080, alpha: 1.11e-4 },
  brass:            { rhoCp: 3.20e6, deltaTm: 900,  alpha: 3.5e-5 },
  tungsten_carbide: { rhoCp: 4.20e6, deltaTm: 2800, alpha: 2.0e-5 },
  titanium:         { rhoCp: 2.34e6, deltaTm: 1660, alpha: 8.6e-6 },
  inconel:          { rhoCp: 4.00e6, deltaTm: 1320, alpha: 3.7e-6 },
  graphite:         { rhoCp: 1.50e6, deltaTm: 3600, alpha: 8.0e-5 },
  other:            { rhoCp: 3.75e6, deltaTm: 1450, alpha: 1.0e-5 },
};

/**
 * Klocke Ra fit coefficients k·I_p^α·t_on^β (µm when I_p in A, t_on in µs).
 * See EDM_PHYSICS.klocke.ra_models — values here are the published-textbook
 * constants and are duplicated intentionally to keep this engine decoupled
 * from physics/constants.ts for the pure-data build step.
 */
const KLOCKE_RA = {
  tool_steel: { k: 0.22, a: 0.4, b: 0.35 },
  low_carbon_steel: { k: 0.22, a: 0.4, b: 0.35 },
  stainless_steel: { k: 0.24, a: 0.42, b: 0.36 },
  hardened_steel: { k: 0.26, a: 0.45, b: 0.38 },
  tungsten_carbide: { k: 0.18, a: 0.35, b: 0.32 },
  aluminum: { k: 0.28, a: 0.40, b: 0.34 },
  copper: { k: 0.30, a: 0.40, b: 0.34 },
  brass: { k: 0.28, a: 0.40, b: 0.34 },
  titanium: { k: 0.25, a: 0.42, b: 0.35 },
  inconel: { k: 0.25, a: 0.42, b: 0.35 },
  graphite: { k: 0.30, a: 0.40, b: 0.30 },
  other: { k: 0.22, a: 0.4, b: 0.35 },
} as const;

/**
 * Map the PPC material_group enum (a wider superset) to our LatticeMaterial.
 * Any unknown bucket falls to `other`.
 */
function ppcToLattice(g: EDMMaterialGroup): LatticeMaterial {
  const known = LATTICE_MATERIALS.includes(g as LatticeMaterial);
  return known ? (g as LatticeMaterial) : "other";
}

function wireToLattice(w: WireType): LatticeWire {
  if (w === "brass" || w === "zinc_coated" || w === "molybdenum" || w === "tungsten") {
    return w;
  }
  return "brass";
}

// ============================================================================
// ATTRIBUTE SPANS for composed nodes (used when job history is sparse)
// ============================================================================

const COMPOSED_MATERIALS: LatticeMaterial[] = [
  "low_carbon_steel", "tool_steel", "stainless_steel", "hardened_steel",
  "aluminum", "copper", "tungsten_carbide", "titanium", "inconel", "brass",
];
const COMPOSED_CONTROLLERS: LatticeController[] = ["fanuc", "sodick", "mitsubishi"];
const COMPOSED_WIRES: LatticeWire[] = ["brass", "zinc_coated"];
const COMPOSED_THICKNESSES = [25, 50, 75] as const;
const COMPOSED_RA_TARGETS = [0.8, 1.6, 3.2] as const;

// ============================================================================
// EMBEDDING — deterministic 64-dim feature vector
// ============================================================================

interface EmbedInput {
  mat: LatticeMaterial;
  isoGroup: LatticeISOGroup;
  mach: LatticeController;
  wire: LatticeWire;
  wireDiameterMm: number;
  thicknessMm: number;
  raTargetUm: number;
  peakCurrentA?: number;
  pulseOnUs?: number;
  pulseOffUs?: number;
}

const ISO_GROUPS: LatticeISOGroup[] = ["P", "M", "K", "N", "S", "H", "other"];

function oneHot(values: readonly string[], target: string): number[] {
  return values.map((v) => (v === target ? 1 : 0));
}

function safeLog10(x: number, floor = 1e-9): number {
  return Math.log10(Math.max(floor, x));
}

/**
 * Compute the 64-dim embedding for a cell. Deterministic — identical input
 * returns bit-identical output. Every component is finite. The function is
 * exposed for U-P5-GNN-02 which will multiply these by learned attention
 * weights.
 */
export function computeLatticeEmbedding(n: EmbedInput): number[] {
  const out: number[] = [];

  // [0:12] material one-hot
  out.push(...oneHot(LATTICE_MATERIALS, n.mat)); // 12 dims

  // [12:19] ISO group one-hot
  out.push(...oneHot(ISO_GROUPS, n.isoGroup)); // 7 dims

  // [19:25] controller one-hot
  out.push(...oneHot(LATTICE_CONTROLLERS, n.mach)); // 6 dims

  // [25:29] wire material one-hot
  out.push(...oneHot(LATTICE_WIRES, n.wire)); // 4 dims

  // [29:32] wire diameter (3 dims): log relative to 0.10, linear/0.30, fine flag
  const dia = Math.max(n.wireDiameterMm, 0.01);
  out.push(Math.log2(dia / 0.10));
  out.push(dia / 0.30);
  out.push(dia < 0.15 ? 1 : 0);

  // [32:37] thickness features (5 dims): log, linear, sin, cos, band
  const th = Math.max(n.thicknessMm, 0.1);
  const thLog = safeLog10(th / 10); // -1..+1 for th in 1..100
  out.push(thLog);
  out.push(Math.min(th / 100, 2));
  out.push(Math.sin((Math.PI / 2) * thLog));
  out.push(Math.cos((Math.PI / 2) * thLog));
  // band: 0=thin(<15), 1=med(15..60), 2=thick(>60)
  const thBand = th < 15 ? 0 : th < 60 ? 0.5 : 1;
  out.push(thBand);

  // [37:42] Ra features (5 dims): log, linear, sin, cos, band
  const ra = Math.max(n.raTargetUm, 0.05);
  const raLog = safeLog10(ra / 0.4); // 0..~1.2 for Ra 0.4..6.3
  out.push(raLog);
  out.push(Math.min(ra / 6.3, 2));
  out.push(Math.sin((Math.PI / 2) * raLog));
  out.push(Math.cos((Math.PI / 2) * raLog));
  const raBand = ra < 0.8 ? 0 : ra < 2.0 ? 0.5 : 1;
  out.push(raBand);

  // [42:50] pulse features (8 dims). Use defaults when hints absent (stable
  // deterministic values so composed-but-non-PPC nodes still embed cleanly).
  const ip = Math.max(n.peakCurrentA ?? estimateDefaultIp(ra), 0.1);
  const ton = Math.max(n.pulseOnUs ?? estimateDefaultTon(ra), 0.05);
  const toff = Math.max(n.pulseOffUs ?? estimateDefaultToff(ra), 0.5);
  const eSp = ip * ton * 1e-6; // [A·s] — proxy for discharge energy
  out.push(safeLog10(ip));            // log I
  out.push(Math.min(ip / 30, 2));     // linear I
  out.push(safeLog10(ton));           // log t_on
  out.push(Math.min(ton / 10, 2));    // linear t_on
  out.push(safeLog10(toff));          // log t_off
  out.push(Math.min(toff / 30, 2));   // linear t_off
  out.push(safeLog10(eSp + 1e-12));   // log E_sp proxy
  out.push(Math.min(eSp / 1e-4, 4));  // linear E_sp proxy

  // [50:58] physics-derived (8 dims)
  const therm = MATERIAL_THERMAL[n.mat];
  // 50: volumetric energy to melt (kJ/cm³ ~ 1e9 J/m³), nondim by 1e10
  out.push((therm.rhoCp * therm.deltaTm) / 1e10);
  // 51: thermal diffusion length sqrt(alpha * t_on_s) in µm
  const lenDiffUm = Math.sqrt(therm.alpha * ton * 1e-6) * 1e6;
  out.push(Math.min(lenDiffUm / 50, 4));
  // 52: Klocke Ra prediction ratio (pred / target)
  const klocke = KLOCKE_RA[n.mat];
  const raPred = klocke.k * Math.pow(ip, klocke.a) * Math.pow(ton, klocke.b);
  out.push(Math.min(raPred / Math.max(ra, 0.01), 4));
  // 53: thickness × Ra_target interaction (nondim)
  out.push(Math.min((th * ra) / 200, 4));
  // 54: wire surface area proxy π·d·th
  const wireArea = Math.PI * dia * th;
  out.push(Math.min(wireArea / 100, 4));
  // 55: duty cycle proxy t_on/(t_on+t_off)
  out.push(ton / Math.max(ton + toff, 1e-3));
  // 56: inverse thermal time constant proxy
  out.push(Math.min(therm.alpha / 1e-4, 4));
  // 57: hard-material flag (WC, hardened steel, inconel, titanium)
  const hardSet: LatticeMaterial[] = ["tungsten_carbide", "hardened_steel", "inconel", "titanium"];
  out.push(hardSet.includes(n.mat) ? 1 : 0);

  // [58:64] reserved — all zero (guard finite, allow future extension)
  out.push(0, 0, 0, 0, 0, 0);

  // Safety: clamp any non-finite values (defensive; all paths above are
  // finite by construction but this is a safety net before schema parse).
  for (let i = 0; i < out.length; i += 1) {
    if (!Number.isFinite(out[i])) {
      out[i] = 0;
    }
  }

  if (out.length !== LATTICE_EMBEDDING_DIM) {
    throw new Error(
      `WEDMLatticeGraphEngine: embedding dim drift ${out.length} != ${LATTICE_EMBEDDING_DIM}`,
    );
  }
  return out;
}

// Heuristic parameter defaults when PPC hints are absent. Calibrated so that
// rough Ra targets map to larger I_p / t_on and finish targets map to smaller.
function estimateDefaultIp(raUm: number): number {
  if (raUm >= 3.0) return 20;
  if (raUm >= 1.5) return 10;
  if (raUm >= 0.8) return 6;
  return 3;
}
function estimateDefaultTon(raUm: number): number {
  if (raUm >= 3.0) return 5;
  if (raUm >= 1.5) return 1.5;
  if (raUm >= 0.8) return 0.8;
  return 0.4;
}
function estimateDefaultToff(raUm: number): number {
  if (raUm >= 3.0) return 18;
  if (raUm >= 1.5) return 10;
  return 6;
}

// ============================================================================
// NODE ID / CANONICAL KEY
// ============================================================================

function formatThicknessSlug(th: number): string {
  return th.toFixed(th >= 10 ? 0 : 2);
}
function formatRaSlug(ra: number): string {
  return ra.toFixed(2);
}
function formatWireSlug(d: number): string {
  return d.toFixed(3);
}

export function latticeNodeId(cell: {
  mat: LatticeMaterial;
  mach: LatticeController;
  wire: LatticeWire;
  wireDiameterMm: number;
  thicknessMm: number;
  raTargetUm: number;
}): string {
  return [
    "N",
    cell.mat,
    cell.mach,
    cell.wire,
    formatWireSlug(cell.wireDiameterMm),
    formatThicknessSlug(cell.thicknessMm),
    formatRaSlug(cell.raTargetUm),
  ].join("-");
}

// ============================================================================
// ENGINE
// ============================================================================

export interface BuildOptions {
  /** Include all 60 PPC anchors. Default true. */
  includePublished?: boolean;
  /** Include composed spanning cells. Default true. */
  includeComposed?: boolean;
  /** Include nodes derived from WEDM_JOB_HISTORY.json. Default false (opt-in). */
  includeHistory?: boolean;
  /** Neighbors per node (top-K). Default 8. */
  neighborK?: number;
  /** Path override for unit tests. */
  outputPath?: string;
}

export interface BuildResult {
  nodeCount: number;
  edgeCount: number;
  adjacencySparsity: number;
  savedTo: string;
}

export class WEDMLatticeGraphEngine {
  private graph: WEDMLatticeGraph = structuredClone(EMPTY_WEDM_LATTICE_GRAPH);
  private nodeIndex = new Map<string, WEDMLatticeNode>();

  /**
   * Build the lattice, persist to JSON, and return summary stats.
   */
  build(opts: BuildOptions = {}): BuildResult {
    const {
      includePublished = true,
      includeComposed = true,
      includeHistory = false,
      neighborK = 8,
      outputPath = GRAPH_PATH,
    } = opts;

    const nodes: WEDMLatticeNode[] = [];
    const seen = new Set<string>();
    const sources = { publishedConditions: 0, jobHistory: 0, composed: 0 };

    const pushNode = (n: WEDMLatticeNode) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      nodes.push(n);
      return true;
    };

    if (includePublished) {
      for (const ppc of PUBLISHED_PULSE_CONDITIONS) {
        const mat = ppcToLattice(ppc.material_group);
        const wire = wireToLattice(ppc.wire_type);
        const iso = MATERIAL_TO_ISO[mat];
        // Publish under all three canonical controllers so graph spans controller dim.
        for (const mach of ["fanuc", "sodick", "mitsubishi"] as LatticeController[]) {
          const cell = {
            mat,
            mach,
            wire,
            wireDiameterMm: ppc.wire_diameter_mm,
            thicknessMm: ppc.thickness_mm,
            raTargetUm: ppc.expected_ra_um,
          };
          const id = latticeNodeId(cell);
          if (seen.has(id)) continue;
          const embedding = computeLatticeEmbedding({
            ...cell,
            isoGroup: iso,
            peakCurrentA: ppc.peak_current_A,
            pulseOnUs: ppc.t_on_us,
            pulseOffUs: ppc.t_off_us,
          });
          const evidence: LatticeNodeEvidence =
            ppc.confidence === "manufacturer_table" ? "manufacturer_table" :
            ppc.confidence === "peer_reviewed" ? "peer_reviewed" :
            ppc.confidence === "interpolated" ? "interpolated" : "published_textbook";
          pushNode({
            id,
            mat,
            isoGroup: iso,
            mach,
            wire,
            wireDiameterMm: ppc.wire_diameter_mm,
            thicknessMm: ppc.thickness_mm,
            raTargetUm: ppc.expected_ra_um,
            peakCurrentA: ppc.peak_current_A,
            pulseOnUs: ppc.t_on_us,
            pulseOffUs: ppc.t_off_us,
            embedding,
            source: ppc.id,
            evidence,
          });
          sources.publishedConditions += 1;
        }
      }
    }

    if (includeComposed) {
      for (const mat of COMPOSED_MATERIALS) {
        const iso = MATERIAL_TO_ISO[mat];
        for (const mach of COMPOSED_CONTROLLERS) {
          for (const wire of COMPOSED_WIRES) {
            for (const th of COMPOSED_THICKNESSES) {
              for (const ra of COMPOSED_RA_TARGETS) {
                const cell = {
                  mat,
                  mach,
                  wire,
                  wireDiameterMm: 0.25,
                  thicknessMm: th,
                  raTargetUm: ra,
                };
                const id = latticeNodeId(cell);
                if (seen.has(id)) continue;
                const embedding = computeLatticeEmbedding({ ...cell, isoGroup: iso });
                pushNode({
                  id,
                  mat,
                  isoGroup: iso,
                  mach,
                  wire,
                  wireDiameterMm: 0.25,
                  thicknessMm: th,
                  raTargetUm: ra,
                  embedding,
                  source: "composed",
                  evidence: "composed",
                });
                sources.composed += 1;
              }
            }
          }
        }
      }
    }

    if (includeHistory) {
      sources.jobHistory = this.ingestHistory(pushNode);
    }

    // Build edges: attribute overlap + top-K cosine similarity fallback.
    const edges = this.buildEdges(nodes, neighborK);

    const graph: WEDMLatticeGraph = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      adjacencySparsity: nodes.length > 0 ? edges.length / (nodes.length * nodes.length) : 0,
      embeddingDim: LATTICE_EMBEDDING_DIM,
      nodes,
      edges,
      sources,
    };

    // Zod validate before persisting.
    WEDMLatticeGraphSchema.parse(graph);

    // Persist to disk (outputPath may be in tmp dir during tests).
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2), "utf-8");

    this.graph = graph;
    this.rebuildIndex();

    log.info(
      `[WEDMLatticeGraphEngine] built lattice nodes=${graph.nodeCount} edges=${graph.edgeCount} ` +
      `sparsity=${graph.adjacencySparsity.toFixed(4)}`,
    );

    return {
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      adjacencySparsity: graph.adjacencySparsity,
      savedTo: outputPath,
    };
  }

  /**
   * Hydrate history nodes from WEDM_JOB_HISTORY.json if present.
   * Returns count of newly added nodes.
   */
  private ingestHistory(pushNode: (n: WEDMLatticeNode) => boolean): number {
    const historyPath = path.join(DATA_ROOT, "WEDM_JOB_HISTORY.json");
    if (!fs.existsSync(historyPath)) return 0;
    let count = 0;
    try {
      const raw = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
      const recent = Array.isArray(raw?.recent) ? raw.recent : [];
      for (const job of recent) {
        const matRaw = String(job?.material ?? "").toLowerCase();
        const mat: LatticeMaterial = LATTICE_MATERIALS.includes(matRaw as LatticeMaterial)
          ? (matRaw as LatticeMaterial)
          : "other";
        const iso = MATERIAL_TO_ISO[mat];
        const machRaw = String(job?.controller ?? "fanuc");
        const mach: LatticeController = LATTICE_CONTROLLERS.includes(machRaw as LatticeController)
          ? (machRaw as LatticeController)
          : "fanuc";
        const wireRaw = String(job?.wireMaterial ?? "brass").toLowerCase();
        const wire: LatticeWire = LATTICE_WIRES.includes(wireRaw as LatticeWire)
          ? (wireRaw as LatticeWire)
          : "brass";
        const wireDiameterMm = Number(job?.wireDiameterMm);
        const thicknessMm = Number(job?.thicknessMm);
        const ra = Number(job?.actual?.raUm ?? job?.predicted?.raUm);
        if (
          !Number.isFinite(wireDiameterMm) || wireDiameterMm <= 0 ||
          !Number.isFinite(thicknessMm) || thicknessMm <= 0 ||
          !Number.isFinite(ra) || ra <= 0
        ) continue;
        const cell = {
          mat,
          mach,
          wire,
          wireDiameterMm,
          thicknessMm,
          raTargetUm: ra,
        };
        const embedding = computeLatticeEmbedding({
          ...cell,
          isoGroup: iso,
          peakCurrentA: job?.recipe?.peakCurrentA,
          pulseOnUs: job?.recipe?.pulseOnUs,
          pulseOffUs: job?.recipe?.pulseOffUs,
        });
        const node: WEDMLatticeNode = {
          id: latticeNodeId(cell),
          mat,
          isoGroup: iso,
          mach,
          wire,
          wireDiameterMm,
          thicknessMm,
          raTargetUm: ra,
          peakCurrentA: job?.recipe?.peakCurrentA,
          pulseOnUs: job?.recipe?.pulseOnUs,
          pulseOffUs: job?.recipe?.pulseOffUs,
          embedding,
          source: `job:${String(job?.jobId ?? "unknown")}`,
          evidence: "history",
        };
        if (pushNode(node)) count += 1;
      }
    } catch (err) {
      log.warn(`[WEDMLatticeGraphEngine] history ingest failed: ${(err as Error).message}`);
    }
    return count;
  }

  /**
   * Build edges via attribute-overlap rules plus top-K cosine similarity
   * fallback. Edges are directed from src → dst with src < dst (lexical) to
   * prevent duplicate reverse entries. Self-loops are excluded.
   */
  private buildEdges(nodes: WEDMLatticeNode[], k: number): WEDMLatticeEdge[] {
    const edges: WEDMLatticeEdge[] = [];
    const seenPair = new Set<string>();

    const addEdge = (a: WEDMLatticeNode, b: WEDMLatticeNode, ev: LatticeEdgeEvidence, w: number) => {
      if (a.id === b.id) return;
      const [src, dst] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
      const key = `${src}|${dst}`;
      if (seenPair.has(key)) return;
      seenPair.add(key);
      edges.push({ src, dst, weight: Math.max(0, Math.min(1, w)), evidence: ev });
    };

    // For each node: top-K cosine neighbors (dominant edge source).
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const scores: Array<{ j: number; sim: number }> = [];
      for (let j = 0; j < nodes.length; j += 1) {
        if (i === j) continue;
        const b = nodes[j];
        // Cheap gate: skip pairs that don't share material AND don't share controller
        // AND aren't in adjacent thickness buckets (avoids N² cosine explosion).
        const sameMat = a.mat === b.mat;
        const sameMach = a.mach === b.mach;
        const sameWire = a.wire === b.wire && Math.abs(a.wireDiameterMm - b.wireDiameterMm) < 0.1;
        const thickClose = Math.abs(Math.log2(a.thicknessMm / b.thicknessMm)) < 1.0;
        if (!(sameMat || (sameMach && sameWire) || (sameWire && thickClose))) continue;
        const sim = cosineSim(a.embedding, b.embedding);
        if (sim <= 0) continue;
        scores.push({ j, sim });
      }
      scores.sort((x, y) => y.sim - x.sim);
      const top = scores.slice(0, k);
      for (const { j, sim } of top) {
        const b = nodes[j];
        const ev: LatticeEdgeEvidence =
          a.mat === b.mat ? "same_material" :
          a.mach === b.mach ? "same_controller" :
          a.wire === b.wire ? "shared_wire" :
          Math.abs(Math.log2(a.thicknessMm / b.thicknessMm)) < 0.5 ? "adjacent_thickness" :
          "cosine_similarity";
        addEdge(a, b, ev, sim);
      }
    }

    return edges;
  }

  /** Load lattice from disk. Returns empty graph if file missing. */
  load(opts: { path?: string } = {}): WEDMLatticeGraph {
    const p = opts.path ?? GRAPH_PATH;
    if (!fs.existsSync(p)) {
      this.graph = structuredClone(EMPTY_WEDM_LATTICE_GRAPH);
      this.rebuildIndex();
      return this.graph;
    }
    const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
    const parsed = WEDMLatticeGraphSchema.parse(raw);
    this.graph = parsed;
    this.rebuildIndex();
    return this.graph;
  }

  /** Current in-memory graph (read-only reference). */
  snapshot(): WEDMLatticeGraph {
    return this.graph;
  }

  getNode(id: string): WEDMLatticeNode | null {
    return this.nodeIndex.get(id) ?? null;
  }

  /** Return all nodes matching the given partial filter. */
  queryByAttrs(filter: Partial<{
    mat: LatticeMaterial;
    mach: LatticeController;
    wire: LatticeWire;
    thicknessMm: number;
    raTargetUm: number;
    wireDiameterMm: number;
  }>): WEDMLatticeNode[] {
    return this.graph.nodes.filter((n) => {
      if (filter.mat !== undefined && n.mat !== filter.mat) return false;
      if (filter.mach !== undefined && n.mach !== filter.mach) return false;
      if (filter.wire !== undefined && n.wire !== filter.wire) return false;
      if (
        filter.thicknessMm !== undefined &&
        Math.abs(n.thicknessMm - filter.thicknessMm) > 0.01
      ) return false;
      if (
        filter.raTargetUm !== undefined &&
        Math.abs(n.raTargetUm - filter.raTargetUm) > 0.001
      ) return false;
      if (
        filter.wireDiameterMm !== undefined &&
        Math.abs(n.wireDiameterMm - filter.wireDiameterMm) > 0.001
      ) return false;
      return true;
    });
  }

  /** Summary stats. */
  stats(): {
    nodes: number;
    edges: number;
    sparsity: number;
    sources: { publishedConditions: number; jobHistory: number; composed: number };
    generatedAt: string;
  } {
    return {
      nodes: this.graph.nodeCount,
      edges: this.graph.edgeCount,
      sparsity: this.graph.adjacencySparsity,
      sources: this.graph.sources,
      generatedAt: this.graph.generatedAt,
    };
  }

  /** For tests: wipe state & delete the on-disk file. */
  _resetForTests(opts: { path?: string } = {}): void {
    const p = opts.path ?? GRAPH_PATH;
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch { /* noop */ }
    this.graph = structuredClone(EMPTY_WEDM_LATTICE_GRAPH);
    this.nodeIndex.clear();
  }

  private rebuildIndex(): void {
    this.nodeIndex.clear();
    for (const n of this.graph.nodes) {
      this.nodeIndex.set(n.id, n);
    }
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmLatticeGraphEngine = new WEDMLatticeGraphEngine();
