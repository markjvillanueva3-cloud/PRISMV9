const fs = require('fs');
const path = require('path');

const MACH_DIR = 'C:\\PRISM\\data\\machines';

// =====================================================
// MANUFACTURER SPEC DATABASE
// Typical specs by manufacturer + model series
// =====================================================
const SPEC_DB = {
    // DMG MORI
    'DMU': { power: 25, travels: { x: 650, y: 520, z: 475 }, type: '5axis' },
    'DMU 50': { power: 25, travels: { x: 650, y: 520, z: 475 } },
    'DMU 65': { power: 32, travels: { x: 735, y: 560, z: 560 } },
    'DMU 80': { power: 35, travels: { x: 800, y: 650, z: 550 } },
    'DMU 100': { power: 40, travels: { x: 1000, y: 800, z: 650 } },
    'DMU 125': { power: 46, travels: { x: 1250, y: 1000, z: 800 } },
    'DMU 210': { power: 52, travels: { x: 2100, y: 2100, z: 1250 } },
    'DMU 340': { power: 52, travels: { x: 3400, y: 3400, z: 1250 } },
    'DMC': { power: 20, travels: { x: 600, y: 500, z: 400 }, type: 'vmc' },
    'DMC 635': { power: 14, travels: { x: 635, y: 510, z: 460 } },
    'DMC 1035': { power: 25, travels: { x: 1035, y: 560, z: 510 } },
    'NLX': { power: 18.5, travels: { x: 260, y: 0, z: 705 }, type: 'lathe' },
    'NLX 1500': { power: 11, travels: { x: 190, y: 0, z: 500 } },
    'NLX 2000': { power: 15, travels: { x: 260, y: 0, z: 705 } },
    'NLX 2500': { power: 18.5, travels: { x: 260, y: 0, z: 1280 } },
    'NLX 3000': { power: 22, travels: { x: 310, y: 0, z: 1540 } },
    'NTX': { power: 22, travels: { x: 460, y: 200, z: 1500 }, type: 'turn_mill' },
    'CTX': { power: 21, travels: { x: 260, y: 0, z: 550 }, type: 'lathe' },
    'CLX': { power: 15, travels: { x: 260, y: 0, z: 530 }, type: 'lathe' },
    'SPRINT': { power: 13, travels: { x: 180, y: 50, z: 260 }, type: 'lathe' },
    'duoBLOCK': { power: 35, travels: { x: 800, y: 650, z: 600 }, type: '5axis' },
    
    // Mazak
    'VCN': { power: 18.5, travels: { x: 560, y: 410, z: 460 }, type: 'vmc' },
    'VCN-410': { power: 15, travels: { x: 560, y: 410, z: 460 } },
    'VCN-510': { power: 18.5, travels: { x: 660, y: 510, z: 510 } },
    'VCN-700': { power: 22, travels: { x: 1050, y: 700, z: 560 } },
    'VARIAXIS': { power: 25, travels: { x: 630, y: 560, z: 460 }, type: '5axis' },
    'VARIAXIS i-300': { power: 18.5, travels: { x: 300, y: 380, z: 340 } },
    'VARIAXIS i-500': { power: 22, travels: { x: 500, y: 560, z: 460 } },
    'VARIAXIS i-600': { power: 22, travels: { x: 630, y: 560, z: 510 } },
    'VARIAXIS i-700': { power: 30, travels: { x: 730, y: 560, z: 510 } },
    'VARIAXIS i-800': { power: 35, travels: { x: 830, y: 710, z: 610 } },
    'VARIAXIS i-1050': { power: 37, travels: { x: 1050, y: 900, z: 700 } },
    'INTEGREX': { power: 22, travels: { x: 300, y: 230, z: 800 }, type: 'turn_mill' },
    'INTEGREX i-100': { power: 15, travels: { x: 245, y: 200, z: 500 } },
    'INTEGREX i-200': { power: 22, travels: { x: 300, y: 230, z: 800 } },
    'INTEGREX i-300': { power: 26, travels: { x: 365, y: 260, z: 1000 } },
    'INTEGREX i-400': { power: 30, travels: { x: 480, y: 300, z: 1500 } },
    'INTEGREX i-500': { power: 37, travels: { x: 580, y: 350, z: 1500 } },
    'INTEGREX e-': { power: 30, travels: { x: 400, y: 350, z: 1500 } },
    'QTN': { power: 18.5, travels: { x: 260, y: 0, z: 530 }, type: 'lathe' },
    'QT': { power: 15, travels: { x: 225, y: 0, z: 500 }, type: 'lathe' },
    'QUICK TURN': { power: 18.5, travels: { x: 260, y: 0, z: 600 }, type: 'lathe' },
    'HCN': { power: 22, travels: { x: 730, y: 730, z: 680 }, type: 'hmc' },
    'HCN-4000': { power: 18.5, travels: { x: 560, y: 510, z: 510 } },
    'HCN-5000': { power: 22, travels: { x: 730, y: 730, z: 680 } },
    'HCN-6000': { power: 30, travels: { x: 900, y: 800, z: 710 } },
    'HCN-6800': { power: 30, travels: { x: 1050, y: 900, z: 800 } },
    'HCN-8800': { power: 37, travels: { x: 1300, y: 1100, z: 1000 } },
    'MULTIPLEX': { power: 22, travels: { x: 280, y: 230, z: 650 }, type: 'turn_mill' },
    
    // Okuma
    'GENOS': { power: 22, travels: { x: 762, y: 460, z: 460 }, type: 'vmc' },
    'GENOS M460': { power: 22, travels: { x: 762, y: 460, z: 460 } },
    'GENOS M560': { power: 22, travels: { x: 1050, y: 560, z: 460 } },
    'GENOS L': { power: 15, travels: { x: 200, y: 0, z: 500 }, type: 'lathe' },
    'MB-46': { power: 22, travels: { x: 762, y: 460, z: 460 }, type: 'vmc' },
    'MB-56': { power: 22, travels: { x: 1050, y: 560, z: 460 } },
    'MB-66': { power: 30, travels: { x: 1300, y: 660, z: 610 } },
    'MB-80': { power: 37, travels: { x: 2000, y: 800, z: 750 } },
    'MU-4000': { power: 22, travels: { x: 400, y: 400, z: 355 }, type: '5axis' },
    'MU-5000': { power: 26, travels: { x: 500, y: 500, z: 400 } },
    'MU-6300': { power: 30, travels: { x: 630, y: 630, z: 500 } },
    'MU-8000': { power: 37, travels: { x: 800, y: 800, z: 600 } },
    'MU-10000': { power: 45, travels: { x: 1000, y: 1000, z: 800 } },
    'MULTUS': { power: 22, travels: { x: 400, y: 230, z: 800 }, type: 'turn_mill' },
    'MULTUS B200': { power: 15, travels: { x: 210, y: 140, z: 500 } },
    'MULTUS B300': { power: 22, travels: { x: 360, y: 230, z: 800 } },
    'MULTUS B400': { power: 26, travels: { x: 480, y: 300, z: 1000 } },
    'MULTUS B750': { power: 37, travels: { x: 615, y: 350, z: 1500 } },
    'MULTUS U': { power: 30, travels: { x: 480, y: 300, z: 1500 } },
    'LB': { power: 15, travels: { x: 220, y: 0, z: 500 }, type: 'lathe' },
    'LB3000': { power: 18.5, travels: { x: 260, y: 0, z: 750 } },
    'LU': { power: 18.5, travels: { x: 260, y: 0, z: 600 }, type: 'lathe' },
    
    // Haas
    'VF-1': { power: 22.4, travels: { x: 508, y: 406, z: 508 }, type: 'vmc' },
    'VF-2': { power: 22.4, travels: { x: 762, y: 406, z: 508 } },
    'VF-3': { power: 22.4, travels: { x: 1016, y: 508, z: 635 } },
    'VF-4': { power: 22.4, travels: { x: 1270, y: 508, z: 635 } },
    'VF-5': { power: 22.4, travels: { x: 1270, y: 660, z: 635 } },
    'VF-6': { power: 22.4, travels: { x: 1626, y: 813, z: 762 } },
    'VF-7': { power: 22.4, travels: { x: 2134, y: 813, z: 762 } },
    'VF-8': { power: 22.4, travels: { x: 1626, y: 1016, z: 762 } },
    'VF-9': { power: 22.4, travels: { x: 2134, y: 1016, z: 762 } },
    'VF-10': { power: 22.4, travels: { x: 3048, y: 813, z: 762 } },
    'VF-11': { power: 22.4, travels: { x: 3048, y: 1016, z: 762 } },
    'VF-12': { power: 22.4, travels: { x: 3810, y: 813, z: 762 } },
    'UMC-500': { power: 22.4, travels: { x: 508, y: 406, z: 394 }, type: '5axis' },
    'UMC-750': { power: 22.4, travels: { x: 762, y: 508, z: 508 } },
    'UMC-1000': { power: 22.4, travels: { x: 1016, y: 635, z: 635 } },
    'UMC-1500': { power: 29.8, travels: { x: 1524, y: 660, z: 635 } },
    'EC-400': { power: 22.4, travels: { x: 508, y: 508, z: 508 }, type: 'hmc' },
    'EC-500': { power: 22.4, travels: { x: 762, y: 508, z: 508 } },
    'EC-1600': { power: 22.4, travels: { x: 1626, y: 1270, z: 762 } },
    'ST-10': { power: 11.2, travels: { x: 200, y: 0, z: 356 }, type: 'lathe' },
    'ST-15': { power: 14.9, travels: { x: 200, y: 0, z: 406 } },
    'ST-20': { power: 14.9, travels: { x: 210, y: 0, z: 533 } },
    'ST-25': { power: 22.4, travels: { x: 265, y: 0, z: 610 } },
    'ST-30': { power: 22.4, travels: { x: 265, y: 0, z: 660 } },
    'ST-35': { power: 22.4, travels: { x: 330, y: 0, z: 838 } },
    'DT-1': { power: 11.2, travels: { x: 508, y: 406, z: 394 }, type: 'drill_tap' },
    'DT-2': { power: 11.2, travels: { x: 711, y: 406, z: 394 } },
    'DM-1': { power: 11.2, travels: { x: 508, y: 406, z: 394 }, type: 'drill_tap' },
    'MINI MILL': { power: 11.2, travels: { x: 406, y: 305, z: 254 }, type: 'vmc' },
    'MINI MILL 2': { power: 11.2, travels: { x: 508, y: 406, z: 356 } },
    'TM-1': { power: 5.6, travels: { x: 762, y: 305, z: 406 }, type: 'vmc' },
    'TM-2': { power: 7.5, travels: { x: 1016, y: 406, z: 406 } },
    'TM-3': { power: 5.6, travels: { x: 1016, y: 508, z: 406 } },
    
    // Makino
    'a51': { power: 22, travels: { x: 560, y: 510, z: 500 }, type: 'hmc' },
    'a61': { power: 26, travels: { x: 730, y: 650, z: 650 } },
    'a71': { power: 30, travels: { x: 900, y: 800, z: 710 } },
    'a81': { power: 37, travels: { x: 900, y: 800, z: 800 } },
    'a82': { power: 37, travels: { x: 900, y: 800, z: 800 } },
    'a92': { power: 45, travels: { x: 1200, y: 1050, z: 1000 } },
    'PS95': { power: 22, travels: { x: 900, y: 500, z: 450 }, type: 'vmc' },
    'PS105': { power: 22, travels: { x: 1050, y: 530, z: 460 } },
    'F5': { power: 15, travels: { x: 500, y: 400, z: 330 }, type: 'vmc' },
    'F3': { power: 11, travels: { x: 300, y: 300, z: 300 } },
    'D500': { power: 22, travels: { x: 500, y: 500, z: 350 }, type: '5axis' },
    'D800': { power: 30, travels: { x: 850, y: 650, z: 560 } },
    'DA300': { power: 18.5, travels: { x: 300, y: 450, z: 350 }, type: '5axis' },
    'T1': { power: 26, travels: { x: 1300, y: 1000, z: 750 }, type: '5axis' },
    'T2': { power: 30, travels: { x: 1500, y: 1300, z: 900 } },
    
    // DN Solutions (Doosan)
    'DVF': { power: 22, travels: { x: 500, y: 450, z: 380 }, type: '5axis' },
    'DVF 5000': { power: 22, travels: { x: 500, y: 450, z: 380 } },
    'DVF 6500': { power: 26, travels: { x: 650, y: 500, z: 480 } },
    'DNM': { power: 18.5, travels: { x: 800, y: 450, z: 510 }, type: 'vmc' },
    'DNM 4000': { power: 15, travels: { x: 670, y: 400, z: 480 } },
    'DNM 4500': { power: 15, travels: { x: 800, y: 450, z: 510 } },
    'DNM 5700': { power: 18.5, travels: { x: 1100, y: 570, z: 510 } },
    'DNM 6700': { power: 22, travels: { x: 1300, y: 670, z: 610 } },
    'NHP': { power: 22, travels: { x: 630, y: 600, z: 600 }, type: 'hmc' },
    'NHP 4000': { power: 15, travels: { x: 560, y: 510, z: 510 } },
    'NHP 5000': { power: 22, travels: { x: 730, y: 650, z: 650 } },
    'NHP 6300': { power: 26, travels: { x: 900, y: 800, z: 710 } },
    'LYNX': { power: 15, travels: { x: 200, y: 0, z: 510 }, type: 'lathe' },
    'LYNX 2100': { power: 15, travels: { x: 200, y: 0, z: 350 } },
    'LYNX 2600': { power: 18.5, travels: { x: 250, y: 0, z: 550 } },
    'PUMA': { power: 22, travels: { x: 260, y: 0, z: 700 }, type: 'lathe' },
    'PUMA 2100': { power: 15, travels: { x: 200, y: 0, z: 450 } },
    'PUMA 2600': { power: 18.5, travels: { x: 250, y: 0, z: 600 } },
    'PUMA 3100': { power: 22, travels: { x: 310, y: 0, z: 800 } },
    'PUMA 4000': { power: 30, travels: { x: 350, y: 0, z: 1000 } },
    'SMX': { power: 22, travels: { x: 300, y: 230, z: 800 }, type: 'turn_mill' },
    
    // Citizen/Star/Tsugami Swiss
    'Cincom': { power: 3.7, travels: { x: 110, y: 70, z: 205 }, type: 'lathe' },
    'L12': { power: 3.7, travels: { x: 110, y: 70, z: 205 } },
    'L20': { power: 5.5, travels: { x: 140, y: 80, z: 210 } },
    'L32': { power: 7.5, travels: { x: 160, y: 100, z: 260 } },
    'SR-20': { power: 5.5, travels: { x: 135, y: 80, z: 200 }, type: 'lathe' },
    'SR-32': { power: 7.5, travels: { x: 155, y: 100, z: 260 } },
    'SW-20': { power: 5.5, travels: { x: 135, y: 80, z: 200 } },
    
    // Fanuc
    'ROBODRILL': { power: 11, travels: { x: 500, y: 400, z: 330 }, type: 'drill_tap' },
    'α-D14': { power: 11, travels: { x: 500, y: 400, z: 330 } },
    'α-D21': { power: 11, travels: { x: 700, y: 400, z: 330 } },
    
    // Mori Seiki (older)
    'SL': { power: 15, travels: { x: 230, y: 0, z: 500 }, type: 'lathe' },
    'NV': { power: 15, travels: { x: 500, y: 400, z: 350 }, type: 'vmc' },
    'NH': { power: 22, travels: { x: 650, y: 560, z: 560 }, type: 'hmc' },
};

