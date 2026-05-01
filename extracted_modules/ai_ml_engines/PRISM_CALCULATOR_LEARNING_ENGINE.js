const PRISM_CALCULATOR_LEARNING_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_LEARNING_ENGINE',
    
    learningData: {
        speedFeedOutcomes: [],
        userAdjustments: [],
        toolLifeObservations: [],
        surfaceFinishResults: [],
        chatterIncidents: []
    },
    
    posteriors: {
        speed_multiplier: { mean: 1.0, variance: 0.1, observations: 0 },
        feed_multiplier: { mean: 1.0, variance: 0.1, observations: 0 },
        doc_multiplier: { mean: 1.0, variance: 0.1, observations: 0 },
        woc_multiplier: { mean: 1.0, variance: 0.1, observations: 0 },
        tool_life_factor: { mean: 1.0, variance: 0.15, observations: 0 }
    },
    
    materialLearning: {},
    toolLearning: {},
    machineLearning: {},
    
    initialize: function() {
        this._loadPersistedData();
        console.log('[CALCULATOR_LEARNING] Initialized');
        return this;
    },
    
    recordOutcome: function(params) {
        const { material, tool, machine, recommended, actual, outcome, metrics = {} } = params;
        const timestamp = Date.now();
        const accepted = this._isAccepted(recommended, actual);
        
        const record = {
            id: 'outcome_' + timestamp + '_' + Math.random().toString(36).substr(2, 9),
            timestamp, material: this._normalize(material), tool: this._normalize(tool),
            machine: this._normalize(machine), recommended, actual, outcome, metrics, accepted,
            adjustmentFactors: this._calculateFactors(recommended, actual)
        };
        
        this.learningData.speedFeedOutcomes.push(record);
        this._updateBayesianPosteriors(record);
        if (material) this._updateMaterialLearning(record);
        if (tool) this._updateToolLearning(record);
        if (machine) this._updateMachineLearning(record);
        
        if (metrics.toolLife) {
            this.learningData.toolLifeObservations.push({
                timestamp, params: actual, predicted: recommended.predictedToolLife, actual: metrics.toolLife
            });
        }
        
        if (this.learningData.speedFeedOutcomes.length % 10 === 0) this._persistData();
        if (typeof PRISM_EVENT_BUS !== 'undefined') PRISM_EVENT_BUS.publish('calculator:learning:outcome', record);
        return record;
    },
    
    processFeedback: function(feedback) {
        const { outcomeId, rating, feedbackType, comments = '' } = feedback;
        const record = { id: 'feedback_' + Date.now(), timestamp: Date.now(), outcomeId, rating, feedbackType, comments };
        if (!this.learningData.userFeedback) this.learningData.userFeedback = [];
        this.learningData.userFeedback.push(record);
        
        switch (feedbackType) {
            case 'too_aggressive':
                this._adjustPosterior('speed_multiplier', -0.05);
                this._adjustPosterior('feed_multiplier', -0.05);
                break;
            case 'too_conservative':
                this._adjustPosterior('speed_multiplier', 0.05);
                this._adjustPosterior('feed_multiplier', 0.05);
                break;
            case 'chatter':
                this._adjustPosterior('doc_multiplier', -0.1);
                this._adjustPosterior('woc_multiplier', -0.1);
                break;
            case 'poor_finish':
                this._adjustPosterior('feed_multiplier', -0.05);
                break;
        }
        return record;
    },
    
    adjustRecommendation: function(baseRec, context = {}) {
        const { material, tool, machine } = context;
        let speedMult = this.posteriors.speed_multiplier.mean;
        let feedMult = this.posteriors.feed_multiplier.mean;
        let docMult = this.posteriors.doc_multiplier.mean;
        let wocMult = this.posteriors.woc_multiplier.mean;
        
        const matKey = this._normalize(material);
        if (this.materialLearning[matKey]) {
            speedMult *= this.materialLearning[matKey].speedFactor || 1.0;
            feedMult *= this.materialLearning[matKey].feedFactor || 1.0;
        }
        
        const toolKey = this._normalize(tool);
        if (this.toolLearning[toolKey]) {
            speedMult *= this.toolLearning[toolKey].speedFactor || 1.0;
            feedMult *= this.toolLearning[toolKey].feedFactor || 1.0;
        }
        
        const confidence = this._calculateConfidence();
        return {
            speed: Math.round(baseRec.speed * speedMult),
            feed: Math.round(baseRec.feed * feedMult * 1000) / 1000,
            doc: Math.round(baseRec.doc * docMult * 1000) / 1000,
            woc: Math.round(baseRec.woc * wocMult * 1000) / 1000,
            base: baseRec,
            multipliers: { speedMult, feedMult, docMult, wocMult },
            confidence,
            learningApplied: true,
            observationCount: this.posteriors.speed_multiplier.observations
        };
    },
    
    thompsonSample: function(param = 'speed_multiplier') {
        const p = this.posteriors[param];
        if (!p) return 1.0;
        const u1 = Math.random(), u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(0.5, Math.min(1.5, p.mean + Math.sqrt(p.variance) * z));
    },
    
    getStatistics: function() {
        const outcomes = this.learningData.speedFeedOutcomes;
        const successCount = outcomes.filter(o => o.outcome === 'success').length;
        const acceptedCount = outcomes.filter(o => o.accepted).length;
        return {
            totalOutcomes: outcomes.length,
            successRate: outcomes.length > 0 ? (successCount / outcomes.length * 100).toFixed(1) + '%' : 'N/A',
            acceptanceRate: outcomes.length > 0 ? (acceptedCount / outcomes.length * 100).toFixed(1) + '%' : 'N/A',
            toolLifeObservations: this.learningData.toolLifeObservations.length,
            materialsLearned: Object.keys(this.materialLearning).length,
            posteriors: {
                speed: { multiplier: this.posteriors.speed_multiplier.mean.toFixed(3) },
                feed: { multiplier: this.posteriors.feed_multiplier.mean.toFixed(3) }
            }
        };
    },
    
    exportLearningData: function() {
        return { version: this.version, exported: new Date().toISOString(), posteriors: this.posteriors,
            materialLearning: this.materialLearning, toolLearning: this.toolLearning };
    },
    
    importLearningData: function(data) {
        if (data.posteriors) this.posteriors = data.posteriors;
        if (data.materialLearning) this.materialLearning = data.materialLearning;
        if (data.toolLearning) this.toolLearning = data.toolLearning;
    },
    
    _isAccepted: function(rec, act) {
        if (!rec || !act) return false;
        return Math.abs(rec.speed - act.speed) / rec.speed < 0.1 && Math.abs(rec.feed - act.feed) / rec.feed < 0.1;
    },
    
    _calculateFactors: function(rec, act) {
        if (!rec || !act) return {};
        return { speed: act.speed / (rec.speed || 1), feed: act.feed / (rec.feed || 1),
            doc: act.doc / (rec.doc || 1), woc: act.woc / (rec.woc || 1) };
    },
    
    _updateBayesianPosteriors: function(record) {
        const f = record.adjustmentFactors;
        const w = record.outcome === 'success' ? 1.0 : record.outcome === 'modified' ? 0.5 : 0.2;
        if (f.speed) this._updatePosterior('speed_multiplier', f.speed, w);
        if (f.feed) this._updatePosterior('feed_multiplier', f.feed, w);
        if (f.doc) this._updatePosterior('doc_multiplier', f.doc, w);
    },
    
    _updatePosterior: function(param, obs, weight = 1.0) {
        const p = this.posteriors[param];
        if (!p) return;
        const n = p.observations + weight;
        const priorPrec = 1 / p.variance, obsPrec = weight / 0.1;
        const newPrec = priorPrec + obsPrec;
        p.mean = Math.max(0.5, Math.min(1.5, (priorPrec * p.mean + obsPrec * obs) / newPrec));
        p.variance = Math.max(0.001, 1 / newPrec);
        p.observations = n;
    },
    
    _adjustPosterior: function(param, delta) {
        const p = this.posteriors[param];
        if (p) { p.mean = Math.max(0.5, Math.min(1.5, p.mean + delta)); p.variance *= 0.95; }
    },
    
    _updateMaterialLearning: function(record) {
        const key = record.material;
        if (!this.materialLearning[key]) this.materialLearning[key] = { speedFactor: 1.0, feedFactor: 1.0, observations: 0 };
        const m = this.materialLearning[key], n = m.observations + 1, f = record.adjustmentFactors;
        if (f.speed) m.speedFactor = (m.speedFactor * m.observations + f.speed) / n;
        if (f.feed) m.feedFactor = (m.feedFactor * m.observations + f.feed) / n;
        m.observations = n;
    },
    
    _updateToolLearning: function(record) {
        const key = record.tool;
        if (!this.toolLearning[key]) this.toolLearning[key] = { speedFactor: 1.0, feedFactor: 1.0, observations: 0 };
        const t = this.toolLearning[key], n = t.observations + 1, f = record.adjustmentFactors;
        if (f.speed) t.speedFactor = (t.speedFactor * t.observations + f.speed) / n;
        if (f.feed) t.feedFactor = (t.feedFactor * t.observations + f.feed) / n;
        t.observations = n;
    },
    
    _updateMachineLearning: function(record) {
        const key = record.machine;
        if (!this.machineLearning[key]) this.machineLearning[key] = { rigidityFactor: 1.0, feedFactor: 1.0, observations: 0 };
        const m = this.machineLearning[key], n = m.observations + 1, f = record.adjustmentFactors;
        if (f.speed) m.rigidityFactor = (m.rigidityFactor * m.observations + f.speed) / n;
        m.observations = n;
    },
    
    _calculateConfidence: function() {
        const avgVar = (this.posteriors.speed_multiplier.variance + this.posteriors.feed_multiplier.variance) / 2;
        return Math.max(0, Math.min(1, 1 - Math.sqrt(avgVar)));
    },
    
    _normalize: function(input) {
        if (!input) return 'unknown';
        if (typeof input === 'string') return input.toLowerCase().replace(/\s+/g, '_');
        return (input.name || input.id || 'unknown').toLowerCase().replace(/\s+/g, '_');
    },
    
    _loadPersistedData: function() {
        try {
            const stored = localStorage.getItem('prism_calculator_learning');
            if (stored) this.importLearningData(JSON.parse(stored));
        } catch (e) { /* No data */ }
    },
    
    _persistData: function() {
        try { localStorage.setItem('prism_calculator_learning', JSON.stringify(this.exportLearningData())); }
        catch (e) { /* Storage unavailable */ }
    },
    
    runSelfTests: function() {
        console.log('[CALCULATOR_LEARNING] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            this.initialize();
            results.passed++; results.tests.push({ name: 'Initialize', status: 'PASS' });
        } catch (e) { results.failed++; results.tests.push({ name: 'Initialize', status: 'FAIL', error: e.message }); }
        
        try {
            const outcome = this.recordOutcome({
                material: 'steel_1018', tool: 'endmill',
                recommended: { speed: 5000, feed: 0.02, doc: 0.5, woc: 0.25 },
                actual: { speed: 4800, feed: 0.018, doc: 0.5, woc: 0.25 },
                outcome: 'success', metrics: { toolLife: 45 }
            });
            if (outcome.id) { results.passed++; results.tests.push({ name: 'Record Outcome', status: 'PASS' }); }
            else throw new Error('No ID');
        } catch (e) { results.failed++; results.tests.push({ name: 'Record Outcome', status: 'FAIL', error: e.message }); }
        
        try {
            const adj = this.adjustRecommendation({ speed: 5000, feed: 0.02, doc: 0.5, woc: 0.25 }, { material: 'steel' });
            if (adj.speed && adj.confidence !== undefined) { results.passed++; results.tests.push({ name: 'Adjust Recommendation', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Adjust Recommendation', status: 'FAIL', error: e.message }); }
        
        try {
            const sample = this.thompsonSample('speed_multiplier');
            if (sample >= 0.5 && sample <= 1.5) { results.passed++; results.tests.push({ name: 'Thompson Sampling', status: 'PASS' }); }
            else throw new Error('Out of bounds: ' + sample);
        } catch (e) { results.failed++; results.tests.push({ name: 'Thompson Sampling', status: 'FAIL', error: e.message }); }
        
        console.log('[CALCULATOR_LEARNING] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}