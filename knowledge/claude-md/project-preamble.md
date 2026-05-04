---
source: project
section: _preamble
slug: preamble
indexed_at: 2026-05-02T20:38:22.435Z
---

## _preamble

# PRISM — Manufacturing Intelligence Platform

@H:/prism/state/shared/CLAUDE-BRIEF.md

> ↑ The brief above is regenerated each SessionStart by `claude-brief-inject.mjs`. If its timestamp shows >24h old, run:
> `node H:/prism/mcp-server/scripts/generate-claude-brief.mjs`
>
> **Domain boundary:** CLI Claude owns `src/engines/`, `src/tools/dispatchers/`, `src/registries/`, `scripts/`, `data/docs/`. Desktop Claude owns `web/src/`, `src/routes/`, web visual design.
>
> **Master Orchestrator role:** when Claude is in the loop, Claude orchestrates. When absent, FullSystemAICoordinator engine orchestrates per the handoff protocol in `H:/prism/state/shared/AI-HANDOFF-PROTOCOL-PROPOSAL.md`.
>
> **Process priority:** mill > lathe > WEDM > (laser/waterjet/sinker deferred).
> **CAM integration priority:** Fusion360 > hyperMILL > Mastercam > Esprit > InventorHSM > SolidWorks. Esprit currently mostly aspirational — see `state/shared/AUDIT-CAM-STATUS.md`.
>
> **Safety architecture:** calibrated confidence with layered defense. S(x) ≥ 0.70 hard block. Operator-in-the-loop unconditional. PRISM does NOT claim 100% accuracy. See `state/shared/AUDIT-EXECUTIVE-SUMMARY.md` for current honest status.
>
> **Corpus reality:** production programs in `H:/prism/JM DIE/` are NOT canonical — noisy training data, not gold-standard. Custom posts in `H:/prism/Resources/` are work-in-progress reference, also suspect. PRISM legitimately may exceed Mark's existing programs and should flag improvements with physics evidence.
>
> **JM machine fleet:** see `H:/prism/state/shared/JM-FLEET-INVENTORY.md` for the specific machines this shop runs. Flagship is the Okuma Multus B250IIW (mill-turn with sub-spindle). When SFC, Post AI, or any program-generating component refers to a machine, it should reference the JM fleet entry, not generic specs. Generic specs are the starting point; JM-specific quirks and calibration are the real envelope.
