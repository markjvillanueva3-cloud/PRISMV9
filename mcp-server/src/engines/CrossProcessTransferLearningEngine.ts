/**
 * CrossProcessTransferLearningEngine — warm-start a target-domain
 * CrossProcessNeuralLearningEngine from a related source-domain donor.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-03.
 *
 * Why this exists
 * ---------------
 * T1-02 trains a fresh MLP per (process, material) context. Cold-starting
 * each from zero wastes signal: a model that already knows "harder
 * material → higher cutting force, lower vc" should transfer that prior
 * to a related material cluster instead of relearning from a handful of
 * shop-floor outcomes.
 *
 * This engine encodes:
 *   - A canonical map of {material_string → cluster} across 9 clusters
 *     spanning ISO P/M/K/N/S/H plus copper-alloy, plastics, and exotics.
 *   - 6 directional transfer pairs that the system trusts as
 *     metallurgically/cuttingly related.
 *   - A weight-surgery routine that copies the donor's input→hidden
 *     layer (the shared featurization) and re-initializes the
 *     hidden→output layer with a fresh seeded random, ready for
 *     target-domain fine-tuning.
 *
 * What this engine is NOT
 * -----------------------
 * This is not full-domain adaptation (no MMD/CORAL/adversarial align).
 * The hypothesis is that the 32-dim featurization is already domain-
 * neutral enough that early-layer reuse + late-layer retraining is
 * sufficient signal recovery for a small dataset. If that hypothesis
 * fails on real shop-floor data, the next layer of work is T1-04+.
 *
 * @module engines/CrossProcessTransferLearningEngine
 */

import {
  CrossProcessNeuralLearningEngine,
  HIDDEN_DIM,
  INPUT_DIM,
  OUTPUT_DIM,
  type SerializedNeural,
} from "./CrossProcessNeuralLearningEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const TRANSFER_SCHEMA_VERSION = "1.0.0";

const DEFAULT_TARGET_SEED = 84;

/**
 * Nine canonical material clusters spanning the production space. The
 * cluster names are stable identifiers — do not rename without bumping
 * TRANSFER_SCHEMA_VERSION (downstream registries key off these strings).
 */
export const MATERIAL_CLUSTERS = [
  "carbon_steel",
  "stainless_steel",
  "cast_iron",
  "aluminum",
  "superalloy",
  "hardened_steel",
  "copper_alloy",
  "plastics",
  "exotic",
] as const;

export type MaterialCluster = (typeof MATERIAL_CLUSTERS)[number];

/**
 * Material-name → cluster mapping. Lower-cased, substring-matched at
 * lookup time. The substring approach handles upstream noise ("AISI 4140",
 * "4140-prehard", "4140 ph") without per-form aliasing.
 */
const CLUSTER_RULES: ReadonlyArray<{
  cluster: MaterialCluster;
  matchers: readonly string[];
}> = [
  // Order matters: more-specific patterns first so e.g. "tool steel" is
  // captured by hardened_steel before falling through to carbon_steel.
  {
    cluster: "hardened_steel",
    matchers: [
      "a2",
      "d2",
      "d6",
      "m2",
      "s7",
      "h13",
      "tool-steel",
      "tool steel",
      "prehard",
      "pre-hard",
    ],
  },
  {
    cluster: "stainless_steel",
    // NOTE: do NOT add bare "ss" — it overmatches "brass", "lass", etc.
    // Use anchored "ss-" or specific grade codes instead.
    matchers: [
      "stainless",
      "ss304",
      "ss316",
      "ss-",
      "304",
      "316",
      "17-4",
      "17-7",
      "303",
      "416",
      "440",
      "duplex",
    ],
  },
  {
    cluster: "superalloy",
    matchers: ["inconel", "hastelloy", "monel", "waspaloy", "rene", "nimonic", "udimet"],
  },
  {
    cluster: "exotic",
    matchers: ["titanium", "ti-6al", "ti6al", "tungsten", "tantalum", "molybdenum", "niobium"],
  },
  {
    cluster: "cast_iron",
    matchers: ["cast iron", "cast-iron", "ci ", "gg25", "ggg40", "grey iron", "ductile iron"],
  },
  {
    cluster: "aluminum",
    matchers: ["aluminum", "aluminium", "alum", "6061", "7075", "2024", "5052", "6082"],
  },
  {
    cluster: "copper_alloy",
    matchers: ["copper", "brass", "bronze", "c360", "c110", "c932", "naval"],
  },
  {
    cluster: "plastics",
    matchers: [
      "delrin",
      "peek",
      "abs",
      "pet",
      "uhmw",
      "nylon",
      "polycarbonate",
      "pc-",
      "polymer",
      "plastic",
    ],
  },
  // Catch-all carbon_steel — any material with a 4-digit AISI/SAE code or "steel".
  {
    cluster: "carbon_steel",
    matchers: ["steel", "1018", "1045", "4140", "4340", "8620", "1144", "12l14", "carbon"],
  },
];

