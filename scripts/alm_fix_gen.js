const fs = require('fs');
const path = require('path');

const ALARM_DIR = 'C:\\PRISM\\extracted\\controllers\\alarms';

// Fix procedure templates by category
const FIX_TEMPLATES = {
    SERVO: {
        overload: [
            { step: 1, action: "Reduce feed override to 50% and retry", skill_level: "operator" },
            { step: 2, action: "Check axis for mechanical binding — manually jog each axis slowly", skill_level: "operator" },
            { step: 3, action: "Inspect servo motor cables for damage, loose connections", skill_level: "maintenance" },
            { step: 4, action: "Check servo amplifier LEDs for fault codes", skill_level: "maintenance" },
            { step: 5, action: "Measure motor insulation resistance (should be >1 MΩ)", skill_level: "maintenance" },
            { step: 6, action: "Verify servo parameters match motor specs (Ke, Kt, inertia ratio)", skill_level: "engineer" }
        ],
        position: [
            { step: 1, action: "Home the affected axis", skill_level: "operator" },
            { step: 2, action: "Check for chip buildup on linear scales or encoder", skill_level: "operator" },
            { step: 3, action: "Clean scale read head and verify gap distance", skill_level: "maintenance" },
            { step: 4, action: "Inspect coupling between motor and ballscrew", skill_level: "maintenance" },
            { step: 5, action: "Check ballscrew backlash with dial indicator", skill_level: "maintenance" },
            { step: 6, action: "Verify encoder signals with oscilloscope (clean sine/cosine)", skill_level: "engineer" }
        ],
        fuse: [
            { step: 1, action: "Power off machine completely and lock out", safety_warning: "ELECTRICAL HAZARD", skill_level: "maintenance" },
            { step: 2, action: "Locate and replace blown fuse with correct rating", skill_level: "maintenance" },
            { step: 3, action: "Check motor insulation resistance before re-energizing", skill_level: "maintenance" },
            { step: 4, action: "If fuse blows again, disconnect motor and test drive separately", skill_level: "engineer" },
            { step: 5, action: "Inspect motor windings for shorts — replace motor if resistance is low", skill_level: "engineer" }
        ],
        communication: [
            { step: 1, action: "Power cycle the machine", skill_level: "operator" },
            { step: 2, action: "Check servo drive communication cables (FSSB/EtherCAT)", skill_level: "maintenance" },
            { step: 3, action: "Reseat all servo drive connections", skill_level: "maintenance" },
            { step: 4, action: "Replace communication cable if damaged", skill_level: "maintenance" },
            { step: 5, action: "Swap servo drive with known good unit to isolate fault", skill_level: "engineer" }
        ]
    },
    SPINDLE: {
        overload: [
            { step: 1, action: "Reduce cutting parameters — lower speed and/or feed rate", skill_level: "operator" },
            { step: 2, action: "Check tool condition — replace dull or chipped tool", skill_level: "operator" },
            { step: 3, action: "Verify spindle oil level and cooling system", skill_level: "operator" },
            { step: 4, action: "Monitor spindle bearing temperature during test cut", skill_level: "maintenance" },
            { step: 5, action: "Check spindle drive parameters and motor current waveform", skill_level: "engineer" }
        ],
        orientation: [
            { step: 1, action: "Retry spindle orientation (M19)", skill_level: "operator" },
            { step: 2, action: "Clean spindle orientation sensor and proximity switch", skill_level: "maintenance" },
            { step: 3, action: "Verify orientation sensor signal in diagnostics screen", skill_level: "maintenance" },
            { step: 4, action: "Adjust orientation sensor gap (typically 0.5-1.0mm)", skill_level: "maintenance" },
            { step: 5, action: "Recalibrate spindle orientation position parameter", skill_level: "engineer" }
        ],
        speed: [
            { step: 1, action: "Verify programmed speed is within machine capability", skill_level: "operator" },
            { step: 2, action: "Check spindle belt tension and condition", skill_level: "maintenance" },
            { step: 3, action: "Verify gear shift mechanism operation (if applicable)", skill_level: "maintenance" },
            { step: 4, action: "Check spindle motor encoder/resolver signals", skill_level: "engineer" }
        ]
    },
    ATC: {
        general: [
            { step: 1, action: "Press reset and retry tool change", skill_level: "operator" },
            { step: 2, action: "Open ATC cover and check for jammed tools", safety_warning: "Ensure spindle is stopped", skill_level: "operator" },
            { step: 3, action: "Clean tool change arm, gripper, and carousel fingers", skill_level: "maintenance" },
            { step: 4, action: "Verify all ATC proximity sensors in diagnostics", skill_level: "maintenance" },
            { step: 5, action: "Check ATC air pressure (typically 5-6 bar required)", skill_level: "maintenance" },
            { step: 6, action: "Re-teach tool change positions if needed", skill_level: "engineer" }
        ]
    },
    PROGRAM: {
        general: [
            { step: 1, action: "Check the flagged line in the program for syntax errors", skill_level: "operator" },
            { step: 2, action: "Verify G-code and M-code compatibility with controller", skill_level: "operator" },
            { step: 3, action: "Check for missing required codes (tool number, speed, etc.)", skill_level: "operator" }
        ]
    },
    SAFETY: {
        door: [
            { step: 1, action: "Close all safety doors and guards completely", skill_level: "operator" },
            { step: 2, action: "Check door interlock switches for proper engagement", skill_level: "maintenance" },
            { step: 3, action: "Clean interlock switch contacts and mating surfaces", skill_level: "maintenance" },
            { step: 4, action: "Replace faulty interlock switch", skill_level: "maintenance" }
        ],
        estop: [
            { step: 1, action: "Release all emergency stop buttons (twist to release)", skill_level: "operator" },
            { step: 2, action: "Check E-stop circuit continuity", skill_level: "maintenance" },
            { step: 3, action: "Verify safety relay module status LEDs", skill_level: "maintenance" }
        ]
    },
    SYSTEM: {
        battery: [
            { step: 1, action: "Replace encoder/memory backup batteries immediately", safety_warning: "Do NOT power off until batteries replaced to avoid position loss", skill_level: "maintenance" },
            { step: 2, action: "Verify absolute position is retained after battery replacement", skill_level: "maintenance" },
            { step: 3, action: "If position lost, perform reference point return on all axes", skill_level: "operator" }
        ],
        temperature: [
            { step: 1, action: "Check machine ambient temperature (should be 5-40°C)", skill_level: "operator" },
            { step: 2, action: "Verify cooling unit operation and coolant level", skill_level: "maintenance" },
            { step: 3, action: "Clean heat exchanger fins and cooling fans", skill_level: "maintenance" },
            { step: 4, action: "Check temperature sensor readings in diagnostics", skill_level: "maintenance" }
        ],
        general: [
            { step: 1, action: "Power cycle the machine", skill_level: "operator" },
            { step: 2, action: "Check diagnostic screen for additional error details", skill_level: "operator" },
            { step: 3, action: "Contact machine manufacturer if error persists", skill_level: "engineer" }
        ]
    },
    HYDRAULIC: {
        general: [
            { step: 1, action: "Check hydraulic oil level and top up if low", skill_level: "operator" },
            { step: 2, action: "Inspect for hydraulic leaks around fittings and cylinders", skill_level: "maintenance" },
            { step: 3, action: "Check hydraulic pressure gauge reading", skill_level: "maintenance" },
            { step: 4, action: "Replace hydraulic filter if pressure drop is high", skill_level: "maintenance" },
            { step: 5, action: "Inspect hydraulic pump for noise or overheating", skill_level: "maintenance" }
        ]
    },
    COOLANT: {
        general: [
            { step: 1, action: "Check coolant tank level and refill if needed", skill_level: "operator" },
            { step: 2, action: "Clean coolant pump strainer/filter", skill_level: "operator" },
            { step: 3, action: "Check coolant pump operation and pressure", skill_level: "maintenance" },
            { step: 4, action: "Verify flow sensor and level sensor signals", skill_level: "maintenance" }
        ]
    },
    LUBRICATION: {
        general: [
            { step: 1, action: "Check way lube oil level and refill if needed", skill_level: "operator" },
            { step: 2, action: "Verify lube pump operation (check for pulse indicator)", skill_level: "operator" },
            { step: 3, action: "Check lube distribution manifold for blockages", skill_level: "maintenance" },
            { step: 4, action: "Replace lube pump if not cycling properly", skill_level: "maintenance" }
        ]
    }
};

