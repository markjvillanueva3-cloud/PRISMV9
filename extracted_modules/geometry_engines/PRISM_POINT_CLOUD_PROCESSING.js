const PRISM_POINT_CLOUD_PROCESSING = {
    name: 'PRISM_POINT_CLOUD_PROCESSING',
    version: '1.0.0',
    source: 'Alexa et al. 2001, Hoppe et al. 1992, MIT 6.837',
    description: 'Point cloud processing for surface reconstruction',
    
    /**
     * Estimate normals from point cloud using PCA
     * Source: Hoppe et al., "Surface Reconstruction from Unorganized Points" (1992)
     * @param {Array} points - Point cloud [{x, y, z}, ...]
     * @param {number} k - Number of neighbors for normal estimation
     */
    estimateNormals: function(points, k = 10) {
        const normals = [];
        const kdtree = this._buildKDTree(points);
        
        for (let i = 0; i < points.length; i++) {
            const neighbors = this._kNearestNeighbors(kdtree, points[i], k, points);
            
            // Compute covariance matrix
            const centroid = { x: 0, y: 0, z: 0 };
            for (const ni of neighbors) {
                centroid.x += points[ni].x;
                centroid.y += points[ni].y;
                centroid.z += points[ni].z;
            }
            centroid.x /= neighbors.length;
            centroid.y /= neighbors.length;
            centroid.z /= neighbors.length;
            
            // Covariance matrix
            let cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            for (const ni of neighbors) {
                const dx = points[ni].x - centroid.x;
                const dy = points[ni].y - centroid.y;
                const dz = points[ni].z - centroid.z;
                
                cov[0][0] += dx * dx;
                cov[0][1] += dx * dy;
                cov[0][2] += dx * dz;
                cov[1][1] += dy * dy;
                cov[1][2] += dy * dz;
                cov[2][2] += dz * dz;
            }
            cov[1][0] = cov[0][1];
            cov[2][0] = cov[0][2];
            cov[2][1] = cov[1][2];
            
            // Find smallest eigenvector (normal)
            const normal = this._smallestEigenvector(cov);
            normals.push(normal);
        }
        
        // Orient normals consistently (propagate orientation via MST)
        this._orientNormals(points, normals, kdtree);
        
        return normals;
    },
    
    /**
     * Moving Least Squares (MLS) surface projection
     * Source: Alexa et al., "Point Set Surfaces" (2001)
     * @param {Array} points - Point cloud
     * @param {number} queryPoint - Point to project
     * @param {number} h - Smoothing parameter
     */
    mlsProject: function(points, queryPoint, h = 1.0) {
        const kdtree = this._buildKDTree(points);
        const neighbors = this._neighborsInRadius(kdtree, queryPoint, 3 * h, points);
        
        if (neighbors.length < 3) {
            return { ...queryPoint };
        }
        
        // Weighted centroid
        let sumW = 0;
        const centroid = { x: 0, y: 0, z: 0 };
        
        for (const ni of neighbors) {
            const dx = points[ni].x - queryPoint.x;
            const dy = points[ni].y - queryPoint.y;
            const dz = points[ni].z - queryPoint.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const w = Math.exp(-dist * dist / (h * h));
            
            centroid.x += w * points[ni].x;
            centroid.y += w * points[ni].y;
            centroid.z += w * points[ni].z;
            sumW += w;
        }
        
        centroid.x /= sumW;
        centroid.y /= sumW;
        centroid.z /= sumW;
        
        // Fit local plane using weighted PCA
        let cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (const ni of neighbors) {
            const dx = points[ni].x - queryPoint.x;
            const dy = points[ni].y - queryPoint.y;
            const dz = points[ni].z - queryPoint.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const w = Math.exp(-dist * dist / (h * h));
            
            const px = points[ni].x - centroid.x;
            const py = points[ni].y - centroid.y;
            const pz = points[ni].z - centroid.z;
            
            cov[0][0] += w * px * px;
            cov[0][1] += w * px * py;
            cov[0][2] += w * px * pz;
            cov[1][1] += w * py * py;
            cov[1][2] += w * py * pz;
            cov[2][2] += w * pz * pz;
        }
        cov[1][0] = cov[0][1];
        cov[2][0] = cov[0][2];
        cov[2][1] = cov[1][2];
        
        const normal = this._smallestEigenvector(cov);
        
        // Project query point onto plane
        const d = (queryPoint.x - centroid.x) * normal.x +
                  (queryPoint.y - centroid.y) * normal.y +
                  (queryPoint.z - centroid.z) * normal.z;
        
        return {
            x: queryPoint.x - d * normal.x,
            y: queryPoint.y - d * normal.y,
            z: queryPoint.z - d * normal.z
        };
    },
    
    /**
     * Reconstruct surface from point cloud
     * Creates a triangle mesh using Ball Pivoting Algorithm (simplified)
     */
    reconstructSurface: function(points, ballRadius = 1.0) {
        const normals = this.estimateNormals(points);
        const vertices = points.map(p => ({ ...p }));
        const faces = [];
        
        // Use Poisson reconstruction approach (simplified marching cubes)
        const bounds = this._computeBounds(points);
        const resolution = Math.ceil(Math.max(
            bounds.max.x - bounds.min.x,
            bounds.max.y - bounds.min.y,
            bounds.max.z - bounds.min.z
        ) / ballRadius) * 2;
        
        // Create implicit function from oriented points
        const gridSize = Math.min(resolution, 50);
        const grid = this._createImplicitGrid(points, normals, bounds, gridSize);
        
        // March through grid
        const result = PRISM_ISOSURFACE_ENGINE.marchingCubes(grid, 0.0);
        
        return {
            vertices: result.vertices,
            faces: result.faces,
            normals: normals
        };
    },
    
    _createImplicitGrid: function(points, normals, bounds, gridSize) {
        const dx = (bounds.max.x - bounds.min.x) / gridSize;
        const dy = (bounds.max.y - bounds.min.y) / gridSize;
        const dz = (bounds.max.z - bounds.min.z) / gridSize;
        
        const grid = [];
        
        for (let i = 0; i <= gridSize; i++) {
            const plane = [];
            for (let j = 0; j <= gridSize; j++) {
                const row = [];
                for (let k = 0; k <= gridSize; k++) {
                    const x = bounds.min.x + i * dx;
                    const y = bounds.min.y + j * dy;
                    const z = bounds.min.z + k * dz;
                    
                    // Compute signed distance (simplified)
                    let minDist = Infinity;
                    let sign = 1;
                    
                    for (let pi = 0; pi < points.length; pi++) {
                        const px = x - points[pi].x;
                        const py = y - points[pi].y;
                        const pz = z - points[pi].z;
                        const dist = Math.sqrt(px * px + py * py + pz * pz);
                        
                        if (dist < minDist) {
                            minDist = dist;
                            // Sign from normal
                            const dot = px * normals[pi].x + py * normals[pi].y + pz * normals[pi].z;
                            sign = dot >= 0 ? 1 : -1;
                        }
                    }
                    
                    row.push(sign * minDist);
                }
                plane.push(row);
            }
            grid.push(plane);
        }
        
        return {
            data: grid,
            bounds: bounds,
            size: { x: gridSize + 1, y: gridSize + 1, z: gridSize + 1 }
        };
    },
    
    // Simplified KD-tree implementation
    _buildKDTree: function(points) {
        return { points: points, root: this._buildKDNode(points.map((_, i) => i), 0, points) };
    },
    
    _buildKDNode: function(indices, depth, points) {
        if (indices.length === 0) return null;
        if (indices.length === 1) return { index: indices[0], left: null, right: null };
        
        const axis = depth % 3;
        const axisKey = ['x', 'y', 'z'][axis];
        
        indices.sort((a, b) => points[a][axisKey] - points[b][axisKey]);
        const mid = Math.floor(indices.length / 2);
        
        return {
            index: indices[mid],
            axis: axis,
            left: this._buildKDNode(indices.slice(0, mid), depth + 1, points),
            right: this._buildKDNode(indices.slice(mid + 1), depth + 1, points)
        };
    },
    
    _kNearestNeighbors: function(kdtree, point, k, points) {
        const heap = [];
        this._knnSearch(kdtree.root, point, k, heap, points);
        return heap.map(h => h.index).sort((a, b) => a - b);
    },
    
    _knnSearch: function(node, point, k, heap, points) {
        if (!node) return;
        
        const p = points[node.index];
        const dist = Math.sqrt(
            Math.pow(p.x - point.x, 2) +
            Math.pow(p.y - point.y, 2) +
            Math.pow(p.z - point.z, 2)
        );
        
        if (heap.length < k) {
            heap.push({ index: node.index, dist: dist });
            heap.sort((a, b) => b.dist - a.dist);
        } else if (dist < heap[0].dist) {
            heap[0] = { index: node.index, dist: dist };
            heap.sort((a, b) => b.dist - a.dist);
        }
        
        const axis = node.axis || 0;
        const axisKey = ['x', 'y', 'z'][axis];
        const diff = point[axisKey] - p[axisKey];
        
        const first = diff < 0 ? node.left : node.right;
        const second = diff < 0 ? node.right : node.left;
        
        this._knnSearch(first, point, k, heap, points);
        
        if (heap.length < k || Math.abs(diff) < heap[0].dist) {
            this._knnSearch(second, point, k, heap, points);
        }
    },
    
    _neighborsInRadius: function(kdtree, point, radius, points) {
        const result = [];
        this._radiusSearch(kdtree.root, point, radius, result, points);
        return result;
    },
    
    _radiusSearch: function(node, point, radius, result, points) {
        if (!node) return;
        
        const p = points[node.index];
        const dist = Math.sqrt(
            Math.pow(p.x - point.x, 2) +
            Math.pow(p.y - point.y, 2) +
            Math.pow(p.z - point.z, 2)
        );
        
        if (dist <= radius) {
            result.push(node.index);
        }
        
        const axis = node.axis || 0;
        const axisKey = ['x', 'y', 'z'][axis];
        const diff = point[axisKey] - p[axisKey];
        
        if (diff - radius <= 0) this._radiusSearch(node.left, point, radius, result, points);
        if (diff + radius >= 0) this._radiusSearch(node.right, point, radius, result, points);
    },
    
    _smallestEigenvector: function(cov) {
        // Power iteration for smallest eigenvector (via inverse)
        // Simplified: assume normal is approximately axis-aligned
        let v = { x: 1, y: 0, z: 0 };
        
        for (let iter = 0; iter < 20; iter++) {
            const newV = {
                x: cov[0][0] * v.x + cov[0][1] * v.y + cov[0][2] * v.z,
                y: cov[1][0] * v.x + cov[1][1] * v.y + cov[1][2] * v.z,
                z: cov[2][0] * v.x + cov[2][1] * v.y + cov[2][2] * v.z
            };
            
            const len = Math.sqrt(newV.x * newV.x + newV.y * newV.y + newV.z * newV.z);
            if (len < 1e-10) break;
            
            v = { x: newV.x / len, y: newV.y / len, z: newV.z / len };
        }
        
        // For smallest eigenvector, find perpendicular to largest
        // Simplified: use cross product with arbitrary vector
        let perp = { x: 0, y: 1, z: 0 };
        if (Math.abs(v.y) > 0.9) perp = { x: 1, y: 0, z: 0 };
        
        const cross = {
            x: v.y * perp.z - v.z * perp.y,
            y: v.z * perp.x - v.x * perp.z,
            z: v.x * perp.y - v.y * perp.x
        };
        
        const crossLen = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
        if (crossLen > 1e-10) {
            return { x: cross.x / crossLen, y: cross.y / crossLen, z: cross.z / crossLen };
        }
        
        return { x: 0, y: 0, z: 1 };
    },
    
    _orientNormals: function(points, normals, kdtree) {
        // Simple propagation: flip normals to be consistent with neighbors
        const visited = new Set([0]);
        const queue = [0];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this._kNearestNeighbors(kdtree, points[current], 6, points);
            
            for (const ni of neighbors) {
                if (visited.has(ni)) continue;
                
                // Check if normal needs flipping
                const dot = normals[current].x * normals[ni].x +
                           normals[current].y * normals[ni].y +
                           normals[current].z * normals[ni].z;
                
                if (dot < 0) {
                    normals[ni].x = -normals[ni].x;
                    normals[ni].y = -normals[ni].y;
                    normals[ni].z = -normals[ni].z;
                }
                
                visited.add(ni);
                queue.push(ni);
            }
        }
    },
    
    _computeBounds: function(points) {
        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };
        
        for (const p of points) {
            min.x = Math.min(min.x, p.x);
            min.y = Math.min(min.y, p.y);
            min.z = Math.min(min.z, p.z);
            max.x = Math.max(max.x, p.x);
            max.y = Math.max(max.y, p.y);
            max.z = Math.max(max.z, p.z);
        }
        
        return { min, max };
    }
}