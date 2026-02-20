const PRISM_PASS2_TESTS = {
    runAll: function() {
        console.log('\n=== PRISM Enhanced Kernel Pass 2 - Self Tests ===\n');
        let passed = 0, failed = 0;
        
        // Test 1: B-spline basis function
        try {
            const knots = [0, 0, 0, 0.5, 1, 1, 1];
            const N = PRISM_CAD_KERNEL_PASS2.basisFunction(0, 2, 0.25, knots);
            if (N > 0 && N <= 1) { passed++; console.log('✓ B-spline basis function'); }
            else { failed++; console.log('✗ B-spline basis function'); }
        } catch(e) { failed++; console.log('✗ B-spline basis function:', e.message); }
        
        // Test 2: B-spline curve evaluation
        try {
            const cp = [{x:0,y:0,z:0}, {x:1,y:2,z:0}, {x:3,y:2,z:0}, {x:4,y:0,z:0}];
            const knots = [0, 0, 0, 0, 1, 1, 1, 1];
            const pt = PRISM_CAD_KERNEL_PASS2.evaluateBSplineCurve(0.5, 3, cp, knots);
            if (pt.x > 0 && pt.y > 0) { passed++; console.log('✓ B-spline curve evaluation'); }
            else { failed++; console.log('✗ B-spline curve evaluation'); }
        } catch(e) { failed++; console.log('✗ B-spline curve evaluation:', e.message); }
        
        // Test 3: Delaunay triangulation
        try {
            const points = [{x:0,y:0}, {x:1,y:0}, {x:0.5,y:1}, {x:0.5,y:0.5}];
            const tris = PRISM_CAD_KERNEL_PASS2.delaunayTriangulate(points);
            if (tris.length >= 2) { passed++; console.log('✓ Delaunay triangulation'); }
            else { failed++; console.log('✗ Delaunay triangulation'); }
        } catch(e) { failed++; console.log('✗ Delaunay triangulation:', e.message); }
        
        // Test 4: Ray-triangle intersection
        try {
            const origin = {x:0.25, y:0.25, z:1};
            const dir = {x:0, y:0, z:-1};
            const v0 = {x:0, y:0, z:0};
            const v1 = {x:1, y:0, z:0};
            const v2 = {x:0, y:1, z:0};
            const hit = PRISM_GRAPHICS_KERNEL_PASS2.rayTriangleIntersect(origin, dir, v0, v1, v2);
            if (hit && Math.abs(hit.t - 1) < 0.001) { passed++; console.log('✓ Ray-triangle intersection'); }
            else { failed++; console.log('✗ Ray-triangle intersection'); }
        } catch(e) { failed++; console.log('✗ Ray-triangle intersection:', e.message); }
        
        // Test 5: GGX distribution
        try {
            const D = PRISM_GRAPHICS_KERNEL_PASS2.ggxDistribution(1.0, 0.5);
            if (D > 0) { passed++; console.log('✓ GGX distribution'); }
            else { failed++; console.log('✗ GGX distribution'); }
        } catch(e) { failed++; console.log('✗ GGX distribution:', e.message); }
        
        // Test 6: Fresnel
        try {
            const F = PRISM_GRAPHICS_KERNEL_PASS2.fresnelSchlick(0.5, {x:0.04, y:0.04, z:0.04});
            if (F.x >= 0.04 && F.x <= 1) { passed++; console.log('✓ Fresnel-Schlick'); }
            else { failed++; console.log('✗ Fresnel-Schlick'); }
        } catch(e) { failed++; console.log('✗ Fresnel-Schlick:', e.message); }
        
        // Test 7: Quaternion operations
        try {
            const q = PRISM_GRAPHICS_KERNEL_PASS2.quaternionFromAxisAngle({x:0,y:1,z:0}, Math.PI/2);
            const m = PRISM_GRAPHICS_KERNEL_PASS2.quaternionToMatrix(q);
            if (m.length === 4 && m[0].length === 4) { passed++; console.log('✓ Quaternion operations'); }
            else { failed++; console.log('✗ Quaternion operations'); }
        } catch(e) { failed++; console.log('✗ Quaternion operations:', e.message); }
        
        // Test 8: Merchant cutting force
        try {
            const result = PRISM_CAM_KERNEL_PASS2.merchantCuttingForce({
                chipThickness: 0.1,
                width: 5,
                rakeAngle: 0.1745,
                frictionAngle: 0.6,
                shearStrength: 500
            });
            if (result.cuttingForce > 0 && result.shearAngle > 0) { 
                passed++; console.log('✓ Merchant cutting force'); 
            } else { failed++; console.log('✗ Merchant cutting force'); }
        } catch(e) { failed++; console.log('✗ Merchant cutting force:', e.message); }
        
        // Test 9: Taylor tool life
        try {
            const result = PRISM_CAM_KERNEL_PASS2.taylorToolLife({
                cuttingSpeed: 200,
                C: 400,
                n: 0.25
            });
            if (result.toolLife > 0) { passed++; console.log('✓ Taylor tool life'); }
            else { failed++; console.log('✗ Taylor tool life'); }
        } catch(e) { failed++; console.log('✗ Taylor tool life:', e.message); }
        
        // Test 10: Trochoidal toolpath
        try {
            const path = PRISM_CAM_KERNEL_PASS2.trochoidalPath(
                {x:0, y:0, z:0}, {x:100, y:0, z:0}, 10, 4, 3
            );
            if (path.length > 100) { passed++; console.log('✓ Trochoidal toolpath'); }
            else { failed++; console.log('✗ Trochoidal toolpath'); }
        } catch(e) { failed++; console.log('✗ Trochoidal toolpath:', e.message); }
        
        console.log(`\n=== Results: ${passed}/${passed+failed} tests passed ===\n`);
        return { passed, failed, total: passed + failed };
    }
}