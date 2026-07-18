---
name: tribal-hypermill-automation-macros
software: hypermill
toolpath: automation-macros
displayName: "Macro Database"
category: automation
coverageStatus: pdf-only
ytTipCount: 0
pdfTipCount: 5
generatedAt: 2026-05-27T03:30:15.580Z
---

# hypermill — Macro Database

**Category:** automation · **Slug:** `automation-macros`

## Fields (UI dialog inputs)

- **Macro Library**

## Buttons (UI actions)

- `Run Macro`

## Coverage status

Coverage: **pdf-only** · 0 YouTube tips · 5 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf — page 1

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 1 · notability 0.5

```
4. Basics of CAM editing
Overview: From the model to the NC program
The modular structure of hyperMILL creates a flexible workflow from the model to the NC program.
Important elements of this workflow include:
1. C AM/CAD system
2. S pecifying the basic settings
Define the measurement system and storage directories for hyperMILL data. Configure the dia-
logue control, configure the tool and macro database and define further basic settings.
3. D efine workpiece origin and frame(s)
With the origin reference system (NC system), establish a connection to the machine coordinate
system.
Using a frame, define the current machining side and machining direction.
Use origins to control the NC output and apply origins when defining transformations.
4. D efine tool
Define a new tool or apply a tool from the tool database.
5. P repare manufacturing geometry (contours, surfaces, stock model)
Both 2D contours and CAD models can be used for 2D machining.
3D, 5-axis and turning jobs are based on a CAD model.
A stock model can be defined for various machining operations.
6. S tructure CAM project (define job list and jobs)
Define job and job list.
Use compound jobs to structure the workflow within a job list.
7. C ollision check preparations
Specify a milling area or turning area to define the collision-checked part of the CAD model.
Define a collision-checked clamping area to firmly fix the workpiece during machining.
8. C alculate and analyse toolpaths
Calculate toolpaths either directly in 
```

### TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf — page 6

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 6 · notability 0.5

```
hyperCAD-S Document dialogue page
(Only for hyperMILL for hyperCAD-S)
Cutter path display
Tool axis size: Define the size of the tool axis.
Collision point size: Define the size of the collision points.
Point size: Define the point size of the toolpath points.
Line width: Specify the line width of the toolpaths.
STL file display
Use the value for the M ax. STL file size to specify the maximum size (MB) of the stock file (*.STL/
*.VIS)that can be displayed in the hyperMILL browser.
SolidWorks Document dialogue page
(Only hyperMILL for SOLIDWORKS )
Cutter path display
In the T ool axis size input field, specify the size of the tool axis.
In the C oll. point size input field, specify the size of the collision points displayed.
STL file display
Use the value for the M ax. STL file size to specify the maximum size (MB) of the stock file (*.STL/
*.VIS) that can be displayed in the hyperMILL browser.
Model changes
Enable the W arn if model has been changed option to receive a hyperMILL message informing you about
any model changes.
Database dialogue page
Settings Wizard / manage database projects: Opens the hyperMILL CONFIGURATION Center to manage
the database projects. A database project consists of a tool database, a macro database and a colour
table.
On the D atabase dialogue page, you can also specify whether to work with an application database
project, a global database project or a user database project.
Global or user database projects that were defined in the hyperMILL CONF
```

### TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf — page 9

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 9 · notability 0.66

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
perMILL creates a list of G eneric Holes which correspond to the defined mapping conditions.
3. Then select all G eneric Holes with the same diameter and select the A pply macro function from
the shortcut menu.
4. In the macro database, select the job list with the required frame limit, enable the C
```

### TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf — page 42

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 42 · notability 0.5

```
Create a new entry (joblist, job, compound job, linking job, NC-event).
Electrode milling: Open the Electrode milling dialogue to generate the data for NC programming (job list,
milling area, stock, clamp, NC system and electrode feature).
Job list, Job...: Create a new element.
Via the J ob... function, open the S elect new operation dialogue that also contains a brief
description of the function and possible applications of the respective cycle in addition to
a graphical representation. Helpful for users who are not yet familiar with the software.
_______________________________________________________________
Compound job, Linking job, Linking job turning, NC event: Create a new element.
_______________________________________________________________
Open a job definition dialogue from the following areas: Probing, Turning, Drilling, 2D Milling, 3D Milling,
3D Advanced Milling, 5X Cavity Milling, 5X Surface Milling, 5X Tube Milling, 5X Blade Milling, 5X Multi-
Blade Milling, 5X Dental Milling.
Load from file: Load data of a job or job list that was previously exported with the U tilities →E xport function
in*.jstformat.
_______________________________________________________________
Macros >
Apply macros: Open the A pply macros dialogue.
View macro database: Open the current macro database.
New macro from job: Open the N ew macro dialogue and create a new macro based on the selected job.
_______________________________________________________________
Optimization: Optimisa
```

### TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf — page 84

**Source:** `TRIBAL + WIKI/hyperMILL_Manual-en-1.pdf` page 84 · notability 0.5

```
The Name of the joblist is copied from the electrode designation.
Global clearance plane: set by default to 10000.
Model
Milling area and stock are created in the hyperMILL browser, if the M illing area and S tock functions are
activated. The geometric data is copied from the selected electrode.
A clamp is created as an element in the hyperMILL browser if the C lamp function is activated. The
geometric data is copied from the holder of the selected electrode.
Activate the M achine function and select the desired machine. In doing so, the M achine function is
activated in the job list and the selected machine is transferred.
NCS
Use the NSC (NC system) to define the position of the zero point. Possible zero point positions include:
(1) Top of electrode area
(2) Top of reference contour
(3) Bottom of reference contour
(4) Bottom of electrode (only if n o clamping device is activated)
(4) Top of electrode holder (only if a clamping device is activated)
(5) Reference zero clamping system
Based on the selected zero point position, zero point and frame are created as elements in the hyperMILL
browser.
1 2 43 5
Macros
Available macros and selected macros are displayed on the dialogue page. To use a macro during
programming, move this to the Selected macros area. Generate the required macro beforehand. This is
carried out based on the generated electrode feature using the N ew macro from feature function.
Use the A llow multiple apply function to enable multiple use of feature-based 
```
