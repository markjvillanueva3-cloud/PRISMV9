const PRISM_SESSION5_ENHANCED_TESTS = {
    name: 'Session 5 Enhanced CAD/Geometry Tests',
    
    runAll: function() {
        const results = { passed: 0, failed: 0, tests: [] };
        
        const tests = [
            this.testLoopSubdivision,
            this.testCatmullClark,
            this.testLaplacianSmooth,
            this.testTaubinSmooth,
            this.testBilateralSmooth,
            this.testNormalEstimation,
            this.testMarchingCubes,
            this.testTutteEmbedding
        ];
        
        for (const test of tests) {
            try {
                const result = test.call(this);
                if (result.passed) {
                    results.passed++;
                } else {
                    results.failed++;
                }
                results.tests.push(result);
            } catch (error) {
                results.failed++;
                results.tests.push({
                    name: test.name,
                    passed: false,
                    error: error.message
                });
            }
        }
        
        console.log(`[Session 5 Enhanced] ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    },
    
    testLoopSubdivision: function() {
        // Tetrahedron
        const vertices = [
            { x: 0, y: 0, z: 1 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: -1, y: -1, z: 0 }
        ];
        const faces = [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]];
        
        const result = PRISM_SUBDIVISION_SURFACES.loopSubdivide(vertices, faces, 1);
        
        return {
            name: 'Loop Subdivision',
            passed: result.vertices.length > vertices.length && result.faces.length > faces.length,
            details: `Vertices: ${vertices.length} -> ${result.vertices.length}, Faces: ${faces.length} -> ${result.faces.length}`
        };
    },
    
    testCatmullClark: function() {
        // Cube (quads)
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
            { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 }
        ];
        const faces = [
            [0, 1, 2, 3], [4, 7, 6, 5],
            [0, 4, 5, 1], [2, 6, 7, 3],
            [0, 3, 7, 4], [1, 5, 6, 2]
        ];
        
        const result = PRISM_SUBDIVISION_SURFACES.catmullClarkSubdivide(vertices, faces, 1);
        
        return {
            name: 'Catmull-Clark Subdivision',
            passed: result.vertices.length > vertices.length,
            details: `Vertices: ${vertices.length} -> ${result.vertices.length}`
        };
    },
    
    testLaplacianSmooth: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0.1, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.2 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2]];
        
        const smoothed = PRISM_MESH_SMOOTHING.laplacianSmooth(vertices, faces, 0.5, 3);
        
        // Check that center vertex moved
        const moved = Math.abs(smoothed[3].z - vertices[3].z) > 0.001;
        
        return {
            name: 'Laplacian Smoothing',
            passed: moved,
            details: `Center z: ${vertices[3].z.toFixed(4)} -> ${smoothed[3].z.toFixed(4)}`
        };
    },
    
    testTaubinSmooth: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.5 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2]];
        
        const smoothed = PRISM_MESH_SMOOTHING.taubinSmooth(vertices, faces, 0.5, -0.53, 5);
        
        return {
            name: 'Taubin Smoothing',
            passed: Array.isArray(smoothed) && smoothed.length === vertices.length,
            details: `Processed ${smoothed.length} vertices`
        };
    },
    
    testBilateralSmooth: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.3 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2]];
        
        const smoothed = PRISM_MESH_SMOOTHING.bilateralSmooth(vertices, faces, 1.0, 0.3, 2);
        
        return {
            name: 'Bilateral Smoothing',
            passed: Array.isArray(smoothed),
            details: `Processed ${smoothed.length} vertices`
        };
    },
    
    testNormalEstimation: function() {
        const points = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
            { x: 0.5, y: 0.5, z: 0.1 }
        ];
        
        const normals = PRISM_POINT_CLOUD_PROCESSING.estimateNormals(points, 4);
        
        return {
            name: 'Point Cloud Normal Estimation',
            passed: normals.length === points.length,
            details: `Estimated ${normals.length} normals`
        };
    },
    
    testMarchingCubes: function() {
        // Create a simple sphere implicit function
        const sphereFunc = (x, y, z) => x * x + y * y + z * z - 1;
        const bounds = { min: { x: -1.5, y: -1.5, z: -1.5 }, max: { x: 1.5, y: 1.5, z: 1.5 } };
        
        const grid = PRISM_ISOSURFACE_ENGINE.createImplicitGrid(sphereFunc, bounds, 10);
        const mesh = PRISM_ISOSURFACE_ENGINE.marchingCubes(grid, 0);
        
        return {
            name: 'Marching Cubes',
            passed: mesh.vertices.length > 0 && mesh.faces.length > 0,
            details: `Vertices: ${mesh.vertices.length}, Faces: ${mesh.faces.length}`
        };
    },
    
    testTutteEmbedding: function() {
        // Simple triangle mesh
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.5 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2], [0, 2, 1]];
        
        const uvCoords = PRISM_MESH_PARAMETERIZATION.tutteEmbedding(vertices, faces);
        
        const valid = uvCoords.every(uv => 
            uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1
        );
        
        return {
            name: 'Tutte Embedding',
            passed: valid,
            details: `Generated ${uvCoords.length} UV coordinates`
        };
    }
}