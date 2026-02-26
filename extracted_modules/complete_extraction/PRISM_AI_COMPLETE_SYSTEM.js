const PRISM_AI_COMPLETE_SYSTEM = {

    version: '2.0.0',
    name: 'PRISM AI Complete System',
    initialized: false,

    // Components
    tensor: PRISM_TENSOR_ENHANCED,
    layers: PRISM_NN_LAYERS_ADVANCED,
    serialization: PRISM_MODEL_SERIALIZATION,
    onlineLearning: PRISM_ONLINE_LEARNING,
    nlp: PRISM_NLP_ENGINE,
    intentClassifier: PRISM_INTENT_CLASSIFIER,
    bayesian: PRISM_BAYESIAN_LEARNING,
    optimization: PRISM_OPTIMIZATION_COMPLETE,
    abTesting: PRISM_AB_TESTING,

    /**
     * Initialize all components
     */
    initialize: function() {
        console.log('[PRISM AI Complete] Initializing all components...');

        // Initialize NLP
        PRISM_NLP_ENGINE.initVocab();
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('  ✓ NLP Engine initialized (' + PRISM_NLP_ENGINE.vocabSize + ' vocab)');

        // Initialize Intent Classifier
        PRISM_INTENT_CLASSIFIER.initialize();
        console.log('  ✓ Intent Classifier trained');

        this.initialized = true;
        console.log('[PRISM AI Complete] All components ready');

        return { success: true };
    },
    /**
     * Process user query with full NLP pipeline
     */
    processQuery: function(query, context = {}) {
        if (!this.initialized) this.initialize();

        // 1. Tokenize
        const tokens = PRISM_NLP_ENGINE.tokenize(query);

        // 2. Classify intent
        const intent = PRISM_INTENT_CLASSIFIER.classify(query);

        // 3. Extract entities (simple keyword matching for now)
        const entities = this._extractEntities(query);

        return {
            originalQuery: query,
            tokens,
            intent: intent.intent,
            intentConfidence: intent.confidence,
            entities,
            context
        };
    },
    _extractEntities: function(query) {
        const lower = query.toLowerCase();
        const entities = {
            materials: [],
            tools: [],
            operations: [],
            numbers: []
        };
        // Materials
        const materials = ['aluminum', 'steel', 'stainless', 'titanium', 'brass', 'inconel',
                         '6061', '7075', '4140', '304', '316', 'ti-6al-4v'];
        materials.forEach(m => {
            if (lower.includes(m)) entities.materials.push(m);
        });

        // Tools
        const tools = ['endmill', 'drill', 'tap', 'reamer', 'insert', 'face mill'];
        tools.forEach(t => {
            if (lower.includes(t)) entities.tools.push(t);
        });

        // Operations
        const ops = ['roughing', 'finishing', 'drilling', 'tapping', 'boring', 'facing'];
        ops.forEach(o => {
            if (lower.includes(o)) entities.operations.push(o);
        });

        // Numbers with units
        const numberRegex = /(\d+\.?\d*)\s*(mm|inch|in|rpm|sfm|ipm|%)/gi;
        let match;
        while ((match = numberRegex.exec(lower)) !== null) {
            entities.numbers.push({ value: parseFloat(match[1]), unit: match[2] });
        }
        return entities;
    },
    /**
     * Run comprehensive self-tests
     */
    runTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM AI COMPLETE SYSTEM v2.0 - COMPREHENSIVE TESTS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        let passed = 0, failed = 0;

        // Test 1: Tensor Operations
        try {
            const t1 = PRISM_TENSOR_ENHANCED.zeros([3, 3]);
            const t2 = PRISM_TENSOR_ENHANCED.randomNormal([3, 3], 0, 1);
            const t3 = PRISM_TENSOR_ENHANCED.matmul(t1, t2);
            const mean = PRISM_TENSOR_ENHANCED.mean(t2);
            if (t3.length === 3 && typeof mean === 'number') {
                console.log('  ✅ Enhanced Tensor Operations: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Enhanced Tensor Operations: FAIL');
            failed++;
        }
        // Test 2: Conv2D Layer
        try {
            const conv = new PRISM_NN_LAYERS_ADVANCED.Conv2D(1, 4, 3, 1, 1);
            const input = [PRISM_TENSOR_ENHANCED.random([8, 8], 1)];
            const output = conv.forward(input);
            if (output.length === 4 && output[0].length === 8) {
                console.log('  ✅ Conv2D Layer: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Conv2D Layer: FAIL');
            failed++;
        }
        // Test 3: LSTM Layer
        try {
            const lstm = new PRISM_NN_LAYERS_ADVANCED.LSTM(4, 8);
            const sequence = Array(5).fill(null).map(() => PRISM_TENSOR_ENHANCED.random([4], 1));
            const output = lstm.forward(sequence);
            if (output.length === 8) {
                console.log('  ✅ LSTM Layer: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ LSTM Layer: FAIL');
            failed++;
        }
        // Test 4: GRU Layer
        try {
            const gru = new PRISM_NN_LAYERS_ADVANCED.GRU(4, 8);
            const sequence = Array(5).fill(null).map(() => PRISM_TENSOR_ENHANCED.random([4], 1));
            const output = gru.forward(sequence);
            if (output.length === 8) {
                console.log('  ✅ GRU Layer: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ GRU Layer: FAIL');
            failed++;
        }
        // Test 5: MultiHead Attention
        try {
            const attn = new PRISM_NN_LAYERS_ADVANCED.MultiHeadAttention(16, 4);
            const seq = Array(3).fill(null).map(() => PRISM_TENSOR_ENHANCED.random([16], 0.1));
            const output = attn.forward(seq, seq, seq);
            if (output.length === 3 && output[0].length === 16) {
                console.log('  ✅ MultiHead Attention: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ MultiHead Attention: FAIL');
            failed++;
        }
        // Test 6: Model Serialization
        try {
            const model = {
                name: 'test_model',
                layers: [
                    new PRISM_NN_LAYERS_ADVANCED.LayerNorm(10),
                    new PRISM_NN_LAYERS_ADVANCED.BatchNorm1D(10)
                ]
            };
            const json = PRISM_MODEL_SERIALIZATION.toJSON(model);
            const parsed = JSON.parse(json);
            if (parsed.name === 'test_model' && parsed.architecture.length === 2) {
                console.log('  ✅ Model Serialization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Model Serialization: FAIL');
            failed++;
        }
        // Test 7: NLP Tokenization
        try {
            PRISM_NLP_ENGINE.initVocab();
            const tokens = PRISM_NLP_ENGINE.tokenize('calculate speed for aluminum roughing');
            const detokenized = PRISM_NLP_ENGINE.detokenize(tokens);
            if (tokens.length > 3 && tokens[0] === 2) { // START token
                console.log('  ✅ NLP Tokenization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ NLP Tokenization: FAIL');
            failed++;
        }
        // Test 8: Word Embeddings
        try {
            const embedding = PRISM_NLP_ENGINE.createEmbedding(32);
            const tokens = [5, 10, 15];
            const embedded = embedding.embed(tokens);
            if (embedded.length === 3 && embedded[0].length === 32) {
                console.log('  ✅ Word Embeddings: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Word Embeddings: FAIL');
            failed++;
        }
        // Test 9: Intent Classification
        try {
            PRISM_INTENT_CLASSIFIER.initialize();
            const result = PRISM_INTENT_CLASSIFIER.classify('what speed for aluminum');
            if (result.intent && result.confidence > 0) {
                console.log('  ✅ Intent Classification: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Intent Classification: FAIL');
            failed++;
        }
        // Test 10: Gaussian Process
        try {
            const gp = new PRISM_BAYESIAN_LEARNING.GaussianProcess(1.0, 1.0, 0.01);
            const X = [[0], [1], [2], [3]];
            const y = [0, 1, 4, 9];
            gp.fit(X, y);
            const pred = gp.predict([[1.5]]);
            if (pred[0].mean !== undefined && pred[0].std !== undefined) {
                console.log('  ✅ Gaussian Process: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Gaussian Process: FAIL');
            failed++;
        }
        // Test 11: Bayesian Optimization
        try {
            const bo = new PRISM_BAYESIAN_LEARNING.BayesianOptimization([
                { min: 0, max: 10 }
            ]);
            const suggestion = bo.suggest();
            if (suggestion.length === 1 && suggestion[0] >= 0 && suggestion[0] <= 10) {
                console.log('  ✅ Bayesian Optimization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Bayesian Optimization: FAIL');
            failed++;
        }
        // Test 12: Simulated Annealing
        try {
            const sa = new PRISM_OPTIMIZATION_COMPLETE.SimulatedAnnealing({
                initialTemp: 100,
                maxIterations: 100
            });
            const result = sa.optimize(
                x => Math.pow(x[0] - 5, 2),
                [0],
                x => [x[0] + (Math.random() - 0.5) * 2]
            );
            if (result.solution !== undefined && result.energy !== undefined) {
                console.log('  ✅ Simulated Annealing: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Simulated Annealing: FAIL');
            failed++;
        }
        // Test 13: Differential Evolution
        try {
            const de = new PRISM_OPTIMIZATION_COMPLETE.DifferentialEvolution({
                populationSize: 20,
                maxGenerations: 10
            });
            const result = de.optimize(
                x => Math.pow(x[0] - 3, 2) + Math.pow(x[1] - 4, 2),
                [{ min: 0, max: 10 }, { min: 0, max: 10 }]
            );
            if (result.solution.length === 2) {
                console.log('  ✅ Differential Evolution: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Differential Evolution: FAIL');
            failed++;
        }
        // Test 14: Thompson Sampling
        try {
            const ts = new PRISM_BAYESIAN_LEARNING.ThompsonSampling(3);
            const arm = ts.select();
            ts.update(arm, 1);
            const expected = ts.getExpected();
            if (arm >= 0 && arm < 3 && expected.length === 3) {
                console.log('  ✅ Thompson Sampling: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Thompson Sampling: FAIL');
            failed++;
        }
        // Test 15: A/B Testing
        try {
            PRISM_AB_TESTING.createExperiment('test_exp', ['A', 'B']);
            const variant = PRISM_AB_TESTING.getVariant('test_exp');
            PRISM_AB_TESTING.recordImpression('test_exp', variant);
            PRISM_AB_TESTING.recordConversion('test_exp', variant, 1);
            const results = PRISM_AB_TESTING.getResults('test_exp');
            if (results && results.results.length === 2) {
                console.log('  ✅ A/B Testing: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ A/B Testing: FAIL');
            failed++;
        }
        // Test 16: Online Learning
        try {
            const model = {
                layers: [
                    {
                        forward: x => x.map(v => Math.max(0, v)),
                        backward: (g, lr) => g
                    }
                ]
            };
            const result = PRISM_ONLINE_LEARNING.incrementalFit(model, [1, -1, 2], [1, 0, 2], 0.01);
            if (result.loss !== undefined && result.prediction !== undefined) {
                console.log('  ✅ Online Learning: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Online Learning: FAIL');
            failed++;
        }
        // Test 17: Layer Normalization
        try {
            const ln = new PRISM_NN_LAYERS_ADVANCED.LayerNorm(5);
            const input = [1, 2, 3, 4, 5];
            const output = ln.forward(input);
            const mean = output.reduce((a, b) => a + b, 0) / output.length;
            if (Math.abs(mean) < 0.1) { // Should be approximately 0
                console.log('  ✅ Layer Normalization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Layer Normalization: FAIL');
            failed++;
        }
        // Test 18: Batch Normalization
        try {
            const bn = new PRISM_NN_LAYERS_ADVANCED.BatchNorm1D(3);
            const input = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
            const output = bn.forward(input);
            if (output.length === 3 && output[0].length === 3) {
                console.log('  ✅ Batch Normalization: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Batch Normalization: FAIL');
            failed++;
        }
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
}