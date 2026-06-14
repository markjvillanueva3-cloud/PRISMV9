/**
 * prism-kg-provider.mjs — knowledge-graph memory provider (in-memory store).
 *
 * U-MWO05 (slot:bravo 2026-05-26). Third concrete MemoryProvider. Reads/writes
 * an in-memory Map keyed by id, with bytes/updatedAt metadata tracking. The
 * deep KG-adapter (Qdrant + KnowledgeGraphEngine) is a separate MS — this
 * provider exposes the contract today so downstream callers can swap in safely.
 *
 * Concrete behavior chosen so the contract surface is testable end-to-end
 * without requiring a live Qdrant. The eventual KG-backed adapter inherits
 * from this class and overrides the four core verbs.
 *
 * @module scripts/memory-providers/prism-kg-provider
 */
import { MemoryProvider } from "./memory-provider-abc.mjs";

export class PrismKGProvider extends MemoryProvider {
  constructor({ now = Date.now } = {}) {
    super();
    this.store = new Map();   // id → { content, bytes, updatedAt, metadata }
    this.now = now;
  }
  providerName() { return "prism-kg"; }

  async list() {
    const out = [];
    for (const [id, entry] of this.store.entries()) {
      out.push({ id, bytes: entry.bytes, updatedAt: entry.updatedAt });
    }
    return out;
  }

  async read(id) {
    const e = this.store.get(id);
    if (!e) return null;
    return { id, content: e.content, metadata: { bytes: e.bytes, updatedAt: e.updatedAt, ...e.metadata } };
  }

  async write(id, content, metadata = {}) {
    const bytes = Buffer.byteLength(content, "utf8");
    const updatedAt = new Date(this.now()).toISOString();
    this.store.set(id, { content, bytes, updatedAt, metadata });
    return { id, bytes, written: true };
  }

  async delete(id) {
    const deleted = this.store.delete(id);
    return { id, deleted };
  }

  async stats() {
    let totalBytes = 0;
    for (const e of this.store.values()) totalBytes += e.bytes;
    return {
      count: this.store.size,
      totalBytes,
      providerName: this.providerName(),
      lastSync: new Date(this.now()).toISOString(),
    };
  }
}
