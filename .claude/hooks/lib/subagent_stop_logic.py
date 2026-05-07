import json, time, os, sys
raw = os.environ.get("_SAE_INPUT", "")
d = json.loads(raw) if raw else {}
name = d.get("agent_name", "unknown")
atype = d.get("agent_type", "unknown")

tel_dir = os.path.expanduser("~/.prism/telemetry")
os.makedirs(tel_dir, exist_ok=True)
entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
         "agent_name": name, "agent_type": atype, "event": "completed"}
with open(os.path.join(tel_dir, "agent-spawns.jsonl"), "a") as f:
    f.write(json.dumps(entry) + "\n")

# CCM-MS14: Record agent completion with coordination_stats
try:
    sys.path.insert(0, os.path.expanduser("~/.claude/hooks/lib"))
    from coordination_stats import record_agent_completion
    # Read start time if available
    start_file = os.path.expanduser(f"~/.prism/telemetry/agent-start-{name}.json")
    start_ms = 0
    model = atype
    if os.path.exists(start_file):
        with open(start_file) as f:
            sdata = json.load(f)
        start_ms = sdata.get("start_ms", 0)
        model = sdata.get("model", atype)
        os.remove(start_file)
    elapsed_ms = (time.time() * 1000 - start_ms) if start_ms > 0 else 0
    # Estimate turns from elapsed time (rough: 1 turn ~ 5s)
    est_turns = max(1, int(elapsed_ms / 5000)) if elapsed_ms > 0 else 1
    record_agent_completion(model, success=True, turns_used=est_turns, tokens_estimated=0)
except Exception as e:
    # Log import failure for debugging
    try:
        from datetime import datetime as _dt
        log_dir = os.path.expanduser("~/.prism/telemetry")
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "import-errors.log"), "a") as _f:
            _f.write(f"{_dt.now().isoformat()} {__file__}: {e}" + chr(10))
    except:
        pass

count_file = "/tmp/prism-agent-count"
count = 0
try:
    with open(count_file) as f:
        count = int(f.read().strip())
except Exception:
    pass
count = max(0, count - 1)
with open(count_file, "w") as f:
    f.write(str(count))
