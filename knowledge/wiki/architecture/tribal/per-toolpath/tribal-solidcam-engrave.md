---
name: tribal-solidcam-engrave
software: solidcam
toolpath: engrave
displayName: "Engrave"
category: milling
coverageStatus: pdf-only
ytTipCount: 0
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:30.455Z
---

# solidcam — Engrave

**Category:** milling · **Slug:** `engrave`

## Fields (UI dialog inputs)

- **Depth**

## Buttons (UI actions)

- `Calculate`

## Coverage status

Coverage: **pdf-only** · 0 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 195

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 195 · notability 0.64

```
Fundamentals of CNC Machining  Appendix A 
CNC Milling Work-Holding Examples 
 
A-20  Copyright 2012 HSMWorks, ApS 
5 Job 2 Operations 
Clean the work area and set the part finished  upside-down in the vise.  Slide the part left -right and apply 
pressure so it rests firmly against the fixed vise jaw and vise stop as shown  in Figure 27 and close the vise 
jaws firmly. This establishes the XY datum.  Next, tap the part down with a rubber mallet to ensure it is flat  
against the parallels and close the jaws tightly. 
 
When making multiple parts, mark the vise with marker or use a torque wrench to ensure each part is 
gripped with the same vise force. 
Base: Job-2 Setup 
 
 
 
G54 Datum:Upper-left corner of finished part face. 
Op-1 
2D Contour 
Tool (inch) 
.375 End Mill 
2-Flute 
Speed(rpm) 
9800 
Feed XY(ipm) 
68. 
Feed Z(ipm) 
30. 
Contour OD leaving .010 in XY Stock. This cut is used to clear excess material from the part so the corner round tool will not 
engage an excessive amount of material. 
Op-2 
Face 
Tool (inch) 
.375 End Mill 
2-Flute 
Speed(rpm) 
9800 
Feed XY(ipm) 
68. 
Feed Z(ipm) 
30. 
Face part using a s tepover = .20in and stepdown =.10in .  The number of Z -roughing passes required depends on the amount of 
material remaining on part. Finish pass should be no greater than .005in to yield a good finish.  
Op-3  
2D Contour 
Tool (inch) 
.115x.093 
Radius Mill 
Speed(rpm) 
5000 
Feed XY(ipm) 
40. 
Feed Z(ipm) 
20. 
Use corner round tool to create fillet on 
```

### TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf — page 196

**Source:** `TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf` page 196 · notability 0.64

```
Fundamentals of CNC Machining Appendix A
CNC Milling Work-Holding Examples
A-20 Copyright 2014 Autodesk, Inc.
5 Job 2 Operations
Clean the work area and set the part finished upside-down in the vise. Slide the part left-right and apply
pressure so it rests firmly against the fixed vise jaw and vise stop as shown in Figure 27 and close the vise
jaws firmly. This establishes the XY datum. Next, tap the part down with a rubber mallet to ensure it is flat
against the parallels and close the jaws tightly.
When making multiple parts, mark the vise with marker or use a torque wrench to ensure each part is
gripped with the same vise force.
Base: Job-2 Setup
G54 Datum:Upper-left corner of finished part face.
Op-1
2D Contour
Tool (inch)
.375 End Mill
2-Flute
Speed(rpm)
9800
Feed XY(ipm)
68.
Feed Z(ipm)
30.
Contour OD leaving .010in XY Stock. This cut is used to clear excess material from the part so the corner round tool will not
engage an excessive amount of material.
Op-2
Face
Tool (inch)
.375 End Mill
2-Flute
Speed(rpm)
9800
Feed XY(ipm)
68.
Feed Z(ipm)
30.
Face part using a stepover = .20in and stepdown =.10in . The number of Z-roughing passes required depends on the amount o f
material remaining on part. Finish pass should be no greater than .005in to yield a good finish.
Op-3
2D Contour
Tool (inch)
.115x.093
Radius Mill
Speed(rpm)
5000
Feed XY(ipm)
40.
Feed Z(ipm)
20.
Use corner round tool to create fillet on outside of part. Take two finish passes to produce a very good surface 
```

### TRIBAL + WIKI/Fundamentals_of_CNC_Machining.pdf — page 196

**Source:** `TRIBAL + WIKI/Fundamentals_of_CNC_Machining.pdf` page 196 · notability 0.74

