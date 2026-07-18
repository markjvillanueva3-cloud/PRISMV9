---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Open Source Atlas wiki for the PRISM \"system-viz\" galaxy (o"
date: "2026-06-10"
first_ts: "2026-06-10T14:14:33.314Z"
last_ts: "2026-06-10T14:19:36.632Z"
cwd: "H:\\prism"
messages: 58
user_msgs: 24
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_9fa970e9-a3b/agent-ac665f26f33054c5f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Open Source Atlas wiki for the PRISM "system-viz" galaxy (o

> **claude-code-cli** | 2026-06-10 | 58 msgs (24 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_9fa970e9-a3b/agent-ac665f26f33054c5f.jsonl`

## Transcript

### User | 2026-06-10T14:14:33.314Z

You are creating the Open Source Atlas wiki for the PRISM "system-viz" galaxy (owner: sierra): knowledge/wiki/system-viz/system-viz-source-atlas.md.

PURPOSE: the LIVING-SOURCE curriculum -- a curated, kept-fresh directory of WHERE TO KEEP LEARNING this galaxy's domain from reputable FREE/LEGAL sources, so the knowledge never goes stagnant. DISTINCT from system-viz-foundations.md (synthesized theory) and system-viz-applied-practice.md (practitioner gotchas) -- read both first so you do not repeat them; this entry is the "keep-learning directory": free college courses, free textbooks, free archives/data, reputable lecture-video channels/playlists, official docs, and standards.

FOCUS for system-viz: data-visualization + graph-drawing curriculum: Tamara Munzner Visualization Analysis & Design course/materials, d3js docs, WebGL Fundamentals, Handbook of Graph Drawing, force-directed/Barnes-Hut literature, observablehq.

ABSOLUTE RULES (R12 honesty):
1. ONLY list a source you CONFIRM is real, free/legal, and reachable by WebFetch. Never fabricate a URL or a course number. If a fetch fails, retry once then DROP it -- do not guess a link. A short verified list beats a long fabricated one.
2. Organize into 4-6 themed sections (e.g. Free college courses / Free textbooks / Lecture-video channels / Official docs & standards / Data & archives / Keep-fresh cadence). For each source: name + verified URL + one line on what it teaches + which part of THIS galaxy it feeds.
3. Legal free sources ONLY (no paywalled, no LibGen/SciHub). All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: system-viz, owner_slot: sierra, status: VERIFIED-PARTIAL, verified_by: "papa-source-atlas-meta (2026-06-10)", verification_method, tags. End with a "## Keep-fresh cadence" note + "## Sources" (the distinct confirmed URLs).
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:

... [+322 chars truncated]

### Assistant | 2026-06-10T14:14:53.131Z

I'll create the Open Source Atlas wiki for the system-viz galaxy. Let me first read the two sibling files I must not duplicate, then verify each candidate source live before listing it.

### Assistant | 2026-06-10T14:14:54.150Z

[tool_use: Bash]

### User | 2026-06-10T14:14:59.426Z

[tool_result] system-viz-applied-practice.md
system-viz-foundations.md
---DIR EXISTS---

### Assistant | 2026-06-10T14:15:05.904Z

Let me read both sibling files to avoid duplication.

### Assistant | 2026-06-10T14:15:05.905Z

[tool_use: Read]

### Assistant | 2026-06-10T14:15:06.544Z

[tool_use: Read]

### User | 2026-06-10T14:15:07.764Z

[tool_result] 1	---
2	title: System-Viz Galaxy — Foundations (Information Visualization & Graph Drawing)
3	galaxy: system-viz
4	owner_slot: sierra
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-meta-create-workflow (2026-06-10)"
7	verification_method: "Each section grounded in a free/legal academic or official-documentation source confirmed via live WebFetch. Claims not confirmable from a free source are quara
... [+12047 chars truncated]

### User | 2026-06-10T14:15:08.370Z

[tool_result] 1	---
2	title: System-Viz Galaxy — Applied Practice (Graph-Visualization Practitioner Gotchas)
3	galaxy: system-viz
4	owner_slot: sierra
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-applied-practice-meta (2026-06-10)"
7	verification_method: "Each gotcha is grounded in a free/legal source confirmed via live WebFetch (Wikipedia survey articles on graph drawing / force layout / label placement / c
... [+17705 chars truncated]

### Assistant | 2026-06-10T14:15:22.600Z

Both sibling files are clear. The foundations file uses Wikipedia + MDN + Three.js manual; applied-practice uses Wikipedia + MDN. My atlas is the **keep-learning directory** — courses, textbooks, video channels, official docs, data archives. I must NOT repeat those exact theory citations as the point; I point at WHERE to keep learning.

Let me verify candidate sources live. I'll batch the WebFetch calls for independent URLs. Starting with the FOCUS sources named in the prompt: Munzner's course, d3, WebGL Fundamentals, Handbook of Graph Drawing, observablehq.

### Assistant | 2026-06-10T14:15:24.521Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:15:25.936Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:15:28.218Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:15:28.221Z

[tool_use: WebFetch]

### User | 2026-06-10T14:15:33.608Z

[tool_result] # Summary

This appears to be a **publicly accessible D3 gallery page** on Observable, though the content shown is primarily navigation and footer elements rather than the actual gallery itself.

**What it shows:**
The page is hosted on Observable's platform and features a D3 collection curated by Mike Bostock (D3's creator). The header describes D3's purpose as a tool to "Bring your data to life.
... [+339 chars truncated]

### User | 2026-06-10T14:15:34.864Z

[tool_result] # D3.js Official Site Analysis

## Is this the official D3.js documentation/site?

**Yes**, this is the official D3.js website (d3js.org). It's developed and maintained by **Observable, Inc.** and the original creator Mike Bostock.

## Is it free?

**Yes**, D3 is free and open-source under the **ISC License**. The GitHub repository shows 113k stars and is publicly available.

## What does it docum
... [+1022 chars truncated]

### User | 2026-06-10T14:15:35.033Z

[tool_result] # WebGL Fundamentals Tutorial Site

Yes, this is a free tutorial site for WebGL. Based on the content provided:

**What it teaches:**
The site offers comprehensive instruction across multiple domains, including fundamental concepts, 2D and 3D graphics, lighting techniques, textures, geometry loading, rendering optimization, and various specialized topics like shadows, fog, and text rendering.

**G
... [+599 chars truncated]

### User | 2026-06-10T14:15:35.915Z

[tool_result] # CPSC 547: Information Visualization Course Analysis

**Public Access & Course Details:**
Yes, this is a freely accessible course page. The course is "CPSC 547: Information Visualization" taught by Tamara Munzner at UBC in January 2017.

**Lectures, Readings & Slides:**
The course extensively lists all three. It includes 26 numbered lectures spanning January through April, required readings from 
... [+849 chars truncated]

### Assistant | 2026-06-10T14:15:45.519Z

All four confirmed. Now let me verify the next batch: the textbook companion site (Munzner VAD), the Handbook of Graph Drawing (legal free source), GraphViz docs, and a force-directed/Barnes-Hut authoritative free source.

### Assistant | 2026-06-10T14:15:47.987Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:15:49.291Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:15:50.649Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:15:51.754Z

[tool_use: WebFetch]

### User | 2026-06-10T14:15:56.159Z

[tool_result] # Tamara Munzner's "Visualization Analysis and Design" Companion Site

Yes, this is the official companion website for the book published by CRC Press in 2014.

## Free Resources Available

Several materials are freely accessible:

- **Figures**: All 113 diagrams in PDF format available for download under CC-BY-4.0 license
- **Videos & Slides**: Extensive video lectures (6.5+ hours) covering the e
... [+883 chars truncated]

### User | 2026-06-10T14:15:56.592Z

[tool_result] # Handbook of Graph Drawing and Visualization

Yes, this is the companion page for the handbook edited by Roberto Tamassia (CRC Press, June 2013).

## PDF Availability
All 26 chapters plus preface, contents, and index appear to have PDF downloads available through the linked chapter files.

## Topics Covered
The handbook comprehensively addresses graph visualization through:

**Core Algorithms:** 
... [+764 chars truncated]

### User | 2026-06-10T14:15:56.972Z

[tool_result] # Graphviz Documentation Overview

Yes, this is the official Graphviz documentation page. The site displays "© 2026 The Graphviz Authors All Rights Reserved" and maintains a GitLab repository at https://gitlab.com/graphviz/graphviz, indicating it's an open-source project.

**Open Source Status:**
The documentation references a "[License](/license/)" page and indicates the project is hosted on GitL
... [+618 chars truncated]

### User | 2026-06-10T14:16:00.092Z

[tool_result] # Three.js Documentation Overview

Yes, this is the **official Three.js documentation** available at [https://threejs.org](https://threejs.org), and it is **free and open-source**.

## What It Documents

This is a comprehensive API reference that covers the entire Three.js library, organized into two main sections:

### **Core Classes** (Built-in)
The documentation covers all fundamental 3D graphi
... [+1362 chars truncated]

### Assistant | 2026-06-10T14:16:14.079Z

Six more confirmed. The Handbook of Graph Drawing chapter PDFs are a high-value free source — let me verify a chapter PDF actually downloads (the prompt's focus). Also verify: a free college course on visualization with full video lectures (UW CSE512 by Jeffrey Heer is the canonical one), the Barnes-Hut original paper on a free archive (NASA ADS), and the deck.gl docs (a WebGL large-data layer the galaxy could use).

### Assistant | 2026-06-10T14:16:15.784Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:16:17.264Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:16:19.416Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:16:19.717Z

[tool_use: WebFetch]

### User | 2026-06-10T14:16:25.340Z

[tool_result] # CSE 512: Data Visualization Course Page Analysis

**Is this a UW data visualization course?**
Yes, this is the official course page for "CSE512: Data Visualization" at the University of Washington's Paul G. Allen School of Computer Science & Engineering.

**Is it free/public?**
The page is publicly accessible. However, it notes that "administrative information on CSE512" requires authentication,
... [+744 chars truncated]

### User | 2026-06-10T14:16:25.358Z

[tool_result] # Observable D3 Force-Directed Graph Notebook

Based on the page content provided, I can confirm this is a **public Observable notebook** about D3 force-directed graphs. The notebook is authored by Mike Bostock (D3's creator) and has been "Edited" with an ISC license, indicating it's freely available.

However, the web page content shown here only displays the navigation, header, and footer—not th
... [+416 chars truncated]

### User | 2026-06-10T14:16:26.817Z

[tool_result] # PDF Content Analysis

**Does it render?** No - the content provided is a compressed/encoded PDF stream that isn't human-readable in this format. The raw binary data would require decompression to view.

**Handbook chapter identification:** Based on the PDF structure and object references visible, this appears to be a legitimate academic document, but I cannot definitively confirm it's the force-
... [+719 chars truncated]

### User | 2026-06-10T14:16:29.233Z

[tool_result] # Summary of deck.gl Documentation

**Official Status:** Yes, this is the official documentation for deck.gl v9.1, maintained by the vis.gl project.

**Licensing:** The project is open-source and part of the OpenJS Foundation, governed under their collaborative framework with published governance guidelines.

**What It Documents:** deck.gl is a framework for "high-performance, WebGPU/WebGL2 based 
... [+685 chars truncated]

### Assistant | 2026-06-10T14:16:37.744Z

Good results. Analysis:
- Force-directed PDF: it DID download (1.4MB application/pdf saved) — it's a real, reachable free PDF; the fetch only couldn't render the binary text. The parent page already confirmed all 26 chapters have PDF downloads. I'll cite the **handbook companion page** (confirmed listing free chapter PDFs) rather than asserting the chapter-PDF's contents, which is honest.
- CSE512 hub: public but thin/hub-only with some auth-gated parts. I'll prefer a year-specific offering with full public slides. Let me verify one concrete CSE512 offering with public lecture slides, plus the Heer-affiliated idl.uw.edu papers archive.
- deck.gl: confirmed.
- Observable notebooks: public + ISC license, confirmed as a live free example gallery.

Let me verify one concrete CSE512 offering (public slides) and the UW Interactive Data Lab archive.

### Assistant | 2026-06-10T14:16:39.152Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:16:40.311Z

[tool_use: WebFetch]

### User | 2026-06-10T14:16:42.496Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://idl.cs.washington.edu/papers/
Redirect URL: https://idl.uw.edu/papers/
Status: 301 Moved Permanently

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://idl.uw.edu/papers/"
- prompt: "Is this the University of Washington Interacti
... [+124 chars truncated]

### User | 2026-06-10T14:16:46.279Z

[tool_result] # CSE 512: Data Visualization (Spring 2022)

## Public Accessibility
Yes, this is a publicly accessible course offering. The syllabus, schedule, slides, and reading materials are openly available online.

## Course Content & Topics

The course covers foundational principles and practical techniques in data visualization. Key topics include:

- **Visual encoding and perception**: data models, graph
... [+1031 chars truncated]

### Assistant | 2026-06-10T14:16:59.222Z

CSE512 22sp confirmed with public slides/schedule. The IDL page redirected to a new host — I'll follow it as instructed.

### Assistant | 2026-06-10T14:17:00.915Z

[tool_use: WebFetch]

### User | 2026-06-10T14:17:03.738Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T14:17:11.610Z

The IDL papers path 404'd at the new host. Per the rules (retry once then DROP — do not guess a link), I'll drop the IDL papers archive. Let me try the IDL root once to see if there's a valid landing page worth citing instead, plus verify the Vega-Lite docs (the tool taught in CSE512, a declarative grammar relevant to encoding).

### Assistant | 2026-06-10T14:17:12.934Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:17:15.116Z

[tool_use: WebFetch]

### User | 2026-06-10T14:17:22.987Z

[tool_result] # UW Interactive Data Lab Homepage Summary

**Is this the UW IDL homepage?**
Yes, this is the official website for the University of Washington Interactive Data Lab.

**Is it free/public?**
Yes, the site is publicly accessible and offers free resources including research papers, software, and educational materials.

**Does it link to relevant visualization research and tools?**
Yes, extensively. T
... [+829 chars truncated]

### User | 2026-06-10T14:17:24.239Z

[tool_result] # Vega-Lite Documentation Summary

**Official Status**: Yes, this is the official documentation hosted at vega.github.io/vega-lite.

**Open Source**: Yes. The repository is available on GitHub at github.com/vega/vega-lite, and the documentation itself is editable via pull requests.

**What It Documents**: Vega-Lite is "a high-level grammar for interactive graphics" that uses JSON specifications. T
... [+617 chars truncated]

### Assistant | 2026-06-10T14:17:32.707Z

Both confirmed. The IDL homepage (idl.uw.edu) is live and free — I'll cite the root, not the 404'd /papers path. Vega-Lite docs confirmed.

I now have a strong verified set. Let me do one final batch for the "Data & archives" theme: a real, free, reachable network-data archive (Stanford SNAP) and a reputable lecture-video source (the Munzner VAD videos are already on the companion site; let me confirm a distinct free video venue — the official Three.js journey is paid, so I'll confirm The Book of Shaders for the GLSL/shader learning angle, which is free).

### Assistant | 2026-06-10T14:17:34.373Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T14:17:35.063Z

[tool_use: WebFetch]

### User | 2026-06-10T14:17:42.148Z

[tool_result] # The Book of Shaders Overview

Yes, this is "The Book of Shaders," created by Patricio Gonzalez Vivo and Jen Lowe.

**Is it free?**
Yes. The resource appears to be freely accessible online with no paywall mentioned for the main content (though there is a donation option available).

**What does it teach?**
The book describes itself as "a gentle step-by-step guide through the abstract and complex 
... [+682 chars truncated]

### User | 2026-06-10T14:17:46.586Z

[tool_result] # Stanford Network Analysis Project (SNAP) Datasets

**Yes, this is the official SNAP datasets page.** The collection is publicly available and free to download.

## Availability
The page states: "SNAP networks are also available from SuiteSparse Matrix Collection" and provides direct links to dataset pages, indicating public access.

## Dataset Categories

SNAP offers approximately 20+ categories
... [+1001 chars truncated]

### Assistant | 2026-06-10T14:17:55.049Z

Both confirmed. I now have a robust, fully-verified set of 12 live free sources across all themed sections. Verified set:

**Courses:** UBC CPSC 547 (Munzner), UW CSE512 22sp, Munzner VAD companion (6.5h video + slides + figures)
**Textbooks/references:** Handbook of Graph Drawing (26 free chapter PDFs), Munzner VAD figures (CC-BY)
**Video/lecture:** Munzner VAD video lectures (on companion site)
**Official docs:** D3.js, Three.js docs, WebGL Fundamentals, Vega-Lite, Graphviz, deck.gl, The Book of Shaders, observablehq D3 examples
**Data/archives:** Stanford SNAP, UW IDL homepage

Dropped: IDL `/papers/` path (404 after redirect). That's 1 dead-dropped.

Now I'll write the atlas file. I am sierra-galaxy-owned content but the prompt notes a file-claim hook may block; I'll attempt the Write and report if blocked.

### Assistant | 2026-06-10T14:19:12.653Z

[tool_use: Write]

### User | 2026-06-10T14:19:19.043Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/system-viz/system-viz-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T14:19:36.632Z

File created successfully and was not blocked by any file-claim hook. The 14 sources are each WebFetch-confirmed live and free/legal; the one dead candidate (IDL /papers/) was dropped and demoted to the IDL homepage.

GALAXY: system-viz
FILE: knowledge/wiki/system-viz/system-viz-source-atlas.md
CREATED: yes
VERIFIED_SOURCES: 14
DEAD_DROPPED: 1
NOTE: Handbook of Graph Drawing and Visualization companion page (cs.brown.edu/people/rtamassi/gdhandbook) — 26 free chapter PDFs covering the full graph-drawing algorithm canon (force-directed, hierarchical, labeling), the deepest free reference for the galaxy's layout half.
