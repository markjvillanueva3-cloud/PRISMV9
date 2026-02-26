const PRISM_EXPLAINABLE_AI = {
    // Store reasoning traces
    traces: new Map(),
    
    // Explanation templates
    templates: {
        speed_feed: {
            factors: [
                { name: 'material_hardness', weight: 0.25, description: 'Material hardness affects cutting speed capability' },
                { name: 'tool_material', weight: 0.20, description: 'Tool material determines heat resistance and wear characteristics' },
                { name: 'operation_type', weight: 0.15, description: 'Roughing vs finishing affects parameter aggressiveness' },
                { name: 'machine_capability', weight: 0.15, description: 'Machine spindle power and rigidity set upper limits' },
                { name: 'surface_finish_req', weight: 0.10, description: 'Surface finish requirements influence feed rate' },
                { name: 'tool_life_target', weight: 0.10, description: 'Desired tool life trades off against productivity' },
                { name: 'historical_data', weight: 0.05, description: 'Past successful cuts with similar parameters' }
            ]
        },
        tool_life: {
            factors: [
                { name: 'taylor_equation', weight: 0.30, description: 'Taylor tool life equation (VT^n = C)' },
                { name: 'cutting_temperature', weight: 0.20, description: 'Higher temperatures accelerate wear' },
                { name: 'chip_load', weight: 0.15, description: 'Excessive chip load causes rapid wear' },
                { name: 'coolant_effectiveness', weight: 0.15, description: 'Coolant reduces heat and wear' },
                { name: 'material_abrasiveness', weight: 0.10, description: 'Abrasive materials cause faster wear' },
                { name: 'historical_observations', weight: 0.10, description: 'Actual tool life data from similar operations' }
            ]
        }
    },
    
    // Create a reasoning trace
    startTrace(traceId, type) {
        this.traces.set(traceId, {
            id: traceId,
            type,
            startTime: Date.now(),
            steps: [],
            factors: [],
            inputs: {},
            outputs: {},
            confidence: null
        });
        return traceId;
    },
    
    // Add a reasoning step
    addStep(traceId, step) {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.steps.push({
                ...step,
                timestamp: Date.now()
            });
        }
    },
    
    // Record factor contribution
    addFactor(traceId, factor, value, contribution, description = '') {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.factors.push({
                factor,
                value,
                contribution,
                description,
                normalizedContribution: null // Will be calculated later
            });
        }
    },
    
    // Finalize trace
    finalizeTrace(traceId, outputs, confidence) {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.outputs = outputs;
            trace.confidence = confidence;
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;
            
            // Normalize factor contributions
            const totalContribution = trace.factors.reduce((sum, f) => sum + Math.abs(f.contribution), 0);
            if (totalContribution > 0) {
                trace.factors.forEach(f => {
                    f.normalizedContribution = f.contribution / totalContribution;
                });
            }
            
            // Sort factors by importance
            trace.factors.sort((a, b) => Math.abs(b.normalizedContribution) - Math.abs(a.normalizedContribution));
        }
        return trace;
    },
    
    // Generate human-readable explanation
    explain(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace) return { error: 'Trace not found' };
        
        const explanation = {
            summary: this._generateSummary(trace),
            confidence: trace.confidence,
            topFactors: trace.factors.slice(0, 5).map(f => ({
                name: f.factor,
                impact: `${(f.normalizedContribution * 100).toFixed(1)}%`,
                description: f.description,
                value: f.value
            })),
            reasoning: this._generateReasoning(trace),
            alternatives: this._suggestAlternatives(trace),
            caveats: this._generateCaveats(trace)
        };
        
        return explanation;
    },
    
    _generateSummary(trace) {
        const type = trace.type;
        const confidence = trace.confidence;
        
        if (type === 'speed_feed') {
            const topFactor = trace.factors[0];
            return `Recommended parameters are based primarily on ${topFactor?.factor || 'standard calculations'} ` +
                   `with ${confidence}% confidence. ` +
                   `${trace.factors.length} factors were considered in this recommendation.`;
        }
        
        if (type === 'tool_life') {
            return `Tool life prediction uses ${trace.steps.length} calculation steps ` +
                   `with ${confidence}% confidence based on ${trace.factors.length} factors.`;
        }
        
        return `Analysis complete with ${confidence}% confidence.`;
    },
    
    _generateReasoning(trace) {
        const steps = trace.steps.map((step, i) => ({
            step: i + 1,
            action: step.action,
            result: step.result,
            notes: step.notes
        }));
        
        return steps;
    },
    
    _suggestAlternatives(trace) {
        const alternatives = [];
        
        if (trace.type === 'speed_feed') {
            alternatives.push({
                name: 'Conservative approach',
                description: 'Reduce speed by 15% for longer tool life',
                tradeoff: 'Lower productivity, higher tool life'
            });
            alternatives.push({
                name: 'Aggressive approach',
                description: 'Increase speed by 10% for faster cycle time',
                tradeoff: 'Higher productivity, shorter tool life'
            });
        }
        
        return alternatives;
    },
    
    _generateCaveats(trace) {
        const caveats = [];
        
        if (trace.confidence < 70) {
            caveats.push('Confidence is below 70%. Consider verifying with test cuts.');
        }
        
        const historicalFactor = trace.factors.find(f => f.factor.includes('historical'));
        if (!historicalFactor || Math.abs(historicalFactor.normalizedContribution) < 0.1) {
            caveats.push('Limited historical data available for this combination.');
        }
        
        if (trace.factors.some(f => f.value === 'estimated' || f.value === 'default')) {
            caveats.push('Some input values were estimated. Actual results may vary.');
        }
        
        return caveats;
    },
    
    // Feature importance visualization data
    getFeatureImportance(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace) return [];
        
        return trace.factors.map(f => ({
            feature: f.factor,
            importance: Math.abs(f.normalizedContribution),
            direction: f.contribution >= 0 ? 'positive' : 'negative',
            value: f.value
        }));
    },
    
    // Compare two recommendations
    compareTraces(traceId1, traceId2) {
        const trace1 = this.traces.get(traceId1);
        const trace2 = this.traces.get(traceId2);
        
        if (!trace1 || !trace2) return { error: 'Trace not found' };
        
        const comparison = {
            outputDifferences: {},
            factorDifferences: [],
            recommendation: ''
        };
        
        // Compare outputs
        for (const key of Object.keys(trace1.outputs)) {
            if (trace2.outputs[key] !== undefined) {
                comparison.outputDifferences[key] = {
                    value1: trace1.outputs[key],
                    value2: trace2.outputs[key],
                    difference: trace2.outputs[key] - trace1.outputs[key]
                };
            }
        }
        
        // Compare factors
        const allFactors = new Set([
            ...trace1.factors.map(f => f.factor),
            ...trace2.factors.map(f => f.factor)
        ]);
        
        allFactors.forEach(factor => {
            const f1 = trace1.factors.find(f => f.factor === factor);
            const f2 = trace2.factors.find(f => f.factor === factor);
            
            if (f1 && f2 && f1.value !== f2.value) {
                comparison.factorDifferences.push({
                    factor,
                    value1: f1.value,
                    value2: f2.value,
                    impactChange: (f2.normalizedContribution || 0) - (f1.normalizedContribution || 0)
                });
            }
        });
        
        return comparison;
    },
    
    // What-if analysis
    whatIf(traceId, changes) {
        const trace = this.traces.get(traceId);
        if (!trace) return { error: 'Trace not found' };
        
        // Create modified inputs
        const modifiedInputs = { ...trace.inputs, ...changes };
        
        // Estimate impact (simplified - would recalculate in real system)
        const impacts = [];
        
        for (const [key, newValue] of Object.entries(changes)) {
            const factor = trace.factors.find(f => f.factor.includes(key));
            if (factor) {
                impacts.push({
                    factor: key,
                    originalValue: factor.value,
                    newValue,
                    estimatedImpact: factor.normalizedContribution * (newValue / factor.value - 1)
                });
            }
        }
        
        return {
            originalOutputs: trace.outputs,
            modifiedInputs,
            estimatedImpacts: impacts,
            note: 'For accurate results, recalculate with new parameters'
        };
    }
}