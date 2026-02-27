/**
 * Decision Tree Classifier — CART Algorithm
 *
 * Classification and Regression Tree for manufacturing process outcome
 * prediction. Builds a binary tree using Gini impurity or information gain.
 * Supports max depth, min samples, and feature importance.
 *
 * Manufacturing uses: defect classification, tool condition monitoring,
 * material selection, process outcome prediction.
 *
 * References:
 * - Breiman, L. et al. (1984). "Classification and Regression Trees"
 * - Quinlan, J.R. (1986). "Induction of Decision Trees"
 *
 * @module algorithms/DecisionTreeClassifier
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface DecisionTreeClassifierInput {
  /** Training feature matrix (rows = samples). */
  X_train: number[][];
  /** Training labels (integers). */
  y_train: number[];
  /** Feature vectors to classify. */
  X_test: number[][];
  /** Feature names (optional). */
  feature_names?: string[];
  /** Max tree depth. Default 10. */
  max_depth?: number;
  /** Min samples to split. Default 2. */
  min_samples_split?: number;
  /** Split criterion. Default "gini". */
  criterion?: "gini" | "entropy";
}

interface TreeNode {
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  prediction?: number;
  samples: number;
  impurity: number;
}

export interface DecisionTreeClassifierOutput extends WithWarnings {
  predictions: number[];
  probabilities: number[][];
  feature_importance: Record<string, number>;
  tree_depth: number;
  n_leaves: number;
  training_accuracy: number;
  calculation_method: string;
}

export class DecisionTreeClassifier implements Algorithm<DecisionTreeClassifierInput, DecisionTreeClassifierOutput> {

