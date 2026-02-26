const fs = require('fs');
const path = require('path');

const ALARM_DIR = 'C:\\PRISM\\extracted\\controllers\\alarms';
const files = fs.readdirSync(ALARM_DIR).filter(f => f.endsWith('.json'));

let byFile = {};
let allAlarmIds = new Set();
let duplicateIds = new Set();
let totalRaw = 0;

for (const file of files) {
    const fp = path.join(ALARM_DIR, file);
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { console.log(`ERROR: ${file}`); continue; }
    
    const alarms = json.alarms || (Array.isArray(json) ? json : []);
    const ids = alarms.map(a => a.alarm_id).filter(Boolean);
    
    let newIds = 0, dupes = 0;
    for (const id of ids) {
        if (allAlarmIds.has(id)) { dupes++; duplicateIds.add(id); }
        else { newIds++; allAlarmIds.add(id); }
    }
    totalRaw += alarms.length;
    
    // Extract controller from filename
    const ctrl = file.replace(/_ALARMS.*/, '').replace(/_COMPLETE.*/, '').replace(/_EXPANDED.*/, '');
    
    byFile[file] = { count: alarms.length, new: newIds, dupes, controller: ctrl };
    console.log(`${file}: ${alarms.length} alarms (${newIds} new, ${dupes} dupes)`);
}

console.log(`\nTotal raw alarms across all files: ${totalRaw}`);
console.log(`Unique alarm IDs: ${allAlarmIds.size}`);
console.log(`Duplicate IDs: ${duplicateIds.size}`);

// Group by controller to see overlap
const byController = {};
for (const [file, info] of Object.entries(byFile)) {
    if (!byController[info.controller]) byController[info.controller] = [];
    byController[info.controller].push({ file, count: info.count });
}

console.log(`\nBy controller (showing fragmentation):`);
for (const [ctrl, files] of Object.entries(byController).sort((a,b) => b[1].reduce((s,f) => s+f.count, 0) - a[1].reduce((s,f) => s+f.count, 0))) {
    const total = files.reduce((s,f) => s+f.count, 0);
    console.log(`  ${ctrl}: ${total} total across ${files.length} files`);
    for (const f of files) {
        console.log(`    ${f.file}: ${f.count}`);
    }
}

// Check fix procedure quality
let withFix = 0, withMultiStepFix = 0, fixSingleLine = 0;
for (const file of files) {
    const fp = path.join(ALARM_DIR, file);
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const alarms = json.alarms || (Array.isArray(json) ? json : []);
    
    for (const a of alarms) {
        if (a.fix_procedures && Array.isArray(a.fix_procedures) && a.fix_procedures.length > 0) {
            withMultiStepFix++;
        } else if (a.quick_fix || a.fix_procedure_id) {
            withFix++;
            if (typeof a.quick_fix === 'string' && a.quick_fix.length < 80) fixSingleLine++;
        }
    }
}

console.log(`\nFix procedure quality:`);
console.log(`  Multi-step fix_procedures[]: ${withMultiStepFix}`);
console.log(`  quick_fix only: ${withFix} (of which ${fixSingleLine} are single-line)`);
