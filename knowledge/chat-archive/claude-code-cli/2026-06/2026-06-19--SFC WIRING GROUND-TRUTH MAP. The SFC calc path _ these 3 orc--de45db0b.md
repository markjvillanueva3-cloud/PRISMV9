---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING GROUND-TRUTH MAP. The SFC calc path = these 3 orchestrators (all H:/p"
date: "2026-06-19"
first_ts: "2026-06-19T15:06:16.829Z"
last_ts: "2026-06-19T15:06:35.255Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-aebfeaf37b96155ac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING GROUND-TRUTH MAP. The SFC calc path = these 3 orchestrators (all H:/p

> **claude-code-cli** | 2026-06-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-aebfeaf37b96155ac.jsonl`

## Transcript

### User | 2026-06-19T15:06:16.829Z

SFC WIRING GROUND-TRUTH MAP. The SFC calc path = these 3 orchestrators (all H:/prism/mcp-server/src/engines/):
  - UltimateSpeedFeedEngine.ts (core calculate(); 31 models; the physics hub)
  - SpeedFeedNineAxisOrchestratorEngine.ts (9-axis run(); clamps; ROI popup)
  - SpeedFeedOrchestratorEngine.ts (central hub ~2851 LOC, 67 integration points)
plus the dispatcher (src/tools/dispatchers/calcDispatcher.ts speed_feed / sfc_* / ultimate_speed_feed actions) and REST (src/routes createSfcRouter -> /api/v1/sfc) + web (web/src/types/sfc.ts).

WIRING DEFINITION: an engine/algorithm is WIRED into the SFC iff its exported singleton/class is imported AND CALLED by one of the 3 orchestrators above (grep its export name in those files and confirm a call site, not just an import), OR it is reachable via a prism_calc speed_feed/sfc_*/ultimate_speed_feed dispatcher action. CLASSIFY each asset:
  - WIRED: consumed in the SFC calc path (cite the call site file:line).
  - UNWIRED-BUT-APPLICABLE: physically relevant to a speed/feed recommendation but NOT consumed by any SFC orchestrator or SFC dispatcher action -> a functional gap; say WHERE it should wire.
  - DEAD/NA: not SFC-applicable (lathe-toolpath-only, post-processor-only, EDM, business) OR a stub/duplicate -> exclude with one-line reason.
Be exact with file:line. Mechanical grep + classify; flag judgment calls for synthesis.

Read the 3 orchestrators END TO END and produce the AUTHORITATIVE list of what the SFC calc path ACTUALLY consumes:
1. Every engine/algorithm imported AND called by UltimateSpeedFeedEngine.ts (export name + call-site line).
2. Same for SpeedFeedNineAxisOrchestratorEngine.ts and SpeedFeedOrchestratorEngine.ts.
3. Every prism_calc action in calcDispatcher.ts matching speed_feed|sfc_|ultimate_speed_feed|speedfeed (action -> engine).
4. REST /api/v1/sfc endpoints (createSfcRouter) + web SfcCalculate fields. NOTE: prior finding says REST /sfc/calculate routes to SFCCalculateEngine (surface-finish), NOT the go
... [+86 chars truncated]

### Assistant | 2026-06-19T15:06:23.878Z

I'll read all 3 orchestrators end to end, the dispatcher, REST router, and web types to produce the authoritative SFC wiring map.

### Assistant | 2026-06-19T15:06:24.220Z

[tool_use: Read]

### User | 2026-06-19T15:06:26.425Z

[tool_result] 1	/**
2	 * UltimateSpeedFeedEngine — AI-Powered Unified Speed & Feed Optimization
3	 *
4	 * The most comprehensive speed/feed calculator in existence. Accepts ANY subset
5	 * of inputs and infers all missing parameters using physics-based models,
6	 * material databases, and empirical lookup tables.
7	 *
8	 * Capabilities far exceeding Harvey Tool / Kennametal / Sandvik calculators:
9	 *   - Parti
... [+5654 chars truncated]

### Assistant | 2026-06-19T15:06:29.924Z

[tool_use: Read]

### User | 2026-06-19T15:06:33.549Z

[tool_result] 100	  material?: string;
101	  iso_group?: ISOGroup;
102	  hardness_hb?: number;
103	  hardness_hrc?: number;
104	
105	  // Tool
106	  tool_diameter_mm?: number;
107	  flutes?: number;
108	  tool_material?: ToolMaterial;
109	  tool_coating?: string;
110	  helix_angle_deg?: number;
111	  corner_radius_mm?: number;
112	  flute_length_mm?: number;
113	  overall_length_mm?: number;
114	  tool_stickout
... [+5128 chars truncated]

### Assistant | 2026-06-19T15:06:35.255Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
