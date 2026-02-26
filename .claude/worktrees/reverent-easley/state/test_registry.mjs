// Test MaterialRegistry loading directly
// Run with: node C:\PRISM\state\test_registry.mjs

import * as fs from 'fs';
import * as path from 'path';

const MATERIALS_DB = 'C:\\PRISM\\data\\materials';
const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];

let totalMaterials = 0;
let totalFiles = 0;

for (const group of isoGroups) {
  const groupPath = path.join(MATERIALS_DB, group);
  if (!fs.existsSync(groupPath)) {
    console.log(`  ${group}: MISSING`);
    continue;
  }
  
  const files = fs.readdirSync(groupPath).filter(f => f.endsWith('.json') && f !== 'index.json');
  let groupCount = 0;
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(groupPath, file), 'utf-8'));
      const materials = data.materials || [];
      groupCount += materials.length;
      totalFiles++;
      
      // Check if materials have material_type field
      if (materials.length > 0) {
        const sample = materials[0];
        const hasType = 'material_type' in sample;
        const hasSub = 'subcategory' in sample;
        if (!hasType || !hasSub) {
          console.log(`    WARNING: ${file} - material_type=${hasType}, subcategory=${hasSub}`);
        }
      }
    } catch (e) {
      console.log(`    ERROR: ${file} - ${e.message}`);
    }
  }
  
  totalMaterials += groupCount;
  console.log(`  ${group}: ${groupCount} materials from ${files.length} files`);
}

console.log(`\nTOTAL: ${totalMaterials} materials from ${totalFiles} files`);

// Now test search matching
console.log('\n--- SEARCH TEST ---');
const testFile = path.join(MATERIALS_DB, 'P_STEELS', 'low_carbon_verified.json');
const data = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
const mat = data.materials[0];
console.log(`Sample: ${mat.material_id}`);
console.log(`  name: "${mat.name}"`);
console.log(`  material_type: "${mat.material_type}"`);
console.log(`  subcategory: "${mat.subcategory}"`);
console.log(`  iso_group: "${mat.iso_group}"`);
console.log(`  condition: "${mat.condition}"`);

const query = 'steel';
console.log(`\nQuery: "${query}"`);
console.log(`  name match: ${mat.name?.toLowerCase().includes(query)}`);
console.log(`  id match: ${mat.material_id?.toLowerCase().includes(query)}`);
console.log(`  type match: ${mat.material_type?.toLowerCase().includes(query)}`);
console.log(`  sub match: ${mat.subcategory?.toLowerCase().includes(query)}`);
