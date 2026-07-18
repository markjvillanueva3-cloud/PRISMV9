/**
 * OpcUaConnectorEngine — Unit Tests
 *
 * Mocks node-opcua to test all engine capabilities:
 * connect, disconnect, readVariable, readMultiple, subscribe, unsubscribe,
 * browseNodes, getControllerProfile, getMachineStatus, monitorAlarms,
 * writeVariable, listSessions, getSubscriptionData, disconnectAll
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ============================================================================
// MOCK node-opcua
// ============================================================================

const mockSessionRead = vi.fn();
const mockSessionWrite = vi.fn();
const mockSessionClose = vi.fn();
const mockSessionBrowse = vi.fn();
const mockSessionCreateSubscription2 = vi.fn();
const mockSubscriptionMonitor = vi.fn();
const mockSubscriptionTerminate = vi.fn();
const mockClientConnect = vi.fn();
const mockClientDisconnect = vi.fn();
const mockClientCreateSession = vi.fn();
const mockClientOn = vi.fn();

function resetMocks() {
  mockSessionRead.mockReset();
  mockSessionWrite.mockReset();
  mockSessionClose.mockReset();
  mockSessionBrowse.mockReset();
  mockSessionCreateSubscription2.mockReset();
  mockSubscriptionMonitor.mockReset();
  mockSubscriptionTerminate.mockReset();
  mockClientConnect.mockReset();
  mockClientDisconnect.mockReset();
  mockClientCreateSession.mockReset();
  mockClientOn.mockReset();

  // Default: successful connection
  mockClientConnect.mockResolvedValue(undefined);
  mockClientDisconnect.mockResolvedValue(undefined);
  mockSessionClose.mockResolvedValue(undefined);
  mockClientOn.mockImplementation(() => {});

  // Default session
  const mockSession = {
    read: mockSessionRead,
    write: mockSessionWrite,
    close: mockSessionClose,
    browse: mockSessionBrowse,
    createSubscription2: mockSessionCreateSubscription2,
  };
  mockClientCreateSession.mockResolvedValue(mockSession);

  // Default: server info reads return something
  mockSessionRead.mockImplementation((readItem: any) => {
    // Handle batch reads (array)
    if (Array.isArray(readItem)) {
      return readItem.map((item: any) => ({
        value: { value: 42, dataType: "Double" },
        statusCode: { name: "Good" },
        sourceTimestamp: new Date("2026-03-16T00:00:00Z"),
        serverTimestamp: new Date("2026-03-16T00:00:00Z"),
      }));
    }
    // Single read
    return {
      value: { value: 42, dataType: "Double" },
      statusCode: { name: "Good" },
      sourceTimestamp: new Date("2026-03-16T00:00:00Z"),
      serverTimestamp: new Date("2026-03-16T00:00:00Z"),
    };
  });

  // Default subscription
  mockSessionCreateSubscription2.mockResolvedValue({
    monitor: mockSubscriptionMonitor,
    terminate: mockSubscriptionTerminate,
  });

  // Default monitored item with event emitter
  const monitoredItemListeners: Record<string, Function[]> = {};
  mockSubscriptionMonitor.mockResolvedValue({
    on: (event: string, handler: Function) => {
      if (!monitoredItemListeners[event]) monitoredItemListeners[event] = [];
      monitoredItemListeners[event].push(handler);
    },
  });
  mockSubscriptionTerminate.mockResolvedValue(undefined);

  // Default browse
  mockSessionBrowse.mockResolvedValue({
    references: [
      {
        nodeId: { toString: () => "ns=0;i=85" },
        browseName: { toString: () => "Objects" },
        displayName: { text: "Objects" },
        nodeClass: 1,
        isForward: true,
        referenceTypeId: { toString: () => "ns=0;i=35" },
      },
      {
        nodeId: { toString: () => "ns=0;i=86" },
        browseName: { toString: () => "Types" },
        displayName: { text: "Types" },
        nodeClass: 1,
        isForward: true,
        referenceTypeId: { toString: () => "ns=0;i=35" },
      },
    ],
  });

  // Default write
  mockSessionWrite.mockResolvedValue({ name: "Good" });
}

vi.mock("node-opcua", () => ({
  OPCUAClient: {
    create: () => ({
      connect: mockClientConnect,
      disconnect: mockClientDisconnect,
      createSession: mockClientCreateSession,
      on: mockClientOn,
    }),
  },
  MessageSecurityMode: { None: 1, Sign: 2, SignAndEncrypt: 3 },
  SecurityPolicy: { None: "None", Basic256Sha256: "Basic256Sha256" },
  UserTokenType: { Anonymous: 0, UserName: 1 },
  AttributeIds: { Value: 13 },
  DataType: {
    Boolean: 1,
    Int16: 4,
    Int32: 6,
    UInt16: 5,
    UInt32: 7,
    Float: 10,
    Double: 11,
    String: 12,
  },
  TimestampsToReturn: { Both: 2 },
}));

// Import AFTER mocking
import {
  OpcUaConnectorEngine,
  type OpcUaConnectResult,
  type OpcUaReadResult,
  type ControllerProfile,
  type MachineStatus,
} from "../engines/OpcUaConnectorEngine.js";

// ============================================================================
// TESTS
// ============================================================================

describe("OpcUaConnectorEngine", () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(async () => {
    // Clean up all sessions between tests
    await OpcUaConnectorEngine.disconnectAll();
  });

  // --------------------------------------------------------------------------
  // connect
  // --------------------------------------------------------------------------
  describe("connect", () => {
    it("should connect to OPC-UA server and return sessionId", async () => {
      const result = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://192.168.1.100:4840",
        controllerFamily: "fanuc",
      });

      expect(result.sessionId).toMatch(/^opcua_session_/);
      expect(result.connected).toBe(true);
      expect(result.endpoint).toBe("opc.tcp://192.168.1.100:4840");
      expect(result.controllerFamily).toBe("fanuc");
      expect(mockClientConnect).toHaveBeenCalledWith("opc.tcp://192.168.1.100:4840");
      expect(mockClientCreateSession).toHaveBeenCalled();
    });

    it("should connect with username/password credentials", async () => {
      const result = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://10.0.0.1:4840",
        securityMode: "SignAndEncrypt",
        credentials: { username: "admin", password: "secret123" },
        controllerFamily: "siemens",
      });

      expect(result.connected).toBe(true);
      expect(result.controllerFamily).toBe("siemens");
      expect(mockClientCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ userName: "admin", password: "secret123" })
      );
    });

    it("should reject missing endpoint", async () => {
      await expect(OpcUaConnectorEngine.connect({ endpoint: "" })).rejects.toThrow("endpoint is required");
    });

    it("should default controllerFamily to generic", async () => {
      const result = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://localhost:4840",
      });
      expect(result.controllerFamily).toBe("generic");
    });
  });

  // --------------------------------------------------------------------------
  // disconnect
  // --------------------------------------------------------------------------
  describe("disconnect", () => {
    it("should disconnect an active session", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const result = await OpcUaConnectorEngine.disconnect({ sessionId: conn.sessionId });

      expect(result.disconnected).toBe(true);
      expect(result.sessionId).toBe(conn.sessionId);
      expect(mockSessionClose).toHaveBeenCalled();
      expect(mockClientDisconnect).toHaveBeenCalled();
    });

    it("should return false for unknown sessionId", async () => {
      const result = await OpcUaConnectorEngine.disconnect({ sessionId: "fake_session" });
      expect(result.disconnected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // readVariable
  // --------------------------------------------------------------------------
  describe("readVariable", () => {
    it("should read a single variable", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });

      // Mock AFTER connect so the server-info reads during connect don't consume it
      mockSessionRead.mockResolvedValueOnce({
        value: { value: 12000, dataType: "Double" },
        statusCode: { name: "Good" },
        sourceTimestamp: new Date("2026-03-16T10:00:00Z"),
        serverTimestamp: new Date("2026-03-16T10:00:00Z"),
      });

      const result = await OpcUaConnectorEngine.readVariable({
        sessionId: conn.sessionId,
        nodeId: "ns=2;s=GnrlSpindle/actSpeed",
      });

      expect(result.nodeId).toBe("ns=2;s=GnrlSpindle/actSpeed");
      expect(result.value).toBe(12000);
      expect(result.statusCode).toBe("Good");
    });

    it("should throw for invalid session", async () => {
      await expect(
        OpcUaConnectorEngine.readVariable({ sessionId: "invalid", nodeId: "ns=2;s=test" })
      ).rejects.toThrow("Session not found");
    });
  });

  // --------------------------------------------------------------------------
  // readMultiple
  // --------------------------------------------------------------------------
  describe("readMultiple", () => {
    it("should batch-read multiple nodeIds", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });

      mockSessionRead.mockResolvedValueOnce([
        { value: { value: 8500, dataType: "Double" }, statusCode: { name: "Good" }, sourceTimestamp: new Date(), serverTimestamp: new Date() },
        { value: { value: 1200, dataType: "Double" }, statusCode: { name: "Good" }, sourceTimestamp: new Date(), serverTimestamp: new Date() },
        { value: { value: 100.5, dataType: "Double" }, statusCode: { name: "Good" }, sourceTimestamp: new Date(), serverTimestamp: new Date() },
      ]);

      const result = await OpcUaConnectorEngine.readMultiple({
        sessionId: conn.sessionId,
        nodeIds: ["ns=2;s=SpindleSpeed", "ns=2;s=FeedRate", "ns=2;s=AxisX"],
      });

      expect(result.results).toHaveLength(3);
      expect(result.results[0].value).toBe(8500);
      expect(result.results[1].value).toBe(1200);
      expect(result.results[2].value).toBe(100.5);
      expect(result.errors).toHaveLength(0);
    });

    it("should report errors for bad status codes", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });

      mockSessionRead.mockResolvedValueOnce([
        { value: { value: 8500, dataType: "Double" }, statusCode: { name: "Good" }, sourceTimestamp: new Date(), serverTimestamp: new Date() },
        { value: { value: null, dataType: "Null" }, statusCode: { name: "BadNodeIdUnknown" }, sourceTimestamp: new Date(), serverTimestamp: new Date() },
      ]);

      const result = await OpcUaConnectorEngine.readMultiple({
        sessionId: conn.sessionId,
        nodeIds: ["ns=2;s=Valid", "ns=2;s=Invalid"],
      });

      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("BadNodeIdUnknown");
    });

    it("should handle empty nodeIds", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const result = await OpcUaConnectorEngine.readMultiple({
        sessionId: conn.sessionId,
        nodeIds: [],
      });
      expect(result.results).toHaveLength(0);
      expect(result.errors).toContain("nodeIds array is empty");
    });
  });

  // --------------------------------------------------------------------------
  // subscribe / unsubscribe
  // --------------------------------------------------------------------------
  describe("subscribe", () => {
    it("should create a subscription with monitored items", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });

      const result = await OpcUaConnectorEngine.subscribe({
        sessionId: conn.sessionId,
        nodeIds: ["ns=2;s=SpindleSpeed", "ns=2;s=FeedRate"],
        interval: 250,
      });

      expect(result.subscriptionId).toMatch(/^opcua_sub_/);
      expect(result.active).toBe(true);
      expect(result.nodeIds).toHaveLength(2);
      expect(result.interval).toBe(250);
      expect(mockSessionCreateSubscription2).toHaveBeenCalledWith(
        expect.objectContaining({ requestedPublishingInterval: 250 })
      );
      expect(mockSubscriptionMonitor).toHaveBeenCalledTimes(2);
    });

    it("should default interval to 500ms", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const result = await OpcUaConnectorEngine.subscribe({
        sessionId: conn.sessionId,
        nodeIds: ["ns=2;s=Test"],
      });
      expect(result.interval).toBe(500);
    });
  });

  describe("unsubscribe", () => {
    it("should terminate an active subscription", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const sub = await OpcUaConnectorEngine.subscribe({
        sessionId: conn.sessionId,
        nodeIds: ["ns=2;s=Test"],
      });

      const result = await OpcUaConnectorEngine.unsubscribe({
        sessionId: conn.sessionId,
        subscriptionId: sub.subscriptionId,
      });

      expect(result.terminated).toBe(true);
      expect(mockSubscriptionTerminate).toHaveBeenCalled();
    });

    it("should return false for unknown subscription", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const result = await OpcUaConnectorEngine.unsubscribe({
        sessionId: conn.sessionId,
        subscriptionId: "fake_sub",
      });
      expect(result.terminated).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // browseNodes
  // --------------------------------------------------------------------------
  describe("browseNodes", () => {
    it("should browse from RootFolder by default", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const result = await OpcUaConnectorEngine.browseNodes({ sessionId: conn.sessionId });

      expect(result.parentNodeId).toBe("ns=0;i=84");
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].displayName).toBe("Objects");
      expect(result.nodes[1].displayName).toBe("Types");
      expect(mockSessionBrowse).toHaveBeenCalledWith("ns=0;i=84");
    });

    it("should browse from a specified parent node", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      await OpcUaConnectorEngine.browseNodes({
        sessionId: conn.sessionId,
        parentNodeId: "ns=0;i=85",
      });

      expect(mockSessionBrowse).toHaveBeenCalledWith("ns=0;i=85");
    });

    it("should handle empty references", async () => {
      mockSessionBrowse.mockResolvedValueOnce({ references: [] });
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const result = await OpcUaConnectorEngine.browseNodes({ sessionId: conn.sessionId });
      expect(result.nodes).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // getControllerProfile
  // --------------------------------------------------------------------------
  describe("getControllerProfile", () => {
    const families = ["fanuc", "siemens", "heidenhain", "haas", "mazak", "okuma"];

    for (const family of families) {
      it(`should return profile for ${family}`, () => {
        const profile = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: family });

        expect(profile.controllerFamily).toBe(family);
        expect(profile.vendor).toBeTruthy();
        expect(profile.protocol).toBeTruthy();
        expect(profile.description).toBeTruthy();

        // Verify all 19 standard variables exist
        const expectedVars = [
          "spindle_speed", "spindle_load", "spindle_override",
          "feed_rate", "feed_override",
          "axis_x", "axis_y", "axis_z", "axis_a", "axis_b", "axis_c",
          "tool_number", "program_number", "program_name", "cycle_time",
          "alarm_active", "alarm_code", "coolant_on", "door_open", "mode",
        ];
        for (const v of expectedVars) {
          expect(profile.variables[v]).toBeDefined();
          expect(profile.variables[v].nodeId).toBeTruthy();
          expect(profile.variables[v].description).toBeTruthy();
          expect(profile.variables[v].dataType).toBeTruthy();
        }
      });
    }

    it("should throw for unknown family", () => {
      expect(() => OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "unknown" }))
        .toThrow("Unknown controller family");
    });

    it("should be case-insensitive", () => {
      const profile = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "FANUC" });
      expect(profile.controllerFamily).toBe("fanuc");
    });

    it("should throw for empty family", () => {
      expect(() => OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "" }))
        .toThrow("controllerFamily is required");
    });
  });

  // --------------------------------------------------------------------------
  // listControllerFamilies
  // --------------------------------------------------------------------------
  describe("listControllerFamilies", () => {
    it("should list all 6 supported families", () => {
      const result = OpcUaConnectorEngine.listControllerFamilies();
      expect(result.families).toHaveLength(6);
      const names = result.families.map(f => f.family);
      expect(names).toContain("fanuc");
      expect(names).toContain("siemens");
      expect(names).toContain("heidenhain");
      expect(names).toContain("haas");
      expect(names).toContain("mazak");
      expect(names).toContain("okuma");
    });
  });

  // --------------------------------------------------------------------------
  // getMachineStatus
  // --------------------------------------------------------------------------
  describe("getMachineStatus", () => {
    it("should read all CNC variables and return structured status", async () => {
      // Setup: connect with fanuc profile
      const conn = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://192.168.1.100:4840",
        controllerFamily: "fanuc",
      });

      // Mock batch read for all 19 variables — returns array
      const fanucProfile = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "fanuc" });
      const nodeCount = Object.keys(fanucProfile.variables).length;
      const mockValues = Array.from({ length: nodeCount }, (_, i) => ({
        value: { value: i === 15 ? true : i === 16 ? "AL-042" : i * 100 + 50, dataType: "Double" },
        statusCode: { name: "Good" },
        sourceTimestamp: new Date("2026-03-16T12:00:00Z"),
        serverTimestamp: new Date("2026-03-16T12:00:00Z"),
      }));
      mockSessionRead.mockResolvedValueOnce(mockValues);

      const status = await OpcUaConnectorEngine.getMachineStatus({
        sessionId: conn.sessionId,
      });

      expect(status.controllerFamily).toBe("fanuc");
      expect(status.sessionId).toBe(conn.sessionId);
      expect(status.spindle).toBeDefined();
      expect(status.feed).toBeDefined();
      expect(status.axes).toBeDefined();
      expect(status.program).toBeDefined();
      expect(status.tool).toBeDefined();
      expect(status.status).toBeDefined();
      expect(status.timestamp).toBeTruthy();
    });

    it("should use session controllerFamily when not overridden", async () => {
      const conn = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://localhost:4840",
        controllerFamily: "siemens",
      });

      const status = await OpcUaConnectorEngine.getMachineStatus({
        sessionId: conn.sessionId,
      });
      expect(status.controllerFamily).toBe("siemens");
    });

    it("should throw for unknown controller family", async () => {
      const conn = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://localhost:4840",
        controllerFamily: "generic",
      });
      await expect(
        OpcUaConnectorEngine.getMachineStatus({ sessionId: conn.sessionId })
      ).rejects.toThrow("unknown controller family");
    });
  });

  // --------------------------------------------------------------------------
  // monitorAlarms
  // --------------------------------------------------------------------------
  describe("monitorAlarms", () => {
    it("should subscribe to alarm-related nodes", async () => {
      const conn = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://localhost:4840",
        controllerFamily: "haas",
      });

      const result = await OpcUaConnectorEngine.monitorAlarms({
        sessionId: conn.sessionId,
      });

      expect(result.active).toBe(true);
      expect(result.nodeIds.length).toBeGreaterThanOrEqual(2); // at least alarm_active + alarm_code
      expect(result.interval).toBe(250); // faster polling for alarms
    });

    it("should throw for generic controller with no alarm nodes", async () => {
      const conn = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://localhost:4840",
        controllerFamily: "generic",
      });
      await expect(
        OpcUaConnectorEngine.monitorAlarms({ sessionId: conn.sessionId })
      ).rejects.toThrow("No alarm node IDs known");
    });
  });

  // --------------------------------------------------------------------------
  // writeVariable
  // --------------------------------------------------------------------------
  describe("writeVariable", () => {
    it("should write a value to a node", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const result = await OpcUaConnectorEngine.writeVariable({
        sessionId: conn.sessionId,
        nodeId: "ns=2;s=FeedOverride",
        value: 80,
        dataType: "Double",
      });

      expect(result.written).toBe(true);
      expect(result.statusCode).toBe("Good");
      expect(mockSessionWrite).toHaveBeenCalled();
    });

    it("should reject unsupported dataType", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      await expect(
        OpcUaConnectorEngine.writeVariable({
          sessionId: conn.sessionId,
          nodeId: "ns=2;s=Test",
          value: "x",
          dataType: "ByteString",
        })
      ).rejects.toThrow("Unsupported dataType");
    });
  });

  // --------------------------------------------------------------------------
  // listSessions
  // --------------------------------------------------------------------------
  describe("listSessions", () => {
    it("should list active sessions", async () => {
      const conn1 = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://machine1:4840",
        controllerFamily: "fanuc",
      });
      const conn2 = await OpcUaConnectorEngine.connect({
        endpoint: "opc.tcp://machine2:4840",
        controllerFamily: "siemens",
      });

      const list = OpcUaConnectorEngine.listSessions();
      expect(list.sessions.length).toBeGreaterThanOrEqual(2);

      const ids = list.sessions.map(s => s.sessionId);
      expect(ids).toContain(conn1.sessionId);
      expect(ids).toContain(conn2.sessionId);
    });
  });

  // --------------------------------------------------------------------------
  // getSubscriptionData
  // --------------------------------------------------------------------------
  describe("getSubscriptionData", () => {
    it("should return empty buffer for new subscription", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      const sub = await OpcUaConnectorEngine.subscribe({
        sessionId: conn.sessionId,
        nodeIds: ["ns=2;s=Test"],
      });

      const data = OpcUaConnectorEngine.getSubscriptionData({
        sessionId: conn.sessionId,
        subscriptionId: sub.subscriptionId,
      });

      expect(data.data).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it("should throw for unknown subscription", async () => {
      const conn = await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://localhost:4840" });
      expect(() =>
        OpcUaConnectorEngine.getSubscriptionData({
          sessionId: conn.sessionId,
          subscriptionId: "fake",
        })
      ).toThrow("Subscription not found");
    });
  });

  // --------------------------------------------------------------------------
  // disconnectAll
  // --------------------------------------------------------------------------
  describe("disconnectAll", () => {
    it("should disconnect all sessions", async () => {
      await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://m1:4840" });
      await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://m2:4840" });
      await OpcUaConnectorEngine.connect({ endpoint: "opc.tcp://m3:4840" });

      const result = await OpcUaConnectorEngine.disconnectAll();
      expect(result.disconnected).toBe(3);

      const list = OpcUaConnectorEngine.listSessions();
      expect(list.sessions).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Controller profile node ID format validation
  // --------------------------------------------------------------------------
  describe("controller profile node ID formats", () => {
    it("fanuc uses ns=2;s= string paths", () => {
      const p = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "fanuc" });
      for (const v of Object.values(p.variables)) {
        expect(v.nodeId).toMatch(/^ns=2;s=/);
      }
    });

    it("siemens uses ns=2;s=/Channel/ or /Nck/ or /Plc/ paths", () => {
      const p = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "siemens" });
      for (const v of Object.values(p.variables)) {
        expect(v.nodeId).toMatch(/^ns=2;s=\//);
      }
    });

    it("heidenhain uses ns=4;s=DNC. paths", () => {
      const p = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "heidenhain" });
      for (const v of Object.values(p.variables)) {
        expect(v.nodeId).toMatch(/^ns=4;s=DNC\./);
      }
    });

    it("haas uses ns=2;s=Q numeric codes", () => {
      const p = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "haas" });
      for (const v of Object.values(p.variables)) {
        expect(v.nodeId).toMatch(/^ns=2;s=Q\d+/);
      }
    });

    it("mazak uses ns=2;s=/CNC/ paths", () => {
      const p = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "mazak" });
      for (const v of Object.values(p.variables)) {
        expect(v.nodeId).toMatch(/^ns=2;s=\/CNC\//);
      }
    });

    it("okuma uses ns=3;s=THINC. paths", () => {
      const p = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "okuma" });
      for (const v of Object.values(p.variables)) {
        expect(v.nodeId).toMatch(/^ns=3;s=THINC\./);
      }
    });
  });
});
