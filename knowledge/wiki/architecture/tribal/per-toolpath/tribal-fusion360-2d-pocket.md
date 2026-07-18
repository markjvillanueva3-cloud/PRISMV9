---
name: tribal-fusion360-2d-pocket
software: fusion360
toolpath: 2d-pocket
displayName: "2D Pocket"
category: 2d-mill
coverageStatus: youtube+pdf
ytTipCount: 3
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:16.772Z
---

# fusion360 — 2D Pocket

**Category:** 2d-mill · **Slug:** `2d-pocket`

## Fields (UI dialog inputs)

- **Stepover**
- **Finish Pass**

## Buttons (UI actions)

- `Generate`

## Coverage status

Coverage: **youtube+pdf** · 3 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from YouTube transcripts

### Fusion 360 Tutorial: Program the Titan-1M (OP1) | ACADEMY @1908s

**Source:** [TITANS of CNC MACHINING](https://www.youtube.com/watch?v=hTxaDxr5-Ik&t=1878s) · video `hTxaDxr5-Ik`

```
so we're ready to go I'm gonna hit OK so we're ready to go I'm gonna hit OK just like I said you can see it drops just like I said you can see it drops just like I said you can see it drops down right there feeds in walks all the down right there feeds in walks all the down right there feeds in walks all the way around the park looks good way around the park looks good way around the park looks good beads out so now what do I have to do so beads out so now what do I have to do so beads out so now what do I have to do so now the the part is perfect now the the part is perfect now the the part is perfect - sighs now I've roughed it up finish - sighs now I've roughed it up finish - sighs now I've roughed it up finish the outside so now I have to finish this the outside so now I have to finish this the outside so now I have to finish this pocket and finish this pocket right here pocket and finish this pocket right here pocket and finish this pocket right here so let's do that by actually creating a so let's do that by actually creating a so let's do that by actually creating a 2d pocket so I'm gonna hit pocket my 2d pocket so I'm gonna hit pocket my 2d pocket so I'm gonna hit pocket my tool is already selected my rpms and tool is already selected my rpms and tool is already selected my rpms and feed rates are already selected I'm feed rates are already selected I'm feed rates are already selected I'm gonna go to geometry pocket selections gonna go to geometry pocket selections go
```

### Fusion 360 Tutorial: Program the Titan-1M (OP1) | ACADEMY @1915s

**Source:** [TITANS of CNC MACHINING](https://www.youtube.com/watch?v=hTxaDxr5-Ik&t=1885s) · video `hTxaDxr5-Ik`

```
down right there feeds in walks all the down right there feeds in walks all the way around the park looks good way around the park looks good way around the park looks good beads out so now what do I have to do so beads out so now what do I have to do so beads out so now what do I have to do so now the the part is perfect now the the part is perfect now the the part is perfect - sighs now I've roughed it up finish - sighs now I've roughed it up finish - sighs now I've roughed it up finish the outside so now I have to finish this the outside so now I have to finish this the outside so now I have to finish this pocket and finish this pocket right here pocket and finish this pocket right here pocket and finish this pocket right here so let's do that by actually creating a so let's do that by actually creating a so let's do that by actually creating a 2d pocket so I'm gonna hit pocket my 2d pocket so I'm gonna hit pocket my 2d pocket so I'm gonna hit pocket my tool is already selected my rpms and tool is already selected my rpms and tool is already selected my rpms and feed rates are already selected I'm feed rates are already selected I'm feed rates are already selected I'm gonna go to geometry pocket selections gonna go to geometry pocket selections gonna go to geometry pocket selections so I'm gonna come down here I'm actually so I'm gonna come down here I'm actually so I'm gonna come down here I'm actually gonna go to the bottom of the pocket gonna go to the bottom of the poc
```

### CNC Cutting with Fusion 360: A Step-by-Step Tutorial @247s

**Source:** [What Make Art](https://www.youtube.com/watch?v=lXSVlk3FqHc&t=217s) · video `lXSVlk3FqHc`

```
the stock once the stock is set up then the stock once the stock is set up then we can select postprocess and right now we can select postprocess and right now we can select postprocess and right now it just has it just has it just has one1 but what we can do is type Z Top one1 but what we can do is type Z Top one1 but what we can do is type Z Top this will be the prefix for any program this will be the prefix for any program this will be the prefix for any program that we name and that way we know that that we name and that way we know that that we name and that way we know that the Z is at the top for this program the Z is at the top for this program the Z is at the top for this program then we can select okay over here it then we can select okay over here it then we can select okay over here it says setup three I'll also rename this says setup three I'll also rename this says setup three I'll also rename this to pocket cuts and now I need to make a to pocket cuts and now I need to make a to pocket cuts and now I need to make a new cut the first thing to do is to new cut the first thing to do is to new cut the first thing to do is to select 2D 2D select 2D 2D select 2D 2D pocket on this page it's going to ask pocket on this page it's going to ask pocket on this page it's going to ask for a tool so I'll select tool I'm going for a tool so I'll select tool I'm going for a tool so I'll select tool I'm going to select the quarter-inch flat End Mill to select the quarter-inch fl
```

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 107

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 107 · notability 0.4

```
Fundamentals of CNC Machining  Lesson 7 
2D Milling Toolpaths 
7-6  Copyright 2012 HSMWorks, ApS 
7.2 - Standard CAD Views vs. CAM Views 
Figure 1 shows the part oriented as it is modeled in the mechanical CAD software. For CAM, it is helpful to 
display the part  in the same orientation as viewed while sitting on the CNC machine. For a Vertical 
Machining Center (VMC) this requires updating s tandard views to look like those shown in Figure 2. The G -
code file is generated in relation to the Work Coordinate System (WCS), so changing views is not required 
for CNC programming. It simply helps visualize CNC machining processes when using CAM.  
 
 
 
 
 
Figure 2: Prismatic Part (Orientation in CAM) 
7.3 –CAD Features vs. Machining Features 
Parts designed in SolidWorks ©are composed of features, including Extruded Cuts, Fillets, Chamfers, and 
Holes. A CNC milling machine creates these features usingmachining operations like Face, 2D Contour, 2D 
Pocket, and various Drilling operations.  
Knowing which machining operation to use to make which feature is sometimes obvious. For example, the 
slots in Figure 3 are created using a Slot Mill pocketing operatio n, the large extruded cut using 2D Pocket, 
and the Chamfer using Chamfer milling. 
However, sometimes these decisions are not so obvious. For example, the hole through the part center 
could be created using Drill, 2D Contour, 2D Pocket or Circular Pocket milling. You may wonder, is the large 
flat (where the holes begin) 
```

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

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 161

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 161 · notability 0.4

```
Fundamentals of CNC Machining  Lesson 9 
3D Toolpaths 
9-6  Copyright 2012 HSMWorks, ApS 
9.3 – 3D Toolpath Setups 
A typical 3D setup is shown in Figure 4. Runoff surfaces are sometimes required to expand the tool paths to 
the XY extents of the stock, or to cause the tool to continue to machine down in Z along vertical walls. 
Holes, fine details, or other features that will be created by subsequent operations may be suppressed or 
covered with a Check Surface to prevent the tool from entering these areas.  
 
Figure 4: Typical 3D Tool Path Setup 
 
 
9.4 – 3D Roughing 
3D tool paths can be grouped into two broad classifications: Roughing and Finishing. The aim of roughing 
tool paths is to remove excess material and, ideally, leave a constant thickness of stock all over the part for 
the finishing operations. 
CAM systems include many strategies for roughing but by far the most common is some variation of 3D 
pocketing. These tool paths work by slicing the part by planes normal to the Z-axis. A boundary is created at 
each level, offset by the stock allowance, and 2D pocket tool path generated from this boundary. The result 
is a tiered cake shape as shown by the shaded image in Figure 5.  
Stock Boundary
Runoff Surface
Suppressed Features
Check Surface
Cut Surfaces
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 192

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 192 · notability 0.62

```
Appendix A  Fundamentals of CNC Machining 
CNC Milling Work-Holding Examples 
Copyright 2012 HSMWorks, ApS  A-17 
Op-1 
Face 
Tool(in) 
.375End Mill 
2-Flute 
Speed(rpm) 
8150 
Feed XY(ipm) 
33. 
Feed Z(ipm) 
15. 
Usea stubby end mill to reduce chatter (flute length=.625). Stepover=.20, Take a Z f inish pass of .005 to ensure a good surface 
finish. 
Op-2 
2D Contour 
Tool(in) 
.375 End Mill 
2-Flute 
Speed(rpm) 
8150 
Feed XY(ipm) 
33. 
Feed Z(ipm) 
15. 
Contour OD. Rough Stepover =.2, Stepdown=.2. Finish XY=.01, No Finish Z needed. Number of rough passes depends on stock 
size. 
Op-3 
2D Pocket 
 
Tool(in) 
.375 End Mill 
2-Flute 
Speed(rpm) 
8150 
Feed XY(ipm) 
33. 
Feed Z(ipm) 
15. 
Rough and finish pocket with islands. Rough Stepover =.2, Stepdown=.2. Finish XY=.01, Finish Z=.005 
Op-4 
2D Contour 
 
Tool(in) 
.375 End Mill 
2-Flute 
Speed(rpm) 
8150 
Feed XY(ipm) 
33. 
Feed Z(ipm) 
10. 
Contour the hole in the center of the pocket with helical entry. Finish XY=.01, Finish Z - .010 below bottom so no flash ing is left 
after facing opposite side. 
Op-5  
2D Contour 
Tool(in) 
.125 Center 
Drill, 90Deg 
Speed(rpm) 
5000 
Feed XY(ipm) 
40. 
Feed Z(ipm) 
20. 
De-burr top edges by creating a .07 chamfer. Use line/arc lead in/out.  
Op-6  
CTR Drill 
 
Tool(in) 
.125 Center 
Drill, 90Deg 
Speed(rpm) 
6100 
Feed XY(ipm) 
N/A 
Feed Z(ipm) 
12. 
Center drill the four #2-56 holes. Dwell .5 seconds. 
Op-7  
Peck Drill 
 
Tool(in) 
Drill .07 Dia . 
(#50)  
Speed(rpm) 
10000 
Peck I
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 226

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 226 · notability 0.4

```
Appendix A  Fundamentals of CNC Machining 
CNC Milling Work-Holding Examples 
Copyright 2012 HSMWorks, ApS  A-51 
2 Machine Top Complete 
Machine the top complete. 
 
Microwave Housing: Job1 
 
 
Datum:Upper-left corner of stock. 
Op-1 
Face 
Face Part avoiding clamps. 
Op-2 
2D Rough 
Rough OD avoiding clamps. 
Op-3 
2D Rough 
Rough pocket. 
Op-4 
2D Finish 
Finish OD. Finish the part after roughing both the inside and outside so the part will stress relieve. 
Op-5 
2D Finish 
Finish pocket. 
Op-6 
3D Rough 
3D rough ramps. 
Op-7 
3D Finish 
3D finish ramps. 
Op-8 
2D Pocket 
Rough and finish pockets in bottom of pocket. 
Op-9 
Ctr Drill 
Center drill all holes. 
Op-10 
Drill 
Drill holes in flange for dowel pins used to locate the part for Job 2. 
Op-11 
Drill 
Drill holes in flange. 
Op-12 
Drill 
Drill holes in top face of part 
Figure 68: Microwave, Top Side 
 
  
G54 Z+
X+
Y+
```