function selectFixProcedure(alarm) {
    const cat = (alarm.category || '').toUpperCase();
    const name = (alarm.name || alarm.alarm_name || '').toLowerCase();
    const desc = (alarm.description || '').toLowerCase();
    const combined = name + ' ' + desc;
    
    const templates = FIX_TEMPLATES[cat];
    if (!templates) return FIX_TEMPLATES.SYSTEM?.general || null;
    
    // Match specific sub-type
    if (cat === 'SERVO') {
        if (combined.includes('fuse')) return templates.fuse;
        if (combined.includes('position') || combined.includes('following') || combined.includes('drift')) return templates.position;
        if (combined.includes('communication') || combined.includes('fssb') || combined.includes('detach')) return templates.communication;
        return templates.overload; // default servo
    }
    if (cat === 'SPINDLE') {
        if (combined.includes('orient') || combined.includes('m19')) return templates.orientation;
        if (combined.includes('speed') || combined.includes('rpm')) return templates.speed;
        return templates.overload;
    }
    if (cat === 'SAFETY') {
        if (combined.includes('door') || combined.includes('guard') || combined.includes('interlock')) return templates.door;
        if (combined.includes('stop') || combined.includes('e-stop') || combined.includes('emergency')) return templates.estop;
        return templates.door;
    }
    if (cat === 'SYSTEM') {
        if (combined.includes('battery') || combined.includes('backup')) return templates.battery;
        if (combined.includes('temperature') || combined.includes('overheat') || combined.includes('thermal')) return templates.temperature;
        return templates.general;
    }
    
    return templates.general || templates[Object.keys(templates)[0]] || FIX_TEMPLATES.SYSTEM.general;
}

let totalFixed = 0;
const masterFiles = fs.readdirSync(ALARM_DIR).filter(f => f.endsWith('_MASTER.json'));

for (const file of masterFiles) {
    const fp = path.join(ALARM_DIR, file);
    const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
    let fixed = 0;
    
    for (const alarm of json.alarms) {
        if (alarm.fix_procedures && alarm.fix_procedures.length > 0) continue;
        
        const proc = selectFixProcedure(alarm);
        if (proc) {
            alarm.fix_procedures = proc;
            fixed++;
        }
    }
    
    if (fixed > 0) {
        json.metadata.fix_procedures_generated = fixed;
        fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
    }
    
    totalFixed += fixed;
    console.log(`${file}: ${fixed} fix procedures generated`);
}

console.log(`\nTotal alarms with fix procedures: ${totalFixed}`);
