const PRISM_ADVANCED_REST_MACHINING = {
    name: 'PRISM Advanced REST Machining',
    version: '1.0.0',
    source: 'MIT 2.008 - Design & Manufacturing II',

    /**
     * Advanced REST machining with stock tracking
     * Eliminates air cutting through intelligent stock awareness
     */
    generateAdvancedREST(geometry, previousOperations, currentTool, options = {}) {
        const {
            stockModel = null,
            tolerance = 0.001,
            stepover = 0.5,
            maxScallop = 0.01,
            strategy = 'adaptive',  // 'adaptive', 'pencil', 'spiral', 'parallel'
            eliminateAirCutting = true
        } = options;

        console.log('[REST] Starting advanced REST machining analysis...');

        // Step 1: Build stock model from previous operations
        const stock = stockModel || this._buildStockModel(geometry, previousOperations);

        // Step 2: Identify REST regions using Voronoi analysis
        const restRegions = this._identifyRESTRegions(
            geometry,
            previousOperations,
            currentTool,
            stock
        );

        console.log(`[REST] Identified ${restRegions.length} REST regions`);

        // Step 3: Generate toolpath for each region
        const toolpaths = [];
        let totalAirTime = 0;
        let totalCuttingTime = 0;

        for (const region of restRegions) {
            const regionToolpath = this._generateRegionToolpath(
                region,
                currentTool,
                stock,
                { strategy, stepover, maxScallop, tolerance }
            );

            // Optimize to eliminate air cutting
            if (eliminateAirCutting) {
                const optimized = this._eliminateAirCutting(regionToolpath, stock);
                toolpaths.push(optimized.toolpath);
                totalAirTime += optimized.airTimeRemoved;
                totalCuttingTime += optimized.cuttingTime;
            } else {
                toolpaths.push(regionToolpath);
            }
        }
        // Step 4: Order regions for minimum rapid moves
        const orderedToolpaths = this._optimizeRegionOrder(toolpaths, currentTool);

        // Step 5: Generate complete REST toolpath
        const result = {
            type: 'ADVANCED_REST_MACHINING',
            tool: currentTool,
            regions: restRegions,
            toolpaths: orderedToolpaths,
            stock: stock,
            statistics: {
                numRegions: restRegions.length,
                totalPoints: orderedToolpaths.reduce((sum, tp) => sum + tp.points.length, 0),
                totalLength: this._calculateTotalLength(orderedToolpaths),
                airCuttingEliminated: totalAirTime,
                estimatedCuttingTime: totalCuttingTime,
                efficiency: totalCuttingTime / (totalCuttingTime + totalAirTime) * 100
            }
        };
        console.log(`[REST] Generated REST toolpath: ${result.statistics.totalPoints} points, ${result.statistics.efficiency.toFixed(1)}% efficiency`);

        return result;
    },
    /**
     * Build stock model from geometry and previous operations
     */
    _buildStockModel(geometry, previousOperations) {
        // Initialize stock from bounding box
        const bounds = geometry.bounds || { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 100, maxZ: 50 };

        // Use voxel grid for stock representation
        const resolution = 1.0;  // 1mm voxels
        const nx = Math.ceil((bounds.maxX - bounds.minX) / resolution);
        const ny = Math.ceil((bounds.maxY - bounds.minY) / resolution);
        const nz = Math.ceil((bounds.maxZ - bounds.minZ) / resolution);

        // Initialize as solid stock
        const voxels = new Array(nx * ny * nz).fill(1);  // 1 = material, 0 = removed

        // Remove material based on previous operations
        for (const op of (previousOperations || [])) {
            this._removeVoxelsAlongToolpath(voxels, op, bounds, resolution, nx, ny, nz);
        }
        return {
            bounds,
            resolution,
            nx, ny, nz,
            voxels,

            // Query methods
            hasMaterial: function(x, y, z) {
                const ix = Math.floor((x - bounds.minX) / resolution);
                const iy = Math.floor((y - bounds.minY) / resolution);
                const iz = Math.floor((z - bounds.minZ) / resolution);
                if (ix < 0 || ix >= nx || iy < 0 || iy >= ny || iz < 0 || iz >= nz) return false;
                return voxels[ix + iy * nx + iz * nx * ny] === 1;
            },
            removeMaterial: function(x, y, z, radius) {
                const r2 = radius * radius;
                const ri = Math.ceil(radius / resolution);
                const cx = Math.floor((x - bounds.minX) / resolution);
                const cy = Math.floor((y - bounds.minY) / resolution);
                const cz = Math.floor((z - bounds.minZ) / resolution);

                for (let dx = -ri; dx <= ri; dx++) {
                    for (let dy = -ri; dy <= ri; dy++) {
                        for (let dz = -ri; dz <= ri; dz++) {
                            if (dx*dx + dy*dy + dz*dz <= r2 / (resolution*resolution)) {
                                const ix = cx + dx;
                                const iy = cy + dy;
                                const iz = cz + dz;
                                if (ix >= 0 && ix < nx && iy >= 0 && iy < ny && iz >= 0 && iz < nz) {
                                    voxels[ix + iy * nx + iz * nx * ny] = 0;
                                }
                            }
                        }
                    }
                }
            }
        };
    },
    _removeVoxelsAlongToolpath(voxels, operation, bounds, resolution, nx, ny, nz) {
        const tool = operation.tool || { diameter: 10 };
        const radius = tool.diameter / 2;
        const points = operation.points || operation.toolpath?.points || [];

        for (const pt of points) {
            const cx = Math.floor((pt.x - bounds.minX) / resolution);
            const cy = Math.floor((pt.y - bounds.minY) / resolution);
            const cz = Math.floor(((pt.z || 0) - bounds.minZ) / resolution);
            const ri = Math.ceil(radius / resolution);

            for (let dx = -ri; dx <= ri; dx++) {
                for (let dy = -ri; dy <= ri; dy++) {
                    if (dx*dx + dy*dy <= ri*ri) {
                        const ix = cx + dx;
                        const iy = cy + dy;
                        // Remove all material above cutting point
                        for (let iz = cz; iz < nz; iz++) {
                            if (ix >= 0 && ix < nx && iy >= 0 && iy < ny) {
                                voxels[ix + iy * nx + iz * nx * ny] = 0;
                            }
                        }
                    }
                }
            }
        }
    },
    /**
     * Identify REST regions using Voronoi-based analysis
     */
    _identifyRESTRegions(geometry, previousOperations, currentTool, stock) {
        const regions = [];
        const currentRadius = currentTool.diameter / 2;

        // Get previous tool radii
        const prevRadii = (previousOperations || []).map(op => (op.tool?.diameter || 10) / 2);
        const maxPrevRadius = Math.max(...prevRadii, 0);

        // Region 1: Corners that previous tool couldn't reach
        if (geometry.corners) {
            for (const corner of geometry.corners) {
                if ((corner.radius || 0) < maxPrevRadius && (corner.radius || 0) >= currentRadius) {
                    regions.push({
                        type: 'CORNER',
                        center: corner.center || corner,
                        innerRadius: corner.radius || 0,
                        outerRadius: maxPrevRadius,
                        depth: corner.depth || geometry.depth || 10,
                        boundingBox: this._cornerBoundingBox(corner, maxPrevRadius)
                    });
                }
            }
        }
        // Region 2: Fillets and radii
        if (geometry.fillets) {
            for (const fillet of geometry.fillets) {
                if ((fillet.radius || 0) < maxPrevRadius) {
                    regions.push({
                        type: 'FILLET',
                        edge: fillet.edge,
                        radius: fillet.radius,
                        length: fillet.length || 10,
                        depth: fillet.depth || geometry.depth || 10
                    });
                }
            }
        }
        // Region 3: Narrow slots and grooves
        if (geometry.slots) {
            for (const slot of geometry.slots) {
                if (slot.width < maxPrevRadius * 2) {
                    regions.push({
                        type: 'SLOT',
                        start: slot.start,
                        end: slot.end,
                        width: slot.width,
                        depth: slot.depth
                    });
                }
            }
        }
        // Region 4: Use Voronoi to find coverage gaps
        if (previousOperations?.length > 0) {
            const prevPoints = this._extractPreviousToolpathPoints(previousOperations);
            if (prevPoints.length > 3) {
                const voronoi = PRISM_VORONOI_ENGINE.compute(prevPoints, geometry.bounds);

                // Find cells with insufficient coverage
                for (const cell of voronoi.cells) {
                    const area = PRISM_VORONOI_ENGINE._polygonArea(cell.vertices);
                    const expectedCoverage = Math.PI * maxPrevRadius * maxPrevRadius;

                    if (area > expectedCoverage * 1.5) {
                        // Gap in coverage - needs REST machining
                        regions.push({
                            type: 'COVERAGE_GAP',
                            polygon: cell.vertices,
                            area,
                            site: voronoi.sites[voronoi.cells.indexOf(cell)]
                        });
                    }
                }
            }
        }
        // Region 5: Remaining stock detection
        const remainingRegions = this._detectRemainingStock(stock, geometry, currentTool);
        regions.push(...remainingRegions);

        return regions;
    },
    _cornerBoundingBox(corner, radius) {
        const c = corner.center || corner;
        return {
            minX: c.x - radius,
            maxX: c.x + radius,
            minY: c.y - radius,
            maxY: c.y + radius
        };
    },
    _extractPreviousToolpathPoints(operations) {
        const points = [];
        for (const op of operations) {
            const pts = op.points || op.toolpath?.points || [];
            // Sample every nth point to avoid too many
            for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 100))) {
                points.push({ x: pts[i].x, y: pts[i].y });
            }
        }
        return points;
    },
    _detectRemainingStock(stock, geometry, currentTool) {
        const regions = [];

        // Sample stock model to find material
        const sampleStep = stock.resolution * 5;
        const b = stock.bounds;

        let currentRegion = null;

        for (let x = b.minX; x < b.maxX; x += sampleStep) {
            for (let y = b.minY; y < b.maxY; y += sampleStep) {
                for (let z = b.minZ; z < b.maxZ; z += sampleStep) {
                    if (stock.hasMaterial(x, y, z)) {
                        // Check if this is part of desired geometry
                        const isWanted = this._isInsideDesiredGeometry(x, y, z, geometry);

                        if (!isWanted) {
                            // This is excess material - needs removal
                            if (!currentRegion) {
                                currentRegion = {
                                    type: 'REMAINING_STOCK',
                                    points: [],
                                    bounds: { minX: x, maxX: x, minY: y, maxY: y, minZ: z, maxZ: z }
                                };
                            }
                            currentRegion.points.push({ x, y, z });
                            currentRegion.bounds.minX = Math.min(currentRegion.bounds.minX, x);
                            currentRegion.bounds.maxX = Math.max(currentRegion.bounds.maxX, x);
                            currentRegion.bounds.minY = Math.min(currentRegion.bounds.minY, y);
                            currentRegion.bounds.maxY = Math.max(currentRegion.bounds.maxY, y);
                            currentRegion.bounds.minZ = Math.min(currentRegion.bounds.minZ, z);
                            currentRegion.bounds.maxZ = Math.max(currentRegion.bounds.maxZ, z);
                        }
                    }
                }
            }
        }
        if (currentRegion && currentRegion.points.length > 0) {
            regions.push(currentRegion);
        }
        return regions;
    },
    _isInsideDesiredGeometry(x, y, z, geometry) {
        // Simplified check - should use actual part model
        if (geometry.type === 'POCKET') {
            const b = geometry.bounds;
            return z < (geometry.floorZ || 0);
        }
        return false;
    },
    /**
     * Generate toolpath for a specific REST region
     */
    _generateRegionToolpath(region, tool, stock, options) {
        const toolpath = {
            type: `REST_${region.type}`,
            tool,
            region,
            points: [],
            statistics: { totalLength: 0 }
        };
        switch (region.type) {
            case 'CORNER':
                this._generateCornerToolpath(toolpath, region, tool, options);
                break;
            case 'FILLET':
                this._generateFilletToolpath(toolpath, region, tool, options);
                break;
            case 'SLOT':
                this._generateSlotToolpath(toolpath, region, tool, options);
                break;
            case 'COVERAGE_GAP':
                this._generateGapToolpath(toolpath, region, tool, stock, options);
                break;
            case 'REMAINING_STOCK':
                this._generateStockRemovalToolpath(toolpath, region, tool, stock, options);
                break;
            default:
                this._generateAdaptiveToolpath(toolpath, region, tool, stock, options);
        }
        return toolpath;
    },
    _generateCornerToolpath(toolpath, region, tool, options) {
        const { stepover = 0.5 } = options;
        const numPasses = Math.ceil((region.outerRadius - region.innerRadius) / (tool.diameter * stepover));

        for (let pass = 0; pass < numPasses; pass++) {
            const r = region.innerRadius + pass * tool.diameter * stepover + tool.diameter / 2;

            // Generate arc for this pass
            for (let angle = 0; angle <= Math.PI / 2; angle += 0.1) {
                toolpath.points.push({
                    x: region.center.x + r * Math.cos(angle),
                    y: region.center.y + r * Math.sin(angle),
                    z: -region.depth
                });
            }
        }
    }
};