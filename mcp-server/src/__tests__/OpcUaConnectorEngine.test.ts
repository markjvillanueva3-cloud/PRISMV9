/**
 * OpcUaConnectorEngine — Comprehensive Tests
 *
 * Fully mocks node-opcua module to test all public methods:
 * connect, disconnect, readVariable, readMultiple, subscribe, unsubscribe,
 * browseNodes, getControllerProfile, listControllerFamilies, getMachineStatus,
 * monitorAlarms, getSubscriptionData, listSessions, writeVariable, disconnectAll
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock node-opcua — must be before engine import
// ---------------------------------------------------------------------------

const mockSessionRead = vi.fn();
const mockSessionWrite = vi.fn();
const mockSessionClose = vi.fn();
const mockSessionBrowse = vi.fn();
const mockSessionCreateSubscription2 = vi.fn();
const mockClientConnect = vi.fn();
const mockClientDisconnect = vi.fn();
const mockClientCreateSession = vi.fn();
const mockClientOn = vi.fn();
const mockSubscriptionMonitor = vi.fn();
const mockSubscriptionTerminate = vi.fn();

function resetMocks() {
  mockSessionRead.mockReset();
  mockSessionWrite.mockReset();
  mockSessionClose.mockReset();
  mockSessionBrowse.mockReset();
  mockSessionCreateSubscription2.mockReset();
  mockClientConnect.mockReset();
  mockClientDisconnect.mockReset();
  mockClientCreateSession.mockReset();
  mockClientOn.mockReset();
  mockSubscriptionMonitor.mockReset();
  mockSubscriptionTerminate.mockReset();

  // Default resolved implementations
  mockClientConnect.mockResolvedValue(undefined);
  mockClientDisconnect.mockResolvedValue(undefined);
  mockSessionClose.mockResolvedValue(undefined);
  mockSubscriptionTerminate.mockResolvedValue(undefined);

  const mockSession = {
    read: mockSessionRead,
    write: mockSessionWrite,
    close: mockSessionClose,
    browse: mockSessionBrowse,
    createSubscription2: mockSessionCreateSubscription2,
  };
  mockClientCreateSession.mockResolvedValue(mockSession);

  // Default server info reads
  mockSessionRead.mockResolvedValue({
    value: { value: 0, dataType: 6 },
    statusCode: { name: "Good" },
    sourceTimestamp: new Date("2026-01-01T00:00:00Z"),
    serverTimestamp: new Date("2026-01-01T00:00:00Z"),
  });

  // Default subscription mock
  const mockMonitoredItem = { on: vi.fn() };
  mockSubscriptionMonitor.mockResolvedValue(mockMonitoredItem);
  mockSessionCreateSubscription2.mockResolvedValue({
    monitor: mockSubscriptionMonitor,
    terminate: mockSubscriptionTerminate,
  });

  // Default write
  mockSessionWrite.mockResolvedValue({ name: "Good" });
}

vi.mock("node-opcua", () => ({
  OPCUAClient: {
    create: vi.fn(() => ({
      connect: mockClientConnect,
      disconnect: mockClientDisconnect,
      createSession: mockClientCreateSession,
      on: mockClientOn,
    })),
  },
  MessageSecurityMode: { None: 1, Sign: 2, SignAndEncrypt: 3 },
  SecurityPolicy: { None: "None", Basic256Sha256: "Basic256Sha256" },
  UserTokenType: { UserName: 1 },
  AttributeIds: { Value: 13 },
  TimestampsToReturn: { Both: 2 },
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
}));

// ---------------------------------------------------------------------------
// Import engine AFTER mock is set up
// ---------------------------------------------------------------------------

import { OpcUaConnectorEngine } from "../engines/OpcUaConnectorEngine.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function connectSession(overrides: Record<string, any> = {}) {
  return OpcUaConnectorEngine.connect({
    endpoint: "opc.tcp://192.168.1.100:4840",
    controllerFamily: "fanuc",
    heartbeatIntervalMs: 999999, // prevent heartbeat from firing during tests
    reconnectIntervalMs: 999999,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("OpcUaConnectorEngine", () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(async () => {
    // Clean up all sessions after each test to avoid cross-test pollution
    await OpcUaConnectorEngine.disconnectAll();
  });

  // =========================================================================
  // CONNECTION
  // =========================================================================

  describe("connect", () => {
    it("should connect and return a session with server info", async () => {
      const result = await connectSession();

      expect(result.connected).toBe(true);
      expect(result.sessionId).toMatch(/^opcua_session_/);
      expect(result.endpoint).toBe("opc.tcp://192.168.1.100:4840");
      expect(result.controllerFamily).toBe("fanuc");
      expect(result.serverInfo).toBeDefined();
      expect(mockClientConnect).toHaveBeenCalledWith("opc.tcp://192.168.1.100:4840");
      expect(mockClientCreateSession).toHaveBeenCalled();
    });

    it("should connect with credentials (UserName token)", async () => {
      const result = await connectSession({
        credentials: { username: "admin", password: "secret" },
      });

      expect(result.connected).toBe(true);
      expect(mockClientCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ userName: "admin", password: "secret" }),
      );
    });

    it("should throw on missing endpoint", async () => {
      await expect(
        OpcUaConnectorEngine.connect({ endpoint: "" }),
      ).rejects.toThrow("endpoint is required");
    });

    it("should throw on connection failure", async () => {
      mockClientConnect.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(connectSession()).rejects.toThrow("ECONNREFUSED");
    });

    it("should default controllerFamily to generic", async () => {
      const result = await connectSession({ controllerFamily: undefined });
      expect(result.controllerFamily).toBe("generic");
    });
  });

  // =========================================================================
  // DISCONNECT
  // =========================================================================

  describe("disconnect", () => {
    it("should disconnect a connected session", async () => {
      const { sessionId } = await connectSession();
      const result = await OpcUaConnectorEngine.disconnect({ sessionId });

      expect(result.disconnected).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(mockSessionClose).toHaveBeenCalled();
      expect(mockClientDisconnect).toHaveBeenCalled();
    });

    it("should return disconnected=false for unknown session", async () => {
      const result = await OpcUaConnectorEngine.disconnect({ sessionId: "nonexistent" });
      expect(result.disconnected).toBe(false);
    });
  });

  // =========================================================================
  // READ VARIABLE
  // =========================================================================

  describe("readVariable", () => {
    it("should read a single node and return structured result", async () => {
      const { sessionId } = await connectSession();

      mockSessionRead.mockResolvedValueOnce({
        value: { value: 12000, dataType: 11 },
        statusCode: { name: "Good" },
        sourceTimestamp: new Date("2026-03-16T10:00:00Z"),
        serverTimestamp: new Date("2026-03-16T10:00:01Z"),
      });

      const result = await OpcUaConnectorEngine.readVariable({
        sessionId,
        nodeId: "ns=2;s=GnrlSpindle/actSpeed",
      });

      expect(result.nodeId).toBe("ns=2;s=GnrlSpindle/actSpeed");
      expect(result.value).toBe(12000);
      expect(result.statusCode).toBe("Good");
      expect(result.dataType).toBe("11");
      expect(result.sourceTimestamp).toBe("2026-03-16T10:00:00.000Z");
    });

    it("should throw on invalid session", async () => {
      await expect(
        OpcUaConnectorEngine.readVariable({ sessionId: "bad_id", nodeId: "ns=2;s=test" }),
      ).rejects.toThrow("Session not found");
    });

    it("should handle null value gracefully", async () => {
      const { sessionId } = await connectSession();

      mockSessionRead.mockResolvedValueOnce({
        value: { value: undefined, dataType: undefined },
        statusCode: { name: "BadNodeIdUnknown" },
        sourceTimestamp: null,
        serverTimestamp: null,
      });

      const result = await OpcUaConnectorEngine.readVariable({
        sessionId,
        nodeId: "ns=2;s=NonExistent",
      });

      expect(result.value).toBeNull();
      expect(result.statusCode).toBe("BadNodeIdUnknown");
    });
  });

  // =========================================================================
  // READ MULTIPLE (BATCH)
  // =========================================================================

  describe("readMultiple", () => {
    it("should batch-read multiple nodes", async () => {
      const { sessionId } = await connectSession();

      mockSessionRead.mockResolvedValueOnce([
        {
          value: { value: 8000, dataType: 11 },
          statusCode: { name: "Good" },
          sourceTimestamp: new Date(),
          serverTimestamp: new Date(),
        },
        {
          value: { value: 65.2, dataType: 11 },
          statusCode: { name: "Good" },
          sourceTimestamp: new Date(),
          serverTimestamp: new Date(),
        },
      ]);

      const result = await OpcUaConnectorEngine.readMultiple({
        sessionId,
        nodeIds: ["ns=2;s=GnrlSpindle/actSpeed", "ns=2;s=GnrlSpindle/actLoad"],
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].value).toBe(8000);
      expect(result.results[1].value).toBe(65.2);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for empty nodeIds", async () => {
      const { sessionId } = await connectSession();

      const result = await OpcUaConnectorEngine.readMultiple({
        sessionId,
        nodeIds: [],
      });

      expect(result.results).toHaveLength(0);
      expect(result.errors).toContain("nodeIds array is empty");
    });

    it("should report bad status codes in errors array", async () => {
      const { sessionId } = await connectSession();

      mockSessionRead.mockResolvedValueOnce([
        {
          value: { value: null, dataType: undefined },
          statusCode: { name: "BadNodeIdUnknown" },
          sourceTimestamp: new Date(),
          serverTimestamp: new Date(),
        },
      ]);

      const result = await OpcUaConnectorEngine.readMultiple({
        sessionId,
        nodeIds: ["ns=2;s=Invalid"],
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("BadNodeIdUnknown");
    });
  });

  // =========================================================================
  // SUBSCRIBE
  // =========================================================================

  describe("subscribe", () => {
    it("should create a subscription with monitored items", async () => {
      const { sessionId } = await connectSession();

      const result = await OpcUaConnectorEngine.subscribe({
        sessionId,
        nodeIds: ["ns=2;s=GnrlSpindle/actSpeed", "ns=2;s=Axes/actFeedrate"],
        interval: 250,
      });

      expect(result.subscriptionId).toMatch(/^opcua_sub_/);
      expect(result.sessionId).toBe(sessionId);
      expect(result.nodeIds).toHaveLength(2);
      expect(result.interval).toBe(250);
      expect(result.active).toBe(true);
      expect(mockSessionCreateSubscription2).toHaveBeenCalled();
      expect(mockSubscriptionMonitor).toHaveBeenCalledTimes(2);
    });

    it("should use default interval of 500ms", async () => {
      const { sessionId } = await connectSession();

      const result = await OpcUaConnectorEngine.subscribe({
        sessionId,
        nodeIds: ["ns=2;s=test"],
      });

      expect(result.interval).toBe(500);
    });
  });

  // =========================================================================
  // UNSUBSCRIBE
  // =========================================================================

  describe("unsubscribe", () => {
    it("should terminate an existing subscription", async () => {
      const { sessionId } = await connectSession();
      const sub = await OpcUaConnectorEngine.subscribe({
        sessionId,
        nodeIds: ["ns=2;s=test"],
      });

      const result = await OpcUaConnectorEngine.unsubscribe({
        sessionId,
        subscriptionId: sub.subscriptionId,
      });

      expect(result.terminated).toBe(true);
    });

    it("should return terminated=false for unknown subscription", async () => {
      const { sessionId } = await connectSession();

      const result = await OpcUaConnectorEngine.unsubscribe({
        sessionId,
        subscriptionId: "nonexistent_sub",
      });

      expect(result.terminated).toBe(false);
    });
  });

  // =========================================================================
  // BROWSE NODES
  // =========================================================================

  describe("browseNodes", () => {
    it("should browse address space from root", async () => {
      const { sessionId } = await connectSession();

      mockSessionBrowse.mockResolvedValueOnce({
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

      const result = await OpcUaConnectorEngine.browseNodes({ sessionId });

      expect(result.parentNodeId).toBe("ns=0;i=84"); // default RootFolder
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].browseName).toBe("Objects");
      expect(result.nodes[1].displayName).toBe("Types");
    });

    it("should browse from a specified parent node", async () => {
      const { sessionId } = await connectSession();

      mockSessionBrowse.mockResolvedValueOnce({ references: [] });

      const result = await OpcUaConnectorEngine.browseNodes({
        sessionId,
        parentNodeId: "ns=2;s=CustomNode",
      });

      expect(result.parentNodeId).toBe("ns=2;s=CustomNode");
      expect(result.nodes).toHaveLength(0);
      expect(mockSessionBrowse).toHaveBeenCalledWith("ns=2;s=CustomNode");
    });
  });

  // =========================================================================
  // CONTROLLER PROFILES
  // =========================================================================

  describe("getControllerProfile", () => {
    it("should return Fanuc controller profile", () => {
      const profile = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "fanuc" });

      expect(profile.vendor).toBe("FANUC");
      expect(profile.variables.spindle_speed).toBeDefined();
      expect(profile.variables.spindle_speed.nodeId).toContain("GnrlSpindle/actSpeed");
      expect(profile.variables.spindle_speed.unit).toBe("rpm");
    });

    it("should return Siemens controller profile (case-insensitive)", () => {
      const profile = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "Siemens" });

      expect(profile.vendor).toBe("Siemens");
      expect(profile.variables.spindle_speed.nodeId).toContain("Channel/Spindle");
    });

    it("should throw for unknown controller family", () => {
      expect(() =>
        OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "unknownBrand" }),
      ).toThrow("Unknown controller family");
    });

    it("should throw when controllerFamily is empty", () => {
      expect(() =>
        OpcUaConnectorEngine.getControllerProfile({ controllerFamily: "" }),
      ).toThrow("controllerFamily is required");
    });
  });

  describe("listControllerFamilies", () => {
    it("should list all 6 supported controller families", () => {
      const result = OpcUaConnectorEngine.listControllerFamilies();

      expect(result.families.length).toBe(6);
      const names = result.families.map((f) => f.family);
      expect(names).toContain("fanuc");
      expect(names).toContain("siemens");
      expect(names).toContain("heidenhain");
      expect(names).toContain("haas");
      expect(names).toContain("mazak");
      expect(names).toContain("okuma");
    });
  });

  // =========================================================================
  // MACHINE STATUS
  // =========================================================================

  describe("getMachineStatus", () => {
    it("should return structured machine status for a known controller", async () => {
      const { sessionId } = await connectSession({ controllerFamily: "fanuc" });

      // Build a mock batch read response — 19 variables in the fanuc profile
      // All must have statusCode "Good" or "GoodNoData" to avoid readErrors
      const mockValues = Array.from({ length: 19 }, (_, i) => ({
        value: { value: i * 10, dataType: 11 },
        statusCode: { name: "Good" },
        sourceTimestamp: new Date(),
        serverTimestamp: new Date(),
      }));
      mockSessionRead.mockResolvedValueOnce(mockValues);

      const status = await OpcUaConnectorEngine.getMachineStatus({ sessionId });

      expect(status.controllerFamily).toBe("fanuc");
      expect(status.sessionId).toBe(sessionId);
      expect(status.spindle).toBeDefined();
      expect(status.feed).toBeDefined();
      expect(status.axes).toBeDefined();
      expect(status.program).toBeDefined();
      expect(status.tool).toBeDefined();
      expect(status.status).toBeDefined();
      expect(status.timestamp).toBeDefined();
      // readErrors may contain non-Good statuses from batch; just verify shape
      expect(Array.isArray(status.readErrors)).toBe(true);
    });

    it("should throw for unknown controller family in getMachineStatus", async () => {
      const { sessionId } = await connectSession({ controllerFamily: "generic" });

      await expect(
        OpcUaConnectorEngine.getMachineStatus({ sessionId, controllerFamily: "unknownBrand" }),
      ).rejects.toThrow("unknown controller family");
    });
  });

  // =========================================================================
  // MONITOR ALARMS
  // =========================================================================

  describe("monitorAlarms", () => {
    it("should create alarm subscription for known controller", async () => {
      const { sessionId } = await connectSession({ controllerFamily: "fanuc" });

      const result = await OpcUaConnectorEngine.monitorAlarms({ sessionId });

      expect(result.active).toBe(true);
      expect(result.nodeIds.length).toBeGreaterThan(0);
      // Fanuc alarm nodes include alarm_active, alarm_code, mode, door_open
      expect(result.interval).toBe(250); // default alarm interval
    });

    it("should throw for controller with no known alarm nodes", async () => {
      const { sessionId } = await connectSession({ controllerFamily: "generic" });

      await expect(
        OpcUaConnectorEngine.monitorAlarms({ sessionId }),
      ).rejects.toThrow("No alarm node IDs known");
    });
  });

  // =========================================================================
  // SUBSCRIPTION DATA
  // =========================================================================

  describe("getSubscriptionData", () => {
    it("should return and clear the data buffer", async () => {
      const { sessionId } = await connectSession();

      // Create subscription — capture the on("changed") callback
      let changeCallback: ((dv: any) => void) | null = null;
      const mockMI = {
        on: vi.fn((event: string, cb: any) => {
          if (event === "changed") changeCallback = cb;
        }),
      };
      mockSubscriptionMonitor.mockResolvedValueOnce(mockMI);

      const sub = await OpcUaConnectorEngine.subscribe({
        sessionId,
        nodeIds: ["ns=2;s=TestNode"],
      });

      // Simulate a data change
      if (changeCallback) {
        changeCallback({
          value: { value: 42 },
          sourceTimestamp: new Date("2026-03-16T12:00:00Z"),
        });
      }

      const data = OpcUaConnectorEngine.getSubscriptionData({
        sessionId,
        subscriptionId: sub.subscriptionId,
      });

      expect(data.count).toBe(1);
      expect(data.data[0].value).toBe(42);
      expect(data.data[0].nodeId).toBe("ns=2;s=TestNode");

      // Second call should be empty (buffer cleared)
      const data2 = OpcUaConnectorEngine.getSubscriptionData({
        sessionId,
        subscriptionId: sub.subscriptionId,
      });
      expect(data2.count).toBe(0);
    });

    it("should throw for unknown subscription", async () => {
      const { sessionId } = await connectSession();

      expect(() =>
        OpcUaConnectorEngine.getSubscriptionData({
          sessionId,
          subscriptionId: "bogus_sub",
        }),
      ).toThrow("Subscription not found");
    });
  });

  // =========================================================================
  // LIST SESSIONS
  // =========================================================================

  describe("listSessions", () => {
    it("should list all active sessions", async () => {
      const s1 = await connectSession({ endpoint: "opc.tcp://host1:4840" });
      const s2 = await connectSession({ endpoint: "opc.tcp://host2:4840" });

      const result = OpcUaConnectorEngine.listSessions();

      expect(result.sessions.length).toBe(2);
      const ids = result.sessions.map((s) => s.sessionId);
      expect(ids).toContain(s1.sessionId);
      expect(ids).toContain(s2.sessionId);
      expect(result.sessions[0].connected).toBe(true);
      expect(result.sessions[0].lastHeartbeat).toBeDefined();
    });
  });

  // =========================================================================
  // WRITE VARIABLE
  // =========================================================================

  describe("writeVariable", () => {
    it("should write a value to a node and return success", async () => {
      const { sessionId } = await connectSession();

      mockSessionWrite.mockResolvedValueOnce({ name: "Good" });

      const result = await OpcUaConnectorEngine.writeVariable({
        sessionId,
        nodeId: "ns=2;s=Axes/actFeedOverride",
        value: 80.0,
        dataType: "Double",
      });

      expect(result.written).toBe(true);
      expect(result.statusCode).toBe("Good");
      expect(result.nodeId).toBe("ns=2;s=Axes/actFeedOverride");
      expect(mockSessionWrite).toHaveBeenCalled();
    });

    it("should handle write failure (bad status)", async () => {
      const { sessionId } = await connectSession();

      mockSessionWrite.mockResolvedValueOnce({ name: "BadNotWritable" });

      const result = await OpcUaConnectorEngine.writeVariable({
        sessionId,
        nodeId: "ns=2;s=ReadOnlyNode",
        value: 100,
        dataType: "Int32",
      });

      expect(result.written).toBe(false);
      expect(result.statusCode).toBe("BadNotWritable");
    });

    it("should throw for unsupported dataType", async () => {
      const { sessionId } = await connectSession();

      await expect(
        OpcUaConnectorEngine.writeVariable({
          sessionId,
          nodeId: "ns=2;s=test",
          value: "test",
          dataType: "ByteArray",
        }),
      ).rejects.toThrow("Unsupported dataType: ByteArray");
    });
  });

  // =========================================================================
  // DISCONNECT ALL
  // =========================================================================

  describe("disconnectAll", () => {
    it("should disconnect all active sessions", async () => {
      await connectSession({ endpoint: "opc.tcp://host1:4840" });
      await connectSession({ endpoint: "opc.tcp://host2:4840" });
      await connectSession({ endpoint: "opc.tcp://host3:4840" });

      const result = await OpcUaConnectorEngine.disconnectAll();

      expect(result.disconnected).toBe(3);
      expect(OpcUaConnectorEngine.listSessions().sessions).toHaveLength(0);
    });
  });

  // =========================================================================
  // SESSION VALIDATION — disconnected session
  // =========================================================================

  describe("session validation", () => {
    it("should throw when reading from a disconnected session", async () => {
      const { sessionId } = await connectSession();
      await OpcUaConnectorEngine.disconnect({ sessionId });

      await expect(
        OpcUaConnectorEngine.readVariable({ sessionId, nodeId: "ns=2;s=test" }),
      ).rejects.toThrow("Session not found");
    });
  });

  // =========================================================================
  // ALL CONTROLLER PROFILES HAVE COMPLETE VARIABLE SETS
  // =========================================================================

  describe("controller profile completeness", () => {
    const requiredVars = [
      "spindle_speed", "spindle_load", "feed_rate", "axis_x", "axis_y", "axis_z",
      "tool_number", "alarm_active", "alarm_code", "mode",
    ];

    for (const family of ["fanuc", "siemens", "heidenhain", "haas", "mazak", "okuma"]) {
      it(`${family} profile should have all required variables`, () => {
        const profile = OpcUaConnectorEngine.getControllerProfile({ controllerFamily: family });
        for (const v of requiredVars) {
          expect(profile.variables[v], `${family} missing ${v}`).toBeDefined();
          expect(profile.variables[v].nodeId).toBeTruthy();
        }
      });
    }
  });
});
