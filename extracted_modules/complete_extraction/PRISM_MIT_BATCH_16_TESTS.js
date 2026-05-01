const PRISM_MIT_BATCH_16_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 16] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Von Mises stress (uniaxial)
        try {
            const vm = PRISM_STRESS_ANALYSIS.vonMises({ sigma_x: 100, sigma_y: 0, sigma_z: 0 });
            if (Math.abs(vm.vonMises_MPa - 100) < 0.1) {
                console.log('✓ Von Mises stress (uniaxial)');
                passed++;
            } else {
                throw new Error(`Expected 100, got ${vm.vonMises_MPa}`);
            }
        } catch (e) {
            console.log('✗ Von Mises stress:', e.message);
            failed++;
        }
        
        // Test 2: Principal stresses
        try {
            const principal = PRISM_STRESS_ANALYSIS.principalStresses({ 
                sigma_x: 100, sigma_y: 50, sigma_z: 0 
            });
            if (principal.sigma1 > principal.sigma2 && principal.sigma2 > principal.sigma3) {
                console.log('✓ Principal stress ordering');
                passed++;
            } else {
                throw new Error('Principal stresses not properly ordered');
            }
        } catch (e) {
            console.log('✗ Principal stresses:', e.message);
            failed++;
        }
        
        // Test 3: True strain
        try {
            const strain = PRISM_STRESS_ANALYSIS.trueStrain(0.1);
            const expected = Math.log(1.1);
            if (Math.abs(strain.trueStrain - expected) < 0.001) {
                console.log('✓ True strain conversion');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${strain.trueStrain}`);
            }
        } catch (e) {
            console.log('✗ True strain:', e.message);
            failed++;
        }
        
        // Test 4: Elastic constants
        try {
            const elastic = PRISM_STRESS_ANALYSIS.elasticConstants({ E: 200000, nu: 0.3 });
            const expectedG = 200000 / (2 * 1.3);
            if (Math.abs(elastic.G_MPa - expectedG) < 1) {
                console.log('✓ Elastic constants conversion');
                passed++;
            } else {
                throw new Error(`Expected G=${expectedG}, got ${elastic.G_MPa}`);
            }
        } catch (e) {
            console.log('✗ Elastic constants:', e.message);
            failed++;
        }
        
        // Test 5: Diffusion coefficient
        try {
            const diff = PRISM_KINETICS.diffusionCoefficient(500, { D0_m2_s: 1e-4, Q_kJ_mol: 150 });
            if (diff.D_m2_s > 0 && diff.D_m2_s < 1e-10) {
                console.log('✓ Diffusion coefficient');
                passed++;
            } else {
                throw new Error(`Unexpected diffusion coefficient: ${diff.D_m2_s}`);
            }
        } catch (e) {
            console.log('✗ Diffusion coefficient:', e.message);
            failed++;
        }
        
        // Test 6: Hollomon hardening
        try {
            const flow = PRISM_MECHANICAL_BEHAVIOR.hollomonHardening(0.1, { K_MPa: 500, n: 0.2 });
            const expected = 500 * Math.pow(0.1, 0.2);
            if (Math.abs(flow.trueStress_MPa - expected) < 0.1) {
                console.log('✓ Hollomon hardening');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${flow.trueStress_MPa}`);
            }
        } catch (e) {
            console.log('✗ Hollomon hardening:', e.message);
            failed++;
        }
        
        // Test 7: Basquin fatigue
        try {
            const fatigue = PRISM_MECHANICAL_BEHAVIOR.basquinFatigue({ 
                stressAmplitude_MPa: 300, sigma_f_MPa: 1000, b: -0.1 
            });
            if (fatigue.cyclesToFailure > 1000 && fatigue.cyclesToFailure < 1e9) {
                console.log('✓ Basquin fatigue life');
                passed++;
            } else {
                throw new Error(`Unexpected life: ${fatigue.cyclesToFailure}`);
            }
        } catch (e) {
            console.log('✗ Basquin fatigue:', e.message);
            failed++;
        }
        
        // Test 8: Stress intensity factor
        try {
            const sif = PRISM_FRACTURE.stressIntensityFactor({ 
                stress_MPa: 100, crackLength_mm: 10, geometry: 'center_crack' 
            });
            // K = σ√(πa) = 100 × √(π × 0.01) = 17.72
            if (Math.abs(sif.K_MPa_sqrt_m - 17.72) < 0.5) {
                console.log('✓ Stress intensity factor');
                passed++;
            } else {
                throw new Error(`Expected ~17.72, got ${sif.K_MPa_sqrt_m}`);
            }
        } catch (e) {
            console.log('✗ Stress intensity factor:', e.message);
            failed++;
        }
        
        // Test 9: Miner's damage
        try {
            const miner = PRISM_MECHANICAL_BEHAVIOR.minerDamage([
                { stress_MPa: 300, cycles: 10000 },
                { stress_MPa: 200, cycles: 50000 }
            ], { sigma_f_MPa: 1000, b: -0.1 });
            if (miner.totalDamage > 0 && miner.totalDamage < 10) {
                console.log('✓ Miner cumulative damage');
                passed++;
            } else {
                throw new Error(`Unexpected damage: ${miner.totalDamage}`);
            }
        } catch (e) {
            console.log('✗ Miner damage:', e.message);
            failed++;
        }
        
        // Test 10: Material properties
        try {
            const steel = PRISM_MATERIAL_PROPERTIES.get('steel_1045');
            if (steel && steel.E_GPa === 205) {
                console.log('✓ Material properties lookup');
                passed++;
            } else {
                throw new Error('Material not found or wrong property');
            }
        } catch (e) {
            console.log('✗ Material properties:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_STRESS_ANALYSIS,
        PRISM_KINETICS,
        PRISM_MECHANICAL_BEHAVIOR,
        PRISM_FRACTURE,
        PRISM_MATERIAL_PROPERTIES,
        BATCH16_GATEWAY_ROUTES,
        registerBatch16Routes,
        PRISM_MIT_BATCH_16_TESTS
    };
}

if (typeof window !== 'undefined') {
    window.PRISM_STRESS_ANALYSIS = PRISM_STRESS_ANALYSIS;
    window.PRISM_KINETICS = PRISM_KINETICS;
    window.PRISM_MECHANICAL_BEHAVIOR = PRISM_MECHANICAL_BEHAVIOR;
    window.PRISM_FRACTURE = PRISM_FRACTURE;
    window.PRISM_MATERIAL_PROPERTIES = PRISM_MATERIAL_PROPERTIES;
    registerBatch16Routes();
}

