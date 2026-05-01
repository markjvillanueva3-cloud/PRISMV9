const PRISM_KNOWLEDGE_INTEGRATION_TESTS = {
    runAll: function() {
        console.log('[KNOWLEDGE_TESTS] Running integration tests...');
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test 1: AI/ML modules loaded
        try {
            const hasRL = typeof PRISM_RL_ENHANCED !== 'undefined';
            const hasNN = typeof PRISM_NN_ENHANCED !== 'undefined';
            const hasCluster = typeof PRISM_CLUSTERING_ENHANCED !== 'undefined';
            const hasAttention = typeof PRISM_ATTENTION_ADVANCED !== 'undefined';
            
            if (hasRL && hasNN && hasCluster && hasAttention) {
                results.passed++;
                results.tests.push({ name: 'AI/ML Modules', status: 'PASS' });
            } else {
                throw new Error('Missing AI/ML modules');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'AI/ML Modules', status: 'FAIL', error: e.message });
        }
        
        // Test 2: Process Planning loaded
        try {
            if (typeof PRISM_PROCESS_PLANNING !== 'undefined' && 
                typeof PRISM_PROCESS_PLANNING.aStarSearch === 'function') {
                results.passed++;
                results.tests.push({ name: 'Process Planning', status: 'PASS' });
            } else {
                throw new Error('PRISM_PROCESS_PLANNING not loaded');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Process Planning', status: 'FAIL', error: e.message });
        }
        
        // Test 3: Optimization loaded
        try {
            if (typeof PRISM_OPTIMIZATION !== 'undefined' &&
                typeof PRISM_OPTIMIZATION.newtonMethod === 'function') {
                results.passed++;
                results.tests.push({ name: 'Optimization', status: 'PASS' });
            } else {
                throw new Error('PRISM_OPTIMIZATION not loaded');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Optimization', status: 'FAIL', error: e.message });
        }
        
        // Test 4: Gateway routes registered
        try {
            if (typeof PRISM_GATEWAY !== 'undefined') {
                const testRoutes = ['plan.search.astar', 'ai.cluster.dbscan', 'optimize.newton'];
                let found = 0;
                for (const route of testRoutes) {
                    if (PRISM_GATEWAY.routes[route]) found++;
                }
                if (found === testRoutes.length) {
                    results.passed++;
                    results.tests.push({ name: 'Gateway Routes', status: 'PASS' });
                } else {
                    throw new Error(`Only ${found}/${testRoutes.length} routes found`);
                }
            } else {
                throw new Error('PRISM_GATEWAY not available');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Gateway Routes', status: 'FAIL', error: e.message });
        }
        
        // Test 5: A* Search functional test
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (state) => state.x === 2 && state.y === 2,
                heuristic: (state) => Math.abs(2 - state.x) + Math.abs(2 - state.y),
                getSuccessors: (state) => [
                    { state: { x: state.x + 1, y: state.y }, action: 'right', cost: 1 },
                    { state: { x: state.x, y: state.y + 1 }, action: 'up', cost: 1 }
                ].filter(s => s.state.x <= 2 && s.state.y <= 2)
            };
            const result = PRISM_PROCESS_PLANNING.aStarSearch(problem);
            if (result.found && result.totalCost === 4) {
                results.passed++;
                results.tests.push({ name: 'A* Search Test', status: 'PASS' });
            } else {
                throw new Error('A* returned incorrect result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'A* Search Test', status: 'FAIL', error: e.message });
        }
        
        // Print results
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`[KNOWLEDGE_TESTS] Results: ${results.passed}/${results.passed + results.failed} passed`);
        results.tests.forEach(t => {
            console.log(`  ${t.status === 'PASS' ? '✅' : '❌'} ${t.name}: ${t.status}${t.error ? ' - ' + t.error : ''}`);
        });
        console.log('═══════════════════════════════════════════════════════════');
        
        return results;
    }
}