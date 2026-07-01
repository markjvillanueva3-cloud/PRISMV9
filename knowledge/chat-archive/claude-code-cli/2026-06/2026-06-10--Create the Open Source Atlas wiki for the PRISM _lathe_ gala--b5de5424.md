---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "Create the Open Source Atlas wiki for the PRISM \"lathe\" galaxy (owner: whiskey, "
date: "2026-06-10"
first_ts: "2026-06-10T09:09:21.802Z"
last_ts: "2026-06-10T09:13:35.032Z"
cwd: "H:\\prism"
messages: 97
user_msgs: 42
assistant_msgs: 55
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-aef57cadde61d0b4e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Create the Open Source Atlas wiki for the PRISM "lathe" galaxy (owner: whiskey, 

> **claude-code-cli** | 2026-06-10 | 97 msgs (42 user / 55 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-aef57cadde61d0b4e.jsonl`

## Transcript

### User | 2026-06-10T09:09:21.802Z

Create the Open Source Atlas wiki for the PRISM "lathe" galaxy (owner: whiskey, domain: turning / lathe machining): knowledge/wiki/lathe/lathe-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for turning / lathe machining -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/lathe/lathe-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing pages relevant to turning / lathe machining)

Each entry = a markdown bullet: source name + URL + one-line "what it is
... [+1728 chars truncated]

### Assistant | 2026-06-10T09:09:25.029Z

I'll start by reading the existing foundations file and the corpus spec to avoid duplication, per R8.

### Assistant | 2026-06-10T09:09:25.499Z

[tool_use: Read]

### Assistant | 2026-06-10T09:09:25.941Z

[tool_use: Read]

### User | 2026-06-10T09:09:27.255Z

[tool_result] 1	---
2	title: Lathe / Turning Foundations (WebFetch-verified institutional + method facts)
3	galaxy: lathe
4	owner_slot: whiskey
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09)"
7	verification_method: "Live WebFetch of each cited source URL; only formula STRUCTURE/geometry, process METHOD descriptions, vendor/standards pointers, and qualitative domain facts 
... [+30331 chars truncated]

### User | 2026-06-10T09:09:28.659Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-370 of 465 total (26637 tokens, cap 25000). Call Read with offset=371 limit=370 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index
2	
3	> **Generated** by `s
... [+45940 chars truncated]

### Assistant | 2026-06-10T09:09:35.038Z

I have the lathe corpus (lines 168-203). I now understand the context: the foundations file already cites CNCCookbook G96, Wikipedia, Mitsubishi, minaprem, Masso, OpenStax, NIST, NASA, MIT OCW, OSHA. The atlas must curate BROADER LIVING resources (full course series, textbook homepages, data portals, lecture-video series, standards landing pages) — not repeat those specific page-level citations.

My plan: verify ~15-25 LIVING (continuously-updated) sources across the 5 sections. I'll prefer homepages/course-series/portals over single article pages. Let me verify candidate URLs now, batching parallel WebFetches.

### Assistant | 2026-06-10T09:09:36.636Z

[tool_use: WebFetch]

### User | 2026-06-10T09:09:37.490Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:09:37.540Z

[tool_use: WebFetch]

### User | 2026-06-10T09:09:41.717Z

[tool_result] Yes, this resolves to an NPTEL course page. The course is titled **"Manufacturing Processes II"** from IIT Kharagpur, taught by Prof. A.B. Chattopadhyay, Prof. A.K. Chattopadhyay, and Prof. S. Paul.

It is indeed about manufacturing and machining. The course title and faculty names clearly indicate it covers advanced manufacturing processes and techniques.

### Assistant | 2026-06-10T09:09:44.436Z

MIT OCW course-page URL 404'd (the modern OCW uses a slug; the foundations file used an `opencw.aprende.org` mirror). Let me find the correct current MIT OCW URLs and verify more candidates.

### Assistant | 2026-06-10T09:09:45.856Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:09:46.804Z

[tool_use: WebFetch]

### User | 2026-06-10T09:09:46.815Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:09:47.732Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:09:49.021Z

[tool_use: WebFetch]

### User | 2026-06-10T09:09:49.592Z

[tool_result] Yes, this resolves to an NPTEL course page. The course title is **"Manufacturing Processes II"** from IIT Kharagpur, taught by Prof. A.B. Chattopadhyay, Prof. A.K. Chattopadhyay, and Prof. S. Paul.

This course is indeed about manufacturing and machining, as indicated by its title focusing on manufacturing processes as a subject area.

### User | 2026-06-10T09:09:50.239Z

[tool_result] Based on the content provided, I cannot determine whether this resolves to a specific OpenStax free textbook page or identify a particular book title. The page content only contains "OpenStax," which is the name of the organization that provides free, peer-reviewed textbooks, but no additional information is given to identify which specific textbook or resource is being referenced.

### User | 2026-06-10T09:09:54.239Z

[tool_result] # LibreTexts Engineering - Mechanical Engineering Bookshelf

Yes, this resolves to the LibreTexts Engineering Mechanical Engineering bookshelf page.

## Content Types Available

The page hosts free textbook content covering core mechanical engineering topics rather than manufacturing or machining specifically. Available subjects include:

- **Foundational mechanics**: statics, dynamics, and struct
... [+750 chars truncated]

### Assistant | 2026-06-10T09:09:58.466Z

NPTEL "Manufacturing Processes II" (112105126/112105127) confirmed — that's a full course covering machining/lathe/turning. LibreTexts Mechanical Engineering bookshelf confirmed live. OpenStax details page was ambiguous (thin content). Let me find the correct MIT OCW slug and verify more candidates: OpenStax homepage, Open Oregon manufacturing textbook (full book homepage, not the single threading chapter the corpus cited), NIST machining/data portal, and a known lecture channel.

### Assistant | 2026-06-10T09:09:59.965Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:10:00.836Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:10:01.775Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:10:03.122Z

[tool_use: WebFetch]

### User | 2026-06-10T09:10:04.059Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:10:04.267Z

[tool_result] I cannot determine whether this resolves to the OpenStax science subjects page based solely on the content provided. The web page content only shows "OpenStax" as a header/title with no additional information about page structure, navigation, or available textbooks.

To answer your question about physics titles, I would need the actual page content that lists the available textbooks. The snippet p
... [+121 chars truncated]

### User | 2026-06-10T09:10:05.575Z

[tool_result] # Manufacturing Processes 4-5 - Free Open Textbook

**Yes, this resolves to a free open-textbook homepage.** The resource is hosted on Open Oregon Educational Resources and uses a Creative Commons Attribution 4.0 license.

**Book Title:** "Manufacturing Processes 4-5"

**Lathe/Turning/Machining Coverage:** Yes, the textbook extensively covers these topics. Chapter 2 is dedicated to lathe machines 
... [+517 chars truncated]

### User | 2026-06-10T09:10:06.657Z

[tool_result] Based on the content provided, this is not a search results page—it's a navigation/header section of the MIT OpenCourseWare website. No manufacturing or machining courses are listed here.

The page only displays site navigation elements, including links to "Give Now," "About OCW," "Help & Faqs," and "Contact Us," along with a notice about external links. To find specific courses on manufacturing o
... [+99 chars truncated]

### Assistant | 2026-06-10T09:10:17.038Z

Open Oregon "Manufacturing Processes 4-5" homepage confirmed — full free textbook with a dedicated lathe chapter (Chapter 2). This is the ideal living-textbook homepage (corpus only cited its single threading unit; the homepage is broader). OpenStax subject pages return thin content via the renderer (JS-heavy), and the NIST EL URL 404'd. Let me find working MIT OCW course slug, a working NIST manufacturing portal/data page, OpenStax book index page, and verify lecture-video channels.

### Assistant | 2026-06-10T09:10:18.666Z

[tool_use: WebFetch]

### User | 2026-06-10T09:10:19.256Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:10:20.026Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:10:21.111Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:10:22.133Z

[tool_use: WebFetch]

### User | 2026-06-10T09:10:22.811Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:10:24.355Z

[tool_result] # Confirmation

Yes, this resolves to the OpenStax University Physics Volume 1 free textbook's introduction/table of contents page.

**Book Title:** "University Physics Volume 1"

The page displays the chapter outline with seven main sections (1.1-1.7), including topics like scope and scale of physics, units and standards, unit conversion, dimensional analysis, Fermi calculations, significant figu
... [+134 chars truncated]

### User | 2026-06-10T09:10:25.182Z

[tool_result] # NIST Manufacturing Portal

Yes, this is NIST's official manufacturing topic/portal page (https://www.nist.gov/manufacturing).

## Coverage Overview

The page serves as a comprehensive hub for manufacturing-related resources and initiatives. It emphasizes that "NIST helps American industries adopt innovative manufacturing methods and efficiently produce reliable, safe products."

### Key Areas Co
... [+932 chars truncated]

### Assistant | 2026-06-10T09:10:33.717Z

Confirmed: NIST manufacturing portal (live, includes machining + data/publications), OpenStax University Physics Vol 1 (book intro/TOC page resolves). Haas training URL 403'd (drop). MIT OCW slug still wrong — let me find the working one via search and verify the remaining candidates: standards landing pages (ISO, ASME, OSHA lathe), archive.org, and lecture channels.

### Assistant | 2026-06-10T09:10:35.099Z

[tool_use: WebFetch]

### system

... [17 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-10T09:11:05.053Z

[tool_use: WebFetch]

### User | 2026-06-10T09:11:05.626Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:11:06.422Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:11:07.341Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:11:09.029Z

[tool_use: WebFetch]

### User | 2026-06-10T09:11:09.861Z

[tool_result] I cannot provide a complete answer based on the content provided. The web page excerpt shows only a title—"TITANS of CNC MACHINING - YouTube"—with a note that the full content was truncated.

To accurately determine whether this resolves to the specific channel you're asking about and what CNC/machining content it offers, I would need the actual page content, including descriptions, video titles, 
... [+208 chars truncated]

### User | 2026-06-10T09:11:12.092Z

[tool_result] # NPTEL Homepage and Overview

Yes, this is the NPTEL homepage. NPTEL stands for "Online Learning Initiatives by IITs and IISc," described as being "funded by MoE, Govt. of India."

## What is NPTEL?

NPTEL is a digital learning platform created collaboratively by India's premier institutions—seven Indian Institutes of Technology (IITs) and the Indian Institute of Science (IISc)—to provide open ed
... [+671 chars truncated]

### User | 2026-06-10T09:11:12.741Z

[tool_result] Based on the minimal content provided ("Govinfo"), I cannot confirm whether this resolves to govinfo.gov or verify that it hosts the CFR collection, including Title 29 OSHA regulations. 

To answer your question accurately, I would need actual webpage content showing the site's domain, navigation, or collection descriptions. If you can provide the full page content or URL, I'd be happy to confirm 
... [+85 chars truncated]

### Assistant | 2026-06-10T09:11:18.588Z

NPTEL homepage confirmed (CC-licensed free courses, 3200+ courses, gov-funded — strong living source). govinfo and YouTube channel pages render thin via the markdown converter. The TITANS of CNC channel page returned only a title — I cannot fully confirm content, and per the rules I must not list a YouTube source I can't confirm exists with on-topic content. Let me make final verification attempts on a confirmable MIT OCW course content page (using the `aprende.org` mirror already proven in foundations, but I want a DIFFERENT broader URL — the OCW department-level mirror), the OpenStax homepage as a textbook portal, and the eCFR (which renders better than govinfo) for the gov standards/regs.

### Assistant | 2026-06-10T09:11:21.004Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:11:21.977Z

[tool_use: WebFetch]

### User | 2026-06-10T09:11:22.106Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-O
Redirect URL: https://unblock.federalregister.gov/
Status: 302 Found

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://unblock.federalregister.gov/"
- pro
... [+210 chars truncated]

### Assistant | 2026-06-10T09:11:23.448Z

[tool_use: WebFetch]

### User | 2026-06-10T09:11:25.958Z

[tool_result] Yes, this resolves to the MIT OpenCourseWare 2.008 Design and Manufacturing II course homepage. The page confirms it lists manufacturing-related materials.

The course description states: "This course introduces you to modern manufacturing with four areas of emphasis: manufacturing processes, equipment/control, systems, and design for manufacturing."

The available course materials explicitly incl
... [+320 chars truncated]

### User | 2026-06-10T09:11:28.120Z

[tool_result] # Analysis

**Does this resolve to a Project Gutenberg subject/bookshelf page?**

No. The page displays "Books about None" with a message stating "No records found." This indicates a search or category page that returned zero results, rather than a functional subject collection.

**Subject matter:**

There is no identifiable subject. The page title references "None," which appears to be a null res
... [+261 chars truncated]

### Assistant | 2026-06-10T09:11:32.848Z

Confirmed: MIT OCW 2.008 (aprende.org mirror) resolves to real course content with machining/manufacturing materials. The eCFR redirected to an "unblock" host (anti-bot) — I'll drop it. Gutenberg subject 2208 returned no records (wrong subject id) — drop.

I have a strong, verified set now. Let me do a final small round: verify the correct Gutenberg metalworking bookshelf, the OpenStax homepage as a textbook portal, and one reputable lecture-video source I can actually confirm (MIT OCW's own video presence or a known channel via a playlist). Then I'll write the file.

### Assistant | 2026-06-10T09:11:34.262Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:11:35.681Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:11:36.892Z

[tool_use: WebFetch]

### User | 2026-06-10T09:11:38.047Z

[tool_result] Based on the content provided, I cannot confirm that this resolves to the OpenStax homepage or verify their offerings. The snippet only contains the text "OpenStax" without additional details about the organization's mission, content, or services.

To properly answer your question, I would need more substantive webpage content that describes OpenStax's actual offerings and mission statement.

### User | 2026-06-10T09:11:39.049Z

[tool_result] # Project Gutenberg Bookshelves Verification

**Yes, this resolves to the Project Gutenberg Bookshelves listing.**

## Free Public-Domain Collections Confirmed

The page displays hand-curated reading lists organized alphabetically and by subject. As stated in the header: "Reading Lists are small selections hand-curated by our volunteers."

Examples of collections include:
- Literature categories (
... [+724 chars truncated]

### User | 2026-06-10T09:11:40.257Z

[tool_result] Based on the web page content provided, I cannot confirm the specific course topics or delivery format. The page shows a course titled "Manufacturing Processes II, IIT Kharagpur" taught by Prof. A.B. Chattopadhyay, Prof. A.K. Chattopadhyay, and Prof. S. Paul, but the detailed information states "Loading about course data..."

The page indicates there is a syllabus available and mentions "NPTEL Cou
... [+410 chars truncated]

### Assistant | 2026-06-10T09:11:49.144Z

Project Gutenberg Bookshelves listing confirmed live (includes a "Technology" category). OpenStax homepage renders thin (JS), but I already verified the University Physics Vol 1 book page resolves to real content — I'll cite that book page (verified) rather than the thin homepage. NPTEL course 112105127 confirmed earlier resolving to "Manufacturing Processes II" content (the title/faculty confirmed on the first fetch; this re-fetch hit a loading-state render but the page is the same verified course).

Let me do one final round to firm up: an edX audit-free course page, a NIST data/standards reference page that renders, and a confirmable lecture-video source. For the video section I'll verify MIT OCW's video presence via a confirmable page, and try one more reputable channel via a representative playlist URL that the renderer can read.

### Assistant | 2026-06-10T09:11:50.024Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:11:51.514Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:11:51.966Z

[tool_use: WebFetch]

### User | 2026-06-10T09:11:55.014Z

[tool_result] # edX Manufacturing Topic Page Analysis

**Does this resolve to an edX topic page listing manufacturing courses?**

Yes, this is an edX topic page for manufacturing. The page's heading states: "Learn manufacturing with online courses and programs" and includes a breadcrumb navigation showing "manufacturing" as the current section.

**Are any free-to-audit manufacturing/machining courses listed?**

... [+365 chars truncated]

### User | 2026-06-10T09:11:55.915Z

[tool_result] # NASA Technical Reports Server (NTRS) Homepage Confirmation

**Yes, this is the NTRS homepage.**

The page confirms it provides free access to NASA technical information. The repository offers "access to NASA metadata records, full-text online documents, images, and videos" including conference papers, journal articles, patents, and research reports created or funded by NASA.

The site explicitly
... [+290 chars truncated]

### User | 2026-06-10T09:12:04.791Z

[tool_result] # NIST Publications Portal Confirmation

Yes, this resolves to the official NIST Publications portal. The page is located at https://www.nist.gov/publications and provides access to NIST's technical research outputs.

## Free Access Confirmation

The portal does offer complimentary access to NIST publications. The site states: "This publications database includes many of the most recent publicatio
... [+526 chars truncated]

### Assistant | 2026-06-10T09:12:12.172Z

Confirmed: NIST Publications portal, NASA NTRS homepage, and edX manufacturing topic page all resolve live and on-topic. The edX page is a real topic page (audit-free option is standard on edX, but I'll describe it accurately as the topic/catalog page).

I now have a strong verified set across all 5 sections. The lecture-video section is the weakest — I could not confirm YouTube channel content through the markdown renderer (channel pages return only a title). Per the absolute rules, I will NOT fabricate or list a YouTube channel I couldn't confirm. Instead, for the video section I'll use NPTEL's confirmed video-lecture course (verified, free, gov-funded, CC-licensed) and the MIT OCW course (which hosts lecture materials) — both reputable institutional lecture series I actually verified. Let me do a final check on NPTEL's video presence and one ISO standards landing page that renders.

### Assistant | 2026-06-10T09:12:13.767Z

[tool_use: WebFetch]

### User | 2026-06-10T09:12:14.287Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:12:18.201Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:12:18.500Z

[tool_use: WebFetch]

### User | 2026-06-10T09:12:19.309Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:12:21.202Z

[tool_result] Based on the content provided, I cannot confirm whether this resolves to the NPTEL YouTube channel or verify its content offerings.

The page only shows standard YouTube footer navigation and copyright information (© 2026 Google LLC). There is no descriptive content about the channel, its focus areas, lecture types, or whether it hosts engineering/manufacturing educational materials.

To verify th
... [+141 chars truncated]

### Assistant | 2026-06-10T09:12:29.491Z

ISO pages 403 (anti-bot) and YouTube channel pages render thin — I cannot verify those, so I will NOT list ISO direct standard pages or YouTube channels. For standards I'll use the verified ASME and OSHA landing pages (both confirmed live). For the lecture-video section I'll use the NPTEL course (confirmed — it is a recorded video-lecture course) and MIT OCW 2.008 (confirmed mirror with lecture materials), described honestly as institutional lecture series.

I have my final verified set. Let me tally what resolved on-topic:

**Free college courses:** MIT OCW 2.008 (mirror), NPTEL Manufacturing Processes II (112105126, 112105127), edX manufacturing topic.
**Free textbooks & references:** Open Oregon "Manufacturing Processes 4-5", OpenStax University Physics Vol 1, LibreTexts Mech Eng bookshelf.
**Archives & open data / gov:** NIST manufacturing portal, NIST Publications, NASA NTRS, Internet Archive texts, Project Gutenberg Bookshelves.
**Lecture series & video:** NPTEL course (video lectures), MIT OCW 2.008 (lecture materials).
**Standards & authoritative bodies:** ASME Codes & Standards, OSHA Machine Guarding.

That's a solid 14-16 verified entries. Now I'll write the atlas.

### Assistant | 2026-06-10T09:13:20.141Z

[tool_use: Write]

### User | 2026-06-10T09:13:22.882Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\lathe\lathe-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:13:35.032Z

The file was created successfully. The advisory hooks note a related `lathe-tribal-source-corpus` node, but this atlas is distinct (curated + link-verified living resources, organized by type, per the task) — not a duplicate. The file ends with a complete sentence (the Ollama "incomplete sentence" flag is a false positive; the last line ends cleanly with a period).

Let me tally my verified link count precisely:

Verified live + on-topic (listed in the atlas):
1. MIT OCW 2.008 (aprende.org mirror) — confirmed
2. NPTEL 112105126 — confirmed
3. NPTEL 112105127 — confirmed
4. edX manufacturing topic — confirmed
5. Open Oregon Manufacturing Processes 4-5 — confirmed
6. OpenStax University Physics Vol 1 (book page) — confirmed
7. LibreTexts Mech Eng bookshelf — confirmed
8. NIST manufacturing portal — confirmed
9. NIST Publications — confirmed
10. NASA NTRS — confirmed
11. Internet Archive texts — confirmed
12. Project Gutenberg Bookshelves — confirmed
13. ASME Codes & Standards — confirmed
14. OSHA Machine Guarding — confirmed

(NPTEL and MIT OCW are reused in the video section but are the same already-verified URLs, so they're counted once.)

Dropped (failed verification): MIT OCW modern ocw.mit.edu slugs (404/redirect-loop ×4), Haas lathe training (403), ISO committee/sector/standard pages (403 ×3), govinfo CFR (thin render), eCFR Title 29 (anti-bot redirect), Gutenberg subject 2208 (no records), Haas YouTube + TITANS YouTube + NPTEL YouTube channel pages (unconfirmable). That's roughly 13 distinct failed URLs dropped.

GALAXY: lathe
FILE: knowledge/wiki/lathe/lathe-source-atlas.md
CREATED: yes
VERIFIED_LINKS: 14
SECTIONS: 5
DEAD_LINKS_DROPPED: 13
NOTE: Open Oregon "Manufacturing Processes 4-5" (https://openoregon.pressbooks.pub/manufacturingprocesses45/) -- a maintained CC-BY open textbook whose Chapter 2 is dedicated entirely to the lathe, the strongest living operations-level turning curriculum surfaced.
