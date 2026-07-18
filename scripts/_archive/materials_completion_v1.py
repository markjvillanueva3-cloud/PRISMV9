#!/usr/bin/env python3
"""
PRISM Materials Completion System v1.0
======================================
Full Option A: Enhance ALL materials + Add ALL missing categories

Uses API swarm for scientific accuracy with uncertainty quantification.
ASCII-only output. Checkpointed for resume capability.

Created: 2026-01-25
"""

import os
import sys
import json
import re
import time
import anthropic
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# === CONFIGURATION ===
MATERIALS_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials"
OUTPUT_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials_enhanced"
CHECKPOINT_FILE = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_CHECKPOINTS\materials_completion_checkpoint.json"
LOG_FILE = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\materials_completion_log.txt"

# API Configuration
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL_OPUS = "claude-opus-4-5-20251101"
MODEL_SONNET = "claude-sonnet-4-20250514"
MODEL_HAIKU = "claude-haiku-4-5-20251001"

# Batch sizes
ENHANCE_BATCH_SIZE = 10  # Materials per API call for enhancement
NEW_MATERIAL_BATCH_SIZE = 5  # New materials per API call

# === SCHEMA TEMPLATE ===
FULL_SCHEMA_TEMPLATE = '''
{
  "identification": {
    "id": "string - unique ID like P-CS-001",
    "name": "string - primary name like AISI 1018",
    "alternateNames": ["array of alternate designations"],
    "uns": "string - UNS number",
    "standard": "string - governing standard",
    "isoGroup": "P|M|K|N|S|H",
    "materialType": "string - classification",
    "condition": "string - heat treatment state"
  },
  "composition": {
    "element": {"min": number, "typical": number, "max": number}
  },
  "physicalProperties": {
    "density": {"value": number, "unit": "kg/m3"},
    "meltingRange": {"solidus": number, "liquidus": number, "unit": "C"},
    "thermalConductivity": {"value": number, "unit": "W/(m*K)"},
    "specificHeat": {"value": number, "unit": "J/(kg*K)"},
    "thermalExpansion": {"value": number, "unit": "10^-6/K"},
    "elasticModulus": {"value": number, "unit": "GPa"},
    "shearModulus": {"value": number, "unit": "GPa"},
    "poissonsRatio": {"value": number},
    "hardness": {"value": number, "unit": "HB or HRC", "condition": "string"}
  },
  "mechanicalProperties": {
    "tensileStrength": {"value": number, "min": number, "max": number, "unit": "MPa"},
    "yieldStrength": {"value": number, "unit": "MPa"},
    "elongation": {"value": number, "unit": "%"},
    "reductionOfArea": {"value": number, "unit": "%"},
    "fatigueStrength": {"value": number, "unit": "MPa"},
    "impactToughness": {"value": number, "unit": "J"},
    "fractureToughness": {"value": number, "unit": "MPa*sqrt(m)"}
  },
  "kienzle": {
    "kc1_1": {"value": number, "unit": "N/mm2", "uncertainty": "+-X%"},
    "mc": {"value": number, "uncertainty": "+-X"}
  },
  "taylorToolLife": {
    "hss": {"C": number, "n": number},
    "carbide_uncoated": {"C": number, "n": number},
    "carbide_coated": {"C": number, "n": number},
    "ceramic": {"C": number, "n": number},
    "cbn": {"C": number, "n": number}
  },
  "johnsonCook": {
    "A": {"value": number, "unit": "MPa"},
    "B": {"value": number, "unit": "MPa"},
    "n": {"value": number},
    "C": {"value": number},
    "m": {"value": number},
    "referenceStrainRate": {"value": number, "unit": "s^-1"},
    "meltingTemperature": {"value": number, "unit": "C"}
  },
  "chipFormation": {
    "chipType": "CONTINUOUS|DISCONTINUOUS|SEGMENTED|SERRATED",
    "shearAngle": {"value": number, "range": {"min": number, "max": number}, "unit": "degrees"},
    "chipCompressionRatio": {"value": number, "range": {"min": number, "max": number}},
    "builtUpEdgeTendency": "NONE|LOW|MODERATE|HIGH|SEVERE",
    "builtUpEdgeSpeedRange": {"min": number, "max": number, "unit": "m/min"},
    "chipBreakability": "POOR|FAIR|GOOD|EXCELLENT",
    "segmentationFrequency": {"value": number, "unit": "kHz", "condition": "string"}
  },
  "friction": {
    "toolChipInterface": {"dry": number, "withCoolant": number, "withMQL": number},
    "toolWorkpieceInterface": {"dry": number, "withCoolant": number},
    "adhesionTendency": "NONE|LOW|MODERATE|HIGH|SEVERE",
    "abrasiveness": "LOW|MODERATE|HIGH|VERY_HIGH",
    "diffusionWearTendency": "LOW|MODERATE|HIGH"
  },
  "thermalMachining": {
    "cuttingTemperatureModel": {
      "coefficients": {"a": number, "b": number, "c": number},
      "formula": "T = a * V^b * f^c",
      "maxRecommended": {"value": number, "unit": "C"}
    },
    "heatPartition": {
      "chip": number,
      "tool": number,
      "workpiece": number
    },
    "coolantEffectiveness": {
      "flood": {"temperatureReduction": number},
      "mql": {"temperatureReduction": number},
      "cryogenic": {"applicable": boolean, "benefit": "string"}
    },
    "thermalDamageThreshold": {"value": number, "unit": "C", "damageType": "string"}
  },
  "surfaceIntegrity": {
    "residualStress": {
      "surface": {"value": number, "type": "compressive|tensile", "unit": "MPa"},
      "depth": {"value": number, "unit": "um"}
    },
    "workHardening": {
      "depthAffected": {"value": number, "unit": "um"},
      "hardnessIncrease": {"value": number, "unit": "%"}
    },
    "achievableSurfaceRoughness": {
      "roughing": {"Ra": {"min": number, "max": number}},
      "finishing": {"Ra": {"min": number, "max": number}},
      "unit": "um"
    },
    "burrTendency": "LOW|MODERATE|HIGH",
    "whiteLayerRisk": "LOW|MODERATE|HIGH"
  },
  "machinability": {
    "rating": "A+|A|B+|B|C+|C|D|F",
    "percentOfB1112": number,
    "turningIndex": number,
    "millingIndex": number,
    "drillingIndex": number,
    "grindingIndex": number
  },
  "recommendedParameters": {
    "turning": {
      "roughing": {"speed": {"min": number, "opt": number, "max": number, "unit": "m/min"}, "feed": {"min": number, "opt": number, "max": number, "unit": "mm/rev"}, "doc": {"max": number, "unit": "mm"}},
      "finishing": {"speed": {"min": number, "opt": number, "max": number}, "feed": {"min": number, "opt": number, "max": number}, "doc": {"max": number}}
    },
    "milling": {
      "roughing": {"speed": number, "feedPerTooth": number, "ae": number, "ap": number},
      "finishing": {"speed": number, "feedPerTooth": number, "ae": number, "ap": number}
    },
    "drilling": {"speed": number, "feed": number, "peckDepth": "string"},
    "toolGeometry": {"rakeAngle": {"min": number, "max": number}, "clearanceAngle": number, "noseRadius": number},
    "insertGrade": {"iso": "string", "coating": ["array"], "alternatives": ["array"]},
    "coolant": {"recommended": "MANDATORY|RECOMMENDED|OPTIONAL|DRY_OK", "type": "string", "pressure": {"value": number, "unit": "bar"}}
  },
  "statisticalData": {
    "dataQuality": "ESTIMATED|LITERATURE|MEASURED|VALIDATED",
    "confidenceLevel": number,
    "sources": ["array of source references"],
    "uncertaintyBounds": {
      "mechanical": "+-X%",
      "cutting": "+-X%",
      "thermal": "+-X%"
    },
    "lastValidated": "YYYY-MM-DD",
    "crossValidated": boolean
  }
}
'''

