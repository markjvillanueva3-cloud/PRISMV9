/**
 * A2AProtocolEngine tests — U-HAGI07.
 */
import { describe, it, expect } from "vitest";
import {
  A2AProtocolEngine,
  A2A_PROTOCOL_VERSION,
  type SlotProfile,
  type A2ACapability,
} from "../engines/A2AProtocolEngine.js";

const millCap: A2ACapability = {
  name: "kienzle_force",
  description: "Compute cutting force via Kienzle model",
  input_schema_ref: "schemas/kienzle-input.json",
  output_schema_ref: "schemas/kienzle-output.json",
};
const tribalCap: A2ACapability = {
  name: "tribal_lookup",
  description: "Search tribal corpus by tool + material",
};

const bravoProfile: SlotProfile = {
  slot: "bravo",
  role: "mill-specialist",
  capabilities: [millCap, tribalCap],
};

const ISO = "2026-05-24T13:00:00.000Z";

describe("A2AProtocolEngine.inboundDescriptor", () => {
  it("renders a SlotProfile as a valid A2A descriptor with default agent_id", () => {
    const d = A2AProtocolEngine.inboundDescriptor(bravoProfile, ISO);
    expect(d.protocol_version).toBe(A2A_PROTOCOL_VERSION);
    expect(d.agent_id).toBe("prism-slot-bravo");
    expect(d.slot).toBe("bravo");
    expect(d.role).toBe("mill-specialist");
    expect(d.capabilities).toHaveLength(2);
    expect(d.capabilities[0].name).toBe("kienzle_force");
    expect(d.hermes_compliant).toBe(true);
    expect(d.generated_at).toBe(ISO);
  });

  it("honors a custom agent_id when supplied", () => {
    const d = A2AProtocolEngine.inboundDescriptor(
      { ...bravoProfile, agent_id: "custom-xyz", hermes_compliant: false },
      ISO,
    );
    expect(d.agent_id).toBe("custom-xyz");
    expect(d.hermes_compliant).toBe(false);
  });

  it("throws when capabilities list is empty (failure mode)", () => {
    expect(() => A2AProtocolEngine.inboundDescriptor({ slot: "x", role: "y", capabilities: [] }, ISO)).toThrow();
  });

  it("throws on missing slot (failure mode)", () => {
    expect(() => A2AProtocolEngine.inboundDescriptor({ slot: "", role: "y", capabilities: [millCap] }, ISO)).toThrow();
  });

  it("throws on missing role (failure mode)", () => {
    expect(() => A2AProtocolEngine.inboundDescriptor({ slot: "x", role: "", capabilities: [millCap] }, ISO)).toThrow();
  });

  it("throws when capabilities exceed ceiling of 50 (boundary)", () => {
    const big = Array.from({ length: 51 }, (_, i) => ({
      name: `cap_${i}`,
      description: `desc ${i}`,
    }));
    expect(() => A2AProtocolEngine.inboundDescriptor({ slot: "x", role: "y", capabilities: big }, ISO)).toThrow(/50/);
  });

  it("throws on null profile (adversarial)", () => {
    expect(() => A2AProtocolEngine.inboundDescriptor(null as never, ISO)).toThrow();
  });
});

describe("A2AProtocolEngine.outboundEnvelope", () => {
  it("wraps a query message with protocol + message_id + sent_at", () => {
    const m = A2AProtocolEngine.outboundEnvelope({
      from_agent: "prism-slot-bravo",
      to_agent: "ext-customer-acme",
      intent: "query",
      capability: "ask_kienzle",
      payload: { material: "steel" },
      sent_at: ISO,
    });
    expect(m.protocol_version).toBe(A2A_PROTOCOL_VERSION);
    expect(m.message_id).toMatch(/^msg_/);
    expect(m.from_agent).toBe("prism-slot-bravo");
    expect(m.to_agent).toBe("ext-customer-acme");
    expect(m.intent).toBe("query");
    expect((m.payload as { material: string }).material).toBe("steel");
    expect(m.sent_at).toBe(ISO);
  });

  it("honors a caller-supplied message_id (deterministic)", () => {
    const m = A2AProtocolEngine.outboundEnvelope({
      from_agent: "a", to_agent: "b", intent: "request", capability: "c",
      payload: 1, message_id: "msg_fixed_001", sent_at: ISO,
    });
    expect(m.message_id).toBe("msg_fixed_001");
  });

  it("rejects unknown intent (adversarial)", () => {
    expect(() => A2AProtocolEngine.outboundEnvelope({
      from_agent: "a", to_agent: "b", intent: "explode" as never, capability: "c",
      payload: 0,
    })).toThrow();
  });

  it("rejects empty from_agent (failure mode)", () => {
    expect(() => A2AProtocolEngine.outboundEnvelope({
      from_agent: "", to_agent: "b", intent: "query", capability: "c", payload: {},
    })).toThrow();
  });

  it("supports all 6 intent verbs: query, request, delegate, notify, confirm, decline", () => {
    for (const intent of ["query", "request", "delegate", "notify", "confirm", "decline"] as const) {
      const m = A2AProtocolEngine.outboundEnvelope({
        from_agent: "a", to_agent: "b", intent, capability: "c", payload: null, sent_at: ISO,
      });
      expect(m.intent).toBe(intent);
    }
  });
});

describe("A2AProtocolEngine.acceptInbound", () => {
  const local = A2AProtocolEngine.inboundDescriptor(bravoProfile, ISO);

  it("accepts a well-formed message addressed to a known capability", () => {
    const msg = A2AProtocolEngine.outboundEnvelope({
      from_agent: "ext-acme", to_agent: "prism-slot-bravo",
      intent: "query", capability: "kienzle_force", payload: { material: "Ti" }, sent_at: ISO,
    });
    const d = A2AProtocolEngine.acceptInbound(msg, local);
    expect(d.accept).toBe(true);
    expect(d.reason).toContain("kienzle_force");
  });

  it("rejects message addressed to a different agent", () => {
    const msg = A2AProtocolEngine.outboundEnvelope({
      from_agent: "ext", to_agent: "prism-slot-charlie",
      intent: "query", capability: "kienzle_force", payload: 0, sent_at: ISO,
    });
    const d = A2AProtocolEngine.acceptInbound(msg, local);
    expect(d.accept).toBe(false);
    expect(d.reason).toContain("prism-slot-charlie");
  });

  it("rejects message asking for an unexposed capability", () => {
    const msg = A2AProtocolEngine.outboundEnvelope({
      from_agent: "ext", to_agent: "prism-slot-bravo",
      intent: "query", capability: "unknown_cap", payload: 0, sent_at: ISO,
    });
    const d = A2AProtocolEngine.acceptInbound(msg, local);
    expect(d.accept).toBe(false);
    expect(d.reason).toContain("unknown_cap");
  });
});

describe("A2AProtocolEngine.validate*", () => {
  it("validateCapability rejects oversize description (boundary)", () => {
    expect(() => A2AProtocolEngine.validateCapability({
      name: "x", description: "x".repeat(501),
    })).toThrow();
  });

  it("validateMessage rejects wrong protocol_version", () => {
    expect(() => A2AProtocolEngine.validateMessage({
      protocol_version: "0.5", message_id: "x", from_agent: "a", to_agent: "b",
      intent: "query", capability: "c", payload: 0, sent_at: ISO,
    })).toThrow();
  });
});
