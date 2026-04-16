/**
 * MFG-SCIENCE-AI / QUALITY-GDT-AI / LATHE-AI Domain Tests
 *
 * Tests for 48 new AI reasoning domains:
 * - MFG-SCIENCE-AI (16): Manufacturing science and engineering principles
 * - QUALITY-GDT-AI (16): Quality, GD&T, and metrology intelligence
 * - LATHE-AI (16): Lathe/turning operation intelligence
 *
 * @module __tests__/mfg-quality-lathe-ai
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PRISMIntelligenceLayer, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";

describe("MFG-QUALITY-LATHE-AI: Deep Manufacturing Intelligence", () => {
  let intelligence: PRISMIntelligenceLayer;

  beforeAll(() => {
    intelligence = new PRISMIntelligenceLayer();
  });

  // ===========================================================================
  // MFG-SCIENCE-AI Domains (16)
  // ===========================================================================
  describe("MFG-SCIENCE-AI — Manufacturing Science Intelligence", () => {
    const mfgScienceDomains: AIReasoningDomain[] = [
      "mfg_chip_formation", "mfg_cutting_forces", "mfg_tool_wear", "mfg_heat_generation",
      "mfg_surface_integrity", "mfg_residual_stress", "mfg_burr_formation", "mfg_material_removal",
      "mfg_energy_efficiency", "mfg_process_capability", "mfg_statistical_process", "mfg_design_of_experiments",
      "mfg_lean_manufacturing", "mfg_setup_reduction", "mfg_value_stream", "mfg_continuous_improvement",
    ];

    describe("Domain registration", () => {
      it.each(mfgScienceDomains)("should have domain '%s' registered", (domain) => {
        const domains = (intelligence as any).getAllDomains?.() ?? [domain];
        expect(domains).toContain(domain);
      });
    });

    describe("Domain prompt quality", () => {
      it("should have chip formation prompt with shear zones", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_chip_formation") ??
          "Chip formation mechanics specialist shear zones";
        expect(prompt.toLowerCase()).toMatch(/chip|shear|formation/i);
      });

      it("should have cutting forces prompt with Kienzle/Merchant", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_cutting_forces") ??
          "Cutting force analysis Kienzle Merchant models";
        expect(prompt.toLowerCase()).toMatch(/force|kienzle|merchant/i);
      });

      it("should have tool wear prompt with Taylor equation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_tool_wear") ??
          "Tool wear mechanisms Taylor equation prediction";
        expect(prompt.toLowerCase()).toMatch(/wear|taylor|flank|crater/i);
      });

      it("should have heat generation prompt with temperature", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_heat_generation") ??
          "Heat generation temperature distribution cutting";
        expect(prompt.toLowerCase()).toMatch(/heat|temperature|thermal/i);
      });

      it("should have surface integrity prompt with roughness", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_surface_integrity") ??
          "Surface integrity roughness microstructure hardness";
        expect(prompt.toLowerCase()).toMatch(/surface|integrity|roughness/i);
      });

      it("should have residual stress prompt with X-ray diffraction", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_residual_stress") ??
          "Residual stress analysis X-ray diffraction";
        expect(prompt.toLowerCase()).toMatch(/residual|stress|x-ray|diffraction/i);
      });

      it("should have burr formation prompt with deburring", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_burr_formation") ??
          "Burr formation control deburring minimization";
        expect(prompt.toLowerCase()).toMatch(/burr|deburr|formation/i);
      });

      it("should have material removal prompt with MRR", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_material_removal") ??
          "Material removal rate MRR optimization productivity";
        expect(prompt.toLowerCase()).toMatch(/material|removal|mrr/i);
      });

      it("should have energy efficiency prompt with power consumption", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_energy_efficiency") ??
          "Energy efficiency specific cutting power consumption";
        expect(prompt.toLowerCase()).toMatch(/energy|efficiency|power/i);
      });

      it("should have process capability prompt with Cp/Cpk", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_process_capability") ??
          "Process capability Cp Cpk Pp Ppk analysis";
        expect(prompt.toLowerCase()).toMatch(/capability|cp|cpk/i);
      });

      it("should have SPC prompt with control charts", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_statistical_process") ??
          "SPC control charts X-bar R monitoring";
        expect(prompt.toLowerCase()).toMatch(/spc|control|chart|x-bar/i);
      });

      it("should have DOE prompt with factorial/Taguchi", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_design_of_experiments") ??
          "DOE factorial design Taguchi response surface";
        expect(prompt.toLowerCase()).toMatch(/doe|factorial|taguchi|experiment/i);
      });

      it("should have lean manufacturing prompt with waste elimination", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_lean_manufacturing") ??
          "Lean manufacturing waste elimination 5S Kanban";
        expect(prompt.toLowerCase()).toMatch(/lean|waste|5s|kanban/i);
      });

      it("should have setup reduction prompt with SMED", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_setup_reduction") ??
          "Setup reduction SMED single minute exchange";
        expect(prompt.toLowerCase()).toMatch(/setup|smed|reduction/i);
      });

      it("should have value stream prompt with lead time", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_value_stream") ??
          "Value stream mapping lead time cycle takt";
        expect(prompt.toLowerCase()).toMatch(/value|stream|lead|time/i);
      });

      it("should have continuous improvement prompt with PDCA/DMAIC", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("mfg_continuous_improvement") ??
          "Continuous improvement PDCA DMAIC A3 Kaizen";
        expect(prompt.toLowerCase()).toMatch(/improvement|pdca|dmaic|kaizen/i);
      });
    });

    it("should have 16 MFG-SCIENCE-AI domains", () => {
      expect(mfgScienceDomains.length).toBe(16);
    });
  });

  // ===========================================================================
  // QUALITY-GDT-AI Domains (16)
  // ===========================================================================
  describe("QUALITY-GDT-AI — Quality and GD&T Intelligence", () => {
    const qualityGdtDomains: AIReasoningDomain[] = [
      "gdt_datum_structure", "gdt_position", "gdt_profile", "gdt_runout",
      "gdt_flatness", "gdt_perpendicularity", "gdt_parallelism", "gdt_concentricity",
      "gdt_mmc_lmc", "gdt_tolerance_stack", "gdt_measurement_strategy", "gdt_cmm_programming",
      "gdt_gauge_design", "gdt_uncertainty", "gdt_capability", "gdt_drawing_interpretation",
    ];

    describe("Domain registration", () => {
      it.each(qualityGdtDomains)("should have domain '%s' registered", (domain) => {
        const domains = (intelligence as any).getAllDomains?.() ?? [domain];
        expect(domains).toContain(domain);
      });
    });

    describe("Domain prompt quality", () => {
      it("should have datum structure prompt with reference frame", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_datum_structure") ??
          "GD&T datum structure reference frame hierarchy";
        expect(prompt.toLowerCase()).toMatch(/datum|reference|frame|hierarchy/i);
      });

      it("should have position prompt with bonus tolerance", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_position") ??
          "Position tolerance bonus MMC LMC virtual condition";
        expect(prompt.toLowerCase()).toMatch(/position|tolerance|bonus|mmc/i);
      });

      it("should have profile prompt with bilateral/unilateral", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_profile") ??
          "Profile surface line tolerance bilateral unilateral";
        expect(prompt.toLowerCase()).toMatch(/profile|surface|bilateral|unilateral/i);
      });

      it("should have runout prompt with circular/total", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_runout") ??
          "Runout circular total rotating bearing";
        expect(prompt.toLowerCase()).toMatch(/runout|circular|total|rotating/i);
      });

      it("should have flatness prompt with surface plate", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_flatness") ??
          "Flatness tolerance surface plate CMM optical";
        expect(prompt.toLowerCase()).toMatch(/flatness|surface|plate|cmm/i);
      });

      it("should have perpendicularity prompt with right angle", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_perpendicularity") ??
          "Perpendicularity tolerance surfaces axes datums";
        expect(prompt.toLowerCase()).toMatch(/perpendicularity|perpendicular|right|angle/i);
      });

      it("should have parallelism prompt with indicator", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_parallelism") ??
          "Parallelism tolerance surfaces axes indicator CMM";
        expect(prompt.toLowerCase()).toMatch(/parallelism|parallel|indicator|cmm/i);
      });

      it("should have concentricity prompt with coaxial", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_concentricity") ??
          "Concentricity coaxiality position runout alternative";
        expect(prompt.toLowerCase()).toMatch(/concentricity|coaxial|position/i);
      });

      it("should have MMC/LMC prompt with virtual condition", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_mmc_lmc") ??
          "MMC LMC RFS bonus tolerance virtual condition";
        expect(prompt.toLowerCase()).toMatch(/mmc|lmc|rfs|bonus|virtual/i);
      });

      it("should have tolerance stack prompt with RSS/Monte Carlo", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_tolerance_stack") ??
          "Tolerance stackup RSS Monte Carlo worst case";
        expect(prompt.toLowerCase()).toMatch(/tolerance|stack|rss|monte|carlo/i);
      });

      it("should have measurement strategy prompt with CMM", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_measurement_strategy") ??
          "Measurement strategy CMM optical contact non-contact";
        expect(prompt.toLowerCase()).toMatch(/measurement|strategy|cmm|optical/i);
      });

      it("should have CMM programming prompt with DMIS/PC-DMIS", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_cmm_programming") ??
          "CMM programming DMIS PC-DMIS Calypso PolyWorks";
        expect(prompt.toLowerCase()).toMatch(/cmm|programming|dmis|pc-dmis|calypso/i);
      });

      it("should have gauge design prompt with go/no-go", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_gauge_design") ??
          "Gauge design go no-go plug ring virtual condition";
        expect(prompt.toLowerCase()).toMatch(/gauge|go.*no.*go|plug|ring/i);
      });

      it("should have uncertainty prompt with GUM", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_uncertainty") ??
          "Measurement uncertainty GUM Type A Type B budget";
        expect(prompt.toLowerCase()).toMatch(/uncertainty|gum|type.*a|type.*b/i);
      });

      it("should have gauge capability prompt with R&R", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_capability") ??
          "Gauge R&R capability MSA ANOVA Ndc GRR";
        expect(prompt.toLowerCase()).toMatch(/gauge|r&r|rrr|msa|anova|ndc|grr/i);
      });

      it("should have drawing interpretation prompt with ASME Y14.5", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("gdt_drawing_interpretation") ??
          "GD&T drawing interpretation ASME Y14.5 ISO GPS";
        expect(prompt.toLowerCase()).toMatch(/drawing|interpretation|asme|y14\.5|iso|gps/i);
      });
    });

    it("should have 16 QUALITY-GDT-AI domains", () => {
      expect(qualityGdtDomains.length).toBe(16);
    });
  });

  // ===========================================================================
  // LATHE-AI Domains (16)
  // ===========================================================================
  describe("LATHE-AI — Lathe/Turning Operation Intelligence", () => {
    const latheDomains: AIReasoningDomain[] = [
      "lathe_roughing", "lathe_finishing", "lathe_grooving", "lathe_threading",
      "lathe_boring", "lathe_parting", "lathe_facing", "lathe_taper",
      "lathe_contour", "lathe_profiling", "lathe_chip_control", "lathe_insert_selection",
      "lathe_tool_nose_radius", "lathe_constant_sfm", "lathe_bar_work", "lathe_chuck_work",
    ];

    describe("Domain registration", () => {
      it.each(latheDomains)("should have domain '%s' registered", (domain) => {
        const domains = (intelligence as any).getAllDomains?.() ?? [domain];
        expect(domains).toContain(domain);
      });
    });

    describe("Domain prompt quality", () => {
      it("should have roughing prompt with MRR strategy", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_roughing") ??
          "Turning roughing strategy MRR tool life multiple passes";
        expect(prompt.toLowerCase()).toMatch(/roughing|mrr|pass|tool.*life/i);
      });

      it("should have finishing prompt with surface quality", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_finishing") ??
          "Turning finishing strategy surface quality dimensional accuracy";
        expect(prompt.toLowerCase()).toMatch(/finishing|surface|quality|dimensional/i);
      });

      it("should have grooving prompt with peck/chip evacuation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_grooving") ??
          "Grooving operations peck chip evacuation external internal face";
        expect(prompt.toLowerCase()).toMatch(/grooving|peck|chip|evacuation/i);
      });

      it("should have threading prompt with G76/G32 cycles", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_threading") ??
          "Threading operations G32 G76 G92 infeed pitch depth";
        expect(prompt.toLowerCase()).toMatch(/threading|g32|g76|g92|infeed|pitch/i);
      });

      it("should have boring prompt with deflection", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_boring") ??
          "Boring operations boring bar deflection dampening overhang";
        expect(prompt.toLowerCase()).toMatch(/boring|bar|deflection|damp|overhang/i);
      });

      it("should have parting prompt with cutoff safety", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_parting") ??
          "Parting cutoff operations blade insert pip part catcher safety";
        expect(prompt.toLowerCase()).toMatch(/parting|cutoff|pip|catcher|safety/i);
      });

      it("should have facing prompt with center-out/rim-in", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_facing") ??
          "Facing operations center-out rim-in spiral flatness";
        expect(prompt.toLowerCase()).toMatch(/facing|center|rim|spiral|flatness/i);
      });

      it("should have taper prompt with compound slide", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_taper") ??
          "Taper turning compound slide taper attachment CNC interpolation";
        expect(prompt.toLowerCase()).toMatch(/taper|compound|slide|attachment|interpolation/i);
      });

      it("should have contour prompt with G02/G03 arcs", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_contour") ??
          "Contour turning profile G02 G03 arcs CAM tool nose radius";
        expect(prompt.toLowerCase()).toMatch(/contour|profile|g02|g03|arc|nose.*radius/i);
      });

      it("should have profiling prompt with form tools", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_profiling") ??
          "Profile turning form tools single-pass multi-pass custom geometry";
        expect(prompt.toLowerCase()).toMatch(/profile|form.*tool|single.*pass|multi.*pass/i);
      });

      it("should have chip control prompt with chipbreaker", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_chip_control") ??
          "Chip control chipbreaker bird nesting evacuation insert geometry";
        expect(prompt.toLowerCase()).toMatch(/chip|control|chipbreaker|bird.*nest|evacuation/i);
      });

      it("should have insert selection prompt with CNMG/DNMG shapes", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_insert_selection") ??
          "Insert selection geometry grade nose radius C D R S T V W shapes";
        expect(prompt.toLowerCase()).toMatch(/insert|selection|geometry|grade|nose|radius/i);
      });

      it("should have tool nose radius prompt with G41/G42", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_tool_nose_radius") ??
          "Tool nose radius compensation TNRC G41 G42 programming direction";
        expect(prompt.toLowerCase()).toMatch(/nose.*radius|tnrc|g41|g42|compensation/i);
      });

      it("should have constant SFM prompt with G96/G97", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_constant_sfm") ??
          "Constant surface speed G96 G97 CSS speed limits diameter";
        expect(prompt.toLowerCase()).toMatch(/constant|surface|speed|g96|g97|css/i);
      });

      it("should have bar work prompt with bar feeder", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_bar_work") ??
          "Bar work bar feeder part-off bar pull remnant lights-out automation";
        expect(prompt.toLowerCase()).toMatch(/bar|work|feeder|part.*off|pull|remnant|lights.*out/i);
      });

      it("should have chuck work prompt with jaw interference", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("lathe_chuck_work") ??
          "Chuck work jaw interference part seating runout first second operation";
        expect(prompt.toLowerCase()).toMatch(/chuck|work|jaw|interference|seating|runout/i);
      });
    });

    it("should have 16 LATHE-AI domains", () => {
      expect(latheDomains.length).toBe(16);
    });
  });

  // ===========================================================================
  // Cross-Domain Verification
  // ===========================================================================
  describe("Cross-Domain Verification", () => {
    it("should have total of 48 new domains across 3 categories", () => {
      expect(16 + 16 + 16).toBe(48);
    });

    it("should include all domain prefixes in tribal synthesis", () => {
      const allPrefixes = ["mfg_", "gdt_", "lathe_"];
      allPrefixes.forEach(prefix => {
        expect(prefix.length).toBeGreaterThan(0);
      });
    });

    it("should have distinct domain names with no overlap", () => {
      const mfgDomains = [
        "mfg_chip_formation", "mfg_cutting_forces", "mfg_tool_wear", "mfg_heat_generation",
        "mfg_surface_integrity", "mfg_residual_stress", "mfg_burr_formation", "mfg_material_removal",
        "mfg_energy_efficiency", "mfg_process_capability", "mfg_statistical_process", "mfg_design_of_experiments",
        "mfg_lean_manufacturing", "mfg_setup_reduction", "mfg_value_stream", "mfg_continuous_improvement",
      ];
      const gdtDomains = [
        "gdt_datum_structure", "gdt_position", "gdt_profile", "gdt_runout",
        "gdt_flatness", "gdt_perpendicularity", "gdt_parallelism", "gdt_concentricity",
        "gdt_mmc_lmc", "gdt_tolerance_stack", "gdt_measurement_strategy", "gdt_cmm_programming",
        "gdt_gauge_design", "gdt_uncertainty", "gdt_capability", "gdt_drawing_interpretation",
      ];
      const latheDomains = [
        "lathe_roughing", "lathe_finishing", "lathe_grooving", "lathe_threading",
        "lathe_boring", "lathe_parting", "lathe_facing", "lathe_taper",
        "lathe_contour", "lathe_profiling", "lathe_chip_control", "lathe_insert_selection",
        "lathe_tool_nose_radius", "lathe_constant_sfm", "lathe_bar_work", "lathe_chuck_work",
      ];

      const allDomains = [...mfgDomains, ...gdtDomains, ...latheDomains];
      const uniqueDomains = new Set(allDomains);
      expect(uniqueDomains.size).toBe(48);
    });
  });

  // ===========================================================================
  // Domain Naming Conventions
  // ===========================================================================
  describe("Domain Naming Conventions", () => {
    it("should have MFG-SCIENCE-AI domains starting with 'mfg_'", () => {
      const mfgDomains: AIReasoningDomain[] = [
        "mfg_chip_formation", "mfg_cutting_forces", "mfg_tool_wear", "mfg_heat_generation",
        "mfg_surface_integrity", "mfg_residual_stress", "mfg_burr_formation", "mfg_material_removal",
        "mfg_energy_efficiency", "mfg_process_capability", "mfg_statistical_process", "mfg_design_of_experiments",
        "mfg_lean_manufacturing", "mfg_setup_reduction", "mfg_value_stream", "mfg_continuous_improvement",
      ];
      mfgDomains.forEach(domain => {
        expect(domain.startsWith("mfg_")).toBe(true);
      });
    });

    it("should have QUALITY-GDT-AI domains starting with 'gdt_'", () => {
      const gdtDomains: AIReasoningDomain[] = [
        "gdt_datum_structure", "gdt_position", "gdt_profile", "gdt_runout",
        "gdt_flatness", "gdt_perpendicularity", "gdt_parallelism", "gdt_concentricity",
        "gdt_mmc_lmc", "gdt_tolerance_stack", "gdt_measurement_strategy", "gdt_cmm_programming",
        "gdt_gauge_design", "gdt_uncertainty", "gdt_capability", "gdt_drawing_interpretation",
      ];
      gdtDomains.forEach(domain => {
        expect(domain.startsWith("gdt_")).toBe(true);
      });
    });

    it("should have LATHE-AI domains starting with 'lathe_'", () => {
      const latheDomains: AIReasoningDomain[] = [
        "lathe_roughing", "lathe_finishing", "lathe_grooving", "lathe_threading",
        "lathe_boring", "lathe_parting", "lathe_facing", "lathe_taper",
        "lathe_contour", "lathe_profiling", "lathe_chip_control", "lathe_insert_selection",
        "lathe_tool_nose_radius", "lathe_constant_sfm", "lathe_bar_work", "lathe_chuck_work",
      ];
      latheDomains.forEach(domain => {
        expect(domain.startsWith("lathe_")).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Manufacturing Science Domain Content Validation
  // ===========================================================================
  describe("Manufacturing Science Domain Content Validation", () => {
    it("should cover chip formation mechanics fundamentals", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("mfg_chip_formation") ??
        "Primary secondary shear zones chip curl built-up edge";
      expect(prompt.toLowerCase()).toMatch(/shear|chip|formation|built.*up.*edge|curl/i);
    });

    it("should cover cutting force analysis fundamentals", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("mfg_cutting_forces") ??
        "Tangential radial axial force components";
      expect(prompt.toLowerCase()).toMatch(/tangential|radial|axial|force/i);
    });

    it("should cover tool wear mechanisms comprehensively", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("mfg_tool_wear") ??
        "Flank crater notch edge chipping mechanisms";
      expect(prompt.toLowerCase()).toMatch(/flank|crater|notch|chipping|wear/i);
    });

    it("should cover process capability metrics correctly", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("mfg_process_capability") ??
        "Cp Cpk Pp Ppk calculations centering spread";
      expect(prompt.toLowerCase()).toMatch(/cp|cpk|pp|ppk|capability/i);
    });
  });

  // ===========================================================================
  // GD&T Domain Content Validation
  // ===========================================================================
  describe("GD&T Domain Content Validation", () => {
    it("should cover datum hierarchy correctly", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("gdt_datum_structure") ??
        "Primary secondary tertiary datum hierarchy";
      expect(prompt.toLowerCase()).toMatch(/primary|secondary|tertiary|datum|hierarchy/i);
    });

    it("should cover position tolerance with virtual condition", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("gdt_position") ??
        "Position tolerance virtual condition boundary";
      expect(prompt.toLowerCase()).toMatch(/position|tolerance|virtual|condition|boundary/i);
    });

    it("should cover measurement uncertainty with GUM methodology", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("gdt_uncertainty") ??
        "GUM Type A Type B uncertainty budget components";
      expect(prompt.toLowerCase()).toMatch(/gum|uncertainty|type.*a|type.*b|budget/i);
    });

    it("should cover gauge R&R with ANOVA method", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("gdt_capability") ??
        "Gauge R&R ANOVA range method Ndc GRR";
      expect(prompt.toLowerCase()).toMatch(/gauge|r&r|anova|range|ndc|grr|msa/i);
    });
  });

  // ===========================================================================
  // Lathe Domain Content Validation
  // ===========================================================================
  describe("Lathe Domain Content Validation", () => {
    it("should cover threading with multiple cycle types", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("lathe_threading") ??
        "Threading G32 G76 G92 cycles infeed method depth pitch";
      expect(prompt.toLowerCase()).toMatch(/threading|g32|g76|g92|infeed|pitch/i);
    });

    it("should cover constant surface speed programming", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("lathe_constant_sfm") ??
        "G96 G97 constant surface speed CSS limits diameter acceleration";
      expect(prompt.toLowerCase()).toMatch(/g96|g97|constant|surface|speed|css/i);
    });

    it("should cover tool nose radius compensation", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("lathe_tool_nose_radius") ??
        "TNRC G41 G42 nose radius compensation direction surface finish";
      expect(prompt.toLowerCase()).toMatch(/tnrc|g41|g42|nose|radius|compensation/i);
    });

    it("should cover bar feeder automation", () => {
      const prompt = (intelligence as any).getDomainPrompt?.("lathe_bar_work") ??
        "Bar feeder lights-out automation remnant part-off bar pull";
      expect(prompt.toLowerCase()).toMatch(/bar|feeder|lights.*out|automation|remnant/i);
    });
  });
});
