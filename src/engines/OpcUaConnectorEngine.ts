/**
 * OpcUaConnectorEngine — Live CNC Machine Connectivity via OPC-UA
 *
 * Wraps the node-opcua npm package to provide:
 * - Connection management with auto-reconnect and heartbeat
 * - Variable read (single + batch) for spindle, feed, axes, etc.
 * - Subscriptions with monitored items for real-time data
 * - Address space browsing
 * - Controller-family-specific OPC-UA node ID profiles (Fanuc, Siemens, Heidenhain, Haas, Mazak, Okuma)
 * - Structured machine status reads
 * - Alarm monitoring subscriptions
 *
 * Actions: opcua_connect, opcua_disconnect, opcua_read, opcua_read_batch,
 *   opcua_subscribe, opcua_unsubscribe, opcua_browse, opcua_controller_profile,
 *   opcua_machine_status, opcua_monitor_alarms
 */

// ============================================================================
// TYPES
// ============================================================================

export type SecurityMode = "None" | "Sign" | "SignAndEncrypt";

export interface OpcUaConnectParams {
  endpoint: string;
  securityMode?: SecurityMode;
  credentials?: { username: string; password: string };
  controllerFamily?: string;
  applicationName?: string;
  reconnectIntervalMs?: number;
  heartbeatIntervalMs?: number;
}

export interface OpcUaConnectResult {
  sessionId: string;
  endpoint: string;
  connected: boolean;
  serverInfo: {
    applicationName: string;
    productUri: string;
    serverState: string;
  };
  controllerFamily?: string;
}

export interface OpcUaDisconnectParams {
  sessionId: string;
}

export interface OpcUaReadParams {
  sessionId: string;
  nodeId: string;
}

export interface OpcUaReadResult {
  nodeId: string;
  value: any;
  dataType: string;
  statusCode: string;
  sourceTimestamp: string;
  serverTimestamp: string;
}

export interface OpcUaReadMultipleParams {
  sessionId: string;
  nodeIds: string[];
}

export interface OpcUaSubscribeParams {
  sessionId: string;
  nodeIds: string[];
  interval?: number;  // ms, default 500
  queueSize?: number;
}

export interface OpcUaSubscribeResult {
  subscriptionId: string;
  sessionId: string;
  nodeIds: string[];
  interval: number;
  active: boolean;
}

export interface OpcUaUnsubscribeParams {
  sessionId: string;
  subscriptionId: string;
}

export interface OpcUaBrowseParams {
  sessionId: string;
  parentNodeId?: string;
}

export interface BrowseNodeResult {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: string;
  isForward: boolean;
  referenceType: string;
}

export interface ControllerProfileParams {
  controllerFamily: string;
}

export interface OpcUaNodeMapping {
  nodeId: string;
  description: string;
  dataType: string;
  unit?: string;
}

export interface ControllerProfile {
  controllerFamily: string;
  vendor: string;
  protocol: string;
  description: string;
  variables: Record<string, OpcUaNodeMapping>;
}

export interface MachineStatusParams {
  sessionId: string;
  controllerFamily?: string;
}

export interface MachineStatus {
  sessionId: string;
  controllerFamily: string;
  timestamp: string;
  spindle: {
    speed_rpm: number | null;
    load_percent: number | null;
    override_percent: number | null;
  };
  feed: {
    rate_mmpm: number | null;
    override_percent: number | null;
  };
  axes: {
    X: number | null;
    Y: number | null;
    Z: number | null;
    A: number | null;
    B: number | null;
    C: number | null;
  };
  program: {
    number: string | null;
    name: string | null;
    cycle_time_s: number | null;
  };
  tool: {
    number: number | null;
  };
  status: {
    mode: string | null;          // auto / mdi / jog / ref
    alarm_active: boolean | null;
    alarm_code: string | null;
    coolant_on: boolean | null;
    door_open: boolean | null;
  };
  readErrors: string[];
}

export interface MonitorAlarmsParams {
  sessionId: string;
  interval?: number;
}

// ============================================================================
// INTERNAL SESSION STATE
// ============================================================================

interface SessionEntry {
  id: string;
  endpoint: string;
  controllerFamily: string;
  client: any;              // OPCUAClient instance
  session: any;             // ClientSession instance
  subscriptions: Map<string, SubscriptionEntry>;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  reconnectTimer: ReturnType<typeof setInterval> | null;
  reconnectIntervalMs: number;
  heartbeatIntervalMs: number;
  connected: boolean;
  credentials?: { username: string; password: string };
  lastHeartbeat: number;
  connectParams: OpcUaConnectParams;
}

interface SubscriptionEntry {
  id: string;
  subscription: any;        // ClientSubscription
  monitoredItems: any[];    // MonitoredItemBase[]
  nodeIds: string[];
  interval: number;
  dataBuffer: Array<{ nodeId: string; value: any; timestamp: string }>;
}

// ============================================================================
// CONTROLLER PROFILES — OPC-UA node ID mappings per controller family
// ============================================================================

