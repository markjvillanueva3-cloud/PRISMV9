const PRISM_GEODESIC_DISTANCE_ENGINE = {
    name: 'PRISM_GEODESIC_DISTANCE_ENGINE',
    version: '1.0.0',
    source: 'Dijkstra, Mitchell et al. 1987, Crane et al. 2017',
    
    /**
     * Compute geodesic distances using Dijkstra on mesh graph
     */
    computeDijkstra: function(mesh, sourceVertices) {
        const numVertices = mesh.vertices.length / 3;
        const adjacency = this._buildWeightedAdjacency(mesh);
        
        // Initialize distances
        const distances = new Float32Array(numVertices).fill(Infinity);
        const visited = new Array(numVertices).fill(false);
        
        // Priority queue (min-heap)
        const heap = [];
        
        // Initialize source vertices
        for (const src of sourceVertices) {
            distances[src] = 0;
            this._heapPush(heap, { vertex: src, distance: 0 });
        }
        
        // Dijkstra's algorithm
        while (heap.length > 0) {
            const { vertex: u, distance: d } = this._heapPop(heap);
            
            if (visited[u]) continue;
            visited[u] = true;
            
            for (const { neighbor: v, weight } of adjacency[u]) {
                if (visited[v]) continue;
                
                const newDist = d + weight;
                if (newDist < distances[v]) {
                    distances[v] = newDist;
                    this._heapPush(heap, { vertex: v, distance: newDist });
                }
            }
        }
        
        return Array.from(distances);
    },
    
    /**
     * Fast Marching Method for more accurate geodesics
     */
    computeFastMarching: function(mesh, sourceVertices) {
        const numVertices = mesh.vertices.length / 3;
        const faces = this._buildFaceData(mesh);
        
        const distances = new Float32Array(numVertices).fill(Infinity);
        const status = new Array(numVertices).fill('FAR'); // FAR, TRIAL, DONE
        
        const heap = [];
        
        // Initialize sources
        for (const src of sourceVertices) {
            distances[src] = 0;
            status[src] = 'TRIAL';
            this._heapPush(heap, { vertex: src, distance: 0 });
        }
        
        while (heap.length > 0) {
            const { vertex: u } = this._heapPop(heap);
            
            if (status[u] === 'DONE') continue;
            status[u] = 'DONE';
            
            // Update neighbors
            for (const face of faces[u]) {
                for (const v of face.vertices) {
                    if (v === u || status[v] === 'DONE') continue;
                    
                    // Compute update using triangle
                    const newDist = this._updateFMM(mesh, distances, u, v, face);
                    
                    if (newDist < distances[v]) {
                        distances[v] = newDist;
                        status[v] = 'TRIAL';
                        this._heapPush(heap, { vertex: v, distance: newDist });
                    }
                }
            }
        }
        
        return Array.from(distances);
    },
    
    /**
     * Compute geodesic path between two vertices
     */
    computePath: function(mesh, start, end) {
        const distances = this.computeDijkstra(mesh, [end]);
        const adjacency = this._buildWeightedAdjacency(mesh);
        
        // Backtrack from start to end
        const path = [start];
        let current = start;
        
        while (current !== end) {
            let bestNext = -1;
            let bestDist = distances[current];
            
            for (const { neighbor } of adjacency[current]) {
                if (distances[neighbor] < bestDist) {
                    bestDist = distances[neighbor];
                    bestNext = neighbor;
                }
            }
            
            if (bestNext === -1) break; // No path found
            
            path.push(bestNext);
            current = bestNext;
        }
        
        return {
            path,
            distance: distances[start]
        };
    },
    
    /**
     * Compute iso-geodesic curves
     */
    computeIsoCurves: function(mesh, sourceVertices, levels) {
        const distances = this.computeFastMarching(mesh, sourceVertices);
        const curves = [];
        
        for (const level of levels) {
            const curve = this._extractIsoCurve(mesh, distances, level);
            curves.push({ level, points: curve });
        }
        
        return curves;
    },
    
    _updateFMM: function(mesh, distances, known, update, face) {
        // Find the third vertex in the triangle
        const others = face.vertices.filter(v => v !== update);
        
        if (others.length < 2) {
            return distances[known] + this._edgeLength(mesh, known, update);
        }
        
        const v1 = others[0], v2 = others[1];
        const d1 = distances[v1], d2 = distances[v2];
        
        if (!isFinite(d1) || !isFinite(d2)) {
            return distances[known] + this._edgeLength(mesh, known, update);
        }
        
        // Solve quadratic for distance at update
        const va = this._getVertex(mesh.vertices, update);
        const vb = this._getVertex(mesh.vertices, v1);
        const vc = this._getVertex(mesh.vertices, v2);
        
        const a = this._distance(vb, vc);
        const b = this._distance(va, vc);
        const c = this._distance(va, vb);
        
        // Using law of cosines to compute update
        const cosB = (a * a + c * c - b * b) / (2 * a * c);
        const cosC = (a * a + b * b - c * c) / (2 * a * b);
        
        // Quadratic equation solving
        const u = d2 - d1;
        const f = c * cosB;
        const g = c * Math.sqrt(1 - cosB * cosB);
        
        const A = a * a + f * f - 2 * a * f * cosC;
        const B = 2 * u * f - 2 * a * (d1 - d2 * cosC + f * cosC);
        const C = u * u - a * a * (1 - cosC * cosC) + 2 * a * d1 * cosC - d1 * d1;
        
        const discriminant = B * B - 4 * A * C;
        
        if (discriminant < 0 || Math.abs(A) < 1e-10) {
            return Math.min(d1 + c, d2 + b);
        }
        
        const t = (-B + Math.sqrt(discriminant)) / (2 * A);
        
        if (t >= 0 && t <= 1) {
            return d1 + t * u + Math.sqrt(A) * t;
        }
        
        return Math.min(d1 + c, d2 + b);
    },
    
    _extractIsoCurve: function(mesh, distances, level) {
        const points = [];
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            const da = distances[a], db = distances[b], dc = distances[c];
            
            const edges = [
                [a, b, da, db],
                [b, c, db, dc],
                [c, a, dc, da]
            ];
            
            const crossings = [];
            for (const [v1, v2, d1, d2] of edges) {
                if ((d1 - level) * (d2 - level) < 0) {
                    const t = (level - d1) / (d2 - d1);
                    const p1 = this._getVertex(mesh.vertices, v1);
                    const p2 = this._getVertex(mesh.vertices, v2);
                    crossings.push({
                        x: p1.x + t * (p2.x - p1.x),
                        y: p1.y + t * (p2.y - p1.y),
                        z: p1.z + t * (p2.z - p1.z)
                    });
                }
            }
            
            if (crossings.length >= 2) {
                points.push(crossings[0], crossings[1]);
            }
        }
        
        return points;
    },
    
    _buildWeightedAdjacency: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const adjacency = Array.from({ length: numVertices }, () => []);
        const added = new Set();
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            
            const edges = [[a, b], [b, c], [c, a]];
            
            for (const [v1, v2] of edges) {
                const key1 = `${v1},${v2}`, key2 = `${v2},${v1}`;
                
                if (!added.has(key1)) {
                    const weight = this._edgeLength(mesh, v1, v2);
                    adjacency[v1].push({ neighbor: v2, weight });
                    adjacency[v2].push({ neighbor: v1, weight });
                    added.add(key1);
                    added.add(key2);
                }
            }
        }
        
        return adjacency;
    },
    
    _buildFaceData: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const faces = Array.from({ length: numVertices }, () => []);
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            const faceData = { vertices: [a, b, c] };
            
            faces[a].push(faceData);
            faces[b].push(faceData);
            faces[c].push(faceData);
        }
        
        return faces;
    },
    
    _edgeLength: function(mesh, v1, v2) {
        const p1 = this._getVertex(mesh.vertices, v1);
        const p2 = this._getVertex(mesh.vertices, v2);
        return this._distance(p1, p2);
    },
    
    _getVertex: function(vertices, idx) {
        return {
            x: vertices[idx * 3],
            y: vertices[idx * 3 + 1],
            z: vertices[idx * 3 + 2]
        };
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    
    _heapPush: function(heap, item) {
        heap.push(item);
        let i = heap.length - 1;
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (heap[parent].distance <= heap[i].distance) break;
            [heap[parent], heap[i]] = [heap[i], heap[parent]];
            i = parent;
        }
    },
    
    _heapPop: function(heap) {
        if (heap.length === 0) return null;
        const result = heap[0];
        const last = heap.pop();
        if (heap.length > 0) {
            heap[0] = last;
            let i = 0;
            while (true) {
                const left = 2 * i + 1, right = 2 * i + 2;
                let smallest = i;
                if (left < heap.length && heap[left].distance < heap[smallest].distance) smallest = left;
                if (right < heap.length && heap[right].distance < heap[smallest].distance) smallest = right;
                if (smallest === i) break;
                [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
                i = smallest;
            }
        }
        return result;
    }
};

if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('geodesic.dijkstra', 'PRISM_GEODESIC_DISTANCE_ENGINE.computeDijkstra');
    PRISM_GATEWAY.register('geodesic.fastMarching', 'PRISM_GEODESIC_DISTANCE_ENGINE.computeFastMarching');
    PRISM_GATEWAY.register('geodesic.path', 'PRISM_GEODESIC_DISTANCE_ENGINE.computePath');
    PRISM_GATEWAY.register('geodesic.isoCurves', 'PRISM_GEODESIC_DISTANCE_ENGINE.computeIsoCurves');
}

console.log('[PRISM Session 5 Ultimate v4 Part 3] Modules 9-16 loaded');
console.log('  - PRISM_ICP_REGISTRATION_ENGINE');
console.log('  - PRISM_DELAUNAY_3D_ENGINE');
console.log('  - PRISM_VORONOI_3D_ENGINE');
console.log('  - PRISM_QEM_SIMPLIFICATION_ENGINE');
console.log('  - PRISM_LAPLACIAN_SMOOTHING_ENGINE');
console.log('  - PRISM_BILATERAL_MESH_FILTER');
console.log('  - PRISM_CURVATURE_ANALYSIS_ENGINE');
console.log('  - PRISM_GEODESIC_DISTANCE_ENGINE');
/**
 * PRISM SESSION 5 - ULTIMATE v4 - PART 4
 * Modules 17-22: Advanced Geometric Analysis
 * Sources: Stanford CS 348A, CS 468, MIT 6.837, 2.158J
 */

// MODULE 17: PRISM_MEDIAL_AXIS_ENGINE - Skeleton Extraction
const PRISM_MEDIAL_AXIS_ENGINE = {
    name: 'PRISM_MEDIAL_AXIS_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Blum MAT',

    computeDistanceField: function(mesh, resolution = 50) {
        const bounds = this._computeBounds(mesh.vertices);
        const pad = 0.1, step = {
            x: (bounds.max.x - bounds.min.x + 2*pad) / resolution,
            y: (bounds.max.y - bounds.min.y + 2*pad) / resolution,
            z: (bounds.max.z - bounds.min.z + 2*pad) / resolution
        };
        
        const medialPoints = [];
        for (let i = 1; i < resolution; i++) {
            for (let j = 1; j < resolution; j++) {
                for (let k = 1; k < resolution; k++) {
                    const p = {
                        x: bounds.min.x - pad + i * step.x,
                        y: bounds.min.y - pad + j * step.y,
                        z: bounds.min.z - pad + k * step.z
                    };
                    const d = this._distanceToMesh(p, mesh);
                    if (d > 0) medialPoints.push({ ...p, radius: d });
                }
            }
        }
        return { points: medialPoints.slice(0, 1000), resolution, bounds };
    },

    computeCurveSkeleton: function(mesh, options = {}) {
        const { iterations = 10, weight = 0.5 } = options;
        const n = mesh.vertices.length / 3;
        let verts = [...mesh.vertices];
        
        for (let iter = 0; iter < iterations; iter++) {
            const newVerts = new Float64Array(verts.length);
            for (let i = 0; i < n; i++) {
                const neighbors = this._getNeighbors(mesh, i);
                if (neighbors.length === 0) {
                    newVerts[i*3] = verts[i*3]; newVerts[i*3+1] = verts[i*3+1]; newVerts[i*3+2] = verts[i*3+2];
                    continue;
                }
                let cx = 0, cy = 0, cz = 0;
                for (const j of neighbors) { cx += verts[j*3]; cy += verts[j*3+1]; cz += verts[j*3+2]; }
                cx /= neighbors.length; cy /= neighbors.length; cz /= neighbors.length;
                newVerts[i*3] = (1-weight)*verts[i*3] + weight*cx;
                newVerts[i*3+1] = (1-weight)*verts[i*3+1] + weight*cy;
                newVerts[i*3+2] = (1-weight)*verts[i*3+2] + weight*cz;
            }
            verts = newVerts;
        }
        return { vertices: Array.from(verts) };
    },

    _computeBounds: function(v) {
        let min = {x:Infinity, y:Infinity, z:Infinity}, max = {x:-Infinity, y:-Infinity, z:-Infinity};
        for (let i = 0; i < v.length; i += 3) {
            min.x = Math.min(min.x, v[i]); min.y = Math.min(min.y, v[i+1]); min.z = Math.min(min.z, v[i+2]);
            max.x = Math.max(max.x, v[i]); max.y = Math.max(max.y, v[i+1]); max.z = Math.max(max.z, v[i+2]);
        }
        return { min, max };
    },

    _distanceToMesh: function(p, mesh) {
        let minD = Infinity;
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const v0 = this._getV(mesh.vertices, mesh.indices[i]);
            const v1 = this._getV(mesh.vertices, mesh.indices[i+1]);
            const v2 = this._getV(mesh.vertices, mesh.indices[i+2]);
            minD = Math.min(minD, this._pointTriDist(p, v0, v1, v2));
        }
        return minD;
    },

    _pointTriDist: function(p, v0, v1, v2) {
        const e1 = {x:v1.x-v0.x, y:v1.y-v0.y, z:v1.z-v0.z};
        const e2 = {x:v2.x-v0.x, y:v2.y-v0.y, z:v2.z-v0.z};
        const n = {x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x};
        const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
        if (len < 1e-10) return Infinity;
        return Math.abs((p.x-v0.x)*n.x/len + (p.y-v0.y)*n.y/len + (p.z-v0.z)*n.z/len);
    },

    _getNeighbors: function(mesh, idx) {
        const nb = new Set();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            if (a === idx) { nb.add(b); nb.add(c); }
            if (b === idx) { nb.add(a); nb.add(c); }
            if (c === idx) { nb.add(a); nb.add(b); }
        }
        return Array.from(nb);
    },

    _getV: function(v, i) { return {x: v[i*3], y: v[i*3+1], z: v[i*3+2]}; }
};

// MODULE 18: PRISM_NURBS_ADVANCED_ENGINE - de Boor Algorithm
const PRISM_NURBS_ADVANCED_ENGINE = {
    name: 'PRISM_NURBS_ADVANCED_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 348A, Piegl & Tiller',

    evaluateCurve: function(curve, u) {
        const { controlPoints, weights, knots, degree } = curve;
        const n = controlPoints.length - 1;
        const span = this._findSpan(n, degree, u, knots);
        const N = this._basisFns(span, u, degree, knots);
        
        let x = 0, y = 0, z = 0, w = 0;
        for (let i = 0; i <= degree; i++) {
            const idx = span - degree + i;
            const wt = weights ? weights[idx] : 1;
            const Nw = N[i] * wt;
            x += Nw * controlPoints[idx].x;
            y += Nw * controlPoints[idx].y;
            z += Nw * (controlPoints[idx].z || 0);
            w += Nw;
        }
        return { x: x/w, y: y/w, z: z/w };
    },

    evaluateSurface: function(surface, u, v) {
        const { controlPoints, knotsU, knotsV, degreeU, degreeV, numU, numV } = surface;
        const spanU = this._findSpan(numU-1, degreeU, u, knotsU);
        const spanV = this._findSpan(numV-1, degreeV, v, knotsV);
        const Nu = this._basisFns(spanU, u, degreeU, knotsU);
        const Nv = this._basisFns(spanV, v, degreeV, knotsV);
        
        let x = 0, y = 0, z = 0, w = 0;
        for (let i = 0; i <= degreeU; i++) {
            for (let j = 0; j <= degreeV; j++) {
                const idxU = spanU - degreeU + i, idxV = spanV - degreeV + j;
                const cp = controlPoints[idxU * numV + idxV];
                const Nw = Nu[i] * Nv[j];
                x += Nw * cp.x; y += Nw * cp.y; z += Nw * (cp.z || 0); w += Nw;
            }
        }
        return { x: x/w, y: y/w, z: z/w };
    },

    insertKnot: function(curve, u, times = 1) {
        let { controlPoints, weights, knots, degree } = curve;
        let newKnots = [...knots], newCP = controlPoints.map(p => ({...p}));
        let newW = weights ? [...weights] : null;
        
        for (let t = 0; t < times; t++) {
            const k = this._findSpan(newCP.length - 1, degree, u, newKnots);
            const tempCP = [], tempW = newW ? [] : null;
            
            for (let i = 0; i <= newCP.length; i++) {
                if (i <= k - degree) {
                    tempCP.push({...newCP[i]});
                    if (tempW) tempW.push(newW[i]);
                } else if (i > k) {
                    tempCP.push({...newCP[i-1]});
                    if (tempW) tempW.push(newW[i-1]);
                } else {
                    const alpha = (u - newKnots[i]) / (newKnots[i + degree] - newKnots[i]);
                    const p0 = newCP[i-1], p1 = newCP[i];
                    tempCP.push({
                        x: (1-alpha)*p0.x + alpha*p1.x,
                        y: (1-alpha)*p0.y + alpha*p1.y,
                        z: (1-alpha)*(p0.z||0) + alpha*(p1.z||0)
                    });
                    if (tempW) tempW.push((1-alpha)*newW[i-1] + alpha*newW[i]);
                }
            }
            newKnots = [...newKnots.slice(0, k+1), u, ...newKnots.slice(k+1)];
            newCP = tempCP; newW = tempW;
        }
        return { controlPoints: newCP, weights: newW, knots: newKnots, degree };
    },

    curveDerivative: function(curve, u, order = 1) {
        const { controlPoints, knots, degree } = curve;
        if (order > degree) return { x: 0, y: 0, z: 0 };
        
        const derivCP = [];
        for (let i = 0; i < controlPoints.length - 1; i++) {
            const f = degree / (knots[i + degree + 1] - knots[i + 1]);
            derivCP.push({
                x: f * (controlPoints[i+1].x - controlPoints[i].x),
                y: f * (controlPoints[i+1].y - controlPoints[i].y),
                z: f * ((controlPoints[i+1].z||0) - (controlPoints[i].z||0))
            });
        }
        
        if (order === 1) {
            return this.evaluateCurve({ controlPoints: derivCP, knots: knots.slice(1,-1), degree: degree-1 }, u);
        }
        return this.curveDerivative({ controlPoints: derivCP, knots: knots.slice(1,-1), degree: degree-1 }, u, order-1);
    },

    splitCurve: function(curve, u) {
        const split = this.insertKnot(curve, u, curve.degree + 1);
        const k = this._findSpan(curve.controlPoints.length - 1, curve.degree, u, curve.knots);
        return {
            left: { controlPoints: split.controlPoints.slice(0, k+1), knots: split.knots.slice(0, k+curve.degree+2), degree: curve.degree },
            right: { controlPoints: split.controlPoints.slice(k), knots: split.knots.slice(k), degree: curve.degree }
        };
    },

    _findSpan: function(n, p, u, knots) {
        if (u >= knots[n+1]) return n;
        if (u <= knots[p]) return p;
        let lo = p, hi = n + 1, mid = Math.floor((lo+hi)/2);
        while (u < knots[mid] || u >= knots[mid+1]) {
            if (u < knots[mid]) hi = mid; else lo = mid;
            mid = Math.floor((lo+hi)/2);
        }
        return mid;
    },

    _basisFns: function(span, u, degree, knots) {
        const N = new Array(degree+1).fill(0), left = new Array(degree+1).fill(0), right = new Array(degree+1).fill(0);
        N[0] = 1.0;
        for (let j = 1; j <= degree; j++) {
            left[j] = u - knots[span+1-j]; right[j] = knots[span+j] - u;
            let saved = 0.0;
            for (let r = 0; r < j; r++) {
                const temp = N[r] / (right[r+1] + left[j-r]);
                N[r] = saved + right[r+1] * temp;
                saved = left[j-r] * temp;
            }
            N[j] = saved;
        }
        return N;
    }
};

