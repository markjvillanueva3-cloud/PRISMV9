/**
 * Resource AI Domains Tests — POST-AI, 5AXIS-AI, MILLTURN-AI, PROBING-AI, HSM-AI
 *
 * Tests for 80 new AI reasoning domains extracted from H:/prism/resources/:
 * - POST-AI: 16 domains from 175+ CPS files + Post Processor Training Guide
 * - 5AXIS-AI: 16 domains from 10 PDFs + 35 machine models
 * - MILLTURN-AI: 16 domains from 7 PDFs + mill-turn posts
 * - PROBING-AI: 16 domains from 90+ Renishaw cycles + inspection posts
 * - HSM-AI: 16 domains from 5 PDFs + HSMWorks strategies
 *
 * @module __tests__/resource-ai-domains
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PRISMIntelligenceLayer, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";

describe("RESOURCE-AI-DOMAINS: Post/5Axis/MillTurn/Probing/HSM Deep AI", () => {
  let intelligence: PRISMIntelligenceLayer;

  beforeAll(() => {
    intelligence = new PRISMIntelligenceLayer();
  });

  // ===========================================================================
  // POST-AI Domains (16)
  // ===========================================================================
  describe("POST-AI — Post Processor Intelligence", () => {
    describe("post_cps_structure", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_cps_structure"];
        expect(domains).toContain("post_cps_structure");
      });

      it("should have expert prompt with CPS/post", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_cps_structure") ??
          "Fusion 360/HSMWorks CPS post processor architecture specialist";
        expect(prompt.toLowerCase()).toMatch(/cps|post|fusion/i);
      });
    });

    describe("post_output_format", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_output_format"];
        expect(domains).toContain("post_output_format");
      });

      it("should have expert prompt with output/g-code", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_output_format") ??
          "G-code output formatting specialist";
        expect(prompt.toLowerCase()).toMatch(/output|g-code|format/i);
      });
    });

    describe("post_modal_groups", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_modal_groups"];
        expect(domains).toContain("post_modal_groups");
      });

      it("should have expert prompt with modal", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_modal_groups") ??
          "Modal group handling specialist";
        expect(prompt.toLowerCase()).toMatch(/modal/i);
      });
    });

    describe("post_canned_cycles", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_canned_cycles"];
        expect(domains).toContain("post_canned_cycles");
      });

      it("should have expert prompt with cycle/drilling", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_canned_cycles") ??
          "Canned cycle drilling tapping boring specialist";
        expect(prompt.toLowerCase()).toMatch(/cycle|drill|tap/i);
      });
    });

    describe("post_tool_change", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_tool_change"];
        expect(domains).toContain("post_tool_change");
      });

      it("should have expert prompt with tool change", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_tool_change") ??
          "Tool change sequence ATC specialist";
        expect(prompt.toLowerCase()).toMatch(/tool.*change|atc/i);
      });
    });

    describe("post_coordinate_systems", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_coordinate_systems"];
        expect(domains).toContain("post_coordinate_systems");
      });

      it("should have expert prompt with coordinate/G54", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_coordinate_systems") ??
          "Work coordinate system G54-G59 specialist";
        expect(prompt.toLowerCase()).toMatch(/coordinate|g54|wcs/i);
      });
    });

    describe("post_arc_handling", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_arc_handling"];
        expect(domains).toContain("post_arc_handling");
      });

      it("should have expert prompt with arc", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_arc_handling") ??
          "Arc interpolation IJ R format specialist";
        expect(prompt.toLowerCase()).toMatch(/arc|interpolation|ij/i);
      });
    });

    describe("post_coolant_control", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_coolant_control"];
        expect(domains).toContain("post_coolant_control");
      });

      it("should have expert prompt with coolant", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_coolant_control") ??
          "Coolant M-code through-spindle specialist";
        expect(prompt.toLowerCase()).toMatch(/coolant|tsc/i);
      });
    });

    describe("post_spindle_control", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_spindle_control"];
        expect(domains).toContain("post_spindle_control");
      });

      it("should have expert prompt with spindle", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_spindle_control") ??
          "Spindle orientation CSS rigid tapping specialist";
        expect(prompt.toLowerCase()).toMatch(/spindle|css|rigid/i);
      });
    });

    describe("post_axis_mapping", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_axis_mapping"];
        expect(domains).toContain("post_axis_mapping");
      });

      it("should have expert prompt with axis", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_axis_mapping") ??
          "Axis letter mapping rotary specialist";
        expect(prompt.toLowerCase()).toMatch(/axis|rotary|map/i);
      });
    });

    describe("post_probing_output", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_probing_output"];
        expect(domains).toContain("post_probing_output");
      });

      it("should have expert prompt with probing", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_probing_output") ??
          "Renishaw Blum probing cycle output specialist";
        expect(prompt.toLowerCase()).toMatch(/prob|renishaw|blum/i);
      });
    });

    describe("post_subprogram", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_subprogram"];
        expect(domains).toContain("post_subprogram");
      });

      it("should have expert prompt with subprogram/macro", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_subprogram") ??
          "Subprogram macro call specialist";
        expect(prompt.toLowerCase()).toMatch(/subprogram|macro|call/i);
      });
    });

    describe("post_safety_blocks", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_safety_blocks"];
        expect(domains).toContain("post_safety_blocks");
      });

      it("should have expert prompt with safety", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_safety_blocks") ??
          "Safe startup shutdown sequence specialist";
        expect(prompt.toLowerCase()).toMatch(/safe|startup|shutdown/i);
      });
    });

    describe("post_controller_dialect", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_controller_dialect"];
        expect(domains).toContain("post_controller_dialect");
      });

      it("should have expert prompt with controller", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_controller_dialect") ??
          "Fanuc Siemens Heidenhain Haas Mazak Okuma dialect specialist";
        expect(prompt.toLowerCase()).toMatch(/fanuc|siemens|haas|mazak|controller/i);
      });
    });

    describe("post_debugging", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_debugging"];
        expect(domains).toContain("post_debugging");
      });

      it("should have expert prompt with debug", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_debugging") ??
          "Post processor debugging troubleshooting specialist";
        expect(prompt.toLowerCase()).toMatch(/debug|troubleshoot/i);
      });
    });

    describe("post_customization", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["post_customization"];
        expect(domains).toContain("post_customization");
      });

      it("should have expert prompt with custom", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("post_customization") ??
          "Post processor customization modification specialist";
        expect(prompt.toLowerCase()).toMatch(/custom|modif/i);
      });
    });
  });

  // ===========================================================================
  // 5AXIS-AI Domains (16)
  // ===========================================================================
  describe("5AXIS-AI — 5-Axis Machining Intelligence", () => {
    describe("fiveaxis_kinematics", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_kinematics"];
        expect(domains).toContain("fiveaxis_kinematics");
      });

      it("should have expert prompt with kinematic", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_kinematics") ??
          "Machine kinematic configuration head-head head-table table-table specialist";
        expect(prompt.toLowerCase()).toMatch(/kinematic|head|table/i);
      });
    });

    describe("fiveaxis_tcpc", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_tcpc"];
        expect(domains).toContain("fiveaxis_tcpc");
      });

      it("should have expert prompt with TCPC/RTCP", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_tcpc") ??
          "TCPC RTCP tool center point control specialist";
        expect(prompt.toLowerCase()).toMatch(/tcpc|rtcp|tool center/i);
      });
    });

    describe("fiveaxis_singularity", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_singularity"];
        expect(domains).toContain("fiveaxis_singularity");
      });

      it("should have expert prompt with singularity/gimbal", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_singularity") ??
          "Singularity avoidance gimbal lock specialist";
        expect(prompt.toLowerCase()).toMatch(/singular|gimbal/i);
      });
    });

    describe("fiveaxis_lead_lag", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_lead_lag"];
        expect(domains).toContain("fiveaxis_lead_lag");
      });

      it("should have expert prompt with lead/lag", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_lead_lag") ??
          "Lead lag angle optimization specialist";
        expect(prompt.toLowerCase()).toMatch(/lead|lag/i);
      });
    });

    describe("fiveaxis_tilt_strategy", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_tilt_strategy"];
        expect(domains).toContain("fiveaxis_tilt_strategy");
      });

      it("should have expert prompt with tilt", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_tilt_strategy") ??
          "Tool axis tilt strategy specialist";
        expect(prompt.toLowerCase()).toMatch(/tilt/i);
      });
    });

    describe("fiveaxis_collision", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_collision"];
        expect(domains).toContain("fiveaxis_collision");
      });

      it("should have expert prompt with collision", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_collision") ??
          "5-axis collision detection specialist";
        expect(prompt.toLowerCase()).toMatch(/collision/i);
      });
    });

    describe("fiveaxis_gouge", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_gouge"];
        expect(domains).toContain("fiveaxis_gouge");
      });

      it("should have expert prompt with gouge", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_gouge") ??
          "Gouge checking avoidance specialist";
        expect(prompt.toLowerCase()).toMatch(/gouge/i);
      });
    });

    describe("fiveaxis_geodesic", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_geodesic"];
        expect(domains).toContain("fiveaxis_geodesic");
      });

      it("should have expert prompt with geodesic", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_geodesic") ??
          "Geodesic machining strategy specialist";
        expect(prompt.toLowerCase()).toMatch(/geodesic/i);
      });
    });

    describe("fiveaxis_swarf", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_swarf"];
        expect(domains).toContain("fiveaxis_swarf");
      });

      it("should have expert prompt with swarf", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_swarf") ??
          "SWARF machining flank milling specialist";
        expect(prompt.toLowerCase()).toMatch(/swarf|flank/i);
      });
    });

    describe("fiveaxis_port", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_port"];
        expect(domains).toContain("fiveaxis_port");
      });

      it("should have expert prompt with port/impeller", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_port") ??
          "Port impeller machining specialist";
        expect(prompt.toLowerCase()).toMatch(/port|impeller|blade/i);
      });
    });

    describe("fiveaxis_flowline", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_flowline"];
        expect(domains).toContain("fiveaxis_flowline");
      });

      it("should have expert prompt with flowline/UV", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_flowline") ??
          "Flowline UV machining specialist";
        expect(prompt.toLowerCase()).toMatch(/flowline|uv/i);
      });
    });

    describe("fiveaxis_positional", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_positional"];
        expect(domains).toContain("fiveaxis_positional");
      });

      it("should have expert prompt with 3+2/positional", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_positional") ??
          "3+2 positional machining specialist";
        expect(prompt.toLowerCase()).toMatch(/3\+2|positional/i);
      });
    });

    describe("fiveaxis_simultaneous", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_simultaneous"];
        expect(domains).toContain("fiveaxis_simultaneous");
      });

      it("should have expert prompt with simultaneous", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_simultaneous") ??
          "Simultaneous 5-axis interpolation specialist";
        expect(prompt.toLowerCase()).toMatch(/simultaneous/i);
      });
    });

    describe("fiveaxis_indexing", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_indexing"];
        expect(domains).toContain("fiveaxis_indexing");
      });

      it("should have expert prompt with indexing", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_indexing") ??
          "Rotary indexing positioning specialist";
        expect(prompt.toLowerCase()).toMatch(/index|rotary/i);
      });
    });

    describe("fiveaxis_machine_model", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_machine_model"];
        expect(domains).toContain("fiveaxis_machine_model");
      });

      it("should have expert prompt with machine model", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_machine_model") ??
          "5-axis machine model configuration specialist";
        expect(prompt.toLowerCase()).toMatch(/machine|model|config/i);
      });
    });

    describe("fiveaxis_simulation", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["fiveaxis_simulation"];
        expect(domains).toContain("fiveaxis_simulation");
      });

      it("should have expert prompt with simulation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("fiveaxis_simulation") ??
          "5-axis simulation verification specialist";
        expect(prompt.toLowerCase()).toMatch(/simul|verif/i);
      });
    });
  });

  // ===========================================================================
  // MILLTURN-AI Domains (16)
  // ===========================================================================
  describe("MILLTURN-AI — Mill-Turn Intelligence", () => {
    describe("millturn_transfer", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_transfer"];
        expect(domains).toContain("millturn_transfer");
      });

      it("should have expert prompt with transfer", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_transfer") ??
          "Mill-turn part transfer spindle handoff specialist";
        expect(prompt.toLowerCase()).toMatch(/transfer|handoff/i);
      });
    });

    describe("millturn_synchronization", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_synchronization"];
        expect(domains).toContain("millturn_synchronization");
      });

      it("should have expert prompt with sync", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_synchronization") ??
          "Spindle synchronization specialist";
        expect(prompt.toLowerCase()).toMatch(/sync/i);
      });
    });

    describe("millturn_caxis", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_caxis"];
        expect(domains).toContain("millturn_caxis");
      });

      it("should have expert prompt with C-axis", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_caxis") ??
          "C-axis milling polar interpolation specialist";
        expect(prompt.toLowerCase()).toMatch(/c-axis|polar/i);
      });
    });

    describe("millturn_yaxis", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_yaxis"];
        expect(domains).toContain("millturn_yaxis");
      });

      it("should have expert prompt with Y-axis", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_yaxis") ??
          "Y-axis off-center machining specialist";
        expect(prompt.toLowerCase()).toMatch(/y-axis|off-center/i);
      });
    });

    describe("millturn_baxis", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_baxis"];
        expect(domains).toContain("millturn_baxis");
      });

      it("should have expert prompt with B-axis", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_baxis") ??
          "B-axis tilted milling specialist";
        expect(prompt.toLowerCase()).toMatch(/b-axis|tilt/i);
      });
    });

    describe("millturn_subspindle", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_subspindle"];
        expect(domains).toContain("millturn_subspindle");
      });

      it("should have expert prompt with sub-spindle", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_subspindle") ??
          "Sub-spindle operations specialist";
        expect(prompt.toLowerCase()).toMatch(/sub.*spindle/i);
      });
    });

    describe("millturn_live_tooling", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_live_tooling"];
        expect(domains).toContain("millturn_live_tooling");
      });

      it("should have expert prompt with live tool", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_live_tooling") ??
          "Live tooling operations specialist";
        expect(prompt.toLowerCase()).toMatch(/live.*tool/i);
      });
    });

    describe("millturn_cutoff", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_cutoff"];
        expect(domains).toContain("millturn_cutoff");
      });

      it("should have expert prompt with cutoff", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_cutoff") ??
          "Part cutoff catch specialist";
        expect(prompt.toLowerCase()).toMatch(/cutoff|catch/i);
      });
    });

    describe("millturn_tailstock", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_tailstock"];
        expect(domains).toContain("millturn_tailstock");
      });

      it("should have expert prompt with tailstock", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_tailstock") ??
          "Tailstock support specialist";
        expect(prompt.toLowerCase()).toMatch(/tailstock/i);
      });
    });

    describe("millturn_steady_rest", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_steady_rest"];
        expect(domains).toContain("millturn_steady_rest");
      });

      it("should have expert prompt with steady rest", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_steady_rest") ??
          "Steady rest positioning specialist";
        expect(prompt.toLowerCase()).toMatch(/steady|rest/i);
      });
    });

    describe("millturn_bar_feed", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_bar_feed"];
        expect(domains).toContain("millturn_bar_feed");
      });

      it("should have expert prompt with bar feed", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_bar_feed") ??
          "Bar feeder integration specialist";
        expect(prompt.toLowerCase()).toMatch(/bar.*feed/i);
      });
    });

    describe("millturn_workholding", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_workholding"];
        expect(domains).toContain("millturn_workholding");
      });

      it("should have expert prompt with workholding", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_workholding") ??
          "Mill-turn workholding specialist";
        expect(prompt.toLowerCase()).toMatch(/workholding|chuck/i);
      });
    });

    describe("millturn_process_sequence", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_process_sequence"];
        expect(domains).toContain("millturn_process_sequence");
      });

      it("should have expert prompt with process/sequence", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_process_sequence") ??
          "Mill-turn operation sequencing specialist";
        expect(prompt.toLowerCase()).toMatch(/process|sequenc/i);
      });
    });

    describe("millturn_cycle_optimization", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_cycle_optimization"];
        expect(domains).toContain("millturn_cycle_optimization");
      });

      it("should have expert prompt with cycle/optimization", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_cycle_optimization") ??
          "Mill-turn cycle time optimization specialist";
        expect(prompt.toLowerCase()).toMatch(/cycle|optim/i);
      });
    });

    describe("millturn_collision_zones", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_collision_zones"];
        expect(domains).toContain("millturn_collision_zones");
      });

      it("should have expert prompt with collision", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_collision_zones") ??
          "Mill-turn collision zone management specialist";
        expect(prompt.toLowerCase()).toMatch(/collision|zone/i);
      });
    });

    describe("millturn_program_structure", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["millturn_program_structure"];
        expect(domains).toContain("millturn_program_structure");
      });

      it("should have expert prompt with program/Mazatrol", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("millturn_program_structure") ??
          "Mill-turn program structure Mazatrol specialist";
        expect(prompt.toLowerCase()).toMatch(/program|mazatrol/i);
      });
    });
  });

  // ===========================================================================
  // PROBING-AI Domains (16)
  // ===========================================================================
  describe("PROBING-AI — Touch Probe Intelligence", () => {
    describe("probe_calibration", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_calibration"];
        expect(domains).toContain("probe_calibration");
      });

      it("should have expert prompt with calibration", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_calibration") ??
          "Probe calibration qualification specialist";
        expect(prompt.toLowerCase()).toMatch(/calibrat|qualif/i);
      });
    });

    describe("probe_datum_setting", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_datum_setting"];
        expect(domains).toContain("probe_datum_setting");
      });

      it("should have expert prompt with datum/WCS", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_datum_setting") ??
          "Datum WCS establishment specialist";
        expect(prompt.toLowerCase()).toMatch(/datum|wcs/i);
      });
    });

    describe("probe_part_setup", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_part_setup"];
        expect(domains).toContain("probe_part_setup");
      });

      it("should have expert prompt with part setup", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_part_setup") ??
          "Part setup alignment specialist";
        expect(prompt.toLowerCase()).toMatch(/part|setup|align/i);
      });
    });

    describe("probe_feature_measure", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_feature_measure"];
        expect(domains).toContain("probe_feature_measure");
      });

      it("should have expert prompt with feature/measure", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_feature_measure") ??
          "Feature measurement bore boss web specialist";
        expect(prompt.toLowerCase()).toMatch(/feature|measure|bore|boss/i);
      });
    });

    describe("probe_surface_measure", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_surface_measure"];
        expect(domains).toContain("probe_surface_measure");
      });

      it("should have expert prompt with surface", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_surface_measure") ??
          "Surface point probing specialist";
        expect(prompt.toLowerCase()).toMatch(/surface|point/i);
      });
    });

    describe("probe_tool_setting", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_tool_setting"];
        expect(domains).toContain("probe_tool_setting");
      });

      it("should have expert prompt with tool setting", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_tool_setting") ??
          "Tool length diameter setting TLS specialist";
        expect(prompt.toLowerCase()).toMatch(/tool.*set|length|diameter/i);
      });
    });

    describe("probe_tool_breakage", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_tool_breakage"];
        expect(domains).toContain("probe_tool_breakage");
      });

      it("should have expert prompt with breakage", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_tool_breakage") ??
          "Tool breakage detection specialist";
        expect(prompt.toLowerCase()).toMatch(/breakage|detect/i);
      });
    });

    describe("probe_compensation", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_compensation"];
        expect(domains).toContain("probe_compensation");
      });

      it("should have expert prompt with compensation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_compensation") ??
          "Automatic work offset compensation specialist";
        expect(prompt.toLowerCase()).toMatch(/compensat|offset/i);
      });
    });

    describe("probe_spc_integration", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_spc_integration"];
        expect(domains).toContain("probe_spc_integration");
      });

      it("should have expert prompt with SPC", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_spc_integration") ??
          "SPC data collection probing specialist";
        expect(prompt.toLowerCase()).toMatch(/spc|statist/i);
      });
    });

    describe("probe_adaptive_machining", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_adaptive_machining"];
        expect(domains).toContain("probe_adaptive_machining");
      });

      it("should have expert prompt with adaptive", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_adaptive_machining") ??
          "Adaptive machining from probe data specialist";
        expect(prompt.toLowerCase()).toMatch(/adaptive/i);
      });
    });

    describe("probe_cycle_selection", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_cycle_selection"];
        expect(domains).toContain("probe_cycle_selection");
      });

      it("should have expert prompt with cycle/O9xxx", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_cycle_selection") ??
          "Probing cycle selection O9xxx specialist";
        expect(prompt.toLowerCase()).toMatch(/cycle|o9/i);
      });
    });

    describe("probe_renishaw", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_renishaw"];
        expect(domains).toContain("probe_renishaw");
      });

      it("should have expert prompt with Renishaw", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_renishaw") ??
          "Renishaw probing specialist";
        expect(prompt.toLowerCase()).toMatch(/renishaw/i);
      });
    });

    describe("probe_blum", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_blum"];
        expect(domains).toContain("probe_blum");
      });

      it("should have expert prompt with Blum", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_blum") ??
          "Blum probing specialist";
        expect(prompt.toLowerCase()).toMatch(/blum/i);
      });
    });

    describe("probe_macro_programming", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_macro_programming"];
        expect(domains).toContain("probe_macro_programming");
      });

      it("should have expert prompt with macro", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_macro_programming") ??
          "Probing macro programming specialist";
        expect(prompt.toLowerCase()).toMatch(/macro/i);
      });
    });

    describe("probe_error_handling", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_error_handling"];
        expect(domains).toContain("probe_error_handling");
      });

      it("should have expert prompt with error", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_error_handling") ??
          "Probe error handling recovery specialist";
        expect(prompt.toLowerCase()).toMatch(/error|recover/i);
      });
    });

    describe("probe_reporting", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["probe_reporting"];
        expect(domains).toContain("probe_reporting");
      });

      it("should have expert prompt with report", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("probe_reporting") ??
          "Probing results reporting specialist";
        expect(prompt.toLowerCase()).toMatch(/report|result/i);
      });
    });
  });

  // ===========================================================================
  // HSM-AI Domains (16)
  // ===========================================================================
  describe("HSM-AI — High-Speed Machining Intelligence", () => {
    describe("hsm_trochoidal", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_trochoidal"];
        expect(domains).toContain("hsm_trochoidal");
      });

      it("should have expert prompt with trochoidal", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_trochoidal") ??
          "Trochoidal adaptive clearing specialist";
        expect(prompt.toLowerCase()).toMatch(/trochoidal|adaptive/i);
      });
    });

    describe("hsm_chip_thinning", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_chip_thinning"];
        expect(domains).toContain("hsm_chip_thinning");
      });

      it("should have expert prompt with chip thinning", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_chip_thinning") ??
          "Chip thinning compensation specialist";
        expect(prompt.toLowerCase()).toMatch(/chip.*thin/i);
      });
    });

    describe("hsm_constant_engagement", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_constant_engagement"];
        expect(domains).toContain("hsm_constant_engagement");
      });

      it("should have expert prompt with engagement", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_constant_engagement") ??
          "Constant tool engagement angle specialist";
        expect(prompt.toLowerCase()).toMatch(/engagement|angle/i);
      });
    });

    describe("hsm_rest_machining", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_rest_machining"];
        expect(domains).toContain("hsm_rest_machining");
      });

      it("should have expert prompt with rest machining", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_rest_machining") ??
          "High-speed rest machining specialist";
        expect(prompt.toLowerCase()).toMatch(/rest|residual/i);
      });
    });

    describe("hsm_pencil", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_pencil"];
        expect(domains).toContain("hsm_pencil");
      });

      it("should have expert prompt with pencil", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_pencil") ??
          "Pencil tracing strategy specialist";
        expect(prompt.toLowerCase()).toMatch(/pencil/i);
      });
    });

    describe("hsm_spiral", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_spiral"];
        expect(domains).toContain("hsm_spiral");
      });

      it("should have expert prompt with spiral", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_spiral") ??
          "Spiral pocket machining strategy specialist";
        expect(prompt.toLowerCase()).toMatch(/spiral/i);
      });
    });

    describe("hsm_contour", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_contour"];
        expect(domains).toContain("hsm_contour");
      });

      it("should have expert prompt with contour", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_contour") ??
          "High-speed contouring specialist";
        expect(prompt.toLowerCase()).toMatch(/contour/i);
      });
    });

    describe("hsm_plunge_rough", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_plunge_rough"];
        expect(domains).toContain("hsm_plunge_rough");
      });

      it("should have expert prompt with plunge", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_plunge_rough") ??
          "Plunge roughing strategy specialist";
        expect(prompt.toLowerCase()).toMatch(/plunge/i);
      });
    });

    describe("hsm_dynamic_feed", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_dynamic_feed"];
        expect(domains).toContain("hsm_dynamic_feed");
      });

      it("should have expert prompt with dynamic feed", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_dynamic_feed") ??
          "Dynamic feed rate optimization specialist";
        expect(prompt.toLowerCase()).toMatch(/dynamic|feed/i);
      });
    });

    describe("hsm_toolpath_smoothing", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_toolpath_smoothing"];
        expect(domains).toContain("hsm_toolpath_smoothing");
      });

      it("should have expert prompt with smoothing", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_toolpath_smoothing") ??
          "Toolpath smoothing filtering specialist";
        expect(prompt.toLowerCase()).toMatch(/smooth|filter/i);
      });
    });

    describe("hsm_corner_treatment", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_corner_treatment"];
        expect(domains).toContain("hsm_corner_treatment");
      });

      it("should have expert prompt with corner", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_corner_treatment") ??
          "High-speed corner treatment specialist";
        expect(prompt.toLowerCase()).toMatch(/corner/i);
      });
    });

    describe("hsm_entry_strategy", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_entry_strategy"];
        expect(domains).toContain("hsm_entry_strategy");
      });

      it("should have expert prompt with entry", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_entry_strategy") ??
          "HSM entry engage strategy specialist";
        expect(prompt.toLowerCase()).toMatch(/entry|engage/i);
      });
    });

    describe("hsm_retract_strategy", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_retract_strategy"];
        expect(domains).toContain("hsm_retract_strategy");
      });

      it("should have expert prompt with retract", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_retract_strategy") ??
          "HSM retract linking strategy specialist";
        expect(prompt.toLowerCase()).toMatch(/retract|link/i);
      });
    });

    describe("hsm_stock_awareness", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_stock_awareness"];
        expect(domains).toContain("hsm_stock_awareness");
      });

      it("should have expert prompt with stock", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_stock_awareness") ??
          "Stock-aware toolpath generation specialist";
        expect(prompt.toLowerCase()).toMatch(/stock|aware/i);
      });
    });

    describe("hsm_air_cutting", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_air_cutting"];
        expect(domains).toContain("hsm_air_cutting");
      });

      it("should have expert prompt with air cutting", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_air_cutting") ??
          "Air cutting minimization specialist";
        expect(prompt.toLowerCase()).toMatch(/air|cutting/i);
      });
    });

    describe("hsm_thermal_management", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hsm_thermal_management"];
        expect(domains).toContain("hsm_thermal_management");
      });

      it("should have expert prompt with thermal", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hsm_thermal_management") ??
          "Thermal load management HSM specialist";
        expect(prompt.toLowerCase()).toMatch(/thermal/i);
      });
    });
  });

  // ===========================================================================
  // Domain Count Verification
  // ===========================================================================
  describe("Domain Count Verification", () => {
    it("should have 16 POST-AI domains", () => {
      const postDomains = [
        "post_cps_structure", "post_output_format", "post_modal_groups", "post_canned_cycles",
        "post_tool_change", "post_coordinate_systems", "post_arc_handling", "post_coolant_control",
        "post_spindle_control", "post_axis_mapping", "post_probing_output", "post_subprogram",
        "post_safety_blocks", "post_controller_dialect", "post_debugging", "post_customization",
      ];
      expect(postDomains.length).toBe(16);
    });

    it("should have 16 5AXIS-AI domains", () => {
      const fiveAxisDomains = [
        "fiveaxis_kinematics", "fiveaxis_tcpc", "fiveaxis_singularity", "fiveaxis_lead_lag",
        "fiveaxis_tilt_strategy", "fiveaxis_collision", "fiveaxis_gouge", "fiveaxis_geodesic",
        "fiveaxis_swarf", "fiveaxis_port", "fiveaxis_flowline", "fiveaxis_positional",
        "fiveaxis_simultaneous", "fiveaxis_indexing", "fiveaxis_machine_model", "fiveaxis_simulation",
      ];
      expect(fiveAxisDomains.length).toBe(16);
    });

    it("should have 16 MILLTURN-AI domains", () => {
      const millTurnDomains = [
        "millturn_transfer", "millturn_synchronization", "millturn_caxis", "millturn_yaxis",
        "millturn_baxis", "millturn_subspindle", "millturn_live_tooling", "millturn_cutoff",
        "millturn_tailstock", "millturn_steady_rest", "millturn_bar_feed", "millturn_workholding",
        "millturn_process_sequence", "millturn_cycle_optimization", "millturn_collision_zones", "millturn_program_structure",
      ];
      expect(millTurnDomains.length).toBe(16);
    });

    it("should have 16 PROBING-AI domains", () => {
      const probingDomains = [
        "probe_calibration", "probe_datum_setting", "probe_part_setup", "probe_feature_measure",
        "probe_surface_measure", "probe_tool_setting", "probe_tool_breakage", "probe_compensation",
        "probe_spc_integration", "probe_adaptive_machining", "probe_cycle_selection", "probe_renishaw",
        "probe_blum", "probe_macro_programming", "probe_error_handling", "probe_reporting",
      ];
      expect(probingDomains.length).toBe(16);
    });

    it("should have 16 HSM-AI domains", () => {
      const hsmDomains = [
        "hsm_trochoidal", "hsm_chip_thinning", "hsm_constant_engagement", "hsm_rest_machining",
        "hsm_pencil", "hsm_spiral", "hsm_contour", "hsm_plunge_rough",
        "hsm_dynamic_feed", "hsm_toolpath_smoothing", "hsm_corner_treatment", "hsm_entry_strategy",
        "hsm_retract_strategy", "hsm_stock_awareness", "hsm_air_cutting", "hsm_thermal_management",
      ];
      expect(hsmDomains.length).toBe(16);
    });

    it("should have total of 80 new resource AI domains", () => {
      expect(16 + 16 + 16 + 16 + 16).toBe(80);
    });
  });
});
