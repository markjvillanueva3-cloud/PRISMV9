// POST_PROCESSOR_ENGINE_V2 - Lines 547767-548061 (295 lines) - Post processor engine\n\nconst POST_PROCESSOR_ENGINE_V2 = {
    name: 'POST_PROCESSOR_ENGINE_V2',
    version: '3.0.0',
    description: 'Advanced post processor with controller-specific NC code generation',

    // Supported controllers with their specifics
    controllers: {
        fanuc: {
            name: 'Fanuc',
            variants: ['0i', '16i', '18i', '21i', '30i', '31i', '32i'],
            programFormat: {
                start: '%',
                programNumber: 'O',
                end: '%',
                blockNumber: 'N',
                comment: '()'
            },
            decimals: { linear: 4, rotary: 3, feed: 1 },
            modalGroups: {
                motion: ['G00', 'G01', 'G02', 'G03'],
                plane: ['G17', 'G18', 'G19'],
                absolute: ['G90', 'G91'],
                units: ['G20', 'G21'],
                compensation: ['G40', 'G41', 'G42'],
                lengthOffset: ['G43', 'G44', 'G49'],
                cycles: ['G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89']
            },
            fiveAxis: {
                tcp: 'G43.4',
                tcpOff: 'G49',
                tiltedPlane: 'G68.2',
                tiltedPlaneOff: 'G69'
            }
        },
        siemens: {
            name: 'Siemens SINUMERIK',
            variants: ['808D', '828D', '840D', '840D sl'],
            programFormat: {
                start: '; Program start',
                programNumber: null,
                end: 'M30',
                blockNumber: 'N',
                comment: ';'
            },
            decimals: { linear: 3, rotary: 3, feed: 0 },
            modalGroups: {
                motion: ['G0', 'G1', 'G2', 'G3'],
                plane: ['G17', 'G18', 'G19'],
                absolute: ['G90', 'G91'],
                units: ['G70', 'G71'],
                compensation: ['G40', 'G41', 'G42']
            },
            fiveAxis: {
                tcp: 'TRAORI',
                tcpOff: 'TRAFOOF',
                orientation: ['ORIAXES', 'ORIVECT', 'ORIPATH'],
                swivel: 'CYCLE800'
            },
            specialCodes: {
                compressor: 'COMPCAD',
                smoothing: 'G642',
                tolerance: '_OVR[1]'
            }
        },
        hurco: {
            name: 'Hurco WinMax',
            variants: ['WinMax', 'Max5'],
            programFormat: {
                start: '',
                programNumber: null,
                end: 'M30',
                blockNumber: 'N',
                comment: '()'
            },
            decimals: { linear: 4, rotary: 3, feed: 1 },
            fiveAxis: {
                tcp: 'DWO ON',
                tcpOff: 'DWO OFF',
                tiltedPlane: 'G68.2'
            },
            special: {
                SFQ: 'Surface Finish Quality parameter',
                adaptiveFeed: 'Supported'
            }
        },
        mazak: {
            name: 'Mazak Mazatrol',
            variants: ['Matrix', 'Matrix2', 'SmoothG', 'SmoothAi'],
            programFormat: {
                start: '%',
                programNumber: 'O',
                end: '%',
                blockNumber: 'N',
                comment: '()'
            },
            decimals: { linear: 4, rotary: 3, feed: 1 },
            fiveAxis: {
                tcp: 'G43.4',
                tcpOff: 'G49',
                smoothing: 'G61.1'
            }
        },
        haas: {
            name: 'Haas',
            variants: ['NGC', 'Classic'],
            programFormat: {
                start: '%',
                programNumber: 'O',
                end: '%',
                blockNumber: 'N',
                comment: '()'
            },
            decimals: { linear: 4, rotary: 3, feed: 1 },
            fiveAxis: {
                tcp: 'G234',
                tcpOff: 'G49',
                dynamicWorkOffset: 'DWO',
                tiltedPlane: 'G68.2'
            },
            settings: {
                setting144: 'Auto TCPC Enable',
                setting145: 'TCPC 5-axis Mode'
            }
        },
        brother: {
            name: 'Brother CNC-C00',
            variants: ['CNC-C00'],
            programFormat: {
                start: '%',
                programNumber: 'O',
                end: '%',
                blockNumber: 'N',
                comment: '()'
            },
            decimals: { linear: 4, rotary: 3, feed: 1 },
            fiveAxis: {
                tcp: 'G43.4',
                tcpOff: 'G49',
                tiltedPlane: 'G68.2'
            }
        }
    },
    // Output formatting options
    formatting: {
        blockNumberIncrement: 10,
        blockNumberStart: 10,
        useBlockNumbers: true,
        useSpaces: true,
        uppercase: true,
        lineEnding: '\n',
        maxLineLength: 256,
        modalOutput: true, // Don't repeat unchanged modal codes
        minimumOutput: true // Remove redundant codes
    },
    // Safety block configuration
    safetyBlock: {
        standard: ['G17', 'G40', 'G49', 'G80', 'G90'],
        fanuc: ['G17', 'G20', 'G40', 'G49', 'G80', 'G90'],
        siemens: ['G17', 'G40', 'G90', 'TRAFOOF'],
        description: 'Ensures machine is in known safe state at program start'
    },
    // Tool change sequences
    toolChange: {
        standard: `
G28 G91 Z0          ; Return Z to home
M5                   ; Stop spindle
M9                   ; Coolant off
T{tool} M6           ; Tool change
G43 H{tool}          ; Apply length offset
S{rpm} M3            ; Start spindle`,
        siemens: `
SUPA G0 Z=R11       ; Safe Z retract
M5                  ; Stop spindle
M9                  ; Coolant off
T{tool}             ; Prepare tool
M6                  ; Execute change
D{tool}             ; Activate offset
S{rpm} M3           ; Start spindle`,
        minimumRetract: true,
        safeZ: 'G28' // or specific Z value
    },
    // Cycle output templates
    cycleTemplates: {
        drill: {
            fanuc: 'G{cycle} X{x} Y{y} Z{z} R{r} F{f}',
            siemens: 'CYCLE81({rtp},{rfp},{sdis},{dp})',
            hurco: 'G{cycle} X{x} Y{y} Z{z} R{r} F{f}'
        },
        peckDrill: {
            fanuc: 'G83 X{x} Y{y} Z{z} R{r} Q{peck} F{f}',
            siemens: 'CYCLE83({rtp},{rfp},{sdis},{dp},{dpr},{dtb},{dts},{frf},{vari})',
            hurco: 'G83 X{x} Y{y} Z{z} R{r} Q{peck} F{f}'
        },
        tap: {
            fanuc: 'G84 X{x} Y{y} Z{z} R{r} F{f}',
            siemens: 'CYCLE84({rtp},{rfp},{sdis},{dp},{dtb},{sdr},{enc},{mpit})',
            hurco: 'G84 X{x} Y{y} Z{z} R{r} F{f}'
        }
    },
    // Methods
    createPost: function(controller, options = {}) {
        const config = this.controllers[controller];
        if (!config) {
            return { error: `Unknown controller: ${controller}` };
        }
        return {
            controller: controller,
            config: config,
            options: { ...this.formatting, ...options },
            blockNumber: options.blockNumberStart || this.formatting.blockNumberStart,

            // Format a single NC block
            formatBlock: function(code, comment = null) {
                let block = '';
                if (this.options.useBlockNumbers) {
                    block += `N${this.blockNumber} `;
                    this.blockNumber += this.options.blockNumberIncrement;
                }
                block += this.options.uppercase ? code.toUpperCase() : code;
                if (comment) {
                    block += ` ${config.programFormat.comment === '()' ? `(${comment})` : `; ${comment}`}`;
                }
                return block;
            },
            // Generate program header
            header: function(programName, programNumber = '0001') {
                let header = [];
                if (config.programFormat.start) {
                    header.push(config.programFormat.start);
                }
                if (config.programFormat.programNumber) {
                    header.push(`${config.programFormat.programNumber}${programNumber}`);
                }
                header.push(this.formatBlock('', programName));
                return header.join('\n');
            },
            // Generate safety block
            safety: function() {
                const codes = POST_PROCESSOR_ENGINE_V2.safetyBlock[controller] ||
                              POST_PROCESSOR_ENGINE_V2.safetyBlock.standard;
                return this.formatBlock(codes.join(' '), 'Safety line');
            },
            // Generate footer
            footer: function() {
                let footer = [];
                footer.push(this.formatBlock('M5', 'Spindle off'));
                footer.push(this.formatBlock('M9', 'Coolant off'));
                footer.push(this.formatBlock('G28 G91 Z0', 'Return Z home'));
                footer.push(this.formatBlock('G28 X0 Y0', 'Return XY home'));
                footer.push(this.formatBlock('M30', 'Program end'));
                if (config.programFormat.end === '%') {
                    footer.push('%');
                }
                return footer.join('\n');
            }
        };
    },
    formatCoordinate: function(value, controller, type = 'linear') {
        const config = this.controllers[controller];
        const decimals = config ? config.decimals[type] : 4;
        return value.toFixed(decimals);
    },
    generateToolpath: function(toolpath, controller, options = {}) {
        const post = this.createPost(controller, options);
        let output = [];

        // Header
        output.push(post.header(options.programName || 'PRISM_PROGRAM', options.programNumber));

        // Safety
        output.push(post.safety());

        // Process each move
        toolpath.forEach(move => {
            let block = '';

            if (move.type === 'rapid') {
                block = `G0 X${this.formatCoordinate(move.x, controller)} Y${this.formatCoordinate(move.y, controller)} Z${this.formatCoordinate(move.z, controller)}`;
            } else if (move.type === 'linear') {
                block = `G1 X${this.formatCoordinate(move.x, controller)} Y${this.formatCoordinate(move.y, controller)} Z${this.formatCoordinate(move.z, controller)} F${move.feed}`;
            } else if (move.type === 'arc') {
                const g = move.direction === 'cw' ? 'G2' : 'G3';
                block = `${g} X${this.formatCoordinate(move.x, controller)} Y${this.formatCoordinate(move.y, controller)} I${this.formatCoordinate(move.i, controller)} J${this.formatCoordinate(move.j, controller)} F${move.feed}`;
            }
            if (block) {
                output.push(post.formatBlock(block, move.comment));
            }
        });

        // Footer
        output.push(post.footer());

        return output.join('\n');
    }
};
