const fs = require('fs');
const path = require('path');

// Comprehensive audit of what PRISM has vs what world-class manufacturing intelligence needs
console.log('=== PRISM COMPETITIVE ADVANTAGE AUDIT ===\n');

// 1. Check material thermal/tribology depth
const matDir = 'C:\\PRISM\\data\\materials';
let matFiles = [];
for (const d of fs.readdirSync(matDir)) {
    const dp = path.join(matDir, d);
    if (fs.statSync(dp).isDirectory()) {
        for (const f of fs.readdirSync(dp).filter(f => f.endsWith('.json'))) {
            matFiles.push(path.join(dp, f));
        }
    }
}

let hasCoolantStrategy = 0, hasMicrostructure = 0, hasSpringback = 0;
let hasBUE = 0, hasWorkHardening = 0, hasChipBreaking = 0;
let hasToolWearModel = 0, hasSurfaceIntegrity = 0;
let hasStressStrain = 0, hasFatigue = 0;
let total = 0;

for (const fp of matFiles) {
    try {
        const mat = JSON.parse(fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
        total++;
        if (mat.cutting_recommendations?.milling?.coolant_type) hasCoolantStrategy++;
        if (mat.chip_formation?.chip_type) hasChipBreaking++;
        if (mat.chip_formation?.built_up_edge_tendency) hasBUE++;
        if (mat.chip_formation?.work_hardening_severity) hasWorkHardening++;
        if (mat.machinability?.tool_wear_pattern) hasToolWearModel++;
        if (mat.surface_integrity || mat.surface?.achievable_ra_turning) hasSurfaceIntegrity++;
        if (mat.thermal_machining?.cutting_temperature_coefficient) hasMicrostructure++;
        if (mat.mechanical?.fatigue_strength) hasFatigue++;
        if (mat.johnson_cook?.A) hasStressStrain++;
    } catch(e) {}
}

console.log(`Materials: ${total}`);
console.log(`  Chip formation model: ${hasChipBreaking} (${(hasChipBreaking/total*100).toFixed(0)}%)`);
console.log(`  BUE tendency: ${hasBUE} (${(hasBUE/total*100).toFixed(0)}%)`);
console.log(`  Work hardening: ${hasWorkHardening} (${(hasWorkHardening/total*100).toFixed(0)}%)`);
console.log(`  Tool wear pattern: ${hasToolWearModel} (${(hasToolWearModel/total*100).toFixed(0)}%)`);
console.log(`  Surface integrity: ${hasSurfaceIntegrity} (${(hasSurfaceIntegrity/total*100).toFixed(0)}%)`);
console.log(`  Thermal machining: ${hasMicrostructure} (${(hasMicrostructure/total*100).toFixed(0)}%)`);
console.log(`  Coolant strategy: ${hasCoolantStrategy} (${(hasCoolantStrategy/total*100).toFixed(0)}%)`);
console.log(`  Johnson-Cook: ${hasStressStrain} (${(hasStressStrain/total*100).toFixed(0)}%)`);
console.log(`  Fatigue data: ${hasFatigue} (${(hasFatigue/total*100).toFixed(0)}%)`);

// 2. Check tool data depth  
const toolDir = 'C:\\PRISM\\data\\tools';
let hasCollisionEnvelope = 0, hasRecommendedHolder = 0, hasRegrindData = 0;
let hasRampAngle = 0, hasTrochoidalCapable = 0, hasVariableHelix = 0;
let toolTotal = 0;

const ctiPath = path.join(toolDir, 'CUTTING_TOOLS_INDEX.json');
const ctiJson = JSON.parse(fs.readFileSync(ctiPath, 'utf8').replace(/^\uFEFF/, ''));
for (const t of ctiJson.tools) {
    toolTotal++;
    if (t.collision_envelope?.length > 0) hasCollisionEnvelope++;
    if (t.recommended_holder_types?.length > 0) hasRecommendedHolder++;
    if (t.regrindable !== undefined) hasRegrindData++;
    if (t.max_ramp_angle_deg > 0) hasRampAngle++;
    if (t.trochoidal_capable) hasTrochoidalCapable++;
    if (t.variable_helix) hasVariableHelix++;
}

console.log(`\nCutting Tools (CUTTING_TOOLS_INDEX): ${toolTotal}`);
console.log(`  Collision envelope: ${hasCollisionEnvelope} (${(hasCollisionEnvelope/toolTotal*100).toFixed(0)}%)`);
console.log(`  Recommended holders: ${hasRecommendedHolder} (${(hasRecommendedHolder/toolTotal*100).toFixed(0)}%)`);
console.log(`  Regrind data: ${hasRegrindData} (${(hasRegrindData/toolTotal*100).toFixed(0)}%)`);
console.log(`  Ramp angle: ${hasRampAngle} (${(hasRampAngle/toolTotal*100).toFixed(0)}%)`);
console.log(`  Trochoidal capable: ${hasTrochoidalCapable} (${(hasTrochoidalCapable/toolTotal*100).toFixed(0)}%)`);
console.log(`  Variable helix: ${hasVariableHelix} (${(hasVariableHelix/toolTotal*100).toFixed(0)}%)`);

// 3. Check what ADVANCED calcs exist
console.log('\n=== MISSING COMPETITIVE FEATURES ===');
console.log('Things Sandvik Coroplus / Kennametal NOVO / Tungaloy have that we might not:\n');
console.log('1. ADAPTIVE FEED CONTROL — adjust fz based on radial engagement angle');
console.log('2. CHIP THINNING COMPENSATION — auto-adjust fz when ae < 50% diameter');
console.log('3. TOOL WEAR PREDICTION — not just Taylor life but progressive flank/crater wear');
console.log('4. COOLANT STRATEGY OPTIMIZER — flood vs MQL vs cryogenic vs dry recommendation');
console.log('5. VIBRATION/CHATTER PREDICTION — SLD + specific material damping');
console.log('6. PROCESS COST PER PART — full cycle including tool changes, setup, idle');
console.log('7. MULTI-PASS STRATEGY — roughing + semi-finish + finish optimal sequence');
console.log('8. WORKHOLDING FORCE CALC — clamp force vs cutting force safety margin');
console.log('9. HEAT TREATMENT AWARENESS — same alloy at different conditions (annealed/QT/aged)');
console.log('10. G-CODE SNIPPET GENERATION — ready-to-paste for Fanuc/Siemens/Haas');
