const PRISM_OKUMA_THREADING_ENGINE = {
    version: "1.0",

    // Threading Overview
    overview: {
        cycles: ["G33 - Each pass individually programmed", "G71 - Compound cycle (multiple passes)"],
        direction: ["G71 - Longitudinal", "G72 - Transverse (end face)"],
        maxIPM: 276 // Cannot exceed during threading
    },
    // G71 Compound Threading
    G71: {
        name: "Longitudinal Threading Compound Cycle",
        format: "G71 X__ Z__ B60 D__ F1 J__ H__ (U__ A__ I__ E__ Q__ L__)",
        parameters: {
            X: { desc: "Final thread diameter (minor OD / major ID)", mode: "diameter" },
            Z: { desc: "Thread end-point Z coordinate" },
            B: { desc: "Tool tip point angle", default: "0", note: "Typically 60° for standard threads" },
            D: { desc: "First pass depth", mode: "diametrical", required: true },
            F: { desc: "Thread lead or 1/TPI", note: "Use F1 with J word" },
            J: { desc: "Threads per inch", note: "Whole number with F1" },
            H: { desc: "Thread height (major-minor)", mode: "diametrical", required: true },
            U: { desc: "Extra finishing pass depth", mode: "diametrical" },
            A: { desc: "Taper angle from +Z axis", note: "CCW positive, CW negative" },
            I: { desc: "Taper increment (+increasing/-decreasing)" },
            E: { desc: "Lead variation per lead (variable pitch)" },
            Q: { desc: "Multi-start threading" },
            L: { desc: "Chamfer distance at thread end", note: "Requires M23" }
        }
    },
    // Infeed Patterns (Cutting Mode)
    infeedPatterns: {
        M32: {
            name: "Straight Right",
            desc: "Straight infeed along thread face - right side cutting",
            use: "Standard external threads"
        },
        M33: {
            name: "Zig-Zag",
            desc: "Alternating side-to-side infeed",
            use: "Reduces built-up edge, better chip breaking"
        },
        M34: {
            name: "Straight Left",
            desc: "Straight infeed along thread face - left side cutting",
            use: "Internal threads, special profiles"
        }
    },
    // Cutting Depth Patterns
    cuttingPatterns: {
        M73: {
            name: "Pattern 1 - Diminishing",
            desc: "Constant D until 6 passes from end",
            sequence: "D, D, D... then D/2, D/4, D/8, D/16 + U finish",
            rule: "H-U must be >= D"
        },
        M74: {
            name: "Pattern 2 - Constant + Finish",
            desc: "Constant D to H-U level, then finish with U",
            rule: "H-U > 0"
        },
        M75: {
            name: "Pattern 3/4 - Optimal Removal",
            desc: "Control calculates optimal metal removal rate",
            selection: "Parameter bit determines 3 vs 4"
        }
    },
    // Thread Chamfering
    chamfering: {
        M22: "Thread chamfering OFF",
        M23: "Thread chamfering ON",
        Lword: "Chamfer distance (default = 1 lead)"
    },
    // Tool Path Motion
    toolPath: {
        step1: { motion: "Rapid", desc: "Position to start" },
        step2: { motion: "Feed (F)", desc: "Thread cutting pass" },
        step3: { motion: "Parameter feed", desc: "Retract/chamfer" },
        step4: { motion: "Rapid", desc: "Return to start" }
    },
    // Slide Hold During Threading
    slideHold: {
        behavior: "Tool completes chamfer, retracts, rapids to start BEFORE stopping",
        reason: "Prevents destroying thread",
        recovery: "Press CYCLE START - restarts from beginning of interrupted pass"
    },
    // Example
    example: `G50 S3500
G0 X25 Z25
N1 G97 X3.8 Z4.3 S450 T707 M3 M8 M41
N2 G71 X3.193 Z1.8 B60 D.02 U.002 H.307
$ F1 J4 M23 M32 M74
N3 G0 X25 Z25 M5 M9
N4 M2`
}