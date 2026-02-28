/**
 * PRISM Base Registry
 * ===================
 * Abstract base class for all data registries
 * Implements 4-layer hierarchy: CORE → ENHANCED → USER → LEARNED
 */

import { Logger } from '../utils/Logger.js';
import { Config } from '../utils/Config.js';
import { PATHS } from '../constants.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export type DataLayer = 'CORE' | 'ENHANCED' | 'USER' | 'LEARNED';

export interface RegistryItem {
  id: string;
  layer: DataLayer;
  [key: string]: any;
}

export interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  layer?: DataLayer;
}

export interface RegistryStats {
  total: number;
  byLayer: Record<DataLayer, number>;
  lastUpdated: string;
}

/**
 * Abstract Base Registry
 * All registries extend this class
 */
export abstract class BaseRegistry<T extends RegistryItem> {
  protected name: string;
  protected logger: Logger;
  protected items: Map<string, T> = new Map();
  protected layerPaths: Record<DataLayer, string>;
  protected initialized: boolean = false;

  /** M-025: TTL for cache invalidation in daemon mode (0 = no TTL, never expires) */
  protected ttlMs: number = 0;
  protected loadedAt: number = 0;

  constructor(name: string) {
    this.name = name;
    this.logger = new Logger(`Registry:${name}`);
    
    // Default layer paths - override in subclasses
    const basePath = Config.get('dataPath', PATHS.EXTRACTED_DIR);
    this.layerPaths = {
      CORE: path.join(basePath, this.getCorePath()),
      ENHANCED: path.join(basePath, this.getEnhancedPath()),
      USER: path.join(Config.get('userDataPath', path.join(PATHS.DATA_DIR, 'user')), this.name),
      LEARNED: path.join(Config.get('learnedDataPath', path.join(PATHS.DATA_DIR, 'learned')), this.name),
    };
  }

  /**
   * Get the relative path for CORE data
   */
  protected abstract getCorePath(): string;

  /**
   * Get the relative path for ENHANCED data
   */
  protected abstract getEnhancedPath(): string;

  /**
   * Parse a single item from raw data
   */
  protected abstract parseItem(data: any, layer: DataLayer): T;

  /**
   * Validate an item before adding
   */
  protected abstract validateItem(item: T): { valid: boolean; errors: string[] };

  /**
   * Initialize the registry by loading all data
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing registry...');
    const startTime = Date.now();

    // Load from all layers in priority order (LEARNED first, CORE last)
    // Later loads DON'T overwrite - LEARNED takes precedence
    for (const layer of ['CORE', 'ENHANCED', 'USER', 'LEARNED'] as DataLayer[]) {
      try {
        await this.loadLayer(layer);
      } catch (error) {
        this.logger.warn(`Failed to load ${layer} layer`, error);
      }
    }

    this.initialized = true;
    this.loadedAt = Date.now();  // M-025: record for TTL check
    const duration = this.loadedAt - startTime;
    this.logger.info(`Initialized with ${this.items.size} items in ${duration}ms`);
  }

  /**
   * Load data from a specific layer
   */
  protected async loadLayer(layer: DataLayer): Promise<void> {
    const layerPath = this.layerPaths[layer];
    
    try {
      const stats = await fs.stat(layerPath);
      
      if (stats.isDirectory()) {
        await this.loadDirectory(layerPath, layer);
      } else if (stats.isFile()) {
        await this.loadFile(layerPath, layer);
      }
    } catch (error) {
      // Path doesn't exist - that's OK for USER and LEARNED layers
      if (layer === 'CORE' || layer === 'ENHANCED') {
        this.logger.debug(`Layer path not found: ${layerPath}`);
      }
    }
  }

