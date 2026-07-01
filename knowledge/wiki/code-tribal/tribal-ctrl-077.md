---
name: tribal-ctrl-077
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "SINUMERIK-Operate", "HMI", "program-management", "DXF", "simulation"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-077.md
promoted_at: 2026-06-09T22:31:16.149Z
---

# SINUMERIK Operate HMI and Program Management

SINUMERIK Operate is the unified HMI across all current SINUMERIK platforms, combining the former HMI-Advanced (G-code editing), ShopMill, and ShopTurn under one interface. Key features for CNC programmers: (1) **Program editor** with syntax highlighting, block search, and NC variable display; (2) **Simulation** with 2D path preview and optional 3D workpiece removal simulation; (3) **Program management** with directory structure: /MPF.DIR (main programs), /SPF.DIR (subprograms), /WKS.DIR (workpiece folders grouping related programs); (4) **Job lists** for automated multi-program execution with tool tracking; (5) **Easy Message** system for operator instructions embedded in programs via MSG() command; (6) **DXF Reader** (optional) for importing 2D contours directly from CAD files into ShopMill/ShopTurn; (7) **Program-Guided Operation (programGUIDE)** for step-by-step cycle-based programming with graphical support. File transfer: USB, network share (SMB), or DNC via RS232. Network path configured in /user/sinumerik/hmi/cfg/. Programs use .MPF extension for main programs and .SPF for subprograms. Maximum program size depends on NCK memory (typically 2-16MB of part program memory).

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
- [[controller-knowledge-tips-ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]]
- [[controller-knowledge-tips-ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]]
