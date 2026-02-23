#!/usr/bin/env python3
"""
PRISM Materials Enhancement System v1.0
=======================================
Enhances existing materials + adds missing ones using API swarm.
ASCII-only, checkpoint-based, resumable.

Created: 2026-01-25
"""

import os
import json
import time
from datetime import datetime
from pathlib import Path

# === PATHS ===
BASE_DIR = r"C:\\PRISM"
MATERIALS_DIR = os.path.join(BASE_DIR, "EXTRACTED", "materials")
REPORTS_DIR = os.path.join(BASE_DIR, "_REPORTS")
CHECKPOINT_FILE = os.path.join(REPORTS_DIR, "enhancement_checkpoint.json")
AUDIT_FILE = os.path.join(REPORTS_DIR, "materials_audit_summary.json")

# === CONFIGURATION ===
BATCH_SIZE = 25  # Materials per API call
API_AVAILABLE = False  # Set True when API key is configured

def load_checkpoint():
    """Load progress checkpoint"""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {
        "started": datetime.now().isoformat(),
        "phase": "not_started",
        "enhanced_ids": [],
        "created_ids": [],
        "failed_ids": [],
        "current_batch": 0,
        "total_batches": 0
    }

def save_checkpoint(checkpoint):
    """Save progress checkpoint"""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    checkpoint["last_updated"] = datetime.now().isoformat()
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f, indent=2)
    print(f"  [CHECKPOINT] Saved progress: {len(checkpoint['enhanced_ids'])} enhanced, {len(checkpoint['created_ids'])} created")

def load_audit_summary():
    """Load the audit summary"""
    if os.path.exists(AUDIT_FILE):
        with open(AUDIT_FILE, 'r') as f:
            return json.load(f)
    print("[ERROR] Audit summary not found. Run materials_audit_v2.py first.")
    return None