def log(message, level="INFO"):
    """Log message to console and file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {message}"
    print(line)
    
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + "\n")

def load_checkpoint():
    """Load checkpoint if exists"""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {
        "phase": "ENHANCE",
        "enhanced_ids": [],
        "new_materials_created": [],
        "current_category": None,
        "current_batch": 0,
        "total_api_calls": 0,
        "total_tokens_used": 0,
        "started": datetime.now().isoformat(),
        "last_updated": datetime.now().isoformat()
    }

def save_checkpoint(checkpoint):
    """Save checkpoint"""
    checkpoint["last_updated"] = datetime.now().isoformat()
    os.makedirs(os.path.dirname(CHECKPOINT_FILE), exist_ok=True)
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f, indent=2)

def extract_materials_from_file(filepath):
    """Extract all materials from a JS file"""
    materials = {}
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Find material ID pattern
        id_pattern = r'"id":\s*"([A-Z]-[A-Z]{2,4}-\d{3})"'
        ids = re.findall(id_pattern, content)
        
        for mat_id in ids:
            # Find the material block
            # Look for "P-CS-001": { or 'P-CS-001': {
            block_patterns = [
                rf'"{mat_id}":\s*\{{',
                rf"'{mat_id}':\s*\{{"
            ]
            
            start_idx = None
            for pattern in block_patterns:
                match = re.search(pattern, content)
                if match:
                    start_idx = match.end() - 1
                    break
            
            if start_idx is None:
                continue
            
            # Find balanced braces
            brace_count = 0
            end_idx = None
            for i in range(start_idx, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break
            
            if end_idx:
                block = content[start_idx:end_idx]
                try:
                    # Clean for JSON parsing
                    block = re.sub(r'//.*$', '', block, flags=re.MULTILINE)
                    block = re.sub(r',\s*}', '}', block)
                    block = re.sub(r',\s*]', ']', block)
                    material = json.loads(block)
                    materials[mat_id] = {
                        "data": material,
                        "source_file": filepath
                    }
                except json.JSONDecodeError:
                    # Store raw for enhancement
                    materials[mat_id] = {
                        "raw": block,
                        "source_file": filepath
                    }
    except Exception as e:
        log(f"Error reading {filepath}: {e}", "ERROR")
    
    return materials

def check_material_completeness(material):
    """Check which sections are missing from a material"""
    required_sections = [
        "identification", "composition", "physicalProperties", "mechanicalProperties",
        "kienzle", "taylorToolLife", "johnsonCook", "chipFormation", "friction",
        "thermalMachining", "surfaceIntegrity", "machinability", 
        "recommendedParameters", "statisticalData"
    ]
    
    # Also check alternate naming
    alt_names = {
        "physicalProperties": ["physical"],
        "mechanicalProperties": ["mechanical"],
        "taylorToolLife": ["taylor"],
        "johnsonCook": ["johnson_cook"],
        "chipFormation": ["chip_formation"],
        "thermalMachining": ["thermal_machining"],
        "surfaceIntegrity": ["surface_integrity"],
        "recommendedParameters": ["recommended_cutting"],
        "statisticalData": ["statistical"]
    }
    
    missing = []
    present = []
    
    data = material.get("data", {})
    
    for section in required_sections:
        found = section in data
        if not found:
            # Check alternates
            for alt in alt_names.get(section, []):
                if alt in data:
                    found = True
                    break
        
        if found:
            present.append(section)
        else:
            missing.append(section)
    
    return {"missing": missing, "present": present, "complete": len(missing) == 0}

def create_enhancement_prompt(material_id, material_data, missing_sections):
    """Create prompt for enhancing a material with missing sections"""
    
    existing_json = json.dumps(material_data, indent=2) if isinstance(material_data, dict) else str(material_data)
    
    prompt = f"""You are a materials scientist and machining expert. Enhance this material with missing data sections.

