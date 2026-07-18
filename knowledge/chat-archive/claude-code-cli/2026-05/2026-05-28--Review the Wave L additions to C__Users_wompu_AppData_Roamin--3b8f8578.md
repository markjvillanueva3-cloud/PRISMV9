---
type: "chat-session"
source: "claude-code-cli"
session_id: "3b8f8578-1950-4960-a77b-932923283556"
title: "Review the Wave L additions to C:/Users/wompu/AppData/Roaming/Autodesk/Autodesk "
date: "2026-05-28"
first_ts: "2026-05-28T03:11:44.827Z"
last_ts: "2026-05-28T03:13:02.647Z"
cwd: "H:\\prism-slot-delta"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-delta/3b8f8578-1950-4960-a77b-932923283556/subagents/agent-a563fda8cd3e6d5fd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:42"
---

# Review the Wave L additions to C:/Users/wompu/AppData/Roaming/Autodesk/Autodesk 

> **claude-code-cli** | 2026-05-28 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism-slot-delta
> Raw: `H:/.claude/projects/H--prism-slot-delta/3b8f8578-1950-4960-a77b-932923283556/subagents/agent-a563fda8cd3e6d5fd.jsonl`

## Transcript

### User | 2026-05-28T03:11:44.827Z

Review the Wave L additions to C:/Users/wompu/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/PRISMBridge.py — this is a Fusion 360 add-in HTTP server.

CONTEXT: PRISM is a manufacturing-intelligence platform. Wave L extends the PRISMBridge add-in with a new POST /atomic dispatcher that routes 139 atomic CAD ops (defined in H:/prism-slot-delta/scripts/cad-atomic-ops-ontology.mjs) to Fusion 360 API calls. The P0 set wired this round = 15 drawing.* ops + op.press-pull (the "closed-loop unblock": drawing.create-doc + drawing.view-base + drawing.view-projected + drawing.auto-dimension + drawing.export-pdf is the path that auto-generates a print PDF from a Fusion design for self-comparison training).

