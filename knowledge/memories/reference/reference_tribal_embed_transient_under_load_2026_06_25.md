---
name: reference_tribal_embed_transient_under_load_2026_06_25
description: "CORRECTS the earlier 'Tribal Embed stale = hung/V8-cap/supervised-risk' framing: the index is now SHARDED + the embed uses the cap-safe loader, so the lastResult=1 failure is a TRANSIENT failure under host resource pressure (same load as the MCP-Server spawn-refused + exit-255 kills) -- NO code fix, NO re-register, self-recovers on the next lower-load run."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.227Z
aliases: reference_tribal_embed_transient_under_load_2026_06_25
---


**Read-only diagnosis (slot:papa, 2026-06-25). Corrects [[reference_stale_tasks_overdue_not_broken_2026_06_25]].**

The recurring Stop-hook WARN "PRISM Tribal Embed=stale" with `lastTaskResult=1` (the scheduled tribal-index embedder, PSN leg #5) is NOT the V8 512-MiB string-cap / corruption risk that earlier framings (and [[reference_tribal_index_v8_string_cap_2026_06_08]]) flagged as supervised-only. Verified read-only this session:

- The index is **SHARDED**: `state/shared/tribal-embed-index.manifest.json` (551 B pointer) + `tribal-embed-index.shard-000/001/002.json`. The monolith-over-512-MiB wall is gone.
- The embed script `.claude/scripts/tribal-embed-index.mjs` **uses the cap-safe sharded loader** (`scripts/lib/load-tribal-index.mjs` / `loadTribalIndex`) -- grep-confirmed. So a >512-MiB read can no longer throw.

**So the `lastResult=1` is most likely a TRANSIENT failure under host resource pressure** -- the same load that produced `PRISM MCP Server: LastTaskResult=0x800710E0 (spawn-refused-under-load)` and the exit-255 bash-wrapper kills this session. The embed makes Ollama `nomic-embed-text` 768-d calls + child spawns that fail under load -> exit 1. `state=Ready` (not Running/hung), so the body completes; it just errored on that run.

**Correct operator action: NONE / let it self-recover.**
- NOT a re-register (state=Ready, lastTaskResult is a body error not a launch HRESULT; the install scripts would just rewrite a correct registration).
- NOT a manual embed run (still avoid that -- the corruption-history caution stands for *running* it, even though the read path is now cap-safe).
- The next scheduled run under lower fleet load should succeed. ONLY if it persists across several runs is there a real defect to chase (then check Ollama health + disk during the embed window).

**Lesson:** re-verify the index LAYOUT before attributing a tribal-embed failure to the V8 string-cap -- once an index has sharded + the loader is cap-safe, that failure class is closed, and a generic `lastResult=1` under a loaded host is almost certainly transient (sibling of "stale is an AGE signal, not a health signal"). Diagnose the failure read-only (size + loader) before recommending any supervised/corruption-risk action. -> [[reference_stale_tasks_overdue_not_broken_2026_06_25]] · [[ollama-burst-wedge-and-stale-vs-hung-task-signals]]
