const PRISM_POST_ANALYSIS_AI = {
    version: '1.0.0',
    authority: 'PRISM_POST_ANALYSIS_AI',
    
    controllerPatterns: {
        fanuc: { start: [/O\d{4}/, /%/], tool: [/M06/, /T\d+/], spindle: [/M03/, /M04/], end: [/M30/, /M02/] },
        siemens: { start: [/%MPF/, /%SPF/], tool: [/T=/, /M6/], spindle: [/M3/, /M4/], end: [/M30/, /M17/] },
        haas: { start: [/O\d{5}/, /%/], tool: [/M06/, /T\d+/], spindle: [/M03/, /M04/], end: [/M30/] },
        heidenhain: { start: [/BEGIN PGM/], tool: [/TOOL CALL/], spindle: [/M3/, /M4/], end: [/END PGM/] }
    },
    
    identifyController: function(gcode) {
        const content = gcode.split('\n').slice(0, 50).join('\n').toUpperCase();
        const scores = {};
        
        for (const [ctrl, patterns] of Object.entries(this.controllerPatterns)) {
            scores[ctrl] = 0;
            for (const p of patterns.start) if (p.test(content)) scores[ctrl] += 3;
            for (const p of patterns.tool) if (p.test(content)) scores[ctrl] += 1;
            for (const p of patterns.end) if (p.test(content)) scores[ctrl] += 2;
        }
        
        if (content.includes('BEGIN PGM')) scores.heidenhain = 100;
        if (content.includes('%MPF') || content.includes('%SPF')) scores.siemens = 100;
        
        let best = 'unknown', bestScore = 0;
        for (const [c, s] of Object.entries(scores)) if (s > bestScore) { bestScore = s; best = c; }
        
        return { controller: best, confidence: Math.min(1, bestScore / 15), scores };
    },
    
    deepAnalyze: function(gcode) {
        const lines = gcode.split('\n');
        const ctrlInfo = this.identifyController(gcode);
        
        return {
            controller: ctrlInfo,
            structure: this._analyzeStructure(lines),
            motion: this._analyzeMotion(lines),
            tooling: this._analyzeTooling(lines),
            safety: this._analyzeSafety(lines),
            recommendations: this._getRecommendations(ctrlInfo, gcode)
        };
    },
    
    detectErrors: function(gcode) {
        const lines = gcode.split('\n'), errors = [], warnings = [];
        let spindleOn = false;
        
        for (let i = 0; i < lines.length; i++) {
            const u = lines[i].toUpperCase().trim(), ln = i + 1;
            
            if ((u.includes('G01') || u.includes('G1 ')) && !spindleOn)
                warnings.push({ line: ln, type: 'spindle_off', message: 'Cut without spindle', severity: 'warning' });
            
            if (u.includes('M03') || u.includes('M04') || u.includes('M3 ') || u.includes('M4 ')) spindleOn = true;
            if (u.includes('M05') || u.includes('M5 ')) spindleOn = false;
            
            if ((u.includes('G02') || u.includes('G03') || u.includes('G2 ') || u.includes('G3 ')) && !u.includes('I') && !u.includes('J') && !u.includes('R'))
                errors.push({ line: ln, type: 'arc_missing_center', message: 'Arc missing I/J or R', severity: 'error' });
        }
        
        return { errors, warnings, errorCount: errors.length, warningCount: warnings.length };
    },
    
    suggestEnhancements: function(gcode) {
        const analysis = this.deepAnalyze(gcode), errorCheck = this.detectErrors(gcode), suggestions = [];
        
        for (const e of errorCheck.errors) suggestions.push({ type: 'error_fix', message: e.message, priority: 'critical', line: e.line });
        for (const issue of analysis.safety.issues) suggestions.push({ type: 'safety', message: issue.message, priority: 'high' });
        
        suggestions.sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 })[a.priority] - ({ critical: 0, high: 1, medium: 2, low: 3 })[b.priority]);
        return { suggestions, analysis, errors: errorCheck };
    },
    
    _analyzeStructure: function(lines) {
        const s = { hasHeader: false, hasSafetyBlock: false, hasToolChanges: false, hasComments: false };
        for (let i = 0; i < lines.length; i++) {
            const u = lines[i].toUpperCase();
            if (u.includes('(') || u.includes(';')) { s.hasComments = true; if (i < 10) s.hasHeader = true; }
            if (u.includes('M06') || u.includes('M6 ')) s.hasToolChanges = true;
            if (u.includes('G28') || u.includes('G53')) s.hasSafetyBlock = true;
        }
        return s;
    },
    
    _analyzeMotion: function(lines) {
        const m = { rapidMoves: 0, linearMoves: 0, arcMoves: 0, totalDistance: 0 };
        let lastX = 0, lastY = 0, lastZ = 0;
        for (const line of lines) {
            const u = line.toUpperCase();
            if (u.includes('G00') || u.includes('G0 ')) m.rapidMoves++;
            if (u.includes('G01') || u.includes('G1 ')) m.linearMoves++;
            if (u.includes('G02') || u.includes('G03')) m.arcMoves++;
            const xM = u.match(/X(-?\d+\.?\d*)/), yM = u.match(/Y(-?\d+\.?\d*)/), zM = u.match(/Z(-?\d+\.?\d*)/);
            const nX = xM ? parseFloat(xM[1]) : lastX, nY = yM ? parseFloat(yM[1]) : lastY, nZ = zM ? parseFloat(zM[1]) : lastZ;
            m.totalDistance += Math.sqrt(Math.pow(nX - lastX, 2) + Math.pow(nY - lastY, 2) + Math.pow(nZ - lastZ, 2));
            lastX = nX; lastY = nY; lastZ = nZ;
        }
        return m;
    },
    
    _analyzeTooling: function(lines) {
        const toolSet = new Set(); let changes = 0;
        for (const line of lines) {
            const u = line.toUpperCase(), m = u.match(/T(\d+)/);
            if (m) toolSet.add(m[1]);
            if (u.includes('M06') || u.includes('M6 ')) changes++;
        }
        return { tools: Array.from(toolSet).sort((a, b) => parseInt(a) - parseInt(b)), toolChanges: changes };
    },
    
    _analyzeSafety: function(lines) {
        const content = lines.join('\n').toUpperCase();
        const s = { hasHomeReturn: content.includes('G28') || content.includes('G53'),
            hasSafeZ: /G[09][01].*Z\d/.test(content),
            hasSpindleOff: content.includes('M05') || content.includes('M5 '),
            hasCoolantOff: content.includes('M09') || content.includes('M9 '),
            issues: [] };
        if (!s.hasSpindleOff) s.issues.push({ type: 'missing_spindle_stop', message: 'May not have M05 at end' });
        if (!s.hasCoolantOff) s.issues.push({ type: 'missing_coolant_stop', message: 'May not have M09 at end' });
        return s;
    },
    
    _getRecommendations: function(ctrlInfo, gcode) {
        const r = [];
        if (ctrlInfo.controller === 'fanuc' && !gcode.includes('G54')) r.push({ type: 'work_offset', message: 'Consider adding work offset G54', priority: 'low' });
        if (ctrlInfo.controller === 'haas' && !gcode.includes('G43')) r.push({ type: 'tool_length', message: 'Consider adding tool length comp G43', priority: 'medium' });
        return r;
    },
    
    runSelfTests: function() {
        console.log('[POST_ANALYSIS_AI] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.identifyController('O1234\nG00 G90 G54\nT01 M06\nM03 S5000\nM30');
            if (r.controller && r.confidence > 0) { results.passed++; results.tests.push({ name: 'Identify Controller', status: 'PASS' }); }
            else throw new Error('Failed');
        } catch (e) { results.failed++; results.tests.push({ name: 'Identify Controller', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.detectErrors('G01 X10 Y10\nG02 X20 Y20\nM30');
            if (r.errors.length > 0) { results.passed++; results.tests.push({ name: 'Detect Errors', status: 'PASS' }); }
            else throw new Error('No errors found');
        } catch (e) { results.failed++; results.tests.push({ name: 'Detect Errors', status: 'FAIL', error: e.message }); }
        
        console.log('[POST_ANALYSIS_AI] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}