const PRISM_MIT_BATCH_17_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 17] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Quicksort
        try {
            const arr = [5, 2, 8, 1, 9, 3];
            const sorted = PRISM_SORTING.quickSort(arr);
            if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 5, 8, 9])) {
                console.log('✓ Quicksort');
                passed++;
            } else {
                throw new Error(`Got ${sorted}`);
            }
        } catch (e) {
            console.log('✗ Quicksort:', e.message);
            failed++;
        }
        
        // Test 2: Mergesort
        try {
            const sorted = PRISM_SORTING.mergeSort([5, 2, 8, 1, 9, 3]);
            if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 5, 8, 9])) {
                console.log('✓ Mergesort');
                passed++;
            } else {
                throw new Error(`Got ${sorted}`);
            }
        } catch (e) {
            console.log('✗ Mergesort:', e.message);
            failed++;
        }
        
        // Test 3: Dijkstra
        try {
            const graph = {
                'A': [{ to: 'B', weight: 1 }, { to: 'C', weight: 4 }],
                'B': [{ to: 'C', weight: 2 }, { to: 'D', weight: 5 }],
                'C': [{ to: 'D', weight: 1 }],
                'D': []
            };
            const result = PRISM_GRAPH.dijkstra(graph, 'A');
            if (result.distances['D'] === 4) {
                console.log('✓ Dijkstra shortest path');
                passed++;
            } else {
                throw new Error(`Expected 4, got ${result.distances['D']}`);
            }
        } catch (e) {
            console.log('✗ Dijkstra:', e.message);
            failed++;
        }
        
        // Test 4: BFS
        try {
            const graph = { 1: [2, 3], 2: [4], 3: [4], 4: [] };
            const result = PRISM_GRAPH.bfs(graph, 1);
            if (result.distances[4] === 2) {
                console.log('✓ BFS');
                passed++;
            } else {
                throw new Error(`Expected distance 2 to node 4`);
            }
        } catch (e) {
            console.log('✗ BFS:', e.message);
            failed++;
        }
        
        // Test 5: LCS
        try {
            const result = PRISM_DP.lcs('ABCDGH', 'AEDFHR');
            if (result.length === 3 && result.sequence === 'ADH') {
                console.log('✓ Longest Common Subsequence');
                passed++;
            } else {
                throw new Error(`Got length ${result.length}, sequence ${result.sequence}`);
            }
        } catch (e) {
            console.log('✗ LCS:', e.message);
            failed++;
        }
        
        // Test 6: Knapsack
        try {
            const items = [
                { value: 60, weight: 10 },
                { value: 100, weight: 20 },
                { value: 120, weight: 30 }
            ];
            const result = PRISM_DP.knapsack(items, 50);
            if (result.maxValue === 220) {
                console.log('✓ 0/1 Knapsack');
                passed++;
            } else {
                throw new Error(`Expected 220, got ${result.maxValue}`);
            }
        } catch (e) {
            console.log('✗ Knapsack:', e.message);
            failed++;
        }
        
        // Test 7: Edit Distance
        try {
            const result = PRISM_DP.editDistance('kitten', 'sitting');
            if (result.distance === 3) {
                console.log('✓ Edit Distance');
                passed++;
            } else {
                throw new Error(`Expected 3, got ${result.distance}`);
            }
        } catch (e) {
            console.log('✗ Edit Distance:', e.message);
            failed++;
        }
        
        // Test 8: Gradient Descent
        try {
            const result = PRISM_OPTIMIZATION.gradientDescent({
                f: (x) => x[0] * x[0] + x[1] * x[1],
                gradient: (x) => [2 * x[0], 2 * x[1]],
                x0: [5, 5],
                epsilon: 1e-4
            });
            if (Math.abs(result.x[0]) < 0.01 && Math.abs(result.x[1]) < 0.01) {
                console.log('✓ Gradient Descent');
                passed++;
            } else {
                throw new Error(`Expected [0,0], got [${result.x}]`);
            }
        } catch (e) {
            console.log('✗ Gradient Descent:', e.message);
            failed++;
        }
        
        // Test 9: Simplex LP
        try {
            // Minimize -x1 - x2 subject to x1 + x2 <= 4, x1 <= 2, x2 <= 3
            const result = PRISM_OPTIMIZATION.simplex({
                c: [-1, -1],
                A: [[1, 1], [1, 0], [0, 1]],
                b: [4, 2, 3]
            });
            if (result.optimal && Math.abs(result.objectiveValue + 5) < 0.01) {
                console.log('✓ Simplex LP');
                passed++;
            } else {
                throw new Error(`Expected -5, got ${result.objectiveValue}`);
            }
        } catch (e) {
            console.log('✗ Simplex LP:', e.message);
            failed++;
        }
        
        // Test 10: CSP Backtracking
        try {
            const result = PRISM_CSP.backtrackingSearch({
                variables: ['A', 'B'],
                domains: { A: [1, 2], B: [1, 2] },
                constraints: (a) => !a.A || !a.B || a.A !== a.B
            });
            if (result.solution && result.solution.A !== result.solution.B) {
                console.log('✓ CSP Backtracking');
                passed++;
            } else {
                throw new Error('No valid solution found');
            }
        } catch (e) {
            console.log('✗ CSP Backtracking:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
}