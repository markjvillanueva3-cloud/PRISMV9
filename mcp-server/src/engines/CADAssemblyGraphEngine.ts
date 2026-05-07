/**
 * CADAssemblyGraphEngine — U-FS-02 (CAD-COMPLETE-MS0 / PHASE-47)
 *
 * Bidirectional parent→child reference graph over CAD assemblies. Closes
 * R14-FS-02 ("assembly reference graph absent — table-stakes for shop use").
 *
 * Capabilities:
 *   - Node/edge add + remove
 *   - Direct children (BOM level-1) + transitive descendants (full BOM)
 *   - Direct parents (where-used) + transitive ancestors (full impact)
 *   - Broken-reference detection
 *   - Reference healing via content-hash lookup (renamed/moved parts)
 *   - Impact analysis (what breaks if this part changes)
 *   - Cycle detection (protects against assembly loops)
 *   - Format-agnostic parser registration (SLDASM/IAM/STEP adapters pluggable)
 *   - Persist/load via injectable FS (test-safe)
 *
 * Integrates with CADContentAddressableStoreEngine (U-FS-01) by using
 * content-hash as the preferred partId. When a registry lookup exists,
 * broken references can be healed by finding a node whose contentHash
 * matches the childContentHash on the severed edge.
 *
 * @module engines/CADAssemblyGraphEngine
 */

import * as nodeFs from "fs";
import * as nodePath from "path";
import {
  AssemblyGraphSchema,
  AssemblyNodeSchema,
  AssemblyReferenceSchema,
  type AssemblyGraph,
  type AssemblyNode,
  type AssemblyReference,
  type AssemblyComponentType,
  type ReferenceStatus,
} from "../schemas/cadAssemblyGraphSchema.js";

// ── Injectable FS (parity with U-FS-01) ─────────────────────────────────────

export interface AssemblyGraphFs {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string) => Buffer | string;
  writeFileSync: (p: string, d: string) => void;
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => void;
}

function realFs(): AssemblyGraphFs {
  return {
    existsSync: nodeFs.existsSync,
    readFileSync: (p: string) => nodeFs.readFileSync(p),
    writeFileSync: (p: string, d: string) =>
      nodeFs.writeFileSync(p, d, "utf8"),
    mkdirSync: (p: string, o) => nodeFs.mkdirSync(p, o as any),
  };
}

// ── Default state path ──────────────────────────────────────────────────────

export const DEFAULT_GRAPH_PATH =
  "H:/prism/mcp-server/data/state/CAD_ASSEMBLY_GRAPH.json";

// ── Engine ──────────────────────────────────────────────────────────────────

export class CADAssemblyGraphEngine {
  private nodes: Map<string, AssemblyNode>;
  private edges: AssemblyReference[];
  /** parent → set<child>  (forward adjacency) */
  private adjForward: Map<string, Set<string>>;
  /** child → set<parent>  (reverse adjacency, the 'where-used' side) */
  private adjReverse: Map<string, Set<string>>;
  private readonly graphPath: string;

  constructor(graphPath: string = DEFAULT_GRAPH_PATH) {
    this.nodes = new Map();
    this.edges = [];
    this.adjForward = new Map();
    this.adjReverse = new Map();
    this.graphPath = graphPath;
  }

  // ── Basic queries ────────────────────────────────────────────────────────

