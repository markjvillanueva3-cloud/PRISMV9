# PRISM Bridge Graph — exhaustive cross-domain wire-and-bridge map

**Generated:** 2026-05-24T23:46:51.581Z
**Source:** H:\PRISM\state\shared\system-viz\system-graph.json (283,001 nodes / 988,034 edges, read 5566ms)
**Cohort:** 69,386 nodes across L5–L8
**Domains discovered:** 28

> **Advisory only — Advisory map only. Each bridge candidate must be human-verified before wiring — domain inference is regex-based and may mis-classify; high-leverage may indicate intentional non-connection.**

## Domain rollup

| Domain | Total | Built | Ghost | Layers |
|---|---:|---:|---:|---|
| learning | 17889 | 13141 | 4748 | L5:184 L6:405 L7:7 L8:17293 |
| cam | 9959 | 6579 | 3380 | L5:380 L6:489 L7:42 L8:9048 |
| cad | 6718 | 5030 | 1688 | L5:417 L6:1166 L7:13 L8:5122 |
| erp | 5957 | 5208 | 749 | L5:225 L6:370 L7:4 L8:5358 |
| ai | 4311 | 3389 | 922 | L5:328 L6:567 L7:10 L8:3406 |
| other | 4194 | 3909 | 285 | L5:2157 L6:1633 L7:27 L8:377 |
| lathe | 3655 | 2770 | 885 | L5:276 L6:432 L7:7 L8:2940 |
| wedm | 2712 | 2193 | 519 | L5:274 L6:477 L7:8 L8:1953 |
| mill | 2660 | 2011 | 649 | L5:194 L6:366 L7:12 L8:2088 |
| dispatcher | 2453 | 508 | 1945 | L5:110 L6:330 L7:14 L8:1999 |
| test | 1752 | 1651 | 101 | L5:64 L6:1586 L8:102 |
| tooling | 1454 | 1098 | 356 | L5:117 L6:184 L7:4 L8:1149 |
| physics | 1246 | 1009 | 237 | L5:146 L6:312 L7:1 L8:787 |
| hook | 824 | 791 | 33 | L5:73 L6:707 L7:7 L8:37 |
| material | 708 | 556 | 152 | L5:74 L6:118 L7:3 L8:513 |
| safety | 598 | 412 | 186 | L5:86 L6:81 L8:431 |
| quote | 485 | 344 | 141 | L5:42 L6:53 L7:4 L8:386 |
| business | 382 | 119 | 263 | L5:51 L6:71 L8:260 |
| grinder | 222 | 161 | 61 | L5:31 L6:20 L8:171 |
| 5axis | 212 | 144 | 68 | L5:17 L6:22 L8:173 |
| shop | 177 | 152 | 25 | L5:40 L6:105 L7:1 L8:31 |
| nn | 166 | 146 | 20 | L5:60 L6:82 L7:2 L8:22 |
| session | 163 | 153 | 10 | L5:33 L6:117 L8:13 |
| build | 145 | 141 | 4 | L5:14 L6:127 L8:4 |
| devops | 142 | 123 | 19 | L5:53 L6:67 L8:22 |
| sinker | 108 | 76 | 32 | L5:15 L6:17 L8:76 |
| benchmark | 50 | 46 | 4 | L5:25 L6:12 L7:1 L8:12 |
| swiss | 44 | 44 | 0 | L5:8 L6:7 L8:29 |

## Top 30 cross-DOMAIN bridge candidates (by leverage, descending)

Leverage = √(builtA × builtB) × (1 − connectivityRatio). High score = many nodes both sides, few connecting edges.

