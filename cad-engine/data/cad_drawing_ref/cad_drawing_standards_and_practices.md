---
title: CAD Technical Drawing Standards and Best Practices Across All Major Software
author: PRISM Knowledge Base
doc_type: handbook
---

# CAD Technical Drawing Standards and Best Practices

## 1. Drawing Standards Overview

### ASME Y14.5-2018 (North America)
The authoritative standard for geometric dimensioning and tolerancing (GD&T). Covers:
- **Symbols**: Feature control frames, datum targets, dimension origins
- **Rules**: Rule #1 (envelope principle — perfect form at MMC), Rule #2 (RFS default)
- **Datum Reference Frames**: Three mutually perpendicular planes establishing orientation
- **Tolerancing Categories**: Form, Orientation, Location, Profile, Runout
- **Material Conditions**: MMC (Maximum Material Condition), LMC (Least Material Condition), RFS (Regardless of Feature Size)

### ISO 1101 / ISO GPS (International)
- ISO 1101: Geometrical tolerancing — form, orientation, location, runout
- ISO 5459: Datum reference systems
- ISO 1660: Profile tolerancing
- ISO 2768: General tolerances (Part 1: linear/angular, Part 2: geometrical)
- Key difference from ASME: distributes rules across multiple documents; often implies certain assumptions

### ASME Y14.100-2017 (Engineering Drawing Practices)
Defines standard drawing formats, title blocks, revision control, sheet sizes (A-E), border requirements.

## 2. Standard Drawing Views

### Orthographic Projection
- **Third-angle projection** (ASME/North America): Front view at center, top view above, right view to the right
- **First-angle projection** (ISO/Europe): Front view at center, top view below, right view to the left
- Always indicate projection symbol in title block

### Standard View Selection
| View | Purpose | When Required |
|------|---------|---------------|
| Front view | Shows most detail/features | Always |
| Top view | Shows depth relationships | When features exist on top |
| Right side view | Shows width relationships | When features exist on side |
| Section view | Internal features, hidden geometry | When internal features exist |
| Detail view | Enlarged area of complex features | When features are too small in standard views |
| Isometric/3D view | Overall shape understanding | Optional but recommended |
| Auxiliary view | True shape of inclined surfaces | When surface is not parallel to principal planes |

### Section View Types
- **Full section**: Cut through entire part, most common
- **Half section**: Cut through half (symmetric parts)
- **Offset section**: Cutting plane changes direction to pass through features
- **Revolved section**: Cross-section rotated 90 degrees in place
- **Removed section**: Cross-section placed away from view
- **Broken-out section**: Small area removed to show internal feature
- **Aligned section**: Features rotated into cutting plane

## 3. Dimensioning Best Practices

### General Rules
1. **Dimension once** — never repeat a dimension in multiple views
2. **Dimension to visible features** — avoid dimensioning to hidden lines
3. **Place dimensions between views** when possible
4. **Use baseline dimensioning** for critical tolerance stack-up features
5. **Use chain dimensioning** only when cumulative tolerance is acceptable
6. **Reference dimensions** are enclosed in parentheses: (25.00)
7. **Basic dimensions** are enclosed in rectangles: used with geometric tolerances

### Tolerance Classes (ISO 2768)
| Class | Linear (mm) | Angular |
|-------|-------------|---------|
| f (fine) | ±0.05 to ±0.5 | ±0°10' to ±0°30' |
| m (medium) | ±0.1 to ±1.0 | ±0°10' to ±1° |
| c (coarse) | ±0.2 to ±2.0 | ±0°15' to ±1°30' |
| v (very coarse) | ±0.5 to ±4.0 | ±0°30' to ±3° |

### Fit Types (ISO 286 / ANSI B4.1)
| Fit | Shaft/Hole | Example | Application |
|-----|-----------|---------|-------------|
| Clearance | H7/f6 | Running fit | Bearings, sliding |
| Transition | H7/k6 | Light press | Locating pins |
| Interference | H7/p6 | Force fit | Press-fit bearings |
| Loose running | H11/c11 | Free running | Pivots with clearance |