  validate(input: DecisionTreeClassifierInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.X_train?.length) issues.push({ field: "X_train", message: "Required", severity: "error" });
    if (!input.y_train?.length) issues.push({ field: "y_train", message: "Required", severity: "error" });
    if (input.X_train?.length !== input.y_train?.length) {
      issues.push({ field: "y_train", message: "Must match X_train length", severity: "error" });
    }
    if (!input.X_test?.length) issues.push({ field: "X_test", message: "At least 1 test point required", severity: "error" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: DecisionTreeClassifierInput): DecisionTreeClassifierOutput {
    const warnings: string[] = [];
    const { X_train, y_train, X_test } = input;
    const maxDepth = input.max_depth ?? 10;
    const minSplit = input.min_samples_split ?? 2;
    const criterion = input.criterion ?? "gini";
    const nFeatures = X_train[0].length;
    const classes = [...new Set(y_train)].sort((a, b) => a - b);
    const featureNames = input.feature_names ?? Array.from({ length: nFeatures }, (_, i) => `feature_${i}`);

    const featureImportance = new Array(nFeatures).fill(0);
    let totalSamples = X_train.length;

    const gini = (labels: number[]) => {
      if (labels.length === 0) return 0;
      const counts = new Map<number, number>();
      labels.forEach(l => counts.set(l, (counts.get(l) ?? 0) + 1));
      let imp = 1;
      counts.forEach(c => { const p = c / labels.length; imp -= p * p; });
      return imp;
    };

    const entropy = (labels: number[]) => {
      if (labels.length === 0) return 0;
      const counts = new Map<number, number>();
      labels.forEach(l => counts.set(l, (counts.get(l) ?? 0) + 1));
      let ent = 0;
      counts.forEach(c => { const p = c / labels.length; if (p > 0) ent -= p * Math.log2(p); });
      return ent;
    };

    const impurityFn = criterion === "gini" ? gini : entropy;

    const buildTree = (indices: number[], depth: number): TreeNode => {
      const labels = indices.map(i => y_train[i]);
      const imp = impurityFn(labels);

      // Leaf conditions
      if (depth >= maxDepth || indices.length < minSplit || imp === 0) {
        const counts = new Map<number, number>();
        labels.forEach(l => counts.set(l, (counts.get(l) ?? 0) + 1));
        let maxCount = 0, pred = labels[0];
        counts.forEach((c, l) => { if (c > maxCount) { maxCount = c; pred = l; } });
        return { prediction: pred, samples: indices.length, impurity: imp };
      }

      let bestFeature = 0, bestThreshold = 0, bestGain = -1;
      let bestLeft: number[] = [], bestRight: number[] = [];

      for (let f = 0; f < nFeatures; f++) {
        const values = [...new Set(indices.map(i => X_train[i][f]))].sort((a, b) => a - b);
        for (let v = 0; v < values.length - 1; v++) {
          const thresh = (values[v] + values[v + 1]) / 2;
          const left = indices.filter(i => X_train[i][f] <= thresh);
          const right = indices.filter(i => X_train[i][f] > thresh);
          if (left.length === 0 || right.length === 0) continue;

          const leftImp = impurityFn(left.map(i => y_train[i]));
          const rightImp = impurityFn(right.map(i => y_train[i]));
          const gain = imp - (left.length / indices.length) * leftImp - (right.length / indices.length) * rightImp;

          if (gain > bestGain) {
            bestGain = gain;
            bestFeature = f;
            bestThreshold = thresh;
            bestLeft = left;
            bestRight = right;
          }
        }
      }

      if (bestGain <= 0) {
        const counts = new Map<number, number>();
        labels.forEach(l => counts.set(l, (counts.get(l) ?? 0) + 1));
        let maxCount = 0, pred = labels[0];
        counts.forEach((c, l) => { if (c > maxCount) { maxCount = c; pred = l; } });
        return { prediction: pred, samples: indices.length, impurity: imp };
      }

      featureImportance[bestFeature] += bestGain * indices.length / totalSamples;

      return {
        feature: bestFeature,
        threshold: bestThreshold,
        left: buildTree(bestLeft, depth + 1),
        right: buildTree(bestRight, depth + 1),
        samples: indices.length,
        impurity: imp,
      };
    };

    const tree = buildTree(Array.from({ length: X_train.length }, (_, i) => i), 0);

    const predict = (x: number[]): { label: number; probs: number[] } => {
      let node = tree;
      while (node.prediction === undefined) {
        node = x[node.feature!] <= node.threshold! ? node.left! : node.right!;
      }
      const probs = classes.map(c => c === node.prediction ? 1 : 0);
      return { label: node.prediction!, probs };
    };

    // Tree stats
    const getDepth = (node: TreeNode): number =>
      node.prediction !== undefined ? 0 : 1 + Math.max(getDepth(node.left!), getDepth(node.right!));
    const getLeaves = (node: TreeNode): number =>
      node.prediction !== undefined ? 1 : getLeaves(node.left!) + getLeaves(node.right!);

    const predictions = X_test.map(x => predict(x));
    const trainPreds = X_train.map(x => predict(x));
    const trainAcc = trainPreds.filter((p, i) => p.label === y_train[i]).length / X_train.length;

    // Normalize feature importance
    const impSum = featureImportance.reduce((s, v) => s + v, 0);
    const fiMap: Record<string, number> = {};
    featureNames.forEach((name, i) => { fiMap[name] = impSum > 0 ? featureImportance[i] / impSum : 0; });

    return {
      predictions: predictions.map(p => p.label),
      probabilities: predictions.map(p => p.probs),
      feature_importance: fiMap,
      tree_depth: getDepth(tree),
      n_leaves: getLeaves(tree),
      training_accuracy: trainAcc,
      warnings,
      calculation_method: `CART decision tree (${criterion}, max_depth=${maxDepth})`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "decision-tree-classifier",
      name: "Decision Tree Classifier (CART)",
      description: "Classification tree using Gini impurity or information gain",
      formula: "Gini(S) = 1 - Σp_k²; Gain = I(S) - Σ(|S_v|/|S|)×I(S_v)",
      reference: "Breiman et al. (1984); Quinlan (1986)",
      safety_class: "informational",
      domain: "ml",
      inputs: { X_train: "Training features", y_train: "Labels", X_test: "Test features" },
      outputs: { predictions: "Class labels", feature_importance: "Feature ranking", training_accuracy: "Train accuracy" },
    };
  }
}