MATERIAL ID: {material_id}

EXISTING DATA:
{existing_json[:3000]}  # Truncated for context

MISSING SECTIONS NEEDED: {', '.join(missing_sections)}

REQUIREMENTS:
1. Use scientifically accurate values based on the material type
2. Include uncertainty bounds (+-X%) for all numerical values
3. Cross-reference with ASM Handbook, Machining Data Handbook, manufacturer data
4. For cutting parameters, base on Kienzle model and Taylor tool life
5. Mark data quality: ESTIMATED, LITERATURE, or VALIDATED

Return ONLY valid JSON for the missing sections in this format:
{{
  "sectionName": {{ ... section data ... }},
  "sectionName2": {{ ... section data ... }}
}}

Be precise. Use realistic values. Include units. Add uncertainty where appropriate."""

    return prompt

def create_new_material_prompt(category, material_specs):
    """Create prompt for generating entirely new materials"""
    
    prompt = f"""You are a materials scientist. Generate complete material data for machining applications.

CATEGORY: {category}
MATERIALS TO CREATE: {json.dumps(material_specs, indent=2)}

Generate complete 127-parameter materials following this schema:
{FULL_SCHEMA_TEMPLATE}

REQUIREMENTS:
1. Scientific accuracy - use real material properties from literature
2. Include ALL sections - no placeholders
3. Uncertainty bounds on all numerical cutting/mechanical data
4. Realistic Kienzle coefficients (kc1_1: typically 800-3500 N/mm2 for metals)
5. Taylor tool life parameters from machining handbooks
6. Johnson-Cook parameters from literature (cite sources in statistical section)
7. Proper ISO group assignment

