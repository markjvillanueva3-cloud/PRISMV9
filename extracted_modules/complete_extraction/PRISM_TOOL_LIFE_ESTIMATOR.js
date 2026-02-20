const PRISM_TOOL_LIFE_ESTIMATOR = {
    version: '1.0.0',

    // Taylor constants by material and tool type (V * T^n = C)
    taylorConstants: {
        'carbide_steel': { n: 0.25, C: 400, maxLife: 60 },
        'carbide_aluminum': { n: 0.40, C: 2000, maxLife: 180 },
        'carbide_stainless': { n: 0.22, C: 280, maxLife: 45 },
        'carbide_titanium': { n: 0.20, C: 150, maxLife: 30 },
        'carbide_inconel': { n: 0.18, C: 80, maxLife: 20 },
        'carbide_cast_iron': { n: 0.28, C: 500, maxLife: 90 },
        'hss_steel': { n: 0.125, C: 70, maxLife: 30 },
        'hss_aluminum': { n: 0.20, C: 300, maxLife: 60 },
        'ceramic_steel': { n: 0.30, C: 800, maxLife: 30 },
        'ceramic_cast_iron': { n: 0.35, C: 1200, maxLife: 45 }
    },
    /**
     * Estimate tool life in minutes
     * @param {number} sfm - Surface feet per minute
     * @param {string} toolMaterial - 'carbide', 'hss', 'ceramic'
     * @param {string} workMaterial - Material being cut
     */
    estimateLife(sfm, toolMaterial = 'carbide', workMaterial = 'steel') {
        const key = `${toolMaterial}_${this._mapMaterial(workMaterial)}`;
        const constants = this.taylorConstants[key] || this.taylorConstants['carbide_steel'];

        // T = (C / V)^(1/n)
        let toolLife = Math.pow(constants.C / sfm, 1 / constants.n);

        // Cap at maximum practical life
        toolLife = Math.min(toolLife, constants.maxLife);

        return {
            minutes: Math.round(toolLife),
            hours: Math.round(toolLife / 60 * 10) / 10,
            constants: constants
        };
    },
    /**
     * Calculate tool cost per part
     */
    toolCostPerPart(params) {
        const {
            sfm,
            toolMaterial = 'carbide',
            workMaterial = 'steel',
            toolCost = 50, // Tool cost in dollars
            cuttingTimePerPart = 5, // Minutes of actual cutting per part
            regrindable = false,
            regrinds = 0,
            regrindCost = 15
        } = params;

        const life = this.estimateLife(sfm, toolMaterial, workMaterial);
        const partsPerTool = Math.floor(life.minutes / cuttingTimePerPart);

        // Account for regrinds
        let effectiveToolCost = toolCost;
        if (regrindable && regrinds > 0) {
            const totalLife = partsPerTool * (1 + regrinds);
            const totalCost = toolCost + (regrindCost * regrinds);
            return {
                costPerPart: Math.round((totalCost / totalLife) * 100) / 100,
                partsPerTool: totalLife,
                toolLife: life.minutes,
                includesRegrinds: true,
                regrinds
            };
        }
        return {
            costPerPart: Math.round((effectiveToolCost / partsPerTool) * 100) / 100,
            partsPerTool,
            toolLife: life.minutes,
            toolCost: effectiveToolCost
        };
    },
    /**
     * Calculate total tooling cost for job
     */
    jobToolingCost(operations, quantity) {
        let totalToolCost = 0;
        const toolDetails = [];

        for (const op of operations) {
            const sfm = op.sfm || op.params?.sfm || 400;
            const toolCost = op.tool?.cost || op.toolCost || 50;
            const cutTime = op.cuttingTime || op.cycleTime || 5;
            const toolMat = op.tool?.material || 'carbide';
            const workMat = op.material || 'steel';

            const result = this.toolCostPerPart({
                sfm,
                toolMaterial: toolMat,
                workMaterial: workMat,
                toolCost,
                cuttingTimePerPart: cutTime
            });

            const opToolCost = result.costPerPart * quantity;
            totalToolCost += opToolCost;

            toolDetails.push({
                operation: op.name || op.type || 'Operation',
                costPerPart: result.costPerPart,
                totalCost: Math.round(opToolCost * 100) / 100,
                partsPerTool: result.partsPerTool,
                toolsNeeded: Math.ceil(quantity / result.partsPerTool)
            });
        }
        return {
            total: Math.round(totalToolCost * 100) / 100,
            perPart: Math.round((totalToolCost / quantity) * 100) / 100,
            details: toolDetails
        };
    },
    _mapMaterial(material) {
        const mat = (material || 'steel').toLowerCase();
        if (mat.includes('aluminum')) return 'aluminum';
        if (mat.includes('stainless')) return 'stainless';
        if (mat.includes('titanium')) return 'titanium';
        if (mat.includes('inconel') || mat.includes('hastelloy')) return 'inconel';
        if (mat.includes('cast') && mat.includes('iron')) return 'cast_iron';
        return 'steel';
    }
}