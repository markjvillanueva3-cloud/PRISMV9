const PRISM_SESSION5_TESTS = {
    runAll: function() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(' PRISM SESSION 5 CAD/GEOMETRY TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0, failed = 0;
        
        // Test 1: Knot Insertion
        try {
            const result = PRISM_NURBS_ENHANCED.insertKnot({
                degree: 2,
                controlPoints: [{x:0,y:0,z:0}, {x:1,y:2,z:0}, {x:3,y:2,z:0}, {x:4,y:0,z:0}],
                knots: [0,0,0,0.5,1,1,1],
                newKnot: 0.25
            });
            if (result.success && result.controlPoints.length === 5) {
                console.log(`  ✓ Knot Insertion (${result.controlPoints.length} control points)`);
                passed++;
            } else {
                console.log('  ✗ Knot Insertion');
                failed++;
            }
        } catch (e) { console.log('  ✗ Knot Insertion:', e.message); failed++; }
        
        // Test 2: Curve Fitting
        try {
            const dataPoints = [];
            for (let i = 0; i <= 10; i++) {
                const t = i / 10;
                dataPoints.push({ x: t * 4, y: Math.sin(t * Math.PI) * 2, z: 0 });
            }
            const result = PRISM_NURBS_ENHANCED.fitCurve({ dataPoints, degree: 3 });
            if (result.controlPoints.length > 0 && result.maxError < 0.5) {
                console.log(`  ✓ Curve Fitting (error=${result.maxError.toFixed(4)})`);
                passed++;
            } else {
                console.log('  ✗ Curve Fitting');
                failed++;
            }
        } catch (e) { console.log('  ✗ Curve Fitting:', e.message); failed++; }
        
        // Test 3: Delaunay Triangulation
        try {
            const points = [
                {x:0,y:0}, {x:1,y:0}, {x:2,y:0},
                {x:0,y:1}, {x:1,y:1}, {x:2,y:1},
                {x:0,y:2}, {x:1,y:2}, {x:2,y:2}
            ];
            const result = PRISM_COMPUTATIONAL_GEOMETRY.bowyerWatsonDelaunay(points);
            if (result.triangles.length > 0 && result.edges.length > 0) {
                console.log(`  ✓ Delaunay Triangulation (${result.triangles.length} triangles)`);
                passed++;
            } else {
                console.log('  ✗ Delaunay');
                failed++;
            }
        } catch (e) { console.log('  ✗ Delaunay:', e.message); failed++; }
        
        // Test 4: Quickhull
        try {
            const points = [
                {x:0,y:0}, {x:1,y:1}, {x:2,y:0}, {x:1,y:3}, {x:0.5,y:0.5}, {x:1.5,y:1}
            ];
            const hull = PRISM_COMPUTATIONAL_GEOMETRY.quickhull(points);
            if (hull.length >= 3 && hull.length <= points.length) {
                console.log(`  ✓ Quickhull Convex Hull (${hull.length} vertices)`);
                passed++;
            } else {
                console.log('  ✗ Quickhull');
                failed++;
            }
        } catch (e) { console.log('  ✗ Quickhull:', e.message); failed++; }
        
        // Test 5: Point-in-Polygon
        try {
            const polygon = [{x:0,y:0}, {x:4,y:0}, {x:4,y:4}, {x:0,y:4}];
            const inside = PRISM_COMPUTATIONAL_GEOMETRY.pointInPolygon({x:2,y:2}, polygon);
            const outside = PRISM_COMPUTATIONAL_GEOMETRY.pointInPolygon({x:5,y:5}, polygon);
            if (inside && !outside) {
                console.log(`  ✓ Point-in-Polygon (inside=${inside}, outside=${outside})`);
                passed++;
            } else {
                console.log('  ✗ Point-in-Polygon');
                failed++;
            }
        } catch (e) { console.log('  ✗ Point-in-Polygon:', e.message); failed++; }
        
        // Test 6: Loop Subdivision
        try {
            const mesh = {
                vertices: [{x:0,y:0,z:0}, {x:1,y:0,z:0}, {x:0.5,y:1,z:0}, {x:0.5,y:0.5,z:1}],
                faces: [[0,1,2], [0,1,3], [1,2,3], [2,0,3]]
            };
            const result = PRISM_MESH_OPERATIONS.loopSubdivision(mesh);
            if (result.vertices.length > mesh.vertices.length && result.faces.length > mesh.faces.length) {
                console.log(`  ✓ Loop Subdivision (${result.vertices.length} vertices, ${result.faces.length} faces)`);
                passed++;
            } else {
                console.log('  ✗ Loop Subdivision');
                failed++;
            }
        } catch (e) { console.log('  ✗ Loop Subdivision:', e.message); failed++; }
        
        // Test 7: Laplacian Smoothing
        try {
            const mesh = {
                vertices: [{x:0,y:0,z:0}, {x:1,y:0.1,z:0}, {x:2,y:0,z:0}, {x:1,y:1,z:0}],
                faces: [[0,1,3], [1,2,3]]
            };
            const result = PRISM_MESH_OPERATIONS.laplacianSmoothing(mesh, 3, 0.5);
            if (result.vertices.length === mesh.vertices.length) {
                console.log(`  ✓ Laplacian Smoothing (${result.vertices.length} vertices)`);
                passed++;
            } else {
                console.log('  ✗ Laplacian Smoothing');
                failed++;
            }
        } catch (e) { console.log('  ✗ Laplacian Smoothing:', e.message); failed++; }
        
        // Test 8: CSG Union
        try {
            const meshA = {
                vertices: [{x:0,y:0,z:0}, {x:1,y:0,z:0}, {x:0.5,y:1,z:0}, {x:0.5,y:0.5,z:1}],
                faces: [[0,1,2], [0,1,3], [1,2,3], [2,0,3]]
            };
            const meshB = {
                vertices: [{x:0.5,y:0,z:0}, {x:1.5,y:0,z:0}, {x:1,y:1,z:0}, {x:1,y:0.5,z:1}],
                faces: [[0,1,2], [0,1,3], [1,2,3], [2,0,3]]
            };
            const result = PRISM_CSG_OPERATIONS.union(meshA, meshB);
            if (result.vertices.length > 0 && result.faces.length > 0) {
                console.log(`  ✓ CSG Union (${result.vertices.length} vertices, ${result.faces.length} faces)`);
                passed++;
            } else {
                console.log('  ✗ CSG Union');
                failed++;
            }
        } catch (e) { console.log('  ✗ CSG Union:', e.message); failed++; }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(` SESSION 5 TESTS: ${passed}/${passed + failed} passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}