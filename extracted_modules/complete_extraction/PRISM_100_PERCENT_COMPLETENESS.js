const PRISM_100_PERCENT_COMPLETENESS = {
  version: '1.0.0',

  // USER-FRIENDLY ERROR MESSAGES

  errorMessages: {
    // Input errors
    NO_INPUT: {
      code: 'ERR_001',
      message: 'No input provided',
      userMessage: 'Please provide a part description, upload a CAD file, or enter feature dimensions to get started.',
      suggestion: 'Try describing your part like "2x3 inch pocket, 0.5 deep in aluminum"'
    },
    INVALID_DIMENSIONS: {
      code: 'ERR_002',
      message: 'Invalid dimensions',
      userMessage: 'The dimensions you entered are not valid. Please check that all values are positive numbers.',
      suggestion: 'Dimensions should be positive numbers, e.g., width: 2.5, depth: 0.75'
    },
    NEGATIVE_VALUE: {
      code: 'ERR_003',
      message: 'Negative value detected',
      userMessage: 'Negative dimensions are not allowed. All measurements must be positive.',
      suggestion: 'Enter positive values for all dimensions'
    },
    // Material errors
    UNKNOWN_MATERIAL: {
      code: 'ERR_010',
      message: 'Unknown material',
      userMessage: 'We could not identify the material. Using aluminum 6061 as default.',
      suggestion: 'Specify materials like "aluminum 6061", "steel 4140", or "titanium 6Al-4V"'
    },
    EXOTIC_MATERIAL_WARNING: {
      code: 'WARN_011',
      message: 'Exotic material detected',
      userMessage: 'This is an advanced material that requires special tooling and parameters. Results should be verified by a machinist.',
      suggestion: 'Consider consulting with a materials specialist for optimal results'
    },
    // Geometry errors
    DEEP_POCKET_WARNING: {
      code: 'WARN_020',
      message: 'Deep pocket detected',
      userMessage: 'This pocket has a high depth-to-width ratio. Special tooling and multiple passes may be required.',
      suggestion: 'Consider using extended reach tools or roughing in multiple depth passes'
    },
    THIN_WALL_WARNING: {
      code: 'WARN_021',
      message: 'Thin wall detected',
      userMessage: 'Thin walls detected that may deflect during machining. Reduced feeds and speeds recommended.',
      suggestion: 'Use climb milling and reduced depth of cut for thin walls'
    },
    SMALL_RADIUS_WARNING: {
      code: 'WARN_022',
      message: 'Small internal radius',
      userMessage: 'Small internal corners require small tools which may limit feed rates.',
      suggestion: 'Consider increasing corner radii if design allows'
    },
    // Tool errors
    NO_SUITABLE_TOOL: {
      code: 'ERR_030',
      message: 'No suitable tool found',
      userMessage: 'We could not find a suitable tool for this operation. Using a general-purpose tool.',
      suggestion: 'Check if the feature dimensions are within standard tool ranges'
    },
    TOOL_TOO_LARGE: {
      code: 'ERR_031',
      message: 'Tool too large for feature',
      userMessage: 'The selected tool is too large for this feature. Selecting a smaller alternative.',
      suggestion: 'Feature width must be at least 1.5x the tool diameter'
    },
    // Machine errors
    EXCEEDS_TRAVEL: {
      code: 'ERR_040',
      message: 'Exceeds machine travel',
      userMessage: 'The part size exceeds the machine's working envelope. Please select a larger machine.',
      suggestion: 'Check machine specifications or split the operation'
    },
    EXCEEDS_RPM: {
      code: 'WARN_041',
      message: 'Exceeds maximum RPM',
      userMessage: 'Optimal RPM exceeds machine capability. Speed has been limited to machine maximum.',
      suggestion: 'Consider a machine with higher spindle speed for small tools'
    },
    // Toolpath errors
    COLLISION_DETECTED: {
      code: 'ERR_050',
      message: 'Collision detected',
      userMessage: 'A potential collision was detected in the toolpath. The path has been adjusted.',
      suggestion: 'Review the toolpath preview and check fixture clearance'
    },
    BOUNDARY_VIOLATION: {
      code: 'ERR_051',
      message: 'Boundary violation',
      userMessage: 'The toolpath extends beyond the stock material. Boundaries have been adjusted.',
      suggestion: 'Verify stock dimensions match your actual material'
    },
    // G-code errors
    UNSUPPORTED_CONTROLLER: {
      code: 'ERR_060',
      message: 'Unsupported controller',
      userMessage: 'The specified controller is not in our database. Using generic Fanuc-compatible output.',
      suggestion: 'Check our supported controller list or request your controller be added'
    },
    // General
    UNKNOWN_ERROR: {
      code: 'ERR_999',
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      suggestion: 'If the problem persists, please report it with your input details'
    }
  },
  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorCode) {
    return this.errorMessages[errorCode] || this.errorMessages.UNKNOWN_ERROR;
  },
  /**
   * Format error for display
   */
  formatError(errorCode, details = {}) {
    const err = this.getErrorMessage(errorCode);
    return {
      code: err.code,
      message: err.message,
      userMessage: err.userMessage,
      suggestion: err.suggestion,
      details,
      timestamp: new Date().toISOString()
    };
  },
  // EDGE CASE DETECTION

  edgeCaseDetectors: {
    /**
     * Detect deep pockets (high aspect ratio)
     */
    detectDeepPocket(feature) {
      if (feature.type !== 'pocket') return null;

      const width = Math.min(feature.width || feature.params?.width || 999,
                            feature.length || feature.params?.length || 999);
      const depth = feature.depth || feature.params?.depth || 0;

      if (width === 0) return null;

      const aspectRatio = depth / width;

      if (aspectRatio > 4) {
        return {
          type: 'DEEP_POCKET_EXTREME',
          aspectRatio,
          recommendation: 'Use pecking cycle with extended reach tool',
          maxDoc: width * 0.25,
          requiresSpecialTool: true
        };
      } else if (aspectRatio > 2) {
        return {
          type: 'DEEP_POCKET',
          aspectRatio,
          recommendation: 'Use multiple depth passes with chip clearing',
          maxDoc: width * 0.5,
          requiresSpecialTool: false
        };
      }
      return null;
    },
    /**
     * Detect thin walls
     */
    detectThinWall(feature) {
      const wallThickness = feature.wallThickness || feature.params?.wallThickness;

      if (wallThickness && wallThickness < 0.1) {
        return {
          type: 'THIN_WALL_EXTREME',
          thickness: wallThickness,
          recommendation: 'Use very light cuts, consider support',
          maxDoc: wallThickness * 0.1,
          feedReduction: 0.5
        };
      } else if (wallThickness && wallThickness < 0.25) {
        return {
          type: 'THIN_WALL',
          thickness: wallThickness,
          recommendation: 'Reduce cutting forces, use climb milling',
          maxDoc: wallThickness * 0.2,
          feedReduction: 0.7
        };
      }
      return null;
    },
    /**
     * Detect small internal radii
     */
    detectSmallRadius(feature) {
      const cornerRadius = feature.cornerRadius || feature.params?.cornerRadius;

      if (cornerRadius && cornerRadius < 0.0625) { // < 1/16"
        return {
          type: 'SMALL_RADIUS',
          radius: cornerRadius,
          maxToolDiameter: cornerRadius * 2,
          recommendation: 'Use tool diameter <= ' + (cornerRadius * 2).toFixed(4) + '"'
        };
      }
      return null;
    },
    /**
     * Detect multi-setup requirements
     */
    detectMultiSetup(features) {
      const zMin = Math.min(...features.map(f => -(f.depth || f.params?.depth || 0)));
      const zMax = Math.max(...features.map(f => f.topZ || 0));

      // Check if features exist on multiple faces
      const faces = new Set(features.map(f => f.face || 'top'));

      if (faces.size > 1) {
        return {
          type: 'MULTI_FACE',
          faces: Array.from(faces),
          setupCount: faces.size,
          recommendation: 'Part requires ' + faces.size + ' setups'
        };
      }
      return null;
    }
  },
  /**
   * Run all edge case detectors
   */
  detectAllEdgeCases(features) {
    const results = {
      warnings: [],
      adjustments: [],
      requiresReview: false
    };
    for (const feature of (Array.isArray(features) ? features : [features])) {
      // Deep pocket
      const deepPocket = this.edgeCaseDetectors.detectDeepPocket(feature);
      if (deepPocket) {
        results.warnings.push(this.formatError('DEEP_POCKET_WARNING', deepPocket));
        results.adjustments.push({ featureId: feature.id, adjustment: 'maxDoc', value: deepPocket.maxDoc });
        if (deepPocket.requiresSpecialTool) results.requiresReview = true;
      }
      // Thin wall
      const thinWall = this.edgeCaseDetectors.detectThinWall(feature);
      if (thinWall) {
        results.warnings.push(this.formatError('THIN_WALL_WARNING', thinWall));
        results.adjustments.push({ featureId: feature.id, adjustment: 'feedReduction', value: thinWall.feedReduction });
      }
      // Small radius
      const smallRadius = this.edgeCaseDetectors.detectSmallRadius(feature);
      if (smallRadius) {
        results.warnings.push(this.formatError('SMALL_RADIUS_WARNING', smallRadius));
        results.adjustments.push({ featureId: feature.id, adjustment: 'maxToolDiameter', value: smallRadius.maxToolDiameter });
      }
    }
    // Multi-setup
    const multiSetup = this.edgeCaseDetectors.detectMultiSetup(features);
    if (multiSetup) {
      results.warnings.push({
        type: 'MULTI_SETUP',
        message: multiSetup.recommendation,
        setupCount: multiSetup.setupCount
      });
      results.requiresReview = true;
    }
    return results;
  },
  // EXOTIC MATERIAL DATABASE

  exoticMaterials: {
    // Nickel superalloys
    'waspaloy': { sfm: 25, chipload: 0.0008, hardness: 340, family: 'nickel_superalloy', coolant: 'flood_required',
                  notes: 'Work hardens rapidly, maintain constant chip load' },
    'hastelloy_x': { sfm: 20, chipload: 0.0008, hardness: 350, family: 'nickel_superalloy', coolant: 'flood_required',
                     notes: 'High temperature alloy, use ceramic or CBN tools for finishing' },
    'hastelloy_c276': { sfm: 18, chipload: 0.0007, hardness: 370, family: 'nickel_superalloy', coolant: 'flood_required',
                        notes: 'Corrosion resistant, very abrasive to tools' },
    'rene_41': { sfm: 15, chipload: 0.0006, hardness: 380, family: 'nickel_superalloy', coolant: 'flood_required',
                 notes: 'Aerospace superalloy, use positive rake tools' },
    'rene_80': { sfm: 12, chipload: 0.0005, hardness: 400, family: 'nickel_superalloy', coolant: 'flood_required',
                 notes: 'Turbine blade material, extremely difficult to machine' },
    'mar_m247': { sfm: 10, chipload: 0.0005, hardness: 420, family: 'nickel_superalloy', coolant: 'flood_required',
                  notes: 'Single crystal capable, use whisker-reinforced ceramic' },
    'cmsx_4': { sfm: 8, chipload: 0.0004, hardness: 450, family: 'nickel_superalloy', coolant: 'flood_required',
                notes: 'Single crystal superalloy, EDM recommended where possible' },

    // Additional Inconels
    'inconel_600': { sfm: 35, chipload: 0.001, hardness: 300, family: 'nickel_superalloy', coolant: 'flood_required',
                     notes: 'Oxidation resistant, easier than 718' },
    'inconel_625': { sfm: 28, chipload: 0.0009, hardness: 320, family: 'nickel_superalloy', coolant: 'flood_required',
                     notes: 'High strength, good for marine applications' },
    'inconel_x750': { sfm: 22, chipload: 0.0008, hardness: 360, family: 'nickel_superalloy', coolant: 'flood_required',
                      notes: 'Age-hardenable, springs and fasteners' },

    // Cobalt alloys
    'stellite_6': { sfm: 15, chipload: 0.0006, hardness: 400, family: 'cobalt_alloy', coolant: 'flood_required',
                    notes: 'Very abrasive, CBN tools recommended' },
    'stellite_21': { sfm: 18, chipload: 0.0007, hardness: 380, family: 'cobalt_alloy', coolant: 'flood_required',
                     notes: 'Medical implant material' },
    'mp35n': { sfm: 20, chipload: 0.0007, hardness: 350, family: 'cobalt_alloy', coolant: 'flood_required',
               notes: 'Medical fasteners, work hardens severely' },

    // Refractory metals
    'tungsten': { sfm: 50, chipload: 0.001, hardness: 500, family: 'refractory', coolant: 'dry_or_mist',
                  notes: 'Extremely hard, use diamond or CBN tools' },
    'molybdenum': { sfm: 60, chipload: 0.0015, hardness: 250, family: 'refractory', coolant: 'dry_preferred',
                    notes: 'High temperature material, avoid water-based coolants' },
    'tantalum': { sfm: 80, chipload: 0.002, hardness: 200, family: 'refractory', coolant: 'dry_or_mist',
                  notes: 'Gummy material, sharp positive rake tools' },
    'niobium': { sfm: 100, chipload: 0.002, hardness: 180, family: 'refractory', coolant: 'dry_or_mist',
                 notes: 'Similar to tantalum, superconductor applications' },

    // Advanced titanium alloys
    'ti_6246': { sfm: 40, chipload: 0.001, hardness: 380, family: 'titanium_advanced', coolant: 'flood_required',
                 notes: 'Higher strength than 6-4, aerospace structural' },
    'ti_5553': { sfm: 35, chipload: 0.0009, hardness: 400, family: 'titanium_advanced', coolant: 'flood_required',
                 notes: 'Landing gear alloy, very high strength' },
    'ti_17': { sfm: 38, chipload: 0.001, hardness: 390, family: 'titanium_advanced', coolant: 'flood_required',
               notes: 'Compressor disk material' },

    // Specialty steels
    'aermet_100': { sfm: 60, chipload: 0.002, hardness: 350, family: 'specialty_steel', coolant: 'flood_required',
                    notes: 'Ultra-high strength steel, landing gear' },
    'maraging_350': { sfm: 70, chipload: 0.002, hardness: 320, family: 'specialty_steel', coolant: 'flood_required',
                      notes: 'Tooling steel, age hardens to 58 HRC' },
    'custom_465': { sfm: 65, chipload: 0.002, hardness: 340, family: 'specialty_steel', coolant: 'flood_required',
                    notes: 'Stainless with high hardness' }
  },
  /**
   * Identify exotic material
   */
  identifyExoticMaterial(input) {
    const text = String(input).toLowerCase();

    for (const [name, props] of Object.entries(this.exoticMaterials)) {
      const patterns = [
        name,
        name.replace('_', ' '),
        name.replace('_', '-'),
        name.replace('_', '')
      ];

      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return {
            found: true,
            name: name,
            ...props,
            warning: this.formatError('EXOTIC_MATERIAL_WARNING', { material: n