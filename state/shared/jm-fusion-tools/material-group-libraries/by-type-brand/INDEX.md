# JM Die -- Tooling Library: MATERIAL -> TYPE -> BRAND

> Per-material-group, per-tool-type, per-brand importable Fusion libraries.
> Each leaf CSV is a valid `CSV_TOOLS_VERSION_1` file (same header Fusion imports);
> its rows carry that material group's SFC-physics-optimal cutting preset (see ../README.md).
> Path layout: `by-type-brand/<ISO>/<tool-type>/<brand>.csv`. A blank tool vendor files
> under `unspecified` (never dropped); a blank type under `unknown-type`.

| Material | Tool type | Brand | Tools | File |
|----------|-----------|-------|------:|------|
| H | bull nose end mill | (unspecified) | 5 | by-type-brand/H/bull-nose-end-mill/unspecified.csv |
| H | center drill | (unspecified) | 1 | by-type-brand/H/center-drill/unspecified.csv |
| H | drill | (unspecified) | 110 | by-type-brand/H/drill/unspecified.csv |
| H | drill | YG-1 | 2 | by-type-brand/H/drill/yg-1.csv |
| H | spot drill | (unspecified) | 3 | by-type-brand/H/spot-drill/unspecified.csv |
| K | bull nose end mill | (unspecified) | 10 | by-type-brand/K/bull-nose-end-mill/unspecified.csv |
| K | center drill | (unspecified) | 2 | by-type-brand/K/center-drill/unspecified.csv |
| K | drill | (unspecified) | 298 | by-type-brand/K/drill/unspecified.csv |
| K | drill | YG-1 | 4 | by-type-brand/K/drill/yg-1.csv |
| K | spot drill | (unspecified) | 6 | by-type-brand/K/spot-drill/unspecified.csv |
| K | turning boring | (unspecified) | 56 | by-type-brand/K/turning-boring/unspecified.csv |
| K | turning general | (unspecified) | 22 | by-type-brand/K/turning-general/unspecified.csv |
| K | turning general | ISCAR | 12 | by-type-brand/K/turning-general/iscar.csv |
| K | turning grooving | (unspecified) | 22 | by-type-brand/K/turning-grooving/unspecified.csv |
| K | turning threading | (unspecified) | 4 | by-type-brand/K/turning-threading/unspecified.csv |
| M | bull nose end mill | (unspecified) | 15 | by-type-brand/M/bull-nose-end-mill/unspecified.csv |
| M | center drill | (unspecified) | 3 | by-type-brand/M/center-drill/unspecified.csv |
| M | drill | (unspecified) | 447 | by-type-brand/M/drill/unspecified.csv |
| M | drill | YG-1 | 6 | by-type-brand/M/drill/yg-1.csv |
| M | spot drill | (unspecified) | 9 | by-type-brand/M/spot-drill/unspecified.csv |
| M | turning boring | (unspecified) | 84 | by-type-brand/M/turning-boring/unspecified.csv |
| M | turning general | (unspecified) | 33 | by-type-brand/M/turning-general/unspecified.csv |
| M | turning general | ISCAR | 18 | by-type-brand/M/turning-general/iscar.csv |
| M | turning grooving | (unspecified) | 33 | by-type-brand/M/turning-grooving/unspecified.csv |
| M | turning threading | (unspecified) | 6 | by-type-brand/M/turning-threading/unspecified.csv |
| N | drill | (unspecified) | 111 | by-type-brand/N/drill/unspecified.csv |
| P | bull nose end mill | (unspecified) | 15 | by-type-brand/P/bull-nose-end-mill/unspecified.csv |
| P | center drill | (unspecified) | 3 | by-type-brand/P/center-drill/unspecified.csv |
| P | drill | (unspecified) | 447 | by-type-brand/P/drill/unspecified.csv |
| P | drill | YG-1 | 6 | by-type-brand/P/drill/yg-1.csv |
| P | spot drill | (unspecified) | 9 | by-type-brand/P/spot-drill/unspecified.csv |
| P | turning boring | (unspecified) | 84 | by-type-brand/P/turning-boring/unspecified.csv |
| P | turning general | (unspecified) | 33 | by-type-brand/P/turning-general/unspecified.csv |
| P | turning general | ISCAR | 18 | by-type-brand/P/turning-general/iscar.csv |
| P | turning grooving | (unspecified) | 33 | by-type-brand/P/turning-grooving/unspecified.csv |
| P | turning threading | (unspecified) | 6 | by-type-brand/P/turning-threading/unspecified.csv |
| S | bull nose end mill | (unspecified) | 10 | by-type-brand/S/bull-nose-end-mill/unspecified.csv |
| S | center drill | (unspecified) | 2 | by-type-brand/S/center-drill/unspecified.csv |
| S | drill | (unspecified) | 220 | by-type-brand/S/drill/unspecified.csv |
| S | drill | YG-1 | 4 | by-type-brand/S/drill/yg-1.csv |
| S | spot drill | (unspecified) | 6 | by-type-brand/S/spot-drill/unspecified.csv |

_Total: 41 (material x type x brand) libraries, 2218 preset rows. U-TOOLDB-MAT-TYPE-BRAND (slot:romeo)._
