# -*- coding: utf-8 -*-
"""
Generator for C-033626 lathe programs (JM Die / Precision Form "Flattening Tool").
Emits 14 Okuma OSP .nc files (7 lathes x 2 parts) + setup sheets + fleet matrix.

Process route (operator-selected): SOFT-TURN leaving grind stock.
  - Turn from ANNEALED D2 / M2 bar with coated carbide.
  - Hold turned features +-.001/.002; leave ~.012/dia grind stock on the
    tenths-toleranced (ground) diameters.
  - Heat treat to print hardness, then OD/centerless grind + ID hone to size.
NOTHING here is a finished hardened-state program. First run = PROVE OUT.
"""
import os

OUT = r"H:/prism/state/shared/lathe-programs/C-033626"
os.makedirs(OUT, exist_ok=True)

# ---- Fleet: JM Die 7 Okuma turning centers (jm-die-profile.ts JM_DIE_CONTROLLER_MAP) ----
MACHINES = [
    # id, name, control, max_rpm(G50 clamp), workholding, bar_cap_in, woff, notes
    ("LTH-01", "Okuma GENOS L300-M",        "OSP-P300L-R",  4000, "8in 3-jaw / 1.625 collet", 2.0,  "G15 H1", "M-axis live tooling (unused here)"),
    ("LTH-02", "Okuma GENOS L200E-M",       "OSP-P200LA-R", 5000, "6in 3-jaw / .625 collet",  1.65, "G15 H1", "Best for the PIN (collet+bar). Bushing bar 1.625 EXCEEDS 1.65in bar cap -> run bushing from a chucked sawed blank."),
    ("LTH-03", "Okuma LNC8",                "OSP-U10L",     4500, "8in 3-jaw / collet",       2.0,  "ZSET",   "Older OSP-U10 control: verify G15/work-shift + feed-mode codes on prove-out."),
    ("LTH-04", "Okuma Crown L1060",         "OSP-U10L",     3800, "8-10in 3-jaw",             2.0,  "ZSET",   "Older OSP-U10 control: verify work-shift + feed-mode codes on prove-out."),
    ("LTH-05", "Okuma GENOS L400II-E",      "OSP-P300LA-E", 3500, "10-12in 3-jaw",            3.0,  "G15 H1", "Roomy chucker - good for the BUSHING from a blank."),
    ("LTH-06", "Okuma LB 3000EX Big Bore",  "OSP-P500",     3800, "10in 3-jaw / big bore",    4.06, "G15 H1", "Big bore -> BUSHING can run from 1.625 bar through the spindle."),
    ("LTH-07", "Okuma Multus B250II",       "OSP-P300SA",   5000, "8in 3-jaw / collet, B-axis",2.5, "G15 H1", "Mill-turn multitasking; pure-turning here. Good for either part."),
]

DISCLAIMER = (
    "(  *** SOFT / PRE-HEAT-TREAT TURNING - LEAVES GRIND STOCK ***                 )\n"
    "(  *** FIRST RUN = PROVE OUT: single-block, rapid override <=25%, hand on FEED-HOLD )\n"
    "(  *** Speeds/feeds are CONSERVATIVE handbook starts for ANNEALED stock - verify )\n"
    "(  *** Work offset / feed-mode codes vary by OSP generation - VERIFY on the control )\n"
)

def header(part, m, stock, z0, finish, this_op):
    mid, name, ctrl, maxrpm, wh, barcap, woff, notes = m
    itm = "2  ALIGNMENT PIN" if "PIN" in part else "4  CENTER POST (BORED BUSHING)"
    return (
f"""( ============================================================ )
( PART : {part} )
( DWG  : C-033626  (PRECISION FORM "FLATTENING TOOL" / JM DIE) )
( ITEM : {itm} )
( MACH : {mid}  {name} )
( CTRL : {ctrl}    SPINDLE-MAX CLAMP G50 S{maxrpm} )
( HOLD : {wh} )
( WOFF : {woff}   Z0 = {z0}   X0 = SPINDLE CENTERLINE  (DIAMETER PROGRAMMING) )
( STK  : {stock} )
( ------------------------------------------------------------ )
( FINISH (AFTER HT + GRIND): {finish} )
( THIS OP (SOFT): {this_op} )
( NOTE : {notes} )
{DISCLAIMER}( ============================================================ )
G20                ( INCH )
G40                ( CANCEL TNR COMP )
G50 S{maxrpm}      ( SPINDLE SPEED MAX CLAMP )
"""
    )

