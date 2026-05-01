const fs = require('fs');
const path = require('path');

const TOOL_DIR = 'C:\\PRISM\\data\\tools';
let stats = { vendor_normalized: 0, cutting_params_added: 0, files_modified: 0 };

// =========================================================
// 1. TOOLHOLDERS.json: manufacturer → vendor
// =========================================================
function normalizeToolholders() {
    const fp = path.join(TOOL_DIR, 'TOOLHOLDERS.json');
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const arr = json.tools || json;
    
    let modified = 0;
    for (const t of arr) {
        if (t.manufacturer && !t.vendor) {
            t.vendor = t.manufacturer;
            delete t.manufacturer;
            modified++;
        }
    }
    
    fs.writeFileSync(fp, JSON.stringify(json.tools ? json : { tools: arr }, null, 2), 'utf8');
    console.log(`TOOLHOLDERS: ${modified} manufacturer→vendor`);
    stats.vendor_normalized += modified;
    if (modified > 0) stats.files_modified++;
}

// =========================================================
// 2. Add cutting_params stubs to tools that lack them
//    For toolholders: no cutting params needed (they're holders)
//    For indexable bodies: add recommended speeds based on type
//    For manufacturer catalogs: add based on tool type
// =========================================================
function addCuttingParamsToIndexable() {
    const fp = path.join(TOOL_DIR, 'INDEXABLE_MILLING_TOOLHOLDING.json');
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const arr = json.tools || json;
    
    let added = 0;
    for (const t of arr) {
        if (t.cutting_params) continue; // already has it
        
        // Generate cutting params based on type
        const isFacemill = (t.subcategory || '').includes('facemill') || (t.id || '').includes('FACEMILL');
        const isShellmill = (t.subcategory || '').includes('shell') || (t.id || '').includes('SHELL');
        
        t.cutting_params = {
            materials: {
                P_STEELS: {
                    roughing: { vc_m_min: isFacemill ? 200 : 160, fz_mm: 0.20, ap_max_mm: t.max_doc_mm || 4.0 },
                    finishing: { vc_m_min: isFacemill ? 280 : 220, fz_mm: 0.12, ap_max_mm: 1.0 }
                },
                M_STAINLESS: {
                    roughing: { vc_m_min: isFacemill ? 160 : 120, fz_mm: 0.15, ap_max_mm: t.max_doc_mm || 3.0 },
                    finishing: { vc_m_min: isFacemill ? 220 : 180, fz_mm: 0.10, ap_max_mm: 0.8 }
                },
                K_CAST_IRON: {
                    roughing: { vc_m_min: isFacemill ? 250 : 200, fz_mm: 0.25, ap_max_mm: t.max_doc_mm || 5.0 },
                    finishing: { vc_m_min: isFacemill ? 350 : 280, fz_mm: 0.15, ap_max_mm: 1.5 }
                },
                N_NONFERROUS: {
                    roughing: { vc_m_min: isFacemill ? 500 : 400, fz_mm: 0.20, ap_max_mm: t.max_doc_mm || 6.0 },
                    finishing: { vc_m_min: isFacemill ? 800 : 600, fz_mm: 0.12, ap_max_mm: 2.0 }
                }
            },
            _generated: true,
            _note: "Estimated parameters for indexable body — actual values depend on insert grade and chipbreaker"
        };
        added++;
    }
    
    fs.writeFileSync(fp, JSON.stringify(json.tools ? json : { tools: arr }, null, 2), 'utf8');
    console.log(`INDEXABLE_MILLING: ${added} cutting_params added`);
    stats.cutting_params_added += added;
    if (added > 0) stats.files_modified++;
}

