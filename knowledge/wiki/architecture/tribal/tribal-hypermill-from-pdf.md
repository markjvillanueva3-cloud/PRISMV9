# Tribal tips — hypermill (from TRIBAL+WIKI pypdf extraction)

_Generated 2026-05-27T02:25:13.576Z via `synthesize-tribal-tips-from-pages.mjs`. 50 tips, notability ≥ 0.5._

Sibling to any existing `tribal-hypermill-cam-tips.md` — does not clobber. Each tip cites source PDF + page + extraction timestamp per kilo soul provenance refuse.

### hyperMILL_Manual-en-4 — page 46 (notability 0.86)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 46 · 4755 chars · extracted 2026-05-27T02:22:53Z

```
Limitations: If the sum of the allowances is negative, the total amount must be less than the tool radius -
machining tolerance.
Example: tool radius = 5.00 mm, machining tolerance = 0.01 mm, allowance = -3.0 mm.
Additional allowance XY must be greater than -1.99 mm, e.g. - 1.98, for |-3.00mm +(-1.98mm)| < 5.00mm
-0.01mm.
The polyhedron offset is also taken into account as the stock allowance (see dialogue Milling area >
Definition). If several values are defined here, only the smallest value is taken into account.
Horizontal stepover (3): The infeed in the machining plane (XY plane) is specified as length dimension or
as a factor of the tool diameter: J:ae/T:Dia (= infeed width/tool diameter). Reference to different definitions
is given at the appropriate places.
1
2
3
Retract mode
The retract mode defines the Z level where the system executes horizontal infeed movements. The mode
set is valid for all machining directions (incl. approach, retract and return movement macros) and for the
profiles machined with them. Exception: Machining in zigzag mode without return macro.
Clearance distance (1): all retract and infeed movements are executed via the clearance distance. Starting
and 
```

### 11. 3D Machining (notability 0.84)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 1 · 8640 chars · extracted 2026-05-27T02:22:53Z

```
11. 3D Machining
Available machining cycles
Arbitrary Stock Roughing (page 870) : Z constant stock removal for stock models of any shape with the
option of stock model update. Machining proceeds parallel to the specified contour or parallel to axis.
Optimised Roughing (page 773) : Roughing and rest roughing of any workpieces. Calculate toolpaths
for standard pocket shapes such as rectangular and circular pockets. The model geometry and stock
model geometry will be taken into consideration to calculate highly efficient toolpaths and reduce direction
changes ("high speed cutting"). Machine remaining rest material areas based on the generated "resulting
stock".
Profile Finishing (page 793) : Allows multi-surface, collision-free milling with different guide curve strat-
egies; optional slope-dependent machining. XY optimised machining is offered for the X axis and Y axis
machining profiles.
Z Level Finishing (page 889) : Z constant finishing with optional slope-dependent machining. By adapting
the vertical stepdown values to the surface flow especially for steep surfaces, unnecessary fine infeed
increments are avoided and an optimal line distance is thus guaranteed.
Z Level Shape Finis
```

### hyperMILL_Manual-en-4 — page 39 (notability 0.84)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 39 · 5397 chars · extracted 2026-05-27T02:22:53Z

```
1
2
Parameters
Machining area
The vertical machining area is defined by the values for Top and Bottom of the component.
Top (3): maximum Z value in the current job.
Bottom (4): minimum Z value in the current job.
The area to be machined is normally recognised automatically. However, if the machining area is to be
manually limited in the Z direction, use the M anual top or Manual bottom functions.
Specify the values for top and bottom directly on the model by clicking the icon. Manually defined values
are not associative. If changes are made to the model geometry, the values will not automatically change
as well.
(1) Clearance plane, (2) C learance distance
1
2
3
A
B
4
Infeed / allowance
Vertical stepdown (1): The vertical stepdown determines the number of machining planes.
hyperMILL
908
Allowance (2): remaining material on the workpiece. Calculated in direction of the surface normals. Added
to the Clearance parameter during machining (see section Check tool).
For the 3D Arbitrary Stock Roughing cycle, the distance between the tool and the stock
and model is specified by the defined clearance only.
If the XY allowance is negative, end mills are not allowed.
If a bullnose end mill is
```

### hyperMILL_Manual-en-4 — page 57 (notability 0.84)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 57 · 4772 chars · extracted 2026-05-27T02:22:53Z

```
The area to be machined is normally recognised automatically. However, if the machining area is to be
manually limited in the Z direction, use the M anual top or Manual bottom functions.
Specify the values for top and bottom directly on the model by clicking the icon. Manually defined values
are not associative. If changes are made to the model geometry, the values will not automatically change
as well.
(1) Clearance plane, (2) C learance distance
1
2
3
A
B
4
Infeed / allowance
Vertical stepdown (1): The vertical stepdown determines the number of machining planes.
Allowance (2): remaining material on the workpiece. Calculated in direction of the surface normals. Added
to the Clearance parameter during machining (see section Check tool).
For the 3D Arbitrary Stock Roughing cycle, the distance between the tool and the stock
and model is specified by the defined clearance only.
If the XY allowance is negative, end mills are not allowed.
If a bullnose end mill is used, the negative XY allowance must be smaller or equal to the tool radius minus
the corner radius.
Example: tool radius (5 mm) - corner radius (4 mm) = 1 mm.
The stock allowance only applies for surfaces. For areas where the
```

### Example: tool radius (5 mm) - corner radius (4 mm) = 1 mm. (notability 0.84)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 60 · 6050 chars · extracted 2026-05-27T02:22:53Z

```
Example: tool radius (5 mm) - corner radius (4 mm) = 1 mm.
The stock allowance only applies for surfaces. For areas where there are no surfaces present there will be
no stock allowance calculated.
Z constant machining: In the last machining level, the allowance only applies in X and Y direction, not in Z
direction. The specification of negative stock allowances is possible as long as the sum of (negative) stock
allowance and tool corner radius does not become negative. When specifying negative stock allowances,
surface gaps should not exceed the following maximum values (otherwise, risk of ‘nose-diving’): 2 x (tool
radius + negative allowance).
Additional allowance XY: Additional horizontal stock allowance enables machining with different stock
allowances for the bottom and side walls of the machining area.
Limitations: If the sum of the allowances is negative, the total amount must be less than the tool radius -
machining tolerance.
Example: tool radius = 5.00 mm, machining tolerance = 0.01 mm, allowance = -3.0 mm.
Additional allowance XY must be greater than -1.99 mm, e.g. - 1.98, for |-3.00mm +(-1.98mm)| < 5.00mm
-0.01mm.
The polyhedron offset is also taken into account as the s
```

### Software documentation - hyperMILL_2D_3D — page 219 (notability 0.84)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 219 · 3755 chars · extracted 2026-05-27T02:24:42Z

```
9-3
3D machining
9Machining parameters
hyperMILL
In addition to the automatic collision check performed for the tool tip, the tool shank, tool
holder and extension can also be checked for collisions (see section Check tool).
Machining parameters
The basic processing parameters include information on collision detection in Z direction
(clearance distance and plane, retract mode), vertical machining area (surface, depth, allow-
ance), and vertical and horizontal infeed.
Safety
Clearance plane and clearance distance apply in the direction of the Z axis of the current
frame.
Clearance plane (1): Plane for rapid tool movements. Specification in absolute dimen-
sions Define the clearance plane by right-clicking on the icon. Select a point and confirm the
selection.
Clearance distance (2): distance to be defined to the toolpath to be milled. Above the clear-
ance distance, infeed takes place as rapid in the Z direction (A); below the clearance dis-
tance infeed takes place at the Z feedrate (B).
Machining area
The vertical machining area is defined by the values for Top and Bottom of the workpiece.
Top (3): maximum Z value in the current job.
Depth (4): minimum Z value in the current job.
```

