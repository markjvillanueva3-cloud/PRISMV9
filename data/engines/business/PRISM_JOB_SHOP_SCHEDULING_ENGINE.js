/**
 * PRISM_JOB_SHOP_SCHEDULING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 920
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_JOB_SHOP_SCHEDULING_ENGINE = {
    name: 'PRISM_JOB_SHOP_SCHEDULING_ENGINE',
    version: '1.0.0',
    description: 'Job shop scheduling with dispatching rules and optimization',
    source: 'MIT 15.053, Operations Research',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dispatching Rules
    // ─────────────────────────────────────────────────────────────────────────────
    
    dispatchingRules: {
        FIFO: (jobs) => jobs.sort((a, b) => a.arrivalTime - b.arrivalTime),
        SPT: (jobs) => jobs.sort((a, b) => a.processingTime - b.processingTime),
        LPT: (jobs) => jobs.sort((a, b) => b.processingTime - a.processingTime),
        EDD: (jobs) => jobs.sort((a, b) => a.dueDate - b.dueDate),
        CR: (jobs, currentTime) => jobs.sort((a, b) => {
            const crA = (a.dueDate - currentTime) / a.remainingTime;
            const crB = (b.dueDate - currentTime) / b.remainingTime;
            return crA - crB;
        }),
        SLACK: (jobs, currentTime) => jobs.sort((a, b) => {
            const slackA = a.dueDate - currentTime - a.remainingTime;
            const slackB = b.dueDate - currentTime - b.remainingTime;
            return slackA - slackB;
        })
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Single Machine Scheduling
    // ─────────────────────────────────────────────────────────────────────────────
    
    scheduleSingleMachine: function(jobs, rule = 'SPT', objective = 'makespan') {
        const sortedJobs = [...jobs];
        
        if (this.dispatchingRules[rule]) {
            this.dispatchingRules[rule](sortedJobs, 0);
        }
        
        let currentTime = 0;
        const schedule = [];
        let totalFlowTime = 0;
        let totalTardiness = 0;
        let tardinessCount = 0;
        
        for (const job of sortedJobs) {
            const startTime = Math.max(currentTime, job.arrivalTime || 0);
            const endTime = startTime + job.processingTime;
            
            const tardiness = Math.max(0, endTime - job.dueDate);
            if (tardiness > 0) tardinessCount++;
            
            schedule.push({
                jobId: job.id,
                startTime,
                endTime,
                tardiness,
                flowTime: endTime - (job.arrivalTime || 0)
            });
            
            totalFlowTime += endTime - (job.arrivalTime || 0);
            totalTardiness += tardiness;
            currentTime = endTime;
        }
        
        return {
            schedule,
            makespan: currentTime,
            totalFlowTime,
            averageFlowTime: totalFlowTime / jobs.length,
            totalTardiness,
            numberOfTardyJobs: tardinessCount,
            rule
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Flow Shop Scheduling (Johnson's Algorithm for 2 machines)
    // ─────────────────────────────────────────────────────────────────────────────
    
    johnsonsAlgorithm: function(jobs) {
        // jobs: [{id, machine1Time, machine2Time}]
        const U = []; // Jobs with min time on machine 1
        const V = []; // Jobs with min time on machine 2
        
        for (const job of jobs) {
            if (job.machine1Time <= job.machine2Time) {
                U.push(job);
            } else {
                V.push(job);
            }
        }
        
        // Sort U by machine1Time ascending
        U.sort((a, b) => a.machine1Time - b.machine1Time);
        
        // Sort V by machine2Time descending
        V.sort((a, b) => b.machine2Time - a.machine2Time);
        
        const sequence = [...U, ...V];
        
        // Calculate schedule
        let m1End = 0;
        let m2End = 0;
        const schedule = [];
        
        for (const job of sequence) {
            const m1Start = m1End;
            m1End = m1Start + job.machine1Time;
            
            const m2Start = Math.max(m1End, m2End);
            m2End = m2Start + job.machine2Time;
            
            schedule.push({
                jobId: job.id,
                machine1: { start: m1Start, end: m1End },
                machine2: { start: m2Start, end: m2End }
            });
        }
        
        return {
            sequence: sequence.map(j => j.id),
            schedule,
            makespan: m2End
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Job Shop Scheduling (Dispatching-based simulation)
    // ─────────────────────────────────────────────────────────────────────────────
    
    scheduleJobShop: function(jobs, machines, rule = 'SPT') {
        // jobs: [{id, operations: [{machine, processingTime}]}]
        // machines: [{id}]
        
        const machineQueues = {};
        const machineAvailable = {};
        for (const m of machines) {
            machineQueues[m.id] = [];
            machineAvailable[m.id] = 0;
        }
        
        // Track job progress
        const jobProgress = {};
        for (const job of jobs) {
            jobProgress[job.id] = {
                nextOpIndex: 0,
                available: job.arrivalTime || 0
            };
        }
        
        const schedule = [];
        let completedOps = 0;
        const totalOps = jobs.reduce((sum, j) => sum + j.operations.length, 0);
        let currentTime = 0;
        const maxTime = 100000;
        
        while (completedOps < totalOps && currentTime < maxTime) {
            // Add ready operations to machine queues
            for (const job of jobs) {
                const progress = jobProgress[job.id];
                if (progress.nextOpIndex < job.operations.length) {
                    const op = job.operations[progress.nextOpIndex];
                    if (progress.available <= currentTime) {
                        // Operation is ready
                        const queueItem = {
                            jobId: job.id,
                            opIndex: progress.nextOpIndex,
                            processingTime: op.processingTime,
                            arrivalTime: progress.available,
                            dueDate: job.dueDate || Infinity,
                            remainingTime: job.operations
                                .slice(progress.nextOpIndex)
                                .reduce((sum, o) => sum + o.processingTime, 0)
                        };
                        
                        if (!machineQueues[op.machine].some(q => 
                            q.jobId === job.id && q.opIndex === progress.nextOpIndex)) {
                            machineQueues[op.machine].push(queueItem);
                        }
                    }
                }
            }
            
            // Process each machine
            for (const m of machines) {
                if (machineAvailable[m.id] <= currentTime && machineQueues[m.id].length > 0) {
                    // Apply dispatching rule
                    const queue = machineQueues[m.id];
                    this.dispatchingRules[rule](queue, currentTime);
                    
                    const selected = queue.shift();
                    const startTime = currentTime;
                    const endTime = startTime + selected.processingTime;
                    
                    schedule.push({
                        jobId: selected.jobId,
                        operationIndex: selected.opIndex,
                        machine: m.id,
                        startTime,
                        endTime
                    });
                    
                    machineAvailable[m.id] = endTime;
                    jobProgress[selected.jobId].nextOpIndex++;
                    jobProgress[selected.jobId].available = endTime;
                    completedOps++;
                }
            }
            
            // Advance time
            const nextEvents = [
                ...Object.values(machineAvailable).filter(t => t > currentTime),
                ...Object.values(jobProgress).map(p => p.available).filter(t => t > currentTime)
            ];
            
            if (nextEvents.length > 0) {
                currentTime = Math.min(...nextEvents);
            } else {
                currentTime++;
            }
        }
        
        const makespan = Math.max(...schedule.map(s => s.endTime));
        
        return {
            schedule,
            makespan,
            rule,
            completedOperations: completedOps,
            totalOperations: totalOps
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('schedule.singleMachine', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.scheduleSingleMachine');
            PRISM_GATEWAY.register('schedule.johnsons', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.johnsonsAlgorithm');
            PRISM_GATEWAY.register('schedule.jobShop', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.scheduleJobShop');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 2 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession2Part2() {
    PRISM_MANUFACTURING_SEARCH_ENGINE.register();
    PRISM_PROBABILISTIC_REASONING_ENGINE.register();
    PRISM_JOB_SHOP_SCHEDULING_ENGINE.register();
    
    console.log('[Session 2 Part 2] Registered 3 modules, 11 gateway routes');
    console.log('  - PRISM_MANUFACTURING_SEARCH_ENGINE: Hole sequencing, Operation sequencing, Tool changes');
    console.log('  - PRISM_PROBABILISTIC_REASONING_ENGINE: Particle filter, Baum-Welch, MCTS-UCT');
    console.log('  - PRISM_JOB_SHOP_SCHEDULING_ENGINE: Dispatching rules, Johnsons, Job shop');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_MANUFACTURING_SEARCH_ENGINE = PRISM_MANUFACTURING_SEARCH_ENGINE;
    window.PRISM_PROBABILISTIC_REASONING_ENGINE = PRISM_PROBABILISTIC_REASONING_ENGINE;
    window.PRISM_JOB_SHOP_SCHEDULING_ENGINE = PRISM_JOB_SHOP_SCHEDULING_ENGINE;
    registerSession2Part2();
}

console.log('[Session 2 Part 2] Manufacturing Applications loaded - 3 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 2: PROCESS PLANNING & SEARCH ENHANCEMENT - PART 3                          ║
 * ║ Graph Algorithms + Path Optimization + Decision Making                                    ║
 * ║ Source: MIT 6.046J, MIT 16.410, Stanford CS 161                                          ║
 * ║ Target: +700 lines | 3 Modules | 15+ Gateway Routes                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 7: PRISM_GRAPH_ALGORITHMS_ENGINE
// Essential Graph Algorithms for Manufacturing
// Source: MIT 6.046J - Design and Analysis of Algorithms
// ═══════════════════════════════════════════════════════════════════════════════════════════════

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
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 8: PRISM_DECISION_TREE_ENGINE
// Decision Trees for Manufacturing Decisions
// Source: Stanford CS 229, MIT 6.036
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_DECISION_TREE_ENGINE = {
    name: 'PRISM_DECISION_TREE_ENGINE',
    version: '1.0.0',
    description: 'Decision trees for classification and manufacturing decisions',
    source: 'Stanford CS 229, MIT 6.036',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Build Decision Tree (ID3/C4.5 style)
    // ─────────────────────────────────────────────────────────────────────────────
    
    buildTree: function(data, targetAttribute, attributes, maxDepth = 10, minSamples = 2) {
        return this._buildTreeRecursive(data, targetAttribute, attributes, maxDepth, minSamples, 0);
    },
    
    _buildTreeRecursive: function(data, target, attributes, maxDepth, minSamples, depth) {
        // Base cases
        if (data.length === 0) {
            return { type: 'leaf', label: null };
        }
        
        const labels = data.map(d => d[target]);
        const uniqueLabels = [...new Set(labels)];
        
        // Pure node
        if (uniqueLabels.length === 1) {
            return { type: 'leaf', label: uniqueLabels[0], count: data.length };
        }
        
        // Max depth or min samples
        if (depth >= maxDepth || data.length < minSamples || attributes.length === 0) {
            return { 
                type: 'leaf', 
                label: this._majorityClass(labels), 
                count: data.length,
                distribution: this._getDistribution(labels)
            };
        }
        
        // Find best attribute
        const bestAttr = this._findBestAttribute(data, target, attributes);
        
        if (bestAttr.gain <= 0) {
            return { 
                type: 'leaf', 
                label: this._majorityClass(labels), 
                count: data.length 
            };
        }
        
        // Create decision node
        const node = {
            type: 'decision',
            attribute: bestAttr.attribute,
            children: {},
            count: data.length
        };
        
        // Split data and recurse
        const values = [...new Set(data.map(d => d[bestAttr.attribute]))];
        const remainingAttrs = attributes.filter(a => a !== bestAttr.attribute);
        
        for (const value of values) {
            const subset = data.filter(d => d[bestAttr.attribute] === value);
            node.children[value] = this._buildTreeRecursive(
                subset, target, remainingAttrs, maxDepth, minSamples, depth + 1
            );
        }
        
        return node;
    },
    
    _findBestAttribute: function(data, target, attributes) {
        const baseEntropy = this._entropy(data.map(d => d[target]));
        let bestGain = -Infinity;
        let bestAttr = null;
        
        for (const attr of attributes) {
            const gain = baseEntropy - this._conditionalEntropy(data, target, attr);
            if (gain > bestGain) {
                bestGain = gain;
                bestAttr = attr;
            }
        }
        
        return { attribute: bestAttr, gain: bestGain };
    },
    
    _entropy: function(labels) {
        const counts = {};
        for (const label of labels) {
            counts[label] = (counts[label] || 0) + 1;
        }
        
        let entropy = 0;
        for (const count of Object.values(counts)) {
            const p = count / labels.length;
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        
        return entropy;
    },
    
    _conditionalEntropy: function(data, target, attribute) {
        const values = [...new Set(data.map(d => d[attribute]))];
        let condEntropy = 0;
        
        for (const value of values) {
            const subset = data.filter(d => d[attribute] === value);
            const weight = subset.length / data.length;
            condEntropy += weight * this._entropy(subset.map(d => d[target]));
        }
        
        return condEntropy;
    },
    
    _majorityClass: function(labels) {
        const counts = {};
        for (const label of labels) {
            counts[label] = (counts[label] || 0) + 1;
        }
        
        return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    },
    
    _getDistribution: function(labels) {
        const counts = {};
        for (const label of labels) {
            counts[label] = (counts[label] || 0) + 1;
        }
        return counts;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Predict using Decision Tree
    // ─────────────────────────────────────────────────────────────────────────────
    
    predict: function(tree, instance) {
        if (tree.type === 'leaf') {
            return tree.label;
        }
        
        const value = instance[tree.attribute];
        const child = tree.children[value];
        
        if (!child) {
            // Unknown value - return most common in children
            const childLabels = Object.values(tree.children)
                .filter(c => c.type === 'leaf')
                .map(c => c.label);
            
            if (childLabels.length > 0) {
                return this._majorityClass(childLabels);
            }
            return null;
        }
        
        return this.predict(child, instance);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tree Pruning (Reduced Error Pruning)
    // ─────────────────────────────────────────────────────────────────────────────
    
    prune: function(tree, validationData, target) {
        const pruned = JSON.parse(JSON.stringify(tree));
        
        const pruneRecursive = (node, data) => {
            if (node.type === 'leaf') return node;
            
            // Prune children first
            for (const value in node.children) {
                const subset = data.filter(d => d[node.attribute] === value);
                node.children[value] = pruneRecursive(node.children[value], subset);
            }
            
            // Calculate error with and without this subtree
            const currentError = data.filter(d => this.predict(node, d) !== d[target]).length;
            const majorityLabel = this._majorityClass(data.map(d => d[target]));
            const prunedError = data.filter(d => d[target] !== majorityLabel).length;
            
            // Prune if it doesn't increase error
            if (prunedError <= currentError) {
                return {
                    type: 'leaf',
                    label: majorityLabel,
                    count: data.length,
                    pruned: true
                };
            }
            
            return node;
        }