### Hole Dimensioning
- **Thru holes**: diameter symbol + "THRU" (e.g., Ø10 THRU)
- **Blind holes**: diameter + depth (e.g., Ø10 x 20 DEEP)
- **Counterbore**: Ø10 THRU, then ⌴Ø18 x 5 DEEP
- **Countersink**: Ø10 THRU, then ∠82° x Ø18
- **Tapped holes**: Thread callout + depth (e.g., M10x1.5 - 6H x 20 DEEP)

### Surface Finish Symbols (ISO 1302 / ASME Y14.36)
| Symbol | Ra (μm) | Ra (μin) | Process |
|--------|---------|----------|---------|
| ▽ (rough) | 6.3-12.5 | 250-500 | As-cast, as-forged |
| ▽▽ (medium) | 1.6-3.2 | 63-125 | Standard machining |
| ▽▽▽ (fine) | 0.4-0.8 | 16-32 | Fine machining, grinding |
| ▽▽▽▽ (very fine) | 0.05-0.2 | 2-8 | Lapping, polishing |

## 4. GD&T Feature Control Frames

### 14 Geometric Tolerances
**Form (no datum required):**
- ⏤ Straightness: Controls how straight a line element or axis is
- ⏥ Flatness: Controls how flat a surface is. Tolerance zone: two parallel planes
- ○ Circularity (roundness): Controls round cross-section. Tolerance: two concentric circles
- ⌭ Cylindricity: Controls entire cylinder surface. Tolerance: two coaxial cylinders

**Orientation (requires datum):**
- ⊥ Perpendicularity: Surface or axis 90° to datum. Tolerance: 0.05 to 0.5mm typical
- ∥ Parallelism: Surface or axis parallel to datum
- ∠ Angularity: Surface or axis at specified angle to datum

**Location (requires datum):**
- ⊕ Position: True position of feature. Most common GD&T callout
- ◎ Concentricity: Axis alignment (replaced by position in Y14.5-2018)
- ⊖ Symmetry: Median plane alignment

**Profile:**
- ⌓ Profile of a line: 2D cross-section control
- ⌔ Profile of a surface: 3D surface control. Most versatile tolerance

**Runout:**
- ↗ Circular runout: Single cross-section, part rotated 360°
- ↗↗ Total runout: Entire surface, part rotated 360°

### Position Tolerance Calculation
For a hole pattern:
- Position tolerance at MMC: T = 2 × (H_min - F_max) where H = hole, F = fastener
- Floating fastener: T_hole = H_MMC - F_MMC
- Fixed fastener: T_hole = (H_MMC - F_MMC) / 2

## 5. Platform-Specific Drawing Creation

### SolidWorks Drawing Creation
1. **New Drawing**: File → New → Drawing. Select sheet size (A-E), scale
2. **Model Views**: Insert → Drawing View → Model. Drag views from palette
3. **Projected Views**: Right-click existing view → Insert → Projected View
4. **Section Views**: Insert → Drawing View → Section. Click two points for cutting plane
5. **Detail Views**: Insert → Drawing View → Detail. Draw circle around area
6. **Dimensions**: Tools → Dimensions → Smart Dimension (or Insert → Model Items for auto-import)
7. **Annotations**: Insert → Annotations → Note/Surface Finish/Weld Symbol/GD&T
8. **BOM**: Insert → Tables → Bill of Materials (for assemblies)
9. **Best practice**: Use "Model Items" to import dimensions from 3D model, then clean up placement
10. **Drawing template**: Save custom template with title block, tolerances, projection symbol

**Key SolidWorks settings:**
- Tools → Options → Document Properties → Drafting Standard (ANSI or ISO)
- Tools → Options → Document Properties → Dimensions → Tolerance (set default)
- View → Toolbars → Annotation to show all annotation tools

