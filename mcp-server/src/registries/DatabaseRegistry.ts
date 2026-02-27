/**
 * PRISM Database Registry
 * =======================
 * Provides unified access to all 24 JSON databases defined in DB_MANIFEST.json.
 * Wraps file-backed databases (ThreadDB, GenomeDB, etc.) into the RegistryManager
 * ecosystem so they're discoverable via globalSearch and listRegistries.
 *
 * @version 1.0.0 — L0-P2-MS1
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { PATHS } from "../constants.js";

interface DatabaseManifestEntry {
  id: string;
  name: string;
  type: "registry-backed" | "file-backed" | "engine-inline";
  source_file?: string;
  source_dir?: string;
  registry_class?: string;
  entry_count: number;
  schema_version?: string;
  status: string;
  milestone_created: string;
  standards?: string[];
  safety_class?: string;
  [key: string]: any;
}

interface DatabaseManifest {
  version: string;
  total_databases: number;
  databases: DatabaseManifestEntry[];
}

interface LoadedDatabase {
  id: string;
  name: string;
  type: string;
  entry_count: number;
  status: string;
  data: any; // The loaded JSON contents (for file-backed only)
}

export class DatabaseRegistry {
  private manifest: DatabaseManifest | null = null;
  private databases: Map<string, LoadedDatabase> = new Map();
  private _loaded = false;
  private manifestPath: string;
  private dataDir: string;

  constructor() {
    this.manifestPath = path.join(PATHS.DATA_DIR, "..", "data", "databases", "DB_MANIFEST.json");
    this.dataDir = path.join(PATHS.DATA_DIR, "..", "data", "databases");
    // Normalize paths — try multiple locations
    if (!fs.existsSync(this.manifestPath)) {
      const alt = path.resolve(PATHS.MCP_SERVER, "..", "data", "databases", "DB_MANIFEST.json");
      if (fs.existsSync(alt)) this.manifestPath = alt;
    }
    if (!fs.existsSync(this.dataDir)) {
      const alt = path.resolve(PATHS.MCP_SERVER, "..", "data", "databases");
      if (fs.existsSync(alt)) this.dataDir = alt;
    }
  }

  async load(): Promise<void> {
    if (this._loaded) return;

    try {
      if (!fs.existsSync(this.manifestPath)) {
        log.warn(`DatabaseRegistry: DB_MANIFEST.json not found at ${this.manifestPath}`);
        this._loaded = true;
        return;
      }

      this.manifest = JSON.parse(fs.readFileSync(this.manifestPath, "utf-8"));
      if (!this.manifest) return;

      for (const entry of this.manifest.databases) {
        // Only load file-backed databases (registry-backed ones are already loaded by their own registries)
        if (entry.type === "file-backed" && entry.source_file && entry.status !== "deferred") {
          const filePath = path.resolve(PATHS.MCP_SERVER, "..", entry.source_file);
          let data: any = null;
          try {
            if (fs.existsSync(filePath)) {
              data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            }
          } catch (err) {
            log.warn(`DatabaseRegistry: Failed to load ${entry.id}: ${err}`);
          }

          this.databases.set(entry.id, {
            id: entry.id,
            name: entry.name,
            type: entry.type,
            entry_count: entry.entry_count,
            status: data ? "loaded" : "error",
            data
          });
        } else {
          // Track registry-backed and deferred entries as metadata-only
          this.databases.set(entry.id, {
            id: entry.id,
            name: entry.name,
            type: entry.type,
            entry_count: entry.entry_count,
            status: entry.status,
            data: null
          });
        }
      }

      const fileLoaded = [...this.databases.values()].filter(d => d.type === "file-backed" && d.data).length;
      log.info(`DatabaseRegistry loaded: ${this.databases.size} databases (${fileLoaded} file-backed with data)`);
    } catch (err) {
      log.error(`DatabaseRegistry load failed: ${err}`);
    }

    this._loaded = true;
  }

  get size(): number {
    return this.databases.size;
  }

  isLoaded(): boolean {
    return this._loaded;
  }

  clear(): void {
    this.databases.clear();
    this.manifest = null;
    this._loaded = false;
  }

  /** Get a specific database by ID */
  getDatabase(id: string): LoadedDatabase | undefined {
    return this.databases.get(id);
  }

  /** Get raw data for a file-backed database */
  getData(id: string): any | undefined {
    return this.databases.get(id)?.data;
  }

  /** List all databases with metadata */
  list(): { id: string; name: string; type: string; entry_count: number; status: string }[] {
    return [...this.databases.values()].map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      entry_count: d.entry_count,
      status: d.status
    }));
  }

  /** Search across all file-backed databases by text query */
  search(query: string, limit: number = 5): { database_id: string; matches: any[] }[] {
    const results: { database_id: string; matches: any[] }[] = [];
    const q = query.toLowerCase();

    for (const [id, db] of this.databases) {
      if (!db.data || db.type !== "file-backed") continue;

      const matches: any[] = [];
      const data = db.data;

      // Search JSON data recursively for matching values
      const searchObj = (obj: any, path: string): void => {
        if (matches.length >= limit) return;
        if (obj === null || obj === undefined) return;

        if (typeof obj === "string" && obj.toLowerCase().includes(q)) {
          matches.push({ path, value: obj.length > 200 ? obj.slice(0, 200) + "..." : obj });
          return;
        }

        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length && matches.length < limit; i++) {
            searchObj(obj[i], `${path}[${i}]`);
          }
          return;
        }

        if (typeof obj === "object") {
          for (const [key, val] of Object.entries(obj)) {
            if (matches.length >= limit) break;
            // Check key name too
            if (key.toLowerCase().includes(q)) {
              matches.push({ path: `${path}.${key}`, key_match: true, value: typeof val === "object" ? `{${Object.keys(val as any).length} keys}` : val });
            } else {
              searchObj(val, `${path}.${key}`);
            }
          }
        }
      };

      searchObj(data, id);

      if (matches.length > 0) {
        results.push({ database_id: id, matches: matches.slice(0, limit) });
      }
    }

    return results;
  }

  getStats(): {
    total: number;
    file_backed: number;
    registry_backed: number;
    engine_inline: number;
    loaded_with_data: number;
    manifest_version: string;
  } {
    const all = [...this.databases.values()];
    return {
      total: all.length,
      file_backed: all.filter(d => d.type === "file-backed").length,
      registry_backed: all.filter(d => d.type === "registry-backed").length,
      engine_inline: all.filter(d => d.type === "engine-inline").length,
      loaded_with_data: all.filter(d => d.data !== null).length,
      manifest_version: this.manifest?.version || "unknown"
    };
  }
}

export const databaseRegistry = new DatabaseRegistry();