| # | Domain A | Domain B | Built A | Built B | Edges | Max | Connectivity | Gap | Leverage |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | **cam** | **learning** | 6579 | 13141 | 9691 | 86454639 | 0.0% | 86444948 | 9297.06 |
| 2 | **erp** | **learning** | 5208 | 13141 | 8049 | 68438328 | 0.0% | 68430279 | 8271.77 |
| 3 | **learning** | **cad** | 13141 | 5030 | 7162 | 66099230 | 0.0% | 66092068 | 8129.26 |
| 4 | **learning** | **ai** | 13141 | 3389 | 8311 | 44534849 | 0.0% | 44526538 | 6672.2 |
| 5 | **lathe** | **learning** | 2770 | 13141 | 4379 | 36400570 | 0.0% | 36396191 | 6032.56 |
| 6 | **erp** | **cam** | 5208 | 6579 | 54 | 34263432 | 0.0% | 34263378 | 5853.49 |
| 7 | **cam** | **cad** | 6579 | 5030 | 291 | 33092370 | 0.0% | 33092079 | 5752.55 |
| 8 | **learning** | **wedm** | 13141 | 2193 | 3231 | 28818213 | 0.0% | 28814982 | 5367.66 |
| 9 | **mill** | **learning** | 2011 | 13141 | 3092 | 26426551 | 0.0% | 26423459 | 5140.07 |
| 10 | **erp** | **cad** | 5208 | 5030 | 168 | 26196240 | 0.0% | 26196072 | 5118.19 |
| 11 | **cam** | **ai** | 6579 | 3389 | 125 | 22296231 | 0.0% | 22296106 | 4721.86 |
| 12 | **learning** | **test** | 13141 | 1651 | 217 | 21695791 | 0.0% | 21695574 | 4657.83 |
| 13 | **lathe** | **cam** | 2770 | 6579 | 111 | 18223830 | 0.0% | 18223719 | 4268.91 |
| 14 | **erp** | **ai** | 5208 | 3389 | 293 | 17649912 | 0.0% | 17649619 | 4201.11 |
| 15 | **ai** | **cad** | 3389 | 5030 | 167 | 17046670 | 0.0% | 17046503 | 4128.72 |
| 16 | **cam** | **wedm** | 6579 | 2193 | 37 | 14427747 | 0.0% | 14427710 | 3798.38 |
| 17 | **lathe** | **erp** | 2770 | 5208 | 89 | 14426160 | 0.0% | 14426071 | 3798.16 |
| 18 | **tooling** | **learning** | 1098 | 13141 | 1953 | 14428818 | 0.0% | 14426865 | 3798.01 |
| 19 | **lathe** | **cad** | 2770 | 5030 | 11 | 13933100 | 0.0% | 13933089 | 3732.7 |
| 20 | **physics** | **learning** | 1009 | 13141 | 1502 | 13259269 | 0.0% | 13257767 | 3640.92 |
| 21 | **mill** | **cam** | 2011 | 6579 | 231 | 13230369 | 0.0% | 13230138 | 3637.29 |
| 22 | **erp** | **wedm** | 5208 | 2193 | 90 | 11421144 | 0.0% | 11421054 | 3379.49 |
| 23 | **cad** | **wedm** | 5030 | 2193 | 70 | 11030790 | 0.0% | 11030720 | 3321.24 |
| 24 | **cam** | **test** | 6579 | 1651 | 323 | 10861929 | 0.0% | 10861606 | 3295.65 |
| 25 | **erp** | **mill** | 5208 | 2011 | 59 | 10473288 | 0.0% | 10473229 | 3236.23 |
| 26 | **hook** | **learning** | 791 | 13141 | 3 | 10394531 | 0.0% | 10394528 | 3224.05 |
| 27 | **mill** | **cad** | 2011 | 5030 | 48 | 10115330 | 0.0% | 10115282 | 3180.45 |
| 28 | **lathe** | **ai** | 2770 | 3389 | 49 | 9387530 | 0.0% | 9387481 | 3063.89 |
| 29 | **erp** | **test** | 5208 | 1651 | 229 | 8598408 | 0.0% | 8598179 | 2932.23 |
| 30 | **test** | **cad** | 1651 | 5030 | 413 | 8304530 | 0.0% | 8304117 | 2881.61 |

## Top 30 cross-LEVEL bridge candidates (same domain, different layers)

These are nodes within the SAME domain but at different /system-viz layers that are not yet edge-connected. High leverage = same-domain knowledge that should flow across L5 (engines) ↔ L6 (algorithms) ↔ L7 (wiki) ↔ L8 (memories).

