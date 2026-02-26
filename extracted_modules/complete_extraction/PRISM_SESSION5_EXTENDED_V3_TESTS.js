const PRISM_SESSION5_EXTENDED_V3_TESTS = {
    name: 'PRISM_SESSION5_EXTENDED_V3_TESTS',
    
    runAll: function() {
        console.log('═══════════════════════════════════════════════════');
        console.log('PRISM Session 5 Extended v3 Tests');
        console.log('═══════════════════════════════════════════════════');
        
        const tests = [
            this.testBoundaryDetection,
            this.testHoleFilling,
            this.testMeshRepair,
            this.testGeodesicDijkstra,
            this.testGeodesicPath,
            this.testSDFCompute,
            this.testIsotropicRemesh,
            this.testSurfaceOffset,
            this.testSymmetryDetection,
            this.testSilhouetteExtraction
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                test.call(this);
                passed++;
            } catch (e) {
                console.error(`FAILED: ${test.name}:`, e.message);
                failed++;
            }
        }
        
        console.log('═══════════════════════════════════════════════════');
        console.log(`Results: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════');
        
        return { passed, failed };
    },
    
    testBoundaryDetection: function() {
        // Simple quad with hole (missing one face)
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2]]; // Missing face [0, 2, 3]
        
        const loops = PRISM_MESH_REPAIR_ENGINE.findBoundaryLoops(vertices, faces);
        
        if (loops.length !== 1) {
            throw new Error(`Expected 1 boundary loop, got ${loops.length}`);
        }
        console.log('✓ testBoundaryDetection passed');
    },
    
    testHoleFilling: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 1, z: 0 }
        ];
        const boundaryLoop = [0, 1, 2, 3];
        
        const triangles = PRISM_MESH_REPAIR_ENGINE.fillHoleMinArea(vertices, boundaryLoop);
        
        if (triangles.length !== 2) {
            throw new Error(`Expected 2 triangles to fill quad hole, got ${triangles.length}`);
        }
        console.log('✓ testHoleFilling passed');
    },
    
    testMeshRepair: function() {
        // Mesh with duplicate vertices and degenerate face
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 },
            { x: 0, y: 0, z: 0 }, // Duplicate of 0
            { x: 0, y: 0, z: 0 }  // Another duplicate
        ];
        const faces = [
            [0, 1, 2],
            [3, 4, 4] // Degenerate
        ];
        
        const result = PRISM_MESH_REPAIR_ENGINE.repairMesh(vertices, faces);
        
        if (result.vertices.length > 3) {
            throw new Error(`Should have merged duplicates, got ${result.vertices.length} vertices`);
        }
        console.log('✓ testMeshRepair passed');
    },
    
    testGeodesicDijkstra: function() {
        // Simple triangle strip
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 },
            { x: 1.5, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2], [1, 3, 2]];
        
        const distances = PRISM_GEODESIC_DISTANCE.dijkstra(vertices, faces, 0);
        
        if (distances[0] !== 0) {
            throw new Error('Distance to source should be 0');
        }
        if (distances[1] <= 0) {
            throw new Error('Distance to vertex 1 should be positive');
        }
        console.log('✓ testGeodesicDijkstra passed');
    },
    
    testGeodesicPath: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 },
            { x: 1.5, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 3], [1, 2, 4], [1, 4, 3]];
        
        const result = PRISM_GEODESIC_DISTANCE.findPath(vertices, faces, 0, 2);
        
        if (!result.found) {
            throw new Error('Should have found path');
        }
        if (result.path[0] !== 0 || result.path[result.path.length - 1] !== 2) {
            throw new Error('Path should start at 0 and end at 2');
        }
        console.log('✓ testGeodesicPath passed');
    },
    
    testSDFCompute: function() {
        // Simple box-like mesh (cube faces)
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
            { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 }
        ];
        const faces = [
            [0, 1, 2], [0, 2, 3], // Front
            [4, 6, 5], [4, 7, 6], // Back
            [0, 4, 5], [0, 5, 1], // Bottom
            [2, 6, 7], [2, 7, 3], // Top
            [0, 3, 7], [0, 7, 4], // Left
            [1, 5, 6], [1, 6, 2]  // Right
        ];
        
        const sdf = PRISM_SHAPE_DIAMETER_FUNCTION.computeSDF(vertices, faces, { numRays: 10 });
        
        if (sdf.length !== vertices.length) {
            throw new Error(`SDF length ${sdf.length} should match vertex count ${vertices.length}`);
        }
        console.log('✓ testSDFCompute passed');
    },
    
    testIsotropicRemesh: function() {
        // Simple triangle
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 },
            { x: 1, y: 2, z: 0 }
        ];
        const faces = [[0, 1, 2]];
        
        const result = PRISM_ISOTROPIC_REMESHING.remesh(vertices, faces, 0.5, 2);
        
        if (result.vertices.length <= 3) {
            throw new Error('Remeshing should have added vertices for small target edge length');
        }
        console.log('✓ testIsotropicRemesh passed');
    },
    
    testSurfaceOffset: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2]];
        
        const offset = PRISM_OFFSET_SURFACE.offsetSimple(vertices, faces, 0.1);
        
        if (offset.vertices.length !== 3) {
            throw new Error('Offset should preserve vertex count');
        }
        // Check that z changed (normal is along z for flat triangle)
        if (Math.abs(offset.vertices[0].z - 0.1) > 0.01) {
            throw new Error('Offset distance should be applied');
        }
        console.log('✓ testSurfaceOffset passed');
    },
    
    testSymmetryDetection: function() {
        // Symmetric box
        const vertices = [
            { x: -1, y: -1, z: 0 }, { x: 1, y: -1, z: 0 },
            { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2], [0, 2, 3]];
        
        const symmetries = PRISM_SYMMETRY_DETECTION.detectReflectiveSymmetry(vertices, faces, {
            tolerance: 0.1,
            minSupport: 0.9
        });
        
        if (symmetries.length === 0) {
            throw new Error('Should detect symmetry in symmetric quad');
        }
        console.log('✓ testSymmetryDetection passed');
    },
    
    testSilhouetteExtraction: function() {
        // Simple quad - all edges are boundary (silhouette)
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2], [0, 2, 3]];
        const viewDir = { x: 0, y: 0, z: -1 };
        
        const edges = PRISM_SILHOUETTE_ENGINE.extractSilhouette(vertices, faces, viewDir);
        
        // Should have boundary edges as silhouette
        if (edges.length !== 4) {
            throw new Error(`Expected 4 silhouette edges (boundary), got ${edges.length}`);
        }
        console.log('✓ testSilhouetteExtraction passed');
    }
}