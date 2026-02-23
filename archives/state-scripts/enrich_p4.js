const fs = require("fs");
const path = require("path");

const SURFACE_DEFAULTS = {
  P_STEELS: { Ra_min: 0.4, Ra_typical: 1.6, Ra_max: 3.2, residual: "compressive", white_layer: "low", wh_depth: 0.05, burr: "moderate", polishability: "good" },
  M_STAINLESS: { Ra_min: 0.6, Ra_typical: 1.6, Ra_max: 3.2, residual: "tensile", white_layer: "low", wh_depth: 0.10, burr: "heavy", polishability: "fair" },
  H_HARDENED: { Ra_min: 0.2, Ra_typical: 0.8, Ra_max: 1.6, residual: "compressive", white_layer: "high", wh_depth: 0.03, burr: "minimal", polishability: "excellent" },
  K_CAST_IRON: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 4.0, residual: "compressive", white_layer: "low", wh_depth: 0.02, burr: "minimal", polishability: "fair" },
  N_NONFERROUS: { Ra_min: 0.2, Ra_typical: 0.8, Ra_max: 2.0, residual: "compressive", white_layer: "none", wh_depth: 0.01, burr: "heavy", polishability: "excellent" },
  S_SUPERALLOYS: { Ra_min: 0.8, Ra_typical: 1.6, Ra_max: 3.2, residual: "tensile", white_layer: "moderate", wh_depth: 0.15, burr: "moderate", polishability: "fair" },
  X_SPECIALTY: { Ra_min: 0.4, Ra_typical: 1.2, Ra_max: 2.5, residual: "varies", white_layer: "moderate", wh_depth: 0.10, burr: "moderate", polishability: "fair" },
};

const TRIBOLOGY_DEFAULTS = {
  P_STEELS: { friction: 0.4, adhesion: "low", galling: "low", weld_temp: 1200, oxide: "moderate", lubricity: "good" },
  M_STAINLESS: { friction: 0.5, adhesion: "high", galling: "high", weld_temp: 1000, oxide: "excellent", lubricity: "poor" },
  H_HARDENED: { friction: 0.35, adhesion: "low", galling: "low", weld_temp: 1300, oxide: "moderate", lubricity: "moderate" },
  K_CAST_IRON: { friction: 0.3, adhesion: "low", galling: "low", weld_temp: 1100, oxide: "moderate", lubricity: "good" },
  N_NONFERROUS: { friction: 0.45, adhesion: "high", galling: "moderate", weld_temp: 600, oxide: "poor", lubricity: "moderate" },
  S_SUPERALLOYS: { friction: 0.55, adhesion: "very_high", galling: "high", weld_temp: 900, oxide: "excellent", lubricity: "poor" },
  X_SPECIALTY: { friction: 0.45, adhesion: "moderate", galling: "moderate", weld_temp: 800, oxide: "moderate", lubricity: "moderate" },
};

const THERMAL_DEFAULTS = {
  P_STEELS: { temp_coeff: 0.9, chip_part: 0.75, tool_part: 0.10, wp_part: 0.15, soften_onset: 500, recryst: 600, hot_hard: "moderate", shock_sens: "low" },
  M_STAINLESS: { temp_coeff: 1.2, chip_part: 0.55, tool_part: 0.20, wp_part: 0.25, soften_onset: 400, recryst: 550, hot_hard: "good", shock_sens: "moderate" },
  H_HARDENED: { temp_coeff: 0.8, chip_part: 0.70, tool_part: 0.15, wp_part: 0.15, soften_onset: 550, recryst: 650, hot_hard: "excellent", shock_sens: "low" },
  K_CAST_IRON: { temp_coeff: 0.7, chip_part: 0.80, tool_part: 0.08, wp_part: 0.12, soften_onset: 500, recryst: 600, hot_hard: "moderate", shock_sens: "low" },
  N_NONFERROUS: { temp_coeff: 0.6, chip_part: 0.85, tool_part: 0.05, wp_part: 0.10, soften_onset: 200, recryst: 300, hot_hard: "poor", shock_sens: "low" },
  S_SUPERALLOYS: { temp_coeff: 1.5, chip_part: 0.45, tool_part: 0.30, wp_part: 0.25, soften_onset: 600, recryst: 800, hot_hard: "excellent", shock_sens: "high" },
  X_SPECIALTY: { temp_coeff: 1.1, chip_part: 0.60, tool_part: 0.20, wp_part: 0.20, soften_onset: 400, recryst: 600, hot_hard: "moderate", shock_sens: "moderate" },
};

const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());
let stats = { total: 0, surface_filled: 0, tribology_filled: 0, thermal_filled: 0 };

for (const grp of groups) {
  const sDef = SURFACE_DEFAULTS[grp];
  const tDef = TRIBOLOGY_DEFAULTS[grp];
  const thDef = THERMAL_DEFAULTS[grp];
  if (!sDef) continue;
  
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
        let changed = false;
        
        // Surface integrity
        if (!m.surface_integrity || !m.surface_integrity.achievable_roughness || !m.surface_integrity.achievable_roughness.Ra_min) {
          m.surface_integrity = {
            achievable_roughness: { Ra_min: sDef.Ra_min, Ra_typical: sDef.Ra_typical, Ra_max: sDef.Ra_max },
            residual_stress_tendency: sDef.residual, white_layer_tendency: sDef.white_layer,
            work_hardening_depth: sDef.wh_depth, microstructure_stability: "good",
            burr_formation: sDef.burr, surface_defect_sensitivity: "low", polishability: sDef.polishability,
            _enriched: "R1-MS6-phase4",
          };
          stats.surface_filled++;
          changed = true;
        }
        
        // Tribology
        if (!m.tribology || !m.tribology.sliding_friction) {
          m.tribology = {
            sliding_friction: tDef.friction, adhesion_tendency: tDef.adhesion,
            galling_tendency: tDef.galling, welding_temperature: tDef.weld_temp,
            oxide_stability: tDef.oxide, lubricity_response: tDef.lubricity,
            _enriched: "R1-MS6-phase4",
          };
          stats.tribology_filled++;
          changed = true;
        }
        
        // Thermal machining
        if (!m.thermal_machining || !m.thermal_machining.cutting_temperature_coefficient) {
          m.thermal_machining = {
            cutting_temperature_coefficient: thDef.temp_coeff,
            heat_partition_to_chip: thDef.chip_part, heat_partition_to_tool: thDef.tool_part,
            heat_partition_to_workpiece: thDef.wp_part, thermal_softening_onset: thDef.soften_onset,
            recrystallization_temperature: thDef.recryst, hot_hardness_retention: thDef.hot_hard,
            thermal_shock_sensitivity: thDef.shock_sens,
            _enriched: "R1-MS6-phase4",
          };
          stats.thermal_filled++;
          changed = true;
        }
        
        if (changed) {
          if (!m._enrichment) m._enrichment = [];
          m._enrichment.push({ phase: "R1-MS6", date: new Date().toISOString().split("T")[0], method: "surface_tribology_thermal" });
          fileChanged = true;
        }
      }
      
      if (fileChanged) fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch(e) {}
  }
}
console.log(JSON.stringify(stats, null, 2));