// Turret type defaults by lathe model/manufacturer
const TURRET_DEFAULTS = {
    'haas': { default: 'BOT', small: 'VDI30', medium: 'VDI40', large: 'VDI50' },
    'dmg mori': { default: 'VDI40', small: 'VDI30', medium: 'VDI40', large: 'VDI50' },
    'mazak': { default: 'VDI40', small: 'VDI30', medium: 'VDI40', large: 'VDI50' },
    'okuma': { default: 'VDI40', small: 'VDI30', medium: 'VDI40', large: 'VDI50' },
    'dn solutions': { default: 'BMT55', small: 'VDI30', medium: 'BMT55', large: 'BMT65' },
    'doosan': { default: 'BMT55', small: 'VDI30', medium: 'BMT55', large: 'BMT65' },
    'citizen': { default: 'GANG', small: 'GANG', medium: 'GANG' },
    'star': { default: 'GANG', small: 'GANG', medium: 'GANG' },
    'tsugami': { default: 'GANG', small: 'GANG', medium: 'GANG' },
    'nakamura-tome': { default: 'BMT55', small: 'VDI30', medium: 'BMT55', large: 'BMT65' },
    'index': { default: 'VDI30', small: 'VDI25', medium: 'VDI30', large: 'VDI40' },
    'traub': { default: 'VDI30', small: 'VDI25', medium: 'VDI30', large: 'VDI40' },
};

