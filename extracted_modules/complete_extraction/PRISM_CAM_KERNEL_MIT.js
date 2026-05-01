const PRISM_CAM_KERNEL_MIT = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOOLPATH ALGORITHMS (from 2.008, 2.007)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Offset Curve Generation (for cutter compensation)
     * Source: MIT 2.158J, 2.008
     */
    offsetCurve2D: function(points, offset, closed = false) {
        const n = points.length;
        if (n < 2) return points;
        
        const normals = [];
        const offsetPoints = [];
        
        // Calculate segment normals
        for (let i = 0; i < n - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            normals.push({ x: -dy / len, y: dx / len });
        }
        
        // Handle closed curves
        if (closed) {
            const dx = points[0].x - points[n - 1].x;
            const dy = points[0].y - points[n - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            normals.push({ x: -dy / len, y: dx / len });
        }
        
        // Generate offset points
        for (let i = 0; i < n; i++) {
            let normal;
            
            if (i === 0 && !closed) {
                normal = normals[0];
            } else if (i === n - 1 && !closed) {
                normal = normals[n - 2];
            } else {
                // Average normals at vertex
                const prev = closed ? (i - 1 + n) % n : i - 1;
                const curr = closed ? i : Math.min(i, n - 2);
                normal = this._normalizeVector({
                    x: (normals[prev]?.x || normals[curr].x) + normals[curr].x,
                    y: (normals[prev]?.y || normals[curr].y) + normals[curr].y
                });
            }
            
            offsetPoints.push({
                x: points[i].x + normal.x * offset,
                y: points[i].y + normal.y * offset
            });
        }
        
        return offsetPoints;
    },
    
    _normalizeVector: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        return len > 0 ? { x: v.x / len, y: v.y / len } : v;
    },
    
    /**
     * Zigzag Pocket Toolpath
     * Source: MIT 2.008
     */
    zigzagPocket: function(boundary, stepover, angle = 0) {
        // Get bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of boundary) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        
        const toolpath = [];
        const cos_a = Math.cos(angle);
        const sin_a = Math.sin(angle);
        
        // Generate scan lines
        const diagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
        const numLines = Math.ceil(diagonal / stepover);
        
        for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2) * stepover;
            
            // Line perpendicular to angle
            const lineStart = {
                x: minX + cos_a * offset - sin_a * diagonal,
                y: minY + sin_a * offset + cos_a * diagonal
            };
            const lineEnd = {
                x: minX + cos_a * offset + sin_a * diagonal,
                y: minY + sin_a * offset - cos_a * diagonal
            };
            
            // Find intersections with boundary
            const intersections = this._linePolygonIntersections(lineStart, lineEnd, boundary);
            
            // Sort and pair intersections
            intersections.sort((a, b) => {
                const da = (a.x - lineStart.x) ** 2 + (a.y - lineStart.y) ** 2;
                const db = (b.x - lineStart.x) ** 2 + (b.y - lineStart.y) ** 2;
                return da - db;
            });
            
            // Zigzag pattern
            for (let j = 0; j < intersections.length - 1; j += 2) {
                if (i % 2 === 0) {
                    toolpath.push(intersections[j], intersections[j + 1]);
                } else {
                    toolpath.push(intersections[j + 1], intersections[j]);
                }
            }
        }
        
        return toolpath;
    },
    
    _linePolygonIntersections: function(start, end, polygon) {
        const intersections = [];
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];
            
            const int = this._lineLineIntersection(start, end, p1, p2);
            if (int) intersections.push(int);
        }
        
        return intersections;
    },
    
    _lineLineIntersection: function(p1, p2, p3, p4) {
        const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (Math.abs(d) < 1e-10) return null;
        
        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
        
        if (u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        }
        
        return null;
    },
    
    /**
     * Scallop Height Calculator
     * Source: MIT 2.008
     */
    calculateScallopHeight: function(toolRadius, stepover) {
        // h = R - sqrt(R² - (s/2)²)
        const R = toolRadius;
        const s = stepover;
        return R - Math.sqrt(R * R - (s / 2) * (s / 2));
    },
    
    /**
     * Stepover from target scallop height
     */
    stepoverFromScallop: function(toolRadius, targetScallop) {
        // s = 2 * sqrt(2*R*h - h²)
        const R = toolRadius;
        const h = targetScallop;
        return 2 * Math.sqrt(2 * R * h - h * h);
    }
}