console.log('[PRISM MIT Batch 16] Materials Science loaded - 20 routes');
console.log('[PRISM MIT Batch 16] Courses: 3.021J, 3.11, 3.15, 3.21, 3.22');
/**
 * PRISM MIT Course Knowledge - Batch 17
 * EECS ALGORITHMS: Search, AI, Optimization, Dynamic Programming
 * Source: MIT 6.006, 6.034, 6.046J, 6.079, 6.231
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 17] Loading EECS Algorithms Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: SORTING ALGORITHMS (MIT 6.006)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SORTING = {
    
    /**
     * Quicksort with median-of-three pivot selection
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    quickSort: function(arr, compare = (a, b) => a - b) {
        const result = [...arr];
        
        const partition = (low, high) => {
            // Median-of-three pivot
            const mid = Math.floor((low + high) / 2);
            if (compare(result[mid], result[low]) < 0) [result[low], result[mid]] = [result[mid], result[low]];
            if (compare(result[high], result[low]) < 0) [result[low], result[high]] = [result[high], result[low]];
            if (compare(result[mid], result[high]) < 0) [result[mid], result[high]] = [result[high], result[mid]];
            
            const pivot = result[high];
            let i = low - 1;
            
            for (let j = low; j < high; j++) {
                if (compare(result[j], pivot) <= 0) {
                    i++;
                    [result[i], result[j]] = [result[j], result[i]];
                }
            }
            [result[i + 1], result[high]] = [result[high], result[i + 1]];
            return i + 1;
        };
        
        const sort = (low, high) => {
            if (low < high) {
                const pi = partition(low, high);
                sort(low, pi - 1);
                sort(pi + 1, high);
            }
        };
        
        sort(0, result.length - 1);
        return result;
    },
    
    /**
     * Merge sort (stable)
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    mergeSort: function(arr, compare = (a, b) => a - b) {
        if (arr.length <= 1) return [...arr];
        
        const merge = (left, right) => {
            const result = [];
            let i = 0, j = 0;
            
            while (i < left.length && j < right.length) {
                if (compare(left[i], right[j]) <= 0) {
                    result.push(left[i++]);
                } else {
                    result.push(right[j++]);
                }
            }
            return result.concat(left.slice(i)).concat(right.slice(j));
        };
        
        const mid = Math.floor(arr.length / 2);
        const left = this.mergeSort(arr.slice(0, mid), compare);
        const right = this.mergeSort(arr.slice(mid), compare);
        
        return merge(left, right);
    },
    
    /**
     * Heap sort
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    heapSort: function(arr, compare = (a, b) => a - b) {
        const result = [...arr];
        const n = result.length;
        
        const heapify = (size, i) => {
            let largest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            
            if (left < size && compare(result[left], result[largest]) > 0) {
                largest = left;
            }
            if (right < size && compare(result[right], result[largest]) > 0) {
                largest = right;
            }
            if (largest !== i) {
                [result[i], result[largest]] = [result[largest], result[i]];
                heapify(size, largest);
            }
        };
        
        // Build max heap
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(n, i);
        }
        
        // Extract elements
        for (let i = n - 1; i > 0; i--) {
            [result[0], result[i]] = [result[i], result[0]];
            heapify(i, 0);
        }
        
        return result;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: GRAPH ALGORITHMS (MIT 6.006, 6.034)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_GRAPH = {
    
    /**
     * Dijkstra's shortest path algorithm
     * @param {Object} graph - Adjacency list {node: [{to, weight}]}
     * @param {string|number} start - Start node
     * @returns {Object} Distances and paths
     */
    dijkstra: function(graph, start) {
        const distances = {};
        const previous = {};
        const visited = new Set();
        const nodes = Object.keys(graph);
        
        // Initialize
        for (const node of nodes) {
            distances[node] = Infinity;
            previous[node] = null;
        }
        distances[start] = 0;
        
        // Priority queue (simple array implementation)
        const pq = [[0, start]];
        
        while (pq.length > 0) {
            // Get minimum
            pq.sort((a, b) => a[0] - b[0]);
            const [dist, current] = pq.shift();
            
            if (visited.has(current)) continue;
            visited.add(current);
            
            if (!graph[current]) continue;
            
            for (const edge of graph[current]) {
                if (visited.has(edge.to)) continue;
                
                const newDist = dist + edge.weight;
                if (newDist < distances[edge.to]) {
                    distances[edge.to] = newDist;
                    previous[edge.to] = current;
                    pq.push([newDist, edge.to]);
                }
            }
        }
        
        // Reconstruct paths
        const paths = {};
        for (const node of nodes) {
            const path = [];
            let current = node;
            while (current !== null) {
                path.unshift(current);
                current = previous[current];
            }
            paths[node] = path.length > 1 || node === start ? path : [];
        }
        
        return { distances, paths, previous };
    },
    
    /**
     * A* search algorithm
     * @param {Object} params - Search parameters
     * @returns {Object} Path and cost
     */
    astar: function(params) {
        const {
            start,
            goal,
            neighbors,  // function(node) => [{node, cost}]
            heuristic,  // function(node) => estimated cost to goal
            isGoal = (n) => n === goal
        } = params;
        
        const openSet = new Map([[start, { g: 0, f: heuristic(start), parent: null }]]);
        const closedSet = new Set();
        
        while (openSet.size > 0) {
            // Find node with lowest f score
            let current = null;
            let lowestF = Infinity;
            for (const [node, data] of openSet) {
                if (data.f < lowestF) {
                    lowestF = data.f;
                    current = node;
                }
            }
            
            if (isGoal(current)) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node !== null) {
                    path.unshift(node);
                    const data = openSet.get(node) || { parent: null };
                    node = data.parent;
                }
                return {
                    path,
                    cost: openSet.get(current).g,
                    nodesExplored: closedSet.size + 1
                };
            }
            
            const currentData = openSet.get(current);
            openSet.delete(current);
            closedSet.add(current);
            
            for (const neighbor of neighbors(current)) {
                if (closedSet.has(neighbor.node)) continue;
                
                const tentativeG = currentData.g + neighbor.cost;
                
                if (!openSet.has(neighbor.node)) {
                    openSet.set(neighbor.node, {
                        g: tentativeG,
                        f: tentativeG + heuristic(neighbor.node),
                        parent: current
                    });
                } else if (tentativeG < openSet.get(neighbor.node).g) {
                    openSet.set(neighbor.node, {
                        g: tentativeG,
                        f: tentativeG + heuristic(neighbor.node),
                        parent: current
                    });
                }
            }
        }
        
        return { path: [], cost: Infinity, nodesExplored: closedSet.size };
    },
    
    /**
     * Bellman-Ford algorithm (handles negative weights)
     * @param {Object} graph - Adjacency list
     * @param {string|number} start - Start node
     * @returns {Object} Distances or negative cycle detection
     */
    bellmanFord: function(graph, start) {
        const nodes = Object.keys(graph);
        const distances = {};
        const previous = {};
        
        // Initialize
        for (const node of nodes) {
            distances[node] = Infinity;
            previous[node] = null;
        }
        distances[start] = 0;
        
        // Relax edges V-1 times
        for (let i = 0; i < nodes.length - 1; i++) {
            for (const u of nodes) {
                if (!graph[u]) continue;
                for (const edge of graph[u]) {
                    if (distances[u] + edge.weight < distances[edge.to]) {
                        distances[edge.to] = distances[u] + edge.weight;
                        previous[edge.to] = u;
                    }
                }
            }
        }
        
        // Check for negative cycles
        for (const u of nodes) {
            if (!graph[u]) continue;
            for (const edge of graph[u]) {
                if (distances[u] + edge.weight < distances[edge.to]) {
                    return { hasNegativeCycle: true, distances: null };
                }
            }
        }
        
        return { hasNegativeCycle: false, distances, previous };
    },
    
    /**
     * Kruskal's Minimum Spanning Tree
     * @param {Array} edges - [{from, to, weight}]
     * @param {number} numNodes - Number of nodes
     * @returns {Object} MST edges and total weight
     */
    kruskalMST: function(edges, numNodes) {
        // Union-Find data structure
        const parent = Array.from({ length: numNodes }, (_, i) => i);
        const rank = Array(numNodes).fill(0);
        
        const find = (x) => {
            if (parent[x] !== x) parent[x] = find(parent[x]);
            return parent[x];
        };
        
        const union = (x, y) => {
            const px = find(x), py = find(y);
            if (px === py) return false;
            if (rank[px] < rank[py]) parent[px] = py;
            else if (rank[px] > rank[py]) parent[py] = px;
            else { parent[py] = px; rank[px]++; }
            return true;
        };
        
        // Sort edges by weight
        const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
        
        const mst = [];
        let totalWeight = 0;
        
        for (const edge of sortedEdges) {
            if (union(edge.from, edge.to)) {
                mst.push(edge);
                totalWeight += edge.weight;
                if (mst.length === numNodes - 1) break;
            }
        }
        
        return { edges: mst, totalWeight, complete: mst.length === numNodes - 1 };
    },
    
    /**
     * Breadth-First Search
     * @param {Object} graph - Adjacency list
     * @param {string|number} start - Start node
     * @returns {Object} BFS traversal order and distances
     */
    bfs: function(graph, start) {
        const visited = new Set([start]);
        const queue = [start];
        const order = [];
        const distances = { [start]: 0 };
        
        while (queue.length > 0) {
            const current = queue.shift();
            order.push(current);
            
            if (!graph[current]) continue;
            
            for (const neighbor of graph[current]) {
                const node = typeof neighbor === 'object' ? neighbor.to : neighbor;
                if (!visited.has(node)) {
                    visited.add(node);
                    queue.push(node);
                    distances[node] = distances[current] + 1;
                }
            }
        }
        
        return { order, distances };
    },
    
    /**
     * Depth-First Search
     * @param {Object} graph - Adjacency list
     * @param {string|number} start - Start node
     * @returns {Object} DFS traversal order
     */
    dfs: function(graph, start) {
        const visited = new Set();
        const order = [];
        
        const visit = (node) => {
            if (visited.has(node)) return;
            visited.add(node);
            order.push(node);
            
            if (!graph[node]) return;
            
            for (const neighbor of graph[node]) {
                const next = typeof neighbor === 'object' ? neighbor.to : neighbor;
                visit(next);
            }
        };
        
        visit(start);
        return { order };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: DYNAMIC PROGRAMMING (MIT 6.006, 6.231)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_DP = {
    
    /**
     * Longest Common Subsequence
     * @param {string|Array} X - First sequence
     * @param {string|Array} Y - Second sequence
     * @returns {Object} LCS length and sequence
     */
    lcs: function(X, Y) {
        const m = X.length, n = Y.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (X[i - 1] === Y[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Reconstruct LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (X[i - 1] === Y[j - 1]) {
                lcs.unshift(X[i - 1]);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        
        return {
            length: dp[m][n],
            sequence: typeof X === 'string' ? lcs.join('') : lcs
        };
    },
    
    /**
     * 0/1 Knapsack Problem
     * @param {Array} items - [{value, weight}]
     * @param {number} capacity - Maximum weight
     * @returns {Object} Maximum value and selected items
     */
    knapsack: function(items, capacity) {
        const n = items.length;
        const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
        
        // Fill DP table
        for (let i = 1; i <= n; i++) {
            for (let w = 0; w <= capacity; w++) {
                if (items[i - 1].weight <= w) {
                    dp[i][w] = Math.max(
                        dp[i - 1][w],
                        dp[i - 1][w - items[i - 1].weight] + items[i - 1].value
                    );
                } else {
                    dp[i][w] = dp[i - 1][w];
                }
            }
        }
        
        // Find selected items
        const selected = [];
        let w = capacity;
        for (let i = n; i > 0 && w > 0; i--) {
            if (dp[i][w] !== dp[i - 1][w]) {
                selected.unshift(i - 1);
                w -= items[i - 1].weight;
            }
        }
        
        return {
            maxValue: dp[n][capacity],
            selectedIndices: selected,
            selectedItems: selected.map(i => items[i]),
            totalWeight: selected.reduce((sum, i) => sum + items[i].weight, 0)
        };
    },
    
    /**
     * Edit Distance (Levenshtein Distance)
     * @param {string} s1 - First string
     * @param {string} s2 - Second string
     * @returns {Object} Distance and operations
     */
    editDistance: function(s1, s2) {
        const m = s1.length, n = s2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Initialize
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j - 1], // Replace
                        dp[i - 1][j],     // Delete
                        dp[i][j - 1]      // Insert
                    );
                }
            }
        }
        
        // Reconstruct operations
        const ops = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
                i--; j--;
            } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
                ops.unshift({ op: 'replace', pos: i - 1, from: s1[i - 1], to: s2[j - 1] });
                i--; j--;
            } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
                ops.unshift({ op: 'delete', pos: i - 1, char: s1[i - 1] });
                i--;
            } else {
                ops.unshift({ op: 'insert', pos: i, char: s2[j - 1] });
                j--;
            }
        }
        
        return { distance: dp[m][n], operations: ops };
    },
    
    /**
     * Value Iteration for MDP
     * @param {Object} mdp - MDP definition
     * @returns {Object} Optimal value function and policy
     */
    valueIteration: function(mdp) {
        const {
            states,           // Array of states
            actions,          // Array of actions
            transition,       // function(s, a) => [{state, prob}]
            reward,           // function(s, a) => number
            gamma = 0.99,     // Discount factor
            epsilon = 0.001,  // Convergence threshold
            maxIter = 1000
        } = mdp;
        
        // Initialize value function
        const V = {};
        for (const s of states) V[s] = 0;
        
        let iter = 0;
        let delta;
        
        do {
            delta = 0;
            const newV = {};
            
            for (const s of states) {
                let maxQ = -Infinity;
                
                for (const a of actions) {
                    let q = reward(s, a);
                    for (const { state: sp, prob } of transition(s, a)) {
                        q += gamma * prob * V[sp];
                    }
                    maxQ = Math.max(maxQ, q);
                }
                
                newV[s] = maxQ;
                delta = Math.max(delta, Math.abs(newV[s] - V[s]));
            }
            
            for (const s of states) V[s] = newV[s];
            iter++;
        } while (delta > epsilon && iter < maxIter);
        
        // Extract policy
        const policy = {};
        for (const s of states) {
            let bestA = null, maxQ = -Infinity;
            
            for (const a of actions) {
                let q = reward(s, a);
                for (const { state: sp, prob } of transition(s, a)) {
                    q += gamma * prob * V[sp];
                }
                if (q > maxQ) {
                    maxQ = q;
                    bestA = a;
                }
            }
            policy[s] = bestA;
        }
        
        return { V, policy, iterations: iter, converged: delta <= epsilon };
    },
    
    /**
     * Q-Learning (model-free RL)
     * @param {Object} params - Learning parameters
     * @returns {Object} Q-table and derived policy
     */
    qLearning: function(params) {
        const {
            states,
            actions,
            episodes = 1000,
            alpha = 0.1,      // Learning rate
            gamma = 0.99,     // Discount factor
            epsilon = 0.1,    // Exploration rate
            getNextState,     // function(s, a) => {nextState, reward, done}
            initialState      // function() => starting state
        } = params;
        
        // Initialize Q-table
        const Q = {};
        for (const s of states) {
            Q[s] = {};
            for (const a of actions) {
                Q[s][a] = 0;
            }
        }
        
        const rewards = [];
        
        for (let ep = 0; ep < episodes; ep++) {
            let s = initialState();
            let totalReward = 0;
            let steps = 0;
            const maxSteps = 1000;
            
            while (steps < maxSteps) {
                // Epsilon-greedy action selection
                let a;
                if (Math.random() < epsilon) {
                    a = actions[Math.floor(Math.random() * actions.length)];
                } else {
                    a = actions.reduce((best, act) => 
                        Q[s][act] > Q[s][best] ? act : best, actions[0]);
                }
                
                const { nextState, reward, done } = getNextState(s, a);
                
                // Q-learning update
                const maxNextQ = Math.max(...actions.map(ap => Q[nextState]?.[ap] || 0));
                Q[s][a] = Q[s][a] + alpha * (reward + gamma * maxNextQ - Q[s][a]);
                
                totalReward += reward;
                s = nextState;
                steps++;
                
                if (done) break;
            }
            
            rewards.push(totalReward);
        }
        
        // Derive policy from Q-table
        const policy = {};
        for (const s of states) {
            policy[s] = actions.reduce((best, a) => 
                Q[s][a] > Q[s][best] ? a : best, actions[0]);
        }
        
        return {
            Q,
            policy,
            averageReward: rewards.reduce((a, b) => a + b, 0) / rewards.length,
            rewardHistory: rewards
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: OPTIMIZATION ALGORITHMS (MIT 6.079)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_OPTIMIZATION = {
    
    /**
     * Gradient Descent with backtracking line search
     * @param {Object} params - Optimization parameters
     * @returns {Object} Optimal point and convergence info
     */
    gradientDescent: function(params) {
        const {
            f,                // Objective function f(x)
            gradient,         // Gradient function ∇f(x)
            x0,               // Initial point (array)
            alpha = 0.3,      // Backtracking parameter
            beta = 0.8,       // Backtracking parameter
            epsilon = 1e-6,   // Convergence tolerance
            maxIter = 10000
        } = params;
        
        let x = [...x0];
        const history = [{ x: [...x], f: f(x) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const grad = gradient(x);
            const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
            
            // Check convergence
            if (gradNorm < epsilon) {
                return {
                    x,
                    fValue: f(x),
                    iterations: iter,
                    converged: true,
                    history
                };
            }
            
            // Backtracking line search
            let t = 1;
            const fx = f(x);
            const gradDotGrad = grad.reduce((s, g) => s + g * g, 0);
            
            while (f(x.map((xi, i) => xi - t * grad[i])) > fx - alpha * t * gradDotGrad) {
                t *= beta;
                if (t < 1e-10) break;
            }
            
            // Update
            x = x.map((xi, i) => xi - t * grad[i]);
            history.push({ x: [...x], f: f(x) });
        }
        
        return {
            x,
            fValue: f(x),
            iterations: maxIter,
            converged: false,
            history
        };
    },
    
    /**
     * Newton's Method for optimization
     * @param {Object} params - Optimization parameters
     * @returns {Object} Optimal point and convergence info
     */
    newtonsMethod: function(params) {
        const {
            f,                // Objective function
            gradient,         // Gradient function
            hessian,          // Hessian function (returns 2D array)
            x0,
            epsilon = 1e-8,
            maxIter = 100
        } = params;
        
        let x = [...x0];
        const n = x.length;
        
        // Helper: solve linear system Ax = b using Gaussian elimination
        const solve = (A, b) => {
            const aug = A.map((row, i) => [...row, b[i]]);
            
            // Forward elimination
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                
                for (let k = i + 1; k < n; k++) {
                    const c = aug[k][i] / aug[i][i];
                    for (let j = i; j <= n; j++) {
                        aug[k][j] -= c * aug[i][j];
                    }
                }
            }
            
            // Back substitution
            const x = Array(n).fill(0);
            for (let i = n - 1; i >= 0; i--) {
                x[i] = aug[i][n];
                for (let j = i + 1; j < n; j++) {
                    x[i] -= aug[i][j] * x[j];
                }
                x[i] /= aug[i][i];
            }
            return x;
        };
        
        for (let iter = 0; iter < maxIter; iter++) {
            const grad = gradient(x);
            const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
            
            if (gradNorm < epsilon) {
                return { x, fValue: f(x), iterations: iter, converged: true };
            }
            
            const H = hessian(x);
            const step = solve(H, grad.map(g => -g));
            
            // Line search for damped Newton
            let t = 1;
            while (f(x.map((xi, i) => xi + t * step[i])) > f(x) + 0.01 * t * grad.reduce((s, g, i) => s + g * step[i], 0)) {
                t *= 0.5;
                if (t < 1e-10) break;
            }
            
            x = x.map((xi, i) => xi + t * step[i]);
        }
        
        return { x, fValue: f(x), iterations: maxIter, converged: false };
    },
    
    /**
     * Simplex Algorithm for Linear Programming
     * @param {Object} lp - LP in standard form
     * @returns {Object} Optimal solution
     */
    simplex: function(lp) {
        const { c, A, b } = lp;
        // c: objective coefficients (minimize c^T x)
        // A: constraint matrix (Ax <= b)
        // b: RHS of constraints
        
        const m = A.length;     // constraints
        const n = c.length;     // variables
        
        // Convert to slack form: add slack variables
        const tableau = [];
        for (let i = 0; i < m; i++) {
            const row = [...A[i]];
            for (let j = 0; j < m; j++) {
                row.push(i === j ? 1 : 0);  // Slack variable
            }
            row.push(b[i]);  // RHS
            tableau.push(row);
        }
        
        // Objective row (negated for maximization)
        const objRow = c.map(ci => -ci);
        for (let j = 0; j < m; j++) objRow.push(0);
        objRow.push(0);
        tableau.push(objRow);
        
        const numCols = n + m + 1;
        const maxIter = 100;
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Find pivot column (most negative in objective row)
            let pivotCol = -1;
            let minVal = 0;
            for (let j = 0; j < numCols - 1; j++) {
                if (tableau[m][j] < minVal) {
                    minVal = tableau[m][j];
                    pivotCol = j;
                }
            }
            
            if (pivotCol === -1) {
                // Optimal solution found
                const x = Array(n).fill(0);
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < n; j++) {
                        if (Math.abs(tableau[i][j] - 1) < 1e-10) {
                            let isBasic = true;
                            for (let k = 0; k < m; k++) {
                                if (k !== i && Math.abs(tableau[k][j]) > 1e-10) {
                                    isBasic = false;
                                    break;
                                }
                            }
                            if (isBasic) x[j] = tableau[i][numCols - 1];
                        }
                    }
                }
                return {
                    optimal: true,
                    x: x.slice(0, n),
                    objectiveValue: tableau[m][numCols - 1],
                    iterations: iter
                };
            }
            
            // Find pivot row (minimum ratio test)
            let pivotRow = -1;
            let minRatio = Infinity;
            for (let i = 0; i < m; i++) {
                if (tableau[i][pivotCol] > 1e-10) {
                    const ratio = tableau[i][numCols - 1] / tableau[i][pivotCol];
                    if (ratio < minRatio) {
                        minRatio = ratio;
                        pivotRow = i;
                    }
                }
            }
            
            if (pivotRow === -1) {
                return { optimal: false, unbounded: true };
            }
            
            // Pivot operation
            const pivot = tableau[pivotRow][pivotCol];
            for (let j = 0; j < numCols; j++) {
                tableau[pivotRow][j] /= pivot;
            }
            
            for (let i = 0; i <= m; i++) {
                if (i !== pivotRow) {
                    const factor = tableau[i][pivotCol];
                    for (let j = 0; j < numCols; j++) {
                        tableau[i][j] -= factor * tableau[pivotRow][j];
                    }
                }
            }
        }
        
        return { optimal: false, maxIterReached: true };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: CONSTRAINT SATISFACTION (MIT 6.034)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CSP = {
    
    /**
     * CSP Backtracking with MRV and forward checking
     * @param {Object} csp - CSP definition
     * @returns {Object} Solution or null
     */
    backtrackingSearch: function(csp) {
        const {
            variables,        // Array of variable names
            domains,          // {var: [possible values]}
            constraints       // function(assignment) => boolean
        } = csp;
        
        // Create working copy of domains
        const currentDomains = {};
        for (const v of variables) {
            currentDomains[v] = [...domains[v]];
        }
        
        const assignment = {};
        let nodesExplored = 0;
        
        const selectVariable = () => {
            // MRV: choose variable with minimum remaining values
            let minVar = null, minSize = Infinity;
            for (const v of variables) {
                if (!(v in assignment) && currentDomains[v].length < minSize) {
                    minSize = currentDomains[v].length;
                    minVar = v;
                }
            }
            return minVar;
        };
        
        const isConsistent = (variable, value) => {
            assignment[variable] = value;
            const result = constraints(assignment);
            delete assignment[variable];
            return result;
        };
        
        const backtrack = () => {
            nodesExplored++;
            
            if (Object.keys(assignment).length === variables.length) {
                return { ...assignment };
            }
            
            const variable = selectVariable();
            if (!variable) return null;
            
            for (const value of currentDomains[variable]) {
                if (isConsistent(variable, value)) {
                    assignment[variable] = value;
                    
                    const result = backtrack();
                    if (result) return result;
                    
                    delete assignment[variable];
                }
            }
            
            return null;
        };
        
        const solution = backtrack();
        return { solution, nodesExplored };
    },
    
    /**
     * AC-3 Arc Consistency Algorithm
     * @param {Object} csp - CSP with binary constraints
     * @returns {Object} Reduced domains
     */
    ac3: function(csp) {
        const { variables, domains, binaryConstraints } = csp;
        // binaryConstraints: {[v1,v2]: function(val1, val2) => boolean}
        
        const currentDomains = {};
        for (const v of variables) {
            currentDomains[v] = [...domains[v]];
        }
        
        // Initialize queue with all arcs
        const queue = [];
        for (const [key, _] of Object.entries(binaryConstraints)) {
            const [xi, xj] = key.split(',');
            queue.push([xi, xj]);
            queue.push([xj, xi]);
        }
        
        let revisionsCount = 0;
        
        const revise = (xi, xj) => {
            let revised = false;
            const constraintKey = `${xi},${xj}`;
            const reverseKey = `${xj},${xi}`;
            const constraint = binaryConstraints[constraintKey] || 
                              ((a, b) => binaryConstraints[reverseKey]?.(b, a));
            
            if (!constraint) return false;
            
            currentDomains[xi] = currentDomains[xi].filter(vi => {
                for (const vj of currentDomains[xj]) {
                    if (constraint(vi, vj)) return true;
                }
                revised = true;
                return false;
            });
            
            if (revised) revisionsCount++;
            return revised;
        };
        
        while (queue.length > 0) {
            const [xi, xj] = queue.shift();
            
            if (revise(xi, xj)) {
                if (currentDomains[xi].length === 0) {
                    return { consistent: false, domains: currentDomains };
                }
                
                // Add all arcs (xk, xi) to queue
                for (const xk of variables) {
                    if (xk !== xi && xk !== xj) {
                        const key1 = `${xk},${xi}`;
                        const key2 = `${xi},${xk}`;
                        if (binaryConstraints[key1] || binaryConstraints[key2]) {
                            queue.push([xk, xi]);
                        }
                    }
                }
            }
        }
        
        return { consistent: true, domains: currentDomains, revisions: revisionsCount };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: LQR CONTROL (MIT 6.231)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CONTROL = {
    
    /**
     * Discrete-time LQR solver
     * @param {Object} params - System and cost matrices
     * @returns {Object} Optimal gain matrix K
     */
    lqr: function(params) {
        const {
            A,            // State matrix (n x n)
            B,            // Input matrix (n x m)
            Q,            // State cost matrix (n x n)
            R,            // Input cost matrix (m x m)
            maxIter = 1000,
            epsilon = 1e-9
        } = params;
        
        const n = A.length;
        const m = B[0].length;
        
        // Matrix operations helpers
        const matMul = (A, B) => {
            const result = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0));
            for (let i = 0; i < A.length; i++) {
                for (let j = 0; j < B[0].length; j++) {
                    for (let k = 0; k < B.length; k++) {
                        result[i][j] += A[i][k] * B[k][j];
                    }
                }
            }
            return result;
        };
        
        const matAdd = (A, B) => A.map((row, i) => row.map((val, j) => val + B[i][j]));
        const matSub = (A, B) => A.map((row, i) => row.map((val, j) => val - B[i][j]));
        const transpose = (A) => A[0].map((_, j) => A.map(row => row[j]));
        
        // Simple matrix inverse for small matrices using Gaussian elimination
        const matInv = (M) => {
            const n = M.length;
            const aug = M.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
            
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                
                const pivot = aug[i][i];
                for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
                
                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = aug[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            aug[k][j] -= factor * aug[i][j];
                        }
                    }
                }
            }
            
            return aug.map(row => row.slice(n));
        };
        
        // Solve discrete-time algebraic Riccati equation by iteration
        let P = Q.map(row => [...row]);  // Initialize P = Q
        
        for (let iter = 0; iter < maxIter; iter++) {
            // K = (R + B'PB)^-1 B'PA
            const BtP = matMul(transpose(B), P);
            const BtPB = matMul(BtP, B);
            const BtPA = matMul(BtP, A);
            const RplusBtPB = matAdd(R, BtPB);
            const invRBtPB = matInv(RplusBtPB);
            const K = matMul(invRBtPB, BtPA);
            
            // P_new = Q + A'PA - A'PB(R+B'PB)^-1 B'PA
            const AtP = matMul(transpose(A), P);
            const AtPA = matMul(AtP, A);
            const AtPB = matMul(AtP, B);
            const correction = matMul(matMul(AtPB, invRBtPB), BtPA);
            const P_new = matSub(matAdd(Q, AtPA), correction);
            
            // Check convergence
            let maxDiff = 0;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    maxDiff = Math.max(maxDiff, Math.abs(P_new[i][j] - P[i][j]));
                }
            }
            
            P = P_new;
            
            if (maxDiff < epsilon) {
                // Compute final K
                const BtPfinal = matMul(transpose(B), P);
                const finalK = matMul(matInv(matAdd(R, matMul(BtPfinal, B))), matMul(BtPfinal, A));
                
                return { K: finalK, P, iterations: iter + 1, converged: true };
            }
        }
        
        // Return best K found
        const BtP = matMul(transpose(B), P);
        const K = matMul(matInv(matAdd(R, matMul(BtP, B))), matMul(BtP, A));
        
        return { K, P, iterations: maxIter, converged: false };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTES REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const BATCH17_GATEWAY_ROUTES = {
    // Sorting (MIT 6.006)
    'algo.sort.quick': 'PRISM_SORTING.quickSort',
    'algo.sort.merge': 'PRISM_SORTING.mergeSort',
    'algo.sort.heap': 'PRISM_SORTING.heapSort',
    
    // Graph (MIT 6.006, 6.034)
    'algo.graph.dijkstra': 'PRISM_GRAPH.dijkstra',
    'algo.graph.astar': 'PRISM_GRAPH.astar',
    'algo.graph.bellmanford': 'PRISM_GRAPH.bellmanFord',
    'algo.graph.mst': 'PRISM_GRAPH.kruskalMST',
    'algo.graph.bfs': 'PRISM_GRAPH.bfs',
    'algo.graph.dfs': 'PRISM_GRAPH.dfs',
    
    // Dynamic Programming (MIT 6.006, 6.231)
    'algo.dp.lcs': 'PRISM_DP.lcs',
    'algo.dp.knapsack': 'PRISM_DP.knapsack',
    'algo.dp.editdistance': 'PRISM_DP.editDistance',
    'dp.value.iteration': 'PRISM_DP.valueIteration',
    'dp.qlearning': 'PRISM_DP.qLearning',
    
    // Optimization (MIT 6.079)
    'optim.gradient.descent': 'PRISM_OPTIMIZATION.gradientDescent',
    'optim.newton': 'PRISM_OPTIMIZATION.newtonsMethod',
    'optim.lp.simplex': 'PRISM_OPTIMIZATION.simplex',
    
    // CSP (MIT 6.034)
    'ai.csp.backtrack': 'PRISM_CSP.backtrackingSearch',
    'ai.csp.ac3': 'PRISM_CSP.ac3',
    
    // Control (MIT 6.231)
    'control.lqr': 'PRISM_CONTROL.lqr'
};