/**
 * Six directional transfer pairs that the system trusts as
 * metallurgically related enough to warm-start. Asymmetric — transfer
 * from "harder" to "easier" is generally better-conditioned (the donor
 * has already learned the conservative cutting envelope).
 */
export const TRANSFER_PAIRS: ReadonlyArray<readonly [MaterialCluster, MaterialCluster]> = [
  ["carbon_steel", "hardened_steel"],
  ["carbon_steel", "stainless_steel"],
  ["stainless_steel", "superalloy"],
  ["aluminum", "copper_alloy"],
  ["cast_iron", "carbon_steel"],
  ["superalloy", "exotic"],
];

// ============================================================================
// TYPES
// ============================================================================

export interface TransferOpts {
  /** Seed for re-initializing the target's hidden→output layer. */
  targetSeed?: number;
  /**
   * If true, also re-init b2. Default true. (b2 is a per-class bias and
   * is rarely useful to inherit since the target class distribution
   * usually differs from the source.)
   */
  reinitB2?: boolean;
  /**
   * If true, allow transferring across pairs not in TRANSFER_PAIRS.
   * Default false — guards against silent garbage-in-garbage-out
   * misuse (e.g. plastics → exotic, where shared cutting priors don't
   * actually exist).
   */
  allowUntrustedPair?: boolean;
}

