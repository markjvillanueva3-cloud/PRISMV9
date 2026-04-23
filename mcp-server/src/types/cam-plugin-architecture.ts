/**
 * PRISM CAM Plugin/Addon Architecture
 * ====================================
 *
 * Unified plugin system for direct CAM system integration.
 * Supports hyperMILL, Fusion 360, Inventor HSM, and Mastercam.
 *
 * Design Principles:
 *   1. Native integration per CAM platform (.NET for hyperMILL/Mastercam, Python for Fusion)
 *   2. Unified PRISM-CAM Bridge Protocol (JSON-RPC 2.0 over WebSocket/HTTP)
 *   3. Cross-CAM parameter mapping via normalized schema
 *   4. Real-time bidirectional sync with safety interlocks
 *   5. Hot-reload plugin deployment without CAM restart
 *
 * @module types/cam-plugin-architecture
 * @version 1.0.0
 * @milestone PLUGIN-ARCH-MS0
 */

// ============================================================================
// UNIFIED PRISM-CAM BRIDGE PROTOCOL
// ============================================================================

/**
 * Protocol choice: JSON-RPC 2.0 over WebSocket (primary) + REST fallback.
 *
 * Rationale:
 *   - JSON-RPC 2.0: Lightweight, bidirectional, supports batch calls
 *   - WebSocket: Real-time events (operation complete, tool change, etc.)
 *   - REST fallback: For firewalled environments or legacy integration
 *   - NOT gRPC: Adds complexity, requires proto compilation in each CAM plugin
 */

export type BridgeProtocol = "websocket" | "http" | "http2";
export type BridgeEncoding = "json" | "msgpack";

/** JSON-RPC 2.0 request envelope */
export interface PRISMRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 response envelope */
export interface PRISMRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: PRISMRpcError;
}

/** JSON-RPC 2.0 error object */
export interface PRISMRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/** Standard RPC error codes */
export const RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // PRISM-specific error codes (-32000 to -32099)
  SAFETY_VIOLATION: -32001,
  PARAMETER_OUT_OF_RANGE: -32002,
  MACHINE_LIMIT_EXCEEDED: -32003,
  OPERATION_CANCELLED: -32004,
  TOOLPATH_INVALID: -32005,
  MATERIAL_UNKNOWN: -32006,
  TOOL_NOT_FOUND: -32007,
  PHYSICS_CALCULATION_FAILED: -32008,
  CHATTER_RISK_HIGH: -32009,
  DEFLECTION_RISK_HIGH: -32010,
} as const;

/** Event notification (server to plugin, no response expected) */
export interface PRISMRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

// ============================================================================
// PLUGIN CONNECTION & AUTHENTICATION
// ============================================================================

export type PluginAuthMethod = "api_key" | "mtls" | "oauth2" | "none";

export interface PluginConnectionConfig {
  /** PRISM MCP server URL */
  server_url: string;
  /** WebSocket endpoint for real-time events */
  ws_endpoint: string;
  /** REST endpoint fallback */
  rest_endpoint: string;
  /** Authentication method */
  auth_method: PluginAuthMethod;
  /** API key (if auth_method = "api_key") */
  api_key?: string;
  /** mTLS certificate path (if auth_method = "mtls") */
  client_cert_path?: string;
  /** Connection timeout (ms) */
  connect_timeout_ms: number;
  /** Request timeout (ms) */
  request_timeout_ms: number;
  /** Auto-reconnect on disconnect */
  auto_reconnect: boolean;
  /** Reconnect backoff (ms) */
  reconnect_backoff_ms: number;
  /** Max reconnect attempts */
  max_reconnect_attempts: number;
  /** Enable request batching */
  enable_batching: boolean;
  /** Batch flush interval (ms) */
  batch_flush_ms: number;
}

export const DEFAULT_CONNECTION_CONFIG: PluginConnectionConfig = {
  server_url: "http://localhost:18361",
  ws_endpoint: "ws://localhost:18361/ws/plugin",
  rest_endpoint: "http://localhost:18361/api/v1/plugin",
  auth_method: "api_key",
  connect_timeout_ms: 5000,
  request_timeout_ms: 30000,
  auto_reconnect: true,
  reconnect_backoff_ms: 1000,
  max_reconnect_attempts: 10,
  enable_batching: true,
  batch_flush_ms: 50,
};

// ============================================================================
// CROSS-CAM PARAMETER MAPPING SCHEMA
// ============================================================================

/**
 * Normalized parameter schema that maps between CAM-specific parameter names.
 * Each CAM system uses different naming conventions; this schema unifies them.
 *
 * Example: "Spindle Speed"
 *   - hyperMILL: SpindleSpeed (COM property)
 *   - Fusion 360: spindleSpeed (adsk.cam.Operation.parameters)
 *   - Inventor HSM: RPM (iLogic parameter)
 *   - Mastercam: SpindleSpeed (C-Hook NCI)
 */

