const PRISM_OCTREE_3D = {
    name: 'PRISM Octree 3D',
    version: '1.0.0',
    source: 'MIT 6.837, Meagher 1982',
    
    build: function(points, bounds = null, maxDepth = 10, maxPoints = 8) {
        if (!bounds) bounds = this._computeBounds(points);
        const size = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
        const center = { x: (bounds.min.x+bounds.max.x)/2, y: (bounds.min.y+bounds.max.y)/2, z: (bounds.min.z+bounds.max.z)/2 };
        bounds = { min: { x: center.x-size/2, y: center.y-size/2, z: center.z-size/2 }, max: { x: center.x+size/2, y: center.y+size/2, z: center.z+size/2 } };
        return this._buildRecursive(points.map((p, i) => ({ ...p, index: i })), bounds, 0, maxDepth, maxPoints);
    },
    
    _buildRecursive: function(points, bounds, depth, maxDepth, maxPoints) {
        const node = { bounds, points: [], children: null, isLeaf: true, depth };
        if (points.length <= maxPoints || depth >= maxDepth) { node.points = points; return node; }
        node.isLeaf = false;
        node.children = new Array(8).fill(null);
        const center = { x: (bounds.min.x+bounds.max.x)/2, y: (bounds.min.y+bounds.max.y)/2, z: (bounds.min.z+bounds.max.z)/2 };
        const childBounds = [], childPoints = [[], [], [], [], [], [], [], []];
        for (let i = 0; i < 8; i++) {
            childBounds.push({
                min: { x: (i&1)?center.x:bounds.min.x, y: (i&2)?center.y:bounds.min.y, z: (i&4)?center.z:bounds.min.z },
                max: { x: (i&1)?bounds.max.x:center.x, y: (i&2)?bounds.max.y:center.y, z: (i&4)?bounds.max.z:center.z }
            });
        }
        for (const p of points) {
            const idx = (p.x >= center.x ? 1 : 0) | (p.y >= center.y ? 2 : 0) | (p.z >= center.z ? 4 : 0);
            childPoints[idx].push(p);
        }
        for (let i = 0; i < 8; i++) {
            if (childPoints[i].length > 0) node.children[i] = this._buildRecursive(childPoints[i], childBounds[i], depth+1, maxDepth, maxPoints);
        }
        return node;
    },
    
    radiusSearch: function(octree, center, radius) {
        const results = [];
        this._radiusSearchRecursive(octree, center, radius, results);
        return results;
    },
    
    _radiusSearchRecursive: function(node, center, radius, results) {
        if (!node || !this._sphereIntersectsBox(center, radius, node.bounds)) return;
        if (node.isLeaf) {
            const radiusSq = radius * radius;
            for (const p of node.points) {
                const distSq = (p.x-center.x)**2 + (p.y-center.y)**2 + (p.z-center.z)**2;
                if (distSq <= radiusSq) results.push({ point: p, distance: Math.sqrt(distSq) });
            }
        } else if (node.children) {
            for (const child of node.children) this._radiusSearchRecursive(child, center, radius, results);
        }
    },
    
    voxelize: function(mesh, resolution) {
        const bounds = this._computeBoundsFromMesh(mesh);
        const size = Math.max(bounds.max.x-bounds.min.x, bounds.max.y-bounds.min.y, bounds.max.z-bounds.min.z);
        const cellSize = size / resolution;
        const voxels = new Set();
        for (const face of mesh.faces) {
            const v0 = mesh.vertices[face[0]], v1 = mesh.vertices[face[1]], v2 = mesh.vertices[face[2]];
            this._voxelizeTriangle(v0, v1, v2, bounds.min, cellSize, resolution, voxels);
        }
        return { voxels: Array.from(voxels).map(key => { const [x,y,z] = key.split(',').map(Number); return {x,y,z}; }), resolution, cellSize, bounds };
    },
    
    _voxelizeTriangle: function(v0, v1, v2, origin, cellSize, resolution, voxels) {
        const minX = Math.max(0, Math.floor((Math.min(v0.x,v1.x,v2.x)-origin.x)/cellSize));
        const minY = Math.max(0, Math.floor((Math.min(v0.y,v1.y,v2.y)-origin.y)/cellSize));
        const minZ = Math.max(0, Math.floor((Math.min(v0.z,v1.z,v2.z)-origin.z)/cellSize));
        const maxX = Math.min(resolution-1, Math.floor((Math.max(v0.x,v1.x,v2.x)-origin.x)/cellSize));
        const maxY = Math.min(resolution-1, Math.floor((Math.max(v0.y,v1.y,v2.y)-origin.y)/cellSize));
        const maxZ = Math.min(resolution-1, Math.floor((Math.max(v0.z,v1.z,v2.z)-origin.z)/cellSize));
        for (let z = minZ; z <= maxZ; z++) for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) voxels.add(`${x},${y},${z}`);
    },
    
    _sphereIntersectsBox: function(center, radius, box) {
        let distSq = 0;
        if (center.x < box.min.x) distSq += (box.min.x-center.x)**2;
        else if (center.x > box.max.x) distSq += (center.x-box.max.x)**2;
        if (center.y < box.min.y) distSq += (box.min.y-center.y)**2;
        else if (center.y > box.max.y) distSq += (center.y-box.max.y)**2;
        if (center.z < box.min.z) distSq += (box.min.z-center.z)**2;
        else if (center.z > box.max.z) distSq += (center.z-box.max.z)**2;
        return distSq <= radius * radius;
    },
    
    _computeBounds: function(points) {
        const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const p of points) { min.x = Math.min(min.x,p.x); min.y = Math.min(min.y,p.y); min.z = Math.min(min.z,p.z); max.x = Math.max(max.x,p.x); max.y = Math.max(max.y,p.y); max.z = Math.max(max.z,p.z); }
        return { min, max };
    },
    _computeBoundsFromMesh: function(mesh) { return this._computeBounds(mesh.vertices); },
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('octree.build', 'PRISM_OCTREE_3D.build');
            PRISM_GATEWAY.register('octree.radius', 'PRISM_OCTREE_3D.radiusSearch');
            PRISM_GATEWAY.register('octree.voxelize', 'PRISM_OCTREE_3D.voxelize');
        }
    }
}