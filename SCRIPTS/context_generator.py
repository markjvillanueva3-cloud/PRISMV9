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
INDEX_FILE = os.path.join(PRISM_ROOT, "PROJECT_INDEX.json")
STATE_FILE = os.path.join(PRISM_ROOT, "CURRENT_STATE.json")

def load_state():
    """Load current state — prefer PROJECT_INDEX.json (unified), fall back to CURRENT_STATE.json"""
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, 'r') as f:
            return json.load(f)
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
    
    # Support both PROJECT_INDEX.json (unified) and CURRENT_STATE.json (legacy)
    if "session" in state:
        # PROJECT_INDEX.json format
        session = state.get("session", {})
        extraction = state.get("extraction", {})
        progress = extraction.get("progress", {})
        phase = session.get("phase", "Unknown")
        focus = session.get("name", "Unknown")
        next_action = session.get("nextAction", "Check PROJECT_INDEX.json")
        rules = state.get("rules", [])
        github = state.get("project", {}).get("github", "markjvillanueva3-cloud/PRISMV9")
    else:
        # Legacy CURRENT_STATE.json format
        extraction_data = state.get("extraction", {})
        progress = extraction_data.get("progress", {})
        phase = extraction_data.get("phase", "Unknown")
        focus = extraction_data.get("stage", "Unknown")
        next_action = "Check CURRENT_STATE.json"
        rules = []
        github = "markjvillanueva3-cloud/PRISMV9"

    # Build progress summary
    progress_lines = []
    for cat, vals in progress.items():
        if isinstance(vals, dict):
            progress_lines.append(f"  {cat}: {vals.get('extracted', 0)}/{vals.get('total', 0)}")

    context = f"""PRISM v9.0 Session Context
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Status
- Phase: {phase}
- Focus: {focus}
- Extracted: {file_count} files ({total_size // 1024}KB)
- Progress:
{chr(10).join(progress_lines)}

## Next Task
- {next_action}
"""

    if rules:
        context += "\n## Core Rules\n"
        for i, rule in enumerate(rules, 1):
            context += f"{i}. {rule}\n"
    else:
        context += """
## Core Rules
1. USE EVERYTHING - Wire all DBs to consumers
2. CARRY FORWARD - Preserve existing code
3. VERIFY - Check before/after changes
4. NO PARTIALS - Complete extractions only
5. UPDATE STATE - End with CURRENT_STATE.json update
"""

    context += f"""
## Paths
- Repo: {PRISM_ROOT}
- Extracted: {os.path.join(PRISM_ROOT, 'EXTRACTED')}
- GitHub: {github}
"""

    if detailed:
        context += "\n## Recent Completed\n"
        completed = state.get("completedExtractions", state.get("extraction", {}).get("completedExtractions", []))
        for item in completed[:5]:
            if isinstance(item, dict):
                context += f"- {item.get('category', 'unknown')}: {item.get('count', item.get('files', '?'))} items\n"
            else:
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