export interface CrossCAMParameterMap {
  /** PRISM canonical parameter name (snake_case) */
  prism_name: string;
  /** Human-readable display name */
  display_name: string;
  /** Unit of measurement */
  unit: string;
  /** Data type */
  type: "number" | "string" | "boolean" | "enum";
  /** Valid range for numeric parameters */
  range?: { min: number; max: number };
  /** Valid enum values */
  enum_values?: string[];
  /** CAM-specific parameter names */
  cam_mappings: {
    hypermill?: string;
    fusion360?: string;
    inventor_hsm?: string;
    mastercam?: string;
    solidcam?: string;
    nx?: string;
    catia?: string;
  };
  /** Category for UI grouping */
  category: "speeds_feeds" | "depths" | "toolpath" | "linking" | "safety" | "machine";
  /** Physics-relevant flag (triggers Kienzle/Taylor validation) */
  physics_critical: boolean;
  /** Safety-relevant flag (triggers S(x) scoring) */
  safety_critical: boolean;
}

/** Master parameter mapping table */
export const PRISM_PARAMETER_MAP: CrossCAMParameterMap[] = [
  // ── Speeds & Feeds ──
  {
    prism_name: "spindle_rpm",
    display_name: "Spindle Speed",
    unit: "RPM",
    type: "number",
    range: { min: 1, max: 100000 },
    cam_mappings: {
      hypermill: "SpindleSpeed",
      fusion360: "spindleSpeed",
      inventor_hsm: "RPM",
      mastercam: "SpindleSpeed",
    },
    category: "speeds_feeds",
    physics_critical: true,
    safety_critical: true,
  },
  {
    prism_name: "surface_speed_mmin",
    display_name: "Surface Speed",
    unit: "m/min",
    type: "number",
    range: { min: 1, max: 2000 },
    cam_mappings: {
      hypermill: "CuttingSpeed",
      fusion360: "surfaceSpeed",
      inventor_hsm: "SurfaceSpeed",
      mastercam: "SurfaceSpeed",
    },
    category: "speeds_feeds",
    physics_critical: true,
    safety_critical: false,
  },
  {
    prism_name: "feed_rate_mmmin",
    display_name: "Feedrate",
    unit: "mm/min",
    type: "number",
    range: { min: 1, max: 50000 },
    cam_mappings: {
      hypermill: "FeedRate",
      fusion360: "cuttingFeedrate",
      inventor_hsm: "FeedRate",
      mastercam: "FeedRate",
    },
    category: "speeds_feeds",
    physics_critical: true,
    safety_critical: true,
  },
  {
    prism_name: "feed_per_tooth_mm",
    display_name: "Feed per Tooth",
    unit: "mm/tooth",
    type: "number",
    range: { min: 0.001, max: 1.0 },
    cam_mappings: {
      hypermill: "FeedPerTooth",
      fusion360: "feedPerTooth",
      inventor_hsm: "FeedPerTooth",
      mastercam: "ChipLoad",
    },
    category: "speeds_feeds",
    physics_critical: true,
    safety_critical: false,
  },
  {
    prism_name: "plunge_feed_mmmin",
    display_name: "Plunge Feedrate",
    unit: "mm/min",
    type: "number",
    range: { min: 1, max: 10000 },
    cam_mappings: {
      hypermill: "PlungeRate",
      fusion360: "plungeFeedrate",
      inventor_hsm: "PlungeFeed",
      mastercam: "PlungeRate",
    },
    category: "speeds_feeds",
    physics_critical: true,
    safety_critical: true,
  },

  // ── Depths ──
  {
    prism_name: "axial_depth_mm",
    display_name: "Axial Depth of Cut",
    unit: "mm",
    type: "number",
    range: { min: 0.01, max: 100 },
    cam_mappings: {
      hypermill: "AxialDepth",
      fusion360: "maximumStepdown",
      inventor_hsm: "StepDown",
      mastercam: "AxialDepth",
    },
    category: "depths",
    physics_critical: true,
    safety_critical: true,
  },
  {
    prism_name: "radial_depth_mm",
    display_name: "Radial Depth of Cut",
    unit: "mm",
    type: "number",
    range: { min: 0.01, max: 100 },
    cam_mappings: {
      hypermill: "RadialDepth",
      fusion360: "maximumStepover",
      inventor_hsm: "StepOver",
      mastercam: "RadialDepth",
    },
    category: "depths",
    physics_critical: true,
    safety_critical: true,
  },
  {
    prism_name: "stock_to_leave_mm",
    display_name: "Stock to Leave",
    unit: "mm",
    type: "number",
    range: { min: 0, max: 10 },
    cam_mappings: {
      hypermill: "StockAllowance",
      fusion360: "stockToLeave",
      inventor_hsm: "StockToLeave",
      mastercam: "StockToLeave",
    },
    category: "depths",
    physics_critical: false,
    safety_critical: false,
  },

  // ── Toolpath ──
  {
    prism_name: "optimal_load_pct",
    display_name: "Optimal Load",
    unit: "%",
    type: "number",
    range: { min: 1, max: 100 },
    cam_mappings: {
      hypermill: "MAXXEngagement",
      fusion360: "optimalLoad",
      inventor_hsm: "OptimalLoad",
      mastercam: "DynamicEngagement",
    },
    category: "toolpath",
    physics_critical: true,
    safety_critical: false,
  },
  {
    prism_name: "cutting_mode",
    display_name: "Cutting Mode",
    unit: "",
    type: "enum",
    enum_values: ["climb", "conventional", "both"],
    cam_mappings: {
      hypermill: "CuttingDirection",
      fusion360: "machineDirection",
      inventor_hsm: "CuttingDirection",
      mastercam: "CutDirection",
    },
    category: "toolpath",
    physics_critical: false,
    safety_critical: false,
  },

  // ── Linking ──
  {
    prism_name: "retract_height_mm",
    display_name: "Retract Height",
    unit: "mm",
    type: "number",
    range: { min: 0.1, max: 500 },
    cam_mappings: {
      hypermill: "RetractPlane",
      fusion360: "retractHeight",
      inventor_hsm: "RetractHeight",
      mastercam: "RetractZ",
    },
    category: "linking",
    physics_critical: false,
    safety_critical: true,
  },
  {
    prism_name: "rapid_feed_mmmin",
    display_name: "Rapid Feedrate",
    unit: "mm/min",
    type: "number",
    range: { min: 1000, max: 100000 },
    cam_mappings: {
      hypermill: "RapidRate",
      fusion360: "rapidFeedrate",
      inventor_hsm: "RapidRate",
      mastercam: "RapidFeed",
    },
    category: "linking",
    physics_critical: false,
    safety_critical: true,
  },

  // ── Machine ──
  {
    prism_name: "coolant_mode",
    display_name: "Coolant",
    unit: "",
    type: "enum",
    enum_values: ["off", "flood", "mist", "through_spindle", "air"],
    cam_mappings: {
      hypermill: "Coolant",
      fusion360: "coolantMode",
      inventor_hsm: "Coolant",
      mastercam: "Coolant",
    },
    category: "machine",
    physics_critical: false,
    safety_critical: false,
  },
];

