"""
PRISM Project Index Rebuilder v1.0
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
import os
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


def scan_extracted_files():
    """Count extracted files by category."""
    extracted_dir = PROJ_ROOT / "EXTRACTED"
    counts = {}
    if extracted_dir.exists():
        for category_dir in sorted(extracted_dir.iterdir()):
            if category_dir.is_dir():
                js_files = list(category_dir.rglob("*.js"))
                if js_files:
                    counts[category_dir.name] = len(js_files)
    return counts


def build_index():
    """Build the unified PROJECT_INDEX.json from all sources."""
    state = load_json(PROJ_ROOT / "CURRENT_STATE.json")
    inventory = load_json(PROJ_ROOT / "MASTER_INVENTORY.json")
    session = load_json(PROJ_ROOT / "SESSION_STATE.json")
    memory = load_json(PROJ_ROOT / "CLAUDE_MEMORY.json")

    now = datetime.now(timezone.utc).isoformat()

    # Merge extraction progress — prefer CURRENT_STATE counts, add extras from inventory
    progress = {}
    state_progress = state.get("extraction", {}).get("progress", {})
    targets = inventory.get("moduleTargets", {})

    for key in targets:
        if key == "total":
            continue  # Skip the aggregate total — we compute it
        if key in state_progress:
            progress[key] = state_progress[key]
        else:
            progress[key] = {"total": targets[key], "extracted": 0, "verified": 0}

    # Detect manufacturer extractions from inventory
    machines_enhanced = inventory.get("extracted", {}).get("machines", {}).get("enhanced", {})
    if machines_enhanced.get("count", 0) > 0:
        progress["manufacturers"] = {
            "total": targets.get("manufacturers", 44),
            "extracted": machines_enhanced["count"],
            "verified": machines_enhanced["count"],
        }

    # Scan for extraction indexes
    indexes = scan_extraction_indexes()

    # Build completed extractions list
    completed = list(state.get("completedExtractions", []))
    if machines_enhanced.get("count", 0) > 0:
        has_enhanced = any(c.get("category") == "machines/ENHANCED" for c in completed)
        if not has_enhanced:
            completed.insert(0, {
                "category": "machines/ENHANCED",
                "count": machines_enhanced["count"],
                "manufacturers": machines_enhanced.get("manufacturers", []),
                "location": machines_enhanced.get("location", "EXTRACTED/machines/ENHANCED/"),
            })

    # Session info — prefer SESSION_STATE (more recent)
    session_id = session.get("currentSession") or state.get("currentSession")
    session_name = session.get("sessionName", "")
    session_status = session.get("status", "UNKNOWN")
    next_action = session.get("nextAction", "")

    # Phase progress from SESSION_STATE
    phase_progress = session.get("extractionProgress", {})

    # Build session history
    history = session.get("completedSessions", [])
    if session_id:
        current_entry = f"{session_id} — {session_name} (CURRENT)"
        if not any("CURRENT" in h for h in history):
            history.append(current_entry)

    # Tech stack and components from CLAUDE_MEMORY
    tech_stack = memory.get("tech_stack", {})
    components = memory.get("product_components", [])
    rules = memory.get("critical_rules", [])
    project_info = memory.get("prism_project", {})

    # File index — enumerate key files
    file_index = {
        "stateTracking": [],
        "extractionTools": [],
        "sessionTools": [],
        "cicd": [],
        "dashboard": [],
        "templates": [],
    }

    state_files = [
        ("CURRENT_STATE.json", "Extraction progress counters"),
        ("MASTER_INVENTORY.json", "Full inventory with module targets and session archives"),
        ("SESSION_STATE.json", "Current session details and clarifications"),
        ("PROJECT_INDEX.json", "Unified index (this file) — read this first"),
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

    # Codebase map — scan top-level dirs
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

    # Assemble final index
    index = {
        "_meta": {
            "description": "Unified PRISM project index — single-read bootstrap for AI agents",
            "version": "1.0.0",
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
            "sourceVersion": state.get("prism", {}).get("sourceVersion", "8.89.002"),
            "monolithLines": inventory.get("sourceMonolith", {}).get("lines", state.get("prism", {}).get("monolithLines", 0)),
            "totalModules": targets.get("total", 831),
            "owner": project_info.get("owner", "Mark Villanueva"),
            "github": project_info.get("github", "markjvillanueva3-cloud/PRISMV9"),
            "techStack": tech_stack,
            "components": components,
        },
        "session": {
            "currentId": session_id,
            "name": session_name,
            "status": session_status,
            "stage": state.get("extraction", {}).get("stage", "1"),
            "phase": state.get("extraction", {}).get("phase", "A"),
            "nextAction": next_action,
            "nextSession": inventory.get("nextSession", {}),
        },
        "extraction": {
            "progress": progress,
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

    print("PRISM Project Index Rebuilder")
    print("=" * 40)

    new_index = build_index()

    if check_mode:
        if OUTPUT_FILE.exists():
            old_index = load_json(OUTPUT_FILE)
            old_meta = old_index.get("_meta", {})
            print(f"Current index generated: {old_meta.get('generatedAt', 'UNKNOWN')}")
            # Compare key fields
            old_progress = old_index.get("extraction", {}).get("progress", {})
            new_progress = new_index.get("extraction", {}).get("progress", {})
            if old_progress == new_progress:
                print("Index is UP TO DATE.")
            else:
                print("Index is STALE — run without --check to rebuild.")
                sys.exit(1)
        else:
            print("PROJECT_INDEX.json does not exist — run without --check to create.")
            sys.exit(1)
        return

    if diff_mode:
        if OUTPUT_FILE.exists():
            old_index = load_json(OUTPUT_FILE)
            # Simple diff: compare serialized forms
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
            print("PROJECT_INDEX.json does not exist — all content is new.")
        return

    # Write the index
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(new_index, f, indent=2)

    print(f"Written: {OUTPUT_FILE}")
    print(f"Generated at: {new_index['_meta']['generatedAt']}")

    # Summary
    progress = new_index["extraction"]["progress"]
    total_extracted = sum(p.get("extracted", 0) for p in progress.values())
    total_modules = sum(p.get("total", 0) for p in progress.values())
    print(f"Extraction: {total_extracted}/{total_modules} modules ({total_extracted/max(total_modules,1)*100:.1f}%)")
    print(f"Indexes: {len(new_index['extraction']['indexes'])} category indexes found")
    print(f"Session: {new_index['session']['currentId']} — {new_index['session']['status']}")


if __name__ == "__main__":
    main()
