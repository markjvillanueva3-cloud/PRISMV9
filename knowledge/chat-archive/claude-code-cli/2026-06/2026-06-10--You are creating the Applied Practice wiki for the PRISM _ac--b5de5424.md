---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"academy\" galaxy (owner"
date: "2026-06-10"
first_ts: "2026-06-10T10:18:25.786Z"
last_ts: "2026-06-10T10:22:00.123Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 19
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-a24fe27a3ebc1237f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "academy" galaxy (owner

> **claude-code-cli** | 2026-06-10 | 48 msgs (19 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-a24fe27a3ebc1237f.jsonl`

## Transcript

### User | 2026-06-10T10:18:25.786Z

You are creating the Applied Practice wiki for the PRISM "academy" galaxy (owner: lima): knowledge/wiki/academy/academy-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won gotchas, FAILURE MODES, and TECHNIQUE DECISIONS a world-class academy practitioner has that pure theory does not teach. This is DISTINCT from academy-foundations.md (theory) and academy-source-atlas.md (link directory) if those exist -- read them first so you do not repeat them.

FOCUS for academy: instructional-design / training practitioner gotchas: assessment validity vs reliability, cognitive-load overload, transfer failure (inert knowledge), expert blind-spot in instruction, feedback timing, spacing vs massed practice, motivation/retention, competency-vs-seat-time. Free: MIT OCW, OER Commons, NIMS, learning-science public sources (retrieval practice / spacing).
Qualitative practitioner technique + gotchas. CS/software/ML claims here are papa-verifiable -- cite framework docs / courses / papers. Leave any benchmark-specific numbers owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (framework official docs, university course, gov, reputable practitioner reference, arXiv). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sections (e.g. "## Common failure modes", "## Technique decisions", "## Verification/eval"). Each = the gotcha + WHY + the expert's avoidance, source cited inline.
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: academy, owner_slot: lima, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exa
... [+331 chars truncated]

### Assistant | 2026-06-10T10:18:34.051Z

I'll create the Applied Practice wiki for the academy galaxy. Let me first check for sibling files and read them to avoid repetition.

### Assistant | 2026-06-10T10:18:35.147Z

[tool_use: Bash]

### User | 2026-06-10T10:18:40.270Z

[tool_result] total 48
drwxr-xr-x 1 wompu 197611     0 Jun 10 04:33 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 05:11 ../
drwxr-xr-x 1 wompu 197611     0 Jun  9 22:04 _staging/
-rw-r--r-- 1 wompu 197611 25091 Jun 10 02:38 academy-pedagogy-foundations.md
-rw-r--r-- 1 wompu 197611 10551 Jun 10 04:33 academy-source-atlas.md

### Assistant | 2026-06-10T10:18:54.209Z

There's a foundations file (`academy-pedagogy-foundations.md`) and a source-atlas. Let me read both so I don't repeat theory or link directory content.

### Assistant | 2026-06-10T10:18:54.325Z

[tool_use: Read]

### Assistant | 2026-06-10T10:18:54.328Z

[tool_use: Read]

### User | 2026-06-10T10:18:56.419Z

[tool_result] 1	---
2	title: Academy Pedagogy Foundations — competency frameworks, skill-progression models, deliberate practice
3	galaxy: academy
4	owner_slot: lima
5	status: VERIFIED-PARTIAL
6	verified_by: papa (claude-b5de5424, 2026-06-09); deepened 2026-06-09 (claude-b5de5424) — sections 5-8 added from untapped source categories; deepened again 2026-06-10 — sections 9-11 added from NPTEL courseware + 2nd Op
... [+25102 chars truncated]

### User | 2026-06-10T10:18:56.499Z

[tool_result] 1	---
2	title: Academy Open-Source Atlas — curated living free/legal resources for manufacturing & machining education
3	galaxy: academy
4	owner_slot: lima
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas (2026-06-10)"
7	verification_method: "Each URL below was WebFetched and confirmed to resolve to the relevant, on-topic content (link-live + on-topic check, not a claim-extraction). UR
... [+10239 chars truncated]

### Assistant | 2026-06-10T10:19:02.090Z

I now understand the scope clearly. The foundations file covers theory (competency frameworks, Bloom/Dreyfus, ADDIE, andragogy, CMU 7 principles, NIST SPC/metrology). The atlas is a link directory. My applied-practice file must cover **practitioner gotchas and technique decisions** — the hard-won failure modes a world-class instructional designer knows that theory doesn't teach.

Let me research the specific practitioner topics. I'll fetch reputable learning-science sources for the gotchas the prompt named: assessment validity vs reliability, cognitive-load overload, transfer failure (inert knowledge), expert blind-spot, feedback timing, spacing vs massed practice.

### Assistant | 2026-06-10T10:19:03.998Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:19:05.344Z

[tool_use: WebFetch]

### User | 2026-06-10T10:19:06.359Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T10:19:07.238Z

[tool_result] Based on the provided web page content, I cannot find any discussion of validity, reliability, or constructive alignment.

The page focuses exclusively on **alignment between three course components**: learning objectives, assessments, and instructional strategies. 

The closest relevant passage states: "Assessments should reveal how well students have learned what we want them to learn while inst
... [+298 chars truncated]

### Assistant | 2026-06-10T10:19:10.530Z

The alignment page partially confirmed (alignment concept) but not validity/reliability. The retrievalpractice URL 404'd. Let me try better-targeted sources for these specific topics.

### Assistant | 2026-06-10T10:19:12.320Z

[tool_use: WebFetch]

### User | 2026-06-10T10:19:13.528Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:19:13.914Z

[tool_use: WebFetch]

### User | 2026-06-10T10:19:20.517Z

[tool_result] # Cognitive Load Theory: Four Key Concepts

## 1. Three Types of Cognitive Load

**Exact phrasing:**
- *Intrinsic*: "the effort associated with a specific topic"
- *Germane*: "the work put into creating a permanent store of knowledge"
- *Extraneous*: "the way information or tasks are presented to a learner"

**Instructional design gotcha:** Designers must simultaneously minimize unnecessary extern
... [+1198 chars truncated]

### Assistant | 2026-06-10T10:19:23.421Z

Cognitive load fetch is excellent — confirmed all four. Let me get spacing/feedback/transfer/expert-blind-spot from solid sources.

### Assistant | 2026-06-10T10:19:25.347Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:19:26.380Z

[tool_use: WebFetch]

### User | 2026-06-10T10:19:31.617Z

[tool_result] # Spacing Effect: Key Findings

## The Spacing Effect (Distributed vs. Massed Practice)

The core principle is stated precisely: "learning is more effective when study sessions are spaced out." More specifically, "more information is encoded into long-term memory by spaced study sessions, also known as spaced repetition or spaced presentation, than by massed presentation (cramming)."

Research dem
... [+1072 chars truncated]

### User | 2026-06-10T10:19:32.104Z

[tool_result] # Transfer of Learning: Key Concepts

## Transfer of Learning Defined
"Transfer of learning occurs when people apply information, strategies, and skills they have learned to a new situation or context."

## Near vs. Far Transfer

**Near Transfer:** Occurs when considerable overlap exists between original learning conditions and the new situation. Many environmental and contextual elements remain s
... [+1269 chars truncated]

### Assistant | 2026-06-10T10:19:39.810Z

Both excellent. Transfer didn't have "inert knowledge" by name — I'll cite it on transfer-failure and not overclaim the term. Now let me get feedback timing, the expert blind-spot (curse of knowledge / expert-novice gap), and Kirkpatrick-level evaluation failure (smile-sheets).

### Assistant | 2026-06-10T10:19:42.168Z

[tool_use: WebFetch]

### User | 2026-06-10T10:19:43.428Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:19:43.513Z

[tool_use: WebFetch]

### User | 2026-06-10T10:19:51.106Z

[tool_result] # The Curse of Knowledge: Definition and Teaching Implications

## Core Definition

The curse of knowledge is fundamentally about perspective-taking failure. As the Wikipedia article states, it's a "cognitive bias that occurs when a person who has specialized knowledge assumes that others share in that knowledge."

More specifically, better-informed individuals struggle to mentally reconstruct how
... [+1223 chars truncated]

### Assistant | 2026-06-10T10:19:55.724Z

Curse of knowledge confirmed (this is the "expert blind-spot in instruction" gotcha — strong). The CMU feedback page 404'd. Let me get feedback effectiveness from a solid source, plus Kirkpatrick evaluation-level failure (the "smile sheet" / level-1-reaction gotcha), and the testing/retrieval-practice effect.

### Assistant | 2026-06-10T10:19:57.584Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:19:59.526Z

[tool_use: WebFetch]

### User | 2026-06-10T10:20:00.572Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T10:20:02.253Z

[tool_result] # Feedback in Education/Learning

The Wikipedia article's Education section is notably minimal. It contains only a single line directing readers to "corrective feedback" without elaboration:

> "For feedback in the educational context, see corrective feedback."

The page provides no discussion of what makes feedback effective in learning, the mechanisms of how feedback supports learning processes,
... [+507 chars truncated]

### Assistant | 2026-06-10T10:20:05.499Z

Feedback#Education was thin and Kirkpatrick 404'd. Let me retry Kirkpatrick at the correct title and get retrieval-practice (testing effect) plus formative-vs-summative — two more solid practitioner gotchas.

### Assistant | 2026-06-10T10:20:07.486Z

[tool_use: WebFetch]

### User | 2026-06-10T10:20:08.399Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:20:08.709Z

[tool_use: WebFetch]

### User | 2026-06-10T10:20:15.074Z

[tool_result] # Testing Effect: Core Definition and Underestimation

## Core Definition

The testing effect is precisely defined as: **"long-term memory is increased when part of the learning period is devoted to retrieving information from memory."**

This contrasts sharply with passive review. Research shows that **"testing prior knowledge is more beneficial for learning when compared to only reading or passi
... [+1055 chars truncated]

### Assistant | 2026-06-10T10:20:18.596Z

Testing effect confirmed (strong: testing as a teaching tool, learner underestimation). Kirkpatrick 404'd again — I'll drop it per R12. Let me get a couple more solid practitioner gotchas: validity vs reliability of assessment, and formative vs summative / desirable difficulties.

### Assistant | 2026-06-10T10:20:20.512Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:20:21.813Z

[tool_use: WebFetch]

### User | 2026-06-10T10:20:24.665Z

[tool_result] # Validity vs. Reliability: Key Distinction

The Wikipedia article on validity clearly distinguishes these as separate measurement properties:

**Reliability without Validity:**
"a scale that is 5 pounds off is reliable but not valid" — this example illustrates a measurement tool that consistently produces the same incorrect result.

**The Core Difference:**
"just because a measure is reliable, it
... [+517 chars truncated]

### User | 2026-06-10T10:20:27.624Z

[tool_result] # Desirable Difficulty: Key Principles

**Core Concept:**
"A desirable difficulty is a learning task that requires a considerable but desirable amount of effort, thereby improving long-term performance."

**The Learning Paradox:**
Research demonstrates that while challenging tasks may decelerate initial acquisition, they yield substantially superior long-term outcomes. As the article notes, "diffi
... [+1070 chars truncated]

### Assistant | 2026-06-10T10:20:35.047Z

Both excellent. Desirable difficulty even gives me the feedback-timing gotcha (delayed feedback can beat immediate, counterintuitively) and the "feels productive but isn't" fluency illusion. I now have more than enough confirmed gotchas. Let me tally what I've confirmed:

1. Cognitive load: three types + balancing act (Wikipedia Cognitive_load)
2. Worked-example effect (same)
3. Expertise reversal effect (same)
4. Split-attention/redundancy effects (same)
5. Spacing effect / massed-practice fails long-term (Spacing_effect)
6. Transfer failure / near-vs-far / context dependency (Transfer_of_learning)
7. Curse of knowledge / expert blind-spot in instruction (Curse_of_knowledge)
8. Testing effect / retrieval as a teaching tool / learner underestimation (Testing_effect)
9. Validity vs reliability (reliable-but-not-valid) (Validity_(statistics))
10. Desirable difficulties / delayed feedback / fluency illusion (Desirable_difficulty)
11. Constructive alignment (objectives-assessment-instruction) (CMU alignment page)

That's 11 distinct confirmed gotchas across 7 distinct source URLs. Now I'll write the file.

### Assistant | 2026-06-10T10:21:49.720Z

[tool_use: Write]

### User | 2026-06-10T10:21:54.620Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/academy/academy-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:22:00.123Z

The file was created successfully. The write was not blocked by any file-claim hook. The cross-refs to `[[academy-source-atlas]]` and `[[academy-pedagogy-foundations]]` are valid — both files exist in the same directory (I read them at the start).

GALAXY: academy
FILE: knowledge/wiki/academy/academy-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 11
SOURCES: 8
NUMERICS_LEFT_GATED: yes
NOTE: The expert-instructor "curse of knowledge" blind spot — subject-matter mastery makes an SME worse at reconstructing where a novice stalls, so difficulty must be verified against actual learners, not the SME's intuition.
