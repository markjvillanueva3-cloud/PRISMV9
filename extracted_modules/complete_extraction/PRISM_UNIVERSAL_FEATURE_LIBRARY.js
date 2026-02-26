const PRISM_UNIVERSAL_FEATURE_LIBRARY = {
  version: '1.0.0',

  // Complete list of all supported feature types with full parameters
  features: {
    // === MILLING FEATURES ===
    pocket_rectangular: {
      category: 'milling',
      params: ['length', 'width', 'depth', 'cornerRadius', 'floor', 'walls', 'draftAngle', 'floorRadius'],
      operations: ['rough_pocket', 'rest_pocket', 'finish_floor', 'finish_walls'],
      tools: ['endmill', 'ball_endmill'],
      constraints: {
        minCornerRadius: (tool) => tool.diameter / 2,
        maxDepthToWidth: 4
      }
    },
    pocket_circular: {
      category: 'milling',
      params: ['diameter', 'depth', 'floor', 'walls', 'draftAngle'],
      operations: ['rough_pocket', 'finish_floor', 'finish_walls'],
      tools: ['endmill', 'ball_endmill']
    },
    pocket_complex: {
      category: 'milling',
      params: ['boundary', 'depth', 'islands', 'cornerRadius'],
      operations: ['rough_pocket', 'rest_pocket', 'finish_floor', 'finish_walls'],
      tools: ['endmill', 'ball_endmill']
    },
    hole_simple: {
      category: 'drilling',
      params: ['diameter', 'depth', 'type', 'tolerance', 'x', 'y'],
      types: ['thru', 'blind'],
      operations: ['center_drill', 'drill'],
      tools: ['center_drill', 'drill']
    },
    hole_precision: {
      category: 'drilling',
      params: ['diameter', 'depth', 'tolerance', 'x', 'y', 'finish'],
      operations: ['center_drill', 'drill', 'bore', 'ream'],
      tools: ['center_drill', 'drill', 'boring_bar', 'reamer']
    },
    hole_counterbore: {
      category: 'drilling',
      params: ['throughDiameter', 'throughDepth', 'cboreDiameter', 'cboreDepth', 'x', 'y'],
      operations: ['center_drill', 'drill', 'counterbore'],
      tools: ['center_drill', 'drill', 'counterbore_tool']
    },
    hole_countersink: {
      category: 'drilling',
      params: ['diameter', 'depth', 'csinkAngle', 'csinkDiameter', 'x', 'y'],
      operations: ['center_drill', 'drill', 'countersink'],
      tools: ['center_drill', 'drill', 'countersink_tool']
    },
    thread_internal: {
      category: 'threading',
      params: ['size', 'pitch', 'depth', 'class', 'form', 'x', 'y'],
      forms: ['UN', 'UNC', 'UNF', 'UNEF', 'M', 'MF', 'NPT', 'NPTF'],
      operations: ['center_drill', 'drill', 'tap'],
      tools: ['center_drill', 'drill', 'tap', 'thread_mill']
    },
    thread_external: {
      category: 'threading',
      params: ['majorDiameter', 'pitch', 'length', 'class', 'form'],
      operations: ['turn_thread'],
      tools: ['thread_insert', 'thread_mill']
    },
    slot_straight: {
      category: 'milling',
      params: ['length', 'width', 'depth', 'endType', 'startX', 'startY', 'endX', 'endY'],
      endTypes: ['open', 'closed', 'one_open'],
      operations: ['rough_slot', 'finish_slot'],
      tools: ['endmill', 'slot_mill']
    },
    slot_tee: {
      category: 'milling',
      params: ['length', 'topWidth', 'bottomWidth', 'depth', 'neckHeight'],
      operations: ['rough_slot', 't_slot'],
      tools: ['endmill', 't_slot_cutter']
    },
    slot_dovetail: {
      category: 'milling',
      params: ['length', 'topWidth', 'bottomWidth', 'depth', 'angle'],
      operations: ['rough_slot', 'dovetail'],
      tools: ['endmill', 'dovetail_cutter']
    },
    contour_2d: {
      category: 'milling',
      params: ['boundary', 'depth', 'side', 'leadIn', 'leadOut'],
      sides: ['outside', 'inside', 'on'],
      operations: ['rough_contour', 'finish_contour'],
      tools: ['endmill']
    },
    contour_3d: {
      category: 'milling',
      params: ['surface', 'bounds', 'tolerance'],
      operations: ['parallel_finish', 'steep_shallow', 'pencil'],
      tools: ['ball_endmill']
    },
    face: {
      category: 'milling',
      params: ['length', 'width', 'finish', 'stock'],
      operations: ['face_mill'],
      tools: ['face_mill', 'endmill']
    },
    chamfer: {
      category: 'milling',
      params: ['angle', 'size', 'edges', 'type'],
      types: ['edge', 'hole', 'full'],
      operations: ['chamfer'],
      tools: ['chamfer_mill', 'endmill']
    },
    fillet: {
      category: 'milling',
      params: ['radius', 'edges', 'type'],
      types: ['internal', 'external'],
      operations: ['fillet'],
      tools: ['ball_endmill', 'corner_radius_endmill']
    },
    boss_circular: {
      category: 'milling',
      params: ['diameter', 'height', 'draft', 'filletRadius'],
      operations: ['contour', 'face'],
      tools: ['endmill']
    },
    boss_rectangular: {
      category: 'milling',
      params: ['length', 'width', 'height', 'draft', 'cornerRadius'],
      operations: ['contour', 'face'],
      tools: ['endmill']
    },
    rib: {
      category: 'milling',
      params: ['height', 'width', 'length', 'draft', 'path'],
      operations: ['contour'],
      tools: ['endmill']
    },
    text_engraving: {
      category: 'milling',
      params: ['text', 'font', 'height', 'depth', 'x', 'y'],
      operations: ['engrave'],
      tools: ['engraving_tool', 'ball_endmill']
    },
    // === TURNING FEATURES ===
    turn_od_cylinder: {
      category: 'turning',
      params: ['startDiameter', 'endDiameter', 'length', 'finish'],
      operations: ['od_rough', 'od_finish'],
      tools: ['turning_insert']
    },
    turn_od_taper: {
      category: 'turning',
      params: ['startDiameter', 'endDiameter', 'length', 'angle'],
      operations: ['od_rough', 'od_finish'],
      tools: ['turning_insert']
    },
    turn_od_contour: {
      category: 'turning',
      params: ['profile', 'startZ', 'endZ'],
      operations: ['od_rough', 'od_finish'],
      tools: ['turning_insert']
    },
    turn_id_bore: {
      category: 'turning',
      params: ['startDiameter', 'endDiameter', 'depth'],
      operations: ['id_rough', 'id_finish'],
      tools: ['boring_bar']
    },
    turn_face: {
      category: 'turning',
      params: ['outerDiameter', 'innerDiameter', 'depth'],
      operations: ['face'],
      tools: ['turning_insert']
    },
    turn_groove_od: {
      category: 'turning',
      params: ['position', 'diameter', 'grooveDepth', 'grooveWidth'],
      operations: ['groove'],
      tools: ['grooving_insert']
    },
    turn_groove_id: {
      category: 'turning',
      params: ['position', 'diameter', 'grooveDepth', 'grooveWidth'],
      operations: ['groove'],
      tools: ['grooving_insert']
    },
    turn_groove_face: {
      category: 'turning',
      params: ['innerDiameter', 'outerDiameter', 'depth'],
      operations: ['face_groove'],
      tools: ['grooving_insert']
    },
    turn_thread_external: {
      category: 'turning',
      params: ['majorDiameter', 'minorDiameter', 'pitch', 'length', 'form'],
      operations: ['thread'],
      tools: ['threading_insert']
    },
    turn_thread_internal: {
      category: 'turning',
      params: ['majorDiameter', 'minorDiameter', 'pitch', 'depth', 'form'],
      operations: ['thread'],
      tools: ['threading_insert']
    },
    turn_parting: {
      category: 'turning',
      params: ['diameter', 'position', 'width'],
      operations: ['part'],
      tools: ['parting_insert']
    },
    turn_knurl: {
      category: 'turning',
      params: ['diameter', 'length', 'pitch', 'pattern'],
      patterns: ['straight', 'diamond', 'left', 'right'],
      operations: ['knurl'],
      tools: ['knurling_tool']
    }
  },
  /**
   * Get feature definition
   */
  getFeature(featureType) {
    return this.features[featureType] || null;
  },
  /**
   * Get all features in a category
   */
  getByCategory(category) {
    const result = [];
    for (const [name, def] of Object.entries(this.features)) {
      if (def.category === category) {
        result.push({ name, ...def });
      }
    }
    return result;
  },
  /**
   * Validate feature parameters
   */
  validateFeature(featureType, params) {
    const def = this.features[featureType];
    if (!def) {
      return { valid: false, error: `Unknown feature type: ${featureType}` };
    }
    const errors = [];
    const warnings = [];

    // Check required params
    for (const param of def.params) {
      if (params[param] === undefined || params[param] === null) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }
    // Check constraints
    if (def.constraints) {
      for (const [name, constraint] of Object.entries(def.constraints)) {
        if (typeof constraint === 'function') {
          // Dynamic constraint
          const minVal = constraint(params.tool || { diameter: 0.5 });
          const paramName = name.replace('min', '').replace('max', '').toLowerCase();
          const actualVal = params[paramName] || params.cornerRadius || 0;

          if (name.startsWith('min') && actualVal < minVal) {
            warnings.push(`${paramName} (${actualVal}) is below minimum (${minVal})`);
          }
          if (name.startsWith('max') && actualVal > minVal) {
            warnings.push(`${paramName} (${actualVal}) exceeds maximum (${minVal})`);
          }
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },
  /**
   * Get recommended tools for feature
   */
  getRecommendedTools(featureType, params) {
    const def = this.features[featureType];
    if (!def) return [];

    // Use PRISM_MANUFACTURER_CONNECTOR if available
    if (typeof PRISM_MANUFACTURER_CONNECTOR !== 'undefined') {
      const recommendations = [];

      for (const toolType of def.tools) {
        const result = PRISM_MANUFACTURER_CONNECTOR.getRecommendation({
          type: toolType,
          diameter: params.diameter || params.width / 4 || 0.5,
          material: params.material || 'aluminum'
        });

        if (result.found) {
          recommendations.push(result.recommendation);
        }
      }
      return recommendations;
    }
    return def.tools;
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_UNIVERSAL_FEATURE_LIBRARY] v1.0 initialized');
    console.log('  Milling features:', this.getByCategory('milling').length);
    console.log('  Turning features:', this.getByCategory('turning').length);
    console.log('  Drilling features:', this.getByCategory('drilling').length);
    console.log('  Threading features:', this.getByCategory('threading').length);
    return this;
  }
}