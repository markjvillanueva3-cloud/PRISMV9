import json, re, time, os, sys
raw = os.environ.get("_PTF_INPUT", "")
d = json.loads(raw) if raw else {}
tool = d.get("tool_name", "unknown")
error = d.get("error", "") or ""
tool_input = d.get("tool_input", {})

transient_patterns = ["timeout", r"rate.?limit", "timed out", "ETIMEDOUT", "ECONNRESET",
                      "network", "connection refused", "socket hang up", "503", "429", "502"]
classification = "permanent"
for p in transient_patterns:
    if re.search(p, error, re.IGNORECASE):
        classification = "transient"
        break

tel_dir = os.path.expanduser("~/.prism/telemetry")
os.makedirs(tel_dir, exist_ok=True)
entry = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "tool": tool, "error_snippet": error[:200],
    "classification": classification,
    "input_keys": list(tool_input.keys()) if isinstance(tool_input, dict) else []
}
with open(os.path.join(tel_dir, "tool-failures.jsonl"), "a") as f:
    f.write(json.dumps(entry) + "\n")

# CCM-MS14: Record retry result for error type tracking
try:
    sys.path.insert(0, os.path.expanduser("~/.claude/hooks/lib"))
    from coordination_stats import record_retry_result
    # Tool failures are attempt 1 failures by default
    record_retry_result(classification, attempt_number=1, success=False)
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

if classification == "transient":
    print(f"Transient {tool} failure ({error[:60]}). Retry may succeed.")
