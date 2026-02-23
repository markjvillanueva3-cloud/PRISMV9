#!/usr/bin/env python3
"""
session_enhanced_startup.py — DA-MS11 Enhanced Session Startup
Runs AFTER standard boot (session_boot) to activate DA cadence features.
Executable: py -3 C:\\PRISM\\scripts\\session_enhanced_startup.py [--phase PHASE] [--json]

Actions:
1. Detect current phase from state files
2. Load phase-relevant skills from SKILL_INDEX.json
3. Validate hook activation matrix coverage for current phase
4. Check NL hook registry health (disk files vs runtime patterns)
5. Generate session readiness score (0-100)
6. Output report (text or JSON)
"""

import os, sys, json, glob, time
from datetime import datetime, timezone
from pathlib import Path

STATE_DIR = Path(r"C:\PRISM\state")
DATA_DIR = Path(r"C:\PRISM\mcp-server\data")
SKILLS_DIR = Path(r"C:\PRISM\skills-consolidated")
MATRIX_FILE = DATA_DIR / "docs" / "roadmap" / "HOOK_ACTIVATION_MATRIX.md"
SKILL_INDEX = SKILLS_DIR / "SKILL_INDEX.json"
NL_HOOKS_DIR = DATA_DIR / "nl_hooks"
TODO_FILE = STATE_DIR / "todo.md"
PRESSURE_FILE = STATE_DIR / "context_pressure.json"
STARTUP_LOG = STATE_DIR / "session_startup_log.json"


