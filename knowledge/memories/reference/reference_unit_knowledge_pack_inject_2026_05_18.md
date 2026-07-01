---
name: unit-knowledge-pack-inject-2026-05-18
description: U-UKP02 — UserPromptSubmit hook that auto-injects per-unit knowledge pack into context when a slot has a fresh claim; closes U-UKP01's on-demand→live gap
metadata:
  type: reference
---

# U-UKP02 — `unit-knowledge-pack-inject` (2026-05-18 charlie)

Follow-on to [[reference_unit_knowledge_pack_2026_05_18]] (U-UKP01).

## What it is

`.claude/hooks/unit-knowledge-pack-inject.mjs` — UserPromptSubmit T2 hook
that fires `composePack(unitId)` and injects a ≤800-char summary into the
prompt context, **automatically, on every prompt**, when the chat slot has
an active fresh claim.

Pipeline: stdin → derive `claude-<8hex>` → `chat-slots.json` lookup →
`slot-task-claims.json` lookup (heartbeat < 30 min) → throttle stamp gate
(4h TTL per (slot, unitId)) → `composePack` → `renderCompact` → emit as
`additionalContext`. Pure decision functions + dep-injected readers.

Wired in `C:/.claude/settings.json` UserPromptSubmit chain after
`goal-prereq-inject` (timeout 8s); `c-to-h-mirror` auto-replicates to H:.

## Why it matters

U-UKP01 (the composer) was CLI-only — a slot got dedicated knowledge ONLY
if it remembered to invoke `node scripts/unit-knowledge-pack.mjs <id>`.
This makes it ambient: every prompt the chat sends, if it has a claim,
gets the dedicated-knowledge slice for free. The throttle gate ensures
it fires once per (slot, unitId) per 4 hours — fresh on first prompt
after claim change, silent on subsequent prompts.

## Lesson: peer-collision class

The U-UKP02 work got committed under a peer's commit message
(`5709f19d7b [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP04`) because my `git add`
ran near-simultaneously with another chat's commit-all and the
auto-unstage hook ran on a different invocation. The capability shipped
correctly; only the attribution drifted.

**Rule restated**: when the peer-claim unstage hook strips files from
your stage, re-stage ONLY your deliverable paths by exact name and
verify `git diff --cached --name-only` before committing. Don't `git add`
broad path patterns (entire `.claude/hooks/`) — they can sweep up peer
files that landed in the same dir between hook-runs.

## Stats

- 34 node:test cases, all PASS
- Live-verified: hook returns `{continue:true}` when slot has no claim
  (silent no-op confirmed correct)
- Settings.json wiring lives OUTSIDE the H:/prism repo, so the wiring
  step doesn't appear in the U-UKP02 commit — confirm with:
  `grep unit-knowledge-pack-inject C:/Users/<u>/.claude/settings.json`

## Knobs

- `PRISM_UNIT_PACK_INJECT_DISABLE=1` — kill switch
- `PRISM_UNIT_PACK_INJECT_TTL_MS=<ms>` — throttle window (default 4h)
- `PRISM_UNIT_PACK_INJECT_MAX_CHARS=<N>` — summary cap (default 800)

## Sister entries

- [[reference_unit_knowledge_pack_2026_05_18]] — U-UKP01 composer
- [[reference_ollama_prism_bridge_l2]] — Layer 2 of the Ollama bridge
- [[reference_ollama_expand_ms0]] — Layer 1 (`ask-ollama.mjs`)
- [[reference_ollama_expand_charlie_iter_2026_05_18]] — earlier charlie
  iters: dashboard adjusted offload rate + 33× wiki-leaf scan

## Verify

```bash
# Settings wiring
grep unit-knowledge-pack-inject "$env:USERPROFILE/.claude/settings.json"
# Direct fire (real sid):
echo '{"session_id":"<your-sid>","prompt":"x"}' | node H:/prism/.claude/hooks/unit-knowledge-pack-inject.mjs
# Tests
node --test H:/prism/.claude/hooks/unit-knowledge-pack-inject.test.mjs
```
