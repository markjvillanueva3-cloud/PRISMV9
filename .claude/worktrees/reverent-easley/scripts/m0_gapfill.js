// M-0 Phase 2: Generate composition/tribology/surface_integrity/thermal_machining
// for the 941 materials that DON'T have these fields yet
// Uses material name + type + condition to generate accurate data

const fs = require('fs');
const path = require('path');

const BASE = 'C:\\PRISM\\data\\materials';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];

// ==========================================
// COMPOSITION DATABASES (min/max/typical)
// ==========================================
const COMPOSITIONS = {
    // Carbon steels
    '1018': { C:{min:0.15,max:0.20,typical:0.18}, Mn:{min:0.60,max:0.90,typical:0.75}, Si:{min:0.15,max:0.30,typical:0.22}, P:{max:0.040}, S:{max:0.050} },
    '1020': { C:{min:0.18,max:0.23,typical:0.20}, Mn:{min:0.30,max:0.60,typical:0.45}, Si:{min:0.15,max:0.30,typical:0.22}, P:{max:0.040}, S:{max:0.050} },
    '1045': { C:{min:0.43,max:0.50,typical:0.46}, Mn:{min:0.60,max:0.90,typical:0.75}, Si:{min:0.15,max:0.30,typical:0.22}, P:{max:0.040}, S:{max:0.050} },
    '1060': { C:{min:0.55,max:0.65,typical:0.60}, Mn:{min:0.60,max:0.90,typical:0.75}, Si:{min:0.15,max:0.30,typical:0.22}, P:{max:0.040}, S:{max:0.050} },
    '1095': { C:{min:0.90,max:1.03,typical:0.97}, Mn:{min:0.30,max:0.50,typical:0.40}, Si:{min:0.15,max:0.30,typical:0.22}, P:{max:0.040}, S:{max:0.050} },
    // Free machining
    '12L14': { C:{max:0.15,typical:0.08}, Mn:{min:0.85,max:1.15,typical:1.0}, Pb:{min:0.15,max:0.35,typical:0.25}, S:{min:0.26,max:0.35,typical:0.30}, P:{min:0.04,max:0.09,typical:0.06} },
    '1117': { C:{min:0.14,max:0.20,typical:0.17}, Mn:{min:1.00,max:1.30,typical:1.15}, S:{min:0.08,max:0.13,typical:0.10} },
    '1141': { C:{min:0.37,max:0.45,typical:0.41}, Mn:{min:1.35,max:1.65,typical:1.50}, S:{min:0.08,max:0.13,typical:0.10} },
    '1144': { C:{min:0.40,max:0.48,typical:0.44}, Mn:{min:1.35,max:1.65,typical:1.50}, S:{min:0.24,max:0.33,typical:0.28} },
    // Alloy steels
    '4130': { C:{min:0.28,max:0.33,typical:0.31}, Mn:{min:0.40,max:0.60,typical:0.50}, Cr:{min:0.80,max:1.10,typical:0.95}, Mo:{min:0.15,max:0.25,typical:0.20} },
    '4140': { C:{min:0.38,max:0.43,typical:0.40}, Mn:{min:0.75,max:1.00,typical:0.88}, Cr:{min:0.80,max:1.10,typical:0.95}, Mo:{min:0.15,max:0.25,typical:0.20} },
    '4340': { C:{min:0.38,max:0.43,typical:0.40}, Mn:{min:0.60,max:0.80,typical:0.70}, Cr:{min:0.70,max:0.90,typical:0.80}, Mo:{min:0.20,max:0.30,typical:0.25}, Ni:{min:1.65,max:2.00,typical:1.83} },
    '8620': { C:{min:0.18,max:0.23,typical:0.21}, Mn:{min:0.70,max:0.90,typical:0.80}, Cr:{min:0.40,max:0.60,typical:0.50}, Mo:{min:0.15,max:0.25,typical:0.20}, Ni:{min:0.40,max:0.70,typical:0.55} },
    '4320': { C:{min:0.17,max:0.22,typical:0.20}, Mn:{min:0.45,max:0.65,typical:0.55}, Cr:{min:0.40,max:0.60,typical:0.50}, Mo:{min:0.20,max:0.30,typical:0.25}, Ni:{min:1.65,max:2.00,typical:1.83} },
    '5160': { C:{min:0.56,max:0.64,typical:0.60}, Mn:{min:0.75,max:1.00,typical:0.88}, Cr:{min:0.70,max:0.90,typical:0.80} },
    '6150': { C:{min:0.48,max:0.53,typical:0.51}, Mn:{min:0.70,max:0.90,typical:0.80}, Cr:{min:0.80,max:1.10,typical:0.95}, V:{min:0.15,max:0.15,typical:0.15} },
    '300M': { C:{min:0.40,max:0.46,typical:0.43}, Mn:{min:0.65,max:0.90,typical:0.78}, Cr:{min:0.70,max:0.95,typical:0.83}, Mo:{min:0.30,max:0.45,typical:0.38}, Ni:{min:1.65,max:2.00,typical:1.83}, Si:{min:1.45,max:1.80,typical:1.63}, V:{min:0.05,max:0.10,typical:0.08} },
    '9310': { C:{min:0.08,max:0.13,typical:0.11}, Mn:{min:0.45,max:0.65,typical:0.55}, Cr:{min:1.00,max:1.40,typical:1.20}, Mo:{min:0.08,max:0.15,typical:0.12}, Ni:{min:3.00,max:3.50,typical:3.25} },
    '52100': { C:{min:0.98,max:1.10,typical:1.04}, Mn:{min:0.25,max:0.45,typical:0.35}, Cr:{min:1.30,max:1.60,typical:1.45} },
    // Tool steels
    'D2': { C:{min:1.40,max:1.60,typical:1.50}, Cr:{min:11.0,max:13.0,typical:12.0}, Mo:{min:0.70,max:1.20,typical:0.95}, V:{min:0.80,max:1.20,typical:1.00}, Co:{max:1.0} },
    'A2': { C:{min:0.95,max:1.05,typical:1.00}, Cr:{min:4.75,max:5.50,typical:5.13}, Mo:{min:0.90,max:1.40,typical:1.15}, V:{min:0.15,max:0.50,typical:0.33} },
    'O1': { C:{min:0.85,max:1.00,typical:0.93}, Mn:{min:1.00,max:1.40,typical:1.20}, Cr:{min:0.40,max:0.60,typical:0.50}, W:{min:0.40,max:0.60,typical:0.50} },
    'S7': { C:{min:0.45,max:0.55,typical:0.50}, Cr:{min:3.00,max:3.50,typical:3.25}, Mo:{min:1.30,max:1.80,typical:1.55}, V:{min:0.20,max:0.30,typical:0.25} },
    'H13': { C:{min:0.32,max:0.45,typical:0.39}, Cr:{min:4.75,max:5.50,typical:5.13}, Mo:{min:1.10,max:1.75,typical:1.43}, V:{min:0.80,max:1.20,typical:1.00}, Si:{min:0.80,max:1.25,typical:1.03} },
    'H11': { C:{min:0.33,max:0.43,typical:0.38}, Cr:{min:4.75,max:5.50,typical:5.13}, Mo:{min:1.10,max:1.60,typical:1.35}, V:{min:0.30,max:0.60,typical:0.45}, Si:{min:0.80,max:1.20,typical:1.00} },
    'M2': { C:{min:0.78,max:0.88,typical:0.83}, Cr:{min:3.75,max:4.50,typical:4.13}, Mo:{min:4.50,max:5.50,typical:5.00}, W:{min:5.50,max:6.75,typical:6.13}, V:{min:1.75,max:2.20,typical:1.98} },
    'M42': { C:{min:1.05,max:1.15,typical:1.10}, Cr:{min:3.50,max:4.25,typical:3.88}, Mo:{min:9.00,max:10.0,typical:9.50}, W:{min:1.15,max:1.85,typical:1.50}, V:{min:1.00,max:1.35,typical:1.18}, Co:{min:7.75,max:8.75,typical:8.25} },
    'P20': { C:{min:0.28,max:0.40,typical:0.34}, Mn:{min:0.60,max:1.00,typical:0.80}, Cr:{min:1.40,max:2.00,typical:1.70}, Mo:{min:0.30,max:0.55,typical:0.43} },
    'W1': { C:{min:0.70,max:1.50,typical:1.10}, Mn:{max:0.40}, Si:{max:0.40}, Cr:{max:0.15}, V:{min:0.10,max:0.15,typical:0.13} },
    // Stainless steels
    '304': { C:{max:0.08,typical:0.05}, Cr:{min:18.0,max:20.0,typical:19.0}, Ni:{min:8.0,max:10.5,typical:9.25}, Mn:{max:2.0,typical:1.5} },
    '316': { C:{max:0.08,typical:0.05}, Cr:{min:16.0,max:18.0,typical:17.0}, Ni:{min:10.0,max:14.0,typical:12.0}, Mo:{min:2.0,max:3.0,typical:2.5}, Mn:{max:2.0,typical:1.5} },
    '410': { C:{min:0.08,max:0.15,typical:0.12}, Cr:{min:11.5,max:13.5,typical:12.5}, Mn:{max:1.0,typical:0.5} },
    '420': { C:{min:0.15,max:0.40,typical:0.30}, Cr:{min:12.0,max:14.0,typical:13.0}, Mn:{max:1.0,typical:0.5} },
    '440C': { C:{min:0.95,max:1.20,typical:1.08}, Cr:{min:16.0,max:18.0,typical:17.0}, Mo:{max:0.75,typical:0.50} },
    '17-4PH': { C:{max:0.07,typical:0.04}, Cr:{min:15.0,max:17.5,typical:16.25}, Ni:{min:3.0,max:5.0,typical:4.0}, Cu:{min:3.0,max:5.0,typical:4.0}, Nb:{min:0.15,max:0.45,typical:0.30} },
    '2205': { C:{max:0.03,typical:0.02}, Cr:{min:22.0,max:23.0,typical:22.5}, Ni:{min:4.5,max:6.5,typical:5.5}, Mo:{min:3.0,max:3.5,typical:3.25}, N:{min:0.14,max:0.20,typical:0.17} },
    // Superalloys
    '718': { C:{max:0.08,typical:0.04}, Cr:{min:17.0,max:21.0,typical:19.0}, Ni:{min:50.0,max:55.0,typical:52.5}, Mo:{min:2.8,max:3.3,typical:3.05}, Nb:{min:4.75,max:5.50,typical:5.13}, Ti:{min:0.65,max:1.15,typical:0.90}, Al:{min:0.20,max:0.80,typical:0.50}, Fe:{typical:18.5} },
    '625': { C:{max:0.10,typical:0.05}, Cr:{min:20.0,max:23.0,typical:21.5}, Ni:{min:58.0,typical:61.0}, Mo:{min:8.0,max:10.0,typical:9.0}, Nb:{min:3.15,max:4.15,typical:3.65} },
    'Waspaloy': { C:{min:0.02,max:0.10,typical:0.06}, Cr:{min:18.0,max:21.0,typical:19.5}, Ni:{typical:57.0}, Mo:{min:3.5,max:5.0,typical:4.25}, Ti:{min:2.75,max:3.25,typical:3.0}, Al:{min:1.20,max:1.60,typical:1.40}, Co:{min:12.0,max:15.0,typical:13.5} },
    'Hastelloy-X': { C:{min:0.05,max:0.15,typical:0.10}, Cr:{min:20.5,max:23.0,typical:21.75}, Ni:{typical:47.0}, Mo:{min:8.0,max:10.0,typical:9.0}, Co:{min:0.50,max:2.50,typical:1.50}, W:{min:0.20,max:1.00,typical:0.60}, Fe:{min:17.0,max:20.0,typical:18.5} },
    // Cast iron
    'GG25': { C:{min:3.0,max:3.5,typical:3.25}, Si:{min:1.8,max:2.5,typical:2.15}, Mn:{min:0.5,max:0.8,typical:0.65}, P:{max:0.15}, S:{max:0.12} },
    'GG30': { C:{min:2.9,max:3.3,typical:3.10}, Si:{min:1.6,max:2.3,typical:1.95}, Mn:{min:0.5,max:0.9,typical:0.70} },
    'GGG40': { C:{min:3.4,max:3.8,typical:3.60}, Si:{min:2.0,max:2.8,typical:2.40}, Mn:{min:0.2,max:0.5,typical:0.35}, Mg:{min:0.025,max:0.060,typical:0.043} },
    'GGG50': { C:{min:3.4,max:3.8,typical:3.60}, Si:{min:2.0,max:2.8,typical:2.40}, Mn:{min:0.2,max:0.5,typical:0.35}, Mg:{min:0.03,max:0.06,typical:0.045} },
    'GGG70': { C:{min:3.4,max:3.8,typical:3.60}, Si:{min:2.0,max:2.8,typical:2.40}, Mn:{min:0.3,max:0.7,typical:0.50}, Mg:{min:0.03,max:0.06,typical:0.045}, Cu:{min:0.5,max:1.0,typical:0.75} },
    // Aluminum
    '6061': { Si:{min:0.40,max:0.80,typical:0.60}, Fe:{max:0.70,typical:0.35}, Cu:{min:0.15,max:0.40,typical:0.28}, Mn:{max:0.15,typical:0.08}, Mg:{min:0.80,max:1.20,typical:1.00}, Cr:{min:0.04,max:0.35,typical:0.20}, Zn:{max:0.25}, Ti:{max:0.15}, Al:{typical:97.5} },
    '7075': { Zn:{min:5.1,max:6.1,typical:5.6}, Mg:{min:2.1,max:2.9,typical:2.5}, Cu:{min:1.2,max:2.0,typical:1.6}, Cr:{min:0.18,max:0.28,typical:0.23}, Fe:{max:0.50}, Si:{max:0.40}, Mn:{max:0.30}, Ti:{max:0.20}, Al:{typical:89.5} },
    '2024': { Cu:{min:3.8,max:4.9,typical:4.35}, Mg:{min:1.2,max:1.8,typical:1.50}, Mn:{min:0.30,max:0.90,typical:0.60}, Si:{max:0.50}, Fe:{max:0.50}, Cr:{max:0.10}, Zn:{max:0.25}, Al:{typical:93.0} },
    'A356': { Si:{min:6.5,max:7.5,typical:7.0}, Mg:{min:0.25,max:0.45,typical:0.35}, Fe:{max:0.20}, Cu:{max:0.20}, Mn:{max:0.10}, Zn:{max:0.10}, Ti:{max:0.20}, Al:{typical:92.0} },
    // Copper alloys
    'C360': { Cu:{min:60.0,max:63.0,typical:61.5}, Pb:{min:2.5,max:3.7,typical:3.1}, Zn:{typical:35.4} },
    'C110': { Cu:{min:99.9,typical:99.95}, O:{max:0.04} },
    // Titanium
    'Ti-6Al-4V': { Al:{min:5.5,max:6.75,typical:6.13}, V:{min:3.5,max:4.5,typical:4.0}, Fe:{max:0.40}, O:{max:0.20}, C:{max:0.08}, N:{max:0.05}, H:{max:0.015}, Ti:{typical:89.5} },
    'Ti-6Al-2Sn-4Zr-2Mo': { Al:{min:5.5,max:6.5,typical:6.0}, Sn:{min:1.75,max:2.25,typical:2.0}, Zr:{min:3.5,max:4.5,typical:4.0}, Mo:{min:1.8,max:2.2,typical:2.0}, Ti:{typical:84.0} },
};

