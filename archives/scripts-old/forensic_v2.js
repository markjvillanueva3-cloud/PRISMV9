const fs = require('fs');
const path = require('path');

console.log('=== FORENSIC DATA UTILIZATION AUDIT ===\n');

// Get a full material sample
const matFile = fs.readFileSync('C:\\PRISM\\data\\materials\\P_STEELS\\chromoly_verified.json', 'utf8').replace(/^\uFEFF/, '');
const matArr = JSON.parse(matFile);
const matSample = matArr.materials ? matArr.materials[0] : matArr;

function listFields(obj, prefix = '', depth = 0) {
    const fields = [];
    if (!obj || typeof obj !== 'object') return fields;
    for (const [k, v] of Object.entries(obj)) {
        const fp = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v) && depth < 4) {
            fields.push(...listFields(v, fp, depth + 1));
        } else {
            fields.push(fp);
        }
    }
    return fields;
}

const matFields = listFields(matSample);
console.log(`Material field count: ${matFields.length}`);

// Get ALL source code
const srcDir = 'C:\\PRISM\\mcp-server\\src';
function getAllTsFiles(dir) {
    let files = [];
    try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.name === 'node_modules') continue;
            const fp = path.join(dir, e.name);
            if (e.isDirectory()) files = files.concat(getAllTsFiles(fp));
            else if (e.name.endsWith('.ts')) files.push(fp);
        }
    } catch(e) {}
    return files;
}

const tsFiles = getAllTsFiles(srcDir);
const allCode = tsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
console.log(`Source files scanned: ${tsFiles.length}`);

// Also scan skills for usage
const skillDir = 'C:\\PRISM\\skills-consolidated';
let skillCode = '';
try {
    const skills = fs.readdirSync(skillDir);
    for (const s of skills) {
        const sp = path.join(skillDir, s, 'SKILL.md');
        try { skillCode += fs.readFileSync(sp, 'utf8'); } catch(e) {}
    }
} catch(e) {}

const codeToSearch = allCode + '\n' + skillCode;

// Check each field
const used = [];
const unused = [];
for (const fp of matFields) {
    const leaf = fp.split('.').pop();
    // Skip generic names that would false-positive
    if (['min','max','typical','type','name','id','sources','method'].includes(leaf)) { used.push(fp); continue; }
    
    const found = codeToSearch.includes(leaf) || 
                  codeToSearch.includes(`'${leaf}'`) || 
                  codeToSearch.includes(`"${leaf}"`) ||
                  codeToSearch.includes(`.${leaf}`);
    if (found) used.push(fp);
    else unused.push(fp);
}

console.log(`\n--- UTILIZED (${used.length}/${matFields.length}) ---`);
// Group by top-level category
const usedByCategory = {};
for (const f of used) {
    const cat = f.split('.')[0];
    if (!usedByCategory[cat]) usedByCategory[cat] = [];
    usedByCategory[cat].push(f);
}
for (const [cat, fields] of Object.entries(usedByCategory)) {
    console.log(`  ${cat}: ${fields.length} fields used`);
}

console.log(`\n--- NOT UTILIZED (${unused.length}/${matFields.length}) ---`);
unused.forEach(f => console.log(`  ✗ ${f}`));

// Now check TOOL fields
console.log('\n\n=== TOOL DATA FIELD UTILIZATION ===');
const toolFile = fs.readFileSync('C:\\PRISM\\data\\tools\\CUTTING_TOOLS_INDEX.json', 'utf8').replace(/^\uFEFF/, '');
const toolArr = JSON.parse(toolFile);
const toolSample = toolArr.tools[0];
const toolFields = listFields(toolSample);
console.log(`Tool field count: ${toolFields.length}`);

const toolUsed = [];
const toolUnused = [];
for (const fp of toolFields) {
    const leaf = fp.split('.').pop();
    if (['min','max','type','name','id'].includes(leaf)) { toolUsed.push(fp); continue; }
    const found = codeToSearch.includes(leaf);
    if (found) toolUsed.push(fp);
    else toolUnused.push(fp);
}
console.log(`Utilized: ${toolUsed.length}/${toolFields.length}`);
console.log(`NOT utilized:`);
toolUnused.forEach(f => console.log(`  ✗ ${f}`));

// Check MACHINE fields  
console.log('\n\n=== MACHINE DATA FIELD UTILIZATION ===');
const machFiles = fs.readdirSync('C:\\PRISM\\data\\machines').filter(f => f.endsWith('.json'));
let machSample = null;
for (const mf of machFiles) {
    try {
        const data = JSON.parse(fs.readFileSync(path.join('C:\\PRISM\\data\\machines', mf), 'utf8').replace(/^\uFEFF/, ''));
        const arr = data.machines || (Array.isArray(data) ? data : [data]);
        if (arr[0]) { machSample = arr[0]; break; }
    } catch(e) {}
}
if (machSample) {
    const machFields = listFields(machSample);
    console.log(`Machine field count: ${machFields.length}`);
    const machUnused = [];
    for (const fp of machFields) {
        const leaf = fp.split('.').pop();
        if (['min','max','type','name','id','model'].includes(leaf)) continue;
        if (!codeToSearch.includes(leaf)) machUnused.push(fp);
    }
    console.log(`NOT utilized:`);
    machUnused.forEach(f => console.log(`  ✗ ${f}`));
}

// Check ALARM fields
console.log('\n\n=== ALARM DATA FIELD UTILIZATION ===');
const almFiles = fs.readdirSync('C:\\PRISM\\data\\alarms').filter(f => f.endsWith('.json'));
let almSample = null;
for (const af of almFiles) {
    try {
        const data = JSON.parse(fs.readFileSync(path.join('C:\\PRISM\\data\\alarms', af), 'utf8').replace(/^\uFEFF/, ''));
        const arr = data.alarms || (Array.isArray(data) ? data : [data]);
        if (arr[0]) { almSample = arr[0]; break; }
    } catch(e) {}
}
if (almSample) {
    const almFields = listFields(almSample);
    console.log(`Alarm field count: ${almFields.length}`);
    const almUnused = [];
    for (const fp of almFields) {
        const leaf = fp.split('.').pop();
        if (['min','max','type','name','id','code','step'].includes(leaf)) continue;
        if (!codeToSearch.includes(leaf)) almUnused.push(fp);
    }
    console.log(`NOT utilized:`);
    almUnused.forEach(f => console.log(`  ✗ ${f}`));
}
