---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"frontend-app\" galaxy ("
date: "2026-06-10"
first_ts: "2026-06-10T10:13:44.637Z"
last_ts: "2026-06-10T10:17:02.223Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-a2eaed30c8dc62f0e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "frontend-app" galaxy (

> **claude-code-cli** | 2026-06-10 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-a2eaed30c8dc62f0e.jsonl`

## Transcript

### User | 2026-06-10T10:13:44.637Z

You are creating the Applied Practice wiki for the PRISM "frontend-app" galaxy (owner: quebec): knowledge/wiki/frontend-app/frontend-app-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won gotchas, FAILURE MODES, and TECHNIQUE DECISIONS a world-class frontend-app practitioner has that pure theory does not teach. This is DISTINCT from frontend-app-foundations.md (theory) and frontend-app-source-atlas.md (link directory) if those exist -- read them first so you do not repeat them.

FOCUS for frontend-app: web frontend practitioner gotchas: unnecessary re-renders + memoization, stale-closure in hooks/effects, derived-vs-source state traps, SSR hydration mismatch, accessibility misses (focus management / ARIA / keyboard), list key-prop bugs, fetch waterfalls + race conditions, bundle bloat / code-splitting. Free: MDN, React/Next.js official docs, web.dev, WAI-ARIA APG.
Qualitative practitioner technique + gotchas. CS/software/ML claims here are papa-verifiable -- cite framework docs / courses / papers. Leave any benchmark-specific numbers owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (framework official docs, university course, gov, reputable practitioner reference, arXiv). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sections (e.g. "## Common failure modes", "## Technique decisions", "## Verification/eval"). Each = the gotcha + WHY + the expert's avoidance, source cited inline.
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: frontend-app, owner_slot: quebec, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, rep
... [+384 chars truncated]

### Assistant | 2026-06-10T10:13:50.747Z

I'll start by reading the existing frontend-app wiki files to avoid repeating theory/links, then build the practitioner-knowledge layer with WebFetch-confirmed claims.

### Assistant | 2026-06-10T10:13:51.976Z

[tool_use: Bash]

### User | 2026-06-10T10:13:58.529Z

[tool_result] total 28
drwxr-xr-x 1 wompu 197611     0 Jun 10 03:18 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 05:11 ../
-rw-r--r-- 1 wompu 197611 17106 Jun 10 03:18 frontend-app-foundations.md

### Assistant | 2026-06-10T10:14:08.168Z

Only the foundations file exists (no source-atlas). Let me read it to avoid repeating theory.

### Assistant | 2026-06-10T10:14:08.651Z

[tool_use: Read]

### User | 2026-06-10T10:14:10.312Z

[tool_result] 1	---
2	title: Frontend-App Foundations — web/front-end software engineering, the DOM + rendering pipeline, component architecture, accessibility, HTTP
3	galaxy: frontend-app
4	owner_slot: quebec
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-create-workflow (2026-06-10)"
7	verification_method: institutional + standards facts WebFetch-confirmed against primary/open sources (MIT 6.031 Software Con
... [+17022 chars truncated]

### Assistant | 2026-06-10T10:14:18.589Z

The foundations file covers theory: rendering pipeline, semantic HTML, one-way data flow, WCAG/ARIA principles, HTTP semantics, DOM event phases. My applied-practice file must be DISTINCT — the practitioner gotchas and failure modes. Focus areas: unnecessary re-renders/memoization, stale closures, derived-vs-source state, hydration mismatch, accessibility focus management misses, list key bugs, fetch waterfalls/races, bundle bloat.

Let me fetch the authoritative sources to confirm each gotcha. I'll batch independent fetches.

### Assistant | 2026-06-10T10:14:20.409Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:14:21.967Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:26.715Z

[tool_result] # Re-rendering in React

## When Components Re-Render

According to the documentation, there are two reasons for a component to render:

1. **Initial render** - when the app starts
2. **State updates** - when the component's (or one of its ancestors') state has been updated

## Triggering Re-renders with State Updates

The key statement about re-rendering is:

> "Once the component has been initia
... [+1323 chars truncated]

### User | 2026-06-10T10:14:29.861Z

[tool_result] # useEffect: Dependencies, Stale Values, and Race Conditions

## Effect Dependencies & Reactivity

The documentation emphasizes that **you cannot choose which values become dependencies**—they are determined by your code:

> **Notice that you can't "choose" the dependencies of your Effect.** Every reactive value used by your Effect's code must be declared as a dependency. Your Effect's dependency 
... [+1835 chars truncated]

### Assistant | 2026-06-10T10:14:38.901Z

Both confirmed. Let me fetch more sources covering memoization, derived state, hydration, list keys, and accessibility focus management.

### Assistant | 2026-06-10T10:14:41.272Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:14:42.485Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:48.389Z

[tool_result] # Key Statements About Avoiding Derived State and Redundant Effects

## Core Principle: Calculate During Rendering, Not in Effects

The page emphasizes a fundamental React principle:

> **"When something can be calculated from the existing props or state, [don't put it in state.](/learn/choosing-the-state-structure#avoid-redundant-state) Instead, calculate it during rendering."**

This makes code 
... [+1170 chars truncated]

### User | 2026-06-10T10:14:49.968Z

[tool_result] # Key Prop in React Lists

## What the Page Says About Keys

The page explains that **keys tell React which array item each component corresponds to**, allowing React to match components between renders even when positions change due to sorting, insertion, or deletion.

## Why Index as Key is Problematic

The page explicitly warns:

> You might be tempted to use an item's index in the array as its
... [+1483 chars truncated]

### Assistant | 2026-06-10T10:14:53.758Z

All confirmed. Let me fetch the remaining sources: SSR hydration mismatch (Next.js), accessibility focus management (W3C APG / MDN), and bundle/code-splitting (web.dev or Next.js).

### Assistant | 2026-06-10T10:14:56.334Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:57.217Z

[tool_result] ---
title: Text content does not match server-rendered HTML
url: "https://nextjs.org/docs/messages/react-hydration-error"
docs_index: /docs/llms.txt
---



## Why This Error Occurred

While rendering your application, there was a difference between the React tree that was prerendered from the server and the React tree that was rendered during the first render in the browser (hydration).

[Hydratio
... [+3385 chars truncated]

### Assistant | 2026-06-10T10:14:57.615Z

[tool_use: WebFetch]

### User | 2026-06-10T10:15:03.526Z

[tool_result] # Keyboard Navigation and Focus Management Guidance

## Core Principle on Keyboard Operability

The guide emphasizes that "all interactive elements must be operable via the keyboard." Interactive ARIA widgets require developers to implement keyboard support, unlike native HTML elements where browsers provide this automatically.

## Focus Management Fundamentals

The page establishes that the Tab a
... [+1109 chars truncated]

### Assistant | 2026-06-10T10:15:05.772Z

All confirmed. Now the final batch: bundle bloat / code-splitting and React.memo / memoization pitfalls.

### Assistant | 2026-06-10T10:15:08.140Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:15:09.990Z

[tool_use: WebFetch]

### User | 2026-06-10T10:15:14.183Z

[tool_result] # Key Insights on JavaScript Bundle Performance

**Why Large Bundles Hurt:**
The page states that "Sending large JavaScript payloads impacts the speed of your site significantly." Over half of users abandon websites taking more than 3 seconds to load.

**Parse and Compile Costs:**
Code splitting reduces "JavaScript parse, compile, and execution-related startup costs" by minimizing main thread work
... [+805 chars truncated]

### User | 2026-06-10T10:15:16.414Z

[tool_result] # React.memo: Key Points on Re-rendering and Props Comparison

## What React.memo Does

`memo` lets you skip re-rendering a component when its props are unchanged:

> "Wrap a component in `memo` to get a *memoized* version of that component. This memoized version of your component will usually not be re-rendered when its parent component is re-rendered as long as its props have not changed."

**Im
... [+1706 chars truncated]

### Assistant | 2026-06-10T10:15:22.532Z

All 8 sources confirmed across 8 distinct gotchas. Let me verify I have enough distinct citations and check for file-claim issues, then write the file. I have 8 distinct source URLs covering 8+ gotchas. Let me write the applied-practice file now.

### Assistant | 2026-06-10T10:16:52.760Z

[tool_use: Write]

### User | 2026-06-10T10:16:57.431Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/frontend-app/frontend-app-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:17:02.223Z

File created successfully with no file-claim block. All 8 gotchas/technique notes are WebFetch-confirmed (I delivered 10 numbered practitioner notes across 5 themed sections plus a verification section, all backed by 8 distinct confirmed source URLs). No source overlaps the foundations entry's URL set.

GALAXY: frontend-app
FILE: knowledge/wiki/frontend-app/frontend-app-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 10
SOURCES: 8
NUMERICS_LEFT_GATED: yes
NOTE: New object/array/function props created inline in render silently defeat React.memo because Object.is compares by reference — the single most common "I memoized it but it still re-renders" trap.
