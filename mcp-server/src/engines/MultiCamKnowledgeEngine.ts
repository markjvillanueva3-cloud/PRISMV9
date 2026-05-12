/**
 * MultiCamKnowledgeEngine
 *
 * Unified registry for all CAM/CAD systems discovered on H: drive.
 * Aggregates Mastercam, HyperMill, SolidWorks CAM, Fusion 360, and
 * Autodesk Inventor file archives into a single awareness surface.
 *
 * Implements MILL-INTEG-MS3 (Multi-CAM Engine Export & Wiring).
 *
 * Design note: does NOT re-parse binary OLE files live. Files are binary
 * OLE Compound File Binary Format (MS-CFBF) — .sldprt, .ipt, .iam, .mcx-8.
 * This engine surfaces archive locations, counts, and extraction capabilities
 * so orchestrators know where to route CAM-specific queries.
 */

export type CamSystem =
  | "mastercam"
  | "hypermill"
  | "solidworks_cam"
  | "fusion360"
  | "inventor"
  | "haas_visual"
  | "hurco_winmax"
  | "okuma_advanced_oneface";

export type FileFormat = "ole_cfbf" | "text_gcode" | "xml" | "proprietary_binary";

export interface CamArchive {
  system: CamSystem;
  root_path: string;
  file_extensions: string[];
  file_format: FileFormat;
  estimated_count: number;
  supports_offline_extraction: boolean;
  extraction_capabilities: string[];
  requires_login: boolean;
  notes: string;
}

export interface CamQuery {
  system?: CamSystem;
  supports_offline?: boolean;
  min_count?: number;
}

const CAM_ARCHIVES: CamArchive[] = [
  {
    system: "mastercam",
    root_path: "H:/PRISM/JM DIE",
    file_extensions: [".mcx-8", ".mcx", ".mcam", ".nci"],
    file_format: "ole_cfbf",
    estimated_count: 1825,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "operation_list_via_nci",
      "toolpath_xml_embedded",
      "material_metadata",
      "feed_speed_tables",
      "comment_mining",
      "tool_library_embedded",
    ],
    requires_login: false,
    notes: "Mastercam .mcx-8 is OLE CFBF — offline parseable via structured storage",
  },
  {
    system: "hypermill",
    root_path: "H:/PRISM/resources",
    file_extensions: [".hmf", ".hmm", ".hmproj"],
    file_format: "proprietary_binary",
    estimated_count: 1621,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "post_config_knowledge_via_PP_HYPERMILL_KB",
      "training_material_structure",
      "automation_center_recipes",
    ],
    requires_login: false,
    notes: "Engine already exists: ProductionHyperMillPostConfigEngine (PP-HYPERMILL-KB)",
  },
  {
    system: "solidworks_cam",
    root_path: "H:/PRISM/resources",
    file_extensions: [".sldprt", ".sldasm", ".slddrw"],
    file_format: "ole_cfbf",
    estimated_count: 180,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "part_metadata_via_cfbf",
      "mass_properties",
      "material_name",
      "feature_tree_hints",
      "embedded_thumbnails",
      "custom_properties",
    ],
    requires_login: false,
    notes:
      "SolidWorks uses OLE CFBF — metadata/thumbnails readable without SW license. " +
      "Training set in 'Basic Training Day 2/3' folders.",
  },
  {
    system: "fusion360",
    root_path: "H:/PRISM/BOX/FUSION BASIC POSTS",
    file_extensions: [".cps", ".f3d"],
    file_format: "text_gcode",
    estimated_count: 180,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "post_processor_javascript_analysis",
      "controller_mapping",
      "kinematic_classification",
    ],
    requires_login: false,
    notes:
      ".cps files are JavaScript-based post processors — fully parseable. " +
      "Covers Brother, Datron, Amada, and other controllers.",
  },
  {
    system: "inventor",
    root_path: "H:/PRISM/JM DIE/JM DIE COMPANY/EAGLESTONE PARTS",
    file_extensions: [".ipt", ".iam", ".idw", ".ipj"],
    file_format: "ole_cfbf",
    estimated_count: 45,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "part_metadata_via_cfbf",
      "thumbnail_extraction",
      "mass_properties_embedded",
      "ipj_xml_project_file",
      "step_iges_companion_files",
    ],
    requires_login: false,
    notes:
      "Inventor files are OLE CFBF — readable without Inventor license. " +
      "Cannot regenerate features or open GUI without login, but metadata/thumbnails OK.",
  },
  {
    system: "haas_visual",
    root_path: "H:/PRISM/JM DIE/CNC MILL HAAS",
    file_extensions: [".nc", ".txt"],
    file_format: "text_gcode",
    estimated_count: 533,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "gcode_parsing",
      "comment_mining",
      "operation_classification",
    ],
    requires_login: false,
    notes: "Haas Visual programming output — pure text G-code, handled by MillProgramLearningEngine",
  },
  {
    system: "hurco_winmax",
    root_path: "H:/PRISM/JM DIE/HAAS-HURCO",
    file_extensions: [".hnc", ".nc"],
    file_format: "text_gcode",
    estimated_count: 1873,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "gcode_parsing",
      "winmax_conversational_pattern_detection",
      "tool_change_analysis",
    ],
    requires_login: false,
    notes: "Hurco WinMax conversational — handled by MillProgramLearningEngine",
  },
  {
    system: "okuma_advanced_oneface",
    root_path: "H:/PRISM/JM DIE/OKUMA",
    file_extensions: [".min", ".mn"],
    file_format: "text_gcode",
    estimated_count: 3055,
    supports_offline_extraction: true,
    extraction_capabilities: [
      "okuma_gcode_parsing",
      "advanced_oneface_conversational",
      "thermo_compensation_awareness",
    ],
    requires_login: false,
    notes: "Okuma .MIN files — text-based, fully parseable",
  },
];

