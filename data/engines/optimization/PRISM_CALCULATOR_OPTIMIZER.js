/**
 * PRISM_CALCULATOR_OPTIMIZER
 * Extracted from PRISM v8.89.002 monolith
 * References: 23
 * Lines: 140
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_CALCULATOR_OPTIMIZER = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_OPTIMIZER',
    
    config: { swarmSize: 30, maxIterations: 100, w: 0.7, c1: 1.5, c2: 1.5, wDecay: 0.99, velClamp: 0.2 },
    
    optimize: function(params) {
        const { material, tool, machine, constraints = {}, objective = 'balanced', returnParetoFront = false } = params;
        const bounds = this._calculateBounds(material, tool, machine, constraints);
        const weights = this._getWeights(objective);
        const swarm = this._initSwarm(bounds);
        
        let globalBest = null, globalBestFitness = -Infinity, paretoFront = [];
        let w = this.config.w;
        
        for (let iter = 0; iter < this.config.maxIterations; iter++) {
            for (const p of swarm) {
                const fitness = this._evaluate(p.position, material, tool, machine, weights);
                p.fitness = fitness.combined; p.objectives = fitness.objectives;
                if (fitness.combined > p.bestFitness) { p.bestFitness = fitness.combined; p.bestPosition = [...p.position]; }
                if (fitness.combined > globalBestFitness) { globalBestFitness = fitness.combined; globalBest = { position: [...p.position], fitness: fitness.combined, objectives: fitness.objectives }; }
                if (returnParetoFront) this._updatePareto(paretoFront, p);
            }
            
            for (const p of swarm) {
                for (let d = 0; d < p.velocity.length; d++) {
                    p.velocity[d] = w * p.velocity[d] + this.config.c1 * Math.random() * (p.bestPosition[d] - p.position[d]) + this.config.c2 * Math.random() * (globalBest.position[d] - p.position[d]);
                    const range = bounds[d].max - bounds[d].min, maxVel = range * this.config.velClamp;
                    p.velocity[d] = Math.max(-maxVel, Math.min(maxVel, p.velocity[d]));
                    p.position[d] = Math.max(bounds[d].min, Math.min(bounds[d].max, p.position[d] + p.velocity[d]));
                }
            }
            w *= this.config.wDecay;
        }
        
        const optimized = this._toParams(globalBest.position, bounds);
        const result = { optimized, metrics: this._metrics(optimized, tool), objectives: globalBest.objectives, fitness: globalBestFitness, goal: objective };
        if (returnParetoFront) result.paretoFront = paretoFront.map(p => ({ params: this._toParams(p.position, bounds), objectives: p.objectives }));
        return result;
    },
    
    multiObjectiveOptimize: function(params) { return this.optimize({ ...params, returnParetoFront: true }); },
    
    quickOptimize: function(params) {
        const saved = { ...this.config };
        this.config.swarmSize = 15; this.config.maxIterations = 30;
        const result = this.optimize(params);
        this.config = saved;
        return result;
    },
    
    _calculateBounds: function(material, tool, machine, constraints) {
        let speedMin = 100, speedMax = 15000, feedMin = 0.001, feedMax = 0.5, docMin = 0.01, docMax = 10, wocMin = 0.01, wocMax = 50;
        if (tool) {
            const d = tool.diameter || 12;
            speedMax = Math.min(speedMax, 300 * 1000 / (Math.PI * d));
            wocMax = Math.min(wocMax, d * 0.8); docMax = Math.min(docMax, d * 2);
        }
        if (machine?.maxRPM) speedMax = Math.min(speedMax, machine.maxRPM);
        if (constraints.speedMin) speedMin = Math.max(speedMin, constraints.speedMin);
        if (constraints.speedMax) speedMax = Math.min(speedMax, constraints.speedMax);
        return [{ name: 'speed', min: speedMin, max: speedMax }, { name: 'feed', min: feedMin, max: feedMax }, { name: 'doc', min: docMin, max: docMax }, { name: 'woc', min: wocMin, max: wocMax }];
    },
    
    _getWeights: function(obj) {
        const presets = { mrr: { MRR: 0.8, TL: 0.1, SF: 0.05, COST: 0.05 }, tool_life: { MRR: 0.1, TL: 0.7, SF: 0.1, COST: 0.1 },
            finish: { MRR: 0.1, TL: 0.1, SF: 0.7, COST: 0.1 }, balanced: { MRR: 0.4, TL: 0.3, SF: 0.2, COST: 0.1 } };
        return presets[obj] || presets.balanced;
    },
    
    _initSwarm: function(bounds) {
        const swarm = [];
        for (let i = 0; i < this.config.swarmSize; i++) {
            const pos = bounds.map(b => b.min + Math.random() * (b.max - b.min));
            const vel = bounds.map(b => (Math.random() - 0.5) * (b.max - b.min) * 0.1);
            swarm.push({ position: pos, velocity: vel, bestPosition: [...pos], bestFitness: -Infinity, fitness: 0, objectives: {} });
        }
        return swarm;
    },
    
    _evaluate: function(pos, material, tool, machine, weights) {
        const [speed, feed, doc, woc] = pos;
        const flutes = tool?.flutes || 4, diameter = tool?.diameter || 12;
        const feedrate = speed * feed * flutes, mrr = feedrate * doc * woc / 1000;
        const Vc = speed * Math.PI * diameter / 1000;
        const matN = material?.taylorN || 0.25, matC = material?.taylorC || 200;
        const toolLife = matC / Math.pow(Vc, 1/matN);
        const cr = tool?.cornerRadius || 0.4, Ra = Math.max(0.2, (feed * feed * 1e6) / (32 * cr) * (1 + Vc/500));
        const toolCost = tool?.cost || 50, machCost = machine?.hourlyRate || 75;
        const costPerVol = mrr > 0 ? ((toolLife > 0 ? toolCost / toolLife : toolCost) + machCost / 60) / mrr : 999;
        
        const objectives = { MRR: Math.min(1, mrr / 100), TL: Math.min(1, toolLife / 120), SF: Math.max(0, 1 - Ra / 10), COST: Math.max(0, 1 - costPerVol / 5) };
        const combined = weights.MRR * objectives.MRR + weights.TL * objectives.TL + weights.SF * objectives.SF + weights.COST * objectives.COST;
        return { combined, objectives, raw: { mrr, toolLife, Ra, costPerVol } };
    },
    
    _updatePareto: function(front, particle) {
        const dominated = front.some(p => this._dominates(p.objectives, particle.objectives));
        if (dominated) return;
        for (let i = front.length - 1; i >= 0; i--) if (this._dominates(particle.objectives, front[i].objectives)) front.splice(i, 1);
        front.push({ position: [...particle.position], objectives: { ...particle.objectives } });
        if (front.length > 50) { front.sort((a, b) => b.objectives.MRR - a.objectives.MRR); front.splice(50); }
    },
    
    _dominates: function(o1, o2) {
        let better = false;
        for (const k of Object.keys(o1)) { if (o1[k] > o2[k]) better = true; if (o1[k] < o2[k]) return false; }
        return better;
    },
    
    _toParams: function(pos, bounds) {
        return { speed: Math.round(pos[0]), feed: Math.round(pos[1] * 10000) / 10000, doc: Math.round(pos[2] * 1000) / 1000, woc: Math.round(pos[3] * 1000) / 1000 };
    },
    
    _metrics: function(params, tool) {
        const flutes = tool?.flutes || 4, diameter = tool?.diameter || 12;
        const feedrate = params.speed * params.feed * flutes, mrr = feedrate * params.doc * params.woc / 1000;
        return { feedrate: Math.round(feedrate), mrr: Math.round(mrr * 100) / 100, surfaceSpeed: Math.round(params.speed * Math.PI * diameter / 1000 * 10) / 10 };
    },
    
    runSelfTests: function() {
        console.log('[CALCULATOR_OPTIMIZER] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.optimize({ material: { taylorN: 0.25, taylorC: 200 }, tool: { diameter: 12, flutes: 4 }, machine: { maxRPM: 10000 }, objective: 'balanced' });
            if (r.optimized.speed > 0) { results.passed++; results.tests.push({ name: 'Optimize', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Optimize', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.multiObjectiveOptimize({ material: { taylorN: 0.25 }, tool: { diameter: 12 } });
            if (r.paretoFront && r.paretoFront.length > 0) { results.passed++; results.tests.push({ name: 'Multi-objective', status: 'PASS' }); }
            else throw new Error('No Pareto');
        } catch (e) { results.failed++; results.tests.push({ name: 'Multi-objective', status: 'FAIL', error: e.message }); }
        
        console.log('[CALCULATOR_OPTIMIZER] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}