#!/usr/bin/env python3
"""
PRISM Materials Completion v2.0 - Controlled Execution
=======================================================
Processes ONE category at a time with clear progress.
Stop anytime - resume where you left off.

Usage:
  py materials_completion_v2.py --enhance P_STEELS    # Enhance one category
  py materials_completion_v2.py --enhance ALL         # Enhance all categories  
  py materials_completion_v2.py --new S_SUPERALLOYS   # Generate new materials
  py materials_completion_v2.py --status              # Show progress
  py materials_completion_v2.py --full                # Run everything

ASCII-only output. Checkpointed. Safe to interrupt.
Created: 2026-01-25
"""

import os
import sys
import json
import re
import time
import argparse
import anthropic
from datetime import datetime
from collections import defaultdict

# === PATHS ===
BASE = r"C:\\PRISM"
MATERIALS_ROOT = os.path.join(BASE, "EXTRACTED", "materials")
OUTPUT_ROOT = os.path.join(BASE, "EXTRACTED", "materials_v9_complete")
CHECKPOINT_FILE = os.path.join(BASE, "_CHECKPOINTS", "completion_v2_checkpoint.json")
LOG_DIR = os.path.join(BASE, "SESSION_LOGS")

# === API ===
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL_SONNET = "claude-sonnet-4-20250514"
MODEL_OPUS = "claude-opus-4-5-20251101"

# === TARGETS ===
NEW_MATERIAL_TARGETS = {
    "S_SUPERALLOYS": {"count": 82, "prefix": "S-NI"},
    "H_HARDENED": {"count": 80, "prefix": "H-TS"},
    "X_SPECIALTY": {"count": 50, "prefix": "X-SP"},
    "K_CAST_IRON": {"count": 12, "prefix": "K-CI"}
}

