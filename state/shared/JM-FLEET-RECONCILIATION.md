# JM Die Fleet — Reconciliation (Discrepancies Requiring Mark's Input)

**Generated:** 2026-05-02
**Method:** Tri-source diff (A=910-machine registry / B=memory / C=filesystem)

---

## TOP 5 RECONCILIATION CONFLICTS

### 1. ★ Multus B250II — sub-spindle variant model name (B250II vs B250IIW)
| Source | Value | Evidence |
|--------|-------|----------|
| A (jm-die-profile.ts L246) | "Okuma Multus B250II" | machine_name in JM_DIE_CONTROLLER_MAP |
| B (memory `jm-die-shop.md` L20) | "Multus B250II" | textual recall |
| C (filesystem header) | "OKUMA MULTUS B250IIW" | NC program: `(VENDOR OKUMA) (MODEL OKUMA MULTUS B250IIW)` |
| C (post filename) | "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps" | POSTS/ folder, "W" included |
**Question for Mark:** Is the machine the **B250IIW** (W = wide bed / sub-spindle variant) or base **B250II**? Header + post filename both say W; profile + memory drop the W. *Inferred answer: B250IIW (W variant) — header is authoritative.* Profile + memory should be updated to match.

### 2. ★ Roku-Roku HC 658-II — no post processor wired
| Source | Value | Evidence |
|--------|-------|----------|
| A (jm-die-profile.ts L252) | `post_processor: undefined` (comment: "no post yet — engine surfaces no_post_available") | explicit |
| C (filesystem) | 1,108 NC files in `JM DIE/ROKU-ROKU/` | active production |
**Question for Mark:** Roku-Roku HC 658-II runs **1,108 programs** but has **no PRISM post**. Which CAM system + post is currently producing G-code for this machine? (Likely Mastercam → Fanuc 31i generic post). Need post file path to wire `prism_cam:cam_post_select`.

### 3. Haas OM-2 — listed but zero filesystem evidence
| Source | Value | Evidence |
|--------|-------|----------|
| A (jm-die-profile.ts L251) | "Haas OM-2" with PRE-NGC controller | active in profile |
| B (memory) | "Haas OM-2" | listed in 5-mill count |
| C (filesystem) | **0 programs found** in `JM DIE/` for OM-2 | inference: standby |
**Question for Mark:** Is Haas OM-2 still on the floor? Currently inferred as STANDBY (no programs). If active, where do its programs live (separate folder, Box drive, ERP)?

### 4. Sinker EDMs — listed but zero filesystem evidence
| Source | Value | Evidence |
|--------|-------|----------|
| A (jm-die-profile.ts L254-255) | EA12S + EA12D both with posts | wired |
| B (memory) | "2 Sinker EDMs: Mitsubishi EA12S, EA12D" | confirmed |
| C (filesystem) | **0 files** in `JM DIE/SINKER EDM/` folder | empty directory |
**Question for Mark:** Are the sinker EDMs producing programs to a different location (not `JM DIE/SINKER EDM/`)? Or is electrode programming done outside PRISM (e.g., direct DNC, electrode design in Fusion/Mastercam without G-code archiving)? Need to know to set `production.status` correctly.

### 5. Tool-magazine ATCs — fleet test fixture vs profile reality
| Machine | Test fixture (B canonical) | Profile (A) | Conflict |
|---------|---------------------------:|------------:|----------|
| Hurco V11 | 24 ATC | not specified | profile lacks ATC field |
| Genos M460V-5AX | 48 ATC | not specified | profile lacks ATC field |
| Haas VF-2 | 20 ATC | not specified | profile lacks ATC field |
| Okuma LB-250-II | 60 ATC | n/a (profile has Multus B250II, not LB-250-II) | **naming mismatch** — is `jmdie_okuma_lb250ii` the same machine as `LTH-07 Multus B250II`? |
| Roku-Roku HC-658 | 30 ATC | not specified | profile lacks ATC field |

**Question for Mark:** Test fixture references `jmdie_okuma_lb250ii` with 60 pockets, "lathe_2axis", "geared spindle" — but JM_DIE_CONTROLLER_MAP only lists "Multus B250II" (a 5-axis sub-spindle mill-turn, not a 2-axis lathe). Are these **two different machines** (a B250II Multus + a separate LB-250-II 2-axis lathe), or the **same machine** with conflicting metadata? *Suspect: same machine, fixture has wrong machine_class.*

---

## SECONDARY CONFLICTS (lower priority)

### 6. Mill count discrepancy
- B (memory): "5 Mills" — Hurco VM30i, Okuma M460V-5AX, Haas VF-2, Haas OM-2, Roku-Roku HC 658-II
- A (profile): same 5 listed in VMC-01..05
- ✓ Consistent.

### 7. Lathe count discrepancy
- B (memory): "7 Okuma CNC Lathes" matching profile LTH-01..07
- A (profile): 7 entries
- ✓ Consistent. But Mark — is the **Multus** counted as a "lathe" or a "mill-turn"? Profile lists it as LTH-07; in classification terms it's `sub_spindle_mill_turn`.

### 8. Hurco shop folder is empty
- A (profile): VMC-01 Hurco VM30i with post wired
- C (filesystem): `JM DIE/HURCO/` exists in directory listing but `find -type f` = 0 results
- *Programs may live in `JM DIE/HAAS-HURCO/` (top-level folder seen). Need to confirm.*

### 9. Year / serial / shift schedule / operators / maintenance dates — ALL UNMEASURED
- 0 of 15 machines have year, serial, primary operator, last_maintenance, next_pm_due populated
- These are the largest filling gap — see `JM-FLEET-FIELDS-TO-FILL.md`

### 10. Material portfolio (memory B) vs. profile (A)
- B: H13, 4140, 4140-PH, A2, D2, S7, O2, 52100, 1018/1020, M2, M4, M42 + carbide + graphite
- A (profile): "M2, D2, S7, A2 tool steels; tungsten carbide; cobalt carbide; H13; graphite (EDM electrodes)"
- Memory is broader — profile missing 4140, 4140-PH, O2, 52100, 1018/1020, M4, M42. **Recommend updating profile.**

---

## RESOLUTION POLICY APPLIED

Per work order spec:
- B (memory) authoritative for "which machines JM owns" → all 21 retained even when filesystem empty
- A (registry) authoritative for factory specs → controller models, post filenames trusted
- C (filesystem) authoritative for "actively used" → status=active when program count >0
- Memory-only without filesystem → status=standby (Haas OM-2, EDM-01, EDM-02)
- Filesystem header "B250IIW" overrides profile/memory "B250II" for model name (header is most concrete)
