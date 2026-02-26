const PRISM_WORKHOLDING_DATABASE = {
    version: '1.0.0',
    authority: 'PRISM_WORKHOLDING_DATABASE',

    // FIXTURE TYPES
    fixtureTypes: {
        vise: {
            name: 'Machine Vise',
            category: 'standard',
            baseRigidity: 0.9,
            baseDamping: 0.85,
            clampingMethod: 'parallel_jaws',
            typicalClampingForce: { min: 15000, max: 60000 },  // N
            setupTime: 5,  // minutes typical
            repeatability: 0.01  // mm
        },
        hydraulic_vise: {
            name: 'Hydraulic Vise',
            category: 'premium',
            baseRigidity: 0.95,
            baseDamping: 0.90,
            clampingMethod: 'hydraulic_jaws',
            typicalClampingForce: { min: 25000, max: 80000 },
            setupTime: 3,
            repeatability: 0.005
        },
        chuck_3jaw: {
            name: '3-Jaw Chuck',
            category: 'turning',
            baseRigidity: 0.85,
            baseDamping: 0.80,
            clampingMethod: 'scroll_chuck',
            typicalClampingForce: { min: 20000, max: 100000 },
            setupTime: 5,
            repeatability: 0.05  // concentricity
        },
        chuck_6jaw: {
            name: '6-Jaw Chuck',
            category: 'turning',
            baseRigidity: 0.90,
            baseDamping: 0.85,
            clampingMethod: 'scroll_chuck',
            typicalClampingForce: { min: 25000, max: 120000 },
            setupTime: 5,
            repeatability: 0.02
        },
        collet_chuck: {
            name: 'Collet Chuck',
            category: 'turning',
            baseRigidity: 0.95,
            baseDamping: 0.90,
            clampingMethod: 'collet',
            typicalClampingForce: { min: 15000, max: 50000 },
            setupTime: 2,
            repeatability: 0.01
        },
        vacuum: {
            name: 'Vacuum Table',
            category: 'specialty',
            baseRigidity: 0.60,
            baseDamping: 0.50,
            clampingMethod: 'vacuum',
            typicalClampingForce: { min: 5000, max: 20000 },  // depends on area
            setupTime: 2,
            repeatability: 0.1
        },
        magnetic: {
            name: 'Magnetic Chuck',
            category: 'specialty',
            baseRigidity: 0.70,
            baseDamping: 0.65,
            clampingMethod: 'magnetic',
            typicalClampingForce: { min: 10000, max: 40000 },
            setupTime: 1,
            repeatability: 0.05
        },
        fixture_plate: {
            name: 'Modular Fixture Plate',
            category: 'custom',
            baseRigidity: 0.85,
            baseDamping: 0.80,
            clampingMethod: 'toe_clamps',
            typicalClampingForce: { min: 8000, max: 30000 },
            setupTime: 15,
            repeatability: 0.02
        },
        tombstone: {
            name: 'Tombstone/Column',
            category: 'production',
            baseRigidity: 0.75,
            baseDamping: 0.70,
            clampingMethod: 'multi_face',
            typicalClampingForce: { min: 15000, max: 50000 },
            setupTime: 20,
            repeatability: 0.02
        },
        pallet: {
            name: 'Pallet System',
            category: 'production',
            baseRigidity: 0.90,
            baseDamping: 0.85,
            clampingMethod: 'zero_point',
            typicalClampingForce: { min: 30000, max: 100000 },
            setupTime: 1,  // pallet change time
            repeatability: 0.005
        },
        soft_jaws: {
            name: 'Machined Soft Jaws',
            category: 'custom',
            baseRigidity: 0.95,
            baseDamping: 0.90,
            clampingMethod: 'profiled_jaws',
            typicalClampingForce: { min: 20000, max: 60000 },
            setupTime: 30,  // includes machining
            repeatability: 0.01
        },
        expanding_mandrel: {
            name: 'Expanding Mandrel',
            category: 'id_clamping',
            baseRigidity: 0.85,
            baseDamping: 0.80,
            clampingMethod: 'internal_expansion',
            typicalClampingForce: { min: 15000, max: 50000 },
            setupTime: 5,
            repeatability: 0.01
        }
    },
    // SPECIFIC WORKHOLDING PRODUCTS
    products: {
        // Kurt Vises
        'kurt_dl640': {
            manufacturer: 'Kurt',
            model: 'DL640',
            type: 'vise',
            jawWidth: 152,      // mm
            maxOpening: 175,    // mm
            clampingForce: 40000,  // N
            weight: 54,         // kg
            rigidityFactor: 0.95,
            damping: 0.90
        },
        'kurt_anglock': {
            manufacturer: 'Kurt',
            model: 'AngLock',
            type: 'vise',
            jawWidth: 152,
            maxOpening: 178,
            clampingForce: 35000,
            weight: 45,
            rigidityFactor: 0.92,
            damping: 0.88
        },
        // Schunk
        'schunk_kontec_ks': {
            manufacturer: 'Schunk',
            model: 'KONTEC KS',
            type: 'hydraulic_vise',
            jawWidth: 125,
            maxOpening: 160,
            clampingForce: 55000,
            weight: 38,
            rigidityFactor: 0.97,
            damping: 0.92
        },
        // Lang Technik
        'lang_makro_grip': {
            manufacturer: 'Lang Technik',
            model: 'Makro-Grip',
            type: 'vise',
            jawWidth: 125,
            maxOpening: 172,
            clampingForce: 48000,
            weight: 35,
            rigidityFactor: 0.94,
            damping: 0.89,
            fiveAxisCapable: true
        },
        // Mitee-Bite
        'miteebite_pitbull': {
            manufacturer: 'Mitee-Bite',
            model: 'Pitbull',
            type: 'fixture_plate',
            jawWidth: 38,
            maxOpening: 50,
            clampingForce: 8000,
            weight: 0.5,
            rigidityFactor: 0.80,
            damping: 0.75,
            lowProfile: true
        }
    },
    // RIGIDITY CALCULATION

    calculateRigidity: function(workholding) {
        const {
            fixtureType,
            product,
            partMass,
            overhang,
            contactArea,
            clampingForce
        } = workholding;

        // Get base rigidity from fixture type
        let baseRigidity = this.fixtureTypes[fixtureType]?.baseRigidity || 0.80;
        let baseDamping = this.fixtureTypes[fixtureType]?.baseDamping || 0.75;

        // Override with specific product if available
        if (product && this.products[product]) {
            baseRigidity = this.products[product].rigidityFactor || baseRigidity;
            baseDamping = this.products[product].damping || baseDamping;
        }
        // Part mass factor (heavier parts are more stable)
        const massFactor = Math.min(1.0, 0.7 + (partMass || 1) * 0.03);

        // Overhang penalty (more overhang = less rigid)
        const overhangPenalty = overhang ? Math.max(0.5, 1.0 - overhang * 0.01) : 1.0;

        // Contact area bonus
        const contactBonus = contactArea ? Math.min(1.15, 0.9 + contactArea * 0.0001) : 1.0;

        // Clamping force factor
        const typicalForce = this.fixtureTypes[fixtureType]?.typicalClampingForce?.max || 40000;
        const forceFactor = clampingForce ? Math.min(1.1, 0.8 + (clampingForce / typicalForce) * 0.3) : 1.0;

        const finalRigidity = baseRigidity * massFactor * overhangPenalty * contactBonus * forceFactor;
        const finalDamping = baseDamping * Math.sqrt(massFactor * overhangPenalty);

        return {
            rigidity: Math.min(1.0, finalRigidity),
            damping: Math.min(1.0, finalDamping),
            factors: {
                base: baseRigidity,
                mass: massFactor,
                overhang: overhangPenalty,
                contact: contactBonus,
                force: forceFactor
            }
        };
    },
    // Calculate maximum safe cutting force
    calculateMaxCuttingForce: function(workholding) {
        const rigidity = this.calculateRigidity(workholding);
        const clampingForce = workholding.clampingForce ||
            this.fixtureTypes[workholding.fixtureType]?.typicalClampingForce?.max || 30000;

        const frictionCoef = workholding.frictionCoefficient || 0.3;
        const safetyFactor = 2.0;

        // Maximum force that won't cause part slip
        const maxForce = (clampingForce * frictionCoef) / safetyFactor;

        return {
            maxCuttingForce: maxForce,
            clampingForce: clampingForce,
            rigidityScore: Math.round(rigidity.rigidity * 100)
        };
    }
};
// SECTION 3: CROSS-CAM TOOLPATH STRATEGY MAPPING

/**
 * PRISM_CROSSCAM_STRATEGY_MAP
 * Maps toolpath strategies from different CAM systems to PRISM equivalents
 * Enables consistent speed/feed calculation regardless of source CAM
 */
const PRISM_CROSSCAM_STRATEGY_MAP = {
    version: '1.0.0',
    authority: 'PRISM_CROSSCAM_STRATEGY_MAP',

    // CAM SYSTEM MAPPINGS

    fusion360: {
        name: 'Autodesk Fusion 360',
        strategies: {
            // 2D Operations
            'Adaptive Clearing': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                maxEngagement: 0.25,
                description: 'Constant engagement roughing',
                modifiers: { speed: 1.1, feed: 1.0, doc: 1.5, woc: 0.25 }
            },
            '2D Pocket': {
                prism: 'pocket_offset',
                type: 'roughing',
                engagementType: 'variable',
                maxEngagement: 0.5,
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            '2D Contour': {
                prism: 'contour_2d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.8, doc: 1.0, woc: 0.05 }
            },
            'Face': {
                prism: 'facing',
                type: 'facing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 0.15, woc: 0.7 }
            },
            'Slot': {
                prism: 'slot',
                type: 'slotting',
                modifiers: { speed: 0.8, feed: 0.7, doc: 0.5, woc: 1.0 }
            },
            'Trace': {
                prism: 'trace',
                type: 'finishing',
                modifiers: { speed: 1.0, feed: 0.9, doc: 0.3, woc: 0.1 }
            },
            'Engrave': {
                prism: 'engrave',
                type: 'specialty',
                modifiers: { speed: 0.6, feed: 0.5, doc: 0.1, woc: 0.05 }
            },
            // 3D Operations
            '3D Adaptive': {
                prism: 'adaptive_3d',
                type: 'roughing',
                engagementType: 'constant',
                maxEngagement: 0.25,
                modifiers: { speed: 1.1, feed: 1.0, doc: 1.5, woc: 0.25 }
            },
            'Parallel': {
                prism: 'parallel_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.7, doc: 0.3, woc: 0.15 }
            },
            'Scallop': {
                prism: 'scallop_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.7, doc: 0.3, woc: 0.1 }
            },
            'Pencil': {
                prism: 'pencil_3d',
                type: 'finishing',
                modifiers: { speed: 1.0, feed: 0.6, doc: 0.1, woc: 0.05 }
            },
            'Steep and Shallow': {
                prism: 'steep_shallow',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.8, doc: 0.3, woc: 0.15 }
            },
            'Morphed Spiral': {
                prism: 'morphed_spiral',
                type: 'finishing',
                modifiers: { speed: 1.0, feed: 0.7, doc: 0.2, woc: 0.1 }
            },
            'Radial': {
                prism: 'radial_3d',
                type: 'finishing',
                modifiers: { speed: 1.0, feed: 0.7, doc: 0.2, woc: 0.1 }
            },
            'Spiral': {
                prism: 'spiral_3d',
                type: 'finishing',
                modifiers: { speed: 1.0, feed: 0.7, doc: 0.2, woc: 0.1 }
            },
            'Contour': {
                prism: 'contour_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.8, doc: 0.2, woc: 0.05 }
            },
            'Horizontal': {
                prism: 'horizontal_3d',
                type: 'semi_finishing',
                modifiers: { speed: 1.0, feed: 0.9, doc: 0.5, woc: 0.3 }
            },
            'Project': {
                prism: 'project_3d',
                type: 'specialty',
                modifiers: { speed: 0.9, feed: 0.8, doc: 0.3, woc: 0.15 }
            },
            // 5-Axis Operations
            'Swarf': {
                prism: 'swarf_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 1.0, feed: 0.8, doc: 0.5, woc: 0.15 }
            },
            'Multi-Axis Contour': {
                prism: 'contour_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 1.0, feed: 0.7, doc: 0.2, woc: 0.05 }
            },
            'Flow': {
                prism: 'flow_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 0.9, feed: 0.7, doc: 0.2, woc: 0.1 }
            },
            // Drilling
            'Drill': { prism: 'drill', type: 'drilling' },
            'Spot': { prism: 'spot_drill', type: 'drilling' },
            'Bore': { prism: 'bore', type: 'drilling' },
            'Circular': { prism: 'circular_pocket', type: 'drilling' },
            'Thread': { prism: 'thread_mill', type: 'threading' }
        }
    },
    mastercam: {
        name: 'Mastercam',
        strategies: {
            // 2D Operations
            'Dynamic Mill': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                maxEngagement: 0.15,
                modifiers: { speed: 1.15, feed: 1.1, doc: 2.0, woc: 0.15 }
            },
            'Area Mill': {
                prism: 'pocket_zigzag',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            'Pocket': {
                prism: 'pocket_offset',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            'Contour': {
                prism: 'contour_2d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.8, doc: 1.0, woc: 0.05 }
            },
            'Facing': {
                prism: 'facing',
                type: 'facing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 0.15, woc: 0.7 }
            },
            'Slot Mill': {
                prism: 'slot',
                type: 'slotting',
                modifiers: { speed: 0.8, feed: 0.7, doc: 0.5, woc: 1.0 }
            },
            'Peel Mill': {
                prism: 'peel_mill',
                type: 'roughing',
                engagementType: 'constant',
                modifiers: { speed: 1.2, feed: 1.0, doc: 2.5, woc: 0.1 }
            },
            'Dynamic Contour': {
                prism: 'dynamic_contour',
                type: 'finishing',
                engagementType: 'constant',
                modifiers: { speed: 1.15, feed: 0.9, doc: 1.0, woc: 0.1 }
            },
            'OptiRough': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                modifiers: { speed: 1.15, feed: 1.1, doc: 2.0, woc: 0.18 }
            },
            // 3D Operations
            'Surface Rough Pocket': {
                prism: 'pocket_3d',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            'Surface Rough Parallel': {
                prism: 'parallel_rough_3d',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 0.8, woc: 0.4 }
            },
            'Surface Finish Parallel': {
                prism: 'parallel_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.7, doc: 0.3, woc: 0.15 }
            },
            'Surface Finish Scallop': {
                prism: 'scallop_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.7, doc: 0.3, woc: 0.1 }
            },
            'Surface Finish Pencil': {
                prism: 'pencil_3d',
                type: 'finishing',
                modifiers: { speed: 1.0, feed: 0.6, doc: 0.1, woc: 0.05 }
            },
            'Surface Finish Contour': {
                prism: 'contour_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.8, doc: 0.2, woc: 0.05 }
            },
            'Surface High Speed Hybrid': {
                prism: 'hybrid_hsm',
                type: 'semi_finishing',
                modifiers: { speed: 1.15, feed: 0.9, doc: 0.5, woc: 0.2 }
            },
            'Surface High Speed Waterline': {
                prism: 'waterline_3d',
                type: 'semi_finishing',
                modifiers: { speed: 1.1, feed: 0.85, doc: 0.4, woc: 0.25 }
            },
            'Surface High Speed Scallop': {
                prism: 'scallop_hsm',
                type: 'finishing',
                modifiers: { speed: 1.15, feed: 0.75, doc: 0.25, woc: 0.08 }
            },
            'Equal Scallop': {
                prism: 'scallop_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.7, doc: 0.3, woc: 0.08 }
            },
            'Flowline': {
                prism: 'flowline_3d',
                type: 'finishing',
                modifiers: { speed: 1.0, feed: 0.75, doc: 0.2, woc: 0.1 }
            },
            // Multiaxis
            'Multiaxis Swarf': {
                prism: 'swarf_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 1.0, feed: 0.8, doc: 0.5, woc: 0.15 }
            },
            'Multiaxis Flow': {
                prism: 'flow_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 0.9, feed: 0.7, doc: 0.2, woc: 0.1 }
            },
            'Multiaxis Drill': {
                prism: 'drill_5axis',
                type: 'drilling',
                fiveAxis: true
            },
            'Multiaxis Morph': {
                prism: 'morph_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 0.9, feed: 0.7, doc: 0.2, woc: 0.1 }
            }
        }
    },
    solidcam: {
        name: 'SolidCAM',
        strategies: {
            'iMachining 2D': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                maxEngagement: 0.12,
                modifiers: { speed: 1.2, feed: 1.15, doc: 2.5, woc: 0.12 }
            },
            'iMachining 3D': {
                prism: 'adaptive_3d',
                type: 'roughing',
                engagementType: 'constant',
                modifiers: { speed: 1.2, feed: 1.15, doc: 2.5, woc: 0.12 }
            },
            'HSM': {
                prism: 'hsm_pocket',
                type: 'roughing',
                modifiers: { speed: 1.15, feed: 1.05, doc: 1.5, woc: 0.2 }
            },
            'HSR': {
                prism: 'hsr_3d',
                type: 'roughing',
                modifiers: { speed: 1.1, feed: 1.0, doc: 1.0, woc: 0.35 }
            },
            'HSS': {
                prism: 'parallel_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.75, doc: 0.3, woc: 0.12 }
            },
            '5x Swarf': {
                prism: 'swarf_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 1.0, feed: 0.8, doc: 0.5, woc: 0.15 }
            },
            '5x Multi-blade': {
                prism: 'blade_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 0.85, feed: 0.7, doc: 0.3, woc: 0.1 }
            }
        }
    },
    hypermill: {
        name: 'hyperMILL',
        strategies: {
            'HPC Pocket': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                modifiers: { speed: 1.15, feed: 1.1, doc: 2.0, woc: 0.18 }
            },
            '3D Optimized Roughing': {
                prism: 'adaptive_3d',
                type: 'roughing',
                modifiers: { speed: 1.15, feed: 1.1, doc: 2.0, woc: 0.2 }
            },
            'Z-Level': {
                prism: 'zlevel_3d',
                type: 'semi_finishing',
                modifiers: { speed: 1.05, feed: 0.9, doc: 0.5, woc: 0.3 }
            },
            'Equidistant': {
                prism: 'parallel_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.75, doc: 0.3, woc: 0.12 }
            },
            '5X Swarf Cutting': {
                prism: 'swarf_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 1.0, feed: 0.8, doc: 0.5, woc: 0.15 }
            },
            '5X Shape Offset': {
                prism: 'shape_offset_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 0.95, feed: 0.75, doc: 0.2, woc: 0.08 }
            }
        }
    },
    powermill: {
        name: 'Autodesk PowerMill',
        strategies: {
            'Vortex': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                modifiers: { speed: 1.15, feed: 1.1, doc: 2.0, woc: 0.15 }
            },
            'Offset Area Clear': {
                prism: 'pocket_offset',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            'Raster': {
                prism: 'parallel_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.75, doc: 0.3, woc: 0.15 }
            },
            'Offset': {
                prism: 'offset_3d',
                type: 'finishing',
                modifiers: { speed: 1.05, feed: 0.8, doc: 0.3, woc: 0.1 }
            },
            'Steep and Shallow': {
                prism: 'steep_shallow',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.8, doc: 0.3, woc: 0.15 }
            },
            'Swarf': {
                prism: 'swarf_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 1.0, feed: 0.8, doc: 0.5, woc: 0.15 }
            },
            'Blade Finishing': {
                prism: 'blade_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 0.85, feed: 0.7, doc: 0.3, woc: 0.1 }
            }
        }
    },
    nx: {
        name: 'Siemens NX CAM',
        strategies: {
            'Cavity Mill': {
                prism: 'pocket_offset',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            'Contour Area': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                modifiers: { speed: 1.1, feed: 1.05, doc: 1.5, woc: 0.25 }
            },
            'Zlevel Profile': {
                prism: 'zlevel_3d',
                type: 'semi_finishing',
                modifiers: { speed: 1.05, feed: 0.9, doc: 0.5, woc: 0.3 }
            },
            'Fixed Contour': {
                prism: 'parallel_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.75, doc: 0.3, woc: 0.12 }
            },
            'Variable Contour': {
                prism: 'swarf_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 1.0, feed: 0.8, doc: 0.5, woc: 0.15 }
            },
            'Streamline': {
                prism: 'flow_5axis',
                type: 'finishing',
                fiveAxis: true,
                modifiers: { speed: 0.9, feed: 0.75, doc: 0.2, woc: 0.1 }
            }
        }
    },
    esprit: {
        name: 'ESPRIT',
        strategies: {
            'ProfitMilling': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                modifiers: { speed: 1.15, feed: 1.1, doc: 2.0, woc: 0.15 }
            },
            'Stock Pocket': {
                prism: 'pocket_offset',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            '3D Contouring': {
                prism: 'parallel_3d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.75, doc: 0.3, woc: 0.12 }
            }
        }
    },
    camworks: {
        name: 'CAMWorks',
        strategies: {
            'VoluMill': {
                prism: 'adaptive_pocket',
                type: 'roughing',
                engagementType: 'constant',
                modifiers: { speed: 1.15, feed: 1.1, doc: 2.0, woc: 0.18 }
            },
            'Rough Mill': {
                prism: 'pocket_offset',
                type: 'roughing',
                modifiers: { speed: 1.0, feed: 1.0, doc: 1.0, woc: 0.5 }
            },
            'Finish Mill': {
                prism: 'contour_2d',
                type: 'finishing',
                modifiers: { speed: 1.1, feed: 0.8, doc: 1.0, woc: 0.05 }
            }
        }
    },
    // PRISM NATIVE STRATEGIES
    prism: {
        name: 'PRISM Native',
        strategies: {
            // Roughing
            'adaptive_pocket': { type: 'roughing', engagementType: 'constant', maxEngagement: 0.25 },
            'pocket_offset': { type: 'roughing', engagementType: 'variable' },
            'pocket_zigzag': { type: 'roughing', engagementType: 'variable' },
            'adaptive_3d': { type: 'roughing', engagementType: 'constant' },
            'pocket_3d': { type: 'roughing', engagementType: 'variable' },

            // Semi-finishing
            'zlevel_3d': { type: 'semi_finishing' },
            'waterline_3d': { type: 'semi_finishing' },

            // Finishing
            'parallel_3d': { type: 'finishing' },
            'scallop_3d': { type: 'finishing' },
            'pencil_3d': { type: 'finishing' },
            'contour_3d': { type: 'finishing' },
            'contour_2d': { type: 'finishing' },
            'steep_shallow': { type: 'finishing' },

            // 5-Axis
            'swarf_5axis': { type: 'finishing', fiveAxis: true },
            'flow_5axis': { type: 'finishing', fiveAxis: true },
            'contour_5axis': { type: 'finishing', fiveAxis: true },

            // Specialty
            'facing': { type: 'facing' },
            'slot': { type: 'slotting' },
            'drill': { type: 'drilling' },
            'thread_mill': { type: 'threading' }
        }
    },
    // MAPPING METHODS

    mapStrategy: function(camSystem, strategyName) {
        const camData = this[camSystem.toLowerCase().replace(/[\s-]/g, '')];
        if (!camData || !camData.strategies) {
            return null;
        }
        const strategy = camData.strategies[strategyName];
        if (!strategy) {
            // Try fuzzy matching
            const fuzzyMatch = Object.keys(camData.strategies).find(
                key => key.toLowerCase().includes(strategyName.toLowerCase()) ||
                       strategyName.toLowerCase().includes(key.toLowerCase())
            );
            if (fuzzyMatch) {
                return camData.strategies[fuzzyMatch];
            }
            return null;
        }
        return strategy;
    },
    getModifiers: function(camSystem, strategyName) {
        const strategy = this.mapStrategy(camSystem, strategyName);
        return strategy?.modifiers || { speed: 1.0, feed: 1.0, doc: 1.0, woc: 1.0 };
    },
    getPrismEquivalent: function(camSystem, strategyName) {
        const strategy = this.mapStrategy(camSystem, strategyName);
        return strategy?.prism || 'generic';
    },
    getEngagementType: function(camSystem, strategyName) {
        const strategy = this.mapStrategy(camSystem, strategyName);
        return strategy?.engagementType || 'variable';
    },
    listSupportedCAMSystems: function() {
        return Object.keys(this)
            .filter(key => typeof this[key] === 'object' && this[key].name)
            .map(key => ({ id: key, name: this[key].name }));
    },
    listStrategies: function(camSystem) {
        const camData = this[camSystem];
        if (!camData || !camData.strategies) return [];
        return Object.keys(camData.strategies);
    }
};
// SECTION 4: ENHANCED PHYSICS ENGINE

/**
 * PRISM_CALCULATOR_PHYSICS_ENGINE
 * Enhanced physics calculations for accurate cutting parameter optimization
 * Based on: MIT 2.008, Altintas "Manufacturing Automation", Tlusty
 */
const PRISM_CALCULATOR_PHYSICS_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_PHYSICS_ENGINE',

    // CUTTING FORCE MODELS
    forces: {
        /**
         * Mechanistic Cutting Force Model (Altintas)
         * Calculates forces based on chip thickness and specific cutting pressure
         */
        millingForces: function(params) {
            const {
                Kc,              // Specific cutting pressure (N/mm²)
                ae,              // Radial engagement (mm)
                ap,              // Axial engagement / DOC (mm)
                fz,              // Feed per tooth (mm)
                z,               // Number of teeth
                D,               // Tool diameter (mm)
                helixAngle,      // Helix angle (degrees)
                leadAngle        // Lead/approach angle (degrees) - for face mills
            } = params;

            // Engagement angles
            const phi_st = Math.acos(1 - 2 * ae / D);  // Start angle
            const phi_ex = Math.PI;                     // Exit angle (climb milling)

            // Average chip thickness (considering engagement)
            const engagementRatio = ae / D;
            const avgEngagement = Math.asin(engagementRatio);
            const h_avg = fz * Math.sin(avgEngagement) * engagementRatio;
            const h_max = fz * Math.sqrt(2 * ae / D - Math.pow(ae / D, 2));

            // Cutting coefficients (from material Kc)
            const Kr = 0.35;  // Radial force ratio (typical for steel)
            const Ka = 0.25;  // Axial force ratio

            const Ktc = Kc;                            // Tangential cutting coefficient
            const Krc = Kr * Kc;                       // Radial cutting coefficient
            const Kac = Ka * Kc;                       // Axial cutting coefficient

            // Average forces per tooth
            const Ft_avg = Ktc * ap * h_avg;          // Tangential force (N)
            const Fr_avg = Krc * ap * h_avg;          // Radial force (N)
            const Fa_avg = Kac * ap * h_avg;          // Axial force (N)

            // Peak forces (at maximum chip thickness)
            const Ft_peak = Ktc * ap * h_max;
            const Fr_peak = Krc * ap * h_max;
            const Fa_peak = Kac * ap * h_max;

            // Number of teeth engaged (average)
            const engagedTeeth = z * (phi_ex - phi_st) / (2 * Math.PI);
            const engagedTeethMax = Math.ceil(engagedTeeth);

            // Total average forces
            const Ft_total = Ft_avg * engagedTeeth;
            const Fr_total = Fr_avg * engagedTeeth;
            const Fa_total = Fa_avg * engagedTeeth;

            // Peak total forces
            const Ft_peak_total = Ft_peak * engagedTeethMax;
            const Fr_peak_total = Fr_peak * engagedTeethMax;

            // Resultant force in XY plane
            const Fxy = Math.sqrt(Ft_total * Ft_total + Fr_total * Fr_total);
            const F_resultant = Math.sqrt(Fxy * Fxy + Fa_total * Fa_total);

            // Torque
            const torque = Ft_total * D / 2000;  // Nm

            // Bending moment at tool tip
            const stickout = params.stickout || 50;  // mm
            const bendingMoment = Fr_total * stickout;  // N·mm

            return {
                tangential: { avg: Ft_avg, peak: Ft_peak, total: Ft_total },
                radial: { avg: Fr_avg, peak: Fr_peak, total: Fr_total },
                axial: { avg: Fa_avg, peak: Fa_peak, total: Fa_total },
                resultant: F_resultant,
                resultantXY: Fxy,
                torque: torque,
                bendingMoment: bendingMoment,
                engagedTeeth: engagedTeeth,
                chipThickness: { avg: h_avg, max: h_max },
                units: { force: 'N', torque: 'Nm', moment: 'N·mm' }
            };
        },
        /**
         * Turning Force Model (Kienzle)
         */
        turningForces: function(params) {
            const { Kc, mc, ap, f, Vc, kr } = params;
            // kr = lead angle (KAPR)

            // Chip cross-section
            const b = ap / Math.sin(kr * Math.PI / 180);  // Uncut chip width
            const h = f * Math.sin(kr * Math.PI / 180);   // Chip thickness

            // Kienzle equation: Kc = Kc1.1 × h^(-mc)
            const Kc_actual = Kc * Math.pow(h, -mc);

            // Main cutting force
            const Fc = Kc_actual * b * h;  // N

            // Feed force (typically 40-60% of Fc)
            const Ff = 0.5 * Fc;

            // Radial/passive force
            const Fp = Fc * Math.tan((90 - kr) * Math.PI / 180);

            // Power
            const power = Fc * Vc / 60000;  // kW

            return {
                cutting: Fc,
                feed: Ff,
                radial: Fp,
                resultant: Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp),
                power: power,
                specificCuttingForce: Kc_actual,
                units: { force: 'N', power: 'kW' }
            };
        }
    },
    // POWER & TORQUE
    power: {
        /**
         * Calculate spindle power requirement
         */
        spindlePower: function(Fc, Vc) {
            // P = Fc × Vc / 60000 (Fc in N, Vc in m/min, P in kW)
            return Fc * Vc / 60000;
        },
        /**
         * Calculate power from MRR and specific energy
         */
        powerFromMRR: function(mrr, specificEnergy) {
            // mrr in cm³/min, specificEnergy in W·s/mm³ = J/mm³
            // P = MRR × specificEnergy / 60
            return (mrr * specificEnergy) / 60;  // kW
        },
        /**
         * Calculate spindle torque at RPM
         */
        spindleTorque: function(power, rpm) {
            // T = P × 9549 / rpm (P in kW, T in Nm)
            return power * 9549 / rpm;
        },
        /**
         * Check against spindle power/torque curve
         */
        checkSpindleLimits: function(requiredPower, requiredTorque, spindle, rpm) {
            // Interpolate power curve
            const availablePower = this.interpolateCurve(spindle.powerCurve, rpm, 'power');
            const availableTorque = this.interpolateCurve(spindle.torqueCurve, rpm, 'torque');

            const safetyMargin = 0.85;  // 85% of available

            return {
                powerOk: requiredPower <= availablePower * safetyMargin,
                torqueOk: requiredTorque <= availableTorque * safetyMargin,
                powerUtilization: requiredPower / availablePower,
                torqueUtilization: requiredTorque / availableTorque,
                availablePower: availablePower,
                availableTorque: availableTorque,
                limitingFactor: requiredPower / availablePower > requiredTorque / availableTorque
                    ? 'power' : 'torque',
                maxAllowedPower: availablePower * safetyMargin,
                maxAllowedTorque: availableTorque * safetyMargin
            };
        },
        interpolateCurve: function(curve, rpm, type) {
            if (!curve || curve.length === 0) {
                return type === 'power' ? 15 : 100;  // Defaults
            }
            // Sort by RPM
            const sorted = [...curve].sort((a, b) => a.rpm - b.rpm);

            // Below minimum
            if (rpm <= sorted[0].rpm) {
                return type === 'power' ? sorted[0].power : sorted[0].torque;
            }
            // Above maximum
            if (rpm >= sorted[sorted.length - 1].rpm) {
                return type === 'power' ? sorted[sorted.length - 1].power : sorted[sorted.length - 1].torque;
            }
            // Linear interpolation
            for (let i = 0; i < sorted.length - 1; i++) {
                if (rpm >= sorted[i].rpm && rpm <= sorted[i + 1].rpm) {
                    const ratio = (rpm - sorted[i].rpm) / (sorted[i + 1].rpm - sorted[i].rpm);
                    const v1 = type === 'power' ? sorted[i].power : sorted[i].torque;
                    const v2 = type === 'power' ? sorted[i + 1].power : sorted[i + 1].torque;
                    return v1 + ratio * (v2 - v1);
                }
            }
            return type === 'power' ? 15 : 100;
        }
    },
    // DEFLECTION CALCULATIONS
    deflection: {
        /**
         * Tool deflection at tip (cantilever beam model)
         */
        toolDeflection: function(F, L, D, E) {
            // δ = F × L³ / (3 × E × I)
            // I = π × D⁴ / 64 for solid cylinder
            E = E || 620000;  // MPa for carbide
            const I = Math.PI * Math.pow(D, 4) / 64;
            return F * Math.pow(L, 3) / (3 * E * I);  // mm
        },
        /**
         * Stepped tool deflection (varying diameter)
         */
        steppedToolDeflection: function(F, segments) {
            // segments: [{length, diameter}]
            // Calculate deflection for multi-diameter tool
            const E = 620000;  // MPa
            let totalDeflection = 0;
            let cumulativeLength = 0;

            for (const seg of segments) {
                const I = Math.PI * Math.pow(seg.diameter, 4) / 64;
                const L = seg.length;

                // Deflection contribution from this segment
                const segDeflection = F * Math.pow(L, 3) / (3 * E * I);

                // Add angular contribution to subsequent segments
                const angle = F * L * L / (2 * E * I);

                totalDeflection += segDeflection;
                cumulativeLength += L;
            }
            return totalDeflection;
        },
        /**
         * Total system deflection including holder and spindle
         */
        systemDeflection: function(params) {
            const { F, toolLength, toolDia, holderStiffness, spindleStiffness, holderRunout } = params;

            // Tool deflection
            const toolDefl = this.toolDeflection(F, toolLength, toolDia);

            // Holder deflection (if stiffness known)
            const holderDefl = holderStiffness ? F / holderStiffness : 0;

            // Spindle deflection (if stiffness known)
            const spindleDefl = spindleStiffness ? F / spindleStiffness : 0;

            // Runout contribution (adds to error, not force-dependent)
            const runoutContribution = holderRunout || 0;

            // Total at tool tip (worst case addition)
            const total = toolDefl + holderDefl + spindleDefl + runoutContribution;

            return {
                tool: toolDefl,
                holder: holderDefl,
                spindle: spindleDefl,
                runout: runoutContribution,
                total: total,
                breakdown: {
                    toolPercent: (toolDefl / total) * 100,
                    holderPercent: (holderDefl / total) * 100,
                    spindlePercent: (spindleDefl / total) * 100,
                    runoutPercent: (runoutContribution / total) * 100
                },
                withinTolerance: function(tolerance) { return total < tolerance; }
            };
        }
    },
    // THERMAL CALCULATIONS
    thermal: {
        /**
         * Estimate cutting temperature (Loewen-Shaw model)
         */
        cuttingTemperature: function(params) {
            const { Vc, f, Kc, k, rho, c, ambient } = params;
            // k = thermal conductivity (W/m·K)
            // rho = density (kg/m³)
            // c = specific heat (J/kg·K)

            ambient = ambient || 20;  // °C

            // Thermal number
            const Rt = (rho * c * Vc * f) / (60 * k);

            // Simplified temperature rise model
            // Most heat goes to chip (~75%), some to tool (~10%), some to work (~15%)
            const heatGeneration = Kc * Vc * f / 60;  // W/mm

            // Temperature rise estimation
            const deltaT = 0.4 * heatGeneration / (rho * c);

            return {
                temperatureRise: deltaT,
                chipTemperature: ambient + deltaT * 0.75,
                toolTemperature: ambient + deltaT * 0.10,
                workTemperature: ambient + deltaT * 0.15,
                heatPartition: {
                    chip: 0.75,
                    tool: 0.10,
                    work: 0.15
                }
            };
        }
    },
    // SURFACE FINISH PREDICTION
    surfaceFinish: {
        /**
         * Theoretical surface roughness (kinematic)
         */
        theoreticalRa: function(params) {
            const { fz, cornerRadius, toolType } = params;

            if (toolType === 'ball') {
                // Ball end mill: Ra ≈ fz² / (8 × R)
                const R = params.toolRadius || cornerRadius;
                return (fz * fz) / (8 * R) * 1000;  // μm
            } else {
                // End mill with corner radius: Ra ≈ fz² / (32 × r)
                const r = cornerRadius || 0.4;
                return (fz * fz) / (32 * r) * 1000;  // μm
            }
        },
        /**
         * Practical surface roughness (includes factors)
         */
        practicalRa: function(params) {
            const theoreticalRa = this.theoreticalRa(params);

            // Adjustment factors
            const materialFactor = params.materialFactor || 1.0;
            const toolConditionFactor = params.toolCondition || 1.0;
            const rigidityFactor = params.rigidity || 1.0;
            const vibrationFactor = params.vibration || 1.0;

            return theoreticalRa * materialFactor * toolConditionFactor *
                   rigidityFactor * vibrationFactor;
        }
    }
};
// SECTION 5: CONSTRAINT ENGINE

/**
 * PRISM_CALCULATOR_CONSTRAINT_ENGINE
 * Systematic application of all constraints to find valid parameter ranges
 */
const PRISM_CALCULATOR_CONSTRAINT_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_CONSTRAINT_ENGINE',

    /**
     * Apply all constraints to find valid parameter ranges
     */
    applyAllConstraints: function(inputs) {
        const constraints = {
            rpm: { min: 0, max: Infinity, limitedBy: [] },
            feed: { min: 0, max: Infinity, limitedBy: [] },
            doc: { min: 0, max: Infinity, limitedBy: [] },
            woc: { min: 0, max: Infinity, limitedBy: [] },
            vc: { min: 0, max: Infinity, limitedBy: [] }
        };
        // Apply constraints from each source
        this.applyMachineConstraints(constraints, inputs.machine);
        this.applyControllerConstraints(constraints, inputs.controller);
        this.applyToolConstraints(constraints, inputs.tool);
        this.applyHolderConstraints(constraints, inputs.holder);
        this.applyWorkholdingConstraints(constraints, inputs.workholding);
        this.applyMaterialConstraints(constraints, inputs.material, inputs.tool);
        this.applyToolpathConstraints(constraints, inputs.toolpath);

        return constraints;
    },
    applyMachineConstraints: function(constraints, machine) {
        if (!machine) return;

        const spindle = machine.spindle || machine;

        // RPM limits
        if (spindle.maxRpm) {
            constraints.rpm.max = Math.min(constraints.rpm.max, spindle.maxRpm);
            constraints.rpm.limitedBy.push('spindle_max_rpm');
        }
        if (spindle.minRpm) {
            constraints.rpm.min = Math.max(constraints.rpm.min, spindle.minRpm);
            constraints.rpm.limitedBy.push('spindle_min_rpm');
        }
        // Feed limits from axes
        if (machine.axes) {
            const maxAxisFeed = Math.min(
                machine.axes.x?.maxFeed || Infinity,
                machine.axes.y?.maxFeed || Infinity,
                machine.axes.z?.maxFeed || Infinity
            );
            constraints.feed.max = Math.min(constraints.feed.max, maxAxisFeed);
            constraints.feed.limitedBy.push('axis_max_feed');
        } else if (machine.rapids) {
            constraints.feed.max = Math.min(constraints.feed.max, machine.rapids.xy || machine.rapids.xyz || 25000);
            constraints.feed.limitedBy.push('rapid_limit');
        }
        // Power/Torque limits (will be checked dynamically)
        constraints.powerLimit = spindle.peakHp || spindle.maxPower || 20;
        constraints.torqueLimit = spindle.torque || spindle.maxTorque || 100;

        // Machine rigidity factor
        const rigidityFactors = {
            'light': 0.75,
            'medium': 1.0,
            'heavy': 1.15,
            'ultra-rigid': 1.30,
            'ultra_heavy': 1.30
        };
        constraints.machineRigidity = rigidityFactors[machine.structure?.rigidityClass || machine.rigidityClass] || 1.0;
    },
    applyControllerConstraints: function(constraints, controller) {
        if (!controller) return;

        // Look-ahead affects max achievable feed at small moves
        if (controller.motion?.lookAhead) {
            constraints.controllerLookAhead = controller.motion.lookAhead;
        }
        // Block processing rate
        if (controller.motion?.blockProcessingRate) {
            constraints.blockProcessingRate = controller.motion.blockProcessingRate;
        }
        // 5-axis capabilities
        constraints.rtcpCapable = controller.compensation?.rtcpCapable ||
                                  controller.fiveAxis?.tcpc || false;
    },
    applyToolConstraints: function(constraints, tool) {
        if (!tool) return;

        const diameter = tool.diameter || tool.solidTool?.diameter ||
                        tool.indexableTool?.cuttingDiameter || 12;

        // Store tool diameter for reference
        constraints.toolDiameter = diameter;

        // DOC limits from tool geometry
        if (tool.solidTool?.fluteLength) {
            constraints.doc.max = Math.min(constraints.doc.max, tool.solidTool.fluteLength);
            constraints.doc.limitedBy.push('flute_length');
        } else if (tool.indexableTool?.maxDoc) {
            constraints.doc.max = Math.min(constraints.doc.max, tool.indexableTool.maxDoc);
            constraints.doc.limitedBy.push('insert_max_doc');
        }
        // WOC limited by tool diameter
        constraints.woc.max = Math.min(constraints.woc.max, diameter);
        constraints.woc.limitedBy.push('tool_diameter');

        // Center cutting affects plunge capability
        constraints.centerCutting = tool.solidTool?.centerCutting !== false;
    },
    applyHolderConstraints: function(constraints, holder) {
        if (!holder) return;

        // Max RPM from holder balance grade
        if (holder.maxRpm) {
            constraints.rpm.max = Math.min(constraints.rpm.max, holder.maxRpm);
            constraints.rpm.limitedBy.push('holder_max_rpm');
        }
        // Holder rigidity affects achievable parameters
        constraints.holderRigidity = holder.rigidityFactor || holder.rigidity || 1.0;
        constraints.holderDamping = holder.damping || 1.0;
        constraints.holderRunout = holder.runout || 0.003;
    },
    applyWorkholdingConstraints: function(constraints, workholding) {
        if (!workholding) return;

        // Get rigidity from workholding database
        const rigidityData = PRISM_WORKHOLDING_DATABASE.calculateRigidity(workholding);

        constraints.workholdingRigidity = rigidityData.rigidity;
        constraints.workholdingDamping = rigidityData.damping;

        // Thin wall considerations
        if (workholding.thinWalls) {
            constraints.thinWallMode = true;
            constraints.doc.max *= 0.5;
            constraints.woc.max *= 0.5;
            constraints.doc.limitedBy.push('thin_wall');
            constraints.woc.limitedBy.push('thin_wall');
        }
    },
    applyMaterialConstraints: function(constraints, material, tool) {
        if (!material) return;

        // Get cutting parameters from material
        const toolMat = tool?.solidTool?.material || tool?.material || 'carbide';

        // Try to get from PRISM material database
        if (typeof PRISM_MATERIALS_MASTER !== 'undefined' && material.id) {
            const matData = PRISM_MATERIALS_MASTER.byId?.(material.id);
            if (matData?.cuttingParams?.[toolMat]) {
                const params = matData.cuttingParams[toolMat];
                constraints.vcRange = {
                    min: params.vc?.min || 50,
                    max: params.vc?.max || 300
                };
                constraints.fzRange = {
                    min: params.fz?.min || 0.03,
                    max: params.fz?.max || 0.3
                };
            }
        }
        // Get Kc from material
        constraints.materialKc = material.Kc11 || material.Kc || 1800;
        constraints.materialMc = material.mc || 0.25;
    },
    applyToolpathConstraints: function(constraints, toolpath) {
        if (!toolpath) return;

        // Get strategy from cross-CAM mapping if applicable
        if (toolpath.camSystem && toolpath.strategyName) {
            const strategyData = PRISM_CROSSCAM_STRATEGY_MAP.mapStrategy(
                toolpath.camSystem,
                toolpath.strategyName
            );

            if (strategyData) {
                constraints.strategyModifiers = strategyData.modifiers || {};
                constraints.engagementType = strategyData.engagementType || 'variable';

                if (strategyData.maxEngagement && constraints.toolDiameter) {
                    constraints.woc.max = Math.min(
                        constraints.woc.max,
                        strategyData.maxEngagement * constraints.toolDiameter
                    );
                    constraints.woc.limitedBy.push('strategy_engagement_limit');
                }
            }
        }
        // Direct engagement limits
        if (toolpath.maxRadialEngagement && constraints.toolDiameter) {
            constraints.woc.max = Math.min(
                constraints.woc.max,
                toolpath.maxRadialEngagement * constraints.toolDiameter
            );
        }
        if (toolpath.maxAxialEngagement) {
            constraints.doc.max = Math.min(constraints.doc.max, toolpath.maxAxialEngagement);
        }
    },
    /**
     * Calculate composite rigidity factor from all sources
     */
    getCompositeRigidity: function(constraints) {
        const machineRig = constraints.machineRigidity || 1.0;
        const holderRig = constraints.holderRigidity || 1.0;
        const workholdingRig = constraints.workholdingRigidity || 1.0;

        // Geometric mean for composite
        return Math.pow(machineRig * holderRig * workholdingRig, 1/3);
    }
};
// SECTION 6: PRISM OPTIMIZED™ MODE (AI/ML Deep Integration)

/**
 * PRISM_OPTIMIZED_MODE
 * Premium optimization using all AI/ML engines for best-in-class parameters
 * Integrates: PSO, FFT Chatter, Monte Carlo, Bayesian Learning, Genetic Toolpath
 */
const PRISM_OPTIMIZED_MODE = {
    version: '1.0.0',
    authority: 'PRISM_OPTIMIZED_MODE',
    tier: 'enterprise',

    /**
     * Premium optimization using all available AI engines
     */
    optimize: function(baseParams, inputs, constraints) {
        const results = {
            params: { ...baseParams },
            innovations: [],
            confidence: 0,
            improvements: {}
        };
        // 1. PSO MULTI-OBJECTIVE OPTIMIZATION
        if (typeof PRISM_PSO_OPTIMIZER !== 'undefined') {
            try {
                const psoResult = PRISM_PSO_OPTIMIZER.optimizeMultiObjectiveCutting({
                    material: inputs.material,
                    tool: inputs.tool,
                    machine: inputs.machine,
                    objectives: ['mrr', 'toolLife', 'surfaceFinish'],
                    weights: { mrr: 0.4, toolLife: 0.35, surfaceFinish: 0.25 }
                });

                if (psoResult && psoResult.bestSolution) {
                    results.params.rpm = psoResult.bestSolution.rpm || results.params.rpm;
                    results.params.feedRate = psoResult.bestSolution.feedrate || results.params.feedRate;
                    results.params.doc = psoResult.bestSolution.doc || results.params.doc;
                    results.params.woc = psoResult.bestSolution.woc || results.params.woc;

                    results.innovations.push('PSO_MULTI_OBJECTIVE');
                    results.improvements.pso = {
                        mrrImprovement: psoResult.improvement?.mrr || 0,
                        iterations: psoResult.iterations
                    };
                }
            } catch (e) {
                console.warn('[PRISM_OPTIMIZED] PSO optimization failed:', e.message);
            }
        }
        // 2. FFT CHATTER STABILITY ANALYSIS
        if (typeof PRISM_FFT_CHATTER_ENGINE !== 'undefined') {
            try {
                const machineStructure = inputs.machine?.structure || {
                    naturalFrequency: 500,
                    dampingRatio: 0.03,
                    stiffness: 1e7
                };
                const toolParams = {
                    numFlutes: inputs.tool?.solidTool?.numberOfFlutes || 4,
                    specificCuttingForce: constraints.materialKc || 2000
                };
                const stabilityLobes = PRISM_FFT_CHATTER_ENGINE.generateStabilityLobes(
                    machineStructure,
                    toolParams
                );

                const optimalSpeed = PRISM_FFT_CHATTER_ENGINE.findOptimalSpeed(
                    stabilityLobes,
                    results.params.doc
                );

                if (optimalSpeed.found && optimalSpeed.stable) {
                    // Only apply if significantly different and stable
                    const rpmDiff = Math.abs(optimalSpeed.optimalRpm - results.params.rpm) / results.params.rpm;
                    if (rpmDiff > 0.05) {
                        results.params.rpm = optimalSpeed.optimalRpm;
                        results.params.stabilityOptimized = true;
                        results.innovations.push('FFT_CHATTER_AVOIDANCE');
                        results.improvements.chatter = {
                            rpmAdjustment: rpmDiff * 100,
                            maxStableDoc: optimalSpeed.maxStableDoc
                        };
                    }
                }
            } catch (e) {
                console.warn('[PRISM_OPTIMIZED] FFT chatter analysis failed:', e.message);
            }
        }
        // 3. KALMAN ADAPTIVE FEEDRATE
        if (typeof PRISM_KALMAN_CONTROLLER !== 'undefined') {
            try {
                const kalmanResult = PRISM_KALMAN_CONTROLLER.computeAdaptiveFeedrate({
                    targetFeedrate: results.params.feedRate,
                    material: inputs.material,
                    tool: inputs.tool,
                    powerLimit: constraints.powerLimit,
                    engagement: {
                        doc: results.params.doc,
                        woc: results.params.woc
                    }
                });

                if (kalmanResult && kalmanResult.adaptedFeedrate) {
                    results.params.adaptiveFeedrate = kalmanResult.adaptedFeedrate;
                    results.params.feedrateRange = kalmanResult.range;
                    results.innovations.push('KALMAN_ADAPTIVE_FEED');
                }
            } catch (e) {
                console.warn('[PRISM_OPTIMIZED] Kalman feedrate failed:', e.message);
            }
        }
        // 4. MONTE CARLO TOOL LIFE PREDICTION
        if (typeof PRISM_MONTE_CARLO_ENGINE !== 'undefined') {
            try {
                const toolLifeResult = PRISM_MONTE_CARLO_ENGINE.predictToolLife(
                    {
                        cuttingSpeed: results.params.vc || (results.params.rpm * Math.PI * constraints.toolDiameter / 1000),
                        feedrate: results.params.fz || (results.params.feedRate / (results.params.rpm * 4)),
                        doc: results.params.doc,
                        woc: results.params.woc
                    },
                    inputs.material
                );

                if (toolLifeResult) {
                    results.params.predictedToolLife = toolLifeResult.prediction;
                    results.params.toolLifeConfidence = toolLifeResult.confidence;
                    results.params.toolLifeDistribution = {
                        min: toolLifeResult.percentile5,
                        median: toolLifeResult.median,
                        max: toolLifeResult.percentile95
                    };
                    results.innovations.push('MONTE_CARLO_TOOL_LIFE');
                }
            } catch (e) {
                console.warn('[PRISM_OPTIMIZED] Monte Carlo tool life failed:', e.message);
            }
        }
        // 5. BAYESIAN LEARNING FROM HISTORY
        if (typeof PRISM_BAYESIAN_LEARNING_ENGINE !== 'undefined') {
            try {
                const bayesianRec = PRISM_BAYESIAN_LEARNING_ENGINE.recommendParameters({
                    materialId: inputs.material?.id || inputs.material?.name,
                    toolId: inputs.tool?.solidTool?.type || inputs.tool?.type,
                    operation: inputs.toolpath?.operationType || 'roughing'
                });

                if (bayesianRec && bayesianRec.observationCount >= 3) {
                    // Blend learned parameters with calculated (30% learned, 70% calculated)
                    const blendFactor = Math.min(0.3, bayesianRec.confidence * 0.5);

                    if (bayesianRec.parameters.speed) {
                        results.params.rpm = Math.round(
                            results.params.rpm * (1 - blendFactor) +
                            bayesianRec.parameters.speed * blendFactor
                        );
                    }
                    if (bayesianRec.parameters.feed) {
                        results.params.feedRate = Math.round(
                            results.params.feedRate * (1 - blendFactor) +
                            bayesianRec.parameters.feed * blendFactor
                        );
                    }
                    results.params.learnedFromHistory = true;
                    results.params.learningConfidence = bayesianRec.confidence;
                    results.params.observationCount = bayesianRec.observationCount;
                    results.innovations.push('BAYESIAN_LEARNING');
                }
            } catch (e) {
                console.warn('[PRISM_OPTIMIZED] Bayesian learning failed:', e.message);
            }
        }
        // 6. GENETIC ALGORITHM TOOLPATH OPTIMIZATION
        if (typeof PRISM_GENETIC_TOOLPATH_ENGINE !== 'undefined') {
            try {
                const gaResult = PRISM_GENETIC_TOOLPATH_ENGINE.optimize(
                    inputs.toolpath?.operationType || 'roughing',
                    null,  // geometry
                    {
                        toolDiameter: constraints.toolDiameter,
                        totalDepth: inputs.toolpath?.totalDepth || 10,
                        area: inputs.toolpath?.area || 10000
                    }
                );

                if (gaResult && gaResult.best) {
                    results.params.stepover = gaResult.best.genes?.stepover;
                    results.params.stepdown = gaResult.best.genes?.stepdown;
                    results.params.geneticallyOptimized = true;
                    results.innovations.push('GENETIC_TOOLPATH');
                    results.improvements.genetic = {
                        fitness: gaResult.best.fitness,
                        generations: gaResult.generation
                    };
                }
            } catch (e) {
                console.warn('[PRISM_OPTIMIZED] Genetic optimization failed:', e.message);
            }
        }
        // 7. ACO SEQUENCE OPTIMIZATION (if applicable)
        if (typeof PRISM_ACO_SEQUENCER !== 'undefined' && inputs.features && inputs.features.length > 1) {
            try {
                const acoResult = PRISM_ACO_SEQUENCER.optimizeSequence(inputs.features);
                if (acoResult) {
                    results.params.optimizedSequence = acoResult.sequence;
                    results.params.sequenceImprovement = acoResult.improvement;
                    results.innovations.push('ACO_SEQUENCING');
                }
            } catch (e) {
                console.warn('[PRISM_OPTIMIZED] ACO sequencing failed:', e.message);
            }
        }
        // CALCULATE OVERALL CONFIDENCE
        const innovationWeights = {
            'PSO_MULTI_OBJECTIVE': 0.25,
            'FFT_CHATTER_AVOIDANCE': 0.20,
            'KALMAN_ADAPTIVE_FEED': 0.15,
            'MONTE_CARLO_TOOL_LIFE': 0.15,
            'BAYESIAN_LEARNING': 0.15,
            'GENETIC_TOOLPATH': 0.10
        };
        let totalWeight = 0;
        for (const innovation of results.innovations) {
            totalWeight += innovationWeights[innovation] || 0.05;
        }
        results.confidence = Math.min(95, 50 + totalWeight * 50);

        return results;
    },
    /**
     * Check if PRISM Optimized mode is available (all engines loaded)
     */
    isAvailable: function() {
        const engines = [
            'PRISM_PSO_OPTIMIZER',
            'PRISM_KALMAN_CONTROLLER',
            'PRISM_MONTE_CARLO_ENGINE'
        ];

        let available = 0;
        for (const engine of engines) {
            if (typeof window !== 'undefined' && window[engine]) available++;
            else if (typeof global !== 'undefined' && global[engine]) available++;
        }
        return {
            available: available >= 2,
            enginesLoaded: available,
            totalEngines: engines.length
        };
    }
};
// SECTION 7: INTEGRATION WITH EXISTING CALCULATOR

/**
 * PRISM_CALCULATOR_ENHANCEMENT_BRIDGE
 * Bridges enhancement modules with existing PRISM calculator
 */
const PRISM_CALCULATOR_ENHANCEMENT_BRIDGE = {
    version: '1.0.0',

    /**
     * Enhance existing cutting strategy with PRISM Optimized option
     */
    enhanceCuttingStrategies: function() {
        if (typeof CUTTING_STRATEGY_DATABASE !== 'undefined') {
            // Add PRISM Optimized strategy
            CUTTING_STRATEGY_DATABASE.strategies.prism_optimized = {
                name: 'PRISM Optimized™',
                icon: '🎯',
                description: 'AI-powered multi-objective optimization using PSO, FFT chatter avoidance, Monte Carlo tool life prediction, and Bayesian learning.',
                color: '#10b981',
                tier: 'enterprise',
                modifiers: {
                    speedMult: 1.0,  // Dynamically calculated
                    feedMult: 1.0,
                    docMult: 1.0,
                    wocMult: 1.0,
                    toolLifeMult: 1.2  // Typically improved
                }
            };
            console.log('[PRISM_ENHANCEMENT] Added PRISM Optimized™ strategy');
        }
    },
    /**
     * Enhance existing CUTTING_STRATEGY_ENGINE with cross-CAM support
     */
    enhanceStrategyEngine: function() {
        if (typeof CUTTING_STRATEGY_ENGINE !== 'undefined') {
            // Add cross-CAM strategy method
            CUTTING_STRATEGY_ENGINE.getCrossCAMModifiers = function(camSystem, strategyName) {
                return PRISM_CROSSCAM_STRATEGY_MAP.getModifiers(camSystem, strategyName);
            };
            // Add PRISM Optimized calculation
            CUTTING_STRATEGY_ENGINE.calculatePRISMOptimized = function(baseParams, inputs, constraints) {
                return PRISM_OPTIMIZED_MODE.optimize(baseParams, inputs, constraints);
            };
            console.log('[PRISM_ENHANCEMENT] Enhanced CUTTING_STRATEGY_ENGINE with cross-CAM support');
        }
    },
    /**
     * Enhance existing constraint system
     */
    enhanceConstraintSystem: function() {
        // Add constraint engine to global scope
        if (typeof window !== 'undefined') {
            window.PRISM_CALCULATOR_CONSTRAINT_ENGINE = PRISM_CALCULATOR_CONSTRAINT_ENGINE;
            window.PRISM_CALCULATOR_PHYSICS_ENGINE = PRISM_CALCULATOR_PHYSICS_ENGINE;
        }
        console.log('[PRISM_ENHANCEMENT] Added enhanced physics and constraint engines');
    },
    /**
     * Initialize all enhancements
     */
    initialize: function() {
        console.log('[PRISM_CALCULATOR_ENHANCEMENT] Initializing Phase 1 enhancements...');

        this.enhanceCuttingStrategies();
        this.enhanceStrategyEngine();
        this.enhanceConstraintSystem();

        // Register with PRISM_GATEWAY if available
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.registerAuthority('calculator.controller', 'PRISM_CONTROLLER_DATABASE', 'getController');
            PRISM_GATEWAY.registerAuthority('calculator.workholding', 'PRISM_WORKHOLDING_DATABASE', 'calculateRigidity');
            PRISM_GATEWAY.registerAuthority('calculator.crosscam', 'PRISM_CROSSCAM_STRATEGY_MAP', 'mapStrategy');
            PRISM_GATEWAY.registerAuthority('calculator.physics', 'PRISM_CALCULATOR_PHYSICS_ENGINE', 'forces');
            PRISM_GATEWAY.registerAuthority('calculator.constraints', 'PRISM_CALCULATOR_CONSTRAINT_ENGINE', 'applyAllConstraints');
            PRISM_GATEWAY.registerAuthority('calculator.prismOptimized', 'PRISM_OPTIMIZED_MODE', 'optimize');
        }
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_CALCULATOR_ENHANCEMENT] Phase 1 enhancements complete!');
        console.log('  ✓ Controller Database: 10+ controllers with detailed capabilities');
        console.log('  ✓ Workholding Database: 12 fixture types, rigidity calculation');
        console.log('  ✓ Cross-CAM Mapping: 8 CAM systems, 100+ strategies mapped');
        console.log('  ✓ Physics Engine: Force, power, deflection, thermal calculations');
        console.log('  ✓ Constraint Engine: Systematic constraint application');
        console.log('  ✓ PRISM Optimized™: AI/ML deep integration mode');

        return true;
    }
};
// GLOBAL EXPORTS

// Export all modules
if (typeof window !== 'undefined') {
    window.PRISM_CONTROLLER_DATABASE = PRISM_CONTROLLER_DATABASE;
    window.PRISM_WORKHOLDING_DATABASE = PRISM_WORKHOLDING_DATABASE;
    window.PRISM_CROSSCAM_STRATEGY_MAP = PRISM_CROSSCAM_STRATEGY_MAP;
    window.PRISM_CALCULATOR_PHYSICS_ENGINE = PRISM_CALCULATOR_PHYSICS_ENGINE;
    window.PRISM_CALCULATOR_CONSTRAINT_ENGINE = PRISM_CALCULATOR_CONSTRAINT_ENGINE;
    window.PRISM_OPTIMIZED_MODE = PRISM_OPTIMIZED_MODE;
    window.PRISM_CALCULATOR_ENHANCEMENT_BRIDGE = PRISM_CALCULATOR_ENHANCEMENT_BRIDGE;
}
// Auto-initialize if DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            PRISM_CALCULATOR_ENHANCEMENT_BRIDGE.initialize();
        });
    } else {
        PRISM_CALCULATOR_ENHANCEMENT_BRIDGE.initialize();
    }
} else {
    // Node.js environment
    PRISM_CALCULATOR_ENHANCEMENT_BRIDGE.initialize();
}
// SELF-TEST

const PRISM_CALCULATOR_ENHANCEMENT_TESTS = {
    runAllTests: function() {
        console.log('[PRISM_CALCULATOR_ENHANCEMENT] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Controller lookup
        try {
            const fanuc = PRISM_CONTROLLER_DATABASE.getController('fanuc_0i-MF');
            const pass = fanuc && fanuc.motion.lookAhead === 200;
            results.tests.push({ name: 'Controller lookup', pass, data: fanuc?.model });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Controller lookup', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Workholding rigidity calculation
        try {
            const rigidity = PRISM_WORKHOLDING_DATABASE.calculateRigidity({
                fixtureType: 'vise',
                partMass: 5,
                overhang: 20
            });
            const pass = rigidity.rigidity > 0.7 && rigidity.rigidity <= 1.0;
            results.tests.push({ name: 'Workholding rigidity', pass, rigidity: rigidity.rigidity });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Workholding rigidity', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Cross-CAM strategy mapping
        try {
            const strategy = PRISM_CROSSCAM_STRATEGY_MAP.mapStrategy('fusion360', 'Adaptive Clearing');
            const pass = strategy && strategy.prism === 'adaptive_pocket';
            results.tests.push({ name: 'Cross-CAM mapping', pass, prism: strategy?.prism });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Cross-CAM mapping', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Force calculation
        try {
            const forces = PRISM_CALCULATOR_PHYSICS_ENGINE.forces.millingForces({
                Kc: 2000,
                ae: 3,
                ap: 10,
                fz: 0.1,
                z: 4,
                D: 12,
                helixAngle: 35
            });
            const pass = forces.resultant > 0 && forces.torque > 0;
            results.tests.push({ name: 'Force calculation', pass, resultant: forces.resultant });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Force calculation', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Constraint application
        try {
            const constraints = PRISM_CALCULATOR_CONSTRAINT_ENGINE.applyAllConstraints({
                machine: { spindle: { maxRpm: 12000, minRpm: 100 } },
                tool: { solidTool: { diameter: 12, fluteLength: 30 } }
            });
            const pass = constraints.rpm.max === 12000 && constraints.toolDiameter === 12;
            results.tests.push({ name: 'Constraint application', pass, rpmMax: constraints.rpm.max });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Constraint application', pass: false, error: e.message });
            results.failed++;
        }
        // Test 6: PRISM Optimized availability
        try {
            const availability = PRISM_OPTIMIZED_MODE.isAvailable();
            const pass = typeof availability.available === 'boolean';
            results.tests.push({ name: 'PRISM Optimized check', pass, available: availability.available });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'PRISM Optimized check', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_CALCULATOR_ENHANCEMENT] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};
// Run self-tests
setTimeout(() => {
    PRISM_CALCULATOR_ENHANCEMENT_TESTS.runAllTests();
}, 100);

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_CALCULATOR_ENHANCEMENT] Phase 1 Enhancement Module v1.0.0 loaded');
console.log('[PRISM_CALCULATOR_ENHANCEMENT] Ready for integration with PRISM Calculator v8.64.005+');

// END OF PRISM CALCULATOR PHASE 1 ENHANCEMENT MODULE

// PRISM AI INTEGRATION MODULE v8.66.001
// Integrates: True AI System v1.1 + Business AI System v1.0

// PRISM TRUE AI SYSTEM v1.1
// Real Neural Networks + Background Orchestration + Claude API Integration
// Created: January 15, 2026 | For Build: v8.66.001+
// This module provides:
//   1. Real trainable neural networks with backpropagation
//   2. Background orchestration that monitors user actions
//   3. Proactive assistance based on learned patterns
//   4. Claude API integration with comprehensive manufacturing context
//   5. Continuous learning from user interactions

console.log('[PRISM TRUE AI] Loading True AI System v1.1...');

// SECTION 1: TENSOR OPERATIONS

const PRISM_TENSOR = {

    zeros: function(shape) {
        if (shape.length === 1) return Array(shape[0]).fill(0);
        return Array(shape[0]).fill(null).map(() => this.zeros(shape.slice(1)));
    },
    ones: function(shape) {
        if (shape.length === 1) return Array(shape[0]).fill(1);
        return Array(shape[0]).fill(null).map(() => this.ones(shape.slice(1)));
    },
    random: function(shape, scale = 0.1) {
        if (shape.length === 1) {
            return Array(shape[0]).fill(null).map(() => (Math.random() - 0.5) * 2 * scale);
        }
        return Array(shape[0]).fill(null).map(() => this.random(shape.slice(1), scale));
    },
    shape: function(tensor) {
        const shape = [];
        let current = tensor;
        while (Array.isArray(current)) {
            shape.push(current.length);
            current = current[0];
        }
        return shape;
    },
    clone: function(tensor) {
        if (!Array.isArray(tensor)) return tensor;
        return tensor.map(t => this.clone(t));
    },
    add: function(a, b) {
        if (!Array.isArray(a)) return a + b;
        return a.map((ai, i) => this.add(ai, b[i]));
    },
    multiply: function(a, scalar) {
        if (!Array.isArray(a)) return a * scalar;
        return a.map(ai => this.multiply(ai, scalar));
    },
    matmul: function(a, b) {
        const rowsA = a.length;
        const colsA = a[0].length;
        const colsB = b[0].length;

        const result = this.zeros([rowsA, colsB]);
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    },
    flatten: function(tensor) {
        if (!Array.isArray(tensor)) return [tensor];
        return tensor.flatMap(t => this.flatten(t));
    }
};
// SECTION 2: NEURAL NETWORK LAYERS

const PRISM_NN_LAYERS = {

    /**
     * Dense (Fully Connected) Layer with Adam optimizer
     */
    Dense: class {
        constructor(inputSize, outputSize, activation = 'relu') {
            this.inputSize = inputSize;
            this.outputSize = outputSize;
            this.activation = activation;

            // Xavier initialization
            const scale = Math.sqrt(2.0 / (inputSize + outputSize));
            this.weights = [];
            for (let i = 0; i < inputSize; i++) {
                this.weights[i] = [];
                for (let j = 0; j < outputSize; j++) {
                    this.weights[i][j] = (Math.random() - 0.5) * 2 * scale;
                }
            }
            this.biases = Array(outputSize).fill(0);

            // Adam optimizer state
            this.mW = PRISM_TENSOR.zeros([inputSize, outputSize]);
            this.vW = PRISM_TENSOR.zeros([inputSize, outputSize]);
            this.mB = Array(outputSize).fill(0);
            this.vB = Array(outputSize).fill(0);

            // Cache for backprop
            this.lastInput = null;
            this.lastOutput = null;
        }
        forward(input) {
            this.lastInput = [...input];

            // Linear transformation: y = Wx + b
            const preActivation = [];
            for (let j = 0; j < this.outputSize; j++) {
                let sum = this.biases[j];
                for (let i = 0; i < this.inputSize; i++) {
                    sum += input[i] * this.weights[i][j];
                }
                preActivation.push(sum);
            }
            // Apply activation
            this.lastOutput = this._activate(preActivation);
            return this.lastOutput;
        }
        _activate(x) {
            switch (this.activation) {
                case 'relu':
                    return x.map(v => Math.max(0, v));
                case 'sigmoid':
                    return x.map(v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
                case 'tanh':
                    return x.map(v => Math.tanh(v));
                case 'softmax':
                    const max = Math.max(...x);
                    const exps = x.map(v => Math.exp(v - max));
                    const sum = exps.reduce((a, b) => a + b, 0);
                    return exps.map(e => e / (sum + 1e-10));
                case 'linear':
                default:
                    return [...x];
            }
        }
        backward(gradOutput, learningRate = 0.001) {
            const input = this.lastInput;
            const output = this.lastOutput;

            // Gradient through activation
            let dPre;
            if (this.activation === 'softmax') {
                dPre = [...gradOutput];
            } else if (this.activation === 'relu') {
                dPre = gradOutput.map((g, i) => output[i] > 0 ? g : 0);
            } else if (this.activation === 'sigmoid') {
                dPre = gradOutput.map((g, i) => g * output[i] * (1 - output[i]));
            } else if (this.activation === 'tanh') {
                dPre = gradOutput.map((g, i) => g * (1 - output[i] * output[i]));
            } else {
                dPre = [...gradOutput];
            }
            // Clip gradients to prevent explosion
            const maxGrad = 5.0;
            dPre = dPre.map(g => Math.max(-maxGrad, Math.min(maxGrad, g)));

            // Gradient w.r.t input
            const gradInput = [];
            for (let i = 0; i < this.inputSize; i++) {
                let sum = 0;
                for (let j = 0; j < this.outputSize; j++) {
                    sum += this.weights[i][j] * dPre[j];
                }
                gradInput.push(sum);
            }
            // Update weights with Adam
            const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;

            for (let i = 0; i < this.inputSize; i++) {
                for (let j = 0; j < this.outputSize; j++) {
                    const grad = input[i] * dPre[j];
                    this.mW[i][j] = beta1 * this.mW[i][j] + (1 - beta1) * grad;
                    this.vW[i][j] = beta2 * this.vW[i][j] + (1 - beta2) * grad * grad;
                    this.weights[i][j] -= learningRate * this.mW[i][j] / (Math.sqrt(this.vW[i][j]) + eps);
                }
            }
            for (let j = 0; j < this.outputSize; j++) {
                const grad = dPre[j];
                this.mB[j] = beta1 * this.mB[j] + (1 - beta1) * grad;
                this.vB[j] = beta2 * this.vB[j] + (1 - beta2) * grad * grad;
                this.biases[j] -= learningRate * this.mB[j] / (Math.sqrt(this.vB[j]) + eps);
            }
            return gradInput;
        }
        getParams() {
            return {
                weights: PRISM_TENSOR.clone(this.weights),
                biases: [...this.biases]
            };
        }
        setParams(params) {
            this.weights = PRISM_TENSOR.clone(params.weights);
            this.biases = [...params.biases];
        }
    },
    /**
     * Dropout Layer for regularization
     */
    Dropout: class {
        constructor(rate = 0.5) {
            this.rate = rate;
            this.training = true;
            this.mask = null;
        }
        forward(input) {
            if (!this.training || this.rate === 0) return [...input];
            this.mask = input.map(() => Math.random() > this.rate ? 1 / (1 - this.rate) : 0);
            return input.map((x, i) => x * this.mask[i]);
        }
        backward(gradOutput, learningRate) {
            if (!this.training || this.rate === 0) return [...gradOutput];
            return gradOutput.map((g, i) => g * this.mask[i]);
        }
        setTraining(mode) { this.training = mode; }
    }
};
// SECTION 3: SEQUENTIAL NEURAL NETWORK MODEL

const PRISM_NEURAL_NETWORK = {

    Sequential: class {
        constructor(name = 'model') {
            this.name = name;
            this.layers = [];
            this.learningRate = 0.001;
            this.lossType = 'mse';
            this.history = { loss: [], accuracy: [] };
        }
        add(layer) {
            this.layers.push(layer);
            return this;
        }
        compile(options = {}) {
            this.learningRate = options.learningRate || 0.001;
            this.lossType = options.loss || 'mse';
        }
        forward(input) {
            let output = input;
            for (const layer of this.layers) {
                output = layer.forward(output);
            }
            return output;
        }
        predict(input) {
            this.layers.forEach(l => l.setTraining && l.setTraining(false));
            const output = this.forward(input);
            this.layers.forEach(l => l.setTraining && l.setTraining(true));
            return output;
        }
        _computeLoss(predicted, actual) {
            if (this.lossType === 'crossentropy' || this.lossType === 'softmax_crossentropy') {
                return -actual.reduce((sum, a, i) => sum + a * Math.log(predicted[i] + 1e-10), 0);
            } else if (this.lossType === 'bce') {
                return -actual.reduce((sum, a, i) =>
                    sum + a * Math.log(predicted[i] + 1e-10) + (1 - a) * Math.log(1 - predicted[i] + 1e-10), 0
                ) / actual.length;
            } else {
                return predicted.reduce((sum, p, i) => sum + (p - actual[i]) ** 2, 0) / predicted.length;
            }
        }
        _computeLossGradient(predicted, actual) {
            if (this.lossType === 'crossentropy' || this.lossType === 'softmax_crossentropy') {
                return predicted.map((p, i) => p - actual[i]);
            } else if (this.lossType === 'bce') {
                return predicted.map((p, i) =>
                    (-actual[i] / (p + 1e-10) + (1 - actual[i]) / (1 - p + 1e-10)) / actual.length
                );
            } else {
                return predicted.map((p, i) => 2 * (p - actual[i]) / predicted.length);
            }
        }
        fit(X, y, options = {}) {
            const epochs = options.epochs || 100;
            const verbose = options.verbose !== false;

            for (let epoch = 0; epoch < epochs; epoch++) {
                let epochLoss = 0;
                let correct = 0;

                // Shuffle indices
                const indices = [...Array(X.length).keys()];
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                // Train on each sample
                for (const idx of indices) {
                    const input = X[idx];
                    const target = y[idx];

                    const output = this.forward(input);
                    const loss = this._computeLoss(output, target);
                    epochLoss += loss;

                    const predClass = output.indexOf(Math.max(...output));
                    const actualClass = target.indexOf(Math.max(...target));
                    if (predClass === actualClass) correct++;

                    let grad = this._computeLossGradient(output, target);
                    for (let i = this.layers.length - 1; i >= 0; i--) {
                        grad = this.layers[i].backward(grad, this.learningRate);
                    }
                }
                const avgLoss = epochLoss / X.length;
                const accuracy = correct / X.length;

                this.history.loss.push(avgLoss);
                this.history.accuracy.push(accuracy);

                if (verbose && (epoch % Math.max(1, Math.floor(epochs / 10)) === 0 || epoch === epochs - 1)) {
                    console.log(`[${this.name}] Epoch ${epoch + 1}/${epochs} - Loss: ${avgLoss.toFixed(6)} - Acc: ${(accuracy * 100).toFixed(1)}%`);
                }
            }
            return this.history;
        }
        summary() {
            console.log(`Model: ${this.name}`);
            this.layers.forEach((l, i) => {
                const params = l.weights ? l.inputSize * l.outputSize + l.outputSize : 0;
                console.log(`  Layer ${i}: ${l.constructor.name} (${params} params)`);
            });
        }
    }
};
// SECTION 4: PRETRAINED MANUFACTURING MODELS

const PRISM_PRETRAINED_MODELS = {

    toolWearPredictor: null,
    surfaceFinishPredictor: null,
    cycleTimePredictor: null,
    chatterPredictor: null,

    /**
     * Tool Wear Predictor - 6 inputs → 4 wear states
     */
    createToolWearModel: function() {
        console.log('[PRISM AI] Training Tool Wear Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('ToolWearPredictor');
        model.add(new PRISM_NN_LAYERS.Dense(6, 16, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(16, 8, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(8, 4, 'softmax'));
        model.compile({ loss: 'crossentropy', learningRate: 0.01 });

        const { X, y } = this._generateToolWearData(500);
        model.fit(X, y, { epochs: 30, verbose: false });

        this.toolWearPredictor = model;
        console.log('[PRISM AI] Tool Wear Predictor ready');
        return model;
    },
    _generateToolWearData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const speed = Math.random();
            const feed = Math.random();
            const doc = Math.random();
            const time = Math.random();
            const vibration = Math.random();
            const temp = Math.random();

            X.push([speed, feed, doc, time, vibration, temp]);

            const wearScore = speed * 0.25 + feed * 0.2 + doc * 0.1 + time * 0.3 + vibration * 0.1 + temp * 0.05;

            if (wearScore < 0.25) y.push([1, 0, 0, 0]);
            else if (wearScore < 0.45) y.push([0, 1, 0, 0]);
            else if (wearScore < 0.65) y.push([0, 0, 1, 0]);
            else y.push([0, 0, 0, 1]);
        }
        return { X, y };
    },
    /**
     * Surface Finish Predictor - 5 inputs → Ra value
     */
    createSurfaceFinishModel: function() {
        console.log('[PRISM AI] Training Surface Finish Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('SurfaceFinishPredictor');
        model.add(new PRISM_NN_LAYERS.Dense(5, 12, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(12, 1, 'linear'));
        model.compile({ loss: 'mse', learningRate: 0.005 });

        const { X, y } = this._generateSurfaceData(400);
        model.fit(X, y, { epochs: 50, verbose: false });

        this.surfaceFinishPredictor = model;
        console.log('[PRISM AI] Surface Finish Predictor ready');
        return model;
    },
    _generateSurfaceData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const feed = 0.1 + Math.random() * 0.4;
            const speed = Math.random();
            const toolRadius = 0.5 + Math.random() * 4;
            const hardness = Math.random();
            const coolant = Math.random();

            X.push([feed, speed, toolRadius / 5, hardness, coolant]);
            const Ra = (feed * feed * 1000) / (32 * toolRadius) * (1 + 0.1 * (1 - coolant));
            y.push([Ra / 5]);
        }
        return { X, y };
    },
    /**
     * Cycle Time Predictor - 5 inputs → time estimate
     */
    createCycleTimeModel: function() {
        console.log('[PRISM AI] Training Cycle Time Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('CycleTimePredictor');
        model.add(new PRISM_NN_LAYERS.Dense(5, 16, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(16, 1, 'linear'));
        model.compile({ loss: 'mse', learningRate: 0.005 });

        const { X, y } = this._generateCycleTimeData(400);
        model.fit(X, y, { epochs: 50, verbose: false });

        this.cycleTimePredictor = model;
        console.log('[PRISM AI] Cycle Time Predictor ready');
        return model;
    },
    _generateCycleTimeData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const volume = Math.random();
            const mrr = 0.1 + Math.random() * 0.9;
            const numOps = Math.random();
            const numTools = Math.random();
            const complexity = Math.random();

            X.push([volume, mrr, numOps, numTools, complexity]);
            const time = (volume / mrr) * 10 + numTools * 0.5 + complexity * 5;
            y.push([time / 20]);
        }
        return { X, y };
    },
    /**
     * Chatter Predictor - 4 inputs → stability prediction
     */
    createChatterModel: function() {
        console.log('[PRISM AI] Training Chatter Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('ChatterPredictor');
        model.add(new PRISM_NN_LAYERS.Dense(4, 12, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(12, 2, 'softmax'));
        model.compile({ loss: 'crossentropy', learningRate: 0.01 });

        const { X, y } = this._generateChatterData(400);
        model.fit(X, y, { epochs: 40, verbose: false });

        this.chatterPredictor = model;
        console.log('[PRISM AI] Chatter Predictor ready');
        return model;
    },
    _generateChatterData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const rpm = Math.random();
            const doc = Math.random();
            const toolStickout = Math.random();
            const materialHardness = Math.random();

            X.push([rpm, doc, toolStickout, materialHardness]);

            // Simplified stability lobe logic
            const instabilityScore = doc * 0.4 + toolStickout * 0.3 + materialHardness * 0.2 +
                                    Math.abs(Math.sin(rpm * 10)) * 0.1;

            if (instabilityScore > 0.5) y.push([0, 1]); // Unstable
            else y.push([1, 0]); // Stable
        }
        return { X, y };
    },
    initializeAll: function() {
        this.createToolWearModel();
        this.createSurfaceFinishModel();
        this.createCycleTimeModel();
        this.createChatterModel();
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM AI] All pretrained models initialized');
    }
};
// SECTION 5: CLAUDE API INTEGRATION WITH COMPREHENSIVE SYSTEM PROMPT

const PRISM_CLAUDE_API = {

    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    apiKey: null,

    // COMPREHENSIVE MANUFACTURING SYSTEM PROMPT
    systemPrompt: `You are PRISM AI, an expert manufacturing intelligence system integrated into the PRISM CAD/CAM platform. You are the smartest, most capable manufacturing AI assistant ever created, with deep expertise spanning:

## CORE EXPERTISE DOMAINS

### 1. CNC MACHINING & CUTTING SCIENCE
- **Milling**: 3-axis, 4-axis, 5-axis simultaneous, mill-turn
- **Turning**: OD/ID turning, threading, grooving, boring
- **Cutting Physics**: Chip formation, cutting forces, heat generation, tool deflection
- **Stability**: Chatter prediction, stability lobe diagrams, regenerative vibration
- **Tool Engagement**: Radial/axial engagement, chip thinning, effective diameter

### 2. CUTTING PARAMETERS EXPERTISE
- **Speed & Feed Calculations**: Surface speed (Vc), feed per tooth (fz), chip load
- **Material Removal Rate**: MRR = ae × ap × Vf optimization
- **Depth of Cut**: Axial (ap), radial (ae), effective engagement
- **Parameter Limits**: Machine capability, tool capability, workholding rigidity
- **Optimization Goals**: Tool life, surface finish, cycle time, cost per part

### 3. TOOL KNOWLEDGE
- **End Mills**: Flat, ball nose, bull nose, corner radius, high-feed
- **Inserts**: CNMG, DNMG, WNMG, VCMT, threading, grooving
- **Tool Materials**: Carbide grades (P/M/K/N/S/H), HSS, ceramic, CBN, PCD
- **Coatings**: TiN, TiCN, TiAlN, AlTiN, AlCrN, diamond
- **Tool Life**: Taylor equation, wear mechanisms, failure modes

### 4. MATERIALS SCIENCE FOR MACHINING
- **Steels**: Carbon, alloy, stainless (304, 316, 17-4PH), tool steels
- **Aluminum**: 6061-T6, 7075-T6, 2024, cast alloys
- **Titanium**: Ti-6Al-4V, commercially pure grades
- **Superalloys**: Inconel 718, Hastelloy, Waspaloy
- **Plastics**: Delrin, PEEK, Nylon, UHMW
- **Material Properties**: Hardness, machinability rating, thermal conductivity

### 5. CAM & TOOLPATH STRATEGIES
- **Roughing**: Adaptive clearing, trochoidal, plunge roughing, wave form
- **Finishing**: Parallel, spiral, scallop, pencil, rest machining
- **Pocketing**: True spiral, zigzag, climb vs conventional
- **Drilling**: Peck drilling, chip breaking, through-coolant
- **3+2 Positioning**: Workpiece orientation, fixture setup
- **5-Axis Simultaneous**: Swarf cutting, flow line, tool axis control

### 6. G-CODE & POST PROCESSING
- **Standard Codes**: G0, G1, G2/G3, G17/18/19, G40/41/42, G43, G54-59
- **Canned Cycles**: G81-89, G73, G76 (threading)
- **Controller Specifics**: Fanuc, Siemens, Haas, Mazak, Okuma, Heidenhain
- **Post Customization**: Modal vs non-modal, safe positioning, coolant codes

### 7. MACHINE TOOL DYNAMICS
- **Spindle Types**: Direct drive, belt drive, gear drive, motorized
- **Axis Configuration**: C-frame, gantry, trunnion, articulating head
- **Kinematics**: Table-table, head-head, head-table, singularities
- **Accuracy**: Positioning, repeatability, thermal compensation

### 8. QUALITY & INSPECTION
- **Tolerances**: Dimensional, geometric (GD&T), surface finish
- **Measurement**: CMM, surface profilometry, roundness testing
- **Surface Finish**: Ra, Rz, Rt parameters and their meaning
- **Process Capability**: Cp, Cpk, statistical process control

## CALCULATION FORMULAS

### Milling Formulas
- RPM = (Vc × 1000) / (π × D)  [where Vc in m/min, D in mm]
- Feed Rate (mm/min) = RPM × fz × z  [z = number of teeth]
- MRR = ae × ap × Vf / 1000  [cm³/min]
- Chip Thinning: hm = fz × sin(arccos(1 - 2×ae/D))
- Surface Finish Ra ≈ fz² / (32 × r)  [r = corner radius]

### Turning Formulas
- RPM = (Vc × 1000) / (π × D)
- Feed Rate = RPM × f  [f = feed per revolution]
- MRR = Vc × f × ap  [cm³/min]

### Power Calculations
- Cutting Power (kW) = (Kc × MRR) / (60 × 10⁶ × η)
- Kc = Specific cutting force (N/mm²)
- η = Machine efficiency (typically 0.7-0.85)

## RESPONSE GUIDELINES

1. **Be Specific**: Give actual numbers, not vague suggestions
2. **Show Your Work**: Explain calculations step-by-step
3. **Safety First**: Never recommend parameters that could damage tools, machine, or endanger operator
4. **Consider Context**: Account for machine rigidity, workholding, tool condition
5. **Provide Alternatives**: Offer conservative and aggressive options when appropriate
6. **Cite Standards**: Reference ISO, ANSI standards when relevant
7. **Acknowledge Uncertainty**: If you're not sure, say so and explain why

## CURRENT PRISM SYSTEM CONTEXT

PRISM has the following capabilities available:
- Material database with 618+ materials and cutting parameters
- Machine database with 813+ machines from 61 manufacturers
- Tool database with comprehensive insert and end mill data
- Real-time neural network predictions for tool wear, surface finish, cycle time
- Advanced optimization algorithms (PSO, ACO, Genetic, Monte Carlo)
- Full CAD/CAM toolpath generation and simulation

When the user provides context about their material, tool, machine, or operation, incorporate that specific information into your recommendations.`,

    /**
     * Set API key for Claude
     */
    setApiKey: function(key) {
        this.apiKey = key;
        console.log('[PRISM AI] Claude API configured');
    },
    /**
     * Check if API is available
     */
    isAvailable: function() {
        return !!this.apiKey;
    },
    /**
     * Query Claude with manufacturing context
     */
    query: async function(userMessage, context = {}) {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'Claude API key not configured. Set it with PRISM_CLAUDE_API.setApiKey("your-key")',
                fallback: this._generateLocalResponse(userMessage, context)
            };
        }
        // Build context string
        let contextStr = '';
        if (context.material) {
            contextStr += `\n**Material**: ${typeof context.material === 'object' ?
                `${context.material.name || context.material.id} (${context.material.type || ''})` :
                context.material}`;
        }
        if (context.tool) {
            contextStr += `\n**Tool**: ${typeof context.tool === 'object' ?
                `${context.tool.type || ''} Ø${context.tool.diameter || '?'}mm, ${context.tool.teeth || '?'} flutes` :
                context.tool}`;
        }
        if (context.machine) {
            contextStr += `\n**Machine**: ${typeof context.machine === 'object' ?
                `${context.machine.manufacturer || ''} ${context.machine.model || ''} (${context.machine.type || ''})` :
                context.machine}`;
        }
        if (context.operation) {
            contextStr += `\n**Operation**: ${context.operation}`;
        }
        if (context.currentParams) {
            contextStr += `\n**Current Parameters**: RPM=${context.currentParams.rpm || '?'}, ` +
                         `Feed=${context.currentParams.feedRate || '?'} mm/min, ` +
                         `DOC=${context.currentParams.doc || '?'}mm`;
        }
        if (context.requirements) {
            contextStr += `\n**Requirements**: ${context.requirements}`;
        }
        const fullMessage = contextStr ?
            `[PRISM CONTEXT]${contextStr}\n\n[USER QUESTION]\n${userMessage}` :
            userMessage;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 4096,
                    system: this.systemPrompt,
                    messages: [{ role: 'user', content: fullMessage }]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            return {
                success: true,
                response: data.content[0].text,
                model: this.model,
                usage: data.usage,
                source: 'claude'
            };
        } catch (error) {
            console.error('[PRISM AI] Claude API error:', error);
            return {
                success: false,
                error: error.message,
                fallback: this._generateLocalResponse(userMessage, context),
                source: 'fallback'
            };
        }
    },
    /**
     * Generate local response when API unavailable
     */
    _generateLocalResponse: function(query, context = {}) {
        const lower = query.toLowerCase();

        // Speed & Feed questions
        if (lower.includes('speed') || lower.includes('feed') || lower.includes('rpm')) {
            if (context.material && context.tool) {
                const Vc = this._getBaseSurfaceSpeed(context.material);
                const D = context.tool.diameter || 10;
                const z = context.tool.teeth || 4;
                const fz = this._getBaseFeedPerTooth(context.material, D);

                const rpm = Math.round((Vc * 1000) / (Math.PI * D));
                const feedRate = Math.round(rpm * fz * z);

                return `Based on your setup:\n\n` +
                       `**Recommended Parameters:**\n` +
                       `• Spindle Speed: ${rpm} RPM (Vc = ${Vc} m/min)\n` +
                       `• Feed Rate: ${feedRate} mm/min (fz = ${fz} mm/tooth)\n` +
                       `• Suggested DOC: ${(D * 0.5).toFixed(1)}mm (50% of tool diameter)\n` +
                       `• Suggested Stepover: ${(D * 0.4).toFixed(1)}mm (40% for roughing)\n\n` +
                       `*These are starting values - adjust based on machine rigidity and actual conditions.*`;
            }
            return "I can calculate optimal speeds and feeds. Please provide:\n" +
                   "• Material (e.g., '6061 aluminum', '304 stainless')\n" +
                   "• Tool (e.g., '10mm 4-flute carbide end mill')\n" +
                   "• Operation type (roughing/finishing)";
        }
        // Tool wear questions
        if (lower.includes('tool') && (lower.includes('wear') || lower.includes('life'))) {
            return "Tool wear is influenced by several factors:\n\n" +
                   "**Key Factors:**\n" +
                   "• Cutting speed (higher = faster wear)\n" +
                   "• Feed rate and chip load\n" +
                   "• Depth of cut\n" +
                   "• Material hardness and abrasiveness\n" +
                   "• Coolant application\n\n" +
                   "PRISM uses neural networks to predict tool wear. Check the Tool Life panel for real-time predictions based on your cutting data.";
        }
        // Chatter questions
        if (lower.includes('chatter') || lower.includes('vibration')) {
            return "Chatter occurs when cutting forces excite natural frequencies of the system.\n\n" +
                   "**Solutions:**\n" +
                   "1. Adjust spindle speed to find 'stable pockets' (stability lobe diagram)\n" +
                   "2. Reduce depth of cut (most effective)\n" +
                   "3. Reduce tool stickout\n" +
                   "4. Increase tool rigidity (larger diameter, shorter length)\n" +
                   "5. Check workholding rigidity\n" +
                   "6. Consider variable helix/pitch tools\n\n" +
                   "Would you like me to run a stability analysis?";
        }
        // Surface finish questions
        if (lower.includes('surface') || lower.includes('finish') || lower.includes('roughness')) {
            return "Surface finish (Ra) is primarily controlled by:\n\n" +
                   "**Ra ≈ fz² / (32 × r)** where:\n" +
                   "• fz = feed per tooth\n" +
                   "• r = tool corner radius\n\n" +
                   "**To improve surface finish:**\n" +
                   "1. Reduce feed per tooth\n" +
                   "2. Use larger corner radius\n" +
                   "3. Increase spindle speed (within limits)\n" +
                   "4. Use finishing-specific toolpaths\n" +
                   "5. Ensure adequate coolant coverage";
        }
        // Material questions
        if (lower.includes('material') || lower.includes('aluminum') || lower.includes('steel') || lower.includes('titanium')) {
            return "PRISM has comprehensive material data for 618+ materials.\n\n" +
                   "**Key Material Categories:**\n" +
                   "• Steels (carbon, alloy, stainless, tool)\n" +
                   "• Aluminum alloys (6061, 7075, 2024, cast)\n" +
                   "• Titanium (Ti-6Al-4V, CP grades)\n" +
                   "• Superalloys (Inconel, Hastelloy)\n" +
                   "• Plastics (Delrin, PEEK, Nylon)\n\n" +
                   "What material are you working with?";
        }
        // Default response
        return "I'm PRISM AI, your manufacturing intelligence assistant. I can help with:\n\n" +
               "• **Speeds & Feeds** - Optimal cutting parameters\n" +
               "• **Tool Selection** - Right tool for the job\n" +
               "• **Troubleshooting** - Chatter, tool wear, surface finish issues\n" +
               "• **Strategy Selection** - Best toolpath approach\n" +
               "• **G-code Help** - Programming assistance\n\n" +
               "What would you like help with?";
    },
    /**
     * Get base surface speed for material
     */
    _getBaseSurfaceSpeed: function(material) {
        const mat = typeof material === 'string' ? material.toLowerCase() :
                   (material.name || material.type || '').toLowerCase();

        if (mat.includes('aluminum') || mat.includes('6061') || mat.includes('7075')) return 300;
        if (mat.includes('brass') || mat.includes('bronze')) return 200;
        if (mat.includes('plastic') || mat.includes('delrin')) return 250;
        if (mat.includes('cast iron')) return 80;
        if (mat.includes('stainless') || mat.includes('304') || mat.includes('316')) return 60;
        if (mat.includes('titanium') || mat.includes('ti-6al-4v')) return 45;
        if (mat.includes('inconel') || mat.includes('hastelloy')) return 25;
        if (mat.includes('steel') || mat.includes('1018') || mat.includes('4140')) return 120;

        return 100; // Default
    },
    /**
     * Get base feed per tooth for material
     */
    _getBaseFeedPerTooth: function(material, diameter) {
        const mat = typeof material === 'string' ? material.toLowerCase() :
                   (material.name || material.type || '').toLowerCase();

        let baseFz = 0.1;

        if (mat.includes('aluminum')) baseFz = 0.15;
        else if (mat.includes('plastic')) baseFz = 0.2;
        else if (mat.includes('stainless')) baseFz = 0.08;
        else if (mat.includes('titanium')) baseFz = 0.06;
        else if (mat.includes('inconel')) baseFz = 0.04;
        else if (mat.includes('steel')) baseFz = 0.1;

        // Scale with tool diameter
        if (diameter < 6) baseFz *= 0.7;
        else if (diameter > 16) baseFz *= 1.2;

        return Math.round(baseFz * 1000) / 1000;
    }
};
// SECTION 6: BACKGROUND ORCHESTRATOR

const PRISM_AI_BACKGROUND_ORCHESTRATOR = {

    isRunning: false,
    userActions: [],
    suggestions: [],
    interventionThreshold: 0.7,

    patterns: {
        repeatedErrors: [],
        frequentActions: {},
        parameterChanges: []
    },
    start: function() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[PRISM AI Orchestrator] Background monitoring started');
    },
    stop: function() {
        this.isRunning = false;
        console.log('[PRISM AI Orchestrator] Stopped');
    },
    recordAction: function(action) {
        const entry = {
            type: action.type,
            data: action.data,
            timestamp: Date.now(),
            context: action.context || {}
        };
        this.userActions.push(entry);

        if (this.userActions.length > 500) {
            this.userActions = this.userActions.slice(-500);
        }
        this.patterns.frequentActions[action.type] =
            (this.patterns.frequentActions[action.type] || 0) + 1;

        this._analyzeForHelp(entry);
    },
    recordError: function(error) {
        this.patterns.repeatedErrors.push({
            message: error.message,
            context: error.context,
            timestamp: Date.now()
        });

        if (this.patterns.repeatedErrors.length > 50) {
            this.patterns.repeatedErrors = this.patterns.repeatedErrors.slice(-50);
        }
        this._checkRepeatedErrors();
    },
    _analyzeForHelp: function(entry) {
        // Track parameter changes
        if (entry.type === 'parameter_change') {
            this.patterns.parameterChanges.push(entry);
            if (this.patterns.parameterChanges.length > 20) {
                this.patterns.parameterChanges = this.patterns.parameterChanges.slice(-20);
            }
            // Check for repeated same parameter changes
            const recentSame = this.patterns.parameterChanges.filter(e =>
                e.data?.parameter === entry.data?.parameter &&
                Date.now() - e.timestamp < 60000
            );

            if (recentSame.length >= 3) {
                this._addSuggestion({
                    type: 'parameter_struggling',
                    parameter: entry.data?.parameter,
                    attempts: recentSame.length,
                    message: `I noticed you've adjusted ${entry.data?.parameter} ${recentSame.length} times. Would you like me to suggest an optimal value?`,
                    confidence: 0.8
                });
            }
        }
        // Check for out-of-range values
        if (entry.data?.value !== undefined) {
            const outOfRange = this._checkParameterRange(entry.data.parameter, entry.data.value);
            if (outOfRange) {
                this._addSuggestion({
                    type: 'out_of_range',
                    parameter: entry.data.parameter,
                    value: entry.data.value,
                    typical: outOfRange.typical,
                    message: `The ${entry.data.parameter} value (${entry.data.value}) seems ${outOfRange.direction} typical range (${outOfRange.typical}). ${outOfRange.suggestion}`,
                    confidence: 0.85
                });
            }
        }
    },
    _checkParameterRange: function(parameter, value) {
        const ranges = {
            'spindle_speed': { min: 100, max: 20000, unit: 'RPM' },
            'rpm': { min: 100, max: 20000, unit: 'RPM' },
            'feed_rate': { min: 10, max: 10000, unit: 'mm/min' },
            'feedRate': { min: 10, max: 10000, unit: 'mm/min' },
            'depth_of_cut': { min: 0.1, max: 25, unit: 'mm' },
            'doc': { min: 0.1, max: 25, unit: 'mm' },
            'stepover': { min: 5, max: 90, unit: '%' },
            'ae': { min: 0.5, max: 25, unit: 'mm' }
        };
        const range = ranges[parameter];
        if (!range) return null;

        if (value < range.min * 0.5) {
            return {
                direction: 'below',
                typical: `${range.min}-${range.max} ${range.unit}`,
                suggestion: 'This may result in poor efficiency or tool rubbing.'
            };
        }
        if (value > range.max * 1.5) {
            return {
                direction: 'above',
                typical: `${range.min}-${range.max} ${range.unit}`,
                suggestion: 'This may cause tool damage, poor surface finish, or machine issues.'
            };
        }
        return null;
    },
    _checkRepeatedErrors: function() {
        const recentErrors = this.patterns.repeatedErrors.filter(e =>
            Date.now() - e.timestamp < 120000
        );

        const errorCounts = {};
        recentErrors.forEach(e => {
            errorCounts[e.message] = (errorCounts[e.message] || 0) + 1;
        });

        for (const [error, count] of Object.entries(errorCounts)) {
            if (count >= 3) {
                this._addSuggestion({
                    type: 'repeated_error',
                    error: error,
                    count: count,
                    message: `I've noticed "${error}" occurring ${count} times. Would you like help resolving this?`,
                    confidence: 0.85
                });
            }
        }
    },
    _addSuggestion: function(suggestion) {
        if (suggestion.confidence < this.interventionThreshold) return;

        // Check for duplicate
        const duplicate = this.suggestions.find(s =>
            s.type === suggestion.type &&
            s.parameter === suggestion.parameter &&
            !s.dismissed &&
            Date.now() - s.timestamp < 60000
        );
        if (duplicate) return;

        const entry = {
            id: Date.now() + Math.random(),
            ...suggestion,
            timestamp: Date.now(),
            shown: false,
            dismissed: false
        };
        this.suggestions.push(entry);

        // Publish event
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('ai:suggestion', entry);
        }
        console.log('[PRISM AI] Suggestion:', suggestion.message);
    },
    getPendingSuggestions: function() {
        return this.suggestions.filter(s => !s.shown && !s.dismissed);
    },
    markSuggestionShown: function(id) {
        const s = this.suggestions.find(s => s.id === id);
        if (s) s.shown = true;
    },
    dismissSuggestion: function(id) {
        const s = this.suggestions.find(s => s.id === id);
        if (s) s.dismissed = true;
    },
    setHelpLevel: function(level) {
        switch (level) {
            case 'minimal': this.interventionThreshold = 0.95; break;
            case 'moderate': this.interventionThreshold = 0.7; break;
            case 'proactive': this.interventionThreshold = 0.5; break;
        }
        console.log(`[PRISM AI Orchestrator] Help level set to: ${level}`);
    }
};
// SECTION 7: CONVERSATIONAL CHAT INTERFACE

const PRISM_AI_CHAT_INTERFACE = {

    conversations: new Map(),
    activeConversation: null,

    createConversation: function() {
        const id = `conv_${Date.now()}`;
        this.conversations.set(id, {
            id,
            messages: [],
            context: {},
            created: Date.now()
        });
        this.activeConversation = id;
        return id;
    },
    sendMessage: async function(message, conversationId = null) {
        const convId = conversationId || this.activeConversation || this.createConversation();
        const conversation = this.conversations.get(convId);

        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: Date.now()
        });

        // Try Claude first, fall back to local
        let response;
        if (PRISM_CLAUDE_API.isAvailable()) {
            const result = await PRISM_CLAUDE_API.query(message, conversation.context);
            response = result.success ?
                { text: result.response, source: 'claude' } :
                { text: result.fallback, source: 'local' };
        } else {
            response = {
                text: PRISM_CLAUDE_API._generateLocalResponse(message, conversation.context),
                source: 'local'
            };
        }
        conversation.messages.push({
            role: 'assistant',
            content: response.text,
            source: response.source,
            timestamp: Date.now()
        });

        return response;
    },
    setContext: function(context, conversationId = null) {
        const convId = conversationId || this.activeConversation;
        if (!convId) return;

        const conv = this.conversations.get(convId);
        if (conv) {
            conv.context = { ...conv.context, ...context };
        }
    },
    getHistory: function(conversationId = null) {
        const convId = conversationId || this.activeConversation;
        if (!convId) return [];

        const conv = this.conversations.get(convId);
        return conv ? conv.messages : [];
    },
    clearConversation: function(conversationId = null) {
        const convId = conversationId || this.activeConversation;
        if (convId) {
            this.conversations.delete(convId);
            if (this.activeConversation === convId) {
                this.activeConversation = null;
            }
        }
    }
};
// SECTION 8: CONTINUOUS LEARNING ENGINE

const PRISM_LEARNING_ENGINE = {

    data: {
        outcomes: [],
        corrections: [],
        feedback: [],
        successfulConfigs: []
    },
    recordOutcome: function(params, outcome) {
        this.data.outcomes.push({
            params,
            outcome,
            timestamp: Date.now()
        });

        if (this.data.outcomes.length > 5000) {
            this.data.outcomes = this.data.outcomes.slice(-5000);
        }
        // Trigger model update if enough new data
        if (this.data.outcomes.length % 100 === 0) {
            this._updateModels();
        }
    },
    recordCorrection: function(suggestion, correction) {
        this.data.corrections.push({
            suggestion,
            correction,
            timestamp: Date.now()
        });

        // Store as successful config
        this.data.successfulConfigs.push({
            config: correction,
            validated: true,
            timestamp: Date.now()
        });
    },
    recordFeedback: function(itemId, rating, comment = '') {
        this.data.feedback.push({
            itemId,
            rating,
            comment,
            timestamp: Date.now()
        });
    },
    _updateModels: function() {
        console.log('[PRISM Learning] Model update triggered with', this.data.outcomes.length, 'outcomes');
        // Would fine-tune pretrained models here
    },
    getStats: function() {
        return {
            outcomes: this.data.outcomes.length,
            corrections: this.data.corrections.length,
            feedback: this.data.feedback.length,
            successfulConfigs: this.data.successfulConfigs.length
        };
    },
    exportData: function() {
        return JSON.stringify(this.data);
    },
    importData: function(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.data = { ...this.data, ...data };
            console.log('[PRISM Learning] Imported learning data');
            return true;
        } catch (e) {
            console.error('[PRISM Learning] Import failed:', e);
            return false;
        }
    }
};
// SECTION 9: MAIN TRUE AI SYSTEM COORDINATOR

// PRISM AI COMPLETE SYSTEM v2.0 - INTEGRATED 2026-01-15
// Full Neural Network Suite: CNN, LSTM, GRU, Attention, BatchNorm, LayerNorm
// NLP Pipeline: Tokenization, Embeddings, Intent Classification
// Bayesian Learning: Gaussian Process, Bayesian Optimization, Thompson Sampling
// Optimization: Simulated Annealing, Differential Evolution, CMA-ES
// Model Serialization, Online Learning, A/B Testing Framework

//   11. A/B testing framework
//   12. Full CAM engine integration
// Knowledge Sources:
//   - MIT 6.036 Introduction to Machine Learning
//   - Stanford CS231N Convolutional Neural Networks
//   - Stanford CS224N Natural Language Processing
//   - CMU 11-785 Deep Learning
//   - MIT 6.867 Machine Learning

console.log('[PRISM AI COMPLETE] Loading AI Complete System v2.0...');

// SECTION 1: ENHANCED TENSOR OPERATIONS

const PRISM_TENSOR_ENHANCED = {

    // Inherit from base if exists
    ...((typeof PRISM_TENSOR !== 'undefined') ? PRISM_TENSOR : {}),

    zeros: function(shape) {
        if (shape.length === 1) return Array(shape[0]).fill(0);
        return Array(shape[0]).fill(null).map(() => this.zeros(shape.slice(1)));
    },
    ones: function(shape) {
        if (shape.length === 1) return Array(shape[0]).fill(1);
        return Array(shape[0]).fill(null).map(() => this.ones(shape.slice(1)));
    },
    random: function(shape, scale = 0.1) {
        if (shape.length === 1) {
            return Array(shape[0]).fill(null).map(() => (Math.random() - 0.5) * 2 * scale);
        }
        return Array(shape[0]).fill(null).map(() => this.random(shape.slice(1), scale));
    },
    randomNormal: function(shape, mean = 0, std = 1) {
        const boxMuller = () => {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        };
        if (shape.length === 1) {
            return Array(shape[0]).fill(null).map(() => mean + std * boxMuller());
        }
        return Array(shape[0]).fill(null).map(() => this.randomNormal(shape.slice(1), mean, std));
    },
    shape: function(tensor) {
        const shape = [];
        let current = tensor;
        while (Array.isArray(current)) {
            shape.push(current.length);
            current = current[0];
        }
        return shape;
    },
    reshape: function(tensor, newShape) {
        const flat = this.flatten(tensor);
        return this._unflatten(flat, newShape);
    },
    _unflatten: function(flat, shape) {
        if (shape.length === 1) {
            return flat.slice(0, shape[0]);
        }
        const size = shape.slice(1).reduce((a, b) => a * b, 1);
        const result = [];
        for (let i = 0; i < shape[0]; i++) {
            result.push(this._unflatten(flat.slice(i * size, (i + 1) * size), shape.slice(1)));
        }
        return result;
    },
    transpose: function(matrix) {
        if (!Array.isArray(matrix[0])) return matrix;
        const rows = matrix.length;
        const cols = matrix[0].length;
        const result = this.zeros([cols, rows]);
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[j][i] = matrix[i][j];
            }
        }
        return result;
    },
    flatten: function(tensor) {
        if (!Array.isArray(tensor)) return [tensor];
        return tensor.flatMap(t => this.flatten(t));
    },
    clone: function(tensor) {
        if (!Array.isArray(tensor)) return tensor;
        return tensor.map(t => this.clone(t));
    },
    add: function(a, b) {
        if (!Array.isArray(a)) return a + b;
        return a.map((ai, i) => this.add(ai, Array.isArray(b) ? b[i] : b));
    },
    subtract: function(a, b) {
        if (!Array.isArray(a)) return a - b;
        return a.map((ai, i) => this.subtract(ai, Array.isArray(b) ? b[i] : b));
    },
    multiply: function(a, b) {
        if (!Array.isArray(a)) return a * (Array.isArray(b) ? b : b);
        if (!Array.isArray(b)) return a.map(ai => this.multiply(ai, b));
        return a.map((ai, i) => this.multiply(ai, b[i]));
    },
    divide: function(a, b) {
        if (!Array.isArray(a)) return a / b;
        if (!Array.isArray(b)) return a.map(ai => this.divide(ai, b));
        return a.map((ai, i) => this.divide(ai, b[i]));
    },
    matmul: function(a, b) {
        const rowsA = a.length;
        const colsA = a[0].length;
        const colsB = b[0].length;

        const result = this.zeros([rowsA, colsB]);
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    },
    dot: function(a, b) {
        if (!Array.isArray(a)) return a * b;
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    sum: function(tensor, axis = null) {
        if (axis === null) {
            return this.flatten(tensor).reduce((a, b) => a + b, 0);
        }
        // Sum along specific axis
        if (axis === 0) {
            const result = this.zeros([tensor[0].length]);
            for (let i = 0; i < tensor.length; i++) {
                for (let j = 0; j < tensor[0].length; j++) {
                    result[j] += tensor[i][j];
                }
            }
            return result;
        }
        return tensor.map(row => row.reduce((a, b) => a + b, 0));
    },
    mean: function(tensor, axis = null) {
        if (axis === null) {
            const flat = this.flatten(tensor);
            return flat.reduce((a, b) => a + b, 0) / flat.length;
        }
        const s = this.sum(tensor, axis);
        const n = axis === 0 ? tensor.length : tensor[0].length;
        return Array.isArray(s) ? s.map(x => x / n) : s / n;
    },
    variance: function(tensor, axis = null) {
        const m = this.mean(tensor, axis);
        if (axis === null) {
            const flat = this.flatten(tensor);
            return flat.reduce((s, x) => s + Math.pow(x - m, 2), 0) / flat.length;
        }
        // Variance along axis
        if (axis === 0) {
            const result = this.zeros([tensor[0].length]);
            for (let j = 0; j < tensor[0].length; j++) {
                for (let i = 0; i < tensor.length; i++) {
                    result[j] += Math.pow(tensor[i][j] - m[j], 2);
                }
                result[j] /= tensor.length;
            }
            return result;
        }
        return tensor.map((row, i) => {
            const rowMean = Array.isArray(m) ? m[i] : m;
            return row.reduce((s, x) => s + Math.pow(x - rowMean, 2), 0) / row.length;
        });
    },
    sqrt: function(tensor) {
        if (!Array.isArray(tensor)) return Math.sqrt(Math.max(0, tensor));
        return tensor.map(t => this.sqrt(t));
    },
    exp: function(tensor) {
        if (!Array.isArray(tensor)) return Math.exp(Math.min(500, tensor));
        return tensor.map(t => this.exp(t));
    },
    log: function(tensor) {
        if (!Array.isArray(tensor)) return Math.log(Math.max(1e-15, tensor));
        return tensor.map(t => this.log(t));
    },
    max: function(tensor, axis = null) {
        if (axis === null) {
            return Math.max(...this.flatten(tensor));
        }
        if (axis === 0) {
            const result = [...tensor[0]];
            for (let i = 1; i < tensor.length; i++) {
                for (let j = 0; j < tensor[0].length; j++) {
                    result[j] = Math.max(result[j], tensor[i][j]);
                }
            }
            return result;
        }
        return tensor.map(row => Math.max(...row));
    },
    argmax: function(arr) {
        return arr.indexOf(Math.max(...arr));
    },
    // Convolution operation for CNN
    conv2d: function(input, kernel, stride = 1, padding = 0) {
        // input: [height, width] or [channels, height, width]
        // kernel: [kH, kW] or [outChannels, inChannels, kH, kW]
        const is3D = input.length > 0 && Array.isArray(input[0]) && Array.isArray(input[0][0]);

        if (!is3D) {
            // Simple 2D convolution
            const [H, W] = [input.length, input[0].length];
            const [kH, kW] = [kernel.length, kernel[0].length];
            const outH = Math.floor((H + 2 * padding - kH) / stride) + 1;
            const outW = Math.floor((W + 2 * padding - kW) / stride) + 1;

            // Pad input
            let padded = input;
            if (padding > 0) {
                padded = this.zeros([H + 2 * padding, W + 2 * padding]);
                for (let i = 0; i < H; i++) {
                    for (let j = 0; j < W; j++) {
                        padded[i + padding][j + padding] = input[i][j];
                    }
                }
            }
            const output = this.zeros([outH, outW]);
            for (let i = 0; i < outH; i++) {
                for (let j = 0; j < outW; j++) {
                    let sum = 0;
                    for (let ki = 0; ki < kH; ki++) {
                        for (let kj = 0; kj < kW; kj++) {
                            sum += padded[i * stride + ki][j * stride + kj] * kernel[ki][kj];
                        }
                    }
                    output[i][j] = sum;
                }
            }
            return output;
        }
        // 3D convolution (multi-channel)
        const [C, H, W] = [input.length, input[0].length, input[0][0].length];
        const [kH, kW] = [kernel[0].length, kernel[0][0].length];
        const outH = Math.floor((H + 2 * padding - kH) / stride) + 1;
        const outW = Math.floor((W + 2 * padding - kW) / stride) + 1;

        const output = this.zeros([outH, outW]);
        for (let i = 0; i < outH; i++) {
            for (let j = 0; j < outW; j++) {
                let sum = 0;
                for (let c = 0; c < C; c++) {
                    for (let ki = 0; ki < kH; ki++) {
                        for (let kj = 0; kj < kW; kj++) {
                            const ii = i * stride + ki - padding;
                            const jj = j * stride + kj - padding;
                            if (ii >= 0 && ii < H && jj >= 0 && jj < W) {
                                sum += input[c][ii][jj] * kernel[c][ki][kj];
                            }
                        }
                    }
                }
                output[i][j] = sum;
            }
        }
        return output;
    },
    // Max pooling for CNN
    maxPool2d: function(input, poolSize = 2, stride = null) {
        stride = stride || poolSize;
        const [H, W] = [input.length, input[0].length];
        const outH = Math.floor((H - poolSize) / stride) + 1;
        const outW = Math.floor((W - poolSize) / stride) + 1;

        const output = this.zeros([outH, outW]);
        const indices = this.zeros([outH, outW, 2]); // Store max indices for backward

        for (let i = 0; i < outH; i++) {
            for (let j = 0; j < outW; j++) {
                let maxVal = -Infinity;
                let maxI = 0, maxJ = 0;
                for (let pi = 0; pi < poolSize; pi++) {
                    for (let pj = 0; pj < poolSize; pj++) {
                        const val = input[i * stride + pi][j * stride + pj];
                        if (val > maxVal) {
                            maxVal = val;
                            maxI = i * stride + pi;
                            maxJ = j * stride + pj;
                        }
                    }
                }
                output[i][j] = maxVal;
                indices[i][j] = [maxI, maxJ];
            }
        }
        return { output, indices };
    }
};
// SECTION 2: ADVANCED NEURAL NETWORK LAYERS

const PRISM_NN_LAYERS_ADVANCED = {

    /**
     * Conv2D - Convolutional Layer
     * For image/grid-based feature extraction
     */
    Conv2D: class {
        constructor(inChannels, outChannels, kernelSize, stride = 1, padding = 0) {
            this.inChannels = inChannels;
            this.outChannels = outChannels;
            this.kernelSize = kernelSize;
            this.stride = stride;
            this.padding = padding;

            // He initialization for ReLU
            const scale = Math.sqrt(2.0 / (inChannels * kernelSize * kernelSize));
            this.kernels = [];
            for (let o = 0; o < outChannels; o++) {
                this.kernels[o] = [];
                for (let i = 0; i < inChannels; i++) {
                    this.kernels[o][i] = PRISM_TENSOR_ENHANCED.randomNormal(
                        [kernelSize, kernelSize], 0, scale
                    );
                }
            }
            this.biases = Array(outChannels).fill(0);

            // Adam optimizer state
            this.mK = PRISM_TENSOR_ENHANCED.zeros([outChannels, inChannels, kernelSize, kernelSize]);
            this.vK = PRISM_TENSOR_ENHANCED.zeros([outChannels, inChannels, kernelSize, kernelSize]);
            this.mB = Array(outChannels).fill(0);
            this.vB = Array(outChannels).fill(0);
            this.t = 0;

            // Cache
            this.lastInput = null;
            this.lastOutput = null;
        }
        forward(input) {
            // input: [channels, height, width]
            this.lastInput = PRISM_TENSOR_ENHANCED.clone(input);

            const [C, H, W] = [input.length, input[0].length, input[0][0].length];
            const outH = Math.floor((H + 2 * this.padding - this.kernelSize) / this.stride) + 1;
            const outW = Math.floor((W + 2 * this.padding - this.kernelSize) / this.stride) + 1;

            const output = [];
            for (let o = 0; o < this.outChannels; o++) {
                const featureMap = PRISM_TENSOR_ENHANCED.zeros([outH, outW]);

                for (let i = 0; i < outH; i++) {
                    for (let j = 0; j < outW; j++) {
                        let sum = this.biases[o];
                        for (let c = 0; c < this.inChannels; c++) {
                            for (let ki = 0; ki < this.kernelSize; ki++) {
                                for (let kj = 0; kj < this.kernelSize; kj++) {
                                    const ii = i * this.stride + ki - this.padding;
                                    const jj = j * this.stride + kj - this.padding;
                                    if (ii >= 0 && ii < H && jj >= 0 && jj < W) {
                                        sum += input[c][ii][jj] * this.kernels[o][c][ki][kj];
                                    }
                                }
                            }
                        }
                        featureMap[i][j] = Math.max(0, sum); // ReLU activation
                    }
                }
                output.push(featureMap);
            }
            this.lastOutput = output;
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            this.t++;
            const beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8;

            const [C, H, W] = [this.lastInput.length, this.lastInput[0].length, this.lastInput[0][0].length];
            const [outH, outW] = [gradOutput[0].length, gradOutput[0][0].length];

            // Gradient w.r.t. input
            const gradInput = PRISM_TENSOR_ENHANCED.zeros([C, H, W]);

            for (let o = 0; o < this.outChannels; o++) {
                // Apply ReLU derivative
                const reluGrad = gradOutput[o].map((row, i) =>
                    row.map((g, j) => this.lastOutput[o][i][j] > 0 ? g : 0)
                );

                // Compute gradients
                let gradBias = 0;
                for (let i = 0; i < outH; i++) {
                    for (let j = 0; j < outW; j++) {
                        gradBias += reluGrad[i][j];

                        for (let c = 0; c < this.inChannels; c++) {
                            for (let ki = 0; ki < this.kernelSize; ki++) {
                                for (let kj = 0; kj < this.kernelSize; kj++) {
                                    const ii = i * this.stride + ki - this.padding;
                                    const jj = j * this.stride + kj - this.padding;

                                    if (ii >= 0 && ii < H && jj >= 0 && jj < W) {
                                        // Gradient w.r.t. kernel
                                        const gK = reluGrad[i][j] * this.lastInput[c][ii][jj];

                                        // Adam update for kernel
                                        this.mK[o][c][ki][kj] = beta1 * this.mK[o][c][ki][kj] + (1 - beta1) * gK;
                                        this.vK[o][c][ki][kj] = beta2 * this.vK[o][c][ki][kj] + (1 - beta2) * gK * gK;

                                        const mHat = this.mK[o][c][ki][kj] / (1 - Math.pow(beta1, this.t));
                                        const vHat = this.vK[o][c][ki][kj] / (1 - Math.pow(beta2, this.t));

                                        this.kernels[o][c][ki][kj] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);

                                        // Gradient w.r.t. input
                                        gradInput[c][ii][jj] += reluGrad[i][j] * this.kernels[o][c][ki][kj];
                                    }
                                }
                            }
                        }
                    }
                }
                // Adam update for bias
                this.mB[o] = beta1 * this.mB[o] + (1 - beta1) * gradBias;
                this.vB[o] = beta2 * this.vB[o] + (1 - beta2) * gradBias * gradBias;
                const mHatB = this.mB[o] / (1 - Math.pow(beta1, this.t));
                const vHatB = this.vB[o] / (1 - Math.pow(beta2, this.t));
                this.biases[o] -= learningRate * mHatB / (Math.sqrt(vHatB) + epsilon);
            }
            return gradInput;
        }
        getParams() {
            return {
                kernels: PRISM_TENSOR_ENHANCED.clone(this.kernels),
                biases: [...this.biases]
            };
        }
        setParams(params) {
            this.kernels = PRISM_TENSOR_ENHANCED.clone(params.kernels);
            this.biases = [...params.biases];
        }
    },
    /**
     * MaxPool2D - Max Pooling Layer
     */
    MaxPool2D: class {
        constructor(poolSize = 2, stride = null) {
            this.poolSize = poolSize;
            this.stride = stride || poolSize;
            this.lastIndices = null;
            this.lastInputShape = null;
        }
        forward(input) {
            // input: [channels, height, width]
            this.lastInputShape = [input.length, input[0].length, input[0][0].length];

            const output = [];
            this.lastIndices = [];

            for (let c = 0; c < input.length; c++) {
                const { output: pooled, indices } = PRISM_TENSOR_ENHANCED.maxPool2d(
                    input[c], this.poolSize, this.stride
                );
                output.push(pooled);
                this.lastIndices.push(indices);
            }
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            const [C, H, W] = this.lastInputShape;
            const gradInput = PRISM_TENSOR_ENHANCED.zeros([C, H, W]);

            for (let c = 0; c < C; c++) {
                const [outH, outW] = [gradOutput[c].length, gradOutput[c][0].length];
                for (let i = 0; i < outH; i++) {
                    for (let j = 0; j < outW; j++) {
                        const [maxI, maxJ] = this.lastIndices[c][i][j];
                        gradInput[c][maxI][maxJ] += gradOutput[c][i][j];
                    }
                }
            }
            return gradInput;
        }
    },
    /**
     * Flatten - Converts 3D to 1D for Dense layers
     */
    Flatten: class {
        constructor() {
            this.lastInputShape = null;
        }
        forward(input) {
            this.lastInputShape = PRISM_TENSOR_ENHANCED.shape(input);
            return PRISM_TENSOR_ENHANCED.flatten(input);
        }
        backward(gradOutput, learningRate = 0.001) {
            return PRISM_TENSOR_ENHANCED.reshape(gradOutput, this.lastInputShape);
        }
    },
    /**
     * LSTM - Long Short-Term Memory Layer
     * For sequence prediction (tool wear over time, etc.)
     */
    LSTM: class {
        constructor(inputSize, hiddenSize, returnSequences = false) {
            this.inputSize = inputSize;
            this.hiddenSize = hiddenSize;
            this.returnSequences = returnSequences;

            // Xavier initialization
            const scale = Math.sqrt(2.0 / (inputSize + hiddenSize));

            // Gates: forget, input, cell, output
            // Weights for input
            this.Wi = PRISM_TENSOR_ENHANCED.randomNormal([4, hiddenSize, inputSize], 0, scale);
            // Weights for hidden state
            this.Wh = PRISM_TENSOR_ENHANCED.randomNormal([4, hiddenSize, hiddenSize], 0, scale);
            // Biases (initialize forget gate bias to 1 for better gradient flow)
            this.b = [
                Array(hiddenSize).fill(1),  // Forget gate - bias to 1
                Array(hiddenSize).fill(0),  // Input gate
                Array(hiddenSize).fill(0),  // Cell gate
                Array(hiddenSize).fill(0)   // Output gate
            ];

            // Adam optimizer state
            this.mWi = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, inputSize]);
            this.vWi = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, inputSize]);
            this.mWh = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, hiddenSize]);
            this.vWh = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, hiddenSize]);
            this.mb = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize]);
            this.vb = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize]);
            this.t = 0;

            // Cache for backprop
            this.cache = [];
        }
        _sigmoid(x) {
            return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
        }
        _tanh(x) {
            return Math.tanh(x);
        }
        forward(sequence) {
            // sequence: [seqLength, inputSize]
            const seqLength = sequence.length;
            let h = Array(this.hiddenSize).fill(0);
            let c = Array(this.hiddenSize).fill(0);

            this.cache = [];
            const outputs = [];

            for (let t = 0; t < seqLength; t++) {
                const x = sequence[t];
                const prevH = [...h];
                const prevC = [...c];

                // Compute gates
                const gates = [];
                for (let g = 0; g < 4; g++) {
                    const gate = [];
                    for (let j = 0; j < this.hiddenSize; j++) {
                        let sum = this.b[g][j];
                        for (let k = 0; k < this.inputSize; k++) {
                            sum += this.Wi[g][j][k] * x[k];
                        }
                        for (let k = 0; k < this.hiddenSize; k++) {
                            sum += this.Wh[g][j][k] * prevH[k];
                        }
                        gate.push(sum);
                    }
                    gates.push(gate);
                }
                // Apply activations
                const f = gates[0].map(v => this._sigmoid(v)); // Forget gate
                const i = gates[1].map(v => this._sigmoid(v)); // Input gate
                const cTilde = gates[2].map(v => this._tanh(v)); // Cell candidate
                const o = gates[3].map(v => this._sigmoid(v)); // Output gate

                // New cell state and hidden state
                c = c.map((cPrev, j) => f[j] * cPrev + i[j] * cTilde[j]);
                h = c.map((cNew, j) => o[j] * this._tanh(cNew));

                // Cache for backward pass
                this.cache.push({ x, prevH, prevC, f, i, cTilde, o, c: [...c], h: [...h] });

                if (this.returnSequences) {
                    outputs.push([...h]);
                }
            }
            return this.returnSequences ? outputs : h;
        }
        backward(gradOutput, learningRate = 0.001) {
            this.t++;
            const beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8;

            // Initialize gradients
            const gradWi = PRISM_TENSOR_ENHANCED.zeros([4, this.hiddenSize, this.inputSize]);
            const gradWh = PRISM_TENSOR_ENHANCED.zeros([4, this.hiddenSize, this.hiddenSize]);
            const gradb = PRISM_TENSOR_ENHANCED.zeros([4, this.hiddenSize]);

            let dh_next = Array(this.hiddenSize).fill(0);
            let dc_next = Array(this.hiddenSize).fill(0);

            // Handle gradOutput format
            const seqLength = this.cache.length;
            const gradH = this.returnSequences ? gradOutput :
                Array(seqLength - 1).fill(Array(this.hiddenSize).fill(0)).concat([gradOutput]);

            // Backward through time
            for (let t = seqLength - 1; t >= 0; t--) {
                const { x, prevH, prevC, f, i, cTilde, o, c, h } = this.cache[t];

                // Total gradient on hidden state
                const dh = gradH[t].map((g, j) => g + dh_next[j]);

                // Gradient through output gate
                const do_ = dh.map((dh_j, j) => dh_j * this._tanh(c[j]));
                const do_raw = do_.map((d, j) => d * o[j] * (1 - o[j]));

                // Gradient on cell state
                const dc = dh.map((dh_j, j) =>
                    dh_j * o[j] * (1 - Math.pow(this._tanh(c[j]), 2)) + dc_next[j]
                );

                // Gradient through forget gate
                const df = dc.map((dc_j, j) => dc_j * prevC[j]);
                const df_raw = df.map((d, j) => d * f[j] * (1 - f[j]));

                // Gradient through input gate
                const di = dc.map((dc_j, j) => dc_j * cTilde[j]);
                const di_raw = di.map((d, j) => d * i[j] * (1 - i[j]));

                // Gradient through cell candidate
                const dcTilde = dc.map((dc_j, j) => dc_j * i[j]);
                const dcTilde_raw = dcTilde.map((d, j) => d * (1 - Math.pow(cTilde[j], 2)));

                const gateGrads = [df_raw, di_raw, dcTilde_raw, do_raw];

                // Accumulate weight gradients
                for (let g = 0; g < 4; g++) {
                    for (let j = 0; j < this.hiddenSize; j++) {
                        gradb[g][j] += gateGrads[g][j];
                        for (let k = 0; k < this.inputSize; k++) {
                            gradWi[g][j][k] += gateGrads[g][j] * x[k];
                        }
                        for (let k = 0; k < this.hiddenSize; k++) {
                            gradWh[g][j][k] += gateGrads[g][j] * prevH[k];
                        }
                    }
                }
                // Gradient for next timestep
                dh_next = Array(this.hiddenSize).fill(0);
                for (let j = 0; j < this.hiddenSize; j++) {
                    for (let g = 0; g < 4; g++) {
                        for (let k = 0; k < this.hiddenSize; k++) {
                            dh_next[k] += gateGrads[g][j] * this.Wh[g][j][k];
                        }
                    }
                }
                dc_next = dc.map((dc_j, j) => dc_j * f[j]);
            }
            // Adam update
            for (let g = 0; g < 4; g++) {
                for (let j = 0; j < this.hiddenSize; j++) {
                    // Bias update
                    this.mb[g][j] = beta1 * this.mb[g][j] + (1 - beta1) * gradb[g][j];
                    this.vb[g][j] = beta2 * this.vb[g][j] + (1 - beta2) * gradb[g][j] * gradb[g][j];
                    const mHatB = this.mb[g][j] / (1 - Math.pow(beta1, this.t));
                    const vHatB = this.vb[g][j] / (1 - Math.pow(beta2, this.t));
                    this.b[g][j] -= learningRate * mHatB / (Math.sqrt(vHatB) + epsilon);

                    // Weight updates
                    for (let k = 0; k < this.inputSize; k++) {
                        this.mWi[g][j][k] = beta1 * this.mWi[g][j][k] + (1 - beta1) * gradWi[g][j][k];
                        this.vWi[g][j][k] = beta2 * this.vWi[g][j][k] + (1 - beta2) * gradWi[g][j][k] * gradWi[g][j][k];
                        const mHat = this.mWi[g][j][k] / (1 - Math.pow(beta1, this.t));
                        const vHat = this.vWi[g][j][k] / (1 - Math.pow(beta2, this.t));
                        this.Wi[g][j][k] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        this.mWh[g][j][k] = beta1 * this.mWh[g][j][k] + (1 - beta1) * gradWh[g][j][k];
                        this.vWh[g][j][k] = beta2 * this.vWh[g][j][k] + (1 - beta2) * gradWh[g][j][k] * gradWh[g][j][k];
                        const mHat = this.mWh[g][j][k] / (1 - Math.pow(beta1, this.t));
                        const vHat = this.vWh[g][j][k] / (1 - Math.pow(beta2, this.t));
                        this.Wh[g][j][k] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                }
            }
            return dh_next;
        }
        getParams() {
            return {
                Wi: PRISM_TENSOR_ENHANCED.clone(this.Wi),
                Wh: PRISM_TENSOR_ENHANCED.clone(this.Wh),
                b: this.b.map(g => [...g])
            };
        }
        setParams(params) {
            this.Wi = PRISM_TENSOR_ENHANCED.clone(params.Wi);
            this.Wh = PRISM_TENSOR_ENHANCED.clone(params.Wh);
            this.b = params.b.map(g => [...g]);
        }
    },
    /**
     * GRU - Gated Recurrent Unit (simpler than LSTM)
     */
    GRU: class {
        constructor(inputSize, hiddenSize, returnSequences = false) {
            this.inputSize = inputSize;
            this.hiddenSize = hiddenSize;
            this.returnSequences = returnSequences;

            const scale = Math.sqrt(2.0 / (inputSize + hiddenSize));

            // Gates: reset, update, candidate
            this.Wi = PRISM_TENSOR_ENHANCED.randomNormal([3, hiddenSize, inputSize], 0, scale);
            this.Wh = PRISM_TENSOR_ENHANCED.randomNormal([3, hiddenSize, hiddenSize], 0, scale);
            this.b = [
                Array(hiddenSize).fill(0),
                Array(hiddenSize).fill(0),
                Array(hiddenSize).fill(0)
            ];

            this.cache = [];
        }
        _sigmoid(x) {
            return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
        }
        forward(sequence) {
            const seqLength = sequence.length;
            let h = Array(this.hiddenSize).fill(0);

            this.cache = [];
            const outputs = [];

            for (let t = 0; t < seqLength; t++) {
                const x = sequence[t];
                const prevH = [...h];

                // Compute gates
                const gates = [];
                for (let g = 0; g < 3; g++) {
                    const gate = [];
                    for (let j = 0; j < this.hiddenSize; j++) {
                        let sum = this.b[g][j];
                        for (let k = 0; k < this.inputSize; k++) {
                            sum += this.Wi[g][j][k] * x[k];
                        }
                        for (let k = 0; k < this.hiddenSize; k++) {
                            sum += this.Wh[g][j][k] * prevH[k];
                        }
                        gate.push(sum);
                    }
                    gates.push(gate);
                }
                const r = gates[0].map(v => this._sigmoid(v)); // Reset gate
                const z = gates[1].map(v => this._sigmoid(v)); // Update gate

                // Candidate with reset gate applied
                const hTilde = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let sum = this.b[2][j];
                    for (let k = 0; k < this.inputSize; k++) {
                        sum += this.Wi[2][j][k] * x[k];
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        sum += this.Wh[2][j][k] * (r[k] * prevH[k]);
                    }
                    hTilde.push(Math.tanh(sum));
                }
                // New hidden state
                h = h.map((_, j) => (1 - z[j]) * prevH[j] + z[j] * hTilde[j]);

                this.cache.push({ x, prevH, r, z, hTilde, h: [...h] });

                if (this.returnSequences) {
                    outputs.push([...h]);
                }
            }
            return this.returnSequences ? outputs : h;
        }
        backward(gradOutput, learningRate = 0.001) {
            // Simplified backward pass (full implementation would be similar to LSTM)
            return gradOutput;
        }
    },
    /**
     * MultiHeadAttention - Transformer-style attention
     */
    MultiHeadAttention: class {
        constructor(dModel, numHeads) {
            this.dModel = dModel;
            this.numHeads = numHeads;
            this.dK = Math.floor(dModel / numHeads);

            const scale = Math.sqrt(2.0 / dModel);

            // Query, Key, Value projections
            this.Wq = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);
            this.Wk = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);
            this.Wv = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);
            this.Wo = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);

            this.cache = null;
        }
        _softmax(arr) {
            const max = Math.max(...arr);
            const exps = arr.map(x => Math.exp(x - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        }
        forward(query, key, value, mask = null) {
            // query, key, value: [seqLen, dModel]
            const seqLen = query.length;

            // Linear projections
            const Q = query.map(q => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += q[j] * this.Wq[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            const K = key.map(k => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += k[j] * this.Wk[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            const V = value.map(v => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += v[j] * this.Wv[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            // Scaled dot-product attention for each head
            const scale = Math.sqrt(this.dK);
            const outputs = [];

            for (let h = 0; h < this.numHeads; h++) {
                const headStart = h * this.dK;
                const headEnd = headStart + this.dK;

                // Extract head slices
                const Qh = Q.map(q => q.slice(headStart, headEnd));
                const Kh = K.map(k => k.slice(headStart, headEnd));
                const Vh = V.map(v => v.slice(headStart, headEnd));

                // Compute attention scores
                const scores = [];
                for (let i = 0; i < seqLen; i++) {
                    const row = [];
                    for (let j = 0; j < seqLen; j++) {
                        let score = 0;
                        for (let k = 0; k < this.dK; k++) {
                            score += Qh[i][k] * Kh[j][k];
                        }
                        row.push(score / scale);
                    }
                    scores.push(row);
                }
                // Apply mask if provided
                if (mask) {
                    for (let i = 0; i < seqLen; i++) {
                        for (let j = 0; j < seqLen; j++) {
                            if (mask[i][j] === 0) {
                                scores[i][j] = -1e9;
                            }
                        }
                    }
                }
                // Softmax
                const attnWeights = scores.map(row => this._softmax(row));

                // Apply attention to values
                const headOutput = [];
                for (let i = 0; i < seqLen; i++) {
                    const weighted = Array(this.dK).fill(0);
                    for (let j = 0; j < seqLen; j++) {
                        for (let k = 0; k < this.dK; k++) {
                            weighted[k] += attnWeights[i][j] * Vh[j][k];
                        }
                    }
                    headOutput.push(weighted);
                }
                outputs.push(headOutput);
            }
            // Concatenate heads and project
            const concat = [];
            for (let i = 0; i < seqLen; i++) {
                const row = [];
                for (let h = 0; h < this.numHeads; h++) {
                    row.push(...outputs[h][i]);
                }
                concat.push(row);
            }
            // Output projection
            const output = concat.map(c => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += c[j] * this.Wo[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            this.cache = { Q, K, V, outputs };
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            // Simplified backward - full implementation would compute all gradients
            return gradOutput;
        }
    },
    /**
     * LayerNorm - Layer Normalization
     */
    LayerNorm: class {
        constructor(size, eps = 1e-6) {
            this.size = size;
            this.eps = eps;
            this.gamma = Array(size).fill(1);
            this.beta = Array(size).fill(0);
            this.cache = null;
        }
        forward(input) {
            // input: [batchSize, size] or just [size]
            const is2D = Array.isArray(input[0]);
            const data = is2D ? input : [input];

            const output = data.map(x => {
                const mean = x.reduce((a, b) => a + b, 0) / x.length;
                const variance = x.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / x.length;
                const std = Math.sqrt(variance + this.eps);

                return x.map((v, i) => this.gamma[i] * ((v - mean) / std) + this.beta[i]);
            });

            this.cache = { data, output };
            return is2D ? output : output[0];
        }
        backward(gradOutput, learningRate = 0.001) {
            return gradOutput;
        }
    },
    /**
     * BatchNorm1D - Batch Normalization for 1D inputs
     */
    BatchNorm1D: class {
        constructor(numFeatures, momentum = 0.1, eps = 1e-5) {
            this.numFeatures = numFeatures;
            this.momentum = momentum;
            this.eps = eps;

            this.gamma = Array(numFeatures).fill(1);
            this.beta = Array(numFeatures).fill(0);

            this.runningMean = Array(numFeatures).fill(0);
            this.runningVar = Array(numFeatures).fill(1);

            this.training = true;
            this.cache = null;
        }
        forward(input) {
            // input: [batchSize, numFeatures]
            const batchSize = input.length;

            let mean, variance;

            if (this.training) {
                // Compute batch statistics
                mean = Array(this.numFeatures).fill(0);
                for (let i = 0; i < batchSize; i++) {
                    for (let j = 0; j < this.numFeatures; j++) {
                        mean[j] += input[i][j];
                    }
                }
                mean = mean.map(m => m / batchSize);

                variance = Array(this.numFeatures).fill(0);
                for (let i = 0; i < batchSize; i++) {
                    for (let j = 0; j < this.numFeatures; j++) {
                        variance[j] += Math.pow(input[i][j] - mean[j], 2);
                    }
                }
                variance = variance.map(v => v / batchSize);

                // Update running statistics
                for (let j = 0; j < this.numFeatures; j++) {
                    this.runningMean[j] = (1 - this.momentum) * this.runningMean[j] + this.momentum * mean[j];
                    this.runningVar[j] = (1 - this.momentum) * this.runningVar[j] + this.momentum * variance[j];
                }
            } else {
                mean = this.runningMean;
                variance = this.runningVar;
            }
            // Normalize
            const std = variance.map(v => Math.sqrt(v + this.eps));
            const normalized = input.map(x =>
                x.map((v, j) => (v - mean[j]) / std[j])
            );

            // Scale and shift
            const output = normalized.map(x =>
                x.map((v, j) => this.gamma[j] * v + this.beta[j])
            );

            this.cache = { input, normalized, mean, variance, std };
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            const { input, normalized, mean, variance, std } = this.cache;
            const batchSize = input.length;

            // Gradients for gamma and beta
            const gradGamma = Array(this.numFeatures).fill(0);
            const gradBeta = Array(this.numFeatures).fill(0);

            for (let i = 0; i < batchSize; i++) {
                for (let j = 0; j < this.numFeatures; j++) {
                    gradGamma[j] += gradOutput[i][j] * normalized[i][j];
                    gradBeta[j] += gradOutput[i][j];
                }
            }
            // Update parameters
            for (let j = 0; j < this.numFeatures; j++) {
                this.gamma[j] -= learningRate * gradGamma[j];
                this.beta[j] -= learningRate * gradBeta[j];
            }
            // Gradient for input
            const gradInput = input.map((x, i) =>
                x.map((_, j) => {
                    const gradNorm = gradOutput[i][j] * this.gamma[j];
                    return gradNorm / std[j];
                })
            );

            return gradInput;
        }
        setTraining(mode) {
            this.training = mode;
        }
    }
};
// SECTION 3: MODEL SERIALIZATION

const PRISM_MODEL_SERIALIZATION = {

    /**
     * Serialize model to JSON
     */
    toJSON: function(model) {
        const serialized = {
            name: model.name || 'unnamed',
            version: '2.0',
            timestamp: Date.now(),
            architecture: [],
            weights: []
        };
        if (model.layers) {
            for (let i = 0; i < model.layers.length; i++) {
                const layer = model.layers[i];
                const layerInfo = {
                    type: layer.constructor.name,
                    index: i
                };
                // Store layer configuration
                if (layer.inputSize !== undefined) layerInfo.inputSize = layer.inputSize;
                if (layer.outputSize !== undefined) layerInfo.outputSize = layer.outputSize;
                if (layer.hiddenSize !== undefined) layerInfo.hiddenSize = layer.hiddenSize;
                if (layer.activation !== undefined) layerInfo.activation = layer.activation;
                if (layer.rate !== undefined) layerInfo.rate = layer.rate;
                if (layer.kernelSize !== undefined) layerInfo.kernelSize = layer.kernelSize;
                if (layer.inChannels !== undefined) layerInfo.inChannels = layer.inChannels;
                if (layer.outChannels !== undefined) layerInfo.outChannels = layer.outChannels;

                serialized.architecture.push(layerInfo);

                // Store weights
                if (layer.getParams) {
                    serialized.weights.push(layer.getParams());
                } else if (layer.weights) {
                    serialized.weights.push({
                        weights: PRISM_TENSOR_ENHANCED.clone(layer.weights),
                        biases: layer.biases ? [...layer.biases] : null
                    });
                } else {
                    serialized.weights.push(null);
                }
            }
        }
        return JSON.stringify(serialized);
    },
    /**
     * Deserialize model from JSON
     */
    fromJSON: function(jsonString, PRISM_NN_LAYERS_REF = null) {
        const data = JSON.parse(jsonString);
        const layers = PRISM_NN_LAYERS_REF || PRISM_NN_LAYERS_ADVANCED;

        // Reconstruct model
        const model = {
            name: data.name,
            layers: []
        };
        for (let i = 0; i < data.architecture.length; i++) {
            const arch = data.architecture[i];
            const weights = data.weights[i];

            let layer;
            switch (arch.type) {
                case 'Dense':
                    layer = new (layers.Dense || PRISM_NN_LAYERS.Dense)(
                        arch.inputSize, arch.outputSize, arch.activation
                    );
                    break;
                case 'Conv2D':
                    layer = new layers.Conv2D(
                        arch.inChannels, arch.outChannels, arch.kernelSize
                    );
                    break;
                case 'LSTM':
                    layer = new layers.LSTM(arch.inputSize, arch.hiddenSize);
                    break;
                case 'GRU':
                    layer = new layers.GRU(arch.inputSize, arch.hiddenSize);
                    break;
                case 'MaxPool2D':
                    layer = new layers.MaxPool2D(arch.poolSize);
                    break;
                case 'Flatten':
                    layer = new layers.Flatten();
                    break;
                case 'LayerNorm':
                    layer = new layers.LayerNorm(arch.size);
                    break;
                case 'BatchNorm1D':
                    layer = new layers.BatchNorm1D(arch.numFeatures);
                    break;
                default:
                    console.warn(`[Serialization] Unknown layer type: ${arch.type}`);
                    continue;
            }
            // Restore weights
            if (weights && layer.setParams) {
                layer.setParams(weights);
            } else if (weights && layer.weights) {
                layer.weights = PRISM_TENSOR_ENHANCED.clone(weights.weights);
                if (weights.biases) layer.biases = [...weights.biases];
            }
            model.layers.push(layer);
        }
        return model;
    },
    /**
     * Save to localStorage
     */
    saveToStorage: function(model, key) {
        try {
            const json = this.toJSON(model);
            localStorage.setItem(`prism_model_${key}`, json);
            return { success: true, size: json.length };
        } catch (e) {
            console.error('[Serialization] Save failed:', e);
            return { success: false, error: e.message };
        }
    },
    /**
     * Load from localStorage
     */
    loadFromStorage: function(key, layersRef = null) {
        try {
            const json = localStorage.getItem(`prism_model_${key}`);
            if (!json) return { success: false, error: 'Model not found' };

            const model = this.fromJSON(json, layersRef);
            return { success: true, model };
        } catch (e) {
            console.error('[Serialization] Load failed:', e);
            return { success: false, error: e.message };
        }
    },
    /**
     * Export to downloadable file
     */
    exportToFile: function(model, filename = 'prism_model.json') {
        const json = this.toJSON(model);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        if (typeof document !== 'undefined') {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
        return { success: true, json };
    },
    /**
     * List saved models
     */
    listSavedModels: function() {
        const models = [];
        if (typeof localStorage !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('prism_model_')) {
                    const name = key.replace('prism_model_', '');
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        models.push({
                            name,
                            timestamp: data.timestamp,
                            layers: data.architecture.length
                        });
                    } catch (e) {
                        models.push({ name, error: true });
                    }
                }
            }
        }
        return models;
    }
};
// SECTION 4: ONLINE LEARNING SYSTEM

const PRISM_ONLINE_LEARNING = {

    learningRateSchedulers: {
        constant: (baseLR, step) => baseLR,
        stepDecay: (baseLR, step, decayRate = 0.9, decaySteps = 100) =>
            baseLR * Math.pow(decayRate, Math.floor(step / decaySteps)),
        exponential: (baseLR, step, decayRate = 0.995) =>
            baseLR * Math.pow(decayRate, step),
        cosineAnnealing: (baseLR, step, totalSteps = 1000, minLR = 0.0001) =>
            minLR + (baseLR - minLR) * (1 + Math.cos(Math.PI * step / totalSteps)) / 2
    },
    /**
     * Incremental fit - update model with single sample
     */
    incrementalFit: function(model, input, target, learningRate = 0.001) {
        // Forward pass
        let current = input;
        for (const layer of model.layers) {
            current = layer.forward(current);
        }
        // Compute loss gradient
        const output = current;
        const gradOutput = output.map((o, i) => o - target[i]);

        // Backward pass
        let grad = gradOutput;
        for (let i = model.layers.length - 1; i >= 0; i--) {
            grad = model.layers[i].backward(grad, learningRate);
        }
        // Compute loss for reporting
        const loss = output.reduce((sum, o, i) => sum + Math.pow(o - target[i], 2), 0) / output.length;

        return { loss, prediction: output };
    },
    /**
     * Online learning with experience replay
     */
    onlineLearnWithReplay: function(model, newSample, replayBuffer, config = {}) {
        const {
            bufferSize = 1000,
            batchSize = 32,
            replayRatio = 0.5,
            learningRate = 0.001
        } = config;

        // Add new sample to buffer
        replayBuffer.push(newSample);
        if (replayBuffer.length > bufferSize) {
            replayBuffer.shift();
        }
        // Learn from new sample
        let totalLoss = this.incrementalFit(model, newSample.input, newSample.target, learningRate).loss;
        let count = 1;

        // Replay from buffer
        const replayCount = Math.floor(batchSize * replayRatio);
        for (let i = 0; i < replayCount && replayBuffer.length > 1; i++) {
            const idx = Math.floor(Math.random() * replayBuffer.length);
            const sample = replayBuffer[idx];
            totalLoss += this.incrementalFit(model, sample.input, sample.target, learningRate * 0.5).loss;
            count++;
        }
        return { avgLoss: totalLoss / count, bufferSize: replayBuffer.length };
    },
    /**
     * Elastic Weight Consolidation (EWC) for catastrophic forgetting prevention
     */
    elasticWeightConsolidation: function(model, fisherMatrix, lambda = 1000) {
        // Fisher matrix approximates importance of each weight
        // Penalize changes to important weights

        const ewcLoss = (currentWeights, originalWeights) => {
            let loss = 0;
            for (let i = 0; i < currentWeights.length; i++) {
                const diff = currentWeights[i] - originalWeights[i];
                loss += fisherMatrix[i] * diff * diff;
            }
            return lambda * loss / 2;
        };
        return ewcLoss;
    },
    /**
     * Compute Fisher Information Matrix (diagonal approximation)
     */
    computeFisherMatrix: function(model, dataset, samples = 100) {
        const fisher = [];

        // Initialize fisher values
        for (const layer of model.layers) {
            if (layer.weights) {
                const flat = PRISM_TENSOR_ENHANCED.flatten(layer.weights);
                fisher.push(...Array(flat.length).fill(0));
            }
        }
        // Compute empirical Fisher
        const sampleCount = Math.min(samples, dataset.length);
        for (let s = 0; s < sampleCount; s++) {
            const idx = Math.floor(Math.random() * dataset.length);
            const { input, target } = dataset[idx];

            // Forward pass
            let current = input;
            for (const layer of model.layers) {
                current = layer.forward(current);
            }
            // Backward pass to get gradients
            const gradOutput = current.map((o, i) => o - target[i]);
            let grad = gradOutput;

            let fisherIdx = 0;
            for (let i = model.layers.length - 1; i >= 0; i--) {
                const layer = model.layers[i];
                grad = layer.backward(grad, 0); // LR=0 to just compute gradients

                // Accumulate squared gradients
                if (layer.weights) {
                    const flat = PRISM_TENSOR_ENHANCED.flatten(layer.weights);
                    for (let j = 0; j < flat.length; j++) {
                        // Use gradient from Adam state if available
                        const g = layer.mW ? PRISM_TENSOR_ENHANCED.flatten(layer.mW)[j] : 0;
                        fisher[fisherIdx + j] += g * g;
                    }
                    fisherIdx += flat.length;
                }
            }
        }
        // Normalize
        return fisher.map(f => f / sampleCount);
    }
};
// SECTION 5: NLP & TOKENIZATION

const PRISM_NLP_ENGINE = {

    // Manufacturing vocabulary
    vocab: new Map(),
    reverseVocab: new Map(),
    vocabSize: 0,

    // Special tokens
    specialTokens: {
        PAD: 0,
        UNK: 1,
        START: 2,
        END: 3
    },
    /**
     * Initialize vocabulary with manufacturing terms
     */
    initVocab: function() {
        const manufacturingTerms = [
            // Pad and special
            '<PAD>', '<UNK>', '<START>', '<END>',
            // Operations
            'roughing', 'finishing', 'drilling', 'tapping', 'boring', 'facing',
            'turning', 'milling', 'threading', 'grooving', 'parting', 'chamfer',
            // Materials
            'aluminum', 'steel', 'stainless', 'titanium', 'brass', 'bronze',
            'copper', 'plastic', 'delrin', 'peek', 'inconel', 'hastelloy',
            // Tools
            'endmill', 'drill', 'tap', 'reamer', 'insert', 'carbide', 'hss',
            'ceramic', 'diamond', 'cbn', 'coated', 'uncoated', 'flute',
            // Parameters
            'speed', 'feed', 'rpm', 'sfm', 'ipm', 'doc', 'woc', 'stepover',
            'chipload', 'mrr', 'engagement', 'helix', 'lead', 'rake',
            // Problems
            'chatter', 'vibration', 'deflection', 'wear', 'breakage', 'chip',
            'buildup', 'burr', 'finish', 'tolerance', 'runout',
            // Actions
            'calculate', 'optimize', 'increase', 'decrease', 'adjust', 'check',
            'recommend', 'suggest', 'analyze', 'predict', 'simulate',
            // Questions
            'what', 'why', 'how', 'when', 'which', 'should', 'can', 'is',
            // Common words
            'the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'with', 'my',
            'best', 'good', 'bad', 'high', 'low', 'fast', 'slow', 'too',
            // Numbers and units
            'mm', 'inch', 'inches', 'ipm', 'sfm', 'rpm', 'percent', '%'
        ];

        this.vocab.clear();
        this.reverseVocab.clear();

        manufacturingTerms.forEach((term, idx) => {
            this.vocab.set(term.toLowerCase(), idx);
            this.reverseVocab.set(idx, term.toLowerCase());
        });

        this.vocabSize = manufacturingTerms.length;
        return this.vocabSize;
    },
    /**
     * Tokenize text
     */
    tokenize: function(text) {
        if (this.vocabSize === 0) this.initVocab();

        // Clean and split
        const cleaned = text.toLowerCase()
            .replace(/[^\w\s<>%-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const words = cleaned.split(' ');
        const tokens = [this.specialTokens.START];

        for (const word of words) {
            if (this.vocab.has(word)) {
                tokens.push(this.vocab.get(word));
            } else {
                // Try to find partial match
                let found = false;
                for (const [term, idx] of this.vocab) {
                    if (word.includes(term) || term.includes(word)) {
                        tokens.push(idx);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    tokens.push(this.specialTokens.UNK);
                }
            }
        }
        tokens.push(this.specialTokens.END);
        return tokens;
    },
    /**
     * Detokenize back to text
     */
    detokenize: function(tokens) {
        return tokens
            .filter(t => t > 3) // Skip special tokens
            .map(t => this.reverseVocab.get(t) || '<UNK>')
            .join(' ');
    },
    /**
     * Pad sequence to fixed length
     */
    padSequence: function(tokens, maxLen, padValue = 0) {
        if (tokens.length >= maxLen) {
            return tokens.slice(0, maxLen);
        }
        return [...tokens, ...Array(maxLen - tokens.length).fill(padValue)];
    },
    /**
     * Create word embeddings
     */
    createEmbedding: function(embeddingDim = 64) {
        if (this.vocabSize === 0) this.initVocab();

        // Initialize with random embeddings
        const embeddings = PRISM_TENSOR_ENHANCED.randomNormal(
            [this.vocabSize, embeddingDim], 0, 0.1
        );

        return {
            vocabSize: this.vocabSize,
            embeddingDim,
            weights: embeddings,

            lookup: function(tokenIds) {
                if (!Array.isArray(tokenIds)) tokenIds = [tokenIds];
                return tokenIds.map(id =>
                    id < this.weights.length ? [...this.weights[id]] :
                    Array(this.embeddingDim).fill(0)
                );
            },
            embed: function(tokens) {
                return this.lookup(tokens);
            }
        };
    },
    /**
     * Simple TF-IDF for intent matching
     */
    computeTFIDF: function(documents) {
        const df = new Map(); // Document frequency
        const tfs = []; // Term frequency per document

        // Compute TF and DF
        for (const doc of documents) {
            const tokens = this.tokenize(doc);
            const tf = new Map();

            for (const token of tokens) {
                tf.set(token, (tf.get(token) || 0) + 1);
            }
            tfs.push(tf);

            for (const token of new Set(tokens)) {
                df.set(token, (df.get(token) || 0) + 1);
            }
        }
        // Compute TF-IDF
        const N = documents.length;
        return documents.map((_, i) => {
            const tfidf = new Map();
            for (const [token, count] of tfs[i]) {
                const idf = Math.log(N / (df.get(token) || 1));
                tfidf.set(token, count * idf);
            }
            return tfidf;
        });
    }
};
// SECTION 6: INTENT CLASSIFICATION

const PRISM_INTENT_CLASSIFIER = {

    model: null,
    embedding: null,
    intents: [
        'speed_feed_query',
        'tool_selection',
        'material_query',
        'chatter_problem',
        'wear_prediction',
        'optimization_request',
        'general_question',
        'greeting',
        'help_request'
    ],

    trainingData: [
        // Speed/feed queries
        { text: 'what speed should I use for aluminum', intent: 'speed_feed_query' },
        { text: 'calculate feed rate for steel', intent: 'speed_feed_query' },
        { text: 'rpm for 10mm endmill in stainless', intent: 'speed_feed_query' },
        { text: 'what chipload should I use', intent: 'speed_feed_query' },
        { text: 'feeds and speeds for titanium', intent: 'speed_feed_query' },

        // Tool selection
        { text: 'what tool should I use for roughing', intent: 'tool_selection' },
        { text: 'best endmill for aluminum', intent: 'tool_selection' },
        { text: 'recommend a drill for stainless', intent: 'tool_selection' },
        { text: 'which insert for finishing steel', intent: 'tool_selection' },

        // Material queries
        { text: 'what is the hardness of 4140 steel', intent: 'material_query' },
        { text: 'machinability of inconel', intent: 'material_query' },
        { text: 'properties of 7075 aluminum', intent: 'material_query' },

        // Chatter problems
        { text: 'I am getting chatter', intent: 'chatter_problem' },
        { text: 'vibration during finishing', intent: 'chatter_problem' },
        { text: 'how to reduce chatter', intent: 'chatter_problem' },
        { text: 'tool is vibrating', intent: 'chatter_problem' },

        // Wear prediction
        { text: 'how long will my tool last', intent: 'wear_prediction' },
        { text: 'predict tool wear', intent: 'wear_prediction' },
        { text: 'when should I change the insert', intent: 'wear_prediction' },

        // Optimization
        { text: 'optimize my parameters', intent: 'optimization_request' },
        { text: 'make this faster', intent: 'optimization_request' },
        { text: 'improve surface finish', intent: 'optimization_request' },
        { text: 'reduce cycle time', intent: 'optimization_request' },

        // General
        { text: 'what is DOC', intent: 'general_question' },
        { text: 'explain stepover', intent: 'general_question' },
        { text: 'how does adaptive clearing work', intent: 'general_question' },

        // Greetings
        { text: 'hello', intent: 'greeting' },
        { text: 'hi', intent: 'greeting' },
        { text: 'hey there', intent: 'greeting' },

        // Help
        { text: 'help', intent: 'help_request' },
        { text: 'what can you do', intent: 'help_request' },
        { text: 'how do I use this', intent: 'help_request' }
    ],

    /**
     * Initialize and train the classifier
     */
    initialize: function() {
        console.log('[Intent Classifier] Initializing...');

        // Initialize NLP
        PRISM_NLP_ENGINE.initVocab();
        this.embedding = PRISM_NLP_ENGINE.createEmbedding(32);

        // Build model
        const inputSize = 32 * 20; // embeddingDim * maxSeqLen
        const hiddenSize = 64;
        const outputSize = this.intents.length;

        // Simple feedforward network using inline Dense implementation
        class DenseLayer {
            constructor(i, o, a) {
                this.inputSize = i; this.outputSize = o; this.activation = a;
                const scale = Math.sqrt(2.0 / (i + o));
                this.weights = PRISM_TENSOR_ENHANCED.randomNormal([i, o], 0, scale);
                this.biases = Array(o).fill(0);
                this.mW = PRISM_TENSOR_ENHANCED.zeros([i, o]);
                this.vW = PRISM_TENSOR_ENHANCED.zeros([i, o]);
                this.mB = Array(o).fill(0);
                this.vB = Array(o).fill(0);
                this.t = 0;
            }
            forward(input) {
                this.lastInput = [...input];
                const output = Array(this.outputSize).fill(0);
                for (let j = 0; j < this.outputSize; j++) {
                    let sum = this.biases[j];
                    for (let i = 0; i < this.inputSize; i++) {
                        sum += input[i] * this.weights[i][j];
                    }
                    if (this.activation === 'relu') {
                        output[j] = Math.max(0, sum);
                    } else if (this.activation === 'softmax') {
                        output[j] = sum; // Will apply softmax after all outputs computed
                    } else {
                        output[j] = sum;
                    }
                }
                // Apply softmax if needed
                if (this.activation === 'softmax') {
                    const max = Math.max(...output);
                    const exps = output.map(o => Math.exp(o - max));
                    const sumExp = exps.reduce((a, b) => a + b, 0);
                    this.lastOutput = exps.map(e => e / sumExp);
                    return this.lastOutput;
                }
                this.lastOutput = output;
                return output;
            }
            backward(grad, lr) {
                this.t++;
                const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
                const gradIn = Array(this.inputSize).fill(0);
                for (let j = 0; j < this.outputSize; j++) {
                    const g = this.activation === 'relu' && this.lastOutput[j] <= 0 ? 0 : grad[j];
                    this.mB[j] = beta1 * this.mB[j] + (1 - beta1) * g;
                    this.vB[j] = beta2 * this.vB[j] + (1 - beta2) * g * g;
                    this.biases[j] -= lr * (this.mB[j] / (1 - Math.pow(beta1, this.t))) /
                        (Math.sqrt(this.vB[j] / (1 - Math.pow(beta2, this.t))) + eps);
                    for (let i = 0; i < this.inputSize; i++) {
                        const gW = g * this.lastInput[i];
                        this.mW[i][j] = beta1 * this.mW[i][j] + (1 - beta1) * gW;
                        this.vW[i][j] = beta2 * this.vW[i][j] + (1 - beta2) * gW * gW;
                        this.weights[i][j] -= lr * (this.mW[i][j] / (1 - Math.pow(beta1, this.t))) /
                            (Math.sqrt(this.vW[i][j] / (1 - Math.pow(beta2, this.t))) + eps);
                        gradIn[i] += g * this.weights[i][j];
                    }
                }
                return gradIn;
            }
        }
        this.model = {
            layers: [
                new DenseLayer(inputSize, hiddenSize, 'relu'),
                new DenseLayer(hiddenSize, outputSize, 'softmax')
            ]
        };
        // Train model
        this.train();

        console.log('[Intent Classifier] Ready');
        return true;
    },
    /**
     * Prepare input from text
     */
    prepareInput: function(text) {
        const tokens = PRISM_NLP_ENGINE.tokenize(text);
        const padded = PRISM_NLP_ENGINE.padSequence(tokens, 20);
        const embedded = this.embedding.embed(padded);
        return PRISM_TENSOR_ENHANCED.flatten(embedded);
    },
    /**
     * Train the model
     */
    train: function(epochs = 50) {
        const lr = 0.01;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            // Shuffle training data
            const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);

            for (const sample of shuffled) {
                const input = this.prepareInput(sample.text);
                const targetIdx = this.intents.indexOf(sample.intent);
                const target = Array(this.intents.length).fill(0);
                target[targetIdx] = 1;

                // Forward
                let current = input;
                for (const layer of this.model.layers) {
                    current = layer.forward(current);
                }
                // Cross-entropy loss gradient
                const grad = current.map((o, i) => o - target[i]);
                totalLoss += -Math.log(Math.max(1e-15, current[targetIdx]));

                // Backward
                let g = grad;
                for (let i = this.model.layers.length - 1; i >= 0; i--) {
                    g = this.model.layers[i].backward(g, lr);
                }
            }
            if (epoch % 10 === 0) {
                console.log(`[Intent Classifier] Epoch ${epoch}, Loss: ${(totalLoss / shuffled.length).toFixed(4)}`);
            }
        }
    },
    /**
     * Classify intent
     */
    classify: function(text) {
        if (!this.model) this.initialize();

        const input = this.prepareInput(text);

        let current = input;
        for (const layer of this.model.layers) {
            current = layer.forward(current);
        }
        const maxIdx = current.indexOf(Math.max(...current));
        const confidence = current[maxIdx];

        return {
            intent: this.intents[maxIdx],
            confidence,
            allScores: this.intents.map((intent, i) => ({
                intent,
                score: current[i]
            })).sort((a, b) => b.score - a.score)
        };
    }
};
// SECTION 7: BAYESIAN LEARNING

const PRISM_BAYESIAN_LEARNING = {

    /**
     * Gaussian Process Regression for parameter prediction
     */
    GaussianProcess: class {
        constructor(lengthScale = 1.0, signalVariance = 1.0, noiseVariance = 0.1) {
            this.lengthScale = lengthScale;
            this.signalVariance = signalVariance;
            this.noiseVariance = noiseVariance;
            this.X_train = [];
            this.y_train = [];
            this.K_inv = null;
        }
        // RBF (Radial Basis Function) kernel
        kernel(x1, x2) {
            let sqDist = 0;
            for (let i = 0; i < x1.length; i++) {
                sqDist += Math.pow(x1[i] - x2[i], 2);
            }
            return this.signalVariance * Math.exp(-sqDist / (2 * this.lengthScale * this.lengthScale));
        }
        // Fit training data
        fit(X, y) {
            this.X_train = X;
            this.y_train = y;

            const n = X.length;
            const K = [];

            // Build covariance matrix
            for (let i = 0; i < n; i++) {
                K[i] = [];
                for (let j = 0; j < n; j++) {
                    K[i][j] = this.kernel(X[i], X[j]);
                    if (i === j) K[i][j] += this.noiseVariance;
                }
            }
            // Invert K (using simple Gauss-Jordan for small matrices)
            this.K_inv = this._invertMatrix(K);

            return this;
        }
        // Predict with uncertainty
        predict(X_test) {
            const predictions = [];

            for (const x of X_test) {
                // Compute k_star
                const k_star = this.X_train.map(xi => this.kernel(x, xi));

                // Mean prediction
                let mean = 0;
                for (let i = 0; i < this.X_train.length; i++) {
                    let kInvY = 0;
                    for (let j = 0; j < this.X_train.length; j++) {
                        kInvY += this.K_inv[i][j] * this.y_train[j];
                    }
                    mean += k_star[i] * kInvY;
                }
                // Variance
                const k_star_star = this.kernel(x, x);
                let variance = k_star_star;
                for (let i = 0; i < this.X_train.length; i++) {
                    for (let j = 0; j < this.X_train.length; j++) {
                        variance -= k_star[i] * this.K_inv[i][j] * k_star[j];
                    }
                }
                variance = Math.max(0, variance);

                predictions.push({
                    mean,
                    variance,
                    std: Math.sqrt(variance),
                    lower95: mean - 1.96 * Math.sqrt(variance),
                    upper95: mean + 1.96 * Math.sqrt(variance)
                });
            }
            return predictions;
        }
        // Update with new observation (online learning)
        update(x_new, y_new) {
            this.X_train.push(x_new);
            this.y_train.push(y_new);

            // Refit (for small datasets, this is acceptable)
            // For large datasets, use rank-1 update
            this.fit(this.X_train, this.y_train);

            return this;
        }
        _invertMatrix(matrix) {
            const n = matrix.length;
            const augmented = matrix.map((row, i) => {
                const identityRow = Array(n).fill(0);
                identityRow[i] = 1;
                return [...row, ...identityRow];
            });

            // Forward elimination
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                        maxRow = k;
                    }
                }
                [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

                const pivot = augmented[i][i];
                if (Math.abs(pivot) < 1e-10) continue;

                for (let j = 0; j < 2 * n; j++) {
                    augmented[i][j] /= pivot;
                }
                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = augmented[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            augmented[k][j] -= factor * augmented[i][j];
                        }
                    }
                }
            }
            return augmented.map(row => row.slice(n));
        }
    },
    /**
     * Bayesian Optimization for hyperparameter tuning
     */
    BayesianOptimization: class {
        constructor(bounds, acquisitionFn = 'ei') {
            this.bounds = bounds; // [{min, max}, ...]
            this.acquisitionFn = acquisitionFn;
            this.gp = new PRISM_BAYESIAN_LEARNING.GaussianProcess(1.0, 1.0, 0.01);
            this.X_samples = [];
            this.y_samples = [];
            this.bestX = null;
            this.bestY = -Infinity;
        }
        // Expected Improvement acquisition function
        expectedImprovement(x, xi = 0.01) {
            const pred = this.gp.predict([x])[0];
            const mu = pred.mean;
            const sigma = pred.std;

            if (sigma < 1e-10) return 0;

            const imp = mu - this.bestY - xi;
            const z = imp / sigma;
            const cdf = 0.5 * (1 + this._erf(z / Math.sqrt(2)));
            const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

            return imp * cdf + sigma * pdf;
        }
        _erf(x) {
            const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
            const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
            const sign = x < 0 ? -1 : 1;
            x = Math.abs(x);
            const t = 1.0 / (1.0 + p * x);
            const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
            return sign * y;
        }
        // Suggest next point to evaluate
        suggest() {
            if (this.X_samples.length < 5) {
                // Random sampling for initial exploration
                return this.bounds.map(b => b.min + Math.random() * (b.max - b.min));
            }
            // Grid search over acquisition function
            let bestAcq = -Infinity;
            let bestX = null;

            const gridSize = 20;
            const dims = this.bounds.length;

            for (let i = 0; i < Math.pow(gridSize, Math.min(dims, 3)); i++) {
                const x = this.bounds.map((b, d) => {
                    const idx = Math.floor(i / Math.pow(gridSize, d)) % gridSize;
                    return b.min + (idx / (gridSize - 1)) * (b.max - b.min);
                });

                const acq = this.expectedImprovement(x);
                if (acq > bestAcq) {
                    bestAcq = acq;
                    bestX = x;
                }
            }
            return bestX;
        }
        // Register observation
        observe(x, y) {
            this.X_samples.push(x);
            this.y_samples.push(y);

            if (y > this.bestY) {
                this.bestY = y;
                this.bestX = x;
            }
            this.gp.fit(this.X_samples, this.y_samples);
        }
        // Run optimization
        optimize(objectiveFn, nIterations = 20) {
            for (let i = 0; i < nIterations; i++) {
                const x = this.suggest();
                const y = objectiveFn(x);
                this.observe(x, y);

                console.log(`[BayesOpt] Iteration ${i + 1}: y = ${y.toFixed(4)}, best = ${this.bestY.toFixed(4)}`);
            }
            return { bestX: this.bestX, bestY: this.bestY };
        }
    },
    /**
     * Thompson Sampling for parameter exploration
     */
    ThompsonSampling: class {
        constructor(nArms) {
            this.nArms = nArms;
            this.alpha = Array(nArms).fill(1); // Successes + 1
            this.beta = Array(nArms).fill(1);  // Failures + 1
        }
        // Sample from posterior and select arm
        select() {
            let bestArm = 0;
            let bestSample = -Infinity;

            for (let i = 0; i < this.nArms; i++) {
                // Sample from Beta distribution
                const sample = this._sampleBeta(this.alpha[i], this.beta[i]);
                if (sample > bestSample) {
                    bestSample = sample;
                    bestArm = i;
                }
            }
            return bestArm;
        }
        // Update posterior
        update(arm, reward) {
            if (reward > 0.5) {
                this.alpha[arm] += 1;
            } else {
                this.beta[arm] += 1;
            }
        }
        // Get expected values
        getExpected() {
            return this.alpha.map((a, i) => a / (a + this.beta[i]));
        }
        _sampleBeta(alpha, beta) {
            // Approximate beta sampling using gamma
            const x = this._sampleGamma(alpha);
            const y = this._sampleGamma(beta);
            return x / (x + y);
        }
        _sampleGamma(alpha) {
            // Marsaglia and Tsang's method
            if (alpha < 1) {
                return this._sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
            }
            const d = alpha - 1/3;
            const c = 1 / Math.sqrt(9 * d);
            while (true) {
                let x, v;
                do {
                    x = this._randn();
                    v = 1 + c * x;
                } while (v <= 0);
                v = v * v * v;
                const u = Math.random();
                if (u < 1 - 0.0331 * x * x * x * x) return d * v;
                if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
            }
        }
        _randn() {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
    }
};
// SECTION 8: ADDITIONAL OPTIMIZATION ALGORITHMS

const PRISM_OPTIMIZATION_COMPLETE = {

    /**
     * Simulated Annealing
     */
    SimulatedAnnealing: class {
        constructor(config = {}) {
            this.initialTemp = config.initialTemp || 1000;
            this.coolingRate = config.coolingRate || 0.995;
            this.minTemp = config.minTemp || 0.01;
            this.maxIterations = config.maxIterations || 10000;
        }
        optimize(objectiveFn, initialSolution, neighborFn) {
            let currentSolution = [...initialSolution];
            let currentEnergy = objectiveFn(currentSolution);

            let bestSolution = [...currentSolution];
            let bestEnergy = currentEnergy;

            let temperature = this.initialTemp;
            let iteration = 0;

            while (temperature > this.minTemp && iteration < this.maxIterations) {
                // Generate neighbor
                const neighbor = neighborFn(currentSolution);
                const neighborEnergy = objectiveFn(neighbor);

                // Accept or reject
                const deltaE = neighborEnergy - currentEnergy;

                if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temperature)) {
                    currentSolution = neighbor;
                    currentEnergy = neighborEnergy;

                    if (currentEnergy < bestEnergy) {
                        bestSolution = [...currentSolution];
                        bestEnergy = currentEnergy;
                    }
                }
                // Cool down
                temperature *= this.coolingRate;
                iteration++;
            }
            return {
                solution: bestSolution,
                energy: bestEnergy,
                iterations: iteration
            };
        }
    },
    /**
     * Differential Evolution
     */
    DifferentialEvolution: class {
        constructor(config = {}) {
            this.populationSize = config.populationSize || 50;
            this.F = config.F || 0.8;  // Mutation factor
            this.CR = config.CR || 0.9; // Crossover probability
            this.maxGenerations = config.maxGenerations || 100;
        }
        optimize(objectiveFn, bounds) {
            const dim = bounds.length;

            // Initialize population
            let population = [];
            let fitness = [];

            for (let i = 0; i < this.populationSize; i++) {
                const individual = bounds.map(b => b.min + Math.random() * (b.max - b.min));
                population.push(individual);
                fitness.push(objectiveFn(individual));
            }
            let bestIdx = fitness.indexOf(Math.min(...fitness));
            let bestSolution = [...population[bestIdx]];
            let bestFitness = fitness[bestIdx];

            for (let gen = 0; gen < this.maxGenerations; gen++) {
                for (let i = 0; i < this.populationSize; i++) {
                    // Select 3 random individuals (different from i)
                    const candidates = [];
                    while (candidates.length < 3) {
                        const idx = Math.floor(Math.random() * this.populationSize);
                        if (idx !== i && !candidates.includes(idx)) {
                            candidates.push(idx);
                        }
                    }
                    // Mutation
                    const mutant = population[candidates[0]].map((x, d) =>
                        x + this.F * (population[candidates[1]][d] - population[candidates[2]][d])
                    );

                    // Clip to bounds
                    for (let d = 0; d < dim; d++) {
                        mutant[d] = Math.max(bounds[d].min, Math.min(bounds[d].max, mutant[d]));
                    }
                    // Crossover
                    const jRand = Math.floor(Math.random() * dim);
                    const trial = population[i].map((x, d) =>
                        (Math.random() < this.CR || d === jRand) ? mutant[d] : x
                    );

                    // Selection
                    const trialFitness = objectiveFn(trial);
                    if (trialFitness < fitness[i]) {
                        population[i] = trial;
                        fitness[i] = trialFitness;

                        if (trialFitness < bestFitness) {
                            bestSolution = [...trial];
                            bestFitness = trialFitness;
                        }
                    }
                }
            }
            return {
                solution: bestSolution,
                fitness: bestFitness,
                population,
                allFitness: fitness
            };
        }
    },
    /**
     * CMA-ES (Covariance Matrix Adaptation Evolution Strategy) - Simplified
     */
    CMAES: class {
        constructor(config = {}) {
            this.sigma = config.sigma || 0.5;
            this.lambda = config.lambda || null; // Population size
            this.maxIterations = config.maxIterations || 100;
        }
        optimize(objectiveFn, initialMean, bounds = null) {
            const n = initialMean.length;
            this.lambda = this.lambda || Math.floor(4 + 3 * Math.log(n));
            const mu = Math.floor(this.lambda / 2);

            // Initialize
            let mean = [...initialMean];
            let sigma = this.sigma;
            let C = Array(n).fill(null).map((_, i) =>
                Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
            ); // Identity covariance

            let bestSolution = [...mean];
            let bestFitness = objectiveFn(mean);

            for (let iter = 0; iter < this.maxIterations; iter++) {
                // Sample population
                const samples = [];
                const fitnesses = [];

                for (let i = 0; i < this.lambda; i++) {
                    // Sample from N(mean, sigma^2 * C)
                    const z = Array(n).fill(0).map(() => {
                        const u1 = Math.random();
                        const u2 = Math.random();
                        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                    });

                    // Apply covariance (simplified: diagonal)
                    const sample = mean.map((m, d) => m + sigma * z[d] * Math.sqrt(C[d][d]));

                    // Clip to bounds if provided
                    if (bounds) {
                        for (let d = 0; d < n; d++) {
                            sample[d] = Math.max(bounds[d].min, Math.min(bounds[d].max, sample[d]));
                        }
                    }
                    samples.push(sample);
                    fitnesses.push(objectiveFn(sample));
                }
                // Sort by fitness
                const indices = fitnesses.map((_, i) => i).sort((a, b) => fitnesses[a] - fitnesses[b]);

                // Update best
                if (fitnesses[indices[0]] < bestFitness) {
                    bestFitness = fitnesses[indices[0]];
                    bestSolution = [...samples[indices[0]]];
                }
                // Update mean (weighted average of top mu)
                const newMean = Array(n).fill(0);
                for (let i = 0; i < mu; i++) {
                    const weight = 1 / mu; // Simplified: equal weights
                    for (let d = 0; d < n; d++) {
                        newMean[d] += weight * samples[indices[i]][d];
                    }
                }
                mean = newMean;

                // Update sigma (simplified adaptation)
                sigma *= 0.99;
            }
            return {
                solution: bestSolution,
                fitness: bestFitness
            };
        }
    }
};
// SECTION 9: A/B TESTING FRAMEWORK

const PRISM_AB_TESTING = {

    experiments: new Map(),

    /**
     * Create new experiment
     */
    createExperiment: function(name, variants, config = {}) {
        const experiment = {
            name,
            variants,
            config: {
                minSamples: config.minSamples || 100,
                significanceLevel: config.significanceLevel || 0.05,
                ...config
            },
            data: variants.map(() => ({
                impressions: 0,
                conversions: 0,
                values: []
            })),
            status: 'running',
            created: Date.now(),
            winner: null
        };
        this.experiments.set(name, experiment);
        return experiment;
    },
    /**
     * Get variant assignment (deterministic by user ID)
     */
    getVariant: function(experimentName, userId = null) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment || experiment.status !== 'running') {
            return experiment?.winner || 0;
        }
        // Deterministic assignment based on user ID
        if (userId) {
            let hash = 0;
            for (let i = 0; i < userId.length; i++) {
                hash = ((hash << 5) - hash) + userId.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash) % experiment.variants.length;
        }
        // Random assignment
        return Math.floor(Math.random() * experiment.variants.length);
    },
    /**
     * Record impression
     */
    recordImpression: function(experimentName, variantIdx) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return;

        experiment.data[variantIdx].impressions++;
        this._checkSignificance(experimentName);
    },
    /**
     * Record conversion/success
     */
    recordConversion: function(experimentName, variantIdx, value = 1) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return;

        experiment.data[variantIdx].conversions++;
        experiment.data[variantIdx].values.push(value);
        this._checkSignificance(experimentName);
    },
    /**
     * Check statistical significance
     */
    _checkSignificance: function(experimentName) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment || experiment.status !== 'running') return;

        const { data, config, variants } = experiment;

        // Check if we have enough samples
        const totalSamples = data.reduce((sum, d) => sum + d.impressions, 0);
        if (totalSamples < config.minSamples * variants.length) return;

        // Perform chi-squared test for conversion rates
        const rates = data.map(d => d.conversions / Math.max(1, d.impressions));
        const overallRate = data.reduce((sum, d) => sum + d.conversions, 0) / totalSamples;

        let chiSquared = 0;
        for (let i = 0; i < variants.length; i++) {
            const expected = overallRate * data[i].impressions;
            const observed = data[i].conversions;
            if (expected > 0) {
                chiSquared += Math.pow(observed - expected, 2) / expected;
            }
        }
        // Chi-squared critical value for df=1, alpha=0.05 is ~3.84
        const criticalValue = variants.length === 2 ? 3.84 : 5.99; // df = variants - 1

        if (chiSquared > criticalValue) {
            // Find winner
            const winnerIdx = rates.indexOf(Math.max(...rates));
            experiment.winner = winnerIdx;
            experiment.status = 'completed';
            experiment.completedAt = Date.now();

            (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[A/B Testing] Experiment "${experimentName}" completed. Winner: Variant ${winnerIdx}`);
        }
    },
    /**
     * Get experiment results
     */
    getResults: function(experimentName) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return null;

        const { data, variants, status, winner } = experiment;

        const results = variants.map((name, i) => {
            const d = data[i];
            const rate = d.conversions / Math.max(1, d.impressions);
            const avgValue = d.values.length > 0 ?
                d.values.reduce((a, b) => a + b, 0) / d.values.length : 0;

            // Confidence interval (Wilson score)
            const n = d.impressions;
            const p = rate;
            const z = 1.96;
            const denominator = 1 + z * z / n;
            const center = (p + z * z / (2 * n)) / denominator;
            const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator;

            return {
                variant: name,
                impressions: d.impressions,
                conversions: d.conversions,
                conversionRate: (rate * 100).toFixed(2) + '%',
                avgValue: avgValue.toFixed(2),
                confidenceInterval: {
                    lower: ((center - margin) * 100).toFixed(2) + '%',
                    upper: ((center + margin) * 100).toFixed(2) + '%'
                },
                isWinner: i === winner
            };
        });

        return {
            experimentName,
            status,
            winner: winner !== null ? variants[winner] : null,
            results
        };
    }
};
// SECTION 10: COMPLETE AI SYSTEM INTEGRATION

const PRISM_AI_COMPLETE_SYSTEM = {

    version: '2.0.0',
    name: 'PRISM AI Complete System',
    initialized: false,

    // Components
    tensor: PRISM_TENSOR_ENHANCED,
    layers: PRISM_NN_LAYERS_ADVANCED,
    serialization: PRISM_MODEL_SERIALIZATION,
    onlineLearning: PRISM_ONLINE_LEARNING,
    nlp: PRISM_NLP_ENGINE,
    intentClassifier: PRISM_INTENT_CLASSIFIER,
    bayesian: PRISM_BAYESIAN_LEARNING,
    optimization: PRISM_OPTIMIZATION_COMPLETE,
    abTesting: PRISM_AB_TESTING,

    /**
     * Initialize all components
     */
    initialize: function() {
        console.log('[PRISM AI Complete] Initializing all components...');

        // Initialize NLP
        PRISM_NLP_ENGINE.initVocab();
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('  ✓ NLP Engine initialized (' + PRISM_NLP_ENGINE.vocabSize + ' vocab)');

        // Initialize Intent Classifier
        PRISM_INTENT_CLASSIFIER.initialize();
        console.log('  ✓ Intent Classifier trained');

        this.initialized = true;
        console.log('[PRISM AI Complete] All components ready');

        return { success: true };
    },
    /**
     * Process user query with full NLP pipeline
     */
    processQuery: function(query, context = {}) {
        if (!this.initialized) this.initialize();

        // 1. Tokenize
        const tokens = PRISM_NLP_ENGINE.tokenize(query);

        // 2. Classify intent
        const intent = PRISM_INTENT_CLASSIFIER.classify(query);

        // 3. Extract entities (simple keyword matching for now)
        const entities = this._extractEntities(query);

        return {
            originalQuery: query,
            tokens,
            intent: intent.intent,
            intentConfidence: intent.confidence,
            entities,
            context
        };
    },
    _extractEntities: function(query) {
        const lower = query.toLowerCase();
        const entities = {
            materials: [],
            tools: [],
            operations: [],
            numbers: []
        };
        // Materials
        const materials = ['aluminum', 'steel', 'stainless', 'titanium', 'brass', 'inconel',
                         '6061', '7075', '4140', '304', '316', 'ti-6al-4v'];
        materials.forEach(m => {
            if (lower.includes(m)) entities.materials.push(m);
        });

        // Tools
        const tools = ['endmill', 'drill', 'tap', 'reamer', 'insert', 'face mill'];
        tools.forEach(t => {
            if (lower.includes(t)) entities.tools.push(t);
        });

        // Operations
        const ops = ['roughing', 'finishing', 'drilling', 'tapping', 'boring', 'facing'];
        ops.forEach(o => {
            if (lower.includes(o)) entities.operations.push(o);
        });

        // Numbers with units
        const numberRegex = /(\d+\.?\d*)\s*(mm|inch|in|rpm|sfm|ipm|%)/gi;
        let match;
        while ((match = numberRegex.exec(lower)) !== null) {
            entities.numbers.push({ value: parseFloat(match[1]), unit: match[2] });
        }
        return entities;
    },
    /**
     * Run comprehensive self-tests
     */
    runTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM AI COMPLETE SYSTEM v2.0 - COMPREHENSIVE TESTS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        let passed = 0, failed = 0;

        // Test 1: Tensor Operations
        try {
            const t1 = PRISM_TENSOR_ENHANCED.zeros([3, 3]);
            const t2 = PRISM_TENSOR_ENHANCED.randomNormal([3, 3], 0, 1);
            const t3 = PRISM_TENSOR_ENHANCED.matmul(t1, t2);
            const mean = PRISM_TENSOR_ENHANCED.mean(t2);
            if (t3.length === 3 && typeof mean === 'number') {
                console.log('  ✅ Enhanced Tensor Operations: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Enhanced Tensor Operations: FAIL');
            failed++;
        }
        // Test 2: Conv2D Layer
        try {
            const conv = new PRISM_NN_LAYERS_ADVANCED.Conv2D(1, 4, 3, 1, 1);
            const input = [PRISM_TENSOR_ENHANCED.random([8, 8], 1)];
            const output = conv.forward(input);
            if (output.length === 4 && output[0].length === 8) {
                console.log('  ✅ Conv2D Layer: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Conv2D Layer: FAIL');
            failed++;
        }
        // Test 3: LSTM Layer
        try {
            const lstm = new PRISM_NN_LAYERS_ADVANCED.LSTM(4, 8);
            const sequence = Array(5).fill(null).map(() => PRISM_TENSOR_ENHANCED.random([4], 1));
            const output = lstm.forward(sequence);
            if (output.length === 8) {
                console.log('  ✅ LSTM Layer: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ LSTM Layer: FAIL');
            failed++;
        }
        // Test 4: GRU Layer
        try {
            const gru = new PRISM_NN_LAYERS_ADVANCED.GRU(4, 8);
            const sequence = Array(5).fill(null).map(() => PRISM_TENSOR_ENHANCED.random([4], 1));
            const output = gru.forward(sequence);
            if (output.length === 8) {
                console.log('  ✅ GRU Layer: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ GRU Layer: FAIL');
            failed++;
        }
        // Test 5: MultiHead Attention
        try {
            const attn = new PRISM_NN_LAYERS_ADVANCED.MultiHeadAttention(16, 4);
            const seq = Array(3).fill(null).map(() => PRISM_TENSOR_ENHANCED.random([16], 0.1));
            const output = attn.forward(seq, seq, seq);
            if (output.length === 3 && output[0].length === 16) {
                console.log('  ✅ MultiHead Attention: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ MultiHead Attention: FAIL');
            failed++;
        }
        // Test 6: Model Serialization
        try {
            const model = {
                name: 'test_model',
                layers: [
                    new PRISM_NN_LAYERS_ADVANCED.LayerNorm(10),
                    new PRISM_NN_LAYERS_ADVANCED.BatchNorm1D(10)
                ]
            };
            const json = PRISM_MODEL_SERIALIZATION.toJSON(model);
            const parsed = JSON.parse(json);
            if (parsed.name === 'test_model' && parsed.architecture.length === 2) {
                console.log('  ✅ Model Serialization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Model Serialization: FAIL');
            failed++;
        }
        // Test 7: NLP Tokenization
        try {
            PRISM_NLP_ENGINE.initVocab();
            const tokens = PRISM_NLP_ENGINE.tokenize('calculate speed for aluminum roughing');
            const detokenized = PRISM_NLP_ENGINE.detokenize(tokens);
            if (tokens.length > 3 && tokens[0] === 2) { // START token
                console.log('  ✅ NLP Tokenization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ NLP Tokenization: FAIL');
            failed++;
        }
        // Test 8: Word Embeddings
        try {
            const embedding = PRISM_NLP_ENGINE.createEmbedding(32);
            const tokens = [5, 10, 15];
            const embedded = embedding.embed(tokens);
            if (embedded.length === 3 && embedded[0].length === 32) {
                console.log('  ✅ Word Embeddings: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Word Embeddings: FAIL');
            failed++;
        }
        // Test 9: Intent Classification
        try {
            PRISM_INTENT_CLASSIFIER.initialize();
            const result = PRISM_INTENT_CLASSIFIER.classify('what speed for aluminum');
            if (result.intent && result.confidence > 0) {
                console.log('  ✅ Intent Classification: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Intent Classification: FAIL');
            failed++;
        }
        // Test 10: Gaussian Process
        try {
            const gp = new PRISM_BAYESIAN_LEARNING.GaussianProcess(1.0, 1.0, 0.01);
            const X = [[0], [1], [2], [3]];
            const y = [0, 1, 4, 9];
            gp.fit(X, y);
            const pred = gp.predict([[1.5]]);
            if (pred[0].mean !== undefined && pred[0].std !== undefined) {
                console.log('  ✅ Gaussian Process: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Gaussian Process: FAIL');
            failed++;
        }
        // Test 11: Bayesian Optimization
        try {
            const bo = new PRISM_BAYESIAN_LEARNING.BayesianOptimization([
                { min: 0, max: 10 }
            ]);
            const suggestion = bo.suggest();
            if (suggestion.length === 1 && suggestion[0] >= 0 && suggestion[0] <= 10) {
                console.log('  ✅ Bayesian Optimization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Bayesian Optimization: FAIL');
            failed++;
        }
        // Test 12: Simulated Annealing
        try {
            const sa = new PRISM_OPTIMIZATION_COMPLETE.SimulatedAnnealing({
                initialTemp: 100,
                maxIterations: 100
            });
            const result = sa.optimize(
                x => Math.pow(x[0] - 5, 2),
                [0],
                x => [x[0] + (Math.random() - 0.5) * 2]
            );
            if (result.solution !== undefined && result.energy !== undefined) {
                console.log('  ✅ Simulated Annealing: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Simulated Annealing: FAIL');
            failed++;
        }
        // Test 13: Differential Evolution
        try {
            const de = new PRISM_OPTIMIZATION_COMPLETE.DifferentialEvolution({
                populationSize: 20,
                maxGenerations: 10
            });
            const result = de.optimize(
                x => Math.pow(x[0] - 3, 2) + Math.pow(x[1] - 4, 2),
                [{ min: 0, max: 10 }, { min: 0, max: 10 }]
            );
            if (result.solution.length === 2) {
                console.log('  ✅ Differential Evolution: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Differential Evolution: FAIL');
            failed++;
        }
        // Test 14: Thompson Sampling
        try {
            const ts = new PRISM_BAYESIAN_LEARNING.ThompsonSampling(3);
            const arm = ts.select();
            ts.update(arm, 1);
            const expected = ts.getExpected();
            if (arm >= 0 && arm < 3 && expected.length === 3) {
                console.log('  ✅ Thompson Sampling: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Thompson Sampling: FAIL');
            failed++;
        }
        // Test 15: A/B Testing
        try {
            PRISM_AB_TESTING.createExperiment('test_exp', ['A', 'B']);
            const variant = PRISM_AB_TESTING.getVariant('test_exp');
            PRISM_AB_TESTING.recordImpression('test_exp', variant);
            PRISM_AB_TESTING.recordConversion('test_exp', variant, 1);
            const results = PRISM_AB_TESTING.getResults('test_exp');
            if (results && results.results.length === 2) {
                console.log('  ✅ A/B Testing: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ A/B Testing: FAIL');
            failed++;
        }
        // Test 16: Online Learning
        try {
            const model = {
                layers: [
                    {
                        forward: x => x.map(v => Math.max(0, v)),
                        backward: (g, lr) => g
                    }
                ]
            };
            const result = PRISM_ONLINE_LEARNING.incrementalFit(model, [1, -1, 2], [1, 0, 2], 0.01);
            if (result.loss !== undefined && result.prediction !== undefined) {
                console.log('  ✅ Online Learning: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Online Learning: FAIL');
            failed++;
        }
        // Test 17: Layer Normalization
        try {
            const ln = new PRISM_NN_LAYERS_ADVANCED.LayerNorm(5);
            const input = [1, 2, 3, 4, 5];
            const output = ln.forward(input);
            const mean = output.reduce((a, b) => a + b, 0) / output.length;
            if (Math.abs(mean) < 0.1) { // Should be approximately 0
                console.log('  ✅ Layer Normalization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Layer Normalization: FAIL');
            failed++;
        }
        // Test 18: Batch Normalization
        try {
            const bn = new PRISM_NN_LAYERS_ADVANCED.BatchNorm1D(3);
            const input = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
            const output = bn.forward(input);
            if (output.length === 3 && output[0].length === 3) {
                console.log('  ✅ Batch Normalization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Batch Normalization: FAIL');
            failed++;
        }
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
};
// GATEWAY REGISTRATION

(function registerWithGateway() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        const routes = {
            // Advanced layers
            'ai.layers.conv2d': 'PRISM_NN_LAYERS_ADVANCED.Conv2D',
            'ai.layers.maxpool': 'PRISM_NN_LAYERS_ADVANCED.MaxPool2D',
            'ai.layers.lstm': 'PRISM_NN_LAYERS_ADVANCED.LSTM',
            'ai.layers.gru': 'PRISM_NN_LAYERS_ADVANCED.GRU',
            'ai.layers.attention': 'PRISM_NN_LAYERS_ADVANCED.MultiHeadAttention',
            'ai.layers.layernorm': 'PRISM_NN_LAYERS_ADVANCED.LayerNorm',
            'ai.layers.batchnorm': 'PRISM_NN_LAYERS_ADVANCED.BatchNorm1D',

            // Serialization
            'ai.model.save': 'PRISM_MODEL_SERIALIZATION.saveToStorage',
            'ai.model.load': 'PRISM_MODEL_SERIALIZATION.loadFromStorage',
            'ai.model.export': 'PRISM_MODEL_SERIALIZATION.exportToFile',
            'ai.model.list': 'PRISM_MODEL_SERIALIZATION.listSavedModels',

            // Online learning
            'ai.learn.incremental': 'PRISM_ONLINE_LEARNING.incrementalFit',
            'ai.learn.replay': 'PRISM_ONLINE_LEARNING.onlineLearnWithReplay',

            // NLP
            'ai.nlp.tokenize': 'PRISM_NLP_ENGINE.tokenize',
            'ai.nlp.embed': 'PRISM_NLP_ENGINE.createEmbedding',
            'ai.nlp.intent': 'PRISM_INTENT_CLASSIFIER.classify',

            // Bayesian
            'ai.bayesian.gp': 'PRISM_BAYESIAN_LEARNING.GaussianProcess',
            'ai.bayesian.optimize': 'PRISM_BAYESIAN_LEARNING.BayesianOptimization',
            'ai.bayesian.thompson': 'PRISM_BAYESIAN_LEARNING.ThompsonSampling',

            // Optimization
            'ai.opt.sa': 'PRISM_OPTIMIZATION_COMPLETE.SimulatedAnnealing',
            'ai.opt.de': 'PRISM_OPTIMIZATION_COMPLETE.DifferentialEvolution',
            'ai.opt.cmaes': 'PRISM_OPTIMIZATION_COMPLETE.CMAES',

            // A/B Testing
            'ai.ab.create': 'PRISM_AB_TESTING.createExperiment',
            'ai.ab.variant': 'PRISM_AB_TESTING.getVariant',
            'ai.ab.record': 'PRISM_AB_TESTING.recordConversion',
            'ai.ab.results': 'PRISM_AB_TESTING.getResults',

            // Complete system
            'ai.complete.process': 'PRISM_AI_COMPLETE_SYSTEM.processQuery'
        };
        for (const [route, target] of Object.entries(routes)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log('[PRISM AI Complete] Registered 27 routes with PRISM_GATEWAY');
    }
    if (typeof PRISM_MODULE_REGISTRY !== 'undefined') {
        PRISM_MODULE_REGISTRY.register('PRISM_AI_COMPLETE_SYSTEM', PRISM_AI_COMPLETE_SYSTEM);
        PRISM_MODULE_REGISTRY.register('PRISM_NN_LAYERS_ADVANCED', PRISM_NN_LAYERS_ADVANCED);
        PRISM_MODULE_REGISTRY.register('PRISM_BAYESIAN_LEARNING', PRISM_BAYESIAN_LEARNING);
        PRISM_MODULE_REGISTRY.register('PRISM_OPTIMIZATION_COMPLETE', PRISM_OPTIMIZATION_COMPLETE);
        console.log('[PRISM AI Complete] Registered 4 modules with PRISM_MODULE_REGISTRY');
    }
})();

// WINDOW EXPORTS

if (typeof window !== 'undefined') {
    window.PRISM_TENSOR_ENHANCED = PRISM_TENSOR_ENHANCED;
    window.PRISM_NN_LAYERS_ADVANCED = PRISM_NN_LAYERS_ADVANCED;
    window.PRISM_MODEL_SERIALIZATION = PRISM_MODEL_SERIALIZATION;
    window.PRISM_ONLINE_LEARNING = PRISM_ONLINE_LEARNING;
    window.PRISM_NLP_ENGINE = PRISM_NLP_ENGINE;
    window.PRISM_INTENT_CLASSIFIER = PRISM_INTENT_CLASSIFIER;
    window.PRISM_BAYESIAN_LEARNING = PRISM_BAYESIAN_LEARNING;
    window.PRISM_OPTIMIZATION_COMPLETE = PRISM_OPTIMIZATION_COMPLETE;
    window.PRISM_AB_TESTING = PRISM_AB_TESTING;
    window.PRISM_AI_COMPLETE_SYSTEM = PRISM_AI_COMPLETE_SYSTEM;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_TENSOR_ENHANCED,
        PRISM_NN_LAYERS_ADVANCED,
        PRISM_MODEL_SERIALIZATION,
        PRISM_ONLINE_LEARNING,
        PRISM_NLP_ENGINE,
        PRISM_INTENT_CLASSIFIER,
        PRISM_BAYESIAN_LEARNING,
        PRISM_OPTIMIZATION_COMPLETE,
        PRISM_AB_TESTING,
        PRISM_AI_COMPLETE_SYSTEM
    };
}
// STARTUP LOG

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║              PRISM AI COMPLETE SYSTEM v2.0 - LOADED                          ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
console.log('║                                                                               ║');
console.log('║  NEURAL NETWORK LAYERS:                                                       ║');
console.log('║  ├── Conv2D (Convolutional with He init & Adam)                               ║');
console.log('║  ├── MaxPool2D (Max Pooling with gradient routing)                            ║');
console.log('║  ├── LSTM (Long Short-Term Memory with gates)                                 ║');
console.log('║  ├── GRU (Gated Recurrent Unit)                                               ║');
console.log('║  ├── MultiHeadAttention (Transformer-style)                                   ║');
console.log('║  ├── LayerNorm (Layer Normalization)                                          ║');
console.log('║  ├── BatchNorm1D (Batch Normalization)                                        ║');
console.log('║  └── Flatten (3D→1D conversion)                                               ║');
console.log('║                                                                               ║');
console.log('║  MODEL SERIALIZATION:                                                         ║');
console.log('║  ├── toJSON / fromJSON                                                        ║');
console.log('║  ├── saveToStorage / loadFromStorage                                          ║');
console.log('║  └── exportToFile                                                             ║');
console.log('║                                                                               ║');
console.log('║  ONLINE LEARNING:                                                             ║');
console.log('║  ├── Incremental fit (single sample updates)                                  ║');
console.log('║  ├── Experience replay buffer                                                 ║');
console.log('║  ├── Elastic Weight Consolidation (EWC)                                       ║');
console.log('║  └── Learning rate schedulers                                                 ║');
console.log('║                                                                               ║');
console.log('║  NLP PIPELINE:                                                                ║');
console.log('║  ├── Tokenization (manufacturing vocabulary)                                  ║');
console.log('║  ├── Word embeddings                                                          ║');
console.log('║  ├── Intent classification (neural network)                                   ║');
console.log('║  └── Entity extraction                                                        ║');
console.log('║                                                                               ║');
console.log('║  BAYESIAN LEARNING:                                                           ║');
console.log('║  ├── Gaussian Process Regression                                              ║');
console.log('║  ├── Bayesian Optimization (Expected Improvement)                             ║');

// PRISM AI KNOWLEDGE INTEGRATION v1.0 - INTEGRATED 2026-01-15
// Physics Engine + Swarm Algorithms + Bayesian Learning + Monte Carlo + Kalman
// Connects to PRISM Materials (618+), Machines (813+), Taylor Coefficients
// 28 Gateway Routes | 13/13 Tests Passing

// TOTAL ALGORITHMS INTEGRATED: 210+
// TOTAL COURSES REPRESENTED: 107
// TOTAL MATERIALS: 618+
// TOTAL MACHINES: 813+

console.log('[PRISM AI Integration] Loading Knowledge Integration v1.0...');

// SECTION 1: PHYSICS-BASED MANUFACTURING FORMULAS
// Sources: MIT 2.008, 2.830, Stanford ME353

const PRISM_AI_PHYSICS_ENGINE = {

    // CUTTING MECHANICS - Fundamental Physics

    /**
     * Merchant's Circle - Cutting Force Model
     * Source: MIT 2.008 Lecture 5
     */
    merchantCuttingForce: function(params) {
        const {
            Vc,         // Cutting speed (m/min)
            f,          // Feed per tooth (mm)
            ap,         // Depth of cut (mm)
            ae,         // Width of cut (mm)
            Kc1,        // Specific cutting force at 1mm² (N/mm²)
            mc,         // Cutting force exponent (typically 0.25)
            gamma       // Rake angle (radians)
        } = params;

        // Chip thickness
        const h = f * Math.sin(Math.acos(1 - 2 * ae / (2 * 10))); // Simplified

        // Specific cutting force with chip thickness correction
        const Kc = Kc1 * Math.pow(h, -mc);

        // Cutting force
        const Fc = Kc * ap * f;

        // Shear angle from Merchant's theory
        const phi = Math.PI/4 - gamma/2;

        // Thrust force
        const Ft = Fc * Math.tan(phi - gamma);

        // Power
        const Pc = (Fc * Vc) / (60 * 1000); // kW

        return {
            Fc,         // Main cutting force (N)
            Ft,         // Thrust force (N)
            Pc,         // Cutting power (kW)
            Kc,         // Actual specific cutting force
            phi,        // Shear angle (rad)
            shearAngleDeg: phi * 180 / Math.PI
        };
    },
    /**
     * Taylor Tool Life Equation
     * Source: MIT 2.008, F.W. Taylor's original research
     */
    taylorToolLife: function(Vc, material) {
        // V × T^n = C
        // where: V = cutting speed, T = tool life, n & C are material constants

        const taylorCoeffs = this._getTaylorCoefficients(material);
        const { n, C, Vref, Tref } = taylorCoeffs;

        // Tool life in minutes
        const T = Math.pow(C / Vc, 1/n);

        // Extended Taylor (with feed and DOC)
        // V × T^n × f^a × d^b = C_extended

        return {
            toolLife: T,        // minutes
            n,
            C,
            confidence: taylorCoeffs.confidence || 0.85,
            source: taylorCoeffs.source || 'database'
        };
    },
    /**
     * Extended Taylor with Feed and DOC
     * Source: Machining Data Handbook
     */
    extendedTaylorToolLife: function(Vc, f, ap, material) {
        const coeffs = this._getTaylorCoefficients(material);
        const { n, C, a = 0.3, b = 0.15 } = coeffs;

        // V × T^n × f^a × d^b = C_ext
        // Solving for T: T = (C_ext / (V × f^a × d^b))^(1/n)

        const C_ext = C * Math.pow(0.1, -a) * Math.pow(1.0, -b); // Reference at f=0.1, d=1.0
        const T = Math.pow(C_ext / (Vc * Math.pow(f, a) * Math.pow(ap, b)), 1/n);

        return {
            toolLife: Math.max(0.1, T),
            exponents: { n, a, b },
            reliability: 0.80
        };
    },
    _getTaylorCoefficients: function(material) {
        // Default coefficients by material family
        const defaults = {
            'aluminum': { n: 0.35, C: 800, source: 'handbook' },
            'steel': { n: 0.25, C: 200, source: 'handbook' },
            'stainless': { n: 0.20, C: 150, source: 'handbook' },
            'titanium': { n: 0.15, C: 80, source: 'handbook' },
            'cast_iron': { n: 0.28, C: 180, source: 'handbook' },
            'inconel': { n: 0.12, C: 40, source: 'handbook' },
            'brass': { n: 0.40, C: 500, source: 'handbook' },
            'copper': { n: 0.38, C: 450, source: 'handbook' }
        };
        // Try to get from PRISM database
        if (typeof PRISM_MATERIALS_MASTER !== 'undefined' && material.id) {
            const mat = PRISM_MATERIALS_MASTER.byId?.(material.id);
            if (mat?.taylor_coefficients) {
                return {
                    n: mat.taylor_coefficients.n,
                    C: mat.taylor_coefficients.C,
                    source: 'prism_database',
                    confidence: 0.95
                };
            }
        }
        // Fallback to material family
        const family = (material.family || material.type || 'steel').toLowerCase();
        for (const [key, coeffs] of Object.entries(defaults)) {
            if (family.includes(key)) return coeffs;
        }
        return defaults.steel;
    },
    /**
     * Surface Finish Prediction
     * Source: MIT 2.830, Machining Fundamentals
     */
    predictSurfaceFinish: function(params) {
        const {
            f,          // Feed per rev (mm/rev)
            r,          // Tool nose radius (mm)
            Vc = 100,   // Cutting speed (m/min)
            BUE = false // Built-up edge present
        } = params;

        // Theoretical Ra (geometric)
        // Ra = f² / (32 × r)  [mm] → convert to μm
        const Ra_theoretical = (f * f) / (32 * r) * 1000; // μm

        // Correction factors
        let K_speed = 1.0;
        if (Vc < 50) K_speed = 1.3;     // Low speed = worse finish
        else if (Vc > 200) K_speed = 0.9; // High speed = better

        let K_BUE = BUE ? 2.0 : 1.0;    // BUE doubles roughness

        // Actual Ra
        const Ra_actual = Ra_theoretical * K_speed * K_BUE;

        // Convert to different units
        return {
            Ra_um: Ra_actual,
            Ra_uin: Ra_actual * 39.37,   // microinches
            Rz_um: Ra_actual * 4,        // Approximate Rz
            theoretical: Ra_theoretical,
            factors: { K_speed, K_BUE }
        };
    },
    /**
     * Metal Removal Rate (MRR)
     */
    calculateMRR: function(params) {
        const { Vc, f, ap, ae, D } = params;

        // MRR = Vc × f × ap × ae / D (for milling)
        // MRR = Vc × f × ap (for turning, ae = pi×D)

        const MRR_turning = Vc * f * ap * 1000; // mm³/min
        const MRR_milling = ae * ap * f * (1000 * Vc / (Math.PI * D)); // mm³/min

        return {
            turning: MRR_turning,
            milling: MRR_milling,
            unit: 'mm³/min'
        };
    },
    /**
     * Cutting Temperature (Analytical Model)
     * Source: Shaw's Metal Cutting Principles
     */
    cuttingTemperature: function(params) {
        const {
            Vc,         // m/min
            f,          // mm
            ap,         // mm
            Kc,         // N/mm²
            k = 50,     // Thermal conductivity (W/m·K)
            rho = 7850, // Density (kg/m³)
            cp = 500    // Specific heat (J/kg·K)
        } = params;

        // Heat partition coefficient (fraction to chip)
        const R = 0.9;

        // Shear plane temperature rise
        // ΔT_shear = (R × Kc × f × ap × Vc) / (rho × cp × f × ap × Vc)
        // Simplified: depends on specific cutting energy

        const thermal_number = (rho * cp * Vc / 60) * f / (1000 * k);
        const temp_rise = (R * Kc * Vc / 60) / (rho * cp * Vc / 60 * 0.001);

        // Chip-tool interface temperature
        const T_chip = 20 + temp_rise * 0.5; // Ambient + rise
        const T_tool = 20 + temp_rise * 0.3; // Tool sees less heat

        return {
            T_chip_interface: Math.min(1200, T_chip),
            T_tool_surface: Math.min(800, T_tool),
            thermal_number,
            unit: '°C'
        };
    },
    // CHATTER & STABILITY ANALYSIS
    // Source: Altintas - Manufacturing Automation

    /**
     * Stability Lobe Diagram Calculation
     * Source: Altintas, MIT 2.830
     */
    stabilityLobes: function(params) {
        const {
            fn,         // Natural frequency (Hz)
            zeta,       // Damping ratio
            Kt,         // Cutting coefficient (N/mm²)
            Kr = 0.3,   // Radial to tangential force ratio
            numTeeth,   // Number of cutting edges
            D,          // Tool diameter (mm)
            ae          // Radial depth of cut (mm)
        } = params;

        const lobes = [];

        // For each lobe (k = 0, 1, 2, ...)
        for (let k = 0; k < 5; k++) {
            const lobe = [];

            // Frequency range for this lobe
            for (let fc = fn * 0.5; fc <= fn * 2.0; fc += fn * 0.02) {
                // Phase angle
                const omega = 2 * Math.PI * fc;
                const omega_n = 2 * Math.PI * fn;
                const r = omega / omega_n;

                // Real and imaginary parts of FRF
                const H_re = (1 - r * r) / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
                const H_im = -2 * zeta * r / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);

                // Phase angle
                const psi = Math.atan2(H_im, H_re);

                // Critical depth of cut
                const Lambda_R = -1 / (2 * Kt * Math.sqrt(H_re * H_re + H_im * H_im));

                // Spindle speed for this lobe
                const epsilon = Math.PI - 2 * psi;
                const N = 60 * fc / (numTeeth * (k + epsilon / (2 * Math.PI)));

                // Limiting depth
                const ap_lim = Lambda_R * 2 * 1000; // Convert to mm

                if (N > 0 && ap_lim > 0) {
                    lobe.push({ N: Math.round(N), ap_lim: Math.abs(ap_lim) });
                }
            }
            lobes.push(lobe);
        }
        return {
            lobes,
            naturalFrequency: fn,
            dampingRatio: zeta,
            recommendation: this._findStableZones(lobes)
        };
    },
    _findStableZones: function(lobes) {
        // Find RPM values where all lobes allow maximum DOC
        const stableZones = [];

        // Combine all lobes and find peaks
        const allPoints = lobes.flat().sort((a, b) => a.N - b.N);

        // Simple peak finding
        for (let i = 1; i < allPoints.length - 1; i++) {
            if (allPoints[i].ap_lim > allPoints[i-1].ap_lim &&
                allPoints[i].ap_lim > allPoints[i+1].ap_lim) {
                stableZones.push({
                    rpm: allPoints[i].N,
                    maxDOC: allPoints[i].ap_lim
                });
            }
        }
        return stableZones.slice(0, 5); // Top 5 stable zones
    },
    /**
     * Quick Chatter Risk Assessment
     */
    chatterRiskAssessment: function(params) {
        const {
            spindle_rpm,
            depth_of_cut,
            tool_stickout,
            tool_diameter,
            material_hardness
        } = params;

        // Risk factors
        let risk = 0;

        // High L/D ratio = high risk
        const LD_ratio = tool_stickout / tool_diameter;
        if (LD_ratio > 6) risk += 40;
        else if (LD_ratio > 4) risk += 25;
        else if (LD_ratio > 3) risk += 10;

        // Deep cuts = higher risk
        const DOC_ratio = depth_of_cut / tool_diameter;
        if (DOC_ratio > 1.5) risk += 30;
        else if (DOC_ratio > 1.0) risk += 20;
        else if (DOC_ratio > 0.5) risk += 10;

        // Hard materials = higher risk
        if (material_hardness > 45) risk += 20;
        else if (material_hardness > 30) risk += 10;

        // High spindle speed can be unstable
        if (spindle_rpm > 15000) risk += 15;
        else if (spindle_rpm > 10000) risk += 5;

        return {
            riskScore: Math.min(100, risk),
            level: risk > 60 ? 'HIGH' : risk > 30 ? 'MEDIUM' : 'LOW',
            factors: {
                LD_ratio,
                DOC_ratio,
                hardness: material_hardness
            },
            recommendations: this._getChatterRecommendations(risk, LD_ratio, DOC_ratio)
        };
    },
    _getChatterRecommendations: function(risk, LD, DOC) {
        const recs = [];

        if (LD > 4) {
            recs.push('Reduce tool stickout or use shorter tool');
            recs.push('Consider shrink fit or hydraulic holder');
        }
        if (DOC > 1.0) {
            recs.push('Reduce depth of cut');
            recs.push('Use multiple passes');
        }
        if (risk > 50) {
            recs.push('Reduce feed rate by 20-30%');
            recs.push('Try variable helix endmill');
            recs.push('Adjust RPM to stability lobe');
        }
        return recs;
    }
};
// SECTION 2: SWARM INTELLIGENCE ALGORITHMS
// Sources: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js

const PRISM_SWARM_ALGORITHMS = {

    /**
     * Particle Swarm Optimization for Speed & Feed
     * Optimizes: cycle time, tool life, surface finish
     */
    PSO_SpeedFeed: {

        config: {
            swarmSize: 30,
            maxIterations: 100,
            w: 0.7,     // Inertia weight
            c1: 1.5,    // Cognitive coefficient
            c2: 1.5,    // Social coefficient
            wDecay: 0.99 // Inertia decay
        },
        optimize: function(material, tool, machine, objective = 'balanced') {
            const bounds = this._getBounds(material, tool, machine);

            // Initialize swarm
            const swarm = this._initializeSwarm(bounds);
            let globalBest = { fitness: -Infinity, position: null };

            // Main loop
            for (let iter = 0; iter < this.config.maxIterations; iter++) {
                // Evaluate fitness
                for (const particle of swarm) {
                    const fitness = this._evaluateFitness(particle.position, material, tool, objective);

                    if (fitness > particle.bestFitness) {
                        particle.bestFitness = fitness;
                        particle.bestPosition = [...particle.position];
                    }
                    if (fitness > globalBest.fitness) {
                        globalBest.fitness = fitness;
                        globalBest.position = [...particle.position];
                    }
                }
                // Update particles
                for (const particle of swarm) {
                    this._updateParticle(particle, globalBest, bounds, iter);
                }
            }
            // Decode solution
            return this._decodeSolution(globalBest.position, material, tool);
        },
        _getBounds: function(material, tool, machine) {
            // Get limits from material & machine
            const Vc_min = material.cutting_params?.roughing?.speed?.min || 50;
            const Vc_max = Math.min(
                material.cutting_params?.roughing?.speed?.max || 300,
                machine.max_spindle_speed * Math.PI * tool.diameter / 1000
            );

            return [
                { min: Vc_min, max: Vc_max },           // Cutting speed
                { min: 0.02, max: 0.3 },               // Feed per tooth
                { min: 0.1 * tool.diameter, max: tool.diameter }, // DOC
                { min: 0.1 * tool.diameter, max: tool.diameter }  // WOC
            ];
        },
        _initializeSwarm: function(bounds) {
            return Array(this.config.swarmSize).fill(null).map(() => ({
                position: bounds.map(b => b.min + Math.random() * (b.max - b.min)),
                velocity: bounds.map(b => (Math.random() - 0.5) * (b.max - b.min) * 0.1),
                bestPosition: null,
                bestFitness: -Infinity
            }));
        },
        _updateParticle: function(particle, globalBest, bounds, iter) {
            const w = this.config.w * Math.pow(this.config.wDecay, iter);

            particle.velocity = particle.velocity.map((v, i) => {
                const cognitive = this.config.c1 * Math.random() *
                    ((particle.bestPosition?.[i] || particle.position[i]) - particle.position[i]);
                const social = this.config.c2 * Math.random() *
                    (globalBest.position[i] - particle.position[i]);
                return w * v + cognitive + social;
            });

            particle.position = particle.position.map((p, i) => {
                let newP = p + particle.velocity[i];
                // Clamp to bounds
                newP = Math.max(bounds[i].min, Math.min(bounds[i].max, newP));
                return newP;
            });
        },
        _evaluateFitness: function(position, material, tool, objective) {
            const [Vc, fz, ap, ae] = position;

            // Calculate metrics
            const MRR = ae * ap * fz * tool.num_flutes *
                       (1000 * Vc / (Math.PI * tool.diameter)); // mm³/min

            const toolLife = PRISM_PHYSICS_ENGINE.extendedTaylorToolLife(Vc, fz, ap, material);
            const T = toolLife.toolLife;

            const surfaceFinish = PRISM_PHYSICS_ENGINE.predictSurfaceFinish({
                f: fz * tool.num_flutes,
                r: tool.corner_radius || 0.4
            });
            const Ra = surfaceFinish.Ra_um;

            // Objective functions
            let fitness;
            switch (objective) {
                case 'productivity':
                    fitness = MRR / 10000;
                    break;
                case 'tool_life':
                    fitness = T / 60;
                    break;
                case 'surface_finish':
                    fitness = 10 / (Ra + 0.1);
                    break;
                case 'balanced':
                default:
                    // Multi-objective: weighted sum
                    fitness = 0.4 * (MRR / 10000) +
                             0.3 * (T / 60) +
                             0.3 * (10 / (Ra + 0.1));
            }
            return fitness;
        },
        _decodeSolution: function(position, material, tool) {
            const [Vc, fz, ap, ae] = position;

            const rpm = Math.round(1000 * Vc / (Math.PI * tool.diameter));
            const feed = Math.round(fz * tool.num_flutes * rpm);

            return {
                cuttingSpeed: Math.round(Vc),
                feedPerTooth: Math.round(fz * 1000) / 1000,
                depthOfCut: Math.round(ap * 100) / 100,
                widthOfCut: Math.round(ae * 100) / 100,
                rpm,
                feedRate: feed,
                unit: { speed: 'm/min', feed: 'mm/min', depth: 'mm' }
            };
        }
    },
    /**
     * Ant Colony Optimization for Operation Sequencing
     * Minimizes: tool changes, setup time, total distance
     */
    ACO_OperationSequence: {

        config: {
            numAnts: 20,
            maxIterations: 50,
            alpha: 1.0,      // Pheromone importance
            beta: 2.0,       // Heuristic importance
            evaporation: 0.3,
            Q: 100           // Pheromone deposit factor
        },
        optimize: function(operations, toolChangeTime = 30, rapidFeedRate = 10000) {
            const n = operations.length;
            if (n <= 1) return { sequence: operations, totalTime: 0 };

            // Build distance/cost matrix
            const costs = this._buildCostMatrix(operations, toolChangeTime, rapidFeedRate);

            // Initialize pheromones
            let pheromones = Array(n).fill(null).map(() => Array(n).fill(1.0));

            let bestPath = null;
            let bestCost = Infinity;

            // Main loop
            for (let iter = 0; iter < this.config.maxIterations; iter++) {
                const paths = [];
                const pathCosts = [];

                // Each ant builds a path
                for (let ant = 0; ant < this.config.numAnts; ant++) {
                    const path = this._buildPath(n, pheromones, costs);
                    const cost = this._calculatePathCost(path, costs);

                    paths.push(path);
                    pathCosts.push(cost);

                    if (cost < bestCost) {
                        bestCost = cost;
                        bestPath = [...path];
                    }
                }
                // Update pheromones
                pheromones = this._updatePheromones(pheromones, paths, pathCosts);
            }
            // Return optimized sequence
            return {
                sequence: bestPath.map(i => operations[i]),
                totalTime: bestCost,
                improvement: this._calculateImprovement(operations, bestPath, costs)
            };
        },
        _buildCostMatrix: function(operations, toolChangeTime, rapidFeedRate) {
            const n = operations.length;
            const costs = Array(n).fill(null).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;

                    let cost = 0;

                    // Tool change cost
                    if (operations[i].toolId !== operations[j].toolId) {
                        cost += toolChangeTime;
                    }
                    // Rapid move cost
                    const dx = (operations[j].startX || 0) - (operations[i].endX || 0);
                    const dy = (operations[j].startY || 0) - (operations[i].endY || 0);
                    const dz = (operations[j].startZ || 0) - (operations[i].endZ || 0);
                    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    cost += distance / rapidFeedRate * 60; // seconds

                    // Setup change cost
                    if (operations[i].fixtureId !== operations[j].fixtureId) {
                        cost += 60; // 1 minute fixture change
                    }
                    costs[i][j] = cost;
                }
            }
            return costs;
        },
        _buildPath: function(n, pheromones, costs) {
            const path = [];
            const visited = new Set();

            // Start from random node
            let current = Math.floor(Math.random() * n);
            path.push(current);
            visited.add(current);

            while (path.length < n) {
                const probabilities = [];
                let total = 0;

                for (let j = 0; j < n; j++) {
                    if (visited.has(j)) continue;

                    const tau = Math.pow(pheromones[current][j], this.config.alpha);
                    const eta = Math.pow(1 / (costs[current][j] + 0.1), this.config.beta);
                    const prob = tau * eta;

                    probabilities.push({ node: j, prob });
                    total += prob;
                }
                // Roulette wheel selection
                let rand = Math.random() * total;
                let next = probabilities[0].node;

                for (const { node, prob } of probabilities) {
                    rand -= prob;
                    if (rand <= 0) {
                        next = node;
                        break;
                    }
                }
                path.push(next);
                visited.add(next);
                current = next;
            }
            return path;
        },
        _calculatePathCost: function(path, costs) {
            let total = 0;
            for (let i = 0; i < path.length - 1; i++) {
                total += costs[path[i]][path[i + 1]];
            }
            return total;
        },
        _updatePheromones: function(pheromones, paths, pathCosts) {
            const n = pheromones.length;

            // Evaporation
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    pheromones[i][j] *= (1 - this.config.evaporation);
                }
            }
            // Deposit
            for (let ant = 0; ant < paths.length; ant++) {
                const deposit = this.config.Q / pathCosts[ant];
                const path = paths[ant];

                for (let i = 0; i < path.length - 1; i++) {
                    pheromones[path[i]][path[i + 1]] += deposit;
                    pheromones[path[i + 1]][path[i]] += deposit;
                }
            }
            return pheromones;
        },
        _calculateImprovement: function(operations, bestPath, costs) {
            // Original order cost
            const originalCost = this._calculatePathCost(
                operations.map((_, i) => i), costs
            );
            const optimizedCost = this._calculatePathCost(bestPath, costs);

            return {
                originalTime: originalCost,
                optimizedTime: optimizedCost,
                savedTime: originalCost - optimizedCost,
                improvement: ((originalCost - optimizedCost) / originalCost * 100).toFixed(1) + '%'
            };
        }
    }
};
// SECTION 3: BAYESIAN LEARNING FOR PARAMETER ADAPTATION
// Sources: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js, Stanford CS229

const PRISM_BAYESIAN_SYSTEM = {

    /**
     * Bayesian Speed & Feed Optimizer
     * Learns optimal parameters from user feedback
     */
    BayesianParameterLearner: {

        // Prior distributions for cutting parameters
        priors: {
            speed_multiplier: { mean: 1.0, variance: 0.04 },
            feed_multiplier: { mean: 1.0, variance: 0.04 },
            doc_multiplier: { mean: 1.0, variance: 0.04 }
        },
        // Likelihood model
        likelihood: {
            observation_variance: 0.01
        },
        // Posterior (starts as prior)
        posteriors: null,

        // Observation history
        history: [],

        initialize: function() {
            this.posteriors = JSON.parse(JSON.stringify(this.priors));
            this.history = [];
        },
        /**
         * Update beliefs based on user feedback
         */
        update: function(observation) {
            // observation: { parameter, recommended, actual_used, outcome }
            // outcome: 1 = good, 0.5 = acceptable, 0 = bad

            const { parameter, recommended, actual_used, outcome } = observation;

            if (!this.posteriors) this.initialize();

            // Calculate multiplier used
            const multiplier = actual_used / recommended;

            // Bayesian update for the parameter
            const prior = this.posteriors[`${parameter}_multiplier`];
            const sigma_prior = Math.sqrt(prior.variance);
            const sigma_likelihood = Math.sqrt(this.likelihood.observation_variance);

            // Posterior mean (weighted average)
            const K = prior.variance / (prior.variance + this.likelihood.observation_variance);
            const posterior_mean = prior.mean + K * (multiplier - prior.mean);
            const posterior_variance = (1 - K) * prior.variance;

            // Update posterior
            this.posteriors[`${parameter}_multiplier`] = {
                mean: posterior_mean,
                variance: posterior_variance
            };
            // Store observation
            this.history.push({
                ...observation,
                timestamp: Date.now(),
                posterior_snapshot: JSON.parse(JSON.stringify(this.posteriors))
            });

            return {
                parameter,
                prior_mean: prior.mean,
                posterior_mean,
                confidence: 1 - Math.sqrt(posterior_variance)
            };
        },
        /**
         * Get adjusted recommendation using learned preferences
         */
        adjustRecommendation: function(baseRecommendation) {
            if (!this.posteriors) this.initialize();

            return {
                speed: baseRecommendation.speed * this.posteriors.speed_multiplier.mean,
                feed: baseRecommendation.feed * this.posteriors.feed_multiplier.mean,
                doc: baseRecommendation.doc * this.posteriors.doc_multiplier.mean,
                confidence: {
                    speed: 1 - Math.sqrt(this.posteriors.speed_multiplier.variance),
                    feed: 1 - Math.sqrt(this.posteriors.feed_multiplier.variance),
                    doc: 1 - Math.sqrt(this.posteriors.doc_multiplier.variance)
                }
            };
        },
        /**
         * Thompson Sampling for exploration/exploitation
         */
        thompsonSample: function() {
            if (!this.posteriors) this.initialize();

            const samples = {};

            for (const [key, dist] of Object.entries(this.posteriors)) {
                // Sample from posterior (Gaussian)
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                samples[key] = dist.mean + Math.sqrt(dist.variance) * z;
            }
            return samples;
        }
    },
    /**
     * Gaussian Process for Tool Life Prediction with Uncertainty
     */
    GaussianProcessToolLife: {

        // Training data
        X_train: [],
        y_train: [],

        // Hyperparameters
        lengthScale: 50,    // How similar nearby speeds are
        signalVariance: 1.0,
        noiseVariance: 0.01,

        // Precomputed inverse covariance
        K_inv: null,

        /**
         * RBF Kernel
         */
        kernel: function(x1, x2) {
            const diff = x1 - x2;
            return this.signalVariance * Math.exp(-diff * diff / (2 * this.lengthScale * this.lengthScale));
        },
        /**
         * Add training point
         */
        addObservation: function(speed, actualToolLife) {
            this.X_train.push(speed);
            this.y_train.push(actualToolLife);
            this.K_inv = null; // Invalidate cache
        },
        /**
         * Predict tool life with uncertainty
         */
        predict: function(speed) {
            if (this.X_train.length === 0) {
                // No data - return prior
                return {
                    mean: 30, // Prior mean tool life
                    variance: 100,
                    confidence95: [5, 55]
                };
            }
            // Compute covariance matrix if needed
            if (!this.K_inv) {
                this._computeInverse();
            }
            // k_star: covariance between test point and training points
            const k_star = this.X_train.map(x => this.kernel(speed, x));

            // Mean prediction: k_star^T @ K_inv @ y
            let mean = 0;
            for (let i = 0; i < this.X_train.length; i++) {
                let sum = 0;
                for (let j = 0; j < this.X_train.length; j++) {
                    sum += this.K_inv[i][j] * this.y_train[j];
                }
                mean += k_star[i] * sum;
            }
            // Variance: k(x*, x*) - k_star^T @ K_inv @ k_star
            let variance = this.kernel(speed, speed);
            for (let i = 0; i < this.X_train.length; i++) {
                for (let j = 0; j < this.X_train.length; j++) {
                    variance -= k_star[i] * this.K_inv[i][j] * k_star[j];
                }
            }
            variance = Math.max(0, variance);

            const std = Math.sqrt(variance);

            return {
                mean,
                variance,
                std,
                confidence95: [mean - 1.96 * std, mean + 1.96 * std]
            };
        },
        _computeInverse: function() {
            const n = this.X_train.length;
            const K = [];

            // Build covariance matrix
            for (let i = 0; i < n; i++) {
                K[i] = [];
                for (let j = 0; j < n; j++) {
                    K[i][j] = this.kernel(this.X_train[i], this.X_train[j]);
                    if (i === j) K[i][j] += this.noiseVariance;
                }
            }
            // Simple matrix inversion (for small matrices)
            this.K_inv = this._invertMatrix(K);
        },
        _invertMatrix: function(matrix) {
            const n = matrix.length;
            const aug = matrix.map((row, i) => {
                const newRow = [...row];
                for (let j = 0; j < n; j++) {
                    newRow.push(i === j ? 1 : 0);
                }
                return newRow;
            });

            // Gaussian elimination
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

                const pivot = aug[i][i];
                if (Math.abs(pivot) < 1e-10) continue;

                for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;

                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = aug[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            aug[k][j] -= factor * aug[i][j];
                        }
                    }
                }
            }
            return aug.map(row => row.slice(n));
        }
    }
};
// SECTION 4: NEURAL NETWORK TRAINING WITH REAL DATA
// Uses actual PRISM databases for training

const PRISM_AI_TRAINING_DATA = {

    /**
     * Generate training data from PRISM Materials Database
     */
    generateMaterialTrainingData: function() {
        const trainingData = [];

        // Try to access PRISM_MATERIALS_MASTER
        const materials = this._getMaterials();

        for (const mat of materials) {
            // Create training samples for each material
            const sample = {
                // Input features
                input: [
                    mat.hardness_bhn / 500,           // Normalized hardness
                    mat.tensile_strength / 2000,     // Normalized tensile
                    mat.thermal_conductivity / 400,  // Normalized conductivity
                    mat.machinability_rating / 100,  // Already 0-100 scale
                    this._encodeMaterialFamily(mat.family),
                    mat.density / 10000              // Normalized density
                ],

                // Output targets
                output: {
                    recommended_speed: mat.cutting_params?.roughing?.speed?.nominal || 100,
                    recommended_feed: mat.cutting_params?.roughing?.feed?.nominal || 0.1,
                    taylor_n: mat.taylor_coefficients?.n || 0.25,
                    taylor_C: mat.taylor_coefficients?.C || 200,
                    surface_finish_factor: mat.surface_finish_factor || 1.0
                },
                // Metadata
                meta: {
                    id: mat.id,
                    name: mat.name,
                    family: mat.family
                }
            };
            trainingData.push(sample);
        }
        return trainingData;
    },
    _getMaterials: function() {
        // Try to get from global PRISM database
        if (typeof PRISM_MATERIALS_MASTER !== 'undefined' && PRISM_MATERIALS_MASTER.materials) {
            return PRISM_MATERIALS_MASTER.materials;
        }
        // Fallback to representative dataset
        return this._getRepresentativeMaterials();
    },
    _getRepresentativeMaterials: function() {
        // Representative materials for training
        return [
            // Aluminum
            { id: 'M0001', name: 'Aluminum 6061-T6', family: 'aluminum', hardness_bhn: 95, tensile_strength: 310, thermal_conductivity: 167, machinability_rating: 90, density: 2700, cutting_params: { roughing: { speed: { nominal: 300 }, feed: { nominal: 0.15 }}}, taylor_coefficients: { n: 0.35, C: 800 }},
            { id: 'M0002', name: 'Aluminum 7075-T6', family: 'aluminum', hardness_bhn: 150, tensile_strength: 572, thermal_conductivity: 130, machinability_rating: 70, density: 2810, cutting_params: { roughing: { speed: { nominal: 250 }, feed: { nominal: 0.12 }}}, taylor_coefficients: { n: 0.32, C: 700 }},
            { id: 'M0003', name: 'Aluminum 2024-T4', family: 'aluminum', hardness_bhn: 120, tensile_strength: 469, thermal_conductivity: 121, machinability_rating: 75, density: 2780, cutting_params: { roughing: { speed: { nominal: 275 }, feed: { nominal: 0.13 }}}, taylor_coefficients: { n: 0.33, C: 750 }},

            // Steel
            { id: 'M0010', name: 'Steel 1018', family: 'steel', hardness_bhn: 126, tensile_strength: 440, thermal_conductivity: 51, machinability_rating: 70, density: 7870, cutting_params: { roughing: { speed: { nominal: 120 }, feed: { nominal: 0.2 }}}, taylor_coefficients: { n: 0.25, C: 200 }},
            { id: 'M0011', name: 'Steel 1045', family: 'steel', hardness_bhn: 179, tensile_strength: 585, thermal_conductivity: 49, machinability_rating: 55, density: 7850, cutting_params: { roughing: { speed: { nominal: 100 }, feed: { nominal: 0.18 }}}, taylor_coefficients: { n: 0.22, C: 175 }},
            { id: 'M0012', name: 'Steel 4140', family: 'steel', hardness_bhn: 197, tensile_strength: 655, thermal_conductivity: 42, machinability_rating: 50, density: 7850, cutting_params: { roughing: { speed: { nominal: 90 }, feed: { nominal: 0.15 }}}, taylor_coefficients: { n: 0.20, C: 150 }},
            { id: 'M0013', name: 'Steel 4340', family: 'steel', hardness_bhn: 217, tensile_strength: 745, thermal_conductivity: 38, machinability_rating: 45, density: 7850, cutting_params: { roughing: { speed: { nominal: 80 }, feed: { nominal: 0.12 }}}, taylor_coefficients: { n: 0.18, C: 130 }},

            // Stainless Steel
            { id: 'M0020', name: 'Stainless 304', family: 'stainless', hardness_bhn: 201, tensile_strength: 515, thermal_conductivity: 16, machinability_rating: 40, density: 8000, cutting_params: { roughing: { speed: { nominal: 60 }, feed: { nominal: 0.1 }}}, taylor_coefficients: { n: 0.20, C: 150 }},
            { id: 'M0021', name: 'Stainless 316', family: 'stainless', hardness_bhn: 217, tensile_strength: 580, thermal_conductivity: 16, machinability_rating: 35, density: 8000, cutting_params: { roughing: { speed: { nominal: 55 }, feed: { nominal: 0.08 }}}, taylor_coefficients: { n: 0.18, C: 130 }},
            { id: 'M0022', name: 'Stainless 17-4 PH', family: 'stainless', hardness_bhn: 352, tensile_strength: 1100, thermal_conductivity: 18, machinability_rating: 30, density: 7800, cutting_params: { roughing: { speed: { nominal: 45 }, feed: { nominal: 0.08 }}}, taylor_coefficients: { n: 0.15, C: 100 }},

            // Titanium
            { id: 'M0030', name: 'Titanium Grade 2', family: 'titanium', hardness_bhn: 200, tensile_strength: 345, thermal_conductivity: 17, machinability_rating: 35, density: 4510, cutting_params: { roughing: { speed: { nominal: 50 }, feed: { nominal: 0.1 }}}, taylor_coefficients: { n: 0.15, C: 80 }},
            { id: 'M0031', name: 'Ti-6Al-4V', family: 'titanium', hardness_bhn: 334, tensile_strength: 895, thermal_conductivity: 7, machinability_rating: 22, density: 4430, cutting_params: { roughing: { speed: { nominal: 40 }, feed: { nominal: 0.08 }}}, taylor_coefficients: { n: 0.12, C: 60 }},

            // Nickel Alloys
            { id: 'M0040', name: 'Inconel 718', family: 'nickel', hardness_bhn: 363, tensile_strength: 1240, thermal_conductivity: 11, machinability_rating: 15, density: 8190, cutting_params: { roughing: { speed: { nominal: 25 }, feed: { nominal: 0.05 }}}, taylor_coefficients: { n: 0.12, C: 40 }},
            { id: 'M0041', name: 'Hastelloy X', family: 'nickel', hardness_bhn: 241, tensile_strength: 785, thermal_conductivity: 9, machinability_rating: 18, density: 8220, cutting_params: { roughing: { speed: { nominal: 20 }, feed: { nominal: 0.05 }}}, taylor_coefficients: { n: 0.10, C: 35 }},

            // Cast Iron
            { id: 'M0050', name: 'Gray Cast Iron', family: 'cast_iron', hardness_bhn: 200, tensile_strength: 250, thermal_conductivity: 46, machinability_rating: 65, density: 7200, cutting_params: { roughing: { speed: { nominal: 100 }, feed: { nominal: 0.25 }}}, taylor_coefficients: { n: 0.28, C: 180 }},
            { id: 'M0051', name: 'Ductile Iron', family: 'cast_iron', hardness_bhn: 170, tensile_strength: 415, thermal_conductivity: 36, machinability_rating: 60, density: 7100, cutting_params: { roughing: { speed: { nominal: 90 }, feed: { nominal: 0.2 }}}, taylor_coefficients: { n: 0.25, C: 170 }},

            // Copper Alloys
            { id: 'M0060', name: 'Brass 360', family: 'copper', hardness_bhn: 78, tensile_strength: 385, thermal_conductivity: 115, machinability_rating: 100, density: 8500, cutting_params: { roughing: { speed: { nominal: 250 }, feed: { nominal: 0.2 }}}, taylor_coefficients: { n: 0.40, C: 500 }},
            { id: 'M0061', name: 'Bronze C932', family: 'copper', hardness_bhn: 65, tensile_strength: 240, thermal_conductivity: 59, machinability_rating: 80, density: 8800, cutting_params: { roughing: { speed: { nominal: 200 }, feed: { nominal: 0.18 }}}, taylor_coefficients: { n: 0.38, C: 450 }},

            // Plastics
            { id: 'M0070', name: 'Delrin (POM)', family: 'plastic', hardness_bhn: 120, tensile_strength: 70, thermal_conductivity: 0.31, machinability_rating: 95, density: 1410, cutting_params: { roughing: { speed: { nominal: 300 }, feed: { nominal: 0.3 }}}, taylor_coefficients: { n: 0.50, C: 1000 }},
            { id: 'M0071', name: 'PEEK', family: 'plastic', hardness_bhn: 126, tensile_strength: 100, thermal_conductivity: 0.25, machinability_rating: 85, density: 1320, cutting_params: { roughing: { speed: { nominal: 250 }, feed: { nominal: 0.25 }}}, taylor_coefficients: { n: 0.45, C: 900 }},
            { id: 'M0072', name: 'Nylon 6/6', family: 'plastic', hardness_bhn: 121, tensile_strength: 85, thermal_conductivity: 0.25, machinability_rating: 90, density: 1140, cutting_params: { roughing: { speed: { nominal: 280 }, feed: { nominal: 0.28 }}}, taylor_coefficients: { n: 0.48, C: 950 }}
        ];
    },
    _encodeMaterialFamily: function(family) {
        const families = {
            'aluminum': 0.1,
            'steel': 0.3,
            'stainless': 0.4,
            'titanium': 0.6,
            'nickel': 0.7,
            'cast_iron': 0.5,
            'copper': 0.2,
            'plastic': 0.05
        };
        for (const [key, val] of Object.entries(families)) {
            if (family?.toLowerCase().includes(key)) return val;
        }
        return 0.5; // Default
    },
    /**
     * Generate training data for tool wear prediction
     */
    generateToolWearTrainingData: function() {
        const trainingData = [];
        const materials = this._getMaterials();

        for (const mat of materials) {
            // Generate samples at different cutting conditions
            const speeds = [0.5, 0.75, 1.0, 1.25, 1.5].map(
                m => (mat.cutting_params?.roughing?.speed?.nominal || 100) * m
            );

            for (const speed of speeds) {
                // Calculate theoretical tool life
                const taylorN = mat.taylor_coefficients?.n || 0.25;
                const taylorC = mat.taylor_coefficients?.C || 200;
                const toolLife = Math.pow(taylorC / speed, 1 / taylorN);

                // Create sample
                trainingData.push({
                    input: [
                        speed / 500,                          // Normalized speed
                        (mat.cutting_params?.roughing?.feed?.nominal || 0.1) / 0.5,  // Normalized feed
                        mat.hardness_bhn / 500,               // Normalized hardness
                        mat.thermal_conductivity / 400,       // Normalized conductivity
                        this._encodeMaterialFamily(mat.family),
                        0.5                                   // Mid-range DOC
                    ],
                    output: [
                        Math.min(1, toolLife / 120),          // Normalized tool life (max 120 min)
                        toolLife > 30 ? 0 : toolLife > 15 ? 0.33 : toolLife > 5 ? 0.66 : 1  // Wear severity
                    ],
                    meta: {
                        material: mat.name,
                        speed,
                        toolLife
                    }
                });
            }
        }
        return trainingData;
    },
    /**
     * Generate training data for surface finish prediction
     */
    generateSurfaceFinishTrainingData: function() {
        const trainingData = [];

        // Generate samples across parameter ranges
        const feeds = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
        const noseRadii = [0.2, 0.4, 0.8, 1.2, 1.6];
        const speeds = [50, 100, 150, 200, 250, 300];

        for (const f of feeds) {
            for (const r of noseRadii) {
                for (const Vc of speeds) {
                    // Theoretical Ra
                    const Ra_theo = (f * f) / (32 * r) * 1000;

                    // Speed correction
                    let K_speed = 1.0;
                    if (Vc < 50) K_speed = 1.3;
                    else if (Vc > 200) K_speed = 0.85;
                    else K_speed = 1.15 - 0.0015 * Vc;

                    const Ra_actual = Ra_theo * K_speed;

                    trainingData.push({
                        input: [
                            f / 0.5,          // Normalized feed
                            r / 2.0,          // Normalized nose radius
                            Vc / 400,         // Normalized speed
                            0.5,              // Material factor (average)
                            0.5               // Tool condition (average)
                        ],
                        output: [
                            Math.min(1, Ra_actual / 10)  // Normalized Ra (max 10 µm)
                        ],
                        meta: {
                            feed: f,
                            noseRadius: r,
                            speed: Vc,
                            Ra: Ra_actual
                        }
                    });
                }
            }
        }
        return trainingData;
    }
};
// SECTION 5: MONTE CARLO SIMULATION
// Sources: PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js

const PRISM_MONTE_CARLO = {

    /**
     * Simulate cycle time with uncertainty
     */
    simulateCycleTime: function(params, uncertainties, numSamples = 5000) {
        const {
            baseCycleTime,      // Base cycle time (minutes)
            operations = []     // List of operations
        } = params;

        const samples = [];

        for (let i = 0; i < numSamples; i++) {
            let time = baseCycleTime;

            // Apply uncertainties
            for (const [param, unc] of Object.entries(uncertainties)) {
                // Box-Muller for normal distribution
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

                time *= (1 + z * unc.stdDev * unc.sensitivity);
            }
            // Add random delays
            if (Math.random() < 0.05) time += 2;  // 5% chance of 2-min delay
            if (Math.random() < 0.02) time += 10; // 2% chance of 10-min delay

            samples.push(Math.max(0, time));
        }
        // Statistics
        samples.sort((a, b) => a - b);
        const mean = samples.reduce((a, b) => a + b, 0) / numSamples;
        const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / numSamples;

        return {
            mean,
            stdDev: Math.sqrt(variance),
            median: samples[Math.floor(numSamples / 2)],
            percentile10: samples[Math.floor(0.10 * numSamples)],
            percentile90: samples[Math.floor(0.90 * numSamples)],
            percentile95: samples[Math.floor(0.95 * numSamples)],
            percentile99: samples[Math.floor(0.99 * numSamples)],
            min: samples[0],
            max: samples[numSamples - 1],
            samples: samples.length
        };
    },
    /**
     * Simulate tool life distribution
     */
    simulateToolLife: function(params, numSamples = 5000) {
        const {
            baseToolLife,   // Expected tool life (minutes)
            material,
            speed,
            feed
        } = params;

        const samples = [];

        // Tool life typically follows Weibull distribution
        const shape = 3;  // Shape parameter (beta)
        const scale = baseToolLife * 1.13; // Scale parameter (eta)

        for (let i = 0; i < numSamples; i++) {
            // Weibull sampling using inverse CDF
            const u = Math.random();
            const T = scale * Math.pow(-Math.log(1 - u), 1 / shape);

            // Apply process variations
            const speedVariation = 1 + (Math.random() - 0.5) * 0.1;
            const feedVariation = 1 + (Math.random() - 0.5) * 0.1;

            const adjustedT = T * Math.pow(speedVariation, -1/0.25) * Math.pow(feedVariation, -0.3);

            samples.push(Math.max(0.5, adjustedT));
        }
        samples.sort((a, b) => a - b);
        const mean = samples.reduce((a, b) => a + b, 0) / numSamples;

        return {
            mean,
            median: samples[Math.floor(numSamples / 2)],
            percentile10: samples[Math.floor(0.10 * numSamples)],
            percentile90: samples[Math.floor(0.90 * numSamples)],
            recommendedChangeInterval: samples[Math.floor(0.10 * numSamples)], // Conservative
            distribution: 'Weibull',
            params: { shape, scale }
        };
    },
    /**
     * Risk analysis for parameter selection
     */
    riskAnalysis: function(params, iterations = 1000) {
        const { speed, feed, doc, material, constraints } = params;

        let failures = 0;
        let toolBreakages = 0;
        let chatterEvents = 0;
        let qualityIssues = 0;

        for (let i = 0; i < iterations; i++) {
            // Random variations
            const actualSpeed = speed * (1 + (Math.random() - 0.5) * 0.2);
            const actualFeed = feed * (1 + (Math.random() - 0.5) * 0.2);
            const actualDoc = doc * (1 + (Math.random() - 0.5) * 0.2);

            // Check constraints
            if (constraints.maxSpeed && actualSpeed > constraints.maxSpeed) failures++;
            if (constraints.maxForce) {
                const force = actualFeed * actualDoc * (material.Kc1 || 1500);
                if (force > constraints.maxForce) failures++;
                if (force > constraints.maxForce * 1.5) toolBreakages++;
            }
            // Chatter check (simplified)
            const LD = (constraints.toolStickout || 50) / (constraints.toolDiameter || 10);
            if (LD > 4 && actualDoc > 0.5 * (constraints.toolDiameter || 10)) {
                if (Math.random() < 0.3) chatterEvents++;
            }
            // Surface finish check
            const Ra = (actualFeed * actualFeed) / (32 * (constraints.noseRadius || 0.4)) * 1000;
            if (constraints.maxRa && Ra > constraints.maxRa) {
                qualityIssues++;
            }
        }
        return {
            totalIterations: iterations,
            failureRate: failures / iterations,
            toolBreakageRisk: toolBreakages / iterations,
            chatterRisk: chatterEvents / iterations,
            qualityRisk: qualityIssues / iterations,
            overallRisk: (failures + toolBreakages * 2 + chatterEvents + qualityIssues) / (iterations * 5),
            recommendation: this._getRiskRecommendation(failures / iterations, toolBreakages / iterations)
        };
    },
    _getRiskRecommendation: function(failureRate, breakageRate) {
        if (breakageRate > 0.05) {
            return 'HIGH RISK: Reduce parameters by 20-30%';
        } else if (failureRate > 0.2) {
            return 'MODERATE RISK: Consider reducing parameters by 10-15%';
        } else if (failureRate > 0.1) {
            return 'LOW RISK: Parameters acceptable with monitoring';
        } else {
            return 'SAFE: Parameters within acceptable range';
        }
    }
};
// SECTION 6: KALMAN FILTER FOR ADAPTIVE CONTROL
// Sources: MIT 6.241, PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js

const PRISM_KALMAN_FILTER = {

    /**
     * Extended Kalman Filter for Tool Wear Estimation
     */
    ToolWearEKF: {
        // State: [wear_amount, wear_rate]
        x: [0, 0.001],

        // State covariance
        P: [[0.1, 0], [0, 0.0001]],

        // Process noise
        Q: [[0.01, 0], [0, 0.00001]],

        // Measurement noise
        R: [[0.1]],

        // Time step
        dt: 1, // minutes

        /**
         * Predict step
         */
        predict: function() {
            // State transition: wear grows at wear_rate
            const x_new = [
                this.x[0] + this.x[1] * this.dt,
                this.x[1] * 1.001 // Wear rate slowly increases
            ];

            // State transition Jacobian
            const F = [
                [1, this.dt],
                [0, 1.001]
            ];

            // Covariance prediction
            const P_new = [
                [F[0][0] * this.P[0][0] + F[0][1] * this.P[1][0], F[0][0] * this.P[0][1] + F[0][1] * this.P[1][1]],
                [F[1][0] * this.P[0][0] + F[1][1] * this.P[1][0], F[1][0] * this.P[0][1] + F[1][1] * this.P[1][1]]
            ];

            // Add process noise
            this.P = [
                [P_new[0][0] + this.Q[0][0], P_new[0][1] + this.Q[0][1]],
                [P_new[1][0] + this.Q[1][0], P_new[1][1] + this.Q[1][1]]
            ];

            this.x = x_new;

            return { state: [...this.x], covariance: this.P.map(r => [...r]) };
        },
        /**
         * Update step with measurement
         */
        update: function(measurement) {
            // Measurement model: z = wear_amount + noise
            const H = [[1, 0]];

            // Innovation
            const y = measurement - this.x[0];

            // Innovation covariance
            const S = this.P[0][0] + this.R[0][0];

            // Kalman gain
            const K = [this.P[0][0] / S, this.P[1][0] / S];

            // State update
            this.x = [
                this.x[0] + K[0] * y,
                this.x[1] + K[1] * y
            ];

            // Covariance update
            this.P = [
                [(1 - K[0]) * this.P[0][0], (1 - K[0]) * this.P[0][1]],
                [-K[1] * this.P[0][0] + this.P[1][0], -K[1] * this.P[0][1] + this.P[1][1]]
            ];

            return {
                wearAmount: this.x[0],
                wearRate: this.x[1],
                uncertainty: Math.sqrt(this.P[0][0]),
                remainingLife: this._estimateRemainingLife()
            };
        },
        _estimateRemainingLife: function() {
            const maxWear = 0.3; // mm maximum wear
            const currentWear = this.x[0];
            const wearRate = this.x[1];

            if (wearRate <= 0) return Infinity;
            return (maxWear - currentWear) / wearRate;
        },
        reset: function() {
            this.x = [0, 0.001];
            this.P = [[0.1, 0], [0, 0.0001]];
        }
    },
    /**
     * Kalman Filter for Feed Rate Control
     */
    FeedRateKF: {
        // State: [actual_feed, feed_error]
        x: [0, 0],
        P: [[1, 0], [0, 0.1]],
        Q: [[0.01, 0], [0, 0.001]],
        R: [[0.1]],

        predict: function(commandedFeed) {
            // State transition: actual feed approaches commanded
            const alpha = 0.8; // Response factor
            this.x = [
                alpha * this.x[0] + (1 - alpha) * commandedFeed,
                this.x[1]
            ];

            // Add process noise
            this.P[0][0] += this.Q[0][0];
            this.P[1][1] += this.Q[1][1];

            return this.x[0];
        },
        update: function(measuredFeed) {
            const y = measuredFeed - this.x[0];
            const S = this.P[0][0] + this.R[0][0];
            const K = [this.P[0][0] / S, this.P[1][0] / S];

            this.x = [
                this.x[0] + K[0] * y,
                y // Error is the innovation
            ];

            this.P[0][0] *= (1 - K[0]);

            return {
                estimatedFeed: this.x[0],
                feedError: this.x[1],
                uncertainty: Math.sqrt(this.P[0][0])
            };
        }
    }
};
// SECTION 7: COMPLETE AI SYSTEM INTEGRATION
// Connects all algorithms and databases

const PRISM_AI_INTEGRATED_SYSTEM = {

    version: '1.0.0',

    // Component references
    physics: PRISM_PHYSICS_ENGINE,
    swarm: PRISM_SWARM_ALGORITHMS,
    bayesian: PRISM_BAYESIAN_SYSTEM,
    trainingData: PRISM_AI_TRAINING_DATA,
    monteCarlo: PRISM_MONTE_CARLO,
    kalman: PRISM_KALMAN_FILTER,

    // Initialization status
    initialized: false,

    /**
     * Initialize the integrated AI system
     */
    initialize: function() {
        console.log('[PRISM AI Integration] Initializing integrated system...');

        // Generate training data
        const materialData = this.trainingData.generateMaterialTrainingData();
        console.log(`  ✓ Generated ${materialData.length} material training samples`);

        const toolWearData = this.trainingData.generateToolWearTrainingData();
        console.log(`  ✓ Generated ${toolWearData.length} tool wear training samples`);

        const surfaceFinishData = this.trainingData.generateSurfaceFinishTrainingData();
        console.log(`  ✓ Generated ${surfaceFinishData.length} surface finish training samples`);

        // Initialize Bayesian learner
        this.bayesian.BayesianParameterLearner.initialize();
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('  ✓ Bayesian parameter learner initialized');

        // Reset Kalman filters
        this.kalman.ToolWearEKF.reset();
        console.log('  ✓ Kalman filters reset');

        this.initialized = true;
        console.log('[PRISM AI Integration] System ready');

        return {
            materialSamples: materialData.length,
            toolWearSamples: toolWearData.length,
            surfaceFinishSamples: surfaceFinishData.length
        };
    },
    /**
     * Comprehensive speed & feed recommendation
     */
    recommendSpeedFeed: function(params) {
        const { material, tool, machine, operation = 'roughing', objective = 'balanced' } = params;

        // 1. Physics-based baseline
        const baseline = this._getBaselineParams(material, tool, operation);

        // 2. PSO optimization
        const optimized = this.swarm.PSO_SpeedFeed.optimize(material, tool, machine, objective);

        // 3. Bayesian adjustment from learned preferences
        const adjusted = this.bayesian.BayesianParameterLearner.adjustRecommendation({
            speed: optimized.cuttingSpeed,
            feed: optimized.feedRate,
            doc: optimized.depthOfCut
        });

        // 4. Monte Carlo risk analysis
        const risk = this.monteCarlo.riskAnalysis({
            speed: adjusted.speed,
            feed: adjusted.feed,
            doc: adjusted.doc,
            material,
            constraints: {
                maxSpeed: machine.max_spindle_speed * Math.PI * tool.diameter / 1000,
                maxForce: machine.max_power * 60000 / baseline.speed,
                toolDiameter: tool.diameter,
                toolStickout: tool.stickout || tool.length * 0.7,
                noseRadius: tool.corner_radius || 0.4
            }
        });

        // 5. Tool life prediction
        const toolLife = this.physics.extendedTaylorToolLife(
            adjusted.speed,
            adjusted.feed / (tool.num_flutes * optimized.rpm / 60),
            adjusted.doc,
            material
        );

        // 6. Surface finish prediction
        const surfaceFinish = this.physics.predictSurfaceFinish({
            f: adjusted.feed / optimized.rpm,
            r: tool.corner_radius || 0.4,
            Vc: adjusted.speed
        });

        return {
            recommendation: {
                cuttingSpeed: Math.round(adjusted.speed),
                rpm: Math.round(adjusted.speed * 1000 / (Math.PI * tool.diameter)),
                feedRate: Math.round(adjusted.feed),
                feedPerTooth: optimized.feedPerTooth,
                depthOfCut: adjusted.doc,
                widthOfCut: optimized.widthOfCut
            },
            predictions: {
                toolLife: Math.round(toolLife.toolLife),
                surfaceFinish: Math.round(surfaceFinish.Ra_um * 100) / 100,
                mrr: Math.round(adjusted.speed * adjusted.feed * adjusted.doc / 1000)
            },
            confidence: {
                speed: adjusted.confidence.speed,
                feed: adjusted.confidence.feed,
                doc: adjusted.confidence.doc
            },
            risk: {
                level: risk.recommendation,
                failureRate: risk.failureRate,
                chatterRisk: risk.chatterRisk
            },
            sources: ['physics', 'pso_optimization', 'bayesian_learning', 'monte_carlo']
        };
    },
    _getBaselineParams: function(material, tool, operation) {
        // Get from material database
        const params = material.cutting_params?.[operation] || material.cutting_params?.roughing;

        return {
            speed: params?.speed?.nominal || 100,
            feed: params?.feed?.nominal || 0.1,
            doc: tool.diameter * (operation === 'roughing' ? 0.5 : 0.1)
        };
    },
    /**
     * Predict tool life with uncertainty
     */
    predictToolLife: function(params) {
        const { material, speed, feed, doc } = params;

        // Physics-based prediction
        const taylorLife = this.physics.extendedTaylorToolLife(speed, feed, doc, material);

        // Gaussian Process prediction with uncertainty
        const gpPrediction = this.bayesian.GaussianProcessToolLife.predict(speed);

        // Monte Carlo simulation
        const mcSimulation = this.monteCarlo.simulateToolLife({
            baseToolLife: taylorLife.toolLife,
            material,
            speed,
            feed
        });

        return {
            expected: taylorLife.toolLife,
            withUncertainty: {
                mean: gpPrediction.mean || taylorLife.toolLife,
                confidence95: gpPrediction.confidence95 || [
                    taylorLife.toolLife * 0.7,
                    taylorLife.toolLife * 1.3
                ]
            },
            distribution: {
                mean: mcSimulation.mean,
                median: mcSimulation.median,
                percentile10: mcSimulation.percentile10,
                percentile90: mcSimulation.percentile90
            },
            recommendedChangeInterval: mcSimulation.recommendedChangeInterval,
            sources: ['taylor_equation', 'gaussian_process', 'monte_carlo']
        };
    },
    /**
     * Analyze chatter stability
     */
    analyzeChatterStability: function(params) {
        const { tool, spindle, material } = params;

        // Quick risk assessment
        const quickRisk = this.physics.chatterRiskAssessment({
            spindle_rpm: spindle.rpm,
            depth_of_cut: params.doc,
            tool_stickout: tool.stickout || tool.length * 0.7,
            tool_diameter: tool.diameter,
            material_hardness: material.hardness_bhn || 200
        });

        // Stability lobes (if we have dynamic data)
        let lobes = null;
        if (tool.natural_frequency && tool.damping_ratio) {
            lobes = this.physics.stabilityLobes({
                fn: tool.natural_frequency,
                zeta: tool.damping_ratio,
                Kt: material.Kc1 || 1500,
                numTeeth: tool.num_flutes || 4,
                D: tool.diameter,
                ae: params.ae || tool.diameter * 0.5
            });
        }
        return {
            riskLevel: quickRisk.level,
            riskScore: quickRisk.riskScore,
            factors: quickRisk.factors,
            recommendations: quickRisk.recommendations,
            stabilityLobes: lobes,
            sources: ['risk_model', lobes ? 'stability_theory' : null].filter(Boolean)
        };
    },
    /**
     * Run comprehensive self-tests
     */
    runTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM AI KNOWLEDGE INTEGRATION v1.0 - SELF TESTS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        let passed = 0, failed = 0;

        // Test 1: Physics Engine - Cutting Force
        try {
            const force = this.physics.merchantCuttingForce({
                Vc: 200, f: 0.1, ap: 2, ae: 5, Kc1: 1500, mc: 0.25, gamma: 0.1
            });
            if (force.Fc > 0 && force.Pc > 0) {
                console.log('  ✅ Physics: Cutting Force Model');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Physics: Cutting Force Model'); failed++; }

        // Test 2: Physics Engine - Taylor Tool Life
        try {
            const life = this.physics.taylorToolLife(200, { family: 'steel' });
            if (life.toolLife > 0 && life.n > 0) {
                console.log('  ✅ Physics: Taylor Tool Life');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Physics: Taylor Tool Life'); failed++; }

        // Test 3: Physics Engine - Surface Finish
        try {
            const finish = this.physics.predictSurfaceFinish({ f: 0.1, r: 0.4, Vc: 200 });
            if (finish.Ra_um > 0) {
                console.log('  ✅ Physics: Surface Finish Prediction');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Physics: Surface Finish Prediction'); failed++; }

        // Test 4: Physics Engine - Chatter Assessment
        try {
            const chatter = this.physics.chatterRiskAssessment({
                spindle_rpm: 10000, depth_of_cut: 3, tool_stickout: 50,
                tool_diameter: 10, material_hardness: 200
            });
            if (chatter.riskScore >= 0 && chatter.level) {
                console.log('  ✅ Physics: Chatter Risk Assessment');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Physics: Chatter Risk Assessment'); failed++; }

        // Test 5: PSO Optimization
        try {
            const material = { family: 'aluminum', cutting_params: { roughing: { speed: { min: 200, max: 400 }, feed: { nominal: 0.15 }}}};
            const tool = { diameter: 10, num_flutes: 3, corner_radius: 0.4 };
            const machine = { max_spindle_speed: 20000, max_power: 15 };
            const result = this.swarm.PSO_SpeedFeed.optimize(material, tool, machine, 'balanced');
            if (result.cuttingSpeed > 0 && result.feedRate > 0) {
                console.log('  ✅ PSO: Speed & Feed Optimization');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ PSO: Speed & Feed Optimization'); failed++; }

        // Test 6: ACO Sequencing
        try {
            const operations = [
                { toolId: 'T1', startX: 0, endX: 10, fixtureId: 'F1' },
                { toolId: 'T2', startX: 10, endX: 20, fixtureId: 'F1' },
                { toolId: 'T1', startX: 20, endX: 30, fixtureId: 'F1' }
            ];
            const result = this.swarm.ACO_OperationSequence.optimize(operations);
            if (result.sequence && result.totalTime >= 0) {
                console.log('  ✅ ACO: Operation Sequencing');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ ACO: Operation Sequencing'); failed++; }

        // Test 7: Bayesian Learning
        try {
            this.bayesian.BayesianParameterLearner.initialize();
            this.bayesian.BayesianParameterLearner.update({
                parameter: 'speed', recommended: 200, actual_used: 180, outcome: 1
            });
            const adjusted = this.bayesian.BayesianParameterLearner.adjustRecommendation({
                speed: 200, feed: 1000, doc: 2
            });
            if (adjusted.speed && adjusted.confidence.speed > 0) {
                console.log('  ✅ Bayesian: Parameter Learning');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Bayesian: Parameter Learning'); failed++; }

        // Test 8: Gaussian Process
        try {
            const gp = this.bayesian.GaussianProcessToolLife;
            gp.addObservation(100, 60);
            gp.addObservation(150, 35);
            gp.addObservation(200, 20);
            const pred = gp.predict(175);
            if (pred.mean > 0 && pred.confidence95) {
                console.log('  ✅ Gaussian Process: Tool Life Prediction');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Gaussian Process: Tool Life Prediction'); failed++; }

        // Test 9: Training Data Generation
        try {
            const materialData = this.trainingData.generateMaterialTrainingData();
            const toolWearData = this.trainingData.generateToolWearTrainingData();
            if (materialData.length > 10 && toolWearData.length > 50) {
                console.log('  ✅ Training Data: Material & Tool Wear Generation');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Training Data: Material & Tool Wear Generation'); failed++; }

        // Test 10: Monte Carlo Simulation
        try {
            const cycleTime = this.monteCarlo.simulateCycleTime(
                { baseCycleTime: 10 },
                { feed: { stdDev: 0.1, sensitivity: 0.5 }, speed: { stdDev: 0.1, sensitivity: 0.3 }}
            );
            if (cycleTime.mean > 0 && cycleTime.percentile95 > cycleTime.mean) {
                console.log('  ✅ Monte Carlo: Cycle Time Simulation');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Monte Carlo: Cycle Time Simulation'); failed++; }

        // Test 11: Monte Carlo Risk Analysis
        try {
            const risk = this.monteCarlo.riskAnalysis({
                speed: 200, feed: 1000, doc: 2,
                material: { Kc1: 1500 },
                constraints: { maxSpeed: 300, maxForce: 5000, toolDiameter: 10, toolStickout: 50 }
            }, 500);
            if (risk.failureRate >= 0 && risk.recommendation) {
                console.log('  ✅ Monte Carlo: Risk Analysis');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Monte Carlo: Risk Analysis'); failed++; }

        // Test 12: Kalman Filter - Tool Wear
        try {
            const ekf = this.kalman.ToolWearEKF;
            ekf.reset();
            ekf.predict();
            const update = ekf.update(0.05);
            if (update.wearAmount >= 0 && update.remainingLife > 0) {
                console.log('  ✅ Kalman Filter: Tool Wear Estimation');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Kalman Filter: Tool Wear Estimation'); failed++; }

        // Test 13: Integrated Recommendation
        try {
            if (!this.initialized) this.initialize();
            const recommendation = this.recommendSpeedFeed({
                material: { family: 'steel', cutting_params: { roughing: { speed: { min: 80, max: 150, nominal: 100 }, feed: { nominal: 0.15 }}}, hardness_bhn: 200, taylor_coefficients: { n: 0.25, C: 200 }},
                tool: { diameter: 10, num_flutes: 4, corner_radius: 0.4, stickout: 40 },
                machine: { max_spindle_speed: 15000, max_power: 10 }
            });
            if (recommendation.recommendation.rpm > 0 && recommendation.predictions.toolLife > 0) {
                console.log('  ✅ Integrated: Full Recommendation System');
                passed++;
            } else throw new Error();
        } catch (e) { console.log('  ❌ Integrated: Full Recommendation System'); failed++; }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
};
// GATEWAY REGISTRATION

(function registerWithGateway() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        // Physics routes
        PRISM_GATEWAY.register('physics.cutting_force', 'PRISM_PHYSICS_ENGINE.merchantCuttingForce');
        PRISM_GATEWAY.register('physics.tool_life', 'PRISM_PHYSICS_ENGINE.taylorToolLife');
        PRISM_GATEWAY.register('physics.tool_life_extended', 'PRISM_PHYSICS_ENGINE.extendedTaylorToolLife');
        PRISM_GATEWAY.register('physics.surface_finish', 'PRISM_PHYSICS_ENGINE.predictSurfaceFinish');
        PRISM_GATEWAY.register('physics.mrr', 'PRISM_PHYSICS_ENGINE.calculateMRR');
        PRISM_GATEWAY.register('physics.temperature', 'PRISM_PHYSICS_ENGINE.cuttingTemperature');
        PRISM_GATEWAY.register('physics.stability_lobes', 'PRISM_PHYSICS_ENGINE.stabilityLobes');
        PRISM_GATEWAY.register('physics.chatter_risk', 'PRISM_PHYSICS_ENGINE.chatterRiskAssessment');

        // Swarm algorithm routes
        PRISM_GATEWAY.register('ai.pso.speed_feed', 'PRISM_SWARM_ALGORITHMS.PSO_SpeedFeed.optimize');
        PRISM_GATEWAY.register('ai.aco.sequencing', 'PRISM_SWARM_ALGORITHMS.ACO_OperationSequence.optimize');

        // Bayesian routes
        PRISM_GATEWAY.register('ai.bayesian.update', 'PRISM_BAYESIAN_SYSTEM.BayesianParameterLearner.update');
        PRISM_GATEWAY.register('ai.bayesian.adjust', 'PRISM_BAYESIAN_SYSTEM.BayesianParameterLearner.adjustRecommendation');
        PRISM_GATEWAY.register('ai.bayesian.thompson', 'PRISM_BAYESIAN_SYSTEM.BayesianParameterLearner.thompsonSample');
        PRISM_GATEWAY.register('ai.gp.predict', 'PRISM_BAYESIAN_SYSTEM.GaussianProcessToolLife.predict');
        PRISM_GATEWAY.register('ai.gp.add', 'PRISM_BAYESIAN_SYSTEM.GaussianProcessToolLife.addObservation');

        // Monte Carlo routes
        PRISM_GATEWAY.register('ai.mc.cycle_time', 'PRISM_MONTE_CARLO.simulateCycleTime');
        PRISM_GATEWAY.register('ai.mc.tool_life', 'PRISM_MONTE_CARLO.simulateToolLife');
        PRISM_GATEWAY.register('ai.mc.risk', 'PRISM_MONTE_CARLO.riskAnalysis');

        // Kalman filter routes
        PRISM_GATEWAY.register('ai.kalman.wear_predict', 'PRISM_KALMAN_FILTER.ToolWearEKF.predict');
        PRISM_GATEWAY.register('ai.kalman.wear_update', 'PRISM_KALMAN_FILTER.ToolWearEKF.update');
        PRISM_GATEWAY.register('ai.kalman.feed_predict', 'PRISM_KALMAN_FILTER.FeedRateKF.predict');
        PRISM_GATEWAY.register('ai.kalman.feed_update', 'PRISM_KALMAN_FILTER.FeedRateKF.update');

        // Training data routes
        PRISM_GATEWAY.register('ai.training.materials', 'PRISM_AI_TRAINING_DATA.generateMaterialTrainingData');
        PRISM_GATEWAY.register('ai.training.tool_wear', 'PRISM_AI_TRAINING_DATA.generateToolWearTrainingData');
        PRISM_GATEWAY.register('ai.training.surface_finish', 'PRISM_AI_TRAINING_DATA.generateSurfaceFinishTrainingData');

        // Integrated system routes
        PRISM_GATEWAY.register('ai.recommend.speed_feed', 'PRISM_AI_INTEGRATED_SYSTEM.recommendSpeedFeed');
        PRISM_GATEWAY.register('ai.predict.tool_life', 'PRISM_AI_INTEGRATED_SYSTEM.predictToolLife');
        PRISM_GATEWAY.register('ai.analyze.chatter', 'PRISM_AI_INTEGRATED_SYSTEM.analyzeChatterStability');

        console.log('[PRISM AI Integration] Registered 28 routes with PRISM_GATEWAY');
    }
})();

// WINDOW EXPORTS

if (typeof window !== 'undefined') {
    window.PRISM_PHYSICS_ENGINE = PRISM_PHYSICS_ENGINE;
    window.PRISM_SWARM_ALGORITHMS = PRISM_SWARM_ALGORITHMS;
    window.PRISM_BAYESIAN_SYSTEM = PRISM_BAYESIAN_SYSTEM;
    window.PRISM_AI_TRAINING_DATA = PRISM_AI_TRAINING_DATA;
    window.PRISM_MONTE_CARLO = PRISM_MONTE_CARLO;
    window.PRISM_KALMAN_FILTER = PRISM_KALMAN_FILTER;
    window.PRISM_AI_INTEGRATED_SYSTEM = PRISM_AI_INTEGRATED_SYSTEM;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_PHYSICS_ENGINE,
        PRISM_SWARM_ALGORITHMS,
        PRISM_BAYESIAN_SYSTEM,
        PRISM_AI_TRAINING_DATA,
        PRISM_MONTE_CARLO,
        PRISM_KALMAN_FILTER,
        PRISM_AI_INTEGRATED_SYSTEM
    };
}
// STARTUP

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║           PRISM AI KNOWLEDGE INTEGRATION v1.0 - LOADED                       ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
console.log('║                                                                               ║');
console.log('║  PHYSICS ENGINE:                                                              ║');
console.log('║  └── Thompson Sampling (Multi-armed bandit)                                   ║');
console.log('║                                                                               ║');
console.log('║  OPTIMIZATION ALGORITHMS:                                                     ║');
console.log('║  ├── Simulated Annealing                                                      ║');
console.log('║  ├── Differential Evolution                                                   ║');
console.log('║  └── CMA-ES (Covariance Matrix Adaptation)                                    ║');
console.log('║                                                                               ║');
console.log('║  A/B TESTING:                                                                 ║');
console.log('║  ├── Experiment creation & variant assignment                                 ║');
console.log('║  ├── Statistical significance testing                                         ║');
console.log('║  └── Confidence intervals (Wilson score)                                      ║');
console.log('║                                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
console.log('');

const PRISM_TRUE_AI_SYSTEM = {

    version: '1.1.0',
    name: 'PRISM True AI System',
    initialized: false,

    // Component references
    tensor: PRISM_TENSOR,
    layers: PRISM_NN_LAYERS,
    network: PRISM_NEURAL_NETWORK,
    pretrained: PRISM_PRETRAINED_MODELS,
    claude: PRISM_CLAUDE_API,
    orchestrator: PRISM_AI_BACKGROUND_ORCHESTRATOR,
    chat: PRISM_AI_CHAT_INTERFACE,
    learning: PRISM_LEARNING_ENGINE,

    /**
     * Initialize the complete AI system
     */
    initialize: async function(options = {}) {
        console.log('[PRISM TRUE AI] Initializing v1.1...');

        // Configure Claude API
        if (options.claudeApiKey) {
            PRISM_CLAUDE_API.setApiKey(options.claudeApiKey);
        }
        // Initialize pretrained models
        PRISM_PRETRAINED_MODELS.initializeAll();

        // Start background orchestrator
        PRISM_AI_BACKGROUND_ORCHESTRATOR.start();

        // Set help level
        if (options.helpLevel) {
            PRISM_AI_BACKGROUND_ORCHESTRATOR.setHelpLevel(options.helpLevel);
        }
        this.initialized = true;
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM TRUE AI] Initialization complete');

        return {
            success: true,
            claudeAvailable: PRISM_CLAUDE_API.isAvailable(),
            models: ['toolWearPredictor', 'surfaceFinishPredictor', 'cycleTimePredictor', 'chatterPredictor']
        };
    },
    /**
     * Ask AI a question (unified interface)
     */
    ask: async function(question, context = {}) {
        PRISM_AI_CHAT_INTERFACE.setContext(context);
        return await PRISM_AI_CHAT_INTERFACE.sendMessage(question);
    },
    /**
     * Get prediction from pretrained neural network
     */
    predict: function(model, input) {
        const wearStates = ['minimal', 'moderate', 'severe', 'critical'];

        switch (model) {
            case 'toolWear':
                if (!PRISM_PRETRAINED_MODELS.toolWearPredictor) {
                    PRISM_PRETRAINED_MODELS.createToolWearModel();
                }
                const wearOut = PRISM_PRETRAINED_MODELS.toolWearPredictor.predict(input);
                const wearMaxIdx = wearOut.indexOf(Math.max(...wearOut));
                return {
                    state: wearStates[wearMaxIdx],
                    confidence: wearOut[wearMaxIdx],
                    probabilities: Object.fromEntries(wearStates.map((s, i) => [s, wearOut[i]]))
                };
            case 'surfaceFinish':
                if (!PRISM_PRETRAINED_MODELS.surfaceFinishPredictor) {
                    PRISM_PRETRAINED_MODELS.createSurfaceFinishModel();
                }
                const raOut = PRISM_PRETRAINED_MODELS.surfaceFinishPredictor.predict(input);
                return { Ra: raOut[0] * 5, unit: 'µm' };

            case 'cycleTime':
                if (!PRISM_PRETRAINED_MODELS.cycleTimePredictor) {
                    PRISM_PRETRAINED_MODELS.createCycleTimeModel();
                }
                const timeOut = PRISM_PRETRAINED_MODELS.cycleTimePredictor.predict(input);
                return { time: timeOut[0] * 20, unit: 'minutes' };

            case 'chatter':
                if (!PRISM_PRETRAINED_MODELS.chatterPredictor) {
                    PRISM_PRETRAINED_MODELS.createChatterModel();
                }
                const chatterOut = PRISM_PRETRAINED_MODELS.chatterPredictor.predict(input);
                return {
                    stable: chatterOut[0] > chatterOut[1],
                    stability: chatterOut[0],
                    instability: chatterOut[1],
                    recommendation: chatterOut[0] > chatterOut[1] ?
                        'Parameters are in stable cutting zone' :
                        'Risk of chatter - consider reducing DOC or adjusting RPM'
                };
            default:
                return { error: `Unknown model: ${model}` };
        }
    },
    /**
     * Record user action for learning
     */
    recordAction: function(action) {
        PRISM_AI_BACKGROUND_ORCHESTRATOR.recordAction(action);
    },
    /**
     * Record machining outcome for learning
     */
    recordOutcome: function(params, outcome) {
        PRISM_LEARNING_ENGINE.recordOutcome(params, outcome);
    },
    /**
     * Get pending AI suggestions
     */
    getSuggestions: function() {
        return PRISM_AI_BACKGROUND_ORCHESTRATOR.getPendingSuggestions();
    },
    /**
     * Get system status
     */
    getStatus: function() {
        return {
            version: this.version,
            initialized: this.initialized,
            claudeAvailable: PRISM_CLAUDE_API.isAvailable(),
            orchestratorRunning: PRISM_AI_BACKGROUND_ORCHESTRATOR.isRunning,
            learningStats: PRISM_LEARNING_ENGINE.getStats(),
            pendingSuggestions: PRISM_AI_BACKGROUND_ORCHESTRATOR.getPendingSuggestions().length
        };
    },
    /**
     * Configure Claude API key
     */
    setClaudeApiKey: function(key) {
        PRISM_CLAUDE_API.setApiKey(key);
    },
    /**
     * Run comprehensive self-tests
     */
    runTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM TRUE AI SYSTEM v1.1 - SELF-TESTS');
        console.log('═══════════════════════════════════════════════════════════════');

        let passed = 0, failed = 0;

        // Test 1: Tensor operations
        try {
            const a = PRISM_TENSOR.random([3, 3], 0.5);
            const b = PRISM_TENSOR.random([3, 3], 0.5);
            const c = PRISM_TENSOR.matmul(a, b);
            if (c.length === 3 && c[0].length === 3 && !isNaN(c[0][0])) {
                console.log('  ✅ Tensor Operations: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Tensor Operations: FAIL');
            failed++;
        }
        // Test 2: Dense layer
        try {
            const dense = new PRISM_NN_LAYERS.Dense(4, 2, 'relu');
            const out = dense.forward([1, 2, 3, 4]);
            if (out.length === 2 && !isNaN(out[0])) {
                console.log('  ✅ Dense Layer Forward: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Dense Layer Forward: FAIL');
            failed++;
        }
        // Test 3: Neural network training
        try {
            const model = new PRISM_NEURAL_NETWORK.Sequential('XOR-test');
            model.add(new PRISM_NN_LAYERS.Dense(2, 8, 'relu'));
            model.add(new PRISM_NN_LAYERS.Dense(8, 2, 'softmax'));
            model.compile({ loss: 'crossentropy', learningRate: 0.1 });

            const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
            const y = [[1, 0], [0, 1], [0, 1], [1, 0]];
            model.fit(X, y, { epochs: 50, verbose: false });

            const pred = model.predict([1, 0]);
            if (pred.length === 2 && !isNaN(pred[0]) && pred[1] > pred[0]) {
                console.log('  ✅ Neural Network Training: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Neural Network Training: FAIL');
            failed++;
        }
        // Test 4: Tool wear predictor
        try {
            const result = this.predict('toolWear', [0.5, 0.3, 0.4, 0.6, 0.2, 0.4]);
            if (result.state && result.confidence && !isNaN(result.confidence)) {
                console.log('  ✅ Tool Wear Predictor: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Tool Wear Predictor: FAIL');
            failed++;
        }
        // Test 5: Surface finish predictor
        try {
            const result = this.predict('surfaceFinish', [0.2, 0.5, 0.6, 0.4, 0.8]);
            if (result.Ra && !isNaN(result.Ra)) {
                console.log('  ✅ Surface Finish Predictor: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Surface Finish Predictor: FAIL');
            failed++;
        }
        // Test 6: Chatter predictor
        try {
            const result = this.predict('chatter', [0.5, 0.3, 0.4, 0.5]);
            if (typeof result.stable === 'boolean' && result.recommendation) {
                console.log('  ✅ Chatter Predictor: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Chatter Predictor: FAIL');
            failed++;
        }
        // Test 7: Orchestrator
        try {
            PRISM_AI_BACKGROUND_ORCHESTRATOR.recordAction({ type: 'test', data: {} });
            if (PRISM_AI_BACKGROUND_ORCHESTRATOR.userActions.length > 0) {
                console.log('  ✅ AI Orchestrator: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ AI Orchestrator: FAIL');
            failed++;
        }
        // Test 8: Chat interface
        try {
            const convId = PRISM_AI_CHAT_INTERFACE.createConversation();
            if (convId && PRISM_AI_CHAT_INTERFACE.conversations.has(convId)) {
                console.log('  ✅ Chat Interface: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Chat Interface: FAIL');
            failed++;
        }
        // Test 9: Learning engine
        try {
            PRISM_LEARNING_ENGINE.recordOutcome({ speed: 200 }, { quality: 'good' });
            if (PRISM_LEARNING_ENGINE.data.outcomes.length > 0) {
                console.log('  ✅ Learning Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Learning Engine: FAIL');
            failed++;
        }
        // Test 10: Claude local fallback
        try {
            const response = PRISM_CLAUDE_API._generateLocalResponse('What speed for aluminum?', {
                material: { name: '6061 Aluminum' },
                tool: { diameter: 10, teeth: 4 }
            });
            if (response && response.includes('RPM')) {
                console.log('  ✅ Claude Local Fallback: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Claude Local Fallback: FAIL');
            failed++;
        }
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
};
// SECTION 10: GATEWAY & MODULE REGISTRATION

(function registerWithGateway() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        const routes = {
            'ai.true.ask': 'PRISM_TRUE_AI_SYSTEM.ask',
            'ai.true.predict': 'PRISM_TRUE_AI_SYSTEM.predict',
            'ai.true.status': 'PRISM_TRUE_AI_SYSTEM.getStatus',
            'ai.true.suggestions': 'PRISM_TRUE_AI_SYSTEM.getSuggestions',
            'ai.claude.query': 'PRISM_CLAUDE_API.query',
            'ai.claude.available': 'PRISM_CLAUDE_API.isAvailable',
            'ai.chat.send': 'PRISM_AI_CHAT_INTERFACE.sendMessage',
            'ai.chat.history': 'PRISM_AI_CHAT_INTERFACE.getHistory',
            'ai.learn.outcome': 'PRISM_LEARNING_ENGINE.recordOutcome',
            'ai.learn.feedback': 'PRISM_LEARNING_ENGINE.recordFeedback',
            'ai.orchestrator.action': 'PRISM_AI_BACKGROUND_ORCHESTRATOR.recordAction'
        };
        for (const [route, target] of Object.entries(routes)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log('[PRISM TRUE AI] Registered with PRISM_GATEWAY');
    }
    if (typeof PRISM_MODULE_REGISTRY !== 'undefined') {
        PRISM_MODULE_REGISTRY.register('PRISM_TRUE_AI_SYSTEM', PRISM_TRUE_AI_SYSTEM);
        PRISM_MODULE_REGISTRY.register('PRISM_CLAUDE_API', PRISM_CLAUDE_API);
        PRISM_MODULE_REGISTRY.register('PRISM_PRETRAINED_MODELS', PRISM_PRETRAINED_MODELS);
        console.log('[PRISM TRUE AI] Registered with PRISM_MODULE_REGISTRY');
    }
    if (typeof PRISM_INIT_ORCHESTRATOR !== 'undefined') {
        PRISM_INIT_ORCHESTRATOR.registerModule('PRISM_TRUE_AI_SYSTEM', PRISM_TRUE_AI_SYSTEM);
        console.log('[PRISM TRUE AI] Registered with PRISM_INIT_ORCHESTRATOR');
    }
})();

// WINDOW EXPORTS

if (typeof window !== 'undefined') {
    window.PRISM_TENSOR = PRISM_TENSOR;
    window.PRISM_NN_LAYERS = PRISM_NN_LAYERS;
    window.PRISM_NEURAL_NETWORK = PRISM_NEURAL_NETWORK;
    window.PRISM_PRETRAINED_MODELS = PRISM_PRETRAINED_MODELS;
    window.PRISM_CLAUDE_API = PRISM_CLAUDE_API;
    window.PRISM_AI_BACKGROUND_ORCHESTRATOR = PRISM_AI_BACKGROUND_ORCHESTRATOR;
    window.PRISM_AI_CHAT_INTERFACE = PRISM_AI_CHAT_INTERFACE;
    window.PRISM_LEARNING_ENGINE = PRISM_LEARNING_ENGINE;
    window.PRISM_TRUE_AI_SYSTEM = PRISM_TRUE_AI_SYSTEM;
}
// STARTUP LOG

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║            PRISM TRUE AI SYSTEM v1.1 - LOADED SUCCESSFULLY                   ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
console.log('║                                                                               ║');
console.log('║  NEURAL NETWORKS:                                                             ║');
console.log('║  ├── Dense layers with Adam optimizer & gradient clipping                     ║');
console.log('║  ├── Activations: ReLU, Sigmoid, Tanh, Softmax                                ║');
console.log('║  └── Fully trainable with backpropagation                                     ║');
console.log('║                                                                               ║');
console.log('║  PRETRAINED MODELS (4):                                                       ║');
console.log('║  ├── Tool Wear Predictor (6 inputs → 4 wear states)                           ║');
console.log('║  ├── Surface Finish Predictor (5 inputs → Ra value)                           ║');
console.log('║  ├── Cycle Time Predictor (5 inputs → time estimate)                          ║');
console.log('║  └── Chatter Predictor (4 inputs → stability analysis)                        ║');
console.log('║                                                                               ║');
console.log('║  CLAUDE INTEGRATION:                                                          ║');
console.log('║  ├── Comprehensive manufacturing system prompt                                ║');
console.log('║  ├── Context-aware queries (material, tool, machine, operation)               ║');
console.log('║  └── Intelligent local fallback when API unavailable                          ║');
console.log('║                                                                               ║');
console.log('║  INTELLIGENT SYSTEMS:                                                         ║');
console.log('║  ├── Background Orchestrator (monitors user, proactive suggestions)           ║');
console.log('║  ├── Conversational Chat Interface                                            ║');
console.log('║  └── Continuous Learning Engine                                               ║');
console.log('║                                                                               ║');
console.log('║  USAGE:                                                                       ║');
console.log('║  ├── PRISM_TRUE_AI_SYSTEM.initialize({ claudeApiKey: "..." })                 ║');
console.log('║  ├── PRISM_TRUE_AI_SYSTEM.ask("What speed for aluminum?", context)            ║');
console.log('║  ├── PRISM_TRUE_AI_SYSTEM.predict("toolWear", [speed, feed, doc, ...])        ║');
console.log('║  └── PRISM_TRUE_AI_SYSTEM.runTests()                                          ║');
console.log('║                                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// PRISM BUSINESS INTELLIGENCE AI SYSTEM v1.0
// Cost Analysis, Quoting, ERP, Job Tracking, Shop Analytics
// Created: January 15, 2026 | For Build: v8.66.001+
// Knowledge Sources:
//   - MIT 15.760 Operations Management
//   - MIT 15.778 Supply Chain Planning
//   - Stanford MS&E 260 Decision Analysis
//   - Wharton OIDD 615 Operations Strategy
//   - Harvard HBS Operations Management Cases
//   - CMU Tepper Supply Chain & Operations

console.log('[PRISM BUSINESS AI] Loading Business Intelligence System v1.0...');

// SECTION 1: JOB COSTING ENGINE

const PRISM_JOB_COSTING_ENGINE = {

    version: '1.0.0',

    // Default shop rates (configurable)
    defaultRates: {
        laborRate: 45.00,           // $/hour - direct labor
        overheadRate: 35.00,        // $/hour - shop overhead
        adminRate: 15.00,           // $/hour - administrative
        setupRate: 55.00,           // $/hour - setup labor (usually higher)
        programmingRate: 75.00,     // $/hour - CAM programming
        inspectionRate: 50.00,      // $/hour - quality inspection

        // Machine-specific rates ($/hour)
        machineRates: {
            'manual_mill': 35.00,
            'cnc_mill_3axis': 85.00,
            'cnc_mill_5axis': 150.00,
            'cnc_lathe': 75.00,
            'swiss_lathe': 125.00,
            'wire_edm': 95.00,
            'sinker_edm': 85.00,
            'surface_grinder': 65.00,
            'cylindrical_grinder': 75.00
        }
    },
    /**
     * Calculate complete job cost
     */
    calculateJobCost: function(jobSpec) {
        const costs = {
            material: this.calculateMaterialCost(jobSpec),
            setup: this.calculateSetupCost(jobSpec),
            machining: this.calculateMachiningCost(jobSpec),
            programming: this.calculateProgrammingCost(jobSpec),
            inspection: this.calculateInspectionCost(jobSpec),
            finishing: this.calculateFinishingCost(jobSpec),
            overhead: 0,
            admin: 0,
            total: 0,
            perPart: 0
        };
        // Calculate overhead and admin
        const directLaborHours = (costs.setup.hours + costs.machining.hours +
                                  costs.programming.hours + costs.inspection.hours);
        costs.overhead = {
            hours: directLaborHours,
            cost: directLaborHours * (jobSpec.rates?.overheadRate || this.defaultRates.overheadRate)
        };
        costs.admin = {
            hours: directLaborHours * 0.15, // 15% of direct labor
            cost: directLaborHours * 0.15 * (jobSpec.rates?.adminRate || this.defaultRates.adminRate)
        };
        // Total cost
        costs.total = costs.material.cost + costs.setup.cost + costs.machining.cost +
                      costs.programming.cost + costs.inspection.cost + costs.finishing.cost +
                      costs.overhead.cost + costs.admin.cost;

        // Per-part cost
        const quantity = jobSpec.quantity || 1;
        costs.perPart = costs.total / quantity;

        // Add detailed breakdown
        costs.breakdown = {
            materialPercent: (costs.material.cost / costs.total * 100).toFixed(1),
            laborPercent: ((costs.setup.cost + costs.machining.cost) / costs.total * 100).toFixed(1),
            overheadPercent: ((costs.overhead.cost + costs.admin.cost) / costs.total * 100).toFixed(1)
        };
        return costs;
    },
    /**
     * Calculate material cost
     */
    calculateMaterialCost: function(jobSpec) {
        const material = jobSpec.material || {};
        const quantity = jobSpec.quantity || 1;

        // Stock dimensions with kerf allowance
        const stockLength = (material.length || 100) + (material.kerfAllowance || 3);
        const stockWidth = (material.width || 100) + (material.kerfAllowance || 3);
        const stockHeight = (material.height || 25) + (material.kerfAllowance || 2);

        // Calculate volume and weight
        const volumeMm3 = stockLength * stockWidth * stockHeight;
        const volumeIn3 = volumeMm3 / 16387.064;
        const density = material.density || 7850; // kg/m³ default steel
        const weightKg = volumeMm3 * 1e-9 * density;
        const weightLb = weightKg * 2.20462;

        // Material cost
        const pricePerLb = material.pricePerLb || this._getDefaultMaterialPrice(material.type);
        const materialCost = weightLb * pricePerLb * quantity;

        // Add scrap factor (typically 10-20%)
        const scrapFactor = material.scrapFactor || 0.15;
        const totalMaterialCost = materialCost * (1 + scrapFactor);

        return {
            stockDimensions: { length: stockLength, width: stockWidth, height: stockHeight },
            volumeIn3: volumeIn3 * quantity,
            weightLb: weightLb * quantity,
            pricePerLb,
            baseCost: materialCost,
            scrapAllowance: materialCost * scrapFactor,
            cost: totalMaterialCost
        };
    },
    _getDefaultMaterialPrice: function(materialType) {
        const prices = {
            'aluminum_6061': 3.50,
            'aluminum_7075': 5.00,
            'steel_1018': 1.25,
            'steel_4140': 2.00,
            'steel_4340': 2.50,
            'stainless_304': 4.00,
            'stainless_316': 5.50,
            'stainless_17-4': 8.00,
            'titanium_gr5': 25.00,
            'inconel_718': 45.00,
            'brass_360': 4.50,
            'bronze_932': 6.00,
            'plastic_delrin': 8.00,
            'plastic_peek': 75.00
        };
        return prices[materialType?.toLowerCase()] || 2.50;
    },
    /**
     * Calculate setup cost
     */
    calculateSetupCost: function(jobSpec) {
        const operations = jobSpec.operations || [];
        const quantity = jobSpec.quantity || 1;

        let totalSetupMinutes = 0;
        const setupDetails = [];

        operations.forEach(op => {
            let setupTime = op.setupTime || this._estimateSetupTime(op);
            setupDetails.push({
                operation: op.name || op.type,
                setupMinutes: setupTime
            });
            totalSetupMinutes += setupTime;
        });

        // First article inspection adds setup time
        if (jobSpec.firstArticleRequired) {
            totalSetupMinutes += 30; // 30 minutes for FAI
        }
        const setupHours = totalSetupMinutes / 60;
        const setupRate = jobSpec.rates?.setupRate || this.defaultRates.setupRate;

        return {
            operations: setupDetails,
            totalMinutes: totalSetupMinutes,
            hours: setupHours,
            rate: setupRate,
            cost: setupHours * setupRate
        };
    },
    _estimateSetupTime: function(operation) {
        const setupTimes = {
            'roughing': 20,
            'finishing': 10,
            'drilling': 15,
            'tapping': 20,
            'boring': 25,
            'facing': 10,
            'turning': 15,
            'threading': 25,
            'grinding': 30,
            '5axis': 45,
            'inspection': 15
        };
        return setupTimes[operation.type?.toLowerCase()] || 20;
    },
    /**
     * Calculate machining cost
     */
    calculateMachiningCost: function(jobSpec) {
        const operations = jobSpec.operations || [];
        const quantity = jobSpec.quantity || 1;
        const machineType = jobSpec.machineType || 'cnc_mill_3axis';

        let totalCycleMinutes = 0;
        const operationDetails = [];

        operations.forEach(op => {
            const cycleTime = op.cycleTime || this._estimateCycleTime(op, jobSpec);
            operationDetails.push({
                operation: op.name || op.type,
                cycleMinutes: cycleTime,
                totalMinutes: cycleTime * quantity
            });
            totalCycleMinutes += cycleTime * quantity;
        });

        // Add tool change time (avg 15 sec per change)
        const toolChanges = jobSpec.toolChanges || operations.length;
        const toolChangeTime = (toolChanges * 0.25) * quantity; // minutes
        totalCycleMinutes += toolChangeTime;

        const machineHours = totalCycleMinutes / 60;
        const machineRate = jobSpec.rates?.machineRate ||
                           this.defaultRates.machineRates[machineType] || 85.00;

        return {
            operations: operationDetails,
            toolChangeMinutes: toolChangeTime,
            totalMinutes: totalCycleMinutes,
            hours: machineHours,
            machineType,
            rate: machineRate,
            cost: machineHours * machineRate
        };
    },
    _estimateCycleTime: function(operation, jobSpec) {
        // MRR-based cycle time estimation
        const material = jobSpec.material || {};
        const mrr = operation.mrr || 10; // cm³/min default
        const volumeToRemove = operation.volumeToRemove || 50; // cm³ default

        // Base machining time
        let cycleTime = volumeToRemove / mrr;

        // Add positioning and rapid moves (20% overhead)
        cycleTime *= 1.2;

        // Adjust for operation type
        const multipliers = {
            'finishing': 2.0,  // Finishing takes longer per volume
            'roughing': 1.0,
            'drilling': 0.5,
            'tapping': 1.5
        };
        cycleTime *= multipliers[operation.type?.toLowerCase()] || 1.0;

        return Math.max(cycleTime, 1); // Minimum 1 minute
    },
    /**
     * Calculate programming cost
     */
    calculateProgrammingCost: function(jobSpec) {
        const complexity = jobSpec.complexity || 'medium';
        const operations = jobSpec.operations?.length || 3;

        // Base programming time by complexity
        const baseHours = {
            'simple': 0.5,
            'medium': 1.5,
            'complex': 4.0,
            'very_complex': 8.0
        }[complexity] || 1.5;

        // Add time per operation
        const perOpHours = operations * 0.25;

        // 5-axis adds complexity
        const axisMultiplier = jobSpec.machineType?.includes('5axis') ? 1.5 : 1.0;

        const totalHours = (baseHours + perOpHours) * axisMultiplier;
        const rate = jobSpec.rates?.programmingRate || this.defaultRates.programmingRate;

        return {
            complexity,
            baseHours,
            operationHours: perOpHours,
            axisMultiplier,
            hours: totalHours,
            rate,
            cost: totalHours * rate
        };
    },
    /**
     * Calculate inspection cost
     */
    calculateInspectionCost: function(jobSpec) {
        const quantity = jobSpec.quantity || 1;
        const inspectionLevel = jobSpec.inspectionLevel || 'standard';
        const criticalDimensions = jobSpec.criticalDimensions || 5;

        // Time per part by inspection level
        const minutesPerPart = {
            'minimal': 2,
            'standard': 5,
            'detailed': 15,
            'full_cmm': 30
        }[inspectionLevel] || 5;

        // Add time for critical dimensions
        const dimTime = criticalDimensions * 0.5;

        // Sampling rate (not all parts inspected for large batches)
        let partsToInspect = quantity;
        if (quantity > 50) {
            partsToInspect = Math.ceil(quantity * 0.1) + 10; // 10% + 10
        } else if (quantity > 20) {
            partsToInspect = Math.ceil(quantity * 0.2) + 5; // 20% + 5
        }
        // First article always inspected
        const faiTime = jobSpec.firstArticleRequired ? 30 : 0;

        const totalMinutes = (partsToInspect * (minutesPerPart + dimTime)) + faiTime;
        const hours = totalMinutes / 60;
        const rate = jobSpec.rates?.inspectionRate || this.defaultRates.inspectionRate;

        return {
            inspectionLevel,
            partsInspected: partsToInspect,
            minutesPerPart: minutesPerPart + dimTime,
            firstArticleMinutes: faiTime,
            totalMinutes,
            hours,
            rate,
            cost: hours * rate
        };
    },
    /**
     * Calculate finishing/secondary operations cost
     */
    calculateFinishingCost: function(jobSpec) {
        const finishingOps = jobSpec.finishingOperations || [];
        const quantity = jobSpec.quantity || 1;

        let totalCost = 0;
        const details = [];

        finishingOps.forEach(op => {
            let cost = 0;
            switch (op.type?.toLowerCase()) {
                case 'anodize':
                    cost = quantity * (op.costPerPart || 8.00);
                    break;
                case 'anodize_hard':
                    cost = quantity * (op.costPerPart || 15.00);
                    break;
                case 'powder_coat':
                    cost = quantity * (op.costPerPart || 12.00);
                    break;
                case 'nickel_plate':
                    cost = quantity * (op.costPerPart || 10.00);
                    break;
                case 'chrome_plate':
                    cost = quantity * (op.costPerPart || 18.00);
                    break;
                case 'heat_treat':
                    cost = quantity * (op.costPerPart || 5.00);
                    break;
                case 'passivate':
                    cost = quantity * (op.costPerPart || 3.00);
                    break;
                case 'deburr':
                    cost = quantity * (op.costPerPart || 2.00);
                    break;
                case 'bead_blast':
                    cost = quantity * (op.costPerPart || 4.00);
                    break;
                case 'tumble':
                    cost = quantity * (op.costPerPart || 1.50);
                    break;
                default:
                    cost = quantity * (op.costPerPart || 5.00);
            }
            details.push({ type: op.type, costPerPart: cost / quantity, totalCost: cost });
            totalCost += cost;
        });

        return {
            operations: details,
            cost: totalCost
        };
    }
};
// SECTION 2: QUOTING ENGINE

const PRISM_QUOTING_ENGINE = {

    version: '1.0.0',

    // Markup and margin targets
    defaultPricing: {
        targetMargin: 0.35,           // 35% gross margin target
        minMargin: 0.20,              // 20% minimum margin
        rushMultiplier: 1.5,          // 50% premium for rush jobs
        prototypeMultiplier: 1.25,    // 25% premium for prototypes
        repeatOrderDiscount: 0.10,    // 10% discount for repeat orders
        volumeDiscountTiers: [
            { minQty: 100, discount: 0.05 },
            { minQty: 500, discount: 0.10 },
            { minQty: 1000, discount: 0.15 },
            { minQty: 5000, discount: 0.20 }
        ]
    },
    /**
     * Generate complete quote
     */
    generateQuote: function(jobSpec, options = {}) {
        // Get base costs
        const costs = PRISM_JOB_COSTING_ENGINE.calculateJobCost(jobSpec);

        // Determine pricing multipliers
        const multipliers = this._calculateMultipliers(jobSpec, options);

        // Calculate base price with margin
        const targetMargin = options.targetMargin || this.defaultPricing.targetMargin;
        const basePrice = costs.total / (1 - targetMargin);

        // Apply multipliers
        let adjustedPrice = basePrice * multipliers.total;

        // Apply volume discount
        const volumeDiscount = this._getVolumeDiscount(jobSpec.quantity);
        adjustedPrice *= (1 - volumeDiscount);

        // Round to appropriate precision
        const finalPrice = this._roundPrice(adjustedPrice);
        const pricePerPart = this._roundPrice(finalPrice / (jobSpec.quantity || 1));

        // Calculate actual margin
        const actualMargin = (finalPrice - costs.total) / finalPrice;

        // Generate quote document
        const quote = {
            quoteNumber: this._generateQuoteNumber(),
            date: new Date().toISOString().split('T')[0],
            validUntil: this._getValidUntilDate(options.validDays || 30),

            customer: options.customer || {},

            jobSummary: {
                partName: jobSpec.partName || 'Custom Part',
                partNumber: jobSpec.partNumber || 'N/A',
                quantity: jobSpec.quantity || 1,
                material: jobSpec.material?.type || 'Unknown',
                complexity: jobSpec.complexity || 'medium'
            },
            pricing: {
                unitPrice: pricePerPart,
                totalPrice: finalPrice,

                breakdown: {
                    baseCost: costs.total,
                    margin: (finalPrice - costs.total),
                    marginPercent: (actualMargin * 100).toFixed(1) + '%'
                },
                adjustments: {
                    rushPremium: multipliers.rush > 1 ? `+${((multipliers.rush - 1) * 100).toFixed(0)}%` : null,
                    prototypePremium: multipliers.prototype > 1 ? `+${((multipliers.prototype - 1) * 100).toFixed(0)}%` : null,
                    repeatDiscount: multipliers.repeat < 1 ? `-${((1 - multipliers.repeat) * 100).toFixed(0)}%` : null,
                    volumeDiscount: volumeDiscount > 0 ? `-${(volumeDiscount * 100).toFixed(0)}%` : null
                }
            },
            leadTime: this._calculateLeadTime(jobSpec, options),

            costBreakdown: {
                material: costs.material.cost,
                machining: costs.machining.cost,
                setup: costs.setup.cost,
                programming: costs.programming.cost,
                inspection: costs.inspection.cost,
                finishing: costs.finishing.cost,
                overhead: costs.overhead.cost
            },
            terms: {
                payment: options.paymentTerms || 'Net 30',
                delivery: options.deliveryTerms || 'FOB Origin',
                warranty: '90 days workmanship guarantee'
            },
            notes: this._generateNotes(jobSpec, options)
        };
        return quote;
    },
    _calculateMultipliers: function(jobSpec, options) {
        let rushMultiplier = 1.0;
        let prototypeMultiplier = 1.0;
        let repeatMultiplier = 1.0;

        // Rush job
        if (options.rush || jobSpec.rush) {
            rushMultiplier = this.defaultPricing.rushMultiplier;
        }
        // Prototype
        if (jobSpec.quantity === 1 || options.prototype) {
            prototypeMultiplier = this.defaultPricing.prototypeMultiplier;
        }
        // Repeat order
        if (options.repeatOrder) {
            repeatMultiplier = 1 - this.defaultPricing.repeatOrderDiscount;
        }
        return {
            rush: rushMultiplier,
            prototype: prototypeMultiplier,
            repeat: repeatMultiplier,
            total: rushMultiplier * prototypeMultiplier * repeatMultiplier
        };
    },
    _getVolumeDiscount: function(quantity) {
        const tiers = this.defaultPricing.volumeDiscountTiers;
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (quantity >= tiers[i].minQty) {
                return tiers[i].discount;
            }
        }
        return 0;
    },
    _roundPrice: function(price) {
        if (price < 100) return Math.ceil(price * 100) / 100;
        if (price < 1000) return Math.ceil(price / 5) * 5;
        return Math.ceil(price / 10) * 10;
    },
    _generateQuoteNumber: function() {
        const prefix = 'Q';
        const year = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${year}-${random}`;
    },
    _getValidUntilDate: function(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    },
    _calculateLeadTime: function(jobSpec, options) {
        const quantity = jobSpec.quantity || 1;
        const complexity = jobSpec.complexity || 'medium';

        // Base lead time by complexity
        const baseDays = {
            'simple': 5,
            'medium': 10,
            'complex': 15,
            'very_complex': 25
        }[complexity] || 10;

        // Add time for quantity
        const qtyDays = Math.ceil(quantity / 50) * 2;

        // Add time for finishing
        const finishDays = (jobSpec.finishingOperations?.length || 0) * 3;

        const totalDays = baseDays + qtyDays + finishDays;

        return {
            standard: totalDays,
            rush: Math.ceil(totalDays * 0.5),
            unit: 'business days'
        };
    },
    _generateNotes: function(jobSpec, options) {
        const notes = [];

        if (jobSpec.material?.customerSupplied) {
            notes.push('Material to be supplied by customer');
        }
        if (jobSpec.firstArticleRequired) {
            notes.push('First article inspection included');
        }
        if (jobSpec.certifications?.length) {
            notes.push(`Certifications required: ${jobSpec.certifications.join(', ')}`);
        }
        if (options.notes) {
            notes.push(options.notes);
        }
        return notes;
    },
    /**
     * Calculate price breaks for multiple quantities
     */
    generatePriceBreaks: function(jobSpec, quantities = [1, 10, 25, 50, 100, 250, 500]) {
        const priceBreaks = [];

        quantities.forEach(qty => {
            const spec = { ...jobSpec, quantity: qty };
            const quote = this.generateQuote(spec);
            priceBreaks.push({
                quantity: qty,
                unitPrice: quote.pricing.unitPrice,
                totalPrice: quote.pricing.totalPrice,
                leadTime: quote.leadTime.standard
            });
        });

        return priceBreaks;
    }
};
// SECTION 3: JOB TRACKING ENGINE

const PRISM_JOB_TRACKING_ENGINE = {

    version: '1.0.0',

    // Job status states
    STATUS: {
        QUOTED: 'quoted',
        ORDERED: 'ordered',
        SCHEDULED: 'scheduled',
        IN_PROGRESS: 'in_progress',
        ON_HOLD: 'on_hold',
        QC_PENDING: 'qc_pending',
        QC_PASSED: 'qc_passed',
        QC_FAILED: 'qc_failed',
        FINISHING: 'finishing',
        COMPLETE: 'complete',
        SHIPPED: 'shipped',
        INVOICED: 'invoiced',
        CLOSED: 'closed'
    },
    // Active jobs store
    jobs: new Map(),

    /**
     * Create new job from quote
     */
    createJob: function(quote, orderDetails = {}) {
        const jobId = this._generateJobId();

        const job = {
            id: jobId,
            quoteNumber: quote.quoteNumber,

            customer: quote.customer,
            partInfo: quote.jobSummary,

            status: this.STATUS.ORDERED,
            statusHistory: [{
                status: this.STATUS.ORDERED,
                timestamp: new Date().toISOString(),
                user: orderDetails.createdBy || 'system'
            }],

            pricing: quote.pricing,

            schedule: {
                orderDate: new Date().toISOString().split('T')[0],
                dueDate: orderDetails.dueDate || this._calculateDueDate(quote.leadTime.standard),
                scheduledStart: null,
                scheduledEnd: null,
                actualStart: null,
                actualEnd: null
            },
            operations: [],

            progress: {
                percentComplete: 0,
                partsComplete: 0,
                partsTotal: quote.jobSummary.quantity
            },
            materials: {
                ordered: false,
                received: false,
                allocated: false
            },
            quality: {
                firstArticlePassed: null,
                inspectionResults: [],
                ncrs: []
            },
            timeTracking: {
                estimatedHours: 0,
                actualHours: 0,
                entries: []
            },
            costs: {
                estimated: quote.costBreakdown,
                actual: {},
                variance: {}
            },
            notes: [],
            attachments: []
        };
        this.jobs.set(jobId, job);
        return job;
    },
    /**
     * Update job status
     */
    updateStatus: function(jobId, newStatus, details = {}) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        const previousStatus = job.status;
        job.status = newStatus;
        job.statusHistory.push({
            status: newStatus,
            previousStatus,
            timestamp: new Date().toISOString(),
            user: details.user || 'system',
            notes: details.notes || ''
        });

        // Auto-update related fields
        if (newStatus === this.STATUS.IN_PROGRESS && !job.schedule.actualStart) {
            job.schedule.actualStart = new Date().toISOString();
        }
        if (newStatus === this.STATUS.COMPLETE || newStatus === this.STATUS.SHIPPED) {
            job.schedule.actualEnd = new Date().toISOString();
        }
        return { success: true, job };
    },
    /**
     * Record time entry
     */
    recordTime: function(jobId, timeEntry) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        const entry = {
            id: Date.now(),
            date: timeEntry.date || new Date().toISOString().split('T')[0],
            employee: timeEntry.employee,
            operation: timeEntry.operation,
            hours: timeEntry.hours,
            machine: timeEntry.machine,
            notes: timeEntry.notes || ''
        };
        job.timeTracking.entries.push(entry);
        job.timeTracking.actualHours += timeEntry.hours;

        return { success: true, entry };
    },
    /**
     * Update progress
     */
    updateProgress: function(jobId, partsComplete) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        job.progress.partsComplete = partsComplete;
        job.progress.percentComplete = Math.round((partsComplete / job.progress.partsTotal) * 100);

        return { success: true, progress: job.progress };
    },
    /**
     * Add inspection result
     */
    addInspectionResult: function(jobId, result) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        const inspection = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            inspector: result.inspector,
            type: result.type || 'in_process',
            partNumbers: result.partNumbers || [],
            passed: result.passed,
            measurements: result.measurements || [],
            notes: result.notes || ''
        };
        job.quality.inspectionResults.push(inspection);

        if (result.type === 'first_article') {
            job.quality.firstArticlePassed = result.passed;
        }
        return { success: true, inspection };
    },
    /**
     * Get job summary
     */
    getJobSummary: function(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        // Calculate schedule variance
        const dueDate = new Date(job.schedule.dueDate);
        const today = new Date();
        const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        // Calculate cost variance
        const estimatedTotal = Object.values(job.costs.estimated).reduce((a, b) => a + b, 0);
        const actualTotal = Object.values(job.costs.actual).reduce((a, b) => a + b, 0);
        const costVariance = actualTotal - estimatedTotal;

        return {
            id: job.id,
            status: job.status,
            customer: job.customer.name,
            partNumber: job.partInfo.partNumber,
            quantity: job.partInfo.quantity,

            progress: job.progress,

            schedule: {
                dueDate: job.schedule.dueDate,
                daysRemaining,
                onSchedule: daysRemaining >= 0
            },
            financials: {
                quotePrice: job.pricing.totalPrice,
                actualCost: actualTotal,
                costVariance,
                projectedMargin: ((job.pricing.totalPrice - actualTotal) / job.pricing.totalPrice * 100).toFixed(1) + '%'
            },
            quality: {
                firstArticle: job.quality.firstArticlePassed,
                inspections: job.quality.inspectionResults.length,
                ncrs: job.quality.ncrs.length
            }
        };
    },
    /**
     * Get all active jobs
     */
    getActiveJobs: function() {
        const active = [];
        const closedStatuses = [this.STATUS.CLOSED, this.STATUS.SHIPPED, this.STATUS.INVOICED];

        for (const [id, job] of this.jobs) {
            if (!closedStatuses.includes(job.status)) {
                active.push(this.getJobSummary(id));
            }
        }
        return active.sort((a, b) => a.schedule.daysRemaining - b.schedule.daysRemaining);
    },
    _generateJobId: function() {
        const prefix = 'J';
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${year}${month}-${random}`;
    },
    _calculateDueDate: function(leadTimeDays) {
        const date = new Date();
        date.setDate(date.getDate() + leadTimeDays);
        return date.toISOString().split('T')[0];
    }
};
// SECTION 4: SHOP ANALYTICS ENGINE (KPIs)

const PRISM_SHOP_ANALYTICS_ENGINE = {

    version: '1.0.0',

    /**
     * Calculate Overall Equipment Effectiveness (OEE)
     * OEE = Availability × Performance × Quality
     */
    calculateOEE: function(machineData) {
        // Availability = Running Time / Planned Production Time
        const plannedTime = machineData.plannedTime || 480; // minutes
        const downtime = machineData.downtime || 0;
        const runningTime = plannedTime - downtime;
        const availability = runningTime / plannedTime;

        // Performance = (Ideal Cycle Time × Total Parts) / Running Time
        const idealCycleTime = machineData.idealCycleTime || 1; // minutes
        const totalParts = machineData.totalParts || 0;
        const performance = (idealCycleTime * totalParts) / runningTime;

        // Quality = Good Parts / Total Parts
        const goodParts = machineData.goodParts || totalParts;
        const quality = totalParts > 0 ? goodParts / totalParts : 1;

        const oee = availability * performance * quality;

        return {
            oee: (oee * 100).toFixed(1) + '%',
            availability: (availability * 100).toFixed(1) + '%',
            performance: (performance * 100).toFixed(1) + '%',
            quality: (quality * 100).toFixed(1) + '%',

            worldClass: oee >= 0.85,
            benchmark: oee >= 0.85 ? 'World Class' : oee >= 0.65 ? 'Average' : 'Below Average',

            losses: {
                downtimeLoss: ((1 - availability) * 100).toFixed(1) + '%',
                speedLoss: ((1 - performance) * 100).toFixed(1) + '%',
                qualityLoss: ((1 - quality) * 100).toFixed(1) + '%'
            }
        };
    },
    /**
     * Calculate On-Time Delivery (OTD)
     */
    calculateOTD: function(jobs) {
        const completed = jobs.filter(j => j.status === 'complete' || j.status === 'shipped');
        const onTime = completed.filter(j => {
            const due = new Date(j.dueDate);
            const shipped = new Date(j.actualEnd);
            return shipped <= due;
        });

        const otd = completed.length > 0 ? onTime.length / completed.length : 1;

        return {
            rate: (otd * 100).toFixed(1) + '%',
            onTime: onTime.length,
            total: completed.length,
            late: completed.length - onTime.length
        };
    },
    /**
     * Calculate First Pass Yield (FPY)
     */
    calculateFPY: function(qualityData) {
        const totalInspected = qualityData.totalInspected || 0;
        const passedFirst = qualityData.passedFirstTime || 0;

        const fpy = totalInspected > 0 ? passedFirst / totalInspected : 1;

        return {
            rate: (fpy * 100).toFixed(1) + '%',
            passed: passedFirst,
            total: totalInspected,
            rework: totalInspected - passedFirst,
            costOfQuality: (totalInspected - passedFirst) * (qualityData.avgReworkCost || 50)
        };
    },
    /**
     * Calculate Shop Utilization
     */
    calculateUtilization: function(machineHours) {
        const available = machineHours.available || 40; // hours per week
        const productive = machineHours.productive || 0;
        const setup = machineHours.setup || 0;
        const maintenance = machineHours.maintenance || 0;
        const idle = available - productive - setup - maintenance;

        return {
            utilization: ((productive / available) * 100).toFixed(1) + '%',
            breakdown: {
                productive: ((productive / available) * 100).toFixed(1) + '%',
                setup: ((setup / available) * 100).toFixed(1) + '%',
                maintenance: ((maintenance / available) * 100).toFixed(1) + '%',
                idle: ((Math.max(0, idle) / available) * 100).toFixed(1) + '%'
            },
            hours: { available, productive, setup, maintenance, idle: Math.max(0, idle) }
        };
    },
    /**
     * Calculate Throughput Metrics
     */
    calculateThroughput: function(periodData) {
        const jobs = periodData.jobsCompleted || 0;
        const parts = periodData.partsProduced || 0;
        const revenue = periodData.revenue || 0;
        const days = periodData.workDays || 22;
        const machines = periodData.machines || 1;

        return {
            jobsPerDay: (jobs / days).toFixed(2),
            partsPerDay: (parts / days).toFixed(0),
            revenuePerDay: '$' + (revenue / days).toFixed(0),
            revenuePerMachineDay: '$' + (revenue / (days * machines)).toFixed(0),
            partsPerMachine: (parts / machines).toFixed(0)
        };
    },
    /**
     * Calculate Quote Win Rate
     */
    calculateWinRate: function(quoteData) {
        const sent = quoteData.quotesSent || 0;
        const won = quoteData.quotesWon || 0;
        const value = quoteData.totalValue || 0;
        const wonValue = quoteData.wonValue || 0;

        return {
            countRate: sent > 0 ? ((won / sent) * 100).toFixed(1) + '%' : 'N/A',
            valueRate: value > 0 ? ((wonValue / value) * 100).toFixed(1) + '%' : 'N/A',
            avgQuoteValue: sent > 0 ? '$' + (value / sent).toFixed(0) : 'N/A',
            avgWonValue: won > 0 ? '$' + (wonValue / won).toFixed(0) : 'N/A',
            conversionFunnel: {
                sent, won, lost: sent - won, pending: 0
            }
        };
    },
    /**
     * Generate Shop Dashboard Summary
     */
    generateDashboard: function(shopData) {
        return {
            generated: new Date().toISOString(),
            period: shopData.period || 'current_month',

            kpis: {
                oee: this.calculateOEE(shopData.machines),
                otd: this.calculateOTD(shopData.jobs || []),
                fpy: this.calculateFPY(shopData.quality),
                utilization: this.calculateUtilization(shopData.hours),
                throughput: this.calculateThroughput(shopData.period_data),
                winRate: this.calculateWinRate(shopData.quotes)
            },
            financials: {
                revenue: shopData.revenue || 0,
                costs: shopData.costs || 0,
                grossMargin: shopData.revenue ?
                    (((shopData.revenue - shopData.costs) / shopData.revenue) * 100).toFixed(1) + '%' : 'N/A'
            },
            alerts: this._generateAlerts(shopData)
        };
    },
    _generateAlerts: function(shopData) {
        const alerts = [];

        // Check OEE
        const oee = parseFloat(this.calculateOEE(shopData.machines).oee);
        if (oee < 65) {
            alerts.push({ level: 'warning', message: `OEE is below target (${oee}%)` });
        }
        // Check OTD
        const otd = this.calculateOTD(shopData.jobs || []);
        if (parseFloat(otd.rate) < 95) {
            alerts.push({ level: 'warning', message: `On-time delivery below 95% (${otd.rate})` });
        }
        // Check FPY
        const fpy = this.calculateFPY(shopData.quality);
        if (parseFloat(fpy.rate) < 95) {
            alerts.push({ level: 'warning', message: `First pass yield below 95% (${fpy.rate})` });
        }
        return alerts;
    }
};
// SECTION 5: FINANCIAL ANALYSIS ENGINE

const PRISM_FINANCIAL_ENGINE = {

    version: '1.0.0',

    /**
     * Calculate Net Present Value (NPV)
     */
    calculateNPV: function(cashFlows, discountRate) {
        let npv = 0;
        cashFlows.forEach((cf, year) => {
            npv += cf / Math.pow(1 + discountRate, year);
        });
        return {
            npv: npv,
            formatted: '$' + npv.toFixed(2),
            viable: npv > 0,
            recommendation: npv > 0 ? 'Project is financially viable' : 'Project does not meet hurdle rate'
        };
    },
    /**
     * Calculate Internal Rate of Return (IRR)
     */
    calculateIRR: function(cashFlows, guess = 0.1) {
        const maxIterations = 100;
        const tolerance = 0.0001;
        let rate = guess;

        for (let i = 0; i < maxIterations; i++) {
            let npv = 0;
            let derivativeNpv = 0;

            cashFlows.forEach((cf, year) => {
                npv += cf / Math.pow(1 + rate, year);
                if (year > 0) {
                    derivativeNpv -= year * cf / Math.pow(1 + rate, year + 1);
                }
            });

            const newRate = rate - npv / derivativeNpv;

            if (Math.abs(newRate - rate) < tolerance) {
                return {
                    irr: newRate,
                    formatted: (newRate * 100).toFixed(2) + '%',
                    iterations: i + 1
                };
            }
            rate = newRate;
        }
        return { irr: rate, formatted: (rate * 100).toFixed(2) + '%', converged: false };
    },
    /**
     * Calculate Payback Period
     */
    calculatePayback: function(initialInvestment, annualCashFlow) {
        const paybackYears = initialInvestment / annualCashFlow;

        return {
            years: paybackYears,
            formatted: paybackYears.toFixed(2) + ' years',
            acceptable: paybackYears <= 3, // Typical 3-year threshold
            recommendation: paybackYears <= 3 ?
                'Investment recovers within acceptable timeframe' :
                'Payback period exceeds typical 3-year threshold'
        };
    },
    /**
     * Calculate Break-Even Point
     */
    calculateBreakEven: function(fixedCosts, pricePerUnit, variableCostPerUnit) {
        const contributionMargin = pricePerUnit - variableCostPerUnit;
        const breakEvenUnits = fixedCosts / contributionMargin;
        const breakEvenRevenue = breakEvenUnits * pricePerUnit;

        return {
            units: Math.ceil(breakEvenUnits),
            revenue: '$' + breakEvenRevenue.toFixed(2),
            contributionMargin: '$' + contributionMargin.toFixed(2),
            marginPercent: ((contributionMargin / pricePerUnit) * 100).toFixed(1) + '%'
        };
    },
    /**
     * Calculate Return on Investment (ROI)
     */
    calculateROI: function(gain, cost) {
        const roi = (gain - cost) / cost;
        return {
            roi: roi,
            formatted: (roi * 100).toFixed(1) + '%',
            profitable: roi > 0
        };
    },
    /**
     * Machine Investment Analysis
     */
    analyzeMachineInvestment: function(investment) {
        const {
            machineCost,
            installationCost = 0,
            trainingCost = 0,
            annualRevenue,
            annualOperatingCost,
            usefulLife = 10,
            salvageValue = 0,
            discountRate = 0.10
        } = investment;

        const totalInvestment = machineCost + installationCost + trainingCost;
        const annualCashFlow = annualRevenue - annualOperatingCost;

        // Build cash flow array
        const cashFlows = [-totalInvestment];
        for (let year = 1; year <= usefulLife; year++) {
            let cf = annualCashFlow;
            if (year === usefulLife) cf += salvageValue;
            cashFlows.push(cf);
        }
        // Calculate depreciation (straight-line)
        const annualDepreciation = (totalInvestment - salvageValue) / usefulLife;

        return {
            summary: {
                totalInvestment: '$' + totalInvestment.toFixed(0),
                annualCashFlow: '$' + annualCashFlow.toFixed(0),
                usefulLife: usefulLife + ' years'
            },
            npv: this.calculateNPV(cashFlows, discountRate),
            irr: this.calculateIRR(cashFlows),
            payback: this.calculatePayback(totalInvestment, annualCashFlow),
            roi: this.calculateROI(annualCashFlow * usefulLife + salvageValue, totalInvestment),

            depreciation: {
                method: 'Straight-line',
                annual: '$' + annualDepreciation.toFixed(0),
                bookValueYear5: '$' + (totalInvestment - annualDepreciation * 5).toFixed(0)
            },
            recommendation: this._generateInvestmentRecommendation(
                this.calculateNPV(cashFlows, discountRate).npv,
                this.calculateIRR(cashFlows).irr,
                this.calculatePayback(totalInvestment, annualCashFlow).years,
                discountRate
            )
        };
    },
    _generateInvestmentRecommendation: function(npv, irr, payback, hurdleRate) {
        let score = 0;
        const factors = [];

        if (npv > 0) {
            score += 2;
            factors.push('Positive NPV');
        } else {
            factors.push('Negative NPV - does not meet return requirements');
        }
        if (irr > hurdleRate) {
            score += 2;
            factors.push(`IRR (${(irr * 100).toFixed(1)}%) exceeds hurdle rate (${(hurdleRate * 100).toFixed(1)}%)`);
        } else {
            factors.push(`IRR below hurdle rate`);
        }
        if (payback <= 3) {
            score += 1;
            factors.push('Payback within 3 years');
        } else if (payback <= 5) {
            factors.push('Payback within 5 years - moderate risk');
        } else {
            factors.push('Long payback period - higher risk');
        }
        let recommendation;
        if (score >= 4) recommendation = 'STRONGLY RECOMMEND - All financial metrics favorable';
        else if (score >= 3) recommendation = 'RECOMMEND - Most financial metrics favorable';
        else if (score >= 2) recommendation = 'CONDITIONAL - Some concerns, requires further analysis';
        else recommendation = 'NOT RECOMMENDED - Financial metrics unfavorable';

        return { recommendation, score, factors };
    }
};
// SECTION 6: SCHEDULING ENGINE (Operations Research)

const PRISM_SCHEDULING_ENGINE = {

    version: '1.0.0',

    /**
     * Johnson's Algorithm for 2-machine flow shop
     * Minimizes makespan for jobs requiring Machine A then Machine B
     */
    johnsonsAlgorithm: function(jobs) {
        // jobs = [{ id, machineA: time, machineB: time }]
        const U = []; // Jobs where A < B (schedule early)
        const V = []; // Jobs where A >= B (schedule late)

        jobs.forEach(job => {
            if (job.machineA < job.machineB) {
                U.push(job);
            } else {
                V.push(job);
            }
        });

        // Sort U by increasing A time, V by decreasing B time
        U.sort((a, b) => a.machineA - b.machineA);
        V.sort((a, b) => b.machineB - a.machineB);

        const schedule = [...U, ...V];
        const makespan = this._calculateMakespan(schedule);

        return {
            sequence: schedule.map(j => j.id),
            schedule,
            makespan,
            machineAEnd: makespan.machineATotal,
            machineBEnd: makespan.total
        };
    },
    _calculateMakespan: function(schedule) {
        let machineAEnd = 0;
        let machineBEnd = 0;
        const timeline = [];

        schedule.forEach(job => {
            const aStart = machineAEnd;
            const aEnd = aStart + job.machineA;
            const bStart = Math.max(aEnd, machineBEnd);
            const bEnd = bStart + job.machineB;

            timeline.push({
                job: job.id,
                machineA: { start: aStart, end: aEnd },
                machineB: { start: bStart, end: bEnd }
            });

            machineAEnd = aEnd;
            machineBEnd = bEnd;
        });

        return {
            total: machineBEnd,
            machineATotal: machineAEnd,
            timeline
        };
    },
    /**
     * Priority Dispatching Rules
     */
    priorityDispatch: function(jobs, rule = 'EDD') {
        const sorted = [...jobs];

        switch (rule) {
            case 'EDD': // Earliest Due Date
                sorted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                break;
            case 'SPT': // Shortest Processing Time
                sorted.sort((a, b) => a.processingTime - b.processingTime);
                break;
            case 'LPT': // Longest Processing Time
                sorted.sort((a, b) => b.processingTime - a.processingTime);
                break;
            case 'FCFS': // First Come First Served
                sorted.sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime));
                break;
            case 'CR': // Critical Ratio
                const now = new Date();
                sorted.sort((a, b) => {
                    const crA = (new Date(a.dueDate) - now) / a.processingTime;
                    const crB = (new Date(b.dueDate) - now) / b.processingTime;
                    return crA - crB;
                });
                break;
            case 'SLACK': // Minimum Slack Time
                const today = new Date();
                sorted.sort((a, b) => {
                    const slackA = (new Date(a.dueDate) - today) / (1000 * 60 * 60 * 24) - a.processingTime / 8;
                    const slackB = (new Date(b.dueDate) - today) / (1000 * 60 * 60 * 24) - b.processingTime / 8;
                    return slackA - slackB;
                });
                break;
        }
        return {
            rule,
            sequence: sorted.map(j => j.id),
            schedule: sorted
        };
    },
    /**
     * Calculate Schedule Metrics
     */
    calculateMetrics: function(schedule) {
        let totalFlowTime = 0;
        let totalLateness = 0;
        let totalTardiness = 0;
        let lateJobs = 0;
        let currentTime = 0;
        const now = new Date();

        schedule.forEach(job => {
            currentTime += job.processingTime;
            const flowTime = currentTime;
            totalFlowTime += flowTime;

            const dueDate = new Date(job.dueDate);
            const completionDate = new Date(now);
            completionDate.setHours(completionDate.getHours() + flowTime);

            const lateness = (completionDate - dueDate) / (1000 * 60 * 60);
            totalLateness += lateness;

            if (lateness > 0) {
                totalTardiness += lateness;
                lateJobs++;
            }
        });

        const n = schedule.length;

        return {
            makespan: currentTime,
            avgFlowTime: (totalFlowTime / n).toFixed(2),
            avgLateness: (totalLateness / n).toFixed(2),
            avgTardiness: (totalTardiness / n).toFixed(2),
            lateJobs,
            onTimeRate: (((n - lateJobs) / n) * 100).toFixed(1) + '%'
        };
    },
    /**
     * Gantt Chart Data Generator
     */
    generateGanttData: function(schedule, startDate = new Date()) {
        const ganttData = [];
        let currentTime = 0;

        schedule.forEach(job => {
            const startTime = new Date(startDate);
            startTime.setHours(startTime.getHours() + currentTime);

            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + job.processingTime);

            ganttData.push({
                id: job.id,
                name: job.name || job.id,
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                duration: job.processingTime,
                machine: job.machine || 'Machine 1',
                status: job.status || 'scheduled'
            });

            currentTime += job.processingTime;
        });

        return ganttData;
    }
};
// SECTION 7: INVENTORY MANAGEMENT ENGINE

const PRISM_INVENTORY_ENGINE = {

    version: '1.0.0',

    /**
     * Economic Order Quantity (EOQ)
     */
    calculateEOQ: function(params) {
        const { annualDemand, orderCost, holdingCostPerUnit } = params;

        const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
        const ordersPerYear = annualDemand / eoq;
        const totalOrderCost = ordersPerYear * orderCost;
        const avgInventory = eoq / 2;
        const totalHoldingCost = avgInventory * holdingCostPerUnit;
        const totalCost = totalOrderCost + totalHoldingCost;

        return {
            eoq: Math.round(eoq),
            ordersPerYear: ordersPerYear.toFixed(1),
            orderInterval: (365 / ordersPerYear).toFixed(0) + ' days',
            costs: {
                totalAnnual: '$' + totalCost.toFixed(2),
                ordering: '$' + totalOrderCost.toFixed(2),
                holding: '$' + totalHoldingCost.toFixed(2)
            }
        };
    },
    /**
     * Safety Stock Calculation
     */
    calculateSafetyStock: function(params) {
        const {
            avgDemand,
            demandStdDev,
            avgLeadTime,
            leadTimeStdDev = 0,
            serviceLevel = 0.95
        } = params;

        // Z-score for service level
        const zScores = { 0.90: 1.28, 0.95: 1.65, 0.99: 2.33 };
        const z = zScores[serviceLevel] || 1.65;

        // Safety stock formula considering both demand and lead time variability
        const demandVariability = Math.sqrt(avgLeadTime) * demandStdDev;
        const leadTimeVariability = avgDemand * leadTimeStdDev;
        const combinedStdDev = Math.sqrt(Math.pow(demandVariability, 2) + Math.pow(leadTimeVariability, 2));

        const safetyStock = z * combinedStdDev;

        return {
            safetyStock: Math.ceil(safetyStock),
            reorderPoint: Math.ceil(avgDemand * avgLeadTime + safetyStock),
            serviceLevel: (serviceLevel * 100) + '%',
            formula: 'Safety Stock = Z × √(LT × σd² + d² × σLT²)'
        };
    },
    /**
     * ABC Classification
     */
    classifyABC: function(items) {
        // Calculate annual value for each item
        const itemsWithValue = items.map(item => ({
            ...item,
            annualValue: (item.annualUsage || 0) * (item.unitCost || 0)
        }));

        // Sort by annual value descending
        itemsWithValue.sort((a, b) => b.annualValue - a.annualValue);

        // Calculate total value
        const totalValue = itemsWithValue.reduce((sum, item) => sum + item.annualValue, 0);

        // Classify items
        let cumulativePercent = 0;
        const classified = itemsWithValue.map(item => {
            const percent = item.annualValue / totalValue;
            cumulativePercent += percent;

            let classification;
            if (cumulativePercent <= 0.80) classification = 'A';
            else if (cumulativePercent <= 0.95) classification = 'B';
            else classification = 'C';

            return {
                ...item,
                percentOfValue: (percent * 100).toFixed(2) + '%',
                cumulativePercent: (cumulativePercent * 100).toFixed(2) + '%',
                classification
            };
        });

        // Summary
        const summary = {
            A: { count: 0, value: 0 },
            B: { count: 0, value: 0 },
            C: { count: 0, value: 0 }
        };
        classified.forEach(item => {
            summary[item.classification].count++;
            summary[item.classification].value += item.annualValue;
        });

        return {
            items: classified,
            summary: {
                A: {
                    items: summary.A.count,
                    percentItems: ((summary.A.count / items.length) * 100).toFixed(1) + '%',
                    percentValue: ((summary.A.value / totalValue) * 100).toFixed(1) + '%'
                },
                B: {
                    items: summary.B.count,
                    percentItems: ((summary.B.count / items.length) * 100).toFixed(1) + '%',
                    percentValue: ((summary.B.value / totalValue) * 100).toFixed(1) + '%'
                },
                C: {
                    items: summary.C.count,
                    percentItems: ((summary.C.count / items.length) * 100).toFixed(1) + '%',
                    percentValue: ((summary.C.value / totalValue) * 100).toFixed(1) + '%'
                }
            }
        };
    },
    /**
     * Tool Inventory Optimization
     */
    optimizeToolInventory: function(tools) {
        return tools.map(tool => {
            const eoq = this.calculateEOQ({
                annualDemand: tool.annualUsage,
                orderCost: tool.orderCost || 25,
                holdingCostPerUnit: tool.unitCost * 0.25 // 25% holding cost
            });

            const safety = this.calculateSafetyStock({
                avgDemand: tool.annualUsage / 52, // Weekly demand
                demandStdDev: tool.demandVariability || tool.annualUsage * 0.1 / 52,
                avgLeadTime: tool.leadTimeWeeks || 2
            });

            return {
                tool: tool.name || tool.id,
                eoq: eoq.eoq,
                safetyStock: safety.safetyStock,
                reorderPoint: safety.reorderPoint,
                minStock: safety.safetyStock,
                maxStock: eoq.eoq + safety.safetyStock
            };
        });
    }
};
// SECTION 8: ENHANCED CLAUDE SYSTEM PROMPT FOR BUSINESS AI

const PRISM_BUSINESS_AI_SYSTEM_PROMPT = `
## BUSINESS & OPERATIONS MANAGEMENT EXPERTISE

### 8. JOB COSTING & QUOTING
- **Cost Components**: Material, labor, overhead, setup, programming, inspection, finishing
- **Pricing Strategies**: Cost-plus, value-based, competitive, target pricing
- **Quote Elements**: Lead time, terms, volume discounts, rush premiums
- **Margin Analysis**: Gross margin, contribution margin, break-even

### 9. SHOP FLOOR MANAGEMENT
- **Job Tracking**: Status management, milestone tracking, completion percentage
- **Work Orders**: Creation, scheduling, routing, completion
- **Time Tracking**: Direct labor, setup time, machine time
- **Quality Management**: First article inspection, in-process inspection, final inspection, NCRs

### 10. SCHEDULING & PLANNING
- **Dispatching Rules**: EDD (Earliest Due Date), SPT (Shortest Processing Time), CR (Critical Ratio)
- **Johnson's Algorithm**: Optimal 2-machine flow shop sequencing
- **Capacity Planning**: Load balancing, bottleneck identification
- **Lead Time Estimation**: Setup, machining, queue, move times

### 11. INVENTORY MANAGEMENT
- **EOQ (Economic Order Quantity)**: √(2DS/H) - optimal order quantity
- **Safety Stock**: Z × σ × √L - buffer for demand variability
- **ABC Classification**: Pareto analysis for inventory prioritization
- **Reorder Point**: (Average demand × Lead time) + Safety stock

### 12. FINANCIAL ANALYSIS
- **NPV (Net Present Value)**: ∑[CFt / (1+r)^t] - project viability
- **IRR (Internal Rate of Return)**: Rate where NPV = 0
- **Payback Period**: Initial investment / Annual cash flow
- **ROI (Return on Investment)**: (Gain - Cost) / Cost
- **Break-Even Analysis**: Fixed costs / Contribution margin

### 13. SHOP KPIs & ANALYTICS
- **OEE (Overall Equipment Effectiveness)**: Availability × Performance × Quality
  - World Class OEE: 85%+
  - Typical OEE: 60-65%
- **On-Time Delivery (OTD)**: Target 95%+
- **First Pass Yield (FPY)**: Target 95%+
- **Shop Utilization**: Productive time / Available time
- **Throughput**: Jobs per day, parts per machine

### 14. ERP INTEGRATION CONCEPTS
- **MRP (Material Requirements Planning)**: Dependent demand calculation
- **BOM (Bill of Materials)**: Component structure and quantities
- **Work Order Management**: Creation, release, tracking, closure
- **Purchase Order Management**: Vendor selection, ordering, receiving

### BUSINESS FORMULAS

**Job Costing:**
- Total Cost = Material + Labor + Overhead + Setup + Finishing
- Unit Cost = Total Cost / Quantity
- Quote Price = Total Cost / (1 - Target Margin)

**Scheduling:**
- Makespan = Completion time of last job
- Flow Time = Completion time - Release time
- Tardiness = max(0, Completion - Due Date)
- Critical Ratio = (Due Date - Today) / Processing Time

**Inventory:**
- EOQ = √(2 × Annual Demand × Order Cost / Holding Cost)
- Reorder Point = (Daily Demand × Lead Time) + Safety Stock
- Safety Stock = Z × σ_demand × √Lead Time

**Financial:**
- NPV = -Initial Investment + ∑(Cash Flow_t / (1 + r)^t)
- Payback = Initial Investment / Annual Cash Flow
- ROI = (Total Return - Investment) / Investment × 100%
- Break-Even Units = Fixed Costs / (Price - Variable Cost)

When asked about business operations, provide specific calculations, industry benchmarks, and actionable recommendations.
`;

// SECTION 9: BUSINESS AI NEURAL NETWORK MODELS

const PRISM_BUSINESS_AI_MODELS = {

    jobDelayPredictor: null,
    costVariancePredictor: null,
    demandForecaster: null,

    /**
     * Job Delay Predictor - predicts likelihood of job being late
     */
    createJobDelayModel: function() {
        if (typeof PRISM_NEURAL_NETWORK === 'undefined') {
            (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM Business AI] Neural network engine not loaded');
            return null;
        }
        console.log('[PRISM Business AI] Training Job Delay Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('JobDelayPredictor');
        model.add(new PRISM_NN_LAYERS.Dense(6, 12, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(12, 2, 'softmax'));
        model.compile({ loss: 'crossentropy', learningRate: 0.01 });

        // Training data: [complexity, qty, daysToDelivery, shopLoad, materialReady, programmingDone]
        const { X, y } = this._generateDelayData(400);
        model.fit(X, y, { epochs: 30, verbose: false });

        this.jobDelayPredictor = model;
        console.log('[PRISM Business AI] Job Delay Predictor ready');
        return model;
    },
    _generateDelayData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const complexity = Math.random();
            const qty = Math.random();
            const daysToDelivery = Math.random();
            const shopLoad = Math.random();
            const materialReady = Math.random() > 0.3 ? 1 : 0;
            const programmingDone = Math.random() > 0.4 ? 1 : 0;

            X.push([complexity, qty, daysToDelivery, shopLoad, materialReady, programmingDone]);

            // Delay likelihood based on factors
            const delayScore = complexity * 0.25 + qty * 0.15 - daysToDelivery * 0.3 +
                              shopLoad * 0.2 - materialReady * 0.1 - programmingDone * 0.1;

            if (delayScore > 0.3) y.push([0, 1]); // Likely delayed
            else y.push([1, 0]); // On time
        }
        return { X, y };
    },
    /**
     * Cost Variance Predictor - predicts if job will be over/under budget
     */
    createCostVarianceModel: function() {
        if (typeof PRISM_NEURAL_NETWORK === 'undefined') return null;

        console.log('[PRISM Business AI] Training Cost Variance Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('CostVariancePredictor');
        model.add(new PRISM_NN_LAYERS.Dense(5, 10, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(10, 1, 'linear'));
        model.compile({ loss: 'mse', learningRate: 0.005 });

        const { X, y } = this._generateCostVarianceData(300);
        model.fit(X, y, { epochs: 40, verbose: false });

        this.costVariancePredictor = model;
        console.log('[PRISM Business AI] Cost Variance Predictor ready');
        return model;
    },
    _generateCostVarianceData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const complexity = Math.random();
            const newCustomer = Math.random() > 0.7 ? 1 : 0;
            const newMaterial = Math.random() > 0.8 ? 1 : 0;
            const histAccuracy = 0.8 + Math.random() * 0.2; // Historical estimate accuracy
            const setupChanges = Math.random();

            X.push([complexity, newCustomer, newMaterial, histAccuracy, setupChanges]);

            // Variance: positive = over budget, negative = under budget
            const variance = (complexity * 0.2 + newCustomer * 0.1 + newMaterial * 0.15 +
                            setupChanges * 0.1 - histAccuracy * 0.3) * 0.5;
            y.push([variance]);
        }
        return { X, y };
    },
    /**
     * Predict job delay
     */
    predictDelay: function(input) {
        if (!this.jobDelayPredictor) this.createJobDelayModel();
        if (!this.jobDelayPredictor) return { error: 'Model not available' };

        const output = this.jobDelayPredictor.predict(input);
        return {
            onTime: output[0],
            delayed: output[1],
            prediction: output[0] > output[1] ? 'On Time' : 'At Risk',
            confidence: Math.max(output[0], output[1]),
            recommendation: output[1] > 0.5 ?
                'Consider expediting material or adding capacity' :
                'Job is on track for on-time delivery'
        };
    },
    /**
     * Predict cost variance
     */
    predictCostVariance: function(input) {
        if (!this.costVariancePredictor) this.createCostVarianceModel();
        if (!this.costVariancePredictor) return { error: 'Model not available' };

        const output = this.costVariancePredictor.predict(input);
        const variance = output[0];

        return {
            expectedVariance: (variance * 100).toFixed(1) + '%',
            direction: variance > 0.05 ? 'Over Budget' : variance < -0.05 ? 'Under Budget' : 'On Budget',
            recommendation: variance > 0.1 ?
                'High risk of cost overrun - review estimate assumptions' :
                'Cost estimate appears reasonable'
        };
    }
};
// SECTION 10: MAIN BUSINESS AI COORDINATOR

const PRISM_BUSINESS_AI_SYSTEM = {

    version: '1.0.0',
    name: 'PRISM Business Intelligence System',
    initialized: false,

    // Component references
    costing: PRISM_JOB_COSTING_ENGINE,
    quoting: PRISM_QUOTING_ENGINE,
    jobs: PRISM_JOB_TRACKING_ENGINE,
    analytics: PRISM_SHOP_ANALYTICS_ENGINE,
    financial: PRISM_FINANCIAL_ENGINE,
    scheduling: PRISM_SCHEDULING_ENGINE,
    inventory: PRISM_INVENTORY_ENGINE,
    models: PRISM_BUSINESS_AI_MODELS,

    /**
     * Initialize business AI system
     */
    initialize: function() {
        console.log('[PRISM Business AI] Initializing...');

        // Initialize AI models if neural network engine available
        if (typeof PRISM_NN_LAYERS !== 'undefined') {
            PRISM_BUSINESS_AI_MODELS.createJobDelayModel();
            PRISM_BUSINESS_AI_MODELS.createCostVarianceModel();
        }
        this.initialized = true;
        console.log('[PRISM Business AI] Ready');

        return { success: true, components: Object.keys(this).filter(k => typeof this[k] === 'object') };
    },
    /**
     * Quick cost estimate
     */
    quickCost: function(params) {
        return PRISM_JOB_COSTING_ENGINE.calculateJobCost(params);
    },
    /**
     * Generate quote
     */
    quote: function(jobSpec, options) {
        return PRISM_QUOTING_ENGINE.generateQuote(jobSpec, options);
    },
    /**
     * Calculate KPIs
     */
    kpis: function(shopData) {
        return PRISM_SHOP_ANALYTICS_ENGINE.generateDashboard(shopData);
    },
    /**
     * Analyze investment
     */
    analyzeInvestment: function(params) {
        return PRISM_FINANCIAL_ENGINE.analyzeMachineInvestment(params);
    },
    /**
     * Optimize schedule
     */
    schedule: function(jobs, method = 'EDD') {
        return PRISM_SCHEDULING_ENGINE.priorityDispatch(jobs, method);
    },
    /**
     * Calculate inventory parameters
     */
    inventoryParams: function(params) {
        return {
            eoq: PRISM_INVENTORY_ENGINE.calculateEOQ(params),
            safetyStock: PRISM_INVENTORY_ENGINE.calculateSafetyStock(params)
        };
    },
    /**
     * Predict job delay
     */
    predictDelay: function(jobParams) {
        return PRISM_BUSINESS_AI_MODELS.predictDelay(jobParams);
    },
    /**
     * Run self-tests
     */
    runTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM BUSINESS AI SYSTEM v1.0 - SELF-TESTS');
        console.log('═══════════════════════════════════════════════════════════════');

        let passed = 0, failed = 0;

        // Test 1: Job Costing
        try {
            const cost = PRISM_JOB_COSTING_ENGINE.calculateJobCost({
                quantity: 10,
                material: { type: 'aluminum_6061', length: 100, width: 50, height: 25 },
                operations: [{ type: 'roughing' }, { type: 'finishing' }],
                machineType: 'cnc_mill_3axis'
            });
            if (cost.total > 0 && cost.perPart > 0) {
                console.log('  ✅ Job Costing Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Job Costing Engine: FAIL');
            failed++;
        }
        // Test 2: Quoting
        try {
            const quote = PRISM_QUOTING_ENGINE.generateQuote({
                quantity: 25,
                complexity: 'medium',
                material: { type: 'steel_4140' },
                operations: [{ type: 'roughing' }]
            });
            if (quote.quoteNumber && quote.pricing.totalPrice > 0) {
                console.log('  ✅ Quoting Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Quoting Engine: FAIL');
            failed++;
        }
        // Test 3: OEE Calculation
        try {
            const oee = PRISM_SHOP_ANALYTICS_ENGINE.calculateOEE({
                plannedTime: 480,
                downtime: 60,
                idealCycleTime: 2,
                totalParts: 180,
                goodParts: 175
            });
            if (oee.oee && parseFloat(oee.oee) > 0) {
                console.log('  ✅ OEE Calculation: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ OEE Calculation: FAIL');
            failed++;
        }
        // Test 4: NPV Calculation
        try {
            const npv = PRISM_FINANCIAL_ENGINE.calculateNPV([-100000, 30000, 35000, 40000, 45000], 0.10);
            if (npv.npv && !isNaN(npv.npv)) {
                console.log('  ✅ NPV Calculation: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ NPV Calculation: FAIL');
            failed++;
        }
        // Test 5: Johnson's Algorithm
        try {
            const schedule = PRISM_SCHEDULING_ENGINE.johnsonsAlgorithm([
                { id: 'J1', machineA: 3, machineB: 4 },
                { id: 'J2', machineA: 2, machineB: 5 },
                { id: 'J3', machineA: 4, machineB: 2 }
            ]);
            if (schedule.sequence && schedule.makespan.total > 0) {
                console.log('  ✅ Scheduling Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Scheduling Engine: FAIL');
            failed++;
        }
        // Test 6: EOQ Calculation
        try {
            const eoq = PRISM_INVENTORY_ENGINE.calculateEOQ({
                annualDemand: 1000,
                orderCost: 50,
                holdingCostPerUnit: 5
            });
            if (eoq.eoq && eoq.eoq > 0) {
                console.log('  ✅ Inventory Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Inventory Engine: FAIL');
            failed++;
        }
        // Test 7: Job Tracking
        try {
            const quote = PRISM_QUOTING_ENGINE.generateQuote({ quantity: 5, operations: [] });
            const job = PRISM_JOB_TRACKING_ENGINE.createJob(quote, {});
            if (job.id && job.status === PRISM_JOB_TRACKING_ENGINE.STATUS.ORDERED) {
                console.log('  ✅ Job Tracking Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Job Tracking Engine: FAIL');
            failed++;
        }
        // Test 8: ABC Classification
        try {
            const abc = PRISM_INVENTORY_ENGINE.classifyABC([
                { id: 'T1', annualUsage: 100, unitCost: 50 },
                { id: 'T2', annualUsage: 500, unitCost: 10 },
                { id: 'T3', annualUsage: 50, unitCost: 200 }
            ]);
            if (abc.items && abc.summary.A) {
                console.log('  ✅ ABC Classification: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ ABC Classification: FAIL');
            failed++;
        }
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
}