/**
 * PRISM_GRAPH
 * Extracted from PRISM v8.89.002 monolith
 * References: 14
 * Category: graph
 * Lines: 277
 * Session: R2.3.3 Algorithm Extraction Wave 2
 */

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
}