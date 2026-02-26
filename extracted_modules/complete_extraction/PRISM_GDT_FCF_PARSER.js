const PRISM_GDT_FCF_PARSER = {
    version: "2.0",

    // GD&T Symbol definitions (Unicode)
    symbols: {
        // Form tolerances
        flatness: { symbol: "⏥", unicode: "\u23E5", category: "form", requiresDatum: false },
        straightness: { symbol: "⏤", unicode: "\u23E4", category: "form", requiresDatum: false },
        circularity: { symbol: "○", unicode: "\u25CB", category: "form", requiresDatum: false },
        cylindricity: { symbol: "⌭", unicode: "\u232D", category: "form", requiresDatum: false },

        // Profile tolerances
        profileLine: { symbol: "⌒", unicode: "\u2312", category: "profile", requiresDatum: "optional" },
        profileSurface: { symbol: "⌓", unicode: "\u2313", category: "profile", requiresDatum: "optional" },

        // Orientation tolerances
        perpendicularity: { symbol: "⟂", unicode: "\u27C2", category: "orientation", requiresDatum: true },
        parallelism: { symbol: "∥", unicode: "\u2225", category: "orientation", requiresDatum: true },
        angularity: { symbol: "∠", unicode: "\u2220", category: "orientation", requiresDatum: true },

        // Location tolerances
        position: { symbol: "⌖", unicode: "\u2316", category: "location", requiresDatum: true },
        concentricity: { symbol: "◎", unicode: "\u25CE", category: "location", requiresDatum: true },
        symmetry: { symbol: "⌯", unicode: "\u232F", category: "location", requiresDatum: true },

        // Runout tolerances
        circularRunout: { symbol: "↗", unicode: "\u2197", category: "runout", requiresDatum: true },
        totalRunout: { symbol: "↗↗", unicode: "\u2197\u2197", category: "runout", requiresDatum: true }
    },
    // Material condition modifiers
    modifiers: {
        MMC: { symbol: "Ⓜ", unicode: "\u24C2", name: "Maximum Material Condition", effect: "bonus tolerance" },
        LMC: { symbol: "Ⓛ", unicode: "\u24C1", name: "Least Material Condition", effect: "bonus tolerance" },
        RFS: { symbol: "Ⓢ", unicode: "\u24C8", name: "Regardless of Feature Size", effect: "no bonus" },
        projected: { symbol: "Ⓟ", unicode: "\u24C5", name: "Projected Tolerance Zone" },
        free: { symbol: "Ⓕ", unicode: "\u24BB", name: "Free State" },
        tangent: { symbol: "Ⓣ", unicode: "\u24C9", name: "Tangent Plane" },
        unequal: { symbol: "Ⓤ", unicode: "\u24CA", name: "Unequal Bilateral" },
        statistical: { symbol: "ST", name: "Statistical Tolerance" },
        continuous: { symbol: "CF", name: "Continuous Feature" }
    },
    // Parse Feature Control Frame
    parseFCF: function(fcfString) {
        const result = {
            raw: fcfString,
            geometricCharacteristic: null,
            toleranceZone: null,
            primaryDatum: null,
            secondaryDatum: null,
            tertiaryDatum: null,
            modifiers: [],
            isComposite: false
        };
        // Detect composite tolerance (two-line FCF)
        if (fcfString.includes('\n') || fcfString.includes('|')) {
            result.isComposite = true;
            const lines = fcfString.split(/[\n|]/);
            result.patternLocating = this.parseSingleFCF(lines[0]);
            result.featureRelating = this.parseSingleFCF(lines[1]);
            return result;
        }
        return this.parseSingleFCF(fcfString);
    },
    // Parse single FCF line
    parseSingleFCF: function(line) {
        const result = {
            raw: line,
            geometricCharacteristic: null,
            diameterSymbol: false,
            toleranceValue: null,
            modifiers: [],
            datums: []
        };
        // Detect geometric characteristic symbol
        for (const [name, info] of Object.entries(this.symbols)) {
            if (line.includes(info.symbol) || line.includes(info.unicode)) {
                result.geometricCharacteristic = name;
                result.category = info.category;
                result.requiresDatum = info.requiresDatum;
                break;
            }
        }
        // Detect diameter symbol (cylindrical tolerance zone)
        if (line.includes('Ø') || line.includes('⌀')) {
            result.diameterSymbol = true;
        }
        // Extract tolerance value
        const tolMatch = line.match(/([0-9]+\.?[0-9]*)/);
        if (tolMatch) {
            result.toleranceValue = parseFloat(tolMatch[1]);
        }
        // Detect modifiers
        for (const [name, info] of Object.entries(this.modifiers)) {
            if (line.includes(info.symbol) || (info.unicode && line.includes(info.unicode))) {
                result.modifiers.push(name);
            }
        }
        // Extract datum references
        const datumPattern = /[A-Z](?:[Ⓜ Ⓛ Ⓢ])?/g;
        const datumMatches = line.match(datumPattern);
        if (datumMatches) {
            result.datums = datumMatches.filter(d => d.length <= 2);
        }
        return result;
    },
    // Calculate bonus tolerance for MMC/LMC
    calculateBonusTolerance: function(fcf, actualSize, mmc, lmc) {
        if (!fcf.modifiers.includes('MMC') && !fcf.modifiers.includes('LMC')) {
            return 0; // RFS - no bonus
        }
        if (fcf.modifiers.includes('MMC')) {
            // Bonus = |Actual Size - MMC|
            return Math.abs(actualSize - mmc);
        }
        if (fcf.modifiers.includes('LMC')) {
            // Bonus = |LMC - Actual Size|
            return Math.abs(lmc - actualSize);
        }
        return 0;
    },
    // Generate FCF string from parsed data
    generateFCF: function(data) {
        let fcf = '';

        // Add geometric characteristic
        if (data.geometricCharacteristic && this.symbols[data.geometricCharacteristic]) {
            fcf += this.symbols[data.geometricCharacteristic].symbol;
        }
        // Add diameter symbol if cylindrical zone
        if (data.diameterSymbol) {
            fcf += 'Ø';
        }
        // Add tolerance value
        if (data.toleranceValue !== null) {
            fcf += data.toleranceValue.toFixed(3);
        }
        // Add modifiers
        for (const mod of data.modifiers || []) {
            if (this.modifiers[mod]) {
                fcf += this.modifiers[mod].symbol;
            }
        }
        // Add datum references
        for (const datum of data.datums || []) {
            fcf += '|' + datum;
        }
        return fcf;
    }
}