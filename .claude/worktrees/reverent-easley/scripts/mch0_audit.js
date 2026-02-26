const fs = require('fs');
const path = require('path');

const MACH_DIR = 'C:\\PRISM\\data\\machines';

// Check what directories exist
const dirs = fs.readdirSync(MACH_DIR);
console.log('Machine directories:', dirs);

// Find all JSON files recursively
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
console.log(`Total JSON files: ${files.length}`);

let totalMachines = 0;
let withSpindleRPM = 0, withSpindlePower = 0, withSpindleNose = 0;
let withEnvelope = 0, withTurretType = 0, withToolChanger = 0;
let withControllerBrand = 0;
let byType = {};

for (const fp of files) {
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { continue; }
    
    const arr = json.machines || (Array.isArray(json) ? json : [json]);
    for (const m of arr) {
        if (!m.id && !m.machine_id && !m.model) continue; // skip non-machine entries
        totalMachines++;
        
        const type = (m.type || m.machine_type || 'unknown').toLowerCase();
        byType[type] = (byType[type] || 0) + 1;
        
        // Check key fields
        if (m.spindle?.max_rpm > 0) withSpindleRPM++;
        if (m.spindle?.power_continuous > 0 || m.spindle?.power_kw > 0) withSpindlePower++;
        if (m.spindle?.spindle_nose || m.spindle?.interface || m.spindle_interface) withSpindleNose++;
        if (m.envelope?.x > 0 || m.work_envelope?.x > 0 || m.travels?.x > 0) withEnvelope++;
        if (m.turret?.type || m.turret_type) withTurretType++;
        if (m.tool_changer?.capacity > 0) withToolChanger++;
        if (m.controller?.brand || m.controller?.manufacturer) withControllerBrand++;
    }
}

console.log(`\nTotal machines: ${totalMachines}`);
console.log(`\nField coverage:`);
console.log(`  spindle_rpm: ${withSpindleRPM} (${Math.round(withSpindleRPM/totalMachines*100)}%)`);
console.log(`  spindle_power: ${withSpindlePower} (${Math.round(withSpindlePower/totalMachines*100)}%)`);
console.log(`  spindle_nose: ${withSpindleNose} (${Math.round(withSpindleNose/totalMachines*100)}%)`);
console.log(`  work_envelope: ${withEnvelope} (${Math.round(withEnvelope/totalMachines*100)}%)`);
console.log(`  turret_type: ${withTurretType} (${Math.round(withTurretType/totalMachines*100)}%)`);
console.log(`  tool_changer: ${withToolChanger} (${Math.round(withToolChanger/totalMachines*100)}%)`);
console.log(`  controller_brand: ${withControllerBrand} (${Math.round(withControllerBrand/totalMachines*100)}%)`);

console.log(`\nBy type:`);
for (const [type, count] of Object.entries(byType).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${type}: ${count}`);
}