### Fusion 360 Drawing Creation
1. **Create Drawing**: File → New Drawing → From Design
2. **Base View**: Drawing → Base View. Select orientation, scale
3. **Projected Views**: Drawing → Projected View (auto-generates from base)
4. **Section Views**: Drawing → Section View. Draw section line on existing view
5. **Detail Views**: Drawing → Detail View. Circle selection
6. **Dimensions**: Drawing → Dimension (linear, angular, radial, diameter)
7. **Centerlines**: Drawing → Centerline / Center Mark (critical for hole patterns)
8. **Notes**: Drawing → Text. Supports multi-line with leader
9. **Table**: Insert → Parts List for BOM
10. **Export**: Output → PDF or DWG/DXF

**Fusion 360 limitations:**
- Dimension associativity can break on model changes
- Limited GD&T symbol library compared to SolidWorks
- Section view hatching options are basic
- No built-in revision table (use notes)

### FreeCAD / CadQuery Drawing Creation (TechDraw Workbench)
1. **Switch to TechDraw**: Select TechDraw workbench
2. **New Page**: TechDraw → Insert Default Page (A4/A3/A2/A1/A0)
3. **Insert View**: TechDraw → Insert View. Select part in model tree
4. **Projection Group**: TechDraw → Insert Projection Group (auto front/top/right)
5. **Section View**: TechDraw → Insert Section View. Define cutting plane
6. **Detail View**: TechDraw → Insert Detail View. Select area
7. **Dimensions**: TechDraw → Dimensions → Insert Length/Horizontal/Vertical/Radius/Diameter/Angle
8. **Annotations**: TechDraw → Annotations → Insert Annotation (text notes)
9. **Surface Finish**: TechDraw → Insert Surface Finish Symbol
10. **Export**: File → Export → PDF or SVG

**CadQuery programmatic drawings:**
```python
import cadquery as cq
# CadQuery generates 3D models; for 2D drawings, export STEP then use FreeCAD TechDraw
# Or use cq.exporters for DXF cross-sections:
result = cq.Workplane("XY").box(100, 60, 30).edges("|Z").fillet(5)
cq.exporters.export(result, "part.step")
# For 2D projection:
cq.exporters.export(result.section(), "cross_section.dxf")
```

### AutoCAD / DraftSight (2D-Centric)
1. **Layout Tab**: Switch to paper space layout
2. **Viewport**: MVIEW command to create viewports into model space
3. **Scale**: Set viewport scale (e.g., 1:2, 1:5, 1:10)
4. **Dimensions**: DIMLINEAR, DIMALIGNED, DIMRADIUS, DIMDIAMETER, DIMANGULAR
5. **Dimension Styles**: DIMSTYLE → Create style per standard (ASME or ISO)
6. **Tolerances**: Set in dimension style: deviation, limits, or symmetric
7. **GD&T**: Use TOLERANCE command or geometric tolerance dialog
8. **Blocks**: Create title block as a block with attributes
9. **Layer Management**: Separate layers for dimensions, centerlines, hidden, visible, text
10. **Plot**: PLOT command → select printer/PDF, scale, area

**AutoCAD dimension style settings for manufacturing:**
- Text height: 2.5mm (ISO) or 3.0mm (ASME)
- Arrow size: 2.5mm
- Extension line offset: 1.5mm
- Dimension line spacing: 6mm minimum
- Tolerance display: deviation for machined features

### CATIA V5/V6 Drawing Creation
1. **Drafting Workbench**: Start → Mechanical Design → Drafting
2. **Front View**: Insert → Views → Front View. Select plane from 3D
3. **Projection View**: Insert → Views → Projection View (from existing)
4. **Section View**: Insert → Views → Section View. Define cutting plane
5. **Detail View**: Insert → Views → Detail View. Specify circle and scale
6. **Dimensions**: Insert → Dimensions (auto-detects feature type)
7. **Dress-up**: Insert → Dress-up → Centerline, Axis, Thread
8. **Tolerances**: Double-click dimension → Tolerance tab → set type and values
9. **GD&T**: Insert → Annotations → Geometrical Tolerance
10. **BOM**: Insert → Generation → Bill of Material

**CATIA best practices:**
- Use Generative Drafting (automatic from 3D) not Interactive Drafting (manual)
- Set standards: Tools → Standards → select ISO or ANSI
- Use dress-up features for threads, centerlines before dimensioning
- CATIA has the most comprehensive GD&T symbol library of all CAD systems

