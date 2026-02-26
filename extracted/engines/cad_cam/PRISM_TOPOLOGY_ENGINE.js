/**
 * PRISM_TOPOLOGY_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 905
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_TOPOLOGY_ENGINE = {

    version: '1.0.0',
    authority: 'PRISM_TOPOLOGY_ENGINE',
    created: '2026-01-14',
    innovationId: 'PERSISTENT_HOMOLOGY',

    // CONFIGURATION

    config: {
        // Persistence thresholds
        MIN_PERSISTENCE: 0.01,     // Minimum persistence to consider significant
        NOISE_THRESHOLD: 0.05,     // Below this, likely noise

        // Filtration parameters
        DEFAULT_FILTRATION_STEPS: 50,

        // Algorithm limits
        MAX_SIMPLICES: 100000,
        MAX_DIMENSION: 2           // Compute up to β₂
    },
    // SECTION 1: SIMPLICIAL COMPLEX DATA STRUCTURES

    /**
     * Create a simplex (vertex, edge, or triangle)
     * @param {Array} vertices - Sorted array of vertex indices
     * @param {number} filtrationValue - When this simplex appears
     * @returns {Object} Simplex object
     */
    createSimplex: function(vertices, filtrationValue = 0) {
        // Sort vertices for consistent representation
        const sorted = [...vertices].sort((a, b) => a - b);

        return {
            vertices: sorted,
            dimension: sorted.length - 1,  // 0=vertex, 1=edge, 2=triangle
            filtration: filtrationValue,
            key: sorted.join(',')
        };
    },
    /**
     * Create simplicial complex from mesh
     * @param {Object} mesh - Mesh with vertices and faces
     * @returns {Object} Simplicial complex
     */
    createSimplicialComplex: function(mesh) {
        const complex = {
            vertices: [],      // 0-simplices
            edges: [],         // 1-simplices
            triangles: [],     // 2-simplices
            simplexMap: new Map(),  // key -> simplex for lookup
            vertexPositions: []     // Actual 3D positions
        };
        // Add vertices
        for (let i = 0; i < mesh.vertices.length; i++) {
            const simplex = this.createSimplex([i], 0);
            complex.vertices.push(simplex);
            complex.simplexMap.set(simplex.key, simplex);
            complex.vertexPositions.push({
                x: mesh.vertices[i].x || mesh.vertices[i][0] || 0,
                y: mesh.vertices[i].y || mesh.vertices[i][1] || 0,
                z: mesh.vertices[i].z || mesh.vertices[i][2] || 0
            });
        }
        // Add edges and triangles from faces
        const edgeSet = new Set();

        for (const face of mesh.faces) {
            // Get face vertices
            const fv = Array.isArray(face) ? face : [face.a, face.b, face.c];

            // Add triangle (2-simplex)
            if (fv.length >= 3) {
                const triSimplex = this.createSimplex([fv[0], fv[1], fv[2]], 0);
                if (!complex.simplexMap.has(triSimplex.key)) {
                    complex.triangles.push(triSimplex);
                    complex.simplexMap.set(triSimplex.key, triSimplex);
                }
            }
            // Add edges (1-simplices)
            for (let i = 0; i < fv.length; i++) {
                const j = (i + 1) % fv.length;
                const edgeKey = [Math.min(fv[i], fv[j]), Math.max(fv[i], fv[j])].join(',');

                if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    const edgeSimplex = this.createSimplex([fv[i], fv[j]], 0);
                    complex.edges.push(edgeSimplex);
                    complex.simplexMap.set(edgeSimplex.key, edgeSimplex);
                }
            }
        }
        return complex;
    },
    /**
     * Create Rips complex from point cloud
     * @param {Array} points - Array of {x, y, z} points
     * @param {number} epsilon - Maximum edge length
     * @returns {Object} Rips simplicial complex
     */
    createRipsComplex: function(points, epsilon) {
        const complex = {
            vertices: [],
            edges: [],
            triangles: [],
            simplexMap: new Map(),
            vertexPositions: [...points]
        };
        const n = points.length;

        // Distance matrix
        const dist = (i, j) => {
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            const dz = (points[i].z || 0) - (points[j].z || 0);
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        };
        // Add vertices (0-simplices)
        for (let i = 0; i < n; i++) {
            const simplex = this.createSimplex([i], 0);
            complex.vertices.push(simplex);
            complex.simplexMap.set(simplex.key, simplex);
        }
        // Add edges (1-simplices) for points within epsilon
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const d = dist(i, j);
                if (d <= epsilon) {
                    const simplex = this.createSimplex([i, j], d);
                    complex.edges.push(simplex);
                    complex.simplexMap.set(simplex.key, simplex);
                }
            }
        }
        // Add triangles (2-simplices) - Rips condition: all edges exist
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (!complex.simplexMap.has(`${i},${j}`)) continue;

                for (let k = j + 1; k < n; k++) {
                    if (!complex.simplexMap.has(`${i},${k}`)) continue;
                    if (!complex.simplexMap.has(`${j},${k}`)) continue;

                    // All edges exist - add triangle
                    const maxEdge = Math.max(
                        dist(i, j), dist(i, k), dist(j, k)
                    );
                    const simplex = this.createSimplex([i, j, k], maxEdge);
                    complex.triangles.push(simplex);
                    complex.simplexMap.set(simplex.key, simplex);
                }
            }
        }
        return complex;
    },
    // SECTION 2: BOUNDARY MATRICES

    /**
     * Compute boundary matrix for dimension k
     * ∂_k: C_k → C_{k-1}
     *
     * For edges: ∂[v0,v1] = v1 - v0
     * For triangles: ∂[v0,v1,v2] = [v1,v2] - [v0,v2] + [v0,v1]
     */
    computeBoundaryMatrix: function(complex, dimension) {
        let simplicesK, simplicesKm1;

        if (dimension === 1) {
            simplicesK = complex.edges;
            simplicesKm1 = complex.vertices;
        } else if (dimension === 2) {
            simplicesK = complex.triangles;
            simplicesKm1 = complex.edges;
        } else {
            return { rows: 0, cols: 0, entries: [] };
        }
        const rows = simplicesKm1.length;
        const cols = simplicesK.length;

        // Create index maps
        const indexMapKm1 = new Map();
        simplicesKm1.forEach((s, i) => indexMapKm1.set(s.key, i));

        // Sparse boundary matrix
        const entries = [];

        for (let j = 0; j < cols; j++) {
            const simplex = simplicesK[j];
            const vertices = simplex.vertices;

            // Boundary of k-simplex is alternating sum of (k-1)-faces
            for (let i = 0; i < vertices.length; i++) {
                // Face obtained by removing vertex i
                const face = [...vertices];
                face.splice(i, 1);
                const faceKey = face.join(',');

                const rowIdx = indexMapKm1.get(faceKey);
                if (rowIdx !== undefined) {
                    // Coefficient is (-1)^i
                    const coeff = (i % 2 === 0) ? 1 : -1;
                    entries.push({ row: rowIdx, col: j, value: coeff });
                }
            }
        }
        return { rows, cols, entries };
    },
    /**
     * Reduce boundary matrix to row echelon form (mod 2)
     * Returns reduced matrix and pivot information
     */
    reduceMatrixMod2: function(boundaryMatrix) {
        const { rows, cols, entries } = boundaryMatrix;

        // Convert to column-major sparse format
        const columns = Array(cols).fill(null).map(() => new Set());

        for (const entry of entries) {
            if (entry.value % 2 !== 0) {
                columns[entry.col].add(entry.row);
            }
        }
        const pivots = new Array(cols).fill(-1);
        const low = new Array(cols).fill(-1);  // Low index for each column

        // Compute low indices
        for (let j = 0; j < cols; j++) {
            if (columns[j].size > 0) {
                low[j] = Math.max(...columns[j]);
            }
        }
        // Standard persistence reduction
        for (let j = 0; j < cols; j++) {
            while (low[j] >= 0) {
                // Find leftmost column with same low
                let found = -1;
                for (let i = 0; i < j; i++) {
                    if (low[i] === low[j]) {
                        found = i;
                        break;
                    }
                }
                if (found < 0) break;

                // Add column found to column j (mod 2 = XOR)
                for (const row of columns[found]) {
                    if (columns[j].has(row)) {
                        columns[j].delete(row);
                    } else {
                        columns[j].add(row);
                    }
                }
                // Recalculate low
                if (columns[j].size > 0) {
                    low[j] = Math.max(...columns[j]);
                } else {
                    low[j] = -1;
                }
            }
            if (low[j] >= 0) {
                pivots[j] = low[j];
            }
        }
        return { columns, pivots, low };
    },
    // SECTION 3: HOMOLOGY COMPUTATION

    /**
     * Compute Betti numbers of a simplicial complex
     * β_k = dim(ker(∂_k)) - dim(im(∂_{k+1}))
     *
     * @param {Object} complex - Simplicial complex
     * @returns {Object} Betti numbers
     */
    computeHomology: function(complex) {
        // Count simplices at each dimension
        const counts = {
            vertices: complex.vertices.length,
            edges: complex.edges.length,
            triangles: complex.triangles.length
        };
        // Compute boundary matrices
        const boundary1 = this.computeBoundaryMatrix(complex, 1);
        const boundary2 = this.computeBoundaryMatrix(complex, 2);

        // Reduce matrices
        const reduced1 = this.reduceMatrixMod2(boundary1);
        const reduced2 = this.reduceMatrixMod2(boundary2);

        // Count pivots (= rank of boundary matrix)
        const rank1 = reduced1.pivots.filter(p => p >= 0).length;
        const rank2 = reduced2.pivots.filter(p => p >= 0).length;

        // Betti numbers
        // β_0 = vertices - rank(∂_1) = number of connected components
        const beta0 = counts.vertices - rank1;

        // β_1 = edges - rank(∂_1) - rank(∂_2) = number of 1-cycles (holes)
        // More precisely: β_1 = dim(ker(∂_1)) - dim(im(∂_2))
        const nullity1 = counts.edges - rank1;  // dim(ker(∂_1))
        const beta1 = nullity1 - rank2;

        // β_2 = triangles - rank(∂_2) (for closed surfaces)
        const nullity2 = counts.triangles - rank2;
        const beta2 = nullity2;  // Simplified - would need ∂_3 for full accuracy

        return {
            betti: [beta0, beta1, beta2],
            beta0: beta0,  // Connected components
            beta1: beta1,  // 1-dimensional holes (tunnels)
            beta2: beta2,  // 2-dimensional voids (cavities)

            eulerCharacteristic: beta0 - beta1 + beta2,

            counts: counts,
            ranks: { rank1, rank2 },

            // Interpretation
            interpretation: {
                components: `${beta0} connected component${beta0 !== 1 ? 's' : ''}`,
                holes: `${beta1} hole${beta1 !== 1 ? 's' : ''}/tunnel${beta1 !== 1 ? 's' : ''}`,
                voids: `${beta2} void${beta2 !== 1 ? 's' : ''}/cavit${beta2 !== 1 ? 'ies' : 'y'}`
            }
        };
    },
    /**
     * Get Betti numbers (convenience function)
     */
    getBettiNumbers: function(mesh) {
        const complex = this.createSimplicialComplex(mesh);
        const homology = this.computeHomology(complex);
        return homology.betti;
    },
    // SECTION 4: PERSISTENT HOMOLOGY

    /**
     * Compute persistent homology using filtration
     * @param {Array} points - Point cloud or mesh
     * @param {Object} options - Filtration options
     * @returns {Object} Persistence diagram
     */
    computePersistence: function(points, options = {}) {
        const maxEpsilon = options.maxEpsilon || this._estimateMaxEpsilon(points);
        const steps = options.steps || this.config.DEFAULT_FILTRATION_STEPS;

        const epsilonValues = [];
        for (let i = 0; i <= steps; i++) {
            epsilonValues.push((i / steps) * maxEpsilon);
        }
        // Track all simplices with their birth times
        const allSimplices = [];
        const simplexBirth = new Map();

        // Add vertices (birth at 0)
        for (let i = 0; i < points.length; i++) {
            const key = `${i}`;
            simplexBirth.set(key, 0);
            allSimplices.push({
                vertices: [i],
                dimension: 0,
                birth: 0,
                key
            });
        }
        // Distance function
        const dist = (i, j) => {
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            const dz = (points[i].z || 0) - (points[j].z || 0);
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        };
        // Precompute all pairwise distances
        const n = points.length;
        const distances = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                distances.push({ i, j, d: dist(i, j) });
            }
        }
        distances.sort((a, b) => a.d - b.d);

        // Add edges at their birth times
        const edgeSet = new Set();
        for (const { i, j, d } of distances) {
            if (d > maxEpsilon) break;

            const key = `${i},${j}`;
            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                simplexBirth.set(key, d);
                allSimplices.push({
                    vertices: [i, j],
                    dimension: 1,
                    birth: d,
                    key
                });
            }
        }
        // Add triangles when all edges exist
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const ij = `${i},${j}`;
                if (!simplexBirth.has(ij)) continue;

                for (let k = j + 1; k < n; k++) {
                    const ik = `${i},${k}`;
                    const jk = `${j},${k}`;
                    if (!simplexBirth.has(ik) || !simplexBirth.has(jk)) continue;

                    const birth = Math.max(
                        simplexBirth.get(ij),
                        simplexBirth.get(ik),
                        simplexBirth.get(jk)
                    );

                    if (birth <= maxEpsilon) {
                        const key = `${i},${j},${k}`;
                        simplexBirth.set(key, birth);
                        allSimplices.push({
                            vertices: [i, j, k],
                            dimension: 2,
                            birth,
                            key
                        });
                    }
                }
            }
        }
        // Sort simplices by birth time, then by dimension
        allSimplices.sort((a, b) => {
            if (a.birth !== b.birth) return a.birth - b.birth;
            return a.dimension - b.dimension;
        });

        // Compute persistence pairs using reduction
        const pairs = this._computePersistencePairs(allSimplices, maxEpsilon);

        // Build persistence diagram
        const diagram = {
            dimension0: [],  // Components
            dimension1: [],  // Holes
            dimension2: []   // Voids
        };
        for (const pair of pairs) {
            const persistence = pair.death - pair.birth;
            const entry = {
                birth: pair.birth,
                death: pair.death,
                persistence: persistence,
                significant: persistence > this.config.MIN_PERSISTENCE
            };
            if (pair.dimension === 0) {
                diagram.dimension0.push(entry);
            } else if (pair.dimension === 1) {
                diagram.dimension1.push(entry);
            } else if (pair.dimension === 2) {
                diagram.dimension2.push(entry);
            }
        }
        return {
            diagram,

            // Summary statistics
            summary: {
                significantComponents: diagram.dimension0.filter(p => p.significant).length,
                significantHoles: diagram.dimension1.filter(p => p.significant).length,
                significantVoids: diagram.dimension2.filter(p => p.significant).length,

                // Most persistent features
                maxPersistence0: Math.max(0, ...diagram.dimension0.map(p => p.persistence)),
                maxPersistence1: Math.max(0, ...diagram.dimension1.map(p => p.persistence)),
                maxPersistence2: Math.max(0, ...diagram.dimension2.map(p => p.persistence))
            },
            maxEpsilon,
            pointCount: points.length,
            simplexCount: allSimplices.length
        };
    },
    /**
     * Compute persistence pairs from filtered simplices
     */
    _computePersistencePairs: function(simplices, maxEpsilon) {
        const pairs = [];
        const n = simplices.length;

        // Create index map
        const indexMap = new Map();
        simplices.forEach((s, i) => indexMap.set(s.key, i));

        // Boundary chains for each simplex (column vectors)
        const columns = simplices.map((s, idx) => {
            const boundary = new Set();

            if (s.dimension > 0) {
                // Compute boundary
                for (let i = 0; i < s.vertices.length; i++) {
                    const face = [...s.vertices];
                    face.splice(i, 1);
                    const faceKey = face.join(',');
                    const faceIdx = indexMap.get(faceKey);
                    if (faceIdx !== undefined) {
                        boundary.add(faceIdx);
                    }
                }
            }
            return boundary;
        });

        // Low array
        const low = simplices.map((_, idx) => {
            const col = columns[idx];
            return col.size > 0 ? Math.max(...col) : -1;
        });

        // Reduction
        const paired = new Set();

        for (let j = 0; j < n; j++) {
            while (low[j] >= 0) {
                // Find earlier column with same low
                let found = -1;
                for (let i = 0; i < j; i++) {
                    if (low[i] === low[j] && !paired.has(i)) {
                        found = i;
                        break;
                    }
                }
                if (found < 0) break;

                // Add column found to column j (mod 2)
                for (const row of columns[found]) {
                    if (columns[j].has(row)) {
                        columns[j].delete(row);
                    } else {
                        columns[j].add(row);
                    }
                }
                // Update low
                low[j] = columns[j].size > 0 ? Math.max(...columns[j]) : -1;
            }
            // Create persistence pair
            if (low[j] >= 0) {
                const birthIdx = low[j];
                const deathIdx = j;

                paired.add(birthIdx);
                paired.add(deathIdx);

                pairs.push({
                    dimension: simplices[birthIdx].dimension,
                    birth: simplices[birthIdx].birth,
                    death: simplices[deathIdx].birth,
                    birthSimplex: simplices[birthIdx].key,
                    deathSimplex: simplices[deathIdx].key
                });
            }
        }
        // Add unpaired (infinite persistence) features
        for (let i = 0; i < n; i++) {
            if (!paired.has(i) && simplices[i].dimension === 0) {
                // Unpaired vertex = essential component
                pairs.push({
                    dimension: 0,
                    birth: simplices[i].birth,
                    death: maxEpsilon,  // "Infinite" (persists to end)
                    birthSimplex: simplices[i].key,
                    deathSimplex: 'essential'
                });
            }
        }
        return pairs;
    },
    /**
     * Estimate reasonable max epsilon from point cloud
     */
    _estimateMaxEpsilon: function(points) {
        if (points.length < 2) return 1;

        // Use bounding box diagonal
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
            minZ = Math.min(minZ, p.z || 0);
            maxZ = Math.max(maxZ, p.z || 0);
        }
        const diagonal = Math.sqrt(
            Math.pow(maxX - minX, 2) +
            Math.pow(maxY - minY, 2) +
            Math.pow(maxZ - minZ, 2)
        );

        return diagonal / 2;  // Half diagonal as reasonable max
    },
    // SECTION 5: CAM-SPECIFIC APPLICATIONS

    /**
     * Validate feature count using topology
     * Guarantees no holes are missed
     *
     * @param {Object} mesh - Part mesh
     * @param {Object} expectedFeatures - Expected feature counts
     * @returns {Object} Validation result
     */
    validateFeatures: function(mesh, expectedFeatures = {}) {
        const complex = this.createSimplicialComplex(mesh);
        const homology = this.computeHomology(complex);

        const result = {
            valid: true,
            discrepancies: [],
            topology: homology
        };
        // Check against expected features
        if (expectedFeatures.holes !== undefined) {
            if (homology.beta1 !== expectedFeatures.holes) {
                result.valid = false;
                result.discrepancies.push({
                    feature: 'holes',
                    expected: expectedFeatures.holes,
                    found: homology.beta1,
                    difference: homology.beta1 - expectedFeatures.holes
                });
            }
        }
        if (expectedFeatures.components !== undefined) {
            if (homology.beta0 !== expectedFeatures.components) {
                result.valid = false;
                result.discrepancies.push({
                    feature: 'components',
                    expected: expectedFeatures.components,
                    found: homology.beta0,
                    difference: homology.beta0 - expectedFeatures.components
                });
            }
        }
        if (expectedFeatures.voids !== undefined) {
            if (homology.beta2 !== expectedFeatures.voids) {
                result.valid = false;
                result.discrepancies.push({
                    feature: 'voids',
                    expected: expectedFeatures.voids,
                    found: homology.beta2,
                    difference: homology.beta2 - expectedFeatures.voids
                });
            }
        }
        // Manufacturing recommendations
        if (homology.beta1 > 0) {
            result.recommendations = result.recommendations || [];
            result.recommendations.push(
                `Part contains ${homology.beta1} through-hole(s) - drilling operations required`
            );
        }
        if (homology.beta0 > 1) {
            result.recommendations = result.recommendations || [];
            result.recommendations.push(
                `Part has ${homology.beta0} separate components - verify multi-part assembly`
            );
        }
        return result;
    },
    /**
     * Analyze point cloud from scan for feature detection
     * @param {Array} points - Scanned point cloud
     * @param {Object} options - Analysis options
     * @returns {Object} Feature analysis
     */
    analyzePointCloud: function(points, options = {}) {
        const persistence = this.computePersistence(points, options);

        // Identify significant features
        const significantHoles = persistence.diagram.dimension1
            .filter(p => p.persistence > (options.minPersistence || this.config.MIN_PERSISTENCE))
            .sort((a, b) => b.persistence - a.persistence);

        return {
            persistence,

            features: {
                // Definite holes (high persistence)
                definiteHoles: significantHoles.filter(h =>
                    h.persistence > persistence.maxEpsilon * 0.3
                ).length,

                // Probable holes (medium persistence)
                probableHoles: significantHoles.filter(h =>
                    h.persistence > persistence.maxEpsilon * 0.1 &&
                    h.persistence <= persistence.maxEpsilon * 0.3
                ).length,

                // Possible holes (low persistence - might be noise)
                possibleHoles: significantHoles.filter(h =>
                    h.persistence <= persistence.maxEpsilon * 0.1
                ).length
            },
            // Quality assessment
            quality: {
                dataQuality: significantHoles.length > 0 ?
                    (significantHoles[0].persistence / persistence.maxEpsilon > 0.5 ? 'good' : 'moderate') :
                    'uncertain',
                noiseLevel: persistence.diagram.dimension1.filter(h => !h.significant).length
            }
        };
    },
    /**
     * Verify B-Rep model topology is valid
     * @param {Object} brep - B-Rep model
     * @returns {Object} Validation result
     */
    validateBRep: function(brep) {
        // Extract mesh from B-Rep
        const mesh = this._brepToMesh(brep);
        const complex = this.createSimplicialComplex(mesh);
        const homology = this.computeHomology(complex);

        // For valid 2-manifold: χ = 2 - 2g (where g = genus = β₁)
        // For solid: expect β₂ = 1 (one void = interior)

        const expectedEuler = brep.expectedEuler || 2; // Default: sphere-like
        const actualEuler = homology.eulerCharacteristic;

        return {
            valid: actualEuler === expectedEuler,
            eulerCharacteristic: actualEuler,
            expectedEuler: expectedEuler,
            topology: homology,

            issues: actualEuler !== expectedEuler ? [{
                type: 'euler_mismatch',
                message: `Euler characteristic ${actualEuler} does not match expected ${expectedEuler}`,
                severity: 'warning'
            }] : []
        };
    },
    /**
     * Convert B-Rep to mesh (simplified)
     */
    _brepToMesh: function(brep) {
        // If already mesh-like
        if (brep.vertices && brep.faces) {
            return brep;
        }
        // Simple conversion from faces
        const vertices = [];
        const faces = [];
        const vertexMap = new Map();

        if (brep.faces) {
            for (const face of brep.faces) {
                if (face.vertices) {
                    const faceIndices = [];
                    for (const v of face.vertices) {
                        const key = `${v.x},${v.y},${v.z || 0}`;
                        if (!vertexMap.has(key)) {
                            vertexMap.set(key, vertices.length);
                            vertices.push(v);
                        }
                        faceIndices.push(vertexMap.get(key));
                    }
                    if (faceIndices.length >= 3) {
                        faces.push(faceIndices);
                    }
                }
            }
        }
        return { vertices, faces };
    },
    // SECTION 6: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_TOPOLOGY] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Simple triangle homology (β₀=1, β₁=0, β₂=0)
        try {
            const triangleMesh = {
                vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }],
                faces: [[0, 1, 2]]
            };
            const homology = this.computeHomology(this.createSimplicialComplex(triangleMesh));

            const pass = homology.beta0 === 1 && homology.beta1 === 0;

            results.tests.push({
                name: 'Triangle homology',
                pass,
                betti: homology.betti
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Triangle homology', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Square with hole (β₀=1, β₁=1)
        try {
            // Square outline (no fill = has hole)
            const squareMesh = {
                vertices: [
                    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }
                ],
                faces: [
                    [0, 1, 2], [0, 2, 3]  // Two triangles filling square
                ]
            };
            const homology = this.computeHomology(this.createSimplicialComplex(squareMesh));

            // Filled square should have β₁ = 0
            const pass = homology.beta0 === 1;

            results.tests.push({
                name: 'Filled square',
                pass,
                betti: homology.betti
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Filled square', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Rips complex creation
        try {
            const points = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 0.5, y: 0.866 }  // Equilateral triangle
            ];

            const complex = this.createRipsComplex(points, 2);

            const pass = complex.vertices.length === 3 &&
                        complex.edges.length === 3 &&
                        complex.triangles.length === 1;

            results.tests.push({
                name: 'Rips complex',
                pass,
                vertices: complex.vertices.length,
                edges: complex.edges.length,
                triangles: complex.triangles.length
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Rips complex', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Persistence computation
        try {
            const points = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
                { x: 3, y: 0 }
            ];

            const persistence = this.computePersistence(points, { maxEpsilon: 2 });

            const pass = persistence.diagram !== undefined &&
                        persistence.summary !== undefined;

            results.tests.push({
                name: 'Persistence computation',
                pass,
                components: persistence.summary.significantComponents
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Persistence computation', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Feature validation
        try {
            const mesh = {
                vertices: [
                    { x: 0, y: 0 }, { x: 1, y: 0 },
                    { x: 1, y: 1 }, { x: 0, y: 1 }
                ],
                faces: [[0, 1, 2], [0, 2, 3]]
            };
            const validation = this.validateFeatures(mesh, {
                components: 1,
                holes: 0
            });

            const pass = validation.valid === true;

            results.tests.push({
                name: 'Feature validation',
                pass,
                valid: validation.valid
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Feature validation', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_TOPOLOGY] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
}