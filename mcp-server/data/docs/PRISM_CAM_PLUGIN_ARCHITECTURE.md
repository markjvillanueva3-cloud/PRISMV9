# PRISM CAM Plugin Architecture

**Version:** 1.0.0  
**Status:** Design Complete  
**Milestone:** PLUGIN-ARCH-MS0  
**Date:** 2026-04-18

---

## Executive Summary

This document defines the unified plugin architecture for direct CAM system integration with PRISM. The architecture supports:

- **hyperMILL** (.NET assembly via COM/Automation API)
- **Fusion 360** (Python add-in via adsk.cam namespace)
- **Inventor HSM** (COM add-in with iLogic integration)
- **Mastercam** (NET-Hook DLL with NCI manipulation)

All plugins communicate with PRISM MCP Server via a unified JSON-RPC 2.0 protocol over WebSocket (real-time) or REST (fallback).

---

## 1. Unified PRISM-CAM Bridge Protocol

### 1.1 Protocol Selection

**Primary:** JSON-RPC 2.0 over WebSocket  
**Fallback:** JSON-RPC 2.0 over HTTPS REST  

**Rationale:**
- JSON-RPC 2.0: Lightweight, bidirectional, supports batch calls
- WebSocket: Real-time events (operation complete, tool change, parameter update)
- REST fallback: Firewalled environments, legacy systems
- NOT gRPC: Adds proto compilation complexity in each CAM plugin runtime

### 1.2 Connection Endpoints

```
WebSocket:  ws://localhost:18361/ws/plugin
REST:       http://localhost:18361/api/v1/plugin
Health:     http://localhost:18361/health
```

### 1.3 Authentication

| Method | Use Case |
|--------|----------|
| `api_key` | Default for shop floor deployment |
| `mtls` | Enterprise environments with PKI |
| `oauth2` | Cloud-connected CAM systems (Fusion 360) |
| `none` | Local development only |

### 1.4 Request/Response Envelope

```typescript
// Request
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "prism.optimize_speed_feed",
  "params": {
    "material": { "iso_group": "P", "name": "4140 Steel" },
    "tool": { "diameter_mm": 12.7, "flute_count": 4 },
    "operation": "roughing"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "optimized_params": {
      "spindle_rpm": 3762,
      "feed_rate_mmmin": 1505,
      "axial_depth_mm": 25.4,
      "radial_depth_mm": 3.175
    },
    "physics": {
      "cutting_force_N": 847,
      "power_kW": 4.2,
      "tool_life_min": 67,
      "chatter_risk": "low"
    },
    "confidence": 0.91
  }
}
```

### 1.5 Available RPC Methods

| Category | Method | Description |
|----------|--------|-------------|
| **Physics** | `prism.optimize_speed_feed` | Get optimized S/F for operation |
| | `prism.calculate_force` | Kienzle cutting force calculation |
| | `prism.calculate_tool_life` | Taylor tool life estimation |
| | `prism.check_stability` | Chatter stability analysis |
| | `prism.calculate_deflection` | Tool/part deflection check |
| | `prism.analyze_physics` | Full physics analysis bundle |
| **Safety** | `prism.check_safety` | S(x) safety score evaluation |
| | `prism.validate_machine_limits` | Check against machine envelope |
| | `prism.validate_gcode` | G-code safety scan |
| **Knowledge** | `prism.get_tribal_tip` | Contextual tribal knowledge |
| | `prism.get_material` | Material properties lookup |
| | `prism.get_tool_recommendations` | Tool selection advice |
| | `prism.get_strategy` | Strategy recommendation |
| **Session** | `prism.register_plugin` | Register plugin with server |
| | `prism.heartbeat` | Keep-alive ping |
| | `prism.subscribe_events` | Subscribe to server events |
| | `prism.log` | Send log entry to server |

### 1.6 Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32001 | `SAFETY_VIOLATION` | Safety score below threshold |
| -32002 | `PARAMETER_OUT_OF_RANGE` | Value outside valid range |
| -32003 | `MACHINE_LIMIT_EXCEEDED` | Exceeds machine capability |
| -32004 | `OPERATION_CANCELLED` | User cancelled operation |
| -32005 | `TOOLPATH_INVALID` | Invalid toolpath data |
| -32009 | `CHATTER_RISK_HIGH` | High chatter risk detected |
| -32010 | `DEFLECTION_RISK_HIGH` | High deflection risk detected |

---

## 2. Cross-CAM Parameter Mapping Schema

The parameter mapping schema normalizes CAM-specific parameter names to a unified PRISM format.

### 2.1 Core Parameters

