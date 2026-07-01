# SFC Convergence Diff -- production (orchestrator) vs convergence target (engine)

> Decision-support for the operator-gated convergence P2 (re-baselines production SFC UI numbers).
> PRODUCTION = SpeedFeedOrchestratorEngine.compute (web UI). TARGET = UltimateSpeedFeedEngine.calculate(adapter).
> The engine is -26% vs published + aligned with JM Die ACTUAL proven cutting (lathe 137 / mill 180-249 m/min);
> the orchestrator is ~2-3x more conservative than BOTH published AND JM Die's own proven programs.

## Safety summary

**[!] 4 production OVER-SPEED case(s) the convergence FIXES** (production runs a hazardously short tool life; the engine is safer):
- **Steel P mill rough**: production life 9min < 15min floor; engine 36min (safer)
- **Steel P mill finish**: production life 2min < 15min floor; engine 69min (safer)
- **Hardened steel HB500 finish**: production life 6min < 15min floor; engine 185min (safer)
- **Stainless M mill rough**: production life 13min < 15min floor; engine 63min (safer)

**[!] 2 case(s) where the convergence would run HOTTER -- review before approving:**
- **Stainless M OD turning rough**: engine life 6min < 15min floor and below production 13min -- review
- **Cast iron K OD turning rough**: engine life 3min < 15min floor and below production 4min -- review

## Steel P mill rough  [[!] OVER-SPEED FIX]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 200 | 160 | -20% |
| RPM | 6366 | 5093 | -20% |
| Fc (N) | 326 | 1035 | +217% |
| Power (kW) | 1.09 | 2.76 | +153% |
| Tool life (min) | 9.00 | 36.00 | +300% |
| Ra (um) | 0.18 | 2.70 | +1400% |

_safety: production life 9min < 15min floor; engine 36min (safer)_

## Steel P mill finish  [[!] OVER-SPEED FIX]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 280 | 170 | -39% |
| RPM | 8913 | 5411 | -39% |
| Fc (N) | 118 | 82.00 | -31% |
| Power (kW) | 0.55 | 0.23 | -58% |
| Tool life (min) | 2.00 | 69.00 | +3350% |
| Ra (um) | 1.39 | 0.72 | -48% |

_safety: production life 2min < 15min floor; engine 69min (safer)_

## Aluminum N mill finish  [ok]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 302 | 377 | +25% |
| RPM | 12000 | 15000 | +25% |
| Fc (N) | 84.00 | 50.00 | -40% |
| Power (kW) | 0.42 | 0.31 | -25% |
| Tool life (min) | 6.00 | 6.00 | +0% |
| Ra (um) | 1.37 | 0.96 | -30% |

_safety: production 6min / engine 6min_

## Titanium S mill rough  [ok]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 50.00 | 46.00 | -8% |
| RPM | 1326 | 1220 | -8% |
| Fc (N) | 392 | 999 | +155% |
| Power (kW) | 0.33 | 0.77 | +132% |
| Tool life (min) | 447 | 61.00 | -86% |
| Ra (um) | 0.21 | 1.80 | +757% |

_safety: production 447min / engine 61min_

## Hardened steel HB500 finish  [[!] OVER-SPEED FIX]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 226 | 42.80 | -81% |
| RPM | 12000 | 2271 | -81% |
| Fc (N) | 154 | 66.00 | -57% |
| Power (kW) | 0.58 | 0.05 | -92% |
| Tool life (min) | 6.00 | 185 | +2983% |
| Ra (um) | 0.95 | 0.15 | -84% |

_safety: production life 6min < 15min floor; engine 185min (safer)_

## Stainless M mill rough  [[!] OVER-SPEED FIX]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 120 | 100 | -17% |
| RPM | 3820 | 3183 | -17% |
| Fc (N) | 326 | 992 | +204% |
| Power (kW) | 0.65 | 1.65 | +154% |
| Tool life (min) | 13.00 | 63.00 | +385% |
| Ra (um) | 0.12 | 1.60 | +1233% |

_safety: production life 13min < 15min floor; engine 63min (safer)_

## Cast iron K mill rough  [ok]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 180 | 170 | -6% |
| RPM | 3581 | 3382 | -6% |
| Fc (N) | 522 | 1416 | +171% |
| Power (kW) | 1.57 | 4.01 | +155% |
| Tool life (min) | 4.00 | 5.00 | +25% |
| Ra (um) | 0.84 | 5.90 | +602% |

_safety: production 4min / engine 5min_

## Steel P OD turning rough  [ok]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 200 | 185 | -8% |
| RPM | 1273 | 1178 | -7% |
| Fc (N) | 30.00 | 2189 | +7197% |
| Power (kW) | 0.10 | 6.75 | +6650% |
| Tool life (min) | 9.00 | 13.00 | +44% |
| Ra (um) | 0.00 | 25.00 | +11961622% |

_safety: production 9min / engine 13min_

## Stainless M OD turning rough  [[!] REVIEW]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 120 | 145 | +21% |
| RPM | 955 | 1154 | +21% |
| Fc (N) | 30.00 | 1856 | +6087% |
| Power (kW) | 0.06 | 4.49 | +7383% |
| Tool life (min) | 13.00 | 6.00 | -54% |
| Ra (um) | 0.00 | 17.00 | +7555456% |

_safety: engine life 6min < 15min floor and below production 13min -- review_

## Cast iron K OD turning rough  [[!] REVIEW]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 180 | 200 | +11% |
| RPM | 716 | 796 | +11% |
| Fc (N) | 26.00 | 1216 | +4577% |
| Power (kW) | 0.08 | 4.05 | +4962% |
| Tool life (min) | 4.00 | 3.00 | -25% |
| Ra (um) | 0.00 | 17.00 | +3752659% |

_safety: engine life 3min < 15min floor and below production 4min -- review_

## Aluminum N OD turning finish  [ok]

| metric | production | -> target | diff |
|---|---|---|---|
| Vc (m/min) | 377 | 460 | +22% |
| RPM | 4000 | 4881 | +22% |
| Fc (N) | 8.00 | 67.00 | +738% |
| Power (kW) | 0.05 | 0.51 | +926% |
| Tool life (min) | 3.00 | 4.00 | +33% |
| Ra (um) | 0.02 | 2.30 | +11400% |

_safety: production 3min / engine 4min_

