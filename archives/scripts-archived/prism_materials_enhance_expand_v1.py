#!/usr/bin/env python3
"""
PRISM MATERIALS ENHANCEMENT & EXPANSION SYSTEM v1.0
====================================================

Uses the 56-agent API swarm to:
1. Upgrade existing materials to full 127-parameter schema
2. Fill missing sections (chipFormation, friction, thermalMachining, etc.)
3. Add missing materials (Superalloys, Hardened, Specialty)
4. Add uncertainty bounds and source tracking

EXECUTION MODES:
- --enhance : Upgrade existing materials
- --expand  : Add new materials
- --full    : Complete enhancement + expansion
- --batch   : Process in batches with checkpoints

Author: PRISM Manufacturing Intelligence
Created: 2026-01-25
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
import subprocess

# ============================================================================
# CONFIGURATION
# ============================================================================

MATERIALS_ROOT = Path(r"C:\\PRISM\EXTRACTED\materials")
RESULTS_DIR = Path(r"C:\\PRISM\API_RESULTS")
SCRIPTS_DIR = Path(r"C:\\PRISM\_SCRIPTS")
STATE_FILE = Path(r"C:\\PRISM\CURRENT_STATE.json")

# API System Configuration
API_SCRIPT = SCRIPTS_DIR / "prism_unified_system_v4.py"

# Missing sections that need to be filled
MISSING_SECTIONS = {
    'chipFormation': {
        'params': 12,
        'description': 'Chip type, shear angle, segmentation, BUE tendency',
        'prompt_template': '''Fill the chipFormation section for {material_name} ({material_id}):
- chipType: primary (CONTINUOUS/DISCONTINUOUS/SEGMENTED/SERRATED), secondary
- shearAngle: value, unit (degrees), range
- chipCompressionRatio: value, range
- segmentationFrequency: value (kHz), condition
- builtUpEdge: tendency (NONE to SEVERE), speed range, temperature range
- breakability: rating (POOR to OUTSTANDING), chipBreakerRequired, recommendedBreaker
- colorAtSpeed: slow, optimal, high
- chipMorphology: description

Base this on: hardness={hardness}, tensile={tensile}MPa, machinability={machinability}%'''
    },
    'friction': {
        'params': 10,
        'description': 'Tool-chip and tool-workpiece friction coefficients',
        'prompt_template': '''Fill the friction section for {material_name} ({material_id}):
- toolChipInterface: dry, withCoolant, withMQL (friction coefficients 0-1)
- toolWorkpieceInterface: dry, withCoolant
- contactLength: stickingZone ratio, slidingZone ratio
- seizureTemperature: value (°C)
- adhesionTendency: rating, affectedTools
- abrasiveness: rating, cause
- diffusionWearTendency: rating, affectedTools

Base this on: composition, hardness={hardness}, thermal_conductivity={conductivity}'''
    },
    'thermalMachining': {
        'params': 14,
        'description': 'Cutting temperatures, heat partition, coolant effectiveness',
        'prompt_template': '''Fill the thermalMachining section for {material_name} ({material_id}):
- cuttingTemperature: model, coefficients (T = a × V^b × f^c), maxRecommended
- heatPartition: chip fraction, tool fraction, workpiece fraction, coolant fraction
- coolantEffectiveness: flood, mist, MQL, cryogenic benefits
- thermalDamageThreshold: whiteLayer, rehardening, overTempering, burning temps (°C)
- preheatingBenefit: applicable, recommendedTemp

Base this on: thermal_conductivity={conductivity}, specific_heat={specific_heat}, melting_point={melting}'''
    },
    'surfaceIntegrity': {
        'params': 12,
        'description': 'Residual stress, work hardening, surface finish',
        'prompt_template': '''Fill the surfaceIntegrity section for {material_name} ({material_id}):
- residualStress: typical (surface, subsurface MPa), depth (μm), type
- workHardening: depthAffected (μm), hardnessIncrease (%), strainHardeningExponent
- surfaceRoughness: achievable Ra for roughing, semifinishing, finishing (μm)
- metallurgicalDamage: whiteLayerRisk, burntSurfaceRisk, microcrackRisk, phaseTransformationRisk
- burr: tendency, type, mitigation

Base this on: yield_strength={yield}MPa, hardness={hardness}, strain_hardening_exponent'''
    },
    'statisticalData': {
        'params': 8,
        'description': 'Data quality, sources, confidence levels',
        'prompt_template': '''Fill the statisticalData section for {material_name} ({material_id}):
- dataPoints: number of data points used
- confidenceLevel: statistical confidence (0-1)
- standardDeviation: speed, force, toolLife
- sources: list of data sources (handbooks, papers, manufacturer data)
- lastValidated: date (YYYY-QN format)
- reliability: LOW/MEDIUM/MEDIUM-HIGH/HIGH/HIGHEST
- crossValidated: boolean
- peerReviewed: boolean

Estimate based on material commonality and data availability.'''
    }
}

# Materials to add by category
MATERIALS_TO_ADD = {
    'S': {  # Superalloys (need 64 more)
        'nickel_base': [
            'Inconel 718', 'Inconel 625', 'Inconel 600', 'Inconel 617', 'Inconel 690',
            'Inconel 706', 'Inconel X-750', 'Inconel 738', 'Inconel 792',
            'Waspaloy', 'Udimet 500', 'Udimet 520', 'Udimet 700', 'Udimet 720',
            'Rene 41', 'Rene 80', 'Rene 95', 'Rene N5', 'Rene N6',
            'MAR-M 247', 'MAR-M 246', 'MAR-M 200', 'MAR-M 509',
            'Nimonic 80A', 'Nimonic 90', 'Nimonic 105', 'Nimonic 115', 'Nimonic 263',
            'Hastelloy X', 'Hastelloy C-276', 'Hastelloy C-22', 'Hastelloy B-2',
            'Haynes 188', 'Haynes 230', 'Haynes 214', 'Haynes 556',
            'CMSX-4', 'CMSX-10', 'PWA 1484', 'GTD-111', 'GTD-222'
        ],
        'cobalt_base': [
            'Stellite 6', 'Stellite 12', 'Stellite 21', 'Stellite 25', 'Stellite 31',
            'L-605', 'Haynes 25', 'Mar-M 918', 'FSX-414', 'X-40'
        ],
        'iron_base': [
            'A-286', 'Incoloy 800', 'Incoloy 800H', 'Incoloy 825', 'Incoloy 901',
            'N-155', '19-9 DL', 'Discaloy', 'V-57'
        ]
    },
    'H': {  # Hardened Materials (need 50)
        'tool_steels': [
            'AISI D2 (60 HRC)', 'AISI D3 (58 HRC)', 'AISI A2 (62 HRC)',
            'AISI M2 (64 HRC)', 'AISI M42 (67 HRC)', 'AISI T15 (66 HRC)',
            'AISI H13 (52 HRC)', 'AISI H11 (54 HRC)', 'AISI S7 (58 HRC)',
            'AISI O1 (62 HRC)', 'AISI W1 (65 HRC)', 'AISI P20 (32 HRC)'
        ],
        'bearing_steels': [
            '52100 (60 HRC)', '52100 (62 HRC)', 'M50 (62 HRC)', 'M50NiL (60 HRC)',
            '440C SS (58 HRC)', '440C SS (60 HRC)'
        ],
        'case_hardened': [
            '8620 Case Hardened (60 HRC)', '9310 Case Hardened (60 HRC)',
            '4320 Case Hardened (58 HRC)', '4820 Case Hardened (60 HRC)'
        ],
        'hardened_alloys': [
            '4340 (50 HRC)', '4340 (54 HRC)', '4340 (58 HRC)',
            '300M (52 HRC)', '300M (56 HRC)', 'Aermet 100 (53 HRC)',
            '17-4PH H900 (44 HRC)', '17-4PH H1025 (38 HRC)',
            '15-5PH H900 (44 HRC)', 'Custom 465 (50 HRC)'
        ],
        'powder_metallurgy': [
            'CPM M4 (64 HRC)', 'CPM 10V (62 HRC)', 'CPM 15V (65 HRC)',
            'CPM S90V (59 HRC)', 'Vanadis 4E (62 HRC)', 'Vanadis 8 (64 HRC)',
            'ASP 2023 (62 HRC)', 'ASP 2030 (64 HRC)', 'Elmax (60 HRC)'
        ],
        'hsla_hardened': [
            'HSLA-80 (HRC 25)', 'HSLA-100 (HRC 30)', 'HY-80 Hardened',
            'HY-100 Hardened', 'HY-130 Hardened'
        ]
    },
    'X': {  # Specialty Materials (need 30)
        'composites': [
            'CFRP (Carbon Fiber)', 'GFRP (Glass Fiber)', 'Aramid/Kevlar Composite',
            'Metal Matrix Composite (Al-SiC)', 'MMC Al-Al2O3', 'Ceramic Matrix Composite'
        ],
        'ceramics': [
            'Silicon Nitride (Si3N4)', 'Alumina (Al2O3)', 'Zirconia (ZrO2)',
            'Silicon Carbide (SiC)', 'Boron Carbide (B4C)', 'Tungsten Carbide'
        ],
        'refractory': [
            'Molybdenum (Mo)', 'Tungsten (W)', 'Tantalum (Ta)', 'Niobium (Nb)',
            'Rhenium (Re)', 'TZM Alloy', 'Mo-Re Alloy'
        ],
        'special_alloys': [
            'Kovar', 'Invar 36', 'Super Invar', 'Mu-Metal', 'Permalloy',
            'Monel 400', 'Monel K-500', 'Cupronickel 90/10', 'Cupronickel 70/30'
        ],
        'additive_manufacturing': [
            'Ti-6Al-4V (DMLS)', 'Inconel 718 (SLM)', 'AlSi10Mg (SLM)',
            '316L SS (DMLS)', 'Maraging Steel (SLM)', '17-4PH (MJF)'
        ]
    }
}

# ============================================================================
# ENHANCEMENT FUNCTIONS
# ============================================================================

def load_current_state() -> Dict:
    """Load current PRISM state"""
    if STATE_FILE.exists():
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_checkpoint(checkpoint_data: Dict, checkpoint_name: str):
    """Save checkpoint for recovery"""
    checkpoint_dir = RESULTS_DIR / "checkpoints"
    checkpoint_dir.mkdir(exist_ok=True)
    
    checkpoint_file = checkpoint_dir / f"{checkpoint_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(checkpoint_file, 'w') as f:
        json.dump(checkpoint_data, f, indent=2)
    
    print(f"[CHECKPOINT] Saved: {checkpoint_file}")
    return checkpoint_file

def call_api_agent(agent: str, prompt: str, model_tier: str = "sonnet") -> Dict:
    """
    Call a specific API agent with a prompt
    
    This is a wrapper that would call the prism_unified_system_v4.py
    For now, returns a template structure that can be filled by the API
    """
    # In production, this would call:
    # py prism_unified_system_v4.py --agent {agent} --prompt "{prompt}"
    
    result = {
        'agent': agent,
        'model_tier': model_tier,
        'timestamp': datetime.now().isoformat(),
        'prompt': prompt[:200] + '...' if len(prompt) > 200 else prompt,
        'status': 'TEMPLATE_GENERATED',
        'response': None
    }
    
    return result

def generate_section_prompt(section: str, material: Dict) -> str:
    """Generate prompt for filling a missing section"""
    template = MISSING_SECTIONS[section]['prompt_template']
    
    # Extract material properties for context
    props = {
        'material_name': material.get('name', material.get('identification', {}).get('name', 'Unknown')),
        'material_id': material.get('id', material.get('identification', {}).get('id', 'Unknown')),
        'hardness': extract_value(material, ['physicalProperties', 'hardness', 'value'], 
                                  material.get('mechanical', {}).get('hardness', {}).get('brinell', 'N/A')),
        'tensile': extract_value(material, ['mechanicalProperties', 'tensileStrength', 'value'],
                                material.get('mechanical', {}).get('tensile_strength', {}).get('typical', 'N/A')),
        'machinability': extract_value(material, ['machinability', 'overallRating', 'percent'],
                                       material.get('machinability', {}).get('aisi_rating', 'N/A')),
        'conductivity': extract_value(material, ['physicalProperties', 'thermalConductivity', 'values'],
                                      material.get('physical', {}).get('thermal_conductivity', 'N/A')),
        'specific_heat': extract_value(material, ['physicalProperties', 'specificHeat', 'values'], 'N/A'),
        'melting': extract_value(material, ['physicalProperties', 'meltingRange', 'solidus'],
                                material.get('physical', {}).get('melting_point', {}).get('solidus', 'N/A')),
        'yield': extract_value(material, ['mechanicalProperties', 'yieldStrength', 'value'],
                              material.get('mechanical', {}).get('yield_strength', {}).get('typical', 'N/A'))
    }
    
    return template.format(**props)

def extract_value(data: Dict, path: List[str], default: Any = None) -> Any:
    """Extract nested value from dict"""
    current = data
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current

def generate_new_material_prompt(material_name: str, category: str, subcategory: str) -> str:
    """Generate prompt for creating a completely new material"""
    return f'''Create a complete 127-parameter material entry for: {material_name}
Category: {category} ({subcategory})

Follow the PRISM MATERIAL_SCHEMA exactly. Include ALL sections:
1. identification (8 params): id, name, alternateNames, uns, standard, isoGroup, materialType, condition
2. composition (~15 elements): C, Mn, Si, Cr, Ni, Mo, etc. with min/typical/max
3. physicalProperties (12 params): density, melting range, thermal conductivity, etc.
4. mechanicalProperties (15 params): tensile, yield, elongation, fatigue, toughness, etc.
5. kienzle (9 params): Kc1.1 and mc for tangential, feed, radial + corrections
6. johnsonCook (13 params): A, B, n, C, m + damage parameters d1-d5
7. taylorToolLife (12 params): HSS, carbide, ceramic, CBN coefficients
8. chipFormation (12 params): chip type, shear angle, BUE tendency, etc.
9. friction (10 params): tool-chip and tool-workpiece friction coefficients
10. thermalMachining (14 params): cutting temps, heat partition, coolant effectiveness
11. surfaceIntegrity (12 params): residual stress, work hardening, surface finish
12. machinability (8 params): overall rating, turning/milling/drilling indices
13. recommendedParameters (20+ params): speeds, feeds, depths for all operations
14. statisticalData (8 params): confidence, sources, validation

Use authoritative sources: ASM Handbook, Machining Data Handbook, manufacturer data.
Include uncertainty bounds (±%) on all numerical values.
Mark estimated values with confidence levels.'''

# ============================================================================
# BATCH PROCESSING
# ============================================================================

@dataclass
class BatchTask:
    """Single task in a batch"""
    task_type: str  # 'enhance' or 'expand'
    material_id: Optional[str] = None
    material_name: Optional[str] = None
    section: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    status: str = 'pending'
    result: Optional[Dict] = None

@dataclass
class BatchJob:
    """Collection of tasks to process"""
    job_id: str
    created: str
    tasks: List[BatchTask] = field(default_factory=list)
    completed: int = 0
    failed: int = 0
    
def create_enhancement_batch(audit_file: Path, sections: List[str] = None, 
                             max_materials: int = 100) -> BatchJob:
    """Create batch job for enhancing existing materials"""
    
    with open(audit_file) as f:
        audit = json.load(f)
    
    job = BatchJob(
        job_id=f"enhance_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        created=datetime.now().isoformat()
    )
    
    sections = sections or list(MISSING_SECTIONS.keys())
    
    count = 0
    for iso, cat_data in audit['categories'].items():
        for mat in cat_data.get('materials_summary', []):
            if count >= max_materials:
                break
                
            for section in sections:
                if section in mat.get('sections_missing', []):
                    job.tasks.append(BatchTask(
                        task_type='enhance',
                        material_id=mat['id'],
                        material_name=mat['name'],
                        section=section
                    ))
            count += 1
    
    return job

def create_expansion_batch(category: str = None) -> BatchJob:
    """Create batch job for adding new materials"""
    
    job = BatchJob(
        job_id=f"expand_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        created=datetime.now().isoformat()
    )
    
    categories = [category] if category else MATERIALS_TO_ADD.keys()
    
    for cat in categories:
        if cat in MATERIALS_TO_ADD:
            for subcat, materials in MATERIALS_TO_ADD[cat].items():
                for mat_name in materials:
                    job.tasks.append(BatchTask(
                        task_type='expand',
                        material_name=mat_name,
                        category=cat,
                        subcategory=subcat
                    ))
    
    return job

def save_batch_job(job: BatchJob, output_dir: Path = RESULTS_DIR):
    """Save batch job to file"""
    output_dir.mkdir(exist_ok=True)
    
    job_file = output_dir / f"batch_{job.job_id}.json"
    
    job_dict = {
        'job_id': job.job_id,
        'created': job.created,
        'total_tasks': len(job.tasks),
        'completed': job.completed,
        'failed': job.failed,
        'tasks': [
            {
                'task_type': t.task_type,
                'material_id': t.material_id,
                'material_name': t.material_name,
                'section': t.section,
                'category': t.category,
                'subcategory': t.subcategory,
                'status': t.status
            }
            for t in job.tasks
        ]
    }
    
    with open(job_file, 'w') as f:
        json.dump(job_dict, f, indent=2)
    
    print(f"[BATCH] Saved job: {job_file}")
    print(f"        Total tasks: {len(job.tasks)}")
    
    return job_file

# ============================================================================
# MAIN API SWARM INTEGRATION
# ============================================================================

def generate_api_swarm_script(job: BatchJob, output_file: Path):
    """Generate a script to run the batch through API swarm"""
    
    lines = [
        '#!/usr/bin/env python3',
        '"""',
        f'PRISM Materials Batch Processing Script',
        f'Job ID: {job.job_id}',
        f'Created: {job.created}',
        f'Total Tasks: {len(job.tasks)}',
        '"""',
        '',
        'import subprocess',
        'import json',
        'import time',
        'from pathlib import Path',
        '',
        f'API_SCRIPT = Path(r"{API_SCRIPT}")',
        f'RESULTS_DIR = Path(r"{RESULTS_DIR}")',
        '',
        '# Tasks to process',
        f'TASKS = {json.dumps([{"type": t.task_type, "id": t.material_id, "name": t.material_name, "section": t.section, "category": t.category} for t in job.tasks], indent=2)}',
        '',
        'def process_task(task):',
        '    """Process a single task through API swarm"""',
        '    if task["type"] == "enhance":',
        '        # Enhancement task',
        '        prompt = f"Fill the {task[\'section\']} section for material {task[\'id\']} ({task[\'name\']}). Follow PRISM 127-parameter schema. Include uncertainty bounds."',
        '        agents = "materials_scientist,physics_validator,uncertainty_quantifier"',
        '    else:',
        '        # Expansion task',
        '        prompt = f"Create complete 127-parameter material entry for {task[\'name\']} (Category: {task[\'category\']}). Include ALL sections with uncertainty bounds."',
        '        agents = "materials_scientist,physics_validator,uncertainty_quantifier,cross_referencer"',
        '    ',
        '    # Call API system',
        '    cmd = [',
        '        "py", str(API_SCRIPT),',
        '        "--intelligent", prompt',
        '    ]',
        '    ',
        '    print(f"Processing: {task}")',
        '    # result = subprocess.run(cmd, capture_output=True, text=True)',
        '    # return result',
        '    return {"status": "ready_to_execute", "command": " ".join(cmd)}',
        '',
        'def main():',
        '    results = []',
        '    for i, task in enumerate(TASKS):',
        '        print(f"\\n[{i+1}/{len(TASKS)}] ", end="")',
        '        result = process_task(task)',
        '        results.append(result)',
        '        time.sleep(0.5)  # Rate limiting',
        '    ',
        '    # Save results',
        '    output = RESULTS_DIR / f"batch_results_{job.job_id}.json"',
        '    with open(output, "w") as f:',
        '        json.dump(results, f, indent=2)',
        '    print(f"\\nResults saved to: {output}")',
        '',
        'if __name__ == "__main__":',
        '    main()',
    ]
    
    output_file.write_text('\n'.join(lines))
    print(f"[SCRIPT] Generated: {output_file}")

