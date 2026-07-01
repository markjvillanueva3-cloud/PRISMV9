# U-HMT-V31-EXTRACT — Extraction Blocker Report

**Date:** 2026-05-21 (slot:foxtrot, claude-a264d369, /loop iter 8)
**Unit:** HM-TRAINING-WIRING-PLAN-2026-05-20 / U-HMT-V31-EXTRACT
**Status:** **BLOCKED** — Ollama extraction backend unusable. R12 fail-loud:
this unit is NOT complete. No v31/v33 tips were extracted.

## Goal (unchanged)

Extract the 8 unprocessed v31.0 / v33.0 PDFs surfaced by
`scripts/hm-extraction-coverage.mjs --json`:

| PDF | pages | unit-target doc-id |
|-----|-------|--------------------|
| doc/31.0/PDF/hyperCAD-S/hyperCAD-S_Manual-en.pdf | 600 | doc-hypercad-manual-en-vol31 |
| doc/31.0/PDF/VIRTUAL Machining Center/..._Manual-en.pdf | 55 | doc-virtual-machining-center-en-vol31 |
| doc/33.0/PDF/VIRTUAL Machining Center/..._Manual-en-US.pdf | 51 | doc-virtual-machining-center-en-vol33 |
| doc/33.0/Readme/hyperMILL_Readme-en-US.pdf | 102 | doc-hypermill-readme-en-vol33 |
| hyperCAD-S/31.0/BatchConverter/Readme_HMC_Batch_Converter-{en,de}.pdf | 14/16 | doc-hypercad-batchconverter-readme-{en,de}-vol31 |
| hyperCAD-S/33.0/BatchConverter/Readme_HMC_Batch_Converter-{en,de}.pdf | 14/16 | doc-hypercad-batchconverter-readme-{en,de}-vol33 |

Extractor + TARGETS list: `cad-engine/scripts/targeted_extract_hm_training.py`.

## Root cause — two Ollama model stores

The extraction backend (`cad-engine/src/document_extract.py`) calls
`http://localhost:11434`. That server and the `ollama.exe` CLI read
**different model directories**:

| Surface | Model store | qwen2.5-coder models present |
|---------|-------------|------------------------------|
| `ollama.exe` CLI (`OLLAMA_MODELS=H:/Tools/ollama/models`) | H:/Tools/ollama/models | **7b**, 14b, 32b |
| Server on `:11434` (`/api/tags`) | (a different dir) | **3b** only |

`document_extract.py` defaults to `qwen2.5-coder:14b`; the batch script's
documented override is `qwen2.5-coder:7b`. **Neither 7b nor 14b is on the
`:11434` server.** Only `qwen2.5-coder:3b` is.

## Run history (2026-05-21)

Full log: `state/shared/specs/U-HMT-V31-EXTRACT-run-2026-05-21.log`.

### Run 1 — `PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:7b`
- Pulled `qwen2.5-coder:7b` via the **CLI** → landed in `H:/Tools/ollama/models` (an 11-second "pull" = cache hit; the model was already there).
- The `:11434` server still could not see it. `POST /api/generate {"model":"qwen2.5-coder:7b"}` → `{"error":"model 'qwen2.5-coder:7b' not found"}`.
- Result: **88/88 chunk errors** on the 622-page CAD manual, identical on all 9 targets, `cumulative_tips=0`, total wall-time **1.2 min** (instant per-chunk failure — never reached the model).
- **The U-HMT-EXTRACTOR-FAILLOUD guard (shipped iter 6, commit `df1dc9bb6b`) fired correctly on every PDF** — raised `SilentExtractionError` rather than silently writing 9 empty `tips:[]` artifacts. First real-world exposure of the guard; it did exactly its job.

### Run 2 — `PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:3b`
- 3b IS on the `:11434` server, so this should have worked.
- Job died with **exit 255 and ZERO output** — not even the `main()`
  banner printed.

### Run 3 — API-pull 7b into the server store + extract, with checkpoints
- Added explicit `;`-sequenced checkpoints (`--- pull curl exit ---`,
  `--- python START ---`, `--- python exit ---`) so a death would be
  located.
- Result: the `=== RUN3 ... ===` header wrote, then **NOTHING** — not
  even the first `;`-sequenced checkpoint after the `curl ... /api/pull`.
  Exit 255.

### ROOT CAUSE (diagnosed) — long-running background jobs are being reaped

Three runs, one pattern:

| Run | Work | Wall-time | Outcome |
|-----|------|-----------|---------|
| 1 | 7b, model-not-found → every chunk insta-fails | **1.2 min** | **survived** (exit 0, full output) |
| 2 | 3b, real inference (slow) | killed | exit 255, zero output |
| 3 | 7b API pull (4.7 GB, minutes) + extract | killed | exit 255, zero output |

