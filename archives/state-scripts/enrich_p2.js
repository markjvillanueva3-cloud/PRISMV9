// R1-MS6 Phase 2: Johnson-Cook enrichment for materials missing JC params
const fs = require("fs");
const path = require("path");

// Johnson-Cook defaults derived from published literature by ISO group
// A=yield stress, B=hardening modulus, n=hardening exp, C=strain rate sens, m=thermal softening
const JC_DEFAULTS = {
  P_STEELS: { A: 350, B: 600, n: 0.23, C: 0.015, m: 1.0, T_ref: 25 },
  M_STAINLESS: { A: 280, B: 700, n: 0.30, C: 0.020, m: 1.1, T_ref: 25 },
  H_HARDENED: { A: 800, B: 500, n: 0.18, C: 0.012, m: 0.9, T_ref: 25 },
  K_CAST_IRON: { A: 250, B: 400, n: 0.25, C: 0.010, m: 0.8, T_ref: 25 },
  N_NONFERROUS: { A: 150, B: 300, n: 0.35, C: 0.025, m: 1.2, T_ref: 25 },
  S_SUPERALLOYS: { A: 450, B: 1200, n: 0.30, C: 0.020, m: 1.3, T_ref: 25 },
  X_SPECIALTY: { A: 200, B: 500, n: 0.28, C: 0.018, m: 1.0, T_ref: 25 },
};

// Subcategory-specific JC for nonferrous
const JC_NONFERROUS = {
  aluminum: { A: 125, B: 250, n: 0.34, C: 0.015, m: 1.0 },
  copper: { A: 90, B: 292, n: 0.31, C: 0.025, m: 1.09 },
  bronze: { A: 112, B: 505, n: 0.42, C: 0.009, m: 1.68 },
  brass: { A: 100, B: 500, n: 0.40, C: 0.015, m: 1.5 },
  titanium: { A: 862, B: 331, n: 0.34, C: 0.012, m: 0.8 },
  magnesium: { A: 150, B: 200, n: 0.25, C: 0.015, m: 1.0 },
};

// Cutting recommendations defaults
const CUT_DEFAULTS = {
  P_STEELS: { turn_rough_v: 180, turn_fin_v: 250, turn_f_rough: 0.3, turn_f_fin: 0.1, mill_rough_v: 160, mill_fin_v: 220, mill_fz_rough: 0.15, mill_fz_fin: 0.08 },
  M_STAINLESS: { turn_rough_v: 120, turn_fin_v: 170, turn_f_rough: 0.25, turn_f_fin: 0.08, mill_rough_v: 100, mill_fin_v: 150, mill_fz_rough: 0.12, mill_fz_fin: 0.06 },
  H_HARDENED: { turn_rough_v: 80, turn_fin_v: 120, turn_f_rough: 0.15, turn_f_fin: 0.05, mill_rough_v: 60, mill_fin_v: 100, mill_fz_rough: 0.08, mill_fz_fin: 0.04 },
  K_CAST_IRON: { turn_rough_v: 200, turn_fin_v: 300, turn_f_rough: 0.3, turn_f_fin: 0.12, mill_rough_v: 180, mill_fin_v: 260, mill_fz_rough: 0.18, mill_fz_fin: 0.10 },
  N_NONFERROUS: { turn_rough_v: 350, turn_fin_v: 500, turn_f_rough: 0.35, turn_f_fin: 0.1, mill_rough_v: 300, mill_fin_v: 450, mill_fz_rough: 0.20, mill_fz_fin: 0.10 },
  S_SUPERALLOYS: { turn_rough_v: 35, turn_fin_v: 55, turn_f_rough: 0.2, turn_f_fin: 0.08, mill_rough_v: 25, mill_fin_v: 45, mill_fz_rough: 0.10, mill_fz_fin: 0.05 },
  X_SPECIALTY: { turn_rough_v: 50, turn_fin_v: 80, turn_f_rough: 0.2, turn_f_fin: 0.08, mill_rough_v: 40, mill_fin_v: 70, mill_fz_rough: 0.10, mill_fz_fin: 0.05 },
};

const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());
let stats = { jc_filled: 0, cutting_filled: 0, total: 0 };

for (const grp of groups) {
  const jcDef = JC_DEFAULTS[grp];
  const cutDef = CUT_DEFAULTS[grp];
  if (!jcDef) continue;
  
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
        
        // Fill Johnson-Cook
        if (!m.johnson_cook || !m.johnson_cook.A || m.johnson_cook.A === 0) {
          let jc = jcDef;
          // Subcategory-aware for nonferrous
          if (grp === "N_NONFERROUS" && m.subcategory) {
            const sub = m.subcategory.toLowerCase();
            for (const [key, vals] of Object.entries(JC_NONFERROUS)) {
              if (sub.includes(key)) { jc = { ...jcDef, ...vals }; break; }
            }
          }
          // Scale A from yield strength if available
          if (m.mechanical?.yield_strength?.typical) {
            jc = { ...jc, A: m.mechanical.yield_strength.typical * 0.95 };
          }
          m.johnson_cook = {
            A: Math.round(jc.A * 10) / 10,
            B: jc.B,
            n: jc.n,
            C: jc.C,
            m: jc.m,
            T_melt: m.physical?.melting_point || 1480,
            T_ref: jc.T_ref,
            _enriched: "R1-MS6-phase2",
          };
          stats.jc_filled++;
          fileChanged = true;
        }
        
        // Fill cutting recommendations
        if (!m.cutting_recommendations || m.cutting_recommendations._generated) {
          m.cutting_recommendations = {
            turning: {
              roughing: { speed: cutDef.turn_rough_v, fn_mm: cutDef.turn_f_rough, ap_max_mm: 4 },
              finishing: { speed: cutDef.turn_fin_v, fn_mm: cutDef.turn_f_fin, ap_max_mm: 0.5 },
            },
            milling: {
              roughing: { speed: cutDef.mill_rough_v, fz_mm: cutDef.mill_fz_rough, ap_max_factor: 1.0 },
              finishing: { speed: cutDef.mill_fin_v, fz_mm: cutDef.mill_fz_fin, ap_max_factor: 0.3 },
            },
            _enriched: "R1-MS6-phase2",
          };
          // Scale speeds by hardness if available
          if (m.mechanical?.hardness?.brinell) {
            const hb = m.mechanical.hardness.brinell;
            const factor = hb > 300 ? 0.6 : hb > 200 ? 0.8 : 1.0;
            m.cutting_recommendations.turning.roughing.speed = Math.round(cutDef.turn_rough_v * factor);
            m.cutting_recommendations.turning.finishing.speed = Math.round(cutDef.turn_fin_v * factor);
            m.cutting_recommendations.milling.roughing.speed = Math.round(cutDef.mill_rough_v * factor);
            m.cutting_recommendations.milling.finishing.speed = Math.round(cutDef.mill_fin_v * factor);
          }
          stats.cutting_filled++;
          fileChanged = true;
        }
        
        // Update enrichment log
        if (fileChanged) {
          if (!m._enrichment) m._enrichment = [];
          const existing = m._enrichment.find(e => e.phase === "R1-MS6" && e.method === "jc_cutting_defaults");
          if (!existing) {
            m._enrichment.push({
              phase: "R1-MS6",
              date: new Date().toISOString().split("T")[0],
              method: "jc_cutting_defaults",
            });
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
