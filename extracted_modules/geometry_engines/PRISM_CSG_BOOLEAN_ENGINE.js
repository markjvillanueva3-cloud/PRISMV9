const PRISM_CSG_BOOLEAN_ENGINE = {
    name: 'PRISM CSG Boolean Engine',
    version: '1.0.0',
    source: 'MIT 2.158J, Stanford CS 348A',
    
    buildBSP: function(mesh) {
        const faces = this._meshToFaces(mesh);
        if (faces.length === 0) return null;
        return this._buildBSPNode(faces);
    },
    
    _buildBSPNode: function(faces) {
        if (faces.length === 0) return null;
        const splitter = faces[0];
        const plane = this._faceToPlane(splitter);
        const front = [], back = [], coplanarFront = [], coplanarBack = [];
        for (const face of faces) {
            this._splitFace(face, plane, coplanarFront, coplanarBack, front, back);
        }
        return {
            plane, front: this._buildBSPNode(front), back: this._buildBSPNode(back),
            coplanarFront, coplanarBack
        };
    },
    
    union: function(meshA, meshB) {
        const bspA = this.buildBSP(meshA), bspB = this.buildBSP(meshB);
        if (!bspA) return meshB;
        if (!bspB) return meshA;
        const clippedA = this._clipTo(bspA, bspB);
        const clippedB = this._clipTo(bspB, bspA);
        const clippedB2 = this._clipTo(clippedB, clippedA);
        return this._facesToMesh([...this._collectFaces(clippedA), ...this._collectFaces(clippedB2)]);
    },
    
    intersection: function(meshA, meshB) {
        const bspA = this.buildBSP(meshA), bspB = this.buildBSP(meshB);
        if (!bspA || !bspB) return { vertices: [], faces: [] };
        this._invert(bspA);
        const clippedB = this._clipTo(bspB, bspA);
        this._invert(clippedB);
        const clippedA = this._clipTo(bspA, clippedB);
        this._invert(clippedA);
        const clippedB2 = this._clipTo(clippedB, clippedA);
        return this._facesToMesh([...this._collectFaces(clippedA), ...this._collectFaces(clippedB2)]);
    },
    
    difference: function(meshA, meshB) {
        const bspA = this.buildBSP(meshA), bspB = this.buildBSP(meshB);
        if (!bspA) return { vertices: [], faces: [] };
        if (!bspB) return meshA;
        this._invert(bspB);
        const clippedA = this._clipTo(bspA, bspB);
        const clippedB = this._clipTo(bspB, clippedA);
        this._invert(clippedB);
        const clippedB2 = this._clipTo(clippedB, clippedA);
        this._invert(clippedB2);
        return this._facesToMesh([...this._collectFaces(clippedA), ...this._collectFaces(clippedB2)]);
    },
    
    _meshToFaces: function(mesh) {
        return mesh.faces.map(f => ({
            vertices: [{ ...mesh.vertices[f[0]] }, { ...mesh.vertices[f[1]] }, { ...mesh.vertices[f[2]] }]
        }));
    },
    
    _facesToMesh: function(faces) {
        const vertices = [], meshFaces = [], vertexMap = new Map();
        const getIdx = (v) => {
            const key = `${v.x.toFixed(8)},${v.y.toFixed(8)},${v.z.toFixed(8)}`;
            if (vertexMap.has(key)) return vertexMap.get(key);
            const idx = vertices.length;
            vertices.push({ x: v.x, y: v.y, z: v.z });
            vertexMap.set(key, idx);
            return idx;
        };
        for (const face of faces) {
            meshFaces.push([getIdx(face.vertices[0]), getIdx(face.vertices[1]), getIdx(face.vertices[2])]);
        }
        return { vertices, faces: meshFaces };
    },
    
    _faceToPlane: function(face) {
        const v = face.vertices;
        const e1 = this._sub(v[1], v[0]), e2 = this._sub(v[2], v[0]);
        const n = this._normalize(this._cross(e1, e2));
        return { normal: n, w: this._dot(n, v[0]) };
    },
    
    _splitFace: function(face, plane, coplanarFront, coplanarBack, front, back) {
        const EPSILON = 1e-6;
        let faceType = 0;
        const types = face.vertices.map(v => {
            const t = this._dot(plane.normal, v) - plane.w;
            const type = (t < -EPSILON) ? 2 : (t > EPSILON) ? 1 : 0;
            faceType |= type;
            return type;
        });
        
        if (faceType === 0) {
            (this._dot(plane.normal, this._faceNormal(face)) > 0 ? coplanarFront : coplanarBack).push(face);
        } else if (faceType === 1) { front.push(face); }
        else if (faceType === 2) { back.push(face); }
        else {
            const f = [], b = [];
            for (let i = 0; i < 3; i++) {
                const j = (i + 1) % 3, ti = types[i], tj = types[j];
                const vi = face.vertices[i], vj = face.vertices[j];
                if (ti !== 2) f.push({ ...vi });
                if (ti !== 1) b.push({ ...vi });
                if ((ti | tj) === 3) {
                    const t = (plane.w - this._dot(plane.normal, vi)) / this._dot(plane.normal, this._sub(vj, vi));
                    const v = this._lerp(vi, vj, t);
                    f.push({ ...v }); b.push({ ...v });
                }
            }
            if (f.length >= 3) { front.push({ vertices: [f[0], f[1], f[2]] }); if (f.length === 4) front.push({ vertices: [f[0], f[2], f[3]] }); }
            if (b.length >= 3) { back.push({ vertices: [b[0], b[1], b[2]] }); if (b.length === 4) back.push({ vertices: [b[0], b[2], b[3]] }); }
        }
    },
    
    _clipTo: function(nodeA, nodeB) {
        if (!nodeA) return null;
        const faces = [...nodeA.coplanarFront, ...nodeA.coplanarBack];
        const clipped = this._clipFaces(faces, nodeB);
        nodeA.coplanarFront = []; nodeA.coplanarBack = [];
        for (const face of clipped) {
            (this._dot(nodeA.plane.normal, this._faceNormal(face)) > 0 ? nodeA.coplanarFront : nodeA.coplanarBack).push(face);
        }
        nodeA.front = this._clipTo(nodeA.front, nodeB);
        nodeA.back = this._clipTo(nodeA.back, nodeB);
        return nodeA;
    },
    
    _clipFaces: function(faces, node) {
        if (!node) return faces;
        let front = [], back = [];
        for (const face of faces) this._splitFace(face, node.plane, front, back, front, back);
        if (node.front) front = this._clipFaces(front, node.front);
        back = node.back ? this._clipFaces(back, node.back) : [];
        return [...front, ...back];
    },
    
    _invert: function(node) {
        if (!node) return;
        [...node.coplanarFront, ...node.coplanarBack].forEach(f => f.vertices.reverse());
        [node.coplanarFront, node.coplanarBack] = [node.coplanarBack, node.coplanarFront];
        node.plane.normal = this._scale(node.plane.normal, -1);
        node.plane.w = -node.plane.w;
        [node.front, node.back] = [node.back, node.front];
        this._invert(node.front); this._invert(node.back);
    },
    
    _collectFaces: function(node) {
        if (!node) return [];
        return [...node.coplanarFront, ...node.coplanarBack, ...this._collectFaces(node.front), ...this._collectFaces(node.back)];
    },
    
    _faceNormal: function(face) {
        const e1 = this._sub(face.vertices[1], face.vertices[0]), e2 = this._sub(face.vertices[2], face.vertices[0]);
        return this._normalize(this._cross(e1, e2));
    },
    
    _dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    _cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    _sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    _scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
    _normalize: function(v) { const l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); return l > 1e-10 ? { x: v.x/l, y: v.y/l, z: v.z/l } : { x: 0, y: 0, z: 1 }; },
    _lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }),
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('csg.union', 'PRISM_CSG_BOOLEAN_ENGINE.union');
            PRISM_GATEWAY.register('csg.intersection', 'PRISM_CSG_BOOLEAN_ENGINE.intersection');
            PRISM_GATEWAY.register('csg.difference', 'PRISM_CSG_BOOLEAN_ENGINE.difference');
            PRISM_GATEWAY.register('csg.buildBSP', 'PRISM_CSG_BOOLEAN_ENGINE.buildBSP');
        }
    }
}