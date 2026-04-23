#!/usr/bin/env python3
"""Pipeline stage checkpoint and rollback manager."""
import json, os, shutil
from datetime import datetime

CHECKPOINT_DIR = os.path.expanduser("~/.prism/pipeline-checkpoints")


def create_checkpoint(pipeline_name, stage_name, data):
    """Save checkpoint after successful stage completion."""
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    checkpoint = {
        "pipeline": pipeline_name,
        "stage": stage_name,
        "timestamp": datetime.now().isoformat(),
        "data": data
    }
    filepath = os.path.join(CHECKPOINT_DIR, f"{pipeline_name}-{stage_name}.json")
    with open(filepath, "w") as f:
        json.dump(checkpoint, f, indent=2)
    return filepath


def rollback_to_stage(pipeline_name, stage_name):
    """Restore state from a previous stage checkpoint."""
    filepath = os.path.join(CHECKPOINT_DIR, f"{pipeline_name}-{stage_name}.json")
    if not os.path.exists(filepath):
        return {"error": f"No checkpoint found for {pipeline_name}/{stage_name}"}
    with open(filepath) as f:
        checkpoint = json.load(f)
    return {"restored": True, "stage": stage_name, "data": checkpoint["data"]}


def list_checkpoints(pipeline_name=None):
    """List available checkpoints."""
    if not os.path.isdir(CHECKPOINT_DIR):
        return []
    checkpoints = []
    for f in sorted(os.listdir(CHECKPOINT_DIR)):
        if not f.endswith(".json"):
            continue
        if pipeline_name and not f.startswith(pipeline_name):
            continue
        filepath = os.path.join(CHECKPOINT_DIR, f)
        try:
            with open(filepath) as fh:
                data = json.load(fh)
            checkpoints.append({
                "file": f,
                "pipeline": data.get("pipeline"),
                "stage": data.get("stage"),
                "timestamp": data.get("timestamp")
            })
        except (json.JSONDecodeError, IOError):
            pass
    return checkpoints


def cleanup_old_checkpoints(max_age_hours=24):
    """Remove checkpoints older than max_age_hours."""
    if not os.path.isdir(CHECKPOINT_DIR):
        return {"removed": 0}
    removed = 0
    cutoff = datetime.now().timestamp() - (max_age_hours * 3600)
    for f in os.listdir(CHECKPOINT_DIR):
        filepath = os.path.join(CHECKPOINT_DIR, f)
        if os.path.getmtime(filepath) < cutoff:
            os.remove(filepath)
            removed += 1
    return {"removed": removed}


if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    if cmd == "list":
        print(json.dumps(list_checkpoints(), indent=2))
    elif cmd == "cleanup":
        print(json.dumps(cleanup_old_checkpoints(), indent=2))
