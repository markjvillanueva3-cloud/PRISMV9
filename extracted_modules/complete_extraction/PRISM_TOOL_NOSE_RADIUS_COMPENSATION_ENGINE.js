const PRISM_TOOL_NOSE_RADIUS_COMPENSATION_ENGINE = {
    version: "1.0",

    // Theory
    theory: {
        problem: "Theoretical sharp tool point vs actual tangent point differs on angles/arcs",
        solution: "TNR compensation adjusts for actual nose radius",
        benefit: "Program part print dimensions directly - eliminates offset calculations"
    },
    // G-Codes
    gCodes: {
        G40: { name: "Cancel TNR", desc: "Cancel tool nose radius compensation" },
        G41: { name: "TNR Left", desc: "Tool center LEFT of surface, looking in cut direction" },
        G42: { name: "TNR Right", desc: "Tool center RIGHT of surface, looking in cut direction" }
    },
    // Cancellation Methods
    cancellation: {
        basic: {
            example: "G40 X__ Z__",
            note: "May not give desired exit path"
        },
        withK: {
            example: "G40 X__ K-1",
            desc: "K word controls exit direction",
            note: "Provides controlled linear exit from workpiece"
        },
        withI: {
            example: "G40 X__ I1",
            desc: "I word controls X direction component"
        }
    },
    // P-Code Orientation (Imaginary Tool Tip)
    pCodeOrientation: {
        description: "Direction of nose R center relative to imaginary tool tip",
        setting: "Set in NOSE R COMP columns on TOOL DATA SET screen",
        methods: [
            "Sign (+/-) preceding compensation amount",
            "P number in P column"
        ],
        codes: {
            P0: { desc: "Direction from sign of nose R data" },
            P1: { angle: 45, quadrant: "I", typical: "Back boring" },
            P2: { angle: 135, quadrant: "II", typical: "OD facing left" },
            P3: { angle: 225, quadrant: "III", typical: "OD turning right" },
            P4: { angle: 315, quadrant: "IV", typical: "ID turning" },
            P5: { angle: 0, quadrant: "+X", typical: "Face grooving right" },
            P6: { angle: 90, quadrant: "+Z", typical: "OD grooving down" },
            P7: { angle: 180, quadrant: "-X", typical: "Face grooving left" },
            P8: { angle: 270, quadrant: "-Z", typical: "ID grooving" }
        }
    },
    // Setting Procedure
    settingProcedure: [
        "1. Select Tool Data Setting mode",
        "2. For 2-saddle/turret, select turret A with [A] key",
        "3. Move cursor to X column of NOSE R COMP",
        "4. Press [F1] (SET), input compensation data",
        "5. Set Z compensation also",
        "6. Move cursor to P column, set orientation code",
        "7. Maximum setting: ±999.999 mm"
    ],

    // Usage in LAP
    lapUsage: {
        allowed: "TNR can be used inside LAP contour definition",
        requirement: "MUST cancel G40 before G80 block",
        example: `NLAP1 G82
G0 G41 X__ Z__
G1 Z__
... (contour)
G40 X__ K1
G80`
    }
}