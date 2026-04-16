/**
 * PresetLibraryEngine — Operator Preset Library
 * ================================================
 *
 * Lets machinists save, name, share, and compare their proven machining setups.
 * "6061 pocket on VF-2 with 3-flute = S8000 F2400" — currently on sticky notes,
 * now in a searchable, shareable library.
 *
 * 7 preset types:
 *   speed_feed      — Calculator S/F configs (material, tool, operation, params)
 *   toolpath        — Toolpath strategy params (stepover, stepdown, strategy)
 *   ppg_controller  — Post processor controller configs (validated against PostProcessorRegistry)
 *   machine_setup   — Machine setup configs (WCS, fixturing, stock)
 *   fixture         — Fixture/workholding configs
 *   holder          — Tool holder assemblies
 *   tool_assembly   — Complete tool+holder+preset combos
 *
 * Actions: preset_save, preset_list, preset_search, preset_share,
 *          preset_compare, preset_validate, preset_get, preset_delete,
 *          preset_increment_use
 *
 * @version 1.0.0 — Session 6-10 U-PRESET1
 * @see ShopToolLibraryEngine — production tool data (Fusion 360 CSV)
 * @see SpeedFeedOrchestratorEngine — calculator that consumes presets
 */

import * as crypto from "crypto";
import { log } from "../utils/Logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PresetType =
  | "speed_feed" | "toolpath" | "ppg_controller" | "machine_setup"
  | "fixture" | "holder" | "tool_assembly";

export interface Preset {
  id: string;
  user_id: string;
  preset_type: PresetType;
  name: string;
  description?: string;
  params: Record<string, unknown>;
  tags: string[];
  machine_id?: string;
  material_id?: string;
  operation?: string;
  is_shared: boolean;
  shared_by?: string;
  use_count: number;
  validated: boolean;
  validation_errors: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PresetComparison {
  presets: Array<{ id: string; name: string; preset_type: PresetType }>;
  param_keys: string[];
  diffs: Array<{
    key: string;
    values: Array<{ preset_id: string; value: unknown }>;
    all_equal: boolean;
  }>;
  recommendation?: string;
}

export interface PresetSearchResult {
  presets: Preset[];
  total: number;
  query?: string;
}

// ─── Validation Rules ─────────────────────────────────────────────────────────

/** Sane machining parameter ranges for validation. */
const SPEED_FEED_LIMITS: Record<string, { min: number; max: number; unit: string }> = {
  spindle_speed:    { min: 50,    max: 100000, unit: "RPM" },   // 100K for micro-machining/dental spindles
  surface_speed:    { min: 5,     max: 2500,   unit: "m/min" }, // 2500 for PCD/diamond on aluminum
  feed_rate:        { min: 10,    max: 50000,  unit: "mm/min" },
  feed_per_tooth:   { min: 0.001, max: 1.0,    unit: "mm/tooth" },
  feed_per_rev:     { min: 0.01,  max: 5.0,    unit: "mm/rev" },
  depth_of_cut:     { min: 0.01,  max: 100,    unit: "mm" },
  width_of_cut:     { min: 0.01,  max: 500,    unit: "mm" },
  stepover:         { min: 0.01,  max: 500,    unit: "mm" },
  stepdown:         { min: 0.01,  max: 100,    unit: "mm" },
  plunge_rate:      { min: 5,     max: 10000,  unit: "mm/min" },
};

const VALID_PRESET_TYPES = new Set<PresetType>([
  "speed_feed", "toolpath", "ppg_controller", "machine_setup",
  "fixture", "holder", "tool_assembly",
]);

// ─── Engine ───────────────────────────────────────────────────────────────────

const MAX_PRESETS_PER_USER = 500;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

export class PresetLibraryEngine {
  private presets = new Map<string, Preset>();  // id → Preset
  private userIndex = new Map<string, Set<string>>(); // user_id → Set<preset_id>

