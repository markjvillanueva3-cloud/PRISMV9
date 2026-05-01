const PRISM_CONTROLLER_OUTPUT = {
    version: '1.0.0',

    controllers: {
        'fanuc': {
            lineNumbers: true,
            lineIncrement: 10,
            programStart: ['%', 'O{progNum} ({comment})', 'G90 G94 G17', 'G21'],
            programEnd: ['M30', '%'],
            toolChange: 'T{tool} M6',
            spindleOn: 'M3 S{rpm}',
            coolantOn: 'M8',
            coolantOff: 'M9',
            spindleOff: 'M5',
            workOffset: 'G54',
            toolLengthComp: 'G43 H{tool}',
            cancelComp: 'G49',
            rapid: 'G0',
            linear: 'G1',
            arcCW: 'G2',
            arcCCW: 'G3',
            dwell: 'G4 P{seconds}',
            homeReturn: 'G28 G91 Z0',
            decimal: 4
        },
        'haas': {
            lineNumbers: true,
            lineIncrement: 1,
            programStart: ['%', 'O{progNum} ({comment})', 'G90 G94 G17 G40 G80', 'G20'],
            programEnd: ['M30', '%'],
            toolChange: 'T{tool} M6',
            spindleOn: 'M3 S{rpm}',
            coolantOn: 'M8',
            coolantOff: 'M9',
            spindleOff: 'M5',
            workOffset: 'G54',
            toolLengthComp: 'G43 H{tool}',
            cancelComp: 'G49',
            rapid: 'G0',
            linear: 'G1',
            arcCW: 'G2',
            arcCCW: 'G3',
            dwell: 'G4 P{seconds}',
            homeReturn: 'G28 G91 Z0',
            hsm: 'G187 P3', // Haas high-speed mode
            decimal: 4
        },
        'siemens': {
            lineNumbers: true,
            lineIncrement: 10,
            programStart: ['; {comment}', 'G90 G64', 'G71'],
            programEnd: ['M30'],
            toolChange: 'T{tool}', // Siemens: separate tool call and spindle
            spindleOn: 'M3 S{rpm}',
            coolantOn: 'M8',
            coolantOff: 'M9',
            spindleOff: 'M5',
            workOffset: 'G54',
            toolLengthComp: 'D{tool}',
            cancelComp: 'D0',
            rapid: 'G0',
            linear: 'G1',
            arcCW: 'G2',
            arcCCW: 'G3',
            dwell: 'G4 F{seconds}',
            lookAhead: 'G642',
            decimal: 3
        },
        'mazatrol': {
            conversational: true,
            lineNumbers: false,
            programStart: ['(MAZATROL PROGRAM)', '(PRISM GENERATED)'],
            programEnd: ['M30'],
            toolChange: 'T{tool}',
            spindleOn: 'S{rpm} M3',
            coolantOn: 'M8',
            coolantOff: 'M9',
            spindleOff: 'M5',
            workOffset: 'G54',
            rapid: 'G0',
            linear: 'G1',
            arcCW: 'G2',
            arcCCW: 'G3',
            decimal: 4
        },
        'heidenhain': {
            lineNumbers: true,
            lineIncrement: 1,
            dialogFormat: true,
            programStart: ['BEGIN PGM {progNum} MM', '; {comment}'],
            programEnd: ['END PGM {progNum} MM'],
            toolChange: 'TOOL CALL {tool} Z S{rpm}',
            spindleOn: '', // Included in tool call
            coolantOn: 'M8',
            coolantOff: 'M9',
            spindleOff: 'M5',
            workOffset: 'CYCL DEF 7.0 DATUM SHIFT',
            rapid: 'L',
            linear: 'L',
            arcCW: 'CR',
            arcCCW: 'CR',
            decimal: 4
        }
    },
    /**
     * Get controller config from database or defaults
     */
    getController(controllerId) {
        const id = (controllerId || 'fanuc').toLowerCase();

        // Try exact match
        if (this.controllers[id]) {
            return { id, ...this.controllers[id] };
        }
        // Try partial match
        for (const [key, config] of Object.entries(this.controllers)) {
            if (id.includes(key) || key.includes(id)) {
                return { id: key, ...config };
            }
        }
        // Check VERIFIED_POST_DATABASE
        if (typeof VERIFIED_POST_DATABASE !== 'undefined' && VERIFIED_POST_DATABASE.posts) {
            for (const [postId, post] of Object.entries(VERIFIED_POST_DATABASE.posts)) {
                if (postId.toLowerCase().includes(id) || id.includes(postId.toLowerCase())) {
                    // Merge database info with defaults
                    const baseConfig = this.controllers['fanuc'];
                    return { id: postId, ...baseConfig, ...post.features };
                }
            }
        }
        return { id: 'fanuc', ...this.controllers['fanuc'] };
    },
    /**
     * Format G-code for specific controller
     */
    formatGCode(program, controllerId, options = {}) {
        const ctrl = this.getController(controllerId);
        const formatted = [];
        let lineNum = options.startLine || 10;

        for (const line of program) {
            if (ctrl.lineNumbers && line.trim() && !line.startsWith('%') && !line.startsWith(';')) {
                formatted.push(`N${lineNum} ${line}`);
                lineNum += ctrl.lineIncrement;
            } else {
                formatted.push(line);
            }
        }
        return formatted;
    },
    /**
     * Generate program start
     */
    programStart(controllerId, options = {}) {
        const ctrl = this.getController(controllerId);
        const lines = [];

        for (const template of ctrl.programStart) {
            let line = template
                .replace('{progNum}', options.programNumber || '0001')
                .replace('{comment}', options.comment || 'PRISM GENERATED');
            lines.push(line);
        }
        return lines;
    },
    /**
     * Generate program end
     */
    programEnd(controllerId, options = {}) {
        const ctrl = this.getController(controllerId);
        const lines = [];

        for (const template of ctrl.programEnd) {
            let line = template.replace('{progNum}', options.programNumber || '0001');
            lines.push(line);
        }
        return lines;
    }
}