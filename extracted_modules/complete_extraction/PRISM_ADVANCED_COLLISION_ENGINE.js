const PRISM_ADVANCED_COLLISION_ENGINE = {
    version: "2.0",

    // Collision detection modes
    modes: {
        rapid: {
            name: "Rapid Collision Check",
            description: "AABB bounding box for fast preliminary check",
            accuracy: "Low",
            speed: "Very Fast",
            useFor: ["Rough checking", "Real-time preview"]
        },
        obb: {
            name: "OBB Collision Check",
            description: "Oriented bounding boxes for better accuracy",
            accuracy: "Medium",
            speed: "Fast",
            useFor: ["Detailed preview", "Tool assembly check"]
        },
        mesh: {
            name: "Mesh Collision Check",
            description: "Triangle-to-triangle intersection",
            accuracy: "High",
            speed: "Medium",
            useFor: ["Final verification", "Complex geometry"]
        },
        swept: {
            name: "Swept Volume Check",
            description: "Check along entire tool motion path",
            accuracy: "Highest",
            speed: "Slow",
            useFor: ["Critical operations", "5-axis verification"]
        }
    },
    // Tool assembly components
    toolAssembly: {
        components: {
            cutter: { name: "Cutting Tool", priority: 1, criticalZone: true },
            holder: { name: "Tool Holder", priority: 2, criticalZone: true },
            collet: { name: "Collet/Chuck", priority: 3, criticalZone: false },
            spindle: { name: "Spindle Nose", priority: 4, criticalZone: false },
            spindleHousing: { name: "Spindle Housing", priority: 5, criticalZone: false }
        },
        buildAssembly: function(tool, holder, machine) {
            return {
                tool: {
                    type: tool.type,
                    diameter: tool.diameter,
                    length: tool.length,
                    fluteLength: tool.fluteLength,
                    shankDiameter: tool.shankDiameter
                },
                holder: {
                    type: holder.type,
                    taper: holder.taper,
                    gauge: holder.gaugeLength,
                    maxDiameter: holder.maxDiameter,
                    projection: tool.stickout
                },
                totalLength: holder.gaugeLength + tool.stickout,
                boundingCylinder: {
                    radius: Math.max(tool.diameter/2, holder.maxDiameter/2),
                    length: holder.gaugeLength + tool.length
                }
            };
        }
    },
    // AABB (Axis-Aligned Bounding Box) collision
    aabbCollision: {
        create: function(geometry) {
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            for (const vertex of geometry.vertices) {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                minZ = Math.min(minZ, vertex.z);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
                maxZ = Math.max(maxZ, vertex.z);
            }
            return { min: {x: minX, y: minY, z: minZ}, max: {x: maxX, y: maxY, z: maxZ} };
        },
        intersects: function(box1, box2) {
            return (box1.min.x <= box2.max.x && box1.max.x >= box2.min.x) &&
                   (box1.min.y <= box2.max.y && box1.max.y >= box2.min.y) &&
                   (box1.min.z <= box2.max.z && box1.max.z >= box2.min.z);
        }
    },
    // Swept volume collision for motion
    sweptVolumeCheck: {
        checkLinearMove: function(start, end, toolRadius, obstacles) {
            const collisions = [];
            const segments = 20; // Sample points along path

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const point = {
                    x: start.x + t * (end.x - start.x),
                    y: start.y + t * (end.y - start.y),
                    z: start.z + t * (end.z - start.z)
                };
                for (const obstacle of obstacles) {
                    const dist = this.pointToObstacleDistance(point, obstacle);
                    if (dist < toolRadius) {
                        collisions.push({
                            point,
                            obstacle: obstacle.name,
                            penetration: toolRadius - dist,
                            pathParameter: t
                        });
                    }
                }
            }
            return collisions;
        },
        pointToObstacleDistance: function(point, obstacle) {
            // Simplified - would use actual geometry in production
            if (obstacle.type === 'sphere') {
                return Math.sqrt(
                    Math.pow(point.x - obstacle.center.x, 2) +
                    Math.pow(point.y - obstacle.center.y, 2) +
                    Math.pow(point.z - obstacle.center.z, 2)
                ) - obstacle.radius;
            }
            if (obstacle.type === 'cylinder') {
                const dx = point.x - obstacle.center.x;
                const dy = point.y - obstacle.center.y;
                return Math.sqrt(dx*dx + dy*dy) - obstacle.radius;
            }
            return Infinity;
        }
    },
    // Gouge detection for surface machining
    gougeDetection: {
        checkBallNose: function(toolRadius, surfacePoint, surfaceNormal, toolPosition) {
            // Check if ball nose tool would gouge surface
            const toolCenterZ = toolPosition.z + toolRadius;
            const contactZ = surfacePoint.z + toolRadius * surfaceNormal.z;

            return {
                gouges: toolCenterZ < contactZ,
                depth: toolCenterZ < contactZ ? contactZ - toolCenterZ : 0
            };
        },
        checkFlatEndmill: function(toolRadius, surfacePoint, toolPosition) {
            // Check if flat endmill corner would gouge
            const dx = toolPosition.x - surfacePoint.x;
            const dy = toolPosition.y - surfacePoint.y;
            const horizontalDist = Math.sqrt(dx*dx + dy*dy);

            if (horizontalDist < toolRadius) {
                return { gouges: toolPosition.z < surfacePoint.z, depth: surfacePoint.z - toolPosition.z };
            }
            return { gouges: false, depth: 0 };
        }
    },
    // Machine axis limit checking
    axisLimitCheck: {
        checkPosition: function(position, machineLimits) {
            const violations = [];

            if (position.x < machineLimits.x.min) violations.push({ axis: 'X', type: 'min', value: position.x, limit: machineLimits.x.min });
            if (position.x > machineLimits.x.max) violations.push({ axis: 'X', type: 'max', value: position.x, limit: machineLimits.x.max });
            if (position.y < machineLimits.y.min) violations.push({ axis: 'Y', type: 'min', value: position.y, limit: machineLimits.y.min });
            if (position.y > machineLimits.y.max) violations.push({ axis: 'Y', type: 'max', value: position.y, limit: machineLimits.y.max });
            if (position.z < machineLimits.z.min) violations.push({ axis: 'Z', type: 'min', value: position.z, limit: machineLimits.z.min });
            if (position.z > machineLimits.z.max) violations.push({ axis: 'Z', type: 'max', value: position.z, limit: machineLimits.z.max });

            if (position.a !== undefined && machineLimits.a) {
                if (position.a < machineLimits.a.min) violations.push({ axis: 'A', type: 'min', value: position.a, limit: machineLimits.a.min });
                if (position.a > machineLimits.a.max) violations.push({ axis: 'A', type: 'max', value: position.a, limit: machineLimits.a.max });
            }
            if (position.c !== undefined && machineLimits.c) {
                if (position.c < machineLimits.c.min) violations.push({ axis: 'C', type: 'min', value: position.c, limit: machineLimits.c.min });
                if (position.c > machineLimits.c.max) violations.push({ axis: 'C', type: 'max', value: position.c, limit: machineLimits.c.max });
            }
            return { valid: violations.length === 0, violations };
        }
    },
    // Full collision verification
    verifyToolpath: function(toolpath, tool, holder, machine, fixtures) {
        const results = {
            totalPoints: toolpath.length,
            collisions: [],
            gouges: [],
            axisViolations: [],
            safe: true
        };
        const assembly = this.toolAssembly.buildAssembly(tool, holder, machine);

        for (let i = 0; i < toolpath.length; i++) {
            const point = toolpath[i];

            // Check axis limits
            const axisCheck = this.axisLimitCheck.checkPosition(point, machine.limits);
            if (!axisCheck.valid) {
                results.axisViolations.push({ index: i, violations: axisCheck.violations });
                results.safe = false;
            }
            // Check fixture collision
            if (fixtures) {
                for (const fixture of fixtures) {
                    const dist = this.sweptVolumeCheck.pointToObstacleDistance(point, fixture);
                    if (dist < assembly.boundingCylinder.radius) {
                        results.collisions.push({ index: i, obstacle: fixture.name, clearance: dist });
                        results.safe = false;
                    }
                }
            }
        }
        return results;
    }
}