# ----------------------------- ALIGNMENT PIN -----------------------------
# Z0 = FRONT (TIP) face. Material extends in -Z toward the chuck. Length 4.00.
# Finish: OD .5000/.4995 ; tip .4990/.4985 x .12 with R.030 ; back .035x30 chamfer.
# Soft:   body OD .512 ; tip .511 ; leaving ~.012/dia for centerless/OD grind.
def pin_program(m):
    mid, name, ctrl, maxrpm, wh, barcap, woff, notes = m
    h = header(
        "ALIGNMENT PIN  (AISI M2, HT Rc 60-65)", m,
        "AISI M2 ANNEALED  .5625 (9/16) BAR",
        "FRONT (TIP) FACE",
        "OD .5000/.4995 x 4.00 ; TIP .4990/.4985 x .12 ; R.030 ; BACK CHMF .035x30",
        "OD turned .512 ; tip .511 x .12 ; R.030 + 30deg chmf roughed ; ~.012/dia GRIND STOCK",
    )
    body = f"""
( SLENDER: L/D ~ 8 -> USE TAILSTOCK / STEADY-REST OR FINISH OD BY CENTERLESS GRIND )
( --- T1  ROUGH OD  (CNMG432 COATED CARBIDE, 80deg) --- )
N1 T0101
G96 S150 M03       ( CSS 150 SFM )
G95                ( FEED PER REV )
G00 X.620 Z.100 M08
G00 Z0.0
G01 X-.030 F.005   ( FACE FRONT )
G00 X.620 Z.050
G00 X.538          ( ROUGH PASS 1 )
G01 Z-4.020 F.010
G00 X.560 Z.050
G00 X.520          ( ROUGH PASS 2 )
G01 Z-4.020 F.010
G00 X.560 Z.100
( --- T3  FINISH PROFILE OD  (DNMG431, .031 TNR) --- )
N3 T0303
G96 S200 M03
G42                ( TNR COMP RIGHT )
G00 X.451 Z.100
G00 Z.030
G01 X.451 Z0.0 F.005         ( ONTO FRONT FACE, BELOW TIP OD )
G03 X.511 Z-.030 R.030 F.004 ( R.030 FRONT CORNER -> TIP OD .511 )
G01 Z-.120 F.005             ( TIP .511 x .12 )
G01 X.512 Z-.130             ( SMALL STEP UP TO BODY .512 )
G01 Z-3.965                  ( BODY .512 TO BACK CHAMFER START )
G01 X.560 Z-4.000            ( .035 x 30deg BACK CHAMFER )
G40
G00 X1.200 Z.100 M09
G00 X6.000 Z3.000 T0300
M05
( OP2 (FLIP): FACE BACK TO LENGTH 4.00, DEBURR. THEN HT -> CENTERLESS GRIND OD .5000/.4995 )
M02
"""
    return h + body

