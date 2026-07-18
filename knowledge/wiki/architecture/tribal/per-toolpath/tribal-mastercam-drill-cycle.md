---
name: tribal-mastercam-drill-cycle
software: mastercam
toolpath: drill-cycle
displayName: "Drill Cycle"
category: drilling
coverageStatus: youtube+pdf
ytTipCount: 2
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:05.672Z
---

# mastercam — Drill Cycle

**Category:** drilling · **Slug:** `drill-cycle`

## Fields (UI dialog inputs)

- **Cycle Type**
- **Peck**
- **Dwell**
- **Retract**

## Buttons (UI actions)

- `Compute`

## Coverage status

Coverage: **youtube+pdf** · 2 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from YouTube transcripts

### Mill and Mill 3D Mastercam 2022 @1468s

**Source:** [OptiPro Systems, LLC](https://www.youtube.com/watch?v=cD33l7oxl5I&t=1438s) · video `cD33l7oxl5I`

```
window select you end up with something window select you end up with something like this like this like this it's a common thing that i do all the it's a common thing that i do all the it's a common thing that i do all the time it's a big pain in the butt time it's a big pain in the butt time it's a big pain in the butt sometimes always get these pointed the sometimes always get these pointed the sometimes always get these pointed the right way right way right way so now in 2022 when you're selecting so now in 2022 when you're selecting so now in 2022 when you're selecting your drill holes there's an advanced your drill holes there's an advanced your drill holes there's an advanced page and you have some tools to help it page and you have some tools to help it page and you have some tools to help it make sure that you have these arrows make sure that you have these arrows make sure that you have these arrows pointing the correct direction some new enhancements to advanced drill some new enhancements to advanced drill and so for those of you who don't know and so for those of you who don't know and so for those of you who don't know what advanced drill is it's a what advanced drill is it's a what advanced drill is it's a customizable drill cycle customizable drill cycle customizable drill cycle how i like to explain it is in a gun how i like to explain it is in a gun how i like to explain it is in a gun drill drill drill uh for like a gun drill let's say uh for like a gun dri
```

### Mill and Mill 3D Mastercam 2022 @1470s

**Source:** [OptiPro Systems, LLC](https://www.youtube.com/watch?v=cD33l7oxl5I&t=1440s) · video `cD33l7oxl5I`

```
like this like this it's a common thing that i do all the it's a common thing that i do all the it's a common thing that i do all the time it's a big pain in the butt time it's a big pain in the butt time it's a big pain in the butt sometimes always get these pointed the sometimes always get these pointed the sometimes always get these pointed the right way right way right way so now in 2022 when you're selecting so now in 2022 when you're selecting so now in 2022 when you're selecting your drill holes there's an advanced your drill holes there's an advanced your drill holes there's an advanced page and you have some tools to help it page and you have some tools to help it page and you have some tools to help it make sure that you have these arrows make sure that you have these arrows make sure that you have these arrows pointing the correct direction some new enhancements to advanced drill some new enhancements to advanced drill and so for those of you who don't know and so for those of you who don't know and so for those of you who don't know what advanced drill is it's a what advanced drill is it's a what advanced drill is it's a customizable drill cycle customizable drill cycle customizable drill cycle how i like to explain it is in a gun how i like to explain it is in a gun how i like to explain it is in a gun drill drill drill uh for like a gun drill let's say uh for like a gun drill let's say uh for like a gun drill let's say let's say you have a really long tool let's
```

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 59

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 59 · notability 0.7

```
Fundamentals of CNC Machining  Lesson 5 
CNC Programming Language 
5-4  Copyright 2012 HSMWorks, ApS 
Like any language, the G-code language has rules. For example, some codes are modal, meaning they do not 
have to be repeated if they do not change between blocks . Some codes have different meanings depending 
on how and where there are used.  
While these rules are covered in this chapter, do not concern y ourself with learning every nuance of the 
language. It is the job of the job of the CAD/CAM software Post Processor to properly format and write the 
CNC program. 
Program Format 
The program in Figure 1 below machines a square contour and drills a hole.  
Block Description Purpose 
% Start of program. Start 
O0001 (PROJECT1) Program number (Program Name). Program 
(T1  0.25 END MILL) Tool description for operator.  
N1 G17 G20 G40 G49 G80 G90 Safety block to ensure machine is in safe mode.  
N2 T1 M6 Load Tool #1. Change 
N3 S9200 M3 Spindle Speed 9200 RPM, On CW. Tool 
N4 G54 Use Fixture Offset #1. Move 
N5 M8 Coolant On. To 
N6 G00 X-0.025 Y-0.275 Rapid above part. Position 
N7 G43 Z1. H1 Rapid to safe plane, use Tool Length Offset #1.  
N8 Z0.1 Rapid to feed plane.  
N9 G01 Z-0.1 F18. Line move to cutting depth at 18 IPM.  
N10 G41 Y0.1 D1 F36. CDC Left, Lead in line, Dia. Offset #1, 36 IPM. Machine 
N11 Y2.025 Line move. Contour 
N12 X2.025 Line move.  
N13 Y-0.025 Line move.  
N14 X-0.025 Line move.  
N15 G40 X-0.4 Turn CDC off with lead-out move.  
N16 G00 Z1. Rap
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 61

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 61 · notability 0.56

```
Fundamentals of CNC Machining  Lesson 5 
CNC Programming Language 
5-6  Copyright 2012 HSMWorks, ApS 
F  Feed Rate 
Sets the feed rate when machining lines, arcs or drill cycles.  Feed rate can be in Inches per Minute (G94 mode) or 
Inverse Time (G93 mode). Feed rates can be up to three decimal places accuracy (for tap cycles) and require a decimal 
point. 
G1 X1. Y0. F18.  
 
G  Preparatory Code 
Always accompanied by an integer that determines its meaning.  Most G -codes are modal. Expanded definitions of G -
codes appear in the next section of this chapter. 
G2 X1. Y1. I.25 J0. 
 
H  Tool Length Compensation Register 
This code calls a tool length offset (TLO) register on the control . The control combines the TLO and Fixture Offset Z 
values to know where the tool is in relation to the part datum. It is always accompanied by an integer( H1, H2, etc), G43, 
and Z coordinate.  
G43 H1 Z1. 
 
I  Arc Center or Drill Cycle Data 
For arc moves (G2/G3), this is the incremental X -distance from the arc start point to the arc center. Certain drill cycles 
also use I as an optional parameter. 
G2 X.1 Y2.025 I0.J0.125 
 
J  Arc Center or Drill Cycle Data 
For arc moves (G2/G3), this is the incremental Y -distance from the arc start point to the arc center. Certain drill cycles 
also use J as an optional parameter. 
G2 X.1 Y2.025 I0.J0.125 
 
K  Arc Center or Drill Cycle Data 
For an arc move (G2/G3) this is the incremental Z -distance from the arc start point to the arc center. In t
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 62

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 62 · notability 0.46

```
Lesson 5  Fundamentals of CNC Machining 
CNC Programming Language 
Copyright 2012 HSMWorks, ApS  5-7 
Q  Drill Cycle Optional Data 
The incremental feed distance per pass in a peck drill cycle. 
G83 X1. Y1. Z-.5 F12. R.1 Q.1 P5.  
 
R  Arc Radius or Drill Cycle Optional Data 
Arcs can be defined using the arc radius R or I,J,K vectors. IJK’s are more reliable than R’s so it is recommended to use 
them instead.  R is also used by drill cycles as the return plane Z value.  
G83 Z-.5 F12.R.1 Q.1 P5. 
 
S  Spindle Speed 
Spindle speed in revolutions per minute (RPM). It is an integer value with no decimal, and always used in conjunction 
with M3 (Spindle on CW) or M4 (Spindle on CCW).  
S3820 M3 
 
T  Tool number 
Selects tool.  It is an integer value always accompanied by M6 (tool change code).  
T1 M6 
 
X  X-Coordinate 
Coordinate data for the X -axis.  Up to four places after the decimal are allowed and trailing zeros are not used. 
Coordinates are modal, so there is no need to repeat them in subsequent bl ocks if they do not change. 
G1 X1.1252 
 
Y  Y-Coordinate 
Coordinate data for the Y-axis.  
G1 Y1. 
 
Z  Z-Coordinate 
Coordinate data for the Z-axis.   
G1 Z-.125 
 
Special Character Code Definitions 
 
The following is a list of commonly used special characters, their meaning, use, and restrictions. 
 
%  Program Start or End 
All programs begin and end with % on a block by itself.  This code is called tape rewind character (a holdover from the 
days when programs were
```

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

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 67

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 67 · notability 0.4

```
Fundamentals of CNC Machining  Lesson 5 
CNC Programming Language 
5-12  Copyright 2012 HSMWorks, ApS 
5.6 Canned Cycles 
 
Canned cycles are special codes that act like a macro. They are used for hole making and allow one compact 
block of code to command many moves. For example, a hole can be created using a peck drill cycle with two 
lines of code (left column) whereas the same move would require maybe twenty or more lines of code if 
each motion was commanded separately (right column). 
 
Canned Cycle Equivalent Motion: Expanded Code 
N70 G98 G83 X1. Y1. Z-1.04 R0.06 Q0.15 P0 F9. 
N75 G80 
 
N70 Z0.06 
N75 Z0.04 
N80 G01 Z-0.19 F9. 
N85 G00 Z0.06 
N90 Z-0.11 
N95 G01 Z-0.34 
N100 G00 Z0.06 
N105 Z-0.26 
N110 G01 Z-0.49. 
N115 G00 Z0.06 
N120 Z-0.41 
N125 G01 Z-0.64. 
N130 G00 Z0.06 
N135 Z-0.56 
N140 G01 Z-0.79 
N145 G00 Z0.06 
N150 Z-0.71 
N155 G01 Z-0.94. 
N160 G00 Z0.06 
N165 Z-0.86 
N170 G01 Z-1.04. 
N175 G00 Z0.25  
 
Figure 8: Canned Cycle vs. Expanded Code 
 
G81  Simple Drill Cycle 
This cycle makes holes by feeding to depth at a programmed feed rate and then retracting at rapid rate.   It is 
accompanied by G98 or G99, XYZ coordinates, feed rate, and R. R is the feed plane and Z is final depth of the tool tip. 
 
All drill cycles are accompanied by G98 or G99 that determine how high the tool retracts between holes. 
G0 Z1. G43 H1 
G98 G81 X.5 Y.5 Z-1. R.1 F9.5 
 
```
