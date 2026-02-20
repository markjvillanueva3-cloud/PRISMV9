const PRISM_TOOLPATH_GCODE_BRIDGE = {
    version: '1.0.0',

    /**
     * Convert toolpath array to G-code lines
     */
    convert(toolpath, params = {}) {
        const lines = [];
        const decimal = params.decimal || 4;
        const format = (n) => n.toFixed(decimal);

        let lastX = null, lastY = null, lastZ = null;
        let lastF = null;

        for (const move of toolpath) {
            const type = move.type || 'G1';
            let line = '';

            // Rapids
            if (type === 'rapid' || type === 'G0') {
                line = 'G0';
                if (move.x !== undefined && move.x !== lastX) { line += ` X${format(move.x)}`; lastX = move.x; }
                if (move.y !== undefined && move.y !== lastY) { line += ` Y${format(move.y)}`; lastY = move.y; }
                if (move.z !== undefined && move.z !== lastZ) { line += ` Z${format(move.z)}`; lastZ = move.z; }
            }
            // Linear feeds
            else if (type === 'feed' || type === 'linear' || type === 'G1') {
                line = 'G1';
                if (move.x !== undefined && move.x !== lastX) { line += ` X${format(move.x)}`; lastX = move.x; }
                if (move.y !== undefined && move.y !== lastY) { line += ` Y${format(move.y)}`; lastY = move.y; }
                if (move.z !== undefined && move.z !== lastZ) { line += ` Z${format(move.z)}`; lastZ = move.z; }
                if (move.f !== undefined && move.f !== lastF) { line += ` F${Math.round(move.f)}`; lastF = move.f; }
            }
            // CW Arc
            else if (type === 'arc_cw' || type === 'G2') {
                line = 'G2';
                if (move.x !== undefined) { line += ` X${format(move.x)}`; lastX = move.x; }
                if (move.y !== undefined) { line += ` Y${format(move.y)}`; lastY = move.y; }
                if (move.z !== undefined) { line += ` Z${format(move.z)}`; lastZ = move.z; }
                if (move.i !== undefined) line += ` I${format(move.i)}`;
                if (move.j !== undefined) line += ` J${format(move.j)}`;
                if (move.r !== undefined) line += ` R${format(move.r)}`;
                if (move.f !== undefined && move.f !== lastF) { line += ` F${Math.round(move.f)}`; lastF = move.f; }
            }
            // CCW Arc
            else if (type === 'arc_ccw' || type === 'G3') {
                line = 'G3';
                if (move.x !== undefined) { line += ` X${format(move.x)}`; lastX = move.x; }
                if (move.y !== undefined) { line += ` Y${format(move.y)}`; lastY = move.y; }
                if (move.z !== undefined) { line += ` Z${format(move.z)}`; lastZ = move.z; }
                if (move.i !== undefined) line += ` I${format(move.i)}`;
                if (move.j !== undefined) line += ` J${format(move.j)}`;
                if (move.r !== undefined) line += ` R${format(move.r)}`;
                if (move.f !== undefined && move.f !== lastF) { line += ` F${Math.round(move.f)}`; lastF = move.f; }
            }
            // Comments
            else if (type === 'comment') {
                line = `(${move.text || move.comment || ''})`;
            }
            if (line.trim()) {
                lines.push(line);
            }
        }
        return lines;
    },
    /**
     * Generate complete program from toolpath with all optimizations
     */
    generateProgram(toolpath, tool, material, params = {}) {
        // Apply chip thinning if available
        let optimizedPath = toolpath;
        if (typeof PRISM_ADVANCED_FEED_OPTIMIZER !== 'undefined' && params.woc) {
            optimizedPath = PRISM_ADVANCED_FEED_OPTIMIZER.optimizeFeedProfile(toolpath, tool, params);
        }
        // Convert to G-code
        const gcodeLines = this.convert(optimizedPath, params);

        // Build complete program
        const program = [];
        const controller = params.controller || 'fanuc';

        // Header
        if (typeof PRISM_CONTROLLER_OUTPUT !== 'undefined') {
            const startLines = PRISM_CONTROLLER_OUTPUT.programStart(controller, params);
            program.push(...startLines);
        } else {
            program.push('%');
            program.push(`O${params.programNumber || '0001'} (PRISM GENERATED)`);
            program.push('G90 G94 G17');
            program.push('G21');
        }
        // Tool call and spindle
        const rpm = params.rpm || 5000;
        program.push('');
        program.push(`T${params.toolNumber || 1} M6`);
        program.push(`M3 S${rpm}`);
        program.push('M8');
        program.push('G54');
        program.push(`G43 H${params.toolNumber || 1}`);
        program.push('');

        // Toolpath
        program.push(...gcodeLines);

        // Footer
        program.push('');
        program.push('G0 Z50.');
        program.push('M5');
        program.push('M9');

        if (typeof PRISM_CONTROLLER_OUTPUT !== 'undefined') {
            const endLines = PRISM_CONTROLLER_OUTPUT.programEnd(controller, params);
            program.push(...endLines);
        } else {
            program.push('G28 G91 Z0');
            program.push('M30');
            program.push('%');
        }
        return program;
    }
}