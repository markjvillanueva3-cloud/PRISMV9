/**
 * InfiniteConditionCombinatorEngine — Handle Combinatorial Explosion
 *
 * Phase 0.25: Adaptive Variability Framework
 *
 * Material × Geometry × Machine × Tool × Conditions = effectively infinite.
 * Uses hierarchical Bayesian models to share information and interpolate
 * between known points.
 *
 * @module engines/InfiniteConditionCombinatorEngine
 */

export interface ConditionVector {
  material: string;
  geometry: string;
  machine: string;
  tool: string;
  operation: string;
  environment?: Record<string, number>;
}

export interface ConditionKnowledge {
  vector: ConditionVector;
  parameters: Record<string, number>;
  outcome: "success" | "marginal" | "failure";
  confidence: number;
  sampleCount: number;
  lastUpdated: string;
}

export interface SimilarityResult {
  vector: ConditionVector;
  similarity: number;
  knowledge: ConditionKnowledge;
}

export interface InterpolationResult {
  targetVector: ConditionVector;
  predictedParameters: Record<string, { value: number; confidence: number }>;
  basedOn: SimilarityResult[];
  interpolationMethod: "weighted_average" | "nearest_neighbor" | "hierarchical_bayes";
}

export interface HierarchyLevel {
  name: string;
  dimensions: string[];
  aggregatedKnowledge: Map<string, ConditionKnowledge[]>;
}

function vectorStringFields(vector: ConditionVector): Record<string, string> {
  return {
    material: vector.material,
    geometry: vector.geometry,
    machine: vector.machine,
    tool: vector.tool,
    operation: vector.operation,
  };
}

class InfiniteConditionCombinatorEngine {
  private knowledge: Map<string, ConditionKnowledge> = new Map();
  private hierarchyLevels: HierarchyLevel[] = [];
  private readonly similarityThreshold = 0.6;

  constructor() {
    this.initializeHierarchy();
  }

  /**
   * Initialize hierarchical levels for Bayesian sharing
   */
  private initializeHierarchy(): void {
    this.hierarchyLevels = [
      { name: "material_family", dimensions: ["material"], aggregatedKnowledge: new Map() },
      { name: "machine_type", dimensions: ["machine"], aggregatedKnowledge: new Map() },
      { name: "operation_class", dimensions: ["operation"], aggregatedKnowledge: new Map() },
      { name: "material_machine", dimensions: ["material", "machine"], aggregatedKnowledge: new Map() },
      { name: "full_context", dimensions: ["material", "geometry", "machine", "tool", "operation"], aggregatedKnowledge: new Map() },
    ];
  }

  /**
   * Generate unique key for condition vector
   */
  private vectorKey(vector: ConditionVector): string {
    return `${vector.material}|${vector.geometry}|${vector.machine}|${vector.tool}|${vector.operation}`;
  }

  /**
   * Record knowledge for a condition combination
   */
  recordKnowledge(
    vector: ConditionVector,
    parameters: Record<string, number>,
    outcome: "success" | "marginal" | "failure"
  ): ConditionKnowledge {
    const key = this.vectorKey(vector);
    const existing = this.knowledge.get(key);

    const knowledge: ConditionKnowledge = {
      vector,
      parameters: existing
        ? this.mergeParameters(existing.parameters, parameters, existing.sampleCount)
        : parameters,
      outcome,
      confidence: existing ? Math.min(0.99, existing.confidence + 0.05) : 0.5,
      sampleCount: (existing?.sampleCount || 0) + 1,
      lastUpdated: new Date().toISOString(),
    };

    this.knowledge.set(key, knowledge);
    this.updateHierarchy(knowledge);

    return knowledge;
  }

  /**
   * Merge parameters with running average
   */
  private mergeParameters(
    existing: Record<string, number>,
    newParams: Record<string, number>,
    count: number
  ): Record<string, number> {
    const merged: Record<string, number> = { ...existing };
    for (const [key, value] of Object.entries(newParams)) {
      if (key in merged) {
        merged[key] = (merged[key] * count + value) / (count + 1);
      } else {
        merged[key] = value;
      }
    }
    return merged;
  }

  /**
   * Update hierarchical aggregations
   */
  private updateHierarchy(knowledge: ConditionKnowledge): void {
    for (const level of this.hierarchyLevels) {
      const levelKey = level.dimensions.map(d => vectorStringFields(knowledge.vector)[d]).join("|");
      if (!level.aggregatedKnowledge.has(levelKey)) {
        level.aggregatedKnowledge.set(levelKey, []);
      }
      level.aggregatedKnowledge.get(levelKey)!.push(knowledge);
    }
  }

  /**
   * Calculate similarity between two condition vectors
   */
  calculateSimilarity(v1: ConditionVector, v2: ConditionVector): number {
    const dimensions = ["material", "geometry", "machine", "tool", "operation"] as const;
    let matches = 0;
    let partialMatches = 0;

    for (const dim of dimensions) {
      const val1 = v1[dim];
      const val2 = v2[dim];

      if (val1 === val2) {
        matches++;
      } else if (this.isSameFamily(dim, val1, val2)) {
        partialMatches += 0.5;
      }
    }

    return (matches + partialMatches) / dimensions.length;
  }

