const PRISM_COLLISION_MOTION = {

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
                        let isUnique = true;
                        for (const existing of simplex) {
                            if (PRISM_COLLISION_MOTION.gjk.lengthSq(PRISM_COLLISION_MOTION.gjk.sub(support.point, existing)) < 1e-10) {
                                isUnique = false;
                                break;
                            }
                        }
                        if (isUnique) {
                            simplex.push(support.point);
                            break;
                        }
                    }
                }
            }

            // Create faces from tetrahedron
            const faces = [
                { vertices: [0, 1, 2], normal: null, distance: 0 },
                { vertices: [0, 2, 3], normal: null, distance: 0 },
                { vertices: [0, 3, 1], normal: null, distance: 0 },
                { vertices: [1, 3, 2], normal: null, distance: 0 }
            ];
            // Calculate normals and distances
            for (const face of faces) {
                this.calculateFaceNormalAndDistance(face, simplex);
            }
            return { vertices: simplex, faces };
        },
        calculateFaceNormalAndDistance: function(face, vertices) {
            const a = vertices[face.vertices[0]];
            const b = vertices[face.vertices[1]];
            const c = vertices[face.vertices[2]];

            const ab = PRISM_COLLISION_MOTION.gjk.sub(b, a);
            const ac = PRISM_COLLISION_MOTION.gjk.sub(c, a);
            const normal = PRISM_COLLISION_MOTION.gjk.normalize(PRISM_COLLISION_MOTION.gjk.cross(ab, ac));

            face.normal = normal;
            face.distance = PRISM_COLLISION_MOTION.gjk.dot(normal, a);

            // Ensure normal points toward origin
            if (face.distance > 0) {
                face.normal = PRISM_COLLISION_MOTION.gjk.negate(normal);
                face.distance = -face.distance;
                // Reverse vertex order to maintain winding
                face.vertices.reverse();
            }
        },
        findClosestFace: function(polytope) {
            let minDistance = Infinity;
            let closestFace = null;

            for (const face of polytope.faces) {
                if (Math.abs(face.distance) < minDistance) {
                    minDistance = Math.abs(face.distance);
                    closestFace = face;
                }
            }
            return closestFace;
        },
        expandPolytope: function(polytope, supportPoint, closestFace, shapeA, shapeB) {
            // Remove faces that can see the new support point
            const visibleFaces = [];
            const edges = [];

            for (let i = 0; i < polytope.faces.length; i++) {
                const face = polytope.faces[i];
                const toSupport = PRISM_COLLISION_MOTION.gjk.sub(supportPoint, polytope.vertices[face.vertices[0]]);

                if (PRISM_COLLISION_MOTION.gjk.dot(face.normal, toSupport) > 0) {
                    visibleFaces.push(i);
                    // Add edges to boundary
                    for (let j = 0; j < 3; j++) {
                        const edge = [face.vertices[j], face.vertices[(j + 1) % 3]];
                        let isUnique = true;
                        for (let k = edges.length - 1; k >= 0; k--) {
                            const existingEdge = edges[k];
                            if ((edge[0] === existingEdge[1] && edge[1] === existingEdge[0])) {
                                // Shared edge, remove it
                                edges.splice(k, 1);
                                isUnique = false;
                                break;
                            }
                        }
                        if (isUnique) {
                            edges.push(edge);
                        }
                    }
                }
            }
            // Remove visible faces
            visibleFaces.sort((a, b) => b - a);
            for (const i of visibleFaces) {
                polytope.faces.splice(i, 1);
            }

            // Add support point to polytope
            const supportIndex = polytope.vertices.length;
            polytope.vertices.push(supportPoint);

            // Create new faces from edges
            for (const edge of edges) {
                const newFace = {
                    vertices: [edge[0], edge[1], supportIndex],
                    normal: null,
                    distance: 0
                };
                this.calculateFaceNormalAndDistance(newFace, polytope.vertices);
                polytope.faces.push(newFace);
            }
        },
        computePenetration: function(simplex, shapeA, shapeB, maxIterations = 100) {
            const polytope = this.createInitialPolytope([...simplex], shapeA, shapeB);
            const tolerance = 1e-10;

            for (let iteration = 0; iteration < maxIterations; iteration++) {
                const closestFace = this.findClosestFace(polytope);
                const supportResult = PRISM_COLLISION_MOTION.gjk.support(shapeA, shapeB, closestFace.normal);

                const distance = PRISM_COLLISION_MOTION.gjk.dot(supportResult.point, closestFace.normal);

                if (distance - Math.abs(closestFace.distance) < tolerance) {
                    return {
                        penetrationDepth: Math.abs(closestFace.distance),
                        normal: closestFace.normal,
                        contactPoint: PRISM_COLLISION_MOTION.gjk.scale(closestFace.normal, Math.abs(closestFace.distance)),
                        iterations: iteration + 1
                    };
                }
                this.expandPolytope(polytope, supportResult.point, closestFace, shapeA, shapeB);
            }
            return {
                penetrationDepth: Math.abs(this.findClosestFace(polytope).distance),
                normal: this.findClosestFace(polytope).normal,
                contactPoint: [0, 0, 0],
                iterations: maxIterations,
                reason: 'max_iterations'
            };
        },
        prismApplication: "PenetrationDepthEngine - exact contact resolution"
    },
    // SECTION 3: RRT* ALGORITHM (Rapidly-exploring Random Trees Star)
    // Source: LaValle (1998), Karaman & Frazzoli (2011)
    // Purpose: Asymptotically optimal motion planning

    rrtStar: {
        name: "RRT* Motion Planning",
        description: "Asymptotically optimal sampling-based path planning with dynamic rewiring",

        Node: class {
            constructor(position, parent = null, cost = 0) {
                this.position = position;
                this.parent = parent;
                this.cost = cost;
                this.children = [];
            }
        },
        // Core RRT* Functions

        distance: function(a, b) {
            return PRISM_COLLISION_MOTION.gjk.length(PRISM_COLLISION_MOTION.gjk.sub(a, b));
        },
        randomSample: function(bounds) {
            return [
                bounds.min[0] + Math.random() * (bounds.max[0] - bounds.min[0]),
                bounds.min[1] + Math.random() * (bounds.max[1] - bounds.min[1]),
                bounds.min[2] + Math.random() * (bounds.max[2] - bounds.min[2])
            ];
        },
        nearest: function(tree, position) {
            let nearest = tree[0];
            let minDist = this.distance(nearest.position, position);

            for (const node of tree) {
                const dist = this.distance(node.position, position);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = node;
                }
            }
            return nearest;
        },
        steer: function(from, to, maxDistance) {
            const direction = PRISM_COLLISION_MOTION.gjk.sub(to, from);
            const dist = PRISM_COLLISION_MOTION.gjk.length(direction);

            if (dist <= maxDistance) {
                return to;
            }
            const normalized = PRISM_COLLISION_MOTION.gjk.normalize(direction);
            return PRISM_COLLISION_MOTION.gjk.add(from, PRISM_COLLISION_MOTION.gjk.scale(normalized, maxDistance));
        },
        isCollisionFree: function(from, to, obstacles) {
            // Simple line segment collision check
            const steps = Math.ceil(this.distance(from, to) / 0.1);
            const stepVector = PRISM_COLLISION_MOTION.gjk.scale(PRISM_COLLISION_MOTION.gjk.sub(to, from), 1.0 / steps);

            for (let i = 0; i <= steps; i++) {
                const point = PRISM_COLLISION_MOTION.gjk.add(from, PRISM_COLLISION_MOTION.gjk.scale(stepVector, i));

                // Check against all obstacles
                for (const obstacle of obstacles) {
                    if (this.pointInObstacle(point, obstacle)) {
                        return false;
                    }
                }
            }
            return true;
        },
        pointInObstacle: function(point, obstacle) {
            // Simplified obstacle check
            if (obstacle.type === 'sphere') {
                return this.distance(point, obstacle.center) <= obstacle.radius;
            } else if (obstacle.type === 'box') {
                return point[0] >= obstacle.min[0] && point[0] <= obstacle.max[0] &&
                       point[1] >= obstacle.min[1] && point[1] <= obstacle.max[1] &&
                       point[2] >= obstacle.min[2] && point[2] <= obstacle.max[2];
            }
            return false;
        },
        near: function(tree, position, radius) {
            return tree.filter(node => this.distance(node.position, position) <= radius);
        },
        lineCost: function(from, to) {
            return this.distance(from, to);
        },
        rewire: function(tree, newNode, nearNodes, obstacles) {
            for (const nearNode of nearNodes) {
                const newCost = newNode.cost + this.lineCost(newNode.position, nearNode.position);

                if (newCost < nearNode.cost && this.isCollisionFree(newNode.position, nearNode.position, obstacles)) {
                    // Remove from old parent
                    if (nearNode.parent) {
                        nearNode.parent.children = nearNode.parent.children.filter(child => child !== nearNode);
                    }
                    // Set new parent
                    nearNode.parent = newNode;
                    nearNode.cost = newCost;
                    newNode.children.push(nearNode);

                    // Propagate cost change to children
                    this.propagateCostToChildren(nearNode);
                }
            }
        },
        propagateCostToChildren: function(node) {
            for (const child of node.children) {
                child.cost = node.cost + this.lineCost(node.position, child.position);
                this.propagateCostToChildren(child);
            }
        },
        // Main RRT* Algorithm

        plan: function(start, goal, bounds, obstacles, options = {}) {
            const maxIterations = options.maxIterations || 10000;
            const stepSize = options.stepSize || 1.0;
            const goalRadius = options.goalRadius || 0.5;
            const goalBias = options.goalBias || 0.1;

            const startNode = new this.Node(start);
            const tree = [startNode];
            let goalNode = null;

            for (let i = 0; i < maxIterations; i++) {
                // Sample random point (with goal bias)
                const samplePoint = Math.random() < goalBias ?
                    goal : this.randomSample(bounds);

                // Find nearest node
                const nearestNode = this.nearest(tree, samplePoint);

                // Steer toward sample
                const newPosition = this.steer(nearestNode.position, samplePoint, stepSize);

                // Check collision
                if (!this.isCollisionFree(nearestNode.position, newPosition, obstacles)) {
                    continue;
                }
                // Calculate RRT* radius (shrinks over time for optimality)
                const cardTree = tree.length;
                const dimensions = 3;
                const radius = Math.min(
                    options.maxRadius || 2.0,
                    Math.pow(Math.log(cardTree) / cardTree, 1.0 / dimensions) * options.radiusConstant || 10.0
                );

                // Find nearby nodes
                const nearNodes = this.near(tree, newPosition, radius);

                // Find best parent
                let bestParent = nearestNode;
                let bestCost = nearestNode.cost + this.lineCost(nearestNode.position, newPosition);

                for (const nearNode of nearNodes) {
                    const cost = nearNode.cost + this.lineCost(nearNode.position, newPosition);
                    if (cost < bestCost && this.isCollisionFree(nearNode.position, newPosition, obstacles)) {
                        bestParent = nearNode;
                        bestCost = cost;
                    }
                }
                // Create new node
                const newNode = new this.Node(newPosition, bestParent, bestCost);
                bestParent.children.push(newNode);
                tree.push(newNode);

                // Rewire tree
                this.rewire(tree, newNode, nearNodes, obstacles);

                // Check if goal is reached
                if (this.distance(newPosition, goal) <= goalRadius) {
                    goalNode = newNode;
                    console.log(`RRT*: Goal reached in ${i + 1} iterations, cost: ${goalNode.cost.toFixed(3)}`);
                }
            }
            // Extract path
            if (goalNode) {
                const path = [];
                let current = goalNode;
                while (current) {
                    path.unshift(current.position);
                    current = current.parent;
                }
                return {
                    success: true,
                    path,
                    cost: goalNode.cost,
                    tree,
                    iterations: maxIterations
                };
            }
            return {
                success: false,
                tree,
                iterations: maxIterations
            };
        },
        // Path Optimization

        smoothPath: function(path, obstacles, maxIterations = 100) {
            if (path.length < 3) return path;

            let smoothedPath = [...path];

            for (let iter = 0; iter < maxIterations; iter++) {
                let improved = false;

                for (let i = 0; i < smoothedPath