# ----------------------------- CENTER POST (BORED BUSHING) -----------------------------
# Z0 = TOP (counterbored) face. Material extends in -Z. Length 2.25.
# Finish: OD 1.501/1.500 x 2.25 ; thru-bore .515/.510 ; .80 x .70 c'bore (top);
#         .06x45 both OD ends ; datum A .0005.
# Soft:   OD 1.512 ; small bore .509 (hone/ID-grind to .515) ; c'bore .80x.70 finished soft.
def bushing_program(m):
    mid, name, ctrl, maxrpm, wh, barcap, woff, notes = m
    stock = "AISI D2 ANNEALED  1.625 (1-5/8) BAR" if barcap >= 1.7 else "AISI D2 ANNEALED  1.625 SAWED BLANK ~2.45 LG (bar > chuck bar cap)"
    h = header(
        "CENTER POST / BORED BUSHING  (AISI D2, HT Rc 56-58)", m,
        stock,
        "TOP (COUNTERBORED) FACE",
        "OD 1.501/1.500 x 2.25 ; THRU-BORE .515/.510 ; .80 x .70 C'BORE ; .06x45 BOTH OD ENDS ; DATUM A .0005",
        "OD 1.512 ; thru-bore .509 (HONE to .515) ; .80x.70 c'bore finished ; ~.012/dia OD GRIND STOCK + .005 on datum face",
    )
    body = f"""
( --- T1  ROUGH+FINISH OD  (CNMG432 COATED CARBIDE) --- )
N1 T0101
G96 S250 M03       ( CSS 250 SFM )
G95                ( FEED PER REV )
G00 X1.700 Z.100 M08
G00 Z0.005
G01 X-.040 F.006   ( FACE TOP, LEAVE .005 ON DATUM FACE )
G00 X1.700 Z.050
G00 X1.560         ( OD ROUGH PASS 1 )
G01 Z-2.270 F.012
G00 X1.620 Z.050
G00 X1.512         ( OD FINISH .512 )
G96 S350
G01 Z-2.270 F.006
G00 X1.700 Z.100
( --- T5  CENTER DRILL + DRILL .46 THRU (PECK) --- )
N5 T0505
G97 S1200 M03      ( DIRECT RPM FOR DRILL )
G00 X0 Z.150
G01 Z-.45 F.005    ( PECK 1 )
G00 Z.05
G01 Z-.95 F.005    ( PECK 2 )
G00 Z.05
G01 Z-1.55 F.005   ( PECK 3 )
G00 Z.05
G01 Z-2.40 F.005   ( PECK 4 - THRU )
G00 Z.150
G00 X6.000 Z3.000 T0500
( --- T7  BORE SMALL THRU-BORE .509  (HONE TO .515/.510) --- )
N7 T0707
G96 S200 M03
G42
G00 X.509 Z.100
G01 Z-2.40 F.005   ( BORE .509 FULL THRU )
G00 X.470 Z.100    ( CLEAR OFF BORE WALL )
G40
G00 X6.000 Z3.000 T0700
( --- T9  BORE .80 x .70 COUNTERBORE FROM TOP --- )
N9 T0909
G96 S200 M03
G42
G00 X.560 Z.100
G00 Z.020
G01 Z0.0 F.006
G01 X.800 Z0.0     ( OPEN TO .80 AT FACE )
G01 Z-.700 F.005   ( .80 C'BORE .70 DEEP )
G01 X.520 Z-.700   ( FACE C'BORE FLOOR BACK TO BORE )
G40
G00 X.470 Z.100
G00 X6.000 Z3.000 T0900
( --- T11 CHAMFER TOP OD EDGE .06x45 --- )
N11 T1111
G96 S250 M03
G00 X1.700 Z.100
G00 X1.380 Z0.0
G01 X1.512 Z-.066 F.004   ( .06x45 TOP OD CHAMFER )
G00 X1.700 Z.050
( --- T13 PART OFF AT 2.250 (BLADE .125 WIDE) --- )
N13 T1313
G97 S700 M03
G00 X1.560 Z-2.316       ( BLADE LEFT EDGE AT 2.250 )
G01 X.470 F.003          ( PART OFF TO BORE )
G00 X1.700 M09
G00 X6.000 Z3.000 T1300
M05
( OP2 (FLIP, soft-jaw on OD): FACE BOTTOM TO 2.250, .06x45 BOTTOM OD CHMF, DEBURR BORE. )
( THEN HEAT TREAT Rc56-58 -> OD GRIND 1.501/1.500 + faces (datum A .0005), HONE BORE .515/.510 )
M02
"""
    return h + body

# ----------------------------- EMIT -----------------------------
def slug(name):
    return name.replace(" ", "-").replace("/", "-")

written = []
for m in MACHINES:
    mid, name = m[0], m[1]
    for part, gen in (("ALIGN-PIN", pin_program), ("CENTER-POST", bushing_program)):
        fn = f"C-033626_{part}_{mid}_{slug(name)}.nc"
        with open(os.path.join(OUT, fn), "w", newline="\r\n") as f:
            f.write(gen(m))
        written.append(fn)

print(f"WROTE {len(written)} NC FILES")
for w in written:
    print("  ", w)
