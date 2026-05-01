const PRISM_COMPOUND_JOB_PROPERTIES_DATABASE = {
    version: "1.0.0",
    source: "HyperMILL Compound Job Properties Reference",

    setupProperties: {
        kcCompJobId: { cfgName: "CompJobId", desc: "Compound job identifier" },
        kcCompJobName: { cfgName: "CompJobName", desc: "Compound job name" },
        kcCompJobComment: { cfgName: "CompJobComment", desc: "Compound job comment" },
        kcCompJobStockGiven: { cfgName: "CompJobStockGiven", desc: "Stock definition flag" },
        kcCompJobState: { cfgName: "CompJobState", desc: "Compound job state" },
        kcCompJobUUID: { cfgName: "CompJobUUID", desc: "Unique identifier" }
    },
    transformationProperties: {
        kcCompJobMirrorRef: { cfgName: "CompJobMirrorRef", desc: "Mirror reference" },
        kcCompJobTransActive: { cfgName: "CompJobTransActive", desc: "Transformation active" },
        kcCompJobMirrorCopy: { cfgName: "CompJobMirrorCopy", desc: "Mirror copy flag" },
        kcCompJobKeepOriginJob: { cfgName: "CompJobKeepOriginJob", desc: "Keep original job" },
        kcCompJobTransRef: { cfgName: "CompJobTransRef", desc: "Transformation reference" },
        kcCompJobLPatternSeqStrategy: { cfgName: "CompJobLPatternSeqStrategy", desc: "Linear pattern sequence strategy" },
        kcCompJobLPatternSeqOri: { cfgName: "CompJobLPatternSeqOri", desc: "Pattern sequence orientation" },
        kcCompJobTransStartRef: { cfgName: "CompJobTransStartRef", desc: "Transform start reference" },
        kcCompJobTransTargetRef: { cfgName: "CompJobTransTargetRef", desc: "Transform target reference" }
    },
    segmentProperties: {
        kcCompJobRapidsMode: { cfgName: "CompJobRapidsMode", desc: "Rapids mode setting" },
        kcCompJobUseMinG0Dist: { cfgName: "CompJobUseMinG0Dist", desc: "Use minimum G0 distance" },
        kcCompJobMinG0Dist: { cfgName: "CompJobMinG0Dist", desc: "Minimum G0 distance value" },
        kcCompJobMaxRetract: { cfgName: "CompJobMaxRetract", desc: "Maximum retract distance" },
        kcCompJobAllowance: { cfgName: "CompJobAllowance", desc: "Allowance value" },
        kcCompMaxDistAngle: { cfgName: "CompMaxDistAngle", desc: "Maximum distance angle" },
        kcCompMaxPlaneAngle: { cfgName: "CompMaxPlaneAngle", desc: "Maximum plane angle" },
        kcCompClearanceFeedrate: { cfgName: "CompClearanceFeedrate", desc: "Clearance feedrate" },
        kcSortLinking: { cfgName: "SortLinking", desc: "Sort linking strategy" },
        kcCompCheckTip: { cfgName: "CompCheckTip", desc: "Check tool tip collision" }
    }
}