// ============================================================================
// PLUGIN LIFECYCLE & EVENTS
// ============================================================================

export type PluginLifecycleState =
  | "uninitialized"
  | "initializing"
  | "connected"
  | "ready"
  | "processing"
  | "error"
  | "disconnected"
  | "shutting_down";

export type CAMEventType =
  // Operation events
  | "operation_created"
  | "operation_modified"
  | "operation_deleted"
  | "operation_calculated"
  | "operation_posted"
  // Tool events
  | "tool_changed"
  | "tool_loaded"
  | "tool_unloaded"
  // Toolpath events
  | "toolpath_generating"
  | "toolpath_generated"
  | "toolpath_error"
  // Setup events
  | "setup_created"
  | "setup_modified"
  | "setup_activated"
  // Simulation events
  | "simulation_started"
  | "simulation_completed"
  | "simulation_collision"
  // Post events
  | "post_started"
  | "post_completed"
  | "post_error"
  // General
  | "document_opened"
  | "document_closed"
  | "document_saved";

export interface CAMEvent {
  type: CAMEventType;
  timestamp: string;
  source: "hypermill" | "fusion360" | "inventor_hsm" | "mastercam";
  data: Record<string, unknown>;
}

export interface CAMEventSubscription {
  event_types: CAMEventType[];
  callback_method: string;
  filter?: Record<string, unknown>;
}

// ============================================================================
// PRISM PLUGIN RPC METHODS
// ============================================================================

/**
 * Available RPC methods that plugins can call on PRISM server.
 */
