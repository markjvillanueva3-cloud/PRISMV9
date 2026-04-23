import json, time, os, sys
raw = os.environ.get("_SF_INPUT", "")
d = json.loads(raw) if raw else {}
failure_type = d.get("stop_failure_type", "unknown")

tel_dir = os.path.expanduser("~/.prism/telemetry")
os.makedirs(tel_dir, exist_ok=True)
entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "type": failure_type}
with open(os.path.join(tel_dir, "stop-failures.jsonl"), "a") as f:
    f.write(json.dumps(entry) + "\n")

# CCM-MS14: Record stop failure for retry probability tracking
try:
    sys.path.insert(0, os.path.expanduser("~/.claude/hooks/lib"))
    from coordination_stats import record_retry_result
    record_retry_result(f"stop_{failure_type}", attempt_number=1, success=False)
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

hints = {
    "rate_limit": "Rate limited. Wait 30s before next prompt.",
    "authentication_failed": "Auth failed. Run: claude auth login",
    "billing_error": "Billing error. Check account at console.anthropic.com.",
    "server_error": "Server error. Retry in a moment.",
    "max_output_tokens": "Output truncated. Ask Claude to continue.",
    "invalid_request": "Invalid request error. Check input format.",
}
print(hints.get(failure_type, f"Stop failure: {failure_type}. Check logs."))
