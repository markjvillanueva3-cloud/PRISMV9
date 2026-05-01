// R1-MS6 Material Enrichment Script - Phase 1: Physics-based defaults by ISO group
const fs = require("fs");
const path = require("path");

// Physics defaults by ISO group (from ASM Handbooks + Machining Data Handbook)
const DEFAULTS = {
  P_STEELS: {
    density: [7800, 7900, 7850], // [min, max, typical]
    melting_point: [1400, 1530, 1480],
    elastic_modulus: [190, 210, 205],
    thermal_conductivity: [25, 55, 42],
    specific_heat: [450, 530, 475],
    thermal_expansion: [10, 13, 11.5],
    poisson_ratio: [0.27, 0.30, 0.29],
    elongation_range: [5, 30],
    yield_from_tensile: 0.7, // yield ~ 70% of tensile for annealed
  },
  M_STAINLESS: {
    density: [7700, 8100, 7950],
    melting_point: [1370, 1510, 1450],
    elastic_modulus: [190, 210, 200],
    thermal_conductivity: [12, 25, 16],
    specific_heat: [450, 530, 500],
    thermal_expansion: [10, 18, 16],
    poisson_ratio: [0.27, 0.31, 0.29],
    elongation_range: [10, 55],
    yield_from_tensile: 0.45,
  },
  H_HARDENED: {
    density: [7700, 7900, 7800],
    melting_point: [1400, 1530, 1470],
    elastic_modulus: [190, 215, 210],
    thermal_conductivity: [20, 45, 35],
    specific_heat: [440, 520, 470],
    thermal_expansion: [10, 13, 11],
    poisson_ratio: [0.27, 0.30, 0.29],
    elongation_range: [2, 15],
    yield_from_tensile: 0.85,
  },
  K_CAST_IRON: {
    density: [6800, 7400, 7100],
    melting_point: [1130, 1350, 1200],
    elastic_modulus: [80, 180, 130],
    thermal_conductivity: [25, 55, 42],
    specific_heat: [450, 540, 500],
    thermal_expansion: [9, 13, 11],
    poisson_ratio: [0.25, 0.30, 0.27],
    elongation_range: [0, 18],
    yield_from_tensile: 0.65,
  },
  N_NONFERROUS: {
    density: [1700, 8900, 2700], // Wide range (Al to Cu)
    melting_point: [500, 1085, 660],
    elastic_modulus: [45, 130, 70],
    thermal_conductivity: [80, 400, 170],
    specific_heat: [380, 900, 900],
    thermal_expansion: [16, 24, 23],
    poisson_ratio: [0.30, 0.35, 0.33],
    elongation_range: [2, 45],
    yield_from_tensile: 0.55,
  },
  S_SUPERALLOYS: {
    density: [7800, 8900, 8400],
    melting_point: [1260, 1455, 1350],
    elastic_modulus: [180, 230, 210],
    thermal_conductivity: [8, 20, 12],
    specific_heat: [400, 520, 450],
    thermal_expansion: [10, 15, 13],
    poisson_ratio: [0.28, 0.33, 0.30],
    elongation_range: [5, 35],
    yield_from_tensile: 0.65,
  },
  X_SPECIALTY: {
    density: [1500, 16000, 4500],
    melting_point: [300, 3400, 1650],
    elastic_modulus: [40, 400, 115],
    thermal_conductivity: [5, 170, 20],
    specific_heat: [130, 1000, 500],
    thermal_expansion: [4, 25, 9],
    poisson_ratio: [0.20, 0.38, 0.30],
    elongation_range: [1, 40],
    yield_from_tensile: 0.6,
  },
};

// Taylor coefficients by ISO group (C = tool life constant, n = exponent)
const TAYLOR_DEFAULTS = {
  P_STEELS: { C: 250, n: 0.25, C_hss: 80, n_hss: 0.14 },
  M_STAINLESS: { C: 180, n: 0.22, C_hss: 55, n_hss: 0.12 },
  H_HARDENED: { C: 150, n: 0.20, C_hss: 40, n_hss: 0.10 },
  K_CAST_IRON: { C: 300, n: 0.28, C_hss: 100, n_hss: 0.16 },
  N_NONFERROUS: { C: 600, n: 0.35, C_hss: 200, n_hss: 0.20 },
  S_SUPERALLOYS: { C: 100, n: 0.18, C_hss: 30, n_hss: 0.08 },
  X_SPECIALTY: { C: 120, n: 0.20, C_hss: 35, n_hss: 0.10 },
};

const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());

let stats = { total: 0, enriched: 0, fields_filled: 0, by_group: {}, by_field: {} };

