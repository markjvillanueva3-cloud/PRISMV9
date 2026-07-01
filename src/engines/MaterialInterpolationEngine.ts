/**
 * MaterialInterpolationEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Cosine-similarity material matching and cutting parameter interpolation.
 * When an unknown material is encountered, finds the most similar known
 * materials and interpolates cutting parameters with a safety factor.
 *
 * Source: PRISM_ADVANCED_INTERPOLATION (monolith R2.3.3)
 *
 * 11-material property vector database with hardness, tensile strength,
 * thermal conductivity, and machinability index.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaterialProperties {
  hardness: number;       // HB/HRC equivalent
  tensile: number;        // psi
  thermal: number;        // W/m·K
  machinability: number;  // 0-1 index (1.0 = brass 360 baseline)
}

export interface SimilarMaterial {
  name: string;
  similarity: number;     // 0-1 cosine similarity
  properties: MaterialProperties;
}

export interface InterpolatedParams {
  sfm: number;
  chipLoad: number;       // inches per tooth
  doc: number;            // depth of cut factor
  woc: number;            // width of cut factor
  basedOn: string[];
  confidence: number;     // 0-100
  safetyFactorApplied: number;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Material Property Database (11 materials from monolith)
// ---------------------------------------------------------------------------

const PROPERTY_VECTORS: Record<string, MaterialProperties> = {
  aluminum_6061:  { hardness: 95,  tensile: 45000,  thermal: 167, machinability: 0.9  },
  aluminum_7075:  { hardness: 150, tensile: 83000,  thermal: 130, machinability: 0.7  },
  steel_1018:     { hardness: 126, tensile: 64000,  thermal: 51,  machinability: 0.7  },
  steel_4140:     { hardness: 197, tensile: 95000,  thermal: 42,  machinability: 0.5  },
  steel_4340:     { hardness: 217, tensile: 108000, thermal: 38,  machinability: 0.45 },
  stainless_304:  { hardness: 201, tensile: 73200,  thermal: 16,  machinability: 0.35 },
  stainless_316:  { hardness: 217, tensile: 84100,  thermal: 16,  machinability: 0.30 },
  titanium_6al4v: { hardness: 334, tensile: 130000, thermal: 6.7, machinability: 0.2  },
  inconel_718:    { hardness: 363, tensile: 185000, thermal: 11,  machinability: 0.1  },
  brass_360:      { hardness: 78,  tensile: 58000,  thermal: 115, machinability: 1.0  },
  copper_110:     { hardness: 50,  tensile: 32000,  thermal: 388, machinability: 0.85 },
};

// Cutting parameter baselines per material (carbide, general milling)
const BASE_PARAMS: Record<string, { sfm: number; chipLoad: number }> = {
  aluminum_6061:  { sfm: 800, chipLoad: 0.004  },
  aluminum_7075:  { sfm: 600, chipLoad: 0.003  },
  steel_1018:     { sfm: 400, chipLoad: 0.003  },
  steel_4140:     { sfm: 300, chipLoad: 0.003  },
  steel_4340:     { sfm: 250, chipLoad: 0.002  },
  stainless_304:  { sfm: 200, chipLoad: 0.002  },
  stainless_316:  { sfm: 180, chipLoad: 0.002  },
  titanium_6al4v: { sfm: 120, chipLoad: 0.002  },
  inconel_718:    { sfm: 80,  chipLoad: 0.0015 },
  brass_360:      { sfm: 600, chipLoad: 0.004  },
  copper_110:     { sfm: 500, chipLoad: 0.003  },
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class MaterialInterpolationEngineImpl {

  /**
   * Find the most similar known materials to an unknown material.
   */
  findSimilar(
    materialName: string,
    knownProperties?: Partial<MaterialProperties>,
    topN?: number
  ): SimilarMaterial[] {
    const n = topN ?? 5;
    const unknownVec = this._estimateVector(materialName, knownProperties ?? {});

    const results: SimilarMaterial[] = [];
    for (const [name, props] of Object.entries(PROPERTY_VECTORS)) {
      const similarity = this._cosineSimilarity(unknownVec, props);
      results.push({ name, similarity, properties: props });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, n);
  }

  /**
   * Interpolate cutting parameters for an unknown material based on
   * similarity-weighted averaging from known materials.
   */
  interpolateParams(
    materialName: string,
    knownProperties?: Partial<MaterialProperties>,
    safetyFactor?: number
  ): InterpolatedParams {
    const sf = safetyFactor ?? 0.85;
    const similar = this.findSimilar(materialName, knownProperties, 5);

    if (similar.length === 0 || similar[0].similarity < 0.3) {
      return {
        sfm: 200, chipLoad: 0.002, doc: 0.05, woc: 0.2,
        basedOn: ["conservative_default"], confidence: 30,
        safetyFactorApplied: sf,
        warning: "Using very conservative defaults — verify parameters",
      };
    }

    let sfm = 0, chipLoad = 0, totalWeight = 0;

    for (const { name, similarity } of similar) {
      const params = BASE_PARAMS[name];
      if (params) {
        sfm += params.sfm * similarity;
        chipLoad += params.chipLoad * similarity;
        totalWeight += similarity;
      }
    }

    if (totalWeight > 0) {
      sfm /= totalWeight;
      chipLoad /= totalWeight;
    }

    const confidence = Math.round(similar[0].similarity * 100);
    const result: InterpolatedParams = {
      sfm: Math.round(sfm * sf),
      chipLoad: parseFloat((chipLoad * sf).toFixed(4)),
      doc: 0.1,
      woc: 0.3,
      basedOn: similar.slice(0, 3).map(s => s.name),
      confidence,
      safetyFactorApplied: sf,
    };

    if (confidence < 70) {
      result.warning = "Low confidence — run test cut before production";
    }

    return result;
  }

  /**
   * List all materials in the property database.
   */
  listMaterials(): Array<{
    id: string;
    properties: MaterialProperties;
    baseParams: { sfm: number; chipLoad: number };
  }> {
    return Object.entries(PROPERTY_VECTORS).map(([id, props]) => ({
      id,
      properties: props,
      baseParams: BASE_PARAMS[id] ?? { sfm: 200, chipLoad: 0.002 },
    }));
  }

  /**
   * Compare two materials and return their similarity + parameter differences.
   */
  compareMaterials(
    material1: string,
    material2: string
  ): {
    similarity: number;
    mat1: MaterialProperties;
    mat2: MaterialProperties;
    paramDiff: { sfmRatio: number; chipLoadRatio: number };
  } {
    const v1 = PROPERTY_VECTORS[material1]
      ?? this._estimateVector(material1, {});
    const v2 = PROPERTY_VECTORS[material2]
      ?? this._estimateVector(material2, {});

    const p1 = BASE_PARAMS[material1] ?? { sfm: 200, chipLoad: 0.002 };
    const p2 = BASE_PARAMS[material2] ?? { sfm: 200, chipLoad: 0.002 };

    return {
      similarity: this._cosineSimilarity(v1, v2),
      mat1: v1,
      mat2: v2,
      paramDiff: {
        sfmRatio: p1.sfm / (p2.sfm || 1),
        chipLoadRatio: p1.chipLoad / (p2.chipLoad || 0.001),
      },
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _estimateVector(
    material: string,
    known: Partial<MaterialProperties>
  ): MaterialProperties {
    // Check if exact match exists
    if (PROPERTY_VECTORS[material]) {
      return { ...PROPERTY_VECTORS[material], ...known };
    }

    // Default starting point
    const vec: MaterialProperties = {
      hardness: 150, tensile: 70000, thermal: 50, machinability: 0.5,
    };

    const m = material.toLowerCase();

    if (m.includes("aluminum") || m.includes("al ") || m.includes("6061")
        || m.includes("7075") || m.includes("2024")) {
      vec.hardness = 100; vec.thermal = 150; vec.machinability = 0.8;
    }
    if (m.includes("steel") || m.includes("aisi") || m.includes("sae")
        || m.includes("1018") || m.includes("4140") || m.includes("4340")) {
      vec.hardness = 180; vec.thermal = 45; vec.machinability = 0.5;
    }
    if (m.includes("stainless") || m.includes("ss ") || m.includes("304")
        || m.includes("316") || m.includes("17-4")) {
      vec.hardness = 200; vec.thermal = 16; vec.machinability = 0.35;
    }
    if (m.includes("titanium") || m.includes("ti-") || m.includes("ti ")) {
      vec.hardness = 330; vec.thermal = 7; vec.machinability = 0.2;
    }
    if (m.includes("inconel") || m.includes("hastelloy")
        || m.includes("waspaloy")) {
      vec.hardness = 350; vec.thermal = 10; vec.machinability = 0.1;
    }
    if (m.includes("brass") || m.includes("bronze")) {
      vec.hardness = 80; vec.thermal = 110; vec.machinability = 0.9;
    }
    if (m.includes("copper") || m.includes("cu ")) {
      vec.hardness = 55; vec.thermal = 380; vec.machinability = 0.85;
    }
    if (m.includes("cast iron") || m.includes("ductile iron")) {
      vec.hardness = 200; vec.thermal = 35; vec.machinability = 0.6;
    }

    // Hardness hints
    if (m.includes("hard")) vec.hardness *= 1.3;
    if (m.includes("soft") || m.includes("annealed")) vec.hardness *= 0.7;

    // Override with known properties
    if (known.hardness !== undefined) vec.hardness = known.hardness;
    if (known.tensile !== undefined) vec.tensile = known.tensile;
    if (known.thermal !== undefined) vec.thermal = known.thermal;
    if (known.machinability !== undefined) vec.machinability = known.machinability;

    return vec;
  }

  private _cosineSimilarity(
    v1: MaterialProperties,
    v2: MaterialProperties
  ): number {
    // Feature-scale to [0,1] range before cosine similarity
    // so tensile (10000s) doesn't dominate hardness (100s) or thermal (10s)
    const s1 = this._featureScale(v1);
    const s2 = this._featureScale(v2);

    const dot = s1[0]*s2[0] + s1[1]*s2[1] + s1[2]*s2[2] + s1[3]*s2[3];
    const mag1 = Math.sqrt(s1[0]**2 + s1[1]**2 + s1[2]**2 + s1[3]**2);
    const mag2 = Math.sqrt(s2[0]**2 + s2[1]**2 + s2[2]**2 + s2[3]**2);

    if (mag1 < 1e-15 || mag2 < 1e-15) return 0;
    return dot / (mag1 * mag2);
  }

  // Feature ranges from the 11-material database
  private static readonly FEATURE_RANGES = {
    hardness: { min: 50, max: 363 },
    tensile:  { min: 32000, max: 185000 },
    thermal:  { min: 6.7, max: 388 },
    machinability: { min: 0.1, max: 1.0 },
  };

  private _featureScale(v: MaterialProperties): [number, number, number, number] {
    const r = MaterialInterpolationEngineImpl.FEATURE_RANGES;
    return [
      (v.hardness - r.hardness.min) / (r.hardness.max - r.hardness.min),
      (v.tensile - r.tensile.min) / (r.tensile.max - r.tensile.min),
      (v.thermal - r.thermal.min) / (r.thermal.max - r.thermal.min),
      (v.machinability - r.machinability.min) / (r.machinability.max - r.machinability.min),
    ];
  }
}

export const materialInterpolationEngine = new MaterialInterpolationEngineImpl();
