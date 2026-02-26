const PRISM_SESSION2B_TESTS = {
    runAll: function() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(' PRISM SESSION 2B ENHANCEMENT TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0, failed = 0;
        
        // Test 1: IDA*
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (s) => s.x === 3 && s.y === 3,
                heuristic: (s) => Math.abs(3 - s.x) + Math.abs(3 - s.y),
                getSuccessors: (s) => [
                    { state: { x: s.x + 1, y: s.y }, cost: 1 },
                    { state: { x: s.x, y: s.y + 1 }, cost: 1 }
                ].filter(x => x.state.x <= 5 && x.state.y <= 5)
            };
            const result = PRISM_MEMORY_EFFICIENT_SEARCH.idaStar(problem);
            if (result.found && result.cost === 6) {
                console.log('  ✓ IDA* Search (optimal cost=6)');
                passed++;
            } else {
                console.log('  ✗ IDA* Search');
                failed++;
            }
        } catch (e) { console.log('  ✗ IDA*:', e.message); failed++; }
        
        // Test 2: Hill Climbing
        try {
            const problem = {
                initial: 0,
                evaluate: (x) => -(x - 5) * (x - 5), // Maximum at x=5
                getNeighbors: (x) => [x - 0.5, x + 0.5].filter(n => n >= 0 && n <= 10),
                maximize: true
            };
            const result = PRISM_LOCAL_SEARCH.hillClimbing(problem);
            if (result.success && Math.abs(result.solution - 5) < 0.5) {
                console.log('  ✓ Hill Climbing (found x≈5)');
                passed++;
            } else {
                console.log('  ✗ Hill Climbing');
                failed++;
            }
        } catch (e) { console.log('  ✗ Hill Climbing:', e.message); failed++; }
        
        // Test 3: Simulated Annealing
        try {
            const problem = {
                initial: 0,
                evaluate: (x) => (x - 3) * (x - 3), // Minimum at x=3
                getNeighbors: (x) => [x - 1, x + 1, x - 0.1, x + 0.1]
            };
            const result = PRISM_LOCAL_SEARCH.simulatedAnnealing({
                problem,
                initialTemp: 100,
                coolingRate: 0.99,
                maxIterations: 2000
            });
            if (result.success && Math.abs(result.solution - 3) < 1) {
                console.log('  ✓ Simulated Annealing (found x≈3)');
                passed++;
            } else {
                console.log('  ✗ Simulated Annealing');
                failed++;
            }
        } catch (e) { console.log('  ✗ Simulated Annealing:', e.message); failed++; }
        
        // Test 4: 2-Opt
        try {
            const tour = [0, 1, 2, 3];
            const distances = [
                [0, 1, 10, 1],
                [1, 0, 1, 10],
                [10, 1, 0, 1],
                [1, 10, 1, 0]
            ];
            const result = PRISM_LOCAL_SEARCH.twoOpt(tour, distances);
            if (result.tour && result.length <= 4) {
                console.log(`  ✓ 2-Opt TSP (length=${result.length})`);
                passed++;
            } else {
                console.log('  ✗ 2-Opt TSP');
                failed++;
            }
        } catch (e) { console.log('  ✗ 2-Opt:', e.message); failed++; }
        
        // Test 5: Hungarian Algorithm
        try {
            const costMatrix = [
                [10, 5, 13],
                [3, 15, 8],
                [12, 7, 6]
            ];
            const result = PRISM_COMBINATORIAL.hungarian(costMatrix);
            if (result.assignment.length === 3 && result.cost === 14) {
                console.log(`  ✓ Hungarian Algorithm (cost=${result.cost})`);
                passed++;
            } else {
                console.log('  ✗ Hungarian Algorithm');
                failed++;
            }
        } catch (e) { console.log('  ✗ Hungarian:', e.message); failed++; }
        
        // Test 6: Christofides TSP
        try {
            const distances = [
                [0, 2, 9, 10],
                [2, 0, 6, 4],
                [9, 6, 0, 8],
                [10, 4, 8, 0]
            ];
            const result = PRISM_COMBINATORIAL.christofides(distances);
            if (result.tour.length === 4 && result.length <= 25) {
                console.log(`  ✓ Christofides TSP (length=${result.length.toFixed(1)})`);
                passed++;
            } else {
                console.log('  ✗ Christofides TSP');
                failed++;
            }
        } catch (e) { console.log('  ✗ Christofides:', e.message); failed++; }
        
        // Test 7: Particle Filter
        try {
            const filter = PRISM_PARTICLE_FILTER.create({
                numParticles: 100,
                initialDistribution: () => Math.random() * 10,
                motionModel: (p, control) => p + control + (Math.random() - 0.5),
                measurementModel: (p, m) => Math.exp(-Math.abs(p - m))
            });
            filter.predict(1);
            filter.update(5);
            const estimate = filter.getEstimate();
            if (typeof estimate === 'number' && estimate > 0 && estimate < 15) {
                console.log(`  ✓ Particle Filter (estimate=${estimate.toFixed(2)})`);
                passed++;
            } else {
                console.log('  ✗ Particle Filter');
                failed++;
            }
        } catch (e) { console.log('  ✗ Particle Filter:', e.message); failed++; }
        
        // Test 8: Local Beam Search
        try {
            const problem = {
                initial: 0,
                randomState: () => Math.random() * 10,
                evaluate: (x) => -(x - 7) * (x - 7), // Max at x=7
                getNeighbors: (x) => [x - 0.5, x + 0.5].filter(n => n >= 0 && n <= 10),
                maximize: true,
                maxIterations: 100
            };
            const result = PRISM_LOCAL_SEARCH.localBeamSearch(problem, 3);
            if (result.solution !== undefined && Math.abs(result.solution - 7) < 2) {
                console.log(`  ✓ Local Beam Search (found x≈${result.solution.toFixed(1)})`);
                passed++;
            } else {
                console.log('  ✗ Local Beam Search');
                failed++;
            }
        } catch (e) { console.log('  ✗ Local Beam Search:', e.message); failed++; }
        
        // Test 9: Manufacturing Rapid Path Optimization
        try {
            const points = [
                { x: 0, y: 0, z: 0 },
                { x: 10, y: 0, z: 0 },
                { x: 10, y: 10, z: 0 },
                { x: 0, y: 10, z: 0 },
                { x: 5, y: 5, z: 0 }
            ];
            const result = PRISM_MFG_OPTIMIZATION.optimizeRapidPath(points);
            if (result.path.length === 5 && result.length < result.originalLength) {
                console.log(`  ✓ Rapid Path Optimization (${result.improvement} improvement)`);
                passed++;
            } else {
                console.log('  ✗ Rapid Path Optimization');
                failed++;
            }
        } catch (e) { console.log('  ✗ Rapid Path:', e.message); failed++; }
        
        // Test 10: Tool Assignment Optimization
        try {
            const operations = [
                { id: 1, requiredDiameter: 10 },
                { id: 2, requiredDiameter: 6 },
                { id: 3, requiredDiameter: 12 }
            ];
            const tools = [
                { id: 'T1', diameter: 10, currentlyMounted: true },
                { id: 'T2', diameter: 6, setupTime: 20 },
                { id: 'T3', diameter: 12, setupTime: 25 }
            ];
            const result = PRISM_MFG_OPTIMIZATION.optimizeToolAssignment(operations, tools);
            if (result.assignments.length === 3) {
                console.log(`  ✓ Tool Assignment (cost=${result.totalCost.toFixed(1)})`);
                passed++;
            } else {
                console.log('  ✗ Tool Assignment');
                failed++;
            }
        } catch (e) { console.log('  ✗ Tool Assignment:', e.message); failed++; }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(` SESSION 2B TESTS: ${passed}/${passed + failed} passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}