export const PRISM_RPC_METHODS = {
  // ── Physics Optimization ──
  /** Get optimized speed/feed for operation */
  OPTIMIZE_SPEED_FEED: "prism.optimize_speed_feed",
  /** Calculate cutting forces (Kienzle) */
  CALCULATE_FORCE: "prism.calculate_force",
  /** Calculate tool life (Taylor) */
  CALCULATE_TOOL_LIFE: "prism.calculate_tool_life",
  /** Check chatter stability */
  CHECK_STABILITY: "prism.check_stability",
  /** Calculate deflection */
  CALCULATE_DEFLECTION: "prism.calculate_deflection",
  /** Full physics analysis */
  ANALYZE_PHYSICS: "prism.analyze_physics",

  // ── Safety ──
  /** Check safety score S(x) */
  CHECK_SAFETY: "prism.check_safety",
  /** Validate parameters against machine limits */
  VALIDATE_MACHINE_LIMITS: "prism.validate_machine_limits",
  /** Validate G-code safety */
  VALIDATE_GCODE: "prism.validate_gcode",

  // ── Knowledge ──
  /** Get tribal tip */
  GET_TRIBAL_TIP: "prism.get_tribal_tip",
  /** Get material properties */
  GET_MATERIAL: "prism.get_material",
  /** Get tool recommendations */
  GET_TOOL_RECOMMENDATIONS: "prism.get_tool_recommendations",
  /** Get strategy recommendation */
  GET_STRATEGY: "prism.get_strategy",

  // ── Toolpath ──
  /** Analyze toolpath quality */
  ANALYZE_TOOLPATH: "prism.analyze_toolpath",
  /** Suggest toolpath optimizations */
  OPTIMIZE_TOOLPATH: "prism.optimize_toolpath",

  // ── Post Processing ──
  /** Get post processor list */
  LIST_POSTS: "prism.list_posts",
  /** Validate post output */
  VALIDATE_POST: "prism.validate_post",
  /** Optimize G-code */
  OPTIMIZE_GCODE: "prism.optimize_gcode",

  // ── Session ──
  /** Register plugin with PRISM */
  REGISTER_PLUGIN: "prism.register_plugin",
  /** Heartbeat/keepalive */
  HEARTBEAT: "prism.heartbeat",
  /** Subscribe to events */
  SUBSCRIBE_EVENTS: "prism.subscribe_events",
  /** Unsubscribe from events */
  UNSUBSCRIBE_EVENTS: "prism.unsubscribe_events",
  /** Log message to PRISM */
  LOG: "prism.log",
  /** Get plugin configuration */
  GET_CONFIG: "prism.get_config",
} as const;

// ============================================================================
// SAFETY INTERLOCK INTEGRATION
// ============================================================================

export interface SafetyInterlockConfig {
  /** Enable safety interlocks */
  enabled: boolean;
  /** Minimum S(x) score to allow operation (0.0 - 1.0) */
  min_safety_score: number;
  /** Block on chatter risk above threshold */
  block_chatter_risk: "none" | "high" | "medium";
  /** Block on deflection risk above threshold */
  block_deflection_risk: "none" | "high" | "medium";
  /** Block if spindle power exceeds machine limit */
  block_power_exceeded: boolean;
  /** Block if feed rate is dangerously high */
  block_excessive_feed: boolean;
  /** Block rapid into material */
  block_rapid_into_material: boolean;
  /** Warn on short tool life (minutes) */
  warn_tool_life_below_min: number;
  /** Human approval required for safety score below threshold */
  require_approval_below_score: number;
}

export const DEFAULT_SAFETY_INTERLOCK_CONFIG: SafetyInterlockConfig = {
  enabled: true,
  min_safety_score: 0.70,
  block_chatter_risk: "high",
  block_deflection_risk: "high",
  block_power_exceeded: true,
  block_excessive_feed: true,
  block_rapid_into_material: true,
  warn_tool_life_below_min: 15,
  require_approval_below_score: 0.75,
};

export interface SafetyCheckResult {
  allowed: boolean;
  safety_score: number;
  blocks: SafetyBlock[];
  warnings: SafetyWarning[];
  requires_approval: boolean;
  approval_reason?: string;
}

export interface SafetyBlock {
  rule: string;
  severity: "critical" | "high";
  message: string;
  parameter?: string;
  value?: number;
  limit?: number;
}

export interface SafetyWarning {
  rule: string;
  severity: "medium" | "low";
  message: string;
  suggestion?: string;
}

// ============================================================================
// HYPERMILL PLUGIN ARCHITECTURE (.NET)
// ============================================================================

/**
 * hyperMILL Plugin Architecture
 *
 * Integration method: .NET assembly (C#) via COM Interop
 * hyperMILL exposes automation via COM objects (Open Mind Automation API)
 *
 * Key integration points:
 *   1. OMAutomation.Application — Main hyperMILL application object
 *   2. OMAutomation.Project — Active project/CAM document
 *   3. OMAutomation.Operation — Individual machining operations
 *   4. OMAutomation.Tool — Tool definitions
 *   5. OMAutomation.Machine — Machine configuration
 *
 * Entry point: DLL loaded by hyperMILL via Add-In Manager
 * UI integration: Ribbon tab with buttons, context menus
 */

export interface HyperMillPluginConfig {
  /** Plugin DLL assembly name */
  assembly_name: string;
  /** Plugin GUID for COM registration */
  plugin_guid: string;
  /** Minimum hyperMILL version required */
  min_hypermill_version: string;
  /** Ribbon tab configuration */
  ribbon_tab: {
    name: string;
    groups: Array<{
      name: string;
      buttons: Array<{
        id: string;
        label: string;
        tooltip: string;
        icon_resource: string;
        callback: string;
      }>;
    }>;
  };
  /** Context menu entries */
  context_menus: Array<{
    context: "operation" | "tool" | "setup" | "machine";
    items: Array<{
      id: string;
      label: string;
      callback: string;
    }>;
  }>;
  /** Event subscriptions */
  event_subscriptions: CAMEventType[];
}

