/**
 * FrequentPathEngine — Access frequency tracking for predictive optimization
 *
 * Tracks which files, engines, actions, and tools are accessed most
 * frequently. Enables predictive preloading and smarter defaults.
 * Persists frequency data to disk for cross-session learning.
 *
 * Token savings: Prioritizes commonly-used resources in search results
 * and boot sequences, reducing discovery overhead.
 *
 * @version 1.0.0
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { log } from "../utils/Logger.js";

const FREQ_FILE = join(import.meta.dirname, "../../state/frequency_data.json");

export interface FrequencyEntry {
  path: string;
  count: number;
  lastAccess: number;
  category: string;
}

export interface FrequencyData {
  version: number;
  entries: Record<string, FrequencyEntry>;
  sessionCount: number;
  lastUpdate: number;
}

export class FrequentPathEngine {
  private data: FrequencyData | null = null;
  private dirty = false;

  /**
   * Record an access to a path/resource.
   */
  record(path: string, category = "file"): void {
    this.ensureLoaded();
    const key = `${category}:${path}`;
    const entry = this.data!.entries[key];

    if (entry) {
      entry.count++;
      entry.lastAccess = Date.now();
    } else {
      this.data!.entries[key] = {
        path,
        count: 1,
        lastAccess: Date.now(),
        category,
      };
    }
    this.dirty = true;
  }

  /**
   * Get top N most frequently accessed resources.
   */
  getTop(n = 10, category?: string): FrequencyEntry[] {
    this.ensureLoaded();
    let entries = Object.values(this.data!.entries);

    if (category) {
      entries = entries.filter(e => e.category === category);
    }

    return entries
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  /**
   * Get top resources by recency-weighted frequency.
   * Score = count * recency_factor (where recency decays over time)
   */
  getTopWeighted(n = 10, category?: string): Array<FrequencyEntry & { score: number }> {
    this.ensureLoaded();
    const now = Date.now();
    const DAY = 86400000;

    let entries = Object.values(this.data!.entries);
    if (category) entries = entries.filter(e => e.category === category);

    return entries
      .map(e => {
        const ageInDays = (now - e.lastAccess) / DAY;
        const recencyFactor = Math.max(0.1, 1 - ageInDays * 0.05);
        return { ...e, score: Math.round(e.count * recencyFactor * 100) / 100 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  /**
   * Get frequency for a specific path.
   */
  getFrequency(path: string, category = "file"): number {
    this.ensureLoaded();
    return this.data!.entries[`${category}:${path}`]?.count || 0;
  }

  /**
   * Get all categories with counts.
   */
  getCategories(): Record<string, number> {
    this.ensureLoaded();
    const cats: Record<string, number> = {};
    for (const entry of Object.values(this.data!.entries)) {
      cats[entry.category] = (cats[entry.category] || 0) + 1;
    }
    return cats;
  }

  /**
   * Get summary stats.
   */
  getStats(): { totalEntries: number; categories: number; totalAccesses: number } {
    this.ensureLoaded();
    const entries = Object.values(this.data!.entries);
    return {
      totalEntries: entries.length,
      categories: Object.keys(this.getCategories()).length,
      totalAccesses: entries.reduce((s, e) => s + e.count, 0),
    };
  }

  /**
   * Persist frequency data to disk.
   */
  save(): void {
    if (!this.dirty || !this.data) return;
    try {
      const dir = dirname(FREQ_FILE);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      this.data.lastUpdate = Date.now();
      writeFileSync(FREQ_FILE, JSON.stringify(this.data, null, 2));
      this.dirty = false;
    } catch (e: any) {
      log.warn(`[FrequentPath] Save failed: ${e.message}`);
    }
  }

  /**
   * Clear all frequency data.
   */
  clear(): void {
    this.data = this.createEmpty();
    this.dirty = true;
  }

  // ── Private ──────────────────────────────────────────────────

  private ensureLoaded(): void {
    if (this.data) return;
    this.load();
  }

  private load(): void {
    try {
      if (existsSync(FREQ_FILE)) {
        this.data = JSON.parse(readFileSync(FREQ_FILE, "utf-8"));
        return;
      }
    } catch (e: any) {
      log.warn(`[FrequentPath] Load failed: ${e.message}`);
    }
    this.data = this.createEmpty();
  }

  private createEmpty(): FrequencyData {
    return {
      version: 1,
      entries: {},
      sessionCount: 0,
      lastUpdate: Date.now(),
    };
  }
}

export const frequentPathEngine = new FrequentPathEngine();
