const PRISM_CALCULATOR_ENHANCEMENT_TESTS = {
    runAllTests: function() {
        console.log('[PRISM_CALCULATOR_ENHANCEMENT] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Controller lookup
        try {
            const fanuc = PRISM_CONTROLLER_DATABASE.getController('fanuc_0i-MF');
            const pass = fanuc && fanuc.motion.lookAhead === 200;
            results.tests.push({ name: 'Controller lookup', pass, data: fanuc?.model });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Controller lookup', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Workholding rigidity calculation
        try {
            const rigidity = PRISM_WORKHOLDING_DATABASE.calculateRigidity({
                fixtureType: 'vise',
                partMass: 5,
                overhang: 20
            });
            const pass = rigidity.rigidity > 0.7 && rigidity.rigidity <= 1.0;
            results.tests.push({ name: 'Workholding rigidity', pass, rigidity: rigidity.rigidity });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Workholding rigidity', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Cross-CAM strategy mapping
        try {
            const strategy = PRISM_CROSSCAM_STRATEGY_MAP.mapStrategy('fusion360', 'Adaptive Clearing');
            const pass = strategy && strategy.prism === 'adaptive_pocket';
            results.tests.push({ name: 'Cross-CAM mapping', pass, prism: strategy?.prism });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Cross-CAM mapping', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Force calculation
        try {
            const forces = PRISM_CALCULATOR_PHYSICS_ENGINE.forces.millingForces({
                Kc: 2000,
                ae: 3,
                ap: 10,
                fz: 0.1,
                z: 4,
                D: 12,
                helixAngle: 35
            });
            const pass = forces.resultant > 0 && forces.torque > 0;
            results.tests.push({ name: 'Force calculation', pass, resultant: forces.resultant });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Force calculation', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Constraint application
        try {
            const constraints = PRISM_CALCULATOR_CONSTRAINT_ENGINE.applyAllConstraints({
                machine: { spindle: { maxRpm: 12000, minRpm: 100 } },
                tool: { solidTool: { diameter: 12, fluteLength: 30 } }
            });
            const pass = constraints.rpm.max === 12000 && constraints.toolDiameter === 12;
            results.tests.push({ name: 'Constraint application', pass, rpmMax: constraints.rpm.max });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Constraint application', pass: false, error: e.message });
            results.failed++;
        }
        // Test 6: PRISM Optimized availability
        try {
            const availability = PRISM_OPTIMIZED_MODE.isAvailable();
            const pass = typeof availability.available === 'boolean';
            results.tests.push({ name: 'PRISM Optimized check', pass, available: availability.available });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'PRISM Optimized check', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_CALCULATOR_ENHANCEMENT] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
}