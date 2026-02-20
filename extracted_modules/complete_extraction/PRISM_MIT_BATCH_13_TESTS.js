const PRISM_MIT_BATCH_13_TESTS = {
    runAll: function() {
        console.log('=== PRISM MIT Batch 13 Self-Tests ===');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Gear geometry
        try {
            const gear = PRISM_GEAR_DESIGN.calculateGeometry(20, 8, 20, false);
            if (Math.abs(gear.pitchDiameter - 2.5) < 0.001) {
                console.log('✓ Gear geometry calculation');
                passed++;
            } else {
                throw new Error(`Expected 2.5, got ${gear.pitchDiameter}`);
            }
        } catch (e) {
            console.log('✗ Gear geometry:', e.message);
            failed++;
        }
        
        // Test 2: Gear train ratio
        try {
            const train = PRISM_GEAR_DESIGN.calculateGearTrain([
                { driver: 20, driven: 60 },
                { driver: 15, driven: 45 }
            ]);
            if (Math.abs(train.totalRatio - 9) < 0.001) {
                console.log('✓ Gear train ratio calculation');
                passed++;
            } else {
                throw new Error(`Expected 9, got ${train.totalRatio}`);
            }
        } catch (e) {
            console.log('✗ Gear train ratio:', e.message);
            failed++;
        }
        
        // Test 3: Gruebler DOF
        try {
            const dof = PRISM_MECHANISM_ANALYSIS.grueblerDOF(4, 4, 0);
            if (dof === 1) {
                console.log('✓ Gruebler DOF (4-bar = 1 DOF)');
                passed++;
            } else {
                throw new Error(`Expected 1, got ${dof}`);
            }
        } catch (e) {
            console.log('✗ Gruebler DOF:', e.message);
            failed++;
        }
        
        // Test 4: Newton-Raphson
        try {
            const f = x => x * x - 4;
            const df = x => 2 * x;
            const result = PRISM_NUMERICAL_METHODS_MIT.newtonRaphson(f, df, 1);
            if (result.converged && Math.abs(result.root - 2) < 1e-8) {
                console.log('✓ Newton-Raphson (√4 = 2)');
                passed++;
            } else {
                throw new Error(`Expected 2, got ${result.root}`);
            }
        } catch (e) {
            console.log('✗ Newton-Raphson:', e.message);
            failed++;
        }
        
        // Test 5: Process capability
        try {
            const cap = PRISM_DFM_MIT.processCapability(10, 0, 5, 1);
            if (Math.abs(cap.Cp - 1.667) < 0.01) {
                console.log('✓ Process capability Cp calculation');
                passed++;
            } else {
                throw new Error(`Expected ~1.667, got ${cap.Cp}`);
            }
        } catch (e) {
            console.log('✗ Process capability:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
}