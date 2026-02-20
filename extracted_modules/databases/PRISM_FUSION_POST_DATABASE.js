const PRISM_FUSION_POST_DATABASE = {
    version: '8.9.400',
    totalPosts: 180,
    manufacturers: {
        haas: {
            vendor: "Haas Automation",
            vendorUrl: "https://www.haascnc.com",
            controller: "Haas NGC / Pre-NGC",
            postCount: 53,
            models: ["VF", "DM", "Office Mill", "Mini Mill", "UMC-750", "VR Series", "ST Series", "DS Series", "EC Series", "GM2-5AX"],
            capabilities: ["milling", "turning", "5-axis", "probing"],
            features: {
                g187Smoothing: { code: "G187", modes: ["Rough", "Medium", "Finish"], desc: "Surface smoothing mode" },
                extendedWCS: { code: "G154 P1-P99", desc: "Extended work coordinate systems" },
                dwo: { codes: ["G254", "G255"], desc: "Dynamic Work Offset for 5-axis" },
                toolPreload: { code: "T", desc: "Preload next tool during machining" },
                chipConveyor: { mCode: "M32", desc: "Chip conveyor control" },
                toolBreakage: { macro: "O9999", desc: "Tool breakage detection" },
                probing: { macros: ["O9810", "O9811", "O9812"], desc: "Renishaw probing cycles" }
            }
        },
        mazak: {
            vendor: "Mazak",
            vendorUrl: "https://www.mazakusa.com",
            controller: "Mazatrol SmoothX/SmoothG",
            postCount: 48,
            models: ["Quick Turn 100-450", "QTU 200-350", "Integrex i-100 to i-400", "EZ Series", "VCN", "Variaxis"],
            capabilities: ["milling", "turning", "mill-turn", "5-axis"],
            features: {
                smoothTurning: { desc: "Smooth turning interpolation" },
                yAxis: { code: "G17.4/G17.3", desc: "Y-axis milling on lathes" },
                subSpindle: { mCodes: ["M83", "M84"], desc: "Sub-spindle control" },
                bAxis: { code: "B", desc: "B-axis indexing/interpolation" },
                cAxis: { code: "C", desc: "C-axis positioning" },
                integrexModes: { codes: ["G112", "G113"], desc: "Mill/turn mode switching" }
            }
        },
        siemens: {
            vendor: "Siemens",
            vendorUrl: "https://www.siemens.com/sinumerik",
            controller: "SINUMERIK",
            postCount: 11,
            models: ["802D", "808D", "810D", "828D", "840C", "840D", "SINUMERIK ONE"],
            capabilities: ["milling", "turning", "mill-turn", "5-axis"],
            features: {
                cycle800: { code: "CYCLE800", desc: "Swivel data cycle for 5-axis" },
                transmit: { code: "TRANSMIT", desc: "Transform milling on turning" },
                tracyl: { code: "TRACYL", desc: "Cylinder surface transformation" },
                traori: { code: "TRAORI", desc: "5-axis orientation transformation" },
                compressor: { code: "COMPON/COMPOF", desc: "Spline compressor" },
                lookAhead: { code: "FFWON", desc: "Feed forward look-ahead" }
            }
        },
        fanuc: {
            vendor: "Fanuc",
            vendorUrl: "https://www.fanuc.com",
            controller: "Fanuc 0i/30i/31i",
            postCount: 7,
            models: ["Generic", "Robodrill", "Compact", "Incremental"],
            capabilities: ["milling", "turning", "robotics"],
            features: {
                aiContour: { code: "G05.1 Q1", desc: "AI Contour Control" },
                nanoSmoothing: { code: "G5.1", desc: "Nano smoothing" },
                hpcc: { code: "G08 P1", desc: "High-precision contour control" },
                aicc2: { code: "G05.1 Q3", desc: "AI Contour Control II" }
            }
        },
        heidenhain: {
            vendor: "Heidenhain",
            vendorUrl: "https://www.heidenhain.com",
            controller: "Heidenhain TNC",
            postCount: 8,
            models: ["TNC 145", "TNC 155", "TNC 407", "TNC 426", "TNC 530", "TNC 640", "TNC7"],
            capabilities: ["milling", "turning", "5-axis"],
            features: {
                planeSpatial: { code: "PLANE SPATIAL", desc: "5-axis plane definition" },
                tcpm: { code: "M128", desc: "Tool center point management" },
                cycle19: { code: "CYCL DEF 19", desc: "Working plane definition" },
                dcm: { code: "DCM", desc: "Dynamic Collision Monitoring" },
                afc: { code: "AFC", desc: "Adaptive Feed Control" }
            }
        },
        okuma: {
            vendor: "OKUMA",
            vendorUrl: "https://www.okuma.com",
            controller: "OSP-P300/P500",
            postCount: 3,
            models: ["LB3000", "LB4000", "Genos L", "Genos M", "Multus B", "M460V-5AX", "MU Series"],
            capabilities: ["milling", "turning", "mill-turn", "5-axis"],
            features: {
                collisionAvoidance: { code: "G370/G371", desc: "Collision avoidance system" },
                superNurbs: { code: "G06.2", desc: "Super-NURBS interpolation" },
                machiningNavi: { desc: "Machining condition optimization" },
                navi5: { desc: "5-axis auto tuning" }
            }
        },
        dmgMori: {
            vendor: "DMG MORI",
            vendorUrl: "https://www.dmgmori.com",
            controller: "CELOS/Fanuc/Siemens",
            postCount: 4,
            models: ["CMX", "NHX", "NLX", "DMU", "NTX"],
            capabilities: ["milling", "turning", "mill-turn", "5-axis"],
            features: {
                techCycles: { desc: "Technology cycles for operations" },
                mpc: { desc: "Machine Protection Control" },
                hybrid: { desc: "Additive/subtractive hybrid machining" }
            }
        },
        hurco: {
            vendor: "Hurco",
            vendorUrl: "https://www.hurco.com",
            controller: "WinMax/MAX5",
            postCount: 6,
            models: ["VM Series", "VMX Series", "TMX Series"],
            capabilities: ["milling", "turning", "3D"],
            features: {
                conversational: { desc: "Conversational programming mode" },
                ultimotion: { desc: "UltiMotion motion control" },
                sweptSurface: { desc: "Swept surface machining" },
                adaptiveFeed: { desc: "Adaptive feedrate control" }
            }
        },
        makino: {
            vendor: "Makino",
            vendorUrl: "https://www.makino.com",
            controller: "Professional 6",
            postCount: 6,
            models: ["A500Z", "D200Z", "D300", "D500", "Slim3n", "PS Series"],
            capabilities: ["milling", "5-axis", "high-speed"],
            features: {
                sgi5: { code: "G05.1 Q2", desc: "SGI.5 super geometric intelligence" },
                motionNav: { desc: "Motion navigation system" },
                hsm: { desc: "High-speed machining optimization" },
                inertiaControl: { desc: "Inertia active control" }
            }
        },
        brother: {
            vendor: "Brother",
            vendorUrl: "https://www.brother.com",
            controller: "CNC-C00",
            postCount: 4,
            models: ["SPEEDIO S300X2", "SPEEDIO S500X2", "SPEEDIO S700X2", "SPEEDIO W1000Xd2"],
            capabilities: ["milling", "tapping", "multi-tasking"],
            features: {
                rapidSpindle: { maxRPM: 16000, desc: "High-speed spindle" },
                fastToolChange: { time: 0.9, desc: "0.9 second tool change" },
                inspection: { desc: "In-process inspection probing" },
                multiTasking: { desc: "Simultaneous multi-axis control" }
            }
        },
        doosan: {
            vendor: "DN Solutions (Doosan)",
            vendorUrl: "https://www.dn-solutions.com",
            controller: "Fanuc/Doosan",
            postCount: 3,
            models: ["DNM", "DVF", "Puma", "Lynx"],
            capabilities: ["milling", "turning"],
            features: {
                hsm: { desc: "High-speed machining" },
                builtInSpindle: { desc: "Built-in spindle motor" }
            }
        }
    }
}