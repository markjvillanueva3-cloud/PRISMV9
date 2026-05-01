const PRISM_MANUFACTURING_ALGORITHMS = {
    name: 'PRISM Manufacturing Algorithms',
    version: '1.0.0',
    sources: ['MIT 2.008', 'MIT 2.810', 'MIT 2.830', 'Georgia Tech CNC Pathways', 'CMU 24-681'],
    algorithmCount: 100,

    // ─────────────────────────────────────────────────────────────────────────────
    // 4.1 CUTTING MECHANICS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Taylor Tool Life Equation
     * Source: MIT 2.008, MIT 2.810
     * V * T^n = C
     */
    taylorToolLife: function(speed, material) {
        const defaults = {
            steel: { n: 0.125, C: 150 },
            aluminum: { n: 0.4, C: 800 },
            titanium: { n: 0.1, C: 80 },
            stainless: { n: 0.15, C: 120 },
            inconel: { n: 0.08, C: 50 }
        };
        
        const params = defaults[material] || defaults.steel;
        const toolLife = Math.pow(params.C / speed, 1 / params.n);
        
        return {
            toolLife, // minutes
            n: params.n,
            C: params.C,
            speed
        };
    },

    /**
     * Extended Taylor with Temperature
     * Source: MIT 2.830 Control of Manufacturing
     */
    extendedTaylorToolLife: function(params) {
        const { speed, feed, doc, material } = params;
        
        // Extended Taylor: V * T^n * f^a * d^b = C
        const coeffs = {
            steel: { n: 0.125, a: 0.75, b: 0.15, C: 150 },
            aluminum: { n: 0.4, a: 0.6, b: 0.1, C: 800 },
            titanium: { n: 0.1, a: 0.8, b: 0.2, C: 80 }
        };
        
        const c = coeffs[material] || coeffs.steel;
        const toolLife = Math.pow(c.C / (speed * Math.pow(feed, c.a) * Math.pow(doc, c.b)), 1 / c.n);
        
        return {
            toolLife,
            coefficients: c,
            inputs: { speed, feed, doc }
        };
    },

    /**
     * Merchant's Cutting Force Model
     * Source: MIT 2.008 Design and Manufacturing II
     */
    merchantCuttingForce: function(params) {
        const {
            chipThickness, // mm
            width,         // mm
            shearStrength, // MPa
            rakeAngle,     // radians
            frictionCoeff  // coefficient
        } = params;
        
        // Shear angle from Merchant's equation
        const frictionAngle = Math.atan(frictionCoeff);
        const shearAngle = Math.PI / 4 - frictionAngle / 2 + rakeAngle / 2;
        
        // Shear force
        const shearArea = chipThickness * width / Math.sin(shearAngle);
        const shearForce = shearStrength * shearArea;
        
        // Cutting forces
        const cuttingForce = shearForce * Math.cos(frictionAngle - rakeAngle) / 
                            Math.cos(shearAngle + frictionAngle - rakeAngle);
        const thrustForce = shearForce * Math.sin(frictionAngle - rakeAngle) / 
                           Math.cos(shearAngle + frictionAngle - rakeAngle);
        
        return {
            shearAngle: shearAngle * 180 / Math.PI, // degrees
            cuttingForce, // N
            thrustForce,  // N
            power: cuttingForce * params.cuttingSpeed / 60000 // kW
        };
    },

    /**
     * Material Removal Rate
     * Source: MIT 2.008, Georgia Tech CNC
     */
    calculateMRR: function(params) {
        const { type, feed, doc, woc, rpm, diameter } = params;
        
        let mrr;
        switch (type) {
            case 'turning':
                // MRR = f * d * V
                const sfm = Math.PI * diameter * rpm / 12; // surface feet/min
                mrr = feed * doc * sfm; // in³/min
                break;
            case 'milling':
                // MRR = f * d * w (slot) or = fz * z * rpm * d * w
                mrr = feed * doc * (woc || diameter); // in³/min
                break;
            case 'drilling':
                // MRR = π/4 * d² * f
                mrr = (Math.PI / 4) * diameter * diameter * feed;
                break;
            default:
                mrr = feed * doc * (woc || 1);
        }
        
        return {
            mrr,
            unit: 'in³/min',
            params
        };
    },

    /**
     * Surface Finish Prediction
     * Source: MIT 2.008
     */
    surfaceFinish: function(params) {
        const { feed, noseRadius, type } = params;
        
        let Ra; // Arithmetic average roughness
        
        if (type === 'turning') {
            // Ra ≈ f² / (32 * r) for ideal surface
            Ra = (feed * feed) / (32 * noseRadius) * 1000; // μin
        } else if (type === 'milling') {
            // Ra depends on feed per tooth and tool geometry
            Ra = (feed * feed) / (32 * noseRadius) * 1000 * 1.2; // with factor
        } else {
            Ra = feed * 100; // simplified
        }
        
        return {
            Ra,       // μin
            RaMetric: Ra * 0.0254, // μm
            quality: Ra < 16 ? 'mirror' : Ra < 32 ? 'fine' : Ra < 63 ? 'medium' : 'rough'
        };
    },

    /**
     * Chatter Stability Analysis (Stability Lobes)
     * Source: MIT 2.830 Control of Manufacturing
     */
    stabilityLobes: function(params) {
        const {
            naturalFreq,    // Hz
            dampingRatio,
            specificForce,  // N/mm²
            numTeeth,
            radialImmersion // fraction
        } = params;
        
        const lobes = [];
        
        // Generate stability lobes for different lobe numbers
        for (let k = 0; k < 10; k++) {
            const lobePoints = [];
            
            for (let phase = 0; phase <= Math.PI; phase += 0.1) {
                // Oriented transfer function
                const omega_c = naturalFreq * Math.sqrt(1 + Math.tan(phase) * Math.tan(phase));
                
                // Critical depth of cut
                const G_real = -(1 - (omega_c / naturalFreq) ** 2) / 
                              (((1 - (omega_c / naturalFreq) ** 2) ** 2) + (2 * dampingRatio * omega_c / naturalFreq) ** 2);
                
                const blim = -1 / (2 * specificForce * numTeeth * radialImmersion * G_real);
                
                // Spindle speed for this lobe
                const epsilon = Math.PI - 2 * phase;
                const spindleSpeed = 60 * omega_c / (numTeeth * (epsilon + 2 * k * Math.PI));
                
                if (spindleSpeed > 0 && blim > 0 && blim < 50) {
                    lobePoints.push({
                        rpm: spindleSpeed,
                        docLimit: blim // mm
                    });
                }
            }
            
            if (lobePoints.length > 0) {
                lobes.push({ lobeNumber: k, points: lobePoints });
            }
        }
        
        return {
            lobes,
            params,
            isStable: (rpm, doc) => {
                // Check if operating point is below all stability limits
                for (const lobe of lobes) {
                    for (const point of lobe.points) {
                        if (Math.abs(rpm - point.rpm) < 100 && doc > point.docLimit) {
                            return false;
                        }
                    }
                }
                return true;
            }
        };
    },

    /**
     * Cutting Temperature Model
     * Source: MIT 2.810 Manufacturing Processes
     */
    cuttingTemperature: function(params) {
        const {
            speed,        // m/min
            feed,         // mm/rev
            doc,          // mm
            material,     // workpiece material
            coolant       // boolean
        } = params;
        
        // Simplified Shaw model
        const materialProps = {
            steel: { k: 50, rho: 7850, cp: 500, Tm: 1500 },
            aluminum: { k: 200, rho: 2700, cp: 900, Tm: 660 },
            titanium: { k: 7, rho: 4500, cp: 520, Tm: 1668 }
        };
        
        const props = materialProps[material] || materialProps.steel;
        const ambient = 20; // °C
        
        // Temperature rise
        const Q = 0.9; // fraction of energy to chip
        const specificEnergy = 2.5; // J/mm³ typical
        const mrr = speed * feed * doc / 60; // mm³/s
        const heatGeneration = Q * specificEnergy * mrr * 1000; // W
        
        // Simplified temperature calculation
        let tempRise = heatGeneration / (props.k * Math.sqrt(speed * feed));
        
        if (coolant) {
            tempRise *= 0.6; // 40% reduction with coolant
        }
        
        const temperature = ambient + tempRise;
        
        return {
            temperature,
            ambient,
            tempRise,
            nearMeltingPoint: temperature > 0.7 * props.Tm,
            recommendCoolant: temperature > 400
        };
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // 4.2 PROCESS CAPABILITY & QUALITY
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Process Capability Indices
     * Source: MIT 2.830, Georgia Tech ISYE
     */
    processCapability: function(data, lsl, usl) {
        const n = data.length;
        const mean = data.reduce((a, b) => a + b, 0) / n;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        
        // Cp - Process capability
        const cp = (usl - lsl) / (6 * stdDev);
        
        // Cpk - Process capability index (accounts for centering)
        const cpk = Math.min(
            (usl - mean) / (3 * stdDev),
            (mean - lsl) / (3 * stdDev)
        );
        
        // Pp and Ppk - Process performance (using sample std dev)
        const pp = cp;
        const ppk = cpk;
        
        // Defects per million
        const zupper = (usl - mean) / stdDev;
        const zlower = (mean - lsl) / stdDev;
        const dpmo = (this._normalCDF(-zupper) + this._normalCDF(-zlower)) * 1000000;
        
        return {
            mean,
            stdDev,
            cp,
            cpk,
            pp,
            ppk,
            dpmo,
            sigmaLevel: this._dpmoToSigma(dpmo),
            capable: cpk >= 1.33
        };
    },

    /**
     * Control Chart Calculations
     * Source: MIT 2.830
     */
    controlChart: function(data, type = 'xbar-r') {
        const subgroupSize = 5; // typical
        const numSubgroups = Math.floor(data.length / subgroupSize);
        
        const subgroups = [];
        for (let i = 0; i < numSubgroups; i++) {
            const group = data.slice(i * subgroupSize, (i + 1) * subgroupSize);
            const mean = group.reduce((a, b) => a + b, 0) / subgroupSize;
            const range = Math.max(...group) - Math.min(...group);
            subgroups.push({ mean, range, data: group });
        }
        
        const xbar = subgroups.reduce((sum, g) => sum + g.mean, 0) / numSubgroups;
        const rbar = subgroups.reduce((sum, g) => sum + g.range, 0) / numSubgroups;
        
        // Control chart constants (for n=5)
        const A2 = 0.577;
        const D3 = 0;
        const D4 = 2.114;
        const d2 = 2.326;
        
        // Control limits
        const xbarUCL = xbar + A2 * rbar;
        const xbarLCL = xbar - A2 * rbar;
        const rUCL = D4 * rbar;
        const rLCL = D3 * rbar;
        
        // Estimate process standard deviation
        const sigmaHat = rbar / d2;
        
        // Check for out-of-control points
        const outOfControl = subgroups.map((g, i) => ({
            subgroup: i,
            xbarOOC: g.mean > xbarUCL || g.mean < xbarLCL,
            rangeOOC: g.range > rUCL || g.range < rLCL
        })).filter(g => g.xbarOOC || g.rangeOOC);
        
        return {
            xbar,
            rbar,
            xbarUCL,
            xbarLCL,
            rUCL,
            rLCL,
            sigmaHat,
            subgroups,
            outOfControl,
            inControl: outOfControl.length === 0
        };
    },

    /**
     * Overall Equipment Effectiveness (OEE)
     * Source: Georgia Tech GaMEP
     */
    calculateOEE: function(params) {
        const {
            plannedTime,    // minutes
            downtime,       // minutes
            idealCycleTime, // minutes per part
            totalParts,
            goodParts
        } = params;
        
        const runTime = plannedTime - downtime;
        
        // Availability
        const availability = runTime / plannedTime;
        
        // Performance
        const theoreticalOutput = runTime / idealCycleTime;
        const performance = totalParts / theoreticalOutput;
        
        // Quality
        const quality = goodParts / totalParts;
        
        // OEE
        const oee = availability * performance * quality;
        
        return {
            availability: availability * 100,
            performance: performance * 100,
            quality: quality * 100,
            oee: oee * 100,
            worldClass: oee >= 0.85,
            losses: {
                downtime,
                speedLoss: (theoreticalOutput - totalParts) * idealCycleTime,
                qualityLoss: totalParts - goodParts
            }
        };
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // 4.3 G-CODE GENERATION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Generate G-code for linear move
     * Source: Georgia Tech CNC Pathways
     */
    gLinear: function(params) {
        const { x, y, z, feed, rapid } = params;
        let code = rapid ? 'G00' : 'G01';
        
        if (x !== undefined) code += ` X${x.toFixed(4)}`;
        if (y !== undefined) code += ` Y${y.toFixed(4)}`;
        if (z !== undefined) code += ` Z${z.toFixed(4)}`;
        if (!rapid && feed) code += ` F${feed.toFixed(1)}`;
        
        return code;
    },

    /**
     * Generate G-code for arc
     * Source: Georgia Tech CNC Pathways
     */
    gArc: function(params) {
        const { x, y, i, j, clockwise, feed } = params;
        let code = clockwise ? 'G02' : 'G03';
        
        code += ` X${x.toFixed(4)} Y${y.toFixed(4)}`;
        code += ` I${i.toFixed(4)} J${j.toFixed(4)}`;
        if (feed) code += ` F${feed.toFixed(1)}`;
        
        return code;
    },

    /**
     * Generate complete G-code program
     * Source: Georgia Tech CNC Pathways, MIT 2.008
     */
    generateProgram: function(toolpath, options = {}) {
        const {
            programNumber = 1000,
            toolNumber = 1,
            spindleSpeed = 3000,
            coolant = true,
            safeZ = 1.0,
            unit = 'inch'
        } = options;
        
        const lines = [];
        
        // Header
        lines.push(`O${programNumber}`);
        lines.push('(PRISM Generated Program)');
        lines.push(`(Date: ${new Date().toISOString()})`);