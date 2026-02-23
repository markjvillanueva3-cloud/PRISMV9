const fs = require('fs');
const path = require('path');

// Comprehensive travel specs by manufacturer and model pattern
const SPECS = {
    // HAAS
    'GR-510': { x: 1321, y: 508, z: 457 },
    'VM-2': { x: 762, y: 508, z: 508 }, 'VM-3': { x: 1016, y: 660, z: 635 }, 'VM-6': { x: 1626, y: 813, z: 762 },
    'UMC-350': { x: 508, y: 406, z: 356 }, 'UMC-400': { x: 610, y: 410, z: 460 },
    'UMC-1250': { x: 1270, y: 508, z: 508 }, 'UMC-1600': { x: 1626, y: 813, z: 635 },
    
    // HURCO
    'VM10': { x: 660, y: 356, z: 356 }, 'VM20': { x: 1016, y: 508, z: 508 }, 'VM30': { x: 1270, y: 508, z: 508 },
    'VMX42': { x: 1067, y: 610, z: 610 }, 'VMX50': { x: 1270, y: 660, z: 610 }, 'VMX64': { x: 1626, y: 660, z: 610 },
    'VMX30U': { x: 762, y: 508, z: 508 }, 'VMX42SR': { x: 1067, y: 610, z: 508 },
    
    // BROTHER
    'S300X': { x: 300, y: 440, z: 305 }, 'S500X': { x: 500, y: 440, z: 305 }, 'S500Z': { x: 500, y: 440, z: 330 },
    'S700X': { x: 700, y: 400, z: 300 }, 'S1000X': { x: 1000, y: 500, z: 300 },
    'M140X': { x: 200, y: 440, z: 305 }, 'M200X': { x: 200, y: 440, z: 305 },
    'R450X': { x: 450, y: 300, z: 305 }, 'R650X': { x: 650, y: 400, z: 305 },
    
    // HERMLE
    'C 12 U': { x: 350, y: 440, z: 330 }, 'C 22 U': { x: 450, y: 600, z: 330 },
    'C 32 U': { x: 650, y: 650, z: 500 }, 'C 42 U': { x: 800, y: 800, z: 550 },
    'C 52 U': { x: 1000, y: 1100, z: 750 }, 'C 32': { x: 650, y: 650, z: 500 },
    'C 42 U MT': { x: 800, y: 800, z: 550 }, 'C 32 U HS': { x: 650, y: 650, z: 500 },
    'C 250 U': { x: 600, y: 550, z: 450 }, 'C 400 U': { x: 850, y: 700, z: 500 },
    'C 650 U': { x: 1050, y: 900, z: 600 },
    
    // HARDINGE
    'Conquest T42': { x: 205, y: 0, z: 305 }, 'Conquest T51': { x: 254, y: 0, z: 457 },
    'Conquest T65': { x: 305, y: 0, z: 610 }, 'Elite T42 SMY': { x: 205, y: 50, z: 305 },
    'Elite T65 SMY': { x: 305, y: 50, z: 610 }, 'GS 150': { x: 150, y: 0, z: 200 },
    'GS 200': { x: 200, y: 0, z: 270 },
    
    // KITAMURA
    'HX300': { x: 560, y: 510, z: 510 }, 'HX400': { x: 630, y: 560, z: 560 }, 'HX500': { x: 800, y: 700, z: 700 },
    'Mytrunnion-4': { x: 700, y: 500, z: 420 }, 'Mytrunnion-5': { x: 900, y: 600, z: 500 },
    'Supercell-300': { x: 300, y: 300, z: 300 }, 'Supercell-400': { x: 400, y: 400, z: 400 },
    'Bridgecenter-8X': { x: 800, y: 450, z: 400 },
    
    // FEELER
    'VMP-580': { x: 580, y: 420, z: 420 }, 'VMP-1100': { x: 1100, y: 600, z: 600 },
    'HV-800': { x: 800, y: 550, z: 560 }, 'U-600': { x: 600, y: 500, z: 450 },
    'FMH-500': { x: 560, y: 510, z: 510 }, 'FTC-20': { x: 185, y: 0, z: 350 },
    'FTC-350': { x: 330, y: 0, z: 580 }, 'FDC-2114': { x: 200, y: 0, z: 350 },
    
    // HYUNDAI WIA
    'KF 4600': { x: 1020, y: 510, z: 570 }, 'KF 5600': { x: 1270, y: 570, z: 570 }, 'KF 6700': { x: 1500, y: 670, z: 670 },
    'XF 6300': { x: 1500, y: 630, z: 630 }, 'HS 5000': { x: 800, y: 730, z: 730 }, 'HS 6300': { x: 1000, y: 800, z: 800 },
    'SKT 200': { x: 200, y: 0, z: 350 }, 'SKT 250': { x: 260, y: 0, z: 500 },
    
    // TAKUMI
    'H10': { x: 1020, y: 610, z: 610 }, 'H13': { x: 1320, y: 760, z: 710 },
    'V11A': { x: 1100, y: 610, z: 520 }, 'V15': { x: 1500, y: 610, z: 610 },
    'U600': { x: 600, y: 500, z: 350 }, 'DP-1612': { x: 1600, y: 1200, z: 800 },
    'S500': { x: 500, y: 400, z: 350 }, 'UM-400': { x: 400, y: 400, z: 350 },
    
    // LEADWELL
    'MCV-610': { x: 610, y: 410, z: 510 }, 'MCV-1000': { x: 1020, y: 510, z: 560 }, 'MCV-1300': { x: 1320, y: 610, z: 610 },
    'V-30iT': { x: 600, y: 410, z: 350 }, 'LTC-20': { x: 200, y: 0, z: 350 }, 'LTC-35': { x: 310, y: 0, z: 500 },
    'T-7SMY': { x: 395, y: 60, z: 630 },
    
    // MIKRON
    'MILL S 400 U': { x: 500, y: 450, z: 400 }, 'MILL S 500 U': { x: 500, y: 450, z: 400 },
    'MILL P 500 U': { x: 500, y: 450, z: 450 }, 'MILL P 800 U': { x: 800, y: 550, z: 550 },
    'HEM 500U': { x: 500, y: 500, z: 500 }, 'HSM 500': { x: 500, y: 450, z: 400 }, 'HSM 600U': { x: 600, y: 500, z: 450 },
    
    // OKK
    'VM43R': { x: 620, y: 410, z: 410 }, 'VM53R': { x: 1050, y: 530, z: 460 }, 'VM76R': { x: 1500, y: 760, z: 660 },
    'HM500': { x: 730, y: 650, z: 710 }, 'HM800': { x: 1000, y: 850, z: 850 },
    'VP400': { x: 600, y: 400, z: 400 }, 'VP600': { x: 800, y: 600, z: 520 },
    
    // SPINNER
    'VC 560': { x: 560, y: 410, z: 460 }, 'VC 850': { x: 850, y: 500, z: 510 }, 'VC 1200': { x: 1200, y: 600, z: 610 },
    'U 620': { x: 620, y: 520, z: 460 }, 'U 1520': { x: 1520, y: 700, z: 630 },
    'TTS 300': { x: 260, y: 0, z: 500 }, 'TC 600': { x: 335, y: 60, z: 600 },
    
    // TOYODA
    'FH400J': { x: 560, y: 510, z: 510 }, 'FH550J': { x: 730, y: 650, z: 650 }, 'FH800SXJ': { x: 1000, y: 850, z: 850 },
    'FV1265': { x: 1270, y: 660, z: 610 }, 'FV1680': { x: 1600, y: 813, z: 710 },
    'FA450V': { x: 560, y: 450, z: 460 }, 'FA630V': { x: 730, y: 630, z: 600 },
    
    // GROB
    'G150': { x: 550, y: 550, z: 475 }, 'G350': { x: 600, y: 720, z: 590 },
    'G550': { x: 800, y: 950, z: 740 }, 'G750': { x: 1000, y: 1175, z: 890 },
    'G350a': { x: 600, y: 720, z: 590 }, 'G520F': { x: 750, y: 920, z: 700 },
    
    // KERN
    'Micro Evo': { x: 300, y: 280, z: 250 }, 'Micro Vario': { x: 500, y: 440, z: 380 },
    'Micro HD': { x: 300, y: 280, z: 250 }, 'Pyramid Nano': { x: 500, y: 500, z: 300 },
    
    // MATSUURA
    'MAM72-25V': { x: 500, y: 500, z: 350 }, 'MAM72-35V': { x: 600, y: 600, z: 450 },
    'MAM72-52V': { x: 850, y: 850, z: 600 }, 'MX-330': { x: 560, y: 400, z: 460 }, 'MX-520': { x: 730, y: 510, z: 510 },
    
    // SODICK
    'OPM250L': { x: 250, y: 250, z: 250 }, 'OPM350L': { x: 350, y: 350, z: 350 },
    'HS430L': { x: 430, y: 370, z: 370 }, 'HS650L': { x: 650, y: 450, z: 350 }, 'UH450L': { x: 450, y: 360, z: 310 },
    
    // YASDA
    'YBM 640V': { x: 640, y: 460, z: 360 }, 'YBM 950V': { x: 950, y: 600, z: 500 },
    'YMC 430': { x: 430, y: 400, z: 350 }, 'YMC 650': { x: 650, y: 550, z: 480 }, 'H40i': { x: 560, y: 460, z: 460 },
    
    // CHIRON
    'FZ 08 S': { x: 270, y: 280, z: 275 }, 'FZ 12 S': { x: 380, y: 400, z: 375 }, 'MILL 800': { x: 800, y: 630, z: 550 },
    
    // MAZAK additions
    'VCE-500': { x: 560, y: 410, z: 510 }, 'CV5-500': { x: 550, y: 500, z: 510 }, 'FJV-250': { x: 1524, y: 660, z: 560 },
    
    // OKUMA additions
    'MB-5000H': { x: 730, y: 730, z: 710 }, '2SP-V760EX': { x: 250, y: 0, z: 320 }, 'MCR-A5CII': { x: 5000, y: 3200, z: 800 },
    
    // MAKINO additions
    'iQ500': { x: 800, y: 500, z: 500 }, 'U6': { x: 650, y: 450, z: 350 },
    
    // DMG MORI additions
    'CTV 250': { x: 210, y: 0, z: 500 },
    
    // ROKU-ROKU
    'MV-550': { x: 550, y: 400, z: 300 }, 'MV-850': { x: 850, y: 500, z: 400 },
    'MU-500VA': { x: 500, y: 440, z: 350 }, 'DC-1612': { x: 1600, y: 1200, z: 300 },
    'G-300': { x: 300, y: 300, z: 200 }, 'MA-500': { x: 500, y: 400, z: 350 },
    
    // AWEA
    'LP-3021': { x: 3000, y: 2100, z: 800 },
    
    // MHI
    'MVR-Ex35': { x: 3500, y: 3000, z: 1000 },
};

