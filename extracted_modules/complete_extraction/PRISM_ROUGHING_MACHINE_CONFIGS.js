const PRISM_ROUGHING_MACHINE_CONFIGS = {

    // Haas Mills
    haas_vf2: {
        controller: "haas_ngc",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G187 P1 E0.001",
            adaptive: "G187 P2 E0.0005",
            finishing: "G187 P3 E0.0001"
        }
    },
    haas_umc750: {
        inherits: "haas_vf2",
        // 5-axis specific
        fiveAxisFeedLimit: { enabled: true, maxDegPerMin: 5000 }
    },
    // Okuma Mills
    okuma_genos_m460ve: {
        controller: "okuma_osp_p300m",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G131 P1",
            adaptive: "G131 P2",
            finishing: "G131 P3"
        },
        cycleTimeOptimization: {
            enabled: true,
            codes: ["M63", "M61"]
        }
    },
    okuma_genos_m460v_5ax: {
        inherits: "okuma_genos_m460ve",
        // 5-axis specific
        fiveAxis: {
            enabled: true,
            tcpSmoothing: "G131 P2",
            maxRotaryFeed: 5000
        }
    },
    okuma_mu4000v: {
        inherits: "okuma_genos_m460v_5ax"
    },
    okuma_mu5000v: {
        inherits: "okuma_genos_m460v_5ax"
    },
    // Okuma Mill-Turn (Live Tool Milling)
    okuma_multus_b250iiw: {
        controller: "okuma_osp_p300l",
        enabled: true,
        defaultLevel: 4,  // Slightly more conservative for live tools
        chipThinning: { enabled: true, maxMultiplier: 2.0 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true, reductionFactor: 0.20 },  // More aggressive reduction
        smoothing: {
            roughing: "G131 P2",
            adaptive: "G131 P3"
        },
        liveToolLimits: {
            maxRpm: 12000,
            maxFeed: 100  // IPM
        }
    },
    // Okuma Lathes with Live Tooling
    okuma_lb3000exii: {
        controller: "okuma_osp_p300l",
        enabled: true,
        defaultLevel: 4,
        chipThinning: { enabled: true, maxMultiplier: 1.8 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        stickoutCompensation: { enabled: true, reductionFactor: 0.25 },
        liveToolLimits: {
            maxRpm: 6000,
            maxFeed: 60
        }
    },
    okuma_genos_l400ii: {
        inherits: "okuma_lb3000exii",
        liveToolLimits: {
            maxRpm: 6000,
            maxFeed: 50
        }
    },
    // Hurco Mills
    hurco_vm30i: {
        controller: "hurco_winmax",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G05.3 P50",
            adaptive: "G05.3 P35",
            finishing: "G05.3 P15"
        }
    },
    hurco_vmx42i: {
        inherits: "hurco_vm30i"
    },
    // DMG MORI
    dmgmori_dmu50: {
        controller: "dmgmori_celos",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "M200",
            adaptive: "M200"
        }
    },
    // Mazak
    mazak_variaxis_i600: {
        controller: "mazak_smooth",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G05.1 Q1",
            adaptive: "G05.1 Q1"
        }
    },
    // Makino
    makino_d500: {
        controller: "makino_pro",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G05 P2",
            adaptive: "G05 P10000"
        }
    },
    // Brother
    brother_s500x1: {
        controller: "brother_cnc",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.0 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G05 P1",
            adaptive: "G05 P1"
        }
    },
    // Roku-Roku (High Precision)
    roku_roku_rqm5: {
        controller: "fanuc_31i",
        enabled: true,
        defaultLevel: 6,  // More aggressive for precision machine
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G05 P10000",
            adaptive: "G05.1 Q1"
        },
        highPrecision: {
            aiContour: true,
            nanoSmooth: true
        }
    },
    // Doosan
    doosan_dnm500: {
        controller: "fanuc_0i",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "G05.1 Q1",
            adaptive: "G05.1 Q1"
        }
    },
    // Hermle
    hermle_c32u: {
        controller: "heidenhain_tnc640",
        enabled: true,
        defaultLevel: 5,
        chipThinning: { enabled: true, maxMultiplier: 2.5 },
        arcCorrection: { enabled: true },
        directionChange: { enabled: true },
        adaptiveDepth: { enabled: true },
        stickoutCompensation: { enabled: true },
        smoothing: {
            roughing: "CYCL DEF 32.0 TOLERANCE",
            adaptive: "CYCL DEF 32.0 TOLERANCE"
        }
    }
}