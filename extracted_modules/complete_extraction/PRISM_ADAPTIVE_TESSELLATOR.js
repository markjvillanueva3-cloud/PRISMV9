const PRISM_ADAPTIVE_TESSELLATOR = {
    name: 'PRISM_ADAPTIVE_TESSELLATOR',
    version: '1.0.0',

    // Tessellation quality settings
    quality: {
        low: { maxDepth: 2, angleTolerance: 0.3, chordTolerance: 0.5 },
        medium: { maxDepth: 4, angleTolerance: 0.15, chordTolerance: 0.1 },
        high: { maxDepth: 6, angleTolerance: 0.05, chordTolerance: 0.02 },
        ultra: { maxDepth: 8, angleTolerance: 0.02, chordTolerance: 0.005 }
    },
    currentQuality: 'medium',

    // Tessellate a NURBS surface into triangles
    tessellateSurface: function(surface, parsedData, quality) {
        const settings = this.quality[quality || this.currentQuality];
        const mesh = { vertices: [], normals: [], indices: [], uvs: [] };

        if (!surface.controlPoints || surface.controlPoints.length === 0) {
            return this.tessellateAnalyticSurface(surface, parsedData, settings);
        }
        // Build control grid from flat array
        const { controlGrid, weightsGrid, knotsU, knotsV } = this.buildSurfaceData(surface);

        if (!controlGrid || controlGrid.length === 0) {
            console.warn('[Tessellator] Invalid control grid for surface');
            return mesh;
        }
        // Adaptive subdivision
        this.subdivideSurface(
            controlGrid, weightsGrid,
            surface.degreeU, surface.degreeV,
            knotsU, knotsV,
            0, 1, 0, 1, // u0, u1, v0, v1
            0, settings.maxDepth, settings,
            mesh
        );

        return mesh;
    },
    // Build surface data structures from parsed STEP data
    buildSurfaceData: function(surface) {
        if (!surface.controlPoints) return null;

        // Estimate grid dimensions
        const n = surface.controlPoints.length;
        let numU, numV;

        if (surface.numU && surface.numV) {
            numU = surface.numU;
            numV = surface.numV;
        } else {
            // Estimate square-ish grid
            numV = Math.ceil(Math.sqrt(n));
            numU = Math.ceil(n / numV);
        }
        // Build 2D grid
        const controlGrid = [];
        const weightsGrid = [];

        for (let i = 0; i < numU; i++) {
            controlGrid[i] = [];
            weightsGrid[i] = [];
            for (let j = 0; j < numV; j++) {
                const idx = i * numV + j;
                if (idx < surface.controlPoints.length) {
                    controlGrid[i][j] = surface.controlPoints[idx];
                    weightsGrid[i][j] = surface.weights ? surface.weights[idx] : 1.0;
                } else {
                    controlGrid[i][j] = controlGrid[i][j-1] || { x: 0, y: 0, z: 0 };
                    weightsGrid[i][j] = 1.0;
                }
            }
        }
        // Generate knot vectors if not provided
        const degU = surface.degreeU || 3;
        const degV = surface.degreeV || 3;

        const knotsU = surface.knotsU || this.generateUniformKnots(numU, degU);
        const knotsV = surface.knotsV || this.generateUniformKnots(numV, degV);

        return { controlGrid, weightsGrid, knotsU, knotsV };
    },
    // Generate uniform knot vector
    generateUniformKnots: function(numCP, degree) {
        const n = numCP + degree + 1;
        const knots = [];

        // Clamped knot vector
        for (let i = 0; i <= degree; i++) knots.push(0);
        for (let i = 1; i < numCP - degree; i++) knots.push(i / (numCP - degree));
        for (let i = 0; i <= degree; i++) knots.push(1);

        return knots;
    },
    // Recursive adaptive subdivision
    subdivideSurface: function(controlGrid, weightsGrid, degU, degV, knotsU, knotsV,
                                u0, u1, v0, v1, depth, maxDepth, settings, mesh) {
        const uMid = (u0 + u1) / 2;
        const vMid = (v0 + v1) / 2;

        // Evaluate corner points
        const p00 = PRISM_BSPLINE_ENGINE.evaluateNURBSSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u0, v0);
        const p10 = PRISM_BSPLINE_ENGINE.evaluateNURBSSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u1, v0);
        const p01 = PRISM_BSPLINE_ENGINE.evaluateNURBSSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u0, v1);
        const p11 = PRISM_BSPLINE_ENGINE.evaluateNURBSSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u1, v1);
        const pMid = PRISM_BSPLINE_ENGINE.evaluateNURBSSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, uMid, vMid);

        // Check if we need to subdivide further
        const needsSubdivision = depth < maxDepth && this.needsRefinement(p00, p10, p01, p11, pMid, settings);

        if (needsSubdivision) {
            // Subdivide into 4 quads
            this.subdivideSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u0, uMid, v0, vMid, depth + 1, maxDepth, settings, mesh);
            this.subdivideSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, uMid, u1, v0, vMid, depth + 1, maxDepth, settings, mesh);
            this.subdivideSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u0, uMid, vMid, v1, depth + 1, maxDepth, settings, mesh);
            this.subdivideSurface(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, uMid, u1, vMid, v1, depth + 1, maxDepth, settings, mesh);
        } else {
            // Add triangles for this quad
            this.addQuadToMesh(p00, p10, p01, p11, u0, u1, v0, v1,
                              controlGrid, weightsGrid, degU, degV, knotsU, knotsV, mesh);
        }
    },
    // Check if a quad needs refinement based on curvature/flatness
    needsRefinement: function(p00, p10, p01, p11, pMid, settings) {
        // Chord deviation test
        const linearMid = {
            x: (p00.x + p10.x + p01.x + p11.x) / 4,
            y: (p00.y + p10.y + p01.y + p11.y) / 4,
            z: (p00.z + p10.z + p01.z + p11.z) / 4
        };
        const chordDev = PRISM_CAD_MATH.vec3.distance(pMid, linearMid);
        if (chordDev > settings.chordTolerance) return true;

        // Edge length test (avoid overly large triangles)
        const maxEdge = Math.max(
            PRISM_CAD_MATH.vec3.distance(p00, p10),
            PRISM_CAD_MATH.vec3.distance(p01, p11),
            PRISM_CAD_MATH.vec3.distance(p00, p01),
            PRISM_CAD_MATH.vec3.distance(p10, p11)
        );

        if (maxEdge > settings.chordTolerance * 10) return true;

        return false;
    },
    // Add a quad (2 triangles) to the mesh
    addQuadToMesh: function(p00, p10, p01, p11, u0, u1, v0, v1,
                           controlGrid, weightsGrid, degU, degV, knotsU, knotsV, mesh) {
        const baseIdx = mesh.vertices.length / 3;

        // Compute normals
        const n00 = PRISM_BSPLINE_ENGINE.evaluateSurfaceNormal(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u0, v0);
        const n10 = PRISM_BSPLINE_ENGINE.evaluateSurfaceNormal(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u1, v0);
        const n01 = PRISM_BSPLINE_ENGINE.evaluateSurfaceNormal(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u0, v1);
        const n11 = PRISM_BSPLINE_ENGINE.evaluateSurfaceNormal(controlGrid, weightsGrid, degU, degV, knotsU, knotsV, u1, v1);

        // Add vertices
        mesh.vertices.push(p00.x, p00.y, p00.z);
        mesh.vertices.push(p10.x, p10.y, p10.z);
        mesh.vertices.push(p01.x, p01.y, p01.z);
        mesh.vertices.push(p11.x, p11.y, p11.z);

        // Add normals
        mesh.normals.push(n00.x, n00.y, n00.z);
        mesh.normals.push(n10.x, n10.y, n10.z);
        mesh.normals.push(n01.x, n01.y, n01.z);
        mesh.normals.push(n11.x, n11.y, n11.z);

        // Add UVs
        mesh.uvs.push(u0, v0);
        mesh.uvs.push(u1, v0);
        mesh.uvs.push(u0, v1);
        mesh.uvs.push(u1, v1);

        // Add triangles (two triangles per quad)
        mesh.indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        mesh.indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    },
    // Tessellate analytic surfaces (plane, cylinder, etc.)
    tessellateAnalyticSurface: function(surface, parsedData, settings) {
        const mesh = { vertices: [], normals: [], indices: [], uvs: [] };

        if (!surface.placementRef || !parsedData.axis2Placements[surface.placementRef]) {
            return mesh;
        }
        const placement = parsedData.axis2Placements[surface.placementRef];
        const origin = placement.locationPoint || { x: 0, y: 0, z: 0 };
        const axis = placement.axisDirection || { x: 0, y: 0, z: 1 };
        const refDir = placement.refDirection || { x: 1, y: 0, z: 0 };

        const transform = PRISM_CAD_MATH.mat4.fromAxisPlacement(origin, axis, refDir);

        switch (surface.type) {
            case 'PLANE':
                return this.tessellatePlane(transform, settings);
            case 'CYLINDRICAL_SURFACE':
                return this.tessellateCylinder(transform, surface.radius, settings);
            case 'SPHERICAL_SURFACE':
                return this.tessellateSphere(transform, surface.radius, settings);
            case 'CONICAL_SURFACE':
                return this.tessellateCone(transform, surface.radius, surface.semiAngle, settings);
            case 'TOROIDAL_SURFACE':
                return this.tessellateTorus(transform, surface.majorRadius, surface.minorRadius, settings);
            default:
                return mesh;
        }
    },
    // Tessellate a plane
    tessellatePlane: function(transform, settings, size) {
        const s = size || 100;
        const mesh = { vertices: [], normals: [], indices: [], uvs: [] };

        const corners = [
            { x: -s, y: -s, z: 0 },
            { x: s, y: -s, z: 0 },
            { x: -s, y: s, z: 0 },
            { x: s, y: s, z: 0 }
        ];

        const normal = PRISM_CAD_MATH.mat4.transformVector(transform, { x: 0, y: 0, z: 1 });

        for (const c of corners) {
            const p = PRISM_CAD_MATH.mat4.transformPoint(transform, c);
            mesh.vertices.push(p.x, p.y, p.z);
            mesh.normals.push(normal.x, normal.y, normal.z);
        }
        mesh.uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
        mesh.indices.push(0, 1, 2, 1, 3, 2);

        return mesh;
    },
    // Tessellate a cylinder
    tessellateCylinder: function(transform, radius, settings, height) {
        const r = radius || 10;
        const h = height || 100;
        const segments = Math.max(16, Math.ceil(32 / (settings.chordTolerance * 10)));

        const mesh = { vertices: [], normals: [], indices: [], uvs: [] };

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            // Bottom vertex
            const pBot = PRISM_CAD_MATH.mat4.transformPoint(transform, { x: r * cosT, y: r * sinT, z: 0 });
            // Top vertex
            const pTop = PRISM_CAD_MATH.mat4.transformPoint(transform, { x: r * cosT, y: r * sinT, z: h });
            // Normal
            const n = PRISM_CAD_MATH.mat4.transformVector(transform, { x: cosT, y: sinT, z: 0 });
            const nNorm = PRISM_CAD_MATH.vec3.normalize(n);

            mesh.vertices.push(pBot.x, pBot.y, pBot.z);
            mesh.vertices.push(pTop.x, pTop.y, pTop.z);
            mesh.normals.push(nNorm.x, nNorm.y, nNorm.z);
            mesh.normals.push(nNorm.x, nNorm.y, nNorm.z);
            mesh.uvs.push(i / segments, 0);
            mesh.uvs.push(i / segments, 1);

            if (i > 0) {
                const base = (i - 1) * 2;
                mesh.indices.push(base, base + 2, base + 1);
                mesh.indices.push(base + 1, base + 2, base + 3);
            }
        }
        return mesh;
    },
    // Tessellate a sphere
    tessellateSphere: function(transform, radius, settings) {
        const r = radius || 10;
        const segments = Math.max(16, Math.ceil(32 / (settings.chordTolerance * 5)));
        const rings = Math.ceil(segments / 2);

        const mesh = { vertices: [], normals: [], indices: [], uvs: [] };

        for (let ring = 0; ring <= rings; ring++) {
            const phi = (ring / rings) * Math.PI;
            const sinP = Math.sin(phi);
            const cosP = Math.cos(phi);

            for (let seg = 0; seg <= segments; seg++) {
                const theta = (seg / segments) * Math.PI * 2;
                const sinT = Math.sin(theta);
                const cosT = Math.cos(theta);

                const localP = { x: r * sinP * cosT, y: r * sinP * sinT, z: r * cosP };
                const localN = { x: sinP * cosT, y: sinP * sinT, z: cosP };

                const p = PRISM_CAD_MATH.mat4.transformPoint(transform, localP);
                const n = PRISM_CAD_MATH.vec3.normalize(PRISM_CAD_MATH.mat4.transformVector(transform, localN));

                mesh.vertices.push(p.x, p.y, p.z);
                mesh.normals.push(n.x, n.y, n.z);
                mesh.uvs.push(seg / segments, ring / rings);
            }
        }
        // Generate indices
        for (let ring = 0; ring < rings; ring++) {
            for (let seg = 0; seg < segments; seg++) {
                const curr = ring * (segments + 1) + seg;
                const next = curr + segments + 1;

                mesh.indices.push(curr, next, curr + 1);
                mesh.indices.push(curr + 1, next, next + 1);
            }
        }
        return mesh;
    },
    // Tessellate a torus
    tessellateTorus: function(transform, majorRadius, minorRadius, settings) {
        const R = majorRadius || 20;
        const r = minorRadius || 5;
        const segments = Math.max(24, Math.ceil(48 / (settings.chordTolerance * 5)));
        const rings = segments;

        const mesh = { vertices: [], normals: [], indices: [], uvs: [] };

        for (let ring = 0; ring <= rings; ring++) {
            const phi = (ring / rings) * Math.PI * 2;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            for (let seg = 0; seg <= segments; seg++) {
                const theta = (seg / segments) * Math.PI * 2;
                const cosTheta = Math.cos(theta);
                const sinTheta = Math.sin(theta);

                const x = (R + r * cosTheta) * cosPhi;
                const y = (R + r * cosTheta) * sinPhi;
                const z = r * sinTheta;

                const nx = cosTheta * cosPhi;
                const ny = cosTheta * sinPhi;
                const nz = sinTheta;

                const p = PRISM_CAD_MATH.mat4.transformPoint(transform, { x, y, z });
                const n = PRISM_CAD_MATH.vec3.normalize(PRISM_CAD_MATH.mat4.transformVector(transform, { x: nx, y: ny, z: nz }));

                mesh.vertices.push(p.x, p.y, p.z);
                mesh.normals.push(n.x, n.y, n.z);
                mesh.uvs.push(ring / rings, seg / segments);
            }
        }
        // Generate indices
        for (let ring = 0; ring < rings; ring++) {
            for (let seg = 0; seg < segments; seg++) {
                const curr = ring * (segments + 1) + seg;
                const next = curr + segments + 1;

                mesh.indices.push(curr, next, curr + 1);
                mesh.indices.push(curr + 1, next, next + 1);
            }
        }
        return mesh;
    },
    // Tessellate a cone
    tessellateCone: function(transform, baseRadius, semiAngle, settings, height) {
        const r = baseRadius || 10;
        const h = height || 50;
        const segments = Math.max(16, Math.ceil(32 / (settings.chordTolerance * 10)));

        const mesh = { vertices: [], normals: [], indices: [], uvs: [] };
        const tanAngle = Math.tan(semiAngle || 0.5);

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            // Bottom vertex (base radius)
            const pBot = PRISM_CAD_MATH.mat4.transformPoint(transform, { x: r * cosT, y: r * sinT, z: 0 });
            // Top vertex (apex or smaller radius)
            const topR = Math.max(0, r - h * tanAngle);
            const pTop = PRISM_CAD_MATH.mat4.transformPoint(transform, { x: topR * cosT, y: topR * sinT, z: h });

            // Normal (perpendicular to cone surface)
            const normalAngle = Math.atan2(r - topR, h);
            const nLocal = { x: Math.cos(normalAngle) * cosT, y: Math.cos(normalAngle) * sinT, z: Math.sin(normalAngle) };
            const n = PRISM_CAD_MATH.vec3.normalize(PRISM_CAD_MATH.mat4.transformVector(transform, nLocal));

            mesh.vertices.push(pBot.x, pBot.y, pBot.z);
            mesh.vertices.push(pTop.x, pTop.y, pTop.z);
            mesh.normals.push(n.x, n.y, n.z);
            mesh.normals.push(n.x, n.y, n.z);
            mesh.uvs.push(i / segments, 0);
            mesh.uvs.push(i / segments, 1);

            if (i > 0) {
                const base = (i - 1) * 2;
                mesh.indices.push(base, base + 2, base + 1);
                mesh.indices.push(base + 1, base + 2, base + 3);
            }
        }
        return mesh;
    },
    // Self-test
    selfTest: function() {
        console.log('[PRISM Tessellator] Running self-test...');

        // Test uniform knot generation
        const knots = this.generateUniformKnots(4, 3);
        const knotValid = knots.length === 8 && knots[0] === 0 && knots[7] === 1;

        // Test plane tessellation
        const planeMesh = this.tessellatePlane(PRISM_CAD_MATH.mat4.identity(), this.quality.medium, 10);
        const planeValid = planeMesh.vertices.length === 12 && planeMesh.indices.length === 6;

        const tests = [
            { name: 'Knot generation', pass: knotValid },
            { name: 'Plane tessellation', pass: planeValid }
        ];

        const allPassed = tests.every(t => t.pass);
        console.log(`[PRISM Tessellator] Self-test ${allPassed ? 'PASSED' : 'FAILED'}:`, tests);
        return allPassed;
    }
}