// Generic patterns for unknown models - estimate from model numbers
function estimateFromModel(model) {
    const m = model.replace(/[-_]/g, '').toLowerCase();
    // Extract travel hints from model name
    const numMatch = m.match(/(\d{3,4})/);
    if (numMatch) {
        const num = parseInt(numMatch[1]);
        // Many VMC models encode X travel in name
        if (num >= 300 && num <= 2500) {
            return { x: num, y: Math.round(num * 0.65), z: Math.round(num * 0.55), _estimated: true };
        }
    }
    return null;
}

function findSpec(model) {
    // Exact match
    if (SPECS[model]) return SPECS[model];
    
    // Clean model name and try
    const clean = model.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (SPECS[clean]) return SPECS[clean];
    
    // Prefix match (remove suffixes like i, G, HD, EDU, etc.)
    for (const [key, val] of Object.entries(SPECS)) {
        if (clean.startsWith(key) || model.startsWith(key) || clean.includes(key)) {
            return val;
        }
    }
    
    // Try removing common suffixes
    const stripped = model.replace(/([-_ ]?(i|G|iG|HD|EDU|SMY|SMCY|MT|HS|LP|MY|LY|BLY|AP|B|D|EX|SXJ|SR|SRi|Ui|Ti|GEN|3rd))+$/i, '').trim();
    if (SPECS[stripped]) return SPECS[stripped];
    for (const [key, val] of Object.entries(SPECS)) {
        if (stripped.includes(key) || key.includes(stripped)) return val;
    }
    
    return null;
}

