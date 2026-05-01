const PRISM_ADAPTIVE_SPC = {
    name: 'Adaptive Quality Control',
    sources: ['MIT 2.830', 'Stanford CS229'],
    patentClaim: 'Bayesian statistical process control with adaptive control limits',
    
    /**
     * Create adaptive SPC system
     */
    createSystem: function(config = {}) {
        const {
            initialMean = 0,
            initialStd = 1,
            targetCpk = 1.33,
            learningRate = 0.1
        } = config;
        
        return {
            // Bayesian parameters
            priorMean: initialMean,
            priorStd: initialStd,
            posteriorMean: initialMean,
            posteriorStd: initialStd,
            
            // Control limits
            ucl: initialMean + 3 * initialStd,
            lcl: initialMean - 3 * initialStd,
            
            // Process capability
            targetCpk: targetCpk,
            currentCpk: null,
            
            // History
            measurements: [],
            violations: [],
            
            // Learning
            learningRate: learningRate
        };
    },
    
    /**
     * Add measurement and update control
     */
    addMeasurement: function(system, value, spec = null) {
        system.measurements.push({ value, timestamp: Date.now() });
        
        // Bayesian update
        const n = system.measurements.length;
        const sampleMean = system.measurements.reduce((s, m) => s + m.value, 0) / n;
        
        const priorPrec = 1 / (system.priorStd * system.priorStd);
        const dataPrec = n / (system.posteriorStd * system.posteriorStd);
        
        const postPrec = priorPrec + dataPrec;
        system.posteriorMean = (priorPrec * system.priorMean + dataPrec * sampleMean) / postPrec;
        system.posteriorStd = Math.sqrt(1 / postPrec);
        
        // Update control limits adaptively
        if (n > 20) {
            const recentMean = this._recentMean(system, 20);
            const recentStd = this._recentStd(system, 20);
            
            // Blend old and new limits
            system.ucl = (1 - system.learningRate) * system.ucl + 
                        system.learningRate * (recentMean + 3 * recentStd);
            system.lcl = (1 - system.learningRate) * system.lcl + 
                        system.learningRate * (recentMean - 3 * recentStd);
        }
        
        // Check for violation
        const violation = value > system.ucl || value < system.lcl;
        if (violation) {
            system.violations.push({
                value,
                timestamp: Date.now(),
                type: value > system.ucl ? 'UCL' : 'LCL'
            });
        }
        
        // Calculate process capability if spec provided
        if (spec) {
            system.currentCpk = this._calculateCpk(system, spec);
        }
        
        return {
            inControl: !violation,
            currentValue: value,
            ucl: system.ucl,
            lcl: system.lcl,
            mean: system.posteriorMean,
            cpk: system.currentCpk,
            alert: this._getAlert(system, violation)
        };
    },
    
    /**
     * Detect patterns (trends, runs, cycles)
     */
    detectPatterns: function(system) {
        if (system.measurements.length < 8) {
            return { patterns: [], confidence: 0 };
        }
        
        const recent = system.measurements.slice(-20).map(m => m.value);
        const patterns = [];
        
        // Trend detection
        const trend = this._detectTrend(recent);
        if (trend.detected) {
            patterns.push({ type: 'TREND', direction: trend.direction, confidence: trend.confidence });
        }
        
        // Run detection (7 points same side of mean)
        const run = this._detectRun(recent, system.posteriorMean);
        if (run.detected) {
            patterns.push({ type: 'RUN', side: run.side, length: run.length, confidence: 0.95 });
        }
        
        // Cycle detection
        const cycle = this._detectCycle(recent);
        if (cycle.detected) {
            patterns.push({ type: 'CYCLE', period: cycle.period, confidence: cycle.confidence });
        }
        
        return {
            patterns,
            recommendation: patterns.length > 0 ? 'INVESTIGATE_ASSIGNABLE_CAUSE' : 'PROCESS_STABLE'
        };
    },
    
    _recentMean: function(system, n) {
        const recent = system.measurements.slice(-n);
        return recent.reduce((s, m) => s + m.value, 0) / recent.length;
    },
    
    _recentStd: function(system, n) {
        const recent = system.measurements.slice(-n);
        const mean = this._recentMean(system, n);
        const variance = recent.reduce((s, m) => s + Math.pow(m.value - mean, 2), 0) / (recent.length - 1);
        return Math.sqrt(variance);
    },
    
    _calculateCpk: function(system, spec) {
        const { usl, lsl } = spec;
        const mean = system.posteriorMean;
        const std = this._recentStd(system, Math.min(30, system.measurements.length));
        
        const cpu = (usl - mean) / (3 * std);
        const cpl = (mean - lsl) / (3 * std);
        
        return Math.min(cpu, cpl);
    },
    
    _getAlert: function(system, violation) {
        if (violation) {
            return { level: 'HIGH', message: 'Control limit violation detected' };
        }
        if (system.currentCpk && system.currentCpk < system.targetCpk) {
            return { level: 'MEDIUM', message: 'Process capability below target' };
        }
        if (system.violations.length > 3) {
            return { level: 'LOW', message: 'Multiple recent violations' };
        }
        return { level: 'NONE', message: 'Process stable' };
    },
    
    _detectTrend: function(data) {
        let increasing = 0;
        let decreasing = 0;
        
        for (let i = 1; i < data.length; i++) {
            if (data[i] > data[i - 1]) increasing++;
            else if (data[i] < data[i - 1]) decreasing++;
        }
        
        const total = data.length - 1;
        if (increasing / total > 0.7) {
            return { detected: true, direction: 'UP', confidence: increasing / total };
        }
        if (decreasing / total > 0.7) {
            return { detected: true, direction: 'DOWN', confidence: decreasing / total };
        }
        return { detected: false };
    },
    
    _detectRun: function(data, mean) {
        let aboveCount = 0;
        let belowCount = 0;
        
        for (const val of data) {
            if (val > mean) {
                aboveCount++;
                belowCount = 0;
            } else {
                belowCount++;
                aboveCount = 0;
            }
            
            if (aboveCount >= 7) return { detected: true, side: 'ABOVE', length: aboveCount };
            if (belowCount >= 7) return { detected: true, side: 'BELOW', length: belowCount };
        }
        
        return { detected: false };
    },
    
    _detectCycle: function(data) {
        // Simplified autocorrelation check
        if (data.length < 10) return { detected: false };
        
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const centered = data.map(v => v - mean);
        
        for (let lag = 2; lag < data.length / 2; lag++) {
            let corr = 0;
            for (let i = 0; i < data.length - lag; i++) {
                corr += centered[i] * centered[i + lag];
            }
            corr /= (data.length - lag);
            
            if (corr > 0.5) {
                return { detected: true, period: lag, confidence: corr };
            }
        }
        
        return { detected: false };
    }
}