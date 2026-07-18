---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "Create the Open Source Atlas wiki for the PRISM \"speed-feed\" galaxy (owner: osca"
date: "2026-06-10"
first_ts: "2026-06-10T09:15:06.889Z"
last_ts: "2026-06-10T09:19:01.595Z"
cwd: "H:\\prism"
messages: 89
user_msgs: 37
assistant_msgs: 52
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-abc35fe89fab433fd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Create the Open Source Atlas wiki for the PRISM "speed-feed" galaxy (owner: osca

> **claude-code-cli** | 2026-06-10 | 89 msgs (37 user / 52 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-abc35fe89fab433fd.jsonl`

## Transcript

### User | 2026-06-10T09:15:06.889Z

Create the Open Source Atlas wiki for the PRISM "speed-feed" galaxy (owner: oscar, domain: metal-cutting mechanics / speeds and feeds physics): knowledge/wiki/speed-feed/speed-feed-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for metal-cutting mechanics / speeds and feeds physics -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/speed-feed/speed-feed-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing pages relevant to metal-cutting mechanics / s
... [+1869 chars truncated]

### Assistant | 2026-06-10T09:15:09.587Z

I'll start by reading the foundations file (R8) and checking the existing corpus to avoid duplication, then verify each candidate link before listing it.

### Assistant | 2026-06-10T09:15:10.550Z

[tool_use: Read]

### Assistant | 2026-06-10T09:15:10.808Z

[tool_use: Read]

### User | 2026-06-10T09:15:13.747Z

[tool_result] 1	---
2	title: Speed-Feed Foundations (verified method + formula-structure facts)
3	galaxy: speed-feed
4	owner_slot: oscar
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09)"
7	verification_method: "Each promoted claim below was confirmed by a live WebFetch of its cited primary source URL; the source page text confirmed the formula STRUCTURE / METHOD as stated. 
... [+32304 chars truncated]

### User | 2026-06-10T09:15:13.904Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-370 of 465 total (26637 tokens, cap 25000). Call Read with offset=371 limit=370 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index
2	
3	> **Generated** by `s
... [+45940 chars truncated]

### Assistant | 2026-06-10T09:15:19.882Z

I have the foundations and the corpus. Now I understand what to avoid duplicating. The foundations already covers MIT 2.810, OpenStax, NASA-HDBK, Open Oregon, Sandvik Coromant pages, Machining Doctor, Harvey Performance. The atlas must curate BROADER LIVING resources: full course SERIES homepages, textbook HOMEPAGES, data PORTALS, lecture-VIDEO series, standards LANDING pages.

Let me verify a curated set of strong living-source candidates. I'll batch the WebFetch calls.

### Assistant | 2026-06-10T09:15:21.786Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:22.784Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:15:22.961Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:25.601Z

[tool_result] # NPTEL Course Confirmation

**Is this an NPTEL course page?** Yes

**Course Title:** "Manufacturing Processes II, IIT Kharagpur"

**Does it cover manufacturing/metal cutting/machining?** Yes

The page clearly identifies this as an NPTEL course offered by IIT Kharagpur with instructors Prof. A.B. Chattopadhyay, Prof. A.K. Chattopadhyay, and Prof. S. Paul. Based on the title "Manufacturing Processe
... [+114 chars truncated]

### Assistant | 2026-06-10T09:15:29.347Z

NPTEL 112105127 resolves (Manufacturing Processes II, IIT Kharagpur). The MIT OCW 2.810 URL 404'd. Let me find the correct MIT OCW course homepage and verify more candidates.

### Assistant | 2026-06-10T09:15:30.752Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:31.390Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:15:32.156Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:15:33.490Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:37.661Z

[tool_result] # Confirmation: NIST Page Assessment

**Is this a NIST page?** Yes

**Division/Topic:** Intelligent Systems Division (part of the Engineering Laboratory)

**Relates to manufacturing/machining/systems?** Yes

---

## Summary

This is an official NIST page for the Intelligent Systems Division, which focuses on "measurement science and standards to speed development, adoption, and integration of lead
... [+608 chars truncated]

### User | 2026-06-10T09:15:40.860Z

[tool_result] # Response

**Yes**, this is the Machining Doctor calculators index/landing page.

The page lists multiple machining calculators across several categories:

**Sample calculator names visible:**
- "Spee_D_octor" (Speed & Feed Calculator)
- "Threa_D_octor" (Thread Calculator)
- Chip Thinning Calculator
- Chip Load Calculator
- Metal Removal Rate Calculator
- Machining Power Calculator
- Surface Fini
... [+217 chars truncated]

### Assistant | 2026-06-10T09:15:45.472Z

Good progress. NIST Intelligent Systems Division (manufacturing landing) and Machining Doctor calculators index both resolve. MIT OCW course-page URLs are 404'ing (the foundations file noted this same redirect-loop issue). Let me find a working MIT OCW course homepage and verify the remaining candidates: data portals, lecture video, standards landing pages.

### Assistant | 2026-06-10T09:15:46.891Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:15:48.784Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:49.158Z

[tool_result] No.

The content provided is from MIT OpenCourseWare's navigation and header section, not a search results page for manufacturing processes. It contains only site navigation elements, a crowdfunding campaign notice, and a warning about external links. There are no course listings visible in this excerpt.

### Assistant | 2026-06-10T09:15:49.766Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:51.476Z

[tool_result] # Response

**Yes.** This is a LibreTexts Engineering bookshelf page featuring free open mechanical engineering textbooks.

Two examples include:

1. **Engineering Statics: Open and Interactive (Baker and Haynes)** - "provides the tools to solve static equilibrium problems for rigid bodies"

2. **Introduction to Engineering Thermodynamics (Yan)** - described as "suitable for a one-term, introducto
... [+37 chars truncated]

### User | 2026-06-10T09:15:53.699Z

[tool_result] # Yes

This is confirmed as the NIST Standard Reference Materials page. 

The page provides **Standard Reference Materials (SRMs)** — over 1,200 certified materials with "well-characterized composition or properties, or both." These serve science and engineering by enabling accurate and compatible measurements across industries including forensics, pharmaceuticals, environmental monitoring, and ma
... [+219 chars truncated]

### Assistant | 2026-06-10T09:15:59.502Z

LibreTexts Engineering bookshelf and NIST SRM both resolve. MIT OCW search/course pages keep failing (consistent with foundations' redirect-loop note). Let me verify the remaining candidates: a working MIT OCW department page, NPTEL machining course, YouTube lecture channels, standards landing pages, and data portals.

### Assistant | 2026-06-10T09:16:00.453Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:02.583Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:02.865Z

[tool_result] No.

The provided content is from the MIT OpenCourseWare homepage/header area, not a course listing page. It contains navigation elements and a warning about external links. There is no Mechanical Engineering department course listing visible, nor any specific course information presented. While the site offers "Free Online Course Materials" according to the banner text, this particular page excer
... [+45 chars truncated]

### User | 2026-06-10T09:16:03.310Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:16:03.661Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:04.391Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:16:10.250Z

MIT OCW, the Sandvik YouTube channel URL, and the ISO committee page all failed. MIT OCW clearly returns only nav-headers to WebFetch regardless of path. ISO.org returns 403 to WebFetch. Let me try alternate working forms: NPTEL (works), a confirmable YouTube channel via /about or @handle, and standards bodies that resolve (ASME, OSHA, NIST eHandbook). Let me batch.

### Assistant | 2026-06-10T09:16:11.585Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:13.582Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:13.996Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:14.634Z

[tool_result] Based on the content provided, I cannot confirm this is the Sandvik Coromant YouTube channel about page because the actual content was truncated and not displayed in full.

**Answer: Unable to confirm - No**

The webpage excerpt shows only the title "Sandvik Coromant - YouTube" but lacks the substantive channel information needed to verify it hosts machining and metal cutting content. To properly 
... [+95 chars truncated]

### User | 2026-06-10T09:16:16.555Z

[tool_result] **Yes.**

This is the NIST/SEMATECH e-Handbook of Statistical Methods landing page, as confirmed by the title tag: "NIST/SEMATECH e-Handbook of Statistical Methods."

However, the content provided does not explicitly describe the handbook's coverage. The page structure shows it uses frames to organize navigation and index content, but the actual subject matter describing statistical methods (proce
... [+139 chars truncated]

### User | 2026-06-10T09:16:17.027Z

[tool_result] Yes, this is an NPTEL course page.

**Course Title:** "Manufacturing Processes II, IIT Kharagpur"

**Does it cover manufacturing/metal cutting/machining processes?** Yes.

The course is offered by IIT Kharagpur under the National Programme on Technology Enhanced Learning (NPTEL), as evidenced by the institutional branding and course structure visible on the page. The title explicitly indicates it 
... [+124 chars truncated]

### Assistant | 2026-06-10T09:16:21.284Z

NIST e-Handbook landing confirmed (title tag). NPTEL 112105126 also resolves (same Manufacturing Processes II course). The YouTube /about returns only the title — title alone confirms the channel page exists, but I want stronger confirmation of the channel identity. Let me try a representative playlist/channel form that WebFetch can read, plus verify the remaining categories: archive.org, OSHA, ASME landing, and a confirmable lecture-video source.

### system

... [9 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-10T09:16:37.269Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:38.357Z

[tool_result] **Yes**

This is confirmed to be the NIST Chemistry WebBook (SRD 69). It does provide free reference data on thermochemical and thermophysical properties.

The site explicitly states it "provides thermochemical, thermophysical, and ion energetics data compiled by NIST under the Standard Reference Data Program." The available search tools and data collections (thermodynamics, heat capacity, ionizat
... [+254 chars truncated]

### User | 2026-06-10T09:16:39.607Z

[tool_result] Yes, this is an NPTEL course page. 

**Course Title:** "Manufacturing Processes I, IIT Roorkee"

**Does it cover machining/manufacturing/theory of metal cutting?** Yes, based on the course title "Manufacturing Processes I," it appears to address manufacturing and machining topics, though the webpage content provided does not include detailed syllabus information to confirm specific coverage of met
... [+18 chars truncated]

### User | 2026-06-10T09:16:40.933Z

[tool_result] # Response

**No, this is not a YouTube playlist.**

The content provided is from YouTube's footer/navigation section containing links to general pages like About, Press, Copyright, Terms, Privacy, and Policy & Safety. There is no playlist information, topic, or channel details visible in this excerpt. It only shows YouTube's corporate navigation elements and a copyright notice "© 2026 Google LLC.
... [+221 chars truncated]

### Assistant | 2026-06-10T09:16:47.098Z

NIST Chemistry WebBook confirmed (thermophysical/thermochemical data portal). NPTEL 112107144 (Manufacturing Processes I, IIT Roorkee) resolves. YouTube playlist/channel pages return only footer nav to WebFetch — I cannot reliably confirm a specific YouTube channel's identity/content this way, so per R12 + the task's "do NOT fabricate channel names" rule, I will use NPTEL's video platform as the verified lecture-video source instead of an unconfirmable YouTube channel. NPTEL courses ARE recorded video lecture series (that is NPTEL's nature), and the course pages resolve.

Let me verify two more: an ASME standards landing page (alternate to the 403'd ISO) and DOE/OSTI as a gov data portal, to round out standards + archives sections.

### Assistant | 2026-06-10T09:16:48.531Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:49.958Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:50.986Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:51.638Z

[tool_result] # Yes

This is confirmed as the U.S. Department of Energy's Office of Scientific and Technical Information. The page header clearly states: "U.S. Department of Energy Office of Scientific and Technical Information."

Regarding free access to DOE-funded research: The webpage includes a "Public Access Guidance" link and features a search interface for scientific and technical information, which indi
... [+353 chars truncated]

### User | 2026-06-10T09:16:52.891Z

[tool_result] **No.**

While this is indeed the ASME Codes and Standards landing page, it does not list specific engineering standards. The page only mentions that "ASME offers a continuously evolving portfolio of standards across a wide range of topics, including pressure technology, power plants, elevators, construction equipment, piping, nuclear components, and many more."

No specific standard designations 
... [+161 chars truncated]

### User | 2026-06-10T09:16:54.310Z

[tool_result] **Yes.**

This is confirmed as the official U.S. Government Publishing Office (GPO) website. It provides free public access to federal government documents through multiple resources, including:

- **GovInfo** - described as "the one-stop site for authentic, published information for all three branches of the Federal Government"
- **Ben's Guide to the U.S. Government** - educational resource
- **C
... [+289 chars truncated]

### Assistant | 2026-06-10T09:17:02.658Z

OSTI.gov, ASME Codes & Standards landing, and GPO all resolve and are on-topic. ASME landing confirmed (it IS the codes-standards landing even though specific designations live one level deeper — that's fine, it's the landing page as requested).

Now let me do a final batch to firm up: NPTEL video confirmation (the lecture-video angle), an ANSI standards portal, and the NIST Engineering Laboratory manufacturing landing as a data/reports hub.

### Assistant | 2026-06-10T09:17:03.597Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:04.368Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:17:04.996Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:06.040Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:07.997Z

[tool_result] **Yes**

This is confirmed as the NIST Engineering Laboratory page. It does cover manufacturing measurement science and standards.

The page explicitly mentions "Measurement Science for Additive Manufacturing" and "Advanced Manufacturing Data Infrastructure and Analytics" under the Goals & Programs section. Additionally, the introductory statement indicates the lab "advances measurement science, s
... [+49 chars truncated]

### User | 2026-06-10T09:17:09.342Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 3600

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:17:15.394Z

ANSI 403'd (drop it — ASME landing already covers the standards body need), and the second archive.org item guess 404'd (drop it — Machinery's Handbook already confirmed). NIST Engineering Laboratory resolves.

I now have a solid verified set. Let me confirm one lecture-video source that WebFetch can actually read content from, since NPTEL course pages confirm but I want the video-series angle solid. NPTEL is recorded video lectures by nature, and the course page resolves — that is my verified lecture-video entry. Let me also grab one more textbook homepage (OpenStax catalog) and the Open Oregon press homepage to anchor the textbooks section beyond what foundations cites.

### Assistant | 2026-06-10T09:17:16.127Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:17.655Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:19.899Z

[tool_result] Based on the provided content, I cannot confirm this is the OpenStax science subjects catalog page or verify whether it lists free openly-licensed textbooks. The snippet provided contains only the word "OpenStax" with no additional details about page content, subject listings, or specific textbook titles like University Physics or Statistics.

**Answer: No** – The evidence is insufficient to confi
... [+25 chars truncated]

### User | 2026-06-10T09:17:20.763Z

[tool_result] **Yes.**

This is the Open Oregon Pressbooks homepage for "Manufacturing Processes 4-5." The textbook is freely available and licensed under Creative Commons Attribution 4.0. It comprehensively covers machining equipment including lathe machines, milling machines, drill presses, bandsaws, surface grinders, and CNC operations. The description states it "will explain the hows, whys, and whens of var
... [+97 chars truncated]

### Assistant | 2026-06-10T09:17:24.923Z

Open Oregon "Manufacturing Processes 4-5" homepage confirmed (the book HOMEPAGE, distinct from the foundations' intro-chapter URL). OpenStax /subjects/science returned only the wordmark to WebFetch. Let me try the OpenStax University Physics book homepage directly, which WebFetch reads well (foundations confirmed deep page-level OpenStax pages), and one final lecture-video confirmation via a NPTEL-adjacent or MIT video index.

### Assistant | 2026-06-10T09:17:26.355Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:27.394Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:28.235Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:17:28.685Z

[tool_result] I cannot confirm this is the OpenStax book detail/homepage for University Physics Volume 1 based on the content provided. The web page content shows only "OpenStax" as a header, with no details about a specific textbook, licensing information, or book title.

To answer your question about whether it's a free, openly-licensed textbook, I would need to see actual page content that includes the book 
... [+96 chars truncated]

### Assistant | 2026-06-10T09:17:33.916Z

OpenStax detail page returns only the wordmark to WebFetch (SPA — the rendered chapter pages work, but the catalog detail page is JS-rendered). The NPTEL /course.html 404'd, but the individual NPTEL course pages (112105127, 112105126, 112107144) DO resolve and confirm content — those are my verified NPTEL entries.

For the textbooks section, foundations already cites deep OpenStax chapter pages; for the atlas I'll cite the OpenStax University Physics chapter that I personally re-confirmed is reachable, plus LibreTexts bookshelf (confirmed) and the Open Oregon book homepage (confirmed). Let me do one final confirmation pass to lock the OpenStax homepage in a WebFetch-readable form, then write the file.

### Assistant | 2026-06-10T09:17:35.810Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:37.372Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:38.675Z

[tool_result] Yes.

This is a readable page from OpenStax University Physics Volume 1. The content presents "Newton's Second Law for Rotation" with learning objectives, theoretical explanations, mathematical equations, worked examples, and problem-solving strategies typical of a physics textbook. The page includes a practical example about calculating angular acceleration on a merry-go-round and maintains the e
... [+79 chars truncated]

### User | 2026-06-10T09:17:40.237Z

[tool_result] Yes, this is a Project Gutenberg subject/bookshelf listing page.

**Subject:** "Books about Russia -- Social life and customs -- 1533-1917 -- Fiction"

**Free public-domain books:** Yes. The page lists 25 literary works, including classics like *The Brothers Karamazov* by Dostoyevsky (47,605 downloads) and *Dead Souls* by Gogol (3,391 downloads), available for free download in multiple languages.

### Assistant | 2026-06-10T09:17:43.541Z

OpenStax University Physics Vol.1 chapter page confirmed readable + CC-licensed. The Gutenberg subject 2786 resolves but is off-topic (Russian fiction, not machine-shop) — so I'll cite Project Gutenberg via a confirmed on-topic search/landing instead. Let me verify a Gutenberg on-topic landing and then write the file.

### Assistant | 2026-06-10T09:17:45.057Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:47.492Z

[tool_result] Yes. This is a Project Gutenberg search results page for "machine shop practice" that returns free public-domain books related to machining and mechanical engineering.

Results include:

1. "Modern Machine-Shop Practice, Volumes I and II" by Joshua Rose (1,326 downloads)
2. "Precision locating and dividing methods" by Anonymous (477 downloads)
3. "The Economy of Workshop Manipulation" by John Rich
... [+224 chars truncated]

### Assistant | 2026-06-10T09:17:58.373Z

Project Gutenberg machine-shop-practice search confirmed (returns "Modern Machine-Shop Practice" by Joshua Rose, "Elementary lathe practice", etc. — public-domain, on-topic). I now have a strong verified set across all five sections. Let me tally my confirmed-live links:

**Confirmed live + on-topic (13):**
1. NPTEL 112105127 — Manufacturing Processes II (IIT Kharagpur) — course
2. NPTEL 112105126 — Manufacturing Processes II (IIT Kharagpur) — course
3. NPTEL 112107144 — Manufacturing Processes I (IIT Roorkee) — course
4. LibreTexts Engineering bookshelf — textbooks
5. OpenStax University Physics Vol.1 ch.10-7 — textbook
6. Open Oregon Manufacturing Processes 4-5 homepage — textbook
7. Project Gutenberg machine-shop search — textbooks (public domain)
8. archive.org Machinery's Handbook (1924) — archive
9. NIST e-Handbook of Statistical Methods — data/reports
10. NIST Engineering Laboratory — data/reports
11. NIST Chemistry WebBook — data portal
12. NIST SRM — data/materials
13. NIST Intelligent Systems Division — data/reports
14. OSTI.gov (DOE) — archive/data
15. GPO/GovInfo — archive/gov reports
16. Machining Doctor calculators index — references (living)
17. Machining Doctor homepage — references (living)
18. OSHA machine guarding — standards/authority
19. ASME Codes & Standards landing — standards

That's 19 verified links. For lecture-video, NPTEL is recorded video lecture series — I'll note that explicitly. Now writing the atlas.

### Assistant | 2026-06-10T09:18:53.741Z

[tool_use: Write]

### User | 2026-06-10T09:18:56.501Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\speed-feed\speed-feed-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:19:01.595Z

The file was created successfully. The atlas is distinct from the foundations file and the existing speed-feed nodes (no duplication — it's a link directory, not a calc engine or galaxy MEMORY).

GALAXY: speed-feed
FILE: knowledge/wiki/speed-feed/speed-feed-source-atlas.md
CREATED: yes
VERIFIED_LINKS: 19
SECTIONS: 5
DEAD_LINKS_DROPPED: 9
NOTE: NPTEL's free recorded video-lecture courses (IIT Kharagpur Manufacturing Processes II, 112105127) -- the strongest free, link-stable, continuously-hosted video curriculum on metal-cutting mechanics for the galaxy.
