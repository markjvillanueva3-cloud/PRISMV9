const PRISM_LATHE_GRAPHICS_ENGINE = {
    version: "1.0",

    // Graphics Display Modes
    displayModes: {
        TRACE_ANIMATE: {
            desc: "Full simulation with tool path and material removal",
            sideView: "Tool shape, chuck, blank, tailstock + cyan tool paths + blank modification",
            frontView: "Blank with red tool marker + magenta tool path"
        },
        TRACE: {
            desc: "Tool paths only",
            sideView: "Tool paths, chuck shape, tailstock (magenta when C-axis connected)",
            frontView: "Tool marker and tool outline"
        },
        ANIMATE: {
            desc: "Animation without tool paths",
            sideView: "Tool shape, chuck, blank, tailstock + blank modification",
            frontView: "Same as TRACE_ANIMATE but no tool path display"
        }
    },
    // Function Keys
    functionKeys: {
        F1: "STD/EXT GRAPHIC - Toggle between normal and enlarged scale",
        F2: "MODE SELECT - Select display pattern (2-spindle models)",
        F3: "NORMAL SCALE - Set scale (12.5mm to 1250mm)",
        F4: "ENLARGE SCALE - Set enlarged display area",
        F5: "TRACE/ANIMATE - Toggle between display modes",
        F6: "MATERIAL - Display blank, chuck, tailstock shapes",
        F7: "CLEAR - Clear all displayed graphics"
    },
    // Auto Scale
    autoScale: {
        method: "Press [F1] (AUTO SCALE) - reads program to M02",
        formula: "(Operating area in cutting G code) x (100 + n)%",
        margin: "n set by OPTIONAL PARAMETER (ANIMATION) - Margin (0-100)"
    },
    // Material Blank Definition
    materialBlank: {
        format: `CLEAR
DEF WORK
PS (REF), [Z,X], [Z,X]
END
DRAW`,
        commands: {
            CLEAR: "Erase previous material graphic",
            DEF_WORK: "Start material definition (space between DEF and WORK)",
            PS: "Paint Screen - define material shape",
            END: "End of definition (line by itself)",
            DRAW: "Display defined material"
        },
        refPoints: {
            LC: "Left Center - zero at left end (positive Z)",
            RC: "Right Center - zero at right end (negative Z)"
        },
        psFormat: "PS REF, [Z_origin,X_origin], [Z_length,X_diameter]",
        holeDefinition: "PS REF, [Z,X], [Z,X], 0 (zero = no material)"
    },
    // Example - Solid Blank
    exampleSolid: `CLEAR
DEF WORK
PS LC,[0,0],[26,30]
END
DRAW`,

    // Example - Blank with Hole
    exampleWithHole: `N1 CLEAR
N2 DEF WORK
N3 PS LC, [0,0], [26,30]
N4 PS LC, [0,0], [26,9], 0
N5 END
N6 DRAW`,

    // Example - Complex Shape
    exampleComplex: `CLEAR
DEF WORK
PS LC,[0,0],[7,20]
PS LC,[7,0],[13,25]
PS LC,[20,0],[7,20]
PS LC,[27,0],[19,17]
PS LC,[0,0],[46,10],0
END
DRAW`,

    // Unit Note
    unitNote: "In inch mode, unit = 0.1 inch. Round dimensions (3.750 becomes 38)"
}