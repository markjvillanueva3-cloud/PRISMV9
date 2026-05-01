const fs = require('fs');
const path = require('path');

// Tool changer specs
const TC_DB = {
    // HAAS
    'GR-510': 40, 'VM-2': 24, 'VM-3': 24, 'VM-6': 30,
    'UMC-350': 40, 'UMC-400': 40, 'UMC-1250': 50, 'UMC-1600': 60,
    // HURCO
    'VM10': 20, 'VM20': 24, 'VM30': 24, 'VMX42': 24, 'VMX50': 24, 'VMX64': 30,
    'VMX30U': 24, 'VMX42SR': 30,
    // BROTHER
    'S300X': 14, 'S500X': 22, 'S500Z': 22, 'S700X': 22, 'S1000X': 22,
    'M140X': 14, 'M200X': 22, 'R450X': 22, 'R650X': 22,
    // HERMLE
    'C 12 U': 36, 'C 22 U': 42, 'C 32 U': 42, 'C 42 U': 42, 'C 52 U': 60,
    'C 250 U': 36, 'C 400 U': 42, 'C 650 U': 60,
    // KITAMURA
    'HX300': 60, 'HX400': 60, 'HX500': 60, 'Mytrunnion-4': 40, 'Mytrunnion-5': 60,
    'Supercell-300': 40, 'Supercell-400': 60, 'Bridgecenter-8X': 30,
    // FEELER
    'VMP-580': 24, 'VMP-1100': 24, 'HV-800': 30, 'U-600': 30,
    'FMH-500': 40, 'FTC-20': 12, 'FTC-350': 12, 'FDC-2114': 12,
    // HYUNDAI WIA
    'KF 4600': 30, 'KF 5600': 30, 'KF 6700': 40, 'XF 6300': 40,
    'HS 5000': 60, 'HS 6300': 60, 'SKT 200': 12, 'SKT 250': 12,
    // TAKUMI
    'H10': 30, 'H13': 30, 'V11A': 24, 'V15': 30, 'U600': 30, 'DP-1612': 24, 'S500': 24, 'UM-400': 30,
    // LEADWELL
    'MCV-610': 24, 'MCV-1000': 24, 'MCV-1300': 30, 'V-30iT': 20,
    // MIKRON
    'MILL S 400 U': 36, 'MILL S 500 U': 36, 'MILL P 500 U': 60, 'MILL P 800 U': 60,
    'HEM 500U': 60, 'HSM 500': 36, 'HSM 600U': 36,
    // OKK
    'VM43R': 24, 'VM53R': 30, 'VM76R': 40, 'HM500': 60, 'HM800': 60, 'VP400': 30, 'VP600': 40,
    // SPINNER
    'VC 560': 24, 'VC 850': 30, 'VC 1200': 30, 'U 620': 30, 'U 1520': 40,
    // TOYODA
    'FH400J': 60, 'FH550J': 60, 'FH800SXJ': 80, 'FV1265': 30, 'FV1680': 40,
    'FA450V': 40, 'FA630V': 60,
    // GROB
    'G150': 36, 'G350': 60, 'G550': 80, 'G750': 100, 'G350a': 60, 'G520F': 70,
    // KERN
    'Micro Evo': 30, 'Micro Vario': 36, 'Micro HD': 30, 'Pyramid Nano': 40,
    // MATSUURA
    'MAM72-25V': 32, 'MAM72-35V': 40, 'MAM72-52V': 60, 'MX-330': 30, 'MX-520': 30,
    // SODICK
    'OPM250L': 16, 'OPM350L': 16, 'HS430L': 20, 'HS650L': 20, 'UH450L': 20,
    // YASDA
    'YBM 640V': 30, 'YBM 950V': 40, 'YMC 430': 30, 'YMC 650': 40, 'H40i': 40,
    // CHIRON
    'FZ 08 S': 18, 'FZ 12 S': 24, 'MILL 800': 40,
    // ROKU-ROKU
    'MV-550': 20, 'MV-850': 24, 'MU-500VA': 24, 'DC-1612': 20, 'G-300': 16, 'MA-500': 20,
    // MAZAK
    'VCE-500': 30, 'CV5-500': 40, 'FJV-250': 30,
    // OKUMA
    'MB-5000H': 48, '2SP-V760EX': 12, 'MCR-A5CII': 40,
    // MAKINO
    'iQ500': 60, 'U6': 20,
    // DMG MORI
    'CTV 250': 12,
    // AWEA
    'LP-3021': 30,
    // MHI
    'MVR-Ex35': 40,
};

function findTC(model) {
    if (TC_DB[model]) return TC_DB[model];
    const clean = model.replace(/[_-]/g, ' ').trim();
    if (TC_DB[clean]) return TC_DB[clean];
    for (const [key, val] of Object.entries(TC_DB)) {
        if (clean.startsWith(key) || clean.includes(key)) return val;
    }
    const stripped = model.replace(/([-_ ]?(i|G|iG|HD|EDU|SMY|SMCY|MT|HS|LP|MY|LY|BLY|AP|B|D|EX|SXJ|SR|SRi|Ui|Ti|GEN|3rd))+$/i, '').trim();
    for (const [key, val] of Object.entries(TC_DB)) {
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
        if (m.tool_changer?.capacity > 0) continue;
        // Skip lathes — they don't have tool changers in the same sense
        const type = (m.type || m.machine_type || '').toLowerCase();
        if (type.includes('lathe') || type.includes('turn')) continue;
        
        const model = m.model || m.name || '';
        const tc = findTC(model);
        if (tc) {
            if (!m.tool_changer) m.tool_changer = {};
            m.tool_changer.capacity = tc;
            m.tool_changer.type = tc >= 60 ? 'chain' : 'carousel';
            filled++;
            modified = true;
        } else remaining++;
    }
    if (modified) fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
}
console.log(`Tool changer fill: ${filled} filled, ${remaining} remaining`);
