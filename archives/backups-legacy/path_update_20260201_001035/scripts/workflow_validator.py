#!/usr/bin/env python3
"""
PRISM Workflow Validator v1.0
Validates that work follows the Superpowers workflow methodology.

Usage:
    python workflow_validator.py <session_log>           - Validate single session
    python workflow_validator.py --all <logs_dir>       - Validate all sessions
    python workflow_validator.py --current              - Validate current session
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Superpowers workflow phases
WORKFLOW_PHASES = [
    'BRAINSTORM',
    'PLANNING', 
    'EXECUTION',
    'REVIEW_SPEC',
    'REVIEW_QUALITY',
    'DEBUGGING'  # Optional, only when errors occur
]

# Required evidence levels
EVIDENCE_LEVELS = {
    'L1': 'Claim only',
    'L2': 'File listing',
    'L3': 'Content sample',
    'L4': 'Reproducible',
    'L5': 'User verified'
}

MIN_EVIDENCE_LEVEL = 'L3'

# Checklist requirements by phase
PHASE_REQUIREMENTS = {
    'BRAINSTORM': [
        'scope_defined',
        'approach_documented',
        'user_approval',
        'alternatives_considered'
    ],
    'PLANNING': [
        'tasks_listed',
        'paths_specified',
        'checkpoints_defined',
        'dependencies_ordered'
    ],
    'EXECUTION': [
        'evidence_captured',
        'checkpoints_saved',
        'state_updated'
    ],
    'REVIEW_SPEC': [
        'deliverables_verified',
        'spec_compliance_checked',
        'pass_fail_documented'
    ],
    'REVIEW_QUALITY': [
        'code_quality_checked',
        'commandments_verified',
        'patterns_validated'
    ],
    'DEBUGGING': [
        'evidence_collected',
        'root_cause_traced',
        'hypothesis_tested',
        'fix_validated',
        'prevention_added'
    ]
}

def parse_session_log(log_path):
    """Parse session log file"""
    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            if log_path.endswith('.json'):
                return json.load(f)
            else:
                content = f.read()
                return {'raw_content': content}
    except Exception as e:
        return {'error': str(e)}

def detect_phases_in_log(log_data):
    """Detect which workflow phases were followed"""
    detected = {phase: False for phase in WORKFLOW_PHASES}
    phase_evidence = defaultdict(list)
    
    content = log_data.get('raw_content', '') or json.dumps(log_data)
    content_upper = content.upper()
    
    # Detect phase markers
    phase_markers = {
        'BRAINSTORM': ['BRAINSTORM', 'SCOPE', 'APPROACH', 'CHUNK 1', 'CHUNK 2', 'CHUNK 3'],
        'PLANNING': ['PLANNING', 'TASK LIST', 'TASK 1', 'CHECKPOINT SCHEDULE'],
        'EXECUTION': ['EXECUTING', 'CHECKPOINT', 'EVIDENCE', 'COMPLETED TASK'],
        'REVIEW_SPEC': ['REVIEW SPEC', 'SPEC REVIEW', 'DELIVERABLES', 'PASS', 'FAIL'],
        'REVIEW_QUALITY': ['REVIEW QUALITY', 'QUALITY REVIEW', 'CODE QUALITY', 'COMMANDMENT'],
        'DEBUGGING': ['DEBUG', 'ROOT CAUSE', 'HYPOTHESIS', 'FIX VALIDATED']
    }
    
    for phase, markers in phase_markers.items():
        for marker in markers:
            if marker in content_upper:
                detected[phase] = True
                phase_evidence[phase].append(marker)
    
    return detected, dict(phase_evidence)

def detect_evidence_level(log_data):
    """Detect evidence level in session"""
    content = log_data.get('raw_content', '') or json.dumps(log_data)
    content_upper = content.upper()
    
    # Evidence markers
    if 'USER VERIFIED' in content_upper or 'APPROVED' in content_upper:
        return 'L5'
    elif 'REPRODUCIBLE' in content_upper or 'CAN BE VERIFIED' in content_upper:
        return 'L4'
    elif any(marker in content_upper for marker in ['CONTENT SAMPLE', 'FIRST 10 LINES', 'LAST 10 LINES', 'FILE CONTENT']):
        return 'L3'
    elif any(marker in content_upper for marker in ['FILE LIST', 'DIRECTORY', 'LISTING']):
        return 'L2'
    else:
        return 'L1'

def check_checklist_completion(log_data, phase):
    """Check if phase checklist was completed"""
    requirements = PHASE_REQUIREMENTS.get(phase, [])
    content = log_data.get('raw_content', '') or json.dumps(log_data)
    content_lower = content.lower()
    
    completed = []
    missing = []
    
    req_markers = {
        'scope_defined': ['scope', 'what i\'ll create', 'what\'s included'],
        'approach_documented': ['approach', 'strategy', 'how'],
        'user_approval': ['approved', 'approval', '✓', 'yes'],
        'alternatives_considered': ['alternative', 'option', 'instead'],
        'tasks_listed': ['task 1', 'task list', '□'],
        'paths_specified': ['path:', 'file:', 'c:\\', '/mnt/'],
        'checkpoints_defined': ['checkpoint', 'every', 'after'],
        'dependencies_ordered': ['depends', 'after', 'before', 'order'],
        'evidence_captured': ['evidence', 'listing', 'sample'],
        'checkpoints_saved': ['saved', 'checkpoint', 'state'],
        'state_updated': ['current_state', 'updated', 'state'],
        'deliverables_verified': ['deliverable', 'present', 'created'],
        'spec_compliance_checked': ['spec', 'matches', 'design'],
        'pass_fail_documented': ['pass', 'fail', '✅', '❌'],
        'code_quality_checked': ['quality', 'clean', 'lint'],
        'commandments_verified': ['commandment', '10 commandments', 'utilization'],
        'patterns_validated': ['pattern', 'standard', 'convention'],
        'evidence_collected': ['evidence', 'error message', 'stack trace'],
        'root_cause_traced': ['root cause', 'caused by', 'because'],
        'hypothesis_tested': ['hypothesis', 'theory', 'test'],
        'fix_validated': ['fix', 'resolved', 'working'],
        'prevention_added': ['prevention', 'defense', 'guard']
    }
    
    for req in requirements:
        markers = req_markers.get(req, [req.replace('_', ' ')])
        found = any(marker in content_lower for marker in markers)
        if found:
            completed.append(req)
        else:
            missing.append(req)
    
    return completed, missing

def validate_session(log_path):
    """Validate a single session against workflow"""
    result = {
        'path': str(log_path),
        'valid': True,
        'score': 100,
        'phases': {},
        'evidence_level': 'L1',
        'issues': [],
        'recommendations': []
    }
    
    log_data = parse_session_log(log_path)
    if 'error' in log_data:
        result['valid'] = False
        result['issues'].append(f"Cannot parse log: {log_data['error']}")
        return result
    
    # Detect phases
    detected, evidence = detect_phases_in_log(log_data)
    result['phases'] = {phase: {'detected': det, 'evidence': evidence.get(phase, [])} 
                       for phase, det in detected.items()}
    
    # Check workflow order
    workflow_followed = True
    last_phase_index = -1
    
    for i, phase in enumerate(WORKFLOW_PHASES[:-1]):  # Exclude DEBUGGING
        if detected[phase]:
            if i < last_phase_index:
                workflow_followed = False
                result['issues'].append(f"Phase {phase} appears out of order")
            last_phase_index = i
    
    if not workflow_followed:
        result['score'] -= 20
    
    # Check for skipped phases (BRAINSTORM and PLANNING are required)
    if not detected['BRAINSTORM']:
        result['issues'].append("BRAINSTORM phase not detected")
        result['score'] -= 15
    
    if not detected['PLANNING']:
        result['issues'].append("PLANNING phase not detected")
        result['score'] -= 15
    
    if not detected['EXECUTION']:
        result['issues'].append("EXECUTION phase not detected")
        result['score'] -= 10
    
    # Check evidence level
    result['evidence_level'] = detect_evidence_level(log_data)
    evidence_scores = {'L1': 0, 'L2': 25, 'L3': 50, 'L4': 75, 'L5': 100}
    min_score = evidence_scores.get(MIN_EVIDENCE_LEVEL, 50)
    actual_score = evidence_scores.get(result['evidence_level'], 0)
    
    if actual_score < min_score:
        result['issues'].append(f"Evidence level {result['evidence_level']} below minimum {MIN_EVIDENCE_LEVEL}")
        result['score'] -= 20
    
    # Check checklists for detected phases
    for phase, info in result['phases'].items():
        if info['detected']:
            completed, missing = check_checklist_completion(log_data, phase)
            info['checklist'] = {
                'completed': completed,
                'missing': missing
            }
            if missing:
                result['recommendations'].append(f"{phase}: Missing {', '.join(missing)}")
    
    # Final validity
    result['valid'] = result['score'] >= 70
    result['score'] = max(0, result['score'])
    
    return result

def validate_all_sessions(logs_dir):
    """Validate all session logs in directory"""
    results = []
    path = Path(logs_dir)
    
    for log_file in path.rglob('*.json'):
        results.append(validate_session(log_file))
    
    for log_file in path.rglob('*.md'):
        results.append(validate_session(log_file))
    
    return results

def generate_report(results):
    """Generate validation report"""
    total = len(results)
    valid = sum(1 for r in results if r['valid'])
    avg_score = sum(r['score'] for r in results) / total if total > 0 else 0
    
    # Phase detection stats
    phase_stats = defaultdict(int)
    for r in results:
        for phase, info in r['phases'].items():
            if info['detected']:
                phase_stats[phase] += 1
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║            PRISM WORKFLOW VALIDATION REPORT                   ║
╠══════════════════════════════════════════════════════════════╣
║  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            ║
╠══════════════════════════════════════════════════════════════╣
║  SUMMARY                                                      ║
║  ────────────────────────────────────────────────────────────║
║  Sessions Validated: {total:4d}                                      ║
║  Workflow Compliant: {valid:4d}  ✅                                   ║
║  Non-Compliant:      {total - valid:4d}  ❌                                   ║
║  Average Score:      {avg_score:5.1f}%                                    ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE USAGE                                                  ║
║  ────────────────────────────────────────────────────────────║
"""
    
    for phase in WORKFLOW_PHASES:
        count = phase_stats[phase]
        pct = count / total * 100 if total > 0 else 0
        status = "✅" if pct >= 80 else "⚠️" if pct >= 50 else "❌"
        report += f"║  {status} {phase:<18} {count:4d}/{total} ({pct:5.1f}%)              ║\n"
    
    # Evidence level distribution
    evidence_dist = defaultdict(int)
    for r in results:
        evidence_dist[r['evidence_level']] += 1
    
    report += """╠══════════════════════════════════════════════════════════════╣
║  EVIDENCE LEVELS                                              ║
║  ────────────────────────────────────────────────────────────║
"""
    
    for level in ['L5', 'L4', 'L3', 'L2', 'L1']:
        count = evidence_dist[level]
        desc = EVIDENCE_LEVELS[level]
        report += f"║  {level}: {count:4d}  ({desc:<42}) ║\n"
    
    # Common issues
    all_issues = []
    for r in results:
        all_issues.extend(r['issues'])
    
    if all_issues:
        issue_counts = defaultdict(int)
        for issue in all_issues:
            issue_counts[issue] += 1
        
        report += """╠══════════════════════════════════════════════════════════════╣
║  COMMON ISSUES                                                ║
║  ────────────────────────────────────────────────────────────║
"""
        for issue, count in sorted(issue_counts.items(), key=lambda x: -x[1])[:5]:
            report += f"║  {count:3d}x  {issue[:52]:<52} ║\n"
    
    report += "╚══════════════════════════════════════════════════════════════╝\n"
    
    return report

def validate_current_session():
    """Validate current session from CURRENT_STATE.json"""
    state_file = os.path.join(
        os.environ.get('PRISM_ROOT', r'C:\Users\Admin.DIGITALSTORM-PC\Box\C:/PRISM'),
        'CURRENT_STATE.json'
    )
    
    result = validate_session(state_file)
    return result

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    if sys.argv[1] == '--current':
        result = validate_current_session()
        print(json.dumps(result, indent=2))
        sys.exit(0 if result['valid'] else 1)
    
    elif sys.argv[1] == '--all':
        if len(sys.argv) < 3:
            print("Usage: python workflow_validator.py --all <logs_dir>")
            sys.exit(1)
        results = validate_all_sessions(sys.argv[2])
        print(generate_report(results))
    
    else:
        result = validate_session(sys.argv[1])
        print(json.dumps(result, indent=2))
        sys.exit(0 if result['valid'] else 1)
