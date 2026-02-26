const PRISM_DELAUNAY_3D_ENGINE = {
    name: 'PRISM_DELAUNAY_3D_ENGINE',
    version: '1.0.0',
    source: 'MIT 18.086, Bowyer-Watson 1981',
    
    /**
     * Compute 3D Delaunay tetrahedralization
     * Bowyer-Watson incremental algorithm
     */
    tetrahedralize: function(points) {
        if (points.length < 4) {
            return { tetrahedra: [], vertices: points };
        }
        
        // Create super tetrahedron
        const bounds = this._computeBounds(points);
        const superTet = this._createSuperTetrahedron(bounds);
        
        // Start with super tetrahedron
        let tetrahedra = [superTet];
        
        // Add points incrementally
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            
            // Find all tetrahedra whose circumsphere contains p
            const badTetrahedra = [];
            const goodTetrahedra = [];
            
            for (const tet of tetrahedra) {
                if (this._inCircumsphere(tet, p)) {
                    badTetrahedra.push(tet);
                } else {
                    goodTetrahedra.push(tet);
                }
            }
            
            // Find boundary polygon (faces of bad tetrahedra not shared)
            const boundary = this._findBoundaryFaces(badTetrahedra);
            
            // Create new tetrahedra from boundary faces to point
            const newTetrahedra = boundary.map(face => ({
                vertices: [...face.vertices, i + 4], // +4 for super tet vertices
                circumcenter: null,
                circumradius: null
            }));
            
            // Compute circumspheres for new tetrahedra
            for (const tet of newTetrahedra) {
                const vs = tet.vertices.map(v => v < 4 ? superTet.superVertices[v] : points[v - 4]);
                const circ = this._computeCircumsphere(vs);
                tet.circumcenter = circ.center;
                tet.circumradius = circ.radius;
            }
            
            tetrahedra = [...goodTetrahedra, ...newTetrahedra];
        }
        
        // Remove tetrahedra connected to super tetrahedron
        tetrahedra = tetrahedra.filter(tet => 
            tet.vertices.every(v => v >= 4)
        );
        
        // Remap vertex indices
        tetrahedra = tetrahedra.map(tet => ({
            vertices: tet.vertices.map(v => v - 4),
            circumcenter: tet.circumcenter,
            circumradius: tet.circumradius
        }));
        
        return {
            tetrahedra,
            vertices: points
        };
    },
    
    /**
     * Extract surface triangulation from tetrahedralization
     */
    extractSurface: function(delaunay) {
        const faceCount = new Map();
        
        for (const tet of delaunay.tetrahedra) {
            const v = tet.vertices;
            const faces = [
                [v[0], v[1], v[2]],
                [v[0], v[1], v[3]],
                [v[0], v[2], v[3]],
                [v[1], v[2], v[3]]
            ];
            
            for (const face of faces) {
                const key = face.slice().sort((a, b) => a - b).join(',');
                faceCount.set(key, (faceCount.get(key) || 0) + 1);
            }
        }
        
        // Surface faces appear exactly once
        const surfaceFaces = [];
        for (const [key, count] of faceCount.entries()) {
            if (count === 1) {
                surfaceFaces.push(key.split(',').map(Number));
            }
        }
        
        return {
            faces: surfaceFaces,
            vertices: delaunay.vertices
        };
    },
    
    _createSuperTetrahedron: function(bounds) {
        const center = {
            x: (bounds.min.x + bounds.max.x) / 2,
            y: (bounds.min.y + bounds.max.y) / 2,
            z: (bounds.min.z + bounds.max.z) / 2
        };
        
        const size = Math.max(
            bounds.max.x - bounds.min.x,
            bounds.max.y - bounds.min.y,
            bounds.max.z - bounds.min.z
        ) * 10;
        
        const superVertices = [
            { x: center.x, y: center.y + size * 3, z: center.z },
            { x: center.x - size * 2, y: center.y - size, z: center.z - size },
            { x: center.x + size * 2, y: center.y - size, z: center.z - size },
            { x: center.x, y: center.y - size, z: center.z + size * 2 }
        ];
        
        const circ = this._computeCircumsphere(superVertices);
        
        return {
            vertices: [0, 1, 2, 3],
            superVertices,
            circumcenter: circ.center,
            circumradius: circ.radius
        };
    },
    
    _computeCircumsphere: function(vertices) {
        const [a, b, c, d] = vertices;
        
        // Solve linear system for circumcenter
        const ax = a.x, ay = a.y, az = a.z;
        const bx = b.x - ax, by = b.y - ay, bz = b.z - az;
        const cx = c.x - ax, cy = c.y - ay, cz = c.z - az;
        const dx = d.x - ax, dy = d.y - ay, dz = d.z - az;
        
        const bSq = bx*bx + by*by + bz*bz;
        const cSq = cx*cx + cy*cy + cz*cz;
        const dSq = dx*dx + dy*dy + dz*dz;
        
        const det = 2 * (bx*(cy*dz - cz*dy) - by*(cx*dz - cz*dx) + bz*(cx*dy - cy*dx));
        
        if (Math.abs(det) < 1e-10) {
            return { center: a, radius: Infinity };
        }
        
        const ux = (bSq*(cy*dz - cz*dy) - cSq*(by*dz - bz*dy) + dSq*(by*cz - bz*cy)) / det;
        const uy = (bx*(cSq*dz - dSq*cz) - cx*(bSq*dz - dSq*bz) + dx*(bSq*cz - cSq*bz)) / det;
        const uz = (bx*(cy*dSq - dy*cSq) - cx*(by*dSq - dy*bSq) + dx*(by*cSq - cy*bSq)) / det;
        
        const center = { x: ax + ux, y: ay + uy, z: az + uz };
        const radius = Math.sqrt(ux*ux + uy*uy + uz*uz);
        
        return { center, radius };
    },
    
    _inCircumsphere: function(tet, p) {
        if (!tet.circumcenter || tet.circumradius === Infinity) return false;
        
        const dx = p.x - tet.circumcenter.x;
        const dy = p.y - tet.circumcenter.y;
        const dz = p.z - tet.circumcenter.z;
        
        return Math.sqrt(dx*dx + dy*dy + dz*dz) < tet.circumradius;
    },
    
    _findBoundaryFaces: function(badTetrahedra) {
        const faceCount = new Map();
        
        for (const tet of badTetrahedra) {
            const v = tet.vertices;
            const faces = [
                { vertices: [v[0], v[1], v[2]] },
                { vertices: [v[0], v[1], v[3]] },
                { vertices: [v[0], v[2], v[3]] },
                { vertices: [v[1], v[2], v[3]] }
            ];
            
            for (const face of faces) {
                const key = face.vertices.slice().sort((a, b) => a - b).join(',');
                faceCount.set(key, (faceCount.get(key) || 0) + 1);
                if (!faceCount.has(key + '_data')) {
                    faceCount.set(key + '_data', face);
                }
            }
        }
        
        const boundary = [];
        for (const [key, count] of faceCount.entries()) {
            if (key.endsWith('_data')) continue;
            if (count === 1) {
                boundary.push(faceCount.get(key + '_data'));
            }
        }
        
        return boundary;
    },
    
    _computeBounds: function(points) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const p of points) {
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
        }
        
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
    }
}