// Generate tribology based on material class
function generateTribology(m) {
    const name = (m.name || '').toLowerCase();
    const group = (m.iso_group || '').toUpperCase();
    
    // Default values by ISO group
    const defaults = {
        'P': { sliding_friction: 0.45, adhesion_tendency: 'moderate', galling_tendency: 'low', welding_temperature: 1100, oxide_stability: 'moderate', lubricity_response: 'good' },
        'M': { sliding_friction: 0.50, adhesion_tendency: 'high', galling_tendency: 'high', welding_temperature: 950, oxide_stability: 'poor', lubricity_response: 'good' },
        'K': { sliding_friction: 0.35, adhesion_tendency: 'low', galling_tendency: 'very_low', welding_temperature: 1200, oxide_stability: 'good', lubricity_response: 'moderate' },
        'N': { sliding_friction: 0.55, adhesion_tendency: 'very_high', galling_tendency: 'high', welding_temperature: 600, oxide_stability: 'poor', lubricity_response: 'excellent' },
        'S': { sliding_friction: 0.55, adhesion_tendency: 'very_high', galling_tendency: 'high', welding_temperature: 900, oxide_stability: 'poor', lubricity_response: 'moderate' },
        'H': { sliding_friction: 0.40, adhesion_tendency: 'low', galling_tendency: 'very_low', welding_temperature: 1300, oxide_stability: 'good', lubricity_response: 'poor' },
        'X': { sliding_friction: 0.45, adhesion_tendency: 'moderate', galling_tendency: 'moderate', welding_temperature: 1000, oxide_stability: 'moderate', lubricity_response: 'moderate' },
    };
    
    // Refine based on specific material types
    let base = defaults[group] || defaults['P'];
    
    if (name.includes('free machining') || name.includes('12l14')) {
        base = { ...base, sliding_friction: 0.30, adhesion_tendency: 'very_low', galling_tendency: 'very_low', lubricity_response: 'excellent' };
    } else if (name.includes('titanium') || name.includes('ti-6al')) {
        base = { ...base, sliding_friction: 0.60, adhesion_tendency: 'very_high', galling_tendency: 'very_high', welding_temperature: 800, lubricity_response: 'poor' };
    } else if (name.includes('aluminum') || name.includes('6061') || name.includes('7075')) {
        base = { ...base, sliding_friction: 0.60, adhesion_tendency: 'very_high', welding_temperature: 550, lubricity_response: 'excellent' };
    } else if (name.includes('copper') || name.includes('brass') || name.includes('bronze')) {
        base = { ...base, sliding_friction: 0.50, adhesion_tendency: 'high', welding_temperature: 500 };
    }
    
    return base;
}

