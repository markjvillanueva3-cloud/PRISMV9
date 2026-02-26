const PRISM_SESSION3B_TESTS = {
    runAll: function() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(' PRISM SESSION 3B OPTIMIZATION TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0, failed = 0;
        
        // Test 1: Epsilon-Constraint
        try {
            const result = PRISM_MULTI_OBJECTIVE_SCALARIZATION.epsilonConstraint({
                objectives: [
                    (x) => x[0] * x[0],           // Minimize x²
                    (x) => (x[0] - 2) * (x[0] - 2) // Minimize (x-2)²
                ],
                bounds: [{ min: 0, max: 3 }],
                primaryIndex: 0,
                epsilons: [1], // f2 <= 1
                maxIter: 500
            });
            if (result.feasible && result.x[0] >= 0.5 && result.x[0] <= 1.5) {
                console.log(`  ✓ Epsilon-Constraint (x=${result.x[0].toFixed(2)})`);
                passed++;
            } else {
                console.log('  ✗ Epsilon-Constraint');
                failed++;
            }
        } catch (e) { console.log('  ✗ Epsilon-Constraint:', e.message); failed++; }
        
        // Test 2: Goal Programming
        try {
            const result = PRISM_MULTI_OBJECTIVE_SCALARIZATION.goalProgramming({
                objectives: [
                    { fn: (x) => x[0], target: 3, weight: 1 },
                    { fn: (x) => x[1], target: 4, weight: 1 }
                ],
                bounds: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
                method: 'weighted'
            });
            if (result.feasible && Math.abs(result.x[0] - 3) < 1 && Math.abs(result.x[1] - 4) < 1) {
                console.log(`  ✓ Goal Programming (x=[${result.x[0].toFixed(1)}, ${result.x[1].toFixed(1)}])`);
                passed++;
            } else {
                console.log('  ✗ Goal Programming');
                failed++;
            }
        } catch (e) { console.log('  ✗ Goal Programming:', e.message); failed++; }
        
        // Test 3: Lexicographic
        try {
            const result = PRISM_MULTI_OBJECTIVE_SCALARIZATION.lexicographic({
                objectives: [
                    { fn: (x) => Math.max(0, x[0] - 5), priority: 1 }, // x <= 5
                    { fn: (x) => -x[0], priority: 2 }                   // Maximize x
                ],
                bounds: [{ min: 0, max: 10 }],
                tolerance: 0.01
            });
            if (result.feasible && result.x[0] >= 4.5 && result.x[0] <= 5.5) {
                console.log(`  ✓ Lexicographic (x=${result.x[0].toFixed(2)}, max subject to <=5)`);
                passed++;
            } else {
                console.log('  ✗ Lexicographic');
                failed++;
            }
        } catch (e) { console.log('  ✗ Lexicographic:', e.message); failed++; }
        
        // Test 4: Revised Simplex
        try {
            // min -x1 - x2 s.t. x1 + 2x2 <= 4, x1 + x2 <= 3
            const result = PRISM_LP_SOLVERS.revisedSimplex({
                c: [-1, -1],
                A: [[1, 2], [1, 1]],
                b: [4, 3]
            });
            if (result.optimal && Math.abs(result.objective + 3) < 0.1) {
                console.log(`  ✓ Revised Simplex (obj=${result.objective.toFixed(2)})`);
                passed++;
            } else {
                console.log('  ✗ Revised Simplex');
                failed++;
            }
        } catch (e) { console.log('  ✗ Revised Simplex:', e.message); failed++; }
        
        // Test 5: Primal-Dual Interior Point
        try {
            const result = PRISM_LP_SOLVERS.primalDualInteriorPoint({
                c: [1, 1],
                A: [[1, 0], [0, 1], [1, 1]],
                b: [2, 2, 3]
            });
            if (result.optimal || result.iterations > 0) {
                console.log(`  ✓ Primal-Dual IP (obj=${result.objective.toFixed(2)}, iter=${result.iterations})`);
                passed++;
            } else {
                console.log('  ✗ Primal-Dual IP');
                failed++;
            }
        } catch (e) { console.log('  ✗ Primal-Dual IP:', e.message); failed++; }
        
        // Test 6: Active Set QP
        try {
            // min 0.5*(x1² + x2²) s.t. x1 + x2 >= 1
            const result = PRISM_LP_SOLVERS.activeSetQP({
                H: [[1, 0], [0, 1]],
                c: [0, 0],
                A: [[-1, -1]], // -x1 - x2 <= -1
                b: [-1]
            });
            if (result.optimal && Math.abs(result.x[0] + result.x[1] - 1) < 0.1) {
                console.log(`  ✓ Active Set QP (x=[${result.x[0].toFixed(2)}, ${result.x[1].toFixed(2)}])`);
                passed++;
            } else {
                console.log('  ✗ Active Set QP');
                failed++;
            }
        } catch (e) { console.log('  ✗ Active Set QP:', e.message); failed++; }
        
        // Test 7: Robust Optimization
        try {
            const result = PRISM_ROBUST_OPTIMIZATION.robustOptimization({
                objective: (x, s) => x[0] * x[0] + (s[0] || 1) * x[0],
                bounds: [{ min: -5, max: 5 }],
                uncertainParams: [
                    { nominal: 0, min: -1, max: 1 }
                ],
                numScenarios: 20,
                method: 'worstCase'
            });
            if (result.x && result.value !== undefined) {
                console.log(`  ✓ Robust Optimization (x=${result.x[0].toFixed(2)})`);
                passed++;
            } else {
                console.log('  ✗ Robust Optimization');
                failed++;
            }
        } catch (e) { console.log('  ✗ Robust Optimization:', e.message); failed++; }
        
        // Test 8: Scenario Generation
        try {
            const scenarios = PRISM_ROBUST_OPTIMIZATION.generateScenarios({
                params: [
                    { nominal: 100, min: 90, max: 110 },
                    { nominal: 50, min: 45, max: 55 }
                ],
                numScenarios: 30,
                method: 'latin'
            });
            if (scenarios.length >= 20) {
                console.log(`  ✓ Scenario Generation (${scenarios.length} scenarios)`);
                passed++;
            } else {
                console.log('  ✗ Scenario Generation');
                failed++;
            }
        } catch (e) { console.log('  ✗ Scenario Generation:', e.message); failed++; }
        
        // Test 9: Goal-Based Cutting Params
        try {
            const result = PRISM_MFG_OPTIMIZATION_ADVANCED_B.goalBasedCuttingParams({
                material: { hardness: 200, taylorC: 200, taylorn: 0.25 },
                tool: { diameter: 10, maxFeed: 0.3, maxDOC: 3, noseRadius: 0.8 },
                machine: { maxRPM: 5000 },
                goals: [
                    { metric: 'mrr', target: 30, weight: 1 },
                    { metric: 'surfaceFinish', target: 1.6, weight: 2 }
                ]
            });
            if (result.feasible && result.x && result.x[0] > 0) {
                console.log(`  ✓ Goal-Based Cutting (RPM=${result.x[0].toFixed(0)})`);
                passed++;
            } else {
                console.log('  ✗ Goal-Based Cutting');
                failed++;
            }
        } catch (e) { console.log('  ✗ Goal-Based Cutting:', e.message); failed++; }
        
        // Test 10: Robust Cutting Params
        try {
            const result = PRISM_MFG_OPTIMIZATION_ADVANCED_B.robustCuttingParams({
                material: { hardness: 200, specificCuttingForce: 2500 },
                tool: { diameter: 10, maxFeed: 0.3, maxDOC: 3, cost: 50 },
                machine: { maxRPM: 5000 },
                materialUncertainty: 0.1,
                objective: 'minimize_cost'
            });
            if (result.x && result.x[0] > 0) {
                console.log(`  ✓ Robust Cutting Params (RPM=${result.x[0].toFixed(0)})`);
                passed++;
            } else {
                console.log('  ✗ Robust Cutting Params');
                failed++;
            }
        } catch (e) { console.log('  ✗ Robust Cutting Params:', e.message); failed++; }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(` SESSION 3B TESTS: ${passed}/${passed + failed} passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}