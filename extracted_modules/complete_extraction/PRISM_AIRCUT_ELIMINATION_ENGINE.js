const PRISM_AIRCUT_ELIMINATION_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_AIRCUT_ELIMINATION_ENGINE',

    // 4.1 Air-Cut Detection

    detection: {
        /**
         * Detect air-cut segments in toolpath
         * @param {Array} toolpath - Toolpath points
         * @param {Object} stockModel - Voxel or B-rep stock model
         * @param {Object} toolGeometry - {toolDiameter, type}
         * @returns {Array} Segments with air-cut flags
         */
        analyze: function(toolpath, stockModel, toolGeometry) {
            if (!toolpath || toolpath.length < 2) return [];

            const toolRadius = toolGeometry.toolDiameter / 2;
            const segments = [];

            for (let i = 0; i < toolpath.length - 1; i++) {
                const p1 = toolpath[i];
                const p2 = toolpath[i + 1];

                // Skip rapid moves
                if (p1.rapid || p2.rapid) {
                    segments.push({
                        startIndex: i,
                        endIndex: i + 1,
                        type: 'rapid',
                        airCut: true,
                        canOptimize: false
                    });
                    continue;
                }
                // Check if segment passes through material
                const isInMaterial = this._segmentInMaterial(p1, p2, stockModel, toolRadius);

                segments.push({
                    startIndex: i,
                    endIndex: i + 1,
                    start: { x: p1.x, y: p1.y, z: p1.z },
                    end: { x: p2.x, y: p2.y, z: p2.z },
                    type: 'cutting',
                    airCut: !isInMaterial,
                    canOptimize: !isInMaterial,
                    length: Math.sqrt(
                        (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2
                    )
                });
            }
            return segments;
        },
        /**
         * Check if segment passes through material
         */
        _segmentInMaterial: function(p1, p2, stockModel, toolRadius) {
            if (!stockModel) return true; // Assume in material if no stock model

            // Sample along segment
            const dist = Math.sqrt(
                (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2
            );
            const numSamples = Math.max(3, Math.ceil(dist / (toolRadius * 0.5)));

            for (let s = 0; s <= numSamples; s++) {
                const t = s / numSamples;
                const x = p1.x + t * (p2.x - p1.x);
                const y = p1.y + t * (p2.y - p1.y);
                const z = p1.z + t * (p2.z - p1.z);

                // Check if point is in material
                if (stockModel.hasMaterial) {
                    // Voxel model
                    if (stockModel.hasMaterial(x, y, z)) return true;
                } else if (stockModel.type === 'box') {
                    // Simple box stock
                    if (x >= stockModel.min.x && x <= stockModel.max.x &&
                        y >= stockModel.min.y && y <= stockModel.max.y &&
                        z >= stockModel.min.z && z <= stockModel.max.z) {
                        return true;
                    }
                }
            }
            return false;
        },
        /**
         * Get air-cut statistics
         */
        getStatistics: function(segments) {
            const stats = {
                totalSegments: segments.length,
                airCutSegments: 0,
                cuttingSegments: 0,
                rapidSegments: 0,
                totalAirCutLength: 0,
                totalCuttingLength: 0,
                airCutPercentage: 0
            };
            for (const seg of segments) {
                if (seg.type === 'rapid') {
                    stats.rapidSegments++;
                } else if (seg.airCut) {
                    stats.airCutSegments++;
                    stats.totalAirCutLength += seg.length || 0;
                } else {
                    stats.cuttingSegments++;
                    stats.totalCuttingLength += seg.length || 0;
                }
            }
            const totalPath = stats.totalAirCutLength + stats.totalCuttingLength;
            stats.airCutPercentage = totalPath > 0
                ? (stats.totalAirCutLength / totalPath * 100).toFixed(1)
                : 0;

            return stats;
        }
    },
    // 4.2 Rapid Move Optimization

    rapidOptimization: {
        /**
         * Optimize rapid moves to minimize air time
         * @param {Array} toolpath - Original toolpath
         * @param {Array} segments - Air-cut analysis segments
         * @param {Object} machineConfig - Machine limits and safe planes
         */
        optimize: function(toolpath, segments, machineConfig) {
            const {
                safeZ = 50,           // Default safe Z for rapids
                clearanceZ = 5,       // Clearance above stock
                rapidFeed = 10000,    // Rapid feedrate mm/min
                obstacles = []        // Fixtures/clamps to avoid
            } = machineConfig || {};

            const optimized = [];
            let i = 0;

            while (i < toolpath.length) {
                const point = toolpath[i];

                // Find consecutive air-cut segments
                const airCutRun = this._findAirCutRun(segments, i);

                if (airCutRun && airCutRun.length > 1) {
                    // Multiple consecutive air-cuts - optimize with rapid
                    const startPoint = toolpath[airCutRun[0].startIndex];
                    const endPoint = toolpath[airCutRun[airCutRun.length - 1].endIndex];

                    // Calculate optimal rapid height
                    const rapidHeight = this._calculateOptimalRapidHeight(
                        startPoint, endPoint, obstacles, clearanceZ, safeZ
                    );

                    // Generate optimized rapid sequence
                    optimized.push({
                        ...startPoint,
                        comment: 'Start rapid optimization'
                    });

                    // Retract
                    optimized.push({
                        x: startPoint.x,
                        y: startPoint.y,
                        z: rapidHeight,
                        rapid: true,
                        feedrate: rapidFeed,
                        comment: 'Retract for rapid'
                    });

                    // Rapid to position above end point
                    optimized.push({
                        x: endPoint.x,
                        y: endPoint.y,
                        z: rapidHeight,
                        rapid: true,
                        feedrate: rapidFeed,
                        comment: 'Rapid to next cut'
                    });

                    // Plunge to cutting depth
                    optimized.push({
                        x: endPoint.x,
                        y: endPoint.y,
                        z: endPoint.z,
                        rapid: false,
                        feedrate: machineConfig.plungeFeed || 500,
                        comment: 'Plunge to cut'
                    });

                    // Skip to end of air-cut run
                    i = airCutRun[airCutRun.length - 1].endIndex;
                } else {
                    // Regular cutting move - keep as is
                    optimized.push(point);
                    i++;
                }
            }
            return optimized;
        },
        /**
         * Find consecutive air-cut segments starting from index
         */
        _findAirCutRun: function(segments, startIndex) {
            const run = [];

            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i];
                if (seg.startIndex >= startIndex && seg.airCut && seg.canOptimize) {
                    if (run.length === 0 || run[run.length - 1].endIndex === seg.startIndex) {
                        run.push(seg);
                    } else {
                        break;
                    }
                } else if (run.length > 0) {
                    break;
                }
            }
            return run.length > 0 ? run : null;
        },
        /**
         * Calculate optimal rapid height considering obstacles
         */
        _calculateOptimalRapidHeight: function(start, end, obstacles, clearanceZ, safeZ) {
            let requiredHeight = Math.max(start.z, end.z) + clearanceZ;

            // Check if path crosses any obstacles
            for (const obs of obstacles) {
                if (this._pathCrossesObstacle(start, end, obs)) {
                    requiredHeight = Math.max(requiredHeight, obs.maxZ + clearanceZ);
                }
            }
            // Don't exceed safe Z unless necessary
            return Math.min(requiredHeight, safeZ);
        },
        /**
         * Check if XY path crosses obstacle
         */
        _pathCrossesObstacle: function(start, end, obstacle) {
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);

            return !(maxX < obstacle.minX || minX > obstacle.maxX ||
                    maxY < obstacle.minY || minY > obstacle.maxY);
        }
    },
    // 4.3 Linking Move Optimization

    linkingMoves: {
        /**
         * Optimize linking moves between cutting passes
         * @param {Array} passes - Array of toolpath passes
         * @param {Object} params - Optimization parameters
         */
        optimize: function(passes, params) {
            const {
                linkType = 'optimal', // 'rapid', 'arc', 'smooth', 'optimal'
                arcRadius = 5,
                clearanceZ = 2,
                stockModel
            } = params;

            if (passes.length < 2) return passes;

            const optimizedPasses = [passes[0]];

            for (let i = 1; i < passes.length; i++) {
                const prevPass = passes[i - 1];
                const nextPass = passes[i];

                // Get end of previous pass and start of next pass
                const exitPoint = prevPass.points[prevPass.points.length - 1];
                const entryPoint = nextPass.points[0];

                // Generate optimal linking move
                const linkMove = this._generateLinkMove(
                    exitPoint, entryPoint, { linkType, arcRadius, clearanceZ, stockModel }
                );

                // Insert link move
                optimizedPasses.push({
                    type: 'link',
                    points: linkMove
                });

                optimizedPasses.push(nextPass);
            }
            return optimizedPasses;
        },
        /**
         * Generate single linking move between two points
         */
        _generateLinkMove: function(exit, entry, params) {
            const { linkType, arcRadius, clearanceZ, stockModel } = params;
            const linkPoints = [];

            const dx = entry.x - exit.x;
            const dy = entry.y - exit.y;
            const dz = entry.z - exit.z;
            const horizontalDist = Math.sqrt(dx * dx + dy * dy);

            // Choose link strategy based on distance and type
            if (linkType === 'rapid' || horizontalDist > arcRadius * 4) {
                // Rapid link - retract, move, plunge
                linkPoints.push({ ...exit, comment: 'Link start' });
                linkPoints.push({
                    x: exit.x,
                    y: exit.y,
                    z: Math.max(exit.z, entry.z) + clearanceZ,
                    rapid: true,
                    comment: 'Retract'
                });
                linkPoints.push({
                    x: entry.x,
                    y: entry.y,
                    z: Math.max(exit.z, entry.z) + clearanceZ,
                    rapid: true,
                    comment: 'Position'
                });
                linkPoints.push({
                    x: entry.x,
                    y: entry.y,
                    z: entry.z,
                    rapid: false,
                    comment: 'Link end'
                });
            } else if (linkType === 'arc' || linkType === 'optimal') {
                // Arc link - smooth curved connection
                linkPoints.push(...this._generateArcLink(exit, entry, arcRadius));
            } else {
                // Smooth link - helical or tangent arc
                linkPoints.push(...this._generateSmoothLink(exit, entry, clearanceZ));
            }
            return linkPoints;
        },
        /**
         * Generate arc-based linking move
         */
        _generateArcLink: function(exit, entry, arcRadius) {
            const points = [];
            const numPoints = 12;

            // Calculate arc center (perpendicular bisector)
            const midX = (exit.x + entry.x) / 2;
            const midY = (exit.y + entry.y) / 2;
            const midZ = (exit.z + entry.z) / 2;

            const dx = entry.x - exit.x;
            const dy = entry.y - exit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.001) {
                // Same XY - just straight line
                points.push({ ...exit });
                points.push({ ...entry });
                return points;
            }
            // Perpendicular direction (upward arc)
            const perpX = -dy / dist;
            const perpY = dx / dist;

            // Arc offset (make it rise above the path)
            const arcHeight = Math.min(arcRadius, dist / 4);

            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const angle = t * Math.PI; // 180° arc

                // Linear interpolation + arc offset
                const x = exit.x + t * dx + perpX * Math.sin(angle) * arcHeight;
                const y = exit.y + t * dy + perpY * Math.sin(angle) * arcHeight;
                const z = exit.z + t * (entry.z - exit.z) + Math.sin(angle) * arcHeight;

                points.push({
                    x, y, z,
                    type: 'arc_link',
                    t
                });
            }
            return points;
        },
        /**
         * Generate smooth tangent linking move
         */
        _generateSmoothLink: function(exit, entry, clearanceZ) {
            const points = [];
            const liftHeight = Math.abs(exit.z - entry.z) + clearanceZ;

            // S-curve profile
            const numPoints = 16;

            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;

                // S-curve (smoothstep)
                const s = t * t * (3 - 2 * t);

                const x = exit.x + s * (entry.x - exit.x);