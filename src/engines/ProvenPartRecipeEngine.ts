/**
 * ProvenPartRecipeEngine
 * =======================
 * CRUD + search + tagging for proven part recipes. Each recipe captures
 * the complete manufacturing pipeline (material, ops, S/F params, cycle time)
 * for a part that has been successfully manufactured.
 *
 * Actions (9):
 *   proven_recipe_create, proven_recipe_get, proven_recipe_update,
 *   proven_recipe_delete, proven_recipe_list, proven_recipe_search,
 *   proven_recipe_tag, proven_recipe_export, proven_recipe_import
 *
 * @module engines/ProvenPartRecipeEngine
 * @version 1.0.0
 */

// ============================================================================
// Types
// ============================================================================

export interface RecipeStep {
  operation: string;
  tool_diameter_mm: number;
  tool_type: string;
  rpm: number;
  feed_mmmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  coolant: string;
}

export interface ProvenRecipe {
  id: string;
  part_name: string;
  material: string;
  iso_group: string;
  hardness_hb?: number;
  dimensions?: { x: number; y: number; z: number };
  features: string[];
  tolerances: { dimension: string; value_mm: number }[];
  surface_finish_ra?: number;
  operations: string[];
  steps: RecipeStep[];
  cycle_time_min?: number;
  notes?: string;
  tags: string[];
  confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeSearchQuery {
  material?: string;
  iso_group?: string;
  operations?: string[];
  tags?: string[];
  min_hardness_hb?: number;
  max_hardness_hb?: number;
  part_name_contains?: string;
  feature_contains?: string;
}

// ============================================================================
// Engine
// ============================================================================

export class ProvenPartRecipeEngine {
  private recipes: Map<string, ProvenRecipe> = new Map();
  private reuseHistory: Map<string, any[]> = new Map();
  private nextId = 1;

  /** Generate unique recipe ID */
  private generateId(): string {
    return `PRR-${String(this.nextId++).padStart(5, "0")}`;
  }

  /** Create a new proven recipe */
  create(params: {
    part_name: string;
    material: string;
    iso_group: string;
    hardness_hb?: number;
    dimensions?: { x: number; y: number; z: number };
    features: string[];
    tolerances: { dimension: string; value_mm: number }[];
    surface_finish_ra?: number;
    operations: string[];
    steps: RecipeStep[];
    cycle_time_min?: number;
    notes?: string;
    tags: string[];
  }): ProvenRecipe {
    const now = new Date().toISOString();
    const recipe: ProvenRecipe = {
      id: this.generateId(),
      part_name: params.part_name,
      material: params.material,
      iso_group: params.iso_group,
      hardness_hb: params.hardness_hb,
      dimensions: params.dimensions,
      features: [...params.features],
      tolerances: [...params.tolerances],
      surface_finish_ra: params.surface_finish_ra,
      operations: [...params.operations],
      steps: params.steps.map((s) => ({ ...s })),
      cycle_time_min: params.cycle_time_min,
      notes: params.notes,
      tags: [...params.tags],
      confidence: 1.0,
      created_at: now,
      updated_at: now,
    };
    this.recipes.set(recipe.id, recipe);
    this.reuseHistory.set(recipe.id, []);
    return recipe;
  }

  /** Get recipe by ID */
  get(id: string): ProvenRecipe | undefined {
    return this.recipes.get(id);
  }

  /** Update recipe fields */
  update(
    id: string,
    updates: Partial<Omit<ProvenRecipe, "id" | "created_at">>
  ): ProvenRecipe | undefined {
    const existing = this.recipes.get(id);
    if (!existing) return undefined;
    const updated: ProvenRecipe = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    this.recipes.set(id, updated);
    return updated;
  }

  /** Delete recipe by ID */
  delete(id: string): boolean {
    const deleted = this.recipes.delete(id);
    if (deleted) this.reuseHistory.delete(id);
    return deleted;
  }

  /** List all recipes */
  list(): ProvenRecipe[] {
    return Array.from(this.recipes.values());
  }

