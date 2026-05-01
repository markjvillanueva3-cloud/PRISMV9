/**
 * PRISM_ADVANCED_INTERPOLATION
 * Extracted from PRISM v8.89.002 monolith
 * References: 14
 * Category: numerical
 * Lines: 168
 * Session: R2.3.3 Algorithm Gap Extraction
 */

const PRISM_ADVANCED_INTERPOLATION = {
  version: '1.0.0',

  // Material property vectors for similarity calculation
  propertyVectors: {
    'aluminum_6061': { hardness: 95, tensile: 45000, thermal: 167, machinability: 0.9 },
    'aluminum_7075': { hardness: 150, tensile: 83000, thermal: 130, machinability: 0.7 },
    'steel_1018': { hardness: 126, tensile: 64000, thermal: 51, machinability: 0.7 },
    'steel_4140': { hardness: 197, tensile: 95000, thermal: 42, machinability: 0.5 },
    'steel_4340': { hardness: 217, tensile: 108000, thermal: 38, machinability: 0.45 },
    'stainless_304': { hardness: 201, tensile: 73200, thermal: 16, machinability: 0.35 },
    'stainless_316': { hardness: 217, tensile: 84100, thermal: 16, machinability: 0.30 },
    'titanium_6al4v': { hardness: 334, tensile: 130000, thermal: 6.7, machinability: 0.2 },
    'inconel_718': { hardness: 363, tensile: 185000, thermal: 11, machinability: 0.1 },
    'brass_360': { hardness: 78, tensile: 58000, thermal: 115, machinability: 1.0 },
    'copper_110': { hardness: 50, tensile: 32000, thermal: 388, machinability: 0.85 }
  },
  /**
   * Find most similar materials using vector similarity
   */
  findSimilar(unknownMaterial, properties = {}) {
    const results = [];

    // If we have some properties, use them
    const unknownVector = this._estimateVector(unknownMaterial, properties);

    for (const [name, vector] of Object.entries(this.propertyVectors)) {
      const similarity = this._cosineSimilarity(unknownVector, vector);
      results.push({ name, vector, similarity });
    }
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, 5); // Top 5 similar
  },
  /**
   * Estimate properties for unknown material
   */
  _estimateVector(material, knownProperties) {
    const vector = { hardness: 150, tensile: 70000, thermal: 50, machinability: 0.5 };

    // Apply known properties
    Object.assign(vector, knownProperties);

    // Estimate from material name
    const matLower = material.toLowerCase();

    if (matLower.includes('aluminum') || matLower.includes('al ')) {
      vector.hardness = knownProperties.hardness || 100;
      vector.thermal = knownProperties.thermal || 150;
      vector.machinability = knownProperties.machinability || 0.8;
    }
    if (matLower.includes('steel') || matLower.includes('aisi') || matLower.includes('sae')) {
      vector.hardness = knownProperties.hardness || 180;
      vector.thermal = knownProperties.thermal || 45;
      vector.machinability = knownProperties.machinability || 0.5;
    }
    if (matLower.includes('stainless') || matLower.includes('ss ') || matLower.includes('304') || matLower.includes('316')) {
      vector.hardness = knownProperties.hardness || 200;
      vector.thermal = knownProperties.thermal || 16;
      vector.machinability = knownProperties.machinability || 0.35;
    }
    if (matLower.includes('titanium') || matLower.includes('ti-') || matLower.includes('ti ')) {
      vector.hardness = knownProperties.hardness || 330;
      vector.thermal = knownProperties.thermal || 7;
      vector.machinability = knownProperties.machinability || 0.2;
    }
    if (matLower.includes('inconel') || matLower.includes('hastelloy') || matLower.includes('waspaloy')) {
      vector.hardness = knownProperties.hardness || 350;
      vector.thermal = knownProperties.thermal || 10;
      vector.machinability = knownProperties.machinability || 0.1;
    }
    // Hardness hints
    if (matLower.includes('hard')) vector.hardness *= 1.3;
    if (matLower.includes('soft') || matLower.includes('annealed')) vector.hardness *= 0.7;

    return vector;
  },
  _cosineSimilarity(v1, v2) {
    // Normalize vectors first
    const norm1 = this._normalizeVector(v1);
    const norm2 = this._normalizeVector(v2);

    let dot = 0;
    for (const key of Object.keys(norm1)) {
      dot += (norm1[key] || 0) * (norm2[key] || 0);
    }
    return dot;
  },
  _normalizeVector(v) {
    let magnitude = 0;
    for (const val of Object.values(v)) {
      magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude);

    const normalized = {};
    for (const [key, val] of Object.entries(v)) {
      normalized[key] = val / magnitude;
    }
    return normalized;
  },
  /**
   * Calculate cutting parameters from interpolated properties
   */
  calculateParams(material, knownProperties = {}) {
    const similar = this.findSimilar(material, knownProperties);

    if (similar.length === 0) {
      return this._conservativeDefaults();
    }
    // Weighted average based on similarity
    let sfm = 0, chipLoad = 0, totalWeight = 0;

    const baseParams = {
      'aluminum_6061': { sfm: 800, chipLoad: 0.004 },
      'aluminum_7075': { sfm: 600, chipLoad: 0.003 },
      'steel_1018': { sfm: 400, chipLoad: 0.003 },
      'steel_4140': { sfm: 300, chipLoad: 0.003 },
      'steel_4340': { sfm: 250, chipLoad: 0.002 },
      'stainless_304': { sfm: 200, chipLoad: 0.002 },
      'stainless_316': { sfm: 180, chipLoad: 0.002 },
      'titanium_6al4v': { sfm: 120, chipLoad: 0.002 },
      'inconel_718': { sfm: 80, chipLoad: 0.0015 },
      'brass_360': { sfm: 600, chipLoad: 0.004 },
      'copper_110': { sfm: 500, chipLoad: 0.003 }
    };
    for (const { name, similarity } of similar) {
      const params = baseParams[name];
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
    // Apply safety factor for interpolated values
    const safetyFactor = 0.85;

    return {
      sfm: Math.round(sfm * safetyFactor),
      chipLoad: parseFloat((chipLoad * safetyFactor).toFixed(4)),
      doc: 0.1, // Conservative
      woc: 0.3, // Conservative
      basedOn: similar.slice(0, 3).map(s => s.name),
      confidence: Math.round(similar[0].similarity * 100),
      safetyFactorApplied: safetyFactor
    };
  },
  _conservativeDefaults() {
    return {
      sfm: 200,
      chipLoad: 0.002,
      doc: 0.05,
      woc: 0.2,
      basedOn: ['conservative_default'],
      confidence: 30,
      warning: 'Using very conservative defaults - verify parameters'
    };
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_ADVANCED_INTERPOLATION] v1.0 initialized');
    console.log('  Materials in database:', Object.keys(this.propertyVectors).length);
    return this;
  }
}