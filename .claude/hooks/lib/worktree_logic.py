import json, time, os, sys
raw = os.environ.get("_WT_INPUT", "")
d = json.loads(raw) if raw else {}
event_type = sys.argv[1] if len(sys.argv) > 1 else "unknown"

tel_dir = os.path.expanduser("~/.prism/telemetry")
os.makedirs(tel_dir, exist_ok=True)
entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
         "event": event_type, "cwd": d.get("cwd", "")}
with open(os.path.join(tel_dir, "worktrees.jsonl"), "a") as f:
    f.write(json.dumps(entry) + "\n")