function addCuttingParamsToManufacturerCatalogs() {
    const fp = path.join(TOOL_DIR, 'MANUFACTURER_CATALOGS.json');
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const arr = json.tools || json;
    
    let added = 0;
    for (const t of arr) {
        if (t.cutting_params) continue;
        
        const cat = (t.category || '').toLowerCase();
        const sub = (t.subcategory || '').toLowerCase();
        const isMilling = cat.includes('mill') || sub.includes('mill');
        const isTurning = cat.includes('turn') || sub.includes('turn');
        const isDrilling = cat.includes('drill') || sub.includes('drill');
        
        if (isTurning) {
            t.cutting_params = {
                materials: {
                    P_STEELS: { roughing: { vc_m_min: 250, fn_mm: 0.30 }, finishing: { vc_m_min: 350, fn_mm: 0.12 } },
                    M_STAINLESS: { roughing: { vc_m_min: 180, fn_mm: 0.25 }, finishing: { vc_m_min: 250, fn_mm: 0.10 } },
                    K_CAST_IRON: { roughing: { vc_m_min: 300, fn_mm: 0.35 }, finishing: { vc_m_min: 400, fn_mm: 0.15 } },
                    N_NONFERROUS: { roughing: { vc_m_min: 500, fn_mm: 0.30 }, finishing: { vc_m_min: 800, fn_mm: 0.12 } }
                },
                _generated: true
            };
        } else if (isDrilling) {
            t.cutting_params = {
                materials: {
                    P_STEELS: { vc_m_min: 80, fn_mm_rev: 0.18 },
                    M_STAINLESS: { vc_m_min: 60, fn_mm_rev: 0.12 },
                    K_CAST_IRON: { vc_m_min: 100, fn_mm_rev: 0.22 },
                    N_NONFERROUS: { vc_m_min: 200, fn_mm_rev: 0.20 }
                },
                _generated: true
            };
        } else {
            // Default to milling
            t.cutting_params = {
                materials: {
                    P_STEELS: { roughing: { vc_m_min: 180, fz_mm: 0.15 }, finishing: { vc_m_min: 250, fz_mm: 0.08 } },
                    M_STAINLESS: { roughing: { vc_m_min: 130, fz_mm: 0.12 }, finishing: { vc_m_min: 200, fz_mm: 0.06 } },
                    K_CAST_IRON: { roughing: { vc_m_min: 220, fz_mm: 0.18 }, finishing: { vc_m_min: 320, fz_mm: 0.10 } },
                    N_NONFERROUS: { roughing: { vc_m_min: 400, fz_mm: 0.15 }, finishing: { vc_m_min: 600, fz_mm: 0.08 } }
                },
                _generated: true
            };
        }
        added++;
    }
    
    fs.writeFileSync(fp, JSON.stringify(json.tools ? json : { tools: arr }, null, 2), 'utf8');
    console.log(`MANUFACTURER_CATALOGS: ${added} cutting_params added`);
    stats.cutting_params_added += added;
    if (added > 0) stats.files_modified++;
}

// =========================================================
// 3. Add cutting_params to TURNING_HOLDERS_EXPANDED
// =========================================================
function addCuttingParamsToTurningHolders() {
    const fp = path.join(TOOL_DIR, 'TURNING_HOLDERS_EXPANDED.json');
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const arr = json.tools || json;
    
    let added = 0;
    for (const t of arr) {
        if (t.cutting_params) continue;
        
        // Turning holders: cutting params depend on the insert, not the holder
        // Add reference params + note
        t.cutting_params = {
            note: "Holder only — cutting parameters determined by installed insert",
            compatible_insert: t.compatible_insert || null,
            max_depth_of_cut_mm: t.approach_angle_deg ? null : undefined,
            _generated: true
        };
        added++;
    }
    
    fs.writeFileSync(fp, JSON.stringify(json.tools ? json : { tools: arr }, null, 2), 'utf8');
    console.log(`TURNING_HOLDERS_EXPANDED: ${added} cutting_params stubs added`);
    stats.cutting_params_added += added;
    if (added > 0) stats.files_modified++;
}

// Run all normalizations
console.log('=== T-0 TOOL SCHEMA NORMALIZATION ===\n');
normalizeToolholders();
addCuttingParamsToIndexable();
addCuttingParamsToManufacturerCatalogs();
addCuttingParamsToTurningHolders();

console.log(`\n=== COMPLETE ===`);
console.log(`vendor normalized: ${stats.vendor_normalized}`);
console.log(`cutting_params added: ${stats.cutting_params_added}`);
console.log(`files modified: ${stats.files_modified}`);
