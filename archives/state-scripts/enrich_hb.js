const fs = require("fs");
const path = require("path");

// HB estimation: HB ? UTS/3.45 for steels, /3.0 for cast iron, /2.75 for Al
const HB_FACTORS = {
  P_STEELS: 3.45, M_STAINLESS: 3.45, H_HARDENED: 3.45,
  K_CAST_IRON: 3.0, N_NONFERROUS: 2.75, S_SUPERALLOYS: 3.2, X_SPECIALTY: 3.3,
};

const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());
let stats = { filled: 0, no_tensile: 0 };

for (const grp of groups) {
  const factor = HB_FACTORS[grp] || 3.3;
  const grpPath = path.join(baseDir, grp);
  const files = fs.readdirSync(grpPath).filter(f => f.endsWith(".json"));
  
  for (const file of files) {
    const filePath = path.join(grpPath, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const mats = Array.isArray(data) ? data : (data.materials || [data]);
      let fileChanged = false;
      
      for (const m of mats) {
        if (!m.mechanical) m.mechanical = {};
        if (!m.mechanical.hardness) m.mechanical.hardness = {};
        
        if (!m.mechanical.hardness.brinell || m.mechanical.hardness.brinell === 0) {
          if (m.mechanical.tensile_strength?.typical) {
            m.mechanical.hardness.brinell = Math.round(m.mechanical.tensile_strength.typical / factor);
            m.mechanical.hardness._enriched = "R1-MS6-hb-from-tensile";
            stats.filled++;
            fileChanged = true;
          } else {
            stats.no_tensile++;
          }
        }
      }
      if (fileChanged) fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch(e) {}
  }
}
console.log(JSON.stringify(stats));