// Auto-register routes
function registerBatch17Routes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(BATCH17_GATEWAY_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log(`[Batch 17] Registered ${Object.keys(BATCH17_GATEWAY_ROUTES).length} routes`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

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
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_SORTING,
        PRISM_GRAPH,
        PRISM_DP,
        PRISM_OPTIMIZATION,
        PRISM_CSP,
        PRISM_CONTROL,
        BATCH17_GATEWAY_ROUTES,
        registerBatch17Routes,
        PRISM_MIT_BATCH_17_TESTS
    };
}

if (typeof window !== 'undefined') {
    window.PRISM_SORTING = PRISM_SORTING;
    window.PRISM_GRAPH = PRISM_GRAPH;
    window.PRISM_DP = PRISM_DP;
    window.PRISM_OPTIMIZATION = PRISM_OPTIMIZATION;
    window.PRISM_CSP = PRISM_CSP;
    window.PRISM_CONTROL = PRISM_CONTROL;
    registerBatch17Routes();
}

console.log('[PRISM MIT Batch 17] EECS Algorithms loaded - 21 routes');
console.log('[PRISM MIT Batch 17] Courses: 6.006, 6.034, 6.046J, 6.079, 6.231');
/**
 * PRISM MIT Course Knowledge - Batch 19
 * AEROSPACE & DYNAMICS: Structures, Dynamics, Control, Communications
 * Source: MIT 16.001, 16.07, 16.30, 16.31, 16.36
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 19] Loading Aerospace & Dynamics Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: STRUCTURAL ANALYSIS (MIT 16.001)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_STRUCTURES = {
    
    /**
     * Calculate beam bending stress
     * @param {Object} params - Beam parameters
     * @returns {Object} Stress analysis results
     */
    beamBendingStress: function(params) {
        const {
            moment,      // Bending moment [N·mm or lb·in]
            I,           // Second moment of area [mm⁴ or in⁴]
            y,           // Distance from neutral axis [mm or in]
            yMax = null  // Maximum distance (for max stress)
        } = params;
        
        const stress = moment * y / I;
        const maxStress = yMax ? moment * yMax / I : null;
        
        return {
            stress,
            maxStress,
            formula: 'σ = My/I',
            units: 'Same as M/I·y (typically MPa or psi)'
        };
    },
    
    /**
     * Calculate second moment of area for common sections
     * @param {string} type - Section type
     * @param {Object} dims - Dimensions
     * @returns {Object} Section properties
     */
    sectionProperties: function(type, dims) {
        let I, A, yMax, Z;
        
        switch (type.toLowerCase()) {
            case 'rectangle':
                // dims: {b: width, h: height}
                A = dims.b * dims.h;
                I = dims.b * Math.pow(dims.h, 3) / 12;
                yMax = dims.h / 2;
                Z = I / yMax;  // Section modulus
                break;
                
            case 'circle':
                // dims: {r: radius} or {d: diameter}
                const r = dims.r || dims.d / 2;
                A = Math.PI * r * r;
                I = Math.PI * Math.pow(r, 4) / 4;
                yMax = r;
                Z = I / yMax;
                break;
                
            case 'hollow_circle':
            case 'tube':
                // dims: {ro: outer radius, ri: inner radius}
                A = Math.PI * (dims.ro * dims.ro - dims.ri * dims.ri);
                I = Math.PI * (Math.pow(dims.ro, 4) - Math.pow(dims.ri, 4)) / 4;
                yMax = dims.ro;
                Z = I / yMax;
                break;
                
            case 'i_beam':
                // dims: {w: flange width, h: total height, tf: flange thickness, tw: web thickness}
                const hw = dims.h - 2 * dims.tf;  // Web height
                A = 2 * dims.w * dims.tf + hw * dims.tw;
                I = (dims.w * Math.pow(dims.h, 3) - (dims.w - dims.tw) * Math.pow(hw, 3)) / 12;
                yMax = dims.h / 2;
                Z = I / yMax;
                break;
                
            default:
                throw new Error(`Unknown section type: ${type}`);
        }
        
        return {
            type,
            area: A,
            momentOfInertia: I,
            yMax,
            sectionModulus: Z,
            radiusOfGyration: Math.sqrt(I / A)
        };
    },
    
    /**
     * Calculate beam deflection for standard cases
     * @param {Object} params - Beam and loading parameters
     * @returns {Object} Deflection results
     */
    beamDeflection: function(params) {
        const {
            type,        // 'cantilever_point', 'cantilever_uniform', 'simply_point', 'simply_uniform'
            L,           // Length
            E,           // Young's modulus
            I,           // Moment of inertia
            P = 0,       // Point load
            w = 0,       // Distributed load (per unit length)
            a = null     // Load position for point loads (from left support)
        } = params;
        
        let maxDeflection, maxSlope, deflectionAt;
        
        switch (type) {
            case 'cantilever_point':
                // Point load P at free end
                maxDeflection = P * Math.pow(L, 3) / (3 * E * I);
                maxSlope = P * Math.pow(L, 2) / (2 * E * I);
                deflectionAt = (x) => P * Math.pow(x, 2) * (3 * L - x) / (6 * E * I);
                break;
                
            case 'cantilever_uniform':
                // Uniform load w over entire length
                maxDeflection = w * Math.pow(L, 4) / (8 * E * I);
                maxSlope = w * Math.pow(L, 3) / (6 * E * I);
                deflectionAt = (x) => w * Math.pow(x, 2) * (6 * L * L - 4 * L * x + x * x) / (24 * E * I);
                break;
                
            case 'simply_point':
                // Point load P at center of simply supported beam
                maxDeflection = P * Math.pow(L, 3) / (48 * E * I);
                maxSlope = P * Math.pow(L, 2) / (16 * E * I);
                deflectionAt = (x) => {
                    if (x <= L/2) {
                        return P * x * (3 * L * L - 4 * x * x) / (48 * E * I);
                    } else {
                        return P * (L - x) * (3 * L * L - 4 * Math.pow(L - x, 2)) / (48 * E * I);
                    }
                };
                break;
                
            case 'simply_uniform':
                // Uniform load w on simply supported beam
                maxDeflection = 5 * w * Math.pow(L, 4) / (384 * E * I);
                maxSlope = w * Math.pow(L, 3) / (24 * E * I);
                deflectionAt = (x) => w * x * (L - x) * (L * L + x * (L - x)) / (24 * E * I);
                break;
                
            default:
                throw new Error(`Unknown beam type: ${type}`);
        }
        
        return {
            type,
            maxDeflection,
            maxSlope,
            deflectionAt,
            stiffness: type.includes('point') ? P / maxDeflection : w * L / maxDeflection
        };
    },
    
    /**
     * Euler buckling analysis
     * @param {Object} params - Column parameters
     * @returns {Object} Buckling results
     */
    eulerBuckling: function(params) {
        const {
            E,           // Young's modulus
            I,           // Minimum moment of inertia
            L,           // Length
            endCondition = 'pinned-pinned',  // End condition
            A = null,    // Cross-sectional area (for stress calc)
            sigmaY = null // Yield stress (for applicability check)
        } = params;
        
        // Effective length factors
        const K_factors = {
            'fixed-fixed': 0.5,
            'fixed-pinned': 0.7,
            'pinned-pinned': 1.0,
            'fixed-free': 2.0
        };
        
        const K = K_factors[endCondition] || 1.0;
        const Le = K * L;  // Effective length
        
        // Critical load
        const Pcr = Math.PI * Math.PI * E * I / (Le * Le);
        
        // Results object
        const result = {
            criticalLoad: Pcr,
            effectiveLength: Le,
            effectiveLengthFactor: K,
            endCondition
        };
        
        // Additional calculations if area provided
        if (A) {
            const r = Math.sqrt(I / A);  // Radius of gyration
            const slenderness = Le / r;
            const criticalStress = Pcr / A;
            
            result.radiusOfGyration = r;
            result.slendernessRatio = slenderness;
            result.criticalStress = criticalStress;
            
            // Check applicability (Euler valid for long columns)
            if (sigmaY) {
                const transitionSlenderness = Math.PI * Math.sqrt(E / sigmaY);
                result.transitionSlenderness = transitionSlenderness;
                result.eulerValid = slenderness > transitionSlenderness;
                result.safetyFactor = sigmaY / criticalStress;
            }
        }
        
        return result;
    },
    
    /**
     * Shaft torsion analysis
     * @param {Object} params - Shaft parameters
     * @returns {Object} Torsion results
     */
    shaftTorsion: function(params) {
        const {
            T,           // Torque
            L,           // Length
            G,           // Shear modulus
            type = 'solid',
            ro,          // Outer radius
            ri = 0       // Inner radius (for hollow)
        } = params;
        
        // Polar moment of inertia
        const J = type === 'hollow' 
            ? Math.PI * (Math.pow(ro, 4) - Math.pow(ri, 4)) / 2
            : Math.PI * Math.pow(ro, 4) / 2;
        
        // Maximum shear stress (at outer surface)
        const tauMax = T * ro / J;
        
        // Angle of twist
        const phi = T * L / (G * J);
        
        return {
            polarMomentOfInertia: J,
            maxShearStress: tauMax,
            angleOfTwist: phi,
            angleOfTwistDegrees: phi * 180 / Math.PI,
            torsionalStiffness: G * J / L
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: DYNAMICS & VIBRATIONS (MIT 16.07)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_DYNAMICS = {
    
    /**
     * Free vibration analysis (undamped)
     * @param {Object} params - System parameters
     * @returns {Object} Vibration characteristics
     */
    freeVibration: function(params) {
        const { m, k, x0 = 0, v0 = 0 } = params;
        
        const omega_n = Math.sqrt(k / m);  // Natural frequency [rad/s]
        const f_n = omega_n / (2 * Math.PI);  // [Hz]
        const T = 1 / f_n;  // Period [s]
        
        // Response: x(t) = A*cos(ωt) + B*sin(ωt)
        const A = x0;
        const B = v0 / omega_n;
        const amplitude = Math.sqrt(A * A + B * B);
        const phase = Math.atan2(B, A);
        
        return {
            naturalFrequencyRad: omega_n,
            naturalFrequencyHz: f_n,
            period: T,
            amplitude,
            phase,
            response: (t) => A * Math.cos(omega_n * t) + B * Math.sin(omega_n * t)
        };
    },
    
    /**
     * Damped free vibration analysis
     * @param {Object} params - System parameters
     * @returns {Object} Damped vibration characteristics
     */
    dampedVibration: function(params) {
        const { m, c, k, x0 = 1, v0 = 0 } = params;
        
        const omega_n = Math.sqrt(k / m);
        const c_cr = 2 * Math.sqrt(k * m);  // Critical damping
        const zeta = c / c_cr;  // Damping ratio
        
        let type, omega_d, response;
        
        if (Math.abs(zeta - 1) < 1e-6) {
            // Critically damped
            type = 'critically_damped';
            const A = x0;
            const B = v0 + omega_n * x0;
            response = (t) => (A + B * t) * Math.exp(-omega_n * t);
        } else if (zeta < 1) {
            // Underdamped
            type = 'underdamped';
            omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
            const A = x0;
            const B = (v0 + zeta * omega_n * x0) / omega_d;
            response = (t) => Math.exp(-zeta * omega_n * t) * 
                (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t));
        } else {
            // Overdamped
            type = 'overdamped';
            const s1 = -zeta * omega_n + omega_n * Math.sqrt(zeta * zeta - 1);
            const s2 = -zeta * omega_n - omega_n * Math.sqrt(zeta * zeta - 1);
            const A = (v0 - s2 * x0) / (s1 - s2);
            const B = x0 - A;
            response = (t) => A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
        }
        
        return {
            naturalFrequency: omega_n,
            dampingRatio: zeta,
            criticalDamping: c_cr,
            dampedFrequency: omega_d || null,
            type,
            response,
            // For underdamped: logarithmic decrement
            logDecrement: type === 'underdamped' ? 2 * Math.PI * zeta / Math.sqrt(1 - zeta * zeta) : null
        };
    },
    
    /**
     * Forced vibration response (harmonic excitation)
     * @param {Object} params - System and excitation parameters
     * @returns {Object} Forced response
     */
    forcedVibration: function(params) {
        const { m, c, k, F0, omega } = params;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        const r = omega / omega_n;  // Frequency ratio
        
        // Steady-state amplitude
        const X = (F0 / k) / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Phase angle
        const phi = Math.atan2(2 * zeta * r, 1 - r * r);
        
        // Magnification factor
        const MF = X / (F0 / k);
        
        // Transmissibility (force transmitted to base)
        const TR = Math.sqrt(1 + Math.pow(2 * zeta * r, 2)) / 
                   Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        return {
            amplitude: X,
            phase: phi,
            phaseDegrees: phi * 180 / Math.PI,
            magnificationFactor: MF,
            transmissibility: TR,
            frequencyRatio: r,
            dampingRatio: zeta,
            isResonant: Math.abs(r - 1) < 0.1,
            response: (t) => X * Math.cos(omega * t - phi)
        };
    },
    
    /**
     * Calculate moment of inertia for rigid bodies
     * @param {string} type - Body type
     * @param {Object} params - Body parameters
     * @returns {Object} Inertia properties
     */
    rigidBodyInertia: function(type, params) {
        const { m } = params;
        let I, description;
        
        switch (type.toLowerCase()) {
            case 'slender_rod_center':
                // Rod about center, perpendicular to length
                I = m * params.L * params.L / 12;
                description = 'Slender rod about center';
                break;
                
            case 'slender_rod_end':
                // Rod about end, perpendicular to length
                I = m * params.L * params.L / 3;
                description = 'Slender rod about end';
                break;
                
            case 'solid_cylinder':
                // About central axis
                I = m * params.r * params.r / 2;
                description = 'Solid cylinder about axis';
                break;
                
            case 'solid_sphere':
                I = 2 * m * params.r * params.r / 5;
                description = 'Solid sphere about diameter';
                break;
                
            case 'hollow_sphere':
                I = 2 * m * params.r * params.r / 3;
                description = 'Thin hollow sphere';
                break;
                
            case 'disk':
                I = m * params.r * params.r / 2;
                description = 'Thin disk about axis';
                break;
                
            case 'hoop':
                I = m * params.r * params.r;
                description = 'Thin hoop about axis';
                break;
                
            case 'rectangular_plate':
                // About center, perpendicular to plate
                I = m * (params.a * params.a + params.b * params.b) / 12;
                description = 'Rectangular plate about center normal';
                break;
                
            default:
                throw new Error(`Unknown body type: ${type}`);
        }
        
        return {
            type,
            description,
            momentOfInertia: I,
            mass: m,
            // Radius of gyration
            radiusOfGyration: Math.sqrt(I / m)
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: FEEDBACK CONTROL (MIT 16.30, 16.31)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CONTROL = {
    
    /**
     * Analyze transfer function poles and zeros
     * @param {Object} tf - Transfer function {num: [...], den: [...]}
     * @returns {Object} Pole-zero analysis
     */
    poleZeroAnalysis: function(tf) {
        // For polynomials up to 2nd order, find roots analytically
        const findRoots = (coeffs) => {
            const n = coeffs.length - 1;
            if (n === 0) return [];
            if (n === 1) return [-coeffs[1] / coeffs[0]];
            if (n === 2) {
                const a = coeffs[0], b = coeffs[1], c = coeffs[2];
                const disc = b * b - 4 * a * c;
                if (disc >= 0) {
                    return [(-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a)];
                } else {
                    return [
                        { real: -b / (2 * a), imag: Math.sqrt(-disc) / (2 * a) },
                        { real: -b / (2 * a), imag: -Math.sqrt(-disc) / (2 * a) }
                    ];
                }
            }
            // For higher order, would need numerical root finding
            return null;
        };
        
        const poles = findRoots(tf.den);
        const zeros = findRoots(tf.num);
        
        // Stability analysis
        let stable = true;
        if (poles) {
            for (const p of poles) {
                const realPart = typeof p === 'object' ? p.real : p;
                if (realPart >= 0) {
                    stable = false;
                    break;
                }
            }
        }
        
        // DC gain
        const dcGain = tf.num[tf.num.length - 1] / tf.den[tf.den.length - 1];
        
        return {
            poles,
            zeros,
            stable,
            dcGain,
            order: tf.den.length - 1
        };
    },
    
    /**
     * Routh-Hurwitz stability criterion
     * @param {Array} coeffs - Characteristic polynomial coefficients [a_n, a_{n-1}, ..., a_0]
     * @returns {Object} Stability analysis
     */
    routhHurwitz: function(coeffs) {
        const n = coeffs.length - 1;
        
        // Build Routh array
        const rows = Math.ceil((n + 1) / 2);
        const array = [];
        
        // First two rows from coefficients
        array[0] = [];
        array[1] = [];
        for (let i = 0; i <= n; i++) {
            if (i % 2 === 0) array[0].push(coeffs[i]);
            else array[1].push(coeffs[i]);
        }
        
        // Pad with zeros
        const cols = Math.max(array[0].length, array[1].length);
        while (array[0].length < cols) array[0].push(0);
        while (array[1].length < cols) array[1].push(0);
        
        // Compute remaining rows
        for (let i = 2; i <= n; i++) {
            array[i] = [];
            for (let j = 0; j < cols - 1; j++) {
                const a = array[i-1][0];
                const b = array[i-2][0];
                const c = array[i-1][j+1] || 0;
                const d = array[i-2][j+1] || 0;
                
                if (Math.abs(a) < 1e-10) {
                    // Special case: zero in first column
                    array[i].push(0);
                } else {
                    array[i].push((a * d - b * c) / a);
                }
            }
            if (array[i].length === 0) array[i].push(0);
        }
        
        // Count sign changes in first column
        const firstCol = array.map(row => row[0]);
        let signChanges = 0;
        for (let i = 1; i < firstCol.length; i++) {
            if (firstCol[i] * firstCol[i-1] < 0) signChanges++;
        }
        
        return {
            routhArray: array,
            firstColumn: firstCol,
            signChanges,
            rhpPoles: signChanges,
            stable: signChanges === 0
        };
    },
    
    /**
     * PID controller tuning (Ziegler-Nichols)
     * @param {Object} params - System parameters from step response or ultimate gain test
     * @returns {Object} PID gains
     */
    pidTuning: function(params) {
        const { method = 'ziegler-nichols-step' } = params;
        let Kp, Ki, Kd;
        
        if (method === 'ziegler-nichols-step') {
            // From step response: K (gain), L (delay), T (time constant)
            const { K, L, T } = params;
            
            return {
                P: { Kp: T / (K * L), Ki: 0, Kd: 0 },
                PI: { Kp: 0.9 * T / (K * L), Ki: 0.9 * T / (K * L) / (3.33 * L), Kd: 0 },
                PID: { Kp: 1.2 * T / (K * L), Ki: 1.2 * T / (K * L) / (2 * L), Kd: 1.2 * T / (K * L) * 0.5 * L }
            };
        } else if (method === 'ziegler-nichols-ultimate') {
            // From ultimate gain test: Ku (ultimate gain), Tu (ultimate period)
            const { Ku, Tu } = params;
            
            return {
                P: { Kp: 0.5 * Ku, Ki: 0, Kd: 0 },
                PI: { Kp: 0.45 * Ku, Ki: 0.45 * Ku / (0.83 * Tu), Kd: 0 },
                PID: { Kp: 0.6 * Ku, Ki: 0.6 * Ku / (0.5 * Tu), Kd: 0.6 * Ku * 0.125 * Tu }
            };
        }
        
        throw new Error(`Unknown tuning method: ${method}`);
    },
    
    /**
     * Calculate gain and phase margins from frequency response data
     * @param {Function} G - Transfer function G(jω) returning {mag, phase}
     * @param {Object} options - Frequency range options
     * @returns {Object} Stability margins
     */
    stabilityMargins: function(G, options = {}) {
        const { omegaMin = 0.01, omegaMax = 1000, points = 1000 } = options;
        
        const logMin = Math.log10(omegaMin);
        const logMax = Math.log10(omegaMax);
        
        let gainCrossover = null;  // Where |G| = 1
        let phaseCrossover = null; // Where phase = -180°
        let gainMargin = null;
        let phaseMargin = null;
        
        let prevMag = null, prevPhase = null, prevOmega = null;
        
        for (let i = 0; i <= points; i++) {
            const omega = Math.pow(10, logMin + (logMax - logMin) * i / points);
            const { mag, phase } = G(omega);
            
            // Find gain crossover (|G| = 1)
            if (prevMag !== null && ((prevMag - 1) * (mag - 1) < 0)) {
                // Interpolate
                const t = (1 - prevMag) / (mag - prevMag);
                gainCrossover = prevOmega + t * (omega - prevOmega);
                const phaseAtCrossover = prevPhase + t * (phase - prevPhase);
                phaseMargin = 180 + phaseAtCrossover;  // PM = 180 + phase(at |G|=1)
            }
            
            // Find phase crossover (phase = -180°)
            if (prevPhase !== null && ((prevPhase + 180) * (phase + 180) < 0)) {
                const t = (-180 - prevPhase) / (phase - prevPhase);
                phaseCrossover = prevOmega + t * (omega - prevOmega);
                const magAtCrossover = prevMag + t * (mag - prevMag);
                gainMargin = 1 / magAtCrossover;  // GM = 1/|G| at phase=-180
            }
            
            prevMag = mag;
            prevPhase = phase;
            prevOmega = omega;
        }
        
        return {
            gainMargin,
            gainMarginDB: gainMargin ? 20 * Math.log10(gainMargin) : null,
            phaseMargin,
            gainCrossoverFreq: gainCrossover,
            phaseCrossoverFreq: phaseCrossover,
            stable: (gainMargin === null || gainMargin > 1) && (phaseMargin === null || phaseMargin > 0)
        };
    },
    
    /**
     * State feedback pole placement (Ackermann's formula for 2x2)
     * @param {Object} system - State space {A, B} matrices
     * @param {Array} desiredPoles - Desired closed-loop poles
     * @returns {Object} Feedback gain K
     */
    polePlacement: function(system, desiredPoles) {
        const { A, B } = system;
        const n = A.length;
        
        if (n !== 2) {
            throw new Error('This implementation supports 2x2 systems only');
        }
        
        // Check controllability
        const C = [B, this._matVec(A, B)];
        const detC = C[0][0] * C[1][1] - C[0][1] * C[1][0];
        
        if (Math.abs(detC) < 1e-10) {
            return { controllable: false, K: null };
        }
        
        // Desired characteristic polynomial: (s - p1)(s - p2) = s² + a1*s + a0
        const p1 = desiredPoles[0], p2 = desiredPoles[1];
        const a1 = -(p1 + p2);
        const a0 = p1 * p2;
        
        // Ackermann: K = [0 1] * C^(-1) * α(A)
        // α(A) = A² + a1*A + a0*I
        
        const A2 = this._matMul(A, A);
        const alphaA = [
            [A2[0][0] + a1 * A[0][0] + a0, A2[0][1] + a1 * A[0][1]],
            [A2[1][0] + a1 * A[1][0], A2[1][1] + a1 * A[1][1] + a0]
        ];
        
        // C^(-1)
        const Cinv = [
            [C[1][1] / detC, -C[0][1] / detC],
            [-C[1][0] / detC, C[0][0] / detC]
        ];
        
        // [0 1] * Cinv * alphaA
        const CinvAlpha = this._matMul(Cinv, alphaA);
        const K = [CinvAlpha[1][0], CinvAlpha[1][1]];  // [0 1] * CinvAlpha
        
        return {
            controllable: true,
            K,
            desiredPoles,
            closedLoopA: [
                [A[0][0] - B[0] * K[0], A[0][1] - B[0] * K[1]],
                [A[1][0] - B[1] * K[0], A[1][1] - B[1] * K[1]]
            ]
        };
    },
    
    /**
     * Luenberger observer design
     * @param {Object} system - State space {A, C} matrices
     * @param {Array} desiredPoles - Desired observer poles
     * @returns {Object} Observer gain L
     */
    observerDesign: function(system, desiredPoles) {
        const { A, C } = system;
        const n = A.length;
        
        if (n !== 2) {
            throw new Error('This implementation supports 2x2 systems only');
        }
        
        // Observability matrix O = [C; CA]
        const CA = [C[0] * A[0][0] + C[1] * A[1][0], C[0] * A[0][1] + C[1] * A[1][1]];
        const O = [[C[0], C[1]], CA];
        const detO = O[0][0] * O[1][1] - O[0][1] * O[1][0];
        
        if (Math.abs(detO) < 1e-10) {
            return { observable: false, L: null };
        }
        
        // Use duality: observer poles = eigenvalues of (A - LC)
        // Design using transposed system: (A', C') with desired poles
        const AT = [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
        const CT = [[C[0]], [C[1]]];
        
        // Desired characteristic polynomial
        const p1 = desiredPoles[0], p2 = desiredPoles[1];
        const a1 = -(p1 + p2);
        const a0 = p1 * p2;
        
        // Controllability of (A', C')
        const Ct = [CT[0][0], CT[1][0]];
        const ATCt = [AT[0][0] * Ct[0] + AT[0][1] * Ct[1], AT[1][0] * Ct[0] + AT[1][1] * Ct[1]];
        
        const Cbar = [[Ct[0], ATCt[0]], [Ct[1], ATCt[1]]];
        const detCbar = Cbar[0][0] * Cbar[1][1] - Cbar[0][1] * Cbar[1][0];
        
        // α(A')
        const AT2 = this._matMul(AT, AT);
        const alphaAT = [
            [AT2[0][0] + a1 * AT[0][0] + a0, AT2[0][1] + a1 * AT[0][1]],
            [AT2[1][0] + a1 * AT[1][0], AT2[1][1] + a1 * AT[1][1] + a0]
        ];
        
        const CbarInv = [
            [Cbar[1][1] / detCbar, -Cbar[0][1] / detCbar],
            [-Cbar[1][0] / detCbar, Cbar[0][0] / detCbar]
        ];
        
        const temp = this._matMul(CbarInv, alphaAT);
        const LT = [temp[1][0], temp[1][1]];
        const L = [[LT[0]], [LT[1]]];  // Transpose back
        
        return {
            observable: true,
            L: [L[0][0], L[1][0]],
            desiredPoles,
            observerA: [
                [A[0][0] - L[0][0] * C[0], A[0][1] - L[0][0] * C[1]],
                [A[1][0] - L[1][0] * C[0], A[1][1] - L[1][0] * C[1]]
            ]
        };
    },
    
    // Helper functions
    _matMul: function(A, B) {
        const m = A.length, n = B[0].length, p = B.length;
        const C = Array(m).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < p; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    },
    
    _matVec: function(A, v) {
        return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
    }
}