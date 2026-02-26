// M-0 Material Schema Merge Script
// Enriches canonical materials/ with data from materials_complete/
// Fields to merge: composition, tribology, surface_integrity, thermal_machining, identification/designation
// Safety: NEVER overwrites existing cutting data (kienzle, taylor, johnson_cook, cutting_recommendations)

const fs = require('fs');
const path = require('path');

const CANONICAL_BASE = 'C:\\PRISM\\data\\materials';
const COMPLETE_BASE = 'C:\\PRISM\\data\\materials_complete';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];

// Fields to merge FROM complete INTO canonical (additive only)
const MERGE_FIELDS = ['composition', 'tribology', 'surface_integrity', 'thermal_machining', 'thermalMachining', 'surfaceIntegrity', 'identification', 'designation'];
// Normalize camelCase field names from complete to snake_case in canonical
const FIELD_MAP = {
    'thermalMachining': 'thermal_machining',
    'surfaceIntegrity': 'surface_integrity',
    'chipFormation': 'chip_formation',
    'statisticalData': 'statistics'
};

// NEVER touch these canonical fields
const PROTECTED_FIELDS = ['kienzle', 'taylor', 'johnson_cook', 'cutting_recommendations', 'machinability', 'chip_formation', 'surface', 'thermal', 'weldability', 'standards', 'physical', 'mechanical', 'material_id', 'id', 'name', 'iso_group'];

let stats = { enriched: 0, added: 0, skipped: 0, errors: 0, byGroup: {} };

function loadMaterials(dir) {
    const materials = new Map(); // name_lower -> material object
    if (!fs.existsSync(dir)) return materials;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
        try {
            let raw = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, '');
            const json = JSON.parse(raw);
            const arr = json.materials || (Array.isArray(json) ? json : [json]);
            for (const m of arr) {
                if (m.name) {
                    materials.set(m.name.toLowerCase().trim(), m);
                }
            }
        } catch (e) {
            console.error(`  Error loading ${file}: ${e.message}`);
            stats.errors++;
        }
    }
    return materials;
}

function mergeFields(canonical, complete) {
    let fieldsAdded = 0;
    
    // Add composition if missing or empty
    if (complete.composition && (!canonical.composition || Object.keys(canonical.composition).length === 0)) {
        canonical.composition = complete.composition;
        fieldsAdded++;
    }
    
    // Add tribology
    const trib = complete.tribology || complete.friction;
    if (trib && !canonical.tribology) {
        canonical.tribology = trib;
        fieldsAdded++;
    }
    
    // Add surface_integrity
    const surf = complete.surface_integrity || complete.surfaceIntegrity;
    if (surf && !canonical.surface_integrity) {
        canonical.surface_integrity = surf;
        fieldsAdded++;
    }
    
    // Add thermal_machining
    const therm = complete.thermal_machining || complete.thermalMachining;
    if (therm && !canonical.thermal_machining) {
        canonical.thermal_machining = therm;
        fieldsAdded++;
    }
    
    // Add designation/identification (cross-references like UNS, DIN, JIS)
    const desig = complete.designation || complete.identification;
    if (desig && !canonical.designation) {
        canonical.designation = desig;
        fieldsAdded++;
    }
    
    // Add statistical data
    const statData = complete.statisticalData || complete.statistics;
    if (statData && !canonical.statistics) {
        canonical.statistics = statData;
        fieldsAdded++;
    }
    
    return fieldsAdded;
}

