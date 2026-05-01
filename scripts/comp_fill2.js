const fs = require('fs');
const path = require('path');

const BASE = 'C:\\PRISM\\data\\materials';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];

const COMP_DB2 = {
    // === MORE ARMOR STEELS ===
    'Armox 440': { C:{max:0.21,typical:0.18}, Cr:{max:1.0,typical:0.50}, Mo:{max:0.60,typical:0.35}, Ni:{max:1.80,typical:1.20}, Si:{min:0.10,max:0.40,typical:0.25}, Mn:{max:1.20,typical:0.90}, B:{max:0.005,typical:0.003} },
    'Armox 500': { C:{max:0.32,typical:0.28}, Cr:{max:1.0,typical:0.60}, Mo:{max:0.70,typical:0.40}, Ni:{max:1.80,typical:1.20}, Si:{min:0.10,max:0.40,typical:0.25}, Mn:{max:1.20,typical:0.90}, B:{max:0.005,typical:0.003} },
    'Armox 560': { C:{max:0.36,typical:0.33}, Cr:{max:1.50,typical:1.00}, Mo:{max:0.70,typical:0.45}, Ni:{max:2.50,typical:1.80}, Si:{min:0.10,max:0.40,typical:0.25}, Mn:{max:1.20,typical:0.90} },
    'Armox 600': { C:{max:0.47,typical:0.42}, Cr:{min:0.50,max:1.50,typical:1.00}, Mo:{max:0.70,typical:0.50}, Ni:{max:3.00,typical:2.00}, Si:{max:0.70,typical:0.35}, Mn:{max:0.80,typical:0.60} },
    'Ramor 500': { C:{max:0.32,typical:0.28}, Cr:{max:1.50,typical:0.80}, Mo:{max:0.70,typical:0.40}, Ni:{max:2.00,typical:1.30}, Mn:{max:1.70,typical:1.20}, B:{max:0.005,typical:0.003} },
    'Ramor 550': { C:{max:0.35,typical:0.32}, Cr:{max:1.50,typical:0.90}, Mo:{max:0.70,typical:0.45}, Ni:{max:2.50,typical:1.60}, Mn:{max:1.50,typical:1.10} },
    'Ramor 600': { C:{max:0.40,typical:0.37}, Cr:{max:1.50,typical:1.00}, Mo:{max:0.70,typical:0.50}, Ni:{max:3.00,typical:2.00}, Mn:{max:1.20,typical:0.90} },
    'Bisalloy 360': { C:{max:0.20,typical:0.16}, Mn:{max:1.60,typical:1.20}, Cr:{max:0.60,typical:0.30}, Mo:{max:0.50,typical:0.25}, Ni:{max:0.50,typical:0.30}, B:{max:0.005,typical:0.002} },
    'Bisalloy 400': { C:{max:0.23,typical:0.20}, Mn:{max:1.60,typical:1.30}, Cr:{max:0.80,typical:0.50}, Mo:{max:0.50,typical:0.30}, Ni:{max:0.70,typical:0.40}, B:{max:0.005,typical:0.003} },
    'Bisalloy 500': { C:{max:0.30,typical:0.27}, Mn:{max:1.50,typical:1.20}, Cr:{max:1.00,typical:0.60}, Mo:{max:0.60,typical:0.35}, Ni:{max:1.00,typical:0.50}, B:{max:0.005,typical:0.003} },
    'Bisalloy 600': { C:{max:0.40,typical:0.36}, Mn:{max:1.20,typical:0.90}, Cr:{max:1.50,typical:1.00}, Mo:{max:0.60,typical:0.45}, Ni:{max:1.50,typical:1.00} },
    'MIL-A-46099': { C:{max:0.32,typical:0.28}, Mn:{max:1.20,typical:0.90}, Cr:{max:1.50,typical:1.00}, Mo:{max:0.60,typical:0.40}, Ni:{max:2.00,typical:1.30} },
    
    // === STAINLESS ===
    '303': { C:{max:0.15,typical:0.08}, Cr:{min:17.0,max:19.0,typical:18.0}, Ni:{min:8.0,max:10.0,typical:9.0}, S:{min:0.15,max:0.35,typical:0.25}, Mn:{max:2.0,typical:1.5} },
    '416': { C:{max:0.15,typical:0.10}, Cr:{min:12.0,max:14.0,typical:13.0}, S:{min:0.15,max:0.35,typical:0.25}, Mo:{max:0.60,typical:0.30} },
    '440A': { C:{min:0.60,max:0.75,typical:0.68}, Cr:{min:16.0,max:18.0,typical:17.0}, Mo:{max:0.75,typical:0.40} },
    '440B': { C:{min:0.75,max:0.95,typical:0.85}, Cr:{min:16.0,max:18.0,typical:17.0}, Mo:{max:0.75,typical:0.40} },
    '440F': { C:{min:0.95,max:1.20,typical:1.08}, Cr:{min:16.0,max:18.0,typical:17.0}, Mo:{max:0.75,typical:0.40}, S:{min:0.10,max:0.35,typical:0.23} },
    '904L': { C:{max:0.02,typical:0.01}, Cr:{min:19.0,max:23.0,typical:21.0}, Ni:{min:23.0,max:28.0,typical:25.5}, Mo:{min:4.0,max:5.0,typical:4.5}, Cu:{min:1.0,max:2.0,typical:1.5} },
    'S32205': { C:{max:0.03,typical:0.02}, Cr:{min:22.0,max:23.0,typical:22.5}, Ni:{min:4.5,max:6.5,typical:5.5}, Mo:{min:3.0,max:3.5,typical:3.25}, N:{min:0.14,max:0.20,typical:0.17} },
    'S32750': { C:{max:0.03,typical:0.02}, Cr:{min:24.0,max:26.0,typical:25.0}, Ni:{min:6.0,max:8.0,typical:7.0}, Mo:{min:3.0,max:5.0,typical:4.0}, N:{min:0.24,max:0.32,typical:0.28} },
    
    // === CAST ALUMINUM ===
    'A380': { Si:{min:7.5,max:9.5,typical:8.5}, Cu:{min:3.0,max:4.0,typical:3.5}, Fe:{max:1.3,typical:0.80}, Zn:{max:3.0,typical:1.5}, Al:{typical:84.0} },
    '319': { Si:{min:5.5,max:6.5,typical:6.0}, Cu:{min:3.0,max:4.0,typical:3.5}, Fe:{max:1.0,typical:0.60}, Mg:{max:0.10}, Al:{typical:88.0} },
    'A413': { Si:{min:11.0,max:13.0,typical:12.0}, Fe:{max:1.3,typical:0.80}, Cu:{max:1.0,typical:0.50}, Al:{typical:85.0} },
    '535': { Mg:{min:6.2,max:7.5,typical:6.85}, Mn:{min:0.10,max:0.25,typical:0.18}, Ti:{min:0.10,max:0.25,typical:0.18}, Al:{typical:93.0} },
    
    // === WROUGHT ALUMINUM ===
    '6082': { Si:{min:0.7,max:1.3,typical:1.0}, Mg:{min:0.6,max:1.2,typical:0.9}, Mn:{min:0.40,max:1.00,typical:0.70}, Fe:{max:0.50}, Al:{typical:97.0} },
    '7055': { Zn:{min:7.6,max:8.4,typical:8.0}, Mg:{min:1.8,max:2.3,typical:2.05}, Cu:{min:2.0,max:2.6,typical:2.3}, Zr:{min:0.08,max:0.25,typical:0.17}, Al:{typical:87.0} },
    '7475': { Zn:{min:5.2,max:6.2,typical:5.7}, Mg:{min:1.9,max:2.6,typical:2.25}, Cu:{min:1.2,max:1.9,typical:1.55}, Cr:{min:0.18,max:0.25,typical:0.22}, Al:{typical:90.0} },
    '7178': { Zn:{min:6.3,max:7.3,typical:6.8}, Mg:{min:2.4,max:3.1,typical:2.75}, Cu:{min:1.6,max:2.4,typical:2.0}, Cr:{min:0.18,max:0.28,typical:0.23}, Al:{typical:88.0} },
    '7039': { Zn:{min:3.5,max:4.5,typical:4.0}, Mg:{min:2.3,max:3.3,typical:2.8}, Mn:{min:0.10,max:0.40,typical:0.25}, Cr:{min:0.15,max:0.25,typical:0.20}, Al:{typical:93.0} },
    
    // === TOOL STEELS ===
    'H21': { C:{min:0.26,max:0.36,typical:0.31}, Cr:{min:3.0,max:3.75,typical:3.38}, W:{min:8.50,max:10.00,typical:9.25}, V:{min:0.30,max:0.60,typical:0.45} },
    'P21': { C:{max:0.10,typical:0.05}, Ni:{min:3.75,max:4.25,typical:4.00}, Al:{min:1.05,max:1.25,typical:1.15}, Cr:{min:0.15,max:0.30,typical:0.23} },
    
    // === SUPERALLOYS ===
    'Hastelloy X': { C:{min:0.05,max:0.15,typical:0.10}, Cr:{min:20.5,max:23.0,typical:21.75}, Mo:{min:8.0,max:10.0,typical:9.0}, Fe:{min:17.0,max:20.0,typical:18.5}, Co:{min:0.5,max:2.5,typical:1.5}, W:{min:0.2,max:1.0,typical:0.6}, Ni:{typical:47.0} },
    'Hastelloy C-276': { C:{max:0.01,typical:0.005}, Cr:{min:14.5,max:16.5,typical:15.5}, Mo:{min:15.0,max:17.0,typical:16.0}, Fe:{min:4.0,max:7.0,typical:5.5}, W:{min:3.0,max:4.5,typical:3.75}, Co:{max:2.5,typical:1.25}, Ni:{typical:57.0} },
    'Incoloy 925': { Cr:{min:19.5,max:23.5,typical:21.5}, Ni:{min:42.0,max:46.0,typical:44.0}, Mo:{min:2.5,max:3.5,typical:3.0}, Cu:{min:1.5,max:3.0,typical:2.25}, Ti:{min:1.9,max:2.4,typical:2.15}, Al:{min:0.10,max:0.50,typical:0.30}, Fe:{typical:25.0} },
    'Inconel 600': { Cr:{min:14.0,max:17.0,typical:15.5}, Fe:{min:6.0,max:10.0,typical:8.0}, Mn:{max:1.0,typical:0.50}, Si:{max:0.50,typical:0.25}, Ni:{typical:72.0} },
    'Stellite 6': { Co:{typical:58.0}, Cr:{min:27.0,max:32.0,typical:29.5}, W:{min:4.0,max:6.0,typical:5.0}, C:{min:0.9,max:1.4,typical:1.15}, Ni:{max:3.0,typical:1.5}, Fe:{max:3.0,typical:1.5} },
    'Nimonic 80A': { Cr:{min:18.0,max:21.0,typical:19.5}, Ti:{min:1.8,max:2.7,typical:2.25}, Al:{min:1.0,max:1.8,typical:1.40}, Co:{max:2.0,typical:1.0}, Fe:{max:3.0,typical:1.5}, Ni:{typical:73.0} },
    'Ti-10V-2Fe-3Al': { V:{min:9.0,max:11.0,typical:10.0}, Fe:{min:1.6,max:2.2,typical:1.9}, Al:{min:2.6,max:3.4,typical:3.0}, Ti:{typical:83.0} },
    'CP Titanium Grade 1': { C:{max:0.08}, Fe:{max:0.20}, O:{max:0.18}, N:{max:0.03}, H:{max:0.015}, Ti:{min:99.3,typical:99.5} },
    
    // === SPECIALTY ===
    'AlN': { Al:{typical:65.8}, N:{typical:34.2} },
    'FR4': { Glass_fiber:{typical:60.0}, Epoxy_resin:{typical:40.0} },
    'G10': { Glass_fiber:{typical:60.0}, Epoxy_resin:{typical:40.0} },
    'G11': { Glass_fiber:{typical:60.0}, Epoxy_resin:{typical:40.0} },
    'Phenolic': { Phenol_formaldehyde:{typical:40.0}, Glass_fabric:{typical:60.0} },
    'Renshape': { Epoxy:{typical:100.0} },
    'EDM Graphite': { C:{typical:99.9} },
    'POCO': { C:{typical:99.9} },
    'Toyo Tanso': { C:{typical:99.9} },
    'Graphite': { C:{typical:99.9} },
};

