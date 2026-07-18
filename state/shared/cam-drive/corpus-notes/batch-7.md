# Profiler Shard 7 — JM Die Okuma OSP CNC Lathe (.MIN) Corpus Analysis

> Shard rule: zero-based line index % 8 == 7 of `_filelist.txt` (16,558 lines total).
> All values treated as **INCH** (JM Die = inch shop, Okuma OSP-P control, G20). No metric conversion applied.

## Shard 7 — file count

- **2,069 files** in shard (all present on disk, 0 missing).
- 2,068 contained at least one tool call; 1 file had none parseable.
- Top vendors in shard: OMG (347), NATHANS USB (222), FONTANA (117), ITW (113), OPTIMAS (90), ATF (87), HPFS (55), AIR (54), HOLO-KROME (52), VALLEY (45), TCR (41), ELECTRODE (41), GRANDEUR (76 across two folders), plus AGRATI/ACME/SEMS/HEADER/AKKO/WHITESELL/CSM/STALCOP/EJOT and others.

## Structural census (counts)

Counts are **# of files containing the code** (word-boundary matched) across all 2,069 shard files.

| Code | Files | Meaning / note |
|------|------:|----------------|
| **G96** (CSS) | 1,920 | Constant surface speed — present in ~93% of programs, but predominantly only at the **cutoff/parting** operation (NAT11), not for the OD turning passes. |
| **G97** (direct RPM) | 1,965 | ~95% — the **dominant spindle mode for turning/drilling/grooving**. Most ops run fixed RPM (e.g. `G97 S600 M3`), CSS reserved for parting. |
| **G50** (max-RPM cap) | 2,011 | ~97% — appears almost universally as `G50 Sxxxx` (e.g. `G50 S800`/`S1000`/`S1250`). 1,873 files have **both G96 + G50** (CSS *with* mandatory cap). Strong, disciplined CSS-cap practice. |
| **G94** (feed/min) | 157 | Only ~8% — and these are almost entirely the **C-axis live-tool milling** blocks (`G94 SB=1200`), NOT turning feed. |
| **G95** (feed/rev) | 217 | Explicitly stated in ~10%; the rest rely on the **Okuma OSP implicit per-rev default** (F values 0.001–0.009 in/rev throughout). |
| G70 (Fanuc finish) | 0 | **Not used** — Okuma idiom differs (see G87 below). |
| G71 | 68 | On Okuma OSP this is the **threading cycle** (e.g. `G71 X.290 Z-1.07 B60 D.003 U.001 H.078 F1.`), confirmed by 58 THREAD comments — NOT Fanuc roughing. |
| G72 | 0 | Not used. |
| G73 | 0 | Not used. |
| **G74** (peck drill / groove) | 532 | ~26% — peck drilling and deep plunge (`G74 X0 Z-2.2 D.25 L.25 F.002`). |
| G75 | 0 | Not used (grooving done via G74 plunge or G85/G82 LAP). |
| **G76** | 132 | ~6%. |
| G33 longhand thread | 0 | None — all threading via G71 cycle. |

### Okuma OSP-specific cycle vocabulary (the real roughing/finishing idiom)

| Code | Files | Meaning |
|------|------:|---------|
| **G85** (LAP rough cycle) | 1,513 | **The primary OD/ID roughing cycle** — `G85 N<name> D<doc> U<x-stock> W<z-stock> F<feed>` then a `N<name> G81` shape definition. This is Okuma's equivalent of the Fanuc G71 rough loop. |
| **G81** (LAP shape def) | 1,432 | Defines the finish profile referenced by the G85 rough and the G87 finish. |
| **G87** (LAP finish recall) | 1,443 | **Finish pass** — re-runs the G81-defined profile at finish stock (`G87 NTURN`). Okuma's equivalent of Fanuc G70. |
| **G80** (cycle cancel) | 1,516 | Closes the LAP block. |
| **NAT## named ops** | 2,067 | Every program is organized as named operation sequences `NAT01 (RGH. OD)`, `NAT02 (FIN)`, ... `NAT11 (CUTOFF)`. |
| **NR##/NTURN refs** | 523 | Named subroutine labels tying G85 rough ↔ G87 finish to one shape. |
| **NBAR macro** | 1,148 | Bar-feeder advance macro (`/CALL OBAR`, `/GOTO NBAR`) — bar-fed production. |