### Software documentation - hyperMILL_2D_3D — page 229 (notability 0.84)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 229 · 3096 chars · extracted 2026-05-27T02:24:43Z

```
9-23
3D machining
9Tools Arbitrary Stock Roughing
hyperMILL
Fillet all toolpaths (3): corners of the model contour are rounded with the radius defined
above so that the machining contour deviates from the model contour at the corners.
Full cut behaviour
Reduce feedrate during full cut: machining is carried out using the reduced feedrate defined
in the tool panel. The feedrate is reduced to avoid causing damage to the tool from high cut-
ting forces.
Parameters
Machining area
Notes on definition of basic machining parameters:
Infeed
Allowance: when plane level detection is not enabled, this allowance only applies in the X
and Y directions, not in the Z direction on the last machining plane. When the plane level
detection is enabled, this stock allowance also applies to the Z direction.
Additional allowance XY: this additional horizontal stock allowance enables machining with
different stock allowances for the bottom and side walls of the machining area.
Example 1: roughing a pocket with a final horizontal stock allowance of 1 mm, and at the
same time finishing the bottom of the pocket (stock allowance = 0 mm):
Inputs: allowance = 0, additional allowance XY = 1.
Example 2: the bottom
```

### hyperMILL_2D_3D — page 438 (notability 0.82)

**Source:** `TRIBAL + WIKI/hyperMILL_2D_3D.pdf` page 438 · 2234 chars · extracted 2026-05-27T02:23:13Z

```
9-4
3D machining
9 Machining parameters
hyperMILL
Infeed
Vertical stepdown (1): The vertical stepdown determines the number of machining planes. 
Allowance (2): remaining material on the workpiece. Calculated in direct ion of the surface  
normals. Added to the clearance parameter during machining (see section Check tool).
Z constant machining: In the last machining level, the allowanc e only applies in X and Y  
direction, not in Z direction. T he specification of negative st ock allowances is possible as  
long as the sum of (negative) stock allowance and tool corner radius does not become nega-  
tive.
When specifying negative stock allowances, the surface gaps must not exceed the following  
maximum values (risk of "nose-diving"): 2 x (tool radius + negative offset).
Limitations: If the sum of the allowances is negative, the tota l amount must be less than the  
tool radius - machining tolerance.
Example: tool radius = 5.00 mm, machining tolerance = 0.01 mm, allowance = -3.0 mm. 
Additional allowance XY must be greater than -1.99 mm, e.g. - 1 .98, for |-3.00mm +(-  
1.98mm)| < 5.00mm -0.01mm. 
The polyhedron offset is also taken into account as the stock allowance (see dialogue
```

### Machining sequence (notability 0.78)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 30 · 4672 chars · extracted 2026-05-27T02:22:53Z

```
Machining sequence
The tool border behaviour defined on the Boundary dialogue page applies to all strategies.
Plane (1): Stock removal is carried out plane by plane. If there are several boundaries, these are machined
in sequence. If a user-defined plunge point has also been specified, machining only takes place within the
related boundary.
Pocket (2): Stock removal with infeed optimisation: Cavities are machined in sequence.
21
2
A B
1
21
A B
1 2
A B
Planar mode
Inside-out (1): Stock removal takes place parallel to the contour from the inside outwards.
Rapid in (2): The redundant paths resulting from the boundary are traversed in rapid mode. The tool
reference in boundary is set to past.
Optimised in: (3): in particular as regards more complex models, this option leads to optimisation of retract
movements and avoidance of unnecessary milling movements. Machining is carried out from the outside in
along the contour.
hyperMILL
872
1 2 3
Cutting mode
Climb milling, C onventional milling: In the case of contour-parallel machining with continuous orientation,
the following definitions apply: climb milling and conventional milling relate to clockwise rotating tools. To
perform climb mil
```

### hyperMILL_2D_3D — page 457 (notability 0.78)

**Source:** `TRIBAL + WIKI/hyperMILL_2D_3D.pdf` page 457 · 2260 chars · extracted 2026-05-27T02:23:13Z

```
9-23
3D machining
9Tools Arbitrary Stock Roughing  
hyperMILL
Fillet all toolpaths  (3): corners of the model contour are rounded with the radius defined  
above so that the machining contour deviates from the model contour at the corners.
Full cut behaviour
Reduce feedrate during full cut: machining is carried out using the reduced feedrate defined  
in the tool panel. The feedrate is reduced to avoid causing damage to the tool from high cut-  
ting forces.
Parameters
Machining area
Notes on definition of basic machining parameters:
Infeed
Allowance: when plane level detection is not enabled, this allowance onl y applies in the X  
and Y directions, not in the Z direction on the last machining plane. When the plane level  
detection is enabled, this stock allowance also applies to the Z direction.
Additional allowance XY : this additional horizontal stock allowance enables machining with  
different stock allowances for the bottom and side walls of the machining area.
Example 1: roughing a pocket with a final horizontal stock allo wance of 1 mm, and at the  
same time finishing the bottom of the pocket (stock allowance = 0 mm):
Inputs: allowance = 0, additional allowance XY = 1.
E
```

### hyperMILL_Manual-en-1 — page 51 (notability 0.74)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 51 · 4568 chars · extracted 2026-05-27T02:22:39Z

```
3.
 Click the icon to select the surfaces that are to be used as the basis for the filter definition or
4.
 click the icon in the L ayer line to select a layer that will be used for the filter definition.
Enable the U se wildcard (\\*) option to search for character strings that appear before or after the
placeholder in a layer name. Two placeholders can also be used to search for character strings in
between.
5.
 Click the icon to update the filter definition.
To delete a filter, click the Colour, Layer or Tag class line and use the D elete function on the shortcut
menu.
No filter function is available for hyperMILL for Autodesk ® Inventor®. Only the colour filter is available
for hyperMILL for SOLIDWORKS.
Tool safe distance: Minimum distance between the tool and the fixture.
The T ool safe distance defined for the F ixture area should not fall below 0.1 mm (0.004
inch). Values between 0.1 mm (0.004 inch) and 0.5 mm (0.02 inch) may lead to long
calculation times if the collision check is on and the stop/clip tolerance is small.
A collision check against the defined fixture area is not supported for jobs with the following tools: Cham-
fered Cutter, T-Slot Cutter, Woodruff Cutter, 
```

### hyperMILL_Manual-en-4 — page 31 (notability 0.74)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 31 · 5667 chars · extracted 2026-05-27T02:22:53Z

```
Max. step height: Enable if large axial infeeds are possible and, despite this, a continuous allowance is to
be achieved. An initial downwards vertical stepdown (1) is executed. The remaining material on inclined
walls is then removed from bottom to top according to the defined Max. step height (2). Valid values for
the Max. step height parameter must be less than or equal to the Vertical stepdown. The actual step height
may differ from the Max. step height.
Example calculation of the actual step height:
Vertical stepdown = 7, Max. step height = 2
7: 2 = 3.5, rounded up = 4.
7:4 = 1.75 = actual step height.
1
2
The strategy is particularly suitable for the high-performance machining of sloped walls and flat transitions.
Max. step height not enabled (1), Max. step height enabled (2).
Plane level detection
Off (1): The defined vertical stepdown is kept for each roughing level irrespective of the workpiece surface.
Automatic (2): If the defined vertical stepdown value is greater than the distance between two surfaces of
the workpiece, the system automatically inserts an intermediate step with a smaller vertical stepdown for
the planar surfaces around the entire workpiece circumference
```

