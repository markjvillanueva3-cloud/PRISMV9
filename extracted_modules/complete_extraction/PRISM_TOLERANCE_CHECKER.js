const PRISM_TOLERANCE_CHECKER = {
    // Typical achievable tolerances by process and quality (mm)
    ACHIEVABLE_TOLERANCES: {
        milling: { rough: 0.25, semi_finish: 0.1, finish: 0.025, precision: 0.01 },
        turning: { rough: 0.2, semi_finish: 0.08, finish: 0.02, precision: 0.005 },
        drilling: { rough: 0.3, semi_finish: 0.15, finish: 0.05, precision: 0.02 },
        reaming: { rough: 0.05, semi_finish: 0.025, finish: 0.01, precision: 0.005 },
        grinding: { rough: 0.025, semi_finish: 0.01, finish: 0.005, precision: 0.001 },
        boring: { rough: 0.15, semi_finish: 0.05, finish: 0.015, precision: 0.005 },
        edm: { rough: 0.1, semi_finish: 0.025, finish: 0.005, precision: 0.002 }
    },
    
    canAchieve: function(requiredTolerance, process, quality = 'finish') {
        const processTolerances = this.ACHIEVABLE_TOLERANCES[process.toLowerCase()];
        if (!processTolerances) {
            return { achievable: null, message: `Unknown process: ${process}`, suggestion: Object.keys(this.ACHIEVABLE_TOLERANCES) };
        }
        
        const achievableTol = processTolerances[quality.toLowerCase()] || processTolerances.finish;
        const achievable = requiredTolerance >= achievableTol;
        
        return {
            achievable,
            requiredTolerance,
            achievableTolerance: achievableTol,
            process,
            quality,
            message: achievable ? 
                `${process} ${quality} can achieve ±${requiredTolerance}mm (typical: ±${achievableTol}mm)` :
                `${process} ${quality} typically achieves ±${achievableTol}mm, not ±${requiredTolerance}mm`,
            suggestion: achievable ? null : this.suggestProcess(requiredTolerance)
        };
    },
    
    suggestProcess: function(requiredTolerance) {
        const suggestions = [];
        for (const [process, qualities] of Object.entries(this.ACHIEVABLE_TOLERANCES)) {
            for (const [quality, tolerance] of Object.entries(qualities)) {
                if (tolerance <= requiredTolerance) {
                    suggestions.push({ process, quality, tolerance });
                }
            }
        }
        suggestions.sort((a, b) => b.tolerance - a.tolerance); // Least precise first (cost-effective)
        return suggestions.slice(0, 3);
    },
    
    compareToConstant: function(value, constantName) {
        const tolerance = PRISM_CONSTANTS.TOLERANCE[constantName];
        if (tolerance === undefined) return { valid: null, message: `Unknown constant: ${constantName}` };
        return {
            value,
            constant: constantName,
            tolerance,
            withinTolerance: Math.abs(value) <= tolerance,
            ratio: (Math.abs(value) / tolerance).toFixed(3)
        };
    }
}