# ============================================================================
# SUMMARY REPORT
# ============================================================================

def generate_execution_plan(audit_file: Path) -> Dict:
    """Generate complete execution plan"""
    
    with open(audit_file) as f:
        audit = json.load(f)
    
    plan = {
        'timestamp': datetime.now().isoformat(),
        'phases': [],
        'totals': {
            'materials_to_enhance': 0,
            'materials_to_add': 0,
            'sections_to_fill': 0,
            'estimated_api_calls': 0,
            'estimated_cost_usd': 0
        }
    }
    
    # Phase 1: Enhancement
    enhancement_tasks = []
    for iso, cat_data in audit['categories'].items():
        for section, count in cat_data.get('common_missing_sections', {}).items():
            if section in MISSING_SECTIONS:
                enhancement_tasks.append({
                    'category': iso,
                    'section': section,
                    'count': count,
                    'params': MISSING_SECTIONS[section]['params']
                })
                plan['totals']['sections_to_fill'] += count
    
    plan['phases'].append({
        'name': 'ENHANCEMENT',
        'description': 'Fill missing sections in existing materials',
        'tasks': enhancement_tasks,
        'estimated_calls': plan['totals']['sections_to_fill']
    })
    plan['totals']['materials_to_enhance'] = audit['total_materials']
    
    # Phase 2: Expansion
    expansion_tasks = []
    for cat, subcats in MATERIALS_TO_ADD.items():
        total = sum(len(mats) for mats in subcats.values())
        expansion_tasks.append({
            'category': cat,
            'materials_to_add': total,
            'subcategories': list(subcats.keys())
        })
        plan['totals']['materials_to_add'] += total
    
    plan['phases'].append({
        'name': 'EXPANSION',
        'description': 'Add missing materials',
        'tasks': expansion_tasks,
        'estimated_calls': plan['totals']['materials_to_add'] * 4  # 4 agents per material
    })
    
    # Calculate totals
    plan['totals']['estimated_api_calls'] = (
        plan['totals']['sections_to_fill'] + 
        plan['totals']['materials_to_add'] * 4
    )
    plan['totals']['estimated_cost_usd'] = plan['totals']['estimated_api_calls'] * 0.015
    
    return plan

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='PRISM Materials Enhancement & Expansion')
    parser.add_argument('--enhance', action='store_true', help='Create enhancement batch')
    parser.add_argument('--expand', action='store_true', help='Create expansion batch')
    parser.add_argument('--full', action='store_true', help='Create full enhancement + expansion')
    parser.add_argument('--plan', action='store_true', help='Generate execution plan only')
    parser.add_argument('--category', type=str, help='Specific category (S, H, X)')
    parser.add_argument('--audit', type=str, 
                       default=str(RESULTS_DIR / 'materials_audit_20260125_002601.json'),
                       help='Path to audit file')
    parser.add_argument('--max', type=int, default=100, help='Max materials per batch')
    
    args = parser.parse_args()
    
    print("\n" + "="*80)
    print("PRISM MATERIALS ENHANCEMENT & EXPANSION SYSTEM")
    print("="*80)
    
    audit_file = Path(args.audit)
    if not audit_file.exists():
        print(f"[ERROR] Audit file not found: {audit_file}")
        print("Run: py prism_materials_completion_v1.py --audit")
        return
    
    if args.plan:
        print("\n[PLAN] Generating execution plan...")
        plan = generate_execution_plan(audit_file)
        
        plan_file = RESULTS_DIR / f"execution_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(plan_file, 'w') as f:
            json.dump(plan, f, indent=2)
        
        print(f"\n[OK] Plan saved: {plan_file}")
        print(f"\nSUMMARY:")
        print(f"  Materials to enhance: {plan['totals']['materials_to_enhance']}")
        print(f"  Materials to add: {plan['totals']['materials_to_add']}")
        print(f"  Sections to fill: {plan['totals']['sections_to_fill']}")
        print(f"  Estimated API calls: {plan['totals']['estimated_api_calls']}")
        print(f"  Estimated cost: ${plan['totals']['estimated_cost_usd']:.2f}")
        return
    
    if args.enhance or args.full:
        print("\n[ENHANCE] Creating enhancement batch...")
        enhance_job = create_enhancement_batch(audit_file, max_materials=args.max)
        job_file = save_batch_job(enhance_job)
        
        script_file = SCRIPTS_DIR / f"run_enhance_{enhance_job.job_id}.py"
        generate_api_swarm_script(enhance_job, script_file)
    
    if args.expand or args.full:
        print("\n[EXPAND] Creating expansion batch...")
        expand_job = create_expansion_batch(args.category)
        job_file = save_batch_job(expand_job)
        
        script_file = SCRIPTS_DIR / f"run_expand_{expand_job.job_id}.py"
        generate_api_swarm_script(expand_job, script_file)
    
    print("\n" + "="*80)
    print("BATCH JOBS CREATED")
    print("="*80)
    print("\nTo execute, run the generated scripts in _SCRIPTS/")
    print("Or use: py prism_unified_system_v4.py --intelligent <task>")

if __name__ == '__main__':
    main()
