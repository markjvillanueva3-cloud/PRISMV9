const PRISM_POST_PROCESSOR_DEVELOPMENT_ENGINE = {
    version: "1.0.0",
    source: "Autodesk Post Processor Training Guide (315 pages)",

    // Entry Functions - Core callbacks for post processor development
    entryFunctions: {
        // Program lifecycle
        onOpen: {
            desc: "Post processor initialization - output program header, define settings",
            params: [],
            outputs: ["programName", "comment", "startCodes", "safetyBlock"],
            example: "function onOpen() { writeln('%'); writeComment(programName); }"
        },
        onSection: {
            desc: "Start of each operation - tool change, WCS, work plane",
            params: ["section"],
            outputs: ["toolCall", "workOffset", "spindleSpeed", "coolant"],
            example: "function onSection() { var tool = section.getTool(); }"
        },
        onSectionEnd: {
            desc: "End of each operation - retract, coolant off",
            params: [],
            outputs: ["retract", "coolantOff"],
            example: "function onSectionEnd() { onCommand(COMMAND_COOLANT_OFF); }"
        },
        onClose: {
            desc: "End of post processing - program end, rewind",
            params: [],
            outputs: ["homeReturn", "programEnd", "rewind"],
            example: "function onClose() { onCommand(COMMAND_STOP_SPINDLE); writeln('M30'); }"
        },
        onTerminate: {
            desc: "Final cleanup after onClose",
            params: [],
            outputs: []
        },
        // Motion functions
        onRapid: {
            desc: "3-axis rapid positioning move (G0)",
            params: ["x", "y", "z"],
            outputs: ["G0 X Y Z"],
            example: "function onRapid(x, y, z) { writeBlock(gMotionModal.format(0), xOutput.format(x), yOutput.format(y), zOutput.format(z)); }"
        },
        onLinear: {
            desc: "3-axis cutting move at feedrate (G1)",
            params: ["x", "y", "z", "feed"],
            outputs: ["G1 X Y Z F"],
            example: "function onLinear(x, y, z, feed) { writeBlock(gMotionModal.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z), feedOutput.format(feed)); }"
        },
        onRapid5D: {
            desc: "5-axis rapid positioning move",
            params: ["x", "y", "z", "a", "b", "c"],
            outputs: ["G0 X Y Z A B C"],
            example: "function onRapid5D(x, y, z, a, b, c) { ... }"
        },
        onLinear5D: {
            desc: "5-axis cutting move at feedrate",
            params: ["x", "y", "z", "a", "b", "c", "feed"],
            outputs: ["G1 X Y Z A B C F"],
            example: "function onLinear5D(x, y, z, a, b, c, feed) { ... }"
        },
        onCircular: {
            desc: "Circular interpolation move (G2/G3)",
            params: ["clockwise", "cx", "cy", "cz", "x", "y", "z", "feed"],
            outputs: ["G2/G3 X Y Z I J K F", "G2/G3 X Y Z R F"],
            example: "function onCircular(cw, cx, cy, cz, x, y, z, feed) { ... }"
        },
        // Drilling cycles
        onCycle: {
            desc: "Start of drilling/boring cycle",
            params: [],
            cycleTypes: ["drilling", "counter-boring", "chip-breaking", "deep-drilling", "tapping", "boring", "reaming"],
            outputs: ["G81-G89 canned cycles"]
        },
        onCyclePoint: {
            desc: "Each drilling cycle point",
            params: ["x", "y", "z"],
            outputs: ["X Y position for cycle"]
        },
        onCycleEnd: {
            desc: "End of drilling cycle",
            params: [],
            outputs: ["G80 cycle cancel"]
        },
        // Commands and parameters
        onCommand: {
            desc: "Manual NC commands (coolant, spindle, clamps)",
            commands: {
                COMMAND_STOP: "M0",
                COMMAND_OPTIONAL_STOP: "M1",
                COMMAND_END: "M2",
                COMMAND_SPINDLE_CLOCKWISE: "M3",
                COMMAND_SPINDLE_COUNTERCLOCKWISE: "M4",
                COMMAND_STOP_SPINDLE: "M5",
                COMMAND_TOOL_CHANGE: "M6",
                COMMAND_COOLANT_ON: "M8",
                COMMAND_COOLANT_OFF: "M9",
                COMMAND_LOCK_MULTI_AXIS: "Clamp rotary",
                COMMAND_UNLOCK_MULTI_AXIS: "Unclamp rotary",
                COMMAND_BREAK_CONTROL: "Tool breakage check"
            }
        },
        onDwell: {
            desc: "Dwell/pause command",
            params: ["seconds"],
            outputs: ["G4 P/X"]
        },
        onSpindleSpeed: {
            desc: "Spindle speed change mid-operation",
            params: ["spindleSpeed"],
            outputs: ["S"]
        },
        onParameter: {
            desc: "Operation parameters passed from CAM",
            params: ["name", "value"],
            commonParams: ["operation:tolerance", "operation:stockToLeave", "operation:strategy"]
        },
        onComment: {
            desc: "Comment output",
            params: ["message"],
            outputs: ["( comment )", "; comment"]
        },
        onPassThrough: {
            desc: "Raw NC code passthrough",
            params: ["code"],
            outputs: ["raw code"]
        },
        // Compensation
        onRadiusCompensation: {
            desc: "Cutter radius compensation changes",
            modes: {
                RADIUS_COMPENSATION_OFF: "G40",
                RADIUS_COMPENSATION_LEFT: "G41",
                RADIUS_COMPENSATION_RIGHT: "G42"
            }
        },
        onMovement: {
            desc: "Movement type changes",
            types: ["MOVEMENT_CUTTING", "MOVEMENT_LEAD_IN", "MOVEMENT_LEAD_OUT", "MOVEMENT_LINK_DIRECT", "MOVEMENT_RAPID"]
        }
    },
    // Format definitions
    formatDefinitions: {
        createFormat: {
            desc: "Create numeric format specification",
            params: {
                decimals: "Number of decimal places",
                forceDecimal: "Always include decimal point",
                forceSign: "Always include +/- sign",
                width: "Minimum field width",
                zeropad: "Pad with leading zeros",
                prefix: "Character prefix (G, M, X, etc.)",
                suffix: "Character suffix",
                cyclicLimit: "For rotary axes wraparound",
                scale: "Multiplication factor"
            },
            example: "var xFormat = createFormat({decimals:3, forceDecimal:true});"
        },
        createVariable: {
            desc: "Create output variable with modal tracking",
            params: {
                prefix: "Output prefix",
                force: "Force output every time",
                onchange: "Callback on value change"
            },
            example: "var xOutput = createVariable({prefix:'X'}, xFormat);"
        },
        createModal: {
            desc: "Create modal group for G-codes",
            example: "var gMotionModal = createModal({force:true}, gFormat);"
        }
    },
    // Multi-axis configuration
    multiAxisConfig: {
        machineConfiguration: {
            desc: "Define machine kinematics",
            methods: {
                setModel: "Set machine model name",
                setVendor: "Set machine vendor",
                setWidth: "Set machine width",
                setDepth: "Set machine depth",
                setHeight: "Set machine height",
                setSpindleAxis: "Set spindle orientation vector",
                addAxis: "Add rotary axis definition"
            }
        },
        rotaryAxis: {
            desc: "Rotary axis definition",
            params: {
                table: "true for table rotation",
                axis: "Axis of rotation vector",
                offset: "Pivot point offset",
                range: "Min/max angle range",
                preference: "Preferred angle direction",
                cyclic: "Continuous rotation enabled",
                reset: "Reset on rewind"
            },
            types: ["TABLE_AXIS", "HEAD_AXIS", "SPINDLE_AXIS"]
        },
        singularityHandling: {
            desc: "Handle gimbal lock and singularity",
            methods: ["redirectToSafePosition", "avoidSingularity", "useLinearization"]
        },
        axisRewinding: {
            desc: "Handle rotary axis limits",
            methods: ["onRewindMachine", "onMoveToSafeRetractPosition"]
        }
    },
    // Common functions
    commonFunctions: {
        writeln: "Write line with newline",
        writeBlock: "Write formatted block",
        writeComment: "Write comment line",
        writeWords: "Write space-separated words",
        formatWords: "Format multiple words",
        error: "Raise post processor error",
        warning: "Raise post processor warning",
        toPreciseUnit: "Convert to precise unit value"
    }
}