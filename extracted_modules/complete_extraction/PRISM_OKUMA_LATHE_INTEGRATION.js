const PRISM_OKUMA_LATHE_INTEGRATION = {
    version: "1.0",

    // Get appropriate G-code information
    getGCode: function(code) {
        const db = PRISM_OKUMA_LATHE_GCODE_DATABASE;
        for (let category in db) {
            if (db[category][code]) return db[category][code];
        }
        return null;
    },
    // Get M-code information
    getMCode: function(code) {
        const db = PRISM_OKUMA_LATHE_MCODE_DATABASE;
        for (let category in db) {
            if (db[category][code]) return db[category][code];
        }
        return null;
    },
    // Generate LAP cycle template
    generateLAPTemplate: function(cycleType, params) {
        const engine = PRISM_LAP_CYCLE_ENGINE;
        if (!engine.cycleTypes[cycleType]) return null;

        let template = {
            cycle: cycleType,
            format: engine.cycleTypes[cycleType].format,
            params: params || {},
            contourStart: cycleType === 'G86' ? 'G82' : 'G81',
            contourEnd: 'G80'
        };
        return template;
    },
    // Calculate threading parameters
    calculateThreading: function(tpi, majorDia, minorDia, material) {
        const threadHeight = (majorDia - minorDia) / 2;
        const lead = 1 / tpi;

        // Suggest infeed pattern based on material
        let infeedPattern = 'M32'; // default
        if (material === 'stainless' || material === 'titanium') {
            infeedPattern = 'M33'; // zig-zag for work hardening materials
        }
        return {
            H: threadHeight * 2, // diametrical
            F: lead,
            J: tpi,
            suggestedInfeed: infeedPattern,
            suggestedDepthPattern: 'M74' // constant + finish
        };
    },
    // Get TNR P-code for tool orientation
    getTNRPCode: function(toolType, position) {
        const pCodes = PRISM_TOOL_NOSE_RADIUS_COMPENSATION_ENGINE.pCodeOrientation.codes;
        // Return appropriate P-code based on tool type and position
        const mapping = {
            'OD_turn_right': 'P3',
            'OD_turn_left': 'P2',
            'ID_turn': 'P4',
            'OD_groove': 'P6',
            'ID_groove': 'P8',
            'face_groove_right': 'P5',
            'face_groove_left': 'P7',
            'back_bore': 'P1'
        };
        return mapping[toolType + '_' + position] || 'P0';
    },
    // Generate graphics commands for blank
    generateBlankGraphics: function(length, diameter, holeId = 0, zeroAtLeft = true) {
        const ref = zeroAtLeft ? 'LC' : 'RC';
        let commands = ['CLEAR', 'DEF WORK'];

        // Convert to graphics units (0.1 inch in inch mode)
        const l = Math.round(length * 10);
        const d = Math.round(diameter * 10);

        commands.push(`PS ${ref},[0,0],[${l},${d}]`);

        if (holeId > 0) {
            const h = Math.round(holeId * 10);
            commands.push(`PS ${ref},[0,0],[${l},${h}],0`);
        }
        commands.push('END', 'DRAW');
        return commands.join('\n');
    }
}