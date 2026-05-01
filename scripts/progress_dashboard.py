#!/usr/bin/env python3
"""
PRISM Progress Dashboard v1.0
Visual dashboard showing extraction and development progress.

Usage:
    python progress_dashboard.py                    - Show dashboard
    python progress_dashboard.py --json            - Output as JSON
    python progress_dashboard.py --update          - Update CURRENT_STATE.json with counts
    python progress_dashboard.py --watch           - Continuous monitoring (5s refresh)
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Configuration
PRISM_ROOT = os.environ.get('PRISM_ROOT', r'C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM REBUILD')
STATE_FILE = os.path.join(PRISM_ROOT, 'CURRENT_STATE.json')
EXTRACTED_DIR = os.path.join(PRISM_ROOT, 'EXTRACTED')
SKILLS_DIR = os.path.join(PRISM_ROOT, '_SKILLS')
SCRIPTS_DIR = os.path.join(PRISM_ROOT, 'SCRIPTS')

# Target counts from roadmap
TARGETS = {
    'databases': {'total': 62, 'category': 'extraction'},
    'engines': {'total': 213, 'category': 'extraction'},
    'knowledge_bases': {'total': 14, 'category': 'extraction'},
    'systems': {'total': 31, 'category': 'extraction'},
    'machines_enhanced': {'total': 43, 'category': 'databases'},  # 43 manufacturers
    'materials': {'total': 1047, 'category': 'databases'},  # target materials
    'skills_claude': {'total': 12, 'category': 'skills'},
    'skills_domain': {'total': 59, 'category': 'skills'},
    'scripts': {'total': 15, 'category': 'automation'},  # including new ones
}

def count_files(directory, pattern='*'):
    """Count files matching pattern in directory"""
    path = Path(directory)
    if not path.exists():
        return 0
    return len(list(path.rglob(pattern)))

def count_by_extension(directory):
    """Count files by extension"""
    counts = defaultdict(int)
    path = Path(directory)
    if not path.exists():
        return counts
    
    for f in path.rglob('*'):
        if f.is_file():
            counts[f.suffix.lower()] += 1
    
    return dict(counts)

def count_extracted_modules():
    """Count extracted modules by category"""
    counts = {
        'databases': 0,
        'engines': 0,
        'knowledge_bases': 0,
        'systems': 0,
        'total_files': 0,
        'total_lines': 0,
        'total_size_kb': 0
    }
    
    path = Path(EXTRACTED_DIR)
    if not path.exists():
        return counts
    
    for js_file in path.rglob('*.js'):
        counts['total_files'] += 1
        
        # Categorize by path
        file_str = str(js_file).lower()
        if 'machine' in file_str or 'material' in file_str or 'tool' in file_str:
            counts['databases'] += 1
        elif 'engine' in file_str:
            counts['engines'] += 1
        elif 'knowledge' in file_str:
            counts['knowledge_bases'] += 1
        else:
            counts['systems'] += 1
        
        # Count lines and size
        try:
            with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                counts['total_lines'] += len(f.readlines())
            counts['total_size_kb'] += js_file.stat().st_size / 1024
        except:
            pass
    
    # Count JSON databases
    for json_file in path.rglob('*.json'):
        counts['total_files'] += 1
        counts['databases'] += 1
        try:
            counts['total_size_kb'] += json_file.stat().st_size / 1024
        except:
            pass
    
    counts['total_size_kb'] = round(counts['total_size_kb'], 2)
    
    return counts

def count_enhanced_machines():
    """Count enhanced machine databases by manufacturer"""
    enhanced_path = Path(EXTRACTED_DIR) / 'machines' / 'ENHANCED'
    if not enhanced_path.exists():
        return 0, []
    
    manufacturers = []
    for item in enhanced_path.iterdir():
        if item.is_dir() or item.suffix == '.json':
            manufacturers.append(item.stem if item.is_dir() else item.stem.replace('PRISM_', '').replace('_ENHANCED', ''))
    
    return len(manufacturers), manufacturers

def count_skills():
    """Count skills in various locations"""
    counts = {
        'claude_skills': 0,
        'domain_skills': 0,
        'total_skill_size_kb': 0
    }
    
    # Claude skills (in container at runtime, approximate from known)
    counts['claude_skills'] = 12  # Known from audit
    
    # Domain skills on C: drive
    skills_path = Path(SKILLS_DIR)
    if skills_path.exists():
        for skill_dir in skills_path.iterdir():
            if skill_dir.is_dir() and skill_dir.name.startswith('prism-'):
                skill_file = skill_dir / 'SKILL.md'
                if skill_file.exists():
                    counts['domain_skills'] += 1
                    counts['total_skill_size_kb'] += skill_file.stat().st_size / 1024
    
    counts['total_skill_size_kb'] = round(counts['total_skill_size_kb'], 2)
    
    return counts

def count_scripts():
    """Count automation scripts"""
    scripts_path = Path(SCRIPTS_DIR)
    if not scripts_path.exists():
        return 0, []
    
    scripts = []
    for f in scripts_path.iterdir():
        if f.suffix == '.py':
            scripts.append(f.stem)
    
    return len(scripts), scripts

def load_state():
    """Load current state file"""
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def calculate_overall_progress():
    """Calculate overall project progress"""
    extracted = count_extracted_modules()
    skills = count_skills()
    enhanced_count, _ = count_enhanced_machines()
    scripts_count, _ = count_scripts()
    
    progress = {
        'extraction': {
            'databases': extracted['databases'],
            'engines': extracted['engines'],
            'knowledge_bases': extracted['knowledge_bases'],
            'systems': extracted['systems'],
        },
        'databases': {
            'machines_enhanced': enhanced_count,
        },
        'skills': {
            'claude': skills['claude_skills'],
            'domain': skills['domain_skills'],
        },
        'automation': {
            'scripts': scripts_count,
        },
        'metrics': {
            'total_files': extracted['total_files'],
            'total_lines': extracted['total_lines'],
            'total_size_kb': extracted['total_size_kb'],
            'skill_size_kb': skills['total_skill_size_kb'],
        }
    }
    
    # Calculate percentages
    percentages = {}
    for key, target in TARGETS.items():
        category = target['category']
        if category == 'extraction':
            current = progress['extraction'].get(key, 0)
        elif category == 'databases':
            current = progress['databases'].get(key, 0)
        elif category == 'skills':
            if 'claude' in key:
                current = progress['skills']['claude']
            else:
                current = progress['skills']['domain']
        else:
            current = progress['automation'].get(key.replace('scripts', 'scripts'), 0)
        
        percentages[key] = {
            'current': current,
            'target': target['total'],
            'percent': round(current / target['total'] * 100, 1) if target['total'] > 0 else 0
        }
    
    progress['percentages'] = percentages
    
    # Overall progress
    total_current = sum(p['current'] for p in percentages.values())
    total_target = sum(p['target'] for p in percentages.values())
    progress['overall_percent'] = round(total_current / total_target * 100, 1) if total_target > 0 else 0
    
    return progress

def generate_progress_bar(percent, width=30):
    """Generate ASCII progress bar"""
    filled = int(width * percent / 100)
    bar = '█' * filled + '░' * (width - filled)
    return f"[{bar}] {percent:5.1f}%"

def generate_dashboard():
    """Generate visual dashboard"""
    progress = calculate_overall_progress()
    state = load_state()
    
    _, manufacturers = count_enhanced_machines()
    _, scripts = count_scripts()
    
    dashboard = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM v9.0 PROGRESS DASHBOARD                              ║
║                    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  OVERALL PROGRESS                                                            ║
║  {generate_progress_bar(progress['overall_percent'], 50):<68} ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  EXTRACTION                                                                  ║
║  ──────────────────────────────────────────────────────────────────────────  ║
"""
    
    for key in ['databases', 'engines', 'knowledge_bases', 'systems']:
        p = progress['percentages'][key]
        bar = generate_progress_bar(p['percent'], 25)
        label = key.replace('_', ' ').title()
        dashboard += f"║  {label:<18} {bar}  ({p['current']:3d}/{p['target']:3d})        ║\n"
    
    dashboard += f"""║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  DATABASES                                                                   ║
║  ──────────────────────────────────────────────────────────────────────────  ║
"""
    
    p = progress['percentages']['machines_enhanced']
    bar = generate_progress_bar(p['percent'], 25)
    dashboard += f"║  Enhanced Machines  {bar}  ({p['current']:3d}/{p['target']:3d})        ║\n"
    
    if manufacturers:
        mfg_list = ', '.join(manufacturers[:8])
        if len(manufacturers) > 8:
            mfg_list += f'... +{len(manufacturers) - 8} more'
        dashboard += f"║  └─ {mfg_list[:68]:<68} ║\n"
    
    dashboard += f"""║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  SKILLS & AUTOMATION                                                         ║
║  ──────────────────────────────────────────────────────────────────────────  ║
"""
    
    p = progress['percentages']['skills_claude']
    bar = generate_progress_bar(p['percent'], 25)
    dashboard += f"║  Claude Skills      {bar}  ({p['current']:3d}/{p['target']:3d})        ║\n"
    
    p = progress['percentages']['skills_domain']
    bar = generate_progress_bar(p['percent'], 25)
    dashboard += f"║  Domain Skills      {bar}  ({p['current']:3d}/{p['target']:3d})        ║\n"
    
    p = progress['percentages']['scripts']
    bar = generate_progress_bar(p['percent'], 25)
    dashboard += f"║  Python Scripts     {bar}  ({p['current']:3d}/{p['target']:3d})        ║\n"
    
    dashboard += f"""║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  METRICS                                                                     ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║  Total Files:      {progress['metrics']['total_files']:,d}                                                  ║
║  Total Lines:      {progress['metrics']['total_lines']:,d}                                               ║
║  Code Size:        {progress['metrics']['total_size_kb']:,.1f} KB                                            ║
║  Skill Size:       {progress['metrics']['skill_size_kb']:,.1f} KB                                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
"""
    
    # Current state info
    if state:
        current_phase = state.get('extraction', {}).get('phase', 'Unknown')
        current_stage = state.get('extraction', {}).get('stage', 'Unknown')
        last_session = state.get('currentSession', {}).get('name', 'Unknown')
        
        dashboard += f"""║  CURRENT STATE                                                               ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║  Stage:            {current_stage}.{current_phase:<56} ║
║  Last Session:     {last_session[:55]:<55} ║
"""
    
    dashboard += "╚══════════════════════════════════════════════════════════════════════════════╝\n"
    
    return dashboard

