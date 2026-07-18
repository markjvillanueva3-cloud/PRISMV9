---
name: tribal-solidcam-pocket-mill
software: solidcam
toolpath: pocket-mill
displayName: "Pocket Mill"
category: milling
coverageStatus: pdf-only
ytTipCount: 0
pdfTipCount: 4
generatedAt: 2026-05-27T03:30:30.114Z
---

# solidcam — Pocket Mill

**Category:** milling · **Slug:** `pocket-mill`

## Fields (UI dialog inputs)

- **Stepover**

## Buttons (UI actions)

- `Calculate`

## Coverage status

Coverage: **pdf-only** · 0 YouTube tips · 4 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 109

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 109 · notability 0.44

```
Fundamentals of CNC Machining  Lesson 7 
2D Milling Toolpaths 
7-8  Copyright 2012 HSMWorks, ApS 
It is probably obvious to you now that m anufacturing is an exceedingly complex process . Many factors 
influence every decision and often more than one solution to any problem. Manufacturing is also a win/lose 
game. Either the part is right (within tolerance) or not. Don’t be overwhelmed by the choices for now. Some 
knowledge and experience will  help you settle many of these variables and greatly simplify the job of 
planning CNC processes. 
 
7.5 - 2D Machining Features Example 
Figure 5 and Table 2 shows the operations and machining sequence to CNC mill this part. 
 
Figure 3: 2D Machining Features Example 
 
Op. Toolpath Notes 
1 Face It is common practice that the first machining operation roughs and finishes to the highest flat 
surface of the part. Face paths overlap the sides of the loop selected.  
2 2D 
Contour 
Machine outside loop. 
3 2D 
Contour 
Machine outside of boss.  
4 2D Pocket Use Pocket to rough and finish enclosed loops. 
5 Slot Mill Mill slots. 
6 Circular 
Pocket Mill 
Machine the center hole through. You could also use a Drill operation to make this hole, but would 
center-drill the hole first. 
7 Chamfer Use 2D Contour, Chamfer function and a chamfer tool (or center drill) to make this 45 degree 

```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 110

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 110 · notability 0.52

```
Lesson 7  Fundamentals of CNC Machining 
2D Milling Toolpaths 
Copyright 2012 HSMWorks, ApS  7-9 
chamfer. 
8 Fillet Use 2D Contour, fillet function and a corner round tool to make this fillet feature.  
9 Spot Drill Spot drill all holes to: 
1. Ensure subsequent drill does not wobble and thus is located precisely.  
2. Create chamfer for this hole. 
10 Drill Drill to make hole. Do this before the Circular Pocket Mill so the Spot Drill conic still exists.  
11 Circular 
Pocket Mill 
Create counterbore.  
Table 2: 2D Features Example  
 
7.6 - 2D Toolpath Terminology 
 
Though the terminology and ways of working vary widely, all CAD/CAM software needs the same basic 
information to function. Figure 4 shows parameters common to 2D tool paths.  
 
 
 
 
 
 
 
 
 
 
Figure 4: 2D Tool Path Terminology 
Clearance Height is the first height the tool rapids to on its way to the start of the tool path.  It is usually set 
1.000in above the top of stock  because this makes it eas ier to see if the tool length offset register was set 
properly. 
 
Rapid Height  is the second height the tool rapids to , and the height the tool retracts to between moves  
(unless set higher to clear clamps). It is usually set to .250in above the top of the finished part face. 
Feed Height  is the last height the tool rapids to  before starting to feed into the cut.  It is usually set to 
.1000in above top of stock. No rapid motion occurs below this height. 
Top of Stock is the top of the finished face of 
```

### TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf — page 110

**Source:** `TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf` page 110 · notability 0.44

```
Fundamentals of CNC Machining Lesson 7
2D Milling Toolpaths
7-8 Copyright 2014 Autodesk, Inc.
It is probably obvious to you now that manufacturing is an exceedingly complex process. Many factors
influence every decision and often more than one solution to any problem. Manufacturing is also a win/lose
game. Either the part is right (within tolerance) or not. Don’t be overwhelmed by the choices for now. Some
knowledge and experience will help you settle many of these variables and greatly simplify the job of
planning CNC processes.
7.5 - 2D Machining Features Example
Figure 5 and Table 2 shows the operations and machining sequence to CNC mill this part.
Figure 3: 2D Machining Features Example
Op. Toolpath Notes
1 Face It is common practice that the first machining operation roughs and finishes to the highest flat
surface of the part. Face paths overlap the sides of the loop selected.
2 2D
Contour
Machine outside loop.
3 2D
Contour
Machine outside of boss.
4 2D Pocket Use Pocket to rough and finish enclosed loops.
5 Slot Mill Mill slots.
6 Circular
Pocket Mill
Machine the center hole through. You could also use a Drill operation to make this hole, but would
center-drill the hole first.
7 Chamfer Use 2D Contour, Chamfer function and a chamfer tool (or center drill) to make this 45 degree

```

### TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf — page 111

**Source:** `TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf` page 111 · notability 0.4

```
Lesson 7 Fundamentals of CNC Machining
2D Milling Toolpaths
Copyright 2014 Autodesk, Inc. 7-9
chamfer.
8 Fillet Use 2D Contour, fillet function and a corner round tool to make this fillet feature.
9 Spot Drill Spot drill all holes to:
1. Ensure subsequent drill does not wobble and thus is located precisely.
2. Create chamfer for this hole.
10 Drill Drill to make hole. Do this before the Circular Pocket Mill so the Spot Drill conic still exists.
11 Circular
Pocket Mill
Create counterbore.
Table 2: 2D Features Example
7.6 - 2D Toolpath Terminology
Though the terminology and ways of working vary widely, all CAD/CAM software needs the same basic
information to function. Figure 4 shows parameters common to 2D tool paths.
Figure 4: 2D Tool Path Terminology
Clearance Heightis the first height the tool rapids to on its way to the start of the tool path. It is usually set
1.000inabove the top of stock because this makes it easier to see if the tool length offset register was set
properly.
Rapid Heightis the second height the tool rapids to, and the height the tool retracts to between moves
(unless set higher to clear clamps). It is usually set to .250inabove the top of the finished part face.
Feed Heightis the last height the tool rapids to before starting to feed into the cut. It is usually set to
.1000inabove top of stock. No rapid motion occurs below this height.
Top of Stockis the top of the finished face of the part. This value is used as the reference plane for depths.
Stepdowni
```
