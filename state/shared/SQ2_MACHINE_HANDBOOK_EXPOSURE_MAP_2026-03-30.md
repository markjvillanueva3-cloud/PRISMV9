# SQ2 Machine Handbook Exposure Map

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Wave anchor: `U-CENSUS1-A`
Source corpus:
- `H:\PRISM\mcp-server\data\machine-handbooks`

## Purpose

This maps the eight structured handbook JSONs into the canonical `SQ2` roadmap so they can be treated as already-promoted assets, not raw-ingestion backlog.

## Shared Handbook Posture

- Structured handbook files surfaced: `8`
- Confidence across all current files: `0.95`
- Page range: `312` to `1245`
- Shared handbook domains present in every file:
  - `spindle_specs`
  - `axis_kinematics`
  - `controller_features`
  - `alarm_codes`
  - `maintenance_schedule`
  - `parts_book`
  - `programming_tips`
  - `safety_limits`
  - `coolant_specs`
  - `tooling_constraints`

## Exposure Map

| Machine ID | Manufacturer | Model | Model Family | Pages | Suggested Consumers | Notes |
| --- | --- | --- | --- | ---: | --- | --- |
| `dmg-dmu-50` | `DMG MORI` | `DMU 50` | `DMU Series` | 512 | `machine-live`, `setup-assistant`, `programming-assistant`, `maintenance` | inference: universal / 5-axis machining center handbook |
| `doosan-dnm-5700` | `Doosan` | `DNM 5700` | `DNM Series VMC` | 398 | `machine-live`, `setup-assistant`, `maintenance`, `alarm-diagnosis` | vertical machining center family |
| `makino-a51nx` | `Makino` | `a51nx` | `a-Series Horizontal` | 584 | `machine-live`, `setup-assistant`, `programming-assistant`, `tooling-rules` | horizontal machining center family |
| `mazak-integrex-i200` | `Mazak` | `INTEGREX i-200` | `INTEGREX i Series` | 586 | `machine-live`, `multi-tasking-setup`, `programming-assistant`, `alarm-diagnosis` | inference: mill-turn / multitasking platform |
| `okuma-lb3000-ex-ii` | `Okuma` | `LB3000 EX II` | `LB EX II` | 968 | `machine-live`, `turning-setup`, `maintenance`, `alarm-diagnosis` | turning-center family |
| `okuma-mu-5000v` | `Okuma` | `MU-5000V` | `MU-V` | 1120 | `machine-live`, `5-axis-setup`, `programming-assistant`, `maintenance` | 5-axis vertical machining family |
| `okuma-multus-b300ii` | `Okuma` | `MULTUS B300II` | `MULTUS B` | 1245 | `machine-live`, `multi-tasking-setup`, `programming-assistant`, `maintenance` | dual-domain turning + milling handbook |
| `roku-roku-rky-1000n` | `Roku-Roku` | `RKY-1000N` | `RKY Series High-Speed Graphite/Die Mold` | 312 | `machine-live`, `high-speed-machining`, `setup-assistant`, `tooling-rules` | mold / graphite focused high-speed platform |

## Canonical Interpretation

1. These files are already promoted assets and should enter the registry as `source_kind=promoted`.
2. The main remaining gap is consumer exposure, not extraction.
3. The next handbook-oriented task should map each `machine_id` to the live consumers that can already read it versus the consumers that still need wiring.

## Recommended Next A1 Step

Build a consumer-readiness matrix with these columns:

- `machine_id`
- `consumer`
- `readiness`
- `path_or_endpoint`
- `blocking_gap`

That will tell `SQ2` whether handbook value is blocked by missing UI/engine exposure rather than missing content.
