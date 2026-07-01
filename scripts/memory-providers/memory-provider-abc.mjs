/**
 * memory-provider-abc.mjs — abstract base class for PRISM memory providers.
 *
 * MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO05 (slot:bravo 2026-05-26).
 *
 * The Hermes Memory Guidebook (KSimback) ships 8 MemoryProvider plug-ins
 * (Reflexion, Tree-of-Thought, FlexMV, GBrain, Mnemosyne, MemGPT, MemoryBank,
 * Generative Agents). Adopting any of them downstream requires an abstract
 * surface PRISM-side they all conform to. U-MWO05 ships that surface + 3
 * first-party concrete implementations:
 *
 *   1. ObsidianFeedProvider   — reads C: auto-memory dir, writes H: vault
 *                                (existing stop-obsidian-memory-feed path)
 *   2. ObsidianReceiptProvider — same shape, but routed through Hermes-Dreaming
 *                                receipt bundle (U-DR08 opt-in staging)
 *   3. PrismKGProvider        — reads/writes via the knowledge graph
 *                                (stub-shape today; concrete adapter is its
 *                                own MS — this provider exposes the contract
 *                                so downstream callers can swap in safely)
 *
 * The ABC is enforced via runtime checks (abstract methods throw if called
 * directly) and a `requiredMethods` static list for fast linting.
 *
 * @module scripts/memory-providers/memory-provider-abc
 */

/** Abstract error raised when an abstract method is called directly. */
export class AbstractMethodError extends Error {
  constructor(methodName) {
    super(`AbstractMethodError: ${methodName} must be implemented by a concrete subclass`);
    this.name = "AbstractMethodError";
    this.methodName = methodName;
  }
}

/**
 * Pure: validate that a concrete instance implements every required method.
 * Returns { ok, missing[] }. Use in concrete-class tests to forbid silent drift.
 */
export function validateContract(instance, requiredMethods) {
  const missing = [];
  for (const name of requiredMethods) {
    if (typeof instance[name] !== "function") missing.push(name);
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Abstract base class — defines the canonical 6-method memory contract.
 *
 * Subclasses MUST implement every method below. Calling any of these on the
 * ABC directly throws AbstractMethodError. Subclasses are free to add extra
 * methods but must NOT remove or weaken these.
 */
export class MemoryProvider {
  static requiredMethods = ["list", "read", "write", "delete", "stats", "providerName"];

  /** Return provider identity (e.g. "obsidian-feed"). Must be stable. */
  providerName() { throw new AbstractMethodError("providerName"); }

  /** List all memory entries. Returns array of { id, bytes, updatedAt }. */
  // eslint-disable-next-line no-unused-vars
  async list(_opts) { throw new AbstractMethodError("list"); }

  /** Read one entry by id. Returns { id, content, metadata } or null. */
  // eslint-disable-next-line no-unused-vars
  async read(_id) { throw new AbstractMethodError("read"); }

  /** Write one entry. Returns { id, bytes, written:true }. */
  // eslint-disable-next-line no-unused-vars
  async write(_id, _content, _metadata) { throw new AbstractMethodError("write"); }

  /** Delete one entry. Returns { id, deleted:true } or { id, deleted:false }. */
  // eslint-disable-next-line no-unused-vars
  async delete(_id) { throw new AbstractMethodError("delete"); }

  /** Provider-level stats: { count, totalBytes, providerName, lastSync }. */
  async stats() { throw new AbstractMethodError("stats"); }
}
