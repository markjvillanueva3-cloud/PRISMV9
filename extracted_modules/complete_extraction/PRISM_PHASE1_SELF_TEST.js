const PRISM_PHASE1_SELF_TEST = {
    name: 'Phase 1 Self-Test Suite',
    version: '1.0.0',
    
    runAll: function() {
        console.log('╔══════════════════════════════════════════════════════════════════╗');
        console.log('║  PRISM Phase 1 Self-Test Suite                                   ║');
        console.log('╚══════════════════════════════════════════════════════════════════╝');
        
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test 1: PSO Speed/Feed
        try {
            const psoResult = PRISM_PHASE1_OPTIMIZERS.psoSpeedFeed({
                material: { taylorN: 0.25, taylorC: 300 },
                tool: { noseRadius: 0.8 },
                machine: {}
            });
            
            if (psoResult.optimizedParams && psoResult.confidence > 0) {
                results.passed++;
                results.tests.push({ name: 'PSO Speed/Feed', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'PSO Speed/Feed', status: 'FAIL', error: e.message });
        }
        
        // Test 2: ACO Hole Sequence
        try {
            const holes = [
                { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
                { x: 0, y: 10 }, { x: 5, y: 5 }
            ];
            const acoResult = PRISM_PHASE1_OPTIMIZERS.acoHoleSequence(holes);
            
            if (acoResult.sequence && acoResult.distance > 0) {
                results.passed++;
                results.tests.push({ name: 'ACO Hole Sequence', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'ACO Hole Sequence', status: 'FAIL', error: e.message });
        }
        
        // Test 3: Genetic Algorithm
        try {
            const points = [
                { x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 },
                { x: 10, y: 10 }, { x: 0, y: 10 }
            ];
            const gaResult = PRISM_PHASE1_OPTIMIZERS.geneticToolpath(points);
            
            if (gaResult.sequence && gaResult.fitness > 0) {
                results.passed++;
                results.tests.push({ name: 'Genetic Algorithm', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Genetic Algorithm', status: 'FAIL', error: e.message });
        }
        
        // Test 4: Taylor Tool Life
        try {
            const taylorResult = PRISM_PHASE1_MANUFACTURING.taylorToolLife(150, 'steel');
            
            if (taylorResult.toolLife > 0 && taylorResult.n === 0.25) {
                results.passed++;
                results.tests.push({ name: 'Taylor Tool Life', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Taylor Tool Life', status: 'FAIL', error: e.message });
        }
        
        // Test 5: Merchant Force
        try {
            const forceResult = PRISM_PHASE1_MANUFACTURING.merchantForce({
                shearStrength: 400,
                chipThickness: 0.1,
                width: 2
            });
            
            if (forceResult.cuttingForce > 0 && forceResult.thrustForce > 0) {
                results.passed++;
                results.tests.push({ name: 'Merchant Force', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Merchant Force', status: 'FAIL', error: e.message });
        }
        
        // Test 6: FFT Analysis
        try {
            const samples = [];
            for (let i = 0; i < 256; i++) {
                samples.push(Math.sin(2 * Math.PI * 50 * i / 1000));
            }
            const fftResult = PRISM_PHASE1_SIGNAL.fftAnalyze(samples, 1000);
            
            if (fftResult.magnitudes && fftResult.dominantFrequency > 0) {
                results.passed++;
                results.tests.push({ name: 'FFT Analysis', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'FFT Analysis', status: 'FAIL', error: e.message });
        }
        
        // Test 7: Stability Lobes
        try {
            const lobesResult = PRISM_PHASE1_SIGNAL.stabilityLobes({
                naturalFrequency: 500,
                dampingRatio: 0.03,
                numFlutes: 4
            });
            
            if (lobesResult.lobes && lobesResult.optimalRpm > 0) {
                results.passed++;
                results.tests.push({ name: 'Stability Lobes', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Stability Lobes', status: 'FAIL', error: e.message });
        }
        
        // Test 8: Butterworth Filter
        try {
            const data = Array(100).fill(0).map(() => Math.random());
            const filterResult = PRISM_PHASE1_SIGNAL.butterworthFilter(data, 100, 1000);
            
            if (filterResult.filtered && filterResult.filtered.length === data.length) {
                results.passed++;
                results.tests.push({ name: 'Butterworth Filter', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Butterworth Filter', status: 'FAIL', error: e.message });
        }
        
        // Test 9: Linear Regression
        try {
            const X = [[1], [2], [3], [4], [5]];
            const y = [2, 4, 6, 8, 10];
            const lrResult = PRISM_PHASE1_ML.linearPredict(X, y, [6]);
            
            if (Math.abs(lrResult.prediction - 12) < 0.1) {
                results.passed++;
                results.tests.push({ name: 'Linear Regression', status: 'PASS' });
            } else {
                throw new Error(`Expected ~12, got ${lrResult.prediction}`);
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Linear Regression', status: 'FAIL', error: e.message });
        }
        
        // Test 10: K-Means
        try {
            const data = [
                [1, 1], [1.5, 1.5], [2, 1],
                [8, 8], [8.5, 8], [9, 8.5]
            ];
            const kmeansResult = PRISM_PHASE1_ML.kmeansCluster(data, 2);
            
            if (kmeansResult.centroids && kmeansResult.centroids.length === 2) {
                results.passed++;
                results.tests.push({ name: 'K-Means Clustering', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'K-Means Clustering', status: 'FAIL', error: e.message });
        }
        
        // Test 11: Speed/Feed Calculator
        try {
            const calcResult = PRISM_PHASE1_SPEED_FEED_CALCULATOR.calculate({
                material: { taylorN: 0.25, taylorC: 300, shearStrength: 400 },
                tool: { diameter: 10, numFlutes: 4, noseRadius: 0.8 },
                machine: { naturalFrequency: 500 }
            });
            
            if (calcResult.speed > 0 && calcResult.rpm > 0 && calcResult.confidence > 0) {
                results.passed++;
                results.tests.push({ name: 'Speed/Feed Calculator', status: 'PASS' });
            } else {
                throw new Error('Invalid result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Speed/Feed Calculator', status: 'FAIL', error: e.message });
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