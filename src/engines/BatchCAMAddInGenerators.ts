// @ts-nocheck
/**
 * BatchCAMAddInGenerators — 6 per-CAM add-in generators in one file (E1145)
 *
 * Each generator wraps CAMAddInFrameworkEngine (E1125) with system-specific
 * defaults and produces ready-to-install add-in source code for a target CAM
 * system.  The `generate(options?)` method returns the same AddInResult shape
 * used by E1125 so callers can be agnostic about which generator they invoke.
 *
 * Generators:
 *   MastercamAddInGenerator  — C# .NET NetHook add-in
 *   SolidCAMAddInGenerator   — VBA/VSTA add-in via SolidWorks
 *   NXCAMAddInGenerator      — Python NXOpen add-in
 *   HyperMillACAddInGenerator — Python AC plugin
 *   PowerMillAddInGenerator  — PMILL macro plugin
 *   CATIAAddInGenerator      — VBA/EKL add-in
 *
 * Methods per generator:
 *   generate(options?)  → { files: {path, content, language, description}[], install_instructions, ... }
 *
 * Actions dispatched (camDispatcher):
 *   mastercam_addin_generate | solidcam_addin_generate | nx_addin_generate
 *   hypermill_addin_generate | powermill_addin_generate | catia_addin_generate
 *
 * @engine BatchCAMAddInGenerators
 * @shortcode E1145
 * @dispatcher camDispatcher
 * @milestone CAMX-MS11/U02
 */

import {
  camAddInFrameworkEngine,
  type AddInResult,
  type CamSystem,
  type Language,
  type FeatureType,
} from "./CAMAddInFrameworkEngine.js";

// ── Shared option types ────────────────────────────────────────────────────────

export interface AddInGeneratorOptions {
  /** Override the output language (generator picks a sensible default). */
  language?: Language;
  /** Subset of features to include. Defaults to all features the system supports. */
  features?: FeatureType[];
  /** Company/shop name embedded in generated code comments. */
  company?: string;
  /** PRISM server host override (default: localhost). */
  prism_host?: string;
  /** PRISM server port override (default: 18361). */
  prism_port?: number;
}

// ── Base helper ────────────────────────────────────────────────────────────────

