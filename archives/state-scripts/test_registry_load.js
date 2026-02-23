// Direct test: load MaterialRegistry from built bundle
// Simulate what the server does

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const MATERIALS_DB = "C:\\PRISM\\data\\materials";

async function fileExists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function listDirectory(dirPath) {
  const results = [];
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dirPath, entry.name);
      results.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory()
      });
    }
  } catch (e) {
    console.error(`listDirectory error for ${dirPath}:`, e.message);
  }
  return results;
}

async function readJsonFile(filePath) {
  const content = await fsp.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function test() {
  console.log(`MATERIALS_DB: ${MATERIALS_DB}`);
  const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];
  
  let totalEntries = 0;
  
  for (const group of isoGroups) {
    const groupPath = path.join(MATERIALS_DB, group);
    const exists = await fileExists(groupPath);
    
    if (!exists) {
      console.log(`  ${group}: NOT FOUND at ${groupPath}`);
      continue;
    }
    
    const files = await listDirectory(groupPath);
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.name !== 'index.json');
    console.log(`  ${group}: ${jsonFiles.length} JSON files`);
    
    for (const file of jsonFiles) {
      try {
        const data = await readJsonFile(file.path);
        const materials = data.materials || [];
        
        for (let i = 0; i < materials.length; i++) {
          const m = materials[i];
          const id = m.material_id || m.id || `${group}-${i}`;
          if (id) totalEntries++;
        }
        
        console.log(`    ${file.name}: ${materials.length} materials`);
      } catch (e) {
        console.log(`    ${file.name}: ERROR - ${e.message}`);
      }
    }
  }
  
  console.log(`\nTOTAL ENTRIES: ${totalEntries}`);
}

test().catch(e => console.error('FATAL:', e));
