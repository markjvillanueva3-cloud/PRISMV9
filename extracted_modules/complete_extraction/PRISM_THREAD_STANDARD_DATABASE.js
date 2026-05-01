const PRISM_THREAD_STANDARD_DATABASE = {
    version: "2.0",

    // ISO Metric Threads (Coarse and Fine)
    metricCoarse: {
        standard: "ISO 261/262",
        designation: "M",
        threads: {
            M1:   { diameter: 1.0, pitch: 0.25, minorDia: 0.729, pitchDia: 0.838 },
            M1_2: { diameter: 1.2, pitch: 0.25, minorDia: 0.929, pitchDia: 1.038 },
            M1_6: { diameter: 1.6, pitch: 0.35, minorDia: 1.221, pitchDia: 1.373 },
            M2:   { diameter: 2.0, pitch: 0.40, minorDia: 1.567, pitchDia: 1.740 },
            M2_5: { diameter: 2.5, pitch: 0.45, minorDia: 2.013, pitchDia: 2.208 },
            M3:   { diameter: 3.0, pitch: 0.50, minorDia: 2.459, pitchDia: 2.675 },
            M4:   { diameter: 4.0, pitch: 0.70, minorDia: 3.242, pitchDia: 3.545 },
            M5:   { diameter: 5.0, pitch: 0.80, minorDia: 4.134, pitchDia: 4.480 },
            M6:   { diameter: 6.0, pitch: 1.00, minorDia: 4.917, pitchDia: 5.350 },
            M8:   { diameter: 8.0, pitch: 1.25, minorDia: 6.647, pitchDia: 7.188 },
            M10:  { diameter: 10.0, pitch: 1.50, minorDia: 8.376, pitchDia: 9.026 },
            M12:  { diameter: 12.0, pitch: 1.75, minorDia: 10.106, pitchDia: 10.863 },
            M14:  { diameter: 14.0, pitch: 2.00, minorDia: 11.835, pitchDia: 12.701 },
            M16:  { diameter: 16.0, pitch: 2.00, minorDia: 13.835, pitchDia: 14.701 },
            M18:  { diameter: 18.0, pitch: 2.50, minorDia: 15.294, pitchDia: 16.376 },
            M20:  { diameter: 20.0, pitch: 2.50, minorDia: 17.294, pitchDia: 18.376 },
            M22:  { diameter: 22.0, pitch: 2.50, minorDia: 19.294, pitchDia: 20.376 },
            M24:  { diameter: 24.0, pitch: 3.00, minorDia: 20.752, pitchDia: 22.051 },
            M27:  { diameter: 27.0, pitch: 3.00, minorDia: 23.752, pitchDia: 25.051 },
            M30:  { diameter: 30.0, pitch: 3.50, minorDia: 26.211, pitchDia: 27.727 }
        }
    },
    metricFine: {
        standard: "ISO 261/262",
        designation: "M x pitch",
        threads: {
            "M6x0.5":  { diameter: 6.0, pitch: 0.50, minorDia: 5.459, pitchDia: 5.675 },
            "M6x0.75": { diameter: 6.0, pitch: 0.75, minorDia: 5.188, pitchDia: 5.513 },
            "M8x0.5":  { diameter: 8.0, pitch: 0.50, minorDia: 7.459, pitchDia: 7.675 },
            "M8x0.75": { diameter: 8.0, pitch: 0.75, minorDia: 7.188, pitchDia: 7.513 },
            "M8x1":    { diameter: 8.0, pitch: 1.00, minorDia: 6.917, pitchDia: 7.350 },
            "M10x0.5": { diameter: 10.0, pitch: 0.50, minorDia: 9.459, pitchDia: 9.675 },
            "M10x0.75":{ diameter: 10.0, pitch: 0.75, minorDia: 9.188, pitchDia: 9.513 },
            "M10x1":   { diameter: 10.0, pitch: 1.00, minorDia: 8.917, pitchDia: 9.350 },
            "M10x1.25":{ diameter: 10.0, pitch: 1.25, minorDia: 8.647, pitchDia: 9.188 },
            "M12x1":   { diameter: 12.0, pitch: 1.00, minorDia: 10.917, pitchDia: 11.350 },
            "M12x1.25":{ diameter: 12.0, pitch: 1.25, minorDia: 10.647, pitchDia: 11.188 },
            "M12x1.5": { diameter: 12.0, pitch: 1.50, minorDia: 10.376, pitchDia: 11.026 },
            "M14x1.5": { diameter: 14.0, pitch: 1.50, minorDia: 12.376, pitchDia: 13.026 },
            "M16x1":   { diameter: 16.0, pitch: 1.00, minorDia: 14.917, pitchDia: 15.350 },
            "M16x1.5": { diameter: 16.0, pitch: 1.50, minorDia: 14.376, pitchDia: 15.026 },
            "M20x1.5": { diameter: 20.0, pitch: 1.50, minorDia: 18.376, pitchDia: 19.026 },
            "M20x2":   { diameter: 20.0, pitch: 2.00, minorDia: 17.835, pitchDia: 18.701 },
            "M24x2":   { diameter: 24.0, pitch: 2.00, minorDia: 21.835, pitchDia: 22.701 }
        }
    },
    // Unified National Threads (UNC, UNF, UNEF)
    unifiedCoarse: {
        standard: "ANSI/ASME B1.1",
        designation: "UNC",
        threads: {
            "#0-80":   { diameter: 0.060, tpi: 80, minorDia: 0.0447, pitchDia: 0.0519 },
            "#1-64":   { diameter: 0.073, tpi: 64, minorDia: 0.0538, pitchDia: 0.0629 },
            "#2-56":   { diameter: 0.086, tpi: 56, minorDia: 0.0641, pitchDia: 0.0744 },
            "#3-48":   { diameter: 0.099, tpi: 48, minorDia: 0.0734, pitchDia: 0.0855 },
            "#4-40":   { diameter: 0.112, tpi: 40, minorDia: 0.0813, pitchDia: 0.0958 },
            "#5-40":   { diameter: 0.125, tpi: 40, minorDia: 0.0943, pitchDia: 1.0088 },
            "#6-32":   { diameter: 0.138, tpi: 32, minorDia: 0.0997, pitchDia: 0.1177 },
            "#8-32":   { diameter: 0.164, tpi: 32, minorDia: 0.1257, pitchDia: 0.1437 },
            "#10-24":  { diameter: 0.190, tpi: 24, minorDia: 0.1389, pitchDia: 0.1629 },
            "#12-24":  { diameter: 0.216, tpi: 24, minorDia: 0.1649, pitchDia: 0.1889 },
            "1/4-20":  { diameter: 0.250, tpi: 20, minorDia: 0.1887, pitchDia: 0.2175 },
            "5/16-18": { diameter: 0.3125, tpi: 18, minorDia: 0.2443, pitchDia: 0.2764 },
            "3/8-16":  { diameter: 0.375, tpi: 16, minorDia: 0.2983, pitchDia: 0.3344 },
            "7/16-14": { diameter: 0.4375, tpi: 14, minorDia: 0.3499, pitchDia: 0.3911 },
            "1/2-13":  { diameter: 0.500, tpi: 13, minorDia: 0.4056, pitchDia: 0.4500 },
            "9/16-12": { diameter: 0.5625, tpi: 12, minorDia: 0.4603, pitchDia: 0.5084 },
            "5/8-11":  { diameter: 0.625, tpi: 11, minorDia: 0.5135, pitchDia: 0.5660 },
            "3/4-10":  { diameter: 0.750, tpi: 10, minorDia: 0.6273, pitchDia: 0.6850 },
            "7/8-9":   { diameter: 0.875, tpi: 9, minorDia: 0.7387, pitchDia: 0.8028 },
            "1-8":     { diameter: 1.000, tpi: 8, minorDia: 0.8466, pitchDia: 0.9188 }
        },
        inchToMM: 25.4
    },
    unifiedFine: {
        standard: "ANSI/ASME B1.1",
        designation: "UNF",
        threads: {
            "#0-80":   { diameter: 0.060, tpi: 80, minorDia: 0.0447, pitchDia: 0.0519 },
            "#1-72":   { diameter: 0.073, tpi: 72, minorDia: 0.0560, pitchDia: 0.0640 },
            "#2-64":   { diameter: 0.086, tpi: 64, minorDia: 0.0668, pitchDia: 0.0759 },
            "#3-56":   { diameter: 0.099, tpi: 56, minorDia: 0.0771, pitchDia: 0.0874 },
            "#4-48":   { diameter: 0.112, tpi: 48, minorDia: 0.0864, pitchDia: 0.0985 },
            "#5-44":   { diameter: 0.125, tpi: 44, minorDia: 0.0971, pitchDia: 0.1102 },
            "#6-40":   { diameter: 0.138, tpi: 40, minorDia: 0.1073, pitchDia: 0.1218 },
            "#8-36":   { diameter: 0.164, tpi: 36, minorDia: 0.1299, pitchDia: 0.1460 },
            "#10-32":  { diameter: 0.190, tpi: 32, minorDia: 0.1517, pitchDia: 0.1697 },
            "#12-28":  { diameter: 0.216, tpi: 28, minorDia: 0.1722, pitchDia: 0.1928 },
            "1/4-28":  { diameter: 0.250, tpi: 28, minorDia: 0.2062, pitchDia: 0.2268 },
            "5/16-24": { diameter: 0.3125, tpi: 24, minorDia: 0.2614, pitchDia: 0.2854 },
            "3/8-24":  { diameter: 0.375, tpi: 24, minorDia: 0.3239, pitchDia: 0.3479 },
            "7/16-20": { diameter: 0.4375, tpi: 20, minorDia: 0.3762, pitchDia: 0.4050 },
            "1/2-20":  { diameter: 0.500, tpi: 20, minorDia: 0.4387, pitchDia: 0.4675 },
            "9/16-18": { diameter: 0.5625, tpi: 18, minorDia: 0.4943, pitchDia: 0.5264 },
            "5/8-18":  { diameter: 0.625, tpi: 18, minorDia: 0.5568, pitchDia: 0.5889 },
            "3/4-16":  { diameter: 0.750, tpi: 16, minorDia: 0.6733, pitchDia: 0.7094 },
            "7/8-14":  { diameter: 0.875, tpi: 14, minorDia: 0.7874, pitchDia: 0.8286 },
            "1-12":    { diameter: 1.000, tpi: 12, minorDia: 0.8978, pitchDia: 0.9459 }
        },
        inchToMM: 25.4
    },
    // Pipe Threads
    npt: {
        standard: "ANSI/ASME B1.20.1",
        designation: "NPT",
        description: "National Pipe Thread Tapered",
        taperPerFoot: 0.75,  // inches per foot (1:16)
        threads: {
            "1/16-27":  { nominalSize: 0.0625, tpi: 27, majorDia: 0.3125 },
            "1/8-27":   { nominalSize: 0.125, tpi: 27, majorDia: 0.405 },
            "1/4-18":   { nominalSize: 0.25, tpi: 18, majorDia: 0.540 },
            "3/8-18":   { nominalSize: 0.375, tpi: 18, majorDia: 0.675 },
            "1/2-14":   { nominalSize: 0.5, tpi: 14, majorDia: 0.840 },
            "3/4-14":   { nominalSize: 0.75, tpi: 14, majorDia: 1.050 },
            "1-11.5":   { nominalSize: 1.0, tpi: 11.5, majorDia: 1.315 },
            "1-1/4-11.5": { nominalSize: 1.25, tpi: 11.5, majorDia: 1.660 },
            "1-1/2-11.5": { nominalSize: 1.5, tpi: 11.5, majorDia: 1.900 },
            "2-11.5":   { nominalSize: 2.0, tpi: 11.5, majorDia: 2.375 }
        }
    },
    nps: {
        standard: "ANSI/ASME B1.20.1",
        designation: "NPS",
        description: "National Pipe Straight (parallel)",
        threads: {
            "1/8-27":  { nominalSize: 0.125, tpi: 27, majorDia: 0.405 },
            "1/4-18":  { nominalSize: 0.25, tpi: 18, majorDia: 0.540 },
            "3/8-18":  { nominalSize: 0.375, tpi: 18, majorDia: 0.675 },
            "1/2-14":  { nominalSize: 0.5, tpi: 14, majorDia: 0.840 },
            "3/4-14":  { nominalSize: 0.75, tpi: 14, majorDia: 1.050 },
            "1-11.5":  { nominalSize: 1.0, tpi: 11.5, majorDia: 1.315 }
        }
    },
    bspt: {
        standard: "BS 21 / ISO 7",
        designation: "BSPT / Rp / Rc",
        description: "British Standard Pipe Tapered",
        taperPerFoot: 0.75,
        threads: {
            "1/8":  { nominalSize: 0.125, tpi: 28, majorDia: 9.728 },
            "1/4":  { nominalSize: 0.25, tpi: 19, majorDia: 13.157 },
            "3/8":  { nominalSize: 0.375, tpi: 19, majorDia: 16.662 },
            "1/2":  { nominalSize: 0.5, tpi: 14, majorDia: 20.955 },
            "3/4":  { nominalSize: 0.75, tpi: 14, majorDia: 26.441 },
            "1":    { nominalSize: 1.0, tpi: 11, majorDia: 33.249 }
        }
    },
    // Thread class/fit tolerances
    threadClasses: {
        metric: {
            "6H": { type: "internal", tolerance: "medium", description: "Standard nut thread" },
            "6g": { type: "external", tolerance: "medium", description: "Standard bolt thread" },
            "5H": { type: "internal", tolerance: "close", description: "Close fit nut" },
            "4h": { type: "external", tolerance: "close", description: "Close fit bolt" },
            "7H": { type: "internal", tolerance: "free", description: "Free fit nut" },
            "8g": { type: "external", tolerance: "free", description: "Free fit bolt" }
        },
        unified: {
            "1A": { type: "external", tolerance: "loose", description: "Allowance for plating" },
            "1B": { type: "internal", tolerance: "loose", description: "Allowance for plating" },
            "2A": { type: "external", tolerance: "standard", description: "General purpose" },
            "2B": { type: "internal", tolerance: "standard", description: "General purpose" },
            "3A": { type: "external", tolerance: "close", description: "Close fit" },
            "3B": { type: "internal", tolerance: "close", description: "Close fit" }
        }
    },
    // Parse thread callout
    parseThreadCallout: function(callout) {
        const result = {
            raw: callout,
            type: null,
            diameter: null,
            pitch: null,
            tpi: null,
            class: null,
            direction: "RH",  // Default right-hand
            depth: null
        };
        // Check for left-hand thread
        if (callout.includes("LH") || callout.includes("LEFT")) {
            result.direction = "LH";
        }
        // Metric thread: M6x1
        const metricMatch = callout.match(/M([0-9]+\.?[0-9]*)(?:x([0-9]+\.?[0-9]*))?/i);
        if (metricMatch) {
            result.type = "metric";
            result.diameter = parseFloat(metricMatch[1]);
            result.pitch = metricMatch[2] ? parseFloat(metricMatch[2]) : this.getDefaultPitch(result.diameter, "metric");
            return result;
        }
        // Unified thread: 1/4-20 UNC
        const unifiedMatch = callout.match(/([0-9\/]+)-([0-9]+)\s*(UNC|UNF|UNEF|UN)?\s*-?\s*([123][AB])?/i);
        if (unifiedMatch) {
            result.type = "unified";
            result.diameter = this.parseFraction(unifiedMatch[1]);
            result.tpi = parseInt(unifiedMatch[2]);
            result.series = unifiedMatch[3] || "UN";
            result.class = unifiedMatch[4] || "2A";
            return result;
        }
        // NPT: 1/2-14 NPT
        const nptMatch = callout.match(/([0-9\/]+)-([0-9]+\.?[0-9]*)\s*NPT/i);
        if (nptMatch) {
            result.type = "NPT";
            result.diameter = this.parseFraction(nptMatch[1]);
            result.tpi = parseFloat(nptMatch[2]);
            result.tapered = true;
            return result;
        }
        return result;
    },
    // Parse fraction to decimal
    parseFraction: function(str) {
        if (str.includes('/')) {
            const parts = str.split('/');
            return parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        return parseFloat(str);
    },
    // Get default pitch for metric threads
    getDefaultPitch: function(diameter, type) {
        if (type === "metric") {
            const key = `M${diameter}`;
            if (this.metricCoarse.threads[key]) {
                return this.metricCoarse.threads[key].pitch;
            }
        }
        return null;
    },
    // Get thread data
    getThreadData: function(designation) {
        // Check all thread databases
        for (const [dbName, db] of Object.entries(this)) {
            if (typeof db === 'object' && db.threads) {
                if (db.threads[designation]) {
                    return { source: dbName, ...db.threads[designation] };
                }
            }
        }
        return null;
    }
}