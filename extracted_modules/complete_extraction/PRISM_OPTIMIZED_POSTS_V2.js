const PRISM_OPTIMIZED_POSTS_V2 = {

    // CONTROLLER FAMILY DEFINITIONS
    // Base configurations inherited by machine-specific posts

    CONTROLLER_FAMILIES: {

        // FANUC FAMILY
        fanuc_base: {
            name: "FANUC",
            extension: "nc",
            programStart: "%",
            programEnd: "M30\n%",
            lineNumbers: false,
            blockSkip: "/",
            optionalStop: "M1",
            modalGroups: {
                motion: { G00: "rapid", G01: "linear", G02: "cwArc", G03: "ccwArc" },
                plane: { G17: "XY", G18: "XZ", G19: "YZ" },
                absolute: { G90: "absolute", G91: "incremental" },
                feedMode: { G94: "perMinute", G95: "perRev" },
                units: { G20: "inch", G21: "mm" },
                cutterComp: { G40: "off", G41: "left", G42: "right" },
                toolLength: { G43: "positive", G44: "negative", G49: "cancel" },
                workOffset: { G54: 1, G55: 2, G56: 3, G57: 4, G58: 5, G59: 6 }
            },
            coolant: {
                flood: { on: "M8", off: "M9" },
                mist: { on: "M7", off: "M9" },
                tsc: { on: "M88", off: "M89" },
                air: { on: "M51", off: "M59" }
            },
            spindle: {
                cw: "M3", ccw: "M4", stop: "M5", orient: "M19"
            },
            toolChange: {
                code: "M6",
                format: "T{tool} M6",
                preload: true
            },
            safeStart: [
                "G28 G91 Z0.",
                "G28 X0. Y0.",
                "G90 G17 G40 G49 G80"
            ],
            safeEnd: [
                "G28 G91 Z0.",
                "G28 X0. Y0.",
                "M5", "M9"
            ],
            highSpeed: {
                available: false
            }
        },
        fanuc_31i: {
            inherits: "fanuc_base",
            name: "FANUC 31i-B",
            highSpeed: {
                available: true,
                aiContour: { on: "G05 P10000", off: "G05 P0" },
                nanoSmooth: { on: "G05.1 Q1", off: "G05.1 Q0" },
                lookAhead: 200
            },
            fiveAxis: {
                tcpc: { on: "G43.4", off: "G49" },
                tiltedPlane: "G68.2"
            }
        },
        fanuc_0i: {
            inherits: "fanuc_base",
            name: "FANUC 0i-MF",
            highSpeed: {
                available: true,
                hpcc: { on: "G05.1 Q1", off: "G05.1 Q0" },
                lookAhead: 40
            }
        },
        // HAAS NGC
        haas_ngc: {
            inherits: "fanuc_base",
            name: "Haas NGC",
            extension: "nc",
            smoothing: {
                rough: "G187 P1 E0.001",
                medium: "G187 P2 E0.0005",
                finish: "G187 P3 E0.0001"
            },
            coolant: {
                flood: { on: "M8", off: "M9" },
                tsc: { on: "M88", off: "M89" },
                air: { on: "M83", off: "M84" },
                airThruSpindle: { on: "M73", off: "M74" }
            },
            chipConveyor: { on: "M32", off: "M33" },
            door: { open: "M85", close: "M86" },
            probing: {
                protected: "G65 P9832",
                singleSurface: "G65 P9811",
                webPocket: "G65 P9812",
                boreBoss: "G65 P9814",
                cornerXY: "G65 P9815"
            },
            dwo: { on: "G254", off: "G255" },
            toolChange: {
                code: "M6",
                format: "T{tool} M6",
                preload: true,
                fastChange: false
            },
            rigidTap: {
                cw: "G84",
                ccw: "G74"
            }
        },
        // OKUMA OSP-P SERIES
        okuma_osp_p300m: {
            name: "Okuma OSP-P300M/MA",
            extension: "MIN",
            programStart: "$",
            programEnd: "M30",
            lineNumbers: true,
            lineNumberFormat: "N{n}",
            workOffset: {
                spindle1: "G140",
                spindle2: "G141",
                offset: "G15 H{offset}"
            },
            smoothing: {
                superNurbs: { on: "G131", off: "G130", quality: "P{1-3}" },
                highSpeed: { on: "G132", off: "G131" }
            },
            fiveAxis: {
                tcp: { on: "G169", off: "G170" },
                tiltedPlane: "G68.2",
                singularityAvoid: true
            },
            highPrecision: {
                on: "G08 P1",
                off: "G08 P0",
                cornerRounding: "G62"
            },
            coolant: {
                flood: { on: "COOLNT1", off: "COOLF" },
                tsc: { on: "M51", off: "M59" },
                air: { on: "M77", off: "M78" }
            },
            cycleTimeOptimization: {
                ignoreSpindleAnswer: "M63",
                cssSmoothing: "M61",
                turretOverlap: "M65",
                moveOptimize: "M64",
                rapidIgnore: "M216",
                rapidIgnoreOff: "M215"
            },
            collisionAvoidance: {
                on: "CASOF",
                off: "CASON"
            },
            spindle: {
                cw: "M3", ccw: "M4", stop: "M5",
                orient: "SPTS0",
                orientAngle: "SPTA{angle}"
            },
            toolChange: {
                format: "T{turret}D{offset}",
                preload: "MT={tool}"
            },
            probing: {
                enabled: true,
                cycle: "CALL OO88",
                calibration: "CALL OO99"
            }
        },
        okuma_osp_p300l: {
            inherits: "okuma_osp_p300m",
            name: "Okuma OSP-P300L/LA",
            programming: {
                diameter: true,
                inches: true
            },
            turningCycles: {
                roughing: "G85",
                finishing: "G86",
                threading: "G71",
                threadingSimple: "G33",
                grooving: "G75",
                partOff: "G75"
            },
            ssv: {
                on: "M695",
                off: "M694",
                amplitude: "SSV={amp},{period}"
            },
            constantSurfaceSpeed: {
                on: "G96",
                off: "G97",
                maxRpm: "S{max} G50"
            },
            tailstock: {
                advance: "M21",
                retract: "M22"
            },
            partCatcher: {
                on: "M23",
                off: "M24"
            },
            barFeeder: {
                advance: "M25",
                clamp: "M26"
            }
        },
        // HURCO WINMAX
        hurco_winmax: {
            name: "Hurco WinMax",
            extension: "hnc",
            programStart: "%",
            programEnd: "M30\n%",
            isnc: true,  // ISO NC mode
            smoothing: {
                rough: "G05.3 P50",
                adaptive: "G05.3 P35",
                semifinish: "G05.3 P25",
                finish: "G05.3 P15",
                ultraFinish: "G05.3 P5"
            },
            ultiFeed: {
                enabled: true,
                mode: "G05.4"
            },
            coolant: {
                flood: { on: "M8", off: "M9" },
                tsc: { on: "M88", off: "M89" },
                air: { on: "M98 P9015", off: "M98 P9016" }
            },
            toolChange: {
                format: "T{tool} M6",
                preload: true,
                smoothingAfterM6: true
            },
            probing: {
                enabled: true,
                cycle: "G65 P9100"
            }
        },
        // DMG MORI CELOS / MAPPS
        dmgmori_celos: {
            name: "DMG MORI CELOS",
            extension: "nc",
            highSpeed: {
                mode: { on: "M200", off: "M201" }
            },
            aiChipRemoval: true,
            mpc: true,  // Machine Protection Control
            coolant: {
                flood: { on: "M8", off: "M9" },
                tsc: { on: "M88", off: "M89" }
            }
        },
        // MAZAK MAZATROL / SMOOTH
        mazak_smooth: {
            name: "Mazak SmoothG/Ai",
            extension: "eia",
            highSpeed: {
                variableAccel: { on: "G05.1 Q1", off: "G05.1 Q0" }
            },
            intelligentThermal: true,
            voiceAdvisor: true,
            smoothAi: true
        },
        // SIEMENS SINUMERIK
        siemens_840d: {
            name: "SINUMERIK 840D sl",
            extension: "mpf",
            programStart: "; SINUMERIK Program",
            programEnd: "M30",
            highSpeed: {
                cycle832: "CYCLE832({tol},{mode})",
                compressor: { on: "COMPON", off: "COMPOF" },
                compCurve: { on: "COMPCURV", off: "COMPOF" },
                lookAhead: { on: "FFWON", off: "FFWOF" }
            },
            fiveAxis: {
                traori: { on: "TRAORI", off: "TRAFOOF" },
                tcpm: "TCPM"
            },
            toolRadius: {
                wear: "CUTMOD",
                compensation3D: "CUT3DC"
            }
        },
        // HEIDENHAIN TNC
        heidenhain_tnc640: {
            name: "Heidenhain TNC 640",
            extension: "h",
            conversational: true,
            plainText: true,
            highSpeed: {
                cycledef32: "CYCL DEF 32 TOLERANCE",
                smoothing: "M120",
                lookAhead: "M128"
            },
            fiveAxis: {
                tcpm: "M128",
                function19: "PLANE FUNCTION TILT"
            }
        },
        // BROTHER CNC-C00
        brother_cnc: {
            name: "Brother CNC-C00/B00",
            extension: "nc",
            highSpeed: {
                aiCorner: { on: "G05 P1", off: "G05 P0" }
            },
            rapidTap: true,  // 100ms tool-to-tool
            toolChange: {
                ultraFast: true,
                time: 1.4  // seconds chip-to-chip
            }
        },
        // MAKINO PROFESSIONAL
        makino_pro: {
            name: "Makino Pro 6",
            extension: "nc",
            inherits: "fanuc_31i",
            highSpeed: {
                sgi: { on: "G05 P2", off: "G05 P0" },
                geoMotion: { on: "G05 P10000", off: "G05 P0" }
            },
            inertiaControl: true,
            coreStiffness: true
        }
    },
    // MACHINE-SPECIFIC POST CONFIGURATIONS
    // Optimized settings for each machine model

    MACHINES: {

        // OKUMA MILLS

        okuma_genos_m460ve: {
            controller: "okuma_osp_p300m",
            name: "Okuma GENOS M460-VE",
            specs: { maxRpm: 15000, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 },
            postConfig: {
                smoothing: { default: "G131 P2", finish: "G131 P3" },
                cycleTime: ["M63", "M61"],
                probing: true
            }
        },
        okuma_genos_m460v_5ax: {
            controller: "okuma_osp_p300m",
            name: "Okuma GENOS M460V-5AX",
            specs: { maxRpm: 15000, taper: "CAT40", axes: 5, tsc: true, tscPsi: 300 },
            postConfig: {
                fiveAxis: {
                    tcp: { on: "G169", off: "G170" },
                    lookAhead: 100,
                    singularityThreshold: 5
                },
                smoothing: { default: "G131 P2", finish: "G131 P3", fiveAxis: "G131 P2" },
                rotaryReposition: { enabled: true, maxAngle: 180 },
                cycleTime: ["M63", "M61"]
            }
        },
        okuma_mu4000v: {
            controller: "okuma_osp_p300m",
            name: "Okuma MU-4000V",
            specs: { maxRpm: 15000, taper: "CAT40", axes: 5, tsc: true, tscPsi: 1000 },
            postConfig: {
                fiveAxis: {
                    tcp: { on: "G169", off: "G170" },
                    tableTable: true,
                    cAxisRotary: true
                },
                smoothing: { default: "G131 P2", finish: "G131 P3" },
                highPrecision: { on: "G08 P1", tolerance: 0.0001 }
            }
        },
        okuma_mu5000v: {
            inherits: "okuma_mu4000v",
            name: "Okuma MU-5000V",
            specs: { maxRpm: 20000, taper: "HSK-A63", axes: 5, tsc: true, tscPsi: 1000 }
        },
        // OKUMA LATHES

        okuma_lb3000exii: {
            controller: "okuma_osp_p300l",
            name: "Okuma LB3000EXII",
            specs: {
                mainSpindleRpm: 5000, subSpindleRpm: 5000,
                liveToolRpm: 6000, turretStations: 12,
                yAxis: true, yTravel: 2.17
            },
            postConfig: {
                ssv: { enabled: true, amplitude: 50, period: 2.0 },
                cycleTime: {
                    toolPreload: true,
                    circularPreload: true,
                    ignoreSpindleAnswer: true,
                    cssSmoothing: true,
                    combinedCommands: true
                },
                turningCycles: { roughing: "G85", finishing: "G86" }
            }
        },
        okuma_genos_l400ii: {
            controller: "okuma_osp_p300l",
            name: "Okuma Genos L400II-e",
            specs: {
                mainSpindleRpm: 5000, turretStations: 12,
                yAxis: false
            },
            postConfig: {
                ssv: { enabled: true, amplitude: 40, period: 2.5 },
                cycleTime: {
                    toolPreload: true,
                    ignoreSpindleAnswer: true
                }
            }
        },
        // OKUMA MILL-TURN

        okuma_multus_b250iiw: {
            controller: "okuma_osp_p300m",
            name: "Okuma Multus B250IIW",
            specs: {
                mainSpindleRpm: 5000, millSpindleRpm: 12000,
                turretStations: 40, yAxis: true, bAxis: true,
                bAxisAngles: [0, 45, 90, 135, 180]
            },
            postConfig: {
                millTurn: true,
                spindle2Offset: { x: 0, z: 0 },
                tcp: { on: "G255", off: "G254" },
                fiveAxis: { bAxisEncoding: true },
                smoothing: { superNurbs: "G131 P3", highSpeed: "G132" },
                cycleTime: {
                    toolPreload: true,
                    circularPreload: true,
                    ignoreSpindleAnswer: true,
                    cssSmoothing: true
                }
            }
        },
        // HAAS MILLS

        haas_vf1: {
            controller: "haas_ngc",
            name: "Haas VF-1",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 3, tsc: false },
            postConfig: {
                smoothing: { auto: true, roughing: "G187 P1", finishing: "G187 P3" },
                chipConveyor: true
            }
        },
        haas_vf2: {
            controller: "haas_ngc",
            name: "Haas VF-2",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 },
            postConfig: {
                smoothing: { auto: true, roughing: "G187 P1", finishing: "G187 P3" },
                chipConveyor: true,
                probing: true
            }
        },
        haas_vf2ss: {
            inherits: "haas_vf2",
            name: "Haas VF-2SS",
            specs: { maxRpm: 12000, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 }
        },
        haas_vf3: {
            inherits: "haas_vf2",
            name: "Haas VF-3",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 }
        },
        haas_vf4: {
            inherits: "haas_vf2",
            name: "Haas VF-4",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 }
        },
        haas_vf5: {
            inherits: "haas_vf2",
            name: "Haas VF-5/40",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 }
        },
        haas_umc500: {
            controller: "haas_ngc",
            name: "Haas UMC-500",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 5, tsc: true, tscPsi: 300 },
            postConfig: {
                fiveAxis: {
                    dwo: { on: "G254", off: "G255" },
                    tcpc: "G234"
                },
                smoothing: { auto: true, roughing: "G187 P2", finishing: "G187 P3" },
                rotaryClamp: { a: { clamp: "M10", unclamp: "M11" }, c: { clamp: "M12", unclamp: "M13" } }
            }
        },
        haas_umc750: {
            inherits: "haas_umc500",
            name: "Haas UMC-750",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 5, tsc: true, tscPsi: 300 }
        },
        haas_umc1000: {
            inherits: "haas_umc500",
            name: "Haas UMC-1000",
            specs: { maxRpm: 8100, taper: "CAT40", axes: 5, tsc: true, tscPsi: 300 }
        },
        // HAAS LATHES

        haas_st10: {
            controller: "haas_ngc",
            name: "Haas ST-10",
            specs: { mainSpindleRpm: 6000, turretStations: 12, liveTools: false },
            postConfig: {
                programming: { diameter: true }
            }
        },
        haas_st20: {
            controller: "haas_ngc",
            name: "Haas ST-20",
            specs: { mainSpindleRpm: 4000, turretStations: 12, liveTools: true, cAxis: true },
            postConfig: {
                programming: { diameter: true },
                liveTooling: { maxRpm: 4000 }
            }
        },
        haas_st30: {
            inherits: "haas_st20",
            name: "Haas ST-30",
            specs: { mainSpindleRpm: 3400, turretStations: 12, liveTools: true, cAxis: true }
        },
        // HURCO MILLS

        hurco_vm10i: {
            controller: "hurco_winmax",
            name: "Hurco VM10i",
            specs: { maxRpm: 12000, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 },
            postConfig: {
                smoothing: { rough: "G05.3 P50", adaptive: "G05.3 P35", finish: "G05.3 P15" }
            }
        },
        hurco_vm20i: {
            inherits: "hurco_vm10i",
            name: "Hurco VM20i"
        },
        hurco_vm30i: {
            inherits: "hurco_vm10i",
            name: "Hurco VM30i"
        },
        hurco_vmx42i: {
            controller: "hurco_winmax",
            name: "Hurco VMX42i",
            specs: { maxRpm: 12000, taper: "CAT40", axes: 3, tsc: true, tscPsi: 300 },
            postConfig: {
                smoothing: { rough: "G05.3 P50", adaptive: "G05.3 P35", finish: "G05.3 P15" }
            }
        },
        hurco_vmx60i: {
            inherits: "hurco_vmx42i",
            name: "Hurco VMX60i"
        },
        // DMG MORI MILLS

        dmgmori_m1: {
            controller: "dmgmori_celos",
            name: "DMG MORI M1",
            specs: { maxRpm: 10000, taper: "SK40", axes: 3 }
        },
        dmgmori_dmc650v: {
            controller: "dmgmori_celos",
            name: "DMG MORI DMC 650 V",
            specs: { maxRpm: 14000, taper: "HSK-A63", axes: 3, tsc: true }
        },
        dmgmori_dmu50: {
            controller: "dmgmori_celos",
            name: "DMG MORI DMU 50",
            specs: { maxRpm: 14000, taper: "HSK-A63", axes: 5, tsc: true },
            postConfig: {
                fiveAxis: { tcp: true }
            }
        },
        dmgmori_dmu80p: {
            controller: "dmgmori_celos",
            name: "DMG MORI DMU 80 P duoBLOCK",
            specs: { maxRpm: 18000, taper: "HSK-A63", axes: 5, tsc: true, tscPsi: 1000 }
        },
        // MAZAK MILLS

        mazak_vcn530c: {
            controller: "mazak_smooth",
            name: "Mazak VCN-530C",
            specs: { maxRpm: 18000, taper: "CAT40", axes: 3, tsc: true }
        },
        mazak_variaxis_i600: {
            controller: "mazak_smooth",
            name: "Mazak VARIAXIS i-600",
            specs: { maxRpm: 18000, taper: "HSK-A63", axes: 5, tsc: true, tscPsi: 1000 }
        },
        mazak_integrex_i200s: {
            controller: "mazak_smooth",
            name: "Mazak INTEGREX i-200S",
            specs: { mainSpindleRpm: 5000, millSpindleRpm: 12000, axes: 9, millTurn: true }
        },
        // MAKINO MILLS

        makino_ps95: {
            controller: "makino_pro",
            name: "Makino PS95",
            specs: { maxRpm: 14000, taper: "CAT40", axes: 3, tsc: true }
        },
        makino_a51nx: {
            controller: "makino_pro",
            name: "Makino a51nx",
            specs: { maxRpm: 14000, taper: "HSK-A63", axes: 4, tsc: true, tscPsi: 1000 }
        },
        makino_d500: {
            controller: "makino_pro",
            name: "Makino D500",
            specs: { maxRpm: 20000, taper: "HSK-A63", axes: 5, tsc: true, tscPsi: 1000 },
            postConfig: {
                highSpeed: { sgi: true, geoMotion: true }
            }
        },
        makino_mag3: {
            controller: "makino_pro",
            name: "Makino MAG3",
            specs: { maxRpm: 33000, taper: "HSK-E40", axes: 5, tsc: true },
            postConfig: {
                dieMold: true,
                highSpeed: { sgi: true }
            }
        },
        // HERMLE MILLS

        hermle_c22u: {
            controller: "heidenhain_tnc640",
            name: "Hermle C 22 U",
            specs: { maxRpm: 18000, taper: "HSK-A63", axes: 5, tsc: true }
        },
        hermle_c32u: {
            controller: "heidenhain_tnc640",
            name: "Hermle C 32 U",
            specs: { maxRpm: 18000, taper: "HSK-A63", axes: 5, tsc: true, tscPsi: 1000 }
        },
        hermle_c42u: {
            controller: "heidenhain_tnc640",
            name: "Hermle C 42 U",
            specs: { maxRpm: 18000, taper: "HSK-A63", axes: 5, tsc: true, tscPsi: 1000 }
        },
        // BROTHER MILLS

        brother_s500x1: {
            controller: "brother_cnc",
            name: "Brother Speedio S500X1",
            specs: { maxRpm: 16000, taper: "BT30", axes: 3, tsc: true },
            postConfig: {
                rapidTap: true,
                toolChangeTime: 1.4
            }
        },
        brother_s700x1: {
            controller: "brother_cnc",
            name: "Brother Speedio S700X1",
            specs: { maxRpm: 16000, taper: "BT30", axes: 3, tsc: true }
        },
        brother_m140x2: {
            controller: "brother_cnc",
            name: "Brother Speedio M140X2",
            specs: { maxRpm: 10000, taper: "BT30", axes: 5, tsc: true }
        },
        // DOOSAN MILLS

        doosan_dnm400: {
            controller: "fanuc_0i",
            name: "Doosan DNM 400",
            specs: { maxRpm: 12000, taper: "CAT40", axes: 3, tsc: true }
        },
        doosan_dnm500: {
            controller: "fanuc_0i",
            name: "Doosan DNM 500",
            specs: { maxRpm: 12000, taper: "CAT40", axes: 3, tsc: true }
        },
        doosan_dvf5000: {
            controller: "fanuc_31i",
            name: "Doosan DVF 5000",
            specs: { maxRpm: 12000, taper: "CAT40", axes: 5, tsc: true }
        },
        // ROKU-ROKU

        roku_roku_rqm5: {
            controller: "fanuc_31i",
            name: "Roku-Roku RQM-5",
            specs: { maxRpm: 30000, taper: "HSK-E32", axes: 5, tsc: true },
            postConfig: {
                highPrecision: true,
                nanoSmoothing: true
            }
        }
    },
    // POST COMPARISON TOOL
    // Compares uploaded post vs optimized post

    COMPARISON: {
        categories: [
            {
                name: "High-Speed Machining",
                id: "hsm",
                weight: 15,
                checks: [
                    { id: "hsm_mode", name: "HSM Mode Enabled", patterns: ["G05.1", "G05 P", "G187", "G131", "CYCLE832", "COMPON"] },
                    { id: "look_ahead", name: "Look-Ahead Buffer", patterns: ["lookAhead", "FFWON", "block buffer"] },
                    { id: "corner_smooth", name: "Corner Smoothing", patterns: ["G62", "corner", "rounding"] }
                ]
            },
            {
                name: "Feed Optimization",
                id: "feed",
                weight: 20,
                checks: [
                    { id: "chip_thin", name: "Chip Thinning Compensation", patterns: ["chipThinning", "chipLoad", "CTF", "radialEngagement"] },
                    { id: "dynamic_feed", name: "Dynamic Depth Feed", patterns: ["dynamicDepth", "adaptiveFeed", "variableFeed"] },
                    { id: "arc_correct", name: "Arc Feed Correction", patterns: ["arcFeed", "arcCorrection", "circularFeed"] },
                    { id: "imachining", name: "iMachining-Style Control", patterns: ["Intelligent Adaptive Roughing", "directionChange", "feedRamping"] }
                ]
            },
            {
                name: "5-Axis Control",
                id: "fiveaxis",
                weight: 15,
                checks: [
                    { id: "tcp", name: "TCP Control", patterns: ["G43.4", "G43.5", "G169", "TRAORI", "TCPM", "G234"] },
                    { id: "singularity", name: "Singularity Avoidance", patterns: ["singularity", "gimbal", "pole"] },
                    { id: "rotary_limit", name: "Rotary Speed Limiting", patterns: ["rotaryFeed", "axisLimit"] }
                ]
            },
            {
                name: "Coolant Control",
                id: "coolant",
                weight: 10,
                checks: [
                    { id: "tsc", name: "Through-Spindle Coolant", patterns: ["M88", "M51", "TSC", "throughSpindle"] },
                    { id: "pressure", name: "Programmable Pressure", patterns: ["coolantPressure", "COOLP"] },
                    { id: "air", name: "Air Blast", patterns: ["M83", "M77", "airBlast", "chipBlow"] }
                ]
            },
            {
                name: "Tool Management",
                id: "tools",
                weight: 10,
                checks: [
                    { id: "preload", name: "Tool Preload", patterns: ["preload", "nextTool", "MT="] },
                    { id: "breakage", name: "Breakage Detection", patterns: ["breakage", "toolBreak", "BTOUCH"] },
                    { id: "life", name: "Tool Life Management", patterns: ["toolLife", "wearOffset"] }
                ]
            },
            {
                name: "Probing & Inspection",
                id: "probing",
                weight: 10,
                checks: [
                    { id: "probing", name: "Probing Cycles", patterns: ["probing", "G65 P", "CYCLE977", "G54.4"] },
                    { id: "tool_setting", name: "Tool Setting", patterns: ["toolSetting", "toolMeasure", "G37"] }
                ]
            },
            {
                name: "Cycle Time Optimization",
                id: "cycletime",
                weight: 15,
                checks: [
                    { id: "min_retract", name: "Minimum Retract", patterns: ["minimumRetract", "clearanceHeight"] },
                    { id: "rapid_ignore", name: "Rapid Override Ignore", patterns: ["M216", "rapidIgnore"] },
                    { id: "spindle_ignore", name: "Ignore Spindle Answer", patterns: ["M63", "spindleIgnore"] },
                    { id: "combined", name: "Combined Commands", patterns: ["combinedCommand", "sameBlock"] }
                ]
            },
            {
                name: "Turning-Specific (Lathe)",
                id: "turning",
                weight: 5,
                checks: [
                    { id: "ssv", name: "SSV Chatter Control", patterns: ["SSV", "M695", "spindleVariation"] },
                    { id: "css", name: "Constant Surface Speed", patterns: ["G96", "constantSurface", "CSS"] },
                    { id: "canned_turn", name: "Canned Turning Cycles", patterns: ["G85", "G86", "G71", "roughingCycle"] }
                ]
            }
        ],

        /**
         * Compare uploaded post to optimized configuration
         * @param {string} uploadedContent - Content of uploaded post
         * @param {string} machineId - Machine identifier
         * @returns {object} Comparison results
         */
        compare: function(uploadedContent, machineId) {
            const machine = OPTIMIZED_POSTS.MACHINES[machineId];
            if (!machine) return null;

            const results = {
                machineId: machineId,
                machineName: machine.name,
                uploadedScore: 0,
                optimizedScore: 100,
                categories: [],
                improvements: [],
                codeExamples: []
            };
            let totalWeight = 0;
            let uploadedWeightedScore = 0;

            this.categories.forEach(category => {
                const categoryResult = {
                    name: category.name,
                    id: category.id,
                    weight: category.weight,
                    uploadedChecks: 0,
                    optimizedChecks: category.checks.length,
                    checks: []
                };
                category.checks.forEach(check => {
                    const hasFeature = check.patterns.some(pattern =>
                        uploadedContent.toLowerCase().includes(pattern.toLowerCase())
                    );

                    categoryResult.checks.push({
                        name: check.name,
                        uploaded: hasFeature,
                        optimized: true  // Our posts have all features
                    });

                    if (hasFeature) {
                        categoryResult.uploadedChecks++;
                    } else {
                        // Add to improvements list
                        results.improvements.push({
                            category: category.name,
                            feature: check.name,
                            impact: this.getImpactDescription(check.id)
                        });
                    }
                });

                const categoryScore = (categoryResult.uploadedChecks / categoryResult.optimizedChecks) * 100;
                categoryResult.uploadedScore = Math.round(categoryScore);
                categoryResult.optimizedScore = 100;

                uploadedWeightedScore += (categoryScore * category.weight);
                totalWeight += category.weight;

                results.categories.push(categoryResult);
            });

            results.uploadedScore = Math.round(uploadedWeightedScore / totalWeight);
            results.potentialImprovement = 100 - results.uploadedScore;

            return results;
        },
        getImpactDescription: function(checkId) {
            const impacts = {
                hsm_mode: "Up to 30% faster toolpaths with smoother motion",
                look_ahead: "Reduces hesitation at corners and direction changes",
                corner_smooth: "Eliminates corner dwell marks on parts",
                chip_thin: "Correct feeds at low engagement - prevents rubbing",
                dynamic_feed: "Adaptive toolpaths run 20-40% faster",
                arc_correct: "Prevents overcutting in tight arcs",
                imachining: "Intelligent feed control based on cutting conditions",
                tcp: "Accurate 5-axis positioning without post compensation",
                singularity: "Avoids dangerous gimbal lock conditions",
                rotary_limit: "Prevents excessive rotary axis speeds",
                tsc: "Better chip evacuation, 30% longer tool life",
                pressure: "Optimal coolant pressure for each operation",
                air: "Chip clearing for deep pockets and holes",
                preload: "Reduces tool change time by 30-50%",
                breakage: "Automatic detection of broken tools",
                life: "Track tool wear and schedule replacements",
                probing: "In-process measurement and compensation",
                tool_setting: "Automatic tool length and diameter measurement",
                min_retract: "Saves 5-15% cycle time on multi-operation parts",
                rapid_ignore: "Maximum rapid speed regardless of override",
                spindle_ignore: "Axis moves during spindle accel/decel",
                combined: "Multiple operations on single block",
                ssv: "Eliminates chatter during turning",
                css: "Optimal surface speed across varying diameters",
                canned_turn: "Efficient roughing with canned cycles"
            };
            return impacts[checkId] || "Improved machining performance";
        },
        /**
         * Generate before/after code examples
         * @param {string} machineId - Machine identifier
         * @returns {array} Code comparison examples
         */
        generateCodeExamples: function(machineId) {
            const machine = OPTIMIZED_POSTS.MACHINES[machineId];
            const controller = OPTIMIZED_POSTS.CONTROLLER_FAMILIES[machine?.controller];

            if (!machine || !controller) return [];

            const examples = [];

            // Example 1: Tool Change
            examples.push({
                title: "Optimized Tool Change",
                description: "Tool preload and smoothing applied automatically",
                before: [
                    "G28 G91 Z0.",
                    "M5",
                    "M9",
                    "T2 M6",
                    "S8000 M3",
                    "G43 H2"
                ],
                after: this.generateToolChangeCode(machine, controller, 2, 8000)
            });

            // Example 2: HSM Settings
            if (controller.smoothing || controller.highSpeed) {
                examples.push({
                    title: "High-Speed Machining Mode",
                    description: "Automatic HSM settings based on operation type",
                    before: [
                        "(No HSM settings)"
                    ],
                    after: this.generateHSMCode(machine, controller, "adaptive")
                });
            }
            // Example 3: 5-Axis TCP (if applicable)
            if (machine.specs?.axes === 5 && controller.fiveAxis) {
                examples.push({
                    title: "5-Axis TCP Control",
                    description: "Tool Center Point control for accurate positioning",
                    before: [
                        "(Manual TCP compensation required)"
                    ],
                    after: this.generateTCPCode(machine, controller)
                });
            }
            return examples;
        },
        generateToolChangeCode: function(machine, controller, toolNum, speed) {
            const lines = [];

            // Safe retract
            if (controller.safeEnd) {
                lines.push(controller.safeEnd[0]);
            } else {
                lines.push("G28 G91 Z0.");
            }
            // Coolant off
            lines.push(controller.coolant?.flood?.off || "M9");

            // Spindle stop
            lines.push(controller.spindle?.stop || "M5");

            // Tool change with preload
            const toolFormat = controller.toolChange?.format || "T{tool} M6";
            lines.push(toolFormat.replace("{tool}", toolNum));

            // Preload next tool
            if (controller.toolChange?.preload) {
                lines.push(`T${toolNum + 1} (PRELOAD)`);
            }
            // Smoothing (if available)
            if (controller.smoothing) {
                lines.push(`${controller.smoothing.medium || controller.smoothing.rough} (AUTO SMOOTHING)`);
            }
            // Spindle start
            lines.push(`S${speed} ${controller.spindle?.cw || "M3"}`);

            // Tool length compensation
            lines.push(`G43 H${toolNum}`);

            return lines;
        },
        generateHSMCode: function(machine, controller, operationType) {
            const lines = [];

            if (controller.smoothing) {
                const mode = operationType === "finishing" ?
                    controller.smoothing.finish :
                    (operationType === "adaptive" ? controller.smoothing.adaptive || controller.smoothing.medium : controller.smoothing.rough);
                lines.push(`${mode} (${operationType.toUpperCase()} SMOOTHING)`);
            }
            if (controller.highSpeed?.available) {
                if (controller.highSpeed.aiContour) {
                    lines.push(`${controller.highSpeed.aiContour.on} (AI CONTOUR)`);
                } else if (controller.highSpeed.nanoSmooth) {
                    lines.push(`${controller.highSpeed.nanoSmooth.on} (NANO SMOOTHING)`);
                } else if (controller.highSpeed.superNurbs) {
                    lines.push(`${controller.highSpeed.superNurbs.on} (SUPER NURBS)`);
                }
            }
            return lines;
        },
        generateTCPCode: function(machine, controller) {
            const lines = [];

            if (controller.fiveAxis?.tcp) {
                lines.push(`${controller.fiveAxis.tcp.on} (TCP ON - TOOL CENTER POINT)`);
                lines.push("G0 A0. C0. (INITIAL ORIENTATION)");
                lines.push("(... 5-axis toolpath ...)");
                lines.push(`${controller.fiveAxis.tcp.off} (TCP OFF)`);
            }
            return lines;
        }
    }
}