| PRISM Name | Unit | hyperMILL | Fusion 360 | Inventor HSM | Mastercam |
|------------|------|-----------|------------|--------------|-----------|
| `spindle_rpm` | RPM | SpindleSpeed | spindleSpeed | RPM | SpindleSpeed |
| `surface_speed_mmin` | m/min | CuttingSpeed | surfaceSpeed | SurfaceSpeed | SurfaceSpeed |
| `feed_rate_mmmin` | mm/min | FeedRate | cuttingFeedrate | FeedRate | FeedRate |
| `feed_per_tooth_mm` | mm/tooth | FeedPerTooth | feedPerTooth | FeedPerTooth | ChipLoad |
| `axial_depth_mm` | mm | AxialDepth | maximumStepdown | StepDown | AxialDepth |
| `radial_depth_mm` | mm | RadialDepth | maximumStepover | StepOver | RadialDepth |
| `optimal_load_pct` | % | MAXXEngagement | optimalLoad | OptimalLoad | DynamicEngagement |
| `stock_to_leave_mm` | mm | StockAllowance | stockToLeave | StockToLeave | StockToLeave |
| `plunge_feed_mmmin` | mm/min | PlungeRate | plungeFeedrate | PlungeFeed | PlungeRate |
| `coolant_mode` | enum | Coolant | coolantMode | Coolant | Coolant |
| `cutting_mode` | enum | CuttingDirection | machineDirection | CuttingDirection | CutDirection |

### 2.2 Parameter Categories

- **speeds_feeds**: spindle_rpm, surface_speed_mmin, feed_rate_mmmin, feed_per_tooth_mm
- **depths**: axial_depth_mm, radial_depth_mm, stock_to_leave_mm
- **toolpath**: optimal_load_pct, cutting_mode
- **linking**: retract_height_mm, rapid_feed_mmmin
- **machine**: coolant_mode

### 2.3 Physics-Critical vs Safety-Critical

| Parameter | Physics-Critical | Safety-Critical |
|-----------|-----------------|-----------------|
| spindle_rpm | Yes | Yes |
| feed_rate_mmmin | Yes | Yes |
| axial_depth_mm | Yes | Yes |
| radial_depth_mm | Yes | Yes |
| surface_speed_mmin | Yes | No |
| retract_height_mm | No | Yes |
| rapid_feed_mmmin | No | Yes |

---

## 3. hyperMILL Plugin Architecture

### 3.1 Integration Method

