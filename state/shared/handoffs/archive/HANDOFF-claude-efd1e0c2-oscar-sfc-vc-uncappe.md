---
session: claude-efd1e0c2
topic: oscar-sfc-vc-uncapped-parity
slot: oscar
written_at: 2026-06-25T08:46:24.960Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-efd1e0c2
status: active
---

# HANDOFF: claude-efd1e0c2
Updated: 2026-06-25T08:46:24.960Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-efd1e0c2

## STATE
## Oscar/SFC -- 12 code units + 8 findings; priorities 1-4 covered

Latest: U-OSC-SWEEP-LEDGER-FZ (3bd4ecc4ad) -- sweep ledger now persists fz (prism_fz_mm + per-vendor fz deltas) for india training. fz +124.7% finding RESOLVED (mode-aggregation, not a bug). Sweep prod-mode validated (576 cells, PRISM conservative/SAFE).

### Remaining: (a) full-mode ~69K sweep (HEAVY, fresh ctx); (b) india trains on the ledger; (c) split summary fz by mode (marginal). All need fresh context or are cross-domain.

### Notes: token ~0.86; self-compact dormant for this WT tab. Shared tree -> [MAIN-FORCE], own files. Memories: reference_oscar_full_sweep_validated_2026_06_25 (fz resolution), reference_oscar_jm_accuracy_validation_result_2026_06_25.

## RESUME
Continue oscar/SFC loop. DONE: 12 scrutinized code units + 8 findings + sweep validation. Priorities 1-4 covered: (3b) synthetic full-sweep VALIDATED (sfc-full-sweep-compare.mjs prod mode, 576 cells, PRISM conservative-SAFE vs baseline); (4) ledger now fz-complete (U-OSC-SWEEP-LEDGER-FZ 3bd4ecc4ad -- was Vc-only) so india LoRA/GNN can train on FEED too. The +124.7% fz-vs-G-Wizard finding is RESOLVED = mode-aggregation artifact (cost_batch +47% / aggressive_rush +200%; G-Wizard publishes one conservative fz, PRISM is mode-specific) -- NOT a bug, no fz physics fix needed. REMAINING: (a) the HEAVY full-mode sweep --mode full ~69K cells (Blackwell-scale, FRESH CONTEXT, write-to-file); (b) india consumes the fz-complete ledger (india domain); (c) marginal: split the sweep summary's fz delta BY MODE so the aggregate isn't misread (needs byVendor per-mode restructure, fresh context). Token zone ~0.86; self-compact dormant; native auto-compact ~95% / operator /compact resets.

## CONTEXT

