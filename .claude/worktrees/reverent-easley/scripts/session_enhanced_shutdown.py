#!/usr/bin/env python3
"""
session_enhanced_shutdown.py — DA-MS11 Enhanced Session Shutdown
Runs BEFORE standard shutdown to capture DA cadence metrics and audit.
Executable: py -3 C:\\PRISM\\scripts\\session_enhanced_shutdown.py [--json] [--summary "task summary"]

Actions:
1. Capture session cadence metrics (how many times each cadence fired)
2. Run hook activation audit for current phase
3. Generate skill usage stats for the session
4. Persist NL hook evaluation history
5. Write session quality summary
6. Append to session history log
"""

import os, sys, json, time, glob
from datetime import datetime, timezone
from pathlib import Path

STATE_DIR = Path(r"C:\PRISM\state")
DATA_DIR = Path(r"C:\PRISM\mcp-server\data")
MATRIX_FILE = DATA_DIR / "docs" / "roadmap" / "HOOK_ACTIVATION_MATRIX.md"
SKILL_INDEX = Path(r"C:\PRISM\skills-consolidated\SKILL_INDEX.json")
SHUTDOWN_LOG = STATE_DIR / "session_shutdown_log.json"
SESSION_HISTORY = STATE_DIR / "session_history.jsonl"
RECENT_ACTIONS = STATE_DIR / "RECENT_ACTIONS.json"
CADENCE_EVENTS = STATE_DIR / "cadence_events.json"
STARTUP_LOG = STATE_DIR / "session_startup_log.json"
CHECKPOINT_DIR = STATE_DIR / "checkpoints"
EVENT_LOG = STATE_DIR / "event_log.json"


