const PRISM_UNIFIED_ALARM_SYSTEM = {
    version: "1.0",
    description: "Consolidated alarm database for all CNC controllers",

    // Fanuc Alarms (Complete)
    fanuc: {
        systemAlarms: {
            "000": { message: "PLEASE TURN OFF POWER", type: "system", severity: "critical" },
            "001": { message: "TH ALARM (ROM)", type: "system", severity: "critical" },
            "002": { message: "TV PARITY ALARM", type: "system", severity: "critical" },
            "003": { message: "WAIT FOR INPUT", type: "system", severity: "warning" },
            "004": { message: "OVER HEAT (CPU)", type: "system", severity: "critical" },
            "010": { message: "PARAMETER ENABLED", type: "system", severity: "info" },
            "011": { message: "TH ALARM (DRAM)", type: "system", severity: "critical" },
            "012": { message: "TH ALARM (SRAM)", type: "system", severity: "critical" },
            "015": { message: "FSSB ALARM (INIT)", type: "system", severity: "critical" },
            "020": { message: "SERVO ALARM (1-4)", type: "servo", severity: "critical" },
            "021": { message: "SERVO ALARM (5-8)", type: "servo", severity: "critical" },
            "030": { message: "CPU INTERRUPT", type: "system", severity: "critical" },
            "031": { message: "PMS RAM ERROR", type: "system", severity: "critical" },
            "035": { message: "ROM PARITY", type: "system", severity: "critical" }
        },
        programAlarms: {
            "PS0000": { message: "PLEASE TURN OFF POWER", type: "program", severity: "critical" },
            "PS0001": { message: "TH PARITY ALARM", type: "program", severity: "critical" },
            "PS0002": { message: "TV PARITY ALARM", type: "program", severity: "critical" },
            "PS0003": { message: "TOO MANY DIGITS", type: "program", severity: "warning" },
            "PS0004": { message: "ADDRESS NOT FOUND", type: "program", severity: "warning" },
            "PS0005": { message: "NO DATA AFTER ADDRESS", type: "program", severity: "warning" },
            "PS0006": { message: "SIGN ERROR", type: "program", severity: "warning" },
            "PS0007": { message: "IMPROPER G CODE", type: "program", severity: "warning" },
            "PS0010": { message: "IMPROPER G-CODE", type: "program", severity: "warning" },
            "PS0011": { message: "G-CODE NOT ALLOWED", type: "program", severity: "warning" },
            "PS0014": { message: "RETURN TO REF POINT", type: "program", severity: "warning" },
            "PS0020": { message: "TOO MANY DIGITS", type: "program", severity: "warning" },
            "PS0029": { message: "NEGATIVE R COMMAND IN G74/84", type: "program", severity: "warning" },
            "PS0030": { message: "ILLEGAL INCREMENT", type: "program", severity: "warning" },
            "PS0031": { message: "ILLEGAL DECREMENT", type: "program", severity: "warning" },
            "PS0033": { message: "NO SEQNO FOR SKIP", type: "program", severity: "warning" },
            "PS0034": { message: "SEQUENCE NOT FOUND", type: "program", severity: "warning" },
            "PS0035": { message: "SEQUENCE NUMBER ERROR", type: "program", severity: "warning" },
            "PS0037": { message: "CAN NOT CALCULATE", type: "program", severity: "warning" },
            "PS0038": { message: "G43/G44 NOT G17/G18/G19", type: "program", severity: "warning" },
            "PS0041": { message: "CRC ERROR", type: "program", severity: "warning" },
            "PS0047": { message: "TOO SMALL ARC RADIUS", type: "program", severity: "warning" },
            "PS0050": { message: "CHF/CNR ERROR", type: "program", severity: "warning" },
            "PS0073": { message: "G10 INVALID AXIS", type: "program", severity: "warning" },
            "PS0074": { message: "G10 INVALID P CODE", type: "program", severity: "warning" },
            "PS0076": { message: "G-CODE NOT IN GROUP 01", type: "program", severity: "warning" },
            "PS0077": { message: "DEC POINT NOT ALLOWED", type: "program", severity: "warning" },
            "PS0078": { message: "NO SUBPROG", type: "program", severity: "warning" },
            "PS0079": { message: "REPEAT SUBPROG ERROR", type: "program", severity: "warning" },
            "PS0082": { message: "RETURN ERROR IN SUB", type: "program", severity: "warning" },
            "PS0085": { message: "MACRO NUMBER ERROR", type: "program", severity: "warning" },
            "PS0086": { message: "MACRO ILLEGAL ADDRESS", type: "program", severity: "warning" },
            "PS0100": { message: "ILLEGAL WORK OFFSET", type: "program", severity: "warning" },
            "PS0101": { message: "ILLEGAL P COMMAND", type: "program", severity: "warning" },
            "PS0111": { message: "G72.1/G72.2 ERROR", type: "program", severity: "warning" },
            "PS0115": { message: "TOO MANY NESTS", type: "program", severity: "warning" },
            "PS0118": { message: "PROGRAM PROTECT ALARM", type: "program", severity: "critical" },
            "PS0175": { message: "ILLEGAL PLANE COMMAND", type: "program", severity: "warning" },
            "PS5001": { message: "OVER TRAVEL +X", type: "position", severity: "critical" },
            "PS5002": { message: "OVER TRAVEL -X", type: "position", severity: "critical" },
            "PS5003": { message: "OVER TRAVEL +Y", type: "position", severity: "critical" },
            "PS5004": { message: "OVER TRAVEL -Y", type: "position", severity: "critical" },
            "PS5005": { message: "OVER TRAVEL +Z", type: "position", severity: "critical" },
            "PS5006": { message: "OVER TRAVEL -Z", type: "position", severity: "critical" }
        },
        servoAlarms: {
            "SV0401": { message: "VRDY OFF ALARM (AMP1)", type: "servo", severity: "critical" },
            "SV0402": { message: "VRDY OFF ALARM (AMP2)", type: "servo", severity: "critical" },
            "SV0403": { message: "VRDY OFF ALARM (AMP3)", type: "servo", severity: "critical" },
            "SV0404": { message: "VRDY OFF ALARM (AMP4)", type: "servo", severity: "critical" },
            "SV0410": { message: "EXCESSIVE ERROR", type: "servo", severity: "critical" },
            "SV0411": { message: "EXCESSIVE ERROR 2", type: "servo", severity: "critical" },
            "SV0413": { message: "LSI OVERFLOW", type: "servo", severity: "critical" },
            "SV0414": { message: "DIGITAL SERVO ALARM", type: "servo", severity: "critical" },
            "SV0415": { message: "UNMATCHED SERVO ALARM", type: "servo", severity: "critical" },
            "SV0417": { message: "DIGITAL SERVO PARAMETER", type: "servo", severity: "warning" },
            "SV0420": { message: "SYNC ERROR ALARM", type: "servo", severity: "critical" },
            "SV0421": { message: "SYNC ERROR EXCESS", type: "servo", severity: "critical" },
            "SV0430": { message: "SV MOTOR OVERHEAT", type: "servo", severity: "critical" },
            "SV0432": { message: "SOFTWARE DISCONNECT", type: "servo", severity: "critical" },
            "SV0433": { message: "FEEDBACK DISCONNECT", type: "servo", severity: "critical" },
            "SV0434": { message: "AMP OVERHEAT", type: "servo", severity: "critical" },
            "SV0436": { message: "POWER SUPPLY FAIL", type: "servo", severity: "critical" },
            "SV0438": { message: "A/D CONVERTER ERROR", type: "servo", severity: "critical" }
        }
    },
    // Mazak Alarms
    mazak: {
        systemAlarms: {
            "300": { message: "X-AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "301": { message: "Y-AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "302": { message: "Z-AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "303": { message: "4TH AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "304": { message: "5TH AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "310": { message: "SPINDLE ALARM", type: "spindle", severity: "critical" },
            "311": { message: "SPINDLE OVERHEAT", type: "spindle", severity: "critical" },
            "312": { message: "SPINDLE SPEED ERROR", type: "spindle", severity: "warning" },
            "400": { message: "SYSTEM ROM ERROR", type: "system", severity: "critical" },
            "401": { message: "SYSTEM RAM ERROR", type: "system", severity: "critical" },
            "500": { message: "PROGRAM ERROR", type: "program", severity: "warning" },
            "501": { message: "PROGRAM NUMBER ERROR", type: "program", severity: "warning" }
        },
        mazatrolAlarms: {
            "MC0100": { message: "IMPROPER UNIT NO.", type: "mazatrol", severity: "warning" },
            "MC0101": { message: "INCORRECT SEQUENCE", type: "mazatrol", severity: "warning" },
            "MC0102": { message: "UNIT DATA ERROR", type: "mazatrol", severity: "warning" },
            "MC0200": { message: "TOOL NOT IN MAGAZINE", type: "tool", severity: "warning" },
            "MC0201": { message: "TOOL IN USE", type: "tool", severity: "warning" },
            "MC0202": { message: "TOOL LIFE EXPIRED", type: "tool", severity: "warning" }
        }
    },
    // Haas Alarms
    haas: {
        alarms: {
            "100": { message: "SERVO OVERLOAD", type: "servo", severity: "critical" },
            "101": { message: "SPINDLE OVERLOAD", type: "spindle", severity: "critical" },
            "102": { message: "OVER TRAVEL X+", type: "position", severity: "critical" },
            "103": { message: "OVER TRAVEL X-", type: "position", severity: "critical" },
            "104": { message: "OVER TRAVEL Y+", type: "position", severity: "critical" },
            "105": { message: "OVER TRAVEL Y-", type: "position", severity: "critical" },
            "106": { message: "OVER TRAVEL Z+", type: "position", severity: "critical" },
            "107": { message: "OVER TRAVEL Z-", type: "position", severity: "critical" },
            "108": { message: "OVER TRAVEL A+", type: "position", severity: "critical" },
            "109": { message: "OVER TRAVEL A-", type: "position", severity: "critical" },
            "152": { message: "SPINDLE FAULT", type: "spindle", severity: "critical" },
            "157": { message: "COOLANT LOW", type: "coolant", severity: "warning" },
            "200": { message: "PROGRAM ERROR", type: "program", severity: "warning" },
            "201": { message: "INVALID G-CODE", type: "program", severity: "warning" },
            "202": { message: "INVALID M-CODE", type: "program", severity: "warning" },
            "203": { message: "TOO MANY M-CODES", type: "program", severity: "warning" },
            "204": { message: "MISSING DATA", type: "program", severity: "warning" },
            "205": { message: "TOO MUCH DATA", type: "program", severity: "warning" },
            "302": { message: "TOOL CHANGER FAULT", type: "tool", severity: "critical" },
            "303": { message: "TOOL NOT FOUND", type: "tool", severity: "warning" }
        }
    },
    // Okuma Alarms
    okuma: {
        alarms: {
            "1001": { message: "X-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1002": { message: "Y-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1003": { message: "Z-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1004": { message: "A-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1005": { message: "C-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "2001": { message: "SPINDLE ALARM", type: "spindle", severity: "critical" },
            "2002": { message: "SPINDLE OVERHEAT", type: "spindle", severity: "critical" },
            "3001": { message: "NC DATA ERROR", type: "program", severity: "warning" },
            "3002": { message: "G-CODE ERROR", type: "program", severity: "warning" },
            "3003": { message: "M-CODE ERROR", type: "program", severity: "warning" },
            "4001": { message: "ATC ERROR", type: "tool", severity: "critical" },
            "4002": { message: "TOOL NOT FOUND", type: "tool", severity: "warning" }
        }
    },
    // Siemens Alarms
    siemens: {
        alarms: {
            "10000": { message: "PROGRAM ERROR", type: "program", severity: "warning" },
            "10001": { message: "SYNTAX ERROR", type: "program", severity: "warning" },
            "10002": { message: "INVALID ADDRESS", type: "program", severity: "warning" },
            "21000": { message: "SERVO FAULT X", type: "servo", severity: "critical" },
            "21001": { message: "SERVO FAULT Y", type: "servo", severity: "critical" },
            "21002": { message: "SERVO FAULT Z", type: "servo", severity: "critical" },
            "22000": { message: "SPINDLE FAULT", type: "spindle", severity: "critical" }
        }
    },
    // Query function
    getAlarm: function(controller, code) {
        const ctrlLower = controller.toLowerCase();
        if (this[ctrlLower]) {
            for (const category of Object.values(this[ctrlLower])) {
                if (category[code]) return category[code];
            }
        }
        return { message: "Unknown alarm", type: "unknown", severity: "warning" };
    },
    // Search function
    searchAlarms: function(keyword) {
        const results = [];
        const keyLower = keyword.toLowerCase();

        for (const [controller, categories] of Object.entries(this)) {
            if (typeof categories !== 'object') continue;
            for (const [category, alarms] of Object.entries(categories)) {
                if (typeof alarms !== 'object') continue;
                for (const [code, alarm] of Object.entries(alarms)) {
                    if (alarm.message && alarm.message.toLowerCase().includes(keyLower)) {
                        results.push({ controller, category, code, ...alarm });
                    }
                }
            }
        }
        return results;
    }
}