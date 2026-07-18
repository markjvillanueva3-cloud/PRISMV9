/**
 * R3 Schema Converter: gen_v5 → verified format
 * Converts materials_consolidated JSON to the format MaterialRegistry expects.
 * Run: node scripts/convert_gen_v5.js
 */
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\PRISM\\data\\materials_consolidated';
const DST = 'C:\\PRISM\\data\\materials';

// Map gen_v5 nested {value,unit} → flat value
function extractValue(field) {
  if (field === null || field === undefined) return null;
  if (typeof field === 'object' && 'value' in field) return field.value;
  return field;
}

function convertMaterial(src, isoGroup) {
  const m = {
    material_id: src.id || src.material_id,
    name: src.name || src.description || src.id,
    iso_group: isoGroup.charAt(0),
    material_type: src.family || src.group || 'unknown',
    subcategory: src.subcategory || '',
    condition: src.condition || 'unknown',
    data_quality: 'estimated',  // gen_v5 data is estimated
    data_sources: ['PRISM_gen_v5_consolidated'],
    physical: {
      density: extractValue(src.density),
      melting_point: extractValue(src.melting_temp) || extractValue(src.liquidus_temp),
      specific_heat: extractValue(src.specific_heat),
      thermal_conductivity: extractValue(src.thermal_conductivity),
      thermal_expansion: extractValue(src.thermal_expansion),
      elastic_modulus: extractValue(src.elastic_modulus),
      poisson_ratio: extractValue(src.poisson_ratio),
    },
    mechanical: {
      hardness: {
        brinell: extractValue(src.hardness_hb),
        vickers: extractValue(src.hardness_hv),
        rockwell_c: extractValue(src.hardness_hrc),
      },
      tensile_strength: { typical: extractValue(src.tensile_strength) },
      yield_strength: { typical: extractValue(src.yield_strength) },
      elongation: extractValue(src.elongation),
    },
    kienzle: {
      kc1_1: extractValue(src.kc1_1),
      mc: extractValue(src.mc),
      // gen_v5 has default 1650/1800 for ALL materials — these are bogus copy-paste values
      // Only keep milling/drilling if they differ from the known defaults
      kc1_1_milling: (extractValue(src.kc1_1_milling) !== 1650) ? extractValue(src.kc1_1_milling) : null,
      mc_milling: (extractValue(src.kc1_1_milling) !== 1650 && extractValue(src.mc)) ? extractValue(src.mc) - 0.02 : null,
      kc1_1_drilling: (extractValue(src.kc1_1_drilling) !== 1800) ? extractValue(src.kc1_1_drilling) : null,
      mc_drilling: (extractValue(src.kc1_1_drilling) !== 1800 && extractValue(src.mc)) ? extractValue(src.mc) + 0.02 : null,
    },
    chip_formation: {
      chip_type: src.chip_type || 'unknown',
      chip_breaking: src.chip_breakability || 'unknown',
      built_up_edge_tendency: src.built_up_edge_tendency || 'unknown',
      work_hardening_severity: src.work_hardening_severity || 'unknown',
    },
    machinability: {
      aisi_rating: extractValue(src.machinability_rating),
    },
    _converted: { from: 'gen_v5', date: new Date().toISOString().split('T')[0], session: 60 }
  };
  return m;
}

function processFile(filePath, isoGroup) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const materials = data.materials || [];
    const converted = materials
      .map(m => convertMaterial(m, isoGroup))
      .filter(m => m.material_id && m.kienzle.kc1_1);  // Only materials with Kienzle data
    return converted;
  } catch (e) {
    console.error(`  Error processing ${filePath}: ${e.message}`);
    return [];
  }
}

// Main
let totalConverted = 0;
let totalSkipped = 0;
const isoGroups = ['P_STEELS','M_STAINLESS','K_CAST_IRON','N_NONFERROUS','S_SUPERALLOYS','H_HARDENED','X_SPECIALTY'];

for (const group of isoGroups) {
  const srcDir = path.join(SRC, group);
  const dstDir = path.join(DST, group);
  if (!fs.existsSync(srcDir)) { console.log(`  ${group}: source not found`); continue; }
  if (!fs.existsSync(dstDir)) { fs.mkdirSync(dstDir, { recursive: true }); }
  
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  let groupConverted = 0;
  
  for (const file of files) {
    const converted = processFile(path.join(srcDir, file), group);
    if (converted.length > 0) {
      const outFile = path.join(dstDir, `gen_v5_${file}`);
      fs.writeFileSync(outFile, JSON.stringify({ materials: converted }, null, 2));
      groupConverted += converted.length;
    }
    totalSkipped += (JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf-8')).materials || []).length - converted.length;
  }
  
  totalConverted += groupConverted;
  console.log(`  ${group}: ${groupConverted} materials converted`);
}

console.log(`\nTotal: ${totalConverted} converted, ${totalSkipped} skipped (no kc1_1)`);
