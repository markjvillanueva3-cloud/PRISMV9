const fs = require('fs');
const path = require('path');

// Check ALL material files including expanded ones
function findJsonFiles(dir) {
    let r = [];
    try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const fp = path.join(dir, e.name);
            if (e.isDirectory()) r = r.concat(findJsonFiles(fp));
            else if (e.name.endsWith('.json') && !e.name.includes('HIERARCHY')) r.push(fp);
        }
    } catch(e) {}
    return r;
}

const files = findJsonFiles('C:\\PRISM\\data\\materials');
let stats = { total: 0, chip_formation: 0, bue: 0, work_hardening: 0, 
              wear_pattern: 0, surface_integrity: 0, thermal_machining: 0,
              coolant: 0, jc: 0, fatigue: 0 };

for (const fp of files) {
    try {
        const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
        const json = JSON.parse(raw);
        const arr = json.materials || (Array.isArray(json) ? json : [json]);
        for (const m of arr) {
            if (!m.name && !m.material_id) continue;
            stats.total++;
            if (m.chip_formation?.chip_type) stats.chip_formation++;
            if (m.chip_formation?.built_up_edge_tendency) stats.bue++;
            if (m.chip_formation?.work_hardening_severity) stats.work_hardening++;
            if (m.machinability?.tool_wear_pattern) stats.wear_pattern++;
            if (m.surface_integrity || m.surface?.achievable_ra_turning) stats.surface_integrity++;
            if (m.thermal_machining?.cutting_temperature_coefficient) stats.thermal_machining++;
            if (m.cutting_recommendations?.milling?.coolant_type || m.cutting_recommendations?.turning?.coolant_type || m.cutting_recommendations?.drilling?.coolant_type) stats.coolant++;
            if (m.johnson_cook?.A > 0) stats.jc++;
            if (m.mechanical?.fatigue_strength > 0) stats.fatigue++;
        }
    } catch(e) {}
}

console.log('=== FULL REGISTRY ADVANCED FIELD COVERAGE ===');
console.log(`Total materials: ${stats.total}`);
for (const [k,v] of Object.entries(stats)) {
    if (k === 'total') continue;
    console.log(`  ${k}: ${v} (${(v/stats.total*100).toFixed(0)}%)`);
}
