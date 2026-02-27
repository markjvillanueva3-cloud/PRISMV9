/**
 * PRISM_ROBUST_OPTIMIZATION
 * Extracted from PRISM v8.89.002 monolith
 * References: 11
 * Lines: 249
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_ROBUST_OPTIMIZATION = {
    name: 'PRISM_ROBUST_OPTIMIZATION',
    version: '1.0.0',
    source: 'MIT 15.099 - Robust Optimization',
    
    /**
     * Robust Optimization with Uncertainty Sets
     * Find solution that performs well under worst-case uncertainty
     */
    robustOptimization: function(config) {
        const {
            objective,       // (x, scenario) => value
            bounds,          // [{min, max}]
            uncertainParams, // [{nominal, min, max}]
            uncertaintyBudget = 1.0, // Γ - how many params can deviate
            numScenarios = 100,
            method = 'worstCase' // 'worstCase', 'expected', 'cvar'
        } = config;
        
        // Generate scenarios
        const scenarios = this.generateScenarios({
            params: uncertainParams,
            numScenarios,
            budget: uncertaintyBudget
        });
        
        if (method === 'worstCase') {
            // Minimize worst-case cost
            const robustObjective = (x) => {
                let worstCase = -Infinity;
                for (const scenario of scenarios) {
                    const value = objective(x, scenario);
                    if (value > worstCase) worstCase = value;
                }
                return worstCase;
            };
            
            return this._optimizeRobust(robustObjective, bounds);
            
        } else if (method === 'expected') {
            // Minimize expected cost
            const expectedObjective = (x) => {
                let sum = 0;
                for (const scenario of scenarios) {
                    sum += objective(x, scenario);
                }
                return sum / scenarios.length;
            };
            
            return this._optimizeRobust(expectedObjective, bounds);
            
        } else if (method === 'cvar') {
            // Minimize Conditional Value at Risk (CVaR)
            const alpha = 0.95; // 95% confidence
            
            const cvarObjective = (x) => {
                const costs = scenarios.map(s => objective(x, s)).sort((a, b) => b - a);
                const numWorst = Math.ceil((1 - alpha) * costs.length);
                return costs.slice(0, numWorst).reduce((a, b) => a + b, 0) / numWorst;
            };
            
            return this._optimizeRobust(cvarObjective, bounds);
        }
    },
    
    /**
     * Generate uncertainty scenarios
     */
    generateScenarios: function(config) {
        const {
            params,         // [{nominal, min, max}]
            numScenarios,
            budget = Infinity,
            method = 'uniform' // 'uniform', 'latin', 'sobol'
        } = config;
        
        const scenarios = [];
        const k = params.length;
        
        if (method === 'latin') {
            // Latin Hypercube Sampling
            const intervals = params.map(() => {
                const cuts = [];
                for (let i = 0; i < numScenarios; i++) {
                    cuts.push(i);
                }
                // Shuffle
                for (let i = cuts.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [cuts[i], cuts[j]] = [cuts[j], cuts[i]];
                }
                return cuts;
            });
            
            for (let i = 0; i < numScenarios; i++) {
                const scenario = {};
                let deviationSum = 0;
                
                for (let j = 0; j < k; j++) {
                    const p = params[j];
                    const interval = intervals[j][i];
                    const u = (interval + Math.random()) / numScenarios;
                    const value = p.min + u * (p.max - p.min);
                    scenario[j] = value;
                    scenario[`param${j}`] = value;
                    
                    const deviation = Math.abs(value - p.nominal) / ((p.max - p.min) / 2);
                    deviationSum += deviation;
                }
                
                // Enforce budget constraint
                if (deviationSum <= budget) {
                    scenarios.push(scenario);
                }
            }
            
        } else {
            // Uniform random
            for (let i = 0; i < numScenarios; i++) {
                const scenario = {};
                let deviationSum = 0;
                
                for (let j = 0; j < k; j++) {
                    const p = params[j];
                    const value = p.min + Math.random() * (p.max - p.min);
                    scenario[j] = value;
                    scenario[`param${j}`] = value;
                    
                    const deviation = Math.abs(value - p.nominal) / ((p.max - p.min) / 2);
                    deviationSum += deviation;
                }
                
                if (budget === Infinity || deviationSum <= budget) {
                    scenarios.push(scenario);
                }
            }
        }
        
        // Add nominal scenario
        const nominal = {};
        for (let j = 0; j < k; j++) {
            nominal[j] = params[j].nominal;
            nominal[`param${j}`] = params[j].nominal;
        }
        scenarios.unshift(nominal);
        
        return scenarios;
    },
    
    /**
     * Sensitivity Analysis
     * Analyze how solution changes with parameter variations
     */
    sensitivityAnalysis: function(config) {
        const {
            objective,
            optimalX,
            params,
            numSamples = 50
        } = config;
        
        const baseline = objective(optimalX, params.map(p => p.nominal));
        const sensitivities = [];
        
        for (let i = 0; i < params.length; i++) {
            const p = params[i];
            const range = p.max - p.min;
            const impacts = [];
            
            for (let j = 0; j < numSamples; j++) {
                const delta = (j / (numSamples - 1) - 0.5) * range;
                const scenario = params.map((pp, idx) => 
                    idx === i ? pp.nominal + delta : pp.nominal
                );
                
                const value = objective(optimalX, scenario);
                impacts.push({
                    paramValue: p.nominal + delta,
                    objectiveValue: value,
                    change: value - baseline
                });
            }
            
            // Compute sensitivity metrics
            const objectiveRange = Math.max(...impacts.map(x => x.objectiveValue)) - 
                                  Math.min(...impacts.map(x => x.objectiveValue));
            
            sensitivities.push({
                paramIndex: i,
                paramName: p.name || `param${i}`,
                nominalValue: p.nominal,
                objectiveRange,
                sensitivity: objectiveRange / range, // Normalized sensitivity
                impacts
            });
        }
        
        // Sort by sensitivity
        sensitivities.sort((a, b) => b.sensitivity - a.sensitivity);
        
        return {
            baseline,
            sensitivities,
            mostSensitive: sensitivities[0]?.paramName,
            leastSensitive: sensitivities[sensitivities.length - 1]?.paramName
        };
    },
    
    _optimizeRobust: function(objective, bounds) {
        const n = bounds.length;
        let x = bounds.map(b => (b.min + b.max) / 2);
        let bestX = [...x];
        let bestValue = objective(x);
        
        const maxIter = 500;
        const lr = 0.05;
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Numerical gradient
            const grad = [];
            const fx = objective(x);
            
            for (let i = 0; i < n; i++) {
                const h = (bounds[i].max - bounds[i].min) * 0.001;
                const xh = [...x];
                xh[i] += h;
                grad[i] = (objective(xh) - fx) / h;
            }
            
            // Update
            for (let i = 0; i < n; i++) {
                x[i] -= lr * grad[i];
                x[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, x[i]));
            }
            
            const value = objective(x);
            if (value < bestValue) {
                bestValue = value;
                bestX = [...x];
            }
        }
        
        return {
            x: bestX,
            value: bestValue,
            method: 'robust_gradient'
        };
    }
}