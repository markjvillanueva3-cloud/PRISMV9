/**
 * MCP Prompts for PRISM
 *
 * Exposes key PRISM workflows as MCP prompts, making them discoverable
 * by any MCP client (Claude Desktop, VS Code, Cursor, etc.).
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/prompts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";

export function registerPrompts(server: McpServer): void {
  // ═══════════════════════════════════════════════════════════
  // Speed/Feed Calculation
  // ═══════════════════════════════════════════════════════════
  server.prompt(
    "speed-feed",
    "Calculate optimal spindle RPM and feed rate using Kienzle/Taylor " +
      "physics with 67-point analysis including Monte Carlo confidence",
    {
      material: z.string().describe(
        "Material name or ISO group (e.g. '6061-T6', 'P2.1', '4140 steel')"
      ),
      tool_diameter: z.string().describe(
        "Tool diameter in mm (e.g. '12', '25.4')"
      ),
      operation: z.string().optional().describe(
        "Operation type: milling, turning, drilling, grinding, threading"
      ),
      machine: z.string().optional().describe(
        "Machine name (e.g. 'Haas VF-2', 'DMG MORI DMU 50')"
      ),
    },
    async ({ material, tool_diameter, operation, machine }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Calculate optimal speed and feed using PRISM's " +
              "SpeedFeedOrchestratorEngine.",
            `Material: ${material}`,
            `Tool diameter: ${tool_diameter}mm`,
            operation ? `Operation: ${operation}` : "Operation: milling",
            machine ? `Machine: ${machine}` : "",
            "",
            "Use the prism_calc tool with action 'sf_orchestrate' and " +
              "provide the full 67-point analysis including:",
            "- Kienzle cutting force (Fc = kc1.1 × ap × fz^(1-mc))",
            "- Taylor tool life (T = (C/Vc)^(1/n))",
            "- Stability lobe analysis (chatter-free RPM)",
            "- Monte Carlo confidence intervals (500 trials)",
            "- Playbook warnings and tribal knowledge tips",
          ].filter(Boolean).join("\n"),
        },
      }],
    })
  );

  // ═══════════════════════════════════════════════════════════
  // Manufacturing Quote
  // ═══════════════════════════════════════════════════════════
  server.prompt(
    "quote-job",
    "Generate a physics-backed manufacturing quote with DfM feedback, " +
      "cycle time, tooling costs, and price breaks",
    {
      part_description: z.string().describe(
        "Part description, material, and key features"
      ),
      quantity: z.string().describe(
        "Production quantity (e.g. '100', '1000')"
      ),
      material: z.string().optional().describe(
        "Material specification (e.g. '6061-T6 aluminum')"
      ),
    },
    async ({ part_description, quantity, material }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Generate a manufacturing quote using PRISM's " +
              "QuoteEstimatorEngine.",
            `Part: ${part_description}`,
            `Quantity: ${quantity}`,
            material ? `Material: ${material}` : "",
            "",
            "Include: cycle time estimation, tooling costs, " +
              "material costs, setup time, price breaks, " +
              "and DfM (Design for Manufacturability) feedback.",
          ].filter(Boolean).join("\n"),
        },
      }],
    })
  );

  // ═══════════════════════════════════════════════════════════
  // CNC Simulation
  // ═══════════════════════════════════════════════════════════
  server.prompt(
    "cnc-simulate",
    "Run Vericut-class CNC simulation with physics: force, thermal, " +
      "deflection, surface finish prediction per G-code block",
    {
      gcode: z.string().describe(
        "G-code program or file path to simulate"
      ),
      machine: z.string().optional().describe(
        "Target machine (e.g. 'Haas VF-2')"
      ),
      material: z.string().optional().describe(
        "Workpiece material (e.g. '4140 steel')"
      ),
    },
    async ({ gcode, machine, material }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Run CNC simulation using PRISM's " +
              "CNCSimulationPipelineEngine.",
            "",
            "G-code:",
            gcode.length < 500 ? gcode : gcode.substring(0, 500) + "...",
            "",
            machine ? `Machine: ${machine}` : "",
            material ? `Material: ${material}` : "",
            "",
            "Analyze: per-block forces (Kienzle), thermal load, " +
              "tool deflection, surface finish (Ra/Rz), " +
              "collision detection, and safety violations.",
          ].filter(Boolean).join("\n"),
        },
      }],
    })
  );

  // ═══════════════════════════════════════════════════════════
  // Feasibility Check
  // ═══════════════════════════════════════════════════════════
  server.prompt(
    "feasibility-check",
    "Check if a part can be machined: tool reach, fixture viability, " +
      "rigidity, sequence feasibility, setup transitions",
    {
      part_description: z.string().describe(
        "Part geometry, features, and tolerances"
      ),
      material: z.string().optional().describe(
        "Material (e.g. 'Inconel 718', '7075-T6')"
      ),
      machine: z.string().optional().describe(
        "Target machine"
      ),
    },
    async ({ part_description, material, machine }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Run machining feasibility analysis using PRISM's " +
              "FeasibilityOrchestratorEngine.",
            `Part: ${part_description}`,
            material ? `Material: ${material}` : "",
            machine ? `Machine: ${machine}` : "",
            "",
            "Check all 7 feasibility engines:",
            "1. Workpiece state (IPW, wall thickness)",
            "2. Accessibility (tool reach, holder clearance)",
            "3. Workholding viability (grip, vacuum, datum)",
            "4. Rigidity degradation (deflection, natural freq)",
            "5. Sequence feasibility (constraint graph)",
            "6. Setup transitions (datum chain, flip feasibility)",
            "7. Orchestrator verdict (fullAnalysis)",
          ].filter(Boolean).join("\n"),
        },
      }],
    })
  );

  // ═══════════════════════════════════════════════════════════
  // Playbook Advisor
  // ═══════════════════════════════════════════════════════════
  server.prompt(
    "machining-playbook",
    "Get best-practice machining rules from 296-rule playbook " +
      "covering 42 categories with physics-backed thresholds",
    {
      operation: z.string().describe(
        "Operation: milling, turning, drilling, grinding, " +
          "threading, edm, hsm, micro_machining, etc."
      ),
      material: z.string().optional().describe(
        "Material being machined"
      ),
      issue: z.string().optional().describe(
        "Specific problem: chatter, poor finish, tool breakage, etc."
      ),
    },
    async ({ operation, material, issue }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Query PRISM's MachiningPlaybookEngine for best practices.",
            `Operation: ${operation}`,
            material ? `Material: ${material}` : "",
            issue ? `Issue: ${issue}` : "",
            "",
            "Use prism_data with action 'playbook_query'. " +
              "Include physics-backed rules with evidence levels, " +
              "formula references, and ISO/DIN/ASME standard refs.",
          ].filter(Boolean).join("\n"),
        },
      }],
    })
  );

  // ═══════════════════════════════════════════════════════════
  // Alarm Decode
  // ═══════════════════════════════════════════════════════════
  server.prompt(
    "alarm-decode",
    "Decode CNC controller alarm: meaning, root cause, " +
      "fix steps. 10,033+ alarms across 12 controller families.",
    {
      alarm_code: z.string().describe(
        "Alarm code (e.g. 'EX1004', 'AL 100', '2006')"
      ),
      controller: z.string().optional().describe(
        "Controller: fanuc, siemens, haas, mazak, okuma, etc."
      ),
    },
    async ({ alarm_code, controller }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Decode this CNC alarm using PRISM's alarm database.",
            `Alarm code: ${alarm_code}`,
            controller ? `Controller: ${controller}` : "",
            "",
            "Use prism_data with action 'alarm_decode'. " +
              "Provide: meaning, severity, probable cause, " +
              "troubleshooting steps, and related alarms.",
          ].filter(Boolean).join("\n"),
        },
      }],
    })
  );

  // ═══════════════════════════════════════════════════════════
  // Tool Selection
  // ═══════════════════════════════════════════════════════════
  server.prompt(
    "tool-select",
    "Select optimal cutting tool from 94K+ tool catalog with " +
      "physics-backed ranking and speed/feed recommendations",
    {
      operation: z.string().describe(
        "Operation: face_milling, slotting, drilling, turning, etc."
      ),
      material: z.string().describe(
        "Workpiece material"
      ),
      feature: z.string().optional().describe(
        "Feature details: pocket depth, hole diameter, wall height"
      ),
    },
    async ({ operation, material, feature }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Select optimal cutting tool using PRISM's " +
              "ToolCatalogEngine (94K+ tools, 27 manufacturers).",
            `Operation: ${operation}`,
            `Material: ${material}`,
            feature ? `Feature: ${feature}` : "",
            "",
            "Use prism_data with action 'tool_recommend'. " +
              "Rank by: tool life, MRR, surface finish capability. " +
              "Include speed/feed starting points per tool.",
          ].filter(Boolean).join("\n"),
        },
      }],
    })
  );

  log.info("[MCP Prompts] Registered 7 prompts: speed-feed, " +
    "quote-job, cnc-simulate, feasibility-check, " +
    "machining-playbook, alarm-decode, tool-select");
}
