const PRISM_LAYER2_VERIFICATION = {
    name: 'PRISM Layer 2 Cross-Reference Verification',
    version: '1.0.0',

    // Run complete verification
    verify: function() {
        const results = {
            materials: this.verifyMaterials(),
            strategies: this.verifyStrategies(),
            strainRate: this.verifyStrainRateData(),
            thermal: this.verifyThermalData(),
            crossRef: this.verifyCrossReferences()
        };
        // Calculate overall score
        results.overall = this.calculateScore(results);

        return results;
    },
    verifyMaterials: function() {
        const target = 810;
        const achieved = PRISM_MATERIALS_MASTER.totalMaterials || Object.keys(PRISM_MATERIALS_MASTER.byId || {}).length;
        const byIdCount = Object.keys(PRISM_MATERIALS_MASTER.byId || {}).length;

        return {
            target: target,
            achieved: achieved,
            byIdConsistent: achieved === byIdCount,
            percentage: Math.min(100, Math.round((achieved / target) * 100)),
            score: Math.min(30, Math.round((achieved / target) * 30)),
            maxScore: 30,
            status: achieved >= target ? '✅ COMPLETE' : '⚠️ IN PROGRESS'
        };
    },
    verifyStrategies: function() {
        const target = 120;
        let achieved = 0;

        if (PRISM_FEATURE_STRATEGY_MAP) {
            // Count all strategies across all feature types
            const categories = Object.keys(PRISM_FEATURE_STRATEGY_MAP).filter(k =>
                !['totalFeatures', 'totalStrategies', 'getAllFeatureTypes', 'getStrategyCount', 'features'].includes(k)
            );

            categories.forEach(cat => {
                const features = PRISM_FEATURE_STRATEGY_MAP[cat];
                if (typeof features === 'object' && features !== null) {
                    Object.values(features).forEach(f => {
                        if (f && f.primary) achieved += f.primary.length;
                        if (f && f.finishing) achieved += f.finishing.length;
                    });
                }
            });
        }
        return {
            target: target,
            achieved: achieved,
            percentage: Math.min(100, Math.round((achieved / target) * 100)),
            score: Math.min(25, Math.round((achieved / target) * 25)),
            maxScore: 25,
            status: achieved >= target ? '✅ COMPLETE' : '⚠️ IN PROGRESS'
        };
    },
    verifyStrainRateData: function() {
        const jcMaterials = PRISM_JOHNSON_COOK_DATABASE.getAllMaterials().length;
        const target = 50; // Minimum 50 materials should have JC data

        return {
            target: target,
            achieved: jcMaterials,
            percentage: Math.min(100, Math.round((jcMaterials / target) * 100)),
            score: Math.min(20, Math.round((jcMaterials / target) * 20)),
            maxScore: 20,
            status: jcMaterials >= target ? '✅ COMPLETE' : '⚠️ IN PROGRESS'
        };
    },
    verifyThermalData: function() {
        let thermalCount = 0;
        for (const category of Object.values(PRISM_THERMAL_PROPERTIES)) {
            if (typeof category === 'object' && category !== null && !category.name) {
                thermalCount += Object.keys(category).length;
            }
        }
        const target = 40; // Minimum 40 materials with thermal data

        return {
            target: target,
            achieved: thermalCount,
            percentage: Math.min(100, Math.round((thermalCount / target) * 100)),
            score: Math.min(15, Math.round((thermalCount / target) * 15)),
            maxScore: 15,
            status: thermalCount >= target ? '✅ COMPLETE' : '⚠️ IN PROGRESS'
        };
    },
    verifyCrossReferences: function() {
        let crossRefValid = true;
        const checks = [];

        // Check materials byId consistency
        const matCount = PRISM_MATERIALS_MASTER.totalMaterials;
        const byIdCount = Object.keys(PRISM_MATERIALS_MASTER.byId || {}).length;
        checks.push({ name: 'Materials byId', valid: matCount === byIdCount });

        // Check Taylor tool life integration
        const taylorValid = PRISM_TAYLOR_TOOL_LIFE && PRISM_TAYLOR_TOOL_LIFE.constants;
        checks.push({ name: 'Taylor Tool Life', valid: !!taylorValid });

        // Check coating database
        const coatingsValid = typeof PRISM_COATINGS_COMPLETE !== 'undefined';
        checks.push({ name: 'Coatings Database', valid: coatingsValid });

        // Check tool holders
        const holdersValid = typeof PRISM_TOOL_HOLDER_INTERFACES_COMPLETE !== 'undefined';
        checks.push({ name: 'Tool Holders', valid: holdersValid });

        crossRefValid = checks.every(c => c.valid);

        return {
            checks: checks,
            allValid: crossRefValid,
            score: crossRefValid ? 10 : Math.round(checks.filter(c => c.valid).length / checks.length * 10),
            maxScore: 10,
            status: crossRefValid ? '✅ COMPLETE' : '⚠️ ISSUES FOUND'
        };
    },
    calculateScore: function(results) {
        const totalScore =
            results.materials.score +
            results.strategies.score +
            results.strainRate.score +
            results.thermal.score +
            results.crossRef.score;

        const maxScore = 100;

        return {
            score: totalScore,
            maxScore: maxScore,
            percentage: Math.round((totalScore / maxScore) * 100),
            status: totalScore >= 90 ? '✅ LAYER 2 COMPLETE' :
                    totalScore >= 70 ? '⚠️ NEAR COMPLETE' : '🔧 IN PROGRESS'
        };
    },
    // Generate report
    generateReport: function() {
        const v = this.verify();

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('                    PRISM LAYER 2 ASSESSMENT - Build v8.61.017');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`Materials Expansion:     ${v.materials.score}/${v.materials.maxScore} pts  [${v.materials.achieved}/${v.materials.target}] ${v.materials.status}`);
        console.log(`Strategy Expansion:      ${v.strategies.score}/${v.strategies.maxScore} pts  [${v.strategies.achieved}/${v.strategies.target}] ${v.strategies.status}`);
        console.log(`Strain-Rate Data:        ${v.strainRate.score}/${v.strainRate.maxScore} pts  [${v.strainRate.achieved}/${v.strainRate.target}] ${v.strainRate.status}`);
        console.log(`Thermal Enhancement:     ${v.thermal.score}/${v.thermal.maxScore} pts  [${v.thermal.achieved}/${v.thermal.target}] ${v.thermal.status}`);
        console.log(`Cross-Reference Verify:  ${v.crossRef.score}/${v.crossRef.maxScore} pts  ${v.crossRef.status}`);
        console.log('───────────────────────────────────────────────────────────────────────────────');
        console.log(`TOTAL:                   ${v.overall.score}/${v.overall.maxScore} (${v.overall.percentage}%)`);
        console.log(`STATUS:                  ${v.overall.status}`);
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('');

        return v;
    }
}