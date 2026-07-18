# KNOWLEDGE-CONVERSION-MS0/U-KIP03 — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-KIP03: KIP outcome → LoRA training rotation closed-loop hop

**Commit:** `b6a5916f7471` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T08:57:59-05:00
**Tags:** knowledge-conversion-ms0, u-kip03, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-KIP03: KIP outcome → LoRA training rotation closed-loop hop

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-KIP03: KIP outcome → LoRA training rotation closed-loop hop

Closes the open hop in KIP's closed-loop. KIP previously recorded
injections + outcomes via KnowledgeInjectionPipelineEngine but had no
mechanism to feed orphan / low-help-rate injections back into LoRA
training. This unit extracts a rotation-candidate JSONL that downstream
LoRA cadence consumers (lathe/mill/wedm/cad/grinding) read on their next
retrain tick.

Files:
- scripts/lib/kip-lora-rotation.mjs (NEW) — pure extractRotationCandidates
  + renderCandidatesJsonl. R12 fail-loud on bad input, tolerant of
  malformed rows, deterministic with frozenTime.
- scripts/kip-rotate-orphans-to-lora.mjs (NEW) — CLI: ledger read + atomic
  write + summary report. --dry-run/--threshold/--min-consume/--frozen-time
  /--repo-root/--json/--help.
- scripts/lib/atomic-json.mjs (MOD) — added atomicWriteText() sibling to
  atomicWriteJson() so the kip CLI uses the canonical lib instead of
  inlining a twin.
- All 3 new files + lib extension have companion tests; 104/104 pass via
  node --test (49 lib + 39 CLI + 16 atomic-json).

Per-file scrutiny: 6 reviewer agents (3 files × 2 agents). 5 PASS + 1
PARTIAL-FAIL. Fixes applied this session:
- P1-1 atomicWriteText folded into canonical atomic-json.mjs.
- P1 writer-without-reader: explicit READER CONTRACT in CLI header
  documenting the downstream LoRA consumer protocol; U-KIP04 queued.
- P2-2 parseArgs sentinel-consumption: takeValue helper rejects
  undefined/empty/--prefix/-h.
- P2-3 --repo-root non-existent path: existsSync gate with R12 fail-loud.

Real-data E2E exercises the live KIP ledgers (currently empty, valid
"no data yet" state). Bucket-sum invariant pinned as fail-on-revert
regression oracle per RGS-TOOL-AUTOINVOKE-MS1 lesson.

Synergy gap context: this is Gap 3 of the user's "/goal do them all in
high roi order" /loop directive. Gap 1 (MCP HTTP → Ollama L2b)
already-shipped 2026-05-18 foxtrot. Gap 2 (NN-GRAPH retrain) blocked
on upstream U-VIZ-SPLIT-OUT-FILE F11 race. Gap 4 (3-tier AI surface) up
next.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (7)
- scripts/kip-rotate-orphans-to-lora.mjs      | 369 ++++++++++++++++++++++
- scripts/kip-rotate-orphans-to-lora.test.mjs | 466 +++++++++++++++++++++++++++
- scripts/lib/atomic-json.mjs                 |  52 ++-
- scripts/lib/atomic-json.test.mjs            | 158 +++++++++-
- scripts/lib/kip-lora-rotation.mjs           | 278 ++++++++++++++++
- scripts/lib/kip-lora-rotation.test.mjs      | 472 ++++++++++++++++++++++++++++
- 6 files changed, 1793 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- lesson.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b6a5916f7471`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._