function findComp2(name) {
    const n = name.toLowerCase();
    for (const [key, comp] of Object.entries(COMP_DB2)) {
        if (n.includes(key.toLowerCase())) return comp;
    }
    // Fallbacks
    if (n.includes('graphite') || n.includes('edm graph')) return COMP_DB2['Graphite'];
    if (n.includes('pcb') || n.includes('fr4') || n.includes('fr 4')) return COMP_DB2['FR4'];
    if (n.includes('phenolic')) return COMP_DB2['Phenolic'];
    if (n.includes('tooling board') || n.includes('renshape')) return COMP_DB2['Renshape'];
    if (n.includes('aln') || n.includes('shapal')) return COMP_DB2['AlN'];
    if (n.includes('super duplex') || n.includes('s32750') || n.includes('2507')) return COMP_DB2['S32750'];
    if (n.includes('duplex') || n.includes('s32205') || n.includes('2205')) return COMP_DB2['S32205'];
    if (n.includes('904l')) return COMP_DB2['904L'];
    if (n.includes('a380')) return COMP_DB2['A380'];
    if (n.includes('a413')) return COMP_DB2['A413'];
    return null;
}

let filled = 0, remaining = 0;
for (const g of GROUPS) {
    const dir = path.join(BASE, g);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const fp = path.join(dir, file);
        const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
        let json;
        try { json = JSON.parse(raw); } catch(e) { continue; }
        const arr = json.materials || (Array.isArray(json) ? json : [json]);
        let modified = false;
        for (const m of arr) {
            if (m.composition && Object.keys(m.composition).length > 0) continue;
            const comp = findComp2(m.name || '');
            if (comp) { m.composition = comp; filled++; modified = true; }
            else remaining++;
        }
        if (modified) fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
    }
}
console.log(`Round 2: ${filled} filled, ${remaining} still missing`);
