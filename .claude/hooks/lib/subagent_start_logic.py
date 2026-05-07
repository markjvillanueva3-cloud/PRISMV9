import json, time, os
raw = os.environ.get("_SAS_INPUT", "")
d = json.loads(raw) if raw else {}
name = d.get("agent_name", "unknown")
atype = d.get("agent_type", "unknown")

tel_dir = os.path.expanduser("~/.prism/telemetry")
os.makedirs(tel_dir, exist_ok=True)
entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
         "agent_name": name, "agent_type": atype, "event": "started"}
with open(os.path.join(tel_dir, "agent-spawns.jsonl"), "a") as f:
    f.write(json.dumps(entry) + "\n")

# CCM-MS14: Record agent start time for completion tracking
try:
    start_file = os.path.expanduser(f"~/.prism/telemetry/agent-start-{name}.json")
    with open(start_file, "w") as f:
        json.dump({"start_ms": time.time() * 1000, "model": atype}, f)
except Exception:
    pass

count_file = "/tmp/prism-agent-count"
count = 0
try:
    with open(count_file) as f:
        count = int(f.read().strip())
except Exception:
    pass
count += 1
with open(count_file, "w") as f:
    f.write(str(count))

if count > 5:
    print(f"{count} agents running. Monitor token budget.")
