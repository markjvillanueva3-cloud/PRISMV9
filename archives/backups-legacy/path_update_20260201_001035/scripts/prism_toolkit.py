#!/usr/bin/env python3
"""
PRISM Toolkit v1.0
Master automation script that coordinates all PRISM development tools.

Usage:
    python prism_toolkit.py health              - Run all health checks
    python prism_toolkit.py audit               - Full audit (skills + DBs + code)
    python prism_toolkit.py dashboard           - Show progress dashboard
    python prism_toolkit.py validate            - Validate workflow compliance
    python prism_toolkit.py session start <id>  - Start new session
    python prism_toolkit.py session end         - End current session
    python prism_toolkit.py extract <start> <end> <out> - Extract module
    python prism_toolkit.py report              - Generate comprehensive report
    python prism_toolkit.py --help              - Show this help
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime

# Configuration
PRISM_ROOT = os.environ.get('PRISM_ROOT', r'C:\Users\Admin.DIGITALSTORM-PC\Box\C:/PRISM')
SCRIPTS_DIR = os.path.join(PRISM_ROOT, 'SCRIPTS')
EXTRACTED_DIR = os.path.join(PRISM_ROOT, 'EXTRACTED')
SKILLS_DIR = os.path.join(PRISM_ROOT, '_SKILLS')
STATE_FILE = os.path.join(PRISM_ROOT, 'CURRENT_STATE.json')
MONOLITH = os.path.join(PRISM_ROOT, '_BUILD', 'PRISM_v8_89_002_TRUE_100_PERCENT', 'PRISM_v8_89_002_TRUE_100_PERCENT.html')

# Available tools
TOOLS = {
    'session_manager': 'session_manager.py',
    'update_state': 'update_state.py',
    'context_generator': 'context_generator.py',
    'extract_module': 'extract_module.py',
    'verify_features': 'verify_features.py',
    'build_level5': 'build_level5_databases.py',
    'skill_validator': 'skill_validator.py',
    'database_auditor': 'database_auditor.py',
    'code_quality': 'code_quality_scanner.py',
    'dependency_mapper': 'dependency_mapper.py',
    'progress_dashboard': 'progress_dashboard.py',
    'workflow_validator': 'workflow_validator.py',
}

def run_script(script_name, args=None):
    """Run a Python script from the SCRIPTS directory"""
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    
    if not os.path.exists(script_path):
        print(f"⚠️  Script not found: {script_path}")
        return None
    
    cmd = [sys.executable, script_path]
    if args:
        cmd.extend(args)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return {
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    except subprocess.TimeoutExpired:
        return {'error': 'Script timed out'}
    except Exception as e:
        return {'error': str(e)}

def health_check():
    """Run all health checks"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    PRISM HEALTH CHECK                         ║
╠══════════════════════════════════════════════════════════════╣
""")
    
    checks = []
    
    # Check 1: State file exists
    state_exists = os.path.exists(STATE_FILE)
    checks.append(('State File', state_exists))
    print(f"║  {'✅' if state_exists else '❌'} State File: {STATE_FILE[:45]}")
    
    # Check 2: Extracted directory exists
    extracted_exists = os.path.exists(EXTRACTED_DIR)
    checks.append(('Extracted Dir', extracted_exists))
    print(f"║  {'✅' if extracted_exists else '❌'} Extracted Directory exists")
    
    # Check 3: Skills directory exists
    skills_exists = os.path.exists(SKILLS_DIR)
    checks.append(('Skills Dir', skills_exists))
    print(f"║  {'✅' if skills_exists else '❌'} Skills Directory exists")
    
    # Check 4: Monolith accessible
    monolith_exists = os.path.exists(MONOLITH)
    checks.append(('Monolith', monolith_exists))
    print(f"║  {'✅' if monolith_exists else '❌'} Monolith file accessible")
    
    # Check 5: Scripts available
    scripts_found = sum(1 for s in TOOLS.values() if os.path.exists(os.path.join(SCRIPTS_DIR, s)))
    scripts_ok = scripts_found >= 6
    checks.append(('Scripts', scripts_ok))
    print(f"║  {'✅' if scripts_ok else '⚠️'} Scripts: {scripts_found}/{len(TOOLS)} available")
    
    # Check 6: No active session in bad state
    if state_exists:
        try:
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
            session_ok = state.get('currentSession', {}).get('status') != 'CRASHED'
            checks.append(('Session State', session_ok))
            print(f"║  {'✅' if session_ok else '❌'} Session state OK")
        except:
            checks.append(('Session State', False))
            print(f"║  ❌ Cannot read state file")
    
    passed = sum(1 for _, ok in checks if ok)
    total = len(checks)
    
    print(f"""╠══════════════════════════════════════════════════════════════╣
║  Result: {passed}/{total} checks passed                                   ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    return passed == total

