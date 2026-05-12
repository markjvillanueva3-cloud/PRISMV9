/**
 * AbstractionHierarchyEngine — Multi-level tip→principle→law generalization
 *
 * Phase 0.18 U-AGI15 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. PRISM has
 * thousands of tribal tips but no structure to lift a tip up to a principle
 * or a principle up to a domain law. This engine holds that hierarchy:
 *
 *   level 0 — tip (concrete, single observation)
 *   level 1 — rule (small-scale pattern across tips)
 *   level 2 — principle (domain-spanning truth)
 *   level 3 — law (physics- or math-derived invariant)
 *
 * An entry at level N may promote via `promote()` and pull in supporting
 * children. `hierarchy()` walks up from a tip to its roots; `generalize()`
 * finds the most-abstract ancestor that covers a query term.
 *
 * Pure in-memory. Persistence to ABSTRACTION_HIERARCHY.json is a caller
 * concern.
 *
 * @module engines/AbstractionHierarchyEngine
 * @milestone PP-0.18-U-AGI15
 */

export type AbstractionLevel = 0 | 1 | 2 | 3;

export const LEVEL_NAMES: Record<AbstractionLevel, string> = {
  0: "tip",
  1: "rule",
  2: "principle",
  3: "law",
};

export interface AbstractionNode {
  id: string;
  text: string;
  level: AbstractionLevel;
  parentId: string | null;
  childIds: string[];
  evidenceCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromotionResult {
  node: AbstractionNode;
  promotedTo: AbstractionLevel;
  supportingChildren: string[];
}

export class AbstractionHierarchyEngine {
  private readonly nodes = new Map<string, AbstractionNode>();
  private nextId = 1;

  addTip(text: string, tags: string[] = [], at?: string): AbstractionNode {
    return this.addAt(text, 0, null, tags, at);
  }

  /**
   * Add a node directly at a given level with explicit parent. Used when
   * loading a pre-built hierarchy from disk.
   */
  addAt(text: string, level: AbstractionLevel, parentId: string | null, tags: string[] = [], at?: string): AbstractionNode {
    this.assertText(text);
    this.assertLevel(level);
    if (parentId !== null) {
      const parent = this.nodes.get(parentId);
      if (!parent) throw new Error(`Unknown parentId: ${parentId}`);
      if (parent.level <= level) {
        throw new Error(`parent must be more abstract (higher level) than child; parent=${parent.level}, child=${level}`);
      }
    }
    const now = at ?? new Date().toISOString();
    const node: AbstractionNode = {
      id: `h${this.nextId++}`,
      text: text.trim(),
      level,
      parentId,
      childIds: [],
      evidenceCount: level === 0 ? 1 : 0,
      tags: [...new Set(tags.map((t) => t.toLowerCase()))],
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(node.id, node);
    if (parentId) this.nodes.get(parentId)!.childIds.push(node.id);
    return node;
  }

  /**
   * Promote a node's level by 1 with the given parent id. Child stays in
   * place; its level rises; parent becomes new root or higher abstraction.
   * Typically used to lift a tip cluster to a rule.
   */
  promote(id: string, newParent: { text: string; tags?: string[] }, at?: string): PromotionResult {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown node id: ${id}`);
    if (node.level >= 3) throw new Error("already at top level (law)");
    const nextLevel = (node.level + 1) as AbstractionLevel;

    // Create or reuse parent at next level
    const parent = this.addAt(newParent.text, (nextLevel + 0) as AbstractionLevel, null, newParent.tags ?? [], at);
    // adjust: parent should be above `node.level` but that check happens in addAt against node.level
    // parent was created at `nextLevel` which is > node.level, so OK

    // Re-parent the original node
    node.parentId = parent.id;
    node.level = node.level; // child level unchanged
    parent.childIds.push(id);
    parent.evidenceCount += node.evidenceCount;
    parent.updatedAt = at ?? new Date().toISOString();
    node.updatedAt = parent.updatedAt;

    return { node: parent, promotedTo: parent.level, supportingChildren: [id] };
  }

  /** Walk from a leaf to its root, returning the chain (leaf → ... → root). */
  hierarchy(id: string): AbstractionNode[] {
    const chain: AbstractionNode[] = [];
    let current = this.nodes.get(id) ?? null;
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = current.parentId ? this.nodes.get(current.parentId) ?? null : null;
    }
    return chain;
  }

  /**
   * Find the most abstract ancestor that contains `term` in text or tags,
   * starting from a given tip/leaf id.
   */
  generalize(id: string, term: string): AbstractionNode | null {
    const needle = term.trim().toLowerCase();
    if (!needle) return null;
    const chain = this.hierarchy(id);
    let best: AbstractionNode | null = null;
    for (const node of chain) {
      if (this.matches(node, needle) && (!best || node.level > best.level)) {
        best = node;
      }
    }
    return best;
  }

  /** All entries at a specific level. */
  atLevel(level: AbstractionLevel): AbstractionNode[] {
    this.assertLevel(level);
    return [...this.nodes.values()].filter((n) => n.level === level);
  }

  get(id: string): AbstractionNode | null {
    return this.nodes.get(id) ?? null;
  }

  size(): number {
    return this.nodes.size;
  }

  clear(): void {
    this.nodes.clear();
    this.nextId = 1;
  }

  // --- internals ---------------------------------------------------------

  private matches(node: AbstractionNode, needle: string): boolean {
    if (node.text.toLowerCase().includes(needle)) return true;
    return node.tags.some((t) => t.includes(needle));
  }

  private assertText(text: string): void {
    if (!text || text.trim() === "") throw new Error("text must be non-empty");
  }

  private assertLevel(level: number): asserts level is AbstractionLevel {
    if (![0, 1, 2, 3].includes(level)) throw new Error(`level must be 0..3, got ${level}`);
  }
}

export const abstractionHierarchyEngine = new AbstractionHierarchyEngine();
