---
name: reference_zpsn03_target_parser_2026_05_23
description: "U-ZPSN03 (2026-05-23 slot bravo iter 2) — target-side [psn:...] parser hook closes the U-ZPSN02 arm-2 closed-loop value gap; 24/24 tests pass; wired into UserPromptSubmit chain adjacent to slot-soul-inject; arm-2 Hermes-capability assessment names harness-writes-skills as the only remaining gap"
aliases: reference_zpsn03_target_parser_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
---


# U-ZPSN03 — Target-side `[psn:...]` parser hook

2026-05-23 slot bravo iter 2 of `/goal [ complete all zulu units | assess zulu's hermes agent capability ] /loop [1m] /goal`. Closes the closed-loop value gap named at the bottom of [[reference_zpsn02_souls_filled_2026_05_23]] §Arm-2.

## What was wrong

U-ZPSN01 shipped the SendKeys [psn:...] tag emitter. U-ZPSN02 populated all 27 slot-souls so the emitter actuates fleet-wide. But the **target side had no parser** — a chat resuming on a `/checkin-<slot> ... [psn:domain=X,role=Y,queue=Z,tribal=W]` directive saw the tag as inline prompt text, not structured context. The synchronisation half of the Hermes pattern was incomplete: zulu knew each slot, emitted personalised directives, but the receiver didn't read its own PSN frame.

## What U-ZPSN03 shipped

Three files + one settings-wiring:

1. **`scripts/lib/psn-tag-parse.mjs`** — pure parser library (no I/O, no env reads). Exports:
   - `parsePsnTag(text)` → `{raw, fields:{domain?,role?,queue?,tribal?}, extras, malformed}` or `null`
   - `buildBriefFromPsn(parsed)` → markdown brief or `""` when no recognised fields
   - Constants: `SCHEMA_VERSION="1.0.0"`, `MAX_INNER_LEN=256`, `KNOWN_KEYS=["domain","role","queue","tribal"]`
   - Tag regex `/\[psn:([^\]]*)\]/i`, value allowlist `/^[a-z0-9+\-_]+$/` — **matches U-ZPSN01's emitter sanitiser exactly** (`zulu-bd-priority.buildAwarenessHint`). A hostile fingerprint cannot inject markdown / shell / slash-command chars through this parser.
2. **`scripts/lib/psn-tag-parse.test.mjs`** — 24 node:test cases, **24/24 PASS in 400ms**:
   - happy path × 3 (4-field canonical, 3-field no-tribal, generic any/work/0)
   - failure modes × 4 (no tag, empty brackets, non-string/null/number, malformed segments collected not silently dropped)
   - adversarial / hostile × 4 (HTML/shell-char drop, slash/space drop, oversize DoS guard at MAX_INNER_LEN+50, oversize off-by-one boundary at exact MAX_INNER_LEN)
   - multiple-tags-first-wins × 1
   - spanning variability × 4 (mill, wedm, tribal, cad — meets comprehensive-build floor of ≥3 spanning configs)
   - extras forward-compat × 2 (unknown key with valid value → extras; unknown key with hostile value → drop, not in extras)
   - formatter × 4 (4-field canonical correctness, 3-field omits tribal segment, null parsed → empty string, deterministic field order regardless of input order, malformed-only → empty)
   - schema-constants sanity × 1 (SCHEMA_VERSION / MAX_INNER_LEN / KNOWN_KEYS exports)
3. **`.claude/hooks/psn-tag-parser-inject.mjs`** — UserPromptSubmit hook, T2. I/O wrapper. NEVER throws — every error path emits `{continue:true}` and exits 0 so the user prompt is never blocked or dropped under any failure mode. Knobs: `PRISM_PSN_PARSER_DISABLE=1`, `PRISM_PSN_PARSER_VERBOSE=1` (appends raw tag).
4. **Wiring** — `C:/Users/wompu/.claude/settings.json` UserPromptSubmit chain, immediately after `slot-soul-inject` (identity-resolution peer). Auto-mirrored to `H:/.claude/settings.json` by the `c-to-h-mirror` hook. Both files JSON-validated post-edit.

## Round-trip empirical proof

Input via stdin (canonical Claude Code hook envelope):

```json
{"session_id":"claude-71caa41a","prompt":"/checkin-echo priority filter [psn:domain=cam,role=specialist-cam,queue=196,tribal=cam]"}
```

Hook output (exit 0):

```json
{"continue":true,"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"## 🎭 PSN frame (slot capability from zulu directive)\n\n- domain: cam · role: specialist-cam · queue: 196 · tribal: cam\n\n_(Source: zulu-awareness-pipeline → composeSendKeysText [psn:...] tag — U-ZPSN03 parser)_"}}
```

