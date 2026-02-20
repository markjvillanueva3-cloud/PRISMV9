const PRISM_SESSION1B_TESTS = {
    runAll: function() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('PRISM SESSION 1B AI/ML ENHANCEMENT TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0;
        let failed = 0;
        
        // Test Time Series
        try {
            const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const smoothed = PRISM_TIME_SERIES_COMPLETE.simpleExponentialSmoothing(data, 0.3);
            if (smoothed.length === 10) {
                console.log('✅ Time Series: Exponential Smoothing');
                passed++;
            } else throw new Error('Wrong length');
        } catch (e) {
            console.log('❌ Time Series: Exponential Smoothing -', e.message);
            failed++;
        }
        
        // Test Holt-Winters
        try {
            const seasonal = Array(36).fill(0).map((_, i) => Math.sin(i * Math.PI / 6) * 10 + 50 + i * 0.5);
            const hw = PRISM_TIME_SERIES_COMPLETE.holtWinters(seasonal, { seasonLength: 12 });
            if (hw.fitted && hw.forecast) {
                console.log('✅ Time Series: Holt-Winters');
                passed++;
            } else throw new Error('Missing output');
        } catch (e) {
            console.log('❌ Time Series: Holt-Winters -', e.message);
            failed++;
        }
        
        // Test Anomaly Detection
        try {
            const data = [1, 2, 3, 100, 4, 5, 6];
            const result = PRISM_TIME_SERIES_COMPLETE.detectAnomalies(data, { method: 'zscore', threshold: 2 });
            if (result.anomalies.length > 0 && result.anomalies[0].index === 3) {
                console.log('✅ Time Series: Anomaly Detection');
                passed++;
            } else throw new Error('Missed anomaly');
        } catch (e) {
            console.log('❌ Time Series: Anomaly Detection -', e.message);
            failed++;
        }
        
        // Test RUL Prediction
        try {
            const wear = [0.01, 0.02, 0.04, 0.07, 0.11];
            const rul = PRISM_TIME_SERIES_COMPLETE.predictRUL(wear, 0.3, { model: 'linear' });
            if (rul.rul !== null && rul.rul > 0) {
                console.log('✅ Time Series: RUL Prediction');
                passed++;
            } else throw new Error('Invalid RUL');
        } catch (e) {
            console.log('❌ Time Series: RUL Prediction -', e.message);
            failed++;
        }
        
        // Test GCN Layer
        try {
            const gcn = PRISM_GNN_COMPLETE.createGCNLayer(4, 8);
            const features = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]];
            const adj = [[1, 1, 0], [1, 1, 1], [0, 1, 1]];
            const output = gcn.forward(features, adj);
            if (output.length === 3 && output[0].length === 8) {
                console.log('✅ GNN: GCN Layer');
                passed++;
            } else throw new Error('Wrong dimensions');
        } catch (e) {
            console.log('❌ GNN: GCN Layer -', e.message);
            failed++;
        }
        
        // Test GAT Layer
        try {
            const gat = PRISM_GNN_COMPLETE.createGATLayer(4, 8, 2);
            const features = [[1, 2, 3, 4], [5, 6, 7, 8]];
            const adj = [[1, 1], [1, 1]];
            const output = gat.forward(features, adj);
            if (output.length === 2) {
                console.log('✅ GNN: GAT Layer');
                passed++;
            } else throw new Error('Wrong output');
        } catch (e) {
            console.log('❌ GNN: GAT Layer -', e.message);
            failed++;
        }
        
        // Test Experience Buffer
        try {
            const buffer = PRISM_ONLINE_LEARNING_COMPLETE.createExperienceBuffer(100);
            buffer.add({ state: [1, 2], action: 0, reward: 1 });
            buffer.add({ state: [3, 4], action: 1, reward: 0 });
            const { samples } = buffer.sampleUniform(2);
            if (samples.length === 2) {
                console.log('✅ Online Learning: Experience Buffer');
                passed++;
            } else throw new Error('Wrong sample count');
        } catch (e) {
            console.log('❌ Online Learning: Experience Buffer -', e.message);
            failed++;
        }
        
        // Test Drift Detector
        try {
            const detector = PRISM_ONLINE_LEARNING_COMPLETE.createDriftDetector({ windowSize: 10 });
            for (let i = 0; i < 20; i++) detector.add(0.1);
            for (let i = 0; i < 20; i++) detector.add(0.9);
            const result = detector.detect();
            if (result.drift === true) {
                console.log('✅ Online Learning: Drift Detection');
                passed++;
            } else throw new Error('Missed drift');
        } catch (e) {
            console.log('❌ Online Learning: Drift Detection -', e.message);
            failed++;
        }
        
        // Test Hyperopt Grid Search
        try {
            const space = {
                lr: PRISM_HYPEROPT_COMPLETE.searchSpace.uniform(0.001, 0.1),
                layers: PRISM_HYPEROPT_COMPLETE.searchSpace.intUniform(1, 3)
            };
            const result = PRISM_HYPEROPT_COMPLETE.gridSearch(space, (p) => Math.abs(p.lr - 0.01), { maxTrials: 20 });
            if (result.bestParams && result.bestScore !== undefined) {
                console.log('✅ Hyperopt: Grid Search');
                passed++;
            } else throw new Error('Missing results');
        } catch (e) {
            console.log('❌ Hyperopt: Grid Search -', e.message);
            failed++;
        }
        
        // Test LR Scheduler
        try {
            const scheduler = PRISM_LR_SCHEDULER_COMPLETE.createScheduler({
                type: 'warmup_cosine',
                baseLR: 0.001,
                warmupSteps: 10,
                totalSteps: 100
            });
            const lr1 = scheduler.getLR(); // Should be 0 (start of warmup)
            scheduler.step = 50;
            const lr2 = scheduler.getLR();
            if (lr2 > 0 && lr2 <= 0.001) {
                console.log('✅ LR Scheduler: Warmup Cosine');
                passed++;
            } else throw new Error('Invalid LR values');
        } catch (e) {
            console.log('❌ LR Scheduler: Warmup Cosine -', e.message);
            failed++;
        }
        
        // Test Active Learning
        try {
            const model = { predict: (x) => ({ confidence: 0.3 + Math.random() * 0.4 }) };
            const unlabeled = [{ features: [1, 2] }, { features: [3, 4] }, { features: [5, 6] }];
            const queries = PRISM_ACTIVE_LEARNING_COMPLETE.selectQueries(model, unlabeled, { batchSize: 2 });
            if (queries.length === 2) {
                console.log('✅ Active Learning: Query Selection');
                passed++;
            } else throw new Error('Wrong query count');
        } catch (e) {
            console.log('❌ Active Learning: Query Selection -', e.message);
            failed++;
        }
        
        // Test Uncertainty
        try {
            const entropy = PRISM_UNCERTAINTY_COMPLETE.predictiveEntropy([0.5, 0.5]);
            if (Math.abs(entropy - 1.0) < 0.01) {
                console.log('✅ Uncertainty: Predictive Entropy');
                passed++;
            } else throw new Error('Wrong entropy');
        } catch (e) {
            console.log('❌ Uncertainty: Predictive Entropy -', e.message);
            failed++;
        }
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed}/${passed + failed} tests passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}