export interface TransferResult {
  schemaVersion: typeof TRANSFER_SCHEMA_VERSION;
  source: MaterialCluster;
  target: MaterialCluster;
  /** True if (source,target) is in TRANSFER_PAIRS. */
  trustedPair: boolean;
  targetEngine: CrossProcessNeuralLearningEngine;
  /** Donor weights at point-of-transfer — useful for audit/rollback. */
  snapshot: SerializedNeural;
  /** Random seed used for the target's hidden→output re-init. */
  targetSeed: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessTransferLearningEngine {
  /**
   * Look up the cluster a material belongs to. Substring match against
   * CLUSTER_RULES, lowercase. Returns null if no rule fires (caller
   * decides: skip, default to carbon_steel, or surface a coverage gap).
   */
  classifyMaterial(materialName: string | undefined | null): MaterialCluster | null {
    if (!materialName || typeof materialName !== "string") return null;
    const lower = materialName.toLowerCase();
    for (const rule of CLUSTER_RULES) {
      for (const m of rule.matchers) {
        if (lower.includes(m)) return rule.cluster;
      }
    }
    return null;
  }

  /** True if (source, target) appears in the trusted pair list. */
  isTrustedPair(source: MaterialCluster, target: MaterialCluster): boolean {
    for (const [s, t] of TRANSFER_PAIRS) {
      if (s === source && t === target) return true;
    }
    return false;
  }

  /** Return all trusted pairs (read-only copy). */
  listTransferPairs(): Array<readonly [MaterialCluster, MaterialCluster]> {
    return TRANSFER_PAIRS.map((p) => [p[0], p[1]] as const);
  }

  /**
   * Warm-start a new engine for the target cluster from a donor trained
   * on the source cluster. Copies W1/b1 verbatim (shared featurization),
   * re-initializes W2/b2 with Xavier from a fresh seed.
   *
   * Throws when:
   *   - source === target (use the donor directly, do not recopy)
   *   - the pair is not in TRANSFER_PAIRS and allowUntrustedPair !== true
   *   - the donor's serialized weights have unexpected shapes (corrupt
   *     donor would silently train the target against garbage)
   */
  transfer(
    donor: CrossProcessNeuralLearningEngine,
    source: MaterialCluster,
    target: MaterialCluster,
    opts: TransferOpts = {},
  ): TransferResult {
    if (source === target) {
      throw new Error(`transfer: source and target clusters are identical ("${source}")`);
    }
    const trusted = this.isTrustedPair(source, target);
    if (!trusted && !opts.allowUntrustedPair) {
      throw new Error(
        `transfer: pair (${source} → ${target}) is not in TRANSFER_PAIRS. Pass allowUntrustedPair=true to override.`,
      );
    }

    const snapshot = donor.serialize();
    if (snapshot.W1.length !== HIDDEN_DIM * INPUT_DIM) {
      throw new Error(
        `transfer: donor W1 shape mismatch (expected ${HIDDEN_DIM * INPUT_DIM}, got ${snapshot.W1.length})`,
      );
    }
    if (snapshot.b1.length !== HIDDEN_DIM) {
      throw new Error(
        `transfer: donor b1 shape mismatch (expected ${HIDDEN_DIM}, got ${snapshot.b1.length})`,
      );
    }
    if (snapshot.W2.length !== OUTPUT_DIM * HIDDEN_DIM) {
      throw new Error(
        `transfer: donor W2 shape mismatch (expected ${OUTPUT_DIM * HIDDEN_DIM}, got ${snapshot.W2.length})`,
      );
    }

    const targetSeed = opts.targetSeed ?? DEFAULT_TARGET_SEED;
    const reinitB2 = opts.reinitB2 !== false;

    // 1. Build a fresh engine seeded with the target's seed (Xavier-inits everything).
    const targetEngine = new CrossProcessNeuralLearningEngine({
      ...snapshot.config,
      seed: targetSeed,
    });

    // 2. Snapshot the target's *fresh-Xavier* W2/b2 — those are what we want
    //    to keep for the hidden→output layer.
    const freshTarget = targetEngine.serialize();

    // 3. Build the transfer state: donor's W1/b1, target's fresh W2/b2 (and
    //    optionally donor's b2 if reinitB2 is false).
    const transferState: SerializedNeural = {
      schemaVersion: snapshot.schemaVersion,
      config: { ...snapshot.config, seed: targetSeed },
      W1: snapshot.W1.slice(),
      b1: snapshot.b1.slice(),
      W2: freshTarget.W2.slice(),
      b2: reinitB2 ? freshTarget.b2.slice() : snapshot.b2.slice(),
      metrics: {
        // Reset training-progress metrics — target needs its own counters.
        totalSamplesSeen: 0,
        totalEpochsRun: 0,
        lastLoss: 0,
        lastAccuracy: 0,
      },
    };

    const warmStarted = CrossProcessNeuralLearningEngine.fromSerialized(transferState);

    return {
      schemaVersion: TRANSFER_SCHEMA_VERSION,
      source,
      target,
      trustedPair: trusted,
      targetEngine: warmStarted,
      snapshot,
      targetSeed,
    };
  }

  /**
   * Convenience wrapper for the common shop-floor case: caller supplies
   * source and target *material names*, the engine resolves clusters via
   * classifyMaterial. Returns null if either material is unclassifiable
   * — caller decides whether to fall back to cold-start.
   */
  transferByMaterial(
    donor: CrossProcessNeuralLearningEngine,
    sourceMaterial: string,
    targetMaterial: string,
    opts: TransferOpts = {},
  ): TransferResult | null {
    const sCluster = this.classifyMaterial(sourceMaterial);
    const tCluster = this.classifyMaterial(targetMaterial);
    if (!sCluster || !tCluster) return null;
    if (sCluster === tCluster) return null;
    return this.transfer(donor, sCluster, tCluster, opts);
  }
}

export const crossProcessTransferLearningEngine = new CrossProcessTransferLearningEngine();
