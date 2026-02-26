const PRISM_GRAPH_ALGORITHMS_ENGINE = {
    name: 'PRISM_GRAPH_ALGORITHMS_ENGINE',
    version: '1.0.0',
    description: 'Graph algorithms: MST, shortest paths, topological sort, SCC',
    source: 'MIT 6.046J, Stanford CS 161',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Kruskal's Minimum Spanning Tree
    // ─────────────────────────────────────────────────────────────────────────────
    
    kruskalMST: function(nodes, edges) {
        // edges: [{from, to, weight}]
        const parent = {};
        const rank = {};
        
        // Union-Find helpers
        const find = (x) => {
            if (parent[x] !== x) {
                parent[x] = find(parent[x]); // Path compression
            }
            return parent[x];
        };
        
        const union = (x, y) => {
            const px = find(x);
            const py = find(y);
            
            if (px === py) return false;
            
            // Union by rank
            if (rank[px] < rank[py]) {
                parent[px] = py;
            } else if (rank[px] > rank[py]) {
                parent[py] = px;
            } else {
                parent[py] = px;
                rank[px]++;
            }
            return true;
        };
        
        // Initialize
        for (const node of nodes) {
            parent[node] = node;
            rank[node] = 0;
        }
        
        // Sort edges by weight
        const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
        
        const mstEdges = [];
        let totalWeight = 0;
        
        for (const edge of sortedEdges) {
            if (union(edge.from, edge.to)) {
                mstEdges.push(edge);
                totalWeight += edge.weight;
                
                if (mstEdges.length === nodes.length - 1) break;
            }
        }
        
        return {
            edges: mstEdges,
            totalWeight,
            isConnected: mstEdges.length === nodes.length - 1
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Prim's Minimum Spanning Tree
    // ─────────────────────────────────────────────────────────────────────────────
    
    primMST: function(nodes, adjacencyList) {
        // adjacencyList: {node: [{neighbor, weight}]}
        if (nodes.length === 0) return { edges: [], totalWeight: 0 };
        
        const inMST = new Set();
        const mstEdges = [];
        let totalWeight = 0;
        
        // Priority queue: {node, fromNode, weight}
        const pq = [{ node: nodes[0], fromNode: null, weight: 0 }];
        
        while (pq.length > 0 && inMST.size < nodes.length) {
            // Get min weight edge
            pq.sort((a, b) => a.weight - b.weight);
            const { node, fromNode, weight } = pq.shift();
            
            if (inMST.has(node)) continue;
            inMST.add(node);
            
            if (fromNode !== null) {
                mstEdges.push({ from: fromNode, to: node, weight });
                totalWeight += weight;
            }
            
            // Add neighbors to queue
            const neighbors = adjacencyList[node] || [];
            for (const { neighbor, weight: w } of neighbors) {
                if (!inMST.has(neighbor)) {
                    pq.push({ node: neighbor, fromNode: node, weight: w });
                }
            }
        }
        
        return {
            edges: mstEdges,
            totalWeight,
            isConnected: inMST.size === nodes.length
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Bellman-Ford (handles negative weights)
    // ─────────────────────────────────────────────────────────────────────────────
    
    bellmanFord: function(nodes, edges, source) {
        const dist = {};
        const prev = {};
        
        // Initialize
        for (const node of nodes) {
            dist[node] = node === source ? 0 : Infinity;
            prev[node] = null;
        }
        
        // Relax edges |V| - 1 times
        for (let i = 0; i < nodes.length - 1; i++) {
            let changed = false;
            
            for (const { from, to, weight } of edges) {
                if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
                    dist[to] = dist[from] + weight;
                    prev[to] = from;
                    changed = true;
                }
            }
            
            if (!changed) break; // Early termination
        }
        
        // Check for negative cycles
        for (const { from, to, weight } of edges) {
            if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
                return { success: false, reason: 'Negative cycle detected' };
            }
        }
        
        return { success: true, distances: dist, predecessors: prev };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Floyd-Warshall (All-pairs shortest paths)
    // ─────────────────────────────────────────────────────────────────────────────
    
    floydWarshall: function(nodes, edges) {
        const n = nodes.length;
        const nodeIndex = {};
        nodes.forEach((node, i) => nodeIndex[node] = i);
        
        // Initialize distance matrix
        const dist = [];
        const next = [];
        
        for (let i = 0; i < n; i++) {
            dist[i] = [];
            next[i] = [];
            for (let j = 0; j < n; j++) {
                dist[i][j] = i === j ? 0 : Infinity;
                next[i][j] = null;
            }
        }
        
        // Add edge weights
        for (const { from, to, weight } of edges) {
            const i = nodeIndex[from];
            const j = nodeIndex[to];
            dist[i][j] = weight;
            next[i][j] = j;
        }
        
        // Floyd-Warshall
        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                        next[i][j] = next[i][k];
                    }
                }
            }
        }
        
        // Check for negative cycles
        for (let i = 0; i < n; i++) {
            if (dist[i][i] < 0) {
                return { success: false, reason: 'Negative cycle detected' };
            }
        }
        
        // Reconstruct path function
        const getPath = (from, to) => {
            const i = nodeIndex[from];
            const j = nodeIndex[to];
            
            if (next[i][j] === null) return null;
            
            const path = [from];
            let current = i;
            while (current !== j) {
                current = next[current][j];
                path.push(nodes[current]);
            }
            return path;
        };
        
        return {
            success: true,
            distances: dist,
            nodes,
            nodeIndex,
            getPath,
            getDistance: (from, to) => dist[nodeIndex[from]][nodeIndex[to]]
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Topological Sort (Kahn's Algorithm)
    // ─────────────────────────────────────────────────────────────────────────────
    
    topologicalSort: function(nodes, edges) {
        const inDegree = {};
        const adjacency = {};
        
        for (const node of nodes) {
            inDegree[node] = 0;
            adjacency[node] = [];
        }
        
        for (const { from, to } of edges) {
            adjacency[from].push(to);
            inDegree[to]++;
        }
        
        const queue = nodes.filter(n => inDegree[n] === 0);
        const sorted = [];
        
        while (queue.length > 0) {
            const node = queue.shift();
            sorted.push(node);
            
            for (const neighbor of adjacency[node]) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            }
        }
        
        if (sorted.length !== nodes.length) {
            return { success: false, reason: 'Graph contains cycle' };
        }
        
        return { success: true, order: sorted };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Strongly Connected Components (Kosaraju's)
    // ─────────────────────────────────────────────────────────────────────────────
    
    stronglyConnectedComponents: function(nodes, edges) {
        const adjacency = {};
        const reverseAdj = {};
        
        for (const node of nodes) {
            adjacency[node] = [];
            reverseAdj[node] = [];
        }
        
        for (const { from, to } of edges) {
            adjacency[from].push(to);
            reverseAdj[to].push(from);
        }
        
        // First DFS to get finish order
        const visited = new Set();
        const finishOrder = [];
        
        const dfs1 = (node) => {
            visited.add(node);
            for (const neighbor of adjacency[node]) {
                if (!visited.has(neighbor)) {
                    dfs1(neighbor);
                }
            }
            finishOrder.push(node);
        };
        
        for (const node of nodes) {
            if (!visited.has(node)) {
                dfs1(node);
            }
        }
        
        // Second DFS on reverse graph
        visited.clear();
        const components = [];
        
        const dfs2 = (node, component) => {
            visited.add(node);
            component.push(node);
            for (const neighbor of reverseAdj[node]) {
                if (!visited.has(neighbor)) {
                    dfs2(neighbor, component);
                }
            }
        };
        
        while (finishOrder.length > 0) {
            const node = finishOrder.pop();
            if (!visited.has(node)) {
                const component = [];
                dfs2(node, component);
                components.push(component);
            }
        }
        
        return {
            components,
            numComponents: components.length,
            isStronglyConnected: components.length === 1
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Critical Path Method (CPM)
    // ─────────────────────────────────────────────────────────────────────────────
    
    criticalPathMethod: function(activities) {
        // activities: [{id, duration, predecessors: []}]
        
        // Build graph
        const nodes = activities.map(a => a.id);
        const edges = [];
        const activityMap = new Map(activities.map(a => [a.id, a]));
        
        for (const activity of activities) {
            for (const pred of (activity.predecessors || [])) {
                edges.push({ from: pred, to: activity.id });
            }
        }
        
        // Topological sort
        const sortResult = this.topologicalSort(nodes, edges);
        if (!sortResult.success) {
            return { success: false, reason: 'Cyclic dependency' };
        }
        
        // Forward pass - calculate early start/finish
        const ES = {};
        const EF = {};
        
        for (const id of sortResult.order) {
            const activity = activityMap.get(id);
            const preds = activity.predecessors || [];
            
            ES[id] = preds.length === 0 ? 0 : Math.max(...preds.map(p => EF[p]));
            EF[id] = ES[id] + activity.duration;
        }
        
        const projectDuration = Math.max(...Object.values(EF));
        
        // Backward pass - calculate late start/finish
        const LF = {};
        const LS = {};
        
        for (const id of sortResult.order.slice().reverse()) {
            const activity = activityMap.get(id);
            
            // Find successors
            const successors = activities
                .filter(a => (a.predecessors || []).includes(id))
                .map(a => a.id);
            
            LF[id] = successors.length === 0 ? projectDuration : Math.min(...successors.map(s => LS[s]));
            LS[id] = LF[id] - activity.duration;
        }
        
        // Calculate slack and identify critical path
        const slack = {};
        const criticalPath = [];
        
        for (const id of nodes) {
            slack[id] = LS[id] - ES[id];
            if (Math.abs(slack[id]) < 0.001) {
                criticalPath.push(id);
            }
        }
        
        return {
            success: true,
            projectDuration,
            earlyStart: ES,
            earlyFinish: EF,
            lateStart: LS,
            lateFinish: LF,
            slack,
            criticalPath,
            schedule: activities.map(a => ({
                id: a.id,
                duration: a.duration,
                ES: ES[a.id],
                EF: EF[a.id],
                LS: LS[a.id],
                LF: LF[a.id],
                slack: slack[a.id],
                isCritical: Math.abs(slack[a.id]) < 0.001
            }))
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('graph.mst.kruskal', 'PRISM_GRAPH_ALGORITHMS_ENGINE.kruskalMST');
            PRISM_GATEWAY.register('graph.mst.prim', 'PRISM_GRAPH_ALGORITHMS_ENGINE.primMST');
            PRISM_GATEWAY.register('graph.bellmanFord', 'PRISM_GRAPH_ALGORITHMS_ENGINE.bellmanFord');
            PRISM_GATEWAY.register('graph.floydWarshall', 'PRISM_GRAPH_ALGORITHMS_ENGINE.floydWarshall');
            PRISM_GATEWAY.register('graph.topologicalSort', 'PRISM_GRAPH_ALGORITHMS_ENGINE.topologicalSort');
            PRISM_GATEWAY.register('graph.scc', 'PRISM_GRAPH_ALGORITHMS_ENGINE.stronglyConnectedComponents');
            PRISM_GATEWAY.register('graph.cpm', 'PRISM_GRAPH_ALGORITHMS_ENGINE.criticalPathMethod');
        }
    }
}