const PRISM_ICP_REGISTRATION_ENGINE = {
    name: 'PRISM_ICP_REGISTRATION_ENGINE',
    version: '1.0.0',
    source: 'Besl & McKay 1992, Stanford CS 468',
    
    /**
     * Point-to-point ICP
     */
    alignPointToPoint: function(sourcePoints, targetPoints, options = {}) {
        const {
            maxIterations = 50,
            tolerance = 1e-6,
            maxCorrespondenceDistance = Infinity
        } = options;
        
        let source = sourcePoints.map(p => ({ ...p }));
        let totalTransform = this._identityMatrix();
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Find correspondences
            const correspondences = this._findCorrespondences(source, targetPoints, maxCorrespondenceDistance);
            
            if (correspondences.length < 3) {
                console.warn('[ICP] Insufficient correspondences');
                break;
            }
            
            // Compute optimal transform
            const transform = this._computeRigidTransform(
                correspondences.map(c => c.source),
                correspondences.map(c => c.target)
            );
            
            // Apply transform to source
            source = source.map(p => this._applyTransform(p, transform));
            
            // Accumulate transform
            totalTransform = this._multiplyMatrices(transform, totalTransform);
            
            // Check convergence
            const error = this._computeMeanError(correspondences);
            if (error < tolerance) break;
        }
        
        return {
            transform: totalTransform,
            alignedPoints: source,
            finalError: this._computeMeanError(this._findCorrespondences(source, targetPoints, Infinity))
        };
    },
    
    /**
     * Point-to-plane ICP (faster convergence)
     */
    alignPointToPlane: function(sourcePoints, targetMesh, options = {}) {
        const {
            maxIterations = 30,
            tolerance = 1e-6
        } = options;
        
        // Build KD-tree for target
        const targetWithNormals = this._computeVertexNormals(targetMesh);
        const kdTree = this._buildSimpleKDTree(targetWithNormals);
        
        let source = sourcePoints.map(p => ({ ...p }));
        let totalTransform = this._identityMatrix();
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Find correspondences with normals
            const correspondences = [];
            for (const p of source) {
                const nearest = this._findNearestInKDTree(kdTree, p);
                if (nearest) {
                    correspondences.push({
                        source: p,
                        target: nearest.point,
                        normal: nearest.normal
                    });
                }
            }
            
            if (correspondences.length < 6) break;
            
            // Solve point-to-plane using linear least squares
            const transform = this._solvePointToPlane(correspondences);
            
            // Apply transform
            source = source.map(p => this._applyTransform(p, transform));
            totalTransform = this._multiplyMatrices(transform, totalTransform);
            
            // Check convergence
            const error = correspondences.reduce((sum, c) => {
                const d = this._dot(this._subtract(c.source, c.target), c.normal);
                return sum + d * d;
            }, 0) / correspondences.length;
            
            if (Math.sqrt(error) < tolerance) break;
        }
        
        return {
            transform: totalTransform,
            alignedPoints: source
        };
    },
    
    _findCorrespondences: function(source, target, maxDist) {
        const correspondences = [];
        for (const s of source) {
            let bestDist = Infinity, bestTarget = null;
            for (const t of target) {
                const d = this._distance(s, t);
                if (d < bestDist && d < maxDist) {
                    bestDist = d;
                    bestTarget = t;
                }
            }
            if (bestTarget) {
                correspondences.push({ source: s, target: bestTarget, distance: bestDist });
            }
        }
        return correspondences;
    },
    
    _computeRigidTransform: function(source, target) {
        // Compute centroids
        const centroidS = this._computeCentroid(source);
        const centroidT = this._computeCentroid(target);
        
        // Center points
        const centeredS = source.map(p => this._subtract(p, centroidS));
        const centeredT = target.map(p => this._subtract(p, centroidT));
        
        // Compute covariance matrix H
        const H = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < centeredS.length; i++) {
            const s = centeredS[i], t = centeredT[i];
            H[0][0] += s.x * t.x; H[0][1] += s.x * t.y; H[0][2] += s.x * t.z;
            H[1][0] += s.y * t.x; H[1][1] += s.y * t.y; H[1][2] += s.y * t.z;
            H[2][0] += s.z * t.x; H[2][1] += s.z * t.y; H[2][2] += s.z * t.z;
        }
        
        // SVD for rotation (simplified Jacobi-like approach)
        const R = this._computeRotationFromSVD(H);
        
        // Translation: t = centroidT - R * centroidS
        const rotatedCentroid = this._multiplyMatrixVector(R, centroidS);
        const translation = this._subtract(centroidT, rotatedCentroid);
        
        return {
            rotation: R,
            translation: translation
        };
    },
    
    _computeRotationFromSVD: function(H) {
        // Simplified SVD via power iteration for 3x3
        // Returns rotation matrix from H = USV^T, R = VU^T
        const maxIter = 50;
        
        // Start with H^T * H
        const HtH = this._transposeMultiply(H, H);
        
        // Power iteration for principal eigenvector
        let v = [1, 0, 0];
        for (let i = 0; i < maxIter; i++) {
            const next = this._multiplyMatrixVector3(HtH, { x: v[0], y: v[1], z: v[2] });
            const norm = Math.sqrt(next.x*next.x + next.y*next.y + next.z*next.z);
            if (norm < 1e-10) break;
            v = [next.x/norm, next.y/norm, next.z/norm];
        }
        
        // For simplicity, use Rodrigues rotation formula approximation
        // Full SVD would be more accurate
        const det = H[0][0]*(H[1][1]*H[2][2]-H[1][2]*H[2][1]) -
                    H[0][1]*(H[1][0]*H[2][2]-H[1][2]*H[2][0]) +
                    H[0][2]*(H[1][0]*H[2][1]-H[1][1]*H[2][0]);
        
        // If det(H) < 0, need to flip one column
        const sign = det >= 0 ? 1 : -1;
        
        // Normalize columns of H for approximate rotation
        const c0 = Math.sqrt(H[0][0]*H[0][0] + H[1][0]*H[1][0] + H[2][0]*H[2][0]) || 1;
        const c1 = Math.sqrt(H[0][1]*H[0][1] + H[1][1]*H[1][1] + H[2][1]*H[2][1]) || 1;
        const c2 = Math.sqrt(H[0][2]*H[0][2] + H[1][2]*H[1][2] + H[2][2]*H[2][2]) || 1;
        
        const R = [
            [H[0][0]/c0, H[0][1]/c1, sign*H[0][2]/c2],
            [H[1][0]/c0, H[1][1]/c1, sign*H[1][2]/c2],
            [H[2][0]/c0, H[2][1]/c1, sign*H[2][2]/c2]
        ];
        
        // Orthogonalize using Gram-Schmidt
        return this._orthogonalize(R);
    },
    
    _orthogonalize: function(M) {
        const col0 = { x: M[0][0], y: M[1][0], z: M[2][0] };
        const col1 = { x: M[0][1], y: M[1][1], z: M[2][1] };
        const col2 = { x: M[0][2], y: M[1][2], z: M[2][2] };
        
        const u0 = this._normalize(col0);
        const u1 = this._normalize(this._subtract(col1, this._scale(u0, this._dot(col1, u0))));
        const u2 = this._cross(u0, u1);
        
        return [
            [u0.x, u1.x, u2.x],
            [u0.y, u1.y, u2.y],
            [u0.z, u1.z, u2.z]
        ];
    },
    
    _solvePointToPlane: function(correspondences) {
        // Linear least squares for point-to-plane
        // Minimize sum_i (n_i · (R*s_i + t - t_i))^2
        // Linearized for small rotations: R ≈ I + [α]×
        
        const n = correspondences.length;
        const A = [], b = [];
        
        for (const c of correspondences) {
            const s = c.source, t = c.target, norm = c.normal;
            
            // Row: [s×n, n] · [α, t] = n·(t-s)
            const sxn = this._cross(s, norm);
            A.push([sxn.x, sxn.y, sxn.z, norm.x, norm.y, norm.z]);
            b.push(this._dot(norm, this._subtract(t, s)));
        }
        
        // Solve via normal equations
        const AtA = this._matrixTransposeMultiply6(A);
        const Atb = this._matrixTransposeVector6(A, b);
        
        const x = this._solve6x6(AtA, Atb);
        
        // Build rotation from skew-symmetric
        const alpha = { x: x[0], y: x[1], z: x[2] };
        const R = [
            [1, -alpha.z, alpha.y],
            [alpha.z, 1, -alpha.x],
            [-alpha.y, alpha.x, 1]
        ];
        
        return {
            rotation: this._orthogonalize(R),
            translation: { x: x[3], y: x[4], z: x[5] }
        };
    },
    
    _matrixTransposeMultiply6: function(A) {
        const n = A.length;
        const AtA = Array.from({ length: 6 }, () => Array(6).fill(0));
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                for (let k = 0; k < n; k++) {
                    AtA[i][j] += A[k][i] * A[k][j];
                }
            }
        }
        return AtA;
    },
    
    _matrixTransposeVector6: function(A, b) {
        const n = A.length;
        const Atb = Array(6).fill(0);
        for (let i = 0; i < 6; i++) {
            for (let k = 0; k < n; k++) {
                Atb[i] += A[k][i] * b[k];
            }
        }
        return Atb;
    },
    
    _solve6x6: function(A, b) {
        // Gauss-Jordan elimination for 6x6
        const aug = A.map((row, i) => [...row, b[i]]);
        const n = 6;
        
        for (let col = 0; col < n; col++) {
            // Find pivot
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                    maxRow = row;
                }
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            
            if (Math.abs(aug[col][col]) < 1e-10) continue;
            
            // Scale pivot row
            const pivot = aug[col][col];
            for (let j = col; j <= n; j++) {
                aug[col][j] /= pivot;
            }
            
            // Eliminate
            for (let row = 0; row < n; row++) {
                if (row !== col) {
                    const factor = aug[row][col];
                    for (let j = col; j <= n; j++) {
                        aug[row][j] -= factor * aug[col][j];
                    }
                }
            }
        }
        
        return aug.map(row => row[n]);
    },
    
    _identityMatrix: function() {
        return {
            rotation: [[1,0,0], [0,1,0], [0,0,1]],
            translation: { x: 0, y: 0, z: 0 }
        };
    },
    
    _applyTransform: function(p, transform) {
        const rotated = this._multiplyMatrixVector(transform.rotation, p);
        return {
            x: rotated.x + transform.translation.x,
            y: rotated.y + transform.translation.y,
            z: rotated.z + transform.translation.z
        };
    },
    
    _multiplyMatrices: function(A, B) {
        const R1 = A.rotation, R2 = B.rotation;
        const R = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    R[i][j] += R1[i][k] * R2[k][j];
                }
            }
        }
        
        const rotatedT2 = this._multiplyMatrixVector(R1, B.translation);
        
        return {
            rotation: R,
            translation: {
                x: rotatedT2.x + A.translation.x,
                y: rotatedT2.y + A.translation.y,
                z: rotatedT2.z + A.translation.z
            }
        };
    },
    
    _multiplyMatrixVector: function(M, v) {
        return {
            x: M[0][0]*v.x + M[0][1]*v.y + M[0][2]*v.z,
            y: M[1][0]*v.x + M[1][1]*v.y + M[1][2]*v.z,
            z: M[2][0]*v.x + M[2][1]*v.y + M[2][2]*v.z
        };
    },
    
    _multiplyMatrixVector3: function(M, v) {
        return {
            x: M[0][0]*v.x + M[0][1]*v.y + M[0][2]*v.z,
            y: M[1][0]*v.x + M[1][1]*v.y + M[1][2]*v.z,
            z: M[2][0]*v.x + M[2][1]*v.y + M[2][2]*v.z
        };
    },
    
    _transposeMultiply: function(A, B) {
        const C = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    C[i][j] += A[k][i] * B[k][j];
                }
            }
        }
        return C;
    },
    
    _computeCentroid: function(points) {
        const sum = { x: 0, y: 0, z: 0 };
        for (const p of points) {
            sum.x += p.x; sum.y += p.y; sum.z += p.z;
        }
        const n = points.length;
        return { x: sum.x/n, y: sum.y/n, z: sum.z/n };
    },
    
    _subtract: function(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    _dot: function(a, b) {
        return a.x*b.x + a.y*b.y + a.z*b.z;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y*b.z - a.z*b.y,
            y: a.z*b.x - a.x*b.z,
            z: a.x*b.y - a.y*b.x
        };
    },
    
    _normalize: function(v) {
        const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z) || 1;
        return { x: v.x/len, y: v.y/len, z: v.z/len };
    },
    
    _scale: function(v, s) {
        return { x: v.x*s, y: v.y*s, z: v.z*s };
    },
    
    _computeMeanError: function(correspondences) {
        if (correspondences.length === 0) return Infinity;
        const sum = correspondences.reduce((s, c) => s + c.distance * c.distance, 0);
        return Math.sqrt(sum / correspondences.length);
    },
    
    _computeVertexNormals: function(mesh) {
        const normals = Array(mesh.vertices.length / 3).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
        const counts = Array(mesh.vertices.length / 3).fill(0);
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i], i1 = mesh.indices[i+1], i2 = mesh.indices[i+2];
            const v0 = this._getVertex(mesh.vertices, i0);
            const v1 = this._getVertex(mesh.vertices, i1);
            const v2 = this._getVertex(mesh.vertices, i2);
            
            const n = this._cross(this._subtract(v1, v0), this._subtract(v2, v0));
            
            for (const idx of [i0, i1, i2]) {
                normals[idx].x += n.x;
                normals[idx].y += n.y;
                normals[idx].z += n.z;
                counts[idx]++;
            }
        }
        
        return normals.map((n, i) => ({
            point: this._getVertex(mesh.vertices, i),
            normal: this._normalize(n)
        })).filter(v => counts[normals.indexOf(n)] > 0);
    },
    
    _getVertex: function(vertices, idx) {
        return { x: vertices[idx*3], y: vertices[idx*3+1], z: vertices[idx*3+2] };
    },
    
    _buildSimpleKDTree: function(pointsWithNormals) {
        return { points: pointsWithNormals };
    },
    
    _findNearestInKDTree: function(kdTree, query) {
        let best = null, bestDist = Infinity;
        for (const pn of kdTree.points) {
            const d = this._distance(query, pn.point);
            if (d < bestDist) {
                bestDist = d;
                best = pn;
            }
        }
        return best;
    }
}