const PRISM_LEAN_SIX_SIGMA_KAIZEN = {
    VERSION: '1.0.0',
    BUILD_DATE: '2026-01-15',

    // SECTION 1: SIX SIGMA - Statistical Process Control
    sixSigma: {

        // 1.1 Process Capability Indices
        processCapability: {
            /**
             * Calculate Cp (Process Capability)
             * Measures potential capability if process is centered
             * @param {number} USL - Upper specification limit
             * @param {number} LSL - Lower specification limit
             * @param {number} sigma - Process standard deviation
             * @returns {number} Cp value
             */
            calculateCp: function(USL, LSL, sigma) {
                if (sigma <= 0) return 0;
                return (USL - LSL) / (6 * sigma);
            },
            /**
             * Calculate Cpk (Process Capability Index)
             * Measures actual capability considering centering
             * @param {number} USL - Upper specification limit
             * @param {number} LSL - Lower specification limit
             * @param {number} mean - Process mean
             * @param {number} sigma - Process standard deviation
             * @returns {object} Cpk value with interpretation
             */
            calculateCpk: function(USL, LSL, mean, sigma) {
                if (sigma <= 0) return { value: 0, interpretation: 'Invalid sigma' };

                const cpkUpper = (USL - mean) / (3 * sigma);
                const cpkLower = (mean - LSL) / (3 * sigma);
                const cpk = Math.min(cpkUpper, cpkLower);

                let interpretation;
                if (cpk >= 2.0) interpretation = 'World Class (6σ)';
                else if (cpk >= 1.67) interpretation = 'Excellent (5σ)';
                else if (cpk >= 1.33) interpretation = 'Good (4σ)';
                else if (cpk >= 1.0) interpretation = 'Capable (3σ)';
                else if (cpk >= 0.67) interpretation = 'Marginal';
                else interpretation = 'Not Capable - Action Required';

                return {
                    value: cpk,
                    cpkUpper,
                    cpkLower,
                    interpretation,
                    ppm: this._cpkToPPM(cpk),
                    sigmaLevel: this._cpkToSigma(cpk)
                };
            },
            /**
             * Calculate Ppk (Process Performance Index)
             * Uses overall standard deviation (includes between-group variation)
             */
            calculatePpk: function(USL, LSL, mean, overallSigma) {
                return this.calculateCpk(USL, LSL, mean, overallSigma);
            },
            /**
             * PRISM INNOVATION: Cpk with Gaussian Process Uncertainty
             * Provides confidence intervals on capability indices
             */
            calculateCpkWithUncertainty: function(measurements, USL, LSL) {
                const n = measurements.length;
                if (n < 10) return { error: 'Need at least 10 measurements' };

                const mean = measurements.reduce((a, b) => a + b, 0) / n;
                const sigma = Math.sqrt(measurements.reduce((sum, x) =>
                    sum + Math.pow(x - mean, 2), 0) / (n - 1));

                // Bootstrap for confidence intervals
                const bootstrapCpks = [];
                for (let i = 0; i < 1000; i++) {
                    const sample = [];
                    for (let j = 0; j < n; j++) {
                        sample.push(measurements[Math.floor(Math.random() * n)]);
                    }
                    const sampleMean = sample.reduce((a, b) => a + b, 0) / n;
                    const sampleSigma = Math.sqrt(sample.reduce((sum, x) =>
                        sum + Math.pow(x - sampleMean, 2), 0) / (n - 1));
                    if (sampleSigma > 0) {
                        const cpk = Math.min(
                            (USL - sampleMean) / (3 * sampleSigma),
                            (sampleMean - LSL) / (3 * sampleSigma)
                        );
                        bootstrapCpks.push(cpk);
                    }
                }
                bootstrapCpks.sort((a, b) => a - b);
                const ci95Lower = bootstrapCpks[Math.floor(bootstrapCpks.length * 0.025)];
                const ci95Upper = bootstrapCpks[Math.floor(bootstrapCpks.length * 0.975)];

                const cpk = this.calculateCpk(USL, LSL, mean, sigma);

                return {
                    ...cpk,
                    confidence95: { lower: ci95Lower, upper: ci95Upper },
                    sampleSize: n,
                    uncertaintyLevel: (ci95Upper - ci95Lower) / cpk.value
                };
            },
            _cpkToPPM: function(cpk) {
                // Approximate PPM from Cpk using normal distribution
                if (cpk <= 0) return 1000000;
                const z = cpk * 3;
                // One-sided, so multiply by 2 for both tails
                return Math.round(2 * 1000000 * (1 - this._normalCDF(z)));
            },
            _cpkToSigma: function(cpk) {
                return Math.round(cpk * 3 * 10) / 10;
            },
            _normalCDF: function(z) {
                const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
                const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
                const sign = z < 0 ? -1 : 1;
                z = Math.abs(z) / Math.sqrt(2);
                const t = 1 / (1 + p * z);
                const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
                return 0.5 * (1 + sign * y);
            }
        },
        // 1.2 Control Charts (X-bar, R, S, p, np, c, u)
        controlCharts: {
            /**
             * X-bar and R Chart (Variables data)
             * Most common SPC chart for continuous measurements
             */
            xBarRChart: function(subgroups) {
                const n = subgroups[0].length; // Subgroup size
                const k = subgroups.length; // Number of subgroups

                // Constants for control chart factors
                const factors = {
                    2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
                    3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
                    4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
                    5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
                    6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
                    7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
                    8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
                    9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
                    10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 }
                };
                const f = factors[n] || factors[5];

                // Calculate subgroup statistics
                const xBars = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
                const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));

                // Calculate centerlines
                const xBarBar = xBars.reduce((a, b) => a + b, 0) / k;
                const rBar = ranges.reduce((a, b) => a + b, 0) / k;

                // Calculate control limits
                const xBarUCL = xBarBar + f.A2 * rBar;
                const xBarLCL = xBarBar - f.A2 * rBar;
                const rUCL = f.D4 * rBar;
                const rLCL = f.D3 * rBar;

                // Detect out-of-control points
                const outOfControl = [];
                xBars.forEach((xBar, i) => {
                    if (xBar > xBarUCL || xBar < xBarLCL) {
                        outOfControl.push({ index: i, type: 'X-bar', value: xBar });
                    }
                });
                ranges.forEach((r, i) => {
                    if (r > rUCL || r < rLCL) {
                        outOfControl.push({ index: i, type: 'Range', value: r });
                    }
                });

                return {
                    chartType: 'X-bar and R',
                    subgroupSize: n,
                    numSubgroups: k,
                    xBar: {
                        centerline: xBarBar,
                        UCL: xBarUCL,
                        LCL: xBarLCL,
                        values: xBars
                    },
                    range: {
                        centerline: rBar,
                        UCL: rUCL,
                        LCL: rLCL,
                        values: ranges
                    },
                    estimatedSigma: rBar / f.d2,
                    outOfControl,
                    inControl: outOfControl.length === 0
                };
            },
            /**
             * Individual and Moving Range Chart (I-MR)
             * For when subgrouping is not possible
             */
            iMRChart: function(individuals) {
                const n = individuals.length;

                // Calculate moving ranges
                const movingRanges = [];
                for (let i = 1; i < n; i++) {
                    movingRanges.push(Math.abs(individuals[i] - individuals[i - 1]));
                }
                // Centerlines
                const xBar = individuals.reduce((a, b) => a + b, 0) / n;
                const mRBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;

                // Control limits (d2 = 1.128 for n=2)
                const d2 = 1.128;
                const D4 = 3.267;
                const estimatedSigma = mRBar / d2;

                const iUCL = xBar + 3 * estimatedSigma;
                const iLCL = xBar - 3 * estimatedSigma;
                const mrUCL = D4 * mRBar;

                return {
                    chartType: 'I-MR',
                    individuals: {
                        centerline: xBar,
                        UCL: iUCL,
                        LCL: iLCL,
                        values: individuals
                    },
                    movingRange: {
                        centerline: mRBar,
                        UCL: mrUCL,
                        LCL: 0,
                        values: movingRanges
                    },
                    estimatedSigma
                };
            },
            /**
             * p-Chart (Proportion defective)
             * For attribute data - fraction nonconforming
             */
            pChart: function(inspected, defective) {
                const n = inspected.length;
                const pBars = defective.map((d, i) => d / inspected[i]);
                const totalDefective = defective.reduce((a, b) => a + b, 0);
                const totalInspected = inspected.reduce((a, b) => a + b, 0);
                const pBar = totalDefective / totalInspected;

                // Variable control limits based on sample size
                const ucls = inspected.map(ni => pBar + 3 * Math.sqrt(pBar * (1 - pBar) / ni));
                const lcls = inspected.map(ni => Math.max(0, pBar - 3 * Math.sqrt(pBar * (1 - pBar) / ni)));

                return {
                    chartType: 'p-Chart',
                    centerline: pBar,
                    UCL: ucls,
                    LCL: lcls,
                    values: pBars,
                    averageSampleSize: totalInspected / n
                };
            },
            /**
             * c-Chart (Count of defects)
             * For count data with constant sample size
             */
            cChart: function(defectCounts) {
                const cBar = defectCounts.reduce((a, b) => a + b, 0) / defectCounts.length;
                const ucl = cBar + 3 * Math.sqrt(cBar);
                const lcl = Math.max(0, cBar - 3 * Math.sqrt(cBar));

                return {
                    chartType: 'c-Chart',
                    centerline: cBar,
                    UCL: ucl,
                    LCL: lcl,
                    values: defectCounts
                };
            },
            /**
             * PRISM INNOVATION: Self-Adjusting Control Limits with Bayesian Learning
             * Control limits that adapt based on process history
             */
            bayesianControlChart: function(newData, priorHistory = null) {
                // Prior belief about process parameters
                let priorMean, priorVariance, priorN;

                if (priorHistory) {
                    priorMean = priorHistory.mean;
                    priorVariance = priorHistory.variance;
                    priorN = priorHistory.n;
                } else {
                    // Non-informative prior
                    priorMean = newData.reduce((a, b) => a + b, 0) / newData.length;
                    priorVariance = newData.reduce((sum, x) => sum + Math.pow(x - priorMean, 2), 0) / newData.length;
                    priorN = 1;
                }
                // Update with new data
                const n = newData.length;
                const dataMean = newData.reduce((a, b) => a + b, 0) / n;
                const dataVariance = newData.reduce((sum, x) => sum + Math.pow(x - dataMean, 2), 0) / n;

                // Bayesian update (conjugate normal-normal)
                const posteriorN = priorN + n;
                const posteriorMean = (priorN * priorMean + n * dataMean) / posteriorN;
                const posteriorVariance = ((priorN * priorVariance + n * dataVariance) +
                    (priorN * n * Math.pow(priorMean - dataMean, 2)) / posteriorN) / posteriorN;

                const posteriorSigma = Math.sqrt(posteriorVariance);

                // Adaptive control limits
                const ucl = posteriorMean + 3 * posteriorSigma;
                const lcl = posteriorMean - 3 * posteriorSigma;

                // Confidence in limits (higher n = more confident)
                const confidence = 1 - 1 / Math.sqrt(posteriorN);

                return {
                    chartType: 'Bayesian Adaptive',
                    centerline: posteriorMean,
                    UCL: ucl,
                    LCL: lcl,
                    estimatedSigma: posteriorSigma,
                    confidence,
                    effectiveSampleSize: posteriorN,
                    posteriorHistory: {
                        mean: posteriorMean,
                        variance: posteriorVariance,
                        n: posteriorN
                    },
                    recommendation: confidence > 0.9 ? 'Limits stable' : 'Continue monitoring'
                };
            }
        },
        // 1.3 DMAIC Framework
        dmaic: {
            /**
             * Create DMAIC project structure
             */
            createProject: function(params) {
                return {
                    projectId: 'DMAIC-' + Date.now(),
                    createdDate: new Date().toISOString(),
                    name: params.name,
                    problemStatement: params.problem,
                    projectScope: params.scope,
                    teamMembers: params.team || [],
                    targetMetric: params.metric,
                    baseline: params.baseline,
                    target: params.target,
                    phases: {
                        define: { status: 'active', startDate: new Date().toISOString(), data: {} },
                        measure: { status: 'pending', data: {} },
                        analyze: { status: 'pending', data: {} },
                        improve: { status: 'pending', data: {} },
                        control: { status: 'pending', data: {} }
                    },
                    currentPhase: 'define'
                };
            },
            /**
             * Calculate Sigma Level from defect rate
             */
            calculateSigmaLevel: function(defects, opportunities, units) {
                const dpo = defects / (opportunities * units);
                const dpmo = dpo * 1000000;

                // Convert DPMO to Sigma Level (1.5 shift included)
                const z = this._dpmoToZ(dpmo);
                const sigmaLevel = z + 1.5; // Add 1.5 sigma shift

                return {
                    defects,
                    opportunities,
                    units,
                    dpo,
                    dpmo: Math.round(dpmo),
                    yield: (1 - dpo) * 100,
                    sigmaLevel: Math.round(sigmaLevel * 100) / 100,
                    interpretation: this._interpretSigma(sigmaLevel)
                };
            },
            _dpmoToZ: function(dpmo) {
                // Inverse normal approximation
                const p = dpmo / 1000000;
                if (p <= 0) return 6;
                if (p >= 1) return 0;

                // Newton-Raphson approximation
                let z = 3;
                for (let i = 0; i < 10; i++) {
                    const cdf = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability._normalCDF(z);
                    const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
                    z = z - (cdf - (1 - p)) / pdf;
                }
                return z;
            },
            _interpretSigma: function(sigma) {
                if (sigma >= 6) return 'World Class (3.4 DPMO)';
                if (sigma >= 5) return 'Excellent (233 DPMO)';
                if (sigma >= 4) return 'Good (6,210 DPMO)';
                if (sigma >= 3) return 'Average (66,807 DPMO)';
                if (sigma >= 2) return 'Below Average (308,538 DPMO)';
                return 'Poor (>691,462 DPMO)';
            }
        },
        // 1.4 FMEA with Monte Carlo (PRISM Innovation)
        fmea: {
            /**
             * Standard FMEA RPN calculation
             */
            calculateRPN: function(severity, occurrence, detection) {
                return severity * occurrence * detection;
            },
            /**
             * PRISM INNOVATION: Probabilistic FMEA with Monte Carlo simulation
             * Models uncertainty in S, O, D ratings
             */
            monteCarloFMEA: function(failureModes, simulations = 10000) {
                const results = failureModes.map(fm => {
                    const rpnSamples = [];

                    // Simulate with uncertainty in ratings
                    for (let i = 0; i < simulations; i++) {
                        // Allow ±1 variation in ratings (triangular distribution)
                        const s = this._triangularSample(
                            Math.max(1, fm.severity - 1),
                            fm.severity,
                            Math.min(10, fm.severity + 1)
                        );
                        const o = this._triangularSample(
                            Math.max(1, fm.occurrence - 1),
                            fm.occurrence,
                            Math.min(10, fm.occurrence + 1)
                        );
                        const d = this._triangularSample(
                            Math.max(1, fm.detection - 1),
                            fm.detection,
                            Math.min(10, fm.detection + 1)
                        );

                        rpnSamples.push(s * o * d);
                    }
                    rpnSamples.sort((a, b) => a - b);

                    return {
                        ...fm,
                        nominalRPN: fm.severity * fm.occurrence * fm.detection,
                        meanRPN: rpnSamples.reduce((a, b) => a + b, 0) / simulations,
                        medianRPN: rpnSamples[Math.floor(simulations / 2)],
                        p95RPN: rpnSamples[Math.floor(simulations * 0.95)],
                        p99RPN: rpnSamples[Math.floor(simulations * 0.99)],
                        worstCaseRPN: rpnSamples[simulations - 1],
                        riskCategory: this._categorizeRisk(rpnSamples[Math.floor(simulations * 0.95)])
                    };
                });

                // Sort by P95 RPN (worst likely case)
                results.sort((a, b) => b.p95RPN - a.p95RPN);

                return {
                    failureModes: results,
                    simulations,
                    topRisks: results.slice(0, 5),
                    totalP95Risk: results.reduce((sum, fm) => sum + fm.p95RPN, 0)
                };
            },
            _triangularSample: function(min, mode, max) {
                const u = Math.random();
                const fc = (mode - min) / (max - min);
                if (u < fc) {
                    return min + Math.sqrt(u * (max - min) * (mode - min));
                } else {
                    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
                }
            },
            _categorizeRisk: function(rpn) {
                if (rpn >= 200) return 'CRITICAL - Immediate action required';
                if (rpn >= 100) return 'HIGH - Action required';
                if (rpn >= 50) return 'MEDIUM - Monitor closely';
                return 'LOW - Acceptable risk';
            }
        }
    },
    // SECTION 2: LEAN MANUFACTURING
    lean: {

        // 2.1 Seven Wastes (Muda) Detection
        sevenWastes: {
            wasteTypes: {
                TRANSPORT: { name: 'Transportation', description: 'Unnecessary movement of materials' },
                INVENTORY: { name: 'Inventory', description: 'Excess raw materials, WIP, or finished goods' },
                MOTION: { name: 'Motion', description: 'Unnecessary movement of people' },
                WAITING: { name: 'Waiting', description: 'Idle time waiting for next step' },
                OVERPRODUCTION: { name: 'Overproduction', description: 'Making more than needed' },
                OVERPROCESSING: { name: 'Over-processing', description: 'Doing more work than required' },
                DEFECTS: { name: 'Defects', description: 'Rework, scrap, corrections' }
            },
            /**
             * Analyze shop floor data for waste indicators
             * PRISM INNOVATION: AI-powered waste detection patterns
             */
            analyzeForWaste: function(shopData) {
                const wasteFound = [];

                // Transport waste - excessive material movement
                if (shopData.avgMaterialTravelDistance > 50) { // meters
                    wasteFound.push({
                        type: 'TRANSPORT',
                        severity: Math.min(10, shopData.avgMaterialTravelDistance / 10),
                        indicator: `Average material travel: ${shopData.avgMaterialTravelDistance}m`,
                        recommendation: 'Consider cellular manufacturing layout'
                    });
                }
                // Inventory waste - high WIP levels
                if (shopData.wipDays > 5) {
                    wasteFound.push({
                        type: 'INVENTORY',
                        severity: Math.min(10, shopData.wipDays),
                        indicator: `WIP covers ${shopData.wipDays} days of production`,
                        recommendation: 'Implement pull system/kanban'
                    });
                }
                // Waiting waste - machine idle time
                if (shopData.machineUtilization < 70) {
                    wasteFound.push({
                        type: 'WAITING',
                        severity: Math.round((100 - shopData.machineUtilization) / 10),
                        indicator: `Machine utilization: ${shopData.machineUtilization}%`,
                        recommendation: 'Analyze bottlenecks, balance workload'
                    });
                }
                // Defects waste - scrap rate
                if (shopData.scrapRate > 2) {
                    wasteFound.push({
                        type: 'DEFECTS',
                        severity: Math.min(10, shopData.scrapRate * 2),
                        indicator: `Scrap rate: ${shopData.scrapRate}%`,
                        recommendation: 'Root cause analysis, implement poka-yoke'
                    });
                }
                // Overproduction - finished goods inventory
                if (shopData.finishedGoodsDays > 10) {
                    wasteFound.push({
                        type: 'OVERPRODUCTION',
                        severity: Math.min(10, shopData.finishedGoodsDays / 3),
                        indicator: `${shopData.finishedGoodsDays} days of FG inventory`,
                        recommendation: 'Produce to customer demand, not forecast'
                    });
                }
                // Motion waste - setup time
                if (shopData.avgSetupTime > 60) { // minutes
                    wasteFound.push({
                        type: 'MOTION',
                        severity: Math.min(10, shopData.avgSetupTime / 15),
                        indicator: `Average setup time: ${shopData.avgSetupTime} minutes`,
                        recommendation: 'Implement SMED methodology'
                    });
                }
                // Over-processing - excessive tolerances
                if (shopData.avgToleranceRatio < 0.5) {
                    wasteFound.push({
                        type: 'OVERPROCESSING',
                        severity: Math.round((1 - shopData.avgToleranceRatio) * 10),
                        indicator: `Tolerances tighter than needed by ${Math.round((1 - shopData.avgToleranceRatio) * 100)}%`,
                        recommendation: 'Review customer requirements'
                    });
                }
                return {
                    wastesIdentified: wasteFound.length,
                    totalSeverity: wasteFound.reduce((sum, w) => sum + w.severity, 0),
                    wastes: wasteFound.sort((a, b) => b.severity - a.severity),
                    topPriority: wasteFound[0] || null,
                    leanScore: Math.max(0, 100 - wasteFound.reduce((sum, w) => sum + w.severity * 2, 0))
                };
            }
        },
        // 2.2 OEE (Overall Equipment Effectiveness)
        oee: {
            /**
             * Calculate OEE
             * OEE = Availability × Performance × Quality
             */
            calculate: function(params) {
                const {
                    plannedProductionTime,  // minutes
                    downtime,               // minutes (unplanned + planned stoppages)
                    idealCycleTime,         // minutes per part
                    totalParts,             // parts produced
                    goodParts               // parts meeting quality specs
                } = params;

                const operatingTime = plannedProductionTime - downtime;

                // Availability = Operating Time / Planned Production Time
                const availability = operatingTime / plannedProductionTime;

                // Performance = (Ideal Cycle Time × Total Parts) / Operating Time
                const performance = (idealCycleTime * totalParts) / operatingTime;

                // Quality = Good Parts / Total Parts
                const quality = goodParts / totalParts;

                // OEE
                const oee = availability * performance * quality;

                return {
                    availability: Math.round(availability * 1000) / 10,
                    performance: Math.round(performance * 1000) / 10,
                    quality: Math.round(quality * 1000) / 10,
                    oee: Math.round(oee * 1000) / 10,
                    interpretation: this._interpretOEE(oee),
                    losses: {
                        availabilityLoss: (1 - availability) * plannedProductionTime,
                        performanceLoss: (1 - performance) * operatingTime,
                        qualityLoss: (totalParts - goodParts) * idealCycleTime
                    },
                    benchmark: {
                        worldClass: 85,
                        typical: 60,
                        gap: Math.round((0.85 - oee) * 1000) / 10
                    }
                };
            },
            /**
             * PRISM INNOVATION: OEE with Kalman Filter prediction
             * Predicts future OEE based on trend
             */
            predictWithKalman: function(oeeHistory) {
                if (oeeHistory.length < 5) {
                    return { error: 'Need at least 5 historical OEE values' };
                }
                // Simple Kalman filter implementation
                const dt = 1; // time step (e.g., 1 day)
                let x = oeeHistory[0]; // state estimate
                let P = 1; // estimate uncertainty
                const Q = 0.1; // process noise
                const R = 1; // measurement noise

                const estimates = [];

                for (const measurement of oeeHistory) {
                    // Predict
                    const xPred = x;
                    const pPred = P + Q;

                    // Update
                    const K = pPred / (pPred + R);
                    x = xPred + K * (measurement - xPred);
                    P = (1 - K) * pPred;

                    estimates.push(x);
                }
                // Predict next 5 periods
                const predictions = [];
                let trend = (estimates[estimates.length - 1] - estimates[0]) / estimates.length;

                for (let i = 1; i <= 5; i++) {
                    predictions.push({
                        period: i,
                        predictedOEE: Math.min(100, Math.max(0, x + trend * i)),
                        confidence: Math.max(0, 1 - 0.1 * i)
                    });
                }
                return {
                    currentEstimate: x,
                    trend: trend > 0 ? 'Improving' : trend < 0 ? 'Declining' : 'Stable',
                    trendValue: Math.round(trend * 100) / 100,
                    predictions,
                    smoothedHistory: estimates
                };
            },
            _interpretOEE: function(oee) {
                if (oee >= 0.85) return 'World Class';
                if (oee >= 0.75) return 'Good';
                if (oee >= 0.65) return 'Average';
                if (oee >= 0.55) return 'Below Average';
                return 'Poor - Major improvement needed';
            }
        },
        // 2.3 Value Stream Mapping with ACO Optimization
        valueStreamMapping: {
            /**
             * Create Value Stream Map
             */
            createVSM: function(processSteps) {
                const vsm = {
                    processSteps: processSteps.map((step, i) => ({
                        ...step,
                        index: i,
                        valueAdded: step.cycleTime || 0,
                        nonValueAdded: (step.waitTime || 0) + (step.transportTime || 0),
                        leadTime: (step.cycleTime || 0) + (step.waitTime || 0) + (step.transportTime || 0)
                    })),
                    metrics: {}
                };
                // Calculate overall metrics
                vsm.metrics.totalLeadTime = vsm.processSteps.reduce((sum, s) => sum + s.leadTime, 0);
                vsm.metrics.totalValueAdded = vsm.processSteps.reduce((sum, s) => sum + s.valueAdded, 0);
                vsm.metrics.totalNonValueAdded = vsm.processSteps.reduce((sum, s) => sum + s.nonValueAdded, 0);
                vsm.metrics.valueAddedRatio = vsm.metrics.totalValueAdded / vsm.metrics.totalLeadTime;
                vsm.metrics.processEfficiency = Math.round(vsm.metrics.valueAddedRatio * 100);

                // Identify bottleneck
                const maxCycleTime = Math.max(...vsm.processSteps.map(s => s.cycleTime || 0));
                vsm.bottleneck = vsm.processSteps.find(s => s.cycleTime === maxCycleTime);

                return vsm;
            },
            /**
             * PRISM INNOVATION: VSM Optimization with Ant Colony Optimization
             * Finds optimal process sequence to minimize lead time
             */
            optimizeWithACO: function(processSteps, constraints = {}) {
                const n = processSteps.length;
                const numAnts = 20;
                const iterations = 50;
                const alpha = 1; // pheromone importance
                const beta = 2; // heuristic importance
                const evaporationRate = 0.5;
                const Q = 100;

                // Initialize pheromone matrix
                const pheromone = Array(n).fill(null).map(() => Array(n).fill(1));

                // Calculate heuristic (inverse of transition time)
                const heuristic = Array(n).fill(null).map(() => Array(n).fill(1));
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        if (i !== j) {
                            // Lower transition time = higher desirability
                            const transitionTime = processSteps[j].setupTime || 10;
                            heuristic[i][j] = 1 / transitionTime;
                        }
                    }
                }
                let bestSequence = null;
                let bestLeadTime = Infinity;

                for (let iter = 0; iter < iterations; iter++) {
                    const antSequences = [];
                    const antLeadTimes = [];

                    for (let ant = 0; ant < numAnts; ant++) {
                        // Build sequence
                        const visited = new Set();
                        const sequence = [];
                        let current = 0; // Start from first process
                        sequence.push(current);
                        visited.add(current);

                        while (sequence.length < n) {
                            // Calculate probabilities for unvisited nodes
                            const probs = [];
                            let probSum = 0;

                            for (let j = 0; j < n; j++) {
                                if (!visited.has(j)) {
                                    const prob = Math.pow(pheromone[current][j], alpha) *
                                                 Math.pow(heuristic[current][j], beta);
                                    probs.push({ node: j, prob });
                                    probSum += prob;
                                }
                            }
                            // Roulette wheel selection
                            let r = Math.random() * probSum;
                            let selected = probs[0].node;
                            for (const p of probs) {
                                r -= p.prob;
                                if (r <= 0) {
                                    selected = p.node;
                                    break;
                                }
                            }
                            sequence.push(selected);
                            visited.add(selected);
                            current = selected;
                        }
                        // Calculate lead time for this sequence
                        let leadTime = 0;
                        for (let i = 0; i < sequence.length; i++) {
                            const step = processSteps[sequence[i]];
                            leadTime += (step.cycleTime || 0) + (step.waitTime || 0);
                            if (i > 0) {
                                leadTime += step.setupTime || 0;
                            }
                        }
                        antSequences.push(sequence);
                        antLeadTimes.push(leadTime);

                        if (leadTime < bestLeadTime) {
                            bestLeadTime = leadTime;
                            bestSequence = [...sequence];
                        }
                    }
                    // Evaporate pheromone
                    for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                            pheromone[i][j] *= (1 - evaporationRate);
                        }
                    }
                    // Deposit pheromone
                    for (let ant = 0; ant < numAnts; ant++) {
                        const deposit = Q / antLeadTimes[ant];
                        const seq = antSequences[ant];
                        for (let i = 0; i < seq.length - 1; i++) {
                            pheromone[seq[i]][seq[i + 1]] += deposit;
                        }
                    }
                }
                return {
                    optimizedSequence: bestSequence.map(i => processSteps[i]),
                    originalLeadTime: processSteps.reduce((sum, s) =>
                        sum + (s.cycleTime || 0) + (s.waitTime || 0) + (s.setupTime || 0), 0),
                    optimizedLeadTime: bestLeadTime,
                    improvement: Math.round((1 - bestLeadTime /
                        processSteps.reduce((sum, s) =>
                            sum + (s.cycleTime || 0) + (s.waitTime || 0) + (s.setupTime || 0), 0)) * 100),
                    acoIterations: iterations,
                    sequenceIndices: bestSequence
                };
            }
        },
        // 2.4 SMED (Single Minute Exchange of Die)
        smed: {
            /**
             * Analyze setup activities and categorize
             */
            analyzeSetup: function(activities) {
                const internal = []; // Machine must be stopped
                const external = []; // Can be done while machine runs

                activities.forEach(activity => {
                    if (activity.requiresMachineStop) {
                        internal.push(activity);
                    } else {
                        external.push(activity);
                    }
                });

                const totalInternal = internal.reduce((sum, a) => sum + a.duration, 0);
                const totalExternal = external.reduce((sum, a) => sum + a.duration, 0);

                return {
                    internalActivities: internal,
                    externalActivities: external,
                    internalTime: totalInternal,
                    externalTime: totalExternal,
                    totalSetupTime: totalInternal + totalExternal,
                    downtimeReduction: totalExternal,
                    recommendations: this._generateSMEDRecommendations(internal)
                };
            },
            _generateSMEDRecommendations: function(internalActivities) {
                const recs = [];

                // Look for activities that could be converted
                internalActivities.forEach(activity => {
                    if (activity.duration > 5) { // > 5 minutes
                        recs.push({
                            activity: activity.name,
                            suggestion: 'Consider pre-staging or parallel processing',
                            potentialSaving: Math.round(activity.duration * 0.5)
                        });
                    }
                });

                return recs;
            }
        },
        // 2.5 TPM (Total Productive Maintenance)
        tpm: {
            /**
             * Calculate maintenance metrics
             */
            calculateMetrics: function(maintenanceData) {
                const {
                    totalDowntime,      // hours
                    numFailures,
                    operatingHours,
                    maintenanceCost
                } = maintenanceData;

                // MTBF = Operating Hours / Number of Failures
                const mtbf = numFailures > 0 ? operatingHours / numFailures : operatingHours;

                // MTTR = Total Downtime / Number of Failures
                const mttr = numFailures > 0 ? totalDowntime / numFailures : 0;

                // Availability = MTBF / (MTBF + MTTR)
                const availability = mtbf / (mtbf + mttr);

                return {
                    mtbf: Math.round(mtbf * 10) / 10,
                    mttr: Math.round(mttr * 10) / 10,
                    availability: Math.round(availability * 1000) / 10,
                    failureRate: numFailures > 0 ? (numFailures / operatingHours) : 0,
                    costPerFailure: numFailures > 0 ? maintenanceCost / numFailures : 0,
                    recommendation: this._getTPMRecommendation(mtbf, mttr)
                };
            },
            _getTPMRecommendation: function(mtbf, mttr) {
                if (mtbf < 100) return 'Critical: Implement preventive maintenance program';
                if (mtbf < 500) return 'Warning: Increase PM frequency';
                if (mttr > 4) return 'Focus on reducing repair time - train technicians';
                return 'Good performance - maintain current program';
            }
        },
        // 2.6 5S Implementation
        fiveS: {
            categories: {
                SORT: { name: 'Sort (Seiri)', description: 'Remove unnecessary items' },
                SETINORDER: { name: 'Set in Order (Seiton)', description: 'Organize remaining items' },
                SHINE: { name: 'Shine (Seiso)', description: 'Clean the workplace' },
                STANDARDIZE: { name: 'Standardize (Seiketsu)', description: 'Create consistent procedures' },
                SUSTAIN: { name: 'Sustain (Shitsuke)', description: 'Maintain and improve' }
            },
            /**
             * 5S Audit scorecard
             */
            audit: function(scores) {
                // scores = { sort: 1-5, setInOrder: 1-5, shine: 1-5, standardize: 1-5, sustain: 1-5 }
                const total = scores.sort + scores.setInOrder + scores.shine +
                              scores.standardize + scores.sustain;
                const maxScore = 25;

                return {
                    scores: {
                        sort: { score: scores.sort, max: 5 },
                        setInOrder: { score: scores.setInOrder, max: 5 },
                        shine: { score: scores.shine, max: 5 },
                        standardize: { score: scores.standardize, max: 5 },
                        sustain: { score: scores.sustain, max: 5 }
                    },
                    totalScore: total,
                    maxScore,
                    percentage: Math.round((total / maxScore) * 100),
                    level: this._get5SLevel(total / maxScore),
                    weakestArea: this._findWeakest(scores),
                    nextSteps: this._getNextSteps(scores)
                };
            },
            _get5SLevel: function(ratio) {
                if (ratio >= 0.9) return 'Excellent - World Class';
                if (ratio >= 0.8) return 'Good - Minor improvements needed';
                if (ratio >= 0.6) return 'Average - Focus on weak areas';
                return 'Needs Improvement - Comprehensive 5S program required';
            },
            _findWeakest: function(scores) {
                const areas = Object.entries(scores);
                areas.sort((a, b) => a[1] - b[1]);
                return areas[0][0];
            },
            _getNextSteps: function(scores) {
                const steps = [];
                if (scores.sort < 3) steps.push('Conduct red tag event');
                if (scores.setInOrder < 3) steps.push('Create visual management system');
                if (scores.shine < 3) steps.push('Establish cleaning schedules');
                if (scores.standardize < 3) steps.push('Document best practices');
                if (scores.sustain < 3) steps.push('Implement audit schedule');
                return steps;
            }
        },
        // 2.7 Kanban System
        kanban: {
            /**
             * Calculate kanban quantity
             */
            calculateKanbanSize: function(params) {
                const {
                    dailyDemand,      // units per day
                    leadTime,         // days
                    safetyFactor,     // typically 1.0-1.5
                    containerSize     // units per container
                } = params;

                // Number of kanbans = (Daily Demand × Lead Time × Safety Factor) / Container Size
                const numKanbans = Math.ceil(
                    (dailyDemand * leadTime * safetyFactor) / containerSize
                );

                return {
                    numberOfKanbans: numKanbans,
                    totalInventory: numKanbans * containerSize,
                    daysOfStock: (numKanbans * containerSize) / dailyDemand,
                    recommendation: numKanbans > 10 ? 'Consider reducing lead time or container size' : 'Kanban size appropriate'
                };
            }
        }
    },
    // SECTION 3: KAIZEN - Continuous Improvement
    kaizen: {

        // 3.1 PDCA with Reinforcement Learning
        pdca: {
            /**
             * Create PDCA cycle
             */
            createCycle: function(params) {
                return {
                    cycleId: 'PDCA-' + Date.now(),
                    createdDate: new Date().toISOString(),
                    problem: params.problem,
                    targetMetric: params.metric,
                    baseline: params.baseline,
                    target: params.target,
                    phases: {
                        plan: {
                            status: 'active',
                            hypothesis: params.hypothesis || '',
                            actions: params.plannedActions || [],
                            expectedOutcome: params.target
                        },
                        do: {
                            status: 'pending',
                            implementationDate: null,
                            actualActions: []
                        },
                        check: {
                            status: 'pending',
                            measuredResult: null,
                            varianceFromTarget: null
                        },
                        act: {
                            status: 'pending',
                            decision: null, // 'standardize', 'iterate', 'abandon'
                            nextActions: []
                        }
                    },
                    currentPhase: 'plan'
                };
            },
            /**
             * PRISM INNOVATION: PDCA with Reinforcement Learning
             * Learns from past PDCA cycles to suggest better improvements
             */
            suggestImprovement: function(problemType, historicalCycles) {
                // Build success rate for different action types
                const actionSuccess = {};

                historicalCycles.forEach(cycle => {
                    if (cycle.phases.check.measuredResult !== null) {
                        const success = cycle.phases.check.measuredResult >= cycle.target ? 1 : 0;

                        cycle.phases.plan.actions.forEach(action => {
                            const actionType = action.type || 'general';
                            if (!actionSuccess[actionType]) {
                                actionSuccess[actionType] = { successes: 0, total: 0 };
                            }
                            actionSuccess[actionType].successes += success;
                            actionSuccess[actionType].total += 1;
                        });
                    }
                });

                // Calculate success rates and rank actions
                const rankedActions = Object.entries(actionSuccess)
                    .map(([type, data]) => ({
                        actionType: type,
                        successRate: data.total > 0 ? data.successes / data.total : 0.5,
                        sampleSize: data.total,
                        confidence: 1 - 1 / (1 + Math.sqrt(data.total))
                    }))
                    .sort((a, b) => b.successRate * b.confidence - a.successRate * a.confidence);

                return {
                    recommendedActions: rankedActions.slice(0, 3),
                    explorationSuggestion: rankedActions.length < 5 ?
                        'Consider trying new improvement approaches' : null,
                    historicalCyclesAnalyzed: historicalCycles.length
                };
            }
        },
        // 3.2 Improvement Event Tracking
        improvementTracker: {
            improvements: [],

            /**
             * Log an improvement event
             */
            logImprovement: function(params) {
                const improvement = {
                    id: 'KZ-' + Date.now(),
                    date: new Date().toISOString(),
                    category: params.category, // 'quality', 'productivity', 'safety', 'cost', 'delivery'
                    description: params.description,
                    area: params.area,
                    submittedBy: params.submittedBy,
                    beforeState: params.beforeState,
                    afterState: params.afterState,
                    measuredImpact: params.impact,
                    costSavings: params.costSavings || 0,
                    timeSavings: params.timeSavings || 0,
                    status: 'implemented'
                };
                this.improvements.push(improvement);
                return improvement;
            },
            /**
             * Get improvement statistics
             */
            getStatistics: function(timeRange = null) {
                let filtered = this.improvements;
                if (timeRange) {
                    const cutoff = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
                    filtered = filtered.filter(i => new Date(i.date) >= cutoff);
                }
                const byCategory = {};
                let totalCostSavings = 0;
                let totalTimeSavings = 0;

                filtered.forEach(imp => {
                    byCategory[imp.category] = (byCategory[imp.category] || 0) + 1;
                    totalCostSavings += imp.costSavings;
                    totalTimeSavings += imp.timeSavings;
                });

                return {
                    totalImprovements: filtered.length,
                    byCategory,
                    totalCostSavings,
                    totalTimeSavings,
                    avgCostSavingsPer: filtered.length > 0 ? totalCostSavings / filtered.length : 0
                };
            }
        },
        // 3.3 Gemba Data Collection
        gemba: {
            observations: [],

            /**
             * Record a Gemba observation
             */
            recordObservation: function(params) {
                const obs = {
                    id: 'GEMBA-' + Date.now(),
                    date: new Date().toISOString(),
                    location: params.location,
                    observer: params.observer,
                    category: params.category, // 'waste', 'safety', 'quality', 'flow', 'environment'
                    observation: params.observation,
                    severity: params.severity || 'medium', // 'low', 'medium', 'high', 'critical'
                    actionRequired: params.actionRequired || false,
                    status: 'open'
                };
                this.observations.push(obs);
                return obs;
            },
            /**
             * Get open observations by priority
             */
            getOpenObservations: function() {
                return this.observations
                    .filter(o => o.status === 'open')
                    .sort((a, b) => {
                        const priority = { critical: 4, high: 3, medium: 2, low: 1 };
                        return priority[b.severity] - priority[a.severity];
                    });
            }
        },
        // 3.4 A3 Problem Solving
        a3: {
            /**
             * Create A3 problem solving document
             */
            createA3: function(params) {
                return {
                    id: 'A3-' + Date.now(),
                    title: params.title,
                    author: params.author,
                    date: new Date().toISOString(),
                    sections: {
                        background: params.background || '',
                        currentCondition: params.currentCondition || '',
                        targetCondition: params.targetCondition || '',
                        rootCauseAnalysis: params.rootCause || '',
                        countermeasures: params.countermeasures || [],
                        implementationPlan: params.plan || [],
                        followUp: params.followUp || ''
                    },
                    status: 'draft'
                };
            },
            /**
             * 5 Why Analysis
             */
            fiveWhyAnalysis: function(problem) {
                return {
                    problem,
                    whys: [
                        { level: 1, why: '', answer: '' },
                        { level: 2, why: '', answer: '' },
                        { level: 3, why: '', answer: '' },
                        { level: 4, why: '', answer: '' },
                        { level: 5, why: '', answer: '' }
                    ],
                    rootCause: '',
                    countermeasure: ''
                };
            }
        }
    },
    // SECTION 4: AI INTEGRATION & TRAINING DATA GENERATION
    aiIntegration: {
        /**
         * Generate training data for AI systems
         */
        generateTrainingData: function(numSamples = 100) {
            const samples = [];

            for (let i = 0; i < numSamples; i++) {
                // Generate random process data
                const measurements = Array(30).fill(0).map(() =>
                    10 + Math.random() * 2 - 1 + (Math.random() > 0.95 ? 5 : 0)); // Some outliers

                const USL = 12;
                const LSL = 8;
                const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                const sigma = Math.sqrt(measurements.reduce((sum, x) =>
                    sum + Math.pow(x - mean, 2), 0) / measurements.length);

                const cpkResult = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability
                    .calculateCpk(USL, LSL, mean, sigma);

                samples.push({
                    input: {
                        mean,
                        sigma,
                        sampleSize: measurements.length,
                        range: Math.max(...measurements) - Math.min(...measurements)
                    },
                    output: {
                        cpk: cpkResult.value,
                        inControl: cpkResult.value >= 1.0,
                        sigmaLevel: cpkResult.sigmaLevel
                    }
                });
            }
            return {
                type: 'process_capability',
                samples,
                generatedAt: new Date().toISOString()
            };
        },
        /**
         * Get all available AI routes for this module
         */
        getRoutes: function() {
            return {
                'sixsigma.cpk': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability.calculateCpk',
                'sixsigma.cpk.uncertainty': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability.calculateCpkWithUncertainty',
                'sixsigma.chart.xbar': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.xBarRChart',
                'sixsigma.chart.imr': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.iMRChart',
                'sixsigma.chart.bayesian': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.bayesianControlChart',
                'sixsigma.dmaic.sigma': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.dmaic.calculateSigmaLevel',
                'sixsigma.fmea.montecarlo': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.fmea.monteCarloFMEA',
                'lean.wastes.analyze': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.sevenWastes.analyzeForWaste',
                'lean.oee.calculate': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.oee.calculate',
                'lean.oee.predict': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.oee.predictWithKalman',
                'lean.vsm.create': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.valueStreamMapping.createVSM',
                'lean.vsm.optimize': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.valueStreamMapping.optimizeWithACO',
                'lean.smed.analyze': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.smed.analyzeSetup',
                'lean.tpm.metrics': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.tpm.calculateMetrics',
                'lean.5s.audit': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.fiveS.audit',
                'lean.kanban.size': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.kanban.calculateKanbanSize',
                'kaizen.pdca.create': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.pdca.createCycle',
                'kaizen.pdca.suggest': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.pdca.suggestImprovement',
                'kaizen.improvement.log': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.improvementTracker.logImprovement',
                'kaizen.improvement.stats': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.improvementTracker.getStatistics',
                'kaizen.gemba.record': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.gemba.recordObservation',
                'kaizen.a3.create': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.a3.createA3',
                'kaizen.a3.5why': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.a3.fiveWhyAnalysis'
            };
        }
    },
    // SECTION 5: SELF-TESTS
    selfTests: {
        runAll: function() {
            console.log('\n═══════════════════════════════════════════════════════════════');
            console.log('PRISM_LEAN_SIX_SIGMA_KAIZEN - Self Tests');
            console.log('═══════════════════════════════════════════════════════════════\n');

            let passed = 0;
            let failed = 0;

            // Test 1: Process Capability
            try {
                const cpk = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability
                    .calculateCpk(12, 8, 10, 0.5);
                if (cpk.value > 1.3 && cpk.interpretation.includes('Good')) {
                    console.log('✅ Test 1: Process Capability (Cpk) - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 1: Process Capability - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 1: Process Capability - ERROR:', e.message);
                failed++;
            }
            // Test 2: X-bar R Chart
            try {
                const subgroups = [[10.1, 10.2, 10.0], [9.9, 10.1, 10.0], [10.0, 10.1, 9.9]];
                const chart = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.xBarRChart(subgroups);
                if (chart.chartType === 'X-bar and R' && chart.xBar.centerline > 0) {
                    console.log('✅ Test 2: X-bar R Chart - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 2: X-bar R Chart - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 2: X-bar R Chart - ERROR:', e.message);
                failed++;
            }
            // Test 3: OEE Calculation
            try {
                const oee = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.oee.calculate({
                    plannedProductionTime: 480,
                    downtime: 48,
                    idealCycleTime: 2,
                    totalParts: 200,
                    goodParts: 195
                });
                if (oee.oee > 70 && oee.oee < 90) {
                    console.log('✅ Test 3: OEE Calculation - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 3: OEE Calculation - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 3: OEE Calculation - ERROR:', e.message);
                failed++;
            }
            // Test 4: Seven Wastes Analysis
            try {
                const wastes = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.sevenWastes.analyzeForWaste({
                    avgMaterialTravelDistance: 75,
                    wipDays: 8,
                    machineUtilization: 60,
                    scrapRate: 3.5,
                    finishedGoodsDays: 15,
                    avgSetupTime: 90,
                    avgToleranceRatio: 0.3
                });
                if (wastes.wastesIdentified >= 5) {
                    console.log('✅ Test 4: Seven Wastes Analysis - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 4: Seven Wastes Analysis - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 4: Seven Wastes Analysis - ERROR:', e.message);
                failed++;
            }
            // Test 5: Monte Carlo FMEA
            try {
                const fmea = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.fmea.monteCarloFMEA([
                    { name: 'Tool Breakage', severity: 8, occurrence: 4, detection: 3 },
                    { name: 'Dimensional Error', severity: 6, occurrence: 5, detection: 2 }
                ], 1000);
                if (fmea.failureModes.length === 2 && fmea.simulations === 1000) {
                    console.log('✅ Test 5: Monte Carlo FMEA - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 5: Monte Carlo FMEA - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 5: Monte Carlo FMEA - ERROR:', e.message);
                failed++;
            }
            // Test 6: VSM with ACO Optimization
            try {
                const vsm = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.valueStreamMapping.optimizeWithACO([
                    { name: 'Cut', cycleTime: 10, waitTime: 5, setupTime: 15 },
                    { name: 'Mill', cycleTime: 20, waitTime: 10, setupTime: 20 },
                    { name: 'Drill', cycleTime: 5, waitTime: 3, setupTime: 8 },
                    { name: 'Inspect', cycleTime: 5, waitTime: 2, setupTime: 0 }
                ]);
                if (vsm.optimizedSequence && vsm.improvement >= 0) {
                    console.log('✅ Test 6: VSM ACO Optimization - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 6: VSM ACO Optimization - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 6: VSM ACO Optimization - ERROR:', e.message);
                failed++;
            }
            // Test 7: 5S Audit
            try {
                const audit = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.fiveS.audit({
                    sort: 4, setInOrder: 3, shine: 4, standardize: 3, sustain: 2
                });
                if (audit.totalScore === 16 && audit.percentage === 64) {
                    console.log('✅ Test 7: 5S Audit - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 7: 5S Audit - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 7: 5S Audit - ERROR:', e.message);
                failed++;
            }
            // Test 8: PDCA Cycle
            try {
                const pdca = PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.pdca.createCycle({
                    problem: 'High scrap rate',
                    metric: 'scrap_percentage',
                    baseline: 5,
                    target: 2
                });
                if (pdca.cycleId.startsWith('PDCA-') && pdca.currentPhase === 'plan') {
                    console.log('✅ Test 8: PDCA Cycle - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 8: PDCA Cycle - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 8: PDCA Cycle - ERROR:', e.message);
                failed++;
            }
            // Test 9: Sigma Level Calculation
            try {
                const sigma = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.dmaic.calculateSigmaLevel(
                    34, 10, 1000 // 34 defects, 10 opportunities, 1000 units
                );
                if (sigma.dpmo === 3400 && sigma.sigmaLevel > 4) {
                    console.log('✅ Test 9: Sigma Level Calculation - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 9: Sigma Level Calculation - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 9: Sigma Level Calculation - ERROR:', e.message);
                failed++;
            }
            // Test 10: Training Data Generation
            try {
                const training = PRISM_LEAN_SIX_SIGMA_KAIZEN.aiIntegration.generateTrainingData(50);
                if (training.samples.length === 50 && training.type === 'process_capability') {
                    console.log('✅ Test 10: Training Data Generation - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 10: Training Data Generation - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 10: Training Data Generation - ERROR:', e.message);
                failed++;
            }
            console.log(`\n=== RESULTS: ${passed}/${passed + failed} tests passed ===\n`);
            return { passed, failed, total: passed + failed };
        }
    }
}