---
type: "chat-session"
source: "claude-code-cli"
session_id: "6cef1e3c-59a5-4cd8-8447-449991f1ed8d"
title: "Review the single commit HEAD in the repo at H:/prism (run `git -C H:/prism show"
date: "2026-06-21"
first_ts: "2026-06-21T21:41:03.234Z"
last_ts: "2026-06-21T21:44:58.315Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 17
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a53441fd2642a278f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review the single commit HEAD in the repo at H:/prism (run `git -C H:/prism show

> **claude-code-cli** | 2026-06-21 | 50 msgs (17 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a53441fd2642a278f.jsonl`

## Transcript

### User | 2026-06-21T21:41:03.234Z

Review the single commit HEAD in the repo at H:/prism (run `git -C H:/prism show HEAD`). It is `[SIERRA-VIZ]/U-XSUB-CONSENSUS-REFRESH`. Two files changed:

1. `scripts/generate-cross-substrate-edges.mjs` — a COMMENT-ONLY change de-staling the consensus-of doc block (was "1 edge today (only hermes-zulu)"; now "one edge per domain that owns an octopus outcomes jsonl, 13 as of 2026-06-21").

2. `scripts/generate-cross-substrate-edges.test.mjs` — the embeds-edge `from` shape assertion changed. OLD: `assert.ok(typeof e.from==="string" && e.from.length>0 && /\./.test(e.from), "...not node-id-shaped")`. NEW: `assert.ok(typeof e.from==="string" && e.from.length>0, ...)` then `assert.ok(/\./.test(e.from) || knownNodeIds.has(e.from), "...neither namespaced nor a confirmed graph node")`. The `if (ORACLE) assert.ok(oracleNodeIds.has(e.from), ...)` line below is PRESERVED unchanged.

CRITICAL QUESTION you must answer: Is the test-2 change a WEAKENING of the assertion (forbidden by CLAUDE.md R12 — "never weaken an assertion to make it green") or a legitimate CORRECTION toward the test's true intent (R9)?

Context to verify yourself:
- The change was made because regenerating the augmentation surfaced 27 real, documented flat-id graph nodes as embeds `from` ids — `untracked`, `memory_feedback`, `memory_patterns`, `vault_Skills`, `vault_decisions`, etc. (Obsidian-vault + untracked category roots). The old `/\./` proxy rejected them as "not node-id-shaped" even though they ARE real graph nodes that legitimately carry a 768d embedding.
- `knownNodeIds` in the test (line ~69) = union of slot/galaxy/wiki/mem/roost augmentation node ids + the node-card-offsets oracle (~346K node ids). So `knownNodeIds.has(x)` is a genuine graph-membership confirmation.
- The generator only emits an embeds edge for a node it confirmed via `graphNodeIds.has(nodeId)` (so `from` is always a real graph node).

Assess: (a) Does the NEW assertion still FAIL on a garbage/dangling `from` (e.g. a dot-less string 
... [+398 chars truncated]

### Assistant | 2026-06-21T21:41:06.130Z

I'll review this commit carefully. Let me start by reading the actual commit and both files end to end.

### Assistant | 2026-06-21T21:41:06.677Z

[tool_use: Bash]

### User | 2026-06-21T21:41:15.214Z

[tool_result] commit c5fac24e4368b0dcb4bd2e9251473a8f874f2175
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 16:39:02 2026 -0500

    [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-UI-UNCERTAINTY (slot:oscar): surface dropped backend uncertainty/advisory in the SFC web UI
    
    The orchestrator (prism_calc:sf_orchestrate) always emits overall_confidence,
    uncertainty.*, safety_checks[],
... [+26973 chars truncated]

### Assistant | 2026-06-21T21:41:20.135Z

The actual HEAD commit is NOT the commit described in the task prompt. The task describes a commit `[SIERRA-VIZ]/U-XSUB-CONSENSUS-REFRESH` touching `scripts/generate-cross-substrate-edges.mjs` and `scripts/generate-cross-substrate-edges.test.mjs`, but the real HEAD is `[SFC-FRONTEND]/U-SFC-UI-UNCERTAINTY` (slot:oscar), an entirely different commit touching SFC web UI files.

I must fail loud (R12). Let me verify the commit is not findable elsewhere before reporting, in case the target was committed under a different SHA or the files exist with the described changes in the working tree.

### Assistant | 2026-06-21T21:41:22.474Z

[tool_use: Bash]

### User | 2026-06-21T21:41:26.863Z

[tool_result] === branch ===
cad-fusion-live-ms0
=== search log for the described commit ===
bbb0128138 [MAIN-FORCE] [SIERRA-VIZ]/U-XSUB-CONSENSUS-REFRESH (slot:sierra): octopus consensus-of edges 1->13 + de-stale + fix over-narrow embeds shape proxy
=== do the described files exist? ===
-rwxr-xr-x 1 wompu 197611 37445 Jun 21 16:25 scripts/generate-cross-substrate-edges.mjs*
-rw-r--r-- 1 wompu 197611 15339 Jun 
... [+56 chars truncated]

### Assistant | 2026-06-21T21:41:30.588Z

The described commit is `bbb0128138`, NOT HEAD (`c5fac24e43`). HEAD is a different, later commit. The task prompt told me "Review the single commit HEAD" but HEAD has since advanced. The actual target commit exists at `bbb0128138`. Let me review that commit, which is clearly what the reviewer was dispatched for.

### Assistant | 2026-06-21T21:41:31.486Z

[tool_use: Bash]

### User | 2026-06-21T21:41:37.963Z

[tool_result] commit bbb01281382fa19a74c7da2dba6196cf37c5ef66
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 16:32:34 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-XSUB-CONSENSUS-REFRESH (slot:sierra): octopus consensus-of edges 1->13 + de-stale + fix over-narrow embeds shape proxy
    
    The cross-substrate augmentation was frozen Jun-17 (regen-viz re-merges the graph
    fresh 
... [+7148 chars truncated]

### Assistant | 2026-06-21T21:41:41.029Z

This is the correct target commit. Now I need to read the full test file end-to-end to verify the critical claims: the definitions of `knownNodeIds`, `ORACLE`, `oracleNodeIds`, and confirm the new assertion's behavior. Let me also read the generator's embeds-emission logic to verify `from` is always a confirmed graph node.

### Assistant | 2026-06-21T21:41:41.137Z

[tool_use: Read]

### User | 2026-06-21T21:41:43.585Z

[tool_result] 1	/**
2	 * generate-cross-substrate-edges.test.mjs — verifies the SHIPPED cross-substrate
3	 * edge artifact (CROSS-SUBSTRATE-SYNERGY-MS0, slot:sierra). It asserts the INTENT
4	 * of the two materialized edge types, not just "the file parses":
5	 *
6	 *   owned-by-slot  — galaxy/domain graph node  -> NATO slot node (pre-existing).
7	 *   documented-by  — galaxy graph node         -> the wiki/memor
... [+15915 chars truncated]

### Assistant | 2026-06-21T21:41:49.298Z

I've now read the full test file. The critical structure is confirmed:
- Line 67-68: `oracleNodeIds` is the set of `oracle.offsets` keys (the ~346K merged-graph node ids); `ORACLE = !!oracleNodeIds`.
- Line 69-72: `knownNodeIds` = union of slot/galaxy/wiki/mem/roost ids **plus** `oracleNodeIds`. So `knownNodeIds.has(x)` is genuine graph-membership confirmation (and is a superset of the oracle).
- Line 184: `if (ORACLE) assert.ok(oracleNodeIds.has(e.from), ...)` is PRESERVED unchanged — the strongest assert when the oracle is present.

Now let me read the generator's embeds-emission code to verify the central claim: that the generator only emits an embeds edge for a node it confirmed via graph membership (so `from` is always a real graph node, never garbage).

### Assistant | 2026-06-21T21:41:51.176Z

[tool_use: Grep]

### User | 2026-06-21T21:41:54.073Z

[tool_result] 15: *   3. `embeds`         -> graph node -> its nomic-768d embedding pool (system-viz
16: *                          <-> PRISM-AI / NN / GNN / RAG embedding-footprint synergy).
345:  // Loaded once here; the embeds pass below reuses graphNodeIds.
347:  const graphNodeIds =
351:  const oracleNoteIds = graphNodeIds
352:    ? [...graphNodeIds].filter((id) => id.startsWith("memory_") || id.startsWith
... [+3225 chars truncated]

### Assistant | 2026-06-21T21:41:58.553Z

The key line is 521: `if (!graphNodeIds.has(nodeId)) { ...skip... }`. The generator only emits an embeds edge for a node confirmed in `graphNodeIds` (the node-card offset oracle = the merged-graph node set). Let me read that emission block precisely to confirm the skip-on-unconfirmed logic, and confirm what `from` is set to.

### Assistant | 2026-06-21T21:41:59.384Z

[tool_use: Read]

### User | 2026-06-21T21:42:00.885Z

[tool_result] 500	          ghost: true,
501	          ...(embedParent ? { parent: embedParent } : {}),
502	          info: src.desc,
503	        });
504	        roostNodeIds.add(src.roostId);
505	      }
506	      for (const line of text.split(/\r?\n/)) {
507	        if (!line) continue;
508	        let rec;
509	        try {
510	          rec = JSON.parse(line);
511	        } catch {
512	          continue;
5
... [+2170 chars truncated]

### Assistant | 2026-06-21T21:42:05.577Z

This fully confirms the generator's contract. Lines 521-524: if the embedded node's id is **not** in `graphNodeIds` (the node-card offset oracle = merged-graph node set), the edge is skipped as "would dangle". Line 530: `from: nodeId`. So every emitted embeds `from` is a confirmed merged-graph node.

Now let me verify the central empirical claims by actually running the test and checking that the 27 flat-id nodes are real and that garbage is rejected. Let me first check the artifact's actual embeds `from` ids to confirm flat-id roots exist and that they ARE in the oracle.

### Assistant | 2026-06-21T21:42:11.553Z

[tool_use: Bash]

### User | 2026-06-21T21:42:17.882Z

[tool_result] total embeds: 60572
flat-id (dot-less) embeds from: 27
unique flat-id froms: 27
sample flat ids: untracked, memory_dreams, memory_feedback, memory_galaxies, memory_uncategorized, memory_patterns, memory_project, memory_reference, memory_scrutiny, memory_user, memory_weekly-synthesis, memory__index, memory__legacy-root, vault_Skills, vault_bases, vault_claude-md, vault_dataview, vault_decisions, va
... [+233 chars truncated]

### Assistant | 2026-06-21T21:42:22.253Z

Empirically confirmed: there are exactly 27 unique flat-id (dot-less) embeds `from` values, all of them real category-root nodes (`untracked`, `memory_feedback`, `vault_Skills`, etc.), and all 27 ARE in the oracle (merged-graph node set). These are the nodes the old `/\./` proxy wrongly rejected.

Now the three critical sub-questions. Let me verify (a) the new assertion FAILS on garbage, (b) old vs new strength, and (c) any bad edge slips through. Let me run the exact assertion logic against adversarial inputs and run the real test suite.

### Assistant | 2026-06-21T21:42:28.365Z

[tool_use: Bash]

### User | 2026-06-21T21:42:33.026Z

[tool_result] xyzgarbage (dot-less, NOT in graph)            OLD pass: false  NEW pass: false
empty string                                   OLD pass: false  NEW pass: false
dangling dotted (looks namespaced, fake)       OLD pass: true  NEW pass: true
real flat root in graph                        OLD pass: false  NEW pass: true
real flat root in graph 2                      OLD pass: false  NEW pass: true
real
... [+73 chars truncated]

### Assistant | 2026-06-21T21:42:41.842Z

This is the decisive analysis. The truth table answers all three sub-questions:

**(a) Does NEW fail on garbage?** Yes — `xyzgarbage` (dot-less, not in graph): NEW pass = false. Empty string: NEW pass = false. The negative control holds.

**(b) Stronger or weaker than `/\./`?** For the dotted branch, NEW and OLD are identical (`/\./.test` accepts anything with a dot). For the flat-id branch, NEW is **stronger in spirit** — it requires actual graph-membership confirmation (`knownNodeIds.has`), whereas a dot-proxy is just a syntactic guess. The dotted-fake case (`eng.totally_fake_engine_zzz`) shows BOTH old and new pass it on the syntactic shape check — but that case is then caught by the preserved line-184 oracle assert `oracleNodeIds.has(e.from)` when the oracle is present. So nothing regressed.

**(c) Any genuinely-bad edge the new lets through that the old caught?** No. The only delta in behavior is: flat-id roots that ARE real graph nodes now PASS (correctly — these were false negatives in the old assert). A dot-less garbage id still fails. There is no input that the old assertion REJECTED and the new one now ACCEPTS that is actually bad.

Now let me run the actual test suite to confirm 10/10 green and the test genuinely exercises this path.

### Assistant | 2026-06-21T21:42:42.413Z

[tool_use: Bash]

### User | 2026-06-21T21:42:47.269Z

[tool_result]   ...
# Subtest: consensus-of edges fired + are the system-viz<->PRISM-AI hybrid-consensus synergy
ok 7 - consensus-of edges fired + are the system-viz<->PRISM-AI hybrid-consensus synergy
  ---
  duration_ms: 4.8157
  ...
# Subtest: stats edgeTypes tally matches the actual edge composition
ok 8 - stats edgeTypes tally matches the actual edge composition
  ---
  duration_ms: 47.7699
  ...
# Subtest
... [+516 chars truncated]

### Assistant | 2026-06-21T21:42:51.385Z

The summary line says "pass 8 / fail 2" but the per-test lines I can see are all `ok`. The `# pass 8 / # fail 2` discrepancy with 10 named subtests all showing `ok 1..ok 10` is suspicious. Let me get the full output to see which tests "failed" — this could be a node:test top-level reporting artifact, or real failures I need to surface.

### Assistant | 2026-06-21T21:42:52.243Z

[tool_use: Bash]

### User | 2026-06-21T21:42:56.799Z

[tool_result] ok 1 - artifact shape: non-empty typed edge set + galaxy-roost nodes
ok 2 - whole batch is schema-valid with zero duplicates
not ok 3 - NO DANGLING EDGE — every endpoint is a confirmed/folded node
ok 4 - owned-by-slot edges preserved (no regression) + well-formed
ok 5 - documented-by edges fired + are the system-viz<->Obsidian/Wiki synergy
not ok 6 - embeds edges fired + are the system-viz<->PRISM
... [+378 chars truncated]

### Assistant | 2026-06-21T21:43:00.026Z

There ARE 2 real failures: test 3 (NO DANGLING EDGE) and test 6 (embeds edges) — the very test that was modified. The commit message claims "10/10 tests." This is a discrepancy I must investigate. Let me get the actual failure detail.

### Assistant | 2026-06-21T21:43:00.711Z

[tool_use: Bash]

### User | 2026-06-21T21:43:05.072Z

[tool_result] not ok 6 - embeds edges fired + are the system-viz<->PRISM-AI/NN/GNN/RAG synergy
  ---
  duration_ms: 14.8592
  location: 'H:\\prism\\scripts\\generate-cross-substrate-edges.test.mjs:157:1'
  failureType: 'testCodeFailure'
  error: 'embeds source eng.other.acquisitionrecommendationengine not in merged graph'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operat
... [+1304 chars truncated]

### Assistant | 2026-06-21T21:43:15.261Z

Important finding. The failure is NOT in the changed assertion (the new `/\./.test || knownNodeIds.has` at line 181) — it is at **line 184**, the PRESERVED oracle assert: `embeds source eng.other.acquisitionrecommendationengine not in merged graph`. That is a namespaced (dotted) id that passes the changed line-181 check but is NOT in the current oracle's `offsets`.

This means the **committed artifact is stale relative to the committed oracle** — there is a genuine dangling embeds `from` (`eng.other.acquisitionrecommendationengine`) that the preserved line-184 assert correctly catches. Let me confirm whether this is a pre-existing condition (failing before this commit too) or introduced/uncovered by this commit. Let me check the test against the PARENT commit and inspect the dangling id.

### Assistant | 2026-06-21T21:43:20.497Z

[tool_use: Bash]

### User | 2026-06-21T21:43:25.957Z

[tool_result] embeds froms NOT in current oracle: 249
sample: eng.other.acquisitionrecommendationengine
  eng.other.intentclassifierengine
  eng.other.policyexperienceledgerengine
  eng.other.designtofloorpipelineengine
  eng.other.machiningintelligenceorchestratorengine
  eng.other.additivemanufacturingtribalcorpusengine
  eng.other.alarmintelligenceengine
  eng.other.as9100traceabilityengine
  eng.other.barst
... [+711 chars truncated]

### Assistant | 2026-06-21T21:43:34.917Z

Now the picture is clear and important:

- Both the augmentation artifact AND the oracle (`node-card-offsets.json`) are **gitignored** — they are NOT in the commit. They are locally-regenerated.
- There are **249** embeds `from` ids (the `eng.other.*` namespaced family) in the locally-regenerated artifact that are NOT in the locally-present oracle. These trip the **preserved line-184** assert (`if (ORACLE) assert.ok(oracleNodeIds.has(e.from), ...)`), and the line-95 NO-DANGLING check (test 3).

The 2 failures are caused by a **local artifact/oracle skew** (the artifact was regenerated at 21:36 against a node set that no longer matches the locally-present `node-card-offsets.json`), NOT by the assertion change in this commit. Critically, these 249 failures are on **dotted** ids (`eng.other.*`) which BOTH the old and new line-181 shape check accept — so the assertion change is not the cause and would not have prevented or caused these.

Let me verify this is a pre-existing/local-state condition by checking out the parent commit's test and running it against the same local (gitignored) artifacts, and confirm the commit author's "10/10" was against a then-consistent local artifact.

### Assistant | 2026-06-21T21:43:41.271Z

[tool_use: Bash]

### User | 2026-06-21T21:43:47.062Z

[tool_result] === Run PARENT commit's test file against current local gitignored artifacts ===
not ok 1 - C:\\Users\\wompu\\AppData\\Local\\Temp\\parent-test.mjs
# tests 1
# pass 0
# fail 1

=== timestamps: oracle vs artifact mtime ===
state/shared/system-viz/node-card-offsets.json  2026-06-21 16:39:52.428258700 -0500
state/shared/system-viz/cross-substrate-edges-augmentation.json  2026-06-21 16:36:20.792668400
... [+135 chars truncated]

### Assistant | 2026-06-21T21:43:57.157Z

The parent test failed to even load from /tmp (relative-path resolution: it computes `ROOT` from `__dirname`, so running from `/tmp` breaks `VIZ_DIR`). That's a test-harness artifact of my invocation, not meaningful. The decisive facts are the timestamps:

- `cross-substrate-edges-augmentation.json` mtime: **16:36:20** (regenerated)
- `node-card-offsets.json` (oracle) mtime: **16:39:52** — regenerated **3.5 minutes LATER**

So the oracle was rebuilt AFTER the augmentation. The artifact was generated against an earlier node-card offset index; the oracle then got rebuilt and the `eng.other.*` ids dropped out of it (offset index churns). The artifact is now stale relative to the oracle. This is a **local-state skew on gitignored files**, created after the commit — not something this commit changed.

Critically: the `eng.other.*` ids are **dotted**, so the assertion change (line 181, which only affects the dot-less/flat-id branch) is completely orthogonal to these 249 failures. The failures hit line 95 (NO-DANGLING) and line 184 (preserved oracle assert), both of which existed before this commit identically.

Let me confirm the assertion change itself is sound by directly testing the modified test against a freshly-regenerated, self-consistent artifact — regenerate the augmentation so artifact and oracle agree, then run the committed test.

### Assistant | 2026-06-21T21:43:59.254Z

[tool_use: Bash]

### User | 2026-06-21T21:44:06.876Z

[tool_result] === Regenerate the augmentation against the CURRENT oracle (self-consistent) ===
  - tribal-knowledge -> golf: galaxy domain node id not confirmed
  - cad-fusion-live -> golf: galaxy domain node id not confirmed
  - eng.toolpath -> kilo: domain-group node not confirmed (inference)
  - eng.strategy -> kilo: domain-group node not confirmed (inference)
  - eng.blueprint -> xray: domain-group node not
... [+1027 chars truncated]

### Assistant | 2026-06-21T21:44:11.872Z

Definitive. When the gitignored augmentation is regenerated to be self-consistent with the local oracle, the committed test passes **10/10** — exactly as the commit message claimed. The 2 failures I first saw were purely a local artifact/oracle skew (the augmentation was 3.5 min older than the oracle that got rebuilt afterward), entirely on dotted `eng.other.*` ids that the assertion change does not touch. The author's "10/10 tests" claim was truthful against their self-consistent local state.

Now let me confirm the embeds test actually still exercises the flat-id branch meaningfully after regen (that the 27 flat-ids survived and the assertion is load-bearing), and verify the negative-control claim by mutating the assertion's input.

### Assistant | 2026-06-21T21:44:17.876Z

[tool_use: Bash]

### User | 2026-06-21T21:44:22.312Z

[tool_result] post-regen embeds: 60323 | flat-id froms still present: 27
flat sample: untracked, memory_dreams, memory_feedback, memory_galaxies, memory_uncategorized, memory_patterns

NEGATIVE CONTROL new-assert("xyzgarbage"): false (must be false)
all 27 flat-ids pass new line-181 AND are in oracle: true

### Assistant | 2026-06-21T21:44:25.055Z

All verifications complete. Let me also confirm the comment-only change to the `.mjs` file is genuinely comment-only (no logic touched) and that the file is ASCII-clean, then finalize.

### Assistant | 2026-06-21T21:44:29.773Z

[tool_use: Bash]

### User | 2026-06-21T21:44:34.852Z

[tool_result] === .mjs change is comment-only? (show the changed region with context) ===
-  //     cross-substrate edge type; it materializes 1 edge today (only hermes-zulu has run
-  //     a consensus) and AUTO-SCALES -- every domain that gains an outcomes jsonl links on
-  //     the next regen with zero code change. NOT a claim that the spine is "done" -- it
-  //     is the mechanism, wired ahead of produ
... [+867 chars truncated]

### Assistant | 2026-06-21T21:44:58.315Z

All checks pass. I have everything needed to render a verdict. Let me summarize what I verified.

The `.mjs` change is provably comment-only (all changed lines start with `//`, no logic touched). The `.test.mjs` change is the assertion under scrutiny, and the consensus-of test (test 7) already accepts the higher count via `>= 1`.

---

VERDICT: PASS

summary: The test-2 assertion change is a legitimate R9 CORRECTION, not an R12 weakening. The old `/\./` dot-proxy was a syntactic guess that produced false negatives — it rejected 27 real, oracle-confirmed flat-id category-root nodes (`untracked`, `memory_feedback`, `vault_Skills`, etc.) that legitimately carry a 768d embedding. The new assertion replaces the proxy with the authoritative invariant (graph-membership via `knownNodeIds`) while preserving the strongest check (the line-184 `oracleNodeIds.has` assert) unchanged. Garbage still fails; no genuinely-bad edge is let through. The `.mjs` change is provably comment-only. I confirmed 10/10 tests pass against a self-consistent regenerated artifact.

findings: none

Auditable verification trail (all citations are `file:line` I opened and ran):

- **Target resolution (fail-loud):** The task said "review HEAD," but live HEAD is `c5fac24e43` `[SFC-FRONTEND]/U-SFC-UI-UNCERTAINTY` — a different commit. The described `[SIERRA-VIZ]/U-XSUB-CONSENSUS-REFRESH` commit is `bbb0128138` (HEAD has since advanced). I reviewed `bbb0128138`, the commit actually described. Flagging the SHA drift so the gate keys the ledger correctly.

- **Sub-question (a) — does NEW fail on garbage?** Yes. `scripts/generate-cross-substrate-edges.test.mjs:179-183`: NEW requires `typeof e.from==="string" && e.from.length>0` AND (`/\./.test(e.from)` OR `knownNodeIds.has(e.from)`). I ran the exact predicate: `xyzgarbage` → false; empty string → false. Negative control holds.

- **Sub-question (b) — stronger or weaker than the `/\./` proxy?** Stronger in substance. For the dotted branch the two are identical;
... [+1993 chars truncated]
