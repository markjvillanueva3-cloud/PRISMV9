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
}