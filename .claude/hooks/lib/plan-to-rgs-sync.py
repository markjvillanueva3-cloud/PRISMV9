#!/usr/bin/env python3
"""
plan-to-rgs-sync.py — Automatically register new plans into RGS + Task Queue

Usage:
  python plan-to-rgs-sync.py <plan_file.md> <track_id> [--title "Title"]

What it does:
  1. Parses the plan markdown for sessions/units
  2. Creates milestone envelope JSON in mcp-server/data/milestones/<TRACK>-MS0.json
  3. Registers in roadmap-registry.json
  4. Adds entry to roadmap-index.json
  5. Appends tasks to TASK_QUEUE.md

Can also be called as a hook after plan approval.
"""

import json
import sys
import os
import re
from datetime import datetime, timezone

PRISM_ROOT = os.environ.get("PRISM_ROOT", "H:/prism")
DATA_DIR = os.path.join(PRISM_ROOT, "mcp-server/data")
MILESTONES_DIR = os.path.join(DATA_DIR, "milestones")
REGISTRY_PATH = os.path.join(DATA_DIR, "roadmap-registry.json")
INDEX_PATH = os.path.join(DATA_DIR, "roadmap-index.json")
TASK_QUEUE_PATH = os.path.join(PRISM_ROOT, "state/shared/TASK_QUEUE.md")


def parse_plan(plan_path):
    """Extract title, sessions, and units from a plan markdown file."""
    with open(plan_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract title from first heading
    title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else os.path.basename(plan_path)

    # Extract context/brief from first paragraph after ## Context
    brief_match = re.search(r"##\s*Context\s*\n+(.+?)(?:\n\n|\n##)", content, re.DOTALL)
    brief = brief_match.group(1).strip()[:300] if brief_match else title

    # Count sessions and units from tables
    session_rows = re.findall(r"\|\s*\d+-?\d*\s*\|", content)
    unit_ids = re.findall(r"U-[A-Z]+\d+", content)
    unique_units = list(dict.fromkeys(unit_ids))  # preserve order, dedupe

    # Extract session table rows for phase creation
    table_match = re.findall(
        r"\|\s*(\d+-?\d*)\s*\|\s*(.+?)\s*\|\s*(U-[^|]+)\s*\|\s*(.+?)\s*\|",
        content,
    )

    phases = []
    for row in table_match:
        session_id, session_title, units_str, deliverables = row
        unit_list = [u.strip() for u in re.findall(r"U-[A-Z]+\d+", units_str)]
        phases.append({
            "session": session_id.strip(),
            "title": session_title.strip(),
            "units": unit_list,
            "deliverables": deliverables.strip(),
        })

    return {
        "title": title,
        "brief": brief,
        "total_sessions": str(len(phases)) if phases else "1",
        "total_units": len(unique_units),
        "phases": phases,
        "units": unique_units,
    }


def create_envelope(track_id, plan_info, plan_path):
    """Create milestone envelope JSON."""
    ms_id = f"{track_id}-MS0"
    now = datetime.now(timezone.utc).isoformat()

    envelope = {
        "id": ms_id,
        "version": "1.0.0",
        "title": plan_info["title"],
        "brief": plan_info["brief"],
        "created_at": now,
        "created_by": "plan-to-rgs-sync",
        "track": track_id,
        "track_name": plan_info["title"],
        "status": "not_started",
        "total_units": plan_info["total_units"],
        "total_sessions": plan_info["total_sessions"],
        "plan_file": os.path.abspath(plan_path).replace("\\", "/"),
        "phases": [],
    }

    for i, phase in enumerate(plan_info["phases"]):
        phase_id = f"{track_id}-P{i + 1}"
        units = []
        for j, uid in enumerate(phase["units"]):
            units.append({
                "id": uid,
                "title": f"{phase['title']} — {uid}",
                "phase": phase_id,
                "sequence": j + 1,
                "role": "R2",
                "role_name": "Builder",
                "model": "opus-4.6",
                "effort": 75,
                "dependencies": [phase["units"][j - 1]] if j > 0 else [],
            })
        envelope["phases"].append({
            "id": phase_id,
            "title": f"Session {phase['session']}: {phase['title']}",
            "description": phase["deliverables"],
            "sessions": "1",
            "units": units,
        })

    out_path = os.path.join(MILESTONES_DIR, f"{ms_id}.json")
    if os.path.exists(out_path):
        print(f"SKIP: {out_path} already exists")
        return ms_id, False

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, indent=2)
    print(f"CREATED: {out_path}")
    return ms_id, True


def register_in_registry(track_id, title, ms_id):
    """Add entry to roadmap-registry.json."""
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = json.load(f)

    # Check if already registered
    for rm in registry.get("roadmaps", []):
        if rm["id"] == track_id.lower():
            print(f"SKIP: {track_id} already in registry")
            return False

    now = datetime.now(timezone.utc).isoformat()
    registry["roadmaps"].append({
        "id": track_id.lower(),
        "title": title,
        "category": "main",
        "priority": len(registry["roadmaps"]) + 1,
        "milestone_ids": [ms_id],
        "created_at": now,
        "updated_at": now,
    })
    registry["updated_at"] = now

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)
    print(f"REGISTERED: {track_id} in roadmap-registry.json")
    return True


