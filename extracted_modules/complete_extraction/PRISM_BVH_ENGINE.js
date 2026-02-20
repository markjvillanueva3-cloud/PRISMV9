const PRISM_BVH_ENGINE = {
    version: '2.0.0',
    name: 'PRISM BVH Collision Engine',

    // AABB (Axis-Aligned Bounding Box) Operations

    AABB: {
        /**
         * Create AABB from min/max points
         */
        create(minX, minY, minZ, maxX, maxY, maxZ) {
            return {
                min: { x: minX, y: minY, z: minZ },
                max: { x: maxX, y: maxY, z: maxZ },
                centroid: {
                    x: (minX + maxX) / 2,
                    y: (minY + maxY) / 2,
                    z: (minZ + maxZ) / 2
                }
            };
        },
        /**
         * Create AABB from array of points
         */
        fromPoints(points) {
            if (!points || points.length === 0) return null;

            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            for (const p of points) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                minZ = Math.min(minZ, p.z);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
                maxZ = Math.max(maxZ, p.z);
            }
            return this.create(minX, minY, minZ, maxX, maxY, maxZ);
        },
        /**
         * Create AABB from mesh triangles
         */
        fromMesh(mesh) {
            const points = [];
            for (const tri of mesh.triangles || mesh) {
                points.push(tri.v0, tri.v1, tri.v2);
            }
            return this.fromPoints(points);
        },
        /**
         * Create AABB for cylindrical tool
         */
        fromTool(tool, position, orientation = { x: 0, y: 0, z: -1 }) {
            const r = (tool.diameter || tool.d) / 2;
            const h = tool.length || tool.flute_length || 50;

            // For vertical tool (most common)
            if (Math.abs(orientation.z) > 0.99) {
                return this.create(
                    position.x - r, position.y - r, position.z - h,
                    position.x + r, position.y + r, position.z
                );
            }
            // For angled tool (5-axis), compute bounding sphere then AABB
            const radius = Math.sqrt(r * r + h * h);
            return this.create(
                position.x - radius, position.y - radius, position.z - radius,
                position.x + radius, position.y + radius, position.z + radius
            );
        },
        /**
         * Merge two AABBs into one containing both
         */
        merge(a, b) {
            if (!a) return b;
            if (!b) return a;

            return this.create(
                Math.min(a.min.x, b.min.x),
                Math.min(a.min.y, b.min.y),
                Math.min(a.min.z, b.min.z),
                Math.max(a.max.x, b.max.x),
                Math.max(a.max.y, b.max.y),
                Math.max(a.max.z, b.max.z)
            );
        },
        /**
         * Check if two AABBs intersect
         */
        intersects(a, b) {
            return (
                a.min.x <= b.max.x && a.max.x >= b.min.x &&
                a.min.y <= b.max.y && a.max.y >= b.min.y &&
                a.min.z <= b.max.z && a.max.z >= b.min.z
            );
        },
        /**
         * Check if AABB contains a point
         */
        containsPoint(aabb, point) {
            return (
                point.x >= aabb.min.x && point.x <= aabb.max.x &&
                point.y >= aabb.min.y && point.y <= aabb.max.y &&
                point.z >= aabb.min.z && point.z <= aabb.max.z
            );
        },
        /**
         * Compute surface area (for SAH)
         */
        surfaceArea(aabb) {
            const dx = aabb.max.x - aabb.min.x;
            const dy = aabb.max.y - aabb.min.y;
            const dz = aabb.max.z - aabb.min.z;
            return 2 * (dx * dy + dy * dz + dz * dx);
        },
        /**
         * Expand AABB by margin
         */
        expand(aabb, margin) {
            return this.create(
                aabb.min.x - margin, aabb.min.y - margin, aabb.min.z - margin,
                aabb.max.x + margin, aabb.max.y + margin, aabb.max.z + margin
            );
        }
    },
    // BVH Node Structure

    BVHNode: class {
        constructor() {
            this.aabb = null;
            this.left = null;
            this.right = null;
            this.objects = null;  // Only for leaf nodes
            this.isLeaf = false;
            this.depth = 0;
        }
    },
    // BVH Tree Construction (SAH - Surface Area Heuristic)

    /**
     * Build BVH tree from array of objects
     * @param {Array} objects - Objects with getAABB() method or aabb property
     * @param {Object} options - Build options
     * @returns {BVHNode} Root node of BVH tree
     */
    build(objects, options = {}) {
        const {
            maxLeafSize = 4,
            maxDepth = 32,
            splitMethod = 'sah'  // 'sah', 'median', 'equal'
        } = options;

        if (!objects || objects.length === 0) {
            return null;
        }
        // Compute AABBs for all objects
        const primitives = objects.map((obj, index) => ({
            object: obj,
            index: index,
            aabb: obj.aabb || (obj.getAABB ? obj.getAABB() : this.AABB.fromPoints(obj.points || [obj]))
        }));

        // Build tree recursively
        const root = this._buildNode(primitives, 0, maxLeafSize, maxDepth, splitMethod);

        // Compute statistics
        const stats = this._computeStats(root);

        console.log(`[BVH] Built tree: ${stats.nodeCount} nodes, ${stats.leafCount} leaves, depth ${stats.maxDepth}`);

        return {
            root,
            stats,
            options: { maxLeafSize, maxDepth, splitMethod }
        };
    },
    /**
     * Recursive node building
     */
    _buildNode(primitives, depth, maxLeafSize, maxDepth, splitMethod) {
        const node = new this.BVHNode();
        node.depth = depth;

        // Compute bounding box for all primitives
        node.aabb = primitives.reduce(
            (acc, p) => this.AABB.merge(acc, p.aabb),
            null
        );

        // Create leaf if criteria met
        if (primitives.length <= maxLeafSize || depth >= maxDepth) {
            node.isLeaf = true;
            node.objects = primitives.map(p => p.object);
            return node;
        }
        // Find best split
        const split = this._findBestSplit(primitives, splitMethod);

        if (!split) {
            // Can't split further, make leaf
            node.isLeaf = true;
            node.objects = primitives.map(p => p.object);
            return node;
        }
        // Partition primitives
        const left = [];
        const right = [];

        for (const p of primitives) {
            if (p.aabb.centroid[split.axis] < split.position) {
                left.push(p);
            } else {
                right.push(p);
            }
        }
        // Handle degenerate case
        if (left.length === 0 || right.length === 0) {
            const mid = Math.floor(primitives.length / 2);
            left.push(...primitives.slice(0, mid));
            right.push(...primitives.slice(mid));
        }
        // Recursively build children
        node.left = this._buildNode(left, depth + 1, maxLeafSize, maxDepth, splitMethod);
        node.right = this._buildNode(right, depth + 1, maxLeafSize, maxDepth, splitMethod);

        return node;
    },
    /**
     * Find best split using Surface Area Heuristic (SAH)
     */
    _findBestSplit(primitives, method) {
        const axes = ['x', 'y', 'z'];
        let bestCost = Infinity;
        let bestSplit = null;

        const parentArea = this.AABB.surfaceArea(
            primitives.reduce((acc, p) => this.AABB.merge(acc, p.aabb), null)
        );

        for (const axis of axes) {
            // Sort by centroid along axis
            const sorted = [...primitives].sort(
                (a, b) => a.aabb.centroid[axis] - b.aabb.centroid[axis]
            );

            if (method === 'median') {
                // Simple median split
                const mid = Math.floor(sorted.length / 2);
                return {
                    axis,
                    position: sorted[mid].aabb.centroid[axis]
                };
            }
            // SAH: Try multiple split positions
            const numBins = Math.min(16, primitives.length);
            const min = sorted[0].aabb.centroid[axis];
            const max = sorted[sorted.length - 1].aabb.centroid[axis];
            const step = (max - min) / numBins;

            if (step === 0) continue;

            for (let i = 1; i < numBins; i++) {
                const splitPos = min + i * step;

                // Count and compute AABBs for each side
                let leftAABB = null, rightAABB = null;
                let leftCount = 0, rightCount = 0;

                for (const p of sorted) {
                    if (p.aabb.centroid[axis] < splitPos) {
                        leftAABB = this.AABB.merge(leftAABB, p.aabb);
                        leftCount++;
                    } else {
                        rightAABB = this.AABB.merge(rightAABB, p.aabb);
                        rightCount++;
                    }
                }
                if (leftCount === 0 || rightCount === 0) continue;

                // SAH cost
                const leftArea = this.AABB.surfaceArea(leftAABB);
                const rightArea = this.AABB.surfaceArea(rightAABB);
                const cost = 1 + (leftArea * leftCount + rightArea * rightCount) / parentArea;

                if (cost < bestCost) {
                    bestCost = cost;
                    bestSplit = { axis, position: splitPos };
                }
            }
        }
        return bestSplit;
    },
    /**
     * Compute tree statistics
     */
    _computeStats(node) {
        const stats = { nodeCount: 0, leafCount: 0, maxDepth: 0, objectCount: 0 };

        const traverse = (n) => {
            if (!n) return;
            stats.nodeCount++;
            stats.maxDepth = Math.max(stats.maxDepth, n.depth);

            if (n.isLeaf) {
                stats.leafCount++;
                stats.objectCount += n.objects ? n.objects.length : 0;
            } else {
                traverse(n.left);
                traverse(n.right);
            }
        };
        traverse(node);
        return stats;
    },
    // BVH Queries

    /**
     * Find all objects that potentially intersect with query AABB
     * @param {BVHNode} root - BVH tree root
     * @param {AABB} queryAABB - Query bounding box
     * @returns {Array} Objects that may intersect
     */
    query(bvh, queryAABB) {
        const results = [];
        this._queryNode(bvh.root, queryAABB, results);
        return results;
    },
    _queryNode(node, queryAABB, results) {
        if (!node || !this.AABB.intersects(node.aabb, queryAABB)) {
            return;
        }
        if (node.isLeaf) {
            for (const obj of node.objects) {
                const objAABB = obj.aabb || (obj.getAABB ? obj.getAABB() : null);
                if (objAABB && this.AABB.intersects(objAABB, queryAABB)) {
                    results.push(obj);
                }
            }
        } else {
            this._queryNode(node.left, queryAABB, results);
            this._queryNode(node.right, queryAABB, results);
        }
    },
    /**
     * Find all intersecting pairs in BVH
     * @param {BVHNode} root - BVH tree root
     * @returns {Array} Pairs of potentially intersecting objects
     */
    findAllPairs(bvh) {
        const pairs = [];
        this._findPairs(bvh.root, bvh.root, pairs);
        return pairs;
    },
    _findPairs(nodeA, nodeB, pairs) {
        if (!nodeA || !nodeB) return;
        if (!this.AABB.intersects(nodeA.aabb, nodeB.aabb)) return;

        if (nodeA.isLeaf && nodeB.isLeaf) {
            // Both leaves - check all pairs
            for (const objA of nodeA.objects) {
                for (const objB of nodeB.objects) {
                    if (objA !== objB) {
                        const aabbA = objA.aabb || (objA.getAABB ? objA.getAABB() : null);
                        const aabbB = objB.aabb || (objB.getAABB ? objB.getAABB() : null);
                        if (aabbA && aabbB && this.AABB.intersects(aabbA, aabbB)) {
                            pairs.push([objA, objB]);
                        }
                    }
                }
            }
        } else if (nodeA.isLeaf) {
            this._findPairs(nodeA, nodeB.left, pairs);
            this._findPairs(nodeA, nodeB.right, pairs);
        } else if (nodeB.isLeaf) {
            this._findPairs(nodeA.left, nodeB, pairs);
            this._findPairs(nodeA.right, nodeB, pairs);
        } else {
            // Both internal
            this._findPairs(nodeA.left, nodeB.left, pairs);
            this._findPairs(nodeA.left, nodeB.right, pairs);
            this._findPairs(nodeA.right, nodeB.left, pairs);
            this._findPairs(nodeA.right, nodeB.right, pairs);
        }
    },
    /**
     * Ray-BVH intersection
     */
    raycast(bvh, ray, maxDistance = Infinity) {
        const hits = [];
        this._raycastNode(bvh.root, ray, maxDistance, hits);
        return hits.sort((a, b) => a.distance - b.distance);
    },
    _raycastNode(node, ray, maxDistance, hits) {
        if (!node) return;

        // Ray-AABB intersection test
        const t = this._rayAABBIntersect(ray, node.aabb);
        if (t === null || t > maxDistance) return;

        if (node.isLeaf) {
            for (const obj of node.objects) {
                if (obj.raycast) {
                    const hit = obj.raycast(ray);
                    if (hit && hit.distance <= maxDistance) {
                        hits.push({ object: obj, ...hit });
                    }
                }
            }
        } else {
            this._raycastNode(node.left, ray, maxDistance, hits);
            this._raycastNode(node.right, ray, maxDistance, hits);
        }
    },
    /**
     * Ray-AABB intersection (slab method)
     */
    _rayAABBIntersect(ray, aabb) {
        const invDir = {
            x: 1 / ray.direction.x,
            y: 1 / ray.direction.y,
            z: 1 / ray.direction.z
        };
        const t1 = (aabb.min.x - ray.origin.x) * invDir.x;
        const t2 = (aabb.max.x - ray.origin.x) * invDir.x;
        const t3 = (aabb.min.y - ray.origin.y) * invDir.y;
        const t4 = (aabb.max.y - ray.origin.y) * invDir.y;
        const t5 = (aabb.min.z - ray.origin.z) * invDir.z;
        const t6 = (aabb.max.z - ray.origin.z) * invDir.z;

        const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
        const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

        if (tmax < 0 || tmin > tmax) return null;
        return tmin >= 0 ? tmin : tmax;
    }
};