### hyperMILL_2D_3D — page 99 (notability 0.74)

**Source:** `TRIBAL + WIKI/hyperMILL_2D_3D.pdf` page 99 · 2701 chars · extracted 2026-05-27T02:23:12Z

```
3-69
Basics
3Milling area, Turning area, Clamping area Collision check prepar ations  
hyperMILL
4.  click the icon to select a layer that will be used for the filter definition.
To delete a filter, click the Colour, Layer or Tag class line and use the Delete function on the  
shortcut menu.
Allowance: Define the allowance for the clamp.
Tab: Fixture area
Fixture area information
Specify a Name and Comment for the fixture.
File settings
Only available if the fixture has been defined in the Surface selection mode.
Click the Path button to define the storage location.
File prefix: Define the name of the fixture.
Functions on the shortcut menu: Milling/Turning areas
New milling area  / New turning area  / New fixture area : Create a new milling area, turning  
area or fixture area.
Edit... : Change definitions for the tab entry currently selected.
Copy / Cut / Paste / Delete: Entries are managed in the standard Windows manner.
Messages: Display messages (notices, errors, warnings) for the selected entry.
Usage: Display jobs in which the selected element is used.
hyperMILL setup: Open the Setup hyperMILL dialogue with the hyperMILL basic settings.
Feedbacks / No feedbacks: Turn the fee
```

### Software documentation - hyperMILL_2D_3D — page 50 (notability 0.74)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 50 · 4096 chars · extracted 2026-05-27T02:24:42Z

```
3-69
Basics
3Milling area, Turning area, Clamping area Collision check preparations
hyperMILL
4. click the icon to select a layer that will be used for the filter definition.
To delete a filter, click the Colour, Layer or Tag class line and use the Delete function on the
shortcut menu.
Allowance: Define the allowance for the clamp.
Tab: Fixture area
Fixture area information
Specify a Name and Comment for the fixture.
File settings
Only available if the fixture has been defined in the Surface selection mode.
Click the Path button to define the storage location.
File prefix: Define the name of the fixture.
Functions on the shortcut menu: Milling/Turning areas
New milling area / New turning area / New fixture area: Create a new milling area, turning
area or fixture area.
Edit... : Change definitions for the tab entry currently selected.
Copy / Cut / Paste / Delete: Entries are managed in the standard Windows manner.
Messages: Display messages (notices, errors, warnings) for the selected entry.
Usage: Display jobs in which the selected element is used.
hyperMILL setup: Open the Setup hyperMILL dialogue with the hyperMILL basic settings.
Feedbacks / No feedbacks: Turn the feedback displ
```

### hyperMILL_Manual-en-1 — page 67 (notability 0.70)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 67 · 3294 chars · extracted 2026-05-27T02:22:39Z

```
Set the start1and end2of the program run by selecting the lower and upper limits. For this purpose,
pick the required start and end points for the program run on the toolpath. You can also define the start
and end points directly using the two slide controls AandB.
3Reset the limits for the program run.
4Move the machine to the start of the simulation area.
5Approach the current position again, see6.
6Pick a new position by defining a toolpath point and move the machine to this point.
Starting and stopping the program run – regulate the speed
10001000
0.85 8.5
7Move the program run one step backwards.
8Start and stop the program run.
9Move the program run one step forwards.
1 0Set the speed for rapids (G0 movements).
1 1Set the speed for the normal feedrate (G1/2/3 movements).
The speed control refers to a path unit. Minimum = 0.01 mm, Maximum = 100 mm. If necessary, interpo-
lation is carried out between the individual blocks to provide a tool movement that is as uniform and
consistent as possible. If the increment is not smooth enough, blocks may also be omitted. The increment
has no influence on the collision check and material removal simulation.
Double-click one of the two spe
```

### Boundary projection (notability 0.68)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 20 · 6639 chars · extracted 2026-05-27T02:22:53Z

```
Boundary projection
The defined boundary can be projected in any desired direction in order to better limit the area to be ma-
chined. Boundary projections can also be used to delimit areas that are difficult to access. The boundary
can only be projected when using b all mills and not for the c ontact tool reference.
User defined projection direction: If this option is enabled, the selected boundary can be projected in a
specific direction and therefore limit the machining area.
Click the icon to define the P rojection direction for the selected boundary. Select the geometric element.
The values for the projection direction can also be defined manually (X, Y, Z direction).
Reverse the projection direction by clicking the icon and selecting the R everse option.
Milling surfaces
Milling surfaces: Use milling surfaces to define the area to be machined.
Manual boundaries: The milling surfaces can be delimited with one or more manual boundaries. The
boundaries must be located on the milling surfaces. When this strategy is used, the edge behaviour of the
tool is the same as with O n mode with regard to the surface normals on the boundary.
When machining takes place with the Soft bounding
```

### hyperMILL_Manual-en-1 — page 105 (notability 0.67)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 105 · 4276 chars · extracted 2026-05-27T02:22:39Z

```
5X: All recognised features are combined into one feature list, but a frame is not assigned to this list.
Mixed: If several holes have the same orientation, a feature list is created for this orientation and a frame is
assigned to the feature list. All other holes are combined into one feature list, but a frame is not assigned
to this list.
Split by diameter: In the case of multi-step holes, the diameter of the individual steps is taken into account
when arranging the features in the feature list (B). The machining direction (4) is included.
If, from the direction of machining, the diameter of a subsequent step is greater than the diameter of the
preceding step, the hole is divided into two or more S imple (3) and S ink Holes (2).
If the s plit by diameter function is disabled (A), this multi-step hole is included in the feature list as a f reely
defined hole (1).
1 2
3
4
A B
Check machinability: If this function is enabled (B), only holes that are in accessible areas are recognised
as a feature and displayed. In figure (A), the function is disabled; (1) shows the machining direction.
1
A B
Use colour table
When importing feature information from a CAD model, hyperMILL also recogni
```

### Software documentation - hyperMILL_2D_3D — page 87 (notability 0.67)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 87 · 3085 chars · extracted 2026-05-27T02:24:42Z

```
4-35
Feature and macro technology
4Manually in the Feature browser / Feature editor Generating features
hyperMILL
More Options
Offset to bottom: Features based on through-holes are created with the bottom offset speci-
fied here.
Use feature list: if this option is enabled, the drillings are saved as features in the existing
feature lists. Feature assignment is in reference to the frames assigned to feature lists. Fea-
ture lists that do not contain frames are ignored.
Frame creation mode
2D: A feature list is created for each hole orientation and a frame is assigned to each feature
list.
5X: All recognised features are combined into one feature list, but a frame is not assigned to
this list.
Mixed: If several holes have the same orientation, a feature list is created for this orientation
and a frame is assigned to the feature list. All other holes are combined into one feature list,
but a frame is not assigned to this list.
Split by diameter: In the case of multi-step holes, the diameter of the individual steps is taken
into account when arranging the features in the feature list (B). The machining direction (4) is
included.
If, from the direction of machining, the diameter of a s
```

### hyperMILL_Manual-en-2 — page 15 (notability 0.66)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-2.pdf` page 15 · 3449 chars · extracted 2026-05-27T02:21:11Z

