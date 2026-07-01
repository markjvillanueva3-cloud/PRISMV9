---
session: claude-c7361c9f
topic: foxtrot-cad-fusion-l
slot: golf
written_at: 2026-06-10T13:52:34.727Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-c7361c9f
status: active
---

# HANDOFF: claude-c7361c9f
Updated: 2026-06-10T13:52:34.727Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-c7361c9f

## STATE
Shipped U-VERIFIED-OFFLOAD-NAV: verified ollama re-rank of /system-viz find candidates (node-card-resolvability verifier drops hallucinated/dead ids, trusted-order fallback). 29/29 hermetic tests + live proof + 3-of-3 PASS (session db273e77). 6th verified-offload consumer. Commits 127234e940 (code) + 6980943ba8 (doc). Loop iter was 4/8 ended; goal-clear-advance hook owns the ended-loop seam.

## RESUME
WIRE nav-rerank to auto-fire (verified-offload queue item #1 now). Build a hook that surfaces/runs scripts/ollama-nav-rerank.mjs after a /system-viz find (or on nav-intent) so the verified re-rank is the default search path -- the file-digest -> large-read-hook cadence applied to SEARCH. 6 verified-offload consumers shipped on keystone scripts/lib/ollama-verified-offload.mjs: commit-msg, file-digest, loop-narrate, large-read hook (WIRED), loop-state narrate (WIRED), nav-rerank CLI (127234e940, 3-of-3 PASS, 29 tests + live gpt-oss:20b proof source=ollama). Build on verifiedOffload (model proposes, code verifies via seekCard resolvability, fail-safe fallback); hermetic injected tests + live proof; 3-of-3 + scrutinize --target HEAD after commit; scoped [MAIN]. DEDUP: ollama-nav-enforce-inject.mjs (suggests bridge) + ollama-prism-bridge.mjs (open-ended) already exist -- the wiring is a NEW autofire surface for the verified re-rank, not a dup. STILL OPEN (operator decision): force-track .claude/commands/yolo-mode.md in git (live on disk, gitignored) -- do NOT git add -f without their answer.

## CONTEXT