export interface HyperMillOperationData {
  /** Operation name */
  name: string;
  /** Operation type (e.g., "MAXX_Roughing", "3D_Profile_Finishing") */
  type: string;
  /** hyperMILL cycle ID */
  cycle_id: string;
  /** Tool number */
  tool_number: number;
  /** Cutting parameters */
  parameters: {
    spindle_rpm: number;
    surface_speed_mmin: number;
    feed_rate_mmmin: number;
    feed_per_tooth_mm: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
    stock_to_leave_mm: number;
    plunge_feed_mmmin: number;
    coolant: string;
  };
  /** Toolpath metrics */
  toolpath: {
    length_mm: number;
    cutting_time_min: number;
    rapid_time_min: number;
    total_time_min: number;
  };
  /** Is calculated/valid */
  is_calculated: boolean;
  /** Has errors */
  has_errors: boolean;
  /** Error messages */
  errors: string[];
}

// ============================================================================
// FUSION 360 PLUGIN ARCHITECTURE (PYTHON)
// ============================================================================

/**
 * Fusion 360 Plugin Architecture
 *
 * Integration method: Python Add-In via adsk.core / adsk.cam modules
 * Fusion 360 uses a Python-based add-in system with event handlers
 *
 * Key integration points:
 *   1. adsk.core.Application — Main Fusion application
 *   2. adsk.cam.CAM — CAM workspace
 *   3. adsk.cam.Operation — Individual operations
 *   4. adsk.cam.Tool — Tool definitions
 *   5. adsk.cam.Setup — Setup definitions
 *
 * Entry point: Python script with FusionAddIn manifest
 * UI integration: Toolbar panel in CAM workspace
 *
 * Cloud API considerations:
 *   - Fusion 360 may be cloud-connected; local server needed for offline
 *   - Tool library sync via Fusion Team requires cloud access
 *   - HTTP client available (urllib.request) for server communication
 */

export interface Fusion360PluginConfig {
  /** Add-in ID (GUID) */
  addin_id: string;
  /** Add-in display name */
  display_name: string;
  /** Minimum Fusion 360 version */
  min_fusion_version: string;
  /** Author information */
  author: string;
  /** Toolbar panel configuration */
  toolbar_panel: {
    workspace_id: string; // "CAMEnvironment"
    panel_id: string;
    panel_name: string;
    buttons: Array<{
      id: string;
      name: string;
      tooltip: string;
      icon_folder: string;
      callback: string;
    }>;
  };
  /** Command definitions */
  commands: Array<{
    id: string;
    name: string;
    description: string;
    icon_folder: string;
    inputs: Array<{
      id: string;
      name: string;
      type: "float" | "int" | "string" | "bool" | "dropdown";
      default_value?: unknown;
      options?: string[];
    }>;
    callback: string;
  }>;
  /** Event handlers */
  event_handlers: {
    on_document_opened?: string;
    on_document_closed?: string;
    on_operation_created?: string;
    on_operation_modified?: string;
    on_toolpath_generated?: string;
    on_post_process?: string;
  };
  /** Offline mode support */
  offline_mode: {
    enabled: boolean;
    cache_physics_results: boolean;
    cache_tribal_tips: boolean;
  };
}

export interface Fusion360OperationData {
  /** Operation ID */
  id: string;
  /** Operation name */
  name: string;
  /** Strategy type */
  strategy: string;
  /** Parent setup ID */
  setup_id: string;
  /** Tool data */
  tool: {
    number: number;
    diameter_mm: number;
    flute_count: number;
    length_mm: number;
    type: string;
    description: string;
  };
  /** Parameters (adsk.cam.Operation.parameters) */
  parameters: {
    spindleSpeed: number;
    surfaceSpeed: number;
    cuttingFeedrate: number;
    feedPerTooth: number;
    plungeFeedrate: number;
    maximumStepdown: number;
    maximumStepover: number;
    optimalLoad: number;
    stockToLeave: number;
    coolantMode: string;
  };
  /** Operation comment (where PRISM embeds physics JSON) */
  comment: string;
  /** Is valid */
  isValid: boolean;
  /** Has warnings */
  hasWarnings: boolean;
}

// ============================================================================
// INVENTOR HSM PLUGIN ARCHITECTURE (COM/.NET)
// ============================================================================

/**
 * Inventor HSM Plugin Architecture
 *
 * Integration method: COM Add-In (.NET) with iLogic rule integration
 * Inventor HSM (now Inventor CAM) uses Autodesk Inventor add-in framework
 *
 * Key integration points:
 *   1. Inventor.Application — Main Inventor application
 *   2. HSMDocument — HSM/CAM document
 *   3. HSMOperation — Operations
 *   4. iLogic rules — Automation scripting
 *
 * Entry point: .NET DLL registered as Inventor Add-In
 * UI integration: Ribbon tab + iLogic rule triggers
 */

