# OLLAMA-OFFLOAD/U-VERIFIED-OFFLOAD-CONSUMER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-CONSUMER (slot:alpha): first live consumer of the verified-offload keystone

**Commit:** `90bc18176754` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:48:16-05:00
**Tags:** ollama-offload, u-verified-offload-consumer, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-CONSUMER (slot:alpha): first live consumer of the verified-offload keystone

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-CONSUMER (slot:alpha): first live consumer of the verified-offload keystone

The R15-step-3 live proof of verifiedOffload (its 15 tests are hermetic/injected;
this exercises it against REAL Ollama via callOllamaOnce). scripts/ollama-offload.mjs
= a reusable, fleet-callable offload primitive (free Claude tokens, local compute):
  offloadClassify(text, allowed) -- pick ONE of a fixed enum; 100% safe because
    enumMember rejects any hallucinated label -> fallback {value:null}.
  offloadDigest(text) -- summarize for a digest; verified non-empty, fallback =
    truncated raw text so the caller ALWAYS gets a usable string.
CLI: node scripts/ollama-offload.mjs classify "<text>" <opt...> | digest <@file>.
Knob PRISM_OLLAMA_OFFLOAD_MODEL (default gpt-oss:20b).

LIVE-VALIDATED: classify('facing a 6061 block on a 3-axis VMC', mill|lathe|wedm|cad)
-> value=mill source=ollama verified=true; digest -> source=ollama verified. 8/8
hermetic tests (injected runImpl, no network): in-enum accept, near-match snap,
hallucination->fallback-null, empty->fallback, custom-fallback, misuse-guard,
digest-accept, digest-fallback-to-raw. Keystone proven on live hardware; serves the
'max ollama utilization' goal. Next consumer: /loop iteration-eval-narration.
```

## Files touched (3)
- scripts/ollama-offload.mjs      | 99 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-offload.test.mjs | 59 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 158 insertions(+)

## Lessons surfaced in commit body
- tilization' goal. Next consumer: /loop iteration-eval-narration.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 90bc18176754`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._