function convertCompleteToCanonical(complete, group) {
    // Convert a complete-only material to canonical format
    const m = {
        material_id: complete.id || `${group.charAt(0)}-NEW-${Date.now().toString(36)}`,
        name: complete.name,
        iso_group: complete.iso_group || group.split('_')[0],
        material_type: complete.material_class || complete._category || 'general',
        subcategory: complete._subcategory || 'general',
        condition: complete.condition || 'unknown',
        data_quality: 'merged_from_complete',
        data_sources: ['materials_complete'],
    };
    
    // Copy all available physics data
    const copyFields = ['physical', 'mechanical', 'kienzle', 'taylor', 'johnson_cook', 
                        'cutting_recommendations', 'machinability', 'chip_formation', 'surface',
                        'thermal', 'weldability', 'standards', 'composition', 'tribology',
                        'surface_integrity', 'thermal_machining', 'designation', 'statistics'];
    
    for (const field of copyFields) {
        const val = complete[field] || complete[FIELD_MAP[field] || ''];
        if (val) m[field] = val;
    }
    
    // Handle camelCase → snake_case conversions
    if (complete.chipFormation && !m.chip_formation) m.chip_formation = complete.chipFormation;
    if (complete.thermalMachining && !m.thermal_machining) m.thermal_machining = complete.thermalMachining;
    if (complete.surfaceIntegrity && !m.surface_integrity) m.surface_integrity = complete.surfaceIntegrity;
    if (complete.statisticalData && !m.statistics) m.statistics = complete.statisticalData;
    if (complete.identification && !m.designation) m.designation = complete.identification;
    
    // Handle recommendations → cutting_recommendations
    if (complete.recommendations && !m.cutting_recommendations) m.cutting_recommendations = complete.recommendations;
    
    return m;
}

// Main merge loop
console.log('=== M-0 MATERIAL SCHEMA MERGE ===\n');

for (const group of GROUPS) {
    const canDir = path.join(CANONICAL_BASE, group);
    const comDir = path.join(COMPLETE_BASE, group);
    
    const canMaterials = loadMaterials(canDir);
    const comMaterials = loadMaterials(comDir);
    
    let groupEnriched = 0, groupAdded = 0;
    
    // Phase 1: Enrich matched materials
    // We need to modify the actual files, so load file-by-file
    const canFiles = fs.existsSync(canDir) ? fs.readdirSync(canDir).filter(f => f.endsWith('.json')) : [];
    
    for (const file of canFiles) {
        const filePath = path.join(canDir, file);
        let raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
        let json;
        try { json = JSON.parse(raw); } catch(e) { continue; }
        
        const arr = json.materials || (Array.isArray(json) ? json : [json]);
        let fileModified = false;
        
        for (const m of arr) {
            if (!m.name) continue;
            const key = m.name.toLowerCase().trim();
            const comMatch = comMaterials.get(key);
            
            if (comMatch) {
                const added = mergeFields(m, comMatch);
                if (added > 0) {
                    groupEnriched++;
                    fileModified = true;
                }
            }
        }
        
        if (fileModified) {
            // Write back - preserve wrapper format
            if (json.materials) {
                fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
            } else if (Array.isArray(json)) {
                fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
            } else {
                fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
            }
        }
    }
    
    // Phase 2: Add complete-only materials
    const newMaterials = [];
    for (const [name, comMat] of comMaterials) {
        if (!canMaterials.has(name)) {
            newMaterials.push(convertCompleteToCanonical(comMat, group));
            groupAdded++;
        }
    }
    
    if (newMaterials.length > 0) {
        const newFile = path.join(canDir, `merged_from_complete.json`);
        fs.writeFileSync(newFile, JSON.stringify({ materials: newMaterials }, null, 2), 'utf8');
    }
    
    stats.enriched += groupEnriched;
    stats.added += groupAdded;
    stats.byGroup[group] = { enriched: groupEnriched, added: groupAdded };
    
    console.log(`${group}: enriched=${groupEnriched}, added=${groupAdded}`);
}

console.log(`\n=== MERGE COMPLETE ===`);
console.log(`Total enriched: ${stats.enriched}`);
console.log(`Total added: ${stats.added}`);
console.log(`Total materials affected: ${stats.enriched + stats.added}`);
console.log(`Errors: ${stats.errors}`);
console.log(JSON.stringify(stats.byGroup, null, 2));