def update_state_with_counts():
    """Update CURRENT_STATE.json with current counts"""
    state = load_state()
    progress = calculate_overall_progress()
    
    # Update extraction progress
    if 'extraction' not in state:
        state['extraction'] = {}
    if 'progress' not in state['extraction']:
        state['extraction']['progress'] = {}
    
    state['extraction']['progress']['databases'] = {
        'total': TARGETS['databases']['total'],
        'extracted': progress['percentages']['databases']['current']
    }
    state['extraction']['progress']['engines'] = {
        'total': TARGETS['engines']['total'],
        'extracted': progress['percentages']['engines']['current']
    }
    state['extraction']['progress']['machinesEnhanced'] = {
        'total': TARGETS['machines_enhanced']['total'],
        'extracted': progress['percentages']['machines_enhanced']['current'],
        'status': 'COMPLETE' if progress['percentages']['machines_enhanced']['percent'] >= 100 else 'IN_PROGRESS'
    }
    
    state['lastUpdated'] = datetime.now().isoformat()
    
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)
    
    print(f"✅ Updated {STATE_FILE}")

if __name__ == '__main__':
    if '--json' in sys.argv:
        progress = calculate_overall_progress()
        print(json.dumps(progress, indent=2))
    
    elif '--update' in sys.argv:
        update_state_with_counts()
    
    elif '--watch' in sys.argv:
        try:
            while True:
                os.system('cls' if os.name == 'nt' else 'clear')
                print(generate_dashboard())
                print("\nRefreshing in 5 seconds... (Ctrl+C to exit)")
                time.sleep(5)
        except KeyboardInterrupt:
            print("\nStopped.")
    
    else:
        print(generate_dashboard())
