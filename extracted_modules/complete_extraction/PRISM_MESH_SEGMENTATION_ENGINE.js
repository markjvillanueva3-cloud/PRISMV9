const PRISM_MESH_SEGMENTATION_ENGINE = {
    name: 'PRISM_MESH_SEGMENTATION_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Katz & Tal Shape Segmentation',
    
    /**
     * K-means segmentation based on face features
     */
    segmentKMeans: function(mesh, options = {}) {
        const {
            numClusters = 5,
            maxIterations = 100,
            features = ['normal', 'centroid', 'curvature']
        } = options;
        
        // Extract face features
        const faceFeatures = this._extractFaceFeatures(mesh, features);
        
        // Initialize centroids (K-means++)
        const centroids = this._initializeCentroids(faceFeatures, numClusters);
        
        // K-means iteration
        let labels = new Array(faceFeatures.length).fill(0);
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Assign faces to nearest centroid
            const newLabels = faceFeatures.map(f => 
                this._findNearestCentroid(f, centroids)
            );
            
            // Check convergence
            if (newLabels.every((l, i) => l === labels[i])) break;
            labels = newLabels;
            
            // Update centroids
            for (let k = 0; k < numClusters; k++) {
                const clusterFeatures = faceFeatures.filter((_, i) => labels[i] === k);
                if (clusterFeatures.length > 0) {
                    centroids[k] = this._computeCentroid(clusterFeatures);
                }
            }
        }
        
        // Build segments
        const segments = Array.from({ length: numClusters }, () => []);
        labels.forEach((label, faceIdx) => {
            segments[label].push(faceIdx);
        });
        
        return {
            labels,
            segments: segments.filter(s => s.length > 0),
            numSegments: segments.filter(s => s.length > 0).length
        };
    },
    
    /**
     * Spectral segmentation using graph Laplacian
     */
    segmentSpectral: function(mesh, options = {}) {
        const {
            numClusters = 5,
            sigmaAngle = 0.1,
            sigmaDist = 0.1
        } = options;
        
        const numFaces = mesh.indices.length / 3;
        
        // Build face adjacency graph with weights
        const adjacency = this._buildFaceAdjacencyGraph(mesh, sigmaAngle, sigmaDist);
        
        // Compute graph Laplacian
        const L = this._computeGraphLaplacian(adjacency, numFaces);
        
        // Compute eigenvectors (simplified power iteration)
        const eigenvectors = this._computeSmallestEigenvectors(L, numClusters);
        
        // K-means on eigenvector embedding
        const embedding = Array.from({ length: numFaces }, (_, i) => 
            eigenvectors.map(ev => ev[i])
        );
        
        const centroids = this._initializeCentroids(embedding, numClusters);
        let labels = embedding.map(f => this._findNearestCentroid(f, centroids));
        
        for (let iter = 0; iter < 50; iter++) {
            const newLabels = embedding.map(f => this._findNearestCentroid(f, centroids));
            if (newLabels.every((l, i) => l === labels[i])) break;
            labels = newLabels;
            
            for (let k = 0; k < numClusters; k++) {
                const clusterPoints = embedding.filter((_, i) => labels[i] === k);
                if (clusterPoints.length > 0) {
                    centroids[k] = this._computeCentroid(clusterPoints);
                }
            }
        }
        
        // Build segments
        const segments = Array.from({ length: numClusters }, () => []);
        labels.forEach((label, faceIdx) => {
            segments[label].push(faceIdx);
        });
        
        return {
            labels,
            segments: segments.filter(s => s.length > 0),
            numSegments: segments.filter(s => s.length > 0).length
        };
    },
    
    /**
     * SDF-based segmentation (Shape Diameter Function)
     */
    segmentBySDF: function(mesh, options = {}) {
        const {
            numClusters = 5,
            numRays = 30,
            coneAngle = Math.PI / 6
        } = options;
        
        // Compute SDF for each face
        const sdf = this._computeFaceSDF(mesh, numRays, coneAngle);
        
        // Cluster by SDF values
        const sdfValues = sdf.map(s => [s.diameter]);
        const centroids = this._initializeCentroids(sdfValues, numClusters);
        let labels = sdfValues.map(f => this._findNearestCentroid(f, centroids));
        
        for (let iter = 0; iter < 50; iter++) {
            const newLabels = sdfValues.map(f => this._findNearestCentroid(f, centroids));
            if (newLabels.every((l, i) => l === labels[i])) break;
            labels = newLabels;
            
            for (let k = 0; k < numClusters; k++) {
                const clusterVals = sdfValues.filter((_, i) => labels[i] === k);
                if (clusterVals.length > 0) {
                    centroids[k] = [clusterVals.reduce((s, v) => s + v[0], 0) / clusterVals.length];
                }
            }
        }
        
        // Sort clusters by SDF value (thin to thick)
        const clusterMeans = centroids.map((c, i) => ({ idx: i, mean: c[0] }));
        clusterMeans.sort((a, b) => a.mean - b.mean);
        
        const remapping = {};
        clusterMeans.forEach((c, newIdx) => { remapping[c.idx] = newIdx; });
        
        const remappedLabels = labels.map(l => remapping[l]);
        
        const segments = Array.from({ length: numClusters }, () => []);
        remappedLabels.forEach((label, faceIdx) => {
            segments[label].push(faceIdx);
        });
        
        return {
            labels: remappedLabels,
            segments: segments.filter(s => s.length > 0),
            sdf,
            numSegments: segments.filter(s => s.length > 0).length
        };
    },
    
    /**
     * Random Walk segmentation with user seeds
     */
    segmentRandomWalk: function(mesh, seeds) {
        // seeds: Array of { label: number, faces: number[] }
        const numFaces = mesh.indices.length / 3;
        const numLabels = seeds.length;
        
        // Build face adjacency
        const adjacency = this._buildSimpleFaceAdjacency(mesh);
        
        // Build Laplacian
        const L = [];
        const seededFaces = new Set();
        seeds.forEach(s => s.faces.forEach(f => seededFaces.add(f)));
        
        // Solve random walk for each label
        const probabilities = Array.from({ length: numLabels }, () => 
            new Float32Array(numFaces)
        );
        
        // Initialize seed probabilities
        seeds.forEach((seed, labelIdx) => {
            seed.faces.forEach(f => {
                probabilities[labelIdx][f] = 1;
            });
        });
        
        // Diffuse probabilities
        for (let iter = 0; iter < 100; iter++) {
            for (let labelIdx = 0; labelIdx < numLabels; labelIdx++) {
                const newProb = new Float32Array(numFaces);
                
                for (let f = 0; f < numFaces; f++) {
                    if (seededFaces.has(f)) {
                        newProb[f] = probabilities[labelIdx][f];
                        continue;
                    }
                    
                    const neighbors = adjacency[f] || [];
                    if (neighbors.length > 0) {
                        let sum = 0;
                        for (const n of neighbors) {
                            sum += probabilities[labelIdx][n];
                        }
                        newProb[f] = sum / neighbors.length;
                    }
                }
                
                probabilities[labelIdx] = newProb;
            }
        }
        
        // Assign labels by maximum probability
        const labels = [];
        for (let f = 0; f < numFaces; f++) {
            let maxProb = -1;
            let maxLabel = 0;
            for (let l = 0; l < numLabels; l++) {
                if (probabilities[l][f] > maxProb) {
                    maxProb = probabilities[l][f];
                    maxLabel = l;
                }
            }
            labels.push(maxLabel);
        }
        
        return { labels, probabilities };
    },
    
    _extractFaceFeatures: function(mesh, features) {
        const numFaces = mesh.indices.length / 3;
        const faceFeatures = [];
        
        for (let f = 0; f < numFaces; f++) {
            const feature = [];
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            if (features.includes('normal')) {
                const normal = this._computeFaceNormal(v0, v1, v2);
                feature.push(normal.x, normal.y, normal.z);
            }
            
            if (features.includes('centroid')) {
                feature.push(
                    (v0.x + v1.x + v2.x) / 3,
                    (v0.y + v1.y + v2.y) / 3,
                    (v0.z + v1.z + v2.z) / 3
                );
            }
            
            if (features.includes('area')) {
                feature.push(this._triangleArea(v0, v1, v2));
            }
            
            faceFeatures.push(feature);
        }
        
        // Normalize features
        const dim = faceFeatures[0].length;
        for (let d = 0; d < dim; d++) {
            const vals = faceFeatures.map(f => f[d]);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const range = max - min || 1;
            for (const f of faceFeatures) {
                f[d] = (f[d] - min) / range;
            }
        }
        
        return faceFeatures;
    },
    
    _initializeCentroids: function(data, k) {
        // K-means++ initialization
        const centroids = [];
        const dim = data[0].length;
        
        // First centroid: random
        centroids.push([...data[Math.floor(Math.random() * data.length)]]);
        
        // Remaining centroids: weighted by distance
        while (centroids.length < k) {
            const distances = data.map(d => {
                return Math.min(...centroids.map(c => this._squaredDistance(d, c)));
            });
            
            const totalDist = distances.reduce((a, b) => a + b, 0);
            let r = Math.random() * totalDist;
            
            for (let i = 0; i < data.length; i++) {
                r -= distances[i];
                if (r <= 0) {
                    centroids.push([...data[i]]);
                    break;
                }
            }
        }
        
        return centroids;
    },
    
    _findNearestCentroid: function(point, centroids) {
        let minDist = Infinity;
        let minIdx = 0;
        
        for (let i = 0; i < centroids.length; i++) {
            const dist = this._squaredDistance(point, centroids[i]);
            if (dist < minDist) {
                minDist = dist;
                minIdx = i;
            }
        }
        
        return minIdx;
    },
    
    _computeCentroid: function(points) {
        const dim = points[0].length;
        const centroid = new Array(dim).fill(0);
        
        for (const p of points) {
            for (let d = 0; d < dim; d++) {
                centroid[d] += p[d];
            }
        }
        
        for (let d = 0; d < dim; d++) {
            centroid[d] /= points.length;
        }
        
        return centroid;
    },
    
    _squaredDistance: function(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return sum;
    },
    
    _buildFaceAdjacencyGraph: function(mesh, sigmaAngle, sigmaDist) {
        const numFaces = mesh.indices.length / 3;
        const adjacency = Array.from({ length: numFaces }, () => new Map());
        
        // Build edge-to-face mapping
        const edgeToFaces = new Map();
        
        for (let f = 0; f < numFaces; f++) {
            const i0 = mesh.indices[f * 3];
            const i1 = mesh.indices[f * 3 + 1];
            const i2 = mesh.indices[f * 3 + 2];
            
            const edges = [
                [Math.min(i0, i1), Math.max(i0, i1)],
                [Math.min(i1, i2), Math.max(i1, i2)],
                [Math.min(i2, i0), Math.max(i2, i0)]
            ];
            
            for (const [a, b] of edges) {
                const key = `${a},${b}`;
                if (!edgeToFaces.has(key)) {
                    edgeToFaces.set(key, []);
                }
                edgeToFaces.get(key).push(f);
            }
        }
        
        // Compute face normals and centroids
        const normals = [];
        const centroids = [];
        
        for (let f = 0; f < numFaces; f++) {
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            normals.push(this._computeFaceNormal(v0, v1, v2));
            centroids.push({
                x: (v0.x + v1.x + v2.x) / 3,
                y: (v0.y + v1.y + v2.y) / 3,
                z: (v0.z + v1.z + v2.z) / 3
            });
        }
        
        // Build adjacency with weights
        for (const faces of edgeToFaces.values()) {
            if (faces.length === 2) {
                const [f1, f2] = faces;
                
                // Angle-based weight
                const dotN = normals[f1].x * normals[f2].x + 
                            normals[f1].y * normals[f2].y + 
                            normals[f1].z * normals[f2].z;
                const angle = Math.acos(Math.max(-1, Math.min(1, dotN)));
                const angleWeight = Math.exp(-angle * angle / (2 * sigmaAngle * sigmaAngle));
                
                // Distance-based weight
                const dist = Math.sqrt(
                    Math.pow(centroids[f1].x - centroids[f2].x, 2) +
                    Math.pow(centroids[f1].y - centroids[f2].y, 2) +
                    Math.pow(centroids[f1].z - centroids[f2].z, 2)
                );
                const distWeight = Math.exp(-dist * dist / (2 * sigmaDist * sigmaDist));
                
                const weight = angleWeight * distWeight;
                adjacency[f1].set(f2, weight);
                adjacency[f2].set(f1, weight);
            }
        }
        
        return adjacency;
    },
    
    _buildSimpleFaceAdjacency: function(mesh) {
        const numFaces = mesh.indices.length / 3;
        const adjacency = Array.from({ length: numFaces }, () => []);
        
        const edgeToFaces = new Map();
        
        for (let f = 0; f < numFaces; f++) {
            const i0 = mesh.indices[f * 3];
            const i1 = mesh.indices[f * 3 + 1];
            const i2 = mesh.indices[f * 3 + 2];
            
            const edges = [
                [Math.min(i0, i1), Math.max(i0, i1)],
                [Math.min(i1, i2), Math.max(i1, i2)],
                [Math.min(i2, i0), Math.max(i2, i0)]
            ];
            
            for (const [a, b] of edges) {
                const key = `${a},${b}`;
                if (!edgeToFaces.has(key)) {
                    edgeToFaces.set(key, []);
                }
                edgeToFaces.get(key).push(f);
            }
        }
        
        for (const faces of edgeToFaces.values()) {
            if (faces.length === 2) {
                adjacency[faces[0]].push(faces[1]);
                adjacency[faces[1]].push(faces[0]);
            }
        }
        
        return adjacency;
    },
    
    _computeGraphLaplacian: function(adjacency, n) {
        const L = Array.from({ length: n }, () => new Map());
        
        for (let i = 0; i < n; i++) {
            let degree = 0;
            for (const [j, w] of adjacency[i]) {
                L[i].set(j, -w);
                degree += w;
            }
            L[i].set(i, degree);
        }
        
        return L;
    },
    
    _computeSmallestEigenvectors: function(L, k) {
        const n = L.length;
        const eigenvectors = [];
        
        // Simplified: use random projection
        for (let ev = 0; ev < k; ev++) {
            let v = Array(n).fill(0).map(() => Math.random() - 0.5);
            
            // Inverse power iteration (for smallest eigenvalues)
            for (let iter = 0; iter < 30; iter++) {
                // Orthogonalize
                for (const prev of eigenvectors) {
                    const dot = v.reduce((sum, x, i) => sum + x * prev[i], 0);
                    for (let i = 0; i < n; i++) v[i] -= dot * prev[i];
                }
                
                // Normalize
                const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
                v = v.map(x => x / (norm || 1));
            }
            
            eigenvectors.push(v);
        }
        
        return eigenvectors;
    },
    
    _computeFaceSDF: function(mesh, numRays, coneAngle) {
        const numFaces = mesh.indices.length / 3;
        const sdf = [];
        
        for (let f = 0; f < numFaces; f++) {
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            const centroid = {
                x: (v0.x + v1.x + v2.x) / 3,
                y: (v0.y + v1.y + v2.y) / 3,
                z: (v0.z + v1.z + v2.z) / 3
            };
            
            const normal = this._computeFaceNormal(v0, v1, v2);
            const inwardNormal = { x: -normal.x, y: -normal.y, z: -normal.z };
            
            // Shoot rays in cone around inward normal
            const distances = [];
            
            for (let r = 0; r < numRays; r++) {
                // Generate random direction in cone
                const dir = this._randomDirectionInCone(inwardNormal, coneAngle);
                
                // Ray-mesh intersection
                const hit = this._rayMeshIntersect(centroid, dir, mesh, f);
                
                if (hit) {
                    distances.push(hit.distance);
                }
            }
            
            // Use median distance
            if (distances.length > 0) {
                distances.sort((a, b) => a - b);
                const median = distances[Math.floor(distances.length / 2)];
                sdf.push({ diameter: median, face: f });
            } else {
                sdf.push({ diameter: 0, face: f });
            }
        }
        
        return sdf;
    },
    
    _randomDirectionInCone: function(axis, angle) {
        // Generate random direction within cone around axis
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(1 - Math.random() * (1 - Math.cos(angle)));
        
        // Create orthonormal basis
        let u, v;
        if (Math.abs(axis.x) < 0.9) {
            u = { x: 0, y: -axis.z, z: axis.y };
        } else {
            u = { x: -axis.z, y: 0, z: axis.x };
        }
        const uLen = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z);
        u.x /= uLen; u.y /= uLen; u.z /= uLen;
        
        v = {
            x: axis.y * u.z - axis.z * u.y,
            y: axis.z * u.x - axis.x * u.z,
            z: axis.x * u.y - axis.y * u.x
        };
        
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        
        return {
            x: sinPhi * cosTheta * u.x + sinPhi * sinTheta * v.x + cosPhi * axis.x,
            y: sinPhi * cosTheta * u.y + sinPhi * sinTheta * v.y + cosPhi * axis.y,
            z: sinPhi * cosTheta * u.z + sinPhi * sinTheta * v.z + cosPhi * axis.z
        };
    },
    
    _rayMeshIntersect: function(origin, dir, mesh, excludeFace) {
        let closest = null;
        let closestDist = Infinity;
        
        const numFaces = mesh.indices.length / 3;
        
        for (let f = 0; f < numFaces; f++) {
            if (f === excludeFace) continue;
            
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            const hit = this._rayTriangleIntersect(origin, dir, v0, v1, v2);
            
            if (hit && hit.t > 0.001 && hit.t < closestDist) {
                closestDist = hit.t;
                closest = { distance: hit.t, face: f };
            }
        }
        
        return closest;
    },
    
    _rayTriangleIntersect: function(origin, dir, v0, v1, v2) {
        const EPSILON = 1e-7;
        
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        
        const h = {
            x: dir.y * edge2.z - dir.z * edge2.y,
            y: dir.z * edge2.x - dir.x * edge2.z,
            z: dir.x * edge2.y - dir.y * edge2.x
        };
        
        const a = edge1.x * h.x + edge1.y * h.y + edge1.z * h.z;
        
        if (Math.abs(a) < EPSILON) return null;
        
        const f = 1 / a;
        const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: origin.z - v0.z };
        const u = f * (s.x * h.x + s.y * h.y + s.z * h.z);
        
        if (u < 0 || u > 1) return null;
        
        const q = {
            x: s.y * edge1.z - s.z * edge1.y,
            y: s.z * edge1.x - s.x * edge1.z,
            z: s.x * edge1.y - s.y * edge1.x
        };
        
        const v = f * (dir.x * q.x + dir.y * q.y + dir.z * q.z);
        
        if (v < 0 || u + v > 1) return null;
        
        const t = f * (edge2.x * q.x + edge2.y * q.y + edge2.z * q.z);
        
        return t > EPSILON ? { t, u, v } : null;
    },
    
    _getVertex: function(vertices, idx) {
        return {
            x: vertices[idx * 3],
            y: vertices[idx * 3 + 1],
            z: vertices[idx * 3 + 2]
        };
    },
    
    _computeFaceNormal: function(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        
        const n = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        if (len > 1e-10) {
            n.x /= len; n.y /= len; n.z /= len;
        }
        
        return n;
    },
    
    _triangleArea: function(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const cross = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        return 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    }
}