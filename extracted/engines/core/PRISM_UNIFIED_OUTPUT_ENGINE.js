/**
 * PRISM_UNIFIED_OUTPUT_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 189
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_UNIFIED_OUTPUT_ENGINE = {
    version: '1.0.0',

    /**
     * Convert toolpath moves to G-code with REAL calculated values
     */
    toolpathToGcode(toolpath, params, controller = 'fanuc_0i') {
        const gcode = [];
        const fmt = this.getFormat(controller);

        // Calculate spindle speed from SFM and tool diameter
        const sfm = params.sfm || 500;
        const toolDia = params.toolDiameter || 0.5;
        const rpm = Math.min(Math.round((sfm * 12) / (Math.PI * toolDia)), params.maxRpm || 15000);

        // Calculate feed rate from chipload
        const ipt = params.ipt || 0.003;
        const flutes = params.flutes || 4;
        const ipm = Math.round(rpm * ipt * flutes);

        // Plunge feed is typically 50% of cutting feed
        const plungeFeed = Math.round(ipm * 0.5);

        // Store for reference
        this.lastParams = { rpm, ipm, plungeFeed, sfm, ipt };

        // Add header comment with parameters
        gcode.push(`(CUTTING PARAMS: S${rpm} F${ipm})`);
        gcode.push(`(SFM: ${sfm} IPT: ${ipt} FLUTES: ${flutes})`);

        // Process each move
        if (!toolpath || !toolpath.length) {
            console.warn('[UNIFIED_OUTPUT] No toolpath moves provided');
            return gcode;
        }
        for (const move of toolpath) {
            const x = move.x !== undefined ? fmt.coord(move.x) : '';
            const y = move.y !== undefined ? fmt.coord(move.y) : '';
            const z = move.z !== undefined ? fmt.coord(move.z) : '';

            if (move.type === 'rapid') {
                gcode.push(`G0${x ? ' X' + x : ''}${y ? ' Y' + y : ''}${z ? ' Z' + z : ''}`);
            } else if (move.type === 'feed' || move.type === 'linear') {
                // Use calculated feed, or move-specific override
                const f = move.f || (move.z !== undefined && move.z < 0 ? plungeFeed : ipm);
                gcode.push(`G1${x ? ' X' + x : ''}${y ? ' Y' + y : ''}${z ? ' Z' + z : ''} F${f}`);
            } else if (move.type === 'arc_cw' || move.type === 'G2') {
                const i = move.i !== undefined ? ' I' + fmt.coord(move.i) : '';
                const j = move.j !== undefined ? ' J' + fmt.coord(move.j) : '';
                const r = move.r !== undefined ? ' R' + fmt.coord(move.r) : '';
                gcode.push(`G2${x ? ' X' + x : ''}${y ? ' Y' + y : ''}${i}${j}${r} F${ipm}`);
            } else if (move.type === 'arc_ccw' || move.type === 'G3') {
                const i = move.i !== undefined ? ' I' + fmt.coord(move.i) : '';
                const j = move.j !== undefined ? ' J' + fmt.coord(move.j) : '';
                const r = move.r !== undefined ? ' R' + fmt.coord(move.r) : '';
                gcode.push(`G3${x ? ' X' + x : ''}${y ? ' Y' + y : ''}${i}${j}${r} F${ipm}`);
            }
        }
        return gcode;
    },
    /**
     * Generate complete G-code program with real values
     */
    generateProgram(operations, machine, options = {}) {
        const controller = machine?.controller || options.controller || 'fanuc_0i';
        const fmt = this.getFormat(controller);
        const program = [];

        // Program header
        program.push('%');
        program.push(`O${options.programNumber || '0001'} (PRISM GENERATED - v8.9.181)`);
        program.push(`(MACHINE: ${machine?.name || 'UNKNOWN'})`);
        program.push(`(CONTROLLER: ${controller.toUpperCase()})`);
        program.push(`(DATE: ${new Date().toISOString().split('T')[0]})`);
        program.push('');

        // Safety block
        program.push('(SAFETY BLOCK)');
        program.push(fmt.safetyBlock || 'G90 G80 G40 G49 G17');
        program.push(fmt.units || 'G20');
        program.push('');

        // Process each operation
        let toolNum = 0;
        for (const op of operations) {
            toolNum++;

            // Tool change
            program.push(`(OP ${op.opNum || toolNum * 10}: ${op.name || op.type || 'OPERATION'})`);
            program.push(`T${toolNum} M6`);

            // Calculate real RPM from operation parameters
            const sfm = op.params?.sfm || op.sfm || 500;
            const toolDia = op.tool?.diameter || op.diameter || 0.5;
            const rpm = Math.min(
                Math.round((sfm * 12) / (Math.PI * toolDia)),
                machine?.spindle?.maxRpm || 15000
            );

            // Calculate real feed
            const ipt = op.params?.ipt || op.ipt || 0.003;
            const flutes = op.tool?.flutes || op.flutes || 4;
            const ipm = Math.round(rpm * ipt * flutes);

            program.push(`G43 H${toolNum} Z1.0`);
            program.push(`M3 S${rpm}`);
            program.push(options.coolant !== false ? 'M8' : '(DRY RUN)');
            program.push('G54');
            program.push('');

            // Generate toolpath G-code
            if (op.toolpath && op.toolpath.length > 0) {
                const toolpathGcode = this.toolpathToGcode(op.toolpath, {
                    sfm, ipt, flutes, toolDiameter: toolDia, maxRpm: rpm
                }, controller);
                program.push(...toolpathGcode);
            } else if (op.moves && op.moves.length > 0) {
                const toolpathGcode = this.toolpathToGcode(op.moves, {
                    sfm, ipt, flutes, toolDiameter: toolDia, maxRpm: rpm
                }, controller);
                program.push(...toolpathGcode);
            } else {
                // Generate basic toolpath if none provided
                program.push(`(TOOLPATH FOR ${op.type || 'OPERATION'})`);
                program.push('G0 X0 Y0');
                program.push('G0 Z0.1');
                program.push(`G1 Z-${op.params?.doc || 0.1} F${Math.round(ipm * 0.5)}`);
                program.push(`G1 X1.0 F${ipm}`);
                program.push('G0 Z1.0');
            }
            program.push('');
            program.push('G91 G28 Z0');
            program.push('M5');
            program.push('M9');
            program.push('');
        }
        // Program end
        program.push('G91 G28 Y0');
        program.push('M30');
        program.push('%');

        return program;
    },
    /**
     * Get formatting functions for controller
     */
    getFormat(controller) {
        const formats = {
            fanuc_0i: {
                coord: (v) => v.toFixed(4),
                safetyBlock: 'G90 G80 G40 G49 G17',
                units: 'G20'
            },
            fanuc_30i: {
                coord: (v) => v.toFixed(4),
                safetyBlock: 'G90 G80 G40 G49 G17',
                units: 'G20'
            },
            haas_ngc: {
                coord: (v) => v.toFixed(4),
                safetyBlock: 'G90 G80 G40 G49 G17 G00',
                units: 'G20'
            },
            siemens_840d: {
                coord: (v) => v.toFixed(3),
                safetyBlock: 'G90 G40 G60 G17',
                units: 'G710'
            },
            mazatrol: {
                coord: (v) => v.toFixed(4),
                safetyBlock: 'G90 G80 G40 G49',
                units: 'G20'
            },
            heidenhain_tnc: {
                coord: (v) => v.toFixed(3),
                safetyBlock: 'BLK FORM 0.1 Z',
                units: 'MM'
            }
        };
        const key = controller.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return formats[key] || formats.fanuc_0i;
    },
    /**
     * Get last calculated parameters
     */
    getLastParams() {
        return this.lastParams || null;
    }
}