```
• High degree of process reliability and material removal plus a high level of quality at the same time.
• Constant, low load on the tool and machine during the entire machining.
• Support for round inserts.
• Feedrate for fast positioning movements.
High Performance Mode: To use the function, select the H igh Performance Mode checkbox.
Strategy
Linear: (1), (2) Material is removed parallel to the turning axis in accordance with the specified I nfeed
direction (see Strategy dialogue page).
Ramping: (3), (4) Ramp-shaped material removal. Here, a ramp-shaped first cut is always made on a
plane and the remaining material is cleared on the same plane in a second cut parallel to the turning axis.
Zigzag: (2), (4) Machining with alternating cutting mode.
hyperMILL
358
1 2
3 4
Machining angle: If this option is activated, the material is not removed parallel to the turning axis but at
the defined machining angle. Available for the L inear and R amp strategy options. (1) option activated, (2)
option not activated.
1 2
Infeed
Infeed: Depth of the material removal.
Infeed factor: Area of the insert that is engaged in the material removal during machining.
hyperMILL
359
If the infeed is speci
```

### Frame limit (notability 0.66)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 9 · 4491 chars · extracted 2026-05-27T02:22:39Z

```
Frame limit
None: The hole features may be in all directions.
Limit 3D range: Specify the permissible maximum angle range of the A/B and C axes. Here, the A/B axes
correspond to the X/Y direction and the C axis corresponds to the Z direction of the selected coordinate
system.
Limit by planes: Use the normals of the selected planes as limits. A graphical preview (1) shows the
defined frame limit. The following applies to the Limit 3D range option:
Yellow: All jobs with a hole feature direction within the area marked in yellow will be merged into the
corresponding joblist.
Green: All jobs with a hole feature direction within the area marked in green will be merged into an
additionally created joblist.
1
The following example describes application of the F rame limit function.
Application
All holes with directions within the defined angle limit are to be merged into a single job list.
Procedure
1. Create the corresponding joblists and define the F rame limit necessary for the respective N C
system by specifying a permissible maximum angle range for the rotation axes (see description
above).
2. Use the F eature Mapping function. Enable the U se Generic Hole Only function to do so. hy-

```

### hyperMILL_Manual-en-4 — page 16 (notability 0.66)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 16 · 5882 chars · extracted 2026-05-27T02:22:53Z

```
X
Y
X
Z
1 2
3 3
3 3
Soft bounding
Only available for ball mills.
When the U se all other surfaces option is enabled, machining does not stop when the tool makes contact
with the s top surface (1), but when it exceeds the surface by the b lending factor (2). This factor is based on
the tool radius (standard = 0.05 x tool radius). Permitted values are between 0.02 and 0.2. In this way, full
machining of the m illing surface (3) is ensured.
Use the M anual selection option to manually select the bounding surfaces and stop surfaces.
X
Y
Z
1
2
3 1 3
hyperMILL
816
Define all surfaces that connect to the milling surfaces tangentially or that continue
vertically downward from their edge as bounding surfaces.
Stop surfaces
Use stop surfaces to define the area of the CAD model on which no machining takes place. Always use
stop surfaces whenever you need to ensure that the tool does not touch the stop surfaces.
Use all other surfaces: all (other) surfaces of the workpiece that are not used for milling are automatically
defined as stop surfaces excluded from machining.
Manual selection: Manual definition of stop surfaces to be excluded from machining.
Offset: the offset of the stop surfaces ex
```

### hyperMILL_Manual-en-4 — page 38 (notability 0.66)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 38 · 5544 chars · extracted 2026-05-27T02:22:53Z

```
An area is determined and graphically displayed within the 3 D Automatic Rest Machining cycle. Any further
machining occurs within the following cycle only: 3 D Automatic Rest Machining.
When the C ollision avoidance function is used, a m illing area that is not within the stock is also protected
against collisions. If the milling area that is outside of the stock only consists of perpendicular surfaces, no
collision avoidance takes place; instead, the milling path output is suppressed.
NC parameters
Machining tolerance: Enter the required machining tolerance. The value defines the accuracy with which
the calculation for the generation of the toolpath is carried out.
Maximum G1 length(1): maximum length of the G1 movements on planar surfaces which are output in
the NC program. Greater distances are subdivided into a corresponding number of G1 movements of the
specified length. Controlling the G1 length avoids too strong accelerations of the machine on large planar
surfaces.
1
Min. G0 distance (1): Distance between two machining areas that can be traversed – without tool contact –
close to the surface with machining feedrate (G1). In the case where gaps are greater than the maximum

```

### Steep areas (notability 0.66)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 45 · 4269 chars · extracted 2026-05-27T02:22:53Z

```
Steep areas
Z-Level / Normal (1): Machining is performed in Z-levels corresponding to the vertical infeed defined on the
Parameters input page.
Parallel (2): Machining is performed parallel to the flow direction of the rest material corresponding to the
horizontal offset defined on the Parameters input page.
1
2
2
Normal (1): Machining is performed parallel to the surface normals.
Z-Level (2): Machining is performed parallel to the Z-level.
21
 21
1 2
Two different machining strategies are available for each of the machining modes Z-Level and Normal.
Oneway (1): Machining is always performed in the same direction.
Zigzag (2): Machining with alternating orientation.
hyperMILL
932
1
 1 2
Infeed mode
The infeed mode can be defined as needed for all machining strategies.
Smooth: The infeed between the milling paths is the shape of a HSC loop.
Direct: The infeed motion is carried out on the shortest path in the machining feedrate (G1) on the surface.
If the linear movement would cause damage to the workpiece, the system guides the tool with surface
contact (no material being removed) around the workpiece.
hyperMILL
933
Parameters
Machining area
The area to be machined (Top and Bottom) i
```

### Software documentation - hyperMILL_2D_3D — page 222 (notability 0.66)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 222 · 3048 chars · extracted 2026-05-27T02:24:42Z

```
9-9
3D machining
9Subdivision of the machining areas Boundary
hyperMILL
Soft bounding: Only available for ball mills. Machining does not stop when the tool makes
contact with the bounding surface (1), but when it exceeds the surface by the blending factor
(2). This factor is based on the tool radius (standard = 0.05 x tool radius). Permitted values
are between 0.02 and 0.2. In this way, full machining of the milling surface (4) is ensured.
Use the All other surfaces option to set all areas not defined as milling surfaces (3) or stop
surfaces as bounding surfaces (1). Select the stop surfaces manually.
Use the Manual option to manually select the stop and bounding surfaces.
Tool reference
During some machining cycle a definition of the traverse area in dependence on the bound-
ary curve is possible. The following methods are available, depending on the cycle:
Toward: the milling path ends as soon as there is contact between the tool shank and the
boundary (1). This ensures that already machined surfaces lying outside the boundary are
not touched. Machining with exact boundary. This may result in unmachined areas (2).
Recommendation: Define all surfaces that connect to the milling su
```

### hyperMILL_Manual-en-1 — page 95 (notability 0.65)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 95 · 2124 chars · extracted 2026-05-27T02:22:39Z

```
1
2
3
4
5
1
2
3
The following edge type can be used for holes and as a transition between sinks or between holes and
sinks: Fillet (1), Sharp (2), Chamfer (3). The holes and sinks can feature threads (4), ISO fits (5) or spots
(6).
1 2 3 4 5 6
The following parameters can be defined for threads:
Designation: Select the designation from the list. Assign a name under U ser-defined. This designation is applied to the
feature name:Feature name<thread designation>. D iameter (1), Length (2), Pitch (3).
The following parameters can be defined for ISO fits:
Fit value: Select the fit value from the list. U pper allowance (4), Lower allowance (5) and L ength (6).
The following parameters can be defined for spots:
Top spot depth (7), Bottom spot depth (8).
hyperMILL
218
7
1
23
4 5
6
8
You can also define the I SO fit parameters using an XML file. This is done by evaluating theomI-
SOFitCatalog.xmlfile located in the global working spaceC:\Users\Public\Documents\OPEN
MIND\USERS\featTech\. You can define the following parameters:
• Type, Designation,
• Diameter_Min, Diameter_Max,
• Tolerance_Min, Tolerance_Max,
Example:
<ISOFit_Catalogs>
<ISOFit_Catalog Name="ISOFit|ISO_Fit" Loc_Filename="hmFT
```

