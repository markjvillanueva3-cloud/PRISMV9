const fs = require('fs');
const path = require('path');

const CORE_DB = 'C:\\PRISM\\data\\controllers\\CONTROLLER_ALARM_DATABASE.json';
const ALARM_DIR = 'C:\\PRISM\\extracted\\controllers\\alarms';

// Load core DB
const coreJson = JSON.parse(fs.readFileSync(CORE_DB, 'utf8').replace(/^\uFEFF/, ''));
const coreAlarms = new Map();
for (const alarm of coreJson.alarms) {
    // Core uses FANUC-000, master uses ALM-FANUC-0000
    // Build lookup by controller+code
    const key = `${alarm.controller_family}-${alarm.alarm_code}`;
    coreAlarms.set(key, alarm);
}
console.log(`Core DB loaded: ${coreAlarms.size} alarms`);

// Enrich each master file
const masterFiles = fs.readdirSync(ALARM_DIR).filter(f => f.endsWith('_MASTER.json'));
let totalEnriched = 0;

for (const file of masterFiles) {
    const fp = path.join(ALARM_DIR, file);
    const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
    let enriched = 0;
    
    const ctrl = json.metadata.controller_family.replace(/ /g, '_').toUpperCase();
    
    for (const alarm of json.alarms) {
        // Try to match by controller+code
        const code = alarm.code || alarm.alarm_code || '';
        const lookupKey = `${ctrl.replace(/_/g, ' ')}-${code}`;
        const lookupKey2 = `${ctrl}-${code}`;
        
        const coreMatch = coreAlarms.get(lookupKey) || coreAlarms.get(lookupKey2);
        if (coreMatch) {
            // Enrich with core data
            if (coreMatch.causes && Array.isArray(coreMatch.causes) && coreMatch.causes.length > 0) {
                if (!alarm.causes || alarm.causes.length === 0 || (typeof alarm.causes[0] === 'string' && alarm.causes[0].length < 20)) {
                    alarm.causes = coreMatch.causes;
                }
            }
            if (coreMatch.requires_power_cycle !== undefined) alarm.requires_power_cycle = coreMatch.requires_power_cycle;
            if (coreMatch.requires_service !== undefined) alarm.requires_service = coreMatch.requires_service;
            if (coreMatch.common_parts && coreMatch.common_parts.length > 0) alarm.common_parts = coreMatch.common_parts;
            if (coreMatch.related_parameters && coreMatch.related_parameters.length > 0) alarm.related_parameters = coreMatch.related_parameters;
            if (coreMatch.fix_procedure_id) alarm.fix_procedure_id = coreMatch.fix_procedure_id;
            if (coreMatch.controller_models) alarm.controller_models = coreMatch.controller_models;
            enriched++;
        }
    }
    
    if (enriched > 0) {
        json.metadata.core_db_enriched = enriched;
        fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
    }
    
    totalEnriched += enriched;
    if (enriched > 0) console.log(`${file}: ${enriched} alarms enriched from core DB`);
}

console.log(`\nTotal enriched from core DB: ${totalEnriched}`);
