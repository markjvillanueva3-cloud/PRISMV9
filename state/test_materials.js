const fs = require('fs');
const path = require('path');

const MATERIALS_DB = "C:\\PRISM\\data\\materials";
const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];

let totalMaterials = 0;

for (const group of isoGroups) {
  const groupPath = path.join(MATERIALS_DB, group);
  if (!fs.existsSync(groupPath)) {
    console.log(`  MISSING: ${group}`);
    continue;
  }
  
  const files = fs.readdirSync(groupPath).filter(f => f.endsWith('.json') && f !== 'index.json');
  let groupCount = 0;
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(groupPath, file), 'utf-8'));
      const materials = data.materials || [];
      groupCount += materials.length;
      
      // Check first material has required fields
      if (materials.length > 0) {
        const m = materials[0];
        const hasKienzle = m.kienzle && m.kienzle.kc1_1;
        const hasTaylor = m.taylor && m.taylor.C;
        console.log(`    ${file}: ${materials.length} materials (kienzle=${!!hasKienzle}, taylor=${!!hasTaylor})`);
      }
    } catch (e) {
      console.log(`    ERROR: ${file}: ${e.message}`);
    }
  }
  
  console.log(`  ${group}: ${groupCount} materials in ${files.length} files`);
  totalMaterials += groupCount;
}

console.log(`\nTOTAL: ${totalMaterials} materials across ${isoGroups.length} ISO groups`);