### hyperMILL_Manual-en-2 — page 4 (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-2.pdf` page 4 · 5050 chars · extracted 2026-05-27T02:21:11Z

```
1 2
3 4
Machining angle: If this option is activated, the material is not removed parallel to the turning axis but at
the defined machining angle. Available for the L inear and R amp strategy options. (1) option activated, (2)
option not activated.
1 2
Infeed
Infeed: Depth of the material removal.
Infeed factor: Area of the insert that is engaged in the material removal during machining.
hyperMILL
314
If the infeed is specified, the infeed factor is calculated automatically via the corner
radius. If the infeed factor is specified, the infeed is calculated automatically via the
corner radius.
Corner radius * Infeed factor = Infeed.
Example: corner radius = 5 mm, infeed factor = 0.2, infeed = 1.
(1) Infeed factor = 1.0, (2) Infeed factor = 0.3.
r
1.0
0.3
1 2
Fillet radius: Additional toolpath filleting in the corners. Default: corner radius * 0.1.
Feedrate
Feedrate reposition: Feedrate for the repositioning between the infeed planes.
Unit: mm or inch/revolution of the workpiece.
Tool life control
Activate the function if the material to be machined requires the time the tool is engaged to be controlled.
Use the D istance option and the M ax. Distance parameter to define the maximum p
```

### hyperMILL_Manual-en-1 — page 34 (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 34 · 3928 chars · extracted 2026-05-27T02:22:39Z

```
For jobs with an activated T ransformation or activated 2 D multi index drilling option, no
preferred direction (solution selection) can be generated and output with the hyperMILL
SIMULATION Center. The following information is displayed:
• M ulti index drilling - no solution selection possible or
• J ob contains transformations - no solution selection possible
It is not possible to select the preferred direction. It is possible that a preferred direction
is simulated in the hyperMILL SIMULATION Center that is different from the preferred
direction used by the postprocessor. To ensure a correct simulation, the hyperMILL
VIRTUAL Machining Center should be used in these cases.
VIRTUAL Machining
The VIRTUAL Machining (V M) function is available with an appropriate licence for the
hyperMILL VIRTUAL Machining Center. Please contact your OPEN MIND partner.
Optimise the NC file.
Preferred direction
For machines with 5-axis kinematics, define the preferred spindle orientation in machining situations with
at least two solutions.
Use global definition: Enable to use the default settings of the VIRTUAL Machining postprocessor for
creating the NC file. Disable the option to use the settings of
```

### hyperMILL_Manual-en-1 — page 39 (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 39 · 3417 chars · extracted 2026-05-27T02:22:39Z

```
X
Z
1 2
Rapid smoothing
Available for the Clearance distance retract mode. Enable the H igh speed option to activate Rapid smooth-
ing (1).
Y
X
2
1
2
3
When machining in 5 X mode, the linking movements are defined without abrupt changes of direction. The S mooth factor
affects the shape of the smoothed movement as a ratio of the length of the connection line (2) to the required "height" of
the movement (3). If the selected smooth factor potentially leads to a collision, the movement is automatically rendered
collision free.
The C learance distance retract mode must be active. The L inking movement with the D istance angle limit ( S etup
dialogue page) must match the rapid smoothing.
NC event
Use NC events to clearly structure the program flow and influence programming by entering commands,
independent of job lists and jobs.
To create an NC event:
1. Use the N ew →N C event function on the browser's shortcut menu.
2. Define the E vent type and enter the respective command under E vent command.
hyperMILL
106
NC events can be freely moved in the job browser. To do this, select the NC event with the left mouse
button and move it to the required position while holding down the mouse but
```

### hyperMILL_Manual-en-4 — page 2 (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 2 · 6254 chars · extracted 2026-05-27T02:22:53Z

```
1
2
3
A
B
4
Strategy parameters
Different strategy parameters are available, depending on the machining cycle. Explanations are provided
in the respective machining cycle sections.
Cutting mode
Climb milling, C onventional milling: In the case of contour-parallel machining with continuous orientation,
the following definitions apply: climb milling and conventional milling relate to clockwise rotating tools. To
perform climb milling with an anticlockwise rotating tool, select conventional milling. For climb milling with
tools rotating clockwise, the following machining directions apply:
(1) Outside machining in clockwise direction.
(2) Inside machining in counterclockwise direction.
1
2
Boundary
Define the machining area, the edge behaviour of the tool at the machining boundaries (tool reference),
the plunge point for the machining.
Different methods are available for defining boundaries, depending on the machining cycle. Explanations
are provided in the respective machining cycle sections.
hyperMILL
760
Subdivision into the machining areas
Efficient machining with short machining times and minimised rework machining can often only be carried
out if the component has been subdivided
```

### hyperMILL_Manual-en-4 — page 5 (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 5 · 3764 chars · extracted 2026-05-27T02:22:53Z

```
P
PNY
NZ
NX
T
Z
X
Y
Max. compensation value: The value should be no more than 10% of the cutter diameter. If the parameter
is set to 0.1, the machining tool must be no more than 0.1 mm larger than the tool programmed in
hyperMILL.
The 3D path compensation function is available only with a specially adjusted postpro-
cessor. Without this adjustment, the NC program cannot correct this output and, as
a result, both the component and machine may be damaged if the milling geometry
used differs from the milling geometry used to calculate the toolpath. To adjust your
postprocessor, please contact your OPEN MIND partner.
hyperMILL
772
Optimised Roughing
Z Level Roughing and Rest Machining of components of any shape.
Machining in R oughing mode can either be performed with the Adaptive Pocket strategy or the convention-
al roughing method.
With the Adaptive Pocket strategy, the geometry of rectangular and circular pockets is fitted into the
roughing area in order to calculate highly efficient toolpaths (‘High speed cutting’).
As a result, higher feedrates can be achieved, direction changes are reduced and linear machine move-
ments lead to a high dynamic.
In Rest roughing mode, machine rema
```

### If necessary for machining, a switch can be made from the defined horizontal stepover (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 7 · 5723 chars · extracted 2026-05-27T02:22:53Z

```
If necessary for machining, a switch can be made from the defined horizontal stepover
to full cut when calculating the toolpath during the 3D Optimised Roughing cycle.
Scallop height part planes: Only available for Adaptive Pocket machining jobs with automatic Plane level
detection. Set the maximum permissible scallop height. The parameter depends on the vertical stepdown
that has been defined.
Stepover part planes: Only available for Adaptive Pocket machining jobs with automatic Plane level
detection. The value is calculated automatically based on the S callop height part planes parameter.
Max. step height: Enable if large axial infeeds are possible and, despite this, a continuous allowance is to
be achieved. An initial downwards vertical stepdown (1) is executed. The remaining material on inclined
walls is then removed from bottom to top according to the defined Max. step height (2). Valid values for
the Max. step height parameter must be less than or equal to the Vertical stepdown. The actual step height
may differ from the Max. step height.
Example calculation of the actual step height:
Vertical stepdown = 7, Max. step height = 2
7: 2 = 3.5, rounded up = 4.
7:4 = 1.75 = actual 
```

### hyperMILL_Manual-en-4 — page 24 (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 24 · 5894 chars · extracted 2026-05-27T02:22:53Z

