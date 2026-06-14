---
title: JM Die Machine Alarm Quick-Reference
type: reference
domain: mill
tags: [mill, alarm, controller, fanuc, haas, okuma, hurco, fault, safety, jm-die, shop-floor]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-data-contents-inventory, mill-machine-stack-reference, jm-die-profile]
---

# JM Die Machine Alarm Quick-Reference

> Maps each of the 5 JM Die mill VMCs to its controller family and the **real alarm database** that covers it. The structured alarm data existed all along (`controller-alarm-database.json`) but was never surfaced as a per-machine shop reference — this closes that gap. **Safety-relevant:** when a machine faults mid-cut, the operator needs *this means X → check Y → fix Z* fast. Every code/cause/fix below is a real record from the data (no fabrication, R12).

## Data on hand (cite)
- **`mcp-server/src/data/controller-alarm-database.json`** v2.0.0 — **`totalAlarms: 2588`**. Per-record: `alarm_id, controller_family, controller_models[], alarm_code, alarm_name, category, severity, message_text, description, causes[], fix_procedure_id, related_parameters[], requires_power_cycle`.
- **`mcp-server/src/data/alarm-fix-procedures.json`** v2.0.0 — **`totalFixes: 2588`** — keyed by `fix_id` (= `fix_procedure_id`): `title, difficulty(OPERATOR|…), estimated_time_min, tools_required[], safety_warnings[], steps[{step_number, instruction, expected_result, if_fails}]`.
- `byController` index (cite: `controller-alarm-database.json:5`): FANUC 300 · HEIDENHAIN 315 · MAZAK 271 · OKUMA 267 · SIEMENS 205 · MITSUBISHI 205 · HAAS 179 · DMG_MORI 159 · HURCO 157 · DOOSAN 156 · BROTHER 143 · FAGOR 113 · UNKNOWN 118.

## §1 — JM mill fleet → controller family → alarm coverage (cite: `jm-die-profile.ts:248-252`)
| VMC | Machine | Controller | Alarm family (count) | Notes |
|-----|---------|-----------|----------------------|-------|
| **VMC-01** | Hurco VM30i | WinMAX v10 | **HURCO (157)** — `controller_models:["WinMax"]` | conversational + G-code |
| **VMC-02** | Okuma M460V-5AX | OSP-P300MA-H | **OKUMA (267)** — models `OSP-P300/P200/P100` | 5-axis |
| **VMC-03** | Haas VF-2 | PRE-NGC | **HAAS (179)** — models `NGC/Classic` | — |
| **VMC-04** | Haas OM-2 | PRE-NGC | **HAAS (179)** | — |
| **VMC-05** | Roku-Roku HC 658-II | **Fanuc 31i-B5** | **FANUC (300)** — models incl. `31i-B` | **no PRISM post registered yet** (real gap) |

All five families are covered by the DB — the FANUC `controller_models` explicitly include `31i-B` (cite: `controller-alarm-database.json` FANUC-000 record), confirming Roku-Roku/Fanuc-31i coverage.

## §2 — Real sample alarms per JM family (code → meaning → cause → fix-id)
**FANUC (VMC-05 Roku-Roku):**
- `FANUC-000` PLEASE TURN OFF POWER · PROGRAM · MEDIUM · cause "Parameter change requires restart" → `FIX-FANUC-000`.

**HAAS (VMC-03/04):**
- `HAAS-101` SERVO OVERLOAD · SERVO · **HIGH** · causes [Motor overload, Mechanical binding, Drive fault].
- `HAAS-103` SERVO FUSE BLOWN · SERVO · **CRITICAL** · causes [Short circuit, Drive fault, Motor failure].

**OKUMA (VMC-02 M460V):**
- `OKUMA-001` PROGRAM FORMAT ERROR · PROGRAM · MEDIUM · models OSP-P300/P200/P100 · cause "Syntax error".
- `OKUMA-002` DATA OUT OF RANGE · PROGRAM · MEDIUM · cause "Value too large".

**HURCO (VMC-01 VM30i):**
- `HURCO-SYS0` SYSTEM RESET · SYSTEM · HIGH · `requires_power_cycle: false` → `FIX-HURCO-SYS0`.
- `HURCO-SYS1` WATCHDOG TIMEOUT · SYSTEM · **CRITICAL** · `requires_power_cycle: true`.

## §3 — Worked fix example (real, cite: `alarm-fix-procedures.json` FIX-FANUC-000)
`FIX-FANUC-000` — difficulty **OPERATOR**, ~15 min, tools: [Program editor], safety: ["None specific"]. Steps:
1. Note the line number with the error → *(if fails: search alarm history)*
2. Review the block at that line → 3. Check for missing parameters / invalid codes → 4. Correct the error → 5. Reset and restart.

Each of the 2,588 alarms has a matching `fix_procedure_id` with this step structure — query it by id.

## §4 — How to use the DB live
- **Lookup by machine:** map the VMC → family (§1), then filter `controller-alarm-database.json` by `controller_family`.
- **Lookup by code:** grep the file for `"alarm_code": "<code>"` → read `causes` + `fix_procedure_id` → look up that id in `alarm-fix-procedures.json` for the steps.
- **Triage by severity:** `CRITICAL` (e.g. servo fuse, watchdog) = stop, do not reset-and-rerun blindly; `requires_power_cycle:true` means a controlled power cycle is part of the fix.
- Consumer surfaces: the graph nodes `alarm-fix-lookup` / `alarm-fix-search` already index this; engines can route through them rather than re-grep.

## Shop-floor tips (tribal)
- A **SERVO/CRITICAL** alarm (HAAS-103 fuse, HURCO-SYS1 watchdog) is a *do-not-just-reset* — investigate the mechanical/electrical cause first (causes list), or you blow the next fuse. (src: `controller-alarm-database.json`)
- `requires_power_cycle: true` is a real field — honor it; a soft reset on those leaves the controller in a bad state. (src: HURCO-SYS1)
- Roku-Roku (VMC-05) speaks **Fanuc 31i** — use the FANUC alarm family, and note PRISM has **no post for it yet** (program by hand / borrow a Fanuc post until registered). (src: `jm-die-profile.ts:252`)
- Most fixes are `difficulty: OPERATOR` (~15 min) — the DB tells you when it's an operator fix vs a maintenance/electrician job (the `difficulty` field). (src: `alarm-fix-procedures.json`)

## Source data (cite)
`controller-alarm-database.json` (2,588 alarms) · `alarm-fix-procedures.json` (2,588 fixes) · `jm-die-profile.ts:238-257` (fleet→controller map). Full surface: [[mill-data-contents-inventory]] §4. Machine stack: [[mill-machine-stack-reference]].
