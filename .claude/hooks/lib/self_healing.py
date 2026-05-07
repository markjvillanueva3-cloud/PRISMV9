#!/usr/bin/env python3
"""PRISM Self-Healing Infrastructure - auto-detect and repair system drift."""
import json, os, subprocess, glob, re, time
from datetime import datetime

PRISM_ROOT = "H:/prism/mcp-server"
TELEMETRY_DIR = os.path.expanduser("~/.prism/telemetry")


def check_schema_drift():
    """Compare z.enum entries vs actual case handlers in dispatchers."""
    drift_report = {"checked": 0, "drifted": [], "auto_fixable": []}
    dispatcher_dir = os.path.join(PRISM_ROOT, "src/tools/dispatchers")

    if not os.path.isdir(dispatcher_dir):
        return drift_report

    for fname in os.listdir(dispatcher_dir):
        if not fname.endswith(".ts"):
            continue
        filepath = os.path.join(dispatcher_dir, fname)
        try:
            with open(filepath, encoding="utf-8") as f:
                content = f.read()
        except IOError:
            continue

        drift_report["checked"] += 1

        # Extract z.enum values
        enum_match = re.findall(r'z\.enum\(\[(.*?)\]\)', content, re.DOTALL)
        enum_values = set()
        for match in enum_match:
            enum_values.update(re.findall(r'"([^"]+)"', match))

        # Extract case values
        case_values = set(re.findall(r'case\s+"([^"]+)"', content))

        # Find discrepancies
        missing_cases = enum_values - case_values
        missing_enum = case_values - enum_values

        if missing_cases or missing_enum:
            drift_report["drifted"].append({
                "file": fname,
                "missing_cases": list(missing_cases),
                "missing_enum": list(missing_enum)
            })

    return drift_report


def check_registry_drift():
    """Compare registered engines vs actual engine files."""
    drift_report = {"engine_files": 0, "index_exports": 0, "missing_from_index": []}

    engine_dir = os.path.join(PRISM_ROOT, "src/engines")
    index_path = os.path.join(engine_dir, "index.ts")

    if not os.path.isdir(engine_dir) or not os.path.isfile(index_path):
        return drift_report

    engine_files = set()
    for f in os.listdir(engine_dir):
        if f.endswith(".ts") and f != "index.ts" and not f.endswith(".test.ts") and not f.endswith(".d.ts"):
            engine_files.add(f.replace(".ts", ""))
    drift_report["engine_files"] = len(engine_files)

    try:
        with open(index_path, encoding="utf-8") as f:
            index_content = f.read()
        exported = set(re.findall(r"export\s+\{[^}]*\}\s+from\s+['\"]\.\/([^'\"]+)['\"]", index_content))
        exported.update(re.findall(r"export\s+\*\s+from\s+['\"]\.\/([^'\"]+)['\"]", index_content))
        drift_report["index_exports"] = len(exported)
    except IOError:
        return drift_report

    drift_report["missing_from_index"] = list(engine_files - exported)[:20]
    return drift_report


