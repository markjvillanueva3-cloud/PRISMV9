const PRISM_SESSION2_TESTS = {
    runAll: function() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(' PRISM SESSION 2 ENHANCEMENT TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0, failed = 0;
        
        // Test 1: Best-First Search
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (s) => s.x === 5 && s.y === 5,
                heuristic: (s) => Math.abs(5 - s.x) + Math.abs(5 - s.y),
                getSuccessors: (s) => [
                    { state: { x: s.x + 1, y: s.y }, action: 'right', cost: 1 },
                    { state: { x: s.x, y: s.y + 1 }, action: 'up', cost: 1 }
                ].filter(x => x.state.x <= 10 && x.state.y <= 10)
            };
            const result = PRISM_SEARCH_ENHANCED.bestFirstSearch(problem);
            if (result.found) { console.log('  ✓ Best-First Search'); passed++; }
            else { console.log('  ✗ Best-First Search'); failed++; }
        } catch (e) { console.log('  ✗ Best-First Search:', e.message); failed++; }
        
        // Test 2: Beam Search
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (s) => s.x === 3 && s.y === 3,
                heuristic: (s) => Math.abs(3 - s.x) + Math.abs(3 - s.y),
                getSuccessors: (s) => [
                    { state: { x: s.x + 1, y: s.y }, action: 'right', cost: 1 },
                    { state: { x: s.x, y: s.y + 1 }, action: 'up', cost: 1 }
                ].filter(x => x.state.x <= 5 && x.state.y <= 5)
            };
            const result = PRISM_SEARCH_ENHANCED.beamSearch(problem, 2);
            if (result.found) { console.log('  ✓ Beam Search'); passed++; }
            else { console.log('  ✗ Beam Search'); failed++; }
        } catch (e) { console.log('  ✗ Beam Search:', e.message); failed++; }
        
        // Test 3: Dijkstra
        try {
            const graph = {
                'A': [{ to: 'B', weight: 1 }, { to: 'C', weight: 4 }],
                'B': [{ to: 'C', weight: 2 }, { to: 'D', weight: 5 }],
                'C': [{ to: 'D', weight: 1 }],
                'D': []
            };
            const result = PRISM_SEARCH_ENHANCED.dijkstra(graph, 'A', 'D');
            if (result.pathCost === 4) { console.log('  ✓ Dijkstra Algorithm'); passed++; }
            else { console.log('  ✗ Dijkstra Algorithm'); failed++; }
        } catch (e) { console.log('  ✗ Dijkstra:', e.message); failed++; }
        
        // Test 4: Forward Checking CSP
        try {
            const csp = {
                variables: ['A', 'B', 'C'],
                domains: { 'A': [1,2,3], 'B': [1,2,3], 'C': [1,2,3] },
                constraints: [
                    { variables: ['A','B'], check: (a) => a['A'] !== a['B'] },
                    { variables: ['B','C'], check: (a) => a['B'] !== a['C'] },
                    { variables: ['A','C'], check: (a) => a['A'] !== a['C'] }
                ]
            };
            const result = PRISM_CSP_ENHANCED.forwardChecking(csp);
            if (result.solved) { console.log('  ✓ CSP Forward Checking'); passed++; }
            else { console.log('  ✗ CSP Forward Checking'); failed++; }
        } catch (e) { console.log('  ✗ CSP Forward Checking:', e.message); failed++; }
        
        // Test 5: Min-Conflicts
        try {
            const csp = {
                variables: ['A', 'B'],
                domains: { 'A': [1,2], 'B': [1,2] },
                constraints: [{ variables: ['A','B'], check: (a) => a['A'] !== a['B'] }]
            };
            const result = PRISM_CSP_ENHANCED.minConflicts(csp, 100);
            if (result.solved) { console.log('  ✓ CSP Min-Conflicts'); passed++; }
            else { console.log('  ✗ CSP Min-Conflicts'); failed++; }
        } catch (e) { console.log('  ✗ CSP Min-Conflicts:', e.message); failed++; }
        
        // Test 6: Potential Fields
        try {
            const result = PRISM_MOTION_PLANNING_ENHANCED.potentialFields({
                start: { x: 0, y: 0 },
                goal: { x: 10, y: 10 },
                obstacles: [],
                stepSize: 1,
                maxIterations: 100
            });
            if (result.success) { console.log('  ✓ Potential Fields Motion'); passed++; }
            else { console.log('  ✗ Potential Fields Motion'); failed++; }
        } catch (e) { console.log('  ✗ Potential Fields:', e.message); failed++; }
        
        // Test 7: Tool Change Optimization
        try {
            const operations = [
                { id: 1, tool: 'T1' },
                { id: 2, tool: 'T2' },
                { id: 3, tool: 'T1' },
                { id: 4, tool: 'T2' }
            ];
            const result = PRISM_MANUFACTURING_SEARCH.optimizeToolChanges(operations);
            if (result.found && result.cost <= 2) { console.log('  ✓ Tool Change Optimization'); passed++; }
            else { console.log('  ✗ Tool Change Optimization'); failed++; }
        } catch (e) { console.log('  ✗ Tool Change Optimization:', e.message); failed++; }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(` SESSION 2 TESTS: ${passed}/${passed + failed} passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}