export interface InventorHSMPluginConfig {
  /** Add-in CLSID */
  clsid: string;
  /** Add-in name */
  name: string;
  /** Minimum Inventor version */
  min_inventor_version: string;
  /** Ribbon integration */
  ribbon: {
    tab_id: string;
    tab_name: string;
    panels: Array<{
      id: string;
      name: string;
      buttons: Array<{
        id: string;
        display_name: string;
        description: string;
        tooltip: string;
        icon_16: string;
        icon_32: string;
        callback: string;
      }>;
    }>;
  };
  /** iLogic rule templates */
  ilogic_rules: Array<{
    name: string;
    description: string;
    trigger: "manual" | "on_operation_create" | "on_post" | "on_save";
    vb_code: string;
  }>;
  /** Automation server events */
  event_sinks: Array<{
    event_class: string;
    event_name: string;
    handler: string;
  }>;
}

export interface InventorHSMOperationData {
  /** Internal ID */
  internal_id: string;
  /** Display name */
  name: string;
  /** Operation type */
  type: string;
  /** Tool reference */
  tool: {
    number: number;
    type: string;
    diameter_mm: number;
    flutes: number;
  };
  /** HSM parameters */
  parameters: {
    RPM: number;
    SurfaceSpeed: number;
    FeedRate: number;
    FeedPerTooth: number;
    StepDown: number;
    StepOver: number;
    OptimalLoad: number;
    StockToLeave: number;
    Coolant: string;
  };
  /** Toolpath state */
  toolpath_state: "not_generated" | "generating" | "generated" | "error";
  /** Estimated cycle time (seconds) */
  cycle_time_sec: number;
}

// ============================================================================
// MASTERCAM PLUGIN ARCHITECTURE (C-Hook/.NET)
// ============================================================================

/**
 * Mastercam Plugin Architecture
 *
 * Integration methods:
 *   1. C-Hook: Native C/C++ DLL with Mastercam SDK
 *   2. NET-Hook: .NET assembly (preferred for PRISM integration)
 *
 * Key integration points:
 *   1. Mastercam.Support — Core SDK functionality
 *   2. Mastercam.IO — NCI/G-code manipulation
 *   3. Mastercam.Operations — Operation management
 *   4. Mastercam.Database — Entity database
 *
 * NCI (Neutral Code Intermediate) is Mastercam's internal format
 * that sits between CAM operations and post-processed G-code.
 *
 * Entry point: .NET DLL in Add-Ins folder (FT_TYPES=256)
 * UI integration: Ribbon tab + right-click context menu
 */

export interface MastercamPluginConfig {
  /** Plugin GUID */
  guid: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Minimum Mastercam version */
  min_mastercam_version: string;
  /** Hook type */
  hook_type: "net_hook" | "c_hook";
  /** NET-Hook configuration */
  net_hook?: {
    assembly_name: string;
    entry_class: string;
    entry_method: string;
  };
  /** C-Hook configuration */
  c_hook?: {
    dll_name: string;
    export_functions: string[];
  };
  /** Ribbon integration */
  ribbon: {
    tab_name: string;
    panels: Array<{
      name: string;
      buttons: Array<{
        id: string;
        label: string;
        tooltip: string;
        icon: string;
        function_type: number; // FT_TYPES enumeration
        callback: string;
      }>;
    }>;
  };
  /** NCI manipulation hooks */
  nci_hooks: {
    pre_post: boolean;
    post_post: boolean;
    on_toolpath_regenerate: boolean;
  };
  /** Post processor integration */
  post_integration: {
    pre_post_hook: boolean;
    post_post_hook: boolean;
    custom_pst_path?: string;
  };
}

export interface MastercamOperationData {
  /** Operation ID */
  op_id: number;
  /** Operation name */
  name: string;
  /** Operation type (Dynamic, Pocket, Contour, etc.) */
  type: string;
  /** Tool data */
  tool: {
    number: number;
    diameter_mm: number;
    flutes: number;
    type: string;
    holder_id?: number;
  };
  /** Cutting parameters */
  parameters: {
    SpindleSpeed: number;
    SurfaceSpeed: number;
    FeedRate: number;
    ChipLoad: number;
    AxialDepth: number;
    RadialDepth: number;
    DynamicEngagement?: number;
    StockToLeave: number;
    Coolant: string;
  };
  /** NCI data reference */
  nci_record_number: number;
  /** Toolpath metrics */
  toolpath: {
    length_mm: number;
    cycle_time_sec: number;
    air_time_sec: number;
    cut_time_sec: number;
  };
  /** Dirty flag */
  needs_regeneration: boolean;
}

// ============================================================================
// PLUGIN DEPLOYMENT & UPDATE MECHANISM
// ============================================================================

