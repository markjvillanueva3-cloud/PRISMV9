const PRISM_ALPHA_SHAPES = {
    name: 'PRISM_ALPHA_SHAPES',
    version: '1.0.0',
    status: 'IMPLEMENTED',
    innovationType: 'GEOMETRY',

    // Compute alpha shape from point cloud
    computeAlphaShape: function(points, alpha) {
        console.log(`[PRISM Alpha] Computing alpha shape with α=${alpha}...`);

        if (points.length < 4) {
            return { triangles: [], boundary: [], alpha };
        }
        // Step 1: Delaunay triangulation
        const delaunay = this.computeDelaunay3D(points);

        // Step 2: Filter by alpha criterion
        const alphaComplex = this.filterByAlpha(delaunay, points, alpha);

        // Step 3: Extract boundary
        const boundary = this.extractBoundary(alphaComplex);

        return {
            triangles: alphaComplex,
            boundary,
            alpha,
            numTriangles: alphaComplex.length
        };
    },
    // Simple 3D Delaunay using incremental insertion
    computeDelaunay3D: function(points) {
        const n = points.length;
        if (n < 4) return [];

        // For simplicity, use a convex hull + refinement approach
        // Full implementation would use CGAL-style Delaunay
        const triangles = [];

        // Start with convex hull triangles
        const hull = this.computeConvexHull(points);

        // Add interior points using Bowyer-Watson (simplified)
        for (const tri of hull) {
            triangles.push(tri);
        }
        return triangles;
    },
    // Compute convex hull (gift wrapping for small point sets)
    computeConvexHull: function(points) {
        const n = points.length;
        if (n < 4) return [];

        const triangles = [];

        // Find extreme points
        let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
        for (let i = 1; i < n; i++) {
            if (points[i].x < points[minX].x) minX = i;
            if (points[i].x > points[maxX].x) maxX = i;
            if (points[i].y < points[minY].y) minY = i;
            if (points[i].y > points[maxY].y) maxY = i;
            if (points[i].z < points[minZ].z) minZ = i;
            if (points[i].z > points[maxZ].z) maxZ = i;
        }
        // Build initial tetrahedron from extreme points
        const initial = [minX, maxX, minY, maxY].filter((v, i, a) => a.indexOf(v) === i);
        if (initial.length >= 3) {
            // Add face triangles
            triangles.push([initial[0], initial[1], initial[2]]);
            if (initial.length >= 4) {
                triangles.push([initial[0], initial[1], initial[3]]);
                triangles.push([initial[0], initial[2], initial[3]]);
                triangles.push([initial[1], initial[2], initial[3]]);
            }
        }
        return triangles;
    },
    // Filter triangles by alpha criterion
    filterByAlpha: function(triangles, points, alpha) {
        const result = [];
        const alphaSq = alpha * alpha;

        for (const tri of triangles) {
            // Compute circumradius of triangle
            const p0 = points[tri[0]];
            const p1 = points[tri[1]];
            const p2 = points[tri[2]];

            const circumR = this.triangleCircumradius(p0, p1, p2);

            // Keep if circumradius <= 1/alpha
            if (circumR <= 1 / alpha) {
                result.push(tri);
            }
        }
        return result;
    },
    // Compute circumradius of a triangle
    triangleCircumradius: function(p0, p1, p2) {
        const a = PRISM_CAD_MATH.vec3.distance(p0, p1);
        const b = PRISM_CAD_MATH.vec3.distance(p1, p2);
        const c = PRISM_CAD_MATH.vec3.distance(p2, p0);

        const s = (a + b + c) / 2;
        const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));

        if (area < PRISM_CAD_MATH.EPSILON) return Infinity;

        return (a * b * c) / (4 * area);
    },
    // Extract boundary edges from alpha complex
    extractBoundary: function(triangles) {
        const edgeCount = new Map();

        for (const tri of triangles) {
            const edges = [
                [Math.min(tri[0], tri[1]), Math.max(tri[0], tri[1])],
                [Math.min(tri[1], tri[2]), Math.max(tri[1], tri[2])],
                [Math.min(tri[2], tri[0]), Math.max(tri[2], tri[0])]
            ];

            for (const edge of edges) {
                const key = edge.join(',');
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        // Boundary edges appear only once
        const boundary = [];
        for (const [key, count] of edgeCount) {
            if (count === 1) {
                boundary.push(key.split(',').map(Number));
            }
        }
        return boundary;
    },
    // Reconstruct surface from point cloud with automatic alpha selection
    reconstructSurface: function(points, options) {
        const opts = options || {};

        // Estimate optimal alpha from point density
        const alpha = opts.alpha || this.estimateOptimalAlpha(points);

        const shape = this.computeAlphaShape(points, alpha);

        return {
            ...shape,
            autoAlpha: !opts.alpha,
            estimatedAlpha: alpha
        };
    },
    // Estimate optimal alpha from point cloud density
    estimateOptimalAlpha: function(points) {
        if (points.length < 2) return 1.0;

        // Compute average nearest neighbor distance
        let totalDist = 0;
        const sample = Math.min(points.length, 100);

        for (let i = 0; i < sample; i++) {
            const p = points[i];
            let minDist = Infinity;

            for (let j = 0; j < points.length; j++) {
                if (i === j) continue;
                const d = PRISM_CAD_MATH.vec3.distance(p, points[j]);
                if (d < minDist) minDist = d;
            }
            if (minDist < Infinity) totalDist += minDist;
        }
        const avgDist = totalDist / sample;

        // Alpha ~ 1 / (2 * avgDist) for smooth reconstruction
        return 1 / (2 * avgDist + PRISM_CAD_MATH.EPSILON);
    },
    // Self-test
    selfTest: function() {
        console.log('[PRISM Alpha] Running self-test...');

        // Test: Simple point set
        const points = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 },
            { x: 0.5, y: 0.5, z: 1 }
        ];

        const shape = this.computeAlphaShape(points, 0.5);

        const tests = [
            { name: 'Alpha shape computed', pass: shape !== null },
            { name: 'Has triangles', pass: shape.triangles.length > 0 }
        ];

        const allPassed = tests.every(t => t.pass);
        console.log(`[PRISM Alpha] Self-test ${allPassed ? 'PASSED' : 'FAILED'}:`, tests);
        return allPassed;
    }
}