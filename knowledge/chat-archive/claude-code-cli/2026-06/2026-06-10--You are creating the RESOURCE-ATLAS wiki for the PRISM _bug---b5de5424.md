---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"bug-hunting\" meta/infra "
date: "2026-06-10"
first_ts: "2026-06-10T20:30:15.812Z"
last_ts: "2026-06-10T20:33:55.268Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a1dde4444523222a6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "bug-hunting" meta/infra 

> **claude-code-cli** | 2026-06-10 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a1dde4444523222a6.jsonl`

## Transcript

### User | 2026-06-10T20:30:15.812Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "bug-hunting" meta/infra galaxy (owner: golf, focus: software testing / fuzzing / differential testing): knowledge/wiki/bug-hunting/bug-hunting-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[bug-hunting-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/bug-hunting/; vitest suites; CIMCO-bridge parity

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): google/oss-fuzz github; AFL++ github (AFLplusplus); MIT 6.031 testing; Hypothesis property-testing docs
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[bug-hunting-foundations]], [[bug-hunting-source-atlas]], [[bug-hunting-applied-practice]], [[bug-hunting-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to golf + constants.ts.
4. Sections: Local code+stores / Canonical repos+paper
... [+798 chars truncated]

### Assistant | 2026-06-10T20:30:20.822Z

I'll work through this carefully. First, let me verify the local PRISM paths exist, then WebFetch each online candidate before listing.

### Assistant | 2026-06-10T20:30:22.324Z

[tool_use: Bash]

### Assistant | 2026-06-10T20:30:27.785Z

[tool_use: Bash]

### User | 2026-06-10T20:30:35.268Z

[tool_result] /h/prism/mcp-server/src/engines/bug-hunting//
---ENGINE DIR EXISTS---
CLAUDE.md
MEMORY.md
PATHS.md
TOOLBELT.md

### User | 2026-06-10T20:30:42.383Z

[tool_result] bug-hunting-advanced-techniques.md
bug-hunting-applied-practice.md
bug-hunting-foundations.md
bug-hunting-source-atlas.md
---WIKI DIR---
4

### Assistant | 2026-06-10T20:30:45.632Z

Engine dir and 4 sibling wiki files confirmed. Let me verify the vitest suites path and CIMCO-bridge parity references, then check the engine dir's own PATHS/TOOLBELT for local store pointers.

### Assistant | 2026-06-10T20:30:48.330Z

[tool_use: Bash]

### Assistant | 2026-06-10T20:30:48.709Z

[tool_use: Read]

### User | 2026-06-10T20:31:31.006Z

[tool_result] === vitest config / suites dir ===
5AXIS-DEEP.test.ts
A2AProtocolEngine.test.ts
ABCClassificationFormula.test.ts
AEMonitoringDispatcherWiring.test.ts
AHPEngine.test.ts
(count:)
4509
=== CIMCO bridge ===
./knowledge/memories/reference/reference_post_ship_cimco-integration-ms0-u-cimco-bridge-parity-fix.md
./knowledge/wiki/code-tribal/learnings/cimco-integration-ms0-u-cimco-bridge-parity-fix.md

### User | 2026-06-10T20:31:33.594Z

[tool_result] 1	# bug-hunting galaxy — PATHS atlas (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — the owning slot should ENRICH this with the domain's true hot paths. Companion: [`CLAUDE.md`](./CLAUDE.md) · [`MEMORY.md`](./MEMORY.md) · [`TOOLBELT.md`](./TOOLBELT.md).
4	
5	## Engines (name-matched to this domain, 15 found — verify ownership
... [+3796 chars truncated]

### Assistant | 2026-06-10T20:31:38.819Z

Good context. I now understand the galaxy: the engine dir is `bug-hunting/` (UNIFORM slot per scaffold, but owner_slot per this task is golf — meta/infra). Let me verify the CIMCO-bridge parity test file path and the regression test dir, then verify online sources in parallel.

### Assistant | 2026-06-10T20:31:41.031Z

[tool_use: Bash]

### Assistant | 2026-06-10T20:31:41.945Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:31:42.819Z

[tool_use: WebFetch]

### User | 2026-06-10T20:31:48.323Z

[tool_result] === CIMCO parity test files ===
mcp-server/src/__tests__/CimcoVerificationBridgeEngine.test.ts
mcp-server/src/__tests__/dataDispatcher.cimco-export.test.ts
=== regression test dir ===
PostProcessorFeedOptimizer.baseline.test.ts
(reg count:)
1
=== vitest config ===
mcp-server/vitest.config.ts

### User | 2026-06-10T20:31:54.664Z

[tool_result] # OSS-Fuzz Repository

**Project Name:** OSS-Fuzz

**One-line Description:** A continuous fuzzing service that automatically tests open source software to identify security vulnerabilities and stability bugs.

**Confirmation:** Yes, this is Google's official OSS-Fuzz repository. According to the page, it's a collaborative effort "in cooperation with the Core Infrastructure Initiative and the OpenS
... [+390 chars truncated]

### User | 2026-06-10T20:31:56.122Z

[tool_result] # AFL++ Repository Confirmation

**Project Name:** AFL++ (American Fuzzy Lop plus plus)

**One-Line Description:** A superior fork of Google's AFL fuzzer featuring enhanced speed, expanded mutations, improved instrumentation, and custom module support for vulnerability discovery.

This is indeed the AFL++ fuzzer repository. According to the GitHub page, it's described as "afl with community patche
... [+301 chars truncated]

### Assistant | 2026-06-10T20:32:01.184Z

Both fuzzing repos confirmed. CIMCO parity test confirmed as `CimcoVerificationBridgeEngine.test.ts`. Now let me verify the remaining two seeded candidates (MIT 6.031 and Hypothesis docs).

### Assistant | 2026-06-10T20:32:03.195Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:32:07.504Z

[tool_use: WebFetch]

### User | 2026-06-10T20:32:12.746Z

[tool_result] # Hypothesis Documentation

**Library Name:** Hypothesis

**One-line Description:** "the property-based testing library for Python"

This is confirmed to be the official documentation for Hypothesis, as evidenced by the branding, navigation structure, and introductory content describing the library's core functionality for writing tests that automatically explore input ranges including edge cases.

### User | 2026-06-10T20:32:15.004Z

[tool_result] # MIT 6.031 Software Construction Course Confirmation

**Course Identity:** Yes, this is the MIT 6.031 Software Construction course from Spring 2022.

**Course Title:** "6.031: Software Construction"

**Software Testing Coverage:** The course includes testing instruction. Reading 03 is titled "Testing," and the course explicitly covers "test-first programming, partitioning, coverage" based on the 
... [+590 chars truncated]

### Assistant | 2026-06-10T20:32:21.163Z

All 4 seeded candidates verified. Let me add a couple of high-value canonical sources I can verify: Google's testing fundamentals (sanitizers / libFuzzer canonical home is LLVM) and the seminal AFL original page, plus a differential-testing canonical paper. Let me verify a few additions.

### Assistant | 2026-06-10T20:32:22.306Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:32:23.295Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:32:27.521Z

[tool_use: WebFetch]

### User | 2026-06-10T20:32:28.913Z

[tool_result] # Proptest Repository

**Name:** Proptest

**One-line Description:** "Hypothesis-like property testing for Rust" — a framework that automatically generates test inputs and shrinks failures to minimal reproducible cases.

This is indeed the proptest repository. It's a property-testing framework inspired by Python's Hypothesis, enabling developers to verify that code properties hold across arbitrary
... [+61 chars truncated]

### User | 2026-06-10T20:32:29.466Z

[tool_result] # Official LLVM libFuzzer Documentation

**Name:** libFuzzer

**One-line Description:** An in-process, coverage-guided, evolutionary fuzzing engine for detecting bugs in software libraries.

**Confirmation:** Yes, this is the official LLVM documentation. The page header clearly identifies it as "libFuzzer – a library for coverage-guided fuzz testing. — LLVM 23.0.0git documentation" and appears in 
... [+435 chars truncated]

### User | 2026-06-10T20:32:39.471Z

[tool_result] # NIST Automated Combinatorial Testing for Software (ACTS) Project

**Project Name:** Combinatorial Methods for Trust and Assurance (ACTS - Automated Combinatorial Testing for Software)

**Availability of Tools and Reports:** Yes, both are freely available.

## Key Details

**Tools:** The ACTS tool is offered at no cost. The page states: "Software on this site is free of charge and will remain fre
... [+888 chars truncated]

### Assistant | 2026-06-10T20:32:43.502Z

All additional sources verified (libFuzzer, proptest, NIST ACTS). I now have 7 verified online sources. Let me write the resource-atlas file.

### Assistant | 2026-06-10T20:33:43.272Z

[tool_use: Write]

### User | 2026-06-10T20:33:48.720Z

[tool_result] File created successfully at: /h/prism/knowledge/wiki/bug-hunting/bug-hunting-resource-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T20:33:55.268Z

File created successfully. The atlas does not duplicate the sibling source-atlas (this is reach-index, that is learn-curriculum). All paths verified, all online URLs WebFetch-confirmed, no numeric thresholds promoted.

GALAXY: bug-hunting
FILE: knowledge/wiki/bug-hunting/bug-hunting-resource-atlas.md
CREATED: yes
LOCAL_POINTERS_LINKED: 18
ONLINE_VERIFIED: 7
CANDIDATES_DROPPED: 0
NOTE: Google OSS-Fuzz (github.com/google/oss-fuzz) — the canonical continuous-fuzzing service that this galaxy's audit-loop infrastructure mirrors at the codebase level.
