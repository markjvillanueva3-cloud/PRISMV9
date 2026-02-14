/**
 * PRISM MCP Server - Registry Base
 * Base class and utilities for resource registries
 */

import { log } from "../utils/Logger.js";
import { readJsonFile, writeJsonFile, fileExists } from "../utils/files.js";

// ============================================================================
// REGISTRY TYPES
// ============================================================================

export interface RegistryMetadata {
  created: string;
  updated: string;
  version: number;
  source?: string;
}

export interface RegistryEntry<T> {
  id: string;
  data: T;
  metadata: RegistryMetadata;
}

export interface Registry<T> {
  name: string;
  version: string;
  lastUpdated: string;
  count: number;
  entries: Record<string, RegistryEntry<T>>;
}

// ============================================================================
// BASE REGISTRY CLASS
// ============================================================================

export class BaseRegistry<T> {
  protected entries: Map<string, RegistryEntry<T>> = new Map();
  protected loaded: boolean = false;
  
  constructor(
    protected name: string,
    protected filePath: string,
    protected version: string = "1.0.0"
  ) {}

  /**
   * Load registry from file
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.debug(`Loading registry: ${this.name}`);
    
    if (await fileExists(this.filePath)) {
      try {
        const data = await readJsonFile<Registry<T>>(this.filePath);
        
        for (const [id, entry] of Object.entries(data.entries)) {
          this.entries.set(id, entry);
        }
        
        log.info(`Registry ${this.name} loaded: ${this.entries.size} entries`);
      } catch (error) {
        log.warn(`Failed to load registry ${this.name}: ${error}`);
      }
    }
    
    this.loaded = true;
  }

  /**
   * Save registry to file
   */
  async save(): Promise<void> {
    const data: Registry<T> = {
      name: this.name,
      version: this.version,
      lastUpdated: new Date().toISOString(),
      count: this.entries.size,
      entries: Object.fromEntries(this.entries)
    };
    
    await writeJsonFile(this.filePath, data);
    log.debug(`Registry ${this.name} saved: ${this.entries.size} entries`);
  }

  /**
   * Get entry by ID
   */
  get(id: string): T | undefined {
    const entry = this.entries.get(id);
    return entry?.data;
  }

  /**
   * Check if entry exists
   */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Set entry
   */
  set(id: string, data: T, source?: string): void {
    const existing = this.entries.get(id);
    const now = new Date().toISOString();
    
    this.entries.set(id, {
      id,
      data,
      metadata: {
        created: existing?.metadata.created || now,
        updated: now,
        version: (existing?.metadata.version || 0) + 1,
        source
      }
    });
  }

  /**
   * Delete entry
   */
  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Get all entries
   */
  all(): T[] {
    return Array.from(this.entries.values()).map(e => e.data);
  }

  /**
   * Get all IDs
   */
  ids(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Get count
   */
  count(): number {
    return this.entries.size;
  }

  /**
   * Get size (alias for count)
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * List all entries as RegistryEntry[] (with id, data, metadata)
   */
  list(): RegistryEntry<T>[] {
    return Array.from(this.entries.values());
  }

  /**
   * Check if registry is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Search entries
   */
  search(predicate: (data: T, id: string) => boolean): T[] {
    const results: T[] = [];
    for (const [id, entry] of this.entries) {
      if (predicate(entry.data, id)) {
        results.push(entry.data);
      }
    }
    return results;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }
}

// ============================================================================
// REGISTRY MANAGER
// ============================================================================

/**
 * Manages multiple registries with lifecycle hooks
 */
export class RegistryManager {
  private registries: Map<string, BaseRegistry<unknown>> = new Map();
  
  register<T>(name: string, registry: BaseRegistry<T>): void {
    this.registries.set(name, registry as BaseRegistry<unknown>);
    log.debug(`Registry registered: ${name}`);
  }
  
  get<T>(name: string): BaseRegistry<T> | undefined {
    return this.registries.get(name) as BaseRegistry<T> | undefined;
  }
  
  async loadAll(): Promise<void> {
    log.info(`Loading ${this.registries.size} registries...`);
    
    await Promise.all(
      Array.from(this.registries.values()).map(r => r.load())
    );
    
    log.info("All registries loaded");
  }
  
  async saveAll(): Promise<void> {
    log.info(`Saving ${this.registries.size} registries...`);
    
    await Promise.all(
      Array.from(this.registries.values()).map(r => r.save())
    );
    
    log.info("All registries saved");
  }
  
  stats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [name, registry] of this.registries) {
      stats[name] = registry.count();
    }
    return stats;
  }
}

// Global registry manager instance
export const registryManager = new RegistryManager();
