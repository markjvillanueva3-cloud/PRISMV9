---
name: tribal-solidworks-cam-slot-mill
software: solidworks_cam
toolpath: slot-mill
displayName: "Slot Mill"
category: 2d-mill
coverageStatus: pdf-only
ytTipCount: 0
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:22.717Z
---

# solidworks_cam — Slot Mill

**Category:** 2d-mill · **Slug:** `slot-mill`

## Fields (UI dialog inputs)

- **Slot Width**

## Buttons (UI actions)

- `Generate Toolpath`

## Coverage status

Coverage: **pdf-only** · 0 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 4

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 4 · notability 0.54

```
Fundamentals of CNC Machining   
i 
 
 
Chapter 1: 
Introduction& CNC Process  
Overview 
Description ................................................................ 1-3 
Prerequisites .......................................................... 1-3 
Audience ................................................................ 1-3 
Course Design ........................................................ 1-3 
SRP vs. RP .................................................................. 1-4 
Prototype vs. Production Machining ......................... 1-4 
Required Tools and Equipment ................................. 1-4 
Lessons and Appendices ........................................... 1-5 
InstructionalResources .............................................. 1-5 
Recommended Use ................................................... 1-6 
Overview of CAD/CAM Process ................................. 1-6 
 
Chapter 2: 
ShopSafety 
Overview ................................................................... 2-3 
SafetyAwareness ....................................................... 2-3 
PersonalConduct& Shop Etiquette............................ 2-4 
Shop Clothing ............................................................ 2-4 
Proper Shop Attire Illustration ............................... 2-5 
General Safety Practices............................................ 2-6 
CNC Safety Practices ................................................. 2-6 
SafetyContract ...........................
```

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 28

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 28 · notability 0.4

```
Lesson 3  Fundamentals of CNC Machining 
CNC Tools 
Copyright 2012 HSMWorks, ApS  3-5 
3.3 - Corner Radius Tool 
 
Corner radius (also called Corner Round) tools are used to place a fillet on the outside corner of a part.   
 
 
Figure 4: Corner Round Tool 
 
3.4 - Slot Mill/Slotting Saw 
 
Slot mills include side milling cutters, slitting saws,  and Woodruff keyset cutters .  Slitting saws and side 
milling cutters are installed on a special arbor.  Woodruff cutters are single piece tools used for creating slots 
and undercuts that can be held in a standard tool holder. 
 
Figure 5: Slot Tools 
 
3.5 Hole-Making Tools 
 
Center-Spot Drills 
Center(spotting) drills are short and very rigid drills used to create a conic on the face of the part. Because 
they come to a sharp point and resist bending, they locate the hole precisely . The conic helps prevent  the 
subsequent drill from wobbling and ensure the drill is located precisely and drills straight down. 
Countersink drills are used to create the conical face for a machine screw.  Combined spotting-countersinks 
are used to create a screw clearance hole and countersink in one operation. 
Side Milling Cutter Woodruff CutterSlitting Saw
```

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

### TRIBAL + WIKI/Autodesk_CNCBOOK.pdf — page 108

**Source:** `TRIBAL + WIKI/Autodesk_CNCBOOK.pdf` page 108 · notability 0.58

```
Lesson 7  Fundamentals of CNC Machining 
2D Milling Toolpaths 
Copyright 2012 HSMWorks, ApS  7-7 
The operation s the CNC programmer chooses and their sequence dep ends on a bewildering number of 
factors, including feature size, tool used, capabilities of the machine,feature tolerance  and how the part is 
gripped. The rest of this chapter will introduce how to begin looking at 2D parts and begin making CNC 
process decisions. 
To begin with, i n most cases you want to  first machine the side of a 2D  part that has the most features; 
finishing as much of the part as possible with the first CNC setup. This is often the Front view of a part 
designed in SolidWorks. In this example, that means machining the side with the slots first (Front CAD view) 
rather than the opposite side.  
 
7.4 Toolpaths By Type and Use 
Before going further, it is helpful to understand how 2D toolpaths are classified in most CAM software. Table 
1 lists the common 2D tool paths by type and common use. For example, 2D contour, chamfer, and fillet 
toolpaths are often accomplished using  the 2D Contour menu selection. Of course, where each function is 
located will be slightly different depending on the CAM product, but this  list is appropriate to most modern 
CAM. 
Type Toolpath Common Uses 
Face Face • Finish face of part. 
Island Facing • Finish face with open sides 
and bosses. 
2D Contour 
Contour • Loops. 
• Partial loops. 
• Single edges. 
• Stick (single point) fonts. 
• Create dovetail, key
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
