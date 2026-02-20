const PRISM_LAP_CYCLE_ENGINE = {
    version: "1.0",
    description: "Okuma proprietary Lathe Auto-Programming function",

    // LAP Concept
    concept: {
        overview: "LAP makes full use of control high-speed processing capability",
        function: "Control automatically generates tool path from contour definition",
        advantage: "Simply pick up dimensions from drawing - simplifies programming",
        features: [
            "No special programming language needed",
            "Greatly reduces programming preparation time",
            "Eliminates rough cut cycle calculations",
            "Allows cutting condition changes during rough cycle",
            "Can eliminate unnecessary air-cutting paths (LAP4)"
        ]
    },
    // LAP Cycle Types
    cycleTypes: {
        G83: {
            name: "LAP4 High-Speed Copy",
            desc: "High-speed copy turning with blank shape input",
            advantage: "Eliminates air-cutting by knowing blank shape"
        },
        G85: {
            name: "Bar Turning Rough",
            format: "[N___] [G85] [NLAP1] [ ] [D] [F] [U] [W] [G84]",
            params: {
                NLAP1: "Sequence name of contour definition",
                D: "Depth of cut (diametrical) - REQUIRED, must be positive",
                F: "Feedrate for rough cycle",
                U: "Finish stock X direction (default 0)",
                W: "Finish stock Z direction (default 0)"
            },
            notes: [
                "No S, T, or M code allowed in G85 block",
                "Finish feedrate must be in contour definition"
            ]
        },
        G86: {
            name: "Copy Turning",
            format: "[N___] [G86] [NLAP2] [ ] [D] [F] [U] [W]",
            desc: "Copy turning cycle following contour profile"
        },
        G87: {
            name: "Finish Cut",
            format: "[N___] [G87] [NLAP1] [ ] [U] [W]",
            params: {
                NLAP1: "Sequence name of contour definition",
                U: "Optional finish stock X (default 0)",
                W: "Optional finish stock Z (default 0)"
            },
            notes: [
                "No S, T, or M code allowed in G87 block",
                "No feedrate - uses F from contour definition"
            ]
        }
    },
    // LAP Parameters
    parameters: {
        D: { desc: "Depth of cut in rough cycle", req: "Must be > 0", mode: "diametrical" },
        DA: { desc: "Depth after change point A", default: "D" },
        DB: { desc: "Depth after change point B", default: "DA" },
        F: { desc: "Feedrate in rough cycle" },
        FA: { desc: "Feedrate after change point A", default: "F" },
        FB: { desc: "Feedrate after change point B", default: "FA" },
        E: { desc: "Feedrate along finish contour", default: "Active F at LAP entry" },
        XA: { desc: "X coordinate of condition change point A" },
        XB: { desc: "X coordinate of condition change point B" },
        ZA: { desc: "Z coordinate of condition change point A" },
        ZB: { desc: "Z coordinate of condition change point B" },
        U: { desc: "Finish stock X direction", default: "0", mode: "diametrical" },
        W: { desc: "Finish stock Z direction", default: "0" },
        H: { desc: "Thread height (G88)", mode: "diametrical" },
        B: { desc: "Tool tip angle (G88)", default: "0" }
    },
    // G84 - Change Cutting Conditions
    G84conditionChange: {
        format: "G85 N__ ... $ G84 XA=__ DA=__ FA=__ $ XB=__ DB=__ FB=__",
        usage: "Change cutting conditions at specified X or Z positions",
        notes: [
            "Use $ at beginning of continuation lines",
            "For OD: LAP start > Point A > Point B (decreasing)",
            "For ID: Point A < Point B (increasing)",
            "Cannot use ZA/ZB in longitudinal, XA/XB in transverse"
        ]
    },
    // Contour Definition Rules
    contourDefinition: {
        startCodes: {
            G81: "Start longitudinal contour definition",
            G82: "Start transverse contour definition"
        },
        endCode: "G80 - End of contour definition (on line by itself)",
        naming: "Must use sequence name (N___) right after start G-code",
        modeRetention: [
            "G90/G91 active before LAP stays in effect, can change inside",
            "G64/G65/G94/G95/G96/G97 stay active, CANNOT change inside",
            "G00/G01/G02/G03/G32/G33/G34/G35 become active after LAP"
        ],
        restrictions: [
            "No nesting or branching between LAP contours",
            "TNR must be cancelled before G80",
            "Cannot call LAP while TNR mode is active (alarm)"
        ]
    },
    // Example Programs
    examples: {
        basicBarTurning: `G50 S2000
G00 X50 Z50
X5.2 Z3.25 T0101 G97 S500 M03 M08
G96 S675
G85 NLAP D.4 F.016 U.05 W.005
NLAP G81
G00 X-.062 Z3.15
G01 Z3 F.008
X3
Z1.5
X5.1
G80
G97 S500
G00 X50 Z50
M01
X5.2 Z3.25 T0202
G96 S650
G87 NLAP
G00 X50 Z50 M09
M02`,

        withG84: `G50 S4200
G0 X25 Z25
N3 G96 X2 Z3.1 F.015 S500 T90909 M3 M42
N4 G85 NOD2 D.2 U.0
$ G84 XA=1.25 DA=.15 FA=.012
$ XB=1.01 DB=.1 FB=.008
N5 G0 X25 Z25
N6 S1000 T111111 M42
N7 G87 NOD2
NOD2 G81
G0 G42 X.7 Z3.1
G1 Z3 F.007
G75 X1 L.1
G75 Z1.375 L.25
Z1
G76 X2 L.1
G40 X2.1 K1
G80
M2`
    }
}