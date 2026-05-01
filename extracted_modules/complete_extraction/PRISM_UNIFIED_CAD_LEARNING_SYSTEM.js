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
    console.log('[UNIFIED_CAD_LEARNING] Added learned data:', category,