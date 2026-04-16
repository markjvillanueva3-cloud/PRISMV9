/**
 * WEDMPrototypicalNetworkEngine — Prototypical-Network material classifier
 *
 * Phase 3 / P3-MS2 / U-P3-08 of the WEDM AGI Intelligence Roadmap.
 *
 * Implements a prototypical-network classifier over the WEDM spark-DB feature
 * space (the 7-dim vector exported by `WEDMFewShotEngine.embed`). For each
 * ISO material group, we compute the centroid (mean embedding) of all
 * known materials in that group. A new material is classified by Euclidean
 * distance to the prototype set, with confidence = softmax(-distance²).
 *
 * Prototypical networks (Snell et al., NeurIPS 2017, "Prototypical Networks
 * for Few-Shot Learning") — learn class prototypes as the mean of the
 * support set in an embedded space, then classify query points by nearest
 * prototype. For discrete structured classes like ISO machining groups the
 * prototypes are simply the per-group means (no learning required).
 *
 * Exit gate (P3-MS2): "Embedding space clusters materials by ISO group".
 * The engine ships a `clusterQuality()` method that returns the silhouette
 * score of the observed partitioning; a positive silhouette → clusters
 * actually separate.
 *
 * Composes with:
 *   - `WEDMMaterialSparkDatabaseEngine` — source catalog (12 materials).
 *   - `WEDMFewShotEngine.embed` — shared 7-dim feature embedding.
 *
 * @module engines/WEDMPrototypicalNetworkEngine
 */

import {
  embed,
  embedSignature,
  type ISOGroup,
  type UnknownMaterialFeatures,
} from "./WEDMFewShotEngine.js";
import {
  wedmMaterialSparkDatabaseEngine,
  type WEDMMaterialKey,
  type WEDMSparkSignature,
} from "./WEDMMaterialSparkDatabaseEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PrototypeMember {
  material: WEDMMaterialKey;
  embedding: number[];
  /** Euclidean distance from this member to its own prototype (cluster tightness). */
  distanceToPrototype: number;
}

export interface Prototype {
  iso_group: ISOGroup;
  centroid: number[];
  members: PrototypeMember[];
  /** Max intra-cluster distance — an upper bound on "how far a legitimate
   *  member can be from the centroid". Used as a loose inlier threshold. */
  maxIntraDistance: number;
}

export interface ClassifyResult {
  /** Best-match ISO group. */
  iso_group: ISOGroup;
  /** Euclidean distance to the best prototype. */
  distance: number;
  /** Softmax-style confidence in [0, 1]. */
  confidence: number;
  /** All (iso_group, distance) pairs, sorted ascending by distance. */
  ranking: { iso_group: ISOGroup; distance: number; confidence: number }[];
  /** True if the query point lies within `maxIntraDistance` of the best prototype. */
  withinEnvelope: boolean;
}