| # | Domain | Layer A | Layer B | Built A | Built B | Edges | Max | Connectivity | Gap | Leverage |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | **learning** | L8 | L6 | 12547 | 405 | 520 | 5081535 | 0.0% | 5081015 | 2254 |
| 2 | **cad** | L6 | L8 | 1163 | 3435 | 0 | 3994905 | 0.0% | 3994905 | 1998.73 |
| 3 | **cam** | L6 | L8 | 453 | 5704 | 0 | 2583912 | 0.0% | 2583912 | 1607.46 |
| 4 | **learning** | L8 | L5 | 12547 | 182 | 2 | 2283554 | 0.0% | 2283552 | 1511.14 |
| 5 | **cam** | L5 | L8 | 378 | 5704 | 0 | 2156112 | 0.0% | 2156112 | 1468.37 |
| 6 | **erp** | L8 | L6 | 4610 | 370 | 0 | 1705700 | 0.0% | 1705700 | 1306.02 |
| 7 | **cad** | L5 | L8 | 416 | 3435 | 0 | 1428960 | 0.0% | 1428960 | 1195.39 |
| 8 | **ai** | L6 | L8 | 567 | 2476 | 0 | 1403892 | 0.0% | 1403892 | 1184.86 |
| 9 | **erp** | L8 | L5 | 4610 | 224 | 0 | 1032640 | 0.0% | 1032640 | 1016.19 |
| 10 | **lathe** | L6 | L8 | 431 | 2058 | 0 | 886998 | 0.0% | 886998 | 941.81 |
| 11 | **ai** | L5 | L8 | 327 | 2476 | 0 | 809652 | 0.0% | 809652 | 899.81 |
| 12 | **wedm** | L6 | L8 | 477 | 1433 | 0 | 683541 | 0.0% | 683541 | 826.77 |
| 13 | **lathe** | L5 | L8 | 274 | 2058 | 3 | 563892 | 0.0% | 563889 | 750.92 |
| 14 | **mill** | L6 | L8 | 365 | 1444 | 0 | 527060 | 0.0% | 527060 | 725.99 |
| 15 | **cad** | L6 | L5 | 1163 | 416 | 633 | 483808 | 0.1% | 483175 | 694.65 |
| 16 | **wedm** | L5 | L8 | 273 | 1433 | 11 | 391209 | 0.0% | 391198 | 625.45 |
| 17 | **mill** | L5 | L8 | 188 | 1444 | 2 | 271472 | 0.0% | 271470 | 521.03 |
| 18 | **cam** | L7 | L8 | 42 | 5704 | 633 | 239568 | 0.3% | 238935 | 488.16 |
| 19 | **ai** | L6 | L5 | 567 | 327 | 342 | 185409 | 0.2% | 185067 | 429.8 |
| 20 | **cam** | L5 | L6 | 378 | 453 | 295 | 171234 | 0.2% | 170939 | 413.09 |
| 21 | **physics** | L6 | L8 | 312 | 545 | 0 | 170040 | 0.0% | 170040 | 412.36 |
| 22 | **tooling** | L8 | L6 | 795 | 184 | 0 | 146280 | 0.0% | 146280 | 382.47 |
| 23 | **wedm** | L6 | L5 | 477 | 273 | 388 | 130221 | 0.3% | 129833 | 359.79 |
| 24 | **lathe** | L6 | L5 | 431 | 274 | 443 | 118094 | 0.4% | 117651 | 342.36 |
| 25 | **test** | L6 | L5 | 1584 | 64 | 61 | 101376 | 0.1% | 101315 | 318.2 |
| 26 | **tooling** | L8 | L5 | 795 | 115 | 17 | 91425 | 0.0% | 91408 | 302.31 |
| 27 | **learning** | L7 | L8 | 7 | 12341 | 36 | 86387 | 0.0% | 86351 | 293.79 |
| 28 | **erp** | L6 | L5 | 370 | 224 | 180 | 82880 | 0.2% | 82700 | 287.26 |
| 29 | **physics** | L5 | L8 | 145 | 545 | 0 | 79025 | 0.0% | 79025 | 281.11 |
| 30 | **learning** | L6 | L5 | 405 | 182 | 130 | 73710 | 0.2% | 73580 | 271.02 |

