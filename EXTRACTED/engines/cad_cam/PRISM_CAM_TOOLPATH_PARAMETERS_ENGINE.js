/**
 * PRISM_CAM_TOOLPATH_PARAMETERS_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 6
 * Lines: 155
 * Session: R2.3.1 Wave 3 Engine Gap Extraction
 */

const PRISM_CAM_TOOLPATH_PARAMETERS_ENGINE = {
    version: "1.0.0",
    source: "HyperMill CAM Manual Parts 7-8 (181 pages)",

    approachRetractMacros: {
        types: {
            axial: {
                desc: "Linear movement along tool axis",
                params: ["length"],
                application: "General purpose, closed contours"
            },
            circular: {
                desc: "Quarter circle approach/retract",
                params: ["radius"],
                application: "Smooth entry to open contours"
            },
            profileOriented: {
                desc: "Linear along surface tangent",
                params: ["length"],
                application: "Profile machining"
            },
            ramp: {
                desc: "Helical or linear ramp entry",
                params: ["height", "angle", "length"],
                application: "Pocket entry, avoiding plunge"
            },
            helix: {
                desc: "Helical entry into pocket",
                params: ["diameter", "pitch"],
                application: "Pocket roughing"
            }
        },
        options: {
            returnMacro: "Return via clearance between paths",
            stopSurfaces: "Define no-go zones for approach",
            collisionCheck: "Verify macro doesn't collide"
        }
    },
    clearancePlanes: {
        clearancePlane: {
            desc: "Absolute Z height for rapid moves",
            note: "Movements NOT collision checked - set safely above part"
        },
        clearanceDistance: {
            desc: "Relative distance above current surface",
            note: "Moves checked for collision within this zone"
        },
        retractModes: {
            clearancePlane: "All retracts go to absolute plane",
            clearanceDistance: "3D retracts use relative distance",
            production: "Shortest safe path between features"
        }
    },
    infeedModes: {
        vertical: {
            constantStepdown: {
                desc: "Fixed Z increment per level",
                params: ["increment"],
                bestFor: "Uniform material removal"
            },
            scallopHeight: {
                desc: "Maintain maximum cusp height",
                params: ["height"],
                bestFor: "Surface finish control"
            },
            adaptiveDepth: {
                desc: "Vary depth by material engagement",
                bestFor: "High-efficiency roughing"
            }
        },
        lateral: {
            constantStepover: {
                desc: "Fixed XY increment",
                params: ["stepover"],
                calculation: "% of tool diameter"
            },
            scallopHeight: {
                desc: "Maintain surface finish quality",
                params: ["height"]
            },
            adaptiveStepover: {
                desc: "Vary by cutting conditions",
                bestFor: "Rest machining"
            }
        }
    },
    collisionAvoidance: {
        toolCheck: {
            enabled: "Check tool against model",
            clearance: "Safety gap around tool body",
            components: ["cutter", "holder", "extension", "spindle"]
        },
        forUnresolvableCollision: {
            stop: "Halt calculation at collision",
            skip: "Skip colliding region",
            retract: "Pull back tool at collision",
            stopMarker: "Insert stop code at collision point"
        },
        5axisAvoidance: {
            adjustLeadAngle: "Tilt tool to avoid collision",
            avoidAngle: "Maximum adjustment angle",
            adjustTiltAngle: "Tilt at contact point"
        }
    },
    fiveAxisMachining: {
        inclinationStrategies: {
            iso: "Tool orientation follows ISO lines",
            normalToCurve: "Tool normal to toolpath",
            radialZ: "Radial for rotational parts",
            toPoint: "Tool oriented toward point",
            toLine: "Tool oriented toward line",
            toPlane: "Tool oriented toward plane",
            fixed: "Constant tool orientation"
        },
        machineLimits: {
            maxAngleToZ: "Maximum angle from Z axis (default 45°)",
            minLagAngle: "Minimum lateral inclination (default 15°)",
            filletInclination: "Special handling for fillet contact"
        },
        tiltStrategies: {
            preferFixed: "Use constant orientation where possible",
            optimizeForMachine: "Consider machine kinematics",
            minimizeMotion: "Reduce rotary axis movement"
        }
    },
    tangentMachining: {
        desc: "Contact point machining of curved surfaces",
        options: {
            invertMachiningSide: "Machine opposite side of surface",
            invertContact: "Invert tool contact direction",
            invertStepover: "Reverse infeed direction"
        },
        driveStrategies: {
            zLevels: "Constant Z height paths",
            iso: "Follow surface ISO lines"
        }
    },
    additiveManufacturing: {
        peripheralPath: {
            weaveWidth: "Width of zigzag pattern",
            weavePitch: "Pitch of peripheral path",
            additionalPaths: "Extra contour passes"
        },
        infillPatterns: {
            lines: "Linear infill pattern",
            grid: "Crosshatch pattern",
            triangles: "Triangular pattern",
            honeycomb: "Hexagonal pattern"
        },
        options: {
            invertDirectionByLayer: "Alternate direction each layer",
            bottomToTop: "Build direction control"
        }
    }
}