def register_in_index(track_id, title, ms_id, total_units, total_sessions, dependencies=None):
    """Add entry to roadmap-index.json."""
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        index = json.load(f)

    # Check if already exists
    for ms in index.get("milestones", []):
        if ms["id"] == ms_id:
            print(f"SKIP: {ms_id} already in roadmap-index")
            return False

    index["milestones"].append({
        "id": ms_id,
        "title": title,
        "track": track_id,
        "dependencies": dependencies or [],
        "status": "not_started",
        "total_units": total_units,
        "completed_units": 0,
        "sessions": total_sessions,
        "envelope_path": f"milestones/{ms_id}.json",
    })
    index["total_milestones"] = len(index["milestones"])
    now = datetime.now(timezone.utc).isoformat()
    index["updated_at"] = now

    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)
    print(f"INDEXED: {ms_id} in roadmap-index.json")
    return True


def add_to_task_queue(track_id, plan_info, plan_path):
    """Append first-phase tasks as AVAILABLE, rest as BLOCKED."""
    if not os.path.exists(TASK_QUEUE_PATH):
        print(f"SKIP: {TASK_QUEUE_PATH} not found")
        return

    with open(TASK_QUEUE_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    phases = plan_info["phases"]
    if not phases:
        print("SKIP: no phases found to add to task queue")
        return

    # Build available tasks (phase 1 units)
    available_lines = []
    blocked_lines = []

    for i, phase in enumerate(phases):
        for uid in phase["units"]:
            task_id = f"{track_id}-{uid.replace('U-', '')}"
            desc = f"{track_id} Session {phase['session']}: {phase['title']} — {uid}"
            line = f"- **{task_id}** (any, P{5 + i}): {desc}\n  Plan: {plan_path}\n"

            if i == 0:
                available_lines.append(line)
            else:
                deps = phases[i - 1]["units"][-1] if i > 0 else ""
                dep_str = f" [blocks: {track_id}-{deps.replace('U-', '')}]" if deps else ""
                blocked_lines.append(line.replace("\n  Plan:", f"{dep_str}\n  Plan:"))

    # Insert available tasks before the M-4-SCENARIOS line or end of AVAILABLE section
    if available_lines:
        insert_text = "".join(available_lines)
        if "M-4-SCENARIOS" in content:
            content = content.replace(
                "- **M-4-SCENARIOS**",
                insert_text + "- **M-4-SCENARIOS**",
            )

    # Insert blocked tasks at end of BLOCKED section (before any ## COMPLETED or ## IN_PROGRESS)
    if blocked_lines:
        insert_text = "".join(blocked_lines)
        # Find end of BLOCKED section
        blocked_section = re.search(r"(## ⛔ BLOCKED.*?)(\n## |\Z)", content, re.DOTALL)
        if blocked_section:
            insert_pos = blocked_section.end(1)
            content = content[:insert_pos] + "\n" + insert_text + content[insert_pos:]

    # Update timestamp
    now = datetime.now(timezone.utc).isoformat()
    content = re.sub(r"Updated: .+", f"Updated: {now}", content)

    with open(TASK_QUEUE_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"QUEUED: {len(available_lines)} available + {len(blocked_lines)} blocked tasks")


def main():
    if len(sys.argv) < 3:
        print("Usage: plan-to-rgs-sync.py <plan_file.md> <TRACK_ID> [--title 'Title']")
        print("Example: plan-to-rgs-sync.py plans/erp-employee/phase6.md BP --title 'Business Platform'")
        sys.exit(1)

    plan_path = sys.argv[1]
    track_id = sys.argv[2].upper()
    title_override = None

    if "--title" in sys.argv:
        idx = sys.argv.index("--title")
        if idx + 1 < len(sys.argv):
            title_override = sys.argv[idx + 1]

    if not os.path.exists(plan_path):
        print(f"ERROR: Plan file not found: {plan_path}")
        sys.exit(1)

    print(f"=== Plan -> RGS Sync: {track_id} ===")
    print(f"Source: {plan_path}")

    plan_info = parse_plan(plan_path)
    if title_override:
        plan_info["title"] = title_override

    print(f"Title: {plan_info['title']}")
    print(f"Sessions: {plan_info['total_sessions']}, Units: {plan_info['total_units']}")

    # Step 1: Create envelope
    ms_id, created = create_envelope(track_id, plan_info, plan_path)

    # Step 2: Register in registry
    register_in_registry(track_id, plan_info["title"], ms_id)

    # Step 3: Add to index
    register_in_index(
        track_id,
        plan_info["title"],
        ms_id,
        plan_info["total_units"],
        plan_info["total_sessions"],
    )

    # Step 4: Add to task queue
    if created:
        add_to_task_queue(track_id, plan_info, plan_path)

    print(f"\n=== Done. Run '/rgs continue {ms_id}' to start execution. ===")


if __name__ == "__main__":
    main()
