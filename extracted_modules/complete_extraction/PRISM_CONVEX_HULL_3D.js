const PRISM_CONVEX_HULL_3D = {
    name: 'PRISM 3D Convex Hull Engine',
    version: '1.0.0',
    source: 'MIT 6.046J, Quickhull Algorithm',
    
    quickhull: function(points) {
        if (points.length < 4) return { vertices: points.map(p => ({...p})), faces: [] };
        const initial = this._findInitialTetrahedron(points);
        if (!initial) return { vertices: points.map(p => ({...p})), faces: [] };
        const hull = this._createInitialHull(initial);
        const remaining = points.filter(p => !initial.includes(p));
        hull.faces.forEach(f => f.outsideSet = []);
        this._assignPointsToFaces(remaining, hull.faces);
        const facesToProcess = hull.faces.filter(f => f.outsideSet.length > 0);
        
        while (facesToProcess.length > 0) {
            const face = facesToProcess.pop();
            if (face.removed || face.outsideSet.length === 0) continue;
            const furthest = this._findFurthest(face);
            if (!furthest) continue;
            const { horizon, visibleFaces } = this._findHorizon(furthest, face, hull);
            visibleFaces.forEach(vf => { vf.removed = true; const idx = hull.faces.indexOf(vf); if (idx >= 0) hull.faces.splice(idx, 1); });
            const newFaces = horizon.map(edge => {
                const nf = { vertices: [edge[0], edge[1], furthest], outsideSet: [], removed: false };
                nf.normal = this._computeFaceNormal(nf);
                hull.faces.push(nf);
                return nf;
            });
            const orphaned = visibleFaces.flatMap(vf => vf.outsideSet);
            this._assignPointsToFaces(orphaned, newFaces);
            newFaces.filter(nf => nf.outsideSet.length > 0).forEach(nf => facesToProcess.push(nf));
        }
        return this._hullToMesh(hull);
    },
    
    compute: function(points) { return this.quickhull(points); },
    
    containsPoint: function(hull, point) {
        for (const face of hull.faces) {
            const v0 = hull.vertices[face[0]];
            const normal = this._computeFaceNormalFromMesh(hull, face);
            if (this._dot(this._sub(point, v0), normal) > 1e-8) return false;
        }
        return true;
    },
    
    _findInitialTetrahedron: function(points) {
        let minX = points[0], maxX = points[0], minY = points[0], maxY = points[0], minZ = points[0], maxZ = points[0];
        for (const p of points) {
            if (p.x < minX.x) minX = p; if (p.x > maxX.x) maxX = p;
            if (p.y < minY.y) minY = p; if (p.y > maxY.y) maxY = p;
            if (p.z < minZ.z) minZ = p; if (p.z > maxZ.z) maxZ = p;
        }
        const extremes = [minX, maxX, minY, maxY, minZ, maxZ];
        let maxDist = 0, p1 = null, p2 = null;
        for (let i = 0; i < extremes.length; i++) {
            for (let j = i + 1; j < extremes.length; j++) {
                const d = this._distance(extremes[i], extremes[j]);
                if (d > maxDist) { maxDist = d; p1 = extremes[i]; p2 = extremes[j]; }
            }
        }
        if (!p1 || !p2 || maxDist < 1e-10) return null;
        
        let maxLineDist = 0, p3 = null;
        for (const p of points) {
            if (p === p1 || p === p2) continue;
            const d = this._pointToLineDistance(p, p1, p2);
            if (d > maxLineDist) { maxLineDist = d; p3 = p; }
        }
        if (!p3 || maxLineDist < 1e-10) return null;
        
        const planeNormal = this._normalize(this._cross(this._sub(p2, p1), this._sub(p3, p1)));
        let maxPlaneDist = 0, p4 = null;
        for (const p of points) {
            if (p === p1 || p === p2 || p === p3) continue;
            const d = Math.abs(this._dot(this._sub(p, p1), planeNormal));
            if (d > maxPlaneDist) { maxPlaneDist = d; p4 = p; }
        }
        if (!p4 || maxPlaneDist < 1e-10) return null;
        return [p1, p2, p3, p4];
    },
    
    _createInitialHull: function(tetra) {
        const [p1, p2, p3, p4] = tetra;
        const centroid = { x: (p1.x+p2.x+p3.x+p4.x)/4, y: (p1.y+p2.y+p3.y+p4.y)/4, z: (p1.z+p2.z+p3.z+p4.z)/4 };
        const makeFace = (a, b, c) => {
            const face = { vertices: [a, b, c], outsideSet: [], removed: false };
            face.normal = this._computeFaceNormal(face);
            const fc = { x: (a.x+b.x+c.x)/3, y: (a.y+b.y+c.y)/3, z: (a.z+b.z+c.z)/3 };
            if (this._dot(face.normal, this._sub(centroid, fc)) > 0) {
                face.vertices = [a, c, b];
                face.normal = this._scale(face.normal, -1);
            }
            return face;
        };
        return { faces: [makeFace(p1,p2,p3), makeFace(p1,p2,p4), makeFace(p1,p3,p4), makeFace(p2,p3,p4)] };
    },
    
    _assignPointsToFaces: function(points, faces) {
        for (const p of points) {
            let maxDist = 0, bestFace = null;
            for (const face of faces) {
                if (face.removed) continue;
                const d = this._signedDistance(p, face);
                if (d > 1e-10 && d > maxDist) { maxDist = d; bestFace = face; }
            }
            if (bestFace) bestFace.outsideSet.push(p);
        }
    },
    
    _findFurthest: function(face) {
        let maxDist = 0, furthest = null;
        for (const p of face.outsideSet) {
            const d = this._signedDistance(p, face);
            if (d > maxDist) { maxDist = d; furthest = p; }
        }
        return furthest;
    },
    
    _findHorizon: function(eyePoint, startFace, hull) {
        const visibleFaces = [], horizon = [], visited = new Set();
        const stack = [startFace];
        while (stack.length > 0) {
            const face = stack.pop();
            if (visited.has(face) || face.removed) continue;
            visited.add(face);
            if (this._signedDistance(eyePoint, face) > 1e-10) {
                visibleFaces.push(face);
                for (let i = 0; i < 3; i++) {
                    const edge = [face.vertices[i], face.vertices[(i + 1) % 3]];
                    const neighbor = this._findNeighbor(edge, face, hull);
                    if (neighbor && !visited.has(neighbor)) {
                        if (this._signedDistance(eyePoint, neighbor) <= 1e-10) {
                            horizon.push([edge[1], edge[0]]);
                        } else stack.push(neighbor);
                    }
                }
            }
        }
        return { horizon, visibleFaces };
    },
    
    _findNeighbor: function(edge, excludeFace, hull) {
        for (const face of hull.faces) {
            if (face === excludeFace || face.removed) continue;
            for (let i = 0; i < 3; i++) {
                const v1 = face.vertices[i], v2 = face.vertices[(i + 1) % 3];
                if ((this._samePoint(v1, edge[0]) && this._samePoint(v2, edge[1])) ||
                    (this._samePoint(v1, edge[1]) && this._samePoint(v2, edge[0]))) return face;
            }
        }
        return null;
    },
    
    _samePoint: (a, b) => Math.abs(a.x-b.x) < 1e-10 && Math.abs(a.y-b.y) < 1e-10 && Math.abs(a.z-b.z) < 1e-10,
    
    _hullToMesh: function(hull) {
        const vertices = [], faces = [], vertexMap = new Map();
        const getIdx = (v) => {
            const key = `${v.x.toFixed(10)},${v.y.toFixed(10)},${v.z.toFixed(10)}`;
            if (vertexMap.has(key)) return vertexMap.get(key);
            const idx = vertices.length;
            vertices.push({ x: v.x, y: v.y, z: v.z });
            vertexMap.set(key, idx);
            return idx;
        };
        for (const face of hull.faces) {
            if (face.removed) continue;
            faces.push([getIdx(face.vertices[0]), getIdx(face.vertices[1]), getIdx(face.vertices[2])]);
        }
        return { vertices, faces };
    },
    
    _computeFaceNormal: function(face) {
        const v = face.vertices;
        return this._normalize(this._cross(this._sub(v[1], v[0]), this._sub(v[2], v[0])));
    },
    
    _computeFaceNormalFromMesh: function(mesh, face) {
        const v0 = mesh.vertices[face[0]], v1 = mesh.vertices[face[1]], v2 = mesh.vertices[face[2]];
        return this._normalize(this._cross(this._sub(v1, v0), this._sub(v2, v0)));
    },
    
    _signedDistance: function(point, face) { return this._dot(this._sub(point, face.vertices[0]), face.normal); },
    _pointToLineDistance: function(p, a, b) {
        const ab = this._sub(b, a), ap = this._sub(p, a), cross = this._cross(ab, ap);
        return Math.sqrt(cross.x*cross.x + cross.y*cross.y + cross.z*cross.z) / Math.sqrt(ab.x*ab.x + ab.y*ab.y + ab.z*ab.z);
    },
    
    _dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    _cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    _sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    _scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
    _normalize: function(v) { const l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); return l > 1e-10 ? { x: v.x/l, y: v.y/l, z: v.z/l } : { x: 0, y: 0, z: 1 }; },
    _distance: function(a, b) { const d = this._sub(a, b); return Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z); },
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('hull.quickhull', 'PRISM_CONVEX_HULL_3D.quickhull');
            PRISM_GATEWAY.register('hull.compute', 'PRISM_CONVEX_HULL_3D.compute');
            PRISM_GATEWAY.register('hull.contains', 'PRISM_CONVEX_HULL_3D.containsPoint');
        }
    }
}