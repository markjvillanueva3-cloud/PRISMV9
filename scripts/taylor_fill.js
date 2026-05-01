const fs = require('fs');
const path = require('path');

const MAT_DIR = 'C:\\PRISM\\data\\materials';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];

// Taylor coefficient estimation from ISO group + hardness
// V*T^n = C where V=cutting speed (m/min), T=tool life (min)
// C = Taylor constant (higher = easier to machine), n = exponent (0.1-0.5)
// Values for carbide tooling
function estimateTaylor(isoGroup, hardnessBHN, name) {
    const n = name.toLowerCase();
    
    // Skip non-machinable materials
    if (n.includes('ceramic') || n.includes('glass') || n.includes('graphite') || 
        n.includes('polymer') || n.includes('rubber') || n.includes('foam') ||
        n.includes('concrete') || n.includes('stone') || n.includes('wood')) {
        return null; // No Taylor for non-metals
    }
    
    const hb = hardnessBHN || 200;
    
    switch (isoGroup) {
        case 'P': // Steels
            // C decreases with hardness: C ≈ 400 - 0.8*HB for carbide
            // n typically 0.20-0.30 for carbide
            if (hb < 150) return { C: Math.round(350 - 0.5 * hb), n: 0.28, tool_material: 'Carbide', _generated: true };
            if (hb < 250) return { C: Math.round(300 - 0.4 * hb), n: 0.25, tool_material: 'Carbide', _generated: true };
            if (hb < 350) return { C: Math.round(250 - 0.3 * hb), n: 0.22, tool_material: 'Carbide', _generated: true };
            return { C: Math.round(200 - 0.2 * hb), n: 0.20, tool_material: 'Carbide', _generated: true };
            
        case 'M': // Stainless
            // Lower C than P due to work hardening, adhesion
            if (hb < 200) return { C: 180, n: 0.22, tool_material: 'Carbide', _generated: true };
            if (hb < 300) return { C: 150, n: 0.20, tool_material: 'Carbide', _generated: true };
            return { C: 120, n: 0.18, tool_material: 'Carbide', _generated: true };
            
        case 'K': // Cast iron
            // Generally good machinability (except ADI)
            if (n.includes('adi') || n.includes('austempered')) {
                return { C: 120, n: 0.20, tool_material: 'Carbide', _generated: true };
            }
            if (n.includes('gray') || n.includes('gg')) return { C: 250, n: 0.25, tool_material: 'Carbide', _generated: true };
            if (n.includes('ductile') || n.includes('ggg')) return { C: 200, n: 0.25, tool_material: 'Carbide', _generated: true };
            if (n.includes('cgi') || n.includes('compacted')) return { C: 180, n: 0.22, tool_material: 'Carbide', _generated: true };
            return { C: 200, n: 0.25, tool_material: 'Carbide', _generated: true };
            
        case 'N': // Non-ferrous
            if (n.includes('titanium') || n.includes('ti-')) {
                return { C: 100, n: 0.20, tool_material: 'Carbide', _generated: true };
            }
            if (n.includes('nickel') || n.includes('monel')) {
                return { C: 90, n: 0.18, tool_material: 'Carbide', _generated: true };
            }
            if (n.includes('copper') || n.includes('brass') || n.includes('bronze') || n.match(/^c\d{3}/)) {
                return { C: 300, n: 0.28, tool_material: 'Carbide', _generated: true };
            }
            if (n.includes('magnesium') || n.includes('az')) {
                return { C: 900, n: 0.35, tool_material: 'Carbide', _generated: true };
            }
            // Default aluminum
            return { C: 800, n: 0.30, tool_material: 'Carbide', _generated: true };
            
        case 'S': // Superalloys
            if (n.includes('stellite') || n.includes('cobalt')) {
                return { C: 60, n: 0.15, tool_material: 'Carbide', _generated: true };
            }
            if (n.includes('inconel') || n.includes('hastelloy') || n.includes('waspaloy')) {
                return { C: 80, n: 0.18, tool_material: 'Carbide', _generated: true };
            }
            if (n.includes('incoloy')) {
                return { C: 100, n: 0.20, tool_material: 'Carbide', _generated: true };
            }
            return { C: 80, n: 0.18, tool_material: 'Carbide', _generated: true };
            
        case 'H': // Hardened
            if (hb > 500 || (n.includes('hrc') && parseInt(n.match(/(\d+)\s*hrc/i)?.[1] || '0') > 55)) {
                return { C: 80, n: 0.15, tool_material: 'CBN', _generated: true };
            }
            if (hb > 400) return { C: 100, n: 0.18, tool_material: 'Carbide', _generated: true };
            return { C: 150, n: 0.20, tool_material: 'Carbide', _generated: true };
            
        case 'X': // Specialty
            // AM metals use same as base alloy
            if (n.includes('slm') || n.includes('ebm') || n.includes('dmls') || n.includes('additive')) {
                if (n.includes('ti-6al') || n.includes('titanium')) return { C: 90, n: 0.18, tool_material: 'Carbide', _generated: true };
                if (n.includes('inconel') || n.includes('718') || n.includes('625')) return { C: 70, n: 0.16, tool_material: 'Carbide', _generated: true };
                if (n.includes('316') || n.includes('stainless')) return { C: 140, n: 0.20, tool_material: 'Carbide', _generated: true };
                if (n.includes('aluminum') || n.includes('alsi')) return { C: 600, n: 0.28, tool_material: 'Carbide', _generated: true };
                if (n.includes('steel') || n.includes('maraging') || n.includes('h13')) return { C: 160, n: 0.22, tool_material: 'Carbide', _generated: true };
                if (n.includes('cobalt') || n.includes('chrome')) return { C: 60, n: 0.15, tool_material: 'Carbide', _generated: true };
                if (n.includes('copper') || n.includes('cuw')) return { C: 250, n: 0.25, tool_material: 'Carbide', _generated: true };
                if (n.includes('tungsten') || n.includes('w-')) return { C: 50, n: 0.12, tool_material: 'Carbide', _generated: true };
            }
            // Composites
            if (n.includes('cfrp') || n.includes('carbon fiber')) return { C: 300, n: 0.25, tool_material: 'PCD', _generated: true };
            if (n.includes('gfrp') || n.includes('glass fiber')) return { C: 350, n: 0.25, tool_material: 'PCD', _generated: true };
            if (n.includes('kevlar') || n.includes('aramid')) return { C: 250, n: 0.22, tool_material: 'PCD', _generated: true };
            // Plastics
            if (n.includes('peek') || n.includes('pom') || n.includes('delrin') || n.includes('nylon') || 
                n.includes('acetal') || n.includes('polyamide') || n.includes('uhmwpe') || n.includes('teflon') ||
                n.includes('polycarbonate') || n.includes('acrylic') || n.includes('abs') || n.includes('pvc')) {
                return { C: 1000, n: 0.35, tool_material: 'Carbide', _generated: true };
            }
            // Refractory metals
            if (n.includes('tungsten') || n.includes('molybdenum') || n.includes('tantalum') || n.includes('niobium')) {
                return { C: 50, n: 0.12, tool_material: 'Carbide', _generated: true };
            }
            return null; // Can't estimate for ceramics, glass, etc.
            
        default:
            return null;
    }
}

