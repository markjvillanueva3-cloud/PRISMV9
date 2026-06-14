/**
 * obsidian-feed-provider.mjs — direct-feed memory provider.
 *
 * U-MWO05 (slot:bravo 2026-05-26). First-party MemoryProvider implementation
 * wrapping the existing C: auto-memory dir → H: Obsidian vault feed (the
 * stop-obsidian-memory-feed.mjs Stop-hook path). This provider is a thin
 * read-side adapter; the write path goes through obsidian-memory-sync.mjs
 * (operator already trusts that pipeline).
 *
 * Concrete contract per MemoryProvider ABC (U-MWO05).
 *
 * @module scripts/memory-providers/obsidian-feed-provider
 */
import fs from "node:fs";
import path from "node:path";
import { MemoryProvider } from "./memory-provider-abc.mjs";

export const DEFAULT_MEMORY_DIR = path.join(process.env.USERPROFILE || process.env.HOME || ".", ".claude", "projects", "H--PRISM", "memory");

export class ObsidianFeedProvider extends MemoryProvider {
  constructor({ memoryDir = DEFAULT_MEMORY_DIR, fsImpl = fs } = {}) {
    super();
    this.memoryDir = memoryDir;
    this.fs = fsImpl;
  }
  providerName() { return "obsidian-feed"; }

  async list() {
    let names;
    try { names = this.fs.readdirSync(this.memoryDir); }
    catch { return []; }
    const out = [];
    for (const name of names) {
      if (!name.endsWith(".md")) continue;
      try {
        const stat = this.fs.statSync(path.join(this.memoryDir, name));
        out.push({ id: name, bytes: stat.size, updatedAt: new Date(stat.mtimeMs).toISOString() });
      } catch { /* skip unreadable */ }
    }
    return out;
  }

  async read(id) {
    try {
      const full = path.join(this.memoryDir, id);
      const content = this.fs.readFileSync(full, "utf8");
      const stat = this.fs.statSync(full);
      return { id, content, metadata: { bytes: stat.size, updatedAt: new Date(stat.mtimeMs).toISOString() } };
    } catch { return null; }
  }

  async write(id, content) {
    // Direct write: writes go straight to C: dir (the C→H mirror hook replicates).
    const full = path.join(this.memoryDir, id);
    this.fs.mkdirSync(path.dirname(full), { recursive: true });
    this.fs.writeFileSync(full, content, "utf8");
    return { id, bytes: Buffer.byteLength(content, "utf8"), written: true };
  }

  async delete(id) {
    try {
      this.fs.unlinkSync(path.join(this.memoryDir, id));
      return { id, deleted: true };
    } catch { return { id, deleted: false }; }
  }

  async stats() {
    const entries = await this.list();
    return {
      count: entries.length,
      totalBytes: entries.reduce((s, e) => s + e.bytes, 0),
      providerName: this.providerName(),
      lastSync: new Date().toISOString(),
    };
  }
}
