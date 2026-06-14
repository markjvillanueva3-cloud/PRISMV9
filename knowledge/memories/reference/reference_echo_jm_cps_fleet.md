---
name: reference_echo_jm_cps_fleet
description: The 12 JM Die .cps post-processors + their 4 production controllers (post-processor galaxy / slot echo)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.092Z
aliases: reference_echo_jm_cps_fleet
---


JM Die's post fleet lives at `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/` — 12 `.cps` (10 unique + 2 `*2.cps` backups). Four controllers in production:

- **Haas Classic** — HAAS_VF2 iMachining (var-feed 8-level, G187 smooth, M8/M88/M89 coolant)
- **Hurco WinMAX (MAX5)** — VM30i v8.9 / v10.9-DRILLFIX / v11 / PRISM-Master (G05.3 smooth, UltiMotion G64, M98 sub); JM's lead post = `HurcoV11MillMasterPostEngine.ts` (92K)
- **Okuma OSP-P300** — M460V-5AX (5-ax TCP G169/G170, Super NURBS G131), GENOS L400II lathe, LB3000 mill-turn (G137 polar/G138 Y), Multus B250IIW (most feature-rich: HSM G132, CAS, TCP G255/G254)
- **Fanuc 31i** — Roku-Roku (AICC II G05.1 Q1, Nano smooth)

**Wire-EDM post is ABSENT** — must generate via `WEDMPostMitsubishiEngine.ts` (Mitsubishi FA10S). Full feature-gap matrix: `state/shared/specs/POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md` §2/§4. See [[reference_echo_controller_dialect_matrix]], [[reference_echo_masterpost_engine_surface]].
