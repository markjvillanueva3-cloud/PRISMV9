# INVENTOR UI FUNCTION MAP
## Complete AI Automation Coverage for Autodesk Inventor 2024/2025

**Generated**: 2026-04-18
**Total Functions**: 847
**Already Covered in PRISM**: 67
**Gaps to Implement**: 780

---

## SUMMARY BY ENVIRONMENT

| Environment | Functions | Covered | Gaps |
|-------------|-----------|---------|------|
| Part Modeling | 156 | 12 | 144 |
| Sketch | 124 | 8 | 116 |
| Assembly | 142 | 15 | 127 |
| Sheet Metal | 68 | 5 | 63 |
| Weldment | 34 | 0 | 34 |
| Drawing | 128 | 8 | 120 |
| Frame Generator | 42 | 0 | 42 |
| Stress Analysis (Nastran In-CAD) | 56 | 4 | 52 |
| Inventor HSM/CAM | 78 | 15 | 63 |
| iLogic/Parameters | 19 | 0 | 19 |

---

## 1. PART MODELING ENVIRONMENT (156 functions)

### 1.1 Create Panel - Primitive Features

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Extrude | 3D Model > Create > Extrude | Profile, Distance, Direction (One/Two/Symmetric/All), Taper, Operation (Join/Cut/Intersect/NewSolid) | `PartFeatures.ExtrudeFeatures.AddByDistanceExtent(profile, distance, direction, operation, taper)` | GAP |
| Revolve | 3D Model > Create > Revolve | Profile, Axis, Angle (Full/Angle/To), Direction | `PartFeatures.RevolveFeatures.AddFull(profile, axis, operation)` | GAP |
| Sweep | 3D Model > Create > Sweep | Profile, Path, Orientation (Path/Parallel/Normal), Taper, Twist | `PartFeatures.SweepFeatures.AddUsingPath(profile, path, orientation)` | GAP |
| Loft | 3D Model > Create > Loft | Sections[], Rails[], Conditions (Free/Direction/Tangent/Smooth), Closed, CenterlineGuide | `PartFeatures.LoftFeatures.AddLoft(sections, rails, conditions)` | GAP |
| Coil | 3D Model > Create > Coil | Profile, Axis, Type (Revolution/Pitch/Height), Pitch, Height, Taper, Rotation | `PartFeatures.CoilFeatures.AddCoil(profile, axis, type, pitch, height)` | GAP |
| Rib | 3D Model > Create > Rib | Profile, Direction, Thickness, ExtentType, Draft | `PartFeatures.RibFeatures.AddRib(profile, direction, thickness)` | GAP |
| Emboss | 3D Model > Create > Emboss | Profile, Face, Depth, Taper, WrapToSurface, Direction (Emboss/Engrave/EmbossFromPlane) | `PartFeatures.EmbossFeatures.AddEmboss(profile, face, depth, direction)` | GAP |
| Decal | 3D Model > Create > Decal | Image, Face, Position, Scale, Rotation, ChainFaces | `PartFeatures.DecalFeatures.AddDecal(image, face)` | GAP |
| Boundary Patch | 3D Model > Surface > Boundary Patch | Edges[], Continuity (Free/Tangent/Smooth), AutomaticEdgeChain | `PartFeatures.BoundaryPatchFeatures.AddBoundaryPatch(edges, conditions)` | GAP |
| Ruled Surface | 3D Model > Surface > Ruled Surface | Edge, Direction, Distance, Angle, ExtentType | `PartFeatures.RuledSurfaceFeatures.AddRuledSurface(edge, distance, angle)` | GAP |

### 1.2 Create Panel - Work Features

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Work Plane (Offset) | 3D Model > Work Features > Plane | Face/Plane, Offset | `WorkPlanes.AddByPlaneAndOffset(face, offset)` | GAP |
| Work Plane (Angle) | 3D Model > Work Features > Plane | Edge, Angle | `WorkPlanes.AddByLineAndAngle(edge, angle, line)` | GAP |
| Work Plane (3 Points) | 3D Model > Work Features > Plane | Point1, Point2, Point3 | `WorkPlanes.AddByThreePoints(p1, p2, p3)` | GAP |
| Work Plane (Tangent) | 3D Model > Work Features > Plane | Face, Point | `WorkPlanes.AddTangentToSurface(face, point)` | GAP |
| Work Axis (Edge) | 3D Model > Work Features > Axis | Edge | `WorkAxes.AddByLine(edge)` | GAP |
| Work Axis (2 Points) | 3D Model > Work Features > Axis | Point1, Point2 | `WorkAxes.AddByTwoPoints(p1, p2)` | GAP |
| Work Axis (2 Planes) | 3D Model > Work Features > Axis | Plane1, Plane2 | `WorkAxes.AddByTwoPlanes(plane1, plane2)` | GAP |
| Work Axis (Normal) | 3D Model > Work Features > Axis | Face, Point | `WorkAxes.AddByNormalToSurface(face, point)` | GAP |
| Work Point (Vertex) | 3D Model > Work Features > Point | Vertex | `WorkPoints.AddByPoint(vertex)` | GAP |
| Work Point (3 Planes) | 3D Model > Work Features > Point | Plane1, Plane2, Plane3 | `WorkPoints.AddByThreePlanes(p1, p2, p3)` | GAP |
| Work Point (Center) | 3D Model > Work Features > Point | Loop/Edge | `WorkPoints.AddByCenterOfEntity(entity)` | GAP |
| UCS | 3D Model > Work Features > UCS | Origin, XAxis, YAxis | `UserCoordinateSystems.AddByThreePoints(origin, xAxis, yAxis)` | GAP |

### 1.3 Modify Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Fillet (Constant) | 3D Model > Modify > Fillet | Edges[], Radius | `PartFeatures.FilletFeatures.AddSimple(edges, radius)` | COVERED |
| Fillet (Variable) | 3D Model > Modify > Fillet | Edge, RadiusPoints[] | `PartFeatures.FilletFeatures.AddVariable(edge, startRadius, endRadius)` | GAP |
| Fillet (Full Round) | 3D Model > Modify > Fillet | CenterFace, Side1, Side2 | `PartFeatures.FilletFeatures.AddFullRound(center, side1, side2)` | GAP |
| Fillet (Face) | 3D Model > Modify > Fillet | Face1, Face2, Radius | `PartFeatures.FilletFeatures.AddFaceFillet(face1, face2, radius)` | GAP |
| Chamfer (Distance) | 3D Model > Modify > Chamfer | Edges[], Distance | `PartFeatures.ChamferFeatures.AddUsingDistance(edges, distance)` | COVERED |
| Chamfer (Distance & Angle) | 3D Model > Modify > Chamfer | Edge, Distance, Angle, Face | `PartFeatures.ChamferFeatures.AddUsingDistanceAndAngle(edge, distance, angle)` | GAP |
| Chamfer (Two Distances) | 3D Model > Modify > Chamfer | Edge, Distance1, Distance2, Face | `PartFeatures.ChamferFeatures.AddUsingTwoDistances(edge, d1, d2)` | GAP |
| Shell | 3D Model > Modify > Shell | Thickness, RemoveFaces[], Direction (Inside/Outside/Both) | `PartFeatures.ShellFeatures.AddShell(thickness, faces, direction)` | COVERED |
| Face Draft | 3D Model > Modify > Draft | Faces[], PullDirection, DraftAngle, FixedEdge | `PartFeatures.FaceDraftFeatures.AddFaceDraft(faces, pullDir, angle)` | GAP |
| Split Face | 3D Model > Modify > Split | Face, SplitTool, RemoveFaces | `PartFeatures.SplitFeatures.AddSplit(face, tool, remove)` | GAP |
| Split Body | 3D Model > Modify > Split | Body, SplitTool, KeepAll | `SplitFeatures.TrimSolid(body, tool)` | GAP |
| Combine (Join) | 3D Model > Modify > Combine | Base, Toolbodies[], Operation (Join/Cut/Intersect) | `CombineFeatures.Add(base, tools, kJoinOperation)` | GAP |
| Combine (Cut) | 3D Model > Modify > Combine | Base, Toolbodies[] | `CombineFeatures.Add(base, tools, kCutOperation)` | GAP |
| Combine (Intersect) | 3D Model > Modify > Combine | Base, Toolbodies[] | `CombineFeatures.Add(base, tools, kIntersectOperation)` | GAP |
| Move Bodies | 3D Model > Modify > Move Bodies | Bodies[], TransformMatrix | `MoveFeatures.AddMoveFeature(bodies, matrix)` | GAP |
| Copy Object | 3D Model > Modify > Copy Object | Source, Target | `CopyObject(source)` | GAP |
| Delete Face | 3D Model > Modify > Delete Face | Faces[], Heal | `DeleteFaceFeatures.Add(faces, heal)` | GAP |
| Replace Face | 3D Model > Modify > Replace Face | ExistingFace, NewFace | `ReplaceFaceFeatures.Add(existing, new)` | GAP |
| Thicken | 3D Model > Surface > Thicken | Surfaces[], Thickness, Direction | `ThickenFeatures.Add(surfaces, thickness, direction)` | GAP |
| Offset Surface | 3D Model > Surface > Offset | Surface, Distance | `OffsetFeatures.Add(surface, distance)` | GAP |
| Stitch | 3D Model > Surface > Stitch | Surfaces[], Tolerance | `StitchFeatures.Add(surfaces, tolerance)` | GAP |
| Sculpt | 3D Model > Surface > Sculpt | Surfaces[], Direction | `SculptFeatures.Add(surfaces, direction, solid)` | GAP |
| Trim | 3D Model > Surface > Trim | Surface, TrimTool, KeepSide | `TrimFeatures.Add(surface, tool, keepSide)` | GAP |
| Extend | 3D Model > Surface > Extend | Edges[], ExtentType, Distance | `ExtendFeatures.Add(edges, extentType, distance)` | GAP |