  /**
   * Check if two values belong to same family
   */
  private isSameFamily(dimension: string, val1: string, val2: string): boolean {
    const families: Record<string, string[][]> = {
      material: [
        ["4140", "4340", "4150", "1045"], // Carbon steels
        ["D2", "M2", "H13", "A2", "S7"], // Tool steels
        ["6061", "7075", "2024"], // Aluminum alloys
        ["304", "316", "17-4PH"], // Stainless steels
        ["Ti-6Al-4V", "Ti-6-2-4-2"], // Titanium alloys
      ],
      machine: [
        ["VTC-800", "VTR-160A", "MU-5000V"], // Okuma verticals
        ["LB3000", "LB4000", "LU3000"], // Okuma lathes
        ["VF-2", "VF-3", "VF-4"], // Haas verticals
      ],
      operation: [
        ["roughing", "hogging", "heavy_cut"],
        ["finishing", "light_cut", "skim"],
        ["drilling", "boring", "reaming"],
      ],
    };

    const dimFamilies = families[dimension] || [];
    for (const family of dimFamilies) {
      if (family.includes(val1) && family.includes(val2)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find similar conditions in knowledge base
   */
  findSimilar(vector: ConditionVector, limit: number = 5): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    for (const [, knowledge] of this.knowledge) {
      const similarity = this.calculateSimilarity(vector, knowledge.vector);
      if (similarity >= this.similarityThreshold) {
        results.push({ vector: knowledge.vector, similarity, knowledge });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Interpolate parameters for unknown condition combination
   */
  interpolate(targetVector: ConditionVector): InterpolationResult {
    const similar = this.findSimilar(targetVector, 10);

    if (similar.length === 0) {
      return this.hierarchicalInterpolate(targetVector);
    }

    const predictedParameters: Record<string, { value: number; confidence: number }> = {};
    const allParams = new Set<string>();

    for (const s of similar) {
      for (const param of Object.keys(s.knowledge.parameters)) {
        allParams.add(param);
      }
    }

    for (const param of allParams) {
      let weightedSum = 0;
      let totalWeight = 0;

      for (const s of similar) {
        if (param in s.knowledge.parameters) {
          const weight = s.similarity * s.knowledge.confidence;
          weightedSum += s.knowledge.parameters[param] * weight;
          totalWeight += weight;
        }
      }

      if (totalWeight > 0) {
        predictedParameters[param] = {
          value: weightedSum / totalWeight,
          confidence: Math.min(0.9, totalWeight / similar.length),
        };
      }
    }

    return {
      targetVector,
      predictedParameters,
      basedOn: similar,
      interpolationMethod: "weighted_average",
    };
  }

  /**
   * Use hierarchical Bayesian approach for sparse data
   */
  private hierarchicalInterpolate(targetVector: ConditionVector): InterpolationResult {
    const predictedParameters: Record<string, { value: number; confidence: number }> = {};

    for (let i = this.hierarchyLevels.length - 1; i >= 0; i--) {
      const level = this.hierarchyLevels[i];
      const levelKey = level.dimensions.map(d => vectorStringFields(targetVector)[d]).join("|");
      const knowledgeAtLevel = level.aggregatedKnowledge.get(levelKey);

      if (knowledgeAtLevel && knowledgeAtLevel.length > 0) {
        const allParams = new Set<string>();
        for (const k of knowledgeAtLevel) {
          for (const p of Object.keys(k.parameters)) {
            allParams.add(p);
          }
        }

        for (const param of allParams) {
          if (param in predictedParameters) continue;

          const values = knowledgeAtLevel
            .filter(k => param in k.parameters)
            .map(k => k.parameters[param]);

          if (values.length > 0) {
            const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
            predictedParameters[param] = {
              value: avgValue,
              confidence: Math.min(0.7, 0.3 + values.length * 0.1) * (1 - i * 0.1),
            };
          }
        }
      }
    }

    return {
      targetVector,
      predictedParameters,
      basedOn: [],
      interpolationMethod: "hierarchical_bayes",
    };
  }

  /**
   * Get coverage statistics
   */
  getCoverageStatistics(): {
    totalCombinations: number;
    uniqueMaterials: number;
    uniqueMachines: number;
    uniqueOperations: number;
    hierarchyCoverage: Record<string, number>;
  } {
    const materials = new Set<string>();
    const machines = new Set<string>();
    const operations = new Set<string>();

    for (const [, k] of this.knowledge) {
      materials.add(k.vector.material);
      machines.add(k.vector.machine);
      operations.add(k.vector.operation);
    }

    const hierarchyCoverage: Record<string, number> = {};
    for (const level of this.hierarchyLevels) {
      hierarchyCoverage[level.name] = level.aggregatedKnowledge.size;
    }

    return {
      totalCombinations: this.knowledge.size,
      uniqueMaterials: materials.size,
      uniqueMachines: machines.size,
      uniqueOperations: operations.size,
      hierarchyCoverage,
    };
  }

  /**
   * Export for persistence
   */
  export(): ConditionKnowledge[] {
    return Array.from(this.knowledge.values());
  }

  /**
   * Import from persistence
   */
  import(data: ConditionKnowledge[]): void {
    this.knowledge.clear();
    for (const level of this.hierarchyLevels) {
      level.aggregatedKnowledge.clear();
    }

    for (const k of data) {
      const key = this.vectorKey(k.vector);
      this.knowledge.set(key, k);
      this.updateHierarchy(k);
    }
  }
}

export const infiniteConditionCombinatorEngine = new InfiniteConditionCombinatorEngine();
