// PRISM_COLLISION_MOTION - Lines 745750-747044 (1295 lines) - Motion collision analysis\n\nconst PRISM_COLLISION_MOTION = {

    version: '1.0.0',
    phase: 'Phase 4: Collision & Motion Planning',
    created: '2026-01-14',

    // SECTION 1: GJK ALGORITHM (Gilbert-Johnson-Keerthi)
    // Source: Gilbert et al. (1988), PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: Fast convex collision detection in O(n) time

    gjk: {
        name: "GJK Collision Detection",
        description: "O(n) collision detection using Minkowski difference and simplex iteration",

        // Vector Operations

        dot: function(a, b) {
            return a[0]*b[0] + a[1]*b[1] + (a[2]||0)*(b[2]||0);
        },
        sub: function(a, b) {
            return [a[0]-b[0], a[1]-b[1], (a[2]||0)-(b[2]||0)];
        },
        add: function(a, b) {
            return [a[0]+b[0], a[1]+b[1], (a[2]||0)+(b[2]||0)];
        },
        negate: function(a) {
            return [-a[0], -a[1], -(a[2]||0)];
        },
        scale: function(a, s) {
            return [a[0]*s, a[1]*s, (a[2]||0)*s];
        },
        cross: function(a, b) {
            return [
                a[1]*(b[2]||0) - (a[2]||0)*b[1],
                (a[2]||0)*b[0] - a[0]*(b[2]||0),
                a[0]*b[1] - a[1]*b[0]
            ];
        },
        lengthSq: function(a) {
            return a[0]*a[0] + a[1]*a[1] + (a[2]||0)*(a[2]||0);
        },
        length: function(a) {
            return Math.sqrt(this.lengthSq(a));
        },
        normalize: function(a) {
            const len = this.length(a);
            if (len < 1e-10) return [1, 0, 0];
            return [a[0]/len, a[1]/len, (a[2]||0)/len];
        },
        // Triple product: (A × B) × C
        tripleProduct: function(a, b, c) {
            // (A × B) × C = B(A·C) - A(B·C)
            const ac = this.dot(a, c);
            const bc = this.dot(b, c);
            return this.sub(this.scale(b, ac), this.scale(a, bc));
        },
        // Support Functions

        /**
         * Find support point of shape in given direction
         * @param {Object} shape - Shape with vertices array
         * @param {Array} direction - Direction vector
         */
        supportPoint: function(shape, direction) {
            let maxDot = -Infinity;
            let support = null;

            for (const v of shape.vertices) {
                const d = this.dot(v, direction);
                if (d > maxDot) {
                    maxDot = d;
                    support = v;
                }
            }
            return support;
        },
        /**
         * Support function for Minkowski difference A - B
         * support(A-B, d) = support(A, d) - support(B, -d)
         */
        support: function(shapeA, shapeB, direction) {
            const pointA = this.supportPoint(shapeA, direction);
            const pointB = this.supportPoint(shapeB, this.negate(direction));
            return {
                point: this.sub(pointA, pointB),
                supportA: pointA,
                supportB: pointB
            };
        },
        // Simplex Handling

        /**
         * Handle line simplex (2 points)
         * Returns true if origin is contained, or updates simplex and direction
         */
        handleLine: function(simplex, direction) {
            const a = simplex[1]; // Most recently added
            const b = simplex[0];

            const ab = this.sub(b, a);
            const ao = this.negate(a);

            if (this.dot(ab, ao) > 0) {
                // Origin is in region AB
                // Direction perpendicular to AB, toward origin
                const newDir = this.tripleProduct(ab, ao, ab);
                direction[0] = newDir[0];
                direction[1] = newDir[1];
                direction[2] = newDir[2] || 0;
            } else {
                // Origin is in region A
                simplex.length = 0;
                simplex.push(a);
                direction[0] = ao[0];
                direction[1] = ao[1];
                direction[2] = ao[2] || 0;
            }
            return false;
        },
        /**
         * Handle triangle simplex (3 points) - 2D version
         */
        handleTriangle2D: function(simplex, direction) {
            const a = simplex[2]; // Most recently added
            const b = simplex[1];
            const c = simplex[0];

            const ab = this.sub(b, a);
            const ac = this.sub(c, a);
            const ao = this.negate(a);

            // Check if origin is outside edge AB
            const abPerp = this.tripleProduct(ac, ab, ab);
            if (this.dot(abPerp, ao) > 0) {
                // Origin is outside AB
                simplex.length = 0;
                simplex.push(b, a);
                direction[0] = abPerp[0];
                direction[1] = abPerp[1];
                direction[2] = 0;
                return false;
            }
            // Check if origin is outside edge AC
            const acPerp = this.tripleProduct(ab, ac, ac);
            if (this.dot(acPerp, ao) > 0) {
                // Origin is outside AC
                simplex.length = 0;
                simplex.push(c, a);
                direction[0] = acPerp[0];
                direction[1] = acPerp[1];
                direction[2] = 0;
                return false;
            }
            // Origin is inside triangle
            return true;
        },
        /**
         * Handle triangle simplex (3 points) - 3D version
         */
        handleTriangle3D: function(simplex, direction) {
            const a = simplex[2];
            const b = simplex[1];
            const c = simplex[0];

            const ab = this.sub(b, a);
            const ac = this.sub(c, a);
            const ao = this.negate(a);
            const abc = this.cross(ab, ac);

            // Check if origin is above or below triangle plane
            if (this.dot(this.cross(abc, ac), ao) > 0) {
                if (this.dot(ac, ao) > 0) {
                    simplex.length = 0;
                    simplex.push(c, a);
                    const newDir = this.tripleProduct(ac, ao, ac);
                    direction[0] = newDir[0];
                    direction[1] = newDir[1];
                    direction[2] = newDir[2];
                } else {
                    return this.handleLine([b, a], direction) || (() => {
                        simplex.length = 0;
                        simplex.push(b, a);
                        return false;
                    })();
                }
            } else {
                if (this.dot(this.cross(ab, abc), ao) > 0) {
                    return this.handleLine([b, a], direction) || (() => {
                        simplex.length = 0;
                        simplex.push(b, a);
                        return false;
                    })();
                } else {
                    if (this.dot(abc, ao) > 0) {
                        direction[0] = abc[0];
                        direction[1] = abc[1];
                        direction[2] = abc[2];
                    } else {
                        simplex.length = 0;
                        simplex.push(b, c, a);
                        const negAbc = this.negate(abc);
                        direction[0] = negAbc[0];
                        direction[1] = negAbc[1];
                        direction[2] = negAbc[2];
                    }
                }
            }
            return false;
        },
        /**
         * Handle tetrahedron simplex (4 points)
         */
        handleTetrahedron: function(simplex, direction) {
            const a = simplex[3];
            const b = simplex[2];
            const c = simplex[1];
            const d = simplex[0];

            const ab = this.sub(b, a);
            const ac = this.sub(c, a);
            const ad = this.sub(d, a);
            const ao = this.negate(a);

            const abc = this.cross(ab, ac);
            const acd = this.cross(ac, ad);
            const adb = this.cross(ad, ab);

            // Check each face
            if (this.dot(abc, ao) > 0) {
                simplex.length = 0;
                simplex.push(c, b, a);
                return this.handleTriangle3D(simplex, direction);
            }
            if (this.dot(acd, ao) > 0) {
                simplex.length = 0;
                simplex.push(d, c, a);
                return this.handleTriangle3D(simplex, direction);
            }
            if (this.dot(adb, ao) > 0) {
                simplex.length = 0;
                simplex.push(b, d, a);
                return this.handleTriangle3D(simplex, direction);
            }
            // Origin is inside tetrahedron
            return true;
        },
        /**
         * Process simplex and update direction
         */
        doSimplex: function(simplex, direction, is3D = true) {
            switch (simplex.length) {
                case 2:
                    return this.handleLine(simplex, direction);
                case 3:
                    return is3D ?
                        this.handleTriangle3D(simplex, direction) :
                        this.handleTriangle2D(simplex, direction);
                case 4:
                    return this.handleTetrahedron(simplex, direction);
            }
            return false;
        },
        // Main GJK Algorithm

        /**
         * Check if two convex shapes intersect
         * @param {Object} shapeA - First shape with vertices array
         * @param {Object} shapeB - Second shape with vertices array
         * @param {boolean} is3D - Whether to use 3D algorithm
         * @returns {Object} { intersects, simplex, iterations }
         */
        intersects: function(shapeA, shapeB, is3D = true) {
            // Initial direction
            const direction = [1, 0, 0];

            // Get initial support point
            const supportResult = this.support(shapeA, shapeB, direction);
            const simplex = [supportResult.point];

            // New direction toward origin
            direction[0] = -supportResult.point[0];
            direction[1] = -supportResult.point[1];
            direction[2] = -(supportResult.point[2] || 0);

            const maxIterations = 100;

            for (let i = 0; i < maxIterations; i++) {
                // Get new support point
                const newSupport = this.support(shapeA, shapeB, direction);

                // Check if we passed the origin
                if (this.dot(newSupport.point, direction) < 0) {
                    // No intersection
                    return {
                        intersects: false,
                        simplex,
                        iterations: i + 1,
                        closestDistance: this.length(newSupport.point)
                    };
                }
                // Add to simplex
                simplex.push(newSupport.point);

                // Update simplex and direction
                if (this.doSimplex(simplex, direction, is3D)) {
                    // Origin is contained in simplex
                    return {
                        intersects: true,
                        simplex,
                        iterations: i + 1
                    };
                }
            }
            return {
                intersects: false,
                simplex,
                iterations: maxIterations,
                reason: 'max_iterations'
            };
        },
        // Shape Constructors

        createSphere: function(center, radius, segments = 16) {
            const vertices = [];
            for (let i = 0; i <= segments; i++) {
                const phi = Math.PI * i / segments;
                for (let j = 0; j < segments * 2; j++) {
                    const theta = Math.PI * j / segments;
                    vertices.push([
                        center[0] + radius * Math.sin(phi) * Math.cos(theta),
                        center[1] + radius * Math.sin(phi) * Math.sin(theta),
                        center[2] + radius * Math.cos(phi)
                    ]);
                }
            }
            return { vertices, type: 'sphere', center, radius };
        },
        createBox: function(min, max) {
            return {
                vertices: [
                    [min[0], min[1], min[2]],
                    [max[0], min[1], min[2]],
                    [min[0], max[1], min[2]],
                    [max[0], max[1], min[2]],
                    [min[0], min[1], max[2]],
                    [max[0], min[1], max[2]],
                    [min[0], max[1], max[2]],
                    [max[0], max[1], max[2]]
                ],
                type: 'box',
                min,
                max
            };
        },
        createCylinder: function(base, axis, radius, height, segments = 16) {
            const vertices = [];
            const axisNorm = this.normalize(axis);

            // Find perpendicular vectors
            let perp1 = this.cross(axisNorm, [1, 0, 0]);
            if (this.lengthSq(perp1) < 0.01) {
                perp1 = this.cross(axisNorm, [0, 1, 0]);
            }
            perp1 = this.normalize(perp1);
            const perp2 = this.cross(axisNorm, perp1);

            // Generate vertices
            for (let h = 0; h <= 1; h++) {
                for (let i = 0; i < segments; i++) {
                    const theta = 2 * Math.PI * i / segments;
                    const offset = this.add(
                        this.scale(perp1, radius * Math.cos(theta)),
                        this.scale(perp2, radius * Math.sin(theta))
                    );
                    const heightOffset = this.scale(axisNorm, h * height);
                    vertices.push(this.add(this.add(base, offset), heightOffset));
                }
            }
            return { vertices, type: 'cylinder', base, axis, radius, height };
        },
        createConvexHull: function(points) {
            return { vertices: points, type: 'convex_hull' };
        },
        prismApplication: "CollisionDetectionEngine - fast convex collision check"
    },
    // SECTION 2: EPA ALGORITHM (Expanding Polytope Algorithm)
    // Source: Van den Bergen (2001), PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: Compute penetration depth and contact normal

    epa: {
        name: "EPA Penetration Depth",
        description: "Compute exact penetration depth and contact normal from GJK simplex",

        /**
         * Create initial polytope from GJK simplex
         */
        createInitialPolytope: function(simplex, shapeA, shapeB) {
            // Ensure we have a tetrahedron
            if (simplex.length < 4) {
                // Expand simplex to tetrahedron
                // This is a simplified version
                while (simplex.length < 4) {
                    const directions = [[1,0,0], [0,1,0], [0,0,1], [-1,0,0], [0,-1,0], [0,0,-1]];
                    for (const d of directions) {
                        const support = PRISM_COLLISION_MOTION.gjk.support(shapeA, shapeB, d);
                        let isDuplicate = false;
                        for (const s of simplex) {
                            if (Math.abs(s[0] - support.point[0]) < 1e-6 &&
                                Math.abs(s[1] - support.point[1]) < 1e-6 &&
                                Math.abs(s[2] - support.point[2]) < 1e-6) {
                                isDuplicate = true;
                                break;
                            }
                        }
                        if (!isDuplicate) {
                            simplex.push(support.point);
                            if (simplex.length >= 4) break;
                        }
                    }
                    if (simplex.length < 4) break; // Can't expand further
                }
            }
            if (simplex.length < 4) {
                return null; // Can't create tetrahedron
            }
            // Create faces (outward-facing)
            const [a, b, c, d] = simplex;

            const faces = [
                { vertices: [a, b, c], indices: [0, 1, 2] },
                { vertices: [a, c, d], indices: [0, 2, 3] },
                { vertices: [a, d, b], indices: [0, 3, 1] },
                { vertices: [b, d, c], indices: [1, 3, 2] }
            ];

            // Compute face normals
            for (const face of faces) {
                const v0 = face.vertices[0];
                const v1 = face.vertices[1];
                const v2 = face.vertices[2];

                const e1 = PRISM_COLLISION_MOTION.gjk.sub(v1, v0);
                const e2 = PRISM_COLLISION_MOTION.gjk.sub(v2, v0);
                face.normal = PRISM_COLLISION_MOTION.gjk.normalize(
                    PRISM_COLLISION_MOTION.gjk.cross(e1, e2)
                );

                // Distance from origin to face plane
                face.distance = PRISM_COLLISION_MOTION.gjk.dot(face.normal, v0);

                // Ensure normal points away from origin
                if (face.distance < 0) {
                    face.normal = PRISM_COLLISION_MOTION.gjk.negate(face.normal);
                    face.distance = -face.distance;
                    face.vertices.reverse();
                }
            }
            return { vertices: [...simplex], faces };
        },
        /**
         * Find closest face to origin
         */
        findClosestFace: function(polytope) {
            let minDist = Infinity;
            let closestFace = null;

            for (const face of polytope.faces) {
                if (face.distance < minDist) {
                    minDist = face.distance;
                    closestFace = face;
                }
            }
            return closestFace;
        },
        /**
         * Main EPA algorithm
         */
        computePenetration: function(shapeA, shapeB, initialSimplex, maxIterations = 100) {
            // Create initial polytope
            const polytope = this.createInitialPolytope(initialSimplex, shapeA, shapeB);

            if (!polytope) {
                return {
                    depth: 0,
                    normal: [0, 0, 1],
                    contactPoint: [0, 0, 0],
                    error: 'Could not create initial polytope'
                };
            }
            const tolerance = 1e-6;

            for (let i = 0; i < maxIterations; i++) {
                // Find closest face to origin
                const closestFace = this.findClosestFace(polytope);

                if (!closestFace) {
                    return {
                        depth: 0,
                        normal: [0, 0, 1],
                        error: 'No faces in polytope'
                    };
                }
                // Get support point in direction of face normal
                const support = PRISM_COLLISION_MOTION.gjk.support(
                    shapeA, shapeB, closestFace.normal
                );

                const d = PRISM_COLLISION_MOTION.gjk.dot(support.point, closestFace.normal);

                // Check for convergence
                if (d - closestFace.distance < tolerance) {
                    // Converged
                    return {
                        depth: closestFace.distance,
                        normal: closestFace.normal,
                        contactPoint: PRISM_COLLISION_MOTION.gjk.scale(
                            closestFace.normal,
                            closestFace.distance
                        ),
                        iterations: i + 1
                    };
                }
                // Expand polytope with new point
                this.expandPolytope(polytope, support.point);
            }
            // Return best result after max iterations
            const closestFace = this.findClosestFace(polytope);
            return {
                depth: closestFace ? closestFace.distance : 0,
                normal: closestFace ? closestFace.normal : [0, 0, 1],
                iterations: maxIterations,
                warning: 'Max iterations reached'
            };
        },
        /**
         * Expand polytope with new support point
         */
        expandPolytope: function(polytope, newPoint) {
            // Find and remove faces visible from new point
            const visibleFaces = [];
            const edges = [];

            for (let i = polytope.faces.length - 1; i >= 0; i--) {
                const face = polytope.faces[i];
                const toPoint = PRISM_COLLISION_MOTION.gjk.sub(newPoint, face.vertices[0]);

                if (PRISM_COLLISION_MOTION.gjk.dot(face.normal, toPoint) > 0) {
                    // Face is visible from new point - remove it
                    visibleFaces.push(face);

                    // Add edges (will remove shared edges later)
                    for (let j = 0; j < 3; j++) {
                        edges.push([
                            face.vertices[j],
                            face.vertices[(j + 1) % 3]
                        ]);
                    }
                    polytope.faces.splice(i, 1);
                }
            }
            // Find boundary edges (edges that appear only once)
            const boundaryEdges = [];
            for (let i = 0; i < edges.length; i++) {
                let isShared = false;
                for (let j = 0; j < edges.length; j++) {
                    if (i === j) continue;

                    // Check if edges are the same (in either direction)
                    const e1 = edges[i];
                    const e2 = edges[j];

                    if ((this.pointsEqual(e1[0], e2[0]) && this.pointsEqual(e1[1], e2[1])) ||
                        (this.pointsEqual(e1[0], e2[1]) && this.pointsEqual(e1[1], e2[0]))) {
                        isShared = true;
                        break;
                    }
                }
                if (!isShared) {
                    boundaryEdges.push(edges[i]);
                }
            }
            // Create new faces from boundary edges to new point
            polytope.vertices.push(newPoint);

            for (const edge of boundaryEdges) {
                const newFace = {
                    vertices: [edge[0], edge[1], newPoint]
                };
                const e1 = PRISM_COLLISION_MOTION.gjk.sub(edge[1], edge[0]);
                const e2 = PRISM_COLLISION_MOTION.gjk.sub(newPoint, edge[0]);
                newFace.normal = PRISM_COLLISION_MOTION.gjk.normalize(
                    PRISM_COLLISION_MOTION.gjk.cross(e1, e2)
                );
                newFace.distance = PRISM_COLLISION_MOTION.gjk.dot(newFace.normal, edge[0]);

                if (newFace.distance < 0) {
                    newFace.normal = PRISM_COLLISION_MOTION.gjk.negate(newFace.normal);
                    newFace.distance = -newFace.distance;
                    newFace.vertices.reverse();
                }
                polytope.faces.push(newFace);
            }
        },
        pointsEqual: function(a, b, tolerance = 1e-6) {
            return Math.abs(a[0] - b[0]) < tolerance &&
                   Math.abs(a[1] - b[1]) < tolerance &&
                   Math.abs((a[2]||0) - (b[2]||0)) < tolerance;
        },
        prismApplication: "PenetrationDepthEngine - contact resolution, physics simulation"
    },
    // SECTION 3: RRT* (Rapidly-exploring Random Trees Star)
    // Source: Karaman & Frazzoli (2011), CMU 16-782, PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: Asymptotically optimal motion planning

    rrtStar: {
        name: "RRT* Motion Planning",
        description: "Asymptotically optimal path planning with rewiring",

        /**
         * Sample random point in configuration space
         */
        sampleRandom: function(bounds, goalBias = 0.1, goal = null) {
            if (goal && Math.random() < goalBias) {
                return [...goal];
            }
            return [
                bounds.min[0] + Math.random() * (bounds.max[0] - bounds.min[0]),
                bounds.min[1] + Math.random() * (bounds.max[1] - bounds.min[1]),
                bounds.min[2] !== undefined ?
                    bounds.min[2] + Math.random() * (bounds.max[2] - bounds.min[2]) : undefined
            ].filter(x => x !== undefined);
        },
        /**
         * Find nearest node in tree
         */
        findNearest: function(tree, point) {
            let minDist = Infinity;
            let nearest = null;

            for (const node of tree) {
                const dist = this.distance(node.position, point);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = node;
                }
            }
            return nearest;
        },
        /**
         * Euclidean distance
         */
        distance: function(a, b) {
            let sum = 0;
            for (let i = 0; i < a.length; i++) {
                sum += (a[i] - b[i]) ** 2;
            }
            return Math.sqrt(sum);
        },
        /**
         * Steer from one point toward another
         */
        steer: function(from, to, stepSize) {
            const dist = this.distance(from, to);
            if (dist <= stepSize) return [...to];

            const ratio = stepSize / dist;
            return from.map((v, i) => v + ratio * (to[i] - v));
        },
        /**
         * Find nearby nodes within radius
         */
        findNearby: function(tree, point, radius) {
            return tree.filter(node => this.distance(node.position, point) <= radius);
        },
        /**
         * Check if path is collision-free
         */
        isCollisionFree: function(from, to, obstacles, checkFn = null) {
            if (checkFn) {
                return checkFn(from, to);
            }
            // Default: line-of-sight check with obstacles
            const steps = 10;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const point = from.map((v, j) => v + t * (to[j] - v));

                for (const obs of obstacles) {
                    if (this.pointInObstacle(point, obs)) {
                        return false;
                    }
                }
            }
            return true;
        },
        /**
         * Check if point is inside obstacle
         */
        pointInObstacle: function(point, obstacle) {
            if (obstacle.type === 'sphere') {
                const dist = this.distance(point, obstacle.center);
                return dist < obstacle.radius;
            }
            if (obstacle.type === 'box') {
                return point[0] >= obstacle.min[0] && point[0] <= obstacle.max[0] &&
                       point[1] >= obstacle.min[1] && point[1] <= obstacle.max[1] &&
                       (point.length < 3 || (point[2] >= obstacle.min[2] && point[2] <= obstacle.max[2]));
            }
            return false;
        },
        /**
         * Choose best parent from nearby nodes
         */
        chooseBestParent: function(newPosition, nearby, obstacles, checkFn) {
            let bestParent = null;
            let bestCost = Infinity;

            for (const node of nearby) {
                if (this.isCollisionFree(node.position, newPosition, obstacles, checkFn)) {
                    const cost = node.cost + this.distance(node.position, newPosition);
                    if (cost < bestCost) {
                        bestCost = cost;
                        bestParent = node;
                    }
                }
            }
            return { parent: bestParent, cost: bestCost };
        },
        /**
         * Rewire tree to improve paths
         */
        rewireTree: function(tree, newNode, nearby, obstacles, checkFn) {
            for (const node of nearby) {
                if (node === newNode.parent) continue;

                const newCost = newNode.cost + this.distance(newNode.position, node.position);

                if (newCost < node.cost &&
                    this.isCollisionFree(newNode.position, node.position, obstacles, checkFn)) {
                    node.parent = newNode;
                    node.cost = newCost;
                }
            }
        },
        /**
         * Extract path from tree
         */
        extractPath: function(node) {
            const path = [];
            let current = node;

            while (current) {
                path.unshift([...current.position]);
                current = current.parent;
            }
            return path;
        },
        /**
         * Main RRT* algorithm
         * @param {Array} start - Start position
         * @param {Array} goal - Goal position
         * @param {Array} obstacles - Array of obstacles
         * @param {Object} config - Configuration parameters
         */
        plan: function(start, goal, obstacles = [], config = {}) {
            const {
                maxIterations = 1000,
                stepSize = 1.0,
                goalThreshold = 0.5,
                bounds = { min: [0, 0, 0], max: [100, 100, 100] },
                goalBias = 0.1,
                rewireRadius = null,
                collisionCheck = null
            } = config;

            // Initialize tree with start node
            const tree = [{
                position: [...start],
                parent: null,
                cost: 0
            }];

            let bestGoalNode = null;
            let bestGoalCost = Infinity;

            for (let i = 0; i < maxIterations; i++) {
                // Sample random point
                const randomPoint = this.sampleRandom(bounds, goalBias, goal);

                // Find nearest node
                const nearest = this.findNearest(tree, randomPoint);

                // Steer toward random point
                const newPosition = this.steer(nearest.position, randomPoint, stepSize);

                // Check if collision-free
                if (!this.isCollisionFree(nearest.position, newPosition, obstacles, collisionCheck)) {
                    continue;
                }
                // Find nearby nodes for rewiring
                const radius = rewireRadius || Math.min(
                    stepSize * 3,
                    50 * Math.pow(Math.log(tree.length + 1) / (tree.length + 1), 1/start.length)
                );
                const nearby = this.findNearby(tree, newPosition, radius);

                // Choose best parent
                const { parent: bestParent, cost: bestCost } =
                    this.chooseBestParent(newPosition, nearby, obstacles, collisionCheck);

                if (!bestParent) {
                    // Use nearest as parent
                    const cost = nearest.cost + this.distance(nearest.position, newPosition);
                    const newNode = {
                        position: newPosition,
                        parent: nearest,
                        cost
                    };
                    tree.push(newNode);
                } else {
                    const newNode = {
                        position: newPosition,
                        parent: bestParent,
                        cost: bestCost
                    };
                    tree.push(newNode);

                    // Rewire nearby nodes
                    this.rewireTree(tree, newNode, nearby, obstacles, collisionCheck);
                }
                // Check if goal is reached
                const lastNode = tree[tree.length - 1];
                const distToGoal = this.distance(lastNode.position, goal);

                if (distToGoal < goalThreshold && lastNode.cost < bestGoalCost) {
                    bestGoalNode = lastNode;
                    bestGoalCost = lastNode.cost;
                }
            }
            if (bestGoalNode) {
                return {
                    success: true,
                    path: this.extractPath(bestGoalNode),
                    cost: bestGoalCost,
                    treeSize: tree.length
                };
            }
            // Return path to closest node to goal
            const closestToGoal = this.findNearest(tree, goal);
            return {
                success: false,
                path: this.extractPath(closestToGoal),
                cost: closestToGoal.cost,
                distanceToGoal: this.distance(closestToGoal.position, goal),
                treeSize: tree.length
            };
        },
        // Manufacturing Applications

        /**
         * Plan tool approach path
         */
        planToolApproach: function(startPos, featureAccess, obstacles, config = {}) {
            return this.plan(startPos, featureAccess, obstacles, {
                ...config,
                goalBias: 0.2 // Higher bias toward goal for approach paths
            });
        },
        /**
         * Plan 5-axis tool orientation path
         */
        plan5AxisPath: function(startConfig, endConfig, collisionCheck) {
            // Configuration: [x, y, z, i, j, k] (position + axis)
            return this.plan(startConfig, endConfig, [], {
                maxIterations: 2000,
                stepSize: 0.5,
                goalThreshold: 0.1,
                bounds: {
                    min: [-100, -100, -100, -1, -1, -1],
                    max: [100, 100, 100, 1, 1, 1]
                },
                collisionCheck
            });
        },
        prismApplication: "ToolpathPlanningEngine - collision-free approach, 5-axis paths"
    },
    // SECTION 4: MULTI-HEURISTIC A* (MHA*)
    // Source: CMU 16-782, PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: Multi-objective pathfinding with multiple heuristics

    multiHeuristicAStar: {
        name: "Multi-Heuristic A*",
        description: "Use multiple heuristics for faster search in complex spaces",

        /**
         * Standard heuristics
         */
        heuristics: {
            euclidean: function(a, b) {
                let sum = 0;
                for (let i = 0; i < a.length; i++) {
                    sum += (a[i] - b[i]) ** 2;
                }
                return Math.sqrt(sum);
            },
            manhattan: function(a, b) {
                let sum = 0;
                for (let i = 0; i < a.length; i++) {
                    sum += Math.abs(a[i] - b[i]);
                }
                return sum;
            },
            diagonal: function(a, b) {
                const dx = Math.abs(a[0] - b[0]);
                const dy = Math.abs(a[1] - b[1]);
                const dz = a.length > 2 ? Math.abs(a[2] - b[2]) : 0;
                const D = 1;
                const D2 = Math.sqrt(2);
                const D3 = Math.sqrt(3);

                if (dz === 0) {
                    return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
                }
                const dmin = Math.min(dx, dy, dz);
                const dmax = Math.max(dx, dy, dz);
                const dmid = dx + dy + dz - dmin - dmax;
                return (D3 - D2) * dmin + (D2 - D) * dmid + D * dmax;
            },
            machiningTime: function(a, b, feedRate = 100) {
                // Time-based heuristic
                const dist = Math.sqrt(
                    (a[0]-b[0])**2 + (a[1]-b[1])**2 + ((a[2]||0)-(b[2]||0))**2
                );
                return dist / feedRate;
            }
        },
        /**
         * Priority queue (min-heap)
         */
        PriorityQueue: class {
            constructor() {
                this.items = [];
            }
            push(item, priority) {
                this.items.push({ item, priority });
                this.items.sort((a, b) => a.priority - b.priority);
            }
            pop() {
                return this.items.shift()?.item;
            }
            isEmpty() {
                return this.items.length === 0;
            }
            updatePriority(item, newPriority) {
                const idx = this.items.findIndex(i => i.item === item);
                if (idx >= 0) {
                    this.items[idx].priority = newPriority;
                    this.items.sort((a, b) => a.priority - b.priority);
                }
            }
        },
        /**
         * Main MHA* algorithm
         */
        search: function(start, goal, graph, heuristics, config = {}) {
            const {
                w1 = 1.0,  // Weight for anchor search
                w2 = 2.0   // Weight for inadmissible searches
            } = config;

            const n = heuristics.length;

            // Initialize open lists
            const open = heuristics.map(() => new this.PriorityQueue());
            const closed = heuristics.map(() => new Set());

            // Initialize g-values
            const g = new Map();
            const parent = new Map();

            g.set(this.nodeKey(start), 0);

            // Add start to all open lists
            for (let i = 0; i < n; i++) {
                const h = heuristics[i](start, goal);
                open[i].push({ node: start, index: i }, h);
            }
            const maxIterations = 10000;

            for (let iter = 0; iter < maxIterations; iter++) {
                // Check if anchor is empty
                if (open[0].isEmpty()) {
                    return { success: false, reason: 'No path found' };
                }
                // Select which search to expand
                let searchIdx = 0;
                let minKey = Infinity;

                for (let i = 1; i < n; i++) {
                    if (!open[i].isEmpty()) {
                        const top = open[i].items[0];
                        if (top && top.priority < minKey) {
                            minKey = top.priority;
                            searchIdx = i;
                        }
                    }
                }
                // Get node to expand
                const current = open[searchIdx].pop();
                if (!current) continue;

                const currentKey = this.nodeKey(current.node);

                // Check if goal reached
                if (this.nodesEqual(current.node, goal)) {
                    return {
                        success: true,
                        path: this.reconstructPath(parent, start, goal),
                        cost: g.get(currentKey),
                        iterations: iter
                    };
                }
                // Mark as closed
                closed[searchIdx].add(currentKey);

                // Expand neighbors
                const neighbors = graph.getNeighbors ?
                    graph.getNeighbors(current.node) :
                    this.getDefaultNeighbors(current.node, graph);

                for (const neighbor of neighbors) {
                    const neighborKey = this.nodeKey(neighbor.node);
                    const tentativeG = g.get(currentKey) + neighbor.cost;

                    if (!g.has(neighborKey) || tentativeG < g.get(neighborKey)) {
                        g.set(neighborKey, tentativeG);
                        parent.set(neighborKey, current.node);

                        // Add to all open lists
                        for (let i = 0; i < n; i++) {
                            if (!closed[i].has(neighborKey)) {
                                const h = heuristics[i](neighbor.node, goal);
                                const f = (i === 0) ?
                                    tentativeG + w1 * h :
                                    tentativeG + w2 * h;
                                open[i].push({ node: neighbor.node, index: i }, f);
                            }
                        }
                    }
                }
            }
            return { success: false, reason: 'Max iterations reached' };
        },
        nodeKey: function(node) {
            return node.map(x => x.toFixed(3)).join(',');
        },
        nodesEqual: function(a, b, tolerance = 0.1) {
            for (let i = 0; i < a.length; i++) {
                if (Math.abs(a[i] - b[i]) > tolerance) return false;
            }
            return true;
        },
        reconstructPath: function(parent, start, goal) {
            const path = [goal];
            let current = goal;

            while (!this.nodesEqual(current, start)) {
                const key = this.nodeKey(current);
                const prev = parent.get(key);
                if (!prev) break;
                path.unshift(prev);
                current = prev;
            }
            return path;
        },
        getDefaultNeighbors: function(node, graph) {
            // Default: 6-connected grid
            const neighbors = [];
            const step = graph.step || 1;
            const dirs = [
                [step, 0, 0], [-step, 0, 0],
                [0, step, 0], [0, -step, 0],
                [0, 0, step], [0, 0, -step]
            ];

            for (const d of dirs) {
                const neighbor = node.map((v, i) => v + (d[i] || 0));
                if (!graph.isBlocked || !graph.isBlocked(neighbor)) {
                    neighbors.push({ node: neighbor, cost: step });
                }
            }
            return neighbors;
        },
        prismApplication: "MultiObjectivePathPlanning - balancing time, quality, tool wear"
    },
    // SECTION 5: ANYTIME REPAIRING A* (ARA*)
    // Source: Likhachev et al. (2003), CMU 16-782, PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: Anytime planning with progressively improving solutions

    arastar: {
        name: "Anytime Repairing A*",
        description: "Get a solution quickly, then improve it as time allows",

        /**
         * Priority queue implementation
         */
        PriorityQueue: class {
            constructor() {
                this.items = [];
            }
            push(item, priority) {
                this.items.push({ item, priority });
                this.items.sort((a, b) => a.priority - b.priority);
            }
            pop() {
                return this.items.shift()?.item;
            }
            isEmpty() {
                return this.items.length === 0;
            }
            clear() {
                this.items = [];
            }
            contains(key) {
                return this.items.some(i => i.item.key === key);
            }
            remove(key) {
                const idx = this.items.findIndex(i => i.item.key === key);
                if (idx >= 0) {
                    this.items.splice(idx, 1);
                }
            }
        },
        /**
         * Compute f-value with inflation factor
         */
        fValue: function(g, h, epsilon) {
            return g + epsilon * h;
        },
        /**
         * Main ARA* algorithm
         */
        search: function(start, goal, graph, config = {}) {
            const {
                initialEpsilon = 3.0,
                decrementEpsilon = 0.5,
                finalEpsilon = 1.0,
                heuristic = (a, b) => {
                    let sum = 0;
                    for (let i = 0; i < a.length; i++) {
                        sum += (a[i] - b[i]) ** 2;
                    }
                    return Math.sqrt(sum);
                },
                timeLimit = 10000, // ms
                maxIterations = 100000
            } = config;

            const startTime = Date.now();

            // Data structures
            const g = new Map();
            const parent = new Map();
            const open = new this.PriorityQueue();
            const closed = new Set();
            const incons = new Set(); // Inconsistent states

            let epsilon = initialEpsilon;
            let bestPath = null;
            let bestCost = Infinity;

            // Initialize
            const startKey = this.nodeKey(start);
            g.set(startKey, 0);

            const h0 = heuristic(start, goal);
            open.push({ node: start, key: startKey }, this.fValue(0, h0, epsilon));

            let iteration = 0;

            // Main loop - improve solution until time runs out
            while (epsilon >= finalEpsilon && Date.now() - startTime < timeLimit) {
                // Expand with current epsilon
                while (!open.isEmpty() && iteration < maxIterations) {
                    iteration++;

                    const current = open.pop();
                    if (!current) break;

                    if (closed.has(current.key)) continue;
                    closed.add(current.key);

                    // Check if goal reached
                    if (this.nodesEqual(current.node, goal)) {
                        const cost = g.get(current.key);
                        if (cost < bestCost) {
                            bestCost = cost;
                            bestPath = this.reconstructPath(parent, start, goal);
                        }
                        break;
                    }
                    // Expand neighbors
                    const neighbors = graph.getNeighbors ?
                        graph.getNeighbors(current.node) :
                        this.getDefaultNeighbors(current.node, graph);

                    for (const neighbor of neighbors) {
                        const neighborKey = this.nodeKey(neighbor.node);
                        const tentativeG = g.get(current.key) + neighbor.cost;

                        if (!g.has(neighborKey) || tentativeG < g.get(neighborKey)) {
                            g.set(neighborKey, tentativeG);
                            parent.set(neighborKey, current.node);

                            if (!closed.has(neighborKey)) {
                                const h = heuristic(neighbor.node, goal);
                                open.push(
                                    { node: neighbor.node, key: neighborKey },
                                    this.fValue(tentativeG, h, epsilon)
                                );
                            } else {
                                incons.add(neighborKey);
                            }
                        }
                    }
                }
                // Decrease epsilon
                epsilon = Math.max(finalEpsilon, epsilon - decrementEpsilon);

                // Move inconsistent states to open
                for (const key of incons) {
                    closed.delete(key);
                }
                incons.clear();

                // Recompute priorities
                const newOpen = new this.PriorityQueue();
                for (const item of open.items) {
                    const h = heuristic(item.item.node, goal);
                    const gVal = g.get(item.item.key) || Infinity;
                    newOpen.push(item.item, this.fValue(gVal, h, epsilon));
                }
                open.items = newOpen.items;
            }
            return {
                success: bestPath !== null,
                path: bestPath,
                cost: bestCost,
                finalEpsilon: epsilon,
                iterations: iteration,
                timeElapsed: Date.now() - startTime
            };
        },
        nodeKey: function(node) {
            return node.map(x => x.toFixed(3)).join(',');
        },
        nodesEqual: function(a, b, tolerance = 0.1) {
            for (let i = 0; i < a.length; i++) {
                if (Math.abs(a[i] - b[i]) > tolerance) return false;
            }
            return true;
        },
        reconstructPath: function(parent, start, goal) {
            const path = [goal];
            let current = goal;

            while (!this.nodesEqual(current, start)) {
                const key = this.nodeKey(current);
                const prev = parent.get(key);
                if (!prev) break;
                path.unshift(prev);
                current = prev;
            }
            return path;
        },
        getDefaultNeighbors: function(node, graph) {
            const neighbors = [];
            const step = graph.step || 1;
            const dirs = [
                [step, 0, 0], [-step, 0, 0],
                [0, step, 0], [0, -step, 0],
                [0, 0, step], [0, 0, -step]
            ];

            for (const d of dirs) {
                const neighbor = node.map((v, i) => v + (d[i] || 0));
                if (!graph.isBlocked || !graph.isBlocked(neighbor)) {
                    neighbors.push({ node: neighbor, cost: step });
                }
            }
            return neighbors;
        },
        prismApplication: "InteractivePlanningEngine - real-time path refinement"
    }
};
