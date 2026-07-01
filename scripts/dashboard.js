const fs = require('fs');
const path = require('path');

console.log('=== PRISM DATA QUALITY DASHBOARD ===\n');

// Materials
const MAT_DIR = 'C:\\PRISM\\data\\materials';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];
let matTotal = 0, matComp = 0, matKienzle = 0, matTaylor = 0, matJC = 0, matCutRec = 0;
for (const g of GROUPS) {
    const dir = path.join(MAT_DIR, g);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '')).materials || [];
        for (const m of arr) {
            matTotal++;
            if (m.composition && Object.keys(m.composition).length > 0) matComp++;
            if (m.kienzle?.kc1_1 > 0) matKienzle++;
            if (m.taylor?.C > 0) matTaylor++;
            if (m.johnson_cook?.A > 0) matJC++;
            if (m.cutting_recommendations && Object.keys(m.cutting_recommendations).length > 0) matCutRec++;
        }
    }
}
console.log(`MATERIALS: ${matTotal}`);
console.log(`  composition: ${matComp} (${Math.round(matComp/matTotal*100)}%)`);
console.log(`  kienzle: ${matKienzle} (${Math.round(matKienzle/matTotal*100)}%)`);
console.log(`  taylor: ${matTaylor} (${Math.round(matTaylor/matTotal*100)}%)`);
console.log(`  johnson_cook: ${matJC} (${Math.round(matJC/matTotal*100)}%)`);
console.log(`  cutting_recommendations: ${matCutRec} (${Math.round(matCutRec/matTotal*100)}%)`);

// Tools
const TOOL_DIR = 'C:\\PRISM\\data\\tools';
let toolTotal = 0, toolCutParams = 0, toolTaylor = 0, toolDiam = 0;
for (const f of fs.readdirSync(TOOL_DIR).filter(f => f.endsWith('.json') && f !== 'TOOLS_HIERARCHY.json')) {
    const arr = JSON.parse(fs.readFileSync(path.join(TOOL_DIR, f), 'utf8').replace(/^\uFEFF/, '')).tools || [];
    for (const t of arr) {
        toolTotal++;
        if (t.cutting_params) toolCutParams++;
        if (t.taylor_C > 0) toolTaylor++;
        if (t.cutting_diameter_mm > 0) toolDiam++;
    }
}
console.log(`\nTOOLS: ${toolTotal}`);
console.log(`  cutting_params: ${toolCutParams} (${Math.round(toolCutParams/toolTotal*100)}%)`);
console.log(`  taylor coefficients: ${toolTaylor} (${Math.round(toolTaylor/toolTotal*100)}%)`);
console.log(`  diameter: ${toolDiam} (${Math.round(toolDiam/toolTotal*100)}%)`);

// Machines
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
let machTotal = 0, machPower = 0, machEnv = 0, machTool = 0;
for (const fp of machFiles) {
    const json = JSON.parse(fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
    const arr = json.machines || (Array.isArray(json) ? json : [json]);
    for (const m of arr) {
        if (!m.id && !m.machine_id && !m.model) continue;
        machTotal++;
        if (m.spindle?.power_continuous > 0 || m.spindle?.power_kw > 0) machPower++;
        if (m.travels?.x > 0 || m.work_envelope?.x_mm > 0) machEnv++;
        if (m.tool_changer?.capacity > 0) machTool++;
    }
}
console.log(`\nMACHINES: ${machTotal}`);
console.log(`  spindle_power: ${machPower} (${Math.round(machPower/machTotal*100)}%)`);
console.log(`  work_envelope: ${machEnv} (${Math.round(machEnv/machTotal*100)}%)`);
console.log(`  tool_changer: ${machTool} (${Math.round(machTool/machTotal*100)}%)`);

// Alarms
const almDir = 'C:\\PRISM\\extracted\\controllers\\alarms';
let almTotal = 0, almMultiFix = 0;
for (const f of fs.readdirSync(almDir).filter(f => f.endsWith('_MASTER.json'))) {
    const json = JSON.parse(fs.readFileSync(path.join(almDir, f), 'utf8'));
    for (const a of json.alarms || []) {
        almTotal++;
        if (a.fix_procedures && Array.isArray(a.fix_procedures) && a.fix_procedures.length > 0) almMultiFix++;
    }
}
console.log(`\nALARMS: ${almTotal}`);
console.log(`  multi-step fixes: ${almMultiFix} (${Math.round(almMultiFix/almTotal*100)}%)`);

console.log('\n=== KEY GAPS ===');
console.log(`Materials missing Kienzle: ${matTotal - matKienzle} (critical for force calc)`);
console.log(`Materials missing Taylor: ${matTotal - matTaylor} (critical for tool life)`);
console.log(`Materials missing cutting_recommendations: ${matTotal - matCutRec}`);
console.log(`Machines missing work_envelope: ${machTotal - machEnv}`);
console.log(`Alarms without multi-step fix: ${almTotal - almMultiFix}`);
