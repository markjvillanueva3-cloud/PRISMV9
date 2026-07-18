---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/wedm_shop_programs.md
source_filename: wedm_shop_programs.md
content_hash: 516fa88672aaa584d5d94d87ad63d050fb2248be9f72eaa0c8e31a2fe63375a9
mirror_ts: 2026-05-05T13:00:09.566Z
mirror_engine: ObsidianMemorySyncEngine
---

## Location
`C:\Users\wompu\Box\WIRE EDM\` — ~140 customer folders with .mcx-8 (Mastercam) and .NC/.MIN (G-code) files

## Key Programs Analyzed

### 1. ITW SHAKEPROOF 500-30540-24000-04.NC
- **Controller:** Mitsubishi
- **Profiles:** 2 (hex + circle), 4 passes each
- **H-offsets (inches):** H1=0.0085, H2=0.0064, H3=0.0058, H4=0.0053
- **E-pack codes:** E1221, E1222, E1223, E1224
- **Feed rates (in/min):** 0.12 (rough), 0.24, 0.21, 0.20 (skims FASTER than rough)
- **Features:** G42/G41 alternating, G2/G3 hex arcs, M01 glue stop, full Sodick M-codes

### 2. NOZE TEST.NC
- **Controller:** Mitsubishi
- **Profiles:** 1 (capsule/oblong), 5 passes with UV taper
- **H-offsets:** All 0.0000 (via H175 master)
- **E-pack codes:** E2821-E2825
- **Feed rates (in/min):** 0.16, 0.23, 0.26, 0.30, none (final spark-out)
- **Features:** UV coordinates every line (taper), M90/M91 adaptive control, G4 dwell

## Mitsubishi M-codes (from real programs)
M20=Thread Wire, M21=Cut Wire, M78=Fill Tank, M58=Drain Tank,
M80=Water On, M81=Water Off, M82=Wire On, M83=Wire Off,
M84=Power On, M85=Power Off, M90=Adaptive On, M91=Adaptive Off, M01=Glue Stop

## Program sequence (per profile, per pass):
M78+M78 (Fill) → M80 (Water) → M82 (Wire) → M84 (Power) → E####_H#_F (tech+offset+feed) → G42/G41 (comp) → cutting → G40 (cancel)
End: M85+M83+M81 (OFF) → M21 (Cut Wire) → M58 (Drain) → M02 (End)

## Key findings from real programs:
- Skim feeds FASTER than rough (2× ratio typical)
- Pass 3 alternates G41/G42 direction (error averaging)
- M01 glue stop between rough and skims for slug retention
- H-offsets decrease: 0.216→0.163→0.147→0.135mm (for 0.25mm wire)
- Final offset still > wire radius (0.125mm) — spark gap ~10µm

## MCX-8 Binary Reading (PROVEN)
- MCX-8 files have proprietary header (0x98000000) but embedded readable strings + IEEE 754 doubles
- String extraction: machine type, controller, wire type, material, tech table, post processor, NCI path
- Float extraction: pass offset + feed rate stored as float64 at structured positions in binary
- Cross-validated: 4/4 pass params from MCX-8 binary match NC program exactly
- Reader built: `src/utils/mcx8-reader.ts` (metadata) + Python float scanner (pass data)
- Limitation: byte offsets for pass data vary per file; need pattern-matching heuristic for batch

## How to apply
Compare PRISM's Mitsubishi dialect against these for: M-code sequence, offset progression,
E-pack format, feed rate ratios, G42/G41 alternation, glue stop placement.
MCX-8 files in Box Drive (~500 files, 140 customers) can be mined for metadata + pass parameters.
