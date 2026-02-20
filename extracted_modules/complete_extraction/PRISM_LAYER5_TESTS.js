const PRISM_LAYER5_TESTS = {
    runAll: function() {
        console.log('[PRISM-L5] Running self-tests...');
        const results = [];

        // Test 1: DH Forward Kinematics
        try {
            const config = PRISM_DH_KINEMATICS.machineConfigs.TABLE_TABLE_AC;
            const T = PRISM_DH_KINEMATICS.forwardKinematicsDH(config.dhParams, [100, 50, -50, 30, 45]);
            const pose = PRISM_DH_KINEMATICS.extractPose(T);

            results.push({
                test: 'DH Forward Kinematics',
                passed: pose.position && typeof pose.position.x === 'number',
                result: pose.position
            });
        } catch (e) {
            results.push({ test: 'DH Forward Kinematics', passed: false, error: e.message });
        }
        // Test 2: Closed-form IK
        try {
            const ikResult = PRISM_INVERSE_KINEMATICS_SOLVER.solveIKClosedForm(
                { x: 100, y: 50, z: -50 },
                { i: 0.5, j: 0.5, k: 0.707 },
                'TABLE_TABLE_AC',
                100
            );

            results.push({
                test: 'Closed-form IK',
                passed: ikResult.success && ikResult.solution,
                result: ikResult.solution
            });
        } catch (e) {
            results.push({ test: 'Closed-form IK', passed: false, error: e.message });
        }
        // Test 3: Jacobian computation
        try {
            const J = PRISM_JACOBIAN_ENGINE.computeAnalyticalJacobian5Axis(
                'BC',
                { x: 0, y: 0, z: 0, b: 30, c: 45 },
                100
            );

            results.push({
                test: 'Jacobian Computation',
                passed: J.length === 6 && J[0].length === 5,
                result: { rows: J.length, cols: J[0].length }
            });
        } catch (e) {
            results.push({ test: 'Jacobian Computation', passed: false, error: e.message });
        }
        // Test 4: Singularity detection
        try {
            const singCheck = PRISM_JACOBIAN_ENGINE.checkConfigSingularities('BC', { b: 0.5, c: 45 });

            results.push({
                test: 'Singularity Detection',
                passed: singCheck.singularities !== undefined,
                result: { hasSingularity: singCheck.hasSingularity, count: singCheck.singularities.length }
            });
        } catch (e) {
            results.push({ test: 'Singularity Detection', passed: false, error: e.message });
        }
        // Test 5: RTCP Compensation
        try {
            PRISM_RTCP_ENGINE.initialize(100, { pivotDistance: 200 });
            const comp = PRISM_RTCP_ENGINE.computeTCPCompensation(
                { x: 100, y: 50, z: 0 },
                { b: 30, c: 45 },
                'BC'
            );

            results.push({
                test: 'RTCP Compensation',
                passed: comp.compensated === true,
                result: { x: comp.x?.toFixed(3), y: comp.y?.toFixed(3), z: comp.z?.toFixed(3) }
            });
        } catch (e) {
            results.push({ test: 'RTCP Compensation', passed: false, error: e.message });
        }
        // Summary
        const passed = results.filter(r => r.passed).length;
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM-L5] Tests completed: ${passed}/${results.length} passed`);

        results.forEach(r => {
            const status = r.passed ? '✅' : '❌';
            console.log(`  ${status} ${r.test}`);
        });

        return { passed, total: results.length, results };
    }
}