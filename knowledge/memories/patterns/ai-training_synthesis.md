---
name: ai-training_synthesis
description: "[auto-synth · verify] Compounding synthesis of the ai-training domain — recurring patterns, decisions, open threads distilled from 17 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: ai-training
  synthesizedFrom: 17
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:56:46.357Z
  sourceHash: 4ddf3355b6b6
  advisoryOnly: true
  mustHumanVerify: true
---

# ai-training — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 17 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Atomic‑style distillation** – repeatedly used to swap or move data in a temporary “atomic” buffer before committing (e.g., [U‑PAPA‑ATOMIC‑DISTILL‑WIKI], [U‑PAPA‑TRIBAL‑ATOMIC‑DISTILL]).
- **Keepalive / health checks** baked into the training pipeline to close gaps such as the “R9 gap” ([U‑PAPA‑DISTILL‑KEEPALIVE‑TESTS]).
- **Fail‑soft snapshot handling** – raw baseline data is persisted in a way that tolerates partial failures ([U‑PAPA‑DISTILL‑SNAPSHOT‑FAILSOFT]).
- **Domain‑corpus validation & injection** – the corpus is validated before being injected into the model, and rescued knowledge can be re‑injected later ([U‑PAPA‑DOMAIN‑CORPUS‑VALIDATE], [U‑PAPA‑DOMAIN‑KNOWLEDGE‑LORA]).
- **LoRA generation with explicit “--distill” mode** – a dedicated flag drives LoRA creation from domain corpora, and the process is made resumable ([U‑PAPA‑LORA‑DISTILL‑MODE], [U‑PAPA‑LORA‑DISTILL‑RESUMABLE]).
- **Scrutiny/fixup step that strips control tokens (C0/C1/DEL)** before LoRA training to keep data clean ([U‑PAPA‑LORA‑SCRUTINY‑FIXUP]).
- **Tribal safeguards** – clobber‑guard warnings and cursor‑based domain‑set resumption protect against accidental overwrites and enable fine‑grained resume points ([U‑PAPA‑TRIBAL‑CLOBBER‑GUARD], [U‑PAPA‑TRIBAL‑CURSOR‑DOMAINSET]).
- **Per‑chunk progress logging** to make long distillation runs observable and debuggable ([U‑PAPA‑TRIBAL‑DISTILL‑PROGRESS]).
- **Ollama reclassification layer** – a generalized Ollama model is used to reclassify outputs, with burst handling for stale tasks ([U‑PAPA‑DOMAIN‑RECLASSIFY‑OLLAMA], [U‑PAPA‑WIKI‑OLLAMA‑BURST‑STALE‑TASK]).
- **All‑domain feeder abstraction** – a canonical wiring scheme applies the same feeding logic to every domain, enabling uniform CAD/CAM‑style pipelines ([U‑ZULU‑ALL‑DOMAIN‑FEEDERS], [U‑ZULU‑FEEDER‑CANONICAL‑WIRE]).

## Key decisions & rules
- **Use atomic distill‑to‑temp** as the default data movement primitive; revert any non‑atomic changes (see the revert in [U‑PAPA‑TRIBAL‑ATOMIC‑DISTILL]).
- **Enforce keepalive tests** on every distillation batch to guarantee that the “R9 gap” is closed before proceeding ([U‑PAPA‑DISTILL‑KEEPALIVE‑TESTS]).
- **Persist snapshots with fail‑soft semantics**, allowing downstream steps to continue even if part of the raw baseline fails ([U‑PAPA‑DISTILL‑SNAPSHOT‑FAILSOFT]).
- **Validate domain corpus** prior to injection and record the validation result; only validated corpora may be used for LoRA training ([U‑PAPA‑DOMAIN‑CORPUS‑VALIDATE]).
- **Activate `--distill` mode** when converting a domain corpus to LoRA data, and always run with the resumable flag so interrupted runs can restart safely ([U‑PAPA‑LORA‑DISTILL‑MODE], [U‑PAPA‑LORA‑DISTILL‑RESUMABLE]).
- **Strip control tokens (C0/C1/DEL)** during the scrutiny phase to avoid contaminating LoRA weights ([U‑PAPA‑LORA‑SCRUTINY‑FIXUP]).
- **Emit a loud clobber warning** (`R12`) before any narrower‑set overwrite operation; abort if the user does not acknowledge ([U‑PAPA‑TRIBAL‑CLOBBER‑GUARD]).
- **Maintain a cursor keyed by domain‑set** to enable precise resume points across large distillation jobs ([U‑PAPA‑TRIBAL‑CURSOR‑DOMAINSET]).
- **Log progress per chunk** (including timestamps and success/failure counts) for full traceability ([U‑PAPA‑TRIBAL‑DISTILL‑PROGRESS]).
- **Run Ollama reclassification after primary inference**, and schedule burst checks to detect stale tasks that need re‑processing ([U‑PAPA‑DOMAIN‑RECLASSIFY‑OLLAMA], [U‑PAPA‑WIKI‑OLLAMA‑BURST‑STALE‑TASK]).
- **Apply the canonical feeder wire** uniformly across all domains, ensuring consistent data flow and simplifying CAD/CAM‑style extensions ([U‑ZULU‑ALL‑DOMAIN‑FEEDERS], [U‑ZULU‑FEEDER‑CANONICAL‑WIRE]).

## Open threads
- **R9 gap definition & metrics** – precise thresholds for “closing the R9 gap” remain undocumented; need quantitative targets.
- **Fail‑soft baseline criteria** – what constitutes an acceptable partial failure in snapshot handling?
- **Recall ceiling verification** – exact recall thresholds for reclassifier validation are not yet fixed ([U‑PAPA‑DOMAIN‑RECALL‑VERIFY]).
- **Control token stripping edge cases** – how to handle rare tokens that may be semantically important but appear as control codes?
- **Clobber‑guard user experience** – determine the optimal warning level and abort/retry workflow for `R12` warnings.
- **Canonical wire schema versioning** – establish a versioning strategy for the feeder wiring to avoid breaking changes across domains.
