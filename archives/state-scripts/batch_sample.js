const fs = require("fs");
const d = JSON.parse(fs.readFileSync("C:/PRISM/extracted/machines/ENHANCED/BATCH10_MAZAK_DEEP.json", "utf-8"));
const m = Array.isArray(d) ? d[0] : (d.machines ? d.machines[0] : d);
console.log(JSON.stringify(m, null, 2).substring(0, 2000));
