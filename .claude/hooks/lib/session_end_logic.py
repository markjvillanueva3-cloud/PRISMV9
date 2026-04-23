import json, time, os, sys
raw = os.environ.get("_SE_INPUT", "")
d = json.loads(raw) if raw else {}
reason = d.get("session_end_reason", "unknown")
session_id = d.get("session_id", "")

tel_dir = os.path.expanduser("~/.prism/telemetry")
os.makedirs(tel_dir, exist_ok=True)

def count_lines(filename):
    path = os.path.join(tel_dir, filename)
    if not os.path.exists(path):
        return 0
    with open(path) as f:
        return sum(1 for _ in f)

failure_count = count_lines("tool-failures.jsonl")
stop_count = count_lines("stop-failures.jsonl")

agent_count = 0
apath = os.path.join(tel_dir, "agent-spawns.jsonl")
if os.path.exists(apath):
    with open(apath) as f:
        for line in f:
            if '"started"' in line:
                agent_count += 1

entry = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "session_id": session_id, "end_reason": reason,
    "tool_failures": failure_count, "agent_spawns": agent_count,
    "stop_failures": stop_count
}
with open(os.path.join(tel_dir, "sessions.jsonl"), "a") as f:
    f.write(json.dumps(entry) + "\n")

# CCM-MS14: Record session token estimate for variance analysis
try:
    sys.path.insert(0, os.path.expanduser("~/.claude/hooks/lib"))
    from coordination_stats import record_session_tokens
    # Estimate tokens from session activity (tool calls are rough proxy)
    # Each tool failure ~ 500 tokens, each agent ~ 5000 tokens, base ~ 10000
    estimated_tokens = 10000 + (failure_count * 500) + (agent_count * 5000) + (stop_count * 200)
    record_session_tokens(estimated_tokens)
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
