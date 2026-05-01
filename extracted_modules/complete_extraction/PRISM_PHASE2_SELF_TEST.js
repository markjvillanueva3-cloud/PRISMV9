const PRISM_PHASE2_SELF_TEST = {
    name: 'Phase 2 Self-Test Suite',
    version: '1.0.0',
    
    runAll: function() {
        console.log('╔══════════════════════════════════════════════════════════════════╗');
        console.log('║  PRISM Phase 2 Self-Test Suite - 50 Algorithms                  ║');
        console.log('╚══════════════════════════════════════════════════════════════════╝');
        
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test 1: NSGA-II
        try {
            const objectives = [x => x[0]*x[0], x => (x[0]-2)*(x[0]-2)];
            const result = PRISM_PHASE2_MULTI_OBJECTIVE.nsgaII(objectives, [[0, 4]], { maxGenerations: 20 });
            if (result.paretoFront && result.paretoFront.length > 0) {
                results.passed++;
                results.tests.push({ name: 'NSGA-II', status: 'PASS' });
            } else throw new Error('No Pareto front');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'NSGA-II', status: 'FAIL', error: e.message });
        }
        
        // Test 2: Interior Point
        try {
            const result = PRISM_PHASE2_CONSTRAINED.interiorPoint(
                x => x[0]*x[0] + x[1]*x[1],
                [x => x[0] + x[1] - 1],
                [0.1, 0.1]
            );
            if (result.optimal && result.value < 1) {
                results.passed++;
                results.tests.push({ name: 'Interior Point', status: 'PASS' });
            } else throw new Error('Invalid result');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Interior Point', status: 'FAIL', error: e.message });
        }
        
        // Test 3: Simulated Annealing
        try {
            const result = PRISM_PHASE2_METAHEURISTICS.simulatedAnnealing(
                x => x[0]*x[0],
                x => [x[0] + (Math.random() - 0.5)],
                [5]
            );
            if (Math.abs(result.optimal[0]) < 1) {
                results.passed++;
                results.tests.push({ name: 'Simulated Annealing', status: 'PASS' });
            } else throw new Error('Did not converge');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Simulated Annealing', status: 'FAIL', error: e.message });
        }
        
        // Test 4: SVM
        try {
            const X = [[0,0], [1,1], [2,2], [0,1], [1,0]];
            const y = [-1, 1, 1, -1, -1];
            const model = PRISM_PHASE2_ADVANCED_ML.svm(X, y);
            if (model.predict && model.supportVectors) {
                results.passed++;
                results.tests.push({ name: 'SVM', status: 'PASS' });
            } else throw new Error('Invalid model');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'SVM', status: 'FAIL', error: e.message });
        }
        
        // Test 5: DBSCAN
        try {
            const data = [[0,0], [0.1,0], [0,0.1], [5,5], [5.1,5], [5,5.1]];
            const result = PRISM_PHASE2_ADVANCED_ML.dbscan(data, 0.5, 2);
            if (result.numClusters === 2) {
                results.passed++;
                results.tests.push({ name: 'DBSCAN', status: 'PASS' });
            } else throw new Error(`Expected 2 clusters, got ${result.numClusters}`);
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'DBSCAN', status: 'FAIL', error: e.message });
        }
        
        // Test 6: PCA
        try {
            const X = [[1,2,3], [2,4,6], [3,6,9], [4,8,12]];
            const result = PRISM_PHASE2_ADVANCED_ML.pca(X, 2);
            if (result.components && result.components.length === 2) {
                results.passed++;
                results.tests.push({ name: 'PCA', status: 'PASS' });
            } else throw new Error('Invalid components');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'PCA', status: 'FAIL', error: e.message });
        }
        
        // Test 7: Q-Learning
        try {
            const env = {
                actions: ['left', 'right'],
                reset: () => 0,
                step: (s, a) => ({
                    nextState: a === 'right' ? Math.min(4, s + 1) : Math.max(0, s - 1),
                    reward: s === 3 && a === 'right' ? 1 : 0,
                    done: s === 4
                })
            };
            const result = PRISM_PHASE2_REINFORCEMENT_LEARNING.qLearning(env, { episodes: 100 });
            if (result.Q && Object.keys(result.Q).length > 0) {
                results.passed++;
                results.tests.push({ name: 'Q-Learning', status: 'PASS' });
            } else throw new Error('No Q-values');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Q-Learning', status: 'FAIL', error: e.message });
        }
        
        // Test 8: Process Capability
        try {
            const data = Array(100).fill(0).map(() => 50 + (Math.random() - 0.5) * 2);
            const result = PRISM_PHASE2_QUALITY_SYSTEM.processCapability(data, 48, 52);
            if (result.Cpk > 0 && result.Cp > 0) {
                results.passed++;
                results.tests.push({ name: 'Process Capability', status: 'PASS' });
            } else throw new Error('Invalid Cpk');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Process Capability', status: 'FAIL', error: e.message });
        }
        
        // Test 9: OEE
        try {
            const result = PRISM_PHASE2_QUALITY_SYSTEM.calculateOEE({
                plannedProductionTime: 480,
                actualRunTime: 400,
                totalParts: 1000,
                goodParts: 950,
                idealCycleTime: 0.3
            });
            if (result.oee > 0 && result.oee <= 100) {
                results.passed++;
                results.tests.push({ name: 'OEE', status: 'PASS' });
            } else throw new Error('Invalid OEE');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'OEE', status: 'FAIL', error: e.message });
        }
        
        // Test 10: Spectrogram
        try {
            const signal = Array(512).fill(0).map((_, i) => Math.sin(2 * Math.PI * 50 * i / 1000));
            const result = PRISM_PHASE2_ADVANCED_SIGNAL.spectrogram(signal, 1000);
            if (result.spectrogram && result.spectrogram.length > 0) {
                results.passed++;
                results.tests.push({ name: 'Spectrogram', status: 'PASS' });
            } else throw new Error('Invalid spectrogram');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Spectrogram', status: 'FAIL', error: e.message });
        }
        
        // Test 11: Hilbert Transform
        try {
            const signal = Array(128).fill(0).map((_, i) => Math.sin(2 * Math.PI * 10 * i / 128));
            const result = PRISM_PHASE2_ADVANCED_SIGNAL.hilbertTransform(signal);
            if (result.real && result.imaginary) {
                results.passed++;
                results.tests.push({ name: 'Hilbert Transform', status: 'PASS' });
            } else throw new Error('Invalid transform');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Hilbert Transform', status: 'FAIL', error: e.message });
        }
        
        // Test 12: Logistic Regression
        try {
            const X = [[0], [1], [2], [3], [4]];
            const y = [0, 0, 0, 1, 1];
            const model = PRISM_PHASE2_ADVANCED_ML.logisticRegression(X, y);
            if (model.predict && model.classify([2.5]) !== undefined) {
                results.passed++;
                results.tests.push({ name: 'Logistic Regression', status: 'PASS' });
            } else throw new Error('Invalid model');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Logistic Regression', status: 'FAIL', error: e.message });
        }
        
        // Test 13: Decision Tree
        try {
            const X = [[0,0], [1,0], [0,1], [1,1]];
            const y = [0, 1, 1, 0];
            const model = PRISM_PHASE2_ADVANCED_ML.decisionTree(X, y);
            if (model.tree && model.predict) {
                results.passed++;
                results.tests.push({ name: 'Decision Tree', status: 'PASS' });
            } else throw new Error('Invalid tree');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Decision Tree', status: 'FAIL', error: e.message });
        }
        
        // Test 14: Control Chart
        try {
            const data = Array(30).fill(0).map(() => 100 + (Math.random() - 0.5) * 10);
            const result = PRISM_PHASE2_QUALITY_SYSTEM.controlChart(data);
            if (result.UCL > result.mean && result.LCL < result.mean) {
                results.passed++;
                results.tests.push({ name: 'Control Chart', status: 'PASS' });
            } else throw new Error('Invalid limits');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Control Chart', status: 'FAIL', error: e.message });
        }
        
        // Test 15: Six Sigma
        try {
            const result = PRISM_PHASE2_QUALITY_SYSTEM.sixSigmaLevel(10, 5, 1000);
            if (result.sigmaLevel > 0 && result.dpmo > 0) {
                results.passed++;
                results.tests.push({ name: 'Six Sigma Level', status: 'PASS' });
            } else throw new Error('Invalid sigma');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Six Sigma Level', status: 'FAIL', error: e.message });
        }
        
        // Print results
        console.log('\n--- Test Results ---');
        for (const test of results.tests) {
            const icon = test.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${test.name}: ${test.status}${test.error ? ' - ' + test.error : ''}`);
        }
        
        console.log(`\nTotal: ${results.passed}/${results.passed + results.failed} passed`);
        
        return results;
    }
}