CHANGES (3 Edits this session):
1. Added `import adsk.drawing` inside try/except (around line 41-48 — adsk.drawing is shipped with Fusion API but absent on older installs; fallback sets it to None so import doesn't crash boot).
2. Added `"/atomic": self._dispatch_atomic,` to the _dispatch_post dict (around line 270-275).
3. Inserted a full /atomic block (around line 2260-2630) with:
   - _dispatch_atomic(self, body) — reads {op, args}, dispatches to per-op handlers
   - 6 helper methods (_get_active_drawing, _resolve_sheet, _resolve_view, _point2d_from_mm, _drawing_orientation, plus the dispatcher itself)
   - 16 handler methods: _atomic_drawing_create_doc, _atomic_drawing_view_base, _atomic_drawing_view_projected, _atomic_drawing_view_section, _atomic_drawing_view_detail, _atomic_drawing_auto_dimension, _atomic_drawing_dim_linear/angular/radial, _atomic_drawing_centerline, _atomic_drawing_centermark, _atomic_drawing_balloon, _atomic_drawing_bom_table, _atomic_drawing_title_block, _atomic_drawing_export_pdf, _atomic_op_press_pull

Existing architecture context (do not re-review — just so you understand the surrounding code):
- HTTP requests fire a CustomEvent → main thread executes API calls (Fusion API is single-threaded)
- All POST handlers take a `bod
... [+1565 chars truncated]

### Assistant | 2026-05-28T03:11:53.378Z

I'll review the Wave L additions to the PRISMBridge add-in.

### Assistant | 2026-05-28T03:11:54.782Z

[tool_use: Read]

### User | 2026-05-28T03:11:55.725Z

[tool_result] 1	"""
2	PRISM Fusion 360 API Server Add-In
3	===================================
4	Runs inside Fusion 360 as an add-in, providing HTTP API for external CAD control.
5	
6	THREAD SAFETY: Fusion 360's Python API is NOT thread-safe. All adsk.* calls must
7	run on the main UI thread. This add-in uses a CustomEvent to dispatch requests
8	from the HTTP server thread to the main thread and wait for result
... [+4025 chars truncated]

### Assistant | 2026-05-28T03:11:59.216Z

[tool_use: Read]

### User | 2026-05-28T03:12:00.208Z

[tool_result] 260	            "/combine": self._create_combine,
261	            "/shell": self._create_shell,
262	            "/export": self._export_model,
263	            "/undo": lambda b: self._undo(),
264	            "/new": self._new_document,
265	            "/parameter": self._handle_parameter,
266	            "/tool-import": self._import_tools,
267	            "/cam/setup": self._create_cam_setup,
268	
... [+2145 chars truncated]

### Assistant | 2026-05-28T03:12:03.004Z

Understood — switching approach. Let me read the new /atomic block and helpers in one larger pass.

### Assistant | 2026-05-28T03:12:04.057Z

[tool_use: Read]

### User | 2026-05-28T03:12:05.089Z

[tool_result] 2260	                        ver_info["comment"] = ""
2261	                    result["versions"].append(ver_info)
2262	                result["version_count"] = len(result["versions"])
2263	                result["is_mature"] = len(result["versions"]) >= 8
2264	        except Exception as e:
2265	            result["error"] = f"Could not read versions: {str(e)}"
2266	
2267	        return result
2
... [+21842 chars truncated]

### Assistant | 2026-05-28T03:12:09.944Z

Understood — different approach. Let me read the remaining handlers in a single larger pass.

### Assistant | 2026-05-28T03:12:11.648Z

[tool_use: Read]

### User | 2026-05-28T03:12:12.579Z

[tool_result] 2659	        if adsk.drawing is None:
2660	            return {"success": False, "error": "adsk.drawing module unavailable"}
2661	        drawing = self._get_active_drawing()
2662	        filepath = str(args.get("filepath", "")).strip()
2663	        if not filepath:
2664	            return {"success": False, "error": "Missing filepath"}
2665	        # Ensure parent dir exists
2666	        parent_d
... [+9376 chars truncated]

### Assistant | 2026-05-28T03:12:15.297Z

I have enough context to grade. Let me verify the ontology spec arg shapes for two ops I'm less sure about.

### Assistant | 2026-05-28T03:12:16.802Z

[tool_use: Read]

### User | 2026-05-28T03:12:19.333Z

[tool_result] 714	  "drawing.create-doc": {
715	    fusion360: { fn: "app.documents.add(DrawingDocumentType, refDesign, true, settings)", args: ["refDesign", "sheetSettings"], notes: "Returns DrawingDocument; settings = drawingDocSettings (sheet size, units, template)" },
716	    "hypercad-s": { fn: "Drawing.New", args: ["refModel", "template"], notes: "OPEN MIND 2D Detailing module — opens a .ckm drawing refer
... [+19899 chars truncated]

### Assistant | 2026-05-28T03:13:02.647Z

I have enough to render the verdict.

## Code Quality Analysis Report — Wave L /atomic additions (PRISMBridge.py)

### Grade: PASS with 2 P0 + 4 P1 findings

The wiring is structurally sound (top-level try/except for adsk.drawing, fail-loud dispatch envelope with traceback capture, consistent mm/10.0 → cm conversion, R12-honest UI text-command fallbacks). However there are real runtime hazards in the active code paths.

---

### P0 — runtime crashes / R12 violations

**P0-1 — `_atomic_drawing_view_base` will AttributeError at runtime (line ~2446)**

```python
if not drawing.referencedDocuments or drawing.referencedDocuments.count == 0:
```

`Drawing` in the Fusion 360 API does not expose a `referencedDocuments` collection. The reference is held on the **DrawingDocument** (parent), not the `Drawing` product, and the canonical accessor is `drawingDoc.dataFile` or walking `app.activeDocument.documentReferences`. Calling `drawing.referencedDocuments` raises `AttributeError`, which the outer try/except in `_dispatch_atomic` will catch — so it returns a fail-loud dict (good) — but the operation never succeeds and the closed-loop "design → view" path is dead.

Fix: drop the early bail or replace with:
```python
ref_doc = adsk.core.Application.get().activeDocument
# OR: drawing.parentDocument.documentReferences walking
```
Then pass the underlying `DataFile` (`ref_doc.dataFile`) to `createBaseViewInput`, which is what `createBaseViewInput` actually requires — a `DataFile`, not a `Document`.

**P0-2 — `_atomic_drawing_view_base` passes a `Document` where Fusion expects a `DataFile` (line ~2460)**

```python
ref_doc = drawing.referencedDocuments.item(0)
...
base_input = sheet.drawingViews.createBaseViewInput(ref_doc)
```

`createBaseViewInput` takes an `adsk.core.DataFile` (the cloud reference), not a `Document` object. Passing a Document raises `RuntimeError: A pointer of an unexpected type was passed.` This is the second crash on the same hot path. Fix:

```python
ref_data_
... [+4475 chars truncated]