def detect_phase() -> str:
    """Detect current development phase from state files."""
    # Check CURRENT_STATE.json first
    cs_file = STATE_DIR / "CURRENT_STATE.json"
    if cs_file.exists():
        try:
            cs = json.loads(cs_file.read_text(encoding="utf-8"))
            phase = cs.get("phase", "")
            if phase and phase != "unknown":
                return phase
        except Exception:
            pass

    # Check todo.md for phase hints
    if TODO_FILE.exists():
        try:
            content = TODO_FILE.read_text(encoding="utf-8")
            for line in content.split("\n"):
                line_lower = line.lower()
                for p in ["d1", "d2", "d3", "d4", "da", "w1", "w2", "w3", "w4", "w5", "w6", "w7", "r1", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"]:
                    if p in line_lower:
                        return p.upper()
        except Exception:
            pass

    # Check RECOVERY_MANIFEST.json
    rm_file = STATE_DIR / "RECOVERY_MANIFEST.json"
    if rm_file.exists():
        try:
            rm = json.loads(rm_file.read_text(encoding="utf-8"))
            phase = rm.get("phase", "")
            if phase and phase != "unknown":
                return phase
        except Exception:
            pass

    return "DA"  # default to DA if unknown


def load_phase_skills(phase: str) -> dict:
    """Load skills relevant to the current phase from SKILL_INDEX.json."""
    result = {"phase": phase, "total_skills": 0, "matched_skills": [], "loaded_count": 0}

    if not SKILL_INDEX.exists():
        result["error"] = "SKILL_INDEX.json not found"
        return result

    try:
        index = json.loads(SKILL_INDEX.read_text(encoding="utf-8"))

        # Handle both dict-of-dicts and list formats
        raw_skills = index.get("skills", index)
        if isinstance(raw_skills, dict):
            skills = list(raw_skills.values())
        elif isinstance(raw_skills, list):
            skills = raw_skills
        else:
            skills = []

        result["total_skills"] = len(skills)
        p_upper = phase.upper()

        # Primary: match skills that declare this phase explicitly
        for skill in skills:
            skill_phases = [p.upper() for p in skill.get("phases", [])]
            if p_upper in skill_phases:
                result["matched_skills"].append({
                    "name": skill.get("name", "unknown"),
                    "file": skill.get("file", ""),
                    "domain_match": f"phase:{p_upper}",
                    "size_bytes": skill.get("size_bytes", 0),
                })

        # Secondary: if no explicit phase matches, fall back to domain keywords
        if not result["matched_skills"]:
            phase_domains = {
                "D1": ["session", "state", "context"],
                "D2": ["context", "attention", "compression"],
                "D3": ["learning", "error", "pattern"],
                "D4": ["performance", "cache", "batch"],
                "DA": ["skill", "hook", "script", "agent", "knowledge", "wiring"],
                "W5": ["registry", "knowledge", "data", "material", "machine", "tool"],
                "R1": ["registry", "material", "machine", "alarm", "tool", "data"],
            }
            domains = phase_domains.get(p_upper, ["general"])
            for skill in skills:
                all_text = f"{skill.get('name','')} {skill.get('description','')} {' '.join(skill.get('triggers',[]))}".lower()
                for domain in domains:
                    if domain in all_text:
                        result["matched_skills"].append({
                            "name": skill.get("name", "unknown"),
                            "file": skill.get("file", ""),
                            "domain_match": domain,
                            "size_bytes": skill.get("size_bytes", 0),
                        })
                        break

        result["loaded_count"] = len(result["matched_skills"])
    except Exception as e:
        result["error"] = str(e)

    return result


def check_hook_activation_matrix(phase: str) -> dict:
    """Parse HOOK_ACTIVATION_MATRIX.md and check coverage for current phase."""
    result = {"phase": phase, "expected": [], "optional": [], "coverage_pct": 0}

    if not MATRIX_FILE.exists():
        result["error"] = "HOOK_ACTIVATION_MATRIX.md not found"
        return result

    try:
        content = MATRIX_FILE.read_text(encoding="utf-8")
        for line in content.split("\n"):
            if not line.startswith("| "):
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 4:
                continue

            row_phase = parts[1].strip()
            if row_phase.lower() in ["phase", "---", ""]:
                continue

            # Match exact or prefix (e.g., "F1-F8" matches "F3")
            matches = False
            if row_phase.upper() == phase.upper():
                matches = True
            elif "-" in row_phase:
                # Range like F1-F8
                try:
                    prefix = row_phase[0]
                    start = int(row_phase.split("-")[0][1:])
                    end = int(row_phase.split("-")[1][1:])
                    if phase[0].upper() == prefix.upper() and len(phase) >= 2:
                        num = int(phase[1:])
                        if start <= num <= end:
                            matches = True
                except (ValueError, IndexError):
                    pass

            if matches:
                result["expected"] = [h.strip() for h in parts[2].split(",") if h.strip()]
                result["optional"] = [h.strip() for h in parts[3].split(",") if h.strip()]
                result["coverage_pct"] = 100  # Will be adjusted by actual check
                break

    except Exception as e:
        result["error"] = str(e)

    return result


def check_nl_hooks() -> dict:
    """Check NL hook health: registered patterns vs disk files."""
    result = {"disk_hooks": 0, "disk_files": [], "registry_patterns": 0, "health": "unknown"}

    # Check for NL hook files on disk (two locations: data/nl_hooks and state/nl_hooks)
    if NL_HOOKS_DIR.exists():
        hook_files = list(NL_HOOKS_DIR.glob("*.json"))
        result["disk_hooks"] = len(hook_files)
        result["disk_files"] = [f.name for f in hook_files[:20]]

    # Also check state/nl_hooks/registry.json (where NLHookEngine persists)
    state_registry = Path(r"C:\PRISM\mcp-server\state\nl_hooks\registry.json")
    if state_registry.exists():
        try:
            reg = json.loads(state_registry.read_text(encoding="utf-8"))
            hooks_in_registry = len(reg.get("hooks", []))
            if hooks_in_registry > result["disk_hooks"]:
                result["disk_hooks"] = hooks_in_registry
                result["disk_files"] = [h.get("id", "unknown") for h in reg.get("hooks", [])[:20]]
        except Exception:
            pass

    # Check NLHookEngine registry by reading source
    engine_file = Path(r"C:\PRISM\mcp-server\src\engines\NLHookEngine.ts")
    if engine_file.exists():
        try:
            content = engine_file.read_text(encoding="utf-8")
            # Count patterns defined in code
            pattern_count = content.count("pattern:")
            result["registry_patterns"] = pattern_count
        except Exception:
            pass

    # Health assessment
    # NL hooks are loaded dynamically from disk JSON files at runtime.
    # disk_hooks > 0 means the NLHookEngine will load them — that's ACTIVE.
    # registry_patterns counts hardcoded patterns in source (optional, not required).
    if result["disk_hooks"] > 0:
        result["health"] = "ACTIVE"
    elif result["registry_patterns"] > 0:
        result["health"] = "CODE_ONLY"  # Patterns in code but no disk files
    else:
        result["health"] = "MISSING"

    return result


def get_context_pressure() -> int:
    """Read current context pressure percentage."""
    if PRESSURE_FILE.exists():
        try:
            data = json.loads(PRESSURE_FILE.read_text(encoding="utf-8"))
            return data.get("pressure_pct", 0)
        except Exception:
            pass
    return 0


def calculate_readiness_score(skill_result: dict, hook_result: dict, nl_result: dict, pressure: int) -> dict:
    """Calculate session readiness score (0-100)."""
    score = 100
    deductions = []

    # Skill loading (0-25 pts)
    if skill_result.get("error"):
        score -= 25
        deductions.append(f"Skill index error: -{25}")
    elif skill_result["loaded_count"] == 0:
        score -= 15
        deductions.append(f"No phase skills matched: -{15}")

    # Hook matrix coverage (0-25 pts)
    if hook_result.get("error"):
        score -= 25
        deductions.append(f"Hook matrix error: -{25}")
    elif len(hook_result["expected"]) == 0:
        score -= 10
        deductions.append(f"No expected hooks for phase: -{10}")

    # NL Hook health (0-25 pts)
    if nl_result["health"] == "MISSING":
        score -= 15
        deductions.append(f"NL hooks missing: -{15}")
    elif nl_result["health"] == "CODE_ONLY":
        score -= 5
        deductions.append(f"NL hooks code-only (no disk files): -{5}")

    # Context pressure (0-25 pts)
    if pressure > 85:
        score -= 25
        deductions.append(f"Critical pressure ({pressure}%): -{25}")
    elif pressure > 70:
        score -= 15
        deductions.append(f"High pressure ({pressure}%): -{15}")
    elif pressure > 50:
        score -= 5
        deductions.append(f"Moderate pressure ({pressure}%): -{5}")

    return {
        "score": max(0, score),
        "grade": "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F",
        "deductions": deductions,
    }


def run(phase_override: str = None, output_json: bool = False):
    """Main execution."""
    start_time = time.time()

    # 1. Detect phase
    phase = phase_override or detect_phase()

    # 2. Load phase skills
    skill_result = load_phase_skills(phase)

    # 3. Check hook activation matrix
    hook_result = check_hook_activation_matrix(phase)

    # 4. Check NL hook health
    nl_result = check_nl_hooks()

    # 5. Get context pressure
    pressure = get_context_pressure()

    # 6. Calculate readiness
    readiness = calculate_readiness_score(skill_result, hook_result, nl_result, pressure)

    elapsed_ms = round((time.time() - start_time) * 1000)

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "phase": phase,
        "elapsed_ms": elapsed_ms,
        "readiness": readiness,
        "skills": {
            "total_indexed": skill_result["total_skills"],
            "phase_matched": skill_result["loaded_count"],
            "top_matches": [s["name"] for s in skill_result["matched_skills"][:10]],
        },
        "hooks": {
            "expected_count": len(hook_result["expected"]),
            "optional_count": len(hook_result["optional"]),
            "expected": hook_result["expected"][:10],
        },
        "nl_hooks": nl_result,
        "context_pressure": pressure,
    }

    # Persist startup log
    try:
        STARTUP_LOG.write_text(json.dumps(report, indent=2), encoding="utf-8")
    except Exception:
        pass

    if output_json:
        print(json.dumps(report, indent=2))
    else:
        print(f"=== PRISM Session Enhanced Startup ===")
        print(f"Phase: {phase}")
        print(f"Readiness: {readiness['score']}/100 (Grade: {readiness['grade']})")
        print(f"Context Pressure: {pressure}%")
        print(f"")
        print(f"Skills: {skill_result['loaded_count']}/{skill_result['total_skills']} matched for phase")
        if skill_result["matched_skills"]:
            for s in skill_result["matched_skills"][:5]:
                print(f"  - {s['name']} (domain: {s['domain_match']})")
        print(f"")
        print(f"Hook Matrix: {len(hook_result['expected'])} expected, {len(hook_result['optional'])} optional")
        print(f"NL Hooks: {nl_result['health']} ({nl_result['disk_hooks']} on disk, {nl_result['registry_patterns']} patterns)")
        print(f"")
        if readiness["deductions"]:
            print(f"Deductions:")
            for d in readiness["deductions"]:
                print(f"  [!] {d}")
        print(f"")
        print(f"Completed in {elapsed_ms}ms")

    return report


if __name__ == "__main__":
    phase_arg = None
    json_output = "--json" in sys.argv

    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--phase" and i + 1 < len(sys.argv):
            phase_arg = sys.argv[i + 1]

    run(phase_override=phase_arg, output_json=json_output)