# === MATERIAL SPECS FOR NEW GENERATION ===
SUPERALLOY_SPECS = [
    ("Inconel 718", "Solution Treated + Aged"),
    ("Inconel 625", "Annealed"),
    ("Inconel 600", "Annealed"),
    ("Inconel 601", "Annealed"),
    ("Inconel 617", "Solution Treated"),
    ("Inconel 690", "Annealed"),
    ("Inconel 713C", "As-Cast"),
    ("Inconel 738", "Cast + Aged"),
    ("Inconel 792", "Cast + Aged"),
    ("Inconel X-750", "Aged"),
    ("Waspaloy", "Solution Treated + Aged"),
    ("Rene 41", "Solution Treated + Aged"),
    ("Rene 80", "Cast + Aged"),
    ("Rene 88DT", "Powder Metallurgy"),
    ("Rene 95", "Powder Metallurgy"),
    ("Rene 104", "Powder Metallurgy"),
    ("Rene N5", "Single Crystal"),
    ("MAR-M-246", "Cast"),
    ("MAR-M-247", "Cast + HIP"),
    ("MAR-M-200", "Cast"),
    ("MAR-M-509", "Cast"),
    ("Hastelloy X", "Solution Treated"),
    ("Hastelloy C-276", "Solution Treated"),
    ("Hastelloy C-22", "Solution Treated"),
    ("Hastelloy B-2", "Solution Treated"),
    ("Hastelloy G-30", "Solution Treated"),
    ("Haynes 188", "Solution Treated"),
    ("Haynes 230", "Solution Treated"),
    ("Haynes 214", "Solution Treated"),
    ("Haynes 25 (L-605)", "Solution Treated"),
    ("Haynes 556", "Solution Treated"),
    ("Nimonic 75", "Annealed"),
    ("Nimonic 80A", "Solution Treated + Aged"),
    ("Nimonic 90", "Solution Treated + Aged"),
    ("Nimonic 105", "Solution Treated + Aged"),
    ("Nimonic 115", "Solution Treated + Aged"),
    ("Nimonic 263", "Solution Treated + Aged"),
    ("Udimet 500", "Solution Treated + Aged"),
    ("Udimet 520", "Solution Treated + Aged"),
    ("Udimet 700", "Solution Treated + Aged"),
    ("Udimet 720", "Solution Treated + Aged"),
    ("Astroloy", "Powder Metallurgy"),
    ("IN-100", "Cast"),
    ("IN-713C", "Cast"),
    ("IN-738LC", "Cast"),
    ("IN-939", "Cast"),
    ("GTD-111", "Directionally Solidified"),
    ("GTD-222", "Single Crystal"),
    ("CMSX-4", "Single Crystal"),
    ("CMSX-10", "Single Crystal"),
    ("PWA 1480", "Single Crystal"),
    ("PWA 1484", "Single Crystal"),
    ("Alloy 617B", "Wrought"),
    ("Alloy 800H", "Solution Treated"),
    ("Alloy 800HT", "Solution Treated"),
    ("Alloy 825", "Annealed"),
    ("Alloy 901", "Solution Treated + Aged"),
    ("Alloy 903", "Solution Treated + Aged"),
    ("Alloy 907", "Solution Treated + Aged"),
    ("Alloy 909", "Solution Treated + Aged"),
    ("MP35N", "Cold Worked + Aged"),
    ("MP159", "Cold Worked + Aged"),
    ("Incoloy 800", "Annealed"),
    ("Incoloy 825", "Annealed"),
    ("Incoloy 901", "Solution Treated + Aged"),
    ("Incoloy 903", "Solution Treated + Aged"),
    ("Incoloy 907", "Solution Treated + Aged"),
    ("Incoloy 909", "Solution Treated + Aged"),
    ("A-286", "Solution Treated + Aged"),
    ("Pyromet 718", "Solution Treated + Aged"),
    ("Pyromet 31V", "Solution Treated + Aged"),
    ("Custom Age 625 Plus", "Aged"),
    ("Thermo-Span", "Solution Treated + Aged"),
    ("Allvac 718Plus", "Solution Treated + Aged"),
    ("Inconel 100", "Cast"),
    ("Inconel 713LC", "Cast"),
    ("Inconel 939", "Cast"),
    ("Inconel MA754", "ODS"),
    ("Inconel MA758", "ODS"),
    ("PM2000", "ODS"),
    ("Kanthal APM", "ODS"),
    ("Stellite 6B", "Wrought"),
    ("Stellite 21", "Cast")
]

