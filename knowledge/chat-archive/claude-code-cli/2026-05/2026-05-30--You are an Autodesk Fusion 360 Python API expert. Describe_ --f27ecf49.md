---
type: "chat-session"
source: "claude-code-cli"
session_id: "f27ecf49-ca75-4d3e-b761-aa4fa25998f6"
title: "You are an Autodesk Fusion 360 Python API expert. Describe, concretely, how a he"
date: "2026-05-30"
first_ts: "2026-05-30T04:00:25.440Z"
last_ts: "2026-05-30T04:02:20.096Z"
cwd: "H:\\prism-slot-delta"
messages: 17
user_msgs: 8
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/workflows/wf_0672ce1f-995/agent-aaa212a78519bb190.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:42"
---

# You are an Autodesk Fusion 360 Python API expert. Describe, concretely, how a he

> **claude-code-cli** | 2026-05-30 | 17 msgs (8 user / 9 assistant) | cwd: H:\prism-slot-delta
> Raw: `H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/workflows/wf_0672ce1f-995/agent-aaa212a78519bb190.jsonl`

## Transcript

### User | 2026-05-30T04:00:25.440Z

You are an Autodesk Fusion 360 Python API expert. Describe, concretely, how a headless harvester (running Python INSIDE Fusion via a bridge /execute endpoint) would: (1) enumerate EVERY command definition Fusion exposes — ui = adsk.core.Application.get().userInterface; iterate ui.commandDefinitions — capturing id + name; (2) introspect an API class's methods + parameter signatures so we can EXTEND a captured API inventory — for the classes that unbound CAD-design ops need (GeometricConstraints with addCoincident/addParallel/etc., SketchDimensions with addDistanceDimension/etc., SketchPoints, SketchTexts, polygon/slot creation methods on SketchLines/SketchArcs). Cover: can dir() on the class/instance yield methods? how to get param names+types (Fusion has no reflection for signatures — must we hardcode from docs, or can we read __doc__)? Be HONEST about what is and isn't introspectable at runtime vs what needs the Autodesk doc set. (3) main-thread/event constraints. Return ONLY the structured object.

### Assistant | 2026-05-30T04:00:41.653Z

I'll research this concretely against the Fusion 360 Python API. Let me verify the actual API surface for command-definition enumeration and class introspection.

### Assistant | 2026-05-30T04:00:44.978Z

[tool_use: WebFetch]

### Assistant | 2026-05-30T04:00:47.381Z

[tool_use: WebSearch]

### Assistant | 2026-05-30T04:00:47.866Z

[tool_use: WebSearch]

### Assistant | 2026-05-30T04:00:48.786Z

[tool_use: WebSearch]

### Assistant | 2026-05-30T04:00:49.252Z

[tool_use: WebSearch]

### Assistant | 2026-05-30T04:00:55.507Z

[tool_use: WebSearch]

### User | 2026-05-30T04:01:26.650Z

[tool_result] The server returned HTTP 503 Service Unavailable.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-05-30T04:01:30.722Z

[tool_result] Web search results for query: "Fusion 360 API GeometricConstraints addCoincident SketchDimensions addDistanceDimension Python"

I'll search for information about the Fusion 360 API methods you mentioned.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.

### User | 2026-05-30T04:01:38.074Z

[tool_result] Web search results for query: "Fusion 360 API CommandDefinitions iterate item count CommandDefinition id name property"

I'll search for information about iterating through CommandDefinitions in the Fusion 360 API.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.

### User | 2026-05-30T04:01:44.469Z

[tool_result] Web search results for query: "Fusion 360 API CommandDefinitions count item itemById CommandDefinition id name property iterate"

I'll search for information about the Fusion 360 API CommandDefinitions object.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.

### User | 2026-05-30T04:01:41.407Z

[tool_result] Web search results for query: "Fusion 360 Python API dir() introspection __doc__ method signature reflection not available"

I'll search for information about introspecting the Fusion 360 Python API using reflection techniques.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.

### User | 2026-05-30T04:01:45.447Z

[tool_result] Web search results for query: "Fusion 360 API custom event main thread "control of application" addin command background worker thread document operations"

I'll search for information about Fusion 360 API threading, custom events, and document operations from background threads.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.

### Assistant | 2026-05-30T04:02:05.891Z

[tool_use: StructuredOutput]

### User | 2026-05-30T04:02:11.741Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-30T04:02:20.096Z

I've returned the structured object covering all three areas, grounded in the actual Fusion 360 Python API surface. Key honest findings:

1. **Command enumeration** — `ui.commandDefinitions` is a SWIG collection walked via `.count`/`.item(i)` (NOT `for ... in`), yielding stable `.id` + localized `.name`; per-item try/except mandatory since lazy defs throw.

2. **Class introspection** — `dir()` on the class reliably yields method/property NAMES (authoritative for *this build*), but `inspect.signature` RAISES on SWIG builtins and `__doc__` is mostly None/stub — so parameter names+types MUST come from the Autodesk doc set, not runtime. Also a true finding: no `addPolygon` method and no public `SketchSlots` collection — those are UI-command-driven, not object-model.

3. **Caveats** — all `add*` mutations are main-thread-only (marshal via CustomEvent if off-thread); pure introspection is read-only/safe; CommandInputs only materialize transiently inside `commandCreated` handlers; SWIG objects aren't JSON-serializable so project to plain dicts before `json.dumps`.

Note: the WebSearch/WebFetch calls returned no usable content (503 on the Autodesk help page, empty search bodies), so the structured answer is grounded in established Fusion 360 API behavior rather than freshly-fetched pages — I've flagged the doc-set dependency explicitly rather than fabricating signature data.
