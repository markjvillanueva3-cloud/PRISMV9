const PRISM_VARIABLE_PROGRAMMING_ENGINE = {
    version: "1.0",

    // File Types
    fileTypes: {
        MIN: { ext: ".MIN", desc: "Main program file" },
        SUB: { ext: ".SUB", desc: "Subprogram file" },
        SSB: { ext: ".SSB", desc: "System subprogram file" },
        SDF: { ext: ".SDF", desc: "Schedule program file" }
    },
    // File Naming Rules
    naming: {
        mainName: "Up to 16 characters, starts with letter",
        extension: "Up to 3 characters, starts with letter",
        allowedChars: "Letters, numbers, hyphen",
        format: "MAINNAME.EXT (period as delimiter)"
    },
    // Variable Types
    variableTypes: {
        common: {
            prefix: "V",
            format: "V1, V2, V3... V10, V11...",
            scope: "Accessible across programs",
            typical: ["Tool numbers (V1=0101)", "Cutting speeds (V3=100)", "Parameters"]
        },
        local: {
            prefix: "Any (except V)",
            format: "DX1, LZ2, ABC, etc.",
            scope: "Only in defining subprogram",
            typical: ["Dimensions (DX1=30)", "Coordinates (LZ1=200)", "Offsets (UDX1=0.2)"],
            clearing: "Cleared when RTS (Return from Subprogram) executes"
        }
    },
    // Subprogram Calling
    subprogramCall: {
        format: "CALL O____ V1=__ V2=__ LOCAL1=__ LOCAL2=__",
        continuation: "Use $ at start of continuation lines",
        example: `N102 CALL 01000 V1=0101 V2=0202 V3=100 V4=120
$ LZ1=200 LZ2=150 LZ3=80
$ DX1=30 DX2=50 DX3=80 WLZ1=0.1 UDX1=0.2 XS=100 ZS=210`,
        returnStatement: "RTS - Return from subprogram"
    },
    // Expressions in Programs
    expressions: {
        assignment: "VARIABLE = expression",
        operators: ["+", "-", "*", "/"],
        functions: ["SIN", "COS", "TAN", "SQRT"],
        example: `DIS1 = [XD3-XD1]/2
DIS2 = V11*SIN[V10]
ZL1 = ZL2 + DIS3`
    },
    // Family-of-Parts Programming
    familyOfParts: {
        concept: "One subprogram serves multiple similar parts",
        implementation: [
            "Create subprogram with variables for dimensions",
            "Create main program for each part variant",
            "Pass specific values when calling subprogram"
        ],
        benefits: [
            "Single contour definition maintained",
            "Easy to add new part variants",
            "Reduced programming time"
        ]
    },
    // Example Structure
    exampleStructure: {
        subprogram: `$ SHAFT-ABC.SUB
%
01000
NLAP1 G81
N1001 G00 X=DX1 Z=LZ1+2
N1002 G01 Z=LZ2 F0.2
N1003 X=DX2
N1004 Z=LZ3
N1005 X=DX3
N1006 Z=0
N1007 G80
N1010 G00 X=800 Z=400
N1011 G96 X=XS Z=ZS S=V3 T=V1 M03 M08
N1012 G85 NLAP1 D4 F0.35 U=UDX1 W=WLZ1
N1024 RTS`,

        mainProgram: `$ SHAFT-A.MIN
%
0100
N101 G00 X800 Z400
N102 CALL 01000 V1=0101 V2=0202 V3=100 V4=120
$ LZ1=200 LZ2=150 LZ3=80
$ DX1=30 DX2=50 DX3=80 WLZ1=0.1 UDX1=0.2 XS=100 ZS=210
N103 M02`
    }
}