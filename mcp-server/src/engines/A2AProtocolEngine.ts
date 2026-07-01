/**
 * A2AProtocolEngine — U-HAGI07 Agent-to-Agent protocol layer (Voxyz L5 second axis).
 *
 * Pure-core conformance wrapper that lets PSN slots expose themselves as
 * A2A-conformant agents (Linux Foundation Agent2Agent protocol, Google 2025).
 * Two surfaces:
 *
 *   inboundDescriptor()    — render a slot's capability card so external A2A
 *                            agents discover what this PSN slot can do
 *   outboundEnvelope()     — wrap an outbound message to an external A2A agent
 *
 * Pure: no I/O, no spawn.  Caller does the actual A2A transport (HTTP/SSE).
 *
 * @module engines/A2AProtocolEngine
 */

import { z } from "zod";

export const A2A_PROTOCOL_VERSION = "1.0";

export const A2ACapabilitySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  input_schema_ref: z.string().max(200).optional(),
  output_schema_ref: z.string().max(200).optional(),
});
export type A2ACapability = z.infer<typeof A2ACapabilitySchema>;

export const A2AAgentDescriptorSchema = z.object({
  protocol_version: z.literal(A2A_PROTOCOL_VERSION),
  agent_id: z.string().min(1).max(120),
  slot: z.string().min(1).max(40),
  role: z.string().min(1).max(120),
  capabilities: z.array(A2ACapabilitySchema).min(1).max(50),
  hermes_compliant: z.boolean(),
  generated_at: z.string().min(1),
});
export type A2AAgentDescriptor = z.infer<typeof A2AAgentDescriptorSchema>;

export const A2AMessageSchema = z.object({
  protocol_version: z.literal(A2A_PROTOCOL_VERSION),
  message_id: z.string().min(1).max(120),
  from_agent: z.string().min(1).max(120),
  to_agent: z.string().min(1).max(120),
  intent: z.enum(["query", "request", "delegate", "notify", "confirm", "decline"]),
  capability: z.string().min(1).max(120),
  payload: z.unknown(),
  reply_to: z.string().max(120).optional(),
  sent_at: z.string().min(1),
});
export type A2AMessage = z.infer<typeof A2AMessageSchema>;

export interface SlotProfile {
  slot: string;
  role: string;
  agent_id?: string;
  capabilities: readonly A2ACapability[];
  hermes_compliant?: boolean;
}

const HARD_CAPABILITY_CEILING = 50;

export class A2AProtocolEngine {
  static validateCapability(c: unknown): A2ACapability { return A2ACapabilitySchema.parse(c); }
  static validateDescriptor(d: unknown): A2AAgentDescriptor { return A2AAgentDescriptorSchema.parse(d); }
  static validateMessage(m: unknown): A2AMessage { return A2AMessageSchema.parse(m); }

  /**
   * Render a PSN slot as a publishable A2A agent descriptor.  External
   * agents fetch this to discover what the slot can do.
   */
  static inboundDescriptor(
    profile: SlotProfile,
    at: string = new Date().toISOString(),
  ): A2AAgentDescriptor {
    if (!profile || typeof profile !== "object") {
      throw new Error("A2AProtocol.inboundDescriptor requires a SlotProfile");
    }
    if (!profile.slot || typeof profile.slot !== "string") {
      throw new Error("A2AProtocol.inboundDescriptor: slot is required");
    }
    if (!profile.role || typeof profile.role !== "string") {
      throw new Error("A2AProtocol.inboundDescriptor: role is required");
    }
    if (!Array.isArray(profile.capabilities) || profile.capabilities.length === 0) {
      throw new Error("A2AProtocol.inboundDescriptor: at least one capability required");
    }
    if (profile.capabilities.length > HARD_CAPABILITY_CEILING) {
      throw new Error(`A2AProtocol.inboundDescriptor: capability count ${profile.capabilities.length} exceeds ceiling ${HARD_CAPABILITY_CEILING}`);
    }
    for (const c of profile.capabilities) A2ACapabilitySchema.parse(c);

    const desc: A2AAgentDescriptor = {
      protocol_version: A2A_PROTOCOL_VERSION,
      agent_id: profile.agent_id ?? `prism-slot-${profile.slot}`,
      slot: profile.slot,
      role: profile.role,
      capabilities: [...profile.capabilities],
      hermes_compliant: profile.hermes_compliant ?? true,
      generated_at: at,
    };
    return A2AAgentDescriptorSchema.parse(desc);
  }

  /**
   * Wrap an outbound message to an external A2A agent.  Caller supplies
   * (from_agent, to_agent, intent, capability, payload); engine fills
   * protocol_version + message_id + sent_at and validates the result.
   */
  static outboundEnvelope(args: {
    from_agent: string;
    to_agent: string;
    intent: A2AMessage["intent"];
    capability: string;
    payload: unknown;
    reply_to?: string;
    message_id?: string;
    sent_at?: string;
  }): A2AMessage {
    const m: A2AMessage = {
      protocol_version: A2A_PROTOCOL_VERSION,
      message_id: args.message_id ?? `msg_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      from_agent: args.from_agent,
      to_agent: args.to_agent,
      intent: args.intent,
      capability: args.capability,
      payload: args.payload,
      reply_to: args.reply_to,
      sent_at: args.sent_at ?? new Date().toISOString(),
    };
    return A2AMessageSchema.parse(m);
  }

  /**
   * Check that an inbound A2A message from an external agent is well-formed
   * and addresses a capability this slot actually exposes.
   */
  static acceptInbound(
    message: A2AMessage,
    localDescriptor: A2AAgentDescriptor,
  ): { accept: boolean; reason: string } {
    A2AMessageSchema.parse(message);
    A2AAgentDescriptorSchema.parse(localDescriptor);
    if (message.to_agent !== localDescriptor.agent_id) {
      return { accept: false, reason: `message addressed to ${message.to_agent}, local agent is ${localDescriptor.agent_id}` };
    }
    const cap = localDescriptor.capabilities.find((c) => c.name === message.capability);
    if (!cap) {
      return { accept: false, reason: `capability "${message.capability}" not exposed by ${localDescriptor.agent_id}` };
    }
    return { accept: true, reason: `routed to capability "${cap.name}"` };
  }
}

export const a2aProtocolEngine = A2AProtocolEngine;
