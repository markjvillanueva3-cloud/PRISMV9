0  BEGIN PGM CONTOUR MM
1  ; 2D contour with lines and arcs
2  ; Material: Aluminum 6061-T6
3  ; Tool: 12mm end mill, 3-flute
4  BLK FORM 0.1 Z X-60 Y-60 Z-20
5  BLK FORM 0.2 X+60 Y+60 Z+0
6  TOOL CALL 3 Z S6000 F800 DL+0 DR+0
7  L Z+50 R0 FMAX M3
8  ; Approach position
9  L X-60 Y-50 R0 FMAX
10 L Z-10 R0 F200
11 ; Contour start - engage with radius compensation
12 L X-50 Y-50 RL F800
13 L X+50 Y-50 RL F800
14 ; Arc - quarter circle, 20mm radius
15 CC X+50 Y-30
16 C X+50 Y-30 DR- RL F800
17 ; Straight segment upward
18 L X+50 Y+30 RL F800
19 ; Arc - quarter circle
20 CC X+30 Y+30
21 C X+30 Y+50 DR- RL F800
22 ; Straight across top
23 L X-30 Y+50 RL F800
24 ; Arc - quarter circle
25 CC X-30 Y+30
26 C X-50 Y+30 DR- RL F800
27 ; Close contour
28 L X-50 Y-50 RL F800
29 ; Retract
30 L Z+50 R0 FMAX M5
31 TOOL CALL 0
32 L Z+100 R0 FMAX M30
33 END PGM CONTOUR MM
