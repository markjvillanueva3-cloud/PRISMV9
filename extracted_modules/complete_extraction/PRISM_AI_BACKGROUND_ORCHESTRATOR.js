const PRISM_AI_BACKGROUND_ORCHESTRATOR = {

    isRunning: false,
    userActions: [],
    suggestions: [],
    interventionThreshold: 0.7,

    patterns: {
        repeatedErrors: [],
        frequentActions: {},
        parameterChanges: []
    },
    start: function() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[PRISM AI Orchestrator] Background monitoring started');
    },
    stop: function() {
        this.isRunning = false;
        console.log('[PRISM AI Orchestrator] Stopped');
    },
    recordAction: function(action) {
        const entry = {
            type: action.type,
            data: action.data,
            timestamp: Date.now(),
            context: action.context || {}
        };
        this.userActions.push(entry);

        if (this.userActions.length > 500) {
            this.userActions = this.userActions.slice(-500);
        }
        this.patterns.frequentActions[action.type] =
            (this.patterns.frequentActions[action.type] || 0) + 1;

        this._analyzeForHelp(entry);
    },
    recordError: function(error) {
        this.patterns.repeatedErrors.push({
            message: error.message,
            context: error.context,
            timestamp: Date.now()
        });

        if (this.patterns.repeatedErrors.length > 50) {
            this.patterns.repeatedErrors = this.patterns.repeatedErrors.slice(-50);
        }
        this._checkRepeatedErrors();
    },
    _analyzeForHelp: function(entry) {
        // Track parameter changes
        if (entry.type === 'parameter_change') {
            this.patterns.parameterChanges.push(entry);
            if (this.patterns.parameterChanges.length > 20) {
                this.patterns.parameterChanges = this.patterns.parameterChanges.slice(-20);
            }
            // Check for repeated same parameter changes
            const recentSame = this.patterns.parameterChanges.filter(e =>
                e.data?.parameter === entry.data?.parameter &&
                Date.now() - e.timestamp < 60000
            );

            if (recentSame.length >= 3) {
                this._addSuggestion({
                    type: 'parameter_struggling',
                    parameter: entry.data?.parameter,
                    attempts: recentSame.length,
                    message: `I noticed you've adjusted ${entry.data?.parameter} ${recentSame.length} times. Would you like me to suggest an optimal value?`,
                    confidence: 0.8
                });
            }
        }
        // Check for out-of-range values
        if (entry.data?.value !== undefined) {
            const outOfRange = this._checkParameterRange(entry.data.parameter, entry.data.value);
            if (outOfRange) {
                this._addSuggestion({
                    type: 'out_of_range',
                    parameter: entry.data.parameter,
                    value: entry.data.value,
                    typical: outOfRange.typical,
                    message: `The ${entry.data.parameter} value (${entry.data.value}) seems ${outOfRange.direction} typical range (${outOfRange.typical}). ${outOfRange.suggestion}`,
                    confidence: 0.85
                });
            }
        }
    },
    _checkParameterRange: function(parameter, value) {
        const ranges = {
            'spindle_speed': { min: 100, max: 20000, unit: 'RPM' },
            'rpm': { min: 100, max: 20000, unit: 'RPM' },
            'feed_rate': { min: 10, max: 10000, unit: 'mm/min' },
            'feedRate': { min: 10, max: 10000, unit: 'mm/min' },
            'depth_of_cut': { min: 0.1, max: 25, unit: 'mm' },
            'doc': { min: 0.1, max: 25, unit: 'mm' },
            'stepover': { min: 5, max: 90, unit: '%' },
            'ae': { min: 0.5, max: 25, unit: 'mm' }
        };
        const range = ranges[parameter];
        if (!range) return null;

        if (value < range.min * 0.5) {
            return {
                direction: 'below',
                typical: `${range.min}-${range.max} ${range.unit}`,
                suggestion: 'This may result in poor efficiency or tool rubbing.'
            };
        }
        if (value > range.max * 1.5) {
            return {
                direction: 'above',
                typical: `${range.min}-${range.max} ${range.unit}`,
                suggestion: 'This may cause tool damage, poor surface finish, or machine issues.'
            };
        }
        return null;
    },
    _checkRepeatedErrors: function() {
        const recentErrors = this.patterns.repeatedErrors.filter(e =>
            Date.now() - e.timestamp < 120000
        );

        const errorCounts = {};
        recentErrors.forEach(e => {
            errorCounts[e.message] = (errorCounts[e.message] || 0) + 1;
        });

        for (const [error, count] of Object.entries(errorCounts)) {
            if (count >= 3) {
                this._addSuggestion({
                    type: 'repeated_error',
                    error: error,
                    count: count,
                    message: `I've noticed "${error}" occurring ${count} times. Would you like help resolving this?`,
                    confidence: 0.85
                });
            }
        }
    },
    _addSuggestion: function(suggestion) {
        if (suggestion.confidence < this.interventionThreshold) return;

        // Check for duplicate
        const duplicate = this.suggestions.find(s =>
            s.type === suggestion.type &&
            s.parameter === suggestion.parameter &&
            !s.dismissed &&
            Date.now() - s.timestamp < 60000
        );
        if (duplicate) return;

        const entry = {
            id: Date.now() + Math.random(),
            ...suggestion,
            timestamp: Date.now(),
            shown: false,
            dismissed: false
        };
        this.suggestions.push(entry);

        // Publish event
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('ai:suggestion', entry);
        }
        console.log('[PRISM AI] Suggestion:', suggestion.message);
    },
    getPendingSuggestions: function() {
        return this.suggestions.filter(s => !s.shown && !s.dismissed);
    },
    markSuggestionShown: function(id) {
        const s = this.suggestions.find(s => s.id === id);
        if (s) s.shown = true;
    },
    dismissSuggestion: function(id) {
        const s = this.suggestions.find(s => s.id === id);
        if (s) s.dismissed = true;
    },
    setHelpLevel: function(level) {
        switch (level) {
            case 'minimal': this.interventionThreshold = 0.95; break;
            case 'moderate': this.interventionThreshold = 0.7; break;
            case 'proactive': this.interventionThreshold = 0.5; break;
        }
        console.log(`[PRISM AI Orchestrator] Help level set to: ${level}`);
    }
}