```
Clearance distance (1): all retract and infeed movements are executed via the clearance distance. Starting
and end positions of an infeed movement in rapid are displaced in Z direction in order to guarantee a
collision-free linear infeed movement. The clearance distance is added to these positions.
Clearance plane (2): all retract and infeed movements are executed via the clearance plane.
X
Z
1 2
Safety
Clearance plane and clearance distance apply in the direction of the Z axis of the current frame.
Clearance plane (1): Plane for rapid tool movements. Specification in absolute dimensions Define the
clearance plane by right-clicking on the icon. Select a point and confirm the selection.
Traversing movements on the clearance plane are not checked with regard to collisions.
Therefore this plane must be placed at a sufficient distance above the surface of the
workpiece.
Clearance distance (2): Distance to the current toolpath to be milled. Above the clearance distance, infeed
takes place as rapid in the Z direction (A); below the clearance distance infeed takes place at the Z
feedrate (B).
(3) Top, (4) B ottom
hyperMILL
848
1
2
3
A
B
4
Boundary
Adjacent boundaries are not permitted. Th
```

### Max. axial lift: Maximum length of the lifting movement in the axial direction. (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 37 · 7745 chars · extracted 2026-05-27T02:22:53Z

```
Max. axial lift: Maximum length of the lifting movement in the axial direction.
The following tool movements are available as approach and retract behaviour for the M anual macro
mode: P erpendicular, C ircular, T angential, R amp (only as an approach macro). These additional tool
movements are only ever carried out if they do not result in a collision.
Feedrate macros
Feedrate for approach and retract macros. If no feedrate is defined here, the macros are run with the
Feedrate XY that is defined on the Tool dialogue page.
Return macro
If Return macro is enabled, horizontal stepover is executed between the milling paths via the clearance
plane or clearance distance. The activated approach or retract macro is executed for each retract or infeed
movement.
Off (A), Full (B): Available for the 5X Shape Offset Finishing cycle in Automatic macro mode.
X
Y
Z
A B
Macro simultaneous: Available for the cycles 5X Z Level Finishing, 5X Swarf Cutting 1 Curve and 5X
Shape Offset Finishing. The transition to the macro movement takes place without abruptly changing
direction and without slowing down the machining speed. Visible machining marks are avoided.
(1) Not activated, (2) Activated.
1 2
hyp
```

### Strategy (notability 0.64)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 41 · 5315 chars · extracted 2026-05-27T02:22:53Z

```
Strategy
Infeed strategy
Equidistant: Machining with constant infeed.
Profiles (1): It is possible to select multiple closed profiles (boundaries) that are not nested.
X
Z
X
Y
1
Offset: The selected profile curves are offset with the defined value (positive/negative).
Use as 3D curve: The selected profile curves are not projected onto the machining surfaces.
Machining always takes place parallel to a contour and the limited area is machined in Axis mode. The
path ends when the tool axis is located on the curve.
Path direction / Stepover direction
The path direction is either C lockwise or C ounterclockwise. The stepover direction is either i nside-out or
outside-in.
Toolpath connection
Skip first path: The first toolpath (1) is calculated but not machined. Avoids double machining when the
selected machining curve has been extracted from the toolpath in the last machining plane of a preceding
plane-by-plane cycle (for example, Z Level Finishing).
Connect factor: Length and rounding of the ramp-shaped transition between the planes, depending on the
tool diameter.
Ramp length = Tool diameter x Connect factor.
The Connect factor value should be defined in relation to the path distance 
```

### Software documentation - hyperMILL_2D_3D — page 177 (notability 0.64)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 177 · 4630 chars · extracted 2026-05-27T02:24:42Z

```
7-31
Drilling
7Tool Optimised deep Hole Drilling
hyperMILL
Guide sleeve: A guide sleeve is used to accurately guide the tool at the start of drilling; it can
be secured to the workpiece and suffices until drilling starts. Define the length of the guide
sleeve.
Coolant
Coolant off in crosshole: Enable this option to switch off the coolant at the start of crosshole
drilling and to switch it back on again at the end of crosshole drilling.
Point of coolant on: When machining with a pilot hole, enable the Lead in option. If you are
machining with a guide sleeve, enable the Clearance option.
Point of coolant off: Switch off the coolant during the retract movement either when driving
the tool out from the hole (Drilling depth), at the lead in level into the hole (Lead in) or at the
clearance distance level (Clearance).
Settings
Model
Definition of the collision checked part of the CAD model. For further information, see section
Milling area, Turning area, Clamping area.
Additional surfaces: Temporary safety surfaces to avoid unnecessary rapid travel move-
ments.
For information on the holder/spindle clearance, see the section Check tool.
NC parameters
Stop before execution: A stop marker 
```

### Software documentation - hyperMILL_2D_3D — page 230 (notability 0.64)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 230 · 2736 chars · extracted 2026-05-27T02:24:43Z

```
9-25
3D machining
9Tools Arbitrary Stock Roughing
hyperMILL
Automatic (2): if the defined vertical stepdown is greater than the distance between two sur-
faces of the workpiece, the system automatically inserts an intermediate level with a smaller
vertical stepdown value for the planar surfaces around the entire workpiece circumference.
Two methods are available for optimised machining:
Optimised - complete (3): the machining area is first roughed with a constant feedrate. In a
second, automatically generated roughing pass the rest material left on the plane-parallel
surfaces is removed.
Optimised - planes only (4): only the plane-parallel surfaces inside the boundary are
machined.
Additional horizontal offset factor: the tool behaviour can be modified by specifying an addi-
tional horizontal offset factor (recommended value 0.1 to 0.5). This yields better results, in
particular when machining smaller planar surfaces with a larger tool.
Optimised infeeds (1) by way of smooth, stretched infeeds between the single equidistant
cuts in the roughing level reduce the tool wear and tear and ensure smoother machine
movements. The length (2) of the ramp-shaped link depends on the tool radiu
```

### Thread Cutting (notability 0.62)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-2.pdf` page 33 · 6614 chars · extracted 2026-05-27T02:21:11Z

```
Thread Cutting
Creation of single or multiple start, cylindrical or conical, external and internal threads with constant pitch.
Infeed can be performed either with constant chip section or with constant X value.
Tool
For information on selecting a tool and defining tool parameters, see section Components for NC
tool (page 1433) .
Contours
Selection thread outer edge
Select the contour that is to be used as the T hread outer edge (1). Specify whether the selected contour
is to be used as the C ore diameter (2) or N ominal diameter (3). The following parameters are pre-defined
automatically when the thread outer edge is defined:
Diameter 1 (3) and D iameter 2 (only for conical threads: 4), Z position 1 (5) and Z position 2 (6) start
point/end point for the first/last thread turn, calculated within the cycle.
Offset factor 1 / O ffset factor 2: Length of the leading and trailing movement to the first/from the last thread
turn.
The following applies: Length = start factor/end factor x pitch.
Pitch (7): Distance between two thread crests (only positive values are permitted).
Thread depth (8): Is equal to the machining depth. Difference between nominal diameter (4) and core
diameter (2).
```

### hyperMILL_Manual-en-1 — page 8 (notability 0.62)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 8 · 4331 chars · extracted 2026-05-27T02:22:39Z