### 1.4 Pattern Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Rectangular Pattern | 3D Model > Pattern > Rectangular | Features[], Direction1, Count1, Spacing1, Direction2, Count2, Spacing2, Compute (Identical/Adjust/Optimized) | `RectangularPatternFeatures.Add(features, dir1, count1, spacing1, dir2, count2, spacing2)` | COVERED |
| Circular Pattern | 3D Model > Pattern > Circular | Features[], Axis, Count, Angle, Fitwithin | `CircularPatternFeatures.Add(features, axis, count, angle)` | COVERED |
| Mirror Feature | 3D Model > Pattern > Mirror | Features[], MirrorPlane | `MirrorFeatures.Add(features, mirrorPlane)` | COVERED |
| Sketch Driven Pattern | 3D Model > Pattern > Sketch Driven | Features[], SketchPoints | `SketchDrivenPatternFeatures.Add(features, sketch)` | GAP |

### 1.5 Hole Features

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Simple Hole | 3D Model > Modify > Hole | Placement, Diameter, Depth, Termination | `HoleFeatures.AddDrilledHole(placement, diameter, depth)` | COVERED |
| Counterbore Hole | 3D Model > Modify > Hole | Placement, HoleDia, CboreDia, CboreDepth, HoleDepth | `HoleFeatures.AddCounterboreHole(placement, holeDia, cboreDia, cboreDepth)` | COVERED |
| Countersink Hole | 3D Model > Modify > Hole | Placement, HoleDia, CsinkDia, CsinkAngle | `HoleFeatures.AddCountersinkHole(placement, holeDia, csinkDia, csinkAngle)` | GAP |
| Spotface Hole | 3D Model > Modify > Hole | Placement, HoleDia, SpotDia, SpotDepth | `HoleFeatures.AddSpotFaceHole(placement, ...)` | GAP |
| Tapped Hole | 3D Model > Modify > Hole | Placement, ThreadType, Size, Class, Depth, FullDepth | `HoleFeatures.AddTappedHole(placement, threadInfo)` | COVERED |
| Tapered Tapped Hole | 3D Model > Modify > Hole | Placement, ThreadType, Size, TaperAngle | `HoleFeatures.AddTaperedTappedHole(...)` | GAP |
| Clearance Hole | 3D Model > Modify > Hole | Placement, Standard, Fastener, Fit | `HoleFeatures.AddClearanceHole(...)` | GAP |

### 1.6 Thread Features

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Thread (External) | 3D Model > Modify > Thread | Face, ThreadType, Size, Class, Direction, FullLength | `ThreadFeatures.Add(face, threadInfo, kExternal)` | COVERED |
| Thread (Internal) | 3D Model > Modify > Thread | Face, ThreadType, Size, Class, Direction | `ThreadFeatures.Add(face, threadInfo, kInternal)` | COVERED |

### 1.7 Plastic Features

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Grill | 3D Model > Plastic Part > Grill | Boundary, SlotType, RibType, Parameters | `GrillFeatures.Add(...)` | GAP |
| Boss | 3D Model > Plastic Part > Boss | Placement, Diameter, Height, Draft, HeadType | `BossFeatures.Add(...)` | GAP |
| Rest | 3D Model > Plastic Part > Rest | Placement, Diameter, Height, Draft | `RestFeatures.Add(...)` | GAP |
| Snap Fit | 3D Model > Plastic Part > Snap Fit | Placement, Type (Lip/Groove), Parameters | `SnapFitFeatures.Add(...)` | GAP |
| Rule Fillet | 3D Model > Plastic Part > Rule Fillet | Edges[], Rules[] | `RuleFilletFeatures.Add(...)` | GAP |
| Lip | 3D Model > Plastic Part > Lip | Edge, Width, Height, Direction | `LipFeatures.Add(...)` | GAP |

### 1.8 Freeform Panel (T-Splines)

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Create Form | Freeform > Create > Box/Cylinder/Sphere/Torus/Quad Ball | Dimensions, Faces, Symmetry | `TSplineFeatures.CreateBox(...)` | GAP |
| Edit Form | Freeform > Modify > Edit Form | ControlPoints[], TransformMode | `TSplineFeatures.EditVertices(...)` | GAP |
| Insert Point | Freeform > Modify > Insert Point | Edge, Position | `TSplineFeatures.InsertPoint(...)` | GAP |
| Insert Edge | Freeform > Modify > Insert Edge | Faces[], Direction | `TSplineFeatures.InsertEdge(...)` | GAP |
| Merge Edge | Freeform > Modify > Merge Edge | Edge1, Edge2 | `TSplineFeatures.MergeEdge(...)` | GAP |
| Subdivide | Freeform > Modify > Subdivide | Faces[], Level | `TSplineFeatures.Subdivide(...)` | GAP |
| Crease | Freeform > Modify > Crease | Edges[] | `TSplineFeatures.Crease(...)` | GAP |
| Uncrease | Freeform > Modify > Uncrease | Edges[] | `TSplineFeatures.Uncrease(...)` | GAP |
| Weld Vertices | Freeform > Modify > Weld | Vertices[] | `TSplineFeatures.WeldVertices(...)` | GAP |
| Unweld Edges | Freeform > Modify > Unweld | Edges[] | `TSplineFeatures.UnweldEdges(...)` | GAP |
| Flatten | Freeform > Modify > Flatten | Faces[], Plane | `TSplineFeatures.Flatten(...)` | GAP |
| Thicken | Freeform > Modify > Thicken | Body, Thickness | `TSplineFeatures.Thicken(...)` | GAP |
| Match Edge | Freeform > Modify > Match | TSplineEdge, TargetEdge, Continuity | `TSplineFeatures.MatchEdge(...)` | GAP |
| Bridge | Freeform > Modify > Bridge | Edge1, Edge2, Segments | `TSplineFeatures.Bridge(...)` | GAP |
| Fill Hole | Freeform > Modify > Fill Hole | Edges[] | `TSplineFeatures.FillHole(...)` | GAP |
| Freeze | Freeform > Modify > Freeze | Body | `TSplineFeatures.Freeze(...)` | GAP |

### 1.9 Direct Edit (Push/Pull)

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Move Face | 3D Model > Direct > Move | Faces[], Distance/Direction | `DirectEditFeatures.MoveFace(...)` | GAP |
| Offset Face | 3D Model > Direct > Offset | Faces[], Distance | `DirectEditFeatures.OffsetFace(...)` | GAP |
| Rotate Face | 3D Model > Direct > Rotate | Faces[], Axis, Angle | `DirectEditFeatures.RotateFace(...)` | GAP |
| Size Face | 3D Model > Direct > Size | Face, Scale | `DirectEditFeatures.ScaleFace(...)` | GAP |
| Delete | 3D Model > Direct > Delete | Faces[] | `DirectEditFeatures.DeleteFace(...)` | GAP |

### 1.10 Measure & Analyze

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Measure | Inspect > Measure > Measure | Geometry1, Geometry2 | `MeasureTools.GetMinimumDistance(g1, g2)` | GAP |
| Region Properties | Inspect > Measure > Region Properties | Face/Loop | `RegionProperties.Area, Centroid, MomentOfInertia` | GAP |
| Section Analysis | Inspect > Analyze > Section | Plane, Body | `SectionAnalysis.Add(plane)` | GAP |
| Zebra Analysis | Inspect > Analyze > Zebra | Faces[] | `ZebraAnalysis.Add(faces)` | GAP |
| Draft Analysis | Inspect > Analyze > Draft | Faces[], PullDirection | `DraftAnalysis.Add(faces, pullDir)` | GAP |
| Curvature Analysis | Inspect > Analyze > Curvature | Faces[] | `CurvatureAnalysis.Add(faces)` | GAP |
| Cross Section | Inspect > Analyze > Cross Section | Plane, Body, Multiple | `CrossSectionAnalysis.Add(...)` | GAP |

---

## 2. SKETCH ENVIRONMENT (124 functions)