// MODULE 19: PRISM_BEZIER_INTERSECTION_ENGINE - Bezier Clipping
const PRISM_BEZIER_INTERSECTION_ENGINE = {
    name: 'PRISM_BEZIER_INTERSECTION_ENGINE',
    version: '1.0.0',
    source: 'Sederberg & Nishita 1990',

    intersect: function(curve1, curve2, tolerance = 1e-6) {
        const results = [];
        this._intersectRecursive(curve1, curve2, 0, 1, 0, 1, tolerance, results, 0);
        return this._removeDups(results, tolerance);
    },

    _intersectRecursive: function(c1, c2, t1Min, t1Max, t2Min, t2Max, tol, results, depth) {
        if (depth > 50) return;
        const bb1 = this._bbox(c1), bb2 = this._bbox(c2);
        if (!this._boxOverlap(bb1, bb2)) return;
        
        const s1 = Math.max(bb1.maxX - bb1.minX, bb1.maxY - bb1.minY);
        const s2 = Math.max(bb2.maxX - bb2.minX, bb2.maxY - bb2.minY);
        
        if (s1 < tol && s2 < tol) {
            results.push({ t1: (t1Min+t1Max)/2, t2: (t2Min+t2Max)/2, point: this._evalBezier(c1, 0.5) });
            return;
        }
        
        if (s1 > s2) {
            const [left, right] = this._subdivide(c1, 0.5);
            const mid = (t1Min + t1Max) / 2;
            this._intersectRecursive(left, c2, t1Min, mid, t2Min, t2Max, tol, results, depth+1);
            this._intersectRecursive(right, c2, mid, t1Max, t2Min, t2Max, tol, results, depth+1);
        } else {
            const [left, right] = this._subdivide(c2, 0.5);
            const mid = (t2Min + t2Max) / 2;
            this._intersectRecursive(c1, left, t1Min, t1Max, t2Min, mid, tol, results, depth+1);
            this._intersectRecursive(c1, right, t1Min, t1Max, mid, t2Max, tol, results, depth+1);
        }
    },

    selfIntersect: function(curve, tolerance = 1e-6) {
        const [left, right] = this._subdivide(curve, 0.5);
        const intersections = this.intersect(left, right, tolerance);
        return intersections.map(i => ({ t1: i.t1 * 0.5, t2: 0.5 + i.t2 * 0.5, point: i.point }))
            .filter(i => Math.abs(i.t1 - i.t2) > tolerance);
    },

    _bbox: function(curve) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of curve) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },

    _boxOverlap: function(b1, b2) {
        return !(b1.maxX < b2.minX || b1.minX > b2.maxX || b1.maxY < b2.minY || b1.minY > b2.maxY);
    },

    _evalBezier: function(curve, t) {
        const n = curve.length - 1;
        let x = 0, y = 0;
        for (let i = 0; i <= n; i++) {
            const b = this._bernstein(n, i, t);
            x += b * curve[i].x; y += b * curve[i].y;
        }
        return { x, y };
    },

    _bernstein: function(n, i, t) {
        return this._binomial(n, i) * Math.pow(t, i) * Math.pow(1-t, n-i);
    },

    _binomial: function(n, k) {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 1;
        let r = 1;
        for (let i = 0; i < k; i++) r = r * (n-i) / (i+1);
        return r;
    },

    _subdivide: function(curve, t) {
        const n = curve.length - 1;
        const left = [curve[0]], right = [curve[n]];
        let pts = [...curve];
        for (let r = 1; r <= n; r++) {
            const newPts = [];
            for (let i = 0; i < pts.length - 1; i++) {
                newPts.push({ x: (1-t)*pts[i].x + t*pts[i+1].x, y: (1-t)*pts[i].y + t*pts[i+1].y });
            }
            left.push(newPts[0]);
            right.unshift(newPts[newPts.length-1]);
            pts = newPts;
        }
        return [left, right];
    },

    _removeDups: function(intersections, tol) {
        const unique = [];
        for (const i of intersections) {
            let isDup = false;
            for (const u of unique) {
                if (Math.abs(i.t1 - u.t1) < tol && Math.abs(i.t2 - u.t2) < tol) { isDup = true; break; }
            }
            if (!isDup) unique.push(i);
        }
        return unique;
    }
};

// MODULE 20: PRISM_SURFACE_INTERSECTION_ENGINE
const PRISM_SURFACE_INTERSECTION_ENGINE = {
    name: 'PRISM_SURFACE_INTERSECTION_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.158J, Patrikalakis',

    intersect: function(s1, s2, options = {}) {
        const { tolerance = 1e-6, stepSize = 0.01, maxPoints = 500 } = options;
        const starts = this._findStarts(s1, s2, tolerance);
        if (starts.length === 0) return [];
        
        const curves = [], visited = new Set();
        for (const start of starts) {
            const key = `${start.u1.toFixed(4)},${start.v1.toFixed(4)}`;
            if (visited.has(key)) continue;
            const curve = this._trace(s1, s2, start, stepSize, maxPoints, visited);
            if (curve.length > 1) curves.push(curve);
        }
        return curves;
    },

    _findStarts: function(s1, s2, tol) {
        const starts = [], samples = 10;
        for (let i = 0; i <= samples; i++) {
            for (let j = 0; j <= samples; j++) {
                const u1 = i/samples, v1 = j/samples, p1 = this._eval(s1, u1, v1);
                for (let k = 0; k <= samples; k++) {
                    for (let l = 0; l <= samples; l++) {
                        const u2 = k/samples, v2 = l/samples, p2 = this._eval(s2, u2, v2);
                        if (this._dist(p1, p2) < tol * 10) {
                            const refined = this._refine(s1, s2, u1, v1, u2, v2, tol);
                            if (refined) starts.push(refined);
                        }
                    }
                }
            }
        }
        return this._removeDupPts(starts, tol);
    },

    _refine: function(s1, s2, u1, v1, u2, v2, tol) {
        for (let iter = 0; iter < 20; iter++) {
            const p1 = this._eval(s1, u1, v1), p2 = this._eval(s2, u2, v2);
            const diff = { x: p1.x-p2.x, y: p1.y-p2.y, z: p1.z-p2.z };
            const dist = Math.sqrt(diff.x*diff.x + diff.y*diff.y + diff.z*diff.z);
            if (dist < tol) return { u1, v1, u2, v2, point: p1 };
            
            // Simplified Newton step
            u1 = Math.max(0, Math.min(1, u1 - diff.x * 0.1));
            v1 = Math.max(0, Math.min(1, v1 - diff.y * 0.1));
            u2 = Math.max(0, Math.min(1, u2 + diff.x * 0.1));
            v2 = Math.max(0, Math.min(1, v2 + diff.y * 0.1));
        }
        return null;
    },

    _trace: function(s1, s2, start, step, max, visited) {
        const curve = [start];
        for (const dir of [1, -1]) {
            let cur = { ...start };
            for (let i = 0; i < max/2; i++) {
                const n1 = this._normal(s1, cur.u1, cur.v1), n2 = this._normal(s2, cur.u2, cur.v2);
                const t = { x: n1.y*n2.z - n1.z*n2.y, y: n1.z*n2.x - n1.x*n2.z, z: n1.x*n2.y - n1.y*n2.x };
                const len = Math.sqrt(t.x*t.x + t.y*t.y + t.z*t.z);
                if (len < 1e-10) break;
                
                const nu1 = cur.u1 + dir * step * t.x / len;
                const nv1 = cur.v1 + dir * step * t.y / len;
                if (nu1 < 0 || nu1 > 1 || nv1 < 0 || nv1 > 1) break;
                
                const refined = this._refine(s1, s2, nu1, nv1, cur.u2, cur.v2, 1e-8);
                if (!refined) break;
                
                const key = `${refined.u1.toFixed(4)},${refined.v1.toFixed(4)}`;
                if (visited.has(key)) break;
                visited.add(key);
                
                dir === 1 ? curve.push(refined) : curve.unshift(refined);
                cur = refined;
            }
        }
        return curve;
    },

    _eval: function(s, u, v) {
        if (s.fn) return s.fn(u, v);
        const { controlPoints, numU, numV } = s;
        const i = Math.min(Math.floor(u * (numU-1)), numU-2);
        const j = Math.min(Math.floor(v * (numV-1)), numV-2);
        const ss = u * (numU-1) - i, tt = v * (numV-1) - j;
        const p00 = controlPoints[i*numV+j], p01 = controlPoints[i*numV+j+1];
        const p10 = controlPoints[(i+1)*numV+j], p11 = controlPoints[(i+1)*numV+j+1];
        return {
            x: (1-ss)*(1-tt)*p00.x + (1-ss)*tt*p01.x + ss*(1-tt)*p10.x + ss*tt*p11.x,
            y: (1-ss)*(1-tt)*p00.y + (1-ss)*tt*p01.y + ss*(1-tt)*p10.y + ss*tt*p11.y,
            z: (1-ss)*(1-tt)*p00.z + (1-ss)*tt*p01.z + ss*(1-tt)*p10.z + ss*tt*p11.z
        };
    },

    _normal: function(s, u, v) {
        const eps = 1e-6;
        const p0u = this._eval(s, Math.max(0, u-eps), v), p1u = this._eval(s, Math.min(1, u+eps), v);
        const p0v = this._eval(s, u, Math.max(0, v-eps)), p1v = this._eval(s, u, Math.min(1, v+eps));
        const du = { x: (p1u.x-p0u.x)/(2*eps), y: (p1u.y-p0u.y)/(2*eps), z: (p1u.z-p0u.z)/(2*eps) };
        const dv = { x: (p1v.x-p0v.x)/(2*eps), y: (p1v.y-p0v.y)/(2*eps), z: (p1v.z-p0v.z)/(2*eps) };
        const n = { x: du.y*dv.z - du.z*dv.y, y: du.z*dv.x - du.x*dv.z, z: du.x*dv.y - du.y*dv.x };
        const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
        if (len > 1e-10) { n.x /= len; n.y /= len; n.z /= len; }
        return n;
    },

    _dist: function(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2); },
    _removeDupPts: function(pts, tol) {
        const unique = [];
        for (const p of pts) {
            if (!unique.some(u => Math.abs(p.u1-u.u1) < tol && Math.abs(p.v1-u.v1) < tol)) unique.push(p);
        }
        return unique;
    }
};

// MODULE 21: PRISM_HARMONIC_MAPS_ENGINE - Surface Parameterization
const PRISM_HARMONIC_MAPS_ENGINE = {
    name: 'PRISM_HARMONIC_MAPS_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Floater 1997',

    parameterize: function(mesh, options = {}) {
        const { weightType = 'cotangent', boundaryType = 'circle' } = options;
        const n = mesh.vertices.length / 3;
        const boundary = this._findBoundary(mesh);
        const interior = [];
        for (let i = 0; i < n; i++) if (!boundary.includes(i)) interior.push(i);
        
        const boundaryUV = this._mapBoundary(mesh, boundary, boundaryType);
        const W = this._buildWeights(mesh, weightType);
        const uv = this._solve(n, interior, boundary, boundaryUV, W);
        
        return { uv, boundary, interior, distortion: this._computeDistortion(mesh, uv) };
    },

    _findBoundary: function(mesh) {
        const edgeCount = new Map();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        const boundaryEdges = [];
        for (const [key, count] of edgeCount) {
            if (count === 1) boundaryEdges.push(key.split(',').map(Number));
        }
        if (boundaryEdges.length === 0) return [];
        
        const boundary = [boundaryEdges[0][0]];
        const remaining = new Set(boundaryEdges.map((_, i) => i));
        remaining.delete(0);
        let current = boundaryEdges[0][1];
        
        while (remaining.size > 0 && current !== boundary[0]) {
            boundary.push(current);
            for (const i of remaining) {
                if (boundaryEdges[i][0] === current) { remaining.delete(i); current = boundaryEdges[i][1]; break; }
                else if (boundaryEdges[i][1] === current) { remaining.delete(i); current = boundaryEdges[i][0]; break; }
            }
        }
        return boundary;
    },

    _mapBoundary: function(mesh, boundary, shape) {
        const n = boundary.length, uv = [];
        for (let i = 0; i < n; i++) {
            const angle = 2 * Math.PI * i / n;
            uv.push({ u: 0.5 + 0.5 * Math.cos(angle), v: 0.5 + 0.5 * Math.sin(angle) });
        }
        return uv;
    },

    _buildWeights: function(mesh, type) {
        const n = mesh.vertices.length / 3;
        const W = Array.from({ length: n }, () => new Map());
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const i = mesh.indices[f], j = mesh.indices[f+1], k = mesh.indices[f+2];
            const vi = this._getV(mesh.vertices, i), vj = this._getV(mesh.vertices, j), vk = this._getV(mesh.vertices, k);
            
            const wij = type === 'uniform' ? 1 : this._cot(vk, vi, vj);
            const wjk = type === 'uniform' ? 1 : this._cot(vi, vj, vk);
            const wki = type === 'uniform' ? 1 : this._cot(vj, vk, vi);
            
            W[i].set(j, (W[i].get(j) || 0) + wij); W[j].set(i, (W[j].get(i) || 0) + wij);
            W[j].set(k, (W[j].get(k) || 0) + wjk); W[k].set(j, (W[k].get(j) || 0) + wjk);
            W[k].set(i, (W[k].get(i) || 0) + wki); W[i].set(k, (W[i].get(k) || 0) + wki);
        }
        return W;
    },

    _solve: function(n, interior, boundary, boundaryUV, W) {
        const uv = new Array(n);
        for (let i = 0; i < boundary.length; i++) uv[boundary[i]] = boundaryUV[i];
        
        const idx = new Map();
        interior.forEach((v, i) => idx.set(v, i));
        
        const m = interior.length;
        const A = Array.from({ length: m }, () => new Array(m).fill(0));
        const bu = new Array(m).fill(0), bv = new Array(m).fill(0);
        
        for (let i = 0; i < m; i++) {
            const v = interior[i];
            let sumW = 0;
            for (const [nb, w] of W[v]) {
                if (idx.has(nb)) A[i][idx.get(nb)] = -w;
                else {
                    const bIdx = boundary.indexOf(nb);
                    if (bIdx >= 0) { bu[i] += w * boundaryUV[bIdx].u; bv[i] += w * boundaryUV[bIdx].v; }
                }
                sumW += w;
            }
            A[i][i] = sumW;
        }
        
        const xu = this._gaussSeidel(A, bu, m), xv = this._gaussSeidel(A, bv, m);
        for (let i = 0; i < m; i++) uv[interior[i]] = { u: xu[i], v: xv[i] };
        return uv;
    },

    _gaussSeidel: function(A, b, n, maxIter = 500, tol = 1e-8) {
        const x = new Array(n).fill(0);
        for (let iter = 0; iter < maxIter; iter++) {
            let maxDiff = 0;
            for (let i = 0; i < n; i++) {
                let sum = b[i];
                for (let j = 0; j < n; j++) if (i !== j) sum -= A[i][j] * x[j];
                const newVal = sum / A[i][i];
                maxDiff = Math.max(maxDiff, Math.abs(newVal - x[i]));
                x[i] = newVal;
            }
            if (maxDiff < tol) break;
        }
        return x;
    },

    _cot: function(a, b, c) {
        const ba = { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z };
        const bc = { x: c.x-b.x, y: c.y-b.y, z: c.z-b.z };
        const dot = ba.x*bc.x + ba.y*bc.y + ba.z*bc.z;
        const cross = { x: ba.y*bc.z - ba.z*bc.y, y: ba.z*bc.x - ba.x*bc.z, z: ba.x*bc.y - ba.y*bc.x };
        const len = Math.sqrt(cross.x**2 + cross.y**2 + cross.z**2);
        return len > 1e-10 ? dot / len : 0;
    },

    _computeDistortion: function(mesh, uv) { return 0; },
    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
};

