const PRISM_VORONOI_3D_ENGINE = {
    name: 'PRISM_VORONOI_3D_ENGINE',
    version: '1.0.0',
    source: 'MIT 18.086, Fortune 1987',
    
    /**
     * Compute Voronoi diagram as dual of Delaunay
     */
    compute: function(points) {
        // First compute Delaunay tetrahedralization
        const delaunay = PRISM_DELAUNAY_3D_ENGINE.tetrahedralize(points);
        
        // Voronoi vertices are Delaunay circumcenters
        const voronoiVertices = delaunay.tetrahedra.map(tet => tet.circumcenter);
        
        // Build adjacency: which tetrahedra share faces
        const tetAdjacency = this._buildTetrahedraAdjacency(delaunay.tetrahedra);
        
        // Voronoi edges connect circumcenters of adjacent tetrahedra
        const voronoiEdges = [];
        for (const [tetIdx, neighbors] of tetAdjacency.entries()) {
            for (const neighborIdx of neighbors) {
                if (neighborIdx > tetIdx) { // Avoid duplicates
                    voronoiEdges.push({
                        start: tetIdx,
                        end: neighborIdx
                    });
                }
            }
        }
        
        // Build Voronoi cells for each point
        const cells = this._buildVoronoiCells(points, delaunay, tetAdjacency);
        
        return {
            vertices: voronoiVertices,
            edges: voronoiEdges,
            cells,
            sites: points
        };
    },
    
    /**
     * Get Voronoi cell for a specific point
     */
    getCell: function(voronoi, pointIdx) {
        if (pointIdx < 0 || pointIdx >= voronoi.cells.length) return null;
        return voronoi.cells[pointIdx];
    },
    
    /**
     * Find which cell contains a query point
     */
    findCell: function(voronoi, query) {
        let bestIdx = 0;
        let bestDist = this._distance(query, voronoi.sites[0]);
        
        for (let i = 1; i < voronoi.sites.length; i++) {
            const d = this._distance(query, voronoi.sites[i]);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        
        return bestIdx;
    },
    
    _buildTetrahedraAdjacency: function(tetrahedra) {
        const faceToTet = new Map();
        const adjacency = new Map();
        
        for (let i = 0; i < tetrahedra.length; i++) {
            adjacency.set(i, new Set());
        }
        
        for (let i = 0; i < tetrahedra.length; i++) {
            const v = tetrahedra[i].vertices;
            const faces = [
                [v[0], v[1], v[2]],
                [v[0], v[1], v[3]],
                [v[0], v[2], v[3]],
                [v[1], v[2], v[3]]
            ];
            
            for (const face of faces) {
                const key = face.slice().sort((a, b) => a - b).join(',');
                
                if (faceToTet.has(key)) {
                    const j = faceToTet.get(key);
                    adjacency.get(i).add(j);
                    adjacency.get(j).add(i);
                } else {
                    faceToTet.set(key, i);
                }
            }
        }
        
        return adjacency;
    },
    
    _buildVoronoiCells: function(points, delaunay, adjacency) {
        const cells = Array.from({ length: points.length }, () => ({
            vertices: [],
            faces: [],
            neighbors: new Set()
        }));
        
        // Find which tetrahedra contain each point
        for (let i = 0; i < delaunay.tetrahedra.length; i++) {
            const tet = delaunay.tetrahedra[i];
            for (const v of tet.vertices) {
                cells[v].vertices.push(i); // Voronoi vertex = tet index
            }
        }
        
        // Find neighbors from shared edges
        for (let i = 0; i < delaunay.tetrahedra.length; i++) {
            const tet = delaunay.tetrahedra[i];
            const v = tet.vertices;
            
            // Each edge of tet connects two point cells as neighbors
            const edges = [
                [v[0], v[1]], [v[0], v[2]], [v[0], v[3]],
                [v[1], v[2]], [v[1], v[3]], [v[2], v[3]]
            ];
            
            for (const [a, b] of edges) {
                cells[a].neighbors.add(b);
                cells[b].neighbors.add(a);
            }
        }
        
        // Convert neighbor sets to arrays
        for (const cell of cells) {
            cell.neighbors = Array.from(cell.neighbors);
        }
        
        return cells;
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
}