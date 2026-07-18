---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Independent second-pass review (PRISM 3-of-3 arm B) of an opt-in per-galaxy cap "
date: "2026-06-18"
first_ts: "2026-06-18T19:22:28.452Z"
last_ts: "2026-06-18T19:24:54.580Z"
cwd: "H:\\prism-slot-india"
messages: 37
user_msgs: 13
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a158dba77a36317ac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Independent second-pass review (PRISM 3-of-3 arm B) of an opt-in per-galaxy cap 

> **claude-code-cli** | 2026-06-18 | 37 msgs (13 user / 24 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a158dba77a36317ac.jsonl`

## Transcript

### User | 2026-06-18T19:22:28.452Z

Independent second-pass review (PRISM 3-of-3 arm B) of an opt-in per-galaxy cap in the FLEET-SHARED LoRA corpus assembler (slot:india, U-LORA-CORPUS-GALAXY-CAP, commit f02a7a3582). Read END TO END:

1. H:/prism/scripts/assemble-fleet-lora-corpus.mjs (the capPerGalaxy option in assembleCorpus, capRowsPerGalaxy, parseArgs --cap-per-galaxy, main() reporting)
2. H:/prism/scripts/assemble-fleet-lora-corpus.test.mjs (new cap tests)

CONTEXT: Added to rebalance a corpus where the lathe galaxy hit 54%. Opt-in, default 0 = OFF.

WEIGHT toward:
- DESIGN SOUNDNESS: is capping each galaxy at a flat N the right rebalancing primitive, or does it have a subtle flaw? Specifically: capRowsPerGalaxy preserves SOURCE ORDER and keeps the FIRST N per galaxy. For lathe (one advisory source, all w=0.5) that's fine, but for a galaxy fed by MULTIPLE sources of DIFFERENT weight (some verified w=1.0, some advisory w=0.5), keeping "first N by source order" could keep advisory rows and drop verified rows depending on SOURCES ordering. Is that a real risk? Should the cap prioritize verified-weight rows? Flag it (P1/P2) with reasoning — but note whether it matters for the CURRENT corpus.
- HONESTY: does the --json/report output honestly reflect the cap (cappedPerGalaxy, cappedDropped)? Does main() report it?
- INTEGRATION: confirm default-off means existing fleet consumers (other slots' training runs that call the assembler with no cap) see ZERO change.
- Convention conformance, ASCII, no dup of an existing cap mechanism, test quality (R9).

Report P0/P1/P2 with file:line. End with: GRADE: PASS or GRADE: FAIL.

### Assistant | 2026-06-18T19:22:32.760Z

I'll review this LoRA corpus assembler change end to end. Let me read both files completely.

### Assistant | 2026-06-18T19:22:33.238Z

[tool_use: Read]

### Assistant | 2026-06-18T19:22:33.490Z

[tool_use: Read]

### User | 2026-06-18T19:22:34.019Z

[tool_result] read-once-guard: 'H:\prism\scripts\assemble-fleet-lora-corpus.mjs' was already read 9s ago in this session and is unchanged (mtime 1781810405246). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T19:22:35.263Z

[tool_result] read-once-guard: 'H:\prism\scripts\assemble-fleet-lora-corpus.test.mjs' was already read 9s ago in this session and is unchanged (mtime 1781810475272). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T19:22:37.991Z

The read-once guard says these were already read but I don't have the content in my context (this is a fresh agent thread). Let me disable the cache to get the actual content.

### Assistant | 2026-06-18T19:22:38.893Z

[tool_use: Bash]

### User | 2026-06-18T19:22:43.216Z

[tool_result] #!/usr/bin/env node
/**
 * assemble-fleet-lora-corpus.mjs -- the MANIFEST CONSUMER (U-LORA-CORPUS-ASSEMBLE,
 * slot:india 2026-06-10).
 *
 * THE DORMANCY THIS CLOSES: the vault -> LoRA chain dead-ended at the manifest.
 * scripts/vault-to-lora-dataset.mjs PRODUCES Alpaca-triple datasets and
 * build-fleet-training-corpus-inventory.mjs REGISTERS them as
 * kind:'lora-training-jsonl' sources -- but 
... [+15170 chars truncated]

### Assistant | 2026-06-18T19:22:46.533Z

I have the source. Now let me read the test file and the dependency `deriveGalaxy`.

### Assistant | 2026-06-18T19:22:47.197Z

[tool_use: Bash]

### User | 2026-06-18T19:22:52.833Z

[tool_result] /**
 * assemble-fleet-lora-corpus.test.mjs -- unit tests for the manifest-consuming
 * fleet LoRA corpus assembler (U-LORA-CORPUS-ASSEMBLE, slot:india 2026-06-10).
 *
 * R9: every test encodes WHY, with real reference values. Pure functions are
 * tested hermetically (injected readImpl, no disk). Covers happy path + >=3
 * failure modes + >=2 adversarial + a live-inventory scan (R15 step-3 in-suit
... [+19155 chars truncated]

### Assistant | 2026-06-18T19:22:57.530Z

I have both files. The triage warning is a false positive (the cat succeeded). Now let me verify the `deriveGalaxy` dependency and check whether there's a pre-existing cap mechanism this might duplicate. Let me also look at the git diff to see exactly what this commit changed.

### Assistant | 2026-06-18T19:22:59.158Z

[tool_use: Bash]

### User | 2026-06-18T19:23:03.622Z

[tool_result] #!/usr/bin/env node
/**
 * tag-lora-corpus-galaxies.mjs -- recover DROPPED galaxy attribution in the fleet LoRA combined
 * corpus (slot:india 2026-06-18). The per-galaxy "<512 pairs/galaxy" LoRA blocker is largely a
 * TAGGING-LOSS bug, not data scarcity: 917/1336 rows in state/shared/lora/fleet-lora-combined.jsonl
 * carry NO galaxy field, and ~322 of those are galaxy-SPECIFIC pairs whose produc
... [+6586 chars truncated]

### Assistant | 2026-06-18T19:23:06.972Z

Now I understand the full picture. Let me look at the exact diff for the .mjs file to confirm precisely what changed, and verify the design concern about source ordering and weight by examining how the cap interacts with the verified/advisory weighting.

### Assistant | 2026-06-18T19:23:07.898Z

[tool_use: Bash]

### User | 2026-06-18T19:23:13.903Z

[tool_result] commit f02a7a3582464c24c6bedb356dfd8b041f25f071
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 14:21:55 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-CORPUS-GALAXY-CAP (slot:india): opt-in --cap-per-galaxy in the fleet corpus assembler -- stops one galaxy dominating the fine-tune (lathe hit 54%; cap=300 -> 17%, balanced across 34). capRowsPerGalaxy pure+expo
... [+5606 chars truncated]

### Assistant | 2026-06-18T19:23:17.616Z

I have the complete picture now. Let me run the test suite to confirm the claimed 31/31 pass, and verify the source-ordering / weight concern empirically by checking how the inventory orders sources (whether any single galaxy is fed by multiple sources of differing weight).

### Assistant | 2026-06-18T19:23:18.394Z

[tool_use: Bash]

### User | 2026-06-18T19:23:23.865Z

[tool_result]   ...
# Subtest: capRowsPerGalaxy: cap<=0 or non-finite is a no-op (default OFF -> zero behavior change)
ok 30 - capRowsPerGalaxy: cap<=0 or non-finite is a no-op (default OFF -> zero behavior change)
  ---
  duration_ms: 0.0977
  ...
# Subtest: assembleCorpus threads capPerGalaxy: capped stats match the written set
ok 31 - assembleCorpus threads capPerGalaxy: capped stats match the written set
  
... [+135 chars truncated]

### Assistant | 2026-06-18T19:23:27.448Z

31/31 pass confirmed. Now let me verify the design concern empirically: does any single galaxy in the live corpus get fed by multiple sources of differing weight, where "keep first N by source order" could drop verified rows in favor of advisory rows? Let me inspect the live inventory and the actual combined corpus composition.

### Assistant | 2026-06-18T19:23:30.124Z

[tool_use: Bash]

### User | 2026-06-18T19:23:35.082Z

[tool_result] PRESENT lora sources (in inventory/SOURCE order):
  - machine-lathe-lora  advisory=true  path=H:/prism/state/shared/lora/machine-lathe-dataset.jsonl
  - vault-feedback-lora  advisory=false  path=H:/prism/state/shared/lora/vault-feedback-dataset.jsonl
  - vault-galaxy-synthesis-lora  advisory=true  path=H:/prism/state/shared/lora/vault-galaxy-synthesis-dataset.jsonl
  - vault-galaxy-aisynergy-lora 
... [+940 chars truncated]

### Assistant | 2026-06-18T19:23:43.236Z

This is the key empirical fact. There ARE multiple sources of differing weight, and several galaxies are fed by more than one source. Let me confirm whether any single galaxy receives rows from both a verified (advisory=false) and an advisory (advisory=true) source, where the verified source comes LATER in source order and could be the one dropped by the cap.

### Assistant | 2026-06-18T19:23:47.070Z

[tool_use: Bash]

### User | 2026-06-18T19:23:53.372Z

[tool_result] Total rows: 3126 | galaxies covered: 34

Galaxies fed by MULTIPLE sources (mixed-weight risk surface):
  lathe  <-- MIXED verified+advisory
      [0] machine-lathe-lora w=0.5 ADV x1657
      [2200] vault-galaxy-synthesis-lora w=0.5 ADV x11
      [2382] vault-galaxy-aisynergy-lora w=1 VER x1
      [2409] bridge-reasoning-lora w=0.5 ADV x6
  (untagged)  <-- MIXED verified+advisory
      [1657] vault
... [+5780 chars truncated]

### Assistant | 2026-06-18T19:23:57.032Z

This is the decisive empirical evidence. Let me verify the exact concern: with the realistic cap=300 (the operator's stated target), would any verified row actually be dropped? And separately, would lathe's cap drop verified lathe rows?

### Assistant | 2026-06-18T19:24:03.863Z

[tool_use: Bash]

### User | 2026-06-18T19:24:08.803Z

[tool_result] cap=300: totalRows 3126 -> 1751 | cappedDropped=1375 | VERIFIED rows dropped=1 (lathe: -1 verified)
cap=1: totalRows 3126 -> 762 | cappedDropped=2364 | VERIFIED rows dropped=12 (ai-training: -1 verified, blueprint-vision: -1 verified, cad: -1 verified, cam: -1 verified, hermes-zulu: -1 verified, lathe: -1 verified, mill: -1 verified, post-processor: -1 verified, quoting: -1 verified, speed-feed: -
... [+61 chars truncated]

### Assistant | 2026-06-18T19:24:16.872Z

This confirms the design concern precisely and quantifies it. The risk is real but narrow:

- At the **operator's actual cap=300** (the stated rebalancing target): the cap drops 1375 rows, of which exactly **1 is a verified row** (lathe's single `vault-galaxy-aisynergy-lora` w=1.0 row, which sits at index ~2382, far past the 300 cap). So at the intended operating point, the flaw drops one verified row to keep ~299 advisory rows of that galaxy.
- At pathological **cap=1**, 12 verified rows are dropped fleet-wide — because in every mixed galaxy the verified `vault-galaxy-aisynergy-lora` row comes AFTER the advisory `vault-galaxy-synthesis-lora` rows in source order, so "keep first N" keeps the advisory rows and drops the lone verified one.

The diagnosis in the review prompt is exactly correct: order-preserving "first N" does not prioritize verified weight, and because the verified `aisynergy` source is ordered after the advisory `synthesis` source, the cap preferentially drops verified rows. This is a genuine P2 (real, but barely material at the intended cap=300: 1 verified row).

I have everything needed. Let me confirm there is no pre-existing cap/rebalance mechanism this duplicates.

### Assistant | 2026-06-18T19:24:18.172Z

[tool_use: Grep]

### User | 2026-06-18T19:24:19.607Z

[tool_result] Found 5 files
H:\prism\scripts\assemble-fleet-lora-corpus.test.mjs
H:\prism\scripts\assemble-fleet-lora-corpus.mjs
H:\prism\scripts\high-value-additions-rank.mjs
H:\prism\scripts\lib\worklist-label-proposer.test.mjs
H:\prism\scripts\lib\worklist-label-proposer.mjs

### Assistant | 2026-06-18T19:24:22.810Z

Let me confirm the two other matches are unrelated (not a competing per-galaxy cap on the LoRA corpus).

### Assistant | 2026-06-18T19:24:23.834Z

[tool_use: Bash]

### User | 2026-06-18T19:24:28.570Z

[tool_result] scripts/high-value-additions-rank.mjs:349:        ? "Fix DISPATCHER_DIGEST regen parser to recognize spread-array action enums; rebalance camDispatcher (1921 actions)"
scripts/lib/worklist-label-proposer.mjs:126: * Class-rebalance impact of labeling a ghost as `dispatcher`, given the current
scripts/lib/worklist-label-proposer.mjs:148: * class-rebalance impact (rarest Ollama-proposed class first) 
... [+620 chars truncated]

### Assistant | 2026-06-18T19:24:54.580Z

Those are unrelated (dispatcher action rebalancing and ghost-label class rebalancing). No duplicate per-galaxy cap mechanism exists. `capRowsPerGalaxy` is novel.

I now have everything I need to render the verdict. Let me summarize my findings.

## Review Summary

I read both files end to end, the commit diff, the `deriveGalaxy` dependency it imports, and validated against the LIVE inventory (12 present LoRA sources, 3126-row corpus). I ran the test suite (31/31 pass) and empirically reproduced the design concern at the operator's stated cap=300 and at pathological cap=1.

---

VERDICT: PASS

summary: The opt-in `--cap-per-galaxy` is correctly implemented, honestly reported (`cappedPerGalaxy`/`cappedDropped` in both `--json` and human output, all summary stats recomputed on the capped set), and default-off so existing fleet consumers see zero change (verified: `assembleCorpus` signature adds only a destructured option defaulting to `0`, and `capPerGalaxy > 0 ? ... : { rows, dropped: 0 }` short-circuits to identity). Tests are real R9 invariants, no stubs, no `.skip`/`.only`, ASCII-only, no duplicate cap mechanism exists. The one substantive issue is the design flaw the prompt named — order-preserving "keep first N" does not prioritize verified-weight rows — which is REAL but barely material at the intended cap (P2).

findings:
- [P2] `scripts/assemble-fleet-lora-corpus.mjs:240-256` (`capRowsPerGalaxy`) — The cap keeps the FIRST N rows per galaxy by source order and is weight-blind. Empirically confirmed against the live inventory: every mixed-weight galaxy is fed by the advisory `vault-galaxy-synthesis-lora` source BEFORE the verified `vault-galaxy-aisynergy-lora` source (source order: synthesis at idx ~1970-2366, aisynergy at ~2377-2388), so "first N" preferentially keeps advisory rows and drops the lone verified row. At the operator's stated **cap=300** this drops exactly **1 verified row** (lathe's single w=1.0 row at idx 2382) out of 1375 dropped — negligible fo
... [+2385 chars truncated]
