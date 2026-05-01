// Test MaterialRegistry loading directly
const fs = require('fs');
const path = require('path');

const MATERIALS_DB = "C:\\PRISM\\data\\materials";
const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];

async function test() {
  let totalMaterials = 0;
  
  for (const group of isoGroups) {
    const groupPath = path.join(MATERIALS_DB, group);
    
    try {
      const exists = fs.existsSync(groupPath);
      if (!exists) {
        console.log(`  ${group}: NOT FOUND`);
        continue;
      }
      
      const files = fs.readdirSync(groupPath);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
      
      let groupCount = 0;
      for (const file of jsonFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(groupPath, file), 'utf-8'));
          const materials = data.materials || [];
          groupCount += materials.length;
        } catch (e) {
          console.log(`    ERROR ${file}: ${e.message}`);
        }
      }
      
      totalMaterials += groupCount;
      console.log(`  ${group}: ${jsonFiles.length} files, ${groupCount} materials`);
    } catch (e) {
      console.log(`  ${group}: ERROR - ${e.message}`);
    }
  }
  
  console.log(`\nTOTAL: ${totalMaterials} materials across ${isoGroups.length} groups`);
}

test();