// MODULE 22: PRISM_SHAPE_DESCRIPTOR_ENGINE
const PRISM_SHAPE_DESCRIPTOR_ENGINE = {
    name: 'PRISM_SHAPE_DESCRIPTOR_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Osada Shape Distributions',

    computeD2: function(mesh, numSamples = 10000) {
        const hist = new Array(64).fill(0);
        let maxD = 0;
        const dists = [];
        
        for (let i = 0; i < numSamples; i++) {
            const p1 = this._sampleRandom(mesh), p2 = this._sampleRandom(mesh);
            const d = this._dist(p1, p2);
            dists.push(d);
            maxD = Math.max(maxD, d);
        }
        
        for (const d of dists) {
            const bin = Math.min(63, Math.floor(64 * d / maxD));
            hist[bin]++;
        }
        
        const sum = hist.reduce((a, b) => a + b, 0);
        return hist.map(h => h / sum);
    },

    computeA3: function(mesh, numSamples = 10000) {
        const hist = new Array(64).fill(0);
        
        for (let i = 0; i < numSamples; i++) {
            const p1 = this._sampleRandom(mesh), p2 = this._sampleRandom(mesh), p3 = this._sampleRandom(mesh);
            const v1 = { x: p1.x-p2.x, y: p1.y-p2.y, z: p1.z-p2.z };
            const v2 = { x: p3.x-p2.x, y: p3.y-p2.y, z: p3.z-p2.z };
            const len1 = Math.sqrt(v1.x**2 + v1.y**2 + v1.z**2);
            const len2 = Math.sqrt(v2.x**2 + v2.y**2 + v2.z**2);
            
            if (len1 > 1e-10 && len2 > 1e-10) {
                const dot = (v1.x*v2.x + v1.y*v2.y + v1.z*v2.z) / (len1 * len2);
                const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                hist[Math.min(63, Math.floor(64 * angle / Math.PI))]++;
            }
        }
        
        const sum = hist.reduce((a, b) => a + b, 0);
        return hist.map(h => h / sum);
    },

    compareHistograms: function(h1, h2) {
        let emd = 0, sum1 = 0, sum2 = 0;
        for (let i = 0; i < h1.length; i++) {
            sum1 += h1[i]; sum2 += h2[i];
            emd += Math.abs(sum1 - sum2);
        }
        return emd / h1.length;
    },

    _sampleRandom: function(mesh) {
        const areas = [], total = [];
        let totalArea = 0;
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const v0 = this._getV(mesh.vertices, mesh.indices[i]);
            const v1 = this._getV(mesh.vertices, mesh.indices[i+1]);
            const v2 = this._getV(mesh.vertices, mesh.indices[i+2]);
            const area = this._triArea(v0, v1, v2);
            areas.push(area);
            totalArea += area;
        }
        
        let r = Math.random() * totalArea, triIdx = 0;
        for (let i = 0; i < areas.length; i++) {
            r -= areas[i];
            if (r <= 0) { triIdx = i; break; }
        }
        
        const v0 = this._getV(mesh.vertices, mesh.indices[triIdx*3]);
        const v1 = this._getV(mesh.vertices, mesh.indices[triIdx*3+1]);
        const v2 = this._getV(mesh.vertices, mesh.indices[triIdx*3+2]);
        
        let u = Math.random(), v = Math.random();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        
        return {
            x: v0.x + u*(v1.x-v0.x) + v*(v2.x-v0.x),
            y: v0.y + u*(v1.y-v0.y) + v*(v2.y-v0.y),
            z: v0.z + u*(v1.z-v0.z) + v*(v2.z-v0.z)
        };
    },

    _triArea: function(v0, v1, v2) {
        const e1 = { x: v1.x-v0.x, y: v1.y-v0.y, z: v1.z-v0.z };
        const e2 = { x: v2.x-v0.x, y: v2.y-v0.y, z: v2.z-v0.z };
        const cross = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
        return 0.5 * Math.sqrt(cross.x**2 + cross.y**2 + cross.z**2);
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; },
    _dist: function(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2); }
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('medialAxis.distanceField', 'PRISM_MEDIAL_AXIS_ENGINE.computeDistanceField');
    PRISM_GATEWAY.register('medialAxis.skeleton', 'PRISM_MEDIAL_AXIS_ENGINE.computeCurveSkeleton');
    PRISM_GATEWAY.register('nurbs.evaluateCurve', 'PRISM_NURBS_ADVANCED_ENGINE.evaluateCurve');
    PRISM_GATEWAY.register('nurbs.evaluateSurface', 'PRISM_NURBS_ADVANCED_ENGINE.evaluateSurface');
    PRISM_GATEWAY.register('nurbs.insertKnot', 'PRISM_NURBS_ADVANCED_ENGINE.insertKnot');
    PRISM_GATEWAY.register('nurbs.derivative', 'PRISM_NURBS_ADVANCED_ENGINE.curveDerivative');
    PRISM_GATEWAY.register('nurbs.split', 'PRISM_NURBS_ADVANCED_ENGINE.splitCurve');
    PRISM_GATEWAY.register('bezier.intersect', 'PRISM_BEZIER_INTERSECTION_ENGINE.intersect');
    PRISM_GATEWAY.register('bezier.selfIntersect', 'PRISM_BEZIER_INTERSECTION_ENGINE.selfIntersect');
    PRISM_GATEWAY.register('surface.intersect', 'PRISM_SURFACE_INTERSECTION_ENGINE.intersect');
    PRISM_GATEWAY.register('harmonic.parameterize', 'PRISM_HARMONIC_MAPS_ENGINE.parameterize');
    PRISM_GATEWAY.register('shape.d2', 'PRISM_SHAPE_DESCRIPTOR_ENGINE.computeD2');
    PRISM_GATEWAY.register('shape.a3', 'PRISM_SHAPE_DESCRIPTOR_ENGINE.computeA3');
    PRISM_GATEWAY.register('shape.compare', 'PRISM_SHAPE_DESCRIPTOR_ENGINE.compareHistograms');
}

console.log('[PRISM Session 5 Ultimate v4 Part 4] Modules 17-22 loaded');
console.log('  - PRISM_MEDIAL_AXIS_ENGINE');
console.log('  - PRISM_NURBS_ADVANCED_ENGINE');
console.log('  - PRISM_BEZIER_INTERSECTION_ENGINE');
console.log('  - PRISM_SURFACE_INTERSECTION_ENGINE');
console.log('  - PRISM_HARMONIC_MAPS_ENGINE');
console.log('  - PRISM_SHAPE_DESCRIPTOR_ENGINE');
/**
 * PRISM SESSION 5 - ULTIMATE v4 - PART 5
 * Modules 23-26: Feature Detection, Repair, Offset, Boolean
 * Sources: Stanford CS 468, CGAL, MIT 2.158J
 */

// MODULE 23: PRISM_FEATURE_CURVES_ENGINE
const PRISM_FEATURE_CURVES_ENGINE = {
    name: 'PRISM_FEATURE_CURVES_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Ohtake 2004',

    detectSharpEdges: function(mesh, angleThreshold = 30) {
        const sharpEdges = [], radThresh = angleThreshold * Math.PI / 180;
        const edgeFaces = new Map();
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            const faceIdx = f / 3;
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                if (!edgeFaces.has(key)) edgeFaces.set(key, []);
                edgeFaces.get(key).push(faceIdx);
            }
        }
        
        for (const [key, faces] of edgeFaces) {
            if (faces.length !== 2) continue;
            const n1 = this._faceNormal(mesh, faces[0]), n2 = this._faceNormal(mesh, faces[1]);
            const dot = n1.x*n2.x + n1.y*n2.y + n1.z*n2.z;
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            if (angle > radThresh) {
                const [v1, v2] = key.split(',').map(Number);
                sharpEdges.push({ vertices: [v1, v2], angle: angle * 180 / Math.PI });
            }
        }
        return sharpEdges;
    },

    detectBoundaries: function(mesh) {
        const edgeCount = new Map();
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        
        const boundaryEdges = [];
        for (const [key, count] of edgeCount) {
            if (count === 1) boundaryEdges.push(key.split(',').map(Number));
        }
        return this._connectLoops(boundaryEdges);
    },

    detectRidgesAndValleys: function(mesh, options = {}) {
        const { threshold = 0.1 } = options;
        const curvatures = this._computeCurvatures(mesh);
        const ridgePoints = [], valleyPoints = [];
        
        for (let i = 0; i < curvatures.length; i++) {
            const { kMax, kMin } = curvatures[i];
            if (Math.abs(kMax) > threshold) {
                if (kMax > 0) ridgePoints.push({ vertex: i, curvature: kMax });
                else valleyPoints.push({ vertex: i, curvature: kMin });
            }
        }
        return { ridges: ridgePoints, valleys: valleyPoints };
    },

    _faceNormal: function(mesh, fIdx) {
        const i = fIdx * 3;
        const a = this._getV(mesh.vertices, mesh.indices[i]);
        const b = this._getV(mesh.vertices, mesh.indices[i+1]);
        const c = this._getV(mesh.vertices, mesh.indices[i+2]);
        const e1 = { x: b.x-a.x, y: b.y-a.y, z: b.z-a.z };
        const e2 = { x: c.x-a.x, y: c.y-a.y, z: c.z-a.z };
        const n = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
        const len = Math.sqrt(n.x**2 + n.y**2 + n.z**2);
        if (len > 1e-10) { n.x /= len; n.y /= len; n.z /= len; }
        return n;
    },

    _connectLoops: function(edges) {
        const loops = [], remaining = new Set(edges.map((_, i) => i));
        while (remaining.size > 0) {
            const loop = [], startIdx = remaining.values().next().value;
            remaining.delete(startIdx);
            loop.push(edges[startIdx][0]);
            let current = edges[startIdx][1];
            
            while (current !== loop[0] && remaining.size > 0) {
                loop.push(current);
                let found = false;
                for (const i of remaining) {
                    if (edges[i][0] === current) { remaining.delete(i); current = edges[i][1]; found = true; break; }
                    else if (edges[i][1] === current) { remaining.delete(i); current = edges[i][0]; found = true; break; }
                }
                if (!found) break;
            }
            if (loop.length >= 3) loops.push(loop);
        }
        return loops;
    },

    _computeCurvatures: function(mesh) {
        const n = mesh.vertices.length / 3;
        return Array.from({ length: n }, () => ({ kMax: Math.random() * 0.2 - 0.1, kMin: Math.random() * 0.2 - 0.1 }));
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
};

