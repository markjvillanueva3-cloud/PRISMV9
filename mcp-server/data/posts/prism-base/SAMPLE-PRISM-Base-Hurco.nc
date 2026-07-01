(PRISM BASE - HURCO VM 3-AXIS standalone)
O1001
G20 G17 G90 G94 G54
G91 G28 Z0.
G90
(OP - T1 D0.5)
T1 M06
S6000 M03
M08
G00 X0. Y0.
G43 Z25. H1
(PRISM PATHS feed x1.679)
(stickout feed -5%)
(chip thinning +50% feed)
(shallow DOC +50%)
(normal engagement 20%)
(ae OK 20%)
(aggressiveness L5 -> 0.786x)
G00 X0.25 Y0.25 Z0.1
G01 X0.25 Y0.25 Z-0.3 F503.839
G01 X2.25 Y0.25 Z-0.3 F1007.678
G01 X2.25 Y1.75 Z-0.3 F1007.678
G02 X2 Y1.75 I0 J-0.25 F1007.678
G01 X0.25 Y1.75 Z-0.3 F1007.678
M09
G91 G28 Z0.
G90
(OP - T2 D0.25)
T2 M06
S9000 M03
M08
G00 X0. Y0.
G43 Z25. H2
(PRISM PATHS feed x1.679)
(stickout feed -5%)
(chip thinning +50% feed)
(light engagement 4% +50%)
(low LOC 13% - no ae limit)
(aggressiveness L5 -> 0.786x)
G01 X0.25 Y1.75 Z-0.1 F251.92
G01 X2.25 Y1.75 Z-0.1 F503.839
M09
G91 G28 Z0.
G90
M30
