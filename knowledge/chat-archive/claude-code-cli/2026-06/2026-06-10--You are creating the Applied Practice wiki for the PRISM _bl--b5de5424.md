---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"blueprint-vision\" gala"
date: "2026-06-10"
first_ts: "2026-06-10T09:56:08.750Z"
last_ts: "2026-06-10T10:01:38.555Z"
cwd: "H:\\prism"
messages: 58
user_msgs: 23
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-ac0080e2e4bbc5015.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "blueprint-vision" gala

> **claude-code-cli** | 2026-06-10 | 58 msgs (23 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-ac0080e2e4bbc5015.jsonl`

## Transcript

### User | 2026-06-10T09:56:08.750Z

You are creating the Applied Practice wiki for the PRISM "blueprint-vision" galaxy (owner: xray): knowledge/wiki/blueprint-vision/blueprint-vision-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE layer -- the hard-won "tribal knowledge" a world-class blueprint-vision expert has that pure theory does not teach: common FAILURE MODES, GOTCHAS, and TECHNIQUE DECISIONS. This is DISTINCT from blueprint-vision-foundations.md (theory) and blueprint-vision-source-atlas.md (link directory). Read both first so you do not repeat them -- this entry is "what goes wrong and how an expert avoids it."

FOCUS for blueprint-vision: drawing-reading + inspection practitioner gotchas: GD&T datum-reference-frame interpretation, MMC/LMC bonus tolerance, tolerance-stack pitfalls, projected/auxiliary view reading, title-block/revision traps, OCR/machine-vision failure-modes on noisy or hand-marked scans. Free: NIST GD&T/metrology, university metrology courses, ASME practical primers.
Non-cutting galaxy: qualitative practitioner technique + gotchas. Leave any specific dimensional/tolerance numbers owner-gated unless they are a published standard's structural fact.

ABSOLUTE RULES (R12 honesty -- a small honest set of cited gotchas beats a large fabricated one):
1. You may ONLY state a practitioner claim you CONFIRM by WebFetch on a reputable free/legal source (vendor technical guide, university course/lab manual, NIST/OSHA, reputable practitioner site like CNCCookbook / Harvey In The Loupe / GcodeTutor / Machining Doctor, NPTEL, open textbook). Never fabricate. If a fetch fails, retry once then drop the claim.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sections (e.g. "## Common failure modes", "## Technique decisions", "## Setup & fixturing gotchas", "## Verification"). Each = the gotcha + WHY + the expert's avoidance, with the source cited inline.
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: blueprint-v
... [+768 chars truncated]

### Assistant | 2026-06-10T09:56:14.547Z

I'll create the Applied Practice wiki for the blueprint-vision galaxy. Let me first read the two sibling files to avoid repeating them, then verify practitioner claims via WebFetch.

### Assistant | 2026-06-10T09:56:14.771Z

[tool_use: Glob]

### User | 2026-06-10T09:56:26.559Z

[tool_result] knowledge\wiki\blueprint-vision\blueprint-vision-foundations.md
knowledge\wiki\blueprint-vision\blueprint-vision-source-atlas.md

### Assistant | 2026-06-10T09:56:28.836Z

Both sibling files exist. Let me read them.

### Assistant | 2026-06-10T09:56:29.804Z

[tool_use: Read]

### Assistant | 2026-06-10T09:56:29.976Z

[tool_use: Read]

### User | 2026-06-10T09:56:31.406Z

[tool_result] 1	---
2	title: Blueprint-Vision Open Source Atlas
3	galaxy: blueprint-vision
4	owner_slot: xray
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas (2026-06-10)"
7	verification_method: "Each URL below was fetched (WebFetch) and confirmed to resolve to live, on-topic, free/legal content for engineering drawings / GD&T / machine vision / metrology. URLs that returned 404/403/ECONNREFUSED or
... [+8353 chars truncated]

### User | 2026-06-10T09:56:31.689Z

[tool_result] 1	---
2	title: Blueprint-Vision Foundations (engineering-drawing OCR + GD&T extraction)
3	galaxy: blueprint-vision
4	owner_slot: xray
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPEN pass 2 (2026-06-09) — free college courses (MIT OCW) + free textbook (Szeliski) + gov reports (NIST); DEEPEN pass 3 (2026-06-10) — public-domain drafting text (archive.org
... [+29621 chars truncated]

### Assistant | 2026-06-10T09:56:36.353Z

I have a clear picture of both siblings. Foundations covers theory (GD&T families, FCF structure, MMC/LMC definitions, projection symbol, NIST digital thread, machine-vision/signal-processing/optics/statistics theory). The atlas is a link directory. This Applied Practice entry must be the practitioner gotchas layer — "what goes wrong and how an expert avoids it."

Let me verify practitioner claims via WebFetch from reputable free sources. I'll fetch several in parallel.

### Assistant | 2026-06-10T09:56:39.186Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:56:41.101Z

[tool_use: WebFetch]

### User | 2026-06-10T09:56:41.858Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:56:45.380Z

[tool_result] # Datum Reference Frame Gotchas: Order Matters

## Why Datum Order is Critical

The sequence of datums in a feature control frame fundamentally changes how parts are inspected and whether they'll function correctly.

**The ordering principle:** "The order of the datum features being referenced in a feature control frame is important because it will dictate which features take precedence when locki
... [+1267 chars truncated]

### Assistant | 2026-06-10T09:56:49.304Z

Datum reference frame confirmed. Bonus tolerance URL 404'd — let me retry once with a different known-good URL on the same topic, and fetch more sources in parallel.

### Assistant | 2026-06-10T09:56:52.160Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:56:54.629Z

[tool_use: WebFetch]

### User | 2026-06-10T09:56:59.120Z

[tool_result] # Bonus Tolerance and MMC: Critical Inspector Gotchas

## When Bonus Tolerance Applies

Bonus tolerance only activates when MMC or LMC modifiers are explicitly called out. The page states: "When there is not call out to Maximum Material Condition or Least Material Condition, the part, by default, is measured regardless of feature size (RFS)."

Under RFS conditions, **no bonus tolerance exists**—in
... [+929 chars truncated]

### User | 2026-06-10T09:57:01.611Z

[tool_result] # Common Practitioner Gotchas with Position Tolerance

## The Diameter Symbol Critical Mistake

The most significant error engineers make involves misunderstanding the tolerance zone shape. When position is called WITHOUT a diameter symbol, the zone becomes a square formed by two parallel planes. This creates a dangerous illusion of acceptability.

**Why this matters:** The website emphasizes that
... [+1224 chars truncated]

### Assistant | 2026-06-10T09:57:06.078Z

Three strong gotchas confirmed. Let me fetch more sources covering tolerance stacks, hidden lines/view reading, title block traps, and OCR/machine-vision failure modes.

### Assistant | 2026-06-10T09:57:08.448Z

[tool_use: WebFetch]

### User | 2026-06-10T09:57:09.411Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:57:10.928Z

[tool_use: WebFetch]

### User | 2026-06-10T09:57:18.261Z

[tool_result] # GD&T Reading Gotchas for Machinists

Based on the Machining Doctor reference guide, here are key practitioner challenges:

## Basic Dimensions Misconception

The guide states that **"Basic Dimensions describe a feature's theoretically exact location, orientation, or size. Therefore, they have no size tolerance associated with them."**

Common mistake: Machinists sometimes treat basic dimensions 
... [+1035 chars truncated]

### Assistant | 2026-06-10T09:57:21.309Z

Basic dimensions gotcha confirmed via Machining Doctor. Tolerance stack URL 404'd — let me retry on a different source, and fetch view-reading/title-block/OCR sources.

### Assistant | 2026-06-10T09:57:24.222Z

[tool_use: WebFetch]

### User | 2026-06-10T09:57:25.892Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:57:26.195Z

[tool_use: WebFetch]

### User | 2026-06-10T09:57:29.208Z

[tool_result] I cannot extract the requested information about engineering drawing practices from this webpage content. 

The provided page is a homepage for CNC Cookbook that lists general topic areas (CAD/CAM Software, CNC Routers, Speeds and Feeds, G-Wizard) with links to those sections, but it doesn't contain any substantive content about reading engineering drawings, title blocks, scaling warnings, toleran
... [+194 chars truncated]

### Assistant | 2026-06-10T09:57:31.759Z

Both missed. Let me find the correct CNCCookbook drawing article and a working tolerance stack source. Let me search.

### Assistant | 2026-06-10T09:57:32.252Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T09:57:32.702Z

[tool_use: WebSearch]

### User | 2026-06-10T09:58:01.459Z

[tool_result] Web search results for query: "engineering drawing title block default general tolerance "do not scale" machinist guide"

I'll search for information about engineering drawing title blocks, default general tolerances, and related machinist guidelines.

Links: [{"title":"Engineering Drawing Callouts: 15+ Symbols Explained | RivCut","url":"https://www.rivcut.com/blog/drawing-callouts-guide"},{"title
... [+7011 chars truncated]

### User | 2026-06-10T09:58:17.948Z

[tool_result] Web search results for query: "tolerance stack-up worst case vs RSS statistical method GD&T guide"

I'll search for information on tolerance stack-up methods comparing worst case versus RSS statistical approaches in GD&T.

Links: [{"title":"Tolerance Stack-Up Analysis — Worst Case vs RSS (Statistical) Methods - *ficient design","url":"https://ficientdesign.com/tolerance-stack-up-analysis/"},{"titl
... [+9225 chars truncated]

### Assistant | 2026-06-10T09:58:22.409Z

Strong material on title block / general tolerance / UOS precedence / do-not-scale, and tolerance stack-up worst-case vs RSS. Let me fetch the primary sources to confirm the exact statements I'll cite (search summaries aren't a single verifiable URL). I'll fetch the MakerStage drawing guide, the smlease tolerance stack page, and a machine-vision/OCR failure-modes source.

### Assistant | 2026-06-10T09:58:24.847Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:58:26.866Z

[tool_use: WebFetch]

### User | 2026-06-10T09:58:27.478Z

[tool_result] certificate has expired

### User | 2026-06-10T09:58:33.853Z

[tool_result] # Practitioner Gotchas: Reading Engineering Drawings

## 1. Title Block Default Tolerances & "Unless Otherwise Specified"

The drawing establishes a fallback tolerance rule: **"Any dimension without an explicit tolerance uses these values."** This "Unless Otherwise Specified" (UOS) note typically appears in the title block and sets blanket tolerances like ±0.005" for 2-place decimals or ±0.010" fo
... [+1798 chars truncated]

### Assistant | 2026-06-10T09:58:37.517Z

MakerStage confirmed the title-block / UOS / precedence / do-not-scale / revision gotchas directly. The smlease cert expired — I already have the worst-case-vs-RSS material confirmed via the FIRGELLI/ficient sources in the search; let me fetch one of those directly to nail the citation, plus an OCR/machine-vision failure-modes source and a view-reading source.

### Assistant | 2026-06-10T09:58:40.855Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:58:44.411Z

[tool_use: WebFetch]

### User | 2026-06-10T09:58:46.862Z

[tool_result] # Tolerance Stack-Up: Practitioner Facts

## Worst-Case Method

The worst-case approach uses arithmetic summation: **"WC = Σ|toli|"** where each component's tolerance is added directly. This method is conservative—it ensures 100% of assemblies will fit if manufactured within spec. However, this conservatism carries a manufacturing cost penalty, as it often requires tighter individual component tol
... [+890 chars truncated]

### User | 2026-06-10T09:58:50.898Z

[tool_result] # Tesseract OCR Quality Gotchas

**Minimum Resolution & Capital Letter Height**
Tesseract performs optimally at "a DPI of at least 300 dpi." One practitioner conducted testing on "Optimal image resolution" with specific recommendations for capital letter height in pixels, though exact pixel values aren't detailed in this documentation.

**Binarization Failures**
"Tesseract does this internally (Ot
... [+1019 chars truncated]

### Assistant | 2026-06-10T09:59:06.294Z

Excellent — tolerance stack-up and Tesseract OCR failure-modes both confirmed with quotable specifics. Now let me get a view-reading gotcha (auxiliary/projected/hidden views) and a metrology/inspection gotcha. Let me fetch the public-domain drafting text section on auxiliary/sectional views, and a NIST or university source on CMM datum measurement. I'll try the French & Svensen text (known reachable) for auxiliary/section views and an OSHA/NIST inspection angle.

### Assistant | 2026-06-10T09:59:09.608Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:59:12.943Z

[tool_use: WebFetch]

### User | 2026-06-10T09:59:16.882Z

[tool_result] # Orthographic Projection: Foreshortening, Auxiliary Views, Sections, and Hidden Lines

## Foreshortening of Inclined Surfaces

The textbook explains that surfaces at angles to the projection planes appear distorted:

> "A surface inclined to a plane of projection shows foreshortened" (Art. 25, Principle 3)

When an inclined surface appears in standard views, its true dimensions cannot be measured
... [+1122 chars truncated]

### User | 2026-06-10T09:59:20.219Z

[tool_result] # Projected Tolerance Zone: Key Practitioner Gotchas

## The Core Problem
The most common mistake is **ignoring the projected tolerance zone symbol**, which causes features to pass position tolerance at the surface while still creating interference at mating parts during assembly.

## Why Projection Matters

The symbol indicates that "the tolerance zone of a feature is to be assessed beyond the su
... [+1180 chars truncated]

### Assistant | 2026-06-10T09:59:29.609Z

Both confirmed — auxiliary views/foreshortening/hidden lines from the public-domain text, and projected tolerance zone gotcha. I now have a strong set of WebFetch-confirmed gotchas:

1. Datum order significance + DOF (gdandtbasics datum-reference-frame)
2. Bonus tolerance only with MMC/LMC, never RFS; rejection risk (gdandtbasics MMC)
3. Position diameter symbol: cylindrical vs square zone, 57% loss (gdandtbasics true-position)
4. Basic dimensions theoretically exact, no tolerance, not measured directly (Machining Doctor)
5. Title block default/UOS tolerance; added tolerance supersedes; do-not-scale; revision block (MakerStage)
6. Tolerance stack-up worst-case vs RSS (FIRGELLI)
7. Projected tolerance zone (gdandtbasics)
8. Auxiliary views/foreshortening + hidden lines + sections (French & Svensen public-domain)
9. OCR failure modes: DPI, binarization, noise/borders, deskew (Tesseract docs)

That's 9 distinct sources / well over 8 gotchas. Let me get one more for OCR on hand-marked/noisy scans specifically and one on surface finish reading to round out to ~12-14 cited claims. Let me fetch a source on redlines/hand-markups and one on surface texture symbol reading.

### Assistant | 2026-06-10T09:59:32.627Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:59:36.548Z

[tool_use: WebFetch]

### User | 2026-06-10T09:59:38.115Z

[tool_result] # Surface Finish Roughness Callouts: Key Practitioner Facts

I've reviewed the Wikipedia article on surface finish, but it doesn't contain the specific practitioner knowledge you're asking about regarding:

- Ra (arithmetic average roughness) as the most common parameter
- How surface texture symbols specify lay direction and machining allowance
- Why single values typically represent maximums
- R
... [+685 chars truncated]

### User | 2026-06-10T09:59:41.534Z

[tool_result] # Image Thresholding: Global vs. Adaptive Approaches

## Why Global Thresholding Fails with Uneven Illumination

Simple thresholding applies the same threshold value across an entire image. The documentation directly addresses its limitation:

> "if an image has different lighting conditions in different areas. In that case, adaptive thresholding can help."

This constraint makes global thresholdi
... [+780 chars truncated]

### Assistant | 2026-06-10T09:59:54.453Z

Surface finish Wikipedia didn't yield the specific claim — I'll drop it (per rule, don't fabricate). The OpenCV adaptive-thresholding gotcha is confirmed and is a strong machine-vision failure-mode for unevenly-lit/photographed drawings — a perfect complement to the Tesseract binarization point. That brings me to 10 distinct sources and ~13 cited gotchas, well within the 8-14 target.

I have more than enough verified material. Let me write the file now.

### Assistant | 2026-06-10T10:01:26.897Z

[tool_use: Write]

### User | 2026-06-10T10:01:32.588Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\blueprint-vision\blueprint-vision-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:01:38.555Z

The file was created successfully. No file-claim hook blocked the Write. The advisory graph context confirms this is a distinct new asset (the related nodes are the galaxy MEMORY, the extraction-confidence entry, and the galaxy node — none is an Applied Practice entry, so no duplication).

GALAXY: blueprint-vision
FILE: knowledge/wiki/blueprint-vision/blueprint-vision-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 14
SOURCES: 10
NUMERICS_LEFT_GATED: yes
NOTE: A position callout missing the diameter symbol silently becomes a square zone and discards ~57% of the tolerance — and a hole passing that square zone can still be functionally unusable.
