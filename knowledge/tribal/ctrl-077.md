---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-077
title: SINUMERIK Operate HMI and Program Management
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: heuristic
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "SINUMERIK-Operate", "HMI", "program-management", "DXF", "simulation", "controller:siemens"]
material_groups: []
operation_types: []
content_hash: a32b20b2dc6fb8c053730b093423b1253ca34963dbe8d60675859bdde11bc251
mirror_ts: 2026-05-05T13:36:03.958Z
mirror_engine: TribalVaultPopulatorEngine
---

# SINUMERIK Operate HMI and Program Management

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

SINUMERIK Operate is the unified HMI across all current SINUMERIK platforms, combining the former HMI-Advanced (G-code editing), ShopMill, and ShopTurn under one interface. Key features for CNC programmers: (1) **Program editor** with syntax highlighting, block search, and NC variable display; (2) **Simulation** with 2D path preview and optional 3D workpiece removal simulation; (3) **Program management** with directory structure: /MPF.DIR (main programs), /SPF.DIR (subprograms), /WKS.DIR (workpiece folders grouping related programs); (4) **Job lists** for automated multi-program execution with tool tracking; (5) **Easy Message** system for operator instructions embedded in programs via MSG() command; (6) **DXF Reader** (optional) for importing 2D contours directly from CAD files into ShopMill/ShopTurn; (7) **Program-Guided Operation (programGUIDE)** for step-by-step cycle-based programming with graphical support. File transfer: USB, network share (SMB), or DNC via RS232. Network path configured in /user/sinumerik/hmi/cfg/. Programs use .MPF extension for main programs and .SPF for subprograms. Maximum program size depends on NCK memory (typically 2-16MB of part program memory).

## Related tips

- [[ctrl-015|Siemens SINUMERIK ONE digital twin advantage]] _(category+tag:3)_
- [[ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]] _(category+tag:3)_
- [[ctrl-067|TRAORI 5-Axis Simultaneous Transformation]] _(category+tag:3)_
- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+tag:3)_
- [[ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]] _(category+tag:3)_

## Tags

#controller #siemens #sinumerik-operate #hmi #program-management #dxf #simulation #controller-siemens
