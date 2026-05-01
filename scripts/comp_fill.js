const fs = require('fs');
const path = require('path');

const BASE = 'C:\\PRISM\\data\\materials';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];

// Extended composition database for gap-fill
const COMP_DB = {
    // === HARDENED / AR PLATES ===
    'AR400': { C:{min:0.20,max:0.27,typical:0.23}, Mn:{min:1.20,max:1.65,typical:1.40}, Cr:{max:0.70,typical:0.50}, Mo:{max:0.50,typical:0.25}, Si:{min:0.15,max:0.50,typical:0.30}, B:{min:0.001,max:0.005,typical:0.003} },
    'AR450': { C:{min:0.24,max:0.30,typical:0.27}, Mn:{min:1.20,max:1.65,typical:1.40}, Cr:{max:0.80,typical:0.60}, Mo:{max:0.50,typical:0.30}, Si:{min:0.15,max:0.50,typical:0.30}, B:{min:0.001,max:0.005,typical:0.003} },
    'AR500': { C:{min:0.28,max:0.35,typical:0.31}, Mn:{min:1.20,max:1.65,typical:1.40}, Cr:{max:1.00,typical:0.70}, Mo:{max:0.50,typical:0.35}, Si:{min:0.15,max:0.50,typical:0.30}, B:{min:0.001,max:0.005,typical:0.003} },
    'AR600': { C:{min:0.35,max:0.45,typical:0.40}, Mn:{min:0.80,max:1.40,typical:1.10}, Cr:{min:0.50,max:1.50,typical:1.00}, Mo:{min:0.20,max:0.60,typical:0.40}, Si:{min:0.15,max:0.50,typical:0.30} },
    'RHA': { C:{min:0.25,max:0.33,typical:0.29}, Mn:{min:0.75,max:1.00,typical:0.88}, Cr:{min:0.80,max:1.15,typical:0.98}, Mo:{min:0.35,max:0.55,typical:0.45}, Ni:{min:0.35,max:0.55,typical:0.45} },
    'HHA': { C:{min:0.42,max:0.50,typical:0.46}, Mn:{min:0.60,max:0.90,typical:0.75}, Cr:{min:0.95,max:1.50,typical:1.23}, Mo:{min:0.30,max:0.65,typical:0.48}, Ni:{min:0.40,max:0.60,typical:0.50} },
    'MIL-DTL-12560': { C:{min:0.25,max:0.35,typical:0.30}, Mn:{min:0.75,max:1.00,typical:0.88}, Cr:{min:0.80,max:1.15,typical:0.98}, Mo:{min:0.35,max:0.55,typical:0.45} },
    'MIL-DTL-46100': { C:{min:0.43,max:0.53,typical:0.48}, Mn:{min:0.60,max:0.90,typical:0.75}, Cr:{min:1.00,max:1.50,typical:1.25}, Mo:{min:0.30,max:0.60,typical:0.45} },
    
    // === CAST IRON ===
    'GG20': { C:{min:3.1,max:3.5,typical:3.30}, Si:{min:1.9,max:2.5,typical:2.20}, Mn:{min:0.5,max:0.8,typical:0.65}, P:{max:0.15}, S:{max:0.12} },
    'GGG60': { C:{min:3.4,max:3.8,typical:3.60}, Si:{min:2.2,max:2.8,typical:2.50}, Mn:{min:0.3,max:0.6,typical:0.45}, Mg:{min:0.035,max:0.060,typical:0.048} },
    'CGI': { C:{min:3.1,max:3.6,typical:3.35}, Si:{min:1.8,max:2.4,typical:2.10}, Mn:{min:0.2,max:0.5,typical:0.35}, Mg:{min:0.008,max:0.020,typical:0.014} },
    'ADI': { C:{min:3.4,max:3.8,typical:3.60}, Si:{min:2.2,max:2.8,typical:2.50}, Mn:{min:0.2,max:0.5,typical:0.35}, Mo:{min:0.10,max:0.30,typical:0.20}, Cu:{min:0.50,max:1.00,typical:0.75}, Mg:{min:0.035,max:0.060,typical:0.048} },
    
    // === STAINLESS ===
    '201': { C:{max:0.15,typical:0.10}, Cr:{min:16.0,max:18.0,typical:17.0}, Ni:{min:3.5,max:5.5,typical:4.5}, Mn:{min:5.5,max:7.5,typical:6.5}, N:{min:0.10,max:0.25,typical:0.18} },
    '302': { C:{max:0.15,typical:0.10}, Cr:{min:17.0,max:19.0,typical:18.0}, Ni:{min:8.0,max:10.0,typical:9.0}, Mn:{max:2.0,typical:1.5} },
    '310': { C:{max:0.25,typical:0.15}, Cr:{min:24.0,max:26.0,typical:25.0}, Ni:{min:19.0,max:22.0,typical:20.5}, Mn:{max:2.0,typical:1.5} },
    '321': { C:{max:0.08,typical:0.05}, Cr:{min:17.0,max:19.0,typical:18.0}, Ni:{min:9.0,max:12.0,typical:10.5}, Ti:{min:0.40,max:0.70,typical:0.55} },
    '347': { C:{max:0.08,typical:0.05}, Cr:{min:17.0,max:19.0,typical:18.0}, Ni:{min:9.0,max:13.0,typical:11.0}, Nb:{min:0.70,max:1.00,typical:0.85} },
    '409': { C:{max:0.08,typical:0.04}, Cr:{min:10.5,max:11.75,typical:11.13}, Ti:{min:0.20,max:0.50,typical:0.35} },
    '430': { C:{max:0.12,typical:0.06}, Cr:{min:16.0,max:18.0,typical:17.0}, Mn:{max:1.0,typical:0.5} },
    '434': { C:{max:0.12,typical:0.06}, Cr:{min:16.0,max:18.0,typical:17.0}, Mo:{min:0.75,max:1.25,typical:1.0} },
    '446': { C:{max:0.20,typical:0.12}, Cr:{min:23.0,max:27.0,typical:25.0}, N:{min:0.10,max:0.25,typical:0.18} },
    
    // === NONFERROUS - Aluminum alloys ===
    '2195': { Cu:{min:3.7,max:4.3,typical:4.0}, Li:{min:0.8,max:1.2,typical:1.0}, Mg:{min:0.25,max:0.80,typical:0.53}, Ag:{min:0.25,max:0.60,typical:0.43}, Zr:{min:0.08,max:0.16,typical:0.12}, Al:{typical:93.0} },
    '2090': { Cu:{min:2.4,max:3.0,typical:2.7}, Li:{min:1.9,max:2.6,typical:2.25}, Zr:{min:0.08,max:0.15,typical:0.12}, Al:{typical:94.0} },
    '5052': { Mg:{min:2.2,max:2.8,typical:2.5}, Cr:{min:0.15,max:0.35,typical:0.25}, Fe:{max:0.40}, Si:{max:0.25}, Al:{typical:97.0} },
    '5083': { Mg:{min:4.0,max:4.9,typical:4.45}, Mn:{min:0.40,max:1.00,typical:0.70}, Cr:{min:0.05,max:0.25,typical:0.15}, Al:{typical:94.0} },
    '6063': { Si:{min:0.20,max:0.60,typical:0.40}, Mg:{min:0.45,max:0.90,typical:0.68}, Fe:{max:0.35}, Al:{typical:98.5} },
    
    // === NONFERROUS - Copper alloys ===
    'C172': { Cu:{min:96.0,max:97.5,typical:96.75}, Be:{min:1.6,max:2.0,typical:1.8}, Co:{min:0.20,max:0.60,typical:0.40} },
    'C260': { Cu:{min:68.5,max:71.5,typical:70.0}, Zn:{typical:30.0} },
    'C464': { Cu:{min:59.0,max:62.0,typical:60.5}, Sn:{min:0.5,max:1.0,typical:0.75}, Zn:{typical:38.0} },
    'C510': { Cu:{min:93.6,max:95.4,typical:94.5}, Sn:{min:4.2,max:5.8,typical:5.0}, P:{min:0.03,max:0.35,typical:0.19} },
    'C544': { Cu:{min:86.5,max:89.5,typical:88.0}, Sn:{min:3.5,max:4.5,typical:4.0}, Pb:{min:3.5,max:4.5,typical:4.0}, Zn:{min:1.5,max:4.5,typical:3.0} },
    'C630': { Cu:{min:80.0,max:83.0,typical:81.5}, Al:{min:9.0,max:11.0,typical:10.0}, Fe:{min:2.0,max:4.0,typical:3.0}, Ni:{min:4.0,max:5.5,typical:4.75} },
    'C655': { Cu:{min:93.0,max:96.0,typical:94.5}, Si:{min:2.8,max:3.5,typical:3.15}, Mn:{min:0.50,max:1.30,typical:0.90} },
    'C706': { Cu:{min:86.5,max:90.5,typical:88.5}, Ni:{min:9.0,max:11.0,typical:10.0}, Fe:{min:1.0,max:1.8,typical:1.4} },
    'C715': { Cu:{min:63.5,max:66.5,typical:65.0}, Ni:{min:29.0,max:33.0,typical:31.0}, Fe:{min:0.40,max:1.00,typical:0.70} },
    'C932': { Cu:{min:81.0,max:85.0,typical:83.0}, Sn:{min:6.0,max:8.0,typical:7.0}, Pb:{min:6.5,max:8.5,typical:7.5}, Zn:{min:1.0,max:4.0,typical:2.5} },
    'C954': { Cu:{min:83.0,max:86.5,typical:84.75}, Al:{min:10.0,max:11.5,typical:10.75}, Fe:{min:3.0,max:5.0,typical:4.0}, Ni:{min:1.5,max:2.5,typical:2.0} },
    
    // === NONFERROUS - Titanium ===
    'Ti-5Al-2.5Sn': { Al:{min:4.5,max:5.75,typical:5.13}, Sn:{min:2.0,max:3.0,typical:2.5}, Fe:{max:0.50}, O:{max:0.20}, Ti:{typical:92.0} },
    'Ti-3Al-2.5V': { Al:{min:2.5,max:3.5,typical:3.0}, V:{min:2.0,max:3.0,typical:2.5}, Fe:{max:0.30}, O:{max:0.12}, Ti:{typical:94.0} },
    'Ti-6Al-2Sn-4Zr-6Mo': { Al:{min:5.5,max:6.5,typical:6.0}, Sn:{min:1.75,max:2.25,typical:2.0}, Zr:{min:3.5,max:4.5,typical:4.0}, Mo:{min:5.5,max:6.5,typical:6.0}, Ti:{typical:81.5} },
    'CP Ti Grade 2': { C:{max:0.08}, Fe:{max:0.30}, O:{max:0.25}, N:{max:0.03}, H:{max:0.015}, Ti:{min:99.2,typical:99.4} },
    'CP Ti Grade 5': { Al:{min:5.5,max:6.75,typical:6.0}, V:{min:3.5,max:4.5,typical:4.0}, Fe:{max:0.40}, Ti:{typical:89.5} },
    
    // === NONFERROUS - Magnesium ===
    'AZ31': { Al:{min:2.5,max:3.5,typical:3.0}, Zn:{min:0.6,max:1.4,typical:1.0}, Mn:{min:0.20,typical:0.30}, Mg:{typical:95.5} },
    'AZ91': { Al:{min:8.3,max:9.7,typical:9.0}, Zn:{min:0.35,max:1.00,typical:0.68}, Mn:{min:0.13,typical:0.20}, Mg:{typical:90.0} },
    
    // === NONFERROUS - Nickel ===
    'Monel 400': { Ni:{min:63.0,max:70.0,typical:66.5}, Cu:{min:28.0,max:34.0,typical:31.0}, Fe:{max:2.5,typical:1.5}, Mn:{max:2.0,typical:1.0} },
    'Monel K-500': { Ni:{min:63.0,max:70.0,typical:66.5}, Cu:{min:27.0,max:33.0,typical:30.0}, Al:{min:2.3,max:3.15,typical:2.73}, Ti:{min:0.35,max:0.85,typical:0.60} },
    
    // === TOOL STEELS (P_STEELS gap) ===
    'D3': { C:{min:2.00,max:2.35,typical:2.18}, Cr:{min:11.0,max:13.5,typical:12.25}, V:{max:1.0,typical:0.50} },
    'A6': { C:{min:0.65,max:0.75,typical:0.70}, Mn:{min:1.80,max:2.50,typical:2.15}, Cr:{min:0.90,max:1.20,typical:1.05}, Mo:{min:0.90,max:1.40,typical:1.15} },
    '1080': { C:{min:0.75,max:0.88,typical:0.82}, Mn:{min:0.60,max:0.90,typical:0.75}, Si:{min:0.15,max:0.30,typical:0.22}, P:{max:0.040}, S:{max:0.050} },
    'M4': { C:{min:1.25,max:1.40,typical:1.33}, Cr:{min:3.75,max:4.50,typical:4.13}, Mo:{min:4.25,max:5.50,typical:4.88}, W:{min:5.25,max:6.50,typical:5.88}, V:{min:3.75,max:4.50,typical:4.13} },
    'T1': { C:{min:0.65,max:0.80,typical:0.73}, Cr:{min:3.75,max:4.50,typical:4.13}, W:{min:17.25,max:18.75,typical:18.00}, V:{min:0.90,max:1.30,typical:1.10} },
    'T15': { C:{min:1.50,max:1.60,typical:1.55}, Cr:{min:3.75,max:5.00,typical:4.38}, W:{min:11.75,max:13.00,typical:12.38}, V:{min:4.50,max:5.25,typical:4.88}, Co:{min:4.75,max:5.25,typical:5.00} },
    
    // === SUPERALLOYS ===
    'Rene 41': { C:{min:0.06,max:0.12,typical:0.09}, Cr:{min:18.0,max:20.0,typical:19.0}, Mo:{min:9.0,max:10.5,typical:9.75}, Co:{min:10.0,max:12.0,typical:11.0}, Ti:{min:3.0,max:3.3,typical:3.15}, Al:{min:1.4,max:1.8,typical:1.6}, Ni:{typical:52.0} },
    'Haynes 230': { C:{min:0.05,max:0.15,typical:0.10}, Cr:{min:20.0,max:24.0,typical:22.0}, W:{min:13.0,max:15.0,typical:14.0}, Mo:{min:1.0,max:3.0,typical:2.0}, Co:{max:5.0,typical:2.5}, Ni:{typical:57.0} },
    'MP35N': { Co:{min:33.0,max:37.0,typical:35.0}, Ni:{min:33.0,max:37.0,typical:35.0}, Cr:{min:19.0,max:21.0,typical:20.0}, Mo:{min:9.0,max:10.5,typical:9.75} },
    'Inconel 617': { Cr:{min:20.0,max:24.0,typical:22.0}, Co:{min:10.0,max:15.0,typical:12.5}, Mo:{min:8.0,max:10.0,typical:9.0}, Al:{min:0.80,max:1.50,typical:1.15}, Ni:{typical:52.0} },
    'Incoloy 800': { Cr:{min:19.0,max:23.0,typical:21.0}, Ni:{min:30.0,max:35.0,typical:32.5}, Fe:{typical:39.5}, Ti:{min:0.15,max:0.60,typical:0.38}, Al:{min:0.15,max:0.60,typical:0.38} },
    'Incoloy 825': { Cr:{min:19.5,max:23.5,typical:21.5}, Ni:{min:38.0,max:46.0,typical:42.0}, Mo:{min:2.5,max:3.5,typical:3.0}, Cu:{min:1.5,max:3.0,typical:2.25}, Ti:{min:0.6,max:1.2,typical:0.9}, Fe:{typical:30.0} },
    'Incoloy 901': { Cr:{min:11.0,max:14.0,typical:12.5}, Ni:{min:40.0,max:45.0,typical:42.5}, Mo:{min:5.0,max:6.5,typical:5.75}, Ti:{min:2.35,max:3.00,typical:2.68}, Fe:{typical:34.0} },
    
    // === SPECIALTY / CERAMICS (composition = formula) ===
    'SiC': { Si:{typical:70.0}, C:{typical:30.0} },
    'Si3N4': { Si:{typical:60.1}, N:{typical:39.9} },
    'Macor': { SiO2:{typical:46.0}, MgO:{typical:17.0}, Al2O3:{typical:16.0}, K2O:{typical:10.0}, B2O3:{typical:7.0}, F:{typical:4.0} },
    'BN': { B:{typical:43.6}, N:{typical:56.4} },
    'Steatite': { MgO:{typical:31.7}, SiO2:{typical:63.4}, Al2O3:{typical:4.9} },
    'Cordierite': { MgO:{typical:13.8}, Al2O3:{typical:34.9}, SiO2:{typical:51.3} },
    'GFRP': { Glass_fiber:{typical:60.0}, Epoxy_resin:{typical:40.0} },
    'CFRP': { Carbon_fiber:{typical:60.0}, Epoxy_resin:{typical:40.0} },
    'Kevlar': { Aramid_fiber:{typical:60.0}, Epoxy_resin:{typical:40.0} },
    'PEEK': { C:{typical:79.0}, H:{typical:4.2}, O:{typical:16.8} },
    'UHMWPE': { C:{typical:85.7}, H:{typical:14.3} },
    'Delrin': { C:{typical:40.0}, H:{typical:6.7}, O:{typical:53.3} },
    'Nylon': { C:{typical:63.7}, H:{typical:9.8}, N:{typical:12.4}, O:{typical:14.1} },
};