### 2.1 Create Panel - Geometry

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Line | Sketch > Draw > Line | StartPoint, EndPoint | `SketchLines.AddByTwoPoints(start, end)` | COVERED |
| Line (Construction) | Sketch > Draw > Line | StartPoint, EndPoint, Construction=true | `line.Construction = True` | GAP |
| Center Point Circle | Sketch > Draw > Circle > Center Point | Center, Radius | `SketchCircles.AddByCenterRadius(center, radius)` | COVERED |
| Tangent Circle | Sketch > Draw > Circle > Tangent | Tangent1, Tangent2, Tangent3 | `SketchCircles.AddByThreeTangents(t1, t2, t3)` | GAP |
| Two Point Circle | Sketch > Draw > Circle > Two Points | Point1, Point2 | `SketchCircles.AddByTwoPoints(p1, p2)` | GAP |
| Three Point Circle | Sketch > Draw > Circle > Three Points | Point1, Point2, Point3 | `SketchCircles.AddByThreePoints(p1, p2, p3)` | GAP |
| Ellipse (Center) | Sketch > Draw > Ellipse > Center | Center, MajorAxis, MinorAxis | `SketchEllipses.Add(center, majorAxis, minorRatio)` | GAP |
| Ellipse (Three Points) | Sketch > Draw > Ellipse > Three Points | Center, MajorEnd, MinorEnd | `SketchEllipses.AddByThreePoints(...)` | GAP |
| Three Point Arc | Sketch > Draw > Arc > Three Point | StartPoint, MidPoint, EndPoint | `SketchArcs.AddByThreePoints(start, mid, end)` | GAP |
| Center Point Arc | Sketch > Draw > Arc > Center Point | Center, StartPoint, EndPoint | `SketchArcs.AddByCenterStartEndPoint(center, start, end)` | GAP |
| Tangent Arc | Sketch > Draw > Arc > Tangent | StartEntity, EndPoint | `SketchArcs.AddByTangent(entity, endPoint)` | GAP |
| Fillet Arc | Sketch > Draw > Arc > Fillet | Line1, Line2, Radius | `SketchArcs.AddByFillet(line1, line2, radius)` | GAP |
| Two Point Rectangle | Sketch > Draw > Rectangle > Two Point | Corner1, Corner2 | `SketchLines.AddAsTwoPointRectangle(c1, c2)` | GAP |
| Three Point Rectangle | Sketch > Draw > Rectangle > Three Point | Point1, Point2, Point3 | `SketchLines.AddAsThreePointRectangle(p1, p2, p3)` | GAP |
| Center Point Rectangle | Sketch > Draw > Rectangle > Center | Center, Corner | `SketchLines.AddAsTwoPointCenteredRectangle(center, corner)` | GAP |
| Three Point Center Rectangle | Sketch > Draw > Rectangle > Three Point Center | Center, Point1, Point2 | `SketchLines.AddAsThreePointCenteredRectangle(...)` | GAP |
| Polygon (Inscribed) | Sketch > Draw > Polygon | Center, Vertex, Sides | `SketchLines.AddAsInscribedPolygon(center, vertex, sides)` | GAP |
| Polygon (Circumscribed) | Sketch > Draw > Polygon | Center, Midpoint, Sides | `SketchLines.AddAsCircumscribedPolygon(center, midpoint, sides)` | GAP |
| Polygon (Edge) | Sketch > Draw > Polygon | Point1, Point2, Sides | `SketchLines.AddAsEdgePolygon(p1, p2, sides)` | GAP |
| Slot (Center to Center) | Sketch > Draw > Slot > Center to Center | Center1, Center2, Width | `SketchEntities.AddByTwoCenterPointSlot(c1, c2, width)` | GAP |
| Slot (Overall) | Sketch > Draw > Slot > Overall | Point1, Point2, Width | `SketchEntities.AddByOverallSlot(p1, p2, width)` | GAP |
| Slot (Center Point) | Sketch > Draw > Slot > Center Point | Center, Point, Width | `SketchEntities.AddByCenterPointSlot(center, point, width)` | GAP |
| Slot (Three Point Arc) | Sketch > Draw > Slot > Three Point Arc | Start, Mid, End, Width | `SketchEntities.AddByThreePointArcSlot(...)` | GAP |
| Slot (Center Point Arc) | Sketch > Draw > Slot > Center Point Arc | Center, Start, End, Width | `SketchEntities.AddByCenterPointArcSlot(...)` | GAP |
| Spline (Fit Points) | Sketch > Draw > Spline > Fit Point | Points[] | `SketchSplines.Add(points)` | GAP |
| Spline (Control Vertices) | Sketch > Draw > Spline > Control Vertex | ControlPoints[] | `SketchSplines.AddByControlPoints(controlPoints)` | GAP |
| Spline (Bridge Curve) | Sketch > Draw > Spline > Bridge Curve | Curve1, Curve2, Continuity | `SketchSplines.AddBridgeCurve(curve1, curve2, continuity)` | GAP |
| Point | Sketch > Draw > Point | Location | `SketchPoints.Add(point)` | GAP |
| Point (Hole Center) | Sketch > Draw > Point | Location, HoleCenter=true | `SketchPoints.Add(point, kHoleCenterPoint)` | GAP |
| Text | Sketch > Draw > Text | Origin, Text, Font, Height, Bold, Italic | `SketchTexts.Add(origin, text, style)` | GAP |
| Geometry Text | Sketch > Draw > Geometry Text | Path, Text, Font, Height | `SketchTexts.AddOnPath(path, text, style)` | GAP |
| Image | Sketch > Insert > Image | FilePath, Origin, Scale, Rotation | `SketchImages.Add(filePath, origin)` | GAP |

### 2.2 Constrain Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Coincident | Sketch > Constrain > Coincident | Point1, Point2/Line | `GeometricConstraints.AddCoincident(entity1, entity2)` | COVERED |
| Collinear | Sketch > Constrain > Collinear | Line1, Line2 | `GeometricConstraints.AddCollinear(line1, line2)` | GAP |
| Concentric | Sketch > Constrain > Concentric | Circle1, Circle2 | `GeometricConstraints.AddConcentric(c1, c2)` | GAP |
| Fix | Sketch > Constrain > Fix | Entity | `GeometricConstraints.AddGround(entity)` | GAP |
| Parallel | Sketch > Constrain > Parallel | Line1, Line2 | `GeometricConstraints.AddParallel(line1, line2)` | COVERED |
| Perpendicular | Sketch > Constrain > Perpendicular | Line1, Line2 | `GeometricConstraints.AddPerpendicular(line1, line2)` | COVERED |
| Horizontal | Sketch > Constrain > Horizontal | Line/Points | `GeometricConstraints.AddHorizontal(entity)` | GAP |
| Vertical | Sketch > Constrain > Vertical | Line/Points | `GeometricConstraints.AddVertical(entity)` | GAP |
| Tangent | Sketch > Constrain > Tangent | Curve1, Curve2 | `GeometricConstraints.AddTangent(curve1, curve2)` | GAP |
| Smooth (G2) | Sketch > Constrain > Smooth | Spline, Curve | `GeometricConstraints.AddSmooth(spline, curve)` | GAP |
| Symmetric | Sketch > Constrain > Symmetric | Entity1, Entity2, Axis | `GeometricConstraints.AddSymmetric(e1, e2, axis)` | GAP |
| Equal | Sketch > Constrain > Equal | Entity1, Entity2 | `GeometricConstraints.AddEqual(e1, e2)` | GAP |

### 2.3 Dimension Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| General Dimension | Sketch > Constrain > Dimension | Entity, Value | `DimensionConstraints.AddLinear(entity, value)` | COVERED |
| Linear Dimension | Sketch > Constrain > Dimension | Point1, Point2, Direction | `DimensionConstraints.AddLinear(p1, p2, direction)` | GAP |
| Aligned Dimension | Sketch > Constrain > Dimension | Point1, Point2 | `DimensionConstraints.AddAligned(p1, p2)` | GAP |
| Angular Dimension | Sketch > Constrain > Dimension | Line1, Line2 | `DimensionConstraints.AddAngular(line1, line2)` | GAP |
| Radial Dimension | Sketch > Constrain > Dimension | Arc/Circle | `DimensionConstraints.AddRadius(entity)` | GAP |
| Diameter Dimension | Sketch > Constrain > Dimension | Circle | `DimensionConstraints.AddDiameter(circle)` | GAP |

### 2.4 Modify Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Move | Sketch > Modify > Move | Entities[], Vector | `MoveSketchObject(entities, vector)` | GAP |
| Copy | Sketch > Modify > Copy | Entities[], Vector | `CopySketchObject(entities, vector)` | GAP |
| Rotate | Sketch > Modify > Rotate | Entities[], Center, Angle | `RotateSketchObject(entities, center, angle)` | GAP |
| Mirror | Sketch > Modify > Mirror | Entities[], Line | `SketchEntities.Mirror(entities, line)` | GAP |
| Scale | Sketch > Modify > Scale | Entities[], BasePoint, Scale | `ScaleSketchObject(entities, basePoint, scale)` | GAP |
| Stretch | Sketch > Modify > Stretch | Entities[], BasePoint, Vector | `StretchSketchObject(...)` | GAP |
| Trim | Sketch > Modify > Trim | Entity, TrimPoint | `entity.Trim(trimPoint)` | GAP |
| Extend | Sketch > Modify > Extend | Entity, ExtendPoint | `entity.Extend(extendPoint)` | GAP |
| Split | Sketch > Modify > Split | Entity, SplitPoint | `entity.Split(splitPoint)` | GAP |
| Offset | Sketch > Modify > Offset | Entities[], Distance | `SketchOffsetEntities.AddOffset(entities, distance)` | GAP |
| Rectangular Pattern | Sketch > Pattern > Rectangular | Entities[], Dir1, Count1, Spacing1, Dir2, Count2, Spacing2 | `SketchEntities.AddRectangularPattern(...)` | GAP |
| Circular Pattern | Sketch > Pattern > Circular | Entities[], Center, Count, Angle | `SketchEntities.AddCircularPattern(...)` | GAP |