Return valid JSON array of complete materials:
[
  {{ "id": "X-XX-001", ... complete material ... }},
  {{ "id": "X-XX-002", ... complete material ... }}
]

Generate {len(material_specs)} materials with full scientific accuracy."""

    return prompt

def call_api(prompt, model=MODEL_SONNET, max_tokens=8000):
    """Call Anthropic API"""
    if not API_KEY:
        log("No API key found in ANTHROPIC_API_KEY environment variable", "ERROR")
        return None
    
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return {
            "content": response.content[0].text,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }
    except Exception as e:
        log(f"API call failed: {e}", "ERROR")
        return None

def extract_json_from_response(response_text):
    """Extract JSON from API response"""
    # Try to find JSON in response
    try:
        # First try direct parse
        return json.loads(response_text)
    except:
        pass
    
    # Try to find JSON block
    json_match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', response_text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except:
            pass
    
    return None

def enhance_materials_batch(materials_batch, checkpoint):
    """Enhance a batch of materials with missing sections"""
    results = []
    
    for mat_id, mat_info in materials_batch.items():
        if mat_id in checkpoint["enhanced_ids"]:
            log(f"  [SKIP] {mat_id} already enhanced")
            continue
        
        completeness = check_material_completeness(mat_info)
        if completeness["complete"]:
            log(f"  [OK] {mat_id} already complete")
            checkpoint["enhanced_ids"].append(mat_id)
            continue
        
        missing = completeness["missing"]
        log(f"  [ENHANCE] {mat_id} - missing: {', '.join(missing[:3])}...")
        
        # Create prompt and call API
        prompt = create_enhancement_prompt(mat_id, mat_info.get("data", {}), missing)
        response = call_api(prompt, MODEL_SONNET)
        
        if response:
            checkpoint["total_api_calls"] += 1
            checkpoint["total_tokens_used"] += response["input_tokens"] + response["output_tokens"]
            
            # Extract and merge enhanced data
            enhanced_data = extract_json_from_response(response["content"])
            if enhanced_data:
                # Merge with existing
                merged = mat_info.get("data", {}).copy()
                merged.update(enhanced_data)
                results.append({
                    "id": mat_id,
                    "data": merged,
                    "source_file": mat_info.get("source_file"),
                    "enhanced": True,
                    "sections_added": list(enhanced_data.keys())
                })
                checkpoint["enhanced_ids"].append(mat_id)
                log(f"    [+] Added sections: {', '.join(enhanced_data.keys())}")
            else:
                log(f"    [!] Could not parse response for {mat_id}", "WARN")
        
        # Rate limiting
        time.sleep(1)
    
    return results

def generate_new_materials(category, count, start_num, checkpoint):
    """Generate new materials for a category"""
    results = []
    
    # Category-specific configurations
    category_specs = {
        "S_SUPERALLOYS": {
            "prefix": "S-NI" if "nickel" in category.lower() else "S-CO",
            "types": [
                "Inconel 718", "Inconel 625", "Inconel 600", "Inconel 601", "Inconel 617",
                "Inconel 625", "Inconel 690", "Inconel 713C", "Inconel 738", "Inconel 792",
                "Waspaloy", "Rene 41", "Rene 80", "Rene 88", "Rene 95", "Rene 104",
                "MAR-M-246", "MAR-M-247", "MAR-M-200", "MAR-M-509",
                "Hastelloy X", "Hastelloy C-276", "Hastelloy B", "Hastelloy G",
                "Haynes 188", "Haynes 230", "Haynes 214", "Haynes 25",
                "Nimonic 75", "Nimonic 80A", "Nimonic 90", "Nimonic 105",
                "Udimet 500", "Udimet 520", "Udimet 700", "Udimet 720",
                "CMSX-4", "CMSX-10", "PWA 1484", "GTD-111", "GTD-222"
            ],
            "conditions": ["Solution Treated", "Aged", "As-Cast", "Hot Rolled"]
        },
        "H_HARDENED": {
            "prefix": "H-TS",
            "types": [
                "D2 Tool Steel", "A2 Tool Steel", "O1 Tool Steel", "S7 Tool Steel",
                "M2 High Speed Steel", "M42 HSS", "T1 HSS", "T15 HSS",
                "H13 Hot Work", "H11 Hot Work", "H21 Hot Work",
                "440C Hardened", "52100 Bearing Steel", "8620 Case Hardened",
                "4340 Hardened", "4140 Hardened", "9310 Hardened"
            ],
            "conditions": ["Hardened 58-60 HRC", "Hardened 60-62 HRC", "Hardened 62-65 HRC"]
        },
        "K_CAST_IRON": {
            "prefix": "K-CI",
            "types": [
                "Gray Iron Class 20", "Gray Iron Class 25", "Gray Iron Class 30",
                "Gray Iron Class 35", "Gray Iron Class 40", "Gray Iron Class 45",
                "Ductile Iron 60-40-18", "Ductile Iron 65-45-12", "Ductile Iron 80-55-06",
                "Ductile Iron 100-70-03", "Ductile Iron 120-90-02",
                "Malleable Iron", "Compacted Graphite Iron"
            ],
            "conditions": ["As-Cast", "Annealed", "Normalized"]
        },
        "X_SPECIALTY": {
            "prefix": "X-SP",
            "types": [
                "Titanium Grade 2", "Titanium Grade 5 (Ti-6Al-4V)", "Titanium Grade 23",
                "Tungsten", "Molybdenum", "Tantalum", "Niobium",
                "Zirconium", "Beryllium Copper", "Phosphor Bronze",
                "Monel 400", "Monel K-500", "Invar 36", "Kovar",
                "Stellite 6", "Stellite 12", "Stellite 21"
            ],
            "conditions": ["Annealed", "Work Hardened", "Age Hardened"]
        }
    }
    
    spec = category_specs.get(category, {"prefix": "X-XX", "types": [], "conditions": ["Standard"]})
    
    # Generate in batches
    batch_specs = []
    for i in range(count):
        idx = i % len(spec["types"]) if spec["types"] else 0
        mat_type = spec["types"][idx] if spec["types"] else f"Material {start_num + i}"
        condition = spec["conditions"][i % len(spec["conditions"])]
        
        mat_id = f"{spec['prefix']}-{str(start_num + i).zfill(3)}"
        
        if mat_id in checkpoint["new_materials_created"]:
            continue
        
        batch_specs.append({
            "id": mat_id,
            "name": mat_type,
            "condition": condition,
            "category": category
        })
        
        if len(batch_specs) >= NEW_MATERIAL_BATCH_SIZE:
            # Process batch
            log(f"  [GENERATE] Creating {len(batch_specs)} new {category} materials...")
            prompt = create_new_material_prompt(category, batch_specs)
            response = call_api(prompt, MODEL_OPUS, max_tokens=16000)  # Use Opus for new materials
            
            if response:
                checkpoint["total_api_calls"] += 1
                checkpoint["total_tokens_used"] += response["input_tokens"] + response["output_tokens"]
                
                new_materials = extract_json_from_response(response["content"])
                if new_materials:
                    if isinstance(new_materials, list):
                        for mat in new_materials:
                            results.append(mat)
                            checkpoint["new_materials_created"].append(mat.get("id", mat.get("identification", {}).get("id")))
                            log(f"    [+] Created: {mat.get('id', 'unknown')}")
                    elif isinstance(new_materials, dict):
                        results.append(new_materials)
                        checkpoint["new_materials_created"].append(new_materials.get("id"))
            
            batch_specs = []
            time.sleep(2)  # Rate limiting for Opus
    
    # Process remaining batch
    if batch_specs:
        log(f"  [GENERATE] Creating final {len(batch_specs)} {category} materials...")
        prompt = create_new_material_prompt(category, batch_specs)
        response = call_api(prompt, MODEL_OPUS, max_tokens=16000)
        
        if response:
            checkpoint["total_api_calls"] += 1
            checkpoint["total_tokens_used"] += response["input_tokens"] + response["output_tokens"]
            
            new_materials = extract_json_from_response(response["content"])
            if new_materials and isinstance(new_materials, list):
                for mat in new_materials:
                    results.append(mat)
                    checkpoint["new_materials_created"].append(mat.get("id"))
                    log(f"    [+] Created: {mat.get('id', 'unknown')}")
    
    return results

def save_enhanced_materials(materials, category):
    """Save enhanced materials to output directory"""
    output_dir = os.path.join(OUTPUT_ROOT, category)
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{category.lower()}_enhanced_{timestamp}.js"
    filepath = os.path.join(output_dir, filename)
    
    # Format as JS module
    content = f"""/**
 * PRISM MATERIALS DATABASE - {category} (Enhanced)
 * Generated: {datetime.now().isoformat()}
 * Materials: {len(materials)}
 * Parameters: 127 per material
 * AUTO-GENERATED by materials_completion_v1.py
 */