function findSpec(model, manufacturer) {
    const m = String(model || '').toUpperCase();
    const mfr = String(typeof manufacturer === 'object' ? (manufacturer?.name || '') : (manufacturer || '')).toLowerCase();
    
    // Try exact match first
    for (const [key, spec] of Object.entries(SPEC_DB)) {
        if (m.includes(key.toUpperCase())) return spec;
    }
    
    // Try model prefix (first word)
    const prefix = m.split(/[\s-]/)[0];
    for (const [key, spec] of Object.entries(SPEC_DB)) {
        if (key.toUpperCase() === prefix) return spec;
    }
    
    return null;
}

function findTurretType(m, manufacturer) {
    const mfr = String(typeof manufacturer === 'object' ? (manufacturer?.name || '') : (manufacturer || '')).toLowerCase();
    const model = (m.model || m.name || '').toLowerCase();
    const maxX = m.spindle?.max_rpm || 0;
    
    // Determine size class
    let size = 'medium';
    if (model.includes('mini') || model.includes('compact') || (maxX > 8000 && !model.includes('multi'))) size = 'small';
    if (model.includes('4000') || model.includes('5000') || model.includes('large')) size = 'large';
    
    for (const [key, types] of Object.entries(TURRET_DEFAULTS)) {
        if (mfr.includes(key)) return types[size] || types.default;
    }
    
    return 'VDI40'; // default
}

