/**
 * PRISM Materials Database Rebuild - Parallel API Pipeline
 * =========================================================
 * Generates physics-verified material data using Claude API
 * 
 * Architecture:
 * - Reads existing material names from C:\PRISM\data\materials\
 * - Groups into batches of ~8 materials
 * - Runs 5 concurrent API calls to Claude Sonnet 4.5
 * - Validates physics constraints on every output
 * - Writes verified data to C:\PRISM\data\materials_verified\
 * - Tracks progress for resumability across micro-sessions
 * 
 * Usage: node generate.mjs [--group P_STEELS] [--file alloy_steel.json] [--concurrency 5]
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MATERIALS_DB: 'C:\\PRISM\\data\\materials',
  OUTPUT_DIR: 'C:\\PRISM\\data\\materials_verified',
  PROGRESS_FILE: 'C:\\PRISM\\scripts\\materials_rebuild\\progress.json',
  BATCH_SIZE: 4,
  CONCURRENCY: 5,
  MODEL: 'claude-sonnet-4-5-20250929',
  MAX_TOKENS: 16000,
  ISO_GROUPS: ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"],
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
};

const client = new Anthropic();

// ============================================================================
// PROGRESS TRACKER
// ============================================================================

function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { completed: {}, failed: {}, stats: { total: 0, done: 0, errors: 0, startTime: Date.now() } };
}

function saveProgress(progress) {
  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function batchKey(group, file, batchIdx) {
  return `${group}/${file}#${batchIdx}`;
}

// ============================================================================
// MATERIAL SCHEMA & PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a materials science and manufacturing engineering expert with deep knowledge of:
- ASM International Handbooks (Metals, Properties & Selection)
- Machining Data Handbook (MDH) by Metcut Research
- Kienzle cutting force model coefficients from published research
- Johnson-Cook constitutive model parameters from literature
- Taylor tool life equation constants from machining studies
- Machinery's Handbook cutting speed/feed recommendations

Your task: Generate ACCURATE, PHYSICALLY CONSISTENT material properties for CNC machining applications.

CRITICAL RULES:
1. Use REAL handbook values where you know them. For common alloys (1018, 1045, 4140, 6061, 7075, 304SS, Ti-6Al-4V, Inconel 718), you MUST use published values.
2. For less common alloys, INTERPOLATE from known data using physical metallurgy principles:
   - Hardness correlates with tensile strength via Tabor relation
   - Kienzle kc1_1 increases with hardness/strength
   - mc (Kienzle exponent) typically 0.14-0.40 for steels
   - Johnson-Cook A ≈ yield strength, B and n from strain hardening
   - Taylor C decreases with material hardness, n typically 0.1-0.4
3. ALL values must have REASONABLE PRECISION:
   - Density: 1 decimal (e.g., 7850.0)
   - kc1_1: integer (e.g., 1680)
   - mc: 2 decimals (e.g., 0.25)
   - Temperatures: integer
   - Hardness: integer
   - Strength values: integer MPa
4. Every value must be physically self-consistent within the material.
5. Heat treatment condition MUST match properties (annealed = soft, Q&T = harder proportional to HRC).

OUTPUT FORMAT: Return ONLY a JSON array of material objects. No markdown, no backticks, no explanation.`;

function buildBatchPrompt(materials, group, subcategory) {
  const names = materials.map(m => m.name);
  
  return `Generate complete material properties for these ${names.length} materials.
ISO Group: ${group} | Category: ${subcategory}

Materials: ${JSON.stringify(names)}

For each material, return an object with this EXACT structure:
{
  "name": "<exact name from list>",
  "material_id": "<group letter>-<short_code>-<NNN>",
  "iso_group": "<P|M|K|N|S|H|X>",
  "material_type": "<type>",
  "data_quality": "reference" or "interpolated" or "estimated",
  "physical": {
    "density": <kg/m³>, "melting_point": <°C>, "boiling_point": <°C or null>,
    "liquidus_temperature": <°C>, "solidus_temperature": <°C>,
    "latent_heat_fusion": <kJ/kg>, "specific_heat": <J/(kg·K)>,
    "thermal_conductivity": <W/(m·K)>, "thermal_expansion": <µm/(m·K)>,
    "electrical_resistivity": <µΩ·cm>, "magnetic_permeability": <relative>,
    "poisson_ratio": <0-0.5>, "elastic_modulus": <GPa>,
    "shear_modulus": <GPa>, "bulk_modulus": <GPa>
  },
  "mechanical": {
    "hardness": { "brinell": <HB>, "vickers": <HV>, "rockwell_c": <HRC or null>, "rockwell_b": <HRB or null> },
    "tensile_strength": { "typical": <MPa>, "min": <MPa>, "max": <MPa> },
    "yield_strength": { "typical": <MPa>, "min": <MPa>, "max": <MPa> },
    "elongation": <%>, "reduction_of_area": <%>,
    "impact_strength": <J Charpy>, "fatigue_strength": <MPa>,
    "fracture_toughness": <MPa√m>, "compressive_strength": <MPa>,
    "true_fracture_stress": <MPa>, "true_fracture_strain": <decimal>,
    "strain_rate_sensitivity": <decimal>
  },
  "kienzle": {
    "kc1_1": <N/mm² turning>, "mc": <exponent turning>,
    "kc1_1_milling": <N/mm²>, "mc_milling": <exponent>,
    "kc1_1_drilling": <N/mm²>, "mc_drilling": <exponent>
  },
  "johnson_cook": {
    "A": <MPa>, "B": <MPa>, "n": <exponent>, "C": <rate sensitivity>,
    "m": <thermal softening>, "T_melt": <°C>, "T_ref": <°C>, "epsilon_dot_ref": <1/s>
  },
  "taylor": {
    "C": <m/min HSS>, "n": <HSS>, "C_carbide": <m/min>, "n_carbide": <exponent>,
    "C_ceramic": <m/min or null>, "n_ceramic": <or null>,
    "C_cbn": <m/min or null>, "n_cbn": <or null>
  },
  "chip_formation": {
    "chip_type": "<continuous|segmented|discontinuous|lamellar>",
    "chip_breaking": "<easy|moderate|difficult|very_difficult>",
    "shear_angle": <degrees>, "chip_compression_ratio": <ratio>,
    "built_up_edge_tendency": "<none|low|moderate|high>",
    "segmentation_frequency": <kHz or null>,
    "min_chip_thickness": <mm>, "edge_radius_sensitivity": "<low|moderate|high>"
  },
  "tribology": {
    "friction_coefficient": <dry>, "friction_coefficient_dry": <val>,
    "friction_coefficient_flood": <val>, "friction_coefficient_mql": <val>,
    "wear_coefficient": <mm³/(N·m)>, "adhesion_tendency": "<low|moderate|high|very_high>",
    "abrasiveness": "<low|moderate|high|very_high>",
    "galling_tendency": "<none|low|moderate|high>",
    "crater_wear_coefficient": <normalized>, "flank_wear_coefficient": <normalized>
  },
  "thermal_machining": {
    "thermal_diffusivity": <mm²/s>, "heat_partition_coefficient": <0-1>,
    "critical_temperature": <°C>, "recrystallization_temperature": <°C>,
    "phase_transformation_temperature": <°C or null>,
    "maximum_cutting_temperature": <°C>, "emissivity": <0-1>,
    "heat_transfer_coefficient": <W/(m²·K)>
  },
  "surface_integrity": {
    "residual_stress_tendency": "<compressive|neutral|tensile>",
    "work_hardening_depth": <mm>, "white_layer_risk": "<none|low|moderate|high>",
    "surface_roughness_achievable": <Ra µm>, "burr_formation_tendency": "<low|moderate|high>",
    "microstructure_sensitivity": "<low|moderate|high>",
    "minimum_uncut_chip_thickness": <mm>, "ploughing_force_coefficient": <normalized>
  },
  "machinability": {
    "aisi_rating": <% vs B1112 or null>, "relative_to_1212": <ratio or null>,
    "machinability_index": <0-100>, "power_constant": <W·s/mm³>,
    "unit_power": <W/(cm³/min)>
  },
  "cutting_recommendations": {
    "turning": { "speed_roughing": <m/min>, "speed_finishing": <m/min>, "feed_roughing": <mm/rev>, "feed_finishing": <mm/rev>, "doc_roughing": <mm>, "doc_finishing": <mm> },
    "milling": { "speed_roughing": <m/min>, "speed_finishing": <m/min>, "feed_per_tooth_roughing": <mm>, "feed_per_tooth_finishing": <mm>, "doc_roughing": <mm>, "doc_finishing": <mm>, "woc_roughing": <mm or % of D>, "woc_finishing": <mm or % of D> },
    "drilling": { "speed": <m/min>, "feed_per_rev": <mm/rev>, "peck_depth_ratio": <ratio of D> },
    "tool_material": { "recommended_grade": "<text>", "coating_recommendation": "<text>", "geometry_recommendation": "<text>" },
    "coolant": { "type": "<flood|mql|dry|high_pressure>", "pressure": <bar>, "flow_rate": <L/min> }
  },
  "process_specific": {
    "grinding_ratio": <G-ratio>, "edm_machinability": "<poor|fair|good|excellent or null>",
    "laser_absorptivity": <0-1 or null>, "weldability_rating": "<poor|fair|good|excellent or null>"
  }
}

REMEMBER: cutting recommendations assume CARBIDE tools unless specified. Return ONLY the JSON array.`;
}

// ============================================================================
// PHYSICS VALIDATION
// ============================================================================

function validateMaterial(mat) {
  const errors = [];
  const warnings = [];
  const name = mat.name || 'UNNAMED';
  const iso = mat.iso_group || '';
  
  // Density checks by material family
  const d = mat.physical?.density;
  if (!d) errors.push('NO_DENSITY');
  else {
    if (iso === 'P' && (d < 7500 || d > 8200)) errors.push(`DENSITY ${d} out of steel range`);
    if (iso === 'M' && (d < 7500 || d > 8200)) errors.push(`DENSITY ${d} out of stainless range`);
    if (iso === 'K' && (d < 6800 || d > 7800)) errors.push(`DENSITY ${d} out of cast iron range`);
    if (iso === 'N' && (d < 1500 || d > 22000)) warnings.push(`DENSITY ${d} check nonferrous`);
    if (iso === 'S' && (d < 7700 || d > 9500)) errors.push(`DENSITY ${d} out of superalloy range`);
    if (iso === 'H' && (d < 7500 || d > 8500)) errors.push(`DENSITY ${d} out of hardened range`);
  }
  
  // Kienzle sanity
  const kc1 = mat.kienzle?.kc1_1;
  const mc = mat.kienzle?.mc;
  if (!kc1 && iso !== 'X') errors.push('NO_KC1');
  if (kc1 && iso === 'P' && (kc1 < 400 || kc1 > 3500)) errors.push(`KC1 ${kc1} out of range for steel`);
  if (mc && (mc < 0.05 || mc > 0.50)) warnings.push(`MC ${mc} unusual`);
  
  // Hardness vs condition consistency
  const hb = mat.mechanical?.hardness?.brinell;
  const hrc = mat.mechanical?.hardness?.rockwell_c;
  if (name.includes('Annealed') && hb && hb > 350 && iso === 'P') errors.push(`Annealed with HB=${hb} too high`);
  if (name.includes('Normalized') && hb && hb > 400 && iso === 'P') errors.push(`Normalized with HB=${hb} too high`);
  
  // Tensile-hardness correlation (Tabor: UTS ≈ 3.45 * HB for steels)
  const uts = mat.mechanical?.tensile_strength?.typical;
  if (hb && uts && iso === 'P') {
    const expected = hb * 3.45;
    const ratio = uts / expected;
    if (ratio < 0.6 || ratio > 1.5) warnings.push(`UTS/HB ratio ${ratio.toFixed(2)} (expected ~1.0)`);
  }
  
  // Johnson-Cook A ≈ yield strength
  const jcA = mat.johnson_cook?.A;
  const ys = mat.mechanical?.yield_strength?.typical;
  if (jcA && ys && Math.abs(jcA - ys) / ys > 0.3) warnings.push(`JC A=${jcA} vs YS=${ys} mismatch`);
  
  // Taylor C range
  const tayC = mat.taylor?.C;
  if (tayC && (tayC < 5 || tayC > 2000)) warnings.push(`Taylor C=${tayC} unusual`);
  
  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// API CALL WITH RETRY
// ============================================================================

async function callAPI(materials, group, subcategory, attempt = 1) {
  try {
    const response = await client.messages.create({
      model: CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildBatchPrompt(materials, group, subcategory) }],
    });
    
    const text = response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('');
    
    // Parse JSON - strip any markdown fences
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      // Try to recover truncated JSON by finding last complete object
      const lastCloseBracket = clean.lastIndexOf('}');
      if (lastCloseBracket > 0) {
        const truncated = clean.substring(0, lastCloseBracket + 1) + ']';
        try {
          parsed = JSON.parse(truncated);
          console.log(`    🔧 Recovered ${parsed.length} materials from truncated JSON`);
        } catch (e2) {
          // Try removing last incomplete object
          const lastObjStart = clean.lastIndexOf('{"name"');
          if (lastObjStart > 0) {
            const cleaned = clean.substring(0, lastObjStart).replace(/,\s*$/, '') + ']';
            parsed = JSON.parse(cleaned);
            console.log(`    🔧 Recovered ${parsed.length} materials (dropped last incomplete)`);
          } else {
            throw parseErr;
          }
        }
      } else {
        throw parseErr;
      }
    }
    
    if (!Array.isArray(parsed)) throw new Error('Response is not an array');
    return parsed;
    
  } catch (error) {
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      console.log(`  ⚠️ Attempt ${attempt} failed: ${error.message}. Retrying in ${CONFIG.RETRY_DELAY_MS/1000}s...`);
      await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS));
      return callAPI(materials, group, subcategory, attempt + 1);
    }
    throw error;
  }
}

// ============================================================================
// BATCH PROCESSOR
// ============================================================================

async function processBatch(batch, progress) {
  const { group, file, batchIdx, materials, subcategory } = batch;
  const key = batchKey(group, file, batchIdx);
  
  if (progress.completed[key]) {
    return { skipped: true, key };
  }
  
  const names = materials.map(m => m.name);
  console.log(`  🔄 ${key}: ${names.length} materials [${names[0]}...${names[names.length-1]}]`);
  
  try {
    const results = await callAPI(materials, group, subcategory);
    
    // Validate each material
    let validCount = 0;
    let warnCount = 0;
    const validated = [];
    
    for (const mat of results) {
      const v = validateMaterial(mat);
      if (v.valid) {
        validCount++;
        mat._quality = { validated: true, errors: [], warnings: v.warnings };
      } else {
        warnCount++;
        mat._quality = { validated: false, errors: v.errors, warnings: v.warnings };
        console.log(`    ⚠️ ${mat.name}: ${v.errors.join(', ')}`);
      }
      validated.push(mat);
    }
    
    progress.completed[key] = { 
      count: validated.length, 
      valid: validCount, 
      warnings: warnCount,
      timestamp: new Date().toISOString() 
    };
    progress.stats.done += validated.length;
    saveProgress(progress);
    
    console.log(`  ✅ ${key}: ${validCount}/${validated.length} valid`);
    return { success: true, key, materials: validated };
    
  } catch (error) {
    progress.failed[key] = { error: error.message, timestamp: new Date().toISOString() };
    progress.stats.errors++;
    saveProgress(progress);
    console.log(`  ❌ ${key}: ${error.message}`);
    return { success: false, key, error: error.message };
  }
}

// ============================================================================
// FILE WRITER
// ============================================================================

function writeOutputFile(group, file, allMaterials) {
  const outDir = path.join(CONFIG.OUTPUT_DIR, group);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const outPath = path.join(outDir, file);
  const output = {
    _metadata: {
      generated: new Date().toISOString(),
      generator: 'PRISM Materials Rebuild v1.0',
      model: CONFIG.MODEL,
      count: allMaterials.length,
      iso_group: group,
    },
    materials: allMaterials
  };
  
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`📁 Wrote ${allMaterials.length} materials to ${group}/${file}`);
}

// ============================================================================
// CONCURRENCY LIMITER
// ============================================================================

async function runWithConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();
  
  for (const task of tasks) {
    const p = task().then(result => {
      executing.delete(p);
      results.push(result);
      return result;
    });
    executing.add(p);
    
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const groupFilter = args.find(a => a.startsWith('--group='))?.split('=')[1];
  const fileFilter = args.find(a => a.startsWith('--file='))?.split('=')[1];
  const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || CONFIG.CONCURRENCY);
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       PRISM Materials Database Rebuild Pipeline             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Model: ${CONFIG.MODEL} | Batch: ${CONFIG.BATCH_SIZE} | Concurrency: ${concurrency}`);
  if (groupFilter) console.log(`Filter: group=${groupFilter}`);
  if (fileFilter) console.log(`Filter: file=${fileFilter}`);
  
  const progress = loadProgress();
  
  // Build batch list
  const allBatches = [];
  let totalMaterials = 0;
  
  const groups = groupFilter ? [groupFilter] : CONFIG.ISO_GROUPS;
  
  for (const group of groups) {
    const groupPath = path.join(CONFIG.MATERIALS_DB, group);
    if (!fs.existsSync(groupPath)) continue;
    
    let files = fs.readdirSync(groupPath).filter(f => f.endsWith('.json') && f !== 'index.json');
    if (fileFilter) files = files.filter(f => f === fileFilter);
    
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(groupPath, file), 'utf-8'));
        const materials = data.materials || [];
        const subcategory = file.replace('.json', '');
        
        // Split into batches
        for (let i = 0; i < materials.length; i += CONFIG.BATCH_SIZE) {
          const batch = materials.slice(i, i + CONFIG.BATCH_SIZE);
          allBatches.push({
            group, file, subcategory,
            batchIdx: Math.floor(i / CONFIG.BATCH_SIZE),
            materials: batch
          });
          totalMaterials += batch.length;
        }
      } catch (e) {
        console.error(`Failed to read ${group}/${file}: ${e.message}`);
      }
    }
  }
  
  progress.stats.total = totalMaterials;
  const alreadyDone = Object.keys(progress.completed).length;
  const remaining = allBatches.filter(b => !progress.completed[batchKey(b.group, b.file, b.batchIdx)]);
  
  console.log(`\nTotal: ${totalMaterials} materials in ${allBatches.length} batches`);
  console.log(`Already done: ${alreadyDone} batches | Remaining: ${remaining.length} batches`);
  console.log(`Estimated time: ~${Math.ceil(remaining.length / concurrency * 15 / 60)} minutes\n`);
  
  if (remaining.length === 0) {
    console.log('✅ All batches already completed!');
    return;
  }
  
  // Process by file to write incrementally
  const fileGroups = {};
  for (const batch of remaining) {
    const fk = `${batch.group}/${batch.file}`;
    if (!fileGroups[fk]) fileGroups[fk] = [];
    fileGroups[fk].push(batch);
  }
  
  for (const [fileKey, batches] of Object.entries(fileGroups)) {
    const [group, file] = fileKey.split('/');
    console.log(`\n📂 Processing ${fileKey} (${batches.length} batches, ${batches.reduce((s,b) => s + b.materials.length, 0)} materials)`);
    
    const tasks = batches.map(batch => () => processBatch(batch, progress));
    const results = await runWithConcurrency(tasks, concurrency);
    
    // Collect all materials for this file (including previously completed batches)
    const allBatchesForFile = allBatches.filter(b => b.group === group && b.file === file);
    let allMaterials = [];
    
    // Load previously completed from output if exists
    const outPath = path.join(CONFIG.OUTPUT_DIR, group, file);
    if (fs.existsSync(outPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
        allMaterials = existing.materials || [];
      } catch (e) {}
    }
    
    // Add new results
    for (const r of results) {
      if (r.success && r.materials) {
        allMaterials.push(...r.materials);
      }
    }
    
    if (allMaterials.length > 0) {
      writeOutputFile(group, file, allMaterials);
    }
  }
  
  // Final report
  const elapsed = (Date.now() - progress.stats.startTime) / 1000;
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    GENERATION COMPLETE                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Materials processed: ${progress.stats.done}`);
  console.log(`Errors: ${progress.stats.errors}`);
  console.log(`Time: ${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s`);
  saveProgress(progress);
}

main().catch(console.error);
