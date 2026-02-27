/**
 * PRISM_CALCULATOR_CHATTER_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 24
 * Lines: 126
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_CALCULATOR_CHATTER_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_CHATTER_ENGINE',
    
    analyzeStability: function(params) {
        const { speed, doc, tool, machine, material } = params;
        const dynamics = this._getDynamics(tool, machine);
        const flutes = tool?.flutes || 4;
        const toothPassFreq = speed * flutes / 60;
        const blim = this._calcCriticalDepth(speed, dynamics, material, flutes);
        const stable = doc < blim, margin = blim / doc;
        const risk = this._calcRisk(doc, blim);
        
        return { stable, chatterRisk: risk.level, chatterProbability: risk.probability,
            toothPassingFrequency: toothPassFreq, naturalFrequency: dynamics.fn,
            stabilityMargin: Math.max(0, margin - 1), criticalDepth: blim,
            recommendations: this._getRecommendations(stable, risk, blim, doc),
            nearestStablePocket: this._findStablePocket(speed, doc, dynamics, material, flutes) };
    },
    
    generateSLD: function(params) {
        const { tool, machine, material, speedRange = { min: 1000, max: 15000, points: 100 } } = params;
        const dynamics = this._getDynamics(tool, machine), flutes = tool?.flutes || 4;
        const sld = { speeds: [], lobes: [], criticalDepths: [], metadata: { naturalFrequency: dynamics.fn, damping: dynamics.zeta, flutes } };
        
        const dSpeed = (speedRange.max - speedRange.min) / speedRange.points;
        for (let i = 0; i <= speedRange.points; i++) {
            const rpm = speedRange.min + i * dSpeed;
            sld.speeds.push(rpm);
            sld.criticalDepths.push(this._calcCriticalDepth(rpm, dynamics, material, flutes));
        }
        
        sld.stablePockets = this._identifyPockets(sld);
        return sld;
    },
    
    findStableConditions: function(params) {
        const { tool, machine, material, targetMRR } = params;
        const sld = this.generateSLD({ tool, machine, material });
        const viable = sld.stablePockets.filter(p => {
            const diameter = tool?.diameter || 12, feedrate = p.speed * 0.05 * (tool?.flutes || 4);
            return feedrate * p.maxDoc * diameter * 0.5 / 1000 >= targetMRR * 0.8;
        });
        
        if (viable.length === 0) return { found: false, message: 'No stable conditions for target MRR', alternatives: sld.stablePockets.slice(0, 3) };
        viable.sort((a, b) => (b.speed * b.maxDoc) - (a.speed * a.maxDoc));
        return { found: true, optimal: viable[0], alternatives: viable.slice(1, 4), sld };
    },
    
    _getDynamics: function(tool, machine) {
        const diameter = tool?.diameter || 12, stickout = tool?.stickout || diameter * 4;
        const fn = machine?.naturalFrequency || (3000 / (1 + stickout / 30));
        const zeta = machine?.dampingRatio || 0.03;
        const k = machine?.modalStiffness || (5e7 / (1 + stickout / 50));
        return { fn, zeta, k, omega_n: 2 * Math.PI * fn };
    },
    
    _calcCriticalDepth: function(rpm, dynamics, material, flutes) {
        const omega_t = 2 * Math.PI * rpm * flutes / 60;
        const r = omega_t / dynamics.omega_n;
        const G_real = (1 - r * r) / (Math.pow(1 - r * r, 2) + Math.pow(2 * dynamics.zeta * r, 2));
        const Kc = material?.specificCuttingForce || 2000;
        const blim = Math.abs(dynamics.k / (2 * Kc * flutes * Math.abs(G_real + 0.001)));
        return Math.max(0.1, Math.min(50, blim));
    },
    
    _calcRisk: function(doc, blim) {
        const ratio = doc / blim;
        if (ratio < 0.7) return { level: 'low', probability: 0.05 };
        if (ratio < 0.9) return { level: 'moderate', probability: 0.2 };
        if (ratio < 1.0) return { level: 'high', probability: 0.5 };
        if (ratio < 1.2) return { level: 'very_high', probability: 0.75 };
        return { level: 'certain', probability: 0.95 };
    },
    
    _getRecommendations: function(stable, risk, blim, doc) {
        const r = [];
        if (!stable) {
            r.push({ type: 'reduce_doc', message: 'Reduce DOC to below ' + blim.toFixed(2) + ' mm', priority: 'high' });
            r.push({ type: 'adjust_speed', message: 'Try different spindle speed for stable pocket', priority: 'medium' });
        } else if (risk.level === 'high') {
            r.push({ type: 'safety_margin', message: 'DOC close to stability limit', priority: 'medium' });
        }
        return r;
    },
    
    _findStablePocket: function(speed, doc, dynamics, material, flutes) {
        let best = null, minDist = Infinity;
        for (let rpm = speed - 2000; rpm <= speed + 2000; rpm += 100) {
            if (rpm < 500) continue;
            const blim = this._calcCriticalDepth(rpm, dynamics, material, flutes);
            if (doc < blim && Math.abs(rpm - speed) < minDist) { minDist = Math.abs(rpm - speed); best = { speed: rpm, maxDoc: blim }; }
        }
        return best;
    },
    
    _identifyPockets: function(sld) {
        const pockets = [];
        for (let i = 1; i < sld.criticalDepths.length - 1; i++) {
            const prev = sld.criticalDepths[i - 1], curr = sld.criticalDepths[i], next = sld.criticalDepths[i + 1];
            if (curr > prev && curr > next && curr > 2) pockets.push({ speed: Math.round(sld.speeds[i]), maxDoc: Math.round(curr * 100) / 100 });
        }
        pockets.sort((a, b) => b.maxDoc - a.maxDoc);
        return pockets;
    },
    
    runSelfTests: function() {
        console.log('[CALCULATOR_CHATTER] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.analyzeStability({ speed: 8000, doc: 2.0, tool: { diameter: 12, flutes: 4 }, machine: { naturalFrequency: 800 }, material: { specificCuttingForce: 2000 } });
            if (r.stable !== undefined && r.chatterRisk) { results.passed++; results.tests.push({ name: 'Analyze Stability', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Analyze Stability', status: 'FAIL', error: e.message }); }
        
        try {
            const sld = this.generateSLD({ tool: { diameter: 12, flutes: 4 }, machine: { naturalFrequency: 800 } });
            if (sld.criticalDepths.length > 0) { results.passed++; results.tests.push({ name: 'Generate SLD', status: 'PASS' }); }
            else throw new Error('No data');
        } catch (e) { results.failed++; results.tests.push({ name: 'Generate SLD', status: 'FAIL', error: e.message }); }
        
        console.log('[CALCULATOR_CHATTER] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}