export interface PluginDeploymentConfig {
  /** Plugin identifier */
  plugin_id: string;
  /** Target CAM system */
  target_cam: "hypermill" | "fusion360" | "inventor_hsm" | "mastercam";
  /** Current version */
  current_version: string;
  /** Installation paths (per CAM) */
  install_paths: {
    hypermill?: string;
    fusion360?: string;
    inventor_hsm?: string;
    mastercam?: string;
  };
  /** Auto-update enabled */
  auto_update: boolean;
  /** Update check URL */
  update_server_url: string;
  /** Update check interval (hours) */
  update_check_interval_hours: number;
  /** Staging directory for updates */
  staging_directory: string;
  /** Rollback versions to keep */
  rollback_versions_to_keep: number;
}

export interface PluginUpdateManifest {
  /** Plugin ID */
  plugin_id: string;
  /** Available version */
  available_version: string;
  /** Minimum PRISM server version required */
  min_prism_version: string;
  /** Minimum CAM version required (per CAM) */
  min_cam_versions: {
    hypermill?: string;
    fusion360?: string;
    inventor_hsm?: string;
    mastercam?: string;
  };
  /** Release date */
  release_date: string;
  /** Release notes */
  release_notes: string;
  /** Download URLs */
  download_urls: {
    hypermill?: string;
    fusion360?: string;
    inventor_hsm?: string;
    mastercam?: string;
  };
  /** SHA-256 checksums */
  checksums: {
    hypermill?: string;
    fusion360?: string;
    inventor_hsm?: string;
    mastercam?: string;
  };
  /** Is critical security update */
  is_critical: boolean;
  /** Breaking changes (require manual intervention) */
  breaking_changes: string[];
}

export interface PluginInstallResult {
  success: boolean;
  plugin_id: string;
  installed_version: string;
  install_path: string;
  errors: string[];
  warnings: string[];
  requires_restart: boolean;
  backup_path?: string;
}

// ============================================================================
// UNIFIED PLUGIN SDK INTERFACE
// ============================================================================

/**
 * Base interface all CAM plugins must implement.
 * Provides unified API regardless of underlying CAM system.
 */
export interface IPRISMCAMPlugin {
  // ── Lifecycle ──
  /** Initialize plugin and connect to PRISM server */
  initialize(config: PluginConnectionConfig): Promise<boolean>;
  /** Shutdown plugin and disconnect */
  shutdown(): Promise<void>;
  /** Get current lifecycle state */
  getState(): PluginLifecycleState;
  /** Get plugin info */
  getInfo(): PluginInfo;

  // ── Connection ──
  /** Check if connected to PRISM server */
  isConnected(): boolean;
  /** Reconnect to PRISM server */
  reconnect(): Promise<boolean>;
  /** Send heartbeat */
  heartbeat(): Promise<boolean>;

  // ── Events ──
  /** Subscribe to CAM events */
  subscribeEvents(events: CAMEventType[]): void;
  /** Unsubscribe from CAM events */
  unsubscribeEvents(events: CAMEventType[]): void;

  // ── Operations ──
  /** Get current operation data */
  getCurrentOperation(): Promise<NormalizedOperationData | null>;
  /** Get all operations in document */
  getAllOperations(): Promise<NormalizedOperationData[]>;
  /** Apply optimized parameters to operation */
  applyParameters(operationId: string, params: Partial<NormalizedParameters>): Promise<boolean>;
  /** Regenerate toolpath for operation */
  regenerateToolpath(operationId: string): Promise<boolean>;

  // ── Safety ──
  /** Check safety before applying parameters */
  checkSafety(params: NormalizedParameters): Promise<SafetyCheckResult>;
  /** Enable/disable safety interlocks */
  setSafetyInterlocks(config: SafetyInterlockConfig): void;

  // ── UI ──
  /** Show notification in CAM UI */
  showNotification(message: string, type: "info" | "warning" | "error"): void;
  /** Show dialog */
  showDialog(title: string, content: string, buttons: string[]): Promise<string>;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  cam_system: "hypermill" | "fusion360" | "inventor_hsm" | "mastercam";
  cam_version: string;
  prism_protocol_version: string;
  capabilities: string[];
}

export interface NormalizedOperationData {
  /** Unique operation ID */
  id: string;
  /** Operation name */
  name: string;
  /** Operation type (normalized) */
  type: "roughing" | "semi_finishing" | "finishing" | "drilling" | "threading" | "other";
  /** Strategy name (CAM-specific) */
  strategy: string;
  /** Tool data */
  tool: {
    number: number;
    diameter_mm: number;
    flute_count: number;
    type: string;
    material: string;
  };
  /** Normalized parameters */
  parameters: NormalizedParameters;
  /** Toolpath state */
  toolpath_state: "none" | "generating" | "valid" | "invalid" | "stale";
  /** Estimated cycle time (minutes) */
  cycle_time_min: number | null;
  /** Source CAM system */
  source_cam: "hypermill" | "fusion360" | "inventor_hsm" | "mastercam";
  /** Raw CAM-specific data */
  raw_data: Record<string, unknown>;
}

