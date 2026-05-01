const fs = require("fs");
const path = require("path");
const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());

let total = 0, verified = 0, estimated = 0, genV5 = 0;
let zeros = { density: 0, melting_point: 0, elastic_modulus: 0, tensile: 0, yield: 0, elongation: 0, thermal_cond: 0, kc1_1: 0, taylor_C: 0, jc_A: 0 };
let byGroup = {};
let sampleBad = [];

for (const grp of groups) {
  const grpPath = path.join(baseDir, grp);
  const files = fs.readdirSync(grpPath).filter(f => f.endsWith(".json"));
  byGroup[grp] = { files: files.length, materials: 0, zeros: 0 };
  
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(grpPath, file), "utf-8");
      const data = JSON.parse(raw);
      const mats = Array.isArray(data) ? data : (data.materials || [data]);
      
      for (const m of mats) {
        total++;
        byGroup[grp].materials++;
        if (m.data_quality === "verified") verified++;
        else estimated++;
        if (m._converted && m._converted.from === "gen_v5") genV5++;
        
        let matZeros = 0;
        const p = m.physical || {};
        if (!p.density || p.density === 0) { zeros.density++; matZeros++; }
        if (!p.melting_point || p.melting_point === 0) { zeros.melting_point++; matZeros++; }
        if (!p.elastic_modulus || p.elastic_modulus === 0) { zeros.elastic_modulus++; matZeros++; }
        if (!p.thermal_conductivity || p.thermal_conductivity === 0) { zeros.thermal_cond++; matZeros++; }
        
        const mech = m.mechanical || {};
        if (!mech.tensile_strength?.typical) { zeros.tensile++; matZeros++; }
        if (!mech.yield_strength?.typical) { zeros.yield++; matZeros++; }
        if (!mech.elongation) { zeros.elongation++; matZeros++; }
        
        const k = m.kienzle || {};
        if (!k.kc1_1 || k.kc1_1 === 0) { zeros.kc1_1++; matZeros++; }
        
        const t = m.taylor || {};
        if (!t.C || t.C === 0) { zeros.taylor_C++; matZeros++; }
        
        const jc = m.johnson_cook || {};
        if (!jc.A || jc.A === 0) { zeros.jc_A++; matZeros++; }
        
        if (matZeros >= 3 && sampleBad.length < 5) {
          sampleBad.push({ id: m.material_id || m.name, group: grp, zeros: matZeros, dq: m.data_quality });
        }
        if (matZeros > 0) byGroup[grp].zeros++;
      }
    } catch(e) {}
  }
}

const report = { total, verified, estimated, genV5, zeros, byGroup, sampleBad };
console.log(JSON.stringify(report, null, 2));
