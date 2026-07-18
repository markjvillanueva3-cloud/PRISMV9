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

/** Database Registry engine/manager.
 */
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

  /** Load.
   * @returns void
   */
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

      /** For.
       * @param const - const
       * @returns void
       */
      for (const entry of this.manifest.databases) {
        // Only load file-backed databases (registry-backed ones are already loaded by their own registries)
        /** If.
         * @param entry.type - entry.type
         * @returns void
         */
        if (entry.type === "file-backed" && entry.source_file && entry.status !== "deferred") {
          const filePath = path.resolve(PATHS.MCP_SERVER, "..", entry.source_file);
          let data: any = null;
          try {
            if (fs.existsSync(filePath)) {
              const raw = fs.readFileSync(filePath, "utf-8");
              if (filePath.toLowerCase().endsWith(".jsonl")) {
                // JSONL = one JSON object per line; a single JSON.parse chokes on
                // line 2 (the bug that silently killed jm-vendor-ap-ledger, 20,736
                // entries). Parse line-by-line; load the good rows, fail loud on the
                // skip count rather than dropping the whole DB on one bad line.
                const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
                const parsed: any[] = [];
                let bad = 0;
                for (const line of lines) {
                  try { parsed.push(JSON.parse(line)); } catch { bad++; }
                }
                if (bad > 0) {
                  log.warn(`DatabaseRegistry: ${entry.id}: skipped ${bad}/${lines.length} unparseable JSONL line(s)`);
                }
                data = parsed;
              } else {
                data = JSON.parse(raw);
              }
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

  /** Checks whether is loaded.
   * @returns true if condition is met
   */
  isLoaded(): boolean {
    return this._loaded;
  }

  /** Clear.
   * @returns void
   */
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

    /** For.
     * @param const - const
     * @param db] - db]
     * @returns void
     */
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
          /** For.
           * @param let - let
           * @returns void
           */
          for (let i = 0; i < obj.length && matches.length < limit; i++) {
            searchObj(obj[i], `${path}[${i}]`);
          }
          return;
        }

        /** If.
         * @param typeof - typeof
         * @returns void
         */
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

      /** If.
       * @param matches.length - matches.length
       * @returns void
       */
      if (matches.length > 0) {
        results.push({ database_id: id, matches: matches.slice(0, limit) });
      }
    }

    return results;
  }

  /** Gets stats.
   * @returns void
   */
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

/** Database Registry constant.
 */
export const databaseRegistry = new DatabaseRegistry();