### Siemens NX Drawing Creation
1. **Drawing Application**: File → New → Drawing
2. **Base View**: Insert → View → Base. Select model, orientation, scale
3. **Projected View**: Insert → View → Projected (auto from base)
4. **Section View**: Insert → View → Section. Full/half/offset/aligned/broken
5. **Detail View**: Insert → View → Detail. Circle selection with scale factor
6. **Dimensions**: Insert → Dimension → Inferred/Horizontal/Vertical/Perpendicular
7. **PMI (Product Manufacturing Information)**: Dimensions stored directly on 3D model, can be imported into drawing
8. **GD&T**: Insert → Feature Control Frame. Full ASME Y14.5 and ISO 1101 support
9. **Annotations**: Insert → Note, Surface Finish, Weld Symbol, Datum Feature Symbol
10. **Model-Based Definition (MBD)**: NX supports MBD — dimensions/tolerances on 3D model, no 2D drawing needed

**NX unique capabilities:**
- PMI (Product Manufacturing Information) — industry-leading 3D annotation
- Fully associative drawings — model change auto-updates drawing
- WAVE geometry linker for assembly-level drawings
- Routing for harness and piping drawings
- Integrated FEM validation of tolerances

## 6. Drawing Checklist for Manufacturing

### Pre-Release Checklist
- [ ] All dimensions present — no feature left undimensioned
- [ ] Projection symbol (first-angle or third-angle) shown
- [ ] Scale stated on each view
- [ ] Material specification in title block
- [ ] Surface finish specified for all machined surfaces
- [ ] General tolerance block (e.g., ISO 2768-mK)
- [ ] GD&T applied to critical features (datum scheme defined)
- [ ] Thread callouts complete (size, pitch, class, depth)
- [ ] Hole callouts complete (diameter, depth, counterbore/countersink)
- [ ] Section views for all internal features
- [ ] No crossing dimension lines
- [ ] Revision block current
- [ ] Drawing number and part number match
- [ ] Weight/mass stated if required
- [ ] Edge break/deburr note present
- [ ] Heat treatment or surface treatment specified if required

### Common Drawing Errors
1. **Missing tolerances on critical features** — always GD&T critical fits
2. **Over-dimensioning** — creating redundant dimension chains
3. **Dimensioning to hidden lines** — use section views instead
4. **Wrong projection angle** — verify first-angle vs third-angle consistency
5. **Missing datum scheme** — position tolerance requires datum reference
6. **Tolerance stack-up issues** — use baseline dimensioning for critical chains
7. **Missing surface finish on mating surfaces** — always specify for fits
8. **Thread depth less than engagement** — ensure sufficient thread depth
9. **Inconsistent units** — never mix mm and inches on same drawing
10. **Missing edge break callout** — sharp edges are dangerous and impractical

## 7. Model-Based Definition (MBD) — The Future

### What is MBD?
Model-Based Definition eliminates 2D drawings by placing all dimensions, tolerances, notes, and surface finishes directly on the 3D model. Standards: ASME Y14.41-2019, ISO 16792:2021.

### MBD Advantages
- Eliminates drawing maintenance (single source of truth)
- Reduces interpretation errors
- Enables automated inspection (CMM programming from PMI)
- Supports digital thread (design → manufacturing → inspection)

### MBD Support by Platform
| Platform | MBD Maturity | PMI Standard |
|----------|-------------|--------------|
| Siemens NX | Excellent | ASME Y14.41 + ISO 16792 |
| CATIA V5/V6 | Excellent | ISO 16792 + ASME Y14.41 |
| SolidWorks | Good (MBD add-in) | ASME Y14.41 |
| Fusion 360 | Limited | Basic annotations |
| FreeCAD | Minimal | No native PMI |
| AutoCAD | N/A (2D only) | N/A |

### MBD Best Practices
1. Define saved views that show all annotations clearly
2. Use semantic PMI (machine-readable) not just visual annotations
3. Include datum targets on 3D model
4. Validate PMI completeness before release
5. Export as STEP AP242 for interoperability
