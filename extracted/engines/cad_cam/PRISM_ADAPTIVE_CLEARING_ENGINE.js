/**
 * PRISM_ADAPTIVE_CLEARING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 26
 * Lines: 430
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_ADAPTIVE_CLEARING_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_ADAPTIVE_CLEARING_ENGINE',

    // 3.1 Engagement Angle Calculator

    engagement: {
        /**
         * Calculate radial engagement angle at toolpath point
         * @param {Object} toolPosition - {x, y}
         * @param {Object} feedDirection - Feed direction vector
         * @param {Array} stockBoundary - 2D boundary points
         * @param {number} toolRadius - Tool radius
         * @returns {Object} {angle: radians, ae: radial DOC}
         */
        calculate: function(toolPosition, feedDirection, stockBoundary, toolRadius) {
            // Normalize feed direction
            const feedLen = Math.sqrt(feedDirection.x ** 2 + feedDirection.y ** 2);
            if (feedLen < 1e-10) return { angle: 0, ae: 0 };

            const feedNorm = { x: feedDirection.x / feedLen, y: feedDirection.y / feedLen };

            // Side direction (perpendicular to feed, pointing right)
            const sideDir = { x: feedNorm.y, y: -feedNorm.x };

            // Find intersection of tool circle with stock boundary
            let maxEngagement = 0;
            let entryAngle = 0;
            let exitAngle = Math.PI; // Default to full slot

            // Sample angles around tool
            const numSamples = 36;
            let inStock = false;
            let entryFound = false;

            for (let i = 0; i <= numSamples; i++) {
                // Angle from -90° (right side) to +270° (back around)
                const angle = (i / numSamples) * Math.PI * 2 - Math.PI / 2;

                const checkX = toolPosition.x + toolRadius * Math.cos(angle);
                const checkY = toolPosition.y + toolRadius * Math.sin(angle);

                const isInStock = this._pointInPolygon({ x: checkX, y: checkY }, stockBoundary);

                if (isInStock && !inStock) {
                    // Entry into stock
                    entryAngle = angle;
                    entryFound = true;
                } else if (!isInStock && inStock) {
                    // Exit from stock
                    exitAngle = angle;
                    if (entryFound) {
                        const engagement = exitAngle - entryAngle;
                        if (engagement > maxEngagement) {
                            maxEngagement = engagement;
                        }
                    }
                }
                inStock = isInStock;
            }
            // Calculate radial depth of cut from engagement
            const ae = toolRadius * (1 - Math.cos(maxEngagement / 2));

            return {
                angle: maxEngagement,
                ae,
                entryAngle,
                exitAngle,
                percentEngagement: maxEngagement / Math.PI * 100
            };
        },
        /**
         * Point in polygon test (ray casting)
         */
        _pointInPolygon: function(point, polygon) {
            if (!polygon || polygon.length < 3) return false;

            let inside = false;
            const n = polygon.length;

            for (let i = 0, j = n - 1; i < n; j = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[j].x, yj = polygon[j].y;

                if (((yi > point.y) !== (yj > point.y)) &&
                    (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            return inside;
        },
        /**
         * Calculate chip thickness from engagement
         */
        chipThickness: function(feedPerTooth, engagementAngle, toolDiameter) {
            // Average chip thickness considering arc of cut
            // hm = fz * sin(arc/2) for center-cutting
            const arcAngle = engagementAngle;
            return feedPerTooth * Math.sin(arcAngle / 2);
        }
    },
    // 3.2 Trochoidal Toolpath Generator

    trochoidal: {
        /**
         * Generate trochoidal (peel mill) toolpath
         * @param {Array} centerline - Base path to follow
         * @param {Object} params - {trochoidRadius, stepForward, toolRadius, maxEngagement}
         */
        generate: function(centerline, params) {
            const {
                trochoidRadius,
                stepForward,
                toolRadius,
                maxEngagement = Math.PI * 0.5, // 90° max engagement
                direction = 'climb' // 'climb' or 'conventional'
            } = params;

            if (!centerline || centerline.length < 2) return [];

            const toolpath = [];
            const arcDirection = direction === 'climb' ? 1 : -1;

            // Process each segment of centerline
            for (let seg = 0; seg < centerline.length - 1; seg++) {
                const p1 = centerline[seg];
                const p2 = centerline[seg + 1];

                // Segment direction
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segLength = Math.sqrt(dx * dx + dy * dy);

                if (segLength < 1e-6) continue;

                const dirX = dx / segLength;
                const dirY = dy / segLength;

                // Perpendicular direction
                const perpX = -dirY * arcDirection;
                const perpY = dirX * arcDirection;

                // Generate trochoidal loops along segment
                const numLoops = Math.ceil(segLength / stepForward);

                for (let loop = 0; loop <= numLoops; loop++) {
                    const t = loop / numLoops;
                    const baseX = p1.x + dx * t;
                    const baseY = p1.y + dy * t;
                    const baseZ = p1.z + (p2.z - p1.z) * t;

                    // Generate arc (trochoidal loop)
                    const arcSteps = 24;
                    const startAngle = -Math.PI / 2; // Start from side
                    const endAngle = Math.PI * 1.5;  // Full loop plus overlap

                    for (let a = 0; a <= arcSteps; a++) {
                        const arcT = a / arcSteps;
                        const angle = startAngle + arcT * (endAngle - startAngle);

                        // Trochoidal motion: arc + forward movement
                        const forwardProgress = arcT * stepForward / numLoops;

                        const x = baseX + dirX * forwardProgress +
                                 perpX * trochoidRadius * Math.cos(angle) +
                                 dirX * trochoidRadius * Math.sin(angle);
                        const y = baseY + dirY * forwardProgress +
                                 perpY * trochoidRadius * Math.cos(angle) +
                                 dirY * trochoidRadius * Math.sin(angle);

                        toolpath.push({
                            x,
                            y,
                            z: baseZ,
                            type: 'trochoidal',
                            loopIndex: loop,
                            arcProgress: arcT
                        });
                    }
                }
            }
            return toolpath;
        },
        /**
         * Calculate optimal trochoidal parameters
         */
        optimizeParameters: function(slotWidth, toolDiameter, targetEngagement = Math.PI * 0.4) {
            const toolRadius = toolDiameter / 2;

            // Trochoidal radius should leave target engagement
            // ae = R - sqrt(R² - (r_troch)²) where ae = R * (1 - cos(θ/2))
            const ae = toolRadius * (1 - Math.cos(targetEngagement / 2));
            const trochoidRadius = Math.min(
                slotWidth / 2 - toolRadius,
                Math.sqrt(2 * toolRadius * ae - ae * ae)
            );

            // Step forward based on chip thinning
            const stepForward = trochoidRadius * 0.5;

            return {
                trochoidRadius: Math.max(toolRadius * 0.2, trochoidRadius),
                stepForward,
                estimatedEngagement: targetEngagement,
                estimatedAe: ae
            };
        }
    },
    // 3.3 Adaptive Pocket Clearing

    pocket: {
        /**
         * Generate adaptive pocket clearing with constant engagement
         * Uses medial axis and Voronoi diagram concepts
         */
        generate: function(boundary, islands, params) {
            const {
                toolDiameter,
                targetEngagement = Math.PI * 0.4, // ~72° default
                maxEngagement = Math.PI * 0.6,    // ~108° max
                stepDown,
                startZ,
                endZ
            } = params;

            const toolRadius = toolDiameter / 2;
            const allPasses = [];

            // Generate medial axis of pocket
            const medialAxis = this._computeMedialAxis(boundary, islands, toolRadius);

            // Generate toolpath along medial axis with controlled engagement
            for (let z = startZ; z >= endZ; z -= stepDown) {
                const levelPasses = this._generateLevelToolpath(
                    medialAxis,
                    boundary,
                    islands,
                    {
                        toolRadius,
                        targetEngagement,
                        maxEngagement,
                        z
                    }
                );

                allPasses.push({
                    z,
                    passes: levelPasses
                });
            }
            return {
                type: 'adaptive_pocket',
                passes: allPasses,
                params
            };
        },
        /**
         * Compute medial axis (skeleton) of pocket
         * Simplified version - production would use proper Voronoi
         */
        _computeMedialAxis: function(boundary, islands, toolRadius) {
            // Find centroid
            let cx = 0, cy = 0;
            for (const p of boundary) {
                cx += p.x;
                cy += p.y;
            }
            cx /= boundary.length;
            cy /= boundary.length;

            // Generate skeleton by offsetting from edges toward center
            const skeleton = [];
            const n = boundary.length;

            for (let i = 0; i < n; i++) {
                const p1 = boundary[i];
                const p2 = boundary[(i + 1) % n];

                // Edge midpoint
                const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

                // Points from edge toward centroid
                const branch = [];
                const numPoints = 10;

                for (let j = 0; j <= numPoints; j++) {
                    const t = j / numPoints;
                    branch.push({
                        x: mid.x + t * (cx - mid.x),
                        y: mid.y + t * (cy - mid.y),
                        // Distance to nearest boundary (approximation)
                        clearance: t * Math.sqrt((cx - mid.x) ** 2 + (cy - mid.y) ** 2)
                    });
                }
                skeleton.push(branch);
            }
            return {
                branches: skeleton,
                centroid: { x: cx, y: cy }
            };
        },
        /**
         * Generate toolpath for one Z level with engagement control
         */
        _generateLevelToolpath: function(medialAxis, boundary, islands, params) {
            const { toolRadius, targetEngagement, maxEngagement, z } = params;
            const passes = [];

            // Start from branches, spiral toward center
            for (const branch of medialAxis.branches) {
                const branchPath = [];

                for (const point of branch) {
                    // Only include if tool fits (clearance > tool radius)
                    if (point.clearance > toolRadius) {
                        // Calculate local engagement
                        const engagement = PRISM_ADAPTIVE_CLEARING_ENGINE.engagement.calculate(
                            point,
                            { x: medialAxis.centroid.x - point.x, y: medialAxis.centroid.y - point.y },
                            boundary,
                            toolRadius
                        );

                        // Adjust path if engagement too high
                        let adjustedPoint = { ...point, z };

                        if (engagement.angle > maxEngagement) {
                            // Move away from material to reduce engagement
                            const pullback = toolRadius * 0.2;
                            const toCenter = {
                                x: medialAxis.centroid.x - point.x,
                                y: medialAxis.centroid.y - point.y
                            };
                            const len = Math.sqrt(toCenter.x ** 2 + toCenter.y ** 2);

                            adjustedPoint.x = point.x + pullback * toCenter.x / len;
                            adjustedPoint.y = point.y + pullback * toCenter.y / len;
                        }
                        adjustedPoint.engagement = engagement.angle;
                        adjustedPoint.ae = engagement.ae;
                        branchPath.push(adjustedPoint);
                    }
                }
                if (branchPath.length > 1) {
                    passes.push({
                        type: 'adaptive_branch',
                        points: branchPath
                    });
                }
            }
            return passes;
        },
        /**
         * Calculate feedrate based on engagement
         */
        calculateFeedrate: function(baseFeedrate, actualEngagement, targetEngagement) {
            // Reduce feedrate when engagement increases to maintain chip load
            if (actualEngagement <= targetEngagement) {
                return baseFeedrate;
            }
            // Scale feedrate inversely with engagement ratio
            const ratio = targetEngagement / actualEngagement;
            return baseFeedrate * Math.sqrt(ratio); // Sqrt for chip load
        }
    },
    // 3.4 Slot Milling (High Efficiency)

    slot: {
        /**
         * Generate high-efficiency slot milling toolpath
         * Uses plunge milling or trochoidal depending on slot width
         */
        generate: function(slotPath, slotWidth, params) {
            const { toolDiameter, stepDown, startZ, endZ, strategy = 'auto' } = params;
            const toolRadius = toolDiameter / 2;

            // Determine strategy based on slot width to tool ratio
            const widthRatio = slotWidth / toolDiameter;
            let selectedStrategy = strategy;

            if (strategy === 'auto') {
                if (widthRatio < 1.1) {
                    selectedStrategy = 'plunge'; // Slot narrower than tool
                } else if (widthRatio < 1.5) {
                    selectedStrategy = 'trochoidal'; // Narrow slot
                } else {
                    selectedStrategy = 'adaptive'; // Wide enough for adaptive
                }
            }
            console.log(`[ADAPTIVE] Slot strategy: ${selectedStrategy} (width ratio: ${widthRatio.toFixed(2)})`);

            if (selectedStrategy === 'trochoidal') {
                const trochParams = PRISM_ADAPTIVE_CLEARING_ENGINE.trochoidal.optimizeParameters(
                    slotWidth, toolDiameter
                );

                const passes = [];
                for (let z = startZ; z >= endZ; z -= stepDown) {
                    const levelPath = slotPath.map(p => ({ ...p, z }));
                    const trochPath = PRISM_ADAPTIVE_CLEARING_ENGINE.trochoidal.generate(
                        levelPath,
                        { ...trochParams, toolRadius }
                    );

                    passes.push({
                        z,
                        type: 'trochoidal_slot',
                        points: trochPath
                    });
                }
                return { type: 'trochoidal_slot', passes, params: trochParams };
            }
            // Fallback to basic slot milling
            return this._basicSlotMilling(slotPath, slotWidth, params);
        },
        _basicSlotMilling: function(slotPath, slotWidth, params) {
            const { stepDown, startZ, endZ } = params;
            const passes = [];

            for (let z = startZ; z >= endZ; z -= stepDown) {
                passes.push({
                    z,
                    type: 'slot',
                    points: slotPath.map(p => ({ ...p, z }))
                });
            }
            return { type: 'basic_slot', passes };
        }
    }
}