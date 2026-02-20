const PRISM_SURFACE_FINISH_DATABASE = {
    version: "2.0",

    // Surface finish symbols and their meanings
    symbols: {
        basicSymbol: { symbol: "√", meaning: "Machining required" },
        prohibitedSymbol: { symbol: "√○", meaning: "Machining prohibited (as-cast, as-forged)" },
        anyProcess: { symbol: "√~", meaning: "Any manufacturing process permitted" },
        materialRemoval: { symbol: "√M", meaning: "Material removal required" },
        noRemoval: { symbol: "√N", meaning: "No material removal" }
    },
    // Ra (Roughness Average) values in micrometers and micro-inches
    raValues: {
        // N-grade to Ra conversion (ISO 1302)
        N1:  { ra_um: 0.025, ra_uin: 1,   process: "Superfinishing, lapping" },
        N2:  { ra_um: 0.05,  ra_uin: 2,   process: "Superfinishing, honing" },
        N3:  { ra_um: 0.1,   ra_uin: 4,   process: "Honing, polishing" },
        N4:  { ra_um: 0.2,   ra_uin: 8,   process: "Grinding, honing" },
        N5:  { ra_um: 0.4,   ra_uin: 16,  process: "Grinding" },
        N6:  { ra_um: 0.8,   ra_uin: 32,  process: "Finish turning, finish milling" },
        N7:  { ra_um: 1.6,   ra_uin: 63,  process: "Turning, milling" },
        N8:  { ra_um: 3.2,   ra_uin: 125, process: "Milling, turning" },
        N9:  { ra_um: 6.3,   ra_uin: 250, process: "Rough milling, shaping" },
        N10: { ra_um: 12.5,  ra_uin: 500, process: "Rough machining, sawing" },
        N11: { ra_um: 25.0,  ra_uin: 1000, process: "Rough machining" },
        N12: { ra_um: 50.0,  ra_uin: 2000, process: "Sand casting, forging" }
    },
    // Common Ra values by application
    applicationGuide: {
        bearing: { ra_um: 0.2, ra_uin: 8, grade: "N4" },
        seal: { ra_um: 0.4, ra_uin: 16, grade: "N5" },
        slideways: { ra_um: 0.8, ra_uin: 32, grade: "N6" },
        generalMachined: { ra_um: 1.6, ra_uin: 63, grade: "N7" },
        roughMachined: { ra_um: 3.2, ra_uin: 125, grade: "N8" },
        castSurface: { ra_um: 12.5, ra_uin: 500, grade: "N10" }
    },
    // Rz to Ra approximate conversion
    rzToRa: {
        factor: 4,  // Rz ≈ 4 × Ra (approximate)
        formula: "Ra ≈ Rz / 4",
        convert: function(rz) { return rz / 4; }
    },
    // Parse surface finish callout
    parseCallout: function(callout) {
        const result = {
            raw: callout,
            parameter: null,
            value: null,
            unit: null,
            grade: null,
            process: null,
            direction: null
        };
        // Ra value: Ra 1.6 or Ra1.6
        const raMatch = callout.match(/Ra\s*([0-9]+\.?[0-9]*)\s*(μm|um|µin|uin)?/i);
        if (raMatch) {
            result.parameter = "Ra";
            result.value = parseFloat(raMatch[1]);
            result.unit = raMatch[2] || "μm";
            result.grade = this.findGrade(result.value, result.unit);
            return result;
        }
        // Rz value
        const rzMatch = callout.match(/Rz\s*([0-9]+\.?[0-9]*)\s*(μm|um)?/i);
        if (rzMatch) {
            result.parameter = "Rz";
            result.value = parseFloat(rzMatch[1]);
            result.unit = rzMatch[2] || "μm";
            result.raEquivalent = this.rzToRa.convert(result.value);
            return result;
        }
        // N-grade: N6, N7, etc.
        const nMatch = callout.match(/N([0-9]+)/);
        if (nMatch) {
            const grade = `N${nMatch[1]}`;
            if (this.raValues[grade]) {
                result.parameter = "Ra";
                result.grade = grade;
                result.value = this.raValues[grade].ra_um;
                result.unit = "μm";
                result.process = this.raValues[grade].process;
            }
            return result;
        }
        // Micro-inch value: 32 µin or 32 uin
        const uinMatch = callout.match(/([0-9]+)\s*(µin|uin|μin)/i);
        if (uinMatch) {
            result.parameter = "Ra";
            result.value = parseInt(uinMatch[1]);
            result.unit = "μin";
            result.value_um = result.value * 0.0254;
            result.grade = this.findGrade(result.value, "μin");
            return result;
        }
        return result;
    },
    // Find N-grade from Ra value
    findGrade: function(value, unit) {
        const targetUm = unit === "μin" || unit === "uin" ? value * 0.0254 : value;

        let closest = null;
        let minDiff = Infinity;

        for (const [grade, data] of Object.entries(this.raValues)) {
            const diff = Math.abs(data.ra_um - targetUm);
            if (diff < minDiff) {
                minDiff = diff;
                closest = grade;
            }
        }
        return closest;
    },
    // Convert between units
    convert: function(value, fromUnit, toUnit) {
        const conversions = {
            "μm_to_μin": (v) => v / 0.0254,
            "μin_to_μm": (v) => v * 0.0254,
            "Ra_to_Rz": (v) => v * 4,
            "Rz_to_Ra": (v) => v / 4
        };
        const key = `${fromUnit}_to_${toUnit}`;
        if (conversions[key]) {
            return conversions[key](value);
        }
        return value;
    },
    // Get recommended process for target finish
    getRecommendedProcess: function(targetRa_um) {
        for (const [grade, data] of Object.entries(this.raValues)) {
            if (data.ra_um >= targetRa_um) {
                return {
                    grade,
                    achievableRa: data.ra_um,
                    process: data.process
                };
            }
        }
        return null;
    }
}