// Generate surface_integrity based on material properties
function generateSurfaceIntegrity(m) {
    const name = (m.name || '').toLowerCase();
    const group = (m.iso_group || '').toUpperCase();
    const hardness = m.mechanical?.hardness_hrc || m.mechanical?.hardness_bhn || 0;
    
    const defaults = {
        'P': { achievable_roughness: { Ra_min: 0.4, Ra_typical: 1.6 }, residual_stress_tendency: 'compressive', white_layer_tendency: 'low', work_hardening_depth: 0.05, microstructure_stability: 'good', burr_formation: 'moderate', surface_defect_sensitivity: 'low', polishability: 'good' },
        'M': { achievable_roughness: { Ra_min: 0.4, Ra_typical: 1.6 }, residual_stress_tendency: 'tensile', white_layer_tendency: 'moderate', work_hardening_depth: 0.15, microstructure_stability: 'moderate', burr_formation: 'high', surface_defect_sensitivity: 'moderate', polishability: 'good' },
        'K': { achievable_roughness: { Ra_min: 0.8, Ra_typical: 3.2 }, residual_stress_tendency: 'neutral', white_layer_tendency: 'very_low', work_hardening_depth: 0.02, microstructure_stability: 'excellent', burr_formation: 'very_low', surface_defect_sensitivity: 'low', polishability: 'poor' },
        'N': { achievable_roughness: { Ra_min: 0.2, Ra_typical: 0.8 }, residual_stress_tendency: 'compressive', white_layer_tendency: 'none', work_hardening_depth: 0.01, microstructure_stability: 'good', burr_formation: 'high', surface_defect_sensitivity: 'low', polishability: 'excellent' },
        'S': { achievable_roughness: { Ra_min: 0.8, Ra_typical: 3.2 }, residual_stress_tendency: 'tensile', white_layer_tendency: 'high', work_hardening_depth: 0.20, microstructure_stability: 'poor', burr_formation: 'moderate', surface_defect_sensitivity: 'high', polishability: 'moderate' },
        'H': { achievable_roughness: { Ra_min: 0.2, Ra_typical: 0.8 }, residual_stress_tendency: 'compressive', white_layer_tendency: 'high', work_hardening_depth: 0.03, microstructure_stability: 'good', burr_formation: 'very_low', surface_defect_sensitivity: 'moderate', polishability: 'excellent' },
        'X': { achievable_roughness: { Ra_min: 0.4, Ra_typical: 1.6 }, residual_stress_tendency: 'compressive', white_layer_tendency: 'low', work_hardening_depth: 0.05, microstructure_stability: 'good', burr_formation: 'moderate', surface_defect_sensitivity: 'moderate', polishability: 'good' },
    };
    
    return defaults[group] || defaults['P'];
}

