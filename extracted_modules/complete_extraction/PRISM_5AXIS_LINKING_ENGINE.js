const PRISM_5AXIS_LINKING_ENGINE = {
    version: "1.0",

    // Tool axis control methods
    toolAxisControl: {
        fixed: {
            name: "Fixed Tool Axis",
            description: "Tool axis remains constant",
            applications: ["3+2 machining", "indexing"]
        },
        towardPoint: {
            name: "Toward Point",
            description: "Tool axis points toward a defined point",
            applications: ["hemispherical surfaces", "domes"]
        },
        towardLine: {
            name: "Toward Line",
            description: "Tool axis points toward a defined line",
            applications: ["cylindrical surfaces", "ruled surfaces"]
        },
        normalToSurface: {
            name: "Normal to Surface",
            description: "Tool axis perpendicular to surface",
            applications: ["general 5-axis surfacing"]
        },
        leadLag: {
            name: "Lead/Lag Angle",
            description: "Tool tilted in feed direction",
            applications: ["surface finishing", "swarf cutting"]
        },
        interpolated: {
            name: "Interpolated",
            description: "Smooth transition between defined orientations",
            applications: ["complex multi-surface"]
        }
    },
    // Lead and Lag angle control
    leadLagControl: {
        // Lead angle - tilt forward in feed direction
        lead: {
            description: "Tool tilted forward (toward feed direction)",
            benefits: ["Better chip evacuation", "Reduced rubbing at tool tip"],
            typical: { min: 0, max: 15, optimal: 5 },
            byMaterial: {
                aluminum: { optimal: 3, max: 10 },
                steel: { optimal: 5, max: 15 },
                titanium: { optimal: 7, max: 12 },
                composites: { optimal: 2, max: 8 }
            }
        },
        // Lag angle - tilt backward
        lag: {
            description: "Tool tilted backward (away from feed direction)",
            benefits: ["Cutting with ball center avoided", "Better finish"],
            typical: { min: 0, max: 10, optimal: 3 }
        },
        // Tilt angle - perpendicular to feed
        tilt: {
            description: "Tool tilted sideways relative to feed",
            benefits: ["Collision avoidance", "Access to undercuts"],
            typical: { min: 0, max: 30, optimal: 0 }
        },
        // Calculate optimal lead/lag
        calculateOptimal: function(toolType, material, surfaceAngle) {
            let lead = this.lead.byMaterial[material]?.optimal || 5;
            let lag = 0;

            // Adjust for ball endmill
            if (toolType === 'ball') {
                lead = Math.max(lead, 3); // Minimum 3° to avoid cutting at tip
            }
            // Adjust for surface angle
            if (surfaceAngle > 60) {
                lead = Math.min(lead, 8); // Reduce lead on steep surfaces
            }
            return { lead, lag, tilt: 0 };
        }
    },
    // Linking moves between cuts
    linkingMoves: {
        types: {
            direct: {
                name: "Direct",
                description: "Straight line move to next position",
                safetyRequirement: "Clear path required"
            },
            skim: {
                name: "Skim",
                description: "Maintain safe distance above surface",
                clearanceHeight: 2, // mm above surface
                useFor: ["close passes", "efficient linking"]
            },
            retract: {
                name: "Retract",
                description: "Full retract to safe height",
                safetyMargin: 25, // mm
                useFor: ["long moves", "unknown obstacles"]
            },
            smooth: {
                name: "Smooth",
                description: "Curved path maintaining orientation smoothness",
                curvature: "G-2 continuous",
                useFor: ["visible surfaces", "quality finish"]
            },
            arcFit: {
                name: "Arc Fit",
                description: "Replace linear moves with arcs where possible",
                tolerance: 0.01, // mm
                benefits: ["Smoother motion", "Reduced code size"]
            }
        },
        // Calculate optimal linking strategy
        selectLinking: function(fromPos, toPos, obstacles, surfaceQuality) {
            const distance = Math.sqrt(
                Math.pow(toPos.x - fromPos.x, 2) +
                Math.pow(toPos.y - fromPos.y, 2) +
                Math.pow(toPos.z - fromPos.z, 2)
            );

            if (distance < 5 && !obstacles) {
                return surfaceQuality === 'finish' ? 'smooth' : 'skim';
            }
            if (distance < 50 && !obstacles) {
                return 'skim';
            }
            return 'retract';
        }
    },
    // Smooth orientation interpolation
    orientationInterpolation: {
        methods: {
            linear: {
                name: "Linear SLERP",
                description: "Spherical linear interpolation",
                smoothness: "G-1 continuous"
            },
            spline: {
                name: "Quaternion Spline",
                description: "Smooth spline through orientations",
                smoothness: "G-2 continuous"
            }
        },
        // Interpolate between two orientations
        slerp: function(q1, q2, t) {
            // Spherical linear interpolation
            let dot = q1.w*q2.w + q1.x*q2.x + q1.y*q2.y + q1.z*q2.z;

            if (dot < 0) {
                q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
                dot = -dot;
            }
            if (dot > 0.9995) {
                // Linear interpolation for very close orientations
                return {
                    w: q1.w + t * (q2.w - q1.w),
                    x: q1.x + t * (q2.x - q1.x),
                    y: q1.y + t * (q2.y - q1.y),
                    z: q1.z + t * (q2.z - q1.z)
                };
            }
            const theta = Math.acos(dot);
            const sinTheta = Math.sin(theta);
            const w1 = Math.sin((1-t) * theta) / sinTheta;
            const w2 = Math.sin(t * theta) / sinTheta;

            return {
                w: w1 * q1.w + w2 * q2.w,
                x: w1 * q1.x + w2 * q2.x,
                y: w1 * q1.y + w2 * q2.y,
                z: w1 * q1.z + w2 * q2.z
            };
        }
    },
    // Collision-free retract planning
    retractPlanning: {
        methods: {
            vertical: { description: "Retract along Z axis", safe: true },
            toolAxis: { description: "Retract along tool axis", efficient: true },
            normal: { description: "Retract normal to surface", contextual: true },
            vectored: { description: "Retract along custom vector", flexible: true }
        },
        planRetract: function(currentPos, currentOrientation, obstacles, safeHeight) {
            // Try tool axis retract first (most efficient)
            const toolAxisRetract = this.calculateToolAxisRetract(currentPos, currentOrientation, safeHeight);

            if (!this.checkCollision(toolAxisRetract.path, obstacles)) {
                return { method: 'toolAxis', path: toolAxisRetract.path };
            }
            // Fall back to vertical retract
            const verticalRetract = {
                path: [
                    currentPos,
                    { ...currentPos, z: safeHeight }
                ]
            };
            return { method: 'vertical', path: verticalRetract.path };
        },
        calculateToolAxisRetract: function(pos, orientation, height) {
            // Calculate retract point along tool axis
            const retractDist = height - pos.z;
            return {
                path: [
                    pos,
                    {
                        x: pos.x + orientation.i * retractDist,
                        y: pos.y + orientation.j * retractDist,
                        z: pos.z + orientation.k * retractDist
                    }
                ]
            };
        },
        checkCollision: function(path, obstacles) {
            // Simplified collision check
            return false; // Placeholder
        }
    }
}