const PRISM_MESH_DEFORMATION_ENGINE = {
    name: 'PRISM_MESH_DEFORMATION_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Sorkine As-Rigid-As-Possible',
    
    /**
     * As-Rigid-As-Possible (ARAP) Deformation
     * Preserves local rigidity during deformation
     */
    deformARAP: function(mesh, handles, options = {}) {
        const {
            maxIterations = 10,
            tolerance = 1e-6
        } = options;
        
        const n = mesh.vertices.length / 3;
        const positions = this._extractPositions(mesh);
        
        // Build cotangent Laplacian
        const L = this._buildCotangentLaplacian(mesh);
        
        // Compute edge weights
        const edgeWeights = this._computeEdgeWeights(mesh);
        
        // Initialize rotations to identity
        const rotations = Array(n).fill(null).map(() => [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]);
        
        // Get handle constraints
        const handleSet = new Set(handles.map(h => h.vertex));
        const handlePositions = new Map(handles.map(h => [h.vertex, h.position]));
        
        let currentPositions = positions.map(p => ({ ...p }));
        
        // Alternating optimization
        for (let iter = 0; iter < maxIterations; iter++) {
            // Local step: estimate rotations
            for (let i = 0; i < n; i++) {
                const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
                
                // Sum over edges
                for (const [j, w] of edgeWeights[i]) {
                    const eij = {
                        x: positions[i].x - positions[j].x,
                        y: positions[i].y - positions[j].y,
                        z: positions[i].z - positions[j].z
                    };
                    const eij_prime = {
                        x: currentPositions[i].x - currentPositions[j].x,
                        y: currentPositions[i].y - currentPositions[j].y,
                        z: currentPositions[i].z - currentPositions[j].z
                    };
                    
                    // Outer product weighted by edge weight
                    S[0][0] += w * eij.x * eij_prime.x;
                    S[0][1] += w * eij.x * eij_prime.y;
                    S[0][2] += w * eij.x * eij_prime.z;
                    S[1][0] += w * eij.y * eij_prime.x;
                    S[1][1] += w * eij.y * eij_prime.y;
                    S[1][2] += w * eij.y * eij_prime.z;
                    S[2][0] += w * eij.z * eij_prime.x;
                    S[2][1] += w * eij.z * eij_prime.y;
                    S[2][2] += w * eij.z * eij_prime.z;
                }
                
                // SVD to extract rotation
                rotations[i] = this._extractRotationFromSVD(S);
            }
            
            // Global step: solve for positions
            const b = Array(n).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
            
            for (let i = 0; i < n; i++) {
                if (handleSet.has(i)) {
                    // Handle constraint
                    const pos = handlePositions.get(i);
                    b[i] = { x: pos.x, y: pos.y, z: pos.z };
                    continue;
                }
                
                // ARAP right-hand side
                for (const [j, w] of edgeWeights[i]) {
                    const eij = {
                        x: positions[i].x - positions[j].x,
                        y: positions[i].y - positions[j].y,
                        z: positions[i].z - positions[j].z
                    };
                    
                    // Average rotation
                    const Ri = rotations[i];
                    const Rj = rotations[j];
                    const avgR = this._averageRotation(Ri, Rj);
                    
                    // Rotated edge
                    const re = this._applyRotation(avgR, eij);
                    
                    b[i].x += w * 0.5 * re.x;
                    b[i].y += w * 0.5 * re.y;
                    b[i].z += w * 0.5 * re.z;
                }
            }
            
            // Solve system (simplified: direct iteration)
            const newPositions = this._solveWithConstraints(L, b, handleSet, handlePositions);
            
            // Check convergence
            let maxDiff = 0;
            for (let i = 0; i < n; i++) {
                const dx = newPositions[i].x - currentPositions[i].x;
                const dy = newPositions[i].y - currentPositions[i].y;
                const dz = newPositions[i].z - currentPositions[i].z;
                maxDiff = Math.max(maxDiff, Math.sqrt(dx * dx + dy * dy + dz * dz));
            }
            
            currentPositions = newPositions;
            
            if (maxDiff < tolerance) break;
        }
        
        // Build result mesh
        return this._buildDeformedMesh(mesh, currentPositions);
    },
    
    /**
     * Laplacian Surface Editing
     * Preserves differential coordinates (Laplacian)
     */
    deformLaplacian: function(mesh, handles) {
        const n = mesh.vertices.length / 3;
        const positions = this._extractPositions(mesh);
        
        // Build uniform Laplacian
        const L = this._buildUniformLaplacian(mesh);
        
        // Compute differential coordinates
        const delta = Array(n).fill(null).map((_, i) => {
            const d = { x: 0, y: 0, z: 0 };
            for (const [j, w] of L[i]) {
                if (i !== j) {
                    d.x -= w * (positions[j].x - positions[i].x);
                    d.y -= w * (positions[j].y - positions[i].y);
                    d.z -= w * (positions[j].z - positions[i].z);
                }
            }
            return d;
        });
        
        // Set up constrained system
        const handleSet = new Set(handles.map(h => h.vertex));
        const handlePositions = new Map(handles.map(h => [h.vertex, h.position]));
        
        // Solve for new positions maintaining differential coordinates
        const newPositions = this._solveLaplacianSystem(L, delta, handleSet, handlePositions);
        
        return this._buildDeformedMesh(mesh, newPositions);
    },
    
    /**
     * Mean Value Coordinates (MVC) Cage Deformation
     */
    deformCage: function(mesh, originalCage, deformedCage) {
        const n = mesh.vertices.length / 3;
        const positions = this._extractPositions(mesh);
        
        // Compute MVC weights for each vertex
        const weights = [];
        for (let i = 0; i < n; i++) {
            weights.push(this._computeMVCWeights(positions[i], originalCage));
        }
        
        // Apply deformation using cage
        const newPositions = [];
        for (let i = 0; i < n; i++) {
            const w = weights[i];
            const pos = { x: 0, y: 0, z: 0 };
            
            for (let c = 0; c < deformedCage.length; c++) {
                pos.x += w[c] * deformedCage[c].x;
                pos.y += w[c] * deformedCage[c].y;
                pos.z += w[c] * deformedCage[c].z;
            }
            
            newPositions.push(pos);
        }
        
        return this._buildDeformedMesh(mesh, newPositions);
    },
    
    _extractPositions: function(mesh) {
        const positions = [];
        for (let i = 0; i < mesh.vertices.length; i += 3) {
            positions.push({
                x: mesh.vertices[i],
                y: mesh.vertices[i + 1],
                z: mesh.vertices[i + 2]
            });
        }
        return positions;
    },
    
    _buildCotangentLaplacian: function(mesh) {
        const n = mesh.vertices.length / 3;
        const L = Array(n).fill(null).map(() => new Map());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i + 1];
            const i2 = mesh.indices[i + 2];
            
            const v0 = this._getVertex(mesh.vertices, i0);
            const v1 = this._getVertex(mesh.vertices, i1);
            const v2 = this._getVertex(mesh.vertices, i2);
            
            const cot0 = this._cotangent(v1, v0, v2);
            const cot1 = this._cotangent(v2, v1, v0);
            const cot2 = this._cotangent(v0, v2, v1);
            
            this._addEntry(L, i1, i2, cot0 * 0.5);
            this._addEntry(L, i0, i2, cot1 * 0.5);
            this._addEntry(L, i0, i1, cot2 * 0.5);
        }
        
        // Set diagonal
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (const w of L[i].values()) sum += w;
            L[i].set(i, -sum);
        }
        
        return L;
    },
    
    _buildUniformLaplacian: function(mesh) {
        const n = mesh.vertices.length / 3;
        const adjacency = this._buildVertexAdjacency(mesh);
        const L = Array(n).fill(null).map(() => new Map());
        
        for (let i = 0; i < n; i++) {
            const neighbors = adjacency[i];
            const degree = neighbors.length;
            
            if (degree > 0) {
                for (const j of neighbors) {
                    L[i].set(j, -1 / degree);
                }
                L[i].set(i, 1);
            }
        }
        
        return L;
    },
    
    _buildVertexAdjacency: function(mesh) {
        const n = mesh.vertices.length / 3;
        const adjacency = Array(n).fill(null).map(() => new Set());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i + 1];
            const i2 = mesh.indices[i + 2];
            
            adjacency[i0].add(i1); adjacency[i0].add(i2);
            adjacency[i1].add(i0); adjacency[i1].add(i2);
            adjacency[i2].add(i0); adjacency[i2].add(i1);
        }
        
        return adjacency.map(s => Array.from(s));
    },
    
    _computeEdgeWeights: function(mesh) {
        const n = mesh.vertices.length / 3;
        const weights = Array(n).fill(null).map(() => new Map());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i + 1];
            const i2 = mesh.indices[i + 2];
            
            const v0 = this._getVertex(mesh.vertices, i0);
            const v1 = this._getVertex(mesh.vertices, i1);
            const v2 = this._getVertex(mesh.vertices, i2);
            
            const cot0 = this._cotangent(v1, v0, v2);
            const cot1 = this._cotangent(v2, v1, v0);
            const cot2 = this._cotangent(v0, v2, v1);
            
            this._addEntry(weights, i1, i2, cot0 * 0.5);
            this._addEntry(weights, i0, i2, cot1 * 0.5);
            this._addEntry(weights, i0, i1, cot2 * 0.5);
        }
        
        return weights;
    },
    
    _cotangent: function(a, b, c) {
        const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        
        const dot = ab.x * ac.x + ab.y * ac.y + ab.z * ac.z;
        const cross = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        const crossLen = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
        
        return crossLen > 1e-10 ? dot / crossLen : 0;
    },
    
    _addEntry: function(M, i, j, w) {
        M[i].set(j, (M[i].get(j) || 0) + w);
        M[j].set(i, (M[j].get(i) || 0) + w);
    },
    
    _extractRotationFromSVD: function(S) {
        // Simplified: approximate rotation from covariance
        // Full implementation would use proper SVD
        
        // Compute S^T * S
        const ATA = [
            [S[0][0] * S[0][0] + S[1][0] * S[1][0] + S[2][0] * S[2][0],
             S[0][0] * S[0][1] + S[1][0] * S[1][1] + S[2][0] * S[2][1],
             S[0][0] * S[0][2] + S[1][0] * S[1][2] + S[2][0] * S[2][2]],
            [S[0][1] * S[0][0] + S[1][1] * S[1][0] + S[2][1] * S[2][0],
             S[0][1] * S[0][1] + S[1][1] * S[1][1] + S[2][1] * S[2][1],
             S[0][1] * S[0][2] + S[1][1] * S[1][2] + S[2][1] * S[2][2]],
            [S[0][2] * S[0][0] + S[1][2] * S[1][0] + S[2][2] * S[2][0],
             S[0][2] * S[0][1] + S[1][2] * S[1][1] + S[2][2] * S[2][1],
             S[0][2] * S[0][2] + S[1][2] * S[1][2] + S[2][2] * S[2][2]]
        ];
        
        // For simplicity, return identity if S is near-zero
        const norm = Math.sqrt(S.flat().reduce((sum, v) => sum + v * v, 0));
        if (norm < 1e-10) {
            return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        }
        
        // Polar decomposition approximation
        // R = S * (S^T * S)^(-1/2)
        // Simplified: normalize columns
        const R = [];
        for (let col = 0; col < 3; col++) {
            let len = 0;
            for (let row = 0; row < 3; row++) {
                len += S[row][col] * S[row][col];
            }
            len = Math.sqrt(len);
            R.push(len > 1e-10 ? 
                [S[0][col] / len, S[1][col] / len, S[2][col] / len] :
                [col === 0 ? 1 : 0, col === 1 ? 1 : 0, col === 2 ? 1 : 0]
            );
        }
        
        return [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
    },
    
    _averageRotation: function(R1, R2) {
        // Simple average (not geodesic)
        return [
            [(R1[0][0] + R2[0][0]) / 2, (R1[0][1] + R2[0][1]) / 2, (R1[0][2] + R2[0][2]) / 2],
            [(R1[1][0] + R2[1][0]) / 2, (R1[1][1] + R2[1][1]) / 2, (R1[1][2] + R2[1][2]) / 2],
            [(R1[2][0] + R2[2][0]) / 2, (R1[2][1] + R2[2][1]) / 2, (R1[2][2] + R2[2][2]) / 2]
        ];
    },
    
    _applyRotation: function(R, v) {
        return {
            x: R[0][0] * v.x + R[0][1] * v.y + R[0][2] * v.z,
            y: R[1][0] * v.x + R[1][1] * v.y + R[1][2] * v.z,
            z: R[2][0] * v.x + R[2][1] * v.y + R[2][2] * v.z
        };
    },
    
    _solveWithConstraints: function(L, b, handleSet, handlePositions) {
        const n = L.length;
        const positions = Array(n).fill(null).map((_, i) => {
            if (handleSet.has(i)) {
                return { ...handlePositions.get(i) };
            }
            return { ...b[i] };
        });
        
        // Gauss-Seidel iteration
        for (let iter = 0; iter < 50; iter++) {
            for (let i = 0; i < n; i++) {
                if (handleSet.has(i)) continue;
                
                let sumX = b[i].x, sumY = b[i].y, sumZ = b[i].z;
                let diag = 0;
                
                for (const [j, w] of L[i]) {
                    if (i === j) {
                        diag = w;
                    } else {
                        sumX -= w * positions[j].x;
                        sumY -= w * positions[j].y;
                        sumZ -= w * positions[j].z;
                    }
                }
                
                if (Math.abs(diag) > 1e-10) {
                    positions[i] = {
                        x: sumX / diag,
                        y: sumY / diag,
                        z: sumZ / diag
                    };
                }
            }
        }
        
        return positions;
    },
    
    _solveLaplacianSystem: function(L, delta, handleSet, handlePositions) {
        // Solve L * p = delta with handle constraints
        return this._solveWithConstraints(L, delta, handleSet, handlePositions);
    },
    
    _computeMVCWeights: function(point, cage) {
        // Mean Value Coordinates
        const n = cage.length;
        const weights = new Array(n).fill(0);
        
        // Compute vectors and distances to cage vertices
        const d = [];
        const u = [];
        
        for (let i = 0; i < n; i++) {
            const v = {
                x: cage[i].x - point.x,
                y: cage[i].y - point.y,
                z: cage[i].z - point.z
            };
            const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            d.push(dist);
            u.push(dist > 1e-10 ? { x: v.x / dist, y: v.y / dist, z: v.z / dist } : { x: 0, y: 0, z: 0 });
        }
        
        // Check if point is on a vertex
        for (let i = 0; i < n; i++) {
            if (d[i] < 1e-10) {
                weights[i] = 1;
                return weights;
            }
        }
        
        // Compute MVC weights
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            
            // Angle at point
            const dot = u[i].x * u[j].x + u[i].y * u[j].y + u[i].z * u[j].z;
            const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
            
            const tanHalfTheta = Math.tan(theta / 2);
            
            if (!isFinite(tanHalfTheta)) continue;
            
            weights[i] += tanHalfTheta / d[i];
            weights[j] += tanHalfTheta / d[j];
        }
        
        // Normalize
        const sum = weights.reduce((a, b) => a + b, 0);
        if (sum > 1e-10) {
            for (let i = 0; i < n; i++) {
                weights[i] /= sum;
            }
        }
        
        return weights;
    },
    
    _buildDeformedMesh: function(originalMesh, newPositions) {
        const vertices = new Float32Array(newPositions.length * 3);
        
        for (let i = 0; i < newPositions.length; i++) {
            vertices[i * 3] = newPositions[i].x;
            vertices[i * 3 + 1] = newPositions[i].y;
            vertices[i * 3 + 2] = newPositions[i].z;
        }
        
        return {
            vertices,
            indices: new Uint32Array(originalMesh.indices)
        };
    },
    
    _getVertex: function(vertices, idx) {
        return {
            x: vertices[idx * 3],
            y: vertices[idx * 3 + 1],
            z: vertices[idx * 3 + 2]
        };
    }
}