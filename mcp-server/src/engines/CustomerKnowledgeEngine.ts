/**
 * CustomerKnowledgeEngine — TK-MS11
 *
 * Manages customer-specific knowledge profiles for personalized tribal knowledge.
 * Learns shop-specific preferences, material expertise, machine configurations,
 * and job history patterns. JM Die Company is the canonical test case.
 *
 * @module CustomerKnowledgeEngine
 * @since TK-MS11
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ModifierType = "speed_factor" | "feed_factor" | "doc_factor" | "confidence_boost";

export interface CustomerKnowledgeProfile {
  shop_id: string;
  name: string;
  industry?: string;
  expertise_areas: string[];
  primary_machines: string[];
  specializations: string[];
  customer_base: string[];
  confidence_settings: {
    base_boost: number;
    expertise_multiplier: number;
    history_weight: number;
  };
  learned_modifiers: ShopModifier[];
  created_at: string;
  updated_at?: string;
}

export interface ShopModifier {
  id: string;
  modifier_type: ModifierType;
  value: number;
  context: ModifierContext;
  confidence: number;
  observation_count: number;
  created_at: string;
  updated_at?: string;
}

export interface ModifierContext {
  material?: string;
  operation?: string;
  machine?: string;
  speed_used?: number;
  feed_used?: number;
}

export interface ModifierOutcome {
  success: boolean;
  quality?: string;
  surface_finish?: string;
  speed_factor?: number;
  feed_factor?: number;
  failure_reason?: string;
}

export interface JobOutcome {
  success: boolean;
  material?: string;
  operation?: string;
  machine?: string;
  cycle_time_reduction?: number;
  quality?: string;
  failure_reason?: string;
}

export interface JobHistoryEntry {
  job_id: string;
  shop_id: string;
  tips_used: string[];
  outcome: JobOutcome;
  recorded_at: string;
}

export interface JobPattern {
  pattern_type: "material_frequency" | "machine_utilization" | "operation_sequence" | "tip_success";
  description: string;
  confidence: number;
  supporting_jobs: number;
  data: Record<string, unknown>;
}

export interface ModifiedTip {
  id: string;
  title: string;
  confidence?: number;
  tags?: string[];
  shop_modified: boolean;
  original_confidence: number;
  boosted_confidence: number;
  applied_modifiers: string[];
}

export interface BoostedTip {
  id: string;
  title: string;
  confidence?: number;
  tags?: string[];
  history_boost: number;
  boost_reason?: string;
}

export interface ProfiledSearchResult {
  tip: {
    id: string;
    title: string;
    tags?: string[];
    confidence?: number;
  };
  profile_relevance: number;
  expertise_match: boolean;
  search_score: number;
}

export interface FilteredTip {
  id: string;
  title: string;
  tags?: string[];
  confidence?: number;
  expertise_match: boolean;
}

export interface RankedTip {
  id: string;
  title: string;
  tags?: string[];
  confidence?: number;
  combined_relevance: number;
  relevance_breakdown: {
    base_confidence: number;
    expertise_boost: number;
    history_boost: number;
    context_match: number;
  };
}

interface ProfileConfig {
  name: string;
  industry?: string;
  expertise_areas?: string[];
  primary_machines?: string[];
  specializations?: string[];
  customer_base?: string[];
}

interface ProfileUpdate {
  name?: string;
  industry?: string;
  expertise_areas?: string[];
  primary_machines?: string[];
  specializations?: string[];
  customer_base?: string[];
}

interface SearchOptions {
  limit?: number;
}

interface FilterOptions {
  strict?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic tribal tips for search/filtering
// ─────────────────────────────────────────────────────────────────────────────

const SYNTHETIC_TIPS = [
  { id: "tk-001", title: "D2 Tool Steel Roughing Strategy", tags: ["d2", "tool-steel", "roughing"], confidence: 0.85 },
  { id: "tk-002", title: "M2 High Speed Steel Finishing", tags: ["m2", "hss", "finishing"], confidence: 0.82 },
  { id: "tk-003", title: "S7 Shock-Resistant Steel Guidelines", tags: ["s7", "tool-steel", "shock"], confidence: 0.78 },
  { id: "tk-004", title: "A2 Air-Hardening Steel Tips", tags: ["a2", "tool-steel", "air-hardening"], confidence: 0.80 },
  { id: "tk-005", title: "H13 Hot Work Die Steel", tags: ["h13", "die-steel", "hot-work"], confidence: 0.79 },
  { id: "tk-006", title: "Tungsten Carbide Machining", tags: ["tungsten-carbide", "carbide", "hard-material"], confidence: 0.88 },
  { id: "tk-007", title: "Okuma Lathe Best Practices", tags: ["okuma", "lathe", "cnc"], confidence: 0.84 },
  { id: "tk-008", title: "Work Hardening Prevention", tags: ["work-hardening", "stainless", "prevention"], confidence: 0.86 },
  { id: "tk-009", title: "Die Tooling Optimization", tags: ["die-tooling", "tooling", "optimization"], confidence: 0.81 },
  { id: "tk-010", title: "Cold Heading Die Manufacturing", tags: ["cold-heading", "die", "fastener"], confidence: 0.83 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

class CustomerKnowledgeEngine {
  private profiles: Map<string, CustomerKnowledgeProfile> = new Map();
  private jobHistory: Map<string, JobHistoryEntry[]> = new Map();
  private modifierIdCounter = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // U1: Profile Management
  // ─────────────────────────────────────────────────────────────────────────

  createProfile(shop_id: string, config: ProfileConfig): CustomerKnowledgeProfile {
    const profile: CustomerKnowledgeProfile = {
      shop_id,
      name: config.name,
      industry: config.industry,
      expertise_areas: config.expertise_areas ?? [],
      primary_machines: config.primary_machines ?? [],
      specializations: config.specializations ?? [],
      customer_base: config.customer_base ?? [],
      confidence_settings: {
        base_boost: 0.1,
        expertise_multiplier: 1.2,
        history_weight: 0.3,
      },
      learned_modifiers: [],
      created_at: new Date().toISOString(),
    };

    this.profiles.set(shop_id, profile);
    this.jobHistory.set(shop_id, []);

    return profile;
  }

  getProfile(shop_id: string): CustomerKnowledgeProfile | null {
    return this.profiles.get(shop_id) ?? null;
  }

  updateProfile(shop_id: string, updates: ProfileUpdate): void {
    const profile = this.profiles.get(shop_id);
    if (!profile) return;

    if (updates.name !== undefined) profile.name = updates.name;
    if (updates.industry !== undefined) profile.industry = updates.industry;
    if (updates.expertise_areas !== undefined) profile.expertise_areas = updates.expertise_areas;
    if (updates.primary_machines !== undefined) profile.primary_machines = updates.primary_machines;
    if (updates.specializations !== undefined) profile.specializations = updates.specializations;
    if (updates.customer_base !== undefined) profile.customer_base = updates.customer_base;

    profile.updated_at = new Date().toISOString();
    this.profiles.set(shop_id, profile);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U2: Shop-Specific Modifier Learning
  // ─────────────────────────────────────────────────────────────────────────

  learnShopModifier(
    shop_id: string,
    context: ModifierContext,
    outcome: ModifierOutcome
  ): ShopModifier {
    const profile = this.profiles.get(shop_id);
    if (!profile) {
      throw new Error(`Profile not found: ${shop_id}`);
    }

    // Check for existing modifier with same context
    const existingIdx = profile.learned_modifiers.findIndex(
      m => m.context.material === context.material && m.context.operation === context.operation
    );

    if (existingIdx >= 0) {
      // Update existing modifier
      const existing = profile.learned_modifiers[existingIdx];
      existing.observation_count++;
      existing.confidence = Math.min(0.95, existing.confidence + 0.1);
      existing.updated_at = new Date().toISOString();

      if (outcome.speed_factor !== undefined) {
        existing.value = (existing.value + outcome.speed_factor) / 2;
      }

      return existing;
    }

    // Determine modifier type based on outcome
    let modifierType: ModifierType = "confidence_boost";
    let value = 1.0;

    if (outcome.speed_factor !== undefined) {
      modifierType = "speed_factor";
      value = outcome.speed_factor;
    } else if (outcome.feed_factor !== undefined) {
      modifierType = "feed_factor";
      value = outcome.feed_factor;
    } else if (outcome.success) {
      modifierType = "confidence_boost";
      value = 0.1;
    }

    const modifier: ShopModifier = {
      id: `mod-${++this.modifierIdCounter}`,
      modifier_type: modifierType,
      value,
      context,
      confidence: outcome.success ? 0.6 : 0.3,
      observation_count: 1,
      created_at: new Date().toISOString(),
    };

    profile.learned_modifiers.push(modifier);
    return modifier;
  }

  applyShopModifiers(
    tips: Array<{ id: string; title: string; confidence?: number; tags?: string[] }>,
    shop_id: string
  ): ModifiedTip[] {
    const profile = this.profiles.get(shop_id);

    return tips.map(tip => {
      const originalConfidence = tip.confidence ?? 0.5;
      let boostedConfidence = originalConfidence;
      const appliedModifiers: string[] = [];

      if (profile) {
        // Apply expertise boost if tags match expertise
        const expertise = profile.expertise_areas.map(e => e.toLowerCase());
        const tipTags = (tip.tags ?? []).map(t => t.toLowerCase());

        const expertiseMatch = tipTags.some(tag => expertise.includes(tag));
        if (expertiseMatch) {
          boostedConfidence *= profile.confidence_settings.expertise_multiplier;
          appliedModifiers.push("expertise_match");
        }

        // Apply learned modifiers
        for (const mod of profile.learned_modifiers) {
          if (mod.modifier_type === "confidence_boost") {
            boostedConfidence += mod.value * mod.confidence;
            appliedModifiers.push(mod.id);
          }
        }
      }

      return {
        id: tip.id,
        title: tip.title,
        confidence: tip.confidence,
        tags: tip.tags,
        shop_modified: true,
        original_confidence: originalConfidence,
        boosted_confidence: Math.min(1.0, boostedConfidence),
        applied_modifiers: appliedModifiers,
      };
    });
  }

  getShopModifiers(shop_id: string, filter?: { material?: string }): ShopModifier[] {
    const profile = this.profiles.get(shop_id);
    if (!profile) return [];

    let modifiers = profile.learned_modifiers;

    if (filter?.material) {
      modifiers = modifiers.filter(m => m.context.material === filter.material);
    }

    return modifiers;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U3: Job History Relevance Boosting
  // ─────────────────────────────────────────────────────────────────────────

  recordJobOutcome(
    shop_id: string,
    job_id: string,
    tips_used: string[],
    outcome: JobOutcome
  ): void {
    const history = this.jobHistory.get(shop_id) ?? [];

    const entry: JobHistoryEntry = {
      job_id,
      shop_id,
      tips_used,
      outcome,
      recorded_at: new Date().toISOString(),
    };

    history.push(entry);
    this.jobHistory.set(shop_id, history);
  }

  getJobHistory(shop_id: string, limit: number): JobHistoryEntry[] {
    const history = this.jobHistory.get(shop_id) ?? [];
    return history.slice(-limit);
  }

  analyzeJobHistory(shop_id: string, _days: number): JobPattern[] {
    const history = this.jobHistory.get(shop_id) ?? [];
    const patterns: JobPattern[] = [];

    // Analyze material frequency
    const materialCounts: Record<string, number> = {};
    for (const entry of history) {
      if (entry.outcome.material) {
        materialCounts[entry.outcome.material] = (materialCounts[entry.outcome.material] ?? 0) + 1;
      }
    }

    for (const [material, count] of Object.entries(materialCounts)) {
      if (count >= 2) {
        patterns.push({
          pattern_type: "material_frequency",
          description: `Frequent jobs with ${material}`,
          confidence: Math.min(0.95, 0.5 + count * 0.1),
          supporting_jobs: count,
          data: { material, count },
        });
      }
    }

    // Analyze machine utilization
    const machineCounts: Record<string, number> = {};
    for (const entry of history) {
      if (entry.outcome.machine) {
        machineCounts[entry.outcome.machine] = (machineCounts[entry.outcome.machine] ?? 0) + 1;
      }
    }

    for (const [machine, count] of Object.entries(machineCounts)) {
      patterns.push({
        pattern_type: "machine_utilization",
        description: `Machine ${machine} utilization pattern`,
        confidence: Math.min(0.95, 0.4 + count * 0.15),
        supporting_jobs: count,
        data: { machine, count },
      });
    }

    // Analyze tip success rates
    const tipSuccess: Record<string, { success: number; total: number }> = {};
    for (const entry of history) {
      for (const tip of entry.tips_used) {
        if (!tipSuccess[tip]) {
          tipSuccess[tip] = { success: 0, total: 0 };
        }
        tipSuccess[tip].total++;
        if (entry.outcome.success) {
          tipSuccess[tip].success++;
        }
      }
    }

    for (const [tip, stats] of Object.entries(tipSuccess)) {
      if (stats.total >= 2) {
        const successRate = stats.success / stats.total;
        patterns.push({
          pattern_type: "tip_success",
          description: `Tip ${tip} success rate: ${(successRate * 100).toFixed(0)}%`,
          confidence: Math.min(0.95, 0.3 + stats.total * 0.1),
          supporting_jobs: stats.total,
          data: { tip, success_rate: successRate, observations: stats.total },
        });
      }
    }

    return patterns;
  }

  boostByHistory(
    tips: Array<{ id: string; title: string; confidence?: number; tags?: string[] }>,
    context: { material?: string; operation?: string; machine?: string },
    shop_id: string
  ): BoostedTip[] {
    const history = this.jobHistory.get(shop_id) ?? [];

    return tips.map(tip => {
      let historyBoost = 0;
      let boostReason: string | undefined;

      // Find jobs where this tip was used
      const relevantJobs = history.filter(entry => {
        const tipUsed = entry.tips_used.includes(tip.id);
        const materialMatch = !context.material || entry.outcome.material === context.material;
        return tipUsed && materialMatch;
      });

      if (relevantJobs.length > 0) {
        const successfulJobs = relevantJobs.filter(j => j.outcome.success);
        const failedJobs = relevantJobs.filter(j => !j.outcome.success);

        if (successfulJobs.length > 0) {
          historyBoost = 0.1 * successfulJobs.length;
          boostReason = `Succeeded in ${successfulJobs.length} similar job(s)`;
        }

        if (failedJobs.length > 0) {
          historyBoost -= 0.15 * failedJobs.length;
          boostReason = `Failed in ${failedJobs.length} similar job(s)`;
        }
      }

      return {
        id: tip.id,
        title: tip.title,
        confidence: tip.confidence,
        tags: tip.tags,
        history_boost: historyBoost,
        boost_reason: historyBoost !== 0 ? boostReason : undefined,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U4: Profile-Based Search & Filtering
  // ─────────────────────────────────────────────────────────────────────────

  searchWithProfile(
    query: string,
    shop_id: string,
    options?: SearchOptions
  ): ProfiledSearchResult[] {
    const profile = this.profiles.get(shop_id);
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    // Search synthetic tips
    const results: ProfiledSearchResult[] = [];

    for (const tip of SYNTHETIC_TIPS) {
      // Basic text matching
      const titleLower = tip.title.toLowerCase();
      const tagsLower = tip.tags.map(t => t.toLowerCase());

      let searchScore = 0;
      for (const term of queryTerms) {
        if (titleLower.includes(term)) searchScore += 0.3;
        if (tagsLower.some(t => t.includes(term))) searchScore += 0.2;
      }

      if (searchScore === 0) continue;

      // Calculate profile relevance
      let profileRelevance = 0.5;
      let expertiseMatch = false;

      if (profile) {
        const expertise = profile.expertise_areas.map(e => e.toLowerCase());
        expertiseMatch = tagsLower.some(tag => expertise.includes(tag));

        if (expertiseMatch) {
          profileRelevance = 0.9;
        }

        // Check machine match
        const machines = profile.primary_machines.map(m => m.toLowerCase());
        if (tagsLower.some(tag => machines.some(m => m.includes(tag)))) {
          profileRelevance = Math.max(profileRelevance, 0.8);
        }

        // Check specialization match
        const specs = profile.specializations.map(s => s.toLowerCase().replace(/_/g, "-"));
        if (tagsLower.some(tag => specs.some(s => tag.includes(s) || s.includes(tag)))) {
          profileRelevance = Math.max(profileRelevance, 0.75);
        }
      }

      results.push({
        tip: {
          id: tip.id,
          title: tip.title,
          tags: tip.tags,
          confidence: tip.confidence,
        },
        profile_relevance: profileRelevance,
        expertise_match: expertiseMatch,
        search_score: searchScore,
      });
    }

    // Sort by combined score
    results.sort((a, b) => {
      const scoreA = a.search_score + a.profile_relevance;
      const scoreB = b.search_score + b.profile_relevance;
      return scoreB - scoreA;
    });

    // Apply limit
    const limit = options?.limit ?? 10;
    return results.slice(0, limit);
  }

  filterByExpertise(
    tips: Array<{ id: string; title: string; tags?: string[]; confidence?: number }>,
    shop_id: string,
    options?: FilterOptions
  ): FilteredTip[] {
    const profile = this.profiles.get(shop_id);
    const expertise = (profile?.expertise_areas ?? []).map(e => e.toLowerCase());

    const filtered: FilteredTip[] = [];

    for (const tip of tips) {
      const tipTags = (tip.tags ?? []).map(t => t.toLowerCase());
      const expertiseMatch = tipTags.some(tag => expertise.includes(tag));

      if (options?.strict && !expertiseMatch) {
        continue;
      }

      filtered.push({
        id: tip.id,
        title: tip.title,
        tags: tip.tags,
        confidence: tip.confidence,
        expertise_match: expertiseMatch,
      });
    }

    return filtered;
  }

  rankByRelevance(
    tips: Array<{ id: string; title: string; tags?: string[]; confidence?: number }>,
    shop_id: string,
    context: { material?: string; machine?: string; operation?: string }
  ): RankedTip[] {
    const profile = this.profiles.get(shop_id);
    const history = this.jobHistory.get(shop_id) ?? [];

    const ranked: RankedTip[] = tips.map(tip => {
      const baseConfidence = tip.confidence ?? 0.5;
      let expertiseBoost = 0;
      let historyBoost = 0;
      let contextMatch = 0;

      if (profile) {
        // Expertise boost
        const expertise = profile.expertise_areas.map(e => e.toLowerCase());
        const tipTags = (tip.tags ?? []).map(t => t.toLowerCase());

        if (tipTags.some(tag => expertise.includes(tag))) {
          expertiseBoost = 0.15;
        }

        // Machine match
        const machines = profile.primary_machines.map(m => m.toLowerCase());
        if (tipTags.some(tag => machines.some(m => m.includes(tag)))) {
          expertiseBoost += 0.1;
        }
      }

      // Context match
      if (context.material) {
        const tipTags = (tip.tags ?? []).map(t => t.toLowerCase());
        if (tipTags.includes(context.material.toLowerCase())) {
          contextMatch = 0.2;
        }
      }

      // History boost
      const relevantJobs = history.filter(entry => entry.tips_used.includes(tip.id));
      if (relevantJobs.length > 0) {
        const successRate = relevantJobs.filter(j => j.outcome.success).length / relevantJobs.length;
        historyBoost = (successRate - 0.5) * 0.3;
      }

      const combinedRelevance = Math.min(
        1.0,
        baseConfidence + expertiseBoost + historyBoost + contextMatch
      );

      return {
        id: tip.id,
        title: tip.title,
        tags: tip.tags,
        confidence: tip.confidence,
        combined_relevance: combinedRelevance,
        relevance_breakdown: {
          base_confidence: baseConfidence,
          expertise_boost: expertiseBoost,
          history_boost: historyBoost,
          context_match: contextMatch,
        },
      };
    });

    // Sort by combined relevance
    ranked.sort((a, b) => b.combined_relevance - a.combined_relevance);

    return ranked;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const customerKnowledgeEngine = new CustomerKnowledgeEngine();
