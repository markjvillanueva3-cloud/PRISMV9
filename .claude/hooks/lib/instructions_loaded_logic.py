import json, time, os
raw = os.environ.get("_IL_INPUT", "")
d = json.loads(raw) if raw else {}
reason = d.get("instructions_loaded_reason", "")

if reason != "session_start":
    exit(0)

memory_path = os.path.expanduser("~/.claude/projects/C--Windows-System32/memory/MEMORY.md")
if os.path.exists(memory_path):
    age_days = (time.time() - os.path.getmtime(memory_path)) / 86400
    if age_days > 7:
        print(f"MEMORY.md is {age_days:.0f} days old. Consider updating.")
    elif age_days > 3:
        print(f"MEMORY.md last updated {age_days:.1f} days ago.")
