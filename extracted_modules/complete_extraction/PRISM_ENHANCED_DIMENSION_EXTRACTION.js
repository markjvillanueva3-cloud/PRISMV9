const PRISM_ENHANCED_DIMENSION_EXTRACTION = {
    version: "1.0",

    // Dimension types
    dimensionTypes: {
        linear: {
            name: "Linear Dimension",
            patterns: [
                /([0-9]+\.?[0-9]*)\s*(mm|in|"|\')/i,
                /([0-9]+)\s*-\s*([0-9]+)\/([0-9]+)/  // Fractional inches
            ],
            extractors: {
                mm: (val) => parseFloat(val),
                in: (val) => parseFloat(val) * 25.4,
                '"': (val) => parseFloat(val) * 25.4
            }
        },
        angular: {
            name: "Angular Dimension",
            patterns: [
                /([0-9]+\.?[0-9]*)\s*°/,
                /([0-9]+)°\s*([0-9]+)'\s*([0-9]+)"/  // Degrees, minutes, seconds
            ],
            extractors: {
                dms: (d, m, s) => parseFloat(d) + parseFloat(m)/60 + parseFloat(s)/3600
            }
        },
        radius: {
            name: "Radius Dimension",
            patterns: [
                /R\s*([0-9]+\.?[0-9]*)/i,
                /RAD\s*([0-9]+\.?[0-9]*)/i
            ],
            prefix: "R"
        },
        diameter: {
            name: "Diameter Dimension",
            patterns: [
                /[ØⱷΦ]\s*([0-9]+\.?[0-9]*)/,
                /DIA\s*([0-9]+\.?[0-9]*)/i,
                /\bD\s*([0-9]+\.?[0-9]*)/
            ],
            prefix: "Ø"
        },
        sphericalRadius: {
            name: "Spherical Radius",
            patterns: [/SR\s*([0-9]+\.?[0-9]*)/i],
            prefix: "SR"
        },
        sphericalDiameter: {
            name: "Spherical Diameter",
            patterns: [/S[ØⱷΦ]\s*([0-9]+\.?[0-9]*)/],
            prefix: "SØ"
        }
    },
    // Chain dimension parsing
    chainDimensions: {
        description: "Consecutive dimensions measured from one feature to the next",
        pattern: /([0-9]+\.?[0-9]*)\s*[-—]\s*([0-9]+\.?[0-9]*)\s*[-—]\s*([0-9]+\.?[0-9]*)/,

        parse: function(dimString) {
            const values = dimString.match(/[0-9]+\.?[0-9]*/g);
            if (!values) return null;

            const chain = {
                type: "chain",
                segments: values.map((v, i) => ({
                    index: i,
                    value: parseFloat(v),
                    cumulative: 0
                })),
                totalLength: 0
            };
            // Calculate cumulative positions
            let cumulative = 0;
            for (const segment of chain.segments) {
                cumulative += segment.value;
                segment.cumulative = cumulative;
            }
            chain.totalLength = cumulative;

            return chain;
        },
        // Convert chain to baseline
        toBaseline: function(chain) {
            return chain.segments.map(s => ({
                fromOrigin: s.cumulative - s.value,
                toPosition: s.cumulative,
                segmentValue: s.value
            }));
        }
    },
    // Baseline dimension parsing
    baselineDimensions: {
        description: "All dimensions measured from a common baseline/datum",

        parse: function(dimensions, baselinePosition = 0) {
            return dimensions.map(dim => ({
                type: "baseline",
                fromBaseline: baselinePosition,
                toPosition: dim.value,
                absoluteValue: dim.value - baselinePosition
            }));
        },
        // Convert baseline to chain
        toChain: function(baselineDims) {
            const sorted = [...baselineDims].sort((a, b) => a.toPosition - b.toPosition);
            const chain = [];

            for (let i = 0; i < sorted.length; i++) {
                const prev = i === 0 ? sorted[i].fromBaseline : sorted[i-1].toPosition;
                chain.push({
                    index: i,
                    value: sorted[i].toPosition - prev,
                    cumulative: sorted[i].toPosition
                });
            }
            return { type: "chain", segments: chain };
        }
    },
    // Ordinate dimension parsing
    ordinateDimensions: {
        description: "Dimensions shown as coordinates from a datum origin",

        parse: function(ordinateValues, axis) {
            return {
                type: "ordinate",
                axis: axis,
                origin: 0,
                positions: ordinateValues.map((val, i) => ({
                    index: i,
                    coordinate: parseFloat(val),
                    label: `${axis}${i + 1}`
                }))
            };
        }
    },
    // Tolerance parsing
    toleranceParsing: {
        // Bilateral tolerance: 25.4 ±0.1
        bilateral: {
            pattern: /([0-9]+\.?[0-9]*)\s*[±]\s*([0-9]+\.?[0-9]*)/,
            parse: function(match) {
                return {
                    type: "bilateral",
                    nominal: parseFloat(match[1]),
                    plusTolerance: parseFloat(match[2]),
                    minusTolerance: parseFloat(match[2]),
                    max: parseFloat(match[1]) + parseFloat(match[2]),
                    min: parseFloat(match[1]) - parseFloat(match[2])
                };
            }
        },
        // Unilateral tolerance: 25.4 +0.1/-0.0
        unilateral: {
            pattern: /([0-9]+\.?[0-9]*)\s*\+([0-9]+\.?[0-9]*)\s*\/\s*-([0-9]+\.?[0-9]*)/,
            parse: function(match) {
                return {
                    type: "unilateral",
                    nominal: parseFloat(match[1]),
                    plusTolerance: parseFloat(match[2]),
                    minusTolerance: parseFloat(match[3]),
                    max: parseFloat(match[1]) + parseFloat(match[2]),
                    min: parseFloat(match[1]) - parseFloat(match[3])
                };
            }
        },
        // Limit dimensions: 25.5/25.3
        limits: {
            pattern: /([0-9]+\.?[0-9]*)\s*\/\s*([0-9]+\.?[0-9]*)/,
            parse: function(match) {
                const val1 = parseFloat(match[1]);
                const val2 = parseFloat(match[2]);
                return {
                    type: "limits",
                    max: Math.max(val1, val2),
                    min: Math.min(val1, val2),
                    nominal: (val1 + val2) / 2,
                    tolerance: Math.abs(val1 - val2) / 2
                };
            }
        }
    },
    // Extract all dimensions from text
    extractAllDimensions: function(text) {
        const results = [];

        // Linear dimensions
        const linearPattern = /([0-9]+\.?[0-9]*)\s*(mm|in)?/gi;
        let match;
        while ((match = linearPattern.exec(text)) !== null) {
            results.push({
                type: "linear",
                raw: match[0],
                value: parseFloat(match[1]),
                unit: match[2] || "mm",
                position: match.index
            });
        }
        // Diameter dimensions
        const diaPattern = /[ØⱷΦ]\s*([0-9]+\.?[0-9]*)/g;
        while ((match = diaPattern.exec(text)) !== null) {
            results.push({
                type: "diameter",
                raw: match[0],
                value: parseFloat(match[1]),
                position: match.index
            });
        }
        // Radius dimensions
        const radPattern = /R\s*([0-9]+\.?[0-9]*)/gi;
        while ((match = radPattern.exec(text)) !== null) {
            results.push({
                type: "radius",
                raw: match[0],
                value: parseFloat(match[1]),
                position: match.index
            });
        }
        // Angular dimensions
        const angPattern = /([0-9]+\.?[0-9]*)\s*°/g;
        while ((match = angPattern.exec(text)) !== null) {
            results.push({
                type: "angular",
                raw: match[0],
                value: parseFloat(match[1]),
                unit: "degrees",
                position: match.index
            });
        }
        return results;
    }
};