  /**
   * Save a new preset to the library.
   */
  savePreset(input: {
    user_id: string;
    preset_type: PresetType;
    name: string;
    description?: string;
    params: Record<string, unknown>;
    tags?: string[];
    machine_id?: string;
    material_id?: string;
    operation?: string;
  }): Preset {
    if (!input.user_id) throw new Error("user_id is required");
    if (!input.name?.trim()) throw new Error("name is required");
    if (!VALID_PRESET_TYPES.has(input.preset_type)) {
      throw new Error(`Invalid preset type: ${input.preset_type}. Valid: ${[...VALID_PRESET_TYPES].join(", ")}`);
    }
    if (!input.params || typeof input.params !== "object") {
      throw new Error("params must be a non-null object");
    }

    // Enforce per-user limit
    const userSet = this.userIndex.get(input.user_id);
    if (userSet && userSet.size >= MAX_PRESETS_PER_USER) {
      throw new Error(`Maximum ${MAX_PRESETS_PER_USER} presets per user`);
    }

    // Validate tags
    const tags = (input.tags ?? []).slice(0, MAX_TAGS).map((t) => t.slice(0, MAX_TAG_LENGTH).toLowerCase().trim()).filter(Boolean);

    // Auto-validate for speed_feed presets
    const validation = input.preset_type === "speed_feed"
      ? this.validateSpeedFeedParams(input.params)
      : { valid: true, errors: [] as string[] };

    const now = new Date().toISOString();
    const preset: Preset = {
      id: crypto.randomUUID(),
      user_id: input.user_id,
      preset_type: input.preset_type,
      name: input.name.trim(),
      description: input.description,
      params: input.params,
      tags,
      machine_id: input.machine_id,
      material_id: input.material_id,
      operation: input.operation,
      is_shared: false,
      use_count: 0,
      validated: validation.valid,
      validation_errors: validation.errors,
      metadata: {},
      created_at: now,
      updated_at: now,
    };

    this.presets.set(preset.id, preset);
    if (!this.userIndex.has(input.user_id)) {
      this.userIndex.set(input.user_id, new Set());
    }
    this.userIndex.get(input.user_id)!.add(preset.id);

    log.info(`[PresetLibrary] Saved ${input.preset_type} preset "${input.name}" for user ${input.user_id}`);
    return preset;
  }

  /**
   * Get a single preset by ID.
   */
  getPreset(presetId: string, userId?: string): Preset | null {
    const preset = this.presets.get(presetId);
    if (!preset) return null;
    if (preset.is_shared) return preset;
    if (!userId) return null;
    if (preset.user_id !== userId) return null;
    return preset;
  }

  /**
   * List presets for a user, optionally filtered.
   */
  listPresets(input: {
    user_id: string;
    preset_type?: PresetType;
    include_shared?: boolean;
    machine_id?: string;
    material_id?: string;
    operation?: string;
    limit?: number;
    offset?: number;
  }): PresetSearchResult {
    let results: Preset[] = [];
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);

    // User's own presets
    const userSet = this.userIndex.get(input.user_id) ?? new Set();
    for (const id of userSet) {
      const p = this.presets.get(id);
      if (p) results.push(p);
    }

    // Shared presets from others
    if (input.include_shared) {
      for (const p of this.presets.values()) {
        if (p.is_shared && p.user_id !== input.user_id) {
          results.push(p);
        }
      }
    }

    // Apply filters
    if (input.preset_type) results = results.filter((p) => p.preset_type === input.preset_type);
    if (input.machine_id) results = results.filter((p) => p.machine_id === input.machine_id);
    if (input.material_id) results = results.filter((p) => p.material_id === input.material_id);
    if (input.operation) results = results.filter((p) => p.operation === input.operation);

    // Sort: most used first
    results.sort((a, b) => b.use_count - a.use_count || b.updated_at.localeCompare(a.updated_at));

    return {
      presets: results.slice(offset, offset + limit),
      total: results.length,
    };
  }

  /**
   * Search presets by text query across name, description, tags, and operation.
   */
  searchPresets(input: {
    user_id: string;
    query: string;
    preset_type?: PresetType;
    include_shared?: boolean;
    limit?: number;
  }): PresetSearchResult {
    const q = (input.query ?? "").toLowerCase().trim();
    if (!q) return { presets: [], total: 0, query: q };

    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    let candidates: Preset[] = [];

    // Gather accessible presets
    const userSet = this.userIndex.get(input.user_id) ?? new Set();
    for (const id of userSet) {
      const p = this.presets.get(id);
      if (p) candidates.push(p);
    }
    if (input.include_shared !== false) {
      for (const p of this.presets.values()) {
        if (p.is_shared && p.user_id !== input.user_id) candidates.push(p);
      }
    }
    if (input.preset_type) candidates = candidates.filter((p) => p.preset_type === input.preset_type);

    // Score and rank
    const scored = candidates.map((p) => {
      let score = 0;
      const name = p.name.toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      const tagStr = p.tags.join(" ");
      const op = (p.operation ?? "").toLowerCase();

      if (name === q) score += 1.0;
      else if (name.startsWith(q)) score += 0.8;
      else if (name.includes(q)) score += 0.5;

      if (desc.includes(q)) score += 0.3;
      if (tagStr.includes(q)) score += 0.4;
      if (op.includes(q)) score += 0.3;

      return { preset: p, score };
    }).filter((s) => s.score > 0);

    scored.sort((a, b) => b.score - a.score);

    return {
      presets: scored.slice(0, limit).map((s) => s.preset),
      total: scored.length,
      query: q,
    };
  }

