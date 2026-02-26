const PRISM_AI_ENHANCEMENT_TESTS = {
    runAll: function() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('PRISM AI/ML ENHANCEMENT MODULE - SELF TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0;
        let failed = 0;
        
        // Test SARSA
        try {
            const Q = PRISM_RL_ENHANCED.SARSA.initQTable(['s1', 's2'], ['a1', 'a2']);
            PRISM_RL_ENHANCED.SARSA.update(Q, 's1', 'a1', 1, 's2', 'a2', 0.1, 0.99);
            console.log('✅ SARSA update');
            passed++;
        } catch (e) {
            console.log('❌ SARSA update:', e.message);
            failed++;
        }
        
        // Test Value Iteration
        try {
            const mdp = {
                states: ['s1', 's2'],
                actions: ['a1'],
                transitions: { s1: { a1: { s2: 1 } }, s2: { a1: { s2: 1 } } },
                rewards: { s1: 0, s2: 1 },
                gamma: 0.9
            };
            const result = PRISM_RL_ENHANCED.ValueIteration.solve(mdp);
            console.log('✅ Value Iteration');
            passed++;
        } catch (e) {
            console.log('❌ Value Iteration:', e.message);
            failed++;
        }
        
        // Test ELU
        try {
            const elu = PRISM_NN_ENHANCED.Activations.elu(-1);
            if (Math.abs(elu - (Math.exp(-1) - 1)) < 0.001) {
                console.log('✅ ELU activation');
                passed++;
            } else {
                throw new Error('Incorrect value');
            }
        } catch (e) {
            console.log('❌ ELU activation:', e.message);
            failed++;
        }
        
        // Test GELU
        try {
            const gelu = PRISM_NN_ENHANCED.Activations.gelu(0);
            if (Math.abs(gelu) < 0.001) {
                console.log('✅ GELU activation');
                passed++;
            } else {
                throw new Error('Incorrect value');
            }
        } catch (e) {
            console.log('❌ GELU activation:', e.message);
            failed++;
        }
        
        // Test AdaDelta
        try {
            const opt = PRISM_NN_ENHANCED.Optimizers.AdaDelta();
            const weights = [[1, 2], [3, 4]];
            const gradients = [[0.1, 0.2], [0.3, 0.4]];
            opt.step(weights, gradients);
            console.log('✅ AdaDelta optimizer');
            passed++;
        } catch (e) {
            console.log('❌ AdaDelta optimizer:', e.message);
            failed++;
        }
        
        // Test NAdam
        try {
            const opt = PRISM_NN_ENHANCED.Optimizers.NAdam();
            const weights = [[1, 2]];
            const gradients = [[0.1, 0.2]];
            opt.step(weights, gradients);
            console.log('✅ NAdam optimizer');
            passed++;
        } catch (e) {
            console.log('❌ NAdam optimizer:', e.message);
            failed++;
        }
        
        // Test DBSCAN
        try {
            const points = [[0, 0], [0, 1], [1, 0], [10, 10], [10, 11]];
            const labels = PRISM_CLUSTERING_ENHANCED.dbscan(points, 2, 2);
            if (labels[0] === labels[1] && labels[3] === labels[4] && labels[0] !== labels[3]) {
                console.log('✅ DBSCAN clustering');
                passed++;
            } else {
                throw new Error('Incorrect clustering');
            }
        } catch (e) {
            console.log('❌ DBSCAN clustering:', e.message);
            failed++;
        }
        
        // Test K-Medoids
        try {
            const points = [[0, 0], [1, 1], [10, 10], [11, 11]];
            const result = PRISM_CLUSTERING_ENHANCED.kmedoids(points, 2);
            console.log('✅ K-Medoids clustering');
            passed++;
        } catch (e) {
            console.log('❌ K-Medoids clustering:', e.message);
            failed++;
        }
        
        // Test Cross-correlation
        try {
            const x = [1, 2, 3];
            const y = [1, 2, 3];
            const xcorr = PRISM_SIGNAL_ENHANCED.crossCorrelation(x, y);
            if (xcorr.length === 5 && xcorr[2] === 14) { // Peak at center
                console.log('✅ Cross-correlation');
                passed++;
            } else {
                throw new Error('Incorrect correlation');
            }
        } catch (e) {
            console.log('❌ Cross-correlation:', e.message);
            failed++;
        }
        
        // Test MCMC
        try {
            const logProb = (x) => -0.5 * x[0] * x[0]; // Standard normal
            const result = PRISM_SIGNAL_ENHANCED.metropolisHastings(logProb, [0], 100, 1);
            console.log('✅ MCMC Metropolis-Hastings');
            passed++;
        } catch (e) {
            console.log('❌ MCMC Metropolis-Hastings:', e.message);
            failed++;
        }
        
        // Test MOEA/D
        try {
            const objective = (x) => [x[0] * x[0], (x[0] - 2) * (x[0] - 2)];
            const result = PRISM_EVOLUTIONARY_ENHANCED.MOEAD.optimize(
                objective, [[-5, 5]], { populationSize: 10, maxGenerations: 10 }
            );
            console.log('✅ MOEA/D optimization');
            passed++;
        } catch (e) {
            console.log('❌ MOEA/D optimization:', e.message);
            failed++;
        }
        
        // Test Gradient Saliency
        try {
            const model = { forward: (x) => [x[0] * 2 + x[1] * 3] };
            const saliency = PRISM_XAI_ENHANCED.gradientSaliency(model, [1, 1], 0);
            console.log('✅ Gradient Saliency');
            passed++;
        } catch (e) {
            console.log('❌ Gradient Saliency:', e.message);
            failed++;
        }
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed}/${passed + failed} tests passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}