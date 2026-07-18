"""
Export PRISM MCP Server roadmap queue state to ROADMAP_QUEUE.json.

Reads from:
  - C:/PRISM/mcp-server/data/roadmap-index.json  (all 60 milestones)
  - C:/PRISM/mcp-server/data/claims/             (active claim directories)
  - C:/PRISM/mcp-server/data/coordination/instances/  (active Claude instances)

Writes to: ROADMAP_QUEUE.json in PRISMV9 repo root.

Usage:
  python SCRIPTS/export_roadmap_queue.py
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent
MCP_DATA = Path("C:/PRISM/mcp-server/data")
ROADMAP_INDEX = MCP_DATA / "roadmap-index.json"
CLAIMS_DIR = MCP_DATA / "claims"
INSTANCES_DIR = MCP_DATA / "coordination" / "instances"
OUTPUT = PROJ_ROOT / "ROADMAP_QUEUE.json"


def load_roadmap():
    with open(ROADMAP_INDEX, encoding="utf-8") as f:
        return json.load(f)


def scan_claims():
    """Scan claims/ for active claim directories (mkdir-based locks)."""
    claims = {}
    if not CLAIMS_DIR.exists():
        return claims
    for entry in CLAIMS_DIR.iterdir():
        if entry.is_dir() and entry.name != ".gitkeep":
            # Claim dir name = milestone ID or milestone/unit
            meta_file = entry / "claim.json"
            claim_info = {"id": entry.name, "dir": entry.name}
            if meta_file.exists():
                try:
                    with open(meta_file, encoding="utf-8") as f:
                        claim_info.update(json.load(f))
                except (json.JSONDecodeError, OSError):
                    pass
            claims[entry.name] = claim_info
    return claims


def scan_instances():
    """Scan coordination/instances/ for active Claude instances."""
    instances = []
    if not INSTANCES_DIR.exists():
        return instances
    for entry in INSTANCES_DIR.iterdir():
        if entry.is_file() and entry.suffix == ".json":
            try:
                with open(entry, encoding="utf-8") as f:
                    data = json.load(f)
                instances.append({
                    "id": data.get("id", entry.stem),
                    "heartbeat": data.get("heartbeat", ""),
                    "milestone": data.get("milestone", ""),
                    "status": data.get("status", "unknown"),
                })
            except (json.JSONDecodeError, OSError):
                pass
    return instances


def classify_milestones(milestones, claims):
    """Classify milestones into done/available/claimed/blocked columns."""
    # Build lookup: id -> milestone
    by_id = {m["id"]: m for m in milestones}
    # Build set of complete milestone IDs
    complete_ids = {m["id"] for m in milestones if m.get("status") == "complete"}
    # Build set of claimed milestone IDs
    claimed_ids = set(claims.keys())

    done = []
    available = []
    claimed = []
    blocked = []

    for m in milestones:
        mid = m["id"]
        deps = m.get("dependencies", [])
        units_str = f"{m.get('completed_units', 0)}/{m.get('total_units', 0)}"

        card = {
            "id": mid,
            "title": m.get("title", ""),
            "track": m.get("track", ""),
            "units": units_str,
            "sessions": m.get("sessions", ""),
        }

        if m.get("status") == "complete":
            done.append(card)
        elif mid in claimed_ids:
            claim = claims[mid]
            card["instance"] = claim.get("instance_id", claim.get("id", ""))
            card["claimed_at"] = claim.get("claimed_at", "")
            claimed.append(card)
        else:
            # Check if all dependencies are complete
            unmet = [d for d in deps if d not in complete_ids]
            if not unmet:
                available.append(card)
            else:
                card["blocked_by"] = unmet
                blocked.append(card)

    return done, available, claimed, blocked


def export():
    if not ROADMAP_INDEX.exists():
        print(f"ERROR: {ROADMAP_INDEX} not found", file=sys.stderr)
        sys.exit(1)

    roadmap = load_roadmap()
    milestones = roadmap.get("milestones", [])
    claims = scan_claims()
    instances = scan_instances()

    done, available, claimed, blocked = classify_milestones(milestones, claims)

    output = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "total_milestones": len(milestones),
        "columns": {
            "done": done,
            "available": available,
            "claimed": claimed,
            "blocked": blocked,
        },
        "instances": instances,
        "summary": {
            "done": len(done),
            "available": len(available),
            "claimed": len(claimed),
            "blocked": len(blocked),
        },
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Exported {len(milestones)} milestones to {OUTPUT}")
    print(f"  Done: {len(done)}, Available: {len(available)}, "
          f"Claimed: {len(claimed)}, Blocked: {len(blocked)}")
    print(f"  Active instances: {len(instances)}")


if __name__ == "__main__":
    export()
