const PRISM_OKUMA_OSP_CONTROL_ENGINE = {
    version: "1.0",
    source: "CNC 501 - Programming and Operation of 2-Axis Lathe",

    // Power Up/Down Sequences
    powerSequence: {
        powerOn: [
            "1. Turn ON main switch at control box",
            "2. Press [CONTROL ON] button on NC operation panel",
            "3. NC control software loads from data storage to operation memory",
            "4. Wait for boot sequence to complete"
        ],
        powerOff: [
            "1. Make sure all machine operating commands are completed",
            "2. Switch off any connected peripherals (printer, punch)",
            "3. Press [CONTROL OFF] button on NC operation panel",
            "4. Turn OFF main switch at control box"
        ],
        emergencyStop: {
            activate: "Press [EMERGENCY STOP] button - machine stops immediately",
            recovery: [
                "1. Turn [EMERGENCY STOP] button in direction of arrow to unlock",
                "2. Press [CONTROL ON] button to recover from emergency stop state"
            ]
        }
    },
    // Operation Mode Selection Keys
    operationModes: {
        AUTO: { key: "AUTO", desc: "Automatic mode - runs stored part program" },
        MDI: { key: "MDI", desc: "Manual Data Input - block operation via keyboard" },
        MANUAL: { key: "MANUAL", desc: "Manual mode - operate via machine panel switches" }
    },
    // Data Setting Mode Selection Keys
    dataSettingModes: {
        EDIT_AUX: { key: "EDIT AUX", desc: "Program operation mode - edit, I/O, display, delete" },
        PARAMETER: { key: "PARAMETER", desc: "Set/change/display parameter data" },
        ZERO_SET: { key: "ZERO SET", desc: "Set/change zero offset and zero shift data" },
        TOOL_DATA: { key: "TOOL DATA", desc: "Set tool offset, nose R comp, shape, load monitor" },
        MacMan: { key: "MacMan", desc: "Machining management function" }
    },
    // Status Indicating Lamps
    statusLamps: {
        RUN: "On when machine is operating in automatic or MDI mode",
        STM: "On during auxiliary function (spindle gear, tool change, spindle rotation)",
        SLIDE_HOLD: "On when [SLIDE HOLD] button is pressed",
        PROGRAM_STOP: "On during M00/M01 execution, blinks during G04 dwell",
        LIMIT: "On when X or Z axis reaches its limit"
    },
    // Zero Setting Methods
    zeroSetting: {
        zAxis: {
            method: "Touch-off method",
            steps: [
                "1. Select turret (A or B for 2-turret)",
                "2. Select zero set tool (one per turret)",
                "3. In manual, face the part, withdraw in X-axis",
                "4. Stop spindle, measure overall length",
                "5. Select Zero Set mode",
                "6. Locate cursor to Z-axis position",
                "7. Press [F3] (CAL), key in dimension value",
                "8. Press Write Key"
            ]
        },
        xAxis: {
            method: "Management data card method",
            steps: [
                "1. Select Zero Set mode",
                "2. Select turret (A or B)",
                "3. Locate cursor to X-axis zero offset",
                "4. Press [F1] (SET), key in preset value",
                "5. Press Write Key"
            ]
        }
    },
    // Tool Offset Setting
    toolOffsets: {
        unknownOffsets: {
            method: "Touch-off when offsets unknown",
            steps: [
                "1. Select Manual Mode",
                "2. Select Tool Data Mode",
                "3. Select turret (A or B)",
                "4. Select tool for offsetting",
                "5. Touch off faced part in Z axis",
                "6. Locate cursor to tool offset number, select Z",
                "7. Press [F3] (CAL), key in dimension",
                "8. Press Write Key",
                "9. Touch off turned diameter for X offset",
                "10. Measure diameter, write down",
                "11. Locate cursor to X-axis",
                "12. Press [F3] (CAL), key in dimension",
                "13. Press Write Key"
            ]
        },
        presetOffsets: {
            method: "From premeasured tools or to erase",
            steps: [
                "1. Press Tool Data key",
                "2. Select turret (A or B)",
                "3. Locate cursor to tool offset, select X or Z",
                "4. Press [F8] (EXTEND)",
                "5. Press [F1] (SET), key in premeasured value",
                "6. Press Write Key"
            ]
        },
        adjustOffsets: {
            rule: "Oversized part = subtract (-), Undersized part = add (+)",
            steps: [
                "1. Press Tool Data key",
                "2. Select proper turret",
                "3. Locate cursor to tool offset position",
                "4. Press [F2] (ADD), key in adjustment (+ or -)",
                "5. Press Write Key"
            ]
        }
    },
    // Soft Limits Setting
    softLimits: {
        playbackMethod: {
            desc: "Physically move turret to safe position",
            steps: [
                "1. Manually move turret to desired SAFE position",
                "2. Press Parameter key",
                "3. Press [F6] or [F7] until User Parameter displays",
                "4. Select turret (A or B)",
                "5. Locate cursor to X-axis data position",
                "6. Press [F3] (CAL) - no value needed",
                "7. Press Write Key",
                "8. Repeat for Z-axis"
            ]
        },
        calculatedMethod: {
            desc: "Calculate from program zero without moving turret",
            steps: [
                "1. Press Parameter key",
                "2. Press [F6] or [F7] until User Parameter displays",
                "3. Select turret",
                "4. Locate cursor to X-axis data position",
                "5. Press [F1] (SET), key in soft limit value",
                "6. Press Write Key",
                "7. Repeat for Z-axis"
            ]
        }
    },
    // Turret Operations
    turretOperations: {
        homePosition: {
            desc: "Position for turret indexing",
            requirement: "Turret must be at positive X or Z limit for indexing",
            command: "G00 X50 Z50 - positions to soft limits",
            note: "Allow for longest tool to safely clear chuck"
        },
        indexing: {
            conditions: {
                LBII_LT15_25: "X or Z at variable limit (positive direction)",
                LU_LC_LCC_LCS: "X or Z at variable limit (positive direction)",
                H4_spec: "X-axis at positive variable limit",
                H6_spec: "Z-axis at positive variable limit",
                H8_2turret: "Saddle may be at any position"
            }
        }
    },
    // Program Execution Methods
    programExecution: {
        blockByBlock: {
            desc: "Single step through program",
            steps: [
                "1. Press Auto key",
                "2. Press Single Block switch on",
                "3. Set feed rate override to 10%",
                "4. Press Cycle Start (repeat after each block)"
            ]
        },
        sequenceRestart: {
            desc: "Restart to specific sequence number",
            caution: "Machine advances to one block BEFORE commanded restart",
            steps: [
                "1. Press Auto key",
                "2. Press [F3] (Part Program)",
                "3. Page until program displays",
                "4. Select turret",
                "5. Press [F8] (EXTEND), then [F2] (restart)",
                "6. Key in sequence number (N-)",
                "7. Press Write Key",
                "8. Press Single Block on",
                "9. Decrease feed rate override",
                "10. Press Sequence Restart button"
            ]
        },
        midAutoManual: {
            desc: "Interrupt cycle, jog away, change inserts, return",
            steps: [
                "1. Press Slide Hold",
                "2. Press Mid-Auto Manual (NOT Manual button)",
                "3. Manually move away, stop spindle, change inserts",
                "4. Return turret to original station, restart spindle",
                "5. Manually move close to interrupted point",
                "6. Press Single Block on, decrease feed override",
                "7. Press Sequence Restart",
                "8. Return feed override to 100%",
                "9. Press Cycle Start"
            ]
        }
    }
}