  /** Search recipes by query */
  search(query: RecipeSearchQuery): ProvenRecipe[] {
    let results = Array.from(this.recipes.values());

    if (query.material) {
      const mat = query.material.toLowerCase();
      results = results.filter((r) => r.material.toLowerCase().includes(mat));
    }
    if (query.iso_group) {
      results = results.filter((r) => r.iso_group === query.iso_group);
    }
    if (query.operations && query.operations.length > 0) {
      results = results.filter((r) =>
        query.operations!.every((op) => r.operations.includes(op))
      );
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter((r) =>
        query.tags!.some((t) => r.tags.includes(t))
      );
    }
    if (query.min_hardness_hb !== undefined) {
      results = results.filter(
        (r) => r.hardness_hb !== undefined && r.hardness_hb >= query.min_hardness_hb!
      );
    }
    if (query.max_hardness_hb !== undefined) {
      results = results.filter(
        (r) => r.hardness_hb !== undefined && r.hardness_hb <= query.max_hardness_hb!
      );
    }
    if (query.part_name_contains) {
      const needle = query.part_name_contains.toLowerCase();
      results = results.filter((r) =>
        r.part_name.toLowerCase().includes(needle)
      );
    }
    if (query.feature_contains) {
      const needle = query.feature_contains.toLowerCase();
      results = results.filter((r) =>
        r.features.some((f) => f.toLowerCase().includes(needle))
      );
    }

    return results;
  }

  /** Add/remove tags */
  tag(
    id: string,
    action: "add" | "remove",
    tags: string[]
  ): ProvenRecipe | undefined {
    const recipe = this.recipes.get(id);
    if (!recipe) return undefined;
    if (action === "add") {
      for (const t of tags) {
        if (!recipe.tags.includes(t)) recipe.tags.push(t);
      }
    } else {
      recipe.tags = recipe.tags.filter((t) => !tags.includes(t));
    }
    recipe.updated_at = new Date().toISOString();
    return recipe;
  }

  /** Export all recipes as JSON-serializable array */
  export(): ProvenRecipe[] {
    return this.list();
  }

  /** Import recipes from array (merges, ID collisions overwrite) */
  import(recipes: ProvenRecipe[]): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;
    for (const r of recipes) {
      if (!r.id || !r.part_name || !r.material) {
        skipped++;
        continue;
      }
      this.recipes.set(r.id, { ...r });
      if (!this.reuseHistory.has(r.id)) {
        this.reuseHistory.set(r.id, []);
      }
      const numPart = parseInt(r.id.replace("PRR-", ""), 10);
      if (!isNaN(numPart) && numPart >= this.nextId) {
        this.nextId = numPart + 1;
      }
      imported++;
    }
    return { imported, skipped };
  }

  /** Record a reuse outcome */
  recordReuse(id: string, outcome: any): void {
    const history = this.reuseHistory.get(id);
    if (history) {
      history.push(outcome);
    }
  }

  /** Get reuse history for a recipe */
  getReuseHistory(id: string): any[] {
    return this.reuseHistory.get(id) ?? [];
  }

  /** Compute complexity score for a recipe */
  complexityScore(id: string): number {
    const recipe = this.recipes.get(id);
    if (!recipe) return 0;
    const featureCount = recipe.features.length;
    const tolCount = recipe.tolerances.length;
    const opCount = recipe.steps.length;
    const tightestTol = Math.min(
      ...recipe.tolerances.map((t) => t.value_mm),
      1.0
    );
    const tolFactor = tightestTol < 0.02 ? 3 : tightestTol < 0.05 ? 2 : 1;
    return Math.min(100, featureCount * 5 + tolCount * 8 * tolFactor + opCount * 6);
  }

  /** Clear all recipes (for testing) */
  _clear(): void {
    this.recipes.clear();
    this.reuseHistory.clear();
    this.nextId = 1;
  }
}

/** Singleton */
export const provenPartRecipeEngine = new ProvenPartRecipeEngine();
