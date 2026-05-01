const PRISM_SESSION1_TESTS = {
    runAll: function() {
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('PRISM SESSION 1: AI/ML ENHANCEMENT - SELF TESTS');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test Q-Learning
        this._test(results, 'Q-Learning Create Agent', () => {
            const agent = PRISM_RL_COMPLETE.QLearning.createAgent(['s1', 's2'], ['a1', 'a2']);
            return agent.Q.size === 2 && agent.actions.length === 2;
        });
        
        this._test(results, 'Q-Learning Update', () => {
            const agent = PRISM_RL_COMPLETE.QLearning.createAgent(['s1', 's2'], ['a1', 'a2']);
            const { tdError } = PRISM_RL_COMPLETE.QLearning.update(
                agent, 's1', 'a1', 1, 's2', false, 0.1, 0.99
            );
            return !isNaN(tdError);
        });
        
        // Test Value Iteration
        this._test(results, 'Value Iteration Solve', () => {
            const mdp = {
                states: ['s1', 's2', 's3'],
                actions: ['a1', 'a2'],
                transitions: {
                    s1: { a1: { s2: 0.8, s1: 0.2 }, a2: { s3: 0.9, s1: 0.1 } },
                    s2: { a1: { s3: 1 }, a2: { s1: 1 } },
                    s3: { a1: { s3: 1 }, a2: { s3: 1 } }
                },
                rewards: { s1: 0, s2: 1, s3: 10 },
                gamma: 0.9
            };
            const { V, policy } = PRISM_RL_COMPLETE.ValueIteration.solve(mdp);
            return V['s3'] > V['s1'] && policy['s1'] !== null;
        });
        
        // Test Policy Gradient
        this._test(results, 'Policy Gradient Create Agent', () => {
            const agent = PRISM_RL_COMPLETE.PolicyGradient.createAgent(4, 2);
            return agent.W.length === 4 && agent.W[0].length === 2;
        });
        
        // Test Actor-Critic
        this._test(results, 'Actor-Critic Create Agent', () => {
            const agent = PRISM_RL_COMPLETE.ActorCritic.createAgent(4, 3);
            return agent.actor.W.length === 4 && agent.critic.w.length === 4;
        });
        
        // Test K-Medoids
        this._test(results, 'K-Medoids Clustering', () => {
            const data = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]];
            const result = PRISM_CLUSTERING_COMPLETE.KMedoids.cluster(data, 2);
            return result.labels.length === 6 && result.medoids.length === 2;
        });
        
        // Test Mean Shift
        this._test(results, 'Mean Shift Clustering', () => {
            const data = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]];
            const result = PRISM_CLUSTERING_COMPLETE.MeanShift.cluster(data);
            return result.labels.length === 6 && result.numClusters >= 1;
        });
        
        // Test Spectral Clustering
        this._test(results, 'Spectral Clustering', () => {
            const data = [[0, 0], [1, 0], [0, 1], [1, 1], [5, 5], [6, 5], [5, 6], [6, 6]];
            const result = PRISM_CLUSTERING_COMPLETE.SpectralClustering.cluster(data, 2);
            return result.labels.length === 8;
        });
        
        // Test Quantization
        this._test(results, 'Weight Quantization', () => {
            const weights = [[0.5, -0.3], [0.1, 0.8]];
            const { quantized, scale, compressionRatio } = PRISM_MODEL_COMPRESSION.Quantization.quantizeWeights(weights, 8);
            const dequantized = PRISM_MODEL_COMPRESSION.Quantization.dequantizeWeights(quantized, scale, 0);
            return compressionRatio === 4 && dequantized.length === 2;
        });
        
        // Test Pruning
        this._test(results, 'Magnitude Pruning', () => {
            const weights = [[0.1, 0.5, 0.3], [0.2, 0.8, 0.05]];
            const { pruned, actualSparsity } = PRISM_MODEL_COMPRESSION.Pruning.magnitudePrune(weights, 0.5);
            const zeros = pruned.flat().filter(w => w === 0).length;
            return zeros >= 2;
        });
        
        // Test LIME
        this._test(results, 'LIME Explanation', () => {
            const predictFn = (x) => x[0] * 2 + x[1] * 3;
            const explanation = PRISM_XAI_COMPLETE.LIME.explain(predictFn, [1, 2], 100, 2);
            return explanation.explanation.length === 2;
        });
        
        // Test SHAP
        this._test(results, 'SHAP Explanation', () => {
            const predictFn = (x) => x[0] + x[1];
            const background = [[0, 0], [1, 1], [2, 2]];
            const explanation = PRISM_XAI_COMPLETE.SHAP.explain(predictFn, [1, 2], background, 50);
            return explanation.shapValues.length === 2;
        });
        
        // Test Scaled Dot-Product Attention
        this._test(results, 'Scaled Dot-Product Attention', () => {
            const Q = [[1, 0, 0, 0], [0, 1, 0, 0]];
            const K = [[1, 0, 0, 0], [0, 1, 0, 0]];
            const V = [[1, 2, 3, 4], [5, 6, 7, 8]];
            const { output, attentionWeights } = PRISM_ATTENTION_COMPLETE.ScaledDotProduct.attention(Q, K, V);
            return output.length === 2 && attentionWeights.length === 2;
        });
        
        // Test Multi-Head Attention
        this._test(results, 'Multi-Head Attention', () => {
            const weights = PRISM_ATTENTION_COMPLETE.MultiHead.init(8, 2);
            const X = [[1, 0, 0, 0, 1, 0, 0, 0], [0, 1, 0, 0, 0, 1, 0, 0]];
            const { output } = PRISM_ATTENTION_COMPLETE.MultiHead.forward(weights, X);
            return output.length === 2 && output[0].length === 8;
        });
        
        // Test Transformer Encoder
        this._test(results, 'Transformer Encoder', () => {
            const weights = PRISM_ATTENTION_COMPLETE.TransformerEncoder.init(8, 2, 16);
            const X = [[1, 0, 0, 0, 1, 0, 0, 0], [0, 1, 0, 0, 0, 1, 0, 0]];
            const output = PRISM_ATTENTION_COMPLETE.TransformerEncoder.forward(weights, X);
            return output.length === 2 && output[0].length === 8;
        });
        
        // Test Positional Encoding
        this._test(results, 'Positional Encoding', () => {
            const PE = PRISM_ATTENTION_COMPLETE.PositionalEncoding.sinusoidal(10, 8);
            return PE.length === 10 && PE[0].length === 8;
        });
        
        // Summary
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log(`TESTS COMPLETE: ${results.passed}/${results.passed + results.failed} PASSED`);
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        
        return results;
    },
    
    _test: function(results, name, testFn) {
        try {
            if (testFn()) {
                console.log(`  ✓ ${name}`);
                results.passed++;
                results.tests.push({ name, passed: true });
            } else {
                console.log(`  ✗ ${name}: FAILED`);
                results.failed++;
                results.tests.push({ name, passed: false, error: 'Test returned false' });
            }
        } catch (e) {
            console.log(`  ✗ ${name}: ${e.message}`);
            results.failed++;
            results.tests.push({ name, passed: false, error: e.message });
        }
    }
}