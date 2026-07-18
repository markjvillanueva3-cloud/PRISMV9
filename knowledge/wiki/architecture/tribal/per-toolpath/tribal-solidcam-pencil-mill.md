---
name: tribal-solidcam-pencil-mill
software: solidcam
toolpath: pencil-mill
displayName: "Pencil Mill"
category: 3d-finish
coverageStatus: pdf-only
ytTipCount: 0
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:30.960Z
---

# solidcam — Pencil Mill

**Category:** 3d-finish · **Slug:** `pencil-mill`

## Fields (UI dialog inputs)

- **Number of Passes**

## Buttons (UI actions)

- `Calculate`

## Coverage status

Coverage: **pdf-only** · 0 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 156

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 156 · notability 0.4

```
Fundamentals of CNC Machining 
9-1 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Lesson 9 
3D Toolpaths 
 
 
 
 
 
Upon successful completion of this lesson, you will be able to: 
• Explain how 3D tool compensation is calculated.  
• Describe 3D cut tolerances.  
• Identify geometric features common to 3D tool paths.  
• Explain the purpose, general parameters, and use of common 3D roughing tool 
paths.
 
• Explain the purpose, general parameters, and use of common 3D finishing tool 
paths. 
 
• Explain the purpose, general parameters, and use of REST mill tool paths.  
• Explain the purpose, general parameters, and use of Pencil mill tool paths.  
 
 
 
  
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 200

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 200 · notability 0.5

```
Appendix A  Fundamentals of CNC Machining 
CNC Milling Work-Holding Examples 
Copyright 2012 HSMWorks, ApS  A-25 
Fan: Job-1 Setup 
 
 
G54 Datum:XY Same as soft jaw pocket center. Set G54 about .01 below the top of the shortest length of sawed stock. 
Op-1 
Face 
Tool (inch) 
.375 End 
Mill 
Speed(rpm) 
4100 
Feed XY(ipm) 
40. 
Feed Z(ipm) 
20. 
Finish part to thickness . Use light cuts to prevent part from being pulled out of vise.  Include enough rough passes to 
accommodate the tallest piece of stock to be machined. 
Op-2 
Drill 
Tool (inch) 
.125 Drill 
Speed(rpm) 
4600 
Feed XY(ipm) 
N/A 
Feed Z(ipm) 
18. 
Drill the three holes around the perimeter of the fan ring, and the locating hole for Op2. The locating hole will be used to set the 
part orientation for Job 2 so that the top and bottom fan blades surfaces match precisely. 
Op-3 
3D Rough 
Tool (in) 
.188 (3/16) 
End Mill 
Speed(rpm) 
8100. 
Feed XY(ipm) 
80. 
Feed Z(ipm) 
40. 
Rough the outside and inside surfaces of the fan ring to a depth of Z-.40. Leave stock of .005 on all surfaces. 
Op-4 
3D Finish 
Tool (in) 
.125 (1/8) 
Ball Mill 
Speed(rpm) 
8. 
Feed XY(ipm) 
8. 
Feed Z(ipm) 
4. 
Pre-finish the inside surfaces of the fan to remove all scallop steps. Use a spiral or circular path and a stepover of .09. Leave  .005 
stock on all surfaces. 
Op-5 
3D Finish 
Tool (in) 
.093 (3/32) 
Ball Mill 
Speed(rpm) 
10,000 
Feed XY(ipm) 
75. 
Feed Z(ipm) 
30. 
Finish the inside surfaces of the fan. Use a spiral or circular
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 203

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 203 · notability 0.44