```
Fundamentals	  of	  CNC	  Machining	   	   Appendix	  A	  CNC	  Milling	  Work-­‐Holding	  Examples	  
	  	  A-­‐20	  	   	   	  Copyright	  2014	  Autodesk,	  Inc.	  
5	  Job	  2	  Operations	  Clean	  the	  work	  area	  and	  set	  the	  part	  finished	  upside-­‐down	  in	  the	  vise.	  	  Slide	  the	  part	  left-­‐right	   and	   apply	  pressure	  so	  it	  rests	  firmly	  against	  the	  fixed	  vise	  jaw	  and	  vise	  stop	  as	  shown	  in	  Figure	  27	  and	  close	  the	  vise	  jaws	  firmly.	  This	  establishes	  the	  XY	  datum.	  	  Next,	  tap	  the	  part	  down	  with	  a	  rubber	  mallet	  to	  ensure	  it	  is	  flat	  against	  the	  parallels	  and	  close	  the	  jaws	  tightly.	  	  When	  making	   multiple	   parts,	   mark	   the	   vise	   with	   marker	   or	   use	   a	   torque	   wrench	   to	   ensure	   each	   part	   is	  gripped	  with	  the	  same	  vise	  force.	  Base:	  Job-­‐2	  Setup	  	  
	  	  G54	  Datum:	  Upper-­‐left	  corner	  of	  finished	  part	  face.	  Op-­‐1	  2D	  Contour	  Tool	  (inch)	  .375	  End	  Mill	  2-­‐Flute	  Speed	  (rpm)	  9800	  Feed	  XY	  (ipm)	  68.	  Feed	  Z	  (ipm)	  30.	  Contour	   OD	   leaving	   .010in	  XY	   Stock.	   This	   cut	  is	  used	   to	   clear	   excess	   material	   from	   the	   part	   so	  
```

### TRIBAL + WIKI/English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf — page 158

**Source:** `TRIBAL + WIKI/English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf` page 158 · notability 0.44

```
158|2023 Mill Operator’s Manual
16.3 | MILL - VISUAL PROGRAMMING SYSTEM (VPS)
To generate the example engraving cycle, we use these
variable values. Note that all othe position values are given
in work coordinates.
6. With all othe variables entered, you can press[CYCLE
START]to immediately run the program in MDI, or F4 to
output the code to either the clipboard or MDI without
running the program.
%
O11111 ;
(Engraving) ;
( TOOL 1 ) ;
( SPINDLE 1000 RPM / FEED 15. ) ;
( DEPTH -0.005 ) ;
T1 M06 ;
G00 G90 G54 X2. Y2. S1000 M03 ;
G43 Z0.05 H1 ;
M08 ;
G00 G90 G54 X2. Y2. ;
( TEXT ENGRAVING : TEXT TO
ENGRAVE ) ;
G47 E7.5000 F15. I45. J.5 P0 R0.05
Z-0.005 (TEXT TO ENGRAVE) ;
G0 Z0.05 M09 ;
M05 ;
G91 G28 Z0. ;
G91 G28 Y0. ;
M01 ( END ENGRAVING ) ;
%
WORK_OFFSETS Work Oset Number 54
T Tool Number 1
S Spindle Speed 1000
F Feedrate 15
M8 Coolant (1 - YES / 0 - NO) 1
X Starting X Position 2
Y Starting Y Position 2
R R-Plane Height 0.05
Z Z Depth -0.005
P Text or Serial Number Switch (0 - Text, 1 - Serial Number) 0
J Text Height 0.5
I Text Angle (Degreesrom Horizontal) 45
TEXT Text to Engrave TEXT TO ENGRAVE
VALUENAME DESCRIPTION
```

### TRIBAL + WIKI/English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf — page 175

**Source:** `TRIBAL + WIKI/English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf` page 175 · notability 0.4

```
2023 Mill Operator’s Manual|175
17.5 | MILL - SPECIAL G-CODES
Special G-codes are usedor complex milling. These
include:
•Engraving (G47)
•Pocket Milling (G12, G13, and G150)
•Rotation and Scaling (G68, G69, G50, G51)
•Mirror Image (G101 and G100)
The G47 Text Engraving G-code lets you engrave text
(including some ASCII characters) or sequential serial
numbers with a single block ocode.
Reer to G47 Text Engraving (Group 00)or more
inormation on engraving.
There are two types opocket milling G-codes on the Haas
control:
Circular Pocket Milling is perormed with the G12 Clockwise
Circular Pocket Milling Command and the G13 Counter-
Clockwise Circular Pocket Milling Command G-codes.
The G150 General Purpose Pocket Milling uses a
subprogram to machine user-dened pocket geometries.
Make sure that the subprogram geometry is aully closed
shape. Make sure that the X-Y starting point in the G150
command is within the boundary otheully closed shape.
Failure to do so may cause Alarm 370 - Pocket Denition
Error.
Reer to G12 Circular Pocket Milling CW / G13 Circular
Pocket Milling CCW (Group 00)or more inormation on the
pocket milling G-codes.
Special G-Codes
Engraving
Pocket Milling
```
