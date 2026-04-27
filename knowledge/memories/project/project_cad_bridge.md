---
name: CAD chat is building CAM-system control bridge
description: Parallel chat is wiring PRISM AI/Claude to drive hyperCAD, Mastercam, Inventor, Fusion, FreeCAD — CAM-EXHAUST PHASE-1 catalogs feed this bridge
type: project
originSessionId: 073d6bef-c8f0-43ef-9357-21f403539d6d
source: prism-memory
synced: 2026-04-27T00:20:43.146Z
aliases: project_cad_bridge
---

Parallel CAD chat (2026-04-20) is implementing a control bridge that lets PRISM AI / Claude drive:
- hyperCAD / hyperMILL
- Mastercam
- Inventor (HSM)
- Fusion 360
- FreeCAD

**Why:** Without this bridge, CAM reasoning is read-only. The bridge turns PRISM into an automation layer over the installed CAM stack at JM Die.

**How to apply:** PHASE-1 per-system function catalogs in `mcp-server/data/cam-functions/<system>/` are the schema the bridge reads to know what operations, parameters, and dialogs exist. Extraction fidelity matters — a wrong param name breaks actuation. When in doubt, prefer real installation files (e.g. `resources/HYPERMILL/hyperMILL/33.0/**`) over fabricated data. Keep extraction worktree (`/h/prism-cam-exhaust` on `work/cam-exhaust-phase1`) cleanly separated from CAD-chat commits.


## Related
[[skills/data|/data]] • [[skills/cam-functions|/cam-functions]] • [[skills/hyper|/hyper]] • [[skills/h|/h]] • [[skills/prism-cam-exhaust|/prism-cam-exhaust]] • [[skills/cam-exhaust-phase|/cam-exhaust-phase]]