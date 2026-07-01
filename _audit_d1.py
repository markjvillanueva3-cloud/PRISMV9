import os, re
core = r'C:\PRISM\scripts\core'
files = ['wip_capturer.py','wip_saver.py','graceful_shutdown.py','state_rollback.py','clone_factory.py','recovery_scorer.py','checkpoint_mgr.py']
for f in files:
    fp = os.path.join(core, f)
    lines = open(fp).readlines()
    print(f'=== {f} ({len(lines)} lines) ===')
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('def ') or stripped.startswith('class ') or 'if __name__' in stripped or 'argparse' in stripped:
            print(f'  L{i+1}: {stripped[:90]}')
    print()
