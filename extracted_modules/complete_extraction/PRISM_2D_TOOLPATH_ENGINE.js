const PRISM_2D_TOOLPATH_ENGINE = {

    version: '1.0.0',
    authority: 'PRISM_2D_TOOLPATH_ENGINE',
    created: '2026-01-14',

    // CONFIGURATION

    config: {
        // Default machining parameters
        DEFAULT_STEPOVER_PERCENT: 50,      // % of tool diameter
        DEFAULT_STEPDOWN: 2,               // mm
        DEFAULT_FEEDRATE: 1000,            // mm/min
        DEFAULT_PLUNGE_RATE: 300,          // mm/min
        DEFAULT_CLEARANCE: 5,              // mm above stock
        DEFAULT_RETRACT: 2,                // mm above surface

        // HSM/Adaptive parameters
        HSM_MAX_ENGAGEMENT: 90,            // degrees
        HSM_MIN_STEPOVER: 10,              // % minimum
        TROCHOIDAL_DIAMETER_RATIO: 0.8,    // ratio of tool diameter

        // Accuracy
        ARC_TOLERANCE: 0.01,               // mm for arc approximation
        SIMPLIFY_TOLERANCE: 0.001,         // mm for path simplification

        // Safety
        MIN_TOOL_DIAMETER: 0.1,            // mm
        MAX_DEPTH_RATIO: 3                 // max depth / tool diameter
    },
    // SECTION 1: POCKET STRATEGIES

    pocket: {
        /**
         * Generate pocket toolpath using specified strategy
         * @param {Object} params - Pocket parameters
         * @returns {Object} Toolpath data
         */
        generate: function(params) {
            const {
                boundary,          // Outer boundary polygon
                islands = [],      // Island polygons (holes in pocket)
                tool,              // Tool definition
                strategy = 'offset', // offset, spiral, zigzag, hsm, medial
                depth,             // Total depth
                stepdown,          // Depth per pass
                stepoverPercent,   // Stepover %
                feedrate,
                plungeRate,
                startPoint         // Optional start position
            } = params;

            // Validate inputs
            if (!boundary || boundary.length < 3) {
                return { success: false, error: 'Invalid boundary' };
            }
            const toolRadius = (tool?.diameter || 10) / 2;
            const stepover = (stepoverPercent || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_STEPOVER_PERCENT) / 100 * tool.diameter;
            const actualStepdown = stepdown || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_STEPDOWN;

            // Select strategy
            let paths2D;
            switch (strategy.toLowerCase()) {
                case 'offset':
                case 'spiral':
                    paths2D = this._offsetStrategy(boundary, islands, toolRadius, stepover);
                    break;
                case 'zigzag':
                case 'parallel':
                    paths2D = this._zigzagStrategy(boundary, islands, toolRadius, stepover, params.angle || 0);
                    break;
                case 'hsm':
                case 'trochoidal':
                case 'adaptive':
                    paths2D = this._hsmStrategy(boundary, islands, toolRadius, stepover, tool.diameter);
                    break;
                case 'medial':
                case 'skeleton':
                    paths2D = this._medialStrategy(boundary, islands, toolRadius);
                    break;
                default:
                    paths2D = this._offsetStrategy(boundary, islands, toolRadius, stepover);
            }
            if (!paths2D || paths2D.length === 0) {
                return { success: false, error: 'No valid toolpath generated' };
            }
            // Generate 3D toolpath with depth passes
            const toolpath = this._generate3DToolpath(paths2D, {
                depth,
                stepdown: actualStepdown,
                feedrate: feedrate || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_FEEDRATE,
                plungeRate: plungeRate || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_PLUNGE_RATE,
                clearance: params.clearance || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_CLEARANCE,
                retract: params.retract || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_RETRACT
            });

            return {
                success: true,
                strategy: strategy,
                toolpath: toolpath,
                statistics: {
                    pathCount: paths2D.length,
                    depthPasses: Math.ceil(depth / actualStepdown),
                    totalPoints: toolpath.length,
                    estimatedLength: this._calculatePathLength(toolpath)
                }
            };
        },
        /**
         * Offset/Spiral pocket strategy
         */
        _offsetStrategy: function(boundary, islands, toolRadius, stepover) {
            // Use Clipper2 for offset operations
            if (typeof PRISM_CLIPPER2_ENGINE !== 'undefined') {
                return PRISM_CLIPPER2_ENGINE.offset.generatePocketOffsets(
                    boundary, islands, toolRadius, stepover
                );
            }
            // Fallback: simple offset implementation
            const paths = [];
            let currentBoundary = boundary;
            let offset = toolRadius;

            while (true) {
                const offsetPath = this._simpleOffset(currentBoundary, -offset);
                if (!offsetPath || offsetPath.length < 3) break;

                // Check if area is too small
                const area = this._polygonArea(offsetPath);
                if (area < stepover * stepover) break;

                paths.push(offsetPath);
                currentBoundary = offsetPath;
                offset = stepover;

                // Safety limit
                if (paths.length > 500) break;
            }
            return paths;
        },
        /**
         * Zigzag/Parallel pocket strategy
         */
        _zigzagStrategy: function(boundary, islands, toolRadius, stepover, angle) {
            const paths = [];

            // First offset boundary by tool radius
            const offsetBoundary = this._simpleOffset(boundary, -toolRadius);
            if (!offsetBoundary || offsetBoundary.length < 3) return [];

            // Get bounds
            const bounds = this._getBounds(offsetBoundary);

            // Rotate coordinate system
            const cosA = Math.cos(-angle);
            const sinA = Math.sin(-angle);

            const rotated = offsetBoundary.map(p => ({
                x: p.x * cosA - p.y * sinA,
                y: p.x * sinA + p.y * cosA
            }));

            const rotBounds = this._getBounds(rotated);

            // Generate scan lines
            let direction = 1;
            for (let y = rotBounds.minY; y <= rotBounds.maxY; y += stepover) {
                const intersections = this._findScanlineIntersections(rotated, y);

                // Sort intersections
                intersections.sort((a, b) => a - b);

                // Create line segments
                for (let i = 0; i < intersections.length - 1; i += 2) {
                    const x1 = intersections[i];
                    const x2 = intersections[i + 1];

                    if (x2 - x1 > toolRadius) {
                        const line = direction > 0
                            ? [{ x: x1, y }, { x: x2, y }]
                            : [{ x: x2, y }, { x: x1, y }];
                        paths.push(line);
                    }
                }
                direction *= -1;
            }
            // Rotate back
            const cosB = Math.cos(angle);
            const sinB = Math.sin(angle);

            return paths.map(path =>
                path.map(p => ({
                    x: p.x * cosB - p.y * sinB,
                    y: p.x * sinB + p.y * cosB
                }))
            );
        },
        /**
         * HSM/Trochoidal pocket strategy
         */
        _hsmStrategy: function(boundary, islands, toolRadius, stepover, toolDiameter) {
            const paths = [];
            const config = PRISM_2D_TOOLPATH_ENGINE.config;

            // Get medial axis for optimal path
            let medialPaths = [];
            if (typeof PRISM_VORONOI_ENGINE !== 'undefined') {
                const medial = PRISM_VORONOI_ENGINE.computeMedialAxis(boundary);
                medialPaths = medial.branches || [];
            }
            // Generate trochoidal motions along medial axis or zigzag
            const trochoidRadius = toolDiameter * config.TROCHOIDAL_DIAMETER_RATIO / 2;
            const trochoidStepover = stepover * 0.7; // Smaller stepover for HSM

            if (medialPaths.length > 0) {
                // Follow medial axis with trochoidal motion
                for (const branch of medialPaths) {
                    const trochoid = this._generateTrochoidalPath(
                        branch.startPoint,
                        branch.endPoint,
                        trochoidRadius,
                        trochoidStepover
                    );
                    paths.push(trochoid);
                }
            } else {
                // Fallback to trochoidal zigzag
                const zigzagPaths = this._zigzagStrategy(boundary, islands, toolRadius, stepover * 2, 0);

                for (const line of zigzagPaths) {
                    if (line.length >= 2) {
                        const trochoid = this._generateTrochoidalPath(
                            line[0],
                            line[line.length - 1],
                            trochoidRadius,
                            trochoidStepover
                        );
                        paths.push(trochoid);
                    }
                }
            }
            return paths;
        },
        /**
         * Medial axis pocket strategy
         */
        _medialStrategy: function(boundary, islands, toolRadius) {
            if (typeof PRISM_VORONOI_ENGINE === 'undefined') {
                console.warn('[2D_TOOLPATH] PRISM_VORONOI_ENGINE not available, falling back to offset');
                return this._offsetStrategy(boundary, islands, toolRadius, toolRadius);
            }
            const result = PRISM_VORONOI_ENGINE.generateMedialAxisToolpath(boundary, toolRadius);

            // Convert to path format
            if (result.points && result.points.length > 0) {
                return [result.points.map(p => ({ x: p.x, y: p.y }))];
            }
            return [];
        },
        /**
         * Generate trochoidal path between two points
         */
        _generateTrochoidalPath: function(start, end, radius, stepover) {
            const path = [];

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length < 0.001) return [start];

            const nx = dx / length;
            const ny = dy / length;
            const px = -ny; // Perpendicular
            const py = nx;

            const numCycles = Math.ceil(length / stepover);
            const stepsPerCycle = 16;

            for (let cycle = 0; cycle <= numCycles; cycle++) {
                const baseT = cycle / numCycles;
                const baseX = start.x + baseT * dx;
                const baseY = start.y + baseT * dy;

                for (let step = 0; step < stepsPerCycle; step++) {
                    const angle = (step / stepsPerCycle) * Math.PI * 2;
                    const trochoidX = baseX + Math.cos(angle) * radius * px + Math.sin(angle) * radius * nx * 0.3;
                    const trochoidY = baseY + Math.cos(angle) * radius * py + Math.sin(angle) * radius * ny * 0.3;

                    path.push({ x: trochoidX, y: trochoidY });
                }
            }
            return path;
        },
        /**
         * Simple polygon offset (fallback when Clipper2 not available)
         */
        _simpleOffset: function(polygon, distance) {
            const result = [];
            const n = polygon.length;

            for (let i = 0; i < n; i++) {
                const prev = polygon[(i - 1 + n) % n];
                const curr = polygon[i];
                const next = polygon[(i + 1) % n];

                // Edge normals
                const e1 = { x: curr.x - prev.x, y: curr.y - prev.y };
                const e2 = { x: next.x - curr.x, y: next.y - curr.y };

                const len1 = Math.sqrt(e1.x * e1.x + e1.y * e1.y);
                const len2 = Math.sqrt(e2.x * e2.x + e2.y * e2.y);

                if (len1 < 0.0001 || len2 < 0.0001) continue;

                const n1 = { x: -e1.y / len1, y: e1.x / len1 };
                const n2 = { x: -e2.y / len2, y: e2.x / len2 };

                // Bisector
                const bisector = {
                    x: n1.x + n2.x,
                    y: n1.y + n2.y
                };
                const bisLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);

                if (bisLen > 0.0001) {
                    const dot = n1.x * n2.x + n1.y * n2.y;
                    const scale = distance / Math.sqrt((1 + dot) / 2);

                    result.push({
                        x: curr.x + bisector.x / bisLen * scale,
                        y: curr.y + bisector.y / bisLen * scale
                    });
                }
            }
            return result.length >= 3 ? result : null;
        },
        /**
         * Find scanline intersections with polygon
         */
        _findScanlineIntersections: function(polygon, y) {
            const intersections = [];
            const n = polygon.length;

            for (let i = 0; i < n; i++) {
                const p1 = polygon[i];
                const p2 = polygon[(i + 1) % n];

                if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                    const t = (y - p1.y) / (p2.y - p1.y);
                    const x = p1.x + t * (p2.x - p1.x);
                    intersections.push(x);
                }
            }
            return intersections;
        },
        /**
         * Calculate polygon area
         */
        _polygonArea: function(polygon) {
            let area = 0;
            const n = polygon.length;

            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                area += polygon[i].x * polygon[j].y;
                area -= polygon[j].x * polygon[i].y;
            }
            return Math.abs(area) / 2;
        },
        /**
         * Get bounding box
         */
        _getBounds: function(polygon) {
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            for (const p of polygon) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            return { minX, minY, maxX, maxY };
        }
    },
    // SECTION 2: CONTOUR STRATEGIES

    contour: {
        /**
         * Generate contour/profile toolpath
         */
        generate: function(params) {
            const {
                profile,           // Profile geometry
                tool,
                side = 'outside',  // outside, inside, on
                depth,
                stepdown,
                passes = 1,        // Number of finishing passes
                stockAllowance = 0,
                feedrate,
                leadIn = 'arc',    // arc, line, none
                leadOut = 'arc'
            } = params;

            if (!profile || profile.length < 2) {
                return { success: false, error: 'Invalid profile' };
            }
            const toolRadius = (tool?.diameter || 10) / 2;

            // Calculate offset based on side
            let offset;
            switch (side.toLowerCase()) {
                case 'outside':
                    offset = toolRadius + stockAllowance;
                    break;
                case 'inside':
                    offset = -(toolRadius + stockAllowance);
                    break;
                case 'on':
                default:
                    offset = stockAllowance;
            }
            // Generate offset paths for multiple passes
            const paths2D = [];

            for (let pass = 0; pass < passes; pass++) {
                const passOffset = offset + (passes > 1 ? (pass / passes) * toolRadius * 0.5 : 0);

                if (typeof PRISM_CLIPPER2_ENGINE !== 'undefined') {
                    const offsetPaths = PRISM_CLIPPER2_ENGINE.offset.offsetPath(profile, passOffset, 'round');
                    paths2D.push(...offsetPaths);
                } else {
                    const offsetPath = this._simpleContourOffset(profile, passOffset);
                    if (offsetPath) paths2D.push(offsetPath);
                }
            }
            // Add lead-in/lead-out
            const pathsWithLeads = paths2D.map(path =>
                this._addLeadInOut(path, toolRadius, leadIn, leadOut)
            );

            // Generate 3D toolpath
            const toolpath = PRISM_2D_TOOLPATH_ENGINE._generate3DToolpath(pathsWithLeads, {
                depth: depth || 5,
                stepdown: stepdown || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_STEPDOWN,
                feedrate: feedrate || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_FEEDRATE,
                plungeRate: params.plungeRate || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_PLUNGE_RATE,
                clearance: params.clearance || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_CLEARANCE,
                retract: params.retract || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_RETRACT
            });

            return {
                success: true,
                side: side,
                toolpath: toolpath,
                statistics: {
                    passes: passes,
                    offset: offset,
                    totalPoints: toolpath.length
                }
            };
        },
        /**
         * Simple contour offset
         */
        _simpleContourOffset: function(profile, offset) {
            return PRISM_2D_TOOLPATH_ENGINE.pocket._simpleOffset(profile, offset);
        },
        /**
         * Add lead-in and lead-out moves
         */
        _addLeadInOut: function(path, radius, leadInType, leadOutType) {
            if (path.length < 2) return path;

            const result = [];

            // Lead-in
            if (leadInType === 'arc') {
                const leadIn = this._generateArcLeadIn(path[0], path[1], radius);
                result.push(...leadIn);
            } else if (leadInType === 'line') {
                const leadIn = this._generateLineLeadIn(path[0], path[1], radius);
                result.push(...leadIn);
            }
            // Main path
            result.push(...path);

            // Lead-out
            if (leadOutType === 'arc') {
                const leadOut = this._generateArcLeadOut(path[path.length - 2], path[path.length - 1], radius);
                result.push(...leadOut);
            } else if (leadOutType === 'line') {
                const leadOut = this._generateLineLeadOut(path[path.length - 2], path[path.length - 1], radius);
                result.push(...leadOut);
            }
            return result;
        },
        /**
         * Generate arc lead-in
         */
        _generateArcLeadIn: function(start, next, radius) {
            const dx = next.x - start.x;
            const dy = next.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len < 0.001) return [];

            const perpX = -dy / len;
            const perpY = dx / len;

            const arcPoints = [];
            const segments = 8;

            for (let i = 0; i <= segments; i++) {
                const angle = Math.PI * (1 - i / segments);
                const x = start.x + perpX * radius * Math.cos(angle) - dx / len * radius * (1 - Math.sin(angle));
                const y = start.y + perpY * radius * Math.cos(angle) - dy / len * radius * (1 - Math.sin(angle));
                arcPoints.push({ x, y });
            }
            return arcPoints;
        },
        _generateArcLeadOut: function(prev, end, radius) {
            const dx = end.x - prev.x;
            const dy = end.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len < 0.001) return [];

            const perpX = -dy / len;
            const perpY = dx / len;

            const arcPoints = [];
            const segments = 8;

            for (let i = 0; i <= segments; i++) {
                const angle = Math.PI * i / segments;
                const x = end.x + perpX * radius * Math.cos(angle) + dx / len * radius * Math.sin(angle);
                const y = end.y + perpY * radius * Math.cos(angle) + dy / len * radius * Math.sin(angle);
                arcPoints.push({ x, y });
            }
            return arcPoints;
        },
        _generateLineLeadIn: function(start, next, radius) {
            const dx = next.x - start.x;
            const dy = next.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len < 0.001) return [];

            return [{
                x: start.x - dx / len * radius,
                y: start.y - dy / len * radius
            }];
        },
        _generateLineLeadOut: function(prev, end, radius) {
            const dx = end.x - prev.x;
            const dy = end.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len < 0.001) return [];

            return [{
                x: end.x + dx / len * radius,
                y: end.y + dy / len * radius
            }];
        }
    },
    // SECTION 3: FACING STRATEGIES

    facing: {
        /**
         * Generate facing toolpath
         */
        generate: function(params) {
            const {
                boundary,
                tool,
                strategy = 'zigzag',  // zigzag, spiral
                depth,
                stepdown,
                stepoverPercent,
                feedrate,
                angle = 0
            } = params;

            const toolRadius = (tool?.diameter || 50) / 2;
            const stepover = (stepoverPercent || 70) / 100 * tool.diameter;

            let paths2D;
            if (strategy === 'spiral') {
                paths2D = PRISM_2D_TOOLPATH_ENGINE.pocket._offsetStrategy(boundary, [], toolRadius, stepover);
            } else {
                paths2D = PRISM_2D_TOOLPATH_ENGINE.pocket._zigzagStrategy(boundary, [], toolRadius, stepover, angle);
            }
            const toolpath = PRISM_2D_TOOLPATH_ENGINE._generate3DToolpath(paths2D, {
                depth: depth || 1,
                stepdown: stepdown || depth || 1,
                feedrate: feedrate || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_FEEDRATE * 1.5,
                plungeRate: params.plungeRate || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_PLUNGE_RATE,
                clearance: params.clearance || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_CLEARANCE,
                retract: params.retract || 1
            });

            return {
                success: true,
                strategy: strategy,
                toolpath: toolpath,
                statistics: {
                    pathCount: paths2D.length,
                    totalPoints: toolpath.length
                }
            };
        }
    },
    // SECTION 4: DRILLING STRATEGIES

    drilling: {
        /**
         * Generate drilling toolpath with ACO optimization
         */
        generate: function(params) {
            const {
                holes,              // Array of {x, y, diameter, depth}
                tool,
                cycleType = 'drill', // drill, peck, bore, tap
                peckDepth,
                dwellTime = 0,
                feedrate,
                retractMode = 'rapid' // rapid, feed
            } = params;

            if (!holes || holes.length === 0) {
                return { success: false, error: 'No holes specified' };
            }
            // Optimize hole sequence using ACO if available
            let optimizedSequence;
            if (typeof PRISM_ACO_SEQUENCER !== 'undefined' && holes.length > 2) {
                const result = PRISM_ACO_SEQUENCER.optimizeHoleSequence(holes, {
                    iterations: Math.min(50, holes.length * 2)
                });
                optimizedSequence = result.sequence;
            } else {
                // Use original order
                optimizedSequence = holes.map((_, i) => i);
            }
            // Generate toolpath
            const toolpath = [];
            const clearance = params.clearance || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_CLEARANCE;
            const retract = params.retract || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_RETRACT;
            const drillFeedrate = feedrate || PRISM_2D_TOOLPATH_ENGINE.config.DEFAULT_PLUNGE_RATE;

            for (const idx of optimizedSequence) {
                const hole = holes[idx];
                const holeDepth = hole.depth || 10;

                // Rapid to position above hole
                toolpath.push({
                    x: hole.x,
                    y: hole.y,
                    z: clearance,
                    type: 'rapid'
                });

                // Rapid to retract height
                toolpath.push({
                    x: hole.x,
                    y: hole.y,
                    z: retract,
                    type: 'rapid'
                });

                if (cycleType === 'peck' && peckDepth) {
                    // Peck drilling cycle
                    let currentDepth = 0;
                    while (currentDepth < holeDepth) {
                        currentDepth = Math.min(currentDepth + peckDepth, holeDepth);

                        // Drill to current depth
                        toolpath.push({
                            x: hole.x,
                            y: hole.y,
                            z: -currentDepth,
                            type: 'feed',
                            feedrate: drillFeedrate
                        });

                        // Retract to clear chips
                        toolpath.push({
                            x: hole.x,
                            y: hole.y,
                            z: retract,
                            type: retractMode
                        });
                    }
                } else {
                    // Standard drilling
                    toolpath.push({
                        x: hole.x,
                        y: hole.y,
                        z: -holeDepth,
                        type: 'feed',
                        feedrate: drillFeedrate
                    });

                    // Dwell if specified
                    if (dwellTime > 0) {
                        toolpath.push({
                            x: hole.x,
                            y: hole.y,
                            z: -holeDepth,
                            type: 'dwell',
                            dwell: dwellTime
                        });
                    }
                    // Retract
                    toolpath.push({
                        x: hole.x,
                        y: hole.y,
                        z: retract,
                        type: retractMode
                    });
                }
            }
            // Final retract to clearance
            if (toolpath.length > 0) {
                const lastPoint = toolpath[toolpath.length - 1];
                toolpath.push({
                    x: lastPoint.x,
                    y: lastPoint.y,
                    z: clearance,
                    type: 'rapid'
                });
            }
            return {
                success: true,
                cycleType: cycleType,
                toolpath: toolpath,
                statistics: {
                    holeCount: holes.length,
                    optimized: typeof PRISM_ACO_SEQUENCER !== 'undefined',
                    sequence: optimizedSequence,
                    totalPoints: toolpath.length
                }
            };
        }
    },
    // SECTION 5: UTILITY FUNCTIONS

    /**
     * Generate 3D toolpath from 2D paths with depth passes
     */
    _generate3DToolpath: function(paths2D, params) {
        const {
            depth,
            stepdown,
            feedrate,
            plungeRate,
            clearance,
            retract
        } = params;

        const toolpath = [];
        const numPasses = Math.ceil(depth / stepdown);

        for (let pass = 0; pass < numPasses; pass++) {
            const z = -Math.min((pass + 1) * stepdown, depth);

            for (const path of paths2D) {
                if (!path || path.length < 2) continue;

                // Rapid to start position
                toolpath.push({
                    x: path[0].x,
                    y: path[0].y,
                    z: clearance,
                    type: 'rapid'
                });

                // Rapid down to retract height
                toolpath.push({
                    x: path[0].x,
                    y: path[0].y,
                    z: retract,
                    type: 'rapid'
                });

                // Plunge to depth
                toolpath.push({
                    x: path[0].x,
                    y: path[0].y,
                    z: z,
                    type: 'feed',
                    feedrate: plungeRate
                });

                // Follow path at depth
                for (let i = 1; i < path.length; i++) {
                    toolpath.push({
                        x: path[i].x,
                        y: path[i].y,
                        z: z,
                        type: 'feed',
                        feedrate: feedrate
                    });
                }
                // Retract
                toolpath.push({
                    x: path[path.length - 1].x,
                    y: path[path.length - 1].y,
                    z: clearance,
                    type: 'rapid'
                });
            }
        }
        return toolpath;
    },
    /**
     * Calculate total path length
     */
    _calculatePathLength: function(toolpath) {
        let length = 0;

        for (let i = 1; i < toolpath.length; i++) {
            const dx = toolpath[i].x - toolpath[i - 1].x;
            const dy = toolpath[i].y - toolpath[i - 1].y;
            const dz = toolpath[i].z - toolpath[i - 1].z;
            length += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return length;
    },
    // SECTION 6: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_2D_TOOLPATH] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Pocket generation (offset)
        try {
            const boundary = [
                { x: 0, y: 0 }, { x: 50, y: 0 },
                { x: 50, y: 50 }, { x: 0, y: 50 }
            ];

            const result = this.pocket.generate({
                boundary,
                tool: { diameter: 10 },
                strategy: 'offset',
                depth: 5,
                stepdown: 2,
                stepoverPercent: 50
            });

            const pass = result.success && result.toolpath.length > 0;

            results.tests.push({
                name: 'Pocket offset generation',
                pass,
                pointCount: result.toolpath?.length || 0
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Pocket offset', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Pocket zigzag
        try {
            const boundary = [
                { x: 0, y: 0 }, { x: 40, y: 0 },
                { x: 40, y: 30 }, { x: 0, y: 30 }
            ];

            const result = this.pocket.generate({
                boundary,
                tool: { diameter: 8 },
                strategy: 'zigzag',
                depth: 3,
                stepdown: 1.5
            });

            const pass = result.success;

            results.tests.push({
                name: 'Pocket zigzag generation',
                pass,
                pathCount: result.statistics?.pathCount || 0
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Pocket zigzag', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Contour generation
        try {
            const profile = [
                { x: 0, y: 0 }, { x: 30, y: 0 },
                { x: 30, y: 20 }, { x: 0, y: 20 }
            ];

            const result = this.contour.generate({
                profile,
                tool: { diameter: 6 },
                side: 'outside',
                depth: 5
            });

            const pass = result.success;

            results.tests.push({
                name: 'Contour generation',
                pass,
                side: result.side
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Contour', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Drilling with optimization
        try {
            const holes = [
                { x: 0, y: 0, depth: 10 },
                { x: 20, y: 0, depth: 10 },
                { x: 10, y: 15, depth: 10 },
                { x: 30, y: 10, depth: 10 }
            ];

            const result = this.drilling.generate({
                holes,
                tool: { diameter: 5 },
                cycleType: 'drill'
            });

            const pass = result.success && result.statistics.holeCount === 4;

            results.tests.push({
                name: 'Drilling with optimization',
                pass,
                optimized: result.statistics?.optimized,
                holeCount: result.statistics?.holeCount
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Drilling', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Facing
        try {
            const boundary = [
                { x: 0, y: 0 }, { x: 100, y: 0 },
                { x: 100, y: 80 }, { x: 0, y: 80 }
            ];

            const result = this.facing.generate({
                boundary,
                tool: { diameter: 50 },
                depth: 1,
                stepoverPercent: 70
            });

            const pass = result.success;

            results.tests.push({
                name: 'Facing generation',
                pass,
                pathCount: result.statistics?.pathCount || 0
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Facing', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_2D_TOOLPATH] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
}