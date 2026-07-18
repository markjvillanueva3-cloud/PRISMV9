# Knowledge Traveler — okuma-b250-lathe · job lathe-od-face-turn
_process: turning · dialect: okuma_

## Playbook conformance (mechanically-checkable sequencing rules)
- **SEQ-001** Face first, always (critical) — ✅ PASS · face op is first
- **SEQ-003** Roughing before finishing (critical) — ✅ PASS · all roughing precedes finishing

## Applied knowledge per operation
### face (steel)
- sources: 5 tribal · 5 playbook · 5 controller
  - tribal [tk-012] Safety: never reach into running machine (100%)
  - tribal [tk-008] First-article inspection shortcut (90%)
  - tribal [tk-009] Tool length measurement best practice (88%)
  - playbook [SEQ-001] Face first, always (critical)
  - playbook [SEQ-003] Roughing before finishing — always separate (critical)
  - playbook [ANTI-002] Never plunge a flat-bottom endmill into solid stock (critical)
  - controller [ctrl-029] Okuma OSP unique G-code dialect
  - controller [ctrl-030] Okuma Thermo-Friendly Concept for thermal stability
### od_rough (steel)
- sources: 5 tribal · 5 playbook · 5 controller
  - tribal [tk-012] Safety: never reach into running machine (100%)
  - tribal [tk-008] First-article inspection shortcut (90%)
  - tribal [tk-009] Tool length measurement best practice (88%)
  - playbook [SEQ-001] Face first, always (critical)
  - playbook [SEQ-003] Roughing before finishing — always separate (critical)
  - playbook [ANTI-002] Never plunge a flat-bottom endmill into solid stock (critical)
  - controller [ctrl-029] Okuma OSP unique G-code dialect
  - controller [ctrl-030] Okuma Thermo-Friendly Concept for thermal stability
### od_finish (steel)
- sources: 5 tribal · 5 playbook · 5 controller
  - tribal [tk-012] Safety: never reach into running machine (100%)
  - tribal [tk-008] First-article inspection shortcut (90%)
  - tribal [tk-009] Tool length measurement best practice (88%)
  - playbook [SEQ-001] Face first, always (critical)
  - playbook [SEQ-003] Roughing before finishing — always separate (critical)
  - playbook [ANTI-002] Never plunge a flat-bottom endmill into solid stock (critical)
  - controller [ctrl-029] Okuma OSP unique G-code dialect
  - controller [ctrl-030] Okuma Thermo-Friendly Concept for thermal stability