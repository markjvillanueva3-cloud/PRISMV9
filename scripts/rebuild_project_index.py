"""
PRISM Project Index Rebuilder v2.0
Regenerates PROJECT_INDEX.json from all source state files.

Usage:
    python rebuild_project_index.py           - Rebuild from source files
    python rebuild_project_index.py --check   - Verify index is up to date
    python rebuild_project_index.py --diff    - Show what would change

Sources read:
    CURRENT_STATE.json, MASTER_INVENTORY.json, SESSION_STATE.json,
    CLAUDE_MEMORY.json, SCRIPTS/extraction_index_*.json
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = PROJ_ROOT / "PROJECT_INDEX.json"


def load_json(path, fallback=None):
    """Load JSON file with fallback on missing/invalid."""
    if fallback is None:
        fallback = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"  WARN: {path.name}: {e}")
        return fallback


def scan_extraction_indexes():
    """Find all extraction index files and summarize them."""
    scripts_dir = PROJ_ROOT / "SCRIPTS"
    indexes = {}
    for idx_path in sorted(scripts_dir.glob("extraction_index_*.json")):
        data = load_json(idx_path)
        category = data.get("category", idx_path.stem.replace("extraction_index_", ""))
        modules = data.get("modules", {})
        statuses = [m.get("status", "UNKNOWN") for m in modules.values()]
        indexes[category] = {
            "file": f"SCRIPTS/{idx_path.name}",
            "moduleCount": len(modules),
            "status": "COMPLETE" if all(s == "EXTRACTED" for s in statuses) else "PARTIAL",
        }
    return indexes


def build_layers(state, inventory):
    """Build layers section from CURRENT_STATE v2.0 or MASTER_INVENTORY."""
    layers = {}
    # Prefer CURRENT_STATE.json layers (has status, milestones progress)
    state_layers = state.get("layers", {})
    inv_targets = inventory.get("layerTargets", {})

    if state_layers:
        # v2.0 format — use directly
        for key, layer in state_layers.items():
            layers[key] = {
                "name": layer.get("name", ""),
                "target": layer.get("target", 0),
                "existing": layer.get("existing", 0),
                "status": layer.get("status", "not_started"),
                "milestones": layer.get("milestones", 0),
                "milestonesComplete": layer.get("milestonesComplete", 0),
                "sessions": layer.get("sessions", ""),
                "details": layer.get("details", ""),
            }
    elif inv_targets:
        # Fallback to MASTER_INVENTORY layerTargets
        for key, target in inv_targets.items():
            if key in ("CC", "CC-EXT"):
                continue  # These are phases, not layers
            layers[key] = {
                "name": target.get("name", ""),
                "target": target.get("total", target.get("milestones", 0)),
                "existing": target.get("existing", 0),
                "status": "not_started",
                "milestones": target.get("milestones", 0),
                "milestonesComplete": 0,
                "sessions": "",
                "details": "",
            }

    return layers


def build_phases(state, inventory):
    """Build phases section from CURRENT_STATE v2.0 or MASTER_INVENTORY."""
    phases = {}
    state_phases = state.get("phases", {})
    inv_targets = inventory.get("layerTargets", {})

    if state_phases:
        for key, phase in state_phases.items():
            phases[key] = {
                "name": phase.get("name", ""),
                "milestones": phase.get("milestones", 0),
                "milestonesComplete": phase.get("milestonesComplete", 0),
                "status": phase.get("status", "not_started"),
                "sessions": phase.get("sessions", ""),
            }
    else:
        # Fallback: extract CC/CC-EXT from inventory layerTargets
        for key in ("CC", "CC-EXT"):
            if key in inv_targets:
                phases[key] = {
                    "name": inv_targets[key].get("name", ""),
                    "milestones": inv_targets[key].get("milestones", 0),
                    "milestonesComplete": 0,
                    "status": "not_started",
                    "sessions": "",
                }

    return phases


def build_verified(state, inventory):
    """Build verified counts from CURRENT_STATE or MASTER_INVENTORY."""
    # Prefer CURRENT_STATE.verified (concise)
    verified = state.get("verified", {})
    if verified:
        return dict(verified)

    # Fallback to MASTER_INVENTORY.verifiedBaseline
    baseline = inventory.get("verifiedBaseline", {})
    if baseline:
        result = {}
        for key, val in baseline.items():
            if key in ("frozenAt", "verifiedDate"):
                continue
            if isinstance(val, dict):
                # e.g. formulas: {registered: 109, target: 509}
                result[key] = val.get("registered", val)
                result[f"{key}Target"] = val.get("target", val)
            elif key == "tests":
                # "152/152" -> testsPassing: 152, testsTotal: 152
                parts = str(val).split("/")
                result["testsPassing"] = int(parts[0])
                result["testsTotal"] = int(parts[1]) if len(parts) > 1 else int(parts[0])
            else:
                result[key] = val
        return result

    return {}


def build_index():
    """Build the unified PROJECT_INDEX.json from all sources."""
    state = load_json(PROJ_ROOT / "CURRENT_STATE.json")
    inventory = load_json(PROJ_ROOT / "MASTER_INVENTORY.json")
    session = load_json(PROJ_ROOT / "SESSION_STATE.json")
    memory = load_json(PROJ_ROOT / "CLAUDE_MEMORY.json")

    now = datetime.now(timezone.utc).isoformat()
    state_version = state.get("version", "1.0.0")

    # --- Layers & Phases (v2.0) ---
    layers = build_layers(state, inventory)
    phases = build_phases(state, inventory)
    verified = build_verified(state, inventory)

    # --- Extraction indexes ---
    indexes = scan_extraction_indexes()

    # --- Completed extractions ---
    completed = list(state.get("completedExtractions", []))
    # Also check MASTER_INVENTORY for enhanced machines
    machines_enhanced = inventory.get("extractedData", {}).get("machines", {}).get("enhanced", {})
    if not machines_enhanced:
        machines_enhanced = inventory.get("extracted", {}).get("machines", {}).get("enhanced", {})
    if machines_enhanced.get("count", 0) > 0:
        has_enhanced = any(c.get("category") == "machines/ENHANCED" for c in completed)
        if not has_enhanced:
            completed.insert(0, {
                "category": "machines/ENHANCED",
                "count": machines_enhanced["count"],
                "manufacturers": machines_enhanced.get("manufacturers", []),
                "location": machines_enhanced.get("location", "EXTRACTED/machines/ENHANCED/"),
            })

    # --- Session info ---
    session_id = session.get("currentSession") or state.get("currentSession", "")
    session_name = session.get("sessionName", "")
    session_status = session.get("status", "UNKNOWN")
    next_action = session.get("nextAction", "")
    next_milestone = state.get("nextMilestone", inventory.get("nextMilestone", {}))

    # Phase progress from SESSION_STATE
    phase_progress = session.get("extractionProgress", {})

    # Session history
    history = list(session.get("completedSessions", []))
    session_archives = state.get("sessionArchives", inventory.get("sessionArchives", []))
    if session_id:
        current_entry = f"{session_id} \u2014 {session_name} (CURRENT)"
        if not any("CURRENT" in h for h in history):
            history.append(current_entry)

    # --- Project info from CLAUDE_MEMORY ---
    tech_stack = memory.get("tech_stack", {})
    components = memory.get("product_components", [])
    rules = memory.get("critical_rules", [])
    project_info = memory.get("prism_project", {})
    products = inventory.get("products", [])

    # --- Extracted data summary ---
    extracted_data = inventory.get("extractedData", {})
    extraction_summary = {}
    if extracted_data:
        extraction_summary = {
            "totalFiles": extracted_data.get("totalFiles", 0),
            "totalSize": extracted_data.get("totalSize", ""),
        }

    # --- Source version ---
    source_version = (
        state.get("prism", {}).get("sourceVersion")
        or inventory.get("sourceMonolith", {}).get("version", "").lstrip("v")
        or "8.89.002"
    )
    monolith_lines = (
        state.get("prism", {}).get("monolithLines")
        or inventory.get("sourceMonolith", {}).get("lines")
        or state.get("monolithLines")
        or 986621
    )

    # --- File index ---
    file_index = {
        "stateTracking": [],
        "extractionTools": [],
        "sessionTools": [],
        "cicd": [],
        "dashboard": [],
        "templates": [],
    }

    state_files = [
        ("CURRENT_STATE.json", "Layer architecture, verified counts, milestones"),
        ("MASTER_INVENTORY.json", "Full inventory with layer targets and session archives"),
        ("SESSION_STATE.json", "Current session details and clarifications"),
        ("PROJECT_INDEX.json", "Unified index (this file) \u2014 read this first"),
    ]
    for f, p in state_files:
        if (PROJ_ROOT / f).exists() or f == "PROJECT_INDEX.json":
            file_index["stateTracking"].append({"file": f, "purpose": p})

    extraction_tools = [
        ("SCRIPTS/extract_module.py", "Extract line ranges from monolith into modules"),
        ("SCRIPTS/generate_extraction_index.py", "Scan monolith for module boundaries"),
        ("SCRIPTS/validate_extractions.py", "Validate extracted modules against indexes"),
        ("SCRIPTS/verify_features.py", "Verify 85+ UI features exist in build"),
        ("SCRIPTS/rebuild_project_index.py", "Regenerate PROJECT_INDEX.json from sources"),
    ]
    for f, p in extraction_tools:
        if (PROJ_ROOT / f).exists():
            file_index["extractionTools"].append({"file": f, "purpose": p})

    session_tools = [
        ("SCRIPTS/update_state.py", "Quick state updates (complete, next, stats, blocker)"),
        ("SCRIPTS/session_manager.py", "Full session lifecycle management"),
        ("SCRIPTS/context_generator.py", "Generate minimal context for Claude sessions"),
    ]
    for f, p in session_tools:
        if (PROJ_ROOT / f).exists():
            file_index["sessionTools"].append({"file": f, "purpose": p})

    ci_files = [
        (".github/workflows/ci.yml", "CI: lint, validate JSON, run tests"),
        (".github/workflows/deploy.yml", "Deploy dashboard to GitHub Pages"),
        (".github/workflows/auto-index.yml", "Auto-regenerate indexes on extraction changes"),
    ]
    for f, p in ci_files:
        if (PROJ_ROOT / f).exists():
            file_index["cicd"].append({"file": f, "purpose": p})

    if (PROJ_ROOT / "docs" / "index.html").exists():
        file_index["dashboard"].append({"file": "docs/index.html", "purpose": "GitHub Pages status dashboard"})

    templates = [
        ("SCRIPTS/MODULE_TEMPLATE.js", "Template for extracted modules"),
        ("SCRIPTS/session_handoff_template.json", "Template for session handoff docs"),
    ]
    for f, p in templates:
        if (PROJ_ROOT / f).exists():
            file_index["templates"].append({"file": f, "purpose": p})

    # --- Codebase map ---
    codebase_map = {}
    dir_purposes = {
        "_BUILD": "Monolith source (zipped HTML)",
        "EXTRACTED": "Extracted module files organized by category",
        "SCRIPTS": "Python tools for extraction, validation, state management",
        "docs": "GitHub Pages dashboard",
        "tests": "Automated test suite",
        ".github": "CI/CD pipelines and Dependabot config",
        ".claude-flow": "Claude Flow daemon state and metrics",
        ".claude": "Claude settings, hooks, helpers, skills",
    }
    for d, purpose in dir_purposes.items():
        path = PROJ_ROOT / d
        if path.exists() and path.is_dir():
            codebase_map[f"{d}/"] = purpose

    # --- Assemble final index ---
    index = {
        "_meta": {
            "description": "Unified PRISM project index \u2014 single-read bootstrap for AI agents",
            "version": "2.0.0",
            "stateVersion": state_version,
            "generatedAt": now,
            "generatedBy": "rebuild_project_index.py",
            "sources": [
                "CURRENT_STATE.json",
                "MASTER_INVENTORY.json",
                "SESSION_STATE.json",
                "CLAUDE_MEMORY.json",
                "SCRIPTS/extraction_index_*.json",
            ],
        },
        "project": {
            "name": project_info.get("name", inventory.get("project", "PRISM Manufacturing Intelligence")),
            "targetVersion": "9.0.0",
            "sourceVersion": source_version,
            "monolithLines": monolith_lines,
            "extractedFiles": extraction_summary.get("totalFiles", state.get("prism", {}).get("extractedFiles", 1775)),
            "owner": project_info.get("owner", "Mark Villanueva"),
            "github": project_info.get("github", "markjvillanueva3-cloud/PRISMV9"),
            "techStack": tech_stack,
            "components": components,
            "products": products,
        },
        "layers": layers,
        "phases": phases,
        "verified": verified,
        "session": {
            "currentId": session_id,
            "name": session_name,
            "status": session_status,
            "nextAction": next_action,
            "nextMilestone": next_milestone,
            "sessionArchives": session_archives,
        },
        "extraction": {
            "completedExtractions": completed,
            "phaseProgress": phase_progress,
            "indexes": indexes,
        },
        "paths": {
            "monolith": inventory.get("sourceMonolith", {}).get("location", "_BUILD/"),
            "extracted": "EXTRACTED/",
            "scripts": "SCRIPTS/",
            "dashboard": "docs/index.html",
            "stateFiles": {
                "currentState": "CURRENT_STATE.json",
                "masterInventory": "MASTER_INVENTORY.json",
                "sessionState": "SESSION_STATE.json",
                "projectIndex": "PROJECT_INDEX.json",
            },
        },
        "fileIndex": file_index,
        "codebaseMap": codebase_map,
        "rules": rules,
        "sessionHistory": history,
    }

    # Preserve manually-added sections (milestones, etc.) from existing index
    if OUTPUT_FILE.exists():
        existing = load_json(OUTPUT_FILE)
        for key in ("milestones",):
            if key in existing and key not in index:
                index[key] = existing[key]

    return index


def main():
    check_mode = "--check" in sys.argv
    diff_mode = "--diff" in sys.argv

    print("PRISM Project Index Rebuilder v2.0")
    print("=" * 40)

    new_index = build_index()

    if check_mode:
        if OUTPUT_FILE.exists():
            old_index = load_json(OUTPUT_FILE)
            old_meta = old_index.get("_meta", {})
            print(f"Current index generated: {old_meta.get('generatedAt', 'UNKNOWN')}")
            # Compare layers + verified (the key data sections)
            old_layers = old_index.get("layers", {})
            new_layers = new_index.get("layers", {})
            old_verified = old_index.get("verified", {})
            new_verified = new_index.get("verified", {})
            if old_layers == new_layers and old_verified == new_verified:
                print("Index is UP TO DATE.")
            else:
                print("Index is STALE \u2014 run without --check to rebuild.")
                sys.exit(1)
        else:
            print("PROJECT_INDEX.json does not exist \u2014 run without --check to create.")
            sys.exit(1)
        return

    if diff_mode:
        if OUTPUT_FILE.exists():
            old_index = load_json(OUTPUT_FILE)
            old_str = json.dumps(old_index, indent=2, sort_keys=True)
            new_str = json.dumps(new_index, indent=2, sort_keys=True)
            if old_str == new_str:
                print("No changes detected.")
            else:
                print("Changes detected in PROJECT_INDEX.json:")
                old_lines = old_str.splitlines()
                new_lines = new_str.splitlines()
                for i, (o, n) in enumerate(zip(old_lines, new_lines)):
                    if o != n:
                        print(f"  Line {i+1}:")
                        print(f"    - {o.strip()}")
                        print(f"    + {n.strip()}")
                if len(old_lines) != len(new_lines):
                    print(f"  Line count: {len(old_lines)} -> {len(new_lines)}")
        else:
            print("PROJECT_INDEX.json does not exist \u2014 all content is new.")
        return

    # Write the index
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(new_index, f, indent=2)

    print(f"Written: {OUTPUT_FILE}")
    print(f"Generated at: {new_index['_meta']['generatedAt']}")

    # Summary
    layers = new_index.get("layers", {})
    total_target = sum(l.get("target", 0) for l in layers.values())
    total_existing = sum(l.get("existing", 0) for l in layers.values())
    total_milestones = sum(l.get("milestones", 0) for l in layers.values())
    total_ms_complete = sum(l.get("milestonesComplete", 0) for l in layers.values())
    print(f"Layers: {len(layers)} (L0-L{len(layers)-1})")
    print(f"Modules: {total_existing}/{total_target} existing ({total_existing/max(total_target,1)*100:.0f}%)")
    print(f"Milestones: {total_ms_complete}/{total_milestones}")
    verified = new_index.get("verified", {})
    if verified:
        print(f"Verified: {verified.get('dispatchers', 0)} dispatchers, {verified.get('engines', 0)} engines, "
              f"{verified.get('formulas', 0)}/{verified.get('formulasTarget', 0)} formulas, "
              f"{verified.get('testsPassing', 0)}/{verified.get('testsTotal', 0)} tests")
    print(f"Indexes: {len(new_index['extraction']['indexes'])} category indexes found")
    session = new_index.get("session", {})
    print(f"Session: {session.get('currentId', 'N/A')} \u2014 {session.get('status', 'UNKNOWN')}")
    nm = session.get("nextMilestone", {})
    if nm:
        print(f"Next milestone: {nm.get('id', '')} \u2014 {nm.get('name', '')}")


if __name__ == "__main__":
    main()
