---
name: tribal-mastercam-tap-cycle
software: mastercam
toolpath: tap-cycle
displayName: "Tap Cycle"
category: drilling
coverageStatus: pdf-only
ytTipCount: 0
pdfTipCount: 4
generatedAt: 2026-05-27T03:30:05.796Z
---

# mastercam — Tap Cycle

**Category:** drilling · **Slug:** `tap-cycle`

## Fields (UI dialog inputs)

- **Pitch**
- **Direction**

## Buttons (UI actions)

- `Compute`

## Coverage status

Coverage: **pdf-only** · 0 YouTube tips · 4 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 63

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 63 · notability 0.4

```
Fundamentals of CNC Machining  Lesson 5 
CNC Programming Language 
5-8  Copyright 2012 HSMWorks, ApS 
;  End of Block 
This character is not visible when the CNC program is read in a text editor (carriage return), but does appear at the end 
of every block of code when the program is displayed on the machine control.  
N8 Z0.1 ; 
 
 
5.4 G&M Codes 
G&M Codes make up the most of the contents of the CNC program. The definition of each class of code and 
specific meanings of the most important codes are covered next. 
G-Codes 
Codes that begin with G are called preparatory words because they prepare the machine for a certain type 
of motion.  The most common G -codes are shown in Table 1  and a  complete list and their meaning is 
included in Appendix B, G-M Code Reference. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Code Meaning 
G0 Rapid motion. Used to position the machine for non-milling moves. 
G1 Line motion at a specified feed rate. 
G2 Clockwise arc. 
G3 Counterclockwise arc. 
G4 Dwell. 
G28 Return to machine home position. 
G40 Cutter Diameter Compensation (CDC) off. 
G41 Cutter Diameter Compensation (CDC) left. 
G42 Cutter Diameter Compensation (CDC) right. 
G43 Tool length offset (TLO). 
G54 Fixture Offset #1. 
G55 Fixture Offset #2. 
G56 Fixture Offset #3. 
G57 Fixture Offset #4. 
G58 Fixture Offset #5. 
G59 Fixture Offset #6. 
G80 Cancel drill cycle. 
G81 Simple drill cycle. 
G82 Simple drill cycle with dwell. 
G83 Peck drill cycle. 
G84 Tap cycle. 
G90 Absolute coordinate
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 69

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 69 · notability 0.44

```
Fundamentals of CNC Machining  Lesson 5 
CNC Programming Language 
5-14  Copyright 2012 HSMWorks, ApS 
 
Figure 10: G83 Peck Drill Cycle 
 
 
G84  Tap Cycle 
Most modern machines support rigid tapping , which eliminates the need to use special tapping attachments. Rigid 
tapping precisely coordinate s the spindle speed and feed t o match the lead of the thread . It then stops and reverses 
the spindle at the bottom of the cycle to retract the tap.  The parameters for the tap cycle are identical to simple 
drilling (G81). 
G0 Z1. G43 H1 
G84 X.5 Y.5 Z-1.5 R0.1 F20. 
 
G90  Absolute Positioning 
This code commands the machine to interpret coordinates as  absolute position moves in the active Work Coordinate 
System.  All programs are written in absolute coordinates. 
G90 G0 X1. Y1. 
 
G91  Incremental Positioning 
This code commands the machine to interpret coordinates as incremental position moves.  G91 is used by subprograms  
but most programming done with CAD/CAM software and does not use subprograms.  
 
The only common use of G91 is in combination with G28 to send the machine back to its home position at the end of 
the program. The machine must be set back to G90 mode in the next block as a safety measure. 
G91 G28 Z0. 
G90  
 
G98  Return to Initial Rapid Height 
This code is used in drill cycles to r etract the tool to the clearance plane  (set in the next previous block)  between holes 
to avoid clamps.   
G0 Z1. G43 H1 
G98 G81 Z-0.325 R0.1 F12. 
 
Peck Increment (Q.
```

### TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf — page 70

**Source:** `TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf` page 70 · notability 0.44

```
Fundamentals of CNC Machining Lesson 5
CNC Programming Language
5-14 Copyright 2014 Autodesk, Inc.
Figure 10: G83 Peck Drill Cycle
G84 Tap Cycle
Most modern machines support rigid tapping, which eliminates the need to use special tapping attachments. Rigid
tapping precisely coordinates the spindle speed and feed to match the lead of the thread. It then stops and reverses
the spindle at the bottom of the cycle to retract the tap. The parameters for the tap cycle are identical to simple
drilling (G81).
G0 Z1. G43 H1
G84 X.5 Y.5 Z-1.5 R0.1 F20.
G90 Absolute Positioning
This code commands the machine to interpret coordinates as absolute position moves in the active Work Coordinate
System. All programs are written in absolute coordinates.
G90 G0 X1. Y1.
G91 Incremental Positioning
This code commands the machine to interpret coordinates as incremental position moves. G91 is used by subprograms
but most programming done with CAD/CAM software and does not use subprograms.
The only common use of G91 is in combination with G28 to send the machine back to its home position at the end of
the program. The machine must be set back to G90 mode in the next block as a safety measure.
G91 G28 Z0.
G90
G98 Return to Initial Rapid Height
This code is used in drill cycles to retract the tool to the clearance plane (set in the next previous block) between holes
to avoid clamps.
G0 Z1. G43 H1
G98 G81 Z-0.325 R0.1 F12.
Peck Increment (Q.25)
Initial Rapid Height (Z1.0)
Feed Plane (R.1)
Z+
X+
Depth (Z-
```

### TRIBAL + WIKI/CNC Lathe Programming - cnc_lathe_programming-uploaded.pdf — page 69

**Source:** `TRIBAL + WIKI/CNC Lathe Programming - cnc_lathe_programming-uploaded.pdf` page 69 · notability 0.6

```
Prof. Steven S. Saliterman
G50 S200 (Clamp spindle speed 200 rpm)
G28 (Rapid to machine zero)
MO1 (Optional program stop)
T404 (OD THREAD tool)
G97 S655 M3 (Start spindle, D=1.748, SFM=300, RPM=655)
G54 G00 X1.848 Z0.2 M08 (Rapid to start position, coolant on)
G76 X1.673 Z-1.1 K.039 D.0125 A58 F.0625 (Thread cycle, X=minor diam., Z=into
groove, K=thread depth from table, D=first pass from table, A=60-2 degrees to cut on
both sides, F=feed=1/TPI=1/16, using Kennametal table )
M09 (Coolant off)
G28
MO1
T1111 (5/16 DRILL)
G97 S976 M3 (Start spindle, D=5/16=.313, SFM=80, RPM=976)
G54 G00 X0 Z0.2 M08 (Rapid to start position, coolant on)
G83 X0 Z-1.3 R.1 Q0.3125 F.006 (Drill peck cycle)
G80 (Cancel canned cycle)
G00 Z0.2 (Return to start)
G28
M09
M01
T1010 (3/8-16 TAP)
G97 S200 M05 (RPM given and stop spindle)
G54 G00 X0 Z0.5 M08 (Rapid to start position, coolant on)
G84 X0 Z-1 R0.5 F0.0625 (Tap cycle, R plane 500 in front, feed=1/TPI=1/16)
G80
G28
M30 (End)
T0404 Thread G761-3/4 -16 UN 2A 1.0"
back from face SFM=300 ft/min. Major
diameter 1.748, Minor diameter 1.673
T1111 5/16 Drill G83 1.3" deep SFM=80 ft/min
F.006"/rev peck diameter of drill
T1010 Tap 3/8-16 x 1.0" deep at 200 rpm
Image courtesy of Haas
```