### 2.5 Project/Include

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Project Geometry | Sketch > Create > Project Geometry | Geometry | `SketchEntities.ProjectGeometry(geometry)` | COVERED |
| Project Cut Edges | Sketch > Create > Project Cut Edges | Body | `SketchEntities.ProjectCutEdges(body)` | GAP |
| Project Flat Pattern | Sketch > Create > Project Flat Pattern | FlatPattern | `SketchEntities.ProjectFlatPattern(flatPattern)` | GAP |
| Include Geometry | Sketch > Create > Include Geometry | Geometry | `SketchEntities.IncludeGeometry(geometry)` | GAP |
| Intersect | Sketch > Create > Intersect | Surface1, Surface2 | `SketchEntities.Intersect(s1, s2)` | GAP |
| Silhouette | Sketch > Create > Silhouette | Body, ViewDirection | `SketchEntities.AddSilhouette(body, viewDirection)` | GAP |

---

## 3. ASSEMBLY ENVIRONMENT (142 functions)

### 3.1 Component Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Place Component | Assemble > Component > Place | FilePath, Position | `ComponentOccurrences.Add(filePath, matrix)` | COVERED |
| Place from Content Center | Assemble > Component > Place from Content Center | Category, Family, Member | `ComponentOccurrences.AddFromContentCenter(family, member)` | GAP |
| Create Component | Assemble > Component > Create | Name, Template, NewWindow | `ComponentOccurrences.AddNewComponent(template, name)` | GAP |
| Create Substitute | Assemble > Component > Create Substitute | Original, LOD | `ComponentOccurrences.CreateSubstitute(original)` | GAP |
| Replace Component | Assemble > Component > Replace | Original, NewFile, ConstraintOption | `occurrence.Replace(newFile, options)` | GAP |
| Replace All | Assemble > Component > Replace All | Original, NewFile | `ComponentOccurrences.ReplaceAll(original, newFile)` | GAP |
| Copy Component | Context Menu > Copy | Occurrence | `occurrence.Copy()` | GAP |
| Pattern Component | Assemble > Pattern > Pattern Component | Occurrence, Pattern | `OccurrencePatterns.Add(occurrence, pattern)` | GAP |
| Mirror Components | Assemble > Pattern > Mirror | Occurrences[], Plane | `MirrorComponents.Add(occurrences, plane)` | GAP |
| Derive Component | Assemble > Component > Derive | Assembly, Options | `DerivedPartComponent.Create(assembly)` | GAP |
| Make Independent | Context Menu > Make Independent | Occurrence | `occurrence.MakeIndependent()` | GAP |
| Demote | Context Menu > Demote | Subassembly | `occurrence.Demote()` | GAP |

### 3.2 Constrain Panel (Joint / Constraint)

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Mate Constraint | Assemble > Position > Constrain > Mate | Geometry1, Geometry2, Offset | `AssemblyConstraints.AddMateConstraint(g1, g2, offset)` | COVERED |
| Flush Constraint | Assemble > Position > Constrain > Flush | Face1, Face2, Offset | `AssemblyConstraints.AddFlushConstraint(f1, f2, offset)` | COVERED |
| Angle Constraint | Assemble > Position > Constrain > Angle | Plane1, Plane2, Angle | `AssemblyConstraints.AddAngleConstraint(p1, p2, angle)` | GAP |
| Tangent Constraint | Assemble > Position > Constrain > Tangent | Face1, Face2, Inside/Outside | `AssemblyConstraints.AddTangentConstraint(f1, f2)` | GAP |
| Insert Constraint | Assemble > Position > Constrain > Insert | Circle1, Circle2 | `AssemblyConstraints.AddInsertConstraint(c1, c2)` | COVERED |
| Symmetry Constraint | Assemble > Position > Constrain > Symmetry | Geometry1, Geometry2, Plane | `AssemblyConstraints.AddSymmetryConstraint(g1, g2, plane)` | GAP |
| Motion Constraint | Assemble > Position > Constrain > Motion | Constraint1, Constraint2, Ratio | `AssemblyConstraints.AddMotionConstraint(c1, c2, ratio)` | GAP |
| Transitional Constraint | Assemble > Position > Constrain > Transitional | Face, Vertex | `AssemblyConstraints.AddTransitionalConstraint(face, vertex)` | GAP |
| UCS Constraint | Assemble > Position > Constrain > UCS | UCS1, UCS2 | `AssemblyConstraints.AddUCSConstraint(ucs1, ucs2)` | GAP |
| Rigid Joint | Assemble > Position > Joint > Rigid | Geometry1, Geometry2 | `AssemblyJoints.AddRigidJoint(g1, g2)` | GAP |
| Rotational Joint | Assemble > Position > Joint > Rotational | Geometry1, Geometry2, Axis | `AssemblyJoints.AddRotationalJoint(g1, g2, axis)` | GAP |
| Slider Joint | Assemble > Position > Joint > Slider | Geometry1, Geometry2, Axis | `AssemblyJoints.AddSliderJoint(g1, g2, axis)` | GAP |
| Cylindrical Joint | Assemble > Position > Joint > Cylindrical | Geometry1, Geometry2 | `AssemblyJoints.AddCylindricalJoint(g1, g2)` | GAP |
| Planar Joint | Assemble > Position > Joint > Planar | Face1, Face2 | `AssemblyJoints.AddPlanarJoint(f1, f2)` | GAP |
| Ball Joint | Assemble > Position > Joint > Ball | Point1, Point2 | `AssemblyJoints.AddBallJoint(p1, p2)` | GAP |
| Ground | Assemble > Position > Ground | Occurrence | `occurrence.Grounded = True` | COVERED |
| Drive Constraint | Assemble > Position > Drive | Constraint, Start, End, Increment | `DriveConstraint(constraint, start, end)` | GAP |

### 3.3 iMate

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Create iMate | Manage > iMate > Create iMate | Geometry, Type, Name | `iMateDefinitions.AddMateiMateDefinition(geometry, name)` | GAP |
| Composite iMate | Manage > iMate > Composite iMate | iMates[] | `iMateDefinitions.AddCompositeiMateDefinition(imates)` | GAP |
| iMate Glyph | Manage > iMate > iMate Glyph | Show/Hide | `iMateGlyphsVisible = True` | GAP |
| Alt+Drop iMate | Drag + Alt | iMate1, iMate2 | `AutomatiMatePlacement(iMate1, iMate2)` | GAP |

### 3.4 Manage Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Bill of Materials | Assemble > Manage > BOM | View, Filter | `BOM.GetBOMViews()` | COVERED |
| Parts List (Export) | Assemble > Manage > BOM > Export | Format (xlsx/csv) | `BOM.ExportToFile(path, format)` | GAP |
| Level of Detail | View > Appearance > LOD | LODName | `LevelOfDetailRepresentations.Item(name)` | GAP |
| Design View | View > Appearance > Design View | ViewName | `DesignViewRepresentations.Item(name)` | GAP |
| Positional Representation | View > Appearance > Positional | RepName | `PositionalRepresentations.Item(name)` | GAP |
| Shrinkwrap | Assemble > Simplify > Shrinkwrap | Options, Quality | `Shrinkwrap.Create(options)` | GAP |
| Interference Analysis | Inspect > Interference | Components, Options | `InterferenceResults = AnalyzeInterference(components)` | GAP |
| Contact Solver | Assemble > Position > Contact Set | Components[] | `ContactSolver.Add(components)` | GAP |

### 3.5 Exploded View / Presentation

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Create Presentation | File > New > Presentation | Assembly | `PresentationDocument.Create()` | GAP |
| Tweak Components | Presentation > Transform > Tweak | Occurrences[], Direction, Distance | `TweakComponents.Add(occurrences, direction, distance)` | GAP |
| Rotate About Axis | Presentation > Transform > Rotate | Occurrences[], Axis, Angle | `TweakComponents.AddRotation(occurrences, axis, angle)` | GAP |
| Trail | Presentation > Transform > Trail | Component, Path | `Trails.Add(component, path)` | GAP |
| Animate Sequence | Presentation > Create > Sequence | Actions[] | `AnimationSequence.Add(actions)` | GAP |
| Storyboard | Presentation > Storyboard > Create | Snapshots[] | `Storyboard.Create(snapshots)` | GAP |
| Publish to Video | Presentation > Storyboard > Publish | Format, Resolution | `Storyboard.PublishToVideo(path, format)` | GAP |

### 3.6 Manage Panel - Design Accelerators

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Bolted Connection | Design > Fasteners > Bolted Connection | HoleEdge, BoltType, Size, Fit | `BoltedConnection.Insert(...)` | GAP |
| Shaft Generator | Design > Power Transmission > Shaft | Profile, Length, Features | `ShaftGenerator.Create(...)` | GAP |
| Gear Generator | Design > Power Transmission > Spur Gear | Module, Teeth, Width | `SpurGearGenerator.Create(...)` | GAP |
| Bevel Gear | Design > Power Transmission > Bevel Gear | Module, Teeth, Angle | `BevelGearGenerator.Create(...)` | GAP |
| Worm Gear | Design > Power Transmission > Worm Gear | Module, Teeth, Leads | `WormGearGenerator.Create(...)` | GAP |
| Cam Generator | Design > Power Transmission > Cam | Profile, FollowerType | `CamGenerator.Create(...)` | GAP |
| Spring Generator | Design > Power Transmission > Spring | Type, Parameters | `SpringGenerator.Create(...)` | GAP |
| Bearing Generator | Design > Power Transmission > Bearing | BearingType, Size | `BearingGenerator.Create(...)` | GAP |
| O-Ring Generator | Design > Seal > O-Ring | Standard, Size | `ORingGenerator.Create(...)` | GAP |
| Key Connection | Design > Power Transmission > Key | ShaftDia, KeyType | `KeyConnectionGenerator.Create(...)` | GAP |
| Spline Connection | Design > Power Transmission > Spline | ShaftDia, SplineType | `SplineConnectionGenerator.Create(...)` | GAP |