### Tool changes / coolant / threading / parting

- **Tools per program: mean 5.27**, mode **6** (436 programs), typical band **4–7** (1,818 of 2,068 programs fall in 3–8 tools). Range 1–11.
- Tool-call form is Okuma `T010101`, `T020202` (geometry/offset pairs); live-tool milling uses 4-digit `T0404`.
- **M8 coolant-on: 2,011 files (~97%)**; M9 coolant-off: 1,322 (often deferred to end / cutoff only).
- **Threading: 68 programs** (G71 cycle, full lead/depth params).
- **Parting/cutoff: 853 files** carry PART/CUTOFF text; the canonical NAT11 cutoff block is near-universal (CSS `G96 S100–S250` + `G50 S600–S800` cap + plunge `G1 X-.04 F.0015`).
- **Live-tool C-axis milling present in 154 files** (`M110`/`G138` polar, `G94 SB=` rotary-tool spindle, M12/M15 indexing).
- High-spindle-range gear (M41/M42/M43): 571 files.

## Per-program structural notes (sampled)

End-to-end reads of representative programs across vendors/sizes:

1. **AGRATI/9082526.MIN** — Seq: RGH OD (G85 NRTURN + G81 longhand profile) → CENTER → DRILL (G74 peck) → ENDMILL (G74 + G4 dwell) → bore-bar ID (G85 NR01/NR02). CSS-cap `G50 S800` present; G97 fixed RPM per op; per-rev feeds (F.006 rough / F.002 ID). Clean LAP usage.
2. **ATF/T2534-114-1D.MIN** (6 tools) — Face → OD rough G85 NTURN (with G42 cutter-comp, G3 lead-in radius A135 chamfer) → FIN G87 NTURN (G41) → center → G74 drill → back-profile → **cutoff NAT11 with G96 S100 + G50 S800**. Textbook rough/finish pairing via one G81 shape. CSS only at part-off.
3. **FONTANA/B-2094022-33.MIN** (long shaft) — Two-zone turning: NAT01 rough G85 NR01 + NAT02 finish G87 NR01 on front; then NAT21 rough G85 NR02 + NAT22 finish G87 NR02 on a second Z-zone, with a 35° form tool NAT04 between. Cutoff G96 S100/G50 S800. Demonstrates re-using the same tool (T010101) for two rough zones — efficient.
4. **FONTANA/B-8740-ITEM-3.MIN** — Notable: NAT09/NAT10 are **hand-coded longhand multi-pass OD roughing** (explicit per-pass G0/G1 X/Z lines stepping the profile) instead of a G85 LAP cycle — an outlier; rough+finish here is fully expanded longhand. Uses mid-op CSS switch (`G96 S250` after a G97 spin-up). Cutoff with chamfer (G3 break) before part-off.
5. **HPFS/HPFS872-750-CROWN.MIN** (7 tools) — Face (G97→G96 S250 mid-op) → center → DRILL .484 → bore (with G4 dwell) → BB 1/4 → BB 3/8 (.015R) → cutoff. Many ID/bore steps; no LAP cycle here — straight G1 profiling. CSS-cap at cutoff only.
6. **AIR/A0764-64-01.MIN** (151 lines, full-featured) — Rough G85 NR01 + finish G87 NTURN → OD groove (G1 plunge + G4 F3. dwell) → **THREAD 3/8-24 via G71 X.290 Z-1.07 B60 D.003 U.001 H.078 F1.** → **live-tool flat-endmill milling** (NAT04/NAT05, G138 polar + G94 SB=1200 + C-axis arcs) → cutoff with A225 chamfer. Most complete op vocabulary in the sample.
7. **AGRATI/A9086855.MIN** — Face → center → DRILL .453 → **face-groove rough G85 NR02 + G82 (face LAP) + finish G87 NR02** → ID bore → cutoff. Shows G82 (face direction LAP) vs G81 (longitudinal).

**Universal skeleton** observed in ~95% of programs:
```
$<name>%  → M1 → NBAR/DEF WORK/DRAW → /CALL OBAR        (bar-feed setup)
NAT01 (RGH): G0 X20 Z20 (safe) → Txxxxxx → G50 Sxxxx → G97 Sxxx M3 → G0 ...M8
            → face → G85 N.. D.. U.. W.. F.. / N.. G81 <profile> / G80
NAT02 (FIN): G87 N..   (re-run shape at finish stock)
NAT0n: center / drill (G74) / bore / groove / thread (G71) / live-mill
NAT11 (CUTOFF): G96 Sxxx M3 → G50 Sxxx → plunge G1 X-.04 F.0015 → G0 X2 M9
→ M5 → /GOTO NBAR → M2/M30
```

