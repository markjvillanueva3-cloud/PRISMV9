const PRISM_COMBINATORIAL = {
    name: 'PRISM_COMBINATORIAL',
    version: '1.0.0',
    source: 'MIT 18.453 - Combinatorial Optimization',
    
    /**
     * Hungarian Algorithm (Kuhn-Munkres)
     * Optimal assignment problem O(n³)
     * Source: MIT 18.453
     */
    hungarian: function(costMatrix) {
        const n = costMatrix.length;
        const m = costMatrix[0].length;
        
        // Pad to square if needed
        const size = Math.max(n, m);
        const matrix = [];
        for (let i = 0; i < size; i++) {
            matrix[i] = [];
            for (let j = 0; j < size; j++) {
                if (i < n && j < m) {
                    matrix[i][j] = costMatrix[i][j];
                } else {
                    matrix[i][j] = 0; // Dummy assignments have zero cost
                }
            }
        }
        
        // Step 1: Subtract row minimum
        for (let i = 0; i < size; i++) {
            const minVal = Math.min(...matrix[i]);
            for (let j = 0; j < size; j++) {
                matrix[i][j] -= minVal;
            }
        }
        
        // Step 2: Subtract column minimum
        for (let j = 0; j < size; j++) {
            let minVal = Infinity;
            for (let i = 0; i < size; i++) {
                minVal = Math.min(minVal, matrix[i][j]);
            }
            for (let i = 0; i < size; i++) {
                matrix[i][j] -= minVal;
            }
        }
        
        // Steps 3-5: Find optimal assignment
        const assignment = this._hungarianAssign(matrix, size);
        
        // Calculate total cost using original matrix
        let totalCost = 0;
        const result = [];
        for (let i = 0; i < n; i++) {
            if (assignment[i] < m) {
                result.push({ row: i, col: assignment[i] });
                totalCost += costMatrix[i][assignment[i]];
            }
        }
        
        return { assignment: result, cost: totalCost };
    },
    
    _hungarianAssign: function(matrix, n) {
        const u = new Array(n + 1).fill(0);
        const v = new Array(n + 1).fill(0);
        const p = new Array(n + 1).fill(0);
        const way = new Array(n + 1).fill(0);
        
        for (let i = 1; i <= n; i++) {
            p[0] = i;
            let j0 = 0;
            const minv = new Array(n + 1).fill(Infinity);
            const used = new Array(n + 1).fill(false);
            
            do {
                used[j0] = true;
                const i0 = p[j0];
                let delta = Infinity;
                let j1 = 0;
                
                for (let j = 1; j <= n; j++) {
                    if (!used[j]) {
                        const cur = matrix[i0 - 1][j - 1] - u[i0] - v[j];
                        if (cur < minv[j]) {
                            minv[j] = cur;
                            way[j] = j0;
                        }
                        if (minv[j] < delta) {
                            delta = minv[j];
                            j1 = j;
                        }
                    }
                }
                
                for (let j = 0; j <= n; j++) {
                    if (used[j]) {
                        u[p[j]] += delta;
                        v[j] -= delta;
                    } else {
                        minv[j] -= delta;
                    }
                }
                
                j0 = j1;
            } while (p[j0] !== 0);
            
            do {
                const j1 = way[j0];
                p[j0] = p[j1];
                j0 = j1;
            } while (j0);
        }
        
        const result = new Array(n);
        for (let j = 1; j <= n; j++) {
            if (p[j] !== 0) {
                result[p[j] - 1] = j - 1;
            }
        }
        return result;
    },
    
    /**
     * Christofides Algorithm for TSP
     * 1.5-approximation for metric TSP
     * Source: MIT 18.453
     */
    christofides: function(distanceMatrix) {
        const n = distanceMatrix.length;
        
        // Step 1: Find Minimum Spanning Tree (Prim's)
        const mst = this._primMST(distanceMatrix);
        
        // Step 2: Find odd-degree vertices
        const degree = new Array(n).fill(0);
        for (const edge of mst) {
            degree[edge.from]++;
            degree[edge.to]++;
        }
        const oddVertices = [];
        for (let i = 0; i < n; i++) {
            if (degree[i] % 2 === 1) {
                oddVertices.push(i);
            }
        }
        
        // Step 3: Minimum weight matching on odd vertices
        const matching = this._minWeightMatching(oddVertices, distanceMatrix);
        
        // Step 4: Combine MST and matching to form Eulerian graph
        const eulerianEdges = [...mst, ...matching];
        
        // Step 5: Find Eulerian tour
        const eulerianTour = this._findEulerianTour(eulerianEdges, n);
        
        // Step 6: Convert to Hamiltonian tour (skip repeated vertices)
        const visited = new Set();
        const tour = [];
        for (const v of eulerianTour) {
            if (!visited.has(v)) {
                visited.add(v);
                tour.push(v);
            }
        }
        
        // Step 7: Apply 2-opt improvement
        const improved = PRISM_LOCAL_SEARCH.twoOpt(tour, distanceMatrix);
        
        return {
            tour: improved.tour,
            length: improved.length,
            mstWeight: mst.reduce((sum, e) => sum + e.weight, 0),
            matchingWeight: matching.reduce((sum, e) => sum + e.weight, 0)
        };
    },
    
    _primMST: function(distances) {
        const n = distances.length;
        const inMST = new Array(n).fill(false);
        const key = new Array(n).fill(Infinity);
        const parent = new Array(n).fill(-1);
        const edges = [];
        
        key[0] = 0;
        
        for (let count = 0; count < n; count++) {
            // Find minimum key vertex not in MST
            let u = -1;
            let minKey = Infinity;
            for (let v = 0; v < n; v++) {
                if (!inMST[v] && key[v] < minKey) {
                    minKey = key[v];
                    u = v;
                }
            }
            
            if (u === -1) break;
            inMST[u] = true;
            
            if (parent[u] !== -1) {
                edges.push({ from: parent[u], to: u, weight: distances[parent[u]][u] });
            }
            
            // Update keys of adjacent vertices
            for (let v = 0; v < n; v++) {
                if (!inMST[v] && distances[u][v] < key[v]) {
                    key[v] = distances[u][v];
                    parent[v] = u;
                }
            }
        }
        
        return edges;
    },
    
    _minWeightMatching: function(vertices, distances) {
        // Greedy matching (optimal requires Blossom algorithm)
        const matched = new Set();
        const matching = [];
        
        // Sort all pairs by distance
        const pairs = [];
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                pairs.push({
                    v1: vertices[i],
                    v2: vertices[j],
                    dist: distances[vertices[i]][vertices[j]]
                });
            }
        }
        pairs.sort((a, b) => a.dist - b.dist);
        
        // Greedy matching
        for (const pair of pairs) {
            if (!matched.has(pair.v1) && !matched.has(pair.v2)) {
                matched.add(pair.v1);
                matched.add(pair.v2);
                matching.push({ from: pair.v1, to: pair.v2, weight: pair.dist });
            }
        }
        
        return matching;
    },
    
    _findEulerianTour: function(edges, n) {
        // Build adjacency list
        const adj = Array.from({ length: n }, () => []);
        for (const edge of edges) {
            adj[edge.from].push({ to: edge.to, used: false });
            adj[edge.to].push({ to: edge.from, used: false });
        }
        
        // Hierholzer's algorithm
        const tour = [];
        const stack = [0];
        
        while (stack.length > 0) {
            const v = stack[stack.length - 1];
            let found = false;
            
            for (const edge of adj[v]) {
                if (!edge.used) {
                    edge.used = true;
                    // Mark reverse edge
                    for (const rev of adj[edge.to]) {
                        if (rev.to === v && !rev.used) {
                            rev.used = true;
                            break;
                        }
                    }
                    stack.push(edge.to);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                tour.push(stack.pop());
            }
        }
        
        return tour.reverse();
    },
    
    /**
     * Nearest Neighbor Heuristic for TSP
     * Simple O(n²) approximation
     */
    nearestNeighborTSP: function(distanceMatrix, startVertex = 0) {
        const n = distanceMatrix.length;
        const visited = new Set([startVertex]);
        const tour = [startVertex];
        let current = startVertex;
        let totalDistance = 0;
        
        while (visited.size < n) {
            let nearest = -1;
            let nearestDist = Infinity;
            
            for (let i = 0; i < n; i++) {
                if (!visited.has(i) && distanceMatrix[current][i] < nearestDist) {
                    nearestDist = distanceMatrix[current][i];
                    nearest = i;
                }
            }
            
            if (nearest === -1) break;
            
            visited.add(nearest);
            tour.push(nearest);
            totalDistance += nearestDist;
            current = nearest;
        }
        
        // Return to start
        totalDistance += distanceMatrix[current][startVertex];
        
        return { tour, length: totalDistance };
    }
}