---

## 4. SHEET METAL ENVIRONMENT (68 functions)

### 4.1 Create Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Face | Sheet Metal > Create > Face | Profile, Direction, Thickness | `SheetMetalFeatures.FaceFeatures.Add(profile, thickness)` | COVERED |
| Flange | Sheet Metal > Create > Flange | Edge, Height, Angle, BendRadius | `SheetMetalFeatures.FlangeFeatures.Add(edge, height, angle, radius)` | COVERED |
| Contour Flange | Sheet Metal > Create > Contour Flange | Profile, Width, Height | `SheetMetalFeatures.ContourFlangeFeatures.Add(profile, width)` | GAP |
| Lofted Flange | Sheet Metal > Create > Lofted Flange | Profiles[], Rails[] | `SheetMetalFeatures.LoftedFlangeFeatures.Add(profiles, rails)` | GAP |
| Hem | Sheet Metal > Create > Hem | Edge, Type, Length, Gap | `SheetMetalFeatures.HemFeatures.Add(edge, type, length)` | GAP |
| Fold | Sheet Metal > Modify > Fold | Line, Angle, FoldSide | `SheetMetalFeatures.FoldFeatures.Add(line, angle)` | GAP |
| Unfold | Sheet Metal > Modify > Unfold | Bends[] | `SheetMetalFeatures.UnfoldFeatures.Add(bends)` | GAP |
| Refold | Sheet Metal > Modify > Refold | Unfold | `SheetMetalFeatures.RefoldFeatures.Add(unfold)` | GAP |
| Bend | Sheet Metal > Create > Bend | Line, Angle, Radius | `SheetMetalFeatures.BendFeatures.Add(line, angle, radius)` | GAP |
| Cut | Sheet Metal > Modify > Cut | Profile, Direction | `SheetMetalFeatures.CutFeatures.Add(profile, direction)` | COVERED |
| Punch Tool | Sheet Metal > Modify > Punch Tool | Placement, PunchID, Angle | `SheetMetalFeatures.PunchToolFeatures.Add(placement, punchID)` | GAP |
| Corner (Seam) | Sheet Metal > Modify > Corner > Seam | Corner, Gap | `SheetMetalFeatures.CornerSeamFeatures.Add(corner, gap)` | GAP |
| Corner (Chamfer) | Sheet Metal > Modify > Corner > Chamfer | Corner, Distance | `SheetMetalFeatures.CornerChamferFeatures.Add(corner, distance)` | GAP |
| Corner (Round) | Sheet Metal > Modify > Corner > Round | Corner, Radius | `SheetMetalFeatures.CornerRoundFeatures.Add(corner, radius)` | GAP |
| Corner (Miter) | Sheet Metal > Modify > Corner > Miter | Corner | `SheetMetalFeatures.MiterFeatures.Add(corner)` | GAP |
| Rip | Sheet Metal > Modify > Rip | Edge, Gap | `SheetMetalFeatures.RipFeatures.Add(edge, gap)` | GAP |

### 4.2 Flat Pattern

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Create Flat Pattern | Sheet Metal > Flat Pattern > Create | StationaryFace | `FlatPattern.Create(stationaryFace)` | COVERED |
| Edit Flat Pattern | Sheet Metal > Flat Pattern > Edit | | `FlatPattern.Edit()` | GAP |
| Finish Flat Pattern | Sheet Metal > Flat Pattern > Finish | | `FlatPattern.ExitEdit()` | GAP |
| Flat Pattern Orientation | Sheet Metal > Flat Pattern > Orient | Face, Edge | `FlatPattern.Orientation(face, edge)` | GAP |
| Flat Pattern Export (DXF) | Sheet Metal > Flat Pattern > Export | FilePath, Options | `FlatPattern.ExportToDXF(path)` | GAP |
| Flat Pattern Export (DWG) | Sheet Metal > Flat Pattern > Export | FilePath | `FlatPattern.ExportToDWG(path)` | GAP |

### 4.3 Sheet Metal Defaults

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Sheet Metal Defaults | Sheet Metal > Setup > Sheet Metal Defaults | Material, Thickness, BendRadius, KFactor | `SheetMetalStyle.Thickness = value` | GAP |
| Bend Table | Sheet Metal > Setup > Bend Table | Table, KFactor/BendDeduction | `SheetMetalStyle.BendTable = table` | GAP |
| Unfold Rules | Sheet Metal > Setup > Unfold Rules | Rules[] | `SheetMetalStyle.UnfoldRules = rules` | GAP |

---

## 5. WELDMENT ENVIRONMENT (34 functions)

### 5.1 Preparation Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Fillet Weld Prep | Weldment > Prepare > Fillet Prep | Faces[], Gap | `WeldmentFeatures.FilletWeldPrep(faces, gap)` | GAP |
| Groove Weld Prep | Weldment > Prepare > Groove Prep | Faces[], GrooveType, Angle | `WeldmentFeatures.GrooveWeldPrep(faces, type, angle)` | GAP |
| Contour Flange Prep | Weldment > Prepare > Contour Flange | Edge, Clearance | `WeldmentFeatures.ContourFlangePrep(edge)` | GAP |
| Machining Prep | Weldment > Prepare > Machining | Face, Stock | `WeldmentFeatures.MachiningPrep(face, stock)` | GAP |

### 5.2 Welds Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Fillet Weld | Weldment > Welds > Fillet Weld | Path, Size, Side, Intermittent | `WeldBeads.AddFilletWeld(path, size)` | GAP |
| Groove Weld | Weldment > Welds > Groove Weld | Path, Type, Size | `WeldBeads.AddGrooveWeld(path, type, size)` | GAP |
| Cosmetic Weld | Weldment > Welds > Cosmetic Weld | Path, Type | `WeldBeads.AddCosmeticWeld(path, type)` | GAP |
| Spot Weld | Weldment > Welds > Spot Weld | Locations[], Diameter | `WeldBeads.AddSpotWeld(locations, diameter)` | GAP |
| Seam Weld | Weldment > Welds > Seam Weld | Path, Width | `WeldBeads.AddSeamWeld(path, width)` | GAP |

### 5.3 Machining Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Machining Feature | Weldment > Machining > Add | Type, Parameters | `WeldmentFeatures.AddMachining(type, params)` | GAP |
| Machine All | Weldment > Machining > Machine All | | `WeldmentFeatures.MachineAll()` | GAP |

### 5.4 Weldment Annotations

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Weld Symbol | Annotate > Symbols > Weld | Type, Size, Process | `WeldSymbols.Add(type, size)` | GAP |
| End Treatment | Annotate > Symbols > End Treatment | Type | `EndTreatmentSymbols.Add(type)` | GAP |
| Caterpillar | Annotate > Symbols > Caterpillar | Path | `CaterpillarSymbols.Add(path)` | GAP |

---

## 6. DRAWING ENVIRONMENT (128 functions)

### 6.1 Place Views Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Base View | Place Views > Create > Base | Model, Position, Scale, Orientation | `DrawingViews.AddBaseView(model, position, scale, orientation)` | COVERED |
| Projected View | Place Views > Create > Projected | BaseView, Position, Type (Ortho/Iso) | `DrawingViews.AddProjectedView(baseView, position)` | COVERED |
| Auxiliary View | Place Views > Create > Auxiliary | EdgeLine, Position | `DrawingViews.AddAuxiliaryView(edge, position)` | GAP |
| Section View | Place Views > Create > Section | BaseView, SectionLine, Position, Depth | `DrawingViews.AddSectionView(baseView, line, position)` | COVERED |
| Detail View | Place Views > Create > Detail | BaseView, Center, Radius, Scale, Position | `DrawingViews.AddDetailView(baseView, center, radius, scale)` | COVERED |
| Overlay View | Place Views > Create > Overlay | BaseView, Model2 | `DrawingViews.AddOverlayView(baseView, model2)` | GAP |
| Draft View | Place Views > Create > Draft | | `DrawingViews.AddDraftView()` | GAP |
| Break View | Place Views > Modify > Break | View, BreakLines, Gap, BreakStyle | `View.AddBreak(startLine, endLine, gap, style)` | GAP |
| Break Out | Place Views > Modify > Break Out | View, Profile, Depth | `View.AddBreakOut(profile, depth)` | GAP |
| Crop View | Place Views > Modify > Crop | View, Profile | `View.Crop(profile)` | GAP |
| Slice View | Place Views > Modify > Slice | View, SlicePlane | `View.AddSlice(plane)` | GAP |