def check_hook_health():
    """Validate all hook scripts are syntactically valid and referenced files exist."""
    hooks_dir = os.path.expanduser("~/.claude/hooks")
    if not os.path.isdir(hooks_dir):
        return {"valid": 0, "invalid": [], "missing_deps": []}

    report = {"valid": 0, "invalid": [], "missing_deps": []}

    for fname in os.listdir(hooks_dir):
        if not fname.endswith(".sh"):
            continue
        filepath = os.path.join(hooks_dir, fname)

        try:
            result = subprocess.run(
                ["bash", "-n", filepath],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                report["valid"] += 1
            else:
                report["invalid"].append({"file": fname, "error": result.stderr[:200]})
        except (subprocess.TimeoutExpired, FileNotFoundError):
            report["invalid"].append({"file": fname, "error": "syntax check failed/timeout"})

        try:
            with open(filepath) as f:
                for line in f:
                    source_match = re.search(r'source\s+"([^"]+)"', line)
                    if source_match:
                        dep = source_match.group(1)
                        dep = dep.replace('$(dirname "$0")', os.path.dirname(filepath))
                        if not os.path.exists(dep):
                            report["missing_deps"].append({"file": fname, "dep": dep})
        except IOError:
            pass

    return report


def check_memory_staleness():
    """Check MEMORY.md for references to files that no longer exist."""
    memory_path = os.path.expanduser("~/.claude/projects/C--Windows-System32/memory/MEMORY.md")
    if not os.path.exists(memory_path):
        return {"exists": False}

    report = {"total_lines": 0, "stale_refs": [], "line_count_ok": True}

    try:
        with open(memory_path, encoding="utf-8") as f:
            lines = f.readlines()
        report["total_lines"] = len(lines)
        report["line_count_ok"] = len(lines) <= 200

        path_pattern = re.compile(r'[`"]([A-Za-z]:/[^`"]+\.[a-z]+)[`"]')
        checked = 0
        for line in lines:
            matches = path_pattern.findall(line)
            for path in matches:
                if checked >= 10:
                    break
                if not os.path.exists(path):
                    report["stale_refs"].append(path)
                checked += 1
    except IOError:
        pass

    return report


def check_test_flakiness():
    """Analyze test result history for flaky tests."""
    results_file = os.path.join(TELEMETRY_DIR, "cron-results.jsonl")
    if not os.path.exists(results_file):
        return {"tracked_tests": 0, "flaky": []}

    test_history = {}

    try:
        with open(results_file) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if entry.get("cron") == "test-regression":
                        details = entry.get("details", "")
                        status = entry.get("status", "")
                        test_history.setdefault("full-suite", []).append(status == "pass")
                except json.JSONDecodeError:
                    pass
    except IOError:
        pass

    flaky = []
    for test, results in test_history.items():
        if len(results) >= 5:
            pass_rate = sum(results) / len(results)
            if 0.1 < pass_rate < 0.9:
                flaky.append({"test": test, "pass_rate": round(pass_rate, 2), "runs": len(results)})

    return {"tracked_tests": len(test_history), "flaky": flaky}


def run_full_health_check():
    """Run all self-healing checks and produce unified report."""
    report = {
        "timestamp": datetime.now().isoformat(),
        "schema_drift": check_schema_drift(),
        "registry_drift": check_registry_drift(),
        "hook_health": check_hook_health(),
        "memory_staleness": check_memory_staleness(),
        "test_flakiness": check_test_flakiness(),
    }

    issues = 0
    if report["schema_drift"]["drifted"]:
        issues += len(report["schema_drift"]["drifted"])
    if report["registry_drift"]["missing_from_index"]:
        issues += len(report["registry_drift"]["missing_from_index"])
    if report["hook_health"]["invalid"]:
        issues += len(report["hook_health"]["invalid"])
    if report["memory_staleness"].get("stale_refs"):
        issues += len(report["memory_staleness"]["stale_refs"])
    if not report["memory_staleness"].get("line_count_ok", True):
        issues += 1
    if report["test_flakiness"]["flaky"]:
        issues += len(report["test_flakiness"]["flaky"])

    report["health_score"] = max(0, 100 - issues * 5)
    report["total_issues"] = issues

    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    with open(os.path.join(TELEMETRY_DIR, "health-checks.jsonl"), "a") as f:
        f.write(json.dumps(report) + "\n")

    return report


if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "full"
    if cmd == "full":
        print(json.dumps(run_full_health_check(), indent=2))
    elif cmd == "schema":
        print(json.dumps(check_schema_drift(), indent=2))
    elif cmd == "registry":
        print(json.dumps(check_registry_drift(), indent=2))
    elif cmd == "hooks":
        print(json.dumps(check_hook_health(), indent=2))
    elif cmd == "memory":
        print(json.dumps(check_memory_staleness(), indent=2))
    elif cmd == "flaky":
        print(json.dumps(check_test_flakiness(), indent=2))
    else:
        print(f"Usage: self_healing.py [full|schema|registry|hooks|memory|flaky]")
