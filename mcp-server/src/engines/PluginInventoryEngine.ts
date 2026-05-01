/**
 * PluginInventoryEngine — Single-pane visibility for plugins, MCPs, extensions
 *
 * Phase 0.17 U-PLG3 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Tracks which
 * MCP servers, agent plugins, and extensions are installed, their health,
 * and last-used timestamp. `/aware` surfaces this in the boot brief so a
 * session knows what it can reach.
 *
 * The engine is a catalog + state tracker. Health checks are performed by
 * external callers (they pass results in via `markHealth()`); this engine
 * ingests the result and exposes queries.
 *
 * @module engines/PluginInventoryEngine
 * @milestone PP-0.17-U-PLG3
 */

export type PluginKind = "mcp-server" | "agent-plugin" | "extension" | "skill-pack";

export type HealthStatus = "healthy" | "degraded" | "unreachable" | "unknown";

export interface PluginEntry {
  id: string;
  name: string;
  kind: PluginKind;
  version?: string;
  description?: string;
  health: HealthStatus;
  lastHealthCheckAt?: string;
  lastUsedAt?: string;
  toolCount?: number;
  tags?: string[];
}

export interface HealthUpdate {
  id: string;
  status: HealthStatus;
  at?: string;
  note?: string;
}

export interface InventorySummary {
  total: number;
  byKind: Record<PluginKind, number>;
  byHealth: Record<HealthStatus, number>;
  recentlyUsed: PluginEntry[];
}

const ALL_KINDS: readonly PluginKind[] = ["mcp-server", "agent-plugin", "extension", "skill-pack"];
const ALL_HEALTH: readonly HealthStatus[] = ["healthy", "degraded", "unreachable", "unknown"];

export class PluginInventoryEngine {
  private readonly plugins = new Map<string, PluginEntry>();

  register(entry: Omit<PluginEntry, "health"> & { health?: HealthStatus }): PluginEntry {
    this.validateBase(entry);
    const canon: PluginEntry = {
      ...entry,
      health: entry.health ?? "unknown",
      tags: entry.tags ? [...new Set(entry.tags.map((t) => t.toLowerCase()))] : undefined,
    };
    this.plugins.set(canon.id, canon);
    return canon;
  }

  registerAll(entries: Array<Omit<PluginEntry, "health"> & { health?: HealthStatus }>): void {
    for (const e of entries) this.register(e);
  }

  unregister(id: string): boolean {
    return this.plugins.delete(id);
  }

  get(id: string): PluginEntry | null {
    return this.plugins.get(id) ?? null;
  }

  list(): PluginEntry[] {
    return [...this.plugins.values()];
  }

  listByKind(kind: PluginKind): PluginEntry[] {
    return this.list().filter((p) => p.kind === kind);
  }

  listByHealth(status: HealthStatus): PluginEntry[] {
    return this.list().filter((p) => p.health === status);
  }

  markHealth(update: HealthUpdate): PluginEntry | null {
    if (!ALL_HEALTH.includes(update.status)) {
      throw new Error(`Unknown health status: ${update.status}`);
    }
    const p = this.plugins.get(update.id);
    if (!p) return null;
    p.health = update.status;
    p.lastHealthCheckAt = update.at ?? new Date().toISOString();
    return p;
  }

  markUsed(id: string, at?: string): PluginEntry | null {
    const p = this.plugins.get(id);
    if (!p) return null;
    p.lastUsedAt = at ?? new Date().toISOString();
    return p;
  }

  summary(): InventorySummary {
    const byKind = Object.fromEntries(ALL_KINDS.map((k) => [k, 0])) as Record<PluginKind, number>;
    const byHealth = Object.fromEntries(ALL_HEALTH.map((h) => [h, 0])) as Record<HealthStatus, number>;
    for (const p of this.plugins.values()) {
      byKind[p.kind] += 1;
      byHealth[p.health] += 1;
    }
    const recentlyUsed = [...this.plugins.values()]
      .filter((p) => p.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
      .slice(0, 5);
    return { total: this.plugins.size, byKind, byHealth, recentlyUsed };
  }

  size(): number {
    return this.plugins.size;
  }

  clear(): void {
    this.plugins.clear();
  }

  /**
   * Load inventory from PLUGIN_INVENTORY.json produced by
   * `scripts/build-plugin-inventory.ts`. Idempotent. Returns count loaded.
   */
  loadFromInventoryFile(filePath: string): number {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("node:fs");
    const raw = readFileSync(filePath, "utf8");
    const doc = JSON.parse(raw) as { entries?: PluginEntry[] };
    const entries = doc.entries ?? [];
    this.registerAll(entries);
    return entries.length;
  }

  private validateBase(entry: { id?: string; name?: string; kind?: PluginKind }): void {
    if (!entry.id || entry.id.trim() === "") throw new Error("PluginEntry.id required");
    if (!entry.name || entry.name.trim() === "") throw new Error("PluginEntry.name required");
    if (!entry.kind || !ALL_KINDS.includes(entry.kind)) {
      throw new Error(`PluginEntry.kind must be one of: ${ALL_KINDS.join(", ")}`);
    }
  }
}

export const pluginInventoryEngine = new PluginInventoryEngine();
