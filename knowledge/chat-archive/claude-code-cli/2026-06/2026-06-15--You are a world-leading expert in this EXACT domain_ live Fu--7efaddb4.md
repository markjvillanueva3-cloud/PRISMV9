---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "You are a world-leading expert in this EXACT domain: live Fusion 360 automation:"
date: "2026-06-15"
first_ts: "2026-06-15T02:13:29.802Z"
last_ts: "2026-06-15T02:18:23.259Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 15
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/workflows/wf_a7a6a364-1d1/agent-a177a00c6bda736b4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are a world-leading expert in this EXACT domain: live Fusion 360 automation:

> **claude-code-cli** | 2026-06-15 | 32 msgs (15 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/workflows/wf_a7a6a364-1d1/agent-a177a00c6bda736b4.jsonl`

## Transcript

### User | 2026-06-15T02:13:29.802Z

You are a world-leading expert in this EXACT domain: live Fusion 360 automation: in-host geometry mutation, API scripting, .f3d round-trip. This is a deep-research VERIFICATION pass for PRISM's internal "cad-fusion-live" knowledge galaxy. FIELD FENCE: treat the domain as EXACTLY the description and nothing else. If it is a software/CS, AI/ML, data, business, or education domain, sources MUST come from THAT field (CS/software-engineering textbooks, ACM/IEEE/arXiv/USENIX papers, framework/tool docs, business or pedagogy literature) -- do NOT pull manufacturing/machining/SPC/gauge-R&R sources just because PRISM serves manufacturing. The galaxy NAME may collide with a manufacturing term; the DESCRIPTION is authoritative.

TASK:
1. WebSearch for the NEXT layer of reputable, real, citable sources in THIS EXACT domain that a world-leading expert masters: university courses (.edu / MIT OCW / Stanford / CMU / Berkeley), authoritative textbooks, standards bodies (ISO / IEEE / ASME / ACM / NIST), peer-reviewed papers (arXiv / ACM DL / IEEE Xplore / USENIX), government / national-lab reports, or reputable technical talks / articles.
2. WebFetch the 4-6 BEST sources to CONFIRM each is real and on-topic. For each fetched source capture: url, title, kind (course|textbook|standard|paper|report|article|talk), a <=40-word VERBATIM excerpt proving it is real + on-domain (set fetched:true), and the key transferable knowledge it contributes to the cad-fusion-live domain.
3. Give institutional/standards/methodology/theory depth from the EXACT field below.

HONESTY (R12, CRITICAL): cite ONLY sources you actually fetched and verified. If a WebFetch fails or a source is off-topic, DROP it. NEVER fabricate a url, title, author, excerpt, or finding -- 3 truly-verified sources beat 6 with any invented. For a source you can name but could not fetch, set fetched:false and still give NO fabricated excerpt.

Return: galaxy="cad-fusion-live", sources[] (verified), a 3-4 sentence synthesis of the ne
... [+107 chars truncated]

### Assistant | 2026-06-15T02:13:34.159Z

I'll research authoritative sources for live Fusion 360 automation, API scripting, and .f3d round-trip workflows. Let me search and verify real sources.

### Assistant | 2026-06-15T02:13:34.539Z

[tool_use: WebSearch]

### Assistant | 2026-06-15T02:13:35.070Z

[tool_use: WebSearch]

### User | 2026-06-15T02:14:11.201Z

[tool_result] Web search results for query: "Autodesk Fusion 360 API automation scripting official documentation"

Links: [{"title":"Writing Scripts Using the New Fusion 360 API Preview - Fusion Blog","url":"https://www.autodesk.com/products/fusion-360/blog/writing-scripts-using-the-new-fusion-360-api-preview/"},{"title":"Fusion Help | Welcome to Fusion's Programming Interface< | Autodesk","url":"https://help.a
... [+5088 chars truncated]

### User | 2026-06-15T02:14:14.802Z

[tool_result] Web search results for query: "Fusion 360 Python API adsk.fusion geometry mutation scripting tutorial"

Links: [{"title":"Fusion360 Python Basics – Digital Design & Fabrication","url":"http://asd.courses.sutd.edu.sg/dfab/fusion360-python-basics/"},{"title":"Automating Fusion 360 with the API | Autodesk University","url":"https://www.autodesk.com/autodesk-university/class/Automating-Fusion-360-API-
... [+5410 chars truncated]

### Assistant | 2026-06-15T02:14:20.207Z

[tool_use: WebSearch]

### Assistant | 2026-06-15T02:14:20.881Z

[tool_use: WebSearch]

### User | 2026-06-15T02:14:54.019Z

[tool_result] Web search results for query: "Fusion 360 f3d file format round-trip export import automation API"

Links: [{"title":"GitHub - Simonlebucheron/f360_export_3dprint_file: fusion 360 script to export f3d, step, stl and 3mf · GitHub","url":"https://github.com/Simonlebucheron/f360_export_3dprint_file"},{"title":"ExportManager API Sample","url":"https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/fil
... [+4873 chars truncated]

### User | 2026-06-15T02:14:59.568Z

[tool_result] Web search results for query: "Autodesk Fusion API add-in event handlers design change automation advanced"

Links: [{"title":"Automation API for Fusion: Open Beta | Autodesk Platform Services","url":"https://aps.autodesk.com/blog/design-automation-fusion-open-beta"},{"title":"Autodesk Developer Blog : Lesson 1: The basic scripts and Add-in","url":"https://blog.autodesk.io/lesson-1-the-basic-scrip
... [+6214 chars truncated]

### Assistant | 2026-06-15T02:15:08.896Z

Now let me fetch the most authoritative sources directly to verify their content.

### Assistant | 2026-06-15T02:15:10.453Z

[tool_use: WebFetch]

### Assistant | 2026-06-15T02:15:11.439Z

[tool_use: WebFetch]

### User | 2026-06-15T02:15:30.894Z

[tool_result] # Key Concepts for Events in Fusion 360 API

## Event Fundamentals

Events are essential for custom Fusion commands. As the documentation states: "Events allow you to receive notifications when specific actions occur within Fusion."

## Handler Implementation

To implement an event, developers must add a handler function and connect it to the event. The documentation explains: "Fusion will call yo
... [+1013 chars truncated]

### User | 2026-06-15T02:15:30.897Z

[tool_result] # Key Fusion 360 API Concepts

## Objects & Object Model

The API uses an object-oriented structure where Fusion entities map to API objects. As stated: "an extrusion in a Fusion model is represented in the API by the ExtrudeFeature object."

Objects are accessed through a hierarchical structure: "The Application object, at the top level, represents all of Fusion. The Application object provides a
... [+1170 chars truncated]

### Assistant | 2026-06-15T02:15:34.124Z

[tool_use: WebFetch]

### Assistant | 2026-06-15T02:15:35.168Z

[tool_use: WebFetch]

### User | 2026-06-15T02:15:51.891Z

[tool_result] # Custom Features in Fusion 360 API

Custom features enable grouping multiple standard Fusion features under a single timeline node, providing a cleaner interface for parametric design automation.

## Key Functionality

**Timeline Grouping:**
"A custom feature timeline node has its own icon, name, and behaves like all other feature nodes, which allow you to delete, suppress, reorder, rename, and e
... [+1098 chars truncated]

### User | 2026-06-15T02:15:59.268Z

[tool_result] # Fusion Automation API Capabilities

Based on the announcement, here are the key offerings:

**Core Functionality:**
The API enables cloud-scale automation by allowing tasks "traditionally scripted in your Fusion desktop client can now run at scale in the cloud without requiring any user interaction."

**Design Capabilities:**
- "Design Customisation" - exposing key parameters for product customi
... [+810 chars truncated]

### Assistant | 2026-06-15T02:16:02.714Z

[tool_use: WebFetch]

### Assistant | 2026-06-15T02:16:03.416Z

[tool_use: WebSearch]

### User | 2026-06-15T02:16:07.882Z

[tool_result] # ExportManager API Sample for F3D Export

## F3D Export Demonstration

The sample shows exporting components to Fusion Archive format using this approach:

**Python excerpt:**
```python
archOptions = exportMgr.createFusionArchiveExportOptions(fileName, comp)
exportMgr.execute(archOptions)
```

**C++ excerpt:**
```cpp
Ptr<FusionArchiveExportOptions> archOptions = 
    exportMgr->createFusionArchiv
... [+588 chars truncated]

### User | 2026-06-15T02:16:36.136Z

[tool_result] Web search results for query: "Autodesk Fusion API parametric modeling timeline history features scripting advanced 2023 2024"

Links: [{"title":"The Fusion 360 Timeline: Your Parametric Design History","url":"https://foro3d.com/en/2026/january/the-fusion-360-timeline-your-parametric-design-history.html"},{"title":"Parametric timeline in Fusion","url":"https://help.autodesk.com/cloudhelp/ENU/Fusio
... [+6217 chars truncated]

### Assistant | 2026-06-15T02:16:39.910Z

[tool_use: WebFetch]

### Assistant | 2026-06-15T02:16:40.996Z

[tool_use: WebFetch]

### User | 2026-06-15T02:16:54.301Z

[tool_result] # Autodesk Fusion API Capabilities

According to the page, the Fusion API enables developers to:

**Automation and scripting:**
"develop scripts, add-ins, and applications that enhance and personalize the software functionality"

**Integration capabilities:**
The API allows you to "automate tasks, introduce new features, integrate with external systems, and much more."

The page describes Fusion i
... [+243 chars truncated]

### User | 2026-06-15T02:16:56.917Z

[tool_result] # Creating Custom Fusion Commands via the API

## Transaction Grouping

The page emphasizes that work performed in the execute event handler is automatically grouped into a single transaction:

> "everything you do in the execute event handler is bundled within a single transaction and can be undone with one undo"

This contrasts with direct API calls, where "every API call that causes a change wi
... [+970 chars truncated]

### Assistant | 2026-06-15T02:17:03.278Z

[tool_use: WebFetch]

### User | 2026-06-15T02:17:14.779Z

[tool_result] Based on the provided documentation, the content does not discuss garbage collection, handler lifetime, or threading concerns. 

The document addresses these Python-specific topics instead:

1. **Reference Arguments**: "Python does not support output or 'by reference' arguments." Functions returning multiple values use tuples instead.

2. **Collections and Arrays**: Collections support "standard P
... [+929 chars truncated]

### Assistant | 2026-06-15T02:17:17.781Z

Now I have verified sufficient sources. Let me compile the structured output.

### Assistant | 2026-06-15T02:17:51.991Z

[tool_use: StructuredOutput]

### User | 2026-06-15T02:18:23.259Z

[tool_result] Structured output provided successfully