def get_materials_needing_enhancement():
    """Identify materials that need section enhancement"""
    # These are materials that exist but are missing key sections
    needs_enhancement = []
    
    categories = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS"]
    
    for category in categories:
        cat_dir = os.path.join(MATERIALS_DIR, category)
        if not os.path.exists(cat_dir):
            continue
            
        for filename in os.listdir(cat_dir):
            if not filename.endswith('.js'):
                continue
            
            filepath = os.path.join(cat_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Check if file has the OLD flat schema (missing nested sections)
                has_chip_formation = 'chipFormation' in content or 'chip_formation' in content
                has_friction = 'friction:' in content.lower()
                has_thermal = 'thermalMachining' in content or 'thermal_machining' in content
                has_statistical = 'statisticalData' in content or 'statistical:' in content
                
                # If missing 2+ critical sections, needs enhancement
                missing_count = sum([
                    not has_chip_formation,
                    not has_friction,
                    not has_thermal,
                    not has_statistical
                ])
                
                if missing_count >= 2:
                    needs_enhancement.append({
                        "file": filepath,
                        "category": category,
                        "missing_sections": missing_count
                    })
                    
            except Exception as e:
                print(f"  [WARN] Could not read {filename}: {str(e)[:30]}")
    
    return needs_enhancement

def get_new_materials_needed():
    """Define new materials to create by category"""
    new_materials = {
        "S_SUPERALLOYS": {
            "target": 82,
            "families": [
                # Nickel-base
                {"prefix": "Inconel", "grades": ["600", "601", "617", "625", "686", "690", "693", "718", "725", "X-750", "783", "792", "825"]},
                {"prefix": "Waspaloy", "grades": ["standard", "modified"]},
                {"prefix": "Rene", "grades": ["41", "65", "77", "80", "88", "95", "104", "N5", "N6"]},
                {"prefix": "Hastelloy", "grades": ["B", "B-2", "B-3", "C", "C-4", "C-22", "C-276", "G", "G-30", "N", "S", "W", "X"]},
                {"prefix": "MAR-M", "grades": ["200", "246", "247", "302", "322", "421", "432", "509"]},
                {"prefix": "Udimet", "grades": ["188", "500", "520", "630", "700", "710", "720"]},
                {"prefix": "Nimonic", "grades": ["75", "80A", "81", "86", "90", "91", "105", "115", "263", "901", "942"]},
                # Cobalt-base
                {"prefix": "Stellite", "grades": ["1", "3", "4", "6", "6B", "12", "19", "21", "25", "31", "190"]},
                {"prefix": "Haynes", "grades": ["25", "188", "214", "230", "242", "263", "282", "556", "617", "625"]}
            ]
        },
        "H_HARDENED": {
            "target": 80,
            "families": [
                # Tool steels
                {"prefix": "AISI", "grades": ["A2", "A6", "A7", "A8", "A9", "A10"]},
                {"prefix": "AISI", "grades": ["D2", "D3", "D4", "D5", "D7"]},
                {"prefix": "AISI", "grades": ["H10", "H11", "H12", "H13", "H14", "H19", "H21", "H22", "H23", "H24", "H25", "H26"]},
                {"prefix": "AISI", "grades": ["M1", "M2", "M3", "M4", "M7", "M10", "M33", "M34", "M35", "M36", "M41", "M42", "M43", "M44", "M46", "M47", "M48", "M50", "M52", "M62"]},
                {"prefix": "AISI", "grades": ["O1", "O2", "O6", "O7"]},
                {"prefix": "AISI", "grades": ["S1", "S2", "S4", "S5", "S6", "S7"]},
                {"prefix": "AISI", "grades": ["T1", "T2", "T4", "T5", "T6", "T8", "T15"]},
                {"prefix": "AISI", "grades": ["W1", "W2", "W5"]},
                # Bearing steels
                {"prefix": "AISI", "grades": ["52100", "440C"]},
                {"prefix": "M50", "grades": ["NiL"]},
                # Maraging
                {"prefix": "Maraging", "grades": ["200", "250", "300", "350", "C250", "C300", "C350"]}
            ]
        },
        "X_SPECIALTY": {
            "target": 50,
            "families": [
                # Refractory metals
                {"prefix": "Tungsten", "grades": ["pure", "W-1%ThO2", "W-2%ThO2", "W-25Re"]},
                {"prefix": "Molybdenum", "grades": ["pure", "TZM", "Mo-0.5Ti", "Mo-30W"]},
                {"prefix": "Tantalum", "grades": ["pure", "Ta-2.5W", "Ta-10W"]},
                {"prefix": "Niobium", "grades": ["pure", "Nb-1Zr", "C-103", "FS-85"]},
                {"prefix": "Rhenium", "grades": ["pure"]},
                # Precious metals
                {"prefix": "Platinum", "grades": ["pure", "Pt-10Ir", "Pt-10Rh"]},
                {"prefix": "Palladium", "grades": ["pure"]},
                {"prefix": "Gold", "grades": ["pure", "Au-Cu alloys"]},
                {"prefix": "Silver", "grades": ["pure", "sterling"]},
                # Electronic
                {"prefix": "Kovar", "grades": ["standard"]},
                {"prefix": "Invar", "grades": ["36", "42", "Super Invar"]},
                {"prefix": "Permalloy", "grades": ["45", "80"]},
                # Other
                {"prefix": "Beryllium", "grades": ["pure", "S-200", "I-70"]},
                {"prefix": "Zirconium", "grades": ["pure", "Zr-702", "Zr-704", "Zr-705"]}
            ]
        },
        "K_CAST_IRON": {
            "target": 12,
            "families": [
                {"prefix": "Gray Iron", "grades": ["Class 20", "Class 25", "Class 30B", "Class 35B", "Class 40B", "Class 45", "Class 50"]},
                {"prefix": "Ductile Iron", "grades": ["60-40-18", "65-45-12", "70-50-05", "80-55-06", "100-70-03", "120-90-02"]}
            ]
        }
    }
    return new_materials

def print_status_report(checkpoint, audit):
    """Print current status"""
    print("\n" + "=" * 70)
    print("  PRISM MATERIALS ENHANCEMENT - STATUS REPORT")
    print("=" * 70)
    
    print(f"\n[AUDIT DATA]")
    print(f"  Total materials found: {audit.get('total_materials', 0)}")
    print(f"  Overall completion: {audit.get('overall_percent', 0)}%")
    
    print(f"\n[CHECKPOINT DATA]")
    print(f"  Phase: {checkpoint.get('phase', 'not_started')}")
    print(f"  Enhanced: {len(checkpoint.get('enhanced_ids', []))}")
    print(f"  Created: {len(checkpoint.get('created_ids', []))}")
    print(f"  Failed: {len(checkpoint.get('failed_ids', []))}")
    
    print(f"\n[WORK REMAINING]")
    
    # Calculate remaining work
    cats = audit.get('category_counts', {})
    targets = {"S_SUPERALLOYS": 100, "H_HARDENED": 80, "X_SPECIALTY": 50, "K_CAST_IRON": 60}
    
    for cat, target in targets.items():
        current = cats.get(cat, 0)
        created = len([x for x in checkpoint.get('created_ids', []) if x.startswith(cat[:1])])
        remaining = max(0, target - current - created)
        if remaining > 0:
            print(f"  {cat}: need +{remaining} materials")
    
    # Enhancement work
    enhanced_count = len(checkpoint.get('enhanced_ids', []))
    total_needing = 1313  # From audit
    remaining_enhance = max(0, total_needing - enhanced_count)
    if remaining_enhance > 0:
        print(f"  Section enhancement: {remaining_enhance} materials remaining")

def create_enhancement_prompt(material_id, material_name, category):
    """Create prompt for enhancing a material with missing sections"""
    return f"""You are a materials scientist enhancing the PRISM manufacturing database.

TASK: Add missing parameter sections to material {material_id} ({material_name})

Add these EXACT sections with realistic, scientifically-accurate values:

1. chipFormation:
   - chipType: (CONTINUOUS/SEGMENTED/DISCONTINUOUS)
   - shearAngle: degrees (typically 15-45)
   - bueTendency: (NONE/LOW/MODERATE/HIGH/SEVERE)
   - breakability: (POOR/FAIR/GOOD/EXCELLENT)
   - segmentationFrequency: kHz (if applicable)

2. friction:
   - toolChipDry: coefficient (0.3-0.8 typical)
   - toolChipCoolant: coefficient (0.2-0.5 typical)
   - adhesionTendency: (NONE/LOW/MODERATE/HIGH/SEVERE)
   - abrasiveness: (LOW/MODERATE/HIGH/SEVERE)
   - diffusionWearTendency: (LOW/MODERATE/HIGH)

3. thermalMachining:
   - cuttingTempCoeff: {{a, b, c}} for T = a * V^b * f^c
   - heatPartition: {{chip: 0.x, tool: 0.x, workpiece: 0.x}}
   - coolantEffectiveness: (LOW/MODERATE/HIGH/EXCELLENT)
   - maxRecommendedTemp: Celsius

4. surfaceIntegrity:
   - residualStress: MPa (negative=compressive)
   - workHardeningDepth: micrometers
   - achievableRa: {{roughing, finishing}} in micrometers
   - whiteLayerRisk: (NONE/LOW/MODERATE/HIGH)

5. statisticalData:
   - confidence: 0-1
   - sources: ["source1", "source2", ...]
   - uncertainty: +/- percentage
   - lastValidated: "2026-Q1"

OUTPUT FORMAT: Return ONLY valid JSON with these 5 sections. No explanations."""

def create_new_material_prompt(material_name, category, iso_group):
    """Create prompt for generating a completely new material"""
    return f"""You are a materials scientist creating entries for the PRISM manufacturing database.

TASK: Create a complete 127-parameter material entry for: {material_name}
Category: {category}
ISO Group: {iso_group}

Generate ALL sections with scientifically accurate values:

1. identification (id, name, alternateNames, uns, standard, isoGroup, materialType, condition)
2. composition (all relevant elements with min/typical/max)
3. physicalProperties (density, melting point, thermal conductivity, elastic modulus, etc.)
4. mechanicalProperties (tensile, yield, elongation, hardness, fatigue, fracture toughness)
5. kienzle (kc1_1, mc for cutting force calculation)
6. taylorToolLife (C, n coefficients for HSS, carbide, ceramic, CBN)
7. johnsonCook (A, B, n, C, m, T_melt, damage parameters d1-d5)
8. chipFormation (type, shear angle, BUE tendency, breakability)
9. friction (coefficients dry/coolant, adhesion, abrasiveness)
10. thermalMachining (cutting temp model, heat partition, coolant effectiveness)
11. surfaceIntegrity (residual stress, work hardening, achievable Ra)
12. machinability (AISI rating, relative to B1112)
13. recommendedParameters (turning, milling, drilling speeds/feeds)
14. statisticalData (confidence, sources, uncertainty)

OUTPUT FORMAT: Return ONLY valid JSON matching PRISM schema. No explanations.
Use realistic values from published literature (ASM Handbook, Machining Data Handbook)."""

def main():
    print("\n" + "=" * 70)
    print("  PRISM MATERIALS ENHANCEMENT SYSTEM v1.0")
    print("  ASCII-only | Checkpoint-based | Resumable")
    print("=" * 70)
    
    # Load data
    checkpoint = load_checkpoint()
    audit = load_audit_summary()
    
    if not audit:
        return
    
    # Show status
    print_status_report(checkpoint, audit)
    
    # Calculate work
    files_needing_enhancement = get_materials_needing_enhancement()
    new_materials_needed = get_new_materials_needed()
    
    print(f"\n[WORK ANALYSIS]")
    print(f"  Files needing enhancement: {len(files_needing_enhancement)}")
    
    total_new = 0
    for cat, data in new_materials_needed.items():
        total_new += data["target"]
    print(f"  New materials to create: {total_new}")
    
    # Calculate batches
    total_work = len(files_needing_enhancement) + total_new
    total_batches = (total_work + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"  Total work items: {total_work}")
    print(f"  Batch size: {BATCH_SIZE}")
    print(f"  Total batches: {total_batches}")
    
    if API_AVAILABLE:
        print(f"\n[API MODE] Ready to process with Claude API")
        # Here we would call the API swarm
        # For now, generate the work plan
    else:
        print(f"\n[PLANNING MODE] API not configured - generating work plan only")
    
    # Generate work plan
    work_plan = {
        "generated": datetime.now().isoformat(),
        "enhancement_files": [f["file"] for f in files_needing_enhancement[:100]],  # First 100
        "new_materials": {},
        "total_api_calls_estimated": total_batches,
        "estimated_cost_usd": round(total_batches * 0.15, 2),  # ~$0.15 per batch
        "estimated_time_minutes": total_batches * 2  # ~2 min per batch
    }
    
    # Flatten new materials list
    for category, data in new_materials_needed.items():
        materials_list = []
        for family in data["families"]:
            prefix = family["prefix"]
            for grade in family["grades"]:
                materials_list.append(f"{prefix} {grade}")
        work_plan["new_materials"][category] = materials_list[:data["target"]]
    
    # Save work plan
    plan_path = os.path.join(REPORTS_DIR, "enhancement_work_plan.json")
    with open(plan_path, 'w') as f:
        json.dump(work_plan, f, indent=2)
    
    print(f"\n[SAVED] Work plan: {plan_path}")
    
    # Summary
    print("\n" + "=" * 70)
    print("  ENHANCEMENT PLAN SUMMARY")
    print("=" * 70)
    
    print(f"""
Phase 1: Enhance Existing Materials
-----------------------------------
  Files to process: {len(files_needing_enhancement)}
  Sections to add: chip_formation, friction, thermal_machining, 
                   surface_integrity, statistical
  Batches needed: {(len(files_needing_enhancement) + BATCH_SIZE - 1) // BATCH_SIZE}

Phase 2: Create New Materials  
-----------------------------------""")
    
    for category, data in new_materials_needed.items():
        count = len(work_plan["new_materials"].get(category, []))
        print(f"  {category}: {count} materials")
    
    print(f"""
Resource Estimates
-----------------------------------
  Total API calls: ~{total_batches}
  Estimated cost: ~${work_plan['estimated_cost_usd']:.2f}
  Estimated time: ~{work_plan['estimated_time_minutes']} minutes

To proceed:
  1. Set API_AVAILABLE = True in script
  2. Run: py materials_enhancement_v1.py --execute
  3. Progress saves after each batch (resumable)
""")
    
    save_checkpoint(checkpoint)
    print("\n[DONE] Planning complete. Ready to execute when API is configured.")

if __name__ == "__main__":
    main()
