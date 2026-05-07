/**
 * CADVisualDiffEngine — U-FS-05 (PHASE-47)
 *
 * Produces a structured diff between two CAD revisions:
 *   1. FEATURE TREE diff — matches features by stable id,
 *      classifies as added / removed / modified / moved / unchanged.
 *   2. PARAMETER diff — for modified features, emits per-key
 *      (before, after, numericDelta, percentDelta).
 *   3. PERCEPTUAL-HASH diff — compares two hex digest strings
 *      via Hamming distance, bucketed into verdict.
 *
 * This engine consumes feature snapshots that were already extracted
 * upstream (e.g. by FeatureRecognitionEngine or a CAD translator). It
 * does NOT parse B-rep — that's orthogonal.
 *
 * @module engines/CADVisualDiffEngine
 */

import {
  FeatureSnapshotSchema,
  VisualDiffReportSchema,
  PerceptualHashCompareSchema,
  type FeatureSnapshot,
  type FeatureDiff,
  type ParameterDelta,
  type PerceptualHashCompare,
  type VisualDiffReport,
  type FeatureChangeKind,
} from "../schemas/cadVisualDiffSchema.js";

const NUMERIC_EQ_EPS = 1e-9;

function numericallyEqual(a: number, b: number): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= NUMERIC_EQ_EPS * scale;
}

function diffParameters(
  before: FeatureSnapshot["parameters"],
  after: FeatureSnapshot["parameters"],
): ParameterDelta[] {
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const deltas: ParameterDelta[] = [];
  for (const k of keys) {
    const b = before[k];
    const a = after[k];
    if (b === undefined && a === undefined) continue;
    if (b === a) continue;
    if (
      typeof b === "number" &&
      typeof a === "number" &&
      numericallyEqual(b, a)
    ) {
      continue;
    }
    const delta: ParameterDelta = {
      key: k,
      before: b === undefined ? null : b,
      after: a === undefined ? null : a,
    };
    if (typeof b === "number" && typeof a === "number") {
      delta.numericDelta = a - b;
      if (Math.abs(b) > NUMERIC_EQ_EPS) {
        delta.percentDelta = ((a - b) / b) * 100;
      }
    }
    deltas.push(delta);
  }
  return deltas.sort((x, y) => x.key.localeCompare(y.key));
}

function verdict(similarity: number): PerceptualHashCompare["verdict"] {
  if (similarity >= 0.98) return "identical";
  if (similarity >= 0.9) return "near_identical";
  if (similarity >= 0.7) return "substantial";
  return "different";
}

// Parse hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`Hash length must be even; got ${hex.length}`);
  }
  if (!/^[0-9a-f]+$/i.test(hex)) {
    throw new Error(`Hash must be hex; got "${hex}"`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function popcount8(b: number): number {
  b = b - ((b >> 1) & 0x55);
  b = (b & 0x33) + ((b >> 2) & 0x33);
  return (b + (b >> 4)) & 0x0f;
}

export class CADVisualDiffEngine {
  /** Diff two feature trees. Returns per-feature diff entries. */
  diffFeatureTrees(
    before: FeatureSnapshot[],
    after: FeatureSnapshot[],
  ): FeatureDiff[] {
    // Validate inputs
    for (const f of before) FeatureSnapshotSchema.parse(f);
    for (const f of after) FeatureSnapshotSchema.parse(f);

    const beforeById = new Map(before.map((f) => [f.id, f]));
    const afterById = new Map(after.map((f) => [f.id, f]));
    const diffs: FeatureDiff[] = [];

    // Added / modified / moved / unchanged
    for (const a of after) {
      const b = beforeById.get(a.id);
      if (!b) {
        diffs.push({
          id: a.id,
          kind: "added",
          after: a,
          parameterDeltas: [],
          orderAfter: a.order,
        });
        continue;
      }
      const paramDeltas = diffParameters(b.parameters, a.parameters);
      const typeChanged = b.featureType !== a.featureType;
      const orderChanged = b.order !== a.order;
      let kind: FeatureChangeKind;
      if (paramDeltas.length > 0 || typeChanged) kind = "modified";
      else if (orderChanged) kind = "moved";
      else kind = "unchanged";

      diffs.push({
        id: a.id,
        kind,
        before: b,
        after: a,
        parameterDeltas: paramDeltas,
        orderBefore: b.order,
        orderAfter: a.order,
      });
    }

    // Removed
    for (const b of before) {
      if (!afterById.has(b.id)) {
        diffs.push({
          id: b.id,
          kind: "removed",
          before: b,
          parameterDeltas: [],
          orderBefore: b.order,
        });
      }
    }

    return diffs;
  }

  /** Compare two perceptual hashes (hex). Both must be the same length. */
  comparePerceptualHashes(hashA: string, hashB: string): PerceptualHashCompare {
    if (hashA.length !== hashB.length) {
      throw new Error(
        `Hash lengths differ: ${hashA.length} vs ${hashB.length}`,
      );
    }
    const a = hexToBytes(hashA);
    const b = hexToBytes(hashB);
    let hamming = 0;
    for (let i = 0; i < a.length; i++) {
      hamming += popcount8(a[i] ^ b[i]);
    }
    const bitLen = a.length * 8;
    const similarity = bitLen === 0 ? 1 : 1 - hamming / bitLen;
    return PerceptualHashCompareSchema.parse({
      hashA,
      hashB,
      hammingDistance: hamming,
      similarity,
      verdict: verdict(similarity),
    });
  }

  /** Build the full report. */
  buildReport(input: {
    drawingNumber: string;
    beforeRevision: string;
    afterRevision: string;
    beforeTree: FeatureSnapshot[];
    afterTree: FeatureSnapshot[];
    beforePerceptualHash?: string;
    afterPerceptualHash?: string;
    generatedAt?: string;
  }): VisualDiffReport {
    const featureDiffs = this.diffFeatureTrees(
      input.beforeTree,
      input.afterTree,
    );
    const summary = {
      added: 0,
      removed: 0,
      modified: 0,
      moved: 0,
      unchanged: 0,
    };
    for (const d of featureDiffs) {
      summary[d.kind] = (summary[d.kind] ?? 0) + 1;
    }
    const perceptual =
      input.beforePerceptualHash && input.afterPerceptualHash
        ? this.comparePerceptualHashes(
            input.beforePerceptualHash,
            input.afterPerceptualHash,
          )
        : undefined;

    return VisualDiffReportSchema.parse({
      schemaVersion: 1,
      drawingNumber: input.drawingNumber,
      beforeRevision: input.beforeRevision,
      afterRevision: input.afterRevision,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      featureDiffs,
      perceptual,
      summary,
    });
  }
}

export const cadVisualDiffEngine = new CADVisualDiffEngine();