const CONTROLLER_PROFILES: Record<string, ControllerProfile> = {
  fanuc: {
    controllerFamily: "fanuc",
    vendor: "FANUC",
    protocol: "FOCAS OPC-UA Gateway",
    description: "Fanuc CNC controllers via FOCAS-based OPC-UA server (MT-LINKi or kepware). Namespace ns=2 with string identifiers.",
    variables: {
      spindle_speed:     { nodeId: "ns=2;s=GnrlSpindle/actSpeed",       description: "Actual spindle speed",            dataType: "Double", unit: "rpm" },
      spindle_load:      { nodeId: "ns=2;s=GnrlSpindle/actLoad",        description: "Spindle motor load",              dataType: "Double", unit: "%" },
      spindle_override:  { nodeId: "ns=2;s=GnrlSpindle/actOverride",    description: "Spindle speed override",          dataType: "Double", unit: "%" },
      feed_rate:         { nodeId: "ns=2;s=Axes/actFeedrate",           description: "Actual feed rate",                dataType: "Double", unit: "mm/min" },
      feed_override:     { nodeId: "ns=2;s=Axes/actFeedOverride",       description: "Feed rate override",              dataType: "Double", unit: "%" },
      axis_x:            { nodeId: "ns=2;s=Axes/X/actPosition",         description: "X axis actual position",          dataType: "Double", unit: "mm" },
      axis_y:            { nodeId: "ns=2;s=Axes/Y/actPosition",         description: "Y axis actual position",          dataType: "Double", unit: "mm" },
      axis_z:            { nodeId: "ns=2;s=Axes/Z/actPosition",         description: "Z axis actual position",          dataType: "Double", unit: "mm" },
      axis_a:            { nodeId: "ns=2;s=Axes/A/actPosition",         description: "A axis actual position",          dataType: "Double", unit: "deg" },
      axis_b:            { nodeId: "ns=2;s=Axes/B/actPosition",         description: "B axis actual position",          dataType: "Double", unit: "deg" },
      axis_c:            { nodeId: "ns=2;s=Axes/C/actPosition",         description: "C axis actual position",          dataType: "Double", unit: "deg" },
      tool_number:       { nodeId: "ns=2;s=ToolMgmt/actToolNumber",     description: "Active tool number",              dataType: "Int32" },
      program_number:    { nodeId: "ns=2;s=Program/actProgramNumber",   description: "Active program number",           dataType: "String" },
      program_name:      { nodeId: "ns=2;s=Program/actProgramName",     description: "Active program name",             dataType: "String" },
      cycle_time:        { nodeId: "ns=2;s=Program/actCycleTime",       description: "Current cycle time",              dataType: "Double", unit: "s" },
      alarm_active:      { nodeId: "ns=2;s=Alarms/alarmActive",         description: "Alarm active flag",               dataType: "Boolean" },
      alarm_code:        { nodeId: "ns=2;s=Alarms/actAlarmCode",        description: "Active alarm code",               dataType: "String" },
      coolant_on:        { nodeId: "ns=2;s=IO/coolantOn",               description: "Coolant active",                  dataType: "Boolean" },
      door_open:         { nodeId: "ns=2;s=IO/doorOpen",                description: "Machine door open",               dataType: "Boolean" },
      mode:              { nodeId: "ns=2;s=Controller/actMode",         description: "Controller mode (auto/mdi/jog)",  dataType: "String" },
    },
  },
  siemens: {
    controllerFamily: "siemens",
    vendor: "Siemens",
    protocol: "Sinumerik OPC-UA native (828D/840D sl/ONE)",
    description: "Siemens Sinumerik controllers with built-in OPC-UA server. Channel-based paths under /Channel/.",
    variables: {
      spindle_speed:     { nodeId: 'ns=2;s=/Channel/Spindle/actSpeed[u1,1]',          description: "Actual spindle speed",            dataType: "Double", unit: "rpm" },
      spindle_load:      { nodeId: 'ns=2;s=/Channel/Spindle/driveLoad[u1,1]',         description: "Spindle drive load",              dataType: "Double", unit: "%" },
      spindle_override:  { nodeId: 'ns=2;s=/Channel/Spindle/speedOvr[u1,1]',          description: "Spindle override",                dataType: "Double", unit: "%" },
      feed_rate:         { nodeId: 'ns=2;s=/Channel/MachineAxis/actFeedRate[u1,1]',    description: "Actual feed rate",                dataType: "Double", unit: "mm/min" },
      feed_override:     { nodeId: 'ns=2;s=/Channel/State/feedRateOvr[u1,1]',         description: "Feed override",                   dataType: "Double", unit: "%" },
      axis_x:            { nodeId: 'ns=2;s=/Channel/MachineAxis/actToolBasePos[u1,1]', description: "X axis machine position",         dataType: "Double", unit: "mm" },
      axis_y:            { nodeId: 'ns=2;s=/Channel/MachineAxis/actToolBasePos[u1,2]', description: "Y axis machine position",         dataType: "Double", unit: "mm" },
      axis_z:            { nodeId: 'ns=2;s=/Channel/MachineAxis/actToolBasePos[u1,3]', description: "Z axis machine position",         dataType: "Double", unit: "mm" },
      axis_a:            { nodeId: 'ns=2;s=/Channel/MachineAxis/actToolBasePos[u1,4]', description: "A axis machine position",         dataType: "Double", unit: "deg" },
      axis_b:            { nodeId: 'ns=2;s=/Channel/MachineAxis/actToolBasePos[u1,5]', description: "B axis machine position",         dataType: "Double", unit: "deg" },
      axis_c:            { nodeId: 'ns=2;s=/Channel/MachineAxis/actToolBasePos[u1,6]', description: "C axis machine position",         dataType: "Double", unit: "deg" },
      tool_number:       { nodeId: 'ns=2;s=/Channel/State/actTNumber[u1,1]',           description: "Active T-number",                 dataType: "Int32" },
      program_number:    { nodeId: 'ns=2;s=/Channel/ProgramInfo/selectedWorkPNo[u1,1]',description: "Selected program number",         dataType: "String" },
      program_name:      { nodeId: 'ns=2;s=/Channel/ProgramInfo/progName[u1,1]',       description: "Program name",                    dataType: "String" },
      cycle_time:        { nodeId: 'ns=2;s=/Channel/State/acCycleTime[u1,1]',          description: "Accumulated cycle time",          dataType: "Double", unit: "s" },
      alarm_active:      { nodeId: 'ns=2;s=/Nck/State/opMsgActive',                    description: "Alarm active",                    dataType: "Boolean" },
      alarm_code:        { nodeId: 'ns=2;s=/Nck/AlarmEvent/alarmNo',                   description: "Active alarm number",             dataType: "String" },
      coolant_on:        { nodeId: 'ns=2;s=/Plc/DB_COOL/coolantActive',                description: "Coolant pump active",             dataType: "Boolean" },
      door_open:         { nodeId: 'ns=2;s=/Plc/DB_SAFETY/doorSwitch',                 description: "Safety door switch state",        dataType: "Boolean" },
      mode:              { nodeId: 'ns=2;s=/Channel/State/actMode[u1,1]',              description: "Channel operating mode",          dataType: "String" },
    },
  },
  heidenhain: {
    controllerFamily: "heidenhain",
    vendor: "Heidenhain",
    protocol: "DNC/RemoTools SDK OPC-UA adapter",
    description: "Heidenhain TNC controllers via DNC interface exposed through OPC-UA adapter (RemoTools/HIT). Table-index addressing.",
    variables: {
      spindle_speed:     { nodeId: "ns=4;s=DNC.Spindle.ActSpeed",             description: "Actual spindle speed",           dataType: "Double", unit: "rpm" },
      spindle_load:      { nodeId: "ns=4;s=DNC.Spindle.DriveLoad",            description: "Spindle drive load",             dataType: "Double", unit: "%" },
      spindle_override:  { nodeId: "ns=4;s=DNC.Spindle.Override",             description: "Spindle override",               dataType: "Double", unit: "%" },
      feed_rate:         { nodeId: "ns=4;s=DNC.CfgAxes.ActFeedRate",          description: "Actual path feed rate",          dataType: "Double", unit: "mm/min" },
      feed_override:     { nodeId: "ns=4;s=DNC.CfgAxes.FeedOverride",        description: "Feed override",                  dataType: "Double", unit: "%" },
      axis_x:            { nodeId: "ns=4;s=DNC.CfgAxes[0].ActPos",           description: "X axis position (axis index 0)", dataType: "Double", unit: "mm" },
      axis_y:            { nodeId: "ns=4;s=DNC.CfgAxes[1].ActPos",           description: "Y axis position (axis index 1)", dataType: "Double", unit: "mm" },
      axis_z:            { nodeId: "ns=4;s=DNC.CfgAxes[2].ActPos",           description: "Z axis position (axis index 2)", dataType: "Double", unit: "mm" },
      axis_a:            { nodeId: "ns=4;s=DNC.CfgAxes[3].ActPos",           description: "A axis position (axis index 3)", dataType: "Double", unit: "deg" },
      axis_b:            { nodeId: "ns=4;s=DNC.CfgAxes[4].ActPos",           description: "B axis position (axis index 4)", dataType: "Double", unit: "deg" },
      axis_c:            { nodeId: "ns=4;s=DNC.CfgAxes[5].ActPos",           description: "C axis position (axis index 5)", dataType: "Double", unit: "deg" },
      tool_number:       { nodeId: "ns=4;s=DNC.ToolMgmt.ActToolNo",          description: "Active tool number",             dataType: "Int32" },
      program_number:    { nodeId: "ns=4;s=DNC.Program.SelectedPgm",         description: "Selected program",               dataType: "String" },
      program_name:      { nodeId: "ns=4;s=DNC.Program.PgmName",             description: "Current program name",           dataType: "String" },
      cycle_time:        { nodeId: "ns=4;s=DNC.Program.CycleTime",           description: "Current cycle time",             dataType: "Double", unit: "s" },
      alarm_active:      { nodeId: "ns=4;s=DNC.Error.Active",                description: "Error/alarm active flag",        dataType: "Boolean" },
      alarm_code:        { nodeId: "ns=4;s=DNC.Error.Number",                description: "Active error number",            dataType: "String" },
      coolant_on:        { nodeId: "ns=4;s=DNC.IO.CoolantActive",            description: "Coolant active state",           dataType: "Boolean" },
      door_open:         { nodeId: "ns=4;s=DNC.IO.DoorSwitch",               description: "Door switch state",              dataType: "Boolean" },
      mode:              { nodeId: "ns=4;s=DNC.State.OperatingMode",         description: "Operating mode",                 dataType: "String" },
    },
  },
  haas: {
    controllerFamily: "haas",
    vendor: "Haas Automation",
    protocol: "Haas MDC / Q-codes via OPC-UA bridge",
    description: "Haas NGC controllers via MDC (Machine Data Collection) Q-codes exposed through an OPC-UA bridge (e.g., MachineMetrics, CARON MDC). Uses macro variable addressing.",
    variables: {
      spindle_speed:     { nodeId: "ns=2;s=Q100",              description: "Actual spindle speed (Q100)",      dataType: "Double", unit: "rpm" },
      spindle_load:      { nodeId: "ns=2;s=Q200",              description: "Spindle load (Q200)",              dataType: "Double", unit: "%" },
      spindle_override:  { nodeId: "ns=2;s=Q601",              description: "Spindle speed override (Q601)",    dataType: "Double", unit: "%" },
      feed_rate:         { nodeId: "ns=2;s=Q300",              description: "Actual feed rate (Q300)",          dataType: "Double", unit: "mm/min" },
      feed_override:     { nodeId: "ns=2;s=Q600",              description: "Feed rate override (Q600)",        dataType: "Double", unit: "%" },
      axis_x:            { nodeId: "ns=2;s=Q301",              description: "X axis machine position (Q301)",   dataType: "Double", unit: "mm" },
      axis_y:            { nodeId: "ns=2;s=Q302",              description: "Y axis machine position (Q302)",   dataType: "Double", unit: "mm" },
      axis_z:            { nodeId: "ns=2;s=Q303",              description: "Z axis machine position (Q303)",   dataType: "Double", unit: "mm" },
      axis_a:            { nodeId: "ns=2;s=Q304",              description: "A axis position (Q304)",           dataType: "Double", unit: "deg" },
      axis_b:            { nodeId: "ns=2;s=Q305",              description: "B axis position (Q305)",           dataType: "Double", unit: "deg" },
      axis_c:            { nodeId: "ns=2;s=Q306",              description: "C axis position (Q306)",           dataType: "Double", unit: "deg" },
      tool_number:       { nodeId: "ns=2;s=Q500",              description: "Current tool number (Q500)",       dataType: "Int32" },
      program_number:    { nodeId: "ns=2;s=Q700",              description: "Running program O-number (Q700)",  dataType: "String" },
      program_name:      { nodeId: "ns=2;s=Q701",              description: "Program comment/name (Q701)",      dataType: "String" },
      cycle_time:        { nodeId: "ns=2;s=Q800",              description: "Last cycle time (Q800)",           dataType: "Double", unit: "s" },
      alarm_active:      { nodeId: "ns=2;s=Q900",              description: "Alarm active flag (Q900)",         dataType: "Boolean" },
      alarm_code:        { nodeId: "ns=2;s=Q901",              description: "Active alarm code (Q901)",         dataType: "String" },
      coolant_on:        { nodeId: "ns=2;s=Q400",              description: "Coolant status (Q400)",            dataType: "Boolean" },
      door_open:         { nodeId: "ns=2;s=Q401",              description: "Door switch (Q401)",               dataType: "Boolean" },
      mode:              { nodeId: "ns=2;s=Q104",              description: "Execution mode (Q104)",            dataType: "String" },
    },
  },
  mazak: {
    controllerFamily: "mazak",
    vendor: "Mazak",
    protocol: "Mazak SmartBox / MTConnect-OPC-UA bridge",
    description: "Mazak Smooth/SmoothAi controllers via SmartBox or MTConnect adapter. Device-path addressing under /CNC/.",
    variables: {
      spindle_speed:     { nodeId: "ns=2;s=/CNC/Spindle[1]/ActualSpeed",          description: "Actual spindle speed",          dataType: "Double", unit: "rpm" },
      spindle_load:      { nodeId: "ns=2;s=/CNC/Spindle[1]/Load",                 description: "Spindle load",                  dataType: "Double", unit: "%" },
      spindle_override:  { nodeId: "ns=2;s=/CNC/Spindle[1]/Override",             description: "Spindle override",              dataType: "Double", unit: "%" },
      feed_rate:         { nodeId: "ns=2;s=/CNC/Path[1]/Feedrate",                description: "Path feed rate",                dataType: "Double", unit: "mm/min" },
      feed_override:     { nodeId: "ns=2;s=/CNC/Path[1]/FeedrateOverride",        description: "Feed override",                 dataType: "Double", unit: "%" },
      axis_x:            { nodeId: "ns=2;s=/CNC/Axes/Linear[1]/ActualPosition",   description: "X axis position",               dataType: "Double", unit: "mm" },
      axis_y:            { nodeId: "ns=2;s=/CNC/Axes/Linear[2]/ActualPosition",   description: "Y axis position",               dataType: "Double", unit: "mm" },
      axis_z:            { nodeId: "ns=2;s=/CNC/Axes/Linear[3]/ActualPosition",   description: "Z axis position",               dataType: "Double", unit: "mm" },
      axis_a:            { nodeId: "ns=2;s=/CNC/Axes/Rotary[1]/ActualPosition",   description: "A axis position",               dataType: "Double", unit: "deg" },
      axis_b:            { nodeId: "ns=2;s=/CNC/Axes/Rotary[2]/ActualPosition",   description: "B axis position",               dataType: "Double", unit: "deg" },
      axis_c:            { nodeId: "ns=2;s=/CNC/Axes/Rotary[3]/ActualPosition",   description: "C axis position",               dataType: "Double", unit: "deg" },
      tool_number:       { nodeId: "ns=2;s=/CNC/ToolManagement/CurrentTool",      description: "Current tool number",            dataType: "Int32" },
      program_number:    { nodeId: "ns=2;s=/CNC/Program/Running/Number",          description: "Running program number",         dataType: "String" },
      program_name:      { nodeId: "ns=2;s=/CNC/Program/Running/Name",            description: "Running program name",           dataType: "String" },
      cycle_time:        { nodeId: "ns=2;s=/CNC/Program/Running/CycleTime",       description: "Current cycle time",             dataType: "Double", unit: "s" },
      alarm_active:      { nodeId: "ns=2;s=/CNC/Alarm/Active",                    description: "Alarm active flag",              dataType: "Boolean" },
      alarm_code:        { nodeId: "ns=2;s=/CNC/Alarm/Number",                    description: "Active alarm number",            dataType: "String" },
      coolant_on:        { nodeId: "ns=2;s=/CNC/Coolant/Active",                  description: "Coolant active",                 dataType: "Boolean" },
      door_open:         { nodeId: "ns=2;s=/CNC/Door/Open",                       description: "Door open state",                dataType: "Boolean" },
      mode:              { nodeId: "ns=2;s=/CNC/Controller/Mode",                 description: "Controller mode",                dataType: "String" },
    },
  },
  okuma: {
    controllerFamily: "okuma",
    vendor: "Okuma",
    protocol: "Okuma THINC API OPC-UA adapter",
    description: "Okuma OSP-P controllers via THINC API exposed through OPC-UA adapter. Uses THINC object model paths.",
    variables: {
      spindle_speed:     { nodeId: "ns=3;s=THINC.Spindle.ActualSpeed",            description: "Actual spindle speed",          dataType: "Double", unit: "rpm" },
      spindle_load:      { nodeId: "ns=3;s=THINC.Spindle.LoadMeter",              description: "Spindle load meter",            dataType: "Double", unit: "%" },
      spindle_override:  { nodeId: "ns=3;s=THINC.Spindle.Override",               description: "Spindle override",              dataType: "Double", unit: "%" },
      feed_rate:         { nodeId: "ns=3;s=THINC.Axis.FeedSpeed",                 description: "Actual feed speed",             dataType: "Double", unit: "mm/min" },
      feed_override:     { nodeId: "ns=3;s=THINC.Axis.FeedOverride",              description: "Feed override",                 dataType: "Double", unit: "%" },
      axis_x:            { nodeId: "ns=3;s=THINC.Axis.X.MachineCoord",            description: "X machine coordinate",          dataType: "Double", unit: "mm" },
      axis_y:            { nodeId: "ns=3;s=THINC.Axis.Y.MachineCoord",            description: "Y machine coordinate",          dataType: "Double", unit: "mm" },
      axis_z:            { nodeId: "ns=3;s=THINC.Axis.Z.MachineCoord",            description: "Z machine coordinate",          dataType: "Double", unit: "mm" },
      axis_a:            { nodeId: "ns=3;s=THINC.Axis.A.MachineCoord",            description: "A axis coordinate",             dataType: "Double", unit: "deg" },
      axis_b:            { nodeId: "ns=3;s=THINC.Axis.B.MachineCoord",            description: "B axis coordinate",             dataType: "Double", unit: "deg" },
      axis_c:            { nodeId: "ns=3;s=THINC.Axis.C.MachineCoord",            description: "C axis coordinate",             dataType: "Double", unit: "deg" },
      tool_number:       { nodeId: "ns=3;s=THINC.Tool.CurrentNumber",             description: "Current tool number",           dataType: "Int32" },
      program_number:    { nodeId: "ns=3;s=THINC.Program.RunningNumber",          description: "Running program number",        dataType: "String" },
      program_name:      { nodeId: "ns=3;s=THINC.Program.RunningName",            description: "Running program name",          dataType: "String" },
      cycle_time:        { nodeId: "ns=3;s=THINC.Program.CycleTime",              description: "Cycle time",                    dataType: "Double", unit: "s" },
      alarm_active:      { nodeId: "ns=3;s=THINC.Alarm.IsActive",                 description: "Alarm active",                  dataType: "Boolean" },
      alarm_code:        { nodeId: "ns=3;s=THINC.Alarm.ActiveCode",               description: "Active alarm code",             dataType: "String" },
      coolant_on:        { nodeId: "ns=3;s=THINC.IO.CoolantPump",                 description: "Coolant pump state",            dataType: "Boolean" },
      door_open:         { nodeId: "ns=3;s=THINC.IO.SafetyDoor",                  description: "Safety door state",             dataType: "Boolean" },
      mode:              { nodeId: "ns=3;s=THINC.Controller.OperationMode",       description: "Operation mode",                dataType: "String" },
    },
  },
};

