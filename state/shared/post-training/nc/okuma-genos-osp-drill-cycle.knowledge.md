# Knowledge Traveler — okuma-genos-osp · job drill-cycle
_process: milling · dialect: okuma_

## Playbook conformance (mechanically-checkable sequencing rules)
- **SEQ-001** Face first, always (critical) — ∅ n/a · no face op in a multi-op job
- **SEQ-003** Roughing before finishing (critical) — ∅ n/a · no rough+finish pair

## Applied knowledge per operation
### drill (steel)
- sources: 5 tribal · 5 playbook · 5 controller
  - tribal [tk-012] Safety: never reach into running machine (100%)
  - tribal [tk-008] First-article inspection shortcut (90%)
  - tribal [tk-009] Tool length measurement best practice (88%)
  - playbook [SEQ-001] Face first, always (critical)
  - playbook [SEQ-003] Roughing before finishing — always separate (critical)
  - playbook [ANTI-002] Never plunge a flat-bottom endmill into solid stock (critical)
  - controller [ctrl-029] Okuma OSP unique G-code dialect
  - controller [ctrl-030] Okuma Thermo-Friendly Concept for thermal stability