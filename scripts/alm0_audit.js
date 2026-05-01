const fs = require('fs');
const path = require('path');

// Find all alarm-related files
function findFiles(dir, pattern) {
    let results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const fp = path.join(dir, e.name);
            if (e.isDirectory() && !e.name.includes('node_modules') && !e.name.includes('.git')) {
                results = results.concat(findFiles(fp, pattern));
            } else if (e.name.toLowerCase().includes(pattern)) {
                results.push(fp);
            }
        }
    } catch(e) {}
    return results;
}

const alarmFiles = findFiles('C:\\PRISM\\data', 'alarm');
console.log('Alarm files found:');
for (const f of alarmFiles) {
    const stat = fs.statSync(f);
    console.log(`  ${f} (${Math.round(stat.size/1024)}KB)`);
}

// Load and analyze each
let totalAlarms = 0;
let byController = {};
let bySeverity = {};
let withFixProcedure = 0;

for (const fp of alarmFiles) {
    if (!fp.endsWith('.json')) continue;
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { console.log(`  PARSE ERROR: ${fp}: ${e.message}`); continue; }
    
    // Find alarm arrays - could be nested various ways
    let alarms = [];
    if (json.alarms) alarms = json.alarms;
    else if (json.alarm_codes) alarms = json.alarm_codes;
    else if (Array.isArray(json)) alarms = json;
    else if (json.controller_alarm_db) {
        // Core DB format: controller_alarm_db.controllers[].alarm_codes[]
        for (const ctrl of (json.controller_alarm_db.controllers || [])) {
            for (const alarm of (ctrl.alarm_codes || [])) {
                alarms.push({ ...alarm, controller_family: ctrl.controller_family });
            }
        }
    }
    
    console.log(`\n${path.basename(fp)}: ${alarms.length} alarms`);
    
    if (alarms.length > 0) {
        const first = alarms[0];
        console.log(`  Keys: ${Object.keys(first).join(', ')}`);
        console.log(`  Sample: code=${first.code||first.alarm_code||first.alarm_id}, name=${(first.name||first.message||first.description||'').substring(0,60)}`);
    }
    
    for (const a of alarms) {
        totalAlarms++;
        const ctrl = a.controller_family || a.controller || a.brand || 'unknown';
        byController[ctrl] = (byController[ctrl] || 0) + 1;
        const sev = a.severity || a.level || 'unknown';
        bySeverity[sev] = (bySeverity[sev] || 0) + 1;
        if (a.fix_procedure || a.fix_procedure_id || a.resolution || a.fix) withFixProcedure++;
    }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total alarms: ${totalAlarms}`);
console.log(`With fix procedure: ${withFixProcedure} (${Math.round(withFixProcedure/totalAlarms*100)}%)`);
console.log(`\nBy controller:`);
for (const [ctrl, count] of Object.entries(byController).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${ctrl}: ${count}`);
}
console.log(`\nBy severity:`);
for (const [sev, count] of Object.entries(bySeverity).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${sev}: ${count}`);
}
