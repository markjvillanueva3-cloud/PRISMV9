---
name: reference_tribal_embed_gap_2026_05_18
description: "U-TRIBAL-EMBED-GAP — final-3 tribal wikis were never embedded into the auto-injection index (foxtrot, BACKEND-DEV-LOOP)"
aliases: reference_tribal_embed_gap_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.977Z
---


2026-05-18 slot foxtrot (claude-3c737257) — commit `709dec3985`. Continuation
of earlier-today lima BACKEND-DEV-LOOP wiki/tribal work the user asked to
"continue" (auto wiki+tribal injection through Obsidian/Ollama).

**The gap (R12):** the loop pattern is write tribal wiki → embed into
`state/shared/tribal-embed-index.json` → commit both. iter3 (`d9f1b7960f`)
followed it; the "final 3 wikis … exhaustion 20/20" commit `d716d20a96`
shipped lora-fine-tuning-patterns / reinforcement-learning-patterns /
mcp-tool-design as `.md` ONLY — skipped the embed. `tribal-by-domain-inject`
→ `tribal-rerank` can only surface entries IN that index, so all 3 were dark
to auto-injection. The loop declared exhaustion without completing its own
documented retag/embed step.

**Diagnosis discipline:** verified the consumer contract before fixing —
`tribal-rerank.mjs` ranks purely on `e.embedding` cosine, reads
`.text/.domain/.source/.title`, **never `.hash`** → `sha256(text)[:16]` is a
clean defensible hash, not a reverse-engineering guess. Confirmed iter3 wikis
(commit touched index) are IN; final3 (commit didn't) ABSENT — that delta IS
the gap, not a cron lag.

**Shipped:** `scripts/embed-wiki-into-tribal-index.mjs` — reusable idempotent
appender (the loop's missing step made explicit). Canonical iter3 shape
(`source:"external"`, `id:"external:"+winabs`, 400-char text, 768-d
nomic-embed-text:latest via the SAME endpoint/model as the query side).
All-or-nothing fail-loud, `--domain` VALID_DOMAINS guard, pure
`spliceEntries`/`embedText`/etc. 17-case node:test. Verified end-to-end:
`tribal-rerank --domain backend-dev` now ranks all 3 #1/#1/#2.

**Lessons:**
1. A commit subject claiming "exhaustion 20/20" is not proof the side-effect
   (index retag) happened — diff the artifact, not the message. Same class as
   the [[reference_silent_close_out_drift_2026_05_17|silent-close-out-drift]] family.
2. Cosine retrieval parity = MODEL parity, not text length — embed the full
   body, store the 400-char head; both correct.
3. When a sibling tool (`retag-tribal-backend-dev.mjs`) docstring explicitly
   says it does NOT do X, X is an unfilled half — build the appender, don't
   assume a cron covers it. Verify-empirically (the iter3-IN vs final3-ABSENT
   probe) before claiming or denying a gap.
4. Per-file gate caught a P0 test false-green (proved file planned, not that
   the domain was valid) — the exit-3-not-2 discriminator is the load-bearing
   proof. Pure-core extraction (`spliceEntries`) turned untested main() logic
   into directly-testable units.

Wiki: [[u-tribal-embed-gap]]. Sibling: [[reference_backend_dev_tribal_wiring_2026_05_18]].
