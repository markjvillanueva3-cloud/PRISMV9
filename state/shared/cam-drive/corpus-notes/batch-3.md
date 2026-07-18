# Shard 3 — JM Die Okuma `.MIN` lathe corpus profile

> PROFILER SHARD 3 of 8. Files selected where `(zero-based line index % 8 == 3)` from `_filelist.txt` (16,558 total lines → 2,070 in this shard). All values treated as **INCH** (JM Die is a G20 Okuma OSP shop — no metric conversion applied).

## Shard 3 — file count
- **2,070** programs in shard, **2,070** readable on disk (0 missing), **1** empty.
- **2,065** programs carry at least one `T` tool-change word; tools/program: **min 1, median 5, mean 5.24, max 10**.
- Tool-count histogram (distinct turret stations per program):
  `1:35 · 2:141 · 3:237 · 4:278 · 5:391 · 6:423 · 7:363 · 8:131 · 9:56 · 10:10`
  → the mass sits at **4–7 tools**; this matches the canonical JM op-flow (rough OD → drill chain → finish OD → rough/finish ID → cutoff).

## Structural census (counts)
Single-pass tally over all 2,070 files (`_census3.mjs`). Counts are *files containing the code*, not occurrences, unless noted.

| Dimension | Count | Note |
|---|---|---|
| `G96` constant-surface-speed (CSS) present | **1,907 / 2070 (92%)** | dominant speed mode |
| `G97` direct-rpm present | **1,965 / 2070 (95%)** | nearly always co-present (drill/tap/groove segments) |
| both `G96`+`G97` in same program | **1,809** | normal: CSS for turn/bore, rpm for drill/cutoff |
| neither speed code | 6 | secondary-op fragments only |
| `G50` rpm cap present | **2,018 / 2070 (97%)** | strong discipline |
| `G96` **without** any `G50` cap | **42** | the at-risk minority (see inefficiencies) |
| `G94` feed/min present | 139 | rare |
| `G95` feed/rev present | 190 | explicit IPR engagement |
| neither `G94`/`G95` explicit | **1,878 (91%)** | **feed-mode is MODAL/implicit** — see units note below |
| `G85` (Okuma **LAP rough** cycle) | **1,543 (75%)** | the workhorse rougher |
| `G87` (Okuma **LAP finish** cycle) | **1,461 (71%)** | paired finisher |
| `G81`/`G82`/`G83` shape defs (inside `G85`/`G87`) | n/a — used as `N<shape> G81` longitudinal / `G82` transverse | |
| `G71` | 61 | **= threading cycle** (B-angle/H-height/J-TPI), NOT Fanuc rough |
| `G72` | 1 | **= threading cycle** here, NOT Fanuc face |
| `G70`/`G73`/`G75` | 0 / 0 / 0 | Fanuc-style cycles essentially absent |
| `G74` | **515 (25%)**; **513 are centerline peck-drilling** | Okuma peck-drill `G74 X0 Z- D L F` |
| `G76` | 114 files / **144 lines, ALL chamfer/corner moves inside LAP shapes** | **never threading** in this shard |
| Threading (any form: G71/G72 thread + comment) | **61 files (~3%)** | low-thread shop |
| Parting/cutoff present (comment/op) | **843 (41%)** flagged by keyword; in practice **~all** end with a `NAT11` cutoff op | |
| `M8` coolant on | **2,017 (97%)** | |
| `M9` coolant off | 1,308 | |
| `M8` set but **no explicit `M9`** | **720** | relies on tool-change/M2 implicit coolant-off |

### Okuma-OSP dialect map (learned from shard 3)
- `G85 N<shape> D<doc> U<x-stk> W<z-stk> F<feed>` = **LAP roughing**; the shape body follows as `N<shape> G81` (longitudinal/turn) or `G82` (transverse/face/bore), terminated by `G80`.
- `G87 N<shape>` = **LAP finishing** — re-runs the *same* named shape at finish feed/speed. Zero re-coding of geometry.
- `G74 X0 Z<depth> D<peck> L<retract> F<ipr>` = **peck drilling** on centerline.
- `G71/G72 X.. Z.. B<angle> D<infeed> U<final> H<height> F<lead> J<TPI> M33 M73` = **threading** (B60 = 60° UN form).
- `G76 X/Z.. A<angle> L<radius>` = **corner radius / chamfer move inside a LAP shape** (NOT a thread cycle).
- `G50 S<rpm>` = mandatory max-rpm clamp under `G96`. `A<deg>` = angle-defined move; `L<r>` = radius on arc; `G41/G42/G40` = tool-nose-radius comp.
- Bar-feed framing: `NBAR … /CALL OBAR … /GOTO NBAR` brackets most full programs (collet/bar-pull subroutine). Op blocks are named `NAT01..NAT11+` with `T0n0n0n` (geometry+wear-offset paired).

## Per-program structural notes (sampled)
~18 programs deep-read end-to-end. INCH throughout.