export class MultiCamKnowledgeEngine {
  getArchive(system: CamSystem): CamArchive | null {
    return CAM_ARCHIVES.find((a) => a.system === system) ?? null;
  }

  listArchives(): CamArchive[] {
    return [...CAM_ARCHIVES];
  }

  query(q: CamQuery): CamArchive[] {
    return CAM_ARCHIVES.filter((a) => {
      if (q.system !== undefined && a.system !== q.system) return false;
      if (q.supports_offline !== undefined && a.supports_offline_extraction !== q.supports_offline)
        return false;
      if (q.min_count !== undefined && a.estimated_count < q.min_count) return false;
      return true;
    });
  }

  getTotalFiles(): number {
    return CAM_ARCHIVES.reduce((sum, a) => sum + a.estimated_count, 0);
  }

  getOfflineCapableSystems(): CamSystem[] {
    return CAM_ARCHIVES.filter((a) => a.supports_offline_extraction).map((a) => a.system);
  }

  getLoginRequiredSystems(): CamSystem[] {
    return CAM_ARCHIVES.filter((a) => a.requires_login).map((a) => a.system);
  }

  canExtractWithoutLogin(system: CamSystem): boolean {
    const a = this.getArchive(system);
    return a ? a.supports_offline_extraction && !a.requires_login : false;
  }

  getExtractionRouting(system: CamSystem): {
    archive: CamArchive | null;
    recommended_engine: string;
    offline_capable: boolean;
  } {
    const archive = this.getArchive(system);
    if (!archive) {
      return { archive: null, recommended_engine: "none", offline_capable: false };
    }
    const routingMap: Record<CamSystem, string> = {
      mastercam: "MastercamBridgeEngine (extend MillProgramLearningEngine)",
      hypermill: "ProductionHyperMillPostConfigEngine",
      solidworks_cam: "OleCfbfMetadataExtractor (new, shared with Inventor)",
      fusion360: "FusionPostProcessorAnalyzer (CPSJavaScriptParser)",
      inventor: "OleCfbfMetadataExtractor (shared with SolidWorks)",
      haas_visual: "MillProgramLearningEngine",
      hurco_winmax: "MillProgramLearningEngine",
      okuma_advanced_oneface: "LatheProgramLearningEngine (future)",
    };
    return {
      archive,
      recommended_engine: routingMap[system],
      offline_capable: archive.supports_offline_extraction && !archive.requires_login,
    };
  }

  getStats(): {
    total_systems: number;
    total_files: number;
    offline_capable: number;
    login_required: number;
    ole_cfbf_systems: number;
    text_gcode_systems: number;
  } {
    return {
      total_systems: CAM_ARCHIVES.length,
      total_files: this.getTotalFiles(),
      offline_capable: this.getOfflineCapableSystems().length,
      login_required: this.getLoginRequiredSystems().length,
      ole_cfbf_systems: CAM_ARCHIVES.filter((a) => a.file_format === "ole_cfbf").length,
      text_gcode_systems: CAM_ARCHIVES.filter((a) => a.file_format === "text_gcode").length,
    };
  }

  getSelfAwareness(): {
    engine_name: string;
    purpose: string;
    cam_systems: CamSystem[];
    total_archives: number;
    offline_capabilities: string[];
    login_policy: string;
  } {
    return {
      engine_name: "MultiCamKnowledgeEngine",
      purpose:
        "Unified registry of all CAM/CAD systems on H: drive — routes extraction requests",
      cam_systems: CAM_ARCHIVES.map((a) => a.system),
      total_archives: CAM_ARCHIVES.length,
      offline_capabilities: [
        "OLE CFBF metadata (SolidWorks, Inventor, Mastercam)",
        "Text G-code parsing (Haas, Hurco, Okuma)",
        "JavaScript post-processor analysis (Fusion .cps)",
        "HyperMill automation center (PP-HYPERMILL-KB engine)",
        "Binary header inspection (all proprietary formats)",
      ],
      login_policy:
        "NONE — all 8 systems support offline file extraction. " +
        "Autodesk Inventor/SolidWorks files are readable via OLE CFBF parsing without requiring " +
        "a vendor login. GUI regeneration requires the vendor application.",
    };
  }
}

export const multiCamKnowledgeEngine = new MultiCamKnowledgeEngine();
