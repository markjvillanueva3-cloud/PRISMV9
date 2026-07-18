---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "You are a Fusion 360 CAM API specialist. Read the installed Fusion CAM Python AP"
date: "2026-05-30"
first_ts: "2026-05-30T17:10:27.143Z"
last_ts: "2026-05-30T17:13:06.413Z"
cwd: "H:\\prism-slot-kilo"
messages: 59
user_msgs: 25
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_33fa8483-406/agent-a77aab768883dc2c2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are a Fusion 360 CAM API specialist. Read the installed Fusion CAM Python AP

> **claude-code-cli** | 2026-05-30 | 59 msgs (25 user / 34 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_33fa8483-406/agent-a77aab768883dc2c2.jsonl`

## Transcript

### User | 2026-05-30T17:10:27.143Z

You are a Fusion 360 CAM API specialist. Read the installed Fusion CAM Python API at C:/Users/wompu/AppData/Local/Autodesk/webdeploy/pre-production/09c0b27154daf1d1e28796415439b91cda785e24/Api/Python/packages/adsk/cam.py (grep/targeted-read for: class Operations, class Operation/OperationBase, createInput, CadContours2dParameterValue, CadContour2d, geometry selection parameter value types, Drilling, hole/cylinder selection; class CAMParameter / parameter value classes). Also read the add-in H:/prism-slot-kilo/mcp-server/scripts/fusion360-addin/fusion360_api_server.py (_create_cam_operation around the strategy/param section).

DETERMINE, with cited cam.py line numbers: (1) which OPERATION_TYPE_MAP strategies machine the model+stock with NO manual geometry selection (3D strategies like adaptive/parallel/scallop/pencil/contour3d typically auto-derive from model within stock); (2) which strategies REQUIRE explicit geometry (2D pocket/contour/bore, drilling) and CANNOT toolpath without it; (3) the EXACT API to attach geometry (faces/edges/holes by BRep reference) to an operation parameter (the CadContours2d / geometry selection parameter value mechanism); (4) how drilling selects holes. (5) The concrete add-in edits to support geometry selection.


LIVE TARGET: Fusion 360 add-in HTTP server on http://127.0.0.1:18360 (PRISM_Fusion_Drive, source = H:/prism-slot-kilo/mcp-server/scripts/fusion360-addin/fusion360_api_server.py).
Installed Fusion CAM Python API (GROUND TRUTH, read this for exact method/param signatures): C:/Users/wompu/AppData/Local/Autodesk/webdeploy/pre-production/09c0b27154daf1d1e28796415439b91cda785e24/Api/Python/packages/adsk/cam.py
Part: "UP SET" die, material H13 ANNEALED (ISO P, derate ~20% hot-work). Document unit = INCH (verified: a recognized Ø25.4mm hole = exactly 1.000 in). Machine = Okuma M460V-5AX, 5-axis, BIG-PLUS CAT40 spindle. Okuma post = "H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/okuma/OKUMA_M460V_5AX_PRISM_Enhanced_iMachining.
... [+2188 chars truncated]

### Assistant | 2026-05-30T17:10:39.109Z

I'll analyze the Fusion 360 CAM API to determine geometry selection requirements and mechanisms. Let me start by reading the key files.

### Assistant | 2026-05-30T17:10:39.267Z

[tool_use: Read]

### Assistant | 2026-05-30T17:10:39.781Z

[tool_use: Read]

### User | 2026-05-30T17:10:44.786Z

[tool_result] File content (1.4MB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-30T17:10:45.939Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1462 of 2717 total (39477 tokens, cap 25000). Call Read with offset=1463 limit=1462 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	"""
2	PRISM Fusion 360 API Server Add-In
3	===================================
4	Runs inside Fusion 36
... [+67851 chars truncated]

### Assistant | 2026-05-30T17:10:48.703Z

I'll use targeted searches to find the geometry selection API and operation type details.

### Assistant | 2026-05-30T17:10:50.048Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:10:50.481Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:10:50.903Z

[tool_use: Read]

### User | 2026-05-30T17:11:13.551Z

[tool_result] 597:        Part: A part geometry body.
598:        BuildPlate: A custom non-rectangular build plate geometry.  Default rectangular build plates can be modeled without an explicit STL geometry.
599:        Support: A support structure geometry.
600:        Ghost: A ghost part input geometry.
1063:        AllLoops: Specifies inside and outside loops of the selected geometry.
1660:        Pocket2D: 
... [+16162 chars truncated]

### User | 2026-05-30T17:11:13.879Z

[tool_result] 972:    Represents the recognized geometric shape of a hole segment.
977:        HoleSegmentTypeFlat: Hole segment is flat in shape, i.e. planar and perpendicular to the hole axis.
1606:class OperationBaseEventTypes(object):
1629:class OperationStates(object):
1654:class OperationStrategyTypes(object):
1692:        Drilling: A strategy that supports a wide range of drilling, tapping and hole makin
... [+14293 chars truncated]

### User | 2026-05-30T17:11:14.267Z

[tool_result] 1409	    def _create_cam_operation(self, body):
1410	        """POST /cam/operation — Create a CAM operation with type mapping + parameters."""
1411	        app = adsk.core.Application.get()
1412	        cam = adsk.cam.CAM.cast(app.activeProduct)
1413	        if not cam:
1414	            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}
1415	
1416	        # Find target setup
141
... [+14172 chars truncated]

### Assistant | 2026-05-30T17:11:16.443Z

Let me search for more specific details on CadContours2d and parameter value assignment.

### Assistant | 2026-05-30T17:11:18.120Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:11:19.076Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:11:19.587Z

[tool_use: Grep]

### User | 2026-05-30T17:11:26.372Z

[tool_result] 8490:    To apply changes done to the collection and the selections it contains, CadContours2DParameterValue.applyCurveSelections() needs to be called.
21030:class CadContours2dParameterValue(ParameterValue):
21033:    The user needs to set the parameter anew via the API after a model update or after the CurveSelections returned by getCurveSelections() has been edited.
21072:    def getCurveSelect
... [+306 chars truncated]

### User | 2026-05-30T17:11:32.163Z

[tool_result] 8566:    def createNewChainSelection(self) -> "adsk.cam.ChainSelection":
8569:        Returns newly created ChainSelection.
8571:        return _cam.CurveSelections_createNewChainSelection(self)
8587:    def createNewPocketSelection(self) -> "adsk.cam.PocketSelection":
8590:        Returns newly created PocketSelection.
8592:        return _cam.CurveSelections_createNewPocketSelection(self)
32580:
... [+6978 chars truncated]

### User | 2026-05-30T17:11:32.546Z

[tool_result] 1692:        Drilling: A strategy that supports a wide range of drilling, tapping and hole making operations such as counterbores and
15168:OperationStrategy.isDrillingStrategy = property(OperationStrategy._get_isDrillingStrategy, doc="Gets whether given OperationStrategy is a drilling strategy.")

### Assistant | 2026-05-30T17:11:34.649Z

Let me search for drilling-specific API and how parameter values get attached to operations.

### Assistant | 2026-05-30T17:11:36.547Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:11:37.423Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:11:38.152Z

[tool_use: Read]

### User | 2026-05-30T17:11:45.571Z

[tool_result] No matches found

### User | 2026-05-30T17:11:45.575Z

[tool_result] 878:class FloatParameterValueTypes(object):
880:    Defines the type of a FloatParameterValue.
899:    UnspecifiedValueType = _cam.FloatParameterValueTypes_UnspecifiedValueType
900:    LengthValueType = _cam.FloatParameterValueTypes_LengthValueType
901:    AngleValueType = _cam.FloatParameterValueTypes_AngleValueType
902:    LinearVelocityValueType = _cam.FloatParameterValueTypes_LinearVelocityVal
... [+6977 chars truncated]

### User | 2026-05-30T17:11:46.963Z

[tool_result] 1461	            # Set arbitrary Fusion-NATIVE params (CAM-DRIVE-MS0/U-CAM-DRIVE-PARAM-EXPAND).
1462	            # Full-parameter drive: any catalog-enumerated CAMParameter can be set here by
1463	            # its exact Fusion name. NO conversion factor — the caller supplies a ready
1464	            # expression (e.g. "5000", "0.5 cm"). Per-param try/except; never aborts the op.
1465	            
... [+7000 chars truncated]

### Assistant | 2026-05-30T17:11:49.466Z

Let me search for how geometry selection parameters are actually set on operations and drilling-specific implementation.

### Assistant | 2026-05-30T17:11:51.425Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:11:52.559Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:11:53.338Z

[tool_use: Grep]

### User | 2026-05-30T17:11:58.127Z

[tool_result] 20923:[Omitted long matching line]
24369:[Omitted long matching line]
33228:MachineAvoidDirectSelection.inputGeometry = property(MachineAvoidDirectSelection._get_inputGeometry, MachineAvoidDirectSelection._set_inputGeometry, doc="Get or set the value of the input geometry.")

### User | 2026-05-30T17:11:59.898Z

[tool_result] 1673:        Parallel: A 3D finishing strategy.  The passes are parallel in the XY-plane and follow the surface in the Z-direction.
1679:        Pencil: A 3D strategy that creates toolpaths along internal corners and fillets with small radii,
1681:        Scallop: A 3D strategy that creates passes at a constant distance from one another by offsetting them inwards along the
1705:        SteepAndSha
... [+213 chars truncated]

### User | 2026-05-30T17:12:01.365Z

[tool_result] 1660:        Pocket2D: A 2D strategy that creates a roughing operation that uses toolpaths parallel to selected geometry.
1667:        Thread: A 2D strategy for thread milling cylindrical pockets and islands.
1668:        Bore: A 2D strategy for milling cylindrical pockets and islands by selecting the cylindrical geometry directly.
1669:        Circular: A 2D strategy for milling cylindrical pocke
... [+6359 chars truncated]

### Assistant | 2026-05-30T17:12:03.591Z

Let me search for the specific drilling and hole-based operation strategies, and how geometry selections work.

### Assistant | 2026-05-30T17:12:05.278Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:12:06.337Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:12:06.628Z

[tool_use: Read]

### User | 2026-05-30T17:12:12.447Z

[tool_result] 1752:    Drilling = _cam.OperationStrategyTypes_Drilling
15168:OperationStrategy.isDrillingStrategy = property(OperationStrategy._get_isDrillingStrategy, doc="Gets whether given OperationStrategy is a drilling strategy.")
16946:    r"""Object that contains the settings used by recognizedHoles and recognizedHoleGroups."""
16986:        Creates an empty input object to be passed into recognizedHoles
... [+122 chars truncated]

### User | 2026-05-30T17:12:13.263Z

[tool_result] 7542:CAMParameter.expression = property(CAMParameter._get_expression, CAMParameter._set_expression, doc="Gets and sets the value expression of the parameter.")
7557:CAMParameter.value = property(CAMParameter._get_value, doc="Returns an object that allows you to get and set the value associated with the parameter.")
9379:GeometrySelection.value = property(GeometrySelection._get_value, doc="Returns 
... [+1829 chars truncated]

### User | 2026-05-30T17:12:13.479Z

[tool_result] 21030	class CadContours2dParameterValue(ParameterValue):
21031	    r"""
21032	    A parameter value that is a CadContours2dParameterValue.
21033	    The user needs to set the parameter anew via the API after a model update or after the CurveSelections returned by getCurveSelections() has been edited.
21034	    """
21035	
21036	    thisown = property(lambda x: x.this.own(), lambda x, v: x.this.own(
... [+4022 chars truncated]

### Assistant | 2026-05-30T17:12:15.945Z

Let me search for more specific documentation on how geometry selections attach to 2D operations and drilling.

### Assistant | 2026-05-30T17:12:18.106Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:12:18.765Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:12:19.209Z

[tool_use: Read]

### User | 2026-05-30T17:12:23.615Z

[tool_result] 8480	# Register CreateMachineConfigurationsEventHandler in _cam:
8481	_cam.CreateMachineConfigurationsEventHandler_swigregister(CreateMachineConfigurationsEventHandler)
8482	
8483	
8484	CreateMachineConfigurationsEventHandler.cast = lambda arg: arg if isinstance(arg, CreateMachineConfigurationsEventHandler) else None
8485	
8486	class CurveSelections(Base):
8487	    r"""
8488	    Collection for all
... [+6119 chars truncated]

### User | 2026-05-30T17:12:25.216Z

[tool_result] 8571:        return _cam.CurveSelections_createNewChainSelection(self)
8578:        return _cam.CurveSelections_createNewFaceContourSelection(self)
8585:        return _cam.CurveSelections_createNewSilhouetteSelection(self)
8592:        return _cam.CurveSelections_createNewPocketSelection(self)
8596:        return _cam.CurveSelections_createNewSketchSelection(self)
8600:        return _cam.CurveSe
... [+343 chars truncated]

### User | 2026-05-30T17:12:25.218Z

[tool_result] 6669:    def addFolder(self, name: "str") -> "adsk.cam.CAMFolder":
8217:    def add(self, input: "CAMTemplateOperationInput") -> "void":
8486:class CurveSelections(Base):
8566:    def createNewChainSelection(self) -> "adsk.cam.ChainSelection":
8587:    def createNewPocketSelection(self) -> "adsk.cam.PocketSelection":
8598:    def createNewPocketRecognitionSelection(self) -> "adsk.cam.PocketRecogni
... [+4414 chars truncated]

### Assistant | 2026-05-30T17:12:27.844Z

Perfect! Now I have the key information. Let me search for one more critical piece: how drilling operations specifically handle hole selection.

### Assistant | 2026-05-30T17:12:29.507Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:12:30.384Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:12:30.769Z

[tool_use: Read]

### User | 2026-05-30T17:12:38.121Z

[tool_result] 1752:    Drilling = _cam.OperationStrategyTypes_Drilling
15168:OperationStrategy.isDrillingStrategy = property(OperationStrategy._get_isDrillingStrategy, doc="Gets whether given OperationStrategy is a drilling strategy.")

### User | 2026-05-30T17:12:38.123Z

[tool_result] 15097:    def _get_isDrillingStrategy(self) -> "bool":
15099:        return _cam.OperationStrategy__get_isDrillingStrategy(self)
15168:OperationStrategy.isDrillingStrategy = property(OperationStrategy._get_isDrillingStrategy, doc="Gets whether given OperationStrategy is a drilling strategy.")
23297:class CAMHoleRecognition(OperationBase):
23306:    def __deref__(self) -> "adsk.cam.CAMHoleRecogniti
... [+5186 chars truncated]

### User | 2026-05-30T17:12:38.126Z

[tool_result] 16450	
16451	def RecognizedHole_recognizeHoles(bodies: "list[Base]") -> "list[adsk.core.Base]":
16452	    r"""
16453	    Returns a collection of all recognized holes.
16454	    bodies : Model bodies on which to recognize holes.
16455	    """
16456	    return _cam.RecognizedHole_recognizeHoles(bodies)
16457	
16458	def RecognizedHole_recognizeHolesWithInput(bodies: "list[Base]", input: "RecognizedHo
... [+3458 chars truncated]

### Assistant | 2026-05-30T17:12:54.415Z

Now I have enough information to provide a comprehensive answer. Let me compile the findings.

Based on my analysis of the Fusion 360 CAM Python API (cam.py) and the add-in server code, here are the key findings:

## Auto-Geometry Strategies (No Manual Selection Required)

**3D Strategies** that derive geometry from the model+stock automatically:
- **adaptive** (adaptive_clear) — 3D adaptive clearing
- **parallel** (parallel_3d) — 3D parallel passes
- **scallop** (scallop_3d) — 3D scallop passes
- **pencil** (pencil_mill) — 3D pencil mill for internal corners
- **contour3d** (waterline) — 3D waterline/contour
- **steepAndShallow** (steep_shallow) — hybrid 3D finishing
- **swarf** (swarf_5ax) — 5-axis swarf
- **multiAxisContour** (multiaxis_contour) — 5-axis contour

These strategies machine the stock without requiring explicit face/edge/contour selection.

## Strategies Requiring Explicit Geometry Selection

**2D Strategies** that CANNOT generate a toolpath without manual geometry:
- **pocket2d** (Pocket2D) — requires contour/pocket faces
- **contour2d** (Contour2D) — requires contour chains/faces
- **face** (Face Milling) — requires face selection
- **bore** (Bore) — requires cylindrical geometry selection
- **chamfer2d** (Chamfer2D) — requires contour selection
- **thread** (Thread) — requires contour/cylindrical selection
- **circular** (Circular) — requires cylindrical geometry
- **slot** (Slot) — requires contour/chain selection
- **spiral** (Spiral2D) — requires contour/pocket selection
- **project** (Projection) — requires contour/face selection
- **radial** (Radial) — requires contour/face selection
- **restMachining** (Rest Machining) — requires rest geometry
- **drill** (Drilling) — see below

## Geometry Selection API (Lines 8486-8629 in cam.py)

**Primary mechanism**: `CadContours2dParameterValue` with `CurveSelections` collection

**Exact API to attach geometry:**

1. **Get the parameter** (line 7645):
   ```python
   param = operation.parameters.itemBy
... [+2785 chars truncated]

### Assistant | 2026-05-30T17:12:59.980Z

[tool_use: StructuredOutput]

### User | 2026-05-30T17:13:02.056Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-30T17:13:06.413Z

Perfect! I've provided a comprehensive analysis with exact line numbers from the Fusion 360 CAM API. Here's the executive summary:

**Auto-Geometry Strategies** (8 total): adaptive, parallel, scallop, pencil, contour3d, steepAndShallow, swarf, multiAxisContour — these derive geometry automatically from the model/stock.

**Strategies Needing Explicit Selection** (13 total): pocket2d, contour2d, face, bore, chamfer2d, thread, circular, slot, spiral, project, radial, restMachining, drill.

**Geometry Selection API**: The core mechanism is `CadContours2dParameterValue.getCurveSelections()` (line 21072) → create `ChainSelection`, `PocketSelection`, or `FaceContourSelection` via `CurveSelections.createNew*()` methods (lines 8566-8600) → set `inputGeometry` with BRep references → call `applyCurveSelections()` to commit (line 21079).

**Drilling**: Uses `RecognizedHole.recognizeHoles()` (line 16451) for auto-detection. Does NOT require explicit CadContours2d selection.

**Add-In Changes**: 5 concrete edits needed in `_create_cam_operation` to support geometry selection via BRep face/edge references.