  /**
   * Share a preset (make it visible to all users).
   */
  sharePreset(presetId: string, userId: string): Preset {
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);
    if (preset.user_id !== userId) throw new Error("Cannot share another user's preset");

    preset.is_shared = true;
    preset.shared_by = userId;
    preset.updated_at = new Date().toISOString();

    log.info(`[PresetLibrary] Preset "${preset.name}" shared by ${userId}`);
    return preset;
  }

  /**
   * Unshare a preset.
   */
  unsharePreset(presetId: string, userId: string): Preset {
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);
    if (preset.user_id !== userId) throw new Error("Cannot unshare another user's preset");

    preset.is_shared = false;
    preset.updated_at = new Date().toISOString();
    return preset;
  }

  /**
   * Compare 2-5 presets side by side.
   */
  comparePresets(presetIds: string[], userId: string): PresetComparison {
    if (presetIds.length < 2) throw new Error("Need at least 2 presets to compare");
    if (presetIds.length > 5) throw new Error("Maximum 5 presets per comparison");

    const presets: Preset[] = [];
    for (const id of presetIds) {
      const p = this.getPreset(id, userId);
      if (!p) throw new Error(`Preset ${id} not found or not accessible`);
      presets.push(p);
    }

    // Ensure same type
    const types = new Set(presets.map((p) => p.preset_type));
    if (types.size > 1) throw new Error("Can only compare presets of the same type");

    // Collect all param keys
    const allKeys = new Set<string>();
    for (const p of presets) {
      for (const key of Object.keys(p.params)) allKeys.add(key);
    }

    const diffs: PresetComparison["diffs"] = [];
    for (const key of [...allKeys].sort()) {
      const values = presets.map((p) => ({
        preset_id: p.id,
        value: p.params[key] ?? null,
      }));
      const allEqual = values.every((v) => JSON.stringify(v.value) === JSON.stringify(values[0].value));
      diffs.push({ key, values, all_equal: allEqual });
    }

    // Generate recommendation
    const diffCount = diffs.filter((d) => !d.all_equal).length;
    let recommendation: string | undefined;
    if (diffCount === 0) {
      recommendation = "All presets are identical.";
    } else {
      const mostUsed = presets.reduce((a, b) => a.use_count > b.use_count ? a : b);
      recommendation = `${diffCount} parameter(s) differ. Most-used preset: "${mostUsed.name}" (${mostUsed.use_count} uses).`;
    }

    return {
      presets: presets.map((p) => ({ id: p.id, name: p.name, preset_type: p.preset_type })),
      param_keys: [...allKeys].sort(),
      diffs,
      recommendation,
    };
  }

  /**
   * Validate preset params against sane machining ranges.
   * For speed_feed presets, checks each numeric param against limits.
   */
  validatePreset(presetId: string): { valid: boolean; errors: string[] } {
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);

    const result = this.validateSpeedFeedParams(preset.params);
    preset.validated = result.valid;
    preset.validation_errors = result.errors;
    preset.updated_at = new Date().toISOString();
    return result;
  }

  /**
   * Increment use count (called when a preset is applied to a calculation).
   */
  incrementUseCount(presetId: string): { use_count: number } {
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);
    preset.use_count++;
    preset.updated_at = new Date().toISOString();
    return { use_count: preset.use_count };
  }

  /**
   * Delete a preset.
   */
  deletePreset(presetId: string, userId: string): { deleted: boolean } {
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);
    if (preset.user_id !== userId) throw new Error("Cannot delete another user's preset");

    this.presets.delete(presetId);
    this.userIndex.get(userId)?.delete(presetId);
    return { deleted: true };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private validateSpeedFeedParams(params: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, limit] of Object.entries(SPEED_FEED_LIMITS)) {
      const val = params[key];
      if (val === undefined || val === null) continue;
      if (typeof val !== "number") {
        errors.push(`${key}: expected number, got ${typeof val}`);
        continue;
      }
      if (val < limit.min) {
        errors.push(`${key}: ${val} ${limit.unit} is below minimum ${limit.min} ${limit.unit}`);
      }
      if (val > limit.max) {
        errors.push(`${key}: ${val} ${limit.unit} exceeds maximum ${limit.max} ${limit.unit}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const presetLibraryEngine = new PresetLibraryEngine();