## Inefficiency signals observed

1. **CSS (G96) under-used on turning passes.** Despite G96 appearing in 93% of files, it is mostly confined to the parting/cutoff op. The bulk of OD/ID **roughing and finishing runs fixed-RPM G97**, which leaves surface-speed (and thus tool life + finish) sub-optimal as diameter changes — especially on the face cuts (`G1 X-.04`) where surface speed collapses to zero at center under G97. CSS+G50 belongs on every facing/profiling pass, not just cutoff.
2. **Repeated `G0 X20 Z20` full-retract between every op.** Every NAT block opens and closes by rapiding the turret to the far safe point X20/Z20. With 5–7 tools/program that is 10–14 long index rapids per part — significant **air-cutting / non-cut time** on bar-fed high-volume work. Many indexes could retract to a tighter, part-specific clearance plane.
3. **Hand-coded longhand roughing where a LAP cycle fits** (e.g. FONTANA/B-8740-ITEM-3 NAT09/NAT10, and the explicit-profile G81 bodies in several AGRATI/HPFS files). Longhand multi-pass profiles are error-prone, hard to re-feed/re-DOC, and bypass the controller's optimized LAP retract logic vs `G85/G87`.
4. **Conservative single-value feeds / DOC, not material-matched.** Feeds cluster tightly (F.005 rough, F.002–.003 profile, F.0015 cutoff) **regardless of vendor/material** — the same F.005/F.007 rough appears on aluminum-class and steel-class parts alike. No evidence of per-material speed/feed differentiation; roughing DOC (G85 D-values .05–.1") is modest and uniform.
5. **CSS cutoff capped low + slow plunge.** Part-off runs `G96 S100–S150` with `F.001–.0015` — safe but on the slow side; combined with the universal cap this is conservative cycle time on the most-repeated operation.
6. **Coolant left on across whole program; M9 only at end.** M8 fires at op 1, M9 only at cutoff in many files — fine for wet running, but no per-op coolant strategy.
7. **Occasional missing finish-pass lead-in/cutter-comp.** Several finish ops (G87) inherit comp from the G81 body, but some longhand finish blocks (HPFS bores) cut straight to size with no spring/lead-in pass.

## Optimization opportunities

1. **Promote G96 CSS + mandatory G50 cap to ALL facing and profiling passes**, not just cutoff. Biggest lever: facing under G97 wastes surface speed near center; CSS would lift MRR + finish + tool life on the dominant rough/finish ops. The G50 discipline is already excellent (97% coverage) — extend the CSS it protects.
2. **Tighten inter-op retract / clearance planes.** Replace blanket `G0 X20 Z20` indexing with part-scoped safe planes (turret-collision-checked). On 5–7-tool bar work this directly cuts non-cut time across thousands of parts.
3. **Convert remaining longhand roughing/finishing to G85 + G81/G82 + G87 LAP cycles.** Standardize the rough↔finish pairing so feeds/DOC/stock are single-sourced and re-optimizable; the corpus already proves the shop knows the idiom (73% use G85) — close the gap on the longhand outliers.
4. **Material-aware speed/feed + DOC.** Introduce per-material (and per-vendor part-family) feed/speed/DOC tables instead of the near-constant F.005/F.002/F.0015 set; enable high-feed roughing where the machine/holder allows. This is the highest-value PRISM contribution: the corpus shows uniform conservative values that leave cycle time on the table.
5. **Speed up the universal cutoff** with material-matched CSS and plunge feed (within blade L/t chatter + stress-to-yield limits) — it is the single most-repeated op (853+ cutoff blocks) so small per-part savings compound massively on bar production.
6. **Encode the NAT##/NBAR skeleton as a PRISM Okuma OSP template** (face → G85 rough → G87 finish → G74 drill → G71 thread → live-mill → NAT11 cutoff, with `/CALL OBAR` bar loop) so generated programs match shop convention out of the box, including the G50-cap-everywhere rule.
