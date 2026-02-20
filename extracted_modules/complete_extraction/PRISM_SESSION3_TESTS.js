const PRISM_SESSION3_TESTS = {
    runAll: function() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(' PRISM SESSION 3 OPTIMIZATION TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0, failed = 0;
        
        // Test 1: L-BFGS
        try {
            const result = PRISM_UNCONSTRAINED_OPTIMIZATION.lbfgs({
                f: (x) => x[0]*x[0] + x[1]*x[1],
                gradient: (x) => [2*x[0], 2*x[1]],
                x0: [5, 5],
                maxIter: 100
            });
            if (result.converged && Math.abs(result.x[0]) < 0.01 && Math.abs(result.x[1]) < 0.01) {
                console.log('  ✓ L-BFGS (converged to origin)');
                passed++;
            } else {
                console.log('  ✗ L-BFGS');
                failed++;
            }
        } catch (e) { console.log('  ✗ L-BFGS:', e.message); failed++; }
        
        // Test 2: Trust Region
        try {
            const result = PRISM_UNCONSTRAINED_OPTIMIZATION.trustRegion({
                f: (x) => (x[0]-1)*(x[0]-1) + (x[1]-2)*(x[1]-2),
                gradient: (x) => [2*(x[0]-1), 2*(x[1]-2)],
                hessian: (x) => [[2, 0], [0, 2]],
                x0: [0, 0]
            });
            if (result.converged && Math.abs(result.x[0] - 1) < 0.1 && Math.abs(result.x[1] - 2) < 0.1) {
                console.log('  ✓ Trust Region (found [1,2])');
                passed++;
            } else {
                console.log('  ✗ Trust Region');
                failed++;
            }
        } catch (e) { console.log('  ✗ Trust Region:', e.message); failed++; }
        
        // Test 3: Conjugate Gradient
        try {
            const result = PRISM_UNCONSTRAINED_OPTIMIZATION.conjugateGradient({
                f: (x) => x[0]*x[0] + 2*x[1]*x[1],
                gradient: (x) => [2*x[0], 4*x[1]],
                x0: [10, 10]
            });
            if (result.converged) {
                console.log('  ✓ Conjugate Gradient (converged)');
                passed++;
            } else {
                console.log('  ✗ Conjugate Gradient');
                failed++;
            }
        } catch (e) { console.log('  ✗ Conjugate Gradient:', e.message); failed++; }
        
        // Test 4: Augmented Lagrangian
        try {
            const result = PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED.augmentedLagrangian({
                f: (x) => x[0]*x[0] + x[1]*x[1],
                gradient: (x) => [2*x[0], 2*x[1]],
                equalityConstraints: [(x) => x[0] + x[1] - 1],
                x0: [0, 0]
            });
            if (Math.abs(result.x[0] + result.x[1] - 1) < 0.1) {
                console.log('  ✓ Augmented Lagrangian (constraint satisfied)');
                passed++;
            } else {
                console.log('  ✗ Augmented Lagrangian');
                failed++;
            }
        } catch (e) { console.log('  ✗ Augmented Lagrangian:', e.message); failed++; }
        
        // Test 5: Tabu Search
        try {
            const result = PRISM_METAHEURISTIC_OPTIMIZATION.tabuSearch({
                initialSolution: [5, 5],
                costFunction: (x) => x[0]*x[0] + x[1]*x[1],
                neighborhoodFunction: (x) => [
                    { solution: [x[0]-0.5, x[1]], move: {d: 'left'} },
                    { solution: [x[0]+0.5, x[1]], move: {d: 'right'} },
                    { solution: [x[0], x[1]-0.5], move: {d: 'down'} },
                    { solution: [x[0], x[1]+0.5], move: {d: 'up'} }
                ],
                maxIterations: 100
            });
            if (result.cost < 1) {
                console.log(`  ✓ Tabu Search (cost=${result.cost.toFixed(2)})`);
                passed++;
            } else {
                console.log('  ✗ Tabu Search');
                failed++;
            }
        } catch (e) { console.log('  ✗ Tabu Search:', e.message); failed++; }
        
        // Test 6: NSGA-II
        try {
            const result = PRISM_MULTI_OBJECTIVE.nsgaII({
                objectives: [
                    (x) => x[0]*x[0],
                    (x) => (x[0]-2)*(x[0]-2)
                ],
                bounds: [{ min: 0, max: 3 }],
                populationSize: 30,
                maxGenerations: 50
            });
            if (result.paretoFront.length > 0) {
                console.log(`  ✓ NSGA-II (${result.paretoFront.length} Pareto solutions)`);
                passed++;
            } else {
                console.log('  ✗ NSGA-II');
                failed++;
            }
        } catch (e) { console.log('  ✗ NSGA-II:', e.message); failed++; }
        
        // Test 7: MOEA/D
        try {
            const result = PRISM_MULTI_OBJECTIVE.moead({
                objectives: [
                    (x) => x[0],
                    (x) => 1 - Math.sqrt(x[0])
                ],
                bounds: [{ min: 0, max: 1 }],
                populationSize: 30,
                maxGenerations: 50
            });
            if (result.paretoFront.length > 0) {
                console.log(`  ✓ MOEA/D (${result.paretoFront.length} Pareto solutions)`);
                passed++;
            } else {
                console.log('  ✗ MOEA/D');
                failed++;
            }
        } catch (e) { console.log('  ✗ MOEA/D:', e.message); failed++; }
        
        // Test 8: Multi-objective cutting parameters
        try {
            const result = PRISM_MFG_OPTIMIZATION_ADVANCED.optimizeCuttingParametersMO({
                material: { hardness: 200 },
                tool: { maxFeed: 0.3, maxDOC: 3, noseRadius: 0.8 },
                machine: { maxRPM: 5000 }
            });
            if (result.compromiseSolution && result.compromiseSolution.speed > 0) {
                console.log(`  ✓ MO Cutting Params (speed=${result.compromiseSolution.speed.toFixed(0)})`);
                passed++;
            } else {
                console.log('  ✗ MO Cutting Params');
                failed++;
            }
        } catch (e) { console.log('  ✗ MO Cutting Params:', e.message); failed++; }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(` SESSION 3 TESTS: ${passed}/${passed + failed} passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}