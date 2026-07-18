/**
 * PRISM Machine Data Converter - ALL LAYERS
 * Converts .js machine database files to .json format
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const LAYERS = {
  CORE: 'C:\\PRISM\\extracted\\machines\\CORE',
  ENHANCED: 'C:\\PRISM\\extracted\\machines\\ENHANCED',
  LEVEL5: 'C:\\PRISM\\extracted\\machines\\LEVEL5'
};

let grandTotal = 0;

for (const [layer, dir] of Object.entries(LAYERS)) {
  console.log(`\n=== Processing ${layer} layer ===`);
  
  const jsFiles = fs.readdirSync(dir)
    .filter(f => f.endsWith('.js') && f.includes('PRISM_') && !f.includes('MANIFEST') && !f.includes('MASTER_INDEX') && !f.includes('index'));
  
  let layerTotal = 0;
  
  for (const jsFile of jsFiles) {
    // Skip if JSON already exists (from previous run)
    const jsonName = jsFile.replace('.js', '.json');
    const jsonPath = path.join(dir, jsonName);
    if (fs.existsSync(jsonPath)) {
      console.log(`SKIP: ${jsFile} - JSON already exists`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(path.join(dir, jsFile), 'utf8');
      
      // Find the const name
      const constMatch = content.match(/const\s+(PRISM_\w+)\s*=/);
      if (!constMatch) { console.log(`SKIP: ${jsFile} - no const`); continue; }
      
      // Evaluate in sandbox
      const sandbox = {};
      const script = new vm.Script(content + `\n__result = ${constMatch[1]};`);
      script.runInContext(vm.createContext(sandbox));
      const dbObj = sandbox.__result;
      if (!dbObj) { console.log(`SKIP: ${jsFile} - eval failed`); continue; }
      
      // Extract machines from various structures
      let machines = [];
      if (dbObj.machines) {
        if (Array.isArray(dbObj.machines)) {
          machines = dbObj.machines;
        } else {
          machines = Object.values(dbObj.machines);
        }
      } else if (dbObj.models) {
        machines = Array.isArray(dbObj.models) ? dbObj.models : Object.values(dbObj.models);
      } else if (Array.isArray(dbObj)) {
        machines = dbObj;
      }
      
      // Flatten nested objects that might contain machines
      if (machines.length === 0) {
        // Try to find machine-like objects at any level
        const findMachines = (obj, depth = 0) => {
          if (depth > 3) return [];
          const found = [];
          for (const [key, val] of Object.entries(obj)) {
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              if (val.id || val.model || val.spindle || val.travels || val.work_envelope) {
                found.push({ ...val, id: val.id || key });
              } else {
                found.push(...findMachines(val, depth + 1));
              }
            }
          }
          return found;
        };
        machines = findMachines(dbObj);
      }
      
      // Enrich with layer and manufacturer
      const enriched = machines.map(m => ({
        ...m,
        id: m.id || m.model?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown',
        manufacturer: m.manufacturer || dbObj.manufacturer || dbObj.manufacturerFull || 'unknown',
        layer: layer
      }));
      
      if (enriched.length === 0) {
        console.log(`SKIP: ${jsFile} - no machines extracted`);
        continue;
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(enriched, null, 2));
      layerTotal += enriched.length;
      console.log(`OK: ${jsFile} -> ${jsonName} (${enriched.length} machines)`);
      
    } catch (err) {
      console.log(`ERROR: ${jsFile} - ${err.message.substring(0, 100)}`);
    }
  }
  
  grandTotal += layerTotal;
  console.log(`${layer} total: ${layerTotal} machines`);
}

console.log(`\n=== GRAND TOTAL: ${grandTotal} new machines converted ===`);
