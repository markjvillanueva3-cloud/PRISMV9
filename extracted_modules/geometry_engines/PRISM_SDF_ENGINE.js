const PRISM_SDF_ENGINE = {
    name: 'PRISM_SDF_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.837, Bridson Level Sets',
    
    /**
     * Compute Signed Distance Field for mesh
     */
    computeSDF: function(mesh, resolution = 50) {
        // Compute bounds
        const bounds = this._computeBounds(mesh.vertices);
        const padding = 0.1;
        
        const size = {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z
        };
        
        const maxSize = Math.max(size.x, size.y, size.z) * (1 + 2 * padding);
        const cellSize = maxSize / resolution;
        
        const origin = {
            x: (bounds.min.x + bounds.max.x) / 2 - maxSize / 2,
            y: (bounds.min.y + bounds.max.y) / 2 - maxSize / 2,
            z: (bounds.min.z + bounds.max.z) / 2 - maxSize / 2
        };
        
        const nx = resolution;
        const ny = resolution;
        const nz = resolution;
        
        // Initialize grid
        const grid = Array(nx).fill(null).map(() =>
            Array(ny).fill(null).map(() =>
                Array(nz).fill(Infinity)
            )
        );
        
        // Compute distances
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    const p = {
                        x: origin.x + (i + 0.5) * cellSize,
                        y: origin.y + (j + 0.5) * cellSize,
                        z: origin.z + (k + 0.5) * cellSize
                    };
                    
                    grid[i][j][k] = this._signedDistanceToMesh(p, mesh);
                }
            }
        }
        
        // Find max distance for normalization
        let maxDist = 0;
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    maxDist = Math.max(maxDist, Math.abs(grid[i][j][k]));
                }
            }
        }
        
        return { grid, origin, cellSize, nx, ny, nz, maxDist, bounds };
    },
    
    /**
     * Extract isosurface from SDF using Marching Cubes
     */
    extractIsosurface: function(sdf, isovalue = 0) {
        const vertices = [];
        const indices = [];
        const vertexMap = new Map();
        
        for (let i = 0; i < sdf.nx - 1; i++) {
            for (let j = 0; j < sdf.ny - 1; j++) {
                for (let k = 0; k < sdf.nz - 1; k++) {
                    this._marchCube(
                        sdf, i, j, k, isovalue,
                        vertices, indices, vertexMap
                    );
                }
            }
        }
        
        return {
            vertices: new Float32Array(vertices),
            indices: new Uint32Array(indices)
        };
    },
    
    /**
     * Boolean operations via SDF
     */
    sdfUnion: function(sdfA, sdfB) {
        return this._combineSDF(sdfA, sdfB, Math.min);
    },
    
    sdfIntersection: function(sdfA, sdfB) {
        return this._combineSDF(sdfA, sdfB, Math.max);
    },
    
    sdfDifference: function(sdfA, sdfB) {
        return this._combineSDF(sdfA, sdfB, (a, b) => Math.max(a, -b));
    },
    
    /**
     * Smooth union/intersection
     */
    sdfSmoothUnion: function(sdfA, sdfB, k = 0.1) {
        return this._combineSDF(sdfA, sdfB, (a, b) => {
            const h = Math.max(k - Math.abs(a - b), 0) / k;
            return Math.min(a, b) - h * h * k / 4;
        });
    },
    
    /**
     * Offset surface (dilate/erode)
     */
    sdfOffset: function(sdf, offset) {
        const result = {
            ...sdf,
            grid: sdf.grid.map(plane =>
                plane.map(row =>
                    row.map(val => val - offset)
                )
            )
        };
        return result;
    },
    
    _signedDistanceToMesh: function(point, mesh) {
        let minDist = Infinity;
        let sign = 1;
        
        const numFaces = mesh.indices.length / 3;
        let closestNormal = { x: 0, y: 1, z: 0 };
        
        for (let f = 0; f < numFaces; f++) {
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            const { distance, closest, normal } = this._pointTriangleDistance(point, v0, v1, v2);
            
            if (distance < minDist) {
                minDist = distance;
                closestNormal = normal;
            }
        }
        
        // Determine sign (inside/outside)
        // Use closest normal to determine sign
        const toPoint = { x: point.x, y: point.y, z: point.z };
        // Simplified: assume outward normals, negative inside
        // In practice, need consistent winding
        
        return minDist; // Unsigned for now
    },
    
    _pointTriangleDistance: function(p, v0, v1, v2) {
        // Compute closest point on triangle to p
        const e0 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e1 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const v = { x: v0.x - p.x, y: v0.y - p.y, z: v0.z - p.z };
        
        const a = e0.x * e0.x + e0.y * e0.y + e0.z * e0.z;
        const b = e0.x * e1.x + e0.y * e1.y + e0.z * e1.z;
        const c = e1.x * e1.x + e1.y * e1.y + e1.z * e1.z;
        const d = e0.x * v.x + e0.y * v.y + e0.z * v.z;
        const e = e1.x * v.x + e1.y * v.y + e1.z * v.z;
        
        const det = a * c - b * b;
        let s = b * e - c * d;
        let t = b * d - a * e;
        
        if (s + t <= det) {
            if (s < 0) {
                if (t < 0) {
                    // Region 4
                    if (d < 0) {
                        t = 0;
                        s = -d >= a ? 1 : -d / a;
                    } else {
                        s = 0;
                        t = e >= 0 ? 0 : (-e >= c ? 1 : -e / c);
                    }
                } else {
                    // Region 3
                    s = 0;
                    t = e >= 0 ? 0 : (-e >= c ? 1 : -e / c);
                }
            } else if (t < 0) {
                // Region 5
                t = 0;
                s = d >= 0 ? 0 : (-d >= a ? 1 : -d / a);
            } else {
                // Region 0
                const invDet = 1 / det;
                s *= invDet;
                t *= invDet;
            }
        } else {
            if (s < 0) {
                // Region 2
                const tmp0 = b + d;
                const tmp1 = c + e;
                if (tmp1 > tmp0) {
                    const numer = tmp1 - tmp0;
                    const denom = a - 2 * b + c;
                    s = numer >= denom ? 1 : numer / denom;
                    t = 1 - s;
                } else {
                    s = 0;
                    t = tmp1 <= 0 ? 1 : (e >= 0 ? 0 : -e / c);
                }
            } else if (t < 0) {
                // Region 6
                const tmp0 = b + e;
                const tmp1 = a + d;
                if (tmp1 > tmp0) {
                    const numer = tmp1 - tmp0;
                    const denom = a - 2 * b + c;
                    t = numer >= denom ? 1 : numer / denom;
                    s = 1 - t;
                } else {
                    t = 0;
                    s = tmp1 <= 0 ? 1 : (d >= 0 ? 0 : -d / a);
                }
            } else {
                // Region 1
                const numer = (c + e) - (b + d);
                if (numer <= 0) {
                    s = 0;
                } else {
                    const denom = a - 2 * b + c;
                    s = numer >= denom ? 1 : numer / denom;
                }
                t = 1 - s;
            }
        }
        
        const closest = {
            x: v0.x + s * e0.x + t * e1.x,
            y: v0.y + s * e0.y + t * e1.y,
            z: v0.z + s * e0.z + t * e1.z
        };
        
        const distance = Math.sqrt(
            Math.pow(p.x - closest.x, 2) +
            Math.pow(p.y - closest.y, 2) +
            Math.pow(p.z - closest.z, 2)
        );
        
        // Face normal
        const normal = this._triangleNormal(v0, v1, v2);
        
        return { distance, closest, normal };
    },
    
    _triangleNormal: function(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        
        const n = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        
        return len > 1e-10 ? { x: n.x / len, y: n.y / len, z: n.z / len } : { x: 0, y: 1, z: 0 };
    },
    
    _combineSDF: function(sdfA, sdfB, op) {
        // Assuming same resolution
        const result = {
            ...sdfA,
            grid: sdfA.grid.map((plane, i) =>
                plane.map((row, j) =>
                    row.map((val, k) => op(val, sdfB.grid[i][j][k]))
                )
            )
        };
        return result;
    },
    
    _marchCube: function(sdf, i, j, k, isovalue, vertices, indices, vertexMap) {
        // Get corner values
        const values = [
            sdf.grid[i][j][k],
            sdf.grid[i + 1][j][k],
            sdf.grid[i + 1][j + 1][k],
            sdf.grid[i][j + 1][k],
            sdf.grid[i][j][k + 1],
            sdf.grid[i + 1][j][k + 1],
            sdf.grid[i + 1][j + 1][k + 1],
            sdf.grid[i][j + 1][k + 1]
        ];
        
        // Compute cube index
        let cubeIndex = 0;
        for (let v = 0; v < 8; v++) {
            if (values[v] < isovalue) {
                cubeIndex |= (1 << v);
            }
        }
        
        if (cubeIndex === 0 || cubeIndex === 255) return;
        
        // Get corner positions
        const corners = [
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize },
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize }
        ];
        
        // Edge table (simplified)
        const edgeVertex = [];
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];
        
        for (let e = 0; e < 12; e++) {
            const [v1, v2] = edges[e];
            
            if ((values[v1] < isovalue) !== (values[v2] < isovalue)) {
                const t = (isovalue - values[v1]) / (values[v2] - values[v1]);
                const p = {
                    x: corners[v1].x + t * (corners[v2].x - corners[v1].x),
                    y: corners[v1].y + t * (corners[v2].y - corners[v1].y),
                    z: corners[v1].z + t * (corners[v2].z - corners[v1].z)
                };
                
                const key = `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
                
                if (!vertexMap.has(key)) {
                    vertexMap.set(key, vertices.length / 3);
                    vertices.push(p.x, p.y, p.z);
                }
                
                edgeVertex[e] = vertexMap.get(key);
            }
        }
        
        // Generate triangles (simplified - using edge midpoint approach)
        // Full implementation would use marching cubes lookup table
        const triTable = this._getMarchingCubesTriangles(cubeIndex);
        
        for (let t = 0; t < triTable.length; t += 3) {
            if (triTable[t] < 0) break;
            
            if (edgeVertex[triTable[t]] !== undefined &&
                edgeVertex[triTable[t + 1]] !== undefined &&
                edgeVertex[triTable[t + 2]] !== undefined) {
                indices.push(
                    edgeVertex[triTable[t]],
                    edgeVertex[triTable[t + 1]],
                    edgeVertex[triTable[t + 2]]
                );
            }
        }
    },
    
    _getMarchingCubesTriangles: function(cubeIndex) {
        // Simplified triangle table - returns edges for common cases
        // Full implementation would have complete 256-case lookup table
        const table = {
            1: [0, 8, 3],
            2: [0, 1, 9],
            3: [1, 8, 3, 9, 8, 1],
            // ... would have all 256 cases
        };
        
        return table[cubeIndex] || [];
    },
    
    _computeBounds: function(vertices) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < vertices.length; i += 3) {
            minX = Math.min(minX, vertices[i]);
            minY = Math.min(minY, vertices[i + 1]);
            minZ = Math.min(minZ, vertices[i + 2]);
            maxX = Math.max(maxX, vertices[i]);
            maxY = Math.max(maxY, vertices[i + 1]);
            maxZ = Math.max(maxZ, vertices[i + 2]);
        }
        
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
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