---
name: reference_tribal_embed_cron_rearm_2026_06_25
description: PRISM Tribal Embed cron was DEAD (PT13H-capped trigger expired) while drains kept producing -> 2751 un-injected tribal tips; re-armed with a forever trigger + injected the backlog. 2026-06-25 slot:papa.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.227Z
aliases: reference_tribal_embed_cron_rearm_2026_06_25
---


**Resources->tribal INJECTION lane was silently dead (producer-alive / consumer-dead).** Continuing zulu's `PDF-TRIBAL-HERMES/U-TRIBAL-OVERNIGHT-DRAIN` (the drain pipes zulu hardened 2026-06-24). Operator /goal: max tribal-knowledge injection into PRISM AI systems. Commit `c4f1c9dc21`, 3-of-3 PASS.

## Root cause (durable, verified live)
The `drain-resources-tribal.mjs` overnight drain runs with `--no-embed` ("cron embeds") and only GENERATES tips into `tips.jsonl`; a SEPARATE scheduled task `PRISM Tribal Embed` is the only consumer that embeds them into the L1 `tribal-embed-index` (fleet RAG/CAG/tribal injection store = PSN leg #5). That embed task had been registered ad-hoc with a CAPPED trigger: `RepetitionInterval PT30M, Duration PT13H`. Once the 13h window elapsed, its **NextRunTime went EMPTY and it stopped firing** while the two drain crons (`PRISM Resources Tribal Drain` next=fine, `PRISM Tribal Resources Drain` next=fine — both recur forever, no Duration) kept producing. Result: an unbounded un-injected backlog. The drains recur forever; the injector must too.

## Measured (numbers, R12)
- Drain corpus: 4338 resources PDFs, 243 attempted, 147 drained, 4095 remaining (slow steady cron progress).
- `tips.jsonl` 4570 + `catalog-cutting-tips.jsonl` 1592; embedder sees 37,720 source tips across pdf+video+resources.
- **True un-injected backlog (live embed `embedded=N skipped=M`): 2,751 un-embedded, 34,969 already in (hash-skip), 0 failed.**
- **Tribal index 108,982 -> 111,733 entries (+2,751)** after a manual lock-safe catch-up (`embed-pdf-tribal-tips-into-index.mjs`, conc=12 Blackwell, nomic-embed 768-d). Index is sharded (4 shards ~1.72GB), healthy post the 2026-06-08 clobber/V8-cap fixes.

## Fix
`scripts/install-tribal-embed-cron.ps1` (NEW) — clone-don't-fork of the proven `install-resources-tribal-drain-task.ps1`: `New-ScheduledTaskTrigger -Once -RepetitionInterval 30min` with NO Duration (= forever), user-level Interactive/Limited principal, real node.exe, `MultipleInstances IgnoreNew` (the embedder's `withTribalIndexLock` + `writeTribalIndexGuarded` clobber-guard make overlapping fires safe — loser exits `EXIT_TRIBAL_INDEX_LOCK_SKIP=4`, index untouched). VALIDATED live: re-registered, `NextRunTime` now populated (was empty), RunNow `result=0`, trigger `duration=(none=forever)`.

## Lessons (generalizable)
- **A recurring scheduled task with a `Duration` cap silently DIES when the window elapses** (NextRunTime -> empty). For a perpetual producer/consumer pair, BOTH must recur forever (no Duration). A capped consumer behind an uncapped producer is the producer-alive/consumer-dead backlog class. Verify a cron's `NextRunTime` (not just `State=Ready`/`LastTaskResult=0`) to know it will actually fire again.
- **The live embed is both the measurement AND the fix**: hash-skip makes already-embedded tips ~free (no Ollama call), so a real run reports the true net-new backlog (`embedded=N`) while injecting it. Dry-run only counts TOTAL source tips (returns before the hash-skip), so it does NOT measure the gap.
- Timezone trap: loop-state timestamps are UTC (`Z`); local is CDT (UTC-5). A "5h-old" lock read as fresh was actually 3 min old — don't conclude "stale stall" from a UTC/local mismatch.

## Follow-ups (NOT done this commit — out of scope / hot peer files)
- **Embedder masks signal-kill in LastTaskResult** (arm C): `embed-pdf-tribal-tips-into-index.mjs` re-exec wrapper does `process.exit(r.status ?? 0)` — a scheduler `taskkill` (status==null on signal) -> parent exits 0, so a killed run looks successful. Monitoring blind spot, fleet-wide (same in the drain task). Fix: `r.signal ? 1 : (r.status ?? 0)`.
- Commit-message imprecision (R12): I wrote "the drain crons ... with --no-embed" — only `PRISM Tribal Resources Drain` passes `--no-embed`; `PRISM Resources Tribal Drain` embeds INLINE (drain-resources-tribal.mjs:212). Both are lock-safe; the dead dedicated `PRISM Tribal Embed` was still the binding gap. Core finding unaffected.
- Drain throughput: only 243/4338 PDFs drained. **DEDUP DONE 2026-06-25:** there were TWO drain crons running the same `drain-resources-tribal.mjs` every 20min contending the same run-lock — canonical `PRISM Resources Tribal Drain` (`--max-pdfs 4 --max-chunks-per-doc 30`, india installer 06-24 13:10) and a stale predecessor `PRISM Tribal Resources Drain` (`--max-pdfs 3 --no-embed`, NO chunk-cap, empty workdir, 06-24 09:25; it was PID 32764 holding the lock at 07:45 — the WORSE config was sometimes winning). DISABLED the stale one (reversible: `Enable-ScheduledTask -TaskName 'PRISM Tribal Resources Drain'`); canonical is now sole drainer with the stall-preventing chunk-cap. Remaining throughput lever = crank `--max-pdfs`/concurrency for Blackwell.
- **Throughput DIAGNOSED (2026-06-25, evidence):** the binding constraint is **`OLLAMA_NUM_PARALLEL=4`** (hard concurrency ceiling) + the gen model **`qwen2.5-coder:32b`** (~minutes/PDF). The drain's `--concurrency` default 4 already matches the Ollama ceiling, so raising it alone is inert. ~4,092 PDFs remaining at ~4/20min ≈ 14 days. The two durable levers are COORDINATION-GATED (not unilateral): (1) **OLLAMA_NUM_PARALLEL 4→6-8** — Blackwell has headroom, but takes effect only on an Ollama RESTART that interrupts all 26 chats' offload + running crons, and risks VRAM pressure if gpt-oss:120b (~65GB) is co-resident → OPERATOR decision. (2) **gen model 32b→qwen3-coder:30b (MoE, faster)** — a QUALITY trade-off on LoRA/RAG-feeding data → INDIA-coordinated + quality-gated. Neither is a clean reversible/internal flip.

Verify: `git -C H:/prism show c4f1c9dc21`. Sibling pipeline memory: [[reference_zulu_hermes_ollama_hardening_2026_06_24]].