```
Angle
A, B, C: The resulting angle (Euler angle) is displayed and may be modified.
Zero point
X, Y, Z: The resulting frame origin is displayed and may be modified.
Vectors
X axis, Y axis, Z axis: Shows the vector components of the linear axes.
Select: Only available for hyperMILL for SolidWorks. Various elements can be used to define a frame.
Face, Plane, Sketch, Coordinate system: Select the required element directly in the graphics window.
View
Only available for hyperMILL for SOLIDWORKS.
Set frame: Sets the frame to the current view.
Define frame
Define coordinate system: Select an element in the graphics window and specify the origin of the coordi-
nate system.
Reverse the direction of the respective axis.
Change coordinate system
Move the coordinate system origin or project the coordinate system in the direction of the X, Y, Z
axis.
Bounding box
Position the coordinate system using a bounding box. Click the D isplay button to show the current bound-
ing box.
The colour of the bounding box corresponds to the default colour of the stock model (dialogue h yperMILL
settings →D ocument →C olours).
Enter the offset of the bounding box directly in the input line or define using the a
```

### hyperMILL_Manual-en-1 — page 45 (notability 0.62)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 45 · 4756 chars · extracted 2026-05-27T02:22:39Z

```
The postprocessor maps the frame system of all copies on the NCS and creates link rapids on the
clearance plane of the jobs.
2. Circular pattern in the plane with 5-axis postprocessor
Depending on the settings, the postprocessor outputs a different table/head orientation for each
position, if required. Additional movements occur between all copies, which correspond to a safe
positioning logic of the machine.
Linking movements created by the postprocessor are not collision-checked
against the 3D model. You therefore need to ensure that the clearance plane is
above all collision-relevant elements.
3. Using the frame ID for postprocessors
If your postprocessor requires you to define a frame I D or a frame c omment, your postprocessor is
incompatible with toolpaths that were created using the hyperMILL Transformation function.
For this reason, please only use toolpaths without transformations for these postprocessors.
4. Structuring the NC output
For recurring toolpaths that were created using t ransformations, a simplified NC output is not
generally provided (for example, as a subprogramme or part of the programme that repeats).
If you wish to have a suitable simplified NC output, con
```

### hyperMILL_Manual-en-4 — page 26 (notability 0.62)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 26 · 5373 chars · extracted 2026-05-27T02:22:53Z

```
If the intended machining direction is not achieved for one or more contours when the toolpaths are
generated, reverse the direction afterwards. . If you change the machining direction, you should change
the cutter position as well.
Please note: In the case of mirrored contours, the contour direction is always automati-
cally reversed.
Overlap: applies to closed contours. The toolpath will move the tool past the user-defined Start point until it
reaches the given End point.
Parameters
Tool position
Left (1), Right (2): The cutter moves beside the contour. The centre path of the cutter is output.
On contour (3): The cutter moves directly on the contour.
The right selection of the cutter position depends on the direction of the polyline (4).
1 2
3
2 1
4 4
Auto: The A uto option is enabled by default for the L eft and R ight tool positions. The contour direction is
set automatically, depending on the model geometry to be milled. There is no need to reverse the contour
manually. Prerequisite: The C heck model option must be enabled.
Allowance
Z offset contour: Remaining stock allowance in the Z direction
Stock allowance XY: Remaining stock allowance in the X and Y direction for machini
```

### hyperMILL_Manual-en-4 — page 36 (notability 0.62)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 36 · 6338 chars · extracted 2026-05-27T02:22:53Z

```
Production mode: Rapid tool movements occur as the shortest link between the infeed planes, while taking
into account a possibly defined allowance. This minimises the number of empty paths. If a direct lateral link
is not possible, a collision-free polygonal movement is made.
Safety
Clearance plane and clearance distance apply in the direction of the Z axis of the current frame.
Clearance plane (1): Plane for rapid tool movements. Specification in absolute dimensions Define the
clearance plane by right-clicking on the icon. Select a point and confirm the selection.
Traversing movements on the clearance plane are not checked with regard to collisions.
Therefore this plane must be placed at a sufficient distance above the surface of the
workpiece.
Clearance distance (2): Distance to the current toolpath to be milled. Above the clearance distance, infeed
takes place as rapid in the Z direction (A); below the clearance distance infeed takes place at the Z
feedrate (B).
(3) Top, (4) B ottom
hyperMILL
896
1
2
3
A
B
4
Side clearance / A xial clearance: Minimum distance in a lateral (1) or axial (2) direction from the surface of
the machined part. Clearance that can be travelled without a 
```

### hyperMILL_Manual-en-4 — page 53 (notability 0.62)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 53 · 6016 chars · extracted 2026-05-27T02:22:53Z

```
X
Z
1 2
Safety
Clearance plane and clearance distance apply in the direction of the Z axis of the current frame.
Clearance plane (1): Plane for rapid tool movements. Specification in absolute dimensions Define the
clearance plane by right-clicking on the icon. Select a point and confirm the selection.
Traversing movements on the clearance plane are not checked with regard to collisions.
Therefore this plane must be placed at a sufficient distance above the surface of the
workpiece.
Clearance distance (2): Distance to the current toolpath to be milled. Above the clearance distance, infeed
takes place as rapid in the Z direction (A); below the clearance distance infeed takes place at the Z
feedrate (B).
(3) Top, (4) B ottom
1
2
3
A
B
4
Side clearance / A xial clearance: Minimum distance in a lateral (1) or axial (2) direction from the surface of
the machined part. Clearance that can be travelled without a collision.
hyperMILL
964
Boundary
Stop surfaces
Stop surfaces: Limit machining using stop surfaces.
Offset: A positive value enlarges the boundary, while a negative value reduces it.
Trim to stock
Trim to stock: Enable to use the stock (1) to trim the toolpaths. A defined offset is 
```

### hyperMILL_Manual-en-4 — page 54 (notability 0.62)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-4.pdf` page 54 · 5540 chars · extracted 2026-05-27T02:22:53Z

```
1
Stop before execution: A stop marker in the toolpath causes the tool to stop.
Rework Machining
Milling of pre-calculated toolpaths that were generated in an earlier reference job using the Clip option but
were not machined to avoid collisions. A different tool is used for the Rework Machining to avoid collisions
at the respective areas.
The reference job must be selected from the jobs already defined. The reference can be changed subse-
quently on the S etup dialogue page.
Tools
The following cutter types can be used: ball mill, end mill and bullnose end mill.
When using tapered tools, collision avoidance is possible by taking into account the conical shape of the
tool in the toolpath calculation (see the Setup dialogue page).
Parameters
Rework area
Toolpath: Milling takes place along the toolpaths already machined in the reference job.
hyperMILL
968
Collision path: Milling takes place along the paths that were calculated in the reference job could but not
be machined due to collisions.
Connect smooth: This option smoothly connects toolpaths that run close to one another. Also see the
Zigzag option.
Allowance
Remaining allowance on the model in all directions.
Retract mode
The re
```

### Software documentation - hyperMILL_2D_3D — page 23 (notability 0.62)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 23 · 3171 chars · extracted 2026-05-27T02:24:42Z

```
3-15
Basics
3NC system NC system and frames
hyperMILL
NC system and frames
NC system
The NC system defines the position of the workpiece origin and the orientation of the
machining axes (XYZ).
The workpiece origin must match the reference point of the workpiece on the machine.
hyperMILL calculates all the toolpaths in the NC system. The NC system applies to an entire
job list at one time.
Frame
A frame defines the current machining side and orientation. In multi-axis indexing, a frame
has to be defined for each machining side. The assignment of the frame to a job takes place
in the job definition.
NC system (1)
Frames (2-4)
Correct job definition and therefore machining can be achieved only if the tool coordinate
system is in the correct position and orientation for the job, because:
All definitions for the vertical machining area are in relation to the frame (top, bottom), clear-
ance distance, XY plane, horizontal stepover.
The frame shares responsibility for collision checking during machining.
Surfaces that cannot be recognised from the tool axis perspective (1) are not machined.
All frames must be defined before generating the toolpaths. Subsequent move-
ment or rotation will 
```

