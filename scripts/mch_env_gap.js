const fs = require('fs');
const path = require('path');

// Find all machine files and check which are missing work_envelope/travels
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
let missing = [];
let byMfr = {};

for (const fp of machFiles) {
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { continue; }
    const arr = json.machines || (Array.isArray(json) ? json : [json]);
    
    for (const m of arr) {
        if (!m.id && !m.machine_id && !m.model) continue;
        const hasEnv = (m.travels?.x > 0) || (m.work_envelope?.x_mm > 0);
        if (!hasEnv) {
            const mfr = m.manufacturer || m.brand || path.basename(path.dirname(fp)) || 'unknown';
            const model = m.model || m.name || m.id || 'unknown';
            if (!byMfr[mfr]) byMfr[mfr] = [];
            byMfr[mfr].push({ model, id: m.id || m.machine_id, file: path.relative('C:\\PRISM\\data\\machines', fp) });
        }
    }
}

console.log('Machines missing work_envelope by manufacturer:\n');
let totalMissing = 0;
for (const [mfr, machines] of Object.entries(byMfr).sort((a,b) => b[1].length - a[1].length)) {
    console.log(`${mfr}: ${machines.length} missing`);
    console.log(`  Models: ${machines.slice(0,8).map(m => m.model).join(', ')}${machines.length > 8 ? '...' : ''}`);
    totalMissing += machines.length;
}
console.log(`\nTotal missing: ${totalMissing}`);