  get nodeCount(): number {
    return this.nodes.size;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  getNode(partId: string): AssemblyNode | undefined {
    return this.nodes.get(partId);
  }

  listNodes(): AssemblyNode[] {
    return [...this.nodes.values()];
  }

  listEdges(): AssemblyReference[] {
    return [...this.edges];
  }

  // ── Mutation ─────────────────────────────────────────────────────────────

  addNode(input: Omit<AssemblyNode, "paths" | "tags" | "customer"> &
    Partial<Pick<AssemblyNode, "paths" | "tags" | "customer">>): AssemblyNode {
    const node = AssemblyNodeSchema.parse({
      paths: [],
      tags: [],
      customer: "UNKNOWN",
      ...input,
    });
    const existing = this.nodes.get(node.partId);
    if (existing) {
      // Merge paths + tags
      for (const p of node.paths) {
        if (!existing.paths.includes(p)) existing.paths.push(p);
      }
      for (const t of node.tags) {
        if (!existing.tags.includes(t)) existing.tags.push(t);
      }
      if (!existing.contentHash && node.contentHash) {
        existing.contentHash = node.contentHash;
      }
      return existing;
    }
    this.nodes.set(node.partId, node);
    if (!this.adjForward.has(node.partId)) this.adjForward.set(node.partId, new Set());
    if (!this.adjReverse.has(node.partId)) this.adjReverse.set(node.partId, new Set());
    return node;
  }

  addReference(input: Omit<AssemblyReference, "status" | "suppressed"> &
    Partial<Pick<AssemblyReference, "status" | "suppressed">>): AssemblyReference {
    const ref = AssemblyReferenceSchema.parse({
      status: "resolved",
      suppressed: false,
      ...input,
    });

    // Resolve status: if child not in graph, mark broken
    if (!this.nodes.has(ref.childId)) {
      ref.status = "broken";
    }

    this.edges.push(ref);

    if (!this.adjForward.has(ref.parentId)) this.adjForward.set(ref.parentId, new Set());
    this.adjForward.get(ref.parentId)!.add(ref.childId);

    if (!this.adjReverse.has(ref.childId)) this.adjReverse.set(ref.childId, new Set());
    this.adjReverse.get(ref.childId)!.add(ref.parentId);

    return ref;
  }

  /** Remove a node and all edges referencing it. */
  removeNode(partId: string): boolean {
    if (!this.nodes.has(partId)) return false;
    this.nodes.delete(partId);
    this.adjForward.delete(partId);
    this.adjReverse.delete(partId);
    // Prune inbound edges + mark lingering outbound edges as broken
    const surviving: AssemblyReference[] = [];
    for (const e of this.edges) {
      if (e.parentId === partId) continue; // drop — parent gone
      if (e.childId === partId) {
        // Parent still exists but child gone → mark broken, keep for healing
        surviving.push({ ...e, status: "broken" });
        this.adjForward.get(e.parentId)?.delete(partId);
      } else {
        surviving.push(e);
      }
    }
    this.edges = surviving;
    return true;
  }

  // ── Traversal ────────────────────────────────────────────────────────────

  getChildren(partId: string): string[] {
    return [...(this.adjForward.get(partId) ?? [])];
  }

  getParents(partId: string): string[] {
    return [...(this.adjReverse.get(partId) ?? [])];
  }

  /** Full transitive BOM (descendants). Depth-capped to prevent infinite loops. */
  getDescendants(partId: string, maxDepth: number = 64): string[] {
    const seen = new Set<string>();
    const stack: Array<[string, number]> = [[partId, 0]];
    while (stack.length) {
      const [cur, depth] = stack.pop()!;
      if (depth >= maxDepth) continue;
      for (const child of this.adjForward.get(cur) ?? []) {
        if (seen.has(child)) continue;
        seen.add(child);
        stack.push([child, depth + 1]);
      }
    }
    return [...seen];
  }

  /** Full transitive where-used (ancestors). Depth-capped. */
  getAncestors(partId: string, maxDepth: number = 64): string[] {
    const seen = new Set<string>();
    const stack: Array<[string, number]> = [[partId, 0]];
    while (stack.length) {
      const [cur, depth] = stack.pop()!;
      if (depth >= maxDepth) continue;
      for (const parent of this.adjReverse.get(cur) ?? []) {
        if (seen.has(parent)) continue;
        seen.add(parent);
        stack.push([parent, depth + 1]);
      }
    }
    return [...seen];
  }

  // ── Health + reconciliation ─────────────────────────────────────────────

  /** Return every edge whose child is not currently a node (or marked broken). */
  findBrokenReferences(): AssemblyReference[] {
    return this.edges.filter(
      (e) => e.status === "broken" || !this.nodes.has(e.childId),
    );
  }

  /**
   * Heal broken edges by matching childContentHash to a live node. When a
   * match is found, re-point the edge to the live partId and flip status to
   * "healed". Returns count of edges healed.
   */
  healByContentHash(): number {
    // Build (contentHash → partId) index over live nodes
    const hashToId = new Map<string, string>();
    for (const n of this.nodes.values()) {
      if (n.contentHash) hashToId.set(n.contentHash, n.partId);
    }
    let healed = 0;
    for (const e of this.edges) {
      if (e.status !== "broken") continue;
      if (!e.childContentHash) continue;
      const replacement = hashToId.get(e.childContentHash);
      if (!replacement || replacement === e.childId) continue;
      // Re-wire adjacency: forward set — add replacement, remove old child
      this.adjForward.get(e.parentId)?.delete(e.childId);
      this.adjForward.get(e.parentId)?.add(replacement);
      if (!this.adjReverse.has(replacement))
        this.adjReverse.set(replacement, new Set());
      this.adjReverse.get(replacement)!.add(e.parentId);
      e.childId = replacement;
      e.status = "healed";
      healed++;
    }
    return healed;
  }

  /** Detect directed cycles via DFS with white/grey/black coloring. */
  detectCycles(): string[][] {
    const WHITE = 0, GREY = 1, BLACK = 2;
    const color: Record<string, number> = {};
    for (const id of this.nodes.keys()) color[id] = WHITE;
    const cycles: string[][] = [];

    const dfs = (start: string, path: string[]): void => {
      color[start] = GREY;
      path.push(start);
      for (const child of this.adjForward.get(start) ?? []) {
        if (color[child] === GREY) {
          const idx = path.indexOf(child);
          if (idx >= 0) cycles.push(path.slice(idx).concat(child));
        } else if (color[child] === WHITE) {
          dfs(child, path);
        }
      }
      path.pop();
      color[start] = BLACK;
    };

    for (const id of this.nodes.keys()) {
      if (color[id] === WHITE) dfs(id, []);
    }
    return cycles;
  }

  /**
   * Impact analysis: if part X is modified, which other parts/assemblies are
   * affected? Returns the full ancestor closure (anything that references X
   * directly or transitively).
   */
  impactAnalysis(partId: string): { ancestors: string[]; roots: string[] } {
    const ancestors = this.getAncestors(partId);
    // Roots = ancestors that have no parents themselves (top of BOM)
    const roots = ancestors.filter((a) => this.getParents(a).length === 0);
    return { ancestors, roots };
  }

  // ── Format-agnostic parser registration ─────────────────────────────────

  /**
   * Pluggable reference extractor. Production builds wire real parsers for
   * .sldasm (Microsoft OLE compound doc), .iam (Inventor XML-ish), .step
   * (external reference records). For U-FS-02 we register a string-sniffer
   * that recognises the most common reference patterns in ASCII tokens;
   * downstream units can replace with native parsers.
   */
  parseReferencesFromContent(
    parentId: string,
    content: string,
  ): string[] {
    const refs: string[] = [];
    // Rudimentary pattern: STEP NEXT_ASSEMBLY_USAGE_OCCURRENCE lines
    const stepRe = /NEXT_ASSEMBLY_USAGE_OCCURRENCE\s*\(\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = stepRe.exec(content)) !== null) {
      refs.push(m[1]);
    }
    // Rudimentary SLDASM-style "<docname.sldprt>" references
    const slRe = /([A-Za-z0-9_-]+\.(sldprt|sldasm|ipt|iam|step|stp))/gi;
    while ((m = slRe.exec(content)) !== null) {
      refs.push(m[1]);
    }
    // Deduplicate + avoid self-reference
    return [...new Set(refs)].filter((r) => r !== parentId);
  }

