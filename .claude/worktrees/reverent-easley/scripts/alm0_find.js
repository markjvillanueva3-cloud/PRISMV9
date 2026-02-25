const fs = require('fs');
const path = require('path');

// Search more broadly
function findFiles(dir, pattern) {
    let results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const fp = path.join(dir, e.name);
            if (e.isDirectory() && !e.name.includes('node_modules') && !e.name.includes('.git') && !e.name.includes('archive')) {
                results = results.concat(findFiles(fp, pattern));
            } else if (e.name.toLowerCase().includes(pattern) && e.name.endsWith('.json')) {
                const stat = fs.statSync(fp);
                results.push({ path: fp, size: stat.size });
            }
        }
    } catch(e) {}
    return results;
}

// Check mcp-server data too
const locations = ['C:\\PRISM\\data', 'C:\\PRISM\\mcp-server\\data', 'C:\\PRISM\\mcp-server\\src'];
for (const loc of locations) {
    const files = findFiles(loc, 'alarm');
    if (files.length > 0) {
        console.log(`\n${loc}:`);
        for (const f of files) {
            console.log(`  ${f.path} (${Math.round(f.size/1024)}KB)`);
        }
    }
}

// Check the AlarmRegistry source to see where it loads from
const regPath = 'C:\\PRISM\\mcp-server\\src\\registries\\AlarmRegistry.ts';
if (fs.existsSync(regPath)) {
    const src = fs.readFileSync(regPath, 'utf8');
    // Find load paths
    const pathMatches = src.match(/['"](.*alarm.*?)['"]/gi) || [];
    console.log('\nAlarmRegistry path references:');
    for (const m of pathMatches.slice(0, 20)) {
        console.log('  ' + m);
    }
}

// Also check ALARM_FIX_PROCEDURES structure
const fixPath = 'C:\\PRISM\\data\\controllers\\ALARM_FIX_PROCEDURES.json';
if (fs.existsSync(fixPath)) {
    const raw = fs.readFileSync(fixPath, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const topKeys = Object.keys(json);
    console.log('\nALARM_FIX_PROCEDURES top keys:', topKeys);
    if (json.procedures) console.log('  procedures count:', Object.keys(json.procedures).length);
    if (json.fix_procedures) console.log('  fix_procedures count:', Array.isArray(json.fix_procedures) ? json.fix_procedures.length : Object.keys(json.fix_procedures).length);
    // Count total procedures
    let procCount = 0;
    for (const key of topKeys) {
        const val = json[key];
        if (typeof val === 'object' && !Array.isArray(val)) {
            const subKeys = Object.keys(val);
            if (subKeys.length > 5) {
                console.log(`  ${key}: ${subKeys.length} entries, sample keys: ${subKeys.slice(0,3).join(', ')}`);
                procCount += subKeys.length;
            }
        }
    }
    if (procCount > 0) console.log(`  Total procedure entries: ${procCount}`);
}

// Check mcp-server data/controllers or data/alarms
const mcpControllers = 'C:\\PRISM\\mcp-server\\data\\controllers';
if (fs.existsSync(mcpControllers)) {
    const files = fs.readdirSync(mcpControllers);
    console.log('\nmcp-server/data/controllers/:', files);
}

const mcpAlarms = 'C:\\PRISM\\mcp-server\\data\\alarms';
if (fs.existsSync(mcpAlarms)) {
    const files = fs.readdirSync(mcpAlarms);
    console.log('\nmcp-server/data/alarms/:', files);
    let total = 0;
    for (const f of files.filter(f => f.endsWith('.json'))) {
        const raw = fs.readFileSync(path.join(mcpAlarms, f), 'utf8').replace(/^\uFEFF/, '');
        const json = JSON.parse(raw);
        const arr = json.alarms || json.alarm_codes || (Array.isArray(json) ? json : []);
        console.log(`  ${f}: ${arr.length} alarms`);
        total += arr.length;
    }
    console.log(`  TOTAL: ${total}`);
}