function buildOptions(
  opts: AddInGeneratorOptions | undefined,
  defaultFeatures: FeatureType[],
): { language?: Language; features: FeatureType[] } {
  return {
    language: opts?.language,
    features: opts?.features ?? defaultFeatures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MastercamAddInGenerator — C# .NET NetHook add-in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a C# .NET NetHook add-in for Mastercam that wires a PRISM panel
 * into the Mastercam UI with:
 *   - Auto-optimize S/F button → calls PRISM SFO (prism_calc / speed_feed_orchestrate)
 *   - Tool library sync button → delegates to MastercamToolExportEngine (E1123)
 *   - Post-processor handoff via PRISM post actions
 */
export class MastercamAddInGenerator {
  private readonly _cam: CamSystem = "mastercam";
  private readonly _defaultFeatures: FeatureType[] = [
    "http_client",
    "ui_panel",
    "tool_sync",
    "post_integration",
  ];

  generate(options?: AddInGeneratorOptions): AddInResult {
    const { language, features } = buildOptions(options, this._defaultFeatures);
    // Mastercam primary language is C# — ignore non-csharp override silently
    const lang: Language = (language === "csharp" ? "csharp" : "csharp");
    const result = camAddInFrameworkEngine.generateAddIn(this._cam, lang, features);

    // Append Mastercam-specific metadata note
    result.notes.push(
      "PRISM panel exposes: Auto-Optimize S/F (calls prism_calc › speed_feed_orchestrate), " +
        "Tool Library Sync (delegates to MastercamToolExportEngine E1123), " +
        "Post-Processor Handoff (calls prism_cam › post_process).",
    );
    result.notes.push(
      "NetHook entry point: PRISMAddIn : Mastercam.App.Types.IMastercamAddIn. " +
        "Build target: .NET 4.8 Class Library → deploy to %MASTERCAM%\\addins\\PRISM\\.",
    );

    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SolidCAMAddInGenerator — VBA/VSTA add-in via SolidWorks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a VBA/VSTA add-in that runs inside SolidWorks and connects
 * SolidCAM to PRISM:
 *   - PRISM task pane in SolidWorks sidebar
 *   - iMachining parameter optimizer → prism_cam › imachining_compute
 *   - Tool library sync → prism_cam › solidcam_tool_import
 *   - GPP post integration → prism_cam › post_process
 */
export class SolidCAMAddInGenerator {
  private readonly _cam: CamSystem = "solidcam";
  private readonly _defaultFeatures: FeatureType[] = [
    "http_client",
    "tool_sync",
    "post_integration",
  ];

  generate(options?: AddInGeneratorOptions): AddInResult {
    const { language, features } = buildOptions(options, this._defaultFeatures);
    const lang: Language = language ?? "vba";
    const result = camAddInFrameworkEngine.generateAddIn(this._cam, lang, features);

    result.notes.push(
      "PRISM task pane exposes: iMachining Optimizer (prism_cam › imachining_compute), " +
        "Tool Library Sync (prism_cam › solidcam_tool_import), " +
        "GPP Post Integration (prism_cam › post_process).",
    );
    result.notes.push(
      "Add-in type: SolidWorks VSTA (C#) or VBA Macro. " +
        "Register via SolidWorks Tools › Add-Ins › PRISM Integration. " +
        "HTTP calls use WinHTTP (VBA) or System.Net.Http.HttpClient (VSTA).",
    );

    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NXCAMAddInGenerator — Python NXOpen add-in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a Python NXOpen add-in for Siemens NX:
 *   - PRISM toolbar registered via NX menu contribution
 *   - Operation parameter optimizer → prism_cam › nx_cam_parameters
 *   - Tool library sync from PRISM → prism_cam › nx_tool_import
 */
export class NXCAMAddInGenerator {
  private readonly _cam: CamSystem = "nx";
  private readonly _defaultFeatures: FeatureType[] = [
    "http_client",
    "ui_panel",
    "tool_sync",
    "post_integration",
  ];

  generate(options?: AddInGeneratorOptions): AddInResult {
    const { language, features } = buildOptions(options, this._defaultFeatures);
    const lang: Language = language ?? "python";
    const result = camAddInFrameworkEngine.generateAddIn(this._cam, lang, features);

    result.notes.push(
      "PRISM toolbar exposes: Operation Parameter Optimizer (prism_cam › nx_cam_parameters), " +
        "Tool Library Sync (prism_cam › nx_tool_import), " +
        "Post Integration (prism_cam › post_process).",
    );
    result.notes.push(
      "NXOpen Python journal entry point: do_it(). " +
        "Place script in $UGII_USER_DIR/startup/ for auto-load. " +
        "HTTP via urllib.request (stdlib, no pip required in NX Python env).",
    );

    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HyperMillACAddInGenerator — Python AC plugin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a Python AC (Application Customization) plugin for hyperMILL:
 *   - S/F optimization via PRISM → prism_calc › speed_feed_orchestrate
 *   - Tool data import from PRISM catalog → prism_cam › hypermill_tool_export
 *   - Material lookup → prism_cam › hypermill_material_lookup
 */
export class HyperMillACAddInGenerator {
  private readonly _cam: CamSystem = "hypermill";
  private readonly _defaultFeatures: FeatureType[] = [
    "http_client",
    "ui_panel",
    "tool_sync",
    "post_integration",
  ];

  generate(options?: AddInGeneratorOptions): AddInResult {
    const { language, features } = buildOptions(options, this._defaultFeatures);
    const lang: Language = language ?? "python";
    const result = camAddInFrameworkEngine.generateAddIn(this._cam, lang, features);

    result.notes.push(
      "hyperMILL AC plugin exposes: S/F Optimizer (prism_calc › speed_feed_orchestrate), " +
        "Tool Data Import (prism_cam › hypermill_tool_export), " +
        "Material Lookup (prism_cam › hypermill_material_lookup).",
    );
    result.notes.push(
      "Plugin type: hyperMILL COM API via win32com.client. " +
        "Requires hyperMILL 2021+ and pywin32. " +
        "Place in hyperMILL user scripts directory and register via AC Plugin Manager.",
    );

    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PowerMillAddInGenerator — PMILL macro plugin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a PowerMill macro + Python plugin:
 *   - PRISM connectivity for Vortex toolpath optimization
 *   - Calls prism_cam › cam_strategy_recommend for Vortex parameter guidance
 *   - Sync results back to PowerMill via powermillapi
 */
export class PowerMillAddInGenerator {
  private readonly _cam: CamSystem = "powermill";
  private readonly _defaultFeatures: FeatureType[] = [
    "http_client",
    "tool_sync",
    "post_integration",
  ];

  generate(options?: AddInGeneratorOptions): AddInResult {
    const { language, features } = buildOptions(options, this._defaultFeatures);
    const lang: Language = language ?? "python";
    const result = camAddInFrameworkEngine.generateAddIn(this._cam, lang, features);

    result.notes.push(
      "PowerMill plugin exposes: Vortex Optimizer (prism_cam › cam_strategy_recommend, " +
        "cam_system=powermill, strategy=vortex), " +
        "Tool Sync (prism_cam › powermill_tool_import via powermillapi).",
    );
    result.notes.push(
      "Plugin type: PowerMill PMILL macro + Python (powermillapi package). " +
        "Requires PowerMill 2021+ and `pip install powermillapi`. " +
        "Load via PowerMill Tools › Run Macro or register as startup script.",
    );

    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CATIAAddInGenerator — VBA/EKL add-in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a CATIA VBA/EKL add-in:
 *   - PRISM connectivity for KBM (Knowledge-Based Machining) optimization
 *   - Calls prism_cam › catia_kbm_details for KBM parameter guidance
 *   - Tool sync via prism_cam › catia_strategy_recommend
 */
export class CATIAAddInGenerator {
  private readonly _cam: CamSystem = "catia";
  private readonly _defaultFeatures: FeatureType[] = [
    "http_client",
    "tool_sync",
    "post_integration",
  ];

  generate(options?: AddInGeneratorOptions): AddInResult {
    const { language, features } = buildOptions(options, this._defaultFeatures);
    const lang: Language = language ?? "vba";
    const result = camAddInFrameworkEngine.generateAddIn(this._cam, lang, features);

    result.notes.push(
      "CATIA add-in exposes: KBM Optimizer (prism_cam › catia_kbm_details), " +
        "Strategy Recommender (prism_cam › catia_strategy_recommend), " +
        "Post Integration (prism_cam › post_process).",
    );
    result.notes.push(
      "Add-in type: CATIA CATScript / VBA macro using CATIA Automation API " +
        "(INFITF, MFG.MFG libraries). " +
        "HTTP calls via WinHTTP.WinHTTPRequest.5.1. " +
        "Register via CATIA Tools › Macro › Macros library.",
    );

    return result;
  }
}

// ── Singleton exports ──────────────────────────────────────────────────────────

export const mastercamAddInGenerator  = new MastercamAddInGenerator();
export const solidCAMAddInGenerator   = new SolidCAMAddInGenerator();
export const nxCAMAddInGenerator      = new NXCAMAddInGenerator();
export const hyperMillACAddInGenerator = new HyperMillACAddInGenerator();
export const powerMillAddInGenerator  = new PowerMillAddInGenerator();
export const catiaAddInGenerator      = new CATIAAddInGenerator();