export interface NormalizedParameters {
  spindle_rpm: number;
  surface_speed_mmin: number;
  feed_rate_mmmin: number;
  feed_per_tooth_mm: number;
  plunge_feed_mmmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  stock_to_leave_mm: number;
  optimal_load_pct?: number;
  cutting_mode: "climb" | "conventional" | "both";
  coolant_mode: "off" | "flood" | "mist" | "through_spindle" | "air";
}

// ============================================================================
// PHYSICS OPTIMIZATION REQUEST/RESPONSE
// ============================================================================

export interface PhysicsOptimizationRequest {
  /** Material specification */
  material: {
    id?: string;
    name?: string;
    iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
    hardness_hrc?: number;
  };
  /** Tool specification */
  tool: {
    diameter_mm: number;
    flute_count: number;
    helix_angle_deg?: number;
    rake_angle_deg?: number;
    material?: "hss" | "carbide" | "ceramic" | "cbn" | "pcd";
    coating?: string;
    overhang_mm?: number;
  };
  /** Operation type */
  operation: "roughing" | "semi_finishing" | "finishing" | "drilling" | "threading";
  /** Current parameters (for optimization reference) */
  current_params?: Partial<NormalizedParameters>;
  /** Machine context */
  machine?: {
    max_rpm: number;
    max_power_kw: number;
    max_feed_mmmin: number;
  };
  /** Optimization priority */
  priority: "cycle_time" | "tool_life" | "surface_finish" | "balanced";
  /** Include physics analysis in response */
  include_physics: boolean;
  /** Include tribal tips in response */
  include_tribal: boolean;
}

export interface PhysicsOptimizationResponse {
  /** Optimized parameters */
  optimized_params: NormalizedParameters;
  /** Physics analysis */
  physics?: {
    cutting_force_N: number;
    spindle_power_kW: number;
    tool_life_min: number;
    chip_temperature_C: number;
    deflection_risk: "low" | "medium" | "high";
    chatter_risk: "low" | "medium" | "high";
    stable_rpm_range?: { min: number; max: number };
  };
  /** Confidence score (0-1) */
  confidence: number;
  /** Tribal tips */
  tribal_tips?: Array<{
    tip: string;
    source: string;
    relevance: number;
  }>;
  /** Warnings */
  warnings: string[];
  /** Processing time (ms) */
  processing_time_ms: number;
}

// ============================================================================
// ERROR HANDLING & FALLBACK
// ============================================================================

export interface PluginErrorHandler {
  /** Handle connection errors */
  onConnectionError(error: Error): void;
  /** Handle RPC errors */
  onRpcError(error: PRISMRpcError, method: string): void;
  /** Handle safety violations */
  onSafetyViolation(result: SafetyCheckResult): void;
  /** Handle timeout */
  onTimeout(method: string, timeout_ms: number): void;
  /** Enable offline fallback mode */
  enableOfflineFallback(): void;
  /** Disable offline fallback mode */
  disableOfflineFallback(): void;
}

export interface OfflineFallbackConfig {
  /** Enable offline mode when server unreachable */
  enabled: boolean;
  /** Use cached physics results */
  use_cached_physics: boolean;
  /** Use cached tribal tips */
  use_cached_tips: boolean;
  /** Cache directory */
  cache_directory: string;
  /** Cache TTL (hours) */
  cache_ttl_hours: number;
  /** Fallback to CAM defaults when no cache */
  fallback_to_cam_defaults: boolean;
  /** Show offline indicator in UI */
  show_offline_indicator: boolean;
}

// ============================================================================
// TELEMETRY & LOGGING
// ============================================================================

export interface PluginTelemetryConfig {
  /** Enable telemetry */
  enabled: boolean;
  /** Telemetry endpoint */
  endpoint: string;
  /** Include operation counts */
  include_operation_counts: boolean;
  /** Include timing data */
  include_timing: boolean;
  /** Include error traces */
  include_errors: boolean;
  /** Anonymize machine/shop data */
  anonymize: boolean;
  /** Flush interval (seconds) */
  flush_interval_sec: number;
}

export interface PluginLogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  source: string;
  message: string;
  data?: Record<string, unknown>;
  cam_system: string;
  operation_id?: string;
}

// ============================================================================
// TYPE RE-EXPORTS (for module consumers)
// ============================================================================

// All types are already exported inline above.
// This section documents the key types for consumers:
//
// Protocol: BridgeProtocol, BridgeEncoding, PRISMRpcRequest, PRISMRpcResponse
// Lifecycle: PluginLifecycleState, CAMEventType, CAMEvent
// Safety: SafetyInterlockConfig, SafetyCheckResult, SafetyBlock, SafetyWarning
// Plugin configs: HyperMillPluginConfig, Fusion360PluginConfig,
//                 InventorHSMPluginConfig, MastercamPluginConfig
// Operation data: NormalizedOperationData, NormalizedParameters
// Physics: PhysicsOptimizationRequest, PhysicsOptimizationResponse
