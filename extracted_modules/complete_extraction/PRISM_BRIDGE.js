const PRISM_BRIDGE = {

    // Get material properties by name or grade
    getMaterialProperties: function(materialInput) {
        const normalized = materialInput.toLowerCase().replace(/[- ]/g, '_');

        // Search ferrous
        for (const [key, mat] of Object.entries(PRISM_KNOWLEDGE_BASE.materials.ferrous)) {
            if (key.includes(normalized) || mat.names.some(n => n.toLowerCase().includes(normalized))) {
                return { ...mat, id: key, category: 'ferrous' };
            }
        }
        // Search non-ferrous
        for (const [key, mat] of Object.entries(PRISM_KNOWLEDGE_BASE.materials.nonFerrous)) {
            if (key.includes(normalized) || mat.names.some(n => n.toLowerCase().includes(normalized))) {
                return { ...mat, id: key, category: 'nonFerrous' };
            }
        }
        return null;
    },
    // Calculate optimal cutting speed
    calculateCuttingSpeed: function(material, toolMaterial, coating, operation = 'roughing') {
        const matData = this.getMaterialProperties(material);
        if (!matData) return null;

        let baseSpeed = matData.machining.recommendedSpeed[toolMaterial] || 100;

        // Apply coating factor
        const coatingFactors = {
            TiN: 1.15, TiCN: 1.20, TiAlN: 1.30, AlTiN: 1.40, AlCrN: 1.35, DLC: 1.25, diamond: 1.50
        };
        const coatingFactor = coatingFactors[coating] || 1.0;

        // Apply operation factor
        const operationFactors = { roughing: 0.85, semifinishing: 1.0, finishing: 1.15 };
        const opFactor = operationFactors[operation] || 1.0;

        return Math.round(baseSpeed * coatingFactor * opFactor);
    },
    // Calculate feed per tooth
    calculateFeedPerTooth: function(material, operation = 'roughing', toolDiameter) {
        const matData = this.getMaterialProperties(material);
        if (!matData) return 0.05; // Default

        // Get base material category
        const category = matData.category.includes('aluminum') ? 'aluminum' :
                        matData.category.includes('stainless') ? 'stainless' :
                        matData.category.includes('titanium') ? 'titanium' :
                        matData.category.includes('inconel') || matData.category.includes('nickel') ? 'inconel' :
                        matData.category.includes('cast_iron') ? 'cast_iron' : 'mild_steel';

        const feedTable = PRISM_KNOWLEDGE_BASE.parameters.milling.feedPerTooth[category];
        let baseFeed = feedTable ? feedTable[operation] : 0.05;

        // Adjust for tool diameter (larger tools can take more)
        if (toolDiameter > 20) baseFeed *= 1.1;
        else if (toolDiameter < 6) baseFeed *= 0.8;

        return Math.round(baseFeed * 1000) / 1000;
    },
    // Calculate specific cutting force (Kc)
    calculateKc: function(material, chipThickness = 0.1) {
        const matData = this.getMaterialProperties(material);
        if (!matData) return 2000; // Default

        const Kc11 = typeof matData.machining.Kc11 === 'object' ?
                     matData.machining.Kc11.annealed : matData.machining.Kc11;
        const mc = matData.machining.mc || 0.25;

        return PRISM_KNOWLEDGE_BASE.physics.specificCuttingForce.calculate(Kc11, chipThickness, mc);
    },
    // Calculate cutting forces
    calculateCuttingForces: function(material, ap, ae, fz, z) {
        const Kc = this.calculateKc(material, fz);
        const chipArea = ap * fz; // Simplified for milling
        const Fc = Kc * chipArea * z * (ae / (ap > 0 ? ap : 1)) * 0.7; // Empirical adjustment

        return {
            tangentialForce: Math.round(Fc),
            radialForce: Math.round(Fc * 0.3),
            axialForce: Math.round(Fc * 0.2),
            resultantForce: Math.round(Fc * 1.1)
        };
    },
    // Calculate power required
    calculatePower: function(mrr, material) {
        const Kc = this.calculateKc(material);
        const power = PRISM_KNOWLEDGE_BASE.physics.power.fromMRR(mrr, Kc);
        const spindlePower = PRISM_KNOWLEDGE_BASE.physics.power.spindlePower(power);

        return {
            cuttingPower: Math.round(power * 100) / 100,
            spindlePowerRequired: Math.round(spindlePower * 100) / 100
        };
    },
    // Calculate tool life (Taylor model)
    calculateToolLife: function(cuttingSpeed, toolMaterial = 'carbide_coated', targetLife = 15) {
        const params = PRISM_KNOWLEDGE_BASE.toolScience.taylorToolLife.constants[toolMaterial];
        if (!params) return null;

        const toolLife = PRISM_KNOWLEDGE_BASE.toolScience.taylorToolLife.calculate(
            cuttingSpeed, params.n, params.typical_C
        );

        return {
            predictedLife: Math.round(toolLife),
            n: params.n,
            C: params.typical_C,
            atTargetLife: Math.round(params.typical_C / Math.pow(targetLife, params.n))
        };
    },
    // Calculate theoretical surface finish (turning)
    calculateSurfaceFinish: function(feed, noseRadius, material = 'steel') {
        const theoretical = PRISM_KNOWLEDGE_BASE.parameters.turning.surfaceFinish.theoretical(feed, noseRadius);
        const factors = PRISM_KNOWLEDGE_BASE.parameters.turning.surfaceFinish.factors;
        const matFactor = factors.materialFactor[material] || 1.0;

        return {
            theoretical: Math.round(theoretical * 100) / 100,
            predicted: Math.round(theoretical * matFactor * 100) / 100
        };
    },
    // Get chip thinning adjusted feed
    getChipThinningFeed: function(baseFeed, toolDiameter, radialDoc) {
        return PRISM_KNOWLEDGE_BASE.parameters.milling.chipThinning.calculate(
            baseFeed, toolDiameter, radialDoc
        );
    },
    // Calculate tool deflection
    calculateDeflection: function(force, stickout, toolDiameter, material = 'carbide') {
        const E = material === 'carbide' ? 620000 : 210000; // N/mm²
        const I = PRISM_KNOWLEDGE_BASE.dynamics.deflection.momentOfInertia(toolDiameter);
        const deflection = PRISM_KNOWLEDGE_BASE.dynamics.deflection.cantilever(force, stickout, E, I);

        const ldRatio = stickout / toolDiameter;
        let guidance;
        if (ldRatio < 3) guidance = PRISM_KNOWLEDGE_BASE.dynamics.deflection.ldRatioGuidance['< 3'];
        else if (ldRatio <= 5) guidance = PRISM_KNOWLEDGE_BASE.dynamics.deflection.ldRatioGuidance['3-5'];
        else if (ldRatio <= 7) guidance = PRISM_KNOWLEDGE_BASE.dynamics.deflection.ldRatioGuidance['5-7'];
        else guidance = PRISM_KNOWLEDGE_BASE.dynamics.deflection.ldRatioGuidance['> 7'];

        return {
            deflection: Math.round(deflection * 1000) / 1000,
            ldRatio: Math.round(ldRatio * 10) / 10,
            status: guidance.status,
            feedFactor: guidance.feedFactor
        };
    },
    // Get coating recommendation
    getCoatingRecommendation: function(material, operation, coolantType) {
        const matData = this.getMaterialProperties(material);
        if (!matData) return 'TiAlN'; // Default

        const category = matData.category;

        // Decision tree for coating
        if (category.includes('aluminum')) {
            return coolantType === 'dry' || coolantType === 'mql' ? 'DLC' : 'uncoated';
        }
        if (category.includes('stainless') || category.includes('titanium')) {
            return 'AlCrN';
        }
        if (category.includes('inconel') || category.includes('nickel')) {
            return 'AlTiN';
        }
        if (category.includes('cast_iron')) {
            return 'TiCN';
        }
        if (category.includes('hardened') || (matData.mechanical.hardness?.value > 45 && matData.mechanical.hardness?.scale === 'HRC')) {
            return 'AlTiN';
        }
        // Default for steel
        return coolantType === 'dry' ? 'TiAlN' : 'TiCN';
    },
    // Get coolant recommendation
    getCoolantRecommendation: function(material, operation) {
        const matData = this.getMaterialProperties(material);
        if (!matData) return PRISM_KNOWLEDGE_BASE.coolant.materialRecommendations.steel;

        const category = matData.category.includes('aluminum') ? 'aluminum' :
                        matData.category.includes('stainless') ? 'stainless' :
                        matData.category.includes('titanium') ? 'titanium' :
                        matData.category.includes('inconel') || matData.category.includes('nickel') ? 'inconel' :
                        matData.category.includes('cast_iron') ? 'cast_iron' : 'steel';

        return PRISM_KNOWLEDGE_BASE.coolant.materialRecommendations[category];
    },
    // Generate operation sequence for geometry type
    generateOperationSequence: function(geometryType, machineType = 'milling') {
        const sequences = PRISM_KNOWLEDGE_BASE.geometryStrategies.orderOfOperations;
        return sequences[machineType] || sequences.milling;
    },
    // Get geometry-specific strategy
    getGeometryStrategy: function(geometryType, subType) {
        const strategies = PRISM_KNOWLEDGE_BASE.geometryStrategies.millingGeometry;
        if (strategies[geometryType]) {
            return strategies[geometryType][subType] || strategies[geometryType];
        }
        return null;
    },
    // Comprehensive parameter optimization
    optimizeParameters: function(input) {
        const {
            material, toolDiameter, fluteCount, toolMaterial = 'carbide',
            coating = 'TiAlN', operation = 'roughing', radialDoc, axialDoc,
            machineMaxRPM, machineMaxPower
        } = input;

        // Get base parameters
        const Vc = this.calculateCuttingSpeed(material, toolMaterial, coating, operation);
        const fz = this.calculateFeedPerTooth(material, operation, toolDiameter);

        // Calculate RPM
        let rpm = Math.round((Vc * 1000) / (Math.PI * toolDiameter));
        if (machineMaxRPM && rpm > machineMaxRPM) {
            rpm = machineMaxRPM;
        }
        // Actual cutting speed
        const actualVc = (Math.PI * toolDiameter * rpm) / 1000;

        // Feed rate
        const feedRate = rpm * fz * fluteCount;

        // MRR
        const ae = radialDoc || toolDiameter * 0.65;
        const ap = axialDoc || toolDiameter * 1.0;
        const mrr = (ae * ap * feedRate) / 1000;

        // Power check
        const powerCalc = this.calculatePower(mrr * 1000, material);

        // Deflection check
        const forces = this.calculateCuttingForces(material, ap, ae, fz, fluteCount);
        const stickout = toolDiameter * 3; // Assumed
        const deflection = this.calculateDeflection(forces.tangentialForce, stickout, toolDiameter);

        // Tool life prediction
        const toolLife = this.calculateToolLife(actualVc, toolMaterial + '_coated');

        return {
            cuttingSpeed: Math.round(actualVc),
            rpm: rpm,
            feedPerTooth: fz,
            feedRate: Math.round(feedRate),
            radialDoc: Math.round(ae * 100) / 100,
            axialDoc: Math.round(ap * 100) / 100,
            mrr: Math.round(mrr * 100) / 100,
            power: powerCalc,
            deflection: deflection,
            toolLife: toolLife,
            forces: forces,
            recommendations: this.generateRecommendations(powerCalc, deflection, machineMaxPower)
        };
    },
    // Generate recommendations based on calculations
    generateRecommendations: function(power, deflection, machineMaxPower) {
        const recommendations = [];

        if (machineMaxPower && power.spindlePowerRequired > machineMaxPower * 0.9) {
            recommendations.push({
                type: 'warning',
                message: 'Power requirement approaching machine limit. Consider reducing DOC or feed.'
            });
        }
        if (deflection.status === 'caution' || deflection.status === 'problematic') {
            recommendations.push({
                type: 'warning',
                message: `High L/D ratio (${deflection.ldRatio}). Reduce feed by ${Math.round((1 - deflection.feedFactor) * 100)}% or use shorter tool.`
            });
        }
        if (deflection.deflection > 0.025) {
            recommendations.push({
                type: 'critical',
                message: `Tool deflection (${deflection.deflection}mm) may affect tolerance. Use larger tool or reduce engagement.`
            });
        }
        return recommendations;
    }
}