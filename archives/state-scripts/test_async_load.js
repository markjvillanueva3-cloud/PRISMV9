// Direct test of MaterialRegistry loading
const path = require('path');
const fs = require('fs/promises');

// Simulate the fileExists and listDirectory from files.ts
async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function listDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map(entry => ({
    name: entry.name,
    path: path.join(dirPath, entry.name),
    isDirectory: entry.isDirectory()
  }));
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function main() {
  const MATERIALS_DB = "C:\\PRISM\\data\\materials";
  const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];
  
  const entries = new Map();
  
  for (const group of isoGroups) {
    const groupPath = path.join(MATERIALS_DB, group);
    const exists = await fileExists(groupPath);
    
    if (exists) {
      const files = await listDirectory(groupPath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json") && f.name !== "index.json");
      console.log(`${group}: ${jsonFiles.length} JSON files found`);
      
      for (const file of jsonFiles) {
        try {
          const data = await readJsonFile(file.path);
          const materials = data.materials || [];
          const fileName = file.name.replace('.json', '');
          
          for (let i = 0; i < materials.length; i++) {
            const material = materials[i];
            const id = material.material_id || material.id || `${group}-${fileName}-${i.toString().padStart(4, '0')}`;
            if (id) {
              entries.set(id, {
                id,
                data: { ...material, material_id: id, iso_group: material.iso_group || group.charAt(0) },
                metadata: { created: new Date().toISOString(), updated: new Date().toISOString(), version: 1, source: group }
              });
            }
          }
          console.log(`  ${file.name}: ${materials.length} materials (total: ${entries.size})`);
        } catch (error) {
          console.log(`  ${file.name}: ERROR: ${error.message}`);
        }
      }
    } else {
      console.log(`${group}: NOT FOUND at ${groupPath}`);
    }
  }
  
  console.log(`\nFINAL: ${entries.size} materials loaded`);
  
  // Test search for "6061"
  const results = Array.from(entries.values())
    .filter(e => e.data.name?.toLowerCase().includes('6061') || e.data.material_id?.toLowerCase().includes('6061'))
    .map(e => ({ id: e.data.material_id, name: e.data.name }));
  console.log(`\nSearch "6061": ${results.length} results`);
  results.forEach(r => console.log(`  ${r.id}: ${r.name}`));
}

main().catch(console.error);
