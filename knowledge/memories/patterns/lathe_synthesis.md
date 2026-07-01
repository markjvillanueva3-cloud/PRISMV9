---
name: lathe_synthesis
description: "[auto-synth · verify] Compounding synthesis of the lathe domain — recurring patterns, decisions, open threads distilled from 8 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: lathe
  synthesizedFrom: 8
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:57:59.732Z
  sourceHash: 57c5fa6fe543
  advisoryOnly: true
  mustHumanVerify: true
---

# lathe — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 8 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Distillation‑to‑LoRA pipeline** – a dedicated `--distill` flag is added to the domain‑corpus‑to‑LoRA conversion step, enabling automated extraction of compact LoRA weights from raw lathe knowledge bases [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
- **“Tribal” ingestion & advisory loops** – resumable, community‑driven data ingest (e.g., Claude Ollama pipeline) feeds a closed‑loop corpus that is repeatedly wired back into the model for continual refinement [reference/reference_post_ship_kienzle-lathe-wizard-u-w6-tribal-ingest] & [reference/reference_post_ship_kienzle-lathe-wizard-u-w-tribal-advisory]; wiki lessons codify these loops for reuse [reference/reference_post_ship_kienzle-lathe-wizard-u-w-wiki-lessons].
- **Cross‑galaxy synthesis as a scaling primitive** – per‑galaxy synthesis brains generate LoRA signals that are merged via a `--source galaxy` mode, providing a template for aggregating heterogeneous lathe datasets across many “domains” [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Threading infeed safety heuristics** – single‑point radial/plunge infeed with both flanks cut is accepted up to ≤16 TPI; nose‑radius and CSS (cutting‑speed‑stability) limits are enforced to curb heat, chatter, and tool wear [reference/reference_lathe_threading_infeed_tnr_2026_06_13].
- **Web‑verified physics integration** – a WebFetch verification step supplies authoritative physics parameters (mill/lathe/WEDM speed‑feed formulas) that feed downstream post‑processing modules [reference/reference_post_ship_fleet-knowledge-max-u-zkm-verify-w4].
- **WEDM tactical pairings** – optimal WEDM operation is distilled into two “leaves”: precise wire tension control and fluid (flushing) management [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-wedm-tactics-pair].

## Key decisions & rules
| Decision | Rule / Parameter | Source |
|----------|------------------|--------|
| Enable LoRA distillation | Add `--distill` flag to `domain-corpus-to-lora-data` command. | [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode] |
| Tribal ingest pipeline | Use resumable Claude Ollama ingestion (`$0‑Claude Ollama lathe tribal ingest`). | [reference/reference_post_ship_kienzle-lathe-wizard-u-w6-tribal-ingest] |
| Closed‑loop corpus size | Wire the 675‑tip maxed corpus into the feedback loop before further training. | [reference/reference_post_ship_kienzle-lathe-wizard-u-w-tribal-advisory] |
| Threading infeed limits | Radial/plunge both‑flank cut allowed; enforce ≤16 TPI for coarse threads; respect nose‑radius/CSS safety envelope. | [reference/reference_lathe_threading_infeed_tnr_2026_06_13] |
| Physics verification | Run WebFetch to obtain verified speed‑feed and wave parameters before posting to mill/lathe/WEDM modules. | [reference/reference_post_ship_fleet-knowledge-max-u-zkm-verify-w4] |
| WEDM operation | Maintain wire tension within prescribed band; ensure continuous fluid flushing (the two tactical leaves). | [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-wedm-tactics-pair] |
| Cross‑galaxy data aggregation | Invoke `--source galaxy` mode to merge 512 advisory‑tagged Alpaca pairs from all 34 galaxies into a unified LoRA dataset. | [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10] |

## Open threads
- **Unified tribal framework:** How can the tribal ingest/advisory pattern be standardized across lathe, mill, and WEDM pipelines without fragmenting community contributions?
- **Scaling closed‑loop corpus:** The current 675‑tip limit is a hard cap; what mechanisms (e.g., incremental LoRA merging, hierarchical corpora) allow growth beyond this threshold while preserving model stability?
- **Higher TPI safety envelope:** Existing guidance caps coarse threading at ≤16 TPI. Investigation is needed to define safe parameters for finer pitches or alternative materials.
- **Real‑time physics integration:** WebFetch provides verified static parameters; can these be streamed into live feed‑rate controllers to adapt on‑the‑fly?
- **Galaxy synthesis specificity:** The cross‑galaxy LoRA feeder treats all domains uniformly. Tailoring source‑galaxy weighting for lathe‑specific phenomena (e.g., chatter frequencies) remains an open research question.
