# OLLAMA-OFFLOAD/U-VERIFIED-OFFLOAD-LIB — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-LIB (slot:alpha): the keystone -- verified ollama auto-offload wrapper (100% via code-verification)

**Commit:** `619a84197bfb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T21:42:11-05:00
**Tags:** ollama-offload, u-verified-offload-lib, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-LIB (slot:alpha): the keystone -- verified ollama auto-offload wrapper (100% via code-verification)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-LIB (slot:alpha): the keystone -- verified ollama auto-offload wrapper (100% via code-verification)

Operator: wire ollama into /loop+/goal for auto high-value tool calls at 100%
accuracy + broader free-token offloads. THE keystone that makes auto-offload
safe: verifiedOffload({run, verify, fallback}) accepts an Ollama result ONLY when
a PURE code verifier passes, else falls back to the trusted path. The model
proposes; code disposes. 100% NET accuracy comes from the verifier, NOT model
trust. Distinct from the ~20 existing advisory ollama hooks (this is verified
auto-EXECUTION; R8-dedup in the spec).

Design:  is INJECTED (consumer passes its caller e.g. callOllamaOnce from
ollama-fanout.mjs) -> zero ollama dependency in the lib -> hermetic tests.
Fail-safe on EVERY path: run-throw / run-empty / verify-fail / verify-throw ->
fallback; a fallback throw PROPAGATES (real path failing is a genuine error, not
swallowed); fallback REQUIRED (misuse guard -- no safe auto-offload without one);
telemetry throw never breaks the offload.

3 ready-made verifiers (the common 100%-accurate cases): enumMember (snaps to a
canonical member, rejects hallucinated values -> e.g. /loop next-unit pick from a
fixed unit set), jsonShape (parse + predicate, returns validated object -> e.g.
/goal decomposition draft), nonEmptyText (weakest, advisory-only narration).

15/15 hermetic tests (R9): happy + verify{ok,value} + every failure-mode fallback
+ fallback-propagates + misuse guards + telemetry-safe + all 3 verifiers +
end-to-end enumMember-rejects-hallucination. Spec:
state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md. NEXT: wire /loop iteration-eval-
narration (test-exit-code verifier) as the reference consumer; coordinate model
routing w/ bravo.
```

## Files touched (3)
- scripts/lib/ollama-verified-offload.mjs      | 118 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-verified-offload.test.mjs | 128 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 246 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 619a84197bfb`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._