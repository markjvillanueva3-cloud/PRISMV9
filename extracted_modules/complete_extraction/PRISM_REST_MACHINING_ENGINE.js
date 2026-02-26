const PRISM_REST_MACHINING_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_REST_MACHINING_ENGINE',

    // 2.1 Stock Model (Voxel-Based)

    stockModel: {
        /**
         * Create voxel-based stock model
         * @param {Object} bounds - {min: {x,y,z}, max: {x,y,z}}
         * @param {number} resolution - Voxel size in mm
         */
        create: function(bounds, resolution = 1.0) {
            const resolutionMM = typeof PRISM_UNITS !== 'undefined'
                ? PRISM_UNITS.toInternal(resolution, PRISM_UNITS.currentSystem === 'inch' ? 'in' : 'mm')
                : resolution;

            const sizeX = Math.ceil((bounds.max.x - bounds.min.x) / resolutionMM);
            const sizeY = Math.ceil((bounds.max.y - bounds.min.y) / resolutionMM);
            const sizeZ = Math.ceil((bounds.max.z - bounds.min.z) / resolutionMM);

            // Use typed array for memory efficiency
            const voxels = new Uint8Array(sizeX * sizeY * sizeZ);
            voxels.fill(1); // 1 = material present

            return {
                type: 'voxel_stock',
                bounds: { ...bounds },
                resolution: resolutionMM,
                size: { x: sizeX, y: sizeY, z: sizeZ },
                voxels,
                totalVoxels: sizeX * sizeY * sizeZ,
                materialVoxels: sizeX * sizeY * sizeZ,

                // Helper to get voxel index
                _getIndex: function(ix, iy, iz) {
                    if (ix < 0 || ix >= this.size.x ||
                        iy < 0 || iy >= this.size.y ||
                        iz < 0 || iz >= this.size.z) {
                        return -1;
                    }
                    return iz * this.size.x * this.size.y + iy * this.size.x + ix;
                },
                // Convert world coordinates to voxel indices
                worldToVoxel: function(x, y, z) {
                    return {
                        ix: Math.floor((x - this.bounds.min.x) / this.resolution),
                        iy: Math.floor((y - this.bounds.min.y) / this.resolution),
                        iz: Math.floor((z - this.bounds.min.z) / this.resolution)
                    };
                },
                // Convert voxel indices to world coordinates (center of voxel)
                voxelToWorld: function(ix, iy, iz) {
                    return {
                        x: this.bounds.min.x + (ix + 0.5) * this.resolution,
                        y: this.bounds.min.y + (iy + 0.5) * this.resolution,
                        z: this.bounds.min.z + (iz + 0.5) * this.resolution
                    };
                },
                // Check if material present at position
                hasMaterial: function(x, y, z) {
                    const v = this.worldToVoxel(x, y, z);
                    const idx = this._getIndex(v.ix, v.iy, v.iz);
                    return idx >= 0 && this.voxels[idx] === 1;
                },
                // Remove material at position
                removeMaterial: function(x, y, z) {
                    const v = this.worldToVoxel(x, y, z);
                    const idx = this._getIndex(v.ix, v.iy, v.iz);
                    if (idx >= 0 && this.voxels[idx] === 1) {
                        this.voxels[idx] = 0;
                        this.materialVoxels--;
                        return true;
                    }
                    return false;
                }
            };
        },
        /**
         * Update stock model by removing material swept by tool
         */
        updateWithToolpath: function(stock, toolpath, toolGeometry) {
            const { toolDiameter, type = 'flat' } = toolGeometry;
            const toolRadius = toolDiameter / 2;

            // Convert tool radius to voxel units
            const radiusVoxels = Math.ceil(toolRadius / stock.resolution);
            let removedCount = 0;

            // Process each toolpath segment
            for (let i = 0; i < toolpath.length - 1; i++) {
                const p1 = toolpath[i];
                const p2 = toolpath[i + 1];

                // Skip rapid moves
                if (p1.rapid || p2.rapid) continue;

                // Interpolate along segment
                const dist = Math.sqrt(
                    (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2
                );
                const steps = Math.max(1, Math.ceil(dist / stock.resolution));

                for (let s = 0; s <= steps; s++) {
                    const t = s / steps;
                    const x = p1.x + t * (p2.x - p1.x);
                    const y = p1.y + t * (p2.y - p1.y);
                    const z = p1.z + t * (p2.z - p1.z);

                    // Remove material in tool swept volume
                    removedCount += this._removeToolVolume(stock, x, y, z, toolRadius, type);
                }
            }
            return {
                removedVoxels: removedCount,
                remainingMaterial: stock.materialVoxels / stock.totalVoxels
            };
        },
        /**
         * Remove material in tool volume at position
         */
        _removeToolVolume: function(stock, x, y, z, toolRadius, toolType) {
            const radiusVoxels = Math.ceil(toolRadius / stock.resolution);
            let removed = 0;

            for (let ix = -radiusVoxels; ix <= radiusVoxels; ix++) {
                for (let iy = -radiusVoxels; iy <= radiusVoxels; iy++) {
                    const dx = ix * stock.resolution;
                    const dy = iy * stock.resolution;
                    const distXY = Math.sqrt(dx * dx + dy * dy);

                    if (distXY <= toolRadius) {
                        // For flat end mill, remove down to tool tip
                        // For ball, account for sphere shape
                        let zOffset = 0;
                        if (toolType === 'ball') {
                            zOffset = toolRadius - Math.sqrt(Math.max(0, toolRadius * toolRadius - distXY * distXY));
                        }
                        if (stock.removeMaterial(x + dx, y + dy, z + zOffset)) {
                            removed++;
                        }
                    }
                }
            }
            return removed;
        }
    },
    // 2.2 REST Area Detection

    restDetection: {
        /**
         * Find REST areas by comparing stock to target geometry
         * @param {Object} stock - Voxel stock model
         * @param {Object} target - Target geometry/surface
         * @param {number} tolerance - Allowable deviation
         * @returns {Array} REST regions
         */
        findRestAreas: function(stock, target, tolerance = 0.1) {
            const restAreas = [];
            const tolerance_mm = typeof PRISM_UNITS !== 'undefined'
                ? PRISM_UNITS.toInternal(tolerance, PRISM_UNITS.currentSystem === 'inch' ? 'in' : 'mm')
                : tolerance;

            // Scan stock for remaining material above target
            for (let iz = 0; iz < stock.size.z; iz++) {
                for (let iy = 0; iy < stock.size.y; iy++) {
                    for (let ix = 0; ix < stock.size.x; ix++) {
                        const idx = stock._getIndex(ix, iy, iz);

                        if (stock.voxels[idx] === 1) {
                            const worldPos = stock.voxelToWorld(ix, iy, iz);
                            const targetZ = this._getTargetZ(target, worldPos.x, worldPos.y);

                            // Check if material is above target + tolerance
                            if (targetZ !== null && worldPos.z > targetZ + tolerance_mm) {
                                restAreas.push({
                                    x: worldPos.x,
                                    y: worldPos.y,
                                    z: worldPos.z,
                                    targetZ,
                                    excess: worldPos.z - targetZ,
                                    voxelIndex: { ix, iy, iz }
                                });
                            }
                        }
                    }
                }
            }
            return restAreas;
        },
        /**
         * Get target Z at XY position
         */
        _getTargetZ: function(target, x, y) {
            if (!target) return null;

            if (target.type === 'heightfield') {
                return target.getHeight(x, y);
            }
            if (target.type === 'mesh') {
                // Ray cast down to find surface
                const ray = { origin: { x, y, z: 1000 }, direction: { x: 0, y: 0, z: -1 } };
                const hit = this._rayMeshIntersect(ray, target);
                return hit ? hit.z : null;
            }
            if (typeof target.getZ === 'function') {
                return target.getZ(x, y);
            }
            return null;
        },
        /**
         * Group REST areas into connected regions
         */
        groupRestAreas: function(restAreas, connectionRadius) {
            if (restAreas.length === 0) return [];

            const regions = [];
            const assigned = new Set();

            for (let i = 0; i < restAreas.length; i++) {
                if (assigned.has(i)) continue;

                // Start new region
                const region = {
                    points: [],
                    bounds: {
                        minX: Infinity, maxX: -Infinity,
                        minY: Infinity, maxY: -Infinity,
                        minZ: Infinity, maxZ: -Infinity
                    },
                    maxExcess: 0
                };
                // Flood fill to find connected points
                const queue = [i];

                while (queue.length > 0) {
                    const idx = queue.shift();
                    if (assigned.has(idx)) continue;

                    assigned.add(idx);
                    const point = restAreas[idx];
                    region.points.push(point);

                    // Update bounds
                    region.bounds.minX = Math.min(region.bounds.minX, point.x);
                    region.bounds.maxX = Math.max(region.bounds.maxX, point.x);
                    region.bounds.minY = Math.min(region.bounds.minY, point.y);
                    region.bounds.maxY = Math.max(region.bounds.maxY, point.y);
                    region.bounds.minZ = Math.min(region.bounds.minZ, point.z);
                    region.bounds.maxZ = Math.max(region.bounds.maxZ, point.z);
                    region.maxExcess = Math.max(region.maxExcess, point.excess);

                    // Find neighbors
                    for (let j = 0; j < restAreas.length; j++) {
                        if (assigned.has(j)) continue;

                        const neighbor = restAreas[j];
                        const dist = Math.sqrt(
                            (neighbor.x - point.x) ** 2 +
                            (neighbor.y - point.y) ** 2 +
                            (neighbor.z - point.z) ** 2
                        );

                        if (dist <= connectionRadius) {
                            queue.push(j);
                        }
                    }
                }
                if (region.points.length > 0) {
                    // Calculate centroid
                    region.centroid = {
                        x: region.points.reduce((s, p) => s + p.x, 0) / region.points.length,
                        y: region.points.reduce((s, p) => s + p.y, 0) / region.points.length,
                        z: region.points.reduce((s, p) => s + p.z, 0) / region.points.length
                    };
                    regions.push(region);
                }
            }
            return regions;
        },
        _rayMeshIntersect: function(ray, mesh) {
            // Simplified ray-mesh intersection
            // Would use BVH in production
            return null;
        }
    },
    // 2.3 REST Toolpath Generation

    toolpathGeneration: {
        /**
         * Generate REST machining toolpath for regions
         * @param {Array} regions - REST regions from groupRestAreas
         * @param {Object} params - Machining parameters
         */
        generate: function(regions, params) {
            const {
                toolDiameter,
                stepover,
                stepDown,
                strategy = 'adaptive', // 'adaptive', 'contour', 'zigzag'
                targetGeometry
            } = params;

            const toolRadius = toolDiameter / 2;
            const stepover_mm = typeof PRISM_UNITS !== 'undefined'
                ? PRISM_UNITS.toInternal(stepover, PRISM_UNITS.currentSystem === 'inch' ? 'in' : 'mm')
                : stepover;

            const allPasses = [];

            // Sort regions by Z (highest first for top-down machining)
            const sortedRegions = [...regions].sort((a, b) => b.bounds.maxZ - a.bounds.maxZ);

            for (const region of sortedRegions) {
                const regionPasses = this._generateRegionToolpath(region, {
                    toolRadius,
                    stepover: stepover_mm,
                    stepDown,
                    strategy,
                    targetGeometry
                });

                allPasses.push({
                    regionId: regions.indexOf(region),
                    passes: regionPasses,
                    bounds: region.bounds
                });
            }
            return {
                type: 'rest_machining',
                regions: allPasses,
                params
            };
        },
        /**
         * Generate toolpath for single REST region
         */
        _generateRegionToolpath: function(region, params) {
            const { toolRadius, stepover, stepDown, strategy, targetGeometry } = params;
            const passes = [];

            // Generate boundary of region
            const boundary = this._getRegionBoundary(region.points, toolRadius);

            if (strategy === 'adaptive') {
                // Adaptive spiral clearing
                passes.push(...this._adaptiveClearing(boundary, region, params));
            } else if (strategy === 'contour') {
                // Concentric contour passes
                passes.push(...this._contourClearing(boundary, region, params));
            } else {
                // Zigzag pattern
                passes.push(...this._zigzagClearing(boundary, region, params));
            }
            return passes;
        },
        /**
         * Get convex hull or alpha shape of region points
         */
        _getRegionBoundary: function(points, toolRadius) {
            if (points.length < 3) return points;

            // Simple convex hull using gift wrapping
            const hull = [];

            // Find leftmost point
            let start = points[0];
            for (const p of points) {
                if (p.x < start.x) start = p;
            }
            let current = start;
            let prev = { x: current.x, y: current.y - 1 }; // Start looking up

            do {
                hull.push(current);

                let best = null;
                let bestAngle = -Infinity;

                // Find point with smallest left turn
                for (const p of points) {
                    if (p === current) continue;

                    const angle = Math.atan2(p.y - current.y, p.x - current.x) -
                                 Math.atan2(prev.y - current.y, prev.x - current.x);

                    const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

                    if (normalizedAngle > bestAngle || best === null) {
                        bestAngle = normalizedAngle;
                        best = p;
                    }
                }
                if (best === null || hull.length > points.length) break;

                prev = current;
                current = best;

            } while (current !== start && hull.length < points.length + 1);

            // Offset boundary by tool radius
            return hull.map(p => ({
                x: p.x,
                y: p.y,
                z: p.targetZ || p.z
            }));
        },
        /**
         * Adaptive clearing for REST region
         */
        _adaptiveClearing: function(boundary, region, params) {
            const { toolRadius, stepover, stepDown } = params;
            const passes = [];

            // Generate spiral from outside in
            let currentBoundary = boundary;
            let passIndex = 0;

            while (currentBoundary.length >= 3) {
                // Calculate Z levels
                const startZ = region.bounds.maxZ;
                const endZ = Math.min(...region.points.map(p => p.targetZ || region.bounds.minZ));

                for (let z = startZ; z >= endZ; z -= stepDown) {
                    const pass = {
                        type: 'rest_adaptive',
                        index: passIndex,
                        depth: z,
                        points: currentBoundary.map(p => ({
                            x: p.x,
                            y: p.y,
                            z: Math.max(z, p.z || z),
                            feedrate: params.feedrate || 1000
                        }))
                    };
                    passes.push(pass);
                }
                // Offset boundary inward
                currentBoundary = this._offsetBoundary(currentBoundary, stepover);
                passIndex++;

                // Safety limit
                if (passIndex > 100) break;
            }
            return passes;
        },
        /**
         * Contour clearing for REST region
         */
        _contourClearing: function(boundary, region, params) {
            const { toolRadius, stepover, stepDown } = params;
            const passes = [];

            // Multiple depth levels
            const startZ = region.bounds.maxZ;
            const endZ = Math.min(...region.points.map(p => p.targetZ || region.bounds.minZ));

            for (let z = startZ; z >= endZ; z -= stepDown) {
                // Concentric passes at this Z level
                let currentBoundary = boundary;
                let passIndex = 0;

                while (currentBoundary.length >= 3 && passIndex < 50) {
                    passes.push({
                        type: 'rest_contour',
                        depth: z,
                        index: passIndex,
                        points: currentBoundary.map(p => ({
                            x: p.x,
                            y: p.y,
                            z,
                            feedrate: params.feedrate || 1000
                        }))
                    });

                    currentBoundary = this._offsetBoundary(currentBoundary, stepover);
                    passIndex++;
                }
            }
            return passes;
        },
        /**
         * Zigzag clearing for REST region
         */
        _zigzagClearing: function(boundary, region, params) {
            const { toolRadius, stepover, stepDown } = params;
            const passes = [];

            // Find bounding box
            const minX = Math.min(...boundary.map(p => p.x)) + toolRadius;
            const maxX = Math.max(...boundary.map(p => p.x)) - toolRadius;
            const minY = Math.min(...boundary.map(p => p.y)) + toolRadius;
            const maxY = Math.max(...boundary.map(p => p.y)) - toolRadius;

            // Multiple depth levels
            const startZ = region.bounds.maxZ;
            const endZ = Math.min(...region.points.map(p => p.targetZ || region.bounds.minZ));

            for (let z = startZ; z >= endZ; z -= stepDown) {
                let direction = 1;
                let passIndex = 0;

                for (let y = minY; y <= maxY; y += stepover) {
                    const pass = {
                        type: 'rest_zigzag',
                        depth: z,
                        index: passIndex,
                        points: direction > 0
                            ? [{ x: minX, y, z }, { x: maxX, y, z }]
                            : [{ x: maxX, y, z }, { x: minX, y, z }]
                    };
                    passes.push(pass);
                    direction *= -1;
                    passIndex++;
                }
            }
            return passes;
        },
        /**
         * Offset boundary inward
         */
        _offsetBoundary: function(boundary, offset) {
            if (boundary.length < 3) return [];

            const result = [];
            const n = boundary.length;

            for (let i = 0; i < n; i++) {
                const prev = boundary[(i - 1 + n) % n];
                const curr = boundary[i];
                const next = boundary[(i + 1) % n];

                // Edge vectors
                const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
                const v2 = { x: next.x - curr.x, y: next.y - curr.y };

                // Normals (pointing inward for CCW boundary)
                const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y) || 1;
                const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y) || 1;

                const n1 = { x: v1.y / len1, y: -v1.x / len1 };
                const n2 = { x: v2.y / len2, y: -v2.x / len2 };

                // Average normal (bisector)
                const avgN = {
                    x: (n1.x + n2.x) / 2,
                    y: (n1.y + n2.y) / 2
                };
                const avgLen = Math.sqrt(avgN.x * avgN.x + avgN.y * avgN.y) || 1;

                // Offset point
                const miter = offset / Math.max(0.5, avgLen);

                result.push({
                    x: curr.x + avgN.x / avgLen * miter,
                    y: curr.y + avgN.y / avgLen * miter,
                    z: curr.z,
                    targetZ: curr.targetZ
                });
            }
            // Check if boundary collapsed
            let area = 0;
            for (let i = 0; i < result.length; i++) {
                const j = (i + 1) % result.length;
                area += result[i].x * result[j].y - result[j].x * result[i].y;
            }
            return Math.abs(area) > offset * offset ? result : [];
        }
    },
    // 2.4 Tool Selection for REST

    toolSelection: {
        /**
         * Select optimal tool for REST region based on geometry
         * @param {Object} region - REST region
         * @param {Array} availableTools - List of available tools
         */
        selectTool: function(region, availableTools) {
            // Sort regions by minimum feature size
            const minFeatureSize = this._estimateMinFeatureSize(region);

            // Find smallest tool that can reach all areas
            const suitableTools = availableTools.filter(tool =>
                tool.diameter / 2 <= minFeatureSize * 0.9
            );

            if (suitableTools.length === 0) {
                console.warn('[REST] No suitable tool found for region');
                return availableTools[availableTools.length - 1]; // Return smallest
            }
            // Prefer larger tools for efficiency
            return suitableTools.reduce((best, tool) =>
                tool.diameter > best.diameter ? tool : best
            );
        },
        _estimateMinFeatureSize: function(region) {
            // Estimate minimum corner radius in region
            // Simplified: use minimum distance between non-adjacent points
            const points = region.points;
            let minDist = Infinity;

            for (let i = 0; i < points.length; i++) {
                for (let j = i + 2; j < points.length; j++) {
                    const dist = Math.sqrt(
                        (points[i].x - points[j].x) ** 2 +
                        (points[i].y - points[j].y) ** 2
                    );
                    if (dist < minDist) minDist = dist;
                }
            }
            return minDist === Infinity ? 10 : minDist / 2;
        }
    }
}