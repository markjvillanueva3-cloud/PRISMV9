---
name: tribal-mastercam-equidistant
software: mastercam
toolpath: equidistant
displayName: "Equidistant"
category: 3d-finish
coverageStatus: pdf-only
ytTipCount: 0
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:07.280Z
---

# mastercam — Equidistant

**Category:** 3d-finish · **Slug:** `equidistant`

## Fields (UI dialog inputs)

- **Stepover**

## Buttons (UI actions)

- `Compute`

## Coverage status

Coverage: **pdf-only** · 0 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/Manual 5-axis machining.pdf — page 57

**Source:** `TRIBAL + WIKI/Manual 5-axis machining.pdf` page 57 · notability 0.44

```
© Siemens AG All rights reserved. SINUMERIK, Manual, 5-axis machining
Key functions for 5-axis machining
3.5
57
Orientation interpolation of the axes
Linear interpolation (ORIAXES)
Linear interpolation
(ORIAXES)
Vector interpolation (ORIVECT/ORIPLANE)
Vector interpolation,
large circle interpolation
(ORIVECT/ORIPLANE)
With linear interpolation between a start 
and an end orientation, the necessary 
rotary axis movements are divided into equi-
distant sections.
This results in a wall surface that is not flat 
when using circumferential milling to create 
inclined walls, for example.
CAM systems attempt to compensate for this 
effect by using sufficiently small interpolation 
steps. For optimum results, another type of 
interpolation (such as vector interpolation) 
should be used for these kinds of applications.
Axis/Linear interpolation
ORIAXES Linear interpolation of the machine axes or interpolation of the 
rotary axes using polynomials (with active POLY)
1
2
1
2
In the case of vector interpolation between a 
start and an end orientation, the path is inter-
polated so that the orientation vector runs in a 
plane created by the start and end vectors.
The angle between the start and end vectors 
is divided into equidistant steps at a constant 
velocity. This kind of orientation interpolation 
can be used, for example, to enable precise 
machining of sloping, flat walls in one block.
Applications:
 Structural components within the aviation 
industry
 Face milling of mold maki
```

### TRIBAL + WIKI/InventorCAM2024_Pro3D_HSM_User_Guide.pdf — page 12

**Source:** `TRIBAL + WIKI/InventorCAM2024_Pro3D_HSM_User_Guide.pdf` page 12 · notability 0.4

```
5
1. Introduction
1.5 Constant Step Over Machining
This strategy creates an equidistant cut pattern on the machining surfaces. A constant 
distance between each contour is maintained so that the created cusps have the same 
height. This strategy is generally used to semi-finish or finish a component. It is best 
suited to machine steep as well as shallow areas.
1.6 Constant Step Over Rest Finish
This strategy is used to generate a tool path to remove all the non-machined areas left 
by the  previous bigger finishing tool. This strategy enables you to use smaller step over 
and smaller cutter size to machine only those areas that are left out by the previous tool. 
1.7 Pencil Machining
This strategy is beneficial in providing fast corners and fillets processing. 
It is performed via single- or multi-pencil cuts. To generate the Pencil 
tool path, fillet radius should be less than the current tool corner radius.  
1.8 Horizontal Machining
This strategy is designed to machine true horizontal surfaces (flat surfaces) of  a 3D 
component with tool path passes that are offset segments of  the horizontal surfaces 
boundary. This strategy is beneficial for finishing a component and best suited to 
machine large surfaces at multiple Z levels. Horizontal surfaces like parting surfaces also 
can be machined with this technology. Only true horizontal surfaces are detected in this 
technology.

```

### TRIBAL + WIKI/hyperMILL_Manual-en-3.pdf — page 31

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-3.pdf` page 31 · notability 0.52

```
With the P lane retract angle (6), specify the angle for the retract movement in the XY plane (only available
for the Roughing infeed strategy). Permissible values for the plane retract angle are between 0 and 90°.
Z
2
0°
5
 
0°
90°
5
 
0°180°
X
Y
0°
90°
Z Z
90°
1 4
6
2 2
4 4 4
5
5
5
Zigzag: The machining direction changes per section. The infeed movement follows the shortest path. The
horizontal stepover between two adjacent sections takes place with the machining feedrate (G1) (1).
Z
1
Inclined plunging
An inclined P lunge movement (2) can be realised with the P lunge angle (1).
1
 