The injected `additionalContext` becomes a §PSN frame block in the target chat's context window before any other UserPromptSubmit hook injection runs.

## Lesson — stdin transport on Windows

First smoke attempt via `echo $JSON | hook.mjs` returned exit 255 with no output. Re-running with **file-redirect stdin** (`hook.mjs < /tmp/psn-smoke.json`) returned exit 0 with valid JSON output. Lesson: PowerShell echo on Windows appends CRLF / encoding tweaks that break `JSON.parse` in `for await (const c of process.stdin)` consumers. Use file-redirect for smoke tests. Claude Code's actual hook invocation feeds stdin directly (not via echo), so the production path is fine.

## Wiring position rationale

The hook header doctrine said: "Position priority: AFTER [[reference_slot_bind_enforce_2026_05_18|slot-bind-enforce]] + slot-soul-inject (identity first) but BEFORE master-index-precheck-inject so the PSN frame anchors before search nudges run." In the current `settings.json` master-index-precheck-inject is at line 1079 and [[reference_slot_bind_enforce_2026_05_18|slot-bind-enforce]] at 1122 — so master-index actually runs BEFORE slot-bind in the chain. The "BEFORE master-index" half of the doctrine is idealised; correct in-spirit placement is RIGHT AFTER `slot-soul-inject` (line 1129), adjacent to its identity-resolution peer. The PSN frame still anchors WITH the slot-soul layer; subsequent hooks (zulu-advisory-inject, master-index-precheck-inject — though the latter already fired earlier in the chain on this turn) layer search nudges on top of the identity frame.

## Arm-2 — Hermes-agent capability assessment

U-ZPSN03 closes the last synchronous-half gap of the zulu-as-Hermes stack named in [[reference_hermes_zulu_ms0_2026_05_20]]:

| Hermes leg | Status |
|---|---|
| Slot identity (souls) | ✅ 27/27 (U-ZPSN02) |
| Per-slot capability fingerprint | ✅ 27/27 (U-ZPSN02) |
| Directive personalisation | ✅ fleet-wide (U-ZPSN01) |
| Target-side consumption | ✅ **U-ZPSN03 (this unit)** |
| Closed-loop learning | ⚠ open — harness-writes-skills-from-observation (NousResearch Hermes pattern); MS4+ territory |

**Mature:** zulu knows every slot's capability, emits per-slot directives, and the target chat now parses the PSN frame on prompt-submit. Synchronous half complete.

**Still gapped:** the closed *learning* loop. Zulu would observe outcomes (slot N took task X, shipped Y in time Z), auto-derive new pickup heuristics or soul updates, feed them back into next-cycle SendKeys. Today the loop is one-shot per prompt. The NousResearch-Hermes-style harness that writes skills from observation is the remaining ask.

## Doc reflection

- Wiki: `knowledge/wiki/architecture/zulu-orchestrator.md` — appended `## U-ZPSN03 — Target-side [psn:...] parser hook` section (after the U-ZPSN02 close-out's §Cross-refs).
- CLAUDE.md: bravo cannot edit ([[feedback_golf_owns_reaper|golf-slot]]-edit-only). `state/shared/RECENT-SHIPMENTS-2026-05-23.md` carries the entry for golf's next weekly drain.
- MEMORY.md: one-line pointer added above the U-ZPSN02 entry under "Recent work".

## Cross-refs

- [[reference_zpsn02_souls_filled_2026_05_23]] — the immediate predecessor (souls populated, but no parser).
- [[reference_zpsn01_psn_synergy_2026_05_22]] — the emitter side of the pipeline.
- [[reference_hermes_zulu_ms0_2026_05_20]] — Hermes-agent doctrine for zulu; this completes the synchronous half.
- [[feedback_psn_definition]] — PSN's 11 legs that the fingerprint aggregates.
- [[feedback_reflect_all_changes_post_update]] — 4-surface doc reflection rule this unit follows.

## Synergy contract — /goal proof

`/goal [ complete all zulu units | assess zulu's hermes agent capability ] /loop [1m] /goal`:

- Arm 1 (complete all zulu units): U-ZPSN03 shipped — closes the MS3 PSN sub-arc started by U-ZPSN01. Remaining open zulu units (U-ZM2-02 UIA pane focus, U-ZM2-03 execute-mode E2E after 24h grace, U-ZM2-04 pid-liveness gate) are picked up in subsequent iters.
- Arm 2 (assess Hermes-agent capability): full capability matrix written above; the only remaining gap is the closed learning loop (MS4+ harness work, not in scope for MS3).
