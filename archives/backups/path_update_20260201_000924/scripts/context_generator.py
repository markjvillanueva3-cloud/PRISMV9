"""
PRISM Context Generator v1.0
Generates minimal context for Claude sessions - saves tokens!

Usage:
    python context_generator.py              - Print context to console
    python context_generator.py --file       - Save to CONTEXT.txt
    python context_generator.py --clipboard  - Copy to clipboard (requires pyperclip)
"""

import json
import os
import sys
from datetime import datetime

PRISM_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_FILE = os.path.join(PRISM_ROOT, "CURRENT_STATE.json")

def load_state():
    """Load current state"""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {}

def count_extracted():
    """Count extracted files"""
    extracted_dir = os.path.join(PRISM_ROOT, "EXTRACTED")
    if not os.path.exists(extracted_dir):
        return 0, 0
    
    file_count = 0
    total_size = 0
    for root, dirs, files in os.walk(extracted_dir):
        for f in files:
            if f.endswith('.js'):
                file_count += 1
                total_size += os.path.getsize(os.path.join(root, f))
    
    return file_count, total_size

def generate_context(detailed=False):
    """Generate minimal context string"""
    state = load_state()
    file_count, total_size = count_extracted()
    
    context = f"""PRISM v9.0 Session Context
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Status
- Phase: {state.get('current', {}).get('phase', 'Unknown')}
- Focus: {state.get('current', {}).get('focus', 'Unknown')}
- Extracted: {file_count} files ({total_size // 1024}KB)
- Stats: {state.get('quick_stats', {}).get('extracted', 'N/A')}

## Next Task
"""
    
    next_tasks = state.get('next_tasks', [])
    if next_tasks:
        task = next_tasks[0]
        context += f"- ID: {task.get('id')}\n"
        context += f"- Task: {task.get('task')}\n"
        context += f"- Priority: {task.get('priority')}\n"
    else:
        context += "- Check CURRENT_STATE.json\n"
    
    context += """
## Core Rules
1. USE EVERYTHING - Wire all DBs to consumers
2. CARRY FORWARD - Preserve existing code
3. VERIFY - Check before/after changes
4. NO PARTIALS - Complete extractions only
5. UPDATE STATE - End with CURRENT_STATE.json update

## Paths
- Box: C:\\Users\\wompu\\Box\\PRISM REBUILD\\
- Extracted: [Box]\\EXTRACTED\\
- GitHub: markjvillanueva3-cloud/PRISMV9
"""

    if detailed:
        context += f"""
## Recent Completed
"""
        for item in state.get('last_completed', [])[:5]:
            context += f"- {item}\n"
    
    return context

def main():
    detailed = '--detailed' in sys.argv
    
    context = generate_context(detailed)
    
    if '--file' in sys.argv:
        output_path = os.path.join(PRISM_ROOT, "SESSION_CONTEXT.txt")
        with open(output_path, 'w') as f:
            f.write(context)
        print(f"Context saved to {output_path}")
    
    elif '--clipboard' in sys.argv:
        try:
            import pyperclip
            pyperclip.copy(context)
            print("Context copied to clipboard!")
        except ImportError:
            print("pyperclip not installed. Run: pip install pyperclip")
            print("\nContext:\n")
            print(context)
    
    else:
        print(context)

if __name__ == '__main__':
    main()
