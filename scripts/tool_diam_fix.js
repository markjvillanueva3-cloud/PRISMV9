const fs = require('fs');
const path = require('path');
const TOOL_DIR = 'C:\\PRISM\\data\\tools';

// Fix INDEXABLE_MILLING — many have diameter in the name but not in cutting_diameter_mm
let fixedIdx = 0;
const idxPath = path.join(TOOL_DIR, 'INDEXABLE_MILLING_TOOLHOLDING.json');
const idxJson = JSON.parse(fs.readFileSync(idxPath, 'utf8').replace(/^\uFEFF/, ''));
for (const t of idxJson.tools || []) {
    if (t.cutting_diameter_mm > 0) continue;
    
    // Extract diameter from name: "Sandvik CoroMill 390 Ø25mm" or "Kennametal HARVI-III Ø12mm"
    const nameMatch = (t.name || '').match(/Ø(\d+(?:\.\d+)?)\s*mm/);
    if (nameMatch) {
        t.cutting_diameter_mm = parseFloat(nameMatch[1]);
        fixedIdx++;
        continue;
    }
    
    // Extract from catalog number: CoroMill-390-25 -> 25
    const catMatch = (t.catalog_number || '').match(/-(\d+)$/);
    if (catMatch) {
        const num = parseInt(catMatch[1]);
        if (num >= 4 && num <= 200) { // Reasonable diameter range
            t.cutting_diameter_mm = num;
            fixedIdx++;
        }
    }
}
fs.writeFileSync(idxPath, JSON.stringify(idxJson, null, 2), 'utf8');
console.log(`INDEXABLE_MILLING: ${fixedIdx} diameters extracted`);

// Fix MANUFACTURER_CATALOGS
let fixedMfr = 0;
const mfrPath = path.join(TOOL_DIR, 'MANUFACTURER_CATALOGS.json');
const mfrJson = JSON.parse(fs.readFileSync(mfrPath, 'utf8').replace(/^\uFEFF/, ''));
for (const t of mfrJson.tools || []) {
    if (t.cutting_diameter_mm > 0) continue;
    
    const name = (t.name || '').toLowerCase();
    const catNum = (t.catalog_number || '');
    
    // Extract from name patterns: "Ø12mm", "12mm endmill", "Ø12.0"
    const nameMatch = (t.name || '').match(/Ø(\d+(?:\.\d+)?)\s*mm/);
    if (nameMatch) {
        t.cutting_diameter_mm = parseFloat(nameMatch[1]);
        fixedMfr++;
        continue;
    }
    
    // Extract from "XXmm" in name
    const mmMatch = name.match(/(\d+(?:\.\d+)?)\s*mm\b/);
    if (mmMatch) {
        const d = parseFloat(mmMatch[1]);
        if (d >= 0.5 && d <= 200) {
            t.cutting_diameter_mm = d;
            fixedMfr++;
            continue;
        }
    }
    
    // Extract from catalog number suffix: HARVI-I-TE-12 -> 12
    const catSuffix = catNum.match(/-(\d+)$/);
    if (catSuffix) {
        const num = parseInt(catSuffix[1]);
        if (num >= 1 && num <= 100) {
            t.cutting_diameter_mm = num;
            fixedMfr++;
            continue;
        }
    }
}
fs.writeFileSync(mfrPath, JSON.stringify(mfrJson, null, 2), 'utf8');
console.log(`MANUFACTURER_CATALOGS: ${fixedMfr} diameters extracted`);

// Fix CUTTING_TOOLS_INDEX - 207 missing
let fixedCTI = 0;
const ctiPath = path.join(TOOL_DIR, 'CUTTING_TOOLS_INDEX.json');
const ctiJson = JSON.parse(fs.readFileSync(ctiPath, 'utf8').replace(/^\uFEFF/, ''));
for (const t of ctiJson.tools || []) {
    if (t.cutting_diameter_mm > 0) continue;
    
    // Many have shank_diameter_mm but not cutting_diameter — for drills/reamers these are often equal
    if (t.shank_diameter_mm > 0) {
        t.cutting_diameter_mm = t.shank_diameter_mm;
        fixedCTI++;
        continue;
    }
    
    const nameMatch = (t.name || '').match(/Ø(\d+(?:\.\d+)?)/);
    if (nameMatch) {
        t.cutting_diameter_mm = parseFloat(nameMatch[1]);
        fixedCTI++;
    }
}
fs.writeFileSync(ctiPath, JSON.stringify(ctiJson, null, 2), 'utf8');
console.log(`CUTTING_TOOLS_INDEX: ${fixedCTI} diameters extracted`);

console.log(`\nTotal diameter fixes: ${fixedIdx + fixedMfr + fixedCTI}`);