The ONLY run that completed is the one that finished in **1.2 minutes**.
Both runs that would take >~10 min were killed mid-execution — a `;`
checkpoint placed to ALWAYS run never ran, which only happens if the
process is terminated, not if a command merely fails.

The killer is almost certainly the **fleet-reaper** (CLAUDE.md
§FLEET-REAPER — "reaps orphans gated by confirm-after-N-ticks, 2×300s
default" = ~10 min). A chat-spawned `curl`/`python` whose PID→slot
ancestry doesn't resolve back to the live chat is classified an orphan
and reaped at the ~10-min mark. Run 3's 4.7 GB pull cannot finish inside
that window, so it is killed every time.

**This means U-HMT-V31-EXTRACT cannot be completed by a chat-spawned
background job at all** — independent of the model-store split. The
extraction of the 600-page + 102-page manuals is inherently a >10-min
job.

### Diagnostic state at report time
- Ollama server: **UP** (`/api/version` → `{"version":"0.24.0"}`, 3 `ollama*.exe` processes live).
- The model-store split is real and still must be fixed (see below), but
  it is now the SECOND blocker — the reaper-kill is the first.

## What to do to unblock (operator / next session)

**Both blockers must be cleared. This is operator / durable-task work —
NOT a chat-spawned background job (it will be reaped).**

### Blocker 1 — reaper kill (do this FIRST)

Run the extraction in a context the fleet-reaper will not reap:

- **Operator foreground terminal** — paste the command into a real
  PowerShell window and leave it. The reaper does not reap
  operator-owned interactive processes.
- **OR a durable scheduled task** — register a one-shot `PRISM HM V31
  Extract` task (mirrors the `PRISM Fleet Reaper` task pattern in
  `.claude/helpers/install-fleet-reaper-task.ps1`). A scheduled task
  runs under its own principal, independent of any chat.

### Blocker 2 — model-store split

The `:11434` server's store lacks `qwen2.5-coder:7b`. Pick ONE:

a. **Pull 7b into the server store via its own API** (preferred — keeps
   the corpus on the 7b baseline). This is a ~4.7 GB download — it MUST
   run in the reaper-safe context from Blocker 1:
   ```bash
   curl -X POST http://localhost:11434/api/pull -d '{"name":"qwen2.5-coder:7b"}'
   ```

b. **Reconcile the stores** — restart the `:11434` server with
   `OLLAMA_MODELS=H:/Tools/ollama/models` so it sees the 7b/14b/32b set
   already on disk (no re-download). Heavier — a shared-server restart
   affects every chat using Ollama.

### Then run the extraction (reaper-safe context)

```bash
cd H:/prism/cad-engine
PRISM_DOCEXTRACT_BACKEND=ollama PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:7b \
  .venv/Scripts/python.exe scripts/targeted_extract_hm_training.py
```

### Optional — single-PDF diagnostic (fast, reaper-safe)

To see raw `chunk_errors` without the R12 raise:
```bash
cd H:/prism/cad-engine
PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:7b .venv/Scripts/python.exe -c \
  "from src.document_extract import extract_from_document as e; \
   print(e('H:/prism/Resources/OPEN MIND/hyperCAD-S/31.0/BatchConverter/Readme_HMC_Batch_Converter-en.pdf', \
           title='t', document_id='diag', expected_zero_tips=True).knowledge['extraction_stats'])"
```
(`expected_zero_tips=True` suppresses the R12 raise so the stats —
including `chunk_errors` — are returned instead of thrown.)

## Idempotency note

`targeted_extract_hm_training.py` is idempotent — it skips any doc-id
whose extraction-log entry already has `tipsGenerated > 0`. Re-running it
after the backend is fixed only re-attempts the still-empty targets, so
there is no partial-work hazard. (The 33.0 CAD_Manual entry was also
flipped `force_reextract` True→False this session — it is already at 309
tips from U-HMT-HYPERCAD-REEXTRACT and must not be re-forced.)

## Honest scope statement (R12)

- U-HMT-HMACOLOR-EXTRACT: **COMPLETE** — `batch_extract_hmautocolor.py
  --dry-run` reports 19 discovered / 19 done / **0 pending**. (Tip yield
  came in below the plan's optimistic "600-1200" estimate — the
  hmAutoColor docs are genuinely tip-poor procedural notes, the same
  recognized low-yield class as `doc-fusion-cad.json`; the extraction
  *work* is done.)
- U-HMT-V31-EXTRACT: **BLOCKED** on the Ollama backend above. Zero v31/v33
  tips extracted. Not complete, not faked complete.