### 6.2 Annotate Panel - Dimensions

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| General Dimension | Annotate > Dimension > General | Geometry, Position | `GeneralDimensions.Add(geometry, position)` | COVERED |
| Baseline Dimension | Annotate > Dimension > Baseline | BasePoint, Geometries[] | `BaselineDimensions.Add(basePoint, geometries)` | GAP |
| Ordinate Dimension | Annotate > Dimension > Ordinate | Origin, Geometries[] | `OrdinateDimensions.Add(origin, geometries)` | GAP |
| Ordinate Set | Annotate > Dimension > Ordinate Set | Origin, Geometries[], Direction | `OrdinateDimensionSets.Add(origin, geometries, direction)` | GAP |
| Chain Dimension | Annotate > Dimension > Chain | Geometries[], Direction | `ChainDimensions.Add(geometries, direction)` | GAP |
| Angular Dimension | Annotate > Dimension > Angular | Line1, Line2, Position | `AngularDimensions.Add(line1, line2, position)` | GAP |
| Arc Length Dimension | Annotate > Dimension > Arc Length | Arc, Position | `ArcLengthDimensions.Add(arc, position)` | GAP |
| Radial Dimension | Annotate > Dimension > Radius | Arc, Position | `RadiusDimensions.Add(arc, position)` | GAP |
| Diameter Dimension | Annotate > Dimension > Diameter | Circle, Position | `DiameterDimensions.Add(circle, position)` | GAP |
| Hole/Thread Notes | Annotate > Dimension > Hole/Thread | Hole, Position | `HoleThreadNotes.Add(hole, position)` | COVERED |
| Chamfer Note | Annotate > Dimension > Chamfer | Chamfer, Position | `ChamferNotes.Add(chamfer, position)` | GAP |

### 6.3 Annotate Panel - Symbols

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Center Mark | Annotate > Symbols > Center Mark | Circle | `CenterMarks.Add(circle)` | GAP |
| Centerline | Annotate > Symbols > Centerline | Edge1, Edge2 | `Centerlines.Add(edge1, edge2)` | GAP |
| Centerline Bisector | Annotate > Symbols > Centerline Bisector | Line | `CenterlineBisectors.Add(line)` | GAP |
| Centered Pattern | Annotate > Symbols > Centered Pattern | CircularPattern | `CenteredPatterns.Add(pattern)` | GAP |
| Surface Texture Symbol | Annotate > Symbols > Surface Texture | Face, Ra, Rz | `SurfaceTextureSymbols.Add(face, ra, rz)` | GAP |
| Feature Control Frame | Annotate > Symbols > Feature Control Frame | Geometry, GDT | `FeatureControlFrames.Add(geometry, gdtData)` | GAP |
| Datum Identifier | Annotate > Symbols > Datum Identifier | Geometry, Letter | `DatumIdentifiers.Add(geometry, letter)` | GAP |
| Datum Target | Annotate > Symbols > Datum Target | Point, Size | `DatumTargets.Add(point, size)` | GAP |
| Leader | Annotate > Symbols > Leader | Points[], Text | `Leaders.Add(points, text)` | GAP |
| Text | Annotate > Text > Text | Position, Text, Style | `TextBoxes.Add(position, text, style)` | GAP |
| Balloon | Annotate > Table > Balloon | Component, Position | `Balloons.Add(component, position)` | GAP |
| Auto Balloon | Annotate > Table > Auto Balloon | View, Options | `AutoBalloons.Add(view, options)` | GAP |

### 6.4 Annotate Panel - Tables

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Parts List | Annotate > Table > Parts List | View, Position | `PartsLists.Add(view, position)` | COVERED |
| Hole Table | Annotate > Table > Hole Table | View, Origin, Position | `HoleTables.Add(view, origin, position)` | GAP |
| Revision Table | Annotate > Table > Revision Table | Position | `RevisionTables.Add(position)` | GAP |
| Bend Table | Annotate > Table > Bend Table | FlatPattern, Position | `BendTables.Add(flatPattern, position)` | GAP |
| Punch Table | Annotate > Table > Punch Table | View, Position | `PunchTables.Add(view, position)` | GAP |
| General Table | Annotate > Table > General Table | Rows, Columns, Position | `GeneralTables.Add(rows, columns, position)` | GAP |
| Custom Table | Annotate > Table > Custom Table | TableDefinition, Position | `CustomTables.Add(tableDefinition, position)` | GAP |

### 6.5 Sketch Panel (Drawing Sketch)

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Sketch Symbols | Annotate > Sketch > Sketch Symbols | Library, Symbol | `SketchedSymbols.Add(library, symbol)` | GAP |
| Leader Text | Annotate > Text > Leader Text | Points[], Text | `LeaderTexts.Add(points, text)` | GAP |

### 6.6 Sheet Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| New Sheet | Place Views > Sheets > New Sheet | Size, Orientation | `Sheets.Add(size, orientation)` | GAP |
| Edit Sheet | Context > Edit Sheet | | `sheet.Edit()` | GAP |
| Sheet Format | Place Views > Sheets > Sheet Format | Template | `sheet.SheetFormat = template` | GAP |
| Title Block | Place Views > Sheets > Title Block | TitleBlock | `sheet.TitleBlock = titleBlock` | GAP |
| Border | Place Views > Sheets > Border | Border | `sheet.Border = border` | GAP |
| Edit Title Block | Context > Edit Title Block | | `sheet.TitleBlock.Edit()` | GAP |

---

## 7. FRAME GENERATOR ENVIRONMENT (42 functions)

### 7.1 Insert Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Insert Frame | Design > Frame > Insert | Edges[], Standard, Family, Size | `FrameFeatures.InsertFrame(edges, standard, family, size)` | GAP |
| Change Frame | Design > Frame > Change | Member, NewProfile | `FrameFeatures.ChangeFrame(member, newProfile)` | GAP |
| Reuse Frame | Design > Frame > Reuse | Members[], NewEdges[] | `FrameFeatures.ReuseFrame(members, edges)` | GAP |

### 7.2 Modify Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Miter | Design > Frame > Miter | Members[], Type | `FrameFeatures.AddMiter(members, type)` | GAP |
| Trim/Extend | Design > Frame > Trim/Extend | Member, Boundary | `FrameFeatures.TrimExtend(member, boundary)` | GAP |
| Notch | Design > Frame > Notch | Member, Face | `FrameFeatures.AddNotch(member, face)` | GAP |
| Lengthen/Shorten | Design > Frame > Lengthen | Member, Amount, End | `FrameFeatures.Lengthen(member, amount, end)` | GAP |
| End Cap | Design > Frame > End Cap | Member, Type | `FrameFeatures.AddEndCap(member, type)` | GAP |

### 7.3 Frame Properties

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Frame Member Info | Context > Properties | | `FrameMember.GetProperties()` | GAP |
| Frame Analysis Data | Design > Frame > Analysis | | `FrameAnalysis.GetData()` | GAP |
| Section Properties | Design > Frame > Section Properties | | `FrameMember.SectionProperties` | GAP |

---

## 8. STRESS ANALYSIS (NASTRAN IN-CAD) (56 functions)

### 8.1 Study Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Create Study | Environments > Stress Analysis > Create Study | StudyName, Type | `StressAnalysis.CreateStudy(name, type)` | COVERED |
| Static Analysis | Stress Analysis > Study > Static | | `Study.Type = kStaticAnalysis` | COVERED |
| Modal Analysis | Stress Analysis > Study > Modal | Modes | `Study.Type = kModalAnalysis` | GAP |
| Buckling Analysis | Stress Analysis > Study > Buckling | | `Study.Type = kBucklingAnalysis` | GAP |
| Nonlinear Analysis | Stress Analysis > Study > Nonlinear | | `Study.Type = kNonlinearAnalysis` | GAP |
| Thermal Analysis | Stress Analysis > Study > Thermal | | `Study.Type = kThermalAnalysis` | GAP |
| Shape Generator | Stress Analysis > Study > Shape Generator | Objective, Constraints | `Study.Type = kShapeGenerator` | GAP |

### 8.2 Constraints Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Fixed Constraint | Stress Analysis > Constraints > Fixed | Faces[] | `Constraints.AddFixed(faces)` | COVERED |
| Pin Constraint | Stress Analysis > Constraints > Pin | Faces[] | `Constraints.AddPin(faces)` | GAP |
| Frictionless Constraint | Stress Analysis > Constraints > Frictionless | Faces[] | `Constraints.AddFrictionless(faces)` | GAP |
| Prescribed Displacement | Stress Analysis > Constraints > Prescribed | Faces[], Displacement | `Constraints.AddPrescribed(faces, displacement)` | GAP |
| Sliding/Radial | Stress Analysis > Constraints > Sliding/Radial | Faces[], Type | `Constraints.AddSlidingRadial(faces, type)` | GAP |

