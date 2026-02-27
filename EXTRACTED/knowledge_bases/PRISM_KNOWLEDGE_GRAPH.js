// PRISM_KNOWLEDGE_GRAPH - Lines 782931-783198 (268 lines) - Knowledge graph structure\n\nconst PRISM_KNOWLEDGE_GRAPH = {
    nodes: new Map(),
    edges: [],
    nodeTypes: new Set(['material', 'tool', 'operation', 'machine', 'parameter', 'defect', 'solution']),
    relationTypes: new Set(['suited_for', 'causes', 'prevents', 'requires', 'produces', 'improves', 'degrades']),
    
    // Add a node
    addNode(id, type, properties = {}) {
        if (!this.nodeTypes.has(type)) {
            console.warn(`[KG] Unknown node type: ${type}`);
        }
        
        this.nodes.set(id, {
            id,
            type,
            properties,
            created: Date.now()
        });
        
        return id;
    },
    
    // Add an edge (relation)
    addEdge(sourceId, targetId, relation, properties = {}) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            console.warn(`[KG] Node not found for edge: ${sourceId} -> ${targetId}`);
            return null;
        }
        
        const edge = {
            id: `${sourceId}-${relation}-${targetId}`,
            source: sourceId,
            target: targetId,
            relation,
            properties,
            weight: properties.weight || 1.0,
            created: Date.now()
        };
        
        this.edges.push(edge);
        return edge;
    },
    
    // Get node by ID
    getNode(id) {
        return this.nodes.get(id);
    },
    
    // Get all nodes of a type
    getNodesByType(type) {
        return Array.from(this.nodes.values()).filter(n => n.type === type);
    },
    
    // Get edges from a node
    getOutgoingEdges(nodeId) {
        return this.edges.filter(e => e.source === nodeId);
    },
    
    // Get edges to a node
    getIncomingEdges(nodeId) {
        return this.edges.filter(e => e.target === nodeId);
    },
    
    // Get neighbors
    getNeighbors(nodeId, relation = null) {
        const outgoing = this.getOutgoingEdges(nodeId)
            .filter(e => !relation || e.relation === relation)
            .map(e => ({ node: this.nodes.get(e.target), edge: e, direction: 'out' }));
        
        const incoming = this.getIncomingEdges(nodeId)
            .filter(e => !relation || e.relation === relation)
            .map(e => ({ node: this.nodes.get(e.source), edge: e, direction: 'in' }));
        
        return [...outgoing, ...incoming];
    },
    
    // Find path between nodes
    findPath(startId, endId, maxDepth = 5) {
        const visited = new Set();
        const queue = [[startId]];
        
        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];
            
            if (current === endId) {
                return path.map(id => this.nodes.get(id));
            }
            
            if (path.length > maxDepth) continue;
            if (visited.has(current)) continue;
            visited.add(current);
            
            const neighbors = this.getNeighbors(current);
            for (const { node } of neighbors) {
                if (!visited.has(node.id)) {
                    queue.push([...path, node.id]);
                }
            }
        }
        
        return null;
    },
    
    // Query: Find materials suited for operation
    queryMaterialsForOperation(operation) {
        const results = [];
        
        this.edges
            .filter(e => e.relation === 'suited_for' && e.target === operation)
            .forEach(edge => {
                const material = this.nodes.get(edge.source);
                if (material && material.type === 'material') {
                    results.push({
                        material,
                        suitability: edge.weight,
                        notes: edge.properties.notes
                    });
                }
            });
        
        return results.sort((a, b) => b.suitability - a.suitability);
    },
    
    // Query: Find solutions for defect
    querySolutionsForDefect(defect) {
        const solutions = [];
        
        // Direct solutions
        this.edges
            .filter(e => e.relation === 'prevents' && e.target === defect)
            .forEach(edge => {
                const solution = this.nodes.get(edge.source);
                if (solution) {
                    solutions.push({
                        solution,
                        effectiveness: edge.weight,
                        type: 'direct'
                    });
                }
            });
        
        // Find causes and their solutions
        this.edges
            .filter(e => e.relation === 'causes' && e.target === defect)
            .forEach(causeEdge => {
                const cause = this.nodes.get(causeEdge.source);
                
                this.edges
                    .filter(e => e.relation === 'prevents' && e.target === cause?.id)
                    .forEach(solutionEdge => {
                        const solution = this.nodes.get(solutionEdge.source);
                        if (solution) {
                            solutions.push({
                                solution,
                                effectiveness: solutionEdge.weight * causeEdge.weight,
                                type: 'indirect',
                                via: cause
                            });
                        }
                    });
            });
        
        return solutions.sort((a, b) => b.effectiveness - a.effectiveness);
    },
    
    // Query: Get parameter recommendations
    queryParameterRecommendations(context) {
        const { material, tool, operation } = context;
        const recommendations = [];
        
        // Find parameters that work well with given context
        const relevantEdges = this.edges.filter(e => {
            if (e.relation !== 'suited_for' && e.relation !== 'improves') return false;
            const source = this.nodes.get(e.source);
            return source?.type === 'parameter';
        });
        
        relevantEdges.forEach(edge => {
            const param = this.nodes.get(edge.source);
            const target = this.nodes.get(edge.target);
            
            let relevance = edge.weight;
            
            // Boost relevance if target matches context
            if (target?.id === material || target?.id === tool || target?.id === operation) {
                relevance *= 1.5;
            }
            
            recommendations.push({
                parameter: param,
                relevance,
                reason: `${edge.relation} ${target?.id}`
            });
        });
        
        return recommendations.sort((a, b) => b.relevance - a.relevance);
    },
    
    // Initialize with manufacturing knowledge
    initManufacturingKnowledge() {
        // Materials
        this.addNode('aluminum_6061', 'material', { hardness: 95, machinability: 0.9 });
        this.addNode('steel_4140', 'material', { hardness: 28, machinability: 0.65 });
        this.addNode('stainless_304', 'material', { hardness: 70, machinability: 0.45 });
        this.addNode('titanium_6al4v', 'material', { hardness: 36, machinability: 0.3 });
        
        // Tools
        this.addNode('carbide_endmill', 'tool', { material: 'carbide', type: 'endmill' });
        this.addNode('hss_drill', 'tool', { material: 'HSS', type: 'drill' });
        this.addNode('ceramic_insert', 'tool', { material: 'ceramic', type: 'insert' });
        
        // Operations
        this.addNode('roughing', 'operation', { type: 'material_removal' });
        this.addNode('finishing', 'operation', { type: 'surface_generation' });
        this.addNode('drilling', 'operation', { type: 'hole_making' });
        
        // Defects
        this.addNode('chatter', 'defect', { symptom: 'vibration marks' });
        this.addNode('poor_finish', 'defect', { symptom: 'rough surface' });
        this.addNode('tool_breakage', 'defect', { symptom: 'broken tool' });
        this.addNode('excessive_wear', 'defect', { symptom: 'rapid tool degradation' });
        
        // Parameters
        this.addNode('high_speed', 'parameter', { affects: 'spindle_rpm', direction: 'increase' });
        this.addNode('low_feed', 'parameter', { affects: 'feed_rate', direction: 'decrease' });
        this.addNode('reduced_doc', 'parameter', { affects: 'depth_of_cut', direction: 'decrease' });
        this.addNode('coolant_flood', 'parameter', { affects: 'coolant', type: 'flood' });
        
        // Solutions
        this.addNode('reduce_speed', 'solution', { action: 'decrease RPM by 10-15%' });
        this.addNode('increase_rigidity', 'solution', { action: 'improve workholding' });
        this.addNode('use_coolant', 'solution', { action: 'apply flood coolant' });
        this.addNode('sharper_tool', 'solution', { action: 'use new or reground tool' });
        
        // Edges - Material suited for operations
        this.addEdge('aluminum_6061', 'roughing', 'suited_for', { weight: 0.95 });
        this.addEdge('aluminum_6061', 'finishing', 'suited_for', { weight: 0.90 });
        this.addEdge('steel_4140', 'roughing', 'suited_for', { weight: 0.85 });
        this.addEdge('titanium_6al4v', 'finishing', 'suited_for', { weight: 0.60 });
        
        // Edges - Causes
        this.addEdge('high_speed', 'chatter', 'causes', { weight: 0.7 });
        this.addEdge('high_speed', 'excessive_wear', 'causes', { weight: 0.8 });
        this.addEdge('low_feed', 'poor_finish', 'prevents', { weight: 0.6 });
        
        // Edges - Solutions
        this.addEdge('reduce_speed', 'chatter', 'prevents', { weight: 0.75 });
        this.addEdge('increase_rigidity', 'chatter', 'prevents', { weight: 0.85 });
        this.addEdge('use_coolant', 'excessive_wear', 'prevents', { weight: 0.7 });
        this.addEdge('sharper_tool', 'poor_finish', 'prevents', { weight: 0.8 });
        
        console.log(`[KG] Initialized with ${this.nodes.size} nodes and ${this.edges.length} edges`);
    },
    
    // Export/Import
    export() {
        return {
            nodes: Array.from(this.nodes.entries()),
            edges: this.edges
        };
    },
    
    import(data) {
        this.nodes = new Map(data.nodes);
        this.edges = data.edges;
    }
};