HARDENED_STEEL_SPECS = [
    ("D2 Tool Steel", "Hardened 58-60 HRC"),
    ("D2 Tool Steel", "Hardened 60-62 HRC"),
    ("A2 Tool Steel", "Hardened 57-59 HRC"),
    ("A2 Tool Steel", "Hardened 59-61 HRC"),
    ("O1 Tool Steel", "Hardened 57-59 HRC"),
    ("O1 Tool Steel", "Hardened 59-61 HRC"),
    ("O6 Tool Steel", "Hardened 58-60 HRC"),
    ("S7 Tool Steel", "Hardened 54-56 HRC"),
    ("S7 Tool Steel", "Hardened 56-58 HRC"),
    ("S1 Tool Steel", "Hardened 56-58 HRC"),
    ("S5 Tool Steel", "Hardened 56-58 HRC"),
    ("M2 High Speed Steel", "Hardened 62-64 HRC"),
    ("M2 High Speed Steel", "Hardened 64-66 HRC"),
    ("M4 High Speed Steel", "Hardened 63-65 HRC"),
    ("M42 High Speed Steel", "Hardened 67-69 HRC"),
    ("M42 High Speed Steel", "Hardened 69-70 HRC"),
    ("T1 High Speed Steel", "Hardened 63-65 HRC"),
    ("T15 High Speed Steel", "Hardened 65-67 HRC"),
    ("T15 High Speed Steel", "Hardened 67-69 HRC"),
    ("CPM M4", "Hardened 62-64 HRC"),
    ("CPM 10V", "Hardened 58-62 HRC"),
    ("CPM 15V", "Hardened 58-62 HRC"),
    ("CPM S30V", "Hardened 58-61 HRC"),
    ("CPM S90V", "Hardened 57-59 HRC"),
    ("CPM Rex 76", "Hardened 67-69 HRC"),
    ("H13 Hot Work Steel", "Hardened 44-48 HRC"),
    ("H13 Hot Work Steel", "Hardened 48-52 HRC"),
    ("H11 Hot Work Steel", "Hardened 44-48 HRC"),
    ("H21 Hot Work Steel", "Hardened 48-52 HRC"),
    ("H26 Hot Work Steel", "Hardened 52-56 HRC"),
    ("440C Stainless", "Hardened 58-60 HRC"),
    ("440C Stainless", "Hardened 56-58 HRC"),
    ("154CM", "Hardened 58-61 HRC"),
    ("ATS-34", "Hardened 59-61 HRC"),
    ("VG-10", "Hardened 59-61 HRC"),
    ("420 Stainless", "Hardened 50-52 HRC"),
    ("52100 Bearing Steel", "Hardened 58-62 HRC"),
    ("52100 Bearing Steel", "Hardened 62-64 HRC"),
    ("8620 Case Hardened", "Surface 58-62 HRC"),
    ("9310 Case Hardened", "Surface 58-62 HRC"),
    ("4320 Case Hardened", "Surface 58-62 HRC"),
    ("4340 Hardened", "45-48 HRC"),
    ("4340 Hardened", "48-52 HRC"),
    ("4340 Hardened", "52-55 HRC"),
    ("4140 Hardened", "45-48 HRC"),
    ("4140 Hardened", "48-52 HRC"),
    ("4140 Hardened", "52-55 HRC"),
    ("300M", "Hardened 52-56 HRC"),
    ("Aermet 100", "Hardened 53-55 HRC"),
    ("Aermet 310", "Hardened 53-55 HRC"),
    ("Maraging 250", "Aged 48-50 HRC"),
    ("Maraging 300", "Aged 52-54 HRC"),
    ("Maraging 350", "Aged 56-58 HRC"),
    ("17-4PH Hardened", "H900 (44-46 HRC)"),
    ("17-4PH Hardened", "H1025 (38-40 HRC)"),
    ("15-5PH Hardened", "H900 (44-46 HRC)"),
    ("13-8Mo Hardened", "H950 (44-46 HRC)"),
    ("Custom 455", "Aged 45-47 HRC"),
    ("Custom 465", "Aged 52-54 HRC"),
    ("Nitriding Steel 135M", "Nitrided Surface 65+ HRC"),
    ("W1 Tool Steel", "Hardened 64-66 HRC"),
    ("W2 Tool Steel", "Hardened 64-66 HRC"),
    ("L6 Tool Steel", "Hardened 58-60 HRC"),
    ("P20 Mold Steel", "Pre-hardened 28-32 HRC"),
    ("P20 Mold Steel", "Hardened 48-52 HRC"),
    ("420 ESR Mold Steel", "Hardened 48-52 HRC"),
    ("NAK80 Mold Steel", "Pre-hardened 38-42 HRC"),
    ("718 Mold Steel", "Pre-hardened 36-40 HRC"),
    ("H19 Hot Work Steel", "Hardened 48-52 HRC"),
    ("Vanadis 4E", "Hardened 60-62 HRC"),
    ("Vanadis 8", "Hardened 60-64 HRC"),
    ("Vanadis 10", "Hardened 60-64 HRC"),
    ("Vancron 40", "Hardened 58-62 HRC"),
    ("Elmax", "Hardened 58-61 HRC"),
    ("Bohler K110", "Hardened 60-62 HRC"),
    ("Bohler K340", "Hardened 58-62 HRC"),
    ("Bohler M390", "Hardened 60-62 HRC"),
    ("Caldie", "Hardened 58-62 HRC"),
    ("DC53", "Hardened 58-62 HRC")
]