for (const grp of groups) {
  const defaults = DEFAULTS[grp];
  const taylorDef = TAYLOR_DEFAULTS[grp];
  if (!defaults) continue;
  
  stats.by_group[grp] = { materials: 0, enriched: 0, fields: 0 };
  const grpPath = path.join(baseDir, grp);
  const files = fs.readdirSync(grpPath).filter(f => f.endsWith(".json"));
  
  for (const file of files) {
    const filePath = path.join(grpPath, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      const mats = Array.isArray(data) ? data : (data.materials || [data]);
      let fileChanged = false;
      
      for (const m of mats) {
        stats.total++;
        stats.by_group[grp].materials++;
        let changed = false;
        
        if (!m.physical) m.physical = {};
        const p = m.physical;
        
        // Fill zero physical properties with group defaults
        const physFields = [
          ["density", defaults.density[2]],
          ["melting_point", defaults.melting_point[2]],
          ["elastic_modulus", defaults.elastic_modulus[2]],
          ["thermal_conductivity", defaults.thermal_conductivity[2]],
          ["specific_heat", defaults.specific_heat[2]],
          ["thermal_expansion", defaults.thermal_expansion[2]],
          ["poisson_ratio", defaults.poisson_ratio[2]],
        ];
        
        for (const [field, val] of physFields) {
          if (!p[field] || p[field] === 0) {
            // For N_NONFERROUS, try to infer from subcategory
            if (grp === "N_NONFERROUS" && m.subcategory) {
              const sub = m.subcategory.toLowerCase();
              if (sub.includes("aluminum") || sub.includes("aluminium")) {
                const alDefaults = { density: 2700, melting_point: 660, elastic_modulus: 70, thermal_conductivity: 170, specific_heat: 900, thermal_expansion: 23, poisson_ratio: 0.33 };
                p[field] = alDefaults[field] || val;
              } else if (sub.includes("copper") || sub.includes("bronze") || sub.includes("brass")) {
                const cuDefaults = { density: 8500, melting_point: 1050, elastic_modulus: 115, thermal_conductivity: 200, specific_heat: 385, thermal_expansion: 17, poisson_ratio: 0.34 };
                p[field] = cuDefaults[field] || val;
              } else if (sub.includes("titanium")) {
                const tiDefaults = { density: 4500, melting_point: 1660, elastic_modulus: 114, thermal_conductivity: 17, specific_heat: 520, thermal_expansion: 9, poisson_ratio: 0.34 };
                p[field] = tiDefaults[field] || val;
              } else {
                p[field] = val;
              }
            } else {
              p[field] = val;
            }
            changed = true;
            stats.fields_filled++;
            stats.by_field[field] = (stats.by_field[field] || 0) + 1;
          }
        }
        
        // Fill mechanical
        if (!m.mechanical) m.mechanical = {};
        const mech = m.mechanical;
        
        // Infer yield from tensile if missing
        if ((!mech.yield_strength || !mech.yield_strength.typical) && mech.tensile_strength?.typical) {
          if (!mech.yield_strength) mech.yield_strength = {};
          mech.yield_strength.typical = Math.round(mech.tensile_strength.typical * defaults.yield_from_tensile);
          changed = true;
          stats.fields_filled++;
          stats.by_field["yield_strength"] = (stats.by_field["yield_strength"] || 0) + 1;
        }
        
        // Fill elongation with midpoint estimate if zero
        if (!mech.elongation || mech.elongation === 0) {
          mech.elongation = Math.round((defaults.elongation_range[0] + defaults.elongation_range[1]) / 2);
          changed = true;
          stats.fields_filled++;
          stats.by_field["elongation"] = (stats.by_field["elongation"] || 0) + 1;
        }
        
        // Fill Taylor if missing
        if (!m.taylor) m.taylor = {};
        if (!m.taylor.C || m.taylor.C === 0) {
          m.taylor.C = taylorDef.C;
          m.taylor.n = taylorDef.n;
          m.taylor.C_hss = taylorDef.C_hss;
          m.taylor.n_hss = taylorDef.n_hss;
          m.taylor._enriched = "R1-MS6-group-default";
          changed = true;
          stats.fields_filled += 4;
          stats.by_field["taylor"] = (stats.by_field["taylor"] || 0) + 1;
        }
        
        // Mark enrichment
        if (changed) {
          if (!m._enrichment) m._enrichment = [];
          m._enrichment.push({
            phase: "R1-MS6",
            date: new Date().toISOString().split("T")[0],
            method: "group_physics_defaults",
            fields_filled: Object.keys(stats.by_field).length,
          });
          m.data_quality = m.data_quality === "verified" ? "verified" : "enriched";
          stats.enriched++;
          stats.by_group[grp].enriched++;
          fileChanged = true;
        }
      }
      
      // Write back if changed
      if (fileChanged) {
        const output = Array.isArray(data) ? data : (data.materials ? data : data);
        fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
        stats.by_group[grp].fields += 1;
      }
    } catch(e) {
      // Skip malformed files
    }
  }
}

console.log(JSON.stringify(stats, null, 2));
