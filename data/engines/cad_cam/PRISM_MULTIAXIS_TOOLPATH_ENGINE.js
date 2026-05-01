/**
 * PRISM_MULTIAXIS_TOOLPATH_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References in monolith: 58
 * Lines extracted: 660
 * Prototype methods: 0
 * Session: R2.0.2
 */

const PRISM_MULTIAXIS_TOOLPATH_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_MULTIAXIS_TOOLPATH_ENGINE',

    // 1.1 Tool Axis Control Strategies

    toolAxisControl: {
        /**
         * Calculate tool axis from surface normal with lead/lag/tilt
         * @param {Object} normal - Surface normal {x, y, z}
         * @param {Object} feedDir - Feed direction {x, y, z}
         * @param {Object} params - {leadAngle, lagAngle, tiltAngle} in radians
         * @returns {Object} Tool axis {i, j, k}
         */
        fromNormalWithAngles: function(normal, feedDir, params) {
            const { leadAngle = 0, lagAngle = 0, tiltAngle = 0 } = params || {};

            // Normalize inputs
            const n = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(normal);
            const f = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(feedDir);

            // Calculate side direction (perpendicular to feed and normal)
            const side = PRISM_MULTIAXIS_TOOLPATH_ENGINE._cross(f, n);
            const sideNorm = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(side);

            // Start with tool axis = surface normal
            let axis = { ...n };

            // Apply lead angle (rotation around side vector)
            if (Math.abs(leadAngle) > PRISM_CONSTANTS.TOLERANCE.ANGLE) {
                axis = this._rotateAroundAxis(axis, sideNorm, leadAngle);
            }
            // Apply lag angle (negative lead)
            if (Math.abs(lagAngle) > PRISM_CONSTANTS.TOLERANCE.ANGLE) {
                axis = this._rotateAroundAxis(axis, sideNorm, -lagAngle);
            }
            // Apply tilt angle (rotation around feed direction)
            if (Math.abs(tiltAngle) > PRISM_CONSTANTS.TOLERANCE.ANGLE) {
                axis = this._rotateAroundAxis(axis, f, tiltAngle);
            }
            return PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(axis);
        },
        /**
         * Rotate vector around axis using Rodrigues formula
         */
        _rotateAroundAxis: function(vec, axis, angle) {
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const k = axis;

            // v_rot = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
            const cross = PRISM_MULTIAXIS_TOOLPATH_ENGINE._cross(k, vec);
            const dot = k.x * vec.x + k.y * vec.y + k.z * vec.z;

            return {
                x: vec.x * c + cross.x * s + k.x * dot * (1 - c),
                y: vec.y * c + cross.y * s + k.y * dot * (1 - c),
                z: vec.z * c + cross.z * s + k.z * dot * (1 - c)
            };
        },
        /**
         * Interpolate tool axis between two orientations
         * Uses spherical linear interpolation (SLERP)
         */
        slerp: function(axis1, axis2, t) {
            // Normalize inputs
            const a1 = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(axis1);
            const a2 = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(axis2);

            // Calculate angle between axes
            let dot = a1.x * a2.x + a1.y * a2.y + a1.z * a2.z;

            // Handle parallel/anti-parallel cases
            if (Math.abs(dot) > 0.9999) {
                // Linear interpolation for near-parallel
                return PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize({
                    x: a1.x + t * (a2.x - a1.x),
                    y: a1.y + t * (a2.y - a1.y),
                    z: a1.z + t * (a2.z - a1.z)
                });
            }
            // Ensure shortest path
            if (dot < 0) {
                dot = -dot;
                a2.x = -a2.x;
                a2.y = -a2.y;
                a2.z = -a2.z;
            }
            const theta = Math.acos(Math.min(1, Math.max(-1, dot)));
            const sinTheta = Math.sin(theta);

            if (sinTheta < PRISM_CONSTANTS.TOLERANCE.ZERO) {
                return a1;
            }
            const s1 = Math.sin((1 - t) * theta) / sinTheta;
            const s2 = Math.sin(t * theta) / sinTheta;

            return PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize({
                x: a1.x * s1 + a2.x * s2,
                y: a1.y * s1 + a2.y * s2,
                z: a1.z * s1 + a2.z * s2
            });
        },
        /**
         * Smooth tool axis along toolpath to avoid sudden changes
         * Uses moving average with Gaussian weights
         */
        smoothToolAxis: function(toolpath, windowSize = 5) {
            if (!toolpath || toolpath.length < 3) return toolpath;

            const smoothed = [];
            const halfWindow = Math.floor(windowSize / 2);

            // Generate Gaussian weights
            const sigma = windowSize / 4;
            const weights = [];
            let weightSum = 0;

            for (let i = -halfWindow; i <= halfWindow; i++) {
                const w = Math.exp(-(i * i) / (2 * sigma * sigma));
                weights.push(w);
                weightSum += w;
            }
            // Normalize weights
            for (let i = 0; i < weights.length; i++) {
                weights[i] /= weightSum;
            }
            // Apply smoothing
            for (let i = 0; i < toolpath.length; i++) {
                const point = { ...toolpath[i] };

                if (point.axis) {
                    let avgAxis = { x: 0, y: 0, z: 0 };
                    let totalWeight = 0;

                    for (let j = -halfWindow; j <= halfWindow; j++) {
                        const idx = Math.max(0, Math.min(toolpath.length - 1, i + j));
                        const neighborAxis = toolpath[idx].axis;

                        if (neighborAxis) {
                            const w = weights[j + halfWindow];
                            avgAxis.x += neighborAxis.i * w;
                            avgAxis.y += neighborAxis.j * w;
                            avgAxis.z += neighborAxis.k * w;
                            totalWeight += w;
                        }
                    }
                    if (totalWeight > 0) {
                        avgAxis = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize({
                            x: avgAxis.x / totalWeight,
                            y: avgAxis.y / totalWeight,
                            z: avgAxis.z / totalWeight
                        });

                        point.axis = { i: avgAxis.x, j: avgAxis.y, k: avgAxis.z };
                    }
                }
                smoothed.push(point);
            }
            return smoothed;
        }
    },
    // 1.2 5-Axis Simultaneous Strategies

    strategies: {
        /**
         * Generate swarf (flank) milling toolpath for ruled surfaces
         * Tool side cuts along ruling lines
         */
        swarf: function(surface, params) {
            const {
                toolDiameter,
                toolLength,
                stepover,
                tolerance = 0.01,
                climbMilling = true
            } = params;

            const toolRadius = toolDiameter / 2;
            const passes = [];

            // Extract ruling lines from surface
            const rulings = PRISM_MULTIAXIS_TOOLPATH_ENGINE._extractRulings(surface, stepover);

            for (let i = 0; i < rulings.length; i++) {
                const ruling = rulings[i];
                const pass = [];

                // Calculate tool position along each ruling
                for (const point of ruling.points) {
                    // Tool axis aligned with ruling direction
                    const rulingDir = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize({
                        x: ruling.end.x - ruling.start.x,
                        y: ruling.end.y - ruling.start.y,
                        z: ruling.end.z - ruling.start.z
                    });

                    // Offset tool center from surface by tool radius
                    const normal = point.normal || { x: 0, y: 0, z: 1 };
                    const sideDir = PRISM_MULTIAXIS_TOOLPATH_ENGINE._cross(rulingDir, normal);
                    const sideNorm = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(sideDir);

                    const offset = climbMilling ? toolRadius : -toolRadius;

                    pass.push({
                        x: point.x + sideNorm.x * offset,
                        y: point.y + sideNorm.y * offset,
                        z: point.z + sideNorm.z * offset,
                        axis: { i: rulingDir.x, j: rulingDir.y, k: rulingDir.z },
                        type: 'swarf',
                        engagement: Math.min(point.rulingLength || toolLength, toolLength)
                    });
                }
                passes.push({
                    type: 'swarf_pass',
                    index: i,
                    points: pass
                });
            }
            return {
                type: 'swarf',
                strategy: '5axis_swarf',
                passes,
                params: { toolDiameter, toolLength, stepover, tolerance }
            };
        },
        /**
         * Generate 5-axis contour with tool axis following surface normal
         */
        surfaceNormalContour: function(surface, params) {
            const {
                toolDiameter,
                stepover,
                leadAngle = 0,
                tiltAngle = 0,
                tolerance = 0.01
            } = params;

            const toolRadius = toolDiameter / 2;
            const passes = [];

            // Get surface bounds
            const bounds = PRISM_MULTIAXIS_TOOLPATH_ENGINE._getSurfaceBounds(surface);
            const numPasses = Math.ceil((bounds.vMax - bounds.vMin) / stepover);

            for (let p = 0; p <= numPasses; p++) {
                const v = bounds.vMin + (p / numPasses) * (bounds.vMax - bounds.vMin);
                const pass = [];

                // Sample along u direction
                const numSamples = Math.ceil((bounds.uMax - bounds.uMin) * 100);

                for (let s = 0; s <= numSamples; s++) {
                    const u = bounds.uMin + (s / numSamples) * (bounds.uMax - bounds.uMin);

                    // Evaluate surface
                    const point = PRISM_MULTIAXIS_TOOLPATH_ENGINE._evaluateSurface(surface, u, v);
                    const normal = PRISM_MULTIAXIS_TOOLPATH_ENGINE._surfaceNormal(surface, u, v);

                    // Calculate feed direction (tangent along u)
                    const feedDir = PRISM_MULTIAXIS_TOOLPATH_ENGINE._surfaceTangentU(surface, u, v);

                    // Calculate tool axis with lead/tilt
                    const axis = PRISM_MULTIAXIS_TOOLPATH_ENGINE.toolAxisControl.fromNormalWithAngles(
                        normal, feedDir, { leadAngle, tiltAngle }
                    );

                    // Offset tool center
                    pass.push({
                        x: point.x + normal.x * toolRadius,
                        y: point.y + normal.y * toolRadius,
                        z: point.z + normal.z * toolRadius,
                        axis: { i: axis.x, j: axis.y, k: axis.z },
                        u, v,
                        type: '5axis_contour'
                    });
                }
                passes.push({
                    type: '5axis_contour_pass',
                    v,
                    points: pass
                });
            }
            return {
                type: '5axis_surface_normal',
                strategy: '5axis_contour',
                passes,
                params
            };
        },
        /**
         * Generate 5-axis flowline machining
         * Tool follows surface flowlines (principal curvature directions)
         */
        flowline: function(surface, params) {
            const {
                toolDiameter,
                stepover,
                direction = 'max_curvature', // 'max_curvature', 'min_curvature', 'iso_u', 'iso_v'
                leadAngle = PRISM_CONSTANTS.PHYSICS.DEG_TO_RAD * 3
            } = params;

            const toolRadius = toolDiameter / 2;
            const passes = [];

            // Get surface bounds
            const bounds = PRISM_MULTIAXIS_TOOLPATH_ENGINE._getSurfaceBounds(surface);

            // Generate seed points
            const numSeeds = Math.ceil((bounds.vMax - bounds.vMin) / stepover);

            for (let s = 0; s <= numSeeds; s++) {
                const seedV = bounds.vMin + (s / numSeeds) * (bounds.vMax - bounds.vMin);
                const seedU = bounds.uMin;

                // Trace flowline from seed
                const flowline = PRISM_MULTIAXIS_TOOLPATH_ENGINE._traceFlowline(
                    surface, seedU, seedV, direction, bounds
                );

                const pass = [];

                for (const point of flowline) {
                    const normal = PRISM_MULTIAXIS_TOOLPATH_ENGINE._surfaceNormal(surface, point.u, point.v);
                    const feedDir = point.tangent || { x: 1, y: 0, z: 0 };

                    const axis = PRISM_MULTIAXIS_TOOLPATH_ENGINE.toolAxisControl.fromNormalWithAngles(
                        normal, feedDir, { leadAngle }
                    );

                    pass.push({
                        x: point.x + normal.x * toolRadius,
                        y: point.y + normal.y * toolRadius,
                        z: point.z + normal.z * toolRadius,
                        axis: { i: axis.x, j: axis.y, k: axis.z },
                        type: 'flowline'
                    });
                }
                if (pass.length > 2) {
                    passes.push({
                        type: 'flowline_pass',
                        index: s,
                        points: pass
                    });
                }
            }
            return {
                type: '5axis_flowline',
                strategy: 'flowline',
                direction,
                passes,
                params
            };
        }
    },
    // 1.3 Gouge Detection and Avoidance

    gougeAvoidance: {
        /**
         * Check for gouging at a single point
         * @returns {Object} {gouges: boolean, depth: number, correctedAxis: Object}
         */
        checkPoint: function(position, axis, toolGeometry, surface, tolerance) {
            const { toolDiameter, cornerRadius = 0, type = 'ball' } = toolGeometry;
            const toolRadius = toolDiameter / 2;

            // Sample points on tool surface
            const checkPoints = this._getToolCheckPoints(position, axis, toolGeometry);
            let maxGougeDepth = 0;
            let gougeDetected = false;

            for (const checkPoint of checkPoints) {
                // Find closest point on surface
                const surfacePoint = PRISM_MULTIAXIS_TOOLPATH_ENGINE._closestPointOnSurface(
                    surface, checkPoint
                );

                if (surfacePoint) {
                    // Calculate signed distance (negative = inside surface = gouge)
                    const dist = PRISM_MULTIAXIS_TOOLPATH_ENGINE._signedDistance(
                        checkPoint, surfacePoint, surface
                    );

                    if (dist < -tolerance) {
                        gougeDetected = true;
                        maxGougeDepth = Math.max(maxGougeDepth, Math.abs(dist));
                    }
                }
            }
            return {
                gouges: gougeDetected,
                depth: maxGougeDepth,
                correctedAxis: gougeDetected ?
                    this._correctAxis(position, axis, toolGeometry, surface, maxGougeDepth) :
                    axis
            };
        },
        /**
         * Get check points on tool surface for gouge detection
         */
        _getToolCheckPoints: function(position, axis, toolGeometry) {
            const { toolDiameter, type = 'ball' } = toolGeometry;
            const toolRadius = toolDiameter / 2;
            const points = [];

            // Create local coordinate system
            const axisNorm = PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(axis);
            const perpX = PRISM_MULTIAXIS_TOOLPATH_ENGINE._perpendicular(axisNorm);
            const perpY = PRISM_MULTIAXIS_TOOLPATH_ENGINE._cross(axisNorm, perpX);

            if (type === 'ball') {
                // Sample hemisphere
                const numRadial = 8;
                const numAxial = 4;

                for (let i = 0; i < numRadial; i++) {
                    const angle = (i / numRadial) * Math.PI * 2;

                    for (let j = 0; j <= numAxial; j++) {
                        const phi = (j / numAxial) * Math.PI / 2;
                        const r = toolRadius * Math.sin(phi);
                        const z = toolRadius * (1 - Math.cos(phi));

                        points.push({
                            x: position.x + perpX.x * r * Math.cos(angle) + perpY.x * r * Math.sin(angle) - axisNorm.x * z,
                            y: position.y + perpX.y * r * Math.cos(angle) + perpY.y * r * Math.sin(angle) - axisNorm.y * z,
                            z: position.z + perpX.z * r * Math.cos(angle) + perpY.z * r * Math.sin(angle) - axisNorm.z * z
                        });
                    }
                }
            } else {
                // Flat end mill - check edge points
                const numPoints = 16;
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i / numPoints) * Math.PI * 2;
                    points.push({
                        x: position.x + perpX.x * toolRadius * Math.cos(angle) + perpY.x * toolRadius * Math.sin(angle),
                        y: position.y + perpX.y * toolRadius * Math.cos(angle) + perpY.y * toolRadius * Math.sin(angle),
                        z: position.z + perpX.z * toolRadius * Math.cos(angle) + perpY.z * toolRadius * Math.sin(angle)
                    });
                }
            }
            return points;
        },
        /**
         * Correct tool axis to avoid gouging
         */
        _correctAxis: function(position, axis, toolGeometry, surface, gougeDepth) {
            // Simple correction: tilt tool away from gouge
            // More sophisticated methods could use optimization

            const normal = PRISM_MULTIAXIS_TOOLPATH_ENGINE._surfaceNormalAtPoint(surface, position);
            const tiltAngle = Math.asin(Math.min(1, gougeDepth / (toolGeometry.toolDiameter / 2)));

            return PRISM_MULTIAXIS_TOOLPATH_ENGINE.toolAxisControl._rotateAroundAxis(
                PRISM_MULTIAXIS_TOOLPATH_ENGINE._normalize(axis),
                PRISM_MULTIAXIS_TOOLPATH_ENGINE._perpendicular(normal),
                tiltAngle
            );
        },
        /**
         * Check entire toolpath for gouging
         */
        checkToolpath: function(toolpath, toolGeometry, surface, tolerance = 0.01) {
            const issues = [];
            const corrected = [];

            for (let i = 0; i < toolpath.length; i++) {
                const point = toolpath[i];
                const axis = point.axis || { i: 0, j: 0, k: 1 };

                const check = this.checkPoint(
                    { x: point.x, y: point.y, z: point.z },
                    { x: axis.i, y: axis.j, z: axis.k },
                    toolGeometry,
                    surface,
                    tolerance
                );

                if (check.gouges) {
                    issues.push({
                        index: i,
                        position: { x: point.x, y: point.y, z: point.z },
                        gougeDepth: check.depth
                    });

                    corrected.push({
                        ...point,
                        axis: { i: check.correctedAxis.x, j: check.correctedAxis.y, k: check.correctedAxis.z },
                        gougeCorrected: true
                    });
                } else {
                    corrected.push(point);
                }
            }
            return {
                valid: issues.length === 0,
                issues,
                correctedToolpath: corrected
            };
        }
    },
    // 1.4 Utility Functions

    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len < PRISM_CONSTANTS.TOLERANCE.ZERO) return { x: 0, y: 0, z: 1 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    },
    _cross: function(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },
    _perpendicular: function(v) {
        // Find a vector perpendicular to v
        if (Math.abs(v.x) < 0.9) {
            return this._normalize(this._cross(v, { x: 1, y: 0, z: 0 }));
        }
        return this._normalize(this._cross(v, { x: 0, y: 1, z: 0 }));
    },
    _extractRulings: function(surface, stepover) {
        // Extract ruling lines from ruled surface
        const rulings = [];
        const numRulings = Math.ceil(1 / stepover * 10);

        for (let i = 0; i <= numRulings; i++) {
            const v = i / numRulings;
            const start = this._evaluateSurface(surface, 0, v);
            const end = this._evaluateSurface(surface, 1, v);

            const points = [];
            const numPoints = 20;

            for (let j = 0; j <= numPoints; j++) {
                const u = j / numPoints;
                const point = this._evaluateSurface(surface, u, v);
                point.normal = this._surfaceNormal(surface, u, v);
                point.rulingLength = Math.sqrt(
                    (end.x - start.x) ** 2 + (end.y - start.y) ** 2 + (end.z - start.z) ** 2
                );
                points.push(point);
            }
            rulings.push({ start, end, points, v });
        }
        return rulings;
    },
    _getSurfaceBounds: function(surface) {
        return surface.bounds || { uMin: 0, uMax: 1, vMin: 0, vMax: 1 };
    },
    _evaluateSurface: function(surface, u, v) {
        // Use gateway if available, otherwise basic evaluation
        if (typeof PRISM_GATEWAY !== 'undefined' && PRISM_GATEWAY.hasCapability('geometry.nurbs.evaluate')) {
            return PRISM_GATEWAY.call('geometry.nurbs.evaluate', surface, u, v);
        }
        // Basic plane/bilinear evaluation
        if (surface.type === 'plane') {
            return {
                x: surface.origin.x + u * (surface.uDir?.x || 100) + v * (surface.vDir?.x || 0),
                y: surface.origin.y + u * (surface.uDir?.y || 0) + v * (surface.vDir?.y || 100),
                z: surface.origin.z + u * (surface.uDir?.z || 0) + v * (surface.vDir?.z || 0)
            };
        }
        return { x: u * 100, y: v * 100, z: 0 };
    },
    _surfaceNormal: function(surface, u, v) {
        if (surface.type === 'plane') {
            return surface.normal || { x: 0, y: 0, z: 1 };
        }
        // Numerical normal
        const eps = 0.001;
        const p = this._evaluateSurface(surface, u, v);
        const pu = this._evaluateSurface(surface, Math.min(u + eps, 1), v);
        const pv = this._evaluateSurface(surface, u, Math.min(v + eps, 1));

        const du = { x: pu.x - p.x, y: pu.y - p.y, z: pu.z - p.z };
        const dv = { x: pv.x - p.x, y: pv.y - p.y, z: pv.z - p.z };

        return this._normalize(this._cross(du, dv));
    },
    _surfaceTangentU: function(surface, u, v) {
        const eps = 0.001;
        const p1 = this._evaluateSurface(surface, u, v);
        const p2 = this._evaluateSurface(surface, Math.min(u + eps, 1), v);

        return this._normalize({
            x: p2.x - p1.x,
            y: p2.y - p1.y,
            z: p2.z - p1.z
        });
    },
    _traceFlowline: function(surface, startU, startV, direction, bounds) {
        const flowline = [];
        let u = startU, v = startV;
        const stepSize = 0.01;
        const maxSteps = 1000;

        for (let i = 0; i < maxSteps; i++) {
            const point = this._evaluateSurface(surface, u, v);
            point.u = u;
            point.v = v;

            // Get direction based on curvature or iso-parameter
            let dir;
            if (direction === 'iso_u') {
                dir = this._surfaceTangentU(surface, u, v);
            } else {
                dir = this._surfaceTangentU(surface, u, v); // Simplified
            }
            point.tangent = dir;
            flowline.push(point);

            // Step along direction
            u += stepSize;

            // Check bounds
            if (u > bounds.uMax || u < bounds.uMin) break;
        }
        return flowline;
    },
    _closestPointOnSurface: function(surface, point) {
        // Simple grid search (could be improved with Newton iteration)
        let closest = null;
        let minDist = Infinity;

        const samples = 10;
        for (let i = 0; i <= samples; i++) {
            for (let j = 0; j <= samples; j++) {
                const u = i / samples;
                const v = j / samples;
                const sp = this._evaluateSurface(surface, u, v);

                const dist = Math.sqrt(
                    (sp.x - point.x) ** 2 + (sp.y - point.y) ** 2 + (sp.z - point.z) ** 2
                );

                if (dist < minDist) {
                    minDist = dist;
                    closest = { ...sp, u, v };
                }
            }
        }
        return closest;
    },
    _signedDistance: function(point, surfacePoint, surface) {
        const normal = this._surfaceNormal(surface, surfacePoint.u, surfacePoint.v);
        const vec = {
            x: point.x - surfacePoint.x,
            y: point.y - surfacePoint.y,
            z: point.z - surfacePoint.z
        };
        return vec.x * normal.x + vec.y * normal.y + vec.z * normal.z;
    },
    _surfaceNormalAtPoint: function(surface, position) {
        const closest = this._closestPointOnSurface(surface, position);
        return closest ? this._surfaceNormal(surface, closest.u, closest.v) : { x: 0, y: 0, z: 1 };
    }
}