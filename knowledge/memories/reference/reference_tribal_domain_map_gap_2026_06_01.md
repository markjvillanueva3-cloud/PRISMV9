---
name: reference_tribal_domain_map_gap_2026_06_01
description: "tribal-by-domain-inject DOMAIN_MAP has only 6 domains — speed-feed/database/business MISSING, so oscar/juliett/hotel tribal injection never fires despite 182/12497/1569 tips already in tribal-embed-index.json"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.976Z
aliases: reference_tribal_domain_map_gap_2026_06_01
---


**Tribal-injection wiring gap (found 2026-06-01, slot:alpha, galaxy knowledge-injection audit).**

`.claude/hooks/tribal-by-domain-inject.mjs` `DOMAIN_MAP` (~line 87) matches PROMPT tokens → domain → injects domain-biased tips from `state/shared/tribal-embed-index.json` (33,035 entries). It has only **6 domains**: `mill, lathe, wedm, cad, cam, backend-dev`.

- **⛔ CORRECTED 2026-06-01 (this claim was FALSE — verified end-to-end):** there is NO "pure wiring gap." Two facts kill the one-liner premise: (1) the live `tribal-embed-index.json` (33,044 entries) `domain` field has ZERO `speed-feed`/`database`/`business` entries — real tags are only `general 18924 · cam 5346 · mill 3138 · cad 3133 · lathe 1077 · engine-reference 575 · wedm 526 · backend-dev 325`. The "182/12,497/1,569 tips" were keyword-SUBSTRING miscounts, not `domain`-tagged corpus. (2) `.claude/scripts/tribal-rerank.mjs` has `VALID_DOMAINS = {mill,lathe,wedm,cad,cam,backend-dev,general}` and FAILS LOUD (`process.exit`) on any other `--domain`. So adding speed-feed/database/business to the hook DOMAIN_MAP → the hook calls `--domain speed-feed` → rerank errors → hook injects NOTHING → REGRESSION (oscar/juliett/hotel go from "general tips" to "zero tips"). I attempted the hook edit (operator-authorized bypass), verified it through the real rerank seam, and REVERTED it.
- **FOLDED (partial, and actually FINE)**: post-processor→cam, blueprint-vision→cad, ai-training→backend-dev. These ride VALID domains with real corpus — they work.

**REAL fix (3-component, dependency-ordered — NOT a hook one-liner):** (1) tag corpus entries `domain:"<new>"` in `tribal-embed-index.json` (content work, domain-slot-owned; business/database may have no manufacturing-tribal corpus at all → "general" is honest), (2) add the domain to `tribal-rerank.mjs VALID_DOMAINS`, (3) THEN add to the hook DOMAIN_MAP. **Cheaper interim:** map slots to nearest EXISTING valid domain (juliett→backend-dev, oscar→mill/cam, hotel→general) by adding tokens to an existing match set — a judgment call for the domain owner. Full corrected analysis: `state/shared/dashboards/patches/HOOK-PATCH-TRIBAL-DOMAIN-MAP-EXPAND.md` (§SUPERSEDED). **Lesson:** "corpus exists" measured by keyword-substring ≠ "corpus is domain-tagged + the reranker accepts the domain." Verify the full inject→rerank→index chain before claiming a wiring gap. See [[reference_tribal_domain_map_premise_false_2026_06_01]].

**Method lesson (for the fleet):** an LLM assessment Workflow (`agent()` per galaxy) HUNG twice — `parallel()` never resolves when one agent hangs (not errors — `.catch` only handles errors, not infinite hangs); `resumeFromRunId` re-ran the same hung agent and hung again. For presence/coverage audits (does file/index/map contain X), use a **deterministic script** (file + JSON probes), NOT LLM agents — robust, fast, no hang. The deterministic probe found this gap directly + corpus-verified it in 2 bash calls after the Workflow burned many cycles. Also: `.claude/helpers/*.mjs` CLIs (loop-state, agent-coordination, per-agent-handoff) intermittently exit 255 with no output in long shell sessions (post-API-error) — and `| tail`/`| head` piping triggers EPIPE→255 even when the write succeeds; run without pipe + verify via a follow-up read. Related: [[reference_galaxy_context_federation_viz_roost_2026_06_01]], [[reference_awareness_snapshot_broken_big_graph_2026_06_01]].