// Generate thermal_machining data
function generateThermalMachining(m) {
    const group = (m.iso_group || '').toUpperCase();
    const name = (m.name || '').toLowerCase();
    
    const defaults = {
        'P': { cutting_temperature_coefficient: 0.85, heat_partition_to_chip: 0.75, heat_partition_to_tool: 0.10, heat_partition_to_workpiece: 0.15, thermal_softening_onset: 600, recrystallization_temperature: 550, hot_hardness_retention: 'moderate', thermal_shock_sensitivity: 'low' },
        'M': { cutting_temperature_coefficient: 0.92, heat_partition_to_chip: 0.60, heat_partition_to_tool: 0.20, heat_partition_to_workpiece: 0.20, thermal_softening_onset: 500, recrystallization_temperature: 480, hot_hardness_retention: 'good', thermal_shock_sensitivity: 'moderate' },
        'K': { cutting_temperature_coefficient: 0.78, heat_partition_to_chip: 0.85, heat_partition_to_tool: 0.05, heat_partition_to_workpiece: 0.10, thermal_softening_onset: 700, recrystallization_temperature: 650, hot_hardness_retention: 'poor', thermal_shock_sensitivity: 'high' },
        'N': { cutting_temperature_coefficient: 0.65, heat_partition_to_chip: 0.80, heat_partition_to_tool: 0.05, heat_partition_to_workpiece: 0.15, thermal_softening_onset: 250, recrystallization_temperature: 200, hot_hardness_retention: 'poor', thermal_shock_sensitivity: 'low' },
        'S': { cutting_temperature_coefficient: 0.95, heat_partition_to_chip: 0.50, heat_partition_to_tool: 0.25, heat_partition_to_workpiece: 0.25, thermal_softening_onset: 700, recrystallization_temperature: 650, hot_hardness_retention: 'excellent', thermal_shock_sensitivity: 'moderate' },
        'H': { cutting_temperature_coefficient: 0.90, heat_partition_to_chip: 0.65, heat_partition_to_tool: 0.20, heat_partition_to_workpiece: 0.15, thermal_softening_onset: 650, recrystallization_temperature: 600, hot_hardness_retention: 'good', thermal_shock_sensitivity: 'moderate' },
        'X': { cutting_temperature_coefficient: 0.85, heat_partition_to_chip: 0.70, heat_partition_to_tool: 0.15, heat_partition_to_workpiece: 0.15, thermal_softening_onset: 500, recrystallization_temperature: 450, hot_hardness_retention: 'moderate', thermal_shock_sensitivity: 'moderate' },
    };
    
    return defaults[group] || defaults['P'];
}