  // ── Persist / load ──────────────────────────────────────────────────────

  snapshot(): AssemblyGraph {
    const stats = this.computeStats();
    return AssemblyGraphSchema.parse({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      nodes: Object.fromEntries(this.nodes.entries()),
      edges: this.edges,
      stats,
    });
  }

  load(fsImpl: AssemblyGraphFs = realFs()): void {
    if (!fsImpl.existsSync(this.graphPath)) {
      return; // start clean
    }
    const raw = fsImpl.readFileSync(this.graphPath).toString();
    const g = AssemblyGraphSchema.parse(JSON.parse(raw));
    this.nodes = new Map(Object.entries(g.nodes));
    this.edges = [...g.edges];
    this.adjForward.clear();
    this.adjReverse.clear();
    for (const id of this.nodes.keys()) {
      this.adjForward.set(id, new Set());
      this.adjReverse.set(id, new Set());
    }
    for (const e of this.edges) {
      if (!this.adjForward.has(e.parentId)) this.adjForward.set(e.parentId, new Set());
      this.adjForward.get(e.parentId)!.add(e.childId);
      if (!this.adjReverse.has(e.childId)) this.adjReverse.set(e.childId, new Set());
      this.adjReverse.get(e.childId)!.add(e.parentId);
    }
  }

  persist(fsImpl: AssemblyGraphFs = realFs()): void {
    const snap = this.snapshot();
    const dir = nodePath.dirname(this.graphPath);
    if (!fsImpl.existsSync(dir)) fsImpl.mkdirSync(dir, { recursive: true });
    fsImpl.writeFileSync(this.graphPath, JSON.stringify(snap, null, 2));
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private computeStats(): AssemblyGraph["stats"] {
    let broken = 0;
    let healed = 0;
    for (const e of this.edges) {
      if (e.status === "broken") broken++;
      else if (e.status === "healed") healed++;
    }
    let roots = 0;
    let leaves = 0;
    for (const id of this.nodes.keys()) {
      const parents = this.adjReverse.get(id)?.size ?? 0;
      const children = this.adjForward.get(id)?.size ?? 0;
      if (parents === 0) roots++;
      if (children === 0) leaves++;
    }
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      brokenCount: broken,
      healedCount: healed,
      rootCount: roots,
      leafCount: leaves,
    };
  }
}

export const cadAssemblyGraphEngine = new CADAssemblyGraphEngine();

// Type re-exports for downstream consumers
export type { AssemblyNode, AssemblyReference, AssemblyGraph, AssemblyComponentType, ReferenceStatus };