// Process all machine files
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

const machFiles = findJsonFiles('C:\\PRISM\\data\\machines');
let filled = 0, estimated = 0, remaining = 0;

for (const fp of machFiles) {
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { continue; }
    const arr = json.machines || (Array.isArray(json) ? json : [json]);
    let modified = false;
    
    for (const m of arr) {
        if (!m.id && !m.machine_id && !m.model) continue;
        if ((m.travels?.x > 0) || (m.work_envelope?.x_mm > 0)) continue;
        
        const model = m.model || m.name || '';
        const spec = findSpec(model);
        
        if (spec) {
            if (!m.travels) m.travels = {};
            m.travels.x = spec.x;
            m.travels.y = spec.y;
            m.travels.z = spec.z;
            if (!m.work_envelope) m.work_envelope = {};
            m.work_envelope.x_mm = spec.x;
            m.work_envelope.y_mm = spec.y;
            m.work_envelope.z_mm = spec.z;
            filled++;
            modified = true;
        } else {
            const est = estimateFromModel(model);
            if (est) {
                if (!m.travels) m.travels = {};
                m.travels.x = est.x;
                m.travels.y = est.y;
                m.travels.z = est.z;
                m.travels._estimated = true;
                if (!m.work_envelope) m.work_envelope = {};
                m.work_envelope.x_mm = est.x;
                m.work_envelope.y_mm = est.y;
                m.work_envelope.z_mm = est.z;
                m.work_envelope._estimated = true;
                estimated++;
                modified = true;
            } else {
                remaining++;
            }
        }
    }
    
    if (modified) fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
}

console.log(`Work envelope fill:`);
console.log(`  Spec-matched: ${filled}`);
console.log(`  Estimated from model#: ${estimated}`);
console.log(`  Remaining: ${remaining}`);