const {category}_ENHANCED = {{
  metadata: {{
    file: "{filename}",
    category: "{category}",
    materialCount: {len(materials)},
    generated: "{datetime.now().isoformat()}",
    enhanced: true
  }},
  materials: {{
"""
    
    for i, mat in enumerate(materials):
        mat_id = mat.get("id") or mat.get("data", {}).get("id") or f"UNKNOWN-{i}"
        mat_data = mat.get("data", mat)
        
        content += f'    "{mat_id}": {json.dumps(mat_data, indent=6)}'
        if i < len(materials) - 1:
            content += ","
        content += "\n"
    
    content += """  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = """ + category + """_ENHANCED;
}
"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    log(f"  [SAVED] {filepath} ({len(materials)} materials)")
    return filepath

def main():
    """Main execution"""
    print("=" * 70)
    print("  PRISM MATERIALS COMPLETION SYSTEM v1.0")
    print("  Option A: Full Enhancement + New Materials")
    print("=" * 70)
    
    # Check for API key
    if not API_KEY:
        print("\n[ERROR] ANTHROPIC_API_KEY environment variable not set!")
        print("Please set it with: set ANTHROPIC_API_KEY=your-key-here")
        return
    
    # Load checkpoint
    checkpoint = load_checkpoint()
    log(f"Loaded checkpoint: {len(checkpoint['enhanced_ids'])} enhanced, {len(checkpoint['new_materials_created'])} created")
    
    # === PHASE 1: Load all existing materials ===
    log("\n--- PHASE 1: Loading Existing Materials ---")
    
    all_materials = {}
    categories = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                  "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    for category in categories:
        cat_path = os.path.join(MATERIALS_ROOT, category)
        if not os.path.exists(cat_path):
            continue
        
        cat_materials = {}
        for filename in os.listdir(cat_path):
            if filename.endswith('.js'):
                filepath = os.path.join(cat_path, filename)
                materials = extract_materials_from_file(filepath)
                cat_materials.update(materials)
        
        all_materials[category] = cat_materials
        log(f"  [LOADED] {category}: {len(cat_materials)} materials")
    
    total_existing = sum(len(m) for m in all_materials.values())
    log(f"Total existing materials: {total_existing}")
    
    # === PHASE 2: Enhance existing materials ===
    if checkpoint["phase"] == "ENHANCE":
        log("\n--- PHASE 2: Enhancing Existing Materials ---")
        
        for category, materials in all_materials.items():
            if not materials:
                continue
            
            log(f"\n[CATEGORY] {category} ({len(materials)} materials)")
            
            # Process in batches
            material_list = list(materials.items())
            for i in range(0, len(material_list), ENHANCE_BATCH_SIZE):
                batch = dict(material_list[i:i+ENHANCE_BATCH_SIZE])
                log(f"  [BATCH] {i+1}-{min(i+ENHANCE_BATCH_SIZE, len(material_list))} of {len(material_list)}")
                
                enhanced = enhance_materials_batch(batch, checkpoint)
                
                if enhanced:
                    save_enhanced_materials(enhanced, category)
                
                save_checkpoint(checkpoint)
        
        checkpoint["phase"] = "NEW_MATERIALS"
        save_checkpoint(checkpoint)
    
    # === PHASE 3: Generate new materials ===
    if checkpoint["phase"] == "NEW_MATERIALS":
        log("\n--- PHASE 3: Generating New Materials ---")
        
        new_material_targets = {
            "S_SUPERALLOYS": 82,
            "H_HARDENED": 80,
            "X_SPECIALTY": 50,
            "K_CAST_IRON": 12
        }
        
        for category, count in new_material_targets.items():
            existing_count = len(all_materials.get(category, {}))
            start_num = existing_count + 1
            
            log(f"\n[CATEGORY] {category}: Creating {count} new materials (starting at {start_num})")
            
            new_materials = generate_new_materials(category, count, start_num, checkpoint)
            
            if new_materials:
                save_enhanced_materials(new_materials, category)
            
            save_checkpoint(checkpoint)
        
        checkpoint["phase"] = "COMPLETE"
        save_checkpoint(checkpoint)
    
    # === SUMMARY ===
    print("\n" + "=" * 70)
    print("  COMPLETION SUMMARY")
    print("=" * 70)
    print(f"  Enhanced materials: {len(checkpoint['enhanced_ids'])}")
    print(f"  New materials created: {len(checkpoint['new_materials_created'])}")
    print(f"  Total API calls: {checkpoint['total_api_calls']}")
    print(f"  Total tokens used: {checkpoint['total_tokens_used']:,}")
    print(f"  Estimated cost: ${(checkpoint['total_tokens_used'] / 1000000) * 15:.2f}")
    print("=" * 70)

if __name__ == "__main__":
    main()
