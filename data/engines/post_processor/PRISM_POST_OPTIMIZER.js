/**
 * PRISM_POST_OPTIMIZER
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 115
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_POST_OPTIMIZER = {
    version: '1.0.0',
    authority: 'PRISM_POST_OPTIMIZER',
    
    optimizeMotion: function(gcode, options = {}) {
        const { removeRedundant = true, optimizeRapids = true, arcTolerance = 0.005 } = options;
        let lines = gcode.split('\n');
        const stats = { originalLines: lines.length, removedRedundant: 0, rapidsOptimized: 0 };
        
        if (removeRedundant) { const r = this._removeRedundant(lines); lines = r.lines; stats.removedRedundant = r.removed; }
        if (optimizeRapids) { const r = this._optimizeRapids(lines); lines = r.lines; stats.rapidsOptimized = r.optimized; }
        
        return { gcode: lines.join('\n'), stats, reduction: ((stats.originalLines - lines.length) / stats.originalLines * 100).toFixed(1) + '%' };
    },
    
    compress: function(gcode, options = {}) {
        const { removeComments = false, removeWhitespace = true, removeBlockNumbers = false, precision = 4 } = options;
        let lines = gcode.split('\n'), compressed = [];
        
        for (let line of lines) {
            if (removeComments) line = line.replace(/\(.*?\)/g, '').replace(/;.*$/, '');
            if (removeWhitespace) line = line.trim().replace(/\s+/g, ' ');
            if (removeBlockNumbers) line = line.replace(/^N\d+\s*/i, '');
            line = line.replace(/([XYZABC])(-?\d+\.\d{5,})/gi, (m, a, n) => a + parseFloat(n).toFixed(precision));
            if (line.trim()) compressed.push(line);
        }
        
        const result = compressed.join('\n');
        return { gcode: result, originalSize: gcode.length, compressedSize: result.length, compression: ((1 - result.length / gcode.length) * 100).toFixed(1) + '%' };
    },
    
    analyzeOptimizations: function(gcode) {
        const lines = gcode.split('\n');
        const metrics = { totalLines: lines.length, rapidMoves: 0, linearMoves: 0, arcMoves: 0, comments: 0, consecutiveRapids: 0 };
        let lastWasRapid = false;
        
        for (const line of lines) {
            const u = line.toUpperCase().trim();
            if (u.startsWith('G00') || u.startsWith('G0 ')) { metrics.rapidMoves++; if (lastWasRapid) metrics.consecutiveRapids++; lastWasRapid = true; }
            else { lastWasRapid = false; }
            if (u.startsWith('G01') || u.startsWith('G1 ')) metrics.linearMoves++;
            if (u.startsWith('G02') || u.startsWith('G03') || u.startsWith('G2 ') || u.startsWith('G3 ')) metrics.arcMoves++;
            if (u.includes('(') || u.startsWith(';')) metrics.comments++;
        }
        
        const suggestions = [];
        if (metrics.consecutiveRapids > 10) suggestions.push({ type: 'rapid_opt', message: metrics.consecutiveRapids + ' consecutive rapids could be combined', impact: 'medium' });
        if (metrics.arcMoves < metrics.linearMoves * 0.05 && metrics.linearMoves > 100) suggestions.push({ type: 'arc_fitting', message: 'Many linears could be arcs', impact: 'high' });
        
        return { metrics, suggestions, score: Math.max(0, 100 - (metrics.consecutiveRapids > 10 ? 5 : 0) - (metrics.arcMoves < metrics.linearMoves * 0.05 ? 10 : 0)) };
    },
    
    _removeRedundant: function(lines) {
        const result = []; let removed = 0, lastX = null, lastY = null, lastZ = null;
        for (const line of lines) {
            const u = line.toUpperCase().trim();
            const xM = u.match(/X(-?\d+\.?\d*)/), yM = u.match(/Y(-?\d+\.?\d*)/), zM = u.match(/Z(-?\d+\.?\d*)/);
            const gM = u.match(/G0[01]/);
            
            let keep = true;
            if (gM && xM && xM[1] === lastX && yM && yM[1] === lastY && zM && zM[1] === lastZ) { keep = false; removed++; }
            if (xM) lastX = xM[1]; if (yM) lastY = yM[1]; if (zM) lastZ = zM[1];
            if (keep) result.push(line);
        }
        return { lines: result, removed };
    },
    
    _optimizeRapids: function(lines) {
        const result = []; let optimized = 0, rapidBuf = [];
        for (const line of lines) {
            const u = line.toUpperCase().trim();
            if (u.startsWith('G00') || u.startsWith('G0 ')) { rapidBuf.push(line); }
            else {
                if (rapidBuf.length > 1) { result.push(this._combineRapids(rapidBuf)); optimized += rapidBuf.length - 1; }
                else if (rapidBuf.length === 1) result.push(rapidBuf[0]);
                rapidBuf = []; result.push(line);
            }
        }
        if (rapidBuf.length > 1) { result.push(this._combineRapids(rapidBuf)); optimized += rapidBuf.length - 1; }
        else if (rapidBuf.length === 1) result.push(rapidBuf[0]);
        return { lines: result, optimized };
    },
    
    _combineRapids: function(rapids) {
        let fX = null, fY = null, fZ = null;
        for (const r of rapids) {
            const u = r.toUpperCase();
            const xM = u.match(/X(-?\d+\.?\d*)/), yM = u.match(/Y(-?\d+\.?\d*)/), zM = u.match(/Z(-?\d+\.?\d*)/);
            if (xM) fX = xM[1]; if (yM) fY = yM[1]; if (zM) fZ = zM[1];
        }
        let c = 'G00';
        if (fX !== null) c += ' X' + fX; if (fY !== null) c += ' Y' + fY; if (fZ !== null) c += ' Z' + fZ;
        return c;
    },
    
    runSelfTests: function() {
        console.log('[POST_OPTIMIZER] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.optimizeMotion('G00 X0 Y0\nG00 X10 Y10\nG00 X20 Y20\nG01 X30 Y30 F500');
            if (r.gcode && r.stats) { results.passed++; results.tests.push({ name: 'Optimize Motion', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Optimize Motion', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.compress('N10 G00 X1.123456789\n; comment\nN20 G01 Z-0.5', { removeComments: true, removeBlockNumbers: true });
            if (r.compressedSize < r.originalSize) { results.passed++; results.tests.push({ name: 'Compress', status: 'PASS' }); }
            else throw new Error('No compression');
        } catch (e) { results.failed++; results.tests.push({ name: 'Compress', status: 'FAIL', error: e.message }); }
        
        console.log('[POST_OPTIMIZER] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}