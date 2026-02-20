const PRISM_AI_TOOLPATH_DATABASE = {

    version: '1.0.0',

    // MILLING STRATEGIES - 3-Axis
    milling3Axis: {

        // ROUGHING STRATEGIES
        ADAPTIVE_CLEARING: {
            id: 'MILL_3AX_001',
            name: 'Adaptive Clearing / HSM',
            altNames: ['High Speed Machining', 'Volumill', 'Dynamic Milling', 'Profit Milling'],
            category: 'roughing',
            subcategory: '2.5D',
            description: 'Constant tool engagement roughing with smooth tool paths',
            whenToUse: ['Large material removal', 'Pocketing', 'Slotting', 'Hard materials'],
            whenNotToUse: ['Very thin walls', 'Finish operations', 'Thread milling'],
            parameters: {
                stepover: { default: 0.10, range: [0.05, 0.40], unit: 'ratio', description: 'Radial engagement as ratio of tool diameter' },
                stepdown: { default: 2.0, range: [0.5, 4.0], unit: 'xD', description: 'Axial depth as multiple of tool diameter' },
                optimalLoad: { default: 0.08, range: [0.03, 0.15], unit: 'ratio', description: 'Target constant radial engagement' },
                rampAngle: { default: 2, range: [1, 5], unit: 'deg', description: 'Helical ramp entry angle' },
                helixDiameter: { default: 0.9, range: [0.5, 0.95], unit: 'ratio', description: 'Helix diameter as ratio of tool' },
                minRadiusPercent: { default: 10, range: [5, 30], unit: '%', description: 'Minimum corner radius' }
            },
            speedModifier: 1.0,
            feedModifier: 1.0,
            materialModifiers: {}, // Will be populated from PRISM_AI_MATERIAL_MODIFIERS
            tips: ['Use full flute length for best MRR', 'Maintain chip thinning compensation', 'Monitor spindle load'],
            warnings: ['Avoid thin walls', 'Check for adequate coolant'],
            crossSoftwareNames: {
                mastercam: 'Dynamic Mill',
                fusion360: '2D Adaptive',
                hypermill: 'Optimized Roughing',
                catia: 'Adaptive Roughing',
                solidcam: 'iMachining',
                esprit: 'ProfitMilling',
                gibbs: 'VoluMill'
            }
        },
        LEVEL_Z_ROUGHING: {
            id: 'MILL_3AX_002',
            name: 'Level Z Roughing',
            altNames: ['Z-Level', 'Constant Z', 'Waterline Roughing'],
            category: 'roughing',
            subcategory: '3D',
            description: 'Layer-by-layer roughing at constant Z heights',
            whenToUse: ['3D surfaces', 'Complex geometry', 'Steep walls'],
            whenNotToUse: ['Flat bottoms', 'Shallow areas', 'Thin ribs'],
            parameters: {
                stepdown: { default: 1.0, range: [0.3, 2.0], unit: 'xD', description: 'Z step as ratio of tool diameter' },
                stepover: { default: 0.50, range: [0.30, 0.70], unit: 'ratio', description: 'XY stepover ratio' },
                stockToLeave: { default: 0.5, range: [0.1, 2.0], unit: 'mm', description: 'Stock remaining for finishing' },
                restMachining: { default: false, type: 'boolean', description: 'Enable rest machining mode' },
                spiralEntry: { default: true, type: 'boolean', description: 'Use spiral entry/exit' }
            },
            speedModifier: 0.9,
            feedModifier: 0.85,
            materialModifiers: {}
        },
        POCKET_ROUGHING: {
            id: 'MILL_3AX_003',
            name: 'Pocket Roughing',
            altNames: ['Pocket Mill', 'Area Clearance', 'Face Pocket'],
            category: 'roughing',
            subcategory: '2.5D',
            description: 'Traditional pocket clearing with various patterns',
            whenToUse: ['Closed pockets', 'Simple geometry', 'Standard clearance'],
            whenNotToUse: ['Complex 3D', 'Very deep pockets', 'Hard materials'],
            parameters: {
                pattern: { default: 'spiral', options: ['spiral', 'zigzag', 'oneway', 'morph'], description: 'Clearing pattern type' },
                stepover: { default: 0.60, range: [0.40, 0.75], unit: 'ratio' },
                stepdown: { default: 1.0, range: [0.5, 2.0], unit: 'xD' },
                climbCut: { default: true, type: 'boolean' },
                cornerSlowdown: { default: true, type: 'boolean' }
            },
            speedModifier: 0.95,
            feedModifier: 0.95,
            materialModifiers: {}
        },
        PLUNGE_ROUGH: {
            id: 'MILL_3AX_004',
            name: 'Plunge Roughing',
            altNames: ['Z-Rough', 'Axial Rough', 'Drill Mill'],
            category: 'roughing',
            subcategory: '2.5D',
            description: 'Axial cutting using tool like drill',
            whenToUse: ['Long overhang', 'Deep pockets', 'Weak machine rigidity'],
            whenNotToUse: ['Thin material', 'When radial cut is viable'],
            parameters: {
                plungeDepth: { default: 0.5, range: [0.2, 1.0], unit: 'xD' },
                lateralStep: { default: 0.50, range: [0.30, 0.70], unit: 'ratio' },
                retractHeight: { default: 2.0, range: [1.0, 5.0], unit: 'mm' }
            },
            speedModifier: 0.7,
            feedModifier: 0.6,
            materialModifiers: {}
        },
        HSM_ROUGHING: {
            id: 'MILL_3AX_005',
            name: 'High Speed Machining Rough',
            altNames: ['HSM Rough', 'High Efficiency Milling'],
            category: 'roughing',
            subcategory: '3D',
            description: 'High speed light cuts for efficient material removal',
            whenToUse: ['High speed machines', 'Aluminum', 'HSM cutters'],
            whenNotToUse: ['Low speed machines', 'Interrupted cuts'],
            parameters: {
                stepdown: { default: 3.0, range: [1.5, 5.0], unit: 'xD' },
                stepover: { default: 0.08, range: [0.05, 0.15], unit: 'ratio' },
                minRPM: { default: 10000, range: [8000, 30000], unit: 'rpm' },
                minFeed: { default: 5000, range: [3000, 15000], unit: 'mm/min' }
            },
            speedModifier: 1.5,
            feedModifier: 1.8,
            materialModifiers: {}
        },
        REST_ROUGHING: {
            id: 'MILL_3AX_006',
            name: 'Rest Material Roughing',
            altNames: ['Re-roughing', 'Secondary Roughing'],
            category: 'roughing',
            subcategory: '3D',
            description: 'Removes material left by larger tool',
            whenToUse: ['After initial roughing', 'Corner cleanup', 'Smaller tool follow-up'],
            parameters: {
                previousTool: { default: null, type: 'tool_reference', description: 'Reference previous tool' },
                stockOffset: { default: 0.1, range: [0.05, 0.5], unit: 'mm', description: 'Additional stock offset' },
                minArea: { default: 1.0, range: [0.5, 5.0], unit: 'mm²', description: 'Minimum rest area to machine' }
            },
            speedModifier: 0.9,
            feedModifier: 0.85,
            materialModifiers: {}
        },
        PRISM_OPTIMIZED_ROUGHING: {
            id: 'MILL_3AX_007',
            name: 'PRISM Optimized Roughing™',
            altNames: ['AI Adaptive', 'Intelligent Roughing'],
            category: 'roughing',
            subcategory: '3D',
            description: 'PRISM-exclusive AI-optimized roughing with real-time adaptation',
            isPRISMExclusive: true,
            aiFeatures: ['PSO path optimization', 'Bayesian parameter learning', 'FFT chatter detection'],
            whenToUse: ['Maximum efficiency', 'Learning optimization', 'Difficult materials'],
            parameters: {
                aiMode: { default: 'balanced', options: ['speed', 'quality', 'balanced', 'learning'] },
                adaptiveRate: { default: 0.1, range: [0.01, 0.3], unit: 'ratio' },
                confidenceThreshold: { default: 0.8, range: [0.5, 0.99], unit: 'ratio' }
            },
            speedModifier: 1.1,
            feedModifier: 1.1,
            materialModifiers: {}
        },
        // FINISHING STRATEGIES
        PARALLEL_FINISHING: {
            id: 'MILL_3AX_010',
            name: 'Parallel Finishing',
            altNames: ['Raster', 'Zigzag Finish', 'Linear'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Parallel passes across surface',
            whenToUse: ['Shallow slopes', 'Large flat areas', 'Simple surfaces'],
            parameters: {
                angle: { default: 45, range: [0, 90], unit: 'deg', description: 'Pass angle from X-axis' },
                stepover: { default: 0.15, range: [0.05, 0.30], unit: 'xD', description: 'Distance between passes' },
                cutDirection: { default: 'both', options: ['both', 'climb', 'conventional'] },
                linkingStyle: { default: 'smooth', options: ['smooth', 'direct', 'arc'] }
            },
            speedModifier: 1.0,
            feedModifier: 0.9,
            materialModifiers: {}
        },
        SCALLOP_FINISHING: {
            id: 'MILL_3AX_011',
            name: 'Scallop Finishing',
            altNames: ['Constant Scallop', 'Cusp Height Control'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Constant scallop height across varying slopes',
            whenToUse: ['Variable slope surfaces', 'Consistent finish required'],
            parameters: {
                scallop: { default: 0.005, range: [0.001, 0.02], unit: 'mm', description: 'Target scallop height' },
                minStepover: { default: 0.02, range: [0.01, 0.05], unit: 'xD' },
                maxStepover: { default: 0.25, range: [0.10, 0.40], unit: 'xD' }
            },
            speedModifier: 1.0,
            feedModifier: 0.85,
            materialModifiers: {}
        },
        WATERLINE_FINISHING: {
            id: 'MILL_3AX_012',
            name: 'Waterline Finishing',
            altNames: ['Constant Z Finish', 'Contour Finishing'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Contour passes at constant Z levels',
            whenToUse: ['Steep walls', 'Vertical surfaces', 'Mold cores'],
            parameters: {
                stepdown: { default: 0.2, range: [0.05, 0.5], unit: 'mm' },
                minAngle: { default: 45, range: [30, 75], unit: 'deg', description: 'Minimum surface angle to machine' },
                smoothing: { default: true, type: 'boolean' }
            },
            speedModifier: 0.95,
            feedModifier: 0.9,
            materialModifiers: {}
        },
        PENCIL_FINISHING: {
            id: 'MILL_3AX_013',
            name: 'Pencil Finishing',
            altNames: ['Corner Finish', 'Fillet Cleanup', 'Pencil Trace'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Follows internal corners and fillets',
            whenToUse: ['Internal corners', 'Fillet cleanup', 'Rest finishing'],
            parameters: {
                passes: { default: 2, range: [1, 5], unit: 'count' },
                offset: { default: 0.0, range: [-0.1, 0.1], unit: 'mm' },
                detectRadius: { default: true, type: 'boolean' }
            },
            speedModifier: 0.85,
            feedModifier: 0.75,
            materialModifiers: {}
        },
        FLOWLINE_FINISHING: {
            id: 'MILL_3AX_014',
            name: 'Flowline Finishing',
            altNames: ['Follow Surface', 'UV Machining'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Follows natural surface flow lines',
            whenToUse: ['Organic shapes', 'Blade surfaces', 'Aerodynamic parts'],
            parameters: {
                stepover: { default: 0.15, range: [0.05, 0.30], unit: 'xD' },
                flowDirection: { default: 'U', options: ['U', 'V', 'both'] },
                boundaryOffset: { default: 0.5, range: [0, 2.0], unit: 'mm' }
            },
            speedModifier: 0.95,
            feedModifier: 0.9,
            materialModifiers: {}
        },
        SPIRAL_FINISHING: {
            id: 'MILL_3AX_015',
            name: 'Spiral Finishing',
            altNames: ['Radial Finish', 'Circular Finish'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Spiral from center outward or inward',
            whenToUse: ['Circular features', 'Domes', 'Dish shapes'],
            parameters: {
                direction: { default: 'outward', options: ['outward', 'inward'] },
                stepover: { default: 0.15, range: [0.05, 0.25], unit: 'xD' },
                startRadius: { default: 0, range: [0, 100], unit: 'mm' }
            },
            speedModifier: 1.0,
            feedModifier: 0.9,
            materialModifiers: {}
        },
        STEEP_SHALLOW_FINISHING: {
            id: 'MILL_3AX_016',
            name: 'Steep and Shallow Finishing',
            altNames: ['Hybrid Finish', 'Combined Z/Parallel'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Combines waterline (steep) and parallel (shallow)',
            whenToUse: ['Complex 3D surfaces', 'Mold and die', 'Complete finishing'],
            parameters: {
                thresholdAngle: { default: 45, range: [30, 60], unit: 'deg' },
                shallowStepover: { default: 0.15, range: [0.05, 0.25], unit: 'xD' },
                steepStepdown: { default: 0.2, range: [0.05, 0.5], unit: 'mm' },
                blendDistance: { default: 1.0, range: [0.5, 3.0], unit: 'mm' }
            },
            speedModifier: 0.95,
            feedModifier: 0.85,
            materialModifiers: {}
        },
        GEODESIC_FINISHING: {
            id: 'MILL_3AX_017',
            name: 'Geodesic Finishing',
            altNames: ['Shortest Path Finish'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Follows shortest path on surface (geodesic curves)',
            whenToUse: ['Complex curved surfaces', 'Aerospace parts'],
            parameters: {
                stepover: { default: 0.12, range: [0.05, 0.20], unit: 'xD' },
                curvatureAdapt: { default: true, type: 'boolean' }
            },
            speedModifier: 0.9,
            feedModifier: 0.85,
            materialModifiers: {}
        },
        MORPHED_SPIRAL_FINISHING: {
            id: 'MILL_3AX_018',
            name: 'Morphed Spiral Finishing',
            altNames: ['Adaptive Spiral'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Spiral adapted to boundary shape',
            whenToUse: ['Irregular pockets', 'Non-circular domes'],
            parameters: {
                stepover: { default: 0.15, range: [0.05, 0.25], unit: 'xD' },
                morphFactor: { default: 0.5, range: [0.1, 1.0], unit: 'ratio' }
            },
            speedModifier: 0.95,
            feedModifier: 0.9,
            materialModifiers: {}
        },
        RADIAL_FINISHING: {
            id: 'MILL_3AX_019',
            name: 'Radial Finishing',
            altNames: ['Sunburst', 'Spoke Pattern'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Radial passes from center point',
            whenToUse: ['Circular features', 'Hub machining'],
            parameters: {
                angularStep: { default: 5, range: [1, 15], unit: 'deg' },
                centerPoint: { default: 'auto', type: 'point' }
            },
            speedModifier: 0.95,
            feedModifier: 0.9,
            materialModifiers: {}
        },
        ISOCURVE_FINISHING: {
            id: 'MILL_3AX_020',
            name: 'Isocurve Finishing',
            altNames: ['Iso-parametric', 'UV Lines'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Follows surface iso-parametric curves',
            whenToUse: ['NURBS surfaces', 'Blade profiles'],
            parameters: {
                direction: { default: 'U', options: ['U', 'V'] },
                stepover: { default: 0.12, range: [0.05, 0.20], unit: 'xD' }
            },
            speedModifier: 0.95,
            feedModifier: 0.9,
            materialModifiers: {}
        },
        CORNER_FINISHING: {
            id: 'MILL_3AX_021',
            name: 'Corner Finishing',
            altNames: ['Internal Corner', 'Radius Cleanup'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Dedicated corner and fillet cleanup',
            whenToUse: ['After main finishing', 'Tight corners', 'Rest material'],
            parameters: {
                maxRadius: { default: 10, range: [1, 50], unit: 'mm' },
                numberOfPasses: { default: 3, range: [1, 10], unit: 'count' }
            },
            speedModifier: 0.8,
            feedModifier: 0.7,
            materialModifiers: {}
        },
        REST_FINISHING: {
            id: 'MILL_3AX_022',
            name: 'Rest Material Finishing',
            altNames: ['Leftover Finish', 'Cleanup Finish'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Machines rest material from previous operations',
            whenToUse: ['After larger tool finishing', 'Final cleanup'],
            parameters: {
                previousTool: { default: null, type: 'tool_reference' },
                tolerance: { default: 0.01, range: [0.001, 0.1], unit: 'mm' }
            },
            speedModifier: 0.85,
            feedModifier: 0.8,
            materialModifiers: {}
        },
        BLEND_FINISHING: {
            id: 'MILL_3AX_023',
            name: 'Blend Finishing',
            altNames: ['Surface Blend', 'Curvature Blend'],
            category: 'finishing',
            subcategory: '3D',
            description: 'Blends between different surface regions',
            whenToUse: ['Transitional areas', 'Surface blending'],
            parameters: {
                blendType: { default: 'tangent', options: ['tangent', 'curvature', 'G2'] },
                stepover: { default: 0.1, range: [0.05, 0.2], unit: 'xD' }
            },
            speedModifier: 0.9,
            feedModifier: 0.85,
            materialModifiers: {}
        },
        // CONTOUR STRATEGIES
        CONTOUR_2D: {
            id: 'MILL_3AX_030',
            name: '2D Contour',
            altNames: ['Profile', 'Perimeter', '2D Profile'],
            category: 'contouring',
            subcategory: '2.5D',
            description: '2D profile machining at constant Z',
            whenToUse: ['Part perimeters', 'Wall finishing', 'Boss machining'],
            parameters: {
                compensation: { default: 'left', options: ['left', 'right', 'center'] },
                stockToLeave: { default: 0, range: [0, 1], unit: 'mm' },
                leadIn: { default: 'tangent', options: ['tangent', 'perpendicular', 'arc'] },
                leadOut: { default: 'tangent', options: ['tangent', 'perpendicular', 'arc'] },
                multipleDepths: { default: false, type: 'boolean' },
                stepdown: { default: 3.0, range: [0.5, 10], unit: 'mm' }
            },
            speedModifier: 1.0,
            feedModifier: 1.0,
            materialModifiers: {}
        },
        CHAMFER_CONTOUR: {
            id: 'MILL_3AX_031',
            name: 'Chamfer Contour',
            altNames: ['Edge Break', 'Chamfer Mill'],
            category: 'contouring',
            subcategory: '2.5D',
            description: 'Chamfer edges along contour',
            whenToUse: ['Edge breaking', 'Chamfered edges'],
            parameters: {
                chamferSize: { default: 0.5, range: [0.1, 5], unit: 'mm' },
                chamferAngle: { default: 45, range: [15, 60], unit: 'deg' }
            },
            speedModifier: 0.9,
            feedModifier: 0.85,
            materialModifiers: {}
        },
        // FACE MILLING
        FACE_MILLING: {
            id: 'MILL_3AX_040',
            name: 'Face Milling',
            altNames: ['Facing', 'Surface Mill', 'Top Face'],
            category: 'facing',
            subcategory: '2.5D',
            description: 'Machine flat top surfaces',
            whenToUse: ['Top faces', 'Flat surfaces', 'Stock cleanup'],
            parameters: {
                pattern: { default: 'zigzag', options: ['zigzag', 'oneway', 'spiral'] },
                stepover: { default: 0.70, range: [0.50, 0.85], unit: 'ratio' },
                stockToLeave: { default: 0, range: [0, 0.5], unit: 'mm' }
            },
            speedModifier: 1.0,
            feedModifier: 1.0,
            materialModifiers: {}
        }
    },
    // DRILLING STRATEGIES
    drilling: {

        DRILL_STANDARD: {
            id: 'DRILL_001',
            name: 'Standard Drilling',
            altNames: ['Drill', 'G81'],
            category: 'drilling',
            description: 'Single feed drilling cycle',
            whenToUse: ['Shallow holes < 3xD', 'Through holes in thin material'],
            parameters: {
                feedRate: { default: 0.15, range: [0.05, 0.4], unit: 'mm/rev' },
                retractHeight: { default: 2, range: [1, 10], unit: 'mm' },
                dwell: { default: 0, range: [0, 2], unit: 'sec' }
            },
            gCodeCycle: 'G81',
            materialModifiers: {}
        },
        DRILL_PECK: {
            id: 'DRILL_002',
            name: 'Peck Drilling',
            altNames: ['Deep Drill', 'G83'],
            category: 'drilling',
            description: 'Peck drilling with chip breaking',
            whenToUse: ['Deep holes 3-10xD', 'Chip evacuation needed'],
            parameters: {
                peckDepth: { default: 1.0, range: [0.3, 3.0], unit: 'xD' },
                retractAmount: { default: 0.5, range: [0.2, 2.0], unit: 'mm' },
                feedRate: { default: 0.12, range: [0.05, 0.3], unit: 'mm/rev' }
            },
            gCodeCycle: 'G83',
            materialModifiers: {}
        },
        DRILL_DEEP_PECK: {
            id: 'DRILL_003',
            name: 'Deep Peck Drilling',
            altNames: ['Full Retract Peck', 'G83 Full'],
            category: 'drilling',
            description: 'Full retract peck drilling for very deep holes',
            whenToUse: ['Very deep holes >10xD', 'Poor chip evacuation'],
            parameters: {
                peckDepth: { default: 0.5, range: [0.2, 1.5], unit: 'xD' },
                feedRate: { default: 0.08, range: [0.03, 0.2], unit: 'mm/rev' }
            },
            gCodeCycle: 'G83',
            materialModifiers: {}
        },
        DRILL_CHIP_BREAK: {
            id: 'DRILL_004',
            name: 'Chip Break Drilling',
            altNames: ['High Speed Peck', 'G73'],
            category: 'drilling',
            description: 'Quick retract for chip breaking without full retract',
            whenToUse: ['Medium depth holes 3-6xD', 'Materials that produce long chips'],
            parameters: {
                peckDepth: { default: 1.5, range: [0.5, 3.0], unit: 'xD' },
                retractAmount: { default: 0.2, range: [0.1, 0.5], unit: 'mm' }
            },
            gCodeCycle: 'G73',
            materialModifiers: {}
        },
        DRILL_SPOT: {
            id: 'DRILL_005',
            name: 'Spot Drilling',
            altNames: ['Center Drill', 'Spot'],
            category: 'drilling',
            description: 'Create starting point for subsequent drilling',
            whenToUse: ['Before standard drilling', 'Hole location accuracy'],
            parameters: {
                depth: { default: 0.5, range: [0.2, 2.0], unit: 'xD' },
                angle: { default: 90, options: [60, 82, 90, 118, 120], unit: 'deg' }
            },
            materialModifiers: {}
        },
        DRILL_GUN: {
            id: 'DRILL_006',
            name: 'Gun Drilling',
            altNames: ['Deep Hole Drilling', 'Single Flute'],
            category: 'drilling',
            description: 'Specialized deep hole drilling with coolant through',
            whenToUse: ['Very deep holes >20xD', 'High accuracy required'],
            parameters: {
                feedRate: { default: 0.03, range: [0.01, 0.08], unit: 'mm/rev' },
                coolantPressure: { default: 70, range: [50, 150], unit: 'bar' }
            },
            materialModifiers: {}
        },
        DRILL_BTA: {
            id: 'DRILL_007',
            name: 'BTA Drilling',
            altNames: ['Boring Trepanning Association', 'STS'],
            category: 'drilling',
            description: 'Large diameter deep hole drilling',
            whenToUse: ['Large deep holes', 'Diameters >20mm'],
            parameters: {
                feedRate: { default: 0.05, range: [0.02, 0.1], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        DRILL_HELICAL: {
            id: 'DRILL_008',
            name: 'Helical Drilling',
            altNames: ['Helix Bore', 'Circular Ramp'],
            category: 'drilling',
            description: 'Helical interpolation to create holes',
            whenToUse: ['Large holes', 'No drill available', 'Plunge cut avoidance'],
            parameters: {
                helixPitch: { default: 0.5, range: [0.1, 2.0], unit: 'mm/rev' },
                finishPasses: { default: 1, range: [0, 3], unit: 'count' }
            },
            materialModifiers: {}
        },
        COUNTERBORE: {
            id: 'DRILL_010',
            name: 'Counterbore',
            altNames: ['Spot Face', 'Flat Bottom'],
            category: 'drilling',
            description: 'Create flat bottom recesses for fastener heads',
            parameters: {
                depth: { default: null, type: 'value', unit: 'mm' },
                diameter: { default: null, type: 'value', unit: 'mm' }
            },
            materialModifiers: {}
        },
        COUNTERSINK: {
            id: 'DRILL_011',
            name: 'Countersink',
            altNames: ['Chamfer Hole', 'CSK'],
            category: 'drilling',
            description: 'Create conical recess for flat head screws',
            parameters: {
                angle: { default: 82, options: [60, 82, 90, 100, 120], unit: 'deg' },
                diameter: { default: null, type: 'value', unit: 'mm' }
            },
            materialModifiers: {}
        },
        REAMING: {
            id: 'DRILL_012',
            name: 'Reaming',
            altNames: ['Ream', 'Finish Bore'],
            category: 'drilling',
            description: 'Precision hole finishing',
            whenToUse: ['Tolerance holes', 'After drilling', 'H7 fit required'],
            parameters: {
                feedRate: { default: 0.3, range: [0.1, 0.6], unit: 'mm/rev' },
                speedFactor: { default: 0.5, range: [0.3, 0.7], unit: 'ratio' },
                stockAllowance: { default: 0.2, range: [0.1, 0.5], unit: 'mm' }
            },
            materialModifiers: {}
        },
        TAPPING: {
            id: 'DRILL_013',
            name: 'Tapping',
            altNames: ['Tap', 'Thread'],
            category: 'threading',
            description: 'Create internal threads',
            parameters: {
                pitch: { default: null, type: 'value', unit: 'mm' },
                depth: { default: null, type: 'value', unit: 'mm' },
                synchronous: { default: true, type: 'boolean' }
            },
            gCodeCycle: 'G84',
            materialModifiers: {}
        },
        THREAD_MILLING: {
            id: 'DRILL_014',
            name: 'Thread Milling',
            altNames: ['Thread Mill', 'Helical Thread'],
            category: 'threading',
            description: 'Mill threads using helical interpolation',
            whenToUse: ['Large threads', 'Hard materials', 'Interrupted threads'],
            parameters: {
                pitch: { default: null, type: 'value', unit: 'mm' },
                passes: { default: 1, range: [1, 5], unit: 'count' }
            },
            materialModifiers: {}
        },
        BORING: {
            id: 'DRILL_015',
            name: 'Boring',
            altNames: ['Bore', 'Fine Bore'],
            category: 'drilling',
            description: 'Precision single-point boring',
            whenToUse: ['High accuracy holes', 'Large diameters', 'Custom sizes'],
            parameters: {
                feedRate: { default: 0.08, range: [0.03, 0.2], unit: 'mm/rev' },
                dwellAtBottom: { default: 0.5, range: [0, 2], unit: 'sec' }
            },
            gCodeCycle: 'G85',
            materialModifiers: {}
        },
        BACK_BORING: {
            id: 'DRILL_016',
            name: 'Back Boring',
            altNames: ['Back Counterbore', 'Reverse Bore'],
            category: 'drilling',
            description: 'Boring from the back side',
            whenToUse: ['Backside features', 'Limited access'],
            parameters: {
                depth: { default: null, type: 'value', unit: 'mm' }
            },
            materialModifiers: {}
        }
    },
    // TURNING STRATEGIES (Lathe)
    turning: {

        TURN_OD_ROUGH: {
            id: 'TURN_001',
            name: 'OD Roughing',
            altNames: ['External Rough', 'Turn Rough'],
            category: 'turning',
            subcategory: 'roughing',
            description: 'External diameter roughing',
            parameters: {
                depthOfCut: { default: 2.0, range: [0.5, 6.0], unit: 'mm' },
                feedRate: { default: 0.25, range: [0.1, 0.5], unit: 'mm/rev' },
                approach: { default: 'axial', options: ['axial', 'radial'] }
            },
            materialModifiers: {}
        },
        TURN_OD_FINISH: {
            id: 'TURN_002',
            name: 'OD Finishing',
            altNames: ['External Finish', 'Turn Finish'],
            category: 'turning',
            subcategory: 'finishing',
            description: 'External diameter finishing',
            parameters: {
                depthOfCut: { default: 0.2, range: [0.05, 0.5], unit: 'mm' },
                feedRate: { default: 0.08, range: [0.03, 0.15], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_ID_ROUGH: {
            id: 'TURN_003',
            name: 'ID Roughing',
            altNames: ['Boring Rough', 'Internal Rough'],
            category: 'turning',
            subcategory: 'roughing',
            description: 'Internal diameter roughing',
            parameters: {
                depthOfCut: { default: 1.5, range: [0.3, 4.0], unit: 'mm' },
                feedRate: { default: 0.15, range: [0.05, 0.3], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_ID_FINISH: {
            id: 'TURN_004',
            name: 'ID Finishing',
            altNames: ['Boring Finish', 'Internal Finish'],
            category: 'turning',
            subcategory: 'finishing',
            description: 'Internal diameter finishing',
            parameters: {
                depthOfCut: { default: 0.15, range: [0.03, 0.3], unit: 'mm' },
                feedRate: { default: 0.06, range: [0.02, 0.12], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_FACE_ROUGH: {
            id: 'TURN_005',
            name: 'Face Roughing',
            altNames: ['Facing Rough'],
            category: 'turning',
            subcategory: 'roughing',
            description: 'Face machining roughing',
            parameters: {
                depthOfCut: { default: 1.5, range: [0.5, 4.0], unit: 'mm' },
                feedRate: { default: 0.25, range: [0.1, 0.4], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_FACE_FINISH: {
            id: 'TURN_006',
            name: 'Face Finishing',
            altNames: ['Facing Finish'],
            category: 'turning',
            subcategory: 'finishing',
            description: 'Face machining finishing',
            parameters: {
                depthOfCut: { default: 0.15, range: [0.05, 0.3], unit: 'mm' },
                feedRate: { default: 0.08, range: [0.03, 0.15], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_GROOVE_OD: {
            id: 'TURN_007',
            name: 'OD Grooving',
            altNames: ['External Groove', 'Groove'],
            category: 'turning',
            subcategory: 'grooving',
            description: 'External grooving operations',
            parameters: {
                grooveWidth: { default: null, type: 'value', unit: 'mm' },
                grooveDepth: { default: null, type: 'value', unit: 'mm' },
                feedRate: { default: 0.08, range: [0.03, 0.15], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_GROOVE_ID: {
            id: 'TURN_008',
            name: 'ID Grooving',
            altNames: ['Internal Groove', 'Bore Groove'],
            category: 'turning',
            subcategory: 'grooving',
            description: 'Internal grooving operations',
            parameters: {
                grooveWidth: { default: null, type: 'value', unit: 'mm' },
                grooveDepth: { default: null, type: 'value', unit: 'mm' },
                feedRate: { default: 0.06, range: [0.02, 0.12], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_GROOVE_FACE: {
            id: 'TURN_009',
            name: 'Face Grooving',
            altNames: ['Front Groove'],
            category: 'turning',
            subcategory: 'grooving',
            description: 'Face grooving operations',
            parameters: {
                grooveWidth: { default: null, type: 'value', unit: 'mm' },
                feedRate: { default: 0.06, range: [0.02, 0.12], unit: 'mm/rev' }
            },
            materialModifiers: {}
        },
        TURN_PARTING: {
            id: 'TURN_010',
            name: 'Parting Off',
            altNames: ['Cutoff', 'Part Off'],
            category: 'turning',
            subcategory: 'parting',
            description: 'Part separation from bar stock',
            parameters: {
                feedRate: { default: 0.08, range: [0.03, 0.15], unit: 'mm/rev' },
                coolant: { default: 'flood', options: ['flood', 'mist', 'none'] }
            },
            materialModifiers: {}
        },
        TURN_THREAD_OD: {
            id: 'TURN_011',
            name: 'OD Threading',
            altNames: ['External Thread', 'Thread Turning'],
            category: 'turning',
            subcategory: 'threading',
            description: 'External thread cutting',
            parameters: {
                pitch: { default: null, type: 'value', unit: 'mm' },
                passes: { default: 6, range: [3, 15], unit: 'count' },
                infeed: { default: 'modified_flank', options: ['radial', 'flank', 'modified_flank', 'alternating'] }
            },
            materialModifiers: {}
        },
        TURN_THREAD_ID: {
            id: 'TURN_012',
            name: 'ID Threading',
            altNames: ['Internal Thread', 'Bore Thread'],
            category: 'turning',
            subcategory: 'threading',
            description: 'Internal thread cutting',
            parameters: {
                pitch: { default: null, type: 'value', unit: 'mm' },
                passes: { default: 8, range: [4, 20], unit: 'count' }
            },
            materialModifiers: {}
        },
        TURN_CONTOUR: {
            id: 'TURN_013',
            name: 'Profile Turning',
            altNames: ['Contour Turn', 'Profile'],
            category: 'turning',
            subcategory: 'finishing',
            description: 'Complex profile turning',
            parameters: {
                stockAllowance: { default: 0, range: [0, 0.5], unit: 'mm' },
                stepover: { default: 0.5, range: [0.1, 2.0], unit: 'mm' }
            },
            materialModifiers: {}
        },
        TURN_DRILLING: {
            id: 'TURN_014',
            name: 'Lathe Drilling',
            altNames: ['Turn Drill', 'Center Drill'],
            category: 'turning',
            subcategory: 'drilling',
            description: 'Drilling on lathe',
            parameters: {
                feedRate: { default: 0.12, range: [0.05, 0.3], unit: 'mm/rev' },
                peckDepth: { default: 2.0, range: [0.5, 5.0], unit: 'xD' }
            },
            materialModifiers: {}
        },
        TURN_TAPPING: {
            id: 'TURN_015',
            name: 'Lathe Tapping',
            altNames: ['Turn Tap'],
            category: 'turning',
            subcategory: 'threading',
            description: 'Tapping on lathe',
            parameters: {
                pitch: { default: null, type: 'value', unit: 'mm' },
                synchronous: { default: true, type: 'boolean' }
            },
            materialModifiers: {}
        },
        PRIME_TURNING: {
            id: 'TURN_016',
            name: 'PrimeTurning™',
            altNames: ['All-Direction Turning', 'Sandvik Prime'],
            category: 'turning',
            subcategory: 'advanced',
            description: 'High efficiency multi-directional turning',
            whenToUse: ['High MRR', 'Modern machines', 'PrimeTurning inserts'],
            parameters: {
                direction: { default: 'forward', options: ['forward', 'reverse', 'both'] },
                depthOfCut: { default: 3.0, range: [1.0, 8.0], unit: 'mm' },
                feedRate: { default: 0.4, range: [0.2, 0.8], unit: 'mm/rev' }
            },
            materialModifiers: {}
        }
    },
    // 5-AXIS STRATEGIES
    multiAxis: {

        SWARF_MILLING: {
            id: '5AX_001',
            name: 'Swarf Milling',
            altNames: ['Flank Milling', 'Side Milling'],
            category: '5-axis',
            subcategory: 'simultaneous',
            description: 'Side of cutter follows ruled surface',
            whenToUse: ['Ruled surfaces', 'Blades', 'Impellers'],
            parameters: {
                tiltAngle: { default: 0, range: [-15, 15], unit: 'deg' },
                leadAngle: { default: 0, range: [-10, 10], unit: 'deg' }
            },
            materialModifiers: {}
        },
        MULTIAXIS_ROUGHING: {
            id: '5AX_002',
            name: '5-Axis Roughing',
            altNames: ['Simultaneous Rough', 'Multi-Axis Rough'],
            category: '5-axis',
            subcategory: 'roughing',
            description: '5-axis simultaneous roughing',
            parameters: {
                toolAxis: { default: 'auto', options: ['auto', 'lead_lag', 'fixed', 'tilted'] },
                stepdown: { default: 2.0, range: [0.5, 5.0], unit: 'xD' }
            },
            materialModifiers: {}
        },
        MULTIAXIS_FINISHING: {
            id: '5AX_003',
            name: '5-Axis Finishing',
            altNames: ['Simultaneous Finish', 'Multi-Axis Finish'],
            category: '5-axis',
            subcategory: 'finishing',
            description: '5-axis simultaneous finishing',
            parameters: {
                toolAxis: { default: 'auto', options: ['auto', 'surface_normal', 'lead_lag'] },
                stepover: { default: 0.1, range: [0.03, 0.25], unit: 'xD' }
            },
            materialModifiers: {}
        },
        PORT_MACHINING: {
            id: '5AX_004',
            name: 'Port Machining',
            altNames: ['Inlet/Outlet', 'Manifold'],
            category: '5-axis',
            subcategory: 'specialized',
            description: 'Machining of port geometries',
            whenToUse: ['Cylinder heads', 'Manifolds', 'Intake/exhaust ports'],
            parameters: {
                toolOrientation: { default: 'follow_port', options: ['follow_port', 'fixed'] }
            },
            materialModifiers: {}
        },
        IMPELLER_ROUGHING: {
            id: '5AX_005',
            name: 'Impeller Roughing',
            altNames: ['Blade Rough', 'Pump Rough'],
            category: '5-axis',
            subcategory: 'impeller',
            description: 'Roughing between impeller blades',
            whenToUse: ['Impellers', 'Pump components', 'Turbine blades'],
            parameters: {
                bladeCount: { default: null, type: 'value' },
                hubDiameter: { default: null, type: 'value', unit: 'mm' }
            },
            materialModifiers: {}
        },
        IMPELLER_FINISHING: {
            id: '5AX_006',
            name: 'Impeller Finishing',
            altNames: ['Blade Finish', 'Pump Finish'],
            category: '5-axis',
            subcategory: 'impeller',
            description: 'Finishing impeller blades and hub',
            parameters: {
                bladeFinish: { default: true, type: 'boolean' },
                hubFinish: { default: true, type: 'boolean' },
                splitterFinish: { default: false, type: 'boolean' }
            },
            materialModifiers: {}
        },
        BLADE_ROUGHING: {
            id: '5AX_007',
            name: 'Blade Roughing',
            altNames: ['Airfoil Rough'],
            category: '5-axis',
            subcategory: 'blade',
            description: 'Roughing single blade/airfoil',
            parameters: {
                strategy: { default: 'parallel', options: ['parallel', 'radial', 'adaptive'] }
            },
            materialModifiers: {}
        },
        BLADE_FINISHING: {
            id: '5AX_008',
            name: 'Blade Finishing',
            altNames: ['Airfoil Finish'],
            category: '5-axis',
            subcategory: 'blade',
            description: 'Finishing single blade/airfoil',
            parameters: {
                stepover: { default: 0.08, range: [0.03, 0.15], unit: 'xD' },
                surfaceSide: { default: 'both', options: ['pressure', 'suction', 'both'] }
            },
            materialModifiers: {}
        },
        TUBE_MILLING: {
            id: '5AX_009',
            name: 'Tube Milling',
            altNames: ['Pipe Milling', 'Tubular'],
            category: '5-axis',
            subcategory: 'specialized',
            description: 'Milling tubular/pipe geometries',
            parameters: {
                wallFollowing: { default: true, type: 'boolean' },
                spiralPath: { default: false, type: 'boolean' }
            },
            materialModifiers: {}
        },
        BARREL_FINISHING: {
            id: '5AX_010',
            name: 'Barrel Cutter Finishing',
            altNames: ['Lens Cutter', 'Circle Segment'],
            category: '5-axis',
            subcategory: 'advanced',
            description: 'Large radius cutter for large surface finishing',
            whenToUse: ['Large surfaces', 'Reduce finishing time', 'Better surface quality'],
            parameters: {
                barrelRadius: { default: 250, range: [50, 1000], unit: 'mm' },
                stepover: { default: 2.0, range: [0.5, 5.0], unit: 'mm' }
            },
            materialModifiers: {}
        },
        GEODESIC_5AXIS: {
            id: '5AX_011',
            name: '5-Axis Geodesic',
            altNames: ['Shortest Path 5-Axis'],
            category: '5-axis',
            subcategory: 'finishing',
            description: 'Geodesic paths with 5-axis tool orientation',
            parameters: {
                maxTilt: { default: 30, range: [10, 60], unit: 'deg' }
            },
            materialModifiers: {}
        },
        INDEXED_3PLUS2: {
            id: '5AX_012',
            name: '3+2 Axis Machining',
            altNames: ['Positional 5-Axis', 'Fixed Axis'],
            category: '5-axis',
            subcategory: 'positional',
            description: 'Fixed axis orientations for 3-axis operations',
            whenToUse: ['Multiple faces', 'Prismatic parts', 'Older machines'],
            parameters: {
                orientations: { default: 'auto', options: ['auto', 'manual'] },
                minFeatures: { default: 3, range: [1, 10], unit: 'count' }
            },
            materialModifiers: {}
        }
    },
    // SPECIALTY STRATEGIES
    specialty: {

        ENGRAVING: {
            id: 'SPEC_001',
            name: 'Engraving',
            altNames: ['Marking', 'Text'],
            category: 'specialty',
            description: 'Text and logo engraving',
            parameters: {
                depth: { default: 0.2, range: [0.05, 1.0], unit: 'mm' },
                fontSize: { default: 5, range: [2, 50], unit: 'mm' }
            },
            materialModifiers: {}
        },
        THREAD_MILL_SINGLE: {
            id: 'SPEC_002',
            name: 'Single Point Thread Mill',
            altNames: ['Thread Mill'],
            category: 'threading',
            description: 'Single point thread milling',
            parameters: {
                pitch: { default: null, type: 'value', unit: 'mm' },
                passes: { default: 3, range: [1, 10], unit: 'count' }
            },
            materialModifiers: {}
        },
        CHAMFER_MILL: {
            id: 'SPEC_003',
            name: 'Chamfer Milling',
            altNames: ['Deburring', 'Edge Break'],
            category: 'specialty',
            description: 'Edge chamfering and deburring',
            parameters: {
                chamferSize: { default: 0.5, range: [0.1, 3.0], unit: 'mm' },
                angle: { default: 45, range: [30, 60], unit: 'deg' }
            },
            materialModifiers: {}
        },
        SLOT_MILLING: {
            id: 'SPEC_004',
            name: 'Slot Milling',
            altNames: ['Keyway', 'T-Slot'],
            category: 'specialty',
            description: 'Slot and keyway machining',
            parameters: {
                slotType: { default: 'standard', options: ['standard', 't_slot', 'dovetail'] },
                depth: { default: null, type: 'value', unit: 'mm' }
            },
            materialModifiers: {}
        },
        CIRCULAR_MILLING: {
            id: 'SPEC_005',
            name: 'Circular Pocket Milling',
            altNames: ['Bore Mill', 'Circular Interpolation'],
            category: 'specialty',
            description: 'Circular pocket with helical entry',
            parameters: {
                diameter: { default: null, type: 'value', unit: 'mm' },
                helicalEntry: { default: true, type: 'boolean' }
            },
            materialModifiers: {}
        },
        FILLET_MILLING: {
            id: 'SPEC_006',
            name: 'Fillet Milling',
            altNames: ['Corner Radius', 'Blend'],
            category: 'specialty',
            description: 'Adding fillets to edges and corners',
            parameters: {
                radius: { default: null, type: 'value', unit: 'mm' },
                tangentExtension: { default: 0.5, range: [0, 2], unit: 'mm' }
            },
            materialModifiers: {}
        }
    },
    // PRISM EXCLUSIVE STRATEGIES (AI-Enhanced)
    prismExclusive: {

        VORONOI_ADAPTIVE_CLEARING: {
            id: 'PRISM_001',
            name: 'Voronoi Adaptive Clearing™',
            isPRISMExclusive: true,
            category: 'roughing',
            description: 'Voronoi diagram-based adaptive clearing with optimized cell processing',
            aiFeatures: ['Voronoi medial axis', 'PSO optimization', 'Predictive chip load'],
            parameters: {
                cellDensity: { default: 'auto', options: ['low', 'medium', 'high', 'auto'] },
                orderingMethod: { default: 'ant_colony', options: ['nearest', 'ant_colony', 'genetic'] }
            },
            materialModifiers: {}
        },
        DELAUNAY_MESH_ROUGHING: {
            id: 'PRISM_002',
            name: 'Delaunay Mesh Roughing™',
            isPRISMExclusive: true,
            category: 'roughing',
            description: 'Delaunay triangulation-based roughing for complex geometry',
            aiFeatures: ['Delaunay triangulation', 'Mesh optimization'],
            materialModifiers: {}
        },
        FFT_GRADIENT_FINISHING: {
            id: 'PRISM_003',
            name: 'FFT Gradient Finishing™',
            isPRISMExclusive: true,
            category: 'finishing',
            description: 'FFT-based surface gradient analysis for optimal finish paths',
            aiFeatures: ['FFT analysis', 'Gradient field following', 'Chatter prediction'],
            materialModifiers: {}
        },
        MEDIAL_AXIS_ROUGHING: {
            id: 'PRISM_004',
            name: 'Medial Axis Roughing™',
            isPRISMExclusive: true,
            category: 'roughing',
            description: 'Medial axis transform-based roughing for minimal air cutting',
            aiFeatures: ['MAT computation', 'Skeleton-based paths'],
            materialModifiers: {}
        },
        BAYESIAN_ADAPTIVE_FINISH: {
            id: 'PRISM_005',
            name: 'Bayesian Adaptive Finish™',
            isPRISMExclusive: true,
            category: 'finishing',
            description: 'Bayesian learning-based parameter adaptation during finishing',
            aiFeatures: ['Bayesian optimization', 'Real-time learning', 'Confidence intervals'],
            materialModifiers: {}
        },
        GAUSSIAN_PROCESS_SURFACE: {
            id: 'PRISM_006',
            name: 'Gaussian Process Surface Optimization™',
            isPRISMExclusive: true,
            category: 'finishing',
            description: 'GP-based surface quality prediction and optimization',
            aiFeatures: ['Gaussian Process', 'Uncertainty quantification'],
            materialModifiers: {}
        },
        REINFORCEMENT_LEARNING_ADAPTIVE: {
            id: 'PRISM_007',
            name: 'RL Adaptive Machining™',
            isPRISMExclusive: true,
            category: 'advanced',
            description: 'Reinforcement learning-based adaptive machining strategy',
            aiFeatures: ['Q-learning', 'Policy gradient', 'State-action optimization'],
            materialModifiers: {}
        },
        CNN_FEATURE_ADAPTIVE: {
            id: 'PRISM_008',
            name: 'CNN Feature-Aware Adaptive™',
            isPRISMExclusive: true,
            category: 'advanced',
            description: 'CNN-based feature recognition for strategy selection',
            aiFeatures: ['CNN feature detection', 'Automatic strategy selection'],
            materialModifiers: {}
        },
        LQR_CONTOUR_CONTROL: {
            id: 'PRISM_009',
            name: 'LQR Contour Control™',
            isPRISMExclusive: true,
            category: 'finishing',
            description: 'Linear Quadratic Regulator-based contour error minimization',
            aiFeatures: ['LQR control', 'Contour error prediction'],
            materialModifiers: {}
        },
        FFT_SURFACE_OPTIMIZATION: {
            id: 'PRISM_010',
            name: 'FFT Surface Optimization™',
            isPRISMExclusive: true,
            category: 'finishing',
            description: 'FFT-based surface analysis for optimal toolpath orientation',
            aiFeatures: ['FFT spectrum analysis', 'Frequency-based optimization'],
            materialModifiers: {}
        }
    },
    // Helper method to get strategy count
    getStrategyCount: function() {
        let count = 0;
        for (const category of Object.keys(this)) {
            if (typeof this[category] === 'object' && category !== 'getStrategyCount' &&
                category !== 'getAllStrategies' && category !== 'getStrategy') {
                count += Object.keys(this[category]).length;
            }
        }
        return count;
    },
    getAllStrategies: function() {
        const all = [];
        for (const [categoryName, category] of Object.entries(this)) {
            if (typeof category === 'object' && typeof category !== 'function') {
                for (const [strategyName, strategy] of Object.entries(category)) {
                    if (typeof strategy === 'object' && strategy.id) {
                        all.push({
                            category: categoryName,
                            key: strategyName,
                            ...strategy
                        });
                    }
                }
            }
        }
        return all;
    },
    getStrategy: function(id) {
        for (const [categoryName, category] of Object.entries(this)) {
            if (typeof category === 'object') {
                for (const [strategyName, strategy] of Object.entries(category)) {
                    if (strategy.id === id || strategyName === id) {
                        return { category: categoryName, key: strategyName, ...strategy };
                    }
                }
            }
        }
        return null;
    }
}