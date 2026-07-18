---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"bug-hunting\" galaxy (o"
date: "2026-06-10"
first_ts: "2026-06-10T10:28:01.513Z"
last_ts: "2026-06-10T10:32:22.070Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-a6345b5b63fe34986.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "bug-hunting" galaxy (o

> **claude-code-cli** | 2026-06-10 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-a6345b5b63fe34986.jsonl`

## Transcript

### User | 2026-06-10T10:28:01.513Z

You are creating the Applied Practice wiki for the PRISM "bug-hunting" galaxy (owner: golf): knowledge/wiki/bug-hunting/bug-hunting-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won CS-engineering gotchas, FAILURE MODES, and TECHNIQUE DECISIONS that pure theory does not teach. DISTINCT from bug-hunting-foundations.md (theory) -- read it first so you do not repeat it; this entry is "what goes wrong in practice and how an expert avoids it."

FOCUS for bug-hunting: testing/static-analysis practitioner gotchas: green test with no oracle (asserts nothing -- the R9 failure), flaky-test root causes (shared state / timing / ordering), coverage != correctness, mock drift from real interface, silent catch-and-continue hiding failures, boundary off-by-one. Free: MIT 6.005/6.031, software-testing literature, NIST SAMATE.
CS-engineering claims here are papa-verifiable -- cite course/docs/paper. Leave any benchmark-specific number owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (OSTEP, MIT/Stanford courseware, official docs, man pages, arXiv, NIST/OSHA, reputable engineering reference). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-12 cited gotchas/technique notes across 4-5 themed sections. Each = the gotcha + WHY + the expert's avoidance, source cited inline. Map each to how THIS PRISM galaxy hits it (one line).
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: bug-hunting, owner_slot: golf, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: bug-hunting
FILE: knowledge/wiki/bug-hunting/bug-hunting-ap
... [+255 chars truncated]

### Assistant | 2026-06-10T10:28:05.590Z

I'll start by reading the foundations entry so I don't repeat theory, then verify each practitioner claim via WebFetch before writing.

### Assistant | 2026-06-10T10:28:06.290Z

[tool_use: Bash]

### User | 2026-06-10T10:28:11.898Z

[tool_result] bug-hunting-foundations.md
---DIR-EXISTS---

### Assistant | 2026-06-10T10:28:21.496Z

Let me read the foundations entry to avoid repeating theory.

### Assistant | 2026-06-10T10:28:21.974Z

[tool_use: Read]

### User | 2026-06-10T10:28:23.885Z

[tool_result] 1	---
2	title: Bug-Hunting Foundations — test oracles, coverage criteria, fault localization, static analysis, assertion design
3	galaxy: bug-hunting
4	owner_slot: golf
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-meta-create-workflow (2026-06-10)"
7	verification_method: CS/software-engineering foundations WebFetch-confirmed against primary free sources (MIT 6.031 Software Construction sp22 Tes
... [+17466 chars truncated]

### Assistant | 2026-06-10T10:28:28.777Z

Foundations covers theory: oracles, coverage criteria, partition/boundary testing, fail-fast/assertions, rep invariants/checkRep, static analysis, fault localization, NIST SAMATE/SPC. My applied-practice entry must be DISTINCT — the practitioner gotchas, not the theory. I'll focus on: green-test-no-oracle in practice, flaky tests (shared state/timing/ordering), coverage-vs-correctness traps, mock drift, silent catch-and-continue, boundary off-by-one. Let me verify each claim via WebFetch.

Let me fetch the source pages in parallel.

### Assistant | 2026-06-10T10:28:33.013Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:28:35.897Z

[tool_use: WebFetch]

### User | 2026-06-10T10:28:39.296Z

[tool_result] # Non-Deterministic Tests: Key Quotes from Martin Fowler

## Root Causes

**Lack of Isolation:**
"Keep your tests isolated from each other, so that execution of one test will not affect any others."

**Asynchronous Behavior:**
"Never use bare sleeps to wait for asynchonous responses: use a callback or polling."

**Time/Dates:**
"Always wrap the system clock, so it can be easily substituted for tes
... [+840 chars truncated]

### User | 2026-06-10T10:28:44.310Z

[tool_result] # Exact Quotes from Reading 3: Testing

## (1) Purpose of Testing: "Make It Fail"

"A good tester intentionally pokes at all the places the program might be vulnerable, so that those vulnerabilities can be eliminated."

"Normally when you're coding, your goal is to make the program work. But as a test suite designer, you want to _make it fail_."

## (2) Why Exhaustive Testing is Infeasible

"The s
... [+1240 chars truncated]

### Assistant | 2026-06-10T10:28:46.601Z

Both confirmed. Now let me fetch the mock/test-double drift and silent-failure sources.

### Assistant | 2026-06-10T10:28:52.057Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:28:53.897Z

[tool_use: WebFetch]

### User | 2026-06-10T10:28:57.844Z

[tool_result] # Mock Tests and Reality Divergence: Key Quotes

The article addresses coupling and implementation risks but doesn't explicitly discuss mocks diverging from real collaborator behavior or false confidence when integration fails. Here's the closest relevant passage:

**On coupling tests to implementation:**

"Mockist tests are thus more coupled to the implementation of a method. Changing the nature 
... [+822 chars truncated]

### User | 2026-06-10T10:28:58.593Z

[tool_result] # Error Hiding / Exception Swallowing: Definition & Consequences

## Definition

According to Wikipedia, **error hiding** (also called **error swallowing**) is defined as:

> "the practice of catching an error or exception, and then continuing without logging, processing, or reporting the error to other parts of the software"

## Key Consequences

The article explains that when errors are swallowe
... [+731 chars truncated]

### Assistant | 2026-06-10T10:29:02.033Z

Both confirmed. The mocksArentStubs page gave me the key "run green but mask inherent errors" quote. Now let me verify a couple more practitioner sources: Google's flaky-test / test-size guidance and the "coverage is not correctness" framing, plus a concurrency/test-isolation source.

### Assistant | 2026-06-10T10:29:04.871Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:06.377Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:29:07.370Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:14.131Z

[tool_result] # Flaky Tests at Google: Key Quotes

**Definition:**
"A test that sometimes passes and sometimes fails, without any code changes" - this is the core definition implied throughout the post's discussion of test flakiness.

**Scale/Proportion:**
The blog post does not provide specific numerical data about the proportion of flaky tests observed at Google in the visible content.

**Cost to Development:
... [+789 chars truncated]

### Assistant | 2026-06-10T10:29:21.864Z

The Google coverage post 404'd. The flaky-tests post gave usable material but the quotes are imprecise/from comments — I'll be conservative and not rely on it. Let me get a more authoritative coverage-vs-correctness source and a test-determinism/ordering source. Let me retry the Google coverage post once with the correct URL pattern, and fetch the Wikipedia "fault coverage"/mutation testing page for the "weak oracle" angle.

### Assistant | 2026-06-10T10:29:24.660Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:29.297Z

[tool_result] # Mutation Testing: Key Concepts

## Quality Evaluation of Tests

"The value of a test suite is measured by the percentage of mutants that it kills."

This demonstrates that mutation testing assesses test quality beyond mere code coverage.

## Fault Injection Mechanism

"A test detects, and therefore rejects, a mutant upon test failure – failure indicating that the test successfully discerned that
... [+759 chars truncated]

### Assistant | 2026-06-10T10:29:30.733Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:37.600Z

[tool_result] # Fail Fast and Error Handling Principles

## Fail Fast Definition
"_Failing fast_ means that code should reveal its bugs as early as possible. The earlier a problem is observed (the closer to its cause), the easier it is to find and fix."

## Static vs. Dynamic Checking
"static checking fails faster than dynamic checking, and dynamic checking fails faster than producing a wrong answer that may co
... [+853 chars truncated]

### Assistant | 2026-06-10T10:29:41.765Z

Excellent — both confirmed and the MIT 6.031 sp22 code-review page (04-code-review) gives the fail-fast + DRY + "quietly return the wrong answer" quotes (a fresh sp22 URL distinct from foundations' sp21 one). Now I have strong material. Let me get one more for the "test ordering / shared global state" practitioner angle from an authoritative source, and verify the xUnit Test Patterns "erratic test" smell.

### Assistant | 2026-06-10T10:29:44.863Z

[tool_use: WebFetch]

### User | 2026-06-10T10:30:06.825Z

[tool_result] ECONNREFUSED

### Assistant | 2026-06-10T10:30:09.135Z

xunitpatterns.com refused (likely http-only / down). Per the rules, retry once then drop. Let me retry once with https.

### Assistant | 2026-06-10T10:30:10.843Z

[tool_use: WebFetch]

### User | 2026-06-10T10:30:32.618Z

[tool_result] ECONNREFUSED

### Assistant | 2026-06-10T10:30:39.816Z

Dropping xunitpatterns.com per the retry-once rule. I already have the shared-state/isolation gotcha well-covered by Martin Fowler's nonDeterminism.html ("Keep your tests isolated from each other, so that execution of one test will not affect any others"). That's sufficient and authoritative.

I have 7 distinct confirmed sources with strong verbatim material:
1. Martin Fowler nonDeterminism.html — flaky-test root causes
2. MIT 6.031 sp22 Testing — make-it-fail, exhaustive infeasible, boundary/off-by-one
3. Martin Fowler mocksArentStubs.html — mocks "run green but mask inherent errors"
4. Wikipedia Error hiding — catch-and-continue, info lost
5. Wikipedia Mutation testing — coverage != correctness, mutation score
6. MIT 6.031 sp22 Code Review (04) — fail-fast, quietly-wrong-answer, DRY
7. (Google flaky post too imprecise — dropping)

Let me get one more solid source for the mock-drift "contract test" mitigation to strengthen that section — Pact/consumer-driven contract testing is well-documented. Let me fetch the Martin Fowler contract test article.

### Assistant | 2026-06-10T10:30:42.084Z

[tool_use: WebFetch]

### User | 2026-06-10T10:30:46.065Z

[tool_result] # Contract Test Definitions

**On the core purpose:**
"These check that all the calls against your test doubles return the same results as a call to the external service would."

**On the problem they solve:**
"Testing against a double always raises the question of whether the double is indeed an accurate representation of the external service, and what happens if the external service changes its 
... [+279 chars truncated]

### Assistant | 2026-06-10T10:30:48.485Z

All confirmed. I now have 7 distinct sources with strong verbatim quotes. Let me write the applied-practice entry.

### Assistant | 2026-06-10T10:32:12.194Z

[tool_use: Write]

### User | 2026-06-10T10:32:17.704Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/bug-hunting/bug-hunting-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:32:22.070Z

The file was created successfully. No file-claim hook blocked the Write.

GALAXY: bug-hunting
FILE: knowledge/wiki/bug-hunting/bug-hunting-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 11
SOURCES: 7
NUMERICS_LEFT_GATED: yes
NOTE: Coverage measures execution, not verification -- a suite can run every line yet kill zero mutants; mutation testing is the practitioner detector for the green-test-no-oracle (R9) failure.
