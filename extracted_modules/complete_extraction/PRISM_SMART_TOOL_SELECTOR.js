const PRISM_SMART_TOOL_SELECTOR = {
    version: '1.0.0',

    /**
     * Select optimal tool for feature
     */
    selectForFeature(feature, material, options = {}) {
        const featureType = feature.type || 'generic';
        const featureSize = this._getFeatureSize(feature);
        const materialClass = this._getMaterialClass(material);

        let toolType = 'endmill';
        let idealDiameter = 0.5;

        // Determine tool type based on feature
        switch (featureType) {
            case 'hole':
            case 'through_hole':
            case 'blind_hole':
                if (feature.threaded) {
                    toolType = 'tap';
                    idealDiameter = feature.diameter;
                } else if (feature.reamed || feature.tolerance < 0.001) {
                    toolType = 'reamer';
                    idealDiameter = feature.diameter;
                } else {
                    toolType = 'drill';
                    idealDiameter = feature.diameter || 0.25;
                }
                break;

            case 'pocket':
            case 'rectangular_pocket':
            case 'circular_pocket':
                toolType = 'endmill';
                // Tool should be 50-70% of smallest pocket dimension
                const minDim = Math.min(feature.width || Infinity, feature.length || Infinity, feature.diameter || Infinity);
                idealDiameter = Math.min(minDim * 0.6, 1.0);
                break;

            case 'slot':
                toolType = 'endmill';
                idealDiameter = feature.width || 0.25;
                break;

            case 'face':
                if (featureSize > 4) {
                    toolType = 'face_mill';
                    idealDiameter = 2.0;
                } else {
                    toolType = 'endmill';
                    idealDiameter = 0.75;
                }
                break;

            case 'contour':
            case 'profile':
                toolType = 'endmill';
                // Smaller tool for tighter corners
                const minRadius = feature.minRadius || 0.25;
                idealDiameter = Math.min(minRadius * 2 * 0.9, 0.5);
                break;

            case 'chamfer':
                toolType = 'chamfer_mill';
                idealDiameter = 0.5;
                break;
        }
        // Find best tool from database
        return this._findBestToolFromDB(toolType, idealDiameter, materialClass, options);
    },
    /**
     * Find best matching tool from database
     */
    _findBestToolFromDB(toolType, idealDiameter, materialClass, options) {
        // Try to get from PRISM_TOOL_DATABASE_V7
        if (typeof window.PRISM_TOOL_DATABASE_V7 !== 'undefined') {
            const category = this._mapToolTypeToCategory(toolType);
            const tools = PRISM_TOOL_DATABASE_V7[category];

            if (tools) {
                let bestTool = null;
                let bestScore = -Infinity;

                for (const [toolId, tool] of Object.entries(tools)) {
                    const score = this._scoreTool(tool, idealDiameter, materialClass);
                    if (score > bestScore) {
                        bestScore = score;
                        bestTool = { id: toolId, ...tool };
                    }
                }
                if (bestTool) {
                    console.log('[SMART_TOOL_SELECTOR] Selected from database:', bestTool.id);
                    return bestTool;
                }
            }
        }
        // Fallback to generic tool
        return this._createGenericTool(toolType, idealDiameter, materialClass);
    },
    /**
     * Score tool for selection
     */
    _scoreTool(tool, idealDiameter, materialClass) {
        let score = 0;

        // Diameter match (higher score for closer match)
        const diamDiff = Math.abs((tool.diameter || 0.5) - idealDiameter);
        score += (1 - diamDiff) * 50;

        // Material suitability
        if (tool.coating) {
            if (materialClass === 'aluminum' && tool.coating.includes('ZrN')) score += 20;
            if (materialClass === 'steel' && tool.coating.includes('TiAlN')) score += 20;
            if (materialClass === 'stainless' && tool.coating.includes('AlCrN')) score += 20;
        }
        // Carbide preferred for harder materials
        if (tool.material === 'carbide') {
            score += materialClass === 'aluminum' ? 10 : 30;
        }
        // More flutes for finishing, fewer for roughing
        if (tool.flutes === 3 && materialClass === 'aluminum') score += 10;
        if (tool.flutes === 4 && materialClass === 'steel') score += 10;

        return score;
    },
    /**
     * Create generic tool when database lookup fails
     */
    _createGenericTool(toolType, diameter, materialClass) {
        const tool = {
            id: `generic_${toolType}_${diameter}`,
            type: toolType,
            diameter: diameter,
            material: 'carbide',
            coating: materialClass === 'aluminum' ? 'ZrN' : 'TiAlN',
            flutes: materialClass === 'aluminum' ? 3 : 4,
            loc: diameter * 3,
            oal: diameter * 6,
            manufacturer: 'generic',
            isGeneric: true
        };
        console.log('[SMART_TOOL_SELECTOR] Created generic tool:', tool.id);
        return tool;
    },
    _getFeatureSize(feature) {
        if (feature.diameter) return feature.diameter;
        if (feature.width && feature.length) return Math.sqrt(feature.width * feature.length);
        if (feature.width) return feature.width;
        return 1;
    },
    _getMaterialClass(material) {
        const mat = (material || '').toLowerCase();
        if (mat.includes('aluminum') || mat.includes('alum')) return 'aluminum';
        if (mat.includes('stainless') || mat.includes('ss')) return 'stainless';
        if (mat.includes('titanium') || mat.includes('ti6al')) return 'titanium';
        if (mat.includes('inconel') || mat.includes('hastelloy')) return 'superalloy';
        return 'steel';
    },
    _mapToolTypeToCategory(toolType) {
        const map = {
            'endmill': 'endmills',
            'drill': 'drills',
            'tap': 'taps',
            'reamer': 'reamers',
            'face_mill': 'face_mills',
            'chamfer_mill': 'chamfer_mills',
            'ball_mill': 'ball_mills'
        };
        return map[toolType] || 'endmills';
    }
}