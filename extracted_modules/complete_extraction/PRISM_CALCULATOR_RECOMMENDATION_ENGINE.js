const PRISM_CALCULATOR_RECOMMENDATION_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_RECOMMENDATION_ENGINE',
    
    getRecommendation: function(params) {
        const { material, tool, operation, machine, requirements = {} } = params;
        const matInfo = this._identifyMaterial(material);
        const toolRec = tool ? this._validateTool(tool, matInfo, operation) : this._recommendTool(matInfo, operation);
        const cuttingParams = this._getCuttingParams(matInfo, toolRec, operation, machine);
        
        let adjusted = cuttingParams;
        if (typeof PRISM_CALCULATOR_LEARNING_ENGINE !== 'undefined') {
            adjusted = PRISM_CALCULATOR_LEARNING_ENGINE.adjustRecommendation(cuttingParams, { material: matInfo, tool: toolRec, machine });
        }
        
        return { material: matInfo, tool: toolRec, operation, parameters: adjusted,
            confidence: this._calcConfidence(matInfo, toolRec, adjusted),
            warnings: this._getWarnings(matInfo, toolRec, adjusted, machine) };
    },
    
    recognizeMaterial: function(input) { return this._identifyMaterial(input); },
    
    recommendTools: function(material, operation, count = 3) {
        const matInfo = this._identifyMaterial(material);
        const tools = [], strategies = ['productivity', 'finish', 'cost'];
        for (const s of strategies) {
            const t = this._recommendTool(matInfo, operation, { priority: s });
            if (t && !tools.find(x => x.type === t.type && x.diameter === t.diameter)) tools.push({ ...t, strategy: s });
            if (tools.length >= count) break;
        }
        return tools;
    },
    
    _identifyMaterial: function(input) {
        if (!input) return this._defaultMaterial();
        if (input.id && input.machinabilityIndex) return input;
        if (typeof input === 'string') return this._parseMaterial(input);
        if (input.hardness) return this._inferMaterial(input);
        return this._defaultMaterial();
    },
    
    _parseMaterial: function(str) {
        const lower = str.toLowerCase();
        const patterns = [
            { p: /aluminum|al\s*\d|6061|7075/, cat: 'aluminum', sfm: 800, mi: 500 },
            { p: /1018|1020|1045|a36|carbon.*steel/, cat: 'carbon_steel', sfm: 100, mi: 100 },
            { p: /304|316|stainless/, cat: 'stainless', sfm: 80, mi: 45 },
            { p: /4140|4340|alloy.*steel/, cat: 'alloy_steel', sfm: 80, mi: 65 },
            { p: /titanium|ti-?6/, cat: 'titanium', sfm: 60, mi: 25 },
            { p: /inconel|hastelloy/, cat: 'superalloy', sfm: 30, mi: 15 },
            { p: /brass|bronze|copper/, cat: 'copper', sfm: 400, mi: 300 },
            { p: /cast.*iron|ductile/, cat: 'cast_iron', sfm: 100, mi: 80 },
            { p: /plastic|nylon|delrin|peek/, cat: 'plastic', sfm: 500, mi: 400 }
        ];
        for (const { p, cat, sfm, mi } of patterns) {
            if (p.test(lower)) return { id: 'parsed_' + cat, name: str, category: cat, machinabilityIndex: mi, recommendedSFM: { carbide: sfm }, source: 'parsed' };
        }
        return this._defaultMaterial();
    },
    
    _inferMaterial: function(props) {
        const h = props.hardness || props.HRC || 30;
        let cat = 'steel', mi = 100, sfm = 100;
        if (h < 20) { cat = 'aluminum'; mi = 500; sfm = 800; }
        else if (h < 35) { cat = 'steel'; mi = 100; sfm = 100; }
        else if (h < 50) { cat = 'tool_steel'; mi = 60; sfm = 60; }
        else { cat = 'hardened_steel'; mi = 30; sfm = 40; }
        return { id: 'inferred_' + cat, name: 'Inferred ' + cat, category: cat, hardness: h, machinabilityIndex: mi, recommendedSFM: { carbide: sfm }, source: 'inferred' };
    },
    
    _defaultMaterial: function() {
        return { id: 'default_steel', name: 'General Steel', category: 'carbon_steel', hardness: 200, machinabilityIndex: 100, recommendedSFM: { carbide: 100 }, source: 'default' };
    },
    
    _recommendTool: function(material, operation, req = {}) {
        const cat = material.category || 'steel';
        let type = 'endmill', diameter = 12, flutes = 4, coating = 'AlTiN';
        if (operation === 'roughing') { diameter = 16; flutes = cat === 'aluminum' ? 3 : 4; }
        else if (operation === 'finishing') { diameter = 6; flutes = cat === 'aluminum' ? 3 : 5; }
        else if (operation === 'slotting') { diameter = 10; flutes = cat === 'aluminum' ? 2 : 4; coating = 'TiAlN'; }
        else if (operation === 'drilling') { type = 'drill'; flutes = 2; coating = 'TiN'; }
        return { type, diameter, flutes, coating, cornerRadius: diameter < 12 ? 0.2 : 0.4, material: 'carbide' };
    },
    
    _validateTool: function(tool, material, operation) {
        const warnings = [];
        if (material.category === 'aluminum' && tool.flutes > 3) warnings.push('Fewer flutes recommended for aluminum');
        if (operation === 'finishing' && tool.diameter > 16) warnings.push('Smaller diameter recommended for finishing');
        return { ...tool, validationWarnings: warnings, suitability: warnings.length === 0 ? 'optimal' : 'acceptable' };
    },
    
    _getCuttingParams: function(material, tool, operation, machine) {
        const sfm = material.recommendedSFM?.carbide || 100, mi = material.machinabilityIndex || 100;
        const diameter = tool.diameter || 12, flutes = tool.flutes || 4;
        let rpm = (sfm * 1000) / (Math.PI * diameter), fpt, doc, woc;
        
        if (operation === 'roughing' || operation === 'adaptive') { fpt = 0.05 * (mi / 100); doc = diameter * 1.5; woc = diameter * 0.2; rpm *= 1.1; }
        else if (operation === 'finishing') { fpt = 0.03 * (mi / 100); doc = 0.5; woc = diameter * 0.5; }
        else if (operation === 'slotting') { fpt = 0.04 * (mi / 100); doc = diameter * 0.5; woc = diameter; rpm *= 0.8; }
        else { fpt = 0.04 * (mi / 100); doc = diameter * 0.5; woc = diameter * 0.5; }
        
        if (machine?.maxRPM) rpm = Math.min(rpm, machine.maxRPM);
        return { speed: Math.round(rpm), feed: Math.round(fpt * 10000) / 10000, doc: Math.round(doc * 100) / 100, woc: Math.round(woc * 100) / 100, feedrate: Math.round(rpm * fpt * flutes), surfaceSpeed: Math.round(rpm * Math.PI * diameter / 1000 * 10) / 10 };
    },
    
    _calcConfidence: function(mat, tool, params) {
        let c = 0.8;
        if (mat.source === 'inferred') c -= 0.1;
        if (mat.source === 'parsed') c -= 0.05;
        if (mat.source === 'default') c -= 0.2;
        if (tool.validationWarnings?.length > 0) c -= 0.1;
        if (params.learningApplied) c += 0.1;
        return Math.max(0.3, Math.min(1.0, c));
    },
    
    _getWarnings: function(mat, tool, params, machine) {
        const w = [];
        if (mat.source === 'default') w.push({ level: 'info', message: 'Material not identified - using default' });
        if (machine?.maxRPM && params.speed >= machine.maxRPM * 0.95) w.push({ level: 'warning', message: 'Speed near machine limit' });
        if (tool.validationWarnings) tool.validationWarnings.forEach(m => w.push({ level: 'info', message: m }));
        return w;
    },
    
    runSelfTests: function() {
        console.log('[CALCULATOR_RECOMMENDATION] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.getRecommendation({ material: 'aluminum 6061', operation: 'roughing' });
            if (r.material && r.tool && r.parameters.speed > 0) { results.passed++; results.tests.push({ name: 'Get Recommendation', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Get Recommendation', status: 'FAIL', error: e.message }); }
        
        try {
            const m = this.recognizeMaterial('304 stainless steel');
            if (m.category === 'stainless') { results.passed++; results.tests.push({ name: 'Recognize Material', status: 'PASS' }); }
            else throw new Error('Wrong: ' + m.category);
        } catch (e) { results.failed++; results.tests.push({ name: 'Recognize Material', status: 'FAIL', error: e.message }); }
        
        try {
            const t = this.recommendTools('titanium', 'roughing', 3);
            if (t.length > 0) { results.passed++; results.tests.push({ name: 'Recommend Tools', status: 'PASS' }); }
            else throw new Error('No tools');
        } catch (e) { results.failed++; results.tests.push({ name: 'Recommend Tools', status: 'FAIL', error: e.message }); }
        
        console.log('[CALCULATOR_RECOMMENDATION] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}