### Software documentation - hyperMILL_2D_3D — page 24 (notability 0.62)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 24 · 3685 chars · extracted 2026-05-27T02:24:42Z

```
3-17
Basics
3Define Frames NC system and frames
hyperMILL
Angle
A, B, C: The resulting angle (Euler angle) is displayed and may be modified.
Zero point
X, Y, Z: The resulting frame origin is displayed and may be modified.
Vectors
X axis, Y axis, Z axis: Shows the vector components of the linear axes.
Select: Only available for hyperMILL for SolidWorks. Various elements can be used to define
a frame.
Face, Plane, Sketch, Coordinate system: Select the required element directly in the graphics
window.
View
Only available for hyperMILL for SolidWorks.
Set frame: Sets the frame to the current view.
Define frame
Define coordinate system: Select an element in the graphics window and specify the origin
of the coordinate system.
Reverse the direction of the respective axis.
Edit coordinate system
Move the coordinate system origin or project the coordinate system in
the direction of the X, Y, Z axis.
Bounding box
Position the coordinate system using a bounding box. Click the Display button to show the
current bounding box.
The colour of the bounding box corresponds to the default colour of the stockmodel (Setup
dialogue, Document > Colours dialogue page).
Enter the offset of the bounding box
```

### Software documentation - hyperMILL_2D_3D — page 25 (notability 0.62)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 25 · 4161 chars · extracted 2026-05-27T02:24:42Z

```
3-19
Basics
3Define Frames NC system and frames
hyperMILL
The following example describes application of the Frame limit function.
Application
All holes with directions within the defined angle limit are to be merged into a single job list.
Procedure
1. Create the corresponding joblists and define the Frame limit necessary for the respec-
tive NC system by specifying a permissible maximum angle range for the rotation axes
(see description above).
2. Use the Feature Mapping function. Enable the Use Generic Hole Only function to do so.
hyperMILL creates a list of Generic Holes which correspond to the defined mapping
conditions.
3. Then select all Generic Holes with the same diameter and select the Apply macro func-
tion from the shortcut menu.
4. In the macro database, select the joblist with the required frame limit, enable the Check
frame option and click Apply.
Result
All jobs whose feature orientation lies within the defined maximum angle range will be
included in the selected joblist.
A new joblist will be created for all jobs whose feature orientation lies outside the defined
frame limit.
General
Frame-Information
Enter the Name, ID (ID number) and, if necessary, a Comment. All
```

### Software documentation - hyperMILL_2D_3D — page 27 (notability 0.62)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 27 · 4462 chars · extracted 2026-05-27T02:24:42Z

```
3-23
Basics
3Examples Transformations
hyperMILL
The postprocessor maps the frame system of all copies on the NCS and creates link rapids
on the clearance plane of the jobs.
Circular pattern in the plane with 5-axis postprocessor
Depending on the settings, the postprocessor outputs a different table/head orientation for
each position, if required. Additional movements occur between all copies, which correspond
to a safe positioning logic of the machine.
Using the frame ID for postprocessors
If your postprocessor requires you to define a frame ID or a frame comment, your postproc-
essor is incompatible with toolpaths that were created using the hyperMILL Transformation
function.
For this reason, please only use toolpaths without transformations for these postprocessors.
Structuring the NC output
For recurring toolpaths that were created using transformations, a simplified NC output is not
generally provided (for example, as a subprogramme or part of the programme that repeats).
If you wish to have a suitable simplified NC output, contact your OPEN MIND dealer. Please
also bear in mind that a fee may be required for postprocessor enhancements.
Defining transformations
Transformations 
```

### Software documentation - hyperMILL_2D_3D — page 44 (notability 0.62)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 44 · 2445 chars · extracted 2026-05-27T02:24:42Z

```
3-57
Basics
3Defining a compound job Structuring CAM projects
hyperMILL
5X: Linking of 3D and 5-axis jobs. It is also possible to link the 2D cycles Pocket Milling and
Rest Machining in 5X mode.
Rapids
Specify the mode for the fast travel movements (rapids) of linked individual jobs.
Skip first and last: Skip the first infeed movement and last retract movement of the individual
sub-jobs.
Keep all rapids: Keep all infeed and retract movements of sub-jobs within the linking job.
Conditions
Use min. dist. G0: The movements between the jobs are executed as a direct link between
pairs of contour points in G1.
Min. G0 distance: Distance between two machining areas that can be traversed – without
tool contact – close to the surface with machining feedrate (G1).
Clearance mode
Planar / Radial: Specify how the toolpaths of the linked sub-jobs are linked. (1) Planar, (2)
Radial.
Linking job turning
Clearance
Clearance radius X: radius for rapid tool movements in the X direction (1).
Clearance plane Z: plane for rapid tool movements in the Z direction (2).
Clearance distance: distance from the tool to the workpiece in the X direction during linking
movements (3).
As of Version 2017.1, in Link
```

### Software documentation - hyperMILL_2D_3D — page 88 (notability 0.62)

**Source:** `TRIBAL + WIKI/Software documentation - hyperMILL_2D_3D.pdf` page 88 · 2424 chars · extracted 2026-05-27T02:24:42Z

```
4-37
Feature and macro technology
4Manually in the Feature browser / Feature editor Generating features
hyperMILL
The entity type FitDesignation can assume fit designations (example H7) and the entity type
ThreadDesignation the values M = Metric Coarse Pitch, Mx = Metric Fine Pitch, W = Whit-
worth and G = Gas Uni.
Several thread types are separated by ‘;’, with the order of the list determining the order of
the search.
The FeatureClass element type can accept designations of defined feature classes (for infor-
mation on feature classes, see section General information).
UseThreadNominalDiameter can assume the values 0 and 1. 0 = Reference value is the
core diameter of the thread, 1 = Reference value is the nominal diameter of the thread.
For information on using feature-based macros, see section Applying a feature-based
macro.
Use Generic Hole only: During the assignment of feature information from the CAD model,
Simple Holes, Sink Holes and Free defined Holes are transferred directly to the feature
browser as Generic Holes.
Min. tip angle: Define from which angle holes can be recognised as a tip or through hole
type. If the defined tip angle is larger than the angle in the hole, 
```

### hyperMILL_Manual-en-3 — page 3 (notability 0.60)

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-3.pdf` page 3 · 4504 chars · extracted 2026-05-27T02:20:52Z

```
20
10
0
-10
20
10
0
-10
1 2
Contour attributes
To define contour attributes (top, bottom), select the machining contour in the contour list. By making
multiple selections in this contour list, you can quickly define the same top and bottom values for several
contours.
Use the following buttons to change the order of selected contours or delete a contour. (1) To the top, (2)
Up, (3) Delete, (4) Down, (5) To the bottom.
Machining of open pockets
To machine an open pocket, link the job with a Pocket feature. The starting point in this process is outside
of the pocket, so that the entire machining process for the pocket can be carried out.
X
Y
X
Z
Open areas: Define the open areas of the pocket.
Add through three points: Select start point, end point and a further point on the contour.
Add through curves: Select curves.
Plunge points
Use plunge point: Define either a singular global plunge point for the 2D mode, or several Plunge points
using contour.
Plunge points using contour: Define separate plunge points for each pocket. The global plunge point is
supported by the Generic Pocket feature. A plunge point is not possible if the pocket contains open areas.
hyperMILL
641
Automatic plun
```
