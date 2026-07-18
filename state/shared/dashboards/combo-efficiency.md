# COMBO-EFFICIENCY-MS0 Dashboard

_Generated: 2026-06-27T20:33:46.166Z · schemaVersion 1.0.0_

## Headline

- **Overall zone:** 🔴 **RED** (score 0.17)
- **RED substrates:** 2
- **Top bridge candidates:** 0
- **Blockers:** 3

## Milestone unit status

| Unit | Title | Status |
|------|-------|--------|
| `P0-U01` | Revive Ollama (free VRAM) | ✅ complete |
| `P0-U02` | Combo-efficiency telemetry baseline collector | ✅ complete |
| `P1-U01` | Take-rate fix on master-index suggestions | ✅ complete |
| `P1-U02` | Wiki↔Memory link densifier (suggester ships; Ollama stage-2 + auto-apply follow-ups) | ✅ complete |
| `P1-U03` | Unwired-engine bridge surfacer | ✅ complete |
| `P2-U01` | Combo efficiency dashboard (this file) | ✅ complete |

## Substrate health (from combo-efficiency-baseline)

| Substrate | Status | Reason |
|-----------|--------|--------|
| obsidian | 🔴 RED | 24287 broken (no total) |
| systemViz | ⚪ UNKNOWN | awareness-missing |
| masterIndex | 🔴 RED | take-rate 0.2% (5/2296) |
| ollama | 🟡 YELLOW | offload 28.2% (71/252) |

- **Combo umbrella:** 2763 hits / 5560 nudges / 584,900 tokens saved

## Top unwired bridges

_Bridge ranking not yet generated. Run `node scripts/unwired-bridge-rank.mjs --root H:/prism` first._

## Recommendations

- Run P1-U01 (take-rate fix) — biggest single leverage; turns nudges into adoptions.
- Run P1-U02 (wiki link densifier) — closes broken `[[name]]` tokens.
