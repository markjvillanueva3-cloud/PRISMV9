/**
 * PRISM_PHASE2_QUALITY_SYSTEM
 * Extracted from PRISM v8.89.002 monolith
 * References: 20
 * Lines: 397
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_PHASE2_QUALITY_SYSTEM = {
    name: 'Phase 2 Quality System',
    version: '1.0.0',
    source: 'MIT 2.830, Georgia Tech',
    
    /**
     * Control Chart Analysis
     * Source: MIT 2.830
     */
    controlChart: function(data, options = {}) {
        const n = data.length;
        const mean = data.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1));
        
        const UCL = mean + 3 * stdDev;
        const LCL = mean - 3 * stdDev;
        const UWL = mean + 2 * stdDev; // Warning limits
        const LWL = mean - 2 * stdDev;
        
        // Check for out of control points
        const outOfControl = [];
        const warnings = [];
        
        for (let i = 0; i < n; i++) {
            if (data[i] > UCL || data[i] < LCL) {
                outOfControl.push({ index: i, value: data[i], type: 'beyond_control_limit' });
            } else if (data[i] > UWL || data[i] < LWL) {
                warnings.push({ index: i, value: data[i], type: 'warning_zone' });
            }
        }
        
        // Check for runs (7 consecutive points on one side)
        for (let i = 0; i <= n - 7; i++) {
            const run = data.slice(i, i + 7);
            if (run.every(x => x > mean) || run.every(x => x < mean)) {
                outOfControl.push({ index: i, type: 'run_of_7' });
            }
        }
        
        // Check for trends (7 consecutive increasing or decreasing)
        for (let i = 0; i <= n - 7; i++) {
            let increasing = true, decreasing = true;
            for (let j = 1; j < 7; j++) {
                if (data[i + j] <= data[i + j - 1]) increasing = false;
                if (data[i + j] >= data[i + j - 1]) decreasing = false;
            }
            if (increasing || decreasing) {
                outOfControl.push({ index: i, type: 'trend' });
            }
        }
        
        return {
            mean,
            stdDev,
            UCL,
            LCL,
            UWL,
            LWL,
            inControl: outOfControl.length === 0,
            outOfControl,
            warnings,
            source: 'MIT 2.830 - Control Chart'
        };
    },
    
    /**
     * X-bar and R Chart
     * Source: MIT 2.830
     */
    xBarRChart: function(subgroups) {
        const k = subgroups.length;
        const n = subgroups[0].length;
        
        // Calculate subgroup means and ranges
        const xBars = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
        const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));
        
        // Grand mean and average range
        const xBarBar = xBars.reduce((a, b) => a + b, 0) / k;
        const rBar = ranges.reduce((a, b) => a + b, 0) / k;
        
        // Control chart constants (for sample size 2-10)
        const A2 = [0, 0, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308];
        const D3 = [0, 0, 0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223];
        const D4 = [0, 0, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777];
        
        // X-bar chart limits
        const xBarUCL = xBarBar + A2[n] * rBar;
        const xBarLCL = xBarBar - A2[n] * rBar;
        
        // R chart limits
        const rUCL = D4[n] * rBar;
        const rLCL = D3[n] * rBar;
        
        return {
            xBarBar,
            rBar,
            xBarChart: {
                centerLine: xBarBar,
                UCL: xBarUCL,
                LCL: xBarLCL,
                values: xBars
            },
            rChart: {
                centerLine: rBar,
                UCL: rUCL,
                LCL: rLCL,
                values: ranges
            },
            source: 'MIT 2.830 - X-bar R Chart'
        };
    },
    
    /**
     * CUSUM Chart
     * Source: MIT 2.830
     */
    cusumChart: function(data, target, options = {}) {
        const config = {
            k: options.k || 0.5,    // Slack value
            h: options.h || 5       // Decision interval
        };
        
        const n = data.length;
        const sigma = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - target, 2), 0) / (n - 1));
        
        const cusumHigh = [0];
        const cusumLow = [0];
        const outOfControl = [];
        
        for (let i = 0; i < n; i++) {
            const z = (data[i] - target) / sigma;
            
            cusumHigh.push(Math.max(0, cusumHigh[i] + z - config.k));
            cusumLow.push(Math.min(0, cusumLow[i] + z + config.k));
            
            if (cusumHigh[i + 1] > config.h) {
                outOfControl.push({ index: i, type: 'high', value: cusumHigh[i + 1] });
            }
            if (cusumLow[i + 1] < -config.h) {
                outOfControl.push({ index: i, type: 'low', value: cusumLow[i + 1] });
            }
        }
        
        return {
            cusumHigh: cusumHigh.slice(1),
            cusumLow: cusumLow.slice(1),
            h: config.h,
            outOfControl,
            inControl: outOfControl.length === 0,
            source: 'MIT 2.830 - CUSUM Chart'
        };
    },
    
    /**
     * Process Capability Analysis
     * Source: MIT 2.830
     */
    processCapability: function(data, LSL, USL) {
        const n = data.length;
        const mean = data.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1));
        
        // Cp - Process capability (potential)
        const Cp = (USL - LSL) / (6 * stdDev);
        
        // Cpk - Process capability (actual, accounts for centering)
        const Cpu = (USL - mean) / (3 * stdDev);
        const Cpl = (mean - LSL) / (3 * stdDev);
        const Cpk = Math.min(Cpu, Cpl);
        
        // Pp and Ppk (using overall standard deviation)
        const Pp = Cp;  // Same for normal distribution assumption
        const Ppk = Cpk;
        
        // PPM (Parts Per Million) defective
        const zUpper = (USL - mean) / stdDev;
        const zLower = (mean - LSL) / stdDev;
        const ppmUpper = this._normalCDF(-zUpper) * 1e6;
        const ppmLower = this._normalCDF(-zLower) * 1e6;
        const ppmTotal = ppmUpper + ppmLower;
        
        // Sigma level
        const sigmaLevel = Math.min(zUpper, zLower);
        
        return {
            Cp,
            Cpk,
            Cpu,
            Cpl,
            Pp,
            Ppk,
            mean,
            stdDev,
            ppm: {
                upper: ppmUpper,
                lower: ppmLower,
                total: ppmTotal
            },
            sigmaLevel,
            capable: Cpk >= 1.33,
            interpretation: Cpk >= 1.67 ? 'Excellent' : 
                           Cpk >= 1.33 ? 'Good' : 
                           Cpk >= 1.0 ? 'Marginal' : 'Poor',
            source: 'MIT 2.830 - Process Capability'
        };
    },
    
    /**
     * Calculate Cpk
     */
    calculateCpk: function(data, LSL, USL) {
        return this.processCapability(data, LSL, USL).Cpk;
    },
    
    _normalCDF: function(z) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        
        const t = 1 / (1 + p * z);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        
        return 0.5 * (1 + sign * y);
    },
    
    /**
     * OEE (Overall Equipment Effectiveness)
     * Source: Georgia Tech
     */
    calculateOEE: function(params) {
        const {
            plannedProductionTime,
            actualRunTime,
            totalParts,
            goodParts,
            idealCycleTime
        } = params;
        
        // Availability = Actual Run Time / Planned Production Time
        const availability = actualRunTime / plannedProductionTime;
        
        // Performance = (Ideal Cycle Time × Total Parts) / Actual Run Time
        const performance = (idealCycleTime * totalParts) / actualRunTime;
        
        // Quality = Good Parts / Total Parts
        const quality = goodParts / totalParts;
        
        // OEE = Availability × Performance × Quality
        const oee = availability * performance * quality;
        
        // Six big losses
        const losses = {
            breakdowns: plannedProductionTime - actualRunTime,
            setupAdjustment: 0, // Would need additional data
            idlingMinorStops: actualRunTime - (idealCycleTime * totalParts),
            reducedSpeed: 0, // Captured in performance
            defects: (totalParts - goodParts) * idealCycleTime,
            reducedYield: 0 // Would need startup data
        };
        
        return {
            oee: oee * 100,
            availability: availability * 100,
            performance: Math.min(performance * 100, 100),
            quality: quality * 100,
            losses,
            worldClass: oee >= 0.85,
            interpretation: oee >= 0.85 ? 'World Class' :
                           oee >= 0.65 ? 'Acceptable' :
                           oee >= 0.40 ? 'Needs Improvement' : 'Unacceptable',
            source: 'Georgia Tech - OEE'
        };
    },
    
    /**
     * Six Sigma Level Calculation
     * Source: Georgia Tech
     */
    sixSigmaLevel: function(defects, opportunities, units) {
        // DPMO = (Defects / (Opportunities × Units)) × 1,000,000
        const dpmo = (defects / (opportunities * units)) * 1e6;
        
        // Sigma level from DPMO (approximation)
        let sigma = 0;
        const dpmoTable = [
            { dpmo: 3.4, sigma: 6 },
            { dpmo: 233, sigma: 5 },
            { dpmo: 6210, sigma: 4 },
            { dpmo: 66807, sigma: 3 },
            { dpmo: 308538, sigma: 2 },
            { dpmo: 691462, sigma: 1 }
        ];
        
        for (const entry of dpmoTable) {
            if (dpmo <= entry.dpmo) {
                sigma = entry.sigma;
                break;
            }
        }
        
        // More precise calculation using inverse normal
        if (sigma === 0 && dpmo > 0) {
            sigma = 0.8406 + Math.sqrt(29.37 - 2.221 * Math.log(dpmo));
        }
        
        const yield_ = (1 - dpmo / 1e6) * 100;
        
        return {
            dpmo,
            sigmaLevel: sigma,
            yield: yield_,
            defectsPerUnit: defects / units,
            interpretation: sigma >= 6 ? 'Six Sigma (World Class)' :
                           sigma >= 5 ? 'Excellent' :
                           sigma >= 4 ? 'Good' :
                           sigma >= 3 ? 'Average' : 'Poor',
            source: 'Georgia Tech - Six Sigma'
        };
    },
    
    /**
     * Pareto Analysis
     * Source: Georgia Tech
     */
    paretoAnalysis: function(categories) {
        // categories: [{name, count}, ...]
        const total = categories.reduce((sum, c) => sum + c.count, 0);
        
        // Sort by count descending
        const sorted = [...categories].sort((a, b) => b.count - a.count);
        
        // Calculate percentages and cumulative
        let cumulative = 0;
        const analysis = sorted.map(c => {
            const percentage = (c.count / total) * 100;
            cumulative += percentage;
            return {
                ...c,
                percentage,
                cumulative
            };
        });
        
        // Find vital few (80/20 rule)
        const vitalFew = analysis.filter(c => c.cumulative <= 80);
        const trivialMany = analysis.filter(c => c.cumulative > 80);
        
        return {
            analysis,
            vitalFew,
            trivialMany,
            total,
            recommendation: `Focus on ${vitalFew.length} categories to address ${Math.round(vitalFew[vitalFew.length - 1]?.cumulative || 0)}% of issues`,
            source: 'Georgia Tech - Pareto Analysis'
        };
    },
    
    /**
     * FMEA Analysis
     * Source: Georgia Tech
     */
    fmeaAnalysis: function(failures) {
        // failures: [{mode, severity, occurrence, detection}, ...]
        
        const analyzed = failures.map(f => ({
            ...f,
            rpn: f.severity * f.occurrence * f.detection // Risk Priority Number
        }));
        
        // Sort by RPN descending
        analyzed.sort((a, b) => b.rpn - a.rpn);
        
        // Risk levels
        const withRisk = analyzed.map(f => ({
            ...f,
            riskLevel: f.rpn >= 200 ? 'High' :
                       f.rpn >= 100 ? 'Medium' : 'Low',
            action: f.rpn >= 200 ? 'Immediate action required' :
                    f.rpn >= 100 ? 'Action recommended' : 'Monitor'
        }));
        
        return {
            failures: withRisk,
            highRisk: withRisk.filter(f => f.riskLevel === 'High'),
            totalRPN: withRisk.reduce((sum, f) => sum + f.rpn, 0),
            maxRPN: Math.max(...withRisk.map(f => f.rpn)),
            source: 'Georgia Tech - FMEA'
        };
    }
}