const fs = require('fs');
const path = require('path');

const ALARM_DIR = 'C:\\PRISM\\extracted\\controllers\\alarms';
const CORE_DB = 'C:\\PRISM\\data\\controllers\\CONTROLLER_ALARM_DATABASE.json';
const ARCHIVE_DIR = path.join(ALARM_DIR, 'archive');

// Create archive dir
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

// Load core DB alarms (richer schema)
let coreAlarms = new Map();
if (fs.existsSync(CORE_DB)) {
    const raw = fs.readFileSync(CORE_DB, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    if (json.controller_alarm_db?.controllers) {
        for (const ctrl of json.controller_alarm_db.controllers) {
            for (const alarm of (ctrl.alarm_codes || [])) {
                const id = alarm.alarm_id || `ALM-${ctrl.controller_family}-${alarm.alarm_code}`;
                coreAlarms.set(id, { ...alarm, controller_family: ctrl.controller_family, _source: 'core_db' });
            }
        }
    }
    console.log(`Core DB: ${coreAlarms.size} alarms loaded`);
}

// Group files by controller
const files = fs.readdirSync(ALARM_DIR).filter(f => f.endsWith('.json'));
const byController = {};

for (const file of files) {
    const ctrl = file.replace(/_ALARMS.*\.json/, '').replace(/_COMPLETE.*\.json/, '').replace(/_EXPANDED.*\.json/, '');
    if (!byController[ctrl]) byController[ctrl] = [];
    byController[ctrl].push(file);
}

let totalUnique = 0, totalMergedFromCore = 0;

for (const [ctrl, ctrlFiles] of Object.entries(byController)) {
    const alarmMap = new Map();
    
    // Load all files for this controller, deduplicating
    // Load in order: base first, then complete (richer), then expanded
    const sorted = ctrlFiles.sort((a, b) => {
        if (a.includes('EXPANDED')) return 1;
        if (b.includes('EXPANDED')) return -1;
        if (a.includes('COMPLETE')) return 1;
        if (b.includes('COMPLETE')) return -1;
        return 0;
    });
    
    // Actually we want COMPLETE to overwrite base (it's richer)
    // So load base first, then complete overwrites, then expanded adds extras
    const loadOrder = ctrlFiles.sort((a, b) => {
        const score = (f) => {
            if (f.includes('COMPLETE')) return 2;
            if (f.includes('EXPANDED')) return 3;
            return 1; // base
        };
        return score(a) - score(b);
    });
    
    for (const file of loadOrder) {
        const fp = path.join(ALARM_DIR, file);
        const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
        const json = JSON.parse(raw);
        const alarms = json.alarms || (Array.isArray(json) ? json : []);
        
        for (const alarm of alarms) {
            if (!alarm.alarm_id) continue;
            
            const existing = alarmMap.get(alarm.alarm_id);
            if (existing) {
                // Merge: keep existing fields, add new ones from this file
                for (const [key, val] of Object.entries(alarm)) {
                    if (!existing[key] || (typeof existing[key] === 'string' && existing[key].length < (typeof val === 'string' ? val.length : 0))) {
                        existing[key] = val;
                    }
                }
            } else {
                alarmMap.set(alarm.alarm_id, { ...alarm });
            }
        }
    }
    
    // Merge core DB alarms for this controller
    let coreMerged = 0;
    for (const [id, coreAlarm] of coreAlarms) {
        if (coreAlarm.controller_family?.toUpperCase() === ctrl.replace(/_/g, ' ').toUpperCase() ||
            coreAlarm.controller_family?.toUpperCase() === ctrl.toUpperCase() ||
            id.includes(ctrl)) {
            
            const existing = alarmMap.get(id);
            if (existing) {
                // Enrich with core data
                if (coreAlarm.causes && (!existing.causes || existing.causes.length === 0)) {
                    existing.causes = coreAlarm.causes;
                }
                if (coreAlarm.description && (!existing.description || existing.description.length < coreAlarm.description.length)) {
                    existing.description = coreAlarm.description;
                }
                if (coreAlarm.requires_power_cycle !== undefined) existing.requires_power_cycle = coreAlarm.requires_power_cycle;
                if (coreAlarm.requires_service !== undefined) existing.requires_service = coreAlarm.requires_service;
                if (coreAlarm.common_parts) existing.common_parts = coreAlarm.common_parts;
                if (coreAlarm.related_parameters) existing.related_parameters = coreAlarm.related_parameters;
                coreMerged++;
            } else {
                // Add new alarm from core
                alarmMap.set(id, {
                    alarm_id: id,
                    code: coreAlarm.alarm_code || coreAlarm.code,
                    name: coreAlarm.alarm_name || coreAlarm.name,
                    controller_family: ctrl.replace(/_/g, ' ').toUpperCase(),
                    category: coreAlarm.category || 'SYSTEM',
                    severity: coreAlarm.severity || 'MEDIUM',
                    description: coreAlarm.description || coreAlarm.message_text || '',
                    causes: coreAlarm.causes || [],
                    quick_fix: coreAlarm.quick_fix || coreAlarm.description || '',
                    requires_power_cycle: coreAlarm.requires_power_cycle || false,
                    requires_service: coreAlarm.requires_service || false,
                    common_parts: coreAlarm.common_parts,
                    related_parameters: coreAlarm.related_parameters,
                    _source: 'core_db'
                });
                coreMerged++;
            }
        }
    }
    
    totalMergedFromCore += coreMerged;
    
    // Write consolidated master file
    const alarms = Array.from(alarmMap.values()).sort((a, b) => {
        // Sort by code numerically
        const codeA = parseInt(String(a.code).replace(/\D/g, '')) || 0;
        const codeB = parseInt(String(b.code).replace(/\D/g, '')) || 0;
        return codeA - codeB;
    });
    
    const masterFile = path.join(ALARM_DIR, `${ctrl}_ALARMS_MASTER.json`);
    fs.writeFileSync(masterFile, JSON.stringify({
        metadata: {
            controller_family: ctrl.replace(/_/g, ' '),
            total_alarms: alarms.length,
            consolidated_from: ctrlFiles,
            core_db_merged: coreMerged,
            consolidated_date: new Date().toISOString()
        },
        alarms
    }, null, 2), 'utf8');
    
    totalUnique += alarms.length;
    
    // Archive source files
    for (const file of ctrlFiles) {
        const src = path.join(ALARM_DIR, file);
        const dst = path.join(ARCHIVE_DIR, file);
        fs.renameSync(src, dst);
    }
    
    console.log(`${ctrl}: ${alarms.length} unique alarms (merged from ${ctrlFiles.length} files, ${coreMerged} core enrichments) -> ${ctrl}_ALARMS_MASTER.json`);
}

console.log(`\n=== ALM-0 CONSOLIDATION COMPLETE ===`);
console.log(`Total unique alarms: ${totalUnique}`);
console.log(`Core DB enrichments: ${totalMergedFromCore}`);
console.log(`Source files archived to: ${ARCHIVE_DIR}`);
console.log(`Master files created: ${Object.keys(byController).length}`);
