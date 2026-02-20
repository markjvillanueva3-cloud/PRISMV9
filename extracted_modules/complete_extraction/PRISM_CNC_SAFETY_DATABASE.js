const PRISM_CNC_SAFETY_DATABASE = {
    version: "1.0.0",
    name: "CNC Safety Database",
    source: "CNC Fundamentals - Chapter 2",
    critical: true,

    // Awareness Principles
    awareness: {
        chips: "Sharp - can cause cuts",
        machineSpeed: "Machines move >1 ft/sec",
        toolContact: "Contact with spinning tool = serious injury",
        conductRules: [
            "Know hand positions at all times",
            "Move deliberately",
            "No horseplay",
            "Maintain clean workspace"
        ]
    },
    // Personal Protective Equipment
    ppe: {
        required: {
            safetyGlasses: "ANSI rated, always worn",
            hearingProtection: "When operating loud equipment",
            footwear: "Closed-toe, no sandals or flip-flops"
        },
        prohibited: {
            gloves: "No gloves except latex (can catch in spindle)",
            jewelry: "No rings, watches, bracelets",
            clothing: "No loose clothing, short sleeves preferred",
            hair: "Long hair must be tied back"
        }
    },
    // General Safety Rules
    generalRules: [
        "Never use untrained equipment",
        "Use paint brush for chips (never hands or air hose)",
        "Lift with legs, not back",
        "Report injuries immediately",
        "Keep work area clean and organized"
    ],

    // CNC-Specific Safety
    cncSpecific: {
        newPrograms: [
            "Use rapid override when testing",
            "Use feed override when testing",
            "Single-block mode for first runs",
            "Hand on emergency stop"
        ],
        toolHandling: [
            "Grip tool below V-flange",
            "Never grip by flutes (sharp cutting edges)",
            "Align dogs with slots when loading"
        ],
        operation: [
            "Remain at machine during operation",
            "Know location of emergency stop",
            "Clear work area before running",
            "Verify door/guard is closed"
        ]
    },
    // Troubleshooting Safety
    troubleshooting: {
        dontAlwaysReduceFeed: true,
        alternative: "Sometimes decrease speed and increase feed is better",
        reference: "Machinery\'s Handbook for extensive diagnosis"
    }
}