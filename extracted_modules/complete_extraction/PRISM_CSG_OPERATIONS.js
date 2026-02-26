const PRISM_CSG_OPERATIONS = {
    name: 'PRISM_CSG_OPERATIONS',
    version: '1.0.0',
    source: 'Computational Solid Geometry',
    
    /**
     * CSG Union
     */
    union: function(meshA, meshB) {
        return this._booleanOperation(meshA, meshB, 'union');
    },
    
    /**
     * CSG Intersection
     */
    intersection: function(meshA, meshB) {
        return this._booleanOperation(meshA, meshB, 'intersection');
    },
    
    /**
     * CSG Subtraction (A - B)
     */
    subtraction: function(meshA, meshB) {
        return this._booleanOperation(meshA, meshB, 'subtraction');
    },
    
    /**
     * Boolean operation using BSP trees
     */
    _booleanOperation: function(meshA, meshB, operation) {
        // Convert to BSP
        const bspA = this._meshToBSP(meshA);
        const bspB = this._meshToBSP(meshB);
        
        let result;
        
        switch (operation) {
            case 'union':
                result = this._bspUnion(bspA, bspB);
                break;
            case 'intersection':
                result = this._bspIntersection(bspA, bspB);
                break;
            case 'subtraction':
                result = this._bspSubtraction(bspA, bspB);
                break;
        }
        
        // Convert back to mesh
        return this._bspToMesh(result);
    },
    
    _meshToBSP: function(mesh) {
        const { vertices, faces } = mesh;
        const polygons = [];
        
        for (const face of faces) {
            const polygon = {
                vertices: face.map(i => ({ ...vertices[i] })),
                plane: this._computePlane(face.map(i => vertices[i]))
            };
            polygons.push(polygon);
        }
        
        return this._buildBSP(polygons);
    },
    
    _computePlane: function(points) {
        const p0 = points[0];
        const p1 = points[1];
        const p2 = points[2];
        
        const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: (p1.z || 0) - (p0.z || 0) };
        const v2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: (p2.z || 0) - (p0.z || 0) };
        
        const n = {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
        
        const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
        if (len > 1e-10) {
            n.x /= len; n.y /= len; n.z /= len;
        }
        
        const w = n.x * p0.x + n.y * p0.y + n.z * (p0.z || 0);
        
        return { normal: n, w };
    },
    
    _buildBSP: function(polygons) {
        if (polygons.length === 0) {
            return null;
        }
        
        // Choose splitting plane (first polygon)
        const plane = polygons[0].plane;
        const front = [];
        const back = [];
        const coplanar = [];
        
        for (const poly of polygons) {
            const classification = this._classifyPolygon(poly, plane);
            
            switch (classification) {
                case 'front':
                    front.push(poly);
                    break;
                case 'back':
                    back.push(poly);
                    break;
                case 'coplanar':
                    coplanar.push(poly);
                    break;
                case 'spanning':
                    const [frontPart, backPart] = this._splitPolygon(poly, plane);
                    if (frontPart) front.push(frontPart);
                    if (backPart) back.push(backPart);
                    break;
            }
        }
        
        return {
            plane,
            polygons: coplanar,
            front: this._buildBSP(front),
            back: this._buildBSP(back)
        };
    },
    
    _classifyPolygon: function(polygon, plane) {
        const EPSILON = 1e-6;
        let front = 0, back = 0;
        
        for (const v of polygon.vertices) {
            const d = plane.normal.x * v.x + plane.normal.y * v.y + plane.normal.z * (v.z || 0) - plane.w;
            
            if (d > EPSILON) front++;
            else if (d < -EPSILON) back++;
        }
        
        if (front > 0 && back > 0) return 'spanning';
        if (front > 0) return 'front';
        if (back > 0) return 'back';
        return 'coplanar';
    },
    
    _splitPolygon: function(polygon, plane) {
        const EPSILON = 1e-6;
        const frontVerts = [];
        const backVerts = [];
        
        const n = polygon.vertices.length;
        
        for (let i = 0; i < n; i++) {
            const vi = polygon.vertices[i];
            const vj = polygon.vertices[(i + 1) % n];
            
            const di = plane.normal.x * vi.x + plane.normal.y * vi.y + plane.normal.z * (vi.z || 0) - plane.w;
            const dj = plane.normal.x * vj.x + plane.normal.y * vj.y + plane.normal.z * (vj.z || 0) - plane.w;
            
            if (di >= -EPSILON) frontVerts.push(vi);
            if (di <= EPSILON) backVerts.push(vi);
            
            if ((di > EPSILON && dj < -EPSILON) || (di < -EPSILON && dj > EPSILON)) {
                const t = di / (di - dj);
                const intersection = {
                    x: vi.x + t * (vj.x - vi.x),
                    y: vi.y + t * (vj.y - vi.y),
                    z: (vi.z || 0) + t * ((vj.z || 0) - (vi.z || 0))
                };
                frontVerts.push(intersection);
                backVerts.push({ ...intersection });
            }
        }
        
        const frontPoly = frontVerts.length >= 3 ? { vertices: frontVerts, plane: polygon.plane } : null;
        const backPoly = backVerts.length >= 3 ? { vertices: backVerts, plane: polygon.plane } : null;
        
        return [frontPoly, backPoly];
    },
    
    _bspUnion: function(a, b) {
        if (!a) return b;
        if (!b) return a;
        
        const aClipped = this._clipTo(a, b);
        const bClipped = this._clipTo(b, a);
        const bInverted = this._invert(this._clipTo(this._invert(bClipped), a));
        
        return this._buildBSP([...this._allPolygons(aClipped), ...this._allPolygons(bInverted)]);
    },
    
    _bspIntersection: function(a, b) {
        if (!a || !b) return null;
        
        const aInverted = this._invert(a);
        const bInverted = this._invert(b);
        
        const aClipped = this._clipTo(aInverted, bInverted);
        const bClipped = this._clipTo(bInverted, aInverted);
        
        return this._invert(this._buildBSP([...this._allPolygons(aClipped), ...this._allPolygons(bClipped)]));
    },
    
    _bspSubtraction: function(a, b) {
        if (!a) return null;
        if (!b) return a;
        
        const aInverted = this._invert(a);
        const aClipped = this._clipTo(aInverted, b);
        const bClipped = this._clipTo(b, aInverted);
        const bInverted = this._invert(this._clipTo(this._invert(bClipped), aInverted));
        
        return this._invert(this._buildBSP([...this._allPolygons(aClipped), ...this._allPolygons(bInverted)]));
    },
    
    _clipTo: function(bsp, other) {
        if (!bsp || !other) return bsp;
        
        const polygons = this._clipPolygons(bsp.polygons, other);
        
        return {
            plane: bsp.plane,
            polygons,
            front: this._clipTo(bsp.front, other),
            back: this._clipTo(bsp.back, other)
        };
    },
    
    _clipPolygons: function(polygons, bsp) {
        if (!bsp) return [...polygons];
        
        let front = [];
        let back = [];
        
        for (const poly of polygons) {
            const classification = this._classifyPolygon(poly, bsp.plane);
            
            switch (classification) {
                case 'front':
                    front.push(poly);
                    break;
                case 'back':
                    back.push(poly);
                    break;
                case 'coplanar':
                    front.push(poly);
                    break;
                case 'spanning':
                    const [f, b] = this._splitPolygon(poly, bsp.plane);
                    if (f) front.push(f);
                    if (b) back.push(b);
                    break;
            }
        }
        
        if (bsp.front) front = this._clipPolygons(front, bsp.front);
        if (bsp.back) back = this._clipPolygons(back, bsp.back);
        else back = [];
        
        return [...front, ...back];
    },
    
    _invert: function(bsp) {
        if (!bsp) return null;
        
        return {
            plane: {
                normal: {
                    x: -bsp.plane.normal.x,
                    y: -bsp.plane.normal.y,
                    z: -bsp.plane.normal.z
                },
                w: -bsp.plane.w
            },
            polygons: bsp.polygons.map(p => ({
                vertices: [...p.vertices].reverse(),
                plane: {
                    normal: { x: -p.plane.normal.x, y: -p.plane.normal.y, z: -p.plane.normal.z },
                    w: -p.plane.w
                }
            })),
            front: this._invert(bsp.back),
            back: this._invert(bsp.front)
        };
    },
    
    _allPolygons: function(bsp) {
        if (!bsp) return [];
        
        return [
            ...bsp.polygons,
            ...this._allPolygons(bsp.front),
            ...this._allPolygons(bsp.back)
        ];
    },
    
    _bspToMesh: function(bsp) {
        const polygons = this._allPolygons(bsp);
        const vertices = [];
        const faces = [];
        const vertexMap = new Map();
        
        for (const poly of polygons) {
            const face = [];
            
            for (const v of poly.vertices) {
                const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${(v.z || 0).toFixed(6)}`;
                
                if (!vertexMap.has(key)) {
                    vertexMap.set(key, vertices.length);
                    vertices.push({ x: v.x, y: v.y, z: v.z || 0 });
                }
                
                face.push(vertexMap.get(key));
            }
            
            // Triangulate if needed
            if (face.length === 3) {
                faces.push(face);
            } else if (face.length > 3) {
                for (let i = 1; i < face.length - 1; i++) {
                    faces.push([face[0], face[i], face[i + 1]]);
                }
            }
        }
        
        return { vertices, faces };
    }
}