1. **AGRATI/9099122.MIN** — Seq: OD+face finish-turn (`G85 NRUFF`/`G82` then implicit) → face-groove finish `G87` → cutoff `G111`. CSS+G50 (S350/cap750). Feed per-rev modal (F.0015–.005). Clean.
2. **A-1070#3-8.MIN** — Seq: OD+face **rough** `G85 NTURN/G81` → OD finish `G87 NTURN` (shape reuse) → cutoff w/ chamfer (A225). G50 S600 cap, G97 then G96 on cutoff. Textbook 3-tool flow.
3. **ANDERSON/SP25-101.MIN** — Seq: OD rough `G85/G81` → center-drill → drill (deep, `M41/M42` gear) → OD finish `G87` (reuses NR001) → ID rough-bore (hand-coded longhand!) → cutoff. 6 tools. CSS+G50 on turning, G97 on drill/bore.
4. **ELITE/E250-150-CAP.MIN** — Seq: OD rough `G85/G81` → OD finish `G87` → center-drill → `G74` peck-drill .156 → boring bar (**hand-coded 2-pass, no cycle**) → cutoff. CSS+G50 on cutoff only; turning on G97.
5. **CLENDENIN/A2B1C336D136R172.MIN** — Seq: OD rough (hand-coded single-pass) → center-drill → **two tools each running 7 near-identical longhand arc passes** (NAT09/NAT10) → cutoff. Heavy longhand repetition (G83 pattern would compress).
6. **FONTANA/B-8781-8.MIN** — Seq: OD rough (hand-coded) → ID bore rough `G85 NBORE/G82` w/ G41 comp → ID finish (hand-coded longhand, no `G87`) → cutoff w/ corner. CSS+G50 on bore/cutoff.
7. **HEADER/TDI-30108A-42.MIN** — **Exemplary CSS+IPR**: explicit `G96 S200` + `G95` feed/rev on every turn; OD rough `G85/G81` → OD finish (longhand contour, no G87) → center-drill → `G74` peck → ID rough `G85/G81` → ID finish `G87` → **cutoff = 8 identical longhand Z-step nibble passes** (should be a groove cycle). G50 S800.
8. **ITW/HDW-3903-01.MIN** — Seq: OD rough (hand-coded single-pass) → center-drill → `G74` drill → endmill (`G4` dwell) → boring bar longhand → cutoff. **BUG: station `T030303` reused for both center-drill AND endmill** (op-name `NAT03` collision).
9. **JM DIE/CASE-OD1748-ID867-A.MIN** — **Cleanest full flow**: OD rough `G85/G81` → center-drill → drill (.843, `M41/M42`) → OD finish `G87` → ID rough `G85/G81` → ID finish `G87` → cutoff. CSS+G50 (cap800) on all cutting. Canonical reference program.
10. **OPTIMAS/T-2APCP-12-1.MIN** — Seq: OD rough `G85/G81` → center-drill → spade-drill → `G74` peck → endmill dwell → OD finish `G87` → ID bore `G85/G81` **then redundant inline longhand finish** (no `G87`) → cutoff (`M77/M76` part-catcher). G50 S1500 cap.
11. **OMG/9096509.MIN** — **Best CSS engagement pattern**: `G0 G96 X.. Z.. S340` engages CSS on the positioning line. OD rough `G85/G81` → OD finish `G87` → center-drill → drill → ID rough `G85/G81` → ID finish `G87` → cutoff. Tight, idiomatic.
12. **QUALITY FORM/Q55139-B.MIN** — Secondary-op fragment (starts NAT12, no bar framing): OD rough hand-coded → ID bore **hand-coded 2-pass longhand, on G97 direct-rpm** (CSS would finish better). No cutoff.
13. **TCR/T4801-60-20145.MIN** — Seq: complex multi-arc OD rough `G85/G81` → OD finish (**hand-coded longhand, no G87**) → 3rd op longhand re-trace. G50 S600 set in NAT01 only; later G96 re-engaged with **no fresh G50 cap** (relies on modal persistence — fragile).
14. **AKKO/HB-014-153-B.MIN** — Seq: OD+face rough (hand-coded) → ID rough-bore `G85 NBORE/G81` with `G76` **corner-radius** move + G41 → ID finish `G87`. Confirms G76 = chamfer, not thread.
15. **ALCOA/A100-A-0627.MIN** — Seq: OD rough `G85/G81` → OD finish `G87` → **thread 1¾-12 via `G72 …B60 D.003 H.085 F1. J12`** → **thread 2⅜-8 via `G71 …B60 H.130 F1. J12`** → cutoff. Confirms G71/G72 = threading cycles on this OSP. (Note `M30` mid-program before cutoff — likely an edit artifact / sub-program reuse.)
16. **AIR/A0907-55-03.MIN** — Seq: OD rough (hand-coded single-pass) → center-drill → `G74` peck-drill .166 → cutoff. CSS+G50 on turn+cutoff, G97 on drill. Clean small part.

