/**
 * PRISM_TRUE_AI_SYSTEM
 * Extracted from PRISM v8.89.002 monolith
 * References in monolith: 21
 * Lines extracted: 280
 * Prototype methods: 0
 * Session: R2.0.2
 */

const PRISM_TRUE_AI_SYSTEM = {

    version: '1.1.0',
    name: 'PRISM True AI System',
    initialized: false,

    // Component references
    tensor: PRISM_TENSOR,
    layers: PRISM_NN_LAYERS,
    network: PRISM_NEURAL_NETWORK,
    pretrained: PRISM_PRETRAINED_MODELS,
    claude: PRISM_CLAUDE_API,
    orchestrator: PRISM_AI_BACKGROUND_ORCHESTRATOR,
    chat: PRISM_AI_CHAT_INTERFACE,
    learning: PRISM_LEARNING_ENGINE,

    /**
     * Initialize the complete AI system
     */
    initialize: async function(options = {}) {
        console.log('[PRISM TRUE AI] Initializing v1.1...');

        // Configure Claude API
        if (options.claudeApiKey) {
            PRISM_CLAUDE_API.setApiKey(options.claudeApiKey);
        }
        // Initialize pretrained models
        PRISM_PRETRAINED_MODELS.initializeAll();

        // Start background orchestrator
        PRISM_AI_BACKGROUND_ORCHESTRATOR.start();

        // Set help level
        if (options.helpLevel) {
            PRISM_AI_BACKGROUND_ORCHESTRATOR.setHelpLevel(options.helpLevel);
        }
        this.initialized = true;
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM TRUE AI] Initialization complete');

        return {
            success: true,
            claudeAvailable: PRISM_CLAUDE_API.isAvailable(),
            models: ['toolWearPredictor', 'surfaceFinishPredictor', 'cycleTimePredictor', 'chatterPredictor']
        };
    },
    /**
     * Ask AI a question (unified interface)
     */
    ask: async function(question, context = {}) {
        PRISM_AI_CHAT_INTERFACE.setContext(context);
        return await PRISM_AI_CHAT_INTERFACE.sendMessage(question);
    },
    /**
     * Get prediction from pretrained neural network
     */
    predict: function(model, input) {
        const wearStates = ['minimal', 'moderate', 'severe', 'critical'];

        switch (model) {
            case 'toolWear':
                if (!PRISM_PRETRAINED_MODELS.toolWearPredictor) {
                    PRISM_PRETRAINED_MODELS.createToolWearModel();
                }
                const wearOut = PRISM_PRETRAINED_MODELS.toolWearPredictor.predict(input);
                const wearMaxIdx = wearOut.indexOf(Math.max(...wearOut));
                return {
                    state: wearStates[wearMaxIdx],
                    confidence: wearOut[wearMaxIdx],
                    probabilities: Object.fromEntries(wearStates.map((s, i) => [s, wearOut[i]]))
                };
            case 'surfaceFinish':
                if (!PRISM_PRETRAINED_MODELS.surfaceFinishPredictor) {
                    PRISM_PRETRAINED_MODELS.createSurfaceFinishModel();
                }
                const raOut = PRISM_PRETRAINED_MODELS.surfaceFinishPredictor.predict(input);
                return { Ra: raOut[0] * 5, unit: 'µm' };

            case 'cycleTime':
                if (!PRISM_PRETRAINED_MODELS.cycleTimePredictor) {
                    PRISM_PRETRAINED_MODELS.createCycleTimeModel();
                }
                const timeOut = PRISM_PRETRAINED_MODELS.cycleTimePredictor.predict(input);
                return { time: timeOut[0] * 20, unit: 'minutes' };

            case 'chatter':
                if (!PRISM_PRETRAINED_MODELS.chatterPredictor) {
                    PRISM_PRETRAINED_MODELS.createChatterModel();
                }
                const chatterOut = PRISM_PRETRAINED_MODELS.chatterPredictor.predict(input);
                return {
                    stable: chatterOut[0] > chatterOut[1],
                    stability: chatterOut[0],
                    instability: chatterOut[1],
                    recommendation: chatterOut[0] > chatterOut[1] ?
                        'Parameters are in stable cutting zone' :
                        'Risk of chatter - consider reducing DOC or adjusting RPM'
                };
            default:
                return { error: `Unknown model: ${model}` };
        }
    },
    /**
     * Record user action for learning
     */
    recordAction: function(action) {
        PRISM_AI_BACKGROUND_ORCHESTRATOR.recordAction(action);
    },
    /**
     * Record machining outcome for learning
     */
    recordOutcome: function(params, outcome) {
        PRISM_LEARNING_ENGINE.recordOutcome(params, outcome);
    },
    /**
     * Get pending AI suggestions
     */
    getSuggestions: function() {
        return PRISM_AI_BACKGROUND_ORCHESTRATOR.getPendingSuggestions();
    },
    /**
     * Get system status
     */
    getStatus: function() {
        return {
            version: this.version,
            initialized: this.initialized,
            claudeAvailable: PRISM_CLAUDE_API.isAvailable(),
            orchestratorRunning: PRISM_AI_BACKGROUND_ORCHESTRATOR.isRunning,
            learningStats: PRISM_LEARNING_ENGINE.getStats(),
            pendingSuggestions: PRISM_AI_BACKGROUND_ORCHESTRATOR.getPendingSuggestions().length
        };
    },
    /**
     * Configure Claude API key
     */
    setClaudeApiKey: function(key) {
        PRISM_CLAUDE_API.setApiKey(key);
    },
    /**
     * Run comprehensive self-tests
     */
    runTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM TRUE AI SYSTEM v1.1 - SELF-TESTS');
        console.log('═══════════════════════════════════════════════════════════════');

        let passed = 0, failed = 0;

        // Test 1: Tensor operations
        try {
            const a = PRISM_TENSOR.random([3, 3], 0.5);
            const b = PRISM_TENSOR.random([3, 3], 0.5);
            const c = PRISM_TENSOR.matmul(a, b);
            if (c.length === 3 && c[0].length === 3 && !isNaN(c[0][0])) {
                console.log('  ✅ Tensor Operations: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Tensor Operations: FAIL');
            failed++;
        }
        // Test 2: Dense layer
        try {
            const dense = new PRISM_NN_LAYERS.Dense(4, 2, 'relu');
            const out = dense.forward([1, 2, 3, 4]);
            if (out.length === 2 && !isNaN(out[0])) {
                console.log('  ✅ Dense Layer Forward: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Dense Layer Forward: FAIL');
            failed++;
        }
        // Test 3: Neural network training
        try {
            const model = new PRISM_NEURAL_NETWORK.Sequential('XOR-test');
            model.add(new PRISM_NN_LAYERS.Dense(2, 8, 'relu'));
            model.add(new PRISM_NN_LAYERS.Dense(8, 2, 'softmax'));
            model.compile({ loss: 'crossentropy', learningRate: 0.1 });

            const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
            const y = [[1, 0], [0, 1], [0, 1], [1, 0]];
            model.fit(X, y, { epochs: 50, verbose: false });

            const pred = model.predict([1, 0]);
            if (pred.length === 2 && !isNaN(pred[0]) && pred[1] > pred[0]) {
                console.log('  ✅ Neural Network Training: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Neural Network Training: FAIL');
            failed++;
        }
        // Test 4: Tool wear predictor
        try {
            const result = this.predict('toolWear', [0.5, 0.3, 0.4, 0.6, 0.2, 0.4]);
            if (result.state && result.confidence && !isNaN(result.confidence)) {
                console.log('  ✅ Tool Wear Predictor: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Tool Wear Predictor: FAIL');
            failed++;
        }
        // Test 5: Surface finish predictor
        try {
            const result = this.predict('surfaceFinish', [0.2, 0.5, 0.6, 0.4, 0.8]);
            if (result.Ra && !isNaN(result.Ra)) {
                console.log('  ✅ Surface Finish Predictor: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Surface Finish Predictor: FAIL');
            failed++;
        }
        // Test 6: Chatter predictor
        try {
            const result = this.predict('chatter', [0.5, 0.3, 0.4, 0.5]);
            if (typeof result.stable === 'boolean' && result.recommendation) {
                console.log('  ✅ Chatter Predictor: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Chatter Predictor: FAIL');
            failed++;
        }
        // Test 7: Orchestrator
        try {
            PRISM_AI_BACKGROUND_ORCHESTRATOR.recordAction({ type: 'test', data: {} });
            if (PRISM_AI_BACKGROUND_ORCHESTRATOR.userActions.length > 0) {
                console.log('  ✅ AI Orchestrator: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ AI Orchestrator: FAIL');
            failed++;
        }
        // Test 8: Chat interface
        try {
            const convId = PRISM_AI_CHAT_INTERFACE.createConversation();
            if (convId && PRISM_AI_CHAT_INTERFACE.conversations.has(convId)) {
                console.log('  ✅ Chat Interface: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Chat Interface: FAIL');
            failed++;
        }
        // Test 9: Learning engine
        try {
            PRISM_LEARNING_ENGINE.recordOutcome({ speed: 200 }, { quality: 'good' });
            if (PRISM_LEARNING_ENGINE.data.outcomes.length > 0) {
                console.log('  ✅ Learning Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Learning Engine: FAIL');
            failed++;
        }
        // Test 10: Claude local fallback
        try {
            const response = PRISM_CLAUDE_API._generateLocalResponse('What speed for aluminum?', {
                material: { name: '6061 Aluminum' },
                tool: { diameter: 10, teeth: 4 }
            });
            if (response && response.includes('RPM')) {
                console.log('  ✅ Claude Local Fallback: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Claude Local Fallback: FAIL');
            failed++;
        }
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
}