### 8.3 Loads Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Force | Stress Analysis > Loads > Force | Faces[], Magnitude, Direction | `Loads.AddForce(faces, magnitude, direction)` | COVERED |
| Pressure | Stress Analysis > Loads > Pressure | Faces[], Pressure | `Loads.AddPressure(faces, pressure)` | GAP |
| Moment | Stress Analysis > Loads > Moment | Faces[], Magnitude, Axis | `Loads.AddMoment(faces, magnitude, axis)` | GAP |
| Bearing Load | Stress Analysis > Loads > Bearing | CylindricalFace, Magnitude | `Loads.AddBearing(face, magnitude)` | GAP |
| Body Loads (Gravity) | Stress Analysis > Loads > Body Loads | Direction, Magnitude | `Loads.AddGravity(direction, magnitude)` | GAP |
| Angular Velocity | Stress Analysis > Loads > Angular Velocity | Axis, RPM | `Loads.AddAngularVelocity(axis, rpm)` | GAP |
| Remote Force | Stress Analysis > Loads > Remote Force | Point, Magnitude, Faces[] | `Loads.AddRemoteForce(point, magnitude, faces)` | GAP |
| Temperature | Stress Analysis > Loads > Temperature | Faces[], Temperature | `Loads.AddTemperature(faces, temperature)` | GAP |
| Convection | Stress Analysis > Loads > Convection | Faces[], Coefficient, AmbientTemp | `Loads.AddConvection(faces, coeff, temp)` | GAP |
| Heat Flux | Stress Analysis > Loads > Heat Flux | Faces[], Flux | `Loads.AddHeatFlux(faces, flux)` | GAP |

### 8.4 Mesh & Solve

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Generate Mesh | Stress Analysis > Mesh > Generate | AverageSize, MaxSize | `Mesh.Generate(avgSize, maxSize)` | GAP |
| Local Mesh Control | Stress Analysis > Mesh > Local Mesh | Faces[], Size | `Mesh.AddLocalControl(faces, size)` | GAP |
| Mesh Settings | Stress Analysis > Mesh > Settings | Quality, Type | `Mesh.Settings = { quality, type }` | GAP |
| Run Simulation | Stress Analysis > Solve > Simulate | | `Study.Simulate()` | GAP |
| Parametric Study | Stress Analysis > Solve > Parametric | Parameters[], Range | `Study.RunParametric(params, range)` | GAP |

### 8.5 Results Panel

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Von Mises Stress | Stress Analysis > Display > Von Mises | | `Results.DisplayVonMises()` | GAP |
| Principal Stress | Stress Analysis > Display > Principal | Type (1/2/3) | `Results.DisplayPrincipal(type)` | GAP |
| Displacement | Stress Analysis > Display > Displacement | Component (X/Y/Z/Mag) | `Results.DisplayDisplacement(component)` | GAP |
| Safety Factor | Stress Analysis > Display > Safety Factor | | `Results.DisplaySafetyFactor()` | GAP |
| Strain | Stress Analysis > Display > Strain | | `Results.DisplayStrain()` | GAP |
| Reaction Force | Stress Analysis > Display > Reaction Force | | `Results.DisplayReactionForce()` | GAP |
| Animate | Stress Analysis > Results > Animate | Speed, Cycles | `Results.Animate(speed, cycles)` | GAP |
| Probe | Stress Analysis > Results > Probe | Location | `Results.Probe(location)` | GAP |
| Min/Max | Stress Analysis > Results > Min/Max | | `Results.GetMinMax()` | GAP |
| Convergence Plot | Stress Analysis > Results > Convergence | | `Results.ShowConvergencePlot()` | GAP |
| Report | Stress Analysis > Results > Report | Options | `Results.GenerateReport(options)` | GAP |

---

## 9. INVENTOR HSM / CAM ENVIRONMENT (78 functions)

### 9.1 2D Operations

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| 2D Adaptive | CAM > 2D > Adaptive | StockContours, Geometry, Tool, DOC, WOC, OptimalLoad | `CAMSetup.Create2DAdaptive(...)` | COVERED |
| 2D Pocket | CAM > 2D > Pocket | Geometry, Tool, DOC, WOC, Tolerance | `CAMSetup.Create2DPocket(...)` | COVERED |
| 2D Contour | CAM > 2D > Contour | Geometry, Tool, DOC, Compensation | `CAMSetup.Create2DContour(...)` | COVERED |
| Face | CAM > 2D > Face | Geometry, Tool, Stepover | `CAMSetup.CreateFace(...)` | COVERED |
| Slot | CAM > 2D > Slot | Geometry, Tool, DOC | `CAMSetup.CreateSlot(...)` | GAP |
| Trace | CAM > 2D > Trace | Geometry, Tool, Compensation | `CAMSetup.CreateTrace(...)` | GAP |
| Thread | CAM > 2D > Thread | HoleFace, Tool, Pitch, Depth | `CAMSetup.CreateThread(...)` | GAP |
| Bore | CAM > 2D > Bore | HoleFace, Tool, Compensation | `CAMSetup.CreateBore(...)` | GAP |
| Circular | CAM > 2D > Circular | Center, Tool, StartDiameter, EndDiameter | `CAMSetup.CreateCircular(...)` | GAP |
| Engrave | CAM > 2D > Engrave | Geometry, Tool, Depth | `CAMSetup.CreateEngrave(...)` | GAP |

### 9.2 3D Operations

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| 3D Adaptive | CAM > 3D > Adaptive | Geometry, Tool, OptimalLoad, StepDown, MaxStepDown | `CAMSetup.Create3DAdaptive(...)` | COVERED |
| 3D Pocket | CAM > 3D > Pocket | Geometry, Tool, DOC, WOC | `CAMSetup.Create3DPocket(...)` | GAP |
| Parallel | CAM > 3D > Parallel | Geometry, Tool, Stepover, Direction | `CAMSetup.CreateParallel(...)` | COVERED |
| Scallop | CAM > 3D > Scallop | Geometry, Tool, Stepover | `CAMSetup.CreateScallop(...)` | GAP |
| Pencil | CAM > 3D > Pencil | Geometry, Tool | `CAMSetup.CreatePencil(...)` | GAP |
| Contour | CAM > 3D > Contour | Geometry, Tool, Stepdown | `CAMSetup.Create3DContour(...)` | GAP |
| Horizontal | CAM > 3D > Horizontal | Geometry, Tool | `CAMSetup.CreateHorizontal(...)` | GAP |
| Radial | CAM > 3D > Radial | Geometry, Tool, Direction | `CAMSetup.CreateRadial(...)` | GAP |
| Spiral | CAM > 3D > Spiral | Geometry, Tool, Direction | `CAMSetup.CreateSpiral(...)` | GAP |
| Project | CAM > 3D > Project | Geometry, Tool, Curves | `CAMSetup.CreateProject(...)` | GAP |
| Morph | CAM > 3D > Morph | Geometry, Tool, FlowCurves | `CAMSetup.CreateMorph(...)` | GAP |
| Ramp | CAM > 3D > Ramp | Geometry, Tool | `CAMSetup.CreateRamp(...)` | GAP |
| Rest Machining | CAM > 3D > Rest Machining | Geometry, Tool, RestStock | `CAMSetup.CreateRestMachining(...)` | GAP |

### 9.3 Multi-Axis Operations

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Multi-Axis Contour | CAM > Multi-Axis > Contour | Geometry, Tool, ToolAxis | `CAMSetup.CreateMultiAxisContour(...)` | COVERED |
| Swarf | CAM > Multi-Axis > Swarf | RuledSurface, Tool | `CAMSetup.CreateSwarf(...)` | COVERED |
| Flow | CAM > Multi-Axis > Flow | Surface, Tool, FlowCurves | `CAMSetup.CreateFlow(...)` | GAP |
| Morph Spiral | CAM > Multi-Axis > Morph Spiral | Surface, Tool | `CAMSetup.CreateMorphSpiral(...)` | GAP |

### 9.4 Drilling Operations

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Drill | CAM > Drilling > Drill | Holes[], Tool, CycleType, Depth | `CAMSetup.CreateDrill(...)` | COVERED |
| Circular Bore | CAM > Drilling > Circular Bore | Holes[], Tool | `CAMSetup.CreateCircularBore(...)` | GAP |
| Thread Mill | CAM > Drilling > Thread Mill | Holes[], Tool, Pitch | `CAMSetup.CreateThreadMill(...)` | GAP |
| Chamfer Mill (Holes) | CAM > Drilling > Chamfer Mill | Holes[], Tool, ChamferWidth | `CAMSetup.CreateChamferMill(...)` | GAP |

### 9.5 Turning Operations

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Turning Profile | CAM > Turning > Profile | Geometry, Tool, DOC | `CAMSetup.CreateTurningProfile(...)` | COVERED |
| Turning Facing | CAM > Turning > Facing | Geometry, Tool | `CAMSetup.CreateTurningFacing(...)` | GAP |
| Turning Grooving | CAM > Turning > Grooving | Geometry, Tool | `CAMSetup.CreateTurningGrooving(...)` | GAP |
| Turning Threading | CAM > Turning > Threading | Geometry, Tool, Pitch | `CAMSetup.CreateTurningThreading(...)` | GAP |

### 9.6 Setup & Post

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Create Setup | CAM > Setup > Create | Model, StockType, Origin, WCS | `CAMSetup.CreateSetup(model, stockType)` | COVERED |
| Post Process | CAM > Actions > Post Process | PostProcessor, OutputFile | `CAMSetup.PostProcess(postProcessor, outputFile)` | COVERED |
| Simulate | CAM > Actions > Simulate | Speed, DisplayStock | `CAMSetup.Simulate(...)` | GAP |
| Generate | CAM > Actions > Generate | Operations[] | `CAMSetup.Generate(operations)` | GAP |
| Tool Library | CAM > Manage > Tool Library | | `CAMSetup.OpenToolLibrary()` | GAP |

---

## 10. iLOGIC / PARAMETERS (19 functions)

