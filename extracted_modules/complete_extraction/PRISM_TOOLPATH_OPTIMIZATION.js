const PRISM_TOOLPATH_OPTIMIZATION = {
    version: "1.0",

    // Arc fitting - replace linear segments with arcs
    arcFitting: {
        tolerances: {
            tight: 0.005,    // 5 microns - high precision
            standard: 0.01,  // 10 microns - general machining
            rough: 0.05      // 50 microns - roughing operations
        },
        // Fit arc to points
        fitArc: function(points, tolerance) {
            if (points.length < 3) return null;

            // Find circle through 3 points
            const p1 = points[0];
            const p2 = points[Math.floor(points.length / 2)];
            const p3 = points[points.length - 1];

            const center = this.findCircleCenter(p1, p2, p3);
            if (!center) return null;

            const radius = Math.sqrt(Math.pow(p1.x - center.x, 2) + Math.pow(p1.y - center.y, 2));

            // Check all points are within tolerance
            let maxDeviation = 0;
            for (const p of points) {
                const dist = Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2));
                maxDeviation = Math.max(maxDeviation, Math.abs(dist - radius));
            }
            if (maxDeviation <= tolerance) {
                return {
                    type: 'arc',
                    center,
                    radius,
                    startPoint: p1,
                    endPoint: p3,
                    deviation: maxDeviation,
                    pointsReplaced: points.length
                };
            }
            return null;
        },
        // Find center of circle through 3 points
        findCircleCenter: function(p1, p2, p3) {
            const ax = p1.x, ay = p1.y;
            const bx = p2.x, by = p2.y;
            const cx = p3.x, cy = p3.y;

            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
            if (Math.abs(d) < 1e-10) return null; // Collinear points

            const ux = ((ax*ax + ay*ay) * (by - cy) + (bx*bx + by*by) * (cy - ay) + (cx*cx + cy*cy) * (ay - by)) / d;
            const uy = ((ax*ax + ay*ay) * (cx - bx) + (bx*bx + by*by) * (ax - cx) + (cx*cx + cy*cy) * (bx - ax)) / d;

            return { x: ux, y: uy };
        },
        // Process toolpath and fit arcs
        processToolpath: function(toolpath, tolerance) {
            const optimized = [];
            let i = 0;

            while (i < toolpath.length) {
                // Try to fit arc starting at current point
                let bestArc = null;
                let bestLength = 3;

                for (let len = 3; len <= Math.min(50, toolpath.length - i); len++) {
                    const segment = toolpath.slice(i, i + len);
                    const arc = this.fitArc(segment, tolerance);

                    if (arc) {
                        bestArc = arc;
                        bestLength = len;
                    } else if (bestArc) {
                        break; // Can't extend further
                    }
                }
                if (bestArc) {
                    optimized.push(bestArc);
                    i += bestLength - 1;
                } else {
                    optimized.push({ type: 'linear', point: toolpath[i] });
                    i++;
                }
            }
            return {
                original: toolpath.length,
                optimized: optimized.length,
                reduction: ((toolpath.length - optimized.length) / toolpath.length * 100).toFixed(1) + '%',
                segments: optimized
            };
        }
    },
    // Point reduction - Douglas-Peucker algorithm
    pointReduction: {
        // Reduce points while maintaining tolerance
        reduce: function(points, tolerance) {
            if (points.length <= 2) return points;

            // Find point with maximum distance from line
            let maxDist = 0;
            let maxIndex = 0;

            const start = points[0];
            const end = points[points.length - 1];

            for (let i = 1; i < points.length - 1; i++) {
                const dist = this.perpendicularDistance(points[i], start, end);
                if (dist > maxDist) {
                    maxDist = dist;
                    maxIndex = i;
                }
            }
            // If max distance > tolerance, recursively simplify
            if (maxDist > tolerance) {
                const left = this.reduce(points.slice(0, maxIndex + 1), tolerance);
                const right = this.reduce(points.slice(maxIndex), tolerance);
                return left.slice(0, -1).concat(right);
            }
            // Otherwise, return just start and end
            return [start, end];
        },
        perpendicularDistance: function(point, lineStart, lineEnd) {
            const dx = lineEnd.x - lineStart.x;
            const dy = lineEnd.y - lineStart.y;
            const dz = (lineEnd.z || 0) - (lineStart.z || 0);

            const lineLengthSq = dx*dx + dy*dy + dz*dz;
            if (lineLengthSq === 0) {
                return Math.sqrt(
                    Math.pow(point.x - lineStart.x, 2) +
                    Math.pow(point.y - lineStart.y, 2) +
                    Math.pow((point.z || 0) - (lineStart.z || 0), 2)
                );
            }
            const t = Math.max(0, Math.min(1,
                ((point.x - lineStart.x) * dx +
                 (point.y - lineStart.y) * dy +
                 ((point.z || 0) - (lineStart.z || 0)) * dz) / lineLengthSq
            ));

            const projX = lineStart.x + t * dx;
            const projY = lineStart.y + t * dy;
            const projZ = (lineStart.z || 0) + t * dz;

            return Math.sqrt(
                Math.pow(point.x - projX, 2) +
                Math.pow(point.y - projY, 2) +
                Math.pow((point.z || 0) - projZ, 2)
            );
        }
    },
    // Smoothing - reduce jerk in toolpath
    smoothing: {
        // Apply moving average smoothing
        movingAverage: function(points, windowSize) {
            const smoothed = [];
            const half = Math.floor(windowSize / 2);

            for (let i = 0; i < points.length; i++) {
                let sumX = 0, sumY = 0, sumZ = 0, count = 0;

                for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
                    sumX += points[j].x;
                    sumY += points[j].y;
                    sumZ += points[j].z || 0;
                    count++;
                }
                smoothed.push({
                    x: sumX / count,
                    y: sumY / count,
                    z: sumZ / count
                });
            }
            return smoothed;
        },
        // Corner rounding
        roundCorners: function(points, radius, tolerance) {
            // Add fillet arcs at sharp corners
            const result = [];

            for (let i = 0; i < points.length; i++) {
                if (i === 0 || i === points.length - 1) {
                    result.push(points[i]);
                    continue;
                }
                // Calculate angle at this point
                const v1 = {
                    x: points[i].x - points[i-1].x,
                    y: points[i].y - points[i-1].y
                };
                const v2 = {
                    x: points[i+1].x - points[i].x,
                    y: points[i+1].y - points[i].y
                };
                const angle = Math.atan2(v1.x * v2.y - v1.y * v2.x, v1.x * v2.x + v1.y * v2.y);

                if (Math.abs(angle) > tolerance) {
                    // Sharp corner - add rounding
                    result.push({
                        type: 'corner',
                        point: points[i],
                        radius: radius,
                        angle: angle
                    });
                } else {
                    result.push(points[i]);
                }
            }
            return result;
        }
    }
}