// ============================================================================
// SESSION POOL
// ============================================================================

const sessions: Map<string, SessionEntry> = new Map();
let sessionCounter = 0;

function generateSessionId(): string {
  return `opcua_session_${++sessionCounter}_${Date.now().toString(36)}`;
}

function generateSubscriptionId(): string {
  return `opcua_sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSession(sessionId: string): SessionEntry {
  const entry = sessions.get(sessionId);
  if (!entry) throw new Error(`Session not found: ${sessionId}. Use opcua_connect first.`);
  if (!entry.connected) throw new Error(`Session ${sessionId} is disconnected. Reconnecting...`);
  return entry;
}

// ============================================================================
// SECURITY MODE MAPPING
// ============================================================================

function resolveSecurityMode(mode?: SecurityMode): number {
  // node-opcua MessageSecurityMode enum: 1=None, 2=Sign, 3=SignAndEncrypt
  switch (mode) {
    case "Sign": return 2;
    case "SignAndEncrypt": return 3;
    default: return 1; // None
  }
}

function resolveSecurityPolicy(mode?: SecurityMode): string {
  switch (mode) {
    case "Sign":
    case "SignAndEncrypt":
      return "http://opcfoundation.org/UA/SecurityPolicy#Basic256Sha256";
    default:
      return "http://opcfoundation.org/UA/SecurityPolicy#None";
  }
}

// ============================================================================
// ENGINE
// ============================================================================

export class OpcUaConnectorEngine {

  /**
   * Connect to an OPC-UA server and create a session.
   * Returns a sessionId used for all subsequent operations.
   */
  static async connect(params: OpcUaConnectParams): Promise<OpcUaConnectResult> {
    const {
      endpoint,
      securityMode,
      credentials,
      controllerFamily = "generic",
      applicationName = "PRISM-OpcUaConnector",
      reconnectIntervalMs = 5000,
      heartbeatIntervalMs = 10000,
    } = params;

    if (!endpoint || typeof endpoint !== "string") {
      throw new Error("endpoint is required and must be a valid OPC-UA URL (e.g., opc.tcp://192.168.1.100:4840)");
    }

    // Dynamic import of node-opcua to keep engine loadable even if package is missing
    const opcua = await import("node-opcua");
    const { OPCUAClient, MessageSecurityMode, SecurityPolicy, UserTokenType } = opcua;

    // If credentials are provided but security mode is "None", upgrade to SignAndEncrypt
    let effectiveSecurityMode = securityMode;
    if (credentials && (!securityMode || securityMode === "None")) {
      effectiveSecurityMode = "SignAndEncrypt";
    }

    const secMode = resolveSecurityMode(effectiveSecurityMode);
    const secPolicy = resolveSecurityPolicy(effectiveSecurityMode);

    const client = OPCUAClient.create({
      applicationName,
      endpointMustExist: false,
      securityMode: secMode as any,
      securityPolicy: secPolicy as any,
      connectionStrategy: {
        initialDelay: 1000,
        maxDelay: 10000,
        maxRetry: 3,
      },
      requestedSessionTimeout: 60000,
    });

    await client.connect(endpoint);

    // Create session — with or without credentials
    let session: any;
    if (credentials?.username && credentials?.password) {
      session = await client.createSession({
        type: UserTokenType.UserName,
        userName: credentials.username,
        password: credentials.password,
      });
    } else {
      session = await client.createSession();
    }

    const sessionId = generateSessionId();

    // Retrieve server info
    let serverInfo = { applicationName: "Unknown", productUri: "", serverState: "Running" };
    try {
      const serverStatusNode = "ns=0;i=2259"; // Server_ServerStatus_State
      const stateVal = await session.read({ nodeId: serverStatusNode, attributeId: 13 /* AttributeIds.Value */ });
      serverInfo.serverState = stateVal?.value?.value !== undefined ? String(stateVal.value.value) : "Running";

      const appNameNode = "ns=0;i=2261"; // Server_ServerStatus_BuildInfo_ManufacturerName
      const appVal = await session.read({ nodeId: appNameNode, attributeId: 13 });
      if (appVal?.value?.value) serverInfo.applicationName = String(appVal.value.value);
    } catch { /* best-effort server info */ }

    const entry: SessionEntry = {
      id: sessionId,
      endpoint,
      controllerFamily: controllerFamily.toLowerCase(),
      client,
      session,
      subscriptions: new Map(),
      heartbeatTimer: null,
      reconnectTimer: null,
      reconnectIntervalMs,
      heartbeatIntervalMs,
      connected: true,
      credentials,
      lastHeartbeat: Date.now(),
      connectParams: params,
    };

    // Start heartbeat
    entry.heartbeatTimer = setInterval(async () => {
      try {
        await session.read({ nodeId: "ns=0;i=2258", attributeId: 13 }); // Server_ServerStatus
        entry.lastHeartbeat = Date.now();
      } catch {
        entry.connected = false;
        OpcUaConnectorEngine._attemptReconnect(sessionId);
      }
    }, heartbeatIntervalMs);

    // Handle client close event
    client.on("close", () => {
      entry.connected = false;
      OpcUaConnectorEngine._attemptReconnect(sessionId);
    });

    sessions.set(sessionId, entry);

    return {
      sessionId,
      endpoint,
      connected: true,
      serverInfo,
      controllerFamily: controllerFamily.toLowerCase(),
    };
  }

  /**
   * Internal: attempt reconnection for a disconnected session.
   */
  static _attemptReconnect(sessionId: string): void {
    const entry = sessions.get(sessionId);
    if (!entry || entry.reconnectTimer) return;

    entry.reconnectTimer = setInterval(async () => {
      try {
        const opcua = await import("node-opcua");
        const { OPCUAClient, UserTokenType } = opcua;

        // Clean up old client
        try { await entry.session?.close?.(); } catch { /* ignore */ }
        try { await entry.client?.disconnect?.(); } catch { /* ignore */ }

        // If credentials present but security mode is "None", upgrade to SignAndEncrypt
        let reconnectSecMode = entry.connectParams.securityMode;
        if (entry.connectParams.credentials && (!reconnectSecMode || reconnectSecMode === "None")) {
          reconnectSecMode = "SignAndEncrypt";
        }
        const secMode = resolveSecurityMode(reconnectSecMode);
        const secPolicy = resolveSecurityPolicy(reconnectSecMode);

        const newClient = OPCUAClient.create({
          applicationName: entry.connectParams.applicationName || "PRISM-OpcUaConnector",
          endpointMustExist: false,
          securityMode: secMode as any,
          securityPolicy: secPolicy as any,
          connectionStrategy: { initialDelay: 1000, maxDelay: 10000, maxRetry: 1 },
        });

        await newClient.connect(entry.endpoint);

        let newSession: any;
        if (entry.credentials?.username) {
          newSession = await newClient.createSession({
            type: UserTokenType.UserName,
            userName: entry.credentials.username,
            password: entry.credentials.password,
          });
        } else {
          newSession = await newClient.createSession();
        }

        entry.client = newClient;
        entry.session = newSession;
        entry.connected = true;
        entry.lastHeartbeat = Date.now();
        entry.subscriptions.clear(); // subscriptions must be re-created after reconnect

        if (entry.reconnectTimer) {
          clearInterval(entry.reconnectTimer);
          entry.reconnectTimer = null;
        }
      } catch {
        // Will retry on next interval tick
      }
    }, entry.reconnectIntervalMs);
  }

  /**
   * Disconnect a session and clean up all resources.
   */
  static async disconnect(params: OpcUaDisconnectParams): Promise<{ sessionId: string; disconnected: boolean }> {
    const entry = sessions.get(params.sessionId);
    if (!entry) return { sessionId: params.sessionId, disconnected: false };

    // Clear timers
    if (entry.heartbeatTimer) clearInterval(entry.heartbeatTimer);
    if (entry.reconnectTimer) clearInterval(entry.reconnectTimer);

    // Terminate all subscriptions
    for (const sub of Array.from(entry.subscriptions.values())) {
      try { await sub.subscription.terminate(); } catch { /* ignore */ }
    }

    // Close session and disconnect client
    try { await entry.session.close(); } catch { /* ignore */ }
    try { await entry.client.disconnect(); } catch { /* ignore */ }

    entry.connected = false;
    sessions.delete(params.sessionId);

    return { sessionId: params.sessionId, disconnected: true };
  }

  /**
   * Read a single OPC-UA variable by nodeId.
   */
  static async readVariable(params: OpcUaReadParams): Promise<OpcUaReadResult> {
    const entry = getSession(params.sessionId);
    const { AttributeIds } = await import("node-opcua");

    const dataValue = await entry.session.read({
      nodeId: params.nodeId,
      attributeId: AttributeIds.Value,
    });

    return {
      nodeId: params.nodeId,
      value: dataValue.value?.value ?? null,
      dataType: dataValue.value?.dataType !== undefined ? String(dataValue.value.dataType) : "Unknown",
      statusCode: dataValue.statusCode?.name ?? String(dataValue.statusCode),
      sourceTimestamp: dataValue.sourceTimestamp ? dataValue.sourceTimestamp.toISOString() : new Date().toISOString(),
      serverTimestamp: dataValue.serverTimestamp ? dataValue.serverTimestamp.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Read multiple OPC-UA variables in a single batch call.
   */
  static async readMultiple(params: OpcUaReadMultipleParams): Promise<{ results: OpcUaReadResult[]; errors: string[] }> {
    const entry = getSession(params.sessionId);
    const { AttributeIds } = await import("node-opcua");

    if (!params.nodeIds?.length) return { results: [], errors: ["nodeIds array is empty"] };

    const readItems = params.nodeIds.map(nodeId => ({
      nodeId,
      attributeId: AttributeIds.Value,
    }));

    const dataValues = await entry.session.read(readItems);
    const results: OpcUaReadResult[] = [];
    const errors: string[] = [];

    const dvArray = Array.isArray(dataValues) ? dataValues : [dataValues];
    for (let i = 0; i < params.nodeIds.length; i++) {
      const dv = dvArray[i];
      if (!dv) {
        errors.push(`No response for nodeId: ${params.nodeIds[i]}`);
        continue;
      }
      const statusName = dv.statusCode?.name ?? String(dv.statusCode ?? "Unknown");
      if (statusName !== "Good" && statusName !== "GoodNoData") {
        errors.push(`${params.nodeIds[i]}: ${statusName}`);
      }
      results.push({
        nodeId: params.nodeIds[i],
        value: dv.value?.value ?? null,
        dataType: dv.value?.dataType !== undefined ? String(dv.value.dataType) : "Unknown",
        statusCode: statusName,
        sourceTimestamp: dv.sourceTimestamp ? dv.sourceTimestamp.toISOString() : new Date().toISOString(),
        serverTimestamp: dv.serverTimestamp ? dv.serverTimestamp.toISOString() : new Date().toISOString(),
      });
    }

    return { results, errors };
  }

  /**
   * Create a monitored-items subscription for real-time data changes.
   */
  static async subscribe(params: OpcUaSubscribeParams): Promise<OpcUaSubscribeResult> {
    const entry = getSession(params.sessionId);
    const { AttributeIds, TimestampsToReturn } = await import("node-opcua");
    const interval = params.interval ?? 500;
    const queueSize = params.queueSize ?? 10;

    const subscription = await entry.session.createSubscription2({
      requestedPublishingInterval: interval,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10,
    });

    const subscriptionId = generateSubscriptionId();
    const subEntry: SubscriptionEntry = {
      id: subscriptionId,
      subscription,
      monitoredItems: [],
      nodeIds: params.nodeIds,
      interval,
      dataBuffer: [],
    };

    // Create monitored items for each nodeId
    for (const nodeId of params.nodeIds) {
      const monitoredItem = await subscription.monitor(
        { nodeId, attributeId: AttributeIds.Value },
        {
          samplingInterval: interval,
          discardOldest: true,
          queueSize,
        },
        TimestampsToReturn.Both,
      );

      monitoredItem.on("changed", (dataValue: any) => {
        subEntry.dataBuffer.push({
          nodeId,
          value: dataValue.value?.value ?? null,
          timestamp: dataValue.sourceTimestamp ? dataValue.sourceTimestamp.toISOString() : new Date().toISOString(),
        });
        // Keep buffer bounded
        if (subEntry.dataBuffer.length > 1000) {
          subEntry.dataBuffer = subEntry.dataBuffer.slice(-500);
        }
      });

      subEntry.monitoredItems.push(monitoredItem);
    }

    entry.subscriptions.set(subscriptionId, subEntry);

    return {
      subscriptionId,
      sessionId: params.sessionId,
      nodeIds: params.nodeIds,
      interval,
      active: true,
    };
  }

  /**
   * Terminate a subscription and remove all its monitored items.
   */
  static async unsubscribe(params: OpcUaUnsubscribeParams): Promise<{ subscriptionId: string; terminated: boolean }> {
    const entry = getSession(params.sessionId);
    const subEntry = entry.subscriptions.get(params.subscriptionId);
    if (!subEntry) {
      return { subscriptionId: params.subscriptionId, terminated: false };
    }

    try { await subEntry.subscription.terminate(); } catch { /* best effort */ }
    entry.subscriptions.delete(params.subscriptionId);

    return { subscriptionId: params.subscriptionId, terminated: true };
  }

  /**
   * Browse the OPC-UA address space from a given parent node.
   * Defaults to RootFolder (ns=0;i=84) if no parentNodeId given.
   */
  static async browseNodes(params: OpcUaBrowseParams): Promise<{ parentNodeId: string; nodes: BrowseNodeResult[] }> {
    const entry = getSession(params.sessionId);
    const parentNodeId = params.parentNodeId ?? "ns=0;i=84"; // RootFolder

    const browseResult = await entry.session.browse(parentNodeId);
    const nodes: BrowseNodeResult[] = [];

    if (browseResult.references) {
      for (const ref of browseResult.references) {
        nodes.push({
          nodeId: ref.nodeId?.toString() ?? "",
          browseName: ref.browseName?.toString() ?? "",
          displayName: ref.displayName?.text ?? ref.browseName?.toString() ?? "",
          nodeClass: ref.nodeClass !== undefined ? String(ref.nodeClass) : "Unknown",
          isForward: ref.isForward ?? true,
          referenceType: ref.referenceTypeId?.toString() ?? "",
        });
      }
    }

    return { parentNodeId, nodes };
  }

  /**
   * Get known OPC-UA node ID mappings for a controller family.
   * Supports: fanuc, siemens, heidenhain, haas, mazak, okuma.
   */
  static getControllerProfile(params: ControllerProfileParams): ControllerProfile {
    const family = params.controllerFamily?.toLowerCase();
    if (!family) throw new Error("controllerFamily is required");

    const profile = CONTROLLER_PROFILES[family];
    if (!profile) {
      const available = Object.keys(CONTROLLER_PROFILES).join(", ");
      throw new Error(`Unknown controller family: '${family}'. Available: ${available}`);
    }
    return { ...profile };
  }

  /**
   * List all supported controller families.
   */
  static listControllerFamilies(): { families: Array<{ family: string; vendor: string; protocol: string }> } {
    return {
      families: Object.values(CONTROLLER_PROFILES).map(p => ({
        family: p.controllerFamily,
        vendor: p.vendor,
        protocol: p.protocol,
      })),
    };
  }

  /**
   * Read all common CNC machine variables in one call, returning a structured status.
   */
  static async getMachineStatus(params: MachineStatusParams): Promise<MachineStatus> {
    const entry = getSession(params.sessionId);
    const family = (params.controllerFamily ?? entry.controllerFamily).toLowerCase();
    const profile = CONTROLLER_PROFILES[family];

    if (!profile) {
      throw new Error(`Cannot read machine status: unknown controller family '${family}'. Use opcua_controller_profile to check available families.`);
    }

    const vars = profile.variables;
    const nodeIds = Object.values(vars).map(v => v.nodeId);
    const varKeys = Object.keys(vars);

    // Batch read all variables
    const { results, errors } = await OpcUaConnectorEngine.readMultiple({
      sessionId: params.sessionId,
      nodeIds,
    });

    // Build a lookup from nodeId to value
    const lookup: Record<string, any> = {};
    for (const r of results) {
      lookup[r.nodeId] = r.statusCode === "Good" ? r.value : null;
    }

    function val(key: string): any {
      const mapping = vars[key];
      return mapping ? (lookup[mapping.nodeId] ?? null) : null;
    }

    const readErrors = errors.length > 0 ? errors : [];

    return {
      sessionId: params.sessionId,
      controllerFamily: family,
      timestamp: new Date().toISOString(),
      spindle: {
        speed_rpm: val("spindle_speed"),
        load_percent: val("spindle_load"),
        override_percent: val("spindle_override"),
      },
      feed: {
        rate_mmpm: val("feed_rate"),
        override_percent: val("feed_override"),
      },
      axes: {
        X: val("axis_x"),
        Y: val("axis_y"),
        Z: val("axis_z"),
        A: val("axis_a"),
        B: val("axis_b"),
        C: val("axis_c"),
      },
      program: {
        number: val("program_number"),
        name: val("program_name"),
        cycle_time_s: val("cycle_time"),
      },
      tool: {
        number: val("tool_number"),
      },
      status: {
        mode: val("mode"),
        alarm_active: val("alarm_active"),
        alarm_code: val("alarm_code"),
        coolant_on: val("coolant_on"),
        door_open: val("door_open"),
      },
      readErrors,
    };
  }

  /**
   * Subscribe to alarm-related variables for real-time alarm monitoring.
   */
  static async monitorAlarms(params: MonitorAlarmsParams): Promise<OpcUaSubscribeResult> {
    const entry = getSession(params.sessionId);
    const family = entry.controllerFamily;
    const profile = CONTROLLER_PROFILES[family];

    // If we have a profile, use alarm-specific nodes; otherwise use generic nodes
    const alarmNodeIds: string[] = [];
    if (profile) {
      if (profile.variables.alarm_active) alarmNodeIds.push(profile.variables.alarm_active.nodeId);
      if (profile.variables.alarm_code) alarmNodeIds.push(profile.variables.alarm_code.nodeId);
      if (profile.variables.mode) alarmNodeIds.push(profile.variables.mode.nodeId);
      if (profile.variables.door_open) alarmNodeIds.push(profile.variables.door_open.nodeId);
    }

    if (alarmNodeIds.length === 0) {
      throw new Error(`No alarm node IDs known for controller family '${family}'. Provide nodeIds via opcua_subscribe instead.`);
    }

    return OpcUaConnectorEngine.subscribe({
      sessionId: params.sessionId,
      nodeIds: alarmNodeIds,
      interval: params.interval ?? 250, // faster polling for alarms
    });
  }

  /**
   * Get the data buffer from a subscription (poll-style data retrieval).
   */
  static getSubscriptionData(params: { sessionId: string; subscriptionId: string; clear?: boolean }): {
    subscriptionId: string;
    data: Array<{ nodeId: string; value: any; timestamp: string }>;
    count: number;
  } {
    const entry = getSession(params.sessionId);
    const subEntry = entry.subscriptions.get(params.subscriptionId);
    if (!subEntry) throw new Error(`Subscription not found: ${params.subscriptionId}`);

    const data = [...subEntry.dataBuffer];
    if (params.clear !== false) {
      subEntry.dataBuffer = [];
    }

    return {
      subscriptionId: params.subscriptionId,
      data,
      count: data.length,
    };
  }

  /**
   * List all active sessions with connection status.
   */
  static listSessions(): {
    sessions: Array<{
      sessionId: string;
      endpoint: string;
      controllerFamily: string;
      connected: boolean;
      subscriptionCount: number;
      lastHeartbeat: string;
    }>;
  } {
    const result: Array<{
      sessionId: string;
      endpoint: string;
      controllerFamily: string;
      connected: boolean;
      subscriptionCount: number;
      lastHeartbeat: string;
    }> = [];
    for (const [id, entry] of Array.from(sessions.entries())) {
      result.push({
        sessionId: id,
        endpoint: entry.endpoint,
        controllerFamily: entry.controllerFamily,
        connected: entry.connected,
        subscriptionCount: entry.subscriptions.size,
        lastHeartbeat: new Date(entry.lastHeartbeat).toISOString(),
      });
    }
    return { sessions: result };
  }

  /**
   * Write a value to an OPC-UA variable (for setpoints, overrides, etc.).
   * Use with caution — this can control machine behavior.
   */
  static async writeVariable(params: {
    sessionId: string;
    nodeId: string;
    value: any;
    dataType: string;
  }): Promise<{ nodeId: string; written: boolean; statusCode: string }> {
    const entry = getSession(params.sessionId);
    const opcua = await import("node-opcua");
    const { DataType } = opcua;

    // Map string dataType to node-opcua DataType enum
    const dtMap: Record<string, any> = {
      Boolean: DataType.Boolean,
      Int16: DataType.Int16,
      Int32: DataType.Int32,
      UInt16: DataType.UInt16,
      UInt32: DataType.UInt32,
      Float: DataType.Float,
      Double: DataType.Double,
      String: DataType.String,
    };

    const dt = dtMap[params.dataType];
    if (!dt) throw new Error(`Unsupported dataType: ${params.dataType}. Use: ${Object.keys(dtMap).join(", ")}`);

    const statusCode = await entry.session.write({
      nodeId: params.nodeId,
      attributeId: 13, // AttributeIds.Value
      value: {
        value: { dataType: dt, value: params.value },
      },
    });

    const statusName = statusCode?.name ?? String(statusCode);
    return {
      nodeId: params.nodeId,
      written: statusName === "Good",
      statusCode: statusName,
    };
  }

  /**
   * Cleanup all sessions (for graceful shutdown).
   */
  static async disconnectAll(): Promise<{ disconnected: number }> {
    let count = 0;
    for (const [sessionId] of Array.from(sessions.entries())) {
      await OpcUaConnectorEngine.disconnect({ sessionId });
      count++;
    }
    return { disconnected: count };
  }
}

// Singleton-style export for dispatcher pattern
export const opcUaConnectorEngine = OpcUaConnectorEngine;