Z
1
2
hyperMILL
753
Retract mode / Clearance
For further information, see sections Retract mode (page 759) and Clearance (page 432) .
Macros
Define the tool approach at the start point and the tool retraction from the end point of the contour.
Perpendicular (1): Perpendicular to contour tangent, enter length.
Tangential (2): On contour tangent, enter length.
Quarter circle (3), Half circle (4): In quarter or half circle, enter radius.
Macro extension: Only available for quarter circle. The macro is extended by the specified value. This
guarantees that the tool can fully retract from the groove without leaving behind any material (such as
chippings/shavings).This is particularly important for Bottom to top milling (see Parameters section).
X
Y1 2
3 4
Contour extension (open contours only)
Click Start to extend the contour (of the toolpath) by the specified amount for the approach movement.
Click 
```

### TRIBAL + WIKI/SolidCAM 2015 Milling Training Course - 2.5D Milling - InventorCAM2024_2.5D_Milling_Training_Course.pdf — page 15

**Source:** `TRIBAL + WIKI/SolidCAM 2015 Milling Training Course - 2.5D Milling - InventorCAM2024_2.5D_Milling_Training_Course.pdf` page 15 · notability 0.52

```
113
3. InventorCAM 2.5D Operations
3. Open pocket machining
Add a Machine Coordinate System for the positioning shown below to
machine the open pocket.
Add a new Pocket operation. In this operation, the open pocket machining strategy will be used.
Select the open pocket geometry chain as shown.
Click
 to confirm the selected chain. The Close Chain dialog box is displayed.
Close Chain dialog box
This dialog box is displayed when you confirm an open chain definition in the Geometry Edit
dialog box.
When you confirm this dialog box with the Y esbutton, the chain is closed with a line that connects
the start and the end points of the chain. The Mark line as open edge check box enables you to
mark the connecting line as open edge to perform open pocket machining.
When you click the No button, InventorCAM returns to the geometry definition and enables you
to close the chain manually by the model element selection.
114
Select the Mark line as open edge check box and confirm the dialog box with OK.
The open edge is marked.
Confirm the Geometry Edit dialog box by clicking
 .
Choose the Ø6 End mill for the operation.
Select the upper face of the model as the Upper level and the pocket floor as
the Pocket depth.
In the T echnologypage, choose the Contour machining strategy. Switch to
the Open pocket tab to define the parameters of the open pocket machining.
The open pocket extension can also be user-defined as tangent angle from the wall. Define the extension of the
tool path beyond the
```

### TRIBAL + WIKI/SolidCAM 2015 Milling Training Course - 2.5D Milling - InventorCAM2024_2.5D_Milling_Training_Course.pdf — page 16

**Source:** `TRIBAL + WIKI/SolidCAM 2015 Milling Training Course - 2.5D Milling - InventorCAM2024_2.5D_Milling_Training_Course.pdf` page 16 · notability 0.66

```
121
3. InventorCAM 2.5D Operations
3. Define the Geometry
Define the geometry chain on the upper edge of the hole as shown.
4. Define the T ool
Add a new Ø10 End mill tool for the operation.
5. Define the technological parameters
In the Modify section, click the Geometry button to check the
position of the tool relative to the geometry.
In this case, the default Left option set for T ool side meets the
requirements of the climb milling. Close the Modify Geometry dialog
box by clicking
 .
In the Offsets section, set the Wall offset value to 0.2. The allowance
of 0.2 mm will be left on the hole wall during the roughing. This
allowance will be removed with a separate finishing cut in the end
of the machining.
Select the Rough check box. Set the Step down to 2. The hole will be machined in three equidistant rough passes.
Select the Finish check box. Set the Step down to 6. The finishing will be performed in a single pass.
6. Define the Lead in and Lead out
For Lead in, choose the Arc option and use the default Radius value of 2. For Lead out, select the Same as Lead
in check box.
7. Simulate the operation
Perform the simulation of the operation in the SolidVerify mode.
122
8. Add a Contour 3D operation
Add a new Contour 3D operation to perform chamfering of the upper face of the cover.
9. Define the Geometry
Define the geometry chain on the upper edge of the face as shown.
10. Define the T ool
Add a new Ø10 Spot drill tool for the operation.
11. Define the Milling levels
In the L
```
