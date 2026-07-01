---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_cad_bridge.md
source_filename: project_cad_bridge.md
content_hash: 0605301741080f1e85c948b4a4f877c349981d6cabb020c09b9eedd0326828b5
mirror_ts: 2026-05-05T13:00:09.489Z
mirror_engine: ObsidianMemorySyncEngine
---
Parallel CAD chat (2026-04-20) is implementing a control bridge that lets PRISM AI / Claude drive:
- hyperCAD / hyperMILL
- Mastercam
- Inventor (HSM)
- Fusion 360
- FreeCAD

**Why:** Without this bridge, CAM reasoning is read-only. The bridge turns PRISM into an automation layer over the installed CAM stack at JM Die.

**How to apply:** PHASE-1 per-system function catalogs in `mcp-server/data/cam-functions/<system>/` are the schema the bridge reads to know what operations, parameters, and dialogs exist. Extraction fidelity matters — a wrong param name breaks actuation. When in doubt, prefer real installation files (e.g. `resources/HYPERMILL/hyperMILL/33.0/**`) over fabricated data. Keep extraction worktree (`/h/prism-cam-exhaust` on `work/cam-exhaust-phase1`) cleanly separated from CAD-chat commits.
