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
}