## Domain-internal isolation (top 30)

Built nodes in a domain with low intra-domain connectivity — bridges here improve within-domain knowledge flow.

| Domain | Built | Intra-edges | Max | Connectivity | Gap |
|---|---:|---:|---:|---:|---:|
| learning | 13141 | 34756.5 | 86336370 | 0.0% | 86301613.5 |
| cam | 6579 | 2299 | 21638331 | 0.0% | 21636032 |
| erp | 5208 | 722.5 | 13559028 | 0.0% | 13558305.5 |
| cad | 5030 | 2660.5 | 12647935 | 0.0% | 12645274.5 |
| ai | 3389 | 1351.5 | 5740966 | 0.0% | 5739614.5 |
| lathe | 2770 | 1295 | 3835065 | 0.0% | 3833770 |
| wedm | 2193 | 1108 | 2403528 | 0.1% | 2402420 |
| mill | 2011 | 826 | 2021055 | 0.0% | 2020229 |
| test | 1651 | 1555 | 1362075 | 0.1% | 1360520 |
| tooling | 1098 | 264.5 | 602253 | 0.0% | 601988.5 |
| physics | 1009 | 429.5 | 508536 | 0.1% | 508106.5 |
| hook | 791 | 307 | 312445 | 0.1% | 312138 |
| material | 556 | 99.5 | 154290 | 0.1% | 154190.5 |
| dispatcher | 508 | 199 | 128778 | 0.1% | 128579 |
| safety | 412 | 145 | 84666 | 0.2% | 84521 |
| quote | 344 | 66 | 58996 | 0.1% | 58930 |
| grinder | 161 | 42 | 12880 | 0.3% | 12838 |
| session | 153 | 23 | 11628 | 0.2% | 11605 |
| shop | 152 | 71 | 11476 | 0.6% | 11405 |
| nn | 146 | 48 | 10585 | 0.4% | 10537 |
| 5axis | 144 | 60 | 10296 | 0.6% | 10236 |
| build | 141 | 15 | 9870 | 0.1% | 9855 |
| devops | 123 | 23 | 7503 | 0.3% | 7480 |
| business | 119 | 54 | 7021 | 0.8% | 6967 |
| sinker | 76 | 10 | 2850 | 0.4% | 2840 |
| benchmark | 46 | 7 | 1035 | 0.7% | 1028 |
| swiss | 44 | 11 | 946 | 1.2% | 935 |

## How to consume this map

1. **Pick the top cross-domain bridge** with leverage ≥10. Read the 2 domains; identify 1-3 specific engines per side.
2. **Verify the bridge makes business sense** — high leverage from a regex misclassification is just noise; the operator MUST eyeball before wiring.
3. **Wire by composition, not duplication** — call the existing engine, weight its output; per [[reference_jm_die_shop_page_e2e_verified_2026_05_24]] iter22 (4 bridges into JmDieToolRecommendBridge).
4. **Register the new edge** in the system-viz graph via the REGISTER-NODE BLOCK (forge7 §4C) once wired.
5. **Re-run this script** to confirm the bridge reduced the leverage row (verification feedback loop, per [[feedback_r5_thru_r12_doctrine]] R12).

## Re-run

```bash
node H:/prism/scripts/bridge-graph-builder.mjs                      # full run
node H:/prism/scripts/bridge-graph-builder.mjs --top 30             # top 30 only
node H:/prism/scripts/bridge-graph-builder.mjs --domain lathe       # lathe-domain only
node H:/prism/scripts/bridge-graph-builder.mjs --json > out.json    # machine-readable
```

## Compounding-gains property

Per forge-audit-v2 §6A: this script IS the META artifact. A one-shot bridge audit is worthless in 30 days; this script re-runs in ~5s and produces a fresh map every time. Wire it into the goal-synergy cron for nightly regen, and `/forge7` units can consume `PRISM-BRIDGE-GRAPH.json` instead of re-deriving the graph state.