  /**
   * Load all files from a directory
   */
  protected async loadDirectory(dirPath: string, layer: DataLayer): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        await this.loadFile(path.join(dirPath, entry.name), layer);
      }
    }
  }

  /**
   * Load items from a JSON file
   */
  protected async loadFile(filePath: string, layer: DataLayer): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Handle both array and object formats
      const items = Array.isArray(data) ? data : (data.items || data.data || [data]);
      
      for (const itemData of items) {
        const item = this.parseItem(itemData, layer);
        
        // Only add if not already present (preserve higher layer priority)
        if (!this.items.has(item.id)) {
          this.items.set(item.id, item);
        }
      }
      
      this.logger.debug(`Loaded ${items.length} items from ${path.basename(filePath)}`);
    } catch (error) {
      this.logger.error(`Failed to load file: ${filePath}`, error);
    }
  }

  /**
   * Get an item by ID
   */
  async get(id: string): Promise<T | null> {
    await this.ensureInitialized();
    return this.items.get(id) || null;
  }

  /**
   * Search items
   */
  async search(options: SearchOptions): Promise<T[]> {
    await this.ensureInitialized();
    
    let results = Array.from(this.items.values());
    
    // Filter by layer
    if (options.layer) {
      results = results.filter(item => item.layer === options.layer);
    }
    
    // Apply filters
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        results = results.filter(item => this.matchFilter(item, key, value));
      }
    }
    
    // Text search
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(item => this.matchQuery(item, query));
    }
    
    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    results = results.slice(offset, offset + limit);
    
    return results;
  }

  /**
   * List all items
   */
  async list(): Promise<T[]> {
    await this.ensureInitialized();
    return Array.from(this.items.values());
  }

  /**
   * Add an item
   */
  async add(item: T): Promise<{ success: boolean; errors?: string[] }> {
    await this.ensureInitialized();
    
    const validation = this.validateItem(item);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    // Set layer to USER if not specified
    if (!item.layer) {
      item.layer = 'USER';
    }
    
    // Only allow adding to USER or LEARNED layers
    if (item.layer !== 'USER' && item.layer !== 'LEARNED') {
      return { success: false, errors: ['Can only add to USER or LEARNED layers'] };
    }
    
    this.items.set(item.id, item);
    await this.persistItem(item);
    
    return { success: true };
  }

  /**
   * Update an item
   */
  async update(id: string, updates: Partial<T>): Promise<{ success: boolean; errors?: string[] }> {
    await this.ensureInitialized();
    
    const existing = this.items.get(id);
    if (!existing) {
      return { success: false, errors: ['Item not found'] };
    }
    
    // Can only update USER or LEARNED items
    if (existing.layer !== 'USER' && existing.layer !== 'LEARNED') {
      // Create a USER layer override instead
      const userItem = { ...existing, ...updates, layer: 'USER' as DataLayer };
      this.items.set(id, userItem);
      await this.persistItem(userItem);
      return { success: true };
    }
    
    const updated = { ...existing, ...updates };
    const validation = this.validateItem(updated);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    this.items.set(id, updated);
    await this.persistItem(updated);
    
    return { success: true };
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<RegistryStats> {
    await this.ensureInitialized();
    
    const byLayer: Record<DataLayer, number> = {
      CORE: 0,
      ENHANCED: 0,
      USER: 0,
      LEARNED: 0,
    };
    
    for (const item of this.items.values()) {
      byLayer[item.layer]++;
    }
    
    return {
      total: this.items.size,
      byLayer,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Handle MCP tool call - override in subclasses
   */
  abstract handleTool(name: string, args: any): Promise<any>;

  /**
   * Ensure registry is initialized
   */
  protected async ensureInitialized(): Promise<void> {
    // M-025: Re-initialize if TTL expired (daemon mode cache invalidation)
    if (this.initialized && this.ttlMs > 0 && Date.now() - this.loadedAt > this.ttlMs) {
      this.logger.info(`TTL expired (${this.ttlMs}ms) — reloading registry`);
      this.initialized = false;
      this.items.clear();
    }
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /** M-025: Set TTL for cache invalidation. 0 = no TTL (default). */
  setTtl(ttlMs: number): void {
    this.ttlMs = ttlMs;
    this.logger.info(`TTL set to ${ttlMs}ms`);
  }

  /** M-025: Check if registry data is stale */
  isStale(): boolean {
    if (!this.initialized || this.ttlMs === 0) return false;
    return Date.now() - this.loadedAt > this.ttlMs;
  }

  /**
   * Match an item against a filter
   */
  protected matchFilter(item: T, key: string, value: any): boolean {
    const itemValue = this.getNestedValue(item, key);
    
    if (itemValue === undefined) return false;
    
    if (typeof value === 'object' && value !== null) {
      // Range filter
      if ('min' in value && itemValue < value.min) return false;
      if ('max' in value && itemValue > value.max) return false;
      return true;
    }
    
    // Exact match or contains
    if (typeof itemValue === 'string' && typeof value === 'string') {
      return itemValue.toLowerCase().includes(value.toLowerCase());
    }
    
    return itemValue === value;
  }

  /**
   * Match an item against a text query
   */
  protected matchQuery(item: T, query: string): boolean {
    const searchableText = JSON.stringify(item).toLowerCase();
    return searchableText.includes(query);
  }

  /**
   * Get nested value from object
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Persist an item to storage
   */
  protected async persistItem(item: T): Promise<void> {
    const layerPath = this.layerPaths[item.layer];
    
    // Ensure directory exists
    await fs.mkdir(layerPath, { recursive: true });
    
    // Write to individual file
    const filePath = path.join(layerPath, `${item.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(item, null, 2));
    
    this.logger.debug(`Persisted item: ${item.id}`);
  }
}

export default BaseRegistry;
