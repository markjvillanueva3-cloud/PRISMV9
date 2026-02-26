/**
 * PRISM_LATHE_PARAM_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 643
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_LATHE_PARAM_ENGINE = {

        // Store last calculated recommendations
        lastRecommendations: null,
        autoAdjustEnabled: true,

        // Get comprehensive lathe setup analysis
        analyzeSetup: function() {
            const setup = {
                machine: this.getMachineFactors(),
                spindle: this.getSpindleFactors(),
                turret: this.getTurretFactors(),
                tooling: this.getToolingFactors(),
                material: this.getMaterialFactors(),
                workholding: this.getWorkholdingFactors(),
                workpiece: this.getWorkpieceFactors(),
                operation: this.getOperationFactors()
            };
            // Calculate composite rigidity score (0-100)
            setup.rigidityScore = this.calculateRigidityScore(setup);

            // Calculate centrifugal G-force on chuck/workpiece
            setup.centrifugalGForce = this.calculateCentrifugalGForce(setup);

            // Calculate axis motion G-forces (X/Z turret movement)
            setup.axisGForces = this.calculateAxisGForces(setup);

            return setup;
        },
        // Machine factors
        getMachineFactors: function() {
            const machineId = document.getElementById('machineSelect')?.value;
            const machine = LATHE_MACHINE_DATABASE?.machines?.[machineId] || currentLathe;

            if (!machine) return {
                rigidityClass: 'medium',
                factor: 1.0,
                maxRpm: 4000,
                maxFeed: 500,
                peakHp: 20,
                bedType: 'slant',
                axisConfig: this.getDefaultAxisConfig('slant_bed')
            };
            const rigidityFactors = {
                'light': { factor: 0.75, feedMult: 0.85, docMult: 0.8 },
                'medium': { factor: 1.0, feedMult: 1.0, docMult: 1.0 },
                'heavy': { factor: 1.2, feedMult: 1.15, docMult: 1.15 },
                'ultra-rigid': { factor: 1.35, feedMult: 1.25, docMult: 1.3 }
            };
            const rigidity = rigidityFactors[machine.rigidityClass] || rigidityFactors['medium'];
            const bedType = machine.bedType || 'slant';

            // Get rapids for each axis
            const rapids = {
                x: machine.rapidX || machine.rapids?.x || 800,
                z: machine.rapidZ || machine.rapids?.z || 1000
            };
            // Estimate acceleration
            const accel = {
                x: this.estimateAcceleration(rapids.x, 'Lathe'),
                z: this.estimateAcceleration(rapids.z, 'Lathe')
            };
            return {
                id: machineId,
                name: machine.name || 'Unknown Lathe',
                rigidityClass: machine.rigidityClass || 'medium',
                bedType: bedType,
                ...rigidity,
                maxRpm: machine.mainSpindle?.maxRpm || 4000,
                maxFeed: rapids.x,
                peakHp: machine.mainSpindle?.peakHp || 20,
                torque: machine.mainSpindle?.torque || 150,
                chuckSize: machine.mainSpindle?.chuckSize || 8,
                barCapacity: machine.mainSpindle?.barCapacity || 2.0,
                rapids: rapids,
                acceleration: accel,
                axisConfig: this.getDefaultAxisConfig(bedType)
            };
        },
        // Spindle factors
        getSpindleFactors: function() {
            const machineId = document.getElementById('machineSelect')?.value;
            const machine = LATHE_MACHINE_DATABASE?.machines?.[machineId] || currentLathe;
            const mainSpindle = machine?.mainSpindle || {};

            return {
                maxRpm: mainSpindle.maxRpm || 4000,
                peakHp: mainSpindle.peakHp || 20,
                torque: mainSpindle.torque || 150, // ft-lb
                chuckSize: mainSpindle.chuckSize || 8,
                barCapacity: mainSpindle.barCapacity || 2.0,
                bearing: mainSpindle.bearing || 'roller',
                driveType: mainSpindle.driveType || 'gear',
                hasCAxis: mainSpindle.cAxis || false
            };
        },
        // Turret factors
        getTurretFactors: function() {
            const machineId = document.getElementById('machineSelect')?.value;
            const machine = LATHE_MACHINE_DATABASE?.machines?.[machineId] || currentLathe;
            const turret = machine?.turret || {};

            const turretRigidity = {
                'vdi30': { rigidity: 0.9, maxRpm: 6000 },
                'vdi40': { rigidity: 1.0, maxRpm: 5000 },
                'vdi50': { rigidity: 1.1, maxRpm: 4000 },
                'bmt45': { rigidity: 1.15, maxRpm: 6000 },
                'bmt55': { rigidity: 1.2, maxRpm: 5000 },
                'bmt65': { rigidity: 1.25, maxRpm: 4500 },
                'bolt_on': { rigidity: 0.85, maxRpm: 4000 }
            };
            const turretType = turret.type || 'vdi40';
            const typeFactors = turretRigidity[turretType] || turretRigidity['vdi40'];

            return {
                type: turretType,
                capacity: turret.capacity || 12,
                ...typeFactors,
                liveTools: turret.liveTools || false,
                liveRpm: turret.liveRpm || 0,
                liveHp: turret.liveHp || 0
            };
        },
        // Tooling factors
        getToolingFactors: function() {
            const opType = document.getElementById('latheOpType')?.value || 'od_roughing';
            const noseRadius = parseFloat(document.getElementById('latheNoseRadius')?.value) || 0.031;
            const barDia = parseFloat(document.getElementById('boringBarDia')?.value) || 0.75;
            const barMaterial = document.getElementById('boringBarMaterial')?.value || 'carbide';
            const barStickout = parseFloat(document.getElementById('boringBarStickout')?.value) || 3.0;

            const inMetric = typeof PRISM_UNIT_SYSTEM !== 'undefined' && PRISM_UNIT_SYSTEM === 'metric';
            const barDiaIn = inMetric ? barDia / 25.4 : barDia;
            const barStickoutIn = inMetric ? barStickout / 25.4 : barStickout;

            // Bar material properties
            const barProps = {
                'steel': { E: 30e6, rigidity: 0.7, maxLd: 4 },
                'carbide': { E: 65e6, rigidity: 1.0, maxLd: 6 },
                'heavy_metal': { E: 50e6, rigidity: 1.15, maxLd: 8 },
                'dampened': { E: 45e6, rigidity: 1.3, maxLd: 10 }
            };
            const barProp = barProps[barMaterial] || barProps['carbide'];
            const barLdRatio = barStickoutIn / barDiaIn;

            // Insert coating factors
            const coatingFactors = {
                'CVD': { speedMult: 1.0, lifeMult: 1.0 },
                'PVD': { speedMult: 1.1, lifeMult: 1.15 },
                'CVD+Al2O3': { speedMult: 1.15, lifeMult: 1.25 },
                'TiAlN': { speedMult: 1.2, lifeMult: 1.2 },
                'uncoated': { speedMult: 0.7, lifeMult: 0.6 }
            };
            return {
                opType: opType,
                noseRadius: noseRadius,
                barDiameter: barDiaIn,
                barStickout: barStickoutIn,
                barLdRatio: barLdRatio,
                barMaterial: barMaterial,
                barProperties: barProp,
                coating: 'CVD', // Default
                coatingFactor: coatingFactors['CVD']
            };
        },
        // Material factors using Knowledge Base
        getMaterialFactors: function() {
            const materialGroup = document.getElementById('materialGroup')?.value || '';
            const specificMaterial = document.getElementById('specificMaterial')?.value || '';

            // Try to get from Knowledge Base first
            if (typeof PRISM_BRIDGE !== 'undefined') {
                const matProps = PRISM_BRIDGE.getMaterialProperties(specificMaterial || materialGroup);
                if (matProps) {
                    return {
                        id: specificMaterial || materialGroup,
                        name: matProps.names?.[0] || specificMaterial,
                        category: matProps.category,
                        Kc11: typeof matProps.machining.Kc11 === 'object' ?
                              matProps.machining.Kc11.annealed : matProps.machining.Kc11,
                        mc: matProps.machining.mc || 0.25,
                        machinability: matProps.machining.machinabilityRating || 50,
                        thermalConductivity: matProps.physical.thermalConductivity || 40,
                        hardness: matProps.mechanical.hardness?.value || 200,
                        workHardening: matProps.category?.includes('stainless') ||
                                       matProps.category?.includes('titanium') ||
                                       matProps.category?.includes('inconel'),
                        recommendedSpeed: matProps.machining.recommendedSpeed || { carbide: 200 },
                        notes: matProps.machining.notes || []
                    };
                }
            }
            // Fallback to lathe cutting constants
            const kcMap = {
                'P_low_carbon': { Kc11: 1700, mc: 0.25, name: 'Low Carbon Steel' },
                'P_medium_carbon': { Kc11: 1900, mc: 0.25, name: 'Medium Carbon Steel' },
                'P_alloy_annealed': { Kc11: 2000, mc: 0.25, name: 'Alloy Steel' },
                'M_austenitic': { Kc11: 2200, mc: 0.22, name: 'Stainless Steel' },
                'K_gray': { Kc11: 1000, mc: 0.28, name: 'Gray Cast Iron' },
                'N_aluminum_wrought': { Kc11: 700, mc: 0.20, name: 'Aluminum' },
                'S_titanium': { Kc11: 1800, mc: 0.22, name: 'Titanium' }
            };
            const matData = kcMap[materialGroup] || kcMap['P_medium_carbon'];

            return {
                id: materialGroup,
                name: matData.name,
                category: materialGroup,
                Kc11: matData.Kc11,
                mc: matData.mc,
                machinability: 50,
                thermalConductivity: 40,
                workHardening: materialGroup.includes('M_') || materialGroup.includes('S_'),
                recommendedSpeed: { carbide: 200 },
                notes: []
            };
        },
        // Workholding factors
        getWorkholdingFactors: function() {
            const chuckType = 'power_3jaw'; // Could be from UI
            const chuckPsi = 250; // Default

            const chuckRigidity = {
                'power_3jaw': { rigidity: 1.0, grippingForce: 1.0, centrifugalFactor: 0.15 },
                'power_6jaw': { rigidity: 1.1, grippingForce: 1.15, centrifugalFactor: 0.12 },
                'manual_3jaw': { rigidity: 0.85, grippingForce: 0.7, centrifugalFactor: 0.20 },
                'manual_4jaw': { rigidity: 0.95, grippingForce: 0.8, centrifugalFactor: 0.18 },
                'collet': { rigidity: 1.15, grippingForce: 0.9, centrifugalFactor: 0.08 },
                'face_driver': { rigidity: 0.8, grippingForce: 0.6, centrifugalFactor: 0.25 },
                'mandrel': { rigidity: 1.1, grippingForce: 1.0, centrifugalFactor: 0.05 },
                'between_centers': { rigidity: 1.2, grippingForce: 1.0, centrifugalFactor: 0.02 }
            };
            const chuckFactors = chuckRigidity[chuckType] || chuckRigidity['power_3jaw'];

            // Check for tailstock support
            const hasTailstock = document.getElementById('tailstockSupport')?.checked || false;
            const tailstockBonus = hasTailstock ? 1.4 : 1.0;

            return {
                type: chuckType,
                ...chuckFactors,
                psi: chuckPsi,
                hasTailstock: hasTailstock,
                tailstockBonus: tailstockBonus
            };
        },
        // Workpiece factors
        getWorkpieceFactors: function() {
            const inMetric = typeof PRISM_UNIT_SYSTEM !== 'undefined' && PRISM_UNIT_SYSTEM === 'metric';

            let stockDia = parseFloat(document.getElementById('latheStockDia')?.value) || 2.0;
            let finishDia = parseFloat(document.getElementById('latheFinishDia')?.value) || 1.5;
            let stickout = parseFloat(document.getElementById('latheStickout')?.value) || 3.0;
            let cutLength = parseFloat(document.getElementById('latheCutLength')?.value) || 2.5;

            if (inMetric) {
                stockDia /= 25.4;
                finishDia /= 25.4;
                stickout /= 25.4;
                cutLength /= 25.4;
            }
            const ldRatio = stickout / stockDia;

            // Estimate workpiece mass (assuming steel)
            const volume = Math.PI * Math.pow(stockDia / 2, 2) * stickout; // in³
            const density = 0.283; // lb/in³ for steel
            const mass = volume * density;

            return {
                stockDia: stockDia,
                finishDia: finishDia,
                stickout: stickout,
                cutLength: cutLength,
                ldRatio: ldRatio,
                mass: mass,
                totalStock: (stockDia - finishDia) / 2
            };
        },
        // Operation factors
        getOperationFactors: function() {
            const opType = document.getElementById('latheOpType')?.value || 'od_roughing';
            const speedAdj = parseFloat(document.getElementById('latheSpeedAdj')?.value) / 100 || 1.0;
            const feedAdj = parseFloat(document.getElementById('latheFeedAdj')?.value) / 100 || 1.0;

            const operationMods = {
                'od_roughing': { speedMult: 1.0, feedMult: 1.0, docMult: 1.0, iprBase: 0.012 },
                'od_finishing': { speedMult: 1.15, feedMult: 0.4, docMult: 0.15, iprBase: 0.004 },
                'facing': { speedMult: 1.0, feedMult: 0.9, docMult: 0.8, iprBase: 0.010 },
                'id_roughing': { speedMult: 0.85, feedMult: 0.8, docMult: 0.7, iprBase: 0.008 },
                'id_finishing': { speedMult: 0.9, feedMult: 0.35, docMult: 0.1, iprBase: 0.003 },
                'grooving': { speedMult: 0.8, feedMult: 0.5, docMult: 0.5, iprBase: 0.004 },
                'parting': { speedMult: 0.7, feedMult: 0.4, docMult: 1.0, iprBase: 0.003 },
                'threading': { speedMult: 0.5, feedMult: 1.0, docMult: 0.5, iprBase: 0 }
            };
            const mods = operationMods[opType] || operationMods['od_roughing'];

            return {
                type: opType,
                isRoughing: opType.includes('roughing'),
                isFinishing: opType.includes('finishing'),
                isBoring: opType.includes('id_'),
                isFacing: opType.includes('facing'),
                isParting: opType.includes('parting'),
                isGrooving: opType.includes('grooving'),
                isThreading: opType.includes('threading'),
                speedAdj: speedAdj,
                feedAdj: feedAdj,
                ...mods
            };
        },
        // Estimate acceleration for lathe axes
        estimateAcceleration: function(rapidRate, machineType) {
            const accelTime = 0.15; // Lathe typically faster acceleration
            const rapidIPS = rapidRate / 60;
            return rapidIPS / accelTime;
        },
        // Get default axis configuration for lathe
        getDefaultAxisConfig: function(bedType) {
            const configs = {
                'slant_bed': {
                    x: { moves: 'turret', direction: 'horizontal', load: 'tool' },
                    z: { moves: 'turret', direction: 'horizontal', load: 'tool' },
                    c: { moves: 'spindle', direction: 'rotary', load: 'workpiece' },
                    description: 'Turret moves X/Z, Spindle rotates workpiece'
                },
                'flat_bed': {
                    x: { moves: 'cross_slide', direction: 'horizontal', load: 'tool' },
                    z: { moves: 'carriage', direction: 'horizontal', load: 'tool' },
                    c: { moves: 'spindle', direction: 'rotary', load: 'workpiece' },
                    description: 'Cross-slide moves X, Carriage moves Z'
                },
                'swiss': {
                    x: { moves: 'tool', direction: 'horizontal', load: 'tool' },
                    z: { moves: 'headstock', direction: 'horizontal', load: 'workpiece' },
                    c: { moves: 'spindle', direction: 'rotary', load: 'workpiece' },
                    description: 'Headstock moves Z, Tool moves X (Swiss-type)'
                },
                'vtl': {
                    x: { moves: 'ram', direction: 'horizontal', load: 'tool' },
                    z: { moves: 'ram', direction: 'vertical', load: 'tool' },
                    c: { moves: 'table', direction: 'rotary', load: 'workpiece' },
                    description: 'Ram moves X/Z, Table rotates workpiece'
                }
            };
            return configs[bedType] || configs['slant_bed'];
        },
        // Calculate composite rigidity score
        calculateRigidityScore: function(setup) {
            const weights = {
                machine: 0.25,
                turret: 0.15,
                tooling: 0.20,
                workholding: 0.20,
                workpiece: 0.20
            };
            // Workpiece L/D penalty
            const wpLdPenalty = Math.max(0.3, 1 - (setup.workpiece.ldRatio - 2) * 0.15);

            // Tool L/D penalty (for boring)
            const toolLdPenalty = setup.operation.isBoring ?
                Math.max(0.3, 1 - (setup.tooling.barLdRatio - 3) * 0.1) : 1.0;

            const scores = {
                machine: Math.min(100, setup.machine.factor * 75),
                turret: Math.min(100, setup.turret.rigidity * 80),
                tooling: Math.min(100, setup.tooling.barProperties.rigidity * toolLdPenalty * 80),
                workholding: Math.min(100, setup.workholding.rigidity * setup.workholding.tailstockBonus * 60),
                workpiece: Math.min(100, wpLdPenalty * 100)
            };
            let totalScore = 0;
            for (const [key, weight] of Object.entries(weights)) {
                totalScore += scores[key] * weight;
            }
            return Math.round(totalScore);
        },
        // Calculate centrifugal G-force on workpiece at chuck
        calculateCentrifugalGForce: function(setup) {
            const rpm = parseFloat(document.getElementById('resultRpm')?.textContent?.replace(',', '')) ||
                       setup.machine.maxRpm / 2;
            const workDia = setup.workpiece.stockDia;
            const workMass = setup.workpiece.mass;

            // G = (4π² × n² × r) / g
            const revPerSec = rpm / 60;
            const radiusM = (workDia / 2) * 0.0254;
            const gForce = (4 * Math.PI * Math.PI * revPerSec * revPerSec * radiusM) / 9.81;

            // Centrifugal force on chuck jaws
            const centrifugalFactor = setup.workholding.centrifugalFactor;
            const gripLoss = (rpm / setup.machine.maxRpm) * (rpm / setup.machine.maxRpm) * centrifugalFactor;
            const effectiveGrip = 1 - gripLoss;

            return {
                gForce: Math.round(gForce * 100) / 100,
                rpm: rpm,
                gripLoss: Math.round(gripLoss * 100),
                effectiveGrip: Math.round(effectiveGrip * 100),
                isSafe: effectiveGrip > 0.6,
                maxSafeRpm: Math.round(Math.sqrt(0.4 / centrifugalFactor) * setup.machine.maxRpm)
            };
        },
        // Calculate axis motion G-forces (X/Z turret movement)
        calculateAxisGForces: function(setup) {
            const machine = setup.machine;
            const workholding = setup.workholding;
            const workpiece = setup.workpiece;

            const axisConfig = machine.axisConfig;
            const accel = machine.acceleration;
            const rapids = machine.rapids;

            const gForces = {};
            const g = 386.4; // in/s²

            // Estimate turret/tool mass
            const turretMass = 50; // lbs estimate

            ['x', 'z'].forEach(axis => {
                if (!axisConfig[axis]) return;

                const config = axisConfig[axis];
                const axisAccel = accel[axis] || 100;

                const rapidGForce = axisAccel / g;

                let affectedComponent = config.moves;
                let componentMass = turretMass;

                // For Swiss-type, Z moves the headstock (workpiece)
                if (config.load === 'workpiece') {
                    componentMass = workpiece.mass + 20; // Add chuck jaw mass
                    affectedComponent = 'workpiece';
                }
                gForces[axis] = {
                    rapid: {
                        gForce: Math.round(rapidGForce * 1000) / 1000,
                        acceleration: Math.round(axisAccel),
                        affectedComponent: affectedComponent
                    },
                    direction: config.direction,
                    moves: config.moves
                };
            });

            // Resultant G-force
            const xG = gForces.x?.rapid.gForce || 0;
            const zG = gForces.z?.rapid.gForce || 0;
            const xzResultant = Math.sqrt(xG * xG + zG * zG);

            return {
                axes: gForces,
                resultant: {
                    xz: Math.round(xzResultant * 1000) / 1000
                },
                turretMaxG: Math.max(xG, zG),
                machineType: 'Lathe',
                axisDescription: axisConfig.description,
                warnings: this.generateAxisGForceWarnings(gForces, setup)
            };
        },
        // Generate warnings for lathe axis G-forces
        generateAxisGForceWarnings: function(gForces, setup) {
            const warnings = [];

            // High turret acceleration
            Object.entries(gForces).forEach(([axis, data]) => {
                if (data.rapid.gForce > 0.6) {
                    warnings.push({
                        type: 'info',
                        text: `📊 ${axis.toUpperCase()}-axis: ${data.rapid.gForce}G (${data.moves})`
                    });
                }
            });

            // Centrifugal grip loss
            const centGF = setup.centrifugalGForce;
            if (centGF && !centGF.isSafe) {
                warnings.push({
                    type: 'critical',
                    text: `⛔ Chuck grip reduced to ${centGF.effectiveGrip}% at ${centGF.rpm} RPM. Max safe: ${centGF.maxSafeRpm} RPM`
                });
            } else if (centGF && centGF.effectiveGrip < 80) {
                warnings.push({
                    type: 'warning',
                    text: `⚠️ Chuck grip at ${centGF.effectiveGrip}% - consider reducing RPM or increasing chuck pressure`
                });
            }
            return warnings;
        },
        // Generate optimized lathe parameters
        generateOptimizedParams: function() {
            const setup = this.analyzeSetup();
            const inMetric = typeof PRISM_UNIT_SYSTEM !== 'undefined' && PRISM_UNIT_SYSTEM === 'metric';

            // Get base cutting speed from material
            let baseVc = setup.material.recommendedSpeed?.carbide || 200; // m/min

            // Apply coating factor
            baseVc *= setup.tooling.coatingFactor.speedMult;

            // Apply rigidity factor
            const rigidityMult = 0.7 + (setup.rigidityScore / 100) * 0.6;
            baseVc *= rigidityMult;

            // Apply operation factor
            baseVc *= setup.operation.speedMult;

            // Calculate RPM
            const sfm = baseVc * 3.28084;
            const currentDia = setup.operation.isBoring ? setup.workpiece.finishDia : setup.workpiece.stockDia;
            let rpm = (sfm * 12) / (Math.PI * currentDia);

            // Apply limits
            const maxRpm = Math.min(
                setup.machine.maxRpm,
                setup.centrifugalGForce.maxSafeRpm
            );
            rpm = Math.min(rpm, maxRpm);

            const actualSfm = (rpm * Math.PI * currentDia) / 12;

            // Calculate IPR
            let baseIpr = setup.operation.iprBase;
            baseIpr *= Math.pow(rigidityMult, 0.5);
            baseIpr *= setup.operation.feedAdj;

            // Calculate IPM
            const ipm = baseIpr * rpm;

            // Recommended DOC
            const maxDoc = setup.operation.isRoughing ? 0.150 : 0.030;
            const recommendedDoc = maxDoc * setup.operation.docMult * rigidityMult;

            // Recommended stickout
            let recommendedStickout;
            if (setup.operation.isBoring) {
                const maxLd = setup.tooling.barProperties.maxLd;
                recommendedStickout = setup.tooling.barDiameter * (maxLd * 0.7);
            } else {
                recommendedStickout = setup.workpiece.stockDia * 2; // 2:1 L/D optimal for workpiece
            }
            // MRR and Power
            const mrr = 12 * (actualSfm / 12) * recommendedDoc * baseIpr; // in³/min
            const unitPower = 1.0; // HP per in³/min
            const power = mrr * unitPower;

            // Surface finish (theoretical Ra)
            const noseRadius = setup.tooling.noseRadius;
            const theoreticalRa = (baseIpr * baseIpr) / (32 * noseRadius) * 1000000; // µin

            return {
                rpm: Math.round(rpm),
                sfm: Math.round(actualSfm),
                vcMetric: Math.round(actualSfm / 3.28084),
                ipr: Math.round(baseIpr * 10000) / 10000,
                ipm: Math.round(ipm * 10) / 10,
                recommendedDoc: Math.round(recommendedDoc * 1000) / 1000,
                recommendedStickout: Math.round(recommendedStickout * 100) / 100,
                mrr: Math.round(mrr * 100) / 100,
                power: Math.round(power * 10) / 10,
                surfaceFinishRa: Math.round(theoreticalRa),

                // Safety
                centrifugalGForce: setup.centrifugalGForce,
                axisGForces: setup.axisGForces,
                rigidityScore: setup.rigidityScore,

                // Limits
                limits: {
                    rpmLimited: rpm >= maxRpm * 0.98,
                    gripLimited: setup.centrifugalGForce.effectiveGrip < 70,
                    powerLimited: power >= setup.spindle.peakHp * 0.85
                },
                setup: setup,
                warnings: this.generateWarnings(setup, rpm, baseIpr, power)
            };
        },
        // Generate warnings
        generateWarnings: function(setup, rpm, ipr, power) {
            const warnings = [];

            // Centrifugal grip warning
            if (!setup.centrifugalGForce.isSafe) {
                warnings.push({
                    type: 'critical',
                    text: `⛔ Chuck grip dangerously low (${setup.centrifugalGForce.effectiveGrip}%). Reduce RPM to ${setup.centrifugalGForce.maxSafeRpm}`
                });
            }
            // Power warning
            if (power > setup.spindle.peakHp * 0.9) {
                warnings.push({
                    type: 'warning',
                    text: `⚠️ Power draw ${power.toFixed(1)} HP near capacity (${setup.spindle.peakHp} HP)`
                });
            }
            // Workpiece L/D warning
            if (setup.workpiece.ldRatio > 4 && !setup.workholding.hasTailstock) {
                warnings.push({
                    type: 'warning',
                    text: `⚠️ Workpiece L/D ${setup.workpiece.ldRatio.toFixed(1)}:1 - consider tailstock support`
                });
            }
            // Boring bar L/D warning
            if (setup.operation.isBoring && setup.tooling.barLdRatio > setup.tooling.barProperties.maxLd) {
                warnings.push({
                    type: 'warning',
                    text: `⚠️ Boring bar L/D ${setup.tooling.barLdRatio.toFixed(1)}:1 exceeds recommended ${setup.tooling.barProperties.maxLd}:1 for ${setup.tooling.barMaterial}`
                });
            }
            // Rigidity warning
            if (setup.rigidityScore < 50) {
                warnings.push({
                    type: 'warning',
                    text: `⚠️ Low rigidity score (${setup.rigidityScore}%). Consider improving setup.`
                });
            }
            // Work hardening warning
            if (setup.material.workHardening) {
                warnings.push({
                    type: 'info',
                    text: '💡 Work-hardening material: maintain positive feed, avoid dwell'
                });
            }
            // Positive indicators
            if (setup.workholding.hasTailstock) {
                warnings.push({
                    type: 'info',
                    text: '✨ Tailstock support: +40% rigidity'
                });
            }
            if (setup.rigidityScore > 80) {
                warnings.push({
                    type: 'info',
                    text: `💪 High rigidity setup (${setup.rigidityScore}%)`
                });
            }
            // Add axis G-force warnings
            if (setup.axisGForces && setup.axisGForces.warnings) {
                setup.axisGForces.warnings.forEach(w => warnings.push(w));
            }
            return warnings;
        }
    }