---
type: "chat-session"
source: "claude-code-cli"
session_id: "396bc735-a076-4d5a-977a-de669f963c1b"
title: "Review a 3-file PRISM change that generalizes the wiki recall-index generator so"
date: "2026-05-19"
first_ts: "2026-05-19T00:42:41.666Z"
last_ts: "2026-05-19T00:47:58.860Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/396bc735-a076-4d5a-977a-de669f963c1b/subagents/agent-a8796f908fb15edec.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Review a 3-file PRISM change that generalizes the wiki recall-index generator so

> **claude-code-cli** | 2026-05-19 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/396bc735-a076-4d5a-977a-de669f963c1b/subagents/agent-a8796f908fb15edec.jsonl`

## Transcript

### User | 2026-05-19T00:42:41.666Z

Review a 3-file PRISM change that generalizes the wiki recall-index generator so the hand-written wiki tree (software-engineering/, lessons/, etc.) stops being invisible to the recall hooks ("writer-without-reader" stagnation fix). Read each file end-to-end:

1. H:/prism/scripts/build-wiki-leaf-index.mjs — the generator. Focus: the new `HAND_WIKI_DIRS` const (replaced single `CODE_TRIBAL_DIR`) and the loop that replaced the code-tribal-only block. Verify: env-override contract (PRISM_WIKI_HAND_DIRS comma-split; PRISM_WIKI_CODE_TRIBAL_DIR back-compat preserved); `type = fm.type || basename(dir)` is correct; index/log/_-prefixed skip is sound; no dead vars (codeTribalCount was removed — confirm fully gone, _stats line + stdout use handWikiCount/handWikiByDir); pushEntry dedup still works across 14 dirs; no behavior change to the architecture/tribal/memories corpora.

2. H:/prism/scripts/build-wiki-embeddings.mjs — only CONCEPT_TYPES extended with the 14 hand-wiki dir basenames. Verify the set stays in sync with HAND_WIKI_DIRS basenames in file 1 (this is the load-bearing coupling — a basename in file 1 NOT in file 2 = indexed-but-not-embedded half-stagnation). Confirm no other logic touched.

3. H:/prism/scripts/build-wiki-leaf-index.test.mjs — new node:test suite. Verify the integration test is a genuine fail-on-revert oracle (would FAIL on the pre-fix code-tribal-only walk), not a stub; assertions check real values not toBeDefined; tmp-tree isolation + cleanup is sound.

Report P0/P1/P2 with file:line. Grade PASS or FAIL. Be specific about the file1↔file2 type-sync coupling and any silent-failure path.

### Assistant | 2026-05-19T00:43:21.099Z

I'll review these 3 files end-to-end. Let me read them all.

### Assistant | 2026-05-19T00:43:21.100Z

[tool_use: Read]

### Assistant | 2026-05-19T00:43:21.506Z

[tool_use: Read]

### Assistant | 2026-05-19T00:43:21.757Z

[tool_use: Read]

### User | 2026-05-19T00:43:27.917Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-leaf-index.mjs
4	 *
5	 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
6	 *   knowledge/wiki/architecture/_leaf-index.jsonl
7	 *
8	 * One line per entry: { name, title, type, desc, path } where:
9	 *   - name  = basename without .md  (the [[wiki-link]] target)
10	 *   - title = frontmatter title (falls back to first H1)
11	 
... [+22707 chars truncated]

### User | 2026-05-19T00:43:28.588Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-leaf-index.test.mjs — node:test
4	 *
5	 * Covers the two exported pure helpers AND a real subprocess integration oracle
6	 * for the "writer-without-reader" fix: the generator originally walked ONLY
7	 * knowledge/wiki/code-tribal/, leaving software-engineering/, lessons/, … wikis
8	 * invisible to wiki-precheck-inject. The HAND_WIKI_DIRS generalization 
... [+8047 chars truncated]

### User | 2026-05-19T00:43:29.028Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-embeddings.mjs
4	 *
5	 * Embeds the *concept* leaf entries (engines, dispatchers, registries, layers,
6	 * domains, skills, hooks, formulas, algorithms, milestones, monolith categories,
7	 * frontends, JM-Die customers, combos, design specs, …) — everything EXCEPT the
8	 * ~9.2K per-action entries, which are too numerous and too templated to be worth
9	 
... [+11591 chars truncated]

### Assistant | 2026-05-19T00:43:34.670Z

All three files read end-to-end. Now let me verify the load-bearing claims against the live tree.

### Assistant | 2026-05-19T00:43:36.115Z

[tool_use: Bash]

### Assistant | 2026-05-19T00:43:37.332Z

[tool_use: Bash]

### User | 2026-05-19T00:43:48.766Z

[tool_result] .hook-cache/ architecture/ code-tribal/ concepts/ consensus/ coordination/ decisions/ entities/ lessons/ os/ patterns/ reference/ software-engineering/ summaries/ trajectories/ ux-design/ .gitkeep  0B index.jsonl  193.4K index.md  202.5K log.md  48.0K ---DIRS-ABOVE---

### User | 2026-05-19T00:44:12.947Z

[tool_result] code-tribal=611
software-engineering=19
lessons=21
concepts=0
patterns=0
decisions=1
consensus=12
coordination=1
entities=2
os=32
reference=1
trajectories=0
ux-design=0
summaries=0

### Assistant | 2026-05-19T00:44:21.862Z

The 14 `HAND_WIKI_DIRS` basenames exactly match the 14 real wiki subdirectories (everything under `knowledge/wiki/` except `architecture/`, `.hook-cache/`, and the index/log files which are correctly excluded). Let me verify the file1↔file2 basename sync precisely and check for dead vars.

### Assistant | 2026-05-19T00:44:28.437Z

[tool_use: Bash]

### User | 2026-05-19T00:44:55.184Z

[tool_result] f1 HAND_WIKI_DIRS basenames (15): code-tribal,code-tribal,software-engineering,lessons,concepts,patterns,decisions,consensus,coordination,entities,os,reference,trajectories,ux-design,summaries
BASENAMES IN f1 NOT IN f2 CONCEPT_TYPES: (none — sync OK)
codeTribalCount refs: 0
CODE_TRIBAL_DIR const decl: false
handWikiCount refs: 4
handWikiByDir refs: 4

### Assistant | 2026-05-19T00:45:01.365Z

The sync is verified clean. Let me confirm the test is a genuine fail-on-revert oracle by simulating the pre-fix code-tribal-only behavior, and check the env-override + run-once behavior.

### Assistant | 2026-05-19T00:45:02.514Z

[tool_use: Bash]

### User | 2026-05-19T00:45:41.796Z

[tool_result]   ...
# Subtest: integration: software-engineering + lessons + code-tribal all index with dir-basename type
ok 10 - integration: software-engineering + lessons + code-tribal all index with dir-basename type
  ---
  duration_ms: 940.6665
  ...
# Subtest: source invariant: default HAND_WIKI_DIRS lists every hand-written dir + honors CODE_TRIBAL_DIR back-compat
ok 11 - source invariant: default HAND_
... [+214 chars truncated]

### Assistant | 2026-05-19T00:45:46.630Z

11/11 pass. Now let me verify the integration test would genuinely FAIL on the pre-fix code (the fail-on-revert oracle claim) by reproducing the old code-tribal-only walk against the test's tmp tree:

### Assistant | 2026-05-19T00:45:52.291Z

[tool_use: Bash]

### User | 2026-05-19T00:46:22.350Z

[tool_result] Integration runIndexer env block:
runIndexer({
      PRISM_WIKI_ARCH_DIR: arch,
      PRISM_WIKI_TRIBAL_DIR: join(root, "no-tribal"),
      PRISM_WIKI_MEMORIES_DIR: join(root, "no-memories"),
      PRISM_WIKI_HAND_DIRS: [ct, se, lessons].join(","),
    });
---
Passes PRISM_WIKI_HAND_DIRS: true
Passes PRISM_WIKI_CODE_TRIBAL_DIR: false

### Assistant | 2026-05-19T00:46:30.349Z

Now I have a subtle but important finding on the fail-on-revert oracle. Let me reason through it precisely.

The test passes `PRISM_WIKI_HAND_DIRS` — an env var that **did not exist in the pre-fix code**. On the pre-fix code-tribal-only generator, that env var would be ignored, and the walk would default to `PRISM_WIKI_CODE_TRIBAL_DIR || <wiki>/code-tribal`. Since the test does NOT set `PRISM_WIKI_CODE_TRIBAL_DIR`, the pre-fix code would walk the **real production `knowledge/wiki/code-tribal/`** (611 files), not the tmp tree. The tmp `se/` and `lessons/` files would be absent → `assert.ok(byName["fail-loud-r12-patterns"])` throws → test FAILS. So it is a genuine fail-on-revert oracle, but for a slightly different reason than the docstring implies (the pre-fix code wouldn't even find the tmp `ct/` entry either, since it'd walk the real tree). The net effect — pre-fix code fails this test — holds. This is a P2 documentation nuance, not a defect.

Let me do final checks on silent-failure paths and the back-compat contract.

### Assistant | 2026-05-19T00:46:42.670Z

[tool_use: Bash]

### User | 2026-05-19T00:47:22.057Z

[tool_result] Ternary precedence: PRISM_WIKI_HAND_DIRS wins, CODE_TRIBAL_DIR ignored when both set — DOCUMENTED at lines 50-52
existsSync guard on each HAND dir: true
walkMd try/catch readdirSync (missing dir safe): true
seenNames shared dedup across all corpora: true
f2 isConcept has || true fallthrough (line 109): true

### Assistant | 2026-05-19T00:47:58.860Z

All checks complete. Here is my review.

---

## Code Quality Analysis Report — 3-file wiki recall-index generalization

### Summary
- Overall Quality Score: **9/10**
- Files Analyzed: 3
- Issues Found: 4 (0 P0, 0 P1, 4 P2)
- Verdict: the "writer-without-reader" fix is correct, the file1↔file2 coupling is in sync, and the test is a genuine fail-on-revert oracle.

### Verification performed (not just read)
- **14 `HAND_WIKI_DIRS` basenames exactly match the 14 real `knowledge/wiki/` subdirs** (code-tribal, software-engineering, lessons, concepts, patterns, decisions, consensus, coordination, entities, os, reference, trajectories, ux-design, summaries). `architecture/` correctly excluded (walked separately), `.hook-cache/` / index.md / log.md correctly not in the list. Live counts: code-tribal=611, software-engineering=19, lessons=21, os=32 — these were the stagnant entries the fix surfaces.
- **file1↔file2 type-sync coupling: CLEAN.** Programmatically diffed `HAND_WIKI_DIRS` default basenames in `build-wiki-leaf-index.mjs` against `CONCEPT_TYPES` in `build-wiki-embeddings.mjs:84-99` → zero basenames in file1 missing from file2. No indexed-but-not-embedded half-stagnation.
- **Dead-var removal: COMPLETE.** `codeTribalCount` = 0 references, `const CODE_TRIBAL_DIR` declaration = gone. `handWikiCount`/`handWikiByDir` correctly wired into the `_stats.md` line (`build-wiki-leaf-index.mjs:370`) and stdout (`:405`).
- **Test suite: 11/11 PASS.** Integration test logically verified as fail-on-revert (pre-fix code-tribal-only walk → tmp `se/`+`lessons/` entries absent → `assert.ok` throws).

### P2 Findings

**P2-1 — Fail-on-revert oracle works, but for a different reason than the docstring states.**
- File: `build-wiki-leaf-index.test.mjs:6-13`, env block `:110-115`
- The docstring says "On the pre-fix code (code-tribal-only walk) those assertions fail." That's true but the *mechanism* is: the test passes `PRISM_WIKI_HAND_DIRS` (an env var that didn't exist pre-fix), so pre-f
... [+4242 chars truncated]
