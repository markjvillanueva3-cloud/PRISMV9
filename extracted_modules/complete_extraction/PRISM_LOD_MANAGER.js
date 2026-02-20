const PRISM_LOD_MANAGER = {
    name: 'PRISM_LOD_MANAGER',
    version: '1.0.0',
    source: 'MIT 6.837, Stanford CS 468',
    description: 'Level of Detail management for large assemblies and complex geometry',
    
    // LOD Configuration
    config: {
        levels: [
            { name: 'ULTRA', reductionFactor: 1.0, distance: 0 },
            { name: 'HIGH', reductionFactor: 0.5, distance: 100 },
            { name: 'MEDIUM', reductionFactor: 0.25, distance: 500 },
            { name: 'LOW', reductionFactor: 0.1, distance: 1000 },
            { name: 'MINIMAL', reductionFactor: 0.05, distance: 2000 }
        ],
        screenSpaceThreshold: 0.01, // Minimum screen pixels for visibility
        hysteresis: 0.1, // Prevent LOD thrashing
        maxTrianglesPerFrame: 5000000
    },
    
    // LOD cache for objects
    cache: new Map(),
    
    /**
     * Select appropriate LOD level based on distance and screen coverage
     * @param {Object} object - Object with bounding sphere
     * @param {Object} camera - Camera position and parameters
     * @returns {Object} Selected LOD level and index
     */
    selectLOD: function(object, camera) {
        const distance = this._calculateDistance(object.center, camera.position);
        const screenCoverage = this._calculateScreenCoverage(object.boundingRadius, distance, camera.fov, camera.viewportHeight);
        
        // Screen space culling
        if (screenCoverage < this.config.screenSpaceThreshold) {
            return { level: null, index: -1, culled: true, reason: 'screen_space' };
        }
        
        // Distance-based LOD selection with hysteresis
        let selectedLevel = this.config.levels[0];
        let selectedIndex = 0;
        
        const cachedLevel = this.cache.get(object.id);
        const hysteresisMargin = cachedLevel ? this.config.hysteresis : 0;
        
        for (let i = 0; i < this.config.levels.length; i++) {
            const level = this.config.levels[i];
            const threshold = level.distance * (1 + (cachedLevel === i ? hysteresisMargin : -hysteresisMargin));
            
            if (distance >= threshold) {
                selectedLevel = level;
                selectedIndex = i;
            }
        }
        
        // Cache selection
        this.cache.set(object.id, selectedIndex);
        
        return {
            level: selectedLevel,
            index: selectedIndex,
            culled: false,
            distance: distance,
            screenCoverage: screenCoverage
        };
    },
    
    /**
     * Batch LOD selection for multiple objects with triangle budget
     * @param {Array} objects - Array of objects
     * @param {Object} camera - Camera
     * @returns {Array} LOD selections with potential downgrades for budget
     */
    batchSelectLOD: function(objects, camera) {
        const selections = objects.map(obj => ({
            object: obj,
            ...this.selectLOD(obj, camera)
        }));
        
        // Sort by screen coverage (importance)
        selections.sort((a, b) => b.screenCoverage - a.screenCoverage);
        
        // Budget enforcement
        let totalTriangles = 0;
        const budget = this.config.maxTrianglesPerFrame;
        
        for (const sel of selections) {
            if (sel.culled) continue;
            
            const estimatedTriangles = this._estimateTriangles(sel.object, sel.level);
            
            if (totalTriangles + estimatedTriangles > budget) {
                // Try to downgrade LOD
                while (sel.index < this.config.levels.length - 1) {
                    sel.index++;
                    sel.level = this.config.levels[sel.index];
                    const newTriangles = this._estimateTriangles(sel.object, sel.level);
                    if (totalTriangles + newTriangles <= budget) {
                        totalTriangles += newTriangles;
                        sel.downgraded = true;
                        break;
                    }
                }
                
                if (sel.index === this.config.levels.length - 1) {
                    const finalTriangles = this._estimateTriangles(sel.object, sel.level);
                    if (totalTriangles + finalTriangles > budget) {
                        sel.culled = true;
                        sel.reason = 'budget';
                    } else {
                        totalTriangles += finalTriangles;
                    }
                }
            } else {
                totalTriangles += estimatedTriangles;
            }
        }
        
        return {
            selections: selections,
            totalTriangles: totalTriangles,
            budgetUsed: totalTriangles / budget
        };
    },
    
    /**
     * Create LOD chain for a mesh using progressive decimation
     * @param {Object} mesh - Original mesh {vertices, indices}
     * @returns {Array} LOD chain
     */
    createLODChain: function(mesh) {
        const chain = [{
            level: this.config.levels[0],
            mesh: mesh,
            triangleCount: mesh.indices.length / 3
        }];
        
        for (let i = 1; i < this.config.levels.length; i++) {
            const level = this.config.levels[i];
            const targetTriangles = Math.max(12, Math.floor(chain[0].triangleCount * level.reductionFactor));
            
            // Use mesh decimation
            const decimated = PRISM_MESH_DECIMATION_ENGINE.decimate(
                chain[0].mesh,
                targetTriangles
            );
            
            chain.push({
                level: level,
                mesh: decimated,
                triangleCount: decimated.indices.length / 3
            });
        }
        
        return chain;
    },
    
    /**
     * Octree-based spatial culling
     * @param {Object} octree - Octree structure
     * @param {Object} frustum - View frustum planes
     * @returns {Array} Visible node IDs
     */
    frustumCullOctree: function(octree, frustum) {
        const visible = [];
        this._frustumCullNode(octree.root, frustum, visible);
        return visible;
    },
    
    _frustumCullNode: function(node, frustum, visible) {
        if (!node) return;
        
        const intersection = this._testFrustumAABB(frustum, node.bounds);
        
        if (intersection === 'OUTSIDE') {
            return; // Entire node culled
        }
        
        if (intersection === 'INSIDE' || node.children.length === 0) {
            // Node fully visible or is leaf
            visible.push(...(node.objects || []));
            if (intersection === 'INSIDE') {
                // Add all children recursively without testing
                this._addAllDescendants(node, visible);
                return;
            }
        }
        
        // Partially visible - recurse to children
        for (const child of node.children) {
            this._frustumCullNode(child, frustum, visible);
        }
    },
    
    _addAllDescendants: function(node, visible) {
        if (!node.children || node.children.length === 0) return;
        for (const child of node.children) {
            visible.push(...(child.objects || []));
            this._addAllDescendants(child, visible);
        }
    },
    
    /**
     * Test frustum against AABB
     * @param {Object} frustum - 6 frustum planes
     * @param {Object} aabb - {min, max}
     * @returns {string} 'INSIDE', 'OUTSIDE', or 'INTERSECT'
     */
    _testFrustumAABB: function(frustum, aabb) {
        let allInside = true;
        
        for (const plane of frustum.planes) {
            const pVertex = {
                x: plane.normal.x >= 0 ? aabb.max.x : aabb.min.x,
                y: plane.normal.y >= 0 ? aabb.max.y : aabb.min.y,
                z: plane.normal.z >= 0 ? aabb.max.z : aabb.min.z
            };
            
            const nVertex = {
                x: plane.normal.x >= 0 ? aabb.min.x : aabb.max.x,
                y: plane.normal.y >= 0 ? aabb.min.y : aabb.max.y,
                z: plane.normal.z >= 0 ? aabb.min.z : aabb.max.z
            };
            
            const pDist = plane.normal.x * pVertex.x + plane.normal.y * pVertex.y + 
                         plane.normal.z * pVertex.z + plane.d;
            const nDist = plane.normal.x * nVertex.x + plane.normal.y * nVertex.y + 
                         plane.normal.z * nVertex.z + plane.d;
            
            if (pDist < 0) return 'OUTSIDE';
            if (nDist < 0) allInside = false;
        }
        
        return allInside ? 'INSIDE' : 'INTERSECT';
    },
    
    /**
     * Build octree from objects
     * @param {Array} objects - Objects with bounding boxes
     * @param {Object} bounds - World bounds
     * @param {number} maxDepth - Maximum tree depth
     * @returns {Object} Octree structure
     */
    buildOctree: function(objects, bounds, maxDepth = 8, maxObjectsPerNode = 10) {
        const root = {
            bounds: bounds,
            objects: [],
            children: [],
            depth: 0
        };
        
        for (const obj of objects) {
            this._insertIntoOctree(root, obj, maxDepth, maxObjectsPerNode);
        }
        
        return { root, objectCount: objects.length };
    },
    
    _insertIntoOctree: function(node, obj, maxDepth, maxObjects) {
        // If leaf and can hold more, or at max depth
        if (node.children.length === 0 && 
            (node.objects.length < maxObjects || node.depth >= maxDepth)) {
            node.objects.push(obj);
            return;
        }
        
        // Subdivide if needed
        if (node.children.length === 0) {
            this._subdivideOctreeNode(node);
            // Re-distribute existing objects
            const existing = [...node.objects];
            node.objects = [];
            for (const o of existing) {
                this._insertIntoOctree(node, o, maxDepth, maxObjects);
            }
        }
        
        // Find child that contains object center
        const center = obj.center || this._getObjectCenter(obj);
        const nodeCenter = this._getAABBCenter(node.bounds);
        
        const childIndex = 
            (center.x > nodeCenter.x ? 1 : 0) +
            (center.y > nodeCenter.y ? 2 : 0) +
            (center.z > nodeCenter.z ? 4 : 0);
        
        this._insertIntoOctree(node.children[childIndex], obj, maxDepth, maxObjects);
    },
    
    _subdivideOctreeNode: function(node) {
        const min = node.bounds.min;
        const max = node.bounds.max;
        const mid = {
            x: (min.x + max.x) / 2,
            y: (min.y + max.y) / 2,
            z: (min.z + max.z) / 2
        };
        
        // Create 8 children
        const childBounds = [
            { min: { x: min.x, y: min.y, z: min.z }, max: { x: mid.x, y: mid.y, z: mid.z } },
            { min: { x: mid.x, y: min.y, z: min.z }, max: { x: max.x, y: mid.y, z: mid.z } },
            { min: { x: min.x, y: mid.y, z: min.z }, max: { x: mid.x, y: max.y, z: mid.z } },
            { min: { x: mid.x, y: mid.y, z: min.z }, max: { x: max.x, y: max.y, z: mid.z } },
            { min: { x: min.x, y: min.y, z: mid.z }, max: { x: mid.x, y: mid.y, z: max.z } },
            { min: { x: mid.x, y: min.y, z: mid.z }, max: { x: max.x, y: mid.y, z: max.z } },
            { min: { x: min.x, y: mid.y, z: mid.z }, max: { x: mid.x, y: max.y, z: max.z } },
            { min: { x: mid.x, y: mid.y, z: mid.z }, max: { x: max.x, y: max.y, z: max.z } }
        ];
        
        node.children = childBounds.map(b => ({
            bounds: b,
            objects: [],
            children: [],
            depth: node.depth + 1
        }));
    },
    
    // Helper methods
    _calculateDistance: function(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    
    _calculateScreenCoverage: function(radius, distance, fovDegrees, viewportHeight) {
        if (distance < 0.001) distance = 0.001;
        const fovRadians = fovDegrees * Math.PI / 180;
        const projectedSize = (radius * 2) / distance;
        const screenSize = projectedSize / (2 * Math.tan(fovRadians / 2));
        return screenSize * viewportHeight;
    },
    
    _estimateTriangles: function(object, level) {
        const baseTriangles = object.triangleCount || 1000;
        return Math.floor(baseTriangles * level.reductionFactor);
    },
    
    _getObjectCenter: function(obj) {
        if (obj.center) return obj.center;
        if (obj.bounds) return this._getAABBCenter(obj.bounds);
        return { x: 0, y: 0, z: 0 };
    },
    
    _getAABBCenter: function(bounds) {
        return {
            x: (bounds.min.x + bounds.max.x) / 2,
            y: (bounds.min.y + bounds.max.y) / 2,
            z: (bounds.min.z + bounds.max.z) / 2
        };
    },
    
    // Statistics
    getStatistics: function() {
        return {
            cachedObjects: this.cache.size,
            lodLevels: this.config.levels.length,
            triangleBudget: this.config.maxTrianglesPerFrame
        };
    },
    
    clearCache: function() {
        this.cache.clear();
    }
}