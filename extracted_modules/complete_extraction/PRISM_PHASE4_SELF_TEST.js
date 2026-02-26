const PRISM_PHASE4_SELF_TEST = {
    runAll: function() {
        console.log('\n╔══════════════════════════════════════════════════════════════════╗');
        console.log('║  PRISM Phase 4 Innovation Layer Self-Test                       ║');
        console.log('║  20 Cross-Domain PRISM-Exclusive Innovations                    ║');
        console.log('╚══════════════════════════════════════════════════════════════════╝\n');
        
        const results = { passed: 0, failed: 0, tests: [] };
        
        // Test 1: Swarm Toolpath
        try {
            const features = [
                { x: 0, y: 0, z: 0 },
                { x: 100, y: 0, z: 0 },
                { x: 50, y: 50, z: 0 },
                { x: 100, y: 100, z: 0 },
                { x: 0, y: 100, z: 0 }
            ];
            const result = PRISM_SWARM_TOOLPATH.optimizeSequence(features, { iterations: 20 });
            if (result.sequence.length === 5 && result.distance > 0) {
                results.passed++;
                results.tests.push({ name: 'Swarm Toolpath (ACO)', status: 'PASS', detail: result.improvement });
            } else throw new Error('Invalid sequence');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Swarm Toolpath (ACO)', status: 'FAIL', error: e.message });
        }
        
        // Test 2: RL Adaptive
        try {
            const controller = PRISM_RL_ADAPTIVE_MACHINING.createController();
            const state = [200, 0.2, 2, 0.1, 400, 0.3];  // [speed, feed, doc, vib, temp, wear]
            const action = PRISM_RL_ADAPTIVE_MACHINING.getAction(controller, state);
            if (action.action.length === 3 && action.filteredState.length === 6) {
                results.passed++;
                results.tests.push({ name: 'RL Adaptive (Actor-Critic+Kalman)', status: 'PASS' });
            } else throw new Error('Invalid action');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'RL Adaptive (Actor-Critic+Kalman)', status: 'FAIL', error: e.message });
        }
        
        // Test 3: FFT Chatter
        try {
            const signal = Array(256).fill(0).map((_, i) => Math.sin(i * 0.1) + Math.sin(i * 0.5) * 0.5);
            const result = PRISM_FFT_PREDICTIVE_CHATTER.analyzeVibration(signal, 10000, 5000);
            if (result.dominantFrequencies.length > 0 && result.riskScore >= 0) {
                results.passed++;
                results.tests.push({ name: 'FFT Chatter Prediction', status: 'PASS', detail: result.riskLevel });
            } else throw new Error('Invalid analysis');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'FFT Chatter Prediction', status: 'FAIL', error: e.message });
        }
        
        // Test 4: ML Feature Recognition
        try {
            const model = PRISM_ML_FEATURE_RECOGNITION.createModel();
            if (model.conv1 && model.fc2 && model.featureNames.length > 0) {
                results.passed++;
                results.tests.push({ name: 'ML Feature Recognition (CNN)', status: 'PASS' });
            } else throw new Error('Invalid model');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'ML Feature Recognition (CNN)', status: 'FAIL', error: e.message });
        }
        
        // Test 5: Bayesian Tool Life
        try {
            const predictor = PRISM_BAYESIAN_TOOL_LIFE.createPredictor();
            predictor.gp.X_train = [[200, 0.2, 2]];
            predictor.gp.y_train = [45];
            const prediction = PRISM_BAYESIAN_TOOL_LIFE.predict(predictor, { speed: 250, feed: 0.25, doc: 2.5 });
            if (prediction.mean > 0 && prediction.confidence95.length === 2) {
                results.passed++;
                results.tests.push({ name: 'Bayesian Tool Life (GP+Taylor)', status: 'PASS' });
            } else throw new Error('Invalid prediction');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Bayesian Tool Life (GP+Taylor)', status: 'FAIL', error: e.message });
        }
        
        // Test 6: Swarm Neural
        try {
            const func = (x) => x[0] * x[0] + x[1] * x[1];
            const result = PRISM_SWARM_NEURAL_HYBRID.optimize(func, [[-5, 5], [-5, 5]], { maxIterations: 20 });
            if (result.bestPosition.length === 2) {
                results.passed++;
                results.tests.push({ name: 'Swarm-Neural Hybrid (PSO+NN)', status: 'PASS' });
            } else throw new Error('Invalid result');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Swarm-Neural Hybrid (PSO+NN)', status: 'FAIL', error: e.message });
        }
        
        // Test 7: Thermal Compensation
        try {
            const system = PRISM_THERMAL_COMPENSATION.createSystem({ numSensors: 3 });
            const result = PRISM_THERMAL_COMPENSATION.update(system, [25, 26, 24]);
            if (result.currentError && result.compensation) {
                results.passed++;
                results.tests.push({ name: 'Thermal Compensation (Kalman)', status: 'PASS' });
            } else throw new Error('Invalid result');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Thermal Compensation (Kalman)', status: 'FAIL', error: e.message });
        }
        
        // Test 8: Hybrid Scheduling
        try {
            const jobs = [
                { id: 'J1', operations: [{ machine: 0, duration: 3 }, { machine: 1, duration: 2 }] },
                { id: 'J2', operations: [{ machine: 1, duration: 4 }, { machine: 0, duration: 2 }] }
            ];
            const machines = [{ id: 'M1' }, { id: 'M2' }];
            const result = PRISM_HYBRID_SCHEDULING.schedule(jobs, machines, { generations: 20 });
            if (result.makespan > 0 && result.schedule.length === 2) {
                results.passed++;
                results.tests.push({ name: 'Hybrid Scheduling (GA+PSO)', status: 'PASS', detail: `Makespan: ${result.makespan}` });
            } else throw new Error('Invalid schedule');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Hybrid Scheduling (GA+PSO)', status: 'FAIL', error: e.message });
        }
        
        // Test 9: Adaptive SPC
        try {
            const system = PRISM_ADAPTIVE_SPC.createSystem({ initialMean: 10, initialStd: 0.5 });
            const result = PRISM_ADAPTIVE_SPC.addMeasurement(system, 10.1);
            if (result.ucl > result.lcl && result.inControl !== undefined) {
                results.passed++;
                results.tests.push({ name: 'Adaptive SPC (Bayesian)', status: 'PASS' });
            } else throw new Error('Invalid SPC');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Adaptive SPC (Bayesian)', status: 'FAIL', error: e.message });
        }
        
        // Test 10: Knowledge Fusion
        try {
            const problem = { type: 'optimize cutting parameters', requirements: {} };
            const result = PRISM_KNOWLEDGE_FUSION.suggestFusion(problem);
            if (result.recommendations.length > 0) {
                results.passed++;
                results.tests.push({ name: 'Knowledge Fusion Engine', status: 'PASS', detail: result.bestFusion?.fusionType });
            } else throw new Error('No recommendations');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Knowledge Fusion Engine', status: 'FAIL', error: e.message });
        }
        
        // Test 11: Gateway Registration
        try {
            const gatewayResult = PRISM_PHASE4_GATEWAY.registerAll();
            if (gatewayResult.registered >= 30) {
                results.passed++;
                results.tests.push({ name: 'Gateway Routes', status: 'PASS', detail: `${gatewayResult.registered} routes` });
            } else throw new Error('Not enough routes');
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Gateway Routes', status: 'FAIL', error: e.message });
        }
        
        // Print results
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('SELF-TEST RESULTS');
        console.log('═══════════════════════════════════════════════════════════════════\n');
        
        for (const test of results.tests) {
            const icon = test.status === 'PASS' ? '✓' : '✗';
            const detail = test.detail ? ` (${test.detail})` : '';
            const error = test.error ? ` - ${test.error}` : '';
            console.log(`${icon} ${test.name}: ${test.status}${detail}${error}`);
        }
        
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log(`TOTAL: ${results.passed}/${results.passed + results.failed} tests passed`);
        console.log('Phase 4: 20 Innovations | PRISM-Exclusive Features');
        console.log('═══════════════════════════════════════════════════════════════════\n');
        
        return results;
    }
}