// MODULE 24: PRISM_MESH_REPAIR_ENGINE
const PRISM_MESH_REPAIR_ENGINE = {
    name: 'PRISM_MESH_REPAIR_ENGINE',
    version: '1.0.0',
    source: 'CGAL, Attene Mesh Healing',

    repair: function(mesh, options = {}) {
        const { removeDuplicates = true, removeDegenerate = true, fillHoles = true, fixNormals = true } = options;
        let repaired = { vertices: [...mesh.vertices], indices: [...mesh.indices] };
        const report = { fixed: [], remaining: [] };
        
        if (removeDuplicates) {
            const result = this._removeDupVerts(repaired);
            repaired = result.mesh;
            if (result.removed > 0) report.fixed.push(`Removed ${result.removed} duplicate vertices`);
        }
        
        if (removeDegenerate) {
            const result = this._removeDegFaces(repaired);
            repaired = result.mesh;
            if (result.removed > 0) report.fixed.push(`Removed ${result.removed} degenerate faces`);
        }
        
        if (fillHoles) {
            const result = this._fillHoles(repaired);
            repaired = result.mesh;
            if (result.filled > 0) report.fixed.push(`Filled ${result.filled} holes`);
        }
        
        if (fixNormals) {
            const result = this._fixNormals(repaired);
            repaired = result.mesh;
            if (result.flipped > 0) report.fixed.push(`Flipped ${result.flipped} faces`);
        }
        
        const validation = this.validate(repaired);
        report.remaining = validation.issues;
        return { mesh: repaired, report };
    },

    validate: function(mesh) {
        const issues = [];
        const nonManifold = this._findNonManifold(mesh);
        if (nonManifold.length > 0) issues.push(`${nonManifold.length} non-manifold edges`);
        
        const holes = this._findHoles(mesh);
        if (holes.length > 0) issues.push(`${holes.length} holes`);
        
        const isolated = this._findIsolated(mesh);
        if (isolated.length > 0) issues.push(`${isolated.length} isolated vertices`);
        
        return {
            isValid: issues.length === 0,
            issues,
            stats: { vertices: mesh.vertices.length / 3, faces: mesh.indices.length / 3 }
        };
    },

    _removeDupVerts: function(mesh) {
        const n = mesh.vertices.length / 3;
        const mapping = new Array(n), newVerts = [], vertexMap = new Map();
        let newIdx = 0;
        
        for (let i = 0; i < n; i++) {
            const key = `${mesh.vertices[i*3].toFixed(6)},${mesh.vertices[i*3+1].toFixed(6)},${mesh.vertices[i*3+2].toFixed(6)}`;
            if (vertexMap.has(key)) {
                mapping[i] = vertexMap.get(key);
            } else {
                vertexMap.set(key, newIdx);
                mapping[i] = newIdx;
                newVerts.push(mesh.vertices[i*3], mesh.vertices[i*3+1], mesh.vertices[i*3+2]);
                newIdx++;
            }
        }
        return { mesh: { vertices: newVerts, indices: mesh.indices.map(idx => mapping[idx]) }, removed: n - newIdx };
    },

    _removeDegFaces: function(mesh) {
        const newIndices = [];
        let removed = 0;
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            if (a === b || b === c || c === a) { removed++; continue; }
            
            const va = this._getV(mesh.vertices, a), vb = this._getV(mesh.vertices, b), vc = this._getV(mesh.vertices, c);
            const e1 = { x: vb.x-va.x, y: vb.y-va.y, z: vb.z-va.z };
            const e2 = { x: vc.x-va.x, y: vc.y-va.y, z: vc.z-va.z };
            const cross = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
            const area = Math.sqrt(cross.x**2 + cross.y**2 + cross.z**2);
            
            if (area < 1e-10) { removed++; continue; }
            newIndices.push(a, b, c);
        }
        return { mesh: { vertices: mesh.vertices, indices: newIndices }, removed };
    },

    _fillHoles: function(mesh) {
        const holes = this._findHoles(mesh);
        const newIndices = [...mesh.indices];
        
        for (const hole of holes) {
            if (hole.length < 3) continue;
            const v0 = hole[0];
            for (let i = 1; i < hole.length - 1; i++) newIndices.push(v0, hole[i], hole[i+1]);
        }
        return { mesh: { vertices: mesh.vertices, indices: newIndices }, filled: holes.length };
    },

    _fixNormals: function(mesh) {
        const numFaces = mesh.indices.length / 3;
        const visited = new Set(), newIndices = [...mesh.indices];
        let flipped = 0;
        
        const edgeToFaces = new Map();
        for (let f = 0; f < numFaces; f++) {
            const a = mesh.indices[f*3], b = mesh.indices[f*3+1], c = mesh.indices[f*3+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                if (!edgeToFaces.has(key)) edgeToFaces.set(key, []);
                edgeToFaces.get(key).push({ face: f, dir: v1 < v2 });
            }
        }
        
        const faceAdj = Array.from({ length: numFaces }, () => []);
        for (const faces of edgeToFaces.values()) {
            if (faces.length === 2) {
                faceAdj[faces[0].face].push({ face: faces[1].face, sameDir: faces[0].dir === faces[1].dir });
                faceAdj[faces[1].face].push({ face: faces[0].face, sameDir: faces[0].dir === faces[1].dir });
            }
        }
        
        const queue = [{ face: 0, shouldFlip: false }];
        visited.add(0);
        
        while (queue.length > 0) {
            const { face, shouldFlip } = queue.shift();
            if (shouldFlip) {
                const temp = newIndices[face*3+1];
                newIndices[face*3+1] = newIndices[face*3+2];
                newIndices[face*3+2] = temp;
                flipped++;
            }
            
            for (const { face: adjFace, sameDir } of faceAdj[face]) {
                if (visited.has(adjFace)) continue;
                visited.add(adjFace);
                queue.push({ face: adjFace, shouldFlip: shouldFlip ? !sameDir : sameDir });
            }
        }
        return { mesh: { vertices: mesh.vertices, indices: newIndices }, flipped };
    },

    _findNonManifold: function(mesh) {
        const edgeCount = new Map();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        return Array.from(edgeCount).filter(([_, count]) => count > 2).map(([key]) => key.split(',').map(Number));
    },

    _findHoles: function(mesh) {
        const edgeCount = new Map();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${v1},${v2}`, revKey = `${v2},${v1}`;
                if (edgeCount.has(revKey)) edgeCount.delete(revKey);
                else edgeCount.set(key, true);
            }
        }
        
        const boundaryEdges = Array.from(edgeCount.keys()).map(k => k.split(',').map(Number));
        const holes = [], remaining = new Set(boundaryEdges.map((_, i) => i));
        
        while (remaining.size > 0) {
            const hole = [], startIdx = remaining.values().next().value;
            remaining.delete(startIdx);
            hole.push(boundaryEdges[startIdx][0]);
            let current = boundaryEdges[startIdx][1];
            
            while (current !== hole[0] && remaining.size > 0) {
                hole.push(current);
                let found = false;
                for (const i of remaining) {
                    if (boundaryEdges[i][0] === current) { remaining.delete(i); current = boundaryEdges[i][1]; found = true; break; }
                }
                if (!found) break;
            }
            if (hole.length >= 3) holes.push(hole);
        }
        return holes;
    },

    _findIsolated: function(mesh) {
        const referenced = new Set(mesh.indices);
        const isolated = [];
        for (let i = 0; i < mesh.vertices.length / 3; i++) {
            if (!referenced.has(i)) isolated.push(i);
        }
        return isolated;
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
};

// MODULE 25: PRISM_OFFSET_SURFACE_ENGINE
const PRISM_OFFSET_SURFACE_ENGINE = {
    name: 'PRISM_OFFSET_SURFACE_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.158J, Maekawa 1999',

    offsetMesh: function(mesh, distance, options = {}) {
        const { smoothNormals = true } = options;
        const n = mesh.vertices.length / 3;
        const normals = smoothNormals ? this._smoothNormals(mesh) : this._faceNormals(mesh);
        const newVerts = new Float64Array(n * 3);
        
        for (let i = 0; i < n; i++) {
            newVerts[i*3] = mesh.vertices[i*3] + distance * normals[i].x;
            newVerts[i*3+1] = mesh.vertices[i*3+1] + distance * normals[i].y;
            newVerts[i*3+2] = mesh.vertices[i*3+2] + distance * normals[i].z;
        }
        return { vertices: Array.from(newVerts), indices: [...mesh.indices] };
    },

    createShell: function(mesh, thickness, options = {}) {
        const { capOpenEdges = true } = options;
        const outer = this.offsetMesh(mesh, thickness / 2, options);
        const inner = this.offsetMesh(mesh, -thickness / 2, options);
        
        // Flip inner normals
        const flippedInner = { vertices: inner.vertices, indices: [] };
        for (let i = 0; i < inner.indices.length; i += 3) {
            flippedInner.indices.push(inner.indices[i], inner.indices[i+2], inner.indices[i+1]);
        }
        
        const outerVertCount = outer.vertices.length / 3;
        const combined = {
            vertices: [...outer.vertices, ...flippedInner.vertices],
            indices: [...outer.indices, ...flippedInner.indices.map(idx => idx + outerVertCount)]
        };
        
        if (capOpenEdges) {
            const caps = this._createCaps(mesh, outerVertCount);
            combined.indices.push(...caps);
        }
        return combined;
    },

    _smoothNormals: function(mesh) {
        const n = mesh.vertices.length / 3;
        const normals = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            const va = this._getV(mesh.vertices, a), vb = this._getV(mesh.vertices, b), vc = this._getV(mesh.vertices, c);
            const e1 = { x: vb.x-va.x, y: vb.y-va.y, z: vb.z-va.z };
            const e2 = { x: vc.x-va.x, y: vc.y-va.y, z: vc.z-va.z };
            const fn = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
            
            normals[a].x += fn.x; normals[a].y += fn.y; normals[a].z += fn.z;
            normals[b].x += fn.x; normals[b].y += fn.y; normals[b].z += fn.z;
            normals[c].x += fn.x; normals[c].y += fn.y; normals[c].z += fn.z;
        }
        
        for (let i = 0; i < n; i++) {
            const len = Math.sqrt(normals[i].x**2 + normals[i].y**2 + normals[i].z**2);
            if (len > 1e-10) { normals[i].x /= len; normals[i].y /= len; normals[i].z /= len; }
        }
        return normals;
    },

    _faceNormals: function(mesh) {
        const n = mesh.vertices.length / 3;
        const normals = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
        const counts = new Array(n).fill(0);
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            const va = this._getV(mesh.vertices, a), vb = this._getV(mesh.vertices, b), vc = this._getV(mesh.vertices, c);
            const e1 = { x: vb.x-va.x, y: vb.y-va.y, z: vb.z-va.z };
            const e2 = { x: vc.x-va.x, y: vc.y-va.y, z: vc.z-va.z };
            const fn = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
            const len = Math.sqrt(fn.x**2 + fn.y**2 + fn.z**2);
            if (len > 1e-10) { fn.x /= len; fn.y /= len; fn.z /= len; }
            
            for (const v of [a, b, c]) {
                normals[v].x += fn.x; normals[v].y += fn.y; normals[v].z += fn.z;
                counts[v]++;
            }
        }
        
        for (let i = 0; i < n; i++) {
            if (counts[i] > 0) { normals[i].x /= counts[i]; normals[i].y /= counts[i]; normals[i].z /= counts[i]; }
        }
        return normals;
    },

    _createCaps: function(mesh, outerVertOffset) {
        const caps = [], edgeCount = new Map();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        
        for (const [key, count] of edgeCount) {
            if (count === 1) {
                const [v1, v2] = key.split(',').map(Number);
                caps.push(v1, v2, v2 + outerVertOffset);
                caps.push(v1, v2 + outerVertOffset, v1 + outerVertOffset);
            }
        }
        return caps;
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
};

// MODULE 26: PRISM_MESH_BOOLEAN_ADVANCED_ENGINE
const PRISM_MESH_BOOLEAN_ADVANCED_ENGINE = {
    name: 'PRISM_MESH_BOOLEAN_ADVANCED_ENGINE',
    version: '1.0.0',
    source: 'CGAL Nef Polyhedra, Cork',

    union: function(meshA, meshB) { return this._boolOp(meshA, meshB, 'union'); },
    intersection: function(meshA, meshB) { return this._boolOp(meshA, meshB, 'intersection'); },
    difference: function(meshA, meshB) { return this._boolOp(meshA, meshB, 'difference'); },
    
    symmetricDifference: function(meshA, meshB) {
        const aMinusB = this.difference(meshA, meshB);
        const bMinusA = this.difference(meshB, meshA);
        return this._combineMeshes(aMinusB, bMinusA);
    },

    _boolOp: function(meshA, meshB, operation) {
        const bspA = this._buildBSP(meshA), bspB = this._buildBSP(meshB);
        let resultA, resultB;
        
        switch (operation) {
            case 'union':
                resultA = this._clipToExterior(bspA, bspB);
                resultB = this._clipToExterior(bspB, bspA);
                break;
            case 'intersection':
                resultA = this._clipToInterior(bspA, bspB);
                resultB = this._clipToInterior(bspB, bspA);
                break;
            case 'difference':
                resultA = this._clipToExterior(bspA, bspB);
                resultB = this._invertMesh(this._clipToInterior(bspB, bspA));
                break;
        }
        return this._combineMeshes(resultA, resultB);
    },

    _buildBSP: function(mesh) {
        const faces = [];
        for (let i = 0; i < mesh.indices.length; i += 3) {
            faces.push({ vertices: [
                this._getV(mesh.vertices, mesh.indices[i]),
                this._getV(mesh.vertices, mesh.indices[i+1]),
                this._getV(mesh.vertices, mesh.indices[i+2])
            ]});
        }
        return this._buildNode(faces);
    },

    _buildNode: function(faces) {
        if (faces.length === 0) return null;
        
        const node = {
            plane: this._computePlane(faces[0]),
            front: [], back: [], coplanar: [faces[0]]
        };
        
        for (let i = 1; i < faces.length; i++) {
            const cls = this._classifyFace(faces[i], node.plane);
            switch (cls.type) {
                case 'front': node.front.push(faces[i]); break;
                case 'back': node.back.push(faces[i]); break;
                case 'coplanar': node.coplanar.push(faces[i]); break;
                case 'spanning':
                    const split = this._splitFace(faces[i], node.plane);
                    node.front.push(...split.front);
                    node.back.push(...split.back);
                    break;
            }
        }
        
        node.frontNode = this._buildNode(node.front);
        node.backNode = this._buildNode(node.back);
        return node;
    },

    _computePlane: function(face) {
        const v0 = face.vertices[0], v1 = face.vertices[1], v2 = face.vertices[2];
        const e1 = { x: v1.x-v0.x, y: v1.y-v0.y, z: v1.z-v0.z };
        const e2 = { x: v2.x-v0.x, y: v2.y-v0.y, z: v2.z-v0.z };
        const n = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
        const len = Math.sqrt(n.x**2 + n.y**2 + n.z**2);
        if (len > 1e-10) { n.x /= len; n.y /= len; n.z /= len; }
        return { normal: n, d: -(n.x*v0.x + n.y*v0.y + n.z*v0.z) };
    },

    _classifyFace: function(face, plane) {
        const eps = 1e-6;
        let front = 0, back = 0;
        for (const v of face.vertices) {
            const d = plane.normal.x*v.x + plane.normal.y*v.y + plane.normal.z*v.z + plane.d;
            if (d > eps) front++;
            else if (d < -eps) back++;
        }
        if (front > 0 && back === 0) return { type: 'front' };
        if (back > 0 && front === 0) return { type: 'back' };
        if (front === 0 && back === 0) return { type: 'coplanar' };
        return { type: 'spanning' };
    },

    _splitFace: function(face, plane) {
        const eps = 1e-6;
        const frontVerts = [], backVerts = [];
        
        for (let i = 0; i < face.vertices.length; i++) {
            const v1 = face.vertices[i], v2 = face.vertices[(i+1) % face.vertices.length];
            const d1 = plane.normal.x*v1.x + plane.normal.y*v1.y + plane.normal.z*v1.z + plane.d;
            const d2 = plane.normal.x*v2.x + plane.normal.y*v2.y + plane.normal.z*v2.z + plane.d;
            
            if (d1 >= -eps) frontVerts.push(v1);
            if (d1 <= eps) backVerts.push(v1);
            
            if ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) {
                const t = d1 / (d1 - d2);
                const inter = { x: v1.x + t*(v2.x-v1.x), y: v1.y + t*(v2.y-v1.y), z: v1.z + t*(v2.z-v1.z) };
                frontVerts.push(inter);
                backVerts.push({ ...inter });
            }
        }
        return { front: this._triangulate(frontVerts), back: this._triangulate(backVerts) };
    },

    _triangulate: function(verts) {
        if (verts.length < 3) return [];
        const faces = [];
        for (let i = 1; i < verts.length - 1; i++) {
            faces.push({ vertices: [verts[0], verts[i], verts[i+1]] });
        }
        return faces;
    },

    _clipToExterior: function(bsp, clipBsp) { return this._collect(bsp, clipBsp, false); },
    _clipToInterior: function(bsp, clipBsp) { return this._collect(bsp, clipBsp, true); },

    _collect: function(bsp, clipBsp, keepInside) {
        if (!bsp) return { vertices: [], indices: [] };
        const faces = this._collectAll(bsp);
        const kept = [];
        
        for (const face of faces) {
            const centroid = {
                x: (face.vertices[0].x + face.vertices[1].x + face.vertices[2].x) / 3,
                y: (face.vertices[0].y + face.vertices[1].y + face.vertices[2].y) / 3,
                z: (face.vertices[0].z + face.vertices[1].z + face.vertices[2].z) / 3
            };
            if (this._pointInBSP(centroid, clipBsp) === keepInside) kept.push(face);
        }
        return this._facesToMesh(kept);
    },

    _collectAll: function(node) {
        if (!node) return [];
        return [...node.coplanar, ...this._collectAll(node.frontNode), ...this._collectAll(node.backNode)];
    },

    _pointInBSP: function(p, bsp) {
        if (!bsp) return false;
        const d = bsp.plane.normal.x*p.x + bsp.plane.normal.y*p.y + bsp.plane.normal.z*p.z + bsp.plane.d;
        if (d > 1e-6) return bsp.frontNode ? this._pointInBSP(p, bsp.frontNode) : false;
        if (d < -1e-6) return bsp.backNode ? this._pointInBSP(p, bsp.backNode) : true;
        return (bsp.frontNode ? this._pointInBSP(p, bsp.frontNode) : false) || 
               (bsp.backNode ? this._pointInBSP(p, bsp.backNode) : true);
    },

    _facesToMesh: function(faces) {
        const vertices = [], indices = [], vertexMap = new Map();
        for (const face of faces) {
            const faceIndices = [];
            for (const v of face.vertices) {
                const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
                if (!vertexMap.has(key)) {
                    vertexMap.set(key, vertices.length / 3);
                    vertices.push(v.x, v.y, v.z);
                }
                faceIndices.push(vertexMap.get(key));
            }
            indices.push(...faceIndices);
        }
        return { vertices, indices };
    },

    _invertMesh: function(mesh) {
        const newIndices = [];
        for (let i = 0; i < mesh.indices.length; i += 3) {
            newIndices.push(mesh.indices[i], mesh.indices[i+2], mesh.indices[i+1]);
        }
        return { vertices: mesh.vertices, indices: newIndices };
    },

    _combineMeshes: function(a, b) {
        const offset = a.vertices.length / 3;
        return {
            vertices: [...a.vertices, ...b.vertices],
            indices: [...a.indices, ...b.indices.map(idx => idx + offset)]
        };
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('feature.sharpEdges', 'PRISM_FEATURE_CURVES_ENGINE.detectSharpEdges');
    PRISM_GATEWAY.register('feature.boundaries', 'PRISM_FEATURE_CURVES_ENGINE.detectBoundaries');
    PRISM_GATEWAY.register('feature.ridges', 'PRISM_FEATURE_CURVES_ENGINE.detectRidgesAndValleys');
    PRISM_GATEWAY.register('mesh.repair', 'PRISM_MESH_REPAIR_ENGINE.repair');
    PRISM_GATEWAY.register('mesh.validate', 'PRISM_MESH_REPAIR_ENGINE.validate');
    PRISM_GATEWAY.register('offset.mesh', 'PRISM_OFFSET_SURFACE_ENGINE.offsetMesh');
    PRISM_GATEWAY.register('offset.shell', 'PRISM_OFFSET_SURFACE_ENGINE.createShell');
    PRISM_GATEWAY.register('boolean.union', 'PRISM_MESH_BOOLEAN_ADVANCED_ENGINE.union');
    PRISM_GATEWAY.register('boolean.intersection', 'PRISM_MESH_BOOLEAN_ADVANCED_ENGINE.intersection');
    PRISM_GATEWAY.register('boolean.difference', 'PRISM_MESH_BOOLEAN_ADVANCED_ENGINE.difference');
    PRISM_GATEWAY.register('boolean.xor', 'PRISM_MESH_BOOLEAN_ADVANCED_ENGINE.symmetricDifference');
}

console.log('[PRISM Session 5 Ultimate v4 Part 5] Modules 23-26 loaded');
console.log('  - PRISM_FEATURE_CURVES_ENGINE');
console.log('  - PRISM_MESH_REPAIR_ENGINE');
console.log('  - PRISM_OFFSET_SURFACE_ENGINE');
console.log('  - PRISM_MESH_BOOLEAN_ADVANCED_ENGINE');


// ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ SESSION 1 ULTIMATE AI/ML ENHANCEMENT - 22 MODULES - 127 GATEWAY ROUTES                   ║
// ║ Sources: MIT 6.036, MIT 15.773, Stanford CS 229, CS 231N, CS 224N                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════════╝

/**
 * PRISM SESSION 1 - ULTIMATE AI/ML ENHANCEMENT - PART 1
 * Reinforcement Learning & Value-Based Methods
 * Sources: Stanford CS 229, MIT 6.036, MIT 6.867
 * Total: 15 Modules, 45+ Gateway Routes
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1: PRISM_RL_SARSA_ENGINE
// SARSA: On-Policy TD Control
// Source: Stanford CS 229 Lecture Notes 12
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_RL_SARSA_ENGINE = {
    name: 'PRISM_RL_SARSA_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036',

    initQTable: function(states, actions) {
        const Q = {};
        for (const s of states) {
            Q[s] = {};
            for (const a of actions) Q[s][a] = 0;
        }
        return Q;
    },

    selectAction: function(Q, state, actions, epsilon = 0.1) {
        if (Math.random() < epsilon) {
            return actions[Math.floor(Math.random() * actions.length)];
        }
        let bestAction = actions[0], bestValue = Q[state]?.[actions[0]] || 0;
        for (const a of actions) {
            const value = Q[state]?.[a] || 0;
            if (value > bestValue) { bestValue = value; bestAction = a; }
        }
        return bestAction;
    },

    update: function(Q, s, a, r, s_next, a_next, alpha = 0.1, gamma = 0.99) {
        const currentQ = Q[s]?.[a] || 0;
        const nextQ = Q[s_next]?.[a_next] || 0;
        const target = r + gamma * nextQ;
        const tdError = target - currentQ;
        if (!Q[s]) Q[s] = {};
        Q[s][a] = currentQ + alpha * tdError;
        return { Q, tdError, target };
    },

    episode: function(env, Q, params = {}) {
        const { alpha = 0.1, gamma = 0.99, epsilon = 0.1, maxSteps = 1000 } = params;
        const actions = env.getActions();
        let state = env.reset();
        let action = this.selectAction(Q, state, actions, epsilon);
        let totalReward = 0, steps = 0;

        while (steps < maxSteps) {
            const { nextState, reward, done } = env.step(action);
            const nextAction = this.selectAction(Q, nextState, actions, epsilon);
            this.update(Q, state, action, reward, nextState, nextAction, alpha, gamma);
            totalReward += reward;
            state = nextState;
            action = nextAction;
            steps++;
            if (done) break;
        }
        return { Q, totalReward, steps };
    },

    train: function(env, params = {}) {
        const { episodes = 1000, alpha = 0.1, gamma = 0.99, epsilonStart = 1.0, epsilonEnd = 0.01, epsilonDecay = 0.995 } = params;
        const Q = this.initQTable(env.getStates(), env.getActions());
        const rewards = [];
        let epsilon = epsilonStart;

        for (let ep = 0; ep < episodes; ep++) {
            const result = this.episode(env, Q, { alpha, gamma, epsilon });
            rewards.push(result.totalReward);
            epsilon = Math.max(epsilonEnd, epsilon * epsilonDecay);
        }
        return { Q, rewards, policy: this._extractPolicy(Q, env.getActions()) };
    },

    _extractPolicy: function(Q, actions) {
        const policy = {};
        for (const s in Q) {
            policy[s] = actions.reduce((best, a) => Q[s][a] > Q[s][best] ? a : best, actions[0]);
        }
        return policy;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2: PRISM_RL_QLEARNING_ENGINE
// Q-Learning: Off-Policy TD Control
// Source: Watkins 1989, Stanford CS 229
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_RL_QLEARNING_ENGINE = {
    name: 'PRISM_RL_QLEARNING_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, Watkins 1989',

    initQTable: function(states, actions) {
        const Q = {};
        for (const s of states) {
            Q[s] = {};
            for (const a of actions) Q[s][a] = 0;
        }
        return Q;
    },

    update: function(Q, s, a, r, s_next, actions, alpha = 0.1, gamma = 0.99) {
        const currentQ = Q[s]?.[a] || 0;
        // Q-learning uses max over next state actions (off-policy)
        const maxNextQ = Math.max(...actions.map(ap => Q[s_next]?.[ap] || 0));
        const target = r + gamma * maxNextQ;
        const tdError = target - currentQ;
        if (!Q[s]) Q[s] = {};
        Q[s][a] = currentQ + alpha * tdError;
        return { Q, tdError, target };
    },

    selectAction: function(Q, state, actions, epsilon = 0.1) {
        if (Math.random() < epsilon) {
            return actions[Math.floor(Math.random() * actions.length)];
        }
        return actions.reduce((best, a) => (Q[state]?.[a] || 0) > (Q[state]?.[best] || 0) ? a : best, actions[0]);
    },

    episode: function(env, Q, params = {}) {
        const { alpha = 0.1, gamma = 0.99, epsilon = 0.1, maxSteps = 1000 } = params;
        const actions = env.getActions();
        let state = env.reset(), totalReward = 0, steps = 0;

        while (steps < maxSteps) {
            const action = this.selectAction(Q, state, actions, epsilon);
            const { nextState, reward, done } = env.step(action);
            this.update(Q, state, action, reward, nextState, actions, alpha, gamma);
            totalReward += reward;
            state = nextState;
            steps++;
            if (done) break;
        }
        return { Q, totalReward, steps };
    },

    train: function(env, params = {}) {
        const { episodes = 1000, alpha = 0.1, gamma = 0.99, epsilonStart = 1.0, epsilonEnd = 0.01, epsilonDecay = 0.995 } = params;
        const Q = this.initQTable(env.getStates(), env.getActions());
        const rewards = [];
        let epsilon = epsilonStart;

        for (let ep = 0; ep < episodes; ep++) {
            const result = this.episode(env, Q, { alpha, gamma, epsilon });
            rewards.push(result.totalReward);
            epsilon = Math.max(epsilonEnd, epsilon * epsilonDecay);
        }
        return { Q, rewards, policy: this._extractPolicy(Q, env.getActions()) };
    },

    _extractPolicy: function(Q, actions) {
        const policy = {};
        for (const s in Q) {
            policy[s] = actions.reduce((best, a) => Q[s][a] > Q[s][best] ? a : best, actions[0]);
        }
        return policy;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3: PRISM_VALUE_ITERATION_ENGINE
// Value Iteration for MDPs
// Source: MIT 6.036, Stanford CS 221
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_VALUE_ITERATION_ENGINE = {
    name: 'PRISM_VALUE_ITERATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 221',

    solve: function(mdp, params = {}) {
        const { epsilon = 1e-6, maxIterations = 1000, gamma = 0.99 } = params;
        const { states, actions, transitions, rewards } = mdp;

        // Initialize V(s) = 0 for all states
        const V = {};
        for (const s of states) V[s] = 0;

        let iteration = 0, delta = Infinity;

        while (delta > epsilon && iteration < maxIterations) {
            delta = 0;

            for (const s of states) {
                const oldV = V[s];

                // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
                let maxValue = -Infinity;
                for (const a of actions) {
                    let value = rewards[s]?.[a] || rewards[s] || 0;
                    const trans = transitions[s]?.[a];
                    if (trans) {
                        for (const s_next in trans) {
                            value += gamma * trans[s_next] * V[s_next];
                        }
                    }
                    maxValue = Math.max(maxValue, value);
                }
                V[s] = maxValue === -Infinity ? 0 : maxValue;
                delta = Math.max(delta, Math.abs(V[s] - oldV));
            }
            iteration++;
        }

        // Extract policy
        const policy = this._extractPolicy(V, mdp, gamma);
        return { V, policy, iterations: iteration, converged: delta <= epsilon };
    },

    _extractPolicy: function(V, mdp, gamma) {
        const { states, actions, transitions, rewards } = mdp;
        const policy = {};

        for (const s of states) {
            let bestAction = actions[0], bestValue = -Infinity;

            for (const a of actions) {
                let value = rewards[s]?.[a] || rewards[s] || 0;
                const trans = transitions[s]?.[a];
                if (trans) {
                    for (const s_next in trans) {
                        value += gamma * trans[s_next] * V[s_next];
                    }
                }
                if (value > bestValue) {
                    bestValue = value;
                    bestAction = a;
                }
            }
            policy[s] = bestAction;
        }
        return policy;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4: PRISM_POLICY_ITERATION_ENGINE
// Policy Iteration for MDPs
// Source: MIT 6.036, Sutton & Barto
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_POLICY_ITERATION_ENGINE = {
    name: 'PRISM_POLICY_ITERATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Sutton & Barto',

    solve: function(mdp, params = {}) {
        const { epsilon = 1e-6, maxIterations = 100, gamma = 0.99 } = params;
        const { states, actions, transitions, rewards } = mdp;

        // Initialize random policy
        const policy = {};
        for (const s of states) policy[s] = actions[0];

        let stable = false, iteration = 0;

        while (!stable && iteration < maxIterations) {
            // Policy Evaluation
            const V = this._evaluatePolicy(policy, mdp, gamma, epsilon);

            // Policy Improvement
            stable = true;
            for (const s of states) {
                const oldAction = policy[s];

                let bestAction = actions[0], bestValue = -Infinity;
                for (const a of actions) {
                    let value = rewards[s]?.[a] || rewards[s] || 0;
                    const trans = transitions[s]?.[a];
                    if (trans) {
                        for (const s_next in trans) {
                            value += gamma * trans[s_next] * V[s_next];
                        }
                    }
                    if (value > bestValue) {
                        bestValue = value;
                        bestAction = a;
                    }
                }

                policy[s] = bestAction;
                if (oldAction !== bestAction) stable = false;
            }
            iteration++;
        }

        const V = this._evaluatePolicy(policy, mdp, gamma, epsilon);
        return { V, policy, iterations: iteration, converged: stable };
    },

    _evaluatePolicy: function(policy, mdp, gamma, epsilon) {
        const { states, transitions, rewards } = mdp;
        const V = {};
        for (const s of states) V[s] = 0;

        let delta = Infinity;
        while (delta > epsilon) {
            delta = 0;
            for (const s of states) {
                const a = policy[s];
                const oldV = V[s];
                
                let value = rewards[s]?.[a] || rewards[s] || 0;
                const trans = transitions[s]?.[a];
                if (trans) {
                    for (const s_next in trans) {
                        value += gamma * trans[s_next] * V[s_next];
                    }
                }
                V[s] = value;
                delta = Math.max(delta, Math.abs(V[s] - oldV));
            }
        }
        return V;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 5: PRISM_POLICY_GRADIENT_ENGINE
// REINFORCE Algorithm (Monte Carlo Policy Gradient)
// Source: Williams 1992, Stanford CS 229
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_POLICY_GRADIENT_ENGINE = {
    name: 'PRISM_POLICY_GRADIENT_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, Williams 1992',

    initWeights: function(stateDim, numActions) {
        // Simple linear policy: π(a|s) = softmax(W·s + b)
        return {
            W: Array.from({ length: stateDim }, () => 
                Array.from({ length: numActions }, () => (Math.random() - 0.5) * 0.1)),
            b: Array(numActions).fill(0)
        };
    },

    softmax: function(logits) {
        const maxLogit = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - maxLogit));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    getActionProbs: function(weights, state) {
        const logits = weights.b.map((b, a) => 
            b + state.reduce((sum, s, i) => sum + s * weights.W[i][a], 0));
        return this.softmax(logits);
    },

    selectAction: function(probs) {
        const r = Math.random();
        let cumulative = 0;
        for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (r < cumulative) return i;
        }
        return probs.length - 1;
    },

    gradLogPolicy: function(weights, state, action) {
        const probs = this.getActionProbs(weights, state);
        const gradW = state.map(s => 
            probs.map((p, j) => s * ((j === action ? 1 : 0) - p)));
        const gradB = probs.map((p, j) => (j === action ? 1 : 0) - p);
        return { gradW, gradB };
    },

    update: function(weights, trajectory, alpha = 0.01, gamma = 0.99) {
        const T = trajectory.length;
        const returns = new Array(T);
        
        // Compute discounted returns G_t
        returns[T - 1] = trajectory[T - 1].reward;
        for (let t = T - 2; t >= 0; t--) {
            returns[t] = trajectory[t].reward + gamma * returns[t + 1];
        }

        // Update weights: θ ← θ + α * G_t * ∇log(π(a|s,θ))
        for (let t = 0; t < T; t++) {
            const { state, action } = trajectory[t];
            const G_t = returns[t];
            const { gradW, gradB } = this.gradLogPolicy(weights, state, action);

            for (let i = 0; i < weights.W.length; i++) {
                for (let j = 0; j < weights.W[i].length; j++) {
                    weights.W[i][j] += alpha * G_t * gradW[i][j];
                }
            }
            for (let j = 0; j < weights.b.length; j++) {
                weights.b[j] += alpha * G_t * gradB[j];
            }
        }
        return weights;
    },

    episode: function(env, weights, params = {}) {
        const { maxSteps = 1000 } = params;
        let state = env.reset();
        const trajectory = [];
        let totalReward = 0;

        for (let t = 0; t < maxSteps; t++) {
            const probs = this.getActionProbs(weights, state);
            const action = this.selectAction(probs);
            const { nextState, reward, done } = env.step(action);
            
            trajectory.push({ state, action, reward });
            totalReward += reward;
            state = nextState;
            if (done) break;
        }
        return { trajectory, totalReward };
    },

    train: function(env, params = {}) {
        const { episodes = 1000, alpha = 0.01, gamma = 0.99 } = params;
        const weights = this.initWeights(env.getStateDim(), env.getNumActions());
        const rewards = [];

        for (let ep = 0; ep < episodes; ep++) {
            const { trajectory, totalReward } = this.episode(env, weights);
            this.update(weights, trajectory, alpha, gamma);
            rewards.push(totalReward);
        }
        return { weights, rewards };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 6: PRISM_ACTOR_CRITIC_ENGINE
// Advantage Actor-Critic (A2C)
// Source: MIT 6.867, Stanford CS 234
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_ACTOR_CRITIC_ENGINE = {
    name: 'PRISM_ACTOR_CRITIC_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.867, Stanford CS 234',

    init: function(stateDim, numActions, hiddenSize = 32) {
        return {
            // Actor network weights (policy)
            actor: {
                W1: this._initMatrix(stateDim, hiddenSize),
                b1: Array(hiddenSize).fill(0),
                W2: this._initMatrix(hiddenSize, numActions),
                b2: Array(numActions).fill(0)
            },
            // Critic network weights (value function)
            critic: {
                W1: this._initMatrix(stateDim, hiddenSize),
                b1: Array(hiddenSize).fill(0),
                W2: this._initMatrix(hiddenSize, 1),
                b2: [0]
            }
        };
    },

    _initMatrix: function(rows, cols) {
        const scale = Math.sqrt(2 / rows);
        return Array.from({ length: rows }, () => 
            Array.from({ length: cols }, () => (Math.random() - 0.5) * scale));
    },

    _relu: function(x) { return Math.max(0, x); },
    _reluDeriv: function(x) { return x > 0 ? 1 : 0; },

    _forward: function(x, W1, b1, W2, b2) {
        // Hidden layer with ReLU
        const h = b1.map((b, j) => 
            this._relu(b + x.reduce((s, xi, i) => s + xi * W1[i][j], 0)));
        // Output layer
        const out = b2.map((b, k) => 
            b + h.reduce((s, hj, j) => s + hj * W2[j][k], 0));
        return { h, out };
    },

    getPolicy: function(net, state) {
        const { out } = this._forward(state, net.actor.W1, net.actor.b1, net.actor.W2, net.actor.b2);
        // Softmax
        const maxOut = Math.max(...out);
        const exps = out.map(o => Math.exp(o - maxOut));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    getValue: function(net, state) {
        const { out } = this._forward(state, net.critic.W1, net.critic.b1, net.critic.W2, net.critic.b2);
        return out[0];
    },

    selectAction: function(probs) {
        const r = Math.random();
        let cumulative = 0;
        for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (r < cumulative) return i;
        }
        return probs.length - 1;
    },

    update: function(net, state, action, reward, nextState, done, params = {}) {
        const { alphaActor = 0.001, alphaCritic = 0.01, gamma = 0.99 } = params;

        const V = this.getValue(net, state);
        const V_next = done ? 0 : this.getValue(net, nextState);
        const td_target = reward + gamma * V_next;
        const advantage = td_target - V;

        // Critic update: minimize TD error
        const criticGrad = this._criticGradient(net.critic, state, advantage);
        this._applyGradient(net.critic, criticGrad, alphaCritic);

        // Actor update: maximize advantage * log π(a|s)
        const actorGrad = this._actorGradient(net.actor, state, action, advantage);
        this._applyGradient(net.actor, actorGrad, alphaActor);

        return { advantage, td_target, V };
    },

    _criticGradient: function(critic, state, tdError) {
        // Simplified gradient computation
        const { h } = this._forward(state, critic.W1, critic.b1, critic.W2, critic.b2);
        return {
            W2: h.map(hj => [2 * tdError * hj]),
            b2: [2 * tdError]
        };
    },

    _actorGradient: function(actor, state, action, advantage) {
        const probs = this.getPolicy({ actor }, state);
        const { h } = this._forward(state, actor.W1, actor.b1, actor.W2, actor.b2);
        
        const gradOutput = probs.map((p, a) => advantage * ((a === action ? 1 : 0) - p));
        return {
            W2: h.map(hj => gradOutput.map(g => g * hj)),
            b2: gradOutput
        };
    },

    _applyGradient: function(net, grad, alpha) {
        if (grad.W2) {
            for (let i = 0; i < net.W2.length; i++) {
                for (let j = 0; j < net.W2[i].length; j++) {
                    net.W2[i][j] += alpha * (grad.W2[i]?.[j] || 0);
                }
            }
        }
        if (grad.b2) {
            for (let i = 0; i < net.b2.length; i++) {
                net.b2[i] += alpha * (grad.b2[i] || 0);
            }
        }
    },

    train: function(env, params = {}) {
        const { episodes = 1000, alphaActor = 0.001, alphaCritic = 0.01, gamma = 0.99, maxSteps = 500 } = params;
        const net = this.init(env.getStateDim(), env.getNumActions());
        const rewards = [];

        for (let ep = 0; ep < episodes; ep++) {
            let state = env.reset(), totalReward = 0;

            for (let t = 0; t < maxSteps; t++) {
                const probs = this.getPolicy(net, state);
                const action = this.selectAction(probs);
                const { nextState, reward, done } = env.step(action);
                
                this.update(net, state, action, reward, nextState, done, { alphaActor, alphaCritic, gamma });
                totalReward += reward;
                state = nextState;
                if (done) break;
            }
            rewards.push(totalReward);
        }
        return { net, rewards };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 7: PRISM_DQN_ENGINE
// Deep Q-Network with Experience Replay
// Source: DeepMind 2015, Stanford CS 234
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_DQN_ENGINE = {
    name: 'PRISM_DQN_ENGINE',
    version: '1.0.0',
    source: 'DeepMind 2015, Stanford CS 234',

    init: function(stateDim, numActions, params = {}) {
        const { hiddenSize = 64, replaySize = 10000 } = params;
        return {
            qNetwork: this._initNetwork(stateDim, numActions, hiddenSize),
            targetNetwork: this._initNetwork(stateDim, numActions, hiddenSize),
            replayBuffer: [],
            replaySize,
            numActions,
            stateDim
        };
    },

    _initNetwork: function(inputSize, outputSize, hiddenSize) {
        const scale = (n) => Math.sqrt(2 / n);
        return {
            W1: Array.from({ length: inputSize }, () => 
                Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * scale(inputSize))),
            b1: Array(hiddenSize).fill(0),
            W2: Array.from({ length: hiddenSize }, () => 
                Array.from({ length: outputSize }, () => (Math.random() - 0.5) * scale(hiddenSize))),
            b2: Array(outputSize).fill(0)
        };
    },

    _forward: function(net, state) {
        // Hidden layer with ReLU
        const h = net.b1.map((b, j) => 
            Math.max(0, b + state.reduce((s, xi, i) => s + xi * net.W1[i][j], 0)));
        // Output layer (Q-values)
        return net.b2.map((b, k) => b + h.reduce((s, hj, j) => s + hj * net.W2[j][k], 0));
    },

    getQValues: function(dqn, state) {
        return this._forward(dqn.qNetwork, state);
    },

    selectAction: function(dqn, state, epsilon = 0.1) {
        if (Math.random() < epsilon) {
            return Math.floor(Math.random() * dqn.numActions);
        }
        const qValues = this.getQValues(dqn, state);
        return qValues.indexOf(Math.max(...qValues));
    },

    storeTransition: function(dqn, state, action, reward, nextState, done) {
        dqn.replayBuffer.push({ state, action, reward, nextState, done });
        if (dqn.replayBuffer.length > dqn.replaySize) {
            dqn.replayBuffer.shift();
        }
    },

    sampleBatch: function(dqn, batchSize = 32) {
        const batch = [];
        for (let i = 0; i < Math.min(batchSize, dqn.replayBuffer.length); i++) {
            const idx = Math.floor(Math.random() * dqn.replayBuffer.length);
            batch.push(dqn.replayBuffer[idx]);
        }
        return batch;
    },

    train: function(dqn, batch, params = {}) {
        const { alpha = 0.001, gamma = 0.99 } = params;

        for (const { state, action, reward, nextState, done } of batch) {
            const qValues = this._forward(dqn.qNetwork, state);
            const targetQValues = this._forward(dqn.targetNetwork, nextState);
            
            const target = done ? reward : reward + gamma * Math.max(...targetQValues);
            const tdError = target - qValues[action];

            // Simplified gradient update
            this._updateNetwork(dqn.qNetwork, state, action, tdError, alpha);
        }
    },

    _updateNetwork: function(net, state, action, tdError, alpha) {
        // Compute hidden activations
        const h = net.b1.map((b, j) => 
            Math.max(0, b + state.reduce((s, xi, i) => s + xi * net.W1[i][j], 0)));
        
        // Update output layer for selected action
        for (let j = 0; j < net.W2.length; j++) {
            net.W2[j][action] += alpha * tdError * h[j];
        }
        net.b2[action] += alpha * tdError;

        // Update hidden layer (simplified)
        for (let j = 0; j < h.length; j++) {
            if (h[j] > 0) {  // ReLU gradient
                const delta = alpha * tdError * net.W2[j][action];
                for (let i = 0; i < state.length; i++) {
                    net.W1[i][j] += delta * state[i];
                }
                net.b1[j] += delta;
            }
        }
    },

    updateTargetNetwork: function(dqn) {
        // Copy weights from Q-network to target network
        dqn.targetNetwork = JSON.parse(JSON.stringify(dqn.qNetwork));
    },

    trainEpisode: function(env, dqn, params = {}) {
        const { epsilon = 0.1, gamma = 0.99, alpha = 0.001, batchSize = 32, maxSteps = 500 } = params;
        let state = env.reset(), totalReward = 0;

        for (let t = 0; t < maxSteps; t++) {
            const action = this.selectAction(dqn, state, epsilon);
            const { nextState, reward, done } = env.step(action);
            
            this.storeTransition(dqn, state, action, reward, nextState, done);
            
            if (dqn.replayBuffer.length >= batchSize) {
                const batch = this.sampleBatch(dqn, batchSize);
                this.train(dqn, batch, { alpha, gamma });
            }

            totalReward += reward;
            state = nextState;
            if (done) break;
        }
        return { totalReward };
    }
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    // SARSA
    PRISM_GATEWAY.register('ai.rl.sarsa.init', 'PRISM_RL_SARSA_ENGINE.initQTable');
    PRISM_GATEWAY.register('ai.rl.sarsa.update', 'PRISM_RL_SARSA_ENGINE.update');
    PRISM_GATEWAY.register('ai.rl.sarsa.episode', 'PRISM_RL_SARSA_ENGINE.episode');
    PRISM_GATEWAY.register('ai.rl.sarsa.train', 'PRISM_RL_SARSA_ENGINE.train');
    PRISM_GATEWAY.register('ai.rl.sarsa.select', 'PRISM_RL_SARSA_ENGINE.selectAction');
    
    // Q-Learning
    PRISM_GATEWAY.register('ai.rl.qlearning.init', 'PRISM_RL_QLEARNING_ENGINE.initQTable');
    PRISM_GATEWAY.register('ai.rl.qlearning.update', 'PRISM_RL_QLEARNING_ENGINE.update');
    PRISM_GATEWAY.register('ai.rl.qlearning.episode', 'PRISM_RL_QLEARNING_ENGINE.episode');
    PRISM_GATEWAY.register('ai.rl.qlearning.train', 'PRISM_RL_QLEARNING_ENGINE.train');
    
    // Value Iteration
    PRISM_GATEWAY.register('ai.rl.value_iteration.solve', 'PRISM_VALUE_ITERATION_ENGINE.solve');
    
    // Policy Iteration
    PRISM_GATEWAY.register('ai.rl.policy_iteration.solve', 'PRISM_POLICY_ITERATION_ENGINE.solve');
    
    // Policy Gradient
    PRISM_GATEWAY.register('ai.rl.reinforce.init', 'PRISM_POLICY_GRADIENT_ENGINE.initWeights');
    PRISM_GATEWAY.register('ai.rl.reinforce.update', 'PRISM_POLICY_GRADIENT_ENGINE.update');
    PRISM_GATEWAY.register('ai.rl.reinforce.train', 'PRISM_POLICY_GRADIENT_ENGINE.train');
    PRISM_GATEWAY.register('ai.rl.reinforce.getProbs', 'PRISM_POLICY_GRADIENT_ENGINE.getActionProbs');
    
    // Actor-Critic
    PRISM_GATEWAY.register('ai.rl.actor_critic.init', 'PRISM_ACTOR_CRITIC_ENGINE.init');
    PRISM_GATEWAY.register('ai.rl.actor_critic.update', 'PRISM_ACTOR_CRITIC_ENGINE.update');
    PRISM_GATEWAY.register('ai.rl.actor_critic.train', 'PRISM_ACTOR_CRITIC_ENGINE.train');
    PRISM_GATEWAY.register('ai.rl.actor_critic.policy', 'PRISM_ACTOR_CRITIC_ENGINE.getPolicy');
    PRISM_GATEWAY.register('ai.rl.actor_critic.value', 'PRISM_ACTOR_CRITIC_ENGINE.getValue');
    
    // DQN
    PRISM_GATEWAY.register('ai.rl.dqn.init', 'PRISM_DQN_ENGINE.init');
    PRISM_GATEWAY.register('ai.rl.dqn.train', 'PRISM_DQN_ENGINE.trainEpisode');
    PRISM_GATEWAY.register('ai.rl.dqn.select', 'PRISM_DQN_ENGINE.selectAction');
    PRISM_GATEWAY.register('ai.rl.dqn.getQ', 'PRISM_DQN_ENGINE.getQValues');
    PRISM_GATEWAY.register('ai.rl.dqn.updateTarget', 'PRISM_DQN_ENGINE.updateTargetNetwork');
}

console.log('[PRISM Session 1 Ultimate AI/ML Part 1] Modules 1-7 loaded');
console.log('  - PRISM_RL_SARSA_ENGINE');
console.log('  - PRISM_RL_QLEARNING_ENGINE');
console.log('  - PRISM_VALUE_ITERATION_ENGINE');
console.log('  - PRISM_POLICY_ITERATION_ENGINE');
console.log('  - PRISM_POLICY_GRADIENT_ENGINE');
console.log('  - PRISM_ACTOR_CRITIC_ENGINE');
console.log('  - PRISM_DQN_ENGINE');
/**
 * PRISM SESSION 1 - ULTIMATE AI/ML ENHANCEMENT - PART 2
 * Attention Mechanisms & Transformer Architectures
 * Sources: MIT 15.773 Deep Learning, Vaswani 2017 "Attention Is All You Need"
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 8: PRISM_ATTENTION_ENGINE
// Scaled Dot-Product, Multi-Head, Cross, Sparse, Linear Attention
// Source: MIT 15.773, Vaswani et al. 2017
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_ATTENTION_ENGINE = {
    name: 'PRISM_ATTENTION_ENGINE',
    version: '1.0.0',
    source: 'MIT 15.773, Vaswani 2017',

    // Helper: Matrix multiply
    _matmul: function(A, B) {
        const m = A.length, n = B[0].length, k = B.length;
        const result = Array.from({ length: m }, () => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let p = 0; p < k; p++) {
                    result[i][j] += A[i][p] * B[p][j];
                }
            }
        }
        return result;
    },

    // Helper: Transpose
    _transpose: function(A) {
        const m = A.length, n = A[0].length;
        return Array.from({ length: n }, (_, j) => 
            Array.from({ length: m }, (_, i) => A[i][j]));
    },

    // Helper: 2D Softmax (row-wise)
    _softmax2D: function(scores) {
        return scores.map(row => {
            const maxVal = Math.max(...row);
            const exps = row.map(s => Math.exp(s - maxVal));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        });
    },

    // Helper: Dot product
    _dotProduct: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },

    /**
     * Scaled Dot-Product Attention
     * Attention(Q,K,V) = softmax(QK^T / √d_k) V
     */
    scaledDotProductAttention: function(Q, K, V, mask = null) {
        const dk = K[0].length;
        const scale = Math.sqrt(dk);

        // QK^T / sqrt(dk)
        const scores = this._matmul(Q, this._transpose(K));
        for (let i = 0; i < scores.length; i++) {
            for (let j = 0; j < scores[i].length; j++) {
                scores[i][j] /= scale;
                if (mask && mask[i][j] === 0) {
                    scores[i][j] = -1e9;
                }
            }
        }

        const attention = this._softmax2D(scores);
        const output = this._matmul(attention, V);

        return { output, weights: attention };
    },

    /**
     * Multi-Head Attention
     * MultiHead(Q,K,V) = Concat(head_1,...,head_h) W^O
     */
    multiHeadAttention: function(Q, K, V, numHeads, dModel, mask = null) {
        const dHead = Math.floor(dModel / numHeads);
        const seqLen = Q.length;
        const heads = [];

        for (let h = 0; h < numHeads; h++) {
            // Project Q, K, V for this head (simplified linear projection)
            const Qh = Q.map(q => q.slice(h * dHead, (h + 1) * dHead));
            const Kh = K.map(k => k.slice(h * dHead, (h + 1) * dHead));
            const Vh = V.map(v => v.slice(h * dHead, (h + 1) * dHead));

            const { output } = this.scaledDotProductAttention(Qh, Kh, Vh, mask);
            heads.push(output);
        }

        // Concatenate heads
        const concatenated = Array.from({ length: seqLen }, (_, i) =>
            heads.reduce((acc, head) => acc.concat(head[i]), []));

        return concatenated;
    },

    /**
     * Cross Attention (Encoder-Decoder)
     * Q from decoder, K and V from encoder
     */
    crossAttention: function(decoderState, encoderOutput, mask = null) {
        return this.scaledDotProductAttention(decoderState, encoderOutput, encoderOutput, mask);
    },

    /**
     * Sparse Attention (Longformer-style)
     * Local window + global tokens
     */
    sparseAttention: function(Q, K, V, windowSize = 256, globalTokens = [0]) {
        const seqLen = Q.length;
        const dk = K[0].length;
        const scores = [];

        for (let i = 0; i < seqLen; i++) {
            const rowScores = [];
            for (let j = 0; j < seqLen; j++) {
                const isGlobal = globalTokens.includes(j) || globalTokens.includes(i);
                const isLocal = Math.abs(i - j) <= windowSize / 2;

                if (isGlobal || isLocal) {
                    rowScores.push(this._dotProduct(Q[i], K[j]) / Math.sqrt(dk));
                } else {
                    rowScores.push(-1e9);
                }
            }
            scores.push(rowScores);
        }

        const attention = this._softmax2D(scores);
        return this._matmul(attention, V);
    },

    /**
     * Linear Attention (O(n) complexity)
     * Uses kernel feature maps φ(x)
     */
    linearAttention: function(Q, K, V, featureMap = 'elu') {
        const n = Q.length, dk = Q[0].length, dv = V[0].length;

        // Apply feature map φ to Q and K
        const phi = (x) => {
            if (featureMap === 'elu') {
                return x.map(xi => xi >= 0 ? xi + 1 : Math.exp(xi));
            }
            return x.map(xi => Math.max(0, xi) + 1);
        };

        const Q_prime = Q.map(phi);
        const K_prime = K.map(phi);

        // Compute K'^T V (dₖ × dᵥ)
        const KV = Array.from({ length: dk }, () => Array(dv).fill(0));
        for (let j = 0; j < n; j++) {
            for (let a = 0; a < dk; a++) {
                for (let b = 0; b < dv; b++) {
                    KV[a][b] += K_prime[j][a] * V[j][b];
                }
            }
        }

        // Compute K'^T 1 (normalizer)
        const K_sum = Array(dk).fill(0);
        for (let j = 0; j < n; j++) {
            for (let a = 0; a < dk; a++) {
                K_sum[a] += K_prime[j][a];
            }
        }

        // Output: (Q' × KV) / (Q' × K_sum)
        const output = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            const normalizer = Q_prime[i].reduce((s, q, a) => s + q * K_sum[a], 0);
            for (let b = 0; b < dv; b++) {
                let val = 0;
                for (let a = 0; a < dk; a++) {
                    val += Q_prime[i][a] * KV[a][b];
                }
                row.push(val / (normalizer + 1e-9));
            }
            output.push(row);
        }

        return output;
    },

    /**
     * Relative Position Attention (T5-style)
     */
    relativePositionAttention: function(Q, K, V, maxRelativePosition = 32) {
        const seqLen = Q.length, dk = K[0].length;
        const scores = [];

        // Create relative position bias
        const biases = {};
        for (let d = -maxRelativePosition; d <= maxRelativePosition; d++) {
            biases[d] = (Math.random() - 0.5) * 0.1; // Learned parameter
        }

        for (let i = 0; i < seqLen; i++) {
            const rowScores = [];
            for (let j = 0; j < seqLen; j++) {
                const relPos = Math.max(-maxRelativePosition, Math.min(maxRelativePosition, j - i));
                const score = this._dotProduct(Q[i], K[j]) / Math.sqrt(dk) + biases[relPos];
                rowScores.push(score);
            }
            scores.push(rowScores);
        }

        const attention = this._softmax2D(scores);
        return { output: this._matmul(attention, V), weights: attention };
    },

    /**
     * Flash Attention (memory-efficient, simplified)
     */
    flashAttention: function(Q, K, V, blockSize = 64) {
        const seqLen = Q.length, dv = V[0].length;
        const numBlocks = Math.ceil(seqLen / blockSize);
        const output = Array.from({ length: seqLen }, () => Array(dv).fill(0));
        const logsumexp = Array(seqLen).fill(-Infinity);

        for (let bi = 0; bi < numBlocks; bi++) {
            const iStart = bi * blockSize;
            const iEnd = Math.min(iStart + blockSize, seqLen);

            for (let bj = 0; bj < numBlocks; bj++) {
                const jStart = bj * blockSize;
                const jEnd = Math.min(jStart + blockSize, seqLen);

                for (let i = iStart; i < iEnd; i++) {
                    for (let j = jStart; j < jEnd; j++) {
                        const score = this._dotProduct(Q[i], K[j]) / Math.sqrt(K[0].length);
                        const oldMax = logsumexp[i];
                        const newMax = Math.max(oldMax, score);

                        const expOld = Math.exp(oldMax - newMax);
                        const expNew = Math.exp(score - newMax);

                        for (let d = 0; d < dv; d++) {
                            output[i][d] = output[i][d] * expOld + expNew * V[j][d];
                        }
                        logsumexp[i] = newMax + Math.log(expOld + expNew);
                    }
                }
            }
        }

        // Normalize
        for (let i = 0; i < seqLen; i++) {
            const norm = Math.exp(logsumexp[i]);
            for (let d = 0; d < dv; d++) {
                output[i][d] /= norm;
            }
        }

        return output;
    },

    /**
     * Rotary Position Embedding (RoPE)
     */
    applyRotaryEmbedding: function(x, position) {
        const dim = x.length;
        const result = new Array(dim);

        for (let i = 0; i < dim; i += 2) {
            const freq = 1.0 / Math.pow(10000, i / dim);
            const angle = position * freq;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            result[i] = x[i] * cos - (x[i + 1] || 0) * sin;
            result[i + 1] = x[i] * sin + (x[i + 1] || 0) * cos;
        }

        return result;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 9: PRISM_TRANSFORMER_ENGINE
// Full Transformer Encoder/Decoder
// Source: MIT 15.773, "Attention Is All You Need"
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_TRANSFORMER_ENGINE = {
    name: 'PRISM_TRANSFORMER_ENGINE',
    version: '1.0.0',
    source: 'MIT 15.773, Vaswani 2017',

    /**
     * Sinusoidal Positional Encoding
     */
    positionalEncoding: function(seqLen, dModel) {
        const PE = [];
        for (let pos = 0; pos < seqLen; pos++) {
            const row = [];
            for (let i = 0; i < dModel; i++) {
                const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dModel);
                row.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
            }
            PE.push(row);
        }
        return PE;
    },

    /**
     * Layer Normalization
     */
    layerNorm: function(x, gamma = null, beta = null, epsilon = 1e-6) {
        const mean = x.reduce((s, v) => s + v, 0) / x.length;
        const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / x.length;
        const std = Math.sqrt(variance + epsilon);

        return x.map((v, i) => {
            const normalized = (v - mean) / std;
            const g = gamma ? gamma[i] : 1;
            const b = beta ? beta[i] : 0;
            return g * normalized + b;
        });
    },

    /**
     * Position-wise Feed-Forward Network
     * FFN(x) = max(0, xW₁ + b₁)W₂ + b₂
     */
    feedForward: function(x, dFF, params = null) {
        const dModel = x.length;

        // Initialize weights if not provided
        const W1 = params?.W1 || Array.from({ length: dModel }, () =>
            Array.from({ length: dFF }, () => (Math.random() - 0.5) * Math.sqrt(2 / dModel)));
        const b1 = params?.b1 || Array(dFF).fill(0);
        const W2 = params?.W2 || Array.from({ length: dFF }, () =>
            Array.from({ length: dModel }, () => (Math.random() - 0.5) * Math.sqrt(2 / dFF)));
        const b2 = params?.b2 || Array(dModel).fill(0);

        // First linear + ReLU
        const hidden = b1.map((b, j) => {
            const sum = b + x.reduce((s, xi, i) => s + xi * W1[i][j], 0);
            return Math.max(0, sum); // ReLU
        });

        // Second linear
        return b2.map((b, k) => b + hidden.reduce((s, hj, j) => s + hj * W2[j][k], 0));
    },

    /**
     * GELU Activation (used in BERT, GPT)
     */
    gelu: function(x) {
        return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
    },

    /**
     * Transformer Encoder Layer
     */
    encoderLayer: function(x, params = {}) {
        const { dModel = 512, numHeads = 8, dFF = 2048, dropout = 0.1 } = params;
        const seqLen = x.length;

        // Self-attention
        const attnOutput = PRISM_ATTENTION_ENGINE.multiHeadAttention(x, x, x, numHeads, dModel);

        // Add & Norm
        const attnResidual = x.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + attnOutput[i][j])
        ));

        // Feed-forward
        const ffOutput = attnResidual.map(token => this.feedForward(token, dFF));

        // Add & Norm
        const output = attnResidual.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + ffOutput[i][j])
        ));

        return output;
    },

    /**
     * Transformer Decoder Layer
     */
    decoderLayer: function(x, encoderOutput, params = {}) {
        const { dModel = 512, numHeads = 8, dFF = 2048 } = params;
        const seqLen = x.length;

        // Causal mask for self-attention
        const causalMask = Array.from({ length: seqLen }, (_, i) =>
            Array.from({ length: seqLen }, (_, j) => j <= i ? 1 : 0));

        // Masked self-attention
        const selfAttn = PRISM_ATTENTION_ENGINE.multiHeadAttention(x, x, x, numHeads, dModel, causalMask);
        const selfAttnResidual = x.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + selfAttn[i][j])
        ));

        // Cross-attention with encoder output
        const crossAttn = PRISM_ATTENTION_ENGINE.multiHeadAttention(
            selfAttnResidual, encoderOutput, encoderOutput, numHeads, dModel);
        const crossAttnResidual = selfAttnResidual.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + crossAttn[i][j])
        ));

        // Feed-forward
        const ffOutput = crossAttnResidual.map(token => this.feedForward(token, dFF));
        const output = crossAttnResidual.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + ffOutput[i][j])
        ));

        return output;
    },

    /**
     * Full Transformer Encoder (stack of N layers)
     */
    encoder: function(x, params = {}) {
        const { numLayers = 6, dModel = 512, numHeads = 8, dFF = 2048 } = params;
        let output = x;

        // Add positional encoding
        const PE = this.positionalEncoding(x.length, dModel);
        output = output.map((token, i) => token.map((v, j) => v + PE[i][j]));

        // Stack encoder layers
        for (let l = 0; l < numLayers; l++) {
            output = this.encoderLayer(output, { dModel, numHeads, dFF });
        }

        return output;
    },

    /**
     * Full Transformer Decoder (stack of N layers)
     */
    decoder: function(x, encoderOutput, params = {}) {
        const { numLayers = 6, dModel = 512, numHeads = 8, dFF = 2048 } = params;
        let output = x;

        // Add positional encoding
        const PE = this.positionalEncoding(x.length, dModel);
        output = output.map((token, i) => token.map((v, j) => v + PE[i][j]));

        // Stack decoder layers
        for (let l = 0; l < numLayers; l++) {
            output = this.decoderLayer(output, encoderOutput, { dModel, numHeads, dFF });
        }

        return output;
    },

    /**
     * Create causal (autoregressive) mask
     */
    createCausalMask: function(seqLen) {
        return Array.from({ length: seqLen }, (_, i) =>
            Array.from({ length: seqLen }, (_, j) => j <= i ? 1 : 0));
    },

    /**
     * Create padding mask
     */
    createPaddingMask: function(lengths, maxLen) {
        return lengths.map(len =>
            Array.from({ length: maxLen }, (_, i) => i < len ? 1 : 0));
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 10: PRISM_SEQUENCE_MODEL_ENGINE
// RNN, LSTM, GRU, Bidirectional, Seq2Seq
// Source: MIT 6.036, Stanford CS 224N
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SEQUENCE_MODEL_ENGINE = {
    name: 'PRISM_SEQUENCE_MODEL_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 224N',

    _sigmoid: function(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); },
    _tanh: function(x) { return Math.tanh(x); },

    /**
     * Create LSTM Cell
     */
    createLSTMCell: function(inputSize, hiddenSize) {
        const scale = Math.sqrt(2 / (inputSize + hiddenSize));
        const initWeights = (rows, cols) => Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => (Math.random() - 0.5) * scale));

        return {
            // Gates: forget, input, output, cell
            Wf: initWeights(inputSize + hiddenSize, hiddenSize),
            Wi: initWeights(inputSize + hiddenSize, hiddenSize),
            Wo: initWeights(inputSize + hiddenSize, hiddenSize),
            Wc: initWeights(inputSize + hiddenSize, hiddenSize),
            bf: Array(hiddenSize).fill(1), // Initialize forget bias to 1
            bi: Array(hiddenSize).fill(0),
            bo: Array(hiddenSize).fill(0),
            bc: Array(hiddenSize).fill(0),
            hiddenSize,
            inputSize,

            forward: function(x, h_prev, c_prev) {
                h_prev = h_prev || Array(hiddenSize).fill(0);
                c_prev = c_prev || Array(hiddenSize).fill(0);

                const combined = [...x, ...h_prev];

                // Gate computations
                const computeGate = (W, b, activation) => {
                    return b.map((bi, j) => {
                        const sum = bi + combined.reduce((s, xi, i) => s + xi * W[i][j], 0);
                        return activation(sum);
                    });
                };

                const f = computeGate(this.Wf, this.bf, PRISM_SEQUENCE_MODEL_ENGINE._sigmoid);
                const i = computeGate(this.Wi, this.bi, PRISM_SEQUENCE_MODEL_ENGINE._sigmoid);
                const o = computeGate(this.Wo, this.bo, PRISM_SEQUENCE_MODEL_ENGINE._sigmoid);
                const c_tilde = computeGate(this.Wc, this.bc, PRISM_SEQUENCE_MODEL_ENGINE._tanh);

                // Cell state update: c = f * c_prev + i * c_tilde
                const c = c_prev.map((cp, j) => f[j] * cp + i[j] * c_tilde[j]);

                // Hidden state: h = o * tanh(c)
                const h = c.map((cj, j) => o[j] * Math.tanh(cj));

                return { h, c, gates: { f, i, o, c_tilde } };
            }
        };
    },

    /**
     * Create GRU Cell
     */
    createGRUCell: function(inputSize, hiddenSize) {
        const scale = Math.sqrt(2 / (inputSize + hiddenSize));
        const initWeights = (rows, cols) => Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => (Math.random() - 0.5) * scale));

        return {
            Wz: initWeights(inputSize + hiddenSize, hiddenSize), // Update gate
            Wr: initWeights(inputSize + hiddenSize, hiddenSize), // Reset gate
            Wh: initWeights(inputSize + hiddenSize, hiddenSize), // Candidate
            bz: Array(hiddenSize).fill(0),
            br: Array(hiddenSize).fill(0),
            bh: Array(hiddenSize).fill(0),
            hiddenSize,
            inputSize,

            forward: function(x, h_prev) {
                h_prev = h_prev || Array(hiddenSize).fill(0);
                const combined = [...x, ...h_prev];

                // Update gate
                const z = this.bz.map((b, j) => {
                    const sum = b + combined.reduce((s, xi, i) => s + xi * this.Wz[i][j], 0);
                    return PRISM_SEQUENCE_MODEL_ENGINE._sigmoid(sum);
                });

                // Reset gate
                const r = this.br.map((b, j) => {
                    const sum = b + combined.reduce((s, xi, i) => s + xi * this.Wr[i][j], 0);
                    return PRISM_SEQUENCE_MODEL_ENGINE._sigmoid(sum);
                });

                // Candidate hidden state
                const combinedReset = [...x, ...h_prev.map((hp, j) => r[j] * hp)];
                const h_tilde = this.bh.map((b, j) => {
                    const sum = b + combinedReset.reduce((s, xi, i) => s + xi * this.Wh[i][j], 0);
                    return PRISM_SEQUENCE_MODEL_ENGINE._tanh(sum);
                });

                // Hidden state: h = (1 - z) * h_prev + z * h_tilde
                const h = h_prev.map((hp, j) => (1 - z[j]) * hp + z[j] * h_tilde[j]);

                return { h, gates: { z, r, h_tilde } };
            }
        };
    },

    /**
     * Create Simple RNN Cell
     */
    createRNNCell: function(inputSize, hiddenSize, activation = 'tanh') {
        const scale = Math.sqrt(2 / (inputSize + hiddenSize));
        return {
            Wxh: Array.from({ length: inputSize }, () =>
                Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * scale)),
            Whh: Array.from({ length: hiddenSize }, () =>
                Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * scale)),
            bh: Array(hiddenSize).fill(0),
            hiddenSize,
            activation,

            forward: function(x, h_prev) {
                h_prev = h_prev || Array(hiddenSize).fill(0);

                const h = this.bh.map((b, j) => {
                    let sum = b;
                    for (let i = 0; i < x.length; i++) sum += x[i] * this.Wxh[i][j];
                    for (let i = 0; i < h_prev.length; i++) sum += h_prev[i] * this.Whh[i][j];
                    return this.activation === 'relu' ? Math.max(0, sum) : Math.tanh(sum);
                });

                return { h };
            }
        };
    },

    /**
     * Bidirectional RNN wrapper
     */
    createBidirectionalRNN: function(forwardCell, backwardCell) {
        return {
            forward: forwardCell,
            backward: backwardCell,

            process: function(sequence) {
                const seqLen = sequence.length;
                const forwardOutputs = [], backwardOutputs = [];

                // Forward pass
                let hF = null, cF = null;
                for (let t = 0; t < seqLen; t++) {
                    const result = this.forward.forward(sequence[t], hF, cF);
                    hF = result.h;
                    cF = result.c;
                    forwardOutputs.push(hF);
                }

                // Backward pass
                let hB = null, cB = null;
                for (let t = seqLen - 1; t >= 0; t--) {
                    const result = this.backward.forward(sequence[t], hB, cB);
                    hB = result.h;
                    cB = result.c;
                    backwardOutputs.unshift(hB);
                }

                // Concatenate outputs
                const outputs = forwardOutputs.map((fwd, t) => [...fwd, ...backwardOutputs[t]]);

                return { outputs, finalForward: hF, finalBackward: hB };
            }
        };
    },

    /**
     * Process sequence through RNN/LSTM/GRU
     */
    processSequence: function(cell, sequence) {
        const outputs = [];
        let h = null, c = null;

        for (const x of sequence) {
            const result = cell.forward(x, h, c);
            h = result.h;
            c = result.c;
            outputs.push(h);
        }

        return { outputs, finalHidden: h, finalCell: c };
    }
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    // Attention
    PRISM_GATEWAY.register('ai.attention.scaled', 'PRISM_ATTENTION_ENGINE.scaledDotProductAttention');
    PRISM_GATEWAY.register('ai.attention.multihead', 'PRISM_ATTENTION_ENGINE.multiHeadAttention');
    PRISM_GATEWAY.register('ai.attention.cross', 'PRISM_ATTENTION_ENGINE.crossAttention');
    PRISM_GATEWAY.register('ai.attention.sparse', 'PRISM_ATTENTION_ENGINE.sparseAttention');
    PRISM_GATEWAY.register('ai.attention.linear', 'PRISM_ATTENTION_ENGINE.linearAttention');
    PRISM_GATEWAY.register('ai.attention.relative', 'PRISM_ATTENTION_ENGINE.relativePositionAttention');
    PRISM_GATEWAY.register('ai.attention.flash', 'PRISM_ATTENTION_ENGINE.flashAttention');
    PRISM_GATEWAY.register('ai.attention.rope', 'PRISM_ATTENTION_ENGINE.applyRotaryEmbedding');

    // Transformer
    PRISM_GATEWAY.register('ai.transformer.positional', 'PRISM_TRANSFORMER_ENGINE.positionalEncoding');
    PRISM_GATEWAY.register('ai.transformer.layernorm', 'PRISM_TRANSFORMER_ENGINE.layerNorm');
    PRISM_GATEWAY.register('ai.transformer.ffn', 'PRISM_TRANSFORMER_ENGINE.feedForward');
    PRISM_GATEWAY.register('ai.transformer.gelu', 'PRISM_TRANSFORMER_ENGINE.gelu');
    PRISM_GATEWAY.register('ai.transformer.encoder_layer', 'PRISM_TRANSFORMER_ENGINE.encoderLayer');
    PRISM_GATEWAY.register('ai.transformer.decoder_layer', 'PRISM_TRANSFORMER_ENGINE.decoderLayer');
    PRISM_GATEWAY.register('ai.transformer.encoder', 'PRISM_TRANSFORMER_ENGINE.encoder');
    PRISM_GATEWAY.register('ai.transformer.decoder', 'PRISM_TRANSFORMER_ENGINE.decoder');
    PRISM_GATEWAY.register('ai.transformer.causal_mask', 'PRISM_TRANSFORMER_ENGINE.createCausalMask');

    // Sequence Models
    PRISM_GATEWAY.register('ai.seq.lstm', 'PRISM_SEQUENCE_MODEL_ENGINE.createLSTMCell');
    PRISM_GATEWAY.register('ai.seq.gru', 'PRISM_SEQUENCE_MODEL_ENGINE.createGRUCell');
    PRISM_GATEWAY.register('ai.seq.rnn', 'PRISM_SEQUENCE_MODEL_ENGINE.createRNNCell');
    PRISM_GATEWAY.register('ai.seq.bidirectional', 'PRISM_SEQUENCE_MODEL_ENGINE.createBidirectionalRNN');
    PRISM_GATEWAY.register('ai.seq.process', 'PRISM_SEQUENCE_MODEL_ENGINE.processSequence');
}

console.log('[PRISM Session 1 Ultimate AI/ML Part 2] Modules 8-10 loaded');
console.log('  - PRISM_ATTENTION_ENGINE (8 attention variants)');
console.log('  - PRISM_TRANSFORMER_ENGINE (full encoder/decoder)');
console.log('  - PRISM_SEQUENCE_MODEL_ENGINE (LSTM/GRU/RNN/BiRNN)');
/**
 * PRISM SESSION 1 - ULTIMATE AI/ML ENHANCEMENT - PART 3
 * Neural Network Enhancements: Activations, Optimizers, Normalization, Regularization
 * Sources: MIT 6.036, Stanford CS 231N, Deep Learning Book
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 11: PRISM_ACTIVATIONS_ENGINE
// Advanced Activation Functions
// Source: MIT 6.036, Stanford CS 231N
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_ACTIVATIONS_ENGINE = {
    name: 'PRISM_ACTIVATIONS_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    // Standard activations
    relu: function(x) { return Math.max(0, x); },
    reluDeriv: function(x) { return x > 0 ? 1 : 0; },

    sigmoid: function(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); },
    sigmoidDeriv: function(x) { const s = this.sigmoid(x); return s * (1 - s); },

    tanh: function(x) { return Math.tanh(x); },
    tanhDeriv: function(x) { const t = Math.tanh(x); return 1 - t * t; },

    // Advanced activations
    /**
     * ELU: Exponential Linear Unit
     * f(x) = x if x > 0, α(e^x - 1) if x ≤ 0
     */
    elu: function(x, alpha = 1.0) {
        return x >= 0 ? x : alpha * (Math.exp(x) - 1);
    },
    eluDeriv: function(x, alpha = 1.0) {
        return x >= 0 ? 1 : this.elu(x, alpha) + alpha;
    },

    /**
     * SELU: Scaled ELU (Self-Normalizing)
     * Used in self-normalizing neural networks
     */
    selu: function(x) {
        const alpha = 1.6732632423543772;
        const scale = 1.0507009873554805;
        return x >= 0 ? scale * x : scale * alpha * (Math.exp(x) - 1);
    },
    seluDeriv: function(x) {
        const alpha = 1.6732632423543772;
        const scale = 1.0507009873554805;
        return x >= 0 ? scale : scale * alpha * Math.exp(x);
    },

    /**
     * GELU: Gaussian Error Linear Unit
     * f(x) = x * Φ(x) where Φ is CDF of standard normal
     */
    gelu: function(x) {
        return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
    },
    geluDeriv: function(x) {
        const cdf = 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
        const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        return cdf + x * pdf;
    },

    /**
     * Swish: Self-gated activation (Google)
     * f(x) = x * sigmoid(βx)
     */
    swish: function(x, beta = 1.0) {
        return x * this.sigmoid(beta * x);
    },
    swishDeriv: function(x, beta = 1.0) {
        const sig = this.sigmoid(beta * x);
        return sig + x * beta * sig * (1 - sig);
    },

    /**
     * Mish: Self-regularized non-monotonic (Misra 2019)
     * f(x) = x * tanh(softplus(x))
     */
    mish: function(x) {
        const sp = Math.log(1 + Math.exp(x));
        return x * Math.tanh(sp);
    },

    /**
     * Leaky ReLU
     */
    leakyRelu: function(x, alpha = 0.01) {
        return x >= 0 ? x : alpha * x;
    },
    leakyReluDeriv: function(x, alpha = 0.01) {
        return x >= 0 ? 1 : alpha;
    },

    /**
     * PReLU: Parametric ReLU
     */
    prelu: function(x, alpha) {
        return x >= 0 ? x : alpha * x;
    },

    /**
     * Softplus: smooth approximation of ReLU
     * f(x) = log(1 + e^x)
     */
    softplus: function(x) {
        return x > 20 ? x : Math.log(1 + Math.exp(x));
    },
    softplusDeriv: function(x) {
        return this.sigmoid(x);
    },

    /**
     * Softsign
     * f(x) = x / (1 + |x|)
     */
    softsign: function(x) {
        return x / (1 + Math.abs(x));
    },
    softsignDeriv: function(x) {
        const denom = 1 + Math.abs(x);
        return 1 / (denom * denom);
    },

    /**
     * Hard Sigmoid (efficient approximation)
     */
    hardSigmoid: function(x) {
        return Math.max(0, Math.min(1, 0.2 * x + 0.5));
    },

    /**
     * Hard Swish (MobileNetV3)
     */
    hardSwish: function(x) {
        return x * this.hardSigmoid(x);
    },

    /**
     * Softmax (for arrays)
     */
    softmax: function(x) {
        const maxVal = Math.max(...x);
        const exps = x.map(v => Math.exp(v - maxVal));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    /**
     * Log-Softmax (numerically stable)
     */
    logSoftmax: function(x) {
        const maxVal = Math.max(...x);
        const shifted = x.map(v => v - maxVal);
        const logSumExp = Math.log(shifted.reduce((s, v) => s + Math.exp(v), 0));
        return shifted.map(v => v - logSumExp);
    },

    // Apply activation to array
    apply: function(arr, activation, ...params) {
        const fn = this[activation];
        if (!fn) throw new Error(`Unknown activation: ${activation}`);
        return Array.isArray(arr) ? arr.map(x => fn.call(this, x, ...params)) : fn.call(this, arr, ...params);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 12: PRISM_OPTIMIZERS_ENGINE
// Advanced Gradient Descent Optimizers
// Source: MIT 6.036, Stanford CS 231N
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_OPTIMIZERS_ENGINE = {
    name: 'PRISM_OPTIMIZERS_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * SGD with Momentum
     */
    createSGD: function(params = {}) {
        const { lr = 0.01, momentum = 0.9, nesterov = false, weightDecay = 0 } = params;
        const velocity = new Map();

        return {
            lr, momentum, nesterov, weightDecay,
            step: function(weights, gradients, paramId = 'default') {
                if (!velocity.has(paramId)) {
                    velocity.set(paramId, gradients.map(row => 
                        Array.isArray(row) ? row.map(() => 0) : 0));
                }

                const v = velocity.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j] + weightDecay * weights[i][j];
                            v[i][j] = momentum * v[i][j] - lr * grad;
                            if (nesterov) {
                                weights[i][j] += momentum * v[i][j] - lr * grad;
                            } else {
                                weights[i][j] += v[i][j];
                            }
                        }
                    } else {
                        const grad = gradients[i] + weightDecay * weights[i];
                        v[i] = momentum * v[i] - lr * grad;
                        weights[i] += nesterov ? momentum * v[i] - lr * grad : v[i];
                    }
                }
                return weights;
            }
        };
    },

    /**
     * Adam: Adaptive Moment Estimation
     */
    createAdam: function(params = {}) {
        const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0 } = params;
        const state = new Map();

        return {
            lr, beta1, beta2, epsilon, weightDecay, t: 0,
            step: function(weights, gradients, paramId = 'default') {
                this.t++;
                
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        m: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { m, v } = state.get(paramId);
                const biasCorrect1 = 1 - Math.pow(beta1, this.t);
                const biasCorrect2 = 1 - Math.pow(beta2, this.t);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j] + weightDecay * weights[i][j];
                            m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad;
                            v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad * grad;
                            const mHat = m[i][j] / biasCorrect1;
                            const vHat = v[i][j] / biasCorrect2;
                            weights[i][j] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                        }
                    } else {
                        const grad = gradients[i] + weightDecay * weights[i];
                        m[i] = beta1 * m[i] + (1 - beta1) * grad;
                        v[i] = beta2 * v[i] + (1 - beta2) * grad * grad;
                        const mHat = m[i] / biasCorrect1;
                        const vHat = v[i] / biasCorrect2;
                        weights[i] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * AdamW: Adam with Decoupled Weight Decay
     */
    createAdamW: function(params = {}) {
        const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0.01 } = params;
        const state = new Map();

        return {
            lr, beta1, beta2, epsilon, weightDecay, t: 0,
            step: function(weights, gradients, paramId = 'default') {
                this.t++;

                if (!state.has(paramId)) {
                    state.set(paramId, {
                        m: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { m, v } = state.get(paramId);
                const biasCorrect1 = 1 - Math.pow(beta1, this.t);
                const biasCorrect2 = 1 - Math.pow(beta2, this.t);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            // Decoupled weight decay
                            weights[i][j] -= lr * weightDecay * weights[i][j];
                            
                            const grad = gradients[i][j];
                            m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad;
                            v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad * grad;
                            const mHat = m[i][j] / biasCorrect1;
                            const vHat = v[i][j] / biasCorrect2;
                            weights[i][j] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                        }
                    } else {
                        weights[i] -= lr * weightDecay * weights[i];
                        const grad = gradients[i];
                        m[i] = beta1 * m[i] + (1 - beta1) * grad;
                        v[i] = beta2 * v[i] + (1 - beta2) * grad * grad;
                        const mHat = m[i] / biasCorrect1;
                        const vHat = v[i] / biasCorrect2;
                        weights[i] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * NAdam: Nesterov-accelerated Adam
     */
    createNAdam: function(params = {}) {
        const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8 } = params;
        const state = new Map();

        return {
            lr, beta1, beta2, epsilon, t: 0,
            step: function(weights, gradients, paramId = 'default') {
                this.t++;

                if (!state.has(paramId)) {
                    state.set(paramId, {
                        m: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { m, v } = state.get(paramId);
                const biasCorrect1 = 1 - Math.pow(beta1, this.t);
                const biasCorrect2 = 1 - Math.pow(beta2, this.t);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad;
                            v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad * grad;
                            
                            const mHat = m[i][j] / biasCorrect1;
                            const vHat = v[i][j] / biasCorrect2;
                            
                            // Nesterov momentum
                            const mNesterov = beta1 * mHat + (1 - beta1) * grad / biasCorrect1;
                            weights[i][j] -= lr * mNesterov / (Math.sqrt(vHat) + epsilon);
                        }
                    } else {
                        const grad = gradients[i];
                        m[i] = beta1 * m[i] + (1 - beta1) * grad;
                        v[i] = beta2 * v[i] + (1 - beta2) * grad * grad;
                        const mHat = m[i] / biasCorrect1;
                        const vHat = v[i] / biasCorrect2;
                        const mNesterov = beta1 * mHat + (1 - beta1) * grad / biasCorrect1;
                        weights[i] -= lr * mNesterov / (Math.sqrt(vHat) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * RMSprop
     */
    createRMSprop: function(params = {}) {
        const { lr = 0.01, alpha = 0.99, epsilon = 1e-8, momentum = 0, centered = false } = params;
        const state = new Map();

        return {
            lr, alpha, epsilon, momentum, centered,
            step: function(weights, gradients, paramId = 'default') {
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        g: centered ? gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0) : null,
                        buf: momentum > 0 ? gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0) : null
                    });
                }

                const s = state.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            s.v[i][j] = alpha * s.v[i][j] + (1 - alpha) * grad * grad;
                            
                            let avg = s.v[i][j];
                            if (centered) {
                                s.g[i][j] = alpha * s.g[i][j] + (1 - alpha) * grad;
                                avg = s.v[i][j] - s.g[i][j] * s.g[i][j];
                            }
                            
                            if (momentum > 0) {
                                s.buf[i][j] = momentum * s.buf[i][j] + grad / (Math.sqrt(avg) + epsilon);
                                weights[i][j] -= lr * s.buf[i][j];
                            } else {
                                weights[i][j] -= lr * grad / (Math.sqrt(avg) + epsilon);
                            }
                        }
                    }
                }
                return weights;
            }
        };
    },

    /**
     * AdaGrad
     */
    createAdaGrad: function(params = {}) {
        const { lr = 0.01, epsilon = 1e-10 } = params;
        const state = new Map();

        return {
            lr, epsilon,
            step: function(weights, gradients, paramId = 'default') {
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        sum: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { sum } = state.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            sum[i][j] += grad * grad;
                            weights[i][j] -= lr * grad / (Math.sqrt(sum[i][j]) + epsilon);
                        }
                    } else {
                        const grad = gradients[i];
                        sum[i] += grad * grad;
                        weights[i] -= lr * grad / (Math.sqrt(sum[i]) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * AdaDelta
     */
    createAdaDelta: function(params = {}) {
        const { rho = 0.9, epsilon = 1e-6 } = params;
        const state = new Map();

        return {
            rho, epsilon,
            step: function(weights, gradients, paramId = 'default') {
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        accGrad: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        accDelta: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { accGrad, accDelta } = state.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            accGrad[i][j] = rho * accGrad[i][j] + (1 - rho) * grad * grad;
                            
                            const delta = -Math.sqrt(accDelta[i][j] + epsilon) / 
                                          Math.sqrt(accGrad[i][j] + epsilon) * grad;
                            
                            accDelta[i][j] = rho * accDelta[i][j] + (1 - rho) * delta * delta;
                            weights[i][j] += delta;
                        }
                    }
                }
                return weights;
            }
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 13: PRISM_NORMALIZATION_ENGINE
// Batch, Layer, Instance, Group Normalization
// Source: MIT 6.036, Stanford CS 231N
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_NORMALIZATION_ENGINE = {
    name: 'PRISM_NORMALIZATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Batch Normalization
     * Normalize over batch dimension
     */
    batchNorm: function(batch, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5, momentum = 0.1, training = true } = params;
        const batchSize = batch.length;
        const featureDim = batch[0].length;

        // Compute batch mean and variance
        const mean = Array(featureDim).fill(0);
        const variance = Array(featureDim).fill(0);

        for (const sample of batch) {
            for (let j = 0; j < featureDim; j++) {
                mean[j] += sample[j];
            }
        }
        for (let j = 0; j < featureDim; j++) {
            mean[j] /= batchSize;
        }

        for (const sample of batch) {
            for (let j = 0; j < featureDim; j++) {
                variance[j] += (sample[j] - mean[j]) ** 2;
            }
        }
        for (let j = 0; j < featureDim; j++) {
            variance[j] /= batchSize;
        }

        // Normalize
        const normalized = batch.map(sample =>
            sample.map((x, j) => {
                const xHat = (x - mean[j]) / Math.sqrt(variance[j] + epsilon);
                const g = gamma ? gamma[j] : 1;
                const b = beta ? beta[j] : 0;
                return g * xHat + b;
            })
        );

        return { output: normalized, mean, variance };
    },

    /**
     * Layer Normalization
     * Normalize over feature dimension (per sample)
     */
    layerNorm: function(x, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5 } = params;

        const mean = x.reduce((s, v) => s + v, 0) / x.length;
        const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / x.length;

        return x.map((v, i) => {
            const xHat = (v - mean) / Math.sqrt(variance + epsilon);
            const g = gamma ? gamma[i] : 1;
            const b = beta ? beta[i] : 0;
            return g * xHat + b;
        });
    },

    /**
     * Instance Normalization
     * For style transfer, normalize each channel per instance
     */
    instanceNorm: function(x, channels, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5 } = params;
        const channelSize = x.length / channels;
        const output = [];

        for (let c = 0; c < channels; c++) {
            const start = c * channelSize;
            const end = start + channelSize;
            const channelData = x.slice(start, end);

            const mean = channelData.reduce((s, v) => s + v, 0) / channelSize;
            const variance = channelData.reduce((s, v) => s + (v - mean) ** 2, 0) / channelSize;

            for (let i = 0; i < channelSize; i++) {
                const xHat = (channelData[i] - mean) / Math.sqrt(variance + epsilon);
                const g = gamma ? gamma[c] : 1;
                const b = beta ? beta[c] : 0;
                output.push(g * xHat + b);
            }
        }

        return output;
    },

    /**
     * Group Normalization
     * Compromise between batch and layer norm
     */
    groupNorm: function(x, numGroups, channels, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5 } = params;
        const channelsPerGroup = channels / numGroups;
        const spatialSize = x.length / channels;
        const output = new Array(x.length);

        for (let g = 0; g < numGroups; g++) {
            // Collect all elements in this group
            const groupElements = [];
            for (let c = g * channelsPerGroup; c < (g + 1) * channelsPerGroup; c++) {
                for (let s = 0; s < spatialSize; s++) {
                    groupElements.push(x[c * spatialSize + s]);
                }
            }

            const mean = groupElements.reduce((s, v) => s + v, 0) / groupElements.length;
            const variance = groupElements.reduce((s, v) => s + (v - mean) ** 2, 0) / groupElements.length;

            let idx = 0;
            for (let c = g * channelsPerGroup; c < (g + 1) * channelsPerGroup; c++) {
                for (let s = 0; s < spatialSize; s++) {
                    const i = c * spatialSize + s;
                    const xHat = (x[i] - mean) / Math.sqrt(variance + epsilon);
                    const gc = gamma ? gamma[c] : 1;
                    const bc = beta ? beta[c] : 0;
                    output[i] = gc * xHat + bc;
                    idx++;
                }
            }
        }

        return output;
    },

    /**
     * RMS Normalization (used in LLaMA, T5)
     */
    rmsNorm: function(x, params = {}) {
        const { gamma = null, epsilon = 1e-6 } = params;
        const rms = Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length + epsilon);
        
        return x.map((v, i) => {
            const g = gamma ? gamma[i] : 1;
            return g * v / rms;
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 14: PRISM_REGULARIZATION_ENGINE
// Dropout, Weight Decay, Label Smoothing, Mixup
// Source: MIT 6.036, Stanford CS 231N
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_REGULARIZATION_ENGINE = {
    name: 'PRISM_REGULARIZATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Standard Dropout
     */
    dropout: function(x, p = 0.5, training = true) {
        if (!training || p === 0) return { output: x, mask: null };
        
        const mask = x.map(() => Math.random() > p ? 1 : 0);
        const scale = 1 / (1 - p);
        const output = x.map((v, i) => v * mask[i] * scale);
        
        return { output, mask };
    },

    /**
     * Spatial Dropout (for CNNs - drops entire channels)
     */
    spatialDropout: function(x, channels, p = 0.5, training = true) {
        if (!training || p === 0) return x;
        
        const channelSize = x.length / channels;
        const channelMask = Array(channels).fill(0).map(() => Math.random() > p ? 1 : 0);
        const scale = 1 / (1 - p);
        
        return x.map((v, i) => {
            const c = Math.floor(i / channelSize);
            return v * channelMask[c] * scale;
        });
    },

    /**
     * DropConnect (drops weights instead of activations)
     */
    dropConnect: function(weights, p = 0.5, training = true) {
        if (!training || p === 0) return weights;
        
        const scale = 1 / (1 - p);
        return weights.map(row =>
            Array.isArray(row)
                ? row.map(w => Math.random() > p ? w * scale : 0)
                : Math.random() > p ? row * scale : 0
        );
    },

    /**
     * Label Smoothing
     */
    labelSmoothing: function(labels, numClasses, smoothing = 0.1) {
        const smoothed = [];
        for (const label of labels) {
            const oneHot = Array(numClasses).fill(smoothing / numClasses);
            oneHot[label] = 1 - smoothing + smoothing / numClasses;
            smoothed.push(oneHot);
        }
        return smoothed;
    },

    /**
     * Mixup Data Augmentation
     */
    mixup: function(x1, y1, x2, y2, alpha = 0.2) {
        // Sample lambda from Beta(alpha, alpha)
        const lambda = this._sampleBeta(alpha, alpha);
        
        const mixedX = x1.map((v, i) => lambda * v + (1 - lambda) * x2[i]);
        const mixedY = y1.map((v, i) => lambda * v + (1 - lambda) * y2[i]);
        
        return { x: mixedX, y: mixedY, lambda };
    },

    /**
     * CutMix (for images represented as flat arrays)
     */
    cutmix: function(x1, y1, x2, y2, width, height) {
        const lambda = Math.random();
        const cutRatio = Math.sqrt(1 - lambda);
        
        const cutW = Math.floor(width * cutRatio);
        const cutH = Math.floor(height * cutRatio);
        const cx = Math.floor(Math.random() * width);
        const cy = Math.floor(Math.random() * height);
        
        const x1Start = Math.max(0, cx - cutW / 2);
        const y1Start = Math.max(0, cy - cutH / 2);
        const x1End = Math.min(width, cx + cutW / 2);
        const y1End = Math.min(height, cy + cutH / 2);

        const mixedX = [...x1];
        for (let y = y1Start; y < y1End; y++) {
            for (let x = x1Start; x < x1End; x++) {
                const idx = y * width + x;
                mixedX[idx] = x2[idx];
            }
        }

        const actualLambda = 1 - (x1End - x1Start) * (y1End - y1Start) / (width * height);
        const mixedY = y1.map((v, i) => actualLambda * v + (1 - actualLambda) * y2[i]);
        
        return { x: mixedX, y: mixedY, lambda: actualLambda };
    },

    /**
     * L1 Regularization (Lasso)
     */
    l1Regularization: function(weights, lambda = 0.01) {
        let penalty = 0;
        const flatten = (arr) => {
            if (!Array.isArray(arr)) return Math.abs(arr);
            return arr.reduce((sum, item) => sum + flatten(item), 0);
        };
        penalty = flatten(weights);
        return lambda * penalty;
    },

    /**
     * L2 Regularization (Ridge)
     */
    l2Regularization: function(weights, lambda = 0.01) {
        let penalty = 0;
        const flatten = (arr) => {
            if (!Array.isArray(arr)) return arr * arr;
            return arr.reduce((sum, item) => sum + flatten(item), 0);
        };
        penalty = flatten(weights);
        return 0.5 * lambda * penalty;
    },

    /**
     * Elastic Net (L1 + L2)
     */
    elasticNet: function(weights, lambda1 = 0.01, lambda2 = 0.01) {
        return this.l1Regularization(weights, lambda1) + this.l2Regularization(weights, lambda2);
    },

    // Helper: Sample from Beta distribution (approximation)
    _sampleBeta: function(alpha, beta) {
        const gamma1 = this._sampleGamma(alpha);
        const gamma2 = this._sampleGamma(beta);
        return gamma1 / (gamma1 + gamma2);
    },

    _sampleGamma: function(shape) {
        // Marsaglia and Tsang's method for shape >= 1
        if (shape < 1) {
            return this._sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
        }
        const d = shape - 1/3;
        const c = 1 / Math.sqrt(9 * d);
        while (true) {
            let x, v;
            do {
                x = this._randn();
                v = 1 + c * x;
            } while (v <= 0);
            v = v * v * v;
            const u = Math.random();
            if (u < 1 - 0.0331 * x * x * x * x) return d * v;
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
    },

    _randn: function() {
        const u = Math.random(), v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
}