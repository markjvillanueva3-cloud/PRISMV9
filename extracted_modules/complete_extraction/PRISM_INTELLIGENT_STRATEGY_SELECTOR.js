const PRISM_INTELLIGENT_STRATEGY_SELECTOR = {
    version: '1.0.0',

    // Strategy definitions with material/machine constraints
    strategies: {
        // Pocket strategies
        'adaptive_clearing': {
            type: 'roughing',
            features: ['pocket', 'rectangular_pocket', 'circular_pocket', 'open_pocket'],
            materials: ['all'],
            minRigidity: 'light',
            description: 'Constant engagement HSM roughing',
            params: { engagementPct: 10, docMult: 2.0 }
        },
        'trochoidal_pocket': {
            type: 'roughing',
            features: ['pocket', 'slot'],
            materials: ['stainless', 'titanium', 'inconel', 'hardened'],
            minRigidity: 'medium',
            description: 'Trochoidal for difficult materials',
            params: { engagementPct: 8, docMult: 2.5 }
        },
        'plunge_rough': {
            type: 'roughing',
            features: ['pocket', 'deep_pocket'],
            materials: ['all'],
            minRigidity: 'light',
            description: 'Axial roughing for deep features',
            params: { engagementPct: 50, docMult: 0.5 }
        },
        'spiral_pocket': {
            type: 'roughing',
            features: ['circular_pocket'],
            materials: ['aluminum', 'steel', 'cast_iron'],
            minRigidity: 'medium',
            description: 'Spiral-out for circular pockets'
        },
        // Finishing strategies
        'waterline': {
            type: 'finishing',
            features: ['3d_surface', 'steep_wall', 'contour'],
            materials: ['all'],
            minRigidity: 'light',
            description: 'Constant Z finishing for steep areas'
        },
        'parallel_finish': {
            type: 'finishing',
            features: ['3d_surface', 'shallow_surface', 'floor'],
            materials: ['all'],
            minRigidity: 'light',
            description: 'Parallel passes for flat/shallow areas'
        },
        'scallop': {
            type: 'finishing',
            features: ['3d_surface', 'curved_surface'],
            materials: ['all'],
            minRigidity: 'medium',
            description: 'Constant scallop height finishing'
        },
        'pencil': {
            type: 'finishing',
            features: ['fillet', 'corner', 'blend'],
            materials: ['all'],
            minRigidity: 'light',
            description: 'Clean up internal corners'
        },
        // Hole strategies
        'peck_drill': {
            type: 'holemaking',
            features: ['hole', 'through_hole', 'blind_hole'],
            materials: ['steel', 'stainless', 'titanium', 'inconel'],
            minRigidity: 'light',
            description: 'Peck drilling for chip evacuation',
            depthThreshold: 3 // Times diameter
        },
        'std_drill': {
            type: 'holemaking',
            features: ['hole', 'through_hole'],
            materials: ['aluminum', 'brass', 'plastic'],
            minRigidity: 'ultra_light',
            description: 'Standard drilling for easy materials'
        },
        'helical_bore': {
            type: 'holemaking',
            features: ['hole', 'precision_hole'],
            materials: ['all'],
            minRigidity: 'medium',
            description: 'Helical interpolation for precision holes'
        }
    },
    // Rigidity hierarchy
    rigidityOrder: ['ultra_light', 'light', 'medium', 'heavy', 'ultra_rigid'],

    /**
     * Select best strategy for feature
     */
    select(feature, material, machineId) {
        const featureType = (feature.type || 'pocket').toLowerCase();
        const materialClass = this._getMaterialClass(material);
        const rigidityClass = this._getMachineRigidity(machineId);

        const candidates = [];

        for (const [stratId, strat] of Object.entries(this.strategies)) {
            // Check feature match
            const featureMatch = strat.features.some(f =>
                featureType.includes(f) || f.includes(featureType)
            );
            if (!featureMatch) continue;

            // Check material compatibility
            const materialMatch = strat.materials.includes('all') ||
                strat.materials.includes(materialClass);
            if (!materialMatch) continue;

            // Check rigidity requirement
            const rigidityMet = this._rigidityMet(rigidityClass, strat.minRigidity);
            if (!rigidityMet) continue;

            // Score the candidate
            const score = this._scoreStrategy(strat, feature, materialClass, rigidityClass);
            candidates.push({ id: stratId, ...strat, score });
        }
        // Sort by score and return best
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
            console.log('[STRATEGY_SELECTOR] Selected:', candidates[0].id, 'for', featureType);
            return candidates[0];
        }
        // Fallback
        return {
            id: 'default_3d',
            type: 'roughing',
            description: 'Default 3D roughing'
        };
    },
    /**
     * Score strategy for ranking
     */
    _scoreStrategy(strat, feature, materialClass, rigidityClass) {
        let score = 50;

        // Material-specific strategies get bonus
        if (!strat.materials.includes('all')) {
            score += 20;
        }
        // Type match bonus
        if (feature.operation === strat.type) {
            score += 15;
        }
        // Rigidity bonus (higher rigidity = can use more aggressive strategies)
        const rigidityIndex = this.rigidityOrder.indexOf(rigidityClass);
        score += rigidityIndex * 5;

        // Depth considerations
        if (feature.depth && strat.depthThreshold) {
            const ratio = feature.depth / (feature.diameter || 0.5);
            if (ratio > strat.depthThreshold) {
                score += 10; // Strategy designed for this depth
            }
        }
        return score;
    },
    _getMaterialClass(material) {
        const mat = (material || 'steel').toLowerCase();
        if (mat.includes('aluminum')) return 'aluminum';
        if (mat.includes('stainless')) return 'stainless';
        if (mat.includes('titanium')) return 'titanium';
        if (mat.includes('inconel') || mat.includes('hastelloy')) return 'inconel';
        if (mat.includes('hardened')) return 'hardened';
        if (mat.includes('cast') && mat.includes('iron')) return 'cast_iron';
        if (mat.includes('brass') || mat.includes('copper')) return 'brass';
        if (mat.includes('plastic')) return 'plastic';
        return 'steel';
    },
    _getMachineRigidity(machineId) {
        if (typeof PRISM_DEEP_MACHINE_INTEGRATION !== 'undefined') {
            const specs = PRISM_DEEP_MACHINE_INTEGRATION.getSpecs();
            return specs.rigidityClass || 'medium';
        }
        if (typeof PRISM_MACHINE_RIGIDITY_SYSTEM !== 'undefined') {
            return PRISM_MACHINE_RIGIDITY_SYSTEM.getClass(machineId);
        }
        return 'medium';
    },
    _rigidityMet(have, need) {
        const haveIdx = this.rigidityOrder.indexOf(have);
        const needIdx = this.rigidityOrder.indexOf(need);
        return haveIdx >= needIdx;
    }
}