def get_session_duration() -> dict:
    """Calculate session duration from startup log."""
    result = {"start": None, "end": None, "duration_minutes": 0}
    if STARTUP_LOG.exists():
        try:
            data = json.loads(STARTUP_LOG.read_text(encoding="utf-8"))
            start_ts = data.get("timestamp")
            if start_ts:
                result["start"] = start_ts
                start_dt = datetime.fromisoformat(start_ts.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                result["duration_minutes"] = round((now - start_dt).total_seconds() / 60, 1)
        except Exception:
            pass
    result["end"] = datetime.now(timezone.utc).isoformat()
    return result


def count_cadence_fires() -> dict:
    """Count how many times each cadence function fired during this session."""
    counts = {}

    # Read RECENT_ACTIONS for cadence action strings
    if RECENT_ACTIONS.exists():
        try:
            data = json.loads(RECENT_ACTIONS.read_text(encoding="utf-8"))
            actions = data if isinstance(data, list) else data.get("actions", [])
            for entry in actions:
                action_str = entry if isinstance(entry, str) else entry.get("action", "")
                # Extract cadence function name from action strings like "TODO_AUTO_REFRESHED"
                if "TODO" in action_str:
                    counts["autoTodoRefresh"] = counts.get("autoTodoRefresh", 0) + 1
                elif "CHECKPOINT" in action_str:
                    counts["autoCheckpoint"] = counts.get("autoCheckpoint", 0) + 1
                elif "PRESSURE" in action_str or "CONTEXT_PRESSURE" in action_str:
                    counts["autoContextPressure"] = counts.get("autoContextPressure", 0) + 1
                elif "COMPACTION" in action_str:
                    counts["autoCompactionDetect"] = counts.get("autoCompactionDetect", 0) + 1
                elif "ATTENTION" in action_str:
                    counts["autoAttentionScore"] = counts.get("autoAttentionScore", 0) + 1
                elif "SKILL_HINT" in action_str:
                    counts["autoSkillHint"] = counts.get("autoSkillHint", 0) + 1
                elif "PHASE_SKILLS" in action_str:
                    counts["autoPhaseSkillLoader"] = counts.get("autoPhaseSkillLoader", 0) + 1
                elif "SKILL_MATCH" in action_str:
                    counts["autoSkillContextMatch"] = counts.get("autoSkillContextMatch", 0) + 1
                elif "NL_HOOK" in action_str:
                    counts["autoNLHookEvaluator"] = counts.get("autoNLHookEvaluator", 0) + 1
                elif "HOOK_PHASE" in action_str:
                    counts["autoHookActivationPhaseCheck"] = counts.get("autoHookActivationPhaseCheck", 0) + 1
                elif "SCRIPT_REC" in action_str:
                    counts["autoScriptRecommend"] = counts.get("autoScriptRecommend", 0) + 1
                elif "RECOVERY_MANIFEST" in action_str:
                    counts["autoRecoveryManifest"] = counts.get("autoRecoveryManifest", 0) + 1
                elif "SURVIVAL" in action_str:
                    counts["autoSurvivalSave"] = counts.get("autoSurvivalSave", 0) + 1
        except Exception:
            pass

    # Also check cadence_events.json if it exists
    if CADENCE_EVENTS.exists():
        try:
            events = json.loads(CADENCE_EVENTS.read_text(encoding="utf-8"))
            if isinstance(events, list):
                for ev in events:
                    fn_name = ev.get("function", ev.get("name", ""))
                    if fn_name:
                        counts[fn_name] = counts.get(fn_name, 0) + 1
        except Exception:
            pass

    return counts


def audit_hook_coverage(phase: str) -> dict:
    """Audit which expected hooks actually fired vs which were missing."""
    result = {"phase": phase, "expected": [], "fired": [], "missing": [], "extra": [], "coverage_pct": 0}

    if not MATRIX_FILE.exists():
        result["error"] = "HOOK_ACTIVATION_MATRIX.md not found"
        return result

    try:
        content = MATRIX_FILE.read_text(encoding="utf-8")
        expected_hooks = []
        optional_hooks = []

        for line in content.split("\n"):
            if not line.startswith("| "):
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 4 or parts[1].strip() in ["Phase", "---", ""]:
                continue

            row_phase = parts[1].strip().upper()
            matches = row_phase == phase.upper()
            if not matches and "-" in row_phase:
                try:
                    prefix = row_phase[0]
                    start = int(row_phase.split("-")[0][1:])
                    end = int(row_phase.split("-")[1][1:])
                    if phase[0].upper() == prefix and len(phase) >= 2:
                        num = int(phase[1:])
                        matches = start <= num <= end
                except (ValueError, IndexError):
                    pass

            if matches:
                expected_hooks = [h.strip() for h in parts[2].split(",") if h.strip()]
                optional_hooks = [h.strip() for h in parts[3].split(",") if h.strip()]
                break

        result["expected"] = expected_hooks

        # Get which hooks actually fired
        cadence_counts = count_cadence_fires()
        fired_set = set(cadence_counts.keys())

        for hook in expected_hooks:
            if hook in fired_set:
                result["fired"].append(hook)
            else:
                result["missing"].append(hook)

        # Extra hooks that fired but weren't expected or optional
        all_expected = set(expected_hooks + optional_hooks)
        infra = {"autoTodoRefresh", "autoCheckpoint", "autoContextPressure",
                 "autoCompactionDetect", "autoAttentionScore", "autoSurvivalSave",
                 "autoRecoveryManifest"}
        for fired in fired_set:
            if fired not in all_expected and fired not in infra:
                result["extra"].append(fired)

        if expected_hooks:
            result["coverage_pct"] = round(len(result["fired"]) / len(expected_hooks) * 100)

    except Exception as e:
        result["error"] = str(e)

    return result


def get_skill_usage_stats() -> dict:
    """Check skill injection stats from the session."""
    result = {"skills_injected": 0, "unique_skills": [], "total_available": 0}

    # Count total available skills
    if SKILL_INDEX.exists():
        try:
            index = json.loads(SKILL_INDEX.read_text(encoding="utf-8"))
            skills = index if isinstance(index, list) else index.get("skills", [])
            result["total_available"] = len(skills)
        except Exception:
            pass

    # Check session skill injection log
    skill_log = STATE_DIR / "skill_injections.json"
    if skill_log.exists():
        try:
            data = json.loads(skill_log.read_text(encoding="utf-8"))
            injections = data if isinstance(data, list) else data.get("injections", [])
            result["skills_injected"] = len(injections)
            result["unique_skills"] = list(set(
                inj.get("skill", inj.get("name", "unknown")) for inj in injections
            ))
        except Exception:
            pass

    return result


def count_tool_calls() -> int:
    """Count total tool calls from RECENT_ACTIONS."""
    if RECENT_ACTIONS.exists():
        try:
            data = json.loads(RECENT_ACTIONS.read_text(encoding="utf-8"))
            actions = data if isinstance(data, list) else data.get("actions", [])
            return len(actions)
        except Exception:
            pass
    return 0


def count_checkpoints() -> int:
    """Count checkpoints created this session."""
    if CHECKPOINT_DIR.exists():
        return len(list(CHECKPOINT_DIR.glob("CP-*")))
    return 0


def detect_phase() -> str:
    """Detect current phase from startup log or state."""
    if STARTUP_LOG.exists():
        try:
            data = json.loads(STARTUP_LOG.read_text(encoding="utf-8"))
            return data.get("phase", "DA")
        except Exception:
            pass
    # Fallback: read CURRENT_STATE
    cs_file = STATE_DIR / "CURRENT_STATE.json"
    if cs_file.exists():
        try:
            return json.loads(cs_file.read_text(encoding="utf-8")).get("phase", "DA")
        except Exception:
            pass
    return "DA"


def generate_quality_summary(duration: dict, cadence: dict, hook_audit: dict, skill_stats: dict, tool_calls: int) -> dict:
    """Generate session quality summary."""
    score = 100
    notes = []

    # Penalize short sessions with no work
    if duration["duration_minutes"] < 1 and tool_calls == 0:
        score -= 30
        notes.append("No productive work detected")

    # Hook coverage
    if hook_audit.get("coverage_pct", 0) < 50:
        score -= 20
        notes.append(f"Hook coverage low: {hook_audit.get('coverage_pct', 0)}%")
    elif hook_audit.get("coverage_pct", 0) < 80:
        score -= 10
        notes.append(f"Hook coverage moderate: {hook_audit.get('coverage_pct', 0)}%")

    # Cadence health
    total_fires = sum(cadence.values())
    if total_fires == 0:
        score -= 15
        notes.append("No cadence functions fired")

    # Skill utilization
    if skill_stats["skills_injected"] == 0 and skill_stats["total_available"] > 10:
        score -= 5
        notes.append("No skills injected despite availability")

    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F"

    return {"score": max(0, score), "grade": grade, "notes": notes}


def append_session_history(report: dict):
    """Append session summary to JSONL history file."""
    try:
        summary = {
            "timestamp": report["timing"]["end"],
            "phase": report["phase"],
            "duration_min": report["timing"]["duration_minutes"],
            "tool_calls": report["tool_calls"],
            "cadence_fires": report["cadence_total_fires"],
            "hook_coverage": report["hook_audit"]["coverage_pct"],
            "quality_score": report["quality"]["score"],
            "quality_grade": report["quality"]["grade"],
        }
        with open(SESSION_HISTORY, "a", encoding="utf-8") as f:
            f.write(json.dumps(summary) + "\n")
    except Exception:
        pass


def run(task_summary: str = None, output_json: bool = False):
    """Main execution."""
    start_time = time.time()

    phase = detect_phase()
    timing = get_session_duration()
    cadence = count_cadence_fires()
    hook_audit = audit_hook_coverage(phase)
    skill_stats = get_skill_usage_stats()
    tool_calls = count_tool_calls()
    checkpoints = count_checkpoints()
    quality = generate_quality_summary(timing, cadence, hook_audit, skill_stats, tool_calls)

    elapsed_ms = round((time.time() - start_time) * 1000)

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "phase": phase,
        "task_summary": task_summary or "Not specified",
        "elapsed_ms": elapsed_ms,
        "timing": timing,
        "tool_calls": tool_calls,
        "checkpoints": checkpoints,
        "cadence_fires": cadence,
        "cadence_total_fires": sum(cadence.values()),
        "hook_audit": hook_audit,
        "skill_stats": skill_stats,
        "quality": quality,
    }

    # Persist shutdown log
    try:
        SHUTDOWN_LOG.write_text(json.dumps(report, indent=2), encoding="utf-8")
    except Exception:
        pass

    # Append to session history
    append_session_history(report)

    if output_json:
        print(json.dumps(report, indent=2))
    else:
        print(f"=== PRISM Session Enhanced Shutdown ===")
        print(f"Phase: {phase}")
        print(f"Duration: {timing['duration_minutes']} minutes")
        print(f"Tool Calls: {tool_calls} | Checkpoints: {checkpoints}")
        print(f"Quality: {quality['score']}/100 (Grade: {quality['grade']})")
        print()
        print(f"Cadence Fires ({sum(cadence.values())} total):")
        for fn, count in sorted(cadence.items(), key=lambda x: -x[1]):
            print(f"  {fn}: {count}x")
        print()
        print(f"Hook Coverage: {hook_audit.get('coverage_pct', 0)}%")
        if hook_audit.get("missing"):
            print(f"  Missing: {', '.join(hook_audit['missing'])}")
        if hook_audit.get("extra"):
            print(f"  Extra: {', '.join(hook_audit['extra'])}")
        print()
        print(f"Skills: {skill_stats['skills_injected']} injected of {skill_stats['total_available']} available")
        if quality["notes"]:
            print(f"\nNotes:")
            for n in quality["notes"]:
                print(f"  [!] {n}")
        print(f"\nCompleted in {elapsed_ms}ms")

    return report


if __name__ == "__main__":
    summary_arg = None
    json_output = "--json" in sys.argv

    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--summary" and i + 1 < len(sys.argv):
            summary_arg = sys.argv[i + 1]

    run(task_summary=summary_arg, output_json=json_output)
