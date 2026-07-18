---
name: tribal-mastercam-rest-rough
software: mastercam
toolpath: rest-rough
displayName: "Rest Roughing"
category: 3d-rough
coverageStatus: youtube+pdf
ytTipCount: 1
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:06.546Z
---

# mastercam — Rest Roughing

**Category:** 3d-rough · **Slug:** `rest-rough`

## Fields (UI dialog inputs)

- **Previous Tool Dia**

## Buttons (UI actions)

- `Compute`

## Coverage status

Coverage: **youtube+pdf** · 1 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from YouTube transcripts

### SolidCAM - Introduction to Imachining @217s

**Source:** [TriMech Group](https://www.youtube.com/watch?v=JceZ6aZp2_Q&t=187s) · video `JceZ6aZp2_Q`

```
sure I've cut everything that's needed. I could switch the step down to one I automatically choose myself or one that the software tells me and I can also set scallop hight. wether it be constant or not as well if needed. In this case, I've used two millimeters. From there We can go save and calculate and see what the tool path brings to us. What you're seeing is that we need to go to two depths for our Imachining strategy. And then we rough the stock upwards in the rest roughing strategy to get the shape is required within 3D. Using Solid CAM simulator we can exactly see what is being machined and either take into account the fixture thats holding this part. So if you've got move more complicated fixture, this can be accounted for as well, allowing us to have complete confidence in what you machine. With the end of this tool path this completes the end of our introduction into
```

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/InventorCAM2024_Multiaxis_Machining_User_Guide.pdf — page 5

**Source:** `TRIBAL + WIKI/InventorCAM2024_Multiaxis_Machining_User_Guide.pdf` page 5 · notability 0.5

```
Contents
v
Contents
1. Introduction
1.1 Adding a Multiaxis Machining Operation ............................................................ ..................................................2
2. CoordSys
3. Geometry
3.1 Strategy (Radial Roughing) ..................................................................................... ...............................................10
3.2 Machining surfaces (Radial Roughing) ................................................................. ...............................................11
3.3 Floor surfaces (Radial Roughing) .......................................................................... ...............................................11
3.4 Ceiling surfaces  ........................................................................................................ ...............................................12
3.4.1 Stock to leave on ............................................................................................. ...............................................12
3.5 Strategy (Wall Finishing) ......................................................................................... ...............................................12
3.6 Wall surfaces ............................................................................................................. ...............................................13
3.7 Strategy (Floor Finishing) ..........................................................................
```

### TRIBAL + WIKI/InventorCAM2024_Multiaxis_Machining_User_Guide.pdf — page 46

**Source:** `TRIBAL + WIKI/InventorCAM2024_Multiaxis_Machining_User_Guide.pdf` page 46 · notability 0.54

```
• Minimal curvature radius
This parameter specifies the minimum curvature radius of  the tool path for the adaptive roughing cycle.
The options of  Smooth corners, Smooth final contour, Smooth links, and Smooth distance /stepover 
% are available only when the Strategy is selected as Offset on the Geometry page.
The option of  Minimal curvature radius is available only when the Strategy is selected as Adaptive 
on the Geometry page.
Filtering is used to remove small pockets and segments which are not necessary to machined. 
• Type
You can choose the Type of  filtering as an Inscribed circle or Diagonal length.
• Inscribed circle: In this option InventorCAM automatically creates an inscribed circle to prevent the 
tool from entering extremely tight area of  the geometry.
• Diagonal length: In this option InventorCAM creates a bounding box with a specified diagonal length 
around the geometry to prevent the tool from entering extremely tight area of  the geometry.
• Threshold value in % of tool diameter
This value defines the diameter of  the inscribed circle or the diagonal length of  the bounding box in terms 
of  percentage of  the tool diameter.
• Remove corner pegs
With this option you can remove the material left over in the corners if  a high step over is used. Selecting the 
check box allows you to add an extra movement to the corners that removes the material left in the corners.
7.7 Rest rough
When the T echnology is selected as Radial Roughing, The Rest rough tab ena
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

### TRIBAL + WIKI/InventorCAM2024_SWARF_Machining.pdf — page 3

**Source:** `TRIBAL + WIKI/InventorCAM2024_SWARF_Machining.pdf` page 3 · notability 0.4

```
i
Contents
1. Introduction...............................................................................................................................................1 
2. CAM-Part Definition..................................................................................................................................5 
3. HSR and HSM Operations........................................................................................................................13 
4. iMachining and Rest Roughing................................................................................................................21 
5. SWARF Semi-Finishing............................................................................................................................35 
6. SWARF Finishing......................................................................................................................................47
```

### TRIBAL + WIKI/InventorCAM2024_SWARF_Machining.pdf — page 29

**Source:** `TRIBAL + WIKI/InventorCAM2024_SWARF_Machining.pdf` page 29 · notability 0.46

```
26
You must now add a rest roughing tool path to machine the material on the corners and to machine the large steps that 
are still remaining on the part.
36. Right click the last iMachining operation > Add Milling Operation > 3D HSR.
37. In the T echnology list, click Contour roughing.
38. Click T ool > Select.
39. Select BULL NOSE MILL as the tool.
40. Enter the tool parameters as shown in the image.
41. Select the Holder check box.
42. Select HSK A 63 ER 32X80 as the holder.
43. Click 
44. Click Passes.
45. Enter the parameters as shown in the image.

```