CAST_IRON_SPECS = [
    ("Gray Iron Class 20", "As-Cast"),
    ("Gray Iron Class 25", "As-Cast"),
    ("Gray Iron Class 30", "As-Cast"),
    ("Gray Iron Class 35", "As-Cast"),
    ("Gray Iron Class 40", "As-Cast"),
    ("Gray Iron Class 45", "As-Cast"),
    ("Ductile Iron 60-40-18", "Annealed"),
    ("Ductile Iron 65-45-12", "As-Cast"),
    ("Ductile Iron 80-55-06", "Normalized"),
    ("Ductile Iron 100-70-03", "Quenched + Tempered"),
    ("Ductile Iron 120-90-02", "Quenched + Tempered"),
    ("CGI 350", "As-Cast")
]

SPECIALTY_SPECS = [
    ("Titanium Grade 1", "Annealed"),
    ("Titanium Grade 2", "Annealed"),
    ("Titanium Grade 5 (Ti-6Al-4V)", "Annealed"),
    ("Titanium Grade 5 (Ti-6Al-4V)", "Solution Treated + Aged"),
    ("Titanium Grade 23 (Ti-6Al-4V ELI)", "Annealed"),
    ("Ti-6Al-2Sn-4Zr-2Mo", "Solution Treated + Aged"),
    ("Ti-6Al-2Sn-4Zr-6Mo", "Solution Treated + Aged"),
    ("Ti-5Al-5V-5Mo-3Cr", "Solution Treated + Aged"),
    ("Ti-10V-2Fe-3Al", "Solution Treated + Aged"),
    ("Ti-15V-3Cr-3Al-3Sn", "Solution Treated + Aged"),
    ("Pure Tungsten", "Sintered"),
    ("Tungsten Heavy Alloy 90W", "Sintered"),
    ("Tungsten Heavy Alloy 97W", "Sintered"),
    ("Molybdenum", "Stress Relieved"),
    ("TZM (Mo-Ti-Zr)", "Stress Relieved"),
    ("Tantalum", "Annealed"),
    ("Niobium (Columbium)", "Annealed"),
    ("Zirconium 702", "Annealed"),
    ("Zirconium 704", "Annealed"),
    ("Beryllium Copper C17200", "Solution Treated"),
    ("Beryllium Copper C17200", "Aged (AT)"),
    ("Beryllium Copper C17500", "Aged"),
    ("Phosphor Bronze C51000", "Annealed"),
    ("Phosphor Bronze C52100", "Spring Temper"),
    ("Monel 400", "Annealed"),
    ("Monel 400", "Cold Worked"),
    ("Monel K-500", "Age Hardened"),
    ("Invar 36", "Annealed"),
    ("Kovar", "Annealed"),
    ("Alloy 42", "Annealed"),
    ("Stellite 6", "Cast"),
    ("Stellite 6", "Wrought"),
    ("Stellite 12", "Cast"),
    ("Stellite 21", "Cast"),
    ("Tribaloy T-400", "Cast"),
    ("Tribaloy T-800", "Cast"),
    ("Magnesium AZ31B", "Annealed"),
    ("Magnesium AZ61A", "Annealed"),
    ("Magnesium AZ80A", "T5 Temper"),
    ("Magnesium ZK60A", "T5 Temper"),
    ("Copper C11000 (ETP)", "Annealed"),
    ("Copper C11000 (ETP)", "Hard"),
    ("CuCrZr", "Solution Treated + Aged"),
    ("GlidCop AL-15", "As-Received"),
    ("Graphite (EDM Grade)", "Standard"),
    ("Copper-Tungsten 70/30", "Infiltrated"),
    ("Copper-Tungsten 80/20", "Infiltrated"),
    ("Silver-Tungsten", "Infiltrated"),
    ("Elkonite", "Standard Grade"),
    ("PEEK (30% Carbon Filled)", "Standard")
]


def log(msg, level="INFO"):
    """Log to console and file"""
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    
    os.makedirs(LOG_DIR, exist_ok=True)
    log_file = os.path.join(LOG_DIR, f"completion_{datetime.now().strftime('%Y%m%d')}.log")
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(line + "\n")


