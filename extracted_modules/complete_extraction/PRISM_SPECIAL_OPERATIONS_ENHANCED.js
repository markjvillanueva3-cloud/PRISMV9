const PRISM_SPECIAL_OPERATIONS_ENHANCED = {
    version: "1.0",

    // Helical interpolation for various operations
    helicalInterpolation: {
        threadMilling: {
            calculate: function(params) {
                const { diameter, pitch, depth, toolDia, internal } = params;
                const helixDia = internal ? diameter - toolDia : diameter + toolDia;
                const circumference = Math.PI * helixDia;
                const leadPerRev = pitch;

                return {
                    helixDiameter: helixDia,
                    leadPerRevolution: leadPerRev,
                    numberOfRevolutions: depth / leadPerRev,
                    arcLength: circumference * (depth / leadPerRev),
                    direction: internal ? 'CCW' : 'CW'
                };
            }
        },
        helicalBoring: {
            calculate: function(params) {
                const { holeDia, toolDia, depth, stepdown } = params;
                const helixDia = holeDia - toolDia;
                const passes = Math.ceil(depth / stepdown);

                return {
                    helixDiameter: helixDia,
                    numberOfPasses: passes,
                    depthPerPass: depth / passes,
                    totalPath: Math.PI * helixDia * passes
                };
            }
        },
        helicalEntry: {
            calculate: function(params) {
                const { pocketWidth, toolDia, depth, maxAngle } = params;
                const maxHelixDia = Math.min(pocketWidth * 0.8, toolDia * 2);
                const angleRad = maxAngle * Math.PI / 180;
                const circumference = Math.PI * maxHelixDia;
                const leadPerRev = circumference * Math.tan(angleRad);

                return {
                    helixDiameter: maxHelixDia,
                    helixAngle: maxAngle,
                    leadPerRevolution: leadPerRev,
                    revolutions: depth / leadPerRev
                };
            }
        }
    },
    // Peck drilling enhancements
    peckDrilling: {
        modes: {
            standard: { retractType: 'full', chipBreak: false },
            highSpeed: { retractType: 'partial', chipBreak: true },
            deepHole: { retractType: 'full', coolantDwell: true }
        },
        calculate: function(params) {
            const { holeDia, depth, material, mode } = params;
            const modeConfig = this.modes[mode] || this.modes.standard;

            const depthRatios = {
                aluminum: { first: 3.0, subsequent: 2.5, deep: 0.8 },
                steel: { first: 2.0, subsequent: 1.5, deep: 0.75 },
                stainless: { first: 1.5, subsequent: 1.0, deep: 0.7 },
                titanium: { first: 1.0, subsequent: 0.75, deep: 0.6 }
            };
            const ratio = depthRatios[material] || depthRatios.steel;
            const pecks = [];
            let currentDepth = 0;
            let peckNum = 1;

            while (currentDepth < depth) {
                let peckDepth = holeDia * (peckNum === 1 ? ratio.first : ratio.subsequent);

                // Reduce peck depth for deep holes
                if (currentDepth > holeDia * 5) {
                    peckDepth *= ratio.deep;
                }
                peckDepth = Math.min(peckDepth, depth - currentDepth);
                currentDepth += peckDepth;

                pecks.push({
                    peck: peckNum,
                    depth: currentDepth,
                    increment: peckDepth,
                    retract: modeConfig.retractType === 'full' ? 0.5 : 0.1
                });

                peckNum++;
            }
            return { pecks, totalPecks: pecks.length, mode: modeConfig };
        }
    },
    // BTA and gun drilling
    btaDrilling: {
        parameters: {
            coolantPressure: { small: 1000, medium: 750, large: 500 }, // PSI
            coolantFlow: function(dia) { return dia * 5; }, // L/min
            chipRemoval: "internal",
            headTypes: ["solid", "brazed", "indexable"]
        },
        calculate: function(params) {
            const { diameter, depth, material } = params;
            const depthRatio = depth / diameter;

            // Speed/feed by material (m/min, mm/rev)
            const data = {
                steel: { speed: 80, feed: 0.02 },
                aluminum: { speed: 200, feed: 0.04 },
                stainless: { speed: 50, feed: 0.015 },
                titanium: { speed: 40, feed: 0.01 }
            };
            const matData = data[material] || data.steel;
            const rpm = (matData.speed * 1000) / (Math.PI * diameter);

            return {
                method: depthRatio > 100 ? 'BTA' : 'gun',
                rpm: Math.round(rpm),
                feedRate: Math.round(rpm * matData.feed),
                coolantPressure: diameter < 10 ? 1000 : diameter < 25 ? 750 : 500,
                coolantFlow: Math.round(diameter * 5),
                estimatedTime: (depth / (rpm * matData.feed)).toFixed(1) + ' min'
            };
        }
    }
}