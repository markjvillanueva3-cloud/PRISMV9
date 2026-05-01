const PRISM_CAD_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // B-SPLINE BASIS FUNCTIONS (from 2.158J Computational Geometry)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Cox-de Boor recursive B-spline basis function
     * N_{i,p}(u) = (u - u_i)/(u_{i+p} - u_i) * N_{i,p-1}(u) +
     *             (u_{i+p+1} - u)/(u_{i+p+1} - u_{i+1}) * N_{i+1,p-1}(u)
     */
    basisFunction: function(i, p, u, knots) {
        if (p === 0) {
            return (u >= knots[i] && u < knots[i + 1]) ? 1.0 : 0.0;
        }
        
        let left = 0.0, right = 0.0;
        
        const denom1 = knots[i + p] - knots[i];
        const denom2 = knots[i + p + 1] - knots[i + 1];
        
        if (Math.abs(denom1) > 1e-10) {
            left = ((u - knots[i]) / denom1) * this.basisFunction(i, p - 1, u, knots);
        }
        
        if (Math.abs(denom2) > 1e-10) {
            right = ((knots[i + p + 1] - u) / denom2) * this.basisFunction(i + 1, p - 1, u, knots);
        }
        
        return left + right;
    },
    
    /**
     * Derivative of B-spline basis function
     * N'_{i,p}(u) = p * [N_{i,p-1}(u)/(u_{i+p} - u_i) - N_{i+1,p-1}(u)/(u_{i+p+1} - u_{i+1})]
     */
    basisFunctionDerivative: function(i, p, u, knots, order = 1) {
        if (order === 0) {
            return this.basisFunction(i, p, u, knots);
        }
        
        if (p === 0) return 0.0;
        
        let left = 0.0, right = 0.0;
        
        const denom1 = knots[i + p] - knots[i];
        const denom2 = knots[i + p + 1] - knots[i + 1];
        
        if (Math.abs(denom1) > 1e-10) {
            left = this.basisFunctionDerivative(i, p - 1, u, knots, order - 1) / denom1;
        }
        
        if (Math.abs(denom2) > 1e-10) {
            right = this.basisFunctionDerivative(i + 1, p - 1, u, knots, order - 1) / denom2;
        }
        
        return p * (left - right);
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // B-SPLINE CURVE EVALUATION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Evaluate B-spline curve at parameter u
     * C(u) = sum_{i=0}^{n} N_{i,p}(u) * P_i
     */
    evaluateBSplineCurve: function(u, degree, controlPoints, knots) {
        const n = controlPoints.length;
        let result = { x: 0, y: 0, z: 0 };
        
        for (let i = 0; i < n; i++) {
            const basis = this.basisFunction(i, degree, u, knots);
            result.x += basis * controlPoints[i].x;
            result.y += basis * controlPoints[i].y;
            result.z += basis * (controlPoints[i].z || 0);
        }
        
        return result;
    },
    
    /**
     * Evaluate B-spline curve derivative
     */
    evaluateBSplineCurveDerivative: function(u, degree, controlPoints, knots, order = 1) {
        const n = controlPoints.length;
        let result = { x: 0, y: 0, z: 0 };
        
        for (let i = 0; i < n; i++) {
            const dBasis = this.basisFunctionDerivative(i, degree, u, knots, order);
            result.x += dBasis * controlPoints[i].x;
            result.y += dBasis * controlPoints[i].y;
            result.z += dBasis * (controlPoints[i].z || 0);
        }
        
        return result;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // NURBS CURVE (Rational B-spline)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Evaluate NURBS curve
     * C(u) = sum(N_{i,p}(u) * w_i * P_i) / sum(N_{i,p}(u) * w_i)
     */
    evaluateNURBSCurve: function(u, degree, controlPoints, knots, weights) {
        const n = controlPoints.length;
        let numerator = { x: 0, y: 0, z: 0 };
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            const basis = this.basisFunction(i, degree, u, knots);
            const w = weights[i];
            const bw = basis * w;
            
            numerator.x += bw * controlPoints[i].x;
            numerator.y += bw * controlPoints[i].y;
            numerator.z += bw * (controlPoints[i].z || 0);
            denominator += bw;
        }
        
        if (Math.abs(denominator) < 1e-12) {
            return controlPoints[0];
        }
        
        return {
            x: numerator.x / denominator,
            y: numerator.y / denominator,
            z: numerator.z / denominator
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // B-SPLINE SURFACE EVALUATION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Evaluate B-spline surface at (u, v)
     * S(u,v) = sum_i sum_j N_{i,p}(u) * N_{j,q}(v) * P_{i,j}
     */
    evaluateBSplineSurface: function(u, v, degreeU, degreeV, controlNet, knotsU, knotsV) {
        const numU = controlNet.length;
        const numV = controlNet[0].length;
        
        let result = { x: 0, y: 0, z: 0 };
        
        for (let i = 0; i < numU; i++) {
            const basisU = this.basisFunction(i, degreeU, u, knotsU);
            
            for (let j = 0; j < numV; j++) {
                const basisV = this.basisFunction(j, degreeV, v, knotsV);
                const basisUV = basisU * basisV;
                
                result.x += basisUV * controlNet[i][j].x;
                result.y += basisUV * controlNet[i][j].y;
                result.z += basisUV * (controlNet[i][j].z || 0);
            }
        }
        
        return result;
    },
    
    /**
     * Evaluate surface partial derivatives
     */
    evaluateSurfaceDerivatives: function(u, v, degreeU, degreeV, controlNet, knotsU, knotsV) {
        const numU = controlNet.length;
        const numV = controlNet[0].length;
        
        let S = { x: 0, y: 0, z: 0 };    // S(u,v)
        let Su = { x: 0, y: 0, z: 0 };   // dS/du
        let Sv = { x: 0, y: 0, z: 0 };   // dS/dv
        let Suu = { x: 0, y: 0, z: 0 };  // d2S/du2
        let Suv = { x: 0, y: 0, z: 0 };  // d2S/dudv
        let Svv = { x: 0, y: 0, z: 0 };  // d2S/dv2
        
        for (let i = 0; i < numU; i++) {
            const Nu = this.basisFunction(i, degreeU, u, knotsU);
            const dNu = this.basisFunctionDerivative(i, degreeU, u, knotsU, 1);
            const d2Nu = this.basisFunctionDerivative(i, degreeU, u, knotsU, 2);
            
            for (let j = 0; j < numV; j++) {
                const Nv = this.basisFunction(j, degreeV, v, knotsV);
                const dNv = this.basisFunctionDerivative(j, degreeV, v, knotsV, 1);
                const d2Nv = this.basisFunctionDerivative(j, degreeV, v, knotsV, 2);
                
                const P = controlNet[i][j];
                const px = P.x, py = P.y, pz = P.z || 0;
                
                S.x += Nu * Nv * px;
                S.y += Nu * Nv * py;
                S.z += Nu * Nv * pz;
                
                Su.x += dNu * Nv * px;
                Su.y += dNu * Nv * py;
                Su.z += dNu * Nv * pz;
                
                Sv.x += Nu * dNv * px;
                Sv.y += Nu * dNv * py;
                Sv.z += Nu * dNv * pz;
                
                Suu.x += d2Nu * Nv * px;
                Suu.y += d2Nu * Nv * py;
                Suu.z += d2Nu * Nv * pz;
                
                Suv.x += dNu * dNv * px;
                Suv.y += dNu * dNv * py;
                Suv.z += dNu * dNv * pz;
                
                Svv.x += Nu * d2Nv * px;
                Svv.y += Nu * d2Nv * py;
                Svv.z += Nu * d2Nv * pz;
            }
        }
        
        return { S, Su, Sv, Suu, Suv, Svv };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SURFACE DIFFERENTIAL GEOMETRY
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Calculate surface normal at (u, v)
     * N = Su × Sv / |Su × Sv|
     */
    surfaceNormal: function(Su, Sv) {
        const cross = this._cross(Su, Sv);
        return this._normalize(cross);
    },
    
    /**
     * Calculate first fundamental form coefficients (I)
     * E = Su · Su, F = Su · Sv, G = Sv · Sv
     */
    firstFundamentalForm: function(Su, Sv) {
        return {
            E: this._dot(Su, Su),
            F: this._dot(Su, Sv),
            G: this._dot(Sv, Sv)
        };
    },
    
    /**
     * Calculate second fundamental form coefficients (II)
     * L = Suu · N, M = Suv · N, N = Svv · N
     */
    secondFundamentalForm: function(Suu, Suv, Svv, N) {
        return {
            L: this._dot(Suu, N),
            M: this._dot(Suv, N),
            N: this._dot(Svv, N)
        };
    },
    
    /**
     * Calculate Gaussian and Mean curvature
     * K = (LN - M²) / (EG - F²)
     * H = (EN - 2FM + GL) / (2(EG - F²))
     */
    surfaceCurvatures: function(Su, Sv, Suu, Suv, Svv) {
        const N = this.surfaceNormal(Su, Sv);
        const I = this.firstFundamentalForm(Su, Sv);
        const II = this.secondFundamentalForm(Suu, Suv, Svv, N);
        
        const denom = I.E * I.G - I.F * I.F;
        
        if (Math.abs(denom) < 1e-12) {
            return { gaussian: 0, mean: 0, k1: 0, k2: 0 };
        }
        
        const gaussian = (II.L * II.N - II.M * II.M) / denom;
        const mean = (I.E * II.N - 2 * I.F * II.M + I.G * II.L) / (2 * denom);
        
        // Principal curvatures
        const discriminant = Math.sqrt(Math.max(0, mean * mean - gaussian));
        const k1 = mean + discriminant;
        const k2 = mean - discriminant;
        
        return {
            gaussian,
            mean,
            k1,
            k2,
            normal: N,
            type: this._classifySurfacePoint(gaussian, mean)
        };
    },
    
    _classifySurfacePoint: function(K, H) {
        const eps = 1e-10;
        if (Math.abs(K) < eps && Math.abs(H) < eps) return 'planar';
        if (Math.abs(K) < eps) return 'developable';
        if (K > eps) return 'elliptic';
        if (K < -eps) return 'hyperbolic';
        return 'parabolic';
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // KNOT OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Create uniform knot vector
     */
    createUniformKnots: function(numControlPoints, degree) {
        const n = numControlPoints - 1;
        const m = n + degree + 1;
        const knots = [];
        
        for (let i = 0; i <= m; i++) {
            if (i <= degree) {
                knots.push(0);
            } else if (i >= m - degree) {
                knots.push(1);
            } else {
                knots.push((i - degree) / (m - 2 * degree));
            }
        }
        
        return knots;
    },
    
    /**
     * Knot insertion using Oslo algorithm
     */
    insertKnot: function(u, degree, controlPoints, knots, times = 1) {
        let newCP = [...controlPoints.map(p => ({ ...p }))];
        let newKnots = [...knots];
        
        for (let t = 0; t < times; t++) {
            // Find knot span
            let k = 0;
            while (k < newKnots.length - 1 && newKnots[k + 1] <= u) k++;
            
            // Insert knot
            newKnots.splice(k + 1, 0, u);
            
            // Calculate new control points
            const tempCP = [];
            for (let i = 0; i <= newCP.length; i++) {
                if (i <= k - degree) {
                    tempCP.push({ ...newCP[i] });
                } else if (i > k) {
                    tempCP.push({ ...newCP[i - 1] });
                } else {
                    const alpha = (u - newKnots[i]) / (newKnots[i + degree + t] - newKnots[i]);
                    tempCP.push({
                        x: (1 - alpha) * newCP[i - 1].x + alpha * newCP[i].x,
                        y: (1 - alpha) * newCP[i - 1].y + alpha * newCP[i].y,
                        z: (1 - alpha) * (newCP[i - 1].z || 0) + alpha * (newCP[i].z || 0)
                    });
                }
            }
            newCP = tempCP;
        }
        
        return { controlPoints: newCP, knots: newKnots };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // DELAUNAY TRIANGULATION (Bowyer-Watson)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Delaunay triangulation using Bowyer-Watson algorithm
     */
    delaunayTriangulate: function(points) {
        if (points.length < 3) return [];
        
        // Create super-triangle
        const bounds = this._getBounds(points);
        const d = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 3;
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        
        const superTri = [
            { x: cx - d, y: cy - d, __super: true },
            { x: cx + d, y: cy - d, __super: true },
            { x: cx, y: cy + d, __super: true }
        ];
        
        const allPoints = [...superTri, ...points];
        let triangles = [{ a: 0, b: 1, c: 2 }];
        
        // Add points one at a time
        for (let i = 3; i < allPoints.length; i++) {
            const point = allPoints[i];
            const badTriangles = [];
            const polygon = [];
            
            // Find bad triangles (whose circumcircle contains point)
            for (let j = triangles.length - 1; j >= 0; j--) {
                const tri = triangles[j];
                const cc = this._circumcircle(
                    allPoints[tri.a],
                    allPoints[tri.b],
                    allPoints[tri.c]
                );
                
                if (cc && this._pointInCircle(point, cc)) {
                    badTriangles.push(triangles.splice(j, 1)[0]);
                }
            }
            
            // Find boundary polygon
            for (const tri of badTriangles) {
                const edges = [
                    [tri.a, tri.b],
                    [tri.b, tri.c],
                    [tri.c, tri.a]
                ];
                
                for (const edge of edges) {
                    const shared = badTriangles.some(other => 
                        other !== tri && this._triangleHasEdge(other, edge)
                    );
                    if (!shared) {
                        polygon.push(edge);
                    }
                }
            }
            
            // Create new triangles
            for (const edge of polygon) {
                triangles.push({ a: edge[0], b: edge[1], c: i });
            }
        }
        
        // Remove triangles with super-triangle vertices
        triangles = triangles.filter(tri => 
            tri.a >= 3 && tri.b >= 3 && tri.c >= 3
        );
        
        // Adjust indices
        return triangles.map(tri => ({
            a: tri.a - 3,
            b: tri.b - 3,
            c: tri.c - 3
        }));
    },
    
    _circumcircle: function(p1, p2, p3) {
        const ax = p1.x, ay = p1.y;
        const bx = p2.x, by = p2.y;
        const cx = p3.x, cy = p3.y;
        
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(d) < 1e-12) return null;
        
        const ux = ((ax*ax + ay*ay) * (by - cy) + 
                    (bx*bx + by*by) * (cy - ay) + 
                    (cx*cx + cy*cy) * (ay - by)) / d;
        const uy = ((ax*ax + ay*ay) * (cx - bx) + 
                    (bx*bx + by*by) * (ax - cx) + 
                    (cx*cx + cy*cy) * (bx - ax)) / d;
        
        const r = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));
        
        return { x: ux, y: uy, r: r };
    },
    
    _pointInCircle: function(point, circle) {
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        return dx * dx + dy * dy <= circle.r * circle.r * 1.0001;
    },
    
    _triangleHasEdge: function(tri, edge) {
        const vertices = [tri.a, tri.b, tri.c];
        return vertices.includes(edge[0]) && vertices.includes(edge[1]);
    },
    
    _getBounds: function(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // VORONOI DIAGRAM (dual of Delaunay)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Compute Voronoi diagram from Delaunay triangulation
     */
    voronoiFromDelaunay: function(points, triangles) {
        // Voronoi vertices = circumcenters of Delaunay triangles
        const vertices = triangles.map(tri => {
            return this._circumcircle(
                points[tri.a],
                points[tri.b],
                points[tri.c]
            );
        }).filter(v => v !== null);
        
        // Build cells (regions around each point)
        const cells = points.map(() => []);
        
        triangles.forEach((tri, triIdx) => {
            cells[tri.a].push(triIdx);
            cells[tri.b].push(triIdx);
            cells[tri.c].push(triIdx);
        });
        
        return { vertices, cells };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SUBDIVISION SURFACES (Catmull-Clark)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Catmull-Clark subdivision for quad meshes
     */
    catmullClarkSubdivide: function(vertices, faces) {
        const newVertices = [];
        const newFaces = [];
        
        // Step 1: Calculate face points (average of face vertices)
        const facePoints = faces.map(face => {
            const avg = { x: 0, y: 0, z: 0 };
            for (const vi of face) {
                avg.x += vertices[vi].x;
                avg.y += vertices[vi].y;
                avg.z += vertices[vi].z || 0;
            }
            avg.x /= face.length;
            avg.y /= face.length;
            avg.z /= face.length;
            return avg;
        });
        
        // Step 2: Calculate edge points
        const edgeMap = new Map();
        const edgePoints = [];
        
        faces.forEach((face, faceIdx) => {
            const n = face.length;
            for (let i = 0; i < n; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % n];
                const edgeKey = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                
                if (!edgeMap.has(edgeKey)) {
                    edgeMap.set(edgeKey, { faces: [], v1, v2 });
                }
                edgeMap.get(edgeKey).faces.push(faceIdx);
            }
        });
        
        edgeMap.forEach((edge, key) => {
            const v1 = vertices[edge.v1];
            const v2 = vertices[edge.v2];
            
            let edgePoint;
            if (edge.faces.length === 2) {
                // Interior edge: average of edge vertices and adjacent face points
                const f1 = facePoints[edge.faces[0]];
                const f2 = facePoints[edge.faces[1]];
                edgePoint = {
                    x: (v1.x + v2.x + f1.x + f2.x) / 4,
                    y: (v1.y + v2.y + f1.y + f2.y) / 4,
                    z: ((v1.z || 0) + (v2.z || 0) + f1.z + f2.z) / 4
                };
            } else {
                // Boundary edge: midpoint
                edgePoint = {
                    x: (v1.x + v2.x) / 2,
                    y: (v1.y + v2.y) / 2,
                    z: ((v1.z || 0) + (v2.z || 0)) / 2
                };
            }
            
            edge.pointIdx = edgePoints.length;
            edgePoints.push(edgePoint);
        });
        
        // Step 3: Calculate new vertex positions
        const vertexFaces = vertices.map(() => []);
        const vertexEdges = vertices.map(() => []);
        
        faces.forEach((face, faceIdx) => {
            for (const vi of face) {
                vertexFaces[vi].push(faceIdx);
            }
        });
        
        edgeMap.forEach((edge) => {
            vertexEdges[edge.v1].push(edge.pointIdx);
            vertexEdges[edge.v2].push(edge.pointIdx);
        });
        
        const newVertexPositions = vertices.map((v, vi) => {
            const n = vertexFaces[vi].length;
            
            if (n === 0) return { ...v };
            
            // Average of face points
            let avgF = { x: 0, y: 0, z: 0 };
            for (const fi of vertexFaces[vi]) {
                avgF.x += facePoints[fi].x;
                avgF.y += facePoints[fi].y;
                avgF.z += facePoints[fi].z;
            }
            avgF.x /= n;
            avgF.y /= n;
            avgF.z /= n;
            
            // Average of edge midpoints
            let avgE = { x: 0, y: 0, z: 0 };
            for (const ei of vertexEdges[vi]) {
                avgE.x += edgePoints[ei].x;
                avgE.y += edgePoints[ei].y;
                avgE.z += edgePoints[ei].z;
            }
            avgE.x /= vertexEdges[vi].length;
            avgE.y /= vertexEdges[vi].length;
            avgE.z /= vertexEdges[vi].length;
            
            // New position: (F + 2E + (n-3)V) / n
            return {
                x: (avgF.x + 2 * avgE.x + (n - 3) * v.x) / n,
                y: (avgF.y + 2 * avgE.y + (n - 3) * v.y) / n,
                z: (avgF.z + 2 * avgE.z + (n - 3) * (v.z || 0)) / n
            };
        });
        
        // Build output
        newVertices.push(...newVertexPositions);
        const fpOffset = newVertices.length;
        newVertices.push(...facePoints);
        const epOffset = newVertices.length;
        newVertices.push(...edgePoints);
        
        // Create new faces
        faces.forEach((face, faceIdx) => {
            const fpIdx = fpOffset + faceIdx;
            const n = face.length;
            
            for (let i = 0; i < n; i++) {
                const vi = face[i];
                const v1 = face[(i - 1 + n) % n];
                const v2 = face[(i + 1) % n];
                
                const e1Key = vi < v1 ? `${vi}-${v1}` : `${v1}-${vi}`;
                const e2Key = vi < v2 ? `${vi}-${v2}` : `${v2}-${vi}`;
                
                const ep1Idx = epOffset + edgeMap.get(e1Key).pointIdx;
                const ep2Idx = epOffset + edgeMap.get(e2Key).pointIdx;
                
                newFaces.push([vi, ep2Idx, fpIdx, ep1Idx]);
            }
        });
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    // Vector utilities
    _dot: function(a, b) { return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0); },
    _cross: function(a, b) {
        return {
            x: a.y * (b.z || 0) - (a.z || 0) * b.y,
            y: (a.z || 0) * b.x - a.x * (b.z || 0),
            z: a.x * b.y - a.y * b.x
        };
    },
    _normalize: function(v) {
        const len = Math.sqrt(this._dot(v, v));
        return len > 0 ? { x: v.x / len, y: v.y / len, z: (v.z || 0) / len } : v;
    },
    _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }; },
    _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: (a.z || 0) + (b.z || 0) }; },
    _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: (v.z || 0) * s }; }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM GRAPHICS ENGINE ENHANCED - PASS 2
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_GRAPHICS_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // BVH (Bounding Volume Hierarchy) with SAH
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Build BVH with Surface Area Heuristic
     */
    buildBVH: function(triangles, maxLeafSize = 4) {
        if (triangles.length === 0) return null;
        
        // Precompute centroids and bounds
        const primitives = triangles.map((tri, idx) => ({
            index: idx,
            triangle: tri,
            centroid: this._triangleCentroid(tri),
            bounds: this._triangleBounds(tri)
        }));
        
        return this._buildBVHNode(primitives, 0, maxLeafSize);
    },
    
    _buildBVHNode: function(primitives, depth, maxLeafSize) {
        if (primitives.length === 0) return null;
        
        // Compute bounds
        const bounds = this._unionBounds(primitives.map(p => p.bounds));
        
        if (primitives.length <= maxLeafSize || depth > 32) {
            return {
                bounds,
                primitives: primitives.map(p => p.triangle),
                isLeaf: true
            };
        }
        
        // SAH split
        const split = this._sahSplit(primitives, bounds);
        
        if (!split) {
            return {
                bounds,
                primitives: primitives.map(p => p.triangle),
                isLeaf: true
            };
        }
        
        const left = this._buildBVHNode(split.left, depth + 1, maxLeafSize);
        const right = this._buildBVHNode(split.right, depth + 1, maxLeafSize);
        
        return {
            bounds,
            left,
            right,
            axis: split.axis,
            isLeaf: false
        };
    },
    
    _sahSplit: function(primitives, bounds) {
        const numBuckets = 12;
        let bestCost = primitives.length;
        let bestAxis = -1;
        let bestSplit = -1;
        
        for (let axis = 0; axis < 3; axis++) {
            const axisName = ['x', 'y', 'z'][axis];
            const extent = bounds.max[axisName] - bounds.min[axisName];
            
            if (extent < 1e-6) continue;
            
            // Initialize buckets
            const buckets = Array(numBuckets).fill(null).map(() => ({
                count: 0,
                bounds: null
            }));
            
            // Fill buckets
            for (const prim of primitives) {
                const offset = (prim.centroid[axisName] - bounds.min[axisName]) / extent;
                const b = Math.min(numBuckets - 1, Math.floor(offset * numBuckets));
                buckets[b].count++;
                buckets[b].bounds = this._unionBoundsTwo(buckets[b].bounds, prim.bounds);
            }
            
            // Compute costs
            for (let i = 0; i < numBuckets - 1; i++) {
                let leftCount = 0, rightCount = 0;
                let leftBounds = null, rightBounds = null;
                
                for (let j = 0; j <= i; j++) {
                    leftCount += buckets[j].count;
                    leftBounds = this._unionBoundsTwo(leftBounds, buckets[j].bounds);
                }
                
                for (let j = i + 1; j < numBuckets; j++) {
                    rightCount += buckets[j].count;
                    rightBounds = this._unionBoundsTwo(rightBounds, buckets[j].bounds);
                }
                
                if (leftCount === 0 || rightCount === 0) continue;
                
                const cost = 1 + (leftCount * this._surfaceArea(leftBounds) + 
                                  rightCount * this._surfaceArea(rightBounds)) / 
                                  this._surfaceArea(bounds);
                
                if (cost < bestCost) {
                    bestCost = cost;
                    bestAxis = axis;
                    bestSplit = i;
                }
            }
        }
        
        if (bestAxis === -1) return null;
        
        // Partition primitives
        const axisName = ['x', 'y', 'z'][bestAxis];
        const extent = bounds.max[axisName] - bounds.min[axisName];
        const splitPos = bounds.min[axisName] + (bestSplit + 1) / numBuckets * extent;
        
        const left = [], right = [];
        for (const prim of primitives) {
            if (prim.centroid[axisName] < splitPos) {
                left.push(prim);
            } else {
                right.push(prim);
            }
        }
        
        return { left, right, axis: bestAxis };
    },
    
    _triangleCentroid: function(tri) {
        return {
            x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
            y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
            z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3
        };
    },
    
    _triangleBounds: function(tri) {
        return {
            min: {
                x: Math.min(tri.v0.x, tri.v1.x, tri.v2.x),
                y: Math.min(tri.v0.y, tri.v1.y, tri.v2.y),
                z: Math.min(tri.v0.z, tri.v1.z, tri.v2.z)
            },
            max: {
                x: Math.max(tri.v0.x, tri.v1.x, tri.v2.x),
                y: Math.max(tri.v0.y, tri.v1.y, tri.v2.y),
                z: Math.max(tri.v0.z, tri.v1.z, tri.v2.z)
            }
        };
    },
    
    _unionBounds: function(boundsList) {
        if (boundsList.length === 0) return null;
        return boundsList.reduce((a, b) => this._unionBoundsTwo(a, b));
    },
    
    _unionBoundsTwo: function(a, b) {
        if (!a) return b;
        if (!b) return a;
        return {
            min: {
                x: Math.min(a.min.x, b.min.x),
                y: Math.min(a.min.y, b.min.y),
                z: Math.min(a.min.z, b.min.z)
            },
            max: {
                x: Math.max(a.max.x, b.max.x),
                y: Math.max(a.max.y, b.max.y),
                z: Math.max(a.max.z, b.max.z)
            }
        };
    },
    
    _surfaceArea: function(bounds) {
        if (!bounds) return 0;
        const d = {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z
        };
        return 2 * (d.x * d.y + d.y * d.z + d.z * d.x);
    },
    
    /**
     * Traverse BVH for ray intersection
     */
    traceBVH: function(bvh, origin, direction) {
        if (!bvh) return null;
        
        const invDir = {
            x: 1 / direction.x,
            y: 1 / direction.y,
            z: 1 / direction.z
        };
        
        return this._traceBVHRecursive(bvh, origin, invDir, Infinity);
    },
    
    _traceBVHRecursive: function(node, origin, invDir, maxT) {
        if (!this._rayBoxIntersect(origin, invDir, node.bounds, maxT)) {
            return null;
        }
        
        if (node.isLeaf) {
            let closest = null;
            for (const tri of node.primitives) {
                const hit = this.rayTriangleIntersect(origin, 
                    { x: 1/invDir.x, y: 1/invDir.y, z: 1/invDir.z }, 
                    tri.v0, tri.v1, tri.v2);
                if (hit && hit.t < maxT && (!closest || hit.t < closest.t)) {
                    closest = hit;
                    maxT = hit.t;
                }
            }
            return closest;
        }
        
        const leftHit = this._traceBVHRecursive(node.left, origin, invDir, maxT);
        if (leftHit) maxT = leftHit.t;
        
        const rightHit = this._traceBVHRecursive(node.right, origin, invDir, maxT);
        
        if (!leftHit) return rightHit;
        if (!rightHit) return leftHit;
        return leftHit.t < rightHit.t ? leftHit : rightHit;
    },
    
    _rayBoxIntersect: function(origin, invDir, bounds, maxT) {
        let tmin = (bounds.min.x - origin.x) * invDir.x;
        let tmax = (bounds.max.x - origin.x) * invDir.x;
        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
        
        let tymin = (bounds.min.y - origin.y) * invDir.y;
        let tymax = (bounds.max.y - origin.y) * invDir.y;
        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
        
        if (tmin > tymax || tymin > tmax) return false;
        
        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;
        
        let tzmin = (bounds.min.z - origin.z) * invDir.z;
        let tzmax = (bounds.max.z - origin.z) * invDir.z;
        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
        
        if (tmin > tzmax || tzmin > tmax) return false;
        
        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;
        
        return tmin < maxT && tmax > 0;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // RAY INTERSECTION (Möller-Trumbore)
    // ─────────────────────────────────────────────────────────────────────────
    
    rayTriangleIntersect: function(origin, direction, v0, v1, v2) {
        const EPSILON = 1e-8;
        
        const edge1 = this._sub(v1, v0);
        const edge2 = this._sub(v2, v0);
        const h = this._cross(direction, edge2);
        const a = this._dot(edge1, h);
        
        if (Math.abs(a) < EPSILON) return null;
        
        const f = 1.0 / a;
        const s = this._sub(origin, v0);
        const u = f * this._dot(s, h);
        
        if (u < 0.0 || u > 1.0) return null;
        
        const q = this._cross(s, edge1);
        const v = f * this._dot(direction, q);
        
        if (v < 0.0 || u + v > 1.0) return null;
        
        const t = f * this._dot(edge2, q);
        
        if (t > EPSILON) {
            return {
                t,
                point: this._add(origin, this._scale(direction, t)),
                normal: this._normalize(this._cross(edge1, edge2)),
                u, v,
                w: 1 - u - v
            };
        }
        
        return null;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // PBR SHADING (GGX Microfacet)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * GGX/Trowbridge-Reitz normal distribution
     * D = α² / (π * ((n·h)²(α²-1) + 1)²)
     */
    ggxDistribution: function(NdotH, roughness) {
        const a = roughness * roughness;
        const a2 = a * a;
        const NdotH2 = NdotH * NdotH;
        const denom = NdotH2 * (a2 - 1) + 1;
        return a2 / (Math.PI * denom * denom);
    },
    
    /**
     * Smith geometry function (GGX)
     * G = G1(l) * G1(v)
     */
    smithGeometry: function(NdotL, NdotV, roughness) {
        const r = roughness + 1;
        const k = (r * r) / 8;
        
        const G1L = NdotL / (NdotL * (1 - k) + k);
        const G1V = NdotV / (NdotV * (1 - k) + k);
        
        return G1L * G1V;
    },
    
    /**
     * Schlick Fresnel approximation
     * F = F0 + (1 - F0)(1 - cosθ)^5
     */
    fresnelSchlick: function(cosTheta, F0) {
        const t = Math.pow(1 - cosTheta, 5);
        return {
            x: F0.x + (1 - F0.x) * t,
            y: F0.y + (1 - F0.y) * t,
            z: F0.z + (1 - F0.z) * t
        };
    },
    
    /**
     * Cook-Torrance specular BRDF
     */
    cookTorranceBRDF: function(params) {
        const { N, V, L, roughness, F0 } = params;
        
        const H = this._normalize(this._add(V, L));
        
        const NdotV = Math.max(0.001, this._dot(N, V));
        const NdotL = Math.max(0.001, this._dot(N, L));
        const NdotH = Math.max(0.001, this._dot(N, H));
        const VdotH = Math.max(0.001, this._dot(V, H));
        
        const D = this.ggxDistribution(NdotH, roughness);
        const G = this.smithGeometry(NdotL, NdotV, roughness);
        const F = this.fresnelSchlick(VdotH, F0);
        
        const specular = {
            x: D * G * F.x / (4 * NdotV * NdotL),
            y: D * G * F.y / (4 * NdotV * NdotL),
            z: D * G * F.z / (4 * NdotV * NdotL)
        };
        
        return specular;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // PATH TRACING UTILITIES
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Cosine-weighted hemisphere sampling
     */
    cosineSampleHemisphere: function(N) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const r = Math.sqrt(u1);
        const theta = 2 * Math.PI * u2;
        
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = Math.sqrt(1 - u1);
        
        // Create local coordinate frame
        const up = Math.abs(N.y) < 0.999 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
        const tangent = this._normalize(this._cross(up, N));
        const bitangent = this._cross(N, tangent);
        
        // Transform to world space
        return {
            direction: this._normalize({
                x: tangent.x * x + bitangent.x * y + N.x * z,
                y: tangent.y * x + bitangent.y * y + N.y * z,
                z: tangent.z * x + bitangent.z * y + N.z * z
            }),
            pdf: z / Math.PI
        };
    },
    
    /**
     * GGX importance sampling
     */
    ggxSampleHalfVector: function(N, roughness) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const a = roughness * roughness;
        const theta = Math.atan(a * Math.sqrt(u1) / Math.sqrt(1 - u1));
        const phi = 2 * Math.PI * u2;
        
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        
        const x = sinTheta * Math.cos(phi);
        const y = sinTheta * Math.sin(phi);
        const z = cosTheta;
        
        const up = Math.abs(N.y) < 0.999 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
        const tangent = this._normalize(this._cross(up, N));
        const bitangent = this._cross(N, tangent);
        
        return this._normalize({
            x: tangent.x * x + bitangent.x * y + N.x * z,
            y: tangent.y * x + bitangent.y * y + N.y * z,
            z: tangent.z * x + bitangent.z * y + N.z * z
        });
    },
    
    /**
     * Russian Roulette for path termination
     */
    russianRoulette: function(throughput, minBounces, currentBounce) {
        if (currentBounce < minBounces) {
            return { continue: true, probability: 1 };
        }
        
        const maxComponent = Math.max(throughput.x, throughput.y, throughput.z);
        const probability = Math.min(0.95, maxComponent);
        
        return {
            continue: Math.random() < probability,
            probability
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // QUATERNION MATH
    // ─────────────────────────────────────────────────────────────────────────
    
    quaternionFromAxisAngle: function(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        return {
            w: Math.cos(halfAngle),
            x: axis.x * s,
            y: axis.y * s,
            z: axis.z * s
        };
    },
    
    quaternionMultiply: function(q1, q2) {
        return {
            w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
            x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
            y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
            z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w
        };
    },
    
    quaternionToMatrix: function(q) {
        const { w, x, y, z } = q;
        return [
            [1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y, 0],
            [2*x*y + 2*w*z, 1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x, 0],
            [2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x*x - 2*y*y, 0],
            [0, 0, 0, 1]
        ];
    },
    
    slerp: function(q1, q2, t) {
        let dot = q1.w*q2.w + q1.x*q2.x + q1.y*q2.y + q1.z*q2.z;
        
        if (dot < 0) {
            q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
            dot = -dot;
        }
        
        if (dot > 0.9995) {
            const result = {
                w: q1.w + t * (q2.w - q1.w),
                x: q1.x + t * (q2.x - q1.x),
                y: q1.y + t * (q2.y - q1.y),
                z: q1.z + t * (q2.z - q1.z)
            };
            const len = Math.sqrt(result.w*result.w + result.x*result.x + 
                                  result.y*result.y + result.z*result.z);
            return { w: result.w/len, x: result.x/len, y: result.y/len, z: result.z/len };
        }
        
        const theta0 = Math.acos(dot);
        const theta = theta0 * t;
        const sinTheta = Math.sin(theta);
        const sinTheta0 = Math.sin(theta0);
        
        const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
        const s1 = sinTheta / sinTheta0;
        
        return {
            w: s0 * q1.w + s1 * q2.w,
            x: s0 * q1.x + s1 * q2.x,
            y: s0 * q1.y + s1 * q2.y,
            z: s0 * q1.z + s1 * q2.z
        };
    },
    
    // Vector utilities
    _dot: function(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
    _cross: function(a, b) {
        return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
    },
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
    },
    _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
    _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
    _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM CAM KERNEL ENHANCED - PASS 2
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CAM_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOOLPATH STRATEGIES
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Adaptive clearing (constant engagement) toolpath
     */
    adaptiveClearingPath: function(boundary, toolRadius, maxEngagement, stepover) {
        const paths = [];
        const effectiveStepover = Math.min(stepover, toolRadius * maxEngagement);
        
        // Generate contour-parallel offsets
        let currentBoundary = this._offsetPolygon(boundary, -toolRadius);
        let level = 0;
        
        while (currentBoundary && currentBoundary.length >= 3 && level < 100) {
            paths.push({
                level,
                points: [...currentBoundary],
                type: 'clearing'
            });
            
            currentBoundary = this._offsetPolygon(currentBoundary, -effectiveStepover);
            level++;
        }
        
        // Add entry helix if needed
        if (paths.length > 0) {
            const center = this._polygonCentroid(paths[paths.length - 1].points);
            paths.unshift({
                type: 'helix_entry',
                center,
                radius: toolRadius * 0.5,
                pitch: toolRadius * 0.1
            });
        }
        
        return paths;
    },
    
    /**
     * Trochoidal milling toolpath
     */
    trochoidalPath: function(startPoint, endPoint, slotWidth, toolRadius, stepover) {
        const path = [];
        const dir = this._normalize2D({
            x: endPoint.x - startPoint.x,
            y: endPoint.y - startPoint.y
        });
        const perp = { x: -dir.y, y: dir.x };
        
        const totalLength = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) +
            Math.pow(endPoint.y - startPoint.y, 2)
        );
        
        const circleRadius = (slotWidth - toolRadius * 2) / 2;
        const numCycles = Math.ceil(totalLength / stepover);
        const pointsPerCircle = 36;
        
        for (let i = 0; i <= numCycles; i++) {
            const progress = i / numCycles;
            const center = {
                x: startPoint.x + dir.x * totalLength * progress,
                y: startPoint.y + dir.y * totalLength * progress
            };
            
            // Generate circle with forward progression
            for (let j = 0; j < pointsPerCircle; j++) {
                const angle = (j / pointsPerCircle) * 2 * Math.PI;
                const extraProgress = (j / pointsPerCircle) * (stepover / totalLength);
                
                path.push({
                    x: center.x + dir.x * totalLength * extraProgress + 
                       circleRadius * Math.cos(angle),
                    y: center.y + dir.y * totalLength * extraProgress + 
                       circleRadius * Math.sin(angle),
                    z: startPoint.z || 0
                });
            }
        }
        
        return path;
    },
    
    /**
     * Spiral pocket toolpath (efficient for circular/round pockets)
     */
    spiralPocketPath: function(center, outerRadius, toolRadius, stepover, direction = 'inward') {
        const path = [];
        const effectiveRadius = outerRadius - toolRadius;
        
        if (direction === 'inward') {
            let r = effectiveRadius;
            let angle = 0;
            
            while (r > stepover) {
                const deltaAngle = stepover / r;
                path.push({
                    x: center.x + r * Math.cos(angle),
                    y: center.y + r * Math.sin(angle),
                    z: center.z || 0
                });
                angle += deltaAngle;
                r -= stepover * deltaAngle / (2 * Math.PI);
            }
        } else {
            // Outward spiral
            let r = stepover;
            let angle = 0;
            
            while (r < effectiveRadius) {
                const deltaAngle = stepover / r;
                path.push({
                    x: center.x + r * Math.cos(angle),
                    y: center.y + r * Math.sin(angle),
                    z: center.z || 0
                });
                angle += deltaAngle;
                r += stepover * deltaAngle / (2 * Math.PI);
            }
        }
        
        return path;
    },
    
    /**
     * Contour-parallel (offset) pocket strategy
     */
    contourParallelPocket: function(boundary, toolRadius, stepover) {
        const contours = [];
        let current = this._offsetPolygon(boundary, -toolRadius);
        
        while (current && current.length >= 3) {
            contours.push([...current]);
            current = this._offsetPolygon(current, -stepover);
        }
        
        return contours;
    },
    
    /**
     * Zigzag/raster toolpath
     */
    zigzagPath: function(boundary, stepover, angle = 0) {
        const bounds = this._getBounds(boundary);
        const path = [];
        
        const cos_a = Math.cos(angle);
        const sin_a = Math.sin(angle);
        
        const diagonal = Math.sqrt(
            Math.pow(bounds.maxX - bounds.minX, 2) +
            Math.pow(bounds.maxY - bounds.minY, 2)
        );
        
        const numLines = Math.ceil(diagonal / stepover);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        
        for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2) * stepover;
            
            // Line perpendicular to angle direction
            const lineStart = {
                x: cx - sin_a * diagonal + cos_a * offset,
                y: cy + cos_a * diagonal + sin_a * offset
            };
            const lineEnd = {
                x: cx + sin_a * diagonal + cos_a * offset,
                y: cy - cos_a * diagonal + sin_a * offset
            };
            
            const intersections = this._linePolygonIntersections(lineStart, lineEnd, boundary);
            
            if (intersections.length >= 2) {
                intersections.sort((a, b) => {
                    const da = Math.pow(a.x - lineStart.x, 2) + Math.pow(a.y - lineStart.y, 2);
                    const db = Math.pow(b.x - lineStart.x, 2) + Math.pow(b.y - lineStart.y, 2);
                    return da - db;
                });
                
                // Zigzag: alternate direction
                if (i % 2 === 0) {
                    path.push(intersections[0], intersections[1]);
                } else {
                    path.push(intersections[1], intersections[0]);
                }
            }
        }
        
        return path;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // CUTTING PHYSICS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Merchant's cutting force model
     */
    merchantCuttingForce: function(params) {
        const {
            chipThickness,      // h (mm)
            width,              // b (mm)
            rakeAngle,          // α (radians)
            frictionAngle,      // β (radians)
            shearStrength       // τs (MPa)
        } = params;
        
        // Shear angle from Merchant's minimum energy criterion
        const phi = Math.PI / 4 - (frictionAngle - rakeAngle) / 2;
        
        // Shear plane area
        const As = (chipThickness * width) / Math.sin(phi);
        
        // Shear force
        const Fs = shearStrength * As;
        
        // Resultant force
        const R = Fs / Math.cos(phi + frictionAngle - rakeAngle);
        
        // Cutting force (tangential)
        const Fc = R * Math.cos(frictionAngle - rakeAngle);
        
        // Thrust force (feed direction)
        const Ft = R * Math.sin(frictionAngle - rakeAngle);
        
        // Friction force
        const Ff = R * Math.sin(frictionAngle);
        
        // Normal force on rake face
        const Fn = R * Math.cos(frictionAngle);
        
        return {
            shearAngle: phi,
            shearForce: Fs,
            cuttingForce: Fc,
            thrustForce: Ft,
            frictionForce: Ff,
            normalForce: Fn,
            resultantForce: R,
            specificCuttingEnergy: Fc / (chipThickness * width),
            chipRatio: Math.cos(phi - rakeAngle) / Math.sin(phi)
        };
    },
    
    /**
     * Extended Taylor tool life equation
     * VT^n * f^a * d^b = C
     */
    taylorToolLife: function(params) {
        const {
            cuttingSpeed,   // V (m/min)
            feed = 1,       // f (mm/rev) - optional
            depth = 1,      // d (mm) - optional
            C,              // Taylor constant
            n,              // Speed exponent (typically 0.1-0.5)
            a = 0,          // Feed exponent
            b = 0           // Depth exponent
        } = params;
        
        const effectiveC = C / (Math.pow(feed, a) * Math.pow(depth, b));
        const toolLife = Math.pow(effectiveC / cuttingSpeed, 1 / n);
        
        return {
            toolLife,           // minutes
            cuttingLength: toolLife * cuttingSpeed * 1000, // mm
            constants: { C, n, a, b }
        };
    },
    
    /**
     * Surface roughness prediction
     * Ra = f² / (32 * R) for round nose tool
     */
    surfaceRoughness: function(params) {
        const { feed, noseRadius, operation = 'turning' } = params;
        
        if (operation === 'turning') {
            // Theoretical Ra for round nose tool
            const Ra = (feed * feed) / (32 * noseRadius);
            const Rz = Ra * 4;  // Approximate Rz
            return { Ra, Rz, theoretical: true };
        }
        
        if (operation === 'milling') {
            // Scallop height for ball end mill
            const { stepover, toolRadius } = params;
            const scallop = toolRadius - Math.sqrt(toolRadius * toolRadius - stepover * stepover / 4);
            return { Ra: scallop * 0.25, Rz: scallop, scallop };
        }
        
        return { Ra: 0, Rz: 0 };
    },
    
    /**
     * Material Removal Rate
     */
    materialRemovalRate: function(params) {
        const { operation = 'turning' } = params;
        
        if (operation === 'turning') {
            const { cuttingSpeed, feed, depth } = params;
            // MRR = V * f * d (cm³/min)
            return cuttingSpeed * feed * depth / 1000;
        }
        
        if (operation === 'milling') {
            const { stepover, axialDepth, feedRate, numFlutes = 1 } = params;
            // MRR = ae * ap * Vf (cm³/min)
            return stepover * axialDepth * feedRate / 1000;
        }
        
        return 0;
    },
    
    /**
     * Chip thickness calculation for milling
     */
    chipThickness: function(params) {
        const {
            feedPerTooth,       // fz (mm/tooth)
            radialEngagement,   // ae (mm)
            toolDiameter,       // D (mm)
            operation = 'peripheral'
        } = params;
        
        const engagementAngle = Math.acos(1 - 2 * radialEngagement / toolDiameter);
        
        if (operation === 'peripheral') {
            // Average chip thickness
            const hm = feedPerTooth * Math.sin(engagementAngle / 2);
            // Maximum chip thickness
            const hmax = feedPerTooth * Math.sin(engagementAngle);
            return { average: hm, maximum: hmax, engagementAngle };
        }
        
        return { average: feedPerTooth, maximum: feedPerTooth };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // COLLISION & GOUGE DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Check tool-surface interference (gouge)
     */
    checkGouge: function(toolPos, toolAxis, toolRadius, surfacePoint, surfaceNormal) {
        // Vector from tool position to surface point
        const toSurface = {
            x: surfacePoint.x - toolPos.x,
            y: surfacePoint.y - toolPos.y,
            z: surfacePoint.z - toolPos.z
        };
        
        // Axial distance (along tool axis)
        const axialDist = this._dot3D(toSurface, toolAxis);
        
        // Radial vector (perpendicular to tool axis)
        const radialVec = {
            x: toSurface.x - axialDist * toolAxis.x,
            y: toSurface.y - axialDist * toolAxis.y,
            z: toSurface.z - axialDist * toolAxis.z
        };
        
        const radialDist = Math.sqrt(this._dot3D(radialVec, radialVec));
        
        // Gouge occurs if point is within tool radius and below tool tip
        const gouged = radialDist < toolRadius && axialDist > 0;
        
        return {
            gouged,
            axialDistance: axialDist,
            radialDistance: radialDist,
            margin: radialDist - toolRadius
        };
    },
    
    /**
     * Calculate tool orientation for 5-axis machining
     */
    fiveAxisToolOrientation: function(surfaceNormal, leadAngle, tiltAngle) {
        // Start with tool along -Z (pointing down)
        let toolAxis = { x: 0, y: 0, z: -1 };
        
        // Apply lead angle (rotation around feed direction)
        const leadRad = leadAngle * Math.PI / 180;
        // Apply tilt angle (rotation perpendicular to feed)
        const tiltRad = tiltAngle * Math.PI / 180;
        
        // Create rotation to align with surface normal
        // This is a simplified version - full implementation would use quaternions
        const dot = -surfaceNormal.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        if (Math.abs(angle) > 0.001) {
            const axis = this._normalize3D({
                x: surfaceNormal.y,
                y: -surfaceNormal.x,
                z: 0
            });
            
            const cos_a = Math.cos(angle + leadRad);
            const sin_a = Math.sin(angle + leadRad);
            
            toolAxis = {
                x: axis.x * axis.x * (1 - cos_a) + cos_a,
                y: axis.x * axis.y * (1 - cos_a) + axis.z * sin_a,
                z: axis.x * axis.z * (1 - cos_a) - axis.y * sin_a
            };
        }
        
        return this._normalize3D(toolAxis);
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    _offsetPolygon: function(polygon, offset) {
        if (!polygon || polygon.length < 3) return null;
        
        const result = [];
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const prev = polygon[(i - 1 + n) % n];
            const curr = polygon[i];
            const next = polygon[(i + 1) % n];
            
            const e1 = this._normalize2D({ x: curr.x - prev.x, y: curr.y - prev.y });
            const e2 = this._normalize2D({ x: next.x - curr.x, y: next.y - curr.y });
            
            const n1 = { x: -e1.y, y: e1.x };
            const n2 = { x: -e2.y, y: e2.x };
            
            const bisector = this._normalize2D({
                x: n1.x + n2.x,
                y: n1.y + n2.y
            });
            
            const dot = n1.x * bisector.x + n1.y * bisector.y;
            const d = Math.abs(dot) > 0.001 ? offset / dot : offset;
            
            result.push({
                x: curr.x + bisector.x * d,
                y: curr.y + bisector.y * d
            });
        }
        
        // Validate result
        const area = this._polygonArea(result);
        if (Math.abs(area) < 1e-6) return null;
        
        return result;
    },
    
    _polygonArea: function(polygon) {
        let area = 0;
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            area += polygon[i].x * polygon[j].y;
            area -= polygon[j].x * polygon[i].y;
        }
        return area / 2;
    },
    
    _polygonCentroid: function(polygon) {
        let cx = 0, cy = 0;
        for (const p of polygon) {
            cx += p.x;
            cy += p.y;
        }
        return { x: cx / polygon.length, y: cy / polygon.length };
    },
    
    _getBounds: function(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },
    
    _linePolygonIntersections: function(lineStart, lineEnd, polygon) {
        const intersections = [];
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];
            
            const int = this._lineLineIntersection(lineStart, lineEnd, p1, p2);
            if (int) intersections.push(int);
        }
        
        return intersections;
    },
    
    _lineLineIntersection: function(a1, a2, b1, b2) {
        const d = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
        if (Math.abs(d) < 1e-10) return null;
        
        const t = ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / d;
        const u = -((a1.x - a2.x) * (a1.y - b1.y) - (a1.y - a2.y) * (a1.x - b1.x)) / d;
        
        if (u >= 0 && u <= 1) {
            return {
                x: a1.x + t * (a2.x - a1.x),
                y: a1.y + t * (a2.y - a1.y)
            };
        }
        
        return null;
    },
    
    _normalize2D: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        return len > 0 ? { x: v.x / len, y: v.y / len } : v;
    },
    
    _normalize3D: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
    },
    
    _dot3D: function(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

if (typeof PRISM_GATEWAY !== 'undefined') {
    // CAD Kernel routes
    PRISM_GATEWAY.register('cad.bspline.basis', 'PRISM_CAD_KERNEL_PASS2.basisFunction');
    PRISM_GATEWAY.register('cad.bspline.basisDeriv', 'PRISM_CAD_KERNEL_PASS2.basisFunctionDerivative');
    PRISM_GATEWAY.register('cad.bspline.evaluateCurve', 'PRISM_CAD_KERNEL_PASS2.evaluateBSplineCurve');
    PRISM_GATEWAY.register('cad.bspline.evaluateCurveDeriv', 'PRISM_CAD_KERNEL_PASS2.evaluateBSplineCurveDerivative');
    PRISM_GATEWAY.register('cad.nurbs.evaluateCurve', 'PRISM_CAD_KERNEL_PASS2.evaluateNURBSCurve');
    PRISM_GATEWAY.register('cad.bspline.evaluateSurface', 'PRISM_CAD_KERNEL_PASS2.evaluateBSplineSurface');
    PRISM_GATEWAY.register('cad.bspline.surfaceDerivs', 'PRISM_CAD_KERNEL_PASS2.evaluateSurfaceDerivatives');
    PRISM_GATEWAY.register('cad.surface.normal', 'PRISM_CAD_KERNEL_PASS2.surfaceNormal');
    PRISM_GATEWAY.register('cad.surface.curvatures', 'PRISM_CAD_KERNEL_PASS2.surfaceCurvatures');
    PRISM_GATEWAY.register('cad.surface.firstForm', 'PRISM_CAD_KERNEL_PASS2.firstFundamentalForm');
    PRISM_GATEWAY.register('cad.surface.secondForm', 'PRISM_CAD_KERNEL_PASS2.secondFundamentalForm');
    PRISM_GATEWAY.register('cad.knots.uniform', 'PRISM_CAD_KERNEL_PASS2.createUniformKnots');
    PRISM_GATEWAY.register('cad.knots.insert', 'PRISM_CAD_KERNEL_PASS2.insertKnot');
    PRISM_GATEWAY.register('cad.mesh.delaunay', 'PRISM_CAD_KERNEL_PASS2.delaunayTriangulate');
    PRISM_GATEWAY.register('cad.mesh.voronoi', 'PRISM_CAD_KERNEL_PASS2.voronoiFromDelaunay');
    PRISM_GATEWAY.register('cad.mesh.catmullClark', 'PRISM_CAD_KERNEL_PASS2.catmullClarkSubdivide');
    
    // Graphics Kernel routes
    PRISM_GATEWAY.register('graphics.bvh.build', 'PRISM_GRAPHICS_KERNEL_PASS2.buildBVH');
    PRISM_GATEWAY.register('graphics.bvh.trace', 'PRISM_GRAPHICS_KERNEL_PASS2.traceBVH');
    PRISM_GATEWAY.register('graphics.ray.triangle', 'PRISM_GRAPHICS_KERNEL_PASS2.rayTriangleIntersect');
    PRISM_GATEWAY.register('graphics.brdf.ggx', 'PRISM_GRAPHICS_KERNEL_PASS2.ggxDistribution');
    PRISM_GATEWAY.register('graphics.brdf.smith', 'PRISM_GRAPHICS_KERNEL_PASS2.smithGeometry');
    PRISM_GATEWAY.register('graphics.brdf.fresnel', 'PRISM_GRAPHICS_KERNEL_PASS2.fresnelSchlick');
    PRISM_GATEWAY.register('graphics.brdf.cookTorrance', 'PRISM_GRAPHICS_KERNEL_PASS2.cookTorranceBRDF');
    PRISM_GATEWAY.register('graphics.sample.cosine', 'PRISM_GRAPHICS_KERNEL_PASS2.cosineSampleHemisphere');
    PRISM_GATEWAY.register('graphics.sample.ggx', 'PRISM_GRAPHICS_KERNEL_PASS2.ggxSampleHalfVector');
    PRISM_GATEWAY.register('graphics.pathTrace.rr', 'PRISM_GRAPHICS_KERNEL_PASS2.russianRoulette');
    PRISM_GATEWAY.register('graphics.quat.fromAxisAngle', 'PRISM_GRAPHICS_KERNEL_PASS2.quaternionFromAxisAngle');
    PRISM_GATEWAY.register('graphics.quat.multiply', 'PRISM_GRAPHICS_KERNEL_PASS2.quaternionMultiply');
    PRISM_GATEWAY.register('graphics.quat.toMatrix', 'PRISM_GRAPHICS_KERNEL_PASS2.quaternionToMatrix');
    PRISM_GATEWAY.register('graphics.quat.slerp', 'PRISM_GRAPHICS_KERNEL_PASS2.slerp');
    
    // CAM Kernel routes
    PRISM_GATEWAY.register('cam.toolpath.adaptive', 'PRISM_CAM_KERNEL_PASS2.adaptiveClearingPath');
    PRISM_GATEWAY.register('cam.toolpath.trochoidal', 'PRISM_CAM_KERNEL_PASS2.trochoidalPath');
    PRISM_GATEWAY.register('cam.toolpath.spiral', 'PRISM_CAM_KERNEL_PASS2.spiralPocketPath');
    PRISM_GATEWAY.register('cam.toolpath.contourParallel', 'PRISM_CAM_KERNEL_PASS2.contourParallelPocket');
    PRISM_GATEWAY.register('cam.toolpath.zigzag', 'PRISM_CAM_KERNEL_PASS2.zigzagPath');
    PRISM_GATEWAY.register('cam.physics.merchant', 'PRISM_CAM_KERNEL_PASS2.merchantCuttingForce');
    PRISM_GATEWAY.register('cam.physics.taylor', 'PRISM_CAM_KERNEL_PASS2.taylorToolLife');
    PRISM_GATEWAY.register('cam.physics.roughness', 'PRISM_CAM_KERNEL_PASS2.surfaceRoughness');
    PRISM_GATEWAY.register('cam.physics.mrr', 'PRISM_CAM_KERNEL_PASS2.materialRemovalRate');
    PRISM_GATEWAY.register('cam.physics.chipThickness', 'PRISM_CAM_KERNEL_PASS2.chipThickness');
    PRISM_GATEWAY.register('cam.collision.gouge', 'PRISM_CAM_KERNEL_PASS2.checkGouge');
    PRISM_GATEWAY.register('cam.fiveAxis.orientation', 'PRISM_CAM_KERNEL_PASS2.fiveAxisToolOrientation');
    
    console.log('[PRISM] Enhanced Kernel Pass 2 - 45 gateway routes registered');
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

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
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_CAD_KERNEL_PASS2,
        PRISM_GRAPHICS_KERNEL_PASS2,
        PRISM_CAM_KERNEL_PASS2,
        PRISM_PASS2_TESTS
    };
}

