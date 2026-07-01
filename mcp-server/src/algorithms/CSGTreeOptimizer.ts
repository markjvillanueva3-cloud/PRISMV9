/**
 * CSGTreeOptimizer — CAD #1.2
 * Reduces boolean-tree depth in CSG (constructive-solid-geometry) trees by
 * combining adjacent unions/intersections + dropping redundant identities.
 * Deep trees blow up downstream BRep regeneration time exponentially.
 */
export type CSGOp = "union" | "intersect" | "difference";
export type CSGPrim = "box" | "cyl" | "sphere" | "torus" | "extrusion";

export interface CSGNode {
  /** "op" for boolean nodes, "leaf" for primitives. */
  kind: "op" | "leaf";
  op?: CSGOp;
  children?: CSGNode[];
  /** Primitive metadata for leaves. */
  primitive?: CSGPrim;
  /** Volume estimate [mm³] for redundancy detection. */
  volume_mm3?: number;
}

export interface CSGTreeInput { root: CSGNode; }

export interface CSGOptimizeResult {
  optimized: CSGNode;
  original_depth: number;
  optimized_depth: number;
  nodes_dropped: number;
  identity_collapses: number;
  associativity_merges: number;
  notes: string[];
  source: string;
}

const MAX_DEPTH = 256;

function depthOf(n: CSGNode): number {
  if (!n || n.kind === "leaf") return 1;
  if (!n.children || n.children.length === 0) return 1;
  return 1 + Math.max(...n.children.map(depthOf));
}

function emit(reason: string, root?: CSGNode): CSGOptimizeResult {
  return {
    optimized: root ?? { kind: "leaf", primitive: "box" },
    original_depth: 0, optimized_depth: 0,
    nodes_dropped: 0, identity_collapses: 0, associativity_merges: 0,
    notes: [reason], source: "CSGTreeOptimizer v1.0.0",
  };
}

let identityCollapses = 0;
let assocMerges = 0;
let nodesDropped = 0;

function optimize(node: CSGNode, depth: number): CSGNode {
  if (depth > MAX_DEPTH) return node;
  if (!node || node.kind === "leaf") return node;
  if (!node.children || node.children.length === 0) {
    nodesDropped++;
    return { kind: "leaf", primitive: "box", volume_mm3: 0 };
  }

  // Recurse first
  const optChildren = node.children.map(c => optimize(c, depth + 1));

  // Identity collapse: union of one child → child itself; intersect of one child → child
  if (optChildren.length === 1 && (node.op === "union" || node.op === "intersect")) {
    identityCollapses++;
    return optChildren[0];
  }

  // Associativity merge: union(union(a,b), c) → union(a,b,c)
  const merged: CSGNode[] = [];
  for (const c of optChildren) {
    if (c.kind === "op" && c.op === node.op && (node.op === "union" || node.op === "intersect") && c.children) {
      merged.push(...c.children);
      assocMerges++;
    } else {
      merged.push(c);
    }
  }

  // Drop zero-volume leaves from a union (no contribution)
  let cleaned = merged;
  if (node.op === "union") {
    cleaned = merged.filter(c => !(c.kind === "leaf" && c.volume_mm3 === 0));
    if (cleaned.length !== merged.length) nodesDropped += merged.length - cleaned.length;
  }

  if (cleaned.length === 1 && (node.op === "union" || node.op === "intersect")) {
    identityCollapses++;
    return cleaned[0];
  }

  return { ...node, children: cleaned };
}

export function reduceTree(input: CSGTreeInput): CSGOptimizeResult {
  if (!input || !input.root) return emit("missing input / root");
  if (typeof input.root.kind !== "string") return emit("root.kind must be 'op' or 'leaf'");
  if (input.root.kind !== "op" && input.root.kind !== "leaf") return emit(`unknown root.kind: ${input.root.kind}`);

  identityCollapses = 0; assocMerges = 0; nodesDropped = 0;
  const originalDepth = depthOf(input.root);
  if (originalDepth > MAX_DEPTH) return emit(`tree depth ${originalDepth} exceeds ${MAX_DEPTH}`, input.root);
  const optimized = optimize(input.root, 1);
  const optimizedDepth = depthOf(optimized);
  const notes: string[] = [];
  notes.push(`depth ${originalDepth} → ${optimizedDepth} (Δ ${originalDepth - optimizedDepth})`);
  if (assocMerges > 0) notes.push(`${assocMerges} associativity merge(s) collapsed nested same-op nodes`);
  if (identityCollapses > 0) notes.push(`${identityCollapses} identity collapse(s) (single-child op)`);
  if (nodesDropped > 0) notes.push(`${nodesDropped} zero-volume / empty node(s) dropped`);

  return {
    optimized, original_depth: originalDepth, optimized_depth: optimizedDepth,
    nodes_dropped: nodesDropped, identity_collapses: identityCollapses, associativity_merges: assocMerges,
    notes, source: "CSGTreeOptimizer v1.0.0",
  };
}

export const CSGTreeOptimizer = { version: "1.0.0" as const, reduceTree };
