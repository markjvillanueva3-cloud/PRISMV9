---
name: reference_galaxy_context_federation_xdedup_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XDEDUP (shipped 2026-05-31, slot alpha) — Phase D cross-galaxy memory dedup: near-dup domain facts across ≥2 galaxy brains → ONE canonical + [[pointers]] (advisory, never edits MEMORY.md). Jaccard 0.65, scans full MEMORY.md by default."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.126Z
aliases: reference_galaxy_context_federation_xdedup_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XDEDUP** (shipped 2026-05-31, slot alpha) — 10th federation unit.
Sisters: [[reference_galaxy_context_federation_recall_first_2026_05_31]], [[reference_galaxy_context_federation_push_2026_05_31]].

**What it is:** cross-galaxy memory dedup — the same fact distilled into N galaxy brains wastes recall+inject
tokens. Detects near-duplicate DOMAIN facts across ≥2 galaxy brains (Jaccard token-set overlap), picks ONE
canonical (highest-INDEX-salience galaxy), recommends the rest replace their copy with `[[pointer]]`. ADVISORY —
emits DEDUP-REPORT.json, NEVER edits a peer MEMORY.md.

**Shipped:** `scripts/lib/galaxy-xdedup.mjs` (pure+injected+fail-soft; reuses tokenize/DEFAULT_ROOTS/
loadCardsFromIndex; 16 node:test), `scripts/galaxy-xdedup.mjs` (CLI build|show, --cards). Sidecar:
`state/shared/galaxy-cards/DEDUP-REPORT.json`. Live: 562 facts → 6 genuine clusters, ~37 tok.

**How to apply / lessons:**
1. **Scope to where the dup ACTUALLY lives (R13 comprehensive vs the spec's intent).** First cut scanned only
   the ≤1KB CARDS → found 2 weak clusters / 4 tokens (cards are well-distilled, almost no dup). The spec says
   "the same fact stored in N galaxy MEMORIES" — the FULL MEMORY.md brains. Extended the default source to scan
   `engines/<g>/MEMORY.md` → 6 GENUINE clusters (e.g. "Parent doctrine: DOMAIN-GALAXY-DOCTRINE" copied across 6
   galaxy brains — template-derived structural lines). Don't ship the narrow under-delivering version; build what
   the spec means. (The card scan stayed as a `--cards` option for the inject-token view.)
2. **Single-link clustering chains — a reviewer caught a live boundary paraphrase (arm-B P2).** Greedy single-link
   (a fact joins the first cluster whose REPRESENTATIVE it's ≥threshold to) can ride a PARAPHRASE into a cluster
   if it lands exactly on the threshold. Live: "Picks up ... envelope unit" jaccard 0.600 with "Soul assignment" —
   different statements. Fix: bump DEFAULT_JACCARD 0.60→0.65 (paraphrases drop; genuine template copies cluster
   at ~1.0) + a report `note` that members are NEAR-dup, VERIFY before collapsing. For an advisory tool the
   threshold-bump + honesty-note is sufficient (complete-link clustering would be the heavier robust fix).
3. **R12 honesty — modest is fine, state it.** 6 clusters / ~37 tok is a small, honest result: the galaxy brains
   share template lines, not large content dup. Framed as "estimated" / "modest" everywhere; the report `note`
   warns members are near-dup not identical. (5th federation unit a reviewer checked for overclaim — bake the
   qualification in from the first draft.)
4. **Boilerplate exclusion via section-skip + a state machine.** memoryFactLines skips the whole "## Master-brain
   link" section (inMasterBrain toggle on each header) + code fences (inFence toggle) + the link/continuation
   regexes, so only genuine domain facts cluster. The regexes are byte-identical to galaxy-rollup's (documented
   intentional re-derivation; arm-B flagged drift risk — a cross-file lock test or shared export is the future fix).
5. **`parseFloat(env)||DEFAULT` treats 0 as falsy** (same trap as recall-first MIN_BYTES) — fixed with
   `Number.isFinite(p)`. 6. Single-writer-per-file (7th unit): own DEDUP-REPORT.json, never INDEX/MEMORY.md.

Knobs: `PRISM_GCF_XDEDUP_DISABLE=1`, `PRISM_GCF_XDEDUP_JACCARD=F` (0.65). Wiki: [[galaxy-context-federation]].
PSN [[feedback_psn_definition]]. Federation: 10/12 (only U-GCF-SAVINGS-TELEMETRY capstone + OLLAMA-MAINT gated remain).