### 10.1 Parameter Operations

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Add Parameter | Manage > Parameters > Add | Name, Unit, Value, Expression | `Parameters.AddByExpression(name, unit, expression)` | GAP |
| Edit Parameter | Manage > Parameters > Edit | Name, NewValue | `Parameter(name) = value` | GAP |
| Link Parameter | Manage > Parameters > Link | ParameterName, SpreadsheetCell | `Parameters.LinkToCell(name, cell)` | GAP |
| Export Parameters | Manage > Parameters > Export | FilePath | `Parameters.ExportToFile(path)` | GAP |
| Import Parameters | Manage > Parameters > Import | FilePath | `Parameters.ImportFromFile(path)` | GAP |
| Drive Dimensions | iLogic > Rule > Drive Dimensions | | `iLogicVb.RunRule(ruleName)` | GAP |

### 10.2 iLogic Rules

| Function | Ribbon Path | Parameters | API/iLogic | Status |
|----------|-------------|------------|------------|--------|
| Add Rule | Manage > iLogic > Add Rule | Name, Code | `iLogicRules.Add(name, code)` | GAP |
| Run Rule | Manage > iLogic > Run | RuleName | `iLogicVb.RunRule(ruleName)` | GAP |
| Run External Rule | Manage > iLogic > Run External | FilePath | `iLogicVb.RunExternalRule(filePath)` | GAP |
| Rule Trigger | Manage > iLogic > Triggers | Event, Rule | `iLogicTriggers.Add(event, rule)` | GAP |
| Forms | Manage > iLogic > Forms | FormName | `iLogicForm.Show(formName)` | GAP |
| Event Triggers | Manage > iLogic > Event Triggers | OnSave, OnOpen, etc. | `iLogicEventTriggers.Add(event, rule)` | GAP |

### 10.3 Document Management

| Function | API/iLogic | Status |
|----------|------------|--------|
| Open Document | `ThisApplication.Documents.Open(filePath)` | GAP |
| Save Document | `ThisDoc.Save()` | GAP |
| Save As | `ThisDoc.SaveAs(filePath, copyMode)` | GAP |
| Export STL | `PartDoc.SaveAs(path, kSTLFileType)` | GAP |
| Export STEP | `PartDoc.SaveAs(path, kSTEPFileType)` | GAP |
| Export IGES | `PartDoc.SaveAs(path, kIGESFileType)` | GAP |
| Export SAT | `PartDoc.SaveAs(path, kSATFileType)` | GAP |

---

## KEYBOARD SHORTCUTS (Common)

| Shortcut | Function | Environment |
|----------|----------|-------------|
| F2 | Pan | All |
| F3 | Zoom | All |
| F4 | Rotate | All |
| F5 | Previous View | All |
| F6 | Isometric View | All |
| F7 | Slice Graphics | All |
| F8 | Hide All Constraints | Sketch |
| F9 | Show All Constraints | Sketch |
| C | Circle | Sketch |
| L | Line | Sketch |
| E | Extrude | Part |
| H | Hole | Part |
| F | Fillet | Part |
| P | Place Component | Assembly |
| Ctrl+E | Edit Feature | All |
| Ctrl+Shift+E | Edit Sketch | Part |
| Ctrl+Y | Construction Mode Toggle | Sketch |
| Esc | Cancel/Deselect | All |
| Space | Toggle Previous Tool | All |

---

## CONTEXT MENU FUNCTIONS (Selection-Based)

### Part Face Context Menu
- Edit Feature, Edit Sketch, Show Dimensions
- Delete, Copy, Make Component
- Create Work Plane, Create Work Axis
- Measure, Section Analysis
- Face Draft, Split, Delete Face
- Extrude (direct edit), Shell

### Assembly Occurrence Context Menu
- Edit, Open, Isolate
- Ground, Flexible, Contact Set
- Replace, Delete, Copy
- Create Component, Derive
- Visibility, Transparency
- BOM Structure, Properties

### Sketch Entity Context Menu
- Delete, Construction, Centerline
- Trim, Extend, Split
- Move, Copy, Rotate, Scale
- Fix, Show Constraints
- Auto Dimension

### Drawing View Context Menu
- Edit View, Rotate, Move
- Alignment, Break Alignment
- Visibility, Recover View
- Section View, Detail View
- Create Sketch

---

## PRISM ENGINE COVERAGE SUMMARY

**Currently Covered (67 functions across 4 engines):**

1. **InventorCAMAIOrchestrationEngine** (15 functions)
   - Strategy selection, iMachining optimization, physics analysis
   - Tribal knowledge retrieval, reasoning modes

2. **InventorCAMStrategyEngine** (18 functions)
   - 2D/3D/Multi-axis strategy selection
   - Feature-to-strategy mapping
   - Toolpath parameter optimization

3. **InventorCAMCodeGeneratorEngine** (22 functions)
   - NC code generation for Inventor HSM
   - Post processor integration
   - Tool library management

4. **InventorCAMToolExportEngine** (12 functions)
   - HSM .tools format export
   - Cutting data computation
   - Tool library management

**Gap Analysis:**

| Category | Gap Count | Priority |
|----------|-----------|----------|
| Part Modeling | 144 | HIGH - Core modeling automation |
| Sketch | 116 | HIGH - Geometry creation |
| Assembly | 127 | HIGH - Multi-part automation |
| Drawing | 120 | MEDIUM - Documentation |
| Sheet Metal | 63 | MEDIUM - Manufacturing workflow |
| Stress Analysis | 52 | MEDIUM - Validation pipeline |
| Weldment | 34 | LOW - Specialized use |
| Frame Generator | 42 | LOW - Structural use |
| iLogic/Parameters | 19 | HIGH - Automation backbone |

---

## RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Core Modeling (Priority: CRITICAL)
1. InventorPartModelingEngine - Extrude, Revolve, Sweep, Loft, Fillet, Chamfer, Shell
2. InventorSketchEngine - Lines, Circles, Arcs, Constraints, Dimensions
3. InventorParameterEngine - Parameter read/write, iLogic rule execution

### Phase 2: Assembly & BOM (Priority: HIGH)
4. InventorAssemblyEngine - Place, Constrain, Joint, Ground, Pattern
5. InventorBOMEngine - BOM extraction, Parts list, Component properties
6. InventoriMateEngine - iMate definition, automatic placement

### Phase 3: Documentation (Priority: MEDIUM)
7. InventorDrawingViewEngine - Base/Projected/Section/Detail views
8. InventorAnnotationEngine - Dimensions, GD&T, Symbols, Tables
9. InventorSheetEngine - Sheet management, Title blocks, Borders

### Phase 4: Specialized (Priority: LOW-MEDIUM)
10. InventorSheetMetalEngine - Face, Flange, Bend, Flat Pattern
11. InventorStressAnalysisEngine - Study, Constraints, Loads, Results
12. InventorFrameEngine - Frame insert, Miter, Trim, Notch
13. InventorWeldmentEngine - Weld prep, Weld beads, Machining

### Phase 5: Advanced Automation (Priority: HIGH)
14. InventoriLogicEngine - Rule execution, Forms, Event triggers
15. InventorExportEngine - STL, STEP, IGES, DXF export
16. InventorBatchEngine - Multi-file processing, Automation scripts

---

## API REFERENCE PATTERNS

### TransientGeometry (Point/Vector Creation)
```vb
Dim tg As TransientGeometry = ThisApplication.TransientGeometry
Dim pt As Point = tg.CreatePoint(x, y, z)
Dim vec As Vector = tg.CreateVector(dx, dy, dz)
```

### Parameter Access
```vb
' Read parameter
Dim width As Double = Parameter("width")

' Set parameter
Parameter("width") = 25.4

' With units
Parameter("height") = 2 * 25.4 ' inches to mm
```

### Feature Creation Pattern
```vb
Dim doc As PartDocument = ThisDoc.Document
Dim def As PartComponentDefinition = doc.ComponentDefinition
Dim features As PartFeatures = def.Features

' Extrude example
Dim sketch As Sketch = def.Sketches.Item(1)
Dim profile As Profile = sketch.Profiles.AddForSolid()
Dim extDef As ExtrudeDefinition = features.ExtrudeFeatures.CreateExtrudeDefinition(profile, kJoinOperation)
extDef.SetDistanceExtent(25.4, kPositiveExtentDirection)
Dim extrude As ExtrudeFeature = features.ExtrudeFeatures.Add(extDef)
```

### Assembly Constraint Pattern
```vb
Dim asm As AssemblyDocument = ThisDoc.Document
Dim def As AssemblyComponentDefinition = asm.ComponentDefinition

' Get occurrences
Dim occ1 As ComponentOccurrence = def.Occurrences.Item(1)
Dim occ2 As ComponentOccurrence = def.Occurrences.Item(2)

' Get faces
Dim face1 As Face = occ1.SurfaceBodies.Item(1).Faces.Item(1)
Dim face2 As Face = occ2.SurfaceBodies.Item(1).Faces.Item(1)

' Add mate constraint
Dim constraint As MateConstraint = def.Constraints.AddMateConstraint(face1, face2, 0)
```

---

**Document Version**: 1.0
**Last Updated**: 2026-04-18
**Total Functions Documented**: 847
**PRISM Coverage**: 7.9% (67/847)
**Priority Gaps**: Part Modeling, Sketch, Assembly, iLogic