## Inefficiency signals observed
1. **Hand-coded longhand finish passes where `G87` reuse fits** — recurring: HEADER (OD finish), TCR (OD finish), QUALITY FORM (ID bore), ELITE (boring bar), FONTANA (ID finish), OPTIMAS (redundant inline ID finish after a clean `G85` rough). The shop already *defines* the LAP shape for roughing; finishing it with longhand instead of `G87 N<shape>` doubles the geometry code, invites a rough/finish profile mismatch, and forgoes the cycle's automatic tool-nose-radius handling.
2. **Cutoff/groove done as repeated longhand "nibble" passes** — HEADER NAT11 = 8 identical Z-stepped peck-grooves coded by hand; similar multi-step cutoff in several CLENDENIN/FONTANA programs. A `G74`/`G75` groove cycle (peck-groove) would collapse 30+ lines to one and standardize the peck/retract.
3. **`G96` without a `G50` cap (42 files)** + modal-cap reliance (TCR re-engages `G96` in later ops with no fresh `G50`). On small-OD or near-centerline cutoff, uncapped CSS commands runaway rpm → spindle/safety hazard. This is the single highest-severity signal even though it's a minority.
4. **Single-pass hand-coded OD rough where a `G85` rough cycle belongs** — ITW, AIR, CLENDENIN, AKKO rough a meaningful Z-length in one `G1` pass at roughing feed. No stepped DOC = high cutting force, deflection on slender stock, poor chip control; a `G85 D<doc>` multi-pass is both safer and faster.
5. **Conservative / non-aggressive roughing** — typical OD rough DOC `D.05–.12"` and feed `F.005–.016 ipr`; no high-feed-machining strategy (no light-DOC/high-feed trades). CSS values cluster at **S200–S350 sfm** for steel — defensible for HSS-grade inserts but conservative for modern coated carbide. No adaptive/trochoidal anything (expected — turning).
6. **Turret-station collisions / redundant tool calls** — ITW reuses `T030303` for two different tools (center-drill + endmill); several programs reload the SAME `T0n0n0n` at program end as a "park" call (`NAT01 / T010101 / M2`). Harmless but noisy; a real station collision (ITW) is a setup-sheet error risk.
7. **Air-cutting / oversized clearance retracts** — near-universal `G0 X20 Z20` (and `X50 Z20`) park between every op. Safe, but for tight multi-op parts the retract envelope is far larger than needed → cumulative non-cut rapid time. Some programs also `G0` to a far park *and back* between sub-passes within one tool.
8. **Coolant left implicitly on (720 files M8-no-M9)** — relies on the next tool-change/`M2` to drop coolant; acceptable on OSP but not explicit.

## Optimization opportunities
1. **Auto-promote longhand finish → `G87 N<shape>`** when a `G85`-roughed LAP shape already exists for the same profile. PRISM can detect "rough cycle defined NTURN/NBORE, finish op re-codes the same XZ contour by hand" and rewrite to a one-line `G87` reuse. Highest-frequency, lowest-risk win (touches ELITE/HEADER/TCR/FONTANA/QUALITY-FORM/OPTIMAS class).
2. **Collapse hand-coded cutoff/groove nibbling → `G74`/`G75` peck-groove cycle** with explicit peck `D` and retract `L`. Standardizes chip-breaking on parting and removes the 8-pass longhand class (HEADER pattern).
3. **Enforce `G50` immediately before every `G96`** (units-aware rpm clamp from OD + machine max). Make uncapped-CSS a hard safety lint (catches the 42 uncapped files + modal-reliance like TCR). This is a safety+correctness gate, not just efficiency.
4. **Multi-pass `G85` roughing for single-pass hand-coded OD rough** — when a `G1`-only rough removes >~0.060" radial over appreciable Z, recommend a `G85 D<doc>` stepped cycle sized from material/insert (lower force, better finish-stock control).
5. **Feed/speed uplift via PRISM SFC** — the corpus roughing is conservative (S200–350 sfm steel, F.005–.016 ipr). A material+insert-grade-aware recommendation (Kienzle/Taylor from `constants.ts`) can raise CSS and feed within tool-life/finish bounds; biggest cycle-time lever on the workhorse OD/ID turning ops.
6. **Confirm + assert feed-per-rev as the Okuma default (relevant to task #43 / U-CAM-FEEDREV-MODE-DEFAULT)** — 91% of programs declare neither `G94`/`G95`, yet feeds read as IPR (`F.0015–.016`) consistent with **modal G95 feed-per-rev** being the OSP default. PRISM's generator/validator should treat these inch feeds as **per-rev** unless `G94` is explicitly present (only 139 files), and emit feeds in IPR. Misreading them as feed/min would be a gross feed error.
7. **Trim retract envelope / reduce air time** — replace blanket `G0 X20 Z20` parks with computed safe-clearance retracts per fixture, and remove redundant within-tool park-and-return rapids. Modest per-part savings, large in aggregate over JM's bar-fed volume.
8. **Setup-sheet / station-collision lint** — flag any program that assigns the same `T<station>` to two different physical tools (ITW class) before it reaches the floor.