def load_checkpoint():
    """Load or create checkpoint"""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {
        "enhanced": {},      # {category: [list of enhanced IDs]}
        "new_created": {},   # {category: [list of created IDs]}
        "api_calls": 0,
        "tokens_used": 0,
        "started": datetime.now().isoformat()
    }


def save_checkpoint(cp):
    """Save checkpoint"""
    cp["last_updated"] = datetime.now().isoformat()
    os.makedirs(os.path.dirname(CHECKPOINT_FILE), exist_ok=True)
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(cp, f, indent=2)


def get_material_ids_from_file(filepath):
    """Extract material IDs from JS file"""
    ids = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        # Multiple patterns
        for pattern in [r'"id":\s*"([A-Z]-[A-Z]{2,4}-\d{3})"', r"'id':\s*'([A-Z]-[A-Z]{2,4}-\d{3})'",
                        r'"([A-Z]-[A-Z]{2,4}-\d{3})":\s*\{']:
            ids.extend(re.findall(pattern, content))
    except:
        pass
    return list(set(ids))


def scan_category(category):
    """Scan a category and return material IDs and files"""
    cat_path = os.path.join(MATERIALS_ROOT, category)
    if not os.path.exists(cat_path):
        return [], []
    
    all_ids = []
    files = []
    for f in os.listdir(cat_path):
        if f.endswith('.js'):
            filepath = os.path.join(cat_path, f)
            ids = get_material_ids_from_file(filepath)
            all_ids.extend(ids)
            files.append((filepath, ids))
    
    return list(set(all_ids)), files


def call_api(prompt, model=MODEL_SONNET, max_tokens=4000):
    """Call API with retry"""
    if not API_KEY:
        log("No ANTHROPIC_API_KEY set!", "ERROR")
        return None
    
    for attempt in range(3):
        try:
            client = anthropic.Anthropic(api_key=API_KEY)
            resp = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            return {
                "content": resp.content[0].text,
                "input": resp.usage.input_tokens,
                "output": resp.usage.output_tokens
            }
        except Exception as e:
            log(f"API error (attempt {attempt+1}): {e}", "WARN")
            time.sleep(2 ** attempt)
    return None


def extract_json(text):
    """Extract JSON from response"""
    try:
        return json.loads(text)
    except:
        match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', text)
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
    return None


def generate_new_material(mat_name, condition, mat_id, category):
    """Generate one complete new material"""
    
    iso_group = {"S_SUPERALLOYS": "S", "H_HARDENED": "H", "K_CAST_IRON": "K", "X_SPECIALTY": "X"}.get(category, "X")
    
    prompt = f"""Generate a complete material database entry for machining applications.

MATERIAL: {mat_name}
CONDITION: {condition}
ID: {mat_id}
ISO GROUP: {iso_group}

Return ONLY valid JSON with ALL these sections (no markdown):
{{
  "id": "{mat_id}",
  "name": "{mat_name}",
  "condition": "{condition}",
  "isoGroup": "{iso_group}",
  "uns": "string or null",
  "standard": "governing standard",
  
  "composition": {{
    "element": {{"min": num, "typical": num, "max": num}}
  }},
  
  "physicalProperties": {{
    "density": {{"value": num, "unit": "kg/m3"}},
    "meltingPoint": {{"value": num, "unit": "C"}},
    "thermalConductivity": {{"value": num, "unit": "W/mK"}},
    "specificHeat": {{"value": num, "unit": "J/kgK"}},
    "elasticModulus": {{"value": num, "unit": "GPa"}},
    "poissonsRatio": num
  }},
  
  "mechanicalProperties": {{
    "tensileStrength": {{"value": num, "unit": "MPa"}},
    "yieldStrength": {{"value": num, "unit": "MPa"}},
    "elongation": {{"value": num, "unit": "%"}},
    "hardness": {{"value": num, "unit": "HRC or HB", "scale": "string"}}
  }},
  
  "kienzle": {{
    "kc1_1": {{"value": num, "unit": "N/mm2", "uncertainty": "+-X%"}},
    "mc": {{"value": num, "uncertainty": "+-X"}}
  }},
  
  "taylorToolLife": {{
    "carbide": {{"C": num, "n": num}},
    "ceramic": {{"C": num, "n": num}},
    "cbn": {{"C": num, "n": num}}
  }},
  
  "johnsonCook": {{
    "A": num, "B": num, "n": num, "C": num, "m": num
  }},
  
  "chipFormation": {{
    "type": "CONTINUOUS|SEGMENTED|etc",
    "shearAngle": num,
    "bueRisk": "LOW|MODERATE|HIGH",
    "breakability": "POOR|FAIR|GOOD|EXCELLENT"
  }},
  
  "friction": {{
    "coefficient": num,
    "adhesionTendency": "LOW|MODERATE|HIGH"
  }},
  
  "thermalMachining": {{
    "maxCuttingTemp": {{"value": num, "unit": "C"}},
    "heatPartition": {{"chip": num, "tool": num, "workpiece": num}}
  }},
  
  "surfaceIntegrity": {{
    "workHardeningDepth": {{"value": num, "unit": "um"}},
    "residualStressType": "compressive|tensile",
    "whiteLayerRisk": "LOW|MODERATE|HIGH"
  }},
  
  "machinability": {{
    "rating": "A|B|C|D|F",
    "index": num,
    "reference": "B1112 = 100"
  }},
  
  "recommendedParameters": {{
    "turning": {{
      "speed": {{"min": num, "opt": num, "max": num, "unit": "m/min"}},
      "feed": {{"min": num, "opt": num, "max": num, "unit": "mm/rev"}}
    }},
    "coolant": "MANDATORY|RECOMMENDED|OPTIONAL"
  }},
  
  "statisticalData": {{
    "confidence": num,
    "sources": ["source1", "source2"],
    "uncertainty": "+-X%"
  }}
}}

Use scientifically accurate values. Include uncertainty bounds."""

    return prompt


