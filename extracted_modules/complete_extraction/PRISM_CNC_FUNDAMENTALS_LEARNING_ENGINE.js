const PRISM_CNC_FUNDAMENTALS_LEARNING_ENGINE = {
    version: "1.0.0",
    name: "CNC Fundamentals Learning Engine",
    source: "Autodesk Fundamentals of CNC Machining",

    // Core Speed/Feed Calculation Formulas
    speedFeedFormulas: {
        // RPM = (SFM × 3.82) / Tool_Diameter_inches
        // 3.82 constant = 12/π (converts circumference in feet to diameter in inches)
        calculateRPM: function(sfm, toolDiameter) {
            const rpm = (sfm * 3.82) / toolDiameter;
            return Math.round(rpm);
        },
        // IPM = RPM × Chip_Load × Number_of_Flutes
        calculateFeedRate: function(rpm, chipLoad, flutes) {
            return rpm * chipLoad * flutes;
        },
        // Tap Feed Rate: IPM = RPM / TPI
        calculateTapFeed: function(rpm, threadsPerInch) {
            return rpm / threadsPerInch;
        },
        // Lathe CSS: RPM = (SFM × 3.82) / Diameter
        calculateLatheRPM: function(sfm, workDiameter) {
            const rpm = (sfm * 3.82) / workDiameter;
            return Math.round(rpm);
        },
        // Lathe Feed: IPM = RPM × IPR
        calculateLatheIPM: function(rpm, ipr) {
            return rpm * ipr;
        }
    },
    // Material Cutting Data Database
    materialCuttingData: {
        milling: {
            aluminum: { sfmHSS: 600, sfmCarbide: 800, chipLoad2Flute: 0.003, chipLoad4Flute: 0.002 },
            brass: { sfmHSS: 175, sfmCarbide: 175, chipLoad2Flute: 0.002, chipLoad4Flute: 0.0015 },
            delrin: { sfmHSS: 400, sfmCarbide: 800, chipLoad2Flute: 0.003, chipLoad4Flute: 0.002 },
            polycarbonate: { sfmHSS: 300, sfmCarbide: 500, chipLoad2Flute: 0.002, chipLoad4Flute: 0.0015 },
            stainless303: { sfmHSS: 80, sfmCarbide: 300, chipLoad2Flute: 0.002, chipLoad4Flute: 0.0012 },
            steel4140: { sfmHSS: 70, sfmCarbide: 350, chipLoad2Flute: 0.002, chipLoad4Flute: 0.0015 }
        },
        drilling: {
            aluminum: { sfm: 300, ipr_small: 0.002, ipr_medium: 0.004, ipr_large: 0.010 },
            brass: { sfm: 120, ipr_small: 0.002, ipr_medium: 0.003, ipr_large: 0.008 },
            delrin: { sfm: 150, ipr_small: 0.002, ipr_medium: 0.004, ipr_large: 0.010 },
            polycarbonate: { sfm: 240, ipr_small: 0.002, ipr_medium: 0.004, ipr_large: 0.008 },
            stainless: { sfm: 50, ipr_small: 0.001, ipr_medium: 0.002, ipr_large: 0.006 },
            steel: { sfm: 90, ipr_small: 0.002, ipr_medium: 0.003, ipr_large: 0.008 }
        }
    },
    // Drilling Feed Rate by Tool Diameter
    drillingFeedRates: {
        getIPRByDiameter: function(diameter) {
            if (diameter < 0.125) return { min: 0.001, max: 0.002 };
            if (diameter < 0.250) return { min: 0.002, max: 0.004 };
            if (diameter < 0.500) return { min: 0.002, max: 0.006 };
            if (diameter < 1.000) return { min: 0.003, max: 0.010 };
            return { min: 0.004, max: 0.015 };
        }
    },
    // Reaming Feed Rates
    reamingFeedRates: {
        getIPRByDiameter: function(diameter) {
            if (diameter < 0.250) return { min: 0.005, max: 0.008 };
            if (diameter < 0.500) return { min: 0.008, max: 0.012 };
            return { min: 0.010, max: 0.015 };
        },
        stockAllowance: { min: 0.005, max: 0.030 }
    },
    // Best Practice Parameters
    bestPracticeParameters: {
        heights: {
            clearanceHeight: 1.0,    // inches
            feedHeight: 0.1,         // inches
            rapidHeight: "variable"  // based on clamp clearance
        },
        roughing: {
            stepoverPercent: { min: 50, max: 80 },  // of tool diameter
            stepdownPercent: { min: 25, max: 50 }   // of tool diameter
        },
        drilling: {
            peckIncrement: 0.05      // inches
        },
        stockAllowance: {
            xy_small: 0.001,         // for small tools
            xy_medium: 0.010,        // for medium tools
            xy_large: 0.020,         // for large tools
            z: { min: 0.001, max: 0.005 }
        }
    },
    // Milling Direction Rules
    millingDirection: {
        climbMilling: {
            recommended: true,
            description: "Always use on CNC - less pressure, less heat, better finish, longer tool life",
            toolRotation: "clockwise (M3) when viewed from spindle"
        },
        conventionalMilling: {
            recommended: false,
            problems: ["work hardening", "rubbing", "poor finish", "shorter tool life"]
        }
    },
    // End Mill Selection Guide
    endMillSelection: {
        flatNose: { use: "2D contours, pockets", centerCutting: true },
        ballNose: { use: "3D surfaces, contours", centerCutting: true },
        bullNose: { use: "radius corners, roughing", centerCutting: true },
        chamfer: { use: "chamfers, deburring", centerCutting: false }
    },
    // Flute Count Selection
    fluteCountSelection: {
        twoFlute: { use: "better chip clearance, soft materials, plunging", chipSpace: "large" },
        fourFlute: { use: "rigid cuts, faster feed, harder materials", chipSpace: "smaller" }
    }
}