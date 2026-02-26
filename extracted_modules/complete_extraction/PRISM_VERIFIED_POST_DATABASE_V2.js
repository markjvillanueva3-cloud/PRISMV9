const PRISM_VERIFIED_POST_DATABASE_V2 = {

    // VERIFIED CONTROLLER CONFIGURATIONS
    // Codes extracted from actual production posts

    CONTROLLERS: {

        // HAAS NGC (Next Generation Control)
        // Source: HAAS_VF2_-Ai-Enhanced__iMachining_.cps
        haas_ngc: {
            name: "Haas NGC",
            vendor: "Haas Automation",
            dialect: "fanuc-based",
            extension: "nc",

            // Modal groups verified from post
            formats: {
                program: { width: 5, zeropad: true },
                g: { prefix: "G", decimals: 0 },
                m: { prefix: "M", decimals: 0 },
                h: { prefix: "H", decimals: 0 },
                d: { prefix: "D", decimals: 0 },
                xyz: { decimals: 4, forceDecimal: true },  // inches
                feed: { decimals: 3, forceDecimal: true },
                rpm: { decimals: 0 }
            },
            // Coolant codes - verified
            coolant: {
                flood: { on: "M8", off: "M9" },
                mist: { on: "M7", off: "M9" },
                tsc: { on: "M88", off: "M89" },
                air: { on: "M83", off: "M84" },
                airThruSpindle: { on: "M73", off: "M74" },
                floodPlusTsc: { on: ["M88", "M8"], off: ["M89", "M9"] }
            },
            // Spindle codes - verified
            spindle: {
                cw: "M3",
                ccw: "M4",
                stop: "M5",
                orient: "M19"
            },
            // G187 Smoothing - verified
            smoothing: {
                rough: "G187 P1 E0.001",
                medium: "G187 P2 E0.0005",
                finish: "G187 P3 E0.0001",
                off: "G187 P0"
            },
            // Auxiliary codes - verified
            auxiliary: {
                chipConveyorOn: "M32",
                chipConveyorOff: "M33",
                doorOpen: "M85",
                doorClose: "M86",
                optionalStop: "M1",
                programStop: "M0",
                programEnd: "M30"
            },
            // Clamping - verified for 5-axis
            clamping: {
                axis4Clamp: "M10",
                axis4Unclamp: "M11",
                axis5Clamp: "M12",
                axis5Unclamp: "M13"
            },
            // Safe positioning - verified
            safePosition: {
                g28: "G28",
                g53: "G53",
                clearanceHeight: "G0 Z{clearance}"
            },
            // Probing cycles - verified (Renishaw)
            probing: {
                protected: "G65 P9832",
                singleSurface: "G65 P9811",
                webPocket: "G65 P9812",
                boreBoss: "G65 P9814",
                cornerXY: "G65 P9815",
                toolSetting: "G65 P9023"
            },
            // Multi-axis - verified
            multiAxis: {
                dwoOn: "G254",
                dwoOff: "G255",
                tcpc: "G234"  // Tool Center Point Control
            },
            // Canned cycles - verified
            cannedCycles: {
                drill: "G81",
                drillDwell: "G82",
                peck: "G83",
                chipBreak: "G73",
                tap: "G84",
                reverseTap: "G74",
                bore: "G85",
                boreDwell: "G86",
                backBore: "G87",
                cancel: "G80",
                returnInitial: "G98",
                returnR: "G99"
            },
            // Tool change - verified
            toolChange: {
                format: "T{tool} M6",
                preload: "T{next}",
                lengthComp: "G43 H{tool}",
                lengthCompCancel: "G49"
            },
            // Program structure
            programStart: [
                "%",
                "O{number} ({name})",
                "(PRISM AI OPTIMIZED POST)",
                "(DATE: {date})"
            ],
            programEnd: [
                "G28 G91 Z0.",
                "G28 Y0.",
                "M5",
                "M9",
                "M30",
                "%"
            ],

            safeStart: [
                "G28 G91 Z0.",
                "G28 Y0.",
                "G90 G17 G40 G49 G80"
            ]
        },
        // OKUMA OSP-P300M/MA (Milling)
        // Source: OKUMA-M460V-5AX-Ai_Enhanced-_iMachining_.cps
        okuma_osp_p300m: {
            name: "Okuma OSP-P300M/MA",
            vendor: "Okuma",
            dialect: "okuma",
            extension: "MIN",

            formats: {
                g: { prefix: "G", width: 2, zeropad: true },
                m: { prefix: "M", width: 2, zeropad: true },
                h: { prefix: "H", width: 2, zeropad: true },
                d: { prefix: "D", width: 2, zeropad: true },
                o: { prefix: "O", width: 4, zeropad: true },
                xyz: { decimals: 4, forceDecimal: true },
                abc: { decimals: 3, forceDecimal: true, scale: "DEG" },
                feed: { decimals: 3 },
                rpm: { decimals: 0 }
            },
            // Coolant - verified from post
            coolant: {
                flood: { on: "M8", off: "M9" },  // Okuma uses standard flood
                mist: { on: "M7", off: "M9" },
                tsc: { on: "M51", off: "M9" },   // Okuma TSC
                air: { on: "M12", off: "M9" },   // Air blast
                airThruSpindle: { on: "M339", off: "M9" },
                floodPlusTsc: { on: ["M8", "M51"], off: "M9" }
            },
            // Spindle - verified
            spindle: {
                cw: "M3",
                ccw: "M4",
                stop: "M5"
            },
            // Work offsets - verified (Okuma uses G15 H##)
            workOffset: {
                format: "G15 H{offset}",
                range: [1, 200],
                fixtureCall: "CALL OO88"  // Fixture offset function
            },
            // Super NURBS smoothing - verified
            smoothing: {
                superNurbsOn: "G131",
                superNurbsOff: "G130",
                highSpeedOn: "G132",
                quality: {
                    rough: "G131 P1",      // High speed
                    medium: "G131 P2",     // Standard
                    finish: "G131 P3"      // High quality
                }
            },
            // High precision mode - verified
            highPrecision: {
                on: "G08 P1",
                off: "G08 P0",
                cornerRounding: "G62"
            },
            // 5-axis specific - verified
            fiveAxis: {
                tcpOn: "G169",   // Tool Center Point ON
                tcpOff: "G170", // Tool Center Point OFF
                tiltedPlane: "G68.2"
            },
            // Clamping - verified
            clamping: {
                axis4Clamp: "M10",
                axis4Unclamp: "M11",
                axis5Clamp: "M26",
                axis5Unclamp: "M27"
            },
            // Collision avoidance - verified
            collisionAvoidance: {
                off: "CASOF",  // CAS OFF before 5-axis
                on: "CASON"   // CAS ON after
            },
            // Chip conveyor - verified
            chipConveyor: {
                on: "M50",
                off: "M51"
            },
            // Automatic door - verified
            door: {
                open: "M206",
                close: "M207"
            },
            // Tool change - verified
            toolChange: {
                format: "T{tool}",
                lengthComp: "G56 H{tool}",
                lengthCompCancel: "G40"
            },
            // Probing - verified
            probing: {
                fixtureOffset: "CALL OO88",
                calibration: "CALL OO99"
            },
            programStart: [
                "$",
                "({name})",
                "(PRISM AI OPTIMIZED - OKUMA OSP-P300M)",
                "(DATE: {date})"
            ],

            safeStart: [
                "G40 G80",
                "G17",
                "G15 H0"
            ]
        },
        // OKUMA OSP-P300L/LA (Lathe)
        // Source: OKUMA_LATHE_LB3000-Ai-Enhanced.cps
        okuma_osp_p300l: {
            name: "Okuma OSP-P300L/LA",
            vendor: "Okuma",
            dialect: "okuma",
            extension: "min",

            // Programming mode
            programming: {
                diameter: true,   // X is diameter
                inches: true      // Imperial units
            },
            formats: {
                g: { prefix: "G", decimals: 0 },
                m: { prefix: "M", decimals: 0 },
                x: { prefix: "X", decimals: 4, scale: 2 },  // Diameter mode
                z: { prefix: "Z", decimals: 4 },
                tool: { minDigitsLeft: 4 },
                rpm: { decimals: 0 },
                feed: { decimals: 4 }  // IPR format
            },
            // Coolant - verified
            coolant: {
                flood: { on: "M8", off: "M9" },
                tsc: { on: "M143", off: "M142" },
                airSpindle1: { on: "M51", off: "M50" },
                airSpindle2: { on: "M288", off: "M289" }
            },
            // Spindle control - verified (different for main/sub/live)
            spindle: {
                main: {
                    cw: "M3",
                    ccw: "M4",
                    stop: "M5",
                    orient: "M19",
                    select: "G140"
                },
                sub: {
                    cw: "M3",
                    ccw: "M4",
                    stop: "M5",
                    orient: "M239",
                    select: "G141"
                },
                live: {
                    cw: "M13",
                    ccw: "M14",
                    stop: "M12"
                }
            },
            // C-axis control - verified
            cAxis: {
                enable: "G110",
                disable: "G109",
                cw: "M15",
                ccw: "M16",
                lock: "G147",
                unlock: "G146"
            },
            // Y-axis control - verified
            yAxis: {
                enable: "G138",
                disable: "G136"
            },
            // Polar interpolation - verified
            polar: {
                on: "G137",
                off: "G136"
            },
            // SSV (Spindle Speed Variation) - verified
            ssv: {
                on: "M695",
                off: "M694",
                amplitudeVar: "VSSVA",   // SSV amplitude variable
                periodVar: "VSSVT"       // SSV period variable
            },
            // Constant Surface Speed - verified
            css: {
                on: "G96",
                off: "G97",
                maxRpm: "G50"  // G50 S{max}
            },
            // Feed mode - verified
            feedMode: {
                perMinute: "G94",
                perRev: "G95"
            },
            // Chuck control - verified
            chuck: {
                mainClamp: "M83",
                mainUnclamp: "M84",
                subClamp: "M248",
                subUnclamp: "M249"
            },
            // Tailstock - verified
            tailstock: {
                on: "M21",
                off: "M20"
            },
            // Part catcher - verified
            partCatcher: {
                on: "M77",
                off: "M76"
            },
            // Spindle synchronization - verified
            spindleSync: {
                speed: "M151",
                off: "M150"
            },
            // Interlock - verified
            interlock: {
                mainOn: "M185",
                mainOff: "M184",
                subOn: "M247",
                subOff: "M246"
            },
            // Turning cycles - verified
            turningCycles: {
                roughing: "G85",      // With NAT subprogram
                finishing: "G86",
                threading: "G71",
                threadingSimple: "G33",
                grooving: "G75"
            },
            // Cycle time optimization - verified
            cycleTimeOptimization: {
                ignoreSpindleAnswer: "M63",
                restoreSpindleAnswer: "M62",
                cssSmoothing: "M61",
                cssSmoothingOff: "M60",
                turretOverlap: "M65",
                rapidIgnore: "M216",
                rapidNormal: "M215",
                toolPreload: "MT={tool}"
            },
            // Torque control - verified
            torque: {
                limitOn: "M29",
                limitOff: "M28",
                skipOn: "M22"
            },
            programStart: [
                "$",
                "({name})",
                "(PRISM AI OPTIMIZED - OKUMA OSP-P300L)"
            ]
        },
        // HURCO WinMax Control
        // Source: HURCO_VM30i_Ai-Enhanced__iMachining_.cps
        hurco_winmax: {
            name: "Hurco WinMax",
            vendor: "Hurco",
            dialect: "hurco",
            extension: "hnc",

            // Supports both ISNC and BNC modes
            modes: {
                isnc: true,   // ISO NC mode
                bnc: true     // Basic NC mode
            },
            formats: {
                xyz: { decimals: 4, forceDecimal: true },
                feed: { decimals: 3, forceDecimal: true },
                rpm: { decimals: 0 }
            },
            // Coolant - verified
            coolant: {
                flood: { on: "M8", off: "M9" },
                tsc: { on: "M88", off: "M89" },
                air: { on: "M98 P9015", off: "M98 P9016" }  // Subprogram call
            },
            // Spindle - standard
            spindle: {
                cw: "M3",
                ccw: "M4",
                stop: "M5"
            },
            // G05.3 Smoothing - verified (Hurco specific)
            smoothing: {
                rough: "G05.3 P50",      // Tolerance 0.050"
                adaptive: "G05.3 P35",   // Tolerance 0.035"
                semifinish: "G05.3 P25", // Tolerance 0.025"
                finish: "G05.3 P15",     // Tolerance 0.015"
                ultraFinish: "G05.3 P5", // Tolerance 0.005"
                off: "G05.3 P0"
            },
            // UltiFeed adaptive control
            ultiFeed: {
                on: "G05.4",
                off: "G05.4 P0"
            },
            // Probing
            probing: {
                cycle: "G65 P9100"
            },
            // Tool change - smoothing output after M6
            toolChange: {
                format: "T{tool} M6",
                preload: true,
                smoothingAfterM6: true
            },
            programStart: [
                "%",
                "O{number}",
                "(PRISM AI OPTIMIZED - HURCO WINMAX)"
            ],

            safeStart: [
                "G28 G91 Z0.",