// Match function - more aggressive matching
function findComp(name) {
    const n = name.toLowerCase().replace(/[_\-]/g, ' ');
    
    for (const [key, comp] of Object.entries(COMP_DB)) {
        const k = key.toLowerCase().replace(/[_\-]/g, ' ');
        if (n.includes(k)) return comp;
    }
    
    // Try partial matches
    if (n.includes('ar400') || n.includes('ar 400')) return COMP_DB['AR400'];
    if (n.includes('ar450') || n.includes('ar 450')) return COMP_DB['AR450'];
    if (n.includes('ar500') || n.includes('ar 500')) return COMP_DB['AR500'];
    if (n.includes('ar600') || n.includes('ar 600')) return COMP_DB['AR600'];
    if (n.includes('rha') || n.includes('rolled homogeneous')) return COMP_DB['RHA'];
    if (n.includes('hha') || n.includes('high hardness armor')) return COMP_DB['HHA'];
    if (n.includes('monel 400') || n.includes('monel400')) return COMP_DB['Monel 400'];
    if (n.includes('monel k') || n.includes('k-500') || n.includes('k500')) return COMP_DB['Monel K-500'];
    if (n.includes('az31')) return COMP_DB['AZ31'];
    if (n.includes('az91')) return COMP_DB['AZ91'];
    if (n.includes('grade 2') && n.includes('ti')) return COMP_DB['CP Ti Grade 2'];
    if (n.includes('grade 5') && n.includes('ti')) return COMP_DB['CP Ti Grade 5'];
    if (n.includes('rene 41') || n.includes('rené 41')) return COMP_DB['Rene 41'];
    if (n.includes('haynes 230')) return COMP_DB['Haynes 230'];
    if (n.includes('mp35n')) return COMP_DB['MP35N'];
    if (n.includes('inconel 617') || n.includes('alloy 617')) return COMP_DB['Inconel 617'];
    if (n.includes('incoloy 800h') || n.includes('n08810')) return COMP_DB['Incoloy 800'];
    if (n.includes('incoloy 800') || n.includes('n08800')) return COMP_DB['Incoloy 800'];
    if (n.includes('incoloy 825') || n.includes('n08825')) return COMP_DB['Incoloy 825'];
    if (n.includes('incoloy 901') || n.includes('n09901')) return COMP_DB['Incoloy 901'];
    if (n.includes('silicon carbide') || n.includes('sic')) return COMP_DB['SiC'];
    if (n.includes('silicon nitride') || n.includes('si3n4')) return COMP_DB['Si3N4'];
    if (n.includes('boron nitride') || n.includes('hbn') || n.includes('cbn')) return COMP_DB['BN'];
    if (n.includes('gfrp') || n.includes('glass fiber')) return COMP_DB['GFRP'];
    if (n.includes('cfrp') || n.includes('carbon fiber')) return COMP_DB['CFRP'];
    if (n.includes('kevlar') || n.includes('aramid')) return COMP_DB['Kevlar'];
    if (n.includes('peek')) return COMP_DB['PEEK'];
    if (n.includes('uhmwpe') || n.includes('ultra high molecular')) return COMP_DB['UHMWPE'];
    if (n.includes('delrin') || n.includes('acetal') || n.includes('pom')) return COMP_DB['Delrin'];
    if (n.includes('nylon') || n.includes('polyamide')) return COMP_DB['Nylon'];
    if (n.includes('steatite')) return COMP_DB['Steatite'];
    if (n.includes('cordierite')) return COMP_DB['Cordierite'];
    if (n.includes('macor')) return COMP_DB['Macor'];
    if (n.includes('5052')) return COMP_DB['5052'];
    if (n.includes('5083')) return COMP_DB['5083'];
    if (n.includes('6063')) return COMP_DB['6063'];
    
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
            
            const comp = findComp(m.name || '');
            if (comp) {
                m.composition = comp;
                filled++;
                modified = true;
            } else {
                remaining++;
            }
        }
        
        if (modified) {
            fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
        }
    }
}

console.log(`Composition gap-fill: ${filled} filled, ${remaining} still missing`);
