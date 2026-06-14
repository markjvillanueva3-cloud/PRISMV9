const fs = require('fs');
const path = require('path');

// Power specs by manufacturer/model
const POWER_DB = {
    // HAAS
    'GR-510': 11.2, 'VM-2': 22.4, 'VM-3': 22.4, 'VM-6': 22.4,
    'UMC-350': 11.2, 'UMC-400': 11.2, 'UMC-1250': 22.4, 'UMC-1600': 22.4,
    // HURCO
    'VM10': 7.5, 'VM20': 15.0, 'VM30': 18.5, 'VMX42': 18.5, 'VMX50': 22.0, 'VMX64': 30.0,
    'VMX30U': 18.5, 'VMX42SR': 18.5,
    // BROTHER
    'S300X': 6.0, 'S500X': 7.5, 'S500Z': 7.5, 'S700X': 11.0, 'S1000X': 15.0,
    'M140X': 4.0, 'M200X': 6.0, 'R450X': 11.0, 'R650X': 11.0,
    // HERMLE
    'C 12 U': 16.0, 'C 22 U': 29.0, 'C 32 U': 29.0, 'C 42 U': 35.0, 'C 52 U': 45.0,
    'C 250 U': 25.0, 'C 400 U': 35.0, 'C 650 U': 45.0,
    // HARDINGE
    'Conquest T42': 11.0, 'Conquest T51': 15.0, 'Conquest T65': 18.5,
    'Elite T42 SMY': 11.0, 'Elite T65 SMY': 18.5, 'GS 150': 5.5, 'GS 200': 7.5,
    // KITAMURA
    'HX300': 15.0, 'HX400': 18.5, 'HX500': 22.0,
    'Mytrunnion-4': 15.0, 'Mytrunnion-5': 22.0, 'Supercell-300': 15.0, 'Supercell-400': 18.5,
    'Bridgecenter-8X': 11.0,
    // FEELER
    'VMP-580': 11.0, 'VMP-1100': 15.0, 'HV-800': 18.5, 'U-600': 15.0,
    'FMH-500': 11.0, 'FTC-20': 7.5, 'FTC-350': 15.0, 'FDC-2114': 7.5,
    // HYUNDAI WIA
    'KF 4600': 18.5, 'KF 5600': 22.0, 'KF 6700': 30.0,
    'XF 6300': 22.0, 'HS 5000': 22.0, 'HS 6300': 30.0,
    'SKT 200': 15.0, 'SKT 250': 18.5,
    // TAKUMI
    'H10': 18.5, 'H13': 22.0, 'V11A': 15.0, 'V15': 22.0,
    'U600': 15.0, 'DP-1612': 15.0, 'S500': 11.0, 'UM-400': 15.0,
    // LEADWELL
    'MCV-610': 11.0, 'MCV-1000': 15.0, 'MCV-1300': 18.5,
    'V-30iT': 11.0, 'LTC-20': 7.5, 'LTC-35': 15.0, 'T-7SMY': 15.0,
    // MIKRON
    'MILL S 400 U': 20.0, 'MILL S 500 U': 20.0, 'MILL P 500 U': 36.0, 'MILL P 800 U': 36.0,
    'HEM 500U': 20.0, 'HSM 500': 20.0, 'HSM 600U': 20.0,
    // OKK
    'VM43R': 11.0, 'VM53R': 18.5, 'VM76R': 22.0,
    'HM500': 22.0, 'HM800': 30.0, 'VP400': 15.0, 'VP600': 22.0,
    // SPINNER
    'VC 560': 13.0, 'VC 850': 18.0, 'VC 1200': 25.0,
    'U 620': 18.0, 'U 1520': 32.0, 'TTS 300': 15.0, 'TC 600': 15.0,
    // TOYODA
    'FH400J': 22.0, 'FH550J': 30.0, 'FH800SXJ': 37.0,
    'FV1265': 22.0, 'FV1680': 30.0, 'FA450V': 15.0, 'FA630V': 22.0,
    // GROB
    'G150': 24.0, 'G350': 35.0, 'G550': 45.0, 'G750': 52.0, 'G350a': 35.0, 'G520F': 42.0,
    // KERN
    'Micro Evo': 8.4, 'Micro Vario': 12.0, 'Micro HD': 8.4, 'Pyramid Nano': 12.0,
    // MATSUURA
    'MAM72-25V': 22.0, 'MAM72-35V': 30.0, 'MAM72-52V': 37.0, 'MX-330': 18.5, 'MX-520': 22.0,
    // SODICK
    'OPM250L': 0.5, 'OPM350L': 0.5, 'HS430L': 11.0, 'HS650L': 15.0, 'UH450L': 11.0,
    // YASDA
    'YBM 640V': 15.0, 'YBM 950V': 22.0, 'YMC 430': 11.0, 'YMC 650': 18.5, 'H40i': 15.0,
    // CHIRON
    'FZ 08 S': 18.0, 'FZ 12 S': 25.0, 'MILL 800': 30.0,
    // ROKU-ROKU
    'MV-550': 11.0, 'MV-850': 15.0, 'MU-500VA': 15.0, 'DC-1612': 7.5, 'G-300': 7.5, 'MA-500': 11.0,
    // Misc
    'LP-3021': 22.0, 'MVR-Ex35': 37.0, 'VCE-500': 18.5, 'CV5-500': 18.5, 'FJV-250': 22.0,
    'MB-5000H': 22.0, '2SP-V760EX': 22.0, 'MCR-A5CII': 45.0, 'iQ500': 22.0, 'U6': 15.0, 'CTV 250': 18.5,
};

function findPower(model) {
    if (POWER_DB[model]) return POWER_DB[model];
    const clean = model.replace(/[_-]/g, ' ').trim();
    if (POWER_DB[clean]) return POWER_DB[clean];
    for (const [key, val] of Object.entries(POWER_DB)) {
        if (clean.startsWith(key) || clean.includes(key)) return val;
    }
    const stripped = model.replace(/([-_ ]?(i|G|iG|HD|EDU|SMY|SMCY|MT|HS|LP|MY|LY|BLY|AP|B|D|EX|SXJ|SR|SRi|Ui|Ti|GEN|3rd))+$/i, '').trim();
    if (POWER_DB[stripped]) return POWER_DB[stripped];
    for (const [key, val] of Object.entries(POWER_DB)) {
        if (stripped.includes(key) || key.includes(stripped)) return val;
    }
    return null;
}

function findJsonFiles(dir) {
    let r = [];
    try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const fp = path.join(dir, e.name);
            if (e.isDirectory()) r = r.concat(findJsonFiles(fp));
            else if (e.name.endsWith('.json')) r.push(fp);
        }
    } catch(e) {}
    return r;
}

let filled = 0, remaining = 0;
for (const fp of findJsonFiles('C:\\PRISM\\data\\machines')) {
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { continue; }
    const arr = json.machines || (Array.isArray(json) ? json : [json]);
    let modified = false;
    for (const m of arr) {
        if (!m.id && !m.machine_id && !m.model) continue;
        if (m.spindle?.power_continuous > 0 || m.spindle?.power_kw > 0) continue;
        const model = m.model || m.name || '';
        const power = findPower(model);
        if (power) {
            if (!m.spindle) m.spindle = {};
            m.spindle.power_kw = power;
            m.spindle.power_continuous = power;
            m.spindle.power_hp = Math.round(power * 1.341);
            filled++;
            modified = true;
        } else remaining++;
    }
    if (modified) fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
}

console.log(`Power fill: ${filled} filled, ${remaining} remaining`);