def full_audit():
    """Run comprehensive audit of all resources"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    PRISM FULL AUDIT                           ║
╠══════════════════════════════════════════════════════════════╣
""")
    
    results = {}
    
    # Skill validation
    print("║  Running skill validation...")
    result = run_script('skill_validator.py', ['--report', SKILLS_DIR])
    if result and result.get('stdout'):
        print(result['stdout'][:500])
        results['skills'] = 'OK' if result['returncode'] == 0 else 'ISSUES'
    
    # Database audit
    print("║  Running database audit...")
    result = run_script('database_auditor.py', [EXTRACTED_DIR])
    if result and result.get('stdout'):
        print(result['stdout'][:500])
        results['databases'] = 'OK' if result['returncode'] == 0 else 'ISSUES'
    
    # Code quality scan
    print("║  Running code quality scan...")
    result = run_script('code_quality_scanner.py', [EXTRACTED_DIR])
    if result and result.get('stdout'):
        print(result['stdout'][:500])
        results['code_quality'] = 'OK' if result['returncode'] == 0 else 'ISSUES'
    
    # Dependency mapping
    print("║  Running dependency analysis...")
    result = run_script('dependency_mapper.py', [EXTRACTED_DIR])
    if result and result.get('stdout'):
        print(result['stdout'][:500])
        results['dependencies'] = 'OK' if result['returncode'] == 0 else 'ISSUES'
    
    print(f"""╠══════════════════════════════════════════════════════════════╣
║  AUDIT SUMMARY                                                ║
║  ────────────────────────────────────────────────────────────║""")
    
    for area, status in results.items():
        icon = '✅' if status == 'OK' else '❌'
        print(f"║  {icon} {area.replace('_', ' ').title():<20}: {status:<30} ║")
    
    print("╚══════════════════════════════════════════════════════════════╝")
    
    return all(s == 'OK' for s in results.values())

def show_dashboard():
    """Show progress dashboard"""
    result = run_script('progress_dashboard.py')
    if result and result.get('stdout'):
        print(result['stdout'])
    else:
        print("Could not generate dashboard")

def validate_workflow():
    """Validate workflow compliance"""
    logs_dir = os.path.join(PRISM_ROOT, 'SESSION_LOGS')
    result = run_script('workflow_validator.py', ['--all', logs_dir])
    if result and result.get('stdout'):
        print(result['stdout'])

def session_start(session_id):
    """Start a new session"""
    result = run_script('session_manager.py', ['start', session_id])
    if result and result.get('stdout'):
        print(result['stdout'])
    
    # Generate context
    result = run_script('context_generator.py')
    if result and result.get('stdout'):
        print("\n--- Session Context ---")
        print(result['stdout'])

def session_end():
    """End current session"""
    result = run_script('session_manager.py', ['end'])
    if result and result.get('stdout'):
        print(result['stdout'])

def extract_module(start, end, output):
    """Extract a module from monolith"""
    result = run_script('extract_module.py', [MONOLITH, str(start), str(end), output])
    if result and result.get('stdout'):
        print(result['stdout'])
    if result and result.get('stderr'):
        print(result['stderr'])

def generate_report():
    """Generate comprehensive project report"""
    report_path = os.path.join(PRISM_ROOT, f'PRISM_REPORT_{datetime.now().strftime("%Y%m%d_%H%M%S")}.md')
    
    report = f"""# PRISM v9.0 Project Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Health Check
"""
    
    # Add health check results
    health_ok = health_check()
    report += f"\nOverall Health: {'✅ HEALTHY' if health_ok else '❌ ISSUES DETECTED'}\n"
    
    report += "\n## Progress Dashboard\n```\n"
    result = run_script('progress_dashboard.py')
    if result and result.get('stdout'):
        report += result['stdout']
    report += "\n```\n"
    
    report += "\n## Skill Validation\n```\n"
    result = run_script('skill_validator.py', ['--report', SKILLS_DIR])
    if result and result.get('stdout'):
        report += result['stdout'][:2000]
    report += "\n```\n"
    
    report += "\n## Database Audit\n```\n"
    result = run_script('database_auditor.py', [EXTRACTED_DIR])
    if result and result.get('stdout'):
        report += result['stdout'][:2000]
    report += "\n```\n"
    
    report += "\n## Code Quality\n```\n"
    result = run_script('code_quality_scanner.py', [EXTRACTED_DIR])
    if result and result.get('stdout'):
        report += result['stdout'][:2000]
    report += "\n```\n"
    
    # Save report
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\n✅ Report saved to: {report_path}")

def show_help():
    """Show help message"""
    print(__doc__)
    print("\nAvailable Scripts:")
    for name, script in sorted(TOOLS.items()):
        exists = "✅" if os.path.exists(os.path.join(SCRIPTS_DIR, script)) else "❌"
        print(f"  {exists} {name:<20} → {script}")

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] == '--help':
        show_help()
        sys.exit(0)
    
    command = sys.argv[1].lower()
    
    if command == 'health':
        success = health_check()
        sys.exit(0 if success else 1)
    
    elif command == 'audit':
        success = full_audit()
        sys.exit(0 if success else 1)
    
    elif command == 'dashboard':
        show_dashboard()
    
    elif command == 'validate':
        validate_workflow()
    
    elif command == 'session':
        if len(sys.argv) < 3:
            print("Usage: python prism_toolkit.py session start|end [session_id]")
            sys.exit(1)
        
        subcommand = sys.argv[2].lower()
        if subcommand == 'start':
            session_id = sys.argv[3] if len(sys.argv) > 3 else f"SESSION_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            session_start(session_id)
        elif subcommand == 'end':
            session_end()
        else:
            print(f"Unknown session command: {subcommand}")
    
    elif command == 'extract':
        if len(sys.argv) < 5:
            print("Usage: python prism_toolkit.py extract <start_line> <end_line> <output_path>")
            sys.exit(1)
        extract_module(sys.argv[2], sys.argv[3], sys.argv[4])
    
    elif command == 'report':
        generate_report()
    
    else:
        print(f"Unknown command: {command}")
        show_help()
        sys.exit(1)