console.log('[PRISM] Enhanced CAD/CAM/Graphics Kernel Pass 2 loaded');
console.log('[PRISM] CAD: B-spline/NURBS, Delaunay, Voronoi, Catmull-Clark');
console.log('[PRISM] Graphics: BVH+SAH, PBR/GGX, Path tracing, Quaternions');
console.log('[PRISM] CAM: Adaptive, Trochoidal, Merchant, Taylor');

/**
 * PRISM BATCH 11: SIGNAL PROCESSING
 * Source: MIT 6.003, 6.341
 * 
 * Algorithms: FFT, Filtering, Wavelets, Spectral Analysis, Chatter Detection
 * Gateway Routes: 24
 */

const PRISM_SIGNAL = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FFT (Fast Fourier Transform)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute FFT using Cooley-Tukey algorithm
   */
  fft: function(signal) {
    const N = signal.length;
    
    // Pad to power of 2 if needed
    const n = Math.pow(2, Math.ceil(Math.log2(N)));
    const padded = [...signal, ...Array(n - N).fill(0)];
    
    // Convert to complex if not already
    const complex = padded.map(x => 
      typeof x === 'object' ? x : { re: x, im: 0 }
    );
    
    return this._fftRecursive(complex);
  },
  
  _fftRecursive: function(x) {
    const N = x.length;
    
    if (N <= 1) return x;
    
    // Split even and odd
    const even = x.filter((_, i) => i % 2 === 0);
    const odd = x.filter((_, i) => i % 2 === 1);
    
    // Recursive FFT
    const E = this._fftRecursive(even);
    const O = this._fftRecursive(odd);
    
    // Combine
    const result = new Array(N);
    for (let k = 0; k < N / 2; k++) {
      const angle = -2 * Math.PI * k / N;
      const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };
      
      const to = this._complexMul(twiddle, O[k]);
      
      result[k] = {
        re: E[k].re + to.re,
        im: E[k].im + to.im
      };
      result[k + N / 2] = {
        re: E[k].re - to.re,
        im: E[k].im - to.im
      };
    }
    
    return result;
  },
  
  /**
   * Inverse FFT
   */
  ifft: function(spectrum) {
    const N = spectrum.length;
    
    // Conjugate, FFT, conjugate, scale
    const conjugated = spectrum.map(x => ({ re: x.re, im: -x.im }));
    const transformed = this.fft(conjugated);
    
    return transformed.map(x => ({
      re: x.re / N,
      im: -x.im / N
    }));
  },
  
  /**
   * Compute magnitude spectrum
   */
  magnitude: function(spectrum) {
    return spectrum.map(x => Math.sqrt(x.re * x.re + x.im * x.im));
  },
  
  /**
   * Compute phase spectrum
   */
  phase: function(spectrum) {
    return spectrum.map(x => Math.atan2(x.im, x.re));
  },
  
  /**
   * Power Spectral Density
   */
  powerSpectralDensity: function(signal, fs = 1, window = 'hanning') {
    const windowed = this.applyWindow(signal, window);
    const spectrum = this.fft(windowed);
    const mag = this.magnitude(spectrum);
    const N = signal.length;
    
    // One-sided PSD (positive frequencies only)
    const psd = [];
    const freqs = [];
    
    for (let k = 0; k <= N / 2; k++) {
      psd.push((mag[k] * mag[k]) / (N * fs));
      freqs.push(k * fs / N);
    }
    
    // Double for one-sided (except DC and Nyquist)
    for (let k = 1; k < psd.length - 1; k++) {
      psd[k] *= 2;
    }
    
    return { psd, frequencies: freqs };
  },
  
  _complexMul: function(a, b) {
    return {
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOW FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  hanningWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))));
    }
    return w;
  },
  
  hammingWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)));
    }
    return w;
  },
  
  blackmanWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) 
             + 0.08 * Math.cos(4 * Math.PI * n / (N - 1)));
    }
    return w;
  },
  
  flatTopWindow: function(N) {
    const a0 = 0.21557895, a1 = 0.41663158, a2 = 0.277263158;
    const a3 = 0.083578947, a4 = 0.006947368;
    const w = [];
    for (let n = 0; n < N; n++) {
      const x = 2 * Math.PI * n / (N - 1);
      w.push(a0 - a1*Math.cos(x) + a2*Math.cos(2*x) - a3*Math.cos(3*x) + a4*Math.cos(4*x));
    }
    return w;
  },
  
  applyWindow: function(signal, windowType = 'hanning') {
    const N = signal.length;
    let window;
    
    switch (windowType.toLowerCase()) {
      case 'hanning': case 'hann':
        window = this.hanningWindow(N);
        break;
      case 'hamming':
        window = this.hammingWindow(N);
        break;
      case 'blackman':
        window = this.blackmanWindow(N);
        break;
      case 'flattop':
        window = this.flatTopWindow(N);
        break;
      case 'rectangular': case 'none':
        return [...signal];
      default:
        window = this.hanningWindow(N);
    }
    
    return signal.map((x, i) => x * window[i]);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DIGITAL FILTERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Design Butterworth low-pass filter coefficients
   */
  lowpassFilter: function(config) {
    const { cutoff, fs, order = 2 } = config;
    const fc = cutoff / (fs / 2); // Normalized frequency
    
    // Simplified 2nd order Butterworth
    const wc = Math.tan(Math.PI * fc);
    const wc2 = wc * wc;
    const sqrt2 = Math.sqrt(2);
    
    const k1 = sqrt2 * wc;
    const k2 = wc2;
    const a0 = k2 / (1 + k1 + k2);
    const a1 = 2 * a0;
    const a2 = a0;
    const b1 = 2 * (k2 - 1) / (1 + k1 + k2);
    const b2 = (1 - k1 + k2) / (1 + k1 + k2);
    
    return {
      b: [a0, a1, a2],
      a: [1, b1, b2],
      type: 'lowpass',
      cutoff,
      fs,
      order
    };
  },
  
  /**
   * Design Butterworth high-pass filter coefficients
   */
  highpassFilter: function(config) {
    const { cutoff, fs, order = 2 } = config;
    const fc = cutoff / (fs / 2);
    
    const wc = Math.tan(Math.PI * fc);
    const wc2 = wc * wc;
    const sqrt2 = Math.sqrt(2);
    
    const k1 = sqrt2 * wc;
    const k2 = wc2;
    const a0 = 1 / (1 + k1 + k2);
    const a1 = -2 * a0;
    const a2 = a0;
    const b1 = 2 * (k2 - 1) / (1 + k1 + k2);
    const b2 = (1 - k1 + k2) / (1 + k1 + k2);
    
    return {
      b: [a0, a1, a2],
      a: [1, b1, b2],
      type: 'highpass',
      cutoff,
      fs,
      order
    };
  },
  
  /**
   * Design bandpass filter
   */
  bandpassFilter: function(config) {
    const { lowCutoff, highCutoff, fs, order = 2 } = config;
    
    // Combine low-pass and high-pass
    const lp = this.lowpassFilter({ cutoff: highCutoff, fs, order });
    const hp = this.highpassFilter({ cutoff: lowCutoff, fs, order });
    
    return {
      lowpass: lp,
      highpass: hp,
      type: 'bandpass',
      lowCutoff,
      highCutoff,
      fs
    };
  },
  
  /**
   * Design notch filter
   */
  notchFilter: function(config) {
    const { frequency, Q = 30, fs } = config;
    const w0 = 2 * Math.PI * frequency / fs;
    const bw = w0 / Q;
    
    const b0 = 1;
    const b1 = -2 * Math.cos(w0);
    const b2 = 1;
    const a0 = 1 + Math.sin(bw);
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - Math.sin(bw);
    
    return {
      b: [b0/a0, b1/a0, b2/a0],
      a: [1, a1/a0, a2/a0],
      type: 'notch',
      frequency,
      Q,
      fs
    };
  },
  
  /**
   * Apply IIR filter to signal
   */
  applyFilter: function(signal, filter) {
    const { b, a } = filter;
    const y = new Array(signal.length).fill(0);
    const x = signal;
    
    for (let n = 0; n < signal.length; n++) {
      // Feedforward
      for (let k = 0; k < b.length; k++) {
        if (n - k >= 0) {
          y[n] += b[k] * x[n - k];
        }
      }
      // Feedback
      for (let k = 1; k < a.length; k++) {
        if (n - k >= 0) {
          y[n] -= a[k] * y[n - k];
        }
      }
    }
    
    // For bandpass, cascade the two filters
    if (filter.type === 'bandpass') {
      const yLp = this.applyFilter(signal, filter.lowpass);
      return this.applyFilter(yLp, filter.highpass);
    }
    
    return y;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WAVELET TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Discrete Wavelet Transform decomposition
   */
  dwtDecompose: function(signal, wavelet = 'haar', levels = 3) {
    const coeffs = { approximation: null, details: [] };
    let approx = [...signal];
    
    for (let level = 0; level < levels; level++) {
      const { cA, cD } = this._dwtStep(approx, wavelet);
      coeffs.details.unshift(cD);
      approx = cA;
    }
    
    coeffs.approximation = approx;
    return coeffs;
  },
  
  _dwtStep: function(signal, wavelet) {
    // Get wavelet filter coefficients
    const { lo, hi } = this._getWaveletFilters(wavelet);
    
    // Convolve and downsample
    const cA = this._convolveDownsample(signal, lo);
    const cD = this._convolveDownsample(signal, hi);
    
    return { cA, cD };
  },
  
  _getWaveletFilters: function(wavelet) {
    switch (wavelet.toLowerCase()) {
      case 'haar':
        const h = 1 / Math.sqrt(2);
        return { lo: [h, h], hi: [h, -h] };
      case 'db4':
        return {
          lo: [0.4829629131, 0.8365163037, 0.2241438680, -0.1294095226],
          hi: [-0.1294095226, -0.2241438680, 0.8365163037, -0.4829629131]
        };
      default:
        const hh = 1 / Math.sqrt(2);
        return { lo: [hh, hh], hi: [hh, -hh] };
    }
  },
  
  _convolveDownsample: function(signal, filter) {
    const result = [];
    const N = signal.length;
    const M = filter.length;
    
    for (let n = 0; n < N; n += 2) {
      let sum = 0;
      for (let k = 0; k < M; k++) {
        const idx = n - k;
        if (idx >= 0 && idx < N) {
          sum += filter[k] * signal[idx];
        }
      }
      result.push(sum);
    }
    
    return result;
  },
  
  /**
   * Inverse DWT reconstruction
   */
  dwtReconstruct: function(coeffs, wavelet = 'haar') {
    let approx = coeffs.approximation;
    
    for (const detail of coeffs.details) {
      approx = this._idwtStep(approx, detail, wavelet);
    }
    
    return approx;
  },
  
  _idwtStep: function(cA, cD, wavelet) {
    const { lo, hi } = this._getWaveletFilters(wavelet);
    const N = cA.length * 2;
    const result = new Array(N).fill(0);
    
    // Upsample and convolve
    for (let n = 0; n < cA.length; n++) {
      for (let k = 0; k < lo.length; k++) {
        const idx = 2 * n + k;
        if (idx < N) {
          result[idx] += lo[k] * cA[n] + hi[k] * cD[n];
        }
      }
    }
    
    return result;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPECTRAL FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  
  spectralCentroid: function(magnitude, fs) {
    const N = magnitude.length;
    let num = 0, den = 0;
    
    for (let k = 0; k < N / 2; k++) {
      const freq = k * fs / N;
      num += freq * magnitude[k];
      den += magnitude[k];
    }
    
    return den > 0 ? num / den : 0;
  },
  
  spectralBandwidth: function(magnitude, fs, centroid = null) {
    const N = magnitude.length;
    const sc = centroid || this.spectralCentroid(magnitude, fs);
    
    let num = 0, den = 0;
    for (let k = 0; k < N / 2; k++) {
      const freq = k * fs / N;
      num += Math.pow(freq - sc, 2) * magnitude[k];
      den += magnitude[k];
    }
    
    return den > 0 ? Math.sqrt(num / den) : 0;
  },
  
  spectralRolloff: function(magnitude, threshold = 0.85) {
    const totalEnergy = magnitude.reduce((sum, m) => sum + m * m, 0);
    const targetEnergy = threshold * totalEnergy;
    
    let cumulativeEnergy = 0;
    for (let k = 0; k < magnitude.length; k++) {
      cumulativeEnergy += magnitude[k] * magnitude[k];
      if (cumulativeEnergy >= targetEnergy) {
        return k;
      }
    }
    
    return magnitude.length - 1;
  },
  
  rmsEnergy: function(signal) {
    const sumSquares = signal.reduce((sum, x) => sum + x * x, 0);
    return Math.sqrt(sumSquares / signal.length);
  },
  
  zeroCrossingRate: function(signal) {
    let crossings = 0;
    for (let n = 1; n < signal.length; n++) {
      if ((signal[n] >= 0 && signal[n - 1] < 0) || 
          (signal[n] < 0 && signal[n - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / signal.length;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIME-FREQUENCY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Short-Time Fourier Transform
   */
  stft: function(signal, windowSize, hopSize, windowType = 'hanning') {
    const spectrogram = [];
    const window = this[windowType + 'Window'](windowSize);
    
    for (let start = 0; start + windowSize <= signal.length; start += hopSize) {
      const segment = signal.slice(start, start + windowSize);
      const windowed = segment.map((x, i) => x * window[i]);
      const spectrum = this.fft(windowed);
      const mag = this.magnitude(spectrum);
      spectrogram.push(mag.slice(0, windowSize / 2 + 1));
    }
    
    return spectrogram;
  },
  
  /**
   * Hilbert Transform (simplified via FFT)
   */
  hilbertTransform: function(signal) {
    const N = signal.length;
    const spectrum = this.fft(signal);
    
    // Zero negative frequencies, double positive
    const analytic = spectrum.map((x, k) => {
      if (k === 0 || k === N / 2) return x;
      if (k < N / 2) return { re: 2 * x.re, im: 2 * x.im };
      return { re: 0, im: 0 };
    });
    
    const analyticSignal = this.ifft(analytic);
    
    return {
      real: analyticSignal.map(x => x.re),
      imag: analyticSignal.map(x => x.im)
    };
  },
  
  /**
   * Compute signal envelope
   */
  envelope: function(signal) {
    const { real, imag } = this.hilbertTransform(signal);
    return real.map((r, i) => Math.sqrt(r * r + imag[i] * imag[i]));
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHATTER DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Detect chatter in machining signal
   */
  detectChatter: function(signal, fs, config = {}) {
    const {
      chatterFreqMin = 500,
      chatterFreqMax = 5000,
      threshold = 0.3
    } = config;
    
    // Compute spectrum
    const windowed = this.applyWindow(signal, 'hanning');
    const spectrum = this.fft(windowed);
    const magnitude = this.magnitude(spectrum);
    
    const N = signal.length;
    const binMin = Math.floor(chatterFreqMin * N / fs);
    const binMax = Math.ceil(chatterFreqMax * N / fs);
    
    // Energy in chatter band
    let chatterEnergy = 0;
    let totalEnergy = 0;
    let peakBin = 0;
    let peakValue = 0;
    
    for (let k = 0; k < N / 2; k++) {
      const energy = magnitude[k] * magnitude[k];
      totalEnergy += energy;
      
      if (k >= binMin && k <= binMax) {
        chatterEnergy += energy;
        if (magnitude[k] > peakValue) {
          peakValue = magnitude[k];
          peakBin = k;
        }
      }
    }
    
    const chatterIndex = chatterEnergy / (totalEnergy + 1e-10);
    const peakFrequency = peakBin * fs / N;
    
    return {
      chatterDetected: chatterIndex > threshold,
      chatterIndex,
      peakFrequency,
      peakMagnitude: peakValue,
      severity: chatterIndex < 0.3 ? 'stable' : 
                chatterIndex < 0.5 ? 'warning' : 'chatter'
    };
  },
  
  /**
   * Compute chatter index
   */
  chatterIndex: function(magnitude, fs, chatterFreqMin, chatterFreqMax) {
    const N = magnitude.length * 2; // Assuming one-sided spectrum
    const binMin = Math.floor(chatterFreqMin * N / fs);
    const binMax = Math.ceil(chatterFreqMax * N / fs);
    
    let chatterEnergy = 0;
    let totalEnergy = 0;
    
    for (let k = 0; k < magnitude.length; k++) {
      const energy = magnitude[k] * magnitude[k];
      totalEnergy += energy;
      if (k >= binMin && k <= binMax) {
        chatterEnergy += energy;
      }
    }
    
    return totalEnergy > 0 ? chatterEnergy / totalEnergy : 0;
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH11_GATEWAY_ROUTES = {
  // FFT
  'signal.fft.forward': 'PRISM_SIGNAL.fft',
  'signal.fft.inverse': 'PRISM_SIGNAL.ifft',
  'signal.fft.magnitude': 'PRISM_SIGNAL.magnitude',
  'signal.fft.phase': 'PRISM_SIGNAL.phase',
  'signal.fft.psd': 'PRISM_SIGNAL.powerSpectralDensity',
  
  // Windowing
  'signal.window.hanning': 'PRISM_SIGNAL.hanningWindow',
  'signal.window.hamming': 'PRISM_SIGNAL.hammingWindow',
  'signal.window.blackman': 'PRISM_SIGNAL.blackmanWindow',
  'signal.window.apply': 'PRISM_SIGNAL.applyWindow',
  
  // Filtering
  'signal.filter.lowpass': 'PRISM_SIGNAL.lowpassFilter',
  'signal.filter.highpass': 'PRISM_SIGNAL.highpassFilter',
  'signal.filter.bandpass': 'PRISM_SIGNAL.bandpassFilter',
  'signal.filter.notch': 'PRISM_SIGNAL.notchFilter',
  'signal.filter.apply': 'PRISM_SIGNAL.applyFilter',
  
  // Wavelets
  'signal.wavelet.dwt': 'PRISM_SIGNAL.dwtDecompose',
  'signal.wavelet.idwt': 'PRISM_SIGNAL.dwtReconstruct',
  
  // Features
  'signal.features.centroid': 'PRISM_SIGNAL.spectralCentroid',
  'signal.features.bandwidth': 'PRISM_SIGNAL.spectralBandwidth',
  'signal.features.rolloff': 'PRISM_SIGNAL.spectralRolloff',
  'signal.features.rms': 'PRISM_SIGNAL.rmsEnergy',
  'signal.features.zcr': 'PRISM_SIGNAL.zeroCrossingRate',
  
  // Time-Frequency
  'signal.stft': 'PRISM_SIGNAL.stft',
  'signal.hilbert': 'PRISM_SIGNAL.hilbertTransform',
  'signal.envelope': 'PRISM_SIGNAL.envelope',
  
  // Chatter
  'signal.chatter.detect': 'PRISM_SIGNAL.detectChatter',
  'signal.chatter.index': 'PRISM_SIGNAL.chatterIndex'
};

function registerBatch11Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH11_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 11] Registered ${Object.keys(BATCH11_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_SIGNAL, BATCH11_GATEWAY_ROUTES, registerBatch11Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_SIGNAL = PRISM_SIGNAL;
  registerBatch11Routes();
}

console.log('[PRISM Batch 11] Signal Processing loaded - 26 routes');
/**
 * PRISM BATCH 12: COMPUTER GRAPHICS
 * Source: MIT 6.837, 6.839
 * 
 * Algorithms: Transformations, Projection, Lighting, Mesh Processing, Ray Casting
 * Gateway Routes: 18
 */

const PRISM_GRAPHICS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORMATION MATRICES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create identity matrix
   */
  identity: function() {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create translation matrix
   */
  translate: function(tx, ty, tz) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  },
  
  /**
   * Create scaling matrix
   */
  scale: function(sx, sy, sz) {
    if (sy === undefined) { sy = sx; sz = sx; }
    return [
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around X axis
   */
  rotateX: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around Y axis
   */
  rotateY: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around Z axis
   */
  rotateZ: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around arbitrary axis (Rodrigues)
   */
  rotate: function(angle, ax, ay, az) {
    // Normalize axis
    const len = Math.sqrt(ax*ax + ay*ay + az*az);
    ax /= len; ay /= len; az /= len;
    
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    
    return [
      t*ax*ax + c,      t*ax*ay + s*az,  t*ax*az - s*ay,  0,
      t*ax*ay - s*az,   t*ay*ay + c,     t*ay*az + s*ax,  0,
      t*ax*az + s*ay,   t*ay*az - s*ax,  t*az*az + c,     0,
      0,                0,               0,               1
    ];
  },
  
  /**
   * Multiply two 4x4 matrices
   */
  multiply: function(a, b) {
    const result = new Array(16).fill(0);
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        for (let k = 0; k < 4; k++) {
          result[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
        }
      }
    }
    
    return result;
  },
  
  /**
   * Compose multiple transforms
   */
  composeTransforms: function(...matrices) {
    return matrices.reduce((acc, mat) => this.multiply(acc, mat), this.identity());
  },
  
  /**
   * Transform a point by matrix
   */
  transformPoint: function(m, p) {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3]*x + m[7]*y + m[11]*z + m[15] || 1;
    
    return [
      (m[0]*x + m[4]*y + m[8]*z + m[12]) / w,
      (m[1]*x + m[5]*y + m[9]*z + m[13]) / w,
      (m[2]*x + m[6]*y + m[10]*z + m[14]) / w
    ];
  },
  
  /**
   * Transform a direction (ignore translation)
   */
  transformDirection: function(m, d) {
    return [
      m[0]*d[0] + m[4]*d[1] + m[8]*d[2],
      m[1]*d[0] + m[5]*d[1] + m[9]*d[2],
      m[2]*d[0] + m[6]*d[1] + m[10]*d[2]
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW & PROJECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create look-at view matrix
   */
  lookAt: function(eye, target, up) {
    // Forward vector (camera looks down -Z)
    let fx = eye[0] - target[0];
    let fy = eye[1] - target[1];
    let fz = eye[2] - target[2];
    let flen = Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx /= flen; fy /= flen; fz /= flen;
    
    // Right vector (X axis)
    let rx = up[1]*fz - up[2]*fy;
    let ry = up[2]*fx - up[0]*fz;
    let rz = up[0]*fy - up[1]*fx;
    let rlen = Math.sqrt(rx*rx + ry*ry + rz*rz);
    rx /= rlen; ry /= rlen; rz /= rlen;
    
    // Up vector (Y axis)
    const ux = fy*rz - fz*ry;
    const uy = fz*rx - fx*rz;
    const uz = fx*ry - fy*rx;
    
    return [
      rx, ux, fx, 0,
      ry, uy, fy, 0,
      rz, uz, fz, 0,
      -(rx*eye[0] + ry*eye[1] + rz*eye[2]),
      -(ux*eye[0] + uy*eye[1] + uz*eye[2]),
      -(fx*eye[0] + fy*eye[1] + fz*eye[2]),
      1
    ];
  },
  
  /**
   * Create perspective projection matrix
   */
  perspective: function(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ];
  },
  
  /**
   * Create orthographic projection matrix
   */
  orthographic: function(left, right, bottom, top, near, far) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    const fn = 1 / (far - near);
    
    return [
      2 * rl, 0, 0, 0,
      0, 2 * tb, 0, 0,
      0, 0, -2 * fn, 0,
      -(right + left) * rl, -(top + bottom) * tb, -(far + near) * fn, 1
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHTING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute Phong lighting
   */
  phongLighting: function(config) {
    const {
      position,      // Surface position
      normal,        // Surface normal
      lightPos,      // Light position
      viewPos,       // Camera position
      ambient = [0.1, 0.1, 0.1],
      diffuseColor = [0.7, 0.7, 0.7],
      specularColor = [1, 1, 1],
      shininess = 32
    } = config;
    
    // Normalize vectors
    const N = this._normalize(normal);
    const L = this._normalize(this._subtract(lightPos, position));
    const V = this._normalize(this._subtract(viewPos, position));
    const R = this._reflect(this._negate(L), N);
    
    // Ambient
    const ambientComponent = ambient;
    
    // Diffuse
    const diff = Math.max(this._dot(N, L), 0);
    const diffuseComponent = diffuseColor.map(c => c * diff);
    
    // Specular
    const spec = Math.pow(Math.max(this._dot(R, V), 0), shininess);
    const specularComponent = specularColor.map(c => c * spec);
    
    // Combine
    return {
      color: [
        Math.min(ambientComponent[0] + diffuseComponent[0] + specularComponent[0], 1),
        Math.min(ambientComponent[1] + diffuseComponent[1] + specularComponent[1], 1),
        Math.min(ambientComponent[2] + diffuseComponent[2] + specularComponent[2], 1)
      ],
      diffuse: diff,
      specular: spec
    };
  },
  
  /**
   * Compute Blinn-Phong lighting (more efficient)
   */
  blinnPhongLighting: function(config) {
    const {
      position, normal, lightPos, viewPos,
      ambient = [0.1, 0.1, 0.1],
      diffuseColor = [0.7, 0.7, 0.7],
      specularColor = [1, 1, 1],
      shininess = 32
    } = config;
    
    const N = this._normalize(normal);
    const L = this._normalize(this._subtract(lightPos, position));
    const V = this._normalize(this._subtract(viewPos, position));
    const H = this._normalize(this._add(L, V)); // Halfway vector
    
    const diff = Math.max(this._dot(N, L), 0);
    const spec = Math.pow(Math.max(this._dot(N, H), 0), shininess);
    
    return {
      color: [
        Math.min(ambient[0] + diffuseColor[0] * diff + specularColor[0] * spec, 1),
        Math.min(ambient[1] + diffuseColor[1] * diff + specularColor[1] * spec, 1),
        Math.min(ambient[2] + diffuseColor[2] * diff + specularColor[2] * spec, 1)
      ],
      diffuse: diff,
      specular: spec
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MESH PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute face normals for mesh
   */
  computeNormals: function(vertices, indices, smooth = true) {
    const faceNormals = [];
    const vertexNormals = new Array(vertices.length / 3).fill(null).map(() => [0, 0, 0]);
    
    // Compute face normals
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      
      const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      
      const edge1 = this._subtract(v1, v0);
      const edge2 = this._subtract(v2, v0);
      const normal = this._normalize(this._cross(edge1, edge2));
      
      faceNormals.push(normal);
      
      if (smooth) {
        // Accumulate to vertex normals
        for (const idx of [indices[i], indices[i + 1], indices[i + 2]]) {
          vertexNormals[idx][0] += normal[0];
          vertexNormals[idx][1] += normal[1];
          vertexNormals[idx][2] += normal[2];
        }
      }
    }
    
    // Normalize vertex normals
    if (smooth) {
      for (let i = 0; i < vertexNormals.length; i++) {
        vertexNormals[i] = this._normalize(vertexNormals[i]);
      }
    }
    
    return {
      faceNormals,
      vertexNormals: smooth ? vertexNormals.flat() : null
    };
  },
  
  /**
   * Compute bounding box
   */
  computeBounds: function(vertices) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    for (let i = 0; i < vertices.length; i += 3) {
      min[0] = Math.min(min[0], vertices[i]);
      min[1] = Math.min(min[1], vertices[i + 1]);
      min[2] = Math.min(min[2], vertices[i + 2]);
      max[0] = Math.max(max[0], vertices[i]);
      max[1] = Math.max(max[1], vertices[i + 1]);
      max[2] = Math.max(max[2], vertices[i + 2]);
    }
    
    const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
    ];
    
    const size = [
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2]
    ];
    
    const radius = Math.sqrt(size[0]*size[0] + size[1]*size[1] + size[2]*size[2]) / 2;
    
    return { min, max, center, size, radius };
  },
  
  /**
   * Compute mesh center
   */
  computeCenter: function(vertices) {
    let cx = 0, cy = 0, cz = 0;
    const count = vertices.length / 3;
    
    for (let i = 0; i < vertices.length; i += 3) {
      cx += vertices[i];
      cy += vertices[i + 1];
      cz += vertices[i + 2];
    }
    
    return [cx / count, cy / count, cz / count];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RAY CASTING / PICKING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Convert screen coordinates to world ray
   */
  screenToRay: function(screenX, screenY, width, height, viewMatrix, projMatrix) {
    // Convert to NDC
    const ndcX = (2 * screenX / width) - 1;
    const ndcY = 1 - (2 * screenY / height);
    
    // Clip space coordinates for near and far planes
    const nearPoint = [ndcX, ndcY, -1, 1];
    const farPoint = [ndcX, ndcY, 1, 1];
    
    // Invert view-projection matrix
    const vpMatrix = this.multiply(projMatrix, viewMatrix);
    const invVP = this._invertMatrix(vpMatrix);
    
    if (!invVP) return null;
    
    // Unproject points
    const nearWorld = this._unproject(nearPoint, invVP);
    const farWorld = this._unproject(farPoint, invVP);
    
    // Ray direction
    const direction = this._normalize(this._subtract(farWorld, nearWorld));
    
    return {
      origin: nearWorld,
      direction
    };
  },
  
  /**
   * Ray-triangle intersection (Möller-Trumbore)
   */
  rayTriangleIntersect: function(rayOrigin, rayDir, v0, v1, v2) {
    const EPSILON = 1e-7;
    
    const edge1 = this._subtract(v1, v0);
    const edge2 = this._subtract(v2, v0);
    
    const h = this._cross(rayDir, edge2);
    const a = this._dot(edge1, h);
    
    if (Math.abs(a) < EPSILON) return null; // Parallel
    
    const f = 1 / a;
    const s = this._subtract(rayOrigin, v0);
    const u = f * this._dot(s, h);
    
    if (u < 0 || u > 1) return null;
    
    const q = this._cross(s, edge1);
    const v = f * this._dot(rayDir, q);
    
    if (v < 0 || u + v > 1) return null;
    
    const t = f * this._dot(edge2, q);
    
    if (t > EPSILON) {
      return {
        t,
        point: [
          rayOrigin[0] + rayDir[0] * t,
          rayOrigin[1] + rayDir[1] * t,
          rayOrigin[2] + rayDir[2] * t
        ],
        u, v,
        barycentrics: [1 - u - v, u, v]
      };
    }
    
    return null;
  },
  
  /**
   * Ray-mesh intersection
   */
  rayMeshIntersect: function(rayOrigin, rayDir, vertices, indices) {
    let closest = null;
    let closestT = Infinity;
    let closestFace = -1;
    
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      
      const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      
      const hit = this.rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2);
      
      if (hit && hit.t < closestT) {
        closestT = hit.t;
        closest = hit;
        closestFace = i / 3;
      }
    }
    
    if (closest) {
      closest.faceIndex = closestFace;
    }
    
    return closest;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * HSV to RGB conversion
   */
  hsvToRgb: function(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    
    return [r, g, b];
  },
  
  /**
   * Create color gradient
   */
  colorGradient: function(value, min, max, colors = null) {
    if (!colors) {
      colors = [
        [0, 0, 1],    // Blue (cold)
        [0, 1, 1],    // Cyan
        [0, 1, 0],    // Green
        [1, 1, 0],    // Yellow
        [1, 0, 0]     // Red (hot)
      ];
    }
    
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    
    if (i >= colors.length - 1) return colors[colors.length - 1];
    
    return [
      colors[i][0] + f * (colors[i + 1][0] - colors[i][0]),
      colors[i][1] + f * (colors[i + 1][1] - colors[i][1]),
      colors[i][2] + f * (colors[i + 1][2] - colors[i][2])
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  _add: function(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },
  
  _subtract: function(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },
  
  _negate: function(v) {
    return [-v[0], -v[1], -v[2]];
  },
  
  _scale: function(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
  },
  
  _dot: function(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },
  
  _cross: function(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  },
  
  _length: function(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  },
  
  _normalize: function(v) {
    const len = this._length(v);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  },
  
  _reflect: function(v, n) {
    const d = 2 * this._dot(v, n);
    return [v[0] - d * n[0], v[1] - d * n[1], v[2] - d * n[2]];
  },
  
  _unproject: function(point, invMatrix) {
    const x = invMatrix[0]*point[0] + invMatrix[4]*point[1] + invMatrix[8]*point[2] + invMatrix[12]*point[3];
    const y = invMatrix[1]*point[0] + invMatrix[5]*point[1] + invMatrix[9]*point[2] + invMatrix[13]*point[3];
    const z = invMatrix[2]*point[0] + invMatrix[6]*point[1] + invMatrix[10]*point[2] + invMatrix[14]*point[3];
    const w = invMatrix[3]*point[0] + invMatrix[7]*point[1] + invMatrix[11]*point[2] + invMatrix[15]*point[3];
    
    return [x / w, y / w, z / w];
  },
  
  _invertMatrix: function(m) {
    // 4x4 matrix inversion (simplified, assumes well-formed matrix)
    const inv = new Array(16);
    
    inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
    inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
    inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
    inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
    inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
    inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
    inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
    inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
    
    let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
    
    if (Math.abs(det) < 1e-10) return null;
    
    det = 1 / det;
    return inv.map(v => v * det);
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH12_GATEWAY_ROUTES = {
  // Transformations
  'graphics.transform.identity': 'PRISM_GRAPHICS.identity',
  'graphics.transform.translate': 'PRISM_GRAPHICS.translate',
  'graphics.transform.rotate': 'PRISM_GRAPHICS.rotate',
  'graphics.transform.scale': 'PRISM_GRAPHICS.scale',
  'graphics.transform.compose': 'PRISM_GRAPHICS.composeTransforms',
  'graphics.transform.point': 'PRISM_GRAPHICS.transformPoint',
  
  // View/Projection
  'graphics.view.lookAt': 'PRISM_GRAPHICS.lookAt',
  'graphics.projection.perspective': 'PRISM_GRAPHICS.perspective',
  'graphics.projection.orthographic': 'PRISM_GRAPHICS.orthographic',
  
  // Lighting
  'graphics.light.phong': 'PRISM_GRAPHICS.phongLighting',
  'graphics.light.blinnPhong': 'PRISM_GRAPHICS.blinnPhongLighting',
  
  // Mesh
  'graphics.mesh.normals': 'PRISM_GRAPHICS.computeNormals',
  'graphics.mesh.bounds': 'PRISM_GRAPHICS.computeBounds',
  'graphics.mesh.center': 'PRISM_GRAPHICS.computeCenter',
  
  // Picking
  'graphics.pick.ray': 'PRISM_GRAPHICS.screenToRay',
  'graphics.pick.triangle': 'PRISM_GRAPHICS.rayTriangleIntersect',
  'graphics.pick.mesh': 'PRISM_GRAPHICS.rayMeshIntersect',
  
  // Color
  'graphics.color.hsvToRgb': 'PRISM_GRAPHICS.hsvToRgb',
  'graphics.color.gradient': 'PRISM_GRAPHICS.colorGradient'
};

function registerBatch12Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH12_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 12] Registered ${Object.keys(BATCH12_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_GRAPHICS, BATCH12_GATEWAY_ROUTES, registerBatch12Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_GRAPHICS = PRISM_GRAPHICS;
  registerBatch12Routes();
}

console.log('[PRISM Batch 12] Computer Graphics loaded - 19 routes');

/**
 * PRISM BATCH 5: HUMAN FACTORS & UI
 * Source: MIT 16.400 (Human Factors Engineering)
 * 
 * Algorithms: Workload Assessment, Error Prevention, Display Optimization
 * Gateway Routes: 15
 */

const PRISM_HUMAN_FACTORS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WORKLOAD ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate NASA Task Load Index
   * @param {Object} ratings - 0-100 ratings for each dimension
   * @param {Object} weights - Optional pairwise comparison weights
   * @returns {Object} TLX scores
   */
  nasaTLX: function(ratings, weights = null) {
    const dimensions = ['mental', 'physical', 'temporal', 'performance', 'effort', 'frustration'];
    
    // Validate ratings
    for (const dim of dimensions) {
      if (ratings[dim] === undefined || ratings[dim] < 0 || ratings[dim] > 100) {
        throw new Error(`Invalid rating for ${dim}: must be 0-100`);
      }
    }
    
    // Raw TLX (unweighted average)
    const rawTLX = dimensions.reduce((sum, dim) => sum + ratings[dim], 0) / 6;
    
    // Weighted TLX if weights provided
    let weightedTLX = rawTLX;
    if (weights) {
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      weightedTLX = dimensions.reduce((sum, dim) => 
        sum + ratings[dim] * (weights[dim] || 1), 0
      ) / totalWeight;
    }
    
    // Categorize workload level
    let level, recommendation;
    if (weightedTLX < 30) {
      level = 'LOW';
      recommendation = 'Operator may be underloaded. Consider adding monitoring tasks.';
    } else if (weightedTLX < 50) {
      level = 'MODERATE';
      recommendation = 'Optimal workload range for sustained performance.';
    } else if (weightedTLX < 70) {
      level = 'HIGH';
      recommendation = 'Consider automation assistance or task redistribution.';
    } else {
      level = 'OVERLOAD';
      recommendation = 'Critical: Reduce task demands or provide significant support.';
    }
    
    return {
      rawTLX,
      weightedTLX,
      level,
      recommendation,
      breakdown: { ...ratings },
      dominantFactor: this._findDominantFactor(ratings)
    };
  },
  
  _findDominantFactor: function(ratings) {
    let max = 0, dominant = null;
    for (const [dim, value] of Object.entries(ratings)) {
      if (value > max) {
        max = value;
        dominant = dim;
      }
    }
    return { dimension: dominant, value: max };
  },
  
  /**
   * Assess overall workload from multiple indicators
   */
  assessWorkload: function(indicators) {
    const {
      taskComplexity = 50,     // 0-100
      timeAvailable = 50,      // 0-100 (higher = more time)
      errorRate = 0,           // errors per hour
      responseTime = 500,      // ms average
      baselineResponseTime = 400
    } = indicators;
    
    // Normalize indicators
    const complexityScore = taskComplexity / 100;
    const timePressure = 1 - (timeAvailable / 100);
    const errorScore = Math.min(1, errorRate / 5);  // Normalize to 5 errors/hr max
    const rtDegradation = Math.max(0, (responseTime - baselineResponseTime) / baselineResponseTime);
    
    // Weighted combination
    const workloadIndex = (
      complexityScore * 0.3 +
      timePressure * 0.25 +
      errorScore * 0.25 +
      rtDegradation * 0.2
    ) * 100;
    
    return {
      workloadIndex,
      level: workloadIndex < 30 ? 'LOW' : workloadIndex < 60 ? 'MODERATE' : workloadIndex < 80 ? 'HIGH' : 'CRITICAL',
      factors: {
        complexity: complexityScore * 100,
        timePressure: timePressure * 100,
        errorImpact: errorScore * 100,
        responseTimeDegradation: rtDegradation * 100
      }
    };
  },
  
  /**
   * Predict workload for a task configuration
   */
  predictWorkload: function(taskConfig) {
    const {
      numDisplays,
      numControls,
      updateRate,         // Hz
      decisionFrequency,  // decisions per minute
      physicalDemand      // 0-100
    } = taskConfig;
    
    // Heuristic model based on human factors research
    const visualLoad = Math.min(100, numDisplays * 8 + updateRate * 5);
    const motorLoad = Math.min(100, numControls * 5 + physicalDemand);
    const cognitiveLoad = Math.min(100, decisionFrequency * 10);
    
    const predictedWorkload = (visualLoad + motorLoad + cognitiveLoad) / 3;
    
    return {
      predictedWorkload,
      visualLoad,
      motorLoad,
      cognitiveLoad,
      sustainable: predictedWorkload < 70,
      recommendations: this._generateWorkloadRecommendations(visualLoad, motorLoad, cognitiveLoad)
    };
  },
  
  _generateWorkloadRecommendations: function(visual, motor, cognitive) {
    const recs = [];
    if (visual > 70) recs.push('Reduce display complexity or update rate');
    if (motor > 70) recs.push('Automate frequent physical actions');
    if (cognitive > 70) recs.push('Provide decision support or automation');
    if (recs.length === 0) recs.push('Workload appears manageable');
    return recs;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Classify error type (Rasmussen taxonomy)
   */
  classifyError: function(errorDescription) {
    const skillBased = ['slip', 'lapse', 'misclick', 'wrong button', 'forgot', 'omit'];
    const ruleBased = ['wrong procedure', 'misapplied', 'incorrect rule', 'wrong sequence'];
    const knowledgeBased = ['didn\'t know', 'unfamiliar', 'novel', 'first time', 'unexpected'];
    
    const desc = errorDescription.toLowerCase();
    
    let type, prevention;
    
    if (skillBased.some(kw => desc.includes(kw))) {
      type = 'SKILL_BASED';
      prevention = [
        'Add forcing functions/interlocks',
        'Improve feedback on actions',
        'Use distinct controls for different functions',
        'Implement checklists for critical sequences'
      ];
    } else if (ruleBased.some(kw => desc.includes(kw))) {
      type = 'RULE_BASED';
      prevention = [
        'Improve procedure clarity',
        'Add decision support systems',
        'Provide better situational indicators',
        'Implement guided workflows'
      ];
    } else {
      type = 'KNOWLEDGE_BASED';
      prevention = [
        'Provide training for novel situations',
        'Implement AI assistance',
        'Add expert system recommendations',
        'Improve documentation access'
      ];
    }
    
    return { type, prevention, description: errorDescription };
  },
  
  /**
   * Generate error prevention strategies
   */
  errorPrevention: function(operation) {
    const strategies = {
      elimination: [],
      substitution: [],
      engineering: [],
      administrative: [],
      recovery: []
    };
    
    // Analyze operation for common error sources
    if (operation.manualEntry) {
      strategies.elimination.push('Replace manual entry with dropdown selection');
      strategies.substitution.push('Use barcode/RFID scanning instead');
    }
    
    if (operation.criticalTiming) {
      strategies.engineering.push('Add interlock to prevent premature action');
      strategies.administrative.push('Add confirmation step');
    }
    
    if (operation.sequenceDependent) {
      strategies.engineering.push('Implement sequence enforcement');
      strategies.administrative.push('Provide step-by-step wizard');
    }
    
    if (operation.irreversible) {
      strategies.engineering.push('Add physical guard or key switch');
      strategies.administrative.push('Require supervisor approval');
      strategies.recovery.push('Implement undo where possible');
    }
    
    // Always include recovery options
    strategies.recovery.push('Auto-save state before critical operations');
    strategies.recovery.push('Clear error messages with corrective actions');
    
    return strategies;
  },
  
  /**
   * Check interlock conditions
   */
  interlockCheck: function(conditions) {
    const results = [];
    let allPassed = true;
    
    for (const [name, { required, actual, message }] of Object.entries(conditions)) {
      const passed = actual === required;
      results.push({
        name,
        required,
        actual,
        passed,
        message: passed ? 'OK' : message
      });
      if (!passed) allPassed = false;
    }
    
    return {
      allPassed,
      canProceed: allPassed,
      results,
      failedConditions: results.filter(r => !r.passed)
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Optimize control/display layout using Fitts' Law
   */
  optimizeLayout: function(elements, constraints = {}) {
    const { screenWidth = 1920, screenHeight = 1080, startPosition = { x: 960, y: 540 } } = constraints;
    
    // Sort by frequency of use (higher frequency = closer to start)
    const sorted = [...elements].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    
    // Calculate optimal positions
    const positioned = [];
    let angle = 0;
    const angleStep = (2 * Math.PI) / Math.max(8, elements.length);
    
    for (let i = 0; i < sorted.length; i++) {
      const elem = sorted[i];
      const freq = elem.frequency || 1;
      
      // Distance based on frequency (more frequent = closer)
      const distance = 100 + (1 / freq) * 200;
      
      // Size based on importance and frequency
      const size = Math.max(40, 30 + freq * 10 + (elem.importance || 0) * 10);
      
      const x = startPosition.x + distance * Math.cos(angle);
      const y = startPosition.y + distance * Math.sin(angle);
      
      positioned.push({
        ...elem,
        x: Math.max(size/2, Math.min(screenWidth - size/2, x)),
        y: Math.max(size/2, Math.min(screenHeight - size/2, y)),
        width: size,
        height: size,
        fittsID: this.fittsLaw(distance, size).indexOfDifficulty
      });
      
      angle += angleStep;
    }
    
    return {
      layout: positioned,
      averageFittsID: positioned.reduce((sum, p) => sum + p.fittsID, 0) / positioned.length
    };
  },
  
  /**
   * Apply visual hierarchy to elements
   */
  applyHierarchy: function(elements) {
    // Sort by priority (1 = highest)
    const sorted = [...elements].sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    return sorted.map((elem, index) => {
      const priority = elem.priority || index + 1;
      
      return {
        ...elem,
        fontSize: Math.max(12, 24 - priority * 2),
        fontWeight: priority <= 2 ? 'bold' : 'normal',
        opacity: Math.max(0.6, 1 - priority * 0.1),
        zIndex: 100 - priority,
        color: this._priorityColor(priority)
      };
    });
  },
  
  _priorityColor: function(priority) {
    const colors = {
      1: '#FF0000',  // Critical - Red
      2: '#FF6600',  // High - Orange
      3: '#FFCC00',  // Medium - Yellow
      4: '#00AA00',  // Normal - Green
      5: '#0066CC'   // Low - Blue
    };
    return colors[Math.min(priority, 5)] || '#666666';
  },
  
  /**
   * Generate accessible color palette
   */
  accessibleColors: function(baseColors, options = {}) {
    const { ensureContrast = true, colorblindSafe = true } = options;
    
    // Colorblind-safe palette
    const safeColors = {
      red: '#D55E00',
      orange: '#E69F00',
      yellow: '#F0E442',
      green: '#009E73',
      blue: '#0072B2',
      purple: '#CC79A7',
      gray: '#999999'
    };
    
    const result = {};
    
    for (const [name, color] of Object.entries(baseColors)) {
      result[name] = {
        original: color,
        accessible: colorblindSafe ? (safeColors[name] || color) : color,
        contrastOnWhite: this._calculateContrast(color, '#FFFFFF'),
        contrastOnBlack: this._calculateContrast(color, '#000000'),
        useOnDark: this._calculateContrast(color, '#000000') > 4.5
      };
    }
    
    return result;
  },
  
  _calculateContrast: function(color1, color2) {
    // Simplified contrast calculation
    const getLuminance = (hex) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DECISION SUPPORT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate decision recommendation with explanation
   */
  generateRecommendation: function(options, criteria, weights = null) {
    // Calculate weighted score for each option
    const scored = options.map(option => {
      let totalScore = 0;
      let totalWeight = 0;
      const breakdown = {};
      
      for (const [criterion, value] of Object.entries(option.scores || {})) {
        const weight = weights?.[criterion] || 1;
        breakdown[criterion] = { score: value, weight, weighted: value * weight };
        totalScore += value * weight;
        totalWeight += weight;
      }
      
      return {
        ...option,
        totalScore,
        normalizedScore: totalScore / totalWeight,
        breakdown
      };
    });
    
    // Sort by score
    scored.sort((a, b) => b.normalizedScore - a.normalizedScore);
    
    const recommended = scored[0];
    const alternative = scored[1];
    
    return {
      recommended: recommended.name || recommended.id,
      confidence: this._calculateConfidence(recommended, alternative),
      scores: scored,
      explanation: this._generateExplanation(recommended, criteria),
      alternatives: scored.slice(1, 3).map(s => s.name || s.id)
    };
  },
  
  _calculateConfidence: function(first, second) {
    if (!second) return 1;
    const gap = first.normalizedScore - second.normalizedScore;
    return Math.min(1, 0.5 + gap);
  },
  
  _generateExplanation: function(option, criteria) {
    const topFactors = Object.entries(option.breakdown)
      .sort((a, b) => b[1].weighted - a[1].weighted)
      .slice(0, 3)
      .map(([name, data]) => `${name}: ${(data.score * 100).toFixed(0)}%`);
    
    return `Recommended based on: ${topFactors.join(', ')}`;
  },
  
  /**
   * Explain a decision/calculation
   */
  explainDecision: function(decision, context) {
    return {
      summary: decision.summary || 'Decision made based on provided criteria',
      inputs: decision.inputs,
      process: decision.steps || ['Evaluated options', 'Applied weights', 'Selected best match'],
      result: decision.result,
      confidence: decision.confidence || 'HIGH',
      alternatives: decision.alternatives || [],
      limitations: decision.limitations || ['Based on provided data only']
    };
  },
  
  /**
   * Assess situation awareness
   */
  situationAwareness: function(operatorState, systemState) {
    const assessment = {
      level1_perception: 0,
      level2_comprehension: 0,
      level3_projection: 0
    };
    
    // Level 1: Does operator know current state?
    let correctPerceptions = 0;
    for (const [key, actual] of Object.entries(systemState.current)) {
      if (operatorState.perceived?.[key] === actual) correctPerceptions++;
    }
    assessment.level1_perception = correctPerceptions / Object.keys(systemState.current).length;
    
    // Level 2: Does operator understand implications?
    if (operatorState.understands?.trends) assessment.level2_comprehension += 0.5;
    if (operatorState.understands?.causes) assessment.level2_comprehension += 0.5;
    
    // Level 3: Can operator predict near future?
    if (operatorState.predicts?.nextState) {
      const predicted = operatorState.predicts.nextState;
      const actual = systemState.projected;
      assessment.level3_projection = this._comparePredictions(predicted, actual);
    }
    
    const overall = (assessment.level1_perception + assessment.level2_comprehension + assessment.level3_projection) / 3;
    
    return {
      ...assessment,
      overall,
      level: overall > 0.8 ? 'HIGH' : overall > 0.5 ? 'MODERATE' : 'LOW',
      recommendations: this._saRecommendations(assessment)
    };
  },
  
  _comparePredictions: function(predicted, actual) {
    if (!predicted || !actual) return 0;
    let matches = 0, total = 0;
    for (const key of Object.keys(actual)) {
      if (predicted[key] !== undefined) {
        total++;
        if (Math.abs(predicted[key] - actual[key]) < actual[key] * 0.1) matches++;
      }
    }
    return total > 0 ? matches / total : 0;
  },
  
  _saRecommendations: function(assessment) {
    const recs = [];
    if (assessment.level1_perception < 0.7) recs.push('Improve status displays and highlighting');
    if (assessment.level2_comprehension < 0.7) recs.push('Add trend indicators and summaries');
    if (assessment.level3_projection < 0.7) recs.push('Implement predictive displays');
    return recs;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ERGONOMICS CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Fitts' Law calculation
   */
  fittsLaw: function(distance, width, a = 50, b = 150) {
    const indexOfDifficulty = Math.log2(2 * distance / width);
    const movementTime = a + b * indexOfDifficulty;
    
    return {
      indexOfDifficulty,
      movementTime,
      throughput: indexOfDifficulty / (movementTime / 1000)
    };
  },
  
  /**
   * Hick's Law calculation
   */
  hicksLaw: function(numChoices, a = 200, b = 150) {
    const reactionTime = a + b * Math.log2(numChoices + 1);
    
    return {
      numChoices,
      reactionTime,
      recommendation: numChoices > 7 ? 'Consider grouping or hierarchy' : 'Acceptable'
    };
  },
  
  /**
   * Optimize control layout for minimal movement time
   */
  optimizeControlLayout: function(controls, workspace) {
    const { width, height, handPosition } = workspace;
    
    // Sort controls by frequency
    const sorted = [...controls].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    
    // Place most frequent closest to hand position
    const positioned = [];
    const usedPositions = new Set();
    
    for (const control of sorted) {
      let bestPos = null;
      let bestTime = Infinity;
      
      // Try grid positions
      for (let x = 50; x < width; x += 80) {
        for (let y = 50; y < height; y += 80) {
          const key = `${x},${y}`;
          if (usedPositions.has(key)) continue;
          
          const distance = Math.sqrt((x - handPosition.x) ** 2 + (y - handPosition.y) ** 2);
          const fitts = this.fittsLaw(distance, control.size || 50);
          
          if (fitts.movementTime < bestTime) {
            bestTime = fitts.movementTime;
            bestPos = { x, y };
          }
        }
      }
      
      if (bestPos) {
        usedPositions.add(`${bestPos.x},${bestPos.y}`);
        positioned.push({
          ...control,
          position: bestPos,
          estimatedAccessTime: bestTime
        });
      }
    }
    
    return {
      layout: positioned,
      totalEstimatedTime: positioned.reduce((sum, c) => sum + c.estimatedAccessTime * (c.frequency || 1), 0)
    };
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH5_GATEWAY_ROUTES = {
  // Workload
  'hf.workload.tlx': 'PRISM_HUMAN_FACTORS.nasaTLX',
  'hf.workload.assess': 'PRISM_HUMAN_FACTORS.assessWorkload',
  'hf.workload.predict': 'PRISM_HUMAN_FACTORS.predictWorkload',
  
  // Error Prevention
  'hf.error.classify': 'PRISM_HUMAN_FACTORS.classifyError',
  'hf.error.prevent': 'PRISM_HUMAN_FACTORS.errorPrevention',
  'hf.interlock.check': 'PRISM_HUMAN_FACTORS.interlockCheck',
  
  // Display Design
  'hf.display.layout': 'PRISM_HUMAN_FACTORS.optimizeLayout',
  'hf.display.hierarchy': 'PRISM_HUMAN_FACTORS.applyHierarchy',
  'hf.color.accessible': 'PRISM_HUMAN_FACTORS.accessibleColors',
  
  // Decision Support
  'hf.decision.recommend': 'PRISM_HUMAN_FACTORS.generateRecommendation',
  'hf.decision.explain': 'PRISM_HUMAN_FACTORS.explainDecision',
  'hf.sa.assess': 'PRISM_HUMAN_FACTORS.situationAwareness',
  
  // Ergonomics
  'hf.fitts': 'PRISM_HUMAN_FACTORS.fittsLaw',
  'hf.hicks': 'PRISM_HUMAN_FACTORS.hicksLaw',
  'hf.layout.optimize': 'PRISM_HUMAN_FACTORS.optimizeControlLayout'
};

function registerBatch5Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH5_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 5] Registered ${Object.keys(BATCH5_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_HUMAN_FACTORS, BATCH5_GATEWAY_ROUTES, registerBatch5Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_HUMAN_FACTORS = PRISM_HUMAN_FACTORS;
  registerBatch5Routes();
}

console.log('[PRISM Batch 5] Human Factors & UI loaded - 15 routes');
/**
 * PRISM BATCH 6: SOFTWARE ENGINEERING
 * Source: MIT 1.124j (Software Construction) + 1.264j (Database) + 16.355j (Software Safety)
 * 
 * Algorithms: Design Patterns, Database, Testing, Safety
 * Gateway Routes: 15
 */

const PRISM_SOFTWARE = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY PATTERN
  // ═══════════════════════════════════════════════════════════════════════════
  
  factory: {
    creators: {},
    
    register: function(type, creator) {
      this.creators[type] = creator;
    },
    
    create: function(type, params) {
      const creator = this.creators[type];
      if (!creator) {
        throw new Error(`Unknown type: ${type}. Registered: ${Object.keys(this.creators).join(', ')}`);
      }
      return creator(params);
    },
    
    getTypes: function() {
      return Object.keys(this.creators);
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND PATTERN (Undo/Redo)
  // ═══════════════════════════════════════════════════════════════════════════
  
  commandManager: {
    history: [],
    redoStack: [],
    maxHistory: 100,
    
    execute: function(command) {
      if (typeof command.execute !== 'function' || typeof command.undo !== 'function') {
        throw new Error('Command must have execute() and undo() methods');
      }
      
      const result = command.execute();
      this.history.push(command);
      this.redoStack = [];  // Clear redo on new command
      
      // Limit history size
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      
      return result;
    },
    
    undo: function() {
      const command = this.history.pop();
      if (!command) return { success: false, message: 'Nothing to undo' };
      
      command.undo();
      this.redoStack.push(command);
      return { success: true, command: command.name || 'Command' };
    },
    
    redo: function() {
      const command = this.redoStack.pop();
      if (!command) return { success: false, message: 'Nothing to redo' };
      
      command.execute();
      this.history.push(command);
      return { success: true, command: command.name || 'Command' };
    },
    
    canUndo: function() {
      return this.history.length > 0;
    },
    
    canRedo: function() {
      return this.redoStack.length > 0;
    },
    
    clear: function() {
      this.history = [];
      this.redoStack = [];
    },
    
    getHistory: function() {
      return this.history.map((cmd, i) => ({
        index: i,
        name: cmd.name || `Command ${i}`,
        timestamp: cmd.timestamp
      }));
    }
  },
  
  // Helper to create commands
  createCommand: function(name, executeFn, undoFn) {
    return {
      name,
      timestamp: Date.now(),
      execute: executeFn,
      undo: undoFn
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MACHINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  stateManager: {
    states: {},
    current: null,
    history: [],
    
    define: function(config) {
      this.states = config.states;
      this.current = config.initial;
      this.onTransition = config.onTransition || (() => {});
      this.history = [{ state: this.current, timestamp: Date.now() }];
    },
    
    transition: function(to, payload = {}) {
      const currentConfig = this.states[this.current];
      if (!currentConfig) {
        throw new Error(`Invalid current state: ${this.current}`);
      }
      
      const allowedTransitions = currentConfig.transitions || [];
      if (!allowedTransitions.includes(to)) {
        return {
          success: false,
          error: `Cannot transition from ${this.current} to ${to}. Allowed: ${allowedTransitions.join(', ')}`
        };
      }
      
      const from = this.current;
      this.current = to;
      this.history.push({ state: to, timestamp: Date.now(), from, payload });
      
      // Call exit action
      if (currentConfig.onExit) currentConfig.onExit(payload);
      
      // Call enter action
      const newConfig = this.states[to];
      if (newConfig?.onEnter) newConfig.onEnter(payload);
      
      // Call global transition handler
      this.onTransition({ from, to, payload });
      
      return { success: true, from, to };
    },
    
    canTransition: function(to) {
      const currentConfig = this.states[this.current];
      return currentConfig?.transitions?.includes(to) || false;
    },
    
    getState: function() {
      return this.current;
    },
    
    getAvailableTransitions: function() {
      return this.states[this.current]?.transitions || [];
    },
    
    getHistory: function() {
      return [...this.history];
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SIMPLE IN-MEMORY DATABASE
  // ═══════════════════════════════════════════════════════════════════════════
  
  database: {
    tables: {},
    indexes: {},
    
    createTable: function(name, schema) {
      this.tables[name] = {
        schema,
        rows: [],
        autoIncrement: 1
      };
      this.indexes[name] = {};
      return { success: true, table: name };
    },
    
    insert: function(table, data) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      const t = this.tables[table];
      const row = {
        _id: t.autoIncrement++,
        ...data,
        _created: Date.now(),
        _modified: Date.now()
      };
      
      // Validate against schema if exists
      if (t.schema) {
        for (const [field, config] of Object.entries(t.schema)) {
          if (config.required && row[field] === undefined) {
            throw new Error(`Required field missing: ${field}`);
          }
        }
      }
      
      t.rows.push(row);
      this._updateIndexes(table, row);
      
      return { success: true, id: row._id, row };
    },
    
    query: function(table, conditions = {}, options = {}) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      let results = [...this.tables[table].rows];
      
      // Filter by conditions
      for (const [field, value] of Object.entries(conditions)) {
        if (typeof value === 'object') {
          // Advanced operators
          if (value.$gt !== undefined) results = results.filter(r => r[field] > value.$gt);
          if (value.$gte !== undefined) results = results.filter(r => r[field] >= value.$gte);
          if (value.$lt !== undefined) results = results.filter(r => r[field] < value.$lt);
          if (value.$lte !== undefined) results = results.filter(r => r[field] <= value.$lte);
          if (value.$in !== undefined) results = results.filter(r => value.$in.includes(r[field]));
          if (value.$contains !== undefined) results = results.filter(r => 
            String(r[field]).toLowerCase().includes(String(value.$contains).toLowerCase())
          );
        } else {
          results = results.filter(r => r[field] === value);
        }
      }
      
      // Sort
      if (options.orderBy) {
        const [field, dir] = options.orderBy.split(' ');
        const mult = dir?.toLowerCase() === 'desc' ? -1 : 1;
        results.sort((a, b) => (a[field] > b[field] ? 1 : -1) * mult);
      }
      
      // Pagination
      if (options.limit) {
        const offset = options.offset || 0;
        results = results.slice(offset, offset + options.limit);
      }
      
      // Select specific fields
      if (options.select) {
        const fields = options.select.split(',').map(f => f.trim());
        results = results.map(r => {
          const selected = {};
          for (const f of fields) selected[f] = r[f];
          return selected;
        });
      }
      
      return results;
    },
    
    update: function(table, conditions, updates) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      let count = 0;
      for (const row of this.tables[table].rows) {
        let match = true;
        for (const [field, value] of Object.entries(conditions)) {
          if (row[field] !== value) { match = false; break; }
        }
        
        if (match) {
          Object.assign(row, updates, { _modified: Date.now() });
          count++;
        }
      }
      
      return { success: true, modified: count };
    },
    
    delete: function(table, conditions) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      const before = this.tables[table].rows.length;
      this.tables[table].rows = this.tables[table].rows.filter(row => {
        for (const [field, value] of Object.entries(conditions)) {
          if (row[field] === value) return false;
        }
        return true;
      });
      
      return { success: true, deleted: before - this.tables[table].rows.length };
    },
    
    createIndex: function(table, field) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      this.indexes[table][field] = {};
      for (const row of this.tables[table].rows) {
        this._addToIndex(table, field, row);
      }
      
      return { success: true, indexed: field };
    },
    
    _addToIndex: function(table, field, row) {
      const value = row[field];
      if (!this.indexes[table][field][value]) {
        this.indexes[table][field][value] = [];
      }
      this.indexes[table][field][value].push(row._id);
    },
    
    _updateIndexes: function(table, row) {
      for (const field of Object.keys(this.indexes[table] || {})) {
        this._addToIndex(table, field, row);
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE
  // ═══════════════════════════════════════════════════════════════════════════
  
  cache: {
    store: new Map(),
    maxSize: 1000,
    ttl: 300000, // 5 minutes default
    
    set: function(key, value, ttl = this.ttl) {
      if (this.store.size >= this.maxSize) {
        // Remove oldest entry (LRU approximation)
        const firstKey = this.store.keys().next().value;
        this.store.delete(firstKey);
      }
      
      this.store.set(key, {
        value,
        expires: Date.now() + ttl,
        hits: 0
      });
      
      return { success: true, key };
    },
    
    get: function(key) {
      const entry = this.store.get(key);
      if (!entry) return { found: false };
      
      if (Date.now() > entry.expires) {
        this.store.delete(key);
        return { found: false, expired: true };
      }
      
      entry.hits++;
      return { found: true, value: entry.value, hits: entry.hits };
    },
    
    invalidate: function(key) {
      return { deleted: this.store.delete(key) };
    },
    
    clear: function() {
      const size = this.store.size;
      this.store.clear();
      return { cleared: size };
    },
    
    getStats: function() {
      let totalHits = 0, expired = 0;
      const now = Date.now();
      
      for (const [key, entry] of this.store) {
        totalHits += entry.hits;
        if (now > entry.expires) expired++;
      }
      
      return {
        size: this.store.size,
        maxSize: this.maxSize,
        totalHits,
        expiredEntries: expired
      };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TESTING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  testing: {
    tests: [],
    results: [],
    
    describe: function(name, fn) {
      this.currentSuite = name;
      fn();
      this.currentSuite = null;
    },
    
    it: function(name, fn) {
      this.tests.push({
        suite: this.currentSuite,
        name,
        fn
      });
    },
    
    runTests: function(filter = null) {
      this.results = [];
      const testsToRun = filter 
        ? this.tests.filter(t => t.name.includes(filter) || t.suite?.includes(filter))
        : this.tests;
      
      for (const test of testsToRun) {
        const result = {
          suite: test.suite,
          name: test.name,
          passed: false,
          error: null,
          duration: 0
        };
        
        const start = performance.now();
        try {
          test.fn();
          result.passed = true;
        } catch (e) {
          result.error = e.message;
        }
        result.duration = performance.now() - start;
        
        this.results.push(result);
      }
      
      const passed = this.results.filter(r => r.passed).length;
      const failed = this.results.filter(r => !r.passed).length;
      
      return {
        total: this.results.length,
        passed,
        failed,
        passRate: (passed / this.results.length * 100).toFixed(1) + '%',
        results: this.results,
        failures: this.results.filter(r => !r.passed)
      };
    },
    
    getCoverage: function(module) {
      // Simplified coverage estimation
      const functions = Object.keys(module).filter(k => typeof module[k] === 'function');
      const testedFunctions = new Set();
      
      for (const test of this.tests) {
        const src = test.fn.toString();
        for (const fn of functions) {
          if (src.includes(fn)) testedFunctions.add(fn);
        }
      }
      
      return {
        totalFunctions: functions.length,
        testedFunctions: testedFunctions.size,
        coverage: (testedFunctions.size / functions.length * 100).toFixed(1) + '%',
        untested: functions.filter(f => !testedFunctions.has(f))
      };
    },
    
    // Assertion helpers
    assert: {
      equal: (a, b, msg) => {
        if (a !== b) throw new Error(msg || `Expected ${a} to equal ${b}`);
      },
      deepEqual: (a, b, msg) => {
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          throw new Error(msg || `Deep equality failed`);
        }
      },
      throws: (fn, msg) => {
        try {
          fn();
          throw new Error(msg || 'Expected function to throw');
        } catch (e) {
          if (e.message === msg) throw e;
        }
      },
      truthy: (val, msg) => {
        if (!val) throw new Error(msg || `Expected truthy value, got ${val}`);
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  validation: {
    rules: {
      number: (v, opts = {}) => {
        if (typeof v !== 'number' || !isFinite(v)) return 'Must be a valid number';
        if (opts.min !== undefined && v < opts.min) return `Must be at least ${opts.min}`;
        if (opts.max !== undefined && v > opts.max) return `Must be at most ${opts.max}`;
        return null;
      },
      string: (v, opts = {}) => {
        if (typeof v !== 'string') return 'Must be a string';
        if (opts.minLength && v.length < opts.minLength) return `Must be at least ${opts.minLength} characters`;
        if (opts.maxLength && v.length > opts.maxLength) return `Must be at most ${opts.maxLength} characters`;
        if (opts.pattern && !opts.pattern.test(v)) return `Must match pattern ${opts.pattern}`;
        return null;
      },
      array: (v, opts = {}) => {
        if (!Array.isArray(v)) return 'Must be an array';
        if (opts.minLength && v.length < opts.minLength) return `Must have at least ${opts.minLength} items`;
        return null;
      },
      enum: (v, opts) => {
        if (!opts.values?.includes(v)) return `Must be one of: ${opts.values.join(', ')}`;
        return null;
      }
    },
    
    validateInput: function(input, schema) {
      const errors = {};
      let valid = true;
      
      for (const [field, config] of Object.entries(schema)) {
        const value = input[field];
        
        // Required check
        if (config.required && (value === undefined || value === null)) {
          errors[field] = 'Required field';
          valid = false;
          continue;
        }
        
        if (value === undefined) continue;
        
        // Type check
        const rule = this.rules[config.type];
        if (rule) {
          const error = rule(value, config);
          if (error) {
            errors[field] = error;
            valid = false;
          }
        }
        
        // Custom validator
        if (config.validate) {
          const error = config.validate(value, input);
          if (error) {
            errors[field] = error;
            valid = false;
          }
        }
      }
      
      return { valid, errors };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  
  safety: {
    hazards: [],
    watchdogs: new Map(),
    
    analyzeHazard: function(hazard) {
      const { component, failureMode, effect, severity, probability, detection } = hazard;
      
      const rpn = severity * probability * detection;
      
      const priority = rpn > 100 ? 'CRITICAL' : rpn > 50 ? 'HIGH' : rpn > 20 ? 'MEDIUM' : 'LOW';
      
      const mitigations = [];
      if (severity >= 8) mitigations.push('Add redundant system or backup');
      if (probability >= 5) mitigations.push('Improve component reliability or add monitoring');
      if (detection >= 5) mitigations.push('Add sensors or automated detection');
      
      this.hazards.push({
        ...hazard,
        rpn,
        priority,
        mitigations,
        analyzed: Date.now()
      });
      
      return { rpn, priority, mitigations };
    },
    
    watchdog: function(id, timeout, onTimeout) {
      // Clear existing watchdog if any
      if (this.watchdogs.has(id)) {
        clearTimeout(this.watchdogs.get(id).timer);
      }
      
      const timer = setTimeout(() => {
        console.error(`[WATCHDOG] ${id} timeout after ${timeout}ms`);
        onTimeout();
      }, timeout);
      
      this.watchdogs.set(id, {
        timer,
        timeout,
        onTimeout,
        lastKick: Date.now()
      });
      
      return {
        kick: () => {
          const wd = this.watchdogs.get(id);
          if (wd) {
            clearTimeout(wd.timer);
            wd.timer = setTimeout(wd.onTimeout, wd.timeout);
            wd.lastKick = Date.now();
          }
        },
        stop: () => {
          const wd = this.watchdogs.get(id);
          if (wd) {
            clearTimeout(wd.timer);
            this.watchdogs.delete(id);
          }
        }
      };
    },
    
    engageFailsafe: function(reason, actions) {
      console.error(`[FAILSAFE] Engaging due to: ${reason}`);
      
      const results = [];
      for (const action of actions) {
        try {
          action();
          results.push({ action: action.name || 'anonymous', success: true });
        } catch (e) {
          results.push({ action: action.name || 'anonymous', success: false, error: e.message });
        }
      }
      
      return {
        reason,
        timestamp: Date.now(),
        results,
        allSucceeded: results.every(r => r.success)
      };
    },
    
    getHazardReport: function() {
      return {
        total: this.hazards.length,
        bySeverity: {
          critical: this.hazards.filter(h => h.priority === 'CRITICAL').length,
          high: this.hazards.filter(h => h.priority === 'HIGH').length,
          medium: this.hazards.filter(h => h.priority === 'MEDIUM').length,
          low: this.hazards.filter(h => h.priority === 'LOW').length
        },
        hazards: this.hazards.sort((a, b) => b.rpn - a.rpn)
      };
    }
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH6_GATEWAY_ROUTES = {
  // Factory
  'sw.factory.create': 'PRISM_SOFTWARE.factory.create',
  'sw.factory.register': 'PRISM_SOFTWARE.factory.register',
  
  // Command
  'sw.command.execute': 'PRISM_SOFTWARE.commandManager.execute',
  'sw.command.undo': 'PRISM_SOFTWARE.commandManager.undo',
  'sw.command.redo': 'PRISM_SOFTWARE.commandManager.redo',
  
  // State
  'sw.state.transition': 'PRISM_SOFTWARE.stateManager.transition',
  'sw.state.get': 'PRISM_SOFTWARE.stateManager.getState',
  
  // Database
  'sw.db.query': 'PRISM_SOFTWARE.database.query',
  'sw.db.insert': 'PRISM_SOFTWARE.database.insert',
  'sw.db.update': 'PRISM_SOFTWARE.database.update',
  
  // Cache
  'sw.cache.get': 'PRISM_SOFTWARE.cache.get',
  'sw.cache.set': 'PRISM_SOFTWARE.cache.set',
  
  // Testing
  'sw.test.run': 'PRISM_SOFTWARE.testing.runTests',
  'sw.validate': 'PRISM_SOFTWARE.validation.validateInput',
  
  // Safety
  'sw.safety.hazard': 'PRISM_SOFTWARE.safety.analyzeHazard',
  'sw.safety.watchdog': 'PRISM_SOFTWARE.safety.watchdog',
  'sw.safety.failsafe': 'PRISM_SOFTWARE.safety.engageFailsafe'
};

function registerBatch6Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH6_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 6] Registered ${Object.keys(BATCH6_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_SOFTWARE, BATCH6_GATEWAY_ROUTES, registerBatch6Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_SOFTWARE = PRISM_SOFTWARE;
  registerBatch6Routes();
}

console.log('[PRISM Batch 6] Software Engineering loaded - 17 routes');

/**
 * PRISM MIT Course Knowledge - Batch 13
 * Mechanical Engineering Algorithms (Courses 1-5)
 * Source: MIT 2.001, 2.004, 2.007, 2.008
 * Generated: January 18, 2026
 */

// ═══════════════════════════════════════════════════════════════
// GEAR DESIGN (MIT 2.007 - Lectures 12-13)
// ═══════════════════════════════════════════════════════════════

const PRISM_GEAR_DESIGN = {
    /**
     * Calculate gear geometry parameters
     * @param {number} N - Number of teeth
     * @param {number} P - Diametral pitch (teeth/inch) or module (mm) if metric
     * @param {number} pressureAngle - Pressure angle in degrees (typically 14.5 or 20)
     * @param {boolean} isMetric - Use module instead of diametral pitch
     * @returns {Object} Gear geometry
     */
    calculateGeometry: function(N, P, pressureAngle = 20, isMetric = false) {
        const phi = pressureAngle * Math.PI / 180;
        
        let d, m, circularPitch;
        if (isMetric) {
            m = P; // P is module in mm
            d = m * N; // Pitch diameter in mm
            circularPitch = Math.PI * m;
        } else {
            d = N / P; // Pitch diameter in inches
            m = 25.4 / P; // Module in mm
            circularPitch = Math.PI / P;
        }
        
        const addendum = isMetric ? m : 1 / P;
        const dedendum = isMetric ? 1.25 * m : 1.25 / P;
        const clearance = isMetric ? 0.25 * m : 0.25 / P;
        const wholeDepth = addendum + dedendum;
        const workingDepth = 2 * addendum;
        
        const outsideDiameter = d + 2 * addendum;
        const rootDiameter = d - 2 * dedendum;
        const baseDiameter = d * Math.cos(phi);
        
        // Tooth thickness at pitch circle
        const toothThickness = circularPitch / 2;
        
        return {
            pitchDiameter: d,
            module: m,
            diametralPitch: isMetric ? 25.4 / m : P,
            circularPitch: circularPitch,
            addendum: addendum,
            dedendum: dedendum,
            clearance: clearance,
            wholeDepth: wholeDepth,
            workingDepth: workingDepth,
            outsideDiameter: outsideDiameter,
            rootDiameter: rootDiameter,
            baseDiameter: baseDiameter,
            toothThickness: toothThickness,
            pressureAngle: pressureAngle,
            numberOfTeeth: N
        };
    },

    /**
     * Generate involute curve points
     * @param {number} baseRadius - Base circle radius
     * @param {number} numPoints - Number of points to generate
     * @param {number} maxAngle - Maximum roll angle in radians
     * @returns {Array} Array of {x, y} points
     */
    generateInvoluteCurve: function(baseRadius, numPoints = 50, maxAngle = Math.PI / 2) {
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const theta = (i / (numPoints - 1)) * maxAngle;
            const x = baseRadius * (Math.cos(theta) + theta * Math.sin(theta));
            const y = baseRadius * (Math.sin(theta) - theta * Math.cos(theta));
            points.push({ x, y, theta });
        }
        return points;
    },

    /**
     * Calculate gear ratio for a gear train
     * @param {Array} gears - Array of {driver: N, driven: N} pairs
     * @returns {Object} Gear train analysis
     */
    calculateGearTrain: function(gears) {
        let totalRatio = 1;
        const stages = [];
        
        for (const pair of gears) {
            const stageRatio = pair.driven / pair.driver;
            totalRatio *= stageRatio;
            stages.push({
                driverTeeth: pair.driver,
                drivenTeeth: pair.driven,
                stageRatio: stageRatio,
                speedReduction: stageRatio > 1,
                torqueMultiplier: stageRatio
            });
        }
        
        return {
            totalRatio: totalRatio,
            stages: stages,
            outputSpeedFactor: 1 / totalRatio,
            outputTorqueFactor: totalRatio
        };
    },

    /**
     * Lewis bending stress calculation
     * @param {number} Wt - Transmitted tangential load (force)
     * @param {number} P - Diametral pitch
     * @param {number} F - Face width
     * @param {number} Y - Lewis form factor
     * @returns {number} Bending stress
     */
    lewisBendingStress: function(Wt, P, F, Y) {
        return (Wt * P) / (F * Y);
    },

    /**
     * Get Lewis form factor for standard 20° pressure angle gears
     * @param {number} N - Number of teeth
     * @returns {number} Lewis form factor Y
     */
    getLewisFormFactor: function(N) {
        // Approximate Lewis form factor for 20° pressure angle full-depth teeth
        // Based on AGMA standards
        const factorTable = {
            12: 0.245, 13: 0.261, 14: 0.277, 15: 0.290,
            16: 0.296, 17: 0.303, 18: 0.309, 19: 0.314,
            20: 0.322, 21: 0.328, 22: 0.331, 24: 0.337,
            26: 0.346, 28: 0.353, 30: 0.359, 34: 0.371,
            38: 0.384, 43: 0.397, 50: 0.409, 60: 0.422,
            75: 0.435, 100: 0.447, 150: 0.460, 300: 0.472
        };
        
        // Find closest value
        const keys = Object.keys(factorTable).map(Number).sort((a, b) => a - b);
        for (let i = 0; i < keys.length; i++) {
            if (N <= keys[i]) {
                if (i === 0) return factorTable[keys[0]];
                // Interpolate
                const lower = keys[i - 1];
                const upper = keys[i];
                const t = (N - lower) / (upper - lower);
                return factorTable[lower] + t * (factorTable[upper] - factorTable[lower]);
            }
        }
        return factorTable[300]; // Max value for rack
    },

    /**
     * Check minimum teeth to avoid interference
     * @param {number} pressureAngle - Pressure angle in degrees
     * @param {number} addendumCoeff - Addendum coefficient (typically 1)
     * @returns {number} Minimum number of teeth
     */
    minimumTeethNoInterference: function(pressureAngle = 20, addendumCoeff = 1) {
        const phi = pressureAngle * Math.PI / 180;
        return Math.ceil(2 * addendumCoeff / (Math.sin(phi) * Math.sin(phi)));
    }
};

// ═══════════════════════════════════════════════════════════════
// MECHANISM ANALYSIS (MIT 2.007 - Lecture 6)
// ═══════════════════════════════════════════════════════════════

const PRISM_MECHANISM_ANALYSIS = {
    /**
     * Calculate degrees of freedom using Gruebler's equation
     * @param {number} n - Number of links (including ground)
     * @param {number} j1 - Number of full joints (1 DOF: pins, sliders)
     * @param {number} j2 - Number of half joints (2 DOF: cam, gear contact)
     * @returns {number} Degrees of freedom
     */
    grueblerDOF: function(n, j1, j2 = 0) {
        return 3 * (n - 1) - 2 * j1 - j2;
    },

    /**
     * Check Grashof criterion for four-bar linkage
     * @param {Array} links - Array of 4 link lengths [L1, L2, L3, L4]
     * @returns {Object} Grashof analysis
     */
    grashofCriterion: function(links) {
        const sorted = [...links].sort((a, b) => a - b);
        const s = sorted[0]; // Shortest
        const l = sorted[3]; // Longest
        const p = sorted[1];
        const q = sorted[2];
        
        const grashofSum = s + l;
        const otherSum = p + q;
        
        let classification;
        if (grashofSum < otherSum) {
            classification = 'Class I Grashof (at least one crank)';
        } else if (grashofSum === otherSum) {
            classification = 'Special Grashof (change point mechanism)';
        } else {
            classification = 'Non-Grashof (no full rotation possible)';
        }
        
        return {
            isGrashof: grashofSum <= otherSum,
            shortest: s,
            longest: l,
            grashofSum: grashofSum,
            otherSum: otherSum,
            classification: classification,
            canHaveCrank: grashofSum <= otherSum
        };
    },

    /**
     * Four-bar linkage position analysis
     * @param {Object} params - {L1: ground, L2: crank, L3: coupler, L4: rocker}
     * @param {number} theta2 - Crank angle in radians
     * @returns {Object} Position solution
     */
    fourBarPosition: function(params, theta2) {
        const { L1, L2, L3, L4 } = params;
        
        // Using vector loop equation and Freudenstein's equation
        const K1 = L1 / L2;
        const K2 = L1 / L4;
        const K3 = (L2 * L2 - L3 * L3 + L4 * L4 + L1 * L1) / (2 * L2 * L4);
        
        const A = Math.cos(theta2) - K1 - K2 * Math.cos(theta2) + K3;
        const B = -2 * Math.sin(theta2);
        const C = K1 - (K2 + 1) * Math.cos(theta2) + K3;
        
        const discriminant = B * B - 4 * A * C;
        
        if (discriminant < 0) {
            return { valid: false, reason: 'No valid position - linkage cannot reach' };
        }
        
        // Two solutions (open and crossed configurations)
        const t1 = (-B + Math.sqrt(discriminant)) / (2 * A);
        const t2 = (-B - Math.sqrt(discriminant)) / (2 * A);
        
        const theta4_open = 2 * Math.atan(t1);
        const theta4_crossed = 2 * Math.atan(t2);
        
        // Calculate theta3 for open configuration
        const theta3 = Math.atan2(
            L4 * Math.sin(theta4_open) - L2 * Math.sin(theta2),
            L1 + L4 * Math.cos(theta4_open) - L2 * Math.cos(theta2)
        );
        
        return {
            valid: true,
            theta2: theta2,
            theta3: theta3,
            theta4_open: theta4_open,
            theta4_crossed: theta4_crossed,
            theta2Deg: theta2 * 180 / Math.PI,
            theta3Deg: theta3 * 180 / Math.PI,
            theta4Deg: theta4_open * 180 / Math.PI
        };
    },

    /**
     * Four-bar linkage velocity analysis
     * @param {Object} params - Link lengths
     * @param {number} theta2 - Crank angle (rad)
     * @param {number} theta3 - Coupler angle (rad)
     * @param {number} theta4 - Rocker angle (rad)
     * @param {number} omega2 - Crank angular velocity (rad/s)
     * @returns {Object} Angular velocities
     */
    fourBarVelocity: function(params, theta2, theta3, theta4, omega2) {
        const { L2, L3, L4 } = params;
        
        // Velocity equations from loop closure differentiation
        const denom = L3 * L4 * Math.sin(theta4 - theta3);
        
        const omega3 = (L2 * L4 * omega2 * Math.sin(theta4 - theta2)) / denom;
        const omega4 = (L2 * L3 * omega2 * Math.sin(theta2 - theta3)) / denom;
        
        return {
            omega2: omega2,
            omega3: omega3,
            omega4: omega4,
            velocityRatio34: omega4 / omega3,
            velocityRatio42: omega4 / omega2
        };
    }
}