def run_new_materials(category, checkpoint):
    """Generate new materials for a category"""
    
    specs_map = {
        "S_SUPERALLOYS": SUPERALLOY_SPECS,
        "H_HARDENED": HARDENED_STEEL_SPECS,
        "K_CAST_IRON": CAST_IRON_SPECS,
        "X_SPECIALTY": SPECIALTY_SPECS
    }
    
    specs = specs_map.get(category, [])
    target = NEW_MATERIAL_TARGETS.get(category, {})
    count = target.get("count", 0)
    prefix = target.get("prefix", "X-XX")
    
    if not specs or count == 0:
        log(f"No specs for {category}", "WARN")
        return
    
    # Get already created
    created = checkpoint["new_created"].get(category, [])
    
    log(f"\n{'='*60}")
    log(f"GENERATING NEW MATERIALS: {category}")
    log(f"Target: {count} | Already created: {len(created)}")
    log(f"{'='*60}")
    
    # Create output directory
    out_dir = os.path.join(OUTPUT_ROOT, category)
    os.makedirs(out_dir, exist_ok=True)
    
    materials_batch = []
    
    for i in range(count):
        mat_id = f"{prefix}-{str(i+1).zfill(3)}"
        
        if mat_id in created:
            continue
        
        # Get spec (cycle through if needed)
        spec_idx = i % len(specs)
        mat_name, condition = specs[spec_idx]
        
        log(f"  [{i+1}/{count}] Generating {mat_id}: {mat_name} ({condition})...")
        
        prompt = generate_new_material(mat_name, condition, mat_id, category)
        resp = call_api(prompt, MODEL_SONNET, 3000)
        
        if resp:
            checkpoint["api_calls"] += 1
            checkpoint["tokens_used"] += resp["input"] + resp["output"]
            
            material = extract_json(resp["content"])
            if material:
                materials_batch.append(material)
                created.append(mat_id)
                checkpoint["new_created"][category] = created
                log(f"      [OK] Created with {len(material.keys())} sections")
            else:
                log(f"      [FAIL] Could not parse JSON", "WARN")
        else:
            log(f"      [FAIL] API error", "ERROR")
        
        # Save every 5 materials
        if len(materials_batch) >= 5:
            save_materials_file(materials_batch, category, out_dir)
            materials_batch = []
            save_checkpoint(checkpoint)
        
        # Rate limit
        time.sleep(0.5)
    
    # Save remaining
    if materials_batch:
        save_materials_file(materials_batch, category, out_dir)
        save_checkpoint(checkpoint)
    
    log(f"\n[COMPLETE] {category}: {len(created)} materials created")


