const PRISM_EXPANDED_POST_PROCESSORS = {
    version: "2.0",

    // Hurco WinMax / MAX5 Post Processor
    hurco: {
        name: "Hurco WinMax/MAX5",
        variants: ["VMX24i", "VMX30i", "VMX42i", "VMX60Ui", "BX40i"],
        features: {
            conversational: true,
            isoMode: true,
            dualMode: true,
            highSpeedMachining: true,
            adaptiveFeed: "AFC",
            toolMeasurement: true
        },
        syntax: {
            programStart: "G90 G94 G17\nG0 G53 Z0",
            programEnd: "M30",
            toolChange: "T{tool} M6\nG43 H{tool}",
            spindleOn: "S{rpm} M3",
            spindleOff: "M5",
            coolantOn: "M8",
            coolantOff: "M9",
            rapidMove: "G0 X{x} Y{y} Z{z}",
            linearMove: "G1 X{x} Y{y} Z{z} F{feed}",
            arcCW: "G2 X{x} Y{y} I{i} J{j} F{feed}",
            arcCCW: "G3 X{x} Y{y} I{i} J{j} F{feed}",
            workOffset: "G54-G59, G110-G129",
            absoluteMode: "G90",
            incrementalMode: "G91"
        },
        cannedCycles: {
            G81: "Drill cycle",
            G82: "Spot drill / counterbore",
            G83: "Peck drill",
            G84: "Right-hand tap",
            G85: "Bore in, bore out",
            G86: "Bore in, rapid out",
            G87: "Back bore",
            G88: "Bore in, dwell, manual out",
            G89: "Bore in, dwell, bore out"
        },
        specialFeatures: {
            ultipocket: "Advanced pocket milling",
            ultithreading: "Thread milling cycle",
            surfaceFinish: "Surface finish optimization"
        }
    },
    // Okuma OSP-P300/P500 Post Processor
    okuma: {
        name: "Okuma OSP-P300/P500",
        variants: ["GENOS M460V-5AX", "MU-4000V", "MU-5000V", "MA-600H"],
        features: {
            tcpc: true,  // Tool Center Point Control
            machiningNaviMi: true,
            collisionAvoidance: true,
            thermoFriendly: true,
            syncTapping: true
        },
        syntax: {
            programStart: "G15 H1\nG90 G00 G17 G40 G49 G80",
            programEnd: "M30",
            toolChange: "T{tool}\nM06\nG43 H{tool}",
            spindleOn: "S{rpm} M03",
            spindleOff: "M05",
            coolantOn: "M08",
            coolantOff: "M09",
            rapidMove: "G00 X{x} Y{y} Z{z}",
            linearMove: "G01 X{x} Y{y} Z{z} F{feed}",
            arcCW: "G02 X{x} Y{y} R{radius} F{feed}",
            arcCCW: "G03 X{x} Y{y} R{radius} F{feed}",
            workOffset: "G15 H1-H48",
            polarCoord: "G16",
            absoluteMode: "G90",
            incrementalMode: "G91"
        },
        fiveAxisCodes: {
            tcpOn: "G43.4 H{tool}",
            tcpOff: "G49",
            rotaryInterpolation: "G43.5",
            pivotPoint: "VTLA, VTLB, VTLC variables"
        },
        variables: {
            VCAX: "Current A-axis position",
            VCBX: "Current B-axis position",
            VCCX: "Current C-axis position",
            VTLA: "Tool length A offset",
            VTLB: "Tool length B offset",
            VTLC: "Tool length C offset"
        }
    },
    // Brother CNC-C00 Post Processor
    brother: {
        name: "Brother CNC-C00",
        variants: ["SPEEDIO S300X1", "SPEEDIO S500X1", "SPEEDIO S700X1", "SPEEDIO R450X1", "SPEEDIO U500Xd1"],
        features: {
            highSpeedTapping: true,
            rapidTraverse: "50m/min",
            toolChangeTime: "0.9s chip-to-chip",
            aiContour: true
        },
        syntax: {
            programStart: "G90 G94 G17 G40 G49 G80\nG28 G91 Z0",
            programEnd: "G28 G91 Z0\nM30",
            toolChange: "T{tool} M06\nG43 H{tool}",
            spindleOn: "S{rpm} M03",
            spindleOff: "M05",
            coolantOn: "M08",
            coolantOff: "M09",
            rapidMove: "G00 X{x} Y{y} Z{z}",
            linearMove: "G01 X{x} Y{y} Z{z} F{feed}",
            highSpeedMode: "G05.1 Q1",
            normalMode: "G05.1 Q0"
        },
        highSpeedFeatures: {
            aiContour: "G05.1 Q1 R{radius}",
            nanoSmoothing: "G05 P10000",
            lookAhead: "200 blocks"
        }
    },
    // Hermle TNC640 (Heidenhain) Post Processor
    hermle: {
        name: "Heidenhain TNC640",
        variants: ["C42U", "C52U", "C62U", "C250U", "C400U"],
        features: {
            fiveAxisSimultaneous: true,
            afc: true,  // Adaptive Feed Control
            dcm: true,  // Dynamic Collision Monitoring
            kinematics: ["swivel head", "rotary table"]
        },
        syntax: {
            programStart: "BEGIN PGM {name} MM\nBLK FORM 0.1 Z X{minX} Y{minY} Z{minZ}\nBLK FORM 0.2 X{maxX} Y{maxY} Z{maxZ}",
            programEnd: "END PGM {name} MM",
            toolCall: "TOOL CALL {tool} Z S{rpm}",
            spindleOn: "M3",
            spindleOff: "M5",
            coolantOn: "M8",
            coolantOff: "M9",
            rapidMove: "L X{x} Y{y} Z{z} FMAX",
            linearMove: "L X{x} Y{y} Z{z} F{feed}",
            arcCW: "CC X{cx} Y{cy}\nC X{x} Y{y} DR-",
            arcCCW: "CC X{cx} Y{cy}\nC X{x} Y{y} DR+",
            plane: "PLANE SPATIAL SPA{a} SPB{b} SPC{c}",
            tcpMode: "FUNCTION TCPM F{feed} AXIS SPAT",
            workOffset: "CYCL DEF 247 DATUM SETTING~Q339={offset}"
        },
        cycles: {
            "200": "DRILLING",
            "201": "REAMING",
            "202": "BORING",
            "203": "UNIVERSAL DRILLING",
            "204": "BACK BORING",
            "205": "UNIVERSAL PECK DRILLING",
            "206": "TAPPING NEW",
            "207": "RIGID TAPPING",
            "208": "BORE MILLING",
            "220": "PATTERN CIRCLE",
            "221": "PATTERN LINES",
            "230": "MILLING CIRCULAR STUDS",
            "251": "RECTANGULAR POCKET",
            "252": "CIRCULAR POCKET",
            "253": "SLOT MILLING",
            "254": "CIRCULAR SLOT"
        }
    },
    // Generate post-processed code
    generateCode: function(controller, operations) {
        const post = this[controller.toLowerCase()];
        if (!post) return { error: "Unknown controller: " + controller };

        let code = [];
        code.push(post.syntax.programStart);

        for (const op of operations) {
            switch(op.type) {
                case 'toolChange':
                    code.push(post.syntax.toolChange.replace('{tool}', op.tool));
                    break;
                case 'spindleOn':
                    code.push(post.syntax.spindleOn.replace('{rpm}', op.rpm));
                    break;
                case 'rapid':
                    let rapid = post.syntax.rapidMove;
                    rapid = rapid.replace('{x}', op.x || '');
                    rapid = rapid.replace('{y}', op.y || '');
                    rapid = rapid.replace('{z}', op.z || '');
                    code.push(rapid.replace(/\s+[XYZ](?=\s|$)/g, '').trim());
                    break;
                case 'linear':
                    let linear = post.syntax.linearMove;
                    linear = linear.replace('{x}', op.x || '');
                    linear = linear.replace('{y}', op.y || '');
                    linear = linear.replace('{z}', op.z || '');
                    linear = linear.replace('{feed}', op.feed);
                    code.push(linear.replace(/\s+[XYZ](?=\s|$)/g, '').trim());
                    break;
            }
        }
        code.push(post.syntax.programEnd);
        return code.join('\n');
    }
}