// Main population
function findJsonFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) results = results.concat(findJsonFiles(fp));
        else if (e.name.endsWith('.json')) results.push(fp);
    }
    return results;
}

const files = findJsonFiles(MACH_DIR);
let powerFilled = 0, travelsFilled = 0, turretFilled = 0, total = 0;

for (const fp of files) {
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { continue; }
    
    const arr = json.machines || (Array.isArray(json) ? json : [json]);
    let modified = false;
    
    for (const m of arr) {
        if (!m.id && !m.machine_id && !m.model) continue;
        total++;
        
        const model = m.model || m.name || m.id || '';
        const mfr = typeof m.manufacturer === 'object' ? (m.manufacturer?.name || '') : (m.manufacturer || m.brand || '');
        const spec = findSpec(model, mfr);
        
        // Fill spindle power if missing
        if (spec && spec.power && m.spindle && (!m.spindle.power_continuous || m.spindle.power_continuous === 0)) {
            m.spindle.power_continuous = spec.power;
            m.spindle.power_kw = spec.power;
            powerFilled++;
            modified = true;
        }
        
        // Fill work envelope / travels if missing
        if (spec && spec.travels && !m.travels && !m.work_envelope) {
            m.travels = spec.travels;
            m.work_envelope = {
                x_mm: spec.travels.x,
                y_mm: spec.travels.y,
                z_mm: spec.travels.z
            };
            travelsFilled++;
            modified = true;
        }
        
        // Fill turret type for lathes
        const type = (m.type || m.machine_type || '').toLowerCase();
        const isLathe = type.includes('lathe') || type.includes('turn');
        if (isLathe && !m.turret_type && !m.turret?.type) {
            const tt = findTurretType(m, mfr);
            if (!m.turret) m.turret = {};
            m.turret.type = tt;
            m.turret_type = tt;
            turretFilled++;
            modified = true;
        }
    }
    
    if (modified) {
        fs.writeFileSync(fp, JSON.stringify(json.machines ? json : (Array.isArray(json) ? json : json), null, 2), 'utf8');
    }
}

console.log(`=== MCH-0 MACHINE FIELD POPULATION ===`);
console.log(`Total machines: ${total}`);
console.log(`Power filled: ${powerFilled}`);
console.log(`Travels filled: ${travelsFilled}`);
console.log(`Turret type filled: ${turretFilled}`);
