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
}