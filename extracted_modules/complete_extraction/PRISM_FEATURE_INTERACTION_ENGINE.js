const PRISM_FEATURE_INTERACTION_ENGINE = {
    name: 'PRISM_FEATURE_INTERACTION_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.410, MIT 2.008',
    description: 'Feature interaction analysis for manufacturing planning',
    
    // Precedence constraint definitions
    PRECEDENCE_RULES: {
        'THREAD': ['HOLE', 'BORE'],
        'COUNTERBORE': ['HOLE'],
        'COUNTERSINK': ['HOLE'],
        'TAP': ['HOLE', 'BORE'],
        'REAM': ['HOLE', 'BORE'],
        'FINISH_SURFACE': ['ROUGH_SURFACE'],
        'INTERNAL_GROOVE': ['BORE'],
        'KEYWAY': ['BORE'],
        'FINISH_BORE': ['ROUGH_BORE'],
        'POLISH': ['FINISH_SURFACE']
    },
    
    // Feature interaction types
    INTERACTION_TYPES: {
        PRECEDENCE: 'precedence',      // A must be machined before B
        INTERFERENCE: 'interference',   // A and B cannot be machined simultaneously
        SHARED_SETUP: 'shared_setup',   // A and B should use same setup
        ACCESS_BLOCK: 'access_block',   // A blocks tool access to B
        TOLERANCE: 'tolerance'          // A and B have tight tolerance relationship
    },
    
    /**
     * Build feature precedence graph
     * @param {Array} features - Array of features with types and relationships
     * @returns {Object} Precedence graph with nodes and edges
     */
    buildPrecedenceGraph: function(features) {
        const graph = {
            nodes: new Map(),
            edges: [],
            adjacencyList: new Map()
        };
        
        // Add all features as nodes
        for (const feature of features) {
            graph.nodes.set(feature.id, {
                feature: feature,
                predecessors: [],
                successors: []
            });
            graph.adjacencyList.set(feature.id, []);
        }
        
        // Build edges based on precedence rules
        for (const feature of features) {
            const requiredPrior = this.PRECEDENCE_RULES[feature.type] || [];
            
            for (const priorType of requiredPrior) {
                // Find features of required prior type that are parents
                const priorFeatures = features.filter(f => 
                    f.type === priorType && 
                    (f.id === feature.parentFeatureId || this._featuresOverlap(f, feature))
                );
                
                for (const prior of priorFeatures) {
                    const edge = {
                        from: prior.id,
                        to: feature.id,
                        type: this.INTERACTION_TYPES.PRECEDENCE,
                        constraint: `${priorType} before ${feature.type}`
                    };
                    graph.edges.push(edge);
                    graph.nodes.get(prior.id).successors.push(feature.id);
                    graph.nodes.get(feature.id).predecessors.push(prior.id);
                    graph.adjacencyList.get(prior.id).push(feature.id);
                }
            }
        }
        
        // Detect geometric precedences (larger features before smaller nested)
        for (const f1 of features) {
            for (const f2 of features) {
                if (f1.id !== f2.id && this._isNested(f2, f1)) {
                    // f1 contains f2 - might need to machine f1 first
                    if (!graph.adjacencyList.get(f1.id).includes(f2.id)) {
                        const edge = {
                            from: f1.id,
                            to: f2.id,
                            type: this.INTERACTION_TYPES.PRECEDENCE,
                            constraint: 'Container feature before nested'
                        };
                        graph.edges.push(edge);
                        graph.adjacencyList.get(f1.id).push(f2.id);
                    }
                }
            }
        }
        
        return graph;
    },
    
    /**
     * Analyze accessibility for features from given direction
     * @param {Array} features - Features
     * @param {Object} workpiece - Workpiece geometry
     * @param {Object} fixture - Fixture configuration
     * @returns {Object} Accessibility analysis
     */
    analyzeAccessibility: function(features, workpiece, fixture = null) {
        const analysis = {
            accessible: [],
            blocked: [],
            partiallyAccessible: [],
            setupRequirements: new Map()
        };
        
        // Standard approach directions (6-sided)
        const directions = [
            { name: '+Z', vector: { x: 0, y: 0, z: 1 } },
            { name: '-Z', vector: { x: 0, y: 0, z: -1 } },
            { name: '+X', vector: { x: 1, y: 0, z: 0 } },
            { name: '-X', vector: { x: -1, y: 0, z: 0 } },
            { name: '+Y', vector: { x: 0, y: 1, z: 0 } },
            { name: '-Y', vector: { x: 0, y: -1, z: 0 } }
        ];
        
        for (const feature of features) {
            const accessibleDirs = [];
            const blockedDirs = [];
            
            for (const dir of directions) {
                const accessible = this._checkToolAccess(feature, dir, workpiece, fixture);
                if (accessible.isAccessible) {
                    accessibleDirs.push({ direction: dir, clearance: accessible.clearance });
                } else {
                    blockedDirs.push({ direction: dir, blocker: accessible.blocker });
                }
            }
            
            const featureAnalysis = {
                feature: feature,
                accessibleDirections: accessibleDirs,
                blockedDirections: blockedDirs
            };
            
            if (accessibleDirs.length === 0) {
                analysis.blocked.push(featureAnalysis);
            } else if (blockedDirs.length === 0) {
                analysis.accessible.push(featureAnalysis);
            } else {
                analysis.partiallyAccessible.push(featureAnalysis);
            }
            
            // Determine setup requirements
            const requiredSetups = this._determineSetups(accessibleDirs);
            analysis.setupRequirements.set(feature.id, requiredSetups);
        }
        
        return analysis;
    },
    
    /**
     * Minimize setups using graph coloring approach
     * @param {Array} features - Features with access requirements
     * @param {Object} accessAnalysis - Accessibility analysis
     * @returns {Object} Setup minimization plan
     */
    minimizeSetups: function(features, accessAnalysis) {
        // Group features by compatible access direction
        const directionGroups = new Map();
        
        for (const feature of features) {
            const setupReqs = accessAnalysis.setupRequirements.get(feature.id);
            if (!setupReqs || setupReqs.length === 0) continue;
            
            const primaryDir = setupReqs[0].name;
            if (!directionGroups.has(primaryDir)) {
                directionGroups.set(primaryDir, []);
            }
            directionGroups.get(primaryDir).push(feature);
        }
        
        // Merge compatible groups
        const setups = [];
        const processed = new Set();
        
        for (const [dir, featureList] of directionGroups) {
            if (processed.has(dir)) continue;
            
            const setup = {
                id: `SETUP_${setups.length + 1}`,
                primaryDirection: dir,
                features: [...featureList],
                estimatedTime: this._estimateSetupTime(featureList)
            };
            
            // Check if opposite direction can be combined (4-axis)
            const oppositeDir = this._getOppositeDirection(dir);
            if (directionGroups.has(oppositeDir) && !processed.has(oppositeDir)) {
                const oppositeFeatures = directionGroups.get(oppositeDir);
                setup.features.push(...oppositeFeatures);
                setup.requiresIndexing = true;
                processed.add(oppositeDir);
            }
            
            setups.push(setup);
            processed.add(dir);
        }
        
        // Handle blocked features
        const blocked = accessAnalysis.blocked;
        if (blocked.length > 0) {
            setups.push({
                id: 'SETUP_SPECIAL',
                features: blocked.map(b => b.feature),
                requiresSpecialFixturing: true,
                notes: 'Features require special fixturing or 5-axis machining'
            });
        }
        
        return {
            setups: setups,
            totalSetups: setups.length,
            featureCount: features.length,
            efficiency: features.length / setups.length
        };
    },
    
    /**
     * Detect feature interactions and conflicts
     * @param {Array} features - Features
     * @returns {Array} Detected interactions
     */
    detectInteractions: function(features) {
        const interactions = [];
        
        for (let i = 0; i < features.length; i++) {
            for (let j = i + 1; j < features.length; j++) {
                const f1 = features[i];
                const f2 = features[j];
                
                // Check for geometric interference
                if (this._featuresInterfere(f1, f2)) {
                    interactions.push({
                        type: this.INTERACTION_TYPES.INTERFERENCE,
                        features: [f1.id, f2.id],
                        description: `${f1.type} and ${f2.type} have geometric interference`
                    });
                }
                
                // Check for tolerance relationships
                if (this._haveToleranceRelation(f1, f2)) {
                    interactions.push({
                        type: this.INTERACTION_TYPES.TOLERANCE,
                        features: [f1.id, f2.id],
                        description: 'Features share tight tolerance',
                        recommendation: 'Machine in same setup if possible'
                    });
                }
                
                // Check for access blocking
                if (this._blocksAccess(f1, f2)) {
                    interactions.push({
                        type: this.INTERACTION_TYPES.ACCESS_BLOCK,
                        features: [f1.id, f2.id],
                        blocker: f1.id,
                        blocked: f2.id,
                        description: `${f1.type} may block access to ${f2.type}`
                    });
                }
            }
        }
        
        return interactions;
    },
    
    /**
     * Generate optimal operation sequence
     * @param {Object} precedenceGraph - Precedence graph
     * @param {Object} interactions - Feature interactions
     * @returns {Array} Ordered operation sequence
     */
    generateOperationSequence: function(precedenceGraph, interactions) {
        // Topological sort with priority
        const inDegree = new Map();
        const sequence = [];
        const queue = [];
        
        // Initialize in-degrees
        for (const [id, node] of precedenceGraph.nodes) {
            inDegree.set(id, node.predecessors.length);
            if (node.predecessors.length === 0) {
                queue.push(id);
            }
        }
        
        // Sort queue by priority (larger features first, then by type priority)
        const prioritize = (ids) => {
            return ids.sort((a, b) => {
                const fA = precedenceGraph.nodes.get(a).feature;
                const fB = precedenceGraph.nodes.get(b).feature;
                
                // Priority: roughing before finishing, larger before smaller
                const typeOrder = { 'ROUGH': 0, 'SEMI_FINISH': 1, 'FINISH': 2 };
                const tA = typeOrder[fA.stage] || 1;
                const tB = typeOrder[fB.stage] || 1;
                
                if (tA !== tB) return tA - tB;
                return (fB.volume || 0) - (fA.volume || 0);
            });
        };
        
        // Kahn's algorithm with prioritization
        while (queue.length > 0) {
            prioritize(queue);
            const current = queue.shift();
            sequence.push(current);
            
            for (const successor of precedenceGraph.adjacencyList.get(current)) {
                inDegree.set(successor, inDegree.get(successor) - 1);
                if (inDegree.get(successor) === 0) {
                    queue.push(successor);
                }
            }
        }
        
        // Check for cycles
        if (sequence.length !== precedenceGraph.nodes.size) {
            return {
                success: false,
                error: 'Cycle detected in precedence graph',
                partialSequence: sequence
            };
        }
        
        return {
            success: true,
            sequence: sequence,
            operations: sequence.map(id => precedenceGraph.nodes.get(id).feature)
        };
    },
    
    // Private helper methods
    _featuresOverlap: function(f1, f2) {
        // Simplified bounding box overlap check
        if (!f1.bounds || !f2.bounds) return false;
        
        return !(f1.bounds.max.x < f2.bounds.min.x || f1.bounds.min.x > f2.bounds.max.x ||
                 f1.bounds.max.y < f2.bounds.min.y || f1.bounds.min.y > f2.bounds.max.y ||
                 f1.bounds.max.z < f2.bounds.min.z || f1.bounds.min.z > f2.bounds.max.z);
    },
    
    _isNested: function(inner, outer) {
        if (!inner.bounds || !outer.bounds) return false;
        
        return inner.bounds.min.x >= outer.bounds.min.x && inner.bounds.max.x <= outer.bounds.max.x &&
               inner.bounds.min.y >= outer.bounds.min.y && inner.bounds.max.y <= outer.bounds.max.y &&
               inner.bounds.min.z >= outer.bounds.min.z && inner.bounds.max.z <= outer.bounds.max.z;
    },
    
    _checkToolAccess: function(feature, direction, workpiece, fixture) {
        // Simplified ray-based access check
        const featureCenter = feature.center || this._getFeatureCenter(feature);
        
        // Create approach ray
        const rayOrigin = {
            x: featureCenter.x + direction.vector.x * 1000,
            y: featureCenter.y + direction.vector.y * 1000,
            z: featureCenter.z + direction.vector.z * 1000
        };
        
        // Check for obstructions (simplified)
        const clearance = this._calculateClearance(rayOrigin, featureCenter, workpiece);
        
        return {
            isAccessible: clearance > 0,
            clearance: clearance,
            blocker: clearance <= 0 ? 'workpiece' : null
        };
    },
    
    _calculateClearance: function(from, to, workpiece) {
        // Simplified - would use BVH in real implementation
        return 100; // Assume accessible for now
    },
    
    _getFeatureCenter: function(feature) {
        if (feature.bounds) {
            return {
                x: (feature.bounds.min.x + feature.bounds.max.x) / 2,
                y: (feature.bounds.min.y + feature.bounds.max.y) / 2,
                z: (feature.bounds.min.z + feature.bounds.max.z) / 2
            };
        }
        return feature.center || { x: 0, y: 0, z: 0 };
    },
    
    _determineSetups: function(accessibleDirs) {
        return accessibleDirs.map(ad => ad.direction);
    },
    
    _estimateSetupTime: function(features) {
        return features.length * 5; // 5 minutes per feature estimate
    },
    
    _getOppositeDirection: function(dir) {
        const opposites = {
            '+X': '-X', '-X': '+X',
            '+Y': '-Y', '-Y': '+Y',
            '+Z': '-Z', '-Z': '+Z'
        };
        return opposites[dir];
    },
    
    _featuresInterfere: function(f1, f2) {
        return this._featuresOverlap(f1, f2);
    },
    
    _haveToleranceRelation: function(f1, f2) {
        // Check if features have tight tolerance relationship
        return f1.tolerances && f2.tolerances && 
               (f1.tolerances.some(t => t.relatedFeature === f2.id) ||
                f2.tolerances.some(t => t.relatedFeature === f1.id));
    },
    
    _blocksAccess: function(f1, f2) {
        // Simplified - check if f1 is between tool access and f2
        return this._featuresOverlap(f1, f2) && f1.volume > f2.volume;
    }
}