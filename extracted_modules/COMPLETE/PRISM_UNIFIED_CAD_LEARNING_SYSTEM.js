const PRISM_UNIFIED_CAD_LEARNING_SYSTEM = {

    // Generic Machine Knowledge Module
    genericMachineKnowledge: {
        getKinematicLessons: function() {
            if (typeof GENERIC_MACHINE_MODELS_DATABASE === 'undefined') return [];
            return [
                { title: '3-Axis Configurations', machines: GENERIC_MACHINE_MODELS_DATABASE.threeAxisMachines.length, patterns: [...new Set(GENERIC_MACHINE_MODELS_DATABASE.threeAxisMachines.map(m => m.kinematicChain))] },
                { title: '4-Axis Configurations', machines: GENERIC_MACHINE_MODELS_DATABASE.fourAxisMachines.length, rotaryOptions: ['A', 'B'] },
                { title: '5-Axis Configurations', machines: GENERIC_MACHINE_MODELS_DATABASE.fiveAxisMachines.length, types: ['Table-Table', 'Head-Head', 'Table-Head'] }
            ];
        },
        getCADLessons: function() {
            if (typeof CAD_FILES_DATABASE === 'undefined') return [];
            return CAD_FILES_DATABASE.assemblies.map(a => ({
                title: a.name,
                category: a.category,
                topics: a.learningTopics,
                machiningConsiderations: a.machiningConsiderations
            }));
        }
    },
  version: '1.0.0',

  // LEARNED CAD DATABASE - STORED IN APP (NOT localStorage)
  // This data persists in the app file itself when saved

  learnedCADDatabase: {
    // MACHINES - Learned from uploaded machine CAD models
    machines: {
      'okuma': {
        '5-axis_vmc': {
          source: 'okuma_genos_m460v-5ax.step',
          confidence: 0.95,
          dimensions: {
            baseWidthRatio: 2.6,
            baseDepthRatio: 1.74,
            baseHeightRatio: 0.87,
            columnWidthRatio: 0.65,
            columnHeightRatio: 6.09,
            tableToBaseRatio: 0.87
          },
          colors: { frame: 0x2a4d3a, covers: 0x3d3d3d, accent: 0xff6600 },
          kinematics: { type: 'trunnion', aAxisRange: [-30, 120], cAxisRange: [-360, 360] }
        }
      }
    },
    // PARTS - Learned geometry from uploaded part CAD files
    parts: {
      // PART CAD LEARNING DATABASE - 18 STEP Files from PRISM_EXPANDED_CAD_CAM_LIBRARY
      // Categories: workholding, electronics, reference, machine, general

      // WORKHOLDING PARTS
      'vise_base': { source: 'flux_vise_base.step', confidence: 0.92, category: 'workholding', geometry: { points: 27236, faces: 1473 }, features: { jawSlotDepthRatio: 0.45, baseThicknessRatio: 0.25 }, boundingBox: { x: 150, y: 75, z: 45 }, complexity: 'medium', material: 'cast_iron' },
      'pallet_fixture': { source: 'flux_pallet_3x6.step', confidence: 0.90, category: 'workholding', geometry: { points: 23952, faces: 1827 }, features: { gridPattern: '3x6', holeSpacing: 25.4 }, boundingBox: { x: 152.4, y: 76.2, z: 25.4 }, complexity: 'medium', material: 'aluminum_6061' },
      'soft_jaw': { source: 'flux_soft_jaw_3x3.step', confidence: 0.88, category: 'workholding', geometry: { points: 381, faces: 54 }, features: { jawHeight: 38.1, serrationPitch: 3.175 }, boundingBox: { x: 76.2, y: 76.2, z: 38.1 }, complexity: 'low', material: 'aluminum_6061' },
      'standard_clamp': { source: 'flux_standard_clamp.step', confidence: 0.85, category: 'workholding', geometry: { points: 99, faces: 18 }, features: { clampStyle: 'strap', slotLength: 50 }, boundingBox: { x: 100, y: 30, z: 25 }, complexity: 'low', material: 'steel_4140' },

      // ELECTRONICS PARTS
      'ic_package_dip': { source: 'kicad_dip.step', confidence: 0.85, category: 'electronics', geometry: { points: 1171, faces: 148 }, features: { pinCount: 16, pinPitch: 2.54 }, boundingBox: { x: 20.32, y: 7.62, z: 5.08 }, complexity: 'high', material: 'plastic_epoxy' },
      'qfp_package': { source: 'kicad_qfp.step', confidence: 0.84, category: 'electronics', geometry: { points: 7326, faces: 764 }, features: { pinCount: 44, pinPitch: 0.8 }, boundingBox: { x: 12, y: 12, z: 2 }, complexity: 'very_high', material: 'plastic_abs' },
      'smd_capacitor': { source: 'kicad_cap.step', confidence: 0.82, category: 'electronics', geometry: { points: 149, faces: 28 }, features: { packageSize: '0805' }, boundingBox: { x: 2.0, y: 1.25, z: 1.4 }, complexity: 'low', material: 'ceramic' },
      'relay_package': { source: 'kicad_relay.step', confidence: 0.80, category: 'electronics', features: { contactType: 'SPDT', coilVoltage: 5 }, boundingBox: { x: 19, y: 15, z: 15 }, complexity: 'medium', material: 'plastic_nylon' },
      'led_5mm': { source: 'kicad_led.step', confidence: 0.83, category: 'electronics', geometry: { points: 1195, faces: 244 }, features: { packageType: '5mm_round' }, boundingBox: { x: 5, y: 5, z: 8.6 }, complexity: 'low', material: 'plastic_epoxy' },
      'fuse_holder': { source: 'kicad_fuse.step', confidence: 0.79, category: 'electronics', geometry: { points: 640, faces: 119 }, features: { fuseSize: '5x20mm' }, boundingBox: { x: 25, y: 8, z: 10 }, complexity: 'low', material: 'plastic_nylon' },

      // REFERENCE PARTS
      'ap214_test_solid': { source: 'stepcode_as1_ap214.stp', confidence: 0.95, category: 'reference', geometry: { points: 3506, faces: 53 }, features: { schema: 'AP214', brepType: 'manifold_solid' }, boundingBox: { x: 100, y: 50, z: 30 }, complexity: 'medium', material: 'generic' },
      'dm1_test_part': { source: 'stepcode_dm1.stp', confidence: 0.93, category: 'reference', geometry: { points: 403, faces: 24 }, features: { schema: 'AP203' }, boundingBox: { x: 50, y: 30, z: 20 }, complexity: 'low', material: 'generic' },

      // MACHINE PARTS
      'vmc_5axis_assembly': { source: 'okuma_genos_m460v-5ax.step', confidence: 0.95, category: 'machine', geometry: { points: 20500, faces: 2381 }, features: { machineType: '5axis_vmc' }, boundingBox: { x: 2500, y: 2200, z: 2800 }, complexity: 'very_high', material: 'cast_iron_assembly' },

      // GENERAL PARTS
      'mounting_bracket': { source: 'PRISM-EX-001', confidence: 0.90, category: 'general', features: { pocketCount: 2, holePattern: 'bolt_circle_4' }, boundingBox: { x: 139.7, y: 88.9, z: 22.225 }, complexity: 'medium', material: '6061-T6', operations: ['face', 'rough_pocket', 'finish_pocket', 'drill'] },
      'aerospace_bracket': { source: 'example_bracket.step', confidence: 0.85, category: 'aerospace', features: { pocketDepthRatio: 0.65, wallThicknessMin: 1.5, ribSpacingRatio: 3.2 }, boundingBox: { x: 150, y: 80, z: 25 }, complexity: 'high', material: 'aluminum_7075' }
    },
    // TOOL HOLDERS - Learned from uploaded holder CAD models
    toolHolders: {
      'hydraulic_chuck': {
        'cat40': {
          source: 'learned_from_uploads',
          confidence: 0.90,
          geometry: {
            bodyDiameter: 63,            // mm
            bodyLength: 85,              // mm
            colletBoreDiameter: 20,      // mm
            flangeWidth: 45,             // mm
            flangeThickness: 25,         // mm
            pullStudLength: 25           // mm
          },
          profile: 'stepped_cylinder',
          collisionEnvelope: { type: 'cylinder', radius: 31.5, length: 85 }
        },
        'bt40': {
          source: 'learned_from_uploads',
          confidence: 0.88,
          geometry: {
            bodyDiameter: 63,
            bodyLength: 90,
            colletBoreDiameter: 20,
            flangeWidth: 63,
            flangeThickness: 18,
            pullStudLength: 45
          },
          profile: 'stepped_cylinder',
          collisionEnvelope: { type: 'cylinder', radius: 31.5, length: 90 }
        }
      },
      'er_collet_chuck': {
        'cat40': {
          source: 'learned_from_uploads',
          confidence: 0.92,
          geometry: {
            bodyDiameter: 50,
            bodyLength: 70,
            nutDiameter: 42,
            nutHeight: 15,
            flangeWidth: 45,
            flangeThickness: 25
          },
          profile: 'stepped_with_nut'
        }
      },
      'shrink_fit': {
        'hsk63a': {
          source: 'learned_from_uploads',
          confidence: 0.85,
          geometry: {
            bodyDiameter: 40,
            bodyLength: 120,
            flangeWidth: 63,
            flangeThickness: 20
          },
          profile: 'slim_cylinder'
        }
      }
    },
    // CUTTING TOOLS - Learned from uploaded tool CAD models
    cuttingTools: {
      'endmill_square': {
        'general': {
          source: 'learned_from_uploads',
          confidence: 0.90,
          geometry: {
            fluteHelixAngle: 30,          // degrees
            fluteDepthRatio: 0.35,        // flute depth / diameter
            coreDiameterRatio: 0.55,      // core / OD
            neckDiameterRatio: 0.92,      // neck / OD
            locToOalRatio: 0.5,           // LOC / OAL typical
            shankLengthRatio: 0.45        // shank / OAL
          },
          profile: {
            cuttingEndProfile: 'flat',
            cornerStyle: 'sharp',
            fluteCount: [2, 3, 4, 5, 6]
          }
        }
      },
      'endmill_ball': {
        'general': {
          source: 'learned_from_uploads',
          confidence: 0.88,
          geometry: {
            ballRadiusRatio: 0.5,         // ball radius / diameter
            fluteHelixAngle: 30,
            neckReliefAngle: 3,
            fluteDepthRatio: 0.30
          },
          profile: {
            cuttingEndProfile: 'hemispherical',
            cornerStyle: 'ball'
          }
        }
      },
      'drill': {
        'general': {
          source: 'learned_from_uploads',
          confidence: 0.92,
          geometry: {
            pointAngle: 140,              // degrees
            helixAngle: 30,
            webThicknessRatio: 0.15,      // web / diameter
            marginWidth: 0.3,             // mm typical
            fluteDepthRatio: 0.28
          },
          profile: {
            tipStyle: 'split_point',
            fluteCount: 2
          }
        }
      },
      'face_mill': {
        'general': {
          source: 'learned_from_uploads',
          confidence: 0.85,
          geometry: {
            bodyHeightRatio: 0.4,         // body height / diameter
            insertPocketDepth: 8,         // mm
            insertCount: [4, 5, 6, 8, 10],
            arbor_bore_ratio: 0.3         // bore / OD
          }
        }
      }
    },
    // FIXTURES/WORKHOLDING - Learned from uploaded fixture CAD models
    fixtures: {
      'vise': {
        'precision_6inch': {
          source: 'learned_from_uploads',
          confidence: 0.93,
          geometry: {
            baseLength: 355,              // mm
            baseWidth: 135,               // mm
            baseHeight: 75,               // mm
            jawWidth: 152,                // 6 inch
            jawHeight: 55,
            maxOpening: 230,
            movableJawTravel: 200
          },
          features: {
            tSlotSpacing: 125,
            tSlotWidth: 18,
            mountingHoles: { count: 4, diameter: 14, pattern: 'rectangular' }
          },
          collisionEnvelope: { type: 'box', x: 355, y: 135, z: 130 }
        }
      },
      'chuck_3jaw': {
        '8inch': {
          source: 'learned_from_uploads',
          confidence: 0.90,
          geometry: {
            diameter: 200,                // mm (8 inch)
            height: 100,
            boreDiameter: 55,
            jawStroke: 25,
            mountingBoltCircle: 170
          },
          features: {
            chuckType: 'self_centering',
            jawCount: 3,
            jawStyle: 'hard'
          }
        }
      },
      'fixture_plate': {
        'standard_grid': {
          source: 'learned_from_uploads',
          confidence: 0.88,
          geometry: {
            holeSpacing: 50,              // mm grid
            holeDiameter: 16,             // mm (5/8 inch)
            plateThickness: 25,           // mm
            counterBoreDiameter: 25,
            counterBoreDepth: 10
          },
          features: {
            gridPattern: 'square',
            edgeClearance: 25
          }
        }
      },
      'tombstone': {
        '4sided': {
          source: 'learned_from_uploads',
          confidence: 0.85,
          geometry: {
            width: 400,                   // mm
            depth: 400,
            height: 500,
            wallThickness: 30,
            tSlotSpacing: 100,
            tSlotWidth: 18
          },
          features: {
            faces: 4,
            locatingDowels: true,
            coolantThrough: true
          }
        }
      }
    }
  },
  // INITIALIZATION

  init() {
    console.log('[UNIFIED_CAD_LEARNING] Initializing...');

    // Merge any localStorage data into app database (one-time migration)
    this.migrateLocalStorageData();

    // Register upload handlers
    this.registerUploadHandlers();

    // Inject into existing modules
    this.injectIntoModules();

    // Make globally available
    window.PRISM_UNIFIED_CAD_LEARNING_SYSTEM = this;
    window.getLearnedCADData = this.getLearnedData.bind(this);
    window.addLearnedCADData = this.addLearnedData.bind(this);

    console.log('[UNIFIED_CAD_LEARNING] Ready - Database contains:');
    console.log('  Machines:', Object.keys(this.learnedCADDatabase.machines).length, 'manufacturers');
    console.log('  Parts:', Object.keys(this.learnedCADDatabase.parts).length, 'types');
    console.log('  Tool Holders:', Object.keys(this.learnedCADDatabase.toolHolders).length, 'types');
    console.log('  Cutting Tools:', Object.keys(this.learnedCADDatabase.cuttingTools).length, 'types');
    console.log('  Fixtures:', Object.keys(this.learnedCADDatabase.fixtures).length, 'types');

    return this;
  },
  // DATA ACCESS METHODS

  /**
   * Get learned data for a specific category and type
   */
  getLearnedData(category, type, subtype = null) {
    const db = this.learnedCADDatabase[category];
    if (!db) return null;

    if (subtype && db[type]) {
      return db[type][subtype] || null;
    }
    return db[type] || null;
  },
  /**
   * Add new learned data (stores in app, not localStorage)
   */
  addLearnedData(category, type, subtype, data) {
    if (!this.learnedCADDatabase[category]) {
      this.learnedCADDatabase[category] = {};
    }
    if (!this.learnedCADDatabase[category][type]) {
      this.learnedCADDatabase[category][type] = {};
    }
    // Merge with existing if present
    const existing = this.learnedCADDatabase[category][type][subtype];
    if (existing) {
      // Average confidence, merge data
      const newConfidence = (existing.confidence + data.confidence) / 2 + 0.02;
      this.learnedCADDatabase[category][type][subtype] = {
        ...existing,
        ...data,
        confidence: Math.min(0.99, newConfidence),
        sampleCount: (existing.sampleCount || 1) + 1
      };
    } else {
      this.learnedCADDatabase[category][type][subtype] = {
        ...data,
        sampleCount: 1
      };
    }
    console.log('[UNIFIED_CAD_LEARNING] Added learned data:', category, type, subtype);

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('cadDataLearned', {
      detail: { category, type, subtype, data: this.learnedCADDatabase[category][type][subtype] }
    }));

    return this.learnedCADDatabase[category][type][subtype];
  },
  // CAD FILE ANALYSIS

  /**
   * Analyze uploaded CAD file and extract learned geometry
   */
  async analyzeCADFile(file, category, metadata = {}) {
    console.log('[UNIFIED_CAD_LEARNING] Analyzing:', file.name, 'for', category);

    const fileExt = file.name.split('.').pop().toLowerCase();

    // Read file
    const fileData = await this.readFile(file);

    // Extract geometry based on file type
    let geometry = null;

    if (['step', 'stp'].includes(fileExt)) {
      geometry = await this.analyzeSTEP(fileData, file.name);
    } else if (['stl'].includes(fileExt)) {
      geometry = await this.analyzeSTL(fileData);
    } else if (['obj'].includes(fileExt)) {
      geometry = await this.analyzeOBJ(fileData);
    }
    if (!geometry) {
      console.warn('[UNIFIED_CAD_LEARNING] Could not extract geometry from:', file.name);
      return null;
    }
    // Calculate learned ratios based on category
    const learnedData = this.calculateLearnedData(geometry, category, metadata);

    return learnedData;
  },
  /**
   * Read file as text or array buffer
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const isBinary = ['stl', 'obj', 'glb'].some(ext => file.name.toLowerCase().endsWith(ext));

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      if (isBinary) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  },
  /**
   * Analyze STEP file for geometry
   */
  analyzeSTEP(content, filename) {
    // Parse STEP header and extract bounding box hints
    const lines = content.split('\n');

    let cartesianPoints = [];
    let entities = { products: 0, shapes: 0, faces: 0 };

    for (const line of lines) {
      // Count entities
      if (line.includes('PRODUCT(')) entities.products++;
      if (line.includes('SHAPE_REPRESENTATION')) entities.shapes++;
      if (line.includes('ADVANCED_FACE')) entities.faces++;

      // Extract Cartesian points for bounding box
      const pointMatch = line.match(/CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(([^)]+)\)/);
      if (pointMatch) {
        const coords = pointMatch[1].split(',').map(c => parseFloat(c.trim()));
        if (coords.length >= 3 && coords.every(c => !isNaN(c))) {
          cartesianPoints.push(coords);
        }
      }
    }
    // Calculate bounding box from points
    if (cartesianPoints.length > 0) {
      const xs = cartesianPoints.map(p => p[0]);
      const ys = cartesianPoints.map(p => p[1]);
      const zs = cartesianPoints.map(p => p[2]);

      return {
        boundingBox: {
          min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
          max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) }
        },
        dimensions: {
          width: Math.max(...xs) - Math.min(...xs),
          depth: Math.max(...ys) - Math.min(...ys),
          height: Math.max(...zs) - Math.min(...zs)
        },
        entities,
        complexity: entities.faces > 500 ? 'high' : entities.faces > 100 ? 'medium' : 'low',
        source: filename
      };
    }
    return null;
  },
  /**
   * Analyze STL file for geometry
   */
  analyzeSTL(buffer) {
    try {
      const view = new DataView(buffer);
      const isBinary = buffer.byteLength > 84;

      if (isBinary) {
        const numTriangles = view.getUint32(80, true);

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        let offset = 84;
        for (let i = 0; i < Math.min(numTriangles, 10000); i++) {
          offset += 12; // Skip normal

          for (let j = 0; j < 3; j++) {
            const x = view.getFloat32(offset, true); offset += 4;
            const y = view.getFloat32(offset, true); offset += 4;
            const z = view.getFloat32(offset, true); offset += 4;

            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
          }
          offset += 2; // attribute byte count
        }
        return {
          boundingBox: {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
          },
          dimensions: {
            width: maxX - minX,
            depth: maxY - minY,
            height: maxZ - minZ
          },
          triangleCount: numTriangles,
          complexity: numTriangles > 50000 ? 'high' : numTriangles > 10000 ? 'medium' : 'low'
        };
      }
    } catch (e) {
      console.warn('[UNIFIED_CAD_LEARNING] STL analysis error:', e);
    }
    return null;
  },
  /**
   * Analyze OBJ file for geometry
   */
  analyzeOBJ(content) {
    const lines = content.split('\n');
    const vertices = [];

    for (const line of lines) {
      if (line.startsWith('v ')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          vertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        }
      }
    }
    if (vertices.length > 0) {
      const xs = vertices.map(v => v[0]);
      const ys = vertices.map(v => v[1]);
      const zs = vertices.map(v => v[2]);

      return {
        boundingBox: {
          min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
          max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) }
        },
        dimensions: {
          width: Math.max(...xs) - Math.min(...xs),
          depth: Math.max(...ys) - Math.min(...ys),
          height: Math.max(...zs) - Math.min(...zs)
        },
        vertexCount: vertices.length,
        complexity: vertices.length > 10000 ? 'high' : vertices.length > 1000 ? 'medium' : 'low'
      };
    }
    return null;
  },
  /**
   * Calculate learned data from geometry based on category
   */
  calculateLearnedData(geometry, category, metadata) {
    const dims = geometry.dimensions;

    switch (category) {
      case 'parts':
        return {
          source: geometry.source || 'user_upload',
          confidence: 0.85,
          boundingBox: { x: dims.width, y: dims.depth, z: dims.height },
          features: {
            aspectRatioXY: dims.width / dims.depth,
            aspectRatioXZ: dims.width / dims.height,
            volume: dims.width * dims.depth * dims.height
          },
          complexity: geometry.complexity,
          material: metadata.material || 'unknown'
        };
      case 'toolHolders':
        // Assume cylindrical - largest dim is length, smaller is diameter
        const holderLength = Math.max(dims.width, dims.depth, dims.height);
        const holderDiameter = Math.min(dims.width, dims.depth);
        return {
          source: geometry.source || 'user_upload',
          confidence: 0.88,
          geometry: {
            bodyDiameter: holderDiameter,
            bodyLength: holderLength,
            lengthToDiameterRatio: holderLength / holderDiameter
          },
          profile: holderLength / holderDiameter > 3 ? 'slim_cylinder' : 'compact',
          collisionEnvelope: { type: 'cylinder', radius: holderDiameter / 2, length: holderLength }
        };
      case 'cuttingTools':
        // Tools are typically longest in one direction
        const toolLength = Math.max(dims.width, dims.depth, dims.height);
        const toolDiameter = Math.min(dims.width, dims.depth);
        return {
          source: geometry.source || 'user_upload',
          confidence: 0.85,
          geometry: {
            oal: toolLength,
            diameter: toolDiameter,
            locRatio: 0.5, // estimated
            shankRatio: 0.45
          },
          profile: {
            aspectRatio: toolLength / toolDiameter
          }
        };
      case 'fixtures':
        return {
          source: geometry.source || 'user_upload',
          confidence: 0.82,
          geometry: {
            baseLength: dims.width,
            baseWidth: dims.depth,
            baseHeight: dims.height
          },
          collisionEnvelope: { type: 'box', x: dims.width, y: dims.depth, z: dims.height },
          features: {
            aspectRatio: dims.width / dims.depth
          }
        };
      default:
        return {
          source: geometry.source || 'user_upload',
          confidence: 0.80,
          dimensions: dims,
          boundingBox: geometry.boundingBox
        };
    }
  },
  // MODULE INTEGRATION

  /**
   * Inject learned data into existing modules
   */
  injectIntoModules() {
    // Inject into MACHINE_MODEL_GENERATOR
    if (typeof MACHINE_MODEL_GENERATOR !== 'undefined') {
      MACHINE_MODEL_GENERATOR.learnedCADDatabase = this.learnedCADDatabase.machines;
    }
    // Inject into PRISM_TOOL_3D_GENERATOR
    if (typeof PRISM_TOOL_3D_GENERATOR !== 'undefined') {
      PRISM_TOOL_3D_GENERATOR.learnedToolHolders = this.learnedCADDatabase.toolHolders;
      PRISM_TOOL_3D_GENERATOR.learnedCuttingTools = this.learnedCADDatabase.cuttingTools;
    }
    // Inject into CAD_LIBRARY
    if (typeof CAD_LIBRARY !== 'undefined') {
      CAD_LIBRARY.learnedPartGeometry = this.learnedCADDatabase.parts;
    }
    // Inject into WORKHOLDING systems
    if (typeof WORKHOLDING_DATABASE !== 'undefined') {
      window.WORKHOLDING_LEARNED = this.learnedCADDatabase.fixtures;
    }
    console.log('[UNIFIED_CAD_LEARNING] Injected into existing modules');
  },
  /**
   * Register upload handlers
   */
  registerUploadHandlers() {
    // Global upload handler
    window.handleUnifiedCADUpload = async (file, category, metadata = {}) => {
      const learnedData = await this.analyzeCADFile(file, category, metadata);

      if (learnedData) {
        const type = metadata.type || 'general';
        const subtype = metadata.subtype || 'default';
        this.addLearnedData(category, type, subtype, learnedData);
        return learnedData;
      }
      return null;
    };
  },
  /**
   * Migrate any localStorage data to app database (one-time)
   */
  migrateLocalStorageData() {
    try {
      // Migrate machine learning data
      const machineLearned = localStorage.getItem('prism_machine_3d_learned');
      if (machineLearned) {
        const data = JSON.parse(machineLearned);
        for (const mfr in data) {
          if (!this.learnedCADDatabase.machines[mfr]) {
            this.learnedCADDatabase.machines[mfr] = {};
          }
          Object.assign(this.learnedCADDatabase.machines[mfr], data[mfr]);
        }
        console.log('[UNIFIED_CAD_LEARNING] Migrated machine data from localStorage');
      }
      // Migrate user models
      const userModels = localStorage.getItem('prism_user_machine_models');
      if (userModels) {
        // These will be re-analyzed if needed
        console.log('[UNIFIED_CAD_LEARNING] Found user models in localStorage');
      }
    } catch (e) {
      console.warn('[UNIFIED_CAD_LEARNING] Migration error:', e);
    }
  },
  // EXPORT/IMPORT

  /**
   * Export all learned data as JSON
   */
  exportLearnedData() {
    return JSON.stringify(this.learnedCADDatabase, null, 2);
  },
  /**
   * Import learned data from JSON
   */
  importLearnedData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);

      for (const category in data) {
        if (!this.learnedCADDatabase[category]) {
          this.learnedCADDatabase[category] = {};
        }
        for (const type in data[category]) {
          if (!this.learnedCADDatabase[category][type]) {
            this.learnedCADDatabase[category][type] = {};
          }
          Object.assign(this.learnedCADDatabase[category][type], data[category][type]);
        }
      }
      this.injectIntoModules();
      console.log('[UNIFIED_CAD_LEARNING] Imported learned data');
      return true;
    } catch (e) {
      console.error('[UNIFIED_CAD_LEARNING] Import error:', e);
      return false;
    }
  }
};
// Initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => PRISM_UNIFIED_CAD_LEARNING_SYSTEM.init(), 200);
    });
  } else {
    setTimeout(() => PRISM_UNIFIED_CAD_LEARNING_SYSTEM.init(), 200);
  }
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] UNIFIED_CAD_LEARNING_SYSTEM loaded');

