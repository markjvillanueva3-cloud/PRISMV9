---
name: cad_synthesis
description: "[auto-synth · verify] Compounding synthesis of the cad domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: cad
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:57:10.411Z
  sourceHash: 60baba8caeaa
  advisoryOnly: true
  mustHumanVerify: true
---

# cad — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Per‑slot CAD galaxy buildout** – each slot runs a self‑contained pipeline: audit → reconciliation → supervised training (CAD + CNC labels) → page classification → render‑timeout tuning → train‑set curation. Implemented for `xray` ([1], [6]–[10]) and mirrored in other slots such as `lima` and `alpha`.
- **Slot‑specific CLAUDE.md enforcement** – every slot maintains its own domain‑tailored `CLAUDE.md` instead of the monolithic file, with an edit‑guard that is activated, assessed, and later applied via a guarded finetune tool ([16], [22]–[24]).
- **Deterministic per‑slot resource allocation** – RGS allocator (`U-PER-SLOT-RGS-ALLOCATOR`) provides deterministic resources per slot, while claim modules (`U-PSC03/04/05/06`) enforce stepwise check‑in, auto‑release and stop‑time advisory ([20], [21]).
- **Closed‑loop correction flow** – corrections are published (`xproc_outcome_publish`) but currently do not feed back into the cross‑session training ledger, breaking the learning loop ([3]).
- **Coverage measurement bias** – the CAD‑gen coverage meter only scans `engines/<galaxy>/` subdirectories, missing root‑level engines and causing duplicate capability builds ([14]).

## Key decisions & rules
- **Slot‑owned branching rule:** developers must stage and commit work to their own NATO‑named branch slot (e.g., `slot/charlie`) rather than the shared live tree. Enforced by operator directive ([12]).
- **CLAUDE.md edit guard activation:** each slot’s CLAUDE.md is locked after Phase‑A assessment; only the guarded apply tool may modify it during Phase‑C finetuning ([16], [23], [24]).
- **Per‑slot galaxy audit requirement:** every buildout must pass a live reconciliation audit (20/20 success recorded) before proceeding to training phases ([6]).
- **Resource‑usage ceiling awareness:** commit charge spikes that fill the pagefile trigger cascade failures; monitoring must be in place to pre‑empt ENOSPC conditions ([5]).

## Open threads
- **Persisting correction signals** – devise a mechanism for `xproc_outcome_publish` → training ledger propagation so that live fixes become cross‑session training data ([3]).
- **Improving coverage metrics** – extend `cad-gen-coverage-meter.mjs` to include root‑level CAD engines and eliminate duplicate capability builds ([14]).
- **Scaling per‑slot train‑set curation** – ensure consistent quality and labeling across slots as the X‑ray pipeline expands (train‑set curation, page classification, render timeout adjustments) ([8]–[10]).
- **Integrating free‑AI migration route** – clarify how `U-PARTMEDIA-TO-CAD-LLM-ROUTE` interacts with existing per‑slot pipelines and whether additional routing logic is needed for other slots ([2]).