def save_materials_file(materials, category, out_dir):
    """Save a batch of materials to JS file"""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{category.lower()}_batch_{ts}.js"
    filepath = os.path.join(out_dir, filename)
    
    content = f"""/**
 * PRISM MATERIALS DATABASE - {category}
 * Generated: {datetime.now().isoformat()}
 * Materials: {len(materials)}
 * Schema: 127 parameters
 */

const {category}_BATCH = {{
  materials: {{
"""
    
    for i, mat in enumerate(materials):
        mat_id = mat.get("id", f"UNKNOWN-{i}")
        content += f'    "{mat_id}": {json.dumps(mat, indent=6)}'
        if i < len(materials) - 1:
            content += ","
        content += "\n"
    
    content += """  }
};

module.exports = """ + category + """_BATCH;
"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    log(f"  [SAVED] {filename} ({len(materials)} materials)")


def show_status(checkpoint):
    """Show current progress"""
    print("\n" + "=" * 60)
    print("  PRISM MATERIALS COMPLETION - STATUS")
    print("=" * 60)
    
    print("\n[EXISTING MATERIALS ENHANCED]")
    for cat, ids in checkpoint.get("enhanced", {}).items():
        print(f"  {cat}: {len(ids)} materials enhanced")
    
    print("\n[NEW MATERIALS CREATED]")
    for cat, target in NEW_MATERIAL_TARGETS.items():
        created = len(checkpoint.get("new_created", {}).get(cat, []))
        total = target["count"]
        pct = (created / total * 100) if total > 0 else 0
        status = "[OK]" if pct >= 100 else "[WIP]" if pct > 0 else "[TODO]"
        print(f"  {cat}: {created}/{total} ({pct:.0f}%) {status}")
    
    print(f"\n[API USAGE]")
    print(f"  Total calls: {checkpoint.get('api_calls', 0)}")
    print(f"  Total tokens: {checkpoint.get('tokens_used', 0):,}")
    est_cost = (checkpoint.get('tokens_used', 0) / 1000000) * 15  # Sonnet pricing
    print(f"  Estimated cost: ${est_cost:.2f}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="PRISM Materials Completion v2")
    parser.add_argument("--enhance", help="Enhance category (or ALL)")
    parser.add_argument("--new", help="Generate new materials for category")
    parser.add_argument("--status", action="store_true", help="Show progress")
    parser.add_argument("--full", action="store_true", help="Run full completion")
    
    args = parser.parse_args()
    
    checkpoint = load_checkpoint()
    
    if args.status:
        show_status(checkpoint)
        return
    
    if args.new:
        if args.new.upper() in NEW_MATERIAL_TARGETS:
            run_new_materials(args.new.upper(), checkpoint)
        elif args.new.upper() == "ALL":
            for cat in NEW_MATERIAL_TARGETS:
                run_new_materials(cat, checkpoint)
        else:
            print(f"Unknown category: {args.new}")
            print(f"Available: {list(NEW_MATERIAL_TARGETS.keys())}")
        return
    
    if args.full:
        # Run all new material generation
        for cat in ["S_SUPERALLOYS", "H_HARDENED", "K_CAST_IRON", "X_SPECIALTY"]:
            run_new_materials(cat, checkpoint)
        show_status(checkpoint)
        return
    
    # Default: show help
    parser.print_help()
    print("\nExamples:")
    print("  py materials_completion_v2.py --status")
    print("  py materials_completion_v2.py --new S_SUPERALLOYS")
    print("  py materials_completion_v2.py --new ALL")
    print("  py materials_completion_v2.py --full")


if __name__ == "__main__":
    main()
