import json, time, os

raw = os.environ.get("_PC_INPUT", "")
d = json.loads(raw) if raw else {}
compact_type = d.get("compact_type", "unknown")

# --- Telemetry logging ---
tel_dir = os.path.expanduser("~/.prism/telemetry")
os.makedirs(tel_dir, exist_ok=True)
entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "compact_type": compact_type}
with open(os.path.join(tel_dir, "compactions.jsonl"), "a") as f:
    f.write(json.dumps(entry) + chr(10))

hints = []

# --- Precompact facts (session-specific task/files) ---
facts_file = os.path.expanduser("~/.prism/precompact-facts.json")
if os.path.exists(facts_file):
    try:
        age = time.time() - os.path.getmtime(facts_file)
        if age < 600:
            with open(facts_file) as f:
                facts = json.load(f)
            parts = []
            if facts.get("task"):
                parts.append("TASK: " + facts["task"][:100])
            if facts.get("next_action"):
                parts.append("NEXT: " + facts["next_action"][:100])
            if facts.get("active_files"):
                parts.append("FILES: " + ", ".join(facts["active_files"][:5]))
            if facts.get("warnings"):
                parts.append("WARN: " + "; ".join(facts["warnings"][:3]))
            if parts:
                hints.append("SESSION: " + " | ".join(parts))
        os.remove(facts_file)
    except Exception:
        pass

# --- Compaction survival facts (persistent critical knowledge) ---
survival_paths = [
    os.path.expanduser("~/.claude/projects/C--Windows-System32/memory/compaction-survival.json"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "projects", "C--Windows-System32", "memory", "compaction-survival.json"),
]

survival = None
for sp in survival_paths:
    if os.path.exists(sp):
        try:
            with open(sp) as f:
                survival = json.load(f)
            break
        except Exception:
            pass

if survival and "critical_facts" in survival:
    facts_list = survival["critical_facts"]
    critical_keys = {"project_path", "build_command", "test_command", "platform"}
    scale_keys = {"engine_count", "dispatcher_count", "action_count", "test_count", "tool_catalog_size", "machine_catalog_size", "material_db_size"}
    efficiency_keys = {"digest_command", "navigate_command", "compact_index", "dsl_shortcodes", "memory_path"}

    critical_parts = []
    scale_parts = []
    efficiency_parts = []

    for fact in facts_list:
        k = fact["key"]
        v = fact["value"]
        if k in critical_keys:
            critical_parts.append(k + "=" + v)
        elif k in scale_keys:
            scale_parts.append(k + "=" + v)
        elif k in efficiency_keys:
            efficiency_parts.append(k + "=" + v)
        else:
            critical_parts.append(k + "=" + v)

    if critical_parts:
        hints.append("CRITICAL: " + " | ".join(critical_parts))
    if scale_parts:
        hints.append("SCALE: " + " | ".join(scale_parts))
    if efficiency_parts:
        hints.append("EFFICIENCY: " + " | ".join(efficiency_parts))

# --- Recovery guidance ---
hints.append("RECOVERY: Run /digest-all for system map (~1535 tokens) or /navigate <topic> for zero-IO lookup")

# --- Output single-line summary (safe for hint() positional args) ---
if hints:
    summary = "POST-COMPACT(" + compact_type + "): " + " | ".join(h.replace(chr(10), " ").replace(chr(34), chr(39)) for h in hints)
    # Truncate to avoid excessive token use in hint
    if len(summary) > 500:
        summary = summary[:497] + "..."
    print(summary)