// Also generate Johnson-Cook + cutting_recommendations from Taylor
function generateJC(isoGroup, hardnessBHN) {
    const hb = hardnessBHN || 200;
    switch (isoGroup) {
        case 'P': return { A: 350 + hb * 0.5, B: 600, n: 0.30, C: 0.015, m: 1.0, T_melt: 1500, T_ref: 20, _generated: true };
        case 'M': return { A: 310 + hb * 0.4, B: 800, n: 0.45, C: 0.020, m: 1.1, T_melt: 1400, T_ref: 20, _generated: true };
        case 'K': return { A: 250 + hb * 0.3, B: 500, n: 0.25, C: 0.012, m: 0.9, T_melt: 1200, T_ref: 20, _generated: true };
        case 'N': return { A: 120 + hb * 0.2, B: 300, n: 0.35, C: 0.025, m: 1.2, T_melt: 660, T_ref: 20, _generated: true };
        case 'S': return { A: 450 + hb * 0.3, B: 1200, n: 0.50, C: 0.018, m: 1.3, T_melt: 1350, T_ref: 20, _generated: true };
        case 'H': return { A: 500 + hb * 0.4, B: 700, n: 0.28, C: 0.012, m: 0.9, T_melt: 1500, T_ref: 20, _generated: true };
        case 'X': return { A: 300, B: 500, n: 0.30, C: 0.015, m: 1.0, T_melt: 1200, T_ref: 20, _generated: true };
        default: return null;
    }
}

function generateCutRec(isoGroup, taylor) {
    if (!taylor) return null;
    const vcRough = Math.round(taylor.C * 0.5); // ~50% of Taylor C as starting speed
    const vcFinish = Math.round(taylor.C * 0.7);
    return {
        milling: {
            roughing: { speed: vcRough, fz_mm: 0.15, ap_max_factor: 1.0 },
            finishing: { speed: vcFinish, fz_mm: 0.08, ap_max_factor: 0.3 }
        },
        turning: {
            roughing: { speed: Math.round(vcRough * 0.9), fn_mm: 0.25, ap_max_mm: 3.0 },
            finishing: { speed: Math.round(vcFinish * 0.9), fn_mm: 0.10, ap_max_mm: 0.5 }
        },
        _generated: true
    };
}

let taylorFilled = 0, jcFilled = 0, cutRecFilled = 0, skipped = 0;

for (const g of GROUPS) {
    const dir = path.join(MAT_DIR, g);
    if (!fs.existsSync(dir)) continue;
    
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const fp = path.join(dir, f);
        const json = JSON.parse(fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
        const arr = json.materials || [];
        let modified = false;
        
        for (const m of arr) {
            const hb = m.mechanical?.hardness?.brinell || 0;
            
            if (!m.taylor || !m.taylor.C || m.taylor.C <= 0) {
                const t = estimateTaylor(g[0], hb, m.name || '');
                if (t) { m.taylor = t; taylorFilled++; modified = true; }
                else skipped++;
            }
            
            if (!m.johnson_cook || !m.johnson_cook.A || m.johnson_cook.A <= 0) {
                const jc = generateJC(g[0], hb);
                if (jc) { m.johnson_cook = jc; jcFilled++; modified = true; }
            }
            
            if (!m.cutting_recommendations || Object.keys(m.cutting_recommendations).length === 0) {
                const cr = generateCutRec(g[0], m.taylor);
                if (cr) { m.cutting_recommendations = cr; cutRecFilled++; modified = true; }
            }
        }
        
        if (modified) fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
    }
}

console.log(`=== TAYLOR/JC/CUTREC GAP-FILL ===`);
console.log(`Taylor filled: ${taylorFilled}`);
console.log(`Johnson-Cook filled: ${jcFilled}`);
console.log(`Cutting recommendations filled: ${cutRecFilled}`);
console.log(`Skipped (non-machinable): ${skipped}`);
