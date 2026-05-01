// Verify merge: check a sample of enriched materials for new fields
const fs = require('fs');
const path = require('path');

const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];
const BASE = 'C:\\PRISM\\data\\materials';

let totalWithComp = 0, totalWithTrib = 0, totalWithSurf = 0, totalWithTherm = 0, totalWithDesig = 0;
let totalMats = 0;

for (const g of GROUPS) {
    const dir = path.join(BASE, g);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    let gComp=0, gTrib=0, gSurf=0, gTherm=0, gDesig=0, gTotal=0;
    
    for (const file of files) {
        let raw = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, '');
        let json;
        try { json = JSON.parse(raw); } catch(e) { continue; }
        const arr = json.materials || (Array.isArray(json) ? json : [json]);
        
        for (const m of arr) {
            gTotal++;
            if (m.composition && Object.keys(m.composition).length > 0) gComp++;
            if (m.tribology) gTrib++;
            if (m.surface_integrity) gSurf++;
            if (m.thermal_machining) gTherm++;
            if (m.designation) gDesig++;
        }
    }
    
    totalWithComp += gComp; totalWithTrib += gTrib; totalWithSurf += gSurf;
    totalWithTherm += gTherm; totalWithDesig += gDesig; totalMats += gTotal;
    
    console.log(`${g}: total=${gTotal} comp=${gComp}(${Math.round(gComp/gTotal*100)}%) trib=${gTrib}(${Math.round(gTrib/gTotal*100)}%) surf=${gSurf}(${Math.round(gSurf/gTotal*100)}%) therm=${gTherm}(${Math.round(gTherm/gTotal*100)}%) desig=${gDesig}(${Math.round(gDesig/gTotal*100)}%)`);
}

console.log(`\nTOTAL: ${totalMats} materials`);
console.log(`  composition: ${totalWithComp} (${Math.round(totalWithComp/totalMats*100)}%)`);
console.log(`  tribology: ${totalWithTrib} (${Math.round(totalWithTrib/totalMats*100)}%)`);
console.log(`  surface_integrity: ${totalWithSurf} (${Math.round(totalWithSurf/totalMats*100)}%)`);
console.log(`  thermal_machining: ${totalWithTherm} (${Math.round(totalWithTherm/totalMats*100)}%)`);
console.log(`  designation: ${totalWithDesig} (${Math.round(totalWithDesig/totalMats*100)}%)`);

// Spot check: read one enriched material and show new fields
const spotFile = path.join(BASE, 'P_STEELS', 'chromoly_verified.json');
const spotJson = JSON.parse(fs.readFileSync(spotFile, 'utf8'));
const spotMat = spotJson.materials ? spotJson.materials[0] : spotJson[0];
console.log(`\n=== SPOT CHECK: ${spotMat.name || spotMat.material_id} ===`);
console.log(`composition keys: ${spotMat.composition ? Object.keys(spotMat.composition).join(', ') : 'NONE'}`);
console.log(`tribology keys: ${spotMat.tribology ? Object.keys(spotMat.tribology).join(', ') : 'NONE'}`);
console.log(`surface_integrity keys: ${spotMat.surface_integrity ? Object.keys(spotMat.surface_integrity).join(', ') : 'NONE'}`);
console.log(`thermal_machining keys: ${spotMat.thermal_machining ? Object.keys(spotMat.thermal_machining).join(', ') : 'NONE'}`);
if (spotMat.composition) {
    console.log(`composition.C: ${JSON.stringify(spotMat.composition.C || spotMat.composition.carbon)}`);
    console.log(`composition.Cr: ${JSON.stringify(spotMat.composition.Cr || spotMat.composition.chromium)}`);
}
