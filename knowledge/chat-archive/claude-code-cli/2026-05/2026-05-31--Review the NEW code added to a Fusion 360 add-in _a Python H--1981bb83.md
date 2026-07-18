---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "Review the NEW code added to a Fusion 360 add-in (a Python HTTP server that expo"
date: "2026-05-31"
first_ts: "2026-05-31T18:58:48.000Z"
last_ts: "2026-05-31T18:59:18.864Z"
cwd: "H:\\prism-slot-kilo\\mcp-server\\scripts\\fusion360-addin"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/agent-ad88606d00251173d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# Review the NEW code added to a Fusion 360 add-in (a Python HTTP server that expo

> **claude-code-cli** | 2026-05-31 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism-slot-kilo\mcp-server\scripts\fusion360-addin
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/agent-ad88606d00251173d.jsonl`

## Transcript

### User | 2026-05-31T18:58:48.000Z

Review the NEW code added to a Fusion 360 add-in (a Python HTTP server that exposes read-only navigation endpoints). Read the file END-TO-END but focus your verdict on the newly added block:

FILE: H:\prism-slot-kilo\mcp-server\scripts\fusion360-addin\fusion360_api_server.py

NEW CODE (grep these to locate):
1. Routing additions in `_dispatch_get` — six elif branches for `/design/tree`, `/design/features`, `/design/parameters`, `/design/selection`, `/post/library`, `/post/programs`.
2. A new method block just before `def do_OPTIONS` — the methods: `_nav_safe` (static), `_design_length_unit`, `_bbox_in`, `_design_tree`, `_design_features`, `_design_parameters`, `_design_selection`, `_post_library`, `_post_programs`.

SPEC the code must satisfy:
- READ-ONLY navigation endpoints (GET) — they must NOT mutate the Fusion document (no document writes, no actuation). Confirm none of the new methods call mutating APIs.
- Fail-soft: a single bad entity must never blank the whole read. The pattern is `_nav_safe(lambda: ...)` returning a default. Check every risky field access is wrapped.
- Units: geometry must be emitted in INCH (Fusion internal length is cm → divide by 2.54; volume cm³→in³ via /16.387064) AND each design read reports `design_length_unit` so a metric doc can't be misread (25.4× guard). Verify the conversions.
- Bounded: occurrence list ≤500, timeline ≤1000, params ≤2000, posts ≤500, post-library folder recursion depth-capped. Verify caps exist and are honored.
- Existing conventions: must match the surrounding helpers (`_list_occurrences` uses `/2.54` for inch; `_get_design()` resolves the design product by type; `_respond` uses `json.dumps(default=str)`).

KNOWN-GOOD EVIDENCE (already verified live on build 2703.1.11 via the add-in's /execute): `design.unitsManager.defaultLengthUnits`, `root.allOccurrences`, `design.timeline.item(i).{name,isSuppressed,int(healthState),entity.objectType}`, `userInterface.activeSelections.count`, `adsk.cam.LibraryLocations.{Fus
... [+1051 chars truncated]

### Assistant | 2026-05-31T18:58:57.683Z

I'll review the new navigation endpoints. Let me read the file end-to-end first.

### Assistant | 2026-05-31T18:58:58.175Z

[tool_use: Read]

### User | 2026-05-31T18:59:01.552Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1431 of 3332 total (49476 tokens, cap 25000). Call Read with offset=1432 limit=1431 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	"""
2	PRISM Fusion 360 API Server Add-In
3	===================================
4	Runs inside Fusion 36
... [+66305 chars truncated]

### Assistant | 2026-05-31T18:59:05.677Z

I have the first page. Let me read the existing convention helper (`_list_occurrences`) and the new code block. Let me grep for the new methods and the surrounding helper to verify conventions.

### Assistant | 2026-05-31T18:59:07.269Z

[tool_use: Grep]

### User | 2026-05-31T18:59:11.323Z

[tool_result] 276:            "/component/list": self._list_occurrences,
2352:    def _list_occurrences(self, body):
2960:    def _nav_safe(fn, default=None):
2968:    def _design_length_unit(self, design):
2974:    def _bbox_in(self, ent):
2984:    def _design_tree(self):
3007:                    "bbox_in": self._bbox_in(b),
3048:                    "bbox_in": self._bbox_in(occ),
3056:            "design_lengt
... [+312 chars truncated]

### Assistant | 2026-05-31T18:59:13.105Z

Let me read the convention helper `_list_occurrences` and the full new code block.

### Assistant | 2026-05-31T18:59:13.962Z

[tool_use: Read]

### User | 2026-05-31T18:59:17.789Z

[tool_result] 2352	    def _list_occurrences(self, body):
2353	        """POST /component/list — Enumerate occurrences with INCH bounding boxes +
2354	        grounded state so the driver can identify fixture/part/stock and compute
2355	        mate placement. Also lists root-level bodies (e.g. a stock body)."""
2356	        try:
2357	            design = self._get_design()
2358	        except Exception as e:
2
... [+5745 chars truncated]

### Assistant | 2026-05-31T18:59:18.864Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
