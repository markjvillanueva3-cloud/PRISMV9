( ============================================================ )
( PART : ALIGNMENT PIN  (AISI M2, HT Rc 60-65) )
( DWG  : C-033626  (PRECISION FORM "FLATTENING TOOL" / JM DIE) )
( ITEM : 2  ALIGNMENT PIN )
( MACH : LTH-06  Okuma LB 3000EX Big Bore )
( CTRL : OSP-P500    SPINDLE-MAX CLAMP G50 S3800 )
( HOLD : 10in 3-jaw / big bore )
( WOFF : G15 H1   Z0 = FRONT (TIP) FACE   X0 = SPINDLE CENTERLINE  (DIAMETER PROGRAMMING) )
( STK  : AISI M2 ANNEALED  .5625 (9/16) BAR )
( ------------------------------------------------------------ )
( FINISH (AFTER HT + GRIND): OD .5000/.4995 x 4.00 ; TIP .4990/.4985 x .12 ; R.030 ; BACK CHMF .035x30 )
( THIS OP (SOFT): OD turned .512 ; tip .511 x .12 ; R.030 + 30deg chmf roughed ; ~.012/dia GRIND STOCK )
( NOTE : Big bore -> BUSHING can run from 1.625 bar through the spindle. )
(  *** SOFT / PRE-HEAT-TREAT TURNING - LEAVES GRIND STOCK ***                 )
(  *** FIRST RUN = PROVE OUT: single-block, rapid override <=25%, hand on FEED-HOLD )
(  *** Speeds/feeds are CONSERVATIVE handbook starts for ANNEALED stock - verify )
(  *** Work offset / feed-mode codes vary by OSP generation - VERIFY on the control )
( ============================================================ )
G20                ( INCH )
G40                ( CANCEL TNR COMP )
G50 S3800      ( SPINDLE SPEED MAX CLAMP )

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