**.NET Assembly (C#)** via Open Mind Automation COM API

### 3.2 Key COM Objects

```csharp
// Main application
OMAutomation.Application app = new OMAutomation.Application();

// Active project
OMAutomation.Project project = app.ActiveProject;

// Operations
OMAutomation.Operations operations = project.Operations;
OMAutomation.Operation op = operations.Item(1);

// Parameters
double rpm = op.SpindleSpeed;
op.SpindleSpeed = 3762;  // Write back optimized value
```

### 3.3 Entry Point / Initialization

```csharp
namespace PRISM.HyperMillPlugin
{
    [ComVisible(true)]
    [Guid("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX")]
    public class PRISMAddin : IOMAddin
    {
        private PRISMBridge _bridge;
        
        public void OnStartup(OMAutomation.Application app)
        {
            _bridge = new PRISMBridge();
            _bridge.Connect(DEFAULT_CONNECTION_CONFIG);
            RegisterRibbonUI(app);
            SubscribeEvents(app);
        }
        
        public void OnShutdown()
        {
            _bridge.Disconnect();
        }
    }
}
```

### 3.4 UI Integration

**Ribbon Tab Configuration:**

```xml
<ribbon>
  <tab name="PRISM AI">
    <group name="Physics">
      <button id="optimizeSF" label="Optimize S/F" 
              icon="prism_optimize.png" callback="OnOptimizeSpeedFeed"/>
      <button id="analyzePhysics" label="Analyze Physics" 
              icon="prism_physics.png" callback="OnAnalyzePhysics"/>
    </group>
    <group name="Safety">
      <button id="checkSafety" label="Safety Check" 
              icon="prism_safety.png" callback="OnCheckSafety"/>
      <button id="validateAll" label="Validate All" 
              icon="prism_validate.png" callback="OnValidateAll"/>
    </group>
    <group name="Knowledge">
      <button id="tribalTip" label="Get Tip" 
              icon="prism_tribal.png" callback="OnGetTribalTip"/>
      <button id="strategy" label="Strategy Advisor" 
              icon="prism_strategy.png" callback="OnStrategyAdvisor"/>
    </group>
  </tab>
</ribbon>
```

**Context Menu:**

```csharp
// Right-click on operation
contextMenu.AddItem("PRISM: Optimize Parameters", OnContextOptimize);
contextMenu.AddItem("PRISM: Check Safety", OnContextSafety);
contextMenu.AddItem("PRISM: Get Tribal Tip", OnContextTribal);
```

### 3.5 Bidirectional Data Sync

```csharp
public async Task SyncOperationToPRISM(OMAutomation.Operation op)
{
    var request = new PhysicsOptimizationRequest
    {
        Material = GetMaterialFromOperation(op),
        Tool = GetToolFromOperation(op),
        CurrentParams = ExtractParameters(op),
        Priority = "balanced",
        IncludePhysics = true
    };
    
    var response = await _bridge.CallAsync<PhysicsOptimizationResponse>(
        "prism.optimize_speed_feed", request);
    
    if (response.Confidence > 0.85)
    {
        ApplyParameters(op, response.OptimizedParams);
        EmbedPhysicsComment(op, response.Physics);
    }
}
```

### 3.6 Event Subscription

```csharp
public void SubscribeEvents(OMAutomation.Application app)
{
    app.OnOperationCreated += OnOperationCreated;
    app.OnOperationModified += OnOperationModified;
    app.OnToolpathCalculated += OnToolpathCalculated;
    app.OnToolChanged += OnToolChanged;
    app.OnPostProcessStarted += OnPostProcessStarted;
    app.OnPostProcessCompleted += OnPostProcessCompleted;
}

private void OnOperationCreated(OMAutomation.Operation op)
{
    // Auto-optimize new operations
    _ = SyncOperationToPRISM(op);
}
```

### 3.7 Safety Interlock

```csharp
public async Task<bool> ValidateBeforeApply(OMAutomation.Operation op, 
                                             NormalizedParameters newParams)
{
    var safetyResult = await _bridge.CallAsync<SafetyCheckResult>(
        "prism.check_safety", newParams);
    
    if (!safetyResult.Allowed)
    {
        foreach (var block in safetyResult.Blocks)
        {
            LogError($"SAFETY BLOCK: {block.Message}");
        }
        ShowSafetyDialog(safetyResult);
        return false;
    }
    
    if (safetyResult.RequiresApproval)
    {
        var approved = await ShowApprovalDialog(safetyResult.ApprovalReason);
        if (!approved) return false;
    }
    
    return true;
}
```

### 3.8 Error Handling / Fallback

```csharp
public class HyperMillErrorHandler : IPluginErrorHandler
{
    private bool _offlineMode = false;
    private readonly OfflineCache _cache;
    
    public void OnConnectionError(Exception error)
    {
        Log.Warn("PRISM server unreachable, enabling offline mode");
        EnableOfflineFallback();
        ShowNotification("PRISM Offline - Using cached data", "warning");
    }
    
    public void EnableOfflineFallback()
    {
        _offlineMode = true;
    }
    
    public PhysicsOptimizationResponse GetFallbackOptimization(
        PhysicsOptimizationRequest request)
    {
        // Try cache first
        var cached = _cache.GetPhysics(request.Material.IsoGroup, 
                                        request.Tool.DiameterMm);
        if (cached != null) return cached;
        
        // Fall back to CAM defaults
        return null;  // Let hyperMILL use its own defaults
    }
}
```

---

## 4. Fusion 360 Plugin Architecture

### 4.1 Integration Method

**Python Add-In** via `adsk.core` / `adsk.cam` modules

### 4.2 Key Namespaces

```python
import adsk.core
import adsk.cam
import adsk.fusion

# Main application
app = adsk.core.Application.get()

# CAM workspace
camWS = adsk.cam.CAM.cast(app.activeProduct)

# Operations
setups = camWS.setups
for setup in setups:
    for op in setup.operations:
        params = op.parameters
```

### 4.3 Entry Point / Initialization

**manifest.json:**
```json
{
    "name": "PRISM AI",
    "id": "com.prism.fusion360",
    "version": "1.0.0",
    "author": "PRISM Manufacturing Intelligence",
    "description": "AI-powered speeds/feeds optimization, safety validation, and tribal knowledge",
    "supportedOS": ["windows", "mac"],
    "startOnStartup": true,
    "contents": {
        "scripts": [
            {"filename": "prism_addin.py"}
        ]
    }
}
```

**prism_addin.py:**
```python
def run(context):
    global _app, _ui, _bridge, _handlers
    
    _app = adsk.core.Application.get()
    _ui = _app.userInterface
    
    # Initialize PRISM bridge
    _bridge = PRISMPhysicsBridge()
    
    # Create toolbar panel
    create_toolbar_panel()
    
    # Register event handlers
    register_event_handlers()
    
    _ui.messageBox('PRISM AI Add-in Started')

def stop(context):
    global _bridge, _handlers
    
    # Clean up UI
    remove_toolbar_panel()
    
    # Disconnect
    if _bridge:
        _bridge.disconnect()
    
    # Clear handlers
    _handlers.clear()
```

### 4.4 UI Integration

```python
def create_toolbar_panel():
    global _ui
    
    # Get CAM workspace
    cam_workspace = _ui.workspaces.itemById('CAMEnvironment')
    toolbar_panels = cam_workspace.toolbarPanels
    
    # Create PRISM panel
    prism_panel = toolbar_panels.add('PRISM_AI_Panel', 'PRISM AI', 
                                      'ToolsPanel', False)
    
    # Add buttons
    add_button(prism_panel, 'OptimizeSF', 'Optimize S/F', 
               'resources/optimize', on_optimize_sf)
    add_button(prism_panel, 'AnalyzePhysics', 'Analyze Physics',
               'resources/physics', on_analyze_physics)
    add_button(prism_panel, 'CheckSafety', 'Safety Check',
               'resources/safety', on_check_safety)
    add_button(prism_panel, 'GetTip', 'Tribal Tip',
               'resources/tribal', on_get_tribal_tip)
```

### 4.5 Cloud API Considerations

```python
class Fusion360CloudIntegration:
    """
    Fusion 360 Cloud Considerations:
    
    1. Tool Library Sync: Cloud tool libraries require Fusion Team access
    2. Project Files: May be cloud-stored, require download for offline
    3. Collaboration: Multiple users may edit same document
    4. Offline Mode: Limited functionality when disconnected
    """
    
    def is_cloud_connected(self):
        return adsk.core.Application.get().isOnline
    
    def sync_tool_library(self):
        """Sync cloud tool library with local PRISM cache"""
        if not self.is_cloud_connected():
            return False
        
        # Get tool library from Fusion Team
        tool_lib = adsk.cam.ToolLibraries.cast(
            adsk.cam.CAM.toolLibraries)
        cloud_libs = tool_lib.cloudToolLibraries
        
        for lib in cloud_libs:
            self._cache_library(lib)
        
        return True
```

### 4.6 Local Execution Requirements

```python
# Fusion 360 CPS post processors are sandboxed:
# - No HTTPClient
# - No network calls
# - getGlobalParameter() cannot read custom add-in attributes

# CORRECT mechanism (per PrismAddinArchitectureEngine.ts):
# 1. Add-in modifies S/F directly via adsk.cam.Operation.parameters
# 2. Physics data embedded as JSON in operation:comment
# 3. Post reads normal spindleSpeed/feed + parses comment JSON

def apply_optimized_parameters(op, optimized):
    """Apply parameters directly to Fusion operation"""
    params = op.parameters
    
    # Write S/F directly
    params.itemByName('spindleSpeed').value.value = optimized.rpm
    params.itemByName('cuttingFeedrate').value.value = optimized.feed_mmmin
    
    # Embed physics in comment for post processor
    physics_json = json.dumps({
        "prism": {
            "version": "1.0.0",
            "force_N": optimized.force_N,
            "power_kW": optimized.power_kW,
            "confidence": optimized.confidence,
            "tool_life_min": optimized.tool_life_min
        }
    })
    
    existing_comment = params.itemByName('comment').value.value
    new_comment = f"{existing_comment} | PRISM:{physics_json}"
    params.itemByName('comment').value.value = new_comment
```

### 4.7 Bidirectional Data Sync

```python
def sync_operation_to_prism(op):
    """Sync Fusion operation to PRISM server"""
    global _bridge
    
    # Extract current parameters
    params = op.parameters
    tool = op.tool
    
    request = {
        "material": {
            "name": get_material_name(op),
            "iso_group": classify_material_iso(get_material_name(op))
        },
        "tool": {
            "diameter_mm": tool.diameter * 10,  # cm to mm
            "flute_count": tool.numberOfFlutes,
            "material": "carbide"
        },
        "operation": classify_operation_type(op.type),
        "current_params": {
            "spindle_rpm": params.itemByName('spindleSpeed').value.value,
            "feed_rate_mmmin": params.itemByName('cuttingFeedrate').value.value,
            "axial_depth_mm": params.itemByName('maximumStepdown').value.value * 10
        },
        "priority": "balanced",
        "include_physics": True,
        "include_tribal": True
    }
    
    response = _bridge.compute_physics_sf(
        tool=request["tool"],
        material=request["material"],
        operation={"type": request["operation"]},
        machine=None
    )
    
    if response and response.confidence > 0.85:
        apply_optimized_parameters(op, response)
        _ui.messageBox(f"Optimized: {response.rpm} RPM, {response.feed_mmmin} mm/min")
```

### 4.8 Event Handlers

```python
class OperationModifiedHandler(adsk.core.CommandEventHandler):
    def notify(self, args):
        # Get modified operation
        event_args = adsk.cam.CAMCommandEventArgs.cast(args)
        op = event_args.operation
        
        if op:
            # Auto-optimize on modification
            sync_operation_to_prism(op)

class PostProcessHandler(adsk.cam.PostProcessEventHandler):
    def notify(self, args):
        # Validate safety before post
        event_args = adsk.cam.PostProcessEventArgs.cast(args)
        
        for op in event_args.operations:
            safety = check_safety_before_post(op)
            if not safety.allowed:
                event_args.fail("PRISM Safety Check Failed: " + 
                               safety.blocks[0].message)
                return
```

---

## 5. Inventor HSM Plugin Architecture

### 5.1 Integration Method

**COM Add-In (.NET)** with iLogic Rule Integration

### 5.2 Key Objects

```csharp
// Inventor Application
Inventor.Application invApp = (Inventor.Application)Marshal.GetActiveObject("Inventor.Application");

// HSM/CAM Document
HSMDocument hsmDoc = invApp.ActiveDocument as HSMDocument;

// Operations
HSMOperationCollection operations = hsmDoc.Operations;
HSMOperation op = operations.Item(1);
```

### 5.3 Entry Point / Initialization

```csharp
namespace PRISM.InventorHSMPlugin
{
    [ComVisible(true)]
    [Guid("YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY")]
    [ProgId("PRISM.InventorHSMAddin")]
    public class PRISMAddin : ApplicationAddInServer
    {
        private Inventor.Application _invApp;
        private PRISMBridge _bridge;
        
        public void Activate(ApplicationAddInSite addInSiteObject, bool firstTime)
        {
            _invApp = addInSiteObject.Application;
            _bridge = new PRISMBridge();
            _bridge.Connect(DEFAULT_CONNECTION_CONFIG);
            
            CreateRibbonUI();
            RegisterEventHandlers();
        }
        
        public void Deactivate()
        {
            _bridge.Disconnect();
        }
    }
}
```

### 5.4 Ribbon UI Integration

```csharp
private void CreateRibbonUI()
{
    Ribbon ribbon = _invApp.UserInterfaceManager.Ribbons["CAM"];
    RibbonTab prismTab = ribbon.RibbonTabs.Add("PRISM AI", "PRISM_Tab", 
                                                "XXXXXXXX-GUID");
    
    RibbonPanel physicsPanel = prismTab.RibbonPanels.Add("Physics", 
                                                          "Physics_Panel",
                                                          "YYYYYYYY-GUID");
    
    // Add buttons
    CommandManager cmdMgr = _invApp.CommandManager;
    
    ButtonDefinition optimizeBtn = cmdMgr.ControlDefinitions.AddButtonDefinition(
        "Optimize S/F", "PRISM_OptimizeSF", 
        CommandTypesEnum.kQueryOnlyCmdType,
        GetGUID(), "Optimize speeds and feeds using AI physics",
        "Optimize S/F", GetIcon16(), GetIcon32());
    
    optimizeBtn.OnExecute += OnOptimizeSF;
    physicsPanel.CommandControls.AddButton(optimizeBtn);
}
```

### 5.5 iLogic Rule Integration

```vb
' iLogic Rule: PRISM_AutoOptimize
' Trigger: On Operation Create

Sub Main()
    Dim prism As Object = GetObject(, "PRISM.InventorHSMAddin")
    
    If prism Is Nothing Then
        MsgBox("PRISM Add-in not loaded")
        Exit Sub
    End If
    
    ' Get current operation
    Dim op As Object = ThisDoc.Document.Operations.Item(1)
    
    ' Call PRISM optimization
    Dim result As Object = prism.OptimizeOperation(op)
    
    If result.Success Then
        ' Apply optimized parameters
        op.RPM = result.OptimizedParams.SpindleRPM
        op.FeedRate = result.OptimizedParams.FeedRate
        op.StepDown = result.OptimizedParams.AxialDepth
        
        MsgBox("Optimized: " & result.OptimizedParams.SpindleRPM & " RPM")
    Else
        MsgBox("Optimization failed: " & result.Error)
    End If
End Sub
```

### 5.6 Bidirectional Data Sync

```csharp
public async Task SyncOperationToPRISM(HSMOperation op)
{
    var request = new PhysicsOptimizationRequest
    {
        Material = new MaterialSpec
        {
            Name = op.Material.Name,
            IsoGroup = ClassifyMaterialISO(op.Material)
        },
        Tool = new ToolSpec
        {
            DiameterMm = op.Tool.Diameter,
            FluteCount = op.Tool.NumberOfFlutes
        },
        CurrentParams = new NormalizedParameters
        {
            SpindleRpm = op.RPM,
            FeedRateMmMin = op.FeedRate,
            AxialDepthMm = op.StepDown
        },
        Priority = "balanced",
        IncludePhysics = true
    };
    
    var response = await _bridge.CallAsync<PhysicsOptimizationResponse>(
        "prism.optimize_speed_feed", request);
    
    if (response.Confidence > 0.85)
    {
        ApplyOptimizedParameters(op, response.OptimizedParams);
    }
}
```

---

## 6. Mastercam Plugin Architecture

### 6.1 Integration Method

**NET-Hook DLL** (preferred) or C-Hook DLL

### 6.2 Key SDK Objects

```csharp
using Mastercam.Support;
using Mastercam.IO;
using Mastercam.Operations;
using Mastercam.Database;

// Get current operation
OperationsManager opMgr = new OperationsManager();
Operation op = opMgr.GetSelectedOperation();

// NCI access
NCIFile nci = new NCIFile(op.NCIPath);
```

### 6.3 Entry Point / Initialization

```csharp
namespace PRISM.MastercamPlugin
{
    public class PRISMNetHook : NetHook3App
    {
        private PRISMBridge _bridge;
        
        public override MCamReturn Init(int param)
        {
            _bridge = new PRISMBridge();
            _bridge.Connect(DEFAULT_CONNECTION_CONFIG);
            
            RegisterRibbonUI();
            RegisterNCIHooks();
            
            return MCamReturn.NoErrors;
        }
        
        public override MCamReturn Close()
        {
            _bridge.Disconnect();
            return MCamReturn.NoErrors;
        }
        
        public override MCamReturn Run(int param)
        {
            // Main entry point when user clicks ribbon button
            ShowPRISMPanel();
            return MCamReturn.NoErrors;
        }
    }
}
```

### 6.4 Ribbon UI Integration

```csharp
private void RegisterRibbonUI()
{
    // Mastercam uses FT_TYPES enumeration for function types
    RibbonManager ribbonMgr = RibbonManager.Instance;
    
    RibbonTab prismTab = ribbonMgr.AddTab("PRISM AI");
    
    RibbonPanel physicsPanel = prismTab.AddPanel("Physics");
    physicsPanel.AddButton(new RibbonButtonDef
    {
        Id = "PRISM_OptimizeSF",
        Label = "Optimize S/F",
        Tooltip = "AI physics optimization",
        Icon = "prism_optimize.png",
        FunctionType = 256,  // FT_NETHOOK
        Callback = OnOptimizeSF
    });
    
    RibbonPanel safetyPanel = prismTab.AddPanel("Safety");
    safetyPanel.AddButton(new RibbonButtonDef
    {
        Id = "PRISM_CheckSafety",
        Label = "Safety Check",
        Tooltip = "Validate safety score",
        Icon = "prism_safety.png",
        FunctionType = 256,
        Callback = OnCheckSafety
    });
}
```

### 6.5 NCI Manipulation

```csharp
// NCI (Neutral Code Intermediate) is Mastercam's internal format
// Sits between CAM operations and post-processed G-code

public class NCIManipulator
{
    public void InjectOptimizedParameters(NCIFile nci, 
                                          NormalizedParameters optimized)
    {
        // Find S/F records in NCI
        foreach (NCIRecord record in nci.Records)
        {
            if (record.Type == NCIRecordType.SpindleSpeed)
            {
                record.Value = optimized.SpindleRpm;
            }
            else if (record.Type == NCIRecordType.FeedRate)
            {
                record.Value = optimized.FeedRateMmMin;
            }
        }
        
        // Add PRISM comment record
        nci.AddComment($"PRISM Optimized: S{optimized.SpindleRpm} F{optimized.FeedRateMmMin}");
    }
}
```

### 6.6 Post Processor Integration

```csharp
public class PostProcessorIntegration
{
    // Pre-post hook: modify NCI before posting
    public MCamReturn OnPrePost(int param)
    {
        OperationsManager opMgr = new OperationsManager();
        var selectedOps = opMgr.GetSelectedOperations();
        
        foreach (var op in selectedOps)
        {
            // Validate safety before posting
            var safety = CheckSafety(op);
            if (!safety.Allowed)
            {
                DialogManager.Error($"PRISM Safety Block: {safety.Blocks[0].Message}");
                return MCamReturn.ErrorOccurred;
            }
            
            // Inject optimized parameters
            NCIFile nci = new NCIFile(op.NCIPath);
            InjectOptimizedParameters(nci, GetOptimizedParams(op));
            nci.Save();
        }
        
        return MCamReturn.NoErrors;
    }
    
    // Post-post hook: validate generated G-code
    public MCamReturn OnPostPost(int param)
    {
        string ncPath = GetLastPostedFilePath();
        string gcode = File.ReadAllText(ncPath);
        
        var validation = _bridge.CallAsync<GCodeValidationResult>(
            "prism.validate_gcode", new { gcode = gcode }).Result;
        
        if (!validation.Safe)
        {
            foreach (var issue in validation.Issues)
            {
                DialogManager.Warning($"Line {issue.Line}: {issue.Message}");
            }
        }
        
        return MCamReturn.NoErrors;
    }
}
```

### 6.7 Bidirectional Data Sync

```csharp
public async Task SyncOperationToPRISM(Operation op)
{
    var request = new PhysicsOptimizationRequest
    {
        Material = new MaterialSpec
        {
            Name = op.Stock.MaterialName,
            IsoGroup = ClassifyMaterialISO(op.Stock.MaterialName)
        },
        Tool = new ToolSpec
        {
            DiameterMm = op.Tool.Diameter,
            FluteCount = op.Tool.Flutes,
            Type = op.Tool.ToolType.ToString()
        },
        CurrentParams = new NormalizedParameters
        {
            SpindleRpm = op.SpindleSpeed,
            FeedRateMmMin = op.FeedRate,
            AxialDepthMm = op.AxialDepth,
            RadialDepthMm = op.RadialDepth
        },
        Priority = "balanced",
        IncludePhysics = true,
        IncludeTribal = true
    };
    
    var response = await _bridge.CallAsync<PhysicsOptimizationResponse>(
        "prism.optimize_speed_feed", request);
    
    if (response.Confidence > 0.85)
    {
        // Apply to Mastercam operation
        op.SpindleSpeed = response.OptimizedParams.SpindleRpm;
        op.FeedRate = response.OptimizedParams.FeedRateMmMin;
        
        // Store physics in operation notes
        op.Notes = $"PRISM: Force={response.Physics.CuttingForceN}N, " +
                   $"Power={response.Physics.PowerKW}kW, " +
                   $"Life={response.Physics.ToolLifeMin}min";
        
        // Regenerate toolpath
        op.Regenerate();
    }
}
```

---

## 7. Plugin Deployment & Update Mechanism

### 7.1 Installation Paths

| CAM System | Default Installation Path |
|------------|---------------------------|
| hyperMILL | `C:\OPEN MIND\hyperMILL\AddIns\PRISM\` |
| Fusion 360 | `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\PRISM\` |
| Inventor HSM | `%APPDATA%\Autodesk\Inventor\Addins\PRISM\` |
| Mastercam | `C:\Mastercam 20XX\nethooks\PRISM\` |

### 7.2 Update Manifest

```json
{
  "plugin_id": "prism-cam-plugin",
  "available_version": "1.2.0",
  "min_prism_version": "2.5.0",
  "min_cam_versions": {
    "hypermill": "2024.1",
    "fusion360": "2.0.16985",
    "inventor_hsm": "2024",
    "mastercam": "2024"
  },
  "release_date": "2026-04-15",
  "release_notes": "Added chatter stability analysis, improved deflection warnings",
  "download_urls": {
    "hypermill": "https://prism.mfg/plugins/hypermill-1.2.0.zip",
    "fusion360": "https://prism.mfg/plugins/fusion360-1.2.0.zip",
    "inventor_hsm": "https://prism.mfg/plugins/inventor-1.2.0.zip",
    "mastercam": "https://prism.mfg/plugins/mastercam-1.2.0.zip"
  },
  "checksums": {
    "hypermill": "sha256:abc123...",
    "fusion360": "sha256:def456...",
    "inventor_hsm": "sha256:ghi789...",
    "mastercam": "sha256:jkl012..."
  },
  "is_critical": false,
  "breaking_changes": []
}
```

### 7.3 Hot-Reload Support

| CAM System | Hot-Reload | Notes |
|------------|------------|-------|
| hyperMILL | Partial | Can reload DLL without restart |
| Fusion 360 | Full | Python add-ins support reload |
| Inventor HSM | No | Requires Inventor restart |
| Mastercam | No | Requires Mastercam restart |

### 7.4 Rollback Procedure

```bash
# Keep last 3 versions for rollback
/plugins/
  /prism-1.2.0/     <- current
  /prism-1.1.0/     <- backup
  /prism-1.0.0/     <- backup
  
# Rollback command
prism-cli plugin rollback --version 1.1.0
```

---

## 8. Safety Interlock Integration

### 8.1 Default Safety Configuration

```typescript
const DEFAULT_SAFETY_INTERLOCK_CONFIG = {
  enabled: true,
  min_safety_score: 0.70,           // Block if S(x) < 0.70
  block_chatter_risk: "high",        // Block on high chatter risk
  block_deflection_risk: "high",     // Block on high deflection risk
  block_power_exceeded: true,        // Block if power > machine max
  block_excessive_feed: true,        // Block if feed dangerously high
  block_rapid_into_material: true,   // Block G00 into cut
  warn_tool_life_below_min: 15,      // Warn if tool life < 15 min
  require_approval_below_score: 0.75 // Human approval if S(x) < 0.75
};
```

### 8.2 Safety Check Flow

```
User Action -> Plugin captures parameters
                         |
                         v
              Call prism.check_safety
                         |
                         v
              +---------+----------+
              |                    |
         S(x) >= 0.70         S(x) < 0.70
              |                    |
              v                    v
         Check warnings       HARD BLOCK
              |                    |
              v                    v
         Any critical?       Show error dialog
              |                    |
          No  |  Yes               |
              |    +---------------+
              v    v
         0.70 <= S(x) < 0.75?
              |
         Yes  |  No
              v    |
         Require   |
         approval  |
              |    |
              v    v
         User approves?
              |
         Yes  |  No
              v    |
         Apply    Cancel
         params
```

### 8.3 Safety Block Messages

| Rule | Severity | Message |
|------|----------|---------|
| `safety_score_low` | critical | Safety score {score} below minimum 0.70 |
| `chatter_risk_high` | critical | High chatter risk detected at {rpm} RPM |
| `deflection_risk_high` | critical | Deflection exceeds tolerance ({deflection}mm > {limit}mm) |
| `power_exceeded` | critical | Spindle power {power}kW exceeds machine max {max}kW |
| `rapid_into_material` | critical | Rapid move (G00) detected below stock surface |
| `excessive_feed` | high | Feed rate {feed} mm/min exceeds safe limit |
| `tool_life_short` | medium | Tool life {life}min below threshold |

---

## 9. Error Handling & Fallback

### 9.1 Connection Error Handling

```typescript
onConnectionError(error: Error): void {
  // 1. Log error
  logger.error("PRISM connection lost", error);
  
  // 2. Enable offline mode
  this.enableOfflineFallback();
  
  // 3. Notify user
  this.showNotification(
    "PRISM server unreachable - using cached data",
    "warning"
  );
  
  // 4. Schedule reconnect
  this.scheduleReconnect();
}
```

### 9.2 Offline Fallback Behavior

| Feature | Offline Behavior |
|---------|-----------------|
| Speed/Feed Optimization | Use cached results if available, else CAM defaults |
| Safety Check | Use local rules (conservative) |
| Tribal Tips | Use cached tips if available |
| Material Lookup | Use local database |
| Tool Recommendations | Disabled |
| Strategy Advisor | Disabled |

### 9.3 Cache Configuration

```typescript
const OFFLINE_FALLBACK_CONFIG = {
  enabled: true,
  use_cached_physics: true,
  use_cached_tips: true,
  cache_directory: "%APPDATA%/PRISM/cache",
  cache_ttl_hours: 168,  // 1 week
  fallback_to_cam_defaults: true,
  show_offline_indicator: true
};
```

---

## 10. Telemetry & Logging

### 10.1 Telemetry Configuration

```typescript
const TELEMETRY_CONFIG = {
  enabled: true,
  endpoint: "https://telemetry.prism.mfg/v1/plugin",
  include_operation_counts: true,
  include_timing: true,
  include_errors: true,
  anonymize: true,   // No machine/shop identifiers
  flush_interval_sec: 300
};
```

### 10.2 Log Entry Format

```json
{
  "timestamp": "2026-04-18T14:32:15.123Z",
  "level": "info",
  "source": "PRISMPlugin.Fusion360",
  "message": "Optimized operation: Adaptive Clearing 1",
  "data": {
    "operation_id": "op-001",
    "original_rpm": 3000,
    "optimized_rpm": 3762,
    "confidence": 0.91,
    "processing_time_ms": 127
  },
  "cam_system": "fusion360",
  "operation_id": "op-001"
}
```

---

## 11. TypeScript Interface Reference

All TypeScript interfaces are defined in:
- `src/types/cam-plugin-architecture.ts` - Complete type definitions
- `src/engines/CAMPluginSDKEngine.ts` - SDK implementation
- `src/engines/PrismAddinArchitectureEngine.ts` - Add-in architecture patterns

Key interfaces:
- `IPRISMCAMPlugin` - Base plugin interface
- `NormalizedOperationData` - Cross-CAM operation data
- `NormalizedParameters` - Unified parameter schema
- `PhysicsOptimizationRequest/Response` - Optimization API
- `SafetyCheckResult` - Safety interlock result
- `CrossCAMParameterMap` - Parameter mapping table

---

## 12. Implementation Roadmap

| Phase | Milestone | Deliverables |
|-------|-----------|--------------|
| 1 | PLUGIN-ARCH-MS0 | Architecture design (this document) |
| 2 | PLUGIN-PROTO-MS0 | JSON-RPC bridge, WebSocket server |
| 3 | PLUGIN-FUSION-MS0 | Fusion 360 Python add-in |
| 4 | PLUGIN-HYPERMILL-MS0 | hyperMILL .NET add-in |
| 5 | PLUGIN-MASTERCAM-MS0 | Mastercam NET-Hook |
| 6 | PLUGIN-INVENTOR-MS0 | Inventor HSM COM add-in |
| 7 | PLUGIN-DEPLOY-MS0 | Installer, auto-update mechanism |
| 8 | PLUGIN-TEST-MS0 | Integration testing across all CAMs |

---

## Appendix A: File Structure

```
mcp-server/
  src/
    types/
      cam-plugin-architecture.ts    <- Core type definitions
      bridge-types.ts               <- Existing bridge types
    engines/
      CAMPluginSDKEngine.ts         <- SDK engine (exists)
      PrismAddinArchitectureEngine.ts <- Architecture engine (exists)
      HyperMillAIOrchestrationEngine.ts
      FusionAIOrchestrationEngine.ts
      MastercamAIOrchestrationEngine.ts
      InventorCAMAIOrchestrationEngine.ts
    tools/dispatchers/
      bridgeDispatcher.ts           <- Protocol bridge
  scripts/
    fusion360-prism-addin/
      prism_bridge.py               <- Existing Fusion bridge
      prism_operation_writer.py
  plugins/                          <- Plugin source code
    hypermill/
      PRISM.HyperMillAddin.sln
    fusion360/
      PRISM-AI/
        manifest.json
        prism_addin.py
    inventor/
      PRISM.InventorAddin.sln
    mastercam/
      PRISM.MastercamNetHook.sln
```

---

## Appendix B: Existing Infrastructure

The following components already exist and will be leveraged:

1. **CAMPluginSDKEngine** (`src/engines/CAMPluginSDKEngine.ts`)
   - Physics optimization API (<10ms response)
   - Safety check API
   - Tool recommendation API
   - Tribal knowledge API

2. **PrismAddinArchitectureEngine** (`src/engines/PrismAddinArchitectureEngine.ts`)
   - Comment JSON schema for physics embedding
   - CPS parser code generation
   - Sidecar JSON format

3. **Fusion 360 Bridge** (`scripts/fusion360-prism-addin/prism_bridge.py`)
   - HTTP bridge to PRISM server
   - Physics S/F computation
   - Batch operation support

4. **Protocol Bridge** (`src/tools/dispatchers/bridgeDispatcher.ts`)
   - Multi-protocol gateway (REST, gRPC, GraphQL, WebSocket)
   - API key management
   - Rate limiting

5. **CAM AI Orchestration Engines**
   - HyperMillAIOrchestrationEngine (55+ hyperMILL engines)
   - FusionAIOrchestrationEngine (Adaptive Clearing optimization)
   - MastercamAIOrchestrationEngine (Dynamic Motion optimization)
   - InventorCAMAIOrchestrationEngine

---

*Document generated by PRISM Manufacturing Intelligence Platform*
