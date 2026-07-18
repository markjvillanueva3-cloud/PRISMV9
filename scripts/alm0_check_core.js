const fs = require('fs');
const CORE_DB = 'C:\\PRISM\\data\\controllers\\CONTROLLER_ALARM_DATABASE.json';
const raw = fs.readFileSync(CORE_DB, 'utf8').replace(/^\uFEFF/, '');
const json = JSON.parse(raw);

console.log('Top keys:', Object.keys(json));
if (json.controller_alarm_db) {
    console.log('controller_alarm_db keys:', Object.keys(json.controller_alarm_db));
    if (json.controller_alarm_db.controllers) {
        for (const ctrl of json.controller_alarm_db.controllers) {
            console.log(`  ${ctrl.controller_family}: ${(ctrl.alarm_codes || []).length} alarms`);
            if (ctrl.alarm_codes && ctrl.alarm_codes[0]) {
                const first = ctrl.alarm_codes[0];
                console.log(`    Sample: ${JSON.stringify(first).substring(0, 200)}`);
            }
        }
    }
} else {
    // Maybe different structure
    console.log(JSON.stringify(json).substring(0, 500));
}
