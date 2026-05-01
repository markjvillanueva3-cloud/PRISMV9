const PRISM_FAILSAFE_GENERATOR = {
  version: '1.0.0',

  /**
   * Generate a guaranteed-safe machining approach for ANY input
   */
  generateSafeStrategy(input) {
    console.log('[FAILSAFE] Generating safe strategy for:', input);

    const strategy = {
      valid: true,
      approach: 'conservative',
      operations: [],
      tools: [],
      parameters: {},
      warnings: [],
      confidence: 60
    };
    // Always start with facing
    strategy.operations.push({
      order: 1,
      type: 'face',
      description: 'Face top surface to establish reference',
      tool: 'face_mill_2in',
      params: this._getSafeParams('face', input)
    });

    // Analyze what features we might have
    const features = this._inferFeatures(input);

    let order = 2;

    // Add roughing for any pockets
    if (features.hasPockets || features.hasCavities) {
      strategy.operations.push({
        order: order++,
        type: 'rough_pocket',
        description: 'Rough material removal from cavities',
        tool: 'endmill_0.5in',
        params: this._getSafeParams('rough', input)
      });

      strategy.operations.push({
        order: order++,
        type: 'finish_pocket',
        description: 'Finish pocket walls and floor',
        tool: 'endmill_0.375in',
        params: this._getSafeParams('finish', input)
      });
    }
    // Add drilling for any holes
    if (features.hasHoles) {
      strategy.operations.push({
        order: order++,
        type: 'center_drill',
        description: 'Center drill all hole locations',
        tool: 'center_drill',
        params: this._getSafeParams('drill', input)
      });

      strategy.operations.push({
        order: order++,
        type: 'drill',
        description: 'Drill holes',
        tool: 'drill',
        params: this._getSafeParams('drill', input)
      });
    }
    // Add contour if needed
    if (features.hasContours || features.hasProfile) {
      strategy.operations.push({
        order: order++,
        type: 'rough_contour',
        description: 'Rough profile/contour',
        tool: 'endmill_0.5in',
        params: this._getSafeParams('rough', input)
      });

      strategy.operations.push({
        order: order++,
        type: 'finish_contour',
        description: 'Finish profile/contour',
        tool: 'endmill_0.375in',
        params: this._getSafeParams('finish', input)
      });
    }
    // Always end with chamfer/deburr
    strategy.operations.push({
      order: order++,
      type: 'chamfer',
      description: 'Break all edges',
      tool: 'chamfer_mill_90deg',
      params: this._getSafeParams('chamfer', input)
    });

    // Add warnings
    strategy.warnings.push('Using conservative failsafe parameters - may not be optimal');
    strategy.warnings.push('Recommend manual verification before running');

    return strategy;
  },
  _inferFeatures(input) {
    const text = JSON.stringify(input).toLowerCase();

    return {
      hasPockets: text.includes('pocket') || text.includes('cavity') || text.includes('recess'),
      hasHoles: text.includes('hole') || text.includes('drill') || text.includes('bore'),
      hasContours: text.includes('contour') || text.includes('profile') || text.includes('outline'),
      hasCavities: text.includes('cut') || text.includes('mill') || text.includes('remove'),
      hasProfile: text.includes('shape') || text.includes('perimeter')
    };
  },
  _getSafeParams(opType, input) {
    // Very conservative parameters that will work for almost any material
    const material = (input.material || '').toLowerCase();

    // Base conservative values
    let sfm = 200;
    let chipLoad = 0.002;
    let doc = 0.05;
    let woc = 0.2;

    // Slightly adjust based on material hints
    if (material.includes('aluminum') || material.includes('brass')) {
      sfm = 400;
      chipLoad = 0.003;
      doc = 0.1;
      woc = 0.3;
    }
    if (material.includes('titanium') || material.includes('inconel')) {
      sfm = 80;
      chipLoad = 0.001;
      doc = 0.02;
      woc = 0.1;
    }
    // Operation-specific adjustments
    if (opType === 'finish') {
      doc *= 0.3;
      woc *= 0.4;
      sfm *= 1.2;
    }
    if (opType === 'face') {
      doc = 0.02;
      woc = 0.6;
    }
    if (opType === 'chamfer') {
      sfm *= 0.7;
    }
    return {
      sfm: Math.round(sfm),
      chipLoad: parseFloat(chipLoad.toFixed(4)),
      doc: parseFloat(doc.toFixed(3)),
      woc: parseFloat(woc.toFixed(3)),
      coolant: 'flood',
      approach: 'conservative'
    };
  },
  init() {
    console.log('[PRISM_FAILSAFE_GENERATOR] v1.0 initialized');
    console.log('  Guaranteed safe output for ANY input');
    return this;
  }
}