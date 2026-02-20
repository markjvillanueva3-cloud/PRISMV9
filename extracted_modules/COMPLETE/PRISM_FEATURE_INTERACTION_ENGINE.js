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
        return { x: 0, y: 0, z: 0 };
    },
    
    _determineSetups: function(accessibleDirs) {
        if (accessibleDirs.length === 0) return [];
        
        // Sort by clearance and return best options
        return accessibleDirs
            .sort((a, b) => b.clearance - a.clearance)
            .slice(0, 2)
            .map(d => d.direction);
    },
    
    _getOppositeDirection: function(dirName) {
        const opposites = {
            '+Z': '-Z', '-Z': '+Z',
            '+X': '-X', '-X': '+X',
            '+Y': '-Y', '-Y': '+Y'
        };
        return opposites[dirName];
    },
    
    _estimateSetupTime: function(features) {
        // Basic estimation: 5 min base + 2 min per feature
        return 5 + features.length * 2;
    },
    
    _featuresInterfere: function(f1, f2) {
        // Check if machining one would damage the other
        return this._featuresOverlap(f1, f2) && f1.type !== f2.type;
    },
    
    _haveToleranceRelation: function(f1, f2) {
        // Check for tight tolerance relationships
        if (!f1.tolerances || !f2.tolerances) return false;
        
        // Look for position or orientation tolerances referencing each other
        return f1.tolerances.some(t => t.datum === f2.id) ||
               f2.tolerances.some(t => t.datum === f1.id);
    },
    
    _blocksAccess: function(f1, f2) {
        // Check if f1 is between tool approach and f2
        return false; // Simplified
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// 4. PRISM_BOSS_DETECTION_ENGINE - Enhanced Boss Feature Recognition
// Source: MIT 2.008, Stanford ME 318
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_BOSS_DETECTION_ENGINE = {
    name: 'PRISM_BOSS_DETECTION_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.008, Stanford ME 318',
    description: 'Specialized boss feature detection for manufacturing',
    
    // Boss type classifications
    BOSS_TYPES: {
        CYLINDRICAL: 'cylindrical_boss',
        RECTANGULAR: 'rectangular_boss',
        STEPPED: 'stepped_boss',
        TAPERED: 'tapered_boss',
        COUNTERBORE_BOSS: 'counterbore_boss',
        THREADED_BOSS: 'threaded_boss'
    },
    
    /**
     * Detect boss features from mesh or B-Rep
     * @param {Object} geometry - Mesh or B-Rep geometry
     * @param {Object} options - Detection options
     * @returns {Array} Detected boss features
     */
    detectBosses: function(geometry, options = {}) {
        const bosses = [];
        const config = {
            minHeight: options.minHeight || 1.0,      // mm
            minDiameter: options.minDiameter || 2.0,  // mm
            heightRatio: options.heightRatio || 0.1,  // height/diameter threshold
            ...options
        };
        
        // Get faces/surfaces
        const faces = geometry.faces || this._extractFaces(geometry);
        
        // Find cylindrical faces (potential boss sides)
        const cylindricalFaces = faces.filter(f => 
            f.type === 'cylindrical' || this._isCylindrical(f)
        );
        
        // Find planar faces (potential boss tops)
        const planarFaces = faces.filter(f => 
            f.type === 'planar' || this._isPlanar(f)
        );
        
        // Group cylindrical faces that form bosses
        const cylinderGroups = this._groupCylinders(cylindricalFaces);
        
        for (const group of cylinderGroups) {
            const boss = this._analyzePotentialBoss(group, planarFaces, config);
            if (boss) {
                bosses.push(boss);
            }
        }
        
        // Detect rectangular bosses
        const rectBosses = this._detectRectangularBosses(planarFaces, config);
        bosses.push(...rectBosses);
        
        return bosses;
    },
    
    /**
     * Analyze cylindrical features to determine if boss
     * @param {Object} cylinderGroup - Group of related cylindrical faces
     * @param {Array} planarFaces - Planar faces
     * @param {Object} config - Configuration
     */
    _analyzePotentialBoss: function(cylinderGroup, planarFaces, config) {
        const { axis, radius, height, center } = cylinderGroup;
        
        // Boss criteria:
        // 1. Must protrude from base surface (not a hole)
        // 2. Must have a top face
        // 3. Height/diameter ratio within bounds
        
        if (height < config.minHeight || radius * 2 < config.minDiameter) {
            return null;
        }
        
        // Check for top face
        const topFace = this._findTopFace(center, axis, height, planarFaces);
        if (!topFace) {
            return null;
        }
        
        // Check for base face (opposite direction)
        const baseFace = this._findBaseFace(center, axis, planarFaces);
        
        // Determine boss type
        let bossType = this.BOSS_TYPES.CYLINDRICAL;
        
        // Check for stepped boss
        const steps = this._detectSteps(cylinderGroup, planarFaces);
        if (steps.length > 1) {
            bossType = this.BOSS_TYPES.STEPPED;
        }
        
        // Check for tapered boss
        if (cylinderGroup.isTapered) {
            bossType = this.BOSS_TYPES.TAPERED;
        }
        
        // Check for threaded boss
        const hasThread = this._detectThread(cylinderGroup);
        if (hasThread) {
            bossType = this.BOSS_TYPES.THREADED_BOSS;
        }
        
        return {
            id: `BOSS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: bossType,
            geometry: {
                axis: axis,
                center: center,
                radius: radius,
                height: height,
                topFace: topFace,
                baseFace: baseFace
            },
            steps: steps,
            hasThread: hasThread,
            manufacturingInfo: this._getBossManufacturingInfo(bossType, radius, height),
            bounds: this._calculateBossBounds(center, axis, radius, height)
        };
    },
    
    /**
     * Detect rectangular/prismatic bosses
     */
    _detectRectangularBosses: function(planarFaces, config) {
        const bosses = [];
        
        // Find horizontal top faces above the base level
        const topCandidates = planarFaces.filter(f => 
            f.normal && Math.abs(f.normal.z - 1) < 0.01 &&
            f.centroid && f.centroid.z > config.minHeight
        );
        
        for (const top of topCandidates) {
            // Check for side faces
            const sideFaces = this._findSideFaces(top, planarFaces);
            
            if (sideFaces.length >= 3) {
                const bounds = this._calculateRectBounds(top, sideFaces);
                const height = bounds.max.z - bounds.min.z;
                
                if (height >= config.minHeight) {
                    bosses.push({
                        id: `BOSS_RECT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: this.BOSS_TYPES.RECTANGULAR,
                        geometry: {
                            topFace: top,
                            sideFaces: sideFaces,
                            width: bounds.max.x - bounds.min.x,
                            length: bounds.max.y - bounds.min.y,
                            height: height
                        },
                        bounds: bounds,
                        manufacturingInfo: this._getRectBossManufacturingInfo(bounds)
                    });
                }
            }
        }
        
        return bosses;
    },
    
    /**
     * Get manufacturing recommendations for boss
     */
    _getBossManufacturingInfo: function(bossType, radius, height) {
        const info = {
            recommendedOperations: [],
            toolSuggestions: [],
            estimatedTime: 0
        };
        
        if (bossType === this.BOSS_TYPES.CYLINDRICAL || bossType === this.BOSS_TYPES.STEPPED) {
            info.recommendedOperations.push('ROUGH_TURN');
            info.recommendedOperations.push('FINISH_TURN');
            info.toolSuggestions.push({
                type: 'TURNING_INSERT',
                holder: radius > 10 ? 'EXTERNAL' : 'BORING_BAR'
            });
            info.estimatedTime = (height / 10) * 2; // Rough estimate
        }
        
        if (bossType === this.BOSS_TYPES.THREADED_BOSS) {
            info.recommendedOperations.push('THREAD_TURN');
            info.toolSuggestions.push({
                type: 'THREAD_INSERT',
                pitch: this._suggestThreadPitch(radius * 2)
            });
        }
        
        return info;
    },
    
    _getRectBossManufacturingInfo: function(bounds) {
        const width = bounds.max.x - bounds.min.x;
        const length = bounds.max.y - bounds.min.y;
        const height = bounds.max.z - bounds.min.z;
        const maxDim = Math.max(width, length);
        
        return {
            recommendedOperations: ['ROUGH_MILL', 'FINISH_MILL'],
            toolSuggestions: [{
                type: 'END_MILL',
                diameter: Math.min(maxDim * 0.6, 20), // Max 60% of smallest dimension
                flutes: 4
            }],
            estimatedTime: (width * length * height) / 10000 // Rough MRR estimate
        };
    },
    
    // Helper methods
    _extractFaces: function(geometry) {
        // Would parse mesh to extract faces
        return [];
    },
    
    _isCylindrical: function(face) {
        // Check if face is cylindrical based on vertex normals
        if (!face.vertices || !face.normals) return false;
        
        // Cylindrical faces have normals pointing radially outward
        // All normals should be perpendicular to the axis
        return false; // Simplified
    },
    
    _isPlanar: function(face) {
        if (!face.normals) return false;
        
        // Check if all normals are parallel
        const n0 = face.normals[0];
        return face.normals.every(n => 
            Math.abs(n.x - n0.x) < 0.01 &&
            Math.abs(n.y - n0.y) < 0.01 &&
            Math.abs(n.z - n0.z) < 0.01
        );
    },
    
    _groupCylinders: function(cylindricalFaces) {
        // Group cylindrical faces that share an axis
        return []; // Simplified
    },
    
    _findTopFace: function(center, axis, height, planarFaces) {
        // Find planar face at the top of the boss
        return planarFaces.find(f => {
            if (!f.centroid) return false;
            const topCenter = {
                x: center.x + axis.x * height,
                y: center.y + axis.y * height,
                z: center.z + axis.z * height
            };
            const dist = Math.sqrt(
                Math.pow(f.centroid.x - topCenter.x, 2) +
                Math.pow(f.centroid.y - topCenter.y, 2) +
                Math.pow(f.centroid.z - topCenter.z, 2)
            );
            return dist < 1.0; // Within 1mm tolerance
        });
    },
    
    _findBaseFace: function(center, axis, planarFaces) {
        return planarFaces.find(f => {
            if (!f.centroid || !f.normal) return false;
            // Base face normal should be opposite to axis
            const dot = f.normal.x * axis.x + f.normal.y * axis.y + f.normal.z * axis.z;
            return Math.abs(dot + 1) < 0.1; // Normal opposite to axis
        });
    },
    
    _findSideFaces: function(topFace, planarFaces) {
        // Find vertical faces adjacent to top face
        return planarFaces.filter(f => {
            if (!f.normal) return false;
            // Vertical face: normal perpendicular to Z
            return Math.abs(f.normal.z) < 0.1;
        });
    },
    
    _detectSteps: function(cylinderGroup, planarFaces) {
        // Detect step transitions in boss
        return [{ radius: cylinderGroup.radius, height: cylinderGroup.height }];
    },
    
    _detectThread: function(cylinderGroup) {
        // Would analyze surface for thread helix pattern
        return false;
    },
    
    _suggestThreadPitch: function(diameter) {
        // Standard metric thread pitches
        const pitches = {
            3: 0.5, 4: 0.7, 5: 0.8, 6: 1.0, 8: 1.25,
            10: 1.5, 12: 1.75, 14: 2.0, 16: 2.0, 20: 2.5
        };
        const nearestDia = Object.keys(pitches)
            .map(Number)
            .reduce((a, b) => Math.abs(b - diameter) < Math.abs(a - diameter) ? b : a);
        return pitches[nearestDia] || 1.5;
    },
    
    _calculateBossBounds: function(center, axis, radius, height) {
        return {
            min: {
                x: center.x - radius,
                y: center.y - radius,
                z: center.z
            },
            max: {
                x: center.x + radius,
                y: center.y + radius,
                z: center.z + height
            }
        };
    },
    
    _calculateRectBounds: function(topFace, sideFaces) {
        // Calculate bounding box from faces
        const allVertices = [
            ...(topFace.vertices || []),
            ...sideFaces.flatMap(f => f.vertices || [])
        ];
        
        if (allVertices.length === 0) {
            return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
        }
        
        return {
            min: {
                x: Math.min(...allVertices.map(v => v.x)),
                y: Math.min(...allVertices.map(v => v.y)),
                z: Math.min(...allVertices.map(v => v.z))
            },
            max: {
                x: Math.max(...allVertices.map(v => v.x)),
                y: Math.max(...allVertices.map(v => v.y)),
                z: Math.max(...allVertices.map(v => v.z))
            }
        };
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// 5. PRISM_NURBS_ADVANCED - Degree Elevation & Surface Fitting
// Source: MIT 2.158J, Stanford CS 348A
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_NURBS_ADVANCED = {
    name: 'PRISM_NURBS_ADVANCED',
    version: '1.0.0',
    source: 'MIT 2.158J, Stanford CS 348A',
    description: 'Advanced NURBS operations: degree elevation and surface fitting',
    
    /**
     * Degree elevation for B-spline curve
     * Increases degree while maintaining curve shape
     * @param {Array} controlPoints - Original control points
     * @param {Array} knots - Original knot vector
     * @param {number} degree - Original degree
     * @param {number} t - Number of times to elevate (default 1)
     * @returns {Object} {controlPoints, knots, degree}
     */
    elevateDegree: function(controlPoints, knots, degree, t = 1) {
        if (t <= 0) {
            return { controlPoints, knots, degree };
        }
        
        const n = controlPoints.length - 1;
        const p = degree;
        const newDegree = p + t;
        
        // Compute Bezier segments via knot insertion
        const segments = this._extractBezierSegments(controlPoints, knots, degree);
        
        // Elevate each Bezier segment
        const elevatedSegments = segments.map(seg => 
            this._elevateBezierDegree(seg, degree, t)
        );
        
        // Merge back into B-spline
        return this._mergeBezierSegments(elevatedSegments, knots, newDegree);
    },
    
    /**
     * Elevate degree of Bezier curve
     * Uses the degree elevation formula
     */
    _elevateBezierDegree: function(controlPoints, degree, t = 1) {
        let Q = [...controlPoints.map(p => ({ ...p }))];
        let currentDegree = degree;
        
        for (let elevation = 0; elevation < t; elevation++) {
            const n = Q.length - 1;
            const newQ = new Array(n + 2);
            
            // New control points formula:
            // Q'_i = (i/(n+1)) * Q_{i-1} + (1 - i/(n+1)) * Q_i
            
            for (let i = 0; i <= n + 1; i++) {
                const alpha = i / (n + 1);
                
                if (i === 0) {
                    newQ[i] = { ...Q[0] };
                } else if (i === n + 1) {
                    newQ[i] = { ...Q[n] };
                } else {
                    newQ[i] = {
                        x: alpha * Q[i - 1].x + (1 - alpha) * Q[i].x,
                        y: alpha * Q[i - 1].y + (1 - alpha) * Q[i].y,
                        z: alpha * (Q[i - 1].z || 0) + (1 - alpha) * (Q[i].z || 0)
                    };
                    if (Q[0].w !== undefined) {
                        newQ[i].w = alpha * Q[i - 1].w + (1 - alpha) * Q[i].w;
                    }
                }
            }
            
            Q = newQ;
            currentDegree++;
        }
        
        return Q;
    }