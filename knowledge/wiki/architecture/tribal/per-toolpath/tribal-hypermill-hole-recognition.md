---
name: tribal-hypermill-hole-recognition
software: hypermill
toolpath: hole-recognition
displayName: "Hole Recognition"
category: automation
coverageStatus: youtube+pdf
ytTipCount: 2
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:15.724Z
---

# hypermill — Hole Recognition

**Category:** automation · **Slug:** `hole-recognition`

## Fields (UI dialog inputs)

- **Auto**

## Buttons (UI actions)

- `Recognize`

## Coverage status

Coverage: **youtube+pdf** · 2 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from YouTube transcripts

### Swiss CNC Programming Made Easy | Citizen L20 Demo with ESPRIT EDGE @639s

**Source:** [ESPRITCAM](https://www.youtube.com/watch?v=I32ZVjb9-2k&t=609s) · video `I32ZVjb9-2k`

```
Starting from the park operation, the Starting from the park operation, the cutoff tool moves into position and cutoff tool moves into position and cutoff tool moves into position and parks, ready for use. The sub spindle parks, ready for use. The sub spindle parks, ready for use. The sub spindle then moves in for the pickup followed by then moves in for the pickup followed by then moves in for the pickup followed by the cutff operation. These moves are the cutff operation. These moves are the cutff operation. These moves are coordinated through sync logic and coordinated through sync logic and coordinated through sync logic and enhanced by the machining pattern we enhanced by the machining pattern we enhanced by the machining pattern we applied earlier. Once the part is cut applied earlier. Once the part is cut applied earlier. Once the part is cut off, the transfer to the subspindle off, the transfer to the subspindle off, the transfer to the subspindle happens automatically, clean, efficient, happens automatically, clean, efficient, happens automatically, clean, efficient, and fully synchronized. and fully synchronized. and fully synchronized. With the part transferred to the With the part transferred to the With the part transferred to the subspindle, we'll begin by creating the subspindle, we'll begin by creating the subspindle, we'll begin by creating the remaining features on the back side. remaining features on the back side. remaining features on the back side. First
```

### Swiss CNC Programming Made Easy | Citizen L20 Demo with ESPRIT EDGE @641s

**Source:** [ESPRITCAM](https://www.youtube.com/watch?v=I32ZVjb9-2k&t=611s) · video `I32ZVjb9-2k`

```
cutoff tool moves into position and cutoff tool moves into position and parks, ready for use. The sub spindle parks, ready for use. The sub spindle parks, ready for use. The sub spindle then moves in for the pickup followed by then moves in for the pickup followed by then moves in for the pickup followed by the cutff operation. These moves are the cutff operation. These moves are the cutff operation. These moves are coordinated through sync logic and coordinated through sync logic and coordinated through sync logic and enhanced by the machining pattern we enhanced by the machining pattern we enhanced by the machining pattern we applied earlier. Once the part is cut applied earlier. Once the part is cut applied earlier. Once the part is cut off, the transfer to the subspindle off, the transfer to the subspindle off, the transfer to the subspindle happens automatically, clean, efficient, happens automatically, clean, efficient, happens automatically, clean, efficient, and fully synchronized. and fully synchronized. and fully synchronized. With the part transferred to the With the part transferred to the With the part transferred to the subspindle, we'll begin by creating the subspindle, we'll begin by creating the subspindle, we'll begin by creating the remaining features on the back side. remaining features on the back side. remaining features on the back side. First, I'll define a milling profile to First, I'll define a milling profile to First, I'll define a milling profile 
```

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf — page 106

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 106 · notability 0.54

```
 
 2
1
6
3 4
57
8
9
1
X
ZY
X
Z
Y
2
1 2
Result of Feature Mapping:
1. All holes that comply with the mapping conditions defined and are drilled in the same direction are
compiled into a feature in the feature list.
2. A new frame is created for a feature list if there are at least two holes with the same drilling
direction. All of the other features are combined in another feature list without a frame.
3. A hyperMILL feature appears as a new entry in the feature list and can be used in the job
definition.
Min. segment angle: Cylindrical surfaces with a segment angle greater than 270° are recognised as holes.
Feature Recognition
Interactive recognition of feature information from a CAD model. The following modules are available in
hyperMILL:
• Single Hole Recognition
• Plane Recognition
• Pocket Recognition
• Boundary Recognition
To recognise feature information from a CAD model:
1. In the hyperMILL browser, switch to the F eature tab.
2. Right-click the upper area of the browser and select the required function from the shortcut menu.
Single Hole Recognition
Geometric information is gathered from the holes in a model by defining a sample hole and searching for
comparison holes, whose parameters are compared with the base hole.
The S ingle Hole Recognition dialogue comprises the following dialogue pages: S ample hole, S earch and
Setup.
hyperMILL
240
Sample hole dialogue page
The parameters of a sample hole form the basis for recognising a hole.
Strategy
Automatic recognition: 
```

### TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf — page 107

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 107 · notability 0.6

```
(3) Number of directions
(2) Number of holes in this direction
Recognised holes are transferred to a feature list as a Generic Hole or Compound Feature.
Holes with the same parameters (Direction, Depth) are combined into a feature. Please note that the
defined base hole is also always included as a component of a feature.
Filter
Use a filter to limit the hoes to be recognised.
Same colour: Only holes of the same colour as the base hole are recognised.
Same layer: Only holes on the same layer as the base hole are recognised.
Same orientation: Only holes with the same orientation as the base hole are recognised.
Frame limit: Define a frame limit (angle) for the recognition process.
Frame: Define the frame to be used for the frame limit.
B axis / C axis: Use the two tool rotary axes to limit the angle for the hole recognition process. The B axis
corresponds to the X/Y direction and the C axis corresponds to the Z direction of the defined frame.
Z
X Y
+ 90°
+ 90°
The defined angle limit in each direction is shown in colour on a rotary ball. Yellow = machinable area
(directions from which holes are recognised). Grey = unmachinable area (directions from which holes are
not recognised). Example: angle B axis: 0° to 90°, angle C axis: 0° to 90°.
Same depth: Only holes of the same depth as the base hole are recognised.
Depth limit:Only holes are recognised which correspond to the depth limit (from/to).
Remove hole: Mark hole and in the short-cut menu select the R emove function.
Rever
```

### TRIBAL + WIKI/InventorCAM2024_Sim_5X_Milling_User_Guide.pdf — page 14

**Source:** `TRIBAL + WIKI/InventorCAM2024_Sim_5X_Milling_User_Guide.pdf` page 14 · notability 0.4

```
3
1. Introduction
Converting HSM to Sim 5-Axis Milling
Converting HSM to Sim 5-Axis Milling  operation converts HSM 3D tool paths to full 
5-Axis machining, collision-protected tool paths. This maintains optimum contact 
point between the tool and the part and enables the use of  shorter tools, for more 
stability and rigidity.
Contour 5-Axis Machining
The Contour 5-Axis Machining operation tilts the tool along a chained 3D profile drive 
curve, while aligning the tool axis according to the defined tilt lines, making it ideal for 
generating 5-Axis tool path for deburring and trimming.
Multiaxis Drilling
The Multiaxis Drilling  operation uses InventorCAM’s automatic hole recognition 
and then performs drilling, tapping or boring cycles, at any hole direction easily and 
quickly. All the advanced linking, tilting and collision avoidance strategies available in 
other sim 5-Axis operations are also available in this operation, to provide full control 
of  the generated Sim 5-Axis drilling tool path.
Swarf Machining
The SWARF Machining operation allows the side of  the tool to be tilted over to machine the side wall at the correct angle. 
SWARF cutting uses the whole cutting length of  the tool, resulting in better surface quality and shorter machining time.

```

### TRIBAL + WIKI/hyperMILL_2D_3D.pdf — page 170

**Source:** `TRIBAL + WIKI/hyperMILL_2D_3D.pdf` page 170 · notability 0.54

```
4-32
Feature and macro technology
4 Generating features Manually in t he Feature browser / Feature editor       
hyperMILL
Generating features
A feature can be created as follows:
1. In the job definition by sel ecting contours, boundaries, milling surfaces, stop surfaces or 
additional surfaces. In the first step, define the geometric element, then call the function 
(Create Contour Feature, Create Surface Group Feature, Create Strategy Curve Fea-
ture).
2. Manually in the feat ure browser and feature editor. See the information in section Man-
ually in the Feature browser / Feature editor.
3. Automatically in the feature b rowser by copying hole features from a CAD model using 
Feature Mapping (Hole).
4. Automatically in the feature browser through user-friendly co pying of features (holes, 
pockets, planes, boundaries) from a CAD model using Feature Recognition.
Manually in the Feature browser / Feature editor
For manual creation of a feature in the hyperMILL browser, switch to the Feature tab, in the                
top area of the feature browser select the desired feature via the shortcut menu and in the                
Feature editor define the parameters required. See chap. The Feature Editor for information            
on the feature editor.
Feature Mapping (Hole)
Automatic assignment of geometric feature information from a CAD model (solid) to a hyper-             
MILL feature. 
To start feature mapping in the hyperMILL browser, switch to the Feature tab and in the
```

### TRIBAL + WIKI/hyperMILL_2D_3D.pdf — page 177

**Source:** `TRIBAL + WIKI/hyperMILL_2D_3D.pdf` page 177 · notability 0.56

```
4-39
Feature and macro technology
4Manually in the Feature browser / Feature editor Generating feat ures 
hyperMILL
Feature Recognition
Feature Recognition describes the interactive detection of geom etric feature information         
from a CAD model. The following modules are available in hyperMILL: 
• Single Hole Recognition 
• Plane Recognition 
• Pocket / T-Slot Recognition 
• Boundary Recognition 
Procedure
1. In the hyperMILL browser, switch to the Feature tab
2. and select the desired function from the shortcut menu in the  upper area of the browser.
Single Hole Recognition
Geometric information is gathered from the holes in a model in two steps: by defining a sam-                
ple hose and searching for (compa rison) holes, whose parameters  are compared with the            
base hole (= sample hole).
Sample hole
The Sample hole parameters always form the basis for recognizing a hole.
Machining Strategy
Automatic recognition: Only select the surface of the base hole. All other surfaces are auto-              
matically recognised.
Manual Definition: Select all surfaces of the base hole.
Reference feature: The parameters of a reference feature are used as the basis for creating              
Generic Holes based on points/circles on surfaces. On the Search dialogue page, use the             
Points and surfaces option and select the surfaces/ points that are to be used to c reate the               
hole features. The orientation of the newly created hole features fo
```
