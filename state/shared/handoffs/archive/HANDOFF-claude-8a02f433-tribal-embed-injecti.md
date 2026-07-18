---
session: claude-8a02f433
topic: tribal-embed-injection
slot: papa
written_at: 2026-06-25T13:47:16.138Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-8a02f433
status: active
---

# HANDOFF: claude-8a02f433
Updated: 2026-06-25T13:47:16.139Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-8a02f433

## STATE
## papa /goal /loop 2026-06-25 (session 8a02f433) — resources->tribal INJECTION lane re-armed

### Shipped (c4f1c9dc21, 3-of-3 PASS)
- Root cause: PRISM Tribal Embed cron DEAD — capped trigger (Duration PT13H) expired -> NextRunTime empty -> stopped firing while drains kept producing -> unbounded un-injected backlog.
- Measured: 2,751 un-embedded tips injected (37,720 seen, 34,969 hash-skip, 0 failed). Tribal index 108,982 -> 111,733 (+2,751).
- Fix: scripts/install-tribal-embed-cron.ps1 (clone of drain installer) — forever trigger. VALIDATED: NextRunTime populated, RunNow result=0, duration=forever.

### Pipeline: drain 243/4338 PDFs (4095 remaining); index 111,733 entries / 4 shards ~1.72GB / nomic-embed 768d. Ollama UP (gpt-oss:120b, qwen2.5-coder:32b, vision qwen3-vl:32b, nomic-embed).
### Memory: reference_tribal_embed_cron_rearm_2026_06_25

## RESUME
Injection lane FIXED. Next bounded unit (each-pass-feeds-next): (1) drain THROUGHPUT — only 243/4338 resources PDFs drained; 2 drain crons contend the same run-lock (one skips) — dedup/stagger + crank Blackwell concurrency. (2) FOLLOW-UP fix: embedder re-exec masks signal-kill in LastTaskResult (embed-pdf-tribal-tips-into-index.mjs process.exit(r.status??0)->0 on signal; same in drain task) — fix r.signal?1:(r.status??0) fleet-wide. (3) vision-OCR lane: drain marks scanned/image PDFs 'done' (empty text layer); qwen3-vl:32b/qwen2.5vl:32b resident could drain those + image-heavy catalogs.

## CONTEXT