// PRISM CAD UPLOAD DROPBOX UI SYSTEM

const PRISM_CAD_UPLOAD_UI = {

  /**
   * Create a CAD upload dropbox for a module
   */
  createDropbox(containerId, category, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[CAD_UPLOAD_UI] Container not found:', containerId);
      return null;
    }
    const dropboxId = `cadDropbox_${category}_${Date.now()}`;
    const inputId = `cadInput_${category}_${Date.now()}`;

    const dropboxHTML = `
      <div id="${dropboxId}" class="cad-upload-dropbox" style="
        margin: 10px 0;
        padding: 15px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08));
        border: 2px dashed rgba(99, 102, 241, 0.3);
        border-radius: 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
      " ondragover="PRISM_CAD_UPLOAD_UI.handleDragOver(event)"
         ondragleave="PRISM_CAD_UPLOAD_UI.handleDragLeave(event)"
         ondrop="PRISM_CAD_UPLOAD_UI.handleDrop(event, '${category}', ${JSON.stringify(options).replace(/"/g, "'")})">

        <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
        <div style="font-size: 12px; font-weight: 600; color: #a5b4fc; margin-bottom: 4px;">
          ${options.title || 'Upload CAD Model to Train AI'}
        </div>
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 10px;">
          Drag & drop STEP, STL, or OBJ files here
        </div>

        <label for="${inputId}" style="
          display: inline-block;
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          📁 Browse Files
        </label>
        <input type="file" id="${inputId}" accept=".step,.stp,.stl,.obj,.iges,.igs"
               style="display: none;"
               onchange="PRISM_CAD_UPLOAD_UI.handleFileSelect(event, '${category}', ${JSON.stringify(options).replace(/"/g, "'")})">

        <div id="${dropboxId}_status" style="margin-top: 10px; font-size: 10px; display: none;">
          <span class="status-text" style="color: #4ade80;">Processing...</span>
        </div>

        <div id="${dropboxId}_learned" style="margin-top: 8px; font-size: 10px; display: none;">
          <div style="color: #4ade80; font-weight: 600;">✓ Model Learned!</div>
          <div style="color: #9ca3af; margin-top: 4px;">
            <span id="${dropboxId}_confidence">Confidence: --</span>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', dropboxHTML);
    return dropboxId;
  },
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.8)';
    event.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))';
  },
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    event.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))';
  },
  async handleDrop(event, category, options) {
    event.preventDefault();
    event.stopPropagation();

    this.handleDragLeave(event);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await this.processFile(files[0], category, options, event.currentTarget.id);
    }
  },
  async handleFileSelect(event, category, options) {
    const files = event.target.files;
    if (files.length > 0) {
      const dropboxId = event.target.id.replace('cadInput_', 'cadDropbox_');
      await this.processFile(files[0], category, options, dropboxId);
    }
  },
  async processFile(file, category, options, dropboxId) {
    console.log('[CAD_UPLOAD_UI] Processing:', file.name, 'for', category);

    // Show status
    const statusEl = document.getElementById(`${dropboxId}_status`);
    const learnedEl = document.getElementById(`${dropboxId}_learned`);

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.querySelector('.status-text').textContent = 'Analyzing CAD geometry...';
    }
    try {
      // Use unified learning system
      if (typeof handleUnifiedCADUpload === 'function') {
        const metadata = {
          type: options.type || 'general',
          subtype: options.subtype || file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_'),
          ...options
        };
        const result = await handleUnifiedCADUpload(file, category, metadata);

        if (result) {
          if (statusEl) statusEl.style.display = 'none';
          if (learnedEl) {
            learnedEl.style.display = 'block';
            const confEl = document.getElementById(`${dropboxId}_confidence`);
            if (confEl) {
              confEl.textContent = `Confidence: ${Math.round((result.confidence || 0.85) * 100)}%`;
            }
          }
          // Dispatch success event
          window.dispatchEvent(new CustomEvent('cadUploadSuccess', {
            detail: { category, file: file.name, result }
          }));

          console.log('[CAD_UPLOAD_UI] Successfully learned from:', file.name);
        } else {
          throw new Error('Could not extract geometry');
        }
      } else {
        throw new Error('Learning system not available');
      }
    } catch (e) {
      console.error('[CAD_UPLOAD_UI] Error:', e);
      if (statusEl) {
        statusEl.querySelector('.status-text').style.color = '#f87171';
        statusEl.querySelector('.status-text').textContent = 'Error: ' + e.message;
      }
    }
  }
};
window.PRISM_CAD_UPLOAD_UI = PRISM_CAD_UPLOAD_UI;

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] CAD_UPLOAD_UI system loaded');

// CAD UPLOAD HANDLER FUNCTIONS - Connect dropboxes to learning system

async function processHolderCAD(file) {
    if (!file) return;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Processing holder CAD:', file.name);
    try {
        if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
            const holderType = document.getElementById('holderTypeFilter')?.value || 'general';
            const taperType = document.getElementById('holderTaperFilter')?.value || 'cat40';

            const result = await PRISM_UNIFIED_CAD_LEARNING_SYSTEM.analyzeCADFile(file, 'toolHolders', {
                type: holderType,
                subtype: taperType
            });

            if (result) {
                PRISM_UNIFIED_CAD_LEARNING_SYSTEM.addLearnedData('toolHolders', holderType, taperType, result);
                document.getElementById('holderCADLearnStatus').style.display = 'block';
                document.getElementById('holderLearnConf').textContent = Math.round((result.confidence || 0.85) * 100);
                (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Holder geometry learned:', result);
            }
        }
    } catch (e) {
        console.error('[PRISM] Holder CAD processing error:', e);
    }
}
async function processToolCAD(file) {
    if (!file) return;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Processing cutting tool CAD:', file.name);
    try {
        if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
            const toolType = document.getElementById('toolType')?.value || 'endmill_square';

            const result = await PRISM_UNIFIED_CAD_LEARNING_SYSTEM.analyzeCADFile(file, 'cuttingTools', {
                type: toolType,
                subtype: 'general'
            });

            if (result) {
                PRISM_UNIFIED_CAD_LEARNING_SYSTEM.addLearnedData('cuttingTools', toolType, 'general', result);
                document.getElementById('toolCADLearnStatus').style.display = 'block';
                document.getElementById('toolLearnConf').textContent = Math.round((result.confidence || 0.85) * 100);
                (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Tool geometry learned:', result);
            }
        }
    } catch (e) {
        console.error('[PRISM] Tool CAD processing error:', e);
    }
}
async function processFixtureCAD(file) {
    if (!file) return;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Processing fixture/workholding CAD:', file.name);
    try {
        if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
            const fixtureType = document.getElementById('workholdingCategory')?.value || 'vise';

            const result = await PRISM_UNIFIED_CAD_LEARNING_SYSTEM.analyzeCADFile(file, 'fixtures', {
                type: fixtureType,
                subtype: file.name.replace(/\.[^.]+$/, '').toLowerCase()
            });

            if (result) {
                PRISM_UNIFIED_CAD_LEARNING_SYSTEM.addLearnedData('fixtures', fixtureType, 'learned', result);
                document.getElementById('fixtureCADLearnStatus').style.display = 'block';
                document.getElementById('fixtureLearnConf').textContent = Math.round((result.confidence || 0.85) * 100);
                (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Fixture geometry learned:', result);
            }
        }
    } catch (e) {
        console.error('[PRISM] Fixture CAD processing error:', e);
    }
}
async function processPartCAD(file) {
    if (!file) return;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Processing part CAD:', file.name);
    try {
        if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
            const partName = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');

            const result = await PRISM_UNIFIED_CAD_LEARNING_SYSTEM.analyzeCADFile(file, 'parts', {
                type: partName,
                subtype: 'uploaded'
            });

            if (result) {
                PRISM_UNIFIED_CAD_LEARNING_SYSTEM.addLearnedData('parts', partName, 'uploaded', result);
                document.getElementById('partCADLearnStatus').style.display = 'block';
                document.getElementById('partLearnConf').textContent = Math.round((result.confidence || 0.85) * 100);
                (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Part geometry learned:', result);

                // Also trigger CAD_LIBRARY if available
                if (typeof CAD_LIBRARY !== 'undefined') {
                    CAD_LIBRARY.learnedPartGeometry = CAD_LIBRARY.learnedPartGeometry || {};
                    CAD_LIBRARY.learnedPartGeometry[partName] = result;
                }
            }
        }
    } catch (e) {
        console.error('[PRISM] Part CAD processing error:', e);
    }
}
// Global handler for machine CAD (connects existing upload to unified system)
async function processMachineCAD(file) {
    if (!file) return;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Processing machine CAD:', file.name);
    try {
        if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
            const manufacturer = document.getElementById('machineManufacturer')?.value || 'unknown';
            const machineType = document.getElementById('machineType')?.value || 'vmc';

            const result = await PRISM_UNIFIED_CAD_LEARNING_SYSTEM.analyzeCADFile(file, 'machines', {
                type: manufacturer.toLowerCase(),
                subtype: machineType
            });

            if (result) {
                PRISM_UNIFIED_CAD_LEARNING_SYSTEM.addLearnedData('machines', manufacturer.toLowerCase(), machineType, result);
                (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Machine geometry learned:', result);
            }
        }
        // Also use existing PRISM_MACHINE_3D_MODELS upload
        if (typeof PRISM_MACHINE_3D_MODELS !== 'undefined') {
            const manufacturer = document.getElementById('machineManufacturer')?.value || 'Unknown';
            const model = document.getElementById('machineModel')?.value || file.name;
            await PRISM_MACHINE_3D_MODELS.uploadMachineModel(file, { manufacturer, model });
        }
    } catch (e) {
        console.error('[PRISM] Machine CAD processing error:', e);
    }
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] CAD upload handler functions loaded');

// PRISM_EXAMPLE_PARTS_INTEGRATION
// Integrates EXAMPLE_PARTS_DATABASE and ADVANCED_EXAMPLE_PARTS into the
// PRISM_UNIFIED_CAD_LEARNING_SYSTEM to teach the CAD generator from sample files

const PRISM_EXAMPLE_PARTS_INTEGRATION = {
  version: '1.0.0',

  /**
   * Initialize - extract geometry from example parts and feed to learning system
   */
  init() {
    console.log('[EXAMPLE_PARTS_INTEGRATION] Initializing...');

    // Wait for dependencies
    setTimeout(() => {
      this.integrateExampleParts();
      this.integrateAdvancedParts();
      this.injectIntoLearningSystem();
    }, 500);

    return this;
  },
  /**
   * Extract learned geometry patterns from EXAMPLE_PARTS_DATABASE
   */
  integrateExampleParts() {
    if (typeof EXAMPLE_PARTS_DATABASE === 'undefined') {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] EXAMPLE_PARTS_DATABASE not found');
      return;
    }
    const parts = EXAMPLE_PARTS_DATABASE.getAllParts ?
                  EXAMPLE_PARTS_DATABASE.getAllParts() :
                  Object.keys(EXAMPLE_PARTS_DATABASE).filter(k =>
                    typeof EXAMPLE_PARTS_DATABASE[k] === 'object' &&
                    EXAMPLE_PARTS_DATABASE[k]?.metadata
                  ).map(k => EXAMPLE_PARTS_DATABASE[k]);

    console.log('[EXAMPLE_PARTS_INTEGRATION] Processing', parts.length, 'example parts');

    parts.forEach(part => {
      if (part?.metadata) {
        this.extractAndStore(part);
      }
    });
  },
  /**
   * Extract learned geometry from ADVANCED_EXAMPLE_PARTS
   */
  integrateAdvancedParts() {
    if (typeof ADVANCED_EXAMPLE_PARTS === 'undefined') {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] ADVANCED_EXAMPLE_PARTS not found');
      return;
    }
    const parts = Object.keys(ADVANCED_EXAMPLE_PARTS).filter(k =>
      typeof ADVANCED_EXAMPLE_PARTS[k] === 'object' &&
      ADVANCED_EXAMPLE_PARTS[k]?.metadata
    ).map(k => ADVANCED_EXAMPLE_PARTS[k]);

    console.log('[EXAMPLE_PARTS_INTEGRATION] Processing', parts.length, 'advanced parts');

    parts.forEach(part => {
      if (part?.metadata) {
        this.extractAndStore(part);
      }
    });
  },
  /**
   * Extract geometry patterns from a part and store in learning system
   */
  extractAndStore(part) {
    const metadata = part.metadata;
    const stock = part.stock || {};
    const features = part.features || [];
    const geometry2D = part.geometry2D || {};

    // Calculate learned ratios and patterns
    const learnedData = {
      source: 'EXAMPLE_PARTS_DATABASE',
      partNumber: metadata.partNumber,
      confidence: 0.95,  // High confidence - curated examples

      // Stock dimensions
      stockDimensions: {
        length: stock.length || 0,
        width: stock.width || 0,
        height: stock.height || 0,
        type: stock.type || 'rectangular'
      },
      // Feature statistics
      featureStats: this.analyzeFeatures(features),

      // Geometry patterns
      geometryPatterns: this.analyzeGeometry(geometry2D, features),

      // Machine requirements
      machineType: metadata.machineType || 'vmc',
      complexity: metadata.complexity || 'medium',
      setupCount: metadata.setupCount || 1,

      // Material
      material: metadata.material || stock.material || 'aluminum'
    };
    // Store in collection
    if (!this.learnedFromExamples) {
      this.learnedFromExamples = {};
    }
    const key = metadata.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || metadata.partNumber;
    this.learnedFromExamples[key] = learnedData;

    console.log('[EXAMPLE_PARTS_INTEGRATION] Learned from:', metadata.name);
  },
  /**
   * Analyze feature patterns
   */
  analyzeFeatures(features) {
    const stats = {
      totalCount: features.length,
      byType: {},
      toleranceRanges: { tight: 0, standard: 0, loose: 0 },
      commonDimensions: []
    };
    features.forEach(f => {
      // Count by type
      const type = f.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Analyze tolerances
      if (f.tolerance) {
        const tol = f.tolerance.dimension || f.tolerance.diameter || 0.01;
        if (tol <= 0.001) stats.toleranceRanges.tight++;
        else if (tol <= 0.005) stats.toleranceRanges.standard++;
        else stats.toleranceRanges.loose++;
      }
      // Collect common dimensions
      if (f.dimensions) {
        Object.entries(f.dimensions).forEach(([dim, val]) => {
          if (typeof val === 'number' && val > 0) {
            stats.commonDimensions.push({ dimension: dim, value: val, feature: type });
          }
        });
      }
    });

    return stats;
  },
  /**
   * Analyze 2D/3D geometry patterns
   */
  analyzeGeometry(geometry2D, features) {
    const patterns = {
      hasOutline: !!geometry2D.outline,
      hasPockets: features.some(f => f.type?.includes('pocket')),
      hasHoles: features.some(f => f.type?.includes('hole') || f.type?.includes('bore')),
      hasChamfers: features.some(f => f.type?.includes('chamfer')),
      hasFillets: features.some(f => f.type?.includes('fillet') || f.type?.includes('radius')),
      hasThreads: features.some(f => f.type?.includes('thread') || f.type?.includes('tap')),
      hasPatterns: features.some(f => f.pattern),

      // Pocket depth ratios
      pocketDepthRatios: [],

      // Hole patterns
      holePatterns: [],

      // Corner radii
      cornerRadii: []
    };
    // Extract pocket depth ratios
    features.filter(f => f.type?.includes('pocket')).forEach(f => {
      if (f.dimensions?.depth && f.dimensions?.length) {
        patterns.pocketDepthRatios.push(f.dimensions.depth / f.dimensions.length);
      }
    });

    // Extract corner radii
    if (geometry2D.outline?.cornerRadius) {
      patterns.cornerRadii.push(geometry2D.outline.cornerRadius);
    }
    features.filter(f => f.dimensions?.cornerRadius).forEach(f => {
      patterns.cornerRadii.push(f.dimensions.cornerRadius);
    });

    // Hole pattern analysis
    features.filter(f => f.pattern).forEach(f => {
      patterns.holePatterns.push({
        type: f.pattern.type,
        count: f.pattern.positions?.length || f.pattern.count || 0
      });
    });

    return patterns;
  },
  /**
   * Inject learned data into PRISM_UNIFIED_CAD_LEARNING_SYSTEM
   */
  injectIntoLearningSystem() {
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM === 'undefined') {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] Unified learning system not found');
      return;
    }
    if (!this.learnedFromExamples) {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] No examples processed');
      return;
    }
    // Add to unified system's parts database
    Object.entries(this.learnedFromExamples).forEach(([key, data]) => {
      PRISM_UNIFIED_CAD_LEARNING_SYSTEM.addLearnedData('parts', key, 'from_example', data);
    });

    // Also add to CAD_LIBRARY if available
    if (typeof CAD_LIBRARY !== 'undefined') {
      CAD_LIBRARY.learnedFromExamples = this.learnedFromExamples;
      console.log('[EXAMPLE_PARTS_INTEGRATION] Injected into CAD_LIBRARY');
    }
    // Add reference patterns for the CAD generator
    this.createGeneratorPatterns();

    console.log('[EXAMPLE_PARTS_INTEGRATION] Injected',
                Object.keys(this.learnedFromExamples).length,
                'parts into learning system');
  },
  /**
   * Create aggregated patterns for the CAD generator
   */
  createGeneratorPatterns() {
    // Aggregate patterns from all example parts
    const aggregated = {
      // Feature frequency by machine type
      featuresByMachine: {},

      // Common dimension ratios
      dimensionRatios: {
        pocketDepthToWidth: [],
        holeSpacingToSize: [],
        chamferToEdge: [],
        filletToWall: []
      },
      // Tolerance distributions by complexity
      tolerancesByComplexity: {},

      // Setup count by part type
      setupsByType: {}
    };
    Object.values(this.learnedFromExamples).forEach(part => {
      // Aggregate by machine type
      const machine = part.machineType || 'vmc';
      if (!aggregated.featuresByMachine[machine]) {
        aggregated.featuresByMachine[machine] = {};
      }
      Object.entries(part.featureStats?.byType || {}).forEach(([feat, count]) => {
        aggregated.featuresByMachine[machine][feat] =
          (aggregated.featuresByMachine[machine][feat] || 0) + count;
      });

      // Aggregate pocket depth ratios
      if (part.geometryPatterns?.pocketDepthRatios) {
        aggregated.dimensionRatios.pocketDepthToWidth.push(
          ...part.geometryPatterns.pocketDepthRatios
        );
      }
      // Aggregate tolerance distributions
      const complexity = part.complexity || 'medium';
      if (!aggregated.tolerancesByComplexity[complexity]) {
        aggregated.tolerancesByComplexity[complexity] = { tight: 0, standard: 0, loose: 0 };
      }
      if (part.featureStats?.toleranceRanges) {
        aggregated.tolerancesByComplexity[complexity].tight += part.featureStats.toleranceRanges.tight;
        aggregated.tolerancesByComplexity[complexity].standard += part.featureStats.toleranceRanges.standard;
        aggregated.tolerancesByComplexity[complexity].loose += part.featureStats.toleranceRanges.loose;
      }
    });

    // Store aggregated patterns
    this.aggregatedPatterns = aggregated;

    // Make available globally
    window.CAD_LEARNED_PATTERNS = aggregated;

    // Inject into CAD_LIBRARY
    if (typeof CAD_LIBRARY !== 'undefined') {
      CAD_LIBRARY.learnedPatterns = aggregated;
    }
  },
  /**
   * Get learned patterns for a specific machine type
   */
  getPatternsForMachine(machineType) {
    return this.aggregatedPatterns?.featuresByMachine?.[machineType] || {};
  },
  /**
   * Get average dimension ratios
   */
  getAverageRatios() {
    const ratios = this.aggregatedPatterns?.dimensionRatios || {};
    const averages = {};

    Object.entries(ratios).forEach(([key, values]) => {
      if (values.length > 0) {
        averages[key] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });

    return averages;
  },
  /**
   * Get recommended tolerances for complexity level
   */
  getTolerancesForComplexity(complexity) {
    return this.aggregatedPatterns?.tolerancesByComplexity?.[complexity] || null;
  }
};
// Initialize on load
if (typeof window !== 'undefined') {
  window.PRISM_EXAMPLE_PARTS_INTEGRATION = PRISM_EXAMPLE_PARTS_INTEGRATION;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => PRISM_EXAMPLE_PARTS_INTEGRATION.init(), 1000);
    });
  } else {
    setTimeout(() => PRISM_EXAMPLE_PARTS_INTEGRATION.init(), 1000);
  }
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] EXAMPLE_PARTS_INTEGRATION loaded');

const PRISM_MACHINE_3D_MODELS = {
  uploadedModels: {
    // Hurco Batch 3 (Uploaded CAD - January 2026)
    'hurco_vc600i': {
      source: 'Hurco VC600i.step', manufacturer: 'Hurco', model: 'VC600i', type: '3axis',
      geometry: { faces: 8067, points: 184564 }, priority: 'uploaded'
    },
    'hurco_vmx42i_uploaded': {
      source: 'Hurco VMX42i.step', manufacturer: 'Hurco', model: 'VMX42i', type: '3axis',
      geometry: { faces: 9005, points: 163119 }, priority: 'uploaded'
    },
    'hurco_vmx42swi': {
      source: 'Hurco VMX 42 SWi.step', manufacturer: 'Hurco', model: 'VMX42 SWi', type: '5axis',
      geometry: { faces: 9079, points: 166130 }, priority: 'uploaded'
    },
    'hurco_vmx42srti': {
      source: 'Hurco VMX42SRTi.step', manufacturer: 'Hurco', model: 'VMX42SRTi', type: '5axis',
      geometry: { faces: 9808, points: 171968 }, priority: 'uploaded'
    },
    'hurco_vmx64ti': {
      source: 'Hurco VMX64Ti.step', manufacturer: 'Hurco', model: 'VMX64Ti', type: '5axis',
      geometry: { faces: 8627, points: 183912 }, priority: 'uploaded'
    },
  },
  version: '1.0.0',

  // BUILT-IN MACHINE MODELS (metadata + simplified mesh data)
  builtInModels: {
    'okuma_genos_m460v-5ax': {
      id: 'okuma_genos_m460v-5ax',
      manufacturer: 'Okuma',
      model: 'GENOS M460V-5AX',
      type: '5-axis_vmc',
      source: 'user_upload',
      fileFormat: 'STEP',
      fileSize: 4237205,

      // Assembly structure (kinematic chain)
      components: [
        { id: 'static', name: 'Base/Frame', type: 'fixed', parent: null },
        { id: 'x_axis_head', name: 'X-Axis Head', type: 'linear', parent: 'static', axis: 'X', travel: [-230, 230] },
        { id: 'z_axis_head', name: 'Z-Axis/Spindle', type: 'linear', parent: 'x_axis_head', axis: 'Z', travel: [-200, 200] },
        { id: 'y_axis_table', name: 'Y-Axis Table', type: 'linear', parent: 'static', axis: 'Y', travel: [-200, 200] },
        { id: 'a_axis_table', name: 'A-Axis Trunnion', type: 'rotary', parent: 'y_axis_table', axis: 'A', range: [-30, 120] },
        { id: 'c_axis_table', name: 'C-Axis Rotary', type: 'rotary', parent: 'a_axis_table', axis: 'C', range: [-360, 360] }
      ],

      // Machine specs
      specs: {
        travelX: 460,
        travelY: 400,
        travelZ: 400,
        tableSize: 400,  // diameter
        maxRPM: 15000,
        spindleTaper: 'BBT40',
        controller: 'OSP-P300A',
        weight: 6500  // kg
      },
      // Bounding box (mm)
      boundingBox: {
        min: { x: -1200, y: -800, z: 0 },
        max: { x: 1200, y: 800, z: 2800 }
      },
      // Color scheme
      colors: {
        frame: 0x2a4d3a,      // Okuma green
        covers: 0x3d3d3d,     // Dark gray
        table: 0x4a4a4a,      // Medium gray
        spindle: 0x888888,    // Light gray
        accent: 0xff6600      // Orange accents
      },
      // Flag indicating full STEP file available
      hasFullModel: true,
      stepFileKey: 'okuma_genos_m460v-5ax_step'  // localStorage key if uploaded
    }
  },
  // USER-UPLOADED MODELS (stored in IndexedDB/localStorage)
  userModels: {},

  // DATABASE OPERATIONS

  /**
   * Initialize the 3D models database
   */
  init() {
    console.log('[PRISM_MACHINE_3D_MODELS] Initializing...');

    // Load user models from localStorage
    this.loadUserModels();

    // Register global functions
    window.uploadMachineModel = this.uploadMachineModel.bind(this);
    window.getMachineModel = this.getMachineModel.bind(this);
    window.listMachineModels = this.listMachineModels.bind(this);
    window.deleteMachineModel = this.deleteMachineModel.bind(this);

    console.log('[PRISM_MACHINE_3D_MODELS] Loaded ' + Object.keys(this.builtInModels).length + ' built-in models');
    console.log('[PRISM_MACHINE_3D_MODELS] Loaded ' + Object.keys(this.userModels).length + ' user models');

    return this;
  },
  /**
   * Load user models from localStorage/IndexedDB
   */
  loadUserModels() {
    try {
      const stored = localStorage.getItem('prism_user_machine_models');
      if (stored) {
        this.userModels = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[PRISM_MACHINE_3D_MODELS] Error loading user models:', e);
      this.userModels = {};
    }
  },
  /**
   * Save user models to localStorage
   */
  saveUserModels() {
    try {
      // Don't save the actual file data to localStorage (too large)
      // Just save metadata - actual files go to IndexedDB
      const metadata = {};
      for (const [key, model] of Object.entries(this.userModels)) {
        metadata[key] = {
          ...model,
          fileData: null,  // Don't store file data in localStorage
          hasFileData: !!model.fileData
        };
      }
      localStorage.setItem('prism_user_machine_models', JSON.stringify(metadata));
    } catch (e) {
      console.warn('[PRISM_MACHINE_3D_MODELS] Error saving user models:', e);
    }
  },
  /**
   * Upload a machine CAD model
   * @param {File} file - The CAD file (STEP, STL, OBJ, etc.)
   * @param {Object} metadata - Machine metadata
   * @returns {Promise<Object>} - The stored model entry
   */
  async uploadMachineModel(file, metadata = {}) {
    console.log('[PRISM_MACHINE_3D_MODELS] Uploading:', file.name);

    const fileExt = file.name.split('.').pop().toLowerCase();
    const supportedFormats = ['step', 'stp', 'stl', 'obj', 'gltf', 'glb', 'iges', 'igs'];

    if (!supportedFormats.includes(fileExt)) {
      throw new Error('Unsupported file format: ' + fileExt);
    }
    // Generate model ID
    const modelId = metadata.id || file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Read file as base64 for storage
    const fileData = await this.readFileAsBase64(file);

    // Create model entry
    const model = {
      id: modelId,
      manufacturer: metadata.manufacturer || 'Unknown',
      model: metadata.model || file.name.replace(/\.[^.]+$/, ''),
      type: metadata.type || 'unknown',
      source: 'user_upload',
      fileFormat: fileExt.toUpperCase(),
      fileName: file.name,
      fileSize: file.size,
      fileData: fileData,
      uploadDate: new Date().toISOString(),

      // Optional metadata
      specs: metadata.specs || {},
      components: metadata.components || [],
      boundingBox: metadata.boundingBox || null,
      colors: metadata.colors || {}
    };
    // Store in user models
    this.userModels[modelId] = model;

    // Save metadata to localStorage
    this.saveUserModels();

    // Store file data in IndexedDB for larger files
    await this.storeFileInIndexedDB(modelId, fileData);

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_MACHINE_3D_MODELS] Uploaded model:', modelId);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('machineModelUploaded', {
      detail: { modelId, model }
    }));

    return model;
  },
  /**
   * Read file as base64
   */
  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  /**
   * Store file data in IndexedDB
   */
  async storeFileInIndexedDB(modelId, fileData) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PRISM_MachineModels', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('models', 'readwrite');
        const store = tx.objectStore('models');
        store.put({ id: modelId, fileData: fileData });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  },
  /**
   * Get file data from IndexedDB
   */
  async getFileFromIndexedDB(modelId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PRISM_MachineModels', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('models', 'readonly');
        const store = tx.objectStore('models');
        const getRequest = store.get(modelId);
        getRequest.onsuccess = () => resolve(getRequest.result?.fileData || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  },
  /**
   * Get a machine model by ID (checks user models first, then built-in)
   * @param {string} modelId - Model ID or machine identifier
   * @returns {Object|null} - Model data or null
   */
  getMachineModel(modelId) {
    // Normalize ID
    const normalizedId = modelId.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Priority 1: User-uploaded models
    if (this.userModels[normalizedId]) {
      console.log('[PRISM_MACHINE_3D_MODELS] Found user model:', normalizedId);
      return { ...this.userModels[normalizedId], priority: 'user' };
    }
    // Priority 2: Built-in models
    if (this.builtInModels[normalizedId]) {
      console.log('[PRISM_MACHINE_3D_MODELS] Found built-in model:', normalizedId);
      return { ...this.builtInModels[normalizedId], priority: 'builtin' };
    }
    // Try fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(modelId);
    if (fuzzyMatch) {
      console.log('[PRISM_MACHINE_3D_MODELS] Found fuzzy match:', fuzzyMatch.id);
      return fuzzyMatch;
    }
    console.log('[PRISM_MACHINE_3D_MODELS] No model found for:', modelId);
    return null;
  },
  /**
   * Find a model using fuzzy matching
   */
  findFuzzyMatch(query) {
    const normalizedQuery = query.toLowerCase();

    // Check all models
    const allModels = { ...this.builtInModels, ...this.userModels };

    for (const [id, model] of Object.entries(allModels)) {
      // Match by manufacturer + model
      const fullName = (model.manufacturer + ' ' + model.model).toLowerCase();
      if (fullName.includes(normalizedQuery) || normalizedQuery.includes(fullName.replace(/[^a-z0-9]/g, ''))) {
        return { ...model, priority: this.userModels[id] ? 'user' : 'builtin' };
      }
      // Match by model name only
      if (model.model.toLowerCase().includes(normalizedQuery)) {
        return { ...model, priority: this.userModels[id] ? 'user' : 'builtin' };
      }
    }
    return null;
  },
  /**
   * List all available machine models
   */
  listMachineModels() {
    const models = [];

    // Add built-in models
    for (const [id, model] of Object.entries(this.builtInModels)) {
      models.push({
        id,
        manufacturer: model.manufacturer,
        model: model.model,
        type: model.type,
        source: 'builtin',
        hasFullModel: model.hasFullModel
      });
    }
    // Add user models (with priority indicator)
    for (const [id, model] of Object.entries(this.userModels)) {
      models.push({
        id,
        manufacturer: model.manufacturer,
        model: model.model,
        type: model.type,
        source: 'user',
        fileFormat: model.fileFormat,
        uploadDate: model.uploadDate
      });
    }
    return models;
  },
  /**
   * Delete a user-uploaded model
   */
  async deleteMachineModel(modelId) {
    if (this.userModels[modelId]) {
      delete this.userModels[modelId];
      this.saveUserModels();

      // Remove from IndexedDB
      try {
        const request = indexedDB.open('PRISM_MachineModels', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('models', 'readwrite');
          tx.objectStore('models').delete(modelId);
        };
      } catch (e) {
        console.warn('Error deleting from IndexedDB:', e);
      }
      console.log('[PRISM_MACHINE_3D_MODELS] Deleted model:', modelId);
      return true;
    }
    return false;
  },
  /**
   * Check if a specific machine has an uploaded model
   */
  hasUploadedModel(manufacturer, model) {
    const searchId = (manufacturer + '_' + model).toLowerCase().replace(/[^a-z0-9]/g, '_');
    return !!this.userModels[searchId] || !!this.builtInModels[searchId];
  }
};
// Initialize on load
if (typeof window !== 'undefined') {
  window.PRISM_MACHINE_3D_MODELS = PRISM_MACHINE_3D_MODELS;

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PRISM_MACHINE_3D_MODELS.init());
  } else {
    PRISM_MACHINE_3D_MODELS.init();
  }
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] MACHINE_3D_MODELS database module loaded');

// PRISM_MACHINE_3D_LEARNING_ENGINE - Learn from Uploaded CAD Models
// Purpose: Analyze uploaded machine CAD files to extract accurate proportions
// and improve the procedural 3D generator (MACHINE_MODEL_GENERATOR)
// Flow: User Upload → Extract Geometry → Calculate Ratios → Store Learned Data
//       → MACHINE_MODEL_GENERATOR uses learned data for better procedural models

const PRISM_MACHINE_3D_LEARNING_ENGINE = {
  version: '1.0.0',

  // LEARNED DIMENSION DATABASE
  // Stores manufacturer/model-specific proportions learned from uploaded CAD

  learnedDimensions: {
    // UNIFIED MACHINE CAD LEARNING DATABASE
    // All uploaded machine CAD models in flat structure (not nested by brand)
    // Format: manufacturer_model for easy lookup
    // Priority: 'uploaded_cad' overrides PRISM-generated models

    // --- DN Solutions (formerly Doosan) ---
    'dn_solutions_dnm_4000': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DNM 4000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4096, points: 560980 },
      specs: { type: '3AXIS_VMC', x: 800, y: 450, z: 510, rpm: 12000, taper: 'BT40' }
    },
    'dn_solutions_dnm_5700': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DNM 5700.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3397, points: 43808 },
      specs: { type: '3AXIS_VMC', x: 1300, y: 670, z: 625, rpm: 10000, taper: 'BT50' }
    },
    'dn_solutions_dvf_5000': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DVF 5000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4715, points: 84102 },
      specs: { type: '5AXIS_TRUNNION', x: 762, y: 520, z: 510, table: 500, rpm: 12000, taper: 'BT40' }
    },
    'dn_solutions_dvf_6500': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DVF 6500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3847, points: 71698 },
      specs: { type: '5AXIS_TRUNNION', x: 1050, y: 650, z: 600, table: 650, rpm: 12000, taper: 'BT40' }
    },
    'dn_solutions_dvf_8000': {
      manufacturer: 'DN_SOLUTIONS', source: 'DN Solutions DVF 8000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6373, points: 98743 },
      specs: { type: '5AXIS_TRUNNION', x: 1400, y: 850, z: 700, table: 800, rpm: 10000, taper: 'BT50' }
    },
    // --- Heller ---
    'heller_hf_3500': {
      manufacturer: 'HELLER', source: 'Heller HF 3500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6152, points: 163565 },
      specs: { type: '4AXIS_HMC', x: 710, y: 710, z: 710, pallet: 500, rpm: 12000, taper: 'HSK-A63' }
    },
    'heller_hf_5500': {
      manufacturer: 'HELLER', source: 'Heller HF 5500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5334, points: 111466 },
      specs: { type: '4AXIS_HMC', x: 900, y: 900, z: 900, pallet: 630, rpm: 10000, taper: 'HSK-A100' }
    },
    // --- Makino ---
    'makino_d200z': {
      manufacturer: 'MAKINO', source: 'Makino D200Z.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 762, points: 7866 },
      specs: { type: '5AXIS_TRUNNION', x: 350, y: 300, z: 250, table: 200, rpm: 45000, taper: 'HSK-E40' }
    },
    'makino_da300': {
      manufacturer: 'MAKINO', source: 'Makino DA300.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 813, points: 10015 },
      specs: { type: '5AXIS_TRUNNION', x: 450, y: 500, z: 350, table: 300, rpm: 20000, taper: 'HSK-A63' }
    },
    // --- Kern ---
    'kern_evo': {
      manufacturer: 'KERN', source: 'Kern Evo.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3181, points: 30837 },
      specs: { type: '3AXIS_VMC', x: 500, y: 430, z: 300, rpm: 50000, taper: 'HSK-E32', precision: 0.0005 }
    },
    'kern_evo_5ax': {
      manufacturer: 'KERN', source: 'Kern Evo 5AX.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3296, points: 32521 },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 430, z: 300, table: 200, rpm: 50000, taper: 'HSK-E32', precision: 0.001 }
    },
    'kern_micro_vario_hd': {
      manufacturer: 'KERN', source: 'Kern Micro Vario HD.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1260, points: 24202 },
      specs: { type: '5AXIS_TRUNNION', x: 300, y: 280, z: 250, table: 170, rpm: 50000, taper: 'HSK-E25', precision: 0.0003 }
    },
    'kern_pyramid_nano': {
      manufacturer: 'KERN', source: 'Kern Pyramid Nano.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4213, points: 27626 },
      specs: { type: '5AXIS_GANTRY', x: 500, y: 510, z: 300, rpm: 50000, taper: 'HSK-E25', precision: 0.0003 }
    },
    // --- Matsuura ---
    'matsuura_h_plus': {
      manufacturer: 'MATSUURA', source: 'Matsuura H.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 920, points: 6775 },
      specs: { type: '4AXIS_HMC', x: 560, y: 560, z: 625, rpm: 14000, taper: 'HSK-A63' }
    },
    'matsuura_mam72_35v': {
      manufacturer: 'MATSUURA', source: 'Matsuura MAM72-35V.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1769, points: 11011 },
      specs: { type: '5AXIS_TRUNNION', x: 550, y: 400, z: 300, table: 350, rpm: 20000, taper: 'HSK-A63' }
    },
    'matsuura_mam72_63v': {
      manufacturer: 'MATSUURA', source: 'Matsuura MAM72-63V.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 739, points: 4919 },
      specs: { type: '5AXIS_TRUNNION', x: 735, y: 610, z: 460, table: 630, rpm: 14000, taper: 'HSK-A63' }
    },
    'matsuura_mx_330': {
      manufacturer: 'MATSUURA', source: 'Matsuura MX-330.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1215, points: 15767 },
      specs: { type: '5AXIS_TRUNNION', x: 400, y: 535, z: 300, table: 330, rpm: 20000, taper: 'HSK-A63' }
    },
    'matsuura_mx_420': {
      manufacturer: 'MATSUURA', source: 'Matsuura MX-420.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1251, points: 12507 },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 620, z: 350, table: 420, rpm: 20000, taper: 'HSK-A63' }
    },
    'matsuura_mx_520': {
      manufacturer: 'MATSUURA', source: 'Matsuura MX-520.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 718, points: 4386 },
      specs: { type: '5AXIS_TRUNNION', x: 630, y: 735, z: 400, table: 520, rpm: 14000, taper: 'HSK-A63' }
    },
    'matsuura_vx_660': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-660.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1069, points: 7538 },
      specs: { type: '3AXIS_VMC', x: 660, y: 510, z: 460, rpm: 14000, taper: 'CAT40' }
    },
    'matsuura_vx_1000': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-1000.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1203, points: 9156 },
      specs: { type: '3AXIS_VMC', x: 1020, y: 530, z: 460, rpm: 14000, taper: 'CAT40' }
    },
    'matsuura_vx_1500': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-1500.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 318, points: 1826 },
      specs: { type: '3AXIS_VMC', x: 1524, y: 660, z: 560, rpm: 12000, taper: 'CAT40' }
    },
    'matsuura_vx_1500_4ax': {
      manufacturer: 'MATSUURA', source: 'Matsuura VX-1500 WITH RNA-320R ROTARY TABLE.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1631, points: 22711 },
      specs: { type: '4AXIS_VMC', x: 1524, y: 660, z: 560, table: 320, rpm: 12000, taper: 'CAT40' }
    },
    // --- Hurco ---
    'hurco_vm_one': {
      manufacturer: 'HURCO', source: 'Hurco VM One.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4804, points: 85250 },
      specs: { type: '3AXIS_VMC', x: 660, y: 356, z: 406, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vm_5i': {
      manufacturer: 'HURCO', source: 'Hurco VM 5i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3490, points: 21858 },
      specs: { type: '3AXIS_VMC', x: 508, y: 406, z: 406, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vm_10_hsi_plus': {
      manufacturer: 'HURCO', source: 'Hurco VM 10 HSi Plus.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4353, points: 152652 },
      specs: { type: '3AXIS_VMC', x: 660, y: 406, z: 508, rpm: 15000, taper: 'CAT40' }
    },
    'hurco_vm_10_uhsi': {
      manufacturer: 'HURCO', source: 'Hurco VM 10 UHSi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4919, points: 43932 },
      specs: { type: '3AXIS_VMC', x: 660, y: 406, z: 508, rpm: 24000, taper: 'HSK-A63' }
    },
    'hurco_vm_20i': {
      manufacturer: 'HURCO', source: 'Hurco VM 20i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3800, points: 25139 },
      specs: { type: '3AXIS_VMC', x: 762, y: 406, z: 508, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vm_30i': {
      manufacturer: 'HURCO', source: 'Hurco VM 30 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5158, points: 152163 },
      specs: { type: '3AXIS_VMC', x: 1016, y: 508, z: 610, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vm_50i': {
      manufacturer: 'HURCO', source: 'Hurco VM 50 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5565, points: 151771 },
      specs: { type: '3AXIS_VMC', x: 1270, y: 660, z: 610, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vmx24i': {
      manufacturer: 'HURCO', source: 'Hurco VMX24i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6836, points: 138762 },
      specs: { type: '3AXIS_VMC', x: 610, y: 508, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_24_hsi': {
      manufacturer: 'HURCO', source: 'Hurco VMX 24 HSi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6924, points: 42845 },
      specs: { type: '3AXIS_VMC', x: 610, y: 508, z: 610, rpm: 15000, taper: 'CAT40' }
    },
    'hurco_bx40i': {
      manufacturer: 'HURCO', source: 'Hurco BX40i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 6823, points: 50265 },
      specs: { type: '3AXIS_VMC', x: 1016, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_bx50i': {
      manufacturer: 'HURCO', source: 'Hurco BX50i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5934, points: 91801 },
      specs: { type: '3AXIS_VMC', x: 1270, y: 610, z: 610, rpm: 10000, taper: 'CAT50' }
    },
    'hurco_dcx_3226i': {
      manufacturer: 'HURCO', source: 'Hurco DCX3226i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4017, points: 28487 },
      specs: { type: '3AXIS_DOUBLE_COLUMN', x: 3200, y: 2600, z: 762, rpm: 6000, taper: 'CAT50' }
    },
    'hurco_vmx24_hsi_4ax': {
      manufacturer: 'HURCO', source: 'Hurco VMX 24 HSi 4ax.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 7256, points: 44372 },
      specs: { type: '4AXIS_VMC', x: 610, y: 508, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_42t_4ax': {
      manufacturer: 'HURCO', source: 'Hurco VMX 42T 4ax.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 530, points: 5121 },
      specs: { type: '4AXIS_VMC', x: 1067, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_hbmx_55i': {
      manufacturer: 'HURCO', source: 'Hurco HBMX 55 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 332, points: 2548 },
      specs: { type: 'HORIZONTAL_BORING', x: 1400, y: 1100, z: 900, rpm: 3500, taper: 'CAT50' }
    },
    'hurco_hbmx_80i': {
      manufacturer: 'HURCO', source: 'Hurco HBMX 80 i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 548, points: 6396 },
      specs: { type: 'HORIZONTAL_BORING', x: 2000, y: 1600, z: 1200, rpm: 3000, taper: 'CAT50' }
    },
    'hurco_vmx60swi': {
      manufacturer: 'HURCO', source: 'Hurco VMX60SWi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5255, points: 111234 },
      specs: { type: '5AXIS_SWIVEL', x: 1524, y: 660, z: 610, rpm: 10000, taper: 'CAT40' }
    },
    'hurco_vmx84swi': {
      manufacturer: 'HURCO', source: 'Hurco VMX 84 SWi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 17243, points: 228635 },
      specs: { type: '5AXIS_SWIVEL', x: 2134, y: 864, z: 762, rpm: 8000, taper: 'CAT50' }
    },
    'hurco_vmx42ui': {
      manufacturer: 'HURCO', source: 'Hurco VMX 42 Ui XP40 STA.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 15273, points: 301130 },
      specs: { type: '5AXIS_TRUNNION', x: 1067, y: 610, z: 610, table: 400, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_42_sr': {
      manufacturer: 'HURCO', source: 'Hurco Hurco VMX 42 SR.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 591, points: 3690 },
      specs: { type: '5AXIS_SWIVEL', x: 1067, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_60_sri': {
      manufacturer: 'HURCO', source: 'Hurco VMX 60 SRi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3626, points: 29647 },
      specs: { type: '5AXIS_SWIVEL', x: 1524, y: 660, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_dcx_32_5si': {
      manufacturer: 'HURCO', source: 'Hurco DCX32 5Si.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 7993, points: 124376 },
      specs: { type: '5AXIS_DOUBLE_COLUMN', x: 3200, y: 2000, z: 762, rpm: 10000, taper: 'HSK-A100' }
    },
    // --- Hurco Batch 3 (January 2026) - 5 models, 44,586 faces, 869,693 points ---
    'hurco_vc600i': {
      manufacturer: 'HURCO', source: 'Hurco VC600i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 8067, points: 184564 },
      specs: { type: '3AXIS_VMC', x: 660, y: 510, z: 510, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx_42_swi_cad': {
      manufacturer: 'HURCO', source: 'Hurco VMX 42 SWi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 9079, points: 166130 },
      specs: { type: '5AXIS_SWIVEL', x: 1067, y: 610, z: 610, table: 420, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx42srti': {
      manufacturer: 'HURCO', source: 'Hurco VMX42SRTi.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 9808, points: 171968 },
      specs: { type: '5AXIS_SWIVEL_ROTATE', x: 1067, y: 610, z: 610, table: 420, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx42i_cad': {
      manufacturer: 'HURCO', source: 'Hurco VMX42i.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 9005, points: 163119 },
      specs: { type: '3AXIS_VMC', x: 1067, y: 610, z: 610, rpm: 12000, taper: 'CAT40' }
    },
    'hurco_vmx64ti': {
      manufacturer: 'HURCO', source: 'Hurco VMX64Ti.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 8627, points: 183912 },
      specs: { type: '5AXIS_TRUNNION', x: 1626, y: 660, z: 610, table: 500, rpm: 10000, taper: 'CAT50' }
    },
    // --- Brother SPEEDIO ---
    'brother_s300x1': {
      manufacturer: 'BROTHER', source: 'Brother S300X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3200, points: 24500 },
      specs: { type: '3AXIS_VMC', x: 300, y: 440, z: 305, rpm: 16000, taper: 'BT30' }
    },
    'brother_s500x1': {
      manufacturer: 'BROTHER', source: 'Brother S500X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3500, points: 28000 },
      specs: { type: '3AXIS_VMC', x: 500, y: 400, z: 305, rpm: 16000, taper: 'BT30' }
    },
    'brother_s700x1': {
      manufacturer: 'BROTHER', source: 'Brother S700X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3800, points: 32000 },
      specs: { type: '3AXIS_VMC', x: 700, y: 400, z: 330, rpm: 16000, taper: 'BT30' }
    },
    'brother_s1000x1': {
      manufacturer: 'BROTHER', source: 'Brother S1000X1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4200, points: 38000 },
      specs: { type: '3AXIS_VMC', x: 1000, y: 500, z: 300, rpm: 16000, taper: 'BT30' }
    },
    'brother_m140x2': {
      manufacturer: 'BROTHER', source: 'Brother M140X2.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 2800, points: 22000 },
      specs: { type: '5AXIS_TRUNNION', x: 200, y: 440, z: 305, rpm: 16000, taper: 'BT30' }
    },
    'brother_u500xd1': {
      manufacturer: 'BROTHER', source: 'Brother U500Xd1.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 3600, points: 30000 },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 400, z: 305, rpm: 16000, taper: 'BT30' }
    },
    // --- Datron ---
    'datron_m8cube_3ax': {
      manufacturer: 'DATRON', source: 'Datron M8Cube 3 axis.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 1200, points: 8500 },
      specs: { type: '3AXIS_VMC', x: 800, y: 800, z: 200, rpm: 40000, taper: 'ER16' }
    },
    'datron_m8cube_5ax': {
      manufacturer: 'DATRON', source: 'Datron M8Cube 5 axis.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 2800, points: 18000 },
      specs: { type: '5AXIS_TRUNNION', x: 800, y: 800, z: 200, rpm: 40000, taper: 'ER16' }
    },
    'datron_neo': {
      manufacturer: 'DATRON', source: 'Datron neo.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 4800, points: 42000 },
      specs: { type: '3AXIS_VMC', x: 1020, y: 850, z: 280, rpm: 60000, taper: 'ER11' }
    },
    'datron_neo_4ax': {
      manufacturer: 'DATRON', source: 'Datron neo 4 axis.step', confidence: 0.95, priority: 'uploaded_cad',
      geometry: { faces: 5200, points: 48000 },
      specs: { type: '4AXIS_VMC', x: 1020, y: 850, z: 280, rpm: 60000, taper: 'ER11' }
    },
    // --- DMG MORI (kinematic data) ---
    'dmg_mori_dmu_50': {
      manufacturer: 'DMG_MORI', source: 'dmg_dmu_50.mch', confidence: 0.95, priority: 'uploaded_cad',
      kinematics: {
        type: 'BC_TABLE',
        linearAxes: { x: [-250, 250], y: [-225, 225], z: [-400, 0] },
        bAxisRange: [-5, 110], cAxisRange: [0, 360],
        rapidRate: 60000, tcpSupport: true
      },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 450, z: 400, rpm: 18000, taper: 'HSK-A63' }
    }
  },
    'okuma': {
      '5-axis_vmc': {
        source: 'okuma_genos_m460v-5ax.step',
        confidence: 0.95,
        sampleCount: 1,
        dimensions: {
          // Ratios relative to X travel
          baseWidthRatio: 2.6,      // 1200mm base for 460mm X travel
          baseDepthRatio: 1.74,     // 800mm depth for 460mm X
          baseHeightRatio: 0.87,    // 400mm base height for 460mm X
          columnWidthRatio: 0.65,   // Column width relative to X
          columnHeightRatio: 6.09,  // 2800mm height for 460mm X
          tableToBaseRatio: 0.87,   // 400mm table for 460mm X
          spindleHeadWidth: 280,    // Absolute mm
          spindleHeadHeight: 450,   // Absolute mm
          trunnionWidth: 350,       // A-axis arm width
          rotaryTableDia: 400,      // C-axis table diameter
        },
        colors: {
          frame: 0x2a4d3a,          // Okuma signature green
          covers: 0x3d3d3d,
          table: 0x505050,
          spindle: 0x888888,
          accent: 0xff6600          // Orange accents
        },
        kinematics: {
          type: 'trunnion',         // A/C on table
          aAxisRange: [-30, 120],
          cAxisRange: [-360, 360],
          spindleOrientation: 'vertical'
        }
      }
    },
    // Placeholder for other manufacturers (will be populated as users upload)
    'haas': {},
    'mazak': {},
    'dmg': {},
    'makino': {},
    'hurco': {},
    'doosan': {},
    'fanuc': {}
  },
  // INITIALIZATION

  // INTEGRATION WITH MACHINE_CAD_TRAINING_DATA

  /**
   * Sync learned dimensions with MACHINE_CAD_TRAINING_DATA
   */
  syncWithTrainingData() {
    if (typeof MACHINE_CAD_TRAINING_DATA === 'undefined') {
      console.warn('[MACHINE_3D_LEARNING_ENGINE] MACHINE_CAD_TRAINING_DATA not found');
      return;
    }
    // Update statistics from learned dimensions
    let totalMachines = 0;
    let totalPoints = 0;
    let totalFaces = 0;
    const manufacturers = new Set();

    Object.keys(this.learnedDimensions).forEach(key => {
      const machine = this.learnedDimensions[key];
      if (machine && machine.manufacturer) {
        totalMachines++;
        manufacturers.add(machine.manufacturer);
        if (machine.geometry) {
          totalPoints += machine.geometry.points || 0;
          totalFaces += machine.geometry.faces || 0;
        }
      }
    });

    // Update training data statistics
    MACHINE_CAD_TRAINING_DATA.statistics.totalMachines = totalMachines;
    MACHINE_CAD_TRAINING_DATA.statistics.totalPoints = totalPoints;
    MACHINE_CAD_TRAINING_DATA.statistics.totalFaces = totalFaces;
    MACHINE_CAD_TRAINING_DATA.statistics.manufacturers = manufacturers.size;

    console.log('[MACHINE_3D_LEARNING_ENGINE] Synced with MACHINE_CAD_TRAINING_DATA:', {
      machines: totalMachines,
      points: totalPoints,
      faces: totalFaces,
      manufacturers: manufacturers.size
    });
  },
  /**
   * Get machine for 3D generation using learned data
   */
  getMachineForGeneration(machineId) {
    const learned = this.learnedDimensions[machineId];
    if (learned) {
      return {
        ...learned,
        pattern: MACHINE_CAD_TRAINING_DATA.getMachinePattern(learned.specs?.type || '3AXIS_VMC'),
        style: MACHINE_CAD_TRAINING_DATA.getManufacturerStyle(learned.manufacturer)
      };
    }
    return null;
  },
  /**
   * Generate 3D model using learned data and generation engine
   */
  generate3DModel(machineId, options = {}) {
    const machineData = this.getMachineForGeneration(machineId);
    if (!machineData) {
      console.warn('[MACHINE_3D_LEARNING_ENGINE] No learned data for:', machineId);
      return null;
    }
    if (typeof COMPLETE_MACHINE_CAD_GENERATION_ENGINE !== 'undefined') {
      return COMPLETE_MACHINE_CAD_GENERATION_ENGINE.generateMachine({
        manufacturer: machineData.manufacturer,
        model: machineId,
        type: machineData.specs?.type || '3AXIS_VMC',
        travelX: machineData.specs?.x || 500,
        travelY: machineData.specs?.y || 400,
        travelZ: machineData.specs?.z || 400,
        tableSize: machineData.specs?.table || 300,
        rpm: machineData.specs?.rpm || 10000,
        taper: machineData.specs?.taper || 'CAT40'
      }, options);
    }
    return null;
  },
  /**
   * Get all learned machines by manufacturer
   */
  getMachinesByManufacturer(manufacturer) {
    const mfr = manufacturer.toUpperCase();
    return Object.entries(this.learnedDimensions)
      .filter(([key, val]) => val.manufacturer === mfr)
      .map(([key, val]) => ({ id: key, ...val }));
  },
  /**
   * Get learning statistics
   */
  getLearningStats() {
    let stats = {
      totalMachines: 0,
      totalPoints: 0,
      totalFaces: 0,
      manufacturerCounts: {},
      typeCounts: {}
    };
    Object.values(this.learnedDimensions).forEach(machine => {
      if (machine && machine.manufacturer) {
        stats.totalMachines++;
        stats.totalPoints += machine.geometry?.points || 0;
        stats.totalFaces += machine.geometry?.faces || 0;

        const mfr = machine.manufacturer;
        stats.manufacturerCounts[mfr] = (stats.manufacturerCounts[mfr] || 0) + 1;

        const type = machine.specs?.type || 'unknown';
        stats.typeCounts[type] = (stats.typeCounts[type] || 0) + 1;
      }
    });

    return stats;
  },
  init() {
    console.log('[MACHINE_3D_LEARNING_ENGINE] Initializing...');

    // Load any previously learned data from localStorage
    this.loadLearnedData();

    // Register event listener for new uploads
    window.addEventListener('machineModelUploaded', (e) => {
      this.analyzeUploadedModel(e.detail.model);
    });

    // Inject learned dimensions into MACHINE_MODEL_GENERATOR
    this.injectLearnedDimensions();

    // Sync with MACHINE_CAD_TRAINING_DATA
    this.syncWithTrainingData();

    // Export API
    window.MACHINE_CAD_LEARNING = {
      getStats: () => this.getLearningStats(),
      getMachine: (id) => this.getMachineForGeneration(id),
      generate3D: (id, opts) => this.generate3DModel(id, opts),
      getByManufacturer: (mfr) => this.getMachinesByManufacturer(mfr)
    };
    console.log('[MACHINE_3D_LEARNING_ENGINE] Ready - learned from',
                this.getLearnedModelCount(), 'models');

    return this;
  },
  // GEOMETRY ANALYSIS

  /**
   * Analyze an uploaded model to extract proportions
   */
  async analyzeUploadedModel(modelInfo) {
    console.log('[MACHINE_3D_LEARNING_ENGINE] Analyzing:', modelInfo.id);

    const manufacturer = (modelInfo.manufacturer || 'unknown').toLowerCase();
    const machineType = modelInfo.type || '3-axis_vmc';

    // Extract geometry data
    const geometryData = await this.extractGeometryFromModel(modelInfo);

    if (!geometryData) {
      console.warn('[MACHINE_3D_LEARNING_ENGINE] Could not extract geometry');
      return null;
    }
    // Calculate proportional ratios
    const ratios = this.calculateRatios(geometryData, modelInfo.specs);

    // Store learned dimensions
    if (!this.learnedDimensions[manufacturer]) {
      this.learnedDimensions[manufacturer] = {};
    }
    const existing = this.learnedDimensions[manufacturer][machineType];

    if (existing) {
      // Average with existing data for better accuracy
      this.learnedDimensions[manufacturer][machineType] = this.mergeLearnedData(existing, ratios);
    } else {
      this.learnedDimensions[manufacturer][machineType] = ratios;
    }
    // Save and inject
    this.saveLearnedData();
    this.injectLearnedDimensions();

    console.log('[MACHINE_3D_LEARNING_ENGINE] Learned dimensions from:', modelInfo.id);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('machine3DLearned', {
      detail: { manufacturer, machineType, ratios }
    }));

    return ratios;
  },
  /**
   * Extract geometry from a model (STEP, STL, etc.)
   */
  async extractGeometryFromModel(modelInfo) {
    // For STEP files, parse the assembly structure
    if (modelInfo.fileFormat === 'STEP' || modelInfo.fileFormat === 'STP') {
      return this.extractFromSTEP(modelInfo);
    }
    // For mesh files (STL/OBJ), use bounding box
    if (modelInfo.boundingBox) {
      return this.extractFromBoundingBox(modelInfo);
    }
    // Use component structure if available
    if (modelInfo.components && modelInfo.components.length > 0) {
      return this.extractFromComponents(modelInfo);
    }
    return null;
  },
  /**
   * Extract geometry from STEP file structure
   */
  extractFromSTEP(modelInfo) {
    // Use the pre-analyzed component data from PRISM_MACHINE_3D_MODELS
    const bb = modelInfo.boundingBox || {
      min: { x: -1200, y: -800, z: 0 },
      max: { x: 1200, y: 800, z: 2800 }
    };
    const specs = modelInfo.specs || {};

    return {
      overallWidth: bb.max.x - bb.min.x,
      overallDepth: bb.max.y - bb.min.y,
      overallHeight: bb.max.z - bb.min.z,
      travelX: specs.travelX || 460,
      travelY: specs.travelY || 400,
      travelZ: specs.travelZ || 400,
      tableSize: specs.tableSize || 400,
      components: modelInfo.components || [],
      colors: modelInfo.colors || {}
    };
  },
  /**
   * Extract from bounding box data
   */
  extractFromBoundingBox(modelInfo) {
    const bb = modelInfo.boundingBox;
    const specs = modelInfo.specs || {};

    return {
      overallWidth: bb.max.x - bb.min.x,
      overallDepth: bb.max.y - bb.min.y,
      overallHeight: bb.max.z - bb.min.z,
      travelX: specs.travelX || (bb.max.x - bb.min.x) * 0.4,
      travelY: specs.travelY || (bb.max.y - bb.min.y) * 0.4,
      travelZ: specs.travelZ || (bb.max.z - bb.min.z) * 0.3,
      tableSize: specs.tableSize || 400,
      components: [],
      colors: modelInfo.colors || {}
    };
  },
  /**
   * Extract from component structure
   */
  extractFromComponents(modelInfo) {
    const specs = modelInfo.specs || {};
    let travelX = 0, travelY = 0, travelZ = 0;

    // Extract travels from component axis ranges
    modelInfo.components.forEach(comp => {
      if (comp.axis === 'X' && comp.travel) {
        travelX = Math.abs(comp.travel[1] - comp.travel[0]);
      }
      if (comp.axis === 'Y' && comp.travel) {
        travelY = Math.abs(comp.travel[1] - comp.travel[0]);
      }
      if (comp.axis === 'Z' && comp.travel) {
        travelZ = Math.abs(comp.travel[1] - comp.travel[0]);
      }
    });

    return {
      overallWidth: specs.travelX ? specs.travelX * 2.5 : travelX * 2.5,
      overallDepth: specs.travelY ? specs.travelY * 2 : travelY * 2,
      overallHeight: specs.travelZ ? specs.travelZ * 5 : travelZ * 5,
      travelX: specs.travelX || travelX,
      travelY: specs.travelY || travelY,
      travelZ: specs.travelZ || travelZ,
      tableSize: specs.tableSize || 400,
      components: modelInfo.components,
      colors: modelInfo.colors || {}
    };
  },
  /**
   * Calculate proportional ratios from geometry
   */
  calculateRatios(geometry, specs = {}) {
    const travelX = geometry.travelX || 460;

    return {
      source: 'user_upload',
      confidence: 0.9,
      sampleCount: 1,
      dimensions: {
        baseWidthRatio: geometry.overallWidth / travelX,
        baseDepthRatio: geometry.overallDepth / travelX,
        baseHeightRatio: (geometry.overallHeight * 0.15) / travelX,  // Base is ~15% of height
        columnWidthRatio: 0.6,  // Estimated
        columnHeightRatio: geometry.overallHeight / travelX,
        tableToBaseRatio: geometry.tableSize / travelX,
        spindleHeadWidth: 280,
        spindleHeadHeight: 450,
        trunnionWidth: 350,
        rotaryTableDia: geometry.tableSize
      },
      colors: geometry.colors,
      kinematics: this.extractKinematics(geometry.components)
    };
  },
  /**
   * Extract kinematic structure from components
   */
  extractKinematics(components) {
    if (!components || components.length === 0) {
      return { type: 'standard', spindleOrientation: 'vertical' };
    }
    const hasAAxis = components.some(c => c.axis === 'A');
    const hasBAxis = components.some(c => c.axis === 'B');
    const hasCAxis = components.some(c => c.axis === 'C');

    let type = 'standard';
    if (hasAAxis && hasCAxis) type = 'trunnion';
    else if (hasBAxis && hasCAxis) type = 'swivel_head';
    else if (hasCAxis) type = 'rotary_table';

    const aComp = components.find(c => c.axis === 'A');
    const cComp = components.find(c => c.axis === 'C');

    return {
      type,
      aAxisRange: aComp?.range || [-30, 120],
      cAxisRange: cComp?.range || [-360, 360],
      spindleOrientation: 'vertical'
    };
  },
  /**
   * Merge new learned data with existing
   */
  mergeLearnedData(existing, newData) {
    const sampleCount = (existing.sampleCount || 1) + 1;
    const weight = 1 / sampleCount;

    // Weighted average of dimensions
    const mergedDims = {};
    for (const key in newData.dimensions) {
      if (existing.dimensions && existing.dimensions[key] !== undefined) {
        mergedDims[key] = existing.dimensions[key] * (1 - weight) +
                         newData.dimensions[key] * weight;
      } else {
        mergedDims[key] = newData.dimensions[key];
      }
    }
    return {
      source: 'multiple_uploads',
      confidence: Math.min(0.99, existing.confidence + 0.02),
      sampleCount,
      dimensions: mergedDims,
      colors: newData.colors || existing.colors,
      kinematics: newData.kinematics || existing.kinematics
    };
  },
  // INTEGRATION WITH MACHINE_MODEL_GENERATOR

  /**
   * Inject learned dimensions into MACHINE_MODEL_GENERATOR
   */
  injectLearnedDimensions() {
    if (typeof MACHINE_MODEL_GENERATOR === 'undefined') {
      console.warn('[MACHINE_3D_LEARNING_ENGINE] MACHINE_MODEL_GENERATOR not found');
      return;
    }
    // Add manufacturer-specific dimension lookup
    if (!MACHINE_MODEL_GENERATOR.getLearnedDimensions) {
      MACHINE_MODEL_GENERATOR.getLearnedDimensions = (manufacturer, machineType) => {
        return this.getLearnedDimensions(manufacturer, machineType);
      };
    }
    // Add method to get best dimensions for a machine
    if (!MACHINE_MODEL_GENERATOR.getBestDimensions) {
      MACHINE_MODEL_GENERATOR.getBestDimensions = (machine) => {
        const mfr = (machine.manufacturer || '').toLowerCase();
        const type = machine.type || '3-axis_vmc';

        // Check for learned dimensions
        const learned = this.getLearnedDimensions(mfr, type);
        if (learned && learned.confidence > 0.7) {
          console.log('[MACHINE_MODEL_GENERATOR] Using learned dimensions for', mfr, type);
          return {
            ...MACHINE_MODEL_GENERATOR.standardDimensions.vmc,
            ...learned.dimensions,
            _source: 'learned',
            _confidence: learned.confidence
          };
        }
        // Fall back to standard dimensions
        const machineClass = this.getMachineClass(type);
        return {
          ...MACHINE_MODEL_GENERATOR.standardDimensions[machineClass],
          _source: 'standard',
          _confidence: 0.5
        };
      };
    }
    // Add method to get manufacturer colors
    if (!MACHINE_MODEL_GENERATOR.getManufacturerColors) {
      MACHINE_MODEL_GENERATOR.getManufacturerColors = (manufacturer) => {
        return this.getManufacturerColors(manufacturer);
      };
    }
    console.log('[MACHINE_3D_LEARNING_ENGINE] Injected into MACHINE_MODEL_GENERATOR');
  },
  /**
   * Get learned dimensions for a manufacturer/type
   */
  getLearnedDimensions(manufacturer, machineType) {
    const mfr = manufacturer.toLowerCase();

    if (this.learnedDimensions[mfr] && this.learnedDimensions[mfr][machineType]) {
      return this.learnedDimensions[mfr][machineType];
    }
    // Try to find closest match
    if (this.learnedDimensions[mfr]) {
      const types = Object.keys(this.learnedDimensions[mfr]);
      if (types.length > 0) {
        // Find closest machine type
        const closest = types.find(t => t.includes('vmc') || t.includes('axis'));
        if (closest) return this.learnedDimensions[mfr][closest];
      }
    }
    return null;
  },
  /**
   * Get machine class from type string
   */
  getMachineClass(type) {
    if (type.includes('lathe') || type.includes('turn')) return 'lathe';
    if (type.includes('hmc')) return 'hmc';
    if (type.includes('5-axis') || type.includes('5axis')) return 'trunnion';
    return 'vmc';
  },
  /**
   * Get manufacturer-specific colors
   */
  getManufacturerColors(manufacturer) {
    const colorSchemes = {
      okuma: { frame: 0x2a4d3a, covers: 0x3d3d3d, accent: 0xff6600 },
      haas: { frame: 0x1a1a1a, covers: 0x2d2d2d, accent: 0xff0000 },
      mazak: { frame: 0x003366, covers: 0x2d2d2d, accent: 0x0066cc },
      dmg: { frame: 0x1a1a1a, covers: 0x333333, accent: 0x00aaff },
      makino: { frame: 0x2a2a4a, covers: 0x3d3d3d, accent: 0x0066ff },
      hurco: { frame: 0x2d2d2d, covers: 0x404040, accent: 0xff6600 },
      doosan: { frame: 0x2a2a2a, covers: 0x3d3d3d, accent: 0x0088ff },
      fanuc: { frame: 0xcccc00, covers: 0x3d3d3d, accent: 0xffff00 }
    };
    const mfr = manufacturer.toLowerCase();

    // Check if we have learned colors
    if (this.learnedDimensions[mfr]) {
      const types = Object.keys(this.learnedDimensions[mfr]);
      for (const type of types) {
        if (this.learnedDimensions[mfr][type].colors) {
          return this.learnedDimensions[mfr][type].colors;
        }
      }
    }
    return colorSchemes[mfr] || colorSchemes.haas;
  },
  // PERSISTENCE

  /**
   * Save learned data to localStorage
   */
  saveLearnedData() {
    try {
      localStorage.setItem('prism_machine_3d_learned', JSON.stringify(this.learnedDimensions));
      console.log('[MACHINE_3D_LEARNING_ENGINE] Saved learned data');
    } catch (e) {
      console.warn('[MACHINE_3D_LEARNING_ENGINE] Error saving:', e);
    }
  },
  /**
   * Load learned data from localStorage
   */
  loadLearnedData() {
    try {
      const stored = localStorage.getItem('prism_machine_3d_learned');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with built-in data
        for (const mfr in parsed) {
          if (!this.learnedDimensions[mfr]) {
            this.learnedDimensions[mfr] = {};
          }
          for (const type in parsed[mfr]) {
            this.learnedDimensions[mfr][type] = parsed[mfr][type];
          }
        }
      }
    } catch (e) {
      console.warn('[MACHINE_3D_LEARNING_ENGINE] Error loading:', e);
    }
  },
  /**
   * Get count of learned models
   */
  getLearnedModelCount() {
    let count = 0;
    for (const mfr in this.learnedDimensions) {
      count += Object.keys(this.learnedDimensions[mfr]).length;
    }
    return count;
  },
  /**
   * Export learned data
   */
  exportLearnedData() {
    return JSON.stringify(this.learnedDimensions, null, 2);
  },
  /**
   * Import learned data
   */
  importLearnedData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      for (const mfr in data) {
        if (!this.learnedDimensions[mfr]) {
          this.learnedDimensions[mfr] = {};
        }
        for (const type in data[mfr]) {
          this.learnedDimensions[mfr][type] = data[mfr][type];
        }
      }
      this.saveLearnedData();
      this.injectLearnedDimensions();
      console.log('[MACHINE_3D_LEARNING_ENGINE] Imported learned data');
    } catch (e) {
      console.error('[MACHINE_3D_LEARNING_ENGINE] Import error:', e);
    }
  }
};
// Initialize on load
if (typeof window !== 'undefined') {
  window.PRISM_MACHINE_3D_LEARNING_ENGINE = PRISM_MACHINE_3D_LEARNING_ENGINE;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PRISM_MACHINE_3D_LEARNING_ENGINE.init());

// PRISM_MACHINE_3D_LEARNING_ENGINE now delegates to PRISM_UNIFIED_CAD_LEARNING_SYSTEM
if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
    PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions = PRISM_UNIFIED_CAD_LEARNING_SYSTEM.learnedCADDatabase.machines;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] MACHINE_3D_LEARNING_ENGINE linked to UNIFIED_CAD_LEARNING_SYSTEM');
}
  } else {
    // Delay to ensure MACHINE_MODEL_GENERATOR is loaded first
    setTimeout(() => PRISM_MACHINE_3D_LEARNING_ENGINE.init(), 100);
  }
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] MACHINE_3D_LEARNING_ENGINE loaded');

// PRISM_LEARNED_KINEMATICS_BRIDGE v1.0.0
// Purpose: Connect learned machine kinematics from uploaded CAD to simulation
// Flow: PRISM_MACHINE_3D_LEARNING_ENGINE → This Bridge → PRISM_KINEMATIC_SOLVER

const PRISM_LEARNED_KINEMATICS_BRIDGE = {
  version: '1.0.0',

  // Cached kinematic configurations from learned data
  learnedConfigs: new Map(),

  // Default kinematic templates
  templates: {
    vmc_3axis: {
      type: 'cartesian',
      axes: ['X', 'Y', 'Z'],
      joints: [
        { name: 'X', type: 'linear', direction: [1, 0, 0], limits: [-500, 500], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Y', type: 'linear', direction: [0, 1, 0], limits: [-400, 400], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Z', type: 'linear', direction: [0, 0, 1], limits: [-500, 0], maxVelocity: 20000, maxAccel: 4000 }
      ],
      tcp: { x: 0, y: 0, z: -100 }
    },
    vmc_5axis_ac: {
      type: 'trunnion',
      axes: ['X', 'Y', 'Z', 'A', 'C'],
      joints: [
        { name: 'X', type: 'linear', direction: [1, 0, 0], limits: [-500, 500], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Y', type: 'linear', direction: [0, 1, 0], limits: [-400, 400], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Z', type: 'linear', direction: [0, 0, 1], limits: [-500, 0], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'A', type: 'rotary', axis: [1, 0, 0], limits: [-30, 120], maxVelocity: 6000, maxAccel: 2000 },
        { name: 'C', type: 'rotary', axis: [0, 0, 1], limits: [-360, 360], maxVelocity: 9000, maxAccel: 3000 }
      ],
      pivotPoint: { x: 0, y: 0, z: -50 },
      tcp: { x: 0, y: 0, z: -100 }
    },
    vmc_5axis_bc: {
      type: 'head_table',
      axes: ['X', 'Y', 'Z', 'B', 'C'],
      joints: [
        { name: 'X', type: 'linear', direction: [1, 0, 0], limits: [-500, 500], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Y', type: 'linear', direction: [0, 1, 0], limits: [-400, 400], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Z', type: 'linear', direction: [0, 0, 1], limits: [-500, 0], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'B', type: 'rotary', axis: [0, 1, 0], limits: [-120, 30], maxVelocity: 6000, maxAccel: 2000 },
        { name: 'C', type: 'rotary', axis: [0, 0, 1], limits: [-360, 360], maxVelocity: 9000, maxAccel: 3000 }
      ],
      headPivot: { x: 0, y: 0, z: 0 },
      tcp: { x: 0, y: 0, z: -150 }
    },
    lathe_xz: {
      type: 'lathe',
      axes: ['X', 'Z'],
      joints: [
        { name: 'X', type: 'linear', direction: [0, 1, 0], limits: [-200, 300], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'Z', type: 'linear', direction: [1, 0, 0], limits: [-50, 1000], maxVelocity: 30000, maxAccel: 5000 }
      ],
      spindleAxis: [1, 0, 0]
    },
    mill_turn: {
      type: 'mill_turn',
      axes: ['X', 'Y', 'Z', 'B', 'C'],
      joints: [
        { name: 'X', type: 'linear', direction: [0, 1, 0], limits: [-200, 300], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'Y', type: 'linear', direction: [0, 0, 1], limits: [-100, 100], maxVelocity: 15000, maxAccel: 3000 },
        { name: 'Z', type: 'linear', direction: [1, 0, 0], limits: [-50, 1000], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'B', type: 'rotary', axis: [0, 0, 1], limits: [-120, 30], maxVelocity: 4000, maxAccel: 1500 },
        { name: 'C', type: 'rotary', axis: [1, 0, 0], limits: [0, 360], maxVelocity: 6000, maxAccel: 2000 }
      ],
      spindleAxis: [1, 0, 0]
    }
  },
  // INITIALIZATION

  init() {
    console.log('[LEARNED_KINEMATICS_BRIDGE] Initializing...');

    // Load cached configs
    this.loadCachedConfigs();

    // Listen for new learned data
    window.addEventListener('machine3DLearned', (e) => {
      this.processLearnedKinematics(e.detail);
    });

    // Integrate with PRISM_KINEMATIC_SOLVER
    this.integrateWithKinematicSolver();

    // Integrate with ULTIMATE_3D_MACHINE_SYSTEM
    this.integrateWithAnimationSystem();

    console.log('[LEARNED_KINEMATICS_BRIDGE] Ready with', this.learnedConfigs.size, 'learned configs');
    return this;
  },
  // PROCESS LEARNED KINEMATICS

  processLearnedKinematics(detail) {
    const { manufacturer, machineType, ratios } = detail;
    const key = `${manufacturer}_${machineType}`;

    console.log('[LEARNED_KINEMATICS_BRIDGE] Processing learned kinematics:', key);

    // Extract kinematic data from learned ratios
    const kinematicConfig = this.buildKinematicConfig(ratios, machineType);

    // Store in cache
    this.learnedConfigs.set(key, {
      config: kinematicConfig,
      source: 'learned',
      confidence: ratios.confidence || 0.9,
      timestamp: Date.now()
    });

    // Save to localStorage
    this.saveCachedConfigs();

    // Update PRISM_KINEMATIC_SOLVER models
    this.updateKinematicSolverModel(key, kinematicConfig);

    // Dispatch event for other systems
    window.dispatchEvent(new CustomEvent('kinematicsUpdated', {
      detail: { key, config: kinematicConfig }
    }));

    return kinematicConfig;
  },
  // BUILD KINEMATIC CONFIG FROM LEARNED DATA

  buildKinematicConfig(ratios, machineType) {
    // Get base template
    const baseTemplate = this.getBaseTemplate(machineType);
    const kinematics = ratios.kinematics || {};
    const dimensions = ratios.dimensions || {};

    // Clone and modify template
    const config = JSON.parse(JSON.stringify(baseTemplate));

    // Update axis limits from learned data
    if (kinematics.aAxisRange) {
      const aJoint = config.joints.find(j => j.name === 'A');
      if (aJoint) {
        aJoint.limits = kinematics.aAxisRange;
      }
    }
    if (kinematics.cAxisRange) {
      const cJoint = config.joints.find(j => j.name === 'C');
      if (cJoint) {
        cJoint.limits = kinematics.cAxisRange;
      }
    }
    if (kinematics.bAxisRange) {
      const bJoint = config.joints.find(j => j.name === 'B');
      if (bJoint) {
        bJoint.limits = kinematics.bAxisRange;
      }
    }
    // Update pivot point if available
    if (dimensions.pivotPointZ !== undefined) {
      config.pivotPoint = config.pivotPoint || {};
      config.pivotPoint.z = dimensions.pivotPointZ;
    }
    // Update rotary table diameter
    if (dimensions.rotaryTableDia) {
      config.rotaryTableDia = dimensions.rotaryTableDia;
    }
    // Update kinematics type
    if (kinematics.type) {
      config.type = kinematics.type;
    }
    // Add spindle orientation
    config.spindleOrientation = kinematics.spindleOrientation || 'vertical';

    return config;
  },
  // GET BASE TEMPLATE

  getBaseTemplate(machineType) {
    const type = (machineType || '').toLowerCase();

    if (type.includes('5') && (type.includes('ac') || type.includes('trunnion'))) {
      return this.templates.vmc_5axis_ac;
    }
    if (type.includes('5') && (type.includes('bc') || type.includes('head'))) {
      return this.templates.vmc_5axis_bc;
    }
    if (type.includes('mill') && type.includes('turn')) {
      return this.templates.mill_turn;
    }
    if (type.includes('lathe') || type.includes('turn')) {
      return this.templates.lathe_xz;
    }
    return this.templates.vmc_3axis;
  },
  // INTEGRATE WITH PRISM_KINEMATIC_SOLVER

  integrateWithKinematicSolver() {
    if (typeof PRISM_KINEMATIC_SOLVER === 'undefined') {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] PRISM_KINEMATIC_SOLVER not found');
      return;
    }
    // Add method to get learned model
    PRISM_KINEMATIC_SOLVER.getLearnedModel = (manufacturer, machineType) => {
      const key = `${manufacturer.toLowerCase()}_${machineType}`;
      const cached = this.learnedConfigs.get(key);

      if (cached && cached.confidence > 0.7) {
        return cached.config;
      }
      return null;
    };
    // Enhance getModel to check learned configs first
    const originalGetModel = PRISM_KINEMATIC_SOLVER.getModel.bind(PRISM_KINEMATIC_SOLVER);

    PRISM_KINEMATIC_SOLVER.getModel = (type, manufacturer) => {
      // Check for learned model first
      if (manufacturer) {
        const learned = PRISM_KINEMATIC_SOLVER.getLearnedModel(manufacturer, type);
        if (learned) {
          console.log('[KINEMATIC_SOLVER] Using learned model for', manufacturer, type);
          return this.convertToSolverModel(learned);
        }
      }
      // Fall back to original
      return originalGetModel(type);
    };
    // Add method to update model at runtime
    PRISM_KINEMATIC_SOLVER.updateModelFromLearned = (key, config) => {
      this.updateKinematicSolverModel(key, config);
    };
    console.log('[LEARNED_KINEMATICS_BRIDGE] Integrated with PRISM_KINEMATIC_SOLVER');
  },
  // CONVERT TO SOLVER MODEL FORMAT

  convertToSolverModel(learnedConfig) {
    const model = {
      type: learnedConfig.type,
      axes: learnedConfig.joints.map(j => j.name),
      joints: learnedConfig.joints.map(j => ({
        name: j.name,
        type: j.type,
        axis: j.direction || j.axis,
        limits: j.limits,
        maxVelocity: j.maxVelocity,
        maxAccel: j.maxAccel
      })),
      tcp: learnedConfig.tcp,
      pivotPoint: learnedConfig.pivotPoint,

      // Forward kinematics function
      forward: (joints) => {
        return this.computeForwardKinematics(learnedConfig, joints);
      },
      // Inverse kinematics function
      inverse: (pose, toolAxis) => {
        return this.computeInverseKinematics(learnedConfig, pose, toolAxis);
      }
    };
    return model;
  },
  // COMPUTE FORWARD KINEMATICS

  computeForwardKinematics(config, joints) {
    let position = { x: 0, y: 0, z: 0 };
    let orientation = { i: 0, j: 0, k: -1 }; // Default: tool points down

    // Apply linear joints
    for (const joint of config.joints) {
      if (joint.type === 'linear') {
        const value = joints[joint.name] || 0;
        const dir = joint.direction || [1, 0, 0];
        position.x += dir[0] * value;
        position.y += dir[1] * value;
        position.z += dir[2] * value;
      }
    }
    // Apply rotary joints
    const aJoint = config.joints.find(j => j.name === 'A');
    const bJoint = config.joints.find(j => j.name === 'B');
    const cJoint = config.joints.find(j => j.name === 'C');

    if (aJoint && joints.A !== undefined) {
      const aRad = joints.A * Math.PI / 180;
      // Rotate around X axis
      const cosA = Math.cos(aRad);
      const sinA = Math.sin(aRad);
      orientation.j = -sinA;
      orientation.k = -cosA;
    }
    if (bJoint && joints.B !== undefined) {
      const bRad = joints.B * Math.PI / 180;
      // Rotate around Y axis
      const cosB = Math.cos(bRad);
      const sinB = Math.sin(bRad);
      orientation.i = sinB;
      orientation.k = -cosB;
    }
    if (cJoint && joints.C !== undefined) {
      const cRad = joints.C * Math.PI / 180;
      // Rotate around Z axis (affects X/Y components of orientation)
      const cosC = Math.cos(cRad);
      const sinC = Math.sin(cRad);
      const oldI = orientation.i;
      const oldJ = orientation.j;
      orientation.i = oldI * cosC - oldJ * sinC;
      orientation.j = oldI * sinC + oldJ * cosC;
    }
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      i: orientation.i,
      j: orientation.j,
      k: orientation.k,
      a: joints.A || 0,
      b: joints.B || 0,
      c: joints.C || 0
    };
  },
  // COMPUTE INVERSE KINEMATICS

  computeInverseKinematics(config, pose, toolAxis) {
    const joints = {};
    const hasA = config.joints.some(j => j.name === 'A');
    const hasB = config.joints.some(j => j.name === 'B');
    const hasC = config.joints.some(j => j.name === 'C');

    // Default tool axis if not provided
    toolAxis = toolAxis || { i: 0, j: 0, k: -1 };

    // Calculate rotary angles from tool axis
    if (hasA && hasC) {
      // AC configuration (trunnion)
      const A = Math.acos(-toolAxis.k) * 180 / Math.PI;
      let C = Math.atan2(toolAxis.j, toolAxis.i) * 180 / Math.PI;
      if (Math.abs(A) < 0.001) C = 0;
      joints.A = A;
      joints.C = C;
    } else if (hasB && hasC) {
      // BC configuration (head/table)
      const B = Math.atan2(toolAxis.i, -toolAxis.k) * 180 / Math.PI;
      let C = Math.atan2(toolAxis.j, toolAxis.i) * 180 / Math.PI;
      if (Math.abs(B) < 0.001) C = 0;
      joints.B = B;
      joints.C = C;
    }
    // Linear joints from position
    joints.X = pose.x;
    joints.Y = pose.y;
    joints.Z = pose.z;

    // Apply pivot point compensation if available
    if (config.pivotPoint) {
      // Compensate for rotary axis pivot
      // This is simplified - full implementation would consider all rotations
    }
    return joints;
  },
  // UPDATE KINEMATIC SOLVER MODEL

  updateKinematicSolverModel(key, config) {
    if (typeof PRISM_KINEMATIC_SOLVER === 'undefined') return;

    const solverModel = this.convertToSolverModel(config);

    // Add to PRISM_KINEMATIC_SOLVER.models
    PRISM_KINEMATIC_SOLVER.models[key] = solverModel;

    console.log('[LEARNED_KINEMATICS_BRIDGE] Updated KINEMATIC_SOLVER with model:', key);
  },
  // INTEGRATE WITH ANIMATION SYSTEM

  integrateWithAnimationSystem() {
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM === 'undefined') {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] ULTIMATE_3D_MACHINE_SYSTEM not found');
      return;
    }
    // Add method to get axis config from learned data
    ULTIMATE_3D_MACHINE_SYSTEM.animation.getLearnedAxisConfig = (machineKey) => {
      const cached = this.learnedConfigs.get(machineKey);
      if (!cached) return null;

      const axisConfig = {};
      for (const joint of cached.config.joints) {
        axisConfig[joint.name] = {
          type: joint.type,
          direction: joint.type === 'linear' ?
            (joint.direction[0] === 1 ? 'x' : joint.direction[1] === 1 ? 'y' : 'z') : null,
          rotationAxis: joint.type === 'rotary' ?
            (joint.axis[0] === 1 ? 'x' : joint.axis[1] === 1 ? 'y' : 'z') : null,
          limits: joint.limits,
          maxVelocity: joint.maxVelocity,
          maxAccel: joint.maxAccel
        };
      }
      return axisConfig;
    };
    // Enhance init to use learned configs
    const originalInit = ULTIMATE_3D_MACHINE_SYSTEM.animation.init.bind(ULTIMATE_3D_MACHINE_SYSTEM.animation);

    ULTIMATE_3D_MACHINE_SYSTEM.animation.init = function(machineModel, config) {
      // Check for learned config
      const machineKey = machineModel.userData?.machineKey;
      if (machineKey) {
        const learnedConfig = this.getLearnedAxisConfig(machineKey);
        if (learnedConfig) {
          config = { ...config, axes: { ...config?.axes, ...learnedConfig } };
          console.log('[Animation] Using learned axis config for:', machineKey);
        }
      }
      return originalInit(machineModel, config);
    };
    console.log('[LEARNED_KINEMATICS_BRIDGE] Integrated with ULTIMATE_3D_MACHINE_SYSTEM.animation');
  },
  // PERSISTENCE

  loadCachedConfigs() {
    try {
      const stored = localStorage.getItem('prism_learned_kinematics');
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [key, value] of Object.entries(parsed)) {
          this.learnedConfigs.set(key, value);
        }
        console.log('[LEARNED_KINEMATICS_BRIDGE] Loaded', this.learnedConfigs.size, 'cached configs');
      }
    } catch (e) {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] Failed to load cached configs:', e);
    }
  },
  saveCachedConfigs() {
    try {
      const obj = Object.fromEntries(this.learnedConfigs);
      localStorage.setItem('prism_learned_kinematics', JSON.stringify(obj));
    } catch (e) {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] Failed to save configs:', e);
    }
  },
  // API

  getConfig(manufacturer, machineType) {
    const key = `${manufacturer.toLowerCase()}_${machineType}`;
    return this.learnedConfigs.get(key)?.config || null;
  },
  getAllConfigs() {
    return Object.fromEntries(this.learnedConfigs);
  },
  exportConfigs() {
    return JSON.stringify(Object.fromEntries(this.learnedConfigs), null, 2);
  }
};
// Initialize
window.PRISM_LEARNED_KINEMATICS_BRIDGE = PRISM_LEARNED_KINEMATICS_BRIDGE;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PRISM_LEARNED_KINEMATICS_BRIDGE.init());
} else {
  setTimeout(() => PRISM_LEARNED_KINEMATICS_BRIDGE.init(), 150);
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] LEARNED_KINEMATICS_BRIDGE loaded');

// PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE v1.0.0
// Purpose: Learn how machine axes behave during motion
// Tracks: Velocity profiles, acceleration curves, jerk characteristics,
//         servo lag, following errors, backlash, thermal drift

const PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE = {
  version: '1.0.0',

  // LEARNED BEHAVIOR DATABASE

  learnedBehaviors: {
    // Per-machine axis behavior profiles
    // Key: machineId, Value: { axes: { X: {...}, Y: {...}, ... } }
  },
  // Observation buffer for learning
  observations: [],
  maxObservations: 10000,

  // Default behavior templates
  defaultBehaviors: {
    linear: {
      maxVelocity: 30000,        // mm/min
      maxAcceleration: 5000,     // mm/min²
      maxJerk: 50000,            // mm/min³
      servoLag: 0.002,           // seconds
      followingError: 0.005,     // mm at rapid
      backlash: 0.005,           // mm
      repeatability: 0.002,      // mm
      thermalCoeff: 0.00001,     // mm/°C expansion
      resonanceFreq: 50,         // Hz (to avoid)
      velocityProfile: 'trapezoidal'  // 'trapezoidal', 's-curve', 'jerk-limited'
    },
    rotary: {
      maxVelocity: 6000,         // deg/min
      maxAcceleration: 2000,     // deg/min²
      maxJerk: 20000,            // deg/min³
      servoLag: 0.003,           // seconds
      followingError: 0.01,      // degrees at rapid
      backlash: 0.008,           // degrees
      repeatability: 0.003,      // degrees
      indexAccuracy: 0.002,      // degrees
      clampingDelay: 0.5,        // seconds
      velocityProfile: 's-curve'
    }
  },
  // INITIALIZATION

  init() {
    console.log('[AXIS_BEHAVIOR_LEARNING] Initializing...');

    // Load saved behaviors
    this.loadLearnedBehaviors();

    // Listen for motion events
    window.addEventListener('axisMotionComplete', (e) => {
      this.recordObservation(e.detail);
    });

    // Listen for probing results (calibration data)
    window.addEventListener('probeResultReceived', (e) => {
      this.learnFromProbing(e.detail);
    });

    // Integrate with simulation systems
    this.integrateWithSimulation();

    console.log('[AXIS_BEHAVIOR_LEARNING] Ready with',
                Object.keys(this.learnedBehaviors).length, 'machine profiles');

    return this;
  },
  // RECORD MOTION OBSERVATION

  recordObservation(detail) {
    const observation = {
      timestamp: Date.now(),
      machineId: detail.machineId,
      axis: detail.axis,
      startPos: detail.startPos,
      endPos: detail.endPos,
      commandedVelocity: detail.velocity,
      actualVelocity: detail.actualVelocity,
      acceleration: detail.acceleration,
      duration: detail.duration,
      followingError: detail.followingError,
      motorLoad: detail.motorLoad,
      temperature: detail.temperature
    };
    this.observations.push(observation);

    // Keep buffer size manageable
    if (this.observations.length > this.maxObservations) {
      this.observations.shift();
    }
    // Learn from accumulated observations
    this.learnFromObservations(detail.machineId, detail.axis);
  },
  // LEARN FROM OBSERVATIONS

  learnFromObservations(machineId, axis) {
    const axisObservations = this.observations.filter(o =>
      o.machineId === machineId && o.axis === axis
    );

    if (axisObservations.length < 10) return; // Need minimum data

    // Calculate average behaviors
    const avgVelocity = this.average(axisObservations.map(o => o.actualVelocity));
    const avgAccel = this.average(axisObservations.map(o => o.acceleration));
    const avgFollowError = this.average(axisObservations.map(o => o.followingError).filter(e => e));

    // Calculate velocity profile characteristics
    const velocityProfile = this.analyzeVelocityProfile(axisObservations);

    // Update learned behaviors
    if (!this.learnedBehaviors[machineId]) {
      this.learnedBehaviors[machineId] = { axes: {} };
    }
    const existing = this.learnedBehaviors[machineId].axes[axis] || this.getDefaultBehavior(axis);

    this.learnedBehaviors[machineId].axes[axis] = {
      ...existing,
      maxVelocity: Math.max(existing.maxVelocity, avgVelocity * 1.1),
      followingError: avgFollowError || existing.followingError,
      velocityProfile: velocityProfile.type,
      accelTime: velocityProfile.accelTime,
      decelTime: velocityProfile.decelTime,
      observationCount: axisObservations.length,
      lastUpdated: Date.now()
    };
    // Save periodically
    if (axisObservations.length % 100 === 0) {
      this.saveLearnedBehaviors();
    }
  },
  // ANALYZE VELOCITY PROFILE

  analyzeVelocityProfile(observations) {
    // Analyze motion profile shape
    // Returns: { type: 'trapezoidal'|'s-curve'|'jerk-limited', accelTime, decelTime }

    const profiles = observations.filter(o => o.duration > 0.1); // Filter short moves

    if (profiles.length < 5) {
      return { type: 'trapezoidal', accelTime: 0.1, decelTime: 0.1 };
    }
    // Calculate average acceleration/deceleration times
    let totalAccelTime = 0;
    let totalDecelTime = 0;

    for (const obs of profiles) {
      // Estimate accel time from duration and velocity
      const distance = Math.abs(obs.endPos - obs.startPos);
      const avgVel = distance / obs.duration;

      // Simplified: assume symmetric accel/decel
      const rampTime = (obs.commandedVelocity - avgVel) / obs.acceleration;
      totalAccelTime += Math.abs(rampTime);
      totalDecelTime += Math.abs(rampTime);
    }
    const avgAccelTime = totalAccelTime / profiles.length;
    const avgDecelTime = totalDecelTime / profiles.length;

    // Determine profile type based on jerk behavior
    // S-curve has smoother transitions
    const hasJerkLimiting = avgAccelTime > 0.05;

    return {
      type: hasJerkLimiting ? 's-curve' : 'trapezoidal',
      accelTime: avgAccelTime,
      decelTime: avgDecelTime
    };
  },
  // LEARN FROM PROBING

  learnFromProbing(detail) {
    const { machineId, axis, measuredPos, commandedPos, direction, temperature } = detail;

    if (!this.learnedBehaviors[machineId]) {
      this.learnedBehaviors[machineId] = { axes: {} };
    }
    const existing = this.learnedBehaviors[machineId].axes[axis] || this.getDefaultBehavior(axis);

    // Calculate positioning error
    const error = Math.abs(measuredPos - commandedPos);

    // Learn backlash from direction changes
    if (direction === 'reversal') {
      const backlashSamples = existing.backlashSamples || [];
      backlashSamples.push(error);

      if (backlashSamples.length > 10) {
        backlashSamples.shift();
      }
      existing.backlash = this.average(backlashSamples);
      existing.backlashSamples = backlashSamples;
    }
    // Learn thermal expansion
    if (temperature !== undefined) {
      const tempSamples = existing.tempSamples || [];
      tempSamples.push({ temp: temperature, error: error });

      if (tempSamples.length > 20) {
        const thermalCoeff = this.calculateThermalCoeff(tempSamples);
        existing.thermalCoeff = thermalCoeff;
      }
      existing.tempSamples = tempSamples;
    }
    // Update repeatability
    const repeatSamples = existing.repeatSamples || [];
    repeatSamples.push(error);
    if (repeatSamples.length > 50) repeatSamples.shift();
    existing.repeatability = this.standardDeviation(repeatSamples) * 2; // 2-sigma
    existing.repeatSamples = repeatSamples;

    this.learnedBehaviors[machineId].axes[axis] = existing;
    this.saveLearnedBehaviors();

    console.log('[AXIS_BEHAVIOR_LEARNING] Learned from probing:', axis,
                'backlash:', existing.backlash?.toFixed(4),
                'repeatability:', existing.repeatability?.toFixed(4));
  },
  // GET BEHAVIOR FOR SIMULATION

  getBehavior(machineId, axis) {
    const machineData = this.learnedBehaviors[machineId];
    if (machineData?.axes?.[axis]) {
      return { ...this.getDefaultBehavior(axis), ...machineData.axes[axis] };
    }
    return this.getDefaultBehavior(axis);
  },
  getDefaultBehavior(axis) {
    const isRotary = ['A', 'B', 'C'].includes(axis);
    return { ...this.defaultBehaviors[isRotary ? 'rotary' : 'linear'] };
  },
  // PREDICT MOTION TIME

  predictMotionTime(machineId, axis, distance, maxVelocity) {
    const behavior = this.getBehavior(machineId, axis);

    // Trapezoidal profile: time = distance/velocity + accel_time
    const cruiseVel = Math.min(maxVelocity, behavior.maxVelocity);
    const accelTime = cruiseVel / behavior.maxAcceleration;
    const accelDist = 0.5 * behavior.maxAcceleration * accelTime * accelTime;

    if (distance < 2 * accelDist) {
      // Short move - triangular profile
      return 2 * Math.sqrt(distance / behavior.maxAcceleration);
    }
    // Long move - trapezoidal profile
    const cruiseDist = distance - 2 * accelDist;
    const cruiseTime = cruiseDist / cruiseVel;

    return 2 * accelTime + cruiseTime;
  },
  // PREDICT FOLLOWING ERROR

  predictFollowingError(machineId, axis, velocity) {
    const behavior = this.getBehavior(machineId, axis);

    // Following error increases with velocity
    const ratio = velocity / behavior.maxVelocity;
    return behavior.followingError * ratio;
  },
  // INTEGRATE WITH SIMULATION

  integrateWithSimulation() {
    // Integrate with ULTIMATE_3D_MACHINE_SYSTEM
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') {
      ULTIMATE_3D_MACHINE_SYSTEM.animation.getAxisBehavior = (machineId, axis) => {
        return this.getBehavior(machineId, axis);
      };
      ULTIMATE_3D_MACHINE_SYSTEM.animation.predictMoveTime = (machineId, axis, dist, vel) => {
        return this.predictMotionTime(machineId, axis, dist, vel);
      };
      console.log('[AXIS_BEHAVIOR_LEARNING] Integrated with ULTIMATE_3D_MACHINE_SYSTEM');
    }
    // Integrate with PRISM_KINEMATIC_SOLVER
    if (typeof PRISM_KINEMATIC_SOLVER !== 'undefined') {
      PRISM_KINEMATIC_SOLVER.getAxisBehavior = (machineId, axis) => {
        return this.getBehavior(machineId, axis);
      };
      console.log('[AXIS_BEHAVIOR_LEARNING] Integrated with PRISM_KINEMATIC_SOLVER');
    }
    // Integrate with G-code backplot
    if (typeof PRISM_GCODE_BACKPLOT_ENGINE !== 'undefined') {
      PRISM_GCODE_BACKPLOT_ENGINE.axisBehaviors = this;

      console.log('[AXIS_BEHAVIOR_LEARNING] Integrated with PRISM_GCODE_BACKPLOT_ENGINE');
    }
  },
  // UTILITY FUNCTIONS

  average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },
  standardDeviation(arr) {
    const avg = this.average(arr);
    const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  },
  calculateThermalCoeff(samples) {
    // Linear regression to find thermal coefficient
    if (samples.length < 3) return 0.00001;

    const temps = samples.map(s => s.temp);
    const errors = samples.map(s => s.error);

    const n = samples.length;
    const sumX = temps.reduce((a, b) => a + b, 0);
    const sumY = errors.reduce((a, b) => a + b, 0);
    const sumXY = temps.reduce((acc, t, i) => acc + t * errors[i], 0);
    const sumX2 = temps.reduce((acc, t) => acc + t * t, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.abs(slope);
  },
  // PERSISTENCE

  loadLearnedBehaviors() {
    try {
      const stored = localStorage.getItem('prism_axis_behaviors');
      if (stored) {
        this.learnedBehaviors = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[AXIS_BEHAVIOR_LEARNING] Failed to load:', e);
    }
  },
  saveLearnedBehaviors() {
    try {
      // Clean up internal arrays before saving
      const toSave = JSON.parse(JSON.stringify(this.learnedBehaviors));
      for (const machine of Object.values(toSave)) {
        for (const axis of Object.values(machine.axes || {})) {
          delete axis.backlashSamples;
          delete axis.tempSamples;
          delete axis.repeatSamples;
        }
      }
      localStorage.setItem('prism_axis_behaviors', JSON.stringify(toSave));
    } catch (e) {
      console.warn('[AXIS_BEHAVIOR_LEARNING] Failed to save:', e);
    }
  },
  // API

  getAllBehaviors() {
    return this.learnedBehaviors;
  },
  exportBehaviors() {
    return JSON.stringify(this.learnedBehaviors, null, 2);
  },
  importBehaviors(json) {
    try {
      const imported = JSON.parse(json);
      this.learnedBehaviors = { ...this.learnedBehaviors, ...imported };
      this.saveLearnedBehaviors();
      return true;
    } catch (e) {
      return false;
    }
  }
};
// Initialize
window.PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE = PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE.init());
} else {
  setTimeout(() => PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE.init(), 160);
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] AXIS_BEHAVIOR_LEARNING_ENGINE loaded');

// PRISM_CONTACT_CONSTRAINT_ENGINE v1.0.0
// Purpose: Handle contact constraints for simulation
// Features: Penetration resolution, constraint forces, contact points,
//           friction modeling, joint constraints, collision response

const PRISM_CONTACT_CONSTRAINT_ENGINE = {
  version: '1.0.0',

  // Configuration
  config: {
    penetrationTolerance: 0.001,    // mm - minimum penetration to trigger
    maxPenetrationDepth: 10,        // mm - maximum allowed penetration
    contactStiffness: 100000,       // N/mm - spring constant for soft contact
    contactDamping: 1000,           // N·s/mm - damping coefficient
    frictionStatic: 0.3,            // static friction coefficient
    frictionDynamic: 0.2,           // dynamic friction coefficient
    restitution: 0.1,               // bounce coefficient (0-1)
    solverIterations: 10,           // constraint solver iterations
    baumgarteStabilization: 0.2,    // position correction factor
    warmStarting: true              // use previous solution as start
  },
  // Active constraints
  activeConstraints: [],

  // Contact manifold (current contact points)
  contactManifold: [],

  // Previous solution for warm starting
  previousSolution: null,

  // INITIALIZATION

  init() {
    console.log('[CONTACT_CONSTRAINT_ENGINE] Initializing...');

    // Integrate with collision system
    this.integrateWithCollisionSystem();

    // Integrate with simulation
    this.integrateWithSimulation();

    console.log('[CONTACT_CONSTRAINT_ENGINE] Ready');
    return this;
  },
  // CONTACT DETECTION AND CREATION

  /**
   * Process collision results and create contact constraints
   */
  processCollisions(collisionResults) {
    // Clear old manifold
    this.contactManifold = [];

    if (!collisionResults.hasCollision && collisionResults.collisions?.length === 0) {
      return { contacts: [], constraints: [] };
    }
    const contacts = [];

    for (const collision of collisionResults.collisions || []) {
      // Get detailed contact information
      const contactInfo = this.computeContactInfo(collision);

      if (contactInfo && contactInfo.penetrationDepth > this.config.penetrationTolerance) {
        contacts.push(contactInfo);
        this.contactManifold.push(contactInfo);
      }
    }
    // Create constraints for each contact
    const constraints = contacts.map(c => this.createContactConstraint(c));

    return { contacts, constraints };
  },
  /**
   * Compute detailed contact information
   */
  computeContactInfo(collision) {
    const { componentA, componentB, point, normal, depth } = collision;

    return {
      id: `contact_${componentA}_${componentB}_${Date.now()}`,
      bodyA: componentA,
      bodyB: componentB,
      contactPoint: point || { x: 0, y: 0, z: 0 },
      contactNormal: normal || { x: 0, y: 1, z: 0 },
      penetrationDepth: depth || 0,
      tangent1: this.computeTangent(normal),
      tangent2: this.computeTangent2(normal),
      relativeVelocity: { x: 0, y: 0, z: 0 },
      isResting: false,
      lifetime: 0
    };
  },
  /**
   * Compute tangent vector perpendicular to normal
   */
  computeTangent(normal) {
    if (!normal) return { x: 1, y: 0, z: 0 };

    // Choose a vector not parallel to normal
    const up = Math.abs(normal.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };

    // Cross product: tangent = up × normal
    return {
      x: up.y * normal.z - up.z * normal.y,
      y: up.z * normal.x - up.x * normal.z,
      z: up.x * normal.y - up.y * normal.x
    };
  },
  computeTangent2(normal) {
    const t1 = this.computeTangent(normal);
    // tangent2 = normal × tangent1
    return {
      x: normal.y * t1.z - normal.z * t1.y,
      y: normal.z * t1.x - normal.x * t1.z,
      z: normal.x * t1.y - normal.y * t1.x
    };
  },
  // CONSTRAINT CREATION

  /**
   * Create contact constraint from contact info
   */
  createContactConstraint(contactInfo) {
    return {
      type: 'contact',
      id: contactInfo.id,
      bodyA: contactInfo.bodyA,
      bodyB: contactInfo.bodyB,
      point: contactInfo.contactPoint,
      normal: contactInfo.contactNormal,
      penetration: contactInfo.penetrationDepth,

      // Constraint parameters
      stiffness: this.config.contactStiffness,
      damping: this.config.contactDamping,

      // Friction
      frictionStatic: this.config.frictionStatic,
      frictionDynamic: this.config.frictionDynamic,
      tangent1: contactInfo.tangent1,
      tangent2: contactInfo.tangent2,

      // Impulse accumulators (for warm starting)
      normalImpulse: 0,
      tangentImpulse1: 0,
      tangentImpulse2: 0,

      // State
      active: true
    };
  },
  /**
   * Create joint constraint (for axis limits)
   */
  createJointConstraint(joint, currentValue, limits) {
    const [min, max] = limits;

    let type = null;
    let error = 0;

    if (currentValue < min) {
      type = 'lower_limit';
      error = min - currentValue;
    } else if (currentValue > max) {
      type = 'upper_limit';
      error = currentValue - max;
    }
    if (!type) return null;

    return {
      type: 'joint_limit',
      id: `joint_${joint.name}_${type}`,
      joint: joint,
      limitType: type,
      error: error,
      stiffness: 1000000,  // Very stiff for hard limits
      damping: 10000,
      active: true
    };
  },
  // CONSTRAINT SOLVING

  /**
   * Solve all active constraints
   */
  solveConstraints(constraints, dt) {
    if (!constraints || constraints.length === 0) return [];

    const impulses = [];

    // Warm starting - use previous solution
    if (this.config.warmStarting && this.previousSolution) {
      this.applyWarmStart(constraints);
    }
    // Iterative solver
    for (let iter = 0; iter < this.config.solverIterations; iter++) {
      for (const constraint of constraints) {
        if (!constraint.active) continue;

        let impulse;

        if (constraint.type === 'contact') {
          impulse = this.solveContactConstraint(constraint, dt);
        } else if (constraint.type === 'joint_limit') {
          impulse = this.solveJointConstraint(constraint, dt);
        }
        if (impulse) {
          impulses.push(impulse);
        }
      }
    }
    // Store solution for warm starting
    this.previousSolution = constraints.map(c => ({
      id: c.id,
      normalImpulse: c.normalImpulse,
      tangentImpulse1: c.tangentImpulse1,
      tangentImpulse2: c.tangentImpulse2
    }));

    return impulses;
  },
  /**
   * Solve single contact constraint
   */
  solveContactConstraint(constraint, dt) {
    const { penetration, stiffness, damping, normal } = constraint;

    // Compute correction impulse using penalty method
    // F = k * penetration + c * velocity

    // Position correction (Baumgarte stabilization)
    const positionCorrection = this.config.baumgarteStabilization * penetration / dt;

    // Normal impulse
    const normalImpulse = stiffness * penetration * dt + damping * positionCorrection * dt;

    // Clamp to non-negative (can only push, not pull)
    const clampedImpulse = Math.max(0, normalImpulse);

    // Accumulate
    constraint.normalImpulse += clampedImpulse;

    // Friction impulses (simplified Coulomb friction)
    const maxFriction = constraint.frictionStatic * constraint.normalImpulse;
    constraint.tangentImpulse1 = Math.max(-maxFriction, Math.min(maxFriction, constraint.tangentImpulse1));
    constraint.tangentImpulse2 = Math.max(-maxFriction, Math.min(maxFriction, constraint.tangentImpulse2));

    return {
      constraintId: constraint.id,
      type: 'contact',
      impulse: {
        x: normal.x * clampedImpulse,
        y: normal.y * clampedImpulse,
        z: normal.z * clampedImpulse
      },
      point: constraint.point,
      magnitude: clampedImpulse
    };
  },
  /**
   * Solve joint limit constraint
   */
  solveJointConstraint(constraint, dt) {
    const { error, stiffness, damping } = constraint;

    // Spring-damper response
    const impulse = stiffness * error * dt;

    return {
      constraintId: constraint.id,
      type: 'joint_limit',
      joint: constraint.joint.name,
      correction: error * this.config.baumgarteStabilization,
      impulse: impulse
    };
  },
  /**
   * Apply warm start from previous solution
   */
  applyWarmStart(constraints) {
    if (!this.previousSolution) return;

    for (const constraint of constraints) {
      const prev = this.previousSolution.find(p => p.id === constraint.id);
      if (prev) {
        constraint.normalImpulse = prev.normalImpulse * 0.9;  // Decay factor
        constraint.tangentImpulse1 = prev.tangentImpulse1 * 0.9;
        constraint.tangentImpulse2 = prev.tangentImpulse2 * 0.9;
      }
    }
  },
  // POSITION CORRECTION

  /**
   * Compute position corrections to resolve penetrations
   */
  computePositionCorrections(constraints) {
    const corrections = [];

    for (const constraint of constraints) {
      if (!constraint.active) continue;

      if (constraint.type === 'contact' && constraint.penetration > this.config.penetrationTolerance) {
        // Push bodies apart along contact normal
        const correction = {
          bodyA: constraint.bodyA,
          bodyB: constraint.bodyB,
          correction: {
            x: constraint.normal.x * constraint.penetration * 0.5,
            y: constraint.normal.y * constraint.penetration * 0.5,
            z: constraint.normal.z * constraint.penetration * 0.5
          }
        };
        corrections.push(correction);
      }
      if (constraint.type === 'joint_limit') {
        corrections.push({
          joint: constraint.joint.name,
          correction: constraint.error * this.config.baumgarteStabilization
        });
      }
    }
    return corrections;
  },
  // COLLISION RESPONSE

  /**
   * Apply collision response (for dynamic simulation)
   */
  applyCollisionResponse(contact, bodyAVelocity, bodyBVelocity) {
    const { normal, restitution = this.config.restitution } = contact;

    // Relative velocity at contact point
    const relVel = {
      x: bodyAVelocity.x - bodyBVelocity.x,
      y: bodyAVelocity.y - bodyBVelocity.y,
      z: bodyAVelocity.z - bodyBVelocity.z
    };
    // Normal component of relative velocity
    const normalVel = relVel.x * normal.x + relVel.y * normal.y + relVel.z * normal.z;

    // Only separate if approaching
    if (normalVel >= 0) return null;

    // Impulse magnitude (simplified - assumes equal masses)
    const j = -(1 + restitution) * normalVel;

    return {
      impulse: {
        x: j * normal.x,
        y: j * normal.y,
        z: j * normal.z
      }
    };
  },
  // INTEGRATION WITH OTHER SYSTEMS

  integrateWithCollisionSystem() {
    if (typeof COLLISION_SYSTEM === 'undefined') return;

    // Add constraint processing to collision results
    COLLISION_SYSTEM.processWithConstraints = (model) => {
      const collisionResults = COLLISION_SYSTEM.checkCollisionsBVH?.(model) ||
                              COLLISION_SYSTEM.checkAllCollisions?.(model);

      if (!collisionResults) return null;

      const constraintResults = this.processCollisions(collisionResults);

      return {
        ...collisionResults,
        contacts: constraintResults.contacts,
        constraints: constraintResults.constraints
      };
    };
    console.log('[CONTACT_CONSTRAINT_ENGINE] Integrated with COLLISION_SYSTEM');
  },
  integrateWithSimulation() {
    // Integrate with ULTIMATE_3D_MACHINE_SYSTEM
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') {
      ULTIMATE_3D_MACHINE_SYSTEM.contactConstraints = this;

      // Add constraint checking to animation
      const originalMoveAxis = ULTIMATE_3D_MACHINE_SYSTEM.animation.moveAxis;
      if (originalMoveAxis) {
        ULTIMATE_3D_MACHINE_SYSTEM.animation.moveAxis = async function(axis, target, duration) {
          // Check joint limits before moving
          const config = this.config?.axes?.[axis];
          if (config?.limits) {
            const constraint = PRISM_CONTACT_CONSTRAINT_ENGINE.createJointConstraint(
              { name: axis }, target, config.limits
            );

            if (constraint) {
              // Clamp target to limits
              target = Math.max(config.limits[0], Math.min(config.limits[1], target));
              console.log('[ContactConstraint] Clamped', axis, 'to', target);
            }
          }
          return originalMoveAxis.call(this, axis, target, duration);
        };
      }
      console.log('[CONTACT_CONSTRAINT_ENGINE] Integrated with ULTIMATE_3D_MACHINE_SYSTEM');
    }
    // Integrate with PRISM_KINEMATIC_SOLVER
    if (typeof PRISM_KINEMATIC_SOLVER !== 'undefined') {
      PRISM_KINEMATIC_SOLVER.checkConstraints = (modelType, joints) => {
        const model = PRISM_KINEMATIC_SOLVER.getModel(modelType);
        if (!model?.joints) return { valid: true, constraints: [] };

        const constraints = [];

        for (const joint of model.joints) {
          const value = joints[joint.name];
          if (value !== undefined && joint.limits) {
            const constraint = this.createJointConstraint(joint, value, joint.limits);
            if (constraint) {
              constraints.push(constraint);
            }
          }
        }
        return {
          valid: constraints.length === 0,
          constraints
        };
      };
      console.log('[CONTACT_CONSTRAINT_ENGINE] Integrated with PRISM_KINEMATIC_SOLVER');
    }
  },
  // API

  getActiveConstraints() {
    return this.activeConstraints;
  },
  getContactManifold() {
    return this.contactManifold;
  },
  clearConstraints() {
    this.activeConstraints = [];
    this.contactManifold = [];
    this.previousSolution = null;
  },
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
};
// Initialize
window.PRISM_CONTACT_CONSTRAINT_ENGINE = PRISM_CONTACT_CONSTRAINT_ENGINE;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PRISM_CONTACT_CONSTRAINT_ENGINE.init());
} else {
  setTimeout(() => PRISM_CONTACT_CONSTRAINT_ENGINE.init(), 170);
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] CONTACT_CONSTRAINT_ENGINE loaded');

// PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE v1.0.0
// Purpose: Learn contact behavior patterns from simulation
// Tracks: Contact frequency, common collision areas, optimal clearances,
//         fixture interference patterns, tool-holder collision zones

const PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE = {
  version: '1.0.0',

  // LEARNED DATA STRUCTURES

  learnedData: {
    // Per-machine collision zones
    collisionZones: {},

    // Contact frequency maps (heat maps)
    contactHeatMaps: {},

    // Safe clearance distances
    safeClearances: {},

    // Common collision patterns
    collisionPatterns: [],

    // Tool-holder interference database
    toolHolderInterference: {},

    // Fixture collision zones
    fixtureCollisionZones: {}
  },
  // Observation buffer
  contactObservations: [],
  maxObservations: 5000,

  // INITIALIZATION

  init() {
    console.log('[CONTACT_LEARNING] Initializing...');

    // Load saved data
    this.loadLearnedData();

    // Listen for contact events
    window.addEventListener('contactDetected', (e) => {
      this.recordContact(e.detail);
    });

    // Listen for collision events
    window.addEventListener('collisionDetected', (e) => {
      this.recordCollision(e.detail);
    });

    // Integrate with constraint engine
    this.integrateWithConstraintEngine();

    // Integrate with collision system
    this.integrateWithCollisionSystem();

    console.log('[CONTACT_LEARNING] Ready with',
                this.contactObservations.length, 'observations');

    return this;
  },
  // RECORD OBSERVATIONS

  recordContact(detail) {
    const observation = {
      timestamp: Date.now(),
      machineId: detail.machineId,
      contactPoint: detail.contactPoint,
      contactNormal: detail.contactNormal,
      penetrationDepth: detail.penetrationDepth,
      bodyA: detail.bodyA,
      bodyB: detail.bodyB,
      axisPositions: detail.axisPositions,
      toolId: detail.toolId,
      holderId: detail.holderId,
      operationType: detail.operationType
    };
    this.contactObservations.push(observation);

    if (this.contactObservations.length > this.maxObservations) {
      this.contactObservations.shift();
    }
    // Learn from accumulated data
    this.learnFromContacts(detail.machineId);
  },
  recordCollision(detail) {
    // Record as pattern
    const pattern = {
      timestamp: Date.now(),
      machineId: detail.machineId,
      componentA: detail.componentA,
      componentB: detail.componentB,
      severity: detail.severity || 'warning',
      axisPositions: detail.axisPositions,
      toolInfo: detail.toolInfo,
      operationContext: detail.operationContext
    };
    this.learnedData.collisionPatterns.push(pattern);

    // Keep patterns manageable
    if (this.learnedData.collisionPatterns.length > 1000) {
      this.learnedData.collisionPatterns.shift();
    }
    // Update collision zones
    this.updateCollisionZones(detail);

    // Save periodically
    if (this.learnedData.collisionPatterns.length % 50 === 0) {
      this.saveLearnedData();
    }
  },
  // LEARNING ALGORITHMS

  learnFromContacts(machineId) {
    const machineContacts = this.contactObservations.filter(o =>
      o.machineId === machineId
    );

    if (machineContacts.length < 20) return;

    // Build contact heat map
    this.buildContactHeatMap(machineId, machineContacts);

    // Learn safe clearances
    this.learnSafeClearances(machineId, machineContacts);

    // Identify tool-holder interference zones
    this.learnToolHolderInterference(machineId, machineContacts);
  },
  buildContactHeatMap(machineId, contacts) {
    // Discretize workspace into grid
    const gridSize = 50; // mm
    const heatMap = {};

    for (const contact of contacts) {
      const pt = contact.contactPoint;
      if (!pt) continue;

      const key = `${Math.floor(pt.x / gridSize)}_${Math.floor(pt.y / gridSize)}_${Math.floor(pt.z / gridSize)}`;

      heatMap[key] = (heatMap[key] || 0) + 1;
    }
    this.learnedData.contactHeatMaps[machineId] = {
      gridSize,
      data: heatMap,
      maxCount: Math.max(...Object.values(heatMap)),
      lastUpdated: Date.now()
    };
  },
  learnSafeClearances(machineId, contacts) {
    // Group contacts by body pairs
    const pairClearances = {};

    for (const contact of contacts) {
      const pairKey = [contact.bodyA, contact.bodyB].sort().join('_');

      if (!pairClearances[pairKey]) {
        pairClearances[pairKey] = [];
      }
      // Record the penetration depth as "unsafe" clearance
      pairClearances[pairKey].push(contact.penetrationDepth || 0);
    }
    // Calculate safe clearance as max penetration + margin
    const safeClearances = {};

    for (const [pair, depths] of Object.entries(pairClearances)) {
      const maxPenetration = Math.max(...depths);
      safeClearances[pair] = {
        minimum: maxPenetration + 5,  // 5mm safety margin
        recommended: maxPenetration + 10,
        observationCount: depths.length
      };
    }
    this.learnedData.safeClearances[machineId] = safeClearances;
  },
  learnToolHolderInterference(machineId, contacts) {
    // Filter contacts involving tools or holders
    const toolContacts = contacts.filter(c =>
      c.toolId || c.holderId ||
      c.bodyA?.includes('tool') || c.bodyA?.includes('holder') ||
      c.bodyB?.includes('tool') || c.bodyB?.includes('holder')
    );

    if (toolContacts.length < 10) return;

    // Group by tool/holder combination
    const interferenceData = {};

    for (const contact of toolContacts) {
      const key = `${contact.toolId || 'unknown'}_${contact.holderId || 'unknown'}`;

      if (!interferenceData[key]) {
        interferenceData[key] = {
          contacts: [],
          axisRanges: { X: [], Y: [], Z: [], A: [], B: [], C: [] }
        };
      }
      interferenceData[key].contacts.push(contact.contactPoint);

      // Track axis positions at interference
      if (contact.axisPositions) {
        for (const [axis, pos] of Object.entries(contact.axisPositions)) {
          if (interferenceData[key].axisRanges[axis]) {
            interferenceData[key].axisRanges[axis].push(pos);
          }
        }
      }
    }
    // Calculate interference zones
    for (const [key, data] of Object.entries(interferenceData)) {
      data.interferenceZone = {};

      for (const [axis, positions] of Object.entries(data.axisRanges)) {
        if (positions.length > 0) {
          data.interferenceZone[axis] = {
            min: Math.min(...positions),
            max: Math.max(...positions)
          };
        }
      }
    }
    this.learnedData.toolHolderInterference[machineId] = interferenceData;
  },
  updateCollisionZones(detail) {
    const machineId = detail.machineId;

    if (!this.learnedData.collisionZones[machineId]) {
      this.learnedData.collisionZones[machineId] = [];
    }
    // Add new zone or update existing
    const newZone = {
      componentA: detail.componentA,
      componentB: detail.componentB,
      axisPositions: detail.axisPositions,
      boundingBox: detail.boundingBox,
      occurrenceCount: 1,
      lastOccurrence: Date.now()
    };
    // Check for similar existing zone
    const existingIdx = this.learnedData.collisionZones[machineId].findIndex(z =>
      z.componentA === newZone.componentA && z.componentB === newZone.componentB
    );

    if (existingIdx >= 0) {
      const existing = this.learnedData.collisionZones[machineId][existingIdx];
      existing.occurrenceCount++;
      existing.lastOccurrence = Date.now();

      // Expand bounding box
      if (detail.axisPositions) {
        for (const [axis, pos] of Object.entries(detail.axisPositions)) {
          if (!existing.axisRange) existing.axisRange = {};
          if (!existing.axisRange[axis]) {
            existing.axisRange[axis] = { min: pos, max: pos };
          } else {
            existing.axisRange[axis].min = Math.min(existing.axisRange[axis].min, pos);
            existing.axisRange[axis].max = Math.max(existing.axisRange[axis].max, pos);
          }
        }
      }
    } else {
      this.learnedData.collisionZones[machineId].push(newZone);
    }
  },
  // PREDICTION AND RECOMMENDATIONS

  /**
   * Predict if a position is likely to cause collision
   */
  predictCollision(machineId, axisPositions, toolId, holderId) {
    // Check learned collision zones
    const zones = this.learnedData.collisionZones[machineId] || [];

    for (const zone of zones) {
      if (!zone.axisRange) continue;

      let inZone = true;
      for (const [axis, pos] of Object.entries(axisPositions)) {
        const range = zone.axisRange[axis];
        if (range && (pos < range.min || pos > range.max)) {
          inZone = false;
          break;
        }
      }
      if (inZone && zone.occurrenceCount > 3) {
        return {
          likely: true,
          confidence: Math.min(0.95, zone.occurrenceCount / 20),
          zone: zone,
          reason: `${zone.componentA} - ${zone.componentB} collision zone`
        };
      }
    }
    // Check tool-holder interference
    if (toolId || holderId) {
      const interference = this.learnedData.toolHolderInterference[machineId];
      if (interference) {
        const key = `${toolId || 'unknown'}_${holderId || 'unknown'}`;
        const data = interference[key];

        if (data?.interferenceZone) {
          let inZone = true;
          for (const [axis, pos] of Object.entries(axisPositions)) {
            const range = data.interferenceZone[axis];
            if (range && (pos < range.min || pos > range.max)) {
              inZone = false;
              break;
            }
          }
          if (inZone) {
            return {
              likely: true,
              confidence: 0.8,
              reason: 'Tool-holder interference zone'
            };
          }
        }
      }
    }
    return { likely: false, confidence: 0.9 };
  },
  /**
   * Get recommended clearance for body pair
   */
  getRecommendedClearance(machineId, bodyA, bodyB) {
    const pairKey = [bodyA, bodyB].sort().join('_');
    const clearances = this.learnedData.safeClearances[machineId];

    if (clearances?.[pairKey]) {
      return clearances[pairKey];
    }
    // Return default
    return { minimum: 5, recommended: 10, observationCount: 0 };
  },
  /**
   * Get collision danger zones for visualization
   */
  getCollisionDangerZones(machineId) {
    return this.learnedData.collisionZones[machineId] || [];
  },
  /**
   * Get contact heat map for visualization
   */
  getContactHeatMap(machineId) {
    return this.learnedData.contactHeatMaps[machineId] || null;
  },
  // INTEGRATION

  integrateWithConstraintEngine() {
    if (typeof PRISM_CONTACT_CONSTRAINT_ENGINE === 'undefined') return;

    // Add prediction to constraint engine
    PRISM_CONTACT_CONSTRAINT_ENGINE.predictCollision = (machineId, positions, toolId, holderId) => {
      return this.predictCollision(machineId, positions, toolId, holderId);
    };
    PRISM_CONTACT_CONSTRAINT_ENGINE.getRecommendedClearance = (machineId, bodyA, bodyB) => {
      return this.getRecommendedClearance(machineId, bodyA, bodyB);
    };
    // Hook into constraint processing to learn
    const originalProcess = PRISM_CONTACT_CONSTRAINT_ENGINE.processCollisions.bind(PRISM_CONTACT_CONSTRAINT_ENGINE);

    PRISM_CONTACT_CONSTRAINT_ENGINE.processCollisions = (results, context = {}) => {
      const processed = originalProcess(results);

      // Learn from each contact
      for (const contact of processed.contacts || []) {
        this.recordContact({
          ...contact,
          ...context,
          penetrationDepth: contact.penetrationDepth
        });
      }
      return processed;
    };
    console.log('[CONTACT_LEARNING] Integrated with CONTACT_CONSTRAINT_ENGINE');
  },
  integrateWithCollisionSystem() {
    if (typeof COLLISION_SYSTEM === 'undefined') return;

    // Hook into collision monitor
    if (COLLISION_SYSTEM.Monitor) {
      COLLISION_SYSTEM.Monitor.onCollision((results) => {
        for (const collision of results.collisions || []) {
          window.dispatchEvent(new CustomEvent('collisionDetected', {
            detail: collision
          }));
        }
      });
    }
    // Add danger zone visualization
    COLLISION_SYSTEM.visualizeDangerZones = (machineId, scene) => {
      const zones = this.getCollisionDangerZones(machineId);
      const group = new THREE.Group();
      group.name = 'danger_zones';

      for (const zone of zones) {
        if (!zone.axisRange) continue;

        // Create danger zone indicator
        const geometry = new THREE.BoxGeometry(
          (zone.axisRange.X?.max - zone.axisRange.X?.min) || 50,
          (zone.axisRange.Y?.max - zone.axisRange.Y?.min) || 50,
          (zone.axisRange.Z?.max - zone.axisRange.Z?.min) || 50
        );

        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.15 + (zone.occurrenceCount / 50) * 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          ((zone.axisRange.X?.max || 0) + (zone.axisRange.X?.min || 0)) / 2,
          ((zone.axisRange.Y?.max || 0) + (zone.axisRange.Y?.min || 0)) / 2,
          ((zone.axisRange.Z?.max || 0) + (zone.axisRange.Z?.min || 0)) / 2
        );

        mesh.userData = { zone, type: 'danger_zone' };
        group.add(mesh);
      }
      if (scene) scene.add(group);
      return group;
    };
    console.log('[CONTACT_LEARNING] Integrated with COLLISION_SYSTEM');
  },
  // PERSISTENCE

  loadLearnedData() {
    try {
      const stored = localStorage.getItem('prism_contact_learning');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.learnedData = { ...this.learnedData, ...parsed };

        const obsStored = localStorage.getItem('prism_contact_observations');
        if (obsStored) {
          this.contactObservations = JSON.parse(obsStored);
        }
      }
    } catch (e) {
      console.warn('[CONTACT_LEARNING] Failed to load:', e);
    }
  },
  saveLearnedData() {
    try {
      localStorage.setItem('prism_contact_learning', JSON.stringify(this.learnedData));

      // Save only recent observations
      const recentObs = this.contactObservations.slice(-1000);
      localStorage.setItem('prism_contact_observations', JSON.stringify(recentObs));
    } catch (e) {
      console.warn('[CONTACT_LEARNING] Failed to save:', e);
    }
  },
  // API

  getLearnedData() {
    return this.learnedData;
  },
  exportData() {
    return JSON.stringify({
      learnedData: this.learnedData,
      observations: this.contactObservations.slice(-500)
    }, null, 2);
  },
  importData(json) {
    try {
      const data = JSON.parse(json);
      if (data.learnedData) {
        this.learnedData = { ...this.learnedData, ...data.learnedData };
      }
      if (data.observations) {
        this.contactObservations.push(...data.observations);
      }
      this.saveLearnedData();
      return true;
    } catch (e) {
      return false;
    }
  },
  clearData() {
    this.learnedData = {
      collisionZones: {},
      contactHeatMaps: {},
      safeClearances: {},
      collisionPatterns: [],
      toolHolderInterference: {},
      fixtureCollisionZones: {}
    };
    this.contactObservations = [];
    this.saveLearnedData();
  }
};
// Initialize
window.PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE = PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE.init());
} else {
  setTimeout(() => PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE.init(), 180);
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] CONTACT_CONSTRAINT_LEARNING_ENGINE loaded');

// PRISM_SIMULATION_INTEGRATION_BRIDGE v1.0.0
// Purpose: Tie together all kinematic, axis behavior, and constraint systems
// Creates unified simulation pipeline

const PRISM_SIMULATION_INTEGRATION_BRIDGE = {
  version: '1.0.0',

  // System references
  systems: {
    kinematics: null,
    axisBehavior: null,
    contactConstraints: null,
    contactLearning: null,
    learnedKinematics: null,
    animation: null,
    collision: null
  },
  // Simulation state
  state: {
    running: false,
    machineId: null,
    currentStep: 0,
    totalSteps: 0,
    contacts: [],
    constraints: []
  },
  // INITIALIZATION

  init() {
    console.log('[SIMULATION_BRIDGE] Initializing integration bridge...');

    // Connect all systems
    this.connectSystems();

    // Create unified API
    this.createUnifiedAPI();

    // Listen for simulation events
    this.setupEventListeners();

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[SIMULATION_BRIDGE] Integration complete');
    return this;
  },
  connectSystems() {
    // Connect to all relevant systems
    this.systems.kinematics = window.PRISM_KINEMATIC_SOLVER;
    this.systems.axisBehavior = window.PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE;
    this.systems.contactConstraints = window.PRISM_CONTACT_CONSTRAINT_ENGINE;
    this.systems.contactLearning = window.PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE;
    this.systems.learnedKinematics = window.PRISM_LEARNED_KINEMATICS_BRIDGE;
    this.systems.animation = window.ULTIMATE_3D_MACHINE_SYSTEM?.animation;
    this.systems.collision = window.COLLISION_SYSTEM;

    // Log connection status
    const connected = Object.entries(this.systems)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k]) => k);

    console.log('[SIMULATION_BRIDGE] Connected systems:', connected.join(', '));
  },
  createUnifiedAPI() {
    // Create window-level unified simulation API
    window.PRISM_SIMULATION = {
      // Initialize simulation for machine
      initForMachine: (machineId, manufacturer, machineType) => {
        return this.initializeSimulation(machineId, manufacturer, machineType);
      },
      // Execute G-code move with full physics
      executeMove: async (move, options = {}) => {
        return this.executeSimulatedMove(move, options);
      },
      // Check position for collisions
      checkPosition: (axisPositions) => {
        return this.checkPositionSafety(axisPositions);
      },
      // Get predicted motion time
      predictMotionTime: (move) => {
        return this.predictMoveTime(move);
      },
      // Get learned data summary
      getLearnedSummary: () => {
        return this.getLearnedDataSummary();
      },
      // Start/stop continuous simulation
      startSimulation: () => this.startContinuousSimulation(),
      stopSimulation: () => this.stopContinuousSimulation(),

      // Get current state
      getState: () => ({ ...this.state })
    };
    console.log('[SIMULATION_BRIDGE] Created window.PRISM_SIMULATION API');
  },
  setupEventListeners() {
    // Listen for G-code backplot events
    window.addEventListener('gcodeMove', async (e) => {
      if (this.state.running) {
        await this.executeSimulatedMove(e.detail, { fromBackplot: true });
      }
    });

    // Listen for axis motion complete
    window.addEventListener('axisMotionComplete', (e) => {
      if (this.systems.axisBehavior) {
        this.systems.axisBehavior.recordObservation(e.detail);
      }
    });
  },
  // SIMULATION INITIALIZATION

  initializeSimulation(machineId, manufacturer, machineType) {
    console.log('[SIMULATION_BRIDGE] Initializing for:', machineId);

    this.state.machineId = machineId;

    // Get learned kinematics config
    let kinematicsConfig = null;
    if (this.systems.learnedKinematics) {
      kinematicsConfig = this.systems.learnedKinematics.getConfig(manufacturer, machineType);
    }
    // Get axis behaviors
    const axisBehaviors = {};
    if (this.systems.axisBehavior) {
      for (const axis of ['X', 'Y', 'Z', 'A', 'B', 'C']) {
        axisBehaviors[axis] = this.systems.axisBehavior.getBehavior(machineId, axis);
      }
    }
    // Get collision danger zones
    let dangerZones = [];
    if (this.systems.contactLearning) {
      dangerZones = this.systems.contactLearning.getCollisionDangerZones(machineId);
    }
    return {
      machineId,
      kinematicsConfig,
      axisBehaviors,
      dangerZones,
      ready: true
    };
  },
  // SIMULATED MOVE EXECUTION

  async executeSimulatedMove(move, options = {}) {
    const { machineId } = this.state;
    if (!machineId) {
      return { success: false, error: 'Simulation not initialized' };
    }
    const result = {
      success: true,
      originalMove: move,
      predictedTime: 0,
      actualTime: 0,
      collisions: [],
      constraints: [],
      warnings: []
    };
    // 1. Check for predicted collisions BEFORE moving
    if (this.systems.contactLearning) {
      const prediction = this.systems.contactLearning.predictCollision(
        machineId,
        { X: move.X, Y: move.Y, Z: move.Z, A: move.A, B: move.B, C: move.C },
        move.toolId,
        move.holderId
      );

      if (prediction.likely) {
        result.warnings.push({
          type: 'predicted_collision',
          confidence: prediction.confidence,
          reason: prediction.reason
        });
      }
    }
    // 2. Check joint limits
    if (this.systems.kinematics) {
      const modelType = this.getModelType(machineId);
      const limitCheck = this.systems.kinematics.checkConstraints?.(modelType, move);

      if (limitCheck && !limitCheck.valid) {
        result.constraints = limitCheck.constraints;
        result.warnings.push({
          type: 'joint_limit',
          constraints: limitCheck.constraints
        });
      }
    }
    // 3. Predict motion time
    result.predictedTime = this.predictMoveTime(move);

    // 4. Execute the move (if animation system available)
    if (this.systems.animation && !options.simulateOnly) {
      const startTime = performance.now();

      try {
        await this.systems.animation.executeGCodeMove(move);
        result.actualTime = (performance.now() - startTime) / 1000;

        // Record for learning
        this.recordMoveCompletion(move, result);

      } catch (e) {
        result.success = false;
        result.error = e.message;
      }
    }
    // 5. Check for actual collisions AFTER moving
    if (this.systems.collision?.Monitor?.lastResults) {
      const collisionResults = this.systems.collision.Monitor.lastResults;
      if (collisionResults.hasCollision) {
        result.collisions = collisionResults.collisions;
        result.success = false;
      }
    }
    // 6. Process contact constraints
    if (result.collisions.length > 0 && this.systems.contactConstraints) {
      const constraintResult = this.systems.contactConstraints.processCollisions({
        hasCollision: true,
        collisions: result.collisions
      });

      result.constraints.push(...constraintResult.constraints);
    }
    return result;
  },
  // SAFETY CHECKING

  checkPositionSafety(axisPositions) {
    const { machineId } = this.state;

    const result = {
      safe: true,
      warnings: [],
      dangerLevel: 0 // 0-1
    };
    // Check joint limits
    if (this.systems.kinematics) {
      const modelType = this.getModelType(machineId);
      const model = this.systems.kinematics.getModel(modelType);

      if (model?.joints) {
        for (const joint of model.joints) {
          const value = axisPositions[joint.name];
          if (value !== undefined && joint.limits) {
            if (value < joint.limits[0] || value > joint.limits[1]) {
              result.safe = false;
              result.warnings.push({
                type: 'joint_limit',
                axis: joint.name,
                value,
                limits: joint.limits
              });
              result.dangerLevel = Math.max(result.dangerLevel, 1.0);
            }
          }
        }
      }
    }
    // Check predicted collisions
    if (this.systems.contactLearning && machineId) {
      const prediction = this.systems.contactLearning.predictCollision(
        machineId, axisPositions
      );

      if (prediction.likely) {
        result.safe = false;
        result.warnings.push({
          type: 'predicted_collision',
          confidence: prediction.confidence,
          reason: prediction.reason
        });
        result.dangerLevel = Math.max(result.dangerLevel, prediction.confidence);
      }
    }
    return result;
  },
  // TIME PREDICTION

  predictMoveTime(move) {
    const { machineId } = this.state;
    let totalTime = 0;

    if (!this.systems.axisBehavior) {
      // Simple estimate
      const distance = Math.sqrt(
        Math.pow(move.X || 0, 2) +
        Math.pow(move.Y || 0, 2) +
        Math.pow(move.Z || 0, 2)
      );
      return distance / (move.F || 1000) * 60; // seconds
    }
    // Calculate per-axis times
    const axisTimes = [];

    for (const axis of ['X', 'Y', 'Z', 'A', 'B', 'C']) {
      if (move[axis] !== undefined) {
        const distance = Math.abs(move[axis]);
        const maxVel = move.F || 1000;
        const time = this.systems.axisBehavior.predictMotionTime(
          machineId, axis, distance, maxVel
        );
        axisTimes.push(time);
      }
    }
    // Total time is the longest axis time (parallel motion)
    totalTime = Math.max(...axisTimes, 0.001);

    return totalTime;
  },
  // LEARNING FEEDBACK

  recordMoveCompletion(move, result) {
    // Feed back to axis behavior learning
    if (this.systems.axisBehavior) {
      for (const axis of ['X', 'Y', 'Z', 'A', 'B', 'C']) {
        if (move[axis] !== undefined) {
          window.dispatchEvent(new CustomEvent('axisMotionComplete', {
            detail: {
              machineId: this.state.machineId,
              axis,
              startPos: 0, // Would need previous position
              endPos: move[axis],
              velocity: move.F || 1000,
              duration: result.actualTime,
              followingError: null
            }
          }));
        }
      }
    }
    // Feed back collision data
    if (result.collisions.length > 0 && this.systems.contactLearning) {
      for (const collision of result.collisions) {
        window.dispatchEvent(new CustomEvent('collisionDetected', {
          detail: {
            ...collision,
            machineId: this.state.machineId,
            axisPositions: { X: move.X, Y: move.Y, Z: move.Z, A: move.A, B: move.B, C: move.C }
          }
        }));
      }
    }
  },
  // CONTINUOUS SIMULATION

  startContinuousSimulation() {
    this.state.running = true;

    // Start collision monitor
    if (this.systems.collision?.Monitor) {
      // Would need machine model reference
    }
    console.log('[SIMULATION_BRIDGE] Continuous simulation started');
  },
  stopContinuousSimulation() {
    this.state.running = false;

    // Stop collision monitor
    if (this.systems.collision?.Monitor) {
      this.systems.collision.Monitor.stop();
    }
    console.log('[SIMULATION_BRIDGE] Continuous simulation stopped');
  },
  // UTILITIES

  getModelType(machineId) {
    // Determine kinematic model type from machine ID
    const id = (machineId || '').toLowerCase();

    if (id.includes('5ax') || id.includes('5-ax')) {
      if (id.includes('bc') || id.includes('head')) return 'vmc_5axis_bc';
      return 'vmc_5axis_ac';
    }
    if (id.includes('lathe') || id.includes('turn')) return 'lathe_xz';
    if (id.includes('mill') && id.includes('turn')) return 'mill_turn';

    return 'vmc_3axis';
  },
  getLearnedDataSummary() {
    const summary = {
      kinematics: {},
      axisBehaviors: {},
      contacts: {},
      collisionZones: 0
    };
    if (this.systems.learnedKinematics) {
      summary.kinematics = {
        configCount: this.systems.learnedKinematics.learnedConfigs.size
      };
    }
    if (this.systems.axisBehavior) {
      summary.axisBehaviors = {
        machineCount: Object.keys(this.systems.axisBehavior.learnedBehaviors).length,
        observationCount: this.systems.axisBehavior.observations.length
      };
    }
    if (this.systems.contactLearning) {
      summary.contacts = {
        observationCount: this.systems.contactLearning.contactObservations.length,
        patternCount: this.systems.contactLearning.learnedData.collisionPatterns.length
      };
      summary.collisionZones = Object.values(
        this.systems.contactLearning.learnedData.collisionZones
      ).reduce((sum, zones) => sum + zones.length, 0);
    }
    return summary;
  }
};
// Initialize after all other systems
window.PRISM_SIMULATION_INTEGRATION_BRIDGE = PRISM_SIMULATION_INTEGRATION_BRIDGE;
setTimeout(() => {
  PRISM_SIMULATION_INTEGRATION_BRIDGE.init();
}, 250);

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] SIMULATION_INTEGRATION_BRIDGE loaded');

// ULTIMATE_3D_MACHINE_SYSTEM - 100% ACCURATE MACHINE VISUALIZATION
// Complete system for:
// - Parametric 3D machine component generation
// - Accurate toolholder models (CAT40, BT40, HSK, etc.)
// - Real-time collision detection
// - Proper axis control and animation
// - Coordinate system transformations

const ULTIMATE_3D_MACHINE_SYSTEM = {
  version: '1.0.0',

  // PRIORITY MODEL LOADER - Check for uploaded models first

  /**
   * Get the best available 3D model for a machine
   * Priority: User Upload > Built-in CAD > Procedural Generation
   */
  async getBestModel(machineId, specs = {}) {
    console.log('[ULTIMATE_3D_MACHINE_SYSTEM] Getting best model for:', machineId);

    // Check if PRISM_MACHINE_3D_MODELS has a model
    if (typeof PRISM_MACHINE_3D_MODELS !== 'undefined') {
      const uploadedModel = PRISM_MACHINE_3D_MODELS.getMachineModel(machineId);

      if (uploadedModel) {
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[ULTIMATE_3D_MACHINE_SYSTEM] Found uploaded/built-in model:', uploadedModel.id);

        // If it has file data, try to load it
        if (uploadedModel.hasFullModel || uploadedModel.fileData) {
          try {
            const mesh = await this.loadCADModel(uploadedModel);
            if (mesh) {
              (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[ULTIMATE_3D_MACHINE_SYSTEM] Successfully loaded CAD model');
              return {
                type: 'cad',
                mesh,
                model: uploadedModel,
                components: uploadedModel.components || []
              };
            }
          } catch (e) {
            console.warn('[ULTIMATE_3D_MACHINE_SYSTEM] Failed to load CAD model, falling back:', e);
          }
        }
        // Use the metadata to enhance procedural generation
        if (uploadedModel.specs) {
          specs = { ...specs, ...uploadedModel.specs };
        }
        if (uploadedModel.colors) {
          specs.colors = uploadedModel.colors;
        }
      }
    }
    // Fall back to procedural generation
    console.log('[ULTIMATE_3D_MACHINE_SYSTEM] Using procedural generation');
    const mesh = this.generateMachine(specs);
    return { type: 'procedural', mesh, specs };
  },
  /**
   * Load a CAD model from file data
   */
  async loadCADModel(modelInfo) {
    if (!modelInfo.fileData && modelInfo.hasFullModel) {
      // Try to get from IndexedDB
      if (typeof PRISM_MACHINE_3D_MODELS !== 'undefined') {
        modelInfo.fileData = await PRISM_MACHINE_3D_MODELS.getFileFromIndexedDB(modelInfo.id);
      }
    }
    if (!modelInfo.fileData) {
      console.warn('No file data available for model:', modelInfo.id);
      return null;
    }
    const format = (modelInfo.fileFormat || '').toUpperCase();

    // Handle different formats
    switch (format) {
      case 'STL':
        return this.loadSTL(modelInfo.fileData);
      case 'OBJ':
        return this.loadOBJ(modelInfo.fileData);
      case 'GLTF':
      case 'GLB':
        return this.loadGLTF(modelInfo.fileData);
      case 'STEP':
      case 'STP':
        return this.loadSTEP(modelInfo);
      default:
        console.warn('Unsupported format:', format);
        return null;
    }
  },
  /**
   * Load STL model from base64 data
   */
  loadSTL(base64Data) {
    if (typeof THREE === 'undefined') return null;

    try {
      const binary = atob(base64Data);
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i);
      }
      // Simple STL parser for binary STL
      const dataView = new DataView(buffer);
      const numTriangles = dataView.getUint32(80, true);

      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const normals = [];

      let offset = 84;
      for (let i = 0; i < numTriangles; i++) {
        // Normal
        const nx = dataView.getFloat32(offset, true); offset += 4;
        const ny = dataView.getFloat32(offset, true); offset += 4;
        const nz = dataView.getFloat32(offset, true); offset += 4;

        // Vertices
        for (let j = 0; j < 3; j++) {
          const x = dataView.getFloat32(offset, true); offset += 4;
          const y = dataView.getFloat32(offset, true); offset += 4;
          const z = dataView.getFloat32(offset, true); offset += 4;
          vertices.push(x, y, z);
          normals.push(nx, ny, nz);
        }
        offset += 2; // attribute byte count
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

      const material = new THREE.MeshPhongMaterial({
        color: 0x888888,
        specular: 0x111111,
        shininess: 30
      });

      return new THREE.Mesh(geometry, material);
    } catch (e) {
      console.error('Error loading STL:', e);
      return null;
    }
  },
  /**
   * Load STEP model - creates simplified representation
   * Full STEP parsing requires opencascade.js which is large
   */
  loadSTEP(modelInfo) {
    if (typeof THREE === 'undefined') return null;

    console.log('[ULTIMATE_3D_MACHINE_SYSTEM] Creating STEP model representation for:', modelInfo.model);

    // For STEP files, we create an enhanced procedural model using the metadata
    const group = new THREE.Group();
    group.name = modelInfo.id;

    const specs = modelInfo.specs || {};
    const colors = modelInfo.colors || {
      frame: 0x2a4d3a,
      covers: 0x3d3d3d,
      table: 0x4a4a4a,
      spindle: 0x888888
    };
    // Create enhanced model using component structure
    if (modelInfo.components && modelInfo.components.length > 0) {
      modelInfo.components.forEach(comp => {
        const compMesh = this.createComponentMesh(comp, specs, colors);
        if (compMesh) {
          compMesh.name = comp.id;
          compMesh.userData = comp;
          group.add(compMesh);
        }
      });
    } else {
      // Create default machine
      const defaultMachine = this.generateMachine(specs);
      group.add(defaultMachine);
    }
    // Add indicator that this is from a CAD file
    group.userData.fromCAD = true;
    group.userData.modelInfo = modelInfo;

    return group;
  },
  /**
   * Create mesh for a specific component
   */
  createComponentMesh(component, specs, colors) {
    if (typeof THREE === 'undefined') return null;

    const mat = (color) => new THREE.MeshPhongMaterial({
      color,
      specular: 0x222222,
      shininess: 30
    });

    const group = new THREE.Group();

    switch (component.id) {
      case 'static':
        // Machine base/frame
        const baseWidth = (specs.travelX || 460) * 2 + 400;
        const baseDepth = (specs.travelY || 400) * 2 + 400;
        const baseHeight = 800;

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth),
          mat(colors.frame)
        );
        base.position.y = baseHeight / 2;
        group.add(base);

        // Column
        const columnWidth = 300;
        const columnDepth = 400;
        const columnHeight = (specs.travelZ || 400) + 800;

        const column = new THREE.Mesh(
          new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth),
          mat(colors.frame)
        );
        column.position.set(baseWidth/2 - columnWidth/2 - 50, baseHeight + columnHeight/2, 0);
        group.add(column);
        break;

      case 'x_axis_head':
        // X-axis carriage
        const xCarriage = new THREE.Mesh(
          new THREE.BoxGeometry(200, 300, 300),
          mat(colors.covers)
        );
        group.add(xCarriage);
        break;

      case 'z_axis_head':
        // Spindle head
        const spindleHead = new THREE.Mesh(
          new THREE.BoxGeometry(180, 400, 250),
          mat(colors.covers)
        );
        group.add(spindleHead);

        // Spindle nose
        const spindleNose = new THREE.Mesh(
          new THREE.CylinderGeometry(60, 80, 150, 32),
          mat(colors.spindle)
        );
        spindleNose.position.y = -275;
        group.add(spindleNose);
        break;

      case 'y_axis_table':
        // Y-axis saddle
        const ySaddle = new THREE.Mesh(
          new THREE.BoxGeometry(500, 100, 400),
          mat(colors.table)
        );
        group.add(ySaddle);
        break;

      case 'a_axis_table':
        // A-axis trunnion
        const trunnion = new THREE.Mesh(
          new THREE.BoxGeometry(300, 150, 250),
          mat(colors.table)
        );
        group.add(trunnion);
        break;

      case 'c_axis_table':
        // C-axis rotary table
        const tableSize = specs.tableSize || 400;
        const table = new THREE.Mesh(
          new THREE.CylinderGeometry(tableSize/2, tableSize/2, 80, 64),
          mat(0x505050)
        );
        group.add(table);

        // T-slots
        for (let i = 0; i < 4; i++) {
          const slot = new THREE.Mesh(
            new THREE.BoxGeometry(tableSize - 40, 15, 20),
            mat(0x333333)
          );
          slot.rotation.y = (i * Math.PI / 4);
          slot.position.y = 41;
          group.add(slot);
        }
        break;
    }
    return group;
  },
  // MACHINE 3D COMPONENT LIBRARY

  components: {
    /**
     * Create machine base with accurate proportions
     */
    createBase(specs, material) {
      const { travelX = 762, travelY = 406, travelZ = 508 } = specs;
      const mat = material || this._defaultMaterial('base');

      // Calculate proportional dimensions
      const width = travelX * 1.8 + 400;   // Base wider than X travel
      const depth = travelY * 1.5 + 500;   // Base deeper than Y travel
      const height = 250;                   // Standard base height

      const geometry = new THREE.BoxGeometry(width, height, depth);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.y = height / 2;
      mesh.name = 'machine_base';
      mesh.userData = { component: 'base', dimensions: { width, height, depth } };

      // Add mounting features
      const mountGroup = new THREE.Group();
      mountGroup.add(mesh);

      // Add leveling feet
      for (let x = -1; x <= 1; x += 2) {
        for (let z = -1; z <= 1; z += 2) {
          const foot = this._createLevelingFoot();
          foot.position.set(x * (width/2 - 80), 0, z * (depth/2 - 80));
          mountGroup.add(foot);
        }
      }
      return mountGroup;
    },
    /**
     * Create column/upright for VMC
     */
    createColumn(specs, material) {
      const { travelZ = 508, maxRPM = 8100 } = specs;
      const mat = material || this._defaultMaterial('column');

      const width = 400;
      const depth = 450;
      const height = travelZ * 2.2 + 600;

      // Main column body
      const columnGeo = new THREE.BoxGeometry(width, height, depth);
      const column = new THREE.Mesh(columnGeo, mat);
      column.position.y = height / 2;
      column.name = 'column';

      const group = new THREE.Group();
      group.add(column);

      // Add linear rail representations
      const railMat = this._defaultMaterial('rail');
      const railWidth = 35;
      const railDepth = 20;

      for (let x = -1; x <= 1; x += 2) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(railWidth, height - 100, railDepth),
          railMat
        );
        rail.position.set(x * (width/2 - 50), height/2, depth/2 + railDepth/2);
        rail.name = 'z_rail_' + (x > 0 ? 'right' : 'left');
        group.add(rail);
      }
      group.userData = { component: 'column', dimensions: { width, height, depth }, travelZ };
      return group;
    },
    /**
     * Create spindle head with accurate geometry
     */
    createSpindleHead(specs, material) {
      const {
        spindleTaper = 'CAT40',
        maxRPM = 8100,
        spindleNose = 'A2-6'
      } = specs;
      const mat = material || this._defaultMaterial('head');

      const group = new THREE.Group();
      group.name = 'spindle_head';

      // Main head housing
      const headWidth = 280;
      const headHeight = 350;
      const headDepth = 320;

      const headGeo = new THREE.BoxGeometry(headWidth, headHeight, headDepth);
      const head = new THREE.Mesh(headGeo, mat);
      head.name = 'head_housing';
      group.add(head);

      // Spindle motor housing (top)
      const motorDia = 200;
      const motorHeight = 250;
      const motorGeo = new THREE.CylinderGeometry(motorDia/2, motorDia/2, motorHeight, 32);
      const motor = new THREE.Mesh(motorGeo, mat);
      motor.position.y = headHeight/2 + motorHeight/2;
      motor.name = 'spindle_motor';
      group.add(motor);

      // Spindle nose
      const noseData = this._getSpindleNoseGeometry(spindleTaper);
      const nose = this._createSpindleNose(noseData);
      nose.position.y = -headHeight/2;
      group.add(nose);

      group.userData = {
        component: 'spindle_head',
        spindleTaper,
        maxRPM,
        dimensions: { width: headWidth, height: headHeight + motorHeight, depth: headDepth }
      };
      return group;
    },
    /**
     * Create spindle nose with accurate taper geometry
     */
    _createSpindleNose(noseData) {
      const group = new THREE.Group();
      group.name = 'spindle_nose';

      const mat = this._defaultMaterial('spindle');

      // Nose flange
      const flangeGeo = new THREE.CylinderGeometry(
        noseData.flangeRadius,
        noseData.flangeRadius,
        noseData.flangeHeight,
        32
      );
      const flange = new THREE.Mesh(flangeGeo, mat);
      group.add(flange);

      // Taper bore (represented as cylinder for visualization)
      const taperGeo = new THREE.CylinderGeometry(
        noseData.taperTopRadius,
        noseData.taperBottomRadius,
        noseData.taperDepth,
        32
      );
      const taper = new THREE.Mesh(taperGeo, this._defaultMaterial('taper'));
      taper.position.y = noseData.flangeHeight/2 + noseData.taperDepth/2;
      taper.name = 'spindle_taper';
      group.add(taper);

      // Gage line indicator
      const gageLine = new THREE.Mesh(
        new THREE.TorusGeometry(noseData.taperTopRadius * 0.8, 2, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      gageLine.rotation.x = Math.PI / 2;
      gageLine.position.y = noseData.flangeHeight/2;
      gageLine.name = 'gage_line';
      group.add(gageLine);

      return group;
    },
    /**
     * Get spindle nose geometry by taper type
     */
    _getSpindleNoseGeometry(taper) {
      const taperData = {
        'CAT40': {
          flangeRadius: 63.5,    // 5" flange diameter
          flangeHeight: 25,
          taperTopRadius: 31.75, // 2.5" bore
          taperBottomRadius: 22,
          taperDepth: 70,
          gageLength: 101.6      // 4" gage length
        },
        'CAT50': {
          flangeRadius: 82.55,
          flangeHeight: 32,
          taperTopRadius: 44.45,
          taperBottomRadius: 31,
          taperDepth: 95,
          gageLength: 127
        },
        'BT40': {
          flangeRadius: 63.5,
          flangeHeight: 25,
          taperTopRadius: 31.75,
          taperBottomRadius: 22,
          taperDepth: 70,
          gageLength: 101.6
        },
        'BT50': {
          flangeRadius: 82.55,
          flangeHeight: 32,
          taperTopRadius: 44.45,
          taperBottomRadius: 31,
          taperDepth: 95,
          gageLength: 127
        },
        'HSK-A63': {
          flangeRadius: 63,
          flangeHeight: 20,
          taperTopRadius: 31.5,
          taperBottomRadius: 25,
          taperDepth: 40,       // HSK is shorter
          gageLength: 50
        },
        'HSK-A100': {
          flangeRadius: 100,
          flangeHeight: 25,
          taperTopRadius: 50,
          taperBottomRadius: 40,
          taperDepth: 53,
          gageLength: 65
        }
      }