```
Fundamentals of CNC Machining  Appendix A 
CNC Milling Work-Holding Examples 
 
A-28  Copyright 2012 HSMWorks, ApS 
7  Machine Job-2 (Bottom) 
Machine the bottom of the fan using the operations  listedin Figure 3 7. Select the appropriate tools and 
machining parameters. 
 
 
 
 
Figure 36: Job 2 Setup, Fan 
 
 
Fan: Job-2 Setup 
G55Datum: XY Same as soft jaw pocket center. Set G55from bottom of pocket to top of finished part (Z+.994 inches). 
Op-1 
Face 
Finish part to thickness. Use light cuts to prevent part from being pulled out of vise. 
Op-2 
Drill 
Peck drill hole in center of spindle. 
Op-3 
3D Rough 
Rough the bottom of the part leaving stock for finish passes. 
Op-4 
2D Contour 
Finish the OD of spindle. 
Op-5 
3D Finish 
Pre-finish the bottom blade surfaces leaving stock for finish machining. 
Op-6 
3D Finish 
Finish the bottom blade surfaces. 
Op-7 
2D Contour 
Use a ball mill to machine the slot in the spindle. 
Op-8 
2D Contour 
Finish the bottom of the blade shroud. 
Op-8 
3D Pencil 
Pencil mill to remove scallops in the fillets between the blades and housing and spindle. 
Op-10 
Chamfer Mill 
Create the chamfers on the edges of the housing. 
Figure 37: Fan, Job 2 Toolpaths 
 
 
  
G55
Locating Hole
Stock Material
Z+
X+
Y+
```

### TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf — page 157

**Source:** `TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf` page 157 · notability 0.4

```
Fundamentals of CNC Machining
9-1
Lesson 9
3D Toolpaths
Upon successful completion of this lesson, you will be able to:
• Explain how 3D tool compensation is calculated.
• Describe 3D cut tolerances.
• Identify geometric features common to 3D tool paths.
• Explain the purpose, general parameters, and use of common 3D roughing tool
paths.
• Explain the purpose, general parameters, and use of common 3D finishing tool
paths.
• Explain the purpose, general parameters, and use of REST mill tool paths.
•Explain the purpose, general parameters, and use of Pencil mill tool paths.
```

### TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf — page 201

**Source:** `TRIBAL + WIKI/Fundamentals_of_CNC_Machining-uploaded.pdf` page 201 · notability 0.5

```
Appendix A Fundamentals of CNC Machining
CNC Milling Work-Holding Examples
Copyright 2014 Autodesk, Inc. A-25
Fan: Job-1 Setup
G54 Datum:XY Same as soft jaw pocket center. Set G54 about .01 below the top of the shortest length of sawed stock.
Op-1
Face
Tool (inch)
.375 End
Mill
Speed(rpm)
4100
Feed XY(ipm)
40.
Feed Z(ipm)
20.
Finish part to thickness. Use light cuts to prevent part from being pulled out of vise. Include enough rough passes to
accommodate the tallest piece of stock to be machined.
Op-2
Drill
Tool (inch)
.125 Drill
Speed(rpm)
4600
Feed XY(ipm)
N/A
Feed Z(ipm)
18.
Drill the three holes around the perimeter of the fan ring, and the locating hole for Op2. The locating hole will be used to set the
part orientation for Job 2 so that the top and bottom fan blades surfaces match precisely.
Op-3
3D Rough
Tool (in)
.188 (3/16)
End Mill
Speed(rpm)
8100.
Feed XY(ipm)
80.
Feed Z(ipm)
40.
Rough the outside and inside surfaces of the fan ring to a depth of Z-.40. Leave stock of .005 on all surfaces.
Op-4
3D Finish
Tool (in)
.125 (1/8)
Ball Mill
Speed(rpm)
8.
Feed XY(ipm)
8.
Feed Z(ipm)
4.
Pre-finish the inside surfaces of the fan to remove all scallop steps. Use a spiral or circular path and a stepover of .09. Leave .005
stock on all surfaces.
Op-5
3D Finish
Tool (in)
.093 (3/32)
Ball Mill
Speed(rpm)
10,000
Feed XY(ipm)
75.
Feed Z(ipm)
30.
Finish the inside surfaces of the fan. Use a spiral or circular path and a stepover of .01.
Op-6
3D Pencil
Tool (in)
.093 (3/32)
Ball Mil
```
