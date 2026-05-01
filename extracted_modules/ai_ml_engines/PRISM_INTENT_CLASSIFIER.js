const PRISM_INTENT_CLASSIFIER = {

    model: null,
    embedding: null,
    intents: [
        'speed_feed_query',
        'tool_selection',
        'material_query',
        'chatter_problem',
        'wear_prediction',
        'optimization_request',
        'general_question',
        'greeting',
        'help_request'
    ],

    trainingData: [
        // Speed/feed queries
        { text: 'what speed should I use for aluminum', intent: 'speed_feed_query' },
        { text: 'calculate feed rate for steel', intent: 'speed_feed_query' },
        { text: 'rpm for 10mm endmill in stainless', intent: 'speed_feed_query' },
        { text: 'what chipload should I use', intent: 'speed_feed_query' },
        { text: 'feeds and speeds for titanium', intent: 'speed_feed_query' },

        // Tool selection
        { text: 'what tool should I use for roughing', intent: 'tool_selection' },
        { text: 'best endmill for aluminum', intent: 'tool_selection' },
        { text: 'recommend a drill for stainless', intent: 'tool_selection' },
        { text: 'which insert for finishing steel', intent: 'tool_selection' },

        // Material queries
        { text: 'what is the hardness of 4140 steel', intent: 'material_query' },
        { text: 'machinability of inconel', intent: 'material_query' },
        { text: 'properties of 7075 aluminum', intent: 'material_query' },

        // Chatter problems
        { text: 'I am getting chatter', intent: 'chatter_problem' },
        { text: 'vibration during finishing', intent: 'chatter_problem' },
        { text: 'how to reduce chatter', intent: 'chatter_problem' },
        { text: 'tool is vibrating', intent: 'chatter_problem' },

        // Wear prediction
        { text: 'how long will my tool last', intent: 'wear_prediction' },
        { text: 'predict tool wear', intent: 'wear_prediction' },
        { text: 'when should I change the insert', intent: 'wear_prediction' },

        // Optimization
        { text: 'optimize my parameters', intent: 'optimization_request' },
        { text: 'make this faster', intent: 'optimization_request' },
        { text: 'improve surface finish', intent: 'optimization_request' },
        { text: 'reduce cycle time', intent: 'optimization_request' },

        // General
        { text: 'what is DOC', intent: 'general_question' },
        { text: 'explain stepover', intent: 'general_question' },
        { text: 'how does adaptive clearing work', intent: 'general_question' },

        // Greetings
        { text: 'hello', intent: 'greeting' },
        { text: 'hi', intent: 'greeting' },
        { text: 'hey there', intent: 'greeting' },

        // Help
        { text: 'help', intent: 'help_request' },
        { text: 'what can you do', intent: 'help_request' },
        { text: 'how do I use this', intent: 'help_request' }
    ],

    /**
     * Initialize and train the classifier
     */
    initialize: function() {
        console.log('[Intent Classifier] Initializing...');

        // Initialize NLP
        PRISM_NLP_ENGINE.initVocab();
        this.embedding = PRISM_NLP_ENGINE.createEmbedding(32);

        // Build model
        const inputSize = 32 * 20; // embeddingDim * maxSeqLen
        const hiddenSize = 64;
        const outputSize = this.intents.length;

        // Simple feedforward network using inline Dense implementation
        class DenseLayer {
            constructor(i, o, a) {
                this.inputSize = i; this.outputSize = o; this.activation = a;
                const scale = Math.sqrt(2.0 / (i + o));
                this.weights = PRISM_TENSOR_ENHANCED.randomNormal([i, o], 0, scale);
                this.biases = Array(o).fill(0);
                this.mW = PRISM_TENSOR_ENHANCED.zeros([i, o]);
                this.vW = PRISM_TENSOR_ENHANCED.zeros([i, o]);
                this.mB = Array(o).fill(0);
                this.vB = Array(o).fill(0);
                this.t = 0;
            }
            forward(input) {
                this.lastInput = [...input];
                const output = Array(this.outputSize).fill(0);
                for (let j = 0; j < this.outputSize; j++) {
                    let sum = this.biases[j];
                    for (let i = 0; i < this.inputSize; i++) {
                        sum += input[i] * this.weights[i][j];
                    }
                    if (this.activation === 'relu') {
                        output[j] = Math.max(0, sum);
                    } else if (this.activation === 'softmax') {
                        output[j] = sum; // Will apply softmax after all outputs computed
                    } else {
                        output[j] = sum;
                    }
                }
                // Apply softmax if needed
                if (this.activation === 'softmax') {
                    const max = Math.max(...output);
                    const exps = output.map(o => Math.exp(o - max));
                    const sumExp = exps.reduce((a, b) => a + b, 0);
                    this.lastOutput = exps.map(e => e / sumExp);
                    return this.lastOutput;
                }
                this.lastOutput = output;
                return output;
            }
            backward(grad, lr) {
                this.t++;
                const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
                const gradIn = Array(this.inputSize).fill(0);
                for (let j = 0; j < this.outputSize; j++) {
                    const g = this.activation === 'relu' && this.lastOutput[j] <= 0 ? 0 : grad[j];
                    this.mB[j] = beta1 * this.mB[j] + (1 - beta1) * g;
                    this.vB[j] = beta2 * this.vB[j] + (1 - beta2) * g * g;
                    this.biases[j] -= lr * (this.mB[j] / (1 - Math.pow(beta1, this.t))) /
                        (Math.sqrt(this.vB[j] / (1 - Math.pow(beta2, this.t))) + eps);
                    for (let i = 0; i < this.inputSize; i++) {
                        const gW = g * this.lastInput[i];
                        this.mW[i][j] = beta1 * this.mW[i][j] + (1 - beta1) * gW;
                        this.vW[i][j] = beta2 * this.vW[i][j] + (1 - beta2) * gW * gW;
                        this.weights[i][j] -= lr * (this.mW[i][j] / (1 - Math.pow(beta1, this.t))) /
                            (Math.sqrt(this.vW[i][j] / (1 - Math.pow(beta2, this.t))) + eps);
                        gradIn[i] += g * this.weights[i][j];
                    }
                }
                return gradIn;
            }
        }
        this.model = {
            layers: [
                new DenseLayer(inputSize, hiddenSize, 'relu'),
                new DenseLayer(hiddenSize, outputSize, 'softmax')
            ]
        };
        // Train model
        this.train();

        console.log('[Intent Classifier] Ready');
        return true;
    },
    /**
     * Prepare input from text
     */
    prepareInput: function(text) {
        const tokens = PRISM_NLP_ENGINE.tokenize(text);
        const padded = PRISM_NLP_ENGINE.padSequence(tokens, 20);
        const embedded = this.embedding.embed(padded);
        return PRISM_TENSOR_ENHANCED.flatten(embedded);
    },
    /**
     * Train the model
     */
    train: function(epochs = 50) {
        const lr = 0.01;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            // Shuffle training data
            const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);

            for (const sample of shuffled) {
                const input = this.prepareInput(sample.text);
                const targetIdx = this.intents.indexOf(sample.intent);
                const target = Array(this.intents.length).fill(0);
                target[targetIdx] = 1;

                // Forward
                let current = input;
                for (const layer of this.model.layers) {
                    current = layer.forward(current);
                }
                // Cross-entropy loss gradient
                const grad = current.map((o, i) => o - target[i]);
                totalLoss += -Math.log(Math.max(1e-15, current[targetIdx]));

                // Backward
                let g = grad;
                for (let i = this.model.layers.length - 1; i >= 0; i--) {
                    g = this.model.layers[i].backward(g, lr);
                }
            }
            if (epoch % 10 === 0) {
                console.log(`[Intent Classifier] Epoch ${epoch}, Loss: ${(totalLoss / shuffled.length).toFixed(4)}`);
            }
        }
    },
    /**
     * Classify intent
     */
    classify: function(text) {
        if (!this.model) this.initialize();

        const input = this.prepareInput(text);

        let current = input;
        for (const layer of this.model.layers) {
            current = layer.forward(current);
        }
        const maxIdx = current.indexOf(Math.max(...current));
        const confidence = current[maxIdx];

        return {
            intent: this.intents[maxIdx],
            confidence,
            allScores: this.intents.map((intent, i) => ({
                intent,
                score: current[i]
            })).sort((a, b) => b.score - a.score)
        };
    }
}