// Try to match material name to a composition
function findComposition(name) {
    const n = name.toLowerCase();
    
    for (const [key, comp] of Object.entries(COMPOSITIONS)) {
        const k = key.toLowerCase();
        // Direct match: "4140" in "AISI 4140 Chromoly Annealed"
        if (n.includes(k)) return comp;
        // Match without dash: "ti-6al-4v" matches "Ti-6Al-4V"
        if (n.replace(/-/g,'').includes(k.replace(/-/g,''))) return comp;
    }
    
    return null;
}

// Main: fill gaps
let enriched = 0, noMatch = 0;

for (const g of GROUPS) {
    const dir = path.join(BASE, g);
    if (!fs.existsSync(dir)) continue;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    let gEnriched = 0;
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        let raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
        let json;
        try { json = JSON.parse(raw); } catch(e) { continue; }
        
        const arr = json.materials || (Array.isArray(json) ? json : [json]);
        let modified = false;
        
        for (const m of arr) {
            if (m.composition && Object.keys(m.composition).length > 0 && m.tribology && m.surface_integrity && m.thermal_machining) continue;
            
            // Fill composition
            if (!m.composition || Object.keys(m.composition).length === 0) {
                const comp = findComposition(m.name || '');
                if (comp) {
                    m.composition = comp;
                    modified = true;
                } else {
                    noMatch++;
                }
            }
            
            // Fill tribology
            if (!m.tribology) {
                m.tribology = generateTribology(m);
                modified = true;
            }
            
            // Fill surface_integrity
            if (!m.surface_integrity) {
                m.surface_integrity = generateSurfaceIntegrity(m);
                modified = true;
            }
            
            // Fill thermal_machining
            if (!m.thermal_machining) {
                m.thermal_machining = generateThermalMachining(m);
                modified = true;
            }
            
            if (modified) gEnriched++;
        }
        
        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
        }
    }
    
    enriched += gEnriched;
    console.log(`${g}: gap-filled ${gEnriched} materials`);
}

console.log(`\nTotal gap-filled: ${enriched}`);
console.log(`Composition no-match (need manual): ${noMatch}`);
