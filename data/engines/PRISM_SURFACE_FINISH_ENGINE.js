/**
 * PRISM_SURFACE_FINISH_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References in monolith: 317
 * Lines extracted: 291
 * Prototype methods: 0
 * Session: R2.0.2
 */

const PRISM_SURFACE_FINISH_ENGINE = {
  version: '1.0.0',

  // SURFACE FINISH DATABASE - ISO 1302 / ASME Y14.36

  database: {
    // ISO N-Number to Ra conversion
    nNumberToRa: {
      N1:  { ra_um: 0.025, ra_uin: 1,    description: 'Super finish, lapping' },
      N2:  { ra_um: 0.05,  ra_uin: 2,    description: 'Super finish, honing' },
      N3:  { ra_um: 0.1,   ra_uin: 4,    description: 'Mirror finish, polishing' },
      N4:  { ra_um: 0.2,   ra_uin: 8,    description: 'Fine grinding, lapping' },
      N5:  { ra_um: 0.4,   ra_uin: 16,   description: 'Precision grinding' },
      N6:  { ra_um: 0.8,   ra_uin: 32,   description: 'Grinding, fine turning' },
      N7:  { ra_um: 1.6,   ra_uin: 63,   description: 'Fine machining' },
      N8:  { ra_um: 3.2,   ra_uin: 125,  description: 'Standard machining' },
      N9:  { ra_um: 6.3,   ra_uin: 250,  description: 'Roughing' },
      N10: { ra_um: 12.5,  ra_uin: 500,  description: 'Heavy roughing' },
      N11: { ra_um: 25,    ra_uin: 1000, description: 'Casting, forging' },
      N12: { ra_um: 50,    ra_uin: 2000, description: 'Rough casting' }
    },
    // Triangle symbols (older notation)
    triangleSymbols: {
      '▽':     { ra_uin: 1000, description: 'Rough - remove material' },
      '▽▽':    { ra_uin: 250,  description: 'Medium finish' },
      '▽▽▽':   { ra_uin: 63,   description: 'Fine finish' },
      '▽▽▽▽':  { ra_uin: 16,   description: 'Very fine finish' }
    },
    // Common surface finish specifications
    commonSpecs: {
      'as_cast':        { ra_uin: 500,  ra_um: 12.5 },
      'sand_cast':      { ra_uin: 1000, ra_um: 25 },
      'investment_cast': { ra_uin: 125,  ra_um: 3.2 },
      'rough_turn':     { ra_uin: 250,  ra_um: 6.3 },
      'finish_turn':    { ra_uin: 63,   ra_um: 1.6 },
      'precision_turn': { ra_uin: 32,   ra_um: 0.8 },
      'rough_mill':     { ra_uin: 250,  ra_um: 6.3 },
      'finish_mill':    { ra_uin: 63,   ra_um: 1.6 },
      'ball_end_mill':  { ra_uin: 32,   ra_um: 0.8 },
      'surface_grind':  { ra_uin: 16,   ra_um: 0.4 },
      'cylindrical_grind': { ra_uin: 8, ra_um: 0.2 },
      'centerless_grind': { ra_uin: 8,  ra_um: 0.2 },
      'hone':           { ra_uin: 4,    ra_um: 0.1 },
      'lap':            { ra_uin: 2,    ra_um: 0.05 },
      'superfinish':    { ra_uin: 1,    ra_um: 0.025 },
      'polish':         { ra_uin: 4,    ra_um: 0.1 },
      'electropolish':  { ra_uin: 8,    ra_um: 0.2 }
    },
    // Ra to Rz approximate conversion (Rz ≈ 4-7 × Ra)
    raToRzFactor: 5.0
  },
  // FINISH TO MACHINING STRATEGY MAPPING

  finishToStrategy: {
    // Ultra-fine finishes (Ra < 0.4 μm / < 16 μin)
    ultraFine: {
      raRange: { min: 0, max: 0.4 },
      strategies: [
        { name: 'GRINDING', type: 'grinding', priority: 1 },
        { name: 'HONING', type: 'honing', priority: 2 },
        { name: 'LAPPING', type: 'lapping', priority: 3 },
        { name: 'POLISHING', type: 'polish', priority: 4 }
      ],
      parameters: {
        stepover: 0.05,  // mm
        feedMultiplier: 0.3,
        speedMultiplier: 1.2,
        springPasses: 2
      }
    },
    // Fine finishes (Ra 0.4-1.6 μm / 16-63 μin)
    fine: {
      raRange: { min: 0.4, max: 1.6 },
      strategies: [
        { name: 'FINISH_MILL', type: 'finish', priority: 1 },
        { name: 'PRECISION_TURN', type: 'finish_turn', priority: 1 },
        { name: 'LIGHT_GRINDING', type: 'grinding', priority: 2 }
      ],
      parameters: {
        stepover: 0.15,  // mm
        feedMultiplier: 0.5,
        speedMultiplier: 1.1,
        springPasses: 1
      }
    },
    // Standard finishes (Ra 1.6-6.3 μm / 63-250 μin)
    standard: {
      raRange: { min: 1.6, max: 6.3 },
      strategies: [
        { name: 'FINISH_CONTOUR', type: 'finish', priority: 1 },
        { name: 'FINISH_TURN', type: 'finish_turn', priority: 1 },
        { name: 'ADAPTIVE_FINISH', type: 'hsm_finish', priority: 2 }
      ],
      parameters: {
        stepover: 0.3,  // mm
        feedMultiplier: 0.75,
        speedMultiplier: 1.0,
        springPasses: 0
      }
    },
    // Rough finishes (Ra > 6.3 μm / > 250 μin)
    rough: {
      raRange: { min: 6.3, max: 100 },
      strategies: [
        { name: 'ADAPTIVE_ROUGH', type: 'hsm', priority: 1 },
        { name: 'ROUGH_TURN', type: 'rough_turn', priority: 1 },
        { name: 'FACING', type: 'face', priority: 2 }
      ],
      parameters: {
        stepover: 0.5,  // as fraction of diameter
        feedMultiplier: 1.0,
        speedMultiplier: 1.0,
        springPasses: 0
      }
    }
  },
  // SURFACE FINISH SYMBOL RECOGNITION

  recognizeSymbol(symbolOrText) {
    // Check for triangle symbols
    if (this.database.triangleSymbols[symbolOrText]) {
      return this.database.triangleSymbols[symbolOrText];
    }
    // Check for N-number
    const nMatch = symbolOrText.match(/N(\d+)/i);
    if (nMatch) {
      const nNum = 'N' + nMatch[1];
      return this.database.nNumberToRa[nNum];
    }
    // Check for Ra value
    const raMatch = symbolOrText.match(/Ra\s*[=:]?\s*(\d+(?:\.\d+)?)/i);
    if (raMatch) {
      const raValue = parseFloat(raMatch[1]);
      return this._raToFinishSpec(raValue);
    }
    // Check for microinch value
    const uinMatch = symbolOrText.match(/(\d+)\s*(?:μin|µin|microinch)/i);
    if (uinMatch) {
      const uinValue = parseInt(uinMatch[1]);
      return this._microinchToFinishSpec(uinValue);
    }
    return null;
  },
  _raToFinishSpec(raValue) {
    // Determine if μm or μin based on value magnitude
    const isMetric = raValue < 50; // Assume < 50 is μm
    const ra_um = isMetric ? raValue : raValue * 0.0254;
    const ra_uin = isMetric ? raValue / 0.0254 : raValue;

    return {
      ra_um: ra_um,
      ra_uin: ra_uin,
      rz_um: ra_um * this.database.raToRzFactor,
      rz_uin: ra_uin * this.database.raToRzFactor
    };
  },
  _microinchToFinishSpec(uinValue) {
    return {
      ra_um: uinValue * 0.0254,
      ra_uin: uinValue,
      rz_um: uinValue * 0.0254 * this.database.raToRzFactor,
      rz_uin: uinValue * this.database.raToRzFactor
    };
  },
  // MACHINING STRATEGY RECOMMENDATION

  recommendStrategy(targetFinish, material = 'steel', featureType = 'surface') {
    const finishSpec = typeof targetFinish === 'object' ? targetFinish : this.recognizeSymbol(targetFinish);

    if (!finishSpec) {
      return { error: 'Unable to parse finish specification' };
    }
    const ra_um = finishSpec.ra_um;

    // Determine finish category
    let category;
    if (ra_um <= 0.4) {
      category = this.finishToStrategy.ultraFine;
    } else if (ra_um <= 1.6) {
      category = this.finishToStrategy.fine;
    } else if (ra_um <= 6.3) {
      category = this.finishToStrategy.standard;
    } else {
      category = this.finishToStrategy.rough;
    }
    // Adjust for material
    const materialAdjustments = this._getMaterialAdjustments(material);

    // Adjust for feature type
    const featureAdjustments = this._getFeatureAdjustments(featureType);

    return {
      targetFinish: finishSpec,
      category: Object.keys(this.finishToStrategy).find(k => this.finishToStrategy[k] === category),
      strategies: category.strategies,
      parameters: {
        ...category.parameters,
        feedMultiplier: category.parameters.feedMultiplier * materialAdjustments.feedFactor,
        speedMultiplier: category.parameters.speedMultiplier * materialAdjustments.speedFactor
      },
      notes: this._generateNotes(finishSpec, material, featureType)
    };
  },
  _getMaterialAdjustments(material) {
    const adjustments = {
      aluminum:  { feedFactor: 1.3, speedFactor: 1.5 },
      steel:     { feedFactor: 1.0, speedFactor: 1.0 },
      stainless: { feedFactor: 0.7, speedFactor: 0.8 },
      titanium:  { feedFactor: 0.5, speedFactor: 0.6 },
      brass:     { feedFactor: 1.2, speedFactor: 1.3 },
      plastic:   { feedFactor: 1.5, speedFactor: 2.0 },
      cast_iron: { feedFactor: 0.9, speedFactor: 0.9 }
    };
    return adjustments[material] || adjustments.steel;
  },
  _getFeatureAdjustments(featureType) {
    const adjustments = {
      surface:  { stepoverFactor: 1.0 },
      pocket:   { stepoverFactor: 0.9 },
      contour:  { stepoverFactor: 0.8 },
      bore:     { stepoverFactor: 0.7 },
      fillet:   { stepoverFactor: 0.6 }
    };
    return adjustments[featureType] || adjustments.surface;
  },
  _generateNotes(finishSpec, material, featureType) {
    const notes = [];

    if (finishSpec.ra_um <= 0.4) {
      notes.push('Consider secondary finishing operation (grinding/polishing)');
    }
    if (material === 'aluminum' && finishSpec.ra_um <= 1.6) {
      notes.push('Diamond tooling recommended for best aluminum finish');
    }
    if (featureType === 'bore' && finishSpec.ra_um <= 0.8) {
      notes.push('Consider honing or precision boring for bore finish');
    }
    return notes;
  },
  // ACHIEVABLE FINISH CALCULATOR

  calculateAchievableFinish(params) {
    const {
      toolDiameter,
      feedPerTooth,
      cornerRadius = 0,
      operation = 'face_mill'
    } = params;

    // Theoretical finish for face milling: Ra ≈ f² / (32 × r)
    // Where f = feed per rev, r = tool nose radius

    if (operation === 'face_mill' || operation === 'end_mill') {
      const effectiveRadius = cornerRadius || toolDiameter / 2;
      const feedPerRev = feedPerTooth * 4; // Assume 4 flutes
      const theoreticalRa = (feedPerRev * feedPerRev) / (32 * effectiveRadius);

      return {
        theoretical_ra_um: theoreticalRa * 1000, // Convert to μm
        theoretical_ra_uin: theoreticalRa * 1000 / 0.0254,
        practical_ra_um: theoreticalRa * 1000 * 1.5, // 50% worse in practice
        practical_ra_uin: theoreticalRa * 1000 * 1.5 / 0.0254,
        formula: 'Ra = f² / (32 × r)',
        notes: 'Practical finish typically 1.5x theoretical due to vibration, tool wear'
      };
    }
    if (operation === 'turn') {
      const noseRadius = cornerRadius || 0.4; // Default 0.4mm nose radius
      const theoreticalRa = (feedPerTooth * feedPerTooth) / (32 * noseRadius);

      return {
        theoretical_ra_um: theoreticalRa * 1000,
        theoretical_ra_uin: theoreticalRa * 1000 / 0.0254,
        notes: 'For turning, use insert nose radius for calculation'
      };
    }
    return null;
  },
  // CONVERSION UTILITIES

  convert: {
    raToRz(ra, factor = 5.0) { return ra * factor; },
    rzToRa(rz, factor = 5.0) { return rz / factor; },
    umToUin(um) { return um / 0.0254; },
    uinToUm(uin) { return uin * 0.0254; },
    nToRa(nNumber) {
      const spec = PRISM_SURFACE_FINISH_ENGINE.database.nNumberToRa[nNumber];
      return spec ? { ra_um: spec.ra_um, ra_uin: spec.ra_uin } : null;
    }
  }
}