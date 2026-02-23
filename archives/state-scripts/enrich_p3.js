// R1-MS6 Phase 3: Kienzle operation-specific expansion
// Fill kc1_1_milling, mc_milling, kc1_1_drilling, mc_drilling from base kc1_1
const fs = require("fs");
const path = require("path");

const KIENZLE_RATIOS = {
  milling: { kc_factor: 0.88, mc_offset: -0.02 },     // milling typically 12% lower kc
  drilling: { kc_factor: 1.15, mc_offset: 0.03 },      // drilling typically 15% higher kc
  boring: { kc_factor: 1.05, mc_offset: 0.01 },        // boring slightly higher
  reaming: { kc_factor: 0.85, mc_offset: -0.03 },      // reaming lower
};

const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());
let stats = { total: 0, kienzle_expanded: 0, fields: 0 };

for (const grp of groups) {
  const grpPath = path.join(baseDir, grp);
  const files = fs.readdirSync(grpPath).filter(f => f.endsWith(".json"));
  
  for (const file of files) {
    const filePath = path.join(grpPath, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const mats = Array.isArray(data) ? data : (data.materials || [data]);
      let fileChanged = false;
      
      for (const m of mats) {
        stats.total++;
        if (!m.kienzle || !m.kienzle.kc1_1 || m.kienzle.kc1_1 === 0) continue;
        
        const kc = m.kienzle.kc1_1;
        const mc = m.kienzle.mc || 0.25;
        let expanded = false;
        
        for (const [op, ratio] of Object.entries(KIENZLE_RATIOS)) {
          const kcField = "kc1_1_" + op;
          const mcField = "mc_" + op;
          if (!m.kienzle[kcField] || m.kienzle[kcField] === 0 || m.kienzle[kcField] === null) {
            m.kienzle[kcField] = Math.round(kc * ratio.kc_factor);
            m.kienzle[mcField] = Math.round((mc + ratio.mc_offset) * 100) / 100;
            expanded = true;
            stats.fields += 2;
          }
        }
        
        if (expanded) {
          m.kienzle._enriched = "R1-MS6-phase3";
          stats.kienzle_expanded++;
          fileChanged = true;
          
          if (!m._enrichment) m._enrichment = [];
          const existing = m._enrichment.find(e => e.phase === "R1-MS6" && e.method === "kienzle_expansion");
          if (!existing) {
            m._enrichment.push({ phase: "R1-MS6", date: new Date().toISOString().split("T")[0], method: "kienzle_expansion" });
          }
        }
      }
      
      if (fileChanged) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }
    } catch(e) {}
  }
}

console.log(JSON.stringify(stats, null, 2));