export interface ClusterQuality {
  /** Silhouette score in [-1, 1] (higher = tighter, more separated clusters). */
  silhouette: number;
  /** Per-group silhouette contributions, for diagnostics. */
  perGroup: Record<ISOGroup, number>;
  /** Average intra-cluster distance across all clusters. */
  avgIntraDistance: number;
  /** Average inter-cluster distance (centroid-to-centroid). */
  avgInterCentroidDistance: number;
  /**
   * Davies–Bouldin index — lower is better, < 1 indicates well-separated
   * clusters. Returns NaN when any cluster has fewer than 2 members
   * (intra-distance undefined in that degenerate case).
   */
  daviesBouldin: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Softmax temperature (τ) on squared-distance → confidence. */
const SOFTMAX_TAU = 0.25;

/** Minimum population for DBI to be defined. */
const MIN_GROUP_SIZE_FOR_DBI = 2;

const ISO_ORDER: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

/**
 * Authoritative ISO-group lookup keyed by spark-DB material key. Kept in
 * sync with `WEDMFewShotEngine.MATERIAL_PROPS` — any material added to the
 * spark DB MUST be added here too, or it will be silently excluded from
 * prototype clustering.
 */
const ISO_BY_MATERIAL: Partial<Record<WEDMMaterialKey, ISOGroup>> = {
  D2: "P", A2: "P", M2: "P", S7: "P", H13: "P",
  SS_304: "M",
  Ti6Al4V: "S", Inconel_718: "S",
  WC: "H",
  Cu_C110: "N", Al_6061: "N", graphite: "N",
};

function isoOf(k: WEDMMaterialKey): ISOGroup | undefined {
  return ISO_BY_MATERIAL[k];
}

function euclid(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

function meanVector(vs: number[][]): number[] {
  if (vs.length === 0) return [];
  const d = vs[0].length;
  const out = new Array(d).fill(0) as number[];
  for (const v of vs) for (let i = 0; i < d; i++) out[i] += v[i];
  for (let i = 0; i < d; i++) out[i] /= vs.length;
  return out;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

function fillGroups(partial: Partial<Record<ISOGroup, number>>): Record<ISOGroup, number> {
  return {
    P: partial.P ?? 0,
    M: partial.M ?? 0,
    K: partial.K ?? 0,
    N: partial.N ?? 0,
    S: partial.S ?? 0,
    H: partial.H ?? 0,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMPrototypicalNetworkEngine {
  private prototypes: Prototype[];

  constructor() {
    this.prototypes = this.build();
  }

  /** Rebuild prototypes from the current spark-DB state. */
  rebuild(): void {
    this.prototypes = this.build();
  }

  /** Return the current prototype set (copy — callers must not mutate). */
  getPrototypes(): Prototype[] {
    return this.prototypes.map((p) => ({
      ...p,
      centroid: [...p.centroid],
      members: p.members.map((m) => ({ ...m, embedding: [...m.embedding] })),
    }));
  }

  /** Direct lookup of a single prototype by ISO group, or undefined if none. */
  getPrototype(group: ISOGroup): Prototype | undefined {
    const p = this.prototypes.find((x) => x.iso_group === group);
    if (!p) return undefined;
    return {
      ...p,
      centroid: [...p.centroid],
      members: p.members.map((m) => ({ ...m, embedding: [...m.embedding] })),
    };
  }

  /**
   * Classify an unknown material by distance to each prototype centroid.
   * Confidence uses softmax on negative squared distance: p_g ∝ exp(-d_g² / τ).
   */
  classify(features: UnknownMaterialFeatures): ClassifyResult {
    const q = embed(features);
    return this.classifyEmbedding(q);
  }

  /** Classify a pre-embedded vector (useful when embedding is cached upstream). */
  classifyEmbedding(q: number[]): ClassifyResult {
    if (this.prototypes.length === 0) {
      throw new Error("No prototypes available — spark DB is empty.");
    }
    const dists = this.prototypes.map((p) => ({
      iso_group: p.iso_group,
      distance: euclid(q, p.centroid),
    }));

    // Softmax confidence over negative squared distance / τ.
    const logits = dists.map((d) => -(d.distance * d.distance) / SOFTMAX_TAU);
    const maxLogit = Math.max(...logits);
    const exps = logits.map((l) => Math.exp(l - maxLogit));
    const z = exps.reduce((a, b) => a + b, 0);

    const ranking = dists
      .map((d, i) => ({
        iso_group: d.iso_group,
        distance: round4(d.distance),
        confidence: round4(exps[i] / z),
      }))
      .sort((a, b) => a.distance - b.distance);

    const best = ranking[0];
    const proto = this.prototypes.find((p) => p.iso_group === best.iso_group)!;
    // Envelope check uses distance to nearest member (not to centroid) with a
    // 1.5× slack on the cluster's maximum intra-distance. This is more
    // forgiving to a well-classified query whose unmeasured `raSeen` default
    // pulls it away from the centroid of a large tight cluster.
    let nearestMemberD = Infinity;
    for (const m of proto.members) {
      const d = euclid(q, m.embedding);
      if (d < nearestMemberD) nearestMemberD = d;
    }
    return {
      iso_group: best.iso_group,
      distance: best.distance,
      confidence: best.confidence,
      ranking,
      withinEnvelope:
        nearestMemberD <= Math.max(proto.maxIntraDistance, 0.2) * 1.5,
    };
  }

  /**
   * Silhouette + Davies–Bouldin cluster-quality scores. Exit-gate metric for
   * "embedding space clusters materials by ISO group".
   *
   * Silhouette s(i) = (b - a) / max(a, b), where
   *   a = mean distance to other points in own cluster
   *   b = min over other clusters c of (mean distance to points in c)
   *
   * Davies–Bouldin  DBI = mean over clusters i of
   *   max_{j ≠ i} (σ_i + σ_j) / d(c_i, c_j)
   */
  clusterQuality(): ClusterQuality {
    const points: { group: ISOGroup; v: number[] }[] = [];
    for (const proto of this.prototypes) {
      for (const m of proto.members) {
        points.push({ group: proto.iso_group, v: m.embedding });
      }
    }
    const allGroups = this.prototypes.map((p) => p.iso_group);
    const groupPoints: Record<string, number[][]> = {};
    for (const g of allGroups) {
      groupPoints[g] = points.filter((p) => p.group === g).map((p) => p.v);
    }

    // Silhouette (per-point, averaged per group then over all groups).
    const perGroup: Partial<Record<ISOGroup, number>> = {};
    let silhouetteSum = 0;
    let silhouetteN = 0;
    for (const g of allGroups) {
      const own = groupPoints[g];
      if (own.length < 2) {
        perGroup[g] = 0;
        continue;
      }
      let gAcc = 0;
      for (const p of own) {
        // a = mean distance to others in own cluster
        const aSum = own.reduce((s, q) => s + (q === p ? 0 : euclid(p, q)), 0);
        const a = aSum / (own.length - 1);
        // b = min over other clusters of mean distance
        let b = Infinity;
        for (const h of allGroups) {
          if (h === g) continue;
          const other = groupPoints[h];
          if (other.length === 0) continue;
          const mean = other.reduce((s, q) => s + euclid(p, q), 0) / other.length;
          if (mean < b) b = mean;
        }
        if (!Number.isFinite(b)) b = a;
        const denom = Math.max(a, b);
        const s = denom === 0 ? 0 : (b - a) / denom;
        gAcc += s;
        silhouetteSum += s;
        silhouetteN++;
      }
      perGroup[g] = own.length > 0 ? gAcc / own.length : 0;
    }
    const silhouette = silhouetteN > 0 ? silhouetteSum / silhouetteN : 0;

    // Average intra-cluster distance.
    let intraSum = 0, intraN = 0;
    for (const proto of this.prototypes) {
      for (const m of proto.members) {
        intraSum += m.distanceToPrototype;
        intraN++;
      }
    }
    const avgIntraDistance = intraN > 0 ? intraSum / intraN : 0;

    // Average inter-centroid distance (simple pairwise mean).
    let interSum = 0, interN = 0;
    for (let i = 0; i < this.prototypes.length; i++) {
      for (let j = i + 1; j < this.prototypes.length; j++) {
        interSum += euclid(this.prototypes[i].centroid, this.prototypes[j].centroid);
        interN++;
      }
    }
    const avgInterCentroidDistance = interN > 0 ? interSum / interN : 0;

    // Davies–Bouldin.
    let dbi = NaN;
    const big = this.prototypes.filter((p) => p.members.length >= MIN_GROUP_SIZE_FOR_DBI);
    if (big.length >= 2) {
      const sigma: Record<string, number> = {};
      for (const p of big) {
        const s = p.members.reduce((acc, m) => acc + m.distanceToPrototype, 0) /
          p.members.length;
        sigma[p.iso_group] = s;
      }
      let sumMax = 0;
      for (const pi of big) {
        let localMax = -Infinity;
        for (const pj of big) {
          if (pj === pi) continue;
          const d = euclid(pi.centroid, pj.centroid);
          if (d === 0) continue;
          const ratio = (sigma[pi.iso_group] + sigma[pj.iso_group]) / d;
          if (ratio > localMax) localMax = ratio;
        }
        if (Number.isFinite(localMax)) sumMax += localMax;
      }
      dbi = sumMax / big.length;
    }

    return {
      silhouette: round4(silhouette),
      perGroup: fillGroups(perGroup),
      avgIntraDistance: round4(avgIntraDistance),
      avgInterCentroidDistance: round4(avgInterCentroidDistance),
      daviesBouldin: Number.isFinite(dbi) ? round4(dbi) : NaN,
    };
  }

  /**
   * Probability mass that the query belongs to the *same* group as the
   * nearest support example — useful as a quick "is this OOD?" signal.
   */
  nearestSupportGroup(features: UnknownMaterialFeatures): {
    iso_group: ISOGroup;
    material: WEDMMaterialKey;
    distance: number;
  } {
    const q = embed(features);
    let bestD = Infinity;
    let bestMat: WEDMMaterialKey = "D2";
    let bestGroup: ISOGroup = "P";
    for (const proto of this.prototypes) {
      for (const m of proto.members) {
        const d = euclid(q, m.embedding);
        if (d < bestD) {
          bestD = d;
          bestMat = m.material;
          bestGroup = proto.iso_group;
        }
      }
    }
    return { iso_group: bestGroup, material: bestMat, distance: round4(bestD) };
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private build(): Prototype[] {
    const sigs = wedmMaterialSparkDatabaseEngine.list();
    const byGroup: Partial<Record<ISOGroup, WEDMSparkSignature[]>> = {};
    for (const s of sigs) {
      const g = isoOf(s.key);
      if (!g) continue;
      (byGroup[g] ??= []).push(s);
    }

    const protos: Prototype[] = [];
    for (const g of Object.keys(byGroup) as ISOGroup[]) {
      const list = byGroup[g]!;
      if (list.length === 0) continue;
      const embs = list.map((s) => embedSignature(s));
      const centroid = meanVector(embs);
      const members: PrototypeMember[] = list.map((s, i) => ({
        material: s.key,
        embedding: embs[i],
        distanceToPrototype: round4(euclid(embs[i], centroid)),
      }));
      const maxIntra = members.reduce(
        (m, x) => Math.max(m, x.distanceToPrototype),
        0,
      );
      protos.push({
        iso_group: g,
        centroid: centroid.map((x) => round4(x)),
        members,
        maxIntraDistance: round4(maxIntra),
      });
    }
    // Sort by P < M < K < N < S < H for readability.
    protos.sort((a, b) => ISO_ORDER.indexOf(a.iso_group) - ISO_ORDER.indexOf(b.iso_group));
    return protos;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmPrototypicalNetworkEngine = new WEDMPrototypicalNetworkEngine();

