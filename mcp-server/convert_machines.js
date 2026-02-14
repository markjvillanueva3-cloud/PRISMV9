/**
 * PRISM Machine Data Converter
 * Converts .js machine database files to .json format
 * for the MachineRegistry loader
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ENHANCED_DIR = 'C:\\PRISM\\extracted\\machines\\ENHANCED';
const OUTPUT_DIR = ENHANCED_DIR; // Write JSON alongside JS files

let totalMachines = 0;
let filesConverted = 0;

// Get all .js files (skip manifest and master index)
const jsFiles = fs.readdirSync(ENHANCED_DIR)
  .filter(f => f.endsWith('.js') && f.startsWith('PRISM_') && f.includes('DATABASE'));

console.log(`Found ${jsFiles.length} machine database files to convert`);

for (const jsFile of jsFiles) {
  try {
    const filePath = path.join(ENHANCED_DIR, jsFile);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the const name (e.g., PRISM_HAAS_MACHINE_DATABASE_ENHANCED)
    const constMatch = content.match(/const\s+(PRISM_\w+)\s*=/);
    if (!constMatch) {
      console.log(`SKIP: ${jsFile} - no const found`);
      continue;
    }
    const constName = constMatch[1];
    
    // Create a sandbox context and evaluate the JS
    const sandbox = {};
    const script = new vm.Script(content + `\n__result = ${constName};`);
    const context = vm.createContext(sandbox);
    script.runInContext(context);
    
    const dbObj = sandbox.__result;
    if (!dbObj) {
      console.log(`SKIP: ${jsFile} - evaluation failed`);
      continue;
    }
    
    // Extract machines - could be object (keyed by id) or array
    let machines = [];
    if (dbObj.machines) {
      if (Array.isArray(dbObj.machines)) {
        machines = dbObj.machines;
      } else {
        // Object with machine IDs as keys
        machines = Object.values(dbObj.machines);
      }
    }
    
    // Ensure each machine has required fields
    const enrichedMachines = machines.map(m => ({
      ...m,
      id: m.id || m.model?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown',
      manufacturer: m.manufacturer || dbObj.manufacturer || 'unknown',
      layer: 'ENHANCED'
    }));
    
    if (enrichedMachines.length === 0) {
      console.log(`SKIP: ${jsFile} - no machines found`);
      continue;
    }
    
    // Write JSON file
    const jsonFileName = jsFile.replace('.js', '.json');
    const jsonPath = path.join(OUTPUT_DIR, jsonFileName);
    fs.writeFileSync(jsonPath, JSON.stringify(enrichedMachines, null, 2));
    
    totalMachines += enrichedMachines.length;
    filesConverted++;
    console.log(`OK: ${jsFile} -> ${jsonFileName} (${enrichedMachines.length} machines)`);
    
  } catch (err) {
    console.log(`ERROR: ${jsFile} - ${err.message}`);
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